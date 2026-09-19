import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { repairApprovedGuide, SOURCE_PATH, NEW_FILENAME, OUTPUT_SHA256 } from '../scripts/prepare-guide.mjs';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';
import { guideAccess } from './guide-access-fixture.mjs';
import { buildDeCAMails } from '../src/lib/deca-email.mjs';

const source = await readFile(new URL(`../${SOURCE_PATH}`, import.meta.url));
const output = repairApprovedGuide(source);

test('repairs the invalid Catalog language token and preserves all 172 object IDs', () => {
  assert.match(source.toString('latin1'), /\/Lang es-ES /);
  assert.match(output.toString('latin1'), /\/Lang \(es-ES\)/);
  assert.doesNotMatch(output.toString('latin1'), /\/Lang es-ES /);
  const text = output.toString('latin1');
  const start = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text)[1]);
  const index = text.slice(start, text.indexOf('trailer', start));
  assert.ok(index.startsWith('xref\n0 173\n'));
  const rows = [...index.matchAll(/^(\d{10}) (\d{5}) ([nf]) $/gm)];
  assert.equal(rows.length, 173);
  for (let id = 1; id < rows.length; id++) assert.ok(text.slice(Number(rows[id][1])).startsWith(`${id} 0 obj\n`));
  assert.equal((text.match(/\/Type\s*\/Page\b/g) || []).length, 28);
});

test('same editorial edition, new technical file revision and exact output identity', () => {
  assert.equal(output.length, 977515);
  assert.equal(createHash('sha256').update(output).digest('hex'), OUTPUT_SHA256);
  assert.equal(DECA_GUIDE.sha256, OUTPUT_SHA256);
  assert.equal(DECA_GUIDE.bytes, output.length);
  assert.equal(DECA_GUIDE.filename, NEW_FILENAME);
  assert.equal(DECA_GUIDE.path, `/guias/${NEW_FILENAME}`);
  assert.equal(DECA_GUIDE.version, '2.1');
  assert.equal(DECA_GUIDE.fileRevision, '2.1.1');
});

test('unexpected source bytes fail closed instead of silently rewriting another guide', () => {
  const other = Buffer.from(source); other[200] ^= 1;
  assert.throws(() => repairApprovedGuide(other), /different source/);
});

test('new emails, attachment and links target only the corrected technical revision', () => {
  const { visitor } = buildDeCAMails({ name: 'Prueba', email: 'test@example.com', requestId: 'test', contactRequested: false }, 'guide', { from: 'test@example.com', to: 'hola@gauna.es', guideAccess });
  assert.ok(visitor.html.includes(DECA_GUIDE.path));
  assert.ok(visitor.text.includes(DECA_GUIDE.path));
  assert.equal(visitor.attachments.find(item => item.content_type === 'application/pdf').path, `https://gauna.es${guideAccess.path}`);
  assert.doesNotMatch(JSON.stringify(visitor), /guia-deca-2026-gauna-v2\.1\.pdf/);
});
