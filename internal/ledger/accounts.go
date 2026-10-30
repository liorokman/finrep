package ledger

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

type AccountType string

const (
	Bank       AccountType = "BANK"
	CreditCard AccountType = "CREDIT_CARD"
)

type Scope string

const (
	ScopeLocal   Scope = "LOCAL"
	ScopeForeign Scope = "FOREIGN"
	ScopeAll     Scope = "ALL"
)

// Account is a bank account or a credit card.
type Account struct {
	ID             string
	Name           string
	Type           AccountType
	Institution    string
	Owner          string
	Last4          string
	Currency       money.Currency
	OpeningBalance money.Money
	CreditLimit    *money.Money
	CreatedAt      string
}

// BillingRule maps a card's purchases to bill dates (spec 6.1).
type BillingRule struct {
	ID                       string
	AccountID                string
	Scope                    Scope
	BillDay                  int
	MonthOffset              int
	CutoffDay                *int
	StandingOrderExtraCycles int
}

func (a *Account) validate() error {
	if strings.TrimSpace(a.Name) == "" {
		return invalid("account name is required")
	}
	if a.Type != Bank && a.Type != CreditCard {
		return invalid("account type must be BANK or CREDIT_CARD, got %q", a.Type)
	}
	if strings.TrimSpace(a.Institution) == "" {
		return invalid("institution is required")
	}
	if _, err := money.ParseCurrency(string(a.Currency)); err != nil {
		return invalid("%v", err)
	}
	if a.Last4 != "" && (len(a.Last4) != 4 || strings.Trim(a.Last4, "0123456789") != "") {
		return invalid("last4 must be four digits, got %q", a.Last4)
	}
	if a.CreditLimit != nil && a.Type == Bank {
		return invalid("only credit cards have a credit limit")
	}
	return nil
}

const accountCols = `id, name, account_type, institution, owner, COALESCE(last4, ''), currency,
	opening_balance_minor, credit_limit_minor, created_at`

func scanAccount(r rowScanner) (*Account, error) {
	var a Account
	var opening int64
	var limit sql.NullInt64
	var cur string
	if err := r.Scan(&a.ID, &a.Name, &a.Type, &a.Institution, &a.Owner, &a.Last4, &cur,
		&opening, &limit, &a.CreatedAt); err != nil {
		return nil, err
	}
	a.Currency = money.Currency(cur)
	a.OpeningBalance = money.New(opening, a.Currency)
	if limit.Valid {
		m := money.New(limit.Int64, a.Currency)
		a.CreditLimit = &m
	}
	return &a, nil
}

// CreateAccount inserts a new account and assigns its ID.
func (l *Ledger) CreateAccount(ctx context.Context, a *Account) error {
	if a.Currency == "" {
		a.Currency = money.ILS
	}
	if err := a.validate(); err != nil {
		return err
	}
	a.ID = store.NewID()
	var limit *int64
	if a.CreditLimit != nil {
		v := a.CreditLimit.Minor()
		limit = &v
	}
	_, err := l.st.ExecContext(ctx, `INSERT INTO accounts
		(id, name, account_type, institution, owner, last4, currency, opening_balance_minor, credit_limit_minor)
		VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?)`,
		a.ID, a.Name, a.Type, a.Institution, a.Owner, a.Last4, a.Currency, a.OpeningBalance.Minor(), limit)
	return err
}

