// Node >=22.13. No real network calls, credentials, or messages are used.
// These contract tests run the actual route and inline client scripts with mocked
// Turnstile/Resend and a minimal DOM. They do not prove production email delivery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const apiSource = stripTypeScriptTypes(read('src/pages/api/contact.ts'))
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]@\/lib\/security['"];?/, '')
  .replaceAll('import.meta.env', '__env')
  .replaceAll('export const ', 'const ')
  + '\nglobalThis.routes = { POST, GET };';
const fixture = () => ({
  name: 'PRUEBA AUTOMATIZADA', company: 'Empresa de prueba', email: 'test@example.com',
  phone: '600000000', profile: 'Empresa de transporte', topic: 'Otra consulta',
  message: 'Consulta de prueba', why: '', website: '', turnstileToken: 'test-token',
  startedAt: String(Date.now() - 10000),
});

function api(options = {}) {
  const emails = [];
  const tokens = [];
  const context = {
    Request, Response, AbortSignal, Error,
    __env: options.noKey ? {} : { RESEND_API_KEY: 'test-only-not-a-real-key' },
    console: { error() {}, warn() {} },
    getClientIp: () => 'test-only-ip',
    isHoneypotFilled: (data) => Boolean(data.website),
    isTooFast: () => Boolean(options.tooFast),
    checkRateLimit: () => ({ allowed: !options.limited, retryAfter: 60 }),
    isBlockedEmailDomain: (email) => email.endsWith('@mailinator.com'),
    verifyTurnstile: async (token) => { tokens.push(token); return Boolean(token) && !options.invalidToken; },
    fetch: async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails');
      emails.push(JSON.parse(init.body));
      if (options.wait) await options.wait;
      if (options.networkError) throw new Error('Mock network failure');
      return new Response(JSON.stringify(options.noEmailId ? {} : { id: 'mock-email-id' }), {
        status: options.providerStatus || 200,
      });
    },
  };
  vm.runInNewContext(apiSource, context, { filename: 'contact.ts', timeout: 2000 });
  return {
    emails, tokens,
    post: (data) => context.routes.POST({ request: new Request('https://example.com/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }) }),
    raw: (body) => context.routes.POST({ request: new Request('https://example.com/api/contact', { method: 'POST', body }) }),
    get: () => context.routes.GET(),
  };
}

function element(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  return {
    classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value), contains: (value) => classes.has(value) },
    textContent: '', scrollIntoView() {},
  };
}

function client(type, server, fields = fixture()) {
  const filename = type === 'demo' ? 'solicitar-demo.astro' : 'contacto.astro';
  const script = read(`src/pages/${filename}`).match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'The page must contain its submit script');
  const success = element(true), error = element(true), errorMessage = element();
  const text = element(), loading = element(true), widget = element(), form = element();
  const button = { disabled: false, querySelector: (selector) => selector === '[data-btn-text]' ? text : loading };
  const token = { get value() { return fields.turnstileToken; }, set value(value) { fields.turnstileToken = value; } };
  let listener;
  let resets = 0;
  const payloads = [];
  form.reportValidity = () => fields.valid !== false;
  form.addEventListener = (event, callback) => { assert.equal(event, 'submit'); listener = callback; };
  form.querySelector = (selector) => ({
    '[data-error-message]': errorMessage, [`#${type}-submit-btn`]: button,
    '.cf-turnstile': widget, 'input[name="turnstileToken"]': token,
  })[selector] || null;
  const context = {
    Error,
    document: {
      querySelector: (selector) => selector === `#${type}-form` ? form : null,
      getElementById: (id) => id === `${type}-form-success` ? success : error,
    },
    FormData: class { get(name) { return fields[name] ?? null; } },
    window: { turnstile: { reset(container) {
      assert.equal(container, widget); resets += 1; fields.turnstileToken = `fresh-token-${resets}`;
    } } },
    fetch: async (url, init) => {
      assert.equal(url, '/api/contact');
      const payload = JSON.parse(init.body); payloads.push(payload); return server.post(payload);
    },
  };
  vm.runInNewContext(stripTypeScriptTypes(script), context, { filename, timeout: 2000 });
  assert.equal(typeof listener, 'function');
  return { fields, payloads, success, error, errorMessage, button, form,
    resets: () => resets, submit: () => listener({ preventDefault() {} }),
  };
}

const validDemo = (overrides = {}) => ({ ...fixture(), type: 'demo', ...overrides });

test('demo: blank optional comment sends message, not why, and reaches Resend', async () => {
  const server = api(); const browser = client('demo', server);
  await browser.submit();
  assert.equal(browser.payloads[0].message, 'Solicitud enviada desde la página de demo.');
  assert.equal(Object.hasOwn(browser.payloads[0], 'why'), false);
  assert.deepEqual(server.emails[0].to, ['hola@gauna.es']);
  assert.equal(server.emails[0].reply_to, 'test@example.com');
  assert.equal(browser.success.classList.contains('hidden'), false);
});

test('demo: written comment is preserved and HTML is escaped', async () => {
  const server = api(); const browser = client('demo', server, { ...fixture(), why: '<b>Planificar tráfico</b>' });
  await browser.submit();
  assert.match(server.emails[0].html, /&lt;b&gt;Planificar tráfico&lt;\/b&gt;/);
  assert.match(server.emails[0].subject, /^Nueva solicitud de demo TransGest/);
});

