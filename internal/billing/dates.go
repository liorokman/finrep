// Package billing turns card purchases into bill dates, statements and settlements (spec section 6).
package billing

import (
	"fmt"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
)

const dateLayout = "2006-01-02"

func parseDate(s string) (time.Time, error) {
	t, err := time.Parse(dateLayout, s)
	if err != nil {
		return time.Time{}, fmt.Errorf("%w: bad date %q", ledger.ErrInvalid, s)
	}
	return t, nil
}

func daysIn(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// nextBusinessDay moves a Friday or Saturday to the following Sunday (Israeli weekend); other days stay.
// It decides which cutoff a purchase falls on; issuers do not process purchases on the weekend.
func nextBusinessDay(d time.Time) time.Time {
	switch d.Weekday() {
	case time.Friday:
		return d.AddDate(0, 0, 2)
	case time.Saturday:
		return d.AddDate(0, 0, 1)
	}
	return d
}

// EffectiveDate is the date a purchase takes effect for cutoff purposes: weekend purchases count as
// the following Sunday, so a Saturday the 9th is compared with the cutoff as the 10th.
func EffectiveDate(purchase string) (string, error) {
	d, err := parseDate(purchase)
	if err != nil {
		return "", err
	}
	return nextBusinessDay(d).Format(dateLayout), nil
}

// PickRule returns the rule for a scope, falling back to an ALL rule; nil when the card has neither.
func PickRule(rules []ledger.BillingRule, scope ledger.Scope) *ledger.BillingRule {
	var all *ledger.BillingRule
	for i := range rules {
		switch rules[i].Scope {
		case scope:
			return &rules[i]
		case ledger.ScopeAll:
			all = &rules[i]
		}
	}
	return all
}

// ComputeBillDate applies a billing rule to a purchase date (spec 6.1): the effective date is compared
// with the cutoff, the month offset (plus the standing-order lag, if any) is added, the bill day is
// clamped to the month's length, and a Saturday result moves to Sunday.
func ComputeBillDate(r ledger.BillingRule, purchase string, standingOrder bool) (string, error) {
	p, err := parseDate(purchase)
	if err != nil {
		return "", err
	}
	eff := nextBusinessDay(p)
	months := r.MonthOffset
	if r.CutoffDay != nil && eff.Day() >= min(*r.CutoffDay, daysIn(eff.Year(), eff.Month())) {
		months++
	}
	if standingOrder {
		months += r.StandingOrderExtraCycles
	}
	first := time.Date(eff.Year(), eff.Month()+time.Month(months), 1, 0, 0, 0, 0, time.UTC)
	day := min(r.BillDay, daysIn(first.Year(), first.Month()))
	bill := time.Date(first.Year(), first.Month(), day, 0, 0, 0, 0, time.UTC)
	if bill.Weekday() == time.Saturday { // debits happen on Fridays, never on Saturdays
		bill = bill.AddDate(0, 0, 1)
	}
	return bill.Format(dateLayout), nil
}
