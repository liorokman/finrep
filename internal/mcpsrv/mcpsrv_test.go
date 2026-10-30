package mcpsrv

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/reports"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

const token = "s3cret-token-0123456789"

type world struct {
	st             *store.Store
	srv            *server.MCPServer
	bank, cal, kid *ledger.Account
}

func ip(i int) *int { return &i }

// newWorld seeds a small ledger: a bank account, a card with a paid statement, and a monthly subscription.
func newWorld(t *testing.T) *world {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	b := billing.New(st, l)
	now := func() time.Time { return time.Date(2026, 4, 15, 12, 0, 0, 0, time.UTC) }
	b.Now = now
	rs := reports.New(st, l, b)
	rs.Now = now
	w := &world{st: st}
	mk := func(name string, typ ledger.AccountType, owner, last4 string, open int64) *ledger.Account {
		a := &ledger.Account{Name: name, Type: typ, Institution: "X", Owner: owner, Last4: last4, OpeningBalance: money.New(open, "ILS")}
		if err := l.CreateAccount(ctx, a); err != nil {
			t.Fatal(err)
		}
		return a
	}
	w.bank = mk("Leumi", ledger.Bank, "Alice", "", 100000)
	w.cal = mk("Cal 1001", ledger.CreditCard, "Alice", "1001", 0)
	w.kid = mk("Kid card", ledger.CreditCard, "Wife", "1111", 0)
	if err := l.SetBillingRules(ctx, w.cal.ID, []ledger.BillingRule{{Scope: ledger.ScopeAll, BillDay: 10, CutoffDay: ip(10)}}); err != nil {
		t.Fatal(err)
	}
	food := &ledger.Category{NameEN: "Food", NameHE: "אוכל", Type: ledger.Expense}
	salary := &ledger.Category{NameEN: "Salary", NameHE: "משכורת", Type: ledger.Income}
	for _, c := range []*ledger.Category{food, salary} {
		if err := l.CreateCategory(ctx, c); err != nil {
			t.Fatal(err)
		}
	}
	add := func(acc *ledger.Account, date string, minor int64, payee string, cat *ledger.Category) *ledger.Transaction {
		x := &ledger.Transaction{AccountID: acc.ID, Date: date, Amount: money.New(minor, "ILS"), PayeeRaw: payee}
		if cat != nil {
			x.CategoryID, x.CategorizedBy = &cat.ID, ledger.ByManual
		}
		if err := l.InsertTransaction(ctx, x); err != nil {
			t.Fatal(err)
		}
		return x
	}
	add(w.bank, "2026-01-05", 1000000, "Salary", salary)
	add(w.bank, "2026-02-05", 1000000, "Salary", salary)
	groc := add(w.cal, "2026-01-12", -20000, "SHUFERSAL", food)
	for _, d := range []string{"2026-01-03", "2026-02-03", "2026-03-03", "2026-04-03"} {
		add(w.cal, d, -4990, "NETFLIX.COM", nil)
	}
	add(w.kid, "2026-03-01", -7000, "PHARM", nil)
	stID := store.NewID()
	st.ExecContext(ctx, `INSERT INTO statements (id, account_id, bill_date) VALUES (?, ?, '2026-02-10')`, stID, w.cal.ID)
	st.ExecContext(ctx, `UPDATE transactions SET statement_id = ?, bill_date = '2026-02-10', bill_date_source = 'PDF' WHERE id = ?`, stID, groc.ID)
	pay := add(w.bank, "2026-02-10", -20000, "כרטיסי אשראי-י", nil)
	if _, err := b.Settle(ctx, stID, pay.ID, nil, billing.Manual); err != nil {
		t.Fatal(err)
	}
	if _, err := b.AssignBillDates(ctx, ""); err != nil {
		t.Fatal(err)
	}
	w.srv = New(Deps{Ledger: l, Billing: b, Reports: rs, Now: now})
	return w
}

