package importer

import (
	"fmt"
	"io"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/charset"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// ParseLeumiBank parses a Leumi account-movements export (`תנועות בחשבון`):
// an HTML document saved with an .xls extension. Columns are found by their
// Hebrew header names, so extra or reordered columns do not matter. Amounts are
// signed: credit minus debit. The running balance column is used as an
// integrity check; a break is reported as a warning.
func ParseLeumiBank(r io.Reader, filename string) (*Parsed, error) {
	cr, err := charset.NewReader(r, "text/html")
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", filename, err)
	}
	doc, err := html.Parse(cr)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", filename, err)
	}

	var rows [][]string
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tr" && !hasTable(n) {
			var cells []string
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && (c.Data == "td" || c.Data == "th") {
					cells = append(cells, cellText(c))
				}
			}
			rows = append(rows, cells)
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Locate the header row of the movements table.
	hdr := -1
	var col map[string]int
	for i, cells := range rows {
		m := map[string]int{}
		for j, c := range cells {
			if _, dup := m[c]; !dup {
				m[c] = j
			}
		}
		_, a := m["תאריך"]
		_, b := m["תיאור"]
		_, c := m["בחובה"]
		_, d := m["בזכות"]
		if a && b && c && d {
			hdr, col = i, m
			break
		}
	}
	if hdr < 0 {
		return nil, fmt.Errorf("%s: no movements table found (expected columns תאריך, תיאור, בחובה, בזכות)", filename)
	}
	balCol, ok := -1, false
	for name, idx := range col {
		if strings.HasPrefix(name, "היתרה") {
			balCol, ok = idx, true
		}
	}
	if !ok {
		balCol = -1
	}
	get := func(cells []string, name string) string {
		if idx, ok := col[name]; ok && idx < len(cells) {
			return cells[idx]
		}
		return ""
	}

	p := &Parsed{Source: SourceLeumiBank, Filename: filename}
	var balances []*money.Money
	pending := 0
	for i := hdr + 1; i < len(rows); i++ {
		cells := rows[i]
		date, err := dmyToISO(get(cells, "תאריך"))
		if err != nil {
			continue // not a movement row (summary, empty, footer)
		}
		debit, err := amountOrZero(get(cells, "בחובה"))
		if err != nil {
			return nil, fmt.Errorf("%s row %d: debit: %w", filename, i+1, err)
		}
		credit, err := amountOrZero(get(cells, "בזכות"))
		if err != nil {
			return nil, fmt.Errorf("%s row %d: credit: %w", filename, i+1, err)
		}
		amt, err := credit.Sub(debit)
		if err != nil {
			return nil, err
		}
		if strings.Contains(get(cells, "הערה"), "תנועות היום") {
			// Today's movements are provisional (their reference carries a prefix) and are listed again, settled,
			// in the next export; importing both would count them twice.
			pending++
			continue
		}
		notes := strings.TrimSpace(get(cells, "תאור מורחב") + " " + get(cells, "הערה"))
		p.Lines = append(p.Lines, Line{
			Date: date, Amount: amt, Scope: ledger.TxLocal, Kind: ledger.KindPurchase,
			Payee: get(cells, "תיאור"), Notes: notes, Ref: get(cells, "אסמכתא"),
		})
		var bal *money.Money
		if balCol >= 0 && balCol < len(cells) && strings.TrimSpace(cells[balCol]) != "" {
			if b, err := money.Parse(cells[balCol], money.ILS); err == nil {
				bal = &b
			}
		}
		balances = append(balances, bal)
	}
	if len(p.Lines) == 0 {
		return nil, fmt.Errorf("%s: the movements table has no rows", filename)
	}
	if pending > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%d provisional movement(s) of today were left out; they appear in the next export", pending))
	}
	p.Balances = balances
	if n := balanceBreaks(p.Lines, balances); n > 0 {
		p.Warnings = append(p.Warnings, fmt.Sprintf("%d row(s) do not follow the running balance; check the file", n))
	}
	return p, nil
}

