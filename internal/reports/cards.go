package reports

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/liorokman/finrep/internal/billing"
	"github.com/liorokman/finrep/internal/money"
)

// ---- 8. Card payoff and installment forecast ----

type ForecastItem struct {
	Payee     string
	Amount    money.Money
	Remaining int // installments still to come
}

type ForecastMonth struct {
	Month string
	Total money.Money
	Items []ForecastItem
}

type CardBalance struct {
	AccountID   string
	AccountName string
	Owner       string
	Unpaid      money.Money // billed or upcoming statements not yet settled
	Undated     money.Money // charges with no bill date yet (the card has no billing rule), still owed
}

type Forecast struct {
	Months      []ForecastMonth // future bill months, from the installments already on the cards
	Outstanding []CardBalance
}

// InstallmentForecast projects installment purchases forward month by month and lists what each card
// still owes on statements that are not yet settled.
func (s *Service) InstallmentForecast(ctx context.Context, f Filter) (*Forecast, error) {
	q, err := f.compile(OutOfPocket)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT account_id, payee, total_installments, current_installment, cash_date, `+q.value+`
		FROM ledger_view WHERE `+q.where+` AND flow = 'SPEND' AND account_type = 'CREDIT_CARD'
		  AND total_installments > 1 AND current_installment IS NOT NULL AND current_installment < total_installments
		ORDER BY cash_date`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type key struct {
		acc, payee string
		total      int
		amount     int64
	}
	latest := map[key]struct {
		cur  int
		date string
	}{}
	for rows.Next() {
		var acc, payee, date string
		var total, cur int
		var v int64
		if err := rows.Scan(&acc, &payee, &total, &cur, &date, &v); err != nil {
			return nil, err
		}
		k := key{acc, payeeKey(payee), total, v}
		if old, ok := latest[k]; !ok || cur > old.cur {
			latest[k] = struct {
				cur  int
				date string
			}{cur, date}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	byMonth := map[string]*ForecastMonth{}
	for k, l := range latest {
		base, err := time.Parse("2006-01-02", l.date)
		if err != nil {
			continue
		}
		base = time.Date(base.Year(), base.Month(), 1, 0, 0, 0, 0, time.UTC)
		for i := 1; i <= k.total-l.cur; i++ {
			m := base.AddDate(0, i, 0).Format("2006-01")
			fm := byMonth[m]
			if fm == nil {
				fm = &ForecastMonth{Month: m, Total: q.money(0)}
				byMonth[m] = fm
			}
			fm.Total = q.money(fm.Total.Minor() + k.amount)
			fm.Items = append(fm.Items, ForecastItem{Payee: k.payee, Amount: q.money(k.amount), Remaining: k.total - l.cur - i})
		}
	}
	out := &Forecast{Months: []ForecastMonth{}, Outstanding: []CardBalance{}}
	for _, fm := range byMonth {
		sort.Slice(fm.Items, func(i, j int) bool { return fm.Items[i].Payee < fm.Items[j].Payee })
		out.Months = append(out.Months, *fm)
	}
	sort.Slice(out.Months, func(i, j int) bool { return out.Months[i].Month < out.Months[j].Month })

	stmts, err := s.b.Statements(ctx, billing.StatementFilter{Owner: f.Owner, AccountIDs: f.AccountIDs,
		Statuses: []billing.Status{billing.Upcoming, billing.Billed, billing.Partial}})
	if err != nil {
		return nil, err
	}
	bal := map[string]*CardBalance{}
	for _, st := range stmts {
		if st.Expected.Currency() != q.cur {
			continue
		}
		b := bal[st.AccountID]
		if b == nil {
			b = &CardBalance{AccountID: st.AccountID, AccountName: st.AccountName, Owner: st.Owner, Unpaid: q.money(0)}
			bal[st.AccountID] = b
		}
		b.Unpaid = q.money(b.Unpaid.Minor() + st.Remaining().Minor())
	}
	// Charges with no bill date cannot be placed on a statement but are still owed.
	urows, err := s.st.QueryContext(ctx, `SELECT account_id, account_name, owner, COALESCE(SUM(-amount_minor), 0) FROM ledger_view
		WHERE `+q.where+` AND account_type = 'CREDIT_CARD' AND id IN (SELECT id FROM transactions WHERE statement_id IS NULL AND bill_date IS NULL)
		GROUP BY account_id`, q.args...)
	if err != nil {
		return nil, err
	}
	defer urows.Close()
	for urows.Next() {
		var id, name, owner string
		var v int64
		if err := urows.Scan(&id, &name, &owner, &v); err != nil {
			return nil, err
		}
		b := bal[id]
		if b == nil {
			b = &CardBalance{AccountID: id, AccountName: name, Owner: owner, Unpaid: q.money(0)}
			bal[id] = b
		}
		b.Undated = q.money(v)
	}
	if err := urows.Err(); err != nil {
		return nil, err
	}
	for _, b := range bal {
		if b.Undated.Currency() == "" {
			b.Undated = q.money(0)
		}
		out.Outstanding = append(out.Outstanding, *b)
	}
	sort.Slice(out.Outstanding, func(i, j int) bool { return out.Outstanding[i].AccountName < out.Outstanding[j].AccountName })
	return out, nil
}

// ---- 9. Foreign-currency purchases ----

type ForeignPurchase struct {
	TransactionID string
	Date          string
	Payee         string
	Original      money.Money
	Billed        money.Money
	Rate          float64 // billed per one unit of the original currency, fees included
}

type ForeignSummary struct {
	Currency    money.Currency // the original currency
	Count       int
	Original    money.Money
	Billed      money.Money
	AverageRate float64 // total billed / total original
	MinRate     float64
	MaxRate     float64
}

type ForeignReport struct {
	Purchases []ForeignPurchase
	Summary   []ForeignSummary
}

// ForeignPurchases lists card purchases made in another currency with the amount the issuer billed and
// the implied rate. Comparing the rate with the market rate to estimate fees needs exchange rates,
// which arrive with multi-currency support (spec section 8).
func (s *Service) ForeignPurchases(ctx context.Context, f Filter) (*ForeignReport, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT id, date, payee, original_amount_minor, original_currency, -amount_minor FROM ledger_view
		WHERE `+q.where+` AND account_type = 'CREDIT_CARD' AND kind = 'PURCHASE' AND original_currency IS NOT NULL
		  AND original_currency <> currency AND original_amount_minor IS NOT NULL AND original_amount_minor <> 0
		ORDER BY date, id`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rep := &ForeignReport{}
	sums := map[money.Currency]*ForeignSummary{}
	for rows.Next() {
		var p ForeignPurchase
		var origMinor, billed int64
		var origCur string
		if err := rows.Scan(&p.TransactionID, &p.Date, &p.Payee, &origMinor, &origCur, &billed); err != nil {
			return nil, err
		}
		oc := money.Currency(origCur)
		// Foreign purchases are stored with the original amount's own sign; use magnitudes.
		if origMinor < 0 {
			origMinor = -origMinor
		}
		p.Original, p.Billed = money.New(origMinor, oc), q.money(billed)
		p.Rate = major(billed, q.cur) / major(origMinor, oc)
		rep.Purchases = append(rep.Purchases, p)
		sm := sums[oc]
		if sm == nil {
			sm = &ForeignSummary{Currency: oc, MinRate: math.Inf(1)}
			sums[oc] = sm
		}
		sm.Count++
		sm.Original = money.New(sm.Original.Minor()+origMinor, oc)
		sm.Billed = q.money(sm.Billed.Minor() + billed)
		sm.MinRate = math.Min(sm.MinRate, p.Rate)
		sm.MaxRate = math.Max(sm.MaxRate, p.Rate)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, sm := range sums {
		sm.AverageRate = major(sm.Billed.Minor(), q.cur) / major(sm.Original.Minor(), sm.Currency)
		rep.Summary = append(rep.Summary, *sm)
	}
	sort.Slice(rep.Summary, func(i, j int) bool { return rep.Summary[i].Currency < rep.Summary[j].Currency })
	return rep, nil
}

func major(minor int64, cur money.Currency) float64 {
	return float64(minor) / math.Pow10(money.Digits(cur))
}
