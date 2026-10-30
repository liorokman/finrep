package reports

import (
	"math"
	"testing"
	"time"
)

func TestSummaryAgreesWithCashFlowAndScalesToAMonth(t *testing.T) {
	w := newWorld(t)
	w.seed()
	f := Filter{From: "2026-01-01", To: "2026-03-31"}
	sm, err := w.s.Summary(ctx, f)
	if err != nil {
		t.Fatal(err)
	}
	cf, err := w.s.CashFlow(ctx, f)
	if err != nil {
		t.Fatal(err)
	}
	inc := sum(cf, func(m CashFlowMonth) int64 { return m.Income.Minor() })
	spend := sum(cf, func(m CashFlowMonth) int64 { return m.Spending.Minor() })
	if sm.Income.Minor() != inc || sm.Spending.Minor() != spend || sm.Net.Minor() != inc-spend {
		t.Fatalf("totals %v/%v/%v, cash flow %d/%d", sm.Income, sm.Spending, sm.Net, inc, spend)
	}
	if sm.Days != 90 || sm.From != "2026-01-01" || sm.To != "2026-03-31" || sm.CompleteMonths != 3 {
		t.Fatalf("period: %+v", sm)
	}
	if want := int64(math.Round(float64(spend) * daysPerMonth / 90)); sm.PerMonth.Spending.Minor() != want {
		t.Errorf("spending per month = %d, want %d", sm.PerMonth.Spending.Minor(), want)
	}
	if want := int64(math.Round(float64(spend) / 90)); sm.SpendingPerDay.Minor() != want {
		t.Errorf("per day = %d, want %d", sm.SpendingPerDay.Minor(), want)
	}
	if sm.SavingsRate == nil || math.Abs(*sm.SavingsRate-float64(inc-spend)/float64(inc)) > 1e-9 {
		t.Errorf("savings rate %v", sm.SavingsRate)
	}
	if sm.HighestSpendingMonth == nil || sm.LowestSpendingMonth == nil || sm.MedianMonthSpending == nil ||
		sm.HighestSpendingMonth.Amount.Minor() < sm.LowestSpendingMonth.Amount.Minor() {
		t.Fatalf("extremes: %+v %+v %v", sm.HighestSpendingMonth, sm.LowestSpendingMonth, sm.MedianMonthSpending)
	}
	if len(sm.Largest) != 5 || sm.Largest[0].Payee != "Rent Jan" || sm.Largest[0].Amount.Minor() != 300000 ||
		sm.Largest[1].Payee != "SHUFERSAL" || sm.Largest[1].Amount.Minor() != 200000 {
		t.Errorf("largest purchases: %+v", sm.Largest)
	}
	bd, _, _ := w.s.CategoryBreakdown(ctx, Filter{From: f.From, To: f.To, Measure: OutOfPocket})
	if len(sm.TopCategories) == 0 || sm.TopCategories[0].CategoryID != bd[0].CategoryID {
		t.Errorf("top category: %+v vs %+v", sm.TopCategories, bd[0])
	}
	if sm.Uncategorized.Count != 2 || sm.Uncategorized.Amount.Minor() != 12000 {
		t.Errorf("uncategorized spending: %+v", sm.Uncategorized)
	}
	if sm.Comparison != nil {
		t.Errorf("nothing precedes January: %+v", sm.Comparison)
	}
}

func TestSummaryComparesWithThePeriodBeforeAndTrimsToTheData(t *testing.T) {
	w := newWorld(t)
	w.seed()
	// Februrary and March: 59 days, so the period before reaches back into December, before any data.
	sm, err := w.s.Summary(ctx, Filter{From: "2026-02-01", To: "2026-03-31"})
	if err != nil {
		t.Fatal(err)
	}
	p := sm.Comparison
	if p == nil || p.From != "2025-12-01" || p.To != "2026-01-31" || p.Complete {
		t.Fatalf("comparison: %+v", p)
	}
	jan, _ := w.s.CashFlow(ctx, Filter{From: "2026-01-01", To: "2026-01-31"})
	if p.Spending.Minor() != jan[0].Spending.Minor() || p.SpendingChange == nil {
		t.Errorf("compared spending %v, January %v", p.Spending, jan[0].Spending)
	}
	// A year that starts before the data is counted from where the data begins.
	y, err := w.s.Summary(ctx, Filter{From: "2025-04-15", To: "2026-04-15"})
	if err != nil {
		t.Fatal(err)
	}
	if y.From != "2026-01-01" || y.Days != 105 {
		t.Errorf("trimmed period: %s .. %s (%d days)", y.From, y.To, y.Days)
	}
	// All time has nothing before it to compare with.
	all, _ := w.s.Summary(ctx, Filter{})
	if all.Comparison != nil || all.From != "2026-01-01" {
		t.Errorf("all time: %+v", all)
	}
	// No data at all: zeros, not an error.
	none, err := w.s.Summary(ctx, Filter{Owner: "Nobody"})
	if err != nil || none.Spending.Minor() != 0 || none.Days != 1 || len(none.Largest) != 0 {
		t.Fatalf("%+v %v", none, err)
	}
}

