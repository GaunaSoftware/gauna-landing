import { createDeCAHandler, createLimiter } from './deca-delivery.mjs';
import { isBlockedEmailDomain } from './security';

const rateLimit = createLimiter();
const allowedOrigins = ['https://gauna.es', 'https://www.gauna.es'];
const deploymentHost = import.meta.env.VERCEL_URL;
if (import.meta.env.VERCEL_ENV === 'preview' && typeof deploymentHost === 'string' && /^[a-zA-Z0-9-]+\.vercel\.app$/.test(deploymentHost)) allowedOrigins.push(`https://${deploymentHost}`);
if (import.meta.env.DEV) allowedOrigins.push('http://localhost:4321', 'http://127.0.0.1:4321');

export function decaEndpoint(kind: 'guide' | 'information') {
  return createDeCAHandler({
    kind, rateLimit, blockedEmail: isBlockedEmailDomain,
    config: {
      apiKey: import.meta.env.RESEND_API_KEY,
      turnstileSecret: import.meta.env.TURNSTILE_SECRET_KEY,
      from: import.meta.env.CONTACT_FROM_EMAIL || 'TransGest <formularios@gauna.es>',
      to: import.meta.env.CONTACT_TO_EMAIL || 'hola@gauna.es',
      allowedOrigins,
    },
  });
}
