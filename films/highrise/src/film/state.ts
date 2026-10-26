// The world at every moment of the film: camera keys and the state of the city, the hero and the far sites.
// Times are film seconds from the music grid (sa = A bars, sb = B bars, see timing.ts and SCRIPT.md).
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

// ---------- the main-city camera ----------

const HERO_FRONT = cam({ x: 0, y: 46, z: 0, dist: 245, yaw: 0, pitch: 5, fov: 36 });

const KEYS: Key[] = [
  // hook: a low glide over the city from the river, northwards
  [0, cam({ x: -900, y: 40, z: 2500, dist: 520, yaw: 12, pitch: 9, fov: 40 })],
  [sa(9), cam({ x: -260, y: 60, z: 820, dist: 760, yaw: 6, pitch: 12, fov: 40 }), (x) => x],
  // dive to the hero
  [sa(12), cam({ x: 0, y: 48, z: 0, dist: 300, yaw: -6, pitch: 4, fov: 36 }), EIO],
  [sa(16), cam({ x: 0, y: 50, z: 0, dist: 262, yaw: -12, pitch: 5, fov: 36 })],
  // 33 floors and the 100 m line: a little lower, looking up
  [sa(17), cam({ x: 0, y: 62, z: 0, dist: 290, yaw: -8, pitch: 2, fov: 36 })],
  [sa(20), cam({ x: 0, y: 60, z: 0, dist: 280, yaw: -4, pitch: 2, fov: 36 })],
  // X-ray: three-quarter view
  [sa(22), cam({ x: -4, y: 50, z: 0, dist: 215, yaw: -32, pitch: 5, fov: 36 })],
  [sa(27.5), cam({ x: -8, y: 54, z: 0, dist: 205, yaw: -40, pitch: 6, fov: 36 })],
  // lifts and the stairs: closer on the core
  [sa(29), cam({ x: 3, y: 52, z: -3, dist: 150, yaw: -30, pitch: 3, fov: 38 })],
  [sa(32), cam({ x: 3, y: 60, z: -3, dist: 145, yaw: -24, pitch: 2, fov: 38 })],
  // ageing: a slow arc round the front
  [sa(34), cam({ x: 0, y: 50, z: 0, dist: 230, yaw: -18, pitch: 4, fov: 36 })],
  [sa(44), cam({ x: 0, y: 50, z: 0, dist: 215, yaw: 16, pitch: 5, fov: 36 }), (x) => x],
  // the whole city's lifts
  [sa(46), cam({ x: 0, y: 0, z: -300, dist: 1700, yaw: 10, pitch: 15, fov: 40 }), EIO],
  [sa(48), cam({ x: 0, y: 0, z: -340, dist: 1900, yaw: 6, pitch: 16, fov: 40 })],
  // who pays: back at the hero, the jar in the garden
  [sa(49.5), cam({ x: 0, y: 40, z: 10, dist: 250, yaw: 6, pitch: 7, fov: 38 }), EIO],
  [sa(52), cam({ x: 0, y: 44, z: 6, dist: 236, yaw: 2, pitch: 6, fov: 38 })],
  // the vote: straight on
  [sa(53), cam({ x: 0, y: 50, z: 0, dist: 232, yaw: 0, pitch: 4, fov: 36 })],
  [sa(58), cam({ x: 0, y: 50, z: 0, dist: 226, yaw: 0, pitch: 4, fov: 36 })],
  [sa(64), cam({ x: 0, y: 52, z: 0, dist: 250, yaw: -3, pitch: 4, fov: 36 })],
  // rebuild: the walk-up next door comes into frame
  [sa(65.5), cam({ x: 36, y: 34, z: 0, dist: 255, yaw: -10, pitch: 6, fov: 38 }), EIO],
  [sa(69.5), cam({ x: 40, y: 38, z: 0, dist: 245, yaw: -14, pitch: 6, fov: 38 })],
  // one more 33-floor tower on top: pull back and up
  [sa(71), cam({ x: 0, y: 96, z: 0, dist: 470, yaw: -4, pitch: 3, fov: 38 }), EIO],
  [sa(74), cam({ x: 0, y: 70, z: 0, dist: 430, yaw: 0, pitch: 3, fov: 38 })],
  // the fall: in again, slowly
  [sa(78), cam({ x: 0, y: 50, z: 0, dist: 300, yaw: 4, pitch: 4, fov: 36 })],
  [sb(8), cam({ x: 0, y: 50, z: 0, dist: 270, yaw: 10, pitch: 4, fov: 36 }), (x) => x],
];

