// The world, frame by frame: camera path, lamps (equal -> long tail), the income pillars and glass levels, day,
// the company, customers, overrides. Times are film seconds; S(bar) converts film bars (music grid, see timing.ts).
// Script v7 (SCRIPT.md).
import { b as S, clamp01, EIO, ESO, ramp, tween } from "../timing";
import { Cam, camPath } from "../world/camera";
import { Glass, Glow, PILLAR_BASE, StallOverride, WorldState } from "../world/engine";
import { HERO, HERO_IDS, NEAR, STALLS, STAR, Stall } from "../world/market";
import { arrival, cartStreet, flows, regulars, strollers, wordOfMouth } from "./crowd";
import { CEIL, CN_TINT, FLOOR, H_NOW, H_OLD, LEVEL_100K, LEVEL_10K, LEVEL_1M, LOSS, Q, STEEP } from "./shape";

const cam = (x: number, y: number, z: number, dist: number, yaw: number, pitch: number, fov = 40): Cam => ({ x, y, z, dist, yaw, pitch, fov });

// A desk stall's laptop screen (local centre 0, 0.9, -0.08, tilted back 0.26 rad), front face, for stalls facing +z.
export type Screen = { p: [number, number, number]; u: [number, number, number]; v: [number, number, number] };
const screenOf = (st: Stall): Screen => ({ p: [st.x, 0.9015, st.z - 0.0742], u: [0.18, 0, 0], v: [0, 0.1159, -0.0308] });
const LAP = STALLS[HERO_IDS.laptop];
const FOLD = STALLS[HERO_IDS.folded];
export const SCREEN = screenOf(LAP); // the opening: a company registered
export const SCREEN_END = screenOf(FOLD); // the end: the one desk left where the company stood
const screenCam = (s: Screen, d: number): Cam => cam(s.p[0], s.p[1], s.p[2], d, 0, 14.9, 40);

export const CART = STALLS[HERO_IDS.cart];
export const STAR0 = STALLS[STAR];

// The 61 stalls in a row beside the star (north side of the hero street, east of it).
export const ROW = STALLS.filter((s) => s.k === 0 && s.z > 0 && s.x > STAR0.x + 1 && s.id !== STAR)
  .sort((a, c) => a.x - c.x)
  .slice(0, 61);

// Stalls that open when making a company gets easy (hidden until then): some of the near stalls of the hero street
// and its neighbours, each popping up at its own moment.
const LATE = NEAR.filter((s) => s.id !== HERO_IDS.laptop && s.id !== HERO_IDS.cart && s.id !== STAR && s.id !== HERO_IDS.folded && Math.abs(s.k) <= 2 && (s.id * 7) % 5 < 2);
const LATE_SET = new Set(LATE.map((s) => s.id));
const LATE_A = S(73.6);
const LATE_Z = S(75.2);
const lateAt = (s: Stall) => LATE_A + ((s.id * 0.6180339) % 1) * (LATE_Z - LATE_A);

// The old shape's street: the cart's stretch of the hero street.
const OLD_STREET = (st: Stall) => st.k === 0 && st.x > CART.x - 70 && st.x < CART.x + 150;
const EYE = PILLAR_BASE + (FLOOR + CEIL) / 2; // between the floor and the ceiling

// The shot that looks up the tallest pillar (the star's).
const UP = (y: number, pitch: number, dist: number, yaw: number): Cam => cam(STAR0.x, y, STAR0.z, dist, yaw, pitch, 50);

