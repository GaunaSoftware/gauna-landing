// Source-level copy checks; these do not demonstrate rankings or conversions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(join(root, file), 'utf8');
const headline = 'La gestión profesional del transporte, con un modelo de precio diferente.';

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (entry.isFile() && ['.astro', '.md', '.mdx', '.mjs', '.js', '.ts', '.json'].includes(extname(path))) yield path;
  }
}

test('TransGest has one professional headline and retains its commercial model', () => {
  const page = read('src/pages/transgest/index.astro');
  const headings = [...page.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(headings.length, 1);
  assert.equal(headings[0][1].trim(), headline);
  assert.ok(page.includes('canonical="/transgest/"'));
  assert.ok(page.includes('Sin precio por usuario ni por número de vehículos.'));
  assert.ok(page.includes('href="/solicitar-demo/"'));
});

test('cost guide uses the same pricing-model wording without changing its title', () => {
  const guide = read('src/content/blog/cuanto-cuesta-software-transporte.md');
  assert.match(guide, /^## La gestión profesional del transporte, con un modelo de precio diferente$/m);
  assert.ok(guide.includes('title: "Cuánto cuesta un software de transporte y qué comparar antes de contratarlo"'));
  assert.ok(guide.includes('[versiones de TransGest](/transgest/precios/)'));
});

test('the rejected price slogan is absent from authored site sources', () => {
  for (const file of sourceFiles(join(root, 'src'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\bdineral\b/i, file);
  }
});
