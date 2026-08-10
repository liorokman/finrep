package parser

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/database"
	"github.com/liorokman/finrep/internal/models"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

type CSVParser struct {
	db *database.DB
}

func NewCSVParser(db *database.DB) *CSVParser {
	return &CSVParser{db: db}
}

// DecodeToUTF8 converts Windows-1255 / CP1255 or raw bytes to UTF-8
func DecodeToUTF8(data []byte) ([]byte, error) {
	// Simple heuristic: if valid UTF-8, use directly; otherwise decode Windows-1255
	if isUTF8(data) {
		return data, nil
	}

	reader := transform.NewReader(bytes.NewReader(data), charmap.Windows1255.NewDecoder())
	utf8Bytes, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode Windows-1255: %w", err)
	}
	return utf8Bytes, nil
}

func isUTF8(data []byte) bool {
	// Check for non-ASCII bytes that fit UTF-8 multibyte sequence
	for i := 0; i < len(data); {
		if data[i] < 0x80 {
			i++
			continue
		}
		if data[i] >= 0xC0 && data[i] <= 0xDF {
			if i+1 >= len(data) || (data[i+1]&0xC0) != 0x80 {
				return false
			}
			i += 2
		} else if data[i] >= 0xE0 && data[i] <= 0xEF {
			if i+2 >= len(data) || (data[i+1]&0xC0) != 0x80 || (data[i+2]&0xC0) != 0x80 {
				return false
			}
			i += 3
		} else {
			return false
		}
	}
	return true
}

type InspectResult struct {
	Columns    []string   `json:"columns"`
	SampleRows [][]string `json:"sample_rows"`
	TotalRows  int        `json:"total_rows"`
}

type StagingFailedRow struct {
	RowIndex int      `json:"row_index"`
	RawRow   []string `json:"raw_row"`
	Reason   string   `json:"reason"`
}

type StagingResult struct {
	PassedTransactions []models.Transaction `json:"passed_transactions"`
	FailedRows         []StagingFailedRow   `json:"failed_rows"`
	PassedCount        int                  `json:"passed_count"`
	FailedCount        int                  `json:"failed_count"`
	DuplicateCount     int                  `json:"duplicate_count"`
}

// InspectCSV decodes CSV and extracts column headers and up to 10 sample rows
func (p *CSVParser) InspectCSV(rawBytes []byte) (*InspectResult, error) {
	utf8Bytes, err := DecodeToUTF8(rawBytes)
	if err != nil {
		return nil, err
	}

	r := csv.NewReader(bytes.NewReader(utf8Bytes))
	r.LazyQuotes = true
	r.FieldsPerRecord = -1

	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV: %w", err)
	}

	if len(rows) == 0 {
		return &InspectResult{Columns: []string{}, SampleRows: [][]string{}, TotalRows: 0}, nil
	}

	columns := rows[0]
	var sampleRows [][]string
	for i := 1; i < len(rows) && i <= 10; i++ {
		sampleRows = append(sampleRows, rows[i])
	}

	return &InspectResult{
		Columns:    columns,
		SampleRows: sampleRows,
		TotalRows:  len(rows) - 1,
	}, nil
}

