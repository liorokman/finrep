package services

import (
	"math"
	"time"

	"github.com/liorokman/finrep/internal/database"
)

type ReportService struct {
	db *database.DB
}

func NewReportService(db *database.DB) *ReportService {
	return &ReportService{db: db}
}

type NetWorthPoint struct {
	Date             string  `json:"date"`
	TotalAssets      float64 `json:"total_assets"`
	TotalLiabilities float64 `json:"total_liabilities"`
	NetWorth         float64 `json:"net_worth"`
}

type CashFlowPoint struct {
	Month       string  `json:"month"` // YYYY-MM
	Income      float64 `json:"income"`
	Expenses    float64 `json:"expenses"`
	NetSavings  float64 `json:"net_savings"`
	SavingsRate float64 `json:"savings_rate"`
}

type CategoryDonutItem struct {
	CategoryID   string  `json:"category_id"`
	CategoryName string  `json:"category_name"`
	ColorHex     string  `json:"color_hex"`
	TotalAmount  float64 `json:"total_amount"`
	Percentage   float64 `json:"percentage"`
}

type BudgetVsActualItem struct {
	CategoryID    string  `json:"category_id"`
	CategoryName  string  `json:"category_name"`
	MonthlyBudget float64 `json:"monthly_budget"`
	ActualSpent   float64 `json:"actual_spent"`
	Variance      float64 `json:"variance"`
}

type SubscriptionItem struct {
	Payee          string  `json:"payee"`
	CategoryName   string  `json:"category_name"`
	MonthlyCost    float64 `json:"monthly_cost"`
	OccurrenceCount int    `json:"occurrence_count"`
	IsFixed        bool    `json:"is_fixed"`
}

type MoMCell struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type MoMRow struct {
	CategoryName string    `json:"category_name"`
	ColorHex     string    `json:"color_hex"`
	Months       []MoMCell `json:"months"`
}

type CCPayoffItem struct {
	Month           string  `json:"month"`
	InstallmentCost float64 `json:"installment_cost"`
}

type SankeyLink struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Value  float64 `json:"value"`
}

type ForeignCurrencyItem struct {
	OriginalCurrency string  `json:"original_currency"`
	OriginalTotal    float64 `json:"original_total"`
	ILSBilledTotal   float64 `json:"ils_billed_total"`
	ImpliedAvgRate   float64 `json:"implied_avg_rate"`
}

type AnomalyItem struct {
	TransactionID string  `json:"transaction_id"`
	Date          string  `json:"date"`
	Payee         string  `json:"payee"`
	Amount        float64 `json:"amount"`
	Reason        string  `json:"reason"`
}

