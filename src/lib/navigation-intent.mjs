import { PLAN_NAMES, normalizePath } from '../config/public-site.mjs';

// Preparation only: no provider, cookie, storage, request or pre-consent queue.
// A future consent manager enables this bridge; a separate adapter may consume
// gauna:navigation-intent. Never interpret these clicks as received leads.
export function pageGroup(pathname) {
  const path = normalizePath(pathname);
  if (path === '/') return 'home';
  if (path === '/transgest/precios/') return 'plans';
  if (path === '/transgest/' || path === '/blog/que-es-un-tms-transporte/') return 'tms';
  if (path === '/deca-2026/' || path === '/software-deca/' || /^\/blog\/(deca-|que-es-deca-|requisitos-tecnicos-deca-|resolucion-deca-)/.test(path)) return 'deca';
  return 'other';
}

export function classifyIntent(href, origin) {
  let url;
  try { url = new URL(href, origin); } catch { return null; }
  if (url.protocol === 'mailto:') return 'email';
  if (url.protocol === 'tel:') return 'phone';
  if (url.protocol === 'https:' && url.hostname === 'wa.me') return 'whatsapp';
  if (url.protocol === 'https:' && url.hostname === 'transgest.app') return 'client_portal';
  if (url.origin !== new URL(origin).origin) return null;
  const path = normalizePath(url.pathname);
  return ({ '/solicitar-demo/': 'demo', '/transgest/precios/': 'plans', '/transgest/': 'product', '/software-deca/': 'deca_software', '/deca-2026/': 'deca_guide' })[path] || null;
}

export function installIntentTracking(win, doc) {
  let granted = false;
  const onConsent = (event) => { granted = event.detail?.analytics === true; };
  const onClick = (event) => {
    if (!granted || event.defaultPrevented || event.button > 0) return;
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const link = target.closest('a[href]');
    if (!link) return;
    const action = classifyIntent(link.getAttribute('href'), win.location.origin);
    if (!action) return;
    const rawPlacement = link.getAttribute('data-placement');
    const placement = rawPlacement === 'floating' ? 'floating' : link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content';
    const detail = { event: 'navigation_intent', action, page_group: pageGroup(win.location.pathname), placement };
    const plan = link.getAttribute('data-plan');
    if (PLAN_NAMES.includes(plan)) detail.plan = plan;
    // Do not forward URLs, queries, link text, emails, phones or form contents.
    win.dispatchEvent(new win.CustomEvent('gauna:navigation-intent', { detail }));
  };
  win.addEventListener('gauna:analytics-consent', onConsent);
  doc.addEventListener('click', onClick);
  return () => {
    granted = false;
    win.removeEventListener('gauna:analytics-consent', onConsent);
    doc.removeEventListener('click', onClick);
  };
}
