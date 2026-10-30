import { h, mount, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, setReference, setPrefs } from '../state.js';
import { money, plural } from '../format.js';
import { drawer, toast, segmented, selectField, emptyState, statusBadge } from '../ui.js';
import { refreshBadges } from '../main.js';

const rerender = () => document.dispatchEvent(new CustomEvent('finrep:rerender'));
const section = (title, sub, ...kids) => h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, title), sub && h('div', { class: 'sub' }, sub))), ...kids);

// ---- model settings ----
function modelCard(items) {
  const by = Object.fromEntries(items.map((i) => [i.key, i]));
  const vals = {};
  const inp = (key, label, extra = {}) => { const it = by[key]; return h('div', { class: 'field' }, h('label', null, label), h('input', { class: 'input', autocomplete: 'off', value: it.secret ? '' : it.value, placeholder: it.secret ? (it.is_set ? 'Saved. Type to replace.' : '') : (extra.placeholder || ''), type: it.secret ? 'password' : 'text', oninput: (e) => { vals[key] = e.target.value; }, ...extra })); };
  const result = h('div', { 'aria-live': 'polite' });
  return section('Categorization model', 'An OpenAI-compatible endpoint, such as LocalAI. The decision model picks an existing category; the generator invents a new one only when none fits well enough.',
    h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/api/v1/settings', { values: vals }); toast('Saved'); } catch (err) { toast(err.message); } } },
      inp('llm_base_url', 'Endpoint URL', { placeholder: 'http://localai:8080/v1' }), inp('llm_api_key', 'API key'),
      h('div', { class: 'row wrap', style: { alignItems: 'flex-start' } }, h('div', { class: 'grow' }, inp('classifier_model', 'Decision model')), h('div', { class: 'grow' }, inp('generator_model', 'Generator model'))),
      h('div', { class: 'row wrap', style: { alignItems: 'flex-start' } }, h('div', { class: 'grow' }, inp('categorization_threshold', 'Confidence needed (0.5 to 1)', { placeholder: '0.75' })), h('div', { class: 'grow' }, inp('categorization_batch_size', 'Payees per request', { placeholder: '20' }))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { mount(result, h('span', { class: 'spinner' })); try { const r = await api.post('/api/v1/settings/test-llm'); mount(result, ['classifier', 'generator'].map((k) => h('div', { class: ['small', r[k].ok ? 'delta up-good' : 'delta up-bad'] }, icon(r[k].ok ? 'circlecheck' : 'alert', 'sm'), (k === 'classifier' ? 'Decision model: ' : 'Generator: ') + (r[k].ok ? 'answered' : r[k].error)))); } catch (e) { mount(result, h('span', { class: 'small' }, e.message)); } } }, 'Test connection'), result)));
}

function hintsCard(items) {
  const it = items.find((i) => i.key === 'card_payment_hints'); let v = it.value;
  return section('Card payments in the bank', 'Words that mark a bank line as a card payment, one per line. They are used to suggest matches and are never categorized by the model.',
    h('div', { class: 'stack' }, h('textarea', { class: 'input', rows: 4, dir: 'auto', lang: 'he', style: { minHeight: '96px', resize: 'vertical' }, 'aria-label': 'Card payment words', oninput: (e) => { v = e.target.value; } }, it.value),
      h('div', null, h('button', { class: 'btn primary', type: 'button', onclick: async () => { try { await api.put('/api/v1/settings', { values: { card_payment_hints: v } }); toast('Saved'); } catch (e) { toast(e.message); } } }, 'Save'))));
}

