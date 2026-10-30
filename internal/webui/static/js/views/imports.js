import { h, mount, ut, utBlock } from '../dom.js';
import { icon } from '../icons.js';
import { api, ApiError } from '../api.js';
import { state } from '../state.js';
import { money, amount, date, plural } from '../format.js';
import { toast, emptyState, errorAlert, selectField } from '../ui.js';
import { go, refreshBadges } from '../main.js';

const SOURCES = [
  { value: '', label: 'Detect from the file' }, { value: 'LEUMI_BANK_XLS', label: 'Leumi bank movements (.xls)' }, { value: 'CAL_PDF', label: 'Cal statement (PDF)' },
  { value: 'ISRACARD_PDF', label: 'Isracard statement (PDF)' }, { value: 'LEUMI_CARD_PDF', label: 'Leumi card statement (PDF)' }, { value: 'CSV', label: 'CSV file…' },
];
const SOURCE_NAME = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]));

function guess(name) {
  const n = name.toLowerCase();
  if (/\.(xls|xlsx|html?)$/.test(n)) return 'LEUMI_BANK_XLS';
  if (/\.csv$|\.txt$/.test(n)) return 'CSV';
  if (n.includes('isracard')) return 'ISRACARD_PDF';
  if (n.includes('leumi')) return 'LEUMI_CARD_PDF';
  if (n.endsWith('.pdf')) return 'CAL_PDF';
  return '';
}

