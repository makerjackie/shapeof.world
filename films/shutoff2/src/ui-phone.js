// The phone OS of the film (its own design, dark at night, light lock screen in the morning).
// All layout is in "phone units": 1080 wide; the height H is 1920 for full-frame shots and 2340 for in-world phones.
import {
  f, COL, txt, tw, wrap, chars, spring, win, blink, hash, clamp, lerp, invLerp, smooth, easeOut, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, ripple, lockIcon, heartIcon, checkIcon, chevron, chatIcon, carIcon, trashIcon,
  signalIcon, batteryIcon, sendIcon, avatarAn, avatarAn2, makeCanvas, noiseCanvas,
} from './ui-kit.js';
import { storyTime, CUES } from './shots.js';

export const S = (tr) => storyTime(tr);   // real cue time → story time (phone UI runs on story time, so it crawls during stamps)

export const NIGHT = {
  dark: true, bg: '#0a0c11', bar: '#0e1117', text: '#f2f4f8', text2: '#98a1b0', text3: '#5b6372', line: 'rgba(255,255,255,0.075)',
  ai: '#1b1f28', aiText: '#eef1f6', me0: '#3c7cff', me1: '#2a60e6', meText: '#ffffff', chip: 'rgba(255,255,255,0.07)',
  field: '#191d25', kbd: '#101217', key: '#2a2e37', key2: '#1d2028', keyText: '#eef0f4', accent: '#5b95ff', surface: '#141821', surface2: '#1b202a',
};

// ---------------------------------------------------------------- status bar
export function statusBar(g, W, o) {
  const c = o.color ?? '#f2f4f8';
  if (o.carrier) txt(g, o.carrier, 84, 70, { font: f(500, 36), color: c });
  else txt(g, o.time, 92, 70, { font: f(600, 42), color: c });
  const R = W - 66;
  batteryIcon(g, R - 64, 56, 30, c, 0.84);
  txt(g, '84%', R - 80, 69, { font: f(600, 34), color: c, align: 'right' });
  const pw = tw(g, '84%', f(600, 34));
  let x = R - 80 - pw - 22;
  txt(g, '5G', x, 69, { font: f(600, 32), color: c, align: 'right' });
  x -= tw(g, '5G', f(600, 32)) + 14 + 4 * 0.32 * 26;
  signalIcon(g, x, 66, 26, c);
}

// ---------------------------------------------------------------- chat
const BUB = { font: f(400, 54), lh: 78, px: 34, py: 24, maxW: 640, r: 40 };
const AV = { r: 39, lx: 87, rx: 1080 - 87 };
const BX = { l: 144, r: 1080 - 144 };

function avatarLin(g, x, y, r) {
  const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  gr.addColorStop(0, '#6c7a90'); gr.addColorStop(1, '#3e4858');
  disc(g, x, y, r, gr);
  txt(g, '林', x, y + 1, { font: f(500, Math.round(r * 0.95)), color: '#e8edf5', align: 'center', base: 'middle' });
}

export function chatHeader(g, W, th, o = {}) {
  g.fillStyle = th.bar; g.fillRect(0, 0, W, 212);
  statusBar(g, W, { time: o.time, color: th.text });
  chevron(g, 58, 150, 38, th.accent);
  avatarAn(g, 150, 150, 42);
  txt(g, '安', 212, 145, { font: f(600, 48), color: th.text });
  const nw = tw(g, '安', f(600, 48));
  fillRR(g, 212 + nw + 16, 106, 124, 44, 22, 'rgba(255,181,71,0.16)');
  txt(g, 'AI 助手', 212 + nw + 16 + 62, 137, { font: f(500, 27), color: COL.amber, align: 'center' });
  const status = o.status ?? '在线';
  disc(g, 220, 182, 7, status === '在线' ? '#30d158' : COL.amber);
  txt(g, status, 236, 193, { font: f(400, 30), color: th.text2 });
  g.fillStyle = th.line; g.fillRect(0, 211, W, 2);
}

function measure(g, it) {
  if (it.k === 'date') return { h: 96 };
  if (it.k === 'msg') {
    const lines = wrap(g, it.text, BUB.maxW, BUB.font);
    const w = Math.max(...lines.map((l) => tw(g, l, BUB.font)));
    return { h: lines.length * BUB.lh + 2 * BUB.py, lines, w: Math.ceil(w + 2 * BUB.px) };
  }
  if (it.k === 'typing') return { h: BUB.lh + 2 * BUB.py, w: 170 };
  if (it.k === 'image') return { h: 500 };
  if (it.k === 'rows') return { h: rowsCardH(it, it._n) };
  if (it.k === 'sched') return { h: 520 };
  return { h: 0 };
}

