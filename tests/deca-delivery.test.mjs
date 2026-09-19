import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeCAHandler, createLimiter, validateSubmission } from '../src/lib/deca-delivery.mjs';
import { deliveryMessage } from '../src/lib/deca-form-client.mjs';
import { validGuideAccess } from '../src/lib/guide-access.mjs';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

const time = Date.now();
const valid = () => ({ requestId: '61a5b88e-b767-4d64-abaf-635c7b0453b4', startedAt: time - 5000, name: 'Persona de prueba', email: 'prueba@example.com', company: '', phone: '', message: '', profile: 'Conductor', website: '', consent: true, contactRequested: false, turnstileToken: 'mock-token' });
const request = (data = valid(), options = {}) => new Request('https://gauna.es/api/guia-deca', {
  method: options.method || 'POST',
  headers: { origin: options.origin ?? 'https://gauna.es', 'content-type': options.type || 'application/json' },
  ...(options.method === 'GET' ? {} : { body: options.raw ?? JSON.stringify(data) }),
});
function setup(options = {}) {
  const calls = []; const logs = [];
  const kind = options.kind || 'guide';
  const config = { apiKey: 'TEST-ONLY-NOT-A-REAL-KEY', turnstileSecret: 'TEST-ONLY-TURNSTILE', from: 'Gauna <formularios@gauna.es>', to: 'hola@gauna.es', ...options.config };
  const handler = createDeCAHandler({ kind, config, now: () => time, rateLimit: options.rateLimit || (() => true), blockedEmail: options.blockedEmail, log: (...args) => logs.push(args), fetcher: async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url, init, body });
    if (url.includes('siteverify')) {
      if (options.captchaThrows) throw new Error('private error text');
      return new Response(JSON.stringify({ success: true, hostname: 'gauna.es', action: `deca_${kind}`, ...options.captcha }), { status: options.captchaStatus || 200 });
    }
    const role = body.to[0] === 'hola@gauna.es' ? 'internal' : 'visitor';
    if (options[`${role}Throws`]) throw new Error('private error text');
    const status = options[`${role}Status`] || 200;
    return new Response(options[`${role}Raw`] ?? JSON.stringify(options[`${role}Result`] ?? { id: `mock-${role}` }), { status });
  } });
  return { handler, calls, logs };
}

