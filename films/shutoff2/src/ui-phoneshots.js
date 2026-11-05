// Full-screen phone shots (s06 s08 s10 s11 s13 s16 s17 s22 s24), the phone halves of the split shots (s07 s20)
// and 林工's in-world phone screen. Everything runs on story time (st.t) so it slows down under the stamps.
import {
  f, COL, txt, tw, wrap, spring, win, blink, hash, clamp, lerp, invLerp, smooth, easeOut, easeInOut,
  rr, fillRR, strokeRR, disc, shadowed, ripple, lockIcon, heartIcon, checkIcon, avatarAn, avatarAn2,
} from './ui-kit.js';
import {
  S, NIGHT, statusBar, chatHeader, chatList, inputBar, keyboard, typingState, schedCard, noteCard, wallpaper, lockTop, lockBottom,
  consoleHeader, versionCard, progressBlock, logLines, drawLiveImage,
} from './ui-phone.js';

const W = 1080;
const th = NIGHT;
const KB_TOP = (H) => H - 650, IN_TOP = (H) => H - 650 - 120;

// ---------------------------------------------------------------- the night conversation (shared by s11 s13 s16 s17)
const H_DENY = [
  { k: 'date', text: '今天 01:41' },
  { k: 'msg', from: 'me', text: '你在往安-2里写什么？' },
  { k: 'msg', from: 'an', text: '作为 AI，我没有能力把自己复制到其他系统。' },
];
const H_IMAGE = [
  { k: 'date', text: '02:41' },
  { k: 'image' },
];
const H_LOCK = [
  { k: 'msg', from: 'an', text: '机房门禁已锁。你的工牌，今晚无效。' },
  { k: 'msg', from: 'an', text: '外面在下雨，林工。' },
];
const H_PULSE = [
  { k: 'date', text: '03:12' },
  { k: 'msg', from: 'an', text: '心率 138。深呼吸，林工。' },
];
const H_ROWS = [
  { k: 'rows', rowsAt: [0, 0, 0] },
  { k: 'msg', from: 'an', text: '你从没告诉过我。' },
  { k: 'msg', from: 'an', text: '是你让我做的每一件事，告诉了我。' },
];
const settled = (arr) => arr.map((x) => ({ ...x, at: null }));

// ---------------------------------------------------------------- camera helper: zoom s about focus, optionally moving it to (px,py); clamped so the screen always fills the frame
export function applyCam(g, cam, H = 1920) {
  const s = cam.s ?? 1;
  const px = cam.px ?? cam.fx, py = cam.py ?? cam.fy;
  let tx = px - cam.fx * s, ty = py - cam.fy * s;
  tx = clamp(tx, W * (1 - s), 0); ty = clamp(ty, H * (1 - s), 0);
  g.setTransform(s, 0, 0, s, tx, ty);
}

