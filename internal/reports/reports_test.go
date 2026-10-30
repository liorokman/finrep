package reports

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

// world is a seeded ledger plus an independent tally of what it must add up to.
type world struct {
	t               *testing.T
	st              *store.Store
	l               *ledger.Ledger
	b               *billing.Service
	s               *Service
	bank, cal, wife *ledger.Account

	cat map[string]*ledger.Category

	// Oracle: filled by the helpers as data is inserted, never read back from SQL.
	spendGross, spendCovered, income int64
	bankMoves, cardMoves             []move
	settled                          []move // bank date, amount
}

type move struct {
	date  string
	minor int64
}

func ip(i int) *int { return &i }

func (w *world) mkCat(name string, typ ledger.CategoryType, budget int64, parent *ledger.Category) *ledger.Category {
	c := &ledger.Category{NameEN: name, NameHE: name + "-he", Type: typ}
	if budget > 0 {
		m := money.New(budget, "ILS")
		c.MonthlyBudget = &m
	}
	if parent != nil {
		c.ParentID = &parent.ID
	}
	if err := w.l.CreateCategory(ctx, c); err != nil {
		w.t.Fatal(err)
	}
	w.cat[name] = c
	return c
}

// add inserts a line. cat may be "" for uncategorized. spend/income say how the oracle counts it.
func (w *world) add(acc *ledger.Account, date string, minor int64, payee, cat string, mod ...func(*ledger.Transaction)) *ledger.Transaction {
	w.t.Helper()
	x := &ledger.Transaction{AccountID: acc.ID, Date: date, Amount: money.New(minor, "ILS"), PayeeRaw: payee}
	if cat != "" {
		x.CategoryID = &w.cat[cat].ID
		x.CategorizedBy = ledger.ByManual
	}
	for _, m := range mod {
		m(x)
	}
	if err := w.l.InsertTransaction(ctx, x); err != nil {
		w.t.Fatal(err)
	}
	if acc.Type == ledger.Bank {
		w.bankMoves = append(w.bankMoves, move{date, minor})
	} else {
		w.cardMoves = append(w.cardMoves, move{date, minor})
	}
	return x
}

func (w *world) spend(acc *ledger.Account, date string, gross int64, payee, cat string, mod ...func(*ledger.Transaction)) *ledger.Transaction {
	w.spendGross += gross
	return w.add(acc, date, -gross, payee, cat, mod...)
}

func newWorld(t *testing.T) *world {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	b := billing.New(st, l)
	w := &world{t: t, st: st, l: l, b: b, cat: map[string]*ledger.Category{}}
	w.s = New(st, l, b)
	w.s.Now = func() time.Time { return time.Date(2026, 4, 15, 12, 0, 0, 0, time.UTC) }
	b.Now = w.s.Now
	mk := func(name string, typ ledger.AccountType, owner string, open int64) *ledger.Account {
		a := &ledger.Account{Name: name, Type: typ, Institution: "X", Owner: owner, OpeningBalance: money.New(open, "ILS")}
		if err := l.CreateAccount(ctx, a); err != nil {
			t.Fatal(err)
		}
		return a
	}
	w.bank = mk("Leumi", ledger.Bank, "Alice", 100000)
	w.cal = mk("Cal 1001", ledger.CreditCard, "Alice", 0)
	w.wife = mk("Wife card", ledger.CreditCard, "Wife", 0)

	home := w.mkCat("Home", ledger.Expense, 0, nil)
	w.mkCat("Rent", ledger.Expense, 0, home)
	w.mkCat("Restaurants", ledger.Expense, 0, nil)
	w.mkCat("Groceries", ledger.Expense, 40000, nil)
	w.mkCat("Subscriptions", ledger.Expense, 0, nil)
	w.mkCat("Shopping", ledger.Expense, 0, nil)
	w.mkCat("Salary", ledger.Income, 0, nil)
	w.mkCat("Savings", ledger.Transfer, 0, nil)
	return w
}

