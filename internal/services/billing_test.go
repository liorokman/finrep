package services

import (
	"testing"
	"time"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

func TestAdjustToIsraeliWeekday(t *testing.T) {
	// Friday 2025-06-13 -> Sunday 2025-06-15
	fri := time.Date(2025, 6, 13, 0, 0, 0, 0, time.UTC)
	adjFri := adjustToIsraeliWeekday(fri)
	if adjFri.Weekday() != time.Sunday || adjFri.Format("2006-01-02") != "2025-06-15" {
		t.Errorf("Expected Friday to adjust to Sunday 2025-06-15, got %s (%s)", adjFri.Format("2006-01-02"), adjFri.Weekday())
	}

	// Saturday 2025-06-14 -> Sunday 2025-06-15
	sat := time.Date(2025, 6, 14, 0, 0, 0, 0, time.UTC)
	adjSat := adjustToIsraeliWeekday(sat)
	if adjSat.Weekday() != time.Sunday || adjSat.Format("2006-01-02") != "2025-06-15" {
		t.Errorf("Expected Saturday to adjust to Sunday 2025-06-15, got %s (%s)", adjSat.Format("2006-01-02"), adjSat.Weekday())
	}

	// Thursday 2025-06-12 -> Thursday 2025-06-12
	thu := time.Date(2025, 6, 12, 0, 0, 0, 0, time.UTC)
	adjThu := adjustToIsraeliWeekday(thu)
	if adjThu.Format("2006-01-02") != "2025-06-12" {
		t.Errorf("Expected Thursday to remain 2025-06-12, got %s", adjThu.Format("2006-01-02"))
	}
}

func TestGenerateCycles(t *testing.T) {
	sqliteDB, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init in-memory DB: %v", err)
	}
	defer sqliteDB.Close()

	db := database.New(sqliteDB)
	bDay10 := 10
	bDay2 := 2
	ccAcc := &models.Account{
		ID:                  "acc-cc-1",
		Name:                "Cal Card",
		AccountType:         models.AccountTypeCreditCard,
		Institution:         "CAL",
		BillingDayPrimary:   &bDay10,
		BillingDaySecondary: &bDay2,
	}
	if err := db.CreateAccount(ccAcc); err != nil {
		t.Fatalf("Failed to create CC account: %v", err)
	}

	svc := NewBillingService(db)
	cycles, err := svc.GenerateCycles("acc-cc-1", "2025-06", "2025-07")
	if err != nil {
		t.Fatalf("Failed to generate cycles: %v", err)
	}

	if len(cycles) != 4 { // 2 billing days x 2 months
		t.Errorf("Expected 4 cycles generated, got %d", len(cycles))
	}
}
