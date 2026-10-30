// Charts. SVG is drawn at the container's real pixel width (no scaling), so text stays crisp and 1px
// lines stay 1px. Everything user-supplied goes in through text nodes. Each chart has a table twin.
import { h, s, mount, ut, utBlock } from './dom.js';
import { compact, money, monthShort, date, toMajor } from './format.js';
import { attachTip, tipRows, hideTip, showTip } from './ui.js';

// Re-draw whenever the container's width changes.
function responsive(box, draw) {
  let last = -1;
  const run = () => { const w = Math.floor(box.clientWidth); if (w > 0 && Math.abs(w - last) > 1) { last = w; draw(w); } };
  new ResizeObserver(run).observe(box);
  requestAnimationFrame(run);
  return box;
}

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
// Text colour on a categorical fill: white, except near-black on yellow (series 4).
export const inkOn = (i) => (i === 3 ? '#0b0b0b' : '#ffffff');

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function ticks(max, n = 4) { const step = max / n; return Array.from({ length: n + 1 }, (_, i) => i * step); }

// Round the axis outward to a clean step (1, 2, 2.5, 5 x 10^n) so ticks read as 0 / 20K / 40K, never 73.5K.
function niceScale(lo, hi, n = 4) {
  if (hi === lo) { hi = lo + 1; }
  const raw = (hi - lo) / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * p >= raw) || 10) * p;
  const min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step) };
}

export function legend(items) {
  return h('div', { class: 'legend', role: 'list' }, items.map((it) => h('span', { class: 'key', role: 'listitem' }, h('i', { class: it.line ? 'ln' : 'sw', style: { '--c': it.color } }), it.label)));
}

