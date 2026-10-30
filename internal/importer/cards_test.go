package importer

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// Synthetic Isracard rows: real column geometry, invented merchants.
func isracardFixture() []pdfRow {
	return []pdfRow{
		row(305, "|   1002", 336, "בספרות:", 368, "שמסתיים", 403, "כרטיס"),
		row(407, "10/07/26", 442, "לתאריך:", 472, "פעולותיך", 505, "פרוט"),
		row(427, `בחו"ל`, 457, "רכישות"),
		row(166, "4.00", 355, "₪ 4.00", 383, "STORE ONE", 483, "א", 490, "02/05/26"),
		row(383, "LONDON"), // city line: not a transaction
		row(165, "18.47", 203, "0.00", 226, "2.9080", 255, "19/05/26", 356, "6.35", 371, "$", 383, "SHOP TWO", 483, "א", 492, "18/05/26"),
		row(276, "₪ 0.54", 294, "הנחה :"), // fee annotation: not a transaction
		row(157, "22.47", 412, "02/07/26", 451, "לתאריך", 481, "חיוב", 499, `סה"כ`),
		row(359, "בארץ", 386, "זוכו -", 413, "/", 422, "שחויבו", 459, "עסקות"),
		row(206, "זיכוי", 242, "-0.34", 288, "0.34", 312, "CASHBACK", 404, "TOPCASH", 450, "הוצג", 467, "לא", 488, "30/06/26"),
		row(240, "85.00", 282, "85.00", 335, "שונות", 365, "יזמות", 385, "מרכז", 404, "קדימה", 428, "מ.מ", 450, "הוצג", 467, "לא", 489, "02/07/26"),
		row(235, "84.66", 415, "10/07/26", 453, "לתאריך", 483, "חיוב", 501, `סה"כ`),
	}
}

func TestParseIsracardRows(t *testing.T) {
	p, err := parseIsracardRows(isracardFixture(), "isr.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if p.Last4 != "1002" || len(p.Lines) != 4 || len(p.Statements) != 2 {
		t.Fatalf("last4=%s lines=%d statements=%d", p.Last4, len(p.Lines), len(p.Statements))
	}
	if p.Statements[0].BillDate != "2026-07-02" || p.Statements[0].PrintedTotal.Minor() != 2247 ||
		p.Statements[1].BillDate != "2026-07-10" || p.Statements[1].PrintedTotal.Minor() != 8466 {
		t.Fatalf("statements: %+v", p.Statements)
	}
	plain, usd, credit, shop := p.Lines[0], p.Lines[1], p.Lines[2], p.Lines[3]
	if plain.Scope != ledger.TxForeign || plain.Original != nil || plain.Amount.Minor() != -400 || plain.Payee != "STORE ONE" || plain.BillDate != "2026-07-02" {
		t.Fatalf("shekel abroad: %+v", plain)
	}
	if usd.Original == nil || usd.Original.Currency() != money.USD || usd.Original.Minor() != -635 || usd.Amount.Minor() != -1847 || usd.Date != "2026-05-18" {
		t.Fatalf("usd abroad: %+v", usd)
	}
	if credit.Scope != ledger.TxLocal || credit.Amount.Minor() != 34 || credit.Payee != "TOPCASH" || credit.BillDate != "2026-07-10" {
		t.Fatalf("credit: %+v", credit)
	}
	if shop.Payee != "מ.מ קדימה מרכז יזמות" || shop.Amount.Minor() != -8500 {
		t.Fatalf("merchant words must read right to left: %+v", shop)
	}
	if err := Validate(p); err != nil {
		t.Fatal(err)
	}
}

