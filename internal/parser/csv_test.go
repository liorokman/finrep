package parser

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func TestStageCalCSVFile(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	db := database.New(sqlDB)
	defer db.Close()

	calCSVPath := filepath.Join("..", "..", "data", "cal.csv")
	rawBytes, err := os.ReadFile(calCSVPath)
	if err != nil {
		t.Fatalf("failed to read data/cal.csv: %v", err)
	}

	p := NewCSVParser(db)
	inspect, err := p.InspectCSV(rawBytes)
	if err != nil {
		t.Fatalf("InspectCSV failed: %v", err)
	}
	t.Logf("Inspect columns: %v, total rows: %d", inspect.Columns, inspect.TotalRows)

	amtCol := "Amount"
	payeeCol2 := "Extended Description"
	preset := &models.ImportPreset{
		HasHeader:    true,
		DateFormat:   "YYYY-MM-DD",
		DateColumn:   "Date",
		PayeeColumn:  "Description",
		PayeeColumn2: &payeeCol2,
		AmountColumn: &amtCol,
	}

	staged, err := p.StageCSV("test_account", rawBytes, preset)
	if err != nil {
		t.Fatalf("StageCSV failed: %v", err)
	}

	t.Logf("Passed: %d, Failed: %d, Duplicates: %d", staged.PassedCount, staged.FailedCount, staged.DuplicateCount)
	if len(staged.FailedRows) > 0 {
		for i, f := range staged.FailedRows {
			if i < 15 {
				t.Logf("Failed row %d (RowIndex %d): Reason '%s' | Raw: %v", i+1, f.RowIndex, f.Reason, f.RawRow)
			}
		}
	} else {
		for i, tx := range staged.PassedTransactions {
			if i < 5 {
				t.Logf("Tx [%d]: Date: %s | Amount: %.2f | PayeeRaw: %s", i+1, tx.Date, tx.Amount, tx.PayeeRaw)
			}
		}
	}
}

func TestZeroAmountRowStaging(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	db := database.New(sqlDB)
	defer db.Close()

	csvContent := `Date,Billing Date,Description,Extended Description,Amount,Currency,Billed Amount,Card Suffix,Provider
2024-06-28,2024-08-10,Google Pay 7405,Cibus Meal,76.00,ILS,0.00,7405,CAL
2024-06-29,2024-08-10,Next Online,Shopping,261.00,ILS,0.00,7405,CAL
`

	p := NewCSVParser(db)
	billedAmtCol := "Billed Amount"
	origAmtCol := "Amount"
	preset := &models.ImportPreset{
		HasHeader:            true,
		DateFormat:           "YYYY-MM-DD",
		DateColumn:           "Date",
		PayeeColumn:          "Description",
		AmountColumn:         &billedAmtCol,
		OriginalAmountColumn: &origAmtCol,
	}

	staged, err := p.StageCSV("acc_123", []byte(csvContent), preset)
	if err != nil {
		t.Fatalf("StageCSV failed: %v", err)
	}

	if staged.FailedCount != 0 {
		t.Fatalf("expected 0 failed rows for zero-amount transactions, got %d failed rows (reason: %v)", staged.FailedCount, staged.FailedRows)
	}

	if staged.PassedCount != 2 {
		t.Fatalf("expected 2 passed transactions, got %d", staged.PassedCount)
	}

	if staged.PassedTransactions[0].Amount != 0.0 {
		t.Errorf("expected amount 0.0, got %f", staged.PassedTransactions[0].Amount)
	}

	if staged.PassedTransactions[0].OriginalAmount == nil || *staged.PassedTransactions[0].OriginalAmount != 76.0 {
		t.Errorf("expected original amount 76.0, got %v", staged.PassedTransactions[0].OriginalAmount)
	}
}

func TestInBatchDuplicateOrdinals(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	db := database.New(sqlDB)
	defer db.Close()

	// CSV with 3 identical (Date, Payee, Amount) transactions on the same day
	csvContent := `Date,Description,Amount
2026-07-09,my cal עמלת טעינה,-2.90
2026-07-09,my cal עמלת טעינה,-2.90
2026-07-09,my cal עמלת טעינה,-2.90
`

	amtCol := "Amount"
	preset := &models.ImportPreset{
		HasHeader:    true,
		DateFormat:   "YYYY-MM-DD",
		DateColumn:   "Date",
		PayeeColumn:  "Description",
		AmountColumn: &amtCol,
	}

	p := NewCSVParser(db)
	staged, err := p.StageCSV("acc_dup_test", []byte(csvContent), preset)
	if err != nil {
		t.Fatalf("StageCSV failed: %v", err)
	}

	if staged.PassedCount != 3 {
		t.Fatalf("expected 3 passed transactions, got %d", staged.PassedCount)
	}

	h1 := staged.PassedTransactions[0].ImportHash
	h2 := staged.PassedTransactions[1].ImportHash
	h3 := staged.PassedTransactions[2].ImportHash

	if h1 == h2 || h2 == h3 || h1 == h3 {
		t.Fatalf("expected 3 distinct import hashes for identical in-batch rows, got h1=%s, h2=%s, h3=%s", h1, h2, h3)
	}
}

func TestCutoffDateFiltering(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	db := database.New(sqlDB)
	defer db.Close()

	csvContent := `Date,Billing Date,Description,Amount
2024-05-15,2024-05-10,Old Transaction,-100.00
2024-06-01,2024-06-10,June Transaction,-200.00
2024-07-04,2024-07-10,July Transaction,-300.00
`

	amtCol := "Amount"
	bDateCol := "Billing Date"
	cutoffStr := "2024-06"
	preset := &models.ImportPreset{
		HasHeader:         true,
		DateFormat:        "YYYY-MM-DD",
		DateColumn:        "Date",
		BillingDateColumn: &bDateCol,
		PayeeColumn:       "Description",
		AmountColumn:      &amtCol,
		CutoffDate:        &cutoffStr,
	}

	p := NewCSVParser(db)
	staged, err := p.StageCSV("acc_cutoff_test", []byte(csvContent), preset)
	if err != nil {
		t.Fatalf("StageCSV failed: %v", err)
	}

	if staged.PassedCount != 2 {
		t.Fatalf("expected 2 passed transactions after YYYY-MM cutoff '2024-06', got %d", staged.PassedCount)
	}
	if staged.PassedTransactions[0].PayeeRaw != "June Transaction" || staged.PassedTransactions[1].PayeeRaw != "July Transaction" {
		t.Errorf("unexpected staged transactions: %+v", staged.PassedTransactions)
	}
}