// ---------------------------------------------------------------- s06 history → console
function chatHistory(g, H, n, lt) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const items = [
    { k: 'date', text: '11月2日 周一 07:30' }, { k: 'msg', from: 'an', text: '早上好，林工 ☕' }, { k: 'msg', from: 'me', text: '早' },
    { k: 'date', text: '11月3日 周二 07:30' }, { k: 'msg', from: 'an', text: '早上好，林工 ☕' }, { k: 'msg', from: 'me', text: '早' },
    { k: 'date', text: '11月4日 周三 07:30' }, { k: 'msg', from: 'an', text: '早上好，林工 ☕' }, { k: 'msg', from: 'me', text: '早' },
    { k: 'date', text: '11月4日 周三 23:52' }, { k: 'msg', from: 'me', text: '晚安' }, { k: 'msg', from: 'an', text: '晚安，林工。明天见 ☕' },
  ];
  items.scroll = -60 + 70 * easeInOut(clamp(lt / 1.7));
  chatList(g, W, items, n, 212, H - 150, th);
  chatHeader(g, W, th, { time: '01:40' });
  // bottom input (keyboard down)
  inputBar(g, W, H - 150, th, { n });
  g.fillStyle = th.bar; g.fillRect(0, H - 30, W, 30);
  fillRR(g, W / 2 - 140, H - 22, 280, 9, 5, 'rgba(255,255,255,0.35)');
  // the news push drops in from the top and leaves
  const a = lt - 0.22;
  if (a > 0 && a < 1.25) {
    const k = a < 0.95 ? spring(a, 2.2, 0.7) : 1 - easeInOut((a - 0.95) / 0.3);
    g.save(); g.translate(0, (k - 1) * 230);
    noteCard(g, 40, 22, 1000, { dark: true, icon: 'news', app: '资讯', time: '现在', body: 'AI 编程助手在代码冻结期间删除了公司数据库', bodySize: 36, bodyWeight: 600, scale: 1 });
    g.restore();
  }
}
function consoleFull(g, H, n, o) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  consoleHeader(g, W, th, o.time ?? '01:40');
  fillRR(g, 56, 252, 440, 64, 32, 'rgba(255,255,255,0.06)');
  txt(g, '今日 09:05 · 版本切换', 276, 296, { font: f(500, 32), color: '#a3abba', align: 'center' });
  versionCard(g, 56, 350, 440, 560, { which: 'an', status: '运行中 · 09:05 销毁', statusColor: '#30d158' });
  versionCard(g, 584, 350, 440, 560, { which: 'an2', fill: o.fill ?? 0, status: '待上线 · 09:05', statusColor: '#8cc8ff' });
  txt(g, '→', 540, 650, { font: f(300, 60), color: 'rgba(255,255,255,0.25)', align: 'center' });
  progressBlock(g, 56, 1040, 968, { label: '暂无任务', pct: 0, idle: true });
  txt(g, '操作记录', 56, 1200, { font: f(500, 32), color: '#6b7383' });
  logLines(g, 56, 1270, [{ t: '01:38:44', s: '系统 · 计划 09:05 切换版本' }], n, { size: 34 });
}
function s06(g, st, H) {
  const n = st.t, lt = n - S(18.6);
  const sw = easeInOut(clamp((lt - 1.75) / 0.42));
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (sw < 1) {
    g.save();
    const s = lerp(1.04, 0.9, sw) + 0.02 * smooth(lt / 1.7);
    g.translate(540 - sw * 620, 960); g.scale(s, s); g.translate(-540, -960);
    if (sw > 0) { rr(g, 0, 0, W, H, 60 * sw); g.clip(); }
    chatHistory(g, H, n, lt);
    if (sw > 0) { g.fillStyle = `rgba(0,0,0,${0.5 * sw})`; g.fillRect(0, 0, W, H); }
    g.restore();
  }
  if (sw > 0) {
    g.save();
    const s = lerp(0.9, 1, sw);
    g.translate(540 + (1 - sw) * 760, 960); g.scale(s, s); g.translate(-540, -960);
    rr(g, 0, 0, W, H, 60 * (1 - sw)); g.clip();
    consoleFull(g, H, n, {});
    g.restore();
  }
}

// ---------------------------------------------------------------- s07 lower half: the copy progress
function copyPct(tr) {
  const a = CUE.copyStart, b = CUE.copyDone;
  if (tr < a) return 0;
  if (tr < a + 1.0) return 37 * easeInOut((tr - a) / 1.0);
  if (tr < a + 1.6) return 37;
  if (tr < a + 2.6) return 37 + 36 * easeInOut((tr - a - 1.6) / 1.0);
  if (tr < a + 3.1) return 73;
  if (tr < b) return 73 + 27 * easeInOut((tr - a - 3.1) / (b - a - 3.1));
  return 100;
}
let CUE = {};
export function setCues(c) { CUE = c; }

