import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

// Read-only public production verification. No form submission, secret or customer data.
const origin = 'https://gauna.es';
let lastError;
for (let attempt = 1; attempt <= 15; attempt++) {
  try {
    const pdf = await fetch(`${origin}${DECA_GUIDE.path}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    assert.equal(pdf.status, 200, 'PDF must return HTTP 200');
    assert.match(pdf.headers.get('content-type') || '', /application\/pdf/i);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.length, DECA_GUIDE.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), DECA_GUIDE.sha256);
    const page = await fetch(`${origin}/deca-2026/`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(DECA_GUIDE.path), 'The guide page must link to the published PDF');
    assert.ok(html.includes('/api/guia-deca'), 'The page must use the new delivery endpoint');
    assert.ok(html.includes('data-deca-captcha') && /data-sitekey="[^\"]+"/.test(html), 'Production must render a configured CAPTCHA');
    for (const path of ['/api/guia-deca', '/api/informacion-deca']) {
      const result = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000) });
      assert.equal(result.status, 405, `${path}: read-only GET must not send emails`);
      assert.equal(result.headers.get('allow'), 'POST');
    }
    console.log(`PUBLIC PRODUCTION OK: ${DECA_GUIDE.path}, HTTP 200, application/pdf, ${bytes.length} bytes, SHA-256 ${DECA_GUIDE.sha256}.`);
    console.log('Guide form and CAPTCHA rendered; both API endpoints reject GET with 405/Allow POST. No email sent or inbox receipt claimed.');
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Deployment check ${attempt}/15 not ready: ${error.message}`);
    if (attempt < 15) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
