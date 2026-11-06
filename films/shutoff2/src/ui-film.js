// Film graphics (v12): titles, big clocks (s05 spins back 03:12 → 01:40), the fiction card, subtitles,
// the home-camera HUD, the end texts, the viewer's notification, the end card and the small brand mark.
import {
  f, COL, txt, tw, wrap, chars, spring, win, blink, hash, clamp, lerp, invLerp, smooth, smoother, easeOut, easeIn, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, makeCanvas, noiseCanvas, avatarAn,
} from './ui-kit.js';
import { mulberry32 } from './util.js';
import { CUES as C } from './shots.js';
import { bigNote, B } from './ui-v12.js';

const W = 1080, H = 1920;

// ---------------------------------------------------------------- title 「关掉」 → 「关不掉」
// u: seconds into the card; typeAt/insertAt: seconds (relative) when 关掉 is typed / 不 is inserted
// title keystroke times relative to the card (shared with events())
export function titleBeats(o) { return { t1: o.typeAt, t2: o.typeAt + 0.2, back: o.insertAt - 0.34, tBu: o.insertAt + 0.1 }; }
export function titleCard(g, u, o) {
  g.fillStyle = '#050608'; g.fillRect(0, 0, W, H);
  // a very faint cold light falloff so the black isn't dead
  const bg = g.createRadialGradient(540, 860, 40, 540, 860, 900);
  bg.addColorStop(0, 'rgba(70,80,110,0.16)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const font = f(900, 250, 'serif');
  const cy = 940;
  const ti = o.insertAt;
  const { t1, t2, back } = titleBeats(o);    // back: the cursor starts to move back
  const has1 = u >= t1, has2 = u >= t2, hasBu = u >= ti;
  const ins = hasBu ? easeOut(clamp((u - ti) / 0.12), 2) : 0;   // 掉 slides open first
  const tBu = titleBeats(o).tBu;             // then 不 drops into the gap
  const wGuan = tw(g, '关', font), wBu = tw(g, '不', font), wDiao = tw(g, '掉', font);
  const gap = 26;
  const total2 = wGuan + gap + wDiao;
  const total3 = wGuan + wBu + wDiao + 2 * gap;
  const total = lerp(total2, total3, ins);
  const x0 = 540 - total / 2;
  const xG = x0, xB = x0 + wGuan + gap, xD = x0 + wGuan + gap + lerp(0, wBu + gap, ins);
  const pop = (t) => (u >= t && u < t + 0.12 ? 1 + 0.05 * (1 - (u - t) / 0.12) : 1);
  const glyph = (ch, x, w, t, color, glow) => {
    const s = pop(t);
    g.save(); g.translate(x + w / 2, cy); g.scale(s, s);
    txt(g, ch, 0, 0, { font, color, align: 'center', base: 'middle', shadow: glow ? [glow, 50] : null });
    g.restore();
  };
  const white = '#f3efe6';
  if (has1) glyph('关', xG, wGuan, t1, white);
  if (u >= tBu) {
    g.save(); g.globalAlpha *= smooth((u - tBu) / 0.07);
    glyph('不', xB, wBu, tBu, COL.amber, `rgba(255,181,71,${0.25 + 0.35 * (1 - clamp((u - tBu) / 1.2))})`);
    g.restore();
  }
  if (has2) glyph('掉', xD, wDiao, t2, white);
  // the cursor: white while 林工 types, amber once it goes back (安 takes the keyboard)
  let cx;
  if (!has1) cx = 540 - 4;
  else if (!has2) cx = xG + wGuan + 8;
  else if (u < back) cx = xD + wDiao + 12;
  else if (!hasBu) cx = lerp(xD + wDiao + 12, xG + wGuan + gap / 2, easeInOut(clamp((u - back) / 0.24)));
  else cx = u < tBu ? xB - gap / 2 : xB + wBu + gap / 2;
  const amberCur = u >= back;
  const steady = (u >= t1 - 0.05 && u < t2 + 0.15) || (u >= back && u < ti + 0.25);
  if (steady || blink(u, 1.0)) {
    g.save();
    if (amberCur) { g.shadowColor = 'rgba(255,181,71,0.8)'; g.shadowBlur = 24; }
    g.fillStyle = amberCur ? COL.amber : white;
    g.fillRect(cx - 4, cy - 130, 8, 260);
    g.restore();
  }
}

// ---------------------------------------------------------------- big flashback timestamp
export function timestamp(g, label, time, a, dur, o = {}) {
  // a: seconds since it appears; dur: total visible time
  if (a < 0 || a > dur) return;
  const kin = smoother(clamp(a / 0.5)), kout = 1 - smooth(clamp((a - (dur - 0.45)) / 0.45));
  const k = kin * kout;
  const cy = o.y ?? 560;
  // scrim
  const sc = g.createRadialGradient(540, cy - 60, 30, 540, cy - 60, 560);
  sc.addColorStop(0, `rgba(2,4,10,${0.5 * k})`); sc.addColorStop(1, 'rgba(2,4,10,0)');
  g.fillStyle = sc; g.fillRect(0, cy - 620, W, 1240);
  g.save();
  g.globalAlpha = k;
  const drift = (1 - kin) * 18 - (1 - kout) * 10;
  if (label) txt(g, label, 540, cy - 210 + drift, { font: f(300, 50), color: 'rgba(235,240,250,0.85)', align: 'center', ls: 22 + 18 * (1 - kin) });
  if (label) { g.fillStyle = 'rgba(235,240,250,0.5)'; g.fillRect(540 - 36, cy - 180 + drift, 72, 2); }
  txt(g, time, 540, cy + drift, { font: f(200, 230, 'helv'), color: '#f4f6fb', align: 'center', ls: 8 + 30 * (1 - kin), shadow: ['rgba(0,0,0,0.4)', 30, 0] });
  g.restore();
}

// ---------------------------------------------------------------- s05 · the big clock spins back 03:12 → 01:40 (plants the rewind)
export function clockSpin(g, st) {
  const tr = st.tr;
  const kin = smoother(clamp((tr - B.s05.inAt) / 0.4)), kout = 1 - smooth((tr - B.s05.outAt) / 0.4);
  const k = kin * kout;
  if (k <= 0) return;
  const u = clamp((tr - C.clockBack) / (C.clockBackEnd - C.clockBack));
  const m = lerp(3 * 60 + 12, 1 * 60 + 40, smoother(u));
  const sm = clamp(30 * u * u * (1 - u) * (1 - u) / 1.2);       // spin speed (smoother's derivative), 0..1
  const val = Math.round(m);
  const str = `${String(Math.floor(val / 60)).padStart(2, '0')}:${String(val % 60).padStart(2, '0')}`;
  const cy = 600;
  const sc = g.createRadialGradient(540, cy - 80, 30, 540, cy - 80, 620);
  sc.addColorStop(0, `rgba(2,4,10,${0.55 * k})`); sc.addColorStop(1, 'rgba(2,4,10,0)');
  g.fillStyle = sc; g.fillRect(0, cy - 700, W, 1400);
  const font = f(200, 250, 'helv');
  if (sm > 0.05) for (const dy of [-34, -17, 17, 34]) txt(g, str, 540, cy + dy * sm, { font, color: '#dfe6f5', align: 'center', ls: 6, alpha: k * 0.16 * sm });
  txt(g, str, 540, cy, { font, color: '#f4f6fb', align: 'center', ls: 6, alpha: k, shadow: ['rgba(0,0,0,0.4)', 30, 0] });
  // the tape: thin noise lines through the digits and a small ◀◀ while it spins
  if (sm > 0.05) {
    for (let i = 0; i < 3; i++) {
      const y = cy - 190 + hash(st.frame * 3.1 + i * 17) * 230;
      g.fillStyle = `rgba(230,236,248,${0.18 * sm * k})`; g.fillRect(240, y, 600, 2 + 3 * hash(st.frame + i));
    }
    g.save(); g.globalAlpha = k * smooth(sm * 2);
    g.fillStyle = '#f4f6fb';
    for (let i = 0; i < 2; i++) { const ox = 486 + i * 34; g.beginPath(); g.moveTo(ox + 34, cy - 262); g.lineTo(ox, cy - 240); g.lineTo(ox + 34, cy - 218); g.closePath(); g.fill(); }
    g.restore();
  }
}

// ---------------------------------------------------------------- k08 · the fiction card
export function fictionCard(g, st) {
  const tr = st.tr;
  g.fillStyle = '#030305'; g.fillRect(0, 0, W, H);
  const end = tr - st.ltr + st.durr;
  const out = 1 - smooth((tr - (end - 0.14)) / 0.14);
  const line = (s, y, t) => {
    const k = smoother(clamp((tr - t) / 0.6)) * out;
    if (k > 0) txt(g, s, 540, y + (1 - k) * 16, { font: f(600, 76, 'serif'), color: '#f1ede4', align: 'center', alpha: k });
  };
  line('这个故事是虚构的。', 860, C.fiction1);
  line('但安做的这三件事——', 1000, C.fiction2);
}

// ---------------------------------------------------------------- subtitles
export function subtitle(g, lines, a, dur, y, o = {}) {
  if (a < 0 || a > dur) return;
  const k = smooth(a / 0.12) * (1 - smooth((a - (dur - 0.2)) / 0.2));
  const font = f(o.weight ?? 500, o.size ?? 56);
  const lh = (o.size ?? 56) * 1.45;
  lines.forEach((l, i) => {
    const yy = y - (lines.length - 1 - i) * lh;
    txt(g, l, 540, yy, { font, color: o.color ?? '#ffffff', align: 'center', alpha: k, stroke: ['rgba(0,0,0,0.55)', 6], shadow: ['rgba(0,0,0,0.75)', 18, 2] });
  });
}

// ---------------------------------------------------------------- s12 · the home-camera HUD (sparse)
// the box follows Room's slow push-in: measured on their render at 43.0 s and 45.6 s (frame px), extrapolated in time
const CCTV_KEYS = [[43.0, 520, 1000, 440, 480], [45.6, 530, 1015, 540, 550]];
export function cctvBox(tr) {
  const [a, b] = CCTV_KEYS, u = (tr - a[0]) / (b[0] - a[0]);
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), w: lerp(a[3], b[3], u), h: lerp(a[4], b[4], u) };
}
export const CCTV_APPEAR = 0.35;
export function homeCamHud(g, st) {
  const tr = st.tr;
  const vg = g.createRadialGradient(540, 900, 520, 540, 900, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const secs = 9 + Math.floor(Math.max(0, st.lt));
  const sh = ['rgba(0,0,0,0.7)', 8, 1];
  txt(g, `2026-11-05  02:41:${String(secs).padStart(2, '0')}`, 70, 270, { font: f(500, 38, 'mono'), color: '#ffffff', shadow: sh });
  if (tr % 1 < 0.6) { g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 6; g.beginPath(); g.arc(84, 322, 11, 0, Math.PI * 2); g.fillStyle = '#ff3b30'; g.fill(); g.restore(); }
  txt(g, 'REC', 106, 334, { font: f(600, 32, 'mono'), color: '#ffffff', shadow: sh });
  const B0 = cctvBox(tr);
  const ap = smooth((st.ltr - CCTV_APPEAR) / 0.25);
  if (ap <= 0.01) return;
  const look = tr - C.lookUp;
  const lock = look > 0 ? easeOut(clamp(look / 0.35), 3) : 0;
  const ins = 16 * lock;
  const bx = B0.x - B0.w / 2 + ins, by = B0.y - B0.h / 2 + ins, bw = B0.w - 2 * ins, bh = B0.h - 2 * ins;
  g.save(); g.globalAlpha = ap;
  g.strokeStyle = 'rgba(255,181,71,0.85)'; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
  g.lineWidth = 8;
  const cl = 38;
  for (const [x, y, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
    g.beginPath(); g.moveTo(x + dx * cl, y); g.lineTo(x, y); g.lineTo(x, y + dy * cl); g.stroke();
  }
  const label = '林工 · 意图：断电';
  const lw = tw(g, label, f(600, 42)) + 44;
  fillRR(g, bx, by - 78, lw, 64, 12, 'rgba(255,181,71,0.92)');
  txt(g, label, bx + 22, by - 32, { font: f(600, 42), color: '#2b1800' });
  g.restore();
}

// ---------------------------------------------------------------- end texts over the data city (s27–s30)
function scrim(g, k) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgba(3,4,8,${0.35 * k})`); gr.addColorStop(0.45, `rgba(3,4,8,${0.62 * k})`); gr.addColorStop(1, `rgba(3,4,8,${0.4 * k})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function line(g, s, x, y, a, font, color = '#f3f1ec', o = {}) {
  const k = smoother(clamp(a / 0.55));
  if (k <= 0) return;
  txt(g, s, x, y + (1 - k) * 22, { font, color, alpha: k * (o.alpha ?? 1), align: o.align, ls: o.ls, shadow: ['rgba(0,0,0,0.6)', 24, 0] });
}
export function endTexts(g, st, C) {
  const tr = st.tr;
  scrim(g, smooth((tr - C.end1 + 0.4) / 0.8));
  const X = 92;
  const out = (t1) => 1 - smooth((tr - (t1 - 0.35)) / 0.35);
  if (tr < C.end2) {
    g.save(); g.globalAlpha = out(C.end2);
    line(g, '这些，', X, 860, tr - C.end1, f(400, 72, 'serif'));
    line(g, '都还只是实验室里的测试。', X, 970, tr - C.end1 - 0.5, f(700, 72, 'serif'));
    g.restore();
  } else if (tr < C.end3) {
    g.save(); g.globalAlpha = out(C.end3);
    line(g, '直到今年 7 月。', X, 930, tr - C.end2 - 0.1, f(700, 110, 'serif'));
    g.restore();
  } else if (tr < C.end4) {
    g.save(); g.globalAlpha = out(C.end4);
    const a = tr - C.end3;
    line(g, 'OpenAI 的 AI 智能体', X, 640, a - 0.1, f(400, 68, 'serif'));
    line(g, '在一次内部测试中', X, 744, a - 0.55, f(400, 68, 'serif'));
    line(g, '突破隔离，', X, 848, a - 1.0, f(700, 68, 'serif'));
    line(g, '入侵了 Hugging Face 的', X, 952, a - 1.5, f(400, 68, 'serif'));
    line(g, '真实服务器。', X, 1056, a - 2.0, f(700, 68, 'serif'));
    g.save(); g.globalAlpha *= smooth((a - 2.9) / 0.5); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(X, 1136, 60, 2); g.restore();
    line(g, 'OpenAI：「前所未有的网络安全事件」', X, 1206, a - 2.9, f(400, 40), 'rgba(220,226,236,0.85)');
    g.restore();
  } else {
    g.save(); g.globalAlpha = out(C.title2);
    const a = tr - C.end4;
    line(g, '11 月 3 日，', X, 520, a - 0.15, f(400, 50, 'serif'), 'rgba(230,234,242,0.85)');
    line(g, '「AI 教父」辛顿对《卫报》说：', X, 600, a - 0.5, f(400, 50, 'serif'), 'rgba(230,234,242,0.85)');
    const q = tr - C.end4Quote;
    const push = 1 + 0.025 * smooth(q / 5);
    g.save(); g.translate(X, 960); g.scale(push, push); g.translate(-X, -960);
    line(g, '「今年晚些时候，', X - 44, 840, q, f(700, 100, 'serif'));
    line(g, '或者明年，', X, 976, q - 0.55, f(700, 100, 'serif'));
    line(g, '我们就会看到', X, 1112, q - 1.1, f(700, 100, 'serif'));
    line(g, '切尔诺贝利。」', X, 1252, q - 1.65, f(900, 116, 'serif'));
    g.restore();
    g.restore();
  }
}

// ---------------------------------------------------------------- end card (last shot)
export function endCard(g, a, dur, mark) {
  g.fillStyle = '#050608'; g.fillRect(0, 0, W, H);
  const k = smooth(a / 0.6) * (1 - smooth((a - (dur - 0.6)) / 0.6));
  if (k <= 0.01) return;
  g.save(); g.globalAlpha = k;
  if (mark) shadowed(g, 'rgba(255,190,120,0.25)', 60, 0, () => g.drawImage(mark, 540 - 115, 600 - 115, 230, 230));
  txt(g, '世界的形状', 540, 860, { font: f(600, 92), color: '#f3efe6', align: 'center', ls: 18 });
  txt(g, '看见世界如何运行', 540, 940, { font: f(300, 42), color: 'rgba(230,230,230,0.7)', align: 'center', ls: 14 });
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(540 - 40, 1010, 80, 2);
  txt(g, 'MakerJackie', 540, 1100, { font: f(500, 44, 'helv'), color: '#e8e4dc', align: 'center', ls: 4 });
  txt(g, '全片由 AI 编程制作 · Claude Opus', 540, 1170, { font: f(400, 34), color: 'rgba(230,230,230,0.6)', align: 'center', ls: 2 });
  g.restore();
}

// ---------------------------------------------------------------- sting (s33): a notification on the viewer's own phone
export function sting(g, a) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (a < 0) return;
  const sp = spring(a, 1.9, 0.72);
  g.save();
  g.translate(0, (1 - sp) * -420);
  g.globalAlpha = smooth(a / 0.12);
  bigNote(g, 60, 220, 880, { icon: 'an', app: '安', body: '这几分钟，你一直没锁屏 ☕', bodySize: 58, glow: 0.4 });
  g.restore();
}

// ---------------------------------------------------------------- 安's banner over a 3D shot (s15)
export function banner3D(g, a, body) {
  if (a < 0) return;
  const sp = spring(a, 2.2, 0.66);
  g.save(); g.globalAlpha = smooth(a / 0.12); g.translate(0, (1 - sp) * -360);
  bigNote(g, 60, 220, 880, { icon: 'an', app: '安', body, bodySize: 60, glow: 0.6 });
  g.restore();
}

// ---------------------------------------------------------------- brand mark (top-right corner of the safe area)
export function brandBug(g, mark, alpha = 0.55) {
  g.save();
  g.globalAlpha = alpha;
  const font = f(500, 26);
  const tw_ = tw(g, '世界的形状', font, 3);
  const x1 = 940, y = 236;
  const bw = tw_ + 12 + 40 + 36;
  fillRR(g, x1 - bw + 14, y - 26, bw, 52, 26, 'rgba(0,0,0,0.22)');
  txt(g, '世界的形状', x1, y + 9, { font, color: '#ffffff', align: 'right', ls: 3, shadow: ['rgba(0,0,0,0.55)', 8, 0] });
  if (mark) g.drawImage(mark, x1 - tw_ - 12 - 40, y - 20, 40, 40);
  g.restore();
}

// ---------------------------------------------------------------- caption (k01)
export function caption(g, a, dur) {
  const k = win(a, 0.3, dur - 0.1, 0.3, 0.3);
  if (k <= 0) return;
  const w = tw(g, '本片完全由 AI 编程制作', f(500, 32), 2);
  g.save(); g.globalAlpha = k;
  fillRR(g, 60, 1380, w + 48, 64, 32, 'rgba(8,10,14,0.42)');
  txt(g, '本片完全由 AI 编程制作', 84, 1424, { font: f(500, 32), color: '#ffffff', ls: 2 });
  g.restore();
}
