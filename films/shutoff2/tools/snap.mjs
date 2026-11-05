// Render stills for review.
//   node tools/snap.mjs [--scale 1] [--out out/snaps] [--sheet name] spec...
// spec: f:120 (frame) | t:35.2 (seconds) | s:rising (middle of a shot) | s:rising@0.8 (fraction)
//       q:<query> e.g. "q:test=1&cam=-10,2,-14&at=0,2,0&t=50"   (free camera)
// Each spec may end with =name to set the output file name.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, serve, launch, openFilm } from './env.mjs';

const args = process.argv.slice(2);
let scale = '2', out = 'out/snaps', sheet = null, q = 0.92;
const specs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--scale') scale = args[++i];
  else if (a === '--out') out = args[++i];
  else if (a === '--sheet') sheet = args[++i];
  else if (a === '--q') q = parseFloat(args[++i]);
  else specs.push(a);
}
const outDir = path.resolve(ROOT, out);
fs.mkdirSync(outDir, { recursive: true });
const srv = await serve();
const browser = await launch();
let shared = null;
const files = [];
const t0 = Date.now();
try {
  for (let si = 0; si < specs.length; si++) {
    let spec = specs[si], name = null;
    const eq = spec.lastIndexOf('=');
    if (eq > 0 && !spec.startsWith('q:')) { name = spec.slice(eq + 1); spec = spec.slice(0, eq); }
    if (spec.startsWith('q:') && spec.includes('=name:')) { [spec, name] = spec.split('=name:'); }
    let page, errors, frame;
    if (spec.startsWith('q:')) {
      ({ page, errors } = await openFilm(browser, srv.url, `scale=${scale}&${spec.slice(2)}`));
      frame = await page.evaluate(() => { const p = new URLSearchParams(location.search); return p.get('frame') ? +p.get('frame') : Math.round(parseFloat(p.get('t') ?? '0') * window.FILM.FPS); });
      name = name ?? `q${si}`;
    } else {
      if (!shared) shared = await openFilm(browser, srv.url, `scale=${scale}`);
      ({ page, errors } = shared);
      if (spec.startsWith('f:')) frame = parseInt(spec.slice(2), 10);
      else if (spec.startsWith('t:')) frame = await page.evaluate((t) => Math.round(t * window.FILM.FPS), parseFloat(spec.slice(2)));
      else if (spec.startsWith('s:')) {
        const [nm, fr] = spec.slice(2).split('@');
        frame = await page.evaluate((nm, fr) => { const s = window.FILM.SHOTS.find((x) => x.name === nm || x.id === nm); return Math.round((s.start + (s.end - s.start) * fr) * window.FILM.FPS); }, nm, fr ? parseFloat(fr) : 0.5);
      }
      name = name ?? `f${String(frame).padStart(4, '0')}`;
    }
    const data = await page.evaluate((n, q) => { window.FILM.renderFrame(n); return window.FILM.capture(q); }, frame, q);
    const file = path.join(outDir, name + '.jpg');
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    files.push(file);
    console.log('wrote', path.relative(ROOT, file), `(frame ${frame})`);
    if (errors.length) { console.log(errors.slice(0, 20).join('\n')); errors.length = 0; }
    if (spec.startsWith('q:')) await page.close();
  }
} finally {
  await browser.close();
  srv.close();
}
if (sheet && files.length) {
  const cols = Math.min(5, files.length);
  const inputs = files.flatMap((f) => ['-i', f]);
  const n = files.length;
  const filter = files.map((_, i) => `[${i}:v]scale=360:-1[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=` +
    files.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|') + ':fill=black';
  const dst = path.join(outDir, sheet + '.jpg');
  if (n === 1) fs.copyFileSync(files[0], dst);
  else execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '3', dst]);
  console.log('sheet', path.relative(ROOT, dst));
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
