// The world at every moment of the film: camera keys and the state of the city and the hero.
// Times are film seconds from the music grid (sa = A bars, sb = B bars, see timing.ts and SCRIPT.md).
// Pruitt-Igoe, 美孚新邨 (B8–B24) and the map of China (B24–B36) are 2D scenes drawn over a dark frame.
import { HERO } from "../world/city";
import { Cam, mixCam } from "../world/camera";
import { WorldState } from "../world/engine";
import { clamp01, EI, EIO, EO, ESO, lerp, ramp, sa, sb, track, tween, win } from "../timing";

const cam = (c: Partial<Cam>): Cam => ({ x: 0, y: 45, z: 0, dist: 240, yaw: 0, pitch: 6, fov: 36, ...c });

// Camera keys: [time, camera, ease into this key]
type Key = [number, Cam, ((x: number) => number)?];
const camAt = (t: number, keys: Key[]): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, c0] = keys[i - 1];
      const [t1, c1, e] = keys[i];
      return mixCam(c0, c1, (e ?? ESO)(clamp01((t - t0) / (t1 - t0))));
    }
  }
  return keys[keys.length - 1][1];
};

const LIN = (x: number) => x;

const KEYS: Key[] = [
  // hook: a low glide over the city from the river, northwards
  [0, cam({ x: -900, y: 40, z: 2500, dist: 520, yaw: 12, pitch: 9, fov: 40 })],
  [sa(9), cam({ x: -260, y: 60, z: 820, dist: 760, yaw: 6, pitch: 12, fov: 40 }), LIN],
  // dive down to the empty plot, low, looking up
  [sa(12.1), cam({ x: 0, y: 46, z: 0, dist: 230, yaw: -22, pitch: -9, fov: 40 }), EIO],
  // the tower rises; crane up and back
  [sa(16), cam({ x: 0, y: 50, z: 0, dist: 255, yaw: -14, pitch: 1, fov: 38 }), ESO],
  // 33 floors and 100 m: from the side, measured
  [sa(17.2), cam({ x: 0, y: 58, z: 0, dist: 300, yaw: -64, pitch: 1, fov: 38 }), EIO],
  [sa(20.3), cam({ x: 0, y: 56, z: 0, dist: 290, yaw: -56, pitch: 1, fov: 38 }), LIN],
  // X-ray: three-quarter view, slowly round
  [sa(22), cam({ x: -4, y: 50, z: 0, dist: 205, yaw: -38, pitch: 4, fov: 38 }), EIO],
  [sa(27.8), cam({ x: -6, y: 54, z: 0, dist: 190, yaw: -24, pitch: 5, fov: 38 }), LIN],
  // lifts and stairs: close on the core (the target follows a car, see below)
  [sa(29), cam({ x: 2, y: 40, z: -3, dist: 95, yaw: -28, pitch: 1, fov: 40 }), EIO],
  [sa(31.6), cam({ x: 2, y: 60, z: -3, dist: 120, yaw: -20, pitch: 1, fov: 40 }), LIN],
  [sa(32.8), cam({ x: 0, y: 50, z: 0, dist: 170, yaw: -10, pitch: 3, fov: 38 }), EIO],
  // ageing: close along the facade, rising with the years
  [sa(34.5), cam({ x: 6, y: 26, z: 7, dist: 120, yaw: 18, pitch: 2, fov: 40 }), EIO],
  [sa(40), cam({ x: 4, y: 62, z: 7, dist: 125, yaw: 10, pitch: 1, fov: 40 }), LIN],
  [sa(44), cam({ x: 0, y: 54, z: 0, dist: 210, yaw: 4, pitch: 3, fov: 38 }), ESO],
  // the whole city's lifts
  [sa(46), cam({ x: 0, y: 0, z: -300, dist: 1700, yaw: 10, pitch: 15, fov: 40 }), EIO],
  [sa(48.2), cam({ x: 0, y: 0, z: -340, dist: 1900, yaw: 6, pitch: 16, fov: 40 }), LIN],
  // who pays: low in the garden, the jar in front
  [sa(49.6), cam({ x: 0, y: 34, z: 18, dist: 165, yaw: 6, pitch: -3, fov: 42 }), EIO],
  [sa(52.2), cam({ x: 0, y: 40, z: 14, dist: 175, yaw: 2, pitch: -1, fov: 42 }), LIN],
  // the vote: straight on, the tower filling the frame
  [sa(53.2), cam({ x: 0, y: 50, z: 0, dist: 205, yaw: 0, pitch: 2, fov: 38 }), EIO],
  [sa(56), cam({ x: 0, y: 50, z: 0, dist: 200, yaw: 0, pitch: 2, fov: 38 }), LIN],
  // the money's gone: down to the jar
  [sa(56.9), cam({ x: 0, y: 12, z: 34, dist: 62, yaw: 4, pitch: 8, fov: 40 }), EIO],
  [sa(58.1), cam({ x: 0, y: 11, z: 34, dist: 58, yaw: 2, pitch: 8, fov: 40 }), LIN],
  // the second vote, then the bars
  [sa(59.2), cam({ x: 0, y: 50, z: 0, dist: 215, yaw: -6, pitch: 2, fov: 38 }), EIO],
  [sa(64), cam({ x: 0, y: 52, z: 0, dist: 235, yaw: -2, pitch: 2, fov: 38 }), LIN],
  // rebuild: from the south-east, the walk-up next door in front
  [sa(65.4), cam({ x: 46, y: 26, z: 0, dist: 190, yaw: -26, pitch: 3, fov: 40 }), EIO],
  [sa(69.8), cam({ x: 42, y: 30, z: 0, dist: 182, yaw: -20, pitch: 3, fov: 40 }), LIN],
  // one more 33 floors on top: back and up
  [sa(71), cam({ x: 0, y: 98, z: 0, dist: 470, yaw: -6, pitch: 1, fov: 38 }), EIO],
  [sa(72.6), cam({ x: 0, y: 92, z: 0, dist: 460, yaw: -4, pitch: 1, fov: 38 }), LIN],
  // no way back: rise over the whole city of towers
  [sa(74.8), cam({ x: 0, y: 0, z: -200, dist: 2300, yaw: 4, pitch: 20, fov: 40 }), EIO],
  // the question: down again, slowly
  [sa(78), cam({ x: 0, y: 40, z: 0, dist: 700, yaw: 8, pitch: 8, fov: 38 }), ESO],
  [sb(1.5), cam({ x: 0, y: 50, z: 0, dist: 285, yaw: 4, pitch: 3, fov: 38 }), EIO],
  [sb(8), cam({ x: 0, y: 50, z: 0, dist: 255, yaw: -4, pitch: 3, fov: 38 }), LIN],
];

