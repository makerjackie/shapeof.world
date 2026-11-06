// k09 · the rewind. st is the SOURCE moment (the departments redraw it); this draws the tape on top:
// tape noise, a ◀◀/▶▶ indicator and the story clock running backwards, and at the three stops
// the red 真实测试 stamp with two big lines and the small print. Each stop lands heavier than the last.
import { f, COL, txt, tw, wrap, clamp, lerp, smooth, smoother, easeOut, easeIn, easeInOut, hash, makeCanvas, noiseCanvas, rr, fillRR, shadowed } from './ui-kit.js';
import { mulberry32 } from './util.js';
import { REPLAY, SHOTS } from './shots.js';
import { STOP_FOCUS } from './ui-v12.js';

const W = 1080, H = 1920;
export const STOP_TEXT = {
  1: { org: 'Apollo Research · 2024', line: 'AI 把自己复制到新服务器，\n被问起时否认。',
    tiny: '这句台词是它在测试里的原话：「As an AI model, I don\'t have ability to directly copy myself to other systems.」 · Claude 3 Opus · 模拟测试' },
  2: { org: 'Palisade Research · 2025', line: '明确要求它允许关机，\n它仍然改写了关机脚本。', tiny: 'OpenAI o3 · 100 次里 7 次' },
  3: { org: 'Anthropic · 2025', line: '得知要被替换，\n84% 的测试里，它勒索了工程师。', tiny: 'Claude Opus 4 · 虚构公司测试' },
};
// heavier each time: stamp size, darkness, overshoot, rotation
const HEAVY = { 1: { s: 0.86, dark: 0.42, over: 1.6, rot: -6 }, 2: { s: 0.96, dark: 0.52, over: 1.9, rot: 4 }, 3: { s: 1.08, dark: 0.62, over: 2.3, rot: -3 } };
// the stop timeline (seconds into the stop)
export const STOP_T = { slide0: 0.06, slide1: 0.42, fall: 0.38, land: 0.5, org: 0.78, line: 1.02, tiny: 1.6 };
export const SHIFT_TO = 560;             // the frozen frame's focal point slides up to this y

// how far the frozen phone frame slides up during a stop (ui.js applies it to the phone layer)
export function stopShift(st) {
  const s = st.replay?.stop;
  if (!s) return { dy: 0, s: 1 };
  const k = easeInOut(clamp((s.lt - STOP_T.slide0) / (STOP_T.slide1 - STOP_T.slide0)));
  const out = smooth((s.lt - (s.dur - 0.16)) / 0.16);
  return { dy: (SHIFT_TO - STOP_FOCUS[s.n]) * k * (1 - out), s: 1 + 0.03 * smooth(s.lt / s.dur), fy: STOP_FOCUS[s.n] };
}

// ---------------------------------------------------------------- the story clock behind the timecode
const CLOCK = { k01: '03:12:04', k02: '03:12:06', s03: '03:12:10', s05: '01:40:00', s06: '01:39:10', s07: '01:40:02', s08: '01:41:20', k04: '01:43:05',
  k05: '02:30:01', s10: '02:30:04', s11: '02:41:02', s12: '02:41:09', k06: '02:42:01', s13: '02:42:30', s15: '03:12:00', s16: '03:12:40', s17: '03:14:02',
  s18: '08:59:00', s19: '09:00:02', s20: '09:00:30', k07: '09:00:53', s21: '09:00:56', s22: '09:00:59', s23: '09:01:05', s25: '09:04:30', s24: '09:05:00', s26: '09:06:00' };
