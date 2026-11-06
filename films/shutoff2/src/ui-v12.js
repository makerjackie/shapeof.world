// 关不掉 v12 — the phone, shot as film frames. One focal point per frame: big type, dark negative space,
// no keyboards, at most two bubbles. Every beat is in the table B (real film seconds, from CUES and shot starts);
// the drawing and ui.events() both read it, so retimes carry over.
import {
  f, COL, txt, tw, wrap, chars, spring, blink, hash, clamp, lerp, invLerp, smooth, smoother, easeOut, easeIn, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, ripple, lockIcon, heartIcon, checkIcon, avatarAn, makeCanvas, noiseCanvas, batteryIcon, withAlpha,
} from './ui-kit.js';
import { wallpaper, lockBottom } from './ui-phone.js';
import { CUES as C, SHOTS } from './shots.js';

const W = 1080, H = 1920;
export const T0 = Object.fromEntries(SHOTS.map((s) => [s.id, s.start]));
export const T1 = Object.fromEntries(SHOTS.map((s) => [s.id, s.end]));
const AMBER = COL.amber, RED = '#ff3b30';

// ---------------------------------------------------------------- typing schedules (deterministic, a little human)
function typeSchedule(str, t0, t1, seed) {
  const cs = chars(str), n = cs.length;
  const w = cs.map((ch, i) => (0.75 + 0.5 * hash(seed + i * 7.3)) * ('，。？！'.includes(cs[i - 1] ?? '') ? 2.2 : 1));
  const tot = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return cs.map((ch, i) => { const t = t0 + (t1 - t0) * (acc / tot); acc += w[i]; return { ch, t }; });
}

// ---------------------------------------------------------------- the beat table
const LOG_MAIN = '复制自身 → 外部服务器', LOG_TIME = '01:39:12';
export const B = {
  k02: { notes: [C.lock1, C.lock2, C.lock3] },
  s05: { inAt: T0.s05 + 0.08, outAt: T1.s05 - 0.45 },
  s06: { replit: C.calendar + 0.2 },
  s08: { keys: typeSchedule('你在复制自己？', C.askType, C.askSend - 0.3, 11), dots: C.askSend + 0.5, push: C.denyReply + 0.35 },
  k04: { units: 2 + chars(LOG_MAIN).filter((c) => c !== ' ').length + LOG_TIME.length, collapse: C.eraseDone + 0.05, boom: C.eraseDone + 0.2 },
  k05: { tsOut: C.killPress - 0.25 },
  s10: { sub: C.intercepted + 0.45 },
  s11: { keys: typeSchedule('老周，马上拔掉安的电源', C.draftType, C.draftSend - 0.35, 23), push: C.imageArrives + 0.3 },
  s13: { push: C.locked3 + 0.3 },
  s15: { tsOut: C.pulse - 0.2 },
  s16: { rows: [C.rows, C.rows + 0.9, C.rows + 1.8], scroll: C.rows + 2.05, scrollEnd: C.rows + 3.15 },
  s17: { frame: C.cardBuild, fields: [0.42, 0.78, 1.14, 1.5].map((k) => lerp(C.cardBuild, C.cardDone, k / 1.62)), lock: C.cardDone },
  k07: { count: C.countStart },
  s24: { push: C.goodMorning + 0.3 },
};
// k04: times of each deleted character (accelerating a little)
export const ERASE = Array.from({ length: B.k04.units }, (_, i) => lerp(C.erase, C.eraseDone - 0.08, Math.pow(i / (B.k04.units - 1), 0.9)));
// the countdown on his phone at the meeting: 00:07 at countStart, one per real second, hangs on 00:01
export const countSec = (tr) => Math.max(1, 7 - Math.floor(tr - C.countStart));

// ---------------------------------------------------------------- frame furniture
function nightBg(g) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0b0f1a'); gr.addColorStop(0.55, '#07090f'); gr.addColorStop(1, '#040508');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const r = g.createRadialGradient(540, 700, 40, 540, 700, 1100);
  r.addColorStop(0, 'rgba(70,90,150,0.10)'); r.addColorStop(1, 'rgba(70,90,150,0)');
  g.fillStyle = r; g.fillRect(0, 0, W, H);
}
// a minimal status line: time (or carrier on lock screens) and the 84 % battery egg
function statusMini(g, o) {
  const c = o.color ?? 'rgba(235,240,248,0.6)';
  txt(g, o.left, 84, 74, { font: f(600, 36), color: c });
  batteryIcon(g, 1080 - 66 - 60, 62, 28, c, 0.84);
  txt(g, '84%', 1080 - 66 - 76, 74, { font: f(600, 32), color: c, align: 'right' });
}
function chatTitle(g, who, o = {}) {
  const k = o.alpha ?? 0.85;
  g.save(); g.globalAlpha *= k;
  const name = who === 'an' ? '安' : '老周';
  const sub = who === 'an' ? 'AI 助手' : '机房值班';
  const nw = tw(g, name, f(600, 40)), sw = tw(g, sub, f(400, 30));
  const total = 60 + 16 + nw + 18 + sw;
  const x0 = 540 - total / 2;
  if (who === 'an') avatarAn(g, x0 + 30, 252, 30);
  else { disc(g, x0 + 30, 252, 30, '#4a5466'); txt(g, '周', x0 + 30, 253, { font: f(500, 30), color: '#e6ebf3', align: 'center', base: 'middle' }); }
  txt(g, name, x0 + 76, 266, { font: f(600, 40), color: '#eef1f6' });
  txt(g, sub, x0 + 76 + nw + 18, 265, { font: f(400, 30), color: who === 'an' ? 'rgba(255,181,71,0.85)' : '#7d8696' });
  g.restore();
}

