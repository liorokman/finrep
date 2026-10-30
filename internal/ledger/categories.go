package ledger

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strings"

	"github.com/liorokman/finrep/internal/money"
	"github.com/liorokman/finrep/internal/store"
)

type CategoryType string

const (
	Expense  CategoryType = "EXPENSE"
	Income   CategoryType = "INCOME"
	Transfer CategoryType = "TRANSFER"
)

// Creator records who made a category, so LLM-created ones can be reviewed.
type Creator string

const (
	ByUser Creator = "USER"
	ByLLM  Creator = "LLM"
)

// Category is a bilingual transaction category.
type Category struct {
	ID            string
	NameHE        string
	NameEN        string
	ParentID      *string
	ColorHex      string
	Icon          string
	Type          CategoryType
	MonthlyBudget *money.Money // in ILS
	CreatedBy     Creator
	CreatedAt     string
}

var hexColor = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

func (c *Category) normalize() error {
	c.NameHE, c.NameEN = strings.TrimSpace(c.NameHE), strings.TrimSpace(c.NameEN)
	if c.NameEN == "" {
		return invalid("English category name is required")
	}
	if c.NameHE == "" {
		c.NameHE = c.NameEN
	}
	switch c.Type {
	case Expense, Income, Transfer:
	default:
		return invalid("category type must be EXPENSE, INCOME or TRANSFER, got %q", c.Type)
	}
	if c.ColorHex == "" {
		c.ColorHex = "#3B82F6"
	}
	if !hexColor.MatchString(c.ColorHex) {
		return invalid("color must look like #3B82F6, got %q", c.ColorHex)
	}
	if c.Icon == "" {
		c.Icon = "tag"
	}
	if c.CreatedBy == "" {
		c.CreatedBy = ByUser
	}
	if c.CreatedBy != ByUser && c.CreatedBy != ByLLM {
		return invalid("created_by must be USER or LLM")
	}
	if c.MonthlyBudget != nil && c.MonthlyBudget.IsNegative() {
		return invalid("monthly budget cannot be negative")
	}
	return nil
}

const categoryCols = `id, name_he, name_en, parent_id, color_hex, icon, category_type, monthly_budget_minor, created_by, created_at`

func scanCategory(r rowScanner) (*Category, error) {
	var c Category
	var parent sql.NullString
	var budget sql.NullInt64
	if err := r.Scan(&c.ID, &c.NameHE, &c.NameEN, &parent, &c.ColorHex, &c.Icon, &c.Type, &budget, &c.CreatedBy, &c.CreatedAt); err != nil {
		return nil, err
	}
	if parent.Valid {
		c.ParentID = &parent.String
	}
	if budget.Valid {
		m := money.New(budget.Int64, money.ILS)
		c.MonthlyBudget = &m
	}
	return &c, nil
}

func budgetMinor(c *Category) *int64 {
	if c.MonthlyBudget == nil {
		return nil
	}
	v := c.MonthlyBudget.Minor()
	return &v
}

// CreateCategory inserts a category and assigns its ID.
func (l *Ledger) CreateCategory(ctx context.Context, c *Category) error {
	if err := c.normalize(); err != nil {
		return err
	}
	if c.ParentID != nil {
		if _, err := l.GetCategory(ctx, *c.ParentID); err != nil {
			return invalid("parent category: %v", err)
		}
	}
	c.ID = store.NewID()
	_, err := l.st.ExecContext(ctx, `INSERT INTO categories
		(id, name_he, name_en, parent_id, color_hex, icon, category_type, monthly_budget_minor, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.NameHE, c.NameEN, c.ParentID, c.ColorHex, c.Icon, c.Type, budgetMinor(c), c.CreatedBy)
	if isUnique(err) {
		return ErrDuplicate
	}
	return err
}

// GetCategory returns one category.
func (l *Ledger) GetCategory(ctx context.Context, id string) (*Category, error) {
	c, err := scanCategory(l.st.QueryRowContext(ctx, `SELECT `+categoryCols+` FROM categories WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

// FindCategoryByName matches an English or Hebrew name ignoring case.
func (l *Ledger) FindCategoryByName(ctx context.Context, name string) (*Category, error) {
	name = strings.TrimSpace(name)
	c, err := scanCategory(l.st.QueryRowContext(ctx, `SELECT `+categoryCols+` FROM categories
		WHERE lower(name_en) = lower(?) OR name_he = ? LIMIT 1`, name, name))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

// ListCategories returns all categories ordered by type then English name.
func (l *Ledger) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := l.st.QueryContext(ctx, `SELECT `+categoryCols+` FROM categories ORDER BY category_type, lower(name_en)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Category
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// UpdateCategory replaces the editable fields of a category.
func (l *Ledger) UpdateCategory(ctx context.Context, c *Category) error {
	if err := c.normalize(); err != nil {
		return err
	}
	if _, err := l.GetCategory(ctx, c.ID); err != nil {
		return err
	}
	if c.ParentID != nil {
		if err := l.checkNoCycle(ctx, c.ID, *c.ParentID); err != nil {
			return err
		}
	}
	_, err := l.st.ExecContext(ctx, `UPDATE categories SET name_he = ?, name_en = ?, parent_id = ?, color_hex = ?,
		icon = ?, category_type = ?, monthly_budget_minor = ? WHERE id = ?`,
		c.NameHE, c.NameEN, c.ParentID, c.ColorHex, c.Icon, c.Type, budgetMinor(c), c.ID)
	if isUnique(err) {
		return ErrDuplicate
	}
	return err
}

// checkNoCycle rejects making id a descendant of itself.
func (l *Ledger) checkNoCycle(ctx context.Context, id, newParent string) error {
	for cur, depth := newParent, 0; ; depth++ {
		if cur == id {
			return invalid("a category cannot be its own ancestor")
		}
		if depth > 50 {
			return invalid("category hierarchy is too deep")
		}
		p, err := l.GetCategory(ctx, cur)
		if err != nil {
			return invalid("parent category: %v", err)
		}
		if p.ParentID == nil {
			return nil
		}
		cur = *p.ParentID
	}
}

// DeleteCategory removes a category. Its transactions become uncategorized and
// its children become top-level (enforced by foreign keys).
func (l *Ledger) DeleteCategory(ctx context.Context, id string) error {
	res, err := l.st.ExecContext(ctx, `DELETE FROM categories WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// MergeCategories moves everything from one category into another, then
// deletes the source, in a single transaction. Children are re-parented.
func (l *Ledger) MergeCategories(ctx context.Context, fromID, toID string) error {
	if fromID == toID {
		return invalid("cannot merge a category into itself")
	}
	if _, err := l.GetCategory(ctx, fromID); err != nil {
		return err
	}
	if _, err := l.GetCategory(ctx, toID); err != nil {
		return err
	}
	if err := l.checkNoCycle(ctx, fromID, toID); err != nil {
		return invalid("cannot merge a category into its own descendant")
	}
	return l.st.WithTx(ctx, func(tx *sql.Tx) error {
		for _, q := range []string{
			`UPDATE transactions SET category_id = ?2, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?1`,
			`UPDATE categories SET parent_id = ?2 WHERE parent_id = ?1`,
			`DELETE FROM categories WHERE id = ?1`,
		} {
			if _, err := tx.ExecContext(ctx, q, fromID, toID); err != nil {
				return err
			}
		}
		return nil
	})
}
