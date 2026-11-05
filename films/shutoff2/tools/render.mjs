// Render Sunshower (or part of it) to MP4, resumably.
//
//   node tools/render.mjs                                    whole film at scale 2 -> out/sunshower.mp4
//   node tools/render.mjs --plan                             show the segment plan (what a re-run would redo)
//   node tools/render.mjs --from 0 --to 48 --scale 1         a quick range
//   node tools/render.mjs --ranges 0-48,600-648 --scale 1 --seg 24 --name test
//
// The film length is never assumed: FRAMES / FPS / canvas size are read from window.FILM.
// Frames are rendered by the film page (window.FILM.renderFrame(n) + FILM.capture(q) -> JPEG),
// piped into ffmpeg (mjpeg -> libx264, -tune animation) one segment at a time. Segments sit on a
// grid of --seg frames and are written to out/render/seg_XXXXX.mp4 (XXXXX = first frame) with a
// .json sidecar; a crash or Ctrl+C loses at most the segment in flight, and the next run of the
// same command skips every complete segment. Then the segments are joined (concat demuxer, no
// re-encode) into out/<name>_video.mp4 and, when out/soundtrack.wav exists, muxed with it into
// out/<name>.mp4 (AAC 256k / 48 kHz; the soundtrack is cut to the rendered ranges, padded or
// trimmed to the exact picture length). Without a soundtrack out/<name>.mp4 is the picture alone.
//
// Each segment records a hash of src/ + index.html. Segments rendered from different sources are
// re-rendered by default so the film never mixes old and new drawings; --keep-stale keeps them.
// A console error or uncaught exception while the film page loads (e.g. a department module that
// failed to import) stops the render before any frame is drawn: a film silently missing its
// kingfisher is worse than no film. --allow-errors renders anyway. Errors during frames are logged.
//
// Options
//   --from N / --to N    frame range [from, to)                       (default 0 .. FILM.FRAMES)
//   --ranges a-b,c-d     several ranges, joined in this order          (instead of --from/--to)
//   --scale S            internal supersampling of the film page       (default 2)
//   --crf N              x264 constant quality                         (default 16)
//   --preset P           x264 preset                                   (default slow)
//   --q Q                JPEG quality of the captured frames, 0..1     (default 0.95)
//   --seg N              frames per segment                            (default 144 = 6 s)
//   --pages N            pages in one browser, each rendering its own segment   (default 1;
//                        2 measured no faster here: JPEG capture + x264 are the bottleneck)
//   --force              re-render segments in range even if complete
//   --keep-stale         keep complete segments made from older src/ files (default: re-render)
//   --name NAME          out/NAME_video.mp4, out/NAME.mp4, out/NAME.json (default sunshower)
//   --audio FILE         soundtrack to mux                             (default out/soundtrack.wav)
//   --query QS           extra query for the film page, e.g. "fx=0"
//   --segdir DIR         where segments live                           (default out/render)
//   --allow-errors       render even if the film page logs errors while loading
//   --no-concat          render segments only
//   --plan               print the segment plan and exit
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { ROOT, serve, launch, openFilm } from './env.mjs';

// ------------------------------------------------------------------ options
const argv = process.argv.slice(2);
const opt = { scale: 2, crf: 16, preset: 'slow', q: 0.95, seg: 150, pages: 1, name: 'shutoff2', query: '',
  force: false, keepStale: false, allowErrors: false, concat: true, plan: false, from: null, to: null, ranges: null, audio: null, segdir: 'out/render' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i], v = () => argv[++i];
  switch (a) {
    case '--from': opt.from = parseInt(v(), 10); break;
    case '--to': opt.to = parseInt(v(), 10); break;
    case '--ranges': opt.ranges = v(); break;
    case '--scale': opt.scale = parseFloat(v()); break;
    case '--crf': opt.crf = parseFloat(v()); break;
    case '--preset': opt.preset = v(); break;
    case '--q': opt.q = parseFloat(v()); break;
    case '--seg': opt.seg = parseInt(v(), 10); break;
    case '--pages': opt.pages = Math.max(1, parseInt(v(), 10)); break;
    case '--name': opt.name = v(); break;
    case '--audio': opt.audio = v(); break;
    case '--query': opt.query = v(); break;
    case '--segdir': opt.segdir = v(); break;
    case '--force': opt.force = true; break;
    case '--keep-stale': opt.keepStale = true; break;
    case '--allow-errors': opt.allowErrors = true; break;
    case '--redo-stale': opt.keepStale = false; break;           // the default now; kept for old command lines
    case '--no-concat': opt.concat = false; break;
    case '--plan': opt.plan = true; break;
    case '-h': case '--help':
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^\/\/ ?/gm, '')); process.exit(0);
    default: console.error(`unknown option ${a} (see --help)`); process.exit(2);
  }
}
if (!(opt.seg > 0) || !(opt.scale > 0) || !(opt.q > 0 && opt.q <= 1)) { console.error('bad --seg/--scale/--q'); process.exit(2); }

