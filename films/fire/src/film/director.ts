// The whole film as one function of time: film seconds -> the WebGL world state plus the 2D type layer.
// Times are film bars F(b) (1 bar = 2.150 s). Story and on-screen text: SCRIPT.md.
import sim from "../data/sim.json";
import { Cam, lerpCam } from "../world/camera";
import { Block, Flyer, Label, Pile, WorldState } from "../world/engine";
import { BH, brickAt, SY } from "../world/piles";
import { clamp01, EI, EIO, EO, ESO, F, hash, lerp, LIN, ramp, track, tween, win } from "../timing";

type Path = { p: number[]; fail: number | null };
const P30 = sim.p30 as unknown as Record<string, Path>;
const P50A = sim.p50_300 as unknown as Record<string, Path>;
const P50B = sim.p50_400 as unknown as Record<string, Path>;
const SEQ = sim.seq1966;
const LANES = sim.lanes as Record<"half" | "third" | "tenth", number[]>;

export type Text = { t0: number; t1: number; text: string; x: number; y: number; size: number; align?: "left" | "center" | "right"; serif?: boolean; weight?: number; color?: string; maxW?: number; sub?: boolean };
export type Num = { t0: number; t1: number; value: number; x: number; y: number; size: number; prefix?: string; suffix?: string; align?: "left" | "center" | "right"; color?: string; label?: string; labelSize?: number; live?: boolean; plain?: boolean };
export type Tag = { t0: number; t1: number; text: string; at: [number, number, number]; dx?: number; dy?: number; size?: number; color?: string; small?: string; chip?: boolean };
export type Shot = { world: WorldState; texts: Text[]; nums: Num[]; tags: Tag[]; dark?: number; card?: number; sources?: number; scrim?: number; veil?: number };

// ---------------------------------------------------------------- places
const HERO: [number, number] = [0, 0];
const GZ = -112; // centre of the decade grid
const ORD: [number, number] = [150, 0]; // the 1966 replay
const slot = (s: number): [number, number] => {
  const c = s % 10;
  const r = Math.floor(s / 10) - 192; // 1920s = 0 .. 1990s = 7
  return [(c - 4.5) * 11.5, GZ + (r - 3.5) * 13.5];
};
const topOf = (n: number) => Math.ceil(n / 18) * SY;

// interpolate a yearly path at a fractional age
const at = (p: number[], age: number) => {
  if (age <= 0) return p[0];
  const i = Math.floor(age);
  if (i >= p.length - 1) return p[p.length - 1];
  return lerp(p[i], p[i + 1], age - i);
};

// ---------------------------------------------------------------- camera
type CK = [number, Cam, ((x: number) => number)?];
const C = (x: number, y: number, z: number, dist: number, yaw: number, pitch: number, fov = 35): Cam => ({ x, y, z, dist, yaw, pitch, fov });
// Aim so that world point (px, py, pz) sits offX px right of the screen centre (and offY px below it).
const A = (px: number, py: number, pz: number, dist: number, yaw: number, pitch: number, offX = 0, offY = 0, fov = 35): Cam => {
  const vh = 2 * dist * Math.tan(((fov / 2) * Math.PI) / 180);
  const vw = (vh * 1920) / 1080;
  const ox = (offX / 1920) * vw;
  const oy = (offY / 1080) * vh;
  const yw = (yaw * Math.PI) / 180;
  const pt = (pitch * Math.PI) / 180;
  const rx = Math.cos(yw);
  const rz = Math.sin(yw);
  // camera up vector (perpendicular to the view direction)
  const ux = Math.sin(yw) * Math.sin(pt);
  const uy = Math.cos(pt);
  const uz = -Math.cos(yw) * Math.sin(pt);
  return { x: px - rx * ox + ux * oy, y: py + uy * oy, z: pz - rz * ox + uz * oy, dist, yaw, pitch, fov };
};
const top400 = brickAt(399);
const CAM: CK[] = [
  [0, A(0, 6.0, 0, 30, -24, 6, -400)],
  [F(1), A(0, 5.6, 0, 33, -30, 8, -430), ESO],
  [F(2.9), A(0, 5.2, 0, 38, -36, 10, -460), ESO],
  [F(3.4), A(0, 6, 0, 60, -32, 12, 0), EO],
  [F(4), A(0, 6, 0, 60, -30, 12, 0)],
  [F(4.6), A(top400.x, 11.9, top400.z, 4.4, -38, 38, 0, 40), EIO],
  [F(5.4), A(top400.x, 11.9, top400.z, 4.8, -34, 40, 0, 40)],
  [F(6.0), A(0, 7.5, 0, 31, -26, 12, 330), EIO],
  [F(7.2), A(0, 8.5, 0, 37, -24, 10, 340)],
  [F(8.0), A(0, 11, 0, 46, -22, 8, 360), EIO],
  [F(9.6), A(0, 15, 0, 64, -20, 6, 360), EIO],
  [F(11.0), A(0, 15, 0, 66, -22, 8, 360)],
  [F(12.0), A(0, 5.5, 0, 34, -26, 10, 340), EIO],
  [F(15.6), A(0, 5.5, 0, 38, -32, 12, 340), LIN],
  // to the decade grid: rise and turn
  [F(17.0), C(36, 5, GZ - 47, 46, -20, 22), EIO],
  [F(18.6), C(30, 5, GZ - 47, 52, -14, 26), ESO],
  [F(20.2), C(8, 4, GZ - 30, 92, -6, 34), EIO],
  [F(25.5), C(0, 4, GZ + 30, 96, 0, 36), LIN],
  [F(27.0), A(0, 0, GZ + 2, 205, 0, 76, 0, 40), EIO],
  [F(29.8), A(0, 0, GZ + 2, 195, 0, 75, 0, 40), LIN],
  [F(31.5), C(0, 2, GZ + 26, 120, 0, 46), ESO],
  // to the 1966 replay
  [F(33.0), A(ORD[0], 5, ORD[1], 34, -18, 10, 300), EIO],
  [F(37.0), A(ORD[0], 5, ORD[1], 30, -12, 9, 300), LIN],
  [F(38.2), C(ORD[0], 5, ORD[1], 42, -4, 10), EIO],
  [F(40.0), C(ORD[0], 7, ORD[1], 46, -2, 10), EIO],
  [F(41.6), C(ORD[0], 11, ORD[1], 60, 2, 10), EIO],
  [F(43.6), C(ORD[0], 7.5, ORD[1], 46, 4, 10), EIO],
  [F(47.5), C(ORD[0], 6, ORD[1], 42, 0, 9), LIN],
  // back to the grid for 50 years
  [F(49.0), A(0, 0, GZ - 7, 180, 0, 66, 0, 40), EIO],
  [F(55.0), A(0, 0, GZ - 7, 172, 0, 65, 0, 40), LIN],
  // home: the hero pile
  [F(56.4), A(0, 5.5, 0, 34, -26, 9, -330), EIO],
  [F(63.5), A(0, 5.5, 0, 38, -32, 10, -330), LIN],
  [F(64.0), A(0, 6.5, 0, 36, -28, 10, 0), EIO],
  [F(68.0), A(0, 6.5, 0, 40, -22, 10, 0), LIN],
  [F(69.0), A(17.5, 5, 0, 38, -16, 10, 300), EIO],
  [F(71.6), A(17.5, 5, 0, 42, -10, 11, 300), LIN],
  // three savers
  [F(72.6), C(0, 6, 0, 52, 0, 16), EIO],
  [F(79.6), C(0, 6, 0, 55, 0, 16), LIN],
  // everyone: crane up over a sea of piles
  [F(81.5), C(0, 6, 0, 150, -18, 30), EIO],
  [F(85.5), C(0, 6, 0, 210, -24, 36), LIN],
  // back to the one pile
  [F(87.0), C(0, 6.5, 0, 34, -26, 9), EIO],
  [F(92.6), C(0, 6.5, 0, 40, -34, 11), LIN],
  // the days
  [F(94.6), C(0, 2, -40, 120, 0, 24), EIO],
  [F(95.8), C(0, 2, -44, 110, 0, 20), LIN],
  [F(96.9), C(0, 1.0, -2, 22, 0, 12), EIO],
  [F(100.5), C(0, 1.0, -2, 20, 0, 11), LIN],
];
const camAt = (t: number): Cam => {
  if (t <= CAM[0][0]) return CAM[0][1];
  for (let i = 1; i < CAM.length; i++) {
    const [t1, c1, e] = CAM[i];
    const [t0, c0] = CAM[i - 1];
    if (t <= t1) return lerpCam(c0, c1, (e ?? EIO)(clamp01((t - t0) / (t1 - t0))));
  }
  return CAM[CAM.length - 1][1];
};