// Grouped columns: one group per period, one thin bar per series.
export function columns({ labels, groupLabels, series, currency = 'ILS', height = 240 }) {
  const box = h('div', { class: 'chart' });
  return responsive(box, (W) => {
    const m = { t: 10, r: 8, b: 26, l: 52 };
    const iw = W - m.l - m.r, ih = height - m.t - m.b;
    const sc = niceScale(0, Math.max(...series.flatMap((x) => x.values), 1)), max = sc.max;
    const y = (v) => m.t + ih - (v / max) * ih;
    const gw = iw / labels.length;
    const bw = Math.max(4, Math.min(18, (gw - 10) / series.length - 2));
    const svg = s('svg', { width: W, height, viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': 'Chart: ' + series.map((x) => x.name).join(' and ') + ' by month. A table view is available.' });
    const grid = s('g', { class: 'grid' }), axis = s('g', { class: 'axis' });
    for (const t of sc.ticks) {
      if (t > 0) grid.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
      axis.appendChild(s('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, compact({ minor: t, currency })));
    }
    svg.append(grid, s('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: y(0), y2: y(0) }), axis);
    const every = Math.ceil(labels.length / Math.max(1, Math.floor(iw / 44)));
    labels.forEach((lb, i) => {
      const gx = m.l + gw * i, cx = gx + gw / 2;
      if (i % every === 0) axis.appendChild(s('text', { x: cx, y: height - 8, 'text-anchor': 'middle' }, lb));
      const gl = s('g', { class: 'mark-col' });
      const total = series.length * bw + (series.length - 1) * 2;
      series.forEach((sr, k) => {
        const v = sr.values[i]; if (v <= 0) return;
        const x = cx - total / 2 + k * (bw + 2), top = y(v), hgt = y(0) - top, r = Math.min(4, hgt / 2, bw / 2);
        gl.appendChild(s('path', { class: 'mark', fill: sr.color, d: `M${x} ${y(0)}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + bw - r}Q${x + bw} ${top} ${x + bw} ${top + r}V${y(0)}Z` }));
      });
      const hit = s('rect', { class: 'hit', x: gx, y: m.t, width: gw, height: ih + 4, tabindex: 0, role: 'img',
        'aria-label': (groupLabels ? groupLabels[i] : lb) + ': ' + series.map((x) => x.name + ' ' + money({ minor: x.values[i], currency })).join(', ') });
      const on = () => gl.classList.add('on'), off = () => { gl.classList.remove('on'); hideTip(); };
      hit.addEventListener('pointerenter', on); hit.addEventListener('pointerleave', off); hit.addEventListener('focus', on); hit.addEventListener('blur', off);
      attachTip(hit, () => tipRows(groupLabels ? groupLabels[i] : lb, series.map((x) => ({ color: x.color, name: x.name, value: money({ minor: x.values[i], currency }) }))));
      svg.append(gl, hit);
    });
    mount(box, svg);
  });
}

// Lines over time, with a crosshair that snaps to the nearest point and one tooltip for every series.
export function lines({ dates, series, currency = 'ILS', height = 240, endLabels = true }) {
  const box = h('div', { class: 'chart' });
  return responsive(box, (W) => {
    const m = { t: 12, r: endLabels ? 74 : 12, b: 26, l: 56 };
    const iw = W - m.l - m.r, ih = height - m.t - m.b;
    const all = series.flatMap((x) => x.values);
    const sc = niceScale(Math.min(0, ...all), Math.max(...all, 1)), min = sc.min, max = sc.max;
    const y = (v) => m.t + ih - ((v - min) / (max - min)) * ih;
    const x = (i) => m.l + (dates.length === 1 ? iw / 2 : (iw * i) / (dates.length - 1));
    const svg = s('svg', { width: W, height, viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': 'Line chart of ' + series.map((q) => q.name).join(', ') + '. A table view is available.' });
    const grid = s('g', { class: 'grid' }), axis = s('g', { class: 'axis' });
    for (const t of sc.ticks) { if (t !== 0) grid.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) })); axis.appendChild(s('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, compact({ minor: t, currency }))); }
    svg.append(grid, s('line', { class: 'baseline', x1: m.l, x2: W - m.r, y1: y(Math.max(min, 0)), y2: y(Math.max(min, 0)) }), axis);
    const every = Math.ceil(dates.length / Math.max(1, Math.floor(iw / 56)));
    dates.forEach((d, i) => { const last = i === dates.length - 1; if ((i % every === 0 && !(dates.length - 1 - i > 0 && x(dates.length - 1) - x(i) < 52)) || last) axis.appendChild(s('text', { x: x(i), y: height - 8, 'text-anchor': i === 0 ? 'start' : i === dates.length - 1 && dates.length > 2 ? 'end' : 'middle' }, monthShort(d) + (d.slice(5, 7) === '01' ? " '" + d.slice(2, 4) : ''))); });
    series.forEach((sr, k) => {
      const pts = sr.values.map((v, i) => [x(i), y(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
      if (series.length === 1) svg.appendChild(s('path', { d: d + `L${pts[pts.length - 1][0]} ${y(Math.max(min, 0))}L${pts[0][0]} ${y(Math.max(min, 0))}Z`, fill: sr.color, opacity: 0.1 }));
      svg.appendChild(s('path', { d, fill: 'none', stroke: sr.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: sr.dashed ? 'dashed' : '' }));
      const [ex, ey] = pts[pts.length - 1];
      svg.appendChild(s('circle', { class: 'endcap', cx: ex, cy: ey, r: 4, fill: sr.color }));
      if (endLabels) svg.appendChild(s('text', { class: 'dlabel', x: ex + 10, y: ey + 4 }, compact({ minor: sr.values[sr.values.length - 1], currency })));
    });
    const cross = s('line', { class: 'crosshair', y1: m.t, y2: m.t + ih, visibility: 'hidden' });
    const hit = s('rect', { class: 'hit', x: m.l - 6, y: m.t, width: iw + 12, height: ih, tabindex: 0, 'aria-label': 'Values by date. Use the table view for exact numbers.' });
    let cur = dates.length - 1;
    const show = (i) => {
      cur = Math.max(0, Math.min(dates.length - 1, i));
      cross.setAttribute('x1', x(cur)); cross.setAttribute('x2', x(cur)); cross.setAttribute('visibility', 'visible');
      const r = hit.getBoundingClientRect();
      showTip(tipRows(date(dates[cur], { year: true }), series.map((q) => ({ color: q.color, name: q.name, value: money({ minor: q.values[cur], currency }) }))), r.left + x(cur) - m.l + 6, r.top + 20);
    };
    hit.addEventListener('pointermove', (e) => { const r = hit.getBoundingClientRect(); const rel = e.clientX - r.left - 6; show(Math.round((rel / iw) * (dates.length - 1))); });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
    hit.addEventListener('focus', () => show(dates.length - 1)); hit.addEventListener('blur', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
    hit.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); } });
    svg.append(cross, hit);
    mount(box, svg);
  });
}

// Ranked horizontal bars (HTML, so Hebrew names align and truncate correctly). Each row is two lines:
// the name and amount, then the bar, so long names never fight the bar for width.
export function hbars(items, { onPick, color = 'var(--s1)' } = {}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return h('div', { class: 'hbars' }, items.map((it) => {
    const el = h(onPick ? 'button' : 'div', { class: 'hb', type: onPick ? 'button' : null, onclick: onPick ? () => onPick(it) : null },
      h('div', { class: 'nm' }, utBlock(it.name, 'a'), it.alt && utBlock(it.alt, 'b')),
      h('div', { class: 'val amount' }, it.valueText, it.sub && h('span', { class: 'pct' }, it.sub)),
      h('div', { class: 'track' }, h('i', { class: 'fill', style: { '--w': (it.value / max) * 100, '--c': it.color || color } })));
    if (it.tip) attachTip(el, () => it.tip);
    return el;
  }));
}

// One whole split into at most six parts.
export function segbar(parts, { label = 'Split' } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const bar = h('div', { class: 'segbar', role: 'img', 'aria-label': label + ': ' + parts.map((p) => p.name + ' ' + Math.round((p.value / total) * 100) + '%').join(', ') });
  parts.forEach((p, i) => {
    const share = p.value / total;
    const el = h('button', { type: 'button', class: 'seg-part', style: { '--w': p.value, '--c': SERIES[i], '--ink-on': inkOn(i) } }, share >= 0.12 ? Math.round(share * 100) + '%' : null);
    attachTip(el, () => tipRows(null, [{ color: SERIES[i], name: p.name, value: p.text + ' · ' + Math.round(share * 100) + '%' }]));
    bar.appendChild(el);
  });
  return h('div', { class: 'stack', style: { gap: '10px' } }, bar, legend(parts.map((p, i) => ({ color: SERIES[i], label: p.name }))));
}

// Month x category heat map on the sequential blue ramp. Zero is an empty well, not the lightest step.
export function heatmap({ months, rows, totals, currency = 'ILS', onCell, perRow = false }) {
  const max = Math.max(...rows.flatMap((r) => r.cells), 1);
  const step = (v, r) => Math.min(7, Math.max(1, Math.ceil(Math.sqrt(v / (perRow ? Math.max(...r.cells, 1) : max)) * 7)));
  const grid = h('div', { class: 'heat', style: { '--cols': months.length + 1 }, role: 'table', 'aria-label': 'Spending by category and month' });
  grid.appendChild(h('div'));
  months.forEach((m) => grid.appendChild(h('div', { class: 'hh', role: 'columnheader' }, monthShort(m) + (m.endsWith('-01') ? " '" + m.slice(2, 4) : ''))));
  grid.appendChild(h('div', { class: 'hh', style: { textAlign: 'end' } }, 'Total'));
  for (const r of rows) {
    grid.appendChild(h('div', { class: 'hn', role: 'rowheader' }, utBlock(r.name)));
    r.cells.forEach((v, i) => {
      const st = step(v, r);
      const cell = h('button', { type: 'button', class: ['cell', v > 0 && 'v', v <= 0 && 'zero'], style: v > 0 ? { '--bg': `var(--seq-${st * 100})`, '--fg': st >= 4 ? 'var(--seq-ink-dark)' : 'var(--seq-ink-light)' } : {}, 'aria-label': r.name + ', ' + monthShort(months[i]) + ' ' + months[i].slice(0, 4) + ': ' + money({ minor: v, currency }), onclick: () => onCell && onCell(r, months[i]) });
      if (v > 0) attachTip(cell, () => tipRows(r.name + ' · ' + monthShort(months[i]) + ' ' + months[i].slice(0, 4), [{ name: 'Spent', value: money({ minor: v, currency }) }]));
      grid.appendChild(cell);
    });
    grid.appendChild(h('div', { class: 'tot amount', style: { alignSelf: 'center' } }, compact({ minor: r.total, currency })));
  }
  return grid;
}

export function sparkline(values, { color } = {}) {
  const W = 180, H = 36, p = 4;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => [p + ((W - 2 * p) * i) / Math.max(1, values.length - 1), H - p - ((v - lo) / span) * (H - 2 * p)]);
  const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  const last = pts[pts.length - 1];
  return s('svg', { class: 'spark', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' },
    s('path', { class: 'area', d: d + `L${last[0]} ${H}L${pts[0][0]} ${H}Z`, style: color ? { fill: color } : null }), s('path', { class: 'line', d, style: color ? { stroke: color } : null }), s('circle', { cx: last[0], cy: last[1], r: 4, style: color ? { fill: color } : null }));
}

// Upcoming bank outflow, one column per debit day.
export function timeline(days, { currency = 'ILS', today, onPick } = {}) {
  const max = Math.max(...days.map((d) => d.value), 1);
  return h('div', { class: 'tl', role: 'list' }, days.map((d) => {
    const el = h('button', { type: 'button', class: 'day', role: 'listitem', onclick: () => onPick && onPick(d), 'aria-label': d.label + ': ' + money({ minor: d.value, currency }) },
      h('span', { class: 'amt amount' }, compact({ minor: d.value, currency })),
      h('i', { class: 'col', style: { '--h': Math.max(3, (d.value / max) * 92) } }),
      h('span', { class: ['when', d.sub === 'overdue' && 'late'] }, h('b', null, d.when), d.sub));
    attachTip(el, () => tipRows(d.label, d.rows));
    return el;
  }));
}
