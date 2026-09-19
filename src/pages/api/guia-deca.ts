import type { APIRoute } from 'astro';
import { decaEndpoint } from '@/lib/deca-api';
export const prerender = false;
const handle = decaEndpoint('guide');
export const ALL: APIRoute = ({ request }) => handle(request);
