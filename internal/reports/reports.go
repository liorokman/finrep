// Package reports implements the ten reports of spec section 7 as functions over the ledger_view SQL
// view, which holds the one definition of spending and income (spec section 3).
package reports

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

// Measure chooses between what was bought and what the owner paid after employer coverage.
type Measure string

const (
	Gross       Measure = "GROSS"
	OutOfPocket Measure = "OUT_OF_POCKET"
)

// Basis chooses the date a card charge is placed on: when it was bought, or when the bank is charged.
type Basis string

const (
	ByPurchase Basis = "PURCHASE"
	ByBill     Basis = "BILL"
)

// Uncategorized in Filter.CategoryIDs selects lines that have no category.
const Uncategorized = "uncategorized"

// Filter is shared by every report. The zero value means: every account, all time, ILS, purchase
// dates, and each report's own default measure.
type Filter struct {
	AccountIDs  []string
	Owner       string
	CategoryIDs []string // may include Uncategorized
	From, To    string   // inclusive, YYYY-MM-DD
	Basis       Basis
	Measure     Measure
	Currency    money.Currency // default ILS; v1 reports one currency at a time

	// The summary report compares its period with another. An explicit range (both dates) wins; otherwise
	// Compare is "previous" (the default: the period just before, by whole months or years when the period
	// is made of them) or "year" (the same dates one year earlier). Other reports ignore these.
	Compare                string
	CompareFrom, CompareTo string
}

// Service runs reports.
type Service struct {
	st  *store.Store
	l   *ledger.Ledger
	b   *billing.Service
	Now func() time.Time
}

func New(st *store.Store, l *ledger.Ledger, b *billing.Service) *Service {
	return &Service{st: st, l: l, b: b, Now: time.Now}
}

func (s *Service) today() string { return s.Now().Format("2006-01-02") }

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ledger.ErrInvalid, fmt.Sprintf(format, a...))
}

func (f Filter) currency() money.Currency {
	if f.Currency == "" {
		return money.ILS
	}
	return f.Currency
}

func validDate(field, d string) error {
	if d == "" {
		return nil
	}
	if _, err := time.Parse("2006-01-02", d); err != nil {
		return invalid("%s must be YYYY-MM-DD, got %q", field, d)
	}
	return nil
}

func (f Filter) validate() error {
	if err := validDate("from", f.From); err != nil {
		return err
	}
	if err := validDate("to", f.To); err != nil {
		return err
	}
	if f.From != "" && f.To != "" && f.From > f.To {
		return invalid("from is after to")
	}
	if err := validDate("compare_from", f.CompareFrom); err != nil {
		return err
	}
	if err := validDate("compare_to", f.CompareTo); err != nil {
		return err
	}
	if (f.CompareFrom == "") != (f.CompareTo == "") {
		return invalid("compare_from and compare_to go together")
	}
	if f.CompareFrom > f.CompareTo {
		return invalid("compare_from is after compare_to")
	}
	switch f.Compare {
	case "", "previous", "year":
	default:
		return invalid("unknown compare %q (previous or year)", f.Compare)
	}
	switch f.Basis {
	case "", ByPurchase, ByBill:
	default:
		return invalid("unknown basis %q", f.Basis)
	}
	switch f.Measure {
	case "", Gross, OutOfPocket:
	default:
		return invalid("unknown measure %q", f.Measure)
	}
	return nil
}

// query is a compiled filter.
type query struct {
	where string // always starts with a valid condition; safe to append " AND ..."
	args  []any
	value string // column holding the measure
	date  string // column holding the date
	cur   money.Currency
}

// compile turns a filter into SQL conditions over ledger_view. def is the report's default measure.
func (f Filter) compile(def Measure) (query, error) {
	if err := f.validate(); err != nil {
		return query{}, err
	}
	q := query{cur: f.currency(), value: "gross_value", date: "date"}
	m := f.Measure
	if m == "" {
		m = def
	}
	if m == OutOfPocket {
		q.value = "oop_value"
	}
	if f.Basis == ByBill {
		q.date = "cash_date"
	}
	conds := []string{"currency = ?", "date >= '2023-01-01'"}
	q.args = append(q.args, string(q.cur))
	if f.Owner != "" {
		conds = append(conds, "owner = ?")
		q.args = append(q.args, f.Owner)
	}
	if len(f.AccountIDs) > 0 {
		conds = append(conds, "account_id IN ("+placeholders(len(f.AccountIDs))+")")
		for _, id := range f.AccountIDs {
			q.args = append(q.args, id)
		}
	}
	if len(f.CategoryIDs) > 0 {
		var ids []any
		uncat := false
		for _, id := range f.CategoryIDs {
			if id == Uncategorized {
				uncat = true
			} else {
				ids = append(ids, id)
			}
		}
		var parts []string
		if len(ids) > 0 {
			parts = append(parts, "category_id IN ("+placeholders(len(ids))+")")
			q.args = append(q.args, ids...)
		}
		if uncat {
			parts = append(parts, "category_id IS NULL")
		}
		conds = append(conds, "("+strings.Join(parts, " OR ")+")")
	}
	if f.From != "" {
		conds = append(conds, q.date+" >= ?")
		q.args = append(q.args, f.From)
	}
	if f.To != "" {
		conds = append(conds, q.date+" <= ?")
		q.args = append(q.args, f.To)
	}
	q.where = strings.Join(conds, " AND ")
	return q, nil
}

func placeholders(n int) string { return strings.TrimSuffix(strings.Repeat("?,", n), ",") }

// months lists YYYY-MM from a to b inclusive.
func months(a, b string) []string {
	if a == "" || b == "" || a > b {
		return nil
	}
	t, _ := time.Parse("2006-01", a)
	end, _ := time.Parse("2006-01", b)
	var out []string
	for !t.After(end) {
		out = append(out, t.Format("2006-01"))
		t = t.AddDate(0, 1, 0)
	}
	return out
}

// monthBounds returns the first and last month with data matching the query, or empty strings.
func (s *Service) monthBounds(ctx context.Context, q query, flows ...string) (string, string, error) {
	cond := q.where
	args := append([]any{}, q.args...)
	if len(flows) > 0 {
		cond += " AND flow IN (" + placeholders(len(flows)) + ")"
		for _, f := range flows {
			args = append(args, f)
		}
	}
	var lo, hi *string
	err := s.st.QueryRowContext(ctx, `SELECT MIN(substr(`+q.date+`,1,7)), MAX(substr(`+q.date+`,1,7)) FROM ledger_view WHERE `+cond, args...).Scan(&lo, &hi)
	if err != nil || lo == nil || hi == nil {
		return "", "", err
	}
	return *lo, *hi, nil
}

func (q query) money(minor int64) money.Money { return money.New(minor, q.cur) }

// catNames maps category ids to their categories.
func (s *Service) catNames(ctx context.Context) (map[string]ledger.Category, error) {
	cats, err := s.l.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	m := make(map[string]ledger.Category, len(cats))
	for _, c := range cats {
		m[c.ID] = c
	}
	return m, nil
}
