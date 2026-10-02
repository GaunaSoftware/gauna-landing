// Build-time branding: outlined SVGs traced from the approved artwork, not embedded PNGs.
import {readFileSync, writeFileSync, copyFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const expected = {
  "transgest-wordmark-v3.svg": "3f19af6c1bf35595cd4a8eb3c4d717f8df474509898b7679ad848d80f83f299d",
  "transgest-wordmark-v3-white.svg": "c4c06b6e10bc10ab60057f87362f9f050800967591710eb91d9893bdaacdc0d4",
  "transgest-icon-v3.svg": "c6b2628c53cf7f2604749b507c5ccc27abdaa826864e3505f1e21050cae24a83",
  "transgest-icon-v3-white.svg": "6543e767e38c8d1f87526caa4666ca59c09608ea19af0d80e41683d2293deed6"
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
    const svg = bytes.toString('utf8');
    if (!svg.includes('<path ') || /<(?:image|text|script|filter|foreignObject)\b|data:image|\bstroke\s*=|(?:href|xlink:href)\s*=/i.test(svg)) throw new Error(`Brand asset must be self-contained vector paths: ${name}`);
    copyFileSync(source, join(out, 'assets', name));
  }
  copyFileSync(join(root, 'branding.css'), join(out, 'branding.css'));
  const wordmark = (white = false) => `<img class="transgest-wordmark" src="/assets/transgest-wordmark-v3${white ? '-white' : ''}.svg" width="1842" height="275" alt="TransGest" decoding="async">`;
  const mark = wordmark(), whiteMark = wordmark(true);
  let productHeaders = 0, hero = 0;
  for (const file of htmlFiles(out)) {
    let html = readFileSync(file, 'utf8');
    const product = html.includes('<header class="product-nav">');
    if (product) {
      const previous = '<a class="product-name" href="/transgest/" aria-label="TransGest, inicio">TransGest</a>';
      if (!html.includes(previous)) throw new Error(`Product header changed: ${file}`);
      html = html.replace(previous, `<a class="product-name" href="/transgest/" aria-label="TransGest, inicio">${mark}</a>`);
      productHeaders++;
      html = html.replace('<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">', '<link rel="icon" href="/assets/transgest-icon-v3.svg" type="image/svg+xml" sizes="any"><link rel="icon" href="/assets/transgest-icon-v3-white.svg" type="image/svg+xml" sizes="any" media="(prefers-color-scheme: dark)">');
      html = html.replace(/(<div class="footer-top">)<a class="brand" href="\/">[\s\S]*?<\/a>/, `$1<a class="brand product-footer-brand" href="/transgest/" aria-label="TransGest, inicio">${mark}</a>`);
    }
    const oldHero = '<h1>TransGest<span class="hero-period">.</span></h1>';
    if (html.includes(oldHero)) {
      html = html.replace(oldHero, `<h1 class="wordmark-heading">${mark.replace('decoding="async"', 'decoding="async" fetchpriority="high"')}</h1>`);
      html = html.replace(/(<section class="product-hero wrap">)([\s\S]*?)(<\/section>)/, (_, start, body, end) => start + body.replaceAll('<br>', '<br> ') + end);
      hero++;
    }
    html = html.replaceAll('<p class="plan-brand">TransGest</p>', `<p class="plan-brand">${mark}</p>`);
    html = html.replace(/(<article class="plan featured"[^>]*>[\s\S]*?<p class="plan-brand">)[\s\S]*?(<\/p>)/g, (_, start, end) => start + whiteMark + end);
    html = html.replace('<strong>TransGest<span>by Gauna</span></strong>', `<strong>${mark}<span>by Gauna</span></strong>`);
    html = html.replace('<h3>TransGest</h3>', `<h3 class="product-card-wordmark">${whiteMark}</h3>`);
    html = html.replace('<link rel="stylesheet" href="/site.css">', '<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/branding.css?v=vector-v3">');
    html = html.replace('<body ', '<body data-brand-version="vector-v3" ');
    writeFileSync(file, html);
  }
  if (hero !== 1 || productHeaders !== 4) throw new Error(`Incomplete branding: hero=${hero}, productHeaders=${productHeaders}`);
  console.log('Vector TransGest wordmark applied to hero, headers, plans and footers. Separate SVG T favicon.');
}
