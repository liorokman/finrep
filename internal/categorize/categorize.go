// Package categorize assigns categories to transactions with two models: a classifier picks an
// existing category, and only when it is not confident enough does a generator invent a new one.
package categorize

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

var (
	ErrBusy        = errors.New("a categorization run is already in progress")
	ErrNothingToDo = errors.New("no uncategorized transactions")
	ErrNotFound    = errors.New("run not found")
)

// Chatter is the part of an LLM client the service needs.
type Chatter interface {
	Chat(ctx context.Context, model, system, user string) (string, error)
}

// Options configure a Service. Zero values get sensible defaults.
type Options struct {
	Classifier, Generator           Chatter
	ClassifierModel, GeneratorModel string
	Threshold                       float64       // default 0.75
	BatchSize                       int           // distinct payees per request; default 20
	Attempts                        int           // per request; default 3
	Backoff                         time.Duration // base delay between attempts; default 2s
	// CardPaymentHints returns substrings that mark a bank line as a card payment. Such lines are not
	// categorized by the models: whether they are transfers (tracked card) or spending (a card with no
	// statements here) depends on the settlement, which the models cannot see.
	CardPaymentHints func(ctx context.Context) ([]string, error)
}

type Service struct {
	l  *ledger.Ledger
	st *store.Store
	o  Options

	mu     sync.Mutex
	active *activeRun
}

type activeRun struct {
	id     string
	cancel context.CancelFunc
	done   chan struct{}
}

func New(st *store.Store, l *ledger.Ledger, o Options) *Service {
	if o.Threshold <= 0 {
		o.Threshold = 0.75
	}
	if o.BatchSize <= 0 {
		o.BatchSize = 20
	}
	if o.Attempts <= 0 {
		o.Attempts = 3
	}
	if o.Backoff == 0 {
		o.Backoff = 2 * time.Second
	}
	return &Service{l: l, st: st, o: o}
}

// Run is a categorization run's record.
type Run struct {
	ID              string
	Status          string
	StartedAt       string
	FinishedAt      string
	ClassifierModel string
	GeneratorModel  string
	Threshold       float64
	Processed       int
	Total           int
	Error           string
}

// Recover marks runs left RUNNING by a crash as failed. Call once at startup.
func (s *Service) Recover(ctx context.Context) error {
	_, err := s.st.ExecContext(ctx, `UPDATE categorization_runs SET status = 'FAILED',
		error = 'interrupted by restart', finished_at = CURRENT_TIMESTAMP WHERE status = 'RUNNING'`)
	return err
}

// group is every pending transaction that shares a payee and direction; the models see it once.
type group struct {
	payee    string
	date     string
	amount   string
	currency string
	notes    string
	ids      []string
}