const OUT = path.join(ROOT, 'out');
const SEGDIR = path.resolve(ROOT, opt.segdir);
fs.mkdirSync(SEGDIR, { recursive: true });
const LOG = path.join(SEGDIR, 'render.log');
const logf = fs.openSync(LOG, 'a');
const stamp = () => new Date().toISOString().slice(11, 19);
function log(...m) { const s = m.join(' '); console.log(s); fs.writeSync(logf, `${stamp()} ${s}\n`); }
function logOnly(s) { fs.writeSync(logf, `${stamp()} ${s}\n`); }
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`) + `${String(s % 60).padStart(2, '0')}s`; };
const pad5 = (n) => String(n).padStart(5, '0');

// Hash of everything that affects the picture, so stale segments can be spotted.
function sourceHash() {
  const h = crypto.createHash('sha1');
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else if (/\.(m?js|glsl|html|json|png|jpg)$/.test(e.name)) { h.update(path.relative(ROOT, f)); h.update(fs.readFileSync(f)); }
  } };
  walk(path.join(ROOT, 'src'));
  h.update(fs.readFileSync(path.join(ROOT, 'index.html')));
  return h.digest('hex').slice(0, 12);
}

// ------------------------------------------------------------------ crash cleanup
// A hard kill of a previous run can leave its headless Chrome behind (holding the GPU).
// We record our browser's pid + profile dir and, on the next start, kill it only if that pid
// is still a chrome.exe running with exactly that profile.
const PIDFILE = path.join(SEGDIR, 'chrome.pid.json');
function reapOrphan() {
  if (!fs.existsSync(PIDFILE)) return;
  try {
    const { pid, profile } = JSON.parse(fs.readFileSync(PIDFILE, 'utf8'));
    if (pid && profile && process.platform === 'win32') {
      const cmd = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${+pid}").CommandLine`], { encoding: 'utf8' }).trim();
      if (cmd.includes('chrome') && cmd.includes(profile)) {
        execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        log(`reaped orphaned Chrome ${pid} from a previous run`);
      }
    } else if (pid && profile) {
      try { process.kill(pid, 0); const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'); if (cmd.includes(profile)) process.kill(pid, 'SIGKILL'); } catch {}
    }
  } catch {}
  fs.rmSync(PIDFILE, { force: true });
}

// ------------------------------------------------------------------ browser + pages
let srv = null, browser = null, FRAMES = 0, FPS = 0, W = 0, H = 0;      // all read from window.FILM
const errorCounts = new Map();
function noteErrors(errors, where) {
  for (const e of errors.splice(0)) {
    if (/Failed to load resource: .*404/.test(e) && !errors.__named) continue;   // the [http] line names it
    const key = e.replace(/\d+(\.\d+)?/g, '#').slice(0, 300);
    const n = (errorCounts.get(key) || 0) + 1;
    errorCounts.set(key, n);
    if (n <= 2) log(`  page ${where}: ${e.slice(0, 600)}`); else logOnly(`page ${where}: ${e.slice(0, 600)}`);
    if (n === 3) log('  (repeats of this message go to the log only)');
  }
}

async function startBrowser() {
  if (browser) { try { await browser.close(); } catch {} }
  browser = await launch();
  const proc = browser.process();
  const prof = (proc?.spawnargs || []).find((a) => a.startsWith('--user-data-dir='));
  if (proc?.pid && prof) fs.writeFileSync(PIDFILE, JSON.stringify({ pid: proc.pid, profile: prof.slice(16) }));
  browser.on('disconnected', () => { browser.__dead = true; });
}

