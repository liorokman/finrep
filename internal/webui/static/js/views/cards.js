import { h, mount, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, periodRange, cards as cardAccounts, setFilters } from '../state.js';
import { money, compact, amount, date, weekday, relDay, plural, monthShort, addMonths } from '../format.js';
import { timeline, lines, legend, SERIES } from '../charts.js';
import { segmented, selectField, statusBadge, drawer, toast, emptyState, tipRows, categoryChip, chartTable, simpleTable, pickCategory } from '../ui.js';
import { refreshBadges } from '../main.js';
import { accountEditor } from '../accounts.js';

const F = { status: 'ALL', card: '', bank: '' };
const owing = (s) => Math.max(0, s.expected.minor - s.settled.minor);

export default {
  id: 'cards', title: 'Accounts', filters: ['owner'],
  sub: () => 'Bank balances, what each card owes, and which debit paid which bill',

  async render(ctx) {
    ctx.setActions(h('button', { class: 'btn', type: 'button', onclick: () => accountEditor(null) }, icon('plus', 'sm'), 'Add account'));
    const owner = state.filters.owner || undefined;
    const from = periodRange('12m').from;
    const [stm, up, props, warn] = await Promise.all([
      api.get('/api/v1/statements', { owner, from }), api.get('/api/v1/billing/upcoming', { owner }),
      api.get('/api/v1/settlements/proposals'), api.get('/api/v1/reports/warnings', { owner }),
    ]);
    const all = stm.items;
    const cards = cardAccounts().filter((c) => !owner || c.owner === owner);
    const banks = state.accounts.filter((a) => a.type === 'BANK' && (!owner || a.owner === owner));
    const monthStart = state.today.slice(0, 8) + '01';
    const bankData = await Promise.all(banks.map(async (b) => {
      const [nw, cf] = await Promise.all([
        api.get('/api/v1/reports/net-worth', { account_id: b.id, from: addMonths(monthStart, -11), to: state.today }),
        api.get('/api/v1/reports/cash-flow', { account_id: b.id, from: monthStart, to: state.today, measure: 'OUT_OF_POCKET' })]);
      const pts = nw.items, last = pts[pts.length - 1], prev = pts.length > 1 ? pts[pts.length - 2] : null, m = cf.items[cf.items.length - 1];
      return { acc: b, pts, balance: last ? last.assets : { minor: 0, currency: 'ILS' }, change: last && prev ? last.assets.minor - prev.assets.minor : null, inMonth: m ? m.income : null, outMonth: m ? m.spending : null };
    }));

    // ----- bank tiles -----
    const bankTiles = bankData.map((d) => h('button', { class: ['card tile cardtile', F.bank === d.acc.id && 'on'], type: 'button', 'aria-pressed': String(F.bank === d.acc.id), onclick: () => { F.bank = F.bank === d.acc.id ? '' : d.acc.id; F.card = ''; rerender(); } },
      h('div', { class: 'row', style: { gap: '8px' } }, icon('wallet', 'sm'), h('span', { class: 'strong grow', style: { textAlign: 'start' } }, ut(d.acc.name)), d.acc.owner && h('span', { class: 'muted xs' }, d.acc.owner)),
      h('div', { class: 'label', style: { marginTop: '14px' } }, 'Balance'), h('div', { class: 'value amount' }, money(d.balance, { whole: true })),
      h('div', { class: 'foot', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '2px' } },
        d.change != null && h('span', { class: ['delta', d.change >= 0 ? 'up-good' : 'up-bad'] }, icon(d.change >= 0 ? 'arrowup' : 'arrowdown', 'sm'), compact({ minor: Math.abs(d.change), currency: 'ILS' }) + ' since last month end'),
        d.inMonth && h('span', { class: 'muted small' }, 'This month: ', h('span', { class: 'amount' }, '+' + compact(d.inMonth) + ' in · ' + compact(d.outMonth) + ' out')))));

    // ----- card tiles -----
    const tiles = cards.map((c) => {
      const mine = all.filter((s) => s.account_id === c.id);
      const unpaid = mine.filter((s) => s.status !== 'PAID');
      const owed = unpaid.reduce((a, s) => a + owing(s), 0);
      const next = unpaid.filter((s) => s.bill_date >= state.today).sort((a, b) => (a.bill_date < b.bill_date ? -1 : 1))[0];
      const overdue = unpaid.filter((s) => s.bill_date < state.today).reduce((a, s) => a + owing(s), 0);
      return h('button', { class: ['card tile cardtile', F.card === c.id && 'on'], type: 'button', 'aria-pressed': String(F.card === c.id), onclick: () => { F.card = F.card === c.id ? '' : c.id; F.bank = ''; rerender(); } },
        h('div', { class: 'row', style: { gap: '8px' } }, icon('card', 'sm'), h('span', { class: 'strong grow', style: { textAlign: 'start' } }, ut(c.name)), c.owner && h('span', { class: 'muted xs' }, c.owner)),
        h('div', { class: 'label', style: { marginTop: '14px' } }, 'Owed right now'), h('div', { class: 'value amount' }, money({ minor: owed, currency: 'ILS' }, { whole: true })),
        h('div', { class: 'foot', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '2px' } },
          overdue > 0 && h('span', { class: 'delta up-bad' }, icon('clock', 'sm'), money({ minor: overdue, currency: 'ILS' }, { whole: true }) + ' billed, not yet paid'),
          next ? h('span', { class: 'muted small' }, 'Next bill ' + weekday(next.bill_date) + ' ' + date(next.bill_date, { year: false }) + ' · ' + money(next.expected, { whole: true })) : h('span', { class: 'muted small' }, 'No bill coming up')));
    });

    // ----- one bank account in detail -----
    const sel = bankData.find((d) => d.acc.id === F.bank);
    let bankPanel = null;
    if (sel) {
      const mv = await api.get('/api/v1/transactions', { account_id: sel.acc.id, from: periodRange('12m').from, limit: 60 });
      const settledBy = new Map(); for (const st of all) for (const x of st.settlements) settledBy.set(x.bank_tx_id, st);
      const unlinked = new Set(warn.unlinked_card_payments.map((u) => u.transaction_id));
      let bal = sel.balance.minor;   // newest first: the balance after each line, walking backwards
      const rows = mv.items.map((t) => { const after = bal; bal -= t.amount.minor; return { t, after }; });
      const note = (t) => { const st = settledBy.get(t.id); if (st) return h('span', { class: 'badge paid' }, icon('link'), 'Paid ' + st.account_name + ' bill of ' + date(st.bill_date, { year: false })); if (unlinked.has(t.id)) return h('span', { class: 'badge billed' }, icon('alert'), 'Card payment, not matched'); return t.category_id ? categoryChip(t) : h('span', { class: 'muted small' }, 'Uncategorized'); };
      const series = [{ name: 'Balance', color: SERIES[0], values: sel.pts.map((p) => p.assets.minor) }];
      const trend = chartTable(() => sel.pts.length > 1 ? lines({ dates: sel.pts.map((p) => p.date), series, height: 220, endLabels: false }) : emptyState('chart', 'Not enough history yet'),
        () => simpleTable([{ label: 'Month end' }, { label: 'Balance', num: true }], sel.pts.map((p) => [date(p.date), h('span', { class: 'amount' }, money(p.assets))])));
      bankPanel = h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
        h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, ut(sel.acc.name)), h('div', { class: 'sub' }, 'Balance at each month end, over the last year')), trend.toggle), trend.body),
        h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Movements'), h('div', { class: 'sub' }, 'Latest ' + rows.length + ' of ' + mv.total + ' lines in this account, with the balance after each')), h('a', { class: 'btn ghost sm', href: '#/transactions' }, 'Open in Transactions', icon('right', 'sm'))),
          rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't dense' }, h('thead', null, h('tr', null, ['Date', 'Payee', 'What it was', 'Amount', 'Balance after'].map((c, i) => h('th', { class: i > 2 ? 'num' : '' }, c)))),
            h('tbody', null, rows.map(({ t, after }) => h('tr', null, h('td', null, date(t.date, { year: false })), h('td', null, utBlock(t.payee_cleaned || t.payee_raw)), h('td', null, note(t)), h('td', { class: 'num' }, amount(t.amount, { income: true })), h('td', { class: 'num' }, h('span', { class: 'amount muted' }, money({ minor: after, currency: 'ILS' })))))))) : emptyState('list', 'No movements yet', 'Import a bank export for this account.', h('a', { class: 'btn sm', href: '#/import' }, 'Import a file'))));
    }

    // ----- matching -----
    const matchCard = (props.items.length || warn.unlinked_card_payments.length) && h('div', { class: ['card', F.bank ? '' : 'span-5'] },
      h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Match bank debits to bills'), h('div', { class: 'sub' }, 'Linking a debit to its bill keeps card payments out of your spending totals')),
        props.items.length > 1 && h('button', { class: 'btn primary sm', type: 'button', onclick: confirmAll }, icon('check', 'sm'), 'Confirm all ' + props.items.length)),
      h('ul', { class: 'list' }, props.items.map((p) => h('li', null,
        h('span', { class: 'ico' }, icon('link')),
        h('div', { class: 'grow', style: { minWidth: 0 } }, h('div', { class: 'strong' }, utBlock(p.bank_payee), ),
          h('div', { class: 'muted small' }, date(p.bank_date, { weekday: true }) + ' · ', h('span', { class: 'amount' }, money(p.amount)), ' matches ', ut(p.account_name), ' bill of ' + date(p.bill_date, { year: false }) + (p.exact ? '' : ' (amount differs)'))),
        h('button', { class: 'btn sm', type: 'button', onclick: () => confirmOne(p) }, 'Confirm')))),
      !props.items.length && warn.unlinked_card_payments.length > 0 && h('div', { class: 'alert warn' }, icon('alert'), h('div', null, plural(warn.unlinked_card_payments.length, 'bank debit'), ' look like card payments but match no bill (', money(warn.counted), '). If the card is not tracked here, put them in a category such as “Wife’s Cards”.'),
        h('button', { class: 'btn sm', type: 'button', onclick: (e) => pickCategory(e.currentTarget, { allowClear: false, onPick: async (c) => { try { await api.patch('/api/v1/transactions', { ids: warn.unlinked_card_payments.map((u) => u.transaction_id), category_id: c.id }); toast(plural(warn.unlinked_card_payments.length, 'debit') + ' set to ' + c.name_en); rerender(true); } catch (err) { toast(err.message); } } }) }, icon('tag', 'sm'), 'Categorize them…')));
    async function confirmOne(p) { try { await api.post('/api/v1/settlements/proposals/confirm', { statement_id: p.statement_id, account_id: p.account_id, bill_date: p.bill_date, bank_transaction_id: p.bank_tx_id }); toast('Matched ' + p.account_name + ' bill to the bank debit'); refreshBadges(); rerender(true); } catch (e) { toast(e.message); } }
    async function confirmAll() { try { const r = await api.post('/api/v1/settlements/proposals/confirm-all'); toast(plural(r.confirmed, 'bill') + ' matched'); rerender(true); } catch (e) { toast(e.message); } }

    // ----- unlinked card payments: link one to a card whose statements are not imported -----
    const unmatched = warn.unlinked_card_payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const picked = new Map();   // bank transaction id -> chosen card id
    const linkRow = (u) => {
      const btn = h('button', { class: 'btn sm', type: 'button', disabled: true, onclick: () => linkActivity(u, picked.get(u.transaction_id)) }, icon('link', 'sm'), 'Link');
      const pick = h('select', { class: 'select', 'aria-label': 'Card paid by ' + u.payee, onchange: (e) => { picked.set(u.transaction_id, e.target.value); btn.disabled = !e.target.value; } },
        h('option', { value: '' }, 'Choose a card…'), cards.map((c) => h('option', { value: c.id }, c.name + (c.owner ? ' · ' + c.owner : ''))));
      return h('tr', null, h('td', null, date(u.date, { year: true })), h('td', null, utBlock(u.payee), u.has_proposal && h('div', { class: 'sub' }, 'A bill matches this debit — see the suggestions above')),
        h('td', { class: 'num' }, h('span', { class: 'amount strong' }, money(u.amount))), h('td', null, pick), h('td', null, btn));
    };
    async function linkActivity(u, cardId) { try { await api.post('/api/v1/settlements/activity', { bank_transaction_id: u.transaction_id, account_id: cardId }); toast('Linked to the card. Importing its statement later replaces this placeholder.'); refreshBadges(); rerender(true); } catch (e) { toast(e.message); } }
    const unlinkedCard = unmatched.length > 0 && cards.length > 0 && h('div', { class: 'card flush' },
      h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Unlinked card payments'), h('div', { class: 'sub' }, plural(unmatched.length, 'bank debit') + ' to card bills with no statement. Link one to a card to record it there as “activity”; importing the real statement later replaces it.'))),
      h('div', { class: 'table-wrap' }, h('table', { class: 't dense', 'aria-label': 'Unlinked card payments' }, h('thead', null, h('tr', null, ['Date', 'Bank line', 'Amount', 'Card', ''].map((c, i) => h('th', { scope: 'col', class: i === 2 ? 'num' : '' }, c)))), h('tbody', null, unmatched.map(linkRow)))));

    // ----- outflow timeline -----
    const days = up.items.filter((d) => !F.card || d.statements.some((s) => s.account_id === F.card));
    const horizon = days.slice(0, 8);
    const total30 = days.filter((d) => d.date <= addDays(state.today, 30)).reduce((a, d) => a + d.total.minor, 0);
    const outflow = h('div', { class: ['card', matchCard ? 'span-7' : 'span-12'] }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Coming out of the bank'), h('div', { class: 'sub' }, days.length ? money({ minor: total30, currency: 'ILS' }, { whole: true }) + ' in the next 30 days' : 'Nothing waiting to be paid'))),
      days.length ? timeline(horizon.map((d) => ({ value: d.total.minor, when: weekday(d.date) + ' ' + date(d.date, { year: false }), sub: d.date < state.today ? 'overdue' : relDay(d.date, state.today), label: date(d.date, { weekday: true }), rows: d.statements.map((s) => ({ name: s.account_name, value: money({ minor: owing(s), currency: 'ILS' }) })) })), { currency: 'ILS' }) : emptyState('circlecheck', 'All bills are paid'));

    // ----- statements table -----
    const STAT = [{ value: 'ALL', label: 'All' }, { value: 'TOPAY', label: 'To pay' }, { value: 'UPCOMING', label: 'Upcoming' }, { value: 'PAID', label: 'Paid' }];
    let rows = all.filter((s) => (!F.card || s.account_id === F.card) && (F.status === 'ALL' || (F.status === 'TOPAY' ? s.status === 'BILLED' || s.status === 'PARTIAL' : s.status === F.status)));
    rows = rows.sort((a, b) => (a.bill_date < b.bill_date ? 1 : -1));
    const table = h('table', { class: 't', 'aria-label': 'Statements' }, h('thead', null, h('tr', null, ['Bill date', 'Card', 'Status', 'Charges', 'You pay', 'Bank debit'].map((c, i) => h('th', { scope: 'col', class: i === 3 || i === 4 ? 'num' : '' }, c)))),
      h('tbody', null, rows.map((s) => h('tr', null,
        h('td', null, h('button', { class: 'rowlink', type: 'button', onclick: () => open(s) }, h('div', { class: 'strong' }, date(s.bill_date, { year: false })), h('div', { class: 'sub' }, weekday(s.bill_date) + ' · ' + s.bill_date.slice(0, 4)))),
        h('td', null, utBlock(s.account_name)), h('td', null, statusBadge(s.status)),
        h('td', { class: 'num' }, plural(s.tx_count, 'line')),
        h('td', { class: 'num' }, h('div', { class: 'strong' }, amount(s.expected)), s.gross.minor !== s.expected.minor && h('div', { class: 'sub' }, h('span', { class: 'amount' }, 'of ' + money(s.gross) + ' bought'))),
        h('td', null, s.settlements.length ? s.settlements.map((x) => h('div', { class: 'small' }, h('span', { class: 'amount' }, money(x.amount)), h('span', { class: 'muted' }, ' · ' + date(x.bank_date, { year: false })))) : h('span', { class: 'muted small' }, s.status === 'UPCOMING' ? 'Not charged yet' : 'Not matched'))))));
    const stmtCard = h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Statements'), h('div', { class: 'sub' }, F.card ? 'Filtered to one card. Click its tile again to clear.' : 'Every bill, newest first')),
      segmented('Status', STAT, F.status, (v) => { F.status = v; rerender(true); })),
      rows.length ? h('div', { class: 'table-wrap' }, table) : emptyState('file', 'No statements here', 'Import a card statement to see its bill.', h('a', { class: 'btn sm', href: '#/import' }, 'Import a file')));

    function open(s) {
      let d;
      const body = h('div', { class: 'stack' },
        h('div', null, h('div', { class: 'row' }, utBlock(s.account_name, 'strong'), statusBadge(s.status)), h('div', { class: 'muted small', style: { marginTop: '4px' } }, 'Billed ' + date(s.bill_date, { weekday: true }))),
        h('dl', { class: 'kv' }, h('dt', null, 'Charges'), h('dd', null, plural(s.tx_count, 'line')),
          h('dt', null, 'As bought'), h('dd', { class: 'amount' }, money(s.gross)), s.gross.minor !== s.expected.minor && [h('dt', null, 'Employer covers'), h('dd', { class: 'amount' }, money({ minor: s.gross.minor - s.expected.minor, currency: s.gross.currency }))],
          h('dt', null, 'You pay'), h('dd', { class: 'amount strong' }, money(s.expected)), s.printed && [h('dt', null, 'Printed total'), h('dd', { class: 'amount' }, money(s.printed) + (s.printed.minor === s.expected.minor ? '  ✓ matches' : ''))],
          h('dt', null, 'Paid'), h('dd', { class: 'amount' }, money(s.settled))),
        h('div', null, h('h3', { style: { marginBottom: '8px' } }, 'Bank debits'), s.settlements.length ? h('ul', { class: 'list' }, s.settlements.map((x) => h('li', null, h('div', { class: 'grow' }, utBlock(x.bank_payee), h('div', { class: 'muted small' }, date(x.bank_date, { weekday: true }) + (x.source === 'AUTO' ? ' · matched automatically' : ' · matched by you'))), h('span', { class: 'amount strong' }, money(x.amount)),
          h('button', { class: 'btn ghost sm', type: 'button', title: 'Unlink this debit', onclick: async () => { try { await api.del('/api/v1/settlements/' + x.id); d.close(); toast('Unlinked. It will not be suggested again.'); rerender(true); } catch (e) { toast(e.message); } } }, icon('undo', 'sm'), 'Unlink')))) : h('p', { class: 'muted small' }, 'No bank debit is linked to this bill yet.')));
      d = drawer('Statement', body);
    }

    let host;
    function rerender() { document.dispatchEvent(new CustomEvent('finrep:rerender')); }
    const allTiles = [...bankTiles, ...tiles];
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
      allTiles.length ? h('div', { class: 'cardtiles' }, allTiles) : emptyState('card', 'No accounts yet', 'Add your bank account and cards in Settings.', h('a', { class: 'btn sm', href: '#/settings' }, 'Open Settings')),
      bankPanel ? [matchCard ? h('div', { class: 'grid' }, h('div', { class: 'span-12' }, matchCard)) : null, unlinkedCard || null, bankPanel] : [h('div', { class: 'grid' }, outflow, matchCard || null), unlinkedCard || null, stmtCard]);
  },
};

function addDays(iso, n) { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
