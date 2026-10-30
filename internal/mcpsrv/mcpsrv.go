// Package mcpsrv exposes the ledger to AI agents over the Model Context Protocol: eight read-only
// tools, served over stdio (a local process) or Streamable HTTP under /mcp (static bearer token).
package mcpsrv

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/jsonx"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/reports"
)

// Deps are the services the tools read from. None of them is ever written to.
type Deps struct {
	Ledger  *ledger.Ledger
	Billing *billing.Service
	Reports *reports.Service
	Now     func() time.Time
}

const (
	defaultTxLimit = 50
	maxTxLimit     = 100
	maxListLimit   = 200
)

// New builds the MCP server with its tools.
func New(d Deps) *server.MCPServer {
	if d.Now == nil {
		d.Now = time.Now
	}
	s := server.NewMCPServer("finrep", "2.0.0", server.WithToolCapabilities(false),
		server.WithInstructions("Read-only access to a personal finance ledger (amounts are {minor, currency, display}; minor units are agorot/cents; "+
			"negative means money out). Dates are YYYY-MM-DD and no data exists before 2023. Spending reports default to gross "+
			"(what was bought); pass measure=OUT_OF_POCKET for what the owner actually paid after employer coverage."))
	h := &tools{d}
	for _, t := range []struct {
		tool    mcp.Tool
		handler server.ToolHandlerFunc
	}{
		{mcp.NewTool("list_accounts", mcp.WithDescription("List bank accounts and credit cards with owner, currency and current balance (for a card: the negative amount still owed)."),
			mcp.WithReadOnlyHintAnnotation(true)), h.listAccounts},
		{mcp.NewTool("get_account_summary", mcp.WithDescription("Summarize one account: details, balance, billing rules for a card, transaction count and date range, and the last six months of income and spending."),
			mcp.WithReadOnlyHintAnnotation(true), mcp.WithString("account_id", mcp.Required(), mcp.Description("Account id from list_accounts"))), h.accountSummary},
		{mcp.NewTool("query_transactions", mcp.WithDescription("Search transactions. Newest first. Use offset to page."),
			mcp.WithReadOnlyHintAnnotation(true),
			mcp.WithString("search", mcp.Description("Text in the payee or notes")),
			mcp.WithString("account_id", mcp.Description("Only this account")),
			mcp.WithString("category_id", mcp.Description("Only this category id, or \"uncategorized\"")),
			mcp.WithString("from", mcp.Description("First date, YYYY-MM-DD")),
			mcp.WithString("to", mcp.Description("Last date, YYYY-MM-DD")),
			mcp.WithBoolean("needs_review", mcp.Description("Only lines the user has not confirmed yet")),
			mcp.WithNumber("limit", mcp.Description("Lines to return, 1-100 (default 50)")),
			mcp.WithNumber("offset", mcp.Description("Lines to skip"))), h.queryTransactions},
		{reportTool("get_net_worth_trend", "Net worth at each month end: bank balances minus card charges not yet paid by a bank debit.", false), h.netWorth},
		{reportTool("get_category_breakdown", "Spending by category with shares of the total, largest first.", true), h.breakdown},
		{reportTool("get_summary", "The period at a glance: income, spending and net, what is typical per month and per day, the highest and lowest months, the largest purchases, the top categories and how it compares with the period before.", true), h.summary},
		{reportTool("get_cash_flow", "Income, spending, net and savings rate for each month.", true), h.cashFlow},
		{reportTool("get_recurring", "Payments that repeat weekly, monthly, quarterly or yearly, with typical amount, monthly cost and the next expected date.", true), h.recurring},
		{mcp.NewTool("get_statements", mcp.WithDescription("Credit card statements (what is billed on one date for one card) with the bank debits that paid them, plus the upcoming bank outflow by day."),
			mcp.WithReadOnlyHintAnnotation(true),
			mcp.WithString("owner", mcp.Description("Card owner, e.g. a family member's name")),
			mcp.WithString("account_id", mcp.Description("Only this card")),
			mcp.WithString("status", mcp.Description("UPCOMING, BILLED, PARTIAL or PAID"), mcp.Enum("UPCOMING", "BILLED", "PARTIAL", "PAID")),
			mcp.WithString("from", mcp.Description("First bill date")), mcp.WithString("to", mcp.Description("Last bill date"))), h.statements},
	} {
		s.AddTool(t.tool, t.handler)
	}
	return s
}

