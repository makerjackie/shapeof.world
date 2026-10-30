// The world, frame by frame: camera path, lamps (equal -> long tail), day, the company, customers, overrides.
// Times are film seconds; S(bar) converts film bars (music grid, see timing.ts).
import { b as S, clamp01, EIO, ESO, ramp, tween } from "../timing";
import { Cam, camPath } from "../world/camera";
import { Glow, StallOverride, WorldState } from "../world/engine";
import { HERO, HERO_IDS, NEAR, STALLS, STAR, stallWorld } from "../world/market";
import { arrival, cartStreet, flows, regulars, strollers, wordOfMouth } from "./crowd";

const cam = (x: number, y: number, z: number, dist: number, yaw: number, pitch: number, fov = 40): Cam => ({ x, y, z, dist, yaw, pitch, fov });

// The laptop screen of the opening stall (local centre 0, 0.9, -0.08, tilted back 0.26 rad), front face.
const LAP = STALLS[HERO_IDS.laptop];
export const SCREEN = {
  p: [LAP.x, 0.9015, LAP.z - 0.0742] as [number, number, number],
  u: [0.18, 0, 0] as [number, number, number],
  v: [0, 0.1159, -0.0308] as [number, number, number],
};
const SCREEN_CAM = (d: number): Cam => cam(SCREEN.p[0], SCREEN.p[1], SCREEN.p[2], d, 0, 14.9, 40);

const CART = STALLS[HERO_IDS.cart];
const STARS0 = STALLS[STAR];
const sw = (st: typeof CART, lx: number, ly: number, lz: number) => stallWorld(st, lx, ly, lz);

// The 61 stalls in a row beside the star (north side of the hero street, east of it).
export const ROW = STALLS.filter((s) => s.k === 0 && s.z > 0 && s.x > STARS0.x + 1 && s.id !== STAR)
  .sort((a, c) => a.x - c.x)
  .slice(0, 61);

// Stalls that open while the supply counter runs (hidden before): every other near stall of the hero street and
// its neighbours, each popping up at its own moment.
const LATE = NEAR.filter((s) => s.id !== HERO_IDS.laptop && s.id !== HERO_IDS.cart && s.id !== STAR && s.id !== HERO_IDS.folded && Math.abs(s.k) <= 2 && (s.id * 7) % 5 < 2);
const lateAt = (s: (typeof LATE)[number]) => S(24) + ((s.id * 0.6180339) % 1) * (S(26) - S(24));

export const KEYS: [number, Cam][] = [
  // 1 the opening: the screen, then back to a stall, a street, the whole market
  [0, SCREEN_CAM(0.335)],
  [S(1.2), SCREEN_CAM(0.315)],
  [S(1.95), cam(LAP.x, 1.0, LAP.z, 3.2, 6, 17)],
  [S(2.55), cam(LAP.x + 4, 0, LAP.z + 3, 46, 28, 32)],
  [S(3.3), cam(60, 0, 0, 640, 48, 38)],
  [S(5.9), cam(70, 0, 0, 720, 56, 40)],
  // 2 title (world blurred behind the licence): drift down toward the cart
  [S(7.6), cam(CART.x + 6, 0, CART.z + 4, 60, 0, 30)],
  // 3 the cart
  [S(8.05), cam(CART.x + 0.3, 1.05, CART.z, 6.4, -38, 22)],
  [S(12.6), cam(CART.x + 0.3, 1.05, CART.z, 5.6, -30, 20)],
  [S(13.7), cam(CART.x - 2, 0.9, -2.2, 22, -96, 13)],
  [S(15.6), cam(CART.x - 4, 0.9, -2.4, 19, -100, 12)],
  // 4 the company building
  [S(16.9), cam(HERO.company.x, 6.5, HERO.company.z + 3, 40, 8, 11)],
  [S(21.4), cam(HERO.company.x, 6.0, HERO.company.z + 3, 34, 4, 10)],
  [S(22.9), cam(HERO.folded.x, 1.0, -5, 12, 2, 24)],
  [S(23.8), cam(HERO.folded.x, 1.0, -5, 12, 0, 24)],
  // supply: up over the hero street as new stalls open
  [S(25.6), cam(30, 0, 0, 95, 72, 38)],
  // 5 the street opens to the whole world
  [S(27.8), cam(80, 0, 0, 560, 58, 36)],
  // policy: low along the banners
  [S(28.4), cam(66, 3.6, 0, 30, 96, 5, 42)],
  [S(31.8), cam(80, 3.8, 0, 20, 92, 4, 42)],
  // the cost: back at the opening stall
  [S(32.6), cam(LAP.x, 1.1, LAP.z, 5.4, -16, 16)],
  [S(37.6), cam(LAP.x, 1.1, LAP.z, 5.0, 10, 18)],
  // 6 the turn: straight up (no walls in the way), then out to the whole market
  [S(38.7), cam(LAP.x, 0, LAP.z + 2, 90, 14, 78)],
  [S(41.2), cam(100, 0, 0, 1500, 52, 55)],
  [S(42.0), cam(100, 0, 0, 1550, 54, 56)],
  // the 61 stalls beside the star
  [S(42.9), cam(STARS0.x + 9, 1.0, 4.4, 25, 130, 10)],
  [S(46.8), cam(STARS0.x + 12, 1.0, 4.4, 27, 126, 10)],
  // 7 why: the market from mid height
  [S(47.6), cam(40, 0, 0, 280, 70, 46)],
  [S(51.8), cam(48, 0, 0, 300, 70, 42)],
  // TV (world blurred)
  [S(56.8), cam(40, 0, 0, 340, 76, 44)],
  // 8 the star stall up close
  [S(57.6), cam(STARS0.x, 1.0, STARS0.z, 7.2, 196, 17)],
  [S(59.8), cam(STARS0.x, 1.0, STARS0.z, 6.4, 182, 16)],
  // first: being found (the opening stall, word of mouth)
  [S(60.8), cam(LAP.x, 0.5, LAP.z + 1, 30, 24, 34)],
  [S(65.6), cam(LAP.x, 0.5, LAP.z + 1, 44, 36, 40)],
  // second: coming back (the star stall)
  [S(66.6), cam(STARS0.x, 0.6, STARS0.z, 20, 170, 38)],
  [S(71.6), cam(STARS0.x, 0.6, STARS0.z, 16, 160, 36)],
  // the city's help: over the banners
  [S(72.6), cam(76, 0, 0, 70, 80, 30)],
  [S(73.8), cam(70, 0, 0, 80, 74, 30)],
  // 9 morning: the cart
  [S(75.4), cam(CART.x, 1.0, CART.z, 8.4, -22, 16)],
  [S(80.8), cam(CART.x, 1.0, CART.z, 6.6, -10, 15)],
  // the opening stall's screen, waiting for the first payment
  [S(81.9), cam(LAP.x, 1.0, LAP.z, 2.4, 0, 16)],
  [S(83.2), { ...SCREEN_CAM(0.8), ox: 1270 }],
  [S(91), { ...SCREEN_CAM(0.72), ox: 1270 }],
];

