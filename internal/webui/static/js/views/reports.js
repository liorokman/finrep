import { h, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, scope, catName, periodRange } from '../state.js';
import { money, compact, amount, pct, date, monthShort, monthLong } from '../format.js';
import { columns, lines, hbars, heatmap, legend, SERIES } from '../charts.js';
import { chartTable, simpleTable, emptyState, statusBadge, segmented } from '../ui.js';
import { go } from '../main.js';

const cur = 'ILS';
let heatScale = 'all';
const label = (c) => catName(state.catById.get(c.category_id) || { name_en: c.name_en, name_he: c.name_he });
const toTx = (id) => '/transactions?category=' + (id || 'uncategorized') + '&period=' + state.filters.period;

const TABS = [
  ['categories', 'Categories', async () => {
    const q = scope({ measure: state.filters.measure });
    const bd = await api.get('/api/v1/reports/category-breakdown', q); const items = bd.items;
    const view = chartTable(
      () => items.length ? hbars(items.map((c) => { const n = label(c); return { name: n.main, alt: n.alt, value: c.amount.minor, valueText: money(c.amount, { whole: true }), sub: pct(c.share, 1), id: c.category_id }; }), { onPick: (it) => go(toTx(it.id)) }) : emptyState('chart', 'No spending in this period'),
      () => simpleTable([{ label: 'Category' }, { label: 'Spent', num: true }, { label: 'Share', num: true }, { label: 'Transactions', num: true }], items.map((c) => [h('span', null, ut(c.name_en), ' ', h('span', { class: 'muted' }, ut(c.name_he))), h('span', { class: 'amount' }, money(c.amount)), pct(c.share, 1), String(c.transactions)])));
    return card('Spending by category', money(bd.total, { whole: true }) + ' across ' + items.length + ' categories · click a bar to see its transactions', view);
  }],
  ['heatmap', 'Heatmap', async () => {
    const q = scope({ measure: state.filters.measure });
    const hm = await api.get('/api/v1/reports/heatmap', q);
    const rows = hm.rows.map((r) => ({ name: label(r).main, cells: r.cells.map((c) => c.minor), total: r.total.minor, id: r.category_id }));
    const view = chartTable(
      () => rows.length ? h('div', { class: 'stack' }, h('div', { class: 'row wrap' }, h('div', { class: 'scale' }, 'Less', h('i', { class: 'ramp' }), 'More'), h('span', { class: 'spacer row small muted', style: { gap: '8px' } }, 'Shade by', segmented('Shade by', [{ value: 'all', label: 'All categories' }, { value: 'row', label: 'Each category' }], heatScale, (v) => { heatScale = v; view.redraw(); }))), h('div', { class: 'table-wrap' }, heatmap({ months: hm.months, rows, totals: hm.totals.map((t) => t.minor), perRow: heatScale === 'row', onCell: (r) => go(toTx(r.id)) }))) : emptyState('chart', 'No spending in this period'),
      () => simpleTable([{ label: 'Category' }, ...hm.months.map((m) => ({ label: monthShort(m) + ' ' + m.slice(2, 4), num: true })), { label: 'Total', num: true }],
        [...hm.rows.map((r) => [ut(label(r).main), ...r.cells.map((c) => h('span', { class: 'amount' }, compact(c))), h('span', { class: 'amount strong' }, compact(r.total))]), [h('strong', null, 'All'), ...hm.totals.map((c) => h('span', { class: 'amount strong' }, compact(c))), h('span', { class: 'amount strong' }, compact({ minor: hm.totals.reduce((a, t) => a + t.minor, 0), currency: cur }))]]));
    return card('Month by category', 'Darker means more spending. Click a cell to see those transactions.', view);
  }],
  ['cashflow', 'Cash flow', async () => {
    const cf = await api.get('/api/v1/reports/cash-flow', scope({ measure: state.filters.measure })); const ms = cf.items;
    const ser = [{ name: 'Income', color: SERIES[0], values: ms.map((m) => m.income.minor) }, { name: 'Spending', color: SERIES[1], values: ms.map((m) => m.spending.minor) }];
    const view = chartTable(() => h('div', { class: 'stack' }, legend(ser.map((x) => ({ color: x.color, label: x.name }))), columns({ labels: ms.map((m) => monthShort(m.month) + (m.month.endsWith('-01') ? " '" + m.month.slice(2, 4) : '')), groupLabels: ms.map((m) => monthLong(m.month)), series: ser, height: 300 })),
      () => simpleTable([{ label: 'Month' }, { label: 'Income', num: true }, { label: 'Spending', num: true }, { label: 'Net', num: true }, { label: 'Saved', num: true }], ms.map((m) => [monthLong(m.month), h('span', { class: 'amount' }, money(m.income)), h('span', { class: 'amount' }, money(m.spending)), h('span', { class: 'amount' }, money(m.net, { sign: true })), m.savings_rate == null ? '–' : pct(m.savings_rate)])));
    return card('Income and spending', state.filters.measure === 'GROSS' ? 'Spending as bought' : 'Spending after employer coverage', view);
  }],
  ['networth', 'Net worth', async () => {
    const nw = await api.get('/api/v1/reports/net-worth', scope()); const pts = nw.items;
    const ser = [{ name: 'Net worth', color: SERIES[0], values: pts.map((p) => p.net_worth.minor) }, { name: 'In the bank', color: SERIES[2], values: pts.map((p) => p.assets.minor) }, { name: 'Owed on cards', color: SERIES[1], values: pts.map((p) => p.liabilities.minor) }];
    const view = chartTable(() => h('div', { class: 'stack' }, legend(ser.map((x) => ({ color: x.color, label: x.name, line: true }))), lines({ dates: pts.map((p) => p.date), series: ser, height: 320 })),
      () => simpleTable([{ label: 'Date' }, { label: 'In the bank', num: true }, { label: 'Owed on cards', num: true }, { label: 'Net worth', num: true }], pts.map((p) => [date(p.date), h('span', { class: 'amount' }, money(p.assets)), h('span', { class: 'amount' }, money(p.liabilities)), h('span', { class: 'amount strong' }, money(p.net_worth))])));
    return card('Net worth over time', 'Bank balances minus card charges that have not been paid by a bank debit yet', view);
  }],
  ['budgets', 'Budgets', async () => {
    const to = state.today, from = to.slice(0, 8) + '01';
    const b = await api.get('/api/v1/reports/budget', { from, to, owner: state.filters.owner });
    const rows = b.items?.filter((r) => r.month === to.slice(0, 7)) || [];
    if (!rows.length) return card('Budgets this month', 'Set a monthly budget on a category to track it here.', { toggle: null, body: emptyState('tag', 'No budgets yet', 'Add a monthly budget to a category.', h('a', { class: 'btn sm', href: '#/categories' }, 'Open categories')) });
    return card('Budgets this month', date(from, { year: false }) + ' – ' + date(to, { year: false }), { toggle: null, body: h('ul', { class: 'list' }, rows.map((r) => { const used = r.percent_used; const over = used > 1; return h('li', { style: { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } },
      h('div', { class: 'row' }, utBlock(label({ name_en: r.name_en, name_he: r.name_he, category_id: r.category_id }).main, 'strong grow'), h('span', { class: 'amount' }, money(r.actual, { whole: true }) + ' of ' + money(r.budget, { whole: true }))),
      h('div', { class: 'meter', role: 'img', 'aria-label': Math.round(used * 100) + '% of budget used' }, h('i', { style: { '--w': Math.min(100, used * 100), background: over ? 'var(--crit)' : null } })),
      h('div', { class: ['small', over ? 'delta up-bad' : 'muted'] }, over && icon('alert', 'sm'), over ? 'Over by ' + money({ minor: -r.remaining.minor, currency: cur }, { whole: true }) : money(r.remaining, { whole: true }) + ' left')); })) });
  }],
  ['recurring', 'Recurring', async () => {
    const r = await api.get('/api/v1/reports/recurring', { owner: state.filters.owner }); const it = r.items;
    return card('Recurring payments', it.length ? 'About ' + money({ minor: it.reduce((a, x) => a + x.monthly_cost.minor, 0), currency: cur }, { whole: true }) + ' a month' : 'Detected from repeated charges to the same payee', { toggle: null, body: it.length ? simpleTable([{ label: 'Payee' }, { label: 'How often' }, { label: 'Typical', num: true }, { label: 'Per month', num: true }, { label: 'Last paid' }, { label: 'Next expected' }],
      it.map((x) => [utBlock(x.payee, 'strong'), (x.fixed ? 'Fixed ' : 'Varies ') + x.cadence.toLowerCase(), h('span', { class: 'amount' }, money(x.typical)), h('span', { class: 'amount' }, money(x.monthly_cost)), date(x.last_date), x.active ? date(x.next_expected) : h('span', { class: 'muted' }, 'Looks stopped')])) : emptyState('swap', 'Nothing recurring yet') });
  }],
];

function card(title, sub, view) {
  return h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, title), h('div', { class: 'sub' }, sub)), view.toggle), view.body);
}

export default {
  id: 'reports', title: 'Reports', filters: ['period', 'owner', 'measure'],
  sub: () => 'Every number here comes from the same rules as the overview',
  async render(ctx) {
    const cur = TABS.find((t) => t[0] === ctx.rest[0]) || TABS[0];
    const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Reports' }, TABS.map((t) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(t === cur), onclick: () => go('/reports/' + t[0]) }, t[1])));
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, tabs, await cur[2]());
  },
};