// ---- categorization runs ----
function runsCard(runs) {
  const start = async () => { try { const r = await api.post('/api/v1/categorization/runs'); if (!r.started) toast(r.reason.charAt(0).toUpperCase() + r.reason.slice(1)); else { toast('Categorization started'); setTimeout(rerender, 1500); } } catch (e) { toast(e.message); } };
  return section('Categorize new transactions', 'Runs the model over everything uncategorized. Anything you set by hand is never touched, and a run can be undone.',
    h('div', { class: 'stack' }, h('div', null, h('button', { class: 'btn primary', type: 'button', onclick: start }, icon('sparkle', 'sm'), 'Categorize now')),
      runs.length ? h('ul', { class: 'list' }, runs.map((r) => h('li', null, h('div', { class: 'grow' }, h('div', { class: 'strong' }, r.started_at.slice(0, 16).replace('T', ' ')), h('div', { class: 'muted small' }, r.status.toLowerCase() + ' · ' + r.processed + ' of ' + plural(r.total, 'transaction') + ' · ' + r.classifier_model + (r.error ? ' · ' + r.error : ''))),
        (r.status === 'DONE' || r.status === 'CANCELED') && h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { const x = await api.post('/api/v1/categorization/runs/' + r.id + '/undo'); toast(plural(x.reverted, 'transaction') + ' reset'); refreshBadges(); rerender(); } catch (e) { toast(e.message); } } }, icon('undo', 'sm'), 'Undo')))) : h('p', { class: 'muted small' }, 'No runs yet.')));
}

// ---- accounts ----
const SCOPES = [{ value: 'LOCAL', label: 'In Israel' }, { value: 'FOREIGN', label: 'Abroad' }, { value: 'ALL', label: 'Everything' }];
function ruleRow(r, onChange, onRemove) {
  const num = (k, label, min, max) => h('div', { class: 'field', style: { width: '92px' } }, h('label', null, label), h('input', { class: 'input', type: 'number', min, max, value: r[k] ?? '', oninput: (e) => { r[k] = e.target.value === '' ? null : Number(e.target.value); onChange(); } }));
  return h('div', { class: 'row wrap', style: { alignItems: 'flex-end', gap: '10px' } }, selectField('Purchases', SCOPES, r.scope, (v) => { r.scope = v; onChange(); }), num('bill_day', 'Billed on day', 1, 31), num('month_offset', 'Months later', 0, 6), num('cutoff_day', 'Cutoff day', 1, 31),
    h('button', { class: 'btn ghost icon-only', type: 'button', 'aria-label': 'Remove rule', onclick: onRemove }, icon('trash', 'sm')));
}
function accountEditor(acc) {
  let d; const isNew = !acc;
  const v = { name: acc?.name || '', type: acc?.type || 'BANK', institution: acc?.institution || '', owner: acc?.owner || '', last4: acc?.last4 || '' };
  let rules = (acc?.billing_rules || []).map((r) => ({ ...r }));
  const rulesBox = h('div', { class: 'stack' });
  const drawRules = () => mount(rulesBox, v.type === 'CREDIT_CARD' ? [h('h3', null, 'When is a purchase billed?'), h('p', { class: 'muted small' }, 'A purchase on or after the cutoff day goes to the next cycle. Weekend purchases count as the following Sunday. A bill date on a Saturday moves to Sunday.'),
    ...rules.map((r, i) => ruleRow(r, () => {}, () => { rules.splice(i, 1); drawRules(); })), h('div', null, h('button', { class: 'btn sm', type: 'button', onclick: () => { rules.push({ scope: rules.length ? 'FOREIGN' : 'LOCAL', bill_day: 10, month_offset: 0, cutoff_day: 10, standing_order_extra_cycles: 0 }); drawRules(); } }, icon('plus', 'sm'), 'Add a rule'))] : null);
  const f = (label, key, extra) => h('div', { class: 'field' }, h('label', null, label), h('input', { class: 'input', value: v[key], autocomplete: 'off', oninput: (e) => { v[key] = e.target.value; }, ...extra }));
  const body = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const clean = rules.map((r) => ({ scope: r.scope, bill_day: +r.bill_day, month_offset: +(r.month_offset || 0), cutoff_day: r.cutoff_day ? +r.cutoff_day : null, standing_order_extra_cycles: +(r.standing_order_extra_cycles || 0) }));
    try {
      if (isNew) await api.post('/api/v1/accounts', { ...v, billing_rules: v.type === 'CREDIT_CARD' ? clean : undefined });
      else { await api.patch('/api/v1/accounts/' + acc.id, { name: v.name, institution: v.institution, owner: v.owner, last4: v.last4 }); if (acc.type === 'CREDIT_CARD') await api.put('/api/v1/accounts/' + acc.id + '/billing-rules', { rules: clean }); }
      const a = await api.get('/api/v1/accounts'); setReference(a.items, state.categories); d.close(); toast('Saved'); rerender();
    } catch (err) { toast(err.message); }
  } },
    isNew && selectField('Kind', [{ value: 'BANK', label: 'Bank account' }, { value: 'CREDIT_CARD', label: 'Credit card' }], v.type, (t) => { v.type = t; drawRules(); }),
    f('Name', 'name', { required: true, placeholder: 'e.g. Cal 1001' }), f('Institution', 'institution', { required: true, placeholder: 'Leumi, Cal, Isracard…' }), f('Whose', 'owner', { placeholder: 'e.g. Alice' }),
    f('Last four digits', 'last4', { inputmode: 'numeric', maxlength: 4, placeholder: 'Cards only. Used to match statement files.' }), rulesBox,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, isNew ? 'Add account' : 'Save')));
  drawRules(); d = drawer(isNew ? 'New account' : 'Edit account', body);
}
const SCOPE_NAME = { LOCAL: 'Israel', FOREIGN: 'Abroad', ALL: 'All' };

