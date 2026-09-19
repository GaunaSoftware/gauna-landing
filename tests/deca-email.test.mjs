import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDeCAMails } from '../src/lib/deca-email.mjs';
import { guideAccess, GUIDE_DOWNLOAD_URL, GUIDE_OPEN_URL } from './guide-access-fixture.mjs';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

const data = { name: 'María de ejemplo', email: 'persona@example.com', company: 'Empresa ficticia', profile: 'Conductor', requestId: '61a5b88e-b767-4d64-abaf-635c7b0453b4', contactRequested: false };
const config = { from: 'Gauna <formularios@gauna.es>', to: 'hola@gauna.es', guideAccess };

test('branded transactional HTML keeps readable text, button and plaintext', () => {
  const { visitor, internal } = buildDeCAMails(data, 'guide', config);
  for (const mail of [visitor, internal]) {
    assert.match(mail.html, /^<!doctype html>/i);
    assert.match(mail.html, /<html lang="es"/);
    assert.match(mail.html, /name="viewport"/);
    assert.match(mail.html, /table role="presentation"/);
    assert.match(mail.html, /font-family:Arial,Helvetica,sans-serif/);
    assert.match(mail.html, /alt="TransGest"/);
    assert.match(mail.html, /src="cid:transgest-brand"/);
    assert.ok(mail.text.length > 100);
    assert.doesNotMatch(mail.html, /<script|<iframe|<form|<link|display:\s*(grid|flex)|@font-face/i);
    assert.ok(Buffer.byteLength(mail.html) < 40000);
    assert.doesNotMatch(mail.html, /\d[\d.,]*\s*€/);
  }
  assert.ok(visitor.html.includes(GUIDE_DOWNLOAD_URL));
  assert.ok(visitor.html.includes(GUIDE_OPEN_URL));
  assert.ok(visitor.text.includes(GUIDE_DOWNLOAD_URL));
  assert.match(visitor.html, /También la tienes adjunta/);
  assert.deepEqual(visitor.to, [data.email]);
  assert.equal(visitor.reply_to, config.to);
  assert.deepEqual(internal.to, [config.to]);
  assert.equal(internal.reply_to, data.email);
});

test('CID logo and PDF attachment use only fixed published assets', () => {
  const { visitor, internal } = buildDeCAMails(data, 'guide', config);
  assert.equal(visitor.attachments.length, 2);
  assert.deepEqual(visitor.attachments[0], { path: 'https://gauna.es/logo-transgest.png', filename: 'transgest.png', content_type: 'image/png', content_id: 'transgest-brand' });
  assert.deepEqual(visitor.attachments[1], { path: `https://gauna.es${guideAccess.path}`, filename: DECA_GUIDE.filename, content_type: 'application/pdf' });
  assert.equal(internal.attachments.length, 1);
  assert.equal(internal.attachments[0].content_id, 'transgest-brand');
  const crafted = buildDeCAMails({ ...data, downloadUrl: 'https://evil.example/', logo: 'https://evil.example/logo', attachments: [] }, 'guide', config);
  assert.deepEqual(crafted.visitor.attachments, visitor.attachments);
  assert.doesNotMatch(crafted.visitor.html, /evil\.example/);
});

test('privacy preferences and escaping survive the new layout', () => {
  const first = buildDeCAMails(data, 'guide', config);
  assert.match(first.visitor.text, /no te suscribe/);
  assert.match(first.internal.text, /No. Solo entrega de la guía/);
  assert.match(first.internal.html, /No iniciar seguimiento comercial/);
  assert.doesNotMatch(first.visitor.html, /Tu solicitud de contacto/);
  const second = buildDeCAMails({ ...data, contactRequested: true, name: '<img src=x onerror=alert(1)>', company: '<b>Empresa</b>' }, 'guide', config);
  assert.match(second.visitor.html, /Tu solicitud de contacto/);
  assert.match(second.visitor.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(second.visitor.html, /<img src=x/);
  assert.match(second.internal.html, /&lt;b&gt;Empresa&lt;\/b&gt;/);
  assert.match(second.internal.text, /Sí, expresamente/);
});

test('presentation builder is deterministic for idempotent retries', () => {
  assert.deepEqual(buildDeCAMails(data, 'guide', config), buildDeCAMails({ ...data }, 'guide', config));
});

test('download override is scoped and retains original security headers', () => {
  const deployment = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const global = deployment.headers.find(rule => rule.source === '/(.*)');
  const csp = global.headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.equal(csp, "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://api.airtable.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests");
  assert.ok(global.headers.some(header => header.key === 'X-Content-Type-Options' && header.value === 'nosniff'));
  const rule = deployment.headers.find(item => item.source === '/guias/(.*)');
  assert.ok(rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store')));
  assert.ok(!deployment.headers.some(item => item.source.startsWith('/guias/') && item.headers.some(header => ['Content-Type', 'Content-Disposition'].includes(header.key))));
  assert.equal(GUIDE_DOWNLOAD_URL, `https://gauna.es${guideAccess.downloadUrl}`);
  assert.equal(GUIDE_OPEN_URL, `https://gauna.es${guideAccess.openUrl}`);
});
