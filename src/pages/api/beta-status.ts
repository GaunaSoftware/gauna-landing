import type { APIRoute } from 'astro';
import { getBetaStatus } from '@/config/beta';

export const prerender = false;

export const GET: APIRoute = async () => {
  const status = await getBetaStatus();

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache de 60 segundos para no saturar Airtable
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
};
