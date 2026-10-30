package billing

import (
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
)

func ip(i int) *int { return &i }

var (
	local   = ledger.BillingRule{Scope: ledger.ScopeLocal, BillDay: 10, MonthOffset: 0, CutoffDay: ip(10)}
	foreign = ledger.BillingRule{Scope: ledger.ScopeForeign, BillDay: 2, MonthOffset: 1, CutoffDay: ip(2)}
)

func TestComputeBillDate(t *testing.T) {
	cases := []struct {
		name     string
		rule     ledger.BillingRule
		purchase string
		standing bool
		want     string
	}{
		// Local: the user's own examples, 2026.
		{"5 Sep bills 10 Sep", local, "2026-09-05", false, "2026-09-10"},  // 5 Sep is a Saturday -> eff Sun 6th, still < 10
		{"25 Sep bills 10 Oct", local, "2026-09-25", false, "2026-10-11"}, // 10 Oct 2026 is a Saturday -> Sunday 11th
		{"real: Cal 10 Jun 2023 Saturday -> 11th", local, "2023-05-20", false, "2023-06-11"},
		{"real: Friday 10 Nov 2023 stays", local, "2023-10-20", false, "2023-11-10"},
		{"cutoff day itself rolls", local, "2026-09-10", false, "2026-10-11"},
		{"day before cutoff stays", local, "2026-09-09", false, "2026-09-10"},
		{"Saturday 9th rolls into next month", local, "2026-05-09", false, "2026-06-10"}, // 9 May 2026 is a Saturday
		{"Friday 8th does not (eff Sunday 10th) roll", local, "2026-05-08", false, "2026-06-10"},
		{"Thursday 7th stays", local, "2026-05-07", false, "2026-05-10"}, // 10 May 2026 is Sunday
		{"bill date on Saturday moves to Sunday", local, "2026-10-01", false, "2026-10-11"},
		{"bill date on Friday stays", local, "2026-06-20", false, "2026-07-10"},
		{"December rolls the year", local, "2026-12-20", false, "2027-01-10"},
		// Isracard foreign: September purchases from the 2nd bill on 2 November.
		{"foreign Sep -> 2 Nov", foreign, "2026-09-15", false, "2026-11-02"},
		{"foreign 1 Sep -> 2 Oct (a Friday, not shifted)", foreign, "2026-09-01", false, "2026-10-02"},
		{"foreign 2 Sep -> 2 Nov", foreign, "2026-09-02", false, "2026-11-02"},
		{"foreign May 2 -> 2 Jul", foreign, "2026-05-02", false, "2026-07-02"},
		{"foreign 1 Jun -> 2 Jul", foreign, "2026-06-01", false, "2026-07-02"},
		// Month-end clamping and leap years.
		{"bill day 31 clamps to Feb", ledger.BillingRule{BillDay: 31, MonthOffset: 1}, "2026-01-15", false, "2026-03-01"}, // Feb 28 2026 is Saturday -> Sun Mar 1
		{"bill day 31 clamps to leap Feb", ledger.BillingRule{BillDay: 31, MonthOffset: 1}, "2028-01-15", false, "2028-02-29"},
		{"purchase on the 31st", local, "2026-07-31", false, "2026-08-10"}, // Fri 31 Jul -> eff Sun 2 Aug
		{"cutoff 31 clamps in a 30-day month", ledger.BillingRule{BillDay: 5, CutoffDay: ip(31)}, "2026-06-30", false, "2026-07-05"},
		// Standing orders lag by the rule's extra cycles only.
		{"standing order lag", ledger.BillingRule{BillDay: 10, CutoffDay: ip(10), StandingOrderExtraCycles: 1}, "2026-06-02", true, "2026-07-10"}, // the lag adds one cycle: June -> July; Friday is not shifted,
		{"standing order without lag", local, "2026-06-02", true, "2026-06-10"},
		{"lag ignored for ordinary purchases", ledger.BillingRule{BillDay: 10, CutoffDay: ip(10), StandingOrderExtraCycles: 1}, "2026-06-02", false, "2026-06-10"},
		// Leumi foreign: deferred one extra month.
		{"leumi deferred", ledger.BillingRule{BillDay: 10, MonthOffset: 2}, "2026-05-20", false, "2026-07-10"}, // Friday,
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ComputeBillDate(c.rule, c.purchase, c.standing)
			if err != nil || got != c.want {
				t.Fatalf("got %s, %v; want %s", got, err, c.want)
			}
		})
	}
}

func TestEffectiveDateAndBadInput(t *testing.T) {
	for in, want := range map[string]string{
		"2026-07-09": "2026-07-09", // Thursday
		"2026-07-10": "2026-07-12", // Friday -> Sunday
		"2026-07-11": "2026-07-12", // Saturday -> Sunday
		"2026-07-12": "2026-07-12",
	} {
		if got, err := EffectiveDate(in); err != nil || got != want {
			t.Errorf("%s: got %s, %v", in, got, err)
		}
	}
	if _, err := EffectiveDate("07/10/2026"); err == nil {
		t.Error("expected error")
	}
	if _, err := ComputeBillDate(local, "nope", false); err == nil {
		t.Error("expected error")
	}
}

func TestPickRule(t *testing.T) {
	rules := []ledger.BillingRule{{Scope: ledger.ScopeAll, BillDay: 1}, {Scope: ledger.ScopeForeign, BillDay: 2}}
	if r := PickRule(rules, ledger.ScopeForeign); r.BillDay != 2 {
		t.Fatal("exact scope wins")
	}
	if r := PickRule(rules, ledger.ScopeLocal); r.BillDay != 1 {
		t.Fatal("ALL is the fallback")
	}
	if PickRule(rules[1:], ledger.ScopeLocal) != nil {
		t.Fatal("no rule means nil")
	}
}
