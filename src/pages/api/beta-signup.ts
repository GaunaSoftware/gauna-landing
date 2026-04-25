import type { APIRoute } from 'astro';
import { createBetaTester } from '@/lib/airtable';
import {
  verifyTurnstile,
  checkRateLimit,
  isBlockedEmailDomain,
  isHoneypotFilled,
  isTooFast,
  getClientIp,
} from '@/lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);

  try {
    const data = await request.json();

    // ──────────────────────────────────────────────
    // CAPA 1: Honeypot
    // Si el campo invisible viene relleno, es un bot.
    // ──────────────────────────────────────────────
    if (isHoneypotFilled(data)) {
      console.warn(`[Security] Honeypot activado desde IP ${ip}`);
      // Respondemos "éxito" para confundir al bot (no sabrá que le hemos detectado)
      return new Response(
        JSON.stringify({ success: true, message: 'Solicitud recibida' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────
    // CAPA 2: Detección de envío demasiado rápido
    // Un humano no rellena un formulario en <3 segundos.
    // ──────────────────────────────────────────────
    if (isTooFast(data.startedAt)) {
      console.warn(`[Security] Envío sospechosamente rápido desde IP ${ip}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Solicitud recibida' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────
    // CAPA 3: Rate limiting por IP
    // Máximo 3 envíos cada 10 minutos por IP.
    // ──────────────────────────────────────────────
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      console.warn(`[Security] Rate limit excedido desde IP ${ip}`);
      return new Response(
        JSON.stringify({
          error: 'Demasiados intentos. Por favor, espera unos minutos antes de volver a intentarlo.',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 600),
          },
        }
      );
    }

    // ──────────────────────────────────────────────
    // CAPA 4: Cloudflare Turnstile
    // Valida que el usuario no sea un bot automatizado.
    // ──────────────────────────────────────────────
    const turnstileOk = await verifyTurnstile(data.turnstileToken, ip);
    if (!turnstileOk) {
      console.warn(`[Security] Turnstile falló desde IP ${ip}`);
      return new Response(
        JSON.stringify({
          error: 'La verificación anti-spam no ha pasado. Recarga la página e inténtalo de nuevo.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────
    // Validación de campos obligatorios
    // ──────────────────────────────────────────────
    const requiredFields = ['name', 'company', 'email', 'phone', 'profile', 'why'];
    const missing = requiredFields.filter((f) => !data[f] || String(data[f]).trim() === '');

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios', missing }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────
    // Validación de email
    // ──────────────────────────────────────────────
    const email = String(data.email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email no válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Bloqueo de dominios de email temporal
    if (isBlockedEmailDomain(email)) {
      return new Response(
        JSON.stringify({
          error: 'Usa un email profesional o permanente, por favor. No aceptamos correos temporales.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────
    // Todo OK: crear registro en Airtable
    // ──────────────────────────────────────────────
    await createBetaTester({
      Nombre: String(data.name).trim(),
      Empresa: String(data.company).trim(),
      Email: email,
      Telefono: String(data.phone).trim(),
      Perfil: String(data.profile).trim(),
      Vehiculos: data.fleet ? Number(data.fleet) : undefined,
      HerramientasActuales: data.tools ? String(data.tools).trim() : undefined,
      Motivacion: String(data.why).trim(),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Solicitud recibida correctamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[API beta-signup] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al procesar la solicitud. Inténtalo de nuevo en unos minutos.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Método no permitido. Usa POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};