func (s *Service) pending(ctx context.Context) ([]*group, int, error) {
	var hints []string
	if s.o.CardPaymentHints != nil {
		var err error
		if hints, err = s.o.CardPaymentHints(ctx); err != nil {
			return nil, 0, err
		}
	}
	rows, err := s.st.QueryContext(ctx, `SELECT t.id, t.date, t.amount_minor, t.currency, COALESCE(NULLIF(t.payee_cleaned, ''), t.payee_raw), COALESCE(t.notes, ''), a.account_type
		FROM transactions t JOIN accounts a ON a.id = t.account_id
		WHERE t.category_id IS NULL AND t.categorized_by = 'UNSET' AND t.kind <> 'EMPLOYER_COVERAGE'
		ORDER BY t.date DESC, t.id`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	byKey := map[string]*group{}
	var order []*group
	total := 0
	for rows.Next() {
		var id, date, cur, payee, notes, accType string
		var minor int64
		if err := rows.Scan(&id, &date, &minor, &cur, &payee, &notes, &accType); err != nil {
			return nil, 0, err
		}
		if accType == string(ledger.Bank) && minor < 0 && matchesAny(payee, hints) {
			continue
		}
		dir := "out"
		if minor > 0 {
			dir = "in"
		}
		key := strings.ToLower(strings.TrimSpace(payee)) + "|" + dir
		g := byKey[key]
		if g == nil {
			g = &group{payee: strings.TrimSpace(payee), date: date, amount: formatMinor(minor, cur), currency: cur, notes: notes}
			byKey[key] = g
			order = append(order, g)
		}
		g.ids = append(g.ids, id)
		total++
	}
	return order, total, rows.Err()
}

func matchesAny(payee string, hints []string) bool {
	low := strings.ToLower(payee)
	for _, h := range hints {
		if h != "" && strings.Contains(low, h) {
			return true
		}
	}
	return false
}

func formatMinor(minor int64, cur string) string {
	// Only the sign and rough size matter to the model; keep two decimals regardless of currency.
	return strconv.FormatFloat(float64(minor)/100, 'f', 2, 64) + " " + cur
}

// Start begins a run in the background and returns its id. Only one run may be active.
func (s *Service) Start(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.active != nil {
		return "", ErrBusy
	}
	groups, total, err := s.pending(ctx)
	if err != nil {
		return "", err
	}
	if total == 0 {
		return "", ErrNothingToDo
	}
	id := store.NewID()
	if _, err := s.st.ExecContext(ctx, `INSERT INTO categorization_runs (id, classifier_model, generator_model, threshold, total)
		VALUES (?, ?, ?, ?, ?)`, id, s.o.ClassifierModel, s.o.GeneratorModel, s.o.Threshold, total); err != nil {
		return "", err
	}
	runCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	a := &activeRun{id: id, cancel: cancel, done: make(chan struct{})}
	s.active = a
	go func() {
		s.execute(runCtx, id, groups)
		cancel()
		s.mu.Lock()
		s.active = nil
		s.mu.Unlock()
		close(a.done)
	}()
	return id, nil
}

// Cancel stops the active run after its current request. Batches already applied stay applied.
func (s *Service) Cancel() {
	s.mu.Lock()
	a := s.active
	s.mu.Unlock()
	if a != nil {
		a.cancel()
	}
}

// Wait blocks until the given run has finished (immediately if it is not the active one).
func (s *Service) Wait(id string) {
	s.mu.Lock()
	a := s.active
	s.mu.Unlock()
	if a != nil && a.id == id {
		<-a.done
	}
}

func (s *Service) execute(ctx context.Context, runID string, groups []*group) {
	status, runErr := "DONE", ""
	processed := 0
	for start := 0; start < len(groups); start += s.o.BatchSize {
		if ctx.Err() != nil {
			status = "CANCELED"
			break
		}
		end := min(start+s.o.BatchSize, len(groups))
		n, err := s.batch(ctx, runID, groups[start:end])
		processed += n
		s.exec(`UPDATE categorization_runs SET processed = ? WHERE id = ?`, processed, runID)
		if err != nil {
			if ctx.Err() != nil {
				status = "CANCELED"
			} else {
				status, runErr = "FAILED", err.Error()
			}
			break
		}
	}
	s.inheritCoverage(runID)
	s.exec(`UPDATE categorization_runs SET status = ?, error = NULLIF(?, ''), finished_at = CURRENT_TIMESTAMP WHERE id = ?`, status, runErr, runID)
}

// exec runs bookkeeping statements that must not be skipped because the run was canceled.
func (s *Service) exec(q string, args ...any) {
	_, _ = s.st.ExecContext(context.Background(), q, args...)
}

// inheritCoverage gives each employer-coverage line the category of the purchase it covers, so a
// category's gross and out-of-pocket totals agree.
func (s *Service) inheritCoverage(runID string) {
	s.exec(`UPDATE transactions SET
			category_id = (SELECT p.category_id FROM transactions p WHERE p.id = transactions.covers_transaction_id),
			categorized_by = (SELECT p.categorized_by FROM transactions p WHERE p.id = transactions.covers_transaction_id),
			llm_confidence = (SELECT p.llm_confidence FROM transactions p WHERE p.id = transactions.covers_transaction_id),
			run_id = ?, updated_at = CURRENT_TIMESTAMP
		WHERE kind = 'EMPLOYER_COVERAGE' AND category_id IS NULL AND categorized_by = 'UNSET'
		  AND covers_transaction_id IN (SELECT id FROM transactions WHERE category_id IS NOT NULL)`, runID)
}

// ---- model I/O ----

type catView struct {
	ID   string `json:"id"`
	EN   string `json:"name_en"`
	HE   string `json:"name_he"`
	Type string `json:"type"`
}

type itemView struct {
	ID       string `json:"id"`
	Payee    string `json:"payee"`
	Amount   string `json:"amount"`
	Date     string `json:"date"`
	Notes    string `json:"notes,omitempty"`
	Examples int    `json:"occurrences"`
}

type prompt struct {
	Categories []catView  `json:"categories"`
	Items      []itemView `json:"items"`
}

// flexID accepts a JSON string or number, since small models are loose about echoing ids.
type flexID string

func (f *flexID) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*f = flexID(s)
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(b, &n); err != nil {
		return err
	}
	*f = flexID(n.String())
	return nil
}

