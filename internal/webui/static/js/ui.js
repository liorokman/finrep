// Shared interface pieces: overlays, form controls, badges, category chips.
import { h, $, ut, utBlock, on, mount, append } from './dom.js';
import { icon } from './icons.js';
import { state, catName } from './state.js';

let seq = 0;
export const uid = (p = 'u') => p + ++seq;

// ---------- tooltip: one shared element; content is built from nodes, never markup ----------
let tipEl;
function tip() { return tipEl || (tipEl = document.body.appendChild(h('div', { class: 'tooltip', role: 'tooltip' }))); }
export function showTip(content, x, y) {
  const t = tip(); mount(t, content); t.classList.add('on');
  const r = t.getBoundingClientRect(); const pad = 10;
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - pad) left = x - r.width - 14;
  if (top + r.height > innerHeight - pad) top = y - r.height - 14;
  t.style.left = Math.max(pad, left) + 'px'; t.style.top = Math.max(pad, top) + 'px';
}
export const hideTip = () => tipEl && tipEl.classList.remove('on');
export function tipRows(title, rows) {
  return [title && h('div', { class: 'tt-title' }, title), ...rows.map((r) => h('div', { class: 'tt-row' },
    r.color && h('i', { class: 'tt-key', style: { '--c': r.color } }), h('span', { class: 'tt-name' }, r.name), h('span', { class: 'tt-val amount' }, r.value)))];
}
// Hover and keyboard focus show the same thing.
export function attachTip(el, build) {
  const show = (e) => { const r = el.getBoundingClientRect(); showTip(build(), e.clientX || r.left + r.width / 2, e.clientY || r.top); };
  el.addEventListener('pointermove', show); el.addEventListener('pointerleave', hideTip);
  el.addEventListener('focus', show); el.addEventListener('blur', hideTip);
}

// ---------- toast ----------
export function toast(message, action) {
  let box = $('.toasts'); if (!box) box = document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
  const el = h('div', { class: 'toast' }, h('span', null, message), action && h('button', { type: 'button', onclick: () => { action.run(); el.remove(); } }, action.label));
  box.appendChild(el); setTimeout(() => el.remove(), action ? 7000 : 3800);
}

// ---------- popover (anchored, closes on outside click or Escape) ----------
export function popover(anchor, content, { onClose } = {}) {
  const pop = h('div', { class: 'popover', role: 'dialog' }, content);
  document.body.appendChild(pop);
  const place = () => {
    const a = anchor.getBoundingClientRect(), r = pop.getBoundingClientRect();
    let left = a.left, top = a.bottom + 6;
    if (left + r.width > innerWidth - 8) left = Math.max(8, a.right - r.width);
    if (top + r.height > innerHeight - 8) top = Math.max(8, a.top - r.height - 6);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  };
  place();
  const offs = [];
  const close = () => { offs.forEach((f) => f()); pop.remove(); onClose && onClose(); anchor.focus && anchor.focus(); };
  setTimeout(() => offs.push(on(document, 'pointerdown', (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); })), 0);
  offs.push(on(document, 'keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }));
  offs.push(on(window, 'resize', place));
  return { close, el: pop, place };
}

// ---------- category picker: searchable, matches English and Hebrew names ----------
export function pickCategory(anchor, { selectedId, onPick, allowClear = true }) {
  const input = h('input', { class: 'input', type: 'search', dir: 'auto', placeholder: 'Find a category…', 'aria-label': 'Find a category' });
  const list = h('div', { class: 'pop-list', role: 'listbox' });
  let active = 0, shown = [];
  const norm = (s) => (s || '').toLowerCase();
  function render() {
    const q = norm(input.value.trim());
    const cats = state.categories.filter((c) => !q || norm(c.name_en).includes(q) || norm(c.name_he).includes(q));
    const groups = [['EXPENSE', 'Spending'], ['INCOME', 'Income'], ['TRANSFER', 'Transfers']];
    shown = []; const kids = [];
    if (allowClear && !q) { shown.push(null); kids.push(h('button', { class: ['pop-item', active === 0 && 'active'], type: 'button', role: 'option', onclick: () => choose(null) }, icon('x', 'sm'), h('span', { class: 'muted' }, 'No category'))); }
    for (const [type, label] of groups) {
      const items = cats.filter((c) => c.type === type); if (!items.length) continue;
      kids.push(h('div', { class: 'pop-group' }, label));
      for (const c of items) {
        const i = shown.push(c) - 1, n = catName(c);
        kids.push(h('button', { class: ['pop-item', i === active && 'active'], type: 'button', role: 'option', 'aria-selected': String(c.id === selectedId), onclick: () => choose(c),
          onpointermove: () => { if (active !== i) { active = i; paint(); } } },
          h('i', { class: 'dot', style: { '--c': c.color_hex } }), utBlock(n.main), n.alt && h('span', { class: 'muted xs' }, ut(n.alt)),
          c.created_by === 'LLM' && h('span', { class: 'mark-llm', title: 'Created by the model' }, icon('sparkle', 'sm')),
          c.id === selectedId && h('span', { class: 'check-ico' }, icon('check', 'sm'))));
      }
    }
    if (!shown.length) kids.push(h('div', { class: 'pop-empty' }, 'No category matches “' + input.value + '”.'));
    mount(list, kids);
  }
  function paint() { list.querySelectorAll('.pop-item').forEach((b, i) => b.classList.toggle('active', i === active)); const a = list.querySelector('.pop-item.active'); a && a.scrollIntoView({ block: 'nearest' }); }
  function choose(c) { pop.close(); onPick(c); }
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, shown.length - 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown.length) choose(shown[active]); }
  });
  render();
  const pop = popover(anchor, [h('div', { class: 'pop-search' }, input), list]);
  pop.place(); input.focus();
  return pop;
}

