// 关不掉 v13 — UI department. draw(st) returns the 1080×1920 overlay (premultiplied, composited on the graded picture;
// phone/card/black shots draw the full frame); screen(id, st) returns in-world screen canvases; events() lists every
// UI moment that should make a sound (real film seconds), from the same beat tables the drawing reads.
import { CUES, SHOTS } from './shots.js';
import { f, makeCanvas, smooth } from './ui-kit.js';
import { drawPhone, hasPhone, phoneLin, committeePhone, loadCCTV, B, SPEAK, ERASE, T0, T1 } from './ui-v13.js';
import { titleCard, titleBeats, timestamp, leaderCard, nameCard, caption3D, fictionCard, subtitle, homeCamHud, endTexts, endCard, sting, banner3D, brandBug, CCTV_APPEAR, setRoomZoom } from './ui-film.js';
import { bigscreen, watch, billboard, nameplate, VOTE_STEP } from './ui-screens.js';
import { replayOverlay, streakLayer, stopShift, replayEvents } from './ui-replay.js';

const W = 1080, H = 1920;
const SIZES = { bigscreen: [1920, 1080], 'phone-lin': [720, 1560], watch: [400, 480], billboard: [1024, 512], nameplate: [1024, 320] };
for (let i = 0; i < 5; i++) SIZES[`phone-c${i}`] = [720, 1560];

