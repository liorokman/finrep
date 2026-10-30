// A tiny element builder. Every string becomes a text node, so data can never turn into markup:
// there is deliberately no innerHTML anywhere in the UI.
const SVG_NS = 'http://www.w3.org/2000/svg';
const HEBREW = /[֐-׿]/;
const FORBIDDEN = new Set(['innerHTML', 'outerHTML', 'srcdoc']);

function applyProps(el, props, isSvg) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (FORBIDDEN.has(k)) throw new Error('dom: ' + k + ' is not allowed');
    if (k === 'class') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v));
    else if (k === 'style') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, String(val)); else el.style[p] = val;
      }
    } else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if ((k === 'href' || k === 'src') && /^\s*(javascript|data):/i.test(String(v)) && !(k === 'src' && /^data:image\//i.test(String(v)))) continue;
    else if (!isSvg && (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected' || k === 'indeterminate')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

export function append(el, kids) {
  for (const c of kids) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  return el;
}

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  applyProps(el, props, false);
  return append(el, kids);
}

export function s(tag, props, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props, true);
  return append(el, kids);
}

export function mount(parent, ...kids) {
  parent.replaceChildren();
  return append(parent, kids);
}

export const hasHebrew = (str) => HEBREW.test(str || '');

// Text that comes from the user's data: isolated from its surroundings, direction chosen from its own
// first strong character, language-tagged when Hebrew so the right font is used.
export function ut(text, extra) {
  const str = text == null ? '' : String(text);
  return h('span', { class: ['ut', extra], dir: 'auto', lang: hasHebrew(str) ? 'he' : null }, str);
}

// The same, as a block that truncates at its logical end.
export function utBlock(text, extra) {
  const str = text == null ? '' : String(text);
  return h('span', { class: ['ut-block', extra], dir: 'auto', lang: hasHebrew(str) ? 'he' : null, title: str }, str);
}

export function on(el, ev, fn, opts) { el.addEventListener(ev, fn, opts); return () => el.removeEventListener(ev, fn, opts); }
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
