import type { APIRoute } from 'astro';
import { serveGuide } from '../../lib/guide-file.mjs';
export const prerender = false;
export const ALL: APIRoute = ({ request }) => serveGuide(request, import.meta.env.RESEND_API_KEY);
