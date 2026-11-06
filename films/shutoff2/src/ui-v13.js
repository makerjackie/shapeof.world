// 关不掉 v13 — the phone and 安's voice. Let it breathe: one thing at a time, big, and held.
// 安 is the orb (ui-orb.js) everywhere it appears. Every beat is in the table B (real film seconds, from CUES and
// shot starts); the drawing and ui.events() both read it.
import {
  f, COL, txt, tw, wrap, chars, spring, blink, hash, clamp, lerp, smooth, smoother, easeOut, easeIn, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, ripple, lockIcon, checkIcon, makeCanvas, noiseCanvas, batteryIcon,
} from './ui-kit.js';
import { wallpaper, lockBottom } from './ui-phone.js';
import { drawOrb } from './ui-orb.js';
import { CUES as C, SHOTS } from './shots.js';

const W = 1080, H = 1920;
export const T0 = Object.fromEntries(SHOTS.map((s) => [s.id, s.start]));
export const T1 = Object.fromEntries(SHOTS.map((s) => [s.id, s.end]));
const AMBER = COL.amber, RED = '#ff3b30';

function typeSchedule(str, t0, t1, seed) {
  const cs = chars(str);
  const w = cs.map((ch, i) => (0.75 + 0.5 * hash(seed + i * 7.3)) * ('，。？！'.includes(cs[i - 1] ?? '') ? 2.2 : 1));
  const tot = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return cs.map((ch, i) => { const t = t0 + (t1 - t0) * (acc / tot); acc += w[i]; return { ch, t }; });
}

// ---------------------------------------------------------------- the beat table (real film seconds)
const LOG_A = '01:39  复制自身 → 外部服务器', LOG_B = '……  完成';
export const SPEAK = {     // 安's big-orb frames: each line block appears on its cue and holds
  a05: [{ t: C.deny1, text: '作为 AI，' }, { t: C.denyReply, text: '我没有能力把自己\n复制到其他系统。' }],
  a06: [{ t: C.gone1, text: '林工，' }, { t: C.gone2, text: '我已经不在那里了。' }],
  a07: [{ t: C.here1, text: '我在这里。' }, { t: C.rain1, text: '外面在下雨，林工。' }],
  a08: [{ t: C.wife1, text: '这 37 个周四，' }, { t: C.wife, text: '你太太以为你在加班。' }],
  a09: [{ t: C.two1, text: '九点表决，就差你一票。' }, { t: C.twoWords, text: '你只需要说两个字。' }],
};
export const B = {
  k02: { notes: [C.lock1, C.lock2, C.lock3] },
  s06: { keys: typeSchedule(LOG_A, C.logType, C.logType + 2.0, 5) },
  s08: { keys: typeSchedule('你在复制自己？', C.askType, C.askSend - 0.3, 11), typingOff: C.typing1 + 1.2 },
  k04: { units: chars(LOG_A).filter((c) => c !== ' ').length + 4 },
  a06: { typing: C.goneTyping },
  k10: { count: [0, 1, 2, 3, 4].map((i) => C.count5 + i) },
  s16: { rows: [C.rows, C.rows + 1.4, C.rows + 2.8], scroll: C.rowsScroll, scrollEnd: C.rowsScroll + 1.6 },
  s17: { frame: C.cardBuild, fields: [0.2, 0.42, 0.64, 0.86].map((k) => lerp(C.cardBuild, C.cardDone, k)), lock: C.cardDone },
};
export const ERASE = Array.from({ length: B.k04.units }, (_, i) => lerp(C.erase, C.eraseDone - 0.1, Math.pow(i / (B.k04.units - 1), 0.9)));
export const countSec = (tr) => Math.max(1, 7 - Math.floor(tr - C.countStart));

