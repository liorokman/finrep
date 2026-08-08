package database

import (
	"database/sql"
	"fmt"
	"log/slog"
)

type Migration struct {
	Version     int
	Description string
	SQL         string
}

var migrations = []Migration{
	{
		Version:     1,
		Description: "Initial schema creation",
		SQL: `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			description TEXT NOT NULL,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS exchange_rates (
			id TEXT PRIMARY KEY,
			rate_date DATE NOT NULL,
			from_currency TEXT NOT NULL,
			to_currency TEXT NOT NULL DEFAULT 'ILS',
			rate DECIMAL(14,6) NOT NULL,
			fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(rate_date, from_currency, to_currency)
		);

		CREATE TABLE IF NOT EXISTS accounts (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			account_type TEXT NOT NULL CHECK(account_type IN ('BANK', 'CREDIT_CARD')),
			institution TEXT NOT NULL,
			account_number_last4 TEXT,
			currency TEXT NOT NULL DEFAULT 'ILS',
			opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
			credit_limit DECIMAL(12,2) DEFAULT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS categories (
			id TEXT PRIMARY KEY,
			name_he TEXT NOT NULL,
			name_en TEXT NOT NULL,
			parent_id TEXT,
			color_hex TEXT NOT NULL DEFAULT '#3B82F6',
			icon TEXT NOT NULL DEFAULT 'tag',
			category_type TEXT NOT NULL CHECK(category_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
			monthly_budget DECIMAL(12,2) DEFAULT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS import_presets (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			account_id TEXT NOT NULL,
			date_column TEXT NOT NULL,
			date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
			amount_column TEXT,
			original_amount_column TEXT,
			original_currency_column TEXT,
			current_installment_column TEXT,
			total_installments_column TEXT,
			debit_column TEXT,
			credit_column TEXT,
			payee_column TEXT NOT NULL,
			category_column TEXT,
			notes_column TEXT,
			has_header BOOLEAN NOT NULL DEFAULT TRUE,
			FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS transactions (
			id TEXT PRIMARY KEY,
			account_id TEXT NOT NULL,
			date DATE NOT NULL,
			amount DECIMAL(12,2) NOT NULL,
			currency TEXT NOT NULL DEFAULT 'ILS',
			original_amount DECIMAL(12,2),
			original_currency TEXT,
			current_installment INT DEFAULT NULL,
			total_installments INT DEFAULT NULL,
			payee_raw TEXT NOT NULL,
			payee_cleaned TEXT,
			category_id TEXT,
			suggested_category_he TEXT DEFAULT NULL,
			suggested_category_en TEXT DEFAULT NULL,
			suggested_category_type TEXT DEFAULT NULL,
			notes TEXT,
			import_hash TEXT UNIQUE,
			is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
			categorized_by TEXT NOT NULL DEFAULT 'UNSET' CHECK(categorized_by IN ('UNSET', 'MANUAL', 'LOCALAI', 'RULE')),
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
			FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS transaction_splits (
			id TEXT PRIMARY KEY,
			transaction_id TEXT NOT NULL,
			category_id TEXT NOT NULL,
			amount DECIMAL(12,2) NOT NULL,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
			FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS account_transfers (
			id TEXT PRIMARY KEY,
			bank_transaction_id TEXT NOT NULL,
			credit_card_transaction_id TEXT NOT NULL UNIQUE,
			amount DECIMAL(12,2) NOT NULL,
			match_confidence REAL NOT NULL DEFAULT 1.0,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(bank_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
			FOREIGN KEY(credit_card_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
			UNIQUE(bank_transaction_id, credit_card_transaction_id)
		);

		CREATE TABLE IF NOT EXISTS categorization_rules (
			id TEXT PRIMARY KEY,
			pattern TEXT NOT NULL,
			category_id TEXT NOT NULL,
			priority INT NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
		CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
		CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
		CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(import_hash);
		CREATE INDEX IF NOT EXISTS idx_splits_tx ON transaction_splits(transaction_id);
		CREATE INDEX IF NOT EXISTS idx_transfers_bank ON account_transfers(bank_transaction_id);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_cc_unique ON account_transfers(credit_card_transaction_id);
		`,
	},
	{
		Version:     2,
		Description: "Seed default categories & initial settings",
		SQL: `
		INSERT OR IGNORE INTO settings (key, value) VALUES
			('localai_url', 'http://localhost:8080'),
			('localai_model', 'llama-3-8b'),
			('localai_api_key', ''),
			('base_currency', 'ILS');

		INSERT OR IGNORE INTO categories (id, name_he, name_en, color_hex, icon, category_type) VALUES
			('cat-groceries', 'קניות מזון', 'Groceries', '#10B981', 'shopping-cart', 'EXPENSE'),
			('cat-dining', 'מסעדות ובתי קפה', 'Dining & Cafes', '#F59E0B', 'utensils', 'EXPENSE'),
			('cat-utilities', 'חשבונות וביתו', 'Utilities & Housing', '#3B82F6', 'home', 'EXPENSE'),
			('cat-transport', 'תחבורה ודלק', 'Transport & Fuel', '#8B5CF6', 'car', 'EXPENSE'),
			('cat-health', 'בריאות ורפואה', 'Health & Medical', '#EC4899', 'activity', 'EXPENSE'),
			('cat-education', 'חינוך וחוגים', 'Education & Classes', '#06B6D4', 'book-open', 'EXPENSE'),
			('cat-entertainment', 'פנאי ובידור', 'Entertainment', '#6366F1', 'film', 'EXPENSE'),
			('cat-shopping', 'קניות וביגוד', 'Shopping & Apparel', '#F43F5E', 'shopping-bag', 'EXPENSE'),
			('cat-salary', 'משכורת', 'Salary', '#10B981', 'dollar-sign', 'INCOME'),
			('cat-investments', 'השקעות והכנסות', 'Investments', '#059669', 'trending-up', 'INCOME'),
			('cat-transfers', 'העברות בינעירוניות', 'Internal Transfers', '#64748B', 'repeat', 'TRANSFER');
		`,
	},
}

// RunMigrations applies all pending schema DDL migrations
func RunMigrations(db *sql.DB) error {
	// Create migrations table if not existing
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			description TEXT NOT NULL,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to ensure schema_migrations table: %w", err)
	}

	for _, m := range migrations {
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", m.Version).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration version %d: %w", m.Version, err)
		}

		if count == 0 {
			slog.Info("Applying migration", "version", m.Version, "description", m.Description)
			tx, err := db.Begin()
			if err != nil {
				return fmt.Errorf("failed to begin tx for migration %d: %w", m.Version, err)
			}

			if _, err := tx.Exec(m.SQL); err != nil {
				tx.Rollback()
				return fmt.Errorf("migration %d failed: %w", m.Version, err)
			}

			if _, err := tx.Exec("INSERT INTO schema_migrations (version, description) VALUES (?, ?)", m.Version, m.Description); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to record migration %d: %w", m.Version, err)
			}

			if err := tx.Commit(); err != nil {
				return fmt.Errorf("failed to commit migration %d: %w", m.Version, err)
			}
		}
	}

	return nil
}
