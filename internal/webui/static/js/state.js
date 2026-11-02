// Shared state: who is logged in, reference data, the global filters. Filters and preferences persist.
import { addMonths } from './format.js';

const KEY = 'finrep.prefs.v1';
const listeners = new Map();

export const state = {
  me: null, today: '', mock: false, authMode: 'none', // authMode: 'oidc', 'local' or 'none'
  accounts: [], categories: [], accById: new Map(), catById: new Map(),
  filters: { period: '12m', owner: '', measure: 'GROSS', from: '', to: '' }, // from and to are the custom range, used by the 'range' period
  prefs: { catLang: 'en', dense: false },
};

try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.assign(state.filters, saved.filters); Object.assign(state.prefs, saved.prefs); } catch (e) { /* first run */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ filters: state.filters, prefs: state.prefs })); } catch (e) { /* private mode */ } };

export function subscribe(topic, fn) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic).add(fn);
  return () => listeners.get(topic).delete(fn);
}
const emit = (topic) => (listeners.get(topic) || []).forEach((fn) => fn());

export function setFilters(patch) { Object.assign(state.filters, patch); persist(); emit('filters'); }
export function setPrefs(patch) { Object.assign(state.prefs, patch); persist(); emit('prefs'); }

export function setReference(accounts, categories) {
  state.accounts = accounts; state.categories = categories;
  state.accById = new Map(accounts.map((a) => [a.id, a]));
  state.catById = new Map(categories.map((c) => [c.id, c]));
  emit('reference');
}

// Choose a period. Switching to the custom range starts from the dates being shown, so nothing jumps.
export function choosePeriod(p) {
  if (p === 'range') { const r = periodRange(); setFilters({ period: 'range', from: r.from, to: r.to }); } else setFilters({ period: p });
}

export const owners = () => [...new Set(state.accounts.map((a) => a.owner).filter(Boolean))].sort();
export const cards = () => state.accounts.filter((a) => a.type === 'CREDIT_CARD');

export const PERIODS = [
  { value: 'm', label: 'This month' }, { value: '3m', label: '3 months' }, { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' }, { value: 'ytd', label: 'This year' }, { value: 'all', label: 'All' }, { value: 'range', label: 'Range' },
];

// The date range a period preset stands for, ending today.
export function periodRange(period = state.filters.period, today = state.today) {
  const first = (iso) => iso.slice(0, 8) + '01';
  switch (period) {
    case 'm': return { from: first(today), to: today };
    case '3m': return { from: first(addMonths(today, -2)), to: today };
    case '6m': return { from: first(addMonths(today, -5)), to: today };
    case '12m': return { from: first(addMonths(today, -11)), to: today };
    case 'ytd': return { from: today.slice(0, 4) + '-01-01', to: today };
    case 'range': { const a = state.filters.from || '2023-01-01', b = state.filters.to || today; return a <= b ? { from: a, to: b } : { from: b, to: a }; }
    default: return { from: '2023-01-01', to: today };
  }
}

// Query parameters every report understands, taken from the global filters.
export function scope(extra = {}) {
  const { from, to } = periodRange();
  const p = { from, to, ...extra };
  if (state.filters.owner) p.owner = state.filters.owner;
  return p;
}

export function catName(c) {
  if (!c) return { main: 'Uncategorized', alt: '' };
  const he = state.prefs.catLang === 'he';
  const a = he ? c.name_he || c.name_en : c.name_en, b = he ? c.name_en : c.name_he;
  return { main: a, alt: b && b !== a ? b : '' };
}