func TestParseIsracardLayoutErrors(t *testing.T) {
	f := isracardFixture()
	cases := map[string][]pdfRow{
		"no total":    append(append([]pdfRow{}, f[:7]...), f[8:]...),
		"no card":     f[1:],
		"no sections": append([]pdfRow{f[0]}, f[3]),
	}
	for name, rows := range cases {
		if _, err := parseIsracardRows(rows, "isr.pdf"); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
	// A total that disagrees with the lines is caught by Validate.
	bad := isracardFixture()
	bad[7] = row(157, "22.48", 412, "02/07/26", 451, "לתאריך", 481, "חיוב", 499, `סה"כ`)
	p, err := parseIsracardRows(bad, "isr.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if Validate(p) == nil {
		t.Fatal("one agora off must be rejected")
	}
}

func leumiFixture() []pdfRow {
	return []pdfRow{
		row(109, "10/07/26", 137, "לתאריך", 160, "בחשבון", 183, "החיובים", 206, "פירוט"),
		row(396, "1003", 413, "ב-", 421, "שמסתיים", 455, "לכרטיס"),
		row(424, "החיוב", 446, "ביום", 464, "לפרעון", 492, "עסקות"),
		row(246, "74.90", 294, "74.90", 354, "חודש", 369, "דחוי", 385, "Google One", 469, "Mountai", 495, "20/05/26"),
		row(239, "₪ 74.90", 355, ": 10/07/26", 388, "בתאריך", 413, "10-946-39213588", 469, "לחשבון", 494, "חיוב", 507, `סה"כ`),
		row(387, "(לידיעה)", 420, "עתידי", 444, "חיוב", 461, `בחו"ל /`, 492, "עסקות"),
		row(126, "₪ 74.90", 360, "₪ 74.90", 385, "Google One", 471, "Mountai", 495, "20/06/26"),
		row(398, "10/08/26", 425, "בתאריך", 450, "לחיוב", 468, "חודש", 491, "דחוי", 504, "הערה:"),
		row(126, "₪ 74.90", 511, `סה"כ`),
		row(441, `בש"ח`, 463, "בארץ /", 492, "עסקות"),
		row(238, "1,274.00", 285, "1,274.00", 367, "רגילה", 452, "חובה", 466, "רכב", 479, "מגדל", 497, "11/06/26", 526, "7"),
		row(178, "קבע", 192, "הוראת", 243, "130.11", 291, "130.11", 367, "רגילה", 476, "פוינטר", 497, "29/06/26", 526, "7"),
		row(310, "יולי", 329, "עבור:", 413, "הועבר ל:"), // wrapped note: ignored
		row(232, "₪ 1,404.11", 355, ": 10/07/26", 388, "בתאריך", 413, "10-946-39213588", 469, "לחשבון", 494, "חיוב", 507, `סה"כ`),
	}
}

func TestParseLeumiCardRows(t *testing.T) {
	p, err := parseLeumiCardRows(leumiFixture(), "leumi.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if p.Last4 != "1003" || len(p.Lines) != 4 || len(p.Statements) != 1 {
		t.Fatalf("last4=%s lines=%d statements=%+v", p.Last4, len(p.Lines), p.Statements)
	}
	// The due-now section and the domestic section share one bill date and are summed.
	if p.Statements[0].BillDate != "2026-07-10" || p.Statements[0].PrintedTotal.Minor() != 147901 {
		t.Fatalf("statement: %+v", p.Statements[0])
	}
	due, future, dom, standing := p.Lines[0], p.Lines[1], p.Lines[2], p.Lines[3]
	if due.Scope != ledger.TxForeign || due.BillDate != "2026-07-10" || due.Payee != "Google One Mountai" || due.Date != "2026-05-20" {
		t.Fatalf("deferred foreign: %+v", due)
	}
	if future.BillDate != "2026-08-10" || future.Date != "2026-06-20" || future.Amount.Minor() != -7490 {
		t.Fatalf("future charge takes its bill date from the note below it: %+v", future)
	}
	if dom.Scope != ledger.TxLocal || dom.Payee != "מגדל רכב חובה" || dom.Amount.Minor() != -127400 || dom.IsStandingOrder {
		t.Fatalf("domestic: %+v", dom)
	}
	if !standing.IsStandingOrder || standing.Payee != "פוינטר" {
		t.Fatalf("standing order: %+v", standing)
	}
	if err := Validate(p); err != nil {
		t.Fatal(err)
	}
}

func TestParseLeumiCardLayoutErrors(t *testing.T) {
	f := leumiFixture()
	cases := map[string][]pdfRow{
		"no card":                         f[:1:1],
		"no total":                        append(append([]pdfRow{}, f[:4]...), f[5:13]...),
		"future line without a bill date": append(append([]pdfRow{}, f[:7]...), f[8:]...),
	}
	for name, rows := range cases {
		if _, err := parseLeumiCardRows(rows, "leumi.pdf"); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

// TestRealStatementsMatchTheBank is the ground-truth check. With
// FINREP_PDF_DIR (the statements) and FINREP_BANK_DIR (the bank exports) set,
// it parses every real statement and requires that each statement's printed
// total equals an actual bank debit made on its bill date (or the next two
// days, for weekends) by the right issuer.
func TestRealStatementsMatchTheBank(t *testing.T) {
	pdfs, banks := os.Getenv("FINREP_PDF_DIR"), os.Getenv("FINREP_BANK_DIR")
	if pdfs == "" || banks == "" {
		t.Skip("set FINREP_PDF_DIR and FINREP_BANK_DIR to run against real data")
	}
	var bank []Line
	files, _ := filepath.Glob(filepath.Join(banks, "תנועות*.xls"))
	for _, f := range files {
		fh, err := os.Open(f)
		if err != nil {
			t.Fatal(err)
		}
		p, err := ParseLeumiBank(fh, filepath.Base(f))
		fh.Close()
		if err != nil {
			t.Fatal(err)
		}
		bank = append(bank, p.Lines...)
	}
	if len(bank) == 0 {
		t.Skip("no bank exports")
	}
	cases := []struct {
		file, issuer string
		parse        func([]byte, string, PDFOptions) (*Parsed, error)
		last4        string
	}{
		{"2026-07.pdf", "כרטיסי אשראי", ParseCal, "1001"},
		{"Isracard-2026-07.pdf", "ישראכרט", ParseIsracard, "1002"},
		{"leumi-2026-07.pdf", "לאומי מאסטרקרד", ParseLeumiCard, "1003"},
	}
	for _, c := range cases {
		data, err := os.ReadFile(filepath.Join(pdfs, c.file))
		if err != nil {
			t.Logf("skipping %s: %v", c.file, err)
			continue
		}
		p, err := c.parse(data, c.file, PDFOptions{})
		if err != nil {
			t.Fatalf("%s: %v", c.file, err)
		}
		if p.Last4 != c.last4 {
			t.Errorf("%s: card %s, want %s", c.file, p.Last4, c.last4)
		}
		if err := Validate(p); err != nil {
			t.Errorf("%s: %v", c.file, err)
		}
		for _, s := range p.Statements {
			found := false
			for _, b := range bank {
				if b.Amount.Minor() == -s.PrintedTotal.Minor() && containsAny(b.Payee, c.issuer) &&
					b.Date >= s.BillDate && b.Date <= addDays(s.BillDate, 2) {
					found = true
				}
			}
			if !found {
				t.Errorf("%s: statement %s printed %s but the bank shows no matching %s debit", c.file, s.BillDate, s.PrintedTotal, c.issuer)
			}
		}
	}
}

// TestRealStatementsImportAndReconcile imports all real statements and checks,
// in SQL, that each stored statement's lines add up to its printed total.
func TestRealStatementsImportAndReconcile(t *testing.T) {
	dir := os.Getenv("FINREP_PDF_DIR")
	if dir == "" {
		t.Skip("set FINREP_PDF_DIR to run against real statements")
	}
	e := setup(t)
	for _, a := range []struct{ name, inst, last4 string }{{"Isracard 1002", "Isracard", "1002"}, {"Leumi 1003", "Leumi", "1003"}} {
		if err := e.l.CreateAccount(ctx, &ledger.Account{Name: a.name, Type: ledger.CreditCard, Institution: a.inst, Last4: a.last4}); err != nil {
			t.Fatal(err)
		}
	}
	files := []struct {
		name  string
		parse func([]byte, string, PDFOptions) (*Parsed, error)
	}{{"2026-07.pdf", ParseCal}, {"Isracard-2026-07.pdf", ParseIsracard}, {"leumi-2026-07.pdf", ParseLeumiCard}}
	imported := 0
	for pass := 0; pass < 2; pass++ {
		for _, f := range files {
			data, err := os.ReadFile(filepath.Join(dir, f.name))
			if err != nil {
				t.Skipf("%s missing", f.name)
			}
			p, err := f.parse(data, f.name, PDFOptions{})
			if err != nil {
				t.Fatalf("%s: %v", f.name, err)
			}
			acc, err := e.im.ResolveCard(ctx, p.Last4)
			if err != nil {
				t.Fatal(err)
			}
			r, err := e.im.Commit(ctx, acc.ID, p)
			if err != nil {
				t.Fatalf("%s: %v", f.name, err)
			}
			if pass == 0 {
				imported += r.Inserted
			} else if r.Inserted != 0 {
				t.Fatalf("%s: second import inserted %d", f.name, r.Inserted)
			}
		}
	}
	rows, err := e.st.Query(`SELECT s.bill_date, s.printed_total_minor, COALESCE(-SUM(t.amount_minor), 0)
		FROM statements s LEFT JOIN transactions t ON t.statement_id = s.id
		WHERE s.printed_total_minor IS NOT NULL GROUP BY s.id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		var bill string
		var printed, sum int64
		rows.Scan(&bill, &printed, &sum)
		if printed != sum {
			t.Errorf("statement %s: printed %d but its stored lines add up to %d", bill, printed, sum)
		}
		n++
	}
	if n != 4 { // Cal 10/07, Isracard 02/07 and 10/07, Leumi 10/07
		t.Errorf("expected 4 statements with totals, got %d", n)
	}
	t.Logf("%d lines imported across %d statements", imported, n)
}
