package importer

import (
	"errors"
	"strings"
	"testing"

	"golang.org/x/text/encoding/charmap"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

func basicMapping() CSVMapping {
	return CSVMapping{HasHeader: true, DateColumn: "Date", DateFormat: "DD/MM/YYYY", PayeeColumns: []string{"Description"}, AmountColumn: "Amount"}
}

func mustParseCSV(t *testing.T, data string, m CSVMapping) *Parsed {
	t.Helper()
	p, err := ParseCSV([]byte(data), "f.csv", m)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestDecodeText(t *testing.T) {
	cases := map[string]struct {
		in   []byte
		want string
	}{
		"plain utf-8":    {[]byte("שלום"), "שלום"},
		"utf-8 with BOM": {append([]byte{0xEF, 0xBB, 0xBF}, []byte("date")...), "date"},
		"emoji (4-byte)": {[]byte("Café ☕ 🍕"), "Café ☕ 🍕"},
		"empty":          {nil, ""},
		"ascii only":     {[]byte("a,b"), "a,b"},
	}
	for name, c := range cases {
		got, err := DecodeText(c.in)
		if err != nil || got != c.want {
			t.Errorf("%s: got %q, %v; want %q", name, got, err, c.want)
		}
	}
	// Windows-1255 Hebrew (the legacy encoding Israeli banks export).
	enc, err := charmap.Windows1255.NewEncoder().String("שופרסל")
	if err != nil {
		t.Fatal(err)
	}
	if got, err := DecodeText([]byte(enc)); err != nil || got != "שופרסל" {
		t.Fatalf("windows-1255: %q %v", got, err)
	}
	// UTF-16 LE with BOM (Excel "Unicode text").
	u16 := []byte{0xFF, 0xFE, 'a', 0, ',', 0, 'b', 0}
	if got, err := DecodeText(u16); err != nil || got != "a,b" {
		t.Fatalf("utf-16: %q %v", got, err)
	}
}

func TestParseCSVBOMAndHeaderMatching(t *testing.T) {
	data := "\xEF\xBB\xBF Date ,Description, amount\n01/02/2026,Shufersal 🍕,-100.50\n"
	p := mustParseCSV(t, data, basicMapping())
	if len(p.Lines) != 1 || p.Lines[0].Date != "2026-02-01" || p.Lines[0].Amount.Minor() != -10050 || p.Lines[0].Payee != "Shufersal 🍕" {
		t.Fatalf("%+v", p.Lines)
	}
}

func TestParseCSVHonoursDateFormat(t *testing.T) {
	data := "Date,Description,Amount\n03/04/2026,x,-1\n"
	dmy := mustParseCSV(t, data, basicMapping())
	m := basicMapping()
	m.DateFormat = "MM/DD/YYYY"
	mdy := mustParseCSV(t, data, m)
	if dmy.Lines[0].Date != "2026-04-03" || mdy.Lines[0].Date != "2026-03-04" {
		t.Fatalf("DD/MM -> %s, MM/DD -> %s", dmy.Lines[0].Date, mdy.Lines[0].Date)
	}
	for format, in := range map[string]string{"YYYY-MM-DD": "2026-02-09", "DD.MM.YYYY": "9.2.2026", "DD/MM/YY": "09/02/26", "DD-MM-YYYY": "09-02-2026"} {
		m.DateFormat = format
		p := mustParseCSV(t, "Date,Description,Amount\n"+in+",x,-1\n", m)
		if len(p.Lines) != 1 || p.Lines[0].Date != "2026-02-09" {
			t.Errorf("%s %q: %+v %+v", format, in, p.Lines, p.Rejected)
		}
	}
	// A date in the wrong format is rejected, not guessed.
	m.DateFormat = "YYYY-MM-DD"
	p := mustParseCSV(t, "Date,Description,Amount\n09/02/2026,x,-1\n02/01/2026,y,-1\n", m)
	if len(p.Lines) != 0 || len(p.Rejected) != 2 {
		t.Fatalf("lines=%d rejected=%d", len(p.Lines), len(p.Rejected))
	}
	if _, err := ParseCSV([]byte(data), "f.csv", CSVMapping{DateColumn: "Date", DateFormat: "bogus"}); !errors.Is(err, ledger.ErrInvalid) {
		t.Fatalf("unknown format: %v", err)
	}
}

func TestParseCSVDelimitersAndQuoting(t *testing.T) {
	for name, data := range map[string]string{
		"semicolon": "Date;Description;Amount\n01/02/2026;a, b;-5,00\n",
		"tab":       "Date\tDescription\tAmount\n01/02/2026\ta, b\t-5.00\n",
		"quoted":    "Date,Description,Amount\n01/02/2026,\"a, b\",\"-5.00\"\n",
	} {
		p := mustParseCSV(t, strings.ReplaceAll(data, "-5,00", "-5.00"), basicMapping())
		if len(p.Lines) != 1 || p.Lines[0].Payee != "a, b" || p.Lines[0].Amount.Minor() != -500 {
			t.Errorf("%s: %+v %+v", name, p.Lines, p.Rejected)
		}
	}
}

func TestParseCSVDebitCredit(t *testing.T) {
	m := CSVMapping{HasHeader: true, DateColumn: "Date", DateFormat: "DD/MM/YYYY", PayeeColumns: []string{"Description"}, DebitColumn: "Debit", CreditColumn: "Credit"}
	data := "Date,Description,Debit,Credit\n01/02/2026,rent,3000.00,\n02/02/2026,salary,,12000.00\n03/02/2026,refund,-5.00,\n04/02/2026,empty,,\n"
	p := mustParseCSV(t, data, m)
	want := []int64{-300000, 1200000, -500}
	if len(p.Lines) != 3 {
		t.Fatalf("lines=%d rejected=%v", len(p.Lines), p.Rejected)
	}
	for i, w := range want {
		if p.Lines[i].Amount.Minor() != w {
			t.Errorf("line %d = %d, want %d", i, p.Lines[i].Amount.Minor(), w)
		}
	}
	if len(p.Rejected) != 1 || p.Rejected[0].Row != 5 {
		t.Fatalf("rejected: %+v", p.Rejected)
	}
}

func TestParseCSVInvertSignAndForeign(t *testing.T) {
	m := basicMapping()
	m.InvertSign = true
	m.OriginalAmountColumn, m.OriginalCurrencyColumn = "Orig", "Cur"
	data := "Date,Description,Amount,Orig,Cur\n01/02/2026,hotel,500.00,130.00,USD\n02/02/2026,refund,-20.00,5.00,usd\n03/02/2026,local,10.00,10.00,ILS\n"
	p := mustParseCSV(t, data, m)
	hotel, refund, local := p.Lines[0], p.Lines[1], p.Lines[2]
	if hotel.Amount.Minor() != -50000 || hotel.Original.Minor() != -13000 || hotel.Original.Currency() != money.USD || hotel.Scope != ledger.TxForeign {
		t.Fatalf("hotel: %+v %+v", hotel, hotel.Original)
	}
	if refund.Amount.Minor() != 2000 || refund.Original.Minor() != 500 {
		t.Fatalf("refund keeps its direction: %+v %+v", refund, refund.Original)
	}
	if local.Original != nil || local.Scope != ledger.TxLocal {
		t.Fatalf("same-currency original must be ignored: %+v", local)
	}
}

func TestParseCSVNoHeaderIndexColumnsInstallmentsBillDate(t *testing.T) {
	m := CSVMapping{DateColumn: "0", DateFormat: "DD/MM/YYYY", PayeeColumns: []string{"1", "2"}, AmountColumn: "3",
		BillDateColumn: "4", CurrentInstallmentCol: "5", TotalInstallmentsCol: "6"}
	data := "01/02/2026,Ikea,Rishon,-100.00,10/03/2026,2,12\n02/02/2026,Zara,,-50.00,10/03/2026,,\n03/02/2026,Bad,,-1,10/03/2026,5,3\n"
	p := mustParseCSV(t, data, m)
	if len(p.Lines) != 2 || len(p.Rejected) != 1 {
		t.Fatalf("lines=%d rejected=%+v", len(p.Lines), p.Rejected)
	}
	a, b := p.Lines[0], p.Lines[1]
	if a.Payee != "Ikea - Rishon" || a.CurrentInst != 2 || a.TotalInst != 12 || a.BillDate != "2026-03-10" {
		t.Fatalf("a: %+v", a)
	}
	if b.Payee != "Zara" || b.CurrentInst != 0 {
		t.Fatalf("b: %+v", b)
	}
	if p.Rejected[0].Row != 3 || !strings.Contains(p.Rejected[0].Reason, "installments") {
		t.Fatalf("rejected: %+v", p.Rejected)
	}
}

func TestParseCSVMappingErrors(t *testing.T) {
	data := "Date,Description,Amount\n01/02/2026,x,-1\n"
	bad := map[string]func(*CSVMapping){
		"unknown date column":  func(m *CSVMapping) { m.DateColumn = "When" },
		"unknown payee column": func(m *CSVMapping) { m.PayeeColumns = []string{"Who"} },
		"no payee":             func(m *CSVMapping) { m.PayeeColumns = nil },
		"no amount":            func(m *CSVMapping) { m.AmountColumn = "" },
		"amount and debit":     func(m *CSVMapping) { m.DebitColumn = "Amount" },
		"unknown optional col": func(m *CSVMapping) { m.NotesColumn = "Memo" },
	}
	for name, mutate := range bad {
		m := basicMapping()
		mutate(&m)
		if _, err := ParseCSV([]byte(data), "f.csv", m); !errors.Is(err, ledger.ErrInvalid) {
			t.Errorf("%s: want ErrInvalid, got %v", name, err)
		}
	}
	if _, err := ParseCSV(nil, "f.csv", basicMapping()); err == nil {
		t.Error("empty file accepted")
	}
}

func TestParseCSVRejectedRowsDoNotBlockTheRest(t *testing.T) {
	data := "Date,Description,Amount\n01/02/2026,ok,-1.00\nnot-a-date,x,-1.00\n02/02/2026,,-1.00\n03/02/2026,bad amount,abc\n\n04/02/2026,ok2,-2.00\n"
	p := mustParseCSV(t, data, basicMapping())
	if len(p.Lines) != 2 || len(p.Rejected) != 3 {
		t.Fatalf("lines=%d rejected=%+v", len(p.Lines), p.Rejected)
	}
	if p.Rejected[0].Row != 3 || p.Rejected[1].Row != 4 || p.Rejected[2].Row != 5 {
		t.Fatalf("row numbers: %+v", p.Rejected)
	}
}

func TestInspectCSV(t *testing.T) {
	in, err := InspectCSV([]byte("Date;Description;Amount\n01/02/2026;a;1\n02/02/2026;b;2\n"))
	if err != nil || in.Delimiter != ';' || len(in.Columns) != 3 || in.Rows != 2 || len(in.Sample) != 2 {
		t.Fatalf("%+v %v", in, err)
	}
	if _, err := InspectCSV(nil); err == nil {
		t.Fatal("empty file accepted")
	}
}

func TestCSVImportEndToEndIsIdempotent(t *testing.T) {
	e := setup(t)
	data := "Date,Description,Amount\n01/02/2026,Shufersal,-100.00\n01/02/2026,Shufersal,-100.00\n02/02/2026,Salary,9000.00\n01/12/2022,Old,-5.00\nbad,x,1\n"
	mk := func() *Parsed { return mustParseCSV(t, data, basicMapping()) }
	r1, err := e.im.Commit(ctx, e.bank.ID, mk())
	if err != nil || r1.Inserted != 3 || len(r1.Skipped) != 1 || len(r1.Rejected) != 1 {
		t.Fatalf("first: %+v %v", r1, err)
	}
	r2, err := e.im.Commit(ctx, e.bank.ID, mk())
	if err != nil || r2.Inserted != 0 || r2.Duplicates != 3 {
		t.Fatalf("second: %+v %v", r2, err)
	}
}
