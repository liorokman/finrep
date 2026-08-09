package ccpdf

import (
	"bytes"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dslipak/pdf"
)

func TestExactTransactionCounts(t *testing.T) {
	testCases := []struct {
		provider string
		filePath string
		expected int
	}{
		{"isracard", filepath.Join("..", "..", "data", "Isracard-2026-07.pdf"), 10},
		{"cal", filepath.Join("..", "..", "data", "cal-1001-2026-07.pdf"), 36},
		{"leumi", filepath.Join("..", "..", "data", "leumi-2026-07.pdf"), 9},
	}

	for _, tc := range testCases {
		t.Run(tc.provider, func(t *testing.T) {
			r, err := pdf.Open(tc.filePath)
			if err != nil {
				t.Fatalf("pdf.Open failed for %s: %v", tc.filePath, err)
			}
			lines, fullText := extractLinesFromContent(r)
			data := &PDFData{FilePath: tc.filePath, FullText: fullText, Lines: lines}

			parser, err := ResolveParser(tc.provider, data)
			if err != nil {
				t.Fatalf("ResolveParser failed: %v", err)
			}

			txs, err := parser.Parse(data)
			if err != nil {
				t.Fatalf("Parse failed: %v", err)
			}

			if len(txs) != tc.expected {
				t.Errorf("expected %d transactions for %s, got %d", tc.expected, tc.provider, len(txs))
				for idx, tx := range txs {
					t.Logf("[%02d] Date: %s | Payee: %s | Amount: %.2f %s | Card: %s",
						idx+1, tx.Date, tx.Payee, tx.Amount, tx.Currency, tx.CardSuffix)
				}
			} else {
				t.Logf("PASS: %s correctly parsed %d transactions", tc.provider, len(txs))
				for idx, tx := range txs {
					t.Logf("[%02d] Date: %s | Payee: %s | Amount: %.2f %s | Card: %s",
						idx+1, tx.Date, tx.Payee, tx.Amount, tx.Currency, tx.CardSuffix)
				}
			}
		})
	}
}

func TestExplicitProviderRequired(t *testing.T) {
	data := &PDFData{FilePath: "some_file.pdf", FullText: "some random text"}
	_, err := ResolveParser("invalid_provider", data)
	if err == nil {
		t.Errorf("expected error for invalid provider, got nil")
	}
}

func TestSortAndDeduplicate(t *testing.T) {
	txs := []ParsedTransaction{
		{Date: "2026-08-05", Payee: "Store B", ExtendedDetail: "Store B detail", Amount: -50.0},
		{Date: "2026-08-01", Payee: "Store A", ExtendedDetail: "Store A detail", Amount: -100.0},
		{Date: "2026-08-01", Payee: "Store A", ExtendedDetail: "Store A detail", Amount: -100.0}, // Duplicate
	}

	unique := SortAndDeduplicateTransactions(txs)
	if len(unique) != 2 {
		t.Fatalf("expected 2 unique transactions, got %d", len(unique))
	}
	if unique[0].Date != "2026-08-01" {
		t.Errorf("expected first date 2026-08-01, got %s", unique[0].Date)
	}
	if unique[1].Date != "2026-08-05" {
		t.Errorf("expected second date 2026-08-05, got %s", unique[1].Date)
	}
}

func TestWriteCombinedCSV(t *testing.T) {
	txs := []ParsedTransaction{
		{
			Date:           "2026-07-15",
			Payee:          "Supermarket",
			ExtendedDetail: "Supermarket Branch #10",
			Amount:         -150.75,
			Currency:       "ILS",
			CardSuffix:     "1001",
			Provider:       ProviderIsracard,
		},
	}

	var buf bytes.Buffer
	err := WriteCombinedCSV(&buf, txs)
	if err != nil {
		t.Fatalf("WriteCombinedCSV failed: %v", err)
	}

	out := buf.String()
	if !strings.Contains(out, "Date,Description,Extended Description,Amount,Currency,Card Suffix,Provider") {
		t.Errorf("missing header in CSV output: %s", out)
	}
	if !strings.Contains(out, "2026-07-15,Supermarket,Supermarket Branch #10,-150.75,ILS,1001,ISRACARD") {
		t.Errorf("missing transaction row in CSV output: %s", out)
	}
}
