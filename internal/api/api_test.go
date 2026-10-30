package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

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

var ctx = context.Background()

type rig struct {
	t      *testing.T
	srv    *Server
	h      http.Handler
	cfg    *conf.Config
	sess   *authn.Sessions
	l      *ledger.Ledger
	st     *store.Store
	cookie *http.Cookie
	csrf   string
}

// newRig builds the whole stack on a temporary database. With authOn the API requires a session
// cookie, which the rig issues directly (the OIDC exchange itself is tested in package authn).
func newRig(t *testing.T, authOn bool) *rig {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	b := billing.New(st, l)
	cfg := &conf.Config{AuthEnabled: authOn, MaxUploadMB: 10}
	d := Deps{Config: cfg, Store: st, Ledger: l, Importer: importer.New(st, l), Billing: b,
		Reports: reports.New(st, l, b), Settings: settings.New(st),
		Categorize: categorize.New(st, l, categorize.Options{Backoff: time.Millisecond})}
	g := &rig{t: t, cfg: cfg, l: l, st: st}
	if authOn {
		s, err := authn.NewSessions([]byte(strings.Repeat("s", 32)))
		if err != nil {
			t.Fatal(err)
		}
		idp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Discovery is all NewOIDC needs at startup.
			json.NewEncoder(w).Encode(map[string]any{"issuer": "http://" + r.Host, "authorization_endpoint": "http://" + r.Host + "/a",
				"token_endpoint": "http://" + r.Host + "/t", "jwks_uri": "http://" + r.Host + "/k"})
		}))
		t.Cleanup(idp.Close)
		o, err := authn.NewOIDC(ctx, authn.OIDCConfig{Issuer: idp.URL, ClientID: "x", RedirectURL: "http://example.com/auth/callback", RequiredGroup: "FinRep_Users"}, s)
		if err != nil {
			t.Fatal(err)
		}
		d.Sessions, d.OIDC, g.sess = s, o, s
		rec := httptest.NewRecorder()
		sess, err := s.Issue(rec, false, authn.User{Subject: "u1", Email: "alice@example.com"})
		if err != nil {
			t.Fatal(err)
		}
		g.cookie, g.csrf = rec.Result().Cookies()[0], sess.CSRF
	}
	srv, err := New(d)
	if err != nil {
		t.Fatal(err)
	}
	g.srv, g.h = srv, srv.Handler()
	return g
}

type resp struct {
	*httptest.ResponseRecorder
	t *testing.T
}

func (r resp) json() map[string]any {
	r.t.Helper()
	var m map[string]any
	if err := json.Unmarshal(r.Body.Bytes(), &m); err != nil {
		r.t.Fatalf("not JSON (%d): %s", r.Code, r.Body.String())
	}
	return m
}

func (r resp) want(code int) resp {
	r.t.Helper()
	if r.Code != code {
		r.t.Fatalf("status %d, want %d: %s", r.Code, code, strings.TrimSpace(r.Body.String()))
	}
	return r
}

// call sends a request. body may be nil, a string (sent as is) or any JSON-able value.
func (g *rig) call(method, path string, body any, mod ...func(*http.Request)) resp {
	g.t.Helper()
	var rd *bytes.Reader
	switch b := body.(type) {
	case nil:
		rd = bytes.NewReader(nil)
	case string:
		rd = bytes.NewReader([]byte(b))
	default:
		raw, err := json.Marshal(b)
		if err != nil {
			g.t.Fatal(err)
		}
		rd = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rd)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if g.cookie != nil {
		req.AddCookie(g.cookie)
		if method != "GET" {
			req.Header.Set(authn.CSRFHeader, g.csrf)
			req.Header.Set("Origin", "http://example.com")
		}
	}
	for _, m := range mod {
		m(req)
	}
	rec := httptest.NewRecorder()
	g.h.ServeHTTP(rec, req)
	return resp{rec, g.t}
}

func (g *rig) account(name, typ string) string {
	g.t.Helper()
	m := g.call("POST", "/api/v1/accounts", map[string]any{"name": name, "type": typ, "institution": "X", "owner": "Alice"}).want(201).json()
	return m["id"].(string)
}