// ---------- drawer ----------
export function drawer(title, body, { onClose } = {}) {
  const prev = document.activeElement;
  const scrim = h('div', { class: 'scrim', onclick: () => close() });
  const panel = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'drawer-h' }, h('h2', { class: 'grow' }, title), h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Close', onclick: () => close() }, icon('x'))),
    h('div', { class: 'drawer-b' }, body));
  document.body.append(scrim, panel);
  const off = on(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
  panel.querySelector('button').focus();
  function close() { off(); scrim.remove(); panel.remove(); onClose && onClose(); prev && prev.focus && prev.focus(); }
  return { close, panel };
}

// ---------- controls ----------
export function segmented(label, options, value, onChange) {
  const el = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const draw = (v) => mount(el, options.map((o) => h('button', { type: 'button', 'aria-pressed': String(o.value === v), onclick: () => { if (o.value !== v) { draw(o.value); onChange(o.value); } } }, o.label)));
  draw(value); return el;
}

export function selectField(label, options, value, onChange) {
  const id = uid('f');
  const sel = h('select', { class: 'select', id, onchange: (e) => onChange(e.target.value) }, options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  return h('div', { class: 'field' }, h('label', { for: id }, label), sel);
}

// A labelled date picker. onChange gets YYYY-MM-DD, and is not called for a cleared field.
export function dateField(label, value, onChange, { min, max } = {}) {
  const id = uid('f');
  const input = h('input', { class: 'input', id, type: 'date', value: value || '', min, max, onchange: (e) => { if (e.target.value) onChange(e.target.value); } });
  return h('div', { class: 'field' }, h('label', { for: id }, label), input);
}

export function searchBox(placeholder, value, onInput) {
  let t;
  return h('div', { class: 'input-wrap' }, icon('search', 'sm'),
    h('input', { class: 'input', type: 'search', dir: 'auto', placeholder, value, 'aria-label': placeholder, oninput: (e) => { clearTimeout(t); const v = e.target.value; t = setTimeout(() => onInput(v), 220); } }));
}

// ---------- badges and chips ----------
const STATUS = { UPCOMING: ['calendar', 'upcoming', 'Upcoming'], BILLED: ['clock', 'billed', 'To pay'], PARTIAL: ['pie', 'partial', 'Part paid'], PAID: ['circlecheck', 'paid', 'Paid'] };
export function statusBadge(status) {
  const [ic, cls, label] = STATUS[status] || ['info', '', status];
  return h('span', { class: ['badge', cls] }, icon(ic), label);
}

export function categoryChip(t, { onClick } = {}) {
  const c = t.category_id ? state.catById.get(t.category_id) || { name_en: t.category_name_en, name_he: t.category_name_he, color_hex: '#898781' } : null;
  const n = catName(c);
  const inner = c
    ? [h('i', { class: 'dot', style: { '--c': c.color_hex } }), utBlock(n.main, 'nm'), n.alt && utBlock(n.alt, 'nm2'), c.created_by === 'LLM' && h('span', { class: 'mark-llm', title: 'Created by the model, not yet reviewed' }, icon('sparkle', 'sm'))]
    : [h('span', { class: 'muted' }, 'Add category')];
  return h(onClick ? 'button' : 'span', { class: ['chip', !c && 'unset'], type: onClick ? 'button' : null, onclick: onClick, 'aria-label': c ? 'Category: ' + n.main + '. Change' : 'Set category' }, inner);
}

export function emptyState(ic, title, text, action) {
  return h('div', { class: 'empty' }, icon(ic), h('h3', null, title), text && h('p', null, text), action);
}

export function skeleton(lines = 3) {
  return h('div', { class: 'stack', 'aria-busy': 'true' }, Array.from({ length: lines }, () => h('div', { class: 'loading', style: { height: '16px', borderRadius: '6px', background: 'var(--surface-2)' } })));
}

export function errorAlert(e, retry) {
  return h('div', { class: 'alert warn', role: 'alert' }, icon('alert'), h('div', { class: 'grow' }, h('strong', null, 'Could not load this. '), e.message || String(e)),
    retry && h('button', { class: 'btn sm', type: 'button', onclick: retry }, 'Try again'));
}

// A card header's "Chart | Table" switch: every chart has a table twin.
export function chartTable(renderChart, renderTable, label = 'View') {
  const body = h('div');
  let mode = 'chart';
  const draw = () => mount(body, mode === 'chart' ? renderChart() : renderTable());
  const toggle = segmented(label, [{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }], mode, (v) => { mode = v; draw(); });
  toggle.classList.add('view-toggle');
  draw();
  return { toggle, body, redraw: draw };
}

export function simpleTable(cols, rows) {
  return h('div', { class: 'table-wrap' }, h('table', { class: 't dense' },
    h('thead', null, h('tr', null, cols.map((c) => h('th', { class: c.num && 'num', scope: 'col' }, c.label)))),
    h('tbody', null, rows.map((r) => h('tr', null, cols.map((c, i) => h('td', { class: c.num && 'num' }, r[i])))))));
}