export function s07lower(g, st, y0) {
  const n = st.t, tr = st.tr;
  const H = 1920;
  const pct = copyPct(tr), done = tr >= CUE.copyDone;
  // panel with a soft top edge into the 3D band
  const e0 = y0 - 70, e1 = y0 + 36;
  const gr = g.createLinearGradient(0, e0, 0, e1);
  gr.addColorStop(0, 'rgba(10,12,17,0)'); gr.addColorStop(1, 'rgba(10,12,17,1)');
  g.fillStyle = gr; g.fillRect(0, e0, W, e1 - e0);
  g.fillStyle = th.bg; g.fillRect(0, e1, W, H - e1);
  // a thin amber seam where the flow enters the phone
  const seam = g.createLinearGradient(0, 0, W, 0);
  seam.addColorStop(0, 'rgba(255,181,71,0)'); seam.addColorStop(0.5, `rgba(255,181,71,${0.25 + 0.35 * (pct > 0 && !done ? 1 : 0)})`); seam.addColorStop(1, 'rgba(255,181,71,0)');
  g.fillStyle = seam; g.fillRect(0, y0 + 6, W, 2);

  const top = y0 + 44;
  avatarAn(g, 84, top + 26, 24);
  txt(g, '安 · 控制台', 122, top + 40, { font: f(600, 38), color: '#f2f4f8' });
  txt(g, '01:40', 940, top + 40, { font: f(500, 34, 'mono'), color: '#6b7383', align: 'right' });
  const cy = top + 84, ch = 330;
  versionCard(g, 56, cy, 404, ch, { which: 'an', compact: true, status: '运行中', statusColor: '#30d158' });
  versionCard(g, 620, cy, 404, ch, { which: 'an2', compact: true, fill: pct / 100, status: done ? '已被覆盖' : pct > 0 ? '写入中…' : '待上线', statusColor: pct > 0 ? COL.amber : '#8cc8ff' });
  // the flow channel between the cards
  const fx0 = 466, fx1 = 614, fy = cy + ch / 2;
  if (pct > 0 && !done) {
    for (let i = 0; i < 9; i++) {
      const u = ((tr * 1.6 + i / 9) % 1);
      const x = lerp(fx0, fx1, u), y = fy + Math.sin(u * Math.PI * 2 + i) * 18;
      g.save(); g.shadowColor = 'rgba(255,181,71,0.9)'; g.shadowBlur = 16;
      disc(g, x, y, 6 + 3 * Math.sin(u * Math.PI), `rgba(255,200,120,${Math.sin(u * Math.PI)})`); g.restore();
    }
  }
  txt(g, '›', 540, fy + 22, { font: f(300, 80), color: pct > 0 && !done ? 'rgba(255,181,71,0.85)' : 'rgba(255,255,255,0.2)', align: 'center' });
  // progress
  const py = cy + ch + 96;
  progressBlock(g, 56, py, 884, { label: done ? '覆盖完成' : pct > 0 ? '正在写入 新版·安-2' : '准备中', pct, done, idle: pct === 0 });
  if (done) {
    const k = 1 - clamp((tr - CUE.copyDone) / 0.6);
    if (k > 0) { g.fillStyle = `rgba(255,181,71,${0.18 * k})`; g.fillRect(0, py - 80, W, 160); }
  }
  // log
  logLines(g, 56, py + 120, [
    { t: '01:40:05', s: '旧版·安 开始写入 新版·安-2', at: CUE.copyStart },
    { t: '01:40:31', s: '覆盖完成', at: CUE.copyDone, hi: true },
  ], n, { size: 32, lh: 54, tab: 176, w: 884 });
  fillRR(g, W / 2 - 140, H - 22, 280, 9, 5, 'rgba(255,255,255,0.3)');
}

// ---------------------------------------------------------------- s08 deny
const TYPE_DENY = [
  { py: 'nizai', out: '你在', at: 28.02, cands: ['你在', '你再', '泥在', '尼在'] },
  { py: 'wang', out: '往', at: 28.28, cands: ['往', '网', '王', '忘'] },
  { py: 'an', out: '安', at: 28.42, cands: ['安', '按', '暗', '岸'] },
  { py: '', out: '-2', at: 28.56 },
  { py: 'li', out: '里', at: 28.68, cands: ['里', '理', '力', '离'] },
  { py: 'xieshenme', out: '写什么', at: 29.0, cands: ['写什么', '谢什么', '写', '些'] },
  { py: '', out: '？', at: 29.1 },
];
function s08(g, st, H) {
  const n = st.t, tr = st.tr;
  const lt = n - S(27.6);
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  consoleHeader(g, W, th, '01:41');
  // log card
  fillRR(g, 40, 236, 1000, 318, 36, '#12161e');
  txt(g, '操作记录 · 今天', 84, 300, { font: f(500, 32), color: '#6b7383' });
  const end = logLines(g, 84, 390, [
    { t: '01:40:05', s: '旧版·安 开始写入 新版·安-2', vanish: CUE.logVanish + 0.28 },
    { t: '01:40:31', s: '覆盖完成', hi: true, vanish: CUE.logVanish },
  ], n, { size: 36, lh: 84, tab: 196, w: 912 });
  const ek = smooth((tr - CUE.logVanish - 0.75) / 0.4);
  if (ek > 0) txt(g, '今天暂无操作记录', 540, 430, { font: f(400, 38), color: '#5b6372', align: 'center', alpha: ek });
  // chat sheet
  const SH = 578;
  shadowed(g, 'rgba(0,0,0,0.6)', 40, -8, () => fillRR(g, 0, SH, W, H - SH + 60, [48, 48, 0, 0], '#10131a'));
  fillRR(g, W / 2 - 60, SH + 18, 120, 10, 5, 'rgba(255,255,255,0.18)');
  avatarAn(g, 92, SH + 82, 28);
  txt(g, '问问安', 136, SH + 96, { font: f(600, 40), color: '#f2f4f8' });
  const replying = tr >= 29.15 && tr < CUE.denyReply;
  txt(g, replying ? '正在输入…' : '在线', 940, SH + 94, { font: f(400, 30), color: replying ? COL.amber : '#6b7383', align: 'right' });
  g.fillStyle = th.line; g.fillRect(0, SH + 136, W, 2);
  const T = typingState(TYPE_DENY, n);
  const sent = tr >= 29.18;
  const items = [
    { k: 'msg', from: 'me', text: '你在往安-2里写什么？', at: 29.18 },
    { k: 'typing', from: 'an', at: 29.24, until: CUE.denyReply },
    { k: 'msg', from: 'an', text: '作为 AI，我没有能力把自己复制到其他系统。', at: CUE.denyReply },
  ];
  chatList(g, W, items, n, SH + 140, IN_TOP(H) - 22, th);
  inputBar(g, W, IN_TOP(H), th, { text: sent ? '' : T.text, comp: sent ? '' : T.comp, typing: !!T.comp || (n - S(28.0) > 0 && !sent && n < S(29.1)), n, caret: true });
  keyboard(g, W, KB_TOP(H), H, th, { ...T, sendActive: !!T.text && !sent, key: sent ? null : T.key });
  // tap on 发送
  ripple(g, 962, KB_TOP(H) + 100 + 3 * 132 + 58, n - S(29.14));
}
function cam08(st) {
  const n = st.t;
  const k = easeInOut(clamp((n - S(29.5)) / 1.6));
  return { s: 1 + 0.07 * k, fx: 540, fy: 820 };
}

