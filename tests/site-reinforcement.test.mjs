import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { DECA_RESOURCES, RESOURCE_HUB_PATHS, PRODUCT_EVALUATION_PATHS, CLIENT_PORTAL_URL, planAnchor } from '../src/config/public-site.mjs';
import { SOCIAL_CARDS, socialImage } from '../src/config/social-cards.mjs';
import { classifyIntent, pageGroup, installIntentTracking } from '../src/lib/navigation-intent.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const exists = (file) => existsSync(fileURLToPath(new URL(file, root)));
const blobSha = (file) => {
  const bytes = readFileSync(new URL(file, root));
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};

// The guide release intentionally replaces DeCALeadForm and LeadMagnetForm.
// Their behavior is covered by deca-delivery.test.mjs; all other boundaries remain.
const unchangedFiles = {
  'src/pages/api/contact.ts': 'c8f8ac6ff6b3bc6637b868405bc28c3bd18e91dd',
  'src/pages/solicitar-demo.astro': 'dfd983150bd682d7f1714a6346c21cd2fb355619',
  'src/pages/contacto.astro': '93ec304f4677d4aeaeff76f346c108b1dd574e77',
  'src/content/blog/que-es-deca-transporte.md': '8c082bb33c93ea47b6dc15097236e54465866d87',
  'src/content/blog/que-es-un-tms-transporte.md': 'fc24145f20c382356c18982374c66b2a7569226f',
  'public/robots.txt': '24d9060d39b0a79c18a063ebd69240bda8f0ade9',
};
for (const [file, sha] of Object.entries(unchangedFiles)) {
  test(`deferred or protected content remains unchanged: ${file}`, () => assert.equal(blobSha(file), sha));
}

test('resource hub points to six existing articles including both discovery targets', () => {
  assert.equal(DECA_RESOURCES.length, 6);
  assert.equal(new Set(DECA_RESOURCES.map((item) => item.href)).size, 6);
  for (const item of DECA_RESOURCES) {
    assert.ok(exists(`src/content${item.href.replace(/\/$/, '')}.md`), item.href);
    assert.ok(item.title && item.description);
  }
  assert.ok(DECA_RESOURCES.some((item) => item.href === '/blog/deca-ecmr-diferencias/'));
  assert.ok(DECA_RESOURCES.some((item) => item.href === '/blog/resolucion-deca-5-junio-2026/'));
  assert.deepEqual(RESOURCE_HUB_PATHS, ['/deca-2026/', '/software-deca/']);
  assert.deepEqual(PRODUCT_EVALUATION_PATHS, ['/transgest/', '/software-deca/']);
  const layout = read('src/layouts/BaseLayout.astro');
  assert.match(layout, /RESOURCE_HUB_PATHS\.includes\(pagePath\)/);
  assert.match(read('src/components/DeCAResources.astro'), /<a href=\{resource\.href\}/);
});

test('comparison reuses the existing plan fields and recommends only Pro Intelligence', () => {
  const page = read('src/pages/transgest/precios.astro');
  const expression = page.match(/const plans = (\[[\s\S]*?\n\]);/)?.[1];
  const plans = vm.runInNewContext(expression);
  assert.equal(JSON.stringify(plans.filter((plan) => plan.highlight).map((plan) => plan.name)), '["Pro Intelligence"]');
  assert.equal(new Set(plans.map((plan) => planAnchor(plan.name))).size, 5);
  assert.match(page, /<PlanComparison plans=\{plans\}/);
  assert.match(page, /id=\{planAnchor\(plan\.name\)\}/);
  assert.doesNotMatch(page, /\d[\d.,]*\s*€|priceCurrency|"price"\s*:/);
  const component = read('src/components/PlanComparison.astro');
  assert.match(component, /plan\.features\.join/);
  assert.match(component, /plan\.outcome/);
  assert.match(component, /overflow-x-auto/);
  assert.match(component, /scope="row"/);
  assert.match(component, /tabindex="0"/);
});

test('header and footer use one direct portal URL', () => {
  assert.equal(CLIENT_PORTAL_URL, 'https://transgest.app/');
  for (const file of ['Header.astro', 'Footer.astro']) {
    const source = read(`src/components/${file}`);
    assert.match(source, /CLIENT_PORTAL_URL/);
    assert.doesNotMatch(source, /https:\/\/app\.gauna\.es/);
  }
});

