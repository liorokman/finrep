import { h, mount, ut, utBlock, $ } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, scope, setFilters, catName, periodRange } from '../state.js';
import { money, amount, date, weekday, plural } from '../format.js';
import { searchBox, selectField, categoryChip, pickCategory, drawer, toast, emptyState, errorAlert, attachTip, tipRows, showTip, hideTip } from '../ui.js';
import { refreshBadges } from '../main.js';

const PAGE = 50;
// Local filters live at module level so a change of the global period keeps them.
const T = { q: '', account: '', category: '', review: false };

function consumeNav(query) {
  const keys = Object.keys(query);
  if (!keys.length) return false;
  if (query.category !== undefined) T.category = query.category;
  if ('review' in query) T.review = query.review === '1';
  if (query.q !== undefined) T.q = query.q;
  if (query.account !== undefined) T.account = query.account;
  history.replaceState(null, '', '#/transactions');
  if (query.period && query.period !== state.filters.period) { setFilters({ period: query.period }); return true; }
  return false;
}

function params(extra = {}) {
  const { from, to } = periodRange();
  const p = { from, to, limit: PAGE, ...extra };
  if (state.filters.owner) p.owner = state.filters.owner;
  if (T.q) p.q = T.q;
  if (T.account) p.account_id = T.account;
  if (T.category) p.category_id = T.category;
  if (T.review) p.needs_review = true;
  return p;
}

