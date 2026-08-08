package database_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func TestDatabaseAndMigrations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "finrep_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	sqlDB, err := database.InitDB(dbPath)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	defer sqlDB.Close()

	db := database.New(sqlDB)

	// Test Account Creation
	acc := &models.Account{
		Name:        "Test Bank",
		AccountType: models.AccountTypeBank,
		Institution: "Hapoalim",
		Currency:    "ILS",
	}
	if err := db.CreateAccount(acc); err != nil {
		t.Fatalf("CreateAccount failed: %v", err)
	}

	accounts, err := db.GetAccounts()
	if err != nil {
		t.Fatalf("GetAccounts failed: %v", err)
	}
	if len(accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(accounts))
	}

	// Test Transaction & Ordinal
	ord1, err := db.GetDailyOccurrenceOrdinal(acc.ID, "2026-08-07", -100.0, "Supermarket")
	if err != nil || ord1 != 1 {
		t.Fatalf("expected ordinal 1, got %d (err: %v)", ord1, err)
	}

	tx := &models.Transaction{
		AccountID: acc.ID,
		Date:      "2026-08-07",
		Amount:    -100.0,
		Currency:  "ILS",
		PayeeRaw:  "Supermarket",
		ImportHash: "hash-123",
	}
	if err := db.CreateTransaction(tx); err != nil {
		t.Fatalf("CreateTransaction failed: %v", err)
	}

	ord2, err := db.GetDailyOccurrenceOrdinal(acc.ID, "2026-08-07", -100.0, "Supermarket")
	if err != nil || ord2 != 2 {
		t.Fatalf("expected ordinal 2, got %d (err: %v)", ord2, err)
	}

	// Test AI Category Suggestion Acceptance
	heName := "חינוך וחוגים"
	enName := "Education & Classes"
	txWithSug := &models.Transaction{
		AccountID:             acc.ID,
		Date:                  "2026-08-07",
		Amount:                -250.0,
		Currency:              "ILS",
		PayeeRaw:              "Sports Summer Camp",
		SuggestedCategoryHE:   &heName,
		SuggestedCategoryEN:   &enName,
		SuggestedCategoryType: stringPtr(string(models.CategoryTypeExpense)),
		ImportHash:            "hash-456",
	}
	if err := db.CreateTransaction(txWithSug); err != nil {
		t.Fatalf("CreateTransaction with suggestion failed: %v", err)
	}

	newCat, err := db.AcceptCategorySuggestion(txWithSug.ID)
	if err != nil {
		t.Fatalf("AcceptCategorySuggestion failed: %v", err)
	}
	if newCat.NameEN != enName || newCat.NameHE != heName {
		t.Fatalf("unexpected new category names: %s / %s", newCat.NameHE, newCat.NameEN)
	}

	updatedTx, err := db.GetTransactionByID(txWithSug.ID)
	if err != nil {
		t.Fatalf("GetTransactionByID failed: %v", err)
	}
	if updatedTx.CategoryID == nil || *updatedTx.CategoryID != newCat.ID {
		t.Fatalf("expected transaction category_id %s, got %v", newCat.ID, updatedTx.CategoryID)
	}
	if !updatedTx.IsReviewed {
		t.Fatalf("expected transaction to be marked reviewed")
	}
}

func stringPtr(s string) *string {
	return &s
}
