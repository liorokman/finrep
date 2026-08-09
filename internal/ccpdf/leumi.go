package ccpdf

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

type LeumiParser struct {
	LocalAI *LocalAIClient
}

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
	currentBillingDate := ""
	inFutureSection := false

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Detect statement or section billing date (e.g. "לתאריך 10/07/26", "בתאריך 10/07/26")
		if strings.Contains(line, "לתאריך") || strings.Contains(line, "מועד") || strings.Contains(line, "בתאריך") {
			dateMatches := leumiDateRegex.FindAllString(line, -1)
			if len(dateMatches) > 0 {
				parsed := parseLeumiDate(dateMatches[0])
				if parsed != "" {
					currentBillingDate = parsed
				}
			}
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

		// Ignore total summary rows (except billing date section headers processed above)
		if strings.Contains(line, "סה\"כ") || strings.Contains(line, "כ חיוב לחשבון\"סה") || strings.Contains(line, "כ\"סה") ||
			strings.Contains(line, "התחייבויות בכרטיס") || strings.Contains(line, "תוקף מסגרת") ||
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

		currency := "ILS"
		if strings.Contains(line, "$") {
			currency = "USD"
		} else if strings.Contains(line, "€") {
			currency = "EUR"
		}

		amounts := extractLeumiAmounts(line)
		if len(amounts) == 0 {
			continue
		}

		var origAmount, billedAmount float64
		if currency != "ILS" && len(amounts) >= 2 {
			origAmount = amounts[0]
			billedAmount = amounts[len(amounts)-1]
		} else {
			origAmount = amounts[0]
			billedAmount = amounts[0]
		}

		if origAmount > 0 {
			origAmount = -origAmount
		}
		if billedAmount > 0 {
			billedAmount = -billedAmount
		}

		payee := cleanLeumiPayee(line, dateMatch)
		payee = CleanPayeeText(payee)
		if payee == "" {
			payee = "Bank Leumi Transaction"
		}

		if p.LocalAI != nil {
			if fixed, err := p.LocalAI.FixPayeeSpaces(payee); err == nil && fixed != "" {
				payee = fixed
			}
		}

		txs = append(txs, ParsedTransaction{
			Date:               formattedDate,
			BillingDate:        currentBillingDate,
			Payee:              payee,
			ExtendedDetail:     CleanExtendedDetail(line),
			Amount:             origAmount,
			Currency:           currency,
			BilledAmount:       billedAmount,
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