// reportTool declares a report tool with the shared filter parameters.
func reportTool(name, desc string, spending bool) mcp.Tool {
	opts := []mcp.ToolOption{mcp.WithDescription(desc), mcp.WithReadOnlyHintAnnotation(true),
		mcp.WithString("from", mcp.Description("First date, YYYY-MM-DD")),
		mcp.WithString("to", mcp.Description("Last date, YYYY-MM-DD (default today for net worth)")),
		mcp.WithString("owner", mcp.Description("Only this owner's accounts")),
		mcp.WithString("account_id", mcp.Description("Only this account"))}
	if spending {
		opts = append(opts,
			mcp.WithString("measure", mcp.Description("GROSS (as bought) or OUT_OF_POCKET (after employer coverage)"), mcp.Enum("GROSS", "OUT_OF_POCKET")),
			mcp.WithString("basis", mcp.Description("PURCHASE date or BILL date for card charges"), mcp.Enum("PURCHASE", "BILL")),
			mcp.WithString("category_id", mcp.Description("Only this category id, or \"uncategorized\"")))
	}
	if name == "get_recurring" {
		opts = append(opts, mcp.WithNumber("limit", mcp.Description("Entries to return, 1-200 (default 50)")))
	}
	return mcp.NewTool(name, opts...)
}

type tools struct{ d Deps }

// reply renders a value as the tool's JSON text.
func reply(v any) (*mcp.CallToolResult, error) {
	b, err := jsonx.Marshal(v)
	if err != nil {
		slog.Error("mcp: encode result", "error", err)
		return mcp.NewToolResultError("internal error"), nil
	}
	return mcp.NewToolResultText(string(b)), nil
}

// failure turns an error into a tool error. Validation problems are shown to the agent so it can
// correct its call; anything else is logged and reported generically.
func failure(tool string, err error) (*mcp.CallToolResult, error) {
	switch {
	case errors.Is(err, ledger.ErrNotFound):
		return mcp.NewToolResultError("not found"), nil
	case errors.Is(err, ledger.ErrInvalid):
		msg := strings.TrimPrefix(err.Error(), ledger.ErrInvalid.Error()+": ")
		return mcp.NewToolResultError(msg), nil
	}
	slog.Error("mcp tool failed", "tool", tool, "error", err)
	return mcp.NewToolResultError("internal error"), nil
}

func bad(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ledger.ErrInvalid, fmt.Sprintf(format, a...))
}

// intArg reads an optional whole-number argument within bounds.
func intArg(r mcp.CallToolRequest, name string, def, lo, hi int) (int, error) {
	if _, ok := r.GetArguments()[name]; !ok {
		return def, nil
	}
	f := r.GetFloat(name, float64(def))
	if f != float64(int(f)) || int(f) < lo || int(f) > hi {
		return 0, bad("%s must be a whole number between %d and %d", name, lo, hi)
	}
	return int(f), nil
}

func filterArgs(r mcp.CallToolRequest) reports.Filter {
	f := reports.Filter{
		Owner: r.GetString("owner", ""), From: r.GetString("from", ""), To: r.GetString("to", ""),
		Basis:   reports.Basis(strings.ToUpper(r.GetString("basis", ""))),
		Measure: reports.Measure(strings.ToUpper(r.GetString("measure", ""))),
	}
	if id := r.GetString("account_id", ""); id != "" {
		f.AccountIDs = []string{id}
	}
	if id := r.GetString("category_id", ""); id != "" {
		f.CategoryIDs = []string{id}
	}
	return f
}