func TestPreviousRange(t *testing.T) {
	d := func(s string) time.Time { x, _ := time.Parse("2006-01-02", s); return x }
	for _, c := range []struct{ from, to, wantFrom, wantTo string }{
		{"2026-10-01", "2026-10-31", "2026-09-01", "2026-09-30"}, // a month: the month before
		{"2026-10-01", "2026-10-30", "2026-09-01", "2026-09-30"}, // this month so far: the same days of the month before
		{"2026-03-01", "2026-03-31", "2026-02-01", "2026-02-28"}, // the month before is shorter
		{"2026-02-01", "2026-02-28", "2026-01-01", "2026-01-31"},
		{"2026-08-01", "2026-10-30", "2026-05-01", "2026-07-30"}, // three months so far: three months before, as many days
		{"2025-01-01", "2025-12-31", "2024-01-01", "2024-12-31"}, // a year: the year before
		{"2026-01-01", "2026-10-30", "2025-01-01", "2025-10-30"}, // the year so far: the same days a year ago
		{"2025-11-01", "2026-10-30", "2024-11-01", "2025-10-30"}, // twelve months
		{"2026-03-15", "2026-03-24", "2026-03-05", "2026-03-14"}, // anything else: the stretch of equal length before
	} {
		gf, gt := previousRange(d(c.from), d(c.to))
		if gf.Format("2006-01-02") != c.wantFrom || gt.Format("2006-01-02") != c.wantTo {
			t.Errorf("%s..%s: got %s..%s, want %s..%s", c.from, c.to, gf.Format("2006-01-02"), gt.Format("2006-01-02"), c.wantFrom, c.wantTo)
		}
	}
}

func TestSummaryComparesAnyTwoPeriodsCategoryByCategoryAndMonthByMonth(t *testing.T) {
	w := newWorld(t)
	w.seed()
	// February against January, by explicit dates.
	sm, err := w.s.Summary(ctx, Filter{From: "2026-02-01", To: "2026-02-28", CompareFrom: "2026-01-01", CompareTo: "2026-01-31"})
	if err != nil {
		t.Fatal(err)
	}
	c := sm.Comparison
	if c == nil || c.From != "2026-01-01" || c.To != "2026-01-31" || c.Days != 31 || !c.Complete {
		t.Fatalf("comparison: %+v", c)
	}
	feb, _ := w.s.CashFlow(ctx, Filter{From: "2026-02-01", To: "2026-02-28"})
	jan, _ := w.s.CashFlow(ctx, Filter{From: "2026-01-01", To: "2026-01-31"})
	if sm.Spending.Minor() != feb[0].Spending.Minor() || c.Spending.Minor() != jan[0].Spending.Minor() || c.Income.Minor() != jan[0].Income.Minor() {
		t.Fatalf("totals: %v vs %v", sm.Spending, c.Spending)
	}
	want := float64(feb[0].Spending.Minor()-jan[0].Spending.Minor()) / float64(jan[0].Spending.Minor())
	if c.SpendingChange == nil || math.Abs(*c.SpendingChange-want) > 1e-9 {
		t.Errorf("spending change %v, want %v", c.SpendingChange, want)
	}
	// The category changes add up to the change in spending, and Rent (paid only in January) is in them.
	var total int64
	var rent *CategoryChange
	for i, x := range c.Categories {
		total += x.Change.Minor()
		if x.NameEN == "Rent" {
			rent = &c.Categories[i]
		}
	}
	if total != feb[0].Spending.Minor()-jan[0].Spending.Minor() {
		t.Errorf("category changes add to %d, spending changed by %d", total, feb[0].Spending.Minor()-jan[0].Spending.Minor())
	}
	if rent == nil || rent.Current.Minor() != 0 || rent.Other.Minor() != 300000 || rent.Change.Minor() != -300000 || rent.ChangePct == nil || *rent.ChangePct != -1 {
		t.Errorf("rent: %+v", rent)
	}
	for i := 1; i < len(c.Categories); i++ {
		if math.Abs(float64(c.Categories[i-1].Change.Minor())) < math.Abs(float64(c.Categories[i].Change.Minor())) {
			t.Fatal("categories must be ordered by the size of the change")
		}
	}
	if len(c.Months) != 1 || c.Months[0].Month != "2026-02" || c.Months[0].OtherMonth != "2026-01" || c.Months[0].OtherSpending.Minor() != jan[0].Spending.Minor() {
		t.Errorf("months: %+v", c.Months)
	}

	// Two quarters of different length: positions line up and the shorter one stops.
	q, err := w.s.Summary(ctx, Filter{From: "2026-01-01", To: "2026-03-31", CompareFrom: "2026-02-01", CompareTo: "2026-03-31"})
	if err != nil || len(q.Comparison.Months) != 3 || q.Comparison.Months[2].OtherMonth != "" || q.Comparison.Months[0].OtherMonth != "2026-02" {
		t.Fatalf("%+v %v", q.Comparison, err)
	}

	// Same dates a year earlier: no data then, so nothing to compare with unless the range was asked for.
	y, err := w.s.Summary(ctx, Filter{From: "2026-02-01", To: "2026-02-28", Compare: "year"})
	if err != nil || y.Comparison != nil {
		t.Fatalf("year over year with no data a year ago: %+v %v", y.Comparison, err)
	}
	e, err := w.s.Summary(ctx, Filter{From: "2026-02-01", To: "2026-02-28", CompareFrom: "2024-02-01", CompareTo: "2024-02-29"})
	if err != nil || e.Comparison == nil || e.Comparison.Spending.Minor() != 0 || e.Comparison.Complete || e.Comparison.SpendingChange != nil {
		t.Fatalf("an asked-for range with no data is shown, empty and incomplete: %+v %v", e.Comparison, err)
	}

	for _, bad := range []Filter{
		{CompareFrom: "2026-01-01"}, {CompareTo: "2026-01-31"}, {CompareFrom: "2026-02-01", CompareTo: "2026-01-01"},
		{CompareFrom: "yesterday", CompareTo: "2026-01-01"}, {Compare: "decade"},
	} {
		if _, err := w.s.Summary(ctx, bad); err == nil {
			t.Errorf("%+v must be rejected", bad)
		}
	}
}
