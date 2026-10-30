package categorize

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/llm"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

type env struct {
	t   *testing.T
	st  *store.Store
	l   *ledger.Ledger
	acc *ledger.Account
}

func newEnv(t *testing.T) *env {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	l := ledger.New(st)
	acc := &ledger.Account{Name: "Cal", Type: ledger.CreditCard, Institution: "Cal", Owner: "Alice", Last4: "1001"}
	if err := l.CreateAccount(ctx, acc); err != nil {
		t.Fatal(err)
	}
	return &env{t, st, l, acc}
}

func (e *env) cat(en string, typ ledger.CategoryType) *ledger.Category {
	c := &ledger.Category{NameEN: en, NameHE: en + "-he", Type: typ}
	if err := e.l.CreateCategory(ctx, c); err != nil {
		e.t.Fatal(err)
	}
	return c
}

func (e *env) tx(date string, minor int64, payee string) *ledger.Transaction {
	x := &ledger.Transaction{AccountID: e.acc.ID, Date: date, Amount: money.New(minor, e.acc.Currency), PayeeRaw: payee}
	if err := e.l.InsertTransaction(ctx, x); err != nil {
		e.t.Fatal(err)
	}
	return x
}

func (e *env) get(id string) *ledger.Transaction {
	x, err := e.l.GetTransaction(ctx, id)
	if err != nil {
		e.t.Fatal(err)
	}
	return x
}

// fake is a scriptable model. fn sees the decoded prompt and returns the reply.
type fake struct {
	mu    sync.Mutex
	calls int
	fn    func(call int, p prompt) (string, error)
}

func (f *fake) Chat(c context.Context, model, system, user string) (string, error) {
	f.mu.Lock()
	f.calls++
	n := f.calls
	f.mu.Unlock()
	var p prompt
	if err := json.Unmarshal([]byte(user), &p); err != nil {
		return "", err
	}
	return f.fn(n, p)
}

func (f *fake) count() int { f.mu.Lock(); defer f.mu.Unlock(); return f.calls }

// classify answers every item with category id and confidence chosen by payee.
func classify(pick func(payee string) (catID string, conf float64)) *fake {
	return &fake{fn: func(_ int, p prompt) (string, error) {
		var rs []map[string]any
		for _, it := range p.Items {
			id, conf := pick(it.Payee)
			rs = append(rs, map[string]any{"id": it.ID, "category_id": id, "confidence": conf})
		}
		b, _ := json.Marshal(map[string]any{"results": rs})
		return string(b), nil
	}}
}

func generate(pick func(payee string) (en, he, typ string)) *fake {
	return &fake{fn: func(_ int, p prompt) (string, error) {
		var rs []map[string]any
		for _, it := range p.Items {
			en, he, typ := pick(it.Payee)
			rs = append(rs, map[string]any{"id": it.ID, "name_en": en, "name_he": he, "type": typ})
		}
		b, _ := json.Marshal(map[string]any{"results": rs})
		return string(b), nil
	}}
}

func (e *env) svc(cl, ge Chatter, mod ...func(*Options)) *Service {
	o := Options{Classifier: cl, Generator: ge, ClassifierModel: "decide", GeneratorModel: "write", Backoff: time.Millisecond}
	for _, m := range mod {
		m(&o)
	}
	return New(e.st, e.l, o)
}

func (e *env) run(s *Service) *Run {
	e.t.Helper()
	id, err := s.Start(ctx)
	if err != nil {
		e.t.Fatal(err)
	}
	s.Wait(id)
	r, err := s.GetRun(ctx, id)
	if err != nil {
		e.t.Fatal(err)
	}
	return r
}

func TestThresholdBoundary(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	hi := e.tx("2024-03-01", -1000, "AT-THRESHOLD")
	lo := e.tx("2024-03-01", -1000, "JUST-BELOW")
	cl := classify(func(p string) (string, float64) {
		if p == "AT-THRESHOLD" {
			return food.ID, 0.75
		}
		return food.ID, 0.74
	})
	ge := generate(func(string) (string, string, string) { return "Snacks", "חטיפים", "EXPENSE" })
	r := e.run(e.svc(cl, ge))
	if r.Status != "DONE" || r.Processed != 2 || r.Total != 2 {
		t.Fatalf("%+v", r)
	}
	a := e.get(hi.ID)
	if *a.CategoryID != food.ID || a.CategorizedBy != ledger.ByModel || *a.LLMConfidence != 0.75 || *a.RunID != r.ID {
		t.Fatalf("at-threshold: %+v", a)
	}
	b := e.get(lo.ID)
	if b.CategoryNameEN != "Snacks" || *b.CategoryID == food.ID {
		t.Fatalf("below-threshold should go to the generator: %+v", b)
	}
	if ge.count() != 1 {
		t.Fatalf("generator calls = %d", ge.count())
	}
}