// ---------------------------------------------------------------- helpers
// bricks leaving a pile in a burst (the 960 -> 300 deflate)
const burst = (from: number, to: number, x0: number, z0: number, t: number, t0: number, dur: number): Flyer[] => {
  const out: Flyer[] = [];
  for (let i = to; i < from; i++) {
    const b = brickAt(i);
    const st = t0 + ((from - 1 - i) / (from - to)) * dur * 0.55;
    const k = clamp01((t - st) / (dur * 0.5));
    if (k <= 0 || k >= 1) continue;
    const a = hash(i * 1.7) * Math.PI * 2;
    const sp = 18 + hash(i * 3.1) * 30;
    const e = 1 - (1 - k) * (1 - k);
    out.push({ p: [x0 + b.x + Math.cos(a) * sp * e, b.y + e * (6 + hash(i) * 10) - k * k * 4, z0 + b.z + Math.sin(a) * sp * e], r: [k * 3 * hash(i * 2), b.yaw + k * 4 * (hash(i * 5) - 0.5), k * 2], s: 1 - k * k });
  }
  return out;
};

// a small house built from bricks (Sam's)
const HOUSE: { x: number; y: number; z: number; yaw: number }[] = (() => {
  const out: { x: number; y: number; z: number; yaw: number }[] = [];
  for (let L = 0; L < 4; L++) {
    const y = L * SY + BH / 2;
    for (let c = 0; c < 4; c++) {
      out.push({ x: (c - 1.5) * 1.6, y, z: -1.9, yaw: 0 });
      out.push({ x: (c - 1.5) * 1.6, y, z: 1.9, yaw: 0 });
    }
    for (let r = 0; r < 2; r++) {
      out.push({ x: -3.0, y, z: (r - 0.5) * 1.6, yaw: Math.PI / 2 });
      out.push({ x: 3.0, y, z: (r - 0.5) * 1.6, yaw: Math.PI / 2 });
    }
  }
  for (let L = 0; L < 4; L++) {
    const y = (4 + L) * SY + BH / 2;
    const zz = 1.9 - L * 0.62;
    for (let c = 0; c < 4; c++) {
      out.push({ x: (c - 1.5) * 1.6, y, z: zz, yaw: 0 });
      out.push({ x: (c - 1.5) * 1.6, y, z: -zz, yaw: 0 });
    }
  }
  return out;
})();

// the sea of everyone's piles (far blocks)
const SEA: { x: number; z: number; h: number; d: number }[] = (() => {
  const out: { x: number; z: number; h: number; d: number }[] = [];
  for (let gx = -40; gx <= 40; gx++) {
    for (let gz = -40; gz <= 20; gz++) {
      const x = gx * 7.5 + (hash(gx * 31 + gz) - 0.5) * 3;
      const z = gz * 7.5 + (hash(gx + gz * 17) - 0.5) * 3;
      const d = Math.hypot(x, z);
      if (d < 14 || d > 320) continue;
      if (hash(gx * 7 + gz * 13) < 0.25) continue;
      out.push({ x, z, h: 3 + hash(gx * 3 + gz * 5) * 9, d });
    }
  }
  return out;
})();

const sinceYear = (Y: number, s: number) => Y - s;

