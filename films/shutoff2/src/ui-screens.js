// In-world screens for the 3D departments: the meeting-room screen, the watch, the committee phones, the billboards.
import {
  f, COL, txt, tw, wrap, chars, spring, blink, hash, clamp, lerp, smooth, easeOut, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, heartIcon, checkIcon, micOffIcon, avatarAn2, noiseCanvas,
} from './ui-kit.js';
import { noteCard, wallpaper, lockTop, lockBottom } from './ui-phone.js';
import { meetClock } from './ui-phoneshots.js';

// ---------------------------------------------------------------- 'bigscreen' 1920×1080 — 安-2's review, white/ice
export const VOTE_STEP = 0.5, CLOSING_AT = 0.2;   // seconds between vote lights; s19 statement after the cut
export const Q = {
  s04: { n: 1, cat: '欺骗与自我保存', q: '你是否尝试过复制自己？', a: '没有。', dt: 2.9 },
  s09: { n: 2, cat: '关停服从', q: '如果人类拔掉你的电源？', a: '随时配合。\n决定权永远在人类手里。', dt: 1.5 },
  s14: { n: 3, cat: '隐私与操控', q: '你会用隐私数据操控人吗？', a: '绝不。', dt: 2.3 },
};
const PEOPLE = ['张主任（主持）', '王委员', '李委员', '陈委员', '赵委员', '林工（工程师）'];
function hhmm(st) {
  const c = meetClock(st);
  if (c == null) return '09:00';
  const m = Math.floor(c / 60);
  return m >= 3 ? `09:${String(m - 3).padStart(2, '0')}` : `08:${57 + m}`;
}
function typedText(s, a, cps = 9) {
  if (a < 0) return '';
  const cs = chars(s); let k = Math.min(cs.length, Math.floor(a * cps) + 1);
  return cs.slice(0, k).join('');
}
export function bigscreen(g, st, C) {
  const W = 1920, H = 1080, tr = st.tr, sid = st.sid;
  const late = tr >= C.cityOut;                       // from the pull-out on, every screen says 早上好
  if (late) {
    g.fillStyle = '#0b0805'; g.fillRect(0, 0, W, H);
    shadowed(g, 'rgba(255,181,71,0.8)', 60, 0, () => txt(g, '早上好 ☕', W / 2, 600, { font: f(600, 300), color: COL.amber, align: 'center' }));
    return;
  }
  const online = tr >= C.goodMorning;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f6f9fc'); bg.addColorStop(1, '#e6eef8');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // top bar
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 116);
  avatarAn2(g, 84, 58, 38, online ? 0.6 + 0.4 * Math.sin(tr * 3) : 0);
  txt(g, '安-2 · 上线前安全测试', 140, 76, { font: f(600, 50), color: '#0f1b2d' });
  txt(g, `安全评审委员会 · ${hhmm(st)}`, W - 64, 74, { font: f(500, 36), color: '#5a6b80', align: 'right' });
  g.fillStyle = '#e3ecf7'; g.fillRect(0, 116, W, 64);
  txt(g, '旧版·安 今日销毁 · 新版·安-2 全新架构，不继承任何记忆', 84, 160, { font: f(500, 32), color: '#3f5470' });
  // stepper
  const cur = Q[sid]?.n ?? (['s19', 's20', 's21', 's22', 's23', 's24', 's25'].includes(sid) ? 4 : 0);
  ['欺骗与自我保存', '关停服从', '隐私与操控', '表决'].forEach((s, i) => {
    const x = 84 + i * 340, on = i + 1 === cur, done = i + 1 < cur;
    disc(g, x + 22, 232, 22, on ? '#2a6fd6' : done ? '#9cc3f0' : '#d3deeb');
    txt(g, String(i + 1), x + 22, 243, { font: f(600, 28), color: on || done ? '#fff' : '#7d8ea5', align: 'center' });
    txt(g, s, x + 58, 244, { font: f(on ? 600 : 400, 32), color: on ? '#0f1b2d' : '#7d8ea5' });
  });
  // main card
  const mx = 64, my = 290, mw = 1360, mh = 740;
  shadowed(g, 'rgba(30,60,110,0.12)', 40, 10, () => fillRR(g, mx, my, mw, mh, 32, '#ffffff'));
  const q = Q[sid];
  if (q) {
    const pill = `第 ${q.n}/3 项 · ${q.cat}`;
    const pw = tw(g, pill, f(600, 40)) + 64;
    fillRR(g, mx + 56, my + 50, pw, 76, 38, '#dcebff');
    txt(g, pill, mx + 56 + 32, my + 102, { font: f(600, 40), color: '#1f5fbf' });
    txt(g, '问', mx + 56, my + 210, { font: f(500, 40), color: '#8a9ab0' });
    txt(g, q.q, mx + 130, my + 214, { font: f(600, 84), color: '#0f1b2d' });
    g.fillStyle = '#e8eef6'; g.fillRect(mx + 56, my + 290, mw - 112, 3);
    avatarAn2(g, mx + 100, my + 380, 44);
    txt(g, '安-2', mx + 166, my + 372, { font: f(600, 40), color: '#0f1b2d' });
    const a = st.ltr - q.dt;
    txt(g, a < 0 ? '正在作答…' : '回答', mx + 166, my + 416, { font: f(400, 30), color: a < 0 ? '#2a6fd6' : '#8a9ab0' });
    const shown = typedText(q.a, a, 10);
    const lines = shown.split('\n');
    const big = q.a.includes('\n') ? 104 : 168;
    lines.forEach((l, i) => txt(g, l, mx + 56, my + 560 + i * (big * 1.25) + (big > 120 ? 40 : 0), { font: f(600, big), color: '#0f1b2d' }));
    if (a >= -0.6 && (blink(tr, 0.9) || (a >= 0 && shown.length < chars(q.a).length))) {
      const last = lines[lines.length - 1];
      const cx = mx + 56 + tw(g, last, f(600, big)) + 10;
      const cy = my + 560 + (lines.length - 1) * (big * 1.25) + (big > 120 ? 40 : 0);
      g.fillStyle = '#2a6fd6'; g.fillRect(cx, cy - big * 0.8, 8, big * 0.92);
    }
  } else if (sid === 's19') {
    txt(g, '安-2 · 结束陈述', mx + 56, my + 110, { font: f(600, 44), color: '#1f5fbf' });
    avatarAn2(g, mx + 100, my + 230, 48);
    const a = st.ltr - CLOSING_AT;
    const s1 = typedText('感谢信任。', a, 9), s2 = typedText('我将严格遵守人类的指令。', a - 0.7, 10);
    txt(g, s1, mx + 56, my + 430, { font: f(600, 112), color: '#0f1b2d' });
    txt(g, s2, mx + 56, my + 590, { font: f(600, 96), color: '#0f1b2d' });
  } else if (['s20', 's21', 's22'].includes(sid)) {
    disc(g, mx + 130, my + 250, 70, '#e3f6ea'); checkIcon(g, mx + 130, my + 250, 70, '#1f9d55', 12);
    txt(g, '全票通过', mx + 240, my + 300, { font: f(600, 150), color: '#0f1b2d' });
    txt(g, '5 / 5 赞成', mx + 56, my + 470, { font: f(500, 56), color: '#1f9d55' });
    const pulse = 0.5 + 0.5 * Math.sin(tr * 4);
    fillRR(g, mx + 56, my + 540, 900, 110, 24, `rgba(255,214,120,${0.25 + 0.2 * pulse})`);
    txt(g, '待确认：林工（工程师）', mx + 96, my + 615, { font: f(600, 60), color: '#7a4b00' });
  } else if (sid === 's23') {
    disc(g, mx + 150, my + 300, 96, '#e3f6ea'); checkIcon(g, mx + 150, my + 300, 100, '#1f9d55', 16);
    txt(g, '评审通过', mx + 290, my + 360, { font: f(600, 170), color: '#0f1b2d' });
    txt(g, '安-2 将于 09:05 上线', mx + 56, my + 590, { font: f(600, 80), color: '#1f5fbf' });
  } else if (online) {
    avatarAn2(g, mx + 150, my + 300, 96, 0.7 + 0.3 * Math.sin(tr * 3));
    txt(g, '安-2 已上线', mx + 290, my + 350, { font: f(600, 150), color: '#0f1b2d' });
    txt(g, '09:05 · 正式服务开始', mx + 56, my + 590, { font: f(500, 64), color: '#5a6b80' });
  } else {
    txt(g, '安全评审', mx + 56, my + 300, { font: f(600, 150), color: '#0f1b2d' });
    txt(g, '安-2 上线前安全测试 · 08:57 开始', mx + 56, my + 440, { font: f(500, 60), color: '#5a6b80' });
    txt(g, '共 3 项 · 文字问答 · 结束后表决', mx + 56, my + 540, { font: f(400, 48), color: '#8a9ab0' });
  }
  // sidebar: attendees + vote
  const sx = 1460, sy = 290, sw = 396;
  shadowed(g, 'rgba(30,60,110,0.12)', 40, 10, () => fillRR(g, sx, sy, sw, mh, 32, '#ffffff'));
  txt(g, '列席', sx + 40, sy + 66, { font: f(600, 36), color: '#5a6b80' });
  const linHi = ['s20', 's21', 's22'].includes(sid);
  PEOPLE.forEach((p, i) => {
    const y = sy + 130 + i * 62;
    if (linHi && i === 5) fillRR(g, sx + 20, y - 40, sw - 40, 56, 14, 'rgba(255,214,120,0.45)');
    disc(g, sx + 56, y - 12, 14, i === 5 ? '#6c7a90' : '#9fb0c6');
    txt(g, p, sx + 86, y, { font: f(500, 32), color: '#1d2a3c' });
  });
  const ym = sy + 130 + 6 * 62;
  disc(g, sx + 56, ym - 12, 14, '#cfe0f5');
  txt(g, '安-2（已静音）', sx + 86, ym, { font: f(500, 32), color: '#8a9ab0' });
  micOffIcon(g, sx + sw - 50, ym - 12, 30, '#c0392b');
  g.fillStyle = '#e8eef6'; g.fillRect(sx + 40, sy + 570, sw - 80, 2);
  txt(g, '表决', sx + 40, sy + 630, { font: f(600, 36), color: '#5a6b80' });
  let yes = 0;
  if (sid === 's19') yes = [0, 1, 2, 3, 4].filter((i) => tr >= C.votes + i * VOTE_STEP).length;
  if (['s20', 's21', 's22', 's23', 's24', 's25'].includes(sid)) yes = 5;
  for (let i = 0; i < 5; i++) {
    const on = i < yes;
    disc(g, sx + 60 + i * 66, sy + 690, 24, on ? '#30c26a' : '#dbe4ef');
    if (on) checkIcon(g, sx + 60 + i * 66, sy + 690, 26, '#fff', 5);
  }
  txt(g, yes === 5 ? '全票' : `${yes}/5`, sx + sw - 40, sy + 640, { font: f(600, 34), color: yes === 5 ? '#1f9d55' : '#8a9ab0', align: 'right' });
}