func TestAccountsLifecycleAndResponseShape(t *testing.T) {
	g := newRig(t, false)
	empty := g.call("GET", "/api/v1/accounts", nil).want(200).json()
	if items, ok := empty["items"].([]any); !ok || len(items) != 0 {
		t.Fatalf("an empty list must be [], got %v", empty["items"])
	}
	card := g.call("POST", "/api/v1/accounts", map[string]any{
		"name": "Cal 1001", "type": "CREDIT_CARD", "institution": "Cal", "owner": "Alice", "last4": "1001",
		"opening_balance_minor": -12345, "credit_limit_minor": 1500000,
		"billing_rules": []map[string]any{{"scope": "LOCAL", "bill_day": 10, "cutoff_day": 10}},
	}).want(201).json()
	if card["created_at"] == "" || card["created_at"] == nil {
		t.Fatalf("created_at missing: %v", card)
	}
	if card["name"] != "Cal 1001" || card["currency"] != "ILS" || card["type"] != "CREDIT_CARD" {
		t.Fatalf("%v", card)
	}
	ob := card["opening_balance"].(map[string]any)
	if ob["minor"].(float64) != -12345 || ob["currency"] != "ILS" || ob["display"] != "-123.45" {
		t.Fatalf("money shape: %v", ob)
	}
	rules := card["billing_rules"].([]any)
	if len(rules) != 1 || rules[0].(map[string]any)["bill_day"].(float64) != 10 || rules[0].(map[string]any)["cutoff_day"].(float64) != 10 {
		t.Fatalf("rules: %v", rules)
	}
	for k := range card {
		if k != strings.ToLower(k) {
			t.Errorf("response key %q is not snake_case", k)
		}
	}
	id := card["id"].(string)

	g.call("PATCH", "/api/v1/accounts/"+id, map[string]any{"owner": "Wife", "clear_credit_limit": true}).want(200)
	got := g.call("GET", "/api/v1/accounts/"+id, nil).want(200).json()
	if got["owner"] != "Wife" || got["credit_limit"] != nil {
		t.Fatalf("%v", got)
	}
	g.call("POST", "/api/v1/accounts", map[string]any{"name": "", "type": "BANK", "institution": "X"}).want(400)
	g.call("POST", "/api/v1/accounts", map[string]any{"name": "x", "type": "BANK", "institution": "X", "billing_rules": []map[string]any{{"scope": "ALL", "bill_day": 1}}}).want(400)
	g.call("POST", "/api/v1/accounts", map[string]any{"name": "x", "type": "CREDIT_CARD", "institution": "X", "billing_rules": []map[string]any{{"scope": "ALL", "bill_day": 99}}}).want(400)
	if n := g.call("GET", "/api/v1/accounts", nil).want(200).json()["items"].([]any); len(n) != 1 {
		t.Fatalf("a rejected account must not be left behind: %d accounts", len(n))
	}
	bare := g.call("POST", "/api/v1/accounts", map[string]any{"name": "No rules yet", "type": "CREDIT_CARD", "institution": "X"}).want(201).json()
	if r, ok := bare["billing_rules"].([]any); !ok || len(r) != 0 {
		t.Fatalf("billing_rules must be [] for a card without rules, got %v", bare["billing_rules"])
	}
	g.call("GET", "/api/v1/accounts/nope", nil).want(404)
	g.call("DELETE", "/api/v1/accounts/"+id, nil).want(204)
	g.call("DELETE", "/api/v1/accounts/"+id, nil).want(404)
}

func TestBillingRulesEndpointRecomputesBillDates(t *testing.T) {
	g := newRig(t, false)
	card := g.account("Cal", "CREDIT_CARD")
	g.call("POST", "/api/v1/transactions", map[string]any{"account_id": card, "date": "2026-09-05", "amount_minor": -1000, "payee": "A"}).want(201)
	out := g.call("PUT", "/api/v1/accounts/"+card+"/billing-rules", map[string]any{"rules": []map[string]any{{"scope": "LOCAL", "bill_day": 10, "cutoff_day": 10}}}).want(200).json()
	if out["bill_dates_recomputed"].(float64) != 1 || len(out["rules"].([]any)) != 1 {
		t.Fatalf("%v", out)
	}
	tx := g.call("GET", "/api/v1/transactions?account_id="+card, nil).want(200).json()["items"].([]any)[0].(map[string]any)
	if tx["bill_date"] != "2026-09-10" || tx["bill_date_source"] != "RULE" {
		t.Fatalf("%v", tx)
	}
	bank := g.account("Leumi", "BANK")
	g.call("PUT", "/api/v1/accounts/"+bank+"/billing-rules", map[string]any{"rules": []any{}}).want(400)
}

