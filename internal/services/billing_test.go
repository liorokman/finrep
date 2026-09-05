package services

import (
	"fmt"
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

// datePrefix normalizes DATE column values read back as RFC3339 timestamps
// (e.g. "2025-07-02T00:00:00Z") to plain "YYYY-MM-DD" for comparison.
func datePrefix(s string) string {
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}

func TestAutoMatchCCPaymentsPicksNearestBillDate(t *testing.T) {
	sqliteDB, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init in-memory DB: %v", err)
	}
	defer sqliteDB.Close()

	db := database.New(sqliteDB)
	bDay2 := 2
	bDay10 := 10
	ccAcc := &models.Account{
		ID:                  "acc-cc-match",
		Name:                "Card Two Cycles",
		AccountType:         models.AccountTypeCreditCard,
		Institution:         "CAL",
		BillingDayPrimary:   &bDay2,
		BillingDaySecondary: &bDay10,
	}
	if err := db.CreateAccount(ccAcc); err != nil {
		t.Fatalf("Failed to create CC account: %v", err)
	}
	bankAcc := &models.Account{
		ID:          "acc-bank-match",
		Name:        "Bank",
		AccountType: models.AccountTypeBank,
		Institution: "Leumi",
		Currency:    "ILS",
	}
	if err := db.CreateAccount(bankAcc); err != nil {
		t.Fatalf("Failed to create bank account: %v", err)
	}

	// Two CC charges with identical amounts, each pinned (via billing_day) to a
	// different cycle so the resulting cycles have the same expected_amount.
	if err := db.CreateTransaction(&models.Transaction{
		AccountID: ccAcc.ID, Date: "2025-06-15", Amount: -100.00, Currency: "ILS",
		PayeeRaw: "Store A", BillingDay: &bDay2, ImportHash: "h-tx-a",
	}); err != nil {
		t.Fatalf("Failed to create CC tx A: %v", err)
	}
	if err := db.CreateTransaction(&models.Transaction{
		AccountID: ccAcc.ID, Date: "2025-06-25", Amount: -100.00, Currency: "ILS",
		PayeeRaw: "Store B", BillingDay: &bDay10, ImportHash: "h-tx-b",
	}); err != nil {
		t.Fatalf("Failed to create CC tx B: %v", err)
	}

	// Bank debit one day after the day-2 cycle's expected bill date (2025-07-02)
	// and seven days before the day-10 cycle's (2025-07-10).
	bankTx := &models.Transaction{
		AccountID: bankAcc.ID, Date: "2025-07-03", Amount: -100.00, Currency: "ILS",
		PayeeRaw: "CC Payment", ImportHash: "h-bank-1",
	}
	if err := db.CreateTransaction(bankTx); err != nil {
		t.Fatalf("Failed to create bank tx: %v", err)
	}

	svc := NewBillingService(db)
	matched, err := svc.AutoMatchCCPayments()
	if err != nil {
		t.Fatalf("AutoMatchCCPayments failed: %v", err)
	}
	if matched < 1 {
		t.Fatalf("Expected at least 1 match, got %d", matched)
	}

	cycles, err := db.GetBillingCycles(ccAcc.ID, "")
	if err != nil {
		t.Fatalf("Failed to fetch cycles: %v", err)
	}

	linkedNear, linkedFar := false, false
	for _, c := range cycles {
		if c.BankTransactionID == nil || *c.BankTransactionID == "" {
			continue
		}
		if *c.BankTransactionID != bankTx.ID {
			continue
		}
		switch datePrefix(c.CycleEndDate) {
		case "2025-07-02": // expected bill 2025-07-02, 1 day from the debit
			linkedNear = true
		case "2025-07-10": // expected bill 2025-07-10, 7 days from the debit
			linkedFar = true
		}
	}

	if !linkedNear {
		t.Errorf("Expected bank debit to link to the cycle with the nearest expected bill date (2025-07-02)")
	}
	if linkedFar {
		t.Errorf("Bank debit was linked to the farther cycle (2025-07-10); expected nearest-bill-date cycle")
	}
}

func TestAutoMatchCCPaymentsDataDrivenCycleRange(t *testing.T) {
	sqliteDB, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("Failed to init in-memory DB: %v", err)
	}
	defer sqliteDB.Close()

	db := database.New(sqliteDB)
	bDay10 := 10
	ccAcc := &models.Account{
		ID:                "acc-cc-range",
		Name:              "Range Card",
		AccountType:       models.AccountTypeCreditCard,
		Institution:       "CAL",
		BillingDayPrimary: &bDay10,
	}
	if err := db.CreateAccount(ccAcc); err != nil {
		t.Fatalf("Failed to create CC account: %v", err)
	}

	// Transactions outside the previously hardcoded 2023-01..2026-12 window.
	for i, tx := range []models.Transaction{
		{AccountID: ccAcc.ID, Date: "2022-05-20", Amount: -50.00, Currency: "ILS", PayeeRaw: "Old Charge"},
		{AccountID: ccAcc.ID, Date: "2027-03-15", Amount: -70.00, Currency: "ILS", PayeeRaw: "Future Charge"},
	} {
		tx.ImportHash = fmt.Sprintf("h-range-%d", i)
		if err := db.CreateTransaction(&tx); err != nil {
			t.Fatalf("Failed to create CC tx %s: %v", tx.Date, err)
		}
	}

	svc := NewBillingService(db)
	if _, err := svc.AutoMatchCCPayments(); err != nil {
		t.Fatalf("AutoMatchCCPayments failed: %v", err)
	}

	cycles, err := db.GetBillingCycles(ccAcc.ID, "")
	if err != nil {
		t.Fatalf("Failed to fetch cycles: %v", err)
	}

	// The sqlite driver returns DATE columns as RFC3339 timestamps
	// (e.g. "2025-07-02T00:00:00Z"), so compare the date prefix only.
	hasOld, hasNew := false, false
	for _, c := range cycles {
		// Cycle ending 2022-06-10 (start 2022-05-11) covers the 2022-05-20 charge;
		// cycle ending 2027-04-10 (start 2027-03-11) covers the 2027-03-15 charge.
		if datePrefix(c.CycleStartDate) == "2022-05-11" {
			hasOld = true
			if c.ExpectedAmount == nil || *c.ExpectedAmount != 50.00 {
				t.Errorf("Old charge not populated into its cycle; expected_amount = %v", c.ExpectedAmount)
			}
		}
		if datePrefix(c.CycleStartDate) == "2027-03-11" {
			hasNew = true
			if c.ExpectedAmount == nil || *c.ExpectedAmount != 70.00 {
				t.Errorf("Future charge not populated into its cycle; expected_amount = %v", c.ExpectedAmount)
			}
		}
	}
	if !hasOld {
		t.Errorf("Expected a cycle starting 2022-05-11 for the pre-2023 charge")
	}
	if !hasNew {
		t.Errorf("Expected a cycle starting 2027-03-11 for the post-2026 charge")
	}
}
