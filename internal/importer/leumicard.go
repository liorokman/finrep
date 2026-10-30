package importer

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

var (
	leumiCard    = regexp.MustCompile(`שמסתיים ב-?\s*(\d{4})`)
	leumiHeader  = regexp.MustCompile(`פירוט החיובים בחשבון לתאריך\s*(\d{2}/\d{2}/\d{2})`)
	leumiTotal   = regexp.MustCompile(`סה"כ חיוב לחשבון\s*[\d-]+\s*בתאריך\s*:?\s*(\d{2}/\d{2}/\d{2})`)
	leumiBilling = regexp.MustCompile(`לחיוב בתאריך\s*(\d{2}/\d{2}/\d{2})`)
)

// Leumi card column bands (left edge, in PDF points).
const (
	lcDateMin  = 490.0 // purchase date
	lcMerchLo  = 380.0 // merchant words
	lcTypeLo   = 345.0 // transaction type (e.g. "רגילה", "דחוי חודש")
	lcMerchHi  = lcDateMin
	lcNotesMax = lcTypeLo
)

type leumiSection int

const (
	secNone     leumiSection = iota
	secDue                   // charges due on the billing day (incl. deferred foreign)
	secFuture                // informational: foreign / future charges
	secDomestic              // domestic ILS charges
)

// ParseLeumiCard parses a Leumi card billing statement (פירוט החיובים בחשבון).
func ParseLeumiCard(data []byte, filename string, opt PDFOptions) (*Parsed, error) {
	rows, err := pdfRows(data)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", filename, err)
	}
	return parseLeumiCardRows(rows, filename)
}

func parseLeumiCardRows(rows []pdfRow, filename string) (*Parsed, error) {
	p := &Parsed{Source: SourceLeumiCard, Filename: filename}
	var headerBill string
	sec := secNone
	var pending []int // due/domestic lines awaiting their section total
	lastFuture := -1  // future line awaiting the "לחיוב בתאריך" note below it

	for _, r := range rows {
		text := r.Text()
		if p.Last4 == "" {
			if m := leumiCard.FindStringSubmatch(text); m != nil {
				p.Last4 = m[1]
			}
		}
		if headerBill == "" {
			if m := leumiHeader.FindStringSubmatch(text); m != nil {
				if iso, ok := isoFrom2(m[1]); ok {
					headerBill = iso
				}
			}
		}
		next := secNone
		switch {
		case strings.Contains(text, "לפרעון ביום החיוב"):
			next = secDue
		case strings.Contains(text, "חיוב עתידי"):
			next = secFuture
		case strings.Contains(text, "עסקות בארץ"):
			next = secDomestic
		}
		if next != secNone {
			if len(pending) > 0 {
				return nil, fmt.Errorf("%s: a new section starts but %d charge(s) of the previous one have no total", filename, len(pending))
			}
			sec = next
			continue
		}
		if m := leumiTotal.FindStringSubmatch(text); m != nil {
			iso, ok := isoFrom2(m[1])
			if !ok {
				return nil, fmt.Errorf("%s: unreadable statement date %q", filename, m[1])
			}
			var total *money.Money
			var foreignTotal *money.Money
			for _, c := range r.Cells {
				if v, ok := shekelOf(c); ok {
					total = &v
				} else if v, ok := amountOf(c); ok {
					foreignTotal = &v
				}
			}
			if total == nil && foreignTotal != nil {
				// A section billed in a foreign currency (a euro purchase, say) is not part of the shekel statement:
				// the bank debit equals the shekel total alone, so it is settled separately (in a foreign-currency
				// account). Leave its lines out of the shekel ledger and say so.
				if len(pending) > 0 {
					p.Lines = p.Lines[:len(p.Lines)-len(pending)]
				}
				p.Warnings = append(p.Warnings, fmt.Sprintf("%d charge(s) totalling %s, billed in %s on %s, are billed separately in that currency, not in the shekel debit, and were left out",
					len(pending), foreignTotal, foreignTotal.Currency(), iso))
				pending = nil
				continue
			}
			if total == nil {
				return nil, fmt.Errorf("%s: total row for %s has no amount", filename, iso)
			}
			for _, i := range pending {
				p.Lines[i].BillDate = iso
			}
			pending = nil
			if err := addTotal(p, iso, *total); err != nil {
				return nil, fmt.Errorf("%s: %w", filename, err)
			}
			continue
		}
		if m := leumiBilling.FindStringSubmatch(text); m != nil && lastFuture >= 0 {
			if iso, ok := isoFrom2(m[1]); ok {
				p.Lines[lastFuture].BillDate = iso
				lastFuture = -1
			}
			continue
		}
		line, ok, err := leumiCardLine(r, sec)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filename, err)
		}
		if !ok {
			continue
		}
		p.Lines = append(p.Lines, line)
		if sec == secFuture {
			lastFuture = len(p.Lines) - 1
		} else {
			pending = append(pending, len(p.Lines)-1)
		}
	}
	if p.Last4 == "" {
		return nil, fmt.Errorf("%s: could not find the card number (expected 'שמסתיים ב-NNNN')", filename)
	}
	if len(pending) > 0 {
		return nil, fmt.Errorf("%s: %d transaction line(s) are not followed by a section total; unsupported layout", filename, len(pending))
	}
	for i, l := range p.Lines {
		if l.BillDate == "" {
			return nil, fmt.Errorf("%s: charge on %s (%s) has no bill date", filename, l.Date, l.Payee)
		}
		_ = i
	}
	if len(p.Statements) == 0 {
		return nil, fmt.Errorf("%s: no statement total found (expected 'סה\"כ חיוב לחשבון'); unsupported layout", filename)
	}
	PairCoverage(p)
	return p, nil
}

