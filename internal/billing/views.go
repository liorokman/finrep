package billing

import (
	"context"
	"sort"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// SpendRow is one card's spend in one month, counted two ways: by the month of purchase and by the
// month the bank is (or will be) charged. Gross counts purchases as made; Net subtracts what the
// employer covers, i.e. what comes out of the owner's pocket.
type SpendRow struct {
	AccountID, AccountName, Owner, Month string // Month is YYYY-MM
	PurchasedGross, PurchasedNet         money.Money
	BilledGross, BilledNet               money.Money
}

// SpendFilter narrows CardSpend. Months are YYYY-MM, inclusive.
type SpendFilter struct {
	Owner    string
	From, To string
}

// CardSpend powers the card overview: spend by purchase month and by bill month, per card.
func (s *Service) CardSpend(ctx context.Context, f SpendFilter) ([]SpendRow, error) {
	type key struct{ acc, month string }
	rowsByKey := map[key]*SpendRow{}
	collect := func(monthExpr, filterCol string, set func(r *SpendRow, gross, net int64, c money.Currency)) error {
		q := `SELECT a.id, a.name, a.owner, a.currency, substr(t.` + monthExpr + `, 1, 7) AS m,
				COALESCE(SUM(CASE WHEN t.kind <> 'EMPLOYER_COVERAGE' THEN -t.amount_minor ELSE 0 END), 0),
				COALESCE(SUM(-t.amount_minor), 0)
			FROM transactions t JOIN accounts a ON a.id = t.account_id
			WHERE a.account_type = 'CREDIT_CARD' AND t.` + filterCol + ` IS NOT NULL AND (? = '' OR a.owner = ?)
			  AND (? = '' OR substr(t.` + filterCol + `, 1, 7) >= ?) AND (? = '' OR substr(t.` + filterCol + `, 1, 7) <= ?)
			GROUP BY a.id, m`
		rows, err := s.st.QueryContext(ctx, q, f.Owner, f.Owner, f.From, f.From, f.To, f.To)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, name, owner, cur, m string
			var gross, net int64
			if err := rows.Scan(&id, &name, &owner, &cur, &m, &gross, &net); err != nil {
				return err
			}
			k := key{id, m}
			r := rowsByKey[k]
			if r == nil {
				z := money.New(0, money.Currency(cur))
				r = &SpendRow{AccountID: id, AccountName: name, Owner: owner, Month: m, PurchasedGross: z, PurchasedNet: z, BilledGross: z, BilledNet: z}
				rowsByKey[k] = r
			}
			set(r, gross, net, money.Currency(cur))
		}
		return rows.Err()
	}
	if err := collect("date", "date", func(r *SpendRow, g, n int64, c money.Currency) {
		r.PurchasedGross, r.PurchasedNet = money.New(g, c), money.New(n, c)
	}); err != nil {
		return nil, err
	}
	if err := collect("bill_date", "bill_date", func(r *SpendRow, g, n int64, c money.Currency) {
		r.BilledGross, r.BilledNet = money.New(g, c), money.New(n, c)
	}); err != nil {
		return nil, err
	}
	out := make([]SpendRow, 0, len(rowsByKey))
	for _, r := range rowsByKey {
		out = append(out, *r)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Month != out[j].Month {
			return out[i].Month < out[j].Month
		}
		return out[i].AccountName < out[j].AccountName
	})
	return out, nil
}

// OutflowDay is the amount the bank is expected to be debited on one day.
type OutflowDay struct {
	Date       string
	Total      money.Money
	Statements []Statement
}

// Upcoming lists days with card debits still to come (or due and unpaid), earliest first, up to a
// horizon date (inclusive; empty means no limit).
func (s *Service) Upcoming(ctx context.Context, owner, until string) ([]OutflowDay, error) {
	stmts, err := s.Statements(ctx, StatementFilter{Owner: owner, To: until, Statuses: []Status{Upcoming, Billed, Partial}})
	if err != nil {
		return nil, err
	}
	var out []OutflowDay
	for _, st := range stmts {
		rem := st.Remaining()
		if rem.IsZero() {
			continue
		}
		if n := len(out); n > 0 && out[n-1].Date == st.BillDate && out[n-1].Total.Currency() == rem.Currency() {
			out[n-1].Total, _ = out[n-1].Total.Add(rem)
			out[n-1].Statements = append(out[n-1].Statements, st)
			continue
		}
		out = append(out, OutflowDay{Date: st.BillDate, Total: rem, Statements: []Statement{st}})
	}
	return out, nil
}

// Flag marks something about a statement the user should look at.
type Flag struct {
	StatementID string
	AccountName string
	BillDate    string
	Kind        string // DEBIT_DATE or RULE_MISMATCH
	Detail      string
}

// Review compares reality with the rules (spec 6.2, rule 5): a settled statement whose debit fell on a
// different day than its bill date, and a statement whose ordinary charges would not have been billed
// on its date under the card's rules. Either suggests a rule needs attention.
func (s *Service) Review(ctx context.Context) ([]Flag, error) {
	stmts, err := s.Statements(ctx, StatementFilter{})
	if err != nil {
		return nil, err
	}
	var flags []Flag
	rulesCache := map[string][]ledger.BillingRule{}
	for _, st := range stmts {
		if st.ID == "" {
			continue
		}
		for _, se := range st.Settlements {
			if se.BankDate != st.BillDate {
				flags = append(flags, Flag{st.ID, st.AccountName, st.BillDate, "DEBIT_DATE",
					"bank debit on " + se.BankDate + " but the statement is dated " + st.BillDate})
			}
		}
		rules, ok := rulesCache[st.AccountID]
		if !ok {
			if rules, err = s.l.BillingRules(ctx, st.AccountID); err != nil {
				return nil, err
			}
			rulesCache[st.AccountID] = rules
		}
		if len(rules) == 0 {
			continue
		}
		rows, err := s.st.QueryContext(ctx, `SELECT date, scope FROM transactions
			WHERE statement_id = ? AND kind = 'PURCHASE' AND is_standing_order = 0`, st.ID)
		if err != nil {
			return nil, err
		}
		bad, example := 0, ""
		for rows.Next() {
			var date, scope string
			if err := rows.Scan(&date, &scope); err != nil {
				rows.Close()
				return nil, err
			}
			rule := PickRule(rules, ledger.Scope(scope))
			if rule == nil {
				continue
			}
			if got, err := ComputeBillDate(*rule, date, false); err == nil && got != st.BillDate {
				if bad == 0 {
					example = date + " (" + scope + ") would bill on " + got + " under the card's rule"
				}
				bad++
			}
		}
		rows.Close()
		if bad > 0 {
			flags = append(flags, Flag{st.ID, st.AccountName, st.BillDate, "RULE_MISMATCH", example})
		}
	}
	return flags, nil
}