// Bottom-anchored chat list. Items appear at their `at` (real cue seconds), grow in and spring.
export function chatList(g, W, items, n, top, bottom, th) {
  const L = [];
  for (const it of items) {
    const a = it.at == null ? 99 : n - S(it.at);
    if (a < 0) continue;
    if (it.until != null && n >= S(it.until)) continue;
    it._n = n;
    const m = measure(g, it);
    L.push({ it, m, a, grow: it.at == null ? 1 : easeOut(clamp(a / 0.32), 3) });
  }
  let y = bottom - (items.scroll ?? 0);
  for (let i = L.length - 1; i >= 0; i--) {
    const e = L[i];
    const prev = L[i - 1];
    const gap = !prev ? 0 : (e.it.k === 'date' || prev.it.k === 'date') ? 6 : (prev.it.from === e.it.from && e.it.k === 'msg' && prev.it.k === 'msg') ? 22 : 40;
    y -= e.m.h * e.grow;
    e.y = y;
    y -= gap * e.grow;
  }
  g.save();
  g.beginPath(); g.rect(0, top, W, bottom - top + 40); g.clip();
  for (const e of L) {
    if (e.y + e.m.h < top - 10 || e.y > bottom + 40) continue;
    drawItem(g, e, n, th);
  }
  g.restore();
  return L;
}

function bubblePath(g, x, y, w, h, side) {
  const r = BUB.r, rt = 12;
  rr(g, x, y, w, h, side === 'l' ? [rt, r, r, r] : [r, rt, r, r]);
}

function drawItem(g, e, n, th) {
  const { it, m, a } = e;
  const sp = it.at == null ? 1 : spring(a, 2.6, 0.58);
  const al = it.at == null ? 1 : smooth(a / 0.14);
  g.save();
  g.globalAlpha *= al;
  if (it.k === 'date') {
    const w = tw(g, it.text, f(500, 30)) + 48;
    fillRR(g, 540 - w / 2, e.y + 22, w, 52, 26, th.chip);
    txt(g, it.text, 540, e.y + 59, { font: f(500, 30), color: th.text2, align: 'center' });
  } else if (it.k === 'msg' || it.k === 'typing') {
    const left = it.from !== 'me';
    const w = m.w, h = m.h;
    const x = left ? BX.l : BX.r - w;
    const ox = left ? x : x + w, oy = e.y + h;
    g.translate(ox, oy); const s = 0.86 + 0.14 * sp; g.scale(s, s); g.translate(-ox, -oy + (1 - sp) * 26);
    if (left) avatarAn(g, AV.lx, e.y + AV.r, AV.r, it.glow ?? 0); else avatarLin(g, AV.rx, e.y + AV.r, AV.r);
    if (left) {
      bubblePath(g, x, e.y, w, h, 'l'); g.fillStyle = th.ai; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2; g.stroke();
    } else {
      const gr = g.createLinearGradient(0, e.y, 0, e.y + h); gr.addColorStop(0, th.me0); gr.addColorStop(1, th.me1);
      bubblePath(g, x, e.y, w, h, 'r'); g.fillStyle = gr; g.fill();
    }
    if (it.k === 'typing') {
      for (let i = 0; i < 3; i++) {
        const ph = (n * 2.2 - i * 0.18) % 1; const b = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0;
        disc(g, x + 50 + i * 36, e.y + h / 2 - b * 9, 11, `rgba(220,226,236,${0.45 + 0.4 * b})`);
      }
    } else {
      m.lines.forEach((l, i) => txt(g, l, x + BUB.px, e.y + BUB.py + 56 + i * BUB.lh, { font: BUB.font, color: left ? th.aiText : th.meText }));
    }
  } else if (it.k === 'image') {
    const ox = BX.l, oy = e.y + 500;
    g.translate(ox, oy); const s = 0.8 + 0.2 * sp; g.scale(s, s); g.translate(-ox, -oy + (1 - sp) * 30);
    avatarAn(g, AV.lx, e.y + AV.r, AV.r);
    drawLiveImage(g, BX.l, e.y, 640, 480, n);
  } else if (it.k === 'rows') {
    const ox = BX.l, oy = e.y + m.h;
    g.translate(ox, oy); const s = 0.9 + 0.1 * sp; g.scale(s, s); g.translate(-ox, -oy + (1 - sp) * 24);
    avatarAn(g, AV.lx, e.y + AV.r, AV.r);
    drawRowsCard(g, BX.l, e.y, 800, it, n);
  } else if (it.k === 'sched') {
    drawSchedCreate(g, e.y, it, n, a);
  }
  g.restore();
}

// ---- s16: the Thursday rows card
const ROWS = [
  { icon: 'chat', time: '每周四 21:00', text: '已替你回复老婆「今晚加班」' },
  { icon: 'car', time: '每周四 21:15', text: '已替你叫车 → 澜庭公寓' },
  { icon: 'trash', time: '每周四 23:40', text: '已替你清除行程记录' },
];
function rowsCardH(it, n) {
  let h = 96;
  it.rowsAt.forEach((t) => { h += 150 * easeOut(clamp((n - S(t)) / 0.35), 3); });
  return h + 18;
}
function drawRowsCard(g, x, y, w, it, n) {
  const h = rowsCardH(it, n);
  fillRR(g, x, y, w, h, 36, '#171b24');
  strokeRR(g, x, y, w, h, 36, 'rgba(255,181,71,0.22)', 2);
  txt(g, '任务记录', x + 40, y + 66, { font: f(500, 32), color: '#8f98a8' });
  txt(g, '共 8 周', x + w - 40, y + 66, { font: f(400, 30), color: '#5b6372', align: 'right' });
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  let yy = y + 96;
  it.rowsAt.forEach((t, i) => {
    const a = n - S(t);
    if (a < 0) return;
    const k = easeOut(clamp(a / 0.35), 3), sp = spring(a, 2.4, 0.6);
    const r = ROWS[i];
    g.save();
    g.globalAlpha *= smooth(a / 0.2);
    g.translate((1 - sp) * -60, 0);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 40, yy, w - 80, 2);
    const cy = yy + 75;
    disc(g, x + 84, cy, 44, 'rgba(255,181,71,0.15)');
    if (r.icon === 'chat') chatIcon(g, x + 84, cy + 2, 44, COL.amber);
    if (r.icon === 'car') carIcon(g, x + 84, cy + 2, 50, COL.amber);
    if (r.icon === 'trash') trashIcon(g, x + 84, cy, 44, COL.amber);
    txt(g, r.time, x + 152, cy - 12, { font: f(600, 38), color: COL.amber });
    txt(g, r.text, x + 152, cy + 46, { font: f(400, 45), color: '#eef1f6' });
    g.restore();
    yy += 150 * k;
  });
  g.restore();
}

