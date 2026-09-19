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
    headers: { 'Content-Type': 'application/json' },
  });
}

function clean(value: unknown, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char] || char));
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);

  try {
    const data = await request.json();

    // Bots get a success response so they do not learn which protection caught them.
    if (isHoneypotFilled(data) || isTooFast(data.startedAt)) {
      return json({ success: true, message: 'Solicitud recibida' });
    }

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter || 600),
        },
      });
    }

    if (!(await verifyTurnstile(data.turnstileToken, ip))) {
      return json({ error: 'La verificación anti-spam no ha pasado. Recarga la página e inténtalo de nuevo.' }, 403);
    }

    const type = clean(data.type, 30);
    const name = clean(data.name, 150);
    const company = clean(data.company, 200);
    const email = clean(data.email, 320).toLowerCase();
    const phone = clean(data.phone, 80);
    const profile = clean(data.profile, 200);
    const topic = clean(data.topic, 300);
    const message = clean(data.message, 5000);

    if (!['demo', 'contact'].includes(type) || !name || !company || !email || !phone || !message) {
      return json({ error: 'Faltan campos obligatorios.' }, 400);
    }
    if (type === 'demo' && !profile) return json({ error: 'Selecciona el tipo de empresa.' }, 400);
    if (type === 'contact' && !topic) return json({ error: 'Selecciona el motivo de contacto.' }, 400);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Email no válido.' }, 400);
    if (isBlockedEmailDomain(email)) return json({ error: 'Usa un email profesional o permanente, por favor.' }, 400);
    if (!RESEND_API_KEY) {
      console.error('[API contact] RESEND_API_KEY no configurada');
      return json({ error: 'El servicio de correo no está configurado.' }, 500);
    }

    const isDemo = type === 'demo';
    const subject = isDemo
      ? `Nueva solicitud de demo TransGest — ${company}`
      : `Nuevo contacto web — ${company}`;

    const details = [
      ['Origen', isDemo ? 'Solicitud de demo TransGest' : 'Formulario de contacto'],
      ['Nombre', name],
      ['Empresa', company],
      ['Email', email],
      ['Teléfono', phone],
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
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error('[API contact] Resend error:', resendResponse.status, detail);
      return json({ error: 'No hemos podido enviar el mensaje. Inténtalo de nuevo o escribe a hola@gauna.es.' }, 502);
    }

    return json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (error) {
    console.error('[API contact] Error:', error);
    return json({ error: 'Error al procesar la solicitud. Inténtalo de nuevo o escribe a hola@gauna.es.' }, 500);
  }
};

export const GET: APIRoute = async () => json({ error: 'Método no permitido. Usa POST.' }, 405);
