package billing

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"time"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

// Service computes bill dates and manages statements and settlements.
type Service struct {
	st *store.Store
	l  *ledger.Ledger

	// Now is the clock; tests replace it.
	Now func() time.Time
	// Tolerance is how far (in minor units) a settled amount may fall short of the expected total
	// and still count as paid.
	Tolerance int64
	// MaxMatchDays is how far a bank debit may be from a statement's bill date to be proposed.
	MaxMatchDays int
}

func New(st *store.Store, l *ledger.Ledger) *Service {
	return &Service{st: st, l: l, Now: time.Now, Tolerance: 100, MaxMatchDays: 5}
}

func (s *Service) today() string { return s.Now().Format(dateLayout) }

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ledger.ErrInvalid, fmt.Sprintf(format, a...))
}

// AssignBillDates computes bill dates from the card's billing rules for charges that have none from
// a statement or a bank debit (spec 6.2, step 3). Dates it computed earlier are recomputed, so a
// rule change takes effect. A card with no matching rule is left alone. It returns the number of
// charges changed.
func (s *Service) AssignBillDates(ctx context.Context, accountID string) (int, error) {
	accounts, err := s.l.ListAccounts(ctx)
	if err != nil {
		return 0, err
	}
	changed := 0
	for _, a := range accounts {
		if a.Type != ledger.CreditCard || (accountID != "" && a.ID != accountID) {
			continue
		}
		rules, err := s.l.BillingRules(ctx, a.ID)
		if err != nil {
			return changed, err
		}
		if len(rules) == 0 {
			continue
		}
		n, err := s.assignCard(ctx, a.ID, rules)
		if err != nil {
			return changed, err
		}
		changed += n
	}
	return changed, nil
}

type pendingTx struct {
	id, date, scope string
	standing        bool
	cur, src        sql.NullString
}