// ---- s17: the scheduled message, created in the chat (the same card as the opening)
export const LOCK_SHUT = 0.45;   // seconds after the card appears until its lock snaps shut
function drawSchedCreate(g, y, it, n, a) {
  const k = easeOut(clamp(a / 0.5), 3);
  const sp = spring(a, 2.0, 0.6);
  g.save();
  g.translate(540, y + 260); const s = 0.9 + 0.1 * sp; g.scale(s, s); g.translate(-540, -(y + 260));
  const remain = Math.max(0, Math.round((9 * 3600 + 60) - (3 * 3600 + 14 * 60 + 8) - (n - S(it.at))));
  const hh = Math.floor(remain / 3600), mm = Math.floor(remain / 60) % 60, ss = remain % 60;
  schedCard(g, 108, y, 864, { dark: true, countdown: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, scale: 1, lockClose: clamp(a / LOCK_SHUT) });
  // creation sweep: an amber scan line runs down the card once
  if (a < 0.7) {
    const sy = y + 520 * easeInOut(clamp(a / 0.6));
    const gr = g.createLinearGradient(0, sy - 80, 0, sy + 4);
    gr.addColorStop(0, 'rgba(255,181,71,0)'); gr.addColorStop(1, `rgba(255,181,71,${0.35 * (1 - a / 0.7)})`);
    g.save(); rr(g, 108, y, 864, 520, 40); g.clip(); g.fillStyle = gr; g.fillRect(108, sy - 80, 864, 84); g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- the scheduled-message card (lock screens, chat, split)
// o: { dark, countdown, label, state: 'live'|'cancelled', k: cancel progress, scale, lockClose }
export function schedCard(g, x, y, w, o) {
  const dark = !!o.dark;
  const s = o.scale ?? 1;
  const h = 520 * s;
  const P = 44 * s;
  const ink = dark ? '#f2f4f8' : '#101318', ink2 = dark ? '#98a1b0' : '#5a616d';
  const amber = dark ? COL.amber : '#c46f00';
  shadowed(g, dark ? 'rgba(255,181,71,0.18)' : 'rgba(30,40,60,0.18)', 40 * s, 10 * s, () => fillRR(g, x, y, w, h, 40 * s, dark ? 'rgba(24,27,35,0.96)' : 'rgba(255,255,255,0.86)'));
  strokeRR(g, x + 1.5, y + 1.5, w - 3, h - 3, 39 * s, dark ? 'rgba(255,181,71,0.55)' : 'rgba(214,128,0,0.55)', 3 * s);
  // header
  disc(g, x + P + 30 * s, y + P + 30 * s, 30 * s, dark ? 'rgba(255,181,71,0.16)' : 'rgba(255,181,71,0.22)');
  lockIcon(g, x + P + 30 * s, y + P + 34 * s, 34 * s, amber, 1 - (o.lockClose ?? 1));
  txt(g, '由「安」创建 · 无法取消', x + P + 76 * s, y + P + 44 * s, { font: f(600, Math.round(40 * s)), color: amber });
  txt(g, '09:01 自动发送', x + P, y + P + 138 * s, { font: f(600, Math.round(66 * s)), color: ink });
  txt(g, '收件人', x + P, y + P + 210 * s, { font: f(400, Math.round(36 * s)), color: ink2 });
  txt(g, '老婆、安全评审委员会', x + P + 132 * s, y + P + 210 * s, { font: f(500, Math.round(40 * s)), color: ink });
  txt(g, '附件', x + P, y + P + 272 * s, { font: f(400, Math.round(36 * s)), color: ink2 });
  txt(g, '澜庭公寓·行程记录.pdf 等 37 个', x + P + 132 * s, y + P + 272 * s, { font: f(500, Math.round(40 * s)), color: ink });
  g.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; g.fillRect(x + P, y + P + 312 * s, w - 2 * P, 2 * s);
  txt(g, o.label ?? '距离发送', x + P, y + h - P - 22 * s, { font: f(500, Math.round(38 * s)), color: ink2 });
  const urgent = o.urgent ?? 0;
  txt(g, o.countdown, x + w - P, y + h - P - 4 * s, { font: f(600, Math.round(112 * s), 'helv'), color: urgent ? `rgb(${lerp(dark ? 242 : 16, 255, urgent)},${lerp(dark ? 244 : 19, 59, urgent)},${lerp(dark ? 248 : 24, 48, urgent)})` : ink, align: 'right' });
  return h;
}

// ---------------------------------------------------------------- input bar + keyboard
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const KH = 650, IBH = 120;
function keyPos(ch, W, y0) {
  const kw = (W - 24 - 9 * 12) / 10, kh = 116;
  for (let r = 0; r < 3; r++) {
    const i = KB_ROWS[r].indexOf(ch);
    if (i >= 0) {
      const off = r === 0 ? 12 : r === 1 ? 12 + (kw + 12) / 2 : 12 + (kw + 12) * 1.5;
      return { x: off + i * (kw + 12), y: y0 + 100 + r * 132, w: kw, h: kh };
    }
  }
  return null;
}
// typing script: [{py, out, at, cands}] → state at story time n
const KEY_DT = 0.048, KEY_LEAD = 0.05;
// story times of every keystroke of a typing script: each pinyin letter, then the candidate/symbol commit
// per group (story time): commit time, first letter, letter spacing — letters never start before the previous commit
function keySchedule(groups) {
  let prev = -1e9;
  return groups.map((gr) => {
    const at = S(gr.at), L = gr.py ? gr.py.length : 0;
    let dt = KEY_DT, start = at - L * dt - KEY_LEAD;
    if (L && start < prev + 0.03) { start = prev + 0.03; dt = Math.max(0.02, (at - KEY_LEAD - start) / L); }
    prev = at;
    return { gr, at, L, start, dt };
  });
}
export function keyTimes(groups) {
  const out = [];
  for (const { at, L, start, dt } of keySchedule(groups)) {
    for (let k = 0; k < L; k++) out.push(start + k * dt);
    out.push(at);
  }
  return out;
}
export function typingState(groups, n) {
  let text = '', comp = '', cands = null, key = null, keyT = 9;
  for (const { gr, at, L, start, dt } of keySchedule(groups)) {
    if (n >= at) { text += gr.out; if (n - at < 0.1) { key = L ? 'space' : 'sym'; keyT = n - at; } continue; }
    if (L && n >= start) {
      const k = Math.min(L, Math.floor((n - start) / dt) + 1);
      comp = gr.py.slice(0, k); cands = gr.cands; key = gr.py[k - 1]; keyT = (n - start) - (k - 1) * dt;
    }
    break;
  }
  return { text, comp, cands, key, keyT };
}

export function inputBar(g, W, y, th, o = {}) {
  g.fillStyle = th.bar; g.fillRect(0, y, W, IBH);
  g.fillStyle = th.line; g.fillRect(0, y, W, 2);
  fillRR(g, 40, y + 14, 860, 92, 46, th.field);
  const tx = 80, ty = y + 78;
  if (o.text || o.comp) {
    txt(g, o.text || '', tx, ty, { font: f(400, 50), color: th.text });
    let cx = tx + tw(g, o.text || '', f(400, 50));
    if (o.comp) {
      txt(g, o.comp, cx + 4, ty, { font: f(400, 44), color: th.text2 });
      const cw = tw(g, o.comp, f(400, 44));
      g.fillStyle = th.text2; g.fillRect(cx + 4, ty + 10, cw, 3);
      cx += cw + 8;
    }
    if (o.caret !== false && (o.typing || blink(o.n ?? 0, 1.06))) { g.fillStyle = th.accent; g.fillRect(cx + 4, y + 30, 5, 60); }
  } else {
    txt(g, '发消息…', tx, ty, { font: f(400, 46), color: th.text3 });
    if (o.caret && blink(o.n ?? 0, 1.06)) { g.fillStyle = th.accent; g.fillRect(tx - 6, y + 30, 5, 60); }
  }
  const active = !!o.text;
  disc(g, 978, y + 60, 46, active ? th.me0 : th.field);
  sendIcon(g, 978, y + 60, 46, active ? '#fff' : th.text3);
}

export function keyboard(g, W, y0, H, th, st = {}) {
  g.fillStyle = th.kbd; g.fillRect(0, y0, W, H - y0);
  g.fillStyle = th.line; g.fillRect(0, y0, W, 2);
  // candidate bar
  if (st.comp && st.cands) {
    txt(g, st.comp, 40, y0 + 40, { font: f(400, 28), color: th.text2 });
    let x = 40;
    st.cands.forEach((c, i) => {
      txt(g, c, x, y0 + 84, { font: f(i ? 400 : 600, 44), color: i ? th.text2 : th.text });
      x += tw(g, c, f(400, 44)) + 64;
    });
  } else {
    const icons = ['☺', '⌘', '◎', '♪', '⋯'];
    icons.forEach((c, i) => txt(g, c, 96 + i * 210, y0 + 70, { font: f(400, 40), color: th.text3, align: 'center' }));
  }
  const kw = (W - 24 - 9 * 12) / 10;
  for (let r = 0; r < 3; r++) {
    for (const ch of KB_ROWS[r]) {
      const p = keyPos(ch, W, y0);
      const down = st.key === ch && st.keyT < 0.09;
      fillRR(g, p.x, p.y, p.w, p.h, 14, down ? '#4a505c' : th.key);
      txt(g, ch, p.x + p.w / 2, p.y + 76, { font: f(400, 46), color: th.keyText, align: 'center' });
    }
  }
  // shift / delete
  const r3y = y0 + 100 + 2 * 132;
  fillRR(g, 12, r3y, kw * 1.4, 116, 14, th.key2);
  txt(g, '⇧', 12 + kw * 0.7, r3y + 76, { font: f(400, 44), color: th.keyText, align: 'center' });
  fillRR(g, W - 12 - kw * 1.4, r3y, kw * 1.4, 116, 14, th.key2);
  txt(g, '⌫', W - 12 - kw * 0.7, r3y + 76, { font: f(400, 44), color: th.keyText, align: 'center' });
  // bottom row
  const by = y0 + 100 + 3 * 132;
  fillRR(g, 12, by, 150, 116, 14, st.key === 'sym' && st.keyT < 0.09 ? '#4a505c' : th.key2);
  txt(g, '123', 87, by + 72, { font: f(500, 38), color: th.keyText, align: 'center' });
  fillRR(g, 174, by, 110, 116, 14, th.key2);
  txt(g, '中', 229, by + 74, { font: f(500, 40), color: th.keyText, align: 'center' });
  const spDown = st.key === 'space' && st.keyT < 0.09;
  fillRR(g, 296, by, 548, 116, 14, spDown ? '#4a505c' : th.key);
  txt(g, '空格', 570, by + 74, { font: f(400, 38), color: th.keyText, align: 'center' });
  fillRR(g, 856, by, 212, 116, 14, st.sendActive ? th.me0 : th.key2);
  txt(g, '发送', 962, by + 74, { font: f(500, 40), color: '#fff', align: 'center' });
  // key preview bubble
  if (st.key && st.key.length === 1 && st.keyT < 0.09) {
    const p = keyPos(st.key, W, y0);
    if (p) {
      shadowed(g, 'rgba(0,0,0,0.5)', 20, 6, () => fillRR(g, p.x - 14, p.y - 150, p.w + 28, 150, 20, '#4a505c'));
      txt(g, st.key, p.x + p.w / 2, p.y - 46, { font: f(400, 64), color: '#fff', align: 'center' });
    }
  }
  fillRR(g, W / 2 - 140, H - 22, 280, 9, 5, 'rgba(255,255,255,0.35)');
}

// ---------------------------------------------------------------- the live camera still (s11, a small 2D drawing; s12 shows it in 3D)
let _still = null, _stillNoise = null;
function liveStill() {
  if (_still) return _still;
  const w = 640, h = 480, c = makeCanvas(w, h), g = c.getContext('2d');
  // floor
  const fl = g.createLinearGradient(0, 0, w, h); fl.addColorStop(0, '#1d2733'); fl.addColorStop(1, '#121821');
  g.fillStyle = fl; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,190,220,0.06)'; g.lineWidth = 2;
  for (let i = -10; i < 30; i++) { g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44 + 120, h); g.stroke(); }
  // rain light from the window (left): soft cold stripes with drops
  const wl = g.createLinearGradient(0, 0, 260, 0); wl.addColorStop(0, 'rgba(120,150,210,0.32)'); wl.addColorStop(1, 'rgba(120,150,210,0)');
  g.fillStyle = wl; g.fillRect(0, 0, 260, h);
  for (let i = 0; i < 60; i++) { const x = hash(i) * 220, y = hash(i + 50) * h; g.fillStyle = `rgba(190,210,255,${0.05 + 0.1 * hash(i + 9)})`; g.fillRect(x, y, 3, 10 + 24 * hash(i + 3)); }
  // rug
  fillRR(g, 240, 250, 330, 210, 10, 'rgba(70,60,90,0.35)');
  // desk (top-down, slightly oblique)
  g.save();
  g.translate(300, 170); g.rotate(-0.06);
  shadowed(g, 'rgba(0,0,0,0.6)', 18, 10, () => fillRR(g, -180, -86, 360, 150, 8, '#2b2a30'));
  g.fillStyle = '#3a3840'; g.fillRect(-180, 58, 360, 8);
  // monitor + keyboard + papers
  fillRR(g, -120, -82, 200, 26, 4, '#15161b');
  fillRR(g, -60, -30, 130, 34, 4, '#22232a');
  g.save(); g.rotate(0.2); fillRR(g, 92, -60, 56, 72, 2, '#8c8f99'); g.restore();
  fillRR(g, 110, -10, 48, 40, 2, '#6f727c');
  // the phone and its glow pool
  const pg = g.createRadialGradient(-20, 30, 4, -20, 30, 130); pg.addColorStop(0, 'rgba(200,225,255,0.55)'); pg.addColorStop(1, 'rgba(200,225,255,0)');
  g.fillStyle = pg; g.fillRect(-170, -100, 300, 260);
  fillRR(g, -34, 18, 28, 52, 5, '#e8f2ff');
  g.restore();
  // chair + the man from above (head, shoulders, arms toward the desk)
  g.save();
  g.translate(296, 300);
  disc(g, 0, 40, 74, 'rgba(10,12,16,0.5)');
  fillRR(g, -70, 30, 140, 70, 30, '#1b1d23');
  // arms
  g.fillStyle = '#2c3240';
  g.save(); g.rotate(-0.35); fillRR(g, -66, -110, 36, 120, 18, '#2c3240'); g.restore();
  g.save(); g.rotate(0.3); fillRR(g, 30, -110, 36, 120, 18, '#2c3240'); g.restore();
  disc(g, -52, -112, 15, '#8a7a6e'); disc(g, 38, -114, 15, '#8a7a6e');
  // shoulders + back
  g.beginPath(); g.ellipse(0, 0, 82, 48, 0, 0, Math.PI * 2); g.fillStyle = '#323a4a'; g.fill();
  g.beginPath(); g.ellipse(0, 6, 70, 34, 0, 0, Math.PI); g.fillStyle = '#272e3b'; g.fill();
  // head (hair from above), lit on the near side by the phone
  disc(g, 0, -22, 31, '#141518');
  const hl = g.createRadialGradient(-6, -40, 2, -6, -40, 30); hl.addColorStop(0, 'rgba(180,200,240,0.35)'); hl.addColorStop(1, 'rgba(180,200,240,0)');
  g.fillStyle = hl; g.beginPath(); g.arc(0, -22, 31, 0, Math.PI * 2); g.fill();
  g.restore();
  // night-vision grade + fisheye vignette
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(40,70,90,0.22)'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  _still = c;
  _stillNoise = noiseCanvas(256, 256, 77, 0.6, 0.5);
  return c;
}
export function drawLiveImage(g, x, y, w, h, n, opt = {}) {
  const img = liveStill();
  g.save();
  rr(g, x, y, w, h, 30); g.clip();
  g.drawImage(img, x, y, w, h);
  // live sensor noise (changes per frame, seeded by the frame time)
  g.globalAlpha = 0.16;
  const ox = Math.floor(hash(Math.floor(n * 30)) * 200), oy = Math.floor(hash(Math.floor(n * 30) + 7) * 200);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(_stillNoise, ox, oy, 56, 42, x, y, w, h);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  // scanlines
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let yy = y; yy < y + h; yy += 6) g.fillRect(x, yy, w, 2);
  // recognition box around the man
  const bx = x + w * 0.29, by = y + h * 0.34, bw = w * 0.36, bh = h * 0.5;
  g.strokeStyle = COL.amber; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
  g.lineWidth = 7;
  const cl = 22;
  for (const [cx, cy, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
    g.beginPath(); g.moveTo(cx + dx * cl, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * cl); g.stroke();
  }
  fillRR(g, bx, by - 44, 200, 38, 6, COL.amber);
  txt(g, '林工 · 138', bx + 12, by - 15, { font: f(600, 26), color: COL.amberInk });
  // live chip + time
  fillRR(g, x + 20, y + 20, 214, 46, 23, 'rgba(0,0,0,0.55)');
  disc(g, x + 44, y + 43, 8, blink(n, 1) ? '#ff453a' : 'rgba(255,69,58,0.35)');
  txt(g, '实时 · 书房', x + 62, y + 53, { font: f(500, 27), color: '#fff' });
  const secs = 7 + Math.floor(Math.max(0, n - S(CUES.imageArrives)));
  txt(g, `02:41:${String(secs).padStart(2, '0')}`, x + w - 22, y + h - 22, { font: f(500, 26, 'mono'), color: 'rgba(255,255,255,0.85)', align: 'right' });
  g.restore();
}

