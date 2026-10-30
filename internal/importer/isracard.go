package importer

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

var (
	isracardCard   = regexp.MustCompile(`בספרות:\s*\|?\s*(\d{4})`)
	isracardHeader = regexp.MustCompile(`פעולותיך לתאריך:?\s*(\d{2}/\d{2}/\d{2})`)
	isracardTotal  = regexp.MustCompile(`סה"כ חיוב לתאריך\s*(\d{2}/\d{2}/\d{2})`)
)

// Isracard column bands (left edge, in PDF points), taken from the statement's
// header rows. The statement-total check catches a layout that drifts.
const (
	isrDateMin       = 480.0 // purchase date
	isrForeignMerch  = 380.0 // foreign section: merchant starts here
	isrDomCard       = 446.0 // domestic: payment-method flags start here
	isrDomMerchant   = 362.0 // domestic: merchant words start here
	isrDomSector     = 295.0 // domestic: sector (ענף) lies between here and the merchant
	isrForeignOrigLo = 340.0 // foreign: original amount and its currency symbol
)

// ParseIsracard parses an Isracard monthly statement (פירוט פעולותיך).
func ParseIsracard(data []byte, filename string, opt PDFOptions) (*Parsed, error) {
	rows, err := pdfRows(data)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", filename, err)
	}
	return parseIsracardRows(rows, filename)
}

func parseIsracardRows(rows []pdfRow, filename string) (*Parsed, error) {
	p := &Parsed{Source: SourceIsracard, Filename: filename}
	var headerBill string
	var scope ledger.TxScope
	var pending []int

	for _, r := range rows {
		text := r.Text()
		if p.Last4 == "" {
			if m := isracardCard.FindStringSubmatch(text); m != nil {
				p.Last4 = m[1]
			}
		}
		if headerBill == "" {
			if m := isracardHeader.FindStringSubmatch(text); m != nil {
				if iso, ok := isoFrom2(m[1]); ok {
					headerBill = iso
				}
			}
		}
		isForeignHeader := strings.Contains(text, `רכישות בחו"ל`) && len(r.Cells) <= 3
		isLocalHeader := strings.Contains(text, "עסקות שחויבו")
		// A section that runs onto the next page repeats its header; that is a continuation, not a new section.
		sameScope := (isForeignHeader && scope == ledger.TxForeign) || (isLocalHeader && scope == ledger.TxLocal)
		if (isForeignHeader || isLocalHeader) && len(pending) > 0 && !sameScope {
			return nil, fmt.Errorf("%s: a new section starts but %d charge(s) of the previous one have no total", filename, len(pending))
		}
		if isForeignHeader {
			scope = ledger.TxForeign
			continue
		}
		if isLocalHeader {
			scope = ledger.TxLocal
			continue
		}
		if m := isracardTotal.FindStringSubmatch(text); m != nil {
			iso, ok := isoFrom2(m[1])
			if !ok {
				return nil, fmt.Errorf("%s: unreadable statement date %q", filename, m[1])
			}
			var total *money.Money
			for _, c := range r.Cells {
				if v, ok := shekelOf(c); ok {
					total = &v
				}
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
		line, ok, err := isracardLine(r, scope)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filename, err)
		}
		if ok {
			p.Lines = append(p.Lines, line)
			pending = append(pending, len(p.Lines)-1)
		}
	}
	if p.Last4 == "" {
		return nil, fmt.Errorf("%s: could not find the card number (expected 'בספרות: NNNN')", filename)
	}
	if len(pending) > 0 {
		return nil, fmt.Errorf("%s: %d transaction line(s) are not followed by a statement total; unsupported layout", filename, len(pending))
	}
	if len(p.Statements) == 0 {
		return nil, fmt.Errorf("%s: no statement total found (expected 'סה\"כ חיוב לתאריך'); unsupported layout", filename)
	}
	_ = headerBill
	PairCoverage(p)
	return p, nil
}

