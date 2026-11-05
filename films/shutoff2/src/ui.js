// 关不掉 v11 — UI department. Screen-space overlay (draw) and in-world screen canvases (screen).
// draw(st) returns a 1080×1920 canvas composited on top of the graded picture; phone/card/black shots draw the full frame.
import { CUES } from './shots.js';
import { f, makeCanvas, smooth, clamp } from './ui-kit.js';
import { drawPhone, phoneLin, s07lower, s20lower, setCues } from './ui-phoneshots.js';
import { titleCard, timestamp, drawStamp, subtitle, cctvHud, endTexts, endCard, sting, brandBug, caption } from './ui-film.js';
import { bigscreen, watch, committeePhone, billboard } from './ui-screens.js';

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
      case 's03': titleCard(g, lt, { typeAt: C.titleType - 6.0, insertAt: C.titleInsert - 6.0 }); break;
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
        subtitle(g, ['全票通过。', '林工，确认之前，你还有异议吗？'], tr - C.ask, st.durr - (C.ask - 86.4) - 0.15, 744, { size: 52 });
        break;
      case 's21': subtitle(g, ['……没有。'], tr - C.answer, 96.6 - C.answer, 1250, { size: 62, weight: 400 }); break;
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
    if (st.set !== 'card' && st.set !== 'black') brandBug(g, markOk ? mark : null, st.set === 'phone' ? 0.5 : 0.58);
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

  return { ready, draw, screen };
}