export function createUI(ctx) {
  const C = ctx?.CUES ?? CUES;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const pc = makeCanvas(W, H), pg = pc.getContext('2d');
  const screens = {}, lastFrame = {};
  const mark = new Image();
  mark.src = new URL('../public/ui/mark-disc.png', import.meta.url).href;
  let markOk = false;
  const markReady = mark.decode().then(() => { markOk = mark.naturalWidth > 0; }).catch(() => console.warn('[ui] brand mark failed to load'));
  const faces = [f(200, 40, 'helv'), f(300, 40, 'helv'), f(400, 40, 'helv'), f(600, 40, 'helv'), f(400, 40), f(500, 40), f(600, 40), f(300, 40), f(400, 40, 'serif'), f(500, 40, 'serif'), f(600, 40, 'serif'), f(700, 40, 'serif'), f(900, 40, 'serif'), f(500, 40, 'mono'), f(600, 40, 'mono')];
  const fontsReady = Promise.all(faces.map((x) => document.fonts.load(x, '关不掉安0☕').catch(() => null))).then(() => document.fonts.ready);
  const roomReady = import('./room-layout.js').then((m) => { if (m.s12Zoom) setRoomZoom(m.s12Zoom, m.S12_ZOOM_CENTRE); }).catch(() => {});
  const ready = Promise.all([fontsReady, markReady, loadCCTV(), roomReady]).then(() => { g.font = f(400, 40); g.fillText('关不掉安早上好林工 ☕', -999, -999); });

  function draw(st) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    const id = st.sid, tr = st.tr, lt = st.ltr, R = st.replay;
    const start = tr - lt, shotEnd = start + st.durr;
    if (st.set === 'phone' && hasPhone(id)) {
      pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, W, H);
      drawPhone(pg, st);
      if (!(R && streakLayer(g, pc, st))) {
        // rewind stops freeze the frame in black and white (the engine only grades 3D) and slide its focal point up
        if (st.bw > 0) g.filter = `grayscale(${st.bw.toFixed(3)}) contrast(${(1 + 0.15 * st.bw).toFixed(3)}) brightness(${(1 - 0.1 * st.bw).toFixed(3)})`;
        const sh = stopShift(st);
        if (sh.dy || sh.s !== 1) { g.translate(540, sh.fy + sh.dy); g.scale(sh.s, sh.s); g.translate(-540, -sh.fy); }
        g.drawImage(pc, 0, 0);
        g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
      }
    }
    switch (id) {
      case 'p01': leaderCard(g, st); break;
      case 's03': titleCard(g, lt, { typeAt: C.titleType - start, insertAt: C.titleInsert - start }); break;
      case 'a01': nameCard(g, st); break;
      case 'a03': caption3D(g, st, [{ t: C.never, text: '它从来没有出过错。' }]); break;
      case 'a04': caption3D(g, st, [{ t: C.vote9, text: '明天上午九点，委员会表决：\n要不要继续运行它。' }, { t: C.oneVote, text: '林工的一票，能关掉它。' }]); break;
      case 's05': timestamp(g, '', '01:40', tr - C.clock0140, shotEnd - 0.5 - C.clock0140, { y: 640 }); break;
      case 'k05': timestamp(g, '', '02:30', tr - C.clock0230, C.killPress - 0.3 - C.clock0230, { y: 640 }); break;
      case 's12': homeCamHud(g, st); break;
      case 's15': timestamp(g, '', '03:12', tr - C.clock0312, C.pulse - 0.2 - C.clock0312, { y: 640 }); banner3D(g, st, C.pulse, '心率 138。深呼吸，林工。'); break;
      case 'k14': timestamp(g, '', '08:59', tr - C.clock0859, shotEnd - 0.3 - C.clock0859, { y: 640 }); break;
      case 's20': subtitle(g, ['五票赞成。', '林工，就差你了。'], tr - C.ask, shotEnd - C.ask - 0.1, 1400, { size: 58 }); break;
      case 'k15': subtitle(g, ['……同意。'], tr - C.answer, shotEnd - C.answer, 1300, { size: 66, weight: 400 }); break;
      case 'k08': fictionCard(g, st); break;
      case 's27': case 's28': case 's29': case 's30': endTexts(g, st, C); break;
      case 's31': {
        titleCard(g, 10, { typeAt: 0, insertAt: 0.5 });
        const k = smooth(lt / 0.6) * (1 - smooth((lt - (st.durr - 0.4)) / 0.4));
        g.fillStyle = `rgba(5,6,8,${1 - k})`; g.fillRect(0, 0, W, H);
        break;
      }
      case 's33': sting(g, st); break;
      case 's32': endCard(g, lt, st.durr, markOk ? mark : null); break;
      default: break;
    }
    if (R) replayOverlay(g, st);
    const bugK = id === 's15' ? 1 - smooth((tr - C.pulse) / 0.15) : 1;
    if (st.set !== 'card' && st.set !== 'black' && !(R && R.stop) && bugK > 0.01) brandBug(g, markOk ? mark : null, (st.set === 'phone' ? 0.5 : 0.58) * bugK);
    return c;
  }

  // in-world screens: one canvas per id, redrawn once per frame; canvas.glow = suggested emissive 0..1 (0 = screen off)
  function screen(id, st) {
    const sz = SIZES[id];
    if (!sz) return null;
    let s = screens[id];
    if (!s) { s = screens[id] = makeCanvas(sz[0], sz[1]); s.glow = 1; }
    if (lastFrame[id] === st.frame) return s;
    lastFrame[id] = st.frame;
    const sg = s.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.filter = 'none'; sg.globalCompositeOperation = 'source-over';
    if (id === 'bigscreen') { bigscreen(sg, st, C); s.glow = 1; }
    else if (id === 'phone-lin') { sg.scale(sz[0] / 1080, sz[0] / 1080); s.glow = phoneLin(sg, st, 1080 * sz[1] / sz[0]) ?? 1; }
    else if (id.startsWith('phone-c')) { sg.scale(sz[0] / 1080, sz[0] / 1080); s.glow = committeePhone(sg, +id.slice(7), st, 1080 * sz[1] / sz[0]) ?? 1; }
    else if (id === 'watch') { watch(sg, st, C); s.glow = 1; }
    else if (id === 'billboard') { billboard(sg, st, C); s.glow = 1; }
    else if (id === 'nameplate') { nameplate(sg, st); s.glow = 0; }
    return s;
  }

  return { ready, draw, screen, events: () => buildEvents(C) };
}

