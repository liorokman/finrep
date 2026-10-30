package importer

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/unicode"
	"golang.org/x/text/transform"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// DecodeText converts file bytes to UTF-8 text. A UTF-8 or UTF-16 byte-order
// mark is honoured and removed; text that is valid UTF-8 is used as is
// (including 4-byte characters such as emoji); anything else is Windows-1255,
// the encoding Israeli banks use for Hebrew exports.
func DecodeText(raw []byte) (string, error) {
	switch {
	case bytes.HasPrefix(raw, []byte{0xEF, 0xBB, 0xBF}):
		return string(raw[3:]), nil
	case bytes.HasPrefix(raw, []byte{0xFF, 0xFE}), bytes.HasPrefix(raw, []byte{0xFE, 0xFF}):
		out, _, err := transform.Bytes(unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder(), raw)
		if err != nil {
			return "", fmt.Errorf("decode UTF-16: %w", err)
		}
		return string(out), nil
	case utf8.Valid(raw):
		return string(raw), nil
	}
	out, _, err := transform.Bytes(charmap.Windows1255.NewDecoder(), raw)
	if err != nil {
		return "", fmt.Errorf("decode Windows-1255: %w", err)
	}
	return string(out), nil
}

// Date formats the CSV importer accepts; the user picks one, it is never guessed.
var dateLayouts = map[string]string{
	"DD/MM/YYYY": "2/1/2006",
	"DD/MM/YY":   "2/1/06",
	"MM/DD/YYYY": "1/2/2006",
	"YYYY-MM-DD": "2006-01-02",
	"DD.MM.YYYY": "2.1.2006",
	"DD-MM-YYYY": "2-1-2006",
}

// DateFormats lists the supported format names.
func DateFormats() []string {
	return []string{"DD/MM/YYYY", "DD/MM/YY", "MM/DD/YYYY", "YYYY-MM-DD", "DD.MM.YYYY", "DD-MM-YYYY"}
}

// CSVMapping tells the importer which column means what. Columns are named by
// their header text (case and surrounding spaces ignored) or, for files without
// a header row, by 0-based index ("0", "1", …).
type CSVMapping struct {
	HasHeader  bool
	Delimiter  rune // 0 = detect
	DateColumn string
	DateFormat string // one of DateFormats()

	PayeeColumns []string // joined with " - "
	NotesColumn  string

	// Amount: either one signed column, or separate debit and credit columns.
	AmountColumn string
	DebitColumn  string
	CreditColumn string
	InvertSign   bool // for exports where purchases are positive

	OriginalAmountColumn   string
	OriginalCurrencyColumn string
	BillDateColumn         string // issuer bill date, same format as DateColumn
	CurrentInstallmentCol  string
	TotalInstallmentsCol   string

	Currency money.Currency // the account's currency; default ILS
}

// CSVInspection helps the user build a mapping.
type CSVInspection struct {
	Delimiter rune
	Columns   []string
	Sample    [][]string // up to 10 rows after the header
	Rows      int
}

func readCSV(raw []byte, delim rune) ([][]string, rune, error) {
	text, err := DecodeText(raw)
	if err != nil {
		return nil, 0, err
	}
	if delim == 0 {
		delim = detectDelimiter(text)
	}
	r := csv.NewReader(strings.NewReader(text))
	r.Comma = delim
	r.LazyQuotes = true
	r.FieldsPerRecord = -1
	r.TrimLeadingSpace = true
	rows, err := r.ReadAll()
	if err != nil {
		return nil, 0, fmt.Errorf("read CSV: %w", err)
	}
	return rows, delim, nil
}

func detectDelimiter(text string) rune {
	line, _, _ := strings.Cut(text, "\n")
	best, bestN := ',', 0
	for _, d := range []rune{',', ';', '\t'} {
		if n := strings.Count(line, string(d)); n > bestN {
			best, bestN = d, n
		}
	}
	return best
}