func TestCategoriesEndpoints(t *testing.T) {
	g := newRig(t, false)
	a := g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Food", "type": "EXPENSE", "monthly_budget_minor": 100000}).want(201).json()
	b := g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Groceries", "name_he": "מכולת", "type": "EXPENSE", "parent_id": a["id"]}).want(201).json()
	if a["created_by"] != "USER" || a["monthly_budget"].(map[string]any)["minor"].(float64) != 100000 || b["name_he"] != "מכולת" {
		t.Fatalf("%v %v", a, b)
	}
	g.call("POST", "/api/v1/categories", map[string]any{"name_en": "food", "type": "EXPENSE"}).want(409)
	g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Bad", "type": "NOPE"}).want(400)
	g.call("PATCH", "/api/v1/categories/"+a["id"].(string), map[string]any{"parent_id": b["id"]}).want(400) // cycle
	p := g.call("PATCH", "/api/v1/categories/"+b["id"].(string), map[string]any{"clear_parent": true, "name_en": "Supermarket"}).want(200).json()
	if p["parent_id"] != nil || p["name_en"] != "Supermarket" {
		t.Fatalf("%v", p)
	}
	g.call("PATCH", "/api/v1/categories/"+a["id"].(string), map[string]any{"clear_budget": true}).want(200)

	// Merge re-points transactions.
	acc := g.account("Leumi", "BANK")
	tx := g.call("POST", "/api/v1/transactions", map[string]any{"account_id": acc, "date": "2026-01-02", "amount_minor": -500, "payee": "SHOP", "category_id": b["id"]}).want(201).json()
	g.call("POST", "/api/v1/categories/"+b["id"].(string)+"/merge", map[string]any{"into": a["id"]}).want(204)
	if got := g.call("GET", "/api/v1/transactions/"+tx["id"].(string), nil).want(200).json(); got["category_id"] != a["id"] {
		t.Fatalf("merge did not re-point: %v", got)
	}
	g.call("POST", "/api/v1/categories/"+a["id"].(string)+"/merge", map[string]any{}).want(400)

	llm := &ledger.Category{NameEN: "Invented", NameHE: "x", Type: ledger.Expense, CreatedBy: ledger.ByLLM}
	if err := g.l.CreateCategory(ctx, llm); err != nil {
		t.Fatal(err)
	}
	items := g.call("GET", "/api/v1/categories?created_by=LLM", nil).want(200).json()["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["name_en"] != "Invented" {
		t.Fatalf("%v", items)
	}
	g.call("GET", "/api/v1/categories?created_by=ROBOT", nil).want(400)
	g.call("DELETE", "/api/v1/categories/"+a["id"].(string), nil).want(204)
	g.call("DELETE", "/api/v1/categories/"+a["id"].(string), nil).want(404)
}

func TestTransactionsEndpoints(t *testing.T) {
	g := newRig(t, false)
	acc := g.account("Leumi", "BANK")
	cat := g.call("POST", "/api/v1/categories", map[string]any{"name_en": "Food", "type": "EXPENSE"}).want(201).json()["id"].(string)
	var ids []string
	for i, p := range []string{"SHUFERSAL", "RAMI LEVY", "CAFE"} {
		m := g.call("POST", "/api/v1/transactions", map[string]any{"account_id": acc, "date": "2026-02-0" + string(rune('1'+i)), "amount_minor": -1000 * (i + 1), "payee": p}).want(201).json()
		ids = append(ids, m["id"].(string))
		if m["categorized_by"] != "UNSET" || m["amount"].(map[string]any)["minor"].(float64) != float64(-1000*(i+1)) {
			t.Fatalf("%v", m)
		}
	}
	page := g.call("GET", "/api/v1/transactions?limit=2&offset=1", nil).want(200).json()
	if page["total"].(float64) != 3 || len(page["items"].([]any)) != 2 || page["limit"].(float64) != 2 || page["offset"].(float64) != 1 {
		t.Fatalf("%v", page)
	}
	for _, bad := range []string{"limit=501", "limit=0", "limit=x", "offset=-1", "needs_review=maybe"} {
		g.call("GET", "/api/v1/transactions?"+bad, nil).want(400)
	}
	if got := g.call("GET", "/api/v1/transactions?q=cafe", nil).want(200).json(); got["total"].(float64) != 1 {
		t.Fatalf("search: %v", got)
	}
	if got := g.call("GET", "/api/v1/transactions?q=%25", nil).want(200).json(); got["total"].(float64) != 0 {
		t.Fatalf("LIKE wildcards must be escaped: %v", got)
	}
	if got := g.call("GET", "/api/v1/transactions?category_id=uncategorized&from=2026-02-02&to=2026-02-03", nil).want(200).json(); got["total"].(float64) != 2 {
		t.Fatalf("filters: %v", got)
	}
	n := g.call("PATCH", "/api/v1/transactions", map[string]any{"ids": ids[:2], "category_id": cat}).want(200).json()
	if n["updated"].(float64) != 2 {
		t.Fatalf("%v", n)
	}
	got := g.call("GET", "/api/v1/transactions/"+ids[0], nil).want(200).json()
	if got["category_id"] != cat || got["categorized_by"] != "MANUAL" || got["is_reviewed"] != true || got["category_name_en"] != "Food" {
		t.Fatalf("%v", got)
	}
	g.call("PATCH", "/api/v1/transactions", map[string]any{"ids": ids[:1], "clear_category": true}).want(200)
	g.call("PATCH", "/api/v1/transactions", map[string]any{"ids": []string{}}).want(400)
	g.call("PATCH", "/api/v1/transactions", map[string]any{"ids": []string{"nope"}, "category_id": cat}).want(404)
	g.call("POST", "/api/v1/transactions", map[string]any{"account_id": "nope", "date": "2026-02-01", "amount_minor": -1, "payee": "x"}).want(400)
	g.call("POST", "/api/v1/transactions", map[string]any{"account_id": acc, "date": "2022-12-31", "amount_minor": -1, "payee": "x"}).want(400) // before 2023
	g.call("POST", "/api/v1/transactions", map[string]any{"account_id": acc, "date": "2026-02-01", "amount_minor": -1, "payee": " "}).want(400)
	g.call("DELETE", "/api/v1/transactions/"+ids[2], nil).want(204)
	g.call("GET", "/api/v1/transactions/"+ids[2], nil).want(404)
}

