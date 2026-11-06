// 关不掉 v13 · DC department — the layout of the hall and the timing of everything that happens in it.
// Everything here is a pure function of story time t. Shared by the scene (src/dc*.js) and the cameras/looks (src/cams/dc.js).
// Local hall coordinates: floor y = 0, the main cold aisle runs along −Z between rows L1 (x < 0) and R1 (x > 0).
//   s07  (copy)     安's racks wake amber; the copy races along the trays down the hall and into the dark (to an outside server).
//   k11  (breaker)  the motorised main breaker slams down at CUES.breaker.
//   k12  (blackout) from CUES.rowsOut the hall dies row by row toward the camera; red emergency light at CUES.emergency.
import { CUES } from './shots.js';

export const OY = -500;                      // the hall's floor in world space
export const NK = 34, RW = 0.6, RD = 1.1, RH = 2.05, Z0 = 6.0, ZEND = Z0 - NK * RW;   // racks per row, rack w/d/h, row start/end
export const CEIL = 4.4;
export const U42 = 0.04445 * 42;             // the 42U equipment opening (m)
export const rackZ = (k) => Z0 - RW * (k + 0.5);
// rows: x of the front face, f = which way the fronts look (+1: +X)
export const ROWS = [
  { x: -1.1, f: 1 }, { x: 1.1, f: -1 },      // L1, R1: the main aisle
  { x: -4.5, f: -1 }, { x: 4.5, f: 1 },      // L2, R2 (backs to the hot aisles)
  { x: -6.7, f: 1 }, { x: 6.7, f: -1 },      // L3, R3
];
export const AN = { row: 0, k0: 1, k1: 9 };      // 安's racks (left row, near)
export const groupOf = (r, k) => (r === AN.row && k >= AN.k0 && k <= AN.k1) ? 1 : 0;
export const TX = 1.38, TY = 2.47, XZ = -0.9;   // fibre bundles in the overhead trays (x = ±TX, y = TY); the cross ladder at z = XZ
export const CS = CUES.copyStart, CD = CUES.copyDone, COPY_D = CD - CS;
export const BREAKER = CUES.breaker, ROWS_OUT = CUES.rowsOut, EMERG = CUES.emergency;
export const WAVE = { dur: 2.6, zFar: -17.5, zNear: 7.0 };
// the switchgear lineup against the back wall (k11): cabinet fronts face −Z at z = SW.z
export const SW = { x: -2.6, z: 8.55, n: 5, w: 0.8, h: 2.25, d: 0.9 };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// A polyline with quadratic fillets at the corners, resampled every `step` m. keyS = arc length at each key.
export function roundedPath(keys, r = 0.18, step = 0.04) {
  const raw = [keys[0]], rawKey = [0];
  for (let i = 1; i < keys.length - 1; i++) {
    const A = keys[i - 1], B = keys[i], C = keys[i + 1];
    const la = len(sub(B, A)), lc = len(sub(C, B));
    const P = mix3(B, A, Math.min(r, la * 0.45) / la), Q = mix3(B, C, Math.min(r, lc * 0.45) / lc);
    const n = 12;
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      raw.push(mix3(mix3(P, B, t), mix3(B, Q, t), t));
      if (j === n / 2) rawKey.push(raw.length - 1);
    }
  }
  raw.push(keys[keys.length - 1]); rawKey.push(raw.length - 1);
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + len(sub(raw[i], raw[i - 1])));
  const L = cum[cum.length - 1];
  const pts = [], s = [];
  const N = Math.max(2, Math.ceil(L / step));
  let j = 0;
  for (let i = 0; i <= N; i++) {
    const si = (i / N) * L;
    while (j < cum.length - 2 && cum[j + 1] < si) j++;
    const t = clamp01((si - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-9));
    pts.push(mix3(raw[j], raw[j + 1], t)); s.push(si);
  }
  return { pts, s, len: L, keyS: rawKey.map((i) => cum[i]) };
}

export function pointAt(path, s) {
  const { pts, len: L } = path;
  const u = clamp01(s / L) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  return mix3(pts[i], pts[i + 1], u - i);
}

// ---- the trunk: 安's racks → up into the left tray → across the aisle → down the whole right tray → up into the end wall (out)
const KEYS = [
  [-TX, TY, 5.6], [-TX, TY, XZ + 0.34], [-TX + 0.27, TY + 0.25, XZ], [TX - 0.27, TY + 0.25, XZ], [TX, TY, XZ - 0.34],
  [TX, TY, ZEND - 0.2], [TX, 3.55, ZEND - 1.4], [TX * 0.7, 3.75, -17.6],
];
// it gathers over 安's racks, leaps the aisle like a nerve impulse, races the length of the hall and dives into the wall
const AK = [CS + 0.12, CS + 0.25, CS + 0.30, CS + 0.35, CS + 0.38, CS + 1.05, CS + 1.22, CS + 1.36];
export const TRUNK = roundedPath(KEYS, 0.24);

export function arrival(s) {
  const ks = TRUNK.keyS;
  if (s <= ks[0]) return AK[0] - (ks[0] - s) * 0.05;
  for (let i = 1; i < ks.length; i++) if (s <= ks[i]) return AK[i - 1] + (AK[i] - AK[i - 1]) * (s - ks[i - 1]) / (ks[i] - ks[i - 1]);
  return AK[AK.length - 1];
}
export const T_FRONT0 = AK[0], T_FRONT1 = AK[AK.length - 1];