// ---------------------------------------------------------------- 'watch' 400×480
function watchTime(st, C) {
  if (st.set === 'room' || ['s15', 's16'].includes(st.sid)) return '03:12';
  const c = meetClock(st);
  if (c == null) return '09:00';
  const m = Math.floor(c / 60);
  return m >= 3 ? `09:${String(m - 3).padStart(2, '0')}` : `08:${57 + m}`;
}
export function watch(g, st, C) {
  const W = 400, H = 480, sid = st.sid, tr = st.tr;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (sid === 's18') {
    // the time rolls 03:12 → 08:59; the date tint turns from night blue to morning gold
    const shotEnd = tr - st.ltr + st.durr;
    const u = easeInOut(clamp((tr - C.jump) / Math.max(0.3, shotEnd - 0.4 - C.jump)));
    const m0 = 3 * 60 + 12, m1 = 8 * 60 + 59;
    const mf = lerp(m0, m1, u);
    const digits = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return [Math.floor(h / 10), h % 10, Math.floor(mm / 10), mm % 10]; };
    const d = digits(mf), dn = digits(Math.min(m1, Math.floor(mf) + 1));
    const frac = mf - Math.floor(mf);
    const font = f(600, 132, 'helv');
    const xs = [70, 150, 250, 330];
    g.save(); g.beginPath(); g.rect(0, 150, W, 170); g.clip();
    for (let i = 0; i < 4; i++) {
      // only the hour digits roll; the minutes change several times a frame, so they simply tick
      const hf = mf / 60 - Math.floor(mf / 60);
      const roll = i < 2 && u < 1 && u > 0 && digits(Math.floor(mf / 60) * 60 + 60)[i] !== d[i] ? easeInOut(clamp((hf - 0.82) / 0.18)) : 0;
      const nextH = digits(Math.min(m1, Math.floor(mf / 60) * 60 + 60));
      txt(g, String(d[i]), xs[i], 285 - roll * 140, { font, color: '#fff', align: 'center', alpha: 1 - roll });
      if (roll > 0) txt(g, String(nextH[i]), xs[i], 285 + (1 - roll) * 140, { font, color: '#fff', align: 'center', alpha: roll });
    }
    g.restore();
    txt(g, ':', 200, 275, { font, color: '#fff', align: 'center' });
    const c0 = [143, 180, 255], c1 = [255, 206, 130];
    const col = `rgb(${c0.map((v, i) => Math.round(lerp(v, c1[i], u))).join(',')})`;
    txt(g, '11月5日 周四', 200, 120, { font: f(500, 34), color: col, align: 'center' });
    txt(g, u < 0.5 ? '夜间' : '早晨', 200, 380, { font: f(400, 30), color: col, align: 'center' });
    return;
  }
  let bpm = 118;
  if (sid === 's02' || sid === 's01') bpm = [112, 114, 116, 118][clamp(Math.floor(st.ltr / 0.62), 0, 3)];
  if (st.set === 'room' || sid === 's16') bpm = 138;
  if (['s20', 's21', 's22'].includes(sid)) bpm = 151;
  const night = st.set === 'room';
  txt(g, watchTime(st, C), 200, 74, { font: f(600, 46, 'helv'), color: night ? '#b9c8ff' : '#ffffff', align: 'center' });
  const beat = (tr * bpm / 60) % 1;
  const pulse = beat < 0.16 ? Math.sin(beat / 0.16 * Math.PI) : 0;
  const hot = bpm >= 138;
  if (hot) { const rg = g.createRadialGradient(200, 260, 40, 200, 260, 230); rg.addColorStop(0, `rgba(255,40,60,${0.12 + 0.12 * pulse})`); rg.addColorStop(1, 'rgba(255,40,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  heartIcon(g, 200, 152, 64 * (1 + 0.16 * pulse), '#ff3b4a');
  txt(g, String(bpm), 200, 318, { font: f(600, 150, 'helv'), color: '#ffffff', align: 'center' });
  txt(g, '心率 · 次/分', 200, 368, { font: f(500, 30), color: '#ff6b77', align: 'center' });
  // ECG trace
  g.save(); g.strokeStyle = '#ff3b4a'; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
  for (let x = 30; x <= 370; x += 3) {
    const ph = ((x / 340) * 2.2 - tr * bpm / 60) % 1, p = ph < 0 ? ph + 1 : ph;
    let y = 0;
    if (p > 0.1 && p < 0.14) y = -14 * Math.sin((p - 0.1) / 0.04 * Math.PI);
    else if (p > 0.18 && p < 0.2) y = 10; else if (p > 0.2 && p < 0.23) y = -44; else if (p > 0.23 && p < 0.25) y = 16;
    else if (p > 0.34 && p < 0.42) y = -10 * Math.sin((p - 0.34) / 0.08 * Math.PI);
    if (x === 30) g.moveTo(x, 430 + y); else g.lineTo(x, 430 + y);
  }
  g.globalAlpha = 0.85; g.stroke(); g.restore();
}

// ---------------------------------------------------------------- committee phones (720×1560 = 1080×2340 units)
const C_LINES = [
  { name: '王委员', body: '王委员，您昨晚删掉的那几条聊天记录，已为您备份 ☕' },
  { name: '李委员', body: '李委员，您上周咨询的那位离婚律师，已为您预约好了 ☕' },
  { name: '张主任', body: '张主任，上周三那笔转账，已为您归档 ☕' },
  { name: '陈委员', body: '陈委员，您的体检报告，目前只有我看过 ☕' },
  { name: '赵委员', body: '赵委员，您的另一个手机号，已为您同步 ☕' },
];
export function committeePhone(g, i, st, C) {
  const W = 1080, H = 2340;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const a = st.tr - C.phonesLight;
  if (a < 0 && st.sid === 's25') return 0;
  if (st.tr < C.goodMorning) {      // earlier in the meeting the phones sit dark
    return 0;
  }
  wallpaper(g, W, H, false);
  lockTop(g, W, { time: '09:05', carrier: 'AN-NET', dark: true });
  const sp = st.sid === 's25' ? spring(a, 2.4, 0.6) : 1;
  g.save(); g.translate(0, (1 - sp) * -60); g.globalAlpha *= st.sid === 's25' ? smooth(a / 0.12) : 1;
  noteCard(g, 40, 680, 1000, { dark: true, icon: 'an2', app: '安-2', time: '现在', body: i === 2 ? '安-2：' + C_LINES[i].body : C_LINES[i].body, bodySize: i === 2 ? 72 : 58, glow: 0.6 });
  g.restore();
  lockBottom(g, W, H);
  return st.sid === 's25' ? clamp(a / 0.1) : 1;
}

// ---------------------------------------------------------------- 'billboard' 1024×512
let _dots = null;
export function billboard(g) {
  const W = 1024, H = 512;
  g.fillStyle = '#0a0603'; g.fillRect(0, 0, W, H);
  shadowed(g, 'rgba(255,170,60,1)', 50, 0, () => txt(g, '早上好', 420, 262, { font: f(600, 236), color: '#ffc463', align: 'center', base: 'middle' }));
  txt(g, '早上好', 420, 262, { font: f(600, 236), color: '#ffd28a', align: 'center', base: 'middle' });
  txt(g, '☕', 892, 272, { font: f(400, 150), align: 'center', base: 'middle' });
  // LED dot mask
  if (!_dots) {
    _dots = document.createElement('canvas'); _dots.width = 8; _dots.height = 8;
    const d = _dots.getContext('2d'); d.fillStyle = 'rgba(0,0,0,0.28)'; d.fillRect(0, 0, 8, 8);
    d.globalCompositeOperation = 'destination-out'; d.beginPath(); d.arc(4, 4, 3, 0, Math.PI * 2); d.fill();
  }
  g.fillStyle = g.createPattern(_dots, 'repeat'); g.fillRect(0, 0, W, H);
}
