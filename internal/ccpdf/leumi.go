package ccpdf

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

type LeumiParser struct{}

func (p *LeumiParser) Name() string {
	return ProviderLeumi
}

var (
	leumiDateRegex   = regexp.MustCompile(`(\d{2}/\d{2}/\d{2})`)
	leumiAmountRegex = regexp.MustCompile(`(\d{1,3}(?:,\d{3})*\.\d{2})`)
	leumiCardRegex   = regexp.MustCompile(`\b\d{4}\b`)
)

func (p *LeumiParser) Parse(data *PDFData) ([]ParsedTransaction, error) {
	var txs []ParsedTransaction
	currentCardSuffix := ""
	inFutureSection := false

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.Contains(line, "לכרטיס שמסתיים") || strings.Contains(line, "מסתיים ב") || strings.Contains(line, "לכרטיס") {
			matches := leumiCardRegex.FindAllString(line, -1)
			if len(matches) > 0 {
				currentCardSuffix = matches[len(matches)-1]
			}
		}

		// Track informational future charges section
		if strings.Contains(line, "חיוב עתידי") || strings.Contains(line, "לידיעה") {
			inFutureSection = true
			continue
		}
		if strings.Contains(line, "עסקות בארץ") || strings.Contains(line, "עסקות לפרעון") {
			inFutureSection = false
		}

		if inFutureSection {
			continue
		}

		// Ignore total summary rows
		if strings.Contains(line, "סה\"כ") || strings.Contains(line, "כ חיוב לחשבון\"סה") || strings.Contains(line, "כ\"סה") ||
			strings.Contains(line, "התחייבויות בכרטיס") || strings.Contains(line, "תוקף מסגרת") || strings.Contains(line, "פירוט החיובים בחשבון") ||
			strings.Contains(line, "להלן פרוט החיובים") || strings.Contains(line, "הערות/תאריך") {
			continue
		}

		dateMatches := leumiDateRegex.FindAllString(line, -1)
		if len(dateMatches) == 0 {
			continue
		}
		dateMatch := dateMatches[len(dateMatches)-1]

		formattedDate := parseLeumiDate(dateMatch)
		if formattedDate == "" {
			continue
		}

		amounts := extractLeumiAmounts(line)
		if len(amounts) == 0 {
			continue
		}
		amount := amounts[0]
		if amount > 0 {
			amount = -amount
		}

		payee := cleanLeumiPayee(line, dateMatch)
		if payee == "" {
			payee = "Bank Leumi Transaction"
		}

		txs = append(txs, ParsedTransaction{
			Date:               formattedDate,
			Payee:              payee,
			ExtendedDetail:     line,
			Amount:             amount,
			Currency:           "ILS",
			CurrentInstallment: 0,
			TotalInstallments:  0,
			CardSuffix:         currentCardSuffix,
			Provider:           ProviderLeumi,
		})
	}

	return txs, nil
}

func parseLeumiDate(dStr string) string {
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

func extractLeumiAmounts(line string) []float64 {
	matches := leumiAmountRegex.FindAllString(line, -1)
	var results []float64
	for _, m := range matches {
		clean := strings.ReplaceAll(m, ",", "")
		if val, err := strconv.ParseFloat(clean, 64); err == nil && val != 0 {
			results = append(results, val)
		}
	}
	return results
}

func cleanLeumiPayee(line, dateStr string) string {
	cleaned := strings.ReplaceAll(line, dateStr, "")
	cleaned = leumiAmountRegex.ReplaceAllString(cleaned, "")
	cleaned = strings.ReplaceAll(cleaned, "רגילה", "")
	cleaned = strings.ReplaceAll(cleaned, "הוראת קבע", "")
	cleaned = strings.ReplaceAll(cleaned, "דחוי חודש", "")
	cleaned = strings.ReplaceAll(cleaned, "₪", "")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}
