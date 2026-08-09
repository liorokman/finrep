package ccpdf

// ParsedTransaction represents a single transaction parsed from a credit card / bank PDF statement
type ParsedTransaction struct {
	Date               string  `json:"date"`                // YYYY-MM-DD (transaction date)
	BillingDate        string  `json:"billing_date"`        // YYYY-MM-DD (billing date)
	Payee              string  `json:"payee"`               // Merchant/description
	ExtendedDetail     string  `json:"extended_detail"`     // Extra details / location / category notes
	Amount             float64 `json:"amount"`              // Signed amount in original currency
	Currency           string  `json:"currency"`            // ILS, USD, EUR, etc.
	BilledAmount       float64 `json:"billed_amount"`       // Signed amount billed in ILS
	CurrentInstallment int     `json:"current_installment"` // e.g., 2
	TotalInstallments  int     `json:"total_installments"`  // e.g., 12
	CardSuffix         string  `json:"card_suffix"`         // Last 4 digits of card
	Provider           string  `json:"provider"`            // ISRACARD, CAL, LEUMI
}
