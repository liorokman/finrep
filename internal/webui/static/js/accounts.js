// Add / edit / delete accounts. Shared by Settings and the Accounts page.
import { h, mount } from './dom.js';
import { icon } from './icons.js';
import { api } from './api.js';
import { state, setReference } from './state.js';
import { drawer, toast, selectField } from './ui.js';

const SCOPES = [{ value: 'LOCAL', label: 'In Israel' }, { value: 'FOREIGN', label: 'Abroad' }, { value: 'ALL', label: 'Everything' }];
const rerender = () => document.dispatchEvent(new CustomEvent('finrep:rerender'));
const major = (m) => (m ? String(m.minor / 100) : '');
const toMinor = (txt) => { const t = String(txt).trim().replace(/,/g, ''); if (t === '') return null; const n = Number(t); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };

function ruleRow(r, onRemove) {
  const num = (k, label, min, max) => h('div', { class: 'field', style: { width: '92px' } }, h('label', null, label), h('input', { class: 'input', type: 'number', min, max, value: r[k] ?? '', oninput: (e) => { r[k] = e.target.value === '' ? null : Number(e.target.value); } }));
  return h('div', { class: 'row wrap', style: { alignItems: 'flex-end', gap: '10px' } }, selectField('Purchases', SCOPES, r.scope, (v) => { r.scope = v; }), num('bill_day', 'Billed on day', 1, 31), num('month_offset', 'Months later', 0, 6), num('cutoff_day', 'Cutoff day', 1, 31),
    h('button', { class: 'btn ghost icon-only', type: 'button', 'aria-label': 'Remove rule', onclick: onRemove }, icon('trash', 'sm')));
}

export function accountEditor(acc) {
  let d; const isNew = !acc;
  const v = { name: acc?.name || '', type: acc?.type || 'BANK', institution: acc?.institution || '', owner: acc?.owner || '', last4: acc?.last4 || '', opening: major(acc?.opening_balance), limit: major(acc?.credit_limit) };
  let rules = (acc?.billing_rules || []).map((r) => ({ ...r }));
  const rulesBox = h('div', { class: 'stack' }); const cardOnly = h('div', { class: 'stack' });
  const drawRules = () => {
    mount(cardOnly, v.type === 'CREDIT_CARD' ? [f('Credit limit (₪)', 'limit', { inputmode: 'decimal', placeholder: 'Optional' })] : null);
    mount(rulesBox, v.type === 'CREDIT_CARD' ? [h('h3', null, 'When is a purchase billed?'), h('p', { class: 'muted small' }, 'A purchase on or after the cutoff day goes to the next cycle. Weekend purchases count as the following Sunday. A bill date on a Saturday moves to Sunday.'),
      ...rules.map((r, i) => ruleRow(r, () => { rules.splice(i, 1); drawRules(); })),
      h('div', null, h('button', { class: 'btn sm', type: 'button', onclick: () => { rules.push({ scope: rules.length ? 'FOREIGN' : 'LOCAL', bill_day: 10, month_offset: 0, cutoff_day: 10, standing_order_extra_cycles: 0 }); drawRules(); } }, icon('plus', 'sm'), 'Add a rule'))] : null);
  };
  const f = (label, key, extra) => h('div', { class: 'field' }, h('label', null, label), h('input', { class: 'input', value: v[key], autocomplete: 'off', oninput: (e) => { v[key] = e.target.value; }, ...extra }));
  const body = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const opening = toMinor(v.opening), limit = v.type === 'CREDIT_CARD' ? toMinor(v.limit) : null;
    if (Number.isNaN(opening) || Number.isNaN(limit)) return toast('Opening balance and credit limit must be numbers');
    const clean = rules.map((r) => ({ scope: r.scope, bill_day: +r.bill_day, month_offset: +(r.month_offset || 0), cutoff_day: r.cutoff_day ? +r.cutoff_day : null, standing_order_extra_cycles: +(r.standing_order_extra_cycles || 0) }));
    try {
      if (isNew) await api.post('/api/v1/accounts', { name: v.name, type: v.type, institution: v.institution, owner: v.owner, last4: v.last4, opening_balance_minor: opening ?? 0, credit_limit_minor: limit ?? undefined, billing_rules: v.type === 'CREDIT_CARD' && clean.length ? clean : undefined });
      else {
        await api.patch('/api/v1/accounts/' + acc.id, { name: v.name, institution: v.institution, owner: v.owner, last4: v.last4, opening_balance_minor: opening ?? 0, ...(limit == null ? { clear_credit_limit: true } : { credit_limit_minor: limit }) });
        if (acc.type === 'CREDIT_CARD') await api.put('/api/v1/accounts/' + acc.id + '/billing-rules', { rules: clean });
      }
      const a = await api.get('/api/v1/accounts'); setReference(a.items, state.categories); d.close(); toast(isNew ? 'Account added' : 'Saved'); rerender();
    } catch (err) { toast(err.message); }
  } },
    isNew && selectField('Kind', [{ value: 'BANK', label: 'Bank account' }, { value: 'CREDIT_CARD', label: 'Credit card' }], v.type, (t) => { v.type = t; drawRules(); }),
    f('Name', 'name', { required: true, placeholder: 'e.g. Cal 1001' }), f('Institution', 'institution', { required: true, placeholder: 'Leumi, Cal, Isracard…' }), f('Whose', 'owner', { placeholder: 'e.g. Alice' }),
    f('Last four digits', 'last4', { inputmode: 'numeric', maxlength: 4, placeholder: 'Cards only. Used to match statement files.' }),
    f('Opening balance (₪)', 'opening', { inputmode: 'decimal', placeholder: 'Before the first imported line' }),
    cardOnly, rulesBox,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, isNew ? 'Add account' : 'Save'),
      !isNew && h('button', { class: 'btn danger spacer', type: 'button', onclick: async () => {
        if (!confirm('Delete “' + acc.name + '”? This only works for an account with no transactions.')) return;
        try { await api.del('/api/v1/accounts/' + acc.id); const a = await api.get('/api/v1/accounts'); setReference(a.items, state.categories); d.close(); toast('Account deleted'); rerender(); }
        catch (err) { toast(err.status === 409 ? 'It still has transactions. Undo its imports first (Import → Recent imports).' : err.message); } } }, icon('trash', 'sm'), 'Delete')));
  drawRules(); d = drawer(isNew ? 'New account' : 'Edit account', body);
}
