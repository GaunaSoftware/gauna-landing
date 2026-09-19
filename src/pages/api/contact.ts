import type { APIRoute } from 'astro';
import {
  verifyTurnstile,
  checkRateLimit,
  isBlockedEmailDomain,
  isHoneypotFilled,
  isTooFast,
  getClientIp,
} from '@/lib/security';

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const CONTACT_TO_EMAIL = import.meta.env.CONTACT_TO_EMAIL || 'hola@gauna.es';
const CONTACT_FROM_EMAIL = import.meta.env.CONTACT_FROM_EMAIL || 'TransGest <formularios@gauna.es>';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function clean(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] || char);
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);

  try {
    let data: Record<string, unknown>;
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return json({ error: 'Solicitud no válida.' }, 400);
      }
      data = body as Record<string, unknown>;
    } catch {
      return json({ error: 'Solicitud no válida.' }, 400);
    }

    // Keep the honeypot silent, but never silently discard a fast human submission.
    if (isHoneypotFilled(data)) {
      return json({ success: true, message: 'Solicitud recibida' });
    }
    const startedAt = typeof data.startedAt === 'string' || typeof data.startedAt === 'number'
      ? data.startedAt : undefined;
    if (isTooFast(startedAt)) {
      return json({ error: 'Espera unos segundos y vuelve a enviar el formulario.' }, 400);
    }

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimit.retryAfter || 600),
        },
      });
    }

    const type = clean(data.type, 30);
    const name = clean(data.name, 150);
    const company = clean(data.company, 200);
    const email = clean(data.email, 320).toLowerCase();
    const phone = clean(data.phone, 80);
    const profile = clean(data.profile, 200);
    const topic = clean(data.topic, 300);
    // Accept the previous demo field during rolling deployments and open browser tabs.
    // The demo comment is optional in both the browser and the API.
    const message = clean(data.message, 5000) || clean(data.why, 5000)
      || (type === 'demo' ? 'Solicitud enviada desde la página de demo.' : '');

    if (type !== 'demo' && type !== 'contact') {
      return json({ error: 'Tipo de solicitud no válido. Recarga la página e inténtalo de nuevo.' }, 400);
    }
    const required: Record<string, string> = { name, company, email, phone };
    if (type === 'demo') required.profile = profile;
    if (type === 'contact') {
      required.topic = topic;
      required.message = message;
    }
    const labels: Record<string, string> = {
      name: 'nombre', company: 'empresa', email: 'email', phone: 'teléfono',
      profile: 'tipo de empresa', topic: 'motivo de contacto', message: 'mensaje',
    };
    const missing = Object.keys(required).filter((field) => !required[field]);
    if (missing.length > 0) {
      return json({ error: `Completa los campos obligatorios: ${missing.map((field) => labels[field]).join(', ')}.`, missing }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Email no válido.' }, 400);
    if (isBlockedEmailDomain(email)) return json({ error: 'Usa un email profesional o permanente, por favor.' }, 400);
    if (!RESEND_API_KEY) {
      console.error('[API contact] RESEND_API_KEY no configurada');
      return json({ error: 'El servicio de correo no está disponible. Escribe a hola@gauna.es.' }, 503);
    }

    // Validate fields first: Turnstile tokens can only be redeemed once.
    if (!(await verifyTurnstile(clean(data.turnstileToken, 2048), ip))) {
      return json({ error: 'La verificación anti-spam ha caducado o no es válida. Complétala de nuevo y reintenta el envío.' }, 403);
    }

    const isDemo = type === 'demo';
    const subject = isDemo
      ? `Nueva solicitud de demo TransGest — ${company.replace(/[\r\n]/g, ' ')}`
      : `Nuevo contacto web — ${company.replace(/[\r\n]/g, ' ')}`;
    const details = [
      ['Origen', isDemo ? 'Solicitud de demo TransGest' : 'Formulario de contacto'],
      ['Nombre', name], ['Empresa', company], ['Email', email], ['Teléfono', phone],
      ...(isDemo ? [['Tipo de empresa', profile]] : [['Motivo', topic]]),
    ];
    const html = `
      <h2>${escapeHtml(subject)}</h2>
      <table cellpadding="6" cellspacing="0">
        ${details.map(([label, value]) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`).join('')}
      </table>
      <h3>Mensaje</h3>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      <hr>
      <p style="font-size:12px;color:#64748b">Enviado desde gauna.es. Responde a este correo para contestar directamente a ${escapeHtml(name)}.</p>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL, to: [CONTACT_TO_EMAIL], reply_to: email, subject, html,
      }),
    });
    if (!resendResponse.ok) {
      console.error('[API contact] Resend rejected the request:', resendResponse.status);
      return json({ error: 'No hemos podido enviar el mensaje. Inténtalo de nuevo o escribe a hola@gauna.es.' }, 502);
    }
    const result = await resendResponse.json();
    if (!result || typeof result.id !== 'string' || !result.id) {
      console.error('[API contact] Resend response did not include an email id');
      return json({ error: 'No hemos podido confirmar el envío. Contacta con hola@gauna.es.' }, 502);
    }
    return json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (error) {
    console.error('[API contact] Request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'No hemos podido confirmar el envío. Inténtalo de nuevo o escribe a hola@gauna.es.' }, 500);
  }
};

export const GET: APIRoute = async () => json({ error: 'Método no permitido. Usa POST.' }, 405);
