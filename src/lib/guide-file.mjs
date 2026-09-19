import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { repairApprovedGuide, SOURCE_PATH } from '../../scripts/prepare-guide.mjs';
import { DECA_GUIDE } from '../config/deca-guide.mjs';
import { GUIDE_FORM_PATH, validGuideAccess } from './guide-access.mjs';

let pending;
export function guideBytes() {
  // Included in the serverless function, never in public or a client-side bundle.
  if (!pending) pending = readFile(resolve(process.cwd(), SOURCE_PATH)).then(repairApprovedGuide).catch(error => { pending = undefined; throw error; });
  return pending;
}
const headers = () => ({ 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, nosnippet', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });

export async function serveGuide(request, secret, load = guideBytes, now = Date.now()) {
  const url = new URL(request.url), h = headers();
  if (![DECA_GUIDE.path, DECA_GUIDE.legacyPath].includes(url.pathname)) return new Response(null, { status: 404, headers: h });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...h, Allow: 'GET, HEAD' } });
  const values = url.searchParams.getAll('access');
  if (values.length !== 1 || !validGuideAccess(values[0], secret, now)) {
    // Direct old links, invalid and expired links all lead back to the email form.
    return new Response(null, { status: 303, headers: { ...h, Location: GUIDE_FORM_PATH } });
  }
  let bytes;
  try { bytes = await load(); }
  catch { return new Response('No se ha podido preparar la guía. Vuelve a intentarlo o escribe a hola@gauna.es.', { status: 503, headers: { ...h, 'Content-Type': 'text/plain; charset=utf-8' } }); }
  h['Content-Type'] = 'application/pdf';
  h['Content-Disposition'] = `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${DECA_GUIDE.filename}"`;
  h['Accept-Ranges'] = 'bytes';
  // Single byte ranges support the native Apple PDF viewers without a public bypass.
  let start = 0, end = bytes.length - 1, status = 200;
  const range = request.headers.get('range');
  if (range && request.method === 'GET') {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2])) return new Response(null, { status: 416, headers: { ...h, 'Content-Range': `bytes */${bytes.length}` } });
    start = m[1] ? Number(m[1]) : Math.max(0, bytes.length - Number(m[2]));
    end = m[1] && m[2] ? Math.min(Number(m[2]), bytes.length - 1) : bytes.length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) return new Response(null, { status: 416, headers: { ...h, 'Content-Range': `bytes */${bytes.length}` } });
    status = 206; h['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
  }
  h['Content-Length'] = String(end - start + 1);
  return new Response(request.method === 'HEAD' ? null : new Uint8Array(bytes.subarray(start, end + 1)), { status, headers: h });
}
