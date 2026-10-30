package reports

import (
	"context"
	"time"

	"github.com/liorokman/finrep/internal/money"
)

// NetWorthPoint is the position at the end of one period.
type NetWorthPoint struct {
	Date        string
	Assets      money.Money // bank balances
	Liabilities money.Money // card charges not yet settled by a bank debit, billed or not
	NetWorth    money.Money
}

// NetWorth returns the position at each month end in the range (and at the end date itself when it
// falls mid-month). Assets are the accounts' opening balances plus their movements; liabilities are
// card charges net of employer coverage, less the settlements made by then. Account, owner and
// currency filters apply; category and measure do not (this is a balance, not a flow).
func (s *Service) NetWorth(ctx context.Context, f Filter) ([]NetWorthPoint, error) {
	if err := f.validate(); err != nil {
		return nil, err
	}
	cur := string(f.currency())
	to := f.To
	if to == "" {
		to = s.today()
	}
	from := f.From
	if from == "" {
		from = "2023-01-01"
	}
	acct := " AND a.currency = ?"
	args := []any{cur}
	if f.Owner != "" {
		acct += " AND a.owner = ?"
		args = append(args, f.Owner)
	}
	if len(f.AccountIDs) > 0 {
		acct += " AND a.id IN (" + placeholders(len(f.AccountIDs)) + ")"
		for _, id := range f.AccountIDs {
			args = append(args, id)
		}
	}
	openings := func(typ string) (int64, error) {
		var v int64
		err := s.st.QueryRowContext(ctx, `SELECT COALESCE(SUM(a.opening_balance_minor),0) FROM accounts a WHERE a.account_type = '`+typ+`'`+acct, args...).Scan(&v)
		return v, err
	}
	var out []NetWorthPoint
	for _, d := range pointDates(from, to) {
		bankOpen, err := openings("BANK")
		if err != nil {
			return nil, err
		}
		bankMoves, err := s.sumWithDate(ctx, `SELECT COALESCE(SUM(t.amount_minor),0) FROM transactions t JOIN accounts a ON a.id = t.account_id
			WHERE a.account_type = 'BANK' AND t.date <= ?`+acct, d, args)
		if err != nil {
			return nil, err
		}
		cardOpen, err := openings("CREDIT_CARD")
		if err != nil {
			return nil, err
		}
		cardMoves, err := s.sumWithDate(ctx, `SELECT COALESCE(SUM(t.amount_minor),0) FROM transactions t JOIN accounts a ON a.id = t.account_id
			WHERE a.account_type = 'CREDIT_CARD' AND t.date <= ?`+acct, d, args)
		if err != nil {
			return nil, err
		}
		paid, err := s.sumWithDate(ctx, `SELECT COALESCE(SUM(x.amount_minor),0) FROM settlements x
			JOIN statements st ON st.id = x.statement_id JOIN accounts a ON a.id = st.account_id
			JOIN transactions b ON b.id = x.bank_transaction_id
			WHERE b.date <= ?`+acct, d, args)
		if err != nil {
			return nil, err
		}
		assets := bankOpen + bankMoves
		liab := -(cardOpen + cardMoves) - paid
		out = append(out, NetWorthPoint{Date: d, Assets: money.New(assets, f.currency()),
			Liabilities: money.New(liab, f.currency()), NetWorth: money.New(assets-liab, f.currency())})
	}
	return out, nil
}

// sumWithDate runs a query whose first placeholder is the date, followed by the account filter args.
func (s *Service) sumWithDate(ctx context.Context, q, date string, args []any) (int64, error) {
	var v int64
	err := s.st.QueryRowContext(ctx, q, append([]any{date}, args...)...).Scan(&v)
	return v, err
}

// pointDates lists month ends from..to, then to itself when it is not a month end.
func pointDates(from, to string) []string {
	start, err1 := time.Parse("2006-01-02", from)
	end, err2 := time.Parse("2006-01-02", to)
	if err1 != nil || err2 != nil || start.After(end) {
		return nil
	}
	var out []string
	for m := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.UTC); ; m = m.AddDate(0, 1, 0) {
		last := m.AddDate(0, 1, -1)
		if last.After(end) {
			break
		}
		out = append(out, last.Format("2006-01-02"))
	}
	if len(out) == 0 || out[len(out)-1] != to {
		out = append(out, to)
	}
	return out
}