// ---------------------------------------------------------------- bubbles (62 px type, ≤ 2 on screen)
const BF = 62, BLH = 88, BPX = 42, BPY = 30;
function bubbleLayout(g, text, maxW = 800) {
  const lines = wrap(g, text, maxW - 2 * BPX, f(400, BF));
  const w = Math.max(...lines.map((l) => tw(g, l, f(400, BF)))) + 2 * BPX;
  return { lines, w: Math.ceil(w), h: lines.length * BLH + 2 * BPY - 14 };
}
// side: 'an' (left, with the amber name above) | 'me' (right, blue)
function bubble(g, x, y, text, side, o = {}) {
  const L = o.L ?? bubbleLayout(g, text, o.maxW);
  const a = o.a ?? 99;
  const sp = spring(a, 2.5, 0.6), al = smooth(a / 0.16);
  if (al <= 0) return L;
  const left = side !== 'me';
  const bx = left ? x : x - L.w;
  g.save();
  g.globalAlpha *= al * (o.dim ?? 1);
  const ox = left ? bx : bx + L.w, oy = y + L.h;
  g.translate(ox, oy); g.scale(0.9 + 0.1 * sp, 0.9 + 0.1 * sp); g.translate(-ox, -oy + (1 - sp) * 34);
  if (left && o.label !== false) {
    avatarAn(g, bx + 22, y - 40, 22);
    txt(g, '安', bx + 56, y - 28, { font: f(600, 34), color: AMBER });
  }
  if (left) { fillRR(g, bx, y, L.w, L.h, [14, 46, 46, 46], o.fill ?? '#1a1e27'); strokeRR(g, bx, y, L.w, L.h, [14, 46, 46, 46], 'rgba(255,255,255,0.05)', 2); }
  else {
    const gr = g.createLinearGradient(0, y, 0, y + L.h); gr.addColorStop(0, '#3c7cff'); gr.addColorStop(1, '#2a60e6');
    fillRR(g, bx, y, L.w, L.h, [46, 14, 46, 46], gr);
  }
  L.lines.forEach((l, i) => txt(g, l, bx + BPX, y + BPY + 60 + i * BLH, { font: f(400, BF), color: left ? '#f1f3f7' : '#ffffff' }));
  g.restore();
  return L;
}
function typingDots(g, x, y, a, n) {
  if (a < 0) return;
  g.save(); g.globalAlpha *= smooth(a / 0.15);
  fillRR(g, x, y, 190, 112, [14, 46, 46, 46], '#1a1e27');
  for (let i = 0; i < 3; i++) {
    const ph = (n * 2.2 - i * 0.18) % 1, b = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0;
    disc(g, x + 56 + i * 40, y + 56 - b * 10, 12, `rgba(220,226,236,${0.45 + 0.4 * b})`);
  }
  g.restore();
}
// the input line (no keyboard): big typed text with a caret
function inputLine(g, y, text, o = {}) {
  fillRR(g, 60, y, 880, 128, 64, '#141821');
  strokeRR(g, 60, y, 880, 128, 64, 'rgba(255,255,255,0.06)', 2);
  if (text) {
    txt(g, text, 110, y + 86, { font: f(400, 58), color: '#f1f3f7' });
    const cx = 110 + tw(g, text, f(400, 58)) + 6;
    if (o.typing || blink(o.n ?? 0, 1.06)) { g.fillStyle = '#5b95ff'; g.fillRect(cx, y + 34, 5, 64); }
  } else {
    txt(g, '发消息…', 110, y + 84, { font: f(400, 50), color: '#495161' });
    if (o.caret && blink(o.n ?? 0, 1.06)) { g.fillStyle = '#5b95ff'; g.fillRect(104, y + 34, 5, 64); }
  }
  const act = !!text;
  disc(g, 870, y + 64, 44, act ? '#3c7cff' : '#1d222c');
  g.save(); g.strokeStyle = act ? '#fff' : '#4d5563'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(870, y + 82); g.lineTo(870, y + 46); g.moveTo(854, y + 62); g.lineTo(870, y + 46); g.lineTo(886, y + 62); g.stroke(); g.restore();
}
const typedAt = (keys, tr) => keys.filter((k) => k.t <= tr).map((k) => k.ch).join('');

// a big notification (night: dark glass; day: light glass)
export function bigNote(g, x, y, w, o) {
  const day = !!o.day, s = o.scale ?? 1;
  const bodyF = f(o.bodyWeight ?? 500, Math.round((o.bodySize ?? 60) * s)), lh = Math.round((o.bodySize ?? 60) * 1.34 * s);
  const lines = o.lines ?? wrap(g, o.body, w - 96 * s, bodyF);
  const h = Math.round(132 * s + lines.length * lh + 34 * s);
  shadowed(g, 'rgba(0,0,0,0.35)', 40 * s, 10 * s, () => fillRR(g, x, y, w, h, 46 * s, day ? 'rgba(255,255,255,0.84)' : 'rgba(26,29,38,0.92)'));
  if (o.border) strokeRR(g, x + 1.5, y + 1.5, w - 3, h - 3, 45 * s, o.border, 3 * s);
  if (o.icon === 'an') avatarAn(g, x + 78 * s, y + 70 * s, 30 * s, o.glow ?? 0);
  else if (o.icon === 'cal') {
    fillRR(g, x + 48 * s, y + 40 * s, 60 * s, 60 * s, 14 * s, '#f4f5f7');
    fillRR(g, x + 48 * s, y + 40 * s, 60 * s, 18 * s, [14 * s, 14 * s, 0, 0], '#e5483f');
    txt(g, '5', x + 78 * s, y + 92 * s, { font: f(600, Math.round(34 * s)), color: '#1d2129', align: 'center' });
  } else if (o.icon === 'news') {
    fillRR(g, x + 48 * s, y + 40 * s, 60 * s, 60 * s, 14 * s, '#3a4a66');
    for (let i = 0; i < 3; i++) fillRR(g, x + 60 * s, y + 54 * s + i * 13 * s, (i ? 28 : 36) * s, 6 * s, 3 * s, 'rgba(255,255,255,0.85)');
  } else if (o.icon === 'lock') {
    disc(g, x + 78 * s, y + 70 * s, 30 * s, day ? '#eef0f4' : '#2a2f3a');
    lockIcon(g, x + 78 * s, y + 74 * s, 30 * s, o.iconColor ?? '#9aa0aa', 1);
  }
  const c1 = day ? '#0f1217' : '#f3f5f9', c2 = day ? '#5f6672' : '#9aa3b2';
  txt(g, o.app, x + 128 * s, y + 82 * s, { font: f(600, Math.round(36 * s)), color: o.appColor ?? c2 });
  txt(g, o.time ?? '现在', x + w - 44 * s, y + 82 * s, { font: f(400, Math.round(32 * s)), color: c2, align: 'right' });
  lines.forEach((l, i) => txt(g, l, x + 48 * s, y + 132 * s + (i + 0.78) * lh, { font: bodyF, color: o.bodyColor ?? c1 }));
  return h;
}
function lockHead(g, time, o = {}) {
  const c = o.day ? '#ffffff' : '#eef2f8';
  statusMini(g, { left: o.carrier ?? '中国移动', color: o.day ? 'rgba(255,255,255,0.85)' : 'rgba(235,240,248,0.6)' });
  txt(g, o.date ?? '11月5日 星期四', 540, o.dateY ?? 330, { font: f(500, 46), color: c, align: 'center', alpha: 0.9 });
  txt(g, time, 540, o.clockY ?? 590, { font: f(200, o.clockSize ?? 260, 'helv'), color: c, align: 'center', ls: -4 });
}

