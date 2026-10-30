package reports

import (
	"context"
	"sort"

	"github.com/liorokman/finrep/internal/money"
)

// ---- 2. Cash flow ----

// CashFlowMonth is one month of income, spending and what is left.
type CashFlowMonth struct {
	Month       string
	Income      money.Money
	Spending    money.Money
	Net         money.Money
	SavingsRate *float64 // net / income; nil when there was no income
}

// CashFlow returns income, spending, net and savings rate for each month in the range. The default
// measure is out of pocket, so it ties to what actually left the bank.
func (s *Service) CashFlow(ctx context.Context, f Filter) ([]CashFlowMonth, error) {
	q, err := f.compile(OutOfPocket)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT substr(`+q.date+`,1,7), flow, COALESCE(SUM(`+q.value+`),0) FROM ledger_view
		WHERE `+q.where+` AND flow <> 'EXCLUDED' GROUP BY 1, 2`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type pair struct{ inc, spend int64 }
	byMonth := map[string]*pair{}
	var lo, hi string
	for rows.Next() {
		var m, flow string
		var v int64
		if err := rows.Scan(&m, &flow, &v); err != nil {
			return nil, err
		}
		p := byMonth[m]
		if p == nil {
			p = &pair{}
			byMonth[m] = p
		}
		if flow == "INCOME" {
			p.inc += v
		} else {
			p.spend += v
		}
		if lo == "" || m < lo {
			lo = m
		}
		if m > hi {
			hi = m
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	var out []CashFlowMonth
	for _, m := range months(lo, hi) {
		p := byMonth[m]
		if p == nil {
			p = &pair{}
		}
		row := CashFlowMonth{Month: m, Income: q.money(p.inc), Spending: q.money(p.spend), Net: q.money(p.inc - p.spend)}
		if p.inc > 0 {
			r := float64(p.inc-p.spend) / float64(p.inc)
			row.SavingsRate = &r
		}
		out = append(out, row)
	}
	return out, nil
}

// ---- 3. Category breakdown ----

// CategoryTotal is one slice of the breakdown.
type CategoryTotal struct {
	CategoryID   string // empty for uncategorized
	NameEN       string
	NameHE       string
	ParentID     string
	Amount       money.Money
	Share        float64 // of the total, 0 when the total is not positive
	Transactions int
}

// CategoryBreakdown totals spending by category, largest first. Click-through uses CategoryID with
// the same dates in a transaction query.
func (s *Service) CategoryBreakdown(ctx context.Context, f Filter) ([]CategoryTotal, money.Money, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, money.Money{}, err
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, money.Money{}, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT COALESCE(category_id, ''), COALESCE(SUM(`+q.value+`),0), COUNT(*) FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' GROUP BY 1`, q.args...)
	if err != nil {
		return nil, money.Money{}, err
	}
	defer rows.Close()
	var out []CategoryTotal
	var total int64
	for rows.Next() {
		var ct CategoryTotal
		var v int64
		if err := rows.Scan(&ct.CategoryID, &v, &ct.Transactions); err != nil {
			return nil, money.Money{}, err
		}
		ct.Amount = q.money(v)
		total += v
		if c, ok := cats[ct.CategoryID]; ok {
			ct.NameEN, ct.NameHE = c.NameEN, c.NameHE
			if c.ParentID != nil {
				ct.ParentID = *c.ParentID
			}
		} else {
			ct.NameEN, ct.NameHE = "Uncategorized", "ללא קטגוריה"
		}
		out = append(out, ct)
	}
	if err := rows.Err(); err != nil {
		return nil, money.Money{}, err
	}
	for i := range out {
		if total > 0 {
			out[i].Share = float64(out[i].Amount.Minor()) / float64(total)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Amount.Minor() != out[j].Amount.Minor() {
			return out[i].Amount.Minor() > out[j].Amount.Minor()
		}
		return out[i].NameEN < out[j].NameEN
	})
	return out, q.money(total), nil
}

// ---- 7. Month x category heatmap ----

type HeatRow struct {
	CategoryID string
	NameEN     string
	NameHE     string
	Cells      []money.Money // one per month in Heatmap.Months
	Total      money.Money
}

type Heatmap struct {
	Months []string
	Rows   []HeatRow // largest total first; keyed by category id
	Totals []money.Money
}

