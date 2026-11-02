package api

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/authn"
	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/importer"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/reports"
	"github.com/liorokman/finrep/internal/settings"
	"github.com/liorokman/finrep/internal/store"
)

func init() { authn.PasswordIterations = 1000 }

// client is a browser: it keeps the session cookie and the CSRF token between calls.
type client struct {
	t      *testing.T
	h      http.Handler
	cookie *http.Cookie
	csrf   string
}

func newLocalRig(t *testing.T) (*client, *store.Store) {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	b := billing.New(st, l)
	secret, err := authn.SessionSecret(ctx, st.DB)
	if err != nil {
		t.Fatal(err)
	}
	sessions, err := authn.NewSessions(secret)
	if err != nil {
		t.Fatal(err)
	}
	srv, err := New(Deps{Config: &conf.Config{LocalAuth: true, MaxUploadMB: 10}, Store: st, Ledger: l, Importer: importer.New(st, l), Billing: b,
		Reports: reports.New(st, l, b), Settings: settings.New(st), Categorize: categorize.New(st, l, categorize.Options{}),
		Sessions: sessions, Local: authn.NewLocal(st.DB)})
	if err != nil {
		t.Fatal(err)
	}
	return &client{t: t, h: srv.Handler()}, st
}

func (c *client) do(method, path, body string, mod ...func(*http.Request)) resp {
	c.t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.cookie != nil {
		req.AddCookie(c.cookie)
	}
	if method != "GET" {
		req.Header.Set("Origin", "http://example.com")
		if c.csrf != "" {
			req.Header.Set(authn.CSRFHeader, c.csrf)
		}
	}
	for _, m := range mod {
		m(req)
	}
	rec := httptest.NewRecorder()
	c.h.ServeHTTP(rec, req)
	for _, ck := range rec.Result().Cookies() {
		if ck.MaxAge >= 0 {
			c.cookie = ck
		} else {
			c.cookie = nil
		}
	}
	r := resp{rec, c.t}
	if rec.Code == 200 && strings.Contains(path, "/auth/") {
		if tok, ok := r.json()["csrf_token"].(string); ok {
			c.csrf = tok
		}
	}
	return r
}

func TestLocalLoginFlow(t *testing.T) {
	c, st := newLocalRig(t)
	creds := `{"username":"admin","password":"long enough password"}`

	// Before setup: everything but the status is locked, and the status asks for setup.
	c.do("GET", "/api/v1/accounts", "").want(401)
	me := c.do("GET", "/api/v1/auth/me", "").want(200).json()
	if me["mode"] != "local" || me["setup_required"] != true || me["authenticated"] != false {
		t.Fatalf("me before setup: %v", me)
	}
	c.do("POST", "/api/v1/auth/login", creds).want(401) // no user yet

	// Setup is checked, creates the user once and logs them in.
	c.do("POST", "/api/v1/auth/setup", `{"username":"admin","password":"short"}`).want(400)
	c.do("POST", "/api/v1/auth/setup", creds, func(r *http.Request) { r.Header.Set("Origin", "http://evil.example") }).want(403)
	c.do("POST", "/api/v1/auth/setup", creds).want(200)
	c.do("GET", "/api/v1/accounts", "").want(200)
	c.do("POST", "/api/v1/auth/setup", `{"username":"x","password":"another long password"}`).want(409)
	var hash string
	st.QueryRow(`SELECT password_hash FROM local_auth`).Scan(&hash)
	if strings.Contains(hash, "long enough") || !strings.HasPrefix(hash, "pbkdf2-sha256$") {
		t.Fatalf("stored hash %q", hash)
	}

	// State-changing requests still need the CSRF token.
	c.do("POST", "/api/v1/accounts", `{"name":"A","type":"BANK","institution":"X"}`, func(r *http.Request) { r.Header.Del(authn.CSRFHeader) }).want(403)

	// Sign out, then back in with the right and wrong password.
	c.do("POST", "/auth/logout", "").want(204)
	c.do("GET", "/api/v1/accounts", "").want(401)
	c.do("POST", "/api/v1/auth/login", `{"username":"admin","password":"wrong wrong wrong"}`).want(401)
	c.do("POST", "/api/v1/auth/login", creds).want(200)
	me = c.do("GET", "/api/v1/auth/me", "").want(200).json()
	if me["authenticated"] != true || me["setup_required"] != false || me["csrf_token"] == "" {
		t.Fatalf("me after login: %v", me)
	}

	// Changing the password: needs the current one, ends other sessions, keeps this one.
	other := *c
	other.cookie = c.cookie
	c.do("PUT", "/api/v1/auth/password", `{"current_password":"nope nope nope","new_password":"brand new password"}`).want(400)
	c.do("PUT", "/api/v1/auth/password", `{"current_password":"long enough password","new_password":"tiny"}`).want(400)
	c.do("PUT", "/api/v1/auth/password", `{"current_password":"long enough password","new_password":"brand new password"}`).want(200)
	c.do("GET", "/api/v1/accounts", "").want(200)
	other.do("GET", "/api/v1/accounts", "").want(401)
	c.do("POST", "/auth/logout", "").want(204)
	c.do("POST", "/api/v1/auth/login", creds).want(401)
	c.do("POST", "/api/v1/auth/login", `{"username":"admin","password":"brand new password"}`).want(200)
}

func TestLocalLoginIsThrottled(t *testing.T) {
	c, _ := newLocalRig(t)
	c.do("POST", "/api/v1/auth/setup", `{"username":"admin","password":"long enough password"}`).want(200)
	c.do("POST", "/auth/logout", "").want(204)
	var last resp
	for i := 0; i < 12; i++ {
		last = c.do("POST", "/api/v1/auth/login", `{"username":"admin","password":"guess guess guess"}`)
	}
	last.want(429)
	c.do("POST", "/api/v1/auth/login", `{"username":"admin","password":"long enough password"}`).want(429)
}

func TestLocalEndpointsAreOffWithoutLocalAuth(t *testing.T) {
	for _, g := range []*rig{newRig(t, false), newRig(t, true)} {
		g.call("POST", "/api/v1/auth/setup", `{"username":"admin","password":"long enough password"}`).want(404)
		g.call("POST", "/api/v1/auth/login", `{"username":"admin","password":"long enough password"}`).want(404)
		g.call("PUT", "/api/v1/auth/password", `{"current_password":"a","new_password":"b"}`).want(404)
	}
}

func TestMeModes(t *testing.T) {
	if m := newRig(t, false).call("GET", "/api/v1/auth/me", nil).want(200).json(); m["mode"] != "none" || m["authenticated"] != true {
		t.Fatalf("open mode: %v", m)
	}
	if m := newRig(t, true).call("GET", "/api/v1/auth/me", nil).want(200).json(); m["mode"] != "oidc" || m["auth_enabled"] != true {
		t.Fatalf("oidc mode: %v", m)
	}
}
