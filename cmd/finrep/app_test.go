package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/conf"
	"github.com/liorokman/finrep/internal/store"
)

func newApp(t *testing.T, cfg *conf.Config) (*app, *store.Store, error) {
	t.Helper()
	ctx := context.Background()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	a, err := build(ctx, cfg, st)
	return a, st, err
}

func TestBuildServesTheAPIWithSeededCategories(t *testing.T) {
	a, _, err := newApp(t, &conf.Config{MaxUploadMB: 10})
	if err != nil {
		t.Fatal(err)
	}
	do := func(method, path, body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		rec := httptest.NewRecorder()
		a.handler.ServeHTTP(rec, req)
		return rec
	}
	if rec := do("GET", "/healthz", ""); rec.Code != 200 {
		t.Fatalf("healthz %d", rec.Code)
	}
	rec := do("GET", "/api/v1/categories", "")
	var out struct{ Items []map[string]any }
	if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &out) != nil || len(out.Items) < 30 {
		t.Fatalf("%d, %d categories", rec.Code, len(out.Items))
	}
	if rec := do("POST", "/api/v1/accounts", `{"name":"Leumi","type":"BANK","institution":"Leumi"}`); rec.Code != http.StatusCreated {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestBuildSeedsOnlyOnce(t *testing.T) {
	ctx := context.Background()
	a, st, err := newApp(t, &conf.Config{MaxUploadMB: 10})
	if err != nil {
		t.Fatal(err)
	}
	_ = a
	if _, err := st.ExecContext(ctx, `DELETE FROM categories`); err != nil {
		t.Fatal(err)
	}
	if _, err := build(ctx, &conf.Config{MaxUploadMB: 10}, st); err != nil { // a restart
		t.Fatal(err)
	}
	var n int
	st.QueryRowContext(ctx, `SELECT COUNT(*) FROM categories`).Scan(&n)
	if n != 0 {
		t.Fatalf("a restart re-created %d deleted categories", n)
	}
}

func TestBuildMarksInterruptedRunsFailed(t *testing.T) {
	ctx := context.Background()
	_, st, err := newApp(t, &conf.Config{MaxUploadMB: 10})
	if err != nil {
		t.Fatal(err)
	}
	st.ExecContext(ctx, `INSERT INTO categorization_runs (id) VALUES ('stuck')`)
	if _, err := build(ctx, &conf.Config{MaxUploadMB: 10}, st); err != nil {
		t.Fatal(err)
	}
	var status string
	st.QueryRowContext(ctx, `SELECT status FROM categorization_runs WHERE id = 'stuck'`).Scan(&status)
	if status != "FAILED" {
		t.Fatalf("status %s", status)
	}
}

func TestBuildFailsFastOnABadIdentityProvider(t *testing.T) {
	cfg := &conf.Config{AuthEnabled: true, MaxUploadMB: 10, SessionSecret: []byte(strings.Repeat("s", 32)),
		OIDCIssuer: "http://127.0.0.1:1", OIDCClientID: "x", OIDCRedirect: "http://localhost/auth/callback", OIDCGroup: "FinRep_Users"}
	if _, _, err := newApp(t, cfg); err == nil || !strings.Contains(err.Error(), "oidc discovery") {
		t.Fatalf("want a discovery error, got %v", err)
	}
	cfg.SessionSecret = []byte("short")
	if _, _, err := newApp(t, cfg); err == nil {
		t.Fatal("a short session secret must fail")
	}
}

const mcpToken = "agent-token-0123456789"

func mcpCall(h http.Handler, auth string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", "/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestMCPIsMountedOutsideTheSessionGate(t *testing.T) {
	// Open mode.
	a, _, err := newApp(t, &conf.Config{MaxUploadMB: 10, MCPToken: mcpToken})
	if err != nil {
		t.Fatal(err)
	}
	if rec := mcpCall(a.handler, "Bearer "+mcpToken); rec.Code != 200 || !strings.Contains(rec.Body.String(), "query_transactions") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if rec := mcpCall(a.handler, ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("no token: %d", rec.Code)
	}
	if rec := mcpCall(a.handler, "Bearer wrong-token"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("wrong token: %d", rec.Code)
	}
	// No token configured: the endpoint does not exist, whatever the caller sends.
	a, _, _ = newApp(t, &conf.Config{MaxUploadMB: 10})
	if rec := mcpCall(a.handler, "Bearer "+mcpToken); rec.Code != http.StatusNotFound {
		t.Fatalf("disabled: %d", rec.Code)
	}
}

func TestMCPTokenDoesNotOpenTheRESTAPI(t *testing.T) {
	// The idp only needs to answer discovery for the app to start with login enabled.
	idp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"issuer": "http://" + r.Host, "authorization_endpoint": "http://" + r.Host + "/a",
			"token_endpoint": "http://" + r.Host + "/t", "jwks_uri": "http://" + r.Host + "/k"})
	}))
	defer idp.Close()
	cfg := &conf.Config{AuthEnabled: true, MaxUploadMB: 10, MCPToken: mcpToken, SessionSecret: []byte(strings.Repeat("s", 32)),
		OIDCIssuer: idp.URL, OIDCClientID: "x", OIDCRedirect: "http://localhost/auth/callback", OIDCGroup: "FinRep_Users"}
	a, _, err := newApp(t, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if rec := mcpCall(a.handler, "Bearer "+mcpToken); rec.Code != 200 {
		t.Fatalf("agents must get in with the token even when login is on: %d", rec.Code)
	}
	req := httptest.NewRequest("GET", "/api/v1/accounts", nil)
	req.Header.Set("Authorization", "Bearer "+mcpToken)
	rec := httptest.NewRecorder()
	a.handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("the MCP token must not unlock the REST API: %d", rec.Code)
	}
}

func TestUIIsServedBesideTheAPI(t *testing.T) {
	a, _, err := newApp(t, &conf.Config{MaxUploadMB: 10})
	if err != nil {
		t.Fatal(err)
	}
	get := func(path string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		a.handler.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		return rec
	}
	ui := get("/")
	if ui.Code != 200 || !strings.Contains(ui.Body.String(), `id="app"`) {
		t.Fatalf("%d", ui.Code)
	}
	if csp := ui.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'self'") || ui.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatalf("the UI needs the same security headers as the API: %q", csp)
	}
	if rec := get("/api/v1/categories"); rec.Code != 200 || !strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("api: %d", rec.Code)
	}
	if rec := get("/healthz"); rec.Code != 200 {
		t.Fatalf("healthz: %d", rec.Code)
	}
	if rec := get("/api/v1/nope"); rec.Code != 404 || !strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("api 404 must stay JSON: %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec := get("/definitely/not/here"); rec.Code != 404 {
		t.Fatalf("%d", rec.Code)
	}
}
