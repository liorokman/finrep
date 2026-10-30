package reports

import (
	"context"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/money"
)

// daysPerMonth turns a period of any length into "per month" figures.
const daysPerMonth = 30.4375

// MonthAmount is one month's spending.
type MonthAmount struct {
	Month  string
	Amount money.Money
}

// BigPurchase is one of the largest single charges in the period.
type BigPurchase struct {
	TransactionID string
	Date          string
	Payee         string
	Amount        money.Money
	CategoryID    string
	CategoryName  string
}

// TopCategory is a category's share of the period's spending.
type TopCategory struct {
	CategoryID string
	NameEN     string
	NameHE     string
	Amount     money.Money
	Share      float64
	PerMonth   money.Money
}

// MonthlyAverages are the period's totals scaled to a 30.4-day month, so a period that is not a whole number of
// months (this month so far, a year that has just begun) is still comparable.
type MonthlyAverages struct {
	Income   money.Money
	Spending money.Money
	Net      money.Money
}

// PeriodTotals are the totals of another period, for comparison.
type PeriodTotals struct {
	From     string
	To       string
	Income   money.Money
	Spending money.Money
	Net      money.Money
	// Complete is false when the data does not cover the whole earlier period (it began later), so the
	// comparison would flatter or punish the present one.
	Complete       bool
	IncomeChange   *float64 // fraction, 0.1 = up 10%; nil when the earlier figure is zero
	SpendingChange *float64
}

// UncategorizedSpending is spending nobody has put in a category yet.
type UncategorizedSpending struct {
	Count  int
	Amount money.Money
}

// Summary describes one period at a glance: totals, what is typical per month and per day, the extremes, where
// the money went and how it compares with the period before.
type Summary struct {
	From string // the period actually covered: the requested one, trimmed to where the data starts
	To   string
	Days int

	Income      money.Money
	Spending    money.Money
	Net         money.Money
	SavingsRate *float64 // nil when there was no income

	PerMonth       MonthlyAverages
	SpendingPerDay money.Money

	// Whole calendar months inside the period; the extremes and the median look only at these, since a
	// month in progress would always seem the cheapest.
	CompleteMonths       int
	HighestSpendingMonth *MonthAmount
	LowestSpendingMonth  *MonthAmount
	MedianMonthSpending  *money.Money

	// Purchases are the charges that count as spending, leaving out the bank debits that pay a card bill whose
	// purchases are not itemised here; those are one lump, not a purchase.
	Purchases       int
	AveragePurchase money.Money
	Largest         []BigPurchase

	TopCategories []TopCategory
	Uncategorized UncategorizedSpending
	Previous      *PeriodTotals // nil for "all time" or when there is nothing before
}

func ratio(now, before int64) *float64 {
	if before == 0 {
		return nil
	}
	r := float64(now-before) / math.Abs(float64(before))
	return &r
}

// flowTotals returns income and spending (positive numbers) for a compiled query.
func (s *Service) flowTotals(ctx context.Context, q query) (income, spending int64, err error) {
	rows, err := s.st.QueryContext(ctx, `SELECT flow, COALESCE(SUM(`+q.value+`), 0) FROM ledger_view
		WHERE `+q.where+` AND flow <> 'EXCLUDED' GROUP BY flow`, q.args...)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var flow string
		var v int64
		if err := rows.Scan(&flow, &v); err != nil {
			return 0, 0, err
		}
		if flow == "INCOME" {
			income += v
		} else {
			spending += v
		}
	}
	return income, spending, rows.Err()
}

