package ccpdf

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type IsracardParser struct {
	LocalAI *LocalAIClient
}

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
	currentBillingDate := ""

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Detect section or statement billing dates (e.g. "חיוב מתאריך 10/07/2026", "לתאריך 02/07/2026", "מועד החיוב: 10/07/26")
		if strings.Contains(line, "לתאריך") || strings.Contains(line, "מועד") || strings.Contains(line, "חיוב מתאריך") || strings.Contains(line, "מועד החיוב") {
			dateMatches := isracardDateRegex.FindAllString(line, -1)
			if len(dateMatches) > 0 {
				parsed := parseIsracardDate(dateMatches[0])
				if parsed != "" {
					currentBillingDate = parsed
				}
			}
		}

		if strings.Contains(line, "כרטיס שמסתיים בספרות") || strings.Contains(line, "סיטרכ") {
			matches := isracardCardSuffixRegex.FindAllString(line, -1)
			if len(matches) > 0 {
				currentCardSuffix = matches[len(matches)-1]
			}
		}

		// Skip headers and summary lines
		if strings.Contains(line, "סה\"כ") || strings.Contains(line, "מסגרת הכרטיס") ||
			strings.Contains(line, "רכישות בחו") || strings.Contains(line, "שעורי ריבית") ||
			strings.Contains(line, "לתאריך") || strings.Contains(line, "סך הכל") {
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

		origAmount, currency, billedAmount := parseIsracardAmountsAndCurrency(line)
		if origAmount == 0 && billedAmount == 0 {
			continue
		}

		if strings.Contains(line, "זיכוי") {
			if origAmount < 0 {
				origAmount = -origAmount
			}
			if billedAmount < 0 {
				billedAmount = -billedAmount
			}
		} else {
			if origAmount > 0 {
				origAmount = -origAmount
			}
			if billedAmount > 0 {
				billedAmount = -billedAmount
			}
		}

		currInst, totalInst := extractIsracardInstallments(line)
		payee := cleanIsracardPayee(line, dateMatch)
		payee = CleanPayeeText(payee)
		if payee == "" {
			payee = "Isracard Transaction"
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
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			CardSuffix:         currentCardSuffix,
			Provider:           ProviderIsracard,
		})
	}

	return txs, nil
}

func parseIsracardAmountsAndCurrency(line string) (float64, string, float64) {
	currency := "ILS"
	sym := ""
	if strings.Contains(line, "$") {
		currency = "USD"
		sym = "$"
	} else if strings.Contains(line, "€") {
		currency = "EUR"
		sym = "€"
	}

	amounts := extractIsracardAmounts(line)
	if len(amounts) == 0 {
		return 0, currency, 0
	}

	if currency == "ILS" || len(amounts) == 1 {
		return amounts[0], currency, amounts[0]
	}

	// For foreign currency transactions, find the amount associated with foreign symbol ($ or €)
	tokens := strings.Fields(line)
	var origAmt float64
	foundOrig := false

	for i, tok := range tokens {
		if strings.Contains(tok, sym) {
			// Check previous or next token for a number
			if i > 0 {
				if val, err := parseIsracardFloat(tokens[i-1]); err == nil && val > 0 {
					origAmt = val
					foundOrig = true
					break
				}
			}
			if i+1 < len(tokens) {
				if val, err := parseIsracardFloat(tokens[i+1]); err == nil && val > 0 {
					origAmt = val
					foundOrig = true
					break
				}
			}
		}
	}

	if !foundOrig {
		origAmt = amounts[0]
	}

	// Billed amount in ILS is the largest remaining amount on the line
	billedAmt := origAmt
	for _, a := range amounts {
		if math.Abs(a) > math.Abs(billedAmt) {
			billedAmt = a
		}
	}

	return origAmt, currency, billedAmt
}

func parseIsracardFloat(tok string) (float64, error) {
	clean := strings.ReplaceAll(tok, "₪", "")
	clean = strings.ReplaceAll(clean, "$", "")
	clean = strings.ReplaceAll(clean, "€", "")
	clean = strings.ReplaceAll(clean, ",", "")
	return strconv.ParseFloat(clean, 64)
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
