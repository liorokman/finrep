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
		INSERT INTO transactions (id, account_id, date, amount, currency, payee_raw)
		VALUES ('tx1', ?, '2026-08-01', 5000.0, 'ILS', 'Salary'),
		       ('tx2', ?, '2026-08-05', -1500.0, 'ILS', 'Supermarket')
	`, acc.ID, acc.ID)
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
	nwPoints, err := svc.GetNetWorthTrend()
	if err != nil {
		t.Fatalf("GetNetWorthTrend failed: %v", err)
	}
	if len(nwPoints) == 0 {
		t.Errorf("expected at least 1 net worth point, got 0")
	}

	// Test Anomalies
	anoms, err := svc.GetAnomalies()
	if err != nil {
		t.Fatalf("GetAnomalies failed: %v", err)
	}
	if len(anoms) != 2 {
		t.Errorf("expected 2 anomalies for transactions with ABS(amount) > 1000, got %d", len(anoms))
	}
}
