import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {productMedia} from '../src/config/product-media.mjs';
import {commercePlans,money} from '../src/config/commerce.mjs';
const base=process.env.STOREFRONT_TEST_URL||'http://127.0.0.1:4321';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Browser fixtures run only on localhost.');
await mkdir('test-output/storefront',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined});
const routes=['/','/transgest/','/transgest/precios/','/planner/','/solicitar-demo/','/deca-2026/','/software-deca/','/blog/que-es-deca-transporte/','/transgest/contratar/'];
try{
 for(const width of [1440,390,360]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const path of routes){
   // Astro's development connection can stay active after the page is ready.
   // Wait for the document and its rendered content instead of network silence.
   const response=await page.goto(base+path,{waitUntil:'load'});
   await page.locator('main h1').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(response.status(),200,path);
   assert.equal(await page.locator('main h1').count(),1,path);
   assert.equal(await page.locator('body>header').count(),1,path);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://gauna.es'+path,path);
   assert.ok((await page.locator('meta[name=robots]').getAttribute('content')).startsWith(path==='/transgest/contratar/'?'noindex, nofollow':'index, follow'),path);
   assert.ok(await page.locator('a[href="https://transgest.app/"]').count(),path);
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(el).position!=='fixed';}).slice(0,5).map(el=>el.className)}));
   assert.ok(overflow.page<=width+1,`${path} ${width}px: ${JSON.stringify(overflow)}`);
   if(path==='/transgest/precios/'){
    assert.equal(await page.locator('#comparativa table').count(),1);
    assert.equal(await page.locator('article[id^="plan-"]').count(),3);
    assert.ok((await page.locator('#coste-transgest').textContent()).includes('La contratación anual se factura por el año completo'));
    for(const plan of commercePlans.filter(plan=>plan.id!=='planner')){
     const card=page.locator(`[id="plan-${plan.name.toLowerCase().replaceAll(' ','-')}"]`);
     assert.ok((await card.textContent()).includes(money(plan.monthly)));
     assert.ok((await card.textContent()).includes(money(plan.annual)));
     assert.equal(await card.locator('a[data-plan]').getAttribute('href'),'/transgest/contratar/?plan='+plan.id);
    }
   }
   if(path==='/solicitar-demo/'){
    assert.equal(await page.locator('.demo-hero').count(),1);
    assert.equal(await page.locator('#demo-form').count(),1);
    assert.equal(await page.locator('.demo-product-image').count(),1);
   }
   if(path==='/transgest/contratar/'){
    await page.locator('#checkout-page[data-checkout-ready="true"]').waitFor();
    assert.equal(await page.locator('#initial-total').textContent(),money(16900+150000));
    await page.locator('input[name=billing][value=annual]').check();
    assert.equal(await page.locator('#initial-total').textContent(),money(172380+150000));
    assert.equal(await page.locator('#renewal-total').textContent(),money(172380)+' /año');
    assert.equal(await page.locator('#checkout-start').isDisabled(),true);
    assert.equal(await page.locator('#checkout-unavailable').count(),1);
    assert.equal(await page.locator('script[src*="js.stripe.com"]').count(),0,'No external payment script before configuration');
    const denied=await context.request.get(base+'/api/stripe/status?session_id=cs_live_foreign');
    assert.equal(denied.status(),403,'Unowned checkout does not disclose payment state');
   }
   if(path==='/transgest/'){
    for(const id of ['dashboard','pedidos','mesa-nueva','finanzas','informes']){
     await page.locator(`[data-hero="${id}"]`).click();
     assert.ok((await page.locator('#hero-image').getAttribute('src')).endsWith(`/${id}.webp`));
    }
    await page.locator('#step-0').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#step-1').getAttribute('aria-selected'),'true');
    assert.ok((await page.locator('#flow-image-button img').getAttribute('src')).endsWith('/mesa-nueva.webp'));
    assert.equal(await page.locator('main [data-screen^="planner-"]').count(),0,'Planner screenshots belong to its own page');
    for(const image of productMedia.filter(image=>!image.id.startsWith('planner-'))){
     const trigger=page.locator(`[data-screen="${image.id}"]`).first();
     await trigger.click();await page.locator('#viewer[open]').waitFor();
     const loaded=await page.locator('#viewer-body img').evaluate(async img=>{await img.decode();return {width:img.naturalWidth,height:img.naturalHeight,src:img.getAttribute('src')};});
     assert.deepEqual(loaded,{width:image.width,height:image.height,src:image.src});
     if(image.id==='dashboard')assert.equal(await page.locator('#viewer-body img').evaluate(img=>getComputedStyle(img).clipPath),'inset(0px 0px 6%)');
     if(image.id==='deca-demo')await page.locator('#viewer').screenshot({path:`test-output/storefront/deca-${width}.png`});
     await page.keyboard.press('Escape');assert.equal(await page.locator('#viewer[open]').count(),0);
     assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Focus returns after Escape');
    }
    if(width===1440)await page.locator('#capacidades').screenshot({path:'test-output/storefront/capacidades-desktop.png'});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   }
   if(path==='/planner/'){
    assert.equal(await page.locator('header a[aria-label="Planner, inicio"]').count(),1);
    assert.equal(await page.locator('header a[href="/transgest/precios/"]').count(),0);
    assert.equal(await page.locator('#precios a[href="/transgest/contratar/?plan=planner"]').count(),1);
    assert.ok((await page.locator('#precios').textContent()).includes(money(65900)));
    assert.ok((await page.locator('#precios').textContent()).includes(money(672180)));
    for(const image of productMedia.filter(image=>image.id.startsWith('planner-'))){
     await page.locator(`[data-screen="${image.id}"]`).click();await page.locator('#viewer[open]').waitFor();
     await page.locator('#viewer-body img').evaluate(img=>img.decode());
     assert.equal(await page.locator('#viewer-body img').evaluate(img=>getComputedStyle(img).clipPath),'inset(0px 0px 6%)');
     await page.keyboard.press('Escape');
    }
   }
   if(['/transgest/','/planner/','/transgest/precios/','/solicitar-demo/'].includes(path)){
    const back=page.locator('header a[aria-label="Volver a Gauna"]');assert.ok(await back.isVisible());
    await back.click();await page.waitForURL(base+'/');
    assert.equal(await page.locator('[data-page="corporate"]').count(),1,'The product header returns to the Gauna home');
    const next=path==='/planner/'?'/planner/':'/transgest/';
    if(width<720)await page.locator('#mobile-menu-toggle').click();
    await page.locator(`header nav:visible a[href="${next}"]`).click();await page.waitForURL(base+next);
    await page.goto(base+path,{waitUntil:'load'});
   }
   if(width<720&&['/transgest/','/transgest/precios/','/planner/','/solicitar-demo/'].includes(path)){
    await page.locator('#product-menu-toggle').click();assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'),'false');
   }
   if(['/','/transgest/','/planner/','/transgest/precios/','/solicitar-demo/','/transgest/contratar/'].includes(path)){
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`test-output/storefront/${path==='/'?'gauna':path.replaceAll('/','-')}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[],`${width}px runtime errors`);
  console.log(`Storefront ${width}px OK: ${routes.length} routes, SEO, single headers/H1, plans, eight images, gallery focus, tabs and mobile navigation.`);
  await context.close();
 }
}finally{await browser.close();}
