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
		{"cal", filepath.Join("..", "..", "data", "2026-07.pdf"), 24},
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
			}
			for idx, tx := range txs {
				t.Logf("[%02d] Date: %s | BillingDate: %s | Payee: %s | Amt: %.2f %s | Billed: %.2f ILS | Card: %s",
					idx+1, tx.Date, tx.BillingDate, tx.Payee, tx.Amount, tx.Currency, tx.BilledAmount, tx.CardSuffix)
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

func TestConfigAndGenerateExample(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "test_ccpdf.json")
	err := GenerateExampleConfig(tmpFile)
	if err != nil {
		t.Fatalf("GenerateExampleConfig failed: %v", err)
	}

	cfg, err := LoadConfig(tmpFile)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg == nil || cfg.APIURL == "" {
		t.Errorf("expected loaded config with non-empty APIURL, got nil or empty")
	}
}

func TestFixHebrewWordSpacing(t *testing.T) {
	input := "סיבוס פלאקסימסעדותחיוב תקציב סאפ"
	expected := "סיבוס פלאקסי מסעדות חיוב תקציב סאפ"
	actual := FixHebrewWordSpacing(input)
	if actual != expected {
		t.Errorf("FixHebrewWordSpacing failed:\nExpected: %s\nGot:      %s", expected, actual)
	}
}

func TestSortAndDeduplicate(t *testing.T) {
	txs := []ParsedTransaction{
		{Date: "2026-08-05", BillingDate: "2026-08-10", Payee: "Store B", ExtendedDetail: "Store B detail", Amount: -50.0, Currency: "ILS", BilledAmount: -50.0},
		{Date: "2026-08-01", BillingDate: "2026-08-10", Payee: "Store A", ExtendedDetail: "Store A detail", Amount: -100.0, Currency: "ILS", BilledAmount: -100.0},
		{Date: "2026-08-01", BillingDate: "2026-08-10", Payee: "Store A", ExtendedDetail: "Store A detail", Amount: -100.0, Currency: "ILS", BilledAmount: -100.0}, // Duplicate
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
			BillingDate:    "2026-08-10",
			Payee:          "Supermarket",
			ExtendedDetail: "Supermarket Branch #10",
			Amount:         -150.75,
			Currency:       "ILS",
			BilledAmount:   -150.75,
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
	expectedHeader := "Date,Billing Date,Description,Extended Description,Amount,Currency,Billed Amount,Card Suffix,Provider"
	if !strings.Contains(out, expectedHeader) {
		t.Errorf("missing expected header in CSV output:\nHeader: %s\nGot: %s", expectedHeader, out)
	}
	expectedRow := "2026-07-15,2026-08-10,Supermarket,Supermarket Branch #10,-150.75,ILS,-150.75,1001,ISRACARD"
	if !strings.Contains(out, expectedRow) {
		t.Errorf("missing expected row in CSV output:\nExpected: %s\nGot: %s", expectedRow, out)
	}
}

func TestCalReimbursementMerging(t *testing.T) {
	lines := []string{
		"מועד החיוב 10/08/2026",
		"14/06/2026 סיבוס פלאקסי מסעדות לא ₪ 53.36 ₪ 53.36",
		"14/06/2026 סיבוס פלאקסי מסעדות חיוב תקציב סאפ לאבס ישראל בע\"מ לא ₪ -53.36",
	}
	data := &PDFData{FilePath: "test_cal.pdf", FullText: strings.Join(lines, "\n"), Lines: lines}
	parser := &CalParser{}

	txs, err := parser.Parse(data)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	if len(txs) != 1 {
		t.Fatalf("expected 1 merged transaction, got %d", len(txs))
	}

	tx := txs[0]
	if tx.Amount != -53.36 {
		t.Errorf("expected Amount -53.36 (original cost), got %.2f", tx.Amount)
	}
	if tx.BilledAmount != 0.0 {
		t.Errorf("expected BilledAmount 0.00 (real net cost after reimbursement), got %.2f", tx.BilledAmount)
	}
	if strings.Contains(tx.Payee, "₪") {
		t.Errorf("payee should not contain stray currency symbols: %s", tx.Payee)
	}
}

func TestDescriptionCurrencySymbolCleanup(t *testing.T) {
	input := "₪ ₪ אושי אושי צורן מסעדות לא"
	expected := "אושי אושי צורן מסעדות לא"
	actual := CleanPayeeText(input)
	if actual != expected {
		t.Errorf("CleanPayeeText failed:\nExpected: %s\nGot:      %s", expected, actual)
	}
}

func TestLeumiSummaryLineFiltering(t *testing.T) {
	lines := []string{
		"בתאריך 10/02/22",
		"סה\"כ חיוב ל ח שבון 10-946-39213588 בתאריך 10/02/22 : 3,629.53 ₪",
		"10/02/22 10/02/22 XOBYAP ₪ 260.00",
	}
	data := &PDFData{FilePath: "test_leumi.pdf", FullText: strings.Join(lines, "\n"), Lines: lines}
	parser := &LeumiParser{}

	txs, err := parser.Parse(data)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	if len(txs) != 1 {
		t.Fatalf("expected 1 transaction (skipping summary row), got %d", len(txs))
	}
	if txs[0].Payee != "XOBYAP" {
		t.Errorf("expected transaction payee XOBYAP, got %s", txs[0].Payee)
	}
}

func TestCollapseSpacedOutLetters(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"W W W .H AC KER BO XES.C", "WWW.H AC KER BO XES.C"},
		{"LO N D O N W W W .ALIEXPR ESS.C O M", "LO NDONWWW.ALIEXPR ESS.C OM"},
		{"U SD 3035899324 LW N .N ET", "U SD 3035899324 LW N.N ET"},
	}

	for _, tc := range testCases {
		actual := CollapseSpacedOutLetters(tc.input)
		if actual != tc.expected {
			t.Errorf("CollapseSpacedOutLetters failed for %q:\nExpected: %q\nGot:      %q", tc.input, tc.expected, actual)
		}
	}
}

func TestFilterByCutoffDate(t *testing.T) {
	txs := []ParsedTransaction{
		{Date: "2024-05-15", BillingDate: "2024-05-10", Payee: "Tx 1 Old"},
		{Date: "2024-06-01", BillingDate: "2024-06-10", Payee: "Tx 2 June"},
		{Date: "2024-07-04", BillingDate: "2024-07-10", Payee: "Tx 3 July"},
	}

	filtered := FilterByCutoffDate(txs, "2024-06")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 transactions for YYYY-MM cutoff '2024-06', got %d", len(filtered))
	}
	if filtered[0].Payee != "Tx 2 June" || filtered[1].Payee != "Tx 3 July" {
		t.Errorf("unexpected filtered results: %+v", filtered)
	}

	filteredDay := FilterByCutoffDate(txs, "2024-06-15")
	if len(filteredDay) != 1 {
		t.Fatalf("expected 1 transaction for YYYY-MM-DD cutoff '2024-06-15', got %d", len(filteredDay))
	}
	if filteredDay[0].Payee != "Tx 3 July" {
		t.Errorf("unexpected filtered day result: %+v", filteredDay)
	}
}

func TestConfigCutoffDate(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.CutoffDate != "2023-04" {
		t.Errorf("expected default CutoffDate to be '2023-04', got %q", cfg.CutoffDate)
	}
}