// Heatmap lays spending out by month and category.
func (s *Service) Heatmap(ctx context.Context, f Filter) (*Heatmap, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, err
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT COALESCE(category_id, ''), substr(`+q.date+`,1,7), COALESCE(SUM(`+q.value+`),0) FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' GROUP BY 1, 2`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cell := map[string]map[string]int64{}
	var lo, hi string
	for rows.Next() {
		var id, m string
		var v int64
		if err := rows.Scan(&id, &m, &v); err != nil {
			return nil, err
		}
		if cell[id] == nil {
			cell[id] = map[string]int64{}
		}
		cell[id][m] = v
		if lo == "" || m < lo {
			lo = m
		}
		if m > hi {
			hi = m
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	h := &Heatmap{Months: months(lo, hi)}
	h.Totals = make([]money.Money, len(h.Months))
	colSum := make([]int64, len(h.Months))
	for id, byMonth := range cell {
		r := HeatRow{CategoryID: id, Cells: make([]money.Money, len(h.Months))}
		if c, ok := cats[id]; ok {
			r.NameEN, r.NameHE = c.NameEN, c.NameHE
		} else {
			r.NameEN, r.NameHE = "Uncategorized", "ללא קטגוריה"
		}
		var sum int64
		for i, m := range h.Months {
			r.Cells[i] = q.money(byMonth[m])
			sum += byMonth[m]
			colSum[i] += byMonth[m]
		}
		r.Total = q.money(sum)
		h.Rows = append(h.Rows, r)
	}
	for i := range colSum {
		h.Totals[i] = q.money(colSum[i])
	}
	sort.SliceStable(h.Rows, func(i, j int) bool {
		if h.Rows[i].Total.Minor() != h.Rows[j].Total.Minor() {
			return h.Rows[i].Total.Minor() > h.Rows[j].Total.Minor()
		}
		return h.Rows[i].NameEN < h.Rows[j].NameEN
	})
	return h, nil
}

// ---- 4. Sankey ----

type SankeyNode struct {
	ID    string // inc:<category>, acc:<account>, exp:<category>
	Label string
	Side  string // INCOME, ACCOUNT or SPENDING
}

type SankeyLink struct {
	From, To string
	Amount   money.Money
}

type Sankey struct {
	Nodes []SankeyNode
	Links []SankeyLink
}

// Sankey flows income sources into the accounts they land in, and accounts into spending categories.
// Only positive flows are drawn; refunds that net a category below zero are left out.
func (s *Service) Sankey(ctx context.Context, f Filter) (*Sankey, error) {
	q, err := f.compile(OutOfPocket)
	if err != nil {
		return nil, err
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT flow, account_id, account_name, COALESCE(category_id, ''), COALESCE(SUM(`+q.value+`),0) FROM ledger_view
		WHERE `+q.where+` AND flow <> 'EXCLUDED' GROUP BY 1, 2, 3, 4`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sk := &Sankey{}
	seen := map[string]bool{}
	node := func(id, label, side string) string {
		if !seen[id] {
			seen[id] = true
			sk.Nodes = append(sk.Nodes, SankeyNode{id, label, side})
		}
		return id
	}
	label := func(catID, flow string) string {
		if c, ok := cats[catID]; ok {
			return c.NameEN
		}
		if flow == "INCOME" {
			return "Other income"
		}
		return "Uncategorized"
	}
	for rows.Next() {
		var flow, accID, accName, catID string
		var v int64
		if err := rows.Scan(&flow, &accID, &accName, &catID, &v); err != nil {
			return nil, err
		}
		if v <= 0 {
			continue
		}
		acc := node("acc:"+accID, accName, "ACCOUNT")
		if flow == "INCOME" {
			src := node("inc:"+catID, label(catID, flow), "INCOME")
			sk.Links = append(sk.Links, SankeyLink{src, acc, q.money(v)})
		} else {
			dst := node("exp:"+catID, label(catID, flow), "SPENDING")
			sk.Links = append(sk.Links, SankeyLink{acc, dst, q.money(v)})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.SliceStable(sk.Links, func(i, j int) bool {
		if sk.Links[i].From != sk.Links[j].From {
			return sk.Links[i].From < sk.Links[j].From
		}
		return sk.Links[i].To < sk.Links[j].To
	})
	return sk, nil
}

// ---- 5. Budget vs actual ----

type BudgetRow struct {
	CategoryID  string
	NameEN      string
	NameHE      string
	Month       string
	Budget      money.Money
	Actual      money.Money // the category plus its sub-categories
	Remaining   money.Money
	PercentUsed float64
}

// BudgetVsActual compares each budgeted category's monthly budget with its spending, for each month in
// the range. Sub-categories count toward their parent's budget.
func (s *Service) BudgetVsActual(ctx context.Context, f Filter) ([]BudgetRow, error) {
	q, err := f.compile(Gross)
	if err != nil {
		return nil, err
	}
	cats, err := s.catNames(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.st.QueryContext(ctx, `SELECT COALESCE(category_id, ''), substr(`+q.date+`,1,7), COALESCE(SUM(`+q.value+`),0) FROM ledger_view
		WHERE `+q.where+` AND flow = 'SPEND' GROUP BY 1, 2`, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	spent := map[string]map[string]int64{} // category -> month -> amount
	var lo, hi string
	for rows.Next() {
		var id, m string
		var v int64
		if err := rows.Scan(&id, &m, &v); err != nil {
			return nil, err
		}
		if spent[id] == nil {
			spent[id] = map[string]int64{}
		}
		spent[id][m] = v
		if lo == "" || m < lo {
			lo = m
		}
		if m > hi {
			hi = m
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Roll each category's spending up into every ancestor.
	rolled := map[string]map[string]int64{}
	for id, byMonth := range spent {
		for cur, hops := id, 0; cur != "" && hops < 64; hops++ {
			if rolled[cur] == nil {
				rolled[cur] = map[string]int64{}
			}
			for m, v := range byMonth {
				rolled[cur][m] += v
			}
			c, ok := cats[cur]
			if !ok || c.ParentID == nil {
				break
			}
			cur = *c.ParentID
		}
	}
	var out []BudgetRow
	for _, m := range months(lo, hi) {
		for id, c := range cats {
			if c.MonthlyBudget == nil || c.MonthlyBudget.Currency() != q.cur || c.Type != "EXPENSE" {
				continue
			}
			actual := rolled[id][m]
			budget := c.MonthlyBudget.Minor()
			r := BudgetRow{CategoryID: id, NameEN: c.NameEN, NameHE: c.NameHE, Month: m,
				Budget: q.money(budget), Actual: q.money(actual), Remaining: q.money(budget - actual)}
			if budget > 0 {
				r.PercentUsed = float64(actual) / float64(budget)
			}
			out = append(out, r)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Month != out[j].Month {
			return out[i].Month < out[j].Month
		}
		return out[i].NameEN < out[j].NameEN
	})
	return out, nil
}
