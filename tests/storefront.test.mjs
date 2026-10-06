import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {productMedia} from '../src/config/product-media.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('the public gallery contains only the eight reviewed owner-supplied demonstration assets',()=>{
 assert.equal(productMedia.length,8);assert.equal(new Set(productMedia.map(item=>item.id)).size,8);
 for(const image of productMedia){
  const bytes=readFileSync(new URL('../public'+image.src,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256,image.id);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(image.width>1000&&image.height>1000);assert.match(image.sourceSha256,/^[a-f0-9]{64}$/);
 }
});
test('approved wordmark and separate T remain the exact clean vector artwork',()=>{
 const hashes={'transgest-wordmark-v3.svg':'3f19af6c1bf35595cd4a8eb3c4d717f8df474509898b7679ad848d80f83f299d','transgest-wordmark-v3-white.svg':'c4c06b6e10bc10ab60057f87362f9f050800967591710eb91d9893bdaacdc0d4','transgest-icon-v3.svg':'c6b2628c53cf7f2604749b507c5ccc27abdaa826864e3505f1e21050cae24a83','transgest-icon-v3-white.svg':'6543e767e38c8d1f87526caa4666ca59c09608ea19af0d80e41683d2293deed6'};
 for(const [name,hash]of Object.entries(hashes)){
  const source=read('public/media/transgest/'+name);assert.equal(createHash('sha256').update(source).digest('hex'),hash);
  assert.match(source,/<path /);assert.doesNotMatch(source,/<(?:image|text|script|filter|foreignObject)\b|data:image|\bstroke\s*=|(?:href|xlink:href)\s*=/i);
 }
});
test('the production presentation retains working conversion routes instead of preview simulations',()=>{
 for(const file of ['corporate.html','product.html']){
  const source=read('src/components/storefront/'+file);
  assert.doesNotMatch(source,/noindex|preview-banner|data-demo|\/transgest\/contratar\/|\/transgest\/formacion\/|<video\b|pendiente de grabación|espacio preparado/i);
  assert.match(source,/href="\/solicitar-demo\/"/);
 }
 const config=JSON.parse(read('vercel.json'));
 assert.notEqual(config.outputDirectory,'preview-site/dist');assert.doesNotMatch(config.buildCommand||'',/preview-site/);
});
