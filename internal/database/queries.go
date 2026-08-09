package database

import (
	"database/sql"
	"fmt"
	"strings"
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
		INSERT INTO accounts (id, name, account_type, institution, account_number_last4, currency, opening_balance, credit_limit, billing_day_primary, billing_day_secondary, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, acc.ID, acc.Name, acc.AccountType, acc.Institution, acc.AccountNumberLast4, acc.Currency, acc.OpeningBalance, acc.CreditLimit, acc.BillingDayPrimary, acc.BillingDaySecondary, acc.CreatedAt, acc.UpdatedAt)
	return err
}

func (db *DB) UpdateAccount(id string, acc *models.Account) error {
	_, err := db.Exec(`
		UPDATE accounts
		SET name = ?, account_type = ?, institution = ?, account_number_last4 = ?,
		    currency = ?, opening_balance = ?, credit_limit = ?,
		    billing_day_primary = ?, billing_day_secondary = ?,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, acc.Name, acc.AccountType, acc.Institution, acc.AccountNumberLast4,
		acc.Currency, acc.OpeningBalance, acc.CreditLimit,
		acc.BillingDayPrimary, acc.BillingDaySecondary, id)
	return err
}

func (db *DB) GetAccounts() ([]models.Account, error) {
	rows, err := db.Query(`
		SELECT a.id, a.name, a.account_type, a.institution, a.account_number_last4, a.currency, a.opening_balance, a.credit_limit, a.billing_day_primary, a.billing_day_secondary, a.created_at, a.updated_at,
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
		if err := rows.Scan(&a.ID, &a.Name, &a.AccountType, &a.Institution, &a.AccountNumberLast4, &a.Currency, &a.OpeningBalance, &a.CreditLimit, &a.BillingDayPrimary, &a.BillingDaySecondary, &a.CreatedAt, &a.UpdatedAt, &a.CurrentBalance); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (db *DB) GetAccountByID(id string) (*models.Account, error) {
	var a models.Account
	err := db.QueryRow(`
		SELECT a.id, a.name, a.account_type, a.institution, a.account_number_last4, a.currency, a.opening_balance, a.credit_limit, a.billing_day_primary, a.billing_day_secondary, a.created_at, a.updated_at,
		       COALESCE(a.opening_balance + SUM(t.amount), a.opening_balance) as current_balance
		FROM accounts a
		LEFT JOIN transactions t ON a.id = t.account_id
		WHERE a.id = ?
		GROUP BY a.id
	`, id).Scan(&a.ID, &a.Name, &a.AccountType, &a.Institution, &a.AccountNumberLast4, &a.Currency, &a.OpeningBalance, &a.CreditLimit, &a.BillingDayPrimary, &a.BillingDaySecondary, &a.CreatedAt, &a.UpdatedAt, &a.CurrentBalance)
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

	// Check if a category with matching English or Hebrew name already exists
	var existingCat models.Category
	findErr := db.QueryRow(`
		SELECT id, name_he, name_en, parent_id, color_hex, icon, category_type, monthly_budget, created_at
		FROM categories
		WHERE LOWER(name_en) = LOWER(?) OR LOWER(name_he) = LOWER(?)
		LIMIT 1
	`, *tx.SuggestedCategoryEN, *tx.SuggestedCategoryHE).Scan(
		&existingCat.ID, &existingCat.NameHE, &existingCat.NameEN, &existingCat.ParentID,
		&existingCat.ColorHex, &existingCat.Icon, &existingCat.CategoryType,
		&existingCat.MonthlyBudget, &existingCat.CreatedAt,
	)

	var targetCatID string
	var returnCat *models.Category

	if findErr == nil {
		targetCatID = existingCat.ID
		returnCat = &existingCat
	} else {
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
		targetCatID = newCat.ID
		returnCat = newCat
	}

	// Update transaction to link target category & clear suggestion fields
	_, err = db.Exec(`
		UPDATE transactions
		SET category_id = ?, suggested_category_he = NULL, suggested_category_en = NULL, suggested_category_type = NULL, is_reviewed = 1, categorized_by = 'LOCALAI', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, targetCatID, txID)
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction category: %w", err)
	}

	return returnCat, nil
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

	// Auto-match categorization rules if category is unset
	if (t.CategoryID == nil || *t.CategoryID == "") && t.PayeeRaw != "" {
		var matchedCatID string
		err := db.QueryRow(`
			SELECT category_id FROM categorization_rules
			WHERE ? LIKE '%' || pattern || '%'
			ORDER BY priority DESC LIMIT 1
		`, t.PayeeRaw).Scan(&matchedCatID)
		if err == nil && matchedCatID != "" {
			t.CategoryID = &matchedCatID
			t.CategorizedBy = models.CategorizedByRule
			t.IsReviewed = true
		}
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
			billing_date, billing_day, current_installment, total_installments, payee_raw, payee_cleaned, category_id,
			suggested_category_he, suggested_category_en, suggested_category_type, notes,
			import_hash, is_reviewed, categorized_by, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, t.ID, t.AccountID, t.Date, t.Amount, t.Currency, t.OriginalAmount, t.OriginalCurrency,
		t.BillingDate, t.BillingDay, t.CurrentInstallment, t.TotalInstallments, t.PayeeRaw, t.PayeeCleaned, t.CategoryID,
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
	AccountID    string
	CategoryID   string
	CategoryIDs  []string
	CategoryType string
	Unreviewed   *bool
	Search       string
	StartDate    string
	EndDate      string
	Limit        int
	Offset       int
}

func (db *DB) QueryTransactions(f TransactionFilter) ([]models.Transaction, int, error) {
	query := `
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.billing_date, t.billing_day,
		       t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE 1=1
	`
	countQuery := `
		SELECT COUNT(*) 
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE 1=1
	`
	var args []interface{}
	var countArgs []interface{}

	if f.AccountID != "" {
		query += " AND t.account_id = ?"
		countQuery += " AND t.account_id = ?"
		args = append(args, f.AccountID)
		countArgs = append(countArgs, f.AccountID)
	}
	if len(f.CategoryIDs) > 0 {
		var realIDs []string
		hasUncategorized := false
		for _, cid := range f.CategoryIDs {
			if cid == "UNCATEGORIZED" || cid == "uncategorized" || cid == "null" || cid == "" {
				hasUncategorized = true
			} else {
				realIDs = append(realIDs, cid)
			}
		}

		var subConditions []string
		if len(realIDs) > 0 {
			placeholders := make([]string, len(realIDs))
			for i, cid := range realIDs {
				placeholders[i] = "?"
				args = append(args, cid)
				countArgs = append(countArgs, cid)
			}
			subConditions = append(subConditions, fmt.Sprintf("t.category_id IN (%s)", strings.Join(placeholders, ",")))
		}
		if hasUncategorized {
			subConditions = append(subConditions, "(t.category_id IS NULL OR t.category_id = '')")
		}

		if len(subConditions) > 0 {
			clause := fmt.Sprintf(" AND (%s)", strings.Join(subConditions, " OR "))
			query += clause
			countQuery += clause
		}
	} else if f.CategoryID != "" {
		if f.CategoryID == "UNCATEGORIZED" || f.CategoryID == "uncategorized" || f.CategoryID == "null" {
			query += " AND (t.category_id IS NULL OR t.category_id = '')"
			countQuery += " AND (t.category_id IS NULL OR t.category_id = '')"
		} else {
			query += " AND t.category_id = ?"
			countQuery += " AND t.category_id = ?"
			args = append(args, f.CategoryID)
			countArgs = append(countArgs, f.CategoryID)
		}
	}
	if f.CategoryType != "" {
		query += " AND c.category_type = ?"
		countQuery += " AND c.category_type = ?"
		args = append(args, f.CategoryType)
		countArgs = append(countArgs, f.CategoryType)
	}
	if f.Unreviewed != nil {
		isReviewedVal := 0
		if !*f.Unreviewed {
			isReviewedVal = 1
		}
		query += " AND t.is_reviewed = ?"
		countQuery += " AND t.is_reviewed = ?"
		args = append(args, isReviewedVal)
		countArgs = append(countArgs, isReviewedVal)
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
			&t.OriginalAmount, &t.OriginalCurrency, &t.BillingDate, &t.BillingDay,
			&t.CurrentInstallment, &t.TotalInstallments,
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

func (db *DB) GetUncategorizedOrUnreviewedTransactions(limit int) ([]models.Transaction, error) {
	query := `
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.billing_date, t.billing_day,
		       t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE (t.category_id IS NULL OR t.category_id = '' OR c.name_en = 'Uncategorized' OR c.name_he = 'ללא קטגוריה')
		ORDER BY t.date DESC
	`
	var args []interface{}
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(
			&t.ID, &t.AccountID, &t.AccountName, &t.Date, &t.Amount, &t.Currency,
			&t.OriginalAmount, &t.OriginalCurrency, &t.BillingDate, &t.BillingDay,
			&t.CurrentInstallment, &t.TotalInstallments,
			&t.PayeeRaw, &t.PayeeCleaned, &t.CategoryID, &t.CategoryNameHE, &t.CategoryNameEN,
			&t.SuggestedCategoryHE, &t.SuggestedCategoryEN, &t.SuggestedCategoryType,
			&t.Notes, &t.ImportHash, &t.IsReviewed, &t.CategorizedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, t)
	}
	return results, nil
}

func (db *DB) GetTransactionByID(id string) (*models.Transaction, error) {
	var t models.Transaction
	err := db.QueryRow(`
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.billing_date, t.billing_day,
		       t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.id = ?
	`, id).Scan(
		&t.ID, &t.AccountID, &t.AccountName, &t.Date, &t.Amount, &t.Currency,
		&t.OriginalAmount, &t.OriginalCurrency, &t.BillingDate, &t.BillingDay,
		&t.CurrentInstallment, &t.TotalInstallments,
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

// --- BILLING CYCLES ---

func (db *DB) CreateBillingCycle(bc *models.BillingCycle) error {
	if bc.ID == "" {
		bc.ID = uuid.New().String()
	}
	now := time.Now()
	bc.CreatedAt = now
	bc.UpdatedAt = now
	if bc.Status == "" {
		bc.Status = models.BillingCycleOpen
	}

	_, err := db.Exec(`
		INSERT INTO billing_cycles (
			id, account_id, billing_day, cycle_start_date, cycle_end_date, expected_bill_date,
			status, expected_amount, bank_transaction_id, paid_amount, notes, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, bc.ID, bc.AccountID, bc.BillingDay, bc.CycleStartDate, bc.CycleEndDate, bc.ExpectedBillDate,
		bc.Status, bc.ExpectedAmount, bc.BankTransactionID, bc.PaidAmount, bc.Notes, bc.CreatedAt, bc.UpdatedAt)
	return err
}

func (db *DB) GetBillingCycles(accountID, status string) ([]models.BillingCycle, error) {
	query := `
		SELECT bc.id, bc.account_id, a.name as account_name, bc.billing_day,
		       bc.cycle_start_date, bc.cycle_end_date, bc.expected_bill_date,
		       bc.status, bc.expected_amount, bc.bank_transaction_id, bc.paid_amount, bc.notes,
		       bc.created_at, bc.updated_at,
		       COUNT(bct.transaction_id) as transaction_count
		FROM billing_cycles bc
		JOIN accounts a ON bc.account_id = a.id
		LEFT JOIN billing_cycle_transactions bct ON bc.id = bct.billing_cycle_id
		WHERE 1=1
	`
	var args []interface{}
	if accountID != "" {
		query += " AND bc.account_id = ?"
		args = append(args, accountID)
	}
	if status != "" {
		query += " AND bc.status = ?"
		args = append(args, status)
	}
	query += " GROUP BY bc.id ORDER BY bc.cycle_start_date DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cycles []models.BillingCycle
	for rows.Next() {
		var c models.BillingCycle
		if err := rows.Scan(
			&c.ID, &c.AccountID, &c.AccountName, &c.BillingDay,
			&c.CycleStartDate, &c.CycleEndDate, &c.ExpectedBillDate,
			&c.Status, &c.ExpectedAmount, &c.BankTransactionID, &c.PaidAmount, &c.Notes,
			&c.CreatedAt, &c.UpdatedAt, &c.TransactionCount,
		); err != nil {
			return nil, err
		}
		cycles = append(cycles, c)
	}
	return cycles, nil
}

func (db *DB) GetBillingCycleByID(id string) (*models.BillingCycle, error) {
	var c models.BillingCycle
	err := db.QueryRow(`
		SELECT bc.id, bc.account_id, a.name as account_name, bc.billing_day,
		       bc.cycle_start_date, bc.cycle_end_date, bc.expected_bill_date,
		       bc.status, bc.expected_amount, bc.bank_transaction_id, bc.paid_amount, bc.notes,
		       bc.created_at, bc.updated_at,
		       COUNT(bct.transaction_id) as transaction_count
		FROM billing_cycles bc
		JOIN accounts a ON bc.account_id = a.id
		LEFT JOIN billing_cycle_transactions bct ON bc.id = bct.billing_cycle_id
		WHERE bc.id = ?
		GROUP BY bc.id
	`, id).Scan(
		&c.ID, &c.AccountID, &c.AccountName, &c.BillingDay,
		&c.CycleStartDate, &c.CycleEndDate, &c.ExpectedBillDate,
		&c.Status, &c.ExpectedAmount, &c.BankTransactionID, &c.PaidAmount, &c.Notes,
		&c.CreatedAt, &c.UpdatedAt, &c.TransactionCount,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) DeleteBillingCycle(id string) error {
	_, err := db.Exec("DELETE FROM billing_cycles WHERE id = ?", id)
	return err
}

func (db *DB) AutoAssignTransactionsToCycle(cycleID string) (int, error) {
	bc, err := db.GetBillingCycleByID(cycleID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch billing cycle: %w", err)
	}

	// Assign transactions for account_id that fall in cycle range AND match cycle's billing_day (if set) OR date range
	query := `
		INSERT OR IGNORE INTO billing_cycle_transactions (billing_cycle_id, transaction_id)
		SELECT ?, t.id
		FROM transactions t
		WHERE t.account_id = ?
		  AND t.id NOT IN (SELECT transaction_id FROM billing_cycle_transactions)
		  AND (
			(t.billing_date IS NOT NULL AND t.billing_date BETWEEN ? AND ?)
			OR (t.billing_date IS NULL AND t.date BETWEEN ? AND ?)
		  )
		  AND (t.billing_day IS NULL OR t.billing_day = ?)
	`
	res, err := db.Exec(query, cycleID, bc.AccountID, bc.CycleStartDate, bc.CycleEndDate, bc.CycleStartDate, bc.CycleEndDate, bc.BillingDay)
	if err != nil {
		return 0, fmt.Errorf("failed to auto-assign transactions: %w", err)
	}

	affected, _ := res.RowsAffected()

	// Update expected_amount for cycle
	if err := db.RecalculateCycleAmount(cycleID); err != nil {
		return int(affected), err
	}

	return int(affected), nil
}

func (db *DB) GetCycleTransactions(cycleID string) ([]models.Transaction, error) {
	rows, err := db.Query(`
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.billing_date, t.billing_day,
		       t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN billing_cycle_transactions bct ON t.id = bct.transaction_id
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE bct.billing_cycle_id = ?
		ORDER BY t.date ASC
	`, cycleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(
			&t.ID, &t.AccountID, &t.AccountName, &t.Date, &t.Amount, &t.Currency,
			&t.OriginalAmount, &t.OriginalCurrency, &t.BillingDate, &t.BillingDay,
			&t.CurrentInstallment, &t.TotalInstallments,
			&t.PayeeRaw, &t.PayeeCleaned, &t.CategoryID, &t.CategoryNameHE, &t.CategoryNameEN,
			&t.SuggestedCategoryHE, &t.SuggestedCategoryEN, &t.SuggestedCategoryType,
			&t.Notes, &t.ImportHash, &t.IsReviewed, &t.CategorizedBy, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		txs = append(txs, t)
	}
	return txs, nil
}

func (db *DB) RecalculateCycleAmount(cycleID string) error {
	_, err := db.Exec(`
		UPDATE billing_cycles
		SET expected_amount = (
			SELECT COALESCE(SUM(ABS(t.amount)), 0)
			FROM transactions t
			JOIN billing_cycle_transactions bct ON t.id = bct.transaction_id
			WHERE bct.billing_cycle_id = ?
		),
		updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, cycleID, cycleID)
	return err
}

func (db *DB) LinkBankPaymentToCycle(cycleID, bankTxID string) error {
	var bankAmount float64
	err := db.QueryRow("SELECT ABS(amount) FROM transactions WHERE id = ?", bankTxID).Scan(&bankAmount)
	if err != nil {
		return fmt.Errorf("bank transaction not found: %w", err)
	}

	bc, err := db.GetBillingCycleByID(cycleID)
	if err != nil {
		return fmt.Errorf("billing cycle not found: %w", err)
	}

	status := models.BillingCyclePaid
	if bc.ExpectedAmount != nil && *bc.ExpectedAmount > 0 && bankAmount < *bc.ExpectedAmount-0.01 {
		status = models.BillingCyclePartial
	}

	_, err = db.Exec(`
		UPDATE billing_cycles
		SET bank_transaction_id = ?, paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, bankTxID, bankAmount, status, cycleID)
	return err
}

func (db *DB) UnlinkBankPaymentFromCycle(cycleID string) error {
	_, err := db.Exec(`
		UPDATE billing_cycles
		SET bank_transaction_id = NULL, paid_amount = NULL, status = 'OPEN', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, cycleID)
	return err
}
