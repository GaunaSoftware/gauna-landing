import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildDeCAMails } from '../src/lib/deca-email.mjs';
import { guideAccess, GUIDE_DOWNLOAD_URL, GUIDE_OPEN_URL } from './guide-access-fixture.mjs';

// Visual HTML preview only: no account, email, external request or personal data.
const output = 'test-output/deca/email';
await mkdir(output, { recursive: true });
const png = await readFile('public/logo-transgest.png');
const fixture = { name: 'María', email: 'persona@example.com', company: 'Empresa de ejemplo', profile: 'Empresa de transporte', message: 'Quiero revisar cómo encaja en nuestra operativa.', requestId: '61a5b88e-b767-4d64-abaf-635c7b0453b4', contactRequested: false };
const config = { from: 'TransGest <formularios@gauna.es>', to: 'hola@gauna.es', guideAccess };
const initial = buildDeCAMails(fixture, 'guide', config);
const imagesInPreview = html => html.replaceAll('cid:transgest-brand', `data:image/png;base64,${png.toString('base64')}`);
for (const [name, mail] of Object.entries(initial)) {
  await writeFile(`${output}/${name}.html`, imagesInPreview(mail.html));
  await writeFile(`${output}/${name}.txt`, mail.text);
}
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 680]) {
    for (const [name, mail] of Object.entries(initial)) {
      const page = await browser.newPage({ viewport: { width, height: 920 } });
      await page.route('**/*', route => route.abort());
      await page.setContent(imagesInPreview(mail.html), { waitUntil: 'load' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: horizontal overflow at ${width}`);
      assert.equal(await page.locator('img[alt="TransGest"]').evaluate(img => img.complete && img.naturalWidth > 0), true, 'Logo renders without external network');
      assert.equal(await page.locator('script,iframe,form').count(), 0);
      if (name === 'visitor') {
        assert.ok(await page.getByRole('heading', { name: 'También la tienes adjunta' }).isVisible());
        assert.equal(await page.getByRole('link', { name: 'Descargar la guía en PDF', exact: true }).getAttribute('href'), GUIDE_DOWNLOAD_URL);
        assert.equal(await page.getByRole('link', { name: 'Abrir el PDF en el navegador', exact: true }).getAttribute('href'), GUIDE_OPEN_URL);
      }
      await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
      await page.close();
    }
  }
  const page = await browser.newPage({ viewport: { width: 320, height: 920 } });
  await page.route('**/*', route => route.abort());
  const long = buildDeCAMails({ ...fixture, name: 'N'.repeat(150), company: 'C'.repeat(200), message: 'D'.repeat(3000) }, 'information', config);
  await page.setContent(imagesInPreview(long.internal.html), { waitUntil: 'load' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Long fields stay inside internal email');
  const noImage = initial.visitor.html.replace(/<img\b[^>]*>/g, '');
  await page.setContent(noImage, { waitUntil: 'load' });
  assert.equal(await page.getByRole('link', { name: 'Descargar la guía en PDF', exact: true }).isVisible(), true);
  assert.ok((await page.locator('body').innerText()).includes('Tu Guía DeCA 2026'));
  await page.screenshot({ path: `${output}/visitor-without-images-320.png`, fullPage: true });
  await page.close();
  console.log('Email HTML preview OK: 320/390/680px, real logo, fallback without images, long inputs, download/open URLs. No email sent.');
} finally { await browser.close(); }
