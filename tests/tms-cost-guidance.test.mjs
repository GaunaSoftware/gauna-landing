// Source-level checks: these do not prove rankings, indexation or lead conversion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const source = read('src/pages/transgest/precios.astro');
const guidePath = 'src/content/blog/cuanto-cuesta-software-transporte.md';
const guideHref = '/blog/cuanto-cuesta-software-transporte/';

function costBlock() {
  const matches = [...source.matchAll(/<div\b[^>]*\bid="coste-transgest"[^>]*>([\s\S]*?)<\/div>/g)];
  assert.equal(matches.length, 1, 'One visible cost explanation, not repeated sections');
  return matches[0][0];
}

test('plans link contextually to the existing cost guide exactly once', () => {
  assert.ok(existsSync(new URL(guidePath, root)), 'The link must resolve to an existing article');
  const guide = read(guidePath);
  assert.doesNotMatch(guide, /^draft:\s*true\s*$/m);
  const links = [...source.matchAll(/<a\b[^>]*\bhref="\/blog\/cuanto-cuesta-software-transporte\/"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length, 1, 'No duplicate contextual cost-guide links');
  assert.equal(links[0][1].trim(), 'cuánto cuesta un software de transporte');
  assert.ok(costBlock().includes(links[0][0]), 'The link belongs in the cost explanation');
  assert.ok(guide.includes('](/transgest/precios/)'), 'The guide still leads back to the plan comparison');
  assert.ok(guide.includes('](/solicitar-demo/)'), 'The guide still provides the existing demo route');
});

test('cost guidance shows the approved public tariffs and implementation conditions', () => {
  const block = costBlock();
  assert.match(block, /<h2\b[^>]*>¿Cómo se calcula el precio de TransGest\?<\/h2>/);
  assert.match(block, /Las tarifas de suscripción están indicadas en cada versión/);
  assert.match(block, /No se calculan por número de usuarios ni de vehículos/);
  for (const term of ['implantación', 'formación', 'soporte', 'integraciones', 'consumos variables', 'desarrollos específicos']) {
    assert.ok(block.includes(term), `Missing cost consideration: ${term}`);
  }
  assert.doesNotMatch(block, /\bhidden\b|sr-only|aria-hidden="true"|<script\b|nofollow/);
  assert.match(source, /commercePlans/);
  assert.match(block,/1\.500 € \+ IVA/);
  assert.match(block,/Precios \+ IVA/);
  assert.doesNotMatch(block, /todo incluido|ahorro garantizado|gratis|sin costes adicionales/i);
});

test('page identity and existing conversion destinations remain stable', () => {
  assert.ok(source.includes("const pageTitle = 'Planes de TransGest | TMS para empresas de transporte';"));
  assert.ok(source.includes('Compara TransGest Go, Pro y Pro Intelligence según el nivel de gestión que necesita tu empresa de transporte.'));
  assert.ok(source.includes('canonical="/transgest/precios/"'));
  assert.equal((source.match(/<h1\b/g) || []).length, 1);
  assert.match(source, /<h1\b[^>]*>Una versión para cada nivel de operativa\.<\/h1>/);
  assert.ok(source.includes('<PlanComparison plans={plans} />'));
  assert.match(source, /href=\{'\/transgest\/contratar\/\?plan='/);
  assert.match(source, /<a\b[^>]*href="\/solicitar-demo\/"[^>]*>Solicitar una demo<\/a>/);
  assert.ok(source.includes("plan.highlight ? 'border-white/10 text-white' : 'border-slate-100 text-slate-900'"));
  assert.equal(guideHref, '/blog/cuanto-cuesta-software-transporte/');
});