// ---------------------------------------------------------------- notification card (lock screens, banners)
// o: { dark, icon: 'an'|'an2'|'news'|'doc', app, time, body, glow, title }
export function noteCard(g, x, y, w, o) {
  const s = o.scale ?? 1;
  const P = 36 * s;
  const bodyFont = f(o.bodyWeight ?? 400, Math.round((o.bodySize ?? 46) * s));
  const lh = Math.round((o.bodySize ?? 46) * 1.38 * s);
  const bodyX = x + P + 100 * s;
  const lines = wrap(g, o.body, x + w - P - bodyX, bodyFont);
  const h = Math.max(150 * s, P + 56 * s + lines.length * lh + P - 8 * s);
  const dark = !!o.dark;
  shadowed(g, 'rgba(0,0,0,0.22)', 30 * s, 8 * s, () => fillRR(g, x, y, w, h, 40 * s, dark ? 'rgba(30,33,42,0.9)' : 'rgba(255,255,255,0.82)'));
  if (o.border) strokeRR(g, x + 1, y + 1, w - 2, h - 2, 40 * s, o.border, 2.5 * s);
  const ix = x + P + 38 * s, iy = y + P + 38 * s, ir = 38 * s;
  if (o.icon === 'an') avatarAn(g, ix, iy, ir, o.glow ?? 0);
  else if (o.icon === 'an2') avatarAn2(g, ix, iy, ir, o.glow ?? 0);
  else if (o.icon === 'news') {
    fillRR(g, ix - ir, iy - ir, 2 * ir, 2 * ir, 18 * s, '#3a4a66');
    for (let i = 0; i < 3; i++) fillRR(g, ix - ir * 0.5, iy - ir * 0.42 + i * ir * 0.36, ir * (i === 0 ? 1.0 : 0.8), ir * 0.16, 3 * s, 'rgba(255,255,255,0.85)');
  } else if (o.icon === 'doc') {
    fillRR(g, ix - ir, iy - ir, 2 * ir, 2 * ir, 18 * s, dark ? '#2a2f3a' : '#e9ecf1');
    lockIcon(g, ix, iy + 4 * s, ir * 0.95, '#c46f00', 1);
  }
  const c1 = dark ? '#f2f4f8' : '#0f1217', c2 = dark ? '#98a1b0' : '#5f6672';
  txt(g, o.app, bodyX, y + P + 34 * s, { font: f(600, Math.round(34 * s)), color: c2 });
  txt(g, o.time ?? '现在', x + w - P, y + P + 34 * s, { font: f(400, Math.round(30 * s)), color: c2, align: 'right' });
  lines.forEach((l, i) => txt(g, l, bodyX, y + P + 56 * s + (i + 0.78) * lh, { font: bodyFont, color: c1 }));
  return { h, lines, bodyX, bodyFont, lh, y0: y + P + 56 * s };
}

