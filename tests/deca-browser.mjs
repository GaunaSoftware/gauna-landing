import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

// Runs ONLY against the local CI server. No real CAPTCHA or email is submitted.
const base = 'http://127.0.0.1:4321';
await mkdir('test-output/deca', { recursive: true });
const browser = await chromium.launch();
const captchaFixture = `(() => {
  let sequence = 0;
  const fill = (container) => {
    if (!container) return;
    const form = container.closest('form');
    let input = form.querySelector('input[name="turnstileToken"]');
    if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = 'turnstileToken'; form.appendChild(input); }
    input.value = 'browser-fixture-' + (++sequence);
    container.textContent = 'Verificación simulada: prueba de interfaz';
  };
  window.turnstile = { reset: fill };
  const ready = () => document.querySelectorAll('[data-deca-captcha]').forEach(fill);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();`;

try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [], submissions = [];
    let outcome = 'success';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.hostname === 'challenges.cloudflare.com') {
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: captchaFixture });
      }
      if (url.origin !== base) return route.abort();
      if (req.method() === 'POST') {
        assert.ok(['/api/guia-deca', '/api/informacion-deca'].includes(url.pathname));
        const payload = req.postDataJSON();
        submissions.push({ path: url.pathname, payload });
        if (outcome === 'reject') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Renueva la verificación anti-spam y vuelve a intentarlo.' }) });
        const guide = url.pathname === '/api/guia-deca';
        const partial = outcome === 'partial';
        return route.fulfill({ status: partial ? 207 : 200, contentType: 'application/json', body: JSON.stringify({ validated: true, success: !partial, visitorEmail: guide ? 'accepted' : 'not_requested', internalNotification: partial ? 'failed' : 'accepted', ...(guide ? { downloadUrl: DECA_GUIDE.path } : {}) }) });
      }
      return route.continue();
    });
    await page.goto(`${base}/deca-2026/`, { waitUntil: 'networkidle' });
    const form = page.locator('form[data-deca-request-form]');
    const wrapper = page.locator('[data-deca-request-wrapper]');
    const status = wrapper.locator('[data-deca-request-status]');
    await page.waitForFunction(() => document.querySelector('form[data-deca-request-form]')?.dataset.initialized === 'true');
    assert.equal(await form.getAttribute('action'), '/api/guia-deca');
    assert.equal(await form.locator('[name="contactRequested"]').isChecked(), false);
    assert.equal(await form.locator('[name="company"]').getAttribute('required'), null);
    await form.locator('[name="name"]').fill('Prueba de interfaz');
    await form.locator('[name="email"]').fill('interfaz@example.com');
    await form.locator('[name="profile"]').selectOption('Conductor');
    await form.locator('button[type="submit"]').click();
    assert.equal(submissions.length, 0, 'Consent must be required');
    await form.locator('[name="consent"]').check();
    await wrapper.screenshot({ path: `test-output/deca/form-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Unexpected horizontal overflow');
    const downloadEvent = page.waitForEvent('download');
    await wrapper.locator('a[download]').click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), DECA_GUIDE.filename);
    const downloaded = `test-output/deca/${width}-${DECA_GUIDE.filename}`;
    await download.saveAs(downloaded);
    assert.equal(createHash('sha256').update(await readFile(downloaded)).digest('hex'), DECA_GUIDE.sha256);
    outcome = 'reject';
    await form.locator('button[type="submit"]').click();
    await status.waitFor({ state: 'visible' });
    assert.match(await status.textContent(), /Renueva la verificación/);
    assert.equal(await form.isVisible(), true);
    assert.equal(await form.locator('[name="email"]').inputValue(), 'interfaz@example.com');
    outcome = 'partial';
    await form.locator('button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-deca-request-status]')?.textContent.includes('aviso al equipo ha fallado'));
    assert.equal(await form.isVisible(), true);
    assert.equal(submissions.at(-1).payload.contactRequested, false);
    const previous = submissions.at(-1).payload;
    outcome = 'success';
    await form.locator('button[type="submit"]').click();
    await form.waitFor({ state: 'hidden' });
    assert.equal(submissions.at(-1).payload.requestId, previous.requestId, 'Retry keeps its idempotency reference');
    assert.notEqual(submissions.at(-1).payload.turnstileToken, previous.turnstileToken, 'Retry gets a renewed token');
    assert.match(await status.textContent(), /aceptado el envío/);
    await wrapper.screenshot({ path: `test-output/deca/success-${width}.png` });
    await page.goto(`${base}/software-deca/`, { waitUntil: 'networkidle' });
    const information = page.locator('form[data-deca-request-form]');
    await page.waitForFunction(() => document.querySelector('form[data-deca-request-form]')?.dataset.initialized === 'true');
    assert.equal(await information.getAttribute('action'), '/api/informacion-deca');
    assert.equal(await information.locator('[name="contactRequested"]').count(), 0);
    await information.locator('[name="name"]').fill('Prueba comercial');
    await information.locator('[name="email"]').fill('comercial@example.com');
    await information.locator('[name="company"]').fill('Empresa de ejemplo');
    await information.locator('[name="phone"]').fill('000000000');
    await information.locator('[name="consent"]').check();
    await information.locator('button[type="submit"]').click();
    await information.waitFor({ state: 'hidden' });
    assert.equal(submissions.at(-1).path, '/api/informacion-deca');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log(`Browser ${width}px OK: PDF checksum, consent, optional fields, API errors, partial results, retries and information form; external services mocked.`);
    await context.close();
  }
} finally { await browser.close(); }
