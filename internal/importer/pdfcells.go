package importer

import (
	"bytes"
	"fmt"
	"math"
	"sort"
	"strings"
	"unicode"

	"github.com/dslipak/pdf"
)

// cell is a run of text on one visual row, with its horizontal extent.
type cell struct {
	X0, X1 float64
	Text   string // logical reading order
}

// pdfRow is one visual row of a page: cells sorted left to right.
type pdfRow struct {
	Page  int
	Y     float64
	Cells []cell
}

// Text joins the cells of a row, right to left (the reading order of the
// Hebrew statements), separated by spaces.
func (r pdfRow) Text() string {
	parts := make([]string, 0, len(r.Cells))
	for i := len(r.Cells) - 1; i >= 0; i-- {
		parts = append(parts, r.Cells[i].Text)
	}
	return strings.Join(parts, " ")
}

const (
	rowTolerance = 2.5 // glyphs within this vertical distance share a row
	cellGap      = 6.0 // a horizontal gap wider than this starts a new cell
)

// openPDF opens a PDF, tolerating data appended after %%EOF (some bank portals
// append an HTML error page).
func openPDF(data []byte) (*pdf.Reader, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err == nil {
		return r, nil
	}
	if i := bytes.LastIndex(data, []byte("%%EOF")); i >= 0 && i+5 < len(data) {
		trimmed := data[:i+5]
		if r2, err2 := pdf.NewReader(bytes.NewReader(trimmed), int64(len(trimmed))); err2 == nil {
			return r2, nil
		}
	}
	return nil, fmt.Errorf("not a readable PDF: %w", err)
}

// pdfRows extracts every page's text as rows of cells, top to bottom.
func pdfRows(data []byte) ([]pdfRow, error) {
	r, err := openPDF(data)
	if err != nil {
		return nil, err
	}
	var out []pdfRow
	for pg := 1; pg <= r.NumPage(); pg++ {
		p := r.Page(pg)
		if p.V.IsNull() {
			continue
		}
		type glyph struct {
			x, y, w float64
			s       string
		}
		var gs []glyph
		for _, t := range p.Content().Text {
			if t.S == "" {
				continue
			}
			gs = append(gs, glyph{t.X, t.Y, t.W, t.S})
		}
		sort.SliceStable(gs, func(i, j int) bool { return gs[i].y > gs[j].y })
		var rows [][]glyph
		for _, g := range gs {
			placed := false
			for k := range rows {
				if math.Abs(rows[k][0].y-g.y) <= rowTolerance {
					rows[k] = append(rows[k], g)
					placed = true
					break
				}
			}
			if !placed {
				rows = append(rows, []glyph{g})
			}
		}
		sort.SliceStable(rows, func(i, j int) bool { return rows[i][0].y > rows[j][0].y })
		for _, row := range rows {
			sort.SliceStable(row, func(a, b int) bool { return row[a].x < row[b].x })
			pr := pdfRow{Page: pg, Y: row[0].y}
			var cur []rune
			var x0, x1 float64
			flush := func() {
				if t := strings.TrimSpace(string(cur)); t != "" {
					pr.Cells = append(pr.Cells, cell{X0: x0, X1: x1, Text: visualToLogical(t)})
				}
				cur = nil
			}
			for _, g := range row {
				if len(cur) > 0 && g.x-x1 > cellGap {
					flush()
				}
				if len(cur) == 0 {
					x0 = g.x
				}
				cur = append(cur, []rune(g.s)...)
				x1 = g.x + g.w
			}
			flush()
			if len(pr.Cells) > 0 {
				out = append(out, pr)
			}
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("the PDF contains no text (is it a scanned image?)")
	}
	return out, nil
}

// visualToLogical converts text as laid out on the page (glyphs left to right)
// to logical reading order. A cell with Hebrew is a right-to-left paragraph:
// its visual string is the logical string reversed, except that digits and
// Latin text keep their own left-to-right order. So reverse everything, then
// turn each left-to-right run back around. Cells without Hebrew are unchanged.
func visualToLogical(s string) string {
	hasHebrew := false
	for _, r := range s {
		if isHebrew(r) {
			hasHebrew = true
			break
		}
	}
	if !hasHebrew {
		return s
	}
	rs := []rune(s)
	for i, j := 0, len(rs)-1; i < j; i, j = i+1, j-1 {
		rs[i], rs[j] = rs[j], rs[i]
	}
	for i := 0; i < len(rs); {
		if !isLTRCore(rs[i]) {
			i++
			continue
		}
		j := i + 1
		for j < len(rs) {
			switch {
			case isLTRCore(rs[j]) || strings.ContainsRune("./:,-%+'", rs[j]):
				j++
				continue
			case rs[j] == ' ' && j+1 < len(rs) && isLTRCore(rs[j+1]):
				j++
				continue
			}
			break
		}
		for j > i+1 && !isLTRCore(rs[j-1]) { // a run ends on a letter, digit or symbol
			j--
		}
		for a, b := i, j-1; a < b; a, b = a+1, b-1 {
			rs[a], rs[b] = rs[b], rs[a]
		}
		i = j
	}
	return string(rs)
}

// isLTRCore reports characters that start and end a left-to-right run.
func isLTRCore(r rune) bool {
	return (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
		r == '₪' || r == '$' || r == '€' || r == '£'
}

func isHebrew(r rune) bool { return unicode.Is(unicode.Hebrew, r) }
