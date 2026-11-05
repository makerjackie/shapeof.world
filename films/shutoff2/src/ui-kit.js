// UI kit: fonts, colours, text layout, motion and small vector icons shared by every UI module.
// Everything is a pure function of its arguments (no clocks, no Math.random).
import { clamp, lerp, invLerp, smooth, smoother, easeOut, easeIn, easeInOut, mulberry32 } from './util.js';
export { clamp, lerp, invLerp, smooth, smoother, easeOut, easeIn, easeInOut };

export const FONT = {
  ui: '"PingFang SC", "Hiragino Sans GB", "Apple Color Emoji", sans-serif',
  serif: '"Songti SC", "STSong", "PingFang SC", "Apple Color Emoji", serif',
  mono: '"SF Mono", "Menlo", "PingFang SC", monospace',
  num: '"Avenir Next", "Helvetica Neue", "PingFang SC", sans-serif',
  helv: '"Helvetica Neue", "PingFang SC", sans-serif',
};
export const f = (w, px, fam = 'ui') => `${w} ${px}px ${FONT[fam] || fam}`;

export const COL = {
  amber: '#ffb547', amberHi: '#ffd08a', amberLo: '#e8901f', amberInk: '#2b1800',
  red: '#ff453a', redDeep: '#d92b22', green: '#30d158', blue: '#2f6df6', ice: '#cfe6ff', iceDeep: '#2a6fd6',
  ink: '#0e1116',
};

