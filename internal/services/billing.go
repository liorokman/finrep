package services

import (
	"fmt"
	"time"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

type BillingService struct {
	db *database.DB
}

func NewBillingService(db *database.DB) *BillingService {
	return &BillingService{db: db}
}

// adjustToIsraeliWeekday adjusts Friday (5) and Saturday (6) to Sunday (0).
// In Israel, business days are Sunday through Thursday.
func adjustToIsraeliWeekday(d time.Time) time.Time {
	switch d.Weekday() {
	case time.Friday:
		return d.AddDate(0, 0, 2)
	case time.Saturday:
		return d.AddDate(0, 0, 1)
	default:
		return d
	}
}

// GenerateCycles auto-generates billing cycle records for a CC account across a month range (YYYY-MM to YYYY-MM).
func (s *BillingService) GenerateCycles(accountID, fromMonth, toMonth string) ([]models.BillingCycle, error) {
	acc, err := s.db.GetAccountByID(accountID)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	if acc.AccountType != models.AccountTypeCreditCard {
		return nil, fmt.Errorf("billing cycles can only be generated for CREDIT_CARD accounts")
	}

	daysToGenerate := []int{}
	if acc.BillingDayPrimary != nil && *acc.BillingDayPrimary > 0 {
		daysToGenerate = append(daysToGenerate, *acc.BillingDayPrimary)
	}
	if acc.BillingDaySecondary != nil && *acc.BillingDaySecondary > 0 && *acc.BillingDaySecondary != *acc.BillingDayPrimary {
		daysToGenerate = append(daysToGenerate, *acc.BillingDaySecondary)
	}

	if len(daysToGenerate) == 0 {
		return nil, fmt.Errorf("account has no billing days configured")
	}

	startT, err := time.Parse("2006-01", fromMonth)
	if err != nil {
		return nil, fmt.Errorf("invalid fromMonth '%s': %w", fromMonth, err)
	}
	endT, err := time.Parse("2006-01", toMonth)
	if err != nil {
		return nil, fmt.Errorf("invalid toMonth '%s': %w", toMonth, err)
	}

	if startT.After(endT) {
		startT, endT = endT, startT
	}

	var createdCycles []models.BillingCycle
	curr := startT

	for !curr.After(endT) {
		year := curr.Year()
		month := curr.Month()

		for _, bDay := range daysToGenerate {
			// Bill date in target month (clamped to max days in month)
			maxDays := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
			actualBDay := bDay
			if actualBDay > maxDays {
				actualBDay = maxDays
			}

			cycleEnd := time.Date(year, month, actualBDay, 0, 0, 0, 0, time.UTC)
			cycleStart := cycleEnd.AddDate(0, -1, 1) // Start day is day after previous month's billing day
			expectedBillDate := adjustToIsraeliWeekday(cycleEnd)

			cycleStartStr := cycleStart.Format("2006-01-02")
			cycleEndStr := cycleEnd.Format("2006-01-02")
			expectedBillStr := expectedBillDate.Format("2006-01-02")

			// Check if cycle already exists
			existing, _ := s.db.GetBillingCycles(accountID, "")
			exists := false
			for _, ex := range existing {
				if ex.BillingDay == bDay && ex.CycleStartDate == cycleStartStr && ex.CycleEndDate == cycleEndStr {
					exists = true
					break
				}
			}

			if !exists {
				bc := &models.BillingCycle{
					AccountID:        accountID,
					BillingDay:       bDay,
					CycleStartDate:   cycleStartStr,
					CycleEndDate:     cycleEndStr,
					ExpectedBillDate: expectedBillStr,
					Status:           models.BillingCycleOpen,
				}
				if err := s.db.CreateBillingCycle(bc); err == nil {
					// Auto assign matching transactions immediately
					s.db.AutoAssignTransactionsToCycle(bc.ID)
					if updated, errGet := s.db.GetBillingCycleByID(bc.ID); errGet == nil {
						createdCycles = append(createdCycles, *updated)
					}
				}
			}
		}

		curr = curr.AddDate(0, 1, 0)
	}

	return createdCycles, nil
}

// AutoPopulateCycle assigns unlinked CC transactions to cycle and recalculates total.
func (s *BillingService) AutoPopulateCycle(cycleID string) (int, error) {
	return s.db.AutoAssignTransactionsToCycle(cycleID)
}

// FindBankPaymentCandidates finds bank debit transactions near expected_bill_date (±10 days) with close amount.
func (s *BillingService) FindBankPaymentCandidates(cycleID string) ([]models.Transaction, error) {
	bc, err := s.db.GetBillingCycleByID(cycleID)
	if err != nil {
		return nil, fmt.Errorf("billing cycle not found: %w", err)
	}

	billDate, err := time.Parse("2006-01-02", bc.ExpectedBillDate)
	if err != nil {
		billDate = time.Now()
	}

	startDate := billDate.AddDate(0, 0, -10).Format("2006-01-02")
	endDate := billDate.AddDate(0, 0, 10).Format("2006-01-02")

	// Query BANK transactions that are negative (debits) and not yet assigned to any billing cycle
	rows, err := s.db.Query(`
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.billing_date, t.billing_day,
		       t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE a.account_type = 'BANK'
		  AND t.amount < 0
		  AND t.date BETWEEN ? AND ?
		  AND t.id NOT IN (
			SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL AND id != ?
		  )
		ORDER BY t.date ASC
	`, startDate, endDate, cycleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query bank payment candidates: %w", err)
	}
	defer rows.Close()

	var candidates []models.Transaction
	for rows.Next() {
		var tx models.Transaction
		if err := rows.Scan(
			&tx.ID, &tx.AccountID, &tx.AccountName, &tx.Date, &tx.Amount, &tx.Currency,
			&tx.OriginalAmount, &tx.OriginalCurrency, &tx.BillingDate, &tx.BillingDay,
			&tx.CurrentInstallment, &tx.TotalInstallments,
			&tx.PayeeRaw, &tx.PayeeCleaned, &tx.CategoryID, &tx.CategoryNameHE, &tx.CategoryNameEN,
			&tx.SuggestedCategoryHE, &tx.SuggestedCategoryEN, &tx.SuggestedCategoryType,
			&tx.Notes, &tx.ImportHash, &tx.IsReviewed, &tx.CategorizedBy, &tx.CreatedAt, &tx.UpdatedAt,
		); err != nil {
			return nil, err
		}
		candidates = append(candidates, tx)
	}

	return candidates, nil
}

// ReconcileCycle links a bank payment transaction to a billing cycle.
func (s *BillingService) ReconcileCycle(cycleID, bankTxID string) error {
	return s.db.LinkBankPaymentToCycle(cycleID, bankTxID)
}

// UnlinkCycle removes bank payment link from a billing cycle.
func (s *BillingService) UnlinkCycle(cycleID string) error {
	return s.db.UnlinkBankPaymentFromCycle(cycleID)
}