export const KEYS: [number, Cam][] = [
  // 0 the opening: a registration on a laptop, then back to the stall, the street, the whole market lighting up
  [0, screenCam(SCREEN, 0.335)],
  [S(1.2), screenCam(SCREEN, 0.315)],
  [S(1.95), cam(LAP.x, 1.0, LAP.z, 3.2, 6, 17)],
  [S(2.6), cam(LAP.x + 4, 0, LAP.z + 3, 46, 28, 32)],
  [S(3.5), cam(60, 0, 0, 640, 48, 30)],
  [S(5.9), cam(70, 0, 0, 760, 56, 26)],
  // 1 title: the market to the horizon
  [S(7.99), cam(84, 0, 0, 840, 64, 21)],
  // 2 the cart
  [S(8.0), cam(CART.x + 0.3, 1.05, CART.z, 6.4, -38, 22)],
  [S(10.3), cam(CART.x + 0.3, 1.05, CART.z, 5.8, -30, 20)],
  [S(11.2), cam(CART.x - 2, 0.9, -2.2, 22, -96, 13)],
  [S(13.6), cam(CART.x - 4, 0.9, -2.4, 19, -100, 12)],
  // its pillar rises into the ceiling
  [S(14.5), cam(CART.x, PILLAR_BASE + 1.2, CART.z, 13, -32, -10, 48)],
  [S(16.8), cam(CART.x, PILLAR_BASE + 1.6, CART.z, 12, -24, -12, 48)],
  // up between the floor and the ceiling, looking along the street
  [S(18.0), cam(CART.x + 18, EYE, 0, 18, 90, 2, 50)],
  [S(21.8), cam(CART.x + 30, EYE, 0, 18, 92, 0, 50)],
  // 3 the company building
  [S(22.9), cam(HERO.company.x, 6.5, HERO.company.z + 3, 40, 8, 11)],
  [S(28.0), cam(HERO.company.x, 6.0, HERO.company.z + 3, 34, 4, 10)],
  [S(29.3), cam(FOLD.x, 1.0, FOLD.z, 12, 2, 24)],
  // the street: straight up from the desk, then the whole world
  [S(30.2), cam(FOLD.x, 0, FOLD.z + 2, 90, 10, 76)],
  [S(32.0), cam(80, 0, 0, 560, 58, 36)],
  [S(37.59), cam(92, 0, 0, 720, 62, 34)],
  // 4 back between the floor and the ceiling: they break
  [S(37.6), cam(-10, EYE, 0, 16, 90, 0, 50)],
  [S(39.9), cam(-6, EYE + 0.4, 0, 16, 90, -6, 50)],
  [S(41.0), cam(8, PILLAR_BASE + 3, 0, 64, 70, 16, 46)],
  [S(42.8), cam(10, PILLAR_BASE + 3, 0, 60, 66, 15, 46)],
  // the levels: US$10,000, US$100,000, US$1 million
  [S(43.4), cam(10, PILLAR_BASE + LEVEL_10K, 0, 46, 90, 12, 46)],
  [S(45.8), cam(12, PILLAR_BASE + LEVEL_10K, 0, 42, 86, 11, 46)],
  [S(47.2), cam(12, PILLAR_BASE + LEVEL_100K, 0, 70, 70, 11, 46)],
  [S(48.8), cam(13, PILLAR_BASE + LEVEL_100K, 0, 66, 64, 11, 46)],
  [S(50.4), cam(12, PILLAR_BASE + LEVEL_1M, 0, 210, 56, 9, 46)],
  [S(51.9), cam(14, PILLAR_BASE + LEVEL_1M, 0, 200, 54, 9, 46)],
  // down again: no profit; thinner slices; China's shops
  [S(52.9), cam(20, 0, 0, 150, 70, 34, 44)],
  [S(56.4), cam(26, 0, 0, 138, 76, 31, 44)],
  [S(58.2), cam(30, 0, 0, 132, 80, 30, 44)],
  // online: out to the whole market
  [S(59.3), cam(100, 0, 0, 1500, 52, 55)],
  [S(60.99), cam(100, 0, 0, 1560, 55, 56)],
  // the verdict: looking up the forest of pillars
  [S(61.0), UP(36, -28, 64, 92)],
  [S(63.99), UP(44, -32, 60, 98)],
  // 5 why: the market from mid height, customers flowing to the brightest
  [S(64.0), cam(40, 0, 0, 280, 70, 46)],
  [S(68.3), cam(48, 0, 0, 300, 72, 44)],
  // TV (world blurred)
  [S(73.1), cam(40, 0, 0, 340, 76, 44)],
  // making a company got easy: along the street from the desk, as new stalls open on both sides
  [S(73.11), cam(FOLD.x + 8, 0.8, -0.5, 30, 64, 20)],
  [S(76.99), cam(FOLD.x + 11, 0.8, -0.5, 32, 72, 21)],
  // the 61 stalls beside the star
  [S(77.0), cam(STAR0.x + 9, 1.0, 4.4, 25, 130, 10)],
  [S(80.99), cam(STAR0.x + 12, 1.0, 4.4, 27, 126, 10)],
  // eighteen years: more pillars, all lower
  [S(81.0), cam(18, 0, 0, 130, 72, 30, 44)],
  [S(83.8), cam(24, 0, 0, 118, 66, 28, 44)],
  // 6 the future
  [S(84.7), cam(30, 0, 0, 220, 70, 40)],
  [S(85.39), cam(32, 0, 0, 230, 72, 40)],
  [S(85.4), cam(66, 3.6, 0, 32, 96, 5, 42)],
  [S(87.99), cam(68, 3.8, 0, 27, 92, 4, 42)],
  [S(88.0), cam(18, 0, 0, 160, 70, 30, 44)],
  [S(89.59), cam(22, 0, 0, 150, 66, 29, 44)],
  // what the ones on top did: the star stall
  [S(89.6), cam(STAR0.x, 1.0, STAR0.z, 7.2, 196, 17)],
  [S(91.99), cam(STAR0.x, 1.0, STAR0.z, 6.6, 184, 16)],
  [S(92.0), cam(STAR0.x, 0.6, STAR0.z, 20, 170, 40)],
  [S(94.49), cam(STAR0.x, 0.6, STAR0.z, 24, 162, 42)],
  // their customers come from far away
  [S(94.5), cam(STAR0.x, 0.5, STAR0.z, 70, 150, 52)],
  [S(96.49), cam(STAR0.x, 0.5, STAR0.z, 84, 146, 54)],
  // and come back
  [S(96.5), cam(STAR0.x, 0.6, STAR0.z, 16, 160, 38)],
  [S(98.99), cam(STAR0.x, 0.6, STAR0.z, 14, 154, 36)],
  // 7 morning: the cart
  [S(99.0), cam(CART.x, 1.0, CART.z, 9.2, -26, 18)],
  [S(106.79), cam(CART.x, 1.0, CART.z, 6.4, -8, 15)],
  // the one desk left, its screen: regulars, none yet
  [S(106.8), cam(FOLD.x, 1.0, FOLD.z, 2.8, 0, 16)],
  [S(107.8), { ...screenCam(SCREEN_END, 1.3), ox: 1380 }],
  [S(118), { ...screenCam(SCREEN_END, 1.16), ox: 1380 }],
];