func TestGeneratorNotCalledWhenClassifierConfident(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	e.tx("2024-03-01", -1000, "SHUFERSAL")
	ge := generate(func(string) (string, string, string) { return "X", "X", "EXPENSE" })
	e.run(e.svc(classify(func(string) (string, float64) { return food.ID, 0.99 }), ge))
	if ge.count() != 0 {
		t.Fatal("generator must not be called")
	}
}

func TestUnknownIDsAreIgnored(t *testing.T) {
	e := newEnv(t)
	e.cat("Food", ledger.Expense)
	x := e.tx("2024-03-01", -1000, "MYSTERY")
	// Classifier is "100% sure" of a category id that does not exist, and also answers an item that was never asked.
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		return `{"results":[{"id":"0","category_id":"made-up","confidence":1},{"id":"77","category_id":"x","confidence":1}]}`, nil
	}}
	ge := generate(func(string) (string, string, string) { return "Mystery Things", "דברים", "EXPENSE" })
	e.run(e.svc(cl, ge))
	if got := e.get(x.ID); got.CategoryNameEN != "Mystery Things" {
		t.Fatalf("unknown category id must fall through to the generator: %+v", got)
	}
}

func TestMissingAndLooseResponses(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	a := e.tx("2024-03-01", -1000, "A")
	b := e.tx("2024-03-02", -1000, "B")
	// Numeric ids, code fences and chatter; B is omitted by the classifier and so goes to the generator.
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		return "Sure!\n```json\n{\"results\":[{\"id\":" + p.Items[0].ID + ",\"category_id\":\"" + food.ID + "\",\"confidence\":0.9}]}\n```", nil
	}}
	ge := generate(func(string) (string, string, string) { return "Other Stuff", "אחר", "EXPENSE" })
	e.run(e.svc(cl, ge))
	first, second := e.get(a.ID), e.get(b.ID)
	if first.CategoryNameEN == second.CategoryNameEN {
		t.Fatalf("expected different categories, got %q for both", first.CategoryNameEN)
	}
	if first.CategoryNameEN != "Food" && second.CategoryNameEN != "Food" {
		t.Fatal("neither item got the classified category")
	}
}

func TestGeneratedCategoriesAreDeduplicated(t *testing.T) {
	e := newEnv(t)
	existing := e.cat("Pets", ledger.Expense)
	x1 := e.tx("2024-03-01", -1000, "VET ONE")
	x2 := e.tx("2024-03-02", -1000, "VET TWO")
	x3 := e.tx("2024-03-03", -1000, "AQUARIUM")
	cl := classify(func(string) (string, float64) { return "", 0 })
	ge := generate(func(p string) (string, string, string) {
		switch p {
		case "VET ONE":
			return "Veterinary", "וטרינר", "EXPENSE"
		case "VET TWO":
			return "veterinary", "וטרינר", "expense" // same name, different case
		}
		return "PETS", "חיות", "EXPENSE" // already exists, different case
	})
	e.run(e.svc(cl, ge))
	if e.get(x1.ID).CategoryID == nil || *e.get(x1.ID).CategoryID != *e.get(x2.ID).CategoryID {
		t.Fatal("same proposed name must map to one category")
	}
	if *e.get(x3.ID).CategoryID != existing.ID {
		t.Fatal("proposal matching an existing category must reuse it")
	}
	cats, _ := e.l.ListCategories(ctx)
	if len(cats) != 2 {
		t.Fatalf("want 2 categories, got %d", len(cats))
	}
	vet, _ := e.l.FindCategoryByName(ctx, "Veterinary")
	if vet.CreatedBy != ledger.ByLLM {
		t.Fatalf("created_by = %s", vet.CreatedBy)
	}
}

