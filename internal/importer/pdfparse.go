package importer

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/liorokman/finrep/internal/money"
)

// PDFOptions are settings the PDF parsers need.
type PDFOptions struct {
	// CoveragePattern identifies employer-budget lines (spec 4.3a).
	CoveragePattern string
}

// DefaultCoveragePattern is the text of the SAP employer-budget lines.
const DefaultCoveragePattern = "חיוב תקציב סאפ"

var (
	amountCell   = regexp.MustCompile(`^([₪$€£])\s*(-?[\d,]*\d\.\d{2})$`)
	date4Cell    = regexp.MustCompile(`^(\d{2})/(\d{2})/(\d{4})$`)
	date2Cell    = regexp.MustCompile(`^(\d{2})/(\d{2})/(\d{2})$`)
	date2Inside  = regexp.MustCompile(`(\d{2})/(\d{2})/(\d{2})\b`)
	installments = regexp.MustCompile(`תשלום\s+(\d+)\s+מתוך\s+(\d+)`)
)

var symbolCurrency = map[string]money.Currency{"₪": money.ILS, "$": money.USD, "€": money.EUR, "£": money.GBP}

// amountOf parses a cell like "₪ 1,003.05" or "$ -12.50".
func amountOf(c cell) (money.Money, bool) {
	m := amountCell.FindStringSubmatch(strings.TrimSpace(c.Text))
	if m == nil {
		return money.Money{}, false
	}
	cur := symbolCurrency[m[1]]
	v, err := money.Parse(m[2], cur)
	if err != nil {
		return money.Money{}, false
	}
	return v, true
}

func isoFrom4(c cell) (string, bool) {
	m := date4Cell.FindStringSubmatch(strings.TrimSpace(c.Text))
	if m == nil {
		return "", false
	}
	return isoDate(m[3], m[2], m[1])
}

func isoFrom2(s string) (string, bool) {
	m := date2Cell.FindStringSubmatch(strings.TrimSpace(s))
	if m == nil {
		return "", false
	}
	return isoDate("20"+m[3], m[2], m[1])
}

func isoDate(y, m, d string) (string, bool) {
	var yy, mm, dd int
	fmt.Sscanf(y, "%d", &yy)
	fmt.Sscanf(m, "%d", &mm)
	fmt.Sscanf(d, "%d", &dd)
	if mm < 1 || mm > 12 || dd < 1 || dd > 31 {
		return "", false
	}
	return fmt.Sprintf("%04d-%02d-%02d", yy, mm, dd), true
}

// byX returns cells sorted by horizontal position, optionally descending.
func byX(cells []cell, desc bool) []cell {
	out := append([]cell(nil), cells...)
	sort.SliceStable(out, func(i, j int) bool {
		if desc {
			return out[i].X0 > out[j].X0
		}
		return out[i].X0 < out[j].X0
	})
	return out
}

func containsAny(s string, subs ...string) bool {
	for _, x := range subs {
		if x != "" && strings.Contains(s, x) {
			return true
		}
	}
	return false
}

func instOf(texts ...string) (cur, total int) {
	for _, t := range texts {
		if m := installments.FindStringSubmatch(t); m != nil {
			fmt.Sscanf(m[1], "%d", &cur)
			fmt.Sscanf(m[2], "%d", &total)
			return
		}
	}
	return 0, 0
}
