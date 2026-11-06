// 安's orb: a living sphere of amber light. It breathes (~4 s), brightens with a ripple when 安 speaks,
// and can ignite from a point. A pure function of time: drawOrb(g, x, y, r, t, { speak: [times], on, alpha, mini }).
import { clamp, lerp, smooth, easeOut, easeInOut } from './ui-kit.js';

const TAU = Math.PI * 2;
export const ORB_BREATH = 4.0;

export function orbState(t, o = {}) {
  let ign = 1, flash = 0;
  if (o.on != null) {
    const a = t - o.on;
    ign = a <= 0 ? 0 : easeOut(clamp(a / 1.2), 3);
    flash = a > 0 ? Math.exp(-a * 2.6) * smooth(a / 0.05) : 0;
  }
  const breathe = Math.sin(TAU * t / ORB_BREATH);
  let talk = 0;
  const ripples = [];
  for (const ts of o.speak ?? []) {
    const a = t - ts;
    if (a < 0 || a > 2.4) continue;
    talk = Math.max(talk, Math.exp(-a * 1.4) * smooth(a / 0.1));
    ripples.push(a);
  }
  return { ign, flash, breathe, talk, ripples };
}

// one orbit ring: half = 'back' (behind the sphere, dimmer) or 'front'
function ring(g, x, y, R, t, half, al, spec) {
  const a = R * spec.a, b = R * spec.b;
  const tilt = (spec.tilt + 3 * Math.sin(TAU * t / spec.wob)) * Math.PI / 180;
  const th0 = half === 'back' ? Math.PI : 0, th1 = half === 'back' ? TAU : Math.PI;
  g.save();
  g.translate(x, y); g.rotate(tilt);
  g.strokeStyle = `rgba(255,214,150,${spec.alpha * al * (half === 'back' ? 0.45 : 1)})`;
  g.lineWidth = Math.max(1, R * spec.w);
  g.beginPath(); g.ellipse(0, 0, a, b, 0, th0, th1); g.stroke();
  // a bright mote travelling on the ring
  const th = ((spec.dir * t / spec.period) % 1 + 1) % 1 * TAU;
  const onBack = Math.sin(th) < 0;
  if ((half === 'back') === onBack) {
    const px = a * Math.cos(th), py = b * Math.sin(th), mr = Math.max(1.5, R * 0.035);
    const k = onBack ? 0.45 : 1;
    const mg = g.createRadialGradient(px, py, 0, px, py, mr * 5);
    mg.addColorStop(0, `rgba(255,240,205,${0.95 * al * k})`); mg.addColorStop(0.25, `rgba(255,200,120,${0.45 * al * k})`); mg.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = mg; g.fillRect(px - mr * 5, py - mr * 5, mr * 10, mr * 10);
  }
  g.restore();
}
const RINGS = [
  { a: 1.55, b: 0.34, tilt: -16, wob: 13, w: 0.011, alpha: 0.42, period: 7.0, dir: 1 },
  { a: 1.86, b: 0.5, tilt: 11, wob: 17, w: 0.008, alpha: 0.26, period: 11.0, dir: -1 },
];

export function drawOrb(g, x, y, r, t, o = {}) {
  const S = orbState(t, o);
  if (S.ign <= 0.001) return S;
  const al = o.alpha ?? 1;
  if (al <= 0.01) return S;
  const mini = o.mini ?? r < 48;
  const R = r * S.ign * (1 + 0.035 * S.breathe + 0.07 * S.talk);
  const glow = (0.85 + 0.12 * S.breathe + 0.55 * S.talk + 1.4 * S.flash) * al;
  g.save();
  g.globalCompositeOperation = 'lighter';
  // halo
  const H = R * (mini ? 2.4 : 3.3);
  let gr = g.createRadialGradient(x, y, R * 0.3, x, y, H);
  gr.addColorStop(0, `rgba(255,176,70,${Math.min(1, 0.46 * glow)})`);
  gr.addColorStop(0.28, `rgba(255,150,44,${0.13 * glow})`);
  gr.addColorStop(0.6, `rgba(255,140,30,${0.03 * glow})`);
  gr.addColorStop(1, 'rgba(255,140,30,0)');
  g.fillStyle = gr; g.fillRect(x - H, y - H, 2 * H, 2 * H);
  // speaking ripples
  for (const a of S.ripples) {
    const k = a / 2.4;
    g.strokeStyle = `rgba(255,196,110,${0.55 * (1 - k) * (1 - k) * al})`;
    g.lineWidth = Math.max(1, R * 0.035 * (1 - k));
    g.beginPath(); g.arc(x, y, R * (1.08 + (mini ? 1.2 : 2.1) * easeOut(k, 2)), 0, TAU); g.stroke();
  }
  if (!mini) for (const sp of RINGS) ring(g, x, y, R, t, 'back', al * S.ign, sp);
  g.globalCompositeOperation = 'source-over';
  // the sphere: light, not a surface — a white-hot core, an amber body that softens toward the edge,
  // a fresnel rim that dissolves into the halo, and faint plasma filaments turning inside
  g.save();
  g.globalAlpha *= al;
  gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, 'rgba(255,251,240,1)'); gr.addColorStop(0.2, 'rgba(255,229,166,1)'); gr.addColorStop(0.52, 'rgba(255,186,86,0.97)');
  gr.addColorStop(0.84, 'rgba(250,152,50,0.8)'); gr.addColorStop(1, 'rgba(238,132,38,0.36)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter';
  const rim = g.createRadialGradient(x, y, R * 0.74, x, y, R * 1.22);
  rim.addColorStop(0, 'rgba(255,190,100,0)'); rim.addColorStop(0.52, `rgba(255,210,140,${0.34 + 0.15 * S.talk})`); rim.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = rim; g.fillRect(x - R * 1.25, y - R * 1.25, R * 2.5, R * 2.5);
  if (!mini) {
    g.save(); g.beginPath(); g.arc(x, y, R * 0.97, 0, TAU); g.clip();
    for (let k = 0; k < 4; k++) {
      const ang = t * [0.23, -0.31, 0.17, -0.12][k] + k * 1.7;
      g.save(); g.translate(x, y); g.rotate(ang);
      g.strokeStyle = `rgba(255,244,214,${0.07 + 0.04 * Math.sin(t * 0.9 + k) + 0.1 * S.talk})`;
      g.lineWidth = Math.max(1, R * 0.014);
      const a0 = t * 0.5 * (k % 2 ? -1 : 1) + k * 1.3;
      g.beginPath(); g.ellipse(R * 0.06 * Math.sin(t * 0.4 + k), 0, R * [0.78, 0.62, 0.5, 0.86][k], R * [0.2, 0.28, 0.14, 0.34][k], 0, a0, a0 + 2.3); g.stroke();
      g.restore();
    }
    g.restore();
  }
  // the core breathes, and flares when it speaks / ignites
  const cb = 0.3 + 0.08 * S.breathe + 0.3 * S.talk + 0.7 * S.flash;
  const cg = g.createRadialGradient(x, y, 0, x, y, R * 0.75);
  cg.addColorStop(0, `rgba(255,252,240,${Math.min(1, cb)})`); cg.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = cg; g.fillRect(x - R, y - R, 2 * R, 2 * R);
  g.restore();
  if (!mini) {
    g.globalCompositeOperation = 'lighter';
    for (const sp of RINGS) ring(g, x, y, R, t, 'front', al * S.ign, sp);
  }
  g.restore();
  return S;
}
