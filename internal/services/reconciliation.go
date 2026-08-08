package services

import (
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
)

type ReconciliationService struct {
	db *database.DB
}

func NewReconciliationService(db *database.DB) *ReconciliationService {
	return &ReconciliationService{db: db}
}

type ReconciliationCandidateGroup struct {
	BankTransaction        models.Transaction   `json:"bank_transaction"`
	CandidateCCTransactions []models.Transaction `json:"candidate_cc_transactions"`
	TotalCCAmount          float64              `json:"total_cc_amount"`
	IsExactMatch           bool                 `json:"is_exact_match"`
}

// FindReconciliationCandidates locates credit card debits matching a bank statement lump-sum debit
func (s *ReconciliationService) FindReconciliationCandidates(bankTxID string) (*ReconciliationCandidateGroup, error) {
	bankTx, err := s.db.GetTransactionByID(bankTxID)
	if err != nil {
		return nil, fmt.Errorf("bank transaction not found: %w", err)
	}

	targetAmount := math.Abs(bankTx.Amount)

	// Fetch un-reconciled credit card transactions around bank debit date (+/- 35 days)
	t, err := time.Parse("2006-01-02", bankTx.Date)
	if err != nil {
		t = time.Now()
	}
	startDate := t.AddDate(0, 0, -35).Format("2006-01-02")
	endDate := t.AddDate(0, 0, 10).Format("2006-01-02")

	rows, err := s.db.Query(`
		SELECT t.id, t.account_id, a.name as account_name, t.date, t.amount, t.currency,
		       t.original_amount, t.original_currency, t.current_installment, t.total_installments,
		       t.payee_raw, t.payee_cleaned, t.category_id, c.name_he, c.name_en,
		       t.suggested_category_he, t.suggested_category_en, t.suggested_category_type,
		       t.notes, t.import_hash, t.is_reviewed, t.categorized_by, t.created_at, t.updated_at
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		LEFT JOIN account_transfers tr ON t.id = tr.credit_card_transaction_id
		WHERE a.account_type = 'CREDIT_CARD'
		  AND tr.id IS NULL
		  AND t.date BETWEEN ? AND ?
		ORDER BY t.date ASC
	`, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query CC candidates: %w", err)
	}
	defer rows.Close()

	var ccTxs []models.Transaction
	var sumCC float64
	for rows.Next() {
		var tx models.Transaction
		if err := rows.Scan(
			&tx.ID, &tx.AccountID, &tx.AccountName, &tx.Date, &tx.Amount, &tx.Currency,
			&tx.OriginalAmount, &tx.OriginalCurrency, &tx.CurrentInstallment, &tx.TotalInstallments,
			&tx.PayeeRaw, &tx.PayeeCleaned, &tx.CategoryID, &tx.CategoryNameHE, &tx.CategoryNameEN,
			&tx.SuggestedCategoryHE, &tx.SuggestedCategoryEN, &tx.SuggestedCategoryType,
			&tx.Notes, &tx.ImportHash, &tx.IsReviewed, &tx.CategorizedBy, &tx.CreatedAt, &tx.UpdatedAt,
		); err != nil {
			return nil, err
		}
		ccTxs = append(ccTxs, tx)
		sumCC += math.Abs(tx.Amount)
	}

	isExact := math.Abs(sumCC-targetAmount) < 0.01

	return &ReconciliationCandidateGroup{
		BankTransaction:        *bankTx,
		CandidateCCTransactions: ccTxs,
		TotalCCAmount:          sumCC,
		IsExactMatch:           isExact,
	}, nil
}

// ReconcileLumpSum links 1 Bank debit to multiple Credit Card transactions
func (s *ReconciliationService) ReconcileLumpSum(bankTxID string, ccTxIDs []string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}

	for _, ccID := range ccTxIDs {
		// Fetch amount
		var ccAmount float64
		if err := tx.QueryRow("SELECT amount FROM transactions WHERE id = ?", ccID).Scan(&ccAmount); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to fetch CC transaction %s: %w", ccID, err)
		}

		transferID := uuid.New().String()
		_, err := tx.Exec(`
			INSERT INTO account_transfers (id, bank_transaction_id, credit_card_transaction_id, amount, match_confidence)
			VALUES (?, ?, ?, ?, 1.0)
		`, transferID, bankTxID, ccID, math.Abs(ccAmount))
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("reconciliation failed for CC tx %s: %w", ccID, err)
		}
	}

	return tx.Commit()
}
