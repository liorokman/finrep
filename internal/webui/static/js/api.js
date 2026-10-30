// The only place that talks to the server. In sample-data mode the same calls are answered locally.
import { mockRequest, MockError, TODAY } from './mock.js';
import { state } from './state.js';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let csrf = '';
export const setCSRF = (t) => { csrf = t || ''; };

function query(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v == null || v === '' || v === false) continue;
    for (const x of [].concat(v)) q.append(k, x === true ? 'true' : String(x));
  }
  const s = q.toString();
  return s ? '?' + s : '';
}

async function request(method, path, { params, body, form } = {}) {
  if (state.mock) {
    try { return await mockRequest(method, path, { params, body: body || (form && { filename: form.get('file')?.name }) }); }
    catch (e) { if (e instanceof MockError) throw new ApiError(e.status, e.message); throw e; }
  }
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(path + query(params), { method, headers, body: payload, credentials: 'same-origin' }); }
  catch (e) { throw new ApiError(0, 'Cannot reach the server'); }
  if (res.status === 401) { location.href = '/auth/login?next=' + encodeURIComponent(location.pathname + location.hash); throw new ApiError(401, 'Login required'); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || res.statusText || 'Request failed');
  return data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body: body ?? {} }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, { form }),
};

export function todayISO() {
  if (state.mock) return TODAY;
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