test('contact: sends type, topic and message using the route contract', async () => {
  const server = api(); const browser = client('contact', server);
  await browser.submit();
  assert.equal(browser.payloads[0].type, 'contact');
  assert.equal(browser.payloads[0].topic, 'Otra consulta');
  assert.equal(browser.payloads[0].message, 'Consulta de prueba');
  assert.equal(server.emails.length, 1);
  assert.match(server.emails[0].subject, /^Nuevo contacto web/);
});

test('API: optional demo comment can also be omitted by a client', async () => {
  const server = api(); const response = await server.post(validDemo({ message: undefined, why: undefined }));
  assert.equal(response.status, 200); assert.equal(server.emails.length, 1);
});

test('API: previous demo why field remains compatible', async () => {
  const server = api(); await server.post(validDemo({ message: undefined, why: 'Mensaje de una pestaña anterior' }));
  assert.match(server.emails[0].html, /Mensaje de una pestaña anterior/);
});

test('API: real missing fields return specific errors before redeeming CAPTCHA', async () => {
  const server = api(); const response = await server.post(validDemo({ phone: '' }));
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).missing, ['phone']);
  assert.equal(server.tokens.length, 0); assert.equal(server.emails.length, 0);
});

test('API: contact message is still required', async () => {
  const server = api(); const response = await server.post({ ...fixture(), type: 'contact', message: '' });
  assert.equal(response.status, 400); assert.equal(server.emails.length, 0);
});

test('API: invalid email does not send a message', async () => {
  const server = api(); assert.equal((await server.post(validDemo({ email: 'invalid' }))).status, 400);
  assert.equal(server.emails.length, 0);
});

test('API: blocked email is rejected', async () => {
  const server = api(); assert.equal((await server.post(validDemo({ email: 'test@mailinator.com' }))).status, 400);
});

test('API: malformed JSON, null and arrays return 400 rather than 500', async () => {
  const server = api();
  for (const body of ['{', 'null', '[]']) assert.equal((await server.raw(body)).status, 400);
});

test('demo: invalid CAPTCHA keeps data and resets the widget for retry', async () => {
  const server = api({ invalidToken: true }); const browser = client('demo', server);
  await browser.submit();
  assert.equal(server.emails.length, 0); assert.equal(browser.resets(), 1);
  assert.equal(browser.fields.company, 'Empresa de prueba'); assert.equal(browser.button.disabled, false);
  assert.equal(browser.error.classList.contains('hidden'), false);
  assert.equal(browser.success.classList.contains('hidden'), true);
});

test('demo: missing CAPTCHA prevents the request', async () => {
  const server = api(); const browser = client('demo', server, { ...fixture(), turnstileToken: '' });
  await browser.submit(); assert.equal(browser.payloads.length, 0); assert.equal(browser.resets(), 1);
});

test('provider failure never displays success; retry uses a new CAPTCHA token', async () => {
  const options = { providerStatus: 503 }; const server = api(options); const browser = client('demo', server);
  await browser.submit();
  assert.equal(browser.success.classList.contains('hidden'), true); assert.equal(browser.resets(), 1);
  options.providerStatus = 200;
  await browser.submit();
  assert.deepEqual(server.tokens, ['test-token', 'fresh-token-1']);
  assert.equal(browser.success.classList.contains('hidden'), false);
});

test('provider response without email id never displays success', async () => {
  const server = api({ noEmailId: true }); const browser = client('demo', server);
  await browser.submit(); assert.equal(browser.success.classList.contains('hidden'), true);
});

test('network failure keeps the form available and returns an error', async () => {
  const server = api({ networkError: true }); const browser = client('contact', server);
  await browser.submit(); assert.equal(browser.button.disabled, false);
  assert.equal(browser.error.classList.contains('hidden'), false);
});

test('API: rate limit returns 429 and Retry-After without sending', async () => {
  const server = api({ limited: true }); const response = await server.post(validDemo());
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(server.emails.length, 0);
});

test('API: fast submission gets a visible retry error, not fake success', async () => {
  const server = api({ tooFast: true }); const response = await server.post(validDemo());
  assert.equal(response.status, 400); assert.notEqual((await response.json()).success, true);
});

test('API: missing mail configuration returns 503 without sending', async () => {
  const server = api({ noKey: true }); assert.equal((await server.post(validDemo())).status, 503);
  assert.equal(server.emails.length, 0);
});

test('API: GET remains read-only and returns 405', async () => {
  assert.equal((await api().get()).status, 405);
});

test('double submit is ignored while a request is pending', async () => {
  let release;
  const server = api({ wait: new Promise((resolve) => { release = resolve; }) });
  const browser = client('demo', server);
  const first = browser.submit(); await browser.submit();
  assert.equal(browser.payloads.length, 1); release(); await first;
});

for (const [page, property] of [['index.astro', 'featured'], ['precios.astro', 'highlight']]) {
  test(`${page}: only Pro Intelligence is recommended`, () => {
    const source = read(`src/pages/transgest/${page}`);
    const expression = source.match(/const plans = (\[[\s\S]*?\n\]);/)?.[1];
    assert.ok(expression);
    const plans = vm.runInNewContext(expression);
    assert.equal(JSON.stringify(plans.filter((plan) => plan[property]).map((plan) => plan.name)), '["Pro Intelligence"]');
  });
}
