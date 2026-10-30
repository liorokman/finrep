package store

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"strings"
	"testing"
)

func openTemp(t *testing.T) *Store {
	t.Helper()
	s, err := Open(context.Background(), filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func mustExec(t *testing.T, s *Store, q string, args ...any) {
	t.Helper()
	if _, err := s.Exec(q, args...); err != nil {
		t.Fatalf("%s: %v", q, err)
	}
}

func wantErr(t *testing.T, s *Store, contains string, q string, args ...any) {
	t.Helper()
	_, err := s.Exec(q, args...)
	if err == nil {
		t.Fatalf("expected error containing %q for: %s", contains, q)
	}
	if !strings.Contains(err.Error(), contains) {
		t.Fatalf("error %q does not contain %q", err, contains)
	}
}

func seedAccount(t *testing.T, s *Store, id, typ string) {
	t.Helper()
	mustExec(t, s, `INSERT INTO accounts (id, name, account_type, institution) VALUES (?, ?, ?, 'X')`, id, id, typ)
}

const insertTx = `INSERT INTO transactions (id, account_id, import_key, date, amount_minor, payee_raw) VALUES (?, ?, ?, ?, ?, 'p')`

func TestMigrateIdempotentAndVersioned(t *testing.T) {
	path := filepath.Join(t.TempDir(), "t.db")
	ctx := context.Background()
	s, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Migrate(ctx); err != nil { // second run is a no-op
		t.Fatal(err)
	}
	var v int
	if err := s.QueryRow(`SELECT MAX(version) FROM schema_migrations`).Scan(&v); err != nil || v != 4 {
		t.Fatalf("version = %d, %v", v, err)
	}
	mustExec(t, s, `INSERT INTO schema_migrations (version, name) VALUES (99, 'future')`)
	s.Close()
	if _, err := Open(ctx, path); err == nil || !strings.Contains(err.Error(), "newer") {
		t.Fatalf("expected newer-schema refusal, got %v", err)
	}
}

func TestForeignKeysEnforced(t *testing.T) {
	s := openTemp(t)
	wantErr(t, s, "FOREIGN KEY", insertTx, "t1", "missing-account", "k1", "2024-01-01", -100)
}

func TestDateFloor2023(t *testing.T) {
	s := openTemp(t)
	seedAccount(t, s, "a", "BANK")
	wantErr(t, s, "CHECK", insertTx, "t1", "a", "k1", "2022-12-31", -100)
	mustExec(t, s, insertTx, "t2", "a", "k2", "2023-01-01", -100)
	wantErr(t, s, "CHECK", `INSERT INTO statements (id, account_id, bill_date) VALUES ('s', 'a', '2022-12-10')`)
}

func TestImportKeyUnique(t *testing.T) {
	s := openTemp(t)
	seedAccount(t, s, "a", "BANK")
	mustExec(t, s, insertTx, "t1", "a", "same", "2024-01-01", -100)
	wantErr(t, s, "UNIQUE", insertTx, "t2", "a", "same", "2024-01-01", -100)
}

func TestEmployerCoverageRules(t *testing.T) {
	s := openTemp(t)
	seedAccount(t, s, "c", "CREDIT_CARD")
	mustExec(t, s, insertTx, "p", "c", "k1", "2026-06-20", -90290)
	// Coverage must be a positive amount.
	wantErr(t, s, "CHECK", `INSERT INTO transactions (id, account_id, import_key, date, amount_minor, payee_raw, kind, covers_transaction_id)
		VALUES ('cv', 'c', 'k2', '2026-06-20', -77076, 'p', 'EMPLOYER_COVERAGE', 'p')`)
	mustExec(t, s, `INSERT INTO transactions (id, account_id, import_key, date, amount_minor, payee_raw, kind, covers_transaction_id)
		VALUES ('cv', 'c', 'k2', '2026-06-20', 77076, 'p', 'EMPLOYER_COVERAGE', 'p')`)
	// Only coverage lines may reference a covered purchase.
	wantErr(t, s, "CHECK", `INSERT INTO transactions (id, account_id, import_key, date, amount_minor, payee_raw, covers_transaction_id)
		VALUES ('x', 'c', 'k3', '2026-06-20', -100, 'p', 'p')`)
}

func TestBillingRuleConstraints(t *testing.T) {
	s := openTemp(t)
	seedAccount(t, s, "c", "CREDIT_CARD")
	mustExec(t, s, `INSERT INTO billing_rules (id, account_id, scope, bill_day, month_offset, cutoff_day) VALUES ('r1', 'c', 'LOCAL', 10, 0, 10)`)
	wantErr(t, s, "UNIQUE", `INSERT INTO billing_rules (id, account_id, scope, bill_day) VALUES ('r2', 'c', 'LOCAL', 10)`)
	wantErr(t, s, "CHECK", `INSERT INTO billing_rules (id, account_id, scope, bill_day) VALUES ('r3', 'c', 'FOREIGN', 32)`)
	wantErr(t, s, "CHECK", `INSERT INTO billing_rules (id, account_id, scope, bill_day) VALUES ('r4', 'c', 'BOTH', 10)`)
}

func TestSettlementManyToManyAndCascade(t *testing.T) {
	s := openTemp(t)
	seedAccount(t, s, "bank", "BANK")
	seedAccount(t, s, "card", "CREDIT_CARD")
	mustExec(t, s, insertTx, "d1", "bank", "k1", "2026-07-10", -250000)
	mustExec(t, s, insertTx, "d2", "bank", "k2", "2026-07-10", -150000)
	mustExec(t, s, `INSERT INTO statements (id, account_id, bill_date) VALUES ('st', 'card', '2026-07-10')`)
	// Two debits can settle one statement (partial payments).
	mustExec(t, s, `INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES ('s1', 'st', 'd1', 250000, 'MANUAL')`)
	mustExec(t, s, `INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES ('s2', 'st', 'd2', 150000, 'AUTO')`)
	wantErr(t, s, "UNIQUE", `INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES ('s3', 'st', 'd1', 1, 'MANUAL')`)
	wantErr(t, s, "CHECK", `INSERT INTO settlements (id, statement_id, bank_transaction_id, amount_minor, source) VALUES ('s4', 'st', 'd1', 0, 'MANUAL')`)
	// Deleting the statement removes its settlements.
	mustExec(t, s, `DELETE FROM statements WHERE id = 'st'`)
	var n int
	if err := s.QueryRow(`SELECT COUNT(*) FROM settlements`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("settlements left = %d, %v", n, err)
	}
}

func TestCategoryNameUniqueCaseInsensitive(t *testing.T) {
	s := openTemp(t)
	mustExec(t, s, `INSERT INTO categories (id, name_he, name_en, category_type) VALUES ('c1', 'מסעדות', 'Restaurants', 'EXPENSE')`)
	wantErr(t, s, "UNIQUE", `INSERT INTO categories (id, name_he, name_en, category_type) VALUES ('c2', 'אחר', 'restaurants', 'EXPENSE')`)
}

func TestWithTxRollbackAndCommit(t *testing.T) {
	s := openTemp(t)
	ctx := context.Background()
	sentinel := errors.New("boom")
	err := s.WithTx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`INSERT INTO settings (key, value) VALUES ('a', '1')`); err != nil {
			return err
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("got %v", err)
	}
	var n int
	s.QueryRow(`SELECT COUNT(*) FROM settings`).Scan(&n)
	if n != 0 {
		t.Fatalf("rollback failed: %d rows", n)
	}
	if err := s.WithTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.Exec(`INSERT INTO settings (key, value) VALUES ('a', '1')`)
		return err
	}); err != nil {
		t.Fatal(err)
	}
	s.QueryRow(`SELECT COUNT(*) FROM settings`).Scan(&n)
	if n != 1 {
		t.Fatalf("commit failed: %d rows", n)
	}
}

func TestWithTxPanicRollsBack(t *testing.T) {
	s := openTemp(t)
	func() {
		defer func() { recover() }()
		_ = s.WithTx(context.Background(), func(tx *sql.Tx) error {
			tx.Exec(`INSERT INTO settings (key, value) VALUES ('p', '1')`)
			panic("x")
		})
	}()
	var n int
	s.QueryRow(`SELECT COUNT(*) FROM settings`).Scan(&n)
	if n != 0 {
		t.Fatalf("panic did not roll back: %d rows", n)
	}
}

func TestMigrationsConsecutive(t *testing.T) {
	if _, err := loadMigrations(); err != nil {
		t.Fatal(err)
	}
}