// StageCSV validates all rows against column mappings and returns passed and failed items
func (p *CSVParser) StageCSV(accountID string, rawBytes []byte, preset *models.ImportPreset) (*StagingResult, error) {
	utf8Bytes, err := DecodeToUTF8(rawBytes)
	if err != nil {
		return nil, err
	}

	r := csv.NewReader(bytes.NewReader(utf8Bytes))
	r.LazyQuotes = true
	r.FieldsPerRecord = -1

	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSV rows: %w", err)
	}

	if len(rows) == 0 {
		return &StagingResult{
			PassedTransactions: []models.Transaction{},
			FailedRows:         []StagingFailedRow{},
		}, nil
	}

	headerMap := make(map[string]int)
	startIndex := 0
	if preset.HasHeader && len(rows) > 0 {
		startIndex = 1
		for i, h := range rows[0] {
			cleanH := strings.TrimSpace(strings.ToLower(h))
			headerMap[cleanH] = i
		}
	}

	var passedTxs []models.Transaction
	var failedRows []StagingFailedRow
	duplicateCount := 0
	batchOccurrences := make(map[string]int)

	for idx := startIndex; idx < len(rows); idx++ {
		row := rows[idx]
		if len(row) == 0 {
			continue
		}

		dateStr := getColumnValue(row, headerMap, preset.DateColumn)
		payeeRaw := getPayeeValue(row, headerMap, preset)

		if dateStr == "" {
			failedRows = append(failedRows, StagingFailedRow{
				RowIndex: idx, RawRow: row, Reason: "Missing Date value",
			})
			continue
		}
		if payeeRaw == "" {
			failedRows = append(failedRows, StagingFailedRow{
				RowIndex: idx, RawRow: row, Reason: "Missing Payee/Description value",
			})
			continue
		}

		formattedDate, err := parseDate(dateStr, preset.DateFormat)
		if err != nil {
			failedRows = append(failedRows, StagingFailedRow{
				RowIndex: idx, RawRow: row, Reason: fmt.Sprintf("Invalid date format '%s'", dateStr),
			})
			continue
		}

		amount, validAmount := parseAmountAndValid(row, headerMap, preset)
		if !validAmount {
			failedRows = append(failedRows, StagingFailedRow{
				RowIndex: idx, RawRow: row, Reason: "Missing or invalid Amount value",
			})
			continue
		}

		// Extract Original Amount and Currency if mapped
		var origAmount *float64
		var origCurrency *string
		if preset.OriginalAmountColumn != nil && *preset.OriginalAmountColumn != "" {
			if valStr := getColumnValue(row, headerMap, *preset.OriginalAmountColumn); valStr != "" {
				if val, err := parseCleanFloat(valStr); err == nil {
					origAmount = &val
				}
			}
		}
		if preset.OriginalCurrencyColumn != nil && *preset.OriginalCurrencyColumn != "" {
			if currStr := getColumnValue(row, headerMap, *preset.OriginalCurrencyColumn); currStr != "" {
				origCurrency = &currStr
			}
		}

		// Extract Billing Date and Billing Day
		var billingDate *string
		var billingDay *int
		if preset.BillingDateColumn != nil && *preset.BillingDateColumn != "" {
			if bDateStr := getColumnValue(row, headerMap, *preset.BillingDateColumn); bDateStr != "" {
				if formattedBDate, err := parseDate(bDateStr, preset.DateFormat); err == nil {
					billingDate = &formattedBDate
					if t, err := time.Parse("2006-01-02", formattedBDate); err == nil {
						day := t.Day()
						billingDay = &day
					}
				}
			}
		}

		// Check Cutoff Date against billing date (or transaction date if billing date is unmapped)
		if preset.CutoffDate != nil && *preset.CutoffDate != "" {
			cutoff := strings.TrimSpace(*preset.CutoffDate)
			checkDate := formattedDate
			if billingDate != nil && *billingDate != "" {
				checkDate = *billingDate
			}
			targetDate := checkDate
			targetCutoff := cutoff
			if len(targetCutoff) == 7 && len(targetDate) >= 7 {
				targetDate = targetDate[:7]
			}
			if targetDate < targetCutoff {
				continue
			}
		}

		// Fallback to Account's primary billing day if billingDay is unmapped
		if billingDay == nil {
			if acc, err := p.db.GetAccountByID(accountID); err == nil && acc.BillingDayPrimary != nil {
				billingDay = acc.BillingDayPrimary
			}
		}

		// Extract Installments
		currInst, totalInst := parseInstallments(row, headerMap, payeeRaw, preset)

		dbOrd, err := p.db.GetDailyOccurrenceOrdinal(accountID, formattedDate, amount, payeeRaw)
		if err != nil {
			dbOrd = 1
		}

		batchKey := fmt.Sprintf("%s|%s|%.2f|%s", accountID, formattedDate, amount, payeeRaw)
		batchOccurrences[batchKey]++
		ord := dbOrd + (batchOccurrences[batchKey] - 1)

		hash := database.GenerateImportHash(accountID, formattedDate, amount, payeeRaw, ord)

		tx := models.Transaction{
			AccountID:          accountID,
			Date:               formattedDate,
			Amount:             amount,
			Currency:           "ILS",
			OriginalAmount:     origAmount,
			OriginalCurrency:   origCurrency,
			BillingDate:        billingDate,
			BillingDay:         billingDay,
			PayeeRaw:           payeeRaw,
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			ImportHash:         hash,
			IsReviewed:         false,
			CategorizedBy:      models.CategorizedByUnset,
		}

		passedTxs = append(passedTxs, tx)
	}

	return &StagingResult{
		PassedTransactions: passedTxs,
		FailedRows:         failedRows,
		PassedCount:        len(passedTxs),
		FailedCount:        len(failedRows),
		DuplicateCount:     duplicateCount,
	}, nil
}

// ParseCSV parses raw CSV data into models.Transaction items using the provided ImportPreset
func (p *CSVParser) ParseCSV(accountID string, rawBytes []byte, preset *models.ImportPreset) ([]models.Transaction, int, error) {
	staged, err := p.StageCSV(accountID, rawBytes, preset)
	if err != nil {
		return nil, 0, err
	}
	return staged.PassedTransactions, staged.DuplicateCount, nil
}