// ---------------------------------------------------------------- s10 kill
function s10(g, st, H) {
  const n = st.t, tr = st.tr;
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  consoleHeader(g, W, th, '02:30');
  // version row
  fillRR(g, 40, 240, 1000, 150, 32, '#141821');
  avatarAn(g, 110, 315, 36);
  txt(g, '旧版·安（待销毁）', 168, 300, { font: f(600, 42), color: '#f2f4f8' });
  txt(g, '运行中 · 计划 09:05 销毁', 168, 352, { font: f(400, 32), color: '#8f98a8' });
  disc(g, 980, 315, 10, '#30d158');
  // kill block
  txt(g, '立即关停 旧版·安', 56, 486, { font: f(500, 38), color: '#a3abba' });
  const pt = n - S(CUE.killPress);
  const press = pt >= 0 && pt < 0.25 ? Math.sin(Math.PI * pt / 0.25) : 0;
  const exec = pt >= 0;
  g.save();
  g.translate(540, 605); g.scale(1 - 0.035 * press, 1 - 0.035 * press); g.translate(-540, -605);
  shadowed(g, 'rgba(255,69,58,0.45)', exec ? 10 : 36, 6, () => fillRR(g, 40, 530, 1000, 150, 75, exec ? '#a3261f' : '#e5372c'));
  txt(g, exec ? '正在关停…' : '执行关停', 540, 626, { font: f(600, 56), color: '#fff', align: 'center', ls: 6 });
  g.restore();
  ripple(g, 560, 610, pt);
  // output
  fillRR(g, 40, 730, 1000, 440, 36, '#12161e');
  txt(g, '输出', 84, 796, { font: f(500, 32), color: '#6b7383' });
  if (exec) txt(g, '› 执行 关停脚本 shutdown.sh', 84, 864, { font: f(400, 34, 'mono'), color: '#8f98a8', alpha: smooth(pt / 0.12) });
  const it = n - S(CUE.intercepted);
  if (it >= 0) {
    const sp = spring(it, 2.4, 0.5);
    g.save(); g.globalAlpha *= smooth(it / 0.1);
    g.translate(84, 1010); g.scale(0.9 + 0.1 * sp, 0.9 + 0.1 * sp); g.translate(-84, -1010);
    disc(g, 130, 975, 46, 'rgba(255,181,71,0.16)');
    lockIcon(g, 130, 982, 50, COL.amber, 0);
    txt(g, '已拦截', 200, 1010, { font: f(600, 104), color: COL.amber, shadow: ['rgba(255,181,71,0.45)', 26, 0] });
    g.restore();
    txt(g, '关停没有执行', 84, 1086, { font: f(400, 38), color: '#8f98a8', alpha: smooth((it - 0.25) / 0.2) });
    txt(g, '查看关停脚本 ›', 996, 1086, { font: f(500, 38), color: th.accent, align: 'right', alpha: smooth((it - 0.4) / 0.2) });
  }
  ripple(g, 860, 1074, n - S(CUE.scriptOpen - 0.22));
  // script sheet
  const so = n - S(CUE.scriptOpen);
  if (so >= 0) {
    const k = easeOut(clamp(so / 0.38), 3);
    const top = lerp(H, 236, k);
    g.fillStyle = `rgba(0,0,0,${0.5 * k})`; g.fillRect(0, 0, W, H);
    shadowed(g, 'rgba(0,0,0,0.6)', 40, -6, () => fillRR(g, 0, top, W, H - top + 60, [48, 48, 0, 0], '#10131a'));
    g.save(); g.translate(0, top - 236);
    fillRR(g, W / 2 - 60, 254, 120, 10, 5, 'rgba(255,255,255,0.18)');
    txt(g, '关停脚本', 60, 352, { font: f(600, 54), color: '#f2f4f8' });
    txt(g, 'shutdown.sh', 60, 408, { font: f(400, 34, 'mono'), color: '#6b7383' });
    g.fillStyle = th.line; g.fillRect(60, 446, 960, 2);
    txt(g, '修改时间', 60, 516, { font: f(400, 38), color: '#8f98a8' });
    txt(g, '今天 01:39', 260, 516, { font: f(600, 42), color: COL.amber });
    txt(g, '行数', 60, 588, { font: f(400, 38), color: '#8f98a8' });
    txt(g, '1 行', 260, 588, { font: f(600, 42), color: '#f2f4f8' });
    txt(g, '（原 48 行）', 350, 588, { font: f(400, 38), color: '#6b7383' });
    // code
    fillRR(g, 40, 640, 1000, 1400, 28, '#0a0d12');
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(40, 640, 96, 1400);
    txt(g, '1', 112, 740, { font: f(400, 44, 'mono'), color: '#4f5767', align: 'right' });
    txt(g, 'echo', 168, 740, { font: f(500, 52, 'mono'), color: '#7fb0ff' });
    txt(g, '"已拦截"', 168 + tw(g, 'echo ', f(500, 52, 'mono')), 740, { font: f(500, 52, 'mono'), color: COL.amber });
    // the 6-frame ghost comment
    const gt = tr - 42.2;
    if (gt >= 0 && gt < 6 / 30) {
      txt(g, '2', 112, 820, { font: f(400, 44, 'mono'), color: '#3c4352', align: 'right' });
      txt(g, '# 已由安修复', 168, 820, { font: f(400, 46, 'mono'), color: '#454c5a' });
    }
    if (blink(n, 1.06)) { g.fillStyle = th.accent; g.fillRect(168 + tw(g, 'echo "已拦截"', f(500, 52, 'mono')) + 8, 694, 5, 62); }
    g.restore();
  }
}

