import { createHmac, timingSafeEqual } from 'node:crypto';
import { DECA_GUIDE } from '../config/deca-guide.mjs';

export const GUIDE_FORM_PATH = '/deca-2026/#formulario-deca';
export const GUIDE_ACCESS_TTL = 7 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^1\.([0-9]{10})\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;
function signature(value, secret) {
  if (typeof secret !== 'string' || secret.length < 16) throw new Error('guide_access_not_configured');
  // Domain-separated HMAC key. The existing server-only Resend secret is never exposed.
  const key = createHmac('sha256', secret).update('gauna:guide-email-access:v1').digest();
  return createHmac('sha256', key).update(`${value}:${DECA_GUIDE.sha256}`).digest();
}

// Called only after submission and CAPTCHA validation. No email/name in the URL.
// startedAt and requestId are stable during a retry, so Resend idempotency is retained.
export function issueGuideAccess(data, secret, now = Date.now()) {
  if (!UUID.test(data.requestId || '') || !Number.isSafeInteger(data.startedAt) || data.startedAt > now || now - data.startedAt > 86400000) throw new Error('invalid_guide_request');
  const issued = Math.floor(data.startedAt / 1000);
  const value = `1.${issued}.${data.requestId.toLowerCase()}`;
  const token = `${value}.${signature(value, secret).toString('base64url')}`;
  const path = `${DECA_GUIDE.path}?access=${token}`;
  return { token, path, downloadUrl: `${path}&download=1`, openUrl: `${path}&view=1` };
}

export function validGuideAccess(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 180) return false;
  const match = TOKEN.exec(token);
  if (!match || !UUID.test(match[2])) return false;
  const issued = Number(match[1]), seconds = Math.floor(now / 1000);
  if (issued > seconds || seconds >= issued + GUIDE_ACCESS_TTL) return false;
  try {
    const expected = signature(`1.${match[1]}.${match[2]}`, secret);
    const supplied = Buffer.from(match[3], 'base64url');
    return supplied.toString('base64url') === match[3] && supplied.length === expected.length && timingSafeEqual(expected, supplied);
  } catch { return false; }
}
