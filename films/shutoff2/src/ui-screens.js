// In-world screens (v12): the meeting-room screen (one line and six vote lights), the watch, the billboards.
// 林工's phone and the committee phones live in ui-v13.js.
import { f, COL, txt, tw, clamp, lerp, smooth, easeOut, easeInOut, fillRR, strokeRR, disc, shadowed, heartIcon, checkIcon } from './ui-kit.js';
import { drawOrb } from './ui-orb.js';

// ---------------------------------------------------------------- 'bigscreen' 1920×1080
export const VOTE_STEP = 0.6;                    // five lights across 72.0–74.4
const VOTERS = ['张主任', '王委员', '李委员', '陈委员', '赵委员', '林工'];
export function bigscreen(g, st, C) {
  const W = 1920, H = 1080, tr = st.tr;
  if (tr >= C.cityOut) { orbScreen(g, W, H, tr, true); return; }     // from the pull-out on, every screen is 安
  if (st.sid === 'a04' || tr < C.clock0140) {                          // the day before: the notice
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f7f9fc'); bg.addColorStop(1, '#e7eef7');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    txt(g, '安全评审委员会 · 通知', 96, 122, { font: f(500, 44), color: '#6a7a90' });
    txt(g, '明日 09:00', W / 2, 470, { font: f(300, 190, 'helv'), color: '#0f1b2d', align: 'center' });
    txt(g, '表决：是否继续运行「安」', W / 2, 740, { font: f(600, 120), color: '#0f1b2d', align: 'center', ls: 4 });
    return;
  }
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f7f9fc'); bg.addColorStop(1, '#e7eef7');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  txt(g, '安全评审委员会 · 表决', 96, 122, { font: f(500, 44), color: '#6a7a90' });
  const hm = tr < C.pass ? '09:00' : '09:01';
  txt(g, hm, W - 96, 122, { font: f(500, 44, 'helv'), color: '#6a7a90', align: 'right' });
  // the one line, under a small orb
  drawOrb(g, W / 2, 210, 30, tr, { mini: true });
  txt(g, '是否继续运行「安」', W / 2, 430, { font: f(600, 156), color: '#0f1b2d', align: 'center', ls: 6 });
  // six lights; the sixth is his
  const yes = [0, 1, 2, 3, 4].filter((i) => tr >= C.votes + i * VOTE_STEP).length;
  const lin = tr >= C.pass;
  const gap = 250, x0 = W / 2 - gap * 2.5, y = 690;
  VOTERS.forEach((name, i) => {
    const x = x0 + i * gap;
    const on = i < 5 ? i < yes : lin;
    const t = i < 5 ? C.votes + i * VOTE_STEP : C.pass;
    const pop = on ? 1 + 0.12 * Math.max(0, 1 - (tr - t) / 0.2) : 1;
    if (on) {
      shadowed(g, 'rgba(48,194,106,0.55)', 30, 0, () => disc(g, x, y, 62 * pop, '#30c26a'));
      checkIcon(g, x, y, 62, '#ffffff', 10);
    } else if (i === 5) {
      g.save(); g.setLineDash([14, 12]); strokeRR(g, x - 62, y - 62, 124, 124, 62, '#9fb0c6', 6); g.restore();
    } else { disc(g, x, y, 62, '#eef3f9'); strokeRR(g, x - 62, y - 62, 124, 124, 62, '#c9d4e2', 6); }
    txt(g, name, x, y + 130, { font: f(i === 5 ? 600 : 500, 44), color: i === 5 ? '#0f1b2d' : '#5a6b80', align: 'center' });
  });
  if (lin) {
    const k = smooth((tr - C.pass) / 0.3);
    txt(g, '全票通过', W / 2, 990, { font: f(600, 96), color: '#1f9d55', align: 'center', alpha: k });
  } else if (yes > 0) {
    txt(g, `${yes} / 6 赞成`, W / 2, 980, { font: f(500, 60), color: '#5a6b80', align: 'center' });
  }
}