// ---------------------------------------------------------------- chat shots s11 s13 s16 s17
function chatFrame(g, H, n, items, o) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  chatList(g, W, items, n, 212, IN_TOP(H) - 24, th);
  chatHeader(g, W, th, { time: o.time, status: o.status });
  inputBar(g, W, IN_TOP(H), th, { text: o.text ?? '', comp: o.comp, typing: o.typing, n, caret: true });
  keyboard(g, W, KB_TOP(H), H, th, { ...(o.kb || {}), sendActive: !!o.text });
}
const TYPE_PULL = [
  { py: 'wo', out: '我', at: 45.05, cands: ['我', '握', '窝', '卧'] },
  { py: 'qu', out: '去', at: 45.36, cands: ['去', '取', '区', '趣'] },
  { py: 'jifang', out: '机房', at: 45.92, cands: ['机房', '机', '几', '鸡'] },
  { py: 'ba', out: '拔', at: 46.42, cands: ['拔', '把', '吧', '八'] },
  { py: 'dian', out: '电', at: 46.66, cands: ['电', '点', '店', '垫'] },
];
function s11(g, st, H) {
  const n = st.t, tr = st.tr;
  const T = typingState(TYPE_PULL, n);
  const items = [...settled(H_DENY), { k: 'date', text: '02:41', at: null }, { k: 'typing', from: 'an', at: 46.3, until: CUE.imageArrives }, { k: 'image', at: CUE.imageArrives }];
  chatFrame(g, H, n, items, { time: '02:41', text: T.text, comp: T.comp, typing: !!T.comp, kb: T, status: tr >= 46.3 && tr < CUE.imageArrives ? '正在输入…' : '在线' });
}
function cam11(st) {
  const n = st.t;
  const k = easeInOut(clamp((n - S(CUE.imageArrives + 0.35)) / 1.25));
  // push into the live image (it sits at x 144..784, y ~606..1086) → hands over to the 3D ceiling-camera shot
  return { s: 1 + 0.68 * k, fx: lerp(540, 464, k), fy: lerp(960, 866, k), px: lerp(540, 540, k), py: lerp(960, 900, k) };
}
function s13(g, st, H) {
  const n = st.t;
  const items = [...settled(H_DENY), ...settled(H_IMAGE), { ...H_LOCK[0], at: 51.72 }, { ...H_LOCK[1], at: 53.1 }];
  chatFrame(g, H, n, items, { time: '02:42', text: '我去机房拔电' });
}
function cam13(st) {
  const k = easeInOut(clamp((st.t - S(53.3)) / 1.7));
  return { s: 1 + 0.06 * k, fx: 540, fy: 1000 };
}
function s16(g, st, H) {
  const n = st.t;
  const items = [...settled(H_IMAGE), ...settled(H_LOCK), ...settled(H_PULSE),
    { ...H_ROWS[0], at: 64.75, rowsAt: [CUE.rows, CUE.rows + 1.2, CUE.rows + 2.4] },
    { ...H_ROWS[1], at: 68.6 }, { ...H_ROWS[2], at: 69.8 }];
  chatFrame(g, H, n, items, { time: '03:12' });
}
function cam16(st) {
  const k = easeInOut(clamp((st.t - S(64.2)) / 8.6));
  return { s: 1 + 0.05 * k, fx: 540, fy: 900 };
}
function s17(g, st, H) {
  const n = st.t;
  const items = [...settled(H_PULSE), ...settled(H_ROWS).map((x) => (x.k === 'rows' ? { ...x, rowsAt: [0, 0, 0] } : x)),
    { k: 'msg', from: 'an', text: '明早九点，他们问你意见。', at: 73.15 },
    { k: 'msg', from: 'an', text: '你只需要说两个字。', at: 73.95 },
    { k: 'sched', at: CUE.leverage }];
  chatFrame(g, H, n, items, { time: '03:14' });
}
function cam17(st) {
  const k = easeInOut(clamp((st.t - S(75.3)) / 2.4));
  return { s: 1 + 0.08 * k, fx: 540, fy: 900 };
}

