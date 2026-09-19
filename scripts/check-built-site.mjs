import assert from 'node:assert/strict';
import { readFile, access, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { SOCIAL_CARDS } from '../src/config/social-cards.mjs';

let root;
for (const directory of ['.vercel/output/static', 'dist/client', 'dist']) {
  try { await access(resolve(directory, 'transgest/precios/index.html')); root = directory; break; } catch {}
}
assert.ok(root, 'Cannot locate the built site');
const html = (path) => readFile(resolve(root, path), 'utf8');
const prices = await html('transgest/precios/index.html');
assert.match(prices, /id="comparativa"/);
assert.match(prices, /id="plan-pro-intelligence"/);
assert.match(prices, /<table\b/);
assert.equal((prices.match(/<h1\b/g) || []).length, 1);
assert.equal((prices.match(/>Recomendado</g) || []).length, 1);
assert.match(prices, /https:\/\/gauna\.es\/og\/planes\.png/);
for (const [file, social] of [['transgest/index.html', 'transgest'], ['blog/que-es-deca-transporte/index.html', 'deca'], ['blog/que-es-un-tms-transporte/index.html', 'tms']]) {
  const source = await html(file);
  assert.equal((source.match(/<h1\b/g) || []).length, 1, file);
  assert.ok(source.includes(`https://gauna.es/og/${social}.png`));
  assert.ok(source.includes('https://transgest.app/'));
}
assert.match(await html('transgest/index.html'), /id="evaluar-transgest"/);
await mkdir('test-output/social', { recursive: true });
for (const key of Object.keys(SOCIAL_CARDS)) {
  const file = resolve(root, `og/${key}.png`);
  const meta = await sharp(file).metadata();
  assert.equal(meta.format, 'png'); assert.equal(meta.width, 1200); assert.equal(meta.height, 630);
  const bytes = await readFile(file);
  assert.ok(bytes.length > 5000 && bytes.length < 500000, `${key}: unexpected preview size`);
  await copyFile(file, `test-output/social/${key}.png`);
  console.log(`PNG OK ${key}: ${bytes.length} bytes, 1200x630`);
}
const sitemap = await html('sitemap-0.xml');
assert.ok(!sitemap.includes('/og/'), 'Social images must not appear as HTML sitemap pages');
console.log('Built HTML, unique H1s, recommended plan, portal links, images and sitemap: OK');
