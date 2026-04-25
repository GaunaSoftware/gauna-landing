/**
 * Sistema de protección anti-spam para formularios.
 * Combina 4 capas:
 * 1. Cloudflare Turnstile (CAPTCHA invisible)
 * 2. Honeypot (campo oculto que solo bots rellenan)
 * 3. Rate limiting por IP (max 3 envíos / 10 min)
 * 4. Lista de dominios de email temporal bloqueados
 */

const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY;

// Dominios de email temporal/desechable conocidos (ampliable)
const BLOCKED_EMAIL_DOMAINS = [
  'mailinator.com', 'tempmail.com', 'guerrillamail.com', 'guerrillamail.net',
  '10minutemail.com', '10minutemail.net', 'throwawaymail.com', 'yopmail.com',
  'trashmail.com', 'maildrop.cc', 'getnada.com', 'mohmal.com', 'tempr.email',
  'dispostable.com', 'sharklasers.com', 'temp-mail.org', 'fakeinbox.com',
  'emailondeck.com', 'burnermail.io', 'mintemail.com', 'mytemp.email',
  'spambog.com', 'tempail.com', 'throwaway.email', 'inboxbear.com',
];

// Rate limit en memoria — simple pero efectivo para nuestro volumen
// Para producción a gran escala habría que usar Redis/Upstash, pero aquí sobra
const rateLimitStore = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 3;

/**
 * Verifica un token de Cloudflare Turnstile contra la API.
 * Si TURNSTILE_SECRET no está configurado, devuelve true (permite pasar).
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) {
    console.warn('[Security] TURNSTILE_SECRET_KEY no configurado. Saltando validación Turnstile.');
    return true; // modo desarrollo
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.append('secret', TURNSTILE_SECRET);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('[Security] Error verificando Turnstile:', error);
    return false;
  }
}

/**
 * Verifica rate limit por IP.
 * Devuelve { allowed: true } si puede proceder, o { allowed: false, retryAfter: N } si no.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // Limpiar entradas viejas cada vez (garbage collection básico)
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.firstRequest > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry) {
    rateLimitStore.set(ip, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  // Ventana expirada: reset
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  // Dentro de la ventana: incrementar o bloquear
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.firstRequest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Verifica si un email usa un dominio de correo temporal conocido.
 */
export function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return true;
  return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Detección de honeypot. El campo `website` es invisible en el formulario.
 * Si viene con algún valor, es un bot.
 */
export function isHoneypotFilled(data: any): boolean {
  return !!(data.website && String(data.website).trim().length > 0);
}

/**
 * Detección de envío demasiado rápido. Los bots rellenan y envían en <2 segundos.
 * Los humanos tardan al menos 5-10 segundos en un formulario serio.
 */
export function isTooFast(startedAt: number | string | undefined): boolean {
  if (!startedAt) return false;
  const ts = typeof startedAt === 'string' ? parseInt(startedAt, 10) : startedAt;
  if (isNaN(ts)) return false;
  const elapsed = Date.now() - ts;
  return elapsed < 3000; // menos de 3 segundos = bot
}

/**
 * Extrae la IP del cliente de la request (compatible con Vercel).
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
