package billing

import (
	"context"
	"database/sql"
	"sort"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/money"
)

const hintsKey = "card_payment_hints"

// Hints returns the substrings that mark a bank line as a card payment (setting card_payment_hints,
// one per line). Matching is case-insensitive.
func (s *Service) Hints(ctx context.Context) ([]string, error) {
	var v string
	err := s.st.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, hintsKey).Scan(&v)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	var out []string
	for _, h := range strings.Split(v, "\n") {
		if h = strings.ToLower(strings.TrimSpace(h)); h != "" {
			out = append(out, h)
		}
	}
	return out, nil
}

// SetHints stores the card-payment hints.
func (s *Service) SetHints(ctx context.Context, hints []string) error {
	var clean []string
	for _, h := range hints {
		if h = strings.TrimSpace(h); h != "" {
			clean = append(clean, h)
		}
	}
	_, err := s.st.ExecContext(ctx, `INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`, hintsKey, strings.Join(clean, "\n"))
	return err
}

// Proposal is a suggested link between a bank debit and a statement. StatementID is empty when the
// statement is still derived from charges; Confirm creates it.
type Proposal struct {
	StatementID string
	AccountID   string
	AccountName string
	BillDate    string
	BankTxID    string
	BankDate    string
	BankPayee   string
	Amount      money.Money // what Confirm will settle
	DateGap     int         // days between the debit and the bill date
	AmountDiff  int64       // |debit - statement total| in minor units
	Exact       bool        // the amounts agree within the tolerance
}

type debit struct {
	id, date, payee string
	amount          int64 // positive
	currency        string
	hinted          bool
}

