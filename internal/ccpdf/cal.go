package ccpdf

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type CalParser struct {
	LocalAI *LocalAIClient
}

func (p *CalParser) Name() string {
	return ProviderCal
}

var (
	calDateRegex   = regexp.MustCompile(`\b(\d{2}/\d{2}/(?:\d{2}|\d{4}))\b`)
	calAmountRegex = regexp.MustCompile(`-?\b\d{1,3}(?:,\d{3})*\.\d{2}-?`)
	calInstRegex   = regexp.MustCompile(`תשלום\s+(\d+)\s+מתוך\s+(\d+)`)
	calCardRegex   = regexp.MustCompile(`\b\d{4}\b`)
)

func (p *CalParser) Parse(data *PDFData) ([]ParsedTransaction, error) {
	var txs []ParsedTransaction
	currentCardSuffix := ""
	currentBillingDate := ""

	for _, line := range data.Lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Detect statement or section billing date (e.g. "לתאריך 10/07/26", "מועד החיוב 10/07/2026")
		if strings.Contains(line, "לתאריך") || strings.Contains(line, "מועד") || strings.Contains(line, "בתאריך") {
			dateMatches := calDateRegex.FindAllString(line, -1)
			if len(dateMatches) > 0 {
				parsed := parseCalDate(dateMatches[0])
				if parsed != "" {
					currentBillingDate = parsed
				}
			}
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
			strings.Contains(line, "סך החיובים הצפויים") || strings.Contains(line, "לתאריך\"סה") || strings.Contains(line, "כ לתאריך") ||
			strings.Contains(line, "פירוט החיובים") || strings.Contains(line, "לחיוב ב-") {
			continue
		}

		// Fee line without purchase date (e.g. ₪ 14.50 לידיעה - my cal עמלת טעינה)
		if (strings.Contains(line, "עמלת טעינה") || strings.Contains(line, "my cal")) && !strings.Contains(line, "טעינת") {
			amounts := extractCalAmounts(line)
			if len(amounts) > 0 {
				amt := -amounts[0]
				txDate := currentBillingDate
				if txDate == "" {
					txDate = time.Now().Format("2006-01-02")
				}
				txs = append(txs, ParsedTransaction{
					Date:               txDate,
					BillingDate:        currentBillingDate,
					Payee:              CleanPayeeText("my cal עמלת טעינה"),
					ExtendedDetail:     CleanExtendedDetail(line),
					Amount:             amt,
					Currency:           "ILS",
					BilledAmount:       amt,
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

		currency := "ILS"
		if strings.Contains(line, "$") {
			currency = "USD"
		} else if strings.Contains(line, "€") {
			currency = "EUR"
		}

		amounts := extractCalAmounts(line)
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

		isReimbursementLine := strings.Contains(line, "חיוב תקציב") || strings.Contains(line, "תקציב סאפ") ||
			strings.Contains(line, "חיוב בתקציב") || strings.Contains(line, "זיכוי תקציב") || (origAmount < 0)

		if origAmount > 0 {
			origAmount = -origAmount
		}
		if billedAmount > 0 {
			billedAmount = -billedAmount
		}

		currInst, totalInst := extractCalInstallments(line)
		payee := cleanCalPayee(line, dateMatch)
		payee = CleanPayeeText(payee)
		if payee == "" {
			payee = "Cal Credit Transaction"
		}

		extended := CleanExtendedDetail(line)

		// Check if this line is an employer budget reimbursement offset matching a previous transaction on the same date
		if isReimbursementLine && len(txs) > 0 {
			reimbursementOffset := math.Abs(origAmount)
			matchedIndex := -1
			for idx := len(txs) - 1; idx >= 0; idx-- {
				if txs[idx].Date == formattedDate {
					matchedIndex = idx
					break
				}
			}

			if matchedIndex >= 0 {
				// Update matched primary transaction's real net cost (BilledAmount)
				txs[matchedIndex].BilledAmount = txs[matchedIndex].Amount + reimbursementOffset
				if txs[matchedIndex].BilledAmount > 0 {
					txs[matchedIndex].BilledAmount = 0
				}
				continue // Do NOT emit reimbursement line as a separate transaction
			}
		}

		txs = append(txs, ParsedTransaction{
			Date:               formattedDate,
			BillingDate:        currentBillingDate,
			Payee:              payee,
			ExtendedDetail:     extended,
			Amount:             origAmount,
			Currency:           currency,
			BilledAmount:       billedAmount,
			CurrentInstallment: currInst,
			TotalInstallments:  totalInst,
			CardSuffix:         currentCardSuffix,
			Provider:           ProviderCal,
		})
	}

	if p.LocalAI != nil && len(txs) > 0 {
		payees := make([]string, len(txs))
		for i, tx := range txs {
			payees[i] = tx.Payee
		}
		if fixedMap, err := p.LocalAI.FixPayeeSpacesBatch(payees); err == nil && len(fixedMap) > 0 {
			for i := range txs {
				if fixed, ok := fixedMap[txs[i].Payee]; ok && fixed != "" {
					txs[i].Payee = fixed
				}
			}
		}
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
		clean := strings.ReplaceAll(m, "₪", "")
		clean = strings.ReplaceAll(clean, ",", "")
		clean = strings.TrimSpace(clean)
		if strings.HasPrefix(clean, "-") || strings.HasSuffix(clean, "-") {
			clean = "-" + strings.Trim(clean, "-")
		}
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
