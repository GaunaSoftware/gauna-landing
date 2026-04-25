import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://gauna.es',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
    mdx(),
  ],
  // "hybrid": la mayoría de páginas son estáticas (rápidas, SEO),
  // pero las API routes y páginas con prerender:false se renderizan en servidor.
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
});
