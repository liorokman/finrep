package importer

import (
	"fmt"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// TotalMismatchError reports a statement whose parsed lines do not add up to
// the total printed on it, which means the parser misread the file.
type TotalMismatchError struct {
	BillDate string
	Printed  money.Money
	Parsed   money.Money
	Lines    []string
}

func (e *TotalMismatchError) Error() string {
	return fmt.Sprintf("statement %s: parsed lines add up to %s but the statement prints %s (difference %s)\n  %s",
		e.BillDate, e.Parsed, e.Printed, money.New(e.Printed.Minor()-e.Parsed.Minor(), e.Printed.Currency()), strings.Join(e.Lines, "\n  "))
}

// Validate enforces the statement-total invariant: for every statement with a
// printed total, the lines billed on its date (purchases less employer
// coverage) must add up to exactly that total. Card amounts are negative, so
// the amount owed is the negated sum.
func Validate(p *Parsed) error {
	for _, st := range p.Statements {
		if st.PrintedTotal == nil {
			continue
		}
		sum := money.New(0, st.PrintedTotal.Currency())
		var desc []string
		for _, l := range p.Lines {
			if l.BillDate != st.BillDate {
				continue
			}
			var err error
			if sum, err = sum.Sub(l.Amount); err != nil {
				return fmt.Errorf("statement %s: %w", st.BillDate, err)
			}
			desc = append(desc, fmt.Sprintf("%s %s %s", l.Date, l.Amount, l.Payee))
		}
		if sum.Minor() != st.PrintedTotal.Minor() {
			return &TotalMismatchError{BillDate: st.BillDate, Printed: *st.PrintedTotal, Parsed: sum, Lines: desc}
		}
	}
	return nil
}

// PairCoverage links each employer-coverage line to the purchase it covers
// (spec 4.3a): same date, same payee, bill date equal, and a coverage no larger
// than what is still uncovered on the purchase. Partial coverage is allowed.
// Unpaired coverage lines are kept and reported as warnings.
func PairCoverage(p *Parsed) {
	remaining := map[int]int64{} // purchase index -> uncovered amount (positive minor units)
	for i := range p.Lines {
		p.Lines[i].Covers = nil
		if p.Lines[i].Kind == ledger.KindPurchase && p.Lines[i].Amount.Minor() < 0 {
			remaining[i] = -p.Lines[i].Amount.Minor()
		}
	}
	for i := range p.Lines {
		c := &p.Lines[i]
		if c.Kind != ledger.KindEmployerCoverage {
			continue
		}
		for j := range p.Lines {
			pr, ok := remaining[j]
			if !ok || p.Lines[j].Date != c.Date || p.Lines[j].BillDate != c.BillDate ||
				p.Lines[j].Payee != c.Payee || pr < c.Amount.Minor() {
				continue
			}
			j := j
			c.Covers = &j
			remaining[j] = pr - c.Amount.Minor()
			break
		}
		if c.Covers == nil {
			p.Warnings = append(p.Warnings, fmt.Sprintf("employer coverage %s on %s (%s) could not be paired with a purchase",
				c.Amount, c.Date, c.Payee))
		}
	}
}