func TestIdenticalPayeesAreAskedOnce(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	for i := 1; i <= 5; i++ {
		e.tx(fmt.Sprintf("2024-03-%02d", i), -1000, "Shufersal ")
	}
	e.tx("2024-03-09", 5000, "SHUFERSAL") // refund: other direction, asked separately
	var seen []int
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		seen = append(seen, len(p.Items))
		var rs []string
		for _, it := range p.Items {
			rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.9}`, it.ID, food.ID))
		}
		return `{"results":[` + strings.Join(rs, ",") + `]}`, nil
	}}
	r := e.run(e.svc(cl, nil))
	if len(seen) != 1 || seen[0] != 2 || r.Processed != 6 {
		t.Fatalf("items per request = %v, processed = %d", seen, r.Processed)
	}
}

func TestManualCategoriesNeverOverwritten(t *testing.T) {
	e := newEnv(t)
	food, fun := e.cat("Food", ledger.Expense), e.cat("Fun", ledger.Expense)
	manual := e.tx("2024-03-01", -1000, "MANUAL ONE")
	racy := e.tx("2024-03-02", -1000, "CHANGED MID-RUN")
	if _, err := e.l.BulkUpdate(ctx, []string{manual.ID}, ledger.TxUpdate{CategoryID: &fun.ID}); err != nil {
		t.Fatal(err)
	}
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		// The user categorizes a pending transaction while the model is thinking.
		if _, err := e.l.BulkUpdate(ctx, []string{racy.ID}, ledger.TxUpdate{CategoryID: &fun.ID}); err != nil {
			t.Error(err)
		}
		return fmt.Sprintf(`{"results":[{"id":"0","category_id":"%s","confidence":0.99}]}`, food.ID), nil
	}}
	r := e.run(e.svc(cl, nil))
	if r.Total != 1 {
		t.Fatalf("manual transaction must not be selected: %+v", r)
	}
	for _, id := range []string{manual.ID, racy.ID} {
		got := e.get(id)
		if *got.CategoryID != fun.ID || got.CategorizedBy != ledger.ByManual {
			t.Fatalf("%s was overwritten: %+v", id, got)
		}
	}
}

func TestUndoRestoresState(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	a := e.tx("2024-03-01", -1000, "A")
	b := e.tx("2024-03-02", -1000, "B")
	c := e.tx("2024-03-03", -1000, "C")
	cl := classify(func(p string) (string, float64) {
		if p == "A" {
			return food.ID, 0.9
		}
		return "", 0
	})
	ge := generate(func(p string) (string, string, string) {
		if p == "B" {
			return "New One", "חדש", "EXPENSE"
		}
		return "Kept One", "נשאר", "EXPENSE"
	})
	s := e.svc(cl, ge)
	r := e.run(s)
	// The user reviews C's category and puts a manual transaction into "Kept One"'s sibling.
	if _, err := e.l.BulkUpdate(ctx, []string{c.ID}, ledger.TxUpdate{Reviewed: ptr(true)}); err != nil {
		t.Fatal(err)
	}
	n, err := s.Undo(ctx, r.ID)
	if err != nil || n != 2 {
		t.Fatalf("undone = %d, %v", n, err)
	}
	for _, id := range []string{a.ID, b.ID} {
		got := e.get(id)
		if got.CategoryID != nil || got.CategorizedBy != ledger.ByUnset || got.LLMConfidence != nil || got.RunID != nil {
			t.Fatalf("not restored: %+v", got)
		}
	}
	if got := e.get(c.ID); got.CategoryID == nil || got.CategorizedBy != ledger.ByModel {
		t.Fatalf("reviewed assignment must survive undo: %+v", got)
	}
	if _, err := e.l.FindCategoryByName(ctx, "New One"); !errors.Is(err, ledger.ErrNotFound) {
		t.Fatalf("unused generated category must be removed, got %v", err)
	}
	if _, err := e.l.FindCategoryByName(ctx, "Kept One"); err != nil {
		t.Fatalf("category still in use must stay: %v", err)
	}
	if _, err := s.Undo(ctx, r.ID); err == nil {
		t.Fatal("second undo must fail")
	}
	if got, _ := s.GetRun(ctx, r.ID); got.Status != "UNDONE" {
		t.Fatal(got.Status)
	}
}

func ptr[T any](v T) *T { return &v }

func TestRetryThenFail(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	x := e.tx("2024-03-01", -1000, "A")
	flaky := &fake{fn: func(n int, p prompt) (string, error) {
		switch n {
		case 1:
			return "", errors.New("connection reset")
		case 2:
			return "not json at all", nil
		}
		return fmt.Sprintf(`{"results":[{"id":"0","category_id":"%s","confidence":0.9}]}`, food.ID), nil
	}}
	if r := e.run(e.svc(flaky, nil)); r.Status != "DONE" || flaky.count() != 3 {
		t.Fatalf("%+v calls=%d", r, flaky.count())
	}
	if e.get(x.ID).CategoryID == nil {
		t.Fatal("not categorized after retries")
	}

	y := e.tx("2024-03-02", -1000, "B")
	dead := &fake{fn: func(int, prompt) (string, error) { return "", errors.New("503 model not loaded") }}
	r := e.run(e.svc(dead, nil))
	if r.Status != "FAILED" || !strings.Contains(r.Error, "503") || dead.count() != 3 {
		t.Fatalf("%+v calls=%d", r, dead.count())
	}
	if got := e.get(y.ID); got.CategoryID != nil || got.CategorizedBy != ledger.ByUnset {
		t.Fatal("failed run must leave transactions untouched")
	}
}

func TestCancelKeepsAppliedBatchesAndRestartFinishes(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	var ids []string
	for i := 1; i <= 4; i++ {
		ids = append(ids, e.tx(fmt.Sprintf("2024-03-%02d", i), -1000, fmt.Sprintf("SHOP %d", i)).ID)
	}
	var s *Service
	cl := &fake{fn: func(n int, p prompt) (string, error) {
		if n == 1 {
			s.Cancel() // the user cancels while the first batch is in flight
		}
		var rs []string
		for _, it := range p.Items {
			rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.9}`, it.ID, food.ID))
		}
		return `{"results":[` + strings.Join(rs, ",") + `]}`, nil
	}}
	s = e.svc(cl, nil, func(o *Options) { o.BatchSize = 2 })
	r := e.run(s)
	if r.Status != "CANCELED" || r.Processed != 2 || r.Total != 4 {
		t.Fatalf("%+v", r)
	}
	done := 0
	for _, id := range ids {
		if e.get(id).CategoryID != nil {
			done++
		}
	}
	if done != 2 {
		t.Fatalf("expected the first batch to stay applied, got %d", done)
	}
	// Restart: only the remainder is pending, and nothing from the canceled run lingers.
	r2 := e.run(s)
	if r2.Status != "DONE" || r2.Total != 2 || r2.ID == r.ID {
		t.Fatalf("%+v", r2)
	}
	for _, id := range ids {
		if e.get(id).CategoryID == nil {
			t.Fatal("restart left a transaction uncategorized")
		}
	}
}

