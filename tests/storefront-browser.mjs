import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {productMedia} from '../src/config/product-media.mjs';
const base=process.env.STOREFRONT_TEST_URL||'http://127.0.0.1:4321';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Browser fixtures run only on localhost.');
await mkdir('test-output/storefront',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined});
const routes=['/','/transgest/','/transgest/precios/','/planner/','/solicitar-demo/','/deca-2026/','/software-deca/','/blog/que-es-deca-transporte/'];
try{
 for(const width of [1440,390,360]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const path of routes){
   const response=await page.goto(base+path,{waitUntil:'networkidle'});
   assert.equal(response.status(),200,path);
   assert.equal(await page.locator('main h1').count(),1,path);
   assert.equal(await page.locator('body>header').count(),1,path);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://gauna.es'+path,path);
   assert.ok((await page.locator('meta[name=robots]').getAttribute('content')).startsWith('index, follow'),path);
   assert.ok(await page.locator('a[href="https://transgest.app/"]').count(),path);
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(el).position!=='fixed';}).slice(0,5).map(el=>el.className)}));
   assert.ok(overflow.page<=width+1,`${path} ${width}px: ${JSON.stringify(overflow)}`);
   if(path==='/transgest/precios/'){
    assert.equal(await page.locator('#comparativa table').count(),1);
    assert.equal(await page.locator('[id^="plan-"]').count(),5);
    assert.ok((await page.locator('#coste-transgest').textContent()).includes('Las tarifas se facilitan en una propuesta'));
   }
   if(path==='/transgest/'){
    for(const id of ['dashboard','pedidos','mesa-nueva','finanzas','informes']){
     await page.locator(`[data-hero="${id}"]`).click();
     assert.ok((await page.locator('#hero-image').getAttribute('src')).endsWith(`/${id}.webp`));
    }
    await page.locator('#step-0').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#step-1').getAttribute('aria-selected'),'true');
    assert.ok((await page.locator('#flow-image-button img').getAttribute('src')).endsWith('/mesa-nueva.webp'));
    for(const image of productMedia){
     const trigger=page.locator(`[data-screen="${image.id}"]`).first();
     await trigger.click();await page.locator('#viewer[open]').waitFor();
     const loaded=await page.locator('#viewer-body img').evaluate(async img=>{await img.decode();return {width:img.naturalWidth,height:img.naturalHeight,src:img.getAttribute('src')};});
     assert.deepEqual(loaded,{width:image.width,height:image.height,src:image.src});
     if(image.id==='deca-demo')await page.locator('#viewer').screenshot({path:`test-output/storefront/deca-${width}.png`});
     await page.keyboard.press('Escape');assert.equal(await page.locator('#viewer[open]').count(),0);
     assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Focus returns after Escape');
    }
    if(width===1440)await page.locator('#capacidades').screenshot({path:'test-output/storefront/capacidades-desktop.png'});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   }
   if(width<720&&['/transgest/','/transgest/precios/','/planner/'].includes(path)){
    await page.locator('#product-menu-toggle').click();assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'),'false');
   }
   if(['/','/transgest/','/planner/','/transgest/precios/'].includes(path)){
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`test-output/storefront/${path==='/'?'gauna':path.replaceAll('/','-')}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[],`${width}px runtime errors`);
  console.log(`Storefront ${width}px OK: ${routes.length} routes, SEO, single headers/H1, plans, eight images, gallery focus, tabs and mobile navigation.`);
  await context.close();
 }
}finally{await browser.close();}