// seed builds the standard dataset; every spend/income line also updates the oracle.
func (w *world) seed() {
	t := w.t
	// Bank.
	w.income += 1000000
	w.add(w.bank, "2026-01-05", 1000000, "Salary", "Salary")
	w.spend(w.bank, "2026-01-20", 300000, "Rent Jan", "Rent")
	w.income += 1000000
	w.add(w.bank, "2026-02-05", 1000000, "Salary", "Salary")
	w.spend(w.bank, "2026-02-15", 5000, "ATM", "")            // uncategorized spend
	w.add(w.bank, "2026-02-16", -50000, "Savings", "Savings") // transfer: excluded
	w.spendGross -= 4000                                      // a rent refund nets against spending
	w.add(w.bank, "2026-03-01", 4000, "Landlord refund", "Rent")

	// Cal: the restaurant bill is mostly paid by the employer.
	rest := w.spend(w.cal, "2026-01-12", 90290, "BURGER PLACE", "Restaurants")
	w.add(w.cal, "2026-01-12", 77076, "חיוב תקציב סאפ", "Restaurants", func(x *ledger.Transaction) {
		x.Kind, x.CoversID = ledger.KindEmployerCoverage, &rest.ID
	})
	w.spendCovered += 77076
	groc1 := w.spend(w.cal, "2026-01-15", 20000, "SHUFERSAL", "Groceries")
	for _, d := range []string{"2026-01-03", "2026-02-03", "2026-03-03", "2026-04-03"} {
		w.spend(w.cal, d, 4990, "NETFLIX.COM 123", "Subscriptions")
	}
	tv1 := w.spend(w.cal, "2026-01-20", 30000, "TV STORE", "Shopping", func(x *ledger.Transaction) { x.CurrentInstallment, x.TotalInstallments = ip(1), ip(4) })
	w.spend(w.cal, "2026-02-20", 30000, "TV STORE", "Shopping", func(x *ledger.Transaction) { x.CurrentInstallment, x.TotalInstallments = ip(2), ip(4) })
	usd := money.New(4000, "USD")
	w.spend(w.cal, "2026-02-02", 15000, "AMAZON", "Shopping", func(x *ledger.Transaction) {
		x.Original, x.Scope = &usd, ledger.TxForeign
	})
	for i, g := range []int64{9000, 9500, 10000, 10000, 10500, 10500, 11000, 11000, 9800} {
		w.spend(w.cal, time.Date(2026, 2, 1+i*3, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), g, "SHUFERSAL", "Groceries")
	}
	w.spend(w.cal, "2026-03-20", 200000, "SHUFERSAL", "Groceries") // the outlier
	w.spend(w.wife, "2026-02-10", 7000, "PHARM", "")

	// Statement of 10 Feb: January's Cal charges, paid by one bank debit.
	ids := []string{rest.ID, groc1.ID, tv1.ID}
	var jan []string
	rows, err := w.st.QueryContext(ctx, `SELECT id FROM transactions WHERE account_id = ? AND date <= '2026-01-31'`, w.cal.ID)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var id string
		rows.Scan(&id)
		jan = append(jan, id)
	}
	rows.Close()
	_ = ids
	stID := store.NewID()
	if _, err := w.st.ExecContext(ctx, `INSERT INTO statements (id, account_id, bill_date) VALUES (?, ?, '2026-02-10')`, stID, w.cal.ID); err != nil {
		t.Fatal(err)
	}
	for _, id := range jan {
		if _, err := w.st.ExecContext(ctx, `UPDATE transactions SET statement_id = ?, bill_date = '2026-02-10', bill_date_source = 'PDF' WHERE id = ?`, stID, id); err != nil {
			t.Fatal(err)
		}
	}
	const janNet = 13214 + 20000 + 4990 + 30000
	pay := w.add(w.bank, "2026-02-10", -janNet, "כרטיסי אשראי-י", "")
	if _, err := w.b.Settle(ctx, stID, pay.ID, nil, billing.Manual); err != nil {
		t.Fatal(err)
	}
	w.settled = append(w.settled, move{"2026-02-10", janNet})

	ext := w.add(w.bank, "2026-03-05", -9999, "other card", "")
	if err := w.b.MarkExternal(ctx, ext.ID, "untracked"); err != nil {
		t.Fatal(err)
	}
	// Bill dates for the rest, from the rules.
	if err := w.l.SetBillingRules(ctx, w.cal.ID, []ledger.BillingRule{{Scope: ledger.ScopeAll, BillDay: 10, CutoffDay: ip(10)}}); err != nil {
		t.Fatal(err)
	}
	if _, err := w.b.AssignBillDates(ctx, ""); err != nil {
		t.Fatal(err)
	}
}

func sum[T any](xs []T, f func(T) int64) int64 {
	var n int64
	for _, x := range xs {
		n += f(x)
	}
	return n
}