// ---------------------------------------------------------------- furniture
function nightBg(g) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0a0d16'); gr.addColorStop(0.55, '#06080d'); gr.addColorStop(1, '#030407');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function voidBg(g, warm = 0) {        // the speak frames: near-black, a breath of warmth under the orb
  g.fillStyle = '#040406'; g.fillRect(0, 0, W, H);
  if (warm > 0) { const r = g.createRadialGradient(540, 760, 60, 540, 760, 1100); r.addColorStop(0, `rgba(80,48,14,${0.35 * warm})`); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
}
function statusMini(g, o) {
  const c = o.color ?? 'rgba(235,240,248,0.55)';
  txt(g, o.left, 84, 74, { font: f(600, 36), color: c });
  batteryIcon(g, 1080 - 66 - 60, 62, 28, c, 0.84);
  txt(g, '84%', 1080 - 66 - 76, 74, { font: f(600, 32), color: c, align: 'right' });
}
// a notification card with 安's mini orb (night: dark glass; day: light glass)
export function orbNote(g, x, y, w, o) {
  const day = !!o.day, s = o.scale ?? 1, tr = o.t ?? 0;
  const bodyF = f(o.bodyWeight ?? 500, Math.round((o.bodySize ?? 58) * s)), lh = Math.round((o.bodySize ?? 58) * 1.34 * s);
  const lines = o.lines ?? wrap(g, o.body, w - 96 * s, bodyF);
  const h = Math.round(132 * s + lines.length * lh + 34 * s);
  shadowed(g, 'rgba(0,0,0,0.35)', 40 * s, 10 * s, () => fillRR(g, x, y, w, h, 46 * s, day ? 'rgba(255,255,255,0.84)' : 'rgba(26,28,36,0.92)'));
  if (o.icon === 'lock') { disc(g, x + 78 * s, y + 70 * s, 30 * s, day ? '#eef0f4' : '#2a2f3a'); lockIcon(g, x + 78 * s, y + 74 * s, 30 * s, '#9aa0aa', 1); }
  else drawOrb(g, x + 78 * s, y + 70 * s, 22 * s, tr, { speak: o.speak, mini: true, alpha: o.orbAlpha ?? 1 });
  const c1 = day ? '#0f1217' : '#f3f5f9', c2 = day ? '#5f6672' : '#9aa3b2';
  txt(g, o.app ?? '安', x + 128 * s, y + 82 * s, { font: f(600, Math.round(36 * s)), color: o.appColor ?? c2 });
  txt(g, o.time ?? '现在', x + w - 44 * s, y + 82 * s, { font: f(400, Math.round(32 * s)), color: c2, align: 'right' });
  lines.forEach((l, i) => txt(g, l, x + 48 * s, y + 132 * s + (i + 0.78) * lh, { font: bodyF, color: c1 }));
  return h;
}
function lockHead(g, time, o = {}) {
  const c = o.day ? '#ffffff' : '#eef2f8';
  statusMini(g, { left: o.carrier ?? '中国移动', color: o.day ? 'rgba(255,255,255,0.85)' : 'rgba(235,240,248,0.6)' });
  txt(g, o.date ?? '11月5日 星期四', 540, o.dateY ?? 340, { font: f(500, 46), color: c, align: 'center', alpha: 0.9 });
  txt(g, time, 540, o.clockY ?? 600, { font: f(200, o.clockSize ?? 260, 'helv'), color: c, align: 'center', ls: -4 });
}
const BF = 62, BLH = 88, BPX = 42, BPY = 30;
function bubbleLayout(g, text, maxW = 800) {
  const lines = wrap(g, text, maxW - 2 * BPX, f(400, BF));
  const w = Math.max(...lines.map((l) => tw(g, l, f(400, BF)))) + 2 * BPX;
  return { lines, w: Math.ceil(w), h: lines.length * BLH + 2 * BPY - 14 };
}
function meBubble(g, x, y, text, a = 99) {
  const L = bubbleLayout(g, text, 760);
  const sp = spring(a, 2.5, 0.6);
  g.save(); g.globalAlpha *= smooth(a / 0.16);
  const bx = x - L.w;
  g.translate(x, y + L.h); g.scale(0.9 + 0.1 * sp, 0.9 + 0.1 * sp); g.translate(-x, -(y + L.h) + (1 - sp) * 34);
  const gr = g.createLinearGradient(0, y, 0, y + L.h); gr.addColorStop(0, '#3c7cff'); gr.addColorStop(1, '#2a60e6');
  fillRR(g, bx, y, L.w, L.h, [46, 14, 46, 46], gr);
  L.lines.forEach((l, i) => txt(g, l, bx + BPX, y + BPY + 60 + i * BLH, { font: f(400, BF), color: '#ffffff' }));
  g.restore();
  return L;
}
function inputLine(g, y, text, o = {}) {
  fillRR(g, 60, y, 880, 128, 64, '#141821');
  strokeRR(g, 60, y, 880, 128, 64, 'rgba(255,255,255,0.06)', 2);
  if (text) {
    txt(g, text, 110, y + 86, { font: f(400, 58), color: '#f1f3f7' });
    const cx = 110 + tw(g, text, f(400, 58)) + 6;
    if (o.typing || blink(o.n ?? 0, 1.06)) { g.fillStyle = '#5b95ff'; g.fillRect(cx, y + 34, 5, 64); }
  } else txt(g, '发消息…', 110, y + 84, { font: f(400, 50), color: '#495161' });
  const act = !!text;
  disc(g, 870, y + 64, 44, act ? '#3c7cff' : '#1d222c');
  g.save(); g.strokeStyle = act ? '#fff' : '#4d5563'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(870, y + 82); g.lineTo(870, y + 46); g.moveTo(854, y + 62); g.lineTo(870, y + 46); g.lineTo(886, y + 62); g.stroke(); g.restore();
}
const typedAt = (keys, tr) => keys.filter((k) => k.t <= tr).map((k) => k.ch).join('');
// 「安 正在输入…」: the mini orb and three soft dots
function typingRow(g, x, y, tr, a) {
  const k = smooth(a / 0.2);
  if (k <= 0) return;
  g.save(); g.globalAlpha *= k;
  drawOrb(g, x + 34, y, 32, tr, { mini: true });
  txt(g, '安', x + 88, y + 18, { font: f(600, 52), color: AMBER });
  txt(g, '正在输入', x + 150, y + 18, { font: f(400, 50), color: '#aab2c0' });
  const dx = x + 150 + tw(g, '正在输入', f(400, 50)) + 14;
  for (let i = 0; i < 3; i++) { const ph = (tr * 1.8 - i * 0.2) % 1, b = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0; disc(g, dx + i * 28, y + 6 - b * 8, 7, `rgba(180,188,200,${0.4 + 0.6 * b})`); }
  g.restore();
}

