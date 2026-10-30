// Package ledger holds the core records: accounts (with billing rules),
// categories and transactions.
package ledger

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/liorokman/finrep/internal/store"
)

// EarliestDate is the first day the application works with (spec 4.5).
const EarliestDate = "2023-01-01"

// MaxPageSize caps every list endpoint.
const MaxPageSize = 500

var (
	ErrNotFound  = errors.New("not found")
	ErrInvalid   = errors.New("invalid")
	ErrInUse     = errors.New("in use")
	ErrDuplicate = errors.New("duplicate")
)

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalid, fmt.Sprintf(format, a...))
}

// Ledger provides access to the core records.
type Ledger struct {
	st *store.Store
}

// New returns a Ledger backed by st.
func New(st *store.Store) *Ledger { return &Ledger{st: st} }

// validDate checks YYYY-MM-DD and the 2023 floor.
func validDate(field, d string) error {
	t, err := time.Parse("2006-01-02", d)
	if err != nil || t.Format("2006-01-02") != d {
		return invalid("%s must be YYYY-MM-DD, got %q", field, d)
	}
	if d < EarliestDate {
		return invalid("%s %s is before %s, the earliest supported date", field, d, EarliestDate)
	}
	return nil
}

func isUnique(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

// rowScanner is satisfied by *sql.Row and *sql.Rows.
type rowScanner interface{ Scan(dest ...any) error }

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