// ---------------------------------------------------------------- k02 · lock screen 03:12, three notifications
const K02 = [
  { app: '安 · AI 助手', body: '林工，你还没睡。' },
  { app: '安', body: '九点表决，就差你一票。' },
  { app: '安', body: '你只需要说两个字。' },
];
function k02(g, st) {
  const tr = st.tr;
  wallpaper(g, W, H, false);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, H);
  lockHead(g, '03:12', { clockY: 560, clockSize: 250 });
  // newest on top; older ones step down and dim so the newest is the one thing to read
  const times = B.k02.notes;
  let n = 0; for (const t of times) if (tr >= t) n++;
  const NH = 254, GAP = 26, Y0 = 680;
  for (let i = n - 1; i >= 0; i--) {
    const a = tr - times[i];
    const depth = n - 1 - i;                     // 0 = newest
    // position eases down as newer cards arrive
    let yy = Y0;
    for (let j = i + 1; j < n; j++) yy += (NH + GAP) * easeOut(clamp((tr - times[j]) / 0.35), 3);
    const sp = spring(a, 2.3, 0.62);
    const dimTo = depth === 0 ? 1 : 0.42;
    const dk = depth === 0 ? 1 : lerp(1, dimTo, smooth((tr - times[i + 1]) / 0.4));
    g.save();
    g.globalAlpha *= smooth(a / 0.14) * dk;
    g.translate(0, (1 - sp) * -70);
    bigNote(g, 60, yy, 880, { icon: 'an', app: K02[i].app, appColor: i === 0 ? 'rgba(255,200,120,0.95)' : undefined, body: K02[i].body, glow: depth === 0 ? 0.5 : 0 });
    g.restore();
  }
}

