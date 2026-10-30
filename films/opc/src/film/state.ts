// The world, frame by frame: camera path, lamps (equal -> long tail), day, the company, customers, overrides.
// Times are film seconds; S(bar) converts film bars (music grid, see timing.ts). Script v3 (SCRIPT.md).
import { b as S, clamp01, EIO, ESO, ramp, tween } from "../timing";
import { Cam, camPath } from "../world/camera";
import { Glow, StallOverride, WorldState } from "../world/engine";
import { HERO, HERO_IDS, NEAR, STALLS, STAR, Stall } from "../world/market";
import { arrival, cartStreet, flows, regulars, strollers, wordOfMouth } from "./crowd";

const cam = (x: number, y: number, z: number, dist: number, yaw: number, pitch: number, fov = 40): Cam => ({ x, y, z, dist, yaw, pitch, fov });

// A desk stall's laptop screen (local centre 0, 0.9, -0.08, tilted back 0.26 rad), front face, for stalls facing +z.
export type Screen = { p: [number, number, number]; u: [number, number, number]; v: [number, number, number] };
const screenOf = (st: Stall): Screen => ({ p: [st.x, 0.9015, st.z - 0.0742], u: [0.18, 0, 0], v: [0, 0.1159, -0.0308] });
const LAP = STALLS[HERO_IDS.laptop];
const FOLD = STALLS[HERO_IDS.folded];
export const SCREEN = screenOf(LAP); // the opening: Base44's dashboard
export const SCREEN_END = screenOf(FOLD); // the end: the one desk left where the company stood, waiting
const screenCam = (s: Screen, d: number): Cam => cam(s.p[0], s.p[1], s.p[2], d, 0, 14.9, 40);

const CART = STALLS[HERO_IDS.cart];
const STARS0 = STALLS[STAR];

// The 61 stalls in a row beside the star (north side of the hero street, east of it).
export const ROW = STALLS.filter((s) => s.k === 0 && s.z > 0 && s.x > STARS0.x + 1 && s.id !== STAR)
  .sort((a, c) => a.x - c.x)
  .slice(0, 61);

// Stalls that open while the supply counter runs (hidden from the cart until then): some of the near stalls of the
// hero street and its neighbours, each popping up at its own moment.
const LATE = NEAR.filter((s) => s.id !== HERO_IDS.laptop && s.id !== HERO_IDS.cart && s.id !== STAR && s.id !== HERO_IDS.folded && Math.abs(s.k) <= 2 && (s.id * 7) % 5 < 2);
const lateAt = (s: (typeof LATE)[number]) => S(23.3) + ((s.id * 0.6180339) % 1) * (S(25.0) - S(23.3));

