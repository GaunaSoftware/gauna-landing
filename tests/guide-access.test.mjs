import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access as fileAccess } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { issueGuideAccess, validGuideAccess, GUIDE_ACCESS_TTL, GUIDE_FORM_PATH } from '../src/lib/guide-access.mjs';
import { serveGuide, guideBytes } from '../src/lib/guide-file.mjs';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';
import { prepareGuide } from '../scripts/prepare-guide.mjs';

const now = Date.now(), key = 'TEST-ONLY-NOT-A-REAL-KEY';
const data = { requestId: '61a5b88e-b767-4d64-abaf-635c7b0453b4', startedAt: now - 5000, email: 'private@example.com', name: 'Private Person' };
const grant = issueGuideAccess(data, key, now);
const req = (path = grant.path, init = {}) => new Request(`https://gauna.es${path}`, init);

test('access is signed, temporary, stable for retries, and contains no personal details', () => {
  assert.deepEqual(issueGuideAccess({ ...data, turnstileToken: 'renewed' }, key, now + 10000), grant);
  assert.ok(validGuideAccess(grant.token, key, now));
  assert.equal(validGuideAccess(grant.token, key + '-other', now), false);
  assert.equal(validGuideAccess(grant.token, key, now + GUIDE_ACCESS_TTL * 1000), false);
  assert.equal(validGuideAccess(grant.token, key, data.startedAt - 1000), false);
  assert.equal(validGuideAccess(grant.token, '', now), false);
  assert.doesNotMatch(JSON.stringify(grant), /Private|private|example|TEST-ONLY/);
  const segments = grant.token.split('.'); segments[1] = String(Number(segments[1]) + 1);
  assert.equal(validGuideAccess(segments.join('.'), key, now), false);
  for (const token of [null, '', '1', 'x'.repeat(2000), grant.token + '.extra']) assert.equal(validGuideAccess(token, key, now), false);
  assert.throws(() => issueGuideAccess({ ...data, startedAt: now - 86400001 }, key, now), /invalid/);
  assert.throws(() => issueGuideAccess({ ...data, requestId: 'bad' }, key, now), /invalid/);
});

test('anonymous and forged access to current and old PDF URLs never reads the file', async () => {
  let reads = 0;
  for (const path of [DECA_GUIDE.path, DECA_GUIDE.legacyPath]) {
    for (const query of ['', '?download=1', '?view=1', '?access=invalid&download=1', `?access=${grant.token}&access=duplicate`]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await serveGuide(req(path + query, { method, headers: { range: 'bytes=0-100' } }), key, async () => { reads++; return Buffer.alloc(100); }, now);
        assert.equal(response.status, 303);
        assert.equal(response.headers.get('location'), GUIDE_FORM_PATH);
        assert.match(response.headers.get('cache-control'), /no-store/);
        assert.match(response.headers.get('x-robots-tag'), /noindex/);
        assert.notEqual(response.headers.get('content-type'), 'application/pdf');
        assert.equal((await response.arrayBuffer()).byteLength, 0);
      }
    }
  }
  assert.equal(reads, 0);
});

test('authorized view and download return only the same corrected 28-page PDF', async () => {
  for (const path of [grant.path, grant.downloadUrl, grant.openUrl]) {
    const response = await serveGuide(req(path), key, guideBytes, now);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.ok(response.headers.get('content-disposition').startsWith(path.includes('download=1') ? 'attachment' : 'inline'));
    assert.equal(Number(response.headers.get('content-length')), DECA_GUIDE.bytes);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), DECA_GUIDE.sha256);
    assert.match(bytes.toString('latin1'), /\/Lang \(es-ES\)/);
  }
});

test('authorized HEAD and Apple byte-range requests preserve exact bytes', async () => {
  const original = await guideBytes();
  const head = await serveGuide(req(grant.path, { method: 'HEAD' }), key, guideBytes, now);
  assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal(head.headers.get('content-length'), String(DECA_GUIDE.bytes));
  for (const [range, start, end] of [['bytes=0-999', 0, 999], ['bytes=100-', 100, original.length - 1], ['bytes=-100', original.length - 100, original.length - 1]]) {
    const response = await serveGuide(req(grant.path, { headers: { range } }), key, guideBytes, now);
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${original.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), original.subarray(start, end + 1));
  }
  for (const range of ['bytes=-0', 'bytes=10-5', 'bytes=9999999-', 'bytes=0-1,4-5', 'bytes=-', 'garbage']) {
    assert.equal((await serveGuide(req(grant.path, { headers: { range } }), key, guideBytes, now)).status, 416);
  }
});

test('arbitrary files, methods, missing key and file-load failure fail closed', async () => {
  assert.equal((await serveGuide(req('/guias/secret.pdf?access=' + grant.token), key, guideBytes, now)).status, 404);
  assert.equal((await serveGuide(req(grant.path, { method: 'POST' }), key, guideBytes, now)).status, 405);
  assert.equal((await serveGuide(req(grant.path), '', guideBytes, now)).status, 303);
  const failure = await serveGuide(req(grant.path), key, async () => { throw new Error('private path'); }, now);
  assert.equal(failure.status, 503); assert.doesNotMatch(await failure.text(), /private path/);
});

test('build preparation never leaves either PDF in public; source remains untouched', async () => {
  await prepareGuide();
  for (const path of [DECA_GUIDE.path, DECA_GUIDE.legacyPath]) await assert.rejects(fileAccess(`public${path}`));
  const source = await readFile('assets/guides/deca-2026-v2.1-original.pdf');
  assert.equal(createHash('sha256').update(source).digest('hex'), '74b1e666580a019ab0ce76718226ea84f06b496f99fc738dc4297071368baf62');
});

test('initial form has no PDF download href and commercial consent stays optional', async () => {
  const form = await readFile('src/components/DeCARequestForm.astro', 'utf8');
  assert.doesNotMatch(form, /<a[^>]+(?:download=|DECA_GUIDE\.path)/);
  assert.doesNotMatch(form, /sin solicitar el correo|descarga directa/);
  assert.match(form, /name="email" type="email"[^>]*required/);
  assert.match(form, /name="contactRequested" type="checkbox" class=/);
  assert.match(await readFile('src/pages/guias/[filename].ts', 'utf8'), /prerender = false/);
});