func TestOnlyOneRunAtATime(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	e.tx("2024-03-01", -1000, "A")
	release := make(chan struct{})
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		<-release
		return fmt.Sprintf(`{"results":[{"id":"0","category_id":"%s","confidence":0.9}]}`, food.ID), nil
	}}
	s := e.svc(cl, nil)
	id, err := s.Start(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Start(ctx); !errors.Is(err, ErrBusy) {
		t.Fatalf("want ErrBusy, got %v", err)
	}
	if _, err := s.Undo(ctx, id); !errors.Is(err, ErrBusy) {
		t.Fatalf("undo of a running run: %v", err)
	}
	close(release)
	s.Wait(id)
	if _, err := s.Start(ctx); !errors.Is(err, ErrNothingToDo) {
		t.Fatalf("want ErrNothingToDo, got %v", err)
	}
}

func TestEmployerCoverageInheritsPurchaseCategory(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Restaurants", ledger.Expense)
	p := e.tx("2024-03-01", -8000, "BURGER PLACE")
	cov := &ledger.Transaction{AccountID: e.acc.ID, Date: "2024-03-01", Amount: money.New(8000, e.acc.Currency),
		PayeeRaw: "חיוב תקציב סאפ", Kind: ledger.KindEmployerCoverage, CoversID: &p.ID}
	if err := e.l.InsertTransaction(ctx, cov); err != nil {
		t.Fatal(err)
	}
	cl := classify(func(payee string) (string, float64) {
		if strings.Contains(payee, "סאפ") {
			t.Error("coverage lines must not be sent to the model")
		}
		return food.ID, 0.95
	})
	r := e.run(e.svc(cl, nil))
	if r.Total != 1 {
		t.Fatalf("%+v", r)
	}
	if got := e.get(cov.ID); got.CategoryID == nil || *got.CategoryID != food.ID {
		t.Fatalf("coverage did not inherit: %+v", got)
	}
	if _, err := e.svc(cl, nil).Undo(ctx, r.ID); err != nil {
		t.Fatal(err)
	}
	if got := e.get(cov.ID); got.CategoryID != nil {
		t.Fatal("undo must also clear inherited coverage")
	}
}

func TestRecoverMarksStaleRunsFailed(t *testing.T) {
	e := newEnv(t)
	e.st.ExecContext(ctx, `INSERT INTO categorization_runs (id) VALUES ('stale')`)
	s := e.svc(nil, nil)
	if err := s.Recover(ctx); err != nil {
		t.Fatal(err)
	}
	if r, _ := s.GetRun(ctx, "stale"); r.Status != "FAILED" || r.FinishedAt == "" {
		t.Fatalf("%+v", r)
	}
	if _, err := s.GetRun(ctx, "nope"); !errors.Is(err, ErrNotFound) {
		t.Fatal(err)
	}
}

