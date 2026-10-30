// Sample data for the design prototype and the "try it with sample data" mode. It answers the same
// paths, with the same shapes, as the real API, so every view runs unchanged against either.
export const TODAY = '2026-10-30';

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261030);
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (lo, hi) => lo + rand() * (hi - lo);
const M = (minor, currency = 'ILS') => ({ minor: Math.round(minor), currency, display: (Math.round(minor) / 100).toFixed(2) });
let idn = 0;
const id = (p) => p + '_' + (++idn).toString(36).padStart(4, '0');

const iso = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dow = (s) => new Date(s + 'T00:00:00Z').getUTCDay();
const addD = (s, n) => { const t = new Date(s + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

// ---- accounts and categories ----
const PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const rules = (extra) => [{ scope: 'LOCAL', bill_day: 10, month_offset: 0, cutoff_day: 10, standing_order_extra_cycles: 0 }, ...(extra || [])];
const ISRA_FOREIGN = { scope: 'FOREIGN', bill_day: 2, month_offset: 1, cutoff_day: 2, standing_order_extra_cycles: 0 };
const ACC = [
  { id: 'acc_bank', name: 'Leumi checking', type: 'BANK', institution: 'Leumi', owner: 'Alice', last4: '', currency: 'ILS', billing_rules: [] },
  { id: 'acc_cal', name: 'Cal 1001', type: 'CREDIT_CARD', institution: 'Cal', owner: 'Alice', last4: '1001', currency: 'ILS', billing_rules: rules() },
  { id: 'acc_isra', name: 'Isracard 1002', type: 'CREDIT_CARD', institution: 'Isracard', owner: 'Alice', last4: '1002', currency: 'ILS', billing_rules: rules([ISRA_FOREIGN]) },
  { id: 'acc_lcard', name: 'Leumi Card 1003', type: 'CREDIT_CARD', institution: 'Leumi', owner: 'Alice', last4: '1003', currency: 'ILS', billing_rules: rules() },
];
const CATS = [
  ['groc', 'Groceries', 'סופרמרקט ומכולת', 'EXPENSE'], ['rest', 'Restaurants', 'מסעדות', 'EXPENSE'], ['cafe', 'Coffee & Cafes', 'קפה ובתי קפה', 'EXPENSE'],
  ['fuel', 'Fuel', 'דלק', 'EXPENSE'], ['trans', 'Public Transport', 'תחבורה ציבורית', 'EXPENSE'], ['park', 'Parking & Tolls', 'חניה וכבישי אגרה', 'EXPENSE'],
  ['rent', 'Rent & Mortgage', 'שכר דירה ומשכנתא', 'EXPENSE'], ['muni', 'Municipal Tax', 'ארנונה', 'EXPENSE'], ['util', 'Electricity & Water', 'חשמל ומים', 'EXPENSE'],
  ['tele', 'Telecom & Internet', 'תקשורת ואינטרנט', 'EXPENSE'], ['subs', 'Subscriptions', 'מנויים', 'EXPENSE'], ['health', 'Health', 'בריאות', 'EXPENSE'],
  ['pharm', 'Pharmacy', 'בית מרקחת', 'EXPENSE'], ['shop', 'Shopping', 'קניות כלליות', 'EXPENSE'], ['elec', 'Electronics', 'אלקטרוניקה', 'EXPENSE'],
  ['fun', 'Entertainment', 'בילוי ופנאי', 'EXPENSE'], ['travel', 'Travel & Vacation', 'נסיעות וחופשות', 'EXPENSE'], ['wife', "Wife's Cards", 'כרטיסי אשראי של בת הזוג', 'EXPENSE'],
  ['vet', 'Veterinary', 'וטרינר', 'EXPENSE', 'LLM'], ['salary', 'Salary', 'משכורת', 'INCOME'], ['refund', 'Refunds', 'החזרים', 'INCOME'],
  ['ccpay', 'Credit Card Payment', 'חיוב כרטיס אשראי', 'TRANSFER'], ['save', 'Savings & Investments', 'חיסכון והשקעות', 'TRANSFER'],
].map(([k, en, he, type, by], i) => ({ id: 'cat_' + k, name_en: en, name_he: he, parent_id: null, color_hex: PAL[i % 8], icon: 'tag', type, monthly_budget: k === 'groc' ? M(280000) : k === 'rest' ? M(120000) : null, created_by: by || 'USER' }));
const catBy = Object.fromEntries(CATS.map((c) => [c.id.slice(4), c]));

// ---- billing rule (same logic as the server) ----
function billDate(rule, purchase, standing) {
  let d = purchase; if (dow(d) === 5) d = addD(d, 2); else if (dow(d) === 6) d = addD(d, 1);
  let [y, m, day] = d.split('-').map(Number);
  let months = rule.month_offset + (rule.cutoff_day && day >= Math.min(rule.cutoff_day, dim(y, m)) ? 1 : 0) + (standing ? rule.standing_order_extra_cycles : 0);
  const t = new Date(Date.UTC(y, m - 1 + months, 1)); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1;
  let out = iso(y, m, Math.min(rule.bill_day, dim(y, m)));
  if (dow(out) === 6) out = addD(out, 1);
  return out;
}

// ---- transactions ----
const TX = [];
function tx(o) {
  const acc = ACC.find((a) => a.id === o.account_id);
  const cat = o.cat ? catBy[o.cat] : null;
  const t = {
    id: id('tx'), account_id: acc.id, account_name: acc.name, date: o.date, amount: M(o.minor), original: o.original || null, scope: o.scope || 'LOCAL', kind: o.kind || 'PURCHASE',
    covers_transaction_id: o.covers || null, is_standing_order: !!o.standing, bill_date: null, bill_date_source: null, statement_id: null,
    current_installment: o.inst ? o.inst[0] : null, total_installments: o.inst ? o.inst[1] : null, payee_raw: o.payee, payee_cleaned: null, notes: o.notes || null,
    category_id: cat ? cat.id : null, category_name_en: cat ? cat.name_en : '', category_name_he: cat ? cat.name_he : '',
    categorized_by: o.by || (cat ? 'MANUAL' : 'UNSET'), llm_confidence: o.conf ?? null, run_id: o.by === 'LLM' ? 'run_latest' : null, is_reviewed: o.reviewed ?? !!cat,
  };
  TX.push(t); return t;
}
const P = {
  groc: ['שופרסל דיל תל אביב 421', 'רמי לוי שיווק השקמה', 'יוחננוף - סניף 12', 'AM:PM מינימרקט', 'מגה בעיר רמת גן', 'שופרסל אונליין'],
  rest: ['ארומה תל אביב', 'מקדונלד\'ס דיזנגוף', 'WOLT', 'פיצה האט', 'מסעדת הדסה - רמת גן', 'בורגר סאלון'],
  cafe: ['קפה גרג - אבן גבירול', 'גולדה גלידה', 'ארומה קפה'],
  fuel: ['פז - תחנת דלק', 'סונול נתניה', 'DOR ALON 5521'],
  trans: ['רב-קו טעינה', 'GETT TAXI', 'מטרופולין'],
  park: ['PANGO PARKING', 'כביש 6 אגרה', 'חניון עזריאלי'],
  pharm: ['סופר-פארם 144', 'ניו-פארם'], health: ['מכבי שירותי בריאות', 'קופת חולים כללית - השתתפות'],
  shop: ['ZARA ISRAEL', 'איקאה נתניה', 'H&M - קניון עזריאלי', 'טמבור'], elec: ['KSP מחשבים', 'באג מחשבים'],
  fun: ['סינמה סיטי', 'הבימה - כרטיסים', 'STEAM PURCHASE'], vet: ['הקליניקה הוטרינרית רמת אביב'],
};
const AMT = { groc: [140, 620], rest: [60, 340], cafe: [18, 75], fuel: [180, 340], trans: [30, 120], park: [15, 90], pharm: [25, 190], health: [40, 260], shop: [80, 520], elec: [150, 900], fun: [50, 260], vet: [180, 420] };
const CARD_W = [['acc_cal', 4], ['acc_isra', 3], ['acc_lcard', 2]];
const cardPick = () => { let r = rand() * 9; for (const [a, w] of CARD_W) { if ((r -= w) < 0) return a; } return 'acc_cal'; };

const months = []; for (let y = 2025, m = 10; y < 2026 || m <= 10; ) { months.push([y, m]); if (++m > 12) { m = 1; y++; } }
for (const [y, m] of months) {
  const last = (y === 2026 && m === 10) ? 30 : dim(y, m);
  const d = (n) => iso(y, m, Math.min(n, last));
  const ok = (n) => d(n) <= TODAY;
  // bank
  if (ok(28)) tx({ account_id: 'acc_bank', date: d(28), minor: 2850000 + (m === 12 ? 900000 : 0), payee: m === 12 ? 'העברת משכורת + בונוס' : 'העברת משכורת', cat: 'salary' });
  if (ok(1)) tx({ account_id: 'acc_bank', date: d(1), minor: -620000, payee: 'העברה דיגיטל - שכר דירה', cat: 'rent' });
  if (ok(2)) tx({ account_id: 'acc_bank', date: d(2), minor: -Math.round(between(33000, 52000)), payee: 'חברת החשמל לישראל', cat: 'util' });
  if (ok(14) && m % 2 === 0) tx({ account_id: 'acc_bank', date: d(14), minor: -64000, payee: 'ארנונה - עיריית תל אביב', cat: 'muni' });
  if (ok(20)) tx({ account_id: 'acc_bank', date: d(20), minor: -200000, payee: 'הפקדה לקרן השתלמות', cat: 'save' });
  if (ok(10)) tx({ account_id: 'acc_bank', date: d(10), minor: -Math.round(between(180000, 320000)), payee: 'ישראכרט בע"מ-י', cat: 'wife', notes: 'card 1007' });
  if (ok(17) && rand() < 0.5) tx({ account_id: 'acc_bank', date: d(17), minor: -50000, payee: 'משיכת מזומן - כספומט', cat: 'shop' });
  // subscriptions and bills on the cards
  const sub = (day, payee, minor, cat, acc) => { if (ok(day)) tx({ account_id: acc, date: d(day), minor: -minor, payee, cat, standing: true }); };
  sub(3, 'NETFLIX.COM', 5490, 'subs', 'acc_isra'); sub(7, 'SPOTIFY P1A2B3C4', 2490, 'subs', 'acc_isra'); sub(12, 'APPLE.COM/BILL', 990, 'subs', 'acc_isra');
  sub(15, 'פלאפון תקשורת', 8990, 'tele', 'acc_cal'); sub(5, 'הולמס פלייס - מנוי', 24900, 'fun', 'acc_cal'); sub(9, 'HOT NET', 17900, 'tele', 'acc_cal');
  // everyday purchases
  const n = 30 + Math.floor(rand() * 12);
  for (let i = 0; i < n; i++) {
    const day = 1 + Math.floor(rand() * last); if (!ok(day)) continue;
    const k = pick(['groc', 'groc', 'groc', 'rest', 'rest', 'cafe', 'cafe', 'fuel', 'trans', 'park', 'pharm', 'health', 'shop', 'shop', 'fun', 'elec', 'vet']);
    if (k === 'vet' && rand() < 0.7) continue;
    const [lo, hi] = AMT[k]; const minor = -Math.round(between(lo, hi) * 100);
    const acc = cardPick();
    const t = tx({ account_id: acc, date: d(day), minor, payee: pick(P[k]), cat: k });
    if (k === 'rest' && acc !== 'acc_wife' && rand() < 0.35) {
      const covered = Math.round(Math.abs(minor) * (rand() < 0.5 ? 1 : between(0.5, 0.9)));
      tx({ account_id: acc, date: t.date, minor: covered, payee: 'חיוב תקציב סאפ', kind: 'EMPLOYER_COVERAGE', covers: t.id, cat: 'rest' });
    }
  }
  // a couple of foreign purchases on Isracard
  if (rand() < 0.7 && ok(8)) {
    const usd = Math.round(between(15, 140) * 100);
    tx({ account_id: 'acc_isra', date: d(8 + Math.floor(rand() * 10)), minor: -Math.round(usd * between(3.55, 3.75)), original: M(usd, 'USD'), scope: 'FOREIGN', payee: pick(['AMAZON.COM*2K4 AMZN', 'AMAZON.COM*9X1 AMZN', 'AIRBNB * HM4821', 'STEAM PURCHASE', 'GITHUB, INC.']), cat: pick(['shop', 'subs', 'fun']) });
  }
}
// installments: a laptop, six payments from August
for (let i = 1; i <= 3; i++) { const dd = iso(2026, 7 + i, 14); if (dd <= TODAY) tx({ account_id: 'acc_cal', date: dd, minor: -42000, payee: 'KSP מחשבים - תשלום ' + i + ' מתוך 6', cat: 'elec', inst: [i, 6] }); }
// travel
tx({ account_id: 'acc_isra', date: '2026-07-21', minor: -318000, original: M(86000, 'EUR'), scope: 'FOREIGN', payee: 'BOOKING.COM AMSTERDAM', cat: 'travel' });
tx({ account_id: 'acc_cal', date: '2026-07-04', minor: -154000, payee: 'אל על - כרטיסי טיסה', cat: 'travel' });

// The last three weeks arrive categorized by the model but not yet reviewed, plus a few it could not place.
const recent = TX.filter((t) => t.date >= '2026-10-09' && t.account_id !== 'acc_bank' && t.kind === 'PURCHASE').sort((a, b) => (a.date < b.date ? 1 : -1));
recent.forEach((t, i) => { t.categorized_by = 'LLM'; t.is_reviewed = false; t.llm_confidence = [0.97, 0.91, 0.88, 0.84, 0.79, 0.93][i % 6]; t.run_id = 'run_latest'; });
recent.filter((_, i) => i % 9 === 4).forEach((t) => { t.category_id = null; t.category_name_en = ''; t.category_name_he = ''; t.categorized_by = 'UNSET'; t.llm_confidence = null; t.run_id = null; });
const vetTx = TX.find((t) => t.category_id === 'cat_vet'); if (vetTx) { vetTx.categorized_by = 'LLM'; vetTx.is_reviewed = false; vetTx.llm_confidence = 0.76; vetTx.run_id = 'run_latest'; }

// bill dates and statements
const STMTS = new Map();
for (const t of TX) {
  const acc = ACC.find((a) => a.id === t.account_id);
  if (acc.type !== 'CREDIT_CARD') continue;
  const rule = acc.billing_rules.find((r) => r.scope === t.scope) || acc.billing_rules[0];
  const src = t.kind === 'EMPLOYER_COVERAGE' ? TX.find((x) => x.id === t.covers_transaction_id) : t;
  t.bill_date = billDate(rule, src.date, src.is_standing_order); t.bill_date_source = t.bill_date <= TODAY ? 'PDF' : 'RULE';
  const key = acc.id + '|' + t.bill_date;
  if (!STMTS.has(key)) STMTS.set(key, { id: 'stm_' + STMTS.size.toString(36), account_id: acc.id, account_name: acc.name, owner: acc.owner, bill_date: t.bill_date, txs: [] });
  STMTS.get(key).txs.push(t); t.statement_id = STMTS.get(key).id;
}
const SETTLE = []; // {id, statement_id, bank}
const LATEST_LCARD = [...STMTS.values()].filter((x) => x.account_id === 'acc_lcard' && x.bill_date <= TODAY).map((x) => x.bill_date).sort().pop();
let unlinked = null;
for (const st of [...STMTS.values()].sort((a, b) => (a.bill_date < b.bill_date ? -1 : 1))) {
  const net = -st.txs.reduce((s, t) => s + t.amount.minor, 0);
  if (st.bill_date <= TODAY && net > 0) {
    const bank = tx({ account_id: 'acc_bank', date: st.bill_date, minor: -net, payee: { Cal: 'כרטיסי אשראי-י', Isracard: 'ישראכרט בע"מ-י', Leumi: 'לאומי מאסטרקרד' }[ACC.find((a) => a.id === st.account_id).institution], cat: null });
    bank.is_reviewed = true;
    if (st.account_id === 'acc_lcard' && st.bill_date === LATEST_LCARD) { unlinked = { st, bank }; continue; }
    SETTLE.push({ id: id('set'), statement_id: st.id, bank });
  }
}
TX.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
// choose the opening balance so the account ends near 94,300
const bankSum = TX.filter((t) => t.account_id === 'acc_bank').reduce((s, t) => s + t.amount.minor, 0);
const OPENING = 9430000 - bankSum;

// ---- derived views ----
const catOf = (t) => CATS.find((c) => c.id === t.category_id);
const settledBank = new Set(SETTLE.map((s) => s.bank.id));
function flow(t) {
  if (t.kind === 'EMPLOYER_COVERAGE') return 'X';
  const c = catOf(t);
  if (c && c.type === 'TRANSFER') return 'X';
  if (t.account_id === 'acc_bank' && settledBank.has(t.id)) return 'X';
  if (c) return c.type === 'EXPENSE' ? 'S' : 'I';
  return t.amount.minor < 0 ? 'S' : 'I';
}
const coveredOf = (t) => TX.filter((x) => x.kind === 'EMPLOYER_COVERAGE' && x.covers_transaction_id === t.id).reduce((s, x) => s + x.amount.minor, 0);
const value = (t, measure) => { const f = flow(t); return f === 'S' ? -(t.amount.minor + (measure === 'OUT_OF_POCKET' ? coveredOf(t) : 0)) : f === 'I' ? t.amount.minor : 0; };
function scoped(p) {
  const accs = [].concat(p.account_id || []);
  return TX.filter((t) => (!p.owner || ACC.find((a) => a.id === t.account_id).owner === p.owner) && (!accs.length || accs.includes(t.account_id)) &&
    (!p.from || t.date >= p.from) && (!p.to || t.date <= p.to));
}
const ym = (s) => s.slice(0, 7);
const monthsBetween = (a, b) => { const out = []; let [y, m] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); while (y < y2 || (y === y2 && m <= m2)) { out.push(y + '-' + String(m).padStart(2, '0')); if (++m > 12) { m = 1; y++; } } return out; };

function statementView(st) {
  const gross = st.txs.filter((t) => t.kind !== 'EMPLOYER_COVERAGE').reduce((s, t) => s - t.amount.minor, 0);
  const expected = -st.txs.reduce((s, t) => s + t.amount.minor, 0);
  const sets = SETTLE.filter((x) => x.statement_id === st.id);
  const settled = sets.reduce((s, x) => s + Math.abs(x.bank.amount.minor), 0);
  const status = settled === 0 && st.bill_date > TODAY ? 'UPCOMING' : settled === 0 ? 'BILLED' : settled >= expected - 100 ? 'PAID' : 'PARTIAL';
  return { id: st.id, account_id: st.account_id, account_name: st.account_name, owner: st.owner, bill_date: st.bill_date, printed: st.bill_date <= TODAY ? M(expected) : null,
    gross: M(gross), expected: M(expected), settled: M(settled), status, tx_count: st.txs.length,
    settlements: sets.map((x) => ({ id: x.id, bank_tx_id: x.bank.id, bank_date: x.bank.date, bank_payee: x.bank.payee_raw, amount: M(Math.abs(x.bank.amount.minor)), source: 'AUTO', debit_total: M(Math.abs(x.bank.amount.minor)) })) };
}
const allStatements = () => [...STMTS.values()].map(statementView).sort((a, b) => (a.bill_date < b.bill_date ? -1 : a.bill_date > b.bill_date ? 1 : a.account_name < b.account_name ? -1 : 1));

function balance(acc, upTo) {
  const mv = TX.filter((t) => t.account_id === acc.id && t.date <= upTo).reduce((s, t) => s + t.amount.minor, 0);
  if (acc.type === 'BANK') return OPENING + mv;
  const paid = SETTLE.filter((x) => STMTS.get([...STMTS.keys()].find((k) => STMTS.get(k).id === x.statement_id)).account_id === acc.id && x.bank.date <= upTo).reduce((s, x) => s + Math.abs(x.bank.amount.minor), 0);
  return mv + paid;
}

function report(name, p) {
  const measure = p.measure || (name === 'cash-flow' || name === 'net-worth' ? 'OUT_OF_POCKET' : 'GROSS');
  const rows = scoped(p);
  if (name === 'cash-flow') {
    const by = {}; for (const t of rows) { const f = flow(t); if (f === 'X') continue; const m = ym(t.date); by[m] ||= { i: 0, s: 0 }; if (f === 'I') by[m].i += value(t, measure); else by[m].s += value(t, measure); }
    const ms = Object.keys(by).sort(); if (!ms.length) return { items: [] };
    return { items: monthsBetween(ms[0], ms[ms.length - 1]).map((m) => { const x = by[m] || { i: 0, s: 0 }; return { month: m, income: M(x.i), spending: M(x.s), net: M(x.i - x.s), savings_rate: x.i > 0 ? (x.i - x.s) / x.i : null }; }) };
  }
  if (name === 'category-breakdown') {
    const by = {}; let total = 0;
    for (const t of rows) { if (flow(t) !== 'S') continue; const k = t.category_id || ''; by[k] ||= { v: 0, n: 0 }; const v = value(t, measure); by[k].v += v; by[k].n++; total += v; }
    const items = Object.entries(by).map(([k, x]) => { const c = CATS.find((c) => c.id === k); return { category_id: k, name_en: c ? c.name_en : 'Uncategorized', name_he: c ? c.name_he : 'ללא קטגוריה', parent_id: '', amount: M(x.v), share: total > 0 ? x.v / total : 0, transactions: x.n }; }).sort((a, b) => b.amount.minor - a.amount.minor);
    return { items, total: M(total) };
  }
  if (name === 'heatmap') {
    const cell = {}; let lo = '9', hi = '0';
    for (const t of rows) { if (flow(t) !== 'S') continue; const m = ym(t.date), k = t.category_id || ''; (cell[k] ||= {})[m] = (cell[k][m] || 0) + value(t, measure); if (m < lo) lo = m; if (m > hi) hi = m; }
    const ms = lo <= hi ? monthsBetween(lo, hi) : []; const col = ms.map(() => 0);
    const out = Object.entries(cell).map(([k, byM]) => { const c = CATS.find((c) => c.id === k); let sum = 0; const cells = ms.map((m, i) => { const v = byM[m] || 0; sum += v; col[i] += v; return M(v); }); return { category_id: k, name_en: c ? c.name_en : 'Uncategorized', name_he: c ? c.name_he : 'ללא קטגוריה', cells, total: M(sum) }; }).sort((a, b) => b.total.minor - a.total.minor);
    return { months: ms, rows: out, totals: col.map((v) => M(v)) };
  }
  if (name === 'net-worth') {
    const to = p.to || TODAY; const from = p.from || '2025-10-01'; const pts = [];
    for (const m of monthsBetween(from.slice(0, 7), to.slice(0, 7))) { const e = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10); pts.push(e > to ? to : e); }
    return { items: pts.map((d) => { let a = 0, l = 0; for (const acc of ACC) { if (p.owner && acc.owner !== p.owner) continue; const ids = [].concat(p.account_id || []); if (ids.length && !ids.includes(acc.id)) continue; const b = balance(acc, d); if (acc.type === 'BANK') a += b; else l += -b; } return { date: d, assets: M(a), liabilities: M(l), net_worth: M(a - l) }; }) };
  }
  if (name === 'recurring') {
    const subs = TX.filter((t) => t.is_standing_order && t.amount.minor < 0); const by = {};
    for (const t of subs) (by[t.payee_raw] ||= []).push(t);
    return { items: Object.entries(by).map(([payee, l]) => { const ds = l.map((t) => t.date).sort(); const mean = Math.round(l.reduce((s, t) => s - t.amount.minor, 0) / l.length); return { payee, cadence: 'MONTHLY', count: l.length, typical: M(mean), fixed: true, monthly_cost: M(mean), first_date: ds[0], last_date: ds[ds.length - 1], next_expected: addD(ds[ds.length - 1], 30), active: true }; }).sort((a, b) => b.monthly_cost.minor - a.monthly_cost.minor) };
  }
  if (name === 'warnings') {
    const wife = TX.filter((t) => t.account_id === 'acc_bank' && t.category_id === 'cat_wife');
    return { hints_configured: true, unlinked_card_payments: unlinked ? [{ transaction_id: unlinked.bank.id, date: unlinked.bank.date, payee: unlinked.bank.payee_raw, amount: M(Math.abs(unlinked.bank.amount.minor)), counted: true, hidden: false, has_proposal: true }] : [], counted: M(unlinked ? Math.abs(unlinked.bank.amount.minor) : 0), hidden: M(0), linkable: unlinked ? 1 : 0, wife_count: wife.length };
  }
  return { items: [] };
}