func getPayeeValue(row []string, headerMap map[string]int, preset *models.ImportPreset) string {
	var parts []string

	// Primary column (supports multi-column names delimited by '+' or ',')
	if preset.PayeeColumn != "" {
		cols := strings.FieldsFunc(preset.PayeeColumn, func(r rune) bool {
			return r == '+' || r == ','
		})
		for _, col := range cols {
			val := getColumnValue(row, headerMap, strings.TrimSpace(col))
			if val != "" {
				parts = append(parts, val)
			}
		}
	}

	// Optional secondary column
	if preset.PayeeColumn2 != nil && *preset.PayeeColumn2 != "" {
		val2 := getColumnValue(row, headerMap, *preset.PayeeColumn2)
		if val2 != "" {
			parts = append(parts, val2)
		}
	}

	return strings.Join(parts, " - ")
}

func getColumnValue(row []string, headerMap map[string]int, colName string) string {
	if colName == "" {
		return ""
	}
	cleanCol := strings.TrimSpace(strings.ToLower(colName))
	if idx, ok := headerMap[cleanCol]; ok && idx < len(row) {
		return strings.TrimSpace(row[idx])
	}
	// Fallback if colName is numeric index string
	if idx, err := strconv.Atoi(colName); err == nil && idx >= 0 && idx < len(row) {
		return strings.TrimSpace(row[idx])
	}
	return ""
}

func parseDate(s, format string) (string, error) {
	s = strings.TrimSpace(s)
	formats := []string{
		"02/01/2006", "02/01/06", "2006-01-02", "02-01-2006", "02.01.2006",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t.Format("2006-01-02"), nil
		}
	}
	return "", fmt.Errorf("unrecognized date format: %s", s)
}

func parseCleanFloat(s string) (float64, error) {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "₪", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "€", "")
	if s == "" {
		return 0.0, fmt.Errorf("empty string")
	}
	return strconv.ParseFloat(s, 64)
}

func parseAmountAndValid(row []string, headerMap map[string]int, preset *models.ImportPreset) (float64, bool) {
	if preset.AmountColumn != nil && *preset.AmountColumn != "" {
		valStr := getColumnValue(row, headerMap, *preset.AmountColumn)
		val, err := parseCleanFloat(valStr)
		if err == nil {
			return val, true
		}
	}

	debitStr := ""
	creditStr := ""
	if preset.DebitColumn != nil && *preset.DebitColumn != "" {
		debitStr = getColumnValue(row, headerMap, *preset.DebitColumn)
	}
	if preset.CreditColumn != nil && *preset.CreditColumn != "" {
		creditStr = getColumnValue(row, headerMap, *preset.CreditColumn)
	}

	if debitStr != "" || creditStr != "" {
		debit, errD := parseCleanFloat(debitStr)
		credit, errC := parseCleanFloat(creditStr)

		if errD == nil && debit != 0 {
			return -mathAbs(debit), true
		}
		if errC == nil && credit != 0 {
			return mathAbs(credit), true
		}
		if errD == nil || errC == nil {
			return 0.0, true
		}
	}

	if preset.OriginalAmountColumn != nil && *preset.OriginalAmountColumn != "" {
		origStr := getColumnValue(row, headerMap, *preset.OriginalAmountColumn)
		if _, err := parseCleanFloat(origStr); err == nil {
			return 0.0, true
		}
	}

	return 0.0, false
}

func parseAmount(row []string, headerMap map[string]int, preset *models.ImportPreset) float64 {
	amt, _ := parseAmountAndValid(row, headerMap, preset)
	return amt
}

func cleanFloat(s string) float64 {
	f, _ := parseCleanFloat(s)
	return f
}

func mathAbs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

var instRegex = regexp.MustCompile(`תשלום\s+(\d+)\s+מתוך\s+(\d+)`)

func parseInstallments(row []string, headerMap map[string]int, payeeRaw string, preset *models.ImportPreset) (*int, *int) {
	if preset.CurrentInstallmentColumn != nil && preset.TotalInstallmentsColumn != nil {
		cStr := getColumnValue(row, headerMap, *preset.CurrentInstallmentColumn)
		tStr := getColumnValue(row, headerMap, *preset.TotalInstallmentsColumn)
		c, errC := strconv.Atoi(cStr)
		t, errT := strconv.Atoi(tStr)
		if errC == nil && errT == nil {
			return &c, &t
		}
	}

	// Regex search in payee text ("תשלום 2 מתוך 12")
	matches := instRegex.FindStringSubmatch(payeeRaw)
	if len(matches) == 3 {
		c, _ := strconv.Atoi(matches[1])
		t, _ := strconv.Atoi(matches[2])
		return &c, &t
	}

	return nil, nil
}