// InspectCSV returns the columns and a few sample rows. The first row is taken
// as the header; callers without a header can ignore Columns.
func InspectCSV(raw []byte) (*CSVInspection, error) {
	rows, delim, err := readCSV(raw, 0)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("the file is empty")
	}
	out := &CSVInspection{Delimiter: delim, Columns: rows[0], Rows: len(rows) - 1}
	for i := 1; i < len(rows) && i <= 10; i++ {
		out.Sample = append(out.Sample, rows[i])
	}
	return out, nil
}

type colIndex struct {
	byName map[string]int
	n      int
}

func (c colIndex) find(name string) (int, bool) {
	name = strings.TrimSpace(name)
	if name == "" {
		return -1, false
	}
	if i, ok := c.byName[strings.ToLower(name)]; ok {
		return i, true
	}
	if i, err := strconv.Atoi(name); err == nil && i >= 0 && i < c.n {
		return i, true
	}
	return -1, false
}

// ParseCSV parses a CSV export using m. Rows that cannot be understood are
// listed in Parsed.Rejected with the reason; the others are returned.
func ParseCSV(raw []byte, filename string, m CSVMapping) (*Parsed, error) {
	if m.Currency == "" {
		m.Currency = money.ILS
	}
	layout, ok := dateLayouts[m.DateFormat]
	if !ok {
		return nil, fmt.Errorf("%w: date format must be one of %s", ledger.ErrInvalid, strings.Join(DateFormats(), ", "))
	}
	rows, _, err := readCSV(raw, m.Delimiter)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", filename, err)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("%s: the file is empty", filename)
	}

	ci := colIndex{byName: map[string]int{}}
	start := 0
	width := 0
	for _, r := range rows {
		if len(r) > width {
			width = len(r)
		}
	}
	ci.n = width
	if m.HasHeader {
		start = 1
		for i, h := range rows[0] {
			key := strings.ToLower(strings.TrimSpace(h))
			if _, dup := ci.byName[key]; !dup && key != "" {
				ci.byName[key] = i
			}
		}
	}

	need := func(label, name string) (int, error) {
		i, ok := ci.find(name)
		if !ok {
			return -1, fmt.Errorf("%w: %s column %q was not found in %s", ledger.ErrInvalid, label, name, filename)
		}
		return i, nil
	}
	optional := func(label, name string) (int, error) {
		if strings.TrimSpace(name) == "" {
			return -1, nil
		}
		return need(label, name)
	}

	dateIdx, err := need("date", m.DateColumn)
	if err != nil {
		return nil, err
	}
	var payeeIdx []int
	for _, name := range m.PayeeColumns {
		i, err := need("payee", name)
		if err != nil {
			return nil, err
		}
		payeeIdx = append(payeeIdx, i)
	}
	if len(payeeIdx) == 0 {
		return nil, fmt.Errorf("%w: at least one payee column is required", ledger.ErrInvalid)
	}
	amountIdx, err := optional("amount", m.AmountColumn)
	if err != nil {
		return nil, err
	}
	debitIdx, err := optional("debit", m.DebitColumn)
	if err != nil {
		return nil, err
	}
	creditIdx, err := optional("credit", m.CreditColumn)
	if err != nil {
		return nil, err
	}
	if amountIdx < 0 && debitIdx < 0 && creditIdx < 0 {
		return nil, fmt.Errorf("%w: map an amount column, or debit and credit columns", ledger.ErrInvalid)
	}
	if amountIdx >= 0 && (debitIdx >= 0 || creditIdx >= 0) {
		return nil, fmt.Errorf("%w: use either an amount column or debit/credit columns, not both", ledger.ErrInvalid)
	}
	notesIdx, err := optional("notes", m.NotesColumn)
	if err != nil {
		return nil, err
	}
	origAmtIdx, err := optional("original amount", m.OriginalAmountColumn)
	if err != nil {
		return nil, err
	}
	origCurIdx, err := optional("original currency", m.OriginalCurrencyColumn)
	if err != nil {
		return nil, err
	}
	billIdx, err := optional("bill date", m.BillDateColumn)
	if err != nil {
		return nil, err
	}
	instIdx, err := optional("current installment", m.CurrentInstallmentCol)
	if err != nil {
		return nil, err
	}
	totIdx, err := optional("total installments", m.TotalInstallmentsCol)
	if err != nil {
		return nil, err
	}

	cellAt := func(row []string, i int) string {
		if i < 0 || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}
	parseDate := func(s string) (string, error) {
		t, err := time.Parse(layout, s)
		if err != nil {
			return "", fmt.Errorf("date %q does not match %s", s, m.DateFormat)
		}
		return t.Format("2006-01-02"), nil
	}

	p := &Parsed{Source: SourceCSV, Filename: filename}
	for i := start; i < len(rows); i++ {
		row := rows[i]
		if len(row) == 0 || (len(row) == 1 && strings.TrimSpace(row[0]) == "") {
			continue
		}
		reject := func(reason string, a ...any) {
			p.Rejected = append(p.Rejected, Rejected{Row: i + 1, Reason: fmt.Sprintf(reason, a...), Raw: row})
		}
		date, err := parseDate(cellAt(row, dateIdx))
		if err != nil {
			reject("%v", err)
			continue
		}
		var parts []string
		for _, pi := range payeeIdx {
			if v := cellAt(row, pi); v != "" {
				parts = append(parts, v)
			}
		}
		if len(parts) == 0 {
			reject("no payee")
			continue
		}
		amt, err := csvAmount(row, m, amountIdx, debitIdx, creditIdx, cellAt)
		if err != nil {
			reject("%v", err)
			continue
		}
		l := Line{Date: date, Amount: amt, Scope: ledger.TxLocal, Kind: ledger.KindPurchase, Payee: strings.Join(parts, " - "), Notes: cellAt(row, notesIdx)}
		if s := cellAt(row, billIdx); s != "" {
			bd, err := parseDate(s)
			if err != nil {
				reject("bill %v", err)
				continue
			}
			l.BillDate = bd
		}
		if s, c := cellAt(row, origAmtIdx), cellAt(row, origCurIdx); s != "" && c != "" {
			cur, err := money.ParseCurrency(c)
			if err != nil {
				reject("original currency: %v", err)
				continue
			}
			if cur != m.Currency {
				v, err := money.Parse(s, cur)
				if err != nil {
					reject("original amount: %v", err)
					continue
				}
				v = v.Abs() // the original amount carries the same direction as the billed one
				if amt.IsNegative() {
					v = v.Neg()
				}
				l.Original, l.Scope = &v, ledger.TxForeign
			}
		}
		if s, t := cellAt(row, instIdx), cellAt(row, totIdx); s != "" && t != "" {
			cur, e1 := strconv.Atoi(s)
			tot, e2 := strconv.Atoi(t)
			if e1 != nil || e2 != nil || cur < 1 || cur > tot {
				reject("installments %q of %q are not valid", s, t)
				continue
			}
			l.CurrentInst, l.TotalInst = cur, tot
		}
		p.Lines = append(p.Lines, l)
	}
	if len(p.Lines) == 0 && len(p.Rejected) == 0 {
		return nil, fmt.Errorf("%s: no data rows", filename)
	}
	return p, nil
}

func csvAmount(row []string, m CSVMapping, amountIdx, debitIdx, creditIdx int, cellAt func([]string, int) string) (money.Money, error) {
	if amountIdx >= 0 {
		s := cellAt(row, amountIdx)
		v, err := money.Parse(s, m.Currency)
		if err != nil {
			return money.Money{}, fmt.Errorf("amount: %v", err)
		}
		if m.InvertSign {
			v = v.Neg()
		}
		return v, nil
	}
	dS, cS := cellAt(row, debitIdx), cellAt(row, creditIdx)
	if dS == "" && cS == "" {
		return money.Money{}, fmt.Errorf("both debit and credit are empty")
	}
	var debit, credit money.Money
	var err error
	if dS != "" {
		if debit, err = money.Parse(dS, m.Currency); err != nil {
			return money.Money{}, fmt.Errorf("debit: %v", err)
		}
	}
	if cS != "" {
		if credit, err = money.Parse(cS, m.Currency); err != nil {
			return money.Money{}, fmt.Errorf("credit: %v", err)
		}
	}
	// Debits leave the account, credits enter it, whatever sign the file uses.
	return money.New(credit.Abs().Minor()-debit.Abs().Minor(), m.Currency), nil
}
