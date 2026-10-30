package billing

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

type env struct {
	t    *testing.T
	st   *store.Store
	l    *ledger.Ledger
	s    *Service
	bank *ledger.Account
	cal  *ledger.Account
	isra *ledger.Account
}

func newEnv(t *testing.T) *env {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	e := &env{t: t, st: st, l: l, s: New(st, l)}
	e.s.Now = func() time.Time { return time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC) }
	mk := func(name string, typ ledger.AccountType, owner, last4 string) *ledger.Account {
		a := &ledger.Account{Name: name, Type: typ, Institution: "X", Owner: owner, Last4: last4}
		if err := l.CreateAccount(ctx, a); err != nil {
			t.Fatal(err)
		}
		return a
	}
	e.bank = mk("Leumi", ledger.Bank, "Alice", "")
	e.cal = mk("Cal 1001", ledger.CreditCard, "Alice", "1001")
	e.isra = mk("Isracard 1002", ledger.CreditCard, "Alice", "1002")
	if err := l.SetBillingRules(ctx, e.cal.ID, []ledger.BillingRule{{Scope: ledger.ScopeLocal, BillDay: 10, CutoffDay: ip(10), StandingOrderExtraCycles: 1}}); err != nil {
		t.Fatal(err)
	}
	if err := l.SetBillingRules(ctx, e.isra.ID, []ledger.BillingRule{
		{Scope: ledger.ScopeLocal, BillDay: 10, CutoffDay: ip(10)},
		{Scope: ledger.ScopeForeign, BillDay: 2, MonthOffset: 1, CutoffDay: ip(2)},
	}); err != nil {
		t.Fatal(err)
	}
	return e
}

func (e *env) ins(x *ledger.Transaction) *ledger.Transaction {
	e.t.Helper()
	if err := e.l.InsertTransaction(ctx, x); err != nil {
		e.t.Fatal(err)
	}
	return x
}

func (e *env) purchase(acc *ledger.Account, date string, minor int64, payee string) *ledger.Transaction {
	return e.ins(&ledger.Transaction{AccountID: acc.ID, Date: date, Amount: money.New(-minor, acc.Currency), PayeeRaw: payee})
}

func (e *env) debit(date string, minor int64, payee string) *ledger.Transaction {
	return e.ins(&ledger.Transaction{AccountID: e.bank.ID, Date: date, Amount: money.New(-minor, e.bank.Currency), PayeeRaw: payee})
}

// statement creates a recorded statement and links charges to it, as a PDF import does.
func (e *env) statement(acc *ledger.Account, billDate string, txs ...*ledger.Transaction) string {
	e.t.Helper()
	id := store.NewID()
	if _, err := e.st.ExecContext(ctx, `INSERT INTO statements (id, account_id, bill_date) VALUES (?, ?, ?)`, id, acc.ID, billDate); err != nil {
		e.t.Fatal(err)
	}
	for _, x := range txs {
		if _, err := e.st.ExecContext(ctx, `UPDATE transactions SET statement_id = ?, bill_date = ?, bill_date_source = 'PDF' WHERE id = ?`, id, billDate, x.ID); err != nil {
			e.t.Fatal(err)
		}
	}
	return id
}

func (e *env) billDate(id string) (string, string) {
	e.t.Helper()
	x, err := e.l.GetTransaction(ctx, id)
	if err != nil {
		e.t.Fatal(err)
	}
	if x.BillDate == nil {
		return "", ""
	}
	return *x.BillDate, string(*x.BillDateSource)
}

func (e *env) stmt(acc *ledger.Account, billDate string) Statement {
	e.t.Helper()
	all, err := e.s.Statements(ctx, StatementFilter{AccountIDs: []string{acc.ID}})
	if err != nil {
		e.t.Fatal(err)
	}
	for _, s := range all {
		if s.BillDate == billDate {
			return s
		}
	}
	e.t.Fatalf("no statement %s for %s in %+v", billDate, acc.Name, all)
	return Statement{}
}