func TestRequestHardening(t *testing.T) {
	g := newRig(t, false)
	acc := map[string]any{"name": "x", "type": "BANK", "institution": "X"}
	// Content type.
	g.call("POST", "/api/v1/accounts", acc, func(r *http.Request) { r.Header.Set("Content-Type", "text/plain") }).want(415)
	g.call("POST", "/api/v1/accounts", acc, func(r *http.Request) { r.Header.Del("Content-Type") }).want(415)
	// Unknown fields, trailing data, empty body, malformed JSON.
	g.call("POST", "/api/v1/accounts", map[string]any{"name": "x", "type": "BANK", "institution": "X", "is_admin": true}).want(400)
	g.call("POST", "/api/v1/accounts", `{"name":"x","type":"BANK","institution":"X"} {"a":1}`).want(400)
	g.call("POST", "/api/v1/accounts", ``, func(r *http.Request) { r.Header.Set("Content-Type", "application/json") }).want(400)
	g.call("POST", "/api/v1/accounts", `{"name":`).want(400)
	// Body size.
	huge := `{"name":"` + strings.Repeat("a", 2<<20) + `"}`
	g.call("POST", "/api/v1/accounts", huge).want(413)
	// Cross-origin writes are refused even in the open dev mode.
	g.call("POST", "/api/v1/accounts", acc, func(r *http.Request) { r.Header.Set("Origin", "https://evil.example") }).want(403)
	g.call("POST", "/api/v1/accounts", acc, func(r *http.Request) { r.Header.Set("Origin", "http://example.com") }).want(201)
	// Unknown API paths and methods answer in JSON.
	m := g.call("GET", "/api/v1/nope", nil).want(404).json()
	if m["error"] == nil {
		t.Fatalf("%v", m)
	}
	if al := g.call("PUT", "/api/v1/accounts", nil).want(405).Header().Get("Allow"); al != "GET, POST" {
		t.Errorf("Allow = %q", al)
	}
	// Security headers and request id.
	h := g.call("GET", "/api/v1/accounts", nil).want(200).Header()
	for k, want := range map[string]string{"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Cache-Control": "no-store", "Referrer-Policy": "same-origin"} {
		if h.Get(k) != want {
			t.Errorf("%s = %q", k, h.Get(k))
		}
	}
	if csp := h.Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'self'") || !strings.Contains(csp, "frame-ancestors 'none'") {
		t.Errorf("CSP = %q", csp)
	}
	if h.Get("X-Request-Id") == "" {
		t.Error("no request id")
	}
	if h.Get("Strict-Transport-Security") != "" {
		t.Error("HSTS over plain HTTP")
	}
	https := g.call("GET", "/healthz", nil, func(r *http.Request) { r.TLS = &tlsState }).Header()
	if https.Get("Strict-Transport-Security") == "" {
		t.Error("no HSTS over HTTPS")
	}
}

