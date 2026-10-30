import { h, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, scope, periodRange, catName } from '../state.js';
import { money, compact, amount, pct, date, weekday, relDay, monthShort, addMonths, daysBetween, plural } from '../format.js';
import { columns, lines, hbars, legend, sparkline, timeline, SERIES } from '../charts.js';
import { chartTable, simpleTable, statusBadge, emptyState } from '../ui.js';
import { go } from '../main.js';

const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const cur = 'ILS';

// The range just before the selected one, same length, for "vs previous" deltas.
function priorRange() {
  const { from, to } = periodRange();
  const days = daysBetween(from, to) + 1;
  if (state.filters.period === 'all') return null;
  const pto = new Date(from + 'T00:00:00Z'); pto.setUTCDate(pto.getUTCDate() - 1);
  const pfrom = new Date(pto); pfrom.setUTCDate(pfrom.getUTCDate() - days + 1);
  return { from: pfrom.toISOString().slice(0, 10), to: pto.toISOString().slice(0, 10) };
}

function delta(now, before, { upIsGood, unit = 'money', label }) {
  if (before == null || before === 0) return null;
  const d = now - before, up = d >= 0, good = upIsGood ? up : !up;
  const text = unit === 'pct' ? (Math.abs(d) * 100).toFixed(1) + ' pts' : compact({ minor: Math.abs(d), currency: cur });
  return h('span', { class: ['delta', (up ? 'up-' : 'down-') + (good ? 'good' : 'bad')], title: label }, icon(up ? 'arrowup' : 'arrowdown', 'sm'), text, h('span', { class: 'muted', style: { fontWeight: 400 } }, ' ' + label));
}

function kpi(label, value, dl, series, color, avgText) {
  return h('div', { class: 'card tile' }, h('div', { class: 'label' }, label), h('div', { class: 'value amount' }, value),
    h('div', { class: 'foot' }, dl || h('span', { class: 'muted small' }, avgText || '')), series.length > 1 && sparkline(series, { color }));
}