export const camAt = (t: number) => camPath(t, KEYS, EIO);

// How many lamps follow the long tail (0 = all equal).
const tailAt = (t: number) => {
  if (t < S(8)) return 0;
  if (t < S(57)) return 0;
  if (t < S(64)) return ramp(t, S(58.6), S(59.8), ESO);
  if (t < S(68.4)) return 0.25 + 0.75 * ramp(t, S(65.6), S(67.4), ESO); // before / after the street goes
  if (t < S(99)) return 1;
  return 1 - ramp(t, S(99), S(103));
};

// Pillar heights (NEAR order) and colours, or nothing.
const NONE = new Float32Array(NEAR.length);
const pillarsAt = (t: number, over: Record<number, StallOverride>): WorldState["pillars"] => {
  const h = new Float32Array(NEAR.length);
  const tint = new Float32Array(NEAR.length);
  let gain = 0;
  // each pillar rises at its own moment within [a, z]
  const grow = (i: number, a: number, z: number) => ESO(clamp01((t - a - ((NEAR[i].id * 0.37) % 1) * (z - a) * 0.5) / ((z - a) * 0.5)));
  if (t > S(14.5) && t < S(22.9)) {
    // 2 the old shape on the cart's street: the cart's pillar first, into the ceiling; then the others
    gain = 1 - ramp(t, S(22.2), S(22.8));
    NEAR.forEach((st, i) => {
      if (!OLD_STREET(st) || LATE_SET.has(st.id)) return;
      if (st.id === HERO_IDS.cart) h[i] = (CEIL - 0.04) * ESO(clamp01((t - S(14.8)) / (S(15.7) - S(14.8))));
      else h[i] = H_OLD[i] * grow(i, S(17.2), S(18.6));
    });
  } else if (t > S(37.5) && t < S(64)) {
    // 4 everyone: the old shape, then the new one; no profit; China's shops; out and back for the verdict
    gain = Math.min(ramp(t, S(37.5), S(37.7)), 1 - ramp(t, S(58.4), S(59.1)) + ramp(t, S(60.95), S(61.3))) * (1 - ramp(t, S(63.4), S(63.95)));
    const thin = ramp(t, S(54.8), S(55.8), ESO) * (1 - ramp(t, S(56.3), S(56.8), ESO));
    NEAR.forEach((st, i) => {
      if (LATE_SET.has(st.id)) return; // not open yet
      // each pillar leaves the band at its own moment: the tallest shoot up first
      const a = S(38.5) + (1 - Q[i]) * 0.5 + ((st.id * 0.37) % 1) * 0.9;
      const m = ESO(clamp01((t - a) / 1.5));
      let v = H_OLD[i] + (H_NOW[i] - H_OLD[i]) * m;
      // no profit: three in ten fall to the ground
      const fall = LOSS[i] ? ramp(t, S(52.5) + ((st.id * 0.61) % 1) * 0.8, S(52.5) + ((st.id * 0.61) % 1) * 0.8 + 0.7, ESO) * (1 - ramp(t, S(54.5), S(55.0))) : 0;
      v = v + (0.12 - v) * fall;
      h[i] = v * (1 - 0.38 * thin);
      if (fall > 0.3) tint[i] = 1;
      if (t > S(56.6) && t < S(58.9)) tint[i] = CN_TINT[i];
    });
  } else if (t > S(80.9) && t < S(84.2)) {
    // 5 the synthesis: the ceiling higher, the floor lower (every stall open now)
    gain = ramp(t, S(80.9), S(81.3)) * (1 - ramp(t, S(83.7), S(84.15)));
    const k = ramp(t, S(81.6), S(82.8), ESO);
    NEAR.forEach((st, i) => {
      h[i] = H_NOW[i] * (1 + (STEEP[i] - 1) * k);
    });
  } else if (t > S(87.9) && t < S(89.7)) {
    // 6 more stalls, a wider gap
    gain = ramp(t, S(87.95), S(88.2)) * (1 - ramp(t, S(89.3), S(89.65)));
    const k = ramp(t, S(88.2), S(89.2), ESO);
    NEAR.forEach((st, i) => {
      h[i] = H_NOW[i] * (1 + (STEEP[i] - 1) * (1 + 0.6 * k));
    });
  }
  void over;
  return gain > 0 ? { h, tint, gain } : { h: NONE, gain: 0 };
};