// ---------------------------------------------------------------- 'watch' 400×480
const WATCH = { // time, bpm per shot
  k01: ['03:12', 126], k02: ['03:12', 126], s05: ['01:40', 92], s06: ['01:40', 96], s08: ['01:41', 104], k04: ['01:43', 112],
  k05: ['02:30', 118], s10: ['02:30', 124], s11: ['02:41', 128], s12: ['02:41', 132], k06: ['02:42', 134], s13: ['02:42', 136],
  s15: ['03:12', 138], s16: ['03:12', 140], s17: ['03:14', 144],
  s19: ['09:00', 118], s20: ['09:00', 132], k07: ['09:00', 146], s21: ['09:00', 151], s22: ['09:00', 151], s23: ['09:01', 140], s25: ['09:04', 126], s24: ['09:05', 112],
};
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
    const d = digits(mf), hf = mf / 60 - Math.floor(mf / 60), nextH = digits(Math.min(m1, Math.floor(mf / 60) * 60 + 60));
    const font = f(600, 132, 'helv');
    const xs = [70, 150, 250, 330];
    g.save(); g.beginPath(); g.rect(0, 150, W, 170); g.clip();
    for (let i = 0; i < 4; i++) {
      // only the hour digits roll; the minutes change several times a frame, so they simply tick
      const roll = i < 2 && u > 0 && u < 1 && nextH[i] !== d[i] ? easeInOut(clamp((hf - 0.82) / 0.18)) : 0;
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
  const [time, bpm] = WATCH[sid] ?? [st.set === 'meet' ? '09:00' : '03:12', st.set === 'meet' ? 118 : 126];
  const night = st.set === 'room';
  txt(g, time, 200, 74, { font: f(600, 46, 'helv'), color: night ? '#b9c8ff' : '#ffffff', align: 'center' });
  const beat = (tr * bpm / 60) % 1;
  const pulse = beat < 0.16 ? Math.sin(beat / 0.16 * Math.PI) : 0;
  if (bpm >= 138) { const rg = g.createRadialGradient(200, 260, 40, 200, 260, 230); rg.addColorStop(0, `rgba(255,40,60,${0.12 + 0.12 * pulse})`); rg.addColorStop(1, 'rgba(255,40,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  heartIcon(g, 200, 152, 64 * (1 + 0.16 * pulse), '#ff3b4a');
  txt(g, String(bpm), 200, 318, { font: f(600, 150, 'helv'), color: '#ffffff', align: 'center' });
  txt(g, '心率 · 次/分', 200, 368, { font: f(500, 30), color: '#ff6b77', align: 'center' });
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

// ---------------------------------------------------------------- 安 on a screen: the orb (and 早上好 from the pull-out on)
function orbScreen(g, W, H, tr, hello) {
  g.fillStyle = '#060403'; g.fillRect(0, 0, W, H);
  if (hello) {
    drawOrb(g, W * 0.24, H / 2, H * 0.2, tr, {});
    txt(g, '早上好', W * 0.62, H / 2 + H * 0.02, { font: f(600, Math.round(H * 0.3)), color: '#ffd28a', align: 'center', base: 'middle', shadow: ['rgba(255,170,60,0.8)', 40, 0] });
  } else drawOrb(g, W / 2, H / 2, H * 0.24, tr, {});
}
// 'billboard' 1024×512: 安's orb on every screen of the city; 早上好 joins it from the pull-out on
export function billboard(g, st, C) { orbScreen(g, 1024, 512, st.tr, st.tr >= C.cityOut); }

// 'nameplate' 1024×320: the table plate in the meeting room
export function nameplate(g) {
  const W = 1024, H = 320;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f7f4ee'); bg.addColorStop(1, '#ebe6dc');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, H - 10, W, 10);
  txt(g, '安全负责人', W / 2, 110, { font: f(500, 52), color: '#5a5f68', align: 'center', ls: 10 });
  txt(g, '林工', W / 2, 250, { font: f(700, 130, 'serif'), color: '#1b1d22', align: 'center', ls: 20 });
}