export const KEYS: [number, Cam][] = [
  // 1 the opening: the screen, then back to a stall, a street, the whole market
  [0, screenCam(SCREEN, 0.335)],
  [S(1.2), screenCam(SCREEN, 0.315)],
  [S(1.95), cam(LAP.x, 1.0, LAP.z, 3.2, 6, 17)],
  [S(2.55), cam(LAP.x + 4, 0, LAP.z + 3, 46, 28, 32)],
  [S(3.3), cam(60, 0, 0, 640, 48, 38)],
  [S(5.9), cam(70, 0, 0, 720, 56, 40)],
  // 2 title (world blurred behind the licence): drift down toward the cart
  [S(7.6), cam(CART.x + 6, 0, CART.z + 4, 60, 0, 30)],
  // 3 the cart, then along its street
  [S(8.05), cam(CART.x + 0.3, 1.05, CART.z, 6.4, -38, 22)],
  [S(12.6), cam(CART.x + 0.3, 1.05, CART.z, 5.6, -30, 20)],
  [S(13.7), cam(CART.x - 2, 0.9, -2.2, 22, -96, 13)],
  [S(15.6), cam(CART.x - 4, 0.9, -2.4, 19, -100, 12)],
  // 4 the company building
  [S(16.9), cam(HERO.company.x, 6.5, HERO.company.z + 3, 40, 8, 11)],
  [S(21.4), cam(HERO.company.x, 6.0, HERO.company.z + 3, 34, 4, 10)],
  [S(22.9), cam(FOLD.x, 1.0, FOLD.z, 12, 2, 24)],
  // supply: along the street from the desk, as new stalls open on both sides
  [S(23.9), cam(FOLD.x + 8, 0.8, -0.5, 30, 64, 20)],
  [S(25.0), cam(FOLD.x + 10, 0.8, -0.5, 32, 70, 21)],
  // the cities help people set up: low along the banners (stopping short of the first one at x = 58)
  [S(25.7), cam(66, 3.6, 0, 32, 96, 5, 42)],
  [S(27.8), cam(68, 3.8, 0, 27, 92, 4, 42)],
  // the burden: the one desk left
  [S(28.7), cam(FOLD.x, 1.05, FOLD.z, 5.4, -14, 17)],
  [S(31.6), cam(FOLD.x, 1.05, FOLD.z, 5.0, 8, 18)],
  // 5 the second ceiling: straight up from the desk, then the whole world
  [S(32.5), cam(FOLD.x, 0, FOLD.z + 2, 90, 10, 76)],
  [S(33.9), cam(80, 0, 0, 560, 58, 36)],
  [S(35.9), cam(84, 0, 0, 640, 58, 40)],
  // 6 the turn: out to the whole market
  [S(39.2), cam(100, 0, 0, 1500, 52, 55)],
  [S(40.0), cam(100, 0, 0, 1550, 54, 56)],
  // the 61 stalls beside the star
  [S(40.9), cam(STARS0.x + 9, 1.0, 4.4, 25, 130, 10)],
  [S(44.8), cam(STARS0.x + 12, 1.0, 4.4, 27, 126, 10)],
  // 7 why: the market from mid height
  [S(45.6), cam(40, 0, 0, 280, 70, 46)],
  [S(49.8), cam(48, 0, 0, 300, 72, 44)],
  // TV (world blurred)
  [S(54.8), cam(40, 0, 0, 340, 76, 44)],
  // AI: the crowded hero street from mid height
  [S(55.8), cam(20, 0, 0, 120, 70, 42)],
  [S(57.8), cam(26, 0, 0, 105, 66, 40)],
  // 8 the star stall up close
  [S(58.6), cam(STARS0.x, 1.0, STARS0.z, 7.2, 196, 17)],
  [S(60.8), cam(STARS0.x, 1.0, STARS0.z, 6.4, 182, 16)],
  // first: being found (the opening stall from above, word of mouth streaming in)
  [S(61.8), cam(LAP.x, 0.5, LAP.z + 1, 36, 22, 54)],
  [S(66.6), cam(LAP.x, 0.5, LAP.z + 1, 50, 32, 56)],
  // second: coming back (the star stall)
  [S(67.6), cam(STARS0.x, 0.6, STARS0.z, 20, 170, 40)],
  [S(72.6), cam(STARS0.x, 0.6, STARS0.z, 16, 160, 38)],
  // the city's help: over the banners
  [S(73.6), cam(76, 0, 0, 70, 80, 32)],
  [S(74.8), cam(70, 0, 0, 80, 74, 32)],
  // 9 morning: the cart
  [S(76.4), cam(CART.x, 1.0, CART.z, 8.4, -22, 16)],
  [S(82.0), cam(CART.x, 1.0, CART.z, 6.6, -10, 15)],
  // the one desk left, its screen waiting for the first payment
  [S(83.1), cam(FOLD.x, 1.0, FOLD.z, 2.8, 0, 16)],
  [S(84.2), { ...screenCam(SCREEN_END, 1.3), ox: 1380 }],
  [S(92), { ...screenCam(SCREEN_END, 1.18), ox: 1380 }],
];

export const camAt = (t: number) => camPath(t, KEYS, EIO);

// How many lamps follow the long tail (0 = all equal).
const tailAt = (t: number) => {
  if (t < S(6)) return 0.85 * ramp(t, S(3.2), S(4.4), ESO); // the opening's flash-forward
  if (t < S(37)) return 0;
  if (t < S(45)) return ramp(t, S(37.4), S(39.6), ESO);
  if (t < S(49)) return 1 - 0.75 * ramp(t, S(45.6), S(46.6)) + 0.75 * ramp(t, S(47.3), S(48.6)); // before / after the internet
  if (t < S(75)) return 1;
  return 1 - ramp(t, S(75), S(79));
};