// how far the front has travelled at time t (−1 before it starts)
export function frontS(t) {
  if (t < AK[0]) return -1;
  if (t >= arrival(TRUNK.len)) return TRUNK.len;
  let a = 0, b = TRUNK.len;
  for (let i = 0; i < 32; i++) { const m = (a + b) / 2; if (arrival(m) < t) a = m; else b = m; }
  return (a + b) / 2;
}

// arc length on the trunk's straight run at x = side·TX nearest to z
export function sAtZ(z, side) {
  let best = 0, bd = 1e9;
  const { pts, s } = TRUNK;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.abs(p[0] - side * TX) > 1e-3 || Math.abs(p[1] - TY) > 1e-3) continue;
    const d = Math.abs(p[2] - z);
    if (d < bd) { bd = d; best = s[i]; }
  }
  return best;
}

// ---- 安's feeders: rack top → tray (the light rises out of its racks)
export const DROPS = [];
for (let k = AN.k0; k <= AN.k1; k++) {
  const z = rackZ(k), j = k - AN.k0;
  const path = roundedPath([[-1.74, RH - 0.01, z], [-1.74, RH + 0.2, z], [-TX - 0.1, TY - 0.02, z + 0.02], [-TX + 0.02, TY - 0.01, z + 0.08]], 0.12, 0.03);
  const sJ = sAtZ(z, -1);
  const a1 = arrival(sJ) - 0.01 + 0.02 * hash1(j + 3), a0 = Math.max(CS, a1 - 0.1);
  DROPS.push({ kind: 'feed', row: 0, k, path, a0, a1, sJoin: sJ });
}

// ---- 安's presence in its racks: wakes just before the copy, fades back to cold after it (0..1)
export const anAt = (t) => smooth((t - (CS - 0.4)) / 0.35) * (1 - smooth((t - CD - 0.15) / 0.7));

// ---- the blackout (k12): each point of the hall loses power when the wave passes it (far end first)
export function offTime(z) { return ROWS_OUT + WAVE.dur * clamp01((z - WAVE.zFar) / (WAVE.zNear - WAVE.zFar)); }
export const powerAt = (z, t) => (t < offTime(z) ? 1 : 0);
// the lit doorway beyond the containment doors: dim at 01:40 (s07), bright in the normal-lit hall before the blackout
export const doorAt = (t) => (t < 80 ? 0.4 : 1.6) * powerAt(WAVE.zFar, t);
// red emergency lighting: flickers on, then holds
export function emergAt(t) {
  const a = t - EMERG;
  if (a < 0) return 0;
  const fl = a < 0.35 ? (hash1(Math.floor(t * 30) * 0.37) > 0.45 ? 0.6 : 0.08) : 1;
  return fl * smooth(a / 1.4);
}
// how much of the hall is still lit (0..1): drives the haze and the fill
export const hallLit = (t) => 1 - clamp01((t - ROWS_OUT) / WAVE.dur);

// ---- the breaker (k11): handle angle (deg; +55 = ON, −55 = OFF) with a slam, overshoot and a damped bounce
export function handleAngle(t) {
  const a = t - BREAKER;
  if (a <= 0) return 55 + 1.2 * Math.sin(t * 40) * smooth((t - BREAKER + 0.25) / 0.25) * 0;   // still
  const T = 0.085;
  if (a < T) { const u = a / T; return 55 - 120 * u * u; }                        // accelerates down
  const b = a - T;
  return -55 - 10 * Math.exp(-b * 9) * Math.cos(b * 38);                        // overshoot to −65, rings out
}
// the cabinet's shake after the slam (m)
export const shakeAt = (t) => { const a = t - BREAKER - 0.085; return a > 0 ? 0.004 * Math.exp(-a * 7) * Math.sin(a * 70) : 0; };
// arc flash (0..1)
export const arcAt = (t) => { const a = t - BREAKER - 0.07; return a > 0 ? Math.exp(-a * 14) * (a < 0.03 ? a / 0.03 : 1) : 0; };

// local lights for the look (world space, ≤ 6)
export function dcLights(t) {
  const L = [];
  const amber = '#ffb547';
  const an = anAt(t);
  if (an > 0) L.push({ pos: [-0.75, OY + 1.25, rackZ(5)], r: 4.6, color: amber, i: 0.34 * an });
  // the head of the stream
  const fs = frontS(t);
  if (fs >= 0) {
    const p = pointAt(TRUNK, fs);
    const k = smooth((t - T_FRONT0) / 0.15) * (1 - smooth((t - T_FRONT1) / 0.3));
    if (k > 0) L.push({ pos: [p[0] * 0.8, OY + p[1] + 0.15, p[2]], r: 2.8, color: '#ffc874', i: 1.0 * k });
  }
  // the cold light at the end of the aisle (beyond the containment doors)
  const door = doorAt(t);
  if (door > 0) L.push({ pos: [0, OY + 1.7, ZEND - 1.6], r: 7.5, color: '#8fd3ff', i: 0.42 * door });
  return L;
}