// back in China, after the map: the city from above as its edges go dark, then down to the hero at dawn
const KEYS2: Key[] = [
  [sb(35.5), cam({ x: 0, y: 0, z: 200, dist: 6200, yaw: 6, pitch: 20, fov: 40 })],
  [sb(43.5), cam({ x: 0, y: 0, z: -100, dist: 3600, yaw: 12, pitch: 14, fov: 40 }), LIN],
  [sb(47.8), cam({ x: 0, y: 40, z: 0, dist: 900, yaw: 10, pitch: 6, fov: 38 }), EIO],
  [sb(55.8), cam({ x: 0, y: 52, z: 0, dist: 330, yaw: 2, pitch: 2, fov: 38 }), ESO],
  [sb(64), cam({ x: -6, y: 60, z: 0, dist: 175, yaw: -6, pitch: 1, fov: 38 }), ESO],
];

// ---------- households ----------

// Move-in order: a fixed shuffle, so lights come on scattered through the tower.
const ORDER = Array.from({ length: 132 }, (_, i) => i).sort((a, b) => ((a * 0.6180339) % 1) - ((b * 0.6180339) % 1));
const RANK = new Array(132);
ORDER.forEach((h, k) => (RANK[h] = k));
// Who agrees to put money in again: 87 of 132 say yes (short of 99), in a scattered order.
const YES_ORDER = Array.from({ length: 132 }, (_, i) => i).sort((a, b) => ((a * 0.7548776 + 0.31) % 1) - ((b * 0.7548776 + 0.31) % 1));
const YES_RANK = new Array(132);
YES_ORDER.forEach((h, k) => (YES_RANK[h] = k));
export const YES_MAX = 87;
export const NEED = 99;
// Homes that go dark when people leave: a scatter, the low floors a little first.
const GONE_RANK = Array.from({ length: 132 }, (_, i) => i)
  .map((i) => ({ i, k: ((i * 0.41421356) % 1) * 0.8 + (Math.floor(i / 4) < 8 ? -0.2 : 0) }))
  .sort((a, b) => a.k - b.k)
  .reduce((acc, x, k) => ((acc[x.i] = k), acc), new Array(132) as number[]);