// ---- tools ----

type accountOut struct {
	ledger.Account
	Balance money.Money `json:"balance"`
}

func (t *tools) balance(ctx context.Context, a ledger.Account) (money.Money, error) {
	today := t.d.Now().Format("2006-01-02")
	pts, err := t.d.Reports.NetWorth(ctx, reports.Filter{AccountIDs: []string{a.ID}, From: today, To: today, Currency: a.Currency})
	if err != nil || len(pts) == 0 {
		return money.Money{}, err
	}
	p := pts[len(pts)-1]
	if a.Type == ledger.CreditCard {
		return p.Liabilities.Neg(), nil
	}
	return p.Assets, nil
}

func (t *tools) listAccounts(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	accs, err := t.d.Ledger.ListAccounts(ctx)
	if err != nil {
		return failure("list_accounts", err)
	}
	out := make([]accountOut, 0, len(accs))
	for _, a := range accs {
		b, err := t.balance(ctx, a)
		if err != nil {
			return failure("list_accounts", err)
		}
		out = append(out, accountOut{a, b})
	}
	return reply(map[string]any{"accounts": out})
}

func (t *tools) accountSummary(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	id := r.GetString("account_id", "")
	if id == "" {
		return failure("get_account_summary", bad("account_id is required"))
	}
	a, err := t.d.Ledger.GetAccount(ctx, id)
	if err != nil {
		return failure("get_account_summary", err)
	}
	bal, err := t.balance(ctx, *a)
	if err != nil {
		return failure("get_account_summary", err)
	}
	out := map[string]any{"account": accountOut{*a, bal}}
	if a.Type == ledger.CreditCard {
		rules, err := t.d.Ledger.BillingRules(ctx, a.ID)
		if err != nil {
			return failure("get_account_summary", err)
		}
		out["billing_rules"] = rules
	}
	all, total, err := t.d.Ledger.QueryTransactions(ctx, ledger.TxFilter{AccountIDs: []string{id}, Limit: 1})
	if err != nil {
		return failure("get_account_summary", err)
	}
	out["transaction_count"] = total
	if len(all) > 0 {
		out["latest_transaction_date"] = all[0].Date
		oldest, _, err := t.d.Ledger.QueryTransactions(ctx, ledger.TxFilter{AccountIDs: []string{id}, Limit: 1, Offset: max(total-1, 0)})
		if err == nil && len(oldest) > 0 {
			out["earliest_transaction_date"] = oldest[0].Date
		}
	}
	now := t.d.Now()
	cf, err := t.d.Reports.CashFlow(ctx, reports.Filter{AccountIDs: []string{id}, Currency: a.Currency,
		From: now.AddDate(0, -5, 0).Format("2006-01") + "-01", To: now.Format("2006-01-02")})
	if err != nil {
		return failure("get_account_summary", err)
	}
	out["recent_months"] = cf
	return reply(out)
}

func (t *tools) queryTransactions(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	limit, err := intArg(r, "limit", defaultTxLimit, 1, maxTxLimit)
	if err != nil {
		return failure("query_transactions", err)
	}
	offset, err := intArg(r, "offset", 0, 0, 1<<30)
	if err != nil {
		return failure("query_transactions", err)
	}
	f := ledger.TxFilter{Search: r.GetString("search", ""), DateFrom: r.GetString("from", ""), DateTo: r.GetString("to", ""),
		NeedsReview: r.GetBool("needs_review", false), Limit: limit, Offset: offset}
	if id := r.GetString("account_id", ""); id != "" {
		f.AccountIDs = []string{id}
	}
	if id := r.GetString("category_id", ""); id != "" {
		f.CategoryIDs = []string{id}
	}
	txs, total, err := t.d.Ledger.QueryTransactions(ctx, f)
	if err != nil {
		return failure("query_transactions", err)
	}
	return reply(map[string]any{"total": total, "limit": limit, "offset": offset, "transactions": txs})
}

