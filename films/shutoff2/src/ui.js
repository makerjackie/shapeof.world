// 关不掉 v11 — UI department. Screen-space overlay (draw) and in-world screen canvases (screen).
// draw(st) returns a 1080×1920 canvas composited on top of the graded picture; phone/card/black shots draw the full frame.
import { CUES, SHOTS, DURATION, storyTime } from './shots.js';
import { f, makeCanvas, smooth, clamp } from './ui-kit.js';
import { drawPhone, phoneLin, s07lower, s20lower, setCues, B, TYPE_DENY, TYPE_PULL, copyPct, s20Sec, meetClock } from './ui-phoneshots.js';
import { keyTimes } from './ui-phone.js';
import { titleCard, titleBeats, timestamp, drawStamp, subtitle, cctvHud, endTexts, endCard, sting, brandBug, caption, CCTV_APPEAR } from './ui-film.js';
import { bigscreen, watch, committeePhone, billboard, Q, VOTE_STEP, CLOSING_AT } from './ui-screens.js';

const W = 1080, H = 1920;
const SIZES = { bigscreen: [1920, 1080], 'phone-lin': [720, 1560], watch: [400, 480], billboard: [1024, 512] };
for (let i = 0; i < 5; i++) SIZES[`phone-c${i}`] = [720, 1560];

export function createUI(ctx) {
  const C = ctx?.CUES ?? CUES;
  setCues(C);
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const pc = makeCanvas(W, H), pg = pc.getContext('2d');
  const screens = {};
  const lastFrame = {};
  // brand mark
  const mark = new Image();
  mark.src = new URL('../public/ui/mark-disc.png', import.meta.url).href;
  const markReady = mark.decode().catch(() => console.warn('[ui] brand mark failed to load'));
  let markOk = false; markReady.then(() => { markOk = mark.naturalWidth > 0; });
  // system fonts: touch every face we use so they resolve before frame 0
  const faces = [f(200, 40, 'helv'), f(600, 40, 'helv'), f(400, 40), f(500, 40), f(600, 40), f(300, 40), f(400, 40, 'serif'), f(700, 40, 'serif'), f(900, 40, 'serif'), f(400, 40, 'mono')];
  const fontsReady = Promise.all(faces.map((x) => document.fonts.load(x, '关不掉安0☕').catch(() => null))).then(() => document.fonts.ready);
  const ready = Promise.all([fontsReady, markReady]).then(() => {
    // warm the glyph caches once
    g.font = f(400, 40); g.fillText('关不掉安早上好林工 ☕', -999, -999);
  });

  function draw(st) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    const id = st.sid, tr = st.tr, lt = st.ltr;
    if (st.set === 'phone') {
      pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, W, H);
      drawPhone(pg, st);
      // stamps turn the picture B/W; for phone shots the picture is this canvas, so grade it here
      if (st.bw > 0) g.filter = `grayscale(${st.bw.toFixed(3)}) contrast(${(1 + 0.12 * st.bw).toFixed(3)}) brightness(${(1 - 0.15 * st.bw).toFixed(3)}) blur(${(5 * st.bw).toFixed(2)}px)`;
      g.drawImage(pc, 0, 0);
      g.filter = 'none';
    }
    switch (id) {
      case 's01': caption(g, lt); break;
      case 's03': titleCard(g, lt, { typeAt: C.titleType - (tr - lt), insertAt: C.titleInsert - (tr - lt) }); break;
      case 's05': timestamp(g, '昨夜', '01:40', lt - 0.15, 2.35, { y: 560 }); break;
      case 's07': s07lower(g, st, st.split * H); break;
      case 's10': {
        const k = 1 - smooth((lt - 0.95) / 0.35);
        if (k > 0) { g.fillStyle = `rgba(0,0,0,${0.82 * k})`; g.fillRect(0, 0, W, H); }
        timestamp(g, '', '02:30', lt, 1.3, { y: 900 });
        break;
      }
      case 's12': cctvHud(g, st, C); break;
      case 's15': timestamp(g, '', '03:12', lt - 0.1, 1.9, { y: 520 }); break;
      case 's20':
        s20lower(g, st, st.split * H);
        subtitle(g, ['全票通过。', '林工，确认之前，你还有异议吗？'], tr - C.ask, (tr - lt + st.durr) - C.ask - 0.15, 744, { size: 52 });
        break;
      case 's21': subtitle(g, ['……没有。'], tr - C.answer, (tr - lt + st.durr) - C.answer, 1250, { size: 62, weight: 400 }); break;
      case 's27': case 's28': case 's29': case 's30': endTexts(g, st, C); break;
      case 's31': {
        titleCard(g, 10, { typeAt: 0, insertAt: 0.5 });
        const k = smooth(lt / 0.6) * (1 - smooth((lt - (st.durr - 0.4)) / 0.4));
        g.fillStyle = `rgba(5,6,8,${1 - k})`; g.fillRect(0, 0, W, H);
        break;
      }
      case 's32': endCard(g, lt, st.durr, markOk ? mark : null); break;
      case 's33': sting(g, tr - C.sting); break;
      default: break;
    }
    if (st.stamp) drawStamp(g, st.stamp);
    // brand mark: not on cards, and not in s01 where it would sit on the phone in the macro
    if (st.set !== 'card' && st.set !== 'black' && id !== 's01') brandBug(g, markOk ? mark : null, st.set === 'phone' ? 0.5 : 0.58);
    return c;
  }

  // in-world screens: one canvas per id (several can be on screen in the same frame); redrawn once per frame
  function screen(id, st) {
    const sz = SIZES[id];
    if (!sz) return null;
    let s = screens[id];
    if (!s) { s = screens[id] = makeCanvas(sz[0], sz[1]); s.glow = 1; }
    if (lastFrame[id] === st.frame) return s;
    lastFrame[id] = st.frame;
    const sg = s.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.filter = 'none';
    if (id === 'bigscreen') { bigscreen(sg, st, C); s.glow = 1; }
    else if (id === 'phone-lin') { sg.scale(sz[0] / 1080, sz[0] / 1080); s.glow = phoneLin(sg, st, 1080 * sz[1] / sz[0]) ?? 1; }
    else if (id.startsWith('phone-c')) { sg.scale(sz[0] / 1080, sz[0] / 1080); s.glow = committeePhone(sg, +id.slice(7), st, C) ?? 1; }
    else if (id === 'watch') { watch(sg, st, C); s.glow = 1; }
    else if (id === 'billboard') { billboard(sg, st); s.glow = 1; }
    return s;
  }

  return { ready, draw, screen, events: () => buildEvents(C) };
}