async function openPage(id) {
  if (!browser || browser.__dead || !browser.connected) await startBrowser();
  const t0 = Date.now();
  const srcHash = sourceHash();                 // what this page actually loads (src/ may change during a long run)
  const film = await openFilm(browser, srv.url, `scale=${opt.scale}${opt.query ? '&' + opt.query : ''}`);
  film.id = id; film.srcHash = srcHash;
  film.page.on('error', (e) => film.errors.push(`[crash] ${e.message}`));
  // name the URL behind "Failed to load resource" console errors (favicon requests are noise)
  film.page.on('response', (r) => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) film.errors.push(`[http ${r.status()}] ${r.url()}`); });
  const info = await film.page.evaluate(() => {
    if (!window.FILM) return null;
    const c = document.getElementById('c');
    window.__ctxLost = false;
    c.addEventListener('webglcontextlost', () => { window.__ctxLost = true; });
    return { FRAMES: window.FILM.FRAMES, FPS: window.FILM.FPS, W: c.width, H: c.height };
  });
  if (!info) { noteErrors(film.errors, id); try { await film.page.close(); } catch {} throw new Error('film page did not become ready (window.FILM missing)'); }
  if (!(info.FRAMES > 0 && info.FPS > 0 && info.W > 0 && info.H > 0)) throw new Error(`film page reports a bad format: ${JSON.stringify(info)}`);
  if (FRAMES && (info.FRAMES !== FRAMES || info.FPS !== FPS || info.W !== W || info.H !== H)) throw new Error(`page ${id} disagrees about the film format: ${JSON.stringify(info)} vs ${FRAMES} frames @ ${FPS} fps ${W}x${H}`);
  // anything but the workbench's missing favicon (a bare 404 line) means a department failed to load
  const fatal = film.errors.filter((e) => /^\[(error|pageerror|crash)\]/.test(e) && !/Failed to load resource: .*404/.test(e));
  if (fatal.length && !opt.allowErrors) {
    noteErrors(film.errors, id); try { await film.page.close(); } catch {}
    const err = new Error(`the film page logged ${fatal.length} error(s) while loading - fix them, or pass --allow-errors to render anyway`);
    err.fatal = true; throw err;
  }
  ({ FRAMES, FPS, W, H } = info);
  logOnly(`page ${id} ready in ${((Date.now() - t0) / 1000).toFixed(1)}s (src ${srcHash})`);
  noteErrors(film.errors, id);
  return film;
}

// ------------------------------------------------------------------ segments
function planSegments() {
  let ranges;
  if (opt.ranges) ranges = opt.ranges.split(',').map((r) => r.split('-').map((x) => parseInt(x, 10)));
  else ranges = [[opt.from ?? 0, opt.to ?? FRAMES]];
  for (const r of ranges) {
    r[0] = Math.max(0, r[0]); r[1] = Math.min(FRAMES, r[1]);
    if (!(r[1] > r[0])) { console.error(`empty range ${r}`); process.exit(2); }
  }
  const segs = [];
  for (const [a, b] of ranges) {
    for (let k = Math.floor(a / opt.seg) * opt.seg; k < b; k += opt.seg) {
      const from = Math.max(a, k), to = Math.min(b, k + opt.seg);
      segs.push({ from, to, file: path.join(SEGDIR, `seg_${pad5(from)}.mp4`), meta: path.join(SEGDIR, `seg_${pad5(from)}.json`) });
    }
  }
  return { ranges, segs };
}

const encodeKey = () => ({ scale: opt.scale, crf: opt.crf, preset: opt.preset, q: opt.q, query: opt.query, W, H, FPS, enc: 2 });
function segStatus(seg, srcHash) {
  if (!fs.existsSync(seg.file) || !fs.existsSync(seg.meta)) return 'todo';
  let m; try { m = JSON.parse(fs.readFileSync(seg.meta, 'utf8')); } catch { return 'todo'; }
  const k = encodeKey();
  if (m.from !== seg.from || m.to !== seg.to || Object.keys(k).some((x) => m.key?.[x] !== k[x])) return 'todo';
  if (fs.statSync(seg.file).size !== m.bytes) return 'todo';
  if (m.srcHash !== srcHash) return 'stale';
  return 'done';
}

function ffprobeFrames(file) {
  const s = execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseInt(s.trim(), 10);
}