export const worldAt = (t: number): WorldState => {
  const c = camAt(t);
  const tail = tailAt(t);
  const day = ramp(t, S(75), S(79.5), ESO);
  const over: Record<number, StallOverride> = {};

  // stalls that open during the supply counter (the opening's street shows them all: it is a flash-forward)
  for (const s of LATE) {
    const at = lateAt(s);
    const v = t < S(23.2) ? 0 : clamp01((t - at) / 0.35);
    if (t < S(32)) over[s.id] = { vis: t < S(8) ? 1 : v };
  }
  // the folded company's stall, from the fold on
  over[HERO_IDS.folded] = { vis: ramp(t, S(22.2), S(22.8), ESO), keep: true, lit: 1, s: 0.5 };
  // keep the stalls we look at bright when the rest dims
  over[HERO_IDS.laptop] = { keep: true, lit: 1, s: 0.55 };
  over[HERO_IDS.cart] = { keep: true, lit: 1, s: 0.5 };
  over[STAR] = { keep: true, s: tail > 0.2 ? 1 : 0.42 + 0.58 * tail };
  // the 61: dim, the star blazing
  if (t > S(40.6) && t < S(45.2)) for (const r of ROW) over[r.id] = { s: 0.06, lit: 0.55 };

  // dimming behind type
  let dim = 0;
  dim = Math.max(dim, ramp(t, S(4.6), S(5.0)) * (1 - ramp(t, S(7.7), S(8.05))) * 0.85);
  dim = Math.max(dim, ramp(t, S(58.4), S(58.9)) * (1 - ramp(t, S(59.4), S(60))) * 0.4);

  // customers
  const glows: Glow[] = [];
  const add = (g: Glow[] | Glow | null) => {
    if (!g) return;
    if (Array.isArray(g)) glows.push(...g);
    else glows.push(g);
  };
  const win = (a: number, z: number, f = 0.6) => clamp01(Math.min((t - a) / f, (z - t) / f));
  add(strollers(t, 700, win(S(1.8), S(3.6)) + win(S(23.2), S(28.4)) + win(S(32.4), S(36.2))));
  add(flows(t, 3600, win(S(2.8), S(7.9)) + win(S(36.4), S(50.0)) + win(S(54.9), S(58.2)), Math.min(1, tail * 1.15)));
  add(cartStreet(t, win(S(7.8), S(16.2)), S(10.0), [S(15.2)]));
  add(regulars(t, S(58.4), win(S(58.4), S(61.4)) + win(S(67.2), S(73.2))));
  add(wordOfMouth(t, S(62.0), win(S(61.6), S(67.0))));
  add(strollers(t, 260, win(S(73.4), S(75.2))));
  if (t > S(75)) add(cartStreet(t, win(S(75.4), S(82.8)) * 0.8, S(77.0), [S(79.6)]));
  // the first customer of the opening scene's stall arrives just before the pull-back
  add(arrival(LAP, t, S(1.3), 1.4, LAP.x + 9, false, 1 - ramp(t, S(2.4), S(3.0))));

  // the company building
  const company = {
    vis: t > S(15.8) && t < S(23.5) ? 1 : 0,
    off: ramp(t, S(19.8), S(21.5), (x) => x),
    sink: ramp(t, S(21.6), S(22.7), EIO),
  };

  return {
    cam: c,
    time: t,
    day,
    equal: 1 - tail,
    dim,
    over,
    company,
    banners: ramp(t, S(25.0), S(25.6)) * (1 - ramp(t, S(28.3), S(28.6))) + ramp(t, S(73.3), S(73.7)) * (1 - ramp(t, S(74.9), S(75.3))),
    glows,
    reveal: t < S(32.4) ? 1e9 : t < S(34) ? tween(t, S(32.4), S(33.9), 160, 3000, ESO) : 1e9,
    farGain: c.dist > 250 ? 1 + 1.0 * clamp01(Math.log(c.dist / 250) / Math.log(6)) : 1,
    bloom: c.dist > 200 ? 0.45 : 0.6,
    exposure: 1 - 0.12 * day,
    tilt: tiltAt(t),
    windows: 0.14,
    fogD: c.dist > 200 ? 0.0013 - 0.0006 * clamp01(Math.log(c.dist / 200) / Math.log(8)) : 0.0013,
  };
};

// Miniature look on the close shots: blur away from a band around the subject.
const tiltAt = (t: number) => {
  const near = (a: number, z: number) => clamp01(Math.min((t - a) / 0.5, (z - t) / 0.5));
  const k = Math.max(near(S(8.05), S(16.4)), near(S(28.6), S(32.0)), near(S(58.6), S(61.4)), near(S(67.4), S(73.2)), near(S(76.2), S(82.8)), near(S(40.9), S(45)) * 0.7);
  return { focus: 0.54, band: 0.1, amt: 8 * k };
};
