package reports

import (
	"context"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/money"
)

// Warnings points out data problems that make spending reports misleading.
type Warnings struct {
	// HintsConfigured is false until the card-payment hints setting exists; without it the check cannot run.
	HintsConfigured bool
	// UnlinkedCardPayments are bank debits that look like card payments but settle no statement.
	UnlinkedCardPayments []billing.CardPaymentCandidate
	// Counted is the part reports include as spending (it double-counts when the card is tracked here,
	// and is a lump sum when it is not). Hidden is the part reports exclude as a transfer although
	// no statement backs it, which hides spending when the card is not tracked.
	Counted, Hidden money.Money
	// Linkable is how many of them auto-match can still link to a statement.
	Linkable int
}

// Warnings lists unlinked card-payment debits within the filter's dates, owner and accounts.
func (s *Service) Warnings(ctx context.Context, f Filter) (*Warnings, error) {
	if err := f.validate(); err != nil {
		return nil, err
	}
	cands, ok, err := s.b.UnlinkedCardPayments(ctx)
	if err != nil {
		return nil, err
	}
	w := &Warnings{HintsConfigured: ok, Counted: money.New(0, f.currency()), Hidden: money.New(0, f.currency())}
	for _, c := range cands {
		if c.Amount.Currency() != f.currency() || c.Date < "2023-01-01" ||
			f.From != "" && c.Date < f.From || f.To != "" && c.Date > f.To ||
			f.Owner != "" && c.Owner != f.Owner || len(f.AccountIDs) > 0 && !contains(f.AccountIDs, c.AccountID) {
			continue
		}
		w.UnlinkedCardPayments = append(w.UnlinkedCardPayments, c)
		if c.Counted {
			w.Counted = money.New(w.Counted.Minor()+c.Amount.Minor(), f.currency())
		}
		if c.Hidden {
			w.Hidden = money.New(w.Hidden.Minor()+c.Amount.Minor(), f.currency())
		}
		if c.HasProposal {
			w.Linkable++
		}
	}
	return w, nil
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
