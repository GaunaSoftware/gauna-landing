import type { APIRoute } from 'astro';
import { decaEndpoint } from '@/lib/deca-api';
export const prerender = false;
const handle = decaEndpoint('information');
export const ALL: APIRoute = ({ request }) => handle(request);