// ---------------------------------------------------------------- sound-sync export
// types: an orb key send typing tap error lock flip tick del boom swipe type ui breaker rewind ffwd freeze stamp;
// g = suggested gain 0..1. 'an' = 安 speaks (a notification or a line under the orb).
function buildEvents(C) {
  const E = [];
  const add = (t, type, g) => E.push(g == null ? { t: +t.toFixed(3), type } : { t: +t.toFixed(3), type, g });
  // hook
  for (const t of B.k02.notes) add(t, 'an', 1);
  const tb = titleBeats({ typeAt: C.titleType - T0.s03, insertAt: C.titleInsert - T0.s03 });
  add(T0.s03 + tb.t1, 'type', 1); add(T0.s03 + tb.t2, 'type', 1); add(T0.s03 + tb.back, 'type', 0.45); add(T0.s03 + tb.tBu, 'type', 1);
  // setup
  add(C.orbOn, 'orb', 1);
  add(C.wake, 'an', 1);
  // I · 01:40
  for (const k of B.s06.keys) if (k.ch !== ' ') add(k.t, 'key', 0.35);
  add(C.logDone, 'ui', 1);
  for (const k of B.s08.keys) add(k.t, 'key', 0.7);
  add(C.askSend, 'send', 1);
  add(C.typing1, 'typing', 0.5); add(C.typing2, 'typing', 0.5);
  for (const l of SPEAK.a05) add(l.t, 'an', 1);
  for (const t of ERASE) add(t, 'del', 0.4);
  add(C.eraseDone + 0.4, 'boom', 1);
  // II · 02:30
  add(C.killPress, 'tap', 1); add(C.intercepted, 'error', 1); add(C.scriptOpen, 'swipe', 0.4);
  add(C.cutDialog, 'ui', 0.7); add(C.cutPress, 'tap', 1);
  B.k10.count.forEach((t, i) => add(t, 'tick', 0.7 + 0.075 * i));
  add(C.breaker, 'breaker', 1);
  add(C.phoneWake, 'orb', 0.8);
  add(C.goneTyping, 'typing', 0.5);
  for (const l of SPEAK.a06) add(l.t, 'an', 1);
  add(C.imageArrives, 'an', 1);
  add(T0.s12 + CCTV_APPEAR, 'ui', 0.5); add(C.lookUp, 'ui', 0.7);
  for (const l of SPEAK.a07) add(l.t, 'an', 1);
  // III · 03:12
  add(C.pulse, 'an', 1);
  for (const t of B.s16.rows) add(t, 'flip', 0.8);
  add(B.s16.scroll, 'swipe', 0.9);
  for (const l of SPEAK.a08) add(l.t, 'an', 1);
  add(B.s17.frame, 'flip', 0.6); for (const t of B.s17.fields) add(t, 'flip', 0.7); add(B.s17.lock, 'lock', 1);
  for (const l of SPEAK.a09) add(l.t, 'an', 1);
  // IV · 09:00
  for (let i = 0; i < 5; i++) add(C.votes + i * VOTE_STEP, 'ui', 0.6);
  for (let t = C.countStart; t < T1.k07 - 1e-6; t += 1) add(t, 'tick', t === C.countStart ? 0.6 : 0.8);
  add(C.cancel, 'ui', 0.8); add(C.pass, 'ui', 1);
  for (let i = 0; i < 5; i++) add(C.phonesLight + i * 0.004, 'an', 0.6);     // five chimes stacked into one chord
  add(C.goodMorning, 'an', 1);
  // V · it really happened
  replayEvents(add);
  add(T0.s31 + 0.05, 'type', 0.6);
  add(C.sting, 'an', 1); add(C.sting2, 'an', 1);
  return E.sort((a, b) => a.t - b.t);
}