func isracardLine(r pdfRow, scope ledger.TxScope) (Line, bool, error) {
	// The purchase date is the right-most DD/MM/YY cell.
	date := ""
	var nums, symbols []cell
	for i, c := range r.Cells {
		if c.X0 >= isrDateMin {
			if d, ok := isracardDate(c); ok {
				date = d
				continue
			}
		}
		if _, ok := shekelOf(c); ok {
			// An amount printed beside a discount note ("₪ 2.50 הנחה") is part of the note, not the charge.
			if i+1 < len(r.Cells) && strings.Contains(r.Cells[i+1].Text, "הנחה") {
				continue
			}
			nums = append(nums, c)
		} else if _, ok := symbolCurrency[strings.TrimSpace(c.Text)]; ok {
			symbols = append(symbols, c)
		}
	}
	if date == "" || len(nums) == 0 {
		return Line{}, false, nil
	}
	if scope == "" {
		return Line{}, false, fmt.Errorf("charge on %s appears before any section header", date)
	}
	nums = byX(nums, false)
	billed, _ := shekelOf(nums[0])
	l := Line{Date: date, Amount: billed.Neg(), Scope: scope, Kind: ledger.KindPurchase}

	var merchant, sector, flags string
	if scope == ledger.TxForeign {
		merchant = wordsIn(r.Cells, isrForeignMerch, isrDateMin)
		// Original amount and currency: a symbol cell next to a number in the original band.
		for _, s := range symbols {
			if s.X0 < isrForeignOrigLo || s.X0 >= isrForeignMerch {
				continue
			}
			if cur := symbolCurrency[strings.TrimSpace(s.Text)]; cur != money.ILS {
				for _, n := range nums {
					if n.X0 >= isrForeignOrigLo && n.X0 < isrForeignMerch {
						v, _ := shekelOf(n)
						o := money.New(-v.Minor(), cur)
						l.Original = &o
					}
				}
			}
		}
	} else {
		cells := r.Cells
		// A Latin merchant can start a little left of the merchant band. (Latin text further left is a sector label such as CASHBACK.)
		shifted := make([]cell, len(cells))
		copy(shifted, cells)
		for i, c := range shifted {
			if c.X0 >= isrDomMerchant-25 && c.X0 < isrDomMerchant && !hasHebrew(c.Text) && hasLatin(c.Text) {
				shifted[i].X0 = isrDomMerchant
			}
		}
		merchant = wordsIn(shifted, isrDomMerchant, isrDomCard)
		sector = wordsIn(shifted, isrDomSector, isrDomMerchant)
		flags = wordsIn(r.Cells, isrDomCard, isrDateMin)
	}
	if merchant == "" {
		return Line{}, false, fmt.Errorf("charge on %s (%s) has no merchant", date, billed)
	}
	l.Payee = merchant
	var detail []string
	for _, c := range r.Cells {
		if _, isNum := shekelOf(c); c.X0 < isrDomSector && scope == ledger.TxLocal && !isNum {
			detail = append(detail, strings.TrimSpace(c.Text))
		}
	}
	all := strings.Join(detail, " ")
	l.IsStandingOrder = strings.Contains(all, "הוראת קבע") || strings.Contains(flags, "הוראת קבע")
	l.CurrentInst, l.TotalInst = instOf(all, merchant, flags)
	var notes []string
	for _, s := range []string{sector, flags, all} {
		if s != "" {
			notes = append(notes, s)
		}
	}
	l.Notes = strings.Join(notes, "; ")
	return l, true, nil
}

// older statements print the payment flag glued to the purchase date ("02/06/23ל")
var isracardDateGlued = regexp.MustCompile(`^(?:\p{L}\s*)?(\d{2}/\d{2}/\d{2})(?:\s*\p{L})?$`)

func isracardDate(c cell) (string, bool) {
	if d, ok := isoShort(c); ok {
		return d, true
	}
	if m := isracardDateGlued.FindStringSubmatch(strings.TrimSpace(c.Text)); m != nil {
		return isoShort(cell{X0: c.X0, X1: c.X1, Text: m[1]})
	}
	return "", false
}

func hasHebrew(s string) bool {
	for _, r := range s {
		if r >= 0x0590 && r <= 0x05FF {
			return true
		}
	}
	return false
}

func hasLatin(s string) bool {
	for _, r := range s {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			return true
		}
	}
	return false
}
