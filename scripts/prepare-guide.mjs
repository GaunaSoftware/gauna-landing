import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Limited to the exact approved source. This is NOT a general-purpose PDF parser.
export const SOURCE_PATH = 'assets/guides/deca-2026-v2.1-original.pdf';
export const SOURCE_SHA256 = '74b1e666580a019ab0ce76718226ea84f06b496f99fc738dc4297071368baf62';
export const OUTPUT_SHA256 = 'bf07fbde73bb249739f30b68ea40a1544c3be281fd641c5c6169107dc78854d3';
export const NEW_FILENAME = 'guia-deca-2026-gauna-v2.1.1.pdf';
export const LEGACY_FILENAME = 'guia-deca-2026-gauna-v2.1.pdf';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function repairApprovedGuide(input) {
  assert.equal(hash(input), SOURCE_SHA256, 'Refusing to repair a different source PDF');
  const text = input.toString('latin1');
  const end = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text);
  assert.ok(end, 'Missing traditional PDF cross-reference table');
  const xrefOffset = Number(end[1]);
  const xrefText = text.slice(xrefOffset, text.indexOf('trailer', xrefOffset));
  assert.ok(xrefText.startsWith('xref\n0 173\n'));
  const entries = [...xrefText.matchAll(/^(\d{10}) (\d{5}) ([nf]) $/gm)].map(m => ({ offset: Number(m[1]), generation: m[2], state: m[3] }));
  assert.equal(entries.length, 173);
  assert.equal(entries[0].state, 'f');
  const chunks = [input.subarray(0, entries[1].offset)];
  const outputOffsets = [0];
  let length = chunks[0].length;
  for (let id = 1; id < entries.length; id++) {
    const entry = entries[id];
    assert.equal(entry.state, 'n');
    const finish = id + 1 < entries.length ? entries[id + 1].offset : xrefOffset;
    assert.ok(finish > entry.offset);
    let object = input.subarray(entry.offset, finish);
    assert.ok(object.toString('latin1').startsWith(`${id} 0 obj\n`));
    if (id === 127) {
      const source = object.toString('latin1');
      assert.equal(source.split('/Lang es-ES ').length, 2);
      object = Buffer.from(source.replace('/Lang es-ES ', '/Lang (es-ES) '), 'latin1');
    }
    if ([115, 119, 123].includes(id)) {
      // Preserve every Unicode mapping; PDF bfchar blocks must not exceed 100 entries.
      const raw = object.toString('latin1');
      assert.match(raw, /\/Filter \[ \/FlateDecode \]/);
      const size = Number(/\/Length (\d+)/.exec(raw)?.[1]);
      const start = raw.indexOf('stream\n') + 7;
      assert.ok(start > 7 && size > 0);
      assert.ok(raw.slice(start + size).startsWith('endstream'));
      const cmap = inflateSync(object.subarray(start, start + size)).toString('ascii');
      let changes = 0;
      const normalized = cmap.replace(/(\d+) beginbfchar\n([\s\S]*?)endbfchar/g, (_, count, rows) => {
        const mappings = rows.trim().split('\n');
        assert.equal(mappings.length, Number(count));
        assert.equal(Number(count), 128);
        changes++;
        const blocks = [];
        for (let i = 0; i < mappings.length; i += 100) {
          const group = mappings.slice(i, i + 100);
          blocks.push(`${group.length} beginbfchar\n${group.join('\n')}\nendbfchar`);
        }
        return blocks.join('\n');
      });
      assert.equal(changes, 1);
      const stream = Buffer.from(normalized, 'ascii');
      object = Buffer.concat([Buffer.from(`${id} 0 obj\n<<\n/Length ${stream.length}\n>>\nstream\n`), stream, Buffer.from('\nendstream\nendobj\n')]);
    }
    outputOffsets.push(length);
    chunks.push(object);
    length += object.length;
  }
  const xref = `xref\n0 ${entries.length}\n` + entries.map((entry, id) => `${String(outputOffsets[id]).padStart(10, '0')} ${entry.generation} ${entry.state} \n`).join('');
  const trailer = text.slice(text.indexOf('trailer', xrefOffset)).replace(/(startxref\s+)\d+/, `$1${length}`);
  const output = Buffer.concat([...chunks, Buffer.from(xref + trailer, 'latin1')]);
  assert.ok(output.toString('latin1').includes('/Lang (es-ES)'));
  assert.equal(hash(output), OUTPUT_SHA256, 'Unexpected PDF repair output');
  return output;
}

export async function prepareGuide(root = new URL('../', import.meta.url)) {
  const input = await readFile(new URL(SOURCE_PATH, root));
  const output = repairApprovedGuide(input);
  const folder = new URL('public/guias/', root);
  await mkdir(folder, { recursive: true });
  // New links avoid stale downloads; old links also serve the corrected document.
  await Promise.all([NEW_FILENAME, LEGACY_FILENAME].map(name => writeFile(new URL(name, folder), output)));
  console.log(`Guide assets prepared: ${output.length} bytes, SHA-256 ${hash(output)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prepareGuide(process.argv[2] ? pathToFileURL(`${process.argv[2].replace(/\/$/, '')}/`) : undefined);
}
