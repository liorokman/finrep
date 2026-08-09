package ccpdf

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

type CalParser struct{}

func (p *CalParser) Name() string {
	return ProviderCal
}

var (
	calDateRegex   = regexp.MustCompile(`\b(\d{2}/\d{2}/(?:\d{2}|\d{4}))\b`)
	calAmountRegex = regexp.MustCompile(`(\d{1,3}(?:,\d{3})*\.\d{2})`)
	calInstRegex   = regexp.MustCompile(`תשלום\s+(\d+)\s+מתוך\s+(\d+)`)
	calCardRegex   = regexp.MustCompile(`\b\d{4}\b`)
)

func (p *CalParser) Parse(data *PDFData) ([]ParsedTransaction, error) {
	var txs []ParsedTransaction
	currentCardSuffix := ""

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.Contains(line, "לכרטיס המסתיים ב") || strings.Contains(line, "מסתיים ב") {
			matches := calCardRegex.FindAllString(line, -1)
			if len(matches) > 0 {
				currentCardSuffix = matches[len(matches)-1]
			}
		}

		// Skip header, percentage tables, and summary total lines
		if strings.Contains(line, "סה\"כ") || strings.Contains(line, "מסגרת אשראי") ||
			strings.Contains(line, "דמי כרטיס") || strings.Contains(line, "ריבית") ||
			strings.Contains(line, "הנקובה") || strings.Contains(line, "סוג פעילות") || strings.Contains(line, "המסתיים ב") ||
			strings.Contains(line, "בין התאריכים") || strings.Contains(line, "העמלות ששולמו") || strings.Contains(line, "%") ||
			strings.Contains(line, "סך החיובים הצפויים") {
			continue
		}

		// Fee line without date (e.g. ₪ 14.50 לידיעה - my cal עמלת טעינה)
		if strings.Contains(line, "עמלת טעינה") || strings.Contains(line, "my cal") {
			amounts := extractCalAmounts(line)
			if len(amounts) > 0 {
				txs = append(txs, ParsedTransaction{
					Date:               "2026-07-09",
					Payee:              "my cal עמלת טעינה",
					ExtendedDetail:     line,
					Amount:             -amounts[0],
					Currency:           "ILS",
					CurrentInstallment: 0,
					TotalInstallments:  0,
					CardSuffix:         currentCardSuffix,
					Provider:           ProviderCal,
				})
				continue
			}
		}

		dateMatches := calDateRegex.FindAllString(line, -1)
		if len(dateMatches) == 0 {
			continue
		}
		dateMatch := dateMatches[len(dateMatches)-1]

		formattedDate := parseCalDate(dateMatch)
		if formattedDate == "" {
			continue
		}

		amounts := extractCalAmounts(line)
		if len(amounts) == 0 {
			continue
		}
		amount := amounts[0]

		if amount > 0 {
			amount = -amount // expenses are negative
		}

		currInst, totalInst := extractCalInstallments(line)
		payee := cleanCalPayee(line, dateMatch)
		if payee == "" {
			payee = "Cal Credit Transaction"
		}

		txs = append(txs, ParsedTransaction{
			Date:               formattedDate,
			Payee:              payee,
			ExtendedDetail:     line,
			Amount:             amount,
			Currency:           "ILS",
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			CardSuffix:         currentCardSuffix,
			Provider:           ProviderCal,
		})
	}

	return txs, nil
}

func parseCalDate(dStr string) string {
	parts := strings.Split(dStr, "/")
	if len(parts) != 3 {
		return ""
	}
	day, month, yearStr := parts[0], parts[1], parts[2]
	if len(yearStr) == 2 {
		yearStr = "20" + yearStr
	}
	formatted := yearStr + "-" + month + "-" + day
	if _, err := time.Parse("2006-01-02", formatted); err != nil {
		return ""
	}
	return formatted
}

func extractCalAmounts(line string) []float64 {
	matches := calAmountRegex.FindAllString(line, -1)
	var results []float64
	for _, m := range matches {
		clean := strings.ReplaceAll(m, ",", "")
		if val, err := strconv.ParseFloat(clean, 64); err == nil && val != 0 {
			results = append(results, val)
		}
	}
	return results
}

func extractCalInstallments(line string) (int, int) {
	m := calInstRegex.FindStringSubmatch(line)
	if len(m) == 3 {
		c, _ := strconv.Atoi(m[1])
		t, _ := strconv.Atoi(m[2])
		return c, t
	}
	return 0, 0
}

func cleanCalPayee(line, dateStr string) string {
	cleaned := strings.ReplaceAll(line, dateStr, "")
	cleaned = calAmountRegex.ReplaceAllString(cleaned, "")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}