// GetAccount returns one account.
func (l *Ledger) GetAccount(ctx context.Context, id string) (*Account, error) {
	a, err := scanAccount(l.st.QueryRowContext(ctx, `SELECT `+accountCols+` FROM accounts WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

// ListAccounts returns all accounts ordered by owner, then name.
func (l *Ledger) ListAccounts(ctx context.Context) ([]Account, error) {
	rows, err := l.st.QueryContext(ctx, `SELECT `+accountCols+` FROM accounts ORDER BY owner, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Account
	for rows.Next() {
		a, err := scanAccount(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// UpdateAccount replaces the editable fields of an account. Type and
// currency cannot change once transactions exist.
func (l *Ledger) UpdateAccount(ctx context.Context, a *Account) error {
	if err := a.validate(); err != nil {
		return err
	}
	cur, err := l.GetAccount(ctx, a.ID)
	if err != nil {
		return err
	}
	if cur.Type != a.Type || cur.Currency != a.Currency {
		var n int
		if err := l.st.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE account_id = ?`, a.ID).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return invalid("account type and currency cannot change while it has transactions")
		}
	}
	var limit *int64
	if a.CreditLimit != nil {
		v := a.CreditLimit.Minor()
		limit = &v
	}
	_, err = l.st.ExecContext(ctx, `UPDATE accounts SET name = ?, account_type = ?, institution = ?, owner = ?,
		last4 = NULLIF(?, ''), currency = ?, opening_balance_minor = ?, credit_limit_minor = ? WHERE id = ?`,
		a.Name, a.Type, a.Institution, a.Owner, a.Last4, a.Currency, a.OpeningBalance.Minor(), limit, a.ID)
	return err
}

// DeleteAccount removes an empty account. Accounts with transactions must have
// their import batches undone first, so data is never lost by accident.
func (l *Ledger) DeleteAccount(ctx context.Context, id string) error {
	var n int
	if err := l.st.QueryRowContext(ctx, `SELECT COUNT(*) FROM transactions WHERE account_id = ?`, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return ErrInUse
	}
	res, err := l.st.ExecContext(ctx, `DELETE FROM accounts WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if c, _ := res.RowsAffected(); c == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *BillingRule) validate() error {
	switch r.Scope {
	case ScopeLocal, ScopeForeign, ScopeAll:
	default:
		return invalid("rule scope must be LOCAL, FOREIGN or ALL, got %q", r.Scope)
	}
	if r.BillDay < 1 || r.BillDay > 31 {
		return invalid("bill day must be 1-31, got %d", r.BillDay)
	}
	if r.MonthOffset < 0 || r.MonthOffset > 6 {
		return invalid("month offset must be 0-6, got %d", r.MonthOffset)
	}
	if r.CutoffDay != nil && (*r.CutoffDay < 1 || *r.CutoffDay > 31) {
		return invalid("cutoff day must be 1-31, got %d", *r.CutoffDay)
	}
	if r.StandingOrderExtraCycles < 0 || r.StandingOrderExtraCycles > 3 {
		return invalid("standing-order extra cycles must be 0-3, got %d", r.StandingOrderExtraCycles)
	}
	return nil
}

// SetBillingRules atomically replaces all billing rules of a credit card.
func (l *Ledger) SetBillingRules(ctx context.Context, accountID string, rules []BillingRule) error {
	acc, err := l.GetAccount(ctx, accountID)
	if err != nil {
		return err
	}
	if acc.Type != CreditCard {
		return invalid("billing rules apply to credit cards only")
	}
	seen := map[Scope]bool{}
	for i := range rules {
		if err := rules[i].validate(); err != nil {
			return err
		}
		if seen[rules[i].Scope] {
			return invalid("duplicate rule for scope %s", rules[i].Scope)
		}
		seen[rules[i].Scope] = true
	}
	if seen[ScopeAll] && len(rules) > 1 {
		return invalid("scope ALL cannot be combined with LOCAL or FOREIGN rules")
	}
	return l.st.WithTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `DELETE FROM billing_rules WHERE account_id = ?`, accountID); err != nil {
			return err
		}
		for i := range rules {
			r := &rules[i]
			r.ID, r.AccountID = store.NewID(), accountID
			if _, err := tx.ExecContext(ctx, `INSERT INTO billing_rules
				(id, account_id, scope, bill_day, month_offset, cutoff_day, standing_order_extra_cycles)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				r.ID, accountID, r.Scope, r.BillDay, r.MonthOffset, r.CutoffDay, r.StandingOrderExtraCycles); err != nil {
				return err
			}
		}
		return nil
	})
}

// BillingRules lists a card's rules.
func (l *Ledger) BillingRules(ctx context.Context, accountID string) ([]BillingRule, error) {
	rows, err := l.st.QueryContext(ctx, `SELECT id, account_id, scope, bill_day, month_offset, cutoff_day,
		standing_order_extra_cycles FROM billing_rules WHERE account_id = ? ORDER BY scope`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []BillingRule
	for rows.Next() {
		var r BillingRule
		var cut sql.NullInt64
		if err := rows.Scan(&r.ID, &r.AccountID, &r.Scope, &r.BillDay, &r.MonthOffset, &cut, &r.StandingOrderExtraCycles); err != nil {
			return nil, err
		}
		if cut.Valid {
			c := int(cut.Int64)
			r.CutoffDay = &c
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