// leumiGluedDate matches a dd/mm/yy date immediately followed by merchant text in one cell.
var leumiGluedDate = regexp.MustCompile(`^(\d{2}/\d{2}/\d{2})(\D.+)$`)

func leumiCardLine(r pdfRow, sec leumiSection) (Line, bool, error) {
	if sec == secNone {
		return Line{}, false, nil
	}
	date := ""
	var nums []cell
	cells := append([]cell(nil), r.Cells...)
	for i, c := range cells {
		if c.X0 >= lcDateMin {
			if d, ok := isoShort(c); ok {
				date = d
				continue
			}
		}
		// The purchase date can be glued to the first word of the merchant ("14/03/25י.א."), which makes the
		// cell start a little left of a plain date. Split them.
		if c.X0 >= lcDateMin-25 {
			if m := leumiGluedDate.FindStringSubmatch(strings.TrimSpace(c.Text)); m != nil {
				if d, ok := isoFrom2(m[1]); ok {
					date = d
					cells[i] = cell{X0: lcMerchHi - 0.5, X1: c.X1, Text: m[2]}
					continue
				}
			}
		}
		if _, ok := shekelOf(c); ok {
			nums = append(nums, c)
		}
	}
	r.Cells = cells
	if date == "" || len(nums) == 0 {
		return Line{}, false, nil
	}
	nums = byX(nums, false)
	billed, _ := shekelOf(nums[0])
	scope := ledger.TxLocal
	if sec != secDomestic {
		scope = ledger.TxForeign
	}
	merchant := wordsIn(r.Cells, lcMerchLo, lcMerchHi)
	if merchant == "" {
		return Line{}, false, fmt.Errorf("charge on %s (%s) has no merchant", date, billed)
	}
	kind := wordsIn(r.Cells, lcTypeLo, lcMerchLo)
	notes := wordsIn(r.Cells, 0, lcNotesMax)
	l := Line{Date: date, Amount: billed.Neg(), Scope: scope, Kind: ledger.KindPurchase, Payee: merchant}
	l.IsStandingOrder = strings.Contains(notes, "הוראת קבע")
	l.CurrentInst, l.TotalInst = instOf(notes, kind, merchant)
	var parts []string
	for _, s := range []string{kind, notes} {
		if s != "" {
			parts = append(parts, s)
		}
	}
	l.Notes = strings.Join(parts, "; ")
	return l, true, nil
}
