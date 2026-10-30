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

// CategoryChange is how one category's spending differs between the period and the one it is compared with.
type CategoryChange struct {
	CategoryID string
	NameEN     string
	NameHE     string
	Current    money.Money // this period
	Other      money.Money // the compared period
	Change     money.Money // current minus other; positive means more spending now
	ChangePct  *float64    // as a fraction of the other; nil when the other is zero
}

// ComparedMonth lines up one month of the period with the month in the same position of the compared one
// (the first with the first, and so on), so a year can be set against another year.
type ComparedMonth struct {
	Position      int    // 1-based
	Month         string // YYYY-MM in this period; empty when it has fewer months
	OtherMonth    string // YYYY-MM in the compared period; empty when it has fewer months
	Spending      money.Money
	OtherSpending money.Money
	Income        money.Money
	OtherIncome   money.Money
}

// Comparison sets the period against another one, by default the period just before.
type Comparison struct {
	From string
	To   string
	Days int
	// Complete is false when the data does not cover the whole compared period (it began later, or the period
	// is not over), so the comparison would flatter or punish the present one.
	Complete bool

	Income         money.Money
	Spending       money.Money
	Net            money.Money
	SavingsRate    *float64
	PerMonth       MonthlyAverages
	SpendingPerDay money.Money

	// Changes are fractions of the compared period's figure (0.1 = 10% more now); nil when that is zero.
	IncomeChange   *float64
	SpendingChange *float64
	NetChange      *float64

	Categories []CategoryChange // every category in either period, the biggest change first
	Months     []ComparedMonth
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
	Comparison    *Comparison // nil when there is nothing to compare with
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

	cmp, err := s.compare(ctx, f, start, end, out, perMonth)
	if err != nil {
		return nil, err
	}
	out.Comparison = cmp
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

func lastOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month()+1, 0, 0, 0, 0, 0, time.UTC)
}

// previousRange is the period a summary is compared with by default. A period made of whole months (or this
// month so far) is set against the same number of months before it, a year (or the year so far) against the
// year before, and any other against the stretch of equal length just before it.
func previousRange(from, to time.Time) (time.Time, time.Time) {
	days := int(to.Sub(from).Hours()/24) + 1
	if from.Day() == 1 {
		k := (to.Year()-from.Year())*12 + int(to.Month()-from.Month()) + 1
		if from.Month() == time.January && k <= 12 {
			return from.AddDate(-1, 0, 0), to.AddDate(-1, 0, 0)
		}
		pf := time.Date(from.Year(), from.Month()-time.Month(k), 1, 0, 0, 0, 0, time.UTC)
		pt := pf.AddDate(0, 0, days-1)
		if limit := lastOfMonth(time.Date(pf.Year(), pf.Month()+time.Month(k-1), 1, 0, 0, 0, 0, time.UTC)); to.Equal(lastOfMonth(to)) || pt.After(limit) {
			pt = limit
		}
		return pf, pt
	}
	pt := from.AddDate(0, 0, -1)
	return pt.AddDate(0, 0, -(days - 1)), pt
}

// compareRange picks the period to compare with: an explicit one, the same dates a year earlier, or the default.
func compareRange(f Filter, start, end time.Time) (time.Time, time.Time) {
	if f.CompareFrom != "" {
		a, _ := time.Parse("2006-01-02", f.CompareFrom)
		b, _ := time.Parse("2006-01-02", f.CompareTo)
		return a, b
	}
	if f.Compare == "year" {
		return start.AddDate(-1, 0, 0), end.AddDate(-1, 0, 0)
	}
	return previousRange(start, end)
}