func (s *ReportService) GetNetWorthTrend(startDate, endDate string) ([]NetWorthPoint, error) {
	// Get all accounts and their opening balances
	accounts, err := s.db.GetAccounts()
	if err != nil {
		return nil, err
	}

	var openingAssets, openingLiabilities float64
	for _, a := range accounts {
		if a.AccountType == "BANK" {
			openingAssets += a.OpeningBalance
		} else if a.AccountType == "CREDIT_CARD" {
			openingLiabilities += math.Abs(a.OpeningBalance)
		}
	}

	// Get monthly net flow per account type
	rows, err := s.db.Query(`
		SELECT strftime('%Y-%m', t.date) as month,
		       SUM(CASE WHEN a.account_type = 'BANK' AND t.amount >= 0 THEN t.amount ELSE 0 END) as bank_in,
		       SUM(CASE WHEN a.account_type = 'BANK' AND t.amount < 0 THEN t.amount ELSE 0 END) as bank_out,
		       SUM(CASE WHEN a.account_type = 'CREDIT_CARD' THEN t.amount ELSE 0 END) as cc_flow,
		       SUM(CASE WHEN a.account_type = 'BANK' AND t.linked_account_id IS NOT NULL AND t.linked_account_id != 'EXTERNAL' THEN ABS(t.amount) ELSE 0 END) as cc_payments
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		GROUP BY month
		ORDER BY month ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []NetWorthPoint
	runningAssets := openingAssets
	runningLiabilities := openingLiabilities

	for rows.Next() {
		var month string
		var bankIn, bankOut, ccFlow, ccPayments float64
		if err := rows.Scan(&month, &bankIn, &bankOut, &ccFlow, &ccPayments); err != nil {
			return nil, err
		}
		runningAssets += bankIn + bankOut // bankOut is already negative
		// CC spending (ccFlow negative) increases liabilities. Assigned bank payments (ccPayments positive) settle liabilities.
		runningLiabilities += -ccFlow - ccPayments
		if runningLiabilities < 0 {
			runningLiabilities = 0
		}
		points = append(points, NetWorthPoint{
			Date:             month,
			TotalAssets:      runningAssets,
			TotalLiabilities: runningLiabilities,
			NetWorth:         runningAssets - runningLiabilities,
		})
	}

	// If no historical data, fall back to current snapshot
	if len(points) == 0 {
		var totalAssets, totalLiabilities float64
		for _, a := range accounts {
			if a.AccountType == "BANK" {
				totalAssets += a.CurrentBalance
			} else if a.AccountType == "CREDIT_CARD" {
				totalLiabilities += math.Abs(a.CurrentBalance)
			}
		}
		return []NetWorthPoint{{
			Date:             time.Now().Format("2006-01"),
			TotalAssets:      totalAssets,
			TotalLiabilities: totalLiabilities,
			NetWorth:         totalAssets - totalLiabilities,
		}}, nil
	}

	if startDate != "" || endDate != "" {
		var filteredPoints []NetWorthPoint
		for _, p := range points {
			if startDate != "" && p.Date < startDate {
				continue
			}
			if endDate != "" && p.Date > endDate {
				continue
			}
			filteredPoints = append(filteredPoints, p)
		}
		if len(filteredPoints) > 0 {
			return filteredPoints, nil
		}
	}

	return points, nil
}

func (s *ReportService) GetCashFlowSummary(accountID, startDate, endDate string) ([]CashFlowPoint, error) {
	query := `
		SELECT strftime('%Y-%m', date) as month,
		       SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
		       SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
		FROM transactions
		WHERE 1=1
		  AND (linked_account_id IS NULL OR linked_account_id = 'EXTERNAL')
		  AND id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
	`
	var args []interface{}
	if accountID != "" {
		query += " AND account_id = ?"
		args = append(args, accountID)
	}
	if startDate != "" {
		if len(startDate) == 7 {
			query += " AND strftime('%Y-%m', date) >= ?"
			args = append(args, startDate)
		} else {
			query += " AND date >= ?"
			args = append(args, startDate)
		}
	}
	if endDate != "" {
		if len(endDate) == 7 {
			query += " AND strftime('%Y-%m', date) <= ?"
			args = append(args, endDate)
		} else {
			query += " AND date <= ?"
			args = append(args, endDate)
		}
	}
	query += " GROUP BY month ORDER BY month ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []CashFlowPoint
	for rows.Next() {
		var p CashFlowPoint
		if err := rows.Scan(&p.Month, &p.Income, &p.Expenses); err != nil {
			return nil, err
		}
		p.NetSavings = p.Income - p.Expenses
		if p.Income > 0 {
			p.SavingsRate = (p.NetSavings / p.Income) * 100
		}
		points = append(points, p)
	}
	return points, nil
}

func (s *ReportService) GetCategoryDonut(accountID, startDate, endDate string) ([]CategoryDonutItem, error) {
	query := `
		SELECT c.id, c.name_en, c.color_hex, SUM(ABS(t.amount)) as total
		FROM transactions t
		JOIN categories c ON t.category_id = c.id
		WHERE t.amount < 0
		  AND (t.linked_account_id IS NULL OR t.linked_account_id = 'EXTERNAL')
		  AND t.id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
	`
	var args []interface{}
	if accountID != "" {
		query += " AND t.account_id = ?"
		args = append(args, accountID)
	}
	if startDate != "" {
		if len(startDate) == 7 {
			query += " AND strftime('%Y-%m', t.date) >= ?"
			args = append(args, startDate)
		} else {
			query += " AND t.date >= ?"
			args = append(args, startDate)
		}
	}
	if endDate != "" {
		if len(endDate) == 7 {
			query += " AND strftime('%Y-%m', t.date) <= ?"
			args = append(args, endDate)
		} else {
			query += " AND t.date <= ?"
			args = append(args, endDate)
		}
	}
	query += " GROUP BY c.id ORDER BY total DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CategoryDonutItem
	var grandTotal float64
	for rows.Next() {
		var item CategoryDonutItem
		if err := rows.Scan(&item.CategoryID, &item.CategoryName, &item.ColorHex, &item.TotalAmount); err != nil {
			return nil, err
		}
		grandTotal += item.TotalAmount
		items = append(items, item)
	}

	if grandTotal > 0 {
		for i := range items {
			items[i].Percentage = (items[i].TotalAmount / grandTotal) * 100
		}
	}
	return items, nil
}

func (s *ReportService) GetBudgetVsActual(accountID, month string) ([]BudgetVsActualItem, error) {
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	query := `
		SELECT c.id, c.name_en, COALESCE(c.monthly_budget, 0), COALESCE(SUM(ABS(t.amount)), 0)
		FROM categories c
		LEFT JOIN transactions t ON c.id = t.category_id AND t.amount < 0
		  AND (t.linked_account_id IS NULL OR t.linked_account_id = 'EXTERNAL')
		  AND t.id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
		  AND strftime('%Y-%m', t.date) = ?
	`
	args := []interface{}{month}
	if accountID != "" {
		query += " AND t.account_id = ?"
		args = append(args, accountID)
	}
	query += " WHERE c.category_type = 'EXPENSE' GROUP BY c.id ORDER BY c.name_en ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []BudgetVsActualItem
	for rows.Next() {
		var item BudgetVsActualItem
		if err := rows.Scan(&item.CategoryID, &item.CategoryName, &item.MonthlyBudget, &item.ActualSpent); err != nil {
			return nil, err
		}
		item.Variance = item.MonthlyBudget - item.ActualSpent
		items = append(items, item)
	}
	return items, nil
}

func (s *ReportService) GetSubscriptions(accountID string) ([]SubscriptionItem, error) {
	query := `
		SELECT t.payee_raw, COALESCE(c.name_en, 'General'), AVG(ABS(t.amount)), COUNT(*)
		FROM transactions t
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.amount < 0
		  AND (t.linked_account_id IS NULL OR t.linked_account_id = 'EXTERNAL')
		  AND t.id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
	`
	var args []interface{}
	if accountID != "" {
		query += " AND t.account_id = ?"
		args = append(args, accountID)
	}
	query += " GROUP BY t.payee_raw HAVING COUNT(*) >= 2 ORDER BY AVG(ABS(t.amount)) DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []SubscriptionItem
	for rows.Next() {
		var item SubscriptionItem
		if err := rows.Scan(&item.Payee, &item.CategoryName, &item.MonthlyCost, &item.OccurrenceCount); err != nil {
			return nil, err
		}
		item.IsFixed = true
		items = append(items, item)
	}
	return items, nil
}

func (s *ReportService) GetCCPayoffForecast(accountID string) ([]CCPayoffItem, error) {
	query := `
		SELECT strftime('%Y-%m', date) as month, SUM(ABS(amount))
		FROM transactions
		WHERE current_installment IS NOT NULL AND total_installments IS NOT NULL
	`
	var args []interface{}
	if accountID != "" {
		query += " AND account_id = ?"
		args = append(args, accountID)
	}
	query += " GROUP BY month ORDER BY month ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CCPayoffItem
	for rows.Next() {
		var item CCPayoffItem
		if err := rows.Scan(&item.Month, &item.InstallmentCost); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *ReportService) GetForeignCurrencyReport() ([]ForeignCurrencyItem, error) {
	rows, err := s.db.Query(`
		SELECT original_currency, SUM(ABS(original_amount)), SUM(ABS(amount))
		FROM transactions
		WHERE original_currency IS NOT NULL AND original_currency != 'ILS' AND original_amount IS NOT NULL
		GROUP BY original_currency
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ForeignCurrencyItem
	for rows.Next() {
		var item ForeignCurrencyItem
		if err := rows.Scan(&item.OriginalCurrency, &item.OriginalTotal, &item.ILSBilledTotal); err != nil {
			return nil, err
		}
		if item.OriginalTotal > 0 {
			item.ImpliedAvgRate = item.ILSBilledTotal / item.OriginalTotal
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *ReportService) GetAnomalies() ([]AnomalyItem, error) {
	rows, err := s.db.Query(`
		SELECT id, date, payee_raw, ABS(amount)
		FROM transactions
		WHERE amount < 0
		  AND (linked_account_id IS NULL OR linked_account_id = 'EXTERNAL')
		  AND id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
		  AND ABS(amount) > 1000
		ORDER BY date DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AnomalyItem
	for rows.Next() {
		var item AnomalyItem
		if err := rows.Scan(&item.TransactionID, &item.Date, &item.Payee, &item.Amount); err != nil {
			return nil, err
		}
		item.Reason = "Unusually high transaction amount (> ₪1,000)"
		items = append(items, item)
	}
	return items, nil
}

// GetMoMHeatmap returns a category × months spending matrix for specified month range
func (s *ReportService) GetMoMHeatmap(accountID, startDate, endDate string) ([]MoMRow, error) {
	now := time.Now()
	var startMonth, endMonth time.Time
	var err error

	// Determine end month (default current month)
	if endDate != "" {
		if len(endDate) == 7 { // YYYY-MM
			endMonth, err = time.Parse("2006-01", endDate)
		} else if len(endDate) >= 10 { // YYYY-MM-DD
			endMonth, err = time.Parse("2006-01-02", endDate)
		}
	}
	if err != nil || endMonth.IsZero() {
		endMonth = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	} else {
		endMonth = time.Date(endMonth.Year(), endMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	// Determine start month (default 5 months before endMonth = 6 months total)
	if startDate != "" {
		if len(startDate) == 7 { // YYYY-MM
			startMonth, err = time.Parse("2006-01", startDate)
		} else if len(startDate) >= 10 { // YYYY-MM-DD
			startMonth, err = time.Parse("2006-01-02", startDate)
		}
	}
	if err != nil || startMonth.IsZero() {
		startMonth = endMonth.AddDate(0, -5, 0)
	} else {
		startMonth = time.Date(startMonth.Year(), startMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	// Ensure startMonth <= endMonth
	if startMonth.After(endMonth) {
		startMonth, endMonth = endMonth, startMonth
	}

	// Limit range to max 24 months to avoid extreme UI overhead
	var months []string
	curr := startMonth
	count := 0
	for !curr.After(endMonth) && count < 24 {
		months = append(months, curr.Format("2006-01"))
		curr = curr.AddDate(0, 1, 0)
		count++
	}

	if len(months) == 0 {
		months = []string{now.Format("2006-01")}
	}

	query := `
		SELECT c.name_en, c.color_hex,
		       strftime('%Y-%m', t.date) as month,
		       SUM(ABS(t.amount)) as total
		FROM transactions t
		JOIN categories c ON t.category_id = c.id
		WHERE t.amount < 0
		  AND (t.linked_account_id IS NULL OR t.linked_account_id = 'EXTERNAL')
		  AND t.id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
		  AND strftime('%Y-%m', t.date) >= ?
		  AND strftime('%Y-%m', t.date) <= ?
	`
	args := []interface{}{months[0], months[len(months)-1]}
	if accountID != "" {
		query += " AND t.account_id = ?"
		args = append(args, accountID)
	}
	query += " GROUP BY c.name_en, month ORDER BY c.name_en ASC, month ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rowMap := make(map[string]*MoMRow)
	rowOrder := []string{}

	for rows.Next() {
		var catName, colorHex, month string
		var total float64
		if err := rows.Scan(&catName, &colorHex, &month, &total); err != nil {
			return nil, err
		}
		if _, exists := rowMap[catName]; !exists {
			cells := make([]MoMCell, len(months))
			for i, m := range months {
				cells[i] = MoMCell{Month: m, Amount: 0}
			}
			rowMap[catName] = &MoMRow{
				CategoryName: catName,
				ColorHex:     colorHex,
				Months:       cells,
			}
			rowOrder = append(rowOrder, catName)
		}
		for i, m := range months {
			if m == month {
				rowMap[catName].Months[i].Amount = total
				break
			}
		}
	}

	result := make([]MoMRow, 0, len(rowOrder))
	for _, k := range rowOrder {
		result = append(result, *rowMap[k])
	}
	return result, nil
}

// GetSankeyFlow returns income-source → account → expense-category flow links for current month
func (s *ReportService) GetSankeyFlow() ([]SankeyLink, error) {
	var links []SankeyLink

	// Income sources → accounts (positive transactions)
	rows, err := s.db.Query(`
		SELECT COALESCE(c.name_en, 'Uncategorized Income') as source,
		       a.name as target,
		       SUM(t.amount) as value
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.amount > 0
		  AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
		GROUP BY source, target
		HAVING value > 0
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var link SankeyLink
		if err := rows.Scan(&link.Source, &link.Target, &link.Value); err != nil {
			return nil, err
		}
		links = append(links, link)
	}

	// Accounts → expense categories (negative transactions)
	rows2, err := s.db.Query(`
		SELECT a.name as source,
		       COALESCE(c.name_en, 'Uncategorized') as target,
		       SUM(ABS(t.amount)) as value
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.amount < 0
		  AND (t.linked_account_id IS NULL OR t.linked_account_id = 'EXTERNAL')
		  AND t.id NOT IN (SELECT bank_transaction_id FROM billing_cycles WHERE bank_transaction_id IS NOT NULL)
		  AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
		GROUP BY source, target
		HAVING value > 0
	`)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()

	for rows2.Next() {
		var link SankeyLink
		if err := rows2.Scan(&link.Source, &link.Target, &link.Value); err != nil {
			return nil, err
		}
		links = append(links, link)
	}

	return links, nil
}
