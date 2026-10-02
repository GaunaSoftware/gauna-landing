// Build-time brand application: real approved artwork, never a CSS font substitute.
import {readFileSync, writeFileSync, copyFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const expected = {
  'transgest-wordmark-v2.png': 'c8ddbff9c6cdd75086702548b8cf5776cfbc473e43e61bc64d602fe7de233236',
  'transgest-icon-v2.png': '30bb172aed1d93ee4cd0428cddf000207c9c7108aedb6f44147a88b162e2ba67',
};
function* htmlFiles(dir) {
  for (const item of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, item.name);
    if (item.isDirectory()) yield* htmlFiles(path);
    else if (item.name.endsWith('.html')) yield path;
  }
}
export function applyBranding(rootUrl) {
  const root = fileURLToPath(rootUrl), out = join(root, 'dist');
  for (const [name, digest] of Object.entries(expected)) {
    const source = join(root, 'assets', name), bytes = readFileSync(source);
    if (createHash('sha256').update(bytes).digest('hex') !== digest) throw new Error(`Brand asset integrity error: ${name}`);
    copyFileSync(source, join(out, 'assets', name));
  }
  copyFileSync(join(root, 'branding.css'), join(out, 'branding.css'));
  const mark = '<img class="transgest-wordmark" src="/assets/transgest-wordmark-v2.png" width="1838" height="271" alt="TransGest" decoding="async">';
  let productHeaders = 0, hero = 0;
  for (const file of htmlFiles(out)) {
    let html = readFileSync(file, 'utf8');
    const product = html.includes('<header class="product-nav">');
    if (product) {
      const previous = '<a class="product-name" href="/transgest/" aria-label="TransGest, inicio">TransGest</a>';
      if (!html.includes(previous)) throw new Error(`Product header changed: ${file}`);
      html = html.replace(previous, `<a class="product-name" href="/transgest/" aria-label="TransGest, inicio">${mark}</a>`);
      productHeaders++;
      html = html.replace('<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">', '<link rel="icon" href="/assets/transgest-icon-v2.png" type="image/png" sizes="64x64">');
      // Replace the visual footer brand, retaining the corporate copyright and links.
      html = html.replace(/(<div class="footer-top">)<a class="brand" href="\/">[\s\S]*?<\/a>/, `$1<a class="brand product-footer-brand" href="/transgest/" aria-label="TransGest, inicio">${mark}</a>`);
    }
    const oldHero = '<h1>TransGest<span class="hero-period">.</span></h1>';
    if (html.includes(oldHero)) {
      html = html.replace(oldHero, `<h1 class="wordmark-heading">${mark.replace('decoding="async"', 'decoding="async" fetchpriority="high"')}</h1>`);
      html = html.replace(/(<section class="product-hero wrap">)([\s\S]*?)(<\/section>)/, (_, start, body, end) => start + body.replaceAll('<br>', '<br> ') + end);
      hero++;
    }
    html = html.replaceAll('<p class="plan-brand">TransGest</p>', `<p class="plan-brand">${mark}</p>`);
    html = html.replace('<strong>TransGest<span>by Gauna</span></strong>', `<strong>${mark}<span>by Gauna</span></strong>`);
    html = html.replace('<h3>TransGest</h3>', `<h3 class="product-card-wordmark">${mark}</h3>`);
    html = html.replace('<link rel="stylesheet" href="/site.css">', '<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/branding.css?v=wordmark-v2">');
    html = html.replace('<body ', '<body data-brand-version="wordmark-v2" ');
    writeFileSync(file, html);
  }
  if (hero !== 1 || productHeaders !== 4) throw new Error(`Incomplete branding: hero=${hero}, productHeaders=${productHeaders}`);
  console.log('Approved TransGest wordmark applied to the hero, product headers, plans and footers. Separate T favicon.');
}
