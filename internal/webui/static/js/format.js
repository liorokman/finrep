// Number and date formatting. Amounts are always rendered left-to-right (the .amount class isolates
// them), so a minus sign and currency symbol stay attached to the number inside Hebrew text.
import { h } from './dom.js';

const digitsCache = {};
function digits(cur) {
  if (!(cur in digitsCache)) {
    try { digitsCache[cur] = new Intl.NumberFormat('en', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits; }
    catch (e) { digitsCache[cur] = 2; }
  }
  return digitsCache[cur];
}
const fmtCache = {};
function nf(cur, opts) {
  const key = cur + JSON.stringify(opts);
  return fmtCache[key] || (fmtCache[key] = new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', ...opts }));
}

export const toMajor = (minor, cur) => minor / Math.pow(10, digits(cur));

// money({minor, currency}) -> "₪1,234.56" / "-₪45.00". opts.sign: show "+" on positive amounts.
export function money(m, opts = {}) {
  if (!m) return '–';
  const v = toMajor(m.minor, m.currency);
  const out = nf(m.currency, { minimumFractionDigits: opts.whole ? 0 : digits(m.currency), maximumFractionDigits: opts.whole ? 0 : digits(m.currency) }).format(v);
  return opts.sign && m.minor > 0 ? '+' + out : out;
}

export function compact(m) {
  const v = toMajor(m.minor, m.currency);
  return nf(m.currency, { notation: 'compact', maximumFractionDigits: Math.abs(v) < 1000 ? 0 : 1 }).format(v);
}

// An element showing an amount. cls: pos (green, for income), faint.
export function amount(m, opts = {}) {
  const pos = opts.income && m && m.minor > 0;
  return h('span', { class: ['amount', pos && 'pos', opts.faint && 'faint', opts.class], title: opts.title }, money(m, { sign: opts.sign ?? pos, whole: opts.whole }));
}

export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const parts = (iso) => iso.split('-').map(Number);
const utc = (iso) => { const [y, m, d] = parts(iso); return new Date(Date.UTC(y, m - 1, d)); };

export function date(iso, o = {}) {
  if (!iso) return '–';
  const [y, m, d] = parts(iso);
  const wd = o.weekday ? DAYS[utc(iso).getUTCDay()] + ' ' : '';
  return wd + d + ' ' + MONTHS[m - 1] + (o.year === false ? '' : ' ' + y);
}
export const weekday = (iso) => DAYS[utc(iso).getUTCDay()];
export const monthShort = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
export const monthLong = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4);

export function addDays(iso, n) { const t = utc(iso); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
export function addMonths(iso, n) { const [y, m, d] = parts(iso); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); }
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const monthOf = (iso) => iso.slice(0, 7);

export function relDay(iso, today) {
  const n = daysBetween(today, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? 'in ' + n + ' days' : -n + ' days ago';
}

export const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