func (s *Service) assignCard(ctx context.Context, accountID string, rules []ledger.BillingRule) (int, error) {
	rows, err := s.st.QueryContext(ctx, `SELECT id, date, scope, is_standing_order, bill_date, bill_date_source FROM transactions
		WHERE account_id = ? AND kind <> 'EMPLOYER_COVERAGE' AND statement_id IS NULL
		  AND (bill_date IS NULL OR bill_date_source = 'RULE')`, accountID)
	if err != nil {
		return 0, err
	}
	var todo []pendingTx
	for rows.Next() {
		var p pendingTx
		var standing int
		if err := rows.Scan(&p.id, &p.date, &p.scope, &standing, &p.cur, &p.src); err != nil {
			rows.Close()
			return 0, err
		}
		p.standing = standing != 0
		todo = append(todo, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}
	changed := 0
	err = s.st.WithTx(ctx, func(tx *sql.Tx) error {
		for _, p := range todo {
			rule := PickRule(rules, ledger.Scope(p.scope))
			if rule == nil {
				continue
			}
			bd, err := ComputeBillDate(*rule, p.date, p.standing)
			if err != nil {
				return err
			}
			if p.cur.Valid && p.cur.String == bd {
				continue
			}
			if _, err := tx.ExecContext(ctx, `UPDATE transactions SET bill_date = ?, bill_date_source = 'RULE', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, bd, p.id); err != nil {
				return err
			}
			changed++
		}
		// A coverage line is billed with the purchase it covers.
		_, err := tx.ExecContext(ctx, `UPDATE transactions SET
				bill_date = (SELECT p.bill_date FROM transactions p WHERE p.id = transactions.covers_transaction_id),
				bill_date_source = (SELECT p.bill_date_source FROM transactions p WHERE p.id = transactions.covers_transaction_id)
			WHERE account_id = ? AND kind = 'EMPLOYER_COVERAGE' AND statement_id IS NULL AND covers_transaction_id IS NOT NULL
			  AND (bill_date IS NULL OR bill_date_source = 'RULE')`, accountID)
		return err
	})
	return changed, err
}

// ---- statements ----

type Status string

const (
	Upcoming Status = "UPCOMING"
	Billed   Status = "BILLED"
	Partial  Status = "PARTIAL"
	Paid     Status = "PAID"
)

// SettlementInfo is one bank debit applied to a statement.
type SettlementInfo struct {
	ID         string
	BankTxID   string
	BankDate   string
	BankPayee  string
	Amount     money.Money
	Source     string
	DebitTotal money.Money // the whole bank debit, which may exceed Amount
}

// Statement is everything one card bills on one date.
type Statement struct {
	ID          string // empty for a statement derived from charges that have no statement record yet
	AccountID   string
	AccountName string
	Owner       string
	BillDate    string
	Printed     *money.Money // total printed by the issuer, when known
	Gross       money.Money  // purchases billed, before employer coverage
	Expected    money.Money  // out of pocket: purchases net of employer coverage; what the bank is debited
	Settled     money.Money
	Status      Status
	TxCount     int
	Settlements []SettlementInfo
}

// Remaining is what is still unpaid (never negative).
func (st Statement) Remaining() money.Money {
	r := money.New(max(st.Expected.Minor()-st.Settled.Minor(), 0), st.Expected.Currency())
	return r
}

func statusOf(billDate string, expected, settled int64, today string, tol int64) Status {
	switch {
	case settled == 0 && billDate > today:
		return Upcoming
	case expected <= 0 && billDate <= today:
		return Paid // nothing to pay, e.g. fully covered by the employer
	case settled == 0:
		return Billed
	case settled >= expected-tol:
		return Paid
	default:
		return Partial
	}
}

// StatementFilter narrows Statements. Empty fields match everything.
type StatementFilter struct {
	Owner      string
	AccountIDs []string
	From, To   string // bill date, inclusive
	Statuses   []Status
}

// Statements lists a card's statements, both recorded ones and the upcoming ones implied by charges
// that carry a bill date but have no statement yet, ordered by bill date, then card.
func (s *Service) Statements(ctx context.Context, f StatementFilter) ([]Statement, error) {
	rows, err := s.st.QueryContext(ctx, `
		SELECT s.id, a.id, a.name, a.owner, a.currency, s.bill_date, s.printed_total_minor,
		       COUNT(t.id),
		       COALESCE(SUM(CASE WHEN t.kind <> 'EMPLOYER_COVERAGE' THEN -t.amount_minor ELSE 0 END), 0),
		       COALESCE(SUM(-t.amount_minor), 0)
		FROM statements s JOIN accounts a ON a.id = s.account_id
		LEFT JOIN transactions t ON t.statement_id = s.id
		GROUP BY s.id
		UNION ALL
		SELECT '', a.id, a.name, a.owner, a.currency, t.bill_date, NULL,
		       COUNT(t.id),
		       COALESCE(SUM(CASE WHEN t.kind <> 'EMPLOYER_COVERAGE' THEN -t.amount_minor ELSE 0 END), 0),
		       COALESCE(SUM(-t.amount_minor), 0)
		FROM transactions t JOIN accounts a ON a.id = t.account_id
		WHERE a.account_type = 'CREDIT_CARD' AND t.statement_id IS NULL AND t.bill_date IS NOT NULL
		GROUP BY a.id, t.bill_date`)
	if err != nil {
		return nil, err
	}
	var all []Statement
	byID := map[string]int{}
	for rows.Next() {
		var st Statement
		var cur string
		var printed sql.NullInt64
		var gross, expected int64
		if err := rows.Scan(&st.ID, &st.AccountID, &st.AccountName, &st.Owner, &cur, &st.BillDate, &printed, &st.TxCount, &gross, &expected); err != nil {
			rows.Close()
			return nil, err
		}
		st.Settlements = []SettlementInfo{}
		c := money.Currency(cur)
		st.Gross, st.Expected, st.Settled = money.New(gross, c), money.New(expected, c), money.New(0, c)
		if printed.Valid {
			p := money.New(printed.Int64, c)
			st.Printed = &p
		}
		if st.ID != "" {
			byID[st.ID] = len(all)
		}
		all = append(all, st)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	all, byID = mergeDerived(all, byID)

	srows, err := s.st.QueryContext(ctx, `SELECT x.id, x.statement_id, b.id, b.date, b.payee_raw, x.amount_minor, x.source, -b.amount_minor, b.currency
		FROM settlements x JOIN transactions b ON b.id = x.bank_transaction_id ORDER BY b.date, x.id`)
	if err != nil {
		return nil, err
	}
	defer srows.Close()
	for srows.Next() {
		var si SettlementInfo
		var stmtID, cur string
		var amt, total int64
		if err := srows.Scan(&si.ID, &stmtID, &si.BankTxID, &si.BankDate, &si.BankPayee, &amt, &si.Source, &total, &cur); err != nil {
			return nil, err
		}
		i, ok := byID[stmtID]
		if !ok {
			continue
		}
		si.Amount, si.DebitTotal = money.New(amt, money.Currency(cur)), money.New(total, money.Currency(cur))
		all[i].Settlements = append(all[i].Settlements, si)
		all[i].Settled = money.New(all[i].Settled.Minor()+amt, all[i].Settled.Currency())
	}
	if err := srows.Err(); err != nil {
		return nil, err
	}

	today := s.today()
	var out []Statement
	for _, st := range all {
		st.Status = statusOf(st.BillDate, st.Expected.Minor(), st.Settled.Minor(), today, s.Tolerance)
		if f.matches(st) {
			out = append(out, st)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].BillDate != out[j].BillDate {
			return out[i].BillDate < out[j].BillDate
		}
		return out[i].AccountName < out[j].AccountName
	})
	return out, nil
}

// mergeDerived folds charges that carry a bill date but no statement link into the recorded statement
// of the same card and date: they are billed together and paid by the same debit.
func mergeDerived(all []Statement, byID map[string]int) ([]Statement, map[string]int) {
	var out []Statement
	at := map[[2]string]int{} // (card, bill date) -> index in out of the recorded statement
	for _, st := range all {
		if st.ID != "" {
			at[[2]string{st.AccountID, st.BillDate}] = len(out)
			out = append(out, st)
		}
	}
	for _, st := range all {
		if st.ID != "" {
			continue
		}
		if i, ok := at[[2]string{st.AccountID, st.BillDate}]; ok {
			r := &out[i]
			r.TxCount += st.TxCount
			r.Gross = money.New(r.Gross.Minor()+st.Gross.Minor(), r.Gross.Currency())
			r.Expected = money.New(r.Expected.Minor()+st.Expected.Minor(), r.Expected.Currency())
			continue
		}
		out = append(out, st)
	}
	byID = map[string]int{}
	for i, st := range out {
		if st.ID != "" {
			byID[st.ID] = i
		}
	}
	return out, byID
}

func (f StatementFilter) matches(st Statement) bool {
	if f.Owner != "" && st.Owner != f.Owner {
		return false
	}
	if len(f.AccountIDs) > 0 && !contains(f.AccountIDs, st.AccountID) {
		return false
	}
	if f.From != "" && st.BillDate < f.From || f.To != "" && st.BillDate > f.To {
		return false
	}
	if len(f.Statuses) > 0 && !contains(f.Statuses, st.Status) {
		return false
	}
	return true
}

func contains[T comparable](xs []T, x T) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

// Materialize returns the statement record for a card and bill date, creating it and linking the
// charges with that bill date. Settling a derived statement needs this first.
func (s *Service) Materialize(ctx context.Context, accountID, billDate string) (string, error) {
	if _, err := parseDate(billDate); err != nil {
		return "", err
	}
	var id string
	err := s.st.WithTx(ctx, func(tx *sql.Tx) error {
		var typ string
		if err := tx.QueryRowContext(ctx, `SELECT account_type FROM accounts WHERE id = ?`, accountID).Scan(&typ); err != nil {
			if err == sql.ErrNoRows {
				return ledger.ErrNotFound
			}
			return err
		}
		if typ != string(ledger.CreditCard) {
			return invalid("statements belong to credit cards")
		}
		err := tx.QueryRowContext(ctx, `SELECT id FROM statements WHERE account_id = ? AND bill_date = ?`, accountID, billDate).Scan(&id)
		if err == nil {
			return linkUnlinked(ctx, tx, id)
		}
		if err != sql.ErrNoRows {
			return err
		}
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE account_id = ? AND bill_date = ? AND statement_id IS NULL`, accountID, billDate).Scan(&n); err != nil {
			return err
		}
		if n == 0 {
			return ledger.ErrNotFound
		}
		id = store.NewID()
		if _, err := tx.ExecContext(ctx, `INSERT INTO statements (id, account_id, bill_date) VALUES (?, ?, ?)`, id, accountID, billDate); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE transactions SET statement_id = ? WHERE account_id = ? AND bill_date = ? AND statement_id IS NULL`, id, accountID, billDate)
		return err
	})
	return id, err
}

// linkUnlinked attaches charges that carry the statement's card and bill date but no statement yet.
func linkUnlinked(ctx context.Context, tx *sql.Tx, statementID string) error {
	_, err := tx.ExecContext(ctx, `UPDATE transactions SET statement_id = ?1
		WHERE statement_id IS NULL
		  AND account_id = (SELECT account_id FROM statements WHERE id = ?1)
		  AND bill_date = (SELECT bill_date FROM statements WHERE id = ?1)`, statementID)
	return err
}
