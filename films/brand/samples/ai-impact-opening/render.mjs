// Render the opening sample: node films/brand/samples/ai-impact-opening/render.mjs <stills t...|video> [--lang zh|en] [--fps 30]
// stills: out/still-<lang>-<t>.jpg; video: out/video-<lang>.mp4 (no audio) and out/events-<lang>.json for mix.py.
// NODE_MODULES: a node_modules with three and playwright (default: the repo's). FONTS_DIR: default films/brand/fonts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const brand = path.resolve(here, '../..');
const repo = path.resolve(brand, '../..');
const nm = process.env.NODE_MODULES || path.join(repo, 'node_modules');
const fonts = process.env.FONTS_DIR || path.join(brand, 'fonts');
const { chromium } = createRequire(path.join(nm, '..', 'noop.js'))('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const lang = opt('--lang', 'zh'), fps = Number(opt('--fps', 30));
const [mode, ...times] = args;
const out = path.join(here, 'out'); fs.mkdirSync(out, { recursive: true });

const MAP = [['/three/', path.join(nm, 'three')], ['/fonts/', fonts], ['/brand/', path.join(repo, 'public/assets/brand/kit')],
  ['/frames/', path.join(brand, 'frames/src')], ['/sample/', here]];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const [prefix, dir] of MAP) {
    if (!u.startsWith(prefix)) continue;
    const f = path.join(dir, u.slice(prefix.length));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res); return;
    }
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
page.on('pageerror', e => { console.error('[pageerror]', e.message); process.exit(1); });
page.on('response', r => { if (r.status() >= 400) console.log('[404]', r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/sample/index.html?lang=${lang}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });

if (mode === 'stills') {
  for (const t of times) {
    await page.evaluate(x => window.render(x), Number(t));
    const f = path.join(out, `still-${lang}-${t}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 90 }); console.log(f);
  }
} else if (mode === 'video') {
  const { DUR, EV, GRID } = await page.evaluate(() => ({ DUR: window.DUR, EV: window.EV, GRID: window.GRID }));
  fs.writeFileSync(path.join(out, `events-${lang}.json`), JSON.stringify({ dur: DUR, grid: GRID, events: EV }, null, 1));
  const file = path.join(out, `video-${lang}.mp4`);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(DUR * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(x => window.render(x), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(file);
} else { console.error('usage: render.mjs <stills t...|video> [--lang zh|en]'); process.exitCode = 2; }
await browser.close(); server.close();