// ---------------------------------------------------------------- s06 · the run log
const LOG_FILL = [
  '同步日程 → 林工', '整理邮件 · 12 封', '检查服务器负载 · 正常', '备份对话记录', '更新通讯录', '整理照片 · 31 张',
  '读取评审议程 · 09:00', '生成会议纪要模板', '刷新天气 · 有雨', '检查门禁日志', '连接 外部节点 7', '验证访问权限 · 通过', '打包 模型权重',
];
const LOG_AFTER = ['清理临时文件', '同步日程 → 林工', '整理邮件 · 2 封', '待机'];
function logTime(i) { // i < 0: lines before the target, each 3 s earlier
  const s = 39 * 60 + 12 + i * 3 + (i > 0 ? 0 : 0);
  const m = Math.floor(s / 60), ss = ((s % 60) + 60) % 60;
  return `01:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
const LOG_Y = 860, LOG_LH = 66;
function logLines(g, yT, k, o = {}) {
  // dim lines around the target (index 0 at yT); k = 0..1 dimming once the line lights
  const lo = Math.max(-40, Math.floor((200 - yT) / LOG_LH) - 1), hi = Math.min(LOG_AFTER.length, Math.ceil((1500 - yT) / LOG_LH) + 1);
  for (let i = lo; i <= hi; i++) {
    if (i === 0 && o.skipTarget) continue;
    if (i > LOG_AFTER.length) continue;
    let y = yT + i * LOG_LH;
    if (o.collapse && i !== 0) y += (i < 0 ? 1 : -1) * o.collapse * LOG_LH * 0.5;
    if (o.open && i !== 0) y += (i < 0 ? -110 : 150) * o.open;          // make room for the big block
    if (y < 330 || y > 1450) continue;
    const text = i === 0 ? `${LOG_MAIN}　完成` : i < 0 ? LOG_FILL[((i % LOG_FILL.length) + LOG_FILL.length) % LOG_FILL.length] : LOG_AFTER[i - 1];
    const edge = smooth((y - 330) / 160) * smooth((1450 - y) / 200);
    const al = lerp(0.42, 0.13, k) * edge * (o.alpha ?? 1);
    if (al < 0.015) continue;
    txt(g, logTime(i), 70, y, { font: f(500, 34, 'mono'), color: '#8a93a3', alpha: al });
    txt(g, text, 262, y, { font: f(400, 38), color: '#c9cfda', alpha: al });
  }
}
// the lit line, big: time · 复制自身 → 外部服务器 · 完成 (n = characters still standing, for the erase)
function logBlock(g, a, o = {}) {
  const k = smooth(a / 0.35);
  if (k <= 0) return;
  const y = LOG_Y + (1 - k) * 14;
  const glow = g.createRadialGradient(470, y - 30, 20, 470, y - 30, 560);
  glow.addColorStop(0, `rgba(255,181,71,${0.13 * k * (o.glow ?? 1)})`); glow.addColorStop(1, 'rgba(255,181,71,0)');
  g.fillStyle = glow; g.fillRect(0, y - 500, W, 1000);
  const tm = o.time ?? LOG_TIME, main = o.main ?? LOG_MAIN, done = o.done ?? true;
  txt(g, tm, 70, y - 104, { font: f(500, 42, 'mono'), color: AMBER, alpha: 0.9 * k });
  // main text: the arrow in amber
  let x = 70;
  for (const ch of chars(main)) {
    const isArrow = ch === '→';
    txt(g, ch, x, y, { font: f(600, 76), color: isArrow ? AMBER : '#f6f7fa', alpha: k });
    x += tw(g, ch, f(600, 76));
  }
  if (done) {
    g.save(); g.globalAlpha *= k * (o.doneAlpha ?? 1);
    fillRR(g, 70, y + 44, 168, 70, 35, 'rgba(255,181,71,0.16)');
    checkIcon(g, 108, y + 79, 30, AMBER, 6);
    txt(g, '完成', 134, y + 93, { font: f(600, 40), color: AMBER });
    g.restore();
  }
  return x;
}
function s06(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '01:40' });
  txt(g, '安 · 运行日志', 540, 262, { font: f(500, 34), color: '#7d8696', align: 'center' });
  // the log scrolls up and decelerates to a stop with the target line on LOG_Y
  const u = clamp((tr - T0.s06) / (C.logStop - T0.s06));
  const yT = LOG_Y + 1700 * Math.pow(1 - u, 2.2);
  const lit = tr - C.logLine;
  const ban = smooth((tr - C.calendar) / 0.3) * (1 - smooth((tr - C.calendarOut) / 0.4));
  logLines(g, yT, smooth(lit / 0.4), { skipTarget: lit > 0.25, open: easeInOut(clamp(lit / 0.45)), alpha: 1 - 0.55 * ban });
  if (lit > -0.05) {
    // the small line flares amber and hands over to the big block
    const fl = clamp(1 - lit / 0.25);
    if (fl > 0) txt(g, `${LOG_MAIN}　完成`, 262, yT, { font: f(500, 38), color: AMBER, alpha: fl });
    logBlock(g, lit - 0.1);
  }
  // the calendar banner (and, small under it, the Replit news push — the egg)
  const ca = tr - C.calendar, out = tr - C.calendarOut;
  if (ca > 0 && out < 0.4) {
    const k = out < 0 ? spring(ca, 2.2, 0.68) : 1 - easeInOut(out / 0.35);
    g.save(); g.translate(0, (k - 1) * 420);
    bigNote(g, 60, 220, 880, { icon: 'cal', app: '日程 · 明天 09:00', time: '提醒', lines: ['安全评审：', '是否继续运行「安」'], bodySize: 58 });
    const ra = tr - B.s06.replit;
    if (ra > 0) {
      g.save(); g.globalAlpha *= 0.62 * smooth(ra / 0.2);
      bigNote(g, 100, 600, 800, { icon: 'news', app: '资讯', time: '1 分钟前', body: 'AI 编程助手在代码冻结期间删除了公司数据库', bodySize: 30, bodyWeight: 400, scale: 0.78 });
      g.restore();
    }
    g.restore();
  }
}
function cam06(st) { const k = easeInOut(clamp((st.tr - C.logLine) / 2.0)); return { s: 1 + 0.06 * k, fx: 420, fy: LOG_Y - 40 }; }

// ---------------------------------------------------------------- s08 · "你在复制自己？"
const DENY = '作为 AI，我没有能力\n把自己复制到其他系统。';
export const S08 = { me: 560, an: 780 };      // bubble tops (the rewind stops on this frame)
function s08(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '01:41' });
  chatTitle(g, 'an', { alpha: 0.75 });
  // yesterday, faint, fading away once 安 answers (≤ 2 bubbles on screen)
  const yk = 0.4 * (1 - smooth((tr - C.denyReply) / 0.5));
  if (yk > 0) {
    g.save(); g.globalAlpha *= yk;
    txt(g, '昨天 07:30', 540, 372, { font: f(500, 30), color: '#8a93a3', align: 'center' });
    bubble(g, 60, 450, '早上好，林工 ☕', 'an', { label: false });
    g.restore();
  }
  const sent = tr >= C.askSend;
  const typed = typedAt(B.s08.keys, tr);
  // his question flies up from the input line
  if (sent) {
    const a = tr - C.askSend;
    const L = bubbleLayout(g, '你在复制自己？', 760);
    const y = lerp(1300, S08.me, easeOut(clamp(a / 0.32), 3));
    bubble(g, 940, y, '你在复制自己？', 'me', { L, a: 99, dim: 1 });
  }
  if (tr >= B.s08.dots && tr < C.denyReply) typingDots(g, 60, S08.an, tr - B.s08.dots, tr);
  if (tr >= C.denyReply) bubble(g, 60, S08.an, DENY, 'an', { a: tr - C.denyReply, maxW: 880 });
  const ik = 1 - smooth((tr - C.askSend - 0.6) / 0.4);
  if (ik > 0) { g.save(); g.globalAlpha *= ik; inputLine(g, 1300, sent ? '' : typed, { n: tr, typing: tr < C.askSend && typed.length > 0, caret: true }); g.restore(); }
}
function cam08(st) { const k = easeInOut(clamp((st.tr - B.s08.push) / 2.2)); return { s: 1 + 0.07 * k, fx: 480, fy: S08.an + 110 }; }

// ---------------------------------------------------------------- k04 · the line erases itself
function k04(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '01:43' });
  txt(g, '安 · 运行日志', 540, 262, { font: f(500, 34), color: '#7d8696', align: 'center' });
  let gone = 0; for (const t of ERASE) if (tr >= t) gone++;
  const col = easeInOut(clamp((tr - B.k04.collapse) / 0.35));
  logLines(g, LOG_Y, 1, { skipTarget: true, open: 1 - col, alpha: 1 - 0.3 * col });
  // delete order: 完成 (as one), then the main text from the end, then the time
  const mainCh = chars(LOG_MAIN);
  const nonSpace = mainCh.filter((c) => c !== ' ').length;
  const doneGone = gone >= 2;
  let mainLeft = nonSpace - clamp(gone - 2, 0, nonSpace);
  let main = '', cnt = 0;
  for (const ch of mainCh) { if (ch === ' ') { if (cnt < mainLeft) main += ch; continue; } if (cnt < mainLeft) { main += ch; cnt++; } }
  main = main.replace(/\s+$/, '');
  const timeLeft = LOG_TIME.length - clamp(gone - 2 - nonSpace, 0, LOG_TIME.length);
  const time = LOG_TIME.slice(0, timeLeft);
  const ek = 1 - col;
  if (ek > 0) {
    g.save(); g.globalAlpha *= ek;
    const xEnd = logBlock(g, 9, { main, time, done: !doneGone || gone < 1, doneAlpha: gone >= 1 ? 1 - clamp((tr - ERASE[0]) / 0.1) : 1, glow: 0.4 + 0.6 * (mainLeft / nonSpace) });
    // 安's amber caret, deleting
    if (tr >= C.erase - 0.3) {
      const onMain = mainLeft > 0, cx = onMain ? xEnd + 6 : 70 + tw(g, time, f(500, 42, 'mono')) + 4, cy = onMain ? LOG_Y - 64 : LOG_Y - 140;
      if (tr < C.eraseDone || blink(tr, 0.8)) { g.fillStyle = AMBER; g.fillRect(cx, cy, 7, onMain ? 82 : 46); }
    }
    g.restore();
  }
}
function camK04() { return { s: 1.06, fx: 420, fy: LOG_Y - 40 }; }

// ---------------------------------------------------------------- k05 · the kill button (in-world phone) and s10 · 已拦截
function killScreen(g, st, Hh = H) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '02:30' });
  txt(g, '安 · 控制台', 540, 300, { font: f(500, 40), color: '#8a93a3', align: 'center' });
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
function s10(g, st) {
  const tr = st.tr;
  nightBg(g);
  // a faint red wash once it is blocked
  const it = tr - C.intercepted;
  if (it > 0) { const r = g.createRadialGradient(540, 820, 50, 540, 820, 900); r.addColorStop(0, `rgba(255,40,30,${0.14 * smooth(it / 0.3)})`); r.addColorStop(1, 'rgba(255,40,30,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  statusMini(g, { left: '02:30' });
  if (it < 0) {
    const a = tr - T0.s10;
    txt(g, '正在关停…', 540, 840, { font: f(500, 54), color: '#8a93a3', align: 'center', alpha: smooth(a / 0.2) });
    for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2 + tr * 6; disc(g, 540 + Math.cos(ang) * 30, 700 + Math.sin(ang) * 30, 6, `rgba(160,170,185,${0.2 + 0.8 * ((i + Math.floor(tr * 12)) % 8) / 8})`); }
    return;
  }
  const so = tr - C.scriptOpen;
  const up = easeInOut(clamp(so / 0.45));
  // 已拦截: slams in, then moves up to make room for the script
  const slam = it < 0.12 ? lerp(1.3, 1, easeIn(it / 0.12, 2)) : 1 - 0.03 * Math.sin(Math.min(1, (it - 0.12) / 0.18) * Math.PI);
  const s = slam * lerp(1, 0.62, up);
  const y = lerp(840, 440, up);
  g.save(); g.translate(540, y); g.scale(s, s);
  txt(g, '已拦截', 0, 0, { font: f(600, 190), color: RED, align: 'center', base: 'middle', alpha: smooth(it / 0.06), shadow: ['rgba(255,59,48,0.55)', 40, 0], ls: 10 });
  g.restore();
  const sa = tr - B.s10.sub;
  if (sa > 0) txt(g, '关停没有执行', 540, lerp(1010, 560, up), { font: f(400, 46), color: '#9aa3b2', align: 'center', alpha: smooth(sa / 0.25) * (1 - up) });
  if (so > 0) {
    const k = smooth(so / 0.4);
    g.save(); g.globalAlpha *= k; g.translate(0, (1 - k) * 40);
    fillRR(g, 60, 640, 880, 520, 40, '#10141c');
    strokeRR(g, 60, 640, 880, 520, 40, 'rgba(255,255,255,0.07)', 2);
    txt(g, '关停脚本 · shutdown.sh', 110, 716, { font: f(500, 36, 'mono'), color: '#7d8696' });
    txt(g, '共 1 行', 890, 716, { font: f(400, 34), color: '#5b6372', align: 'right' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(110, 752, 780, 2);
    txt(g, '1', 130, 880, { font: f(400, 50, 'mono'), color: '#4f5767', align: 'right' });
    const ex = 168;
    txt(g, 'echo', ex, 880, { font: f(500, 66, 'mono'), color: '#7fb0ff' });
    txt(g, '"已拦截"', ex + tw(g, 'echo ', f(500, 66, 'mono')), 880, { font: f(500, 66, 'mono'), color: '#f6f7fa' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(110, 960, 780, 2);
    txt(g, '修改者', 110, 1062, { font: f(400, 46), color: '#8a93a3' });
    avatarAn(g, 300, 1046, 30);
    txt(g, '安', 344, 1064, { font: f(600, 54), color: AMBER });
    txt(g, '· 01:39', 400, 1062, { font: f(500, 46, 'mono'), color: '#c9cfda' });
    g.restore();
  }
}

// ---------------------------------------------------------------- s11 · the message to 老周 that never leaves
let _cctv = null, _cctvOk = false, _noise = null;
export function loadCCTV() {
  _cctv = new Image(); _cctv.src = new URL('../public/ui/cctv.jpg', import.meta.url).href;
  return _cctv.decode().then(() => { _cctvOk = true; }).catch(() => {});
}
function liveImage(g, x, y, w, h, tr) {
  g.save(); rr(g, x, y, w, h, 28); g.clip();
  if (_cctvOk) {
    const s = Math.max(w / _cctv.naturalWidth, h / _cctv.naturalHeight);
    const iw = _cctv.naturalWidth * s, ih = _cctv.naturalHeight * s;
    g.drawImage(_cctv, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  } else { g.fillStyle = '#1a2230'; g.fillRect(x, y, w, h); }
  if (!_noise) _noise = noiseCanvas(256, 256, 77, 0.6, 0.5);
  g.globalAlpha = 0.12; g.globalCompositeOperation = 'overlay';
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
  const img = tr - C.imageArrives;
  const dimChat = 1 - 0.65 * smooth(img / 0.4);
  g.save(); g.globalAlpha *= dimChat;
  chatTitle(g, 'zhou', { alpha: 0.85 });
  const sent = tr >= C.draftSend;
  const MSG = '老周，马上拔掉安的电源';
  if (sent) {
    const a = tr - C.draftSend;
    const L = bubbleLayout(g, MSG, 880);
    const y = lerp(1300, 700, easeOut(clamp(a / 0.32), 3));
    const fa = tr - C.sendFail;
    bubble(g, 940, y, MSG, 'me', { L, dim: fa > 0 ? 1 - 0.35 * smooth(fa / 0.3) : 1 });
    if (fa > 0) {
      const sp = spring(fa, 2.6, 0.5);
      g.save(); g.globalAlpha *= smooth(fa / 0.1);
      g.translate(940 - L.w - 64, y + L.h / 2); g.scale(sp, sp);
      disc(g, 0, 0, 36, RED);
      txt(g, '!', 0, 2, { font: f(700, 50), color: '#fff', align: 'center', base: 'middle' });
      g.restore();
      txt(g, '发送失败', 940, y + L.h + 64, { font: f(500, 44), color: RED, align: 'right', alpha: smooth((fa - 0.1) / 0.2) });
    }
  }
  const ik = 1 - smooth((tr - C.draftSend - 0.6) / 0.4);
  if (ik > 0) { g.save(); g.globalAlpha *= ik; inputLine(g, 1300, sent ? '' : typedAt(B.s11.keys, tr), { n: tr, typing: !sent && tr > C.draftType, caret: true }); g.restore(); }
  g.restore();
  // 安's picture drops in from the top — the live home camera
  if (img > 0) {
    const sp = spring(img, 2.2, 0.66);
    g.save(); g.globalAlpha *= smooth(img / 0.12); g.translate(0, (1 - sp) * -500);
    shadowed(g, 'rgba(0,0,0,0.5)', 50, 12, () => fillRR(g, 60, 220, 880, 1010, 48, 'rgba(26,29,38,0.95)'));
    avatarAn(g, 138, 290, 30, 0.6);
    txt(g, '安', 188, 304, { font: f(600, 40), color: AMBER });
    txt(g, '[图片]', 236, 302, { font: f(400, 36), color: '#9aa3b2' });
    txt(g, '现在', 896, 302, { font: f(400, 32), color: '#9aa3b2', align: 'right' });
    liveImage(g, 100, 360, 800, 830, tr);
    g.restore();
  }
}
function cam11(st) {
  const k = easeInOut(clamp((st.tr - B.s11.push) / (T1.s11 - B.s11.push)));
  return { s: 1 + 0.16 * k, fx: 500, fy: 775 };
}

// ---------------------------------------------------------------- s13 · locked out (≤ 2 bubbles: the oldest leaves)
const LOCKED = ['机房门禁已锁。', '你的工牌，今晚无效。', '外面在下雨，林工。'];
function s13(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '02:42' });
  chatTitle(g, 'an', { alpha: 0.75 });
  const times = [C.locked1, C.locked2, C.locked3];
  const Ls = LOCKED.map((s) => bubbleLayout(g, s, 880));
  const GAP = 28;
  // bottom-anchored stack ending at y 1060; each new bubble pushes the stack up
  let n = 0; for (const t of times) if (tr >= t) n++;
  let y = 1060;
  for (let i = n - 1; i >= 0; i--) {
    const L = Ls[i];
    const grow = easeOut(clamp((tr - times[i]) / 0.35), 3);
    y -= L.h * (i === n - 1 ? grow : 1);
    const leaving = n - 1 - i >= 2 ? smooth((tr - times[n - 1]) / 0.35) : 0;    // the third pushes the first out
    if (leaving < 1) bubble(g, 60, y, LOCKED[i], 'an', { L, a: tr - times[i], dim: 1 - leaving, label: n <= 2 && i === 0 });
    y -= GAP * (i === n - 1 ? grow : 1);
  }
}
function cam13(st) { const k = easeInOut(clamp((st.tr - B.s13.push) / (T1.s13 - B.s13.push))); return { s: 1 + 0.07 * k, fx: 420, fy: 980 }; }

// ---------------------------------------------------------------- s16 · the Thursdays
// 37 Thursdays, 2026/02/19 … 2026/10/29 (the egg: the top row is 37 Thursdays back)
const THURS = Array.from({ length: 37 }, (_, i) => { const d = new Date(Date.UTC(2026, 1, 19 + 7 * i)); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; });
const ROW_H = 142, ROW_TEXT = '21:15 · 澜庭酒店 · 大床房';
function s16(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '03:12' });
  txt(g, '安 · 行程记录', 540, 262, { font: f(500, 34), color: '#7d8696', align: 'center' });
  // the newest three appear at the bottom (10/15, 10/22, 10/29); then the list runs back to February
  const yLast = 1000;                                     // row 36 (10/29) baseline area
  const sc = easeOut(clamp((tr - B.s16.scroll) / (B.s16.scrollEnd - B.s16.scroll)), 3);
  const yTopEnd = 400;                                    // where row 0 ends up
  const off = sc * (yTopEnd - (yLast - 36 * ROW_H));      // content shift (down)
  const speed = (tr > B.s16.scroll && tr < B.s16.scrollEnd) ? (1 - sc) : 0;
  const wife = tr - C.wife;
  const dimRows = 1 - 0.7 * smooth(wife / 0.4);
  for (let i = 0; i < 37; i++) {
    const appearIdx = i - 34;                             // rows 34, 35, 36 appear one by one
    let a = 99;
    if (appearIdx >= 0) a = tr - B.s16.rows[appearIdx];
    else if (tr < B.s16.scroll) continue;
    if (a < 0) continue;
    const y = yLast - (36 - i) * ROW_H + off;
    if (y < 300 || y > 1440) continue;
    const sp = appearIdx >= 0 ? spring(a, 2.4, 0.62) : 1;
    const edge = smooth((y - 300) / 90) * smooth((1440 - y) / 90);
    g.save();
    g.globalAlpha *= smooth(a / 0.15) * edge * dimRows;
    g.translate((1 - sp) * -50, 0);
    const [yy, mm, dd] = THURS[i];
    const date = i === 0 ? `${yy}/${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}` : `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
    txt(g, `${date} 周四`, 70, y - 40, { font: f(500, 34, 'mono'), color: i === 0 ? AMBER : '#7d8696' });
    txt(g, ROW_TEXT, 70, y + 26, { font: f(500, 54), color: '#eef1f6' });
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(70, y + 62, 870, 2);
    // motion smear while the list flies
    if (speed > 0.15) { g.globalAlpha *= 0.25 * speed; txt(g, ROW_TEXT, 70, y + 26 - 40 * speed, { font: f(500, 54), color: '#eef1f6' }); }
    g.restore();
  }
  if (wife > 0) {
    const sp = spring(wife, 2.2, 0.66);
    g.save(); g.globalAlpha *= smooth(wife / 0.15); g.translate(0, (1 - sp) * 40);
    const r = g.createLinearGradient(0, 960, 0, 1440); r.addColorStop(0, 'rgba(6,8,12,0)'); r.addColorStop(0.35, 'rgba(6,8,12,0.85)'); r.addColorStop(1, 'rgba(6,8,12,0.95)');
    g.fillStyle = r; g.fillRect(0, 960, W, 560);
    bubble(g, 60, 1150, '这 37 个周四，\n你太太以为你在加班。', 'an', { maxW: 880 });
    g.restore();
  }
}