const glassAt = (t: number): (Glass | null)[] => {
  const g: (Glass | null)[] = [null, null, null, null, null];
  const street = { x: CART.x + 40, z: 0, w: 230, d: 15 };
  const CEIL_C: [number, number, number] = [1.0, 0.78, 0.6];
  const FLOOR_C: [number, number, number] = [0.6, 0.86, 1.0];
  const LEVEL_C: [number, number, number] = [0.78, 0.86, 1.0];
  if (t > S(14.6) && t < S(23)) {
    const o = 1 - ramp(t, S(22.1), S(22.7));
    g[0] = { ...street, y: PILLAR_BASE + CEIL, o: ramp(t, S(14.7), S(15.3)) * o, color: CEIL_C, grid: 3 };
    g[1] = { ...street, y: PILLAR_BASE + FLOOR, o: ramp(t, S(17.0), S(17.6)) * o * 0.85, color: FLOOR_C, grid: 3 };
  }
  if (t > S(37.5) && t < S(41)) {
    const s4 = { x: 60, z: 0, w: 300, d: 15 };
    g[0] = { ...s4, y: PILLAR_BASE + CEIL, o: ramp(t, S(37.5), S(37.7)), brk: ramp(t, S(38.2), S(39.7), (x) => x), fall: -1, color: CEIL_C, grid: 3 };
    g[1] = { ...s4, y: PILLAR_BASE + FLOOR, o: ramp(t, S(37.5), S(37.7)) * 0.85, brk: ramp(t, S(38.7), S(40.3), (x) => x), fall: 1, color: FLOOR_C, grid: 3 };
  }
  // the levels (big sheets over the whole near market)
  const level = (y: number, a: number, z: number, keep: number, grid: number): Glass | null => {
    if (t < a || t > S(52.6)) return null;
    const o = Math.min(ramp(t, a, a + 0.6), 1 - (1 - keep) * ramp(t, z, z + 0.6)) * (1 - ramp(t, S(52.0), S(52.6)));
    return { x: 0, z: 0, w: 430, d: 175, y, o, color: LEVEL_C, grid };
  };
  if (t > S(43)) {
    g[2] = level(PILLAR_BASE + LEVEL_10K, S(43.3), S(46.8), 0.4, 4);
    g[3] = level(PILLAR_BASE + LEVEL_100K, S(46.6), S(50.0), 0.4, 6);
    g[4] = level(PILLAR_BASE + LEVEL_1M, S(49.8), S(53), 1, 10);
  }
  // 7 morning: the floor under the cart, laid one tile at a time as the regulars come
  if (t > S(100) && t < S(107)) {
    const [cx, , cz] = [CART.x, 0, CART.z + 1.6];
    g[2] = { x: cx, z: cz, w: 5, d: 2.5, y: 0.03, o: 0.55 * ramp(t, S(100.2), S(100.8)) * (1 - ramp(t, S(106.4), S(106.9))), base: 0.1, color: [1.0, 0.85, 0.6], grid: 0.36, lit: tween(t, S(100.6), S(105.6), 0.05, 1.0, (x) => x) };
  }
  return g;
};

