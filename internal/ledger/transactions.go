package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

type TxScope string
type TxKind string
type CategorizedBy string
type BillDateSource string

const (
	TxLocal   TxScope = "LOCAL"
	TxForeign TxScope = "FOREIGN"

	KindPurchase         TxKind = "PURCHASE"
	KindEmployerCoverage TxKind = "EMPLOYER_COVERAGE"
	KindOther            TxKind = "OTHER"

	ByUnset  CategorizedBy = "UNSET"
	ByManual CategorizedBy = "MANUAL"
	ByModel  CategorizedBy = "LLM"

	SourcePDF  BillDateSource = "PDF"
	SourceBank BillDateSource = "BANK"
	SourceRule BillDateSource = "RULE"
)

// Transaction is one ledger line. Amounts are signed in the account's
// currency: negative means money out. Employer-coverage lines are positive.
type Transaction struct {
	ID                 string
	AccountID          string
	BatchID            *string
	ImportKey          string
	Date               string
	Amount             money.Money
	Original           *money.Money
	Scope              TxScope
	Kind               TxKind
	CoversID           *string
	IsStandingOrder    bool
	BillDate           *string
	BillDateSource     *BillDateSource
	StatementID        *string
	CurrentInstallment *int
	TotalInstallments  *int
	PayeeRaw           string
	PayeeCleaned       *string
	Notes              *string
	CategoryID         *string
	CategorizedBy      CategorizedBy
	LLMConfidence      *float64
	RunID              *string
	IsReviewed         bool
	CreatedAt          string
	UpdatedAt          string

	// Read-only, filled by queries.
	AccountName    string
	CategoryNameEN string
	CategoryNameHE string
}

// txSelect is the single column list and join used by every transaction read.
const txSelect = `SELECT t.id, t.account_id, t.batch_id, t.import_key, t.date, t.amount_minor, t.currency,
	t.original_amount_minor, t.original_currency, t.scope, t.kind, t.covers_transaction_id, t.is_standing_order,
	t.bill_date, t.bill_date_source, t.statement_id, t.current_installment, t.total_installments,
	t.payee_raw, t.payee_cleaned, t.notes, t.category_id, t.categorized_by, t.llm_confidence, t.run_id,
	t.is_reviewed, t.created_at, t.updated_at, a.name, COALESCE(c.name_en, ''), COALESCE(c.name_he, '')
	FROM transactions t
	JOIN accounts a ON a.id = t.account_id
	LEFT JOIN categories c ON c.id = t.category_id`

func scanTransaction(r rowScanner) (*Transaction, error) {
	var t Transaction
	var amount int64
	var cur string
	var orig sql.NullInt64
	var origCur, batch, covers, billDate, billSrc, stmt, cleaned, notes, cat, run sql.NullString
	var inst, total sql.NullInt64
	var conf sql.NullFloat64
	var standing, reviewed int
	if err := r.Scan(&t.ID, &t.AccountID, &batch, &t.ImportKey, &t.Date, &amount, &cur,
		&orig, &origCur, &t.Scope, &t.Kind, &covers, &standing,
		&billDate, &billSrc, &stmt, &inst, &total,
		&t.PayeeRaw, &cleaned, &notes, &cat, &t.CategorizedBy, &conf, &run,
		&reviewed, &t.CreatedAt, &t.UpdatedAt, &t.AccountName, &t.CategoryNameEN, &t.CategoryNameHE); err != nil {
		return nil, err
	}
	t.Amount = money.New(amount, money.Currency(cur))
	if orig.Valid && origCur.Valid {
		m := money.New(orig.Int64, money.Currency(origCur.String))
		t.Original = &m
	}
	str := func(n sql.NullString) *string {
		if !n.Valid {
			return nil
		}
		return &n.String
	}
	t.BatchID, t.CoversID, t.BillDate, t.StatementID = str(batch), str(covers), str(billDate), str(stmt)
	t.PayeeCleaned, t.Notes, t.CategoryID, t.RunID = str(cleaned), str(notes), str(cat), str(run)
	if billSrc.Valid {
		s := BillDateSource(billSrc.String)
		t.BillDateSource = &s
	}
	if inst.Valid {
		v := int(inst.Int64)
		t.CurrentInstallment = &v
	}
	if total.Valid {
		v := int(total.Int64)
		t.TotalInstallments = &v
	}
	if conf.Valid {
		t.LLMConfidence = &conf.Float64
	}
	t.IsStandingOrder, t.IsReviewed = standing != 0, reviewed != 0
	return &t, nil
}

