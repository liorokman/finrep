package parser

import (
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func TestCSVParser_IsraeliInstallments(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)

	acc := &models.Account{
		Name:           "Max Card",
		AccountType:    models.AccountTypeCreditCard,
		Institution:    "Max",
		Currency:       "ILS",
		OpeningBalance: 0,
	}
	if err := db.CreateAccount(acc); err != nil {
		t.Fatalf("failed to create account: %v", err)
	}

	csvData := []byte("תאריך,תיאור,סכום\n2026-08-01,Supermarket תשלום 2 מתוך 12,-150.00\n")
	preset := &models.ImportPreset{
		DateColumn:  "תאריך",
		PayeeColumn: "תיאור",
		AmountColumn: func() *string { s := "סכום"; return &s }(),
		HasHeader:   true,
	}

	p := NewCSVParser(db)
	txs, dupes, err := p.ParseCSV(acc.ID, csvData, preset)
	if err != nil {
		t.Fatalf("ParseCSV failed: %v", err)
	}
	if dupes != 0 {
		t.Errorf("expected 0 dupes, got %d", dupes)
	}
	if len(txs) != 1 {
		t.Fatalf("expected 1 transaction, got %d", len(txs))
	}

	tx := txs[0]
	if tx.CurrentInstallment == nil || *tx.CurrentInstallment != 2 {
		t.Errorf("expected current_installment 2, got %v", tx.CurrentInstallment)
	}
	if tx.TotalInstallments == nil || *tx.TotalInstallments != 12 {
		t.Errorf("expected total_installments 12, got %v", tx.TotalInstallments)
	}
}
