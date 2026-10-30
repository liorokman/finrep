package importer

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

var (
	calHeaderDate = regexp.MustCompile(`חיוב חודשי ל-?\s*(\d{2}/\d{2}/\d{2})`)
	calCardNumber = regexp.MustCompile(`המסתיים ב-?\s*(\d{4})`)
	calTotalRow   = regexp.MustCompile(`סה"כ לתאריך\s*(\d{2}/\d{2}/\d{2})`)
)

// ParseCal parses a Cal monthly billing page (דף חיוב חודשי).
func ParseCal(data []byte, filename string, opt PDFOptions) (*Parsed, error) {
	rows, err := pdfRows(data)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", filename, err)
	}
	return parseCalRows(rows, filename, opt)
}

func parseCalRows(rows []pdfRow, filename string, opt PDFOptions) (*Parsed, error) {
	if opt.CoveragePattern == "" {
		opt.CoveragePattern = DefaultCoveragePattern
	}
	p := &Parsed{Source: SourceCalPDF, Filename: filename}
	var headerBill string
	var pending []int // lines awaiting the statement total that follows them
	future := false

	for _, r := range rows {
		text := r.Text()
		if headerBill == "" {
			if m := calHeaderDate.FindStringSubmatch(text); m != nil {
				if iso, ok := isoFrom2(m[1]); ok {
					headerBill = iso
				}
			}
		}
		if p.Last4 == "" {
			if m := calCardNumber.FindStringSubmatch(text); m != nil {
				p.Last4 = m[1]
			}
		}
		if strings.Contains(text, "לחיוב עתידי") && !strings.Contains(text, "₪") {
			if len(pending) > 0 {
				return nil, fmt.Errorf("%s: the future-charges section starts but %d charge(s) have no statement total", filename, len(pending))
			}
			future = true
			continue
		}
		if m := calTotalRow.FindStringSubmatch(text); m != nil {
			iso, ok := isoFrom2(m[1])
			if !ok {
				return nil, fmt.Errorf("%s: unreadable statement date %q", filename, m[1])
			}
			var total *money.Money
			for _, c := range r.Cells {
				if a, ok := amountOf(c); ok {
					total = &a
				}
			}
			if total == nil {
				return nil, fmt.Errorf("%s: statement total row for %s has no amount", filename, iso)
			}
			for _, i := range pending {
				p.Lines[i].BillDate = iso
			}
			pending = nil
			p.Statements = append(p.Statements, Statement{BillDate: iso, PrintedTotal: total})
			if headerBill != "" && iso != headerBill {
				p.Warnings = append(p.Warnings, fmt.Sprintf("statement total is for %s but the page header says %s", iso, headerBill))
			}
			continue
		}
		line, ok, err := calLine(r, future, opt)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", filename, err)
		}
		if !ok {
			continue
		}
		p.Lines = append(p.Lines, line)
		if !future {
			pending = append(pending, len(p.Lines)-1)
		}
	}

	if p.Last4 == "" {
		return nil, fmt.Errorf("%s: could not find the card number (expected 'המסתיים ב-NNNN')", filename)
	}
	if len(pending) > 0 {
		return nil, fmt.Errorf("%s: %d transaction line(s) are not followed by a statement total; unsupported layout", filename, len(pending))
	}
	if len(p.Statements) == 0 {
		return nil, fmt.Errorf("%s: no statement total found (expected 'סה\"כ לתאריך'); unsupported layout", filename)
	}
	PairCoverage(p)
	return p, nil
}

// calLine interprets one row as a transaction. ok is false for rows that are
// not transactions (headers, wrapped text, summaries).
func calLine(r pdfRow, future bool, opt PDFOptions) (Line, bool, error) {
	var amounts, texts []cell
	date, billDate := "", ""
	var dateCell cell
	for _, c := range r.Cells {
		if a, ok := amountOf(c); ok {
			_ = a
			amounts = append(amounts, c)
		} else if d, ok := isoFrom4(c); ok {
			date, dateCell = d, c
		} else if d, ok := isoFrom2(c.Text); ok {
			billDate = d
		} else {
			texts = append(texts, c)
		}
	}
	if date == "" || len(amounts) == 0 {
		return Line{}, false, nil
	}
	if future && billDate == "" {
		return Line{}, false, fmt.Errorf("future charge on %s has no bill date", date)
	}
	amounts = byX(amounts, false)
	billed, _ := amountOf(amounts[0])
	if billed.Currency() != money.ILS {
		return Line{}, false, fmt.Errorf("charge on %s is billed in %s, expected ILS", date, billed.Currency())
	}
	l := Line{
		Date: date, Amount: billed.Neg(), Scope: ledger.TxLocal, Kind: ledger.KindPurchase,
	}
	if future {
		l.BillDate = billDate
	}
	if len(amounts) > 1 {
		if t, _ := amountOf(amounts[1]); t.Currency() != money.ILS {
			o := t.Neg()
			l.Original, l.Scope = &o, ledger.TxForeign
		}
	}

	// Remaining text cells, closest to the date first: merchant, category, then details.
	var merchant, category string
	var details []string
	for _, c := range byX(texts, true) {
		t := strings.TrimSpace(c.Text)
		switch {
		case t == "לא" || t == "כן":
		case containsAny(t, opt.CoveragePattern):
			l.Kind = ledger.KindEmployerCoverage
			details = append(details, t)
		case strings.Contains(t, "הוראת קבע"):
			l.IsStandingOrder = true
			details = append(details, t)
		case strings.Contains(t, "מזהה כרטיס"):
			details = append(details, t)
		case merchant == "":
			merchant = t
		case category == "":
			category = t
		default:
			details = append(details, t)
		}
	}
	if merchant == "" {
		return Line{}, false, fmt.Errorf("charge on %s (%s) has no merchant", date, billed)
	}
	l.Payee = merchant
	l.CurrentInst, l.TotalInst = instOf(append([]string{merchant, category}, details...)...)
	var notes []string
	if category != "" {
		notes = append(notes, category)
	}
	l.Notes = strings.Join(append(notes, details...), "; ")
	_ = dateCell
	return l, true, nil
}