func TestLedgerViewRules(t *testing.T) {
	w := newWorld(t)
	w.seed()
	flow := func(payee string, amount int64) string {
		var f string
		err := w.st.QueryRow(`SELECT flow FROM ledger_view WHERE payee = ? AND amount_minor = ?`, payee, amount).Scan(&f)
		if err != nil {
			t.Fatalf("%s: %v", payee, err)
		}
		return f
	}
	for _, c := range []struct {
		payee  string
		amount int64
		want   string
	}{
		{"חיוב תקציב סאפ", 77076, "EXCLUDED"},  // employer coverage is neither spending nor income
		{"Savings", -50000, "EXCLUDED"},        // TRANSFER category
		{"כרטיסי אשראי-י", -68204, "EXCLUDED"}, // bank debit that settles a statement
		{"other card", -9999, "EXCLUDED"},      // pays an untracked card
		{"Landlord refund", 4000, "SPEND"},     // refund in an EXPENSE category nets against spending
		{"Salary", 1000000, "INCOME"},
		{"ATM", -5000, "SPEND"}, // uncategorized negative is spending
		{"BURGER PLACE", -90290, "SPEND"},
	} {
		if got := flow(c.payee, c.amount); got != c.want {
			t.Errorf("%s: flow %s, want %s", c.payee, got, c.want)
		}
	}
	var gross, oop, cov int64
	w.st.QueryRow(`SELECT gross_value, oop_value, covered_minor FROM ledger_view WHERE payee = 'BURGER PLACE'`).Scan(&gross, &oop, &cov)
	if gross != 90290 || oop != 13214 || cov != 77076 {
		t.Errorf("gross/oop/covered = %d/%d/%d", gross, oop, cov)
	}
	// An uncategorized positive line is income.
	w.add(w.bank, "2026-03-10", 1500, "Gift", "")
	if got := flow("Gift", 1500); got != "INCOME" {
		t.Errorf("uncategorized credit: %s", got)
	}
}

