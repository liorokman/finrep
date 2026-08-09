package ccpdf

import (
	"path/filepath"
	"testing"

	"github.com/dslipak/pdf"
)

func TestDumpIsracardLines(t *testing.T) {
	fPath := filepath.Join("..", "..", "data", "Isracard-2026-07.pdf")
	r, err := pdf.Open(fPath)
	if err != nil {
		t.Fatalf("pdf.Open failed: %v", err)
	}

	lines, _ := extractLinesFromContent(r)
	t.Logf("=== Isracard total lines: %d ===", len(lines))
	for i, l := range lines {
		t.Logf("[%03d] %s", i+1, l)
	}
}