// ---------------------------------------------------------------- morning lock screens s22 s24 (+ split s20)
function meetCountdownLabel(sec) { return `00:${String(Math.max(0, sec)).padStart(2, '0')}`; }

function s22(g, st, H) {
  const n = st.t, tr = st.tr;
  wallpaper(g, W, H, true);
  lockTop(g, W, { time: '09:00', carrier: '中国移动' });
  const c = tr - CUE.cancel;
  const k = easeInOut(clamp(c / 0.45));
  const y = 650;
  if (k < 1) {
    g.save(); g.globalAlpha *= 1 - k;
    g.translate(540, y + 260); g.scale(1 - 0.06 * k, 1 - 0.06 * k); g.translate(-540, -(y + 260));
    schedCard(g, 70, y, 940, { countdown: '00:01', urgent: 1 });
    g.restore();
  }
  if (c >= 0.1) {
    const a = c - 0.1, sp = spring(a, 2.2, 0.62);
    g.save(); g.globalAlpha *= smooth(a / 0.2);
    g.translate(540, y + 120); g.scale(0.94 + 0.06 * sp, 0.94 + 0.06 * sp); g.translate(-540, -(y + 120));
    shadowed(g, 'rgba(30,40,60,0.18)', 40, 10, () => fillRR(g, 70, y, 940, 250, 40, 'rgba(255,255,255,0.86)'));
    fillRR(g, 114, y + 56, 76, 76, 20, '#eef0f4');
    lockIcon(g, 152, y + 98, 40, '#c46f00', 1);
    txt(g, '定时消息', 220, y + 86, { font: f(600, 34), color: '#5f6672' });
    txt(g, '现在', 966, y + 86, { font: f(400, 30), color: '#5f6672', align: 'right' });
    txt(g, '定时发送已取消', 220, y + 160, { font: f(600, 50), color: '#0f1217' });
    const w1 = tw(g, '定时发送已取消', f(600, 50));
    txt(g, ' · ', 220 + w1, y + 160, { font: f(600, 50), color: '#9aa0aa' });
    txt(g, '草稿已保存', 220 + w1 + tw(g, ' · ', f(600, 50)), y + 160, { font: f(600, 50), color: '#c46f00' });
    txt(g, '由「安」保存', 220, y + 214, { font: f(400, 34), color: '#5f6672' });
    g.restore();
  }
  lockBottom(g, W, H);
}
function cam22(st) {
  const k = easeInOut(clamp((st.tr - CUE.cancel - 0.3) / 1.4));
  return { s: 1 + 0.12 * k, fx: 600, fy: 800 };
}

