// The sign-in and first-run screens used with local login (--auth=local). OIDC logins happen at the provider.
import { h, mount, $ } from './dom.js';
import { icon } from './icons.js';
import { api, setCSRF } from './api.js';

// Shows the form for `setup` (create the admin user) or sign-in, and resolves with the /auth/me answer once it succeeds.
export function authScreen(setup) {
  return new Promise((resolve) => {
    const error = h('div', { class: 'alert warn', role: 'alert', hidden: true });
    const fail = (msg) => { mount(error, icon('alert'), h('div', null, msg)); error.hidden = false; };
    const field = (label, name, type, autocomplete, extra = {}) => h('div', { class: 'field' }, h('label', { for: 'auth-' + name }, label),
      h('input', { class: 'input', id: 'auth-' + name, name, type, autocomplete, required: true, ...extra }));
    const user = field('Username', 'username', 'text', 'username', { autofocus: true, maxlength: 64 });
    const pass = field('Password', 'password', 'password', setup ? 'new-password' : 'current-password', setup ? { minlength: 10 } : {});
    const again = setup && field('Repeat the password', 'again', 'password', 'new-password');
    const submit = h('button', { class: 'btn primary', type: 'submit' }, setup ? 'Create admin user' : 'Sign in');
    const form = h('form', { class: 'stack', onsubmit: async (e) => {
      e.preventDefault(); error.hidden = true;
      const v = (n) => form.elements[n].value;
      if (setup && v('password') !== v('again')) { fail('The two passwords differ.'); return; }
      submit.disabled = true;
      try {
        const me = await api.post(setup ? '/api/v1/auth/setup' : '/api/v1/auth/login', { username: v('username'), password: v('password') });
        setCSRF(me.csrf_token);
        resolve(me);
      } catch (err) { fail(err.message); submit.disabled = false; form.elements.password.select(); }
    } }, user, pass, again, error, submit);
    mount($('#app'), h('main', { class: 'auth-screen' }, h('div', { class: 'card auth-card' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, icon('chart')), 'FinRep'),
      h('h1', null, setup ? 'Welcome. Create the admin user' : 'Sign in'),
      setup && h('p', { class: 'muted small' }, 'This is the first run. Choose the username and password you will use to sign in; the password must be at least 10 characters. You can change it later under Settings.'),
      form)));
    user.querySelector('input').focus();
  });
}
