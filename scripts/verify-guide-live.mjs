import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

// Read-only public production verification. No form submission, secret or customer data.
const origin = 'https://gauna.es';
let lastError;
for (let attempt = 1; attempt <= 15; attempt++) {
  try {
    for (const mode of ['', '?view=1', '?download=1']) {
      const pdf = await fetch(`${origin}${DECA_GUIDE.path}${mode}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      assert.equal(pdf.status, 200, `${mode || 'original'}: PDF must return HTTP 200`);
      assert.match(pdf.headers.get('content-type') || '', /application\/pdf/i);
      const disposition = pdf.headers.get('content-disposition') || '';
      if (mode === '?download=1') {
        assert.match(disposition, /^attachment\b/i, 'The download link must force attachment');
        assert.ok(disposition.includes(DECA_GUIDE.filename), 'The saved PDF name must match');
      } else {
        assert.doesNotMatch(disposition, /^attachment\b/i, 'Viewing must remain separate from downloading');
      }
      assert.equal(pdf.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(pdf.headers.get('content-security-policy'), 'Do not remove the global security policy');
      const bytes = Buffer.from(await pdf.arrayBuffer());
      assert.equal(bytes.length, DECA_GUIDE.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), DECA_GUIDE.sha256);
      console.log(`PDF ${mode || 'original'} OK: 200/application/pdf, ${bytes.length} bytes, approved hash, Content-Disposition=${disposition}`);
    }
    const page = await fetch(`${origin}/deca-2026/`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`${DECA_GUIDE.path}?download=1`), 'The guide page must link to forced download');
    assert.ok(html.includes(`${DECA_GUIDE.path}?view=1`), 'The guide page must offer separate viewing');
    assert.ok(html.includes('/api/guia-deca'), 'The page must use the delivery endpoint');
    assert.ok(html.includes('data-deca-captcha') && /data-sitekey="[^\"]+"/.test(html), 'Production must render a configured CAPTCHA');
    for (const path of ['/api/guia-deca', '/api/informacion-deca']) {
      const result = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000) });
      assert.equal(result.status, 405, `${path}: read-only GET must not send emails`);
      assert.equal(result.headers.get('allow'), 'POST');
    }
    console.log(`PUBLIC PRODUCTION OK: separate view/download options, unchanged PDF SHA-256 ${DECA_GUIDE.sha256}.`);
    console.log('Guide form and CAPTCHA rendered; both API endpoints reject GET with 405/Allow POST. No email sent or inbox receipt claimed.');
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Deployment check ${attempt}/15 not ready: ${error.message}`);
    if (attempt < 15) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