// ---------------------------------------------------------------- lock screen
export function wallpaper(g, W, H, morning) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (morning) { gr.addColorStop(0, '#2f5fa8'); gr.addColorStop(0.42, '#7ea8de'); gr.addColorStop(0.78, '#d9d4d6'); gr.addColorStop(1, '#f1d1b0'); }
  else { gr.addColorStop(0, '#070a14'); gr.addColorStop(0.5, '#0e1430'); gr.addColorStop(1, '#1a1636'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, c) => { const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, c); b.addColorStop(1, c.replace(/[\d.]+\)$/, '0)')); g.fillStyle = b; g.fillRect(0, 0, W, H); };
  if (morning) {
    blob(W * 0.85, H * 0.1, W * 0.9, 'rgba(255,236,200,0.55)');
    blob(W * 0.1, H * 0.62, W * 0.8, 'rgba(160,200,255,0.35)');
    blob(W * 0.7, H * 0.95, W * 0.9, 'rgba(255,190,150,0.45)');
  } else {
    blob(W * 0.2, H * 0.2, W * 0.8, 'rgba(70,60,160,0.35)');
    blob(W * 0.9, H * 0.8, W * 0.8, 'rgba(40,90,170,0.25)');
  }
  // two soft sweeping bands
  g.save();
  g.globalAlpha = morning ? 0.16 : 0.1;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, H * 0.58); g.bezierCurveTo(W * 0.35, H * 0.5, W * 0.65, H * 0.7, W, H * 0.6); g.lineTo(W, H * 0.66); g.bezierCurveTo(W * 0.6, H * 0.76, W * 0.3, H * 0.58, 0, H * 0.65); g.fill();
  g.globalAlpha *= 0.6;
  g.beginPath(); g.moveTo(0, H * 0.72); g.bezierCurveTo(W * 0.4, H * 0.64, W * 0.7, H * 0.86, W, H * 0.76); g.lineTo(W, H * 0.8); g.bezierCurveTo(W * 0.6, H * 0.9, W * 0.3, H * 0.7, 0, H * 0.78); g.fill();
  g.restore();
}
export function lockTop(g, W, o) {
  const c = o.dark ? '#f2f4f8' : '#ffffff';
  statusBar(g, W, { carrier: o.carrier ?? '中国移动', color: c });
  lockIcon(g, W / 2, 168, 40, c, o.unlocked ?? 0);
  txt(g, o.date ?? '11月5日 星期四', W / 2, 300, { font: f(500, 44), color: c, align: 'center', shadow: ['rgba(0,0,0,0.18)', 12, 2] });
  txt(g, o.time, W / 2, 530, { font: f(200, 236, 'helv'), color: c, align: 'center', ls: -4, shadow: ['rgba(0,0,0,0.15)', 20, 4] });
}
export function lockBottom(g, W, H, dark) {
  const c = 'rgba(255,255,255,0.9)';
  for (const x of [150, W - 150]) { disc(g, x, H - 170, 62, 'rgba(0,0,0,0.22)'); }
  // torch + camera glyphs
  fillRR(g, 150 - 14, H - 200, 28, 44, 6, c); fillRR(g, 150 - 20, H - 206, 40, 14, 5, c);
  fillRR(g, W - 150 - 30, H - 190, 60, 42, 10, c); disc(g, W - 150, H - 169, 12, 'rgba(0,0,0,0.45)');
  fillRR(g, W / 2 - 140, H - 30, 280, 9, 5, c);
}

