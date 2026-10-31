package ledger

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

func newLedger(t *testing.T) *Ledger {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	return New(st)
}

func mustAccount(t *testing.T, l *Ledger, name string, typ AccountType) *Account {
	t.Helper()
	a := &Account{Name: name, Type: typ, Institution: "X", Owner: "Alice", Last4: "1001"}
	if err := l.CreateAccount(ctx, a); err != nil {
		t.Fatal(err)
	}
	return a
}

func mustCategory(t *testing.T, l *Ledger, en string, typ CategoryType) *Category {
	t.Helper()
	c := &Category{NameEN: en, NameHE: en + "-he", Type: typ}
	if err := l.CreateCategory(ctx, c); err != nil {
		t.Fatal(err)
	}
	return c
}

func tx(acc *Account, date string, minor int64, payee string) *Transaction {
	return &Transaction{AccountID: acc.ID, Date: date, Amount: money.New(minor, acc.Currency), PayeeRaw: payee}
}

func mustInsert(t *testing.T, l *Ledger, x *Transaction) *Transaction {
	t.Helper()
	if err := l.InsertTransaction(ctx, x); err != nil {
		t.Fatal(err)
	}
	return x
}

func wantInvalid(t *testing.T, err error) {
	t.Helper()
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestAccountValidationAndLifecycle(t *testing.T) {
	l := newLedger(t)
	wantInvalid(t, l.CreateAccount(ctx, &Account{Type: Bank, Institution: "X"}))
	wantInvalid(t, l.CreateAccount(ctx, &Account{Name: "a", Type: "SAVINGS", Institution: "X"}))
	wantInvalid(t, l.CreateAccount(ctx, &Account{Name: "a", Type: Bank, Institution: "X", Last4: "12"}))
	wantInvalid(t, l.CreateAccount(ctx, &Account{Name: "a", Type: Bank, Institution: "X", Currency: "XXX"}))
	limit := money.New(3000000, money.ILS)
	wantInvalid(t, l.CreateAccount(ctx, &Account{Name: "a", Type: Bank, Institution: "X", CreditLimit: &limit}))

	card := &Account{Name: "Cal 1001", Type: CreditCard, Institution: "Cal", Owner: "Alice", Last4: "1001", CreditLimit: &limit}
	if err := l.CreateAccount(ctx, card); err != nil {
		t.Fatal(err)
	}
	got, err := l.GetAccount(ctx, card.ID)
	if err != nil || got.Currency != money.ILS || got.CreditLimit.Minor() != 3000000 || got.Last4 != "1001" {
		t.Fatalf("got %+v %v", got, err)
	}
	mustInsert(t, l, tx(card, "2026-06-10", -2150, "x"))
	if err := l.DeleteAccount(ctx, card.ID); !errors.Is(err, ErrInUse) {
		t.Fatalf("want ErrInUse, got %v", err)
	}
	got.Type = Bank
	got.CreditLimit = nil
	wantInvalid(t, l.UpdateAccount(ctx, got)) // type change blocked once it has transactions
	if _, err := l.GetAccount(ctx, "nope"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	empty := mustAccount(t, l, "Empty", Bank)
	if err := l.DeleteAccount(ctx, empty.ID); err != nil {
		t.Fatal(err)
	}
}

func TestBillingRules(t *testing.T) {
	l := newLedger(t)
	card := mustAccount(t, l, "Isracard 1002", CreditCard)
	bank := mustAccount(t, l, "Leumi", Bank)
	cut10, cut2 := 10, 2
	rules := []BillingRule{
		{Scope: ScopeLocal, BillDay: 10, MonthOffset: 0, CutoffDay: &cut10},
		{Scope: ScopeForeign, BillDay: 2, MonthOffset: 1, CutoffDay: &cut2},
	}
	if err := l.SetBillingRules(ctx, card.ID, rules); err != nil {
		t.Fatal(err)
	}
	got, err := l.BillingRules(ctx, card.ID)
	if err != nil || len(got) != 2 || got[0].Scope != ScopeForeign || *got[1].CutoffDay != 10 {
		t.Fatalf("got %+v %v", got, err)
	}
	// Replacing is atomic: an invalid set leaves the old rules intact.
	wantInvalid(t, l.SetBillingRules(ctx, card.ID, []BillingRule{{Scope: ScopeLocal, BillDay: 10}, {Scope: ScopeLocal, BillDay: 11}}))
	wantInvalid(t, l.SetBillingRules(ctx, card.ID, []BillingRule{{Scope: ScopeAll, BillDay: 10}, {Scope: ScopeForeign, BillDay: 2}}))
	wantInvalid(t, l.SetBillingRules(ctx, card.ID, []BillingRule{{Scope: ScopeLocal, BillDay: 0}}))
	wantInvalid(t, l.SetBillingRules(ctx, bank.ID, rules))
	if got, _ := l.BillingRules(ctx, card.ID); len(got) != 2 {
		t.Fatalf("rules changed by failed update: %+v", got)
	}
}

func TestTransactionValidation(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "Cal", CreditCard)
	for name, x := range map[string]*Transaction{
		"before floor":   tx(a, "2022-12-31", -100, "p"),
		"bad date":       tx(a, "2026-02-30", -100, "p"),
		"no payee":       tx(a, "2026-01-01", -100, " "),
		"wrong currency": {AccountID: a.ID, Date: "2026-01-01", Amount: money.New(-100, money.USD), PayeeRaw: "p"},
		"bad account":    {AccountID: "nope", Date: "2026-01-01", Amount: money.New(-100, money.ILS), PayeeRaw: "p"},
	} {
		if err := l.InsertTransaction(ctx, x); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: want ErrInvalid, got %v", name, err)
		}
	}
	one, three := 1, 3
	bad := tx(a, "2026-01-01", -100, "p")
	bad.CurrentInstallment = &one
	wantInvalid(t, l.InsertTransaction(ctx, bad))
	bad = tx(a, "2026-01-01", -100, "p")
	bad.CurrentInstallment, bad.TotalInstallments = &three, &one
	wantInvalid(t, l.InsertTransaction(ctx, bad))
	bad = tx(a, "2026-01-01", -100, "p")
	d := "2026-02-10"
	bad.BillDate = &d // missing source
	wantInvalid(t, l.InsertTransaction(ctx, bad))
	bad = tx(a, "2026-01-01", -100, "p")
	missing := "no-such-category"
	bad.CategoryID = &missing
	wantInvalid(t, l.InsertTransaction(ctx, bad))
}

