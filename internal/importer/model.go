// Package importer turns statement files into ledger transactions: parsing is
// done by per-source parsers into a Parsed value; the Importer validates it,
// de-duplicates it by in-file keys and commits it atomically as an undoable batch.
package importer

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/money"
)

// Source identifies a kind of input file.
type Source string

const (
	SourceLeumiBank Source = "LEUMI_BANK_XLS"
	SourceCalPDF    Source = "CAL_PDF"
	SourceIsracard  Source = "ISRACARD_PDF"
	SourceLeumiCard Source = "LEUMI_CARD_PDF"
	SourceCSV       Source = "CSV"
)

// Line is one parsed statement line before it reaches the database.
type Line struct {
	Date            string // purchase / posting date, YYYY-MM-DD
	Amount          money.Money
	Original        *money.Money
	Scope           ledger.TxScope
	Kind            ledger.TxKind
	IsStandingOrder bool
	BillDate        string // statement bill date from the file; empty if unknown
	CurrentInst     int    // 0 when not an installment
	TotalInst       int
	Payee           string
	Notes           string
	Ref             string // issuer/bank reference, part of the identity when present

	// Covers is the index (within Parsed.Lines) of the purchase an
	// employer-coverage line covers; nil when it covers nothing.
	Covers *int
}

// Statement is a billed statement found in a file.
type Statement struct {
	BillDate     string
	PrintedTotal *money.Money // total printed by the issuer; checked against the lines
}

// Skipped is a line that was deliberately not imported.
type Skipped struct {
	Line   int // 1-based position in Parsed.Lines
	Reason string
}

// Rejected is a source row that could not be understood. Good rows of the
// same file are still imported; rejected rows are listed so nothing is lost silently.
type Rejected struct {
	Row    int // 1-based row number in the file (the header is row 1)
	Reason string
	Raw    []string
}

// Parsed is the result of parsing one file.
type Parsed struct {
	Source     Source
	Filename   string
	Last4      string // card number suffix found in the file, if any
	Lines      []Line
	Statements []Statement
	Rejected   []Rejected
	Warnings   []string
	// Balances is the running balance after each line, for sources that print one (the Leumi bank export);
	// an entry is nil when the file does not give it.
	Balances []*money.Money
}

// Key returns the stable identity of a line. n is the 1-based position of the
// line among identical lines in the same file, so two genuine identical
// purchases both import while re-importing the file adds nothing (spec 4.3).
func Key(accountID string, l Line, n int) string {
	h := sha256.New()
	fmt.Fprintf(h, "v1|%s|%s|%d|%s|%s|%s|%s|%d",
		accountID, l.Date, l.Amount.Minor(), l.Amount.Currency(), l.Payee, l.BillDate, l.Ref, n)
	return hex.EncodeToString(h.Sum(nil))
}

// keys computes the key of every line, in order.
func keys(accountID string, lines []Line) []string {
	seen := map[string]int{}
	out := make([]string, len(lines))
	for i, l := range lines {
		base := Key(accountID, l, 0)
		seen[base]++
		out[i] = Key(accountID, l, seen[base])
	}
	return out
}