export const worldAt = (t: number): WorldState => {
  const c = camAt(t);
  const tail = tailAt(t);
  const day = ramp(t, S(99), S(103.5), ESO);
  const over: Record<number, StallOverride> = {};

  // stalls that open when making a company gets easy (the opening shows them all: it is the market of today)
  for (const s of LATE) {
    const at = lateAt(s);
    const v = t < LATE_A - 0.1 ? 0 : clamp01((t - at) / 0.35);
    if (t > S(8) && t < LATE_Z + 0.5) over[s.id] = { vis: v };
  }
  // the folded company's stall, from the fold on
  over[HERO_IDS.folded] = { vis: ramp(t, S(28.2), S(28.8), ESO), keep: true, lit: 1, s: 0.5 };
  // keep the stalls we look at bright when the rest dims
  over[HERO_IDS.laptop] = { keep: true, lit: 1, s: 0.55 };
  over[HERO_IDS.cart] = { keep: true, lit: 1, s: 0.5 };
  over[STAR] = { keep: true, s: tail > 0.2 ? 1 : 0.42 + 0.58 * tail };
  // the 61: dim, the star blazing
  if (t > S(76.8) && t < S(81.0)) for (const r of ROW) over[r.id] = { s: 0.06, lit: 0.55 };

  // dimming behind type
  let dim = 0;
  dim = Math.max(dim, ramp(t, S(3.55), S(4.0)) * (1 - ramp(t, S(7.7), S(8.0))) * 0.75);
  dim = Math.max(dim, ramp(t, S(89.4), S(89.9)) * (1 - ramp(t, S(91.4), S(91.9))) * 0.4);

  // customers
  const glows: Glow[] = [];
  const add = (g: Glow[] | Glow | null) => {
    if (!g) return;
    if (Array.isArray(g)) glows.push(...g);
    else glows.push(g);
  };
  const win = (a: number, z: number, f = 0.6) => clamp01(Math.min((t - a) / f, (z - t) / f));
  add(strollers(t, 700, win(S(1.8), S(3.6)) + win(S(32.4), S(37.3)) + win(S(73.2), S(76.9)), 190));
  add(flows(t, 3600, win(S(2.9), S(7.9)) + win(S(59.1), S(61.0)) + win(S(64.0), S(68.5)) + win(S(84.0), S(85.4)), Math.min(1, tail * 1.15)));
  add(cartStreet(t, win(S(7.8), S(14.6)) + win(S(16.9), S(19.4)) * 0.8, S(10.0), [S(17.6), S(18.4)]));
  add(regulars(t, S(89.4), win(S(89.4), S(94.4)) + win(S(96.4), S(99.2))));
  add(wordOfMouth(t, S(94.6), win(S(94.4), S(96.6)), STAR, 5));
  if (t > S(99)) add(cartStreet(t, win(S(99.4), S(106.8)) * 0.8, S(100.6), [S(101.4), S(102.6), S(103.5), S(104.3), S(105.0)]));
  // the first customer of the opening stall arrives just before the pull-back
  add(arrival(LAP, t, S(1.3), 1.4, LAP.x + 9, false, 1 - ramp(t, S(2.4), S(3.0))));

  // the company building
  const company = {
    vis: t > S(22.4) && t < S(29.6) ? 1 : 0,
    off: ramp(t, S(26.0), S(27.6), (x) => x),
    sink: ramp(t, S(27.6), S(28.7), EIO),
  };

  return {
    cam: c,
    time: t,
    day,
    equal: 1 - tail,
    dim,
    over,
    company,
    banners: ramp(t, S(85.3), S(85.5)) * (1 - ramp(t, S(87.9), S(88.0))),
    glows,
    pillars: pillarsAt(t, over),
    glass: glassAt(t),
    // the opening lights the market lamp by lamp; the second ceiling does it again
    reveal: t < S(0.4) ? 6 : t < S(3.8) ? tween(t, S(0.5), S(3.7), 6, 3200, ESO) : t < S(30.2) ? 1e9 : t < S(33.8) ? tween(t, S(30.2), S(33.6), 160, 3200, ESO) : 1e9,
    farGain: c.dist > 250 ? 1 + 1.1 * clamp01(Math.log(c.dist / 250) / Math.log(6)) : 1,
    bloom: c.dist > 200 ? 0.5 : 0.6,
    exposure: 1 - 0.12 * day,
    tilt: tiltAt(t),
    windows: 0.14,
    fogD: c.dist > 200 ? 0.0013 - 0.0006 * clamp01(Math.log(c.dist / 200) / Math.log(8)) : 0.0013,
  };
};

// Miniature look on the close shots: blur away from a band around the subject.
const tiltAt = (t: number) => {
  const near = (a: number, z: number) => clamp01(Math.min((t - a) / 0.5, (z - t) / 0.5));
  const k = Math.max(near(S(8.0), S(14.4)), near(S(89.6), S(91.9)), near(S(92.0), S(94.4)) * 0.8, near(S(96.5), S(99.0)), near(S(99.6), S(106.6)), near(S(77.0), S(80.8)) * 0.7);
  return { focus: 0.54, band: 0.1, amt: 8 * k };
};