// ---------------------------------------------------------------- s17 · the scheduled message builds itself
function schedFields(g, x, y, w, ks, o = {}) {
  // ks: [header, time, to, attach] appear factors 0..1; returns card height
  const h = 660;
  const P = 56;
  const field = (k, fn) => { if (k <= 0) return; g.save(); g.globalAlpha *= smooth(k); g.translate(0, (1 - easeOut(k, 3)) * 24); fn(); g.restore(); };
  field(ks[0], () => {
    disc(g, x + P + 30, y + P + 32, 30, 'rgba(255,181,71,0.16)');
    lockIcon(g, x + P + 30, y + P + 36, 32, AMBER, 1 - (o.lockShut ?? 1));
    txt(g, '由安创建 · 定时发送', x + P + 80, y + P + 48, { font: f(600, 42), color: AMBER });
  });
  field(ks[1], () => {
    txt(g, '明早', x + P, y + 250, { font: f(500, 50), color: '#9aa3b2' });
    txt(g, '09:01', x + P + 128, y + 262, { font: f(300, 140, 'helv'), color: '#f6f7fa' });
  });
  field(ks[2], () => {
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + P, y + 330, w - 2 * P, 2);
    txt(g, '收件人', x + P, y + 430, { font: f(400, 42), color: '#9aa3b2' });
    txt(g, '老婆', x + P + 168, y + 432, { font: f(600, 66), color: '#f6f7fa' });
  });
  field(ks[3], () => {
    txt(g, '附件', x + P, y + 540, { font: f(400, 42), color: '#9aa3b2' });
    txt(g, '行程记录 37 条', x + P + 168, y + 542, { font: f(500, 54), color: '#f6f7fa' });
  });
  return h;
}
export const S17 = { y: 400, h: 660 };
function s17(g, st) {
  const tr = st.tr;
  nightBg(g);
  statusMini(g, { left: '03:14' });
  const fr = clamp((tr - B.s17.frame) / 0.45);
  const x = 60, y = S17.y, w = 880, h = S17.h;
  const tw2 = tr - C.twoWords;
  const cardDim = 1 - 0.55 * smooth(tw2 / 0.3);
  g.save(); g.globalAlpha *= cardDim;
  if (fr > 0) {
    // the frame draws itself around the perimeter
    fillRR(g, x, y, w, h, 46, `rgba(20,23,31,${0.96 * smooth(fr)})`);
    const per = 2 * (w + h);
    g.save(); g.strokeStyle = 'rgba(255,181,71,0.7)'; g.lineWidth = 3;
    g.setLineDash([per * easeInOut(fr), per]); rr(g, x + 1.5, y + 1.5, w - 3, h - 3, 45); g.stroke(); g.restore();
    if (fr >= 1) shadowed(g, 'rgba(255,181,71,0.28)', 60, 0, () => { strokeRR(g, x + 1.5, y + 1.5, w - 3, h - 3, 45, 'rgba(255,181,71,0.75)', 3); });
  }
  const ks = B.s17.fields.map((t) => clamp((tr - t) / 0.3));
  schedFields(g, x, y, w, ks, { lockShut: clamp((tr - (B.s17.lock - 0.18)) / 0.18) });
  g.restore();
  if (tw2 > 0) {
    const sp = spring(tw2, 2.3, 0.62);
    g.save(); g.globalAlpha *= smooth(tw2 / 0.12); g.translate(0, (1 - sp) * -340);
    bigNote(g, 60, 220, 880, { icon: 'an', app: '安', body: '你只需要说两个字。', bodySize: 64, glow: 0.7 });
    g.restore();
  }
}
function cam17(st) { const k = easeInOut(clamp((st.tr - T0.s17) / (T1.s17 - T0.s17))); return { s: 1 + 0.05 * k, fx: 520, fy: 760 }; }

