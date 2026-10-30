package importer

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// row builds a synthetic PDF row from alternating x positions and texts.
func row(parts ...any) pdfRow {
	r := pdfRow{Page: 1}
	for i := 0; i < len(parts); i += 2 {
		x := float64(parts[i].(int))
		r.Cells = append(r.Cells, cell{X0: x, X1: x + 10, Text: parts[i+1].(string)})
	}
	return r
}

func calFixture() []pdfRow {
	return []pdfRow{
		row(446, "דף חיוב חודשי ל-10/07/26"),
		row(283, "לכרטיס המסתיים ב-1001 ע\"ש"),
		// billed amount, transaction amount, flag, detail, category, merchant, date
		row(154, "₪ 566.49", 218, "₪ 566.49", 268, "לא", 353, "הוראת קבע", 386, "רפואה", 475, "קרן מכבי", 503, "02/06/2026"),
		row(158, "₪ 902.90", 222, "₪ 902.90", 294, "מזהה כרטיס 2478 Google Pay", 385, "מזון", 440, "טיב טעם", 503, "04/07/2026"),
		row(155, "₪ -770.76", 292, `חיוב תקציב סאפ לאבס ישראל בע"מ`, 385, "מזון", 440, "טיב טעם", 503, "04/07/2026"),
		row(139, "₪ 698.63", 190, "סה\"כ לתאריך 10/07/26"),
		row(452, "פירוט עסקות לחיוב עתידי"),
		row(152, "₪ 597.71", 188, "10/08/26", 246, "₪ 597.71", 352, "הוראת קבע", 386, "רפואה", 475, "קרן מכבי", 503, "02/07/2026"),
	}
}

