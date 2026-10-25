import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

const SITE = 'https://gauna.es';

// Astro must reconstruct the public URL behind Vercel's proxy so same-origin
// checks compare the browser origin with gauna.es rather than an internal host.
const allowedDomains = [
  {hostname:'gauna.es',protocol:'https'},
  {hostname:'www.gauna.es',protocol:'https'},
];
for (const host of new Set([process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL])) {
  if (typeof host === 'string' && /^[a-zA-Z0-9-]+\.vercel\.app$/.test(host)) {
    allowedDomains.push({hostname:host,protocol:'https'});
  }
}
if (process.env.NODE_ENV !== 'production') {
  allowedDomains.push({hostname:'localhost',protocol:'http'}, {hostname:'127.0.0.1',protocol:'http'});
}

const normalizePage = (page) => {
  return page.endsWith('/') ? page : `${page}/`;
};

// Dates reflect the editorial changes, never the time of the build.
const seoUpdatedPages = new Map([
  ['/blog/que-es-deca-transporte/', '2026-10-18'],
  ['/blog/deca-para-transportistas-y-flotas/', '2026-10-18'],
  ['/blog/deca-ecmr-diferencias/', '2026-10-25'],
  ['/blog/requisitos-tecnicos-deca-pdf-qr-url/', '2026-10-25'],
  ['/blog/que-es-un-tms-transporte/', '2026-10-18'],
  ['/blog/digitalizacion-albaranes-transporte/', '2026-10-18'],
  ['/blog/', '2026-10-25'],
  ['/software-deca/', '2026-10-18'],
  ['/deca-2026/', '2026-10-18'],
]);

const excludedFromSitemap = new Set([
  `${SITE}/beta-tester/`,
  `${SITE}/transgest/demo/`,
  `${SITE}/dcd-2026/`,
]);

export default defineConfig({
  site: SITE,
  security: {allowedDomains},

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),

    sitemap({
      filter: (page) => {
        // Checkout and its result are noindex; assets are not HTML landing pages.
        const pathname = new URL(page).pathname;
        return !pathname.startsWith('/guias/') && !pathname.startsWith('/og/') && !pathname.startsWith('/transgest/contratar/') && !excludedFromSitemap.has(normalizePage(page));
      },

      customPages: [
        `${SITE}/solicitar-demo/`,
        `${SITE}/contacto/`,
        `${SITE}/software-deca/`,
        `${SITE}/deca-2026/`,
      ],

      serialize: (item) => {
        const url = normalizePage(item.url);
        const lastmod = seoUpdatedPages.get(new URL(url).pathname);
        if (lastmod) item.lastmod = lastmod;

        if (url === `${SITE}/`) {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        }

        if (url === `${SITE}/transgest/`) {
          item.changefreq = 'weekly';
          item.priority = 0.95;
        }

        if (url === `${SITE}/transgest/precios/`) {
          item.changefreq = 'monthly';
          item.priority = 0.85;
        }

        if (url === `${SITE}/deca-2026/`) {
          item.changefreq = 'weekly';
          item.priority = 0.9;
        }

        if (url === `${SITE}/software-deca/`) {
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
    '/beta-tester': {
      status: 301,
      destination: '/solicitar-demo/',
    },
    '/transgest/demo': {
      status: 301,
      destination: '/solicitar-demo/',
    },
    '/blog/primer-articulo': {
      status: 301,
      destination: '/deca-2026/',
    },
  },

  output: 'server',

  adapter: vercel({
    webAnalytics: { enabled: false },
    includeFiles: ['assets/guides/deca-2026-v2.1-original.pdf'],
  }),
});
