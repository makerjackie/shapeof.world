// Render style frames: node films/brand/frames/src/shoot.mjs [page ...]
// Serves this folder, three.js, the fonts and the brand kit on 127.0.0.1, opens each page in headless Chrome
// (Metal on macOS), waits for window.READY and writes films/brand/frames/<page>.jpg.
// NODE_MODULES: a node_modules with three and playwright (default: the repo's). FONTS_DIR: Noto Sans SC, Noto Serif SC, Inter.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const nm = process.env.NODE_MODULES || path.join(repo, 'node_modules');
const fonts = process.env.FONTS_DIR || path.join(here, '../../fonts');
const { chromium } = createRequire(path.join(nm, '..', 'noop.js'))('playwright');

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['a-tiltshift', 'b-lowpoly', 'c-physical'];
const MAP = [['/three/', path.join(nm, 'three')], ['/fonts/', fonts], ['/brand/', path.join(repo, 'public/assets/brand/kit')], ['/', here]];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const [prefix, dir] of MAP) {
    if (!u.startsWith(prefix)) continue;
    const f = path.join(dir, u.slice(prefix.length));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
      return;
    }
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb'],
});
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${name}] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', e => { console.error(`[${name}] ${e.message}`); process.exitCode = 1; });
  page.on('response', r => { if (r.status() >= 400) console.log(`[${name}] ${r.status()} ${r.url()}`); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/${name}.html`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  const out = path.join(here, '..', `${name}.jpg`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
  console.log(out, `${Date.now() - t0} ms`);
  await page.close();
}
await browser.close();
server.close();