// Summary builds the summary of f's period. Measures follow the other reports: out of pocket unless asked.
func (s *Service) Summary(ctx context.Context, f Filter) (*Summary, error) {
	if f.Measure == "" {
		f.Measure = OutOfPocket
	}
	q, err := f.compile(OutOfPocket)
	if err != nil {
		return nil, err
	}
	lo, _, err := s.monthBounds(ctx, q)
	if err != nil {
		return nil, err
	}
	out := &Summary{}
	today := s.today()
	to := f.To
	if to == "" || to > today {
		to = today
	}
	from := f.From
	if lo == "" { // no data at all
		out.From, out.To = from, to
		if from == "" {
			out.From = to
		}
		zero := q.money(0)
		out.Income, out.Spending, out.Net, out.SpendingPerDay, out.AveragePurchase = zero, zero, zero, zero, zero
		out.PerMonth = MonthlyAverages{zero, zero, zero}
		out.Uncategorized.Amount = zero
		out.Days = 1
		return out, nil
	}
	if first := lo + "-01"; from == "" || from < first {
		from = first // a period that starts before the data would count empty days
	}
	if from > to {
		from = to
	}
	f.From, f.To = from, to
	if q, err = f.compile(OutOfPocket); err != nil {
		return nil, err
	}
	start, _ := time.Parse("2006-01-02", from)
	end, _ := time.Parse("2006-01-02", to)
	days := int(end.Sub(start).Hours()/24) + 1
	out.From, out.To, out.Days = from, to, days

	inc, spend, err := s.flowTotals(ctx, q)
	if err != nil {
		return nil, err
	}
	out.Income, out.Spending, out.Net = q.money(inc), q.money(spend), q.money(inc-spend)
	if inc > 0 {
		r := float64(inc-spend) / float64(inc)
		out.SavingsRate = &r
	}
	perMonth := func(v int64) int64 { return int64(math.Round(float64(v) * daysPerMonth / float64(days))) }
	out.PerMonth = MonthlyAverages{q.money(perMonth(inc)), q.money(perMonth(spend)), q.money(perMonth(inc - spend))}
	out.SpendingPerDay = q.money(int64(math.Round(float64(spend) / float64(days))))

	// Months that are whole, inside the period.
	cf, err := s.CashFlow(ctx, f)
	if err != nil {
		return nil, err
	}
	var spends []int64
	for _, m := range cf {
		first, _ := time.Parse("2006-01", m.Month)
		last := first.AddDate(0, 1, -1)
		if first.Before(start) || last.After(end) {
			continue
		}
		spends = append(spends, m.Spending.Minor())
		ma := &MonthAmount{Month: m.Month, Amount: m.Spending}
		if out.HighestSpendingMonth == nil || m.Spending.Minor() > out.HighestSpendingMonth.Amount.Minor() {
			out.HighestSpendingMonth = ma
		}
		if out.LowestSpendingMonth == nil || m.Spending.Minor() < out.LowestSpendingMonth.Amount.Minor() {
			out.LowestSpendingMonth = ma
		}
	}
	out.CompleteMonths = len(spends)
	if n := len(spends); n > 0 {
		sort.Slice(spends, func(i, j int) bool { return spends[i] < spends[j] })
		med := spends[n/2]
		if n%2 == 0 {
			med = (spends[n/2-1] + spends[n/2]) / 2
		}
		m := q.money(med)
		out.MedianMonthSpending = &m
	}

	// Charges, leaving out the lumps that pay a card bill.
	notBill, billArgs, err := s.notCardBill(ctx)
	if err != nil {
		return nil, err
	}
	var n int
	var sum int64
	if err := s.st.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(`+q.value+`), 0) FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' AND `+q.value+` > 0 AND `+notBill, append(append([]any{}, q.args...), billArgs...)...).Scan(&n, &sum); err != nil {
		return nil, err
	}
	out.Purchases = n
	out.AveragePurchase = q.money(0)
	if n > 0 {
		out.AveragePurchase = q.money(int64(math.Round(float64(sum) / float64(n))))
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT id, date, payee, `+q.value+`, COALESCE(category_id, '') FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' AND `+q.value+` > 0 AND `+notBill+` ORDER BY `+q.value+` DESC, date DESC, id LIMIT 5`,
		append(append([]any{}, q.args...), billArgs...)...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var b BigPurchase
		var v int64
		if err := rows.Scan(&b.TransactionID, &b.Date, &b.Payee, &v, &b.CategoryID); err != nil {
			rows.Close()
			return nil, err
		}
		b.Amount = q.money(v)
		if c, ok := cats[b.CategoryID]; ok {
			b.CategoryName = c.NameEN
		}
		out.Largest = append(out.Largest, b)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	bd, _, err := s.CategoryBreakdown(ctx, f)
	if err != nil {
		return nil, err
	}
	for i, c := range bd {
		if i == 5 {
			break
		}
		out.TopCategories = append(out.TopCategories, TopCategory{CategoryID: c.CategoryID, NameEN: c.NameEN, NameHE: c.NameHE,
			Amount: c.Amount, Share: c.Share, PerMonth: q.money(perMonth(c.Amount.Minor()))})
	}
	var un int64
	if err := s.st.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(`+q.value+`), 0) FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' AND category_id IS NULL`, q.args...).Scan(&out.Uncategorized.Count, &un); err != nil {
		return nil, err
	}
	out.Uncategorized.Amount = q.money(un)

	// The period just before, as long as this one is bounded.
	if f.From != "" && lo != "" {
		// Where the data begins overall, not within this period: it says whether the earlier period is whole.
		all := f
		all.From, all.To = "", ""
		aq, err := all.compile(OutOfPocket)
		if err != nil {
			return nil, err
		}
		dataStart, _, err := s.monthBounds(ctx, aq)
		if err != nil {
			return nil, err
		}
		pTo := start.AddDate(0, 0, -1)
		pFrom := pTo.AddDate(0, 0, -(days - 1))
		pf := f
		pf.From, pf.To = pFrom.Format("2006-01-02"), pTo.Format("2006-01-02")
		pq, err := pf.compile(OutOfPocket)
		if err != nil {
			return nil, err
		}
		pi, ps, err := s.flowTotals(ctx, pq)
		if err != nil {
			return nil, err
		}
		if pi != 0 || ps != 0 {
			out.Previous = &PeriodTotals{From: pf.From, To: pf.To, Income: q.money(pi), Spending: q.money(ps), Net: q.money(pi - ps),
				Complete: pf.From >= dataStart+"-01", IncomeChange: ratio(inc, pi), SpendingChange: ratio(spend, ps)}
		}
	}
	return out, nil
}

// notCardBill is a SQL condition (over ledger_view) that excludes bank debits paying a card company, and its
// arguments. Without card-payment hints it excludes nothing.
func (s *Service) notCardBill(ctx context.Context) (string, []any, error) {
	hints, err := s.b.Hints(ctx)
	if err != nil || len(hints) == 0 {
		return "1 = 1", nil, err
	}
	conds := make([]string, len(hints))
	args := make([]any, len(hints))
	for i, h := range hints {
		conds[i] = "lower(payee) LIKE ?"
		args[i] = "%" + strings.ToLower(h) + "%"
	}
	return "NOT (account_type = 'BANK' AND (" + strings.Join(conds, " OR ") + "))", args, nil
}