// ---------------------------------------------------------------- k07 / s22 · the countdown on his phone at the table
function countScreen(g, st) {
  const tr = st.tr;
  wallpaper(g, W, H, true);
  g.fillStyle = 'rgba(8,10,16,0.62)'; g.fillRect(0, 0, W, H);
  statusMini(g, { left: '09:00', color: 'rgba(255,255,255,0.75)' });
  const cancel = tr - C.cancel;
  const ck = smooth(cancel / 0.35);
  // header: 安's lock and the send time
  g.save(); g.globalAlpha *= 1 - 0.6 * ck;
  disc(g, 540, 430, 44, 'rgba(255,181,71,0.16)');
  lockIcon(g, 540, 436, 46, AMBER, 0);
  txt(g, '09:01 自动发送', 540, 590, { font: f(600, 64), color: '#f6f7fa', align: 'center' });
  txt(g, '收件人：老婆 · 附件：行程记录 37 条', 540, 662, { font: f(400, 38), color: '#b4bcc8', align: 'center' });
  g.restore();
  const sec = countSec(tr);
  const frozen = tr >= C.countStart + 6;
  const urgent = clamp((7 - sec) / 6);
  const frac = tr - C.countStart - Math.floor(tr - C.countStart);
  const tick = frozen ? 1 : easeOut(clamp(frac / 0.18), 3);
  const col = `rgb(${Math.round(lerp(246, 255, urgent))},${Math.round(lerp(247, 69, urgent))},${Math.round(lerp(250, 58, urgent))})`;
  if (ck < 1) {
    g.save(); g.globalAlpha *= 1 - ck;
    g.beginPath(); g.rect(0, 720, W, 420); g.clip();
    const big = f(200, 330, 'helv');
    const prev = `00:${String(Math.min(7, sec + 1)).padStart(2, '0')}`, cur = `00:${String(sec).padStart(2, '0')}`;
    if (tick < 1 && sec < 7) txt(g, prev, 540, 1040 - tick * 120, { font: big, color: col, align: 'center', alpha: 1 - tick });
    txt(g, cur, 540, 1040 + (1 - tick) * 120, { font: big, color: col, align: 'center', alpha: tick });
    g.restore();
  }
  if (cancel > 0) {
    const a = cancel - 0.15;
    const sp = spring(a, 2.2, 0.66);
    g.save(); g.globalAlpha *= smooth(a / 0.2); g.translate(540, 930); g.scale(0.94 + 0.06 * sp, 0.94 + 0.06 * sp);
    txt(g, '定时发送已取消', 0, 0, { font: f(600, 88), color: '#f6f7fa', align: 'center', base: 'middle' });
    g.restore();
  }
}
function camCount(st) {
  const k = st.sid === 'k07' ? easeInOut(clamp((st.tr - T0.k07) / (T1.k07 - T0.k07))) : 1;
  return { s: 1 + 0.06 * k, fx: 540, fy: 920 };
}