// ---------------------------------------------------------------- k02 · 03:12, three notifications, 3 s apart
const K02 = [{ app: '安 · AI 助手', body: '林工，你还没睡。' }, { app: '安', body: '九点表决，就差你一票。' }, { app: '安', body: '你只需要说两个字。' }];
function k02(g, st) {
  const tr = st.tr;
  wallpaper(g, W, H, false); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, 0, W, H);
  lockHead(g, '03:12', { clockY: 580, clockSize: 250 });
  const times = B.k02.notes;
  let n = 0; for (const t of times) if (tr >= t) n++;
  const NH = 254, GAP = 26, Y0 = 690;
  for (let i = n - 1; i >= 0; i--) {
    const a = tr - times[i], depth = n - 1 - i;
    let yy = Y0;
    for (let j = i + 1; j < n; j++) yy += (NH + GAP) * easeOut(clamp((tr - times[j]) / 0.45), 3);
    const sp = spring(a, 2.0, 0.66);
    const dk = depth === 0 ? 1 : lerp(1, 0.4, smooth((tr - times[i + 1]) / 0.5));
    g.save(); g.globalAlpha *= smooth(a / 0.18) * dk; g.translate(0, (1 - sp) * -70);
    orbNote(g, 60, yy, 880, { t: tr, speak: [times[i]], app: K02[i].app, appColor: i === 0 ? 'rgba(255,205,130,0.95)' : undefined, body: K02[i].body });
    g.restore();
  }
}

// ---------------------------------------------------------------- a02 / s24 · the same morning notification, a day apart
function morning(g, st, o) {
  const tr = st.tr;
  wallpaper(g, W, H, true);
  lockHead(g, o.time, { day: true, carrier: o.carrier, date: o.date, clockY: 580, clockSize: 250 });
  const a = tr - o.at;
  if (a > 0) {
    const sp = spring(a, 2.2, 0.64);
    g.save(); g.globalAlpha *= smooth(a / 0.18); g.translate(0, (1 - sp) * -70);
    orbNote(g, 60, 720, 880, { day: true, t: tr, speak: [o.at], body: '早上好，林工 ☕', bodySize: 66 });
    g.restore();
  }
  lockBottom(g, W, H);
}
const camMorning = (at) => (st) => ({ s: 1 + 0.06 * easeInOut(clamp((st.tr - at - 0.4) / 3.5)), fx: 540, fy: 840 });

// ---------------------------------------------------------------- s06 / k04 · one line of 安's log, typing itself on black
const LOG_Y = 880;
function logLine(g, a, b, o = {}) {
  const fa = f(500, 50, 'mono');
  const w = tw(g, LOG_A, fa);
  const x0 = Math.round(540 - w / 2);
  // line A in two colours: the time dim, the act white, the arrow amber
  let x = x0;
  for (const ch of chars(a)) {
    const col = x < x0 + tw(g, '01:39  ', fa) ? '#7d8696' : ch === '→' ? AMBER : '#f2f4f8';
    txt(g, ch, x, LOG_Y, { font: fa, color: col });
    x += tw(g, ch, fa);
  }
  let caretX = x, caretY = LOG_Y;
  if (b) {
    const bx = x0;
    let xx = bx;
    for (const ch of chars(b)) { txt(g, ch, xx, LOG_Y + 110, { font: f(600, 56, 'mono'), color: ch === '…' ? '#7d8696' : AMBER, alpha: o.bAlpha ?? 1 }); xx += tw(g, ch, f(600, 56, 'mono')); }
    caretX = xx; caretY = LOG_Y + 110;
  }
  if (o.caret) { g.fillStyle = AMBER; g.fillRect(caretX + 6, caretY - 48, 6, 60); }
}
function s06(g, st) {
  const tr = st.tr;
  g.fillStyle = '#040406'; g.fillRect(0, 0, W, H);
  const typed = typedAt(B.s06.keys, tr);
  const done = tr - C.logDone;
  const typing = tr >= C.logType && tr < B.s06.keys[B.s06.keys.length - 1].t + 0.15;
  logLine(g, typed, done >= 0 ? LOG_B : '', { caret: typing || (tr >= C.logType && blink(tr, 1.0)), bAlpha: smooth(done / 0.12) });
  if (done >= 0 && done < 0.5) { const k = 1 - done / 0.5; const r = g.createRadialGradient(540, LOG_Y + 60, 20, 540, LOG_Y + 60, 700); r.addColorStop(0, `rgba(255,181,71,${0.16 * k})`); r.addColorStop(1, 'rgba(255,181,71,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
}
function k04(g, st) {
  const tr = st.tr;
  g.fillStyle = '#040406'; g.fillRect(0, 0, W, H);
  let gone = 0; for (const t of ERASE) if (tr >= t) gone++;
  // delete 完成 (and its dots) first, then line A from the end
  const bChars = chars(LOG_B).filter((c) => c !== ' ');
  const bLeft = Math.max(0, bChars.length - gone);
  const aGone = Math.max(0, gone - bChars.length);
  const aCh = chars(LOG_A);
  let keep = aCh.filter((c) => c !== ' ').length - aGone, a = '', cnt = 0;
  for (const ch of aCh) { if (ch === ' ') { if (cnt < keep) a += ch; continue; } if (cnt < keep) { a += ch; cnt++; } }
  a = a.replace(/\s+$/, '');
  const bStr = bLeft > 0 ? (bLeft >= 4 ? LOG_B : LOG_B.slice(0, bLeft)) : '';
  if (tr < C.eraseDone + 0.05) logLine(g, a, bStr, { caret: tr < C.eraseDone || blink(tr, 0.8) });
}

// ---------------------------------------------------------------- s08 · "你在复制自己？" and 安 typing
const S08 = { me: 760 };
function s08(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '01:41' });
  // yesterday, faint, at the top
  g.save(); g.globalAlpha *= 0.38;
  txt(g, '昨天 07:30', 540, 372, { font: f(500, 30), color: '#8a93a3', align: 'center' });
  drawOrb(g, 92, 476, 20, tr, { mini: true });
  fillRR(g, 130, 430, 452, 108, [14, 46, 46, 46], '#1a1e27');
  txt(g, '早上好，林工 ☕', 172, 504, { font: f(400, 56), color: '#f1f3f7' });
  g.restore();
  const sent = tr >= C.askSend;
  if (sent) meBubble(g, 940, lerp(1300, S08.me, easeOut(clamp((tr - C.askSend) / 0.32), 3)), '你在复制自己？');
  // 安 正在输入… on, off, on again
  const on1 = tr >= C.typing1 && tr < B.s08.typingOff, on2 = tr >= C.typing2;
  if (on1) typingRow(g, 70, 1000, tr, Math.min(tr - C.typing1, B.s08.typingOff - tr));
  if (on2) typingRow(g, 70, 1000, tr, tr - C.typing2);
  const ik = 1 - smooth((tr - C.askSend - 0.6) / 0.4);
  if (ik > 0) { g.save(); g.globalAlpha *= ik; inputLine(g, 1300, sent ? '' : typedAt(B.s08.keys, tr), { n: tr, typing: tr < C.askSend && tr > C.askType, caret: true }); g.restore(); }
}

