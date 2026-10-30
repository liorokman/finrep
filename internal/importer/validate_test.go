package importer

import "testing"

func TestShiftSaturdayBillDates(t *testing.T) {
	p := &Parsed{Statements: []Statement{{BillDate: "2025-05-11"}}, Lines: []Line{
		{BillDate: "2025-05-10"}, // a note naming the Saturday: billed on the Sunday
		{BillDate: "2025-05-11"}, // already the statement's own date
		{BillDate: "2025-06-10"}, // a Tuesday stays
		{BillDate: ""},
	}}
	ShiftSaturdayBillDates(p)
	want := []string{"2025-05-11", "2025-05-11", "2025-06-10", ""}
	for i, l := range p.Lines {
		if l.BillDate != want[i] {
			t.Fatalf("line %d: %q, want %q", i, l.BillDate, want[i])
		}
	}
}