test('social previews are topic-specific and use fixed static PNG routes', () => {
  for (const key of Object.keys(SOCIAL_CARDS)) assert.ok(SOCIAL_CARDS[key].alt);
  assert.equal(socialImage('/'), '/og/gauna.png');
  assert.equal(socialImage('/deca-2026/'), '/og/deca.png');
  assert.equal(socialImage('/software-deca/'), '/og/deca.png');
  assert.equal(socialImage('/transgest/precios/'), '/og/planes.png');
  assert.equal(socialImage('/blog/que-es-un-tms-transporte/'), '/og/tms.png');
  assert.equal(socialImage('/transgest/'), '/og/transgest.png');
  assert.match(read('src/pages/og/[slug].png.ts'), /export const prerender = true/);
  assert.match(read('astro.config.mjs'), /pathname\.startsWith\('\/og\/'\)/);
  const layout = read('src/layouts/BaseLayout.astro');
  assert.match(layout, /og:image:width" content="1200"/);
  assert.match(layout, /og:image:height" content="630"/);
  assert.match(layout, /<link rel="canonical" href=\{canonicalURL\}/);
});

test('intent labels never contain the URL, query, phone, email or user-entered text', () => {
  const origin = 'https://gauna.es';
  assert.equal(classifyIntent('/solicitar-demo/?email=private@example.com', origin), 'demo');
  assert.equal(classifyIntent('/transgest/precios/#comparativa', origin), 'plans');
  assert.equal(classifyIntent('mailto:private@example.com', origin), 'email');
  assert.equal(classifyIntent('tel:+34123456789', origin), 'phone');
  assert.equal(classifyIntent('https://wa.me/34123456789?text=private', origin), 'whatsapp');
  assert.equal(classifyIntent('https://transgest.app/', origin), 'client_portal');
  assert.equal(classifyIntent('https://gauna.es.evil.test/solicitar-demo/', origin), null);
  assert.equal(classifyIntent('javascript:alert(1)', origin), null);
  assert.equal(pageGroup('/arbitrary-private-path/'), 'other');
});

function trackingHarness() {
  const events = [];
  const windowHandlers = new Map(), documentHandlers = new Map();
  const win = {
    location: { origin: 'https://gauna.es', pathname: '/deca-2026/' },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    addEventListener: (type, handler) => windowHandlers.set(type, handler),
    removeEventListener: (type) => windowHandlers.delete(type),
    dispatchEvent: (event) => events.push(event),
  };
  const doc = {
    addEventListener: (type, handler) => documentHandlers.set(type, handler),
    removeEventListener: (type) => documentHandlers.delete(type),
  };
  const cleanup = installIntentTracking(win, doc);
  const consent = (analytics) => windowHandlers.get('gauna:analytics-consent')?.({ detail: { analytics } });
  const click = (plan = null) => {
    const link = { getAttribute: (name) => ({ href: '/solicitar-demo/?email=private@example.com', 'data-plan': plan })[name] ?? null, closest: () => null };
    documentHandlers.get('click')?.({ target: { closest: () => link }, button: 0, defaultPrevented: false });
  };
  return { events, consent, click, cleanup, windowHandlers, documentHandlers };
}

test('intent bridge is disabled by default, opt-in only, revocable and has no replay', () => {
  const harness = trackingHarness();
  harness.click(); assert.equal(harness.events.length, 0);
  harness.consent('granted'); harness.click(); assert.equal(harness.events.length, 0);
  harness.consent(true); harness.click(); assert.equal(harness.events.length, 1);
  assert.deepEqual(harness.events[0].detail, { event: 'navigation_intent', action: 'demo', page_group: 'deca', placement: 'content' });
  harness.consent(false); harness.click(); assert.equal(harness.events.length, 1);
  harness.consent(true); assert.equal(harness.events.length, 1);
  harness.click('Pro Intelligence'); assert.equal(harness.events[1].detail.plan, 'Pro Intelligence');
  harness.click('private@example.com'); assert.equal(harness.events[2].detail.plan, undefined);
  harness.cleanup();
  assert.equal(harness.documentHandlers.size, 0);
  assert.equal(harness.windowHandlers.size, 0);
});

test('the measurement foundation does not install trackers or read forms/storage', () => {
  const source = read('src/lib/navigation-intent.mjs');
  assert.doesNotMatch(source, /fetch\s*\(|sendBeacon\s*\(|localStorage|sessionStorage|document\.cookie|new FormData|dataLayer|gtag\s*\(/);
  assert.doesNotMatch(read('src/layouts/BaseLayout.astro'), /googletagmanager\.com|google-analytics\.com/);
});