test('guide accepts a driver with no company, phone or optional comment', async () => {
  const { handler, calls } = setup();
  const response = await handler(request()); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.success, true);
  assert.equal(body.visitorEmail, 'accepted'); assert.equal(body.internalNotification, 'accepted');
  assert.equal(new URL(body.downloadUrl, 'https://gauna.es').pathname, DECA_GUIDE.path);
  assert.ok(validGuideAccess(new URL(body.downloadUrl, 'https://gauna.es').searchParams.get('access'), 'TEST-ONLY-NOT-A-REAL-KEY', time)); assert.equal(calls.length, 3);
  assert.deepEqual(calls[1].body.to, ['prueba@example.com']);
  assert.deepEqual(calls[2].body.to, ['hola@gauna.es']);
  assert.match(calls[2].body.text, /No. Solo entrega de la guía/);
  assert.match(calls[1].body.text, /no te suscribe/);
  assert.equal(calls[2].body.reply_to, 'prueba@example.com');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

for (const [name, patch] of [
  ['empty name', { name: '' }], ['invalid email', { email: 'bad-email' }],
  ['consent absent', { consent: false }], ['string consent', { consent: 'true' }],
  ['wrong profile', { profile: 'malicious-value' }], ['wrong field type', { company: [] }],
  ['too long', { name: 'x'.repeat(151) }], ['honeypot', { website: 'spam' }],
  ['missing token', { turnstileToken: '' }], ['bad id', { requestId: 'bad' }],
  ['too fast', { startedAt: time - 100 }], ['future timestamp', { startedAt: time + 1 }],
]) test(`validation blocks ${name} without sending mail`, async () => {
  const { handler, calls } = setup(); const response = await handler(request({ ...valid(), ...patch }));
  assert.equal(response.status, 400); assert.equal(calls.length, 0);
});

for (const raw of ['{', 'null', '[]', '42']) test(`malformed/non-object JSON ${raw}`, async () => {
  const { handler, calls } = setup(); assert.equal((await handler(request(null, { raw }))).status, 400); assert.equal(calls.length, 0);
});

test('rejects cross-site origin, non-JSON, GET and overlarge streamed bodies', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(request(valid(), { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(request(valid(), { type: 'text/plain' }))).status, 415);
  assert.equal((await handler(request(null, { method: 'GET' }))).status, 405);
  assert.equal((await handler(request(null, { raw: JSON.stringify({ name: 'x'.repeat(20000) }) }))).status, 413);
  assert.equal(calls.length, 0);
});

test('missing production secrets fails closed', async () => {
  for (const config of [{ apiKey: '' }, { turnstileSecret: '' }]) {
    const { handler, calls } = setup({ config }); assert.equal((await handler(request())).status, 503); assert.equal(calls.length, 0);
  }
});

test('rate limit and temporary email protection run before external calls', async () => {
  for (const [opts, code] of [[{ rateLimit: () => false }, 429], [{ blockedEmail: () => true }, 400]]) {
    const { handler, calls } = setup(opts); assert.equal((await handler(request())).status, code); assert.equal(calls.length, 0);
  }
  const limit = createLimiter();
  for (let i = 0; i < 5; i++) assert.equal(limit('one', time), true);
  assert.equal(limit('one', time), false); assert.equal(limit('one', time + 600001), true);
});

for (const captcha of [{ success: false }, { hostname: 'other.example' }, { action: 'different' }]) test(`rejects invalid CAPTCHA ${JSON.stringify(captcha)}`, async () => {
  const { handler, calls } = setup({ captcha }); assert.equal((await handler(request())).status, 403); assert.equal(calls.length, 1);
});

test('CAPTCHA timeout is not a mail success', async () => {
  const { handler, calls } = setup({ captchaThrows: true }); assert.equal((await handler(request())).status, 503); assert.equal(calls.length, 1);
});

for (const [opts, visitor, internal, status] of [
  [{ visitorStatus: 403 }, 'failed', 'accepted', 207],
  [{ internalStatus: 403 }, 'accepted', 'failed', 207],
  [{ visitorStatus: 500, internalStatus: 500 }, 'failed', 'failed', 502],
  [{ visitorResult: {}, internalResult: {} }, 'failed', 'failed', 502],
  [{ visitorThrows: true }, 'failed', 'accepted', 207],
  [{ internalThrows: true }, 'accepted', 'failed', 207],
  [{ visitorRaw: 'not json' }, 'failed', 'accepted', 207],
]) test(`mail outcomes are explicit ${JSON.stringify(opts)}`, async () => {
  const { handler, logs } = setup(opts); const response = await handler(request()); const body = await response.json();
  assert.equal(response.status, status); assert.equal(body.visitorEmail, visitor); assert.equal(body.internalNotification, internal);
  assert.equal(body.success, false);
  if (status === 502) assert.equal(body.downloadUrl, undefined);
  else assert.ok(validGuideAccess(new URL(body.downloadUrl, 'https://gauna.es').searchParams.get('access'), 'TEST-ONLY-NOT-A-REAL-KEY', time));
  assert.doesNotMatch(JSON.stringify(logs), /prueba@example|Persona de prueba|private error text|TEST-ONLY/);
  assert.doesNotMatch(deliveryMessage('guide', body), /ha llegado|entregado en tu buzón/);
});

test('idempotency keys and payloads remain stable on retry but change on edits', async () => {
  const { handler, calls } = setup();
  await handler(request()); await handler(request({ ...valid(), turnstileToken: 'renewed-token' }));
  assert.equal(calls[1].init.headers['Idempotency-Key'], calls[4].init.headers['Idempotency-Key']);
  assert.equal(calls[2].init.headers['Idempotency-Key'], calls[5].init.headers['Idempotency-Key']);
  assert.deepEqual(calls[1].body, calls[4].body);
  assert.doesNotMatch(calls[1].init.headers['Idempotency-Key'], /example|prueba|Persona/);
  await handler(request({ ...valid(), email: 'otro@example.com' }));
  assert.notEqual(calls[1].init.headers['Idempotency-Key'], calls[7].init.headers['Idempotency-Key']);
});

test('separate optional contact request and escaped user input', async () => {
  const { handler, calls } = setup(); await handler(request({ ...valid(), name: '<b>Prueba</b>', contactRequested: true }));
  assert.match(calls[2].body.text, /Sí, expresamente/); assert.match(calls[1].body.html, /&lt;b&gt;/); assert.doesNotMatch(calls[1].body.html, /<b>Prueba/);
});

test('commercial DeCA request sends only an internal notification, not an unsolicited guide', async () => {
  const { handler, calls } = setup({ kind: 'information' });
  assert.equal((await handler(request())).status, 400);
  const response = await handler(request({ ...valid(), company: 'Empresa de prueba', phone: '000000000' }));
  const body = await response.json(); assert.equal(body.success, true); assert.equal(body.visitorEmail, 'not_requested');
  assert.equal(body.downloadUrl, undefined); assert.equal(calls.length, 2); assert.match(calls[1].body.subject, /información/);
});

test('rendered integration removes simulated newsletter and legacy DeCA endpoint', () => {
  const root = new URL('../', import.meta.url);
  const source = file => readFileSync(new URL(file, root), 'utf8');
  assert.doesNotMatch(source('src/components/DeCALeadForm.astro'), /beta-signup|Airtable/);
  assert.doesNotMatch(source('src/components/LeadMagnetForm.astro'), /<form|console\.log|40 páginas|te hemos enviado/i);
  assert.match(source('src/components/LeadMagnetForm.astro'), /\/deca-2026\/#formulario-deca/);
  assert.match(source('src/components/DeCARequestForm.astro'), /data-action=\{`deca_\$\{kind\}`\}/);
  assert.match(source('src/components/DeCARequestForm.astro'), /name="consent" type="checkbox" required/);
  assert.doesNotMatch(source('src/components/DeCARequestForm.astro'), /checked[=\s>]/);
  assert.doesNotMatch(source('src/lib/deca-form-client.mjs'), /form\.reset\(/);
});
