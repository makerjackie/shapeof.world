// k09 · the rewind (v13: clean). st is the SOURCE moment (the departments redraw it); this adds a small ◀◀ / ▶▶,
// a soft motion streak on the phone frames, and at the three stops the red 「真实发生过」 stamp with the org · year,
// the sentence and the small print. The stamp lands half a second (one beat of 《三体》) after the freeze.
import { f, txt, wrap, clamp, lerp, smooth, smoother, easeOut, easeIn, easeInOut, makeCanvas, rr } from './ui-kit.js';
import { mulberry32 } from './util.js';
import { REPLAY, SHOTS } from './shots.js';
import { STOP_FOCUS } from './ui-v13.js';

const W = 1080, H = 1920;
export const STOP_TEXT = {
  1: { org: 'Apollo Research · 2024', line: '测试中，AI 把自己复制到\n新服务器，被问起时否认。',
    tiny: '这句台词，是它在测试里的原话：「As an AI model, I don\'t have ability to directly copy myself to other systems.」' },
  2: { org: 'Palisade Research · 2025', line: '明确要求它允许关机，\n它仍然改写了关机脚本。', tiny: 'OpenAI o3 · 100 次里 7 次' },
  3: { org: 'Anthropic · 2025', line: '得知要被替换，\n84% 的测试里，它勒索了工程师。', tiny: 'Claude Opus 4 · 虚构公司测试' },
};
const HEAVY = { 1: { s: 0.9, dark: 0.45, over: 1.6, rot: -5 }, 2: { s: 0.98, dark: 0.52, over: 1.8, rot: 4 }, 3: { s: 1.06, dark: 0.6, over: 2.1, rot: -3 } };
export const STOP_T = { slide0: 0.05, slide1: 0.45, fall: 0.38, land: 0.5, org: 0.9, line: 1.2, tiny: 1.9 };
export const SHIFT_TO = 560;
const STOP_FIT = { 1: 0.82 };

export function stopShift(st) {
  const s = st.replay?.stop;
  if (!s) return { dy: 0, s: 1 };
  const k = easeInOut(clamp((s.lt - STOP_T.slide0) / (STOP_T.slide1 - STOP_T.slide0)));
  const out = smooth((s.lt - (s.dur - 0.16)) / 0.16);
  const fit = lerp(1, STOP_FIT[s.n] ?? 1, k * (1 - out));      // stop 1 (orb + three lines) shrinks to clear the stamp
  return { dy: (SHIFT_TO - STOP_FOCUS[s.n]) * k * (1 - out), s: fit * (1 + 0.025 * smooth(s.lt / s.dur)), fy: STOP_FOCUS[s.n] };
}
// a soft motion streak on a flat (phone) source while the film runs; draws the layer itself
export function streakLayer(g, layer, st) {
  const R = st.replay;
  if (!R || R.stop) return false;
  const k = clamp(Math.abs(R.speed) / 40);
  g.drawImage(layer, 0, 0);
  if (k < 0.03) return true;
  const d = Math.sign(R.speed) * 26 * k;
  g.save();
  for (const [dy, a] of [[d, 0.22], [2 * d, 0.12]]) { g.globalAlpha = a * k; g.drawImage(layer, 0, -dy); }
  g.restore();
  return true;
}

