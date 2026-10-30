package reports

import (
	"context"
	"math"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/liorokman/finrep/internal/money"
)

// Cadence of a recurring payment.
type Cadence string

const (
	Weekly    Cadence = "WEEKLY"
	Monthly   Cadence = "MONTHLY"
	Quarterly Cadence = "QUARTERLY"
	Yearly    Cadence = "YEARLY"
)

var cadenceDays = map[Cadence][2]float64{ // acceptable gap in days
	Weekly: {5, 9}, Monthly: {26, 35}, Quarterly: {80, 100}, Yearly: {350, 380},
}

var cadenceNominal = map[Cadence]float64{Weekly: 7, Monthly: 30.4, Quarterly: 91, Yearly: 365}

// Recurring is a payee paid on a regular schedule.
type Recurring struct {
	Payee        string
	Cadence      Cadence
	Count        int
	Typical      money.Money // mean amount per payment
	Fixed        bool        // amount varies by 5% or less
	MonthlyCost  money.Money
	FirstDate    string
	LastDate     string
	NextExpected string
	Active       bool // paid recently enough that it has probably not stopped
}

type occurrence struct {
	date  time.Time
	value int64
}

// payeeKey folds a payee into a comparable key: lowercase, digits and punctuation dropped, spaces collapsed.
func payeeKey(p string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(p) {
		switch {
		case unicode.IsLetter(r):
			b.WriteRune(r)
		case unicode.IsSpace(r) || r == '-' || r == '*' || r == '/':
			b.WriteRune(' ')
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}

// Recurring detects payments that repeat on a weekly, monthly, quarterly or yearly rhythm: at least
// three payments to the same payee, most gaps matching the cadence, and amounts that are stable.
func (s *Service) Recurring(ctx context.Context, f Filter) ([]Recurring, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT payee, `+q.date+`, `+q.value+` FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' AND `+q.value+` > 0 ORDER BY `+q.date, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type series struct {
		label string
		byDay map[string]*occurrence
	}
	groups := map[string]*series{}
	for rows.Next() {
		var payee, date string
		var v int64
		if err := rows.Scan(&payee, &date, &v); err != nil {
			return nil, err
		}
		key := payeeKey(payee)
		if key == "" {
			continue
		}
		d, err := time.Parse("2006-01-02", date)
		if err != nil {
			continue
		}
		g := groups[key]
		if g == nil {
			g = &series{label: strings.TrimSpace(payee), byDay: map[string]*occurrence{}}
			groups[key] = g
		}
		if o := g.byDay[date]; o != nil {
			o.value += v // several charges on one day count as one payment
		} else {
			g.byDay[date] = &occurrence{d, v}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	asOf := s.Now()
	var out []Recurring
	for _, g := range groups {
		if len(g.byDay) < 3 {
			continue
		}
		occ := make([]occurrence, 0, len(g.byDay))
		for _, o := range g.byDay {
			occ = append(occ, *o)
		}
		sort.Slice(occ, func(i, j int) bool { return occ[i].date.Before(occ[j].date) })
		if r, ok := classify(g.label, occ, asOf, q); ok {
			out = append(out, r)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].MonthlyCost.Minor() != out[j].MonthlyCost.Minor() {
			return out[i].MonthlyCost.Minor() > out[j].MonthlyCost.Minor()
		}
		return out[i].Payee < out[j].Payee
	})
	return out, nil
}

func classify(label string, occ []occurrence, asOf time.Time, q query) (Recurring, bool) {
	gaps := make([]float64, 0, len(occ)-1)
	for i := 1; i < len(occ); i++ {
		gaps = append(gaps, occ[i].date.Sub(occ[i-1].date).Hours()/24)
	}
	sorted := append([]float64{}, gaps...)
	sort.Float64s(sorted)
	median := sorted[len(sorted)/2]
	var cad Cadence
	for c, r := range cadenceDays {
		if median >= r[0] && median <= r[1] {
			cad = c
		}
	}
	if cad == "" {
		return Recurring{}, false
	}
	r := cadenceDays[cad]
	good := 0
	for _, g := range gaps {
		if g >= r[0] && g <= r[1] {
			good++
		}
	}
	if float64(good) < 0.6*float64(len(gaps)) {
		return Recurring{}, false
	}
	var sum float64
	for _, o := range occ {
		sum += float64(o.value)
	}
	mean := sum / float64(len(occ))
	var sq float64
	for _, o := range occ {
		sq += (float64(o.value) - mean) * (float64(o.value) - mean)
	}
	cv := math.Sqrt(sq/float64(len(occ))) / mean
	if cv > 0.6 {
		return Recurring{}, false // too erratic to call a subscription
	}
	last := occ[len(occ)-1].date
	var next time.Time
	switch cad {
	case Monthly:
		next = last.AddDate(0, 1, 0)
	case Quarterly:
		next = last.AddDate(0, 3, 0)
	case Yearly:
		next = last.AddDate(1, 0, 0)
	default:
		next = last.AddDate(0, 0, 7)
	}
	return Recurring{
		Payee: label, Cadence: cad, Count: len(occ),
		Typical:      q.money(int64(math.Round(mean))),
		Fixed:        cv <= 0.05,
		MonthlyCost:  q.money(int64(math.Round(mean * 30.4 / cadenceNominal[cad]))),
		FirstDate:    occ[0].date.Format("2006-01-02"),
		LastDate:     last.Format("2006-01-02"),
		NextExpected: next.Format("2006-01-02"),
		Active:       asOf.Sub(last).Hours()/24 <= 2*median,
	}, true
}

// ---- 10. Anomalies ----

type AnomalyKind string

const (
	Outlier      AnomalyKind = "OUTLIER"
	NewRecurring AnomalyKind = "NEW_RECURRING"
)

// Anomaly is something worth a second look.
type Anomaly struct {
	Kind          AnomalyKind
	TransactionID string // for outliers
	Date          string
	Payee         string
	CategoryID    string
	CategoryName  string
	Amount        money.Money
	Score         float64 // z-score for outliers; number of payments for new recurring
	Detail        string
}

const (
	minOutlierSample = 8
	newRecurringDays = 120
)

// Anomalies finds purchases that are unusually large for their category (above the upper IQR fence and
// at least 2.5 standard deviations above the mean) and recurring payments that started recently.
func (s *Service) Anomalies(ctx context.Context, f Filter) ([]Anomaly, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, err
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT id, COALESCE(category_id, ''), payee, `+q.date+`, `+q.value+` FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' AND `+q.value+` > 0`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type item struct {
		id, payee, date string
		v               int64
	}
	byCat := map[string][]item{}
	for rows.Next() {
		var it item
		var cat string
		if err := rows.Scan(&it.id, &cat, &it.payee, &it.date, &it.v); err != nil {
			return nil, err
		}
		byCat[cat] = append(byCat[cat], it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	catName := func(id string) string {
		if c, ok := cats[id]; ok {
			return c.NameEN
		}
		return "Uncategorized"
	}
	var out []Anomaly
	for cat, items := range byCat {
		if len(items) < minOutlierSample {
			continue
		}
		vals := make([]float64, len(items))
		var sum float64
		for i, it := range items {
			vals[i] = float64(it.v)
			sum += vals[i]
		}
		mean := sum / float64(len(vals))
		var sq float64
		for _, v := range vals {
			sq += (v - mean) * (v - mean)
		}
		sd := math.Sqrt(sq / float64(len(vals)))
		sort.Float64s(vals)
		q1, q3 := quantile(vals, 0.25), quantile(vals, 0.75)
		fence := q3 + 1.5*(q3-q1)
		for _, it := range items {
			if sd == 0 || float64(it.v) <= fence {
				continue
			}
			z := (float64(it.v) - mean) / sd
			if z < 2.5 {
				continue
			}
			out = append(out, Anomaly{Kind: Outlier, TransactionID: it.id, Date: it.date, Payee: it.payee, CategoryID: cat,
				CategoryName: catName(cat), Amount: q.money(it.v), Score: z,
				Detail: "far above this category's usual purchases"})
		}
	}
	rec, err := s.Recurring(ctx, f)
	if err != nil {
		return nil, err
	}
	cutoff := s.Now().AddDate(0, 0, -newRecurringDays).Format("2006-01-02")
	for _, r := range rec {
		if r.FirstDate >= cutoff {
			out = append(out, Anomaly{Kind: NewRecurring, Date: r.FirstDate, Payee: r.Payee, Amount: r.Typical,
				Score: float64(r.Count), Detail: string(r.Cadence) + " payment that started recently"})
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Kind != out[j].Kind {
			return out[i].Kind < out[j].Kind
		}
		if out[i].Score != out[j].Score {
			return out[i].Score > out[j].Score
		}
		return out[i].TransactionID < out[j].TransactionID
	})
	return out, nil
}

// quantile interpolates linearly in a sorted slice.
func quantile(sorted []float64, p float64) float64 {
	pos := p * float64(len(sorted)-1)
	lo := int(math.Floor(pos))
	hi := int(math.Ceil(pos))
	return sorted[lo] + (sorted[hi]-sorted[lo])*(pos-float64(lo))
}
