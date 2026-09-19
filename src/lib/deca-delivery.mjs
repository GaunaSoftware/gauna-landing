import { createHmac } from 'node:crypto';
import { DECA_GUIDE, DECA_PROFILES } from '../config/deca-guide.mjs';

const MAX_BODY = 16384;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

export function createLimiter() {
  const entries = new Map();
  return (key, now = Date.now()) => {
    for (const [id, entry] of entries) if (entry.expires <= now) entries.delete(id);
    const entry = entries.get(key);
    if (entry?.count >= 5 || (!entry && entries.size >= 5000)) return false;
    entries.set(key, { count: (entry?.count || 0) + 1, expires: entry?.expires || now + 600000 });
    return true;
  };
}

async function readBody(request) {
  if (!request.body) throw new Error('invalid_body');
  const size = Number(request.headers.get('content-length'));
  if (Number.isFinite(size) && size > MAX_BODY) throw new Error('body_too_large');
  const reader = request.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY) { await reader.cancel(); throw new Error('body_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function validateSubmission(data, kind, now) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Solicitud no válida.';
  const limits = { name: 150, email: 254, company: 200, phone: 60, profile: 80, message: 3000, website: 200, turnstileToken: 2048, requestId: 36 };
  for (const [field, max] of Object.entries(limits)) {
    if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > max)) return 'Revisa el formato o la longitud de los datos.';
  }
  if (data.website?.trim()) return 'No se ha podido validar la solicitud.';
  if (!data.name?.trim()) return 'Indica tu nombre.';
  if (!EMAIL.test(data.email?.trim() || '')) return 'Indica un email válido.';
  if (data.consent !== true) return 'Confirma la solicitud y la información de privacidad.';
  if (data.contactRequested !== undefined && typeof data.contactRequested !== 'boolean') return 'Solicitud no válida.';
  if (!UUID.test(data.requestId || '')) return 'Recarga la página antes de volver a enviar.';
  if (!Number.isFinite(data.startedAt) || now - data.startedAt < 3000 || data.startedAt > now) return 'Espera unos segundos y vuelve a intentarlo.';
  if (data.profile && !DECA_PROFILES.includes(data.profile)) return 'Selecciona un perfil de la lista.';
  if (kind === 'information' && (!data.company?.trim() || !data.phone?.trim())) return 'Indica la empresa y el teléfono de contacto.';
  if (!data.turnstileToken?.trim()) return 'Completa la verificación anti-spam.';
  return null;
}

function mailPayloads(data, kind, config) {
  const download = `https://gauna.es${DECA_GUIDE.path}`;
  const wantsContact = kind === 'information' || data.contactRequested === true;
  const details = [
    ['Solicitud', kind === 'guide' ? 'Guía DeCA 2026 (no es una solicitud de demo)' : 'Información comercial DeCA / TransGest'],
    ['Nombre', data.name], ['Email', data.email], ['Empresa', data.company || 'No facilitada'],
    ['Perfil', data.profile || 'No facilitado'], ['Teléfono', data.phone || 'No facilitado'],
    ['Contacto comercial solicitado', wantsContact ? 'Sí, expresamente' : 'No. Solo entrega de la guía; no iniciar seguimiento comercial.'],
    ['Aviso de privacidad', 'Aceptado para esta solicitud. Versión del formulario: 2026-09-19'],
    ['Mensaje', data.message || 'Sin comentario'], ['Referencia', data.requestId],
  ];
  const internal = {
    from: config.from, to: [config.to], reply_to: data.email,
    subject: kind === 'guide' ? 'Nueva solicitud de guía DeCA 2026' : 'Nueva solicitud de información DeCA / TransGest',
    text: details.map(([key, value]) => `${key}: ${value}`).join('\n'),
    html: `<h2>${kind === 'guide' ? 'Solicitud de guía DeCA' : 'Información DeCA / TransGest'}</h2><table>${details.map(([key, value]) => `<tr><td><strong>${escape(key)}</strong></td><td>${escape(value)}</td></tr>`).join('')}</table>`,
  };
  const visitor = {
    from: config.from, to: [data.email], reply_to: config.to,
    subject: 'Tu Guía DeCA 2026 de Gauna',
    text: `Hola ${data.name}.\n\nAquí tienes la Guía DeCA 2026, edición ${DECA_GUIDE.version}, ${DECA_GUIDE.pages} páginas. Revisión: ${DECA_GUIDE.reviewed}.\n\nDescargar: ${download}\n\nHas solicitado esta guía en gauna.es. Esta solicitud no te suscribe a una newsletter.\n${wantsContact ? 'También has solicitado que contactemos contigo sobre DeCA y TransGest.\n' : ''}\nConsulta la información y las fuentes de la guía para valorar tu caso.\nGauna Software · hola@gauna.es`,
    html: `<h2>Tu Guía DeCA 2026</h2><p>Hola ${escape(data.name)}.</p><p>Edición ${DECA_GUIDE.version} · ${DECA_GUIDE.pages} páginas · Revisión ${DECA_GUIDE.reviewed}.</p><p><a href="${download}">Descargar la guía en PDF</a></p><p>También puedes leer la <a href="https://gauna.es/deca-2026/">guía web</a>.</p><p>Has solicitado este recurso en gauna.es. No te hemos suscrito a una newsletter.</p>${wantsContact ? '<p>También has solicitado contacto sobre DeCA y TransGest.</p>' : ''}<p>Gauna Software · hola@gauna.es</p>`,
  };
  return { visitor, internal };
}