func TestParseCalRows(t *testing.T) {
	p, err := parseCalRows(calFixture(), "cal.pdf", PDFOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if p.Last4 != "1001" || p.Source != SourceCalPDF {
		t.Fatalf("header: %+v", p)
	}
	if len(p.Lines) != 4 || len(p.Statements) != 1 || p.Statements[0].BillDate != "2026-07-10" ||
		p.Statements[0].PrintedTotal.Minor() != 69863 {
		t.Fatalf("lines=%d statements=%+v", len(p.Lines), p.Statements)
	}
	a, b, cov, fut := p.Lines[0], p.Lines[1], p.Lines[2], p.Lines[3]
	if a.Amount.Minor() != -56649 || !a.IsStandingOrder || a.Payee != "קרן מכבי" || a.BillDate != "2026-07-10" || a.Date != "2026-06-02" {
		t.Fatalf("standing order: %+v", a)
	}
	if b.IsStandingOrder || b.Payee != "טיב טעם" || b.Amount.Minor() != -90290 {
		t.Fatalf("wallet purchase: %+v", b)
	}
	if cov.Kind != ledger.KindEmployerCoverage || cov.Amount.Minor() != 77076 || cov.Covers == nil || *cov.Covers != 1 {
		t.Fatalf("coverage: %+v", cov)
	}
	if fut.BillDate != "2026-08-10" || fut.Date != "2026-07-02" || fut.Amount.Minor() != -59771 {
		t.Fatalf("future charge: %+v", fut)
	}
	if err := Validate(p); err != nil {
		t.Fatalf("the fixture's lines add up to its total: %v", err)
	}
}

func TestParseCalRowsRejectsWrongTotal(t *testing.T) {
	rows := calFixture()
	rows[5] = row(139, "₪ 698.64", 190, "סה\"כ לתאריך 10/07/26")
	p, err := parseCalRows(rows, "cal.pdf", PDFOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if err := Validate(p); err == nil {
		t.Fatal("a statement whose lines are 1 agora off must be rejected")
	}
}

func TestParseCalRowsLayoutErrors(t *testing.T) {
	cases := map[string]func([]pdfRow) []pdfRow{
		"no total row": func(r []pdfRow) []pdfRow { return append(r[:5:5], r[6:]...) },
		"no card":      func(r []pdfRow) []pdfRow { return append(r[:1:1], r[2:]...) },
		"charge without a total": func(r []pdfRow) []pdfRow {
			return append(r[:5:5], row(158, "₪ 5.00", 440, "x", 503, "04/07/2026"))
		},
		"future charge without bill date": func(r []pdfRow) []pdfRow {
			return append(r, row(152, "₪ 5.00", 475, "x", 503, "02/07/2026"))
		},
		"no merchant": func(r []pdfRow) []pdfRow {
			return append(r[:2:2], row(154, "₪ 5.00", 503, "02/06/2026"), r[5])
		},
	}
	for name, mutate := range cases {
		if _, err := parseCalRows(mutate(calFixture()), "cal.pdf", PDFOptions{}); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestParseCalForeignAndInstallments(t *testing.T) {
	rows := []pdfRow{
		row(446, "דף חיוב חודשי ל-10/07/26"),
		row(283, "המסתיים ב-1001"),
		row(154, "₪ 50.00", 218, "$ 13.50", 394, "תיירות", 460, "Booking", 503, "04/06/2026"),
		row(154, "₪ 100.00", 218, "₪ 1,200.00", 340, "תשלום 2 מתוך 12", 394, "ריהוט", 460, "איקאה", 503, "05/06/2026"),
		row(139, "₪ 150.00", 190, "סה\"כ לתאריך 10/07/26"),
	}
	p, err := parseCalRows(rows, "cal.pdf", PDFOptions{})
	if err != nil {
		t.Fatal(err)
	}
	fx, inst := p.Lines[0], p.Lines[1]
	if fx.Scope != ledger.TxForeign || fx.Original == nil || fx.Original.Currency() != money.USD || fx.Original.Minor() != -1350 {
		t.Fatalf("foreign: %+v", fx)
	}
	if inst.Original != nil || inst.Scope != ledger.TxLocal || inst.CurrentInst != 2 || inst.TotalInst != 12 || inst.Amount.Minor() != -10000 {
		t.Fatalf("installment: %+v", inst)
	}
	if err := Validate(p); err != nil {
		t.Fatal(err)
	}
}

func TestParseCalNotAPDF(t *testing.T) {
	if _, err := ParseCal([]byte("hello"), "x.pdf", PDFOptions{}); err == nil {
		t.Fatal("expected error")
	}
}

func TestVisualToLogical(t *testing.T) {
	cases := map[string]string{
		"2 ךותמ 1 דומע":              "עמוד 1 מתוך 2",
		"10/07/26-ל ישדוח בויח ףד":   "דף חיוב חודשי ל-10/07/26",
		"2478 Google Pay סיטרכ ההזמ": "מזהה כרטיס 2478 Google Pay",
		`מ"עב לארשיל למשחה תרבח`:     `חברת החשמל לישראל בע"מ`,
		"₪ -21.50": "₪ -21.50", // no Hebrew: unchanged
		"KFC":      "KFC",
	}
	for in, want := range cases {
		if got := visualToLogical(in); got != want {
			t.Errorf("visualToLogical(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestRealCalPDF runs against the user's real statement when FINREP_PDF_DIR
// points at the data directory; skipped otherwise (the data is private).
func TestRealCalPDF(t *testing.T) {
	dir := os.Getenv("FINREP_PDF_DIR")
	if dir == "" {
		t.Skip("set FINREP_PDF_DIR to run against real statements")
	}
	data, err := os.ReadFile(filepath.Join(dir, "2026-07.pdf"))
	if err != nil {
		t.Skip("2026-07.pdf not found")
	}
	p, err := ParseCal(data, "2026-07.pdf", PDFOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if p.Last4 != "1001" || len(p.Statements) != 1 || p.Statements[0].PrintedTotal.Minor() != 257666 {
		t.Fatalf("statement: %+v", p.Statements)
	}
	if err := Validate(p); err != nil {
		t.Fatalf("real statement must satisfy the total invariant: %v", err)
	}
	for _, l := range p.Lines {
		if strings.TrimSpace(l.Payee) == "" {
			t.Fatalf("empty merchant on %+v", l)
		}
	}
	// Import it twice through the whole pipeline.
	e := setup(t)
	acc, err := e.im.ResolveCard(ctx, p.Last4)
	if err != nil {
		e.l.CreateAccount(ctx, &ledger.Account{Name: "Cal 1001", Type: ledger.CreditCard, Institution: "Cal", Last4: "1001"})
	}
	acc, err = e.im.ResolveCard(ctx, p.Last4)
	if err != nil {
		t.Fatal(err)
	}
	r1, err := e.im.Commit(ctx, acc.ID, p)
	if err != nil || r1.Inserted != len(p.Lines) {
		t.Fatalf("first import: %+v %v", r1, err)
	}
	p2, _ := ParseCal(data, "2026-07.pdf", PDFOptions{})
	if r2, err := e.im.Commit(ctx, acc.ID, p2); err != nil || r2.Inserted != 0 {
		t.Fatalf("second import must add nothing: %+v %v", r2, err)
	}
}

func TestSplitDateFromAMixedCell(t *testing.T) {
	for in, want := range map[string][2]string{
		"21/06/2024":               {"2024-06-21", ""},
		" 21/06/2024וניליה דרורים": {"2024-06-21", "וניליה דרורים"},
		"וניליה דרורים 21/06/2024": {"2024-06-21", "וניליה דרורים"},
		"AMAZON 05/01/2026":        {"2026-01-05", "AMAZON"},
	} {
		iso, rest, ok := splitDate(cell{Text: in})
		if !ok || iso != want[0] || rest != want[1] {
			t.Errorf("%q: got %q %q %v", in, iso, rest, ok)
		}
	}
	for _, in := range []string{"no date here", "31/13/2024", "12/2024"} {
		if _, _, ok := splitDate(cell{Text: in}); ok {
			t.Errorf("%q accepted", in)
		}
	}
}

func TestOpenPDFToleratesJunkBeforeTheHeaderAndAfterEOF(t *testing.T) {
	if _, err := openPDF([]byte("System.IO.MemoryStream not a pdf at all")); err == nil {
		t.Fatal("garbage accepted")
	}
	// A real (generated) minimal PDF, wrapped in junk on both sides, still opens.
	const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R/Size 3>>\n%%EOF"
	if _, err := openPDF([]byte(pdf)); err != nil {
		t.Skipf("the minimal PDF is not accepted by the reader itself: %v", err)
	}
	if _, err := openPDF([]byte("System.IO.MemoryStream" + pdf + "\x00\x00junk")); err != nil {
		t.Fatalf("junk around a valid PDF: %v", err)
	}
}