export const camAt = (t: number) => camPath(t, KEYS, EIO);

// How many lamps follow the long tail (0 = all equal).
const tailAt = (t: number) => {
  if (t < S(6)) return 0.85 * ramp(t, S(3.2), S(4.4), ESO); // the opening's flash-forward
  if (t < S(39)) return 0;
  if (t < S(47)) return ramp(t, S(39.4), S(41.6), ESO);
  if (t < S(51)) return 1 - 0.75 * ramp(t, S(47.6), S(48.6)) + 0.75 * ramp(t, S(49.3), S(50.6)); // before / after the internet
  if (t < S(74)) return 1;
  return 1 - ramp(t, S(74), S(78));
};

export const worldAt = (t: number): WorldState => {
  const c = camAt(t);
  const tail = tailAt(t);
  const day = ramp(t, S(74), S(78.5), ESO);
  const over: Record<number, StallOverride> = {};

  // stalls that open during the supply counter
  for (const s of LATE) {
    const at = lateAt(s);
    const v = t < S(23.5) ? 0 : clamp01((t - at) / 0.35);
    if (t < S(30)) over[s.id] = { vis: t < S(8) ? 1 : v };
  }
  // the folded company's stall
  over[HERO_IDS.folded] = { vis: ramp(t, S(22.2), S(22.8), ESO), keep: true };
  // keep the stall we are looking at bright when the rest dims
  over[HERO_IDS.laptop] = { ...(over[HERO_IDS.laptop] ?? {}), keep: true, lit: 1, s: 0.55 };
  over[HERO_IDS.cart] = { keep: true, lit: 1, s: 0.5 };
  over[STAR] = { keep: true, s: tail > 0.2 ? 1 : 0.42 + 0.58 * tail };
  // the 61: dim, the star blazing
  if (t > S(42.6) && t < S(47.2)) for (const r of ROW) over[r.id] = { s: 0.06, lit: 0.55 };

  // dimming behind type
  let dim = 0;
  dim = Math.max(dim, ramp(t, S(4.6), S(5.0)) * (1 - ramp(t, S(7.7), S(8.05))) * 0.85);
  dim = Math.max(dim, ramp(t, S(56.6), S(57.2)) * (1 - ramp(t, S(57.6), S(58.2))) * 0.5);

  // customers
  const glows: Glow[] = [];
  const add = (g: Glow[] | Glow | null) => {
    if (!g) return;
    if (Array.isArray(g)) glows.push(...g);
    else glows.push(g);
  };
  const win = (a: number, z: number, f = 0.6) => clamp01(Math.min((t - a) / f, (z - t) / f));
  add(strollers(t, 700, win(S(1.8), S(3.6)) + win(S(23.6), S(32.2))));
  add(flows(t, 3600, win(S(2.8), S(7.9)) + win(S(38.4), S(57.0)), Math.min(1, tail * 1.15)));
  add(cartStreet(t, win(S(7.8), S(16.2)), S(10.0), [S(15.2)]));
  add(regulars(t, S(57.4), win(S(57.4), S(60.4)) + win(S(66.2), S(72.2))));
  add(wordOfMouth(t, S(61.0), win(S(60.6), S(66.0))));
  add(strollers(t, 260, win(S(72.4), S(74.2))));
  // morning: a few people, the regular at the cart
  if (t > S(74)) {
    add(cartStreet(t, win(S(74.4), S(81.6)) * 0.8, S(76.0), [S(78.6)]));
  }
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
    banners: ramp(t, S(27.6), S(28.3)) * (1 - ramp(t, S(32.2), S(32.6))) + ramp(t, S(72.3), S(72.7)) * (1 - ramp(t, S(73.9), S(74.3))),
    glows,
    reveal: t < S(26) ? 1e9 : t < S(28) ? tween(t, S(26), S(27.8), 160, 3000, ESO) : 1e9,
    farGain: c.dist > 250 ? 1 + 0.5 * clamp01(Math.log(c.dist / 250) / Math.log(6)) : 1,
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
  const k = Math.max(near(S(8.05), S(16.4)), near(S(32.6), S(38.2)), near(S(57.6), S(60.4)), near(S(66.4), S(72.2)), near(S(75.2), S(81.6)), near(S(42.9), S(47)) * 0.7);
  return { focus: 0.54, band: 0.1, amt: 8 * k };
};