func TestTransactionRoundTripAndDuplicates(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "Isracard", CreditCard)
	cat := mustCategory(t, l, "Restaurants", Expense)
	usd := money.New(2500, money.USD)
	src, bd, cnt := SourcePDF, "2026-07-02", 2
	in := tx(a, "2026-05-27", -7085, "KICKSTARTER.COM")
	in.ImportKey, in.Original, in.Scope = "k1", &usd, TxForeign
	in.BillDate, in.BillDateSource, in.CategoryID = &bd, &src, &cat.ID
	in.CurrentInstallment, in.TotalInstallments = &cnt, &cnt
	mustInsert(t, l, in)

	got, err := l.GetTransaction(ctx, in.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount.Minor() != -7085 || got.Original.Currency() != money.USD || got.Original.Minor() != 2500 ||
		got.Scope != TxForeign || *got.BillDate != bd || *got.BillDateSource != SourcePDF ||
		got.CategoryNameEN != "Restaurants" || got.AccountName != "Isracard" || *got.TotalInstallments != 2 {
		t.Fatalf("round trip mismatch: %+v", got)
	}
	dup := tx(a, "2026-05-27", -7085, "KICKSTARTER.COM")
	dup.ImportKey = "k1"
	if err := l.InsertTransaction(ctx, dup); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("want ErrDuplicate, got %v", err)
	}
	// Manual entries get unique generated keys.
	m1 := mustInsert(t, l, tx(a, "2026-05-28", -100, "cash"))
	m2 := mustInsert(t, l, tx(a, "2026-05-28", -100, "cash"))
	if m1.ImportKey == m2.ImportKey {
		t.Fatal("manual keys collided")
	}
}

