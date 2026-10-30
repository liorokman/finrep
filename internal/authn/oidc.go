package authn

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/netip"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// OIDC runs the authorization-code-with-PKCE login against one provider (e.g. Authentik).
type OIDC struct {
	oauth    oauth2.Config
	verifier *oidc.IDTokenVerifier
	sessions *Sessions
	trusted  []netip.Prefix
}

// Settings for NewOIDC.
type OIDCConfig struct {
	Issuer, ClientID, ClientSecret, RedirectURL string
	Scopes                                      []string
	TrustedProxies                              []netip.Prefix
	HTTPClient                                  *http.Client // optional, for tests
}

// NewOIDC performs provider discovery. It fails if the provider cannot be reached, so a
// misconfiguration is noticed at startup.
func NewOIDC(ctx context.Context, c OIDCConfig, s *Sessions) (*OIDC, error) {
	if c.HTTPClient != nil {
		ctx = oidc.ClientContext(ctx, c.HTTPClient)
	}
	p, err := oidc.NewProvider(ctx, c.Issuer)
	if err != nil {
		return nil, fmt.Errorf("oidc discovery for %s: %w", c.Issuer, err)
	}
	scopes := c.Scopes
	if len(scopes) == 0 {
		scopes = []string{oidc.ScopeOpenID, "profile", "email"}
	}
	return &OIDC{
		oauth: oauth2.Config{
			ClientID: c.ClientID, ClientSecret: c.ClientSecret, Endpoint: p.Endpoint(),
			RedirectURL: c.RedirectURL, Scopes: scopes,
		},
		verifier: p.Verifier(&oidc.Config{ClientID: c.ClientID}),
		sessions: s,
		trusted:  c.TrustedProxies,
	}, nil
}

const (
	flowCookie = "finrep_oidc"
	flowTTL    = 10 * time.Minute
)

type flow struct {
	State    string `json:"s"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
	Next     string `json:"x"`
	Expires  int64  `json:"e"`
}

// SafeNext keeps only a local path, so a login link cannot bounce the user to another site.
func SafeNext(next string) string {
	if next == "" || next[0] != '/' || strings.HasPrefix(next, "//") || strings.HasPrefix(next, "/\\") || strings.ContainsAny(next, "\r\n") {
		return "/"
	}
	return next
}

func (o *OIDC) setFlowCookie(w http.ResponseWriter, secure bool, f *flow) error {
	tok, err := o.sessions.seal("oidc-flow", f)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{Name: flowCookie, Value: tok, Path: "/auth", HttpOnly: true, Secure: secure,
		SameSite: http.SameSiteLaxMode, MaxAge: int(flowTTL.Seconds())})
	return nil
}

func clearFlowCookie(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{Name: flowCookie, Value: "", Path: "/auth", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
}

// Login starts the flow: GET /auth/login?next=/path
func (o *OIDC) Login(w http.ResponseWriter, r *http.Request) {
	req := Inspect(r, o.trusted)
	f := &flow{
		State: RandomToken(24), Nonce: RandomToken(24), Verifier: oauth2.GenerateVerifier(),
		Next: SafeNext(r.URL.Query().Get("next")), Expires: o.sessions.Now().Add(flowTTL).Unix(),
	}
	if err := o.setFlowCookie(w, req.Secure(), f); err != nil {
		http.Error(w, "login unavailable", http.StatusInternalServerError)
		return
	}
	url := o.oauth.AuthCodeURL(f.State, oauth2.S256ChallengeOption(f.Verifier), oidc.Nonce(f.Nonce))
	http.Redirect(w, r, url, http.StatusFound)
}

// Callback finishes the flow: GET /auth/callback?code=...&state=...
func (o *OIDC) Callback(w http.ResponseWriter, r *http.Request) {
	req := Inspect(r, o.trusted)
	fail := func(code int, msg string, err error) {
		clearFlowCookie(w, req.Secure())
		if err != nil {
			slog.Warn("login failed", "reason", msg, "error", err)
		}
		http.Error(w, msg, code)
	}
	c, err := r.Cookie(flowCookie)
	if err != nil {
		fail(http.StatusBadRequest, "login session expired, start again", nil)
		return
	}
	var f flow
	if err := o.sessions.open("oidc-flow", c.Value, &f); err != nil || o.sessions.Now().Unix() >= f.Expires {
		fail(http.StatusBadRequest, "login session expired, start again", nil)
		return
	}
	q := r.URL.Query()
	if subtle.ConstantTimeCompare([]byte(q.Get("state")), []byte(f.State)) != 1 {
		fail(http.StatusBadRequest, "login state mismatch", nil)
		return
	}
	if e := q.Get("error"); e != "" {
		fail(http.StatusForbidden, "the identity provider refused the login", fmt.Errorf("provider error %q", e))
		return
	}
	code := q.Get("code")
	if code == "" {
		fail(http.StatusBadRequest, "missing authorization code", nil)
		return
	}
	tok, err := o.oauth.Exchange(r.Context(), code, oauth2.VerifierOption(f.Verifier))
	if err != nil {
		fail(http.StatusBadGateway, "could not complete login", err)
		return
	}
	raw, _ := tok.Extra("id_token").(string)
	if raw == "" {
		fail(http.StatusBadGateway, "the provider returned no ID token", errors.New("no id_token"))
		return
	}
	idt, err := o.verifier.Verify(r.Context(), raw)
	if err != nil {
		fail(http.StatusForbidden, "the ID token was rejected", err)
		return
	}
	if subtle.ConstantTimeCompare([]byte(idt.Nonce), []byte(f.Nonce)) != 1 {
		fail(http.StatusForbidden, "the ID token was rejected", errors.New("nonce mismatch"))
		return
	}
	var claims struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := idt.Claims(&claims); err != nil || idt.Subject == "" {
		fail(http.StatusForbidden, "the ID token was rejected", err)
		return
	}
	clearFlowCookie(w, req.Secure())
	if _, err := o.sessions.Issue(w, req.Secure(), User{Subject: idt.Subject, Email: claims.Email, Name: claims.Name}); err != nil {
		http.Error(w, "login unavailable", http.StatusInternalServerError)
		return
	}
	slog.Info("login", "sub", idt.Subject)
	http.Redirect(w, r, f.Next, http.StatusFound)
}