// balanceBreaks counts rows whose balance is not the previous balance plus the
// row's amount, assuming the file lists rows oldest first. It returns 0 for a
// newest-first file whose balances follow in reverse.
func balanceBreaks(lines []Line, bal []*money.Money) int {
	// Some exports list the current day's movement first, ahead of the older
	// rows; that pinned row is not part of the running balance chain.
	if len(lines) > 2 && lines[0].Date > lines[1].Date {
		lines, bal = lines[1:], bal[1:]
	}
	count := func(reverse bool) int {
		breaks := 0
		for i := 1; i < len(lines); i++ {
			cur, prev := i, i-1
			if reverse {
				cur, prev = i-1, i
			}
			if bal[cur] == nil || bal[prev] == nil {
				continue
			}
			if bal[cur].Minor()-bal[prev].Minor() != lines[cur].Amount.Minor() {
				breaks++
			}
		}
		return breaks
	}
	a, b := count(false), count(true)
	if b < a {
		return b
	}
	return a
}

// hasTable reports whether a node contains a nested table (layout rows do).
func hasTable(n *html.Node) bool {
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if (c.Type == html.ElementNode && c.Data == "table") || hasTable(c) {
			return true
		}
	}
	return false
}

func amountOrZero(s string) (money.Money, error) {
	if strings.TrimSpace(s) == "" {
		return money.New(0, money.ILS), nil
	}
	return money.Parse(s, money.ILS)
}

// dmyToISO converts DD/MM/YYYY to YYYY-MM-DD.
func dmyToISO(s string) (string, error) {
	s = strings.TrimSpace(s)
	var d, m, y int
	if n, err := fmt.Sscanf(s, "%d/%d/%d", &d, &m, &y); err != nil || n != 3 || y < 1000 {
		return "", fmt.Errorf("not a date: %q", s)
	}
	if m < 1 || m > 12 || d < 1 || d > 31 {
		return "", fmt.Errorf("not a date: %q", s)
	}
	return fmt.Sprintf("%04d-%02d-%02d", y, m, d), nil
}

func cellText(n *html.Node) string {
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.TextNode {
			b.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return strings.Join(strings.Fields(strings.ReplaceAll(b.String(), " ", " ")), " ")
}

// Chain describes a bank export's running balance in chronological order.
type Chain struct {
	FirstDate, LastDate string
	// BeforeFirst is the balance before the oldest line of the file (the first line's balance minus its amount).
	BeforeFirst money.Money
	// Closing is the balance after the newest line.
	Closing money.Money
}

// BalanceChain reads the running balance of a bank export. Files list rows newest first or oldest first, and
// some pin the current day's movement at the top; the orientation with fewer breaks wins. ok is false when
// the file gives no usable balances.
func (p *Parsed) BalanceChain() (Chain, bool) {
	lines, bal := p.Lines, p.Balances
	if len(lines) < 2 || len(bal) != len(lines) {
		return Chain{}, false
	}
	if len(lines) > 2 && lines[0].Date > lines[1].Date {
		lines, bal = lines[1:], bal[1:]
	}
	breaks := func(reverse bool) int {
		n := 0
		for i := 1; i < len(lines); i++ {
			cur, prev := i, i-1
			if reverse {
				cur, prev = i-1, i
			}
			if bal[cur] != nil && bal[prev] != nil && bal[cur].Minor()-bal[prev].Minor() != lines[cur].Amount.Minor() {
				n++
			}
		}
		return n
	}
	reverse := breaks(true) < breaks(false)
	chron := func(i int) int {
		if reverse {
			return len(lines) - 1 - i
		}
		return i
	}
	first, last := chron(0), chron(len(lines)-1)
	if bal[first] == nil || bal[last] == nil {
		return Chain{}, false
	}
	return Chain{
		FirstDate: lines[first].Date, LastDate: lines[last].Date,
		BeforeFirst: money.New(bal[first].Minor()-lines[first].Amount.Minor(), money.ILS), Closing: *bal[last],
	}, true
}