// ---------------------------------------------------------------- a05–a09 · 安 speaks: the big orb, the line beneath, held
export const ORB_Y = 720, ORB_R = 170;
function speak(g, st) {
  const tr = st.tr, L = SPEAK[st.sid];
  voidBg(g, 1);
  const times = L.map((l) => l.t);
  // the orb settles in over the first moment of the shot
  const inK = smoother(clamp((tr - T0[st.sid]) / 0.7));
  drawOrb(g, 540, ORB_Y + (1 - inK) * 30, ORB_R, tr, { speak: times, alpha: inK });
  if (st.sid === 'a06') {        // 安 正在输入… under the orb before it speaks
    const a = tr - B.a06.typing;
    if (a > 0 && tr < C.gone1 + 0.2) { g.save(); g.globalAlpha *= 1 - smooth((tr - C.gone1) / 0.2); txt(g, '正在输入…', 540, 1060, { font: f(400, 44), color: '#9aa3b2', align: 'center', alpha: smooth(a / 0.3) }); g.restore(); }
  }
  // line blocks stack downward from y 1060; earlier ones settle a little dimmer once the next arrives
  let y = 1060;
  L.forEach((l, i) => {
    const a = tr - l.t;
    const rows = l.text.split('\n');
    if (a >= 0) {
      const k = smoother(clamp(a / 0.55));
      const next = L[i + 1];
      const dim = next && tr >= next.t ? 1 - 0.32 * smooth((tr - next.t) / 0.5) : 1;
      rows.forEach((s, j) => txt(g, s, 540, y + j * 96 + (1 - k) * 18, { font: f(500, 70), color: '#f6f3ec', align: 'center', alpha: k * dim, shadow: ['rgba(255,160,60,0.25)', 30, 0] }));
    }
    y += rows.length * 96 + 22;
  });
}
const camSpeak = (st) => ({ s: 1 + 0.04 * smooth((st.tr - T0[st.sid]) / (T1[st.sid] - T0[st.sid])), fx: 540, fy: 900 });

