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
