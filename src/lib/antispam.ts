/**
 * Sistema de protección anti-spam para formularios.
 * Capas: honeypot, rate limiting por IP, validación de patrones, Turnstile.
 */

// ======================= RATE LIMITING =======================
// Almacén en memoria de intentos por IP. En producción esto vive en la memoria
// de la función serverless — suficiente para bloqueo básico de oleadas de spam.
// Para un sistema más robusto se migraría a Vercel KV, pero esto es 80% de la efectividad.

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const ipAttempts = new Map<string, AttemptRecord>();

const RATE_LIMIT = {
  /** Máximo de intentos permitidos en la ventana */
  maxAttempts: 3,
  /** Ventana de tiempo en milisegundos (10 minutos) */
  windowMs: 10 * 60 * 1000,
};

/**
 * Comprueba si una IP ha superado el límite.
 * Devuelve `true` si se permite el request, `false` si está bloqueado.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipAttempts.get(ip);

  if (!record) {
    ipAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true };
  }

  // Si la ventana ha expirado, reseteamos
  if (now - record.firstAttempt > RATE_LIMIT.windowMs) {
    ipAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
    return { allowed: true };
  }

  // Si está dentro de la ventana y ya superó el límite
  if (record.count >= RATE_LIMIT.maxAttempts) {
    const retryAfter = Math.ceil((record.firstAttempt + RATE_LIMIT.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Incrementamos
  record.count++;
  record.lastAttempt = now;
  ipAttempts.set(ip, record);
  return { allowed: true };
}

/** Limpia intentos antiguos para evitar memory leak */
export function cleanupOldAttempts() {
  const now = Date.now();
  for (const [ip, record] of ipAttempts.entries()) {
    if (now - record.firstAttempt > RATE_LIMIT.windowMs * 2) {
      ipAttempts.delete(ip);
    }
  }
}

// ======================= HONEYPOT =======================
/**
 * Si el honeypot viene relleno, es un bot.
 * El campo se llama "website" y está oculto visualmente.
 */
export function isHoneypotTriggered(honeypotValue: unknown): boolean {
  return honeypotValue !== undefined && honeypotValue !== null && honeypotValue !== '';
}

// ======================= VALIDACIÓN DE TIEMPO =======================
/**
 * Un humano tarda mínimo ~3 segundos en rellenar un formulario.
 * Los bots lo hacen en milisegundos.
 */
export function isSubmittedTooFast(startTime: number): boolean {
  const MIN_FILL_TIME_MS = 3000;
  const elapsed = Date.now() - startTime;
  return elapsed < MIN_FILL_TIME_MS;
}

// ======================= VALIDACIÓN DE EMAIL =======================
/**
 * Dominios comunes de email temporales / desechables.
 * Lista conservadora, se puede extender.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
  'throwaway.email', 'temp-mail.org', 'trashmail.com', 'yopmail.com',
  'getnada.com', 'maildrop.cc', 'mintemail.com', 'tempinbox.com',
  'fakeinbox.com', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'tmpmail.org', 'dispostable.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

// ======================= DETECCIÓN DE PATRONES =======================
/**
 * Detecta patrones comunes de spam en textos:
 * - URLs múltiples
 * - Palabras típicas de spam
 * - Exceso de mayúsculas
 */
export function containsSpamPatterns(text: string): boolean {
  if (!text) return false;

  // Más de 2 URLs
  const urlMatches = text.match(/https?:\/\//gi);
  if (urlMatches && urlMatches.length > 2) return true;

  // Palabras típicas de spam de SEO/enlaces
  const spamPatterns = [
    /\b(viagra|cialis|casino|loan|mortgage|crypto|bitcoin|porn|sex cam)\b/i,
    /\b(click here|buy now|free money|winner|congratulations you won)\b/i,
    /(.)\1{6,}/, // carácter repetido 7+ veces (aaaaaaa)
  ];

  return spamPatterns.some((pattern) => pattern.test(text));
}

// ======================= TURNSTILE =======================
/**
 * Valida el token de Cloudflare Turnstile contra su API.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;

  // Si no hay secret configurado, saltamos (modo dev sin Turnstile)
  if (!secret) {
    console.warn('[Turnstile] Sin TURNSTILE_SECRET_KEY, saltando validación.');
    return true;
  }

  if (!token) return false;

  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );

    const data = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      console.warn('[Turnstile] Validación fallida:', data['error-codes']);
    }

    return data.success === true;
  } catch (error) {
    console.error('[Turnstile] Error llamando a siteverify:', error);
    return false;
  }
}

// ======================= UTILIDAD =======================
/**
 * Extrae la IP real del cliente, respetando los headers de Vercel.
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