// Proposals suggests links for bank debits that settle nothing and statements that are unpaid. A pair
// qualifies when the dates are close and either the amounts agree or the payee matches a hint. Each
// debit and each statement is used at most once, best (closest date, then closest amount) first.
// Pairs the user unlinked are never proposed again. The result is deterministic, so re-running it
// without changes returns the same list.
func (s *Service) Proposals(ctx context.Context) ([]Proposal, error) {
	hints, err := s.Hints(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT t.id, t.date, t.payee_raw, -t.amount_minor, t.currency FROM transactions t
		JOIN accounts a ON a.id = t.account_id
		WHERE a.account_type = 'BANK' AND t.amount_minor < 0 AND t.kind <> 'EMPLOYER_COVERAGE'
		  AND NOT EXISTS (SELECT 1 FROM settlements x WHERE x.bank_transaction_id = t.id)
		  AND NOT EXISTS (SELECT 1 FROM external_payments e WHERE e.bank_transaction_id = t.id)
		ORDER BY t.date, t.id`)
	if err != nil {
		return nil, err
	}
	var debits []debit
	for rows.Next() {
		var d debit
		if err := rows.Scan(&d.id, &d.date, &d.payee, &d.amount, &d.currency); err != nil {
			rows.Close()
			return nil, err
		}
		low := strings.ToLower(d.payee)
		for _, h := range hints {
			if strings.Contains(low, h) {
				d.hinted = true
				break
			}
		}
		debits = append(debits, d)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	stmts, err := s.Statements(ctx, StatementFilter{})
	if err != nil {
		return nil, err
	}
	rejected := map[[2]string]bool{}
	rrows, err := s.st.QueryContext(ctx, `SELECT statement_id, bank_transaction_id FROM settlement_rejections`)
	if err != nil {
		return nil, err
	}
	for rrows.Next() {
		var k [2]string
		if err := rrows.Scan(&k[0], &k[1]); err != nil {
			rrows.Close()
			return nil, err
		}
		rejected[k] = true
	}
	rrows.Close()

	type cand struct {
		p   Proposal
		key string // statement identity
	}
	var cands []cand
	for _, st := range stmts {
		if len(st.Settlements) > 0 || st.Status == Upcoming || st.Expected.Minor() <= 0 {
			continue
		}
		bill, _ := time.Parse(dateLayout, st.BillDate)
		for _, d := range debits {
			if d.currency != string(st.Expected.Currency()) || rejected[[2]string{st.ID, d.id}] {
				continue
			}
			dd, _ := time.Parse(dateLayout, d.date)
			gap := int(dd.Sub(bill).Hours() / 24)
			if gap < 0 {
				gap = -gap
			}
			diff := d.amount - st.Expected.Minor()
			if diff < 0 {
				diff = -diff
			}
			exact := diff <= s.Tolerance
			if gap > s.MaxMatchDays || !(exact || d.hinted) {
				continue
			}
			cands = append(cands, cand{Proposal{
				StatementID: st.ID, AccountID: st.AccountID, AccountName: st.AccountName, BillDate: st.BillDate,
				BankTxID: d.id, BankDate: d.date, BankPayee: d.payee,
				Amount:  money.New(min(d.amount, st.Expected.Minor()), st.Expected.Currency()),
				DateGap: gap, AmountDiff: diff, Exact: exact,
			}, st.AccountID + "|" + st.BillDate})
		}
	}
	sort.SliceStable(cands, func(i, j int) bool {
		a, b := cands[i].p, cands[j].p
		switch {
		case a.Exact != b.Exact:
			return a.Exact
		case a.DateGap != b.DateGap:
			return a.DateGap < b.DateGap
		case a.AmountDiff != b.AmountDiff:
			return a.AmountDiff < b.AmountDiff
		case a.BillDate != b.BillDate:
			return a.BillDate < b.BillDate
		case a.AccountID != b.AccountID:
			return a.AccountID < b.AccountID
		}
		return a.BankTxID < b.BankTxID
	})
	usedDebit, usedStmt := map[string]bool{}, map[string]bool{}
	var out []Proposal
	for _, c := range cands {
		if usedDebit[c.p.BankTxID] || usedStmt[c.key] {
			continue
		}
		usedDebit[c.p.BankTxID], usedStmt[c.key] = true, true
		out = append(out, c.p)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].BillDate != out[j].BillDate {
			return out[i].BillDate < out[j].BillDate
		}
		return out[i].AccountName < out[j].AccountName
	})
	return out, nil
}

// Confirm turns a proposal into a settlement. It is safe to call with a proposal that has gone stale:
// the checks in Settle apply again.
func (s *Service) Confirm(ctx context.Context, p Proposal) (string, error) {
	sid := p.StatementID
	if sid == "" {
		var err error
		if sid, err = s.Materialize(ctx, p.AccountID, p.BillDate); err != nil {
			return "", err
		}
	}
	amt := p.Amount
	return s.Settle(ctx, sid, p.BankTxID, &amt, Auto)
}

// ConfirmAll confirms the exact proposals only (partial ones need a human) and returns how many settled.
func (s *Service) ConfirmAll(ctx context.Context) (int, error) {
	ps, err := s.Proposals(ctx)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, p := range ps {
		if !p.Exact {
			continue
		}
		if _, err := s.Confirm(ctx, p); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// CardPaymentCandidate is a bank debit that looks like a card payment (its payee matches a hint) but
// settles no statement and is not marked external.
type CardPaymentCandidate struct {
	TransactionID string
	AccountID     string
	Owner         string
	Date          string
	Payee         string
	Amount        money.Money // positive
	CategoryID    string
	// Counted: reports include it in spending (uncategorized or an expense category).
	// Hidden: reports exclude it because it sits in a transfer category, yet no statement backs that up.
	Counted, Hidden bool
	HasProposal     bool // auto-match has a statement for it
}

// UnlinkedCardPayments lists bank debits that look like card payments and are neither linked to a
// statement nor marked external. Each is either a payment for a card whose statements are not imported
// (its spending is invisible or lumped, depending on the category) or one that auto-match can still
// link. It returns nothing until card-payment hints are configured; the boolean says whether they are.
func (s *Service) UnlinkedCardPayments(ctx context.Context) ([]CardPaymentCandidate, bool, error) {
	hints, err := s.Hints(ctx)
	if err != nil || len(hints) == 0 {
		return nil, false, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT t.id, a.id, a.owner, t.date, t.payee_raw, -t.amount_minor, t.currency, COALESCE(t.category_id, ''), COALESCE(c.category_type, '')
		FROM transactions t JOIN accounts a ON a.id = t.account_id LEFT JOIN categories c ON c.id = t.category_id
		WHERE a.account_type = 'BANK' AND t.amount_minor < 0
		  AND NOT EXISTS (SELECT 1 FROM settlements x WHERE x.bank_transaction_id = t.id)
		  AND NOT EXISTS (SELECT 1 FROM external_payments e WHERE e.bank_transaction_id = t.id)
		ORDER BY t.date, t.id`)
	if err != nil {
		return nil, true, err
	}
	var out []CardPaymentCandidate
	for rows.Next() {
		var c CardPaymentCandidate
		var minor int64
		var cur, catType string
		if err := rows.Scan(&c.TransactionID, &c.AccountID, &c.Owner, &c.Date, &c.Payee, &minor, &cur, &c.CategoryID, &catType); err != nil {
			rows.Close()
			return nil, true, err
		}
		low := strings.ToLower(c.Payee)
		match := false
		for _, h := range hints {
			if strings.Contains(low, h) {
				match = true
				break
			}
		}
		if !match {
			continue
		}
		c.Amount = money.New(minor, money.Currency(cur))
		c.Hidden = catType == "TRANSFER"
		c.Counted = catType == "" || catType == "EXPENSE"
		out = append(out, c)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, true, err
	}
	ps, err := s.Proposals(ctx)
	if err != nil {
		return nil, true, err
	}
	proposed := map[string]bool{}
	for _, p := range ps {
		proposed[p.BankTxID] = true
	}
	for i := range out {
		out[i].HasProposal = proposed[out[i].TransactionID]
	}
	return out, true, nil
}