func (w *world) rowCounts(t *testing.T) string {
	t.Helper()
	var parts []string
	for _, tbl := range []string{"accounts", "categories", "transactions", "statements", "settlements", "settings", "billing_rules", "categorization_runs", "import_batches"} {
		var n int
		if err := w.st.QueryRow(`SELECT COUNT(*) FROM ` + tbl).Scan(&n); err != nil {
			t.Fatal(err)
		}
		parts = append(parts, tbl+"="+string(rune('0'+n%10))+string(rune('0'+n/10%10)))
	}
	return strings.Join(parts, ",")
}

// connectHTTP starts the handler under /mcp and returns an initialized client.
func connectHTTP(t *testing.T, w *world, tok string) *client.Client {
	t.Helper()
	mux := http.NewServeMux()
	mux.Handle("/mcp", HTTPHandler(w.srv, token))
	ts := httptest.NewServer(mux)
	t.Cleanup(ts.Close)
	c, err := client.NewStreamableHttpClient(ts.URL+"/mcp", transport.WithHTTPHeaders(map[string]string{"Authorization": "Bearer " + tok}))
	if err != nil {
		t.Fatal(err)
	}
	return start(t, c)
}

// connectStdio serves the protocol over in-process pipes, as a subprocess's stdin/stdout would.
func connectStdio(t *testing.T, w *world) *client.Client {
	t.Helper()
	srvIn, clientOut := io.Pipe()
	clientIn, srvOut := io.Pipe()
	cctx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		server.NewStdioServer(w.srv).Listen(cctx, srvIn, srvOut)
	}()
	t.Cleanup(func() { cancel(); clientOut.Close(); srvOut.Close(); <-done })
	return start(t, client.NewClient(transport.NewIO(clientIn, clientOut, nil)))
}

func start(t *testing.T, c *client.Client) *client.Client {
	t.Helper()
	if err := c.Start(ctx); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Close() })
	req := mcp.InitializeRequest{}
	req.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	req.Params.ClientInfo = mcp.Implementation{Name: "test", Version: "1"}
	cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if _, err := c.Initialize(cctx, req); err != nil {
		t.Fatal(err)
	}
	return c
}

func call(t *testing.T, c *client.Client, name string, args map[string]any) (map[string]any, string, bool) {
	t.Helper()
	req := mcp.CallToolRequest{}
	req.Params.Name, req.Params.Arguments = name, args
	cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	res, err := c.CallTool(cctx, req)
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	text := ""
	for _, c := range res.Content {
		if tc, ok := c.(mcp.TextContent); ok {
			text += tc.Text
		}
	}
	var out map[string]any
	if !res.IsError {
		if err := json.Unmarshal([]byte(text), &out); err != nil {
			t.Fatalf("%s: not JSON: %s", name, text)
		}
	}
	return out, text, res.IsError
}

var wantTools = []string{"get_account_summary", "get_cash_flow", "get_category_breakdown", "get_net_worth_trend", "get_recurring",
	"get_statements", "get_summary", "list_accounts", "query_transactions"}

func minor(v any) float64 { return v.(map[string]any)["minor"].(float64) }

