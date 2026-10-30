// Opt-in browser smoke test: node smoke.mjs <base-url>. Needs Google Chrome. Uses the sample-data mode.
import { launch } from './cdp.mjs';
const base = process.argv[2] || 'http://127.0.0.1:18090';
const b = await launch({ width: 1440, height: 1000 });
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
try {
  for (const view of ['overview', 'transactions', 'cards', 'import', 'reports', 'reports/heatmap', 'categories', 'settings']) {
    await b.open(`${base}/?mock=1&theme=light#/${view}`, 1500);
    const err = await b.eval(`(document.querySelector('.alert.warn')||{}).textContent || ''`);
    const cards = await b.eval(`document.querySelectorAll('.card').length`);
    check(!err && cards > 0, `${view} renders (${cards} cards)${err ? ': ' + err : ''}`);
  }
  // A bank account has its own page: balance chart and movements with a running balance.
  await b.open(`${base}/?mock=1#/cards`, 1500);
  await b.click('button.cardtile', 0); await b.sleep(900);
  check(await b.eval(`!!document.querySelector('.chart svg') && document.querySelectorAll('tbody tr').length > 5`), 'bank account page shows a balance chart and movements');
  // Hebrew truncation: the clipping element must itself be RTL so the ellipsis lands on the logical end.
  await b.open(`${base}/?mock=1#/transactions`, 1800);
  const bad = await b.eval(`[...document.querySelectorAll('.ut-block[lang=he]')].filter((e) => /^[^A-Za-z\u0590-\u05FF]*[\u0590-\u05FF]/.test(e.textContent) && getComputedStyle(e).direction !== 'rtl').length`);
  check(bad === 0, 'Hebrew truncating elements are right-to-left');
  const amountsLtr = await b.eval(`[...document.querySelectorAll('.amount')].every((e) => getComputedStyle(e).direction === 'ltr')`);
  check(amountsLtr, 'amounts are always left-to-right');
  // Search accepts Hebrew; the category picker matches Hebrew names.
  await b.type('input[type=search]', 'שופרסל');
  const n = await b.eval(`document.querySelectorAll('tbody tr').length`);
  check(n > 0, `Hebrew search finds rows (${n})`);
  await b.eval('document.activeElement.blur()');
  // Keyboard review: move focus and open the drawer.
  await b.key('j'); await b.key('Enter');
  check(await b.eval(`!!document.querySelector('.drawer')`), 'Enter opens the detail drawer');
  await b.key('Escape');
  check(await b.eval(`!document.querySelector('.drawer')`), 'Escape closes it');
  await b.open(`${base}/?mock=1&theme=dark#/overview`, 1500);
  check(await b.eval(`document.documentElement.getAttribute('data-theme') === 'dark'`), 'dark theme applies');
} catch (e) { console.error(e); failed++; } finally { await b.close(); }
process.exit(failed ? 1 : 0);
