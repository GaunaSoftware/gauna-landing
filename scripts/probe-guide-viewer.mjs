import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { DECA_GUIDE } from '../src/config/deca-guide.mjs';

await mkdir('test-output/pdf-viewer', { recursive: true });
const expected = await readFile(`public${DECA_GUIDE.path}`);
const url = `https://gauna.es${DECA_GUIDE.path}`;
const report = { checks: [], browser: [] };
let liveHeaders = {};
for (const [name, headers] of [
  ['normal', {}],
  ['identity', { 'Accept-Encoding': 'identity' }],
  ['range-first', { 'Accept-Encoding': 'identity', Range: 'bytes=0-1023' }],
  ['range-last', { 'Accept-Encoding': 'identity', Range: 'bytes=-2048' }],
  ['iphone', { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' }],
]) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const item = { name, status: response.status, url: response.url, headers: Object.fromEntries(response.headers), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), prefix: bytes.subarray(0, 8).toString('latin1'), matchesApproved: bytes.equals(expected) };
    report.checks.push(item);
    if (name === 'normal') { liveHeaders = item.headers; await writeFile('test-output/pdf-viewer/public.pdf', bytes); }
  } catch (error) { report.checks.push({ name, error: error.message }); }
}
const originalPolicy = JSON.parse(await readFile('vercel.json', 'utf8')).headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy')?.value;
const server = createServer((request, response) => {
  const name = request.url.split('?')[0];
  if (name === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const headers = { 'Content-Type': 'application/pdf', 'Content-Length': expected.length, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  if (name === '/original.pdf') headers['Content-Security-Policy'] = liveHeaders['content-security-policy'] || originalPolicy;
  if (name === '/pdf-only.pdf') headers['Content-Security-Policy'] = "frame-ancestors 'self'; base-uri 'none'; form-action 'none'";
  response.writeHead(200, headers); response.end(expected);
});
await new Promise(resolve => server.listen(4333, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: false, args: ['--disable-dev-shm-usage'] });
try {
  for (const [name, target] of [['live', url], ['original', 'http://127.0.0.1:4333/original.pdf'], ['pdf-only', 'http://127.0.0.1:4333/pdf-only.pdf'], ['no-csp', 'http://127.0.0.1:4333/no-csp.pdf']]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    const page = await context.newPage();
    const item = { name, console: [], failures: [] };
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) item.console.push(message.text()); });
    page.on('requestfailed', request => item.failures.push({ url: request.url(), error: request.failure()?.errorText }));
    try { await page.goto(target, { waitUntil: 'load', timeout: 25000 }); } catch (error) { item.navigationError = error.message; }
    await page.waitForTimeout(5000);
    item.frames = page.frames().map(frame => frame.url());
    item.body = (await page.locator('body').innerText().catch(() => '')).slice(0, 1000);
    await page.screenshot({ path: `test-output/pdf-viewer/${name}.png` });
    report.browser.push(item); await context.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
await writeFile('test-output/pdf-viewer/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