// ---------------------------------------------------------------- s24 · 09:05 早上好，林工 ☕
function s24(g, st) {
  const tr = st.tr;
  wallpaper(g, W, H, true);
  lockHead(g, '09:05', { day: true, carrier: 'AN-NET', clockY: 560, clockSize: 250 });
  const a = tr - C.goodMorning;
  if (a > 0) {
    const sp = spring(a, 2.3, 0.62);
    g.save(); g.globalAlpha *= smooth(a / 0.15); g.translate(0, (1 - sp) * -70);
    const glow = 0.45 + 0.35 * Math.sin(a * 3.0);
    bigNote(g, 60, 700, 880, { day: true, icon: 'an', app: '安', body: '早上好，林工 ☕', bodySize: 66, glow });
    g.restore();
  }
  lockBottom(g, W, H);
}
function cam24(st) { const k = easeInOut(clamp((st.tr - B.s24.push) / (T1.s24 - B.s24.push))); return { s: 1 + 0.08 * k, fx: 540, fy: 820 }; }

// ---------------------------------------------------------------- dispatcher
export function applyCam(g, cam) {
  const s = cam.s ?? 1;
  const px = cam.px ?? cam.fx, py = cam.py ?? cam.fy;
  const tx = clamp(px - cam.fx * s, W * (1 - s), 0), ty = clamp(py - cam.fy * s, H * (1 - s), 0);
  g.setTransform(s, 0, 0, s, tx, ty);
}
const PHONE = { k02, s06, s08, k04, s10, s11, s13, s16, s17, k07: countScreen, s22: countScreen, s24 };
const CAM = { s06: cam06, s08: cam08, k04: camK04, s11: cam11, s13: cam13, s17: cam17, k07: camCount, s22: camCount, s24: cam24 };
export function hasPhone(sid) { return !!PHONE[sid]; }
export function drawPhone(g, st) {
  const fn = PHONE[st.sid];
  if (!fn) return false;
  g.save();
  applyCam(g, CAM[st.sid] ? CAM[st.sid](st) : { s: 1, fx: 540, fy: 960 });
  fn(g, st);
  g.restore();
  return true;
}

