// Contact sheet of N evenly spaced frames from a video, for review.
//
//   node tools/sheet.mjs                         out/sunshower.mp4 -> out/sunshower_sheet.jpg (24 frames, 6 columns)
//   node tools/sheet.mjs out/test.mp4 --n 12 --cols 4 --width 480 --out out/delivery/test_sheet.jpg
//   node tools/sheet.mjs --from 30 --to 35       only that stretch of the video (seconds)
//   node tools/sheet.mjs --shots                 one tile from the middle of every shot of src/shots.js
//
// Each tile is labelled with the film frame, the film time and the shot (read from the
// <name>.json manifest tools/render.mjs writes next to the video, so partial renders are
// labelled with their real film frames). Options:
//   --n N        number of frames            (default 24)
//   --cols C     tiles per row               (default 6)
//   --width W    tile width in px            (default 320)
//   --from S / --to S   video time window in seconds (default the whole video)
//   --frames a,b,c      explicit film frames instead of evenly spaced ones
//   --shots             one frame per shot: its middle, or the nearest frame of it in the video
//   --no-label   plain tiles
//   --q Q        JPEG quality 2 (best) .. 31 (default 3)
//   --out FILE   output JPEG                  (default <video dir>/<video name>_sheet.jpg)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const o = { video: 'out/sunshower.mp4', n: 24, cols: 6, width: 320, from: null, to: null, frames: null, shots: false, label: true, q: 3, out: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i], v = () => argv[++i];
  if (a === '--n') o.n = parseInt(v(), 10);
  else if (a === '--cols') o.cols = parseInt(v(), 10);
  else if (a === '--width') o.width = parseInt(v(), 10);
  else if (a === '--from') o.from = parseFloat(v());
  else if (a === '--to') o.to = parseFloat(v());
  else if (a === '--frames') o.frames = v().split(',').map(Number);
  else if (a === '--shots') o.shots = true;
  else if (a === '--no-label') o.label = false;
  else if (a === '--q') o.q = parseInt(v(), 10);
  else if (a === '--out') o.out = v();
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^\/\/ ?/gm, '')); process.exit(0); }
  else if (!a.startsWith('--')) o.video = a;
  else { console.error(`unknown option ${a}`); process.exit(2); }
}
const video = path.resolve(ROOT, o.video);
if (!fs.existsSync(video)) { console.error(`no such video: ${video}`); process.exit(1); }
const out = path.resolve(ROOT, o.out ?? path.join(path.dirname(o.video), path.basename(o.video, path.extname(o.video)) + '_sheet.jpg'));
fs.mkdirSync(path.dirname(out), { recursive: true });

// --- what is in the video
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
  '-show_entries', 'stream=nb_read_packets,r_frame_rate,width,height', '-of', 'json', video], { encoding: 'utf8' })).streams[0];
const total = parseInt(probe.nb_read_packets, 10);
const [rn, rd] = probe.r_frame_rate.split('/').map(Number);
const fps = rn / (rd || 1);

// video frame index -> film frame, via the render manifest (ranges joined in order)
const man = (() => {
  const base = path.basename(video, '.mp4').replace(/_video$/, '');
  const f = path.join(path.dirname(video), base + '.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
})();
const ranges = man?.ranges ?? [[0, total]];
const filmFrame = (vi) => { let k = vi; for (const [a, b] of ranges) { if (k < b - a) return a + k; k -= b - a; } return vi; };
const videoIndex = (ff) => { let off = 0; for (const [a, b] of ranges) { if (ff >= a && ff < b) return off + ff - a; off += b - a; } return -1; };

// shot names from src/shots.js (parsed as text: importing it would pull in three.js)
const shots = (() => {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'src/shots.js'), 'utf8');
    const list = [];
    for (const m of src.matchAll(/name:\s*'([^']+)'[^\n]*?start:\s*([\d.]+)[^\n]*?end:\s*([\d.]+)/g)) list.push({ name: m[1], start: +m[2], end: +m[3] });
    return list;
  } catch { return []; }
})();
const shotAt = (t) => shots.find((s) => t >= s.start && t < s.end)?.name ?? '';

// --- choose frames (video indices)
let picks;
if (o.shots) {
  // per shot: the frame nearest its middle that is in this video (partial renders included)
  const got = [];
  for (const s of shots) {
    const a = Math.ceil(s.start * fps), b = Math.ceil(s.end * fps), mid = Math.round((s.start + s.end) / 2 * fps);
    let best = -1;
    for (let f = a; f < b; f++) if (videoIndex(f) >= 0 && (best < 0 || Math.abs(f - mid) < Math.abs(best - mid))) best = f;
    if (best >= 0) got.push([s.name, best]);
  }
  o.frames = got.map((g) => g[1]);
  console.log(`shots in this video: ${got.map(([n, f]) => `${n}@${f}`).join(', ') || 'none'}`);
}
if (o.frames) picks = o.frames.map(videoIndex).filter((i) => i >= 0 && i < total);
else {
  const lo = o.from != null ? Math.max(0, Math.round(o.from * fps)) : 0;
  const hi = o.to != null ? Math.min(total, Math.round(o.to * fps)) : total;
  const n = Math.max(1, Math.min(o.n, hi - lo));
  picks = Array.from({ length: n }, (_, i) => lo + Math.min(hi - lo - 1, Math.floor((i + 0.5) * (hi - lo) / n)));
}
picks = [...new Set(picks)];
if (!picks.length) { console.error('no frames to show'); process.exit(1); }
const cols = Math.min(o.cols, picks.length), rows = Math.ceil(picks.length / cols);

// --- one decode pass: select the frames, scale, label, tile
const fontFile = ['C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc'].find((f) => fs.existsSync(f));
const esc = (s) => s.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
const sel = picks.map((i) => `eq(n\\,${i})`).join('+');
let chain = `select='${sel}',scale=${o.width}:-2:flags=lanczos`;
if (o.label && fontFile) {
  // label text per tile via sendcmd-free trick: one drawtext per pick, enabled on that frame's pts
  const fs2 = Math.max(10, Math.round(o.width / 26));
  for (const i of picks) {
    const ff = filmFrame(i), t = ff / fps;
    const txt = `${String(ff).padStart(4, '0')}  ${t.toFixed(2)}s  ${shotAt(t)}`;
    chain += `,drawtext=fontfile='${esc(fontFile)}':text='${esc(txt)}':x=6:y=h-th-6:fontsize=${fs2}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=4:enable='eq(n\\,${picks.indexOf(i)})'`;
  }
}
chain += `,tile=${cols}x${rows}:padding=4:margin=4:color=0x2b2b30`;
// drawtext's n counts frames after select, so build it as: select -> setpts -> scale -> drawtexts -> tile
chain = chain.replace(`select='${sel}',`, `select='${sel}',setpts=N/TB,`);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-vf', chain, '-frames:v', '1', '-q:v', String(o.q), '-update', '1', out], { stdio: 'inherit' });
console.log(`sheet ${path.relative(ROOT, out)}: ${picks.length} frames (${cols}x${rows}) from ${path.relative(ROOT, video)} [${total} frames @ ${fps} fps]`);
