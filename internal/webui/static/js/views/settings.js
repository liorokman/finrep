import { h, mount, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api, setCSRF } from '../api.js';
import { state, setReference, setPrefs } from '../state.js';
import { money, plural } from '../format.js';
import { drawer, toast, segmented, selectField, emptyState, statusBadge } from '../ui.js';
import { refreshBadges } from '../main.js';
import { accountEditor } from '../accounts.js';

const rerender = () => document.dispatchEvent(new CustomEvent('finrep:rerender'));
const section = (title, sub, ...kids) => h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, title), sub && h('div', { class: 'sub' }, sub))), ...kids);

// ---- model settings ----
function modelCard(items) {
  const by = Object.fromEntries(items.map((i) => [i.key, i]));
  const vals = {};
  const inp = (key, label, extra = {}) => { const it = by[key]; return h('div', { class: 'field' }, h('label', null, label), h('input', { class: 'input', autocomplete: 'off', value: it.secret ? '' : it.value, placeholder: it.secret ? (it.is_set ? 'Saved. Type to replace.' : '') : (extra.placeholder || ''), type: it.secret ? 'password' : 'text', oninput: (e) => { vals[key] = e.target.value; }, ...extra })); };
  const result = h('div', { 'aria-live': 'polite' });
  return section('Categorization model', 'An OpenAI-compatible endpoint, such as LocalAI. The decision model picks an existing category and says how sure it is; the generator invents a new one only when none fits well enough. A LocalAI decision model scores every category directly, which is faster and gives a real probability.',
    h('form', { class: 'stack', onsubmit: async (e) => { e.preventDefault(); try { await api.put('/api/v1/settings', { values: vals }); toast('Saved'); } catch (err) { toast(err.message); } } },
      inp('llm_base_url', 'Endpoint URL', { placeholder: 'http://localai:8080/v1' }), inp('llm_api_key', 'API key'),
      selectField('The decision model is a…', [{ value: 'chat', label: 'Chat model (asked for a JSON answer)' }, { value: 'decision', label: 'LocalAI decision model (/v1/systemone), recommended' }], (by.classifier_api && by.classifier_api.value) || 'chat', (v) => { vals.classifier_api = v; }),
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

// ---- password (local login only) ----
function passwordCard() {
  const field = (label, name, auto) => h('div', { class: 'field' }, h('label', { for: 'pw-' + name }, label), h('input', { class: 'input', id: 'pw-' + name, name, type: 'password', autocomplete: auto, required: true }));
  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const v = (n) => form.elements[n].value;
    if (v('next') !== v('again')) { toast('The two new passwords differ'); return; }
    try {
      const me = await api.put('/api/v1/auth/password', { current_password: v('current'), new_password: v('next') });
      setCSRF(me.csrf_token); form.reset(); toast('Password changed. Other sessions were signed out');
    } catch (err) { toast(err.message); }
  } }, field('Current password', 'current', 'current-password'), field('New password (at least 10 characters)', 'next', 'new-password'), field('Repeat the new password', 'again', 'new-password'),
  h('div', null, h('button', { class: 'btn primary', type: 'submit' }, 'Change password')));
  return section('Password', 'The password of ' + ((state.me && state.me.name) || 'the admin user') + '. It is stored only as a salted hash. Changing it signs out every other session.', form);
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
    return h('div', { class: 'grid' }, h('div', { class: 'span-7 stack', style: { gap: 'var(--s-5)' } }, accountsCard(), modelCard(st.items)), h('div', { class: 'span-5 stack', style: { gap: 'var(--s-5)' } }, runsCard(runs.items), hintsCard(st.items), state.authMode === 'local' && passwordCard(), prefs));
  },
};