func TestSeed(t *testing.T) {
	e := newEnv(t)
	n, err := SeedOnce(ctx, e.st, e.l)
	if err != nil || n < 30 {
		t.Fatalf("seeded %d, %v", n, err)
	}
	cats, _ := e.l.ListCategories(ctx)
	types := map[ledger.CategoryType]int{}
	for _, c := range cats {
		types[c.Type]++
		if c.NameHE == "" || c.CreatedBy != ledger.ByUser {
			t.Fatalf("%+v", c)
		}
	}
	if _, err := e.l.FindCategoryByName(ctx, "Credit cards"); err != nil {
		t.Fatal("missing the category for cards with no statements here")
	}
	if types[ledger.Expense] == 0 || types[ledger.Income] == 0 || types[ledger.Transfer] == 0 {
		t.Fatalf("types: %v", types)
	}
	// A category the user deletes must not come back on the next start.
	r, _ := e.l.FindCategoryByName(ctx, "Pets")
	if err := e.l.DeleteCategory(ctx, r.ID); err != nil {
		t.Fatal(err)
	}
	if n, err := SeedOnce(ctx, e.st, e.l); n != 0 || err != nil {
		t.Fatalf("second SeedOnce: %d, %v", n, err)
	}
	// Seed itself is idempotent and fills only gaps.
	if n, err := Seed(ctx, e.l); n != 1 || err != nil {
		t.Fatalf("Seed after deletion: %d, %v", n, err)
	}
}

