import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {plans,quote,media} from '../catalog.mjs';
const root=new URL('../',import.meta.url), read=p=>readFileSync(new URL(p,root),'utf8');
const cwd=fileURLToPath(root);
test('tariff and annual discount exactly match the supplied commercial document',()=>{assert.deepEqual(plans.map(p=>[p.id,p.monthly,p.annual,p.integration]),[['go',16900,172380,150000],['pro',34900,355980,150000],['intelligence',47900,488580,0]]);for(const p of plans)assert.equal(p.annual,Math.round(p.monthly*12*.85));});
test('integration remains payable in Go/Pro including annual; extras are not discounted',()=>{assert.equal(quote('go','annual').initial,322380);assert.equal(quote('pro','annual').initial,505980);assert.equal(quote('intelligence','annual').initial,488580);assert.equal(quote('intelligence','annual',1,1).initial,497380);assert.equal(quote('intelligence','annual',1,1).extrasMonthly,8800);assert.equal(quote('go','monthly',4,0).aiBlocks,0);assert.equal(quote('go','monthly').initial,166900);});
test('unsupported values cannot produce negative or invalid prices',()=>{for(const id of ['go','pro','intelligence','invalid'])for(const n of [-1,NaN,Infinity,1.5,999,'bad']){const q=quote(id,'invalid',n,n);assert.ok(Number.isInteger(q.initial)&&q.initial>=0);assert.equal(q.cycle,'monthly');}});
test('preview builds and only serves static anonymized materials',()=>{execFileSync(process.execPath,['build.mjs'],{cwd,env:{...process.env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'preview/transgest-store-20261002'}});for(const route of ['','transgest/','transgest/precios/','transgest/contratar/','transgest/formacion/','planner/','revision/']){const h=read(`dist/${route}index.html`);assert.match(h,/name="robots" content="noindex,nofollow,noarchive"/);assert.equal((h.match(/<h1\b/g)||[]).length,1);assert.doesNotMatch(h,/api\/contact|api\/deca|resend|stripe\.com/);for(const m of h.matchAll(/src="(\/assets\/[^\"]+)"/g))assert.ok(existsSync(new URL('dist'+m[1],root)),m[1]);}assert.equal(read('dist/robots.txt'),'User-agent: *\nDisallow: /\n');assert.equal(existsSync(new URL('dist/api',root)),false);assert.ok(!readdirSync(new URL('dist',root)).includes('sitemap.xml'));});
test('production and main builds fail closed',()=>{for(const env of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'}])assert.throws(()=>execFileSync(process.execPath,['build.mjs'],{cwd,env:{...process.env,...env},stdio:'pipe'}),/PREVIEW ONLY/);});
test('no data collection, fake payment or video promise',()=>{const js=read('site.mjs');assert.doesNotMatch(js,/fetch\s*\(|sendBeacon|localStorage|sessionStorage|document\.cookie|XMLHttpRequest/);const html=read('dist/transgest/contratar/index.html');assert.match(html,/Finalizar simulación/);assert.doesNotMatch(html,/autocomplete="cc-|name="card|type="password"/);for(const m of Object.values(media))assert.equal(m.videoSrc,'');});

test('all TransGest routes render one product-only header with the approved wordmark',()=>{
  for(const route of ['transgest/','transgest/precios/','transgest/contratar/','transgest/formacion/']){
    const html=read(`dist/${route}index.html`);
    const headers=[...html.matchAll(/<header\b[^>]*>[\s\S]*?<\/header>/g)];
    assert.equal(headers.length,1,route);
    assert.match(headers[0][0],/^<header class="product-nav">/);
    assert.match(headers[0][0],/<a class="product-name" href="\/transgest\/" aria-label="TransGest, inicio"><img class="transgest-wordmark"/);
    assert.ok(headers[0][0].includes('src="/assets/transgest-wordmark-v2.png"'));
    assert.doesNotMatch(headers[0][0],/Gauna|gauna|main-header|g-mark/);
    assert.equal((html.match(/class="preview-banner"/g)||[]).length,1);
    for(const href of ['/transgest/#recorrido','/transgest/#capacidades','/transgest/precios/']){
      assert.ok(headers[0][0].includes(`href="${href}"`),`${route}: ${href}`);
    }
    assert.match(headers[0][0],/aria-label="Navegación de TransGest"/);
    assert.match(headers[0][0],/>Contratar /);
  }
});

test('corporate pages retain the Gauna header and their own navigation',()=>{
  for(const route of ['','planner/','revision/']){
    const html=read(`dist/${route}index.html`);
    const headers=[...html.matchAll(/<header\b[^>]*>[\s\S]*?<\/header>/g)];
    assert.equal(headers.length,1,route);
    assert.match(headers[0][0],/^<header class="main-header">/);
    assert.match(headers[0][0],/aria-label="Gauna Software, inicio"/);
    assert.ok(headers[0][0].includes('href="/#productos"'));
    assert.ok(headers[0][0].includes('href="/#enfoque"'));
    assert.doesNotMatch(headers[0][0],/class="product-nav"/);
  }
});

test('product presentation removes the byline and preserves the corporate copyright',()=>{
  const html=read('dist/transgest/index.html');
  const main=html.match(/<main id="contenido">([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main);
  assert.doesNotMatch(main,/by Gauna/);
  assert.match(main,/class="product-byline">Software de transporte<\/p>/);
  assert.match(html,/<footer[\s\S]*© 2026 Gauna Software[\s\S]*<\/footer>/);
});

test('hero contains the actual approved image, no old text logo or decorative dot',()=>{
  const html=read('dist/transgest/index.html');
  const h1=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0];
  assert.ok(h1);
  assert.match(h1,/class="wordmark-heading"/);
  assert.match(h1,/src="\/assets\/transgest-wordmark-v2.png"/);
  assert.match(h1,/alt="TransGest"/);
  assert.doesNotMatch(h1,/hero-period|>TransGest<|transgest-icon/);
  assert.match(html,/data-brand-version="wordmark-v2"/);
});

test('T icon is a separate product favicon, while product footers use the wordmark',()=>{
  for(const route of ['transgest/','transgest/precios/','transgest/contratar/','transgest/formacion/']){
    const html=read(`dist/${route}index.html`);
    assert.ok(html.includes('<link rel="icon" href="/assets/transgest-icon-v2.png" type="image/png" sizes="64x64">'));
    const footer=html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer.includes('product-footer-brand'));
    assert.ok(footer.includes('src="/assets/transgest-wordmark-v2.png"'));
    assert.doesNotMatch(footer,/g-mark/);
  }
  assert.ok(read('dist/index.html').includes('href="/assets/mark.svg"'));
});

test('approved branding assets are real PNGs with the expected dimensions',()=>{
  for(const [name,w,h] of [['transgest-wordmark-v2.png',1838,271],['transgest-icon-v2.png',64,64]]){
    const bytes=readFileSync(new URL('dist/assets/'+name,root));
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);
  }
  const css=read('dist/branding.css');assert.match(css,/height: auto/);
});