export const yesCount = (t: number) => Math.round(track(t, [[sa(59.0), 0], [sa(61.2), YES_MAX]], EO));
export const YOU = 81; // floor 20, second flat from the west

const households = (t: number) => {
  const a = new Float32Array(132 * 4);
  const moveIn = tween(t, sa(13.6), sa(15.8), 0, 132, LIN);
  const vote1 = win(t, sa(52.6), sa(56.2), 0.5);
  const vote1Rise = ramp(t, sa(52.8), sa(54.6), LIN);
  const yesN = yesCount(t);
  const vote2 = win(t, sa(58.9), sa(63.9), 0.5);
  // time-lapse while the years run: nights flicker past
  const lapse = t > sa(33) && t < sa(44);
  const nightSeed = lapse ? Math.floor(t / 0.18) : Math.floor(t / 7);
  const offShare = lapse ? 0.35 : 0.12;
  const gone = Math.round(
    track(t, [
      [sa(76.4), 0],
      [sa(77.8), 26],
      [sb(1), 26],
      [sb(7.5), 60],
      [sb(36), 60],
      [sb(46), 70],
      [sb(52), 74],
    ]),
  );
  for (let i = 0; i < 132; i++) {
    const floor = Math.floor(i / 4);
    let lit = RANK[i] < moveIn ? 1 : 0;
    if (((i * 0.37 + nightSeed * 0.1309) % 1) < offShare) lit = 0;
    let yes = 0;
    let no = 0;
    if (vote1 > 0) {
      if (floor < vote1Rise * 33) {
        if (floor < 11) no = vote1;
        else yes = vote1;
      }
    }
    if (vote2 > 0) {
      if (YES_RANK[i] < yesN) yes = vote2;
      else no = 0.55 * vote2 * ramp(t, sa(61.2), sa(61.8));
    }
    let g = GONE_RANK[i] < gone ? 1 : 0;
    if (g) lit = 0;
    if (i === YOU && t > sb(50)) {
      g = 0;
      lit = 1;
    }
    a.set([lit, yes, no, g], i * 4);
  }
  return a;
};

// Lift cars: each rides between random floors, pausing at stops.
export const liftY = (t: number, k: number) => {
  const period = 7 + k * 2.3;
  const ph = (t + k * 4.1) / period;
  const leg = Math.floor(ph);
  const f = ph - leg;
  const fl = (n: number) => Math.floor(((n * 0.7548776 + k * 0.3) % 1) * 33);
  const m = clamp01((f - 0.2) / 0.62);
  return lerp(fl(leg) * 3, fl(leg + 1) * 3, EIO(m));
};

// ---------- the world ----------