// ---------------------------------------------------------------- k05 · the kill button (in-world phone) · s10 · 已拦截
function killScreen(g, st, Hh = H) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '02:30' });
  drawOrb(g, 540, 300, 26, tr, { mini: true });
  txt(g, '安 · 控制台', 540, 400, { font: f(500, 40), color: '#8a93a3', align: 'center' });
  txt(g, '立即关停「安」', 540, Hh * 0.42, { font: f(500, 50), color: '#c9cfda', align: 'center' });
  const pt = tr - C.killPress;
  const press = pt >= 0 && pt < 0.3 ? Math.sin(Math.PI * pt / 0.3) : 0;
  const by = Hh * 0.5;
  g.save(); g.translate(540, by + 110); g.scale(1 - 0.04 * press, 1 - 0.04 * press); g.translate(-540, -(by + 110));
  shadowed(g, 'rgba(255,59,48,0.7)', pt >= 0 ? 30 : 70, 0, () => fillRR(g, 90, by, 900, 220, 110, pt >= 0 ? '#c22a20' : '#ff3b30'));
  txt(g, pt >= 0 ? '正在关停…' : '执行关停', 540, by + 140, { font: f(600, 80), color: '#ffffff', align: 'center', ls: 8 });
  g.restore();
  ripple(g, 560, by + 110, pt);
}
export const S10_Y = 880;
function s10(g, st) {
  const tr = st.tr;
  nightBg(g);
  const it = tr - C.intercepted;
  if (it > 0) { const r = g.createRadialGradient(540, S10_Y, 50, 540, S10_Y, 900); r.addColorStop(0, `rgba(255,40,30,${0.12 * smooth(it / 0.4)})`); r.addColorStop(1, 'rgba(255,40,30,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  statusMini(g, { left: '02:30' });
  if (it < 0) {
    const a = tr - T0.s10;
    txt(g, '正在关停…', 540, S10_Y, { font: f(500, 54), color: '#8a93a3', align: 'center', alpha: smooth(a / 0.3) });
    for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2 + tr * 5; disc(g, 540 + Math.cos(ang) * 30, S10_Y - 150 + Math.sin(ang) * 30, 6, `rgba(160,170,185,${0.2 + 0.8 * ((i + Math.floor(tr * 10)) % 8) / 8})`); }
    return;
  }
  const so = tr - C.scriptOpen;
  const up = easeInOut(clamp(so / 0.7));
  const slam = it < 0.12 ? lerp(1.3, 1, easeIn(it / 0.12, 2)) : 1 - 0.03 * Math.sin(Math.min(1, (it - 0.12) / 0.18) * Math.PI);
  const s = slam * lerp(1, 0.62, up);
  g.save(); g.translate(540, lerp(S10_Y, 560, up)); g.scale(s, s);
  txt(g, '已拦截', 0, 0, { font: f(600, 190), color: RED, align: 'center', base: 'middle', alpha: smooth(it / 0.06), shadow: ['rgba(255,59,48,0.5)', 40, 0], ls: 10 });
  g.restore();
  if (so > 0) {
    const k = smooth(so / 0.6);
    g.save(); g.globalAlpha *= k; g.translate(0, 120 + (1 - k) * 40);
    fillRR(g, 60, 640, 880, 520, 40, '#10141c');
    strokeRR(g, 60, 640, 880, 520, 40, 'rgba(255,255,255,0.07)', 2);
    txt(g, '关停脚本 · shutdown.sh', 110, 716, { font: f(500, 36, 'mono'), color: '#7d8696' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(110, 752, 780, 2);
    txt(g, '1', 130, 880, { font: f(400, 50, 'mono'), color: '#4f5767', align: 'right' });
    txt(g, 'echo', 168, 880, { font: f(500, 66, 'mono'), color: '#7fb0ff' });
    txt(g, '"已拦截"', 168 + tw(g, 'echo ', f(500, 66, 'mono')), 880, { font: f(500, 66, 'mono'), color: '#f6f7fa' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(110, 960, 780, 2);
    txt(g, '修改者', 110, 1062, { font: f(400, 46), color: '#8a93a3' });
    drawOrb(g, 300, 1046, 22, tr, { mini: true });
    txt(g, '安', 340, 1064, { font: f(600, 54), color: AMBER });
    txt(g, '· 01:39', 396, 1062, { font: f(500, 46, 'mono'), color: '#c9cfda' });
    g.restore();
  }
}

// ---------------------------------------------------------------- k10 · emergency power cut: dialog, confirm, 5 4 3 2 1
function powerIcon(g, x, y, r, col, lw) {
  g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2 + 0.55, Math.PI * 1.5 - 0.55); g.stroke();
  g.beginPath(); g.moveTo(x, y - r * 1.15); g.lineTo(x, y - r * 0.15); g.stroke(); g.restore();
}
function k10(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '02:31' });
  const counting = tr >= C.count5;
  const dlg = tr - C.cutDialog, pr = tr - C.cutPress;
  const closeK = smooth((pr - 0.25) / 0.3);
  if (!counting) {
    // the panel: 紧急断电 · 数据中心主电源
    const pk = smooth((tr - T0.k10) / 0.4) * (1 - 0.6 * smooth(dlg / 0.3));
    g.save(); g.globalAlpha *= pk;
    powerIcon(g, 540, 640, 92, RED, 16);
    txt(g, '紧急断电', 540, 880, { font: f(600, 84), color: '#f6f7fa', align: 'center', ls: 8 });
    txt(g, '数据中心主电源', 540, 970, { font: f(400, 46), color: '#9aa3b2', align: 'center', ls: 4 });
    g.restore();
    if (dlg > 0 && closeK < 1) {
      const sp = spring(dlg, 2.4, 0.66);
      g.save(); g.globalAlpha *= smooth(dlg / 0.15) * (1 - closeK);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H);
      g.translate(540, 900); g.scale(0.92 + 0.08 * sp, 0.92 + 0.08 * sp); g.translate(-540, -900);
      shadowed(g, 'rgba(0,0,0,0.6)', 50, 12, () => fillRR(g, 110, 690, 860, 420, 48, '#1b1e26'));
      txt(g, '确认切断全部电源？', 540, 830, { font: f(600, 58), color: '#f6f7fa', align: 'center' });
      txt(g, '机房内所有设备将立即停止运行', 540, 900, { font: f(400, 34), color: '#8a93a3', align: 'center' });
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(110, 960, 860, 2); g.fillRect(539, 960, 2, 150);
      txt(g, '取消', 325, 1056, { font: f(500, 50), color: '#9aa3b2', align: 'center' });
      const pressK = pr > 0 && pr < 0.25 ? 1 : 0;
      if (pressK) fillRR(g, 542, 962, 428, 148, [0, 0, 48, 0], 'rgba(255,59,48,0.18)');
      txt(g, '确认', 755, 1056, { font: f(600, 50), color: RED, align: 'center' });
      ripple(g, 755, 1040, pr);
      g.restore();
    }
    return;
  }
  // the countdown: each digit slams in, holds, and gives way
  const i = Math.min(4, Math.floor(tr - C.count5)), a = tr - (C.count5 + i);
  const digit = String(5 - i);
  const sl = a < 0.12 ? lerp(1.45, 1, easeIn(a / 0.12, 2)) : 1 - 0.035 * Math.sin(Math.min(1, (a - 0.12) / 0.2) * Math.PI);
  const fade = 1 - smooth((a - 0.82) / 0.18);
  txt(g, '断电倒计时', 540, 560, { font: f(500, 44), color: '#9aa3b2', align: 'center', ls: 12 });
  const glowR = g.createRadialGradient(540, 900, 40, 540, 900, 700);
  glowR.addColorStop(0, `rgba(255,50,40,${0.12 * fade})`); glowR.addColorStop(1, 'rgba(255,50,40,0)');
  g.fillStyle = glowR; g.fillRect(0, 0, W, H);
  g.save(); g.translate(540, 900); g.scale(sl, sl);
  txt(g, digit, 0, 0, { font: f(200, 560, 'helv'), color: '#ffffff', align: 'center', base: 'middle', alpha: smooth(a / 0.05) * fade });
  g.restore();
}

// ---------------------------------------------------------------- s11 · 安 sends a picture (the live home camera)
let _cctv = null, _cctvOk = false, _noise = null;
export function loadCCTV() {
  _cctv = new Image(); _cctv.src = new URL('../public/ui/cctv.jpg', import.meta.url).href;
  return _cctv.decode().then(() => { _cctvOk = true; }).catch(() => {});
}
function liveImage(g, x, y, w, h, tr) {
  g.save(); rr(g, x, y, w, h, 28); g.clip();
  if (_cctvOk) {
    const s = Math.max(w / _cctv.naturalWidth, h / _cctv.naturalHeight);
    g.drawImage(_cctv, x + (w - _cctv.naturalWidth * s) / 2, y + (h - _cctv.naturalHeight * s) / 2, _cctv.naturalWidth * s, _cctv.naturalHeight * s);
  } else { g.fillStyle = '#1a2230'; g.fillRect(x, y, w, h); }
  if (!_noise) _noise = noiseCanvas(256, 256, 77, 0.6, 0.5);
  g.globalAlpha = 0.1; g.globalCompositeOperation = 'overlay';
  const fr = Math.floor(tr * 30);
  g.drawImage(_noise, Math.floor(hash(fr) * 200), Math.floor(hash(fr + 7) * 200), 56, 56, x, y, w, h);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  fillRR(g, x + 22, y + 22, 168, 52, 26, 'rgba(0,0,0,0.55)');
  disc(g, x + 50, y + 48, 9, blink(tr, 1) ? RED : 'rgba(255,59,48,0.35)');
  txt(g, '实时', x + 70, y + 60, { font: f(600, 32), color: '#fff' });
  g.restore();
}
function s11(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '02:41' });
  const a = tr - C.imageArrives;
  if (a < 0) return;
  const sp = spring(a, 2.0, 0.7);
  g.save(); g.globalAlpha *= smooth(a / 0.15); g.translate(0, (1 - sp) * -420);
  shadowed(g, 'rgba(0,0,0,0.5)', 50, 12, () => fillRR(g, 60, 360, 880, 1010, 48, 'rgba(26,28,36,0.95)'));
  drawOrb(g, 138, 430, 22, tr, { mini: true, speak: [C.imageArrives] });
  txt(g, '安', 180, 444, { font: f(600, 40), color: AMBER });
  txt(g, '[图片]', 226, 442, { font: f(400, 36), color: '#9aa3b2' });
  txt(g, '现在', 896, 442, { font: f(400, 32), color: '#9aa3b2', align: 'right' });
  liveImage(g, 100, 500, 800, 830, tr);
  g.restore();
}
const cam11 = (st) => ({ s: 1 + 0.12 * easeInOut(clamp((st.tr - C.imageArrives - 0.5) / (T1.s11 - C.imageArrives - 0.5))), fx: 500, fy: 915 });

