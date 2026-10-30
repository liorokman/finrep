import { h, mount, $ } from './dom.js';
import { icon } from './icons.js';
import { api, setCSRF, todayISO, ApiError } from './api.js';
import { state, setReference, setFilters, subscribe, owners, PERIODS, periodRange, choosePeriod } from './state.js';
import { segmented, selectField, dateField, errorAlert, skeleton } from './ui.js';

const params = new URLSearchParams(location.search);
if (params.has('mock')) { try { localStorage.setItem('finrep.mock', params.get('mock') === '0' ? '' : '1'); } catch (e) { /* ignore */ } }
state.mock = (() => { try { return !!localStorage.getItem('finrep.mock'); } catch (e) { return false; } })();

const VIEWS = {
  overview: () => import('./views/overview.js'),
  transactions: () => import('./views/transactions.js'),
  cards: () => import('./views/cards.js'),
  import: () => import('./views/imports.js'),
  reports: () => import('./views/reports.js'),
  categories: () => import('./views/categories.js'),
  settings: () => import('./views/settings.js'),
};
const NAV = [
  ['overview', 'Overview', 'home'], ['transactions', 'Transactions', 'list'], ['cards', 'Accounts', 'card'],
  ['import', 'Import', 'upload'], ['reports', 'Reports', 'chart'], ['categories', 'Categories', 'tag'], ['settings', 'Settings', 'sliders'],
];

export const badges = { transactions: 0 };
let content, topbarTitle, topbarSub, topbarActions, filtersEl, navEl;
let token = 0, current = null;

export function route() {
  const raw = location.hash.replace(/^#\/?/, '') || 'overview';
  const [path, qs] = raw.split('?');
  return { id: path.split('/')[0] || 'overview', rest: path.split('/').slice(1), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export const go = (hash) => { location.hash = hash; };

function themeButton() {
  const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => {
    const next = dark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('finrep.theme', next); } catch (e) { /* ignore */ }
    paint();
  } });
  const paint = () => mount(btn, icon(dark() ? 'sun' : 'moon', 'sm'), dark() ? 'Light theme' : 'Dark theme');
  paint(); return btn;
}

function shell() {
  navEl = h('nav', { class: 'nav', 'aria-label': 'Main' });
  topbarTitle = h('h1'); topbarSub = h('span', { class: 'sub' }); topbarActions = h('div', { class: 'row actions' });
  filtersEl = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filters' });
  content = h('main', { class: 'content', id: 'main', tabindex: '-1' });
  const me = state.me || {}; const nm = me.name || me.email || 'You';
  const app = h('div', { class: 'app' },
    h('a', { class: 'skip', href: '#main' }, 'Skip to content'),
    h('aside', { class: 'sidebar' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, icon('chart')), 'FinRep'),
      navEl,
      h('div', { class: 'sidebar-foot' },
        state.mock && h('div', { class: 'alert', style: { padding: '6px 10px' } }, icon('info', 'sm'), h('div', null, 'Sample data. ', h('a', { href: '/?mock=0' }, 'Use my data'))),
        h('div', { class: 'who' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, nm.slice(0, 1).toUpperCase()), h('div', { class: 'who-name' }, h('div', { class: 'strong' }, nm), me.email && h('div', { class: 'muted xs' }, me.email))),
        themeButton(),
        state.me && !state.mock && state.authEnabled && h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { await api.post('/auth/logout'); } finally { location.href = '/'; } } }, icon('logout', 'sm'), 'Sign out'))),
    h('div', { class: 'main' }, h('header', { class: 'topbar' }, h('div', { class: 'grow' }, topbarTitle, topbarSub), topbarActions), filtersEl, content));
  mount($('#app'), app);
  drawNav();
}