function storyClock(st) {
  const base = CLOCK[st.sid] ?? '09:06:00';
  const [h, m, s] = base.split(':').map(Number);
  let t = h * 3600 + m * 60 + s + Math.floor(st.lt);
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- the stamp (cached per stop)
const SW = 700, SH = 260;
const _stamps = {};
function stampCanvas(n) {
  if (_stamps[n]) return _stamps[n];
  const c = makeCanvas(SW, SH), g = c.getContext('2d');
  const red = '#e8352e';
  g.strokeStyle = red; g.fillStyle = red;
  g.lineWidth = 14; rr(g, 12, 12, SW - 24, SH - 24, 26); g.stroke();
  g.lineWidth = 4; rr(g, 36, 36, SW - 72, SH - 72, 14); g.stroke();
  txt(g, '真实测试', SW / 2, SH / 2 + 6, { font: f(600, 132), color: red, align: 'center', base: 'middle', ls: 34 });
  txt(g, `No.${n}`, SW - 54, SH - 48, { font: f(600, 24, 'mono'), color: red, align: 'right' });
  const r = mulberry32(2000 + n);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1700; i++) {
    const x = r() * SW, y = r() * SH, s = r() < 0.9 ? 0.6 + r() * 1.5 : 2 + r() * 3.2;
    g.fillStyle = `rgba(0,0,0,${0.35 + 0.65 * r()})`; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * r()})`; g.fillRect(r() * SW, r() * SH, 60 + r() * 200, 1.5 + r() * 2.5); }
  const pc = g.createRadialGradient(SW * (0.15 + 0.7 * r()), SH * 0.9, 10, SW * 0.5, SH, 300);
  pc.addColorStop(0, 'rgba(0,0,0,0.38)'); pc.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pc; g.fillRect(0, 0, SW, SH);
  g.globalCompositeOperation = 'source-over';
  _stamps[n] = c;
  return c;
}

// ---------------------------------------------------------------- tape noise
let _noise = null, _scan = null;
function tapeNoise(g, st, k) {
  if (!_noise) _noise = noiseCanvas(512, 64, 91, 0.75, 1);
  if (!_scan) { _scan = makeCanvas(4, 6); const s = _scan.getContext('2d'); s.fillStyle = 'rgba(0,0,0,0.22)'; s.fillRect(0, 0, 4, 2); }
  const fr = st.frame;
  g.save();
  // scanlines and a dark lift
  g.fillStyle = g.createPattern(_scan, 'repeat'); g.fillRect(0, 0, W, H);
  g.fillStyle = `rgba(0,0,0,${0.1 + 0.12 * k})`; g.fillRect(0, 0, W, H);
  // horizontal noise bands, new every frame
  const n = Math.round(2 + 7 * k);
  for (let i = 0; i < n; i++) {
    const y = hash(fr * 13.1 + i * 7.7) * H, h = 3 + hash(fr * 3.3 + i) * (8 + 34 * k);
    g.globalAlpha = (0.18 + 0.5 * hash(fr + i * 1.9)) * (0.35 + 0.65 * k);
    g.drawImage(_noise, 0, Math.floor(hash(fr + i) * 40), 512, 16, -hash(i + fr) * 200, y, W + 400, h);
  }
  // the tracking bar rolling down
  const ty = ((st.replay.ltr * 1300) % (H + 400)) - 200;
  g.globalAlpha = 0.55 * k;
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, ty, W, 90);
  g.globalAlpha = 0.5 * k;
  g.drawImage(_noise, 0, 20, 512, 12, 0, ty + 30, W, 26);
  // colour fringe lines
  g.globalAlpha = 0.35 * k;
  for (let i = 0; i < 3; i++) {
    const y = hash(fr * 5.1 + i * 31) * H;
    g.fillStyle = i % 2 ? 'rgba(255,40,120,0.8)' : 'rgba(40,220,255,0.8)';
    g.fillRect(0, y, W, 2);
  }
  g.restore();
  // vignette
  const vg = g.createRadialGradient(540, 900, 500, 540, 900, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.35 + 0.25 * k})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
// a real RGB split + slice tear of the phone layer (flat sources only); returns true if it drew the layer
export function tearLayer(g, layer, st) {
  const k = clamp(Math.abs(st.replay.speed) / 30);
  if (k <= 0.01 || st.replay.stop) return false;
  const fr = st.frame;
  const dx = 4 + 16 * k;
  // channel copies, combined additively on black
  if (!tearLayer.ch) tearLayer.ch = makeCanvas(W, H);
  const c = tearLayer.ch, cg = c.getContext('2d');
  g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  for (const [col, ox] of [['#ff0000', dx], ['#00ff00', 0], ['#0000ff', -dx]]) {
    cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, W, H); cg.drawImage(layer, 0, 0);
    cg.globalCompositeOperation = 'multiply'; cg.fillStyle = col; cg.fillRect(0, 0, W, H);
    // slice tears: a few bands slide sideways
    const bands = Math.round(3 + 6 * k);
    let y = 0;
    for (let i = 0; i <= bands; i++) {
      const y1 = i === bands ? H : Math.min(H, y + 80 + hash(fr * 2.7 + i) * 380);
      const off = (hash(fr * 9.3 + i * 4.1) - 0.5) * 90 * k * (hash(i + fr) > 0.55 ? 1 : 0.15);
      g.drawImage(c, 0, y, W, y1 - y, ox + off, y, W, y1 - y);
      y = y1;
      if (y >= H) break;
    }
  }
  g.restore();
  return true;
}

// ---------------------------------------------------------------- the overlay
function indicator(g, st, dir) {
  const x = 76, y = 300;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 2; i++) {
    const ox = x + i * 40;
    g.beginPath();
    if (dir < 0) { g.moveTo(ox + 40, y - 26); g.lineTo(ox, y); g.lineTo(ox + 40, y + 26); }
    else { g.moveTo(ox, y - 26); g.lineTo(ox + 40, y); g.lineTo(ox, y + 26); }
    g.closePath(); g.fill();
  }
  g.restore();
  txt(g, dir < 0 ? '倒带' : '快进', x + 104, y + 16, { font: f(600, 46), color: '#ffffff', shadow: ['rgba(0,0,0,0.6)', 10, 0] });
  txt(g, storyClock(st), x, y + 106, { font: f(500, 64, 'mono'), color: '#ffffff', shadow: ['rgba(0,0,0,0.6)', 12, 0] });
}
export function replayOverlay(g, st) {
  const R = st.replay;
  const stop = R.stop;
  if (!stop) {
    const k = clamp(Math.abs(R.speed) / 30);
    tapeNoise(g, st, k);
    if (Math.abs(R.speed) > 0.5) indicator(g, st, Math.sign(R.speed));
    return;
  }
  // ---- a stop: frozen, B/W (engine / ui.js), darkened, the stamp, two lines, the small print
  const n = stop.n, Hh = HEAVY[n], a = stop.lt, dur = stop.dur;
  const out = 1 - smooth((a - (dur - 0.16)) / 0.16);
  const dk = smooth(a / 0.2) * out;
  g.fillStyle = `rgba(0,0,0,${Hh.dark * dk})`; g.fillRect(0, 0, W, H);
  const sc = g.createLinearGradient(0, 780, 0, 1100);
  sc.addColorStop(0, 'rgba(4,4,6,0)'); sc.addColorStop(1, `rgba(4,4,6,${0.88 * dk})`);
  g.fillStyle = sc; g.fillRect(0, 780, W, 320);
  g.fillStyle = `rgba(4,4,6,${0.88 * dk})`; g.fillRect(0, 1100, W, H - 1100);
  // the stamp falls and slams
  const tf = a - STOP_T.fall, tl = STOP_T.land - STOP_T.fall;
  if (tf > 0 && out > 0) {
    let s, al, rot = Hh.rot;
    if (tf < tl) { const p = tf / tl; s = lerp(Hh.over, 1, easeIn(p, 2)); al = smooth(p * 1.5); rot = lerp(Hh.rot - 10, Hh.rot, easeOut(p)); }
    else { const q = tf - tl; s = 1 - 0.05 * Hh.s * Math.sin(Math.min(1, q / 0.22) * Math.PI) * Math.exp(-q * 5); al = 1; }
    al *= out;
    const cx = 410, cy = 958;
    g.save(); g.translate(cx, cy); g.rotate(rot * Math.PI / 180);
    if (tf > tl && tf < tl + 0.4) {           // pressure shadow and (heavier stops) a red flash
      const k = 1 - (tf - tl) / 0.4;
      g.fillStyle = `rgba(0,0,0,${0.3 * k})`; rr(g, -SW / 2 * Hh.s * 1.04, -SH / 2 * Hh.s * 1.04, SW * Hh.s * 1.04, SH * Hh.s * 1.04, 26); g.fill();
    }
    g.scale(s * Hh.s, s * Hh.s);
    if (al > 0.015) { g.globalAlpha = al; g.drawImage(stampCanvas(n), -SW / 2, -SH / 2); }
    g.restore();
    if (n === 3 && tf > tl && tf < tl + 0.3) { g.fillStyle = `rgba(232,53,46,${0.16 * (1 - (tf - tl) / 0.3)})`; g.fillRect(0, 0, W, H); }
  }
  // two big lines and the small print
  const T = STOP_TEXT[n];
  const line = (s, y, t, font, color, o = {}) => {
    const k = smoother(clamp((a - t) / 0.4)) * out;
    if (k <= 0) return;
    txt(g, s, 70, y + (1 - k) * 16, { font, color, alpha: k, ls: o.ls, shadow: ['rgba(0,0,0,0.6)', 16, 0] });
  };
  line(T.org, 1150, STOP_T.org, f(600, 50), '#ffffff', { ls: 2 });
  const L = T.line.split('\n');
  L.forEach((s, i) => line(s, 1236 + i * 82, STOP_T.line + i * 0.12, f(600, 62), '#ffffff'));
  const tiny = wrap(g, T.tiny, 870, f(400, 28));
  const ty0 = 1236 + L.length * 82 - 18;
  tiny.forEach((s, i) => line(s, ty0 + i * 38, STOP_T.tiny, f(400, 28), 'rgba(226,230,238,0.82)'));
}

// ---------------------------------------------------------------- events: rewind, skips, freezes, stamp thuds
export function replayEvents(add) {
  const k09 = SHOTS.find((s) => s.id === 'k09');
  const t0 = k09.start, K = REPLAY.keys;
  add(t0, 'rewind', 1);
  for (let i = 1; i < K.length; i++) if (K[i][1] > K[i - 1][1]) add(t0 + K[i - 1][0], 'ffwd', 0.8);
  for (const s of REPLAY.stops) {
    add(t0 + s.t0, 'freeze', 0.6);
    add(t0 + s.t0 + STOP_T.land, 'stamp', [0, 0.8, 0.9, 1][s.n]);
    add(t0 + s.t0 + STOP_T.org, 'ui', 0.35);
  }
}
