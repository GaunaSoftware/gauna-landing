
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

const SITE = 'https://gauna.es';

const normalizePage = (page) => {
  return page.endsWith('/') ? page : `${page}/`;
};

const excludedFromSitemap = new Set([
  `${SITE}/beta-tester/`,
  `${SITE}/transgest/demo/`,
]);

export default defineConfig({
  site: SITE,

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),

    sitemap({
      filter: (page) => {
        return !excludedFromSitemap.has(normalizePage(page));
      },

      customPages: [
        `${SITE}/solicitar-demo/`,
        `${SITE}/contacto/`,
      ],

      serialize: (item) => {
        const url = normalizePage(item.url);

        if (url === `${SITE}/`) {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        }

        if (url === `${SITE}/transgest/`) {
          item.changefreq = 'weekly';
          item.priority = 0.95;
        }

        if (url === `${SITE}/dcd-2026/`) {
          item.changefreq = 'weekly';
          item.priority = 0.9;
        }

        if (url === `${SITE}/solicitar-demo/`) {
          item.changefreq = 'monthly';
          item.priority = 0.85;
        }

        if (url === `${SITE}/sobre-nosotros/`) {
          item.changefreq = 'monthly';
          item.priority = 0.7;
        }

        if (url === `${SITE}/contacto/`) {
          item.changefreq = 'monthly';
          item.priority = 0.65;
        }

        return item;
      },
    }),

    mdx(),
  ],

  redirects: {
    '/beta-tester': '/solicitar-demo/',
    '/beta-tester/': '/solicitar-demo/',
    '/transgest/demo': '/solicitar-demo/',
    '/transgest/demo/': '/solicitar-demo/',
  },

  output: 'server',

  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
});