function drawNav() {
  const cur = route().id;
  mount(navEl, NAV.map(([id, label, ic]) => h('a', { href: '#/' + id, 'aria-current': id === cur ? 'page' : null },
    icon(ic), h('span', { class: 'label-long' }, label), id === 'transactions' && badges.transactions > 0 && h('span', { class: 'count', 'aria-label': badges.transactions + ' to review' }, badges.transactions > 99 ? '99+' : badges.transactions))));
}
export function refreshBadges() {
  return api.get('/api/v1/transactions', { needs_review: true, limit: 1 }).then((r) => { badges.transactions = r.total; drawNav(); }).catch(() => {});
}

// The two dates of the custom range. Moving one past the other drags the other along.
function rangeFields() {
  const { from, to } = periodRange();
  const lim = { min: '2023-01-01', max: state.today };
  return h('div', { class: 'row', style: { gap: 'var(--s-3)', alignItems: 'flex-end' } },
    dateField('From', from, (v) => setFilters({ from: v, to: to < v ? v : to }), lim),
    dateField('To', to, (v) => setFilters({ to: v, from: from > v ? v : from }), lim));
}

function drawFilters(v) {
  const want = v.filters || [];
  mount(filtersEl, [
    want.includes('period') && h('div', { class: 'field' }, h('span', { class: 'label' }, 'Period'), segmented('Period', PERIODS, state.filters.period, choosePeriod)),
    want.includes('period') && state.filters.period === 'range' && rangeFields(),
    want.includes('owner') && owners().length > 1 && selectField('Whose', [{ value: '', label: 'Everyone' }, ...owners().map((o) => ({ value: o, label: o }))], state.filters.owner, (o) => setFilters({ owner: o })),
    want.includes('measure') && h('div', { class: 'field' }, h('span', { class: 'label' }, 'Amounts'),
      segmented('Amounts', [{ value: 'GROSS', label: 'As bought' }, { value: 'OUT_OF_POCKET', label: 'Out of pocket' }], state.filters.measure, (m) => setFilters({ measure: m }))),
  ]);
  filtersEl.style.display = want.length ? '' : 'none';
}

async function render() {
  const r = route(); const my = ++token;
  drawNav();
  const loader = VIEWS[r.id] || VIEWS.overview;
  let v;
  try { v = (await loader()).default; } catch (e) { mount(content, errorAlert(e)); return; }
  if (my !== token) return;
  current = v;
  document.title = v.title + ' · FinRep';
  mount(topbarTitle, v.title); mount(topbarSub, v.sub ? v.sub() : '');
  drawFilters(v);
  const first = !content.firstChild || content.dataset.view !== r.id;
  if (first) mount(content, skeleton(6)); else content.classList.add('loading');
  content.dataset.view = r.id;
  try {
    const node = await v.render({ ...r, content, setActions: (a) => mount(topbarActions, a), setSub: (t) => mount(topbarSub, t) });
    if (my !== token) return;
    mount(content, node);
  } catch (e) {
    if (my !== token) return;
    mount(content, errorAlert(e instanceof ApiError ? e : new Error('Something went wrong: ' + e.message), render));
    console.error(e);
  } finally { if (my === token) content.classList.remove('loading'); }
  if (first) { content.focus({ preventScroll: true }); }
}

async function boot() {
  try {
    state.today = todayISO();
    const me = await api.get('/api/v1/auth/me');
    if (!me.authenticated) { location.href = '/auth/login?next=' + encodeURIComponent(location.pathname + location.hash); return; }
    setCSRF(me.csrf_token); state.me = me.user; state.authEnabled = me.auth_enabled;
    const [accs, cats] = await Promise.all([api.get('/api/v1/accounts'), api.get('/api/v1/categories')]);
    setReference(accs.items, cats.items);
  } catch (e) {
    mount($('#app'), h('div', { class: 'content' }, errorAlert(e, () => location.reload())));
    return;
  }
  shell();
  addEventListener('hashchange', render);
  subscribe('filters', render);
  document.addEventListener('finrep:rerender', render);
  subscribe('prefs', render);
  refreshBadges();
  render();
}
boot();