// one decade-grid pile at calendar year Y
const gridPile = (s: number, Y: number, path: Path, opts: { dim?: number; build?: number } = {}): Pile | null => {
  const age = sinceYear(Y, s);
  const [x, z] = slot(s);
  if (age < 0) return null;
  const build = clamp01(age / 0.45);
  if (build < 1) return { x, z, n: path.p[0] * build, rain: 30, seed: s, dim: opts.dim };
  const f = path.fail;
  if (f !== null && age >= f - 1) {
    const last = path.p[f - 1];
    const ashK = clamp01(age - (f - 1));
    const fall = clamp01((age - f) / 0.7);
    return { x, z, n: Math.max(last, 6), ash: ashK, fall, seed: s, dim: opts.dim };
  }
  return { x, z, n: at(path.p, Math.min(age, path.p.length - 1)), seed: s, dim: opts.dim };
};

const yearLabels = (y0: number, y1: number, Y: number, alpha: number, red: (s: number) => number): Label[] => {
  const out: Label[] = [];
  for (let s = y0; s <= y1; s++) {
    const [x, z] = slot(s);
    const on = clamp01((Y - s + 0.6) / 0.6);
    const r = red(s);
    out.push({ text: String(s), x, z: z + 4.3, size: 1.9, color: r > 0.5 ? "#e0483c" : "#cfc6b6", alpha: alpha * (0.3 + 0.7 * on), weight: 700 });
    if (r > 0) out.push({ text: "×", x, z: z + 0.3, size: 7, color: "#e0483c", alpha: alpha * r * 0.9, weight: 300, y: 0.05 });
  }
  return out;
};

