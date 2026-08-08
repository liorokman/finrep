package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/liorokman/finrep/internal/models"
)

type DB struct {
	*sql.DB
}

func New(db *sql.DB) *DB {
	return &DB{DB: db}
}

// --- ACCOUNTS ---

func (db *DB) CreateAccount(acc *models.Account) error {
	if acc.ID == "" {
		acc.ID = uuid.New().String()
	}
	now := time.Now()
	acc.CreatedAt = now
	acc.UpdatedAt = now

	_, err := db.Exec(`
		INSERT INTO accounts (id, name, account_type, institution, account_number_last4, currency, opening_balance, credit_limit, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, acc.ID, acc.Name, acc.AccountType, acc.Institution, acc.AccountNumberLast4, acc.Currency, acc.OpeningBalance, acc.CreditLimit, acc.CreatedAt, acc.UpdatedAt)
	return err
}

func (db *DB) GetAccounts() ([]models.Account, error) {
	rows, err := db.Query(`
		SELECT a.id, a.name, a.account_type, a.institution, a.account_number_last4, a.currency, a.opening_balance, a.credit_limit, a.created_at, a.updated_at,
		       COALESCE(a.opening_balance + SUM(t.amount), a.opening_balance) as current_balance
		FROM accounts a
		LEFT JOIN transactions t ON a.id = t.account_id
		GROUP BY a.id
		ORDER BY a.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.AccountType, &a.Institution, &a.AccountNumberLast4, &a.Currency, &a.OpeningBalance, &a.CreditLimit, &a.CreatedAt, &a.UpdatedAt, &a.CurrentBalance); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (db *DB) GetAccountByID(id string) (*models.Account, error) {
	var a models.Account
	err := db.QueryRow(`
		SELECT a.id, a.name, a.account_type, a.institution, a.account_number_last4, a.currency, a.opening_balance, a.credit_limit, a.created_at, a.updated_at,
		       COALESCE(a.opening_balance + SUM(t.amount), a.opening_balance) as current_balance
		FROM accounts a
		LEFT JOIN transactions t ON a.id = t.account_id
		WHERE a.id = ?
		GROUP BY a.id
	`, id).Scan(&a.ID, &a.Name, &a.AccountType, &a.Institution, &a.AccountNumberLast4, &a.Currency, &a.OpeningBalance, &a.CreditLimit, &a.CreatedAt, &a.UpdatedAt, &a.CurrentBalance)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (db *DB) DeleteAccount(id string) error {
	_, err := db.Exec("DELETE FROM accounts WHERE id = ?", id)
	return err
}

// --- CATEGORIES ---

func (db *DB) CreateCategory(cat *models.Category) error {
	if cat.ID == "" {
		cat.ID = uuid.New().String()
	}
	cat.CreatedAt = time.Now()

	_, err := db.Exec(`
		INSERT INTO categories (id, name_he, name_en, parent_id, color_hex, icon, category_type, monthly_budget, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, cat.ID, cat.NameHE, cat.NameEN, cat.ParentID, cat.ColorHex, cat.Icon, cat.CategoryType, cat.MonthlyBudget, cat.CreatedAt)
	return err
}

func (db *DB) GetCategories() ([]models.Category, error) {
	rows, err := db.Query(`
		SELECT id, name_he, name_en, parent_id, color_hex, icon, category_type, monthly_budget, created_at
		FROM categories
		ORDER BY category_type ASC, name_en ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.NameHE, &c.NameEN, &c.ParentID, &c.ColorHex, &c.Icon, &c.CategoryType, &c.MonthlyBudget, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (db *DB) UpdateCategory(id string, cat *models.Category) error {
	_, err := db.Exec(`
		UPDATE categories
		SET name_he = ?, name_en = ?, color_hex = ?, icon = ?,
		    category_type = ?, monthly_budget = ?
		WHERE id = ?
	`, cat.NameHE, cat.NameEN, cat.ColorHex, cat.Icon, cat.CategoryType, cat.MonthlyBudget, id)
	return err
}

func (db *DB) DeleteCategory(id string) error {
	// Unlink transactions referencing this category before deleting
	if _, err := db.Exec("UPDATE transactions SET category_id = NULL WHERE category_id = ?", id); err != nil {
		return err
	}
	_, err := db.Exec("DELETE FROM categories WHERE id = ?", id)
	return err
}


// AcceptSuggestion creates a new category from AI suggestion and assigns it to transaction
func (db *DB) AcceptCategorySuggestion(txID string) (*models.Category, error) {
	tx, err := db.GetTransactionByID(txID)
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}
	if tx.SuggestedCategoryHE == nil || tx.SuggestedCategoryEN == nil {
		return nil, fmt.Errorf("no category suggestion pending for transaction %s", txID)
	}

	catType := models.CategoryTypeExpense
	if tx.SuggestedCategoryType != nil {
		catType = models.CategoryType(*tx.SuggestedCategoryType)
	}

	newCat := &models.Category{
		ID:           uuid.New().String(),
		NameHE:       *tx.SuggestedCategoryHE,
		NameEN:       *tx.SuggestedCategoryEN,
		ColorHex:     "#3B82F6",
		Icon:         "tag",
		CategoryType: catType,
	}

	if err := db.CreateCategory(newCat); err != nil {
		return nil, fmt.Errorf("failed to create suggested category: %w", err)
	}

	// Update transaction to link new category & clear suggestion fields
	_, err = db.Exec(`
		UPDATE transactions
		SET category_id = ?, suggested_category_he = NULL, suggested_category_en = NULL, suggested_category_type = NULL, is_reviewed = 1, categorized_by = 'LOCALAI', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, newCat.ID, txID)
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction category: %w", err)
	}

	return newCat, nil
}

func (db *DB) RejectCategorySuggestion(txID string, fallbackCategoryID *string) error {
	var err error
	if fallbackCategoryID != nil && *fallbackCategoryID != "" {
		_, err = db.Exec(`
			UPDATE transactions
			SET category_id = ?, suggested_category_he = NULL, suggested_category_en = NULL, suggested_category_type = NULL, is_reviewed = 1, categorized_by = 'MANUAL', updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, *fallbackCategoryID, txID)
	} else {
		_, err = db.Exec(`
			UPDATE transactions
			SET suggested_category_he = NULL, suggested_category_en = NULL, suggested_category_type = NULL, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, txID)
	}
	return err
}

// --- TRANSACTIONS ---

func (db *DB) CreateTransaction(t *models.Transaction) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	if t.CategorizedBy == "" {
		t.CategorizedBy = models.CategorizedByUnset
	}
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	_, err := db.Exec(`
		INSERT INTO transactions (
			id, account_id, date, amount, currency, original_amount, original_currency,
			current_installment, total_installments, payee_raw, payee_cleaned, category_id,
			suggested_category_he, suggested_category_en, suggested_category_type, notes,
			import_hash, is_reviewed, categorized_by, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, t.ID, t.AccountID, t.Date, t.Amount, t.Currency, t.OriginalAmount, t.OriginalCurrency,
		t.CurrentInstallment, t.TotalInstallments, t.PayeeRaw, t.PayeeCleaned, t.CategoryID,
		t.SuggestedCategoryHE, t.SuggestedCategoryEN, t.SuggestedCategoryType, t.Notes,
		t.ImportHash, t.IsReviewed, t.CategorizedBy, t.CreatedAt, t.UpdatedAt)
	return err
}

func (db *DB) GetDailyOccurrenceOrdinal(accountID, dateStr string, amount float64, payeeRaw string) (int, error) {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM transactions
		WHERE account_id = ? AND date = ? AND amount = ? AND payee_raw = ?
	`, accountID, dateStr, amount, payeeRaw).Scan(&count)
	if err != nil {
		return 1, err
	}
	return count + 1, nil
}

type TransactionFilter struct {
	AccountID   string
	CategoryID  string
	Unreviewed  *bool
	Search      string
	StartDate   string
	EndDate     string
	Limit       int
	Offset      int
}

func (db *DB) QueryTransactions(f TransactionFilter) ([]models.Transaction, int, error) {
	query := `
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM transactions t WHERE 1=1`
	var args []interface{}
	var countArgs []interface{}

	if f.AccountID != "" {
		query += " AND t.account_id = ?"
		countQuery += " AND t.account_id = ?"
		args = append(args, f.AccountID)
		countArgs = append(countArgs, f.AccountID)
	}
	if f.CategoryID != "" {
		query += " AND t.category_id = ?"
		countQuery += " AND t.category_id = ?"
		args = append(args, f.CategoryID)
		countArgs = append(countArgs, f.CategoryID)
	}
	if f.Unreviewed != nil {
		query += " AND t.is_reviewed = ?"
		countQuery += " AND t.is_reviewed = ?"
		args = append(args, *f.Unreviewed)
		countArgs = append(countArgs, *f.Unreviewed)
	}
	if f.StartDate != "" {
		query += " AND t.date >= ?"
		countQuery += " AND t.date >= ?"
		args = append(args, f.StartDate)
		countArgs = append(countArgs, f.StartDate)
	}
	if f.EndDate != "" {
		query += " AND t.date <= ?"
		countQuery += " AND t.date <= ?"
		args = append(args, f.EndDate)
		countArgs = append(countArgs, f.EndDate)
	}
	if f.Search != "" {
		query += " AND (t.payee_raw LIKE ? OR t.notes LIKE ?)"
		countQuery += " AND (t.payee_raw LIKE ? OR t.notes LIKE ?)"
		pattern := "%" + f.Search + "%"
		args = append(args, pattern, pattern)
		countArgs = append(countArgs, pattern, pattern)
	}

	var total int
	if err := db.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += " ORDER BY t.date DESC, t.created_at DESC"
	if f.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, f.Limit)
		if f.Offset > 0 {
			query += " OFFSET ?"
			args = append(args, f.Offset)
		}
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(
			&t.ID, &t.AccountID, &t.AccountName, &t.Date, &t.Amount, &t.Currency,
			&t.OriginalAmount, &t.OriginalCurrency, &t.CurrentInstallment, &t.TotalInstallments,
			&t.PayeeRaw, &t.PayeeCleaned, &t.CategoryID, &t.CategoryNameHE, &t.CategoryNameEN,
			&t.SuggestedCategoryHE, &t.SuggestedCategoryEN, &t.SuggestedCategoryType,
			&t.Notes, &t.ImportHash, &t.IsReviewed, &t.CategorizedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		transactions = append(transactions, t)
	}

	return transactions, total, nil
}

func (db *DB) GetTransactionByID(id string) (*models.Transaction, error) {
	var t models.Transaction
	err := db.QueryRow(`
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.id = ?
	`, id).Scan(
		&t.ID, &t.AccountID, &t.AccountName, &t.Date, &t.Amount, &t.Currency,
		&t.OriginalAmount, &t.OriginalCurrency, &t.CurrentInstallment, &t.TotalInstallments,
		&t.PayeeRaw, &t.PayeeCleaned, &t.CategoryID, &t.CategoryNameHE, &t.CategoryNameEN,
		&t.SuggestedCategoryHE, &t.SuggestedCategoryEN, &t.SuggestedCategoryType,
		&t.Notes, &t.ImportHash, &t.IsReviewed, &t.CategorizedBy, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (db *DB) UpdateTransactionCategory(id string, categoryID *string, reviewed bool, categorizedBy models.CategorizedBy) error {
	_, err := db.Exec(`
		UPDATE transactions
		SET category_id = ?, is_reviewed = ?, categorized_by = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, categoryID, reviewed, categorizedBy, id)
	return err
}

func (db *DB) DeleteTransaction(id string) error {
	_, err := db.Exec("DELETE FROM transactions WHERE id = ?", id)
	return err
}

// --- SETTINGS ---

func (db *DB) GetSetting(key string) (string, error) {
	var val string
	err := db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&val)
	if err != nil {
		return "", err
	}
	return val, nil
}

func (db *DB) SetSetting(key, value string) error {
	_, err := db.Exec(`
		INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
	`, key, value)
	return err
}

func (db *DB) GetAllSettings() (map[string]string, error) {
	rows, err := db.Query("SELECT key, value FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		settings[k] = v
	}
	return settings, nil
}