type classification struct {
	ID         flexID  `json:"id"`
	CategoryID string  `json:"category_id"`
	Confidence float64 `json:"confidence"`
}

type generation struct {
	ID     flexID `json:"id"`
	NameEN string `json:"name_en"`
	NameHE string `json:"name_he"`
	Type   string `json:"type"`
}

const classifierSystem = `You categorize bank and credit-card transactions from Israel (Hebrew, English and transliterated merchant names).
You get a list of categories and a list of items. For each item choose the single best category id from the list, and report your confidence from 0 to 1.
If no category fits well, use an empty category_id and a low confidence. Never invent ids.
Negative amounts are money spent, positive amounts are money received.
Reply with JSON only: {"results":[{"id":"<item id>","category_id":"<category id or empty>","confidence":0.0}]}`

const generatorSystem = `You create new transaction categories for a personal finance app used in Israel.
None of the existing categories fit the items below. For each item propose a short, general category (not specific to one merchant) with an English and a Hebrew name, and a type: EXPENSE, INCOME or TRANSFER.
Items that belong together should get the same category name. Do not reuse the names of the existing categories.
Reply with JSON only: {"results":[{"id":"<item id>","name_en":"...","name_he":"...","type":"EXPENSE"}]}`

// parseJSON decodes the first JSON object in a model reply, tolerating code fences and chatter.
func parseJSON(reply string, v any) error {
	i, j := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if i < 0 || j < i {
		return errors.New("reply contains no JSON object")
	}
	return json.Unmarshal([]byte(reply[i:j+1]), v)
}

// ask calls a model, retrying transport and parse failures with a growing delay.
func (s *Service) ask(ctx context.Context, c Chatter, model, system string, p prompt, out any) error {
	body, err := json.Marshal(p)
	if err != nil {
		return err
	}
	var last error
	for attempt := 1; attempt <= s.o.Attempts; attempt++ {
		reply, err := c.Chat(ctx, model, system, string(body))
		if err == nil {
			if err = parseJSON(reply, out); err == nil {
				return nil
			}
		}
		last = err
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if attempt < s.o.Attempts {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(s.o.Backoff * time.Duration(attempt)):
			}
		}
	}
	return fmt.Errorf("model %q: %w", model, last)
}

type decision struct {
	g          *group
	categoryID string
	confidence *float64
}

