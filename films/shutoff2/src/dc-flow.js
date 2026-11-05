// 关不掉 v11 · DC department — the layout of the hall and the timing of the copy.
// Everything here is a pure function of story time. Shared by the scene (src/dc.js) and the camera/look (src/cams/dc.js).
// Local hall coordinates: floor y = 0, the main cold aisle runs along −Z between rows L1 (x < 0) and R1 (x > 0).
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
export const AN2 = { row: 1, k0: 13, k1: 24 };   // 安-2's racks (right row, further down)
export const groupOf = (r, k) => (r === AN.row && k >= AN.k0 && k <= AN.k1) ? 1 : (r === AN2.row && k >= AN2.k0 && k <= AN2.k1) ? 2 : 0;
export const TX = 1.38, TY = 2.47, XZ = -0.9;   // fibre bundles in the overhead trays (x = ±TX, y = TY); the cross ladder at z = XZ
export const CS = CUES.copyStart, CD = CUES.copyDone;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

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
    const t = Math.min(1, Math.max(0, (si - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-9)));
    pts.push(mix3(raw[j], raw[j + 1], t)); s.push(si);
  }
  return { pts, s, len: L, keyS: rawKey.map((i) => cum[i]) };
}

export function pointAt(path, s) {
  const { pts, len: L } = path;
  const u = Math.min(1, Math.max(0, s / L)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  return mix3(pts[i], pts[i + 1], u - i);
}

// ---- the console's progress (same curve as the UI's copyPct in src/ui-phoneshots.js): 37 % … pause … 73 % … pause … done
const eio = (x) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x); };
const einv = (u) => { u = Math.min(1, Math.max(0, u)); return u < 0.5 ? Math.sqrt(u / 2) : 1 - Math.sqrt((1 - u) / 2); };
export function progP(t) {
  const a = CS, b = CD;
  if (t < a) return 0;
  if (t < a + 1.0) return 0.37 * eio(t - a);
  if (t < a + 1.6) return 0.37;
  if (t < a + 2.6) return 0.37 + 0.36 * eio(t - a - 1.6);
  if (t < a + 3.1) return 0.73;
  if (t < b) return 0.73 + 0.27 * eio((t - a - 3.1) / (b - a - 3.1));
  return 1;
}
export function progInv(y) {
  const a = CS, b = CD;
  if (y <= 0.37) return a + einv(y / 0.37);
  if (y <= 0.73) return a + 1.6 + einv((y - 0.37) / 0.36);
  return a + 3.1 + (b - a - 3.1) * einv((y - 0.73) / 0.27);
}
// 安-2's units flip in rank order (0..1): rack i owns ranks [i, i + SPAN] / (n − 1 + SPAN), top unit first.
// The stream needs ~0.5 s to reach 安-2, so the picture's rank 0 starts at console progress P0; the pauses line up exactly.
export const N2 = AN2.k1 - AN2.k0 + 1, SPAN = 1.6;
export const T_FIRST = CS + 0.55;
export const P0 = progP(T_FIRST);
export const visF = (t) => Math.min(1, Math.max(0, (progP(t) - P0) / (1 - P0)));
export const rankTime = (r) => progInv(P0 + (1 - P0) * r);
export const rackRank = (k) => ({ base: (k - AN2.k0) / (N2 - 1 + SPAN), span: SPAN / (N2 - 1 + SPAN) });

// ---- the trunk: 安's racks → up into the left tray → across the aisle on the cross ladder → down the right tray to 安-2
const KEYS = [
  [-TX, TY, 5.6], [-TX, TY, XZ + 0.34], [-TX + 0.27, TY + 0.25, XZ], [TX - 0.27, TY + 0.25, XZ], [TX, TY, XZ - 0.34], [TX, TY, rackZ(AN2.k1) - 0.45],
];
// it gathers over 安's racks, leaps the aisle like a nerve impulse, then crawls down 安-2's row in step with the flips
const AK = [CS + 0.12, CS + 0.25, CS + 0.30, CS + 0.35, CS + 0.38];
export const TRUNK = roundedPath(KEYS, 0.2);
const DROP_T = 0.1;
// arrival at the top of 安-2 rack i's drop = its first flip − drop time
const A2 = [];
for (let k = AN2.k0; k <= AN2.k1; k++) A2.push({ z: rackZ(k), t: rankTime(rackRank(k).base) - DROP_T - 0.03 });