// exercise runs the same checks over every transport.
func exercise(t *testing.T, w *world, c *client.Client) {
	before := w.rowCounts(t)

	lt, err := c.ListTools(ctx, mcp.ListToolsRequest{})
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, tl := range lt.Tools {
		names = append(names, tl.Name)
		if tl.Annotations.ReadOnlyHint == nil || !*tl.Annotations.ReadOnlyHint {
			t.Errorf("%s is not marked read-only", tl.Name)
		}
		if tl.Description == "" {
			t.Errorf("%s has no description", tl.Name)
		}
	}
	sort.Strings(names)
	if strings.Join(names, ",") != strings.Join(wantTools, ",") {
		t.Fatalf("tools = %v", names)
	}

	// list_accounts: balances. Bank: 100000 + 2,000,000 - 20,000. Card: still owed, net of the settled statement.
	out, _, isErr := call(t, c, "list_accounts", nil)
	if isErr {
		t.Fatal("list_accounts failed")
	}
	bal := map[string]float64{}
	for _, a := range out["accounts"].([]any) {
		m := a.(map[string]any)
		bal[m["name"].(string)] = minor(m["balance"])
	}
	// Cal owes 4 x 49.90 (the 20,000 groceries were paid): -19960.
	if bal["Leumi"] != 100000+2000000-20000 || bal["Cal 1001"] != -19960 || bal["Kid card"] != -7000 {
		t.Fatalf("balances %v", bal)
	}

	sum, _, isErr := call(t, c, "get_account_summary", map[string]any{"account_id": w.cal.ID})
	if isErr || sum["transaction_count"].(float64) != 5 || sum["earliest_transaction_date"] != "2026-01-03" || sum["latest_transaction_date"] != "2026-04-03" ||
		len(sum["billing_rules"].([]any)) != 1 || len(sum["recent_months"].([]any)) == 0 {
		t.Fatalf("%v", sum)
	}

	q, _, _ := call(t, c, "query_transactions", map[string]any{"search": "netflix", "limit": 2})
	if q["total"].(float64) != 4 || len(q["transactions"].([]any)) != 2 || q["limit"].(float64) != 2 {
		t.Fatalf("%v", q)
	}
	first := q["transactions"].([]any)[0].(map[string]any)
	if first["date"] != "2026-04-03" || minor(first["amount"]) != -4990 || first["payee_raw"] != "NETFLIX.COM" || first["account_name"] != "Cal 1001" {
		t.Fatalf("newest first, snake_case, money objects: %v", first)
	}
	if q, _, _ := call(t, c, "query_transactions", map[string]any{"category_id": "uncategorized", "account_id": w.bank.ID}); q["total"].(float64) != 1 {
		t.Fatalf("%v", q)
	}

	nw, _, _ := call(t, c, "get_net_worth_trend", map[string]any{"from": "2026-01-01", "to": "2026-03-31"})
	pts := nw["points"].([]any)
	if len(pts) != 3 || minor(pts[0].(map[string]any)["assets"]) != 100000+1000000 {
		t.Fatalf("%v", pts)
	}

	bd, _, _ := call(t, c, "get_category_breakdown", map[string]any{"owner": "Alice"})
	cats := bd["categories"].([]any)
	if len(cats) == 0 || minor(bd["total"]) != 20000+4*4990 {
		t.Fatalf("%v", bd)
	}
	cf, _, _ := call(t, c, "get_cash_flow", map[string]any{"owner": "Alice", "measure": "OUT_OF_POCKET"})
	if months := cf["months"].([]any); len(months) < 3 || months[0].(map[string]any)["month"] != "2026-01" {
		t.Fatalf("%v", cf)
	}
	rec, _, _ := call(t, c, "get_recurring", map[string]any{})
	rows := rec["recurring"].([]any)
	if len(rows) != 1 || rows[0].(map[string]any)["cadence"] != "MONTHLY" || rec["truncated"] != false {
		t.Fatalf("%v", rec)
	}

	st, _, _ := call(t, c, "get_statements", map[string]any{"owner": "Alice"})
	ss := st["statements"].([]any)
	// The statement of 10 Feb holds the groceries and February's subscription (it bills that day under
	// the card's rule), but only the groceries were paid by the bank debit.
	var feb map[string]any
	for _, s := range ss {
		if s.(map[string]any)["bill_date"] == "2026-02-10" {
			feb = s.(map[string]any)
		}
	}
	if feb == nil || feb["status"] != "PARTIAL" || len(feb["settlements"].([]any)) != 1 || minor(feb["expected"]) != 24990 || minor(feb["settled"]) != 20000 {
		t.Fatalf("%v", ss)
	}
	if up := st["upcoming_outflow"].([]any); len(up) == 0 {
		t.Fatalf("no upcoming bills: %v", st)
	}
	if only, _, _ := call(t, c, "get_statements", map[string]any{"status": "partial"}); len(only["statements"].([]any)) != 1 {
		t.Fatalf("%v", only)
	}

	// Bad input is reported to the agent as a tool error with a useful message, never as a crash.
	for _, bad := range []struct {
		tool string
		args map[string]any
		want string
	}{
		{"get_cash_flow", map[string]any{"from": "yesterday"}, "YYYY-MM-DD"},
		{"get_cash_flow", map[string]any{"measure": "WEIRD"}, "measure"},
		{"query_transactions", map[string]any{"limit": 101}, "limit"},
		{"query_transactions", map[string]any{"limit": 0}, "limit"},
		{"query_transactions", map[string]any{"limit": 2.5}, "limit"},
		{"query_transactions", map[string]any{"offset": -1}, "offset"},
		{"get_account_summary", map[string]any{}, "account_id"},
		{"get_account_summary", map[string]any{"account_id": "nope"}, "not found"},
		{"get_statements", map[string]any{"status": "WHATEVER"}, "status"},
		{"get_recurring", map[string]any{"limit": 1000}, "limit"},
	} {
		_, text, isErr := call(t, c, bad.tool, bad.args)
		if !isErr || !strings.Contains(text, bad.want) {
			t.Errorf("%s %v: isError=%v %q", bad.tool, bad.args, isErr, text)
		}
	}

	if after := w.rowCounts(t); after != before {
		t.Fatalf("the tools changed the data:\n%s\n%s", before, after)
	}
}