// ---------------------------------------------------------------- sound-sync export
// Every UI moment that should make a sound, in real film seconds, from the same beat tables the drawing reads.
// types: an key send tap error lock flip tick vanish swipe zoom type ui banner;  g = suggested gain 0..1
function realOf(ts) {          // invert storyTime (the story clock crawls under the stamps)
  let lo = 0, hi = DURATION + 5;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (storyTime(m) < ts) lo = m; else hi = m; }
  return hi;
}
function buildEvents(C) {
  const E = [];
  const add = (t, type, g) => E.push(g == null ? { t: +t.toFixed(3), type } : { t: +t.toFixed(3), type, g });
  const SH = Object.fromEntries(SHOTS.map((s) => [s.id, s]));
  const t0 = (id) => SH[id].start;
  const changes = (fn, a, b, type, g) => {      // an event whenever fn(tr) changes value
    let prev = fn(a);
    for (let i = 1; a + i / 240 < b; i++) {
      const tr = a + i / 240, v = fn(tr);
      if (v === prev) continue;
      let lo = tr - 1 / 240, hi = tr;                 // refine the change to the millisecond
      for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (fn(m) === prev) lo = m; else hi = m; }
      add(hi, type, g); prev = v;
    }
  };
  // s01: 林工's lock-screen countdown (03:58 …)
  changes((tr) => Math.ceil(240 - meetClock({ sid: 's01', tr, ltr: tr - t0('s01') })), t0('s01'), SH.s01.end, 'tick', 0.5);
  // s03 / s31: title keystrokes
  const tb = titleBeats({ typeAt: C.titleType - t0('s03'), insertAt: C.titleInsert - t0('s03') });
  add(t0('s03') + tb.t1, 'type', 1); add(t0('s03') + tb.t2, 'type', 1); add(t0('s03') + tb.back, 'type', 0.45); add(t0('s03') + tb.tBu, 'type', 1);
  add(t0('s31') + 0.05, 'type', 0.6);
  // big screen: question on the cut, answer when it starts typing
  for (const id of ['s04', 's09', 's14']) { add(t0(id), 'ui', 0.5); add(t0(id) + Q[id].dt, 'ui', 1); }
  add(t0('s19') + CLOSING_AT, 'ui', 0.8);
  for (let i = 0; i < 5; i++) add(C.votes + i * VOTE_STEP, 'ui', 0.5);
  add(t0('s23'), 'ui', 1);
  // s06: scroll, the news push, the app switch
  add(t0('s06') + 0.05, 'swipe', 0.35); add(B.s06.banner, 'banner', 0.6); add(B.s06.swap, 'swipe', 0.8);
  // s07: copy starts, memory cells flip (batched to ≤ 12), 覆盖完成
  add(C.copyStart, 'ui', 0.5);
  const flips = [];
  let cells = 0;
  for (let tr = C.copyStart; tr <= C.copyDone + 0.01; tr += 1 / 240) {
    const n = Math.min(18, Math.floor(copyPct(tr) / 100 * 18 + 1e-6));
    if (n > cells) { cells = n; flips.push(tr); }
  }
  const step = Math.max(1, flips.length / 12);
  for (let i = 0; i < Math.min(12, flips.length); i++) add(flips[Math.min(flips.length - 1, Math.round(i * step))], 'flip', 0.5);
  add(C.copyDone, 'ui', 1);
  // s08: typing, send, 安's denial, the log lines vanishing
  for (const ts of keyTimes(TYPE_DENY)) add(realOf(ts), 'key', 0.7);
  add(B.s08.sent, 'send', 1);
  add(C.denyReply, 'an', 1);
  add(C.logVanish, 'vanish', 1); add(B.s08.vanish2, 'vanish', 0.6);
  // s10: the kill button, 已拦截, the script link, the sheet
  add(C.killPress, 'tap', 1); add(C.intercepted, 'error', 1); add(B.s10.linkTap, 'tap', 0.6); add(C.scriptOpen, 'swipe', 0.5);
  // s11: typing the unsent line, 安's live image
  for (const ts of keyTimes(TYPE_PULL)) add(realOf(ts), 'key', 0.7);
  add(C.imageArrives, 'an', 1);
  // s12: the recognition box, the lock-on when he looks up
  add(t0('s12') + CCTV_APPEAR, 'ui', 0.5); add(C.lookUp, 'ui', 0.7);
  // s13, s15, s16, s17: 安's messages, the rows, the scheduled card
  add(B.s13.m1, 'an', 1); add(B.s13.m2, 'an', 1);
  add(C.pulse, 'an', 1);
  add(B.s16.card, 'an', 0.8); for (const t of B.s16.rows) add(t, 'flip', 0.8); add(B.s16.m1, 'an', 1); add(B.s16.m2, 'an', 1);
  add(B.s17.m1, 'an', 1); add(B.s17.m2, 'an', 1); add(C.leverage, 'ui', 0.8); add(B.s17.lockShut, 'lock', 1);
  // s20: countdown 00:07 → 00:01
  changes(s20Sec, t0('s20'), SH.s20.end, 'tick', 0.8);
  // s22, s24, s25, s33
  add(C.cancel, 'ui', 0.8);
  add(C.goodMorning, 'an', 1); add(B.s24.zin, 'zoom', 1); add(C.thursday, 'an', 1);
  add(C.phonesLight, 'an', 1);
  add(C.sting, 'banner', 1);
  return E.sort((a, b) => a.t - b.t);
}