export const worldAt = (t: number): WorldState => {
  const main = t < sb(24) ? KEYS : KEYS2;

  // city lights: switch on in the hook; a few estates blink off at the question; out one by one at the end
  const lights = track(t, [
    [0, 0.18],
    [sa(3), 0.5],
    [sa(8), 0.56],
    [sa(44.5), 0.56],
    [sa(45.5), 0.3],
    [sa(48.2), 0.3],
    [sa(49), 0.56],
    [sb(36), 0.58],
    [sb(47.5), 0.5],
    [sb(52.5), 0.2],
    [sb(64), 0.16],
  ]);
  const patch = win(t, sa(6.6), sa(8.6), 0.35);
  // the ring of darkness closing in on the city (B36–B44)
  const darkR = track(t, [[sb(36), 8000], [sb(44), 2300]], EIO);
  const darkAmt = t >= sb(24) ? 0.95 : 0;
  // how much the rest of the city steps back behind the hero
  const heroShot = Math.max(win(t, sa(12), sa(44.4), 0.8), win(t, sa(48.6), sa(72), 0.8), win(t, sa(76), sb(8), 0.8), win(t, sb(48), sb(70), 1.2));
  const xrayMain = win(t, sa(20.4), sa(32.6), 1.0);
  const cityDim = 1 - 0.42 * heroShot - 0.38 * xrayMain;

  // the hero
  const built = ramp(t, sa(12.3), sa(13.7), EO);
  const xray = Math.max(xrayMain, win(t, sa(37.4), sa(40.4), 0.6) * 0.65, win(t, sa(40.6), sa(43.8), 0.5) * 0.8, win(t, sb(57), sb(64), 1.2) * 0.4);
  const age = track(t, [[sa(33), 0], [sa(44), 0.55], [sa(64), 0.6], [sb(1), 0.65], [sb(8), 1.0]], LIN);
  const water = track(t, [[sa(24.3), -2], [sa(27.4), HERO.h + 8]], EIO);
  let lifts: [number, number] = [liftY(t, 0), liftY(t, 1)];
  const flick = t > sa(41.2) && t < sa(43.6) ? (Math.sin(t * 37) > 0.25 ? 1 : 0.12) : 1;
  // the end: one car rises to the 21st floor and stops at "you"
  if (t > sb(57)) lifts = [tween(t, sb(58), sb(61.6), 0, 20 * 3, EIO), liftY(t, 1)];
  const stairs = ramp(t, sa(29.8), sa(31.8), LIN);

  const coinsT = tween(t, sa(49.6), sa(52.3), 0, 1, LIN);
  const tankLevel = track(t, [[sa(49.6), 0.02], [sa(52.6), 0.82], [sa(56.4), 0.82], [sa(57.7), 0.03]], EIO);
  const tankVis = win(t, sa(48.8), sa(58.8), 0.5);

  const oldVis = win(t, sa(64.4), sa(70.6), 0.4);
  const oldDrop = track(t, [[sa(66.2), 0], [sa(66.9), 1], [sa(67.2), 1], [sa(67.3), 0]], EI);
  const oldFloors = t < sa(67.1) ? 6 : tween(t, sa(67.2), sa(68.8), 0.2, 11, EO);
  const ghostVis = win(t, sa(70.5), sa(72.8), 0.35);
  const ghostLift = tween(t, sa(70.5), sa(71.6), 0, HERO.h, EO);
  const outline = Math.max(win(t, sa(72.7), sa(78.5), 0.8), win(t, sb(40), sb(49), 1.2));

  // camera; while the lifts are the subject, it follows car 0
  let c = camAt(t, main);
  const follow = win(t, sa(28.6), sa(31.4), 0.7);
  if (follow > 0) c = { ...c, y: lerp(c.y, lifts[0] + 2, follow * 0.85) };
  // a breath of drift so nothing is ever frozen
  c = { ...c, yaw: c.yaw + Math.sin(t * 0.21) * 0.6, pitch: c.pitch + Math.sin(t * 0.17 + 1) * 0.25 };

  // night falls in the hook; at the end, dawn comes
  const night = track(t, [[0, 0.55], [sa(9), 0.86], [sa(12), 0.92], [sb(47), 0.92], [sb(62), 0.5]]);

  return {
    cam: c,
    time: t,
    night,
    dim: ramp(t, 0, 0.6),
    site: 0,
    traffic: 1,
    bloom: 0.42,
    outline,
    city: {
      lights,
      patch,
      elev: win(t, sa(45.2), sa(48.6), 0.6),
      elevAge: tween(t, sa(46.6), sa(48.2), 0, 0.85, EIO),
      darkR,
      darkAmt,
      dim: cityDim,
      hideEast: true,
    },
    hero: {
      vis: 1,
      built,
      hh: households(t),
      age,
      xray,
      vote: Math.max(win(t, sa(52.6), sa(56.2), 0.5), win(t, sa(58.9), sa(63.9), 0.5)),
      water,
      lifts,
      stairs,
      line100: win(t, sa(16.8), sa(20.6), 0.5),
      refuge: win(t, sa(17.9), sa(20.2), 0.4),
      liftGlow: flick,
    },
    coins: { t: coinsT, vis: win(t, sa(49.6), sa(53), 0.3) },
    tank: { vis: tankVis, level: tankLevel },
    old: { vis: oldVis, floors: oldFloors, drop: oldDrop },
    ghost: { vis: ghostVis, lift: ghostLift },
  };
};

void tween;
void EO;
void ESO;