func TestToolsOverStdio(t *testing.T) {
	w := newWorld(t)
	exercise(t, w, connectStdio(t, w))
}

func TestToolsOverStreamableHTTP(t *testing.T) {
	w := newWorld(t)
	exercise(t, w, connectHTTP(t, w, token))
}

func TestHTTPBearerAuthentication(t *testing.T) {
	w := newWorld(t)
	h := HTTPHandler(w.srv, token)
	body := `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
	do := func(auth string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/mcp", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json, text/event-stream")
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}
	for name, auth := range map[string]string{
		"missing":        "",
		"wrong token":    "Bearer nope",
		"prefix of it":   "Bearer " + token[:10],
		"token + extra":  "Bearer " + token + "x",
		"no scheme":      token,
		"basic scheme":   "Basic " + token,
		"empty bearer":   "Bearer ",
		"bearer, no gap": "Bearer" + token,
	} {
		rec := do(auth)
		if rec.Code != http.StatusUnauthorized || rec.Header().Get("WWW-Authenticate") == "" {
			t.Errorf("%s: status %d", name, rec.Code)
		}
	}
	for _, auth := range []string{"Bearer " + token, "bearer " + token, "BEARER " + token} {
		if rec := do(auth); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "list_accounts") {
			t.Errorf("%q: status %d: %s", auth, rec.Code, rec.Body)
		}
	}
	// Even a GET without credentials never reaches the protocol handler.
	req := httptest.NewRequest("GET", "/mcp", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("GET without token: %d", rec.Code)
	}
}

func TestHTTPWithWrongTokenCannotInitialize(t *testing.T) {
	w := newWorld(t)
	mux := http.NewServeMux()
	mux.Handle("/mcp", HTTPHandler(w.srv, token))
	ts := httptest.NewServer(mux)
	defer ts.Close()
	c, err := client.NewStreamableHttpClient(ts.URL+"/mcp", transport.WithHTTPHeaders(map[string]string{"Authorization": "Bearer wrong"}))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	c.Start(ctx)
	req := mcp.InitializeRequest{}
	req.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	if _, err := c.Initialize(ctx, req); err == nil {
		t.Fatal("initialized with a wrong token")
	}
}

func TestHTTPDisabledWithoutToken(t *testing.T) {
	w := newWorld(t)
	h := HTTPHandler(w.srv, "")
	for _, auth := range []string{"", "Bearer ", "Bearer anything"} {
		req := httptest.NewRequest("POST", "/mcp", strings.NewReader(`{}`))
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%q: status %d, want 404", auth, rec.Code)
		}
	}
}

func TestRequestBodyIsCapped(t *testing.T) {
	w := newWorld(t)
	h := HTTPHandler(w.srv, token)
	req := httptest.NewRequest("POST", "/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"`+strings.Repeat("a", 2<<20)+`"}}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code < 400 {
		t.Fatalf("a 2 MB request was accepted (%d)", rec.Code)
	}
}
