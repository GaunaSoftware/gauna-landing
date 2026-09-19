import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';
import { prepareGuide } from './prepare-guide.mjs';

await prepareGuide();
for (const path of [DECA_GUIDE.path, DECA_GUIDE.legacyPath]) {
  const bytes = await readFile(`public${path}`);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(bytes.length, DECA_GUIDE.bytes, 'Corrected PDF size changed');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), DECA_GUIDE.sha256, 'Unexpected corrected PDF');
  const text = bytes.toString('latin1');
  assert.equal((text.match(/\/Type\s*\/Page\b/g) || []).length, DECA_GUIDE.pages);
  assert.match(text, /\/Lang \(es-ES\)/);
  assert.doesNotMatch(text, /\/Lang es-ES/);
  console.log(`Verified ${path}: ${DECA_GUIDE.pages} pages, ${bytes.length} bytes, language string and hash correct.`);
}
