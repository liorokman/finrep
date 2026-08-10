package ccpdf

import (
	"encoding/csv"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
)

// FilterByCutoffDate filters out transactions whose billing date (or transaction date) is earlier than cutoff YYYY-MM or YYYY-MM-DD
func FilterByCutoffDate(txs []ParsedTransaction, cutoff string) []ParsedTransaction {
	cutoff = strings.TrimSpace(cutoff)
	if cutoff == "" || len(txs) == 0 {
		return txs
	}

	var filtered []ParsedTransaction
	for _, tx := range txs {
		bDate := tx.BillingDate
		if bDate == "" {
			bDate = tx.Date
		}
		if bDate == "" {
			filtered = append(filtered, tx)
			continue
		}

		targetDate := bDate
		targetCutoff := cutoff
		if len(targetCutoff) == 7 && len(targetDate) >= 7 {
			targetDate = targetDate[:7]
		}

		if targetDate >= targetCutoff {
			filtered = append(filtered, tx)
		}
	}
	return filtered
}

// SortAndDeduplicateTransactions sorts transactions chronologically by Date and removes identical duplicate records
func SortAndDeduplicateTransactions(txs []ParsedTransaction) []ParsedTransaction {
	if len(txs) == 0 {
		return txs
	}

	sort.SliceStable(txs, func(i, j int) bool {
		if txs[i].Date != txs[j].Date {
			return txs[i].Date < txs[j].Date
		}
		if txs[i].Payee != txs[j].Payee {
			return txs[i].Payee < txs[j].Payee
		}
		return txs[i].Amount < txs[j].Amount
	})

	var unique []ParsedTransaction
	seen := make(map[string]bool)

	for _, tx := range txs {
		key := fmt.Sprintf("%s|%s|%s|%.2f|%s|%.2f|%s|%d|%d|%s",
			tx.Date, tx.BillingDate, tx.Payee, tx.Amount, tx.Currency, tx.BilledAmount, tx.ExtendedDetail, tx.CurrentInstallment, tx.TotalInstallments, tx.CardSuffix)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, tx)
		}
	}

	return unique
}

// WriteCombinedCSV outputs transactions into a single unified CSV file formatted for finrep import
func WriteCombinedCSV(w io.Writer, txs []ParsedTransaction) error {
	processed := SortAndDeduplicateTransactions(txs)

	cw := csv.NewWriter(w)
	defer cw.Flush()

	header := []string{
		"Date",
		"Billing Date",
		"Description",
		"Extended Description",
		"Amount",
		"Currency",
		"Billed Amount",
		"Card Suffix",
		"Provider",
	}
	if err := cw.Write(header); err != nil {
		return fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, tx := range processed {
		record := []string{
			tx.Date,
			tx.BillingDate,
			tx.Payee,
			tx.ExtendedDetail,
			strconv.FormatFloat(tx.Amount, 'f', 2, 64),
			tx.Currency,
			strconv.FormatFloat(tx.BilledAmount, 'f', 2, 64),
			tx.CardSuffix,
			tx.Provider,
		}
		if err := cw.Write(record); err != nil {
			return fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	return nil
}
