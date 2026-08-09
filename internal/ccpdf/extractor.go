package ccpdf

import (
	"fmt"
	"math"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/dslipak/pdf"
)

// PDFData holds raw text and extracted lines from a parsed PDF
type PDFData struct {
	FilePath string
	FullText string
	Lines    []string
}

// ExtractTextFromPDF extracts structured text lines from a PDF file
func ExtractTextFromPDF(filePath string) (*PDFData, error) {
	r, err := pdf.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF file '%s': %w", filePath, err)
	}

	lines, fullText := extractLinesFromContent(r)
	return &PDFData{
		FilePath: filePath,
		FullText: fullText,
		Lines:    lines,
	}, nil
}

func extractLinesFromContent(r *pdf.Reader) ([]string, string) {
	var allLines []string
	var fullTextBuilder strings.Builder

	numPages := r.NumPage()
	for page := 1; page <= numPages; page++ {
		p := r.Page(page)
		if p.V.IsNull() {
			continue
		}

		content := p.Content()

		type textItem struct {
			X float64
			Y float64
			S string
		}

		var items []textItem
		for _, t := range content.Text {
			if strings.TrimSpace(t.S) != "" || t.S == " " {
				items = append(items, textItem{X: t.X, Y: t.Y, S: t.S})
			}
		}

		if len(items) == 0 {
			continue
		}

		const yTolerance = 2.5
		var rows [][]textItem

		sort.SliceStable(items, func(i, j int) bool {
			return items[i].Y > items[j].Y
		})

		for _, item := range items {
			placed := false
			for rIdx := range rows {
				if math.Abs(rows[rIdx][0].Y-item.Y) <= yTolerance {
					rows[rIdx] = append(rows[rIdx], item)
					placed = true
					break
				}
			}
			if !placed {
				rows = append(rows, []textItem{item})
			}
		}

		sort.SliceStable(rows, func(i, j int) bool {
			return rows[i][0].Y > rows[j][0].Y
		})

		for _, row := range rows {
			sort.SliceStable(row, func(i, j int) bool {
				return row[i].X < row[j].X
			})

			var lineBuilder strings.Builder
			for i, item := range row {
				if i > 0 {
					prev := row[i-1]
					if !strings.HasSuffix(prev.S, " ") && !strings.HasPrefix(item.S, " ") {
						estimatedPrevWidth := float64(len([]rune(prev.S))) * 3.5
						gap := item.X - (prev.X + estimatedPrevWidth)
						if gap > 1.5 {
							lineBuilder.WriteString(" ")
						}
					}
				}
				lineBuilder.WriteString(item.S)
			}

			rawLine := strings.TrimSpace(lineBuilder.String())
			if rawLine != "" {
				processedLine := ReverseVisualHebrew(rawLine)
				processedLine = FixHebrewWordSpacing(processedLine)
				allLines = append(allLines, processedLine)
				fullTextBuilder.WriteString(processedLine)
				fullTextBuilder.WriteString("\n")
			}
		}
	}

	return allLines, fullTextBuilder.String()
}

var hebrewSpaceFixes = []struct {
	pattern string
	replace string
}{
	{"פלאקסימסעדות", "פלאקסי מסעדות"},
	{"מסעדותחיוב", "מסעדות חיוב"},
	{"מזוןומשקא", "מזון ומשקא"},
	{"תיירותמזהה", "תיירות מזהה"},
	{"אנרגיהמזהה", "אנרגיה מזהה"},
	{"מסעדותמזהה", "מסעדות מזהה"},
	{"רפואהובריהוראת", "רפואה ובריאות הוראת"},
	{"רפואהוברי", "רפואה ובריאות"},
	{"תחבורהוראת", "תחבורה הוראת"},
	{"תקשורתהוראת", "תקשורת הוראת"},
	{"הוראתקבע", "הוראת קבע"},
}

// FixHebrewWordSpacing restores missing spaces in concatenated Hebrew credit card category/payee terms
func FixHebrewWordSpacing(s string) string {
	for _, fix := range hebrewSpaceFixes {
		s = strings.ReplaceAll(s, fix.pattern, fix.replace)
	}
	return s
}

var (
	strayCurrencyRegex = regexp.MustCompile(`(?:^|\s+)[₪$€]+(?:\s+[₪$€]+)*(?:\s+|$)`)
)

// CleanPayeeText removes stray/duplicated currency symbols, leading/trailing numbers, and tabular artifacts from merchant names
func CleanPayeeText(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}

	// Remove standalone currency symbols like "₪ ₪", "₪", "$", "€"
	s = strayCurrencyRegex.ReplaceAllString(s, " ")

	// Trim leading/trailing punctuation and whitespace
	s = strings.TrimFunc(s, func(r rune) bool {
		return r == ' ' || r == '\t' || r == '₪' || r == '$' || r == '€' || r == '-' || r == ':' || r == '.' || r == ','
	})

	// Normalize multiple spaces into single space
	fields := strings.Fields(s)
	return strings.Join(fields, " ")
}

// CleanExtendedDetail cleans extended description text by removing stray currency symbols and tabular junk
func CleanExtendedDetail(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}

	// Remove standalone currency symbols
	s = strayCurrencyRegex.ReplaceAllString(s, " ")

	fields := strings.Fields(s)
	return strings.Join(fields, " ")
}

// ReverseVisualHebrew reverses contiguous blocks of RTL Hebrew characters to restore human-readable word order
func ReverseVisualHebrew(s string) string {
	runes := []rune(s)
	n := len(runes)
	if n == 0 {
		return s
	}

	var result []rune
	for i := 0; i < n; {
		if isHebrewRune(runes[i]) {
			j := i
			for j < n && (isHebrewRune(runes[j]) || runes[j] == ' ') {
				j++
			}
			// Trim trailing spaces in segment
			end := j
			for end > i && runes[end-1] == ' ' {
				end--
			}
			// Reverse Hebrew character sequence
			for k := end - 1; k >= i; k-- {
				result = append(result, runes[k])
			}
			// Add back any trailing spaces
			for k := end; k < j; k++ {
				result = append(result, runes[k])
			}
			i = j
		} else {
			result = append(result, runes[i])
			i++
		}
	}
	return string(result)
}

func isHebrewRune(r rune) bool {
	return (r >= 0x0590 && r <= 0x05FF) || (r >= 0xFB1D && r <= 0xFB4F)
}

// Helper to sanitize path basename
func GetFileBasename(path string) string {
	return filepath.Base(path)
}
