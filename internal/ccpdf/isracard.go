package ccpdf

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

type IsracardParser struct{}

func (p *IsracardParser) Name() string {
	return ProviderIsracard
}

var (
	isracardDateRegex       = regexp.MustCompile(`\b(\d{2}/\d{2}/(?:\d{2}|\d{4}))\b`)
	isracardAmountRegex     = regexp.MustCompile(`-?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?-?\b`)
	isracardInstRegex       = regexp.MustCompile(`תשלום\s+(\d+)\s+מתוך\s+(\d+)`)
	isracardCardSuffixRegex = regexp.MustCompile(`\b\d{4}\b`)
)

func (p *IsracardParser) Parse(data *PDFData) ([]ParsedTransaction, error) {
	var txs []ParsedTransaction
	currentCardSuffix := ""

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.Contains(line, "כרטיס שמסתיים בספרות") || strings.Contains(line, "סיטרכ") {
			matches := isracardCardSuffixRegex.FindAllString(line, -1)
			if len(matches) > 0 {
				currentCardSuffix = matches[len(matches)-1]
			}
		}

		// Skip headers and summary lines
		if strings.Contains(line, "סה\"כ") || strings.Contains(line, "לתאריך") || strings.Contains(line, "מסגרת הכרטיס") ||
			strings.Contains(line, "רכישות בחו") || strings.Contains(line, "שעורי ריבית") {
			continue
		}

		dateMatches := isracardDateRegex.FindAllString(line, -1)
		if len(dateMatches) == 0 {
			continue
		}
		dateMatch := dateMatches[len(dateMatches)-1]

		formattedDate := parseIsracardDate(dateMatch)
		if formattedDate == "" {
			continue
		}

		currency := "ILS"
		if strings.Contains(line, "$") {
			currency = "USD"
		} else if strings.Contains(line, "€") {
			currency = "EUR"
		}

		amounts := extractIsracardAmounts(line)
		if len(amounts) == 0 {
			continue
		}
		amount := amounts[0]

		if strings.Contains(line, "זיכוי") {
			if amount < 0 {
				amount = -amount // refund is positive
			}
		} else if amount > 0 {
			amount = -amount // expense is negative
		}

		currInst, totalInst := extractIsracardInstallments(line)
		payee := cleanIsracardPayee(line, dateMatch)
		if payee == "" {
			payee = "Isracard Transaction"
		}

		txs = append(txs, ParsedTransaction{
			Date:               formattedDate,
			Payee:              payee,
			ExtendedDetail:     line,
			Amount:             amount,
			Currency:           currency,
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			CardSuffix:         currentCardSuffix,
			Provider:           ProviderIsracard,
		})
	}

	return txs, nil
}

func parseIsracardDate(dStr string) string {
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

func extractIsracardAmounts(line string) []float64 {
	var results []float64
	tokens := strings.Fields(line)
	for _, tok := range tokens {
		clean := strings.ReplaceAll(tok, "₪", "")
		clean = strings.ReplaceAll(clean, "$", "")
		clean = strings.ReplaceAll(clean, "€", "")
		clean = strings.ReplaceAll(clean, ",", "")
		clean = strings.TrimSuffix(clean, "-")
		if strings.HasPrefix(tok, "-") || strings.HasSuffix(tok, "-") {
			clean = "-" + strings.TrimPrefix(clean, "-")
		}
		if val, err := strconv.ParseFloat(clean, 64); err == nil && val != 0 {
			if strings.Contains(tok, ".") || (val > -100000 && val < 100000) {
				results = append(results, val)
			}
		}
	}
	return results
}

func extractIsracardInstallments(line string) (int, int) {
	m := isracardInstRegex.FindStringSubmatch(line)
	if len(m) == 3 {
		c, _ := strconv.Atoi(m[1])
		t, _ := strconv.Atoi(m[2])
		return c, t
	}
	return 0, 0
}

func cleanIsracardPayee(line, dateStr string) string {
	cleaned := strings.ReplaceAll(line, dateStr, "")
	cleaned = isracardAmountRegex.ReplaceAllString(cleaned, "")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}