// back in China, after the map: the city from above, then down to the hero
const KEYS2: Key[] = [
  [sb(35), cam({ x: 0, y: 0, z: -200, dist: 5200, yaw: 8, pitch: 30, fov: 40 })],
  [sb(40), cam({ x: 0, y: 0, z: -260, dist: 3600, yaw: 14, pitch: 24, fov: 40 })],
  [sb(47), cam({ x: 0, y: 20, z: -100, dist: 2400, yaw: 20, pitch: 17, fov: 40 }), (x) => x],
  [sb(50), cam({ x: 0, y: 50, z: 0, dist: 330, yaw: 6, pitch: 4, fov: 36 }), EIO],
  [sb(56), cam({ x: 0, y: 52, z: 0, dist: 285, yaw: 0, pitch: 4, fov: 36 })],
  [sb(64), cam({ x: 0, y: 58, z: 0, dist: 205, yaw: -6, pitch: 3, fov: 36 }), (x) => x],
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
// Homes that go dark when people leave, worst first: the low floors and a random scatter.
const GONE_RANK = Array.from({ length: 132 }, (_, i) => i)
  .map((i) => ({ i, k: ((i * 0.41421356) % 1) * 0.8 + (Math.floor(i / 4) < 8 ? -0.2 : 0) }))
  .sort((a, b) => a.k - b.k)
  .reduce((acc, x, k) => ((acc[x.i] = k), acc), new Array(132) as number[]);

export const yesCount = (t: number) => Math.round(track(t, [[sa(58.3), 0], [sa(61), YES_MAX]], EO));

const households = (t: number) => {
  const a = new Float32Array(132 * 4);
  const moveIn = tween(t, sa(13.4), sa(15.6), 0, 132, (x) => x);
  const vote1 = win(t, sa(52.6), sa(56.2), 0.5);
  const vote1Rise = ramp(t, sa(52.6), sa(54.4), (x) => x);
  const yesN = yesCount(t);
  const vote2 = win(t, sa(58.2), sa(64), 0.5);
  const gone = Math.round(
    track(t, [
      [sa(76), 0],
      [sa(77.5), 30],
      [sb(2), 30],
      [sb(7.5), 58],
      [sb(36), 58],
      [sb(48), 52],
    ]),
  );
  for (let i = 0; i < 132; i++) {
    const floor = Math.floor(i / 4);
    let lit = RANK[i] < moveIn ? 1 : 0;
    // nights vary: a few homes off at any moment
    if (((i * 0.37 + Math.floor(t / 7) * 0.13) % 1) < 0.12) lit *= 0.0;
    let yes = 0;
    let no = 0;
    if (vote1 > 0) {
      const reach = vote1Rise * 33;
      if (floor < reach) {
        if (floor < 11) no = vote1;
        else yes = vote1;
      }
    }
    if (vote2 > 0) {
      if (YES_RANK[i] < yesN) yes = vote2;
      else no = 0.35 * vote2 * ramp(t, sa(61), sa(62));
    }
    let g = GONE_RANK[i] < gone ? 1 : 0;
    if (g) lit = 0;
    // the home of the last shot stays lit
    if (i === 81 && t > sb(55)) {
      g = 0;
      lit = 1;
    }
    a.set([lit, yes, no, g], i * 4);
  }
  return a;
};

// Lift cars: each rides between random floors, pausing at stops.
const liftY = (t: number, k: number) => {
  const period = 9 + k * 2.3;
  const ph = (t + k * 4.1) / period;
  const leg = Math.floor(ph);
  const f = ph - leg;
  const fl = (n: number) => Math.floor(((n * 0.7548776 + k * 0.3) % 1) * 33);
  const a = fl(leg) * 3;
  const b = fl(leg + 1) * 3;
  const m = clamp01((f - 0.25) / 0.6);
  return lerp(a, b, EIO(m));
};

// ---------- the world ----------

export const worldAt = (t: number): WorldState => {
  // which place: the main city, Pruitt-Igoe (B8–B16), 美孚新邨 (B16–B24)
  const site: 0 | 1 | 2 = t >= sb(8) && t < sb(16) ? 1 : t >= sb(16) && t < sb(24) ? 2 : 0;
  const main = t < sb(24) ? KEYS : KEYS2;

  // hook lights: the city switches on as we glide in; a few estates blink off at the question
  const lights0 = track(t, [[0, 0.18], [sa(3), 0.5], [sa(8), 0.56]]);
  const patch = win(t, sa(6.6), sa(8.6), 0.35);
  // late city: the ring of darkness closing in (B36–B40), lights at the end
  const darkR = track(t, [[sb(35), 9000], [sb(40.5), 2600], [sb(48), 2400]], EIO);
  const darkAmt = t >= sb(24) ? 0.92 : 0;

  // the hero
  const built = ramp(t, sa(12.2), sa(13.4), EO);
  const xray = Math.max(win(t, sa(20.4), sa(32.6), 1.0) * 1, win(t, sa(36.3), sa(43.7), 0.7) * 0.75, win(t, sb(57), sb(64), 1.0) * 0.35);
  const age = track(t, [[sa(33), 0], [sa(44), 0.45], [sa(64), 0.5], [sb(0), 0.55], [sb(8), 0.95], [sb(48), 0.8]], (x) => x);
  const water = track(t, [[sa(24.3), -2], [sa(27.4), HERO.h + 8]], EIO);
  let lifts: [number, number] = [liftY(t, 0), liftY(t, 1)];
  // the 15-year-old lift flickers
  const flick = t > sa(41) && t < sa(43.5) ? (Math.sin(t * 37) > 0.2 ? 1 : 0.15) : 1;
  // final: one car rises to the 21st floor
  if (t > sb(57)) lifts = [tween(t, sb(58), sb(62), 0, 20 * 3, EIO), liftY(t, 1)];
  const stairs = ramp(t, sa(29.6), sa(31.8), (x) => x);

  const coinsT = tween(t, sa(49.4), sa(52.2), 0, 1, (x) => x);
  const tankLevel = track(t, [[sa(49.4), 0.02], [sa(52.4), 0.82], [sa(56.1), 0.82], [sa(57.4), 0.04]], EIO);
  const tankVis = win(t, sa(48.6), sa(58.6), 0.5);

  const oldVis = win(t, sa(64.6), sa(70.4), 0.4);
  const oldDrop = track(t, [[sa(66.0), 0], [sa(66.7), 1], [sa(67.0), 1], [sa(67.1), 0]], EI);
  const oldFloors = t < sa(66.9) ? 6 : tween(t, sa(67.0), sa(68.6), 0.2, 11, EO);
  const ghostVis = win(t, sa(70.2), sa(72.6), 0.4);
  const ghostLift = tween(t, sa(70.2), sa(71.4), 0, HERO.h, EO);

  // camera
  let c = camAt(t, main);
  // a breath of drift so nothing is ever frozen
  c = { ...c, yaw: c.yaw + Math.sin(t * 0.21) * 0.6, pitch: c.pitch + Math.sin(t * 0.17 + 1) * 0.25 };

  // Pruitt-Igoe and 美孚新邨 cameras
  if (site === 1) {
    const k = clamp01((t - sb(8)) / (sb(16) - sb(8)));
    c = mixCam(cam({ x: 30000 + 40, y: 0, z: 0, dist: 980, yaw: 28, pitch: 20, fov: 38 }), cam({ x: 30000 + 20, y: 10, z: 20, dist: 620, yaw: 18, pitch: 13, fov: 38 }), ESO(k));
  }
  if (site === 2) {
    const k = clamp01((t - sb(16)) / (sb(24) - sb(16)));
    c = mixCam(cam({ x: -30000 + 40, y: 40, z: 60, dist: 1250, yaw: 182, pitch: 9, fov: 38 }), cam({ x: -30000 + 10, y: 45, z: 40, dist: 900, yaw: 176, pitch: 8, fov: 38 }), ESO(k));
  }

  const night = track(t, [[0, 0.55], [sa(9), 0.82], [sa(12), 0.86]]);
  const fadeIn = ramp(t, 0, 0.6);

  const pruittLights = track(t, [[sb(8), 0.86], [sb(10.6), 0.86], [sb(12.4), 0.22], [sb(13.4), 0.12]]);
  const pruittDrop = (i: number) => {
    const t0 = sb(13.5) + ((i * 0.6180339) % 1) * 1.8;
    return ramp(t, t0, t0 + 1.4, EI);
  };
  const dust = clamp01((t - sb(13.5)) / 0.6) * (1 - clamp01((t - sb(15.4)) / 1.2));

  return {
    cam: c,
    time: t,
    night,
    dim: fadeIn,
    site,
    traffic: 1,
    bloom: 0.42,
    city: {
      lights: t < sa(9) ? lights0 : t < sb(24) ? 0.58 : 0.6,
      patch,
      elev: win(t, sa(45.2), sa(48.6), 0.6),
      elevAge: tween(t, sa(46.5), sa(48.2), 0, 0.85, EIO),
      darkR,
      darkAmt,
      dim: Math.max(0.25, 1 - 0.7 * Math.max(win(t, sa(20.4), sa(32.6), 1.0), win(t, sa(36.3), sa(43.7), 0.7) * 0.6)),
      hideEast: oldVis > 0,
    },
    hero: {
      vis: 1,
      built,
      hh: households(t),
      age,
      xray: xray,
      vote: Math.max(win(t, sa(52.6), sa(56.2), 0.5), win(t, sa(58.2), sa(64), 0.5)),
      water,
      lifts,
      stairs,
      line100: win(t, sa(16.6), sa(20.6), 0.5),
      refuge: win(t, sa(17.6), sa(19.8), 0.4),
      liftGlow: flick,
    } as WorldState["hero"],
    coins: { t: coinsT, vis: win(t, sa(49.4), sa(53), 0.3) },
    tank: { vis: tankVis, level: tankLevel },
    old: { vis: oldVis, floors: oldFloors, drop: oldDrop },
    ghost: { vis: ghostVis, lift: ghostLift },
    pruitt: { lights: pruittLights, drop: pruittDrop, dust },
    meifoo: { lights: 0.93 },
  };
};
