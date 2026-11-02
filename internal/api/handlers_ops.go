package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/llm"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/reports"
)

// ---- categorization ----

func (s *Server) startCategorization(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.d.Settings.LLM(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	if !cfg.Configured() {
		fail(w, r, conflict("set the LLM endpoint and both model names in Settings first"))
		return
	}
	c := llm.New(cfg.BaseURL, cfg.APIKey)
	opts := categorize.Options{
		Generator: c, ClassifierModel: cfg.Classifier, GeneratorModel: cfg.Generator,
		Threshold: cfg.Threshold, BatchSize: cfg.BatchSize, CardPaymentHints: s.d.Billing.Hints,
	}
	if cfg.ClassifierAPI == "decision" {
		opts.Decider = c
	} else {
		opts.Classifier = c
	}
	s.d.Categorize.Configure(opts)
	id, err := s.d.Categorize.Start(r.Context())
	if errors.Is(err, categorize.ErrNothingToDo) {
		writeJSON(w, http.StatusOK, map[string]any{"started": false, "reason": err.Error()})
		return
	}
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"started": true, "id": id})
}

func (s *Server) cancelCategorization(w http.ResponseWriter, r *http.Request) {
	s.d.Categorize.Cancel()
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listRuns(w http.ResponseWriter, r *http.Request) {
	runs, err := s.d.Categorize.ListRuns(r.Context(), 50)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(runs)})
}

func (s *Server) getRun(w http.ResponseWriter, r *http.Request) {
	run, err := s.d.Categorize.GetRun(r.Context(), r.PathValue("id"))
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, run)
}

func (s *Server) undoRun(w http.ResponseWriter, r *http.Request) {
	n, err := s.d.Categorize.Undo(r.Context(), r.PathValue("id"))
	if err != nil {
		if !errors.Is(err, categorize.ErrBusy) && !errors.Is(err, categorize.ErrNotFound) {
			err = bad("%s", err.Error())
		}
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reverted": n})
}

// ---- statements and settlements ----

func (s *Server) listStatements(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := billing.StatementFilter{Owner: q.Get("owner"), AccountIDs: q["account_id"], From: q.Get("from"), To: q.Get("to")}
	for _, st := range q["status"] {
		switch billing.Status(strings.ToUpper(st)) {
		case billing.Upcoming, billing.Billed, billing.Partial, billing.Paid:
			f.Statuses = append(f.Statuses, billing.Status(strings.ToUpper(st)))
		default:
			fail(w, r, bad("unknown status %q", st))
			return
		}
	}
	out, err := s.d.Billing.Statements(r.Context(), f)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(out)})
}

// statementRef identifies a statement either by id or, for one derived from charges, by card and date.
type statementRef struct {
	StatementID string `json:"statement_id"`
	AccountID   string `json:"account_id"`
	BillDate    string `json:"bill_date"`
}

func (s *Server) resolveStatement(ctx context.Context, ref statementRef) (string, error) {
	if ref.StatementID != "" {
		return ref.StatementID, nil
	}
	if ref.AccountID == "" || ref.BillDate == "" {
		return "", bad("give statement_id, or account_id and bill_date")
	}
	return s.d.Billing.Materialize(ctx, ref.AccountID, ref.BillDate)
}

func (s *Server) amountFor(ctx context.Context, bankTxID string, minor *int64) (*money.Money, error) {
	if minor == nil {
		return nil, nil
	}
	tx, err := s.d.Ledger.GetTransaction(ctx, bankTxID)
	if err != nil {
		return nil, err
	}
	m := money.New(*minor, tx.Amount.Currency())
	return &m, nil
}

func (s *Server) createSettlement(w http.ResponseWriter, r *http.Request) {
	var in struct {
		statementRef
		BankTransactionID string `json:"bank_transaction_id"`
		AmountMinor       *int64 `json:"amount_minor"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if in.BankTransactionID == "" {
		fail(w, r, bad("bank_transaction_id is required"))
		return
	}
	amt, err := s.amountFor(r.Context(), in.BankTransactionID, in.AmountMinor)
	if err != nil {
		fail(w, r, err)
		return
	}
	sid, err := s.resolveStatement(r.Context(), in.statementRef)
	if err != nil {
		fail(w, r, err)
		return
	}
	id, err := s.d.Billing.Settle(r.Context(), sid, in.BankTransactionID, amt, billing.Manual)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "statement_id": sid})
}

func (s *Server) deleteSettlement(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Billing.Unsettle(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listProposals(w http.ResponseWriter, r *http.Request) {
	ps, err := s.d.Billing.Proposals(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(ps)})
}

// confirmProposal settles one proposal. It must still be among the current proposals, so a stale or
// invented pairing cannot be pushed through the auto-match path.
func (s *Server) confirmProposal(w http.ResponseWriter, r *http.Request) {
	var in struct {
		statementRef
		BankTransactionID string `json:"bank_transaction_id"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	ps, err := s.d.Billing.Proposals(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	for _, p := range ps {
		same := p.BankTxID == in.BankTransactionID &&
			(in.StatementID != "" && p.StatementID == in.StatementID || in.StatementID == "" && p.AccountID == in.AccountID && p.BillDate == in.BillDate)
		if !same {
			continue
		}
		id, err := s.d.Billing.Confirm(r.Context(), p)
		if err != nil {
			fail(w, r, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"id": id})
		return
	}
	fail(w, r, &apiError{http.StatusNotFound, "that proposal no longer applies"})
}

func (s *Server) confirmAllProposals(w http.ResponseWriter, r *http.Request) {
	n, err := s.d.Billing.ConfirmAll(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"confirmed": n})
}

// linkActivity links a bank debit to a card whose statement is not available, through a placeholder
// "activity" charge that a later import of the statement replaces.
func (s *Server) linkActivity(w http.ResponseWriter, r *http.Request) {
	var in struct {
		BankTransactionID string `json:"bank_transaction_id"`
		AccountID         string `json:"account_id"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if in.BankTransactionID == "" || in.AccountID == "" {
		fail(w, r, bad("bank_transaction_id and account_id are required"))
		return
	}
	sid, err := s.d.Billing.LinkActivity(r.Context(), in.BankTransactionID, in.AccountID)
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"statement_id": sid})
}

func (s *Server) markExternal(w http.ResponseWriter, r *http.Request) {
	var in struct {
		BankTransactionID string `json:"bank_transaction_id"`
		Note              string `json:"note"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if len(in.Note) > 500 {
		fail(w, r, bad("note is longer than 500 characters"))
		return
	}
	if err := s.d.Billing.MarkExternal(r.Context(), in.BankTransactionID, in.Note); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) unmarkExternal(w http.ResponseWriter, r *http.Request) {
	if err := s.d.Billing.UnmarkExternal(r.Context(), r.PathValue("id")); err != nil {
		fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) billingReview(w http.ResponseWriter, r *http.Request) {
	flags, err := s.d.Billing.Review(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(flags)})
}

func (s *Server) upcoming(w http.ResponseWriter, r *http.Request) {
	days, err := s.d.Billing.Upcoming(r.Context(), r.URL.Query().Get("owner"), r.URL.Query().Get("until"))
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(days)})
}

