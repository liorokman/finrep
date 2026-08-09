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