export default {
  id: 'import', title: 'Import', filters: [],
  sub: () => 'Bring in bank movements and card statements. Nothing changes until you confirm.',

  async render() {
    const host = h('div', { class: 'stack', style: { gap: 'var(--s-5)' } });
    const recent = h('div');
    let step = 1, source = '', accountId = '', staged = null, result = null, busy = false, csv = null;

    const stepper = () => { const cur = step === 'csv' ? 1 : step; return h('ol', { class: 'steps', style: { listStyle: 'none', padding: 0, margin: 0 }, 'aria-label': 'Import steps' },
      ...['Choose a file', 'Check it', 'Done'].flatMap((t, i) => [i > 0 && h('li', { class: 'bar', 'aria-hidden': 'true' }), h('li', { class: ['step', cur === i + 1 && 'on', cur > i + 1 && 'done'], 'aria-current': cur === i + 1 ? 'step' : null }, h('span', { class: 'n' }, cur > i + 1 ? icon('check', 'sm') : String(i + 1)), t)])); };

    const accOptions = [{ value: '', label: 'Pick from the card number in the file' }, ...state.accounts.map((a) => ({ value: a.id, label: a.name + (a.last4 ? ' ···· ' + a.last4 : '') }))];

    function chooseStep() {
      const input = h('input', { type: 'file', class: 'sr-only', id: 'file', accept: '.pdf,.xls,.xlsx,.html,.csv,.txt', onchange: (e) => e.target.files[0] && stage(e.target.files[0]) });
      const zone = h('label', { class: 'dropzone', for: 'file', tabindex: 0, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
        ondragover: (e) => { e.preventDefault(); zone.classList.add('over'); }, ondragleave: () => zone.classList.remove('over'),
        ondrop: (e) => { e.preventDefault(); zone.classList.remove('over'); const f = e.dataTransfer.files[0]; f && stage(f); } },
        icon('upload'), h('strong', null, 'Drop a file here, or click to choose'), h('span', { class: 'small muted' }, 'Leumi .xls exports, and Cal, Isracard or Leumi card PDF statements'), input);
      return h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('h2', null, 'Choose a file')), h('div', { class: 'stack' }, zone,
        h('div', { class: 'row wrap', style: { alignItems: 'flex-end' } },
          selectField('What is it?', SOURCES, source, (v) => { source = v; }), selectField('Which account?', accOptions, accountId, (v) => { accountId = v; }))));
    }

    async function stage(file, mapping) {
      const src = source || guess(file.name);
      if (src === 'CSV' && !mapping) { return inspectCSV(file); }
      busy = true; draw();
      const fd = new FormData(); fd.append('file', file); fd.append('source', src); if (accountId) fd.append('account_id', accountId); if (mapping) fd.append('mapping', JSON.stringify(mapping));
      try { staged = await api.upload('/api/v1/imports/stage', fd); staged.accountId = staged.account_id || accountId; step = 2; }
      catch (e) { toast(e.message); }
      busy = false; draw();
    }

    async function inspectCSV(file) {
      busy = true; draw();
      try {
        const fd = new FormData(); fd.append('file', file);
        const ins = await api.upload('/api/v1/imports/inspect-csv', fd);
        const col = (re) => ins.columns.find((c) => re.test(c)) || '';
        csv = { file, ins, m: { has_header: true, delimiter: ins.delimiter, date_column: col(/date|תאריך/i) || ins.columns[0], date_format: 'DD/MM/YYYY', payee_column_0: col(/payee|description|תיאור|בית עסק|merchant/i) || ins.columns[1] || ins.columns[0], amount_column: col(/amount|סכום|חיוב/i), debit_column: '', credit_column: '', invert_sign: false, bill_date_column: '', currency: 'ILS' } };
        step = 'csv';
      } catch (e) { toast(e.message); }
      busy = false; draw();
    }

    function csvStep() {
      const { ins, m } = csv; const cols = [{ value: '', label: '(none)' }, ...ins.columns.map((c) => ({ value: c, label: c }))];
      const pick = (label, key, opts = cols) => selectField(label, opts, m[key], (v) => { m[key] = v; });
      return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Match the columns in ' + csv.file.name), h('div', { class: 'sub' }, plural(ins.rows, 'row') + ' found. Tell FinRep which column is which; dates are never guessed.'))),
        h('div', { class: 'table-wrap' }, h('table', { class: 't dense' }, h('thead', null, h('tr', null, ins.columns.map((c) => h('th', null, utBlock(c))))), h('tbody', null, ins.sample.slice(0, 4).map((r) => h('tr', null, r.map((c) => h('td', null, utBlock(c)))))))),
        h('div', { class: 'row wrap', style: { alignItems: 'flex-end', marginTop: '16px' } }, pick('Date', 'date_column'), selectField('Date format', ins.date_formats.map((f) => ({ value: f, label: f })), m.date_format, (v) => { m.date_format = v; }), pick('Payee', 'payee_column_0'), pick('Amount (one column)', 'amount_column')),
        h('div', { class: 'row wrap', style: { alignItems: 'flex-end', marginTop: '12px' } }, pick('…or Debit', 'debit_column'), pick('…and Credit', 'credit_column'), pick('Bill date (optional)', 'bill_date_column'),
          h('label', { class: 'row small', style: { gap: '8px', paddingBottom: '8px' } }, h('input', { class: 'check', type: 'checkbox', checked: m.invert_sign, onchange: (e) => { m.invert_sign = e.target.checked; } }), 'Purchases are positive in this file')),
        h('div', { class: 'row wrap', style: { alignItems: 'flex-end', marginTop: '12px' } }, selectField('Into account', [{ value: '', label: 'Choose…' }, ...state.accounts.map((a) => ({ value: a.id, label: a.name }))], accountId, (v) => { accountId = v; }))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { if (!accountId) return toast('Choose the account first'); const mm = { ...m, payee_columns: m.payee_column_0 ? [m.payee_column_0] : m.payee_columns }; delete mm.payee_column_0; stage(csv.file, mm); } }, 'Check the file'), h('button', { class: 'btn', type: 'button', onclick: () => { csv = null; step = 1; draw(); } }, 'Cancel')));
    }

    function checkStep() {
      const s = staged, pv = s.preview;
      const stat = (n, label, note) => h('div', { class: 'card tile', style: { boxShadow: 'none', background: 'var(--surface-2)' } }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, String(n)), note && h('div', { class: 'muted small', style: { marginTop: '4px' } }, note));
      const acct = state.accById.get(s.accountId);
      return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } },
        h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Check ' + s.filename), h('div', { class: 'sub' }, (SOURCE_NAME[s.source] || s.source) + (acct ? ' · into ' + acct.name : ''))),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { staged = null; step = 1; draw(); } }, icon('x', 'sm'), 'Start over')),
          s.account_error && h('div', { class: 'alert warn', style: { marginBottom: '16px' } }, icon('alert'), h('div', null, s.account_error)),
          !s.accountId && h('div', { class: 'stack', style: { marginBottom: '16px' } }, h('div', { class: 'alert' }, icon('info'), h('div', null, 'Choose the account this file belongs to.')), selectField('Account', [{ value: '', label: 'Choose…' }, ...state.accounts.map((a) => ({ value: a.id, label: a.name }))], '', (v) => { s.accountId = v; checkAccount(); })),
          pv && h('div', { class: 'tiles' }, stat(pv.new, 'New', 'will be added'), stat(pv.duplicates, 'Already here', 'skipped'), stat(plural(s.line_count, 'line'), 'In the file'))),
        (s.warnings.length > 0 || (pv && pv.rejected.length > 0)) && h('div', { class: 'stack' }, s.warnings.map((w) => h('div', { class: 'alert warn' }, icon('alert'), h('div', null, w))), pv && pv.rejected.length > 0 && h('div', { class: 'alert warn' }, icon('alert'), h('div', null, plural(pv.rejected.length, 'row'), ' could not be read and will be left out: ' + pv.rejected.slice(0, 3).map((r) => 'row ' + r.Row + ' (' + r.Reason + ')').join('; ')))),
        s.statements.length > 0 && h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('h2', null, 'Statements in this file')),
          h('ul', { class: 'list' }, s.statements.map((st) => h('li', null, h('span', { class: 'ico' }, icon('file')), h('div', { class: 'grow' }, h('div', { class: 'strong' }, 'Billed ' + date(st.bill_date, { weekday: true })), st.printed_total && h('div', { class: 'muted small' }, 'Printed total ', h('span', { class: 'amount' }, money(st.printed_total)), ' · the lines add up to it exactly')))))),
        h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'First lines'), h('div', { class: 'sub' }, 'A sample of what will be imported'))),
          h('div', { class: 'table-wrap' }, h('table', { class: 't dense fixed' }, h('colgroup', null, h('col', { style: { width: '120px' } }), h('col'), h('col', { style: { width: '130px' } })),
            h('thead', null, h('tr', null, h('th', null, 'Date'), h('th', null, 'Payee'), h('th', { class: 'num' }, 'Amount'))),
            h('tbody', null, s.sample_lines.map((l) => h('tr', null, h('td', null, date(l.date, { year: false })), h('td', null, utBlock(l.payee, l.kind === 'EMPLOYER_COVERAGE' ? 'muted' : ''), l.kind === 'EMPLOYER_COVERAGE' && h('span', { class: 'sub' }, 'Employer covers')), h('td', { class: 'num' }, amount(l.amount, { income: true })))))))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', disabled: busy || !s.accountId || (pv && pv.new === 0), onclick: commit }, icon('check', 'sm'), pv ? (pv.new === 0 ? 'Nothing new to import' : 'Import ' + plural(pv.new, 'new transaction')) : 'Import'),
          h('button', { class: 'btn', type: 'button', onclick: () => { staged = null; step = 1; draw(); } }, 'Cancel')));
    }
    async function checkAccount() { try { const fresh = await api.upload('/api/v1/imports/stage', (() => { const fd = new FormData(); fd.append('file', new Blob(['x']), staged.filename); fd.append('account_id', staged.accountId); return fd; })()); Object.assign(staged, { preview: fresh.preview }); } catch (e) { toast(e.message); } draw(); }

    async function commit() {
      busy = true; draw();
      try { result = await api.post('/api/v1/imports/staged/' + staged.stage_id + '/commit', { account_id: staged.accountId }); step = 3; refreshBadges(); loadRecent(); }
      catch (e) { toast(e.message); }
      busy = false; draw();
    }

    function doneStep() {
      return h('div', { class: 'card' }, h('div', { class: 'stack', style: { alignItems: 'flex-start' } },
        h('div', { class: 'row' }, h('span', { class: 'ico' }, icon('circlecheck')), h('h2', null, 'Imported ' + plural(result.inserted, 'transaction'))),
        h('p', { class: 'muted' }, result.duplicates ? plural(result.duplicates, 'line') + ' were already in your ledger and were skipped. ' : '', result.bill_dates_assigned ? plural(result.bill_dates_assigned, 'bill date') + ' computed from the card’s rules.' : ''),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => go('/transactions?review=1') }, 'Review new transactions', icon('right', 'sm')),
          h('button', { class: 'btn', type: 'button', onclick: async () => { try { await api.post('/api/v1/imports/' + result.batch_id + '/undo'); toast('Import undone'); step = 1; staged = null; draw(); loadRecent(); refreshBadges(); } catch (e) { toast(e.message); } } }, icon('undo', 'sm'), 'Undo this import'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { step = 1; staged = null; draw(); } }, 'Import another file'))));
    }

    function draw() { mount(host, h('div', { class: busy ? 'loading' : '' }, h('div', { style: { marginBottom: 'var(--s-4)' } }, stepper()), step === 1 ? chooseStep() : step === 'csv' ? csvStep() : step === 2 ? checkStep() : doneStep())); }

    async function loadRecent() {
      try {
        const r = await api.get('/api/v1/imports');
        mount(recent, h('div', { class: 'card flush' }, h('div', { class: 'card-h' }, h('div', { class: 'grow' }, h('h2', null, 'Recent imports'), h('div', { class: 'sub' }, 'Undo removes everything a file added'))),
          r.items.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't dense' }, h('thead', null, h('tr', null, ['When', 'File', 'Source', 'Account', 'Lines', ''].map((c, i) => h('th', { class: i === 4 ? 'num' : '' }, c)))),
            h('tbody', null, r.items.map((b) => h('tr', null, h('td', null, b.created_at.slice(0, 16).replace('T', ' ')), h('td', null, utBlock(b.filename)), h('td', { class: 'muted small' }, SOURCE_NAME[b.source] || b.source), h('td', null, utBlock(b.account_name)), h('td', { class: 'num' }, b.undone_at ? h('span', { class: 'muted' }, 'undone') : String(b.rows)),
              h('td', { class: 'num' }, !b.undone_at && h('button', { class: 'btn ghost sm', type: 'button', onclick: async () => { try { await api.post('/api/v1/imports/' + b.id + '/undo'); toast('Import undone'); loadRecent(); refreshBadges(); } catch (e) { toast(e.message); } } }, icon('undo', 'sm'), 'Undo'))))))) : emptyState('upload', 'Nothing imported yet')));
      } catch (e) { mount(recent, errorAlert(e, loadRecent)); }
    }
    draw(); await loadRecent();
    return h('div', { class: 'stack', style: { gap: 'var(--s-5)' } }, host, recent);
  },
};
