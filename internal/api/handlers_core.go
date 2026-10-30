package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/authn"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// ---- health and auth ----

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.d.Store.PingContext(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if s.d.OIDC == nil {
		writeError(w, http.StatusNotFound, "login is not enabled")
		return
	}
	s.d.OIDC.Login(w, r)
}

func (s *Server) callback(w http.ResponseWriter, r *http.Request) {
	if s.d.OIDC == nil {
		writeError(w, http.StatusNotFound, "login is not enabled")
		return
	}
	s.d.OIDC.Callback(w, r)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if s.d.Sessions != nil {
		s.d.Sessions.Clear(w, authn.Inspect(r, s.d.Config.TrustedProxy).Secure())
	}
	w.WriteHeader(http.StatusNoContent)
}

// me tells the UI who is logged in and gives it the CSRF token for state-changing requests.
func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	out := map[string]any{"auth_enabled": s.d.Config.AuthEnabled, "authenticated": false}
	if !s.d.Config.AuthEnabled {
		out["authenticated"] = true
		out["user"] = userFrom(r.Context())
	} else if sess := sessionFrom(r.Context()); sess != nil {
		out["authenticated"] = true
		out["user"] = sess.User
		out["csrf_token"] = sess.CSRF
	}
	writeJSON(w, http.StatusOK, out)
}

// ---- accounts ----

type billingRuleReq struct {
	Scope                    ledger.Scope `json:"scope"`
	BillDay                  int          `json:"bill_day"`
	MonthOffset              int          `json:"month_offset"`
	CutoffDay                *int         `json:"cutoff_day"`
	StandingOrderExtraCycles int          `json:"standing_order_extra_cycles"`
}

func (b billingRuleReq) rule() ledger.BillingRule {
	return ledger.BillingRule{Scope: b.Scope, BillDay: b.BillDay, MonthOffset: b.MonthOffset, CutoffDay: b.CutoffDay,
		StandingOrderExtraCycles: b.StandingOrderExtraCycles}
}

type accountReq struct {
	Name                string             `json:"name"`
	Type                ledger.AccountType `json:"type"`
	Institution         string             `json:"institution"`
	Owner               string             `json:"owner"`
	Last4               string             `json:"last4"`
	Currency            money.Currency     `json:"currency"`
	OpeningBalanceMinor int64              `json:"opening_balance_minor"`
	CreditLimitMinor    *int64             `json:"credit_limit_minor"`
	BillingRules        []billingRuleReq   `json:"billing_rules"`
}

type accountView struct {
	ledger.Account
	BillingRules []ledger.BillingRule `json:"billing_rules"`
}

func (s *Server) accountView(r *http.Request, a *ledger.Account) (accountView, error) {
	v := accountView{Account: *a, BillingRules: []ledger.BillingRule{}}
	if a.Type == ledger.CreditCard {
		rules, err := s.d.Ledger.BillingRules(r.Context(), a.ID)
		if err != nil {
			return v, err
		}
		v.BillingRules = list(rules)
	}
	return v, nil
}

