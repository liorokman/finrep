package money

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestParse(t *testing.T) {
	cases := []struct {
		in   string
		want int64
		err  bool
	}{
		{"1003.05", 100305, false},
		{"₪ 1,003.05", 100305, false},
		{"-21.50", -2150, false},
		{"(53.36)", -5336, false},
		{"53.36-", -5336, false},
		{"‎₪ -21.50", -2150, false},
		{".5", 50, false},
		{"7", 700, false},
		{"0.00", 0, false},
		{"12.345", 0, true},
		{"1.2.3", 0, true},
		{"", 0, true},
		{"abc", 0, true},
		{"99999999999999999999", 0, true},
	}
	for _, c := range cases {
		got, err := Parse(c.in, ILS)
		if c.err {
			if err == nil {
				t.Errorf("Parse(%q) expected error, got %v", c.in, got)
			}
			continue
		}
		if err != nil || got.Minor() != c.want {
			t.Errorf("Parse(%q) = %v, %v; want %d", c.in, got, err, c.want)
		}
	}
}

func TestFormatRoundTrip(t *testing.T) {
	for _, minor := range []int64{0, 1, -1, 99, 100, -100, 100305, -2576660, 9223372036854775807, -9223372036854775807} {
		s := Format(minor, ILS)
		got, err := Parse(s, ILS)
		if err != nil || got.Minor() != minor {
			t.Errorf("round trip %d -> %q -> %v, %v", minor, s, got, err)
		}
	}
}

func TestAddNoFloatDrift(t *testing.T) {
	sum := Money{}
	tenth := New(10, ILS)
	for i := 0; i < 10; i++ {
		var err error
		if sum, err = sum.Add(tenth); err != nil {
			t.Fatal(err)
		}
	}
	if sum.Minor() != 100 || sum.Currency() != ILS {
		t.Fatalf("got %v", sum)
	}
}

func TestStatementTotal(t *testing.T) {
	// Cal 1001, 10/07/26 section of a real statement: purchases and employer
	// coverage lines must net to the printed total.
	lines := []string{"566.49", "1,003.05", "21.50", "-21.50", "-53.36", "53.36", "-513.67", "513.67"}
	var sum Money
	for _, l := range lines {
		m, err := Parse(l, ILS)
		if err != nil {
			t.Fatal(err)
		}
		if sum, err = sum.Add(m); err != nil {
			t.Fatal(err)
		}
	}
	if sum.Minor() != 156954 {
		t.Fatalf("got %s", sum)
	}
}

func TestCurrencyMismatch(t *testing.T) {
	_, err := New(1, ILS).Add(New(1, USD))
	if !errors.Is(err, ErrCurrencyMismatch) {
		t.Fatalf("want mismatch, got %v", err)
	}
	if _, err := ParseCurrency("xyz"); !errors.Is(err, ErrUnknownCurrency) {
		t.Fatalf("want unknown currency, got %v", err)
	}
}

func TestOverflow(t *testing.T) {
	if _, err := New(9223372036854775807, ILS).Add(New(1, ILS)); !errors.Is(err, ErrOverflow) {
		t.Fatalf("want overflow, got %v", err)
	}
}

func TestFormatNegative(t *testing.T) {
	if got := New(-5, ILS).String(); got != "-0.05 ILS" {
		t.Fatalf("got %q", got)
	}
}

func TestZeroDecimalAndExtraCurrencies(t *testing.T) {
	jpy, err := Parse("5,000", "JPY")
	if err != nil || jpy.Minor() != 5000 || Format(5000, "JPY") != "5000" {
		t.Fatalf("JPY: %v %v %q", jpy, err, Format(5000, "JPY"))
	}
	if _, err := Parse("5000.50", "JPY"); err == nil {
		t.Fatal("JPY with fraction accepted")
	}
	if m, err := Parse("5000.00", "JPY"); err != nil || m.Minor() != 5000 {
		t.Fatalf("JPY with .00: %v %v", m, err)
	}
	if m, err := Parse("12.500", ILS); err != nil || m.Minor() != 1250 {
		t.Fatalf("trailing zero decimals: %v %v", m, err)
	}
	for _, c := range []string{"CHF", "CAD", "aud"} {
		if _, err := ParseCurrency(c); err != nil {
			t.Errorf("%s should be supported: %v", c, err)
		}
	}
}

func TestMoneyJSON(t *testing.T) {
	b, err := json.Marshal(New(-123456, "ILS"))
	if err != nil || string(b) != `{"minor":-123456,"currency":"ILS","display":"-1234.56"}` {
		t.Fatalf("%s %v", b, err)
	}
	var m Money
	if err := json.Unmarshal([]byte(`{"minor":500,"currency":"usd","display":"ignored"}`), &m); err != nil || m != New(500, "USD") {
		t.Fatalf("%v %v", m, err)
	}
	for _, bad := range []string{`{"currency":"ILS"}`, `{"minor":1,"currency":"XXX9"}`, `{"minor":1}`, `"5"`} {
		if err := json.Unmarshal([]byte(bad), &m); err == nil {
			t.Errorf("%s accepted", bad)
		}
	}
	var wrap struct{ A Money }
	if err := json.Unmarshal([]byte(`{"A":{"minor":7,"currency":"JPY"}}`), &wrap); err != nil || wrap.A.Minor() != 7 {
		t.Fatal(err)
	}
}