export default {
  id: 'overview', title: 'Overview', filters: ['period', 'owner', 'measure'],
  sub: () => periodRange().from.slice(0, 7) === periodRange().to.slice(0, 7) ? 'This month so far' : date(periodRange().from) + ' – ' + date(periodRange().to),

  async render() {
    const q = scope({ measure: state.filters.measure });
    const prior = priorRange();
    const [nw, cf, cfPrior, bd, up, review, uncat, warn, proposals, rec] = await Promise.all([
      api.get('/api/v1/reports/net-worth', { ...q, measure: null }),
      api.get('/api/v1/reports/cash-flow', q),
      prior ? api.get('/api/v1/reports/cash-flow', { ...prior, owner: q.owner, measure: q.measure }) : null,
      api.get('/api/v1/reports/category-breakdown', q),
      api.get('/api/v1/billing/upcoming', { owner: q.owner }),
      api.get('/api/v1/transactions', { needs_review: true, limit: 1 }),
      api.get('/api/v1/transactions', { category_id: 'uncategorized', limit: 1 }),
      api.get('/api/v1/reports/warnings', { owner: q.owner }),
      api.get('/api/v1/settlements/proposals'),
      api.get('/api/v1/reports/recurring', { owner: q.owner }),
    ]);
    const months = cf.items;
    const inc = sum(months, (m) => m.income.minor), spend = sum(months, (m) => m.spending.minor);
    const rate = inc > 0 ? (inc - spend) / inc : null;
    const comparable = cfPrior && cfPrior.items.length === months.length; // never compare a year with a month of history
    const pInc = comparable ? sum(cfPrior.items, (m) => m.income.minor) : null, pSpend = cfPrior ? sum(cfPrior.items, (m) => m.spending.minor) : null;
    const pRate = pInc ? (pInc - pSpend) / pInc : null;
    const label = state.filters.period === 'm' ? 'vs last month' : 'vs before';
    const avg = (f) => (months.length ? compact({ minor: Math.round(sum(months, f) / months.length), currency: cur }) : '–');

    // --- net worth hero ---
    const pts = nw.items; const last = pts[pts.length - 1], first = pts[0];
    const hero = h('div', { class: 'card tile hero span-5' },
      h('div', { class: 'label' }, 'Net worth'), h('div', { class: 'value amount' }, last ? money(last.net_worth) : '–'),
      last && first && pts.length > 1 && h('div', { style: { marginTop: '8px' } },
        delta(last.net_worth.minor, first.net_worth.minor, { upIsGood: true, label: 'since ' + monthShort(first.date) + " '" + first.date.slice(2, 4) })),
      pts.length > 1 && h('div', { style: { marginTop: '14px' } }, lines({ dates: pts.map((p) => p.date), series: [{ name: 'Net worth', color: SERIES[0], values: pts.map((p) => p.net_worth.minor) }], height: 190, endLabels: false })),
      last && h('div', { class: 'row small muted', style: { marginTop: '12px', gap: '18px' } },
        h('span', null, 'In the bank ', h('b', { class: 'amount', style: { color: 'var(--ink)' } }, compact(last.assets))),
        h('span', null, 'Owed on cards ', h('b', { class: 'amount', style: { color: 'var(--ink)' } }, compact(last.liabilities)))));

    const tiles = h('div', { class: 'tiles' },
      kpi('Income', money({ minor: inc, currency: cur }, { whole: true }), delta(inc, pInc, { upIsGood: true, label }), months.map((m) => m.income.minor), SERIES[0], 'avg ' + avg((m) => m.income.minor) + ' a month'),
      kpi('Spending', money({ minor: spend, currency: cur }, { whole: true }), delta(spend, pSpend, { upIsGood: false, label }), months.map((m) => m.spending.minor), SERIES[1], 'avg ' + avg((m) => m.spending.minor) + ' a month'),
      kpi('Savings rate', rate == null ? '–' : pct(rate), rate != null && pRate != null ? delta(rate, pRate, { upIsGood: true, unit: 'pct', label }) : null, months.map((m) => m.savings_rate ?? 0), SERIES[2], 'saved after spending'));

    // --- cash flow ---
    const labels = months.map((m) => monthShort(m.month) + (m.month.endsWith('-01') ? " '" + m.month.slice(2, 4) : ''));
    const cfSeries = [{ name: 'Income', color: SERIES[0], values: months.map((m) => m.income.minor) }, { name: 'Spending', color: SERIES[1], values: months.map((m) => m.spending.minor) }];
    const cfView = chartTable(
      () => h('div', { class: 'stack', style: { gap: '12px' } }, legend(cfSeries.map((x) => ({ color: x.color, label: x.name }))), months.length ? columns({ labels, groupLabels: months.map((m) => monthShort(m.month) + ' ' + m.month.slice(0, 4)), series: cfSeries }) : emptyState('chart', 'No data in this period')),
      () => simpleTable([{ label: 'Month' }, { label: 'Income', num: true }, { label: 'Spending', num: true }, { label: 'Net', num: true }, { label: 'Saved', num: true }],
        months.map((m) => [monthShort(m.month) + ' ' + m.month.slice(0, 4), h('span', { class: 'amount' }, money(m.income)), h('span', { class: 'amount' }, money(m.spending)), h('span', { class: 'amount' }, money(m.net, { sign: true })), h('span', { class: 'amount' }, m.savings_rate == null ? '–' : pct(m.savings_rate))])));
    const cashflow = h('div', { class: 'card span-7' },
      h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Income and spending'), h('div', { class: 'sub' }, state.filters.measure === 'GROSS' ? 'Spending as bought, including what your employer covers' : 'Spending after employer coverage: what left your accounts')), cfView.toggle), cfView.body);

    // --- needs attention ---
    const todo = [];
    if (review.total) todo.push(['sparkle', review.total + ' ' + (review.total === 1 ? 'transaction' : 'transactions') + ' to review', 'Categorized by the model, waiting for your OK', () => go('/transactions?review=1')]);
    if (uncat.total) todo.push(['tag', uncat.total + ' without a category', 'The model was not sure enough to pick one', () => go('/transactions?category=uncategorized')]);
    if (proposals.items.length) todo.push(['link', plural(proposals.items.length, 'bank debit') + ' to match', 'Looks like a card payment: ' + proposals.items[0].account_name + ', ' + date(proposals.items[0].bill_date), () => go('/cards'), true]);
    else if (warn.unlinked_card_payments.length) todo.push(['alert', plural(warn.unlinked_card_payments.length, 'unlinked card payment'), money(warn.counted) + ' counted as spending', () => go('/cards'), true]);
    const attention = h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('h2', null, 'Needs your attention')),
      todo.length ? h('ul', { class: 'list' }, todo.map(([ic, t1, t2, fn, warnStyle]) => h('li', null, h('button', { class: 'todo', type: 'button', onclick: fn },
        h('span', { class: ['ico', warnStyle && 'warn'] }, icon(ic)), h('span', null, h('div', { class: 't1' }, t1), h('div', { class: 't2' }, t2)), h('span', { class: 'go' }, icon('right', 'sm'))))))
        : emptyState('circlecheck', 'All caught up', 'Nothing is waiting for review.'));

    // --- categories ---
    const items = bd.items;
    const top = items.slice(0, 8);
    const catView = chartTable(
      () => items.length ? hbars(top.map((c, i) => { const cat = state.catById.get(c.category_id); const n = catName(cat || { name_en: c.name_en, name_he: c.name_he });
        return { name: n.main, alt: n.alt, value: c.amount.minor, valueText: money(c.amount, { whole: true }), sub: pct(c.share), id: c.category_id }; }),
        { onPick: (it) => go('/transactions?category=' + (it.id || 'uncategorized') + '&period=' + state.filters.period) }) : emptyState('chart', 'No spending in this period'),
      () => simpleTable([{ label: 'Category' }, { label: 'Spent', num: true }, { label: 'Share', num: true }, { label: 'Transactions', num: true }],
        items.map((c) => [h('span', null, ut(c.name_en), ' ', h('span', { class: 'muted' }, ut(c.name_he))), h('span', { class: 'amount' }, money(c.amount)), pct(c.share, 1), String(c.transactions)])));
    const cats = h('div', { class: 'card span-6' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Where the money went'), h('div', { class: 'sub' }, 'Top ' + Math.min(8, items.length) + ' of ' + items.length + ' categories · ' + money(bd.total, { whole: true }))), catView.toggle), catView.body,
      items.length > 8 && h('div', { style: { marginTop: '12px' } }, h('a', { class: 'btn ghost sm', href: '#/reports' }, 'All categories', icon('right', 'sm'))));

    // --- upcoming bills ---
    const days = up.items.slice(0, 4);
    const bills = h('div', { class: 'card span-5' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Coming out of the bank'), h('div', { class: 'sub' }, 'Card bills that have not been paid yet')), h('a', { class: 'btn ghost sm', href: '#/cards' }, 'All bills', icon('right', 'sm'))),
      days.length ? h('ul', { class: 'list' }, days.map((d) => h('li', { style: { alignItems: 'flex-start' } },
        h('div', { style: { width: '92px', flex: 'none' } }, h('div', { class: 'strong' }, weekday(d.date) + ' ' + date(d.date, { year: false })), h('div', { class: 'muted xs' }, relDay(d.date, state.today))),
        h('div', { class: 'grow stack', style: { gap: '6px' } }, d.statements.map((s) => h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'grow' }, ut(s.account_name)), statusBadge(s.status)))),
        h('div', { class: 'strong amount' }, money(d.total))))) : emptyState('circlecheck', 'Nothing due', 'Every card bill is paid.'),
      up.items.length > 1 && h('div', { style: { marginTop: '14px', paddingTop: '8px', borderTop: '1px solid var(--line)' } }, timeline(up.items.slice(0, 6).map((d) => ({ value: d.total.minor, when: weekday(d.date) + ' ' + date(d.date, { year: false }), sub: relDay(d.date, state.today), label: date(d.date, { weekday: true }), rows: d.statements.map((s) => ({ name: s.account_name, value: money({ minor: s.expected.minor - s.settled.minor, currency: cur }) })) })), { currency: cur })));

    // --- recurring payments ---
    const recs = rec.items.slice(0, 6);
    const monthly = sum(rec.items, (r) => r.monthly_cost.minor);
    const recurring = h('div', { class: 'card span-6' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Recurring payments'), h('div', { class: 'sub' }, rec.items.length ? rec.items.length + ' found · about ' + money({ minor: monthly, currency: cur }, { whole: true }) + ' a month' : 'Detected from repeated charges')), h('a', { class: 'btn ghost sm', href: '#/reports/recurring' }, 'See all', icon('right', 'sm'))),
      recs.length ? h('ul', { class: 'list' }, recs.map((r) => h('li', null,
        h('div', { class: 'grow', style: { minWidth: 0 } }, utBlock(r.payee, 'strong'), h('div', { class: 'muted xs' }, (r.fixed ? 'Fixed' : 'Varies') + ' · ' + r.cadence.toLowerCase() + ' · next ' + date(r.next_expected, { year: false }))),
        h('div', { class: 'strong amount' }, money(r.typical), h('span', { class: 'muted', style: { fontWeight: 400 } }, '/' + ({ MONTHLY: 'mo', WEEKLY: 'wk', QUARTERLY: 'qtr', YEARLY: 'yr' }[r.cadence] || ''))))))
        : emptyState('swap', 'Nothing recurring yet', 'Needs at least three payments to the same payee.'));

    const right = h('div', { class: 'span-7 stack', style: { gap: 'var(--s-5)' } }, tiles, attention);
    return h('div', { class: 'grid' }, hero, right, cashflow, bills, cats, recurring);
  },
};
