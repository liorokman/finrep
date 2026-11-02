package billing

import (
	"errors"
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
)

func (e *env) count(q string, args ...any) int {
	e.t.Helper()
	var n int
	if err := e.st.QueryRowContext(ctx, q, args...).Scan(&n); err != nil {
		e.t.Fatal(err)
	}
	return n
}

func TestLinkActivityCreatesPlaceholderAndSettles(t *testing.T) {
	e := newEnv(t)
	d := e.debit("2026-06-10", 150000, "ISRACARD")
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
	st := e.stmt(e.isra, "2026-06-10")
	if st.Status != Paid || st.Expected.Minor() != 150000 || st.TxCount != 1 || len(st.Settlements) != 1 {
		t.Fatalf("statement = %+v", st)
	}
	// The debit is now settled, so the spending shows once, on the card.
	var bankFlow, cardFlow string
	if err := e.st.QueryRowContext(ctx, `SELECT flow FROM ledger_view WHERE id = ?`, d.ID).Scan(&bankFlow); err != nil {
		t.Fatal(err)
	}
	if err := e.st.QueryRowContext(ctx, `SELECT flow FROM ledger_view WHERE account_id = ?`, e.isra.ID).Scan(&cardFlow); err != nil {
		t.Fatal(err)
	}
	if bankFlow != "EXCLUDED" || cardFlow != "SPEND" {
		t.Fatalf("flows bank=%s card=%s", bankFlow, cardFlow)
	}
	// Linking twice, to a bank credit or to a bank account is refused.
	if _, err := e.s.LinkActivity(ctx, d.ID, e.cal.ID); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("second link: %v", err)
	}
	if _, err := e.s.LinkActivity(ctx, d.ID, e.bank.ID); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("link to bank: %v", err)
	}
}

func TestLinkActivityTwoDebitsSameDayShareStatement(t *testing.T) {
	e := newEnv(t)
	a, b := e.debit("2026-06-10", 1000, "ISRACARD"), e.debit("2026-06-10", 2500, "ISRACARD")
	for _, d := range []string{a.ID, b.ID} {
		if _, err := e.s.LinkActivity(ctx, d, e.isra.ID); err != nil {
			t.Fatal(err)
		}
	}
	if st := e.stmt(e.isra, "2026-06-10"); st.TxCount != 2 || len(st.Settlements) != 2 || st.Status != Paid {
		t.Fatalf("statement = %+v", st)
	}
	// Unlinking one removes only its placeholder.
	st := e.stmt(e.isra, "2026-06-10")
	if err := e.s.Unsettle(ctx, st.Settlements[0].ID); err != nil {
		t.Fatal(err)
	}
	if st := e.stmt(e.isra, "2026-06-10"); st.TxCount != 1 || len(st.Settlements) != 1 {
		t.Fatalf("after unlink = %+v", st)
	}
}

func TestLinkActivityRefusesRealStatement(t *testing.T) {
	e := newEnv(t)
	p := e.purchase(e.isra, "2026-05-20", 1000, "Shop")
	e.statement(e.isra, "2026-06-10", p)
	d := e.debit("2026-06-10", 1000, "ISRACARD")
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("err = %v", err)
	}
}

func TestUnsettleActivityRemovesPlaceholderAndRemembersNothing(t *testing.T) {
	e := newEnv(t)
	d := e.debit("2026-06-10", 150000, "ISRACARD")
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
	st := e.stmt(e.isra, "2026-06-10")
	if err := e.s.Unsettle(ctx, st.Settlements[0].ID); err != nil {
		t.Fatal(err)
	}
	if n := e.count(`SELECT COUNT(*) FROM transactions WHERE account_id = ?`, e.isra.ID) +
		e.count(`SELECT COUNT(*) FROM statements`) + e.count(`SELECT COUNT(*) FROM settlement_rejections`); n != 0 {
		t.Fatalf("leftovers: %d", n)
	}
	// The debit is free to link again.
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
}

func TestReplaceActivityByImportedStatement(t *testing.T) {
	e := newEnv(t)
	d := e.debit("2026-06-11", 150000, "ISRACARD") // debited a day after the bill date
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
	// Nothing to replace it with yet.
	if n, err := e.s.ReplaceActivity(ctx, e.isra.ID); err != nil || n != 0 {
		t.Fatalf("early replace n=%d err=%v", n, err)
	}
	p1 := e.purchase(e.isra, "2026-05-20", 100000, "Shop")
	p2 := e.purchase(e.isra, "2026-05-25", 50000, "Cafe")
	e.statement(e.isra, "2026-06-10", p1, p2)

	n, err := e.s.ReplaceActivity(ctx, e.isra.ID)
	if err != nil || n != 1 {
		t.Fatalf("replace n=%d err=%v", n, err)
	}
	if got := e.count(`SELECT COUNT(*) FROM transactions WHERE import_key LIKE 'activity:%'`); got != 0 {
		t.Fatalf("placeholder still there")
	}
	if got := e.count(`SELECT COUNT(*) FROM statements WHERE account_id = ?`, e.isra.ID); got != 1 {
		t.Fatalf("statements = %d", got)
	}
	st := e.stmt(e.isra, "2026-06-10")
	if st.Status != Paid || st.TxCount != 2 || len(st.Settlements) != 1 || st.Settlements[0].BankTxID != d.ID {
		t.Fatalf("statement = %+v", st)
	}
}

func TestReplaceActivitySameBillDateKeepsOneSettlement(t *testing.T) {
	e := newEnv(t)
	d := e.debit("2026-06-10", 150000, "ISRACARD")
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
	// The import lands on the statement row the placeholder created.
	p := e.purchase(e.isra, "2026-05-20", 150000, "Shop")
	if _, err := e.st.ExecContext(ctx, `UPDATE transactions SET statement_id = (SELECT id FROM statements WHERE account_id = ?), bill_date = '2026-06-10', bill_date_source = 'PDF' WHERE id = ?`, e.isra.ID, p.ID); err != nil {
		t.Fatal(err)
	}
	if n, err := e.s.ReplaceActivity(ctx, e.isra.ID); err != nil || n != 1 {
		t.Fatalf("replace n=%d err=%v", n, err)
	}
	st := e.stmt(e.isra, "2026-06-10")
	if st.TxCount != 1 || st.Expected.Minor() != 150000 || len(st.Settlements) != 1 || st.Status != Paid {
		t.Fatalf("statement = %+v", st)
	}
}

func TestReplaceActivityLeavesFarStatementAndPaidStatement(t *testing.T) {
	e := newEnv(t)
	d := e.debit("2026-06-10", 150000, "ISRACARD")
	if _, err := e.s.LinkActivity(ctx, d.ID, e.isra.ID); err != nil {
		t.Fatal(err)
	}
	far := e.purchase(e.isra, "2026-03-20", 150000, "Old")
	e.statement(e.isra, "2026-04-10", far)
	if n, _ := e.s.ReplaceActivity(ctx, e.isra.ID); n != 0 {
		t.Fatalf("replaced a far statement")
	}
	// A statement near in date but already paid by another debit is not taken over.
	near := e.purchase(e.isra, "2026-05-20", 150000, "Shop")
	sid := e.statement(e.isra, "2026-06-12", near)
	other := e.debit("2026-06-12", 150000, "ISRACARD 2")
	if _, err := e.s.Settle(ctx, sid, other.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	if n, _ := e.s.ReplaceActivity(ctx, e.isra.ID); n != 0 {
		t.Fatalf("replaced a paid statement")
	}
}