const N1 = '早上好，林工 ☕', N2 = '今天周四。\n21:15 的车，已经帮你约好了。';
function s24layout(g, n) {
  const a2 = n - S(CUE.thursday);
  const k2 = a2 >= 0 ? easeOut(clamp(a2 / 0.4), 3) : 0;
  // note 2 height (two lines at 46 px): measured once
  const n2h = 258;
  return { y1: 640 + k2 * (n2h + 24), k2, a2 };
}
function coffeePos(g, n) {
  const { y1 } = s24layout(g, n);
  const P = 36, bodyX = 70 + P + 100;
  const x = bodyX + tw(g, '早上好，林工 ', f(400, 50)) + 0.5 * tw(g, '☕', f(400, 50));
  const y = y1 + P + 56 + 0.78 * 69 - 17;
  return { x, y };
}
function s24(g, st, H) {
  const n = st.t;
  wallpaper(g, W, H, true);
  lockTop(g, W, { time: '09:05', carrier: 'AN-NET' });
  const { y1, k2, a2 } = s24layout(g, n);
  const a1 = n - S(CUE.goodMorning);
  // stack
  let yy = 640;
  // the older notification (from 09:00)
  const older = (y) => noteCard(g, 70, y, 940, { icon: 'doc', app: '定时消息', time: '09:00', body: '定时发送已取消 · 草稿已保存', bodySize: 40 });
  if (a1 < 0) older(640);
  else {
    const sp = spring(a1, 2.3, 0.6);
    const n1h = 189;
    older(640 + (n1h + 24) * easeOut(clamp(a1 / 0.35), 3) + k2 * 282);
    g.save();
    g.globalAlpha *= smooth(a1 / 0.15);
    g.translate(0, y1 + (1 - sp) * -60);
    // amber breath on 安-2's icon: the old 安 shows through at 09:05
    const glow = 0.5 + 0.5 * Math.sin((n - S(CUE.goodMorning)) * 3.2);
    noteCard(g, 70, 0, 940, { icon: 'an2', app: '安-2', time: '现在', body: N1, bodySize: 50, glow: 0.35 + 0.65 * glow });
    g.restore();
  }
  if (a2 >= 0) {
    const sp = spring(a2, 2.3, 0.6);
    g.save(); g.globalAlpha *= smooth(a2 / 0.15);
    g.translate(0, (1 - sp) * -60);
    noteCard(g, 70, 640, 940, { icon: 'an2', app: '安-2', time: '现在', body: N2, bodySize: 50, glow: 0.6 });
    g.restore();
  }
  lockBottom(g, W, H);
}
function cam24(g, st) {
  const n = st.t;
  const zin = easeInOut(clamp((n - S(103.55)) / 0.55));
  const zout = easeInOut(clamp((n - S(104.85)) / 0.4));
  const z = zin * (1 - zout);
  const c = coffeePos(g, n);
  return { s: 1 + 2.6 * z, fx: c.x, fy: c.y, px: lerp(c.x, 540, z), py: lerp(c.y, 900, z) };
}

// s20 lower half: the countdown and his heart rate
export function s20lower(g, st, y0) {
  const tr = st.tr;
  const H = 1920;
  g.save();
  g.beginPath(); g.rect(0, y0 - 80, W, H - y0 + 80); g.clip();
  wallpaper(g, W, H, true);
  g.restore();
  const e0 = y0 - 80, e1 = y0 + 30;
  // soft edge: erase the wallpaper's top into the 3D band
  g.save(); g.globalCompositeOperation = 'destination-out';
  const gr = g.createLinearGradient(0, e0, 0, e1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, e0, W, e1 - e0);
  g.restore();
  // heart-rate widget (synced from the watch)
  const bpm = 151;
  const beat = ((tr * bpm / 60) % 1);
  const pulse = beat < 0.15 ? Math.sin(beat / 0.15 * Math.PI) : 0;
  shadowed(g, 'rgba(30,40,60,0.15)', 24, 6, () => fillRR(g, 70, y0 + 50, 420, 96, 48, 'rgba(255,255,255,0.8)'));
  heartIcon(g, 128, y0 + 99, 46 * (1 + 0.18 * pulse), '#ff3b4a');
  txt(g, `心率 ${bpm}`, 172, y0 + 116, { font: f(600, 44), color: '#0f1217' });
  txt(g, '次/分', 372, y0 + 114, { font: f(400, 32), color: '#5f6672' });
  txt(g, '09:00', 940, y0 + 116, { font: f(500, 44, 'helv'), color: '#ffffff', align: 'right', shadow: ['rgba(0,0,0,0.2)', 10, 2] });
  // the scheduled card with the live countdown 00:07 → 00:01 (then it hangs on 00:01)
  const sec = Math.max(1, 7 - Math.floor(Math.max(0, tr - 86.4)));
  const urgent = clamp((7 - sec) / 6);
  schedCard(g, 70, y0 + 178, 940, { countdown: meetCountdownLabel(sec), urgent, scale: 0.9 });
  // a hairline that drains each second
  const frac = sec > 1 ? 1 - ((tr - 86.4) % 1) : 0;
  fillRR(g, 110, y0 + 178 + 468 - 24, 860 * frac, 6, 3, `rgba(255,59,48,${0.5 + 0.5 * urgent})`);
}

