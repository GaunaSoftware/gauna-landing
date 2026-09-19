import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

const path = `public${DECA_GUIDE.path}`;
let bytes;
try { bytes = await readFile(path); }
catch { throw new Error(`PUBLICATION BLOCKED: upload the approved PDF to ${path}. Do not merge without it.`); }
assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
assert.equal(bytes.length, DECA_GUIDE.bytes, 'Approved PDF size changed');
assert.equal(createHash('sha256').update(bytes).digest('hex'), DECA_GUIDE.sha256, 'This is not the approved PDF');
// ReportLab's approved document has uncompressed page dictionary objects.
assert.equal((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, DECA_GUIDE.pages);
console.log(`Approved PDF verified: ${DECA_GUIDE.pages} pages, ${bytes.length} bytes, SHA-256 match.`);
