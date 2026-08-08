package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/liorokman/finrep/internal/config"
)

type OIDCStateCookie struct {
	State        string `json:"state"`
	CodeVerifier string `json:"verifier"`
}

type OIDCTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type OIDCUserInfo struct {
	Sub               string `json:"sub"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	Email             string `json:"email"`
}

// SessionCookieData holds session info stored in cookie
type SessionCookieData struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"exp"`
}

var secretKey = []byte("finrep-session-secret-key-32bytes!")

func encodeSession(data *SessionCookieData) string {
	b, _ := json.Marshal(data)
	payload := base64.RawURLEncoding.EncodeToString(b)
	h := hmac.New(sha256.New, secretKey)
	h.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(h.Sum(nil))
	return payload + "." + sig
}

func decodeSession(cookieVal string) *SessionCookieData {
	parts := strings.Split(cookieVal, ".")
	if len(parts) != 2 {
		return nil
	}
	payload, sig := parts[0], parts[1]
	h := hmac.New(sha256.New, secretKey)
	h.Write([]byte(payload))
	expectedSig := base64.RawURLEncoding.EncodeToString(h.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return nil
	}
	b, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return nil
	}
	var sess SessionCookieData
	if err := json.Unmarshal(b, &sess); err != nil {
		return nil
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil
	}
	return &sess
}

func getOIDCEndpoints(issuer string) (authURL, tokenURL, userinfoURL string) {
	issuer = strings.TrimSuffix(issuer, "/")

	// Attempt to fetch .well-known configuration
	wellKnownURL := issuer + "/.well-known/openid-configuration"
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(wellKnownURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var disc struct {
			AuthEP     string `json:"authorization_endpoint"`
			TokenEP    string `json:"token_endpoint"`
			UserinfoEP string `json:"userinfo_endpoint"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&disc); err == nil {
			if disc.AuthEP != "" && disc.TokenEP != "" {
				return disc.AuthEP, disc.TokenEP, disc.UserinfoEP
			}
		}
	}

	// Default fallback paths for Authentik / standard OIDC providers
	return issuer + "/authorize", issuer + "/token", issuer + "/userinfo"
}

// HandleLogin redirects the user to the OIDC provider's authorization endpoint
func HandleLogin(cfg *config.Config) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !cfg.OIDCEnabled {
			return c.Redirect(http.StatusTemporaryRedirect, "/")
		}

		verifier, challenge, err := GeneratePKCEPair()
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to generate PKCE challenge")
		}

		state, err := GenerateRandomString(16)
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to generate state")
		}

		// Store verifier and state in temporary HTTP-only cookie
		stateData := OIDCStateCookie{State: state, CodeVerifier: verifier}
		stateBytes, _ := json.Marshal(stateData)

		c.SetCookie(&http.Cookie{
			Name:     "finrep_oidc_state",
			Value:    base64.RawURLEncoding.EncodeToString(stateBytes),
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   300, // 5 mins
		})

		authEP, _, _ := getOIDCEndpoints(cfg.OIDCIssuer)

		u, err := url.Parse(authEP)
		if err != nil {
			return c.String(http.StatusInternalServerError, "Invalid OIDC issuer URL")
		}

		q := u.Query()
		q.Set("client_id", cfg.OIDCClientID)
		q.Set("response_type", "code")
		q.Set("redirect_uri", cfg.OIDCRedirect)
		q.Set("scope", "openid profile email")
		q.Set("state", state)
		q.Set("code_challenge", challenge)
		q.Set("code_challenge_method", "S256")
		u.RawQuery = q.Encode()

		return c.Redirect(http.StatusFound, u.String())
	}
}

// HandleCallback handles the redirect back from the OIDC provider
func HandleCallback(cfg *config.Config) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !cfg.OIDCEnabled {
			return c.Redirect(http.StatusTemporaryRedirect, "/")
		}

		code := c.QueryParam("code")
		state := c.QueryParam("state")
		errParam := c.QueryParam("error")

		if errParam != "" {
			desc := c.QueryParam("error_description")
			return c.String(http.StatusBadRequest, fmt.Sprintf("OIDC Authentication error: %s - %s", errParam, desc))
		}

		if code == "" || state == "" {
			return c.String(http.StatusBadRequest, "Missing code or state parameter")
		}

		// Verify state from cookie
		cookie, err := c.Cookie("finrep_oidc_state")
		if err != nil || cookie.Value == "" {
			return c.String(http.StatusBadRequest, "OIDC state cookie expired or missing. Please try logging in again.")
		}

		stateBytes, err := base64.RawURLEncoding.DecodeString(cookie.Value)
		if err != nil {
			return c.String(http.StatusBadRequest, "Invalid state cookie format")
		}

		var stateData OIDCStateCookie
		if err := json.Unmarshal(stateBytes, &stateData); err != nil || stateData.State != state {
			return c.String(http.StatusBadRequest, "OIDC state mismatch")
		}

		// Clear state cookie
		c.SetCookie(&http.Cookie{
			Name:     "finrep_oidc_state",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})

		_, tokenEP, userinfoEP := getOIDCEndpoints(cfg.OIDCIssuer)

		// Exchange code for tokens
		form := url.Values{}
		form.Set("grant_type", "authorization_code")
		form.Set("client_id", cfg.OIDCClientID)
		form.Set("code", code)
		form.Set("redirect_uri", cfg.OIDCRedirect)
		form.Set("code_verifier", stateData.CodeVerifier)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.PostForm(tokenEP, form)
		if err != nil {
			return c.String(http.StatusInternalServerError, fmt.Sprintf("Failed to contact token endpoint: %v", err))
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			return c.String(http.StatusBadRequest, fmt.Sprintf("Token exchange failed (%d): %s", resp.StatusCode, string(respBody)))
		}

		var tokenResp OIDCTokenResponse
		if err := json.Unmarshal(respBody, &tokenResp); err != nil {
			return c.String(http.StatusInternalServerError, "Failed to parse token response")
		}

		// Fetch user info using access token
		userName := "Authenticated User"
		userEmail := "user@oidc"
		userID := "oidc-sub"

		if userinfoEP != "" && tokenResp.AccessToken != "" {
			req, err := http.NewRequest("GET", userinfoEP, nil)
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)
				uiResp, err := client.Do(req)
				if err == nil && uiResp.StatusCode == http.StatusOK {
					defer uiResp.Body.Close()
					var ui OIDCUserInfo
					if err := json.NewDecoder(uiResp.Body).Decode(&ui); err == nil {
						if ui.Sub != "" {
							userID = ui.Sub
						}
						if ui.Name != "" {
							userName = ui.Name
						} else if ui.PreferredUsername != "" {
							userName = ui.PreferredUsername
						}
						if ui.Email != "" {
							userEmail = ui.Email
						}
					}
				}
			}
		}

		// Set session cookie valid for 24 hours
		sessData := &SessionCookieData{
			ID:        userID,
			Name:      userName,
			Email:     userEmail,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		}

		c.SetCookie(&http.Cookie{
			Name:     "finrep_session",
			Value:    encodeSession(sessData),
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   86400, // 24h
		})

		return c.Redirect(http.StatusFound, "/")
	}
}

// HandleLogout clears the session cookie and redirects to /
func HandleLogout() echo.HandlerFunc {
	return func(c echo.Context) error {
		c.SetCookie(&http.Cookie{
			Name:     "finrep_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})
		return c.Redirect(http.StatusFound, "/")
	}
}
