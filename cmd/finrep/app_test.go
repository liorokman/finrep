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
		OIDCIssuer: "http://127.0.0.1:1", OIDCClientID: "x", OIDCRedirect: "http://localhost/auth/callback"}
	if _, _, err := newApp(t, cfg); err == nil || !strings.Contains(err.Error(), "oidc discovery") {
		t.Fatalf("want a discovery error, got %v", err)
	}
	cfg.SessionSecret = []byte("short")
	if _, _, err := newApp(t, cfg); err == nil {
		t.Fatal("a short session secret must fail")
	}
}