export default {
  id: 'transactions', title: 'Transactions', filters: ['period', 'owner'],
  sub: () => 'Review, categorize and search every line',

  async render(ctx) {
    if (consumeNav(ctx.query)) return h('div');
    let items = [], total = 0, totals = [], loading = false;
    const sel = new Set(); let focus = -1, anchor = -1;
    const body = h('tbody'); const tots = h('div', { class: 't-totals-host' }); const foot = h('div', { class: 't-foot' }); const bulk = h('div', { class: 'bulk-host' });
    const kb = h('span', { class: 'xs muted' });

    // ----- toolbar -----
    const reviewBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(T.review), onclick: () => { T.review = !T.review; paintReview(); reload(); } });
    const paintReview = () => { reviewBtn.setAttribute('aria-pressed', String(T.review)); reviewBtn.classList.toggle('primary', T.review); mount(reviewBtn, icon('sparkle', 'sm'), 'Needs review'); };
    paintReview();
    const cats = [{ value: '', label: 'All categories' }, { value: 'uncategorized', label: 'Uncategorized' }, ...state.categories.map((c) => ({ value: c.id, label: catName(c).main + (catName(c).alt ? '  ·  ' + catName(c).alt : '') }))];
    const accs = [{ value: '', label: 'All accounts' }, ...state.accounts.map((a) => ({ value: a.id, label: a.name }))];
    const toolbar = h('div', { class: 'row wrap', style: { gap: 'var(--s-3)', alignItems: 'flex-end' } },
      h('div', { class: 'field grow', style: { minWidth: '240px' } }, h('span', { class: 'label' }, 'Search'), searchBox('Payee or note, English or עברית', T.q, (v) => { T.q = v.trim(); reload(); })),
      selectField('Account', accs, T.account, (v) => { T.account = v; reload(); }),
      selectField('Category', cats, T.category, (v) => { T.category = v; reload(); }),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Show'), reviewBtn));

    // ----- table -----
    const allBox = h('input', { class: 'check', type: 'checkbox', 'aria-label': 'Select all on this page', onchange: (e) => { items.forEach((t) => (e.target.checked ? sel.add(t.id) : sel.delete(t.id))); paintRows(); } });
    const table = h('table', { class: 't fixed', role: 'grid', 'aria-label': 'Transactions' },
      h('colgroup', null, ...[40, 118, null, 150, 240, 124, 52].map((w) => h('col', { style: w ? { width: w + 'px' } : {} }))),
      h('thead', null, h('tr', null, h('th', { class: 'col-check' }, allBox), h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Payee'), h('th', { scope: 'col', class: 'hide-m' }, 'Account'),
        h('th', { scope: 'col' }, 'Category'), h('th', { scope: 'col', class: 'num' }, 'Amount'), h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Actions')))),
      body);

    function rowFor(t, i) {
      const unrev = !t.is_reviewed && t.kind !== 'EMPLOYER_COVERAGE';
      const cov = t.kind === 'EMPLOYER_COVERAGE';
      const subs = [];
      if (t.total_installments) subs.push('Installment ' + t.current_installment + ' of ' + t.total_installments);
      if (t.original) subs.push(money(t.original) + ' abroad');
      if (t.is_standing_order) subs.push('Standing order');
      if (t.notes) subs.push(t.notes);
      const tr = h('tr', { 'aria-selected': String(sel.has(t.id)), class: focus === i ? 'focus' : '', dataset: { id: t.id, i }, tabindex: focus === i ? 0 : -1 },
        h('td', { class: 'col-check' }, h('input', { class: 'check', type: 'checkbox', checked: sel.has(t.id), 'aria-label': 'Select ' + t.payee_raw, onclick: (e) => { toggle(i, e.shiftKey); e.stopPropagation(); } })),
        h('td', null, h('div', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'dotslot' }, unrev && h('i', { class: 'unreviewed', title: 'Not reviewed yet' })), h('span', null, h('div', null, date(t.date, { year: false })), h('div', { class: 'sub' }, weekday(t.date) + (t.date.slice(0, 4) !== state.today.slice(0, 4) ? ' · ' + t.date.slice(0, 4) : ''))))),
        h('td', { class: 'payee' }, h('button', { class: 'rowlink', type: 'button', onclick: () => open(t) }, utBlock(t.payee_cleaned || t.payee_raw, cov ? 'muted' : 'strong'),
          h('span', { class: 'sub ut-block', dir: 'auto' }, h('span', { class: 'only-m' }, date(t.date, { year: false }) + (subs.length || cov ? ' · ' : '')), cov && h('span', { style: { marginInlineEnd: '6px' } }, 'Employer covers · '), subs.join(' · ')))),
        h('td', { class: 'hide-m' }, utBlock(t.account_name, 'muted small')),
        h('td', null, cov ? h('span', { class: 'muted small' }, 'Follows the purchase') : categoryChip(t, { onClick: (e) => { e.stopPropagation(); chooseCategory(e.currentTarget, [t]); } })),
        h('td', { class: 'num' }, amount(t.amount, { income: true })),
        h('td', null, unrev && t.category_id && h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Confirm category for ' + t.payee_raw, title: t.llm_confidence ? 'Confirm the model\'s pick (' + Math.round(t.llm_confidence * 100) + '% sure)' : 'Confirm', onclick: (e) => { e.stopPropagation(); setReviewed([t], true); } }, icon('check'))));
      tr.addEventListener('click', (e) => { if (e.target.closest('button, input, a')) return; focus = i; paintFocus(); });
      return tr;
    }

    function paintRows() {
      mount(body, items.map(rowFor));
      allBox.checked = items.length > 0 && items.every((t) => sel.has(t.id));
      allBox.indeterminate = !allBox.checked && items.some((t) => sel.has(t.id));
      paintBulk(); paintFoot(); paintTotals();
    }
    function paintFocus() { body.querySelectorAll('tr').forEach((tr, i) => { tr.classList.toggle('focus', i === focus); tr.tabIndex = i === focus ? 0 : -1; }); const tr = body.children[focus]; tr && tr.scrollIntoView({ block: 'nearest' }); }
    function toggle(i, range) {
      if (range && anchor >= 0) { const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)]; for (let k = a; k <= b; k++) sel.add(items[k].id); } else { const id = items[i].id; sel.has(id) ? sel.delete(id) : sel.add(id); anchor = i; }
      focus = i; paintRows();
    }
    function paintFoot() {
      mount(foot, h('span', null, total ? 'Showing ' + items.length + ' of ' + total : ''),
        items.length < total && h('button', { class: 'btn sm', type: 'button', disabled: loading, onclick: loadMore }, 'Show ' + Math.min(PAGE, total - items.length) + ' more'),
        h('span', { class: 'spacer xs' }, h('kbd', null, '↑'), ' ', h('kbd', null, '↓'), ' move  ', h('kbd', null, 'Space'), ' select  ', h('kbd', null, 'C'), ' category  ', h('kbd', null, 'R'), ' reviewed  ', h('kbd', null, 'Enter'), ' details'));
    }
    // Sums over every line this view matches (the server adds them up), not only the lines loaded so far.
    function paintTotals() {
      if (!total || !totals.length) return mount(tots);
      const stat = (label, value, cls, title) => h('span', { class: 'stat', title }, h('span', { class: 'muted small' }, label), ' ', h('span', { class: ['amount strong', cls] }, value));
      mount(tots, totals.map((t) => h('div', { class: 't-totals', role: 'group', 'aria-label': 'Totals for every transaction in this view' },
        h('span', { class: 'strong' }, 'Totals'), h('span', { class: 'muted small' }, 'all ' + plural(t.count, 'line') + ' in this view'),
        stat('Spending', money(t.spending), '', 'What you spent, after employer coverage. Counted the way the reports count it.'),
        stat('Income', money(t.income), t.income.minor > 0 && 'pos', 'What you received'),
        stat('Net', money(t.net, { sign: true }), t.net.minor < 0 && 'neg', 'Income minus spending'),
        t.not_counted > 0 && h('span', { class: 'muted small', title: 'Transfers, bank debits that pay a card statement, and employer-coverage lines are not spending or income: the purchases they pay for are counted instead.' },
          plural(t.not_counted, 'line') + ' not counted · ' + money(t.not_counted_amount, { sign: true })),
        h('span', { class: 'muted small spacer', title: 'The Amount column added up, signed, with nothing left out' }, 'All amounts added ' + money(t.sum, { sign: true })))));
    }
    function paintBulk() {
      if (!sel.size) return mount(bulk);
      mount(bulk, h('div', { class: 'bulkbar', role: 'region', 'aria-label': 'Selected transactions' }, h('span', { class: 'strong' }, sel.size + ' selected'),
        h('button', { class: 'btn primary sm', type: 'button', onclick: (e) => chooseCategory(e.currentTarget, selected()) }, icon('tag', 'sm'), 'Set category'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => setReviewed(selected(), true) }, icon('check', 'sm'), 'Mark reviewed'),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { sel.clear(); paintRows(); } }, 'Clear')));
    }
    const selected = () => items.filter((t) => sel.has(t.id));

    // ----- actions, each undoable -----
    async function chooseCategory(anchorEl, txs) {
      const current = txs.length === 1 ? txs[0].category_id : null;
      pickCategory(anchorEl, { selectedId: current, onPick: async (c) => {
        const before = txs.map((t) => ({ id: t.id, category_id: t.category_id, reviewed: t.is_reviewed, by: t.categorized_by }));
        try {
          if (c) await api.patch('/api/v1/transactions', { ids: txs.map((t) => t.id), category_id: c.id });
          else await api.patch('/api/v1/transactions', { ids: txs.map((t) => t.id), clear_category: true });
        } catch (e) { toast(e.message); return; }
        const n = catName(c);
        toast(c ? plural(txs.length, 'transaction') + ' set to ' + n.main : 'Category removed from ' + plural(txs.length, 'transaction'), { label: 'Undo', run: async () => {
          const byCat = new Map(); for (const b of before) { const k = b.category_id || ''; (byCat.get(k) || byCat.set(k, []).get(k)).push(b.id); }
          for (const [k, ids] of byCat) await api.patch('/api/v1/transactions', k ? { ids, category_id: k } : { ids, clear_category: true });
          reload(true);
        } });
        sel.clear(); reload(true); refreshBadges();
      } });
    }
    async function setReviewed(txs, v) {
      try { await api.patch('/api/v1/transactions', { ids: txs.map((t) => t.id), reviewed: v }); } catch (e) { toast(e.message); return; }
      toast(plural(txs.length, 'transaction') + (v ? ' confirmed' : ' marked for review'), { label: 'Undo', run: async () => { await api.patch('/api/v1/transactions', { ids: txs.map((t) => t.id), reviewed: !v }); reload(true); refreshBadges(); } });
      reload(true); refreshBadges();
    }

    // ----- loading -----
    let seq = 0;
    async function reload(keep) {
      const my = ++seq; loading = true;
      if (!keep) { sel.clear(); focus = -1; }
      try {
        const r = await api.get('/api/v1/transactions', params({ limit: keep ? Math.max(PAGE, items.length) : PAGE, totals: 1 }));
        if (my !== seq) return;
        items = r.items; total = r.total; totals = r.totals || [];
      } catch (e) { mount(body); mount(foot, errorAlert(e, () => reload())); loading = false; return; }
      loading = false; paintRows();
      if (!items.length) mount(emptyHost, emptyState('search', 'No transactions match', T.review ? 'Nothing is waiting for review in this period.' : 'Try a wider period or fewer filters.', h('button', { class: 'btn sm', type: 'button', onclick: () => { Object.assign(T, { q: '', account: '', category: '', review: false }); ctx.content.dispatchEvent(new Event('x')); setFilters({}); } }, 'Clear filters')));
      else mount(emptyHost);
    }
    async function loadMore() {
      loading = true; paintFoot();
      const r = await api.get('/api/v1/transactions', params({ offset: items.length }));
      items = items.concat(r.items); total = r.total; loading = false; paintRows();
    }

    // ----- detail drawer -----
    function open(t) {
      const cov = t.kind === 'EMPLOYER_COVERAGE';
      const row = (k, v) => v == null || v === '' ? null : [h('dt', null, k), h('dd', null, v)];
      let d;
      const body = h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
        h('div', null, utBlock(t.payee_cleaned || t.payee_raw, 'strong'), h('div', { style: { fontSize: 'var(--fs-xl)', fontWeight: 650, marginTop: '6px' } }, amount(t.amount, { income: true }))),
        h('dl', { class: 'kv' },
          ...[row('Date', date(t.date, { weekday: true })), row('Account', t.account_name), row('Raw text', ut(t.payee_raw)),
            row('Category', cov ? 'Follows the purchase it covers' : categoryChip(t, { onClick: (e) => { d.close(); chooseCategory(e.currentTarget, [t]); } })),
            t.categorized_by === 'LLM' && row('Chosen by', 'The model' + (t.llm_confidence ? ', ' + Math.round(t.llm_confidence * 100) + '% sure' : '') + (t.is_reviewed ? '' : '. Not reviewed yet.')),
            t.categorized_by === 'MANUAL' && row('Chosen by', 'You'),
            t.bill_date && row('Billed on', date(t.bill_date, { weekday: true }) + ' · ' + ({ PDF: 'from the statement', BANK: 'from the bank debit', RULE: 'computed from the card’s rule' }[t.bill_date_source] || '')),
            t.original && row('Original amount', money(t.original)), t.total_installments && row('Installment', t.current_installment + ' of ' + t.total_installments),
            t.is_standing_order && row('Type', 'Standing order'), t.notes && row('Note', ut(t.notes)), row('Scope', t.scope === 'FOREIGN' ? 'Abroad' : 'In Israel')].filter(Boolean).flat()),
        !cov && h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onclick: async () => { await setReviewed([t], !t.is_reviewed); d.close(); } }, icon('check', 'sm'), t.is_reviewed ? 'Mark as not reviewed' : 'Confirm'),
          h('button', { class: 'btn', type: 'button', onclick: (e) => { d.close(); chooseCategory(document.activeElement || e.currentTarget, [t]); } }, icon('tag', 'sm'), 'Change category')));
      d = drawer('Transaction', body);
    }

    // ----- keyboard -----
    const key = (e) => {
      if (e.target.closest('input, select, textarea, .popover') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.drawer')) return;
      const n = items.length; if (!n) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); focus = Math.min(n - 1, focus + 1); paintFocus(); }
      else if (k === 'arrowup' || k === 'k') { e.preventDefault(); focus = Math.max(0, focus - 1); paintFocus(); }
      else if (k === ' ' && focus >= 0) { e.preventDefault(); toggle(focus, e.shiftKey); }
      else if (k === 'enter' && focus >= 0) { e.preventDefault(); open(items[focus]); }
      else if (k === 'c') { const txs = sel.size ? selected() : focus >= 0 ? [items[focus]] : []; if (txs.length) { e.preventDefault(); chooseCategory(body.children[Math.max(focus, 0)]?.querySelector('.chip') || table, txs); } }
      else if (k === 'r') { const txs = sel.size ? selected() : focus >= 0 ? [items[focus]] : []; if (txs.length) { e.preventDefault(); setReviewed(txs, true); } }
      else if (k === 'escape' && sel.size) { sel.clear(); paintRows(); }
    };
    document.addEventListener('keydown', key);
    const stopKeys = new MutationObserver(() => { if (!document.contains(table)) { document.removeEventListener('keydown', key); stopKeys.disconnect(); } });
    stopKeys.observe(document.body, { childList: true, subtree: true });

    const emptyHost = h('div');
    const card = h('div', { class: 'card flush' }, h('div', { class: 'table-wrap' }, table), emptyHost, tots, foot);
    await reload();
    return h('div', { class: 'stack', style: { gap: 'var(--s-4)' } }, toolbar, card, bulk);
  },
};