export function arrival(s) {
  const ks = TRUNK.keyS;
  if (s <= ks[0]) return AK[0] - (ks[0] - s) * 0.05;
  for (let i = 1; i < 5; i++) if (s <= ks[i]) return AK[i - 1] + (AK[i] - AK[i - 1]) * (s - ks[i - 1]) / (ks[i] - ks[i - 1]);
  // the right run is straight along −z
  const z = KEYS[4][2] - (s - ks[4]);
  if (z >= A2[0].z) return AK[4] + (A2[0].t - AK[4]) * (KEYS[4][2] - z) / (KEYS[4][2] - A2[0].z);
  for (let i = 1; i < A2.length; i++) if (z >= A2[i].z) return A2[i - 1].t + (A2[i].t - A2[i - 1].t) * (A2[i - 1].z - z) / (A2[i - 1].z - A2[i].z);
  return A2[A2.length - 1].t + (A2[A2.length - 1].z - z) * 0.3;
}
export const T_FRONT0 = AK[0], T_FRONT1 = A2[A2.length - 1].t;

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
    if (Math.abs(p[0] - side * TX) > 1e-3) continue;
    const d = Math.abs(p[2] - z);
    if (d < bd) { bd = d; best = s[i]; }
  }
  return best;
}

// ---- drops: 安's feeders (rack top → tray) and 安-2's drops (tray → rack top)
export const DROPS = [];
for (let k = AN.k0; k <= AN.k1; k++) {
  const z = rackZ(k), j = k - AN.k0;
  const path = roundedPath([[-1.74, RH - 0.01, z], [-1.74, RH + 0.2, z], [-TX - 0.1, TY - 0.02, z + 0.02], [-TX + 0.02, TY - 0.01, z + 0.08]], 0.12, 0.03);
  const sJ = sAtZ(z, -1);
  const a1 = arrival(sJ) - 0.01 + 0.02 * hash1(j + 3), a0 = Math.max(CS, a1 - 0.1);
  DROPS.push({ kind: 'feed', row: 0, k, path, a0, a1, sJoin: sJ });
}
for (let k = AN2.k0; k <= AN2.k1; k++) {
  const z = rackZ(k);
  const sT = sAtZ(z, 1);
  const path = roundedPath([[TX - 0.02, TY - 0.01, z - 0.08], [TX + 0.1, TY - 0.02, z - 0.02], [1.74, RH + 0.2, z], [1.74, RH - 0.01, z]], 0.12, 0.03);
  const a0 = arrival(sT), a1 = a0 + DROP_T;
  DROPS.push({ kind: 'drop', row: 1, k, path, a0, a1, sStart: sT });
}
// share of 安-2's units already amber (0..1)
export const copyProgress = (t) => visF(t);

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// local lights for the look (world space, ≤ 6)
export function dcLights(t) {
  const L = [];
  const amber = '#ffb547';
  // 安's racks: a warm pool that breathes, and draws a breath just before it moves
  const gather = smooth((t - (CS - 0.55)) / 0.5) * (1 - smooth((t - CS - 0.1) / 0.4));
  L.push({ pos: [-0.75, OY + 1.25, rackZ(5)], r: 4.6, color: amber, i: 0.2 + 0.04 * Math.sin(t * 2.4) + 0.18 * gather });
  // the head of the stream
  const fs = frontS(t);
  if (fs >= 0) {
    const p = pointAt(TRUNK, fs);
    const k = smooth((t - T_FRONT0) / 0.15) * (1 - smooth((t - T_FRONT1) / 0.6));
    if (k > 0) L.push({ pos: [p[0] * 0.8, OY + p[1] + 0.15, p[2]], r: 2.6, color: '#ffc874', i: 0.95 * k });
  }
  // 安-2's racks: the warm pool grows down the row as they flip
  const pr = copyProgress(t);
  if (pr > 0) {
    let zc = 0, w = 0;
    for (let kk = AN2.k0; kk <= AN2.k1; kk++) { const r = rackRank(kk); const x = Math.min(1, Math.max(0, (pr - r.base) / r.span)); zc += rackZ(kk) * x; w += x; }
    zc /= Math.max(w, 1e-6);
    const settle = t > CD ? 0.35 * Math.exp(-(t - CD) * 3) * (1 - Math.exp(-(t - CD) * 30)) : 0;
    L.push({ pos: [0.55, OY + 1.2, zc], r: 3.2 + 3.4 * pr, color: amber, i: (0.45 + settle) * smooth(pr * 1.6) });
  }
  // the cold light at the end of the aisle (beyond the containment doors)
  L.push({ pos: [0, OY + 1.7, ZEND - 1.6], r: 7.5, color: '#8fd3ff', i: 0.42 });
  return L;
}