func (t *tools) netWorth(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pts, err := t.d.Reports.NetWorth(ctx, filterArgs(r))
	if err != nil {
		return failure("get_net_worth_trend", err)
	}
	return reply(map[string]any{"points": pts})
}

func (t *tools) breakdown(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	rows, total, err := t.d.Reports.CategoryBreakdown(ctx, filterArgs(r))
	if err != nil {
		return failure("get_category_breakdown", err)
	}
	return reply(map[string]any{"total": total, "categories": rows})
}

func (t *tools) summary(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	sum, err := t.d.Reports.Summary(ctx, filterArgs(r))
	if err != nil {
		return failure("get_summary", err)
	}
	return reply(sum)
}

func (t *tools) cashFlow(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	rows, err := t.d.Reports.CashFlow(ctx, filterArgs(r))
	if err != nil {
		return failure("get_cash_flow", err)
	}
	return reply(map[string]any{"months": rows})
}

func (t *tools) recurring(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	limit, err := intArg(r, "limit", 50, 1, maxListLimit)
	if err != nil {
		return failure("get_recurring", err)
	}
	rows, err := t.d.Reports.Recurring(ctx, filterArgs(r))
	if err != nil {
		return failure("get_recurring", err)
	}
	more := len(rows) > limit
	if more {
		rows = rows[:limit]
	}
	return reply(map[string]any{"recurring": rows, "truncated": more})
}

func (t *tools) statements(ctx context.Context, r mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	f := billing.StatementFilter{Owner: r.GetString("owner", ""), From: r.GetString("from", ""), To: r.GetString("to", "")}
	if id := r.GetString("account_id", ""); id != "" {
		f.AccountIDs = []string{id}
	}
	if st := strings.ToUpper(r.GetString("status", "")); st != "" {
		switch billing.Status(st) {
		case billing.Upcoming, billing.Billed, billing.Partial, billing.Paid:
			f.Statuses = []billing.Status{billing.Status(st)}
		default:
			return failure("get_statements", bad("status must be UPCOMING, BILLED, PARTIAL or PAID"))
		}
	}
	stmts, err := t.d.Billing.Statements(ctx, f)
	if err != nil {
		return failure("get_statements", err)
	}
	days, err := t.d.Billing.Upcoming(ctx, f.Owner, "")
	if err != nil {
		return failure("get_statements", err)
	}
	return reply(map[string]any{"statements": stmts, "upcoming_outflow": days})
}

// ---- transports ----

// HTTPHandler serves Streamable HTTP, protected by a static bearer token. Stateless mode means a
// restart never strands an agent with a dead session. An empty token yields a handler that answers
// 404, so the endpoint does not exist unless it is configured.
func HTTPHandler(s *server.MCPServer, token string) http.Handler {
	if token == "" {
		return http.NotFoundHandler()
	}
	mcpHandler := server.NewStreamableHTTPServer(s, server.WithStateLess(true), server.WithEndpointPath("/mcp"))
	want := sha256.Sum256([]byte(token))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		scheme, cred, _ := strings.Cut(r.Header.Get("Authorization"), " ")
		got := sha256.Sum256([]byte(strings.TrimSpace(cred)))
		// Hashing first makes the comparison length-independent as well as constant-time.
		if !strings.EqualFold(scheme, "Bearer") || subtle.ConstantTimeCompare(got[:], want[:]) != 1 {
			w.Header().Set("WWW-Authenticate", `Bearer realm="finrep"`)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		mcpHandler.ServeHTTP(w, r)
	})
}

// ServeStdio serves the protocol on stdin/stdout until the context ends or stdin closes. Nothing else
// may write to stdout, or the protocol breaks.
func ServeStdio(ctx context.Context, s *server.MCPServer) error {
	return server.NewStdioServer(s).Listen(ctx, stdin(), stdout())
}