// ---------------------------------------------------------------- the film
export const shot = (t: number): Shot => {
  const cam = camAt(t);
  const piles: Pile[] = [];
  const flyers: Flyer[] = [];
  const labels: Label[] = [];
  let blocks: Block[] = [];
  let lights: WorldState["lights"];
  let band: WorldState["band"];
  let focus: [number, number, number] = [0, 0, 26];
  let floorGlow = 0;
  let exposure = 1;
  let fog = 0.0045;
  let bloom = 0.35;

  // ---- S1–S3: the hero pile (0 .. F16.6)
  if (t < F(17.2)) {
    let n = 400;
    let rain = 0;
    let dim = 0;
    let glow = 0;
    const lift: Pile["lift"] = [];
    if (t < F(0.4)) {
      n = lerp(318, 400, ramp(t, 0, F(0.32), EO));
      rain = 46;
    }
    // the two small bricks: one month of interest, one month of a city income
    const sb = (k: number, x: number, z: number, t0: number) => {
      const u = ramp(t, t0, t0 + 0.55, EO);
      if (u <= 0) return;
      flyers.push({ p: [lerp(top400.x, x, u), lerp(12.2, (BH / 2) * 0.75, u) + Math.sin(u * Math.PI) * 4, lerp(top400.z, z, u)], r: [0, lerp(0, -0.5 + k * 0.08, u), 0], s: 0.75, glow: 0.15 });
    };
    if (t < F(4.2)) {
      sb(0, 12.5, -6, F(1.15));
      sb(1, 18, -10, F(2.1));
    }
    dim = tween(t, F(3.0), F(3.3), 0, 0.82, EIO) * (1 - ramp(t, F(3.9), F(4.3)));
    // S2: the strap flips from 1万 to 1个月; bricks leave one a month
    if (t >= F(4) && t < F(7.6)) {
      const flip = ramp(t, F(4.75), F(5.1), EIO);
      band = { pile: 0, text: flip < 0.5 ? "1万" : "1个月", vis: win(t, F(4.2), F(6.4), 0.4), flip };
    }
    const leave = [F(6.0), F(6.5), F(7.0)];
    let gone = 0;
    leave.forEach((tl) => {
      if (t >= tl + 0.9) gone++;
      else if (t >= tl) lift.push({ k: 0, t: (t - tl) / 0.9, to: [-14, 18, 10], spin: 1.6 });
    });
    // with a lift in flight the pile still owns that brick
    n = Math.min(n, 400) - gone;
    // grow to 600 months, then to 960
    if (t >= F(7.3)) {
      n = lerp(397, 600, ramp(t, F(7.3), F(7.9), ESO));
      rain = 30;
    }
    if (t >= F(8.4)) {
      n = lerp(600, 960, ramp(t, F(8.4), F(9.4), ESO));
      rain = 40;
    }
    // deflate to 300: the top 660 bricks burst away, top first
    if (t >= F(11.2)) {
      const D = F(1.3) * 0.55;
      n = 960 - Math.floor(clamp01((t - F(11.2)) / D) * 660);
      rain = 0;
      flyers.push(...burst(960, 300, HERO[0], HERO[1], t, F(11.2), F(1.3)));
    }
    // spend a little, grow a little
    if (t >= F(13.0)) {
      const sp = [F(13.0), F(13.5)];
      let used = 0;
      sp.forEach((tl) => {
        if (t >= tl + 0.8) used++;
        else if (t >= tl) lift.push({ k: 0, t: (t - tl) / 0.8, to: [-12, 14, 8] });
      });
      const grow = ramp(t, F(14.0), F(14.9), ESO);
      n = 300 - used + grow * 34;
      glow = 0.2 * Math.sin(Math.PI * clamp01((t - F(14.0)) / F(1.0)));
      rain = grow > 0 && grow < 1 ? 8 : 0;
    }
    // a crash: the top bricks break off at once
    if (t >= F(15.0)) {
      n = Math.min(n, 270);
      for (let i = 270; i < 332; i++) {
        const b = brickAt(i);
        const u = clamp01((t - F(15.0) - hash(i) * 0.12) / 0.8);
        if (u >= 1) continue;
        const a = hash(i * 1.3) * Math.PI * 2;
        const e = 1 - (1 - u) * (1 - u);
        flyers.push({ p: [b.x + Math.cos(a) * e * 7, b.y + Math.sin(u * Math.PI) * 1.2 - (b.y - BH / 2) * u * u, b.z + Math.sin(a) * e * 7], r: [e * 1.5 * hash(i), b.yaw + e * (hash(i * 7) - 0.5) * 2, e * 0.6], ash: clamp01(u * 1.5), s: 1 });
      }
    }
    piles.push({ x: HERO[0], z: HERO[1], n, rain, dim, glow, lift, seed: 1 });
    focus = [0, 0, 22];
    floorGlow = 0.6;
  }

  // ---- S4: the decade grid, 30 years from every start 1928–1996 (F16.6 .. F32)
  if (t >= F(17.0) && t < F(32.6)) {
    const Y = track(t, [
      [F(17.0), 1928],
      [F(18.4), 1929.2],
      [F(25.6), 2026],
    ], LIN);
    const sixties = ramp(t, F(26.2), F(26.8));
    const out = ramp(t, F(31.6), F(32.4));
    for (let s = 1928; s <= 1996; s++) {
      const fail = P30[s].fail !== null;
      const dim = fail ? 0 : sixties * 0.75;
      const p = gridPile(s, Y, P30[s], { dim });
      if (!p) continue;
      if (out > 0) p.n *= 1 - out;
      piles.push(p);
    }
    labels.push(...yearLabels(1928, 1996, Y, 1 - out, (s) => (P30[s].fail !== null ? clamp01((Y - s - P30[s].fail! - 0.4) / 0.6) : 0)));
    focus = [0, GZ, 70];
    fog = 0.0030;
    exposure = 0.9;
  }

  // ---- S5: 1966, forward and reversed (F32 .. F48)
  if (t >= F(32.2) && t < F(48.8)) {
    const [ox, oz] = ORD;
    const yrs = (t0: number, t1: number) => tween(t, t0, t1, 0, 30, LIN);
    const crumble = (p: number[], fail: number | null, age: number) => {
      if (fail !== null && age >= fail - 1) {
        const last = p[fail - 1];
        return { n: Math.max(last, 6), ash: clamp01(age - (fail - 1)), fall: clamp01((age - fail) / 0.7) };
      }
      return { n: at(p, age) };
    };
    const enter = ramp(t, F(32.2), F(32.7), EO);
    const leave = ramp(t, F(47.6), F(48.6));
    if (t < F(37.6)) {
      const age = t < F(35.0) ? 0 : yrs(F(35.0), F(37.0));
      const c = crumble(SEQ.fwd, SEQ.fwdFail, age);
      piles.push({ x: ox, z: oz, n: c.n * enter, ash: c.ash, fall: c.fall, seed: 66, rain: enter < 1 ? 30 : 0 });
    } else {
      const reb = ramp(t, F(37.6), F(38.3), ESO);
      const age = t < F(40.0) ? 0 : yrs(F(40.0), F(43.0));
      const a = crumble(SEQ.fwd, SEQ.fwdFail, age);
      const b = crumble(SEQ.rev, SEQ.revFail, age);
      piles.push({ x: ox - 6, z: oz, n: (age > 0 ? a.n : 300 * reb) * (1 - leave), ash: a.ash, fall: a.fall, seed: 67, rain: reb < 1 ? 30 : 0 });
      piles.push({ x: ox + 6, z: oz, n: (age > 0 ? b.n : 300 * reb) * (1 - leave), seed: 68, rain: reb < 1 ? 30 : 4, glow: age >= 29 ? 0.1 * ramp(t, F(43.0), F(43.6)) : 0 });
      labels.push({ text: "按真实顺序", x: ox - 6, z: oz + 4.4, size: 1.0, alpha: reb * (1 - leave), weight: 600 });
      labels.push({ text: "倒过来", x: ox + 6, z: oz + 4.4, size: 1.0, alpha: reb * (1 - leave), weight: 600 });
    }
    labels.push({ text: "1966", x: ox - (t >= F(37.6) ? 6 : 0), z: oz + 5.8, size: 1.3, alpha: enter * (1 - leave) * (t >= F(37.6) ? 0 : 1), weight: 700, color: "#cfc6b6" });
    focus = [ox, oz, 24];
    floorGlow = 0.5;
  }

  // ---- S6: 50 years, 300 vs 400 bricks (F48 .. F56)
  if (t >= F(48.2) && t < F(56.6)) {
    const runA = track(t, [
      [F(49.2), 1928],
      [F(52.0), 2026],
    ], LIN);
    const runB = track(t, [
      [F(53.0), 1928],
      [F(54.8), 2026],
    ], LIN);
    const second = t >= F(52.6);
    const reset = ramp(t, F(52.4), F(52.9), ESO);
    const out = ramp(t, F(55.8), F(56.5));
    const enter = ramp(t, F(48.2), F(49.0), EO);
    for (let s = 1928; s <= 1976; s++) {
      const path = second ? P50B[s] : P50A[s];
      const Y = second ? runB : runA;
      let p = gridPile(s, Math.max(Y, s + 0.5), path);
      if (!p) continue;
      if (!second && t < F(49.2)) p = { ...p, n: path.p[0] * enter, ash: 0, fall: 0 };
      if (second && t < F(53.0)) p = { ...p, n: path.p[0] * reset, ash: 0, fall: 0, rain: 30 };
      if (second && Y >= s + 50) p.glow = 0.06 * ramp(t, F(54.8), F(55.4));
      p.n *= 1 - out;
      piles.push(p);
    }
    const Y = second ? runB : runA;
    labels.push(...yearLabels(1928, 1976, Math.max(Y, 1977), enter * (1 - out), (s) => (!second && P50A[s].fail !== null ? clamp01((runA - s - P50A[s].fail! - 0.4) / 0.6) : 0)));
    focus = [0, GZ, 70];
    fog = 0.0030;
    exposure = 0.9;
  }

  // ---- S7–S8: your number; the brick grows; Sam (F56 .. F72)
  if (t >= F(55.9) && t < F(72.8)) {
    const enter = ramp(t, F(55.9), F(56.6), ESO);
    // brick size follows the monthly spend (volume ∝ money)
    const spend = track(t, [
      [F(56.4), 3000],
      [F(57.6), 5000],
      [F(59.0), 10000],
      [F(61.0), 2456],
      [F(64.0), 2456],
      [F(64.8), 3100],
      [F(65.3), 3700],
      [F(65.8), 4400],
      [F(66.3), 5000],
      [F(66.8), 5600],
    ], EO);
    const scale = Math.cbrt(spend / 7000);
    const leave = ramp(t, F(72.0), F(72.7));
    piles.push({ x: 0, z: 0, n: 400 * enter * (1 - leave), scale, rain: enter < 1 ? 40 : 0, seed: 2, dim: tween(t, F(68.4), F(69.2), 0, 0.6) });
    // Sam: a pile that becomes a house
    if (t >= F(68.4)) {
      const se = ramp(t, F(68.4), F(69.0), EO);
      const build = ramp(t, F(70.0), F(71.0), EIO);
      const used = Math.floor(build * HOUSE.length);
      const samN = 300 - used;
      piles.push({ x: 13, z: 0, n: samN * se * (1 - leave), rain: se < 1 ? 30 : 0, seed: 3 });
      for (let i = 0; i < HOUSE.length; i++) {
        const st = F(70.0) + (i / HOUSE.length) * F(0.8);
        const u = clamp01((t - st) / 0.45);
        if (u <= 0) continue;
        const from = brickAt(Math.max(0, 299 - i));
        const h = HOUSE[i];
        const e = u * u * (3 - 2 * u);
        flyers.push({ p: [lerp(13 + from.x, 22 + h.x, e), lerp(from.y, h.y, e) + Math.sin(u * Math.PI) * 4, lerp(from.z, h.z, e)], r: [0, lerp(from.yaw, h.yaw, e), 0], s: 1 - leave });
      }
      focus = [16, 0, 24];
    } else focus = [0, 0, 24];
    floorGlow = 0.6;
  }

  // ---- S9: three savers (F72 .. F80)
  if (t >= F(72.2) && t < F(81.0)) {
    const yr = tween(t, F(73.6), F(76.4), 0, 66, LIN);
    const enter = ramp(t, F(72.2), F(73.0), EO);
    const fade = ramp(t, F(80.2), F(81.0));
    const lanes: [keyof typeof LANES, number, string][] = [
      ["half", -12, "存一半"],
      ["third", 0, "存三成"],
      ["tenth", 12, "存一成"],
    ];
    lanes.forEach(([k, x, name]) => {
      const L = LANES[k];
      const n = Math.min(400, at(L, yr));
      const done = yr >= L.length - 1;
      piles.push({ x, z: 0, n: n * (1 - fade), seed: 10 + x, glow: done ? 0.1 * (1 - fade) : 0, rain: n > 0 && !done ? 6 : 0 });
      labels.push({ text: name, x, z: 4.6, size: 1.25, alpha: enter * (1 - fade), weight: 700 });
    });
    focus = [0, 0, 30];
    floorGlow = 0.4;
  }

  // ---- S10: everyone (F80 .. F86)
  if (t >= F(79.6) && t < F(87.6)) {
    const rise = (d: number) => ramp(t, F(80.0) + d / 320 * F(1.4), F(80.6) + d / 320 * F(1.4), EO);
    const g1 = ramp(t, F(81.5), F(82.4), ESO);
    const g2 = ramp(t, F(83.0), F(83.9), ESO);
    const sink = ramp(t, F(86.0), F(87.2), EI);
    blocks = SEA.map((b) => ({ x: b.x, z: b.z, h: b.h * (1 + 0.45 * g1 + 0.35 * g2), vis: rise(b.d) * (1 - sink) })).filter((b) => (b.vis ?? 1) > 0.03);
    piles.push({ x: 0, z: 0, n: 400 * ramp(t, F(80.2), F(81.0), ESO), seed: 4, glow: 0.05, scale: 1 + 0.1 * g1 + 0.08 * g2 });
    focus = [0, 0, 90];
    fog = 0.0042;
    exposure = 0.85;
  }

  // ---- S11: back to one pile; then the days (F86 ..)
  if (t >= F(86.6)) {
    const dissolve = ramp(t, F(93.0), F(94.0), EIO);
    const n = 400 * (1 - dissolve);
    if (n > 0.5) piles.push({ x: 0, z: 0, n, seed: 4, glow: 0.04 + 0.4 * dissolve });
    if (t >= F(93.0)) lights = { vis: ramp(t, F(93.0), F(93.6)) * (1 - ramp(t, F(99.0), F(99.6))), t: tween(t, F(93.0), F(96.2), 0, 1.4, LIN), origin: [0, 12, 0] };
    // the last brick
    if (t >= F(96.3)) {
      const u = ramp(t, F(96.3), F(96.7), EI);
      flyers.push({ p: [0, lerp(14, BH / 2, u), 0], r: [0, 0.35, 0], s: 1, glow: 0.12 });
    }
    focus = [0, -10, 40];
    floorGlow = 0.5 + 0.4 * ramp(t, F(93.0), F(95.0));
    bloom = 0.35 + 0.25 * ramp(t, F(93.0), F(94.0));
  }

  // ------------------------------------------------------------ type
  const W = 1920;
  const T: Text[] = [
    // S1
    { t0: 0.25, t1: F(1.05), text: "存了400万，", x: 1010, y: 300, size: 76, align: "left", serif: true },
    { t0: 0.75, t1: F(1.05), text: "能不上班吗？", x: 1010, y: 400, size: 76, align: "left", serif: true },
    { t0: F(1.1), t1: F(2.95), text: "存进银行，三年定期，利率1.25%：", x: 1010, y: 300, size: 50, align: "left", serif: true },
    { t0: F(2.05), t1: F(2.95), text: "还不到{城里人均}一个月的收入。", x: 1010, y: 380, size: 50, align: "left", serif: true, maxW: 840 },
    { t0: F(3.05), t1: F(4.0), text: "不上班，", x: W / 2, y: 470, size: 112, serif: true },
    { t0: F(3.3), t1: F(4.0), text: "到底要攒多少钱？", x: W / 2, y: 610, size: 112, serif: true, color: "#ffd166" },
    // S2
    { t0: F(4.2), t1: F(5.6), text: "先换个单位：", x: 140, y: 250, size: 58, align: "left", serif: true },
    { t0: F(4.8), t1: F(5.9), text: "一块砖，就是{你一个月的花销}。", x: 140, y: 340, size: 58, align: "left", serif: true },
    { t0: F(5.95), t1: F(7.25), text: "不上班，就是从此每个月，", x: 140, y: 250, size: 54, align: "left", serif: true },
    { t0: F(6.2), t1: F(7.25), text: "从堆里拿走一块。", x: 140, y: 330, size: 54, align: "left", serif: true },
    { t0: F(7.3), t1: F(8.3), text: "35岁停下，按活到85岁算：", x: 140, y: 250, size: 54, align: "left", serif: true },
    // S3
    { t0: F(8.35), t1: F(10.95), text: "只吃利息、不动本金，要攒多少块？", x: 140, y: 230, size: 52, align: "left", serif: true },
    { t0: F(10.3), t1: F(10.95), text: "几乎没人攒得到。", x: 140, y: 880, size: 52, align: "left", serif: true, color: "#cfc6b6" },
    { t0: F(11.0), t1: F(12.9), text: "1994年，美国理财师本根算过：", x: 140, y: 230, size: 52, align: "left", serif: true },
    { t0: F(11.4), t1: F(12.9), text: "本金也慢慢花，没花的放进股票和债券——", x: 140, y: 310, size: 46, align: "left", serif: true },
    { t0: F(13.0), t1: F(14.9), text: "每月拿走一块，", x: 140, y: 230, size: 52, align: "left", serif: true },
    { t0: F(13.9), t1: F(14.9), text: "剩下的砖，{自己会长}。", x: 140, y: 310, size: 52, align: "left", serif: true },
    { t0: F(15.0), t1: F(16.4), text: "可股市会大跌。", x: 140, y: 230, size: 52, align: "left", serif: true },
    { t0: F(15.5), t1: F(16.4), text: "300块，{真的够吗}？", x: 140, y: 310, size: 52, align: "left", serif: true },
    // S4
    { t0: F(16.5), t1: F(18.3), text: "他把美国的历史重演了一遍。我们也重演一遍：", x: W / 2, y: 150, size: 48, serif: true },
    { t0: F(18.4), t1: F(21.4), text: "1928到1996年，每年都有一个人带着300块砖退休，", x: W / 2, y: 150, size: 44, serif: true },
    { t0: F(18.9), t1: F(21.4), text: "剩下的砖，跟着美国股票和债券真实地涨跌。", x: W / 2, y: 214, size: 44, serif: true },
    { t0: F(26.3), t1: F(27.9), text: "撑过30年的：64个。", x: W / 2, y: 150, size: 54, serif: true },
    { t0: F(26.9), t1: F(27.9), text: "倒下的5个，全在{1964到1969年}退休。", x: W / 2, y: 230, size: 54, serif: true },
    { t0: F(28.0), t1: F(29.9), text: "300个月，是25年的花销；每年取1/25，就是4%：", x: W / 2, y: 150, size: 48, serif: true },
    { t0: F(28.5), t1: F(29.9), text: "这就是有名的{“4%法则”}。", x: W / 2, y: 230, size: 54, serif: true },
    { t0: F(30.0), t1: F(32.0), text: "倒下的那5个，输在哪？", x: W / 2, y: 190, size: 64, serif: true },
    // S5
    { t0: F(32.7), t1: F(34.9), text: "1966年退休的人。", x: 140, y: 230, size: 56, align: "left", serif: true },
    { t0: F(33.5), t1: F(34.9), text: "接下来30年，股票和债券扣除通胀后，", x: 140, y: 320, size: 46, align: "left", serif: true },
    { t0: F(33.9), t1: F(34.9), text: "平均每年还涨3.8%。", x: 140, y: 384, size: 46, align: "left", serif: true },
    { t0: F(35.6), t1: F(37.5), text: "他的砖，{第25年}就拿光了。", x: 140, y: 230, size: 56, align: "left", serif: true },
    { t0: F(37.7), t1: F(39.9), text: "把同样这30年的涨跌，", x: W / 2, y: 170, size: 56, serif: true },
    { t0: F(38.4), t1: F(39.9), text: "顺序倒过来——", x: W / 2, y: 250, size: 56, serif: true },
    { t0: F(40.0), t1: F(42.9), text: "输在{顺序}。", x: W / 2, y: 200, size: 110, serif: true },
    { t0: F(43.0), t1: F(45.9), text: "刚退休就碰上大跌：砖少了，还得照样拿。", x: W / 2, y: 170, size: 48, serif: true },
    { t0: F(44.4), t1: F(45.9), text: "等行情回来，剩下的已经不多了。", x: W / 2, y: 240, size: 48, serif: true },
    { t0: F(46.0), t1: F(47.9), text: "最危险的，是刚退休的{头几年}。", x: W / 2, y: 200, size: 66, serif: true },
    // S6
    { t0: F(48.3), t1: F(49.9), text: "可你35岁就停下，要撑{50年}。", x: W / 2, y: 150, size: 56, serif: true },
    { t0: F(48.7), t1: F(49.9), text: "1928到1976年，每年一个人，各撑50年", x: W / 2, y: 222, size: 32, serif: false, weight: 500, color: "rgba(241,236,223,0.75)" },
    { t0: F(50.0), t1: F(52.4), text: "300块：49个人里，只有28个撑到最后。", x: W / 2, y: 150, size: 52, serif: true },
    { t0: F(53.0), t1: F(55.3), text: "400块：{49个，全部撑住}。", x: W / 2, y: 150, size: 52, serif: true },
    { t0: F(54.3), t1: F(55.3), text: "这还是美国。17个国家的百年历史里，多数国家最坏的年份连4%都撑不住。", x: W / 2, y: 222, size: 34, serif: false, weight: 500, color: "rgba(241,236,223,0.8)" },
    { t0: F(55.35), t1: F(56.3), text: "每月花销 × 400", x: W / 2, y: 540, size: 128, serif: false, weight: 800, color: "#ffd166" },
    // S7
    { t0: F(59.2), t1: F(60.9), text: "开头那400万：吃利息不够；按这个算法，{够一个月花1万}。", x: W / 2, y: 940, size: 44, serif: true },
    { t0: F(62.6), t1: F(63.9), text: "比很多人想的少。可这堆砖，会变大。", x: W / 2, y: 940, size: 46, serif: true },
    // S8
    { t0: F(67.0), t1: F(68.4), text: "每月多花1,000，就要多攒{40万}。", x: W / 2, y: 940, size: 54, serif: true },
    { t0: F(68.6), t1: F(71.9), text: "萨姆·多根，34岁带着300万美元退休。", x: 140, y: 200, size: 48, align: "left", serif: true },
    { t0: F(70.0), t1: F(71.9), text: "后来有了两个孩子，又全款买了房。", x: 140, y: 270, size: 48, align: "left", serif: true },
    { t0: F(71.0), t1: F(71.9), text: "退休11年后，{他回去上班了}。", x: 140, y: 340, size: 48, align: "left", serif: true },
    // S9
    { t0: F(72.4), t1: F(76.9), text: "那要攒多久？看你每个月{存下几成工资}。", x: W / 2, y: 150, size: 52, serif: true },
    { t0: F(77.0), t1: F(79.9), text: "哪天能停下，看的是{存下几成}。", x: W / 2, y: 150, size: 56, serif: true },
    { t0: F(77.5), t1: F(79.9), text: "按扣除通胀后每年赚4%、从零开始攒算", x: W / 2, y: 218, size: 28, serif: false, weight: 500, color: "rgba(241,236,223,0.6)" },
    // S10
    { t0: F(80.3), t1: F(81.4), text: "这道题，对每个人都在变难。", x: W / 2, y: 170, size: 58, serif: true },
    { t0: F(81.5), t1: F(82.9), text: "三年定期利率：四年前2.75%，现在1.25%。", x: W / 2, y: 170, size: 52, serif: true },
    { t0: F(83.0), t1: F(84.4), text: "人均预期寿命：79岁，还在变长。", x: W / 2, y: 170, size: 52, serif: true },
    { t0: F(84.5), t1: F(86.2), text: "钱长得越慢，人活得越久，", x: W / 2, y: 150, size: 54, serif: true },
    { t0: F(84.9), t1: F(86.2), text: "{要攒的砖就越多}。", x: W / 2, y: 228, size: 54, serif: true },
    // S11
    { t0: F(86.9), t1: F(87.9), text: "攒够了，就好了吗？", x: W / 2, y: 180, size: 64, serif: true },
    { t0: F(87.9), t1: F(88.9), text: "多根说：“提前退休很好，但也可能很孤独。”", x: W / 2, y: 180, size: 50, serif: true },
    { t0: F(88.9), t1: F(92.9), text: "钱能买回时间。", x: W / 2, y: 150, size: 56, serif: true },
    { t0: F(89.4), t1: F(92.9), text: "可醒来以后做什么，{钱不管}。", x: W / 2, y: 230, size: 56, serif: true },
    { t0: F(93.1), t1: F(95.4), text: "400块砖，撑起50年：{一万八千多个早上}。", x: W / 2, y: 170, size: 60, serif: true },
    { t0: F(96.9), t1: F(98.3), text: "攒齐第400块砖的那天早上，", x: W / 2, y: 210, size: 62, serif: true },
    { t0: F(97.4), t1: F(98.3), text: "你想做什么？", x: W / 2, y: 300, size: 62, serif: true, color: "#ffd166" },
  ];
  const N: Num[] = [
    { t0: F(7.6), t1: F(8.3), value: 600, x: 140, y: 400, size: 120, suffix: "个月", align: "left", color: "#ffd166" },
    { t0: F(9.4), t1: F(10.95), value: 960, x: 140, y: 380, size: 132, suffix: "块", align: "left", color: "#ffd166", label: "960个月 = 80年的花销，才够只靠1.25%的利息过" },
    { t0: F(11.9), t1: F(12.9), value: 300, x: 140, y: 470, size: 150, suffix: "块就够", align: "left", color: "#ffd166" },
    // S7: your number
    { t0: F(56.5), t1: F(57.5), value: 3000, x: 1180, y: 380, size: 54, prefix: "一个月花 ¥", align: "left", color: "#f1ecdf" },
    { t0: F(56.7), t1: F(57.5), value: 120, x: 1180, y: 520, size: 140, suffix: "万", align: "left", color: "#ffd166" },
    { t0: F(57.6), t1: F(58.9), value: 5000, x: 1180, y: 380, size: 54, prefix: "一个月花 ¥", align: "left", color: "#f1ecdf" },
    { t0: F(57.8), t1: F(58.9), value: 200, x: 1180, y: 520, size: 140, suffix: "万", align: "left", color: "#ffd166" },
    { t0: F(59.0), t1: F(60.9), value: 10000, x: 1180, y: 380, size: 54, prefix: "一个月花 ¥", align: "left", color: "#f1ecdf" },
    { t0: F(59.2), t1: F(60.9), value: 400, x: 1180, y: 520, size: 140, suffix: "万", align: "left", color: "#ffd166" },
    { t0: F(61.0), t1: F(63.9), value: 2456, x: 1020, y: 380, size: 54, prefix: "全国人均（城乡老少）一个月花 ¥", align: "left", color: "#f1ecdf" },
    { t0: F(61.2), t1: F(63.9), value: 98, x: 1020, y: 520, size: 140, prefix: "约", suffix: "万", align: "left", color: "#ffd166" },
  ];
  // the 1966 counters and the lanes' years
  if (t >= F(35.0) && t < F(37.5)) N.push({ t0: F(35.0), t1: F(37.5), value: Math.min(25, Math.floor(tween(t, F(35.0), F(37.0), 0, 30, LIN))), x: 1500, y: 300, size: 96, prefix: "第", suffix: "年", align: "left", color: "#f1ecdf", live: true });
  if (t >= F(40.0) && t < F(47.9)) {
    const age = tween(t, F(40.0), F(43.0), 0, 30, LIN);
    const a = Math.max(0, at(SEQ.fwd, Math.min(age, 25)));
    const b = at(SEQ.rev, age);
    N.push({ t0: F(40.0), t1: F(47.9), value: Math.floor(age), x: W / 2, y: 330, size: 54, prefix: "第", suffix: "年", color: "#cfc6b6", live: true });
    N.push({ t0: F(40.2), t1: F(47.9), value: age >= 25 ? 0 : Math.round(a), x: 560, y: 900, size: 72, suffix: "块", color: age >= 25 ? "#e0483c" : "#f1ecdf", label: age >= 25 ? "第25年：拿光" : "按真实顺序", live: true });
    N.push({ t0: F(40.2), t1: F(47.9), value: Math.round(b), x: 1360, y: 900, size: 72, suffix: "块", color: age >= 29.9 ? "#ffd166" : "#f1ecdf", label: age >= 29.9 ? "第30年：还剩436块" : "倒过来", live: true });
  }
  if (t >= F(73.4) && t < F(80.0)) {
    const yr = tween(t, F(73.6), F(76.4), 0, 66, LIN);
    const lanes: [keyof typeof LANES, number][] = [
      ["half", 560],
      ["third", 960],
      ["tenth", 1360],
    ];
    lanes.forEach(([k, x]) => {
      const L = LANES[k];
      const y = Math.min(L.length - 1, Math.floor(yr));
      N.push({ t0: F(73.4), t1: F(80.0), value: y, x, y: 900, size: 76, suffix: "年", color: yr >= L.length - 1 ? "#ffd166" : "#f1ecdf", live: true });
    });
  }
  // calendar year over the grid
  if (t >= F(17.2) && t < F(26.0)) {
    const Y = Math.floor(track(t, [[F(17.0), 1928], [F(18.4), 1929.2], [F(25.6), 2026]], LIN));
    N.push({ t0: F(17.2), t1: F(26.0), value: Math.min(2025, Y), x: W / 2, y: 980, size: 64, color: "#ffd166", live: true, plain: true });
  }
  // what was happening in the calendar year
  const tOfY = (Y: number) => (Y <= 1929.2 ? F(17.0) + ((Y - 1928) / 1.2) * F(1.4) : F(18.4) + ((Y - 1929.2) / (2026 - 1929.2)) * F(7.2));
  const EV: [number, string][] = [
    [1929, "大萧条"],
    [1973, "石油危机，通胀失控"],
    [2000, "互联网泡沫破裂"],
    [2008, "金融危机"],
  ];
  EV.forEach(([y, txt]) => T.push({ t0: tOfY(y), t1: Math.min(F(25.6), tOfY(y + 3.5)), text: `${y} · ${txt}`, x: W / 2, y: 1035, size: 32, serif: false, weight: 600, color: "#ffd166" }));
  if (t >= F(50.2) && t < F(55.3)) {
    const second = t >= F(52.6);
    const Y = second ? track(t, [[F(53.0), 1928], [F(54.8), 2026]], LIN) : track(t, [[F(49.2), 1928], [F(52.0), 2026]], LIN);
    N.push({ t0: F(50.2), t1: F(55.3), value: Math.min(2025, Math.floor(Y)), x: W / 2, y: 980, size: 56, color: "#cfc6b6", live: true, plain: true });
  }

  const G: Tag[] = [
    { t0: 0.35, t1: F(1.05), text: "400万", at: [0, 12.6, 0], dy: -40, size: 64, color: "#ffd166" },
    { t0: F(1.45), t1: F(2.95), text: "¥4,167", small: "400万一个月的利息", at: [12.5, 1.0, -6], dy: -30, size: 56, color: "#ffd166" },
    { t0: F(2.35), t1: F(2.95), text: "¥4,260", small: "城镇居民人均月收入（中位数）", at: [18, 1.0, -10], dy: -30, size: 56, color: "#f1ecdf" },
    // S8: what makes the brick bigger
    { t0: F(64.6), t1: F(66.95), text: "自己交社保、医保", chip: true, at: [0, 9, 0], dx: -420, dy: -150, size: 38 },
    { t0: F(65.1), t1: F(66.95), text: "看病", chip: true, at: [0, 9, 0], dx: 360, dy: -230, size: 38 },
    { t0: F(65.6), t1: F(66.95), text: "孩子", chip: true, at: [0, 9, 0], dx: -380, dy: 40, size: 38 },
    { t0: F(66.1), t1: F(66.95), text: "父母老了", chip: true, at: [0, 9, 0], dx: 400, dy: -20, size: 38 },
    { t0: F(66.6), t1: F(66.95), text: "房租或房贷", chip: true, at: [0, 9, 0], dx: 300, dy: 170, size: 38 },
    { t0: F(90.2), t1: F(92.9), text: "几点起床？", chip: true, at: [-6, 3, 4], dx: -120, size: 38 },
    { t0: F(90.7), t1: F(92.9), text: "见谁？", chip: true, at: [6, 7, 3], dx: 130, size: 38 },
    { t0: F(91.2), t1: F(92.9), text: "每天忙什么？", chip: true, at: [-6, 10, -3], dx: -140, size: 38 },
    { t0: F(91.7), t1: F(92.9), text: "别人问起，你说你是做什么的？", chip: true, at: [6, 12, -3], dx: 200, size: 38 },
    { t0: F(68.8), t1: F(71.9), text: "300万美元", at: [13, 9.4, 0], dy: -16, size: 44, color: "#ffd166" },
  ];

  const world: WorldState = { cam, piles, flyers, labels, blocks, lights, band, focus, floorGlow, exposure, fog, bloom };
  const dark = ramp(t, F(98.2), F(98.5));
  // a soft dark band behind type that sits over busy pictures
  const scrim = Math.max(win(t, F(17.0), F(32.2), 0.6), win(t, F(48.2), F(56.3), 0.6), win(t, F(79.8), F(86.6), 0.6));
  const veil = win(t, F(55.3), F(56.3), 0.25) * 0.6;
  const sources = win(t, F(98.4), F(99.3), 0.2);
  const card = ramp(t, F(99.3), F(99.5));
  return { scrim, veil, world, texts: T.filter((x) => t >= x.t0 - 0.05 && t <= x.t1 + 0.45), nums: N.filter((x) => x.size > 0 && t >= x.t0 - 0.05 && t <= x.t1 + 0.45), tags: G.filter((x) => t >= x.t0 - 0.05 && t <= x.t1 + 0.45), dark, card, sources };
};
