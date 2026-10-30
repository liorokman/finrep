// Minimal Chrome DevTools driver: node cdp.mjs <script.mjs>. The script default-exports async (b) => {...}
import { spawn } from 'node:child_process';
import fs from 'node:fs';
export async function launch({ width = 1440, height = 1000, scale = 1 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, '--user-data-dir=/tmp/finrep-ui-profile-' + port, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) { /* wait */ } await new Promise((r) => setTimeout(r, 200)); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = {
    send, sleep,
    async open(url, wait = 1200) { await send('Page.navigate', { url }); await sleep(wait); },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
    async click(sel, nth = 0) { await b.eval(`(()=>{const el=document.querySelectorAll(${JSON.stringify(sel)})[${nth}]; if(!el) throw new Error('no ${sel}'); el.click();})()`); await sleep(250); },
    async type(sel, text) { await b.eval(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); el.focus(); el.value=${JSON.stringify(text)}; el.dispatchEvent(new Event('input',{bubbles:true}));})()`); await sleep(500); },
    async key(key, { shift = false } = {}) { const code = { Enter: 13, ArrowDown: 40, ArrowUp: 38, Escape: 27, ' ': 32 }[key]; const base = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: code || key.toUpperCase().charCodeAt(0), modifiers: shift ? 8 : 0 }; await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key.length === 1 ? key : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }); await sleep(250); },
    async shot(name, { full = false } = {}) { let clip; if (full) { const m = await send('Page.getLayoutMetrics'); clip = { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 }; } const r = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: full }); fs.writeFileSync(`${process.env.UI_SHOTS || '/tmp'}/${name}.png`, Buffer.from(r.data, 'base64')); },
    async clipShot(name, x, y, w, hh, s = 2) { const r = await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: hh, scale: s } }); fs.writeFileSync(`${process.env.UI_SHOTS || '/tmp'}/${name}.png`, Buffer.from(r.data, 'base64')); },
    async close() { ws.close(); proc.kill(); },
  };
  return b;
}
