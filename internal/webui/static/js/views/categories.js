import { h, ut, utBlock, mount } from '../dom.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state, setReference, catName } from '../state.js';
import { money } from '../format.js';
import { drawer, toast, selectField, emptyState } from '../ui.js';

const TYPES = [{ value: 'EXPENSE', label: 'Spending' }, { value: 'INCOME', label: 'Income' }, { value: 'TRANSFER', label: 'Transfer (not counted)' }];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

async function reload() {
  const c = await api.get('/api/v1/categories'); setReference(state.accounts, c.items);
  document.dispatchEvent(new CustomEvent('finrep:rerender'));
}

function editor(cat) {
  let d; const isNew = !cat;
  const v = { name_en: cat?.name_en || '', name_he: cat?.name_he || '', type: cat?.type || 'EXPENSE', budget: cat?.monthly_budget ? String(cat.monthly_budget.minor / 100) : '', description: cat?.description || '' };
  const field = (label, key, extra) => h('div', { class: 'field' }, h('label', null, label), h('input', { class: 'input', value: v[key], oninput: (e) => { v[key] = e.target.value; }, ...extra }));
  const body = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const payload = { name_en: v.name_en.trim(), name_he: v.name_he.trim(), type: v.type, description: v.description.trim() };
    const b = v.budget.trim() === '' ? null : Math.round(parseFloat(v.budget) * 100);
    if (b != null && !(b >= 0)) return toast('The budget must be a positive number');
    try {
      if (isNew) await api.post('/api/v1/categories', { ...payload, monthly_budget_minor: b });
      else await api.patch('/api/v1/categories/' + cat.id, { ...payload, ...(b == null ? { clear_budget: true } : { monthly_budget_minor: b }) });
      d.close(); toast(isNew ? 'Category added' : 'Saved'); reload();
    } catch (err) { toast(err.message); }
  } },
    field('Name (English)', 'name_en', { required: true, autocomplete: 'off' }), field('Name (עברית)', 'name_he', { dir: 'auto', lang: 'he', autocomplete: 'off' }),
    selectField('Counts as', TYPES, v.type, (t) => { v.type = t; }), field('Monthly budget (₪)', 'budget', { inputmode: 'decimal', placeholder: 'No budget' }),
    h('div', { class: 'field' }, h('label', null, 'What belongs here'), h('textarea', { class: 'input', rows: 3, dir: 'auto', maxlength: 400, placeholder: 'e.g. Wolt, Ten Bis, Aroma, McDonald’s. Naming merchants is the best way to help the model.', style: { minHeight: '84px', resize: 'vertical' }, oninput: (e) => { v.description = e.target.value; } }, v.description),
      h('span', { class: 'muted xs' }, 'The model reads this when it picks a category. Hebrew is fine.')),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, isNew ? 'Add category' : 'Save')));
  d = drawer(isNew ? 'New category' : 'Edit category', body);
}

function mergeInto(cat) {
  let d; let into = '';
  const others = state.categories.filter((c) => c.id !== cat.id && c.type === cat.type);
  const body = h('div', { class: 'stack' }, h('p', null, 'Move every transaction from ', h('strong', null, ut(cat.name_en)), ' into another category, then remove it.'),
    selectField('Merge into', [{ value: '', label: 'Choose…' }, ...others.map((c) => ({ value: c.id, label: catName(c).main + (catName(c).alt ? '  ·  ' + catName(c).alt : '') }))], '', (x) => { into = x; }),
    h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (!into) return toast('Choose a category first'); try { await api.post('/api/v1/categories/' + cat.id + '/merge', { into }); d.close(); toast('Merged'); reload(); } catch (e) { toast(e.message); } } }, icon('swap', 'sm'), 'Merge'));
  d = drawer('Merge category', body);
}

async function remove(cat) {
  if (!confirm('Delete “' + cat.name_en + '”? Its transactions become uncategorized.')) return;
  try { await api.del('/api/v1/categories/' + cat.id); toast('Deleted'); reload(); } catch (e) { toast(e.message); }
}

const row = (c, { review } = {}) => h('tr', null,
  h('td', null, h('div', { class: 'row', style: { gap: '9px' } }, h('i', { class: 'dot', style: { '--c': c.color_hex, width: '10px', height: '10px', borderRadius: '50%', background: 'var(--c)', flex: 'none' } }), h('span', { style: { minWidth: 0 } }, utBlock(c.name_en, 'strong'), c.description && utBlock(c.description, 'sub muted xs')))),
  h('td', null, utBlock(c.name_he)), h('td', { class: 'muted small' }, TYPE_LABEL[c.type]),
  h('td', { class: 'num' }, c.monthly_budget ? h('span', { class: 'amount' }, money(c.monthly_budget, { whole: true })) : h('span', { class: 'muted' }, '–')),
  h('td', { class: 'num' }, h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '2px' } },
    review && h('button', { class: 'btn sm', type: 'button', onclick: async () => { try { await api.patch('/api/v1/categories/' + c.id, { keep: true }); toast('Kept'); reload(); } catch (e) { toast(e.message); } } }, icon('check', 'sm'), 'Keep'),
    h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Edit ' + c.name_en, onclick: () => editor(c) }, icon('edit', 'sm')),
    h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Merge ' + c.name_en, title: 'Merge into another', onclick: () => mergeInto(c) }, icon('swap', 'sm')),
    h('button', { class: 'btn ghost icon-only sm', type: 'button', 'aria-label': 'Delete ' + c.name_en, onclick: () => remove(c) }, icon('trash', 'sm')))));

const table = (cats, opts) => h('div', { class: 'table-wrap' }, h('table', { class: 't dense' },
  h('thead', null, h('tr', null, ['English', 'עברית', 'Counts as', 'Budget / month', ''].map((c, i) => h('th', { class: i === 3 ? 'num' : '' }, c)))), h('tbody', null, cats.map((c) => row(c, opts)))));

export default {
  id: 'categories', title: 'Categories', filters: [],
  sub: () => 'Names in both languages, what counts as spending, and monthly budgets',
  async render(ctx) {
    ctx.setActions(h('button', { class: 'btn primary', type: 'button', onclick: () => editor(null) }, icon('plus', 'sm'), 'New category'));
    const cats = state.categories; const llm = cats.filter((c) => c.created_by === 'LLM');
    const groups = TYPES.map((t) => [t, cats.filter((c) => c.type === t.value && c.created_by !== 'LLM')]).filter(([, l]) => l.length);
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
      llm.length > 0 && h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'mark-llm' }, icon('sparkle', 'sm')), 'Created by the model'), h('div', { class: 'sub' }, 'The model invented these when nothing existing fit. Keep, rename, merge or delete each one.'))), table(llm, { review: true })),
      groups.map(([t, list]) => h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('h2', null, t.label.replace(' (not counted)', '') + ' · ' + list.length)), table(list))),
      !cats.length && emptyState('tag', 'No categories yet'));
  },
};