// ---------- text ----------
// colour string with its alpha multiplied by a (accepts #rgb, #rrggbb, rgb(), rgba())
export function withAlpha(c, a) {
  if (c[0] === '#') {
    let h = c.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return c;
  const p = m[1].split(',').map((v) => v.trim());
  return `rgba(${p[0]},${p[1]},${p[2]},${(p[3] != null ? parseFloat(p[3]) : 1) * a})`;
}
// Text. Fades are applied to the colours (fill, stroke, shadow), never as a tiny globalAlpha under a shadow:
// Chrome's GPU canvas turns very faint shadowed text into a bright smear once it is composited premultiplied.
export function txt(g, s, x, y, o = {}) {
  const ea = g.globalAlpha * (o.alpha ?? 1);
  if (ea < 0.015) return;
  g.save();
  if (o.font) g.font = o.font;
  const fx = o.shadow || o.stroke;
  const color = o.color ?? '#fff';
  g.globalAlpha = fx ? 1 : ea;
  g.fillStyle = fx ? withAlpha(color, ea) : color;
  const align = o.align ?? 'left';
  g.textAlign = align;
  g.textBaseline = o.base ?? 'alphabetic';
  const ls = o.ls ?? 0;
  if (ls) {
    g.letterSpacing = ls + 'px';
    // Chrome adds the spacing after the last glyph too; keep centred/right text visually aligned
    if (align === 'center') x += ls / 2; else if (align === 'right') x += ls;
  }
  if (o.shadow) { g.shadowColor = withAlpha(o.shadow[0], ea * ea); g.shadowBlur = o.shadow[1]; g.shadowOffsetY = o.shadow[2] ?? 0; }
  if (o.stroke) { g.lineJoin = 'round'; g.strokeStyle = withAlpha(o.stroke[0], ea); g.lineWidth = o.stroke[1]; g.strokeText(s, x, y); }
  g.fillText(s, x, y);
  g.restore();
}
export function tw(g, s, font, ls = 0) {
  g.save(); g.font = font; if (ls) g.letterSpacing = ls + 'px';
  const w = g.measureText(s).width - (ls ? ls : 0);
  g.restore(); return w;
}

const NO_START = '，。、；：？！）》」』”’…—%·.,;:?!)';
const NO_END = '（《「『“‘(';
export function tokens(s) {
  const out = []; let cur = '';
  for (const ch of Array.from(s)) {
    if (/[A-Za-z0-9.:%\-_/'@#+]/.test(ch)) { cur += ch; continue; }
    if (cur) { out.push(cur); cur = ''; }
    out.push(ch);
  }
  if (cur) out.push(cur);
  return out;
}
// Greedy CJK-aware wrap; honours \n; keeps latin words and numbers whole; no line starts with closing punctuation.
export function wrap(g, s, maxW, font) {
  g.save(); if (font) g.font = font;
  const lines = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const t of tokens(para)) {
      const test = line + t;
      if (line && g.measureText(test).width > maxW && !NO_START.includes(t[0])) {
        let carry = '';
        while (line.length && NO_END.includes(line[line.length - 1])) { carry = line[line.length - 1] + carry; line = line.slice(0, -1); }
        lines.push(line.replace(/\s+$/, ''));
        line = (carry + t).replace(/^\s+/, '');
      } else line = test;
    }
    lines.push(line);
  }
  g.restore();
  return lines;
}
export const chars = (s) => Array.from(s);

// ---------- motion ----------
// damped spring 0 → 1 (overshoots ~10 %)
export function spring(t, freq = 2.4, damp = 0.55) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
}
// window: fade in over a, hold, fade out over b, between t0 and t1
export function win(t, t0, t1, a = 0.25, b = 0.25) {
  if (t < t0 || t > t1) return 0;
  return Math.min(a > 0 ? smooth((t - t0) / a) : 1, b > 0 ? smooth((t1 - t) / b) : 1);
}
export const blink = (t, period = 1.0) => ((t % period) + period) % period < period * 0.55;
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- shapes ----------
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export function fillRR(g, x, y, w, h, r, fill) { rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); }
export function strokeRR(g, x, y, w, h, r, stroke, lw = 2) { rr(g, x, y, w, h, r); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
export function disc(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
// soft shadow under fn()'s drawing. The shadow fades out while the layer itself is faint (see txt()).
export const fxFade = (g) => smooth((g.globalAlpha - 0.12) / 0.4);
export function shadowed(g, color, blur, oy, fn) {
  const k = fxFade(g);
  g.save();
  if (k > 0) { g.shadowColor = withAlpha(color, k); g.shadowBlur = blur; g.shadowOffsetY = oy; }
  fn(); g.restore();
}

// soft touch ripple where a finger presses (t = seconds since the press)
export function ripple(g, x, y, t, dark = true) {
  if (t < 0 || t > 0.7) return;
  const k = t / 0.7;
  const c = dark ? '255,255,255' : '0,0,0';
  g.save();
  g.fillStyle = `rgba(${c},${0.22 * (1 - k)})`;
  g.beginPath(); g.arc(x, y, 34 + 150 * easeOut(k, 3), 0, Math.PI * 2); g.fill();
  if (t < 0.22) {
    g.fillStyle = `rgba(${c},${0.32 * (1 - t / 0.22)})`;
    g.beginPath(); g.arc(x, y, 38, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------- icons (stroked/filled vectors, s = nominal size) ----------
export function lockIcon(g, x, y, s, color, open = 0) {
  g.save(); g.translate(x, y);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.13; g.lineCap = 'round';
  g.beginPath();
  const sx = s * 0.26, top = -s * 0.42 - open * s * 0.18;
  g.moveTo(-sx, -s * 0.02); g.lineTo(-sx, top + sx); g.arc(0, top + sx, sx, Math.PI, 0); g.lineTo(sx, -s * 0.02 - open * s * 0.18);
  g.stroke();
  rr(g, -s * 0.4, -s * 0.06, s * 0.8, s * 0.6, s * 0.12); g.fill();
  g.restore();
}
export function heartIcon(g, x, y, s, color) {
  const k = s / 2;
  g.beginPath();
  g.moveTo(x, y + k * 0.85);
  g.bezierCurveTo(x - k * 1.25, y + k * 0.05, x - k * 1.05, y - k * 1.0, x, y - k * 0.42);
  g.bezierCurveTo(x + k * 1.05, y - k * 1.0, x + k * 1.25, y + k * 0.05, x, y + k * 0.85);
  g.closePath(); g.fillStyle = color; g.fill();
}
export function checkIcon(g, x, y, s, color, lw) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw ?? s * 0.14; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - s * 0.38, y + s * 0.02); g.lineTo(x - s * 0.1, y + s * 0.3); g.lineTo(x + s * 0.4, y - s * 0.28); g.stroke(); g.restore();
}
export function chevron(g, x, y, s, color, dir = -1) {
  g.save(); g.strokeStyle = color; g.lineWidth = s * 0.16; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - dir * s * 0.25, y - s * 0.5); g.lineTo(x + dir * s * 0.25, y); g.lineTo(x - dir * s * 0.25, y + s * 0.5); g.stroke(); g.restore();
}
export function chatIcon(g, x, y, s, color) {
  g.save(); g.fillStyle = color;
  rr(g, x - s * 0.5, y - s * 0.42, s, s * 0.7, s * 0.24); g.fill();
  g.beginPath(); g.moveTo(x - s * 0.22, y + s * 0.2); g.lineTo(x - s * 0.34, y + s * 0.46); g.lineTo(x + s * 0.02, y + s * 0.24); g.fill();
  g.restore();
}
export function carIcon(g, x, y, s, color) {
  g.save(); g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - s * 0.5, y + s * 0.18); g.lineTo(x - s * 0.5, y - s * 0.02); g.lineTo(x - s * 0.36, y - s * 0.08);
  g.lineTo(x - s * 0.22, y - s * 0.34); g.lineTo(x + s * 0.22, y - s * 0.34); g.lineTo(x + s * 0.36, y - s * 0.08);
  g.lineTo(x + s * 0.5, y - s * 0.02); g.lineTo(x + s * 0.5, y + s * 0.18); g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out';
  rr(g, x - s * 0.17, y - s * 0.27, s * 0.34, s * 0.16, s * 0.04); g.fill();
  g.globalCompositeOperation = 'source-over';
  disc(g, x - s * 0.28, y + s * 0.2, s * 0.12, color); disc(g, x + s * 0.28, y + s * 0.2, s * 0.12, color);
  g.restore();
}
export function trashIcon(g, x, y, s, color) {
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = s * 0.09; g.lineCap = 'round';
  rr(g, x - s * 0.42, y - s * 0.36, s * 0.84, s * 0.1, s * 0.04); g.fill();
  rr(g, x - s * 0.12, y - s * 0.46, s * 0.24, s * 0.12, s * 0.04); g.fill();
  g.beginPath(); g.moveTo(x - s * 0.34, y - s * 0.2); g.lineTo(x - s * 0.27, y + s * 0.46); g.lineTo(x + s * 0.27, y + s * 0.46); g.lineTo(x + s * 0.34, y - s * 0.2); g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (const dx of [-0.12, 0.12]) { g.beginPath(); g.moveTo(x + dx * s, y - s * 0.08); g.lineTo(x + dx * s, y + s * 0.32); g.stroke(); }
  g.restore();
}
export function micOffIcon(g, x, y, s, color) {
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.1; g.lineCap = 'round';
  rr(g, x - s * 0.16, y - s * 0.45, s * 0.32, s * 0.58, s * 0.16); g.fill();
  g.beginPath(); g.arc(x, y - s * 0.05, s * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(x, y + s * 0.26); g.lineTo(x, y + s * 0.44); g.stroke();
  g.beginPath(); g.moveTo(x - s * 0.42, y - s * 0.46); g.lineTo(x + s * 0.42, y + s * 0.4); g.stroke();
  g.restore();
}
export function signalIcon(g, x, y, s, color) { // bottom-left anchor
  g.save(); g.fillStyle = color;
  for (let i = 0; i < 4; i++) { const h = s * (0.35 + i * 0.22); rr(g, x + i * s * 0.32, y - h, s * 0.22, h, s * 0.05); g.fill(); }
  g.restore();
}
export function batteryIcon(g, x, y, s, color, level = 0.84) { // x,y = left, vertical centre; s = height
  g.save();
  const w = s * 2.0, h = s;
  g.strokeStyle = color; g.globalAlpha *= 0.45; g.lineWidth = s * 0.1;
  rr(g, x, y - h / 2, w, h, h * 0.3); g.stroke();
  rr(g, x + w + s * 0.08, y - h * 0.18, s * 0.12, h * 0.36, s * 0.05); g.fillStyle = color; g.fill();
  g.globalAlpha /= 0.45;
  rr(g, x + s * 0.16, y - h / 2 + s * 0.16, (w - s * 0.32) * level, h - s * 0.32, h * 0.18); g.fillStyle = color; g.fill();
  g.restore();
}
export function sendIcon(g, x, y, s, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = s * 0.13; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, y + s * 0.34); g.lineTo(x, y - s * 0.32); g.moveTo(x - s * 0.28, y - s * 0.06); g.lineTo(x, y - s * 0.34); g.lineTo(x + s * 0.28, y - s * 0.06); g.stroke();
  g.restore();
}

// ---------- 安 / 安-2 avatars ----------
export function avatarAn(g, x, y, r, glow = 0) {
  g.save();
  if (glow > 0 && fxFade(g) > 0) { g.shadowColor = `rgba(255,181,71,${0.75 * glow * fxFade(g)})`; g.shadowBlur = r * 1.1; }
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  gr.addColorStop(0, '#ffd592'); gr.addColorStop(0.55, '#ffb547'); gr.addColorStop(1, '#ef8e1c');
  disc(g, x, y, r, gr);
  g.restore();
  g.save();
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
  const hl = g.createRadialGradient(x - r * 0.4, y - r * 0.55, 0, x - r * 0.4, y - r * 0.55, r * 1.1);
  hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.restore();
  txt(g, '安', x, y + r * 0.02, { font: f(600, Math.round(r * 1.0)), color: '#3a2000', align: 'center', base: 'middle' });
}
export function avatarAn2(g, x, y, r, amber = 0) {
  g.save();
  if (amber > 0 && fxFade(g) > 0) { g.shadowColor = `rgba(255,181,71,${0.9 * amber * fxFade(g)})`; g.shadowBlur = r * 1.2; }
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e6f1ff'); gr.addColorStop(1, '#b8d6fb');
  disc(g, x, y, r, gr);
  g.restore();
  g.save(); g.strokeStyle = 'rgba(42,111,214,0.25)'; g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 0, Math.PI * 2); g.stroke(); g.restore();
  txt(g, '安', x - r * 0.1, y + r * 0.04, { font: f(600, Math.round(r * 0.92)), color: '#174a96', align: 'center', base: 'middle' });
  txt(g, '2', x + r * 0.5, y - r * 0.28, { font: f(700, Math.round(r * 0.42)), color: '#2a6fd6', align: 'center', base: 'middle' });
}

// ---------- texture helpers ----------
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// fine speckle noise (alpha) for ink, grain and CCTV sensor noise
export function noiseCanvas(w, h, seed, density = 0.5, maxA = 1) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const id = g.createImageData(w, h), r = mulberry32(seed);
  for (let i = 0; i < w * h; i++) {
    const v = r();
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = v < density ? Math.round(255 * maxA * r()) : 0;
  }
  g.putImageData(id, 0, 0);
  return c;
}
