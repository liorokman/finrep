package services

import (
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func TestReconciliationService_LumpSum(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test_recon.db")

	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to init db: %v", err)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)

	bankAcc := &models.Account{Name: "Main Bank", AccountType: models.AccountTypeBank, Institution: "Leumi", Currency: "ILS"}
	ccAcc := &models.Account{Name: "Max Card", AccountType: models.AccountTypeCreditCard, Institution: "Max", Currency: "ILS"}
	_ = db.CreateAccount(bankAcc)
	_ = db.CreateAccount(ccAcc)

	bankTx := &models.Transaction{
		AccountID:  bankAcc.ID,
		Date:       "2026-08-02",
		Amount:     -300.00,
		Currency:   "ILS",
		PayeeRaw:   "MAX ITURIM DEBIT",
		ImportHash: "hash-bank-1",
	}
	_ = db.CreateTransaction(bankTx)

	ccTx1 := &models.Transaction{
		AccountID:  ccAcc.ID,
		Date:       "2026-07-15",
		Amount:     -100.00,
		Currency:   "ILS",
		PayeeRaw:   "Store A",
		ImportHash: "hash-cc-1",
	}
	ccTx2 := &models.Transaction{
		AccountID:  ccAcc.ID,
		Date:       "2026-07-20",
		Amount:     -200.00,
		Currency:   "ILS",
		PayeeRaw:   "Store B",
		ImportHash: "hash-cc-2",
	}
	_ = db.CreateTransaction(ccTx1)
	_ = db.CreateTransaction(ccTx2)

	svc := NewReconciliationService(db)
	err = svc.ReconcileLumpSum(bankTx.ID, []string{ccTx1.ID, ccTx2.ID})
	if err != nil {
		t.Fatalf("ReconcileLumpSum failed: %v", err)
	}
}