// GetTransaction returns one transaction.
func (l *Ledger) GetTransaction(ctx context.Context, id string) (*Transaction, error) {
	t, err := scanTransaction(l.st.QueryRowContext(ctx, txSelect+` WHERE t.id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// InsertTransaction validates and inserts t, assigning ID and defaults. It
// returns ErrDuplicate when the import key already exists.
func (l *Ledger) InsertTransaction(ctx context.Context, t *Transaction) error {
	return l.st.WithTx(ctx, func(tx *sql.Tx) error { return l.insertTx(ctx, tx, t) })
}

// InsertTransactionTx is InsertTransaction inside a caller-owned transaction
// (used by importers, which insert a whole file atomically).
func (l *Ledger) InsertTransactionTx(ctx context.Context, tx *sql.Tx, t *Transaction) error {
	return l.insertTx(ctx, tx, t)
}

func (l *Ledger) insertTx(ctx context.Context, tx *sql.Tx, t *Transaction) error {
	var accType AccountType
	var accCur string
	err := tx.QueryRowContext(ctx, `SELECT account_type, currency FROM accounts WHERE id = ?`, t.AccountID).Scan(&accType, &accCur)
	if errors.Is(err, sql.ErrNoRows) {
		return invalid("account %q does not exist", t.AccountID)
	} else if err != nil {
		return err
	}
	if t.Scope == "" {
		t.Scope = TxLocal
	}
	if t.Kind == "" {
		t.Kind = KindPurchase
	}
	if t.CategorizedBy == "" {
		t.CategorizedBy = ByUnset
	}
	if err := l.validateTx(ctx, tx, t, accType, money.Currency(accCur)); err != nil {
		return err
	}
	if t.ImportKey == "" {
		t.ImportKey = "manual:" + store.NewID()
	}
	t.ID = store.NewID()
	var orig *int64
	var origCur *string
	if t.Original != nil {
		v, c := t.Original.Minor(), string(t.Original.Currency())
		orig, origCur = &v, &c
	}
	var src *string
	if t.BillDateSource != nil {
		s := string(*t.BillDateSource)
		src = &s
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO transactions (
		id, account_id, batch_id, import_key, date, amount_minor, currency, original_amount_minor, original_currency,
		scope, kind, covers_transaction_id, is_standing_order, bill_date, bill_date_source, statement_id,
		current_installment, total_installments, payee_raw, payee_cleaned, notes,
		category_id, categorized_by, llm_confidence, run_id, is_reviewed)
		VALUES (?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?)`,
		t.ID, t.AccountID, t.BatchID, t.ImportKey, t.Date, t.Amount.Minor(), string(t.Amount.Currency()), orig, origCur,
		t.Scope, t.Kind, t.CoversID, boolInt(t.IsStandingOrder), t.BillDate, src, t.StatementID,
		t.CurrentInstallment, t.TotalInstallments, t.PayeeRaw, t.PayeeCleaned, t.Notes,
		t.CategoryID, t.CategorizedBy, t.LLMConfidence, t.RunID, boolInt(t.IsReviewed))
	if isUnique(err) {
		return ErrDuplicate
	}
	return err
}

func (l *Ledger) validateTx(ctx context.Context, tx *sql.Tx, t *Transaction, accType AccountType, accCur money.Currency) error {
	if err := validDate("date", t.Date); err != nil {
		return err
	}
	if strings.TrimSpace(t.PayeeRaw) == "" {
		return invalid("payee is required")
	}
	if t.Amount.Currency() != accCur {
		return invalid("amount currency %s does not match account currency %s", t.Amount.Currency(), accCur)
	}
	if t.Scope != TxLocal && t.Scope != TxForeign {
		return invalid("scope must be LOCAL or FOREIGN, got %q", t.Scope)
	}
	if t.Original != nil {
		if _, err := money.ParseCurrency(string(t.Original.Currency())); err != nil {
			return invalid("original amount: %v", err)
		}
	}
	if t.BillDate != nil {
		if err := validDate("bill date", *t.BillDate); err != nil {
			return err
		}
		if t.BillDateSource == nil {
			return invalid("a bill date needs its source (PDF, BANK or RULE)")
		}
	}
	if t.BillDateSource != nil {
		switch *t.BillDateSource {
		case SourcePDF, SourceBank, SourceRule:
		default:
			return invalid("bill date source must be PDF, BANK or RULE, got %q", *t.BillDateSource)
		}
	}
	if (t.CurrentInstallment == nil) != (t.TotalInstallments == nil) {
		return invalid("installment number and total go together")
	}
	if t.CurrentInstallment != nil && (*t.CurrentInstallment < 1 || *t.CurrentInstallment > *t.TotalInstallments) {
		return invalid("installment %d of %d is out of range", *t.CurrentInstallment, *t.TotalInstallments)
	}
	if t.Kind == KindEmployerCoverage {
		if accType != CreditCard {
			return invalid("employer coverage applies to credit cards only")
		}
		if t.Amount.Minor() <= 0 {
			return invalid("employer coverage must be a positive amount")
		}
		if t.CoversID != nil {
			var kind string
			var acc string
			var amt int64
			err := tx.QueryRowContext(ctx, `SELECT kind, account_id, amount_minor FROM transactions WHERE id = ?`, *t.CoversID).Scan(&kind, &acc, &amt)
			if errors.Is(err, sql.ErrNoRows) {
				return invalid("covered purchase %q does not exist", *t.CoversID)
			} else if err != nil {
				return err
			}
			if kind != string(KindPurchase) || acc != t.AccountID {
				return invalid("coverage must reference a purchase on the same card")
			}
			if t.Amount.Minor() > -amt {
				return invalid("coverage %s exceeds the purchase amount %s", t.Amount, money.New(-amt, accCur))
			}
		}
	} else if t.CoversID != nil {
		return invalid("only employer coverage lines can cover a purchase")
	}
	if t.CategoryID != nil {
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM categories WHERE id = ?`, *t.CategoryID).Scan(&n); err != nil {
			return err
		}
		if n == 0 {
			return invalid("category %q does not exist", *t.CategoryID)
		}
	}
	return nil
}

// DeleteTransaction removes a transaction and any coverage lines attached to it.
func (l *Ledger) DeleteTransaction(ctx context.Context, id string) error {
	return l.st.WithTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `DELETE FROM transactions WHERE covers_transaction_id = ?`, id); err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx, `DELETE FROM transactions WHERE id = ?`, id)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return nil
	})
}

// Uncategorized is the CategoryIDs filter value that matches transactions
// without a category.
const Uncategorized = "uncategorized"

// TxFilter selects transactions. Zero values mean "no restriction".
type TxFilter struct {
	AccountIDs  []string
	Owner       string   // only accounts owned by this person
	CategoryIDs []string // may include Uncategorized
	Kinds       []TxKind
	DateFrom    string // inclusive, YYYY-MM-DD
	DateTo      string // inclusive
	Search      string // substring of payee or notes
	NeedsReview bool   // not yet confirmed by the user
	Limit       int    // default 50, capped at MaxPageSize
	Offset      int
}

func (f TxFilter) where() (string, []any, error) {
	var conds []string
	var args []any
	in := func(col string, vals []string) {
		ph := strings.TrimSuffix(strings.Repeat("?,", len(vals)), ",")
		conds = append(conds, fmt.Sprintf("%s IN (%s)", col, ph))
		for _, v := range vals {
			args = append(args, v)
		}
	}
	if len(f.AccountIDs) > 0 {
		in("t.account_id", f.AccountIDs)
	}
	if f.Owner != "" {
		conds = append(conds, "t.account_id IN (SELECT id FROM accounts WHERE owner = ?)")
		args = append(args, f.Owner)
	}
	if len(f.CategoryIDs) > 0 {
		var real []string
		unc := false
		for _, id := range f.CategoryIDs {
			if id == Uncategorized {
				unc = true
			} else {
				real = append(real, id)
			}
		}
		switch {
		case unc && len(real) > 0:
			ph := strings.TrimSuffix(strings.Repeat("?,", len(real)), ",")
			conds = append(conds, fmt.Sprintf("(t.category_id IS NULL OR t.category_id IN (%s))", ph))
			for _, v := range real {
				args = append(args, v)
			}
		case unc:
			conds = append(conds, "t.category_id IS NULL")
		default:
			in("t.category_id", real)
		}
	}
	if len(f.Kinds) > 0 {
		ks := make([]string, len(f.Kinds))
		for i, k := range f.Kinds {
			ks[i] = string(k)
		}
		in("t.kind", ks)
	}
	if f.DateFrom != "" {
		if err := validDate("date from", f.DateFrom); err != nil {
			return "", nil, err
		}
		conds = append(conds, "t.date >= ?")
		args = append(args, f.DateFrom)
	}
	if f.DateTo != "" {
		if err := validDate("date to", f.DateTo); err != nil {
			return "", nil, err
		}
		conds = append(conds, "t.date <= ?")
		args = append(args, f.DateTo)
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
		conds = append(conds, `(t.payee_raw LIKE ? ESCAPE '\' OR t.notes LIKE ? ESCAPE '\')`)
		args = append(args, "%"+esc+"%", "%"+esc+"%")
	}
	if f.NeedsReview {
		conds = append(conds, "t.is_reviewed = 0")
	}
	if len(conds) == 0 {
		return "", nil, nil
	}
	return " WHERE " + strings.Join(conds, " AND "), args, nil
}

// QueryTransactions returns one page of matching transactions (newest first)
// and the total number of matches.
func (l *Ledger) QueryTransactions(ctx context.Context, f TxFilter) ([]Transaction, int, error) {
	where, args, err := f.where()
	if err != nil {
		return nil, 0, err
	}
	if f.Limit <= 0 {
		f.Limit = 50
	}
	if f.Limit > MaxPageSize {
		f.Limit = MaxPageSize
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	var total int
	if err := l.st.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions t`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := l.st.QueryContext(ctx, txSelect+where+` ORDER BY t.date DESC, t.created_at DESC, t.id LIMIT ? OFFSET ?`,
		append(args, f.Limit, f.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *t)
	}
	return out, total, rows.Err()
}

// TxUpdate is a bulk change. A nil field is left unchanged.
type TxUpdate struct {
	CategoryID    *string // set this category (marks the lines MANUAL)
	ClearCategory bool    // remove the category instead
	Reviewed      *bool
}

// BulkUpdate applies u to the given transactions atomically and returns how
// many were changed. Setting a category by hand marks the lines MANUAL and
// reviewed unless Reviewed says otherwise.
func (l *Ledger) BulkUpdate(ctx context.Context, ids []string, u TxUpdate) (int, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	if len(ids) > MaxPageSize {
		return 0, invalid("at most %d transactions per update", MaxPageSize)
	}
	if u.CategoryID != nil && u.ClearCategory {
		return 0, invalid("cannot set and clear the category in one update")
	}
	if u.CategoryID == nil && !u.ClearCategory && u.Reviewed == nil {
		return 0, invalid("nothing to update")
	}
	var changed int
	err := l.st.WithTx(ctx, func(tx *sql.Tx) error {
		sets := []string{"updated_at = CURRENT_TIMESTAMP"}
		var args []any
		if u.CategoryID != nil {
			var n int
			if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM categories WHERE id = ?`, *u.CategoryID).Scan(&n); err != nil {
				return err
			}
			if n == 0 {
				return invalid("category %q does not exist", *u.CategoryID)
			}
			sets = append(sets, "category_id = ?", "categorized_by = 'MANUAL'", "llm_confidence = NULL", "run_id = NULL")
			args = append(args, *u.CategoryID)
		}
		if u.ClearCategory {
			sets = append(sets, "category_id = NULL", "categorized_by = 'UNSET'", "llm_confidence = NULL", "run_id = NULL", "is_reviewed = 0")
		}
		switch {
		case u.Reviewed != nil:
			sets = append(sets, "is_reviewed = ?")
			args = append(args, boolInt(*u.Reviewed))
		case u.CategoryID != nil:
			sets = append(sets, "is_reviewed = 1")
		}
		ph := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
		for _, id := range ids {
			args = append(args, id)
		}
		res, err := tx.ExecContext(ctx, `UPDATE transactions SET `+strings.Join(sets, ", ")+` WHERE id IN (`+ph+`)`, args...)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		changed = int(n)
		if changed != len(ids) {
			return fmt.Errorf("%w: %d of %d transactions found", ErrNotFound, changed, len(ids))
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return changed, nil
}
