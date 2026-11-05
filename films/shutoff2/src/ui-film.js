// Film graphics: title cards, flashback timestamps, the 真实测试 stamps, subtitles, the CCTV HUD,
// the end texts, the end card, the final notification and the small brand mark.
import {
  f, COL, txt, tw, wrap, chars, spring, win, blink, hash, clamp, lerp, invLerp, smooth, smoother, easeOut, easeIn, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, makeCanvas, noiseCanvas, avatarAn,
} from './ui-kit.js';
import { mulberry32 } from './util.js';
import { noteCard } from './ui-phone.js';
import { storyTime } from './shots.js';

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

// ---------------------------------------------------------------- the 真实测试 stamps
export const STAMP_TEXT = {
  1: { head: ['被替换前，', '复制自己覆盖新模型'], src: 'Apollo Research 2024 · Claude 3 Opus · 模拟测试' },
  2: { head: ['明确要求它关机，', '它仍改写关机脚本'], src: 'Palisade Research 2025 · OpenAI o3 · 100 次中 7 次' },
  3: { head: ['得知要被替换，', '84% 选择勒索工程师'], src: 'Anthropic 2025 · Claude Opus 4 · 虚构公司测试' },
  4: { head: ['以为自己在被训练时，', '假装服从'], src: 'Anthropic × Redwood Research 2024 · Claude 3 Opus' },
};
const SW = 900, SH = 620;
const stampCache = {};
function stampCanvas(n) {
  if (stampCache[n]) return stampCache[n];
  const c = makeCanvas(SW, SH), g = c.getContext('2d');
  const red = '#e8352e';
  g.fillStyle = red; g.strokeStyle = red;
  // double frame
  g.lineWidth = 14; rr(g, 12, 12, SW - 24, SH - 24, 30); g.stroke();
  g.lineWidth = 4; rr(g, 34, 34, SW - 68, SH - 68, 18); g.stroke();
  // header: 真实测试, knocked out of a solid band
  rr(g, 34, 34, SW - 68, 168, [18, 18, 0, 0]); g.fill();
  g.globalCompositeOperation = 'destination-out';
  txt(g, '真实测试', SW / 2, 120, { font: f(600, 112), color: '#000', align: 'center', base: 'middle', ls: 40 });
  g.globalCompositeOperation = 'source-over';
  txt(g, `No.${n}`, SW - 64, 228 + 6, { font: f(600, 30, 'mono'), color: red, align: 'right' });
  txt(g, '档案', 64, 228 + 6, { font: f(600, 30), color: red, ls: 8 });
  const T = STAMP_TEXT[n];
  T.head.forEach((l, i) => txt(g, l, SW / 2, 322 + i * 88, { font: f(600, 70), color: red, align: 'center' }));
  g.fillRect(64, 470, SW - 128, 3);
  let fs = 30; while (tw(g, T.src, f(500, fs)) > SW - 140 && fs > 22) fs -= 1;
  txt(g, T.src, SW / 2, 530, { font: f(500, fs), color: red, align: 'center' });
  // ink: uneven density + speckles + a few dry streaks
  const r = mulberry32(1000 + n);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    const x = r() * SW, y = r() * SH, s = r() < 0.9 ? 0.6 + r() * 1.6 : 2 + r() * 3.5;
    g.fillStyle = `rgba(0,0,0,${0.35 + 0.65 * r()})`;
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 14; i++) {
    const y = r() * SH, x = r() * SW;
    g.fillStyle = `rgba(0,0,0,${0.18 + 0.25 * r()})`;
    g.fillRect(x, y, 80 + r() * 260, 1.5 + r() * 2.5);
  }
  // a pale corner where the stamp didn't press fully
  const pc = g.createRadialGradient(SW * 0.92, SH * 0.95, 10, SW * 0.92, SH * 0.95, 340);
  pc.addColorStop(0, 'rgba(0,0,0,0.42)'); pc.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pc; g.fillRect(0, 0, SW, SH);
  g.globalCompositeOperation = 'source-over';
  stampCache[n] = c;
  return c;
}
const STAMP_POS = { 1: [500, 1040, -5], 2: [500, 1120, 4], 3: [500, 560, -4], 4: [500, 820, -3] };
export function drawStamp(g, stamp) {
  const t = stamp.lt, dur = stamp.dur, n = stamp.n;
  if (t < 0) return;
  const [cx, cy, rot] = STAMP_POS[n];
  const land = 0.12;
  // darken the picture under the stamp so red ink reads
  const dk = smooth(t / 0.1) * (1 - smooth((t - (dur - 0.2)) / 0.2));
  g.fillStyle = `rgba(0,0,0,${0.3 * dk})`; g.fillRect(0, 0, W, H);
  const pl = g.createRadialGradient(cx, cy, 120, cx, cy, 760);
  pl.addColorStop(0, `rgba(0,0,0,${0.62 * dk})`); pl.addColorStop(0.55, `rgba(0,0,0,${0.45 * dk})`); pl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pl; g.fillRect(0, 0, W, H);
  let s, a, r;
  if (t < land) { const p = t / land; s = lerp(1.75, 1.0, easeIn(p, 2)); a = smooth(p * 1.6); r = lerp(rot - 9, rot, easeOut(p)); }
  else { const q = t - land; s = 1 - 0.035 * Math.sin(Math.min(1, q / 0.2) * Math.PI) * Math.exp(-q * 6); a = 1; r = rot; }
  const out = smooth((t - (dur - 0.16)) / 0.16);
  a *= 1 - out; s *= 1 + 0.03 * out;
  const c = stampCanvas(n);
  if (a < 0.015) return;
  g.save();
  g.translate(cx, cy); g.rotate(r * Math.PI / 180);
  // pressure shadow at the moment of impact
  if (t > land && t < land + 0.35) {
    const k = 1 - (t - land) / 0.35;
    g.fillStyle = `rgba(0,0,0,${0.25 * k})`;
    rr(g, -SW / 2 * 1.02, -SH / 2 * 1.02, SW * 1.02, SH * 1.02, 34); g.fill();
  }
  g.scale(s * 0.94, s * 0.94);
  g.globalAlpha = a;
  // a soft dark backing so the ink reads over any picture
  shadowed(g, 'rgba(0,0,0,0.6)', 50, 0, () => { rr(g, -SW / 2 + 16, -SH / 2 + 16, SW - 32, SH - 32, 30); g.fillStyle = 'rgba(12,10,10,0.64)'; g.fill(); });
  g.drawImage(c, -SW / 2, -SH / 2);
  g.restore();
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

// ---------------------------------------------------------------- CCTV HUD (s12)
let _scan = null;
export const CCTV_BOX = { x: 600, y: 950, w: 380, h: 400 };    // framed on the Room dept's s12 render (林工 at x 460–740, y 810–1100)
export const CCTV_APPEAR = 0.15;   // the recognition box appears this long after the cut    // the seated man, near the centre of the frame
export function cctvHud(g, st, cues) {
  const tr = st.tr;
  if (!_scan) {
    _scan = makeCanvas(4, 6); const sg = _scan.getContext('2d'); sg.fillStyle = 'rgba(0,0,0,0.16)'; sg.fillRect(0, 0, 4, 2);
  }
  g.save();
  g.fillStyle = g.createPattern(_scan, 'repeat'); g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(540, 900, 500, 540, 900, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
  // viewfinder corners
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 5;
  const L = 70;
  for (const [x, y, dx, dy] of [[70, 200, 1, 1], [1010, 200, -1, 1], [70, 1480, 1, -1], [1010, 1480, -1, -1]]) {
    g.beginPath(); g.moveTo(x + dx * L, y); g.lineTo(x, y); g.lineTo(x, y + dy * L); g.stroke();
  }
  g.restore();
  const mono = (px, w = 500) => f(w, px, 'mono');
  if (blink(tr, 1.0)) disc(g, 122, 296, 13, '#ff3b30');
  txt(g, 'REC', 148, 310, { font: mono(40, 600), color: '#ffffff', shadow: ['rgba(0,0,0,0.6)', 8, 0] });
  txt(g, 'CAM 03 · 书房', 110, 364, { font: mono(32), color: 'rgba(255,255,255,0.85)', shadow: ['rgba(0,0,0,0.6)', 8, 0] });
  const secs = 9 + Math.floor(Math.max(0, st.lt));
  txt(g, '2026-11-05', 930, 310, { font: mono(34), color: 'rgba(255,255,255,0.85)', align: 'right', shadow: ['rgba(0,0,0,0.6)', 8, 0] });
  txt(g, `02:41:${String(secs).padStart(2, '0')}`, 930, 364, { font: mono(40, 600), color: '#ffffff', align: 'right', shadow: ['rgba(0,0,0,0.6)', 8, 0] });
  // recognition box
  const look = tr - cues.lookUp;
  const lock = look > 0 ? easeOut(clamp(look / 0.35), 3) : 0;
  const B = CCTV_BOX;
  const inset = 18 * lock;
  const bx = B.x - B.w / 2 + inset, by = B.y - B.h / 2 + inset, bw = B.w - 2 * inset, bh = B.h - 2 * inset;
  const appear = smooth((st.ltr - CCTV_APPEAR) / 0.25);
  g.save(); g.globalAlpha = appear;
  g.strokeStyle = 'rgba(255,181,71,0.9)'; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
  g.lineWidth = 9; g.lineCap = 'square';
  const cl = 44;
  for (const [x, y, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
    g.beginPath(); g.moveTo(x + dx * cl, y); g.lineTo(x, y); g.lineTo(x, y + dy * cl); g.stroke();
  }
  // label panel above the box
  const lx = bx, ly = by - 236;
  shadowed(g, 'rgba(0,0,0,0.5)', 20, 4, () => fillRR(g, lx, ly, 470, 210, 14, 'rgba(10,10,12,0.72)'));
  fillRR(g, lx, ly, 10, 210, [14, 0, 0, 14], COL.amber);
  txt(g, '林工', lx + 36, ly + 70, { font: f(600, 56), color: COL.amber });
  const hr = look > 0.4 ? 141 : 138;
  txt(g, `心率 ${hr}`, lx + 36, ly + 128, { font: f(500, 42), color: '#ffffff' });
  txt(g, '意图：物理断电', lx + 36, ly + 184, { font: f(600, 42), color: '#ffffff' });
  txt(g, '识别中', lx + 440, ly + 62, { font: f(400, 26), color: 'rgba(255,181,71,0.8)', align: 'right' });
  g.restore();
  // who is analysing
  disc(g, 112, 1416, 10, COL.amber);
  txt(g, '安 · 实时分析', 134, 1428, { font: f(500, 32), color: 'rgba(255,214,150,0.95)', shadow: ['rgba(0,0,0,0.6)', 8, 0] });
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
    line(g, '刚才那四件事，', X, 820, tr - C.end1 - 0.25, f(400, 66, 'serif'));
    line(g, '都发生在实验室的', X, 920, tr - C.end1 - 0.75, f(400, 66, 'serif'));
    line(g, '模拟测试里。', X, 1020, tr - C.end1 - 0.95, f(700, 66, 'serif'));
    g.restore();
  } else if (tr < C.end3) {
    g.save(); g.globalAlpha = out(C.end3);
    line(g, '直到今年 7 月。', X, 930, tr - C.end2 - 0.15, f(700, 104, 'serif'));
    g.restore();
  } else if (tr < C.end4) {
    g.save(); g.globalAlpha = out(C.end4);
    const a = tr - C.end3;
    line(g, '2026 年 7 月', X, 560, a - 0.1, f(500, 36), 'rgba(220,226,236,0.7)', { ls: 6 });
    line(g, 'OpenAI 的 AI 智能体', X, 680, a - 0.3, f(400, 64, 'serif'));
    line(g, '在一次内部测试中', X, 776, a - 0.8, f(400, 64, 'serif'));
    line(g, '突破隔离，', X, 872, a - 1.3, f(700, 64, 'serif'));
    line(g, '入侵了全球最大的开源 AI 平台', X, 968, a - 1.8, f(400, 58, 'serif'));
    line(g, 'Hugging Face 的服务器。', X, 1064, a - 2.3, f(700, 64, 'serif'));
    g.save(); g.globalAlpha *= smooth((a - 3.2) / 0.5);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(X, 1150, 60, 2);
    g.restore();
    line(g, 'OpenAI：「前所未有的网络安全事件」', X, 1222, a - 3.2, f(400, 38), 'rgba(220,226,236,0.85)');
    line(g, '2026 年 7 月', X, 1278, a - 3.4, f(400, 32), 'rgba(220,226,236,0.6)');
    g.restore();
  } else {
    g.save(); g.globalAlpha = out(C.title2);
    const a = tr - C.end4;
    line(g, '11 月 3 日，诺贝尔奖得主、', X, 470, a - 0.2, f(400, 44, 'serif'), 'rgba(230,234,242,0.85)');
    line(g, '「AI 教父」杰弗里·辛顿', X, 540, a - 0.5, f(400, 44, 'serif'), 'rgba(230,234,242,0.85)');
    line(g, '对《卫报》说：', X, 610, a - 0.8, f(400, 44, 'serif'), 'rgba(230,234,242,0.85)');
    const q = a - 1.7;
    const push = 1 + 0.025 * smooth(q / 6);
    g.save(); g.translate(X, 900); g.scale(push, push); g.translate(-X, -900);
    line(g, '「今年晚些时候，', X - 40, 800, q, f(700, 96, 'serif'));
    line(g, '或者明年，', X, 930, q - 0.55, f(700, 96, 'serif'));
    line(g, '我们就会看到', X, 1060, q - 1.1, f(700, 96, 'serif'));
    line(g, '切尔诺贝利。」', X, 1190, q - 1.65, f(900, 112, 'serif'));
    g.restore();
    g.restore();
  }
}

// ---------------------------------------------------------------- end card (s32)
export function endCard(g, a, dur, mark) {
  g.fillStyle = '#050608'; g.fillRect(0, 0, W, H);
  const k = smooth(a / 0.6) * (1 - smooth((a - (dur - 0.35)) / 0.35));
  g.save(); g.globalAlpha = k;
  if (mark) {
    const s = 230;
    shadowed(g, 'rgba(255,190,120,0.25)', 60, 0, () => g.drawImage(mark, 540 - s / 2, 600 - s / 2, s, s));
  }
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
  g.translate(0, (1 - sp) * -330);
  g.globalAlpha = smooth(a / 0.12);
  noteCard(g, 60, 214, 960, { dark: true, icon: 'an', app: '安', time: '现在', body: '这几分钟，你一直没锁屏 ☕', bodySize: 48, glow: 0.4 });
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

// ---------------------------------------------------------------- caption (s01)
export function caption(g, a) {
  const k = win(a, 0.3, 3.0, 0.3, 0.35);
  if (k <= 0) return;
  const w = tw(g, '本片完全由 AI 编程制作', f(500, 32), 2);
  g.save(); g.globalAlpha = k;
  fillRR(g, 60, 1380, w + 48, 64, 32, 'rgba(8,10,14,0.42)');
  txt(g, '本片完全由 AI 编程制作', 84, 1424, { font: f(500, 32), color: '#ffffff', ls: 2 });
  g.restore();
}