// JPEG from Chrome is full-range BT.601 YCbCr. Go through RGB so the conversion to limited-range
// BT.709 (what the file is tagged as, and what browsers assume for HD) uses the right matrices.
function x264Args(out) {
  return ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(FPS), '-i', '-',
    '-vf', 'format=gbrp,scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
    '-c:v', 'libx264', '-preset', opt.preset, '-tune', 'animation', '-crf', String(opt.crf),
    '-g', String(FPS * 2), '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-movflags', '+faststart', '-f', 'mp4', out];
}

const children = new Set();
const prog = { total: 0, done: 0, t0: 0, marks: [], lastPrint: 0, perPage: new Map() };
function tick(film, seg, n, ms) {
  prog.done++;
  const now = Date.now();
  prog.marks.push(now); if (prog.marks.length > 73) prog.marks.shift();
  const pp = prog.perPage.get(film.id) || { n: 0, ms: 0 }; pp.n++; pp.ms += ms; prog.perPage.set(film.id, pp);
  if (now - prog.lastPrint < 8000 && prog.done !== prog.total && prog.done !== 1) return;
  prog.lastPrint = now;
  const mk = prog.marks, spf = mk.length > 1 ? (mk[mk.length - 1] - mk[0]) / (mk.length - 1) / 1000 : ms / 1000;
  const left = prog.total - prog.done;
  log(`[${(100 * prog.done / prog.total).toFixed(1).padStart(5)}%] ${prog.done}/${prog.total}  frame ${n} (seg ${pad5(seg.from)}, page ${film.id})  ` +
    `${spf.toFixed(2)} s/f  elapsed ${fmtT((now - prog.t0) / 1000)}  ETA ${fmtT(left * spf)}`);
}

async function renderSegment(film, seg, srcHash) {
  const part = seg.file.replace(/\.mp4$/, '.part.mp4');
  fs.rmSync(part, { force: true });
  const ff = spawn('ffmpeg', x264Args(part), { stdio: ['pipe', 'ignore', 'pipe'] });
  children.add(ff);
  let fferr = '', ffExit = null;
  ff.stderr.on('data', (d) => { fferr += d; });
  const exited = new Promise((ok) => ff.on('close', (code) => { ffExit = code; children.delete(ff); ok(code); }));
  ff.stdin.on('error', () => {});
  const t0 = Date.now();
  let rendered = 0;
  try {
    for (let n = seg.from; n < seg.to; n++) {
      const tf = Date.now();
      const data = await film.page.evaluate((n, q) => {
        if (window.__ctxLost) return 'lost';
        window.FILM.renderFrame(n);
        return window.FILM.capture(q);
      }, n, opt.q);
      noteErrors(film.errors, film.id);
      if (data === 'lost') throw new Error('WebGL context lost');
      if (typeof data !== 'string' || !data.startsWith('data:image/jpeg') || data.length < 2000) throw new Error(`bad capture for frame ${n}`);
      if (ffExit !== null) throw new Error(`ffmpeg exited early (${ffExit}): ${fferr.trim()}`);
      const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
      rendered++;
      tick(film, seg, n, Date.now() - tf);
    }
    ff.stdin.end();
    const code = await exited;
    if (code !== 0) throw new Error(`ffmpeg failed (${code}): ${fferr.trim()}`);
    const got = ffprobeFrames(part);
    if (got !== seg.to - seg.from) throw new Error(`segment has ${got} frames, expected ${seg.to - seg.from}`);
    fs.renameSync(part, seg.file);
    const sec = (Date.now() - t0) / 1000;
    fs.writeFileSync(seg.meta, JSON.stringify({ from: seg.from, to: seg.to, key: encodeKey(), srcHash: film.srcHash ?? srcHash, bytes: fs.statSync(seg.file).size,
      secPerFrame: +(sec / (seg.to - seg.from)).toFixed(3), renderedAt: new Date().toISOString() }, null, 1));
    log(`  seg ${pad5(seg.from)} [${seg.from}, ${seg.to}) done on page ${film.id}: ${(sec / (seg.to - seg.from)).toFixed(2)} s/f, ${(fs.statSync(seg.file).size / 1e6).toFixed(1)} MB`);
  } catch (e) {
    prog.done -= rendered;                       // these frames will be rendered again
    try { ff.stdin.destroy(); ff.kill('SIGKILL'); } catch {}
    await exited.catch(() => {});
    fs.rmSync(part, { force: true });
    throw e;
  }
}