func (s *Server) cardSpend(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	rows, err := s.d.Billing.CardSpend(r.Context(), billing.SpendFilter{Owner: q.Get("owner"), From: q.Get("from"), To: q.Get("to")})
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": list(rows)})
}

// ---- reports ----

func filterFromQuery(r *http.Request) reports.Filter {
	q := r.URL.Query()
	return reports.Filter{AccountIDs: q["account_id"], Owner: q.Get("owner"), CategoryIDs: q["category_id"], From: q.Get("from"), To: q.Get("to"),
		Basis: reports.Basis(strings.ToUpper(q.Get("basis"))), Measure: reports.Measure(strings.ToUpper(q.Get("measure"))),
		Currency: money.Currency(strings.ToUpper(q.Get("currency"))),
		Compare:  strings.ToLower(q.Get("compare")), CompareFrom: q.Get("compare_from"), CompareTo: q.Get("compare_to")}
}

type reportFn func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error)

func items[T any](xs []T, err error) (any, error) {
	if err != nil {
		return nil, err
	}
	return map[string]any{"items": list(xs)}, nil
}

var reportTable = map[string]reportFn{
	"net-worth": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return items(rs.NetWorth(ctx, f))
	},
	"summary": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.Summary(ctx, f)
	},
	"cash-flow": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return items(rs.CashFlow(ctx, f))
	},
	"category-breakdown": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		rows, total, err := rs.CategoryBreakdown(ctx, f)
		if err != nil {
			return nil, err
		}
		return map[string]any{"items": list(rows), "total": total}, nil
	},
	"sankey": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.Sankey(ctx, f)
	},
	"budget": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return items(rs.BudgetVsActual(ctx, f))
	},
	"recurring": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return items(rs.Recurring(ctx, f))
	},
	"heatmap": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.Heatmap(ctx, f)
	},
	"installments": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.InstallmentForecast(ctx, f)
	},
	"foreign": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.ForeignPurchases(ctx, f)
	},
	"anomalies": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return items(rs.Anomalies(ctx, f))
	},
	"warnings": func(ctx context.Context, rs *reports.Service, f reports.Filter) (any, error) {
		return rs.Warnings(ctx, f)
	},
}

func (s *Server) report(w http.ResponseWriter, r *http.Request) {
	fn, ok := reportTable[r.PathValue("name")]
	if !ok {
		fail(w, r, &apiError{http.StatusNotFound, "no such report"})
		return
	}
	out, err := fn(r.Context(), s.d.Reports, filterFromQuery(r))
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

// ---- settings ----

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	items, err := s.d.Settings.List(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) putSettings(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Values map[string]string `json:"values"`
	}
	if err := readJSON(w, r, &in); err != nil {
		fail(w, r, err)
		return
	}
	if len(in.Values) == 0 {
		fail(w, r, bad("values is empty"))
		return
	}
	if err := s.d.Settings.Update(r.Context(), in.Values); err != nil {
		fail(w, r, err)
		return
	}
	s.getSettings(w, r)
}

// testLLM sends one tiny request using only the stored settings; the browser never supplies a URL.
func (s *Server) testLLM(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.d.Settings.LLM(r.Context())
	if err != nil {
		fail(w, r, err)
		return
	}
	if !cfg.Configured() {
		fail(w, r, conflict("set the LLM endpoint and both model names first"))
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	c := llm.New(cfg.BaseURL, cfg.APIKey)
	result := map[string]any{}
	for name, model := range map[string]string{"classifier": cfg.Classifier, "generator": cfg.Generator} {
		var err error
		if name == "classifier" && cfg.ClassifierAPI == "decision" {
			_, _, err = c.Choose(ctx, model, "Netflix monthly payment", "Which category fits?", map[string]string{"c0": "Subscriptions", "c1": "Groceries"})
		} else {
			_, err = c.Chat(ctx, model, `Reply with the JSON object {"ok":true}.`, "ping")
		}
		if err != nil {
			result[name] = map[string]any{"ok": false, "error": truncate(err.Error(), 300)}
		} else {
			result[name] = map[string]any{"ok": true}
		}
	}
	writeJSON(w, http.StatusOK, result)
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
