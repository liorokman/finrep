package models

import (
	"time"
)

type AccountType string

const (
	AccountTypeBank       AccountType = "BANK"
	AccountTypeCreditCard AccountType = "CREDIT_CARD"
)

type CategoryType string

const (
	CategoryTypeExpense  CategoryType = "EXPENSE"
	CategoryTypeIncome   CategoryType = "INCOME"
	CategoryTypeTransfer CategoryType = "TRANSFER"
)

type CategorizedBy string

const (
	CategorizedByUnset   CategorizedBy = "UNSET"
	CategorizedByManual  CategorizedBy = "MANUAL"
	CategorizedByLocalAI CategorizedBy = "LOCALAI"
	CategorizedByRule    CategorizedBy = "RULE"
)

type Account struct {
	ID                  string      `json:"id"`
	Name                string      `json:"name"`
	AccountType         AccountType `json:"account_type"`
	Institution         string      `json:"institution"`
	AccountNumberLast4  *string     `json:"account_number_last4,omitempty"`
	Currency            string      `json:"currency"`
	OpeningBalance      float64     `json:"opening_balance"`
	CreditLimit         *float64    `json:"credit_limit,omitempty"`
	BillingDayPrimary   *int        `json:"billing_day_primary,omitempty"`
	BillingDaySecondary *int        `json:"billing_day_secondary,omitempty"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`

	// Calculated fields
	CurrentBalance float64 `json:"current_balance,omitempty"`
}

type Category struct {
	ID            string       `json:"id"`
	NameHE        string       `json:"name_he"`
	NameEN        string       `json:"name_en"`
	ParentID      *string      `json:"parent_id,omitempty"`
	ColorHex      string       `json:"color_hex"`
	Icon          string       `json:"icon"`
	CategoryType  CategoryType `json:"category_type"`
	MonthlyBudget *float64     `json:"monthly_budget,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
}

type SuggestedCategory struct {
	NameHE       string       `json:"name_he"`
	NameEN       string       `json:"name_en"`
	CategoryType CategoryType `json:"category_type"`
}

type Transaction struct {
	ID                    string        `json:"id"`
	AccountID             string        `json:"account_id"`
	AccountName           string        `json:"account_name,omitempty"`
	Date                  string        `json:"date"` // YYYY-MM-DD
	Amount                float64       `json:"amount"`
	Currency              string        `json:"currency"`
	OriginalAmount        *float64      `json:"original_amount,omitempty"`
	OriginalCurrency      *string       `json:"original_currency,omitempty"`
	BillingDate           *string       `json:"billing_date,omitempty"` // YYYY-MM-DD
	BillingDay            *int          `json:"billing_day,omitempty"`
	CurrentInstallment    *int          `json:"current_installment,omitempty"`
	TotalInstallments     *int          `json:"total_installments,omitempty"`
	PayeeRaw              string        `json:"payee_raw"`
	PayeeCleaned          *string       `json:"payee_cleaned,omitempty"`
	CategoryID            *string       `json:"category_id,omitempty"`
	CategoryNameHE        *string       `json:"category_name_he,omitempty"`
	CategoryNameEN        *string       `json:"category_name_en,omitempty"`
	SuggestedCategoryHE   *string       `json:"suggested_category_he,omitempty"`
	SuggestedCategoryEN   *string       `json:"suggested_category_en,omitempty"`
	SuggestedCategoryType *string       `json:"suggested_category_type,omitempty"`
	Notes                 *string       `json:"notes,omitempty"`
	ImportHash            string        `json:"import_hash"`
	IsReviewed            bool          `json:"is_reviewed"`
	CategorizedBy         CategorizedBy `json:"categorized_by"`
	LinkedAccountID       *string       `json:"linked_account_id,omitempty"`
	CreatedAt             time.Time     `json:"created_at"`
	UpdatedAt             time.Time     `json:"updated_at"`

	Splits []TransactionSplit `json:"splits,omitempty"`
}

type TransactionSplit struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	CategoryID    string    `json:"category_id"`
	CategoryName  string    `json:"category_name,omitempty"`
	Amount        float64   `json:"amount"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type BillingCycleStatus string

const (
	BillingCycleOpen    BillingCycleStatus = "OPEN"
	BillingCycleBilled  BillingCycleStatus = "BILLED"
	BillingCyclePaid    BillingCycleStatus = "PAID"
	BillingCyclePartial BillingCycleStatus = "PARTIAL"
)

type BillingCycle struct {
	ID                string             `json:"id"`
	AccountID         string             `json:"account_id"`
	AccountName       string             `json:"account_name,omitempty"`
	BillingDay        int                `json:"billing_day"`
	CycleStartDate    string             `json:"cycle_start_date"`
	CycleEndDate      string             `json:"cycle_end_date"`
	ExpectedBillDate  string             `json:"expected_bill_date"`
	Status            BillingCycleStatus `json:"status"`
	ExpectedAmount    *float64           `json:"expected_amount,omitempty"`
	BankTransactionID *string            `json:"bank_transaction_id,omitempty"`
	PaidAmount        *float64           `json:"paid_amount,omitempty"`
	Notes             *string            `json:"notes,omitempty"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	TransactionCount  int                `json:"transaction_count,omitempty"`
}

type ImportPreset struct {
	ID                       string  `json:"id"`
	Name                     string  `json:"name"`
	AccountID                string  `json:"account_id"`
	DateColumn               string  `json:"date_column"`
	DateFormat               string  `json:"date_format"`
	BillingDateColumn        *string `json:"billing_date_column,omitempty"`
	AmountColumn             *string `json:"amount_column,omitempty"`
	OriginalAmountColumn     *string `json:"original_amount_column,omitempty"`
	OriginalCurrencyColumn   *string `json:"original_currency_column,omitempty"`
	CurrentInstallmentColumn *string `json:"current_installment_column,omitempty"`
	TotalInstallmentsColumn  *string `json:"total_installments_column,omitempty"`
	DebitColumn              *string `json:"debit_column,omitempty"`
	CreditColumn             *string `json:"credit_column,omitempty"`
	PayeeColumn              string  `json:"payee_column"`
	PayeeColumn2             *string `json:"payee_column_2,omitempty"`
	CategoryColumn           *string `json:"category_column,omitempty"`
	NotesColumn              *string `json:"notes_column,omitempty"`
	CutoffDate               *string `json:"cutoff_date,omitempty"`
	HasHeader                bool    `json:"has_header"`
}

type CategorizationRule struct {
	ID         string    `json:"id"`
	Pattern    string    `json:"pattern"`
	CategoryID string    `json:"category_id"`
	Priority   int       `json:"priority"`
	CreatedAt  time.Time `json:"created_at"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ExchangeRate struct {
	ID           string    `json:"id"`
	RateDate     string    `json:"rate_date"` // YYYY-MM-DD
	FromCurrency string    `json:"from_currency"`
	ToCurrency   string    `json:"to_currency"`
	Rate         float64   `json:"rate"`
	FetchedAt    time.Time `json:"fetched_at"`
}
