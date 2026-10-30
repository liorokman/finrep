import { h, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, scope, catName, periodRange, setPrefs } from '../state.js';
import { money, compact, amount, pct, date, monthShort, monthLong, plural } from '../format.js';
import { columns, lines, hbars, heatmap, legend, SERIES } from '../charts.js';
import { chartTable, simpleTable, emptyState, statusBadge, segmented, dateField } from '../ui.js';
import { go } from '../main.js';

const cur = 'ILS';
let heatScale = 'all';
const label = (c) => catName(state.catById.get(c.category_id) || { name_en: c.name_en, name_he: c.name_he });
const toTx = (id) => '/transactions?category=' + (id || 'uncategorized') + '&period=' + state.filters.period;

const TABS = [
  ['summary', 'Summary', async () => {
    // What to compare with is remembered; the dates only matter for a custom range.
    const cp = state.prefs.compare || { mode: 'previous', from: '', to: '' }, mode = cp.mode;
    const cmpQ = mode === 'year' ? { compare: 'year' } : mode === 'custom' && cp.from && cp.to ? { compare_from: cp.from, compare_to: cp.to } : {};
    const r = await api.get('/api/v1/reports/summary', scope({ measure: state.filters.measure, ...cmpQ }));
    const cmp = r.comparison;
    const months = r.days / 30.4375;
    const span = (a, b) => date(a) + ' – ' + date(b);
    // A comparison with a period the data only partly covers would flatter or punish this one, so it is not
    // shown in the tiles unless it was asked for by dates.
    const shown = cmp && (cmp.complete || mode === 'custom');
    const vs = mode === 'year' ? 'vs a year earlier' : mode === 'custom' && cmp ? 'vs ' + span(cmp.from, cmp.to) : 'vs the period before';
    const chg = (x, upIsGood) => x == null ? null : h('span', { class: ['delta', ((x >= 0) === upIsGood ? 'up-good' : 'up-bad')], title: 'Compared with ' + span(cmp.from, cmp.to) },
      icon(x >= 0 ? 'arrowup' : 'arrowdown', 'sm'), Math.abs(x * 100).toFixed(0) + '%', h('span', { class: 'muted', style: { fontWeight: 400 } }, ' ' + vs));
    const tile = (label, value, perMonth, delta) => h('div', { class: 'card tile' }, h('div', { class: 'label' }, label), h('div', { class: 'value amount' }, money(value, { whole: true })),
      h('div', { class: 'foot' }, delta || h('span', { class: 'muted small' }, '')), h('div', { class: 'muted small' }, perMonth));
    const row = (k, v, hint) => [h('dt', { title: hint }, k), h('dd', null, v)];
    const kv = [
      ...row('Average month', money(r.per_month.spending, { whole: true }) + ' spent · ' + money(r.per_month.income, { whole: true }) + ' earned', 'The period scaled to a 30.4-day month, so it works for part-months too'),
      ...row('Kept in an average month', money(r.per_month.net, { whole: true, sign: true })),
      r.median_month_spending && row('Typical month (median)', money(r.median_month_spending, { whole: true }) + ' spent', 'Half the full months cost less, half more; one big month does not move it'),
      ...row('Spending per day', money(r.spending_per_day, { whole: true })),
      r.highest_spending_month && row('Costliest month', monthLong(r.highest_spending_month.month) + ' · ' + money(r.highest_spending_month.amount, { whole: true })),
      r.lowest_spending_month && row('Cheapest month', monthLong(r.lowest_spending_month.month) + ' · ' + money(r.lowest_spending_month.amount, { whole: true })),
      r.purchases > 0 && row('Average purchase', money(r.average_purchase) + ' over ' + plural(r.purchases, 'purchase'), 'Card bills paid from the bank are one lump, not a purchase, so they are left out'),
    ].filter(Boolean).flat();
    const note = r.complete_months === 0 ? 'No month in this period is over yet, so the averages are scaled from ' + plural(r.days, 'day') + '.' : plural(r.complete_months, 'full month') + ' counted for the costliest, cheapest and typical month.';

    // ----- what to compare with -----
    const setCmp = (patch) => setPrefs({ compare: { ...cp, ...patch } });
    const lim = { min: '2023-01-01', max: state.today };
    const controls = h('div', { class: 'row wrap', style: { gap: 'var(--s-4)', alignItems: 'flex-end' } },
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Compare with'),
        segmented('Compare with', [{ value: 'previous', label: 'Previous period' }, { value: 'year', label: 'Same time last year' }, { value: 'custom', label: 'Custom range' }], mode,
          (m) => setCmp(m === 'custom' && !(cp.from && cp.to) && cmp ? { mode: m, from: cmp.from, to: cmp.to } : { mode: m }))),
      mode === 'custom' && dateField('From', cp.from, (v) => setCmp({ from: v, to: cp.to && cp.to < v ? v : cp.to }), lim),
      mode === 'custom' && dateField('To', cp.to, (v) => setCmp({ to: v, from: cp.from && cp.from > v ? v : cp.from }), lim),
      h('span', { class: 'muted small', style: { paddingBottom: '8px' } }, cmp ? 'Comparing ' + span(r.from, r.to) + ' with ' + span(cmp.from, cmp.to) + (cmp.complete ? '' : ' (the data does not cover all of it)') : mode === 'custom' ? 'Pick the dates of the other period' : 'Nothing to compare with before this period'));

    // ----- the comparison -----
    const none = h('span', { class: 'muted' }, '–');
    const diff = (now, then, upIsGood) => now === then ? none : h('span', { class: ['amount', (now > then) === upIsGood ? 'pos' : 'neg'] }, money({ minor: now - then, currency: cur }, { whole: true, sign: true }));
    const pc = (x, upIsGood) => x == null ? none : h('span', { class: ['amount', (x >= 0) === upIsGood ? 'pos' : 'neg'] }, (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(0) + '%');
    const amt = (m) => h('span', { class: 'amount' }, money(m, { whole: true }));
    let comparison = null;
    if (cmp) {
      const rate = (x) => x == null ? none : h('span', { class: 'amount' }, pct(x));
      const rateDiff = r.savings_rate == null || cmp.savings_rate == null ? none : (() => { const d = (r.savings_rate - cmp.savings_rate) * 100; return d === 0 ? none : h('span', { class: ['amount', d > 0 ? 'pos' : 'neg'] }, (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' pts'); })();
      const head = simpleTable([{ label: '' }, { label: date(r.from, { year: true }) + ' – ' + date(r.to, { year: true }), num: true }, { label: span(cmp.from, cmp.to), num: true }, { label: 'Change', num: true }, { label: '', num: true }], [
        ['Income', amt(r.income), amt(cmp.income), diff(r.income.minor, cmp.income.minor, true), pc(cmp.income_change, true)],
        ['Spending', amt(r.spending), amt(cmp.spending), diff(r.spending.minor, cmp.spending.minor, false), pc(cmp.spending_change, false)],
        ['Kept', amt(r.net), amt(cmp.net), diff(r.net.minor, cmp.net.minor, true), pc(cmp.net_change, true)],
        ['Share of income kept', rate(r.savings_rate), rate(cmp.savings_rate), rateDiff, none],
        ['Spending in an average month', amt(r.per_month.spending), amt(cmp.per_month.spending), diff(r.per_month.spending.minor, cmp.per_month.spending.minor, false), pc(cmp.per_month.spending.minor ? (r.per_month.spending.minor - cmp.per_month.spending.minor) / cmp.per_month.spending.minor : null, false)],
        ['Spending per day', amt(r.spending_per_day), amt(cmp.spending_per_day), diff(r.spending_per_day.minor, cmp.spending_per_day.minor, false), pc(cmp.spending_per_day.minor ? (r.spending_per_day.minor - cmp.spending_per_day.minor) / cmp.spending_per_day.minor : null, false)],
      ]);
      const cats = cmp.categories.slice(0, 12);
      const what = simpleTable([{ label: 'Category' }, { label: 'This period', num: true }, { label: 'Compared', num: true }, { label: 'Change', num: true }, { label: '', num: true }],
        cats.map((c) => [h('span', null, ut(label(c).main), label(c).alt && [' ', h('span', { class: 'muted' }, ut(label(c).alt))]), amt(c.current), amt(c.other), diff(c.current.minor, c.other.minor, false), pc(c.change_pct, false)]));
      const ms = cmp.months;
      const ser = [{ name: 'This period', color: SERIES[0], values: ms.map((m) => m.spending.minor) }, { name: 'Compared period', color: SERIES[1], values: ms.map((m) => m.other_spending.minor) }];
      const monthsView = ms.length > 1 ? chartTable(
        () => h('div', { class: 'stack' }, legend(ser.map((x) => ({ color: x.color, label: x.name }))), columns({ labels: ms.map((m) => monthShort(m.month || m.other_month)), groupLabels: ms.map((m) => (m.month ? monthLong(m.month) : '–') + ' vs ' + (m.other_month ? monthLong(m.other_month) : '–')), series: ser, height: 240 })),
        () => simpleTable([{ label: 'This period' }, { label: 'Spending', num: true }, { label: 'Compared month' }, { label: 'Spending', num: true }, { label: 'Change', num: true }],
          ms.map((m) => [m.month ? monthLong(m.month) : '–', amt(m.spending), m.other_month ? monthLong(m.other_month) : '–', amt(m.other_spending), diff(m.spending.minor, m.other_spending.minor, false)]))) : null;
      comparison = h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
        card('How it compares', span(r.from, r.to) + ' against ' + span(cmp.from, cmp.to) + ' · green is better, red is worse', { toggle: null, body: head }),
        monthsView && card('Month by month', 'Spending, the first month of each period against the first of the other, and so on', monthsView),
        cats.length > 0 && card('What changed', cmp.categories.length > cats.length ? 'The ' + cats.length + ' biggest changes of ' + cmp.categories.length + ' categories' : 'Spending by category, the biggest change first', { toggle: null, body: what }));
    }
    if (!r.income.minor && !r.spending.minor && !cmp) return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, controls, card('Summary', 'Nothing in this period', { toggle: null, body: emptyState('card', 'No transactions in this period', 'Try a longer period.') }));
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
      controls,
      h('div', { class: 'tiles' },
        tile('Income', r.income, '≈ ' + money(r.per_month.income, { whole: true }) + ' a month', shown ? chg(cmp.income_change, true) : null),
        tile('Spending', r.spending, '≈ ' + money(r.per_month.spending, { whole: true }) + ' a month', shown ? chg(cmp.spending_change, false) : null),
        tile(r.net.minor >= 0 ? 'Kept' : 'Overspent', r.net, r.savings_rate == null ? 'No income in this period' : (r.savings_rate >= 0 ? 'You kept ' + pct(r.savings_rate) + ' of your income' : 'Spent ' + pct(-r.savings_rate) + ' more than you earned'))),
      h('div', { class: 'grid' },
        h('div', { class: 'span-6' }, card('A typical month', date(r.from) + ' – ' + date(r.to) + ' · ' + plural(r.days, 'day') + ' (about ' + months.toFixed(1) + ' months)', { toggle: null, body: h('div', { class: 'stack' }, h('dl', { class: 'kv' }, ...kv), h('div', { class: 'muted small' }, note)) })),
        h('div', { class: 'span-6' }, card('Where it went', 'The five biggest categories · click one to see its transactions', { toggle: null, body: r.top_categories.length ? hbars(r.top_categories.map((c) => { const n = label(c); return { name: n.main, alt: n.alt, value: c.amount.minor, valueText: money(c.amount, { whole: true }), sub: pct(c.share) + ' · ' + money(c.per_month, { whole: true }) + '/mo', id: c.category_id }; }), { onPick: (it) => go(toTx(it.id)) }) : emptyState('tag', 'No spending', '') }))),
      comparison,
      r.largest.length > 0 && card('Largest payments', 'The five biggest single charges in this period', { toggle: null, body: h('ul', { class: 'list' }, r.largest.map((b) => h('li', null, h('div', { class: 'grow', style: { minWidth: 0 } }, utBlock(b.payee, 'strong'), h('div', { class: 'muted small' }, date(b.date) + (b.category_name ? ' · ' + b.category_name : ''))), h('span', { class: 'amount strong' }, money(b.amount)),
        h('a', { class: 'btn ghost sm', href: '#/transactions?q=' + encodeURIComponent(b.payee) + '&period=' + state.filters.period }, 'Find', icon('right', 'sm'))))) }),
      r.uncategorized.count > 0 && h('div', { class: 'muted small' }, plural(r.uncategorized.count, 'purchase') + ' worth ' + money(r.uncategorized.amount, { whole: true }) + ' have no category yet. ', h('a', { href: '#/transactions?category=uncategorized&period=' + state.filters.period }, 'Review them')));
  }],
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
  ['installments', 'Installments', async () => {
    const f = await api.get('/api/v1/reports/installments', scope({ measure: 'OUT_OF_POCKET' }));
    const total = f.months.reduce((a, m) => a + m.total.minor, 0);
    const view = chartTable(() => f.months.length ? h('div', { class: 'stack' }, columns({ labels: f.months.map((m) => monthShort(m.month) + " '" + m.month.slice(2, 4)), groupLabels: f.months.map((m) => monthLong(m.month)), series: [{ name: 'Installments due', color: SERIES[0], values: f.months.map((m) => m.total.minor) }], height: 220 }),
        h('ul', { class: 'list' }, f.months.map((m) => h('li', { style: { alignItems: 'flex-start' } }, h('div', { style: { width: '90px', flex: 'none' }, class: 'strong' }, monthLong(m.month)), h('div', { class: 'grow stack', style: { gap: '4px' } }, m.items.map((i) => h('div', { class: 'row' }, utBlock(i.payee, 'grow'), h('span', { class: 'muted small' }, i.remaining ? i.remaining + ' left' : 'last one'), h('span', { class: 'amount' }, money(i.amount))))), h('span', { class: 'strong amount' }, money(m.total)))))) : emptyState('card', 'No installments running', 'Card purchases paid in installments are projected here.'),
      () => simpleTable([{ label: 'Month' }, { label: 'Payee' }, { label: 'Amount', num: true }, { label: 'Left after', num: true }], f.months.flatMap((m) => m.items.map((i) => [monthLong(m.month), ut(i.payee), h('span', { class: 'amount' }, money(i.amount)), String(i.remaining)]))));
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, card('Installments still to come', f.months.length ? money({ minor: total, currency: cur }, { whole: true }) + ' over the next ' + plural(f.months.length, 'month') : 'Nothing scheduled', view),
      card('Owed on cards now', 'Billed or upcoming statements not yet paid by a bank debit', { toggle: null, body: f.outstanding.length ? simpleTable([{ label: 'Card' }, { label: 'Unpaid', num: true }, { label: 'No bill date yet', num: true }], f.outstanding.map((o) => [utBlock(o.account_name), h('span', { class: 'amount strong' }, money(o.unpaid)), o.undated.minor ? h('span', { class: 'amount' }, money(o.undated)) : '–'])) : emptyState('circlecheck', 'Nothing owed') }));
  }],
  ['foreign', 'Abroad', async () => {
    const r = await api.get('/api/v1/reports/foreign', scope());
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
      card('Purchases in other currencies', 'What the issuer billed in shekels, and the rate that implies, fees included', { toggle: null, body: r.summary.length ? simpleTable([{ label: 'Currency' }, { label: 'Purchases', num: true }, { label: 'Original', num: true }, { label: 'Billed', num: true }, { label: 'Average rate', num: true }, { label: 'Range', num: true }], r.summary.map((s) => [s.currency, String(s.count), h('span', { class: 'amount' }, money(s.original)), h('span', { class: 'amount' }, money(s.billed)), h('span', { class: 'amount strong' }, s.average_rate.toFixed(3)), h('span', { class: 'amount muted' }, s.min_rate.toFixed(3) + ' – ' + s.max_rate.toFixed(3))])) : emptyState('card', 'No foreign purchases in this period') }),
      r.purchases.length > 0 && card('Each purchase', null, { toggle: null, body: simpleTable([{ label: 'Date' }, { label: 'Payee' }, { label: 'Original', num: true }, { label: 'Billed', num: true }, { label: 'Rate', num: true }], r.purchases.map((p) => [date(p.date), utBlock(p.payee), h('span', { class: 'amount' }, money(p.original)), h('span', { class: 'amount' }, money(p.billed)), h('span', { class: 'amount' }, p.rate.toFixed(3))])) }));
  }],
  ['anomalies', 'Unusual', async () => {
    const r = await api.get('/api/v1/reports/anomalies', scope());
    return card('Worth a second look', 'Purchases far above what is usual for their category, and recurring payments that started recently', { toggle: null, body: r.items.length ? h('ul', { class: 'list' }, r.items.map((a) => h('li', null, h('span', { class: ['ico', a.kind === 'OUTLIER' && 'warn'] }, icon(a.kind === 'OUTLIER' ? 'alert' : 'swap')),
      h('div', { class: 'grow', style: { minWidth: 0 } }, utBlock(a.payee, 'strong'), h('div', { class: 'muted small' }, date(a.date) + ' · ' + (a.kind === 'OUTLIER' ? (a.category_name || '') + ' · ' : '') + a.detail)), h('span', { class: 'amount strong' }, money(a.amount)),
      a.transaction_id && h('a', { class: 'btn ghost sm', href: '#/transactions?q=' + encodeURIComponent(a.payee) }, 'Find', icon('right', 'sm'))))) : emptyState('circlecheck', 'Nothing unusual', 'Needs about eight purchases in a category before outliers can be judged.') });
  }],
  ['recurring', 'Recurring', async () => {
    const r = await api.get('/api/v1/reports/recurring', { owner: state.filters.owner }); const it = r.items;
    return card('Recurring payments', it.length ? 'About ' + money({ minor: it.reduce((a, x) => a + x.monthly_cost.minor, 0), currency: cur }, { whole: true }) + ' a month' : 'Detected from repeated charges to the same payee', { toggle: null, body: it.length ? simpleTable([{ label: 'Payee' }, { label: 'How often' }, { label: 'Typical', num: true }, { label: 'Per month', num: true }, { label: 'Last paid' }, { label: 'Next expected' }],
      it.map((x) => [utBlock(x.payee, 'strong'), (x.fixed ? 'Fixed ' : 'Varies ') + x.cadence.toLowerCase(), h('span', { class: 'amount' }, money(x.typical)), h('span', { class: 'amount' }, money(x.monthly_cost)), date(x.last_date), x.active ? date(x.next_expected) : h('span', { class: 'muted' }, 'Looks stopped')])) : emptyState('swap', 'Nothing recurring yet') });
  }],
];

function card(title, sub, view) {
  return h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, title), sub && h('div', { class: 'sub' }, sub)), view.toggle), view.body);
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
