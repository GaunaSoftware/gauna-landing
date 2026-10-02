import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderPage,media} from './app.mjs';
if(process.env.VERCEL_ENV==='production'||process.env.VERCEL_GIT_COMMIT_REF==='main')throw new Error('PREVIEW ONLY: production and main builds are deliberately blocked. Do not merge this branch.');
const source=fileURLToPath(new URL('.',import.meta.url));const output=resolve(source,'../preview-dist');
await rm(output,{recursive:true,force:true});await mkdir(join(output,'media'),{recursive:true});
for(const filename of ['styles.css','app.mjs'])await copyFile(join(source,filename),join(output,filename));
for(const asset of Object.values(media))await copyFile(join(source,'media',asset.file),join(output,'media',asset.file));
const routes=['/','/transgest/','/transgest/precios/','/transgest/contratar/','/solicitar-demo/','/formacion/','/planner/'];
const titles=['Gauna — tecnología para transporte y logística','TransGest by Gauna — presentación de producto','TransGest — planes y precios','TransGest — contratación de prueba','TransGest — demo de prueba','Academia TransGest — vista de prueba','TransGest Planner — vista de producto'];
for(const [i,route]of routes.entries()){
 const folder=join(output,route);await mkdir(folder,{recursive:true});
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#153d30"><meta name="description" content="Preview de diseño Gauna y TransGest. Sin pagos ni altas reales."><title>${titles[i]} · PREVIEW</title><link rel="stylesheet" href="/styles.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23153d30'/%3E%3Ctext x='9' y='29' fill='white' font-family='sans-serif' font-size='27'%3EG%3C/text%3E%3C/svg%3E"></head><body><a class="skip" href="#main">Saltar al contenido</a>${renderPage(route)}<script type="module" src="/app.mjs"></script></body></html>`;
 await writeFile(join(folder,'index.html'),html);
}
await writeFile(join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
await writeFile(join(output,'404.html'),'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Preview · Página no disponible</title><h1>Esta página no forma parte de la preview.</h1><p><a href="/">Volver a Gauna</a> · <a href="/transgest/">Ver TransGest</a></p></html>');
console.log(`Built ${routes.length} preview routes. Static only. No API, payment SDK, form delivery, account creation or production deployment.`);
