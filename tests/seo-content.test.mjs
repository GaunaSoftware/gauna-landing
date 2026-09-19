// Source-level regression checks. These do not prove rankings, indexing or email delivery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const articles = {
  'que-es-deca-transporte': {
    title: 'Qué es el DeCA en transporte y cuándo será obligatorio en 2026',
    description: 'Explicamos qué es el DeCA en transporte, cuándo será obligatorio, a quién afecta y qué exige la normativa para el documento electrónico de control.',
    category: 'normativa',
    requiredLinks: ['/deca-2026/', '/software-deca/', '/blog/deca-ecmr-diferencias/', '/blog/que-es-un-tms-transporte/'],
  },
  'que-es-un-tms-transporte': {
    title: 'Qué es un TMS de transporte y para qué sirve',
    description: 'Qué es un TMS de transporte, qué funciones debería incluir y cuándo compensa implantar un software de gestión en una empresa de transporte.',
    category: 'gestion',
    requiredLinks: ['/deca-2026/', '/transgest/', '/transgest/precios/', '/solicitar-demo/'],
  },
};
const layout = read('src/pages/blog/[...slug].astro');
const ctaExpression = layout.match(/const nextStep = ([\s\S]*?);\n/)?.[1];
assert.ok(ctaExpression, 'The targeted CTA configuration must exist');
const nextStepFor = (slug) => vm.runInNewContext(ctaExpression, { post: { slug } }, { timeout: 1000 });

function routeExists(href) {
  const { pathname } = new URL(href, 'https://gauna.es');
  assert.ok(pathname.startsWith('/') && !pathname.includes('..'));
  const route = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  const candidates = [
    `src/pages/${route}.astro`, `src/pages/${route}/index.astro`, `public/${route}`,
  ];
  if (route.startsWith('blog/')) candidates.push(`src/content/${route}.md`, `src/content/${route}.mdx`);
  return candidates.some((path) => existsSync(resolve(root, path)));
}

for (const [slug, expected] of Object.entries(articles)) {
  const source = read(`src/content/blog/${slug}.md`);
  test(`${slug}: original identity is preserved and update date is explicit`, () => {
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    assert.ok(frontmatter);
    const fields = Object.fromEntries(frontmatter.split('\n').map((line) => {
      const split = line.indexOf(':');
      return [line.slice(0, split), line.slice(split + 1).trim()];
    }));
    assert.equal(JSON.parse(fields.title), expected.title);
    assert.equal(JSON.parse(fields.description), expected.description);
    assert.equal(JSON.parse(fields.category), expected.category);
    assert.equal(fields.pubDate, '2026-09-14');
    assert.equal(fields.updatedDate, '2026-09-19');
    assert.equal(fields.slug, undefined);
    assert.equal(fields.draft, undefined);
    assert.doesNotMatch(source, /^# /m, 'H1 is rendered by the layout, not duplicated in Markdown');
  });
  test(`${slug}: contextual links resolve to repository routes`, () => {
    const links = [...source.matchAll(/\[([^\]]+)\]\((\/[^)]+)\)/g)];
    for (const href of expected.requiredLinks) assert.ok(links.some((match) => match[2] === href), `Missing ${href}`);
    for (const [, label, href] of links) {
      assert.ok(label.trim().length > 4, `Empty or unhelpful anchor: ${href}`);
      assert.ok(routeExists(href), `No route found for ${href}`);
    }
  });
  test(`${slug}: conversion uses existing product and demo URLs, not an unpublished download`, () => {
    const cta = nextStepFor(slug);
    assert.ok(cta && cta.title && cta.description && cta.productLabel && cta.resourceLabel);
    assert.ok(routeExists(cta.productHref));
    assert.ok(routeExists(cta.resourceHref));
    assert.ok(routeExists('/solicitar-demo/'));
    assert.doesNotMatch(JSON.stringify(cta), /descargar|te hemos enviado|\.pdf/i);
    assert.match(layout, /nextStep \? \(/);
    assert.match(layout, /<a href=\{nextStep\.productHref\}/);
    assert.match(layout, /<a href="\/solicitar-demo\/"/);
  });
}

test('only the two requested articles receive the new footer', () => {
  for (const filename of readdirSync(resolve(root, 'src/content/blog'))) {
    if (!filename.endsWith('.md')) continue;
    const slug = filename.slice(0, -3);
    if (!Object.hasOwn(articles, slug)) assert.equal(nextStepFor(slug), null);
  }
  assert.equal(nextStepFor('future-unrelated-article'), null);
});

test('DeCA retains its legal source and existing section headings', () => {
  const source = read('src/content/blog/que-es-deca-transporte.md');
  assert.ok(source.includes('https://www.boe.es/buscar/act.php?id=BOE-A-2026-12784'));
  for (const heading of ['¿Qué significa DeCA?', '¿Cuándo será obligatorio el DeCA?', '¿A quién afecta?', 'Un DeCA no es simplemente un PDF guardado en una carpeta', '¿Cómo se presenta el DeCA en carretera?', '¿Cuánto tiempo debe conservarse?', '¿Qué debería preparar una empresa antes de octubre?', 'Fuentes oficiales']) {
    assert.ok(source.includes(`## ${heading}\n`), `Missing original heading: ${heading}`);
  }
  assert.ok(source.includes('no sustituye el análisis jurídico de un caso concreto'));
});

test('TMS adds one practical selection section without removing existing topics', () => {
  const source = read('src/content/blog/que-es-un-tms-transporte.md');
  const heading = '## Qué debe tener un TMS para una empresa de transporte';
  assert.equal(source.split(heading).length - 1, 1);
  for (const section of ['Qué significa TMS', 'Qué debería gestionar un TMS de transporte', 'TMS frente a Excel', 'Cuándo compensa implantar un programa de gestión de transporte', 'Qué debería buscar una empresa al elegir un TMS', 'TMS para empresas pequeñas y medianas', 'TransGest como TMS de transporte']) {
    assert.ok(source.includes(`## ${section}\n`));
  }
  assert.ok(source.includes('Una prueba útil consiste en llevar a la demo un servicio representativo'));
});

test('canonical, H1 and Article schema remain linked to the existing article metadata', () => {
  assert.ok(layout.includes('const canonical = `/blog/${post.slug}/`;'));
  assert.ok(layout.includes("'@type': 'Article'"));
  assert.ok(layout.includes('datePublished: published'));
  assert.ok(layout.includes('dateModified: modified'));
  assert.ok(layout.includes('(post.data.updatedDate ?? post.data.pubDate).toISOString()'));
  assert.equal((layout.match(/<h1\b/g) || []).length, 1);
  assert.match(layout, /<h1[^>]*>\s*\{post\.data\.title\}\s*<\/h1>/);
});
