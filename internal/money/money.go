// Package money provides an exact currency amount stored in integer minor
// units (agorot, cents). Floats are never used for stored or summed amounts.
package money

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Currency is an ISO 4217 code such as "ILS".
type Currency string

const (
	ILS Currency = "ILS"
	USD Currency = "USD"
	EUR Currency = "EUR"
	GBP Currency = "GBP"
)

// minorDigits lists the supported currencies and their decimal places.
var minorDigits = map[Currency]int{ILS: 2, USD: 2, EUR: 2, GBP: 2}

var (
	ErrCurrencyMismatch = errors.New("money: currency mismatch")
	ErrUnknownCurrency  = errors.New("money: unknown currency")
	ErrInvalidAmount    = errors.New("money: invalid amount")
	ErrOverflow         = errors.New("money: overflow")
)

// ParseCurrency validates and normalises a currency code.
func ParseCurrency(s string) (Currency, error) {
	c := Currency(strings.ToUpper(strings.TrimSpace(s)))
	if _, ok := minorDigits[c]; !ok {
		return "", fmt.Errorf("%w: %q", ErrUnknownCurrency, s)
	}
	return c, nil
}

// Money is an amount in minor units with its currency (math.MinInt64 is not
// supported). The zero value is
// an empty amount with no currency and combines with any currency as zero.
type Money struct {
	minor int64
	cur   Currency
}

// New builds a Money from minor units.
func New(minor int64, cur Currency) Money { return Money{minor: minor, cur: cur} }

// Minor returns the amount in minor units.
func (m Money) Minor() int64 { return m.minor }

// Currency returns the currency code.
func (m Money) Currency() Currency { return m.cur }

func (m Money) IsZero() bool     { return m.minor == 0 }
func (m Money) IsNegative() bool { return m.minor < 0 }

func (m Money) Neg() Money { return Money{-m.minor, m.cur} }

func (m Money) Abs() Money {
	if m.minor < 0 {
		return m.Neg()
	}
	return m
}

// Add returns m+o. A zero-valued operand adopts the other's currency.
func (m Money) Add(o Money) (Money, error) {
	cur, err := sameCurrency(m, o)
	if err != nil {
		return Money{}, err
	}
	sum := m.minor + o.minor
	if (o.minor > 0 && sum < m.minor) || (o.minor < 0 && sum > m.minor) {
		return Money{}, ErrOverflow
	}
	return Money{sum, cur}, nil
}

// Sub returns m-o.
func (m Money) Sub(o Money) (Money, error) { return m.Add(Money{-o.minor, o.cur}) }

// Cmp compares two amounts of the same currency: -1, 0 or 1.
func (m Money) Cmp(o Money) (int, error) {
	if _, err := sameCurrency(m, o); err != nil {
		return 0, err
	}
	switch {
	case m.minor < o.minor:
		return -1, nil
	case m.minor > o.minor:
		return 1, nil
	}
	return 0, nil
}

func sameCurrency(a, b Money) (Currency, error) {
	switch {
	case a.cur == b.cur:
		return a.cur, nil
	case a.cur == "" && a.minor == 0:
		return b.cur, nil
	case b.cur == "" && b.minor == 0:
		return a.cur, nil
	}
	return "", fmt.Errorf("%w: %s vs %s", ErrCurrencyMismatch, a.cur, b.cur)
}

// String formats as "-1234.50 ILS".
func (m Money) String() string {
	return Format(m.minor, m.cur) + " " + string(m.cur)
}

// Format renders minor units as a plain decimal string without symbol.
func Format(minor int64, cur Currency) string {
	digits := minorDigits[cur]
	if digits == 0 {
		digits = 2
	}
	neg := minor < 0
	// Avoid overflow on MinInt64 by working in uint64.
	u := uint64(minor)
	if neg {
		u = -u
	}
	div := uint64(math.Pow10(digits))
	s := fmt.Sprintf("%d.%0*d", u/div, digits, u%div)
	if neg {
		s = "-" + s
	}
	return s
}

// Parse converts statement text such as "₪ 1,003.05", "-21.50", "(53.36)" or
// "1 234,50" into an amount. Thousands separators and currency symbols are
// removed; a trailing minus or parentheses mean negative. At most the
// currency's decimal places are accepted: "12.345" is an error, not rounded.
func Parse(s string, cur Currency) (Money, error) {
	digits, ok := minorDigits[cur]
	if !ok {
		return Money{}, fmt.Errorf("%w: %q", ErrUnknownCurrency, cur)
	}
	orig := s
	s = strings.TrimSpace(s)
	neg := false
	if strings.HasPrefix(s, "(") && strings.HasSuffix(s, ")") {
		neg, s = true, s[1:len(s)-1]
	}
	// Strip symbols, spaces (incl. NBSP and bidi marks) and thousands commas.
	var b strings.Builder
	for _, r := range s {
		switch {
		case r == '-' || r == '−':
			neg = !neg
		case r == '+':
		case r >= '0' && r <= '9', r == '.':
			b.WriteRune(r)
		case r == ',' || r == ' ' || r == ' ' || r == '₪' || r == '$' || r == '€' || r == '£' ||
			r == '‎' || r == '‏' || r == '‪' || r == '‫' || r == '‬':
		default:
			return Money{}, fmt.Errorf("%w: %q", ErrInvalidAmount, orig)
		}
	}
	t := b.String()
	if t == "" || strings.Count(t, ".") > 1 || t == "." {
		return Money{}, fmt.Errorf("%w: %q", ErrInvalidAmount, orig)
	}
	whole, frac, _ := strings.Cut(t, ".")
	if len(frac) > digits {
		return Money{}, fmt.Errorf("%w: %q has too many decimals", ErrInvalidAmount, orig)
	}
	frac += strings.Repeat("0", digits-len(frac))
	if whole == "" {
		whole = "0"
	}
	w, err := strconv.ParseInt(whole, 10, 64)
	if err != nil {
		return Money{}, fmt.Errorf("%w: %q", ErrOverflow, orig)
	}
	f, _ := strconv.ParseInt(frac, 10, 64)
	scale := int64(math.Pow10(digits))
	if w > (math.MaxInt64-f)/scale {
		return Money{}, fmt.Errorf("%w: %q", ErrOverflow, orig)
	}
	minor := w*scale + f
	if neg {
		minor = -minor
	}
	return Money{minor, cur}, nil
}

// FromFloat converts a float produced by a legacy parser, rounding to the
// nearest minor unit. Use only at system boundaries, never for arithmetic.
func FromFloat(f float64, cur Currency) Money {
	digits := minorDigits[cur]
	if digits == 0 {
		digits = 2
	}
	return Money{int64(math.Round(f * math.Pow10(digits))), cur}
}
