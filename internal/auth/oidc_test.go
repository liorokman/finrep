package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/liorokman/finrep/internal/config"
)

func TestOIDCHandlers(t *testing.T) {
	cfg := &config.Config{
		OIDCEnabled:  true,
		OIDCIssuer:   "https://auth.example.com/application/o/finrep/",
		OIDCClientID: "test-client-id",
		OIDCRedirect: "http://localhost:8080/auth/callback",
	}

	e := echo.New()

	// Test Login Handler (Redirects to authorization endpoint)
	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := HandleLogin(cfg)(c)
	if err != nil {
		t.Fatalf("HandleLogin failed: %v", err)
	}
	if rec.Code != http.StatusFound {
		t.Errorf("expected status 302 redirect, got %d", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if loc == "" || !containsStr(loc, "response_type=code") || !containsStr(loc, "code_challenge") {
		t.Errorf("expected authorization redirect with PKCE code_challenge, got: %s", loc)
	}

	// Test Logout Handler
	reqLogout := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
	recLogout := httptest.NewRecorder()
	cLogout := e.NewContext(reqLogout, recLogout)

	err = HandleLogout(cfg)(cLogout)
	if err != nil {
		t.Fatalf("HandleLogout failed: %v", err)
	}
	if recLogout.Code != http.StatusFound {
		t.Errorf("expected 302 redirect on logout, got %d", recLogout.Code)
	}
}

func TestAuthMiddlewareLoginBypass(t *testing.T) {
	cfg := &config.Config{
		OIDCEnabled:  true,
		OIDCIssuer:   "https://auth.example.com/application/o/finrep/",
		OIDCClientID: "test-client-id",
		OIDCRedirect: "http://localhost:8080/auth/callback",
	}

	e := echo.New()
	mw := AuthMiddleware(cfg)

	// Simulated static asset handler
	handler := mw(func(c echo.Context) error {
		return c.String(http.StatusOK, "SPA Index Page")
	})

	// Test GET /login -> should NOT redirect to /login, should return HTTP 200
	reqLogin := httptest.NewRequest(http.MethodGet, "/login", nil)
	recLogin := httptest.NewRecorder()
	cLogin := e.NewContext(reqLogin, recLogin)

	if err := handler(cLogin); err != nil {
		t.Fatalf("handler failed for /login: %v", err)
	}
	if recLogin.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200 for /login, got %d (Location: %s)", recLogin.Code, recLogin.Header().Get("Location"))
	}

	// Test GET / -> should redirect (302) to /login for unauthenticated users
	reqRoot := httptest.NewRequest(http.MethodGet, "/", nil)
	recRoot := httptest.NewRecorder()
	cRoot := e.NewContext(reqRoot, recRoot)

	if err := handler(cRoot); err != nil {
		t.Fatalf("handler failed for /: %v", err)
	}
	if recRoot.Code != http.StatusFound || recRoot.Header().Get("Location") != "/login" {
		t.Fatalf("expected 302 redirect to /login for root, got %d (Location: %s)", recRoot.Code, recRoot.Header().Get("Location"))
	}
}

func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || searchStr(s, sub))
}

func searchStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