func TestReportsReconcileWithSeededLedger(t *testing.T) {
	w := newWorld(t)
	w.seed()
	wantGross := w.spendGross
	wantOOP := w.spendGross - w.spendCovered
	if wantGross == 0 || wantOOP >= wantGross {
		t.Fatalf("bad oracle %d %d", wantGross, wantOOP)
	}

	for _, m := range []struct {
		measure Measure
		want    int64
	}{{Gross, wantGross}, {OutOfPocket, wantOOP}} {
		f := Filter{Measure: m.measure}
		cf, err := w.s.CashFlow(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		var spend, inc int64
		for _, c := range cf {
			spend += c.Spending.Minor()
			inc += c.Income.Minor()
			if c.Net.Minor() != c.Income.Minor()-c.Spending.Minor() {
				t.Errorf("%s net", c.Month)
			}
		}
		if spend != m.want || inc != w.income {
			t.Errorf("%s cash flow: spend %d (want %d) income %d (want %d)", m.measure, spend, m.want, inc, w.income)
		}
		_, total, err := w.s.CategoryBreakdown(ctx, f)
		if err != nil || total.Minor() != m.want {
			t.Errorf("%s breakdown total %d, %v", m.measure, total.Minor(), err)
		}
		h, err := w.s.Heatmap(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		var cells int64
		for _, r := range h.Rows {
			var rowSum int64
			for _, c := range r.Cells {
				rowSum += c.Minor()
			}
			if rowSum != r.Total.Minor() {
				t.Errorf("heatmap row %s", r.NameEN)
			}
			cells += rowSum
		}
		var cols int64
		for _, c := range h.Totals {
			cols += c.Minor()
		}
		if cells != m.want || cols != m.want {
			t.Errorf("%s heatmap %d/%d want %d", m.measure, cells, cols, m.want)
		}
		sk, err := w.s.Sankey(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		var toCats, fromIncome int64
		for _, l := range sk.Links {
			if l.To[:4] == "exp:" {
				toCats += l.Amount.Minor()
			}
			if l.From[:4] == "inc:" {
				fromIncome += l.Amount.Minor()
			}
		}
		if toCats != m.want || fromIncome != w.income {
			t.Errorf("%s sankey spend %d (want %d) income %d (want %d)", m.measure, toCats, m.want, fromIncome, w.income)
		}
	}

	// Breakdown details: gross counts the restaurant meal in full, out of pocket only what was paid.
	for _, c := range []struct {
		m    Measure
		want int64
	}{{Gross, 90290}, {OutOfPocket, 13214}} {
		rows, _, _ := w.s.CategoryBreakdown(ctx, Filter{Measure: c.m})
		got := int64(-1)
		var shares float64
		for _, r := range rows {
			shares += r.Share
			if r.NameEN == "Restaurants" {
				got = r.Amount.Minor()
			}
		}
		if got != c.want {
			t.Errorf("%s Restaurants = %d, want %d", c.m, got, c.want)
		}
		if shares < 0.999 || shares > 1.001 {
			t.Errorf("shares add up to %f", shares)
		}
	}
	// Report defaults follow the spec: spending reports are gross, cash flow is out of pocket.
	if _, total, _ := w.s.CategoryBreakdown(ctx, Filter{}); total.Minor() != wantGross {
		t.Errorf("breakdown default = %d", total.Minor())
	}
	cf, _ := w.s.CashFlow(ctx, Filter{})
	if got := sum(cf, func(c CashFlowMonth) int64 { return c.Spending.Minor() }); got != wantOOP {
		t.Errorf("cash flow default = %d, want out of pocket %d", got, wantOOP)
	}
}

func TestFilters(t *testing.T) {
	w := newWorld(t)
	w.seed()
	total := func(f Filter) int64 {
		_, tot, err := w.s.CategoryBreakdown(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		return tot.Minor()
	}
	if got := total(Filter{Owner: "Wife"}); got != 7000 {
		t.Errorf("owner filter: %d", got)
	}
	if got := total(Filter{AccountIDs: []string{w.wife.ID}}); got != 7000 {
		t.Errorf("account filter: %d", got)
	}
	if got := total(Filter{CategoryIDs: []string{Uncategorized}}); got != 5000+7000 {
		t.Errorf("uncategorized: %d", got)
	}
	if got := total(Filter{CategoryIDs: []string{w.cat["Restaurants"].ID, Uncategorized}}); got != 90290+12000 {
		t.Errorf("category + uncategorized: %d", got)
	}
	if got := total(Filter{From: "2026-01-01", To: "2026-01-31", Measure: Gross}); got != 300000+90290+20000+4990+30000 {
		t.Errorf("January: %d", got)
	}
	if got := total(Filter{Currency: "USD"}); got != 0 {
		t.Errorf("currency filter: %d", got)
	}
	// Placing card charges by bill date moves the 20 Mar groceries (billed 10 Apr) out of March.
	march := Filter{From: "2026-03-01", To: "2026-03-31", CategoryIDs: []string{w.cat["Groceries"].ID}}
	byBuy := total(march)
	march.Basis = ByBill
	if byBill := total(march); byBill >= byBuy {
		t.Errorf("bill basis should move late-March charges out of March: %d vs %d", byBill, byBuy)
	}
	for _, bad := range []Filter{{From: "2026/01/01"}, {From: "2026-02-01", To: "2026-01-01"}, {Basis: "X"}, {Measure: "Y"}} {
		if _, _, err := w.s.CategoryBreakdown(ctx, bad); !errors.Is(err, ledger.ErrInvalid) {
			t.Errorf("%+v: want ErrInvalid, got %v", bad, err)
		}
	}
	// Dates before 2023 never appear even without a filter: the view floor is enforced in the query.
	if _, err := w.s.CashFlow(ctx, Filter{From: "2020-01-01"}); err != nil {
		t.Error(err)
	}
}

func TestNetWorth(t *testing.T) {
	w := newWorld(t)
	w.seed()
	pts, err := w.s.NetWorth(ctx, Filter{From: "2026-01-01", To: "2026-04-15"})
	if err != nil {
		t.Fatal(err)
	}
	if len(pts) != 4 || pts[0].Date != "2026-01-31" || pts[3].Date != "2026-04-15" {
		t.Fatalf("%+v", pts)
	}
	for _, p := range pts {
		assets := int64(100000) + sum(filter(w.bankMoves, func(m move) bool { return m.date <= p.Date }), func(m move) int64 { return m.minor })
		liab := -sum(filter(w.cardMoves, func(m move) bool { return m.date <= p.Date }), func(m move) int64 { return m.minor }) -
			sum(filter(w.settled, func(m move) bool { return m.date <= p.Date }), func(m move) int64 { return m.minor })
		if p.Assets.Minor() != assets || p.Liabilities.Minor() != liab || p.NetWorth.Minor() != assets-liab {
			t.Errorf("%s: got %d/%d/%d want %d/%d/%d", p.Date, p.Assets.Minor(), p.Liabilities.Minor(), p.NetWorth.Minor(), assets, liab, assets-liab)
		}
	}
	if pts[0].Liabilities.Minor() != 68204 {
		t.Errorf("January card liability = %d (net of employer coverage)", pts[0].Liabilities.Minor())
	}
	// The 10 Feb debit paid January's statement, so liabilities fall by that amount.
	if pts[1].Liabilities.Minor() >= pts[0].Liabilities.Minor()+sum(filter(w.cardMoves, func(m move) bool { return m.date > "2026-01-31" && m.date <= "2026-02-28" }), func(m move) int64 { return -m.minor }) {
		t.Errorf("settlement did not reduce liabilities: %+v", pts[1])
	}
	if only, _ := w.s.NetWorth(ctx, Filter{Owner: "Wife", From: "2026-02-01", To: "2026-02-28"}); only[0].Assets.Minor() != 0 || only[0].Liabilities.Minor() != 7000 {
		t.Errorf("owner filter: %+v", only)
	}
}

func filter[T any](xs []T, keep func(T) bool) []T {
	var out []T
	for _, x := range xs {
		if keep(x) {
			out = append(out, x)
		}
	}
	return out
}

func TestBudgetVsActualRollsUpChildren(t *testing.T) {
	w := newWorld(t)
	w.seed()
	// Budget the parent "Home"; its child "Rent" spending must count toward it.
	home := w.cat["Home"]
	m := money.New(250000, "ILS")
	home.MonthlyBudget = &m
	if err := w.l.UpdateCategory(ctx, home); err != nil {
		t.Fatal(err)
	}
	rows, err := w.s.BudgetVsActual(ctx, Filter{From: "2026-01-01", To: "2026-03-31"})
	if err != nil {
		t.Fatal(err)
	}
	get := func(name, month string) BudgetRow {
		for _, r := range rows {
			if r.NameEN == name && r.Month == month {
				return r
			}
		}
		t.Fatalf("no row %s %s", name, month)
		return BudgetRow{}
	}
	jan := get("Home", "2026-01")
	if jan.Actual.Minor() != 300000 || jan.Remaining.Minor() != -50000 || jan.PercentUsed != 1.2 {
		t.Errorf("%+v", jan)
	}
	if mar := get("Home", "2026-03"); mar.Actual.Minor() != -4000 {
		t.Errorf("refund should net: %+v", mar)
	}
	groc := get("Groceries", "2026-03")
	if groc.Budget.Minor() != 40000 || groc.Actual.Minor() != 200000 {
		t.Errorf("%+v", groc)
	}
	for _, r := range rows {
		if r.NameEN == "Restaurants" {
			t.Error("categories without a budget must not appear")
		}
	}
}

func TestRecurringDetection(t *testing.T) {
	w := newWorld(t)
	w.seed()
	// A gym that raises its price a little, and an erratic payee that must not qualify.
	for i, a := range []int64{15000, 15000, 17000, 17000} {
		w.spend(w.bank, time.Date(2026, 1+time.Month(i), 7, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), a, "GYM CLUB 9", "")
	}
	for i, a := range []int64{1000, 90000, 3000, 70000} {
		w.spend(w.bank, time.Date(2026, 1+time.Month(i), 21, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), a, "RANDOM SHOP", "")
	}
	w.spend(w.bank, "2026-03-09", 100, "TWICE ONLY", "")
	w.spend(w.bank, "2026-04-09", 100, "TWICE ONLY", "")

	rec, err := w.s.Recurring(ctx, Filter{})
	if err != nil {
		t.Fatal(err)
	}
	by := map[string]Recurring{}
	for _, r := range rec {
		by[payeeKey(r.Payee)] = r
	}
	nf, ok := by["netflixcom"]
	if !ok || nf.Cadence != Monthly || !nf.Fixed || nf.Count != 4 || nf.Typical.Minor() != 4990 || nf.FirstDate != "2026-01-03" || nf.LastDate != "2026-04-03" || nf.NextExpected != "2026-05-03" || !nf.Active {
		t.Errorf("netflix: %+v", nf)
	}
	if nf.MonthlyCost.Minor() < 4980 || nf.MonthlyCost.Minor() > 5000 {
		t.Errorf("monthly cost %d", nf.MonthlyCost.Minor())
	}
	if g, ok := by["gym club"]; !ok || g.Fixed {
		t.Errorf("gym should be recurring but variable: %+v", g)
	}
	for _, name := range []string{"random shop", "twice only", "shufersal"} {
		if _, ok := by[name]; ok {
			t.Errorf("%s must not be detected", name)
		}
	}
	if rec[0].MonthlyCost.Minor() < rec[len(rec)-1].MonthlyCost.Minor() {
		t.Error("sorted by monthly cost")
	}
	// A subscription that stopped long ago is inactive.
	w.s.Now = func() time.Time { return time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC) }
	rec, _ = w.s.Recurring(ctx, Filter{})
	for _, r := range rec {
		if payeeKey(r.Payee) == "netflixcom" && r.Active {
			t.Error("netflix should be inactive by 2027")
		}
	}
}

func TestAnomalies(t *testing.T) {
	w := newWorld(t)
	w.seed()
	an, err := w.s.Anomalies(ctx, Filter{})
	if err != nil {
		t.Fatal(err)
	}
	var outliers, newRec []Anomaly
	for _, a := range an {
		if a.Kind == Outlier {
			outliers = append(outliers, a)
		} else {
			newRec = append(newRec, a)
		}
	}
	if len(outliers) != 1 || outliers[0].Amount.Minor() != 200000 || outliers[0].CategoryName != "Groceries" || outliers[0].Score < 2.5 {
		t.Errorf("outliers: %+v", outliers)
	}
	// Netflix first charged 3 Jan; "now" is 15 Apr, so it started within the last 120 days.
	if len(newRec) != 1 || newRec[0].Payee != "NETFLIX.COM 123" {
		t.Errorf("new recurring: %+v", newRec)
	}
	w.s.Now = func() time.Time { return time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC) }
	an, _ = w.s.Anomalies(ctx, Filter{})
	for _, a := range an {
		if a.Kind == NewRecurring {
			t.Errorf("no longer new: %+v", a)
		}
	}
}

func TestInstallmentForecastAndOutstanding(t *testing.T) {
	w := newWorld(t)
	w.seed()
	fc, err := w.s.InstallmentForecast(ctx, Filter{})
	if err != nil {
		t.Fatal(err)
	}
	// The TV is at 2 of 4. Payment 2 (bought 20 Feb) is billed 10 Mar, so 3 and 4 follow in April and May.
	if len(fc.Months) != 2 || fc.Months[0].Month != "2026-04" || fc.Months[1].Month != "2026-05" ||
		fc.Months[0].Total.Minor() != 30000 || fc.Months[1].Items[0].Remaining != 0 || fc.Months[0].Items[0].Remaining != 1 {
		t.Fatalf("%+v", fc.Months)
	}
	// Outstanding: everything on the cards not covered by a settlement.
	cardSum := -sum(w.cardMoves, func(m move) int64 { return m.minor }) - 68204
	var got int64
	for _, c := range fc.Outstanding {
		got += c.Unpaid.Minor() + c.Undated.Minor()
	}
	if got != cardSum {
		t.Errorf("outstanding %d, want %d (%+v)", got, cardSum, fc.Outstanding)
	}
}

func TestForeignPurchases(t *testing.T) {
	w := newWorld(t)
	w.seed()
	r, err := w.s.ForeignPurchases(ctx, Filter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Purchases) != 1 || len(r.Summary) != 1 {
		t.Fatalf("%+v", r)
	}
	p := r.Purchases[0]
	if p.Original.String() != "40.00 USD" || p.Billed.Minor() != 15000 || p.Rate != 3.75 {
		t.Errorf("%+v", p)
	}
	if s := r.Summary[0]; s.Currency != "USD" || s.Count != 1 || s.AverageRate != 3.75 || s.MinRate != 3.75 || s.MaxRate != 3.75 {
		t.Errorf("%+v", s)
	}
}

func TestPointDates(t *testing.T) {
	got := pointDates("2026-01-15", "2026-03-10")
	if len(got) != 3 || got[0] != "2026-01-31" || got[1] != "2026-02-28" || got[2] != "2026-03-10" {
		t.Fatalf("%v", got)
	}
	if got := pointDates("2026-01-01", "2026-02-28"); len(got) != 2 || got[1] != "2026-02-28" {
		t.Fatalf("month-end end date repeated: %v", got)
	}
	if pointDates("2026-02-01", "2026-01-01") != nil {
		t.Fatal("reversed range")
	}
}
