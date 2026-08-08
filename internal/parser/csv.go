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

// ParseCSV parses raw CSV data into models.Transaction items using the provided ImportPreset
func (p *CSVParser) ParseCSV(accountID string, rawBytes []byte, preset *models.ImportPreset) ([]models.Transaction, int, error) {
	utf8Bytes, err := DecodeToUTF8(rawBytes)
	if err != nil {
		return nil, 0, err
	}

	r := csv.NewReader(bytes.NewReader(utf8Bytes))
	r.LazyQuotes = true
	r.FieldsPerRecord = -1

	rows, err := r.ReadAll()
	if err != nil {
		return nil, 0, fmt.Errorf("failed to parse CSV rows: %w", err)
	}

	if len(rows) == 0 {
		return nil, 0, nil
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

	var parsedTxs []models.Transaction
	duplicates := 0

	for idx := startIndex; idx < len(rows); idx++ {
		row := rows[idx]
		if len(row) == 0 {
			continue
		}

		dateStr := getColumnValue(row, headerMap, preset.DateColumn)
		payeeRaw := getColumnValue(row, headerMap, preset.PayeeColumn)

		if dateStr == "" || payeeRaw == "" {
			continue
		}

		formattedDate, err := parseDate(dateStr, preset.DateFormat)
		if err != nil {
			continue
		}

		amount := parseAmount(row, headerMap, preset)
		if amount == 0.0 {
			continue
		}

		// Extract Installment numbers ("תשלומים")
		currInst, totalInst := parseInstallments(row, headerMap, payeeRaw, preset)

		// Ordinal calculation for import hash
		ord, err := p.db.GetDailyOccurrenceOrdinal(accountID, formattedDate, amount, payeeRaw)
		if err != nil {
			ord = 1
		}

		hash := database.GenerateImportHash(accountID, formattedDate, amount, payeeRaw, ord)

		tx := models.Transaction{
			AccountID:          accountID,
			Date:               formattedDate,
			Amount:             amount,
			Currency:           "ILS",
			PayeeRaw:           payeeRaw,
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			ImportHash:         hash,
			IsReviewed:         false,
			CategorizedBy:      models.CategorizedByUnset,
		}

		parsedTxs = append(parsedTxs, tx)
	}

	return parsedTxs, duplicates, nil
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

func parseAmount(row []string, headerMap map[string]int, preset *models.ImportPreset) float64 {
	if preset.AmountColumn != nil && *preset.AmountColumn != "" {
		valStr := getColumnValue(row, headerMap, *preset.AmountColumn)
		return cleanFloat(valStr)
	}

	debitStr := ""
	creditStr := ""
	if preset.DebitColumn != nil {
		debitStr = getColumnValue(row, headerMap, *preset.DebitColumn)
	}
	if preset.CreditColumn != nil {
		creditStr = getColumnValue(row, headerMap, *preset.CreditColumn)
	}

	debit := cleanFloat(debitStr)
	credit := cleanFloat(creditStr)

	if debit != 0 {
		return -mathAbs(debit)
	}
	if credit != 0 {
		return mathAbs(credit)
	}
	return 0.0
}

func cleanFloat(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "₪", "")
	s = strings.ReplaceAll(s, "$", "")
	f, _ := strconv.ParseFloat(s, 64)
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
