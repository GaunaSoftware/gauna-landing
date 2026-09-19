import type { APIRoute } from 'astro';
import { SOCIAL_CARDS } from '../../config/social-cards.mjs';
import { renderSocialCard } from '../../lib/render-social-card.mjs';

export const prerender = true;
export function getStaticPaths() {
  return Object.keys(SOCIAL_CARDS).map((slug) => ({ params: { slug } }));
}
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug || !Object.hasOwn(SOCIAL_CARDS, slug)) return new Response(null, { status: 404 });
  const image = await renderSocialCard(slug);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/png' } });
};