// compare totals the other period and sets it against this one. With no explicit period, nothing to compare
// with (no data there at all) is nil rather than a comparison with zero.
func (s *Service) compare(ctx context.Context, f Filter, start, end time.Time, cur *Summary, perMonth func(int64) int64) (*Comparison, error) {
	explicit := f.CompareFrom != ""
	cs, ce := compareRange(f, start, end)
	of := f
	of.From, of.To = cs.Format("2006-01-02"), ce.Format("2006-01-02")
	oq, err := of.compile(OutOfPocket)
	if err != nil {
		return nil, err
	}
	oi, osp, err := s.flowTotals(ctx, oq)
	if err != nil {
		return nil, err
	}
	if oi == 0 && osp == 0 && !explicit {
		return nil, nil
	}
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
	days := int(ce.Sub(cs).Hours()/24) + 1
	money0 := func(v int64) money.Money { return oq.money(v) }
	omonth := func(v int64) int64 { return int64(math.Round(float64(v) * daysPerMonth / float64(days))) }
	c := &Comparison{From: of.From, To: of.To, Days: days,
		Complete: dataStart != "" && of.From >= dataStart+"-01" && of.To <= s.today(),
		Income:   money0(oi), Spending: money0(osp), Net: money0(oi - osp),
		PerMonth:       MonthlyAverages{money0(omonth(oi)), money0(omonth(osp)), money0(omonth(oi - osp))},
		SpendingPerDay: money0(int64(math.Round(float64(osp) / float64(days)))),
		IncomeChange:   ratio(cur.Income.Minor(), oi), SpendingChange: ratio(cur.Spending.Minor(), osp), NetChange: ratio(cur.Net.Minor(), oi-osp)}
	if oi > 0 {
		r := float64(oi-osp) / float64(oi)
		c.SavingsRate = &r
	}

	// Category by category.
	now, _, err := s.CategoryBreakdown(ctx, f)
	if err != nil {
		return nil, err
	}
	then, _, err := s.CategoryBreakdown(ctx, of)
	if err != nil {
		return nil, err
	}
	byCat := map[string]*CategoryChange{}
	get := func(ct CategoryTotal) *CategoryChange {
		x := byCat[ct.CategoryID]
		if x == nil {
			x = &CategoryChange{CategoryID: ct.CategoryID, NameEN: ct.NameEN, NameHE: ct.NameHE, Current: oq.money(0), Other: oq.money(0)}
			byCat[ct.CategoryID] = x
		}
		return x
	}
	for _, ct := range now {
		get(ct).Current = ct.Amount
	}
	for _, ct := range then {
		get(ct).Other = ct.Amount
	}
	for _, x := range byCat {
		x.Change = oq.money(x.Current.Minor() - x.Other.Minor())
		x.ChangePct = ratio(x.Current.Minor(), x.Other.Minor())
		c.Categories = append(c.Categories, *x)
	}
	sort.Slice(c.Categories, func(i, j int) bool {
		a, b := math.Abs(float64(c.Categories[i].Change.Minor())), math.Abs(float64(c.Categories[j].Change.Minor()))
		if a != b {
			return a > b
		}
		return c.Categories[i].NameEN < c.Categories[j].NameEN
	})

	// Month by month, the first against the first and so on.
	type pair struct{ inc, spend money.Money }
	monthly := func(ff Filter) (map[string]pair, error) {
		cf, err := s.CashFlow(ctx, ff)
		if err != nil {
			return nil, err
		}
		m := map[string]pair{}
		for _, x := range cf {
			m[x.Month] = pair{x.Income, x.Spending}
		}
		return m, nil
	}
	a, err := monthly(f)
	if err != nil {
		return nil, err
	}
	b, err := monthly(of)
	if err != nil {
		return nil, err
	}
	am, bm := months(f.From[:7], f.To[:7]), months(of.From[:7], of.To[:7])
	zero := oq.money(0)
	for i := 0; i < len(am) || i < len(bm); i++ {
		cm := ComparedMonth{Position: i + 1, Spending: zero, OtherSpending: zero, Income: zero, OtherIncome: zero}
		if i < len(am) {
			cm.Month = am[i]
			if p, ok := a[am[i]]; ok {
				cm.Income, cm.Spending = p.inc, p.spend
			}
		}
		if i < len(bm) {
			cm.OtherMonth = bm[i]
			if p, ok := b[bm[i]]; ok {
				cm.OtherIncome, cm.OtherSpending = p.inc, p.spend
			}
		}
		c.Months = append(c.Months, cm)
	}
	return c, nil
}