// ---- request router ----
export class MockError extends Error { constructor(status, message) { super(message); this.status = status; } }
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const staged = new Map();

export async function mockRequest(method, path, { params = {}, body } = {}) {
  await delay(60 + rand() * 90);
  let m;
  if (path === '/api/v1/auth/me') return { auth_enabled: false, authenticated: true, user: { sub: 'local', name: 'Alice Example', email: 'alice@example.com' } };
  if (path === '/api/v1/accounts') return { items: ACC.map((a) => ({ ...a, balance: M(balance(a, TODAY)), opening_balance: M(a.type === 'BANK' ? OPENING : 0) })) };
  if (path === '/api/v1/categories' && method === 'GET') return { items: CATS.filter((c) => !params.created_by || c.created_by === params.created_by) };
  if (path === '/api/v1/categories' && method === 'POST') {
    if (CATS.some((c) => c.name_en.toLowerCase() === (body.name_en || '').toLowerCase())) throw new MockError(409, 'already exists');
    const c = { id: id('cat'), name_en: body.name_en, name_he: body.name_he || body.name_en, parent_id: null, color_hex: PAL[CATS.length % 8], icon: 'tag', type: body.type, monthly_budget: body.monthly_budget_minor ? M(body.monthly_budget_minor) : null, created_by: 'USER' };
    CATS.push(c); return c;
  }
  if ((m = path.match(/^\/api\/v1\/categories\/([^/]+)(\/merge)?$/))) {
    const i = CATS.findIndex((c) => c.id === m[1]); if (i < 0) throw new MockError(404, 'not found');
    if (m[2]) { const to = CATS.find((c) => c.id === body.into); TX.forEach((t) => { if (t.category_id === m[1]) Object.assign(t, { category_id: to.id, category_name_en: to.name_en, category_name_he: to.name_he }); }); CATS.splice(i, 1); return null; }
    if (method === 'DELETE') { TX.forEach((t) => { if (t.category_id === m[1]) Object.assign(t, { category_id: null, category_name_en: '', category_name_he: '', categorized_by: 'UNSET' }); }); CATS.splice(i, 1); return null; }
    const c = CATS[i]; for (const k of ['name_en', 'name_he', 'type']) if (body[k]) c[k] = body[k];
    if (body.monthly_budget_minor != null) c.monthly_budget = M(body.monthly_budget_minor); if (body.clear_budget) c.monthly_budget = null; if (body.keep) c.created_by = 'USER';
    return c;
  }
  if (path === '/api/v1/accounts' && method === 'POST') { const a = { id: id('acc'), name: body.name, type: body.type, institution: body.institution, owner: body.owner || '', last4: body.last4 || '', currency: 'ILS', billing_rules: body.billing_rules || [] }; ACC.push(a); return { ...a, balance: M(0), opening_balance: M(0) }; }
  if ((m = path.match(/^\/api\/v1\/accounts\/([^/]+)\/billing-rules$/))) { const a = ACC.find((x) => x.id === m[1]); a.billing_rules = body.rules; return { rules: a.billing_rules, bill_dates_recomputed: 0 }; }
  if (path === '/api/v1/categorization/runs' && method === 'GET') return { items: [{ id: 'run_latest', status: 'DONE', started_at: '2026-10-30 08:05:11', finished_at: '2026-10-30 08:07:40', classifier_model: 'qwen2.5-7b-instruct', generator_model: 'qwen2.5-14b-instruct', threshold: 0.75, processed: 71, total: 71, error: '' }] };
  if (/^\/api\/v1\/categorization\/runs\/[^/]+\/undo$/.test(path)) return { reverted: 22 };
  if (path === '/api/v1/settings/test-llm') return { classifier: { ok: true }, generator: { ok: true } };
  if (path === '/api/v1/transactions' && method === 'GET') {
    let rows = scoped({ from: params.from, to: params.to, account_id: params.account_id, owner: params.owner });
    const cats = [].concat(params.category_id || []);
    if (cats.length) rows = rows.filter((t) => (cats.includes('uncategorized') && !t.category_id) || cats.includes(t.category_id));
    if (params.needs_review) rows = rows.filter((t) => !t.is_reviewed && t.kind !== 'EMPLOYER_COVERAGE');
    if (params.q) { const q = params.q.toLowerCase(); rows = rows.filter((t) => t.payee_raw.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)); }
    const limit = Math.min(+params.limit || 50, 500), offset = +params.offset || 0;
    return { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
  }
  if (path === '/api/v1/transactions' && method === 'PATCH') {
    let n = 0;
    for (const t of TX) if (body.ids.includes(t.id)) {
      n++;
      if (body.category_id) { const c = CATS.find((c) => c.id === body.category_id); Object.assign(t, { category_id: c.id, category_name_en: c.name_en, category_name_he: c.name_he, categorized_by: 'MANUAL', llm_confidence: null, is_reviewed: true }); }
      if (body.clear_category) Object.assign(t, { category_id: null, category_name_en: '', category_name_he: '', categorized_by: 'UNSET', is_reviewed: false });
      if (body.reviewed != null) t.is_reviewed = body.reviewed;
    }
    return { updated: n };
  }
  if ((m = path.match(/^\/api\/v1\/transactions\/([^/]+)$/))) { const t = TX.find((t) => t.id === m[1]); if (!t) throw new MockError(404, 'not found'); return t; }
  if ((m = path.match(/^\/api\/v1\/reports\/([a-z-]+)$/))) return report(m[1], params);
  if (path === '/api/v1/statements') { let s = allStatements(); if (params.owner) s = s.filter((x) => x.owner === params.owner); if (params.status) s = s.filter((x) => [].concat(params.status).map((q) => q.toUpperCase()).includes(x.status)); if (params.from) s = s.filter((x) => x.bill_date >= params.from); if (params.to) s = s.filter((x) => x.bill_date <= params.to); return { items: s }; }
  if (path === '/api/v1/billing/upcoming') {
    const days = []; for (const s of allStatements()) { if (s.status === 'PAID' || (params.owner && s.owner !== params.owner)) continue; const rem = s.expected.minor - s.settled.minor; if (rem <= 0) continue; let d = days.find((x) => x.date === s.bill_date); if (!d) days.push((d = { date: s.bill_date, total: M(0), statements: [] })); d.total = M(d.total.minor + rem); d.statements.push(s); }
    return { items: days.sort((a, b) => (a.date < b.date ? -1 : 1)) };
  }
  if (path === '/api/v1/billing/review') return { items: [{ statement_id: 'x', account_name: 'Isracard 1002', bill_date: '2026-09-02', kind: 'DEBIT_DATE', detail: 'bank debit on 2026-09-03 but the statement is dated 2026-09-02' }] };
  if (path === '/api/v1/settlements/proposals') return { items: unlinked ? [{ statement_id: unlinked.st.id, account_id: unlinked.st.account_id, account_name: unlinked.st.account_name, bill_date: unlinked.st.bill_date, bank_tx_id: unlinked.bank.id, bank_date: unlinked.bank.date, bank_payee: unlinked.bank.payee_raw, amount: M(Math.abs(unlinked.bank.amount.minor)), date_gap: 0, amount_diff: 0, exact: true }] : [] };
  if (path === '/api/v1/settlements/proposals/confirm-all' || path === '/api/v1/settlements/proposals/confirm') { if (unlinked) { SETTLE.push({ id: id('set'), statement_id: unlinked.st.id, bank: unlinked.bank }); settledBank.add(unlinked.bank.id); unlinked = null; return { confirmed: 1 }; } return { confirmed: 0 }; }
  if (path === '/api/v1/imports' && method === 'GET') return { items: [
    { id: 'b3', source: 'CAL_PDF', filename: '2026-10.pdf', account_name: 'Cal 1001', rows: 38, created_at: '2026-10-11 09:12:03', undone_at: '' },
    { id: 'b2', source: 'LEUMI_BANK_XLS', filename: 'תנועות בחשבון 30_10_2026.xls', account_name: 'Leumi checking', rows: 117, created_at: '2026-10-30 08:01:44', undone_at: '' },
    { id: 'b1', source: 'ISRACARD_PDF', filename: 'Isracard-2026-09.pdf', account_name: 'Isracard 1002', rows: 22, created_at: '2026-09-11 18:40:10', undone_at: '' }] };
  if (path === '/api/v1/imports/inspect-csv') return { delimiter: ',', columns: ['Date', 'Description', 'Amount'], sample: [['30/10/2026', 'שופרסל דיל', '-342.90'], ['29/10/2026', 'WOLT', '-91.80']], rows: 214, date_formats: ['DD/MM/YYYY', 'DD/MM/YY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY'] };
  if (path === '/api/v1/imports/stage') {
    const sid = id('stage'); const acc = ACC[1]; staged.set(sid, 1);
    return { stage_id: sid, source: 'CAL_PDF', filename: body.filename, last4: '1001', line_count: 41, account_id: acc.id, statements: [{ bill_date: '2026-11-10', printed_total: M(1290440) }], warnings: ['2 lines are in a foreign currency; the issuer-billed amount is used.'],
      rejected: [], preview: { new: 39, duplicates: 2, skipped: [], rejected: [], statements: [{ bill_date: '2026-11-10', printed_total: M(1290440) }], warnings: [] },
      sample_lines: [{ date: '2026-10-28', payee: 'שופרסל דיל תל אביב 421', amount: M(-34290), bill_date: '2026-11-10' }, { date: '2026-10-27', payee: 'קפה גרג - אבן גבירול', amount: M(-2850), bill_date: '2026-11-10' }, { date: '2026-10-27', payee: 'חיוב תקציב סאפ', amount: M(18000), bill_date: '2026-11-10', kind: 'EMPLOYER_COVERAGE' }, { date: '2026-10-25', payee: 'WOLT', amount: M(-9180), bill_date: '2026-11-10' }] };
  }
  if (/^\/api\/v1\/imports\/staged\/[^/]+\/commit$/.test(path)) return { batch_id: 'b4', inserted: 39, duplicates: 2, skipped: [], rejected: [], warnings: [], bill_dates_assigned: 0 };
  if (path === '/api/v1/categorization/runs' && method === 'POST') return { started: false, reason: 'no uncategorized transactions' };
  if (path === '/api/v1/settings' && method === 'PUT') return mockRequest('GET', path, {});
  if (path === '/api/v1/settings') return { items: [{ key: 'llm_base_url', label: 'LLM endpoint (OpenAI-compatible base URL)', secret: false, is_set: true, value: 'http://localai.lan:8080/v1' }, { key: 'llm_api_key', label: 'LLM API key', secret: true, is_set: true, value: '' }, { key: 'classifier_model', label: 'Decision (classifier) model', secret: false, is_set: true, value: 'qwen2.5-7b-instruct' }, { key: 'generator_model', label: 'Generator model', secret: false, is_set: true, value: 'qwen2.5-14b-instruct' }, { key: 'categorization_threshold', label: 'Confidence needed to use an existing category', secret: false, is_set: false, value: '' }, { key: 'categorization_batch_size', label: 'Distinct payees per request', secret: false, is_set: false, value: '' }, { key: 'card_payment_hints', label: 'Words that mark a bank line as a card payment (one per line)', secret: false, is_set: true, value: 'כרטיסי אשראי\nישראכרט\nלאומי מאסטרקרד' }] };
  throw new MockError(404, 'no mock for ' + method + ' ' + path);
}