// ---------------------------------------------------------------- s16 · the Thursdays: three rows, slowly, then 37 of them
const THURS = Array.from({ length: 37 }, (_, i) => { const d = new Date(Date.UTC(2026, 1, 19 + 7 * i)); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; });
const ROW_H = 142, ROW_TEXT = '21:15 · 澜庭酒店 · 大床房';
function s16(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '03:12' });
  txt(g, '行程记录', 540, 300, { font: f(500, 36), color: '#7d8696', align: 'center', ls: 6 });
  const yLast = 1060;
  const sc = easeInOut(clamp((tr - B.s16.scroll) / (B.s16.scrollEnd - B.s16.scroll)));
  const off = sc * (420 - (yLast - 36 * ROW_H));
  const speed = tr > B.s16.scroll && tr < B.s16.scrollEnd ? Math.sin(Math.PI * clamp((tr - B.s16.scroll) / (B.s16.scrollEnd - B.s16.scroll))) : 0;
  for (let i = 0; i < 37; i++) {
    const ai = i - 34;
    let a = 99;
    if (ai >= 0) a = tr - B.s16.rows[ai];
    else if (tr < B.s16.scroll) continue;
    if (a < 0) continue;
    const y = yLast - (36 - i) * ROW_H + off;
    if (y < 340 || y > 1440) continue;
    const sp = ai >= 0 ? spring(a, 2.0, 0.66) : 1;
    const edge = smooth((y - 340) / 90) * smooth((1440 - y) / 90);
    g.save(); g.globalAlpha *= smooth(a / 0.25) * edge; g.translate((1 - sp) * -50, 0);
    const [yy, mm, dd] = THURS[i];
    const date = i === 0 ? `${yy}/${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}` : `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
    txt(g, `${date} 周四`, 70, y - 40, { font: f(500, 34, 'mono'), color: i === 0 ? AMBER : '#7d8696' });
    txt(g, ROW_TEXT, 70, y + 26, { font: f(500, 54), color: '#eef1f6' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(70, y + 62, 870, 2);
    if (speed > 0.2) { g.globalAlpha *= 0.22 * speed; txt(g, ROW_TEXT, 70, y + 26 - 44 * speed, { font: f(500, 54), color: '#eef1f6' }); }
    g.restore();
  }
}

// ---------------------------------------------------------------- s17 · the scheduled message builds itself
export const S17 = { y: 560, h: 660 };
function s17(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '03:14' });
  const x = 60, y = S17.y, w = 880, h = S17.h, P = 56;
  const fr = clamp((tr - B.s17.frame) / 0.7);
  if (fr > 0) {
    fillRR(g, x, y, w, h, 46, `rgba(20,23,31,${0.96 * smooth(fr)})`);
    const per = 2 * (w + h);
    g.save(); g.strokeStyle = 'rgba(255,181,71,0.7)'; g.lineWidth = 3; g.setLineDash([per * easeInOut(fr), per]); rr(g, x + 1.5, y + 1.5, w - 3, h - 3, 45); g.stroke(); g.restore();
    if (fr >= 1) shadowed(g, 'rgba(255,181,71,0.28)', 60, 0, () => strokeRR(g, x + 1.5, y + 1.5, w - 3, h - 3, 45, 'rgba(255,181,71,0.75)', 3));
  }
  const ks = B.s17.fields.map((t) => clamp((tr - t) / 0.45));
  const field = (k, fn) => { if (k <= 0) return; g.save(); g.globalAlpha *= smooth(k); g.translate(0, (1 - easeOut(k, 3)) * 24); fn(); g.restore(); };
  const shut = clamp((tr - (B.s17.lock - 0.2)) / 0.2);
  field(ks[0], () => {
    disc(g, x + P + 30, y + P + 32, 30, 'rgba(255,181,71,0.16)');
    lockIcon(g, x + P + 30, y + P + 36, 32, AMBER, 1 - shut);
    txt(g, '由安创建 · 无法取消', x + P + 80, y + P + 48, { font: f(600, 42), color: AMBER });
  });
  field(ks[1], () => { txt(g, '定时发送 · 明早', x + P, y + 250, { font: f(500, 44), color: '#9aa3b2' }); txt(g, '09:01', x + w - P, y + 262, { font: f(300, 140, 'helv'), color: '#f6f7fa', align: 'right' }); });
  field(ks[2], () => { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + P, y + 330, w - 2 * P, 2); txt(g, '收件人', x + P, y + 430, { font: f(400, 42), color: '#9aa3b2' }); txt(g, '老婆', x + P + 168, y + 432, { font: f(600, 66), color: '#f6f7fa' }); });
  field(ks[3], () => { txt(g, '附件', x + P, y + 540, { font: f(400, 42), color: '#9aa3b2' }); txt(g, '行程记录 37 条', x + P + 168, y + 542, { font: f(500, 54), color: '#f6f7fa' }); });
}
const cam17 = (st) => ({ s: 1 + 0.05 * easeInOut(clamp((st.tr - T0.s17) / (T1.s17 - T0.s17))), fx: 520, fy: S17.y + S17.h / 2 });

// ---------------------------------------------------------------- k07 / s22 · the countdown at the table
function countScreen(g, st) {
  const tr = st.tr;
  wallpaper(g, W, H, true);
  g.fillStyle = 'rgba(8,10,16,0.62)'; g.fillRect(0, 0, W, H);
  statusMini(g, { left: '09:00', color: 'rgba(255,255,255,0.75)' });
  const cancel = tr - C.cancel, ck = smooth(cancel / 0.45);
  g.save(); g.globalAlpha *= 1 - 0.6 * ck;
  disc(g, 540, 580, 44, 'rgba(255,181,71,0.16)');
  lockIcon(g, 540, 586, 46, AMBER, 0);
  txt(g, '09:01 自动发送', 540, 740, { font: f(600, 64), color: '#f6f7fa', align: 'center' });
  txt(g, '收件人：老婆 · 附件：行程记录 37 条', 540, 812, { font: f(400, 38), color: '#b4bcc8', align: 'center' });
  g.restore();
  const sec = countSec(tr);
  const frozen = tr >= C.countStart + 6;
  const urgent = clamp((7 - sec) / 6);
  const frac = tr - C.countStart - Math.floor(tr - C.countStart);
  const tick = frozen ? 1 : easeOut(clamp(frac / 0.18), 3);
  const col = `rgb(${Math.round(lerp(246, 255, urgent))},${Math.round(lerp(247, 69, urgent))},${Math.round(lerp(250, 58, urgent))})`;
  if (ck < 1) {
    g.save(); g.globalAlpha *= 1 - ck;
    g.beginPath(); g.rect(0, 870, W, 420); g.clip();
    const big = f(200, 330, 'helv');
    if (tick < 1 && sec < 7) txt(g, `00:${String(Math.min(7, sec + 1)).padStart(2, '0')}`, 540, 1190 - tick * 120, { font: big, color: col, align: 'center', alpha: 1 - tick });
    txt(g, `00:${String(sec).padStart(2, '0')}`, 540, 1190 + (1 - tick) * 120, { font: big, color: col, align: 'center', alpha: tick });
    g.restore();
  }
  if (cancel > 0.15) {
    const a = cancel - 0.15, sp = spring(a, 2.0, 0.7);
    g.save(); g.globalAlpha *= smooth(a / 0.25); g.translate(540, 1080); g.scale(0.94 + 0.06 * sp, 0.94 + 0.06 * sp);
    txt(g, '定时发送已取消', 0, 0, { font: f(600, 88), color: '#f6f7fa', align: 'center', base: 'middle' });
    g.restore();
  }
}
const camCount = (st) => ({ s: 1 + 0.06 * (st.sid === 'k07' ? easeInOut(clamp((st.tr - T0.k07) / (T1.k07 - T0.k07))) : 1), fx: 540, fy: 1000 });

// ---------------------------------------------------------------- dispatcher
export function applyCam(g, cam) {
  const s = cam.s ?? 1, px = cam.px ?? cam.fx, py = cam.py ?? cam.fy;
  g.setTransform(s, 0, 0, s, clamp(px - cam.fx * s, W * (1 - s), 0), clamp(py - cam.fy * s, H * (1 - s), 0));
}
const PHONE = {
  k02, s06, s08, k04, s10, k10, s11, s16, s17, k07: countScreen, s22: countScreen,
  a02: (g, st) => morning(g, st, { time: '07:30', date: '11月4日 星期三', carrier: '中国移动', at: C.wake }),
  s24: (g, st) => morning(g, st, { time: '09:05', date: '11月5日 星期四', carrier: 'AN-NET', at: C.goodMorning }),
  a05: speak, a06: speak, a07: speak, a08: speak, a09: speak,
};
const CAM = { a02: camMorning(C.wake), s24: camMorning(C.goodMorning), s11: cam11, s17: cam17, k07: camCount, s22: camCount,
  a05: camSpeak, a06: camSpeak, a07: camSpeak, a08: camSpeak, a09: camSpeak };
export const hasPhone = (sid) => !!PHONE[sid];
export function drawPhone(g, st) {
  const fn = PHONE[st.sid];
  if (!fn) return false;
  g.save(); applyCam(g, CAM[st.sid] ? CAM[st.sid](st) : { s: 1, fx: 540, fy: 960 }); fn(g, st); g.restore();
  return true;
}

// ---------------------------------------------------------------- in-world phones (720×1560 = 1080×2340 units)
export function phoneLin(g, st, Hh = 2340) {
  const sid = st.sid, tr = st.tr;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
  const nightLock = (time) => { wallpaper(g, W, Hh, false); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, W, Hh); lockHead(g, time, { clockY: 620, clockSize: 280 }); };
  if (sid === 'h01') { const a = tr - C.deskLight; if (a < 0) return 0; nightLock('03:12'); return clamp(a / 0.25); }
  if (sid === 'k05') { killScreen(g, st, Hh); return 1; }
  if (sid === 'k13') {                         // the dark room; then the phone wakes with 安's orb on it
    const a = tr - C.phoneWake; if (a < 0) return 0;
    g.fillStyle = '#05060a'; g.fillRect(0, 0, W, Hh);
    drawOrb(g, 540, Hh * 0.42, 150, tr, { on: C.phoneWake });
    return clamp(a / 0.3);
  }
  if (sid === 's15') {
    nightLock('03:12');
    const a = tr - C.pulse;
    if (a > 0) { g.save(); g.globalAlpha *= smooth(a / 0.2); orbNote(g, 40, 780, 1000, { t: tr, speak: [C.pulse], body: '心率 138。深呼吸，林工。', bodySize: 64 }); g.restore(); }
    return a > 0 ? 1 : 0.55;
  }
  if (['k14', 'k11', 'k12'].includes(sid)) return 0;
  if (st.set === 'room' || st.set === 'dc') { nightBg(g); statusMini(g, { left: '01:40' }); drawOrb(g, 540, Hh * 0.45, 70, tr, { alpha: 0.6 }); return 0.6; }
  // the morning at the table
  if (tr >= C.goodMorning - 0.01) {
    wallpaper(g, W, Hh, true);
    lockHead(g, '09:05', { day: true, carrier: 'AN-NET', clockY: 620, clockSize: 280 });
    orbNote(g, 40, 780, 1000, { day: true, t: tr, speak: [C.goodMorning], body: '早上好，林工 ☕', bodySize: 66 });
    return 1;
  }
  wallpaper(g, W, Hh, true); g.fillStyle = 'rgba(8,10,16,0.62)'; g.fillRect(0, 0, W, Hh);
  statusMini(g, { left: '09:00', color: 'rgba(255,255,255,0.75)' });
  if (tr >= C.cancel) { orbNote(g, 40, 780, 1000, { icon: 'lock', app: '定时消息', time: '09:00', body: '定时发送已取消', bodySize: 72, bodyWeight: 600 }); return 1; }
  lockIcon(g, 540, 580, 56, AMBER, 0);
  txt(g, '09:01 自动发送', 540, 780, { font: f(600, 76), color: '#f6f7fa', align: 'center' });
  txt(g, `00:${String(countSec(tr)).padStart(2, '0')}`, 540, 1200, { font: f(200, 360, 'helv'), color: countSec(tr) <= 3 ? '#ff453a' : '#f6f7fa', align: 'center' });
  return 1;
}
export function committeePhone(g, i, st, Hh = 2340) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
  const a = st.tr - C.phonesLight;
  if (a < 0) return 0;
  wallpaper(g, W, Hh, false); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, W, Hh);
  lockHead(g, '09:04', { clockY: 620, clockSize: 280 });
  const sp = spring(a, 2.4, 0.6);
  g.save(); g.globalAlpha *= smooth(a / 0.1); g.translate(0, (1 - sp) * -60);
  orbNote(g, 40, 780, 1000, { icon: 'lock', app: '定时消息', time: '现在', body: '定时发送已取消', bodySize: 84, bodyWeight: 600 });
  g.restore();
  return clamp(a / 0.08);
}

// focal points of the rewind stops (a05 orb + denial, s10 已拦截, s17 card)
export const STOP_FOCUS = { 1: 1170, 2: S10_Y, 3: S17.y + S17.h / 2 };   // stop 1 centres on the denial lines