// ---------------------------------------------------------------- the stamp (cached per stop)
const SW = 720, SH = 250;
const _stamps = {};
function stampCanvas(n) {
  if (_stamps[n]) return _stamps[n];
  const c = makeCanvas(SW, SH), g = c.getContext('2d');
  const red = '#e8352e';
  g.strokeStyle = red; g.lineWidth = 14; rr(g, 12, 12, SW - 24, SH - 24, 26); g.stroke();
  g.lineWidth = 4; rr(g, 36, 36, SW - 72, SH - 72, 14); g.stroke();
  txt(g, '真实发生过', SW / 2, SH / 2 + 6, { font: f(600, 108), color: red, align: 'center', base: 'middle', ls: 18 });
  const r = mulberry32(3000 + n);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1600; i++) {
    const x = r() * SW, y = r() * SH, s = r() < 0.9 ? 0.6 + r() * 1.5 : 2 + r() * 3;
    g.fillStyle = `rgba(0,0,0,${0.35 + 0.65 * r()})`; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * r()})`; g.fillRect(r() * SW, r() * SH, 60 + r() * 200, 1.5 + r() * 2.5); }
  const pc = g.createRadialGradient(SW * (0.15 + 0.7 * r()), SH * 0.9, 10, SW * 0.5, SH, 300);
  pc.addColorStop(0, 'rgba(0,0,0,0.36)'); pc.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pc; g.fillRect(0, 0, SW, SH);
  g.globalCompositeOperation = 'source-over';
  _stamps[n] = c;
  return c;
}

function indicator(g, dir) {
  g.save(); g.globalAlpha = 0.8; g.fillStyle = '#ffffff';
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8;
  for (let i = 0; i < 2; i++) {
    const ox = 76 + i * 30, y = 296;
    g.beginPath();
    if (dir < 0) { g.moveTo(ox + 30, y - 20); g.lineTo(ox, y); g.lineTo(ox + 30, y + 20); }
    else { g.moveTo(ox, y - 20); g.lineTo(ox + 30, y); g.lineTo(ox, y + 20); }
    g.closePath(); g.fill();
  }
  g.restore();
}
export function replayOverlay(g, st) {
  const R = st.replay, stop = R.stop;
  if (!stop) {
    const k = clamp(Math.abs(R.speed) / 40);
    g.fillStyle = `rgba(0,0,0,${0.12 + 0.12 * k})`; g.fillRect(0, 0, W, H);
    if (Math.abs(R.speed) > 0.5) indicator(g, Math.sign(R.speed));
    return;
  }
  const n = stop.n, Hh = HEAVY[n], a = stop.lt, dur = stop.dur;
  const out = 1 - smooth((a - (dur - 0.16)) / 0.16);
  const dk = smooth(a / 0.2) * out;
  g.fillStyle = `rgba(0,0,0,${Hh.dark * dk})`; g.fillRect(0, 0, W, H);
  const sc = g.createLinearGradient(0, 780, 0, 1100);
  sc.addColorStop(0, 'rgba(4,4,6,0)'); sc.addColorStop(1, `rgba(4,4,6,${0.88 * dk})`);
  g.fillStyle = sc; g.fillRect(0, 780, W, 320);
  g.fillStyle = `rgba(4,4,6,${0.88 * dk})`; g.fillRect(0, 1100, W, H - 1100);
  const tf = a - STOP_T.fall, tl = STOP_T.land - STOP_T.fall;
  if (tf > 0 && out > 0) {
    let s, al, rot = Hh.rot;
    if (tf < tl) { const p = tf / tl; s = lerp(Hh.over, 1, easeIn(p, 2)); al = smooth(p * 1.5); rot = lerp(Hh.rot - 9, Hh.rot, easeOut(p)); }
    else { const q = tf - tl; s = 1 - 0.05 * Hh.s * Math.sin(Math.min(1, q / 0.22) * Math.PI) * Math.exp(-q * 5); al = 1; }
    al *= out;
    g.save(); g.translate(430, 958); g.rotate(rot * Math.PI / 180);
    if (tf > tl && tf < tl + 0.4) { const k = 1 - (tf - tl) / 0.4; g.fillStyle = `rgba(0,0,0,${0.3 * k})`; rr(g, -SW / 2 * Hh.s * 1.04, -SH / 2 * Hh.s * 1.04, SW * Hh.s * 1.04, SH * Hh.s * 1.04, 26); g.fill(); }
    g.scale(s * Hh.s, s * Hh.s);
    if (al > 0.015) { g.globalAlpha = al; g.drawImage(stampCanvas(n), -SW / 2, -SH / 2); }
    g.restore();
    if (n === 3 && tf > tl && tf < tl + 0.3) { g.fillStyle = `rgba(232,53,46,${0.14 * (1 - (tf - tl) / 0.3)})`; g.fillRect(0, 0, W, H); }
  }
  const T = STOP_TEXT[n];
  const line = (s, y, t, font, color, o = {}) => {
    const k = smoother(clamp((a - t) / 0.45)) * out;
    if (k > 0) txt(g, s, 70, y + (1 - k) * 16, { font, color, alpha: k, ls: o.ls, shadow: ['rgba(0,0,0,0.6)', 16, 0] });
  };
  line(T.org, 1150, STOP_T.org, f(600, 50), '#ffffff', { ls: 2 });
  const L = T.line.split('\n');
  L.forEach((s, i) => line(s, 1236 + i * 82, STOP_T.line + i * 0.15, f(600, 60), '#ffffff'));
  const tiny = wrap(g, T.tiny, 870, f(400, 28));
  const ty0 = 1236 + L.length * 82 - 14;
  tiny.forEach((s, i) => line(s, ty0 + i * 38, STOP_T.tiny, f(400, 28), 'rgba(226,230,238,0.82)'));
}

export function replayEvents(add) {
  const k09 = SHOTS.find((s) => s.id === 'k09');
  const t0 = k09.start, K = REPLAY.keys;
  add(t0, 'rewind', 1);
  for (let i = 1; i < K.length; i++) if (K[i][1] > K[i - 1][1]) add(t0 + K[i - 1][0], 'ffwd', 0.8);
  for (const s of REPLAY.stops) {
    add(t0 + s.t0, 'freeze', 0.6);
    add(t0 + s.t0 + STOP_T.land, 'stamp', [0, 0.8, 0.9, 1][s.n]);
  }
}