async function worker(id, queue, srcHash, failures, film = null) {
  while (queue.length) {
    const seg = queue.shift();
    for (let attempt = 1; ; attempt++) {
      try {
        if (!film) film = await openPage(id);
        await renderSegment(film, seg, srcHash);
        break;
      } catch (e) {
        log(`  ! page ${id}, seg ${pad5(seg.from)}, attempt ${attempt}: ${String(e.message || e).slice(0, 400)}`);
        if (e.fatal) { failures.push(seg, ...queue.splice(0)); break; }
        if (film) { noteErrors(film.errors, id); try { await film.page.close(); } catch {} film = null; }
        if (attempt >= 3) { failures.push(seg); break; }
        if (!browser?.connected) {
          log('  restarting the browser'); try { await startBrowser(); } catch (e2) { log('  browser restart failed:', e2.message); }
        }
      }
    }
  }
  if (film) try { await film.page.close(); } catch {}
}

// ------------------------------------------------------------------ join + mux
function concatSegments(segs, ranges) {
  const list = path.join(SEGDIR, `concat_${opt.name}.txt`);
  fs.writeFileSync(list, segs.map((s) => `file '${path.basename(s.file)}'`).join('\n') + '\n');
  const video = path.join(OUT, `${opt.name}_video.mp4`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', video], { stdio: 'inherit' });
  const frames = ffprobeFrames(video), want = segs.reduce((a, s) => a + s.to - s.from, 0);
  if (frames !== want) throw new Error(`joined video has ${frames} frames, expected ${want}`);
  log(`joined ${segs.length} segment(s) -> ${path.relative(ROOT, video)} (${frames} frames, ${(fs.statSync(video).size / 1e6).toFixed(1)} MB)`);

  const final = path.join(OUT, `${opt.name}.mp4`);
  const audio = opt.audio ? path.resolve(ROOT, opt.audio) : path.join(OUT, 'soundtrack.wav');
  let withAudio = false;
  if (fs.existsSync(audio)) {
    let adur = NaN;
    try { adur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio], { encoding: 'utf8' })); } catch {}
    const film = FRAMES / FPS;
    if (!(Math.abs(adur - film) < 0.25)) log(`  note: ${path.relative(ROOT, audio)} is ${adur.toFixed(2)} s, the film is ${film.toFixed(2)} s - padded with silence / trimmed to fit`);
    // cut the soundtrack to the same film ranges as the picture so partial renders stay in sync,
    // then pad with silence / trim so the audio is exactly as long as the picture (no -shortest:
    // a short soundtrack must never cut frames off the end of the film)
    const vdur = (frames / FPS).toFixed(6);
    const parts = ranges.map(([a, b], i) => `[1:a]atrim=start=${(a / FPS).toFixed(6)}:end=${(b / FPS).toFixed(6)},asetpts=PTS-STARTPTS[a${i}]`);
    const fc = parts.join(';') + ';' + ranges.map((_, i) => `[a${i}]`).join('') +
      `concat=n=${ranges.length}:v=0:a=1,aresample=48000,apad=whole_dur=${vdur},atrim=end=${vdur},asetpts=PTS-STARTPTS[aout]`;
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', audio, '-filter_complex', fc,
      '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', final], { stdio: 'inherit' });
    const vf = ffprobeFrames(final);
    if (vf !== frames) throw new Error(`muxed film has ${vf} frames, expected ${frames}`);
    withAudio = true;
    log(`muxed ${path.relative(ROOT, audio)} -> ${path.relative(ROOT, final)} (${(fs.statSync(final).size / 1e6).toFixed(1)} MB)`);
  } else {
    fs.copyFileSync(video, final);
    log(`no soundtrack (${path.relative(ROOT, audio)}) -> copied to ${path.relative(ROOT, final)}`);
  }
  fs.writeFileSync(path.join(OUT, `${opt.name}.json`), JSON.stringify({ name: opt.name, fps: FPS, width: W, height: H, filmFrames: FRAMES, ranges, frames,
    audio: withAudio ? path.relative(ROOT, audio).split(path.sep).join('/') : false, ...encodeKey(), builtAt: new Date().toISOString() }, null, 1));
}

