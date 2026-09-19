import assert from 'node:assert/strict';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';
import { GUIDE_FORM_PATH } from '../src/lib/guide-access.mjs';
// Read-only production checks. Never submits a lead or mints a production token.
const origin = 'https://gauna.es';
let lastError;
for (let attempt = 1; attempt <= 15; attempt++) {
  try {
    for (const path of [DECA_GUIDE.path, DECA_GUIDE.legacyPath]) for (const mode of ['', '?view=1', '?download=1', '?access=invalid&download=1']) {
      const response = await fetch(`${origin}${path}${mode}`, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 303, 'No anonymous PDF: ' + path + mode);
      assert.equal(response.headers.get('location'), GUIDE_FORM_PATH);
      assert.ok(!(response.headers.get('content-type') || '').includes('application/pdf'));
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.equal((await response.arrayBuffer()).byteLength, 0);
    }
    const page = await fetch(`${origin}/deca-2026/`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes('/api/guia-deca'));
    assert.ok(html.includes('data-deca-captcha') && /data-sitekey="[^\"]+"/.test(html));
    assert.ok(!/href=["'][^"']*\/guias\/[^"']*\.pdf/.test(html), 'No direct PDF link in initial HTML');
    assert.ok(!html.includes('sin solicitar el correo'));
    for (const path of ['/api/guia-deca', '/api/informacion-deca']) {
      const result = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000) });
      assert.equal(result.status, 405); assert.equal(result.headers.get('allow'), 'POST');
    }
    console.log('PRODUCTION GATE OK: both PDF URLs and view/download variations redirect to the email form without a signed grant; no public link in HTML; CAPTCHA present; no email sent.');
    process.exit(0);
  } catch (error) {
    lastError = error; console.log(`Gate deployment ${attempt}/15 not ready: ${error.message}`);
    if (attempt < 15) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