func TestAssignBillDates(t *testing.T) {
	e := newEnv(t)
	sep5 := e.purchase(e.cal, "2026-09-05", 1000, "A")
	sep25 := e.purchase(e.cal, "2026-09-25", 1000, "B")
	standing := e.ins(&ledger.Transaction{AccountID: e.cal.ID, Date: "2026-08-02", Amount: money.New(-500, "ILS"), PayeeRaw: "SO", IsStandingOrder: true})
	foreign := e.ins(&ledger.Transaction{AccountID: e.isra.ID, Date: "2026-09-15", Amount: money.New(-500, "ILS"), PayeeRaw: "F", Scope: ledger.TxForeign})
	onStatement := e.purchase(e.cal, "2026-06-20", 700, "ON STATEMENT")
	e.statement(e.cal, "2026-07-10", onStatement)
	fromBank := e.purchase(e.cal, "2026-06-21", 700, "BANK DATED")
	if _, err := e.st.ExecContext(ctx, `UPDATE transactions SET bill_date='2026-07-11', bill_date_source='BANK' WHERE id=?`, fromBank.ID); err != nil {
		t.Fatal(err)
	}
	cov := e.ins(&ledger.Transaction{AccountID: e.cal.ID, Date: "2026-09-05", Amount: money.New(1000, "ILS"), PayeeRaw: "חיוב תקציב סאפ",
		Kind: ledger.KindEmployerCoverage, CoversID: &sep5.ID})
	noRule := e.ins(&ledger.Transaction{AccountID: e.cal.ID, Date: "2026-09-05", Amount: money.New(-1, "ILS"), PayeeRaw: "x", Scope: ledger.TxForeign})

	n, err := e.s.AssignBillDates(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	want := map[string][2]string{
		sep5.ID:     {"2026-09-10", "RULE"},
		sep25.ID:    {"2026-10-11", "RULE"}, // 10 Oct 2026 is a Saturday
		standing.ID: {"2026-09-10", "RULE"}, // one extra cycle
		foreign.ID:  {"2026-11-02", "RULE"},
		cov.ID:      {"2026-09-10", "RULE"}, // follows its purchase
	}
	for id, w := range want {
		if d, src := e.billDate(id); d != w[0] || src != w[1] {
			t.Errorf("%s: got %s/%s want %v", id, d, src, w)
		}
	}
	if d, src := e.billDate(onStatement.ID); d != "2026-07-10" || src != "PDF" {
		t.Errorf("statement-dated charge changed: %s/%s", d, src)
	}
	if d, src := e.billDate(fromBank.ID); d != "2026-07-11" || src != "BANK" {
		t.Errorf("bank-dated charge changed: %s/%s", d, src)
	}
	if d, _ := e.billDate(noRule.ID); d != "" {
		t.Errorf("a scope with no rule must stay unset, got %s", d)
	}
	if n != 4 {
		t.Errorf("changed = %d, want 4 computed dates (coverage is derived)", n)
	}
	if again, _ := e.s.AssignBillDates(ctx, ""); again != 0 {
		t.Errorf("second run changed %d", again)
	}

	// A rule change takes effect on dates the rules computed, and only on those.
	if err := e.l.SetBillingRules(ctx, e.cal.ID, []ledger.BillingRule{{Scope: ledger.ScopeLocal, BillDay: 15, CutoffDay: ip(15)}}); err != nil {
		t.Fatal(err)
	}
	if _, err := e.s.AssignBillDates(ctx, e.cal.ID); err != nil {
		t.Fatal(err)
	}
	if d, _ := e.billDate(sep5.ID); d != "2026-09-15" {
		t.Errorf("rule change not applied: %s", d)
	}
	if d, _ := e.billDate(cov.ID); d != "2026-09-15" {
		t.Errorf("coverage did not follow: %s", d)
	}
	if d, src := e.billDate(onStatement.ID); d != "2026-07-10" || src != "PDF" {
		t.Errorf("statement-dated charge changed by rule edit: %s/%s", d, src)
	}
}

func TestStatementsExpectedGrossAndStatus(t *testing.T) {
	e := newEnv(t)
	p1 := e.purchase(e.cal, "2026-06-12", 8000, "BURGER")
	p2 := e.purchase(e.cal, "2026-06-13", 2000, "SHOP")
	cov := e.ins(&ledger.Transaction{AccountID: e.cal.ID, Date: "2026-06-12", Amount: money.New(5000, "ILS"), PayeeRaw: "חיוב תקציב סאפ",
		Kind: ledger.KindEmployerCoverage, CoversID: &p1.ID})
	id := e.statement(e.cal, "2026-07-10", p1, p2, cov)
	st := e.stmt(e.cal, "2026-07-10")
	if st.ID != id || st.Gross.Minor() != 10000 || st.Expected.Minor() != 5000 || st.TxCount != 3 || st.Status != Billed {
		t.Fatalf("%+v", st)
	}
	// Future charges without a statement record form a derived, upcoming statement.
	e.purchase(e.cal, "2026-07-25", 1234, "NEXT")
	e.s.AssignBillDates(ctx, "")
	next := e.stmt(e.cal, "2026-08-10")
	if next.ID != "" || next.Status != Upcoming || next.Expected.Minor() != 1234 {
		t.Fatalf("%+v", next)
	}

	b1 := e.debit("2026-07-10", 2000, "כרטיסי אשראי-י")
	if _, err := e.s.Settle(ctx, id, b1.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	if st = e.stmt(e.cal, "2026-07-10"); st.Status != Partial || st.Settled.Minor() != 2000 || st.Remaining().Minor() != 3000 {
		t.Fatalf("%+v", st)
	}
	b2 := e.debit("2026-07-11", 3000, "כרטיסי אשראי-י")
	if _, err := e.s.Settle(ctx, id, b2.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	if st = e.stmt(e.cal, "2026-07-10"); st.Status != Paid || len(st.Settlements) != 2 {
		t.Fatalf("%+v", st)
	}
}

func TestStatusRules(t *testing.T) {
	cases := []struct {
		bill              string
		expected, settled int64
		want              Status
	}{
		{"2026-08-01", 5000, 0, Upcoming},
		{"2026-07-20", 5000, 0, Billed}, // due today counts as billed
		{"2026-07-01", 5000, 4000, Partial},
		{"2026-07-01", 5000, 4901, Paid}, // within the 1.00 tolerance
		{"2026-07-01", 5000, 4899, Partial},
		{"2026-07-01", 5000, 6000, Paid},
		{"2026-07-01", 0, 0, Paid}, // fully covered by the employer
		{"2026-08-01", 0, 0, Upcoming},
	}
	for _, c := range cases {
		if got := statusOf(c.bill, c.expected, c.settled, "2026-07-20", 100); got != c.want {
			t.Errorf("%+v: got %s", c, got)
		}
	}
}

func TestSettleValidationAndRedating(t *testing.T) {
	e := newEnv(t)
	p := e.purchase(e.cal, "2026-06-12", 10000, "SHOP")
	id := e.statement(e.cal, "2026-07-10", p)
	good := e.debit("2026-07-11", 10000, "כרטיסי אשראי-י")
	credit := e.ins(&ledger.Transaction{AccountID: e.bank.ID, Date: "2026-07-11", Amount: money.New(10000, "ILS"), PayeeRaw: "salary"})
	cardTx := e.purchase(e.isra, "2026-07-01", 100, "x")

	bad := func(name string, err error, want error) {
		t.Helper()
		if !errors.Is(err, want) {
			t.Errorf("%s: got %v, want %v", name, err, want)
		}
	}
	_, err := e.s.Settle(ctx, id, credit.ID, nil, Manual)
	bad("credit line", err, ledger.ErrInvalid)
	_, err = e.s.Settle(ctx, id, cardTx.ID, nil, Manual)
	bad("card charge as debit", err, ledger.ErrInvalid)
	_, err = e.s.Settle(ctx, "nope", good.ID, nil, Manual)
	bad("unknown statement", err, ledger.ErrNotFound)
	_, err = e.s.Settle(ctx, id, "nope", nil, Manual)
	bad("unknown debit", err, ledger.ErrNotFound)
	usd := money.New(100, "USD")
	_, err = e.s.Settle(ctx, id, good.ID, &usd, Manual)
	bad("currency", err, ledger.ErrInvalid)
	over := money.New(10001, "ILS")
	_, err = e.s.Settle(ctx, id, good.ID, &over, Manual)
	bad("more than the debit", err, ledger.ErrInvalid)
	zero := money.New(0, "ILS")
	_, err = e.s.Settle(ctx, id, good.ID, &zero, Manual)
	bad("zero", err, ledger.ErrInvalid)

	if _, err := e.s.Settle(ctx, id, good.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	if d, src := e.billDate(p.ID); d != "2026-07-11" || src != "BANK" {
		t.Fatalf("charges take the debit's date: %s/%s", d, src)
	}
	_, err = e.s.Settle(ctx, id, good.ID, nil, Manual)
	bad("already fully allocated / duplicate", err, ledger.ErrInvalid)

	// A debit larger than the statement can be split across statements: many-to-many capable.
	p2 := e.purchase(e.isra, "2026-06-12", 3000, "SHOP2")
	id2 := e.statement(e.isra, "2026-07-10", p2)
	lump := e.debit("2026-07-10", 8000, "lump")
	a := money.New(5000, "ILS")
	if _, err := e.s.Settle(ctx, id2, lump.ID, &a, Manual); err == nil {
		// 5000 > statement's 3000 is allowed (overpay is the user's call); the debit has 3000 left.
		left := money.New(3001, "ILS")
		_, err2 := e.s.Settle(ctx, id, lump.ID, &left, Manual)
		bad("allocation beyond the debit", err2, ledger.ErrInvalid)
	} else {
		t.Fatal(err)
	}

	// External payments: excluded from settlement, and exclusive with it.
	ext := e.debit("2026-07-12", 999, "other card")
	if err := e.s.MarkExternal(ctx, ext.ID, "wife's other card"); err != nil {
		t.Fatal(err)
	}
	_, err = e.s.Settle(ctx, id, ext.ID, nil, Manual)
	bad("settle external", err, ledger.ErrInvalid)
	bad("mark settled debit external", e.s.MarkExternal(ctx, good.ID, ""), ledger.ErrInUse)
	bad("mark a credit external", e.s.MarkExternal(ctx, credit.ID, ""), ledger.ErrInvalid)
	if err := e.s.UnmarkExternal(ctx, ext.ID); err != nil {
		t.Fatal(err)
	}
	bad("unmark twice", e.s.UnmarkExternal(ctx, ext.ID), ledger.ErrNotFound)
}

func TestUnsettleRestoresDateAndRemembersRejection(t *testing.T) {
	e := newEnv(t)
	p := e.purchase(e.cal, "2026-06-12", 10000, "SHOP")
	id := e.statement(e.cal, "2026-07-10", p)
	d := e.debit("2026-07-10", 10000, "כרטיסי אשראי-י")
	e.s.SetHints(ctx, []string{"כרטיסי אשראי"})

	sid, err := e.s.Settle(ctx, id, d.ID, nil, Auto)
	if err != nil {
		t.Fatal(err)
	}
	if err := e.s.Unsettle(ctx, sid); err != nil {
		t.Fatal(err)
	}
	if err := e.s.Unsettle(ctx, sid); !errors.Is(err, ledger.ErrNotFound) {
		t.Fatalf("unsettle twice: %v", err)
	}
	if bd, src := e.billDate(p.ID); bd != "2026-07-10" || src != "PDF" {
		t.Fatalf("not restored: %s/%s", bd, src)
	}
	ps, _ := e.s.Proposals(ctx)
	if len(ps) != 0 {
		t.Fatalf("an unlinked pair must never be proposed again: %+v", ps)
	}
	// Linking it by hand again clears the memory and works.
	if _, err := e.s.Settle(ctx, id, d.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	var n int
	e.st.QueryRowContext(ctx, `SELECT COUNT(*) FROM settlement_rejections`).Scan(&n)
	if n != 0 {
		t.Fatal("rejection should be forgotten after a manual link")
	}
}

func TestProposals(t *testing.T) {
	e := newEnv(t)
	calP := e.purchase(e.cal, "2026-06-12", 257666, "CAL STUFF")
	israP := e.purchase(e.isra, "2026-06-12", 64788, "ISRA STUFF")
	e.statement(e.cal, "2026-07-10", calP)
	e.statement(e.isra, "2026-07-10", israP)
	calDebit := e.debit("2026-07-10", 257666, "כרטיסי אשראי-י")
	israDebit := e.debit("2026-07-10", 64788, "ישראכרט בע\"מ-י")
	e.debit("2026-07-10", 257666, "unrelated same amount, later id") // same amount: tie must resolve deterministically
	e.debit("2026-07-28", 64788, "far away")                         // outside the date window
	e.debit("2026-07-10", 12345, "rent")                             // matches nothing

	ps, err := e.s.Proposals(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(ps) != 2 {
		t.Fatalf("want 2 proposals, got %+v", ps)
	}
	got := map[string]Proposal{}
	for _, p := range ps {
		got[p.AccountID] = p
		if !p.Exact || p.Amount.Minor() == 0 {
			t.Errorf("%+v", p)
		}
	}
	if got[e.isra.ID].BankTxID != israDebit.ID {
		t.Errorf("isracard matched %s", got[e.isra.ID].BankPayee)
	}
	if got[e.cal.ID].BankTxID != calDebit.ID && got[e.cal.ID].BankPayee != "unrelated same amount, later id" {
		t.Errorf("cal matched %s", got[e.cal.ID].BankPayee)
	}
	again, _ := e.s.Proposals(ctx)
	if len(again) != 2 || again[0].BankTxID != ps[0].BankTxID || again[1].BankTxID != ps[1].BankTxID {
		t.Fatal("proposals must be deterministic")
	}

	// Confirming all is idempotent, and never touches a manual link.
	n, err := e.s.ConfirmAll(ctx)
	if err != nil || n != 2 {
		t.Fatalf("%d %v", n, err)
	}
	if n, _ := e.s.ConfirmAll(ctx); n != 0 {
		t.Fatalf("second ConfirmAll settled %d", n)
	}
	if st := e.stmt(e.cal, "2026-07-10"); st.Status != Paid || st.Settlements[0].Source != "AUTO" {
		t.Fatalf("%+v", st)
	}
}

func TestProposalsAmountHintsAndDerivedStatements(t *testing.T) {
	e := newEnv(t)
	// Statement derived from rule-dated charges (no statement record yet), in the past.
	e.purchase(e.isra, "2026-06-01", 50000, "BIG")
	e.s.AssignBillDates(ctx, "")
	stmts, _ := e.s.Statements(ctx, StatementFilter{})
	if len(stmts) != 1 || stmts[0].ID != "" || stmts[0].BillDate != "2026-06-10" {
		t.Fatalf("%+v", stmts)
	}
	// Partial payment: the payee matches a hint, the amount does not.
	e.debit("2026-06-10", 30000, "ישראכרט בע\"מ-י")
	if ps, _ := e.s.Proposals(ctx); len(ps) != 0 {
		t.Fatalf("without a hint an amount mismatch must not match: %+v", ps)
	}
	if err := e.s.SetHints(ctx, []string{" ישראכרט ", ""}); err != nil {
		t.Fatal(err)
	}
	ps, _ := e.s.Proposals(ctx)
	if len(ps) != 1 || ps[0].Exact || ps[0].Amount.Minor() != 30000 || ps[0].AmountDiff != 20000 {
		t.Fatalf("%+v", ps)
	}
	if n, _ := e.s.ConfirmAll(ctx); n != 0 {
		t.Fatal("ConfirmAll must leave inexact proposals to a human")
	}
	if _, err := e.s.Confirm(ctx, ps[0]); err != nil {
		t.Fatal(err)
	}
	st := e.stmt(e.isra, "2026-06-10")
	if st.ID == "" || st.Status != Partial || st.Settled.Minor() != 30000 {
		t.Fatalf("confirming a derived statement must create it: %+v", st)
	}
}

func TestCardSpendByPurchaseAndBillMonth(t *testing.T) {
	e := newEnv(t)
	p1 := e.purchase(e.cal, "2026-06-25", 8000, "BURGER") // bills 10 Jul
	e.purchase(e.cal, "2026-07-05", 1000, "SHOP")         // bills 10 Jul
	e.purchase(e.cal, "2026-07-15", 500, "LATER")         // bills 10 Aug
	e.ins(&ledger.Transaction{AccountID: e.cal.ID, Date: "2026-06-25", Amount: money.New(5000, "ILS"), PayeeRaw: "חיוב תקציב סאפ",
		Kind: ledger.KindEmployerCoverage, CoversID: &p1.ID})
	e.purchase(e.isra, "2026-07-05", 700, "OTHER CARD")
	e.s.AssignBillDates(ctx, "")

	rows, err := e.s.CardSpend(ctx, SpendFilter{})
	if err != nil {
		t.Fatal(err)
	}
	type k struct{ acc, month string }
	got := map[k]SpendRow{}
	for _, r := range rows {
		got[k{r.AccountName, r.Month}] = r
	}
	jun := got[k{"Cal 1001", "2026-06"}]
	if jun.PurchasedGross.Minor() != 8000 || jun.PurchasedNet.Minor() != 3000 || jun.BilledGross.Minor() != 0 {
		t.Errorf("June: %+v", jun)
	}
	jul := got[k{"Cal 1001", "2026-07"}]
	if jul.PurchasedGross.Minor() != 1500 || jul.BilledGross.Minor() != 9000 || jul.BilledNet.Minor() != 4000 {
		t.Errorf("July: %+v", jul)
	}
	if aug := got[k{"Cal 1001", "2026-08"}]; aug.BilledNet.Minor() != 500 {
		t.Errorf("Aug: %+v", aug)
	}
	if rows, _ := e.s.CardSpend(ctx, SpendFilter{Owner: "Nobody"}); len(rows) != 0 {
		t.Error("owner filter")
	}
	if rows, _ := e.s.CardSpend(ctx, SpendFilter{From: "2026-08", To: "2026-08"}); len(rows) != 1 {
		t.Errorf("month filter: %+v", rows)
	}
}

func TestUpcomingTimeline(t *testing.T) {
	e := newEnv(t)
	e.purchase(e.cal, "2026-07-15", 1000, "A")  // 10 Aug
	e.purchase(e.isra, "2026-07-15", 2500, "B") // 10 Aug
	e.purchase(e.isra, "2026-09-15", 700, "C")  // 10 Oct (Saturday) -> Sunday 11 Oct
	e.s.AssignBillDates(ctx, "")
	days, err := e.s.Upcoming(ctx, "", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(days) != 2 || days[0].Date != "2026-08-10" || days[0].Total.Minor() != 3500 || len(days[0].Statements) != 2 || days[1].Date != "2026-10-11" {
		t.Fatalf("%+v", days)
	}
	if days, _ := e.s.Upcoming(ctx, "", "2026-08-31"); len(days) != 1 {
		t.Fatal("horizon")
	}
}

func TestReviewFlags(t *testing.T) {
	e := newEnv(t)
	ok := e.purchase(e.cal, "2026-06-12", 1000, "OK") // the rule says 10 Jul: agrees
	okID := e.statement(e.cal, "2026-07-10", ok)
	odd := e.purchase(e.cal, "2026-06-12", 1000, "ODD") // the rule says 10 Jul, the statement says 2 Aug
	e.statement(e.cal, "2026-08-02", odd)
	d := e.debit("2026-07-12", 1000, "x") // paid two days after the statement date
	if _, err := e.s.Settle(ctx, okID, d.ID, nil, Manual); err != nil {
		t.Fatal(err)
	}
	flags, err := e.s.Review(ctx)
	if err != nil {
		t.Fatal(err)
	}
	kinds := map[string]string{}
	for _, f := range flags {
		kinds[f.Kind] = f.BillDate
	}
	if len(flags) != 2 || kinds["DEBIT_DATE"] != "2026-07-10" || kinds["RULE_MISMATCH"] != "2026-08-02" {
		t.Fatalf("%+v", flags)
	}
}

func TestProposalsRespectDateWindow(t *testing.T) {
	e := newEnv(t)
	p := e.purchase(e.cal, "2026-06-12", 10000, "X")
	e.statement(e.cal, "2026-07-10", p)
	e.debit("2026-07-16", 10000, "six days late") // window is 5
	if ps, _ := e.s.Proposals(ctx); len(ps) != 0 {
		t.Fatalf("outside the window: %+v", ps)
	}
	e.debit("2026-07-15", 10000, "five days late")
	if ps, _ := e.s.Proposals(ctx); len(ps) != 1 || ps[0].DateGap != 5 {
		t.Fatalf("%+v", ps)
	}
}

func TestOneDebitSettlesOneStatement(t *testing.T) {
	e := newEnv(t)
	a := e.purchase(e.cal, "2026-06-12", 10000, "A")
	b := e.purchase(e.isra, "2026-06-12", 10000, "B") // same total on another card
	e.statement(e.cal, "2026-07-10", a)
	e.statement(e.isra, "2026-07-10", b)
	e.debit("2026-07-10", 10000, "only one debit")
	ps, _ := e.s.Proposals(ctx)
	if len(ps) != 1 {
		t.Fatalf("one debit must be proposed for one statement only: %+v", ps)
	}
	// With a second debit both statements are matched, each to its own.
	e.debit("2026-07-10", 10000, "second")
	ps, _ = e.s.Proposals(ctx)
	if len(ps) != 2 || ps[0].BankTxID == ps[1].BankTxID {
		t.Fatalf("%+v", ps)
	}
}