// batch categorizes one slice of groups and returns how many transactions it covered.
func (s *Service) batch(ctx context.Context, runID string, groups []*group) (int, error) {
	wctx := context.WithoutCancel(ctx) // for writes that follow a model reply
	cats, err := s.l.ListCategories(ctx)
	if err != nil {
		return 0, err
	}
	known := make(map[string]bool, len(cats))
	views := make([]catView, 0, len(cats))
	for _, c := range cats {
		known[c.ID] = true
		views = append(views, catView{c.ID, c.NameEN, c.NameHE, string(c.Type)})
	}
	items := func(gs []*group, ids []int) []itemView {
		out := make([]itemView, len(ids))
		for i, idx := range ids {
			g := gs[idx]
			out[i] = itemView{ID: strconv.Itoa(idx), Payee: g.payee, Amount: g.amount, Date: g.date, Notes: g.notes, Examples: len(g.ids)}
		}
		return out
	}
	all := make([]int, len(groups))
	for i := range all {
		all[i] = i
	}

	decisions := make([]decision, len(groups))
	for i, g := range groups {
		decisions[i].g = g
	}

	// Step 1: the classifier picks among existing categories.
	var cls struct {
		Results []classification `json:"results"`
	}
	if len(views) > 0 {
		if err := s.ask(ctx, s.o.Classifier, s.o.ClassifierModel, classifierSystem, prompt{views, items(groups, all)}, &cls); err != nil {
			return 0, err
		}
	}
	best := map[int]float64{}
	for _, r := range cls.Results {
		idx, err := strconv.Atoi(string(r.ID))
		if err != nil || idx < 0 || idx >= len(groups) || !known[r.CategoryID] {
			continue // unknown item or category id: treated as "no match"
		}
		conf := r.Confidence
		if math.IsNaN(conf) || conf < 0 || conf > 1 {
			conf = 0
		}
		if conf > best[idx] {
			best[idx] = conf
		}
		if conf >= s.o.Threshold && decisions[idx].categoryID == "" {
			c := conf
			decisions[idx].categoryID, decisions[idx].confidence = r.CategoryID, &c
		}
	}

	// Step 2: the generator invents categories for what is left.
	var rest []int
	for i := range decisions {
		if decisions[i].categoryID == "" {
			rest = append(rest, i)
		}
	}
	if len(rest) > 0 {
		var gen struct {
			Results []generation `json:"results"`
		}
		if err := s.ask(ctx, s.o.Generator, s.o.GeneratorModel, generatorSystem, prompt{views, items(groups, rest)}, &gen); err != nil {
			return 0, err
		}
		created := map[string]string{} // lowercased English name -> id, within this batch
		for _, r := range gen.Results {
			idx, err := strconv.Atoi(string(r.ID))
			if err != nil || idx < 0 || idx >= len(groups) || decisions[idx].categoryID != "" {
				continue
			}
			id, err := s.resolveGenerated(wctx, runID, r, groups[idx], created)
			if err != nil {
				continue // an unusable proposal leaves the transactions uncategorized for a later run
			}
			decisions[idx].categoryID = id
		}
	}

	// Step 3: apply atomically; never overwrite anything changed since the run started.
	// A reply that already arrived is applied even if the run was canceled meanwhile.
	n := 0
	err = s.st.WithTx(wctx, func(tx *sql.Tx) error {
		for _, d := range decisions {
			n += len(d.g.ids)
			if d.categoryID == "" {
				continue
			}
			for _, id := range d.g.ids {
				if _, err := tx.ExecContext(wctx, `UPDATE transactions SET category_id = ?, categorized_by = 'LLM', llm_confidence = ?,
					run_id = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ? AND category_id IS NULL AND categorized_by = 'UNSET'`, d.categoryID, d.confidence, runID, id); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return n, nil
}

// resolveGenerated returns the category for a generator proposal, reusing an existing one with the
// same English name (case-insensitive) rather than creating a duplicate.
func (s *Service) resolveGenerated(ctx context.Context, runID string, r generation, g *group, created map[string]string) (string, error) {
	en, he := strings.TrimSpace(r.NameEN), strings.TrimSpace(r.NameHE)
	if en == "" {
		en = he
	}
	if he == "" {
		he = en
	}
	if en == "" {
		return "", errors.New("proposal has no name")
	}
	key := strings.ToLower(en)
	if id, ok := created[key]; ok {
		return id, nil
	}
	if c, err := s.l.FindCategoryByName(ctx, en); err == nil {
		created[key] = c.ID
		return c.ID, nil
	} else if !errors.Is(err, ledger.ErrNotFound) {
		return "", err
	}
	typ := ledger.CategoryType(strings.ToUpper(strings.TrimSpace(r.Type)))
	switch typ {
	case ledger.Expense, ledger.Income, ledger.Transfer:
	default:
		typ = ledger.Expense
		if !strings.HasPrefix(g.amount, "-") {
			typ = ledger.Income
		}
	}
	c := &ledger.Category{NameEN: en, NameHE: he, Type: typ, CreatedBy: ledger.ByLLM, ColorHex: palette[len(created)%len(palette)]}
	if err := s.l.CreateCategory(ctx, c); err != nil {
		if errors.Is(err, ledger.ErrDuplicate) { // raced with another writer
			if ex, ferr := s.l.FindCategoryByName(ctx, en); ferr == nil {
				created[key] = ex.ID
				return ex.ID, nil
			}
		}
		return "", err
	}
	if _, err := s.st.ExecContext(ctx, `UPDATE categories SET created_run_id = ? WHERE id = ?`, runID, c.ID); err != nil {
		return "", err
	}
	created[key] = c.ID
	return c.ID, nil
}

// ---- runs ----

func (s *Service) GetRun(ctx context.Context, id string) (*Run, error) {
	r, err := scanRun(s.st.QueryRowContext(ctx, runSelect+` WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return r, err
}

func (s *Service) ListRuns(ctx context.Context, limit int) ([]Run, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.st.QueryContext(ctx, runSelect+` ORDER BY started_at DESC, rowid DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Run
	for rows.Next() {
		r, err := scanRun(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *r)
	}
	return out, rows.Err()
}

const runSelect = `SELECT id, status, started_at, COALESCE(finished_at, ''), classifier_model, generator_model,
	threshold, processed, total, COALESCE(error, '') FROM categorization_runs`

func scanRun(r interface{ Scan(...any) error }) (*Run, error) {
	var x Run
	err := r.Scan(&x.ID, &x.Status, &x.StartedAt, &x.FinishedAt, &x.ClassifierModel, &x.GeneratorModel,
		&x.Threshold, &x.Processed, &x.Total, &x.Error)
	return &x, err
}

// Undo reverts a finished run: its still-unreviewed LLM assignments go back to uncategorized and the
// categories it created are removed if nothing uses them any more. Manual edits are never touched.
func (s *Service) Undo(ctx context.Context, runID string) (int, error) {
	r, err := s.GetRun(ctx, runID)
	if err != nil {
		return 0, err
	}
	switch r.Status {
	case "RUNNING":
		return 0, ErrBusy
	case "UNDONE":
		return 0, fmt.Errorf("run %s was already undone", runID)
	}
	n := 0
	err = s.st.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `UPDATE transactions SET category_id = NULL, categorized_by = 'UNSET', llm_confidence = NULL,
			run_id = NULL, updated_at = CURRENT_TIMESTAMP
			WHERE run_id = ? AND categorized_by = 'LLM' AND is_reviewed = 0`, runID)
		if err != nil {
			return err
		}
		c, _ := res.RowsAffected()
		n = int(c)
		if _, err := tx.ExecContext(ctx, `DELETE FROM categories WHERE created_run_id = ?
			AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = categories.id)
			AND NOT EXISTS (SELECT 1 FROM categories ch WHERE ch.parent_id = categories.id)`, runID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE categorization_runs SET status = 'UNDONE' WHERE id = ?`, runID)
		return err
	})
	return n, err
}