func (s *Server) listAccounts(w http.ResponseWriter, r *http.Request) {
	accs, err := s.d.Ledger.ListAccounts(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	out := make([]accountView, 0, len(accs))
	for i := range accs {
		v, err := s.accountView(r, &accs[i])
		if err != nil {
			fail(w, r, err)
			return
		}
		out = append(out, v)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) getAccount(w http.ResponseWriter, r *http.Request) {
	a, err := s.d.Ledger.GetAccount(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, r, err)
		return
	}
	v, err := s.accountView(r, a)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) createAccount(w http.ResponseWriter, r *http.Request) {
	var in accountReq
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	a := &ledger.Account{Name: in.Name, Type: in.Type, Institution: in.Institution, Owner: in.Owner, Last4: in.Last4, Currency: in.Currency}
	if a.Currency == "" {
		a.Currency = money.ILS
	}
	a.OpeningBalance = money.New(in.OpeningBalanceMinor, a.Currency)
	if in.CreditLimitMinor != nil {
		m := money.New(*in.CreditLimitMinor, a.Currency)
		a.CreditLimit = &m
	}
	if len(in.BillingRules) > 0 && a.Type != ledger.CreditCard {
		fail(w, r, bad("billing rules apply to credit cards only"))
		return
	}
	if err := s.d.Ledger.CreateAccount(r.Context(), a); err != nil {
		fail(w, r, err)
		return
	}
	if len(in.BillingRules) > 0 {
		rules := make([]ledger.BillingRule, len(in.BillingRules))
		for i, br := range in.BillingRules {
			rules[i] = br.rule()
		}
		if err := s.d.Ledger.SetBillingRules(r.Context(), a.ID, rules); err != nil {
			_ = s.d.Ledger.DeleteAccount(r.Context(), a.ID) // do not leave a half-created account behind
			fail(w, r, err)
			return
		}
	}
	stored, err := s.d.Ledger.GetAccount(r.Context(), a.ID)
	if err != nil {
		fail(w, r, err)
		return
	}
	v, err := s.accountView(r, stored)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

type accountPatch struct {
	Name                *string         `json:"name"`
	Institution         *string         `json:"institution"`
	Owner               *string         `json:"owner"`
	Last4               *string         `json:"last4"`
	OpeningBalanceMinor *int64          `json:"opening_balance_minor"`
	CreditLimitMinor    *int64          `json:"credit_limit_minor"`
	ClearCreditLimit    bool            `json:"clear_credit_limit"`
	Currency            *money.Currency `json:"currency"`
}

func (s *Server) updateAccount(w http.ResponseWriter, r *http.Request) {
	var in accountPatch
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	a, err := s.d.Ledger.GetAccount(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, r, err)
		return
	}
	if in.Currency != nil {
		a.Currency = *in.Currency
		a.OpeningBalance = money.New(a.OpeningBalance.Minor(), a.Currency)
	}
	if in.Name != nil {
		a.Name = *in.Name
	}
	if in.Institution != nil {
		a.Institution = *in.Institution
	}
	if in.Owner != nil {
		a.Owner = *in.Owner
	}
	if in.Last4 != nil {
		a.Last4 = *in.Last4
	}
	if in.OpeningBalanceMinor != nil {
		a.OpeningBalance = money.New(*in.OpeningBalanceMinor, a.Currency)
	}
	if in.ClearCreditLimit {
		a.CreditLimit = nil
	} else if in.CreditLimitMinor != nil {
		m := money.New(*in.CreditLimitMinor, a.Currency)
		a.CreditLimit = &m
	}
	if err := s.d.Ledger.UpdateAccount(r.Context(), a); err != nil {
		fail(w, r, err)
		return
	}
	v, err := s.accountView(r, a)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) deleteAccount(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Ledger.DeleteAccount(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) setBillingRules(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Rules []billingRuleReq `json:"rules"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	rules := make([]ledger.BillingRule, len(in.Rules))
	for i, br := range in.Rules {
		rules[i] = br.rule()
	}
	id := r.PathValue("id")
	if err := s.d.Ledger.SetBillingRules(r.Context(), id, rules); err != nil {
		fail(w, r, err)
		return
	}
	changed, err := s.d.Billing.AssignBillDates(r.Context(), id)
	if err != nil {
		fail(w, r, err)
		return
	}
	got, err := s.d.Ledger.BillingRules(r.Context(), id)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rules": list(got), "bill_dates_recomputed": changed})
}

// ---- categories ----

type categoryReq struct {
	NameHE             string              `json:"name_he"`
	NameEN             string              `json:"name_en"`
	ParentID           *string             `json:"parent_id"`
	ColorHex           string              `json:"color_hex"`
	Icon               string              `json:"icon"`
	Type               ledger.CategoryType `json:"type"`
	MonthlyBudgetMinor *int64              `json:"monthly_budget_minor"`
	Description        string              `json:"description"`
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := s.d.Ledger.ListCategories(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	by := strings.ToUpper(r.URL.Query().Get("created_by"))
	if by != "" && by != "USER" && by != "LLM" {
		fail(w, r, bad("created_by must be USER or LLM"))
		return
	}
	out := []ledger.Category{}
	for _, c := range cats {
		if by == "" || string(c.CreatedBy) == by {
			out = append(out, c)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request) {
	var in categoryReq
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	c := &ledger.Category{NameHE: in.NameHE, NameEN: in.NameEN, ParentID: in.ParentID, ColorHex: in.ColorHex, Icon: in.Icon, Type: in.Type, Description: in.Description, CreatedBy: ledger.ByUser}
	if in.MonthlyBudgetMinor != nil {
		m := money.New(*in.MonthlyBudgetMinor, money.ILS)
		c.MonthlyBudget = &m
	}
	if err := s.d.Ledger.CreateCategory(r.Context(), c); err != nil {
		fail(w, r, err)
		return
	}
	got, err := s.d.Ledger.GetCategory(r.Context(), c.ID)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, got)
}

type categoryPatch struct {
	NameHE             *string              `json:"name_he"`
	NameEN             *string              `json:"name_en"`
	ParentID           *string              `json:"parent_id"`
	ClearParent        bool                 `json:"clear_parent"`
	ColorHex           *string              `json:"color_hex"`
	Icon               *string              `json:"icon"`
	Type               *ledger.CategoryType `json:"type"`
	MonthlyBudgetMinor *int64               `json:"monthly_budget_minor"`
	ClearBudget        bool                 `json:"clear_budget"`
	Description        *string              `json:"description"`
	Keep               bool                 `json:"keep"` // accept a model-created category as your own
}

func (s *Server) updateCategory(w http.ResponseWriter, r *http.Request) {
	var in categoryPatch
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	c, err := s.d.Ledger.GetCategory(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, r, err)
		return
	}
	if in.NameHE != nil {
		c.NameHE = *in.NameHE
	}
	if in.NameEN != nil {
		c.NameEN = *in.NameEN
	}
	if in.ColorHex != nil {
		c.ColorHex = *in.ColorHex
	}
	if in.Icon != nil {
		c.Icon = *in.Icon
	}
	if in.Description != nil {
		c.Description = *in.Description
	}
	if in.Type != nil {
		c.Type = *in.Type
	}
	if in.ClearParent {
		c.ParentID = nil
	} else if in.ParentID != nil {
		c.ParentID = in.ParentID
	}
	if in.ClearBudget {
		c.MonthlyBudget = nil
	} else if in.MonthlyBudgetMinor != nil {
		m := money.New(*in.MonthlyBudgetMinor, money.ILS)
		c.MonthlyBudget = &m
	}
	if err := s.d.Ledger.UpdateCategory(r.Context(), c); err != nil {
		fail(w, r, err)
		return
	}
	if in.Keep {
		if err := s.d.Ledger.SetCategoryCreator(r.Context(), c.ID, ledger.ByUser); err != nil {
			fail(w, r, err)
			return
		}
		c.CreatedBy = ledger.ByUser
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) deleteCategory(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Ledger.DeleteCategory(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) mergeCategory(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Into string `json:"into"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if in.Into == "" {
		fail(w, r, bad("into is required"))
		return
	}
	if err := s.d.Ledger.MergeCategories(r.Context(), r.PathValue("id"), in.Into); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- transactions ----

func (s *Server) listTransactions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, err := intParam(r, "limit", 50, 1, ledger.MaxPageSize)
	if err != nil {
		fail(w, r, err)
		return
	}
	offset, err := intParam(r, "offset", 0, 0, 1<<30)
	if err != nil {
		fail(w, r, err)
		return
	}
	review, err := boolParam(r, "needs_review")
	if err != nil {
		fail(w, r, err)
		return
	}
	f := ledger.TxFilter{AccountIDs: q["account_id"], Owner: q.Get("owner"), CategoryIDs: q["category_id"], DateFrom: q.Get("from"), DateTo: q.Get("to"),
		Search: q.Get("q"), NeedsReview: review, Limit: limit, Offset: offset}
	for _, k := range q["kind"] {
		f.Kinds = append(f.Kinds, ledger.TxKind(strings.ToUpper(k)))
	}
	items, total, err := s.d.Ledger.QueryTransactions(r.Context(), f)
	if err != nil {
		fail(w, r, err)
		return
	}
	out := map[string]any{"items": list(items), "total": total, "limit": limit, "offset": offset}
	if q.Get("totals") == "1" { // sums over every match, not just this page; off by default as most callers only need the page
		totals, err := s.d.Ledger.TransactionTotals(r.Context(), f)
		if err != nil {
			fail(w, r, err)
			return
		}
		out["totals"] = list(totals)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) getTransaction(w http.ResponseWriter, r *http.Request) {
	t, err := s.d.Ledger.GetTransaction(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) deleteTransaction(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Ledger.DeleteTransaction(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type txReq struct {
	AccountID   string  `json:"account_id"`
	Date        string  `json:"date"`
	AmountMinor int64   `json:"amount_minor"`
	Payee       string  `json:"payee"`
	Notes       *string `json:"notes"`
	CategoryID  *string `json:"category_id"`
}

// createTransaction adds a manual line, e.g. a cash purchase.
func (s *Server) createTransaction(w http.ResponseWriter, r *http.Request) {
	var in txReq
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	acc, err := s.d.Ledger.GetAccount(r.Context(), in.AccountID)
	if err != nil {
		fail(w, r, bad("unknown account"))
		return
	}
	if strings.TrimSpace(in.Payee) == "" {
		fail(w, r, bad("payee is required"))
		return
	}
	t := &ledger.Transaction{AccountID: acc.ID, Date: in.Date, Amount: money.New(in.AmountMinor, acc.Currency),
		PayeeRaw: strings.TrimSpace(in.Payee), Notes: in.Notes}
	if in.CategoryID != nil {
		t.CategoryID, t.CategorizedBy, t.IsReviewed = in.CategoryID, ledger.ByManual, true
	}
	if err := s.d.Ledger.InsertTransaction(r.Context(), t); err != nil {
		fail(w, r, err)
		return
	}
	got, err := s.d.Ledger.GetTransaction(r.Context(), t.ID)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, got)
}

func (s *Server) bulkUpdateTransactions(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs           []string `json:"ids"`
		CategoryID    *string  `json:"category_id"`
		ClearCategory bool     `json:"clear_category"`
		Reviewed      *bool    `json:"reviewed"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if len(in.IDs) == 0 || len(in.IDs) > ledger.MaxPageSize*10 {
		fail(w, r, bad("ids must list between 1 and %d transactions", ledger.MaxPageSize*10))
		return
	}
	n, err := s.d.Ledger.BulkUpdate(r.Context(), in.IDs, ledger.TxUpdate{CategoryID: in.CategoryID, ClearCategory: in.ClearCategory, Reviewed: in.Reviewed})
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": n})
}
