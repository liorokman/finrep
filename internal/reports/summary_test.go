package reports

import (
	"math"
	"testing"
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
	if sm.Previous != nil && sm.Previous.Spending.Minor() != 0 {
		t.Errorf("nothing precedes January: %+v", sm.Previous)
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
	p := sm.Previous
	if p == nil || p.From != "2025-12-04" || p.To != "2026-01-31" || p.Complete {
		t.Fatalf("previous: %+v", p)
	}
	jan, _ := w.s.CashFlow(ctx, Filter{From: "2026-01-01", To: "2026-01-31"})
	if p.Spending.Minor() != jan[0].Spending.Minor() || p.SpendingChange == nil {
		t.Errorf("previous spending %v, January %v", p.Spending, jan[0].Spending)
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
	if all.Previous != nil || all.From != "2026-01-01" {
		t.Errorf("all time: %+v", all)
	}
	// No data at all: zeros, not an error.
	none, err := w.s.Summary(ctx, Filter{Owner: "Nobody"})
	if err != nil || none.Spending.Minor() != 0 || none.Days != 1 || len(none.Largest) != 0 {
		t.Fatalf("%+v %v", none, err)
	}
}