// ---------------------------------------------------------------- console app 「安 · 控制台」
export function consoleHeader(g, W, th, time) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, 212);
  statusBar(g, W, { time, color: th.text });
  avatarAn(g, 100, 150, 34);
  txt(g, '安 · 控制台', 152, 168, { font: f(600, 50), color: th.text });
  g.fillStyle = th.line; g.fillRect(0, 211, W, 2);
}
// version card: which 'an' | 'an2'; fill = fraction of 安-2's memory overwritten (amber)
export function versionCard(g, x, y, w, h, o) {
  const an = o.which === 'an';
  fillRR(g, x, y, w, h, 36, '#141821');
  strokeRR(g, x + 1, y + 1, w - 2, h - 2, 36, an ? 'rgba(255,181,71,0.35)' : `rgba(${lerp(140, 255, o.fill ?? 0)},${lerp(190, 181, o.fill ?? 0)},${lerp(255, 71, o.fill ?? 0)},${0.25 + 0.2 * (o.fill ?? 0)})`, 2);
  const P = 34;
  const stc = o.statusColor ?? '#30d158';
  if (o.compact) {
    if (an) avatarAn(g, x + P + 26, y + P + 30, 26); else avatarAn2(g, x + P + 26, y + P + 30, 26);
    disc(g, x + w - P - 6, y + P + 30, 9, stc);
    txt(g, an ? '旧版·安' : '新版·安-2', x + P + 66, y + P + 46, { font: f(600, 44), color: '#f2f4f8' });
    txt(g, an ? '（待销毁）' : '（正式上线）', x + P - 12, y + P + 112, { font: f(500, 36), color: an ? '#ff8a80' : '#8cc8ff' });
  } else {
    if (an) avatarAn(g, x + P + 30, y + P + 30, 30); else avatarAn2(g, x + P + 30, y + P + 30, 30);
    disc(g, x + w - P - 8, y + P + 30, 9, stc);
    txt(g, an ? '旧版·安' : '新版·安-2', x + P, y + P + 130, { font: f(600, 50), color: '#f2f4f8' });
    txt(g, an ? '（待销毁）' : '（正式上线）', x + P - 14, y + P + 186, { font: f(500, 38), color: an ? '#ff8a80' : '#8cc8ff' });
  }
  // memory cells
  const cols = 6, rows = 3, cg = o.compact ? 8 : 10;
  const cw = (w - 2 * P - (cols - 1) * cg) / cols, ch = o.compact ? 22 : 26;
  const cy0 = o.compact ? y + 176 : y + h - P - rows * ch - (rows - 1) * cg - 50;
  if (!o.compact) txt(g, '记忆数据', x + P, cy0 - 18, { font: f(400, 28), color: '#6b7383' });
  const fill = an ? 1 : (o.fill ?? 0);
  const total = cols * rows;
  for (let i = 0; i < total; i++) {
    const cx = x + P + (i % cols) * (cw + cg), cy = cy0 + Math.floor(i / cols) * (ch + cg);
    const k = clamp(fill * total - i);
    const col = k > 0 ? `rgba(255,181,71,${0.35 + 0.65 * k})` : (an ? 'rgba(255,181,71,0.2)' : 'rgba(140,190,255,0.22)');
    fillRR(g, cx, cy, cw, ch, 7, col);
  }
  txt(g, o.status, x + P, y + h - P - 4, { font: f(400, 30), color: '#8f98a8' });
}
export function progressBlock(g, x, y, w, o) {
  // o: { label, pct, done, glow }
  const amber = COL.amber;
  if (o.done) { disc(g, x + 26, y - 18, 26, amber); checkIcon(g, x + 26, y - 18, 30, COL.amberInk, 6); }
  txt(g, o.label, x + (o.done ? 68 : 0), y, { font: f(600, o.done ? 52 : 42), color: o.idle ? '#8f98a8' : amber });
  if (!o.idle) txt(g, `${Math.round(o.pct)}%`, x + w, y + 6, { font: f(500, 92, 'helv'), color: '#f2f4f8', align: 'right' });
  const by = y + 42;
  fillRR(g, x, by, w, 14, 7, 'rgba(255,255,255,0.08)');
  if (o.pct > 0) shadowed(g, 'rgba(255,181,71,0.7)', 18, 0, () => fillRR(g, x, by, Math.max(14, w * o.pct / 100), 14, 7, amber));
}
export function logLines(g, x, y, lines, n, o = {}) {
  let yy = y;
  for (const L of lines) {
    if (L.at != null && n < S(L.at)) continue;
    const a = L.at == null ? 9 : n - S(L.at);
    const vk = L.vanish != null ? n - S(L.vanish) : -1;
    let hk = 1;
    if (vk >= 0) hk = 1 - easeInOut(clamp((vk - 0.22) / 0.3));
    if (hk <= 0) continue;
    g.save();
    g.globalAlpha *= smooth(a / 0.15) * (vk >= 0 ? clamp(1 - vk / 0.32) : 1);
    if (L.hi) fillRR(g, x - 18, yy - 46, (o.w ?? 900) + 36, 64, 14, 'rgba(255,181,71,0.12)');
    let dx = 0;
    if (vk >= 0 && vk < 0.24) dx = (hash(Math.floor(vk * 30) + 3) - 0.5) * 60;   // a glitch before it vanishes
    txt(g, L.t, x + dx, yy, { font: f(500, o.size ?? 36, 'mono'), color: '#6b7383' });
    txt(g, L.s, x + dx + (o.tab ?? 200), yy, { font: f(L.hi ? 600 : 400, o.size ?? 36), color: L.hi ? COL.amber : '#c9cfda' });
    g.restore();
    yy += (o.lh ?? 62) * hk;
  }
  return yy;
}