function billingSummary(a) {
  if (a.type !== 'CREDIT_CARD') return h('span', { class: 'muted' }, '–');
  if (!a.billing_rules.length) return h('span', { class: 'delta up-bad' }, icon('alert', 'sm'), 'No rules yet');
  return a.billing_rules.map((r) => SCOPE_NAME[r.scope] + ': day ' + r.bill_day + (r.month_offset ? ' +' + r.month_offset + ' mo' : '')).join(' · ');
}

function accountRow(a) {
  const edit = h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Edit ' + a.name, onclick: () => accountEditor(a) }, icon('edit', 'sm'));
  return h('tr', null,
    h('td', null, utBlock(a.name, 'strong')),
    h('td', { class: 'muted small' }, a.type === 'BANK' ? 'Bank' : 'Card ···· ' + a.last4),
    h('td', null, utBlock(a.owner)),
    h('td', { class: 'small' }, billingSummary(a)),
    h('td', { class: 'num' }, edit));
}

function accountsCard() {
  const rows = state.accounts;
  const head = h('thead', null, h('tr', null, ['Name', 'Kind', 'Whose', 'Billing', ''].map((c) => h('th', null, c))));
  const table = h('div', { class: 'table-wrap' }, h('table', { class: 't dense' }, head, h('tbody', null, rows.map(accountRow))));
  const add = h('button', { class: 'btn sm', type: 'button', onclick: () => accountEditor(null) }, icon('plus', 'sm'), 'Add account');
  return h('div', { class: 'card flush' },
    h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Accounts'), h('div', { class: 'sub' }, 'Cards need billing rules so upcoming bills get a date')), add),
    rows.length ? table : emptyState('card', 'No accounts yet', 'Add your bank account and cards first, then import their files.'));
}

export default {
  id: 'settings', title: 'Settings', filters: [],
  sub: () => 'Accounts, the categorization model and display preferences',
  async render() {
    const [st, runs] = await Promise.all([api.get('/api/v1/settings'), api.get('/api/v1/categorization/runs')]);
    const prefs = section('Display', 'Names are always stored in both languages. This chooses which one leads.',
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Category names'), segmented('Category names', [{ value: 'en', label: 'English first' }, { value: 'he', label: 'עברית first' }], state.prefs.catLang, (v) => setPrefs({ catLang: v }))));
    return h('div', { class: 'grid' }, h('div', { class: 'span-7 stack', style: { gap: 'var(--s-5)' } }, accountsCard(), modelCard(st.items)), h('div', { class: 'span-5 stack', style: { gap: 'var(--s-5)' } }, runsCard(runs.items), hintsCard(st.items), prefs));
  },
};
