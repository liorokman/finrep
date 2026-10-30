package importer

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

type env struct {
	st   *store.Store
	l    *ledger.Ledger
	im   *Importer
	bank *ledger.Account
	card *ledger.Account
}

func setup(t *testing.T) *env {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	e := &env{st: st, l: l, im: New(st, l)}
	e.bank = &ledger.Account{Name: "Leumi", Type: ledger.Bank, Institution: "Leumi"}
	e.card = &ledger.Account{Name: "Cal 1001", Type: ledger.CreditCard, Institution: "Cal", Last4: "1001"}
	for _, a := range []*ledger.Account{e.bank, e.card} {
		if err := l.CreateAccount(ctx, a); err != nil {
			t.Fatal(err)
		}
	}
	return e
}

func ils(minor int64) money.Money { return money.New(minor, money.ILS) }

func purchase(date string, minor int64, payee, bill string) Line {
	return Line{Date: date, Amount: ils(minor), Scope: ledger.TxLocal, Kind: ledger.KindPurchase, Payee: payee, BillDate: bill}
}

func count(t *testing.T, e *env, q string, args ...any) int {
	t.Helper()
	var n int
	if err := e.st.QueryRow(q, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestKeyIsStableAndIgnoresDatabase(t *testing.T) {
	l := purchase("2026-06-14", -5336, "סיבוס", "2026-07-10")
	if Key("a", l, 1) != Key("a", l, 1) {
		t.Fatal("key not deterministic")
	}
	for name, other := range map[string]string{
		"account": Key("b", l, 1),
		"n":       Key("a", l, 2),
	} {
		if other == Key("a", l, 1) {
			t.Errorf("key ignores %s", name)
		}
	}
	m := l
	m.Amount = ils(-5337)
	if Key("a", m, 1) == Key("a", l, 1) {
		t.Error("key ignores amount")
	}
	m = l
	m.BillDate = "2026-08-10"
	if Key("a", m, 1) == Key("a", l, 1) {
		t.Error("key ignores bill date")
	}
}

func TestInFileOrdinalsAndReimportInsertsNothing(t *testing.T) {
	e := setup(t)
	mk := func() *Parsed {
		return &Parsed{Source: SourceCSV, Filename: "f.csv", Lines: []Line{
			purchase("2026-06-14", -5336, "סיבוס", ""),
			purchase("2026-06-14", -5336, "סיבוס", ""), // genuine identical purchase
			purchase("2026-06-15", -1000, "other", ""),
		}}
	}
	r1, err := e.im.Commit(ctx, e.bank.ID, mk())
	if err != nil || r1.Inserted != 3 || r1.Duplicates != 0 {
		t.Fatalf("first: %+v %v", r1, err)
	}
	r2, err := e.im.Commit(ctx, e.bank.ID, mk())
	if err != nil || r2.Inserted != 0 || r2.Duplicates != 3 {
		t.Fatalf("re-import must add nothing: %+v %v", r2, err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions`); n != 3 {
		t.Fatalf("rows = %d", n)
	}
}

func TestOverlappingExportsInsertOnlyTheExtraRows(t *testing.T) {
	e := setup(t)
	two := &Parsed{Source: SourceCSV, Filename: "a", Lines: []Line{purchase("2026-06-14", -100, "x", ""), purchase("2026-06-14", -100, "x", "")}}
	three := &Parsed{Source: SourceCSV, Filename: "b", Lines: []Line{purchase("2026-06-14", -100, "x", ""), purchase("2026-06-14", -100, "x", ""), purchase("2026-06-14", -100, "x", "")}}
	if r, err := e.im.Commit(ctx, e.bank.ID, two); err != nil || r.Inserted != 2 {
		t.Fatalf("%+v %v", r, err)
	}
	r, err := e.im.Commit(ctx, e.bank.ID, three)
	if err != nil || r.Inserted != 1 || r.Duplicates != 2 {
		t.Fatalf("overlap: %+v %v", r, err)
	}
}

func TestPreviewMatchesCommitAndChangesNothing(t *testing.T) {
	e := setup(t)
	p := &Parsed{Source: SourceCSV, Filename: "f", Lines: []Line{
		purchase("2026-06-14", -100, "a", ""), purchase("2022-12-31", -100, "old", ""),
	}}
	pv, err := e.im.Preview(ctx, e.bank.ID, p)
	if err != nil || pv.New != 1 || len(pv.Skipped) != 1 || pv.Skipped[0].Line != 2 {
		t.Fatalf("preview: %+v %v", pv, err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions`); n != 0 {
		t.Fatal("preview wrote data")
	}
	r, err := e.im.Commit(ctx, e.bank.ID, p)
	if err != nil || r.Inserted != 1 || len(r.Skipped) != 1 {
		t.Fatalf("commit: %+v %v", r, err)
	}
	pv, _ = e.im.Preview(ctx, e.bank.ID, p)
	if pv.New != 0 || pv.Duplicates != 1 {
		t.Fatalf("second preview: %+v", pv)
	}
}

func TestCommitIsAtomic(t *testing.T) {
	e := setup(t)
	bad := purchase("2026-06-15", -100, "usd", "")
	bad.Amount = money.New(-100, money.USD) // wrong currency for the account
	p := &Parsed{Source: SourceCSV, Filename: "f", Lines: []Line{purchase("2026-06-14", -100, "ok", ""), bad}}
	if _, err := e.im.Commit(ctx, e.bank.ID, p); err == nil {
		t.Fatal("expected failure")
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions`); n != 0 {
		t.Fatalf("partial import left %d rows", n)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM import_batches`); n != 0 {
		t.Fatalf("failed import left %d batches", n)
	}
}

func statementFixture() *Parsed {
	total := ils(257654) // 2576.54 owed
	return &Parsed{Source: SourceCalPDF, Filename: "cal.pdf", Last4: "1001",
		Statements: []Statement{{BillDate: "2026-07-10", PrintedTotal: &total}},
		Lines: []Line{
			purchase("2026-06-04", -100305, "חברת החשמל", "2026-07-10"),
			purchase("2026-07-04", -90290, "טיב טעם", "2026-07-10"),
			{Date: "2026-07-04", Amount: ils(77076), Scope: ledger.TxLocal, Kind: ledger.KindEmployerCoverage, Payee: "טיב טעם", BillDate: "2026-07-10"},
			purchase("2026-06-28", -43135, "בזק", "2026-07-10"),
		}}
}

func TestStatementTotalInvariant(t *testing.T) {
	e := setup(t)
	p := statementFixture() // 1003.05 + 902.90 - 770.76 + 431.35 = 1566.54, but prints 2576.54
	_, err := e.im.Commit(ctx, e.card.ID, p)
	var mm *TotalMismatchError
	if !errors.As(err, &mm) {
		t.Fatalf("want TotalMismatchError, got %v", err)
	}
	if mm.Parsed.Minor() != 156654 || mm.Printed.Minor() != 257654 || len(mm.Lines) != 4 {
		t.Fatalf("details: %+v", mm)
	}
	if !strings.Contains(err.Error(), "טיב טעם") {
		t.Fatalf("error should list the lines: %v", err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions`); n != 0 {
		t.Fatal("mismatching file must not import anything")
	}
	total := ils(156654)
	p.Statements[0].PrintedTotal = &total
	if _, err := e.im.Commit(ctx, e.card.ID, p); err != nil {
		t.Fatalf("matching total should import: %v", err)
	}
}

func TestStatementLinkingAndCoveragePairing(t *testing.T) {
	e := setup(t)
	p := statementFixture()
	total := ils(156654)
	p.Statements[0].PrintedTotal = &total
	PairCoverage(p)
	if p.Lines[2].Covers == nil || *p.Lines[2].Covers != 1 {
		t.Fatalf("coverage should pair with the matching purchase: %+v", p.Lines[2].Covers)
	}
	r, err := e.im.Commit(ctx, e.card.ID, p)
	if err != nil || r.Inserted != 4 {
		t.Fatalf("%+v %v", r, err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM statements WHERE account_id = ? AND bill_date = '2026-07-10' AND printed_total_minor = 156654`, e.card.ID); n != 1 {
		t.Fatalf("statement row = %d", n)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions WHERE statement_id IS NOT NULL`); n != 4 {
		t.Fatalf("linked lines = %d", n)
	}
	var coveredPayee string
	if err := e.st.QueryRow(`SELECT p.payee_raw FROM transactions c JOIN transactions p ON p.id = c.covers_transaction_id
		WHERE c.kind = 'EMPLOYER_COVERAGE'`).Scan(&coveredPayee); err != nil || coveredPayee != "טיב טעם" {
		t.Fatalf("coverage link: %q %v", coveredPayee, err)
	}
	// Re-import: nothing new, statement not duplicated, coverage link intact.
	p2 := statementFixture()
	p2.Statements[0].PrintedTotal = &total
	PairCoverage(p2)
	r, err = e.im.Commit(ctx, e.card.ID, p2)
	if err != nil || r.Inserted != 0 || r.Duplicates != 4 {
		t.Fatalf("re-import: %+v %v", r, err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM statements`); n != 1 {
		t.Fatalf("statements = %d", n)
	}
}

func TestPairCoverageRules(t *testing.T) {
	cov := func(minor int64, payee string) Line {
		return Line{Date: "2026-07-04", Amount: ils(minor), Kind: ledger.KindEmployerCoverage, Payee: payee, BillDate: "2026-07-10"}
	}
	p := &Parsed{Lines: []Line{
		purchase("2026-07-04", -90290, "A", "2026-07-10"),
		purchase("2026-07-04", -5000, "A", "2026-07-10"),
		cov(77076, "A"), // partial cover of the first purchase
		cov(13214, "A"), // the remaining 132.14 of the first purchase
		cov(5000, "A"),  // the first purchase is exhausted -> second
		cov(100, "B"),   // no purchase from this merchant
		cov(99999, "A"), // larger than anything left
	}}
	PairCoverage(p)
	want := []int{-1, -1, 0, 0, 1, -1, -1}
	for i, w := range want {
		got := -1
		if p.Lines[i].Covers != nil {
			got = *p.Lines[i].Covers
		}
		if got != w {
			t.Errorf("line %d covers %d, want %d", i, got, w)
		}
	}
	if len(p.Warnings) != 2 {
		t.Fatalf("expected two unpaired warnings, got %v", p.Warnings)
	}
}

func TestUndo(t *testing.T) {
	e := setup(t)
	p := statementFixture()
	total := ils(156654)
	p.Statements[0].PrintedTotal = &total
	PairCoverage(p)
	r, err := e.im.Commit(ctx, e.card.ID, p)
	if err != nil {
		t.Fatal(err)
	}
	if err := e.im.Undo(ctx, r.BatchID); err != nil {
		t.Fatal(err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM transactions`); n != 0 {
		t.Fatalf("transactions left: %d", n)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM statements`); n != 0 {
		t.Fatalf("empty statements left: %d", n)
	}
	if err := e.im.Undo(ctx, r.BatchID); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("second undo: %v", err)
	}
	if err := e.im.Undo(ctx, "ghost"); !errors.Is(err, ledger.ErrNotFound) {
		t.Fatalf("unknown batch: %v", err)
	}
	// After an undo the same file can be imported again.
	p2 := statementFixture()
	p2.Statements[0].PrintedTotal = &total
	PairCoverage(p2)
	if r2, err := e.im.Commit(ctx, e.card.ID, p2); err != nil || r2.Inserted != 4 {
		t.Fatalf("re-import after undo: %+v %v", r2, err)
	}
}

func TestUndoKeepsSettledStatements(t *testing.T) {
	e := setup(t)
	p := statementFixture()
	total := ils(156654)
	p.Statements[0].PrintedTotal = &total
	r, _ := e.im.Commit(ctx, e.card.ID, p)
	bankTx := &ledger.Transaction{AccountID: e.bank.ID, Date: "2026-07-10", Amount: ils(-156654), PayeeRaw: "כרטיסי אשראי"}
	if err := e.l.InsertTransaction(ctx, bankTx); err != nil {
		t.Fatal(err)
	}
	var stID string
	e.st.QueryRow(`SELECT id FROM statements`).Scan(&stID)
	e.st.Exec(`INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES ('s', ?, ?, 156654, 'MANUAL')`, stID, bankTx.ID)
	if err := e.im.Undo(ctx, r.BatchID); err != nil {
		t.Fatal(err)
	}
	if n := count(t, e, `SELECT COUNT(*) FROM settlements`); n != 1 {
		t.Fatal("undo must not destroy a settlement the user made")
	}
}

func TestCardMismatchAndResolve(t *testing.T) {
	e := setup(t)
	p := statementFixture()
	total := ils(156654)
	p.Statements[0].PrintedTotal = &total
	p.Last4 = "9999"
	if _, err := e.im.Commit(ctx, e.card.ID, p); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("wrong card must be rejected: %v", err)
	}
	if a, err := e.im.ResolveCard(ctx, "1001"); err != nil || a.ID != e.card.ID {
		t.Fatalf("resolve: %v %v", a, err)
	}
	if _, err := e.im.ResolveCard(ctx, "0000"); !errors.Is(err, ledger.ErrNotFound) {
		t.Fatalf("unknown card: %v", err)
	}
	if _, err := e.im.ResolveCard(ctx, ""); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("empty last4: %v", err)
	}
	dup := &ledger.Account{Name: "Other 1001", Type: ledger.CreditCard, Institution: "Isracard", Last4: "1001"}
	e.l.CreateAccount(ctx, dup)
	if _, err := e.im.ResolveCard(ctx, "1001"); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("ambiguous card: %v", err)
	}
}

// --- Leumi bank export ---

func bankHTML(rows [][]string) string {
	var b strings.Builder
	b.WriteString(`<html><body><table><tr><td><table><tr><td colspan='9'>תנועות בחשבון</td></tr><tr>`)
	for _, h := range []string{"תאריך", "תאריך ערך", "תיאור", "אסמכתא", "בחובה", "בזכות", `היתרה בש"ח`, "תאור מורחב", "הערה"} {
		fmt.Fprintf(&b, `<td class="xlHeader"> <span>%s</span> </td>`, h)
	}
	b.WriteString(`</tr>`)
	for _, r := range rows {
		b.WriteString(`<tr>`)
		for _, c := range r {
			fmt.Fprintf(&b, `<td>%s</td>`, c)
		}
		b.WriteString(`</tr>`)
	}
	b.WriteString(`</table></td></tr></table></body></html>`)
	return b.String()
}

func TestParseLeumiBank(t *testing.T) {
	html := bankHTML([][]string{
		{"02/09/2026", "02/09/2026", `ישראכרט בע"מ-י`, "20543", "65.77", "0.00", "84,281.56", "", ""},
		{"02/09/2026", "02/09/2026", `ישראכרט בע"מ-י`, "20543", "859.45", "0.00", "83,422.11", "", ""},
		{"03/09/2026", "03/09/2026", "העברת משכורת", "99023", "0.00", "25389.50", "108811.61", "משכורת&nbsp;ספטמבר", "note"},
	})
	p, err := ParseLeumiBank(strings.NewReader(html), "x.xls")
	if err != nil {
		t.Fatal(err)
	}
	if len(p.Lines) != 3 || len(p.Warnings) != 0 {
		t.Fatalf("lines=%d warnings=%v", len(p.Lines), p.Warnings)
	}
	l := p.Lines[0]
	if l.Date != "2026-09-02" || l.Amount.Minor() != -6577 || l.Payee != `ישראכרט בע"מ-י` || l.Ref != "20543" {
		t.Fatalf("line 0: %+v", l)
	}
	if p.Lines[2].Amount.Minor() != 2538950 || p.Lines[2].Notes != "משכורת ספטמבר note" {
		t.Fatalf("line 2: %+v", p.Lines[2])
	}
	// Same-day, same-reference debits with different amounts are distinct keys.
	k := keys("acc", p.Lines)
	if k[0] == k[1] {
		t.Fatal("distinct debits collided")
	}
}

func TestParseLeumiBankBalanceCheck(t *testing.T) {
	rows := [][]string{
		{"01/09/2026", "", "a", "1", "100.00", "0.00", "900.00", "", ""},
		{"02/09/2026", "", "b", "2", "50.00", "0.00", "850.00", "", ""},
		{"03/09/2026", "", "c", "3", "50.00", "0.00", "700.00", "", ""}, // should be 800.00
	}
	p, err := ParseLeumiBank(strings.NewReader(bankHTML(rows)), "x.xls")
	if err != nil || len(p.Warnings) != 1 {
		t.Fatalf("expected one balance warning: %v %v", p, err)
	}
	// A leading pinned row from a later day does not count as a break.
	rows = [][]string{
		{"05/09/2026", "", "today", "9", "10.00", "0.00", "5.00", "", ""},
		{"01/09/2026", "", "a", "1", "100.00", "0.00", "900.00", "", ""},
		{"02/09/2026", "", "b", "2", "50.00", "0.00", "850.00", "", ""},
	}
	if p, err = ParseLeumiBank(strings.NewReader(bankHTML(rows)), "x.xls"); err != nil || len(p.Warnings) != 0 {
		t.Fatalf("pinned row: %v %v", p.Warnings, err)
	}
}

func TestParseLeumiBankErrors(t *testing.T) {
	if _, err := ParseLeumiBank(strings.NewReader("<html><body>nothing</body></html>"), "x.xls"); err == nil {
		t.Fatal("expected error for missing table")
	}
	if _, err := ParseLeumiBank(strings.NewReader(bankHTML(nil)), "x.xls"); err == nil {
		t.Fatal("expected error for empty table")
	}
	bad := bankHTML([][]string{{"01/09/2026", "", "a", "1", "abc", "0.00", "1.00", "", ""}})
	if _, err := ParseLeumiBank(strings.NewReader(bad), "x.xls"); err == nil {
		t.Fatal("expected error for a bad amount")
	}
}

// TestRealBankExports runs against the user's real exports when
// FINREP_BANK_DIR points at them; it is skipped otherwise (the data is private).
func TestRealBankExports(t *testing.T) {
	dir := os.Getenv("FINREP_BANK_DIR")
	if dir == "" {
		t.Skip("set FINREP_BANK_DIR to run against real exports")
	}
	files, _ := filepath.Glob(filepath.Join(dir, "תנועות*.xls"))
	if len(files) == 0 {
		t.Skip("no exports found")
	}
	e := setup(t)
	parse := func(f string) *Parsed {
		fh, err := os.Open(f)
		if err != nil {
			t.Fatal(err)
		}
		defer fh.Close()
		p, err := ParseLeumiBank(fh, filepath.Base(f))
		if err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		if len(p.Warnings) != 0 {
			t.Errorf("%s: %v", f, p.Warnings)
		}
		return p
	}
	inserted := 0
	for _, f := range files {
		r, err := e.im.Commit(ctx, e.bank.ID, parse(f))
		if err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		inserted += r.Inserted
	}
	for _, f := range files { // the second pass over every file must add nothing
		r, err := e.im.Commit(ctx, e.bank.ID, parse(f))
		if err != nil || r.Inserted != 0 {
			t.Fatalf("re-import of %s: %+v %v", f, r, err)
		}
	}
	if got := count(t, e, `SELECT COUNT(*) FROM transactions`); got != inserted {
		t.Fatalf("rows %d != inserted %d", got, inserted)
	}
	t.Logf("%d files, %d unique lines", len(files), inserted)
}