func TestInternalErrorsAndPanicsDoNotLeak(t *testing.T) {
	g := newRig(t, false)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/x", nil)
	fail(rec, req, errSecret)
	if rec.Code != 500 || strings.Contains(rec.Body.String(), "SECRET") || !strings.Contains(rec.Body.String(), "internal error") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	rec = httptest.NewRecorder()
	g.srv.recoverer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("SECRET boom") })).ServeHTTP(rec, req)
	if rec.Code != 500 || strings.Contains(rec.Body.String(), "SECRET") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestAuthRequiredWhenOn(t *testing.T) {
	g := newRig(t, true)
	noCookie := func(r *http.Request) { r.Header.Del("Cookie") }
	// Without a session everything but the public endpoints is 401.
	saved := g.cookie
	g.cookie = nil
	for _, p := range []string{"/api/v1/accounts", "/api/v1/transactions", "/api/v1/categories", "/api/v1/nope"} {
		g.call("GET", p, nil, noCookie).want(401)
	}
	g.call("POST", "/api/v1/accounts", map[string]any{"name": "x"}).want(401)
	g.call("POST", "/auth/logout", nil).want(401)
	g.call("GET", "/healthz", nil).want(200)
	me := g.call("GET", "/api/v1/auth/me", nil).want(200).json()
	if me["authenticated"] != false || me["auth_enabled"] != true || me["csrf_token"] != nil {
		t.Fatalf("%v", me)
	}
	// A forged cookie is not a session.
	forged := &http.Cookie{Name: "finrep_session", Value: "eyJzdWIiOiJhZG1pbiJ9.AAAA"}
	g.call("GET", "/api/v1/accounts", nil, func(r *http.Request) { r.AddCookie(forged) }).want(401)

	g.cookie = saved
	me = g.call("GET", "/api/v1/auth/me", nil).want(200).json()
	if me["authenticated"] != true || me["csrf_token"] != g.csrf || me["user"].(map[string]any)["email"] != "alice@example.com" {
		t.Fatalf("%v", me)
	}
	g.call("GET", "/api/v1/accounts", nil).want(200)

	// State-changing requests need the CSRF header and the right origin.
	body := map[string]any{"name": "x", "type": "BANK", "institution": "X"}
	g.call("POST", "/api/v1/accounts", body, func(r *http.Request) { r.Header.Del(authn.CSRFHeader) }).want(403)
	g.call("POST", "/api/v1/accounts", body, func(r *http.Request) { r.Header.Set(authn.CSRFHeader, "wrong") }).want(403)
	g.call("POST", "/api/v1/accounts", body, func(r *http.Request) { r.Header.Set("Origin", "https://evil.example") }).want(403)
	g.call("POST", "/api/v1/accounts", body).want(201)
	g.call("DELETE", "/api/v1/accounts/anything", nil, func(r *http.Request) { r.Header.Del(authn.CSRFHeader) }).want(403)

	// Logout clears the cookie.
	out := g.call("POST", "/auth/logout", nil).want(204)
	cleared := false
	for _, c := range out.Result().Cookies() {
		if c.Name == "finrep_session" && c.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Error("logout did not clear the cookie")
	}
	// The login redirect is public.
	rec := g.call("GET", "/auth/login?next=/reports", nil, noCookie)
	if rec.Code != http.StatusFound || !strings.Contains(rec.Header().Get("Location"), "code_challenge_method=S256") {
		t.Fatalf("%d %s", rec.Code, rec.Header().Get("Location"))
	}
}

func TestAuthOffIdentity(t *testing.T) {
	g := newRig(t, false)
	me := g.call("GET", "/api/v1/auth/me", nil).want(200).json()
	if me["authenticated"] != true || me["auth_enabled"] != false || me["user"].(map[string]any)["sub"] != "local" {
		t.Fatalf("%v", me)
	}
	g.call("GET", "/auth/login", nil).want(404)
}

func TestNewRejectsIncompleteDeps(t *testing.T) {
	if _, err := New(Deps{}); err == nil {
		t.Error("empty deps accepted")
	}
	g := newRig(t, false)
	if _, err := New(Deps{Config: &conf.Config{AuthEnabled: true}, Store: g.st, Ledger: g.l}); err == nil {
		t.Error("auth on without sessions accepted")
	}
}

func TestSnakeCase(t *testing.T) {
	for in, want := range map[string]string{
		"AccountID": "account_id", "NameHE": "name_he", "TxCount": "tx_count", "BankTxID": "bank_tx_id", "ID": "id",
		"PercentUsed": "percent_used", "name": "name", "already_snake": "already_snake", "MinRate": "min_rate", "CSRF": "csrf",
		"IsReviewed": "is_reviewed", "HasProposal": "has_proposal", "Q1": "q1",
	} {
		if got := snake(in); got != want {
			t.Errorf("snake(%q) = %q, want %q", in, got, want)
		}
	}
}