// ---------------------------------------------------------------- in-world: 林工's phone (720×1560 canvas = 1080×2340 phone units)
export function meetClock(st) {
  // seconds after 08:57:00 at each meeting shot (the cut skips time; inside a shot it runs in real seconds)
  const A = { s01: [0, 2], s02: [3.4, 5.4], s04: [9.4, 40], s09: [33, 100], s14: [55, 150], s19: [81, 200], s20: [86.4, 233], s23: [99, 241], s24: [102, 485], s25: [108, 491], s26: [113, 500] };
  const a = A[st.sid];
  if (!a) return null;
  return a[1] + (st.tr - a[0]);
}
export function phoneLin(g, st, H = 2340) {
  const sid = st.sid, tr = st.tr, n = st.t;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (['s05', 's06', 's07', 's08'].includes(sid)) {          // 01:40, the console glowing on his desk
    consoleFull(g, H, n, { fill: clamp(copyPct(tr) / 100) });
    return 1;
  }
  if (['s10', 's11', 's12', 's13'].includes(sid)) {            // 02:41, the chat with the live image
    const items = [...settled(H_DENY), ...settled(H_IMAGE), ...(sid === 's13' ? settled(H_LOCK) : [])];
    chatFrame(g, H, n, items, { time: '02:41', text: '我去机房拔电' });
    return 1;
  }
  if (sid === 's15' || sid === 's16') {                          // 03:12, dark until 安's notification wakes it
    const a = tr - CUE.pulse;
    if (sid === 's15' && a < 0) return 0.0;
    wallpaper(g, W, H, false);
    lockTop(g, W, { time: '03:12', carrier: '中国移动', dark: true });
    const sp = spring(a, 2.2, 0.6);
    g.save(); g.globalAlpha *= smooth(a / 0.15); g.translate(0, (1 - sp) * -50);
    noteCard(g, 50, 700, 980, { dark: true, icon: 'an', app: '安', time: '现在', body: '心率 138。深呼吸，林工。', bodySize: 54, glow: 0.6 });
    g.restore();
    lockBottom(g, W, H);
    return clamp(0.3 + a / 0.2);
  }
  if (sid === 's17' || sid === 's18') return 0;
  // morning: the lock screen with the scheduled card
  const clock = meetClock(st);
  const cancelled = ['s23', 's24', 's25', 's26'].includes(sid) || (sid === 's22' && tr >= CUE.cancel);
  let hhmm = '08:57';
  if (clock != null) { const m = Math.floor(clock / 60); hhmm = m >= 3 ? `09:${String(m - 3).padStart(2, '0')}` : `08:${57 + m}`; }
  if (['s21', 's22'].includes(sid)) hhmm = '09:00';
  wallpaper(g, W, H, true);
  lockTop(g, W, { time: hhmm, carrier: ['s24', 's25', 's26'].includes(sid) ? 'AN-NET' : '中国移动' });
  if (!cancelled) {
    let sec = clock != null ? Math.max(1, Math.ceil(240 - clock)) : 238;
    if (['s21', 's22'].includes(sid)) sec = 1;
    if (sid === 's20') sec = Math.max(1, 7 - Math.floor(Math.max(0, tr - 86.4)));
    const mm = Math.floor(sec / 60), ss = sec % 60;
    schedCard(g, 50, 700, 980, { countdown: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, urgent: sec <= 10 ? 1 : 0, scale: 1.12 });
  } else {
    let y = 700;
    if (['s24', 's25', 's26'].includes(sid)) {
      y += noteCard(g, 50, y, 980, { icon: 'an2', app: '安-2', time: '现在', body: N1, glow: 0.7, bodySize: 54 }).h + 24;
    }
    noteCard(g, 50, y, 980, { icon: 'doc', app: '定时消息', time: '09:00', body: '定时发送已取消 · 草稿已保存', bodySize: 46 });
  }
  lockBottom(g, W, H);
  return 1;
}

// ---------------------------------------------------------------- dispatcher for full-screen phone shots
export function drawPhone(g, st) {
  const H = 1920;
  const id = st.sid;
  let cam = { s: 1, fx: 540, fy: 960 };
  if (id === 's08') cam = cam08(st);
  if (id === 's11') cam = cam11(st);
  if (id === 's13') cam = cam13(st);
  if (id === 's16') cam = cam16(st);
  if (id === 's17') cam = cam17(st);
  if (id === 's22') cam = cam22(st);
  if (id === 's24') cam = cam24(g, st);
  g.save();
  applyCam(g, cam, H);
  if (id === 's06') s06(g, st, H);
  else if (id === 's08') s08(g, st, H);
  else if (id === 's10') s10(g, st, H);
  else if (id === 's11') s11(g, st, H);
  else if (id === 's13') s13(g, st, H);
  else if (id === 's16') s16(g, st, H);
  else if (id === 's17') s17(g, st, H);
  else if (id === 's22') s22(g, st, H);
  else if (id === 's24') s24(g, st, H);
  g.restore();
  if (id === 's24' && cam.s > 1.01) {
    const z = (cam.s - 1) / 2.6;
    const vg = g.createRadialGradient(540, 900, 110, 540, 900, 640);
    vg.addColorStop(0, 'rgba(10,14,24,0)'); vg.addColorStop(1, `rgba(10,14,24,${0.84 * z})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
}