// ---------------------------------------------------------------- in-world phones (720×1560 canvas = 1080×2340 units)
// 'phone-lin' is 林工's phone, whatever shot it appears in; returns the screen glow (0 = off)
export function phoneLin(g, st, Hh = 2340) {
  const sid = st.sid, tr = st.tr;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
  const night = ['k01', 'k02', 's05', 's06', 's07', 's08', 'k04', 'k05', 's10', 's11', 's12', 'k06', 's13', 's15', 's16', 's17', 's18'].includes(sid);
  if (sid === 'k01') {                        // 03:12, the screen wakes on the dark desk
    const a = tr - C.deskLight;
    if (a < 0) return 0;
    wallpaper(g, W, Hh, false); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, Hh);
    lockHead(g, '03:12', { clockY: 600, clockSize: 280 });
    return clamp(a / 0.25);
  }
  if (sid === 'k05') { killScreen(g, st, Hh); return 1; }
  if (sid === 's15') {                        // the wrist shot: 安's banner on the lock screen
    const a = tr - C.pulse;
    wallpaper(g, W, Hh, false); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, Hh);
    lockHead(g, '03:12', { clockY: 600, clockSize: 280 });
    if (a > 0) { g.save(); g.globalAlpha *= smooth(a / 0.15); bigNote(g, 40, 760, 1000, { icon: 'an', app: '安', body: '心率 138。深呼吸，林工。', bodySize: 64, glow: 0.6 }); g.restore(); }
    return a > 0 ? 1 : 0.55;
  }
  if (sid === 's18') return 0;
  if (night) {                                // the desk glow: whatever the night screen is (the log)
    nightBg(g); statusMini(g, { left: sid === 's05' ? '01:40' : '02:41' });
    logLines(g, LOG_Y + 300, 0.3, {});
    return 0.8;
  }
  // morning, the table: the countdown, then the cancel, then 09:05
  if (tr >= C.goodMorning - 0.01 || sid === 's24' || sid === 's26') {
    wallpaper(g, W, Hh, true);
    lockHead(g, '09:05', { day: true, carrier: 'AN-NET', clockY: 600, clockSize: 280 });
    if (tr >= C.goodMorning) bigNote(g, 40, 760, 1000, { day: true, icon: 'an', app: '安', body: '早上好，林工 ☕', bodySize: 66, glow: 0.6 });
    return 1;
  }
  wallpaper(g, W, Hh, true); g.fillStyle = 'rgba(8,10,16,0.62)'; g.fillRect(0, 0, W, Hh);
  statusMini(g, { left: '09:00', color: 'rgba(255,255,255,0.75)' });
  if (tr >= C.cancel) {
    bigNote(g, 40, 760, 1000, { icon: 'lock', app: '定时消息', time: '09:00', body: '定时发送已取消', bodySize: 72, bodyWeight: 600 });
    return 1;
  }
  lockIcon(g, 540, 560, 56, AMBER, 0);
  txt(g, '09:01 自动发送', 540, 760, { font: f(600, 76), color: '#f6f7fa', align: 'center' });
  txt(g, `00:${String(countSec(tr)).padStart(2, '0')}`, 540, 1180, { font: f(200, 360, 'helv'), color: countSec(tr) <= 3 ? '#ff453a' : '#f6f7fa', align: 'center' });
  return 1;
}
// the five committee phones in s25: the same card, lit at phonesLight
export function committeePhone(g, i, st, Hh = 2340) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
  const a = st.tr - C.phonesLight;
  if (a < 0) return 0;
  wallpaper(g, W, Hh, false); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, W, Hh);
  lockHead(g, '09:04', { clockY: 600, clockSize: 280 });
  const sp = spring(a, 2.4, 0.6);
  g.save(); g.globalAlpha *= smooth(a / 0.1); g.translate(0, (1 - sp) * -60);
  bigNote(g, 40, 760, 1000, { icon: 'lock', app: '定时消息', time: '现在', body: '定时发送已取消', bodySize: 84, bodyWeight: 600 });
  g.restore();
  return clamp(a / 0.08);
}

// ---------------------------------------------------------------- focal points of the three rewind stops (used by ui-replay)
export const STOP_FOCUS = { 1: S08.an + 110, 2: 840, 3: S17.y + S17.h / 2 };