// ------------------------------------------------------------------ main
let aborted = false;
function cleanupAndExit(code) {
  for (const c of children) { try { c.stdin.destroy(); c.kill('SIGKILL'); } catch {} }
  for (const f of fs.readdirSync(SEGDIR)) if (f.endsWith('.part.mp4')) fs.rmSync(path.join(SEGDIR, f), { force: true });
  const done = () => { try { fs.rmSync(PIDFILE, { force: true }); } catch {} process.exit(code); };
  if (browser) browser.close().catch(() => {}).finally(done); else done();
  setTimeout(done, 5000);
}
process.on('SIGINT', () => { if (aborted) process.exit(130); aborted = true; log('\ninterrupted - complete segments are kept, re-run the same command to resume'); cleanupAndExit(130); });
process.on('SIGTERM', () => { aborted = true; cleanupAndExit(143); });

const T0 = Date.now();
reapOrphan();
log(`--- render ${argv.join(' ') || '(full film)'}`);
srv = await serve();
let exitCode = 0;
try {
  // one page first: it tells us FRAMES / FPS / canvas size for the plan
  const first = await openPage(1);
  const { ranges, segs } = planSegments();
  const srcHash = sourceHash();
  const todo = [];
  let stale = 0;
  for (const s of segs) {
    const st = opt.force ? 'todo' : segStatus(s, srcHash);
    if (st === 'stale') { stale++; if (!opt.keepStale) todo.push(s); }
    else if (st === 'todo') todo.push(s);
  }
  log(`film ${W}x${H} @ ${FPS} fps, ${FRAMES} frames; plan: ${ranges.map((r) => `[${r[0]}, ${r[1]})`).join(' ')} -> ${segs.length} segment(s) of <= ${opt.seg}; ` +
    `${segs.length - todo.length} complete, ${todo.length} to render; scale ${opt.scale}, crf ${opt.crf}, ${opt.preset}, q ${opt.q}, ${opt.pages} page(s); src ${srcHash}`);
  if (stale) log(`  note: ${stale} complete segment(s) were rendered from different source files${opt.keepStale ? ' - kept (--keep-stale)' : ' - re-rendering them (--keep-stale keeps them)'}`);
  if (opt.plan) { for (const s of segs) log(`  seg ${pad5(s.from)} [${s.from}, ${s.to}) ${todo.includes(s) ? 'todo' : 'complete'}`); await first.page.close(); }
  else {
    prog.total = todo.reduce((a, s) => a + s.to - s.from, 0);
    prog.t0 = Date.now();
    const failures = [];
    if (todo.length) {
      const queue = [...todo];
      const nPages = Math.min(opt.pages, todo.length);
      // worker 1 reuses the page we already opened
      const w1 = worker(1, queue, srcHash, failures, first);
      const others = [];
      for (let p = 2; p <= nPages; p++) others.push(worker(p, queue, srcHash, failures));
      await Promise.all([w1, ...others]);
      const spf = prog.total ? (Date.now() - prog.t0) / 1000 / prog.total : 0;
      log(`rendered ${prog.total} frame(s) in ${fmtT((Date.now() - prog.t0) / 1000)} = ${spf.toFixed(2)} s/frame wall` +
        [...prog.perPage].map(([id, p]) => `; page ${id}: ${(p.ms / p.n / 1000).toFixed(2)} s/f`).join(''));
    } else { await first.page.close(); log('nothing to render'); }
    if (failures.length) { log(`FAILED segments: ${failures.map((s) => pad5(s.from)).join(', ')} - fix and re-run to resume`); exitCode = 1; }
    else if (opt.concat) concatSegments(segs, ranges);
  }
  if (errorCounts.size) log(`page console errors/warnings: ${[...errorCounts.values()].reduce((a, b) => a + b, 0)} (${errorCounts.size} distinct) - see ${path.relative(ROOT, LOG)}`);
} catch (e) {
  log('render failed:', e.fatal ? e.message : (e.stack || e));
  exitCode = 1;
} finally {
  try { await browser?.close(); } catch {}
  fs.rmSync(PIDFILE, { force: true });
  srv.close();
}
log(`done in ${fmtT((Date.now() - T0) / 1000)}`);
process.exit(exitCode);
