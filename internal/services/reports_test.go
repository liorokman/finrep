package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func setupTestDB(t *testing.T) *database.DB {
	tmpDir, err := os.MkdirTemp("", "finrep_reports_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tmpDir) })

	dbPath := filepath.Join(tmpDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to connect db: %v", err)
	}
	return database.New(sqlDB)
}

func TestReportService_NewReports(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	svc := NewReportService(db)

	// Create test account
	acc := &models.Account{
		ID:             "acc-123",
		Name:           "Main Bank",
		AccountType:    "BANK",
		Institution:    "Hapoalim",
		Currency:       "ILS",
		OpeningBalance: 10000.0,
	}
	if err := db.CreateAccount(acc); err != nil {
		t.Fatalf("failed to create account: %v", err)
	}

	// Insert test transactions
	_, err := db.Exec(`
		INSERT INTO transactions (id, account_id, date, amount, currency, payee_raw, category_id)
		VALUES ('tx1', ?, '2026-08-01', 5000.0, 'ILS', 'Salary', 'cat-salary'),
		       ('tx2', ?, '2026-08-02', -100.0, 'ILS', 'Small Grocery 1', 'cat-groceries'),
		       ('tx3', ?, '2026-08-03', -100.0, 'ILS', 'Small Grocery 2', 'cat-groceries'),
		       ('tx4', ?, '2026-08-05', -1500.0, 'ILS', 'Supermarket Spike', 'cat-groceries')
	`, acc.ID, acc.ID, acc.ID, acc.ID)
	if err != nil {
		t.Fatalf("failed to insert transactions: %v", err)
	}

	// Test Sankey flow
	links, err := svc.GetSankeyFlow()
	if err != nil {
		t.Fatalf("GetSankeyFlow failed: %v", err)
	}
	_ = links

	// Test MoM Heatmap
	rows, err := svc.GetMoMHeatmap("", "", "")
	if err != nil {
		t.Fatalf("GetMoMHeatmap failed: %v", err)
	}
	_ = rows

	// Test Net Worth Trend
	nwPoints, err := svc.GetNetWorthTrend("", "")
	if err != nil {
		t.Fatalf("GetNetWorthTrend failed: %v", err)
	}
	if len(nwPoints) == 0 {
		t.Errorf("expected at least 1 net worth point, got 0")
	}

	// Test Anomalies (tx4 at 1500 > 2x average 566.67 for cat-groceries)
	anoms, err := svc.GetAnomalies()
	if err != nil {
		t.Fatalf("GetAnomalies failed: %v", err)
	}
	if len(anoms) != 1 {
		t.Errorf("expected 1 anomaly (> 2x category average), got %d", len(anoms))
	}
}
