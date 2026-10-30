package ledger

import (
	"context"

	"github.com/liorokman/finrep/internal/money"
)

// TxTotals sums every transaction a filter matches (not just one page), for one currency. Spending and
// income are counted the way the reports count them, out of pocket: a transfer, a bank debit that settles a
// card statement and an employer-coverage line are not spending or income, because the purchases they pay
// for are counted instead. They are summed apart so nothing seems to go missing.
type TxTotals struct {
	Currency         money.Currency
	Count            int         // every matching line
	Spending         money.Money // what you spent
	Income           money.Money // what you received
	Net              money.Money // income minus spending
	NotCounted       int         // lines that are neither (transfers, settled card payments, coverage)
	NotCountedAmount money.Money // their signed sum
	Sum              money.Money // the signed sum of every matching line's amount
	SpendingLines    int         // lines that count as spending
}

// TransactionTotals totals all transactions matching f (its paging is ignored), one entry per currency.
func (l *Ledger) TransactionTotals(ctx context.Context, f TxFilter) ([]TxTotals, error) {
	where, args, err := f.where()
	if err != nil {
		return nil, err
	}
	rows, err := l.st.QueryContext(ctx, `SELECT v.currency, v.flow, COUNT(*), COALESCE(SUM(v.oop_value), 0), COALESCE(SUM(v.amount_minor), 0)
		FROM ledger_view v JOIN transactions t ON t.id = v.id`+where+` GROUP BY 1, 2 ORDER BY 1`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type acc struct {
		count, spendLines, notCounted     int
		spend, income, notCountedSum, sum int64
	}
	byCur := map[string]*acc{}
	var order []string
	for rows.Next() {
		var cur, flow string
		var n int
		var value, amount int64
		if err := rows.Scan(&cur, &flow, &n, &value, &amount); err != nil {
			return nil, err
		}
		a := byCur[cur]
		if a == nil {
			a = &acc{}
			byCur[cur] = a
			order = append(order, cur)
		}
		a.count += n
		a.sum += amount
		switch flow {
		case "SPEND":
			a.spend += value
			a.spendLines += n
		case "INCOME":
			a.income += value
		default:
			a.notCounted += n
			a.notCountedSum += amount
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]TxTotals, 0, len(order))
	for _, cur := range order {
		a, c := byCur[cur], money.Currency(cur)
		out = append(out, TxTotals{Currency: c, Count: a.count, Spending: money.New(a.spend, c), Income: money.New(a.income, c),
			Net: money.New(a.income-a.spend, c), NotCounted: a.notCounted, NotCountedAmount: money.New(a.notCountedSum, c),
			Sum: money.New(a.sum, c), SpendingLines: a.spendLines})
	}
	return out, nil
}