func TestEmployerCoverage(t *testing.T) {
	l := newLedger(t)
	card := mustAccount(t, l, "Cal", CreditCard)
	other := mustAccount(t, l, "Other", CreditCard)
	bank := mustAccount(t, l, "Leumi", Bank)
	purchase := mustInsert(t, l, tx(card, "2026-07-04", -90290, "טיב טעם"))
	cov := func(acc *Account, minor int64, covers *string) *Transaction {
		x := tx(acc, "2026-07-04", minor, "חיוב תקציב")
		x.Kind, x.CoversID = KindEmployerCoverage, covers
		return x
	}
	wantInvalid(t, l.InsertTransaction(ctx, cov(card, -77076, &purchase.ID))) // must be positive
	wantInvalid(t, l.InsertTransaction(ctx, cov(card, 90291, &purchase.ID)))  // more than the purchase
	wantInvalid(t, l.InsertTransaction(ctx, cov(other, 100, &purchase.ID)))   // different card
	wantInvalid(t, l.InsertTransaction(ctx, cov(bank, 100, nil)))             // banks have no employer coverage
	plain := tx(card, "2026-07-04", -100, "x")
	plain.CoversID = &purchase.ID
	wantInvalid(t, l.InsertTransaction(ctx, plain)) // only coverage lines may cover
	ok := mustInsert(t, l, cov(card, 77076, &purchase.ID))
	if ok.Kind != KindEmployerCoverage {
		t.Fatal("kind lost")
	}
	// Deleting the purchase removes its coverage line.
	if err := l.DeleteTransaction(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := l.GetTransaction(ctx, ok.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("coverage line should be gone: %v", err)
	}
}

func TestQueryFiltersPaginationAndEscaping(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "A", Bank)
	b := mustAccount(t, l, "B", CreditCard)
	food := mustCategory(t, l, "Food", Expense)
	fuel := mustCategory(t, l, "Fuel", Expense)
	x1 := tx(a, "2026-06-01", -100, "Shufersal")
	x1.CategoryID = &food.ID
	x2 := tx(a, "2026-06-15", -200, "100% Fuel_Co")
	x2.CategoryID = &fuel.ID
	x3 := tx(b, "2026-07-01", -300, "Mystery")
	for _, x := range []*Transaction{x1, x2, x3} {
		mustInsert(t, l, x)
	}
	q := func(f TxFilter) (int, int) {
		rows, total, err := l.QueryTransactions(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		return len(rows), total
	}
	if n, total := q(TxFilter{}); n != 3 || total != 3 {
		t.Fatalf("all: %d/%d", n, total)
	}
	if n, _ := q(TxFilter{AccountIDs: []string{b.ID}}); n != 1 {
		t.Fatalf("account: %d", n)
	}
	if n, _ := q(TxFilter{CategoryIDs: []string{food.ID}}); n != 1 {
		t.Fatalf("category: %d", n)
	}
	if n, _ := q(TxFilter{CategoryIDs: []string{Uncategorized}}); n != 1 {
		t.Fatalf("uncategorized: %d", n)
	}
	if n, _ := q(TxFilter{CategoryIDs: []string{Uncategorized, fuel.ID}}); n != 2 {
		t.Fatalf("uncategorized+fuel: %d", n)
	}
	if n, _ := q(TxFilter{DateFrom: "2026-06-10", DateTo: "2026-06-30"}); n != 1 {
		t.Fatalf("dates: %d", n)
	}
	if n, _ := q(TxFilter{Search: "100%"}); n != 1 { // % is literal, not a wildcard
		t.Fatalf("literal percent: %d", n)
	}
	if n, _ := q(TxFilter{Search: "%"}); n != 1 {
		t.Fatalf("bare percent should match only the literal: %d", n)
	}
	if n, _ := q(TxFilter{Search: "_"}); n != 1 {
		t.Fatalf("bare underscore should match only the literal: %d", n)
	}
	if n, total := q(TxFilter{Limit: 2}); n != 2 || total != 3 {
		t.Fatalf("limit: %d/%d", n, total)
	}
	if n, _ := q(TxFilter{Limit: 2, Offset: 2}); n != 1 {
		t.Fatalf("offset: %d", n)
	}
	rows, _, _ := l.QueryTransactions(ctx, TxFilter{})
	if rows[0].Date != "2026-07-01" || rows[2].Date != "2026-06-01" {
		t.Fatalf("not newest first: %v %v", rows[0].Date, rows[2].Date)
	}
	if _, _, err := l.QueryTransactions(ctx, TxFilter{DateFrom: "2020-01-01"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("pre-floor filter date: %v", err)
	}
}

func TestPageSizeCap(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "A", Bank)
	for i := 0; i < 5; i++ {
		x := tx(a, "2026-06-01", -100, "p")
		mustInsert(t, l, x)
	}
	rows, _, err := l.QueryTransactions(ctx, TxFilter{Limit: 1_000_000})
	if err != nil || len(rows) != 5 {
		t.Fatalf("%d %v", len(rows), err)
	}
	ids := make([]string, MaxPageSize+1)
	_, err = l.BulkUpdate(ctx, ids, TxUpdate{Reviewed: new(bool)})
	wantInvalid(t, err)
}

func TestBulkUpdate(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "A", Bank)
	cat := mustCategory(t, l, "Food", Expense)
	t1 := mustInsert(t, l, tx(a, "2026-06-01", -100, "p"))
	t2 := mustInsert(t, l, tx(a, "2026-06-02", -100, "p"))

	n, err := l.BulkUpdate(ctx, []string{t1.ID, t2.ID}, TxUpdate{CategoryID: &cat.ID})
	if err != nil || n != 2 {
		t.Fatalf("%d %v", n, err)
	}
	got, _ := l.GetTransaction(ctx, t1.ID)
	if *got.CategoryID != cat.ID || got.CategorizedBy != ByManual || !got.IsReviewed {
		t.Fatalf("manual categorization: %+v", got)
	}
	no := false
	if _, err := l.BulkUpdate(ctx, []string{t1.ID}, TxUpdate{Reviewed: &no}); err != nil {
		t.Fatal(err)
	}
	if got, _ = l.GetTransaction(ctx, t1.ID); got.IsReviewed {
		t.Fatal("reviewed flag not cleared")
	}
	if _, err := l.BulkUpdate(ctx, []string{t1.ID}, TxUpdate{ClearCategory: true}); err != nil {
		t.Fatal(err)
	}
	if got, _ = l.GetTransaction(ctx, t1.ID); got.CategoryID != nil || got.CategorizedBy != ByUnset {
		t.Fatalf("clear: %+v", got)
	}
	// Atomic: one unknown id changes nothing.
	if _, err := l.BulkUpdate(ctx, []string{t2.ID, "ghost"}, TxUpdate{ClearCategory: true}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if got, _ = l.GetTransaction(ctx, t2.ID); got.CategoryID == nil {
		t.Fatal("partial update leaked through a failed bulk update")
	}
	missing := "ghost"
	_, err = l.BulkUpdate(ctx, []string{t2.ID}, TxUpdate{CategoryID: &missing})
	wantInvalid(t, err)
	_, err = l.BulkUpdate(ctx, []string{t2.ID}, TxUpdate{CategoryID: &cat.ID, ClearCategory: true})
	wantInvalid(t, err)
	_, err = l.BulkUpdate(ctx, []string{t2.ID}, TxUpdate{})
	wantInvalid(t, err)
}

func TestCategories(t *testing.T) {
	l := newLedger(t)
	wantInvalid(t, l.CreateCategory(ctx, &Category{Type: Expense}))
	wantInvalid(t, l.CreateCategory(ctx, &Category{NameEN: "x", Type: "WEIRD"}))
	wantInvalid(t, l.CreateCategory(ctx, &Category{NameEN: "x", Type: Expense, ColorHex: "blue"}))
	food := mustCategory(t, l, "Food", Expense)
	if err := l.CreateCategory(ctx, &Category{NameEN: "FOOD", Type: Expense}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("want ErrDuplicate, got %v", err)
	}
	child := &Category{NameEN: "Groceries", Type: Expense, ParentID: &food.ID, CreatedBy: ByLLM}
	if err := l.CreateCategory(ctx, child); err != nil {
		t.Fatal(err)
	}
	if got, _ := l.GetCategory(ctx, child.ID); got.CreatedBy != ByLLM || *got.ParentID != food.ID {
		t.Fatalf("%+v", got)
	}
	// Cycles are rejected.
	food.ParentID = &child.ID
	wantInvalid(t, l.UpdateCategory(ctx, food))
	if c, err := l.FindCategoryByName(ctx, "groceries"); err != nil || c.ID != child.ID {
		t.Fatalf("find by name: %v %v", c, err)
	}
	if c, err := l.FindCategoryByName(ctx, "groceries-he"); err == nil {
		t.Fatalf("unexpected match %v", c) // Hebrew names match exactly, not by English casing
	}
	budget := money.New(150000, money.ILS)
	child.MonthlyBudget = &budget
	if err := l.UpdateCategory(ctx, child); err != nil {
		t.Fatal(err)
	}
	if got, _ := l.GetCategory(ctx, child.ID); got.MonthlyBudget.Minor() != 150000 {
		t.Fatalf("budget: %+v", got)
	}
}

func TestMergeAndDeleteCategory(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "A", Bank)
	from := mustCategory(t, l, "Eating out", Expense)
	to := mustCategory(t, l, "Restaurants", Expense)
	sub := &Category{NameEN: "Cafes", Type: Expense, ParentID: &from.ID}
	if err := l.CreateCategory(ctx, sub); err != nil {
		t.Fatal(err)
	}
	x := tx(a, "2026-06-01", -100, "p")
	x.CategoryID = &from.ID
	mustInsert(t, l, x)

	wantInvalid(t, l.MergeCategories(ctx, from.ID, from.ID))
	wantInvalid(t, l.MergeCategories(ctx, from.ID, sub.ID)) // into its own descendant
	if err := l.MergeCategories(ctx, from.ID, "ghost"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if err := l.MergeCategories(ctx, from.ID, to.ID); err != nil {
		t.Fatal(err)
	}
	if got, _ := l.GetTransaction(ctx, x.ID); *got.CategoryID != to.ID {
		t.Fatalf("transaction not moved: %+v", got)
	}
	if got, _ := l.GetCategory(ctx, sub.ID); *got.ParentID != to.ID {
		t.Fatalf("child not re-parented: %+v", got)
	}
	if _, err := l.GetCategory(ctx, from.ID); !errors.Is(err, ErrNotFound) {
		t.Fatal("source category still exists")
	}
	// Deleting leaves transactions uncategorized.
	if err := l.DeleteCategory(ctx, to.ID); err != nil {
		t.Fatal(err)
	}
	if got, _ := l.GetTransaction(ctx, x.ID); got.CategoryID != nil {
		t.Fatalf("expected uncategorized: %+v", got)
	}
	if err := l.DeleteCategory(ctx, to.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestCategoryDescription(t *testing.T) {
	l := newLedger(t)
	c := &Category{NameEN: "Restaurants", NameHE: "מסעדות", Type: Expense, Description: "  Wolt, Ten Bis, Aroma  "}
	if err := l.CreateCategory(ctx, c); err != nil {
		t.Fatal(err)
	}
	got, _ := l.GetCategory(ctx, c.ID)
	if got.Description != "Wolt, Ten Bis, Aroma" {
		t.Fatalf("%q", got.Description)
	}
	got.Description = "Delivery too"
	if err := l.UpdateCategory(ctx, got); err != nil {
		t.Fatal(err)
	}
	if again, _ := l.GetCategory(ctx, c.ID); again.Description != "Delivery too" {
		t.Fatalf("%q", again.Description)
	}
	long := &Category{NameEN: "Long", Type: Expense, Description: strings.Repeat("ש", MaxDescription+1)}
	wantInvalid(t, l.CreateCategory(ctx, long))
	ok := &Category{NameEN: "Exactly", Type: Expense, Description: strings.Repeat("ש", MaxDescription)}
	if err := l.CreateCategory(ctx, ok); err != nil {
		t.Fatalf("the limit counts characters, not bytes: %v", err)
	}
}

func TestListCategoriesCountsTransactions(t *testing.T) {
	l := newLedger(t)
	a := mustAccount(t, l, "A", Bank)
	used := mustCategory(t, l, "Used", Expense)
	mustCategory(t, l, "Empty", Expense)
	for i, d := range []string{"2026-06-01", "2026-06-02"} {
		x := tx(a, d, -100-int64(i), "p")
		x.CategoryID = &used.ID
		mustInsert(t, l, x)
	}
	mustInsert(t, l, tx(a, "2026-06-03", -300, "q")) // uncategorized
	cats, err := l.ListCategories(ctx)
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]int{}
	for _, c := range cats {
		got[c.NameEN] = c.TxCount
	}
	if got["Used"] != 2 || got["Empty"] != 0 {
		t.Fatalf("counts: %v", got)
	}
}