export function createDeCAHandler({ kind, config, rateLimit, blockedEmail = () => false, fetcher = fetch, now = Date.now, log = console.error }) {
  if (!['guide', 'information'].includes(kind)) throw new Error('invalid_kind');
  return async (request) => {
    if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, { Allow: 'POST' });
    const origin = request.headers.get('origin');
    const allowedOrigins = config.allowedOrigins || ['https://gauna.es', 'https://www.gauna.es'];
    if (!origin || !allowedOrigins.includes(origin)) return json({ error: 'Origen no autorizado.' }, 403);
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Formato no admitido.' }, 415);
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(ip)) return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429, { 'Retry-After': '600' });
    let raw;
    try { raw = await readBody(request); } catch (error) {
      return json({ error: 'Solicitud no válida o demasiado grande.' }, error.message === 'body_too_large' ? 413 : 400);
    }
    const error = validateSubmission(raw, kind, now());
    if (error) return json({ error }, 400);
    const data = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    data.email = data.email.toLowerCase();
    if (blockedEmail(data.email)) return json({ error: 'Utiliza una dirección de correo permanente.' }, 400);
    // Fail closed, including previews. Never inherit the legacy development bypass.
    if (!config.apiKey || !config.turnstileSecret) return json({ error: 'El envío por correo no está disponible. Puedes utilizar la descarga directa o escribir a hola@gauna.es.' }, 503);
    try {
      const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ secret: config.turnstileSecret, response: data.turnstileToken, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      });
      const token = await verification.json();
      if (!verification.ok || token.success !== true || token.hostname !== new URL(origin).hostname || token.action !== `deca_${kind}`) {
        return json({ error: 'Renueva la verificación anti-spam y vuelve a intentarlo.' }, 403);
      }
    } catch { return json({ error: 'No se ha podido comprobar la verificación anti-spam. Vuelve a intentarlo.' }, 503); }

    const mails = mailPayloads(data, kind, config);
    async function send(payload, role) {
      // Stable across retries; no personal data in key or logs. Changing the payload changes the key.
      const digest = createHmac('sha256', config.apiKey).update(JSON.stringify([kind, data.requestId, payload])).digest('hex');
      try {
        const response = await fetcher('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `deca-${role}-${digest}` },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        if (response.ok && typeof result?.id === 'string' && result.id) return 'accepted';
        log('[DeCA delivery]', { role, status: response.status, reference: data.requestId });
      } catch { log('[DeCA delivery]', { role, status: 'network_error', reference: data.requestId }); }
      return 'failed';
    }
    // Separate outcomes: never hide a failed internal notification behind a visitor email.
    const visitorEmail = kind === 'guide' ? await send(mails.visitor, 'visitor') : 'not_requested';
    const internalNotification = await send(mails.internal, 'internal');
    const complete = internalNotification === 'accepted' && (kind !== 'guide' || visitorEmail === 'accepted');
    const anyAccepted = internalNotification === 'accepted' || visitorEmail === 'accepted';
    return json({ validated: true, success: complete, visitorEmail, internalNotification,
      ...(kind === 'guide' ? { downloadUrl: DECA_GUIDE.path } : {}),
    }, complete ? 200 : anyAccepted ? 207 : 502);
  };
}