func TestCardPaymentLinesAreLeftToTheUser(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	bank := &ledger.Account{Name: "Leumi", Type: ledger.Bank, Institution: "Leumi", Owner: "Alice"}
	if err := e.l.CreateAccount(ctx, bank); err != nil {
		t.Fatal(err)
	}
	ins := func(acc *ledger.Account, minor int64, payee string) *ledger.Transaction {
		x := &ledger.Transaction{AccountID: acc.ID, Date: "2024-03-01", Amount: money.New(minor, acc.Currency), PayeeRaw: payee}
		if err := e.l.InsertTransaction(ctx, x); err != nil {
			t.Fatal(err)
		}
		return x
	}
	pay := ins(bank, -50000, "כרטיסי אשראי-י")
	refund := ins(bank, 1000, "כרטיסי אשראי-י זיכוי")   // a credit is not a payment
	cardCharge := ins(e.acc, -900, "כרטיסי אשראי shop") // a card purchase is never skipped
	other := ins(bank, -700, "GROCER")
	var asked []string
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		var rs []string
		for _, it := range p.Items {
			asked = append(asked, it.Payee)
			rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.9}`, it.ID, food.ID))
		}
		return `{"results":[` + strings.Join(rs, ",") + `]}`, nil
	}}
	s := e.svc(cl, nil, func(o *Options) {
		o.CardPaymentHints = func(context.Context) ([]string, error) { return []string{"כרטיסי אשראי"}, nil }
	})
	r := e.run(s)
	if r.Total != 3 || len(asked) != 3 {
		t.Fatalf("total %d, asked %v", r.Total, asked)
	}
	if got := e.get(pay.ID); got.CategoryID != nil || got.CategorizedBy != ledger.ByUnset {
		t.Fatalf("card payment must stay uncategorized: %+v", got)
	}
	for _, x := range []*ledger.Transaction{refund, cardCharge, other} {
		if e.get(x.ID).CategoryID == nil {
			t.Fatalf("%s should have been categorized", x.PayeeRaw)
		}
	}
}

func TestConfigureDoesNotAffectRunInProgress(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	e.tx("2024-03-01", -1000, "A")
	e.tx("2024-03-02", -1000, "B")
	started, release := make(chan struct{}), make(chan struct{})
	var models []string
	var mu sync.Mutex
	chat := chatFunc(func(_ context.Context, model, _, user string) (string, error) {
		mu.Lock()
		models = append(models, model)
		mu.Unlock()
		select {
		case started <- struct{}{}:
		default:
		}
		<-release
		var p prompt
		json.Unmarshal([]byte(user), &p)
		var rs []string
		for _, it := range p.Items {
			rs = append(rs, fmt.Sprintf(`{"id":"%s","category_id":"%s","confidence":0.9}`, it.ID, food.ID))
		}
		return `{"results":[` + strings.Join(rs, ",") + `]}`, nil
	})
	s := e.svc(chat, nil, func(o *Options) { o.BatchSize = 1 })
	id, err := s.Start(ctx)
	if err != nil {
		t.Fatal(err)
	}
	<-started
	s.Configure(Options{Classifier: chat, ClassifierModel: "NEW", Generator: chat, GeneratorModel: "NEW"})
	close(release)
	s.Wait(id)
	for _, m := range models {
		if m != "decide" {
			t.Fatalf("running run switched models: %v", models)
		}
	}
	if r, _ := s.GetRun(ctx, id); r.ClassifierModel != "decide" || r.Status != "DONE" {
		t.Fatalf("%+v", r)
	}
	// The next run uses the new options.
	e.tx("2024-03-03", -1000, "C")
	models = nil
	id2, err := s.Start(ctx)
	if err != nil {
		t.Fatal(err)
	}
	s.Wait(id2)
	if len(models) == 0 || models[0] != "NEW" {
		t.Fatalf("new options not used: %v", models)
	}
}

type chatFunc func(ctx context.Context, model, system, user string) (string, error)

func (f chatFunc) Chat(ctx context.Context, model, system, user string) (string, error) {
	return f(ctx, model, system, user)
}

// fakeDecider scripts a decision model. pick returns the category NAME it would choose and a probability.
type fakeDecider struct {
	mu       sync.Mutex
	states   []string
	criteria map[string]string
	pick     func(state string) (name string, p float64)
	fail     int // fail this many calls first
}

func (f *fakeDecider) Choose(_ context.Context, model, state, instr string, criteria map[string]string) (string, float64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.states = append(f.states, state)
	f.criteria = criteria
	if f.fail > 0 {
		f.fail--
		return "", 0, errors.New("model busy")
	}
	name, p := f.pick(state)
	for key, desc := range criteria {
		if strings.HasPrefix(desc, name) {
			return key, p, nil
		}
	}
	return "", 0, fmt.Errorf("no option for %q", name)
}

func TestDecisionModelPathUsesProbabilityAgainstTheThreshold(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	e.cat("Fuel", ledger.Expense)
	hi := e.tx("2024-03-01", -1000, "AT-THRESHOLD")
	lo := e.tx("2024-03-02", -1000, "JUST-BELOW")
	d := &fakeDecider{pick: func(state string) (string, float64) {
		if strings.Contains(state, "AT-THRESHOLD") {
			return "Food", 0.75
		}
		return "Food", 0.74
	}}
	ge := generate(func(string) (string, string, string) { return "Snacks", "חטיפים", "EXPENSE" })
	r := e.run(e.svc(nil, ge, func(o *Options) { o.Decider = d }))
	if r.Status != "DONE" {
		t.Fatalf("%+v", r)
	}
	a := e.get(hi.ID)
	if *a.CategoryID != food.ID || *a.LLMConfidence != 0.75 {
		t.Fatalf("at threshold: %+v", a)
	}
	if b := e.get(lo.ID); b.CategoryNameEN != "Snacks" {
		t.Fatalf("below the threshold must go to the generator: %+v", b)
	}
	if ge.count() != 1 {
		t.Fatalf("generator calls = %d", ge.count())
	}
}

func TestDecisionModelSeesBothNamesOncePerPayeeAndKnowsIncome(t *testing.T) {
	e := newEnv(t)
	e.cat("Food", ledger.Expense)
	for i := 1; i <= 4; i++ {
		e.tx(fmt.Sprintf("2024-03-%02d", i), -1000, "שופרסל דיל")
	}
	e.tx("2024-03-09", 5000, "שופרסל דיל") // a refund: a different direction, asked separately
	d := &fakeDecider{pick: func(string) (string, float64) { return "Food", 0.95 }}
	r := e.run(e.svc(nil, nil, func(o *Options) { o.Decider = d }))
	if r.Total != 5 || len(d.states) != 2 {
		t.Fatalf("asked %d times for %d transactions: %v", len(d.states), r.Total, d.states)
	}
	var credit bool
	for _, s := range d.states {
		credit = credit || s == "Money received: שופרסל דיל"
	}
	if !credit {
		t.Fatalf("a credit must be marked as money received: %v", d.states)
	}
	found := false
	for key, desc := range d.criteria {
		if desc == "Food (Food-he)" && strings.HasPrefix(key, "c") {
			found = true
		}
	}
	if !found {
		t.Fatalf("options must be keyed c0.. and described by both names: %v", d.criteria)
	}
}

func TestDecisionModelRetriesThenFails(t *testing.T) {
	e := newEnv(t)
	e.cat("Food", ledger.Expense)
	x := e.tx("2024-03-01", -1000, "A")
	flaky := &fakeDecider{fail: 2, pick: func(string) (string, float64) { return "Food", 0.9 }}
	if r := e.run(e.svc(nil, nil, func(o *Options) { o.Decider = flaky })); r.Status != "DONE" || e.get(x.ID).CategoryID == nil {
		t.Fatalf("retries should have recovered: %+v", r)
	}
	y := e.tx("2024-03-02", -1000, "B")
	dead := &fakeDecider{fail: 100, pick: func(string) (string, float64) { return "Food", 0.9 }}
	r := e.run(e.svc(nil, nil, func(o *Options) { o.Decider = dead }))
	if r.Status != "FAILED" || !strings.Contains(r.Error, "model busy") {
		t.Fatalf("%+v", r)
	}
	if got := e.get(y.ID); got.CategoryID != nil {
		t.Fatal("a failed run must leave transactions untouched")
	}
}

func TestGeneratorOutageKeepsTheConfidentPicks(t *testing.T) {
	e := newEnv(t)
	food := e.cat("Food", ledger.Expense)
	sure := e.tx("2024-03-01", -1000, "SURE")
	unsure := e.tx("2024-03-02", -1000, "UNSURE")
	d := &fakeDecider{pick: func(state string) (string, float64) {
		if strings.Contains(state, "UNSURE") {
			return "Food", 0.4
		}
		return "Food", 0.95
	}}
	down := &fake{fn: func(int, prompt) (string, error) { return "", errors.New("generator is down") }}
	r := e.run(e.svc(nil, down, func(o *Options) { o.Decider = d }))
	if r.Status != "DONE" || !strings.Contains(r.Error, "generator") {
		t.Fatalf("the run should finish and say what failed: %+v", r)
	}
	if got := e.get(sure.ID); got.CategoryID == nil || *got.CategoryID != food.ID {
		t.Fatalf("the confident pick was lost: %+v", got)
	}
	if got := e.get(unsure.ID); got.CategoryID != nil || got.CategorizedBy != ledger.ByUnset {
		t.Fatalf("an unresolved payee must stay uncategorized: %+v", got)
	}
	// A later run, with the generator back, finishes the job.
	up := generate(func(string) (string, string, string) { return "Snacks", "חטיפים", "EXPENSE" })
	if r2 := e.run(e.svc(nil, up, func(o *Options) { o.Decider = d })); r2.Status != "DONE" || e.get(unsure.ID).CategoryID == nil {
		t.Fatalf("%+v", r2)
	}
}

func TestTheModelReceivesCategoryDescriptions(t *testing.T) {
	e := newEnv(t)
	c := &ledger.Category{NameEN: "Restaurants", NameHE: "מסעדות", Type: ledger.Expense, Description: "Wolt, Ten Bis, Aroma"}
	if err := e.l.CreateCategory(ctx, c); err != nil {
		t.Fatal(err)
	}
	e.cat("Fuel", ledger.Expense)
	e.tx("2024-03-01", -1000, "WOLT")
	d := &fakeDecider{pick: func(string) (string, float64) { return "Restaurants", 0.9 }}
	e.run(e.svc(nil, nil, func(o *Options) { o.Decider = d }))
	var with, without bool
	for _, desc := range d.criteria {
		with = with || desc == "Restaurants (מסעדות): Wolt, Ten Bis, Aroma"
		without = without || desc == "Fuel (Fuel-he)"
	}
	if !with || !without {
		t.Fatalf("a described category carries its description, an undescribed one does not add a colon: %v", d.criteria)
	}
	// The chat path sees it too, and leaves the field out when empty.
	var prompts []string
	cl := &fake{fn: func(_ int, p prompt) (string, error) {
		b, _ := json.Marshal(p.Categories)
		prompts = append(prompts, string(b))
		return `{"results":[]}`, nil
	}}
	e.tx("2024-03-02", -1000, "OTHER")
	e.run(e.svc(cl, generate(func(string) (string, string, string) { return "X", "X", "EXPENSE" })))
	if len(prompts) == 0 || !strings.Contains(prompts[0], `"description":"Wolt, Ten Bis, Aroma"`) || strings.Count(prompts[0], "description") != 1 {
		t.Fatalf("%v", prompts)
	}
}

func TestFillDescriptionsOnceAndNeverOverwrites(t *testing.T) {
	e := newEnv(t)
	if _, err := Seed(ctx, e.l); err != nil {
		t.Fatal(err)
	}
	if g, _ := e.l.FindCategoryByName(ctx, "Groceries"); !strings.Contains(g.Description, "Shufersal") {
		t.Fatalf("a freshly seeded category already carries its description: %q", g.Description)
	}
	// An older database was seeded before descriptions existed.
	if _, err := e.st.ExecContext(ctx, `UPDATE categories SET description = ''`); err != nil {
		t.Fatal(err)
	}
	mine := &ledger.Category{NameEN: "Mine", Type: ledger.Expense}
	groc, _ := e.l.FindCategoryByName(ctx, "Groceries")
	groc.Description = "my own words"
	if err := e.l.UpdateCategory(ctx, groc); err != nil {
		t.Fatal(err)
	}
	e.l.CreateCategory(ctx, mine)
	n, err := FillDescriptions(ctx, e.st, e.l)
	if err != nil || n < 30 {
		t.Fatalf("filled %d, %v", n, err)
	}
	g, _ := e.l.FindCategoryByName(ctx, "Groceries")
	if g.Description != "my own words" {
		t.Fatalf("overwrote the user's text: %q", g.Description)
	}
	if r, _ := e.l.FindCategoryByName(ctx, "Restaurants"); !strings.Contains(r.Description, "Wolt") {
		t.Fatalf("%q", r.Description)
	}
	if m, _ := e.l.FindCategoryByName(ctx, "Mine"); m.Description != "" {
		t.Fatal("a custom category must not get a description")
	}
	// Cleared by the user, it stays cleared: the fill runs only once.
	r, _ := e.l.FindCategoryByName(ctx, "Restaurants")
	r.Description = ""
	e.l.UpdateCategory(ctx, r)
	if n, _ := FillDescriptions(ctx, e.st, e.l); n != 0 {
		t.Fatalf("second run filled %d", n)
	}
}

func TestDecisionModelRefusalIsNoMatchNotAFailedRun(t *testing.T) {
	e := newEnv(t)
	e.cat("Food", ledger.Expense)
	big := e.tx("2024-03-01", -1000, "TOO-BIG-FOR-THE-MODEL")
	ok := e.tx("2024-03-02", -1000, "FINE")
	calls := 0
	d := deciderFunc(func(state string, criteria map[string]string) (string, float64, error) {
		if strings.Contains(state, "TOO-BIG") {
			calls++
			return "", 0, &llm.StatusError{Code: 400, Msg: "exceeds the available context size"}
		}
		for k, v := range criteria {
			if strings.HasPrefix(v, "Food") {
				return k, 0.9, nil
			}
		}
		return "", 0, errors.New("no Food")
	})
	ge := generate(func(string) (string, string, string) { return "Odd", "מוזר", "EXPENSE" })
	r := e.run(e.svc(nil, ge, func(o *Options) { o.Decider = d }))
	if r.Status != "DONE" || calls != 1 {
		t.Fatalf("status=%s error=%q calls=%d", r.Status, r.Error, calls)
	}
	if e.get(ok.ID).CategoryNameEN != "Food" || e.get(big.ID).CategoryNameEN != "Odd" {
		t.Fatalf("ok=%+v big=%+v", e.get(ok.ID), e.get(big.ID))
	}
}

type deciderFunc func(state string, criteria map[string]string) (string, float64, error)

func (f deciderFunc) Choose(_ context.Context, _, state, _ string, criteria map[string]string) (string, float64, error) {
	return f(state, criteria)
}

func TestBankTransfersAreJudgedByTheirDescriptionNotTheirPayee(t *testing.T) {
	e := newEnv(t)
	e.cat("Family Transfers", ledger.Expense)
	e.cat("Sports & Hobbies", ledger.Expense)
	e.cat("Telecom & Internet", ledger.Expense)
	bank := &ledger.Account{Name: "Leumi", Type: ledger.Bank, Institution: "Leumi", Owner: "Alice"}
	if err := e.l.CreateAccount(ctx, bank); err != nil {
		t.Fatal(err)
	}
	ins := func(date, notes string) *ledger.Transaction {
		n := notes
		x := &ledger.Transaction{AccountID: bank.ID, Date: date, Amount: money.New(-20000, bank.Currency), PayeeRaw: "הע. אינטרנט", Notes: &n}
		if err := e.l.InsertTransaction(ctx, x); err != nil {
			t.Fatal(err)
		}
		return x
	}
	kid := ins("2026-10-04", "העברה אל: דנה לוי 11-111-111111111 לקרוב משפחה")
	club := ins("2026-10-01", "העברה אל: חוג 17-222-000022222 אבי כהן אוקטובר")
	club2 := ins("2026-11-01", "העברה אל: חוג 17-222-000022222 אבי כהן נובמבר")
	d := deciderFunc(func(state string, criteria map[string]string) (string, float64, error) {
		name := "Telecom & Internet" // what the bare payee suggests
		switch {
		case strings.Contains(state, "דנה"):
			name = "Family Transfers"
		case strings.Contains(state, "חוג"):
			name = "Sports & Hobbies"
		}
		for k, v := range criteria {
			if strings.HasPrefix(v, name) {
				return k, 0.95, nil
			}
		}
		return "", 0, errors.New("no option")
	})
	var seen []string
	wrapped := deciderFunc(func(state string, criteria map[string]string) (string, float64, error) {
		seen = append(seen, state)
		return d(state, criteria)
	})
	r := e.run(e.svc(nil, nil, func(o *Options) { o.Decider = wrapped }))
	if r.Status != "DONE" {
		t.Fatalf("%+v", r)
	}
	for _, s := range seen {
		if strings.Contains(s, "111111111") || strings.Contains(s, "000022222") {
			t.Errorf("account numbers must not reach the model: %q", s)
		}
	}
	if got := e.get(kid.ID).CategoryNameEN; got != "Family Transfers" {
		t.Errorf("transfer to a relative: %q", got)
	}
	if a, b := e.get(club.ID).CategoryNameEN, e.get(club2.ID).CategoryNameEN; a != "Sports & Hobbies" || b != "Sports & Hobbies" {
		t.Errorf("club dues: %q %q", a, b)
	}
}
