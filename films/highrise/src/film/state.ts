// The world at every moment of the film: camera keys, the city, the hero tower (closed, cut open or X-rayed),
// its 132 households and 264 residents. Times are film bars F (timing.ts, SCRIPT.md); b(F) gives film seconds.
import { FH, HERO, UNITS } from "../world/city";
import { Cam, mixCam } from "../world/camera";
import { PEOPLE, WorldState } from "../world/engine";
import { clamp01, EI, EIO, EO, ESO, lerp, ramp, sf as b, track, tween, win } from "../timing";

const cam = (c: Partial<Cam>): Cam => ({ x: 0, y: 45, z: 0, dist: 240, yaw: 0, pitch: 4, fov: 36, ...c });
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

// a floor's centre height
export const yf = (f: number) => f * FH + 1.5;

const KEYS: Key[] = [
  // hook: a glide over the city, rising
  [b(0), cam({ x: -1100, y: 30, z: 2600, dist: 420, yaw: 14, pitch: 7, fov: 42 })],
  [b(6.2), cam({ x: -300, y: 60, z: 900, dist: 900, yaw: 8, pitch: 14, fov: 42 }), LIN],
  // dive to the hero
  [b(8), cam({ x: 0, y: 50, z: 0, dist: 250, yaw: -14, pitch: 3, fov: 38 }), EIO],
  [b(9.4), cam({ x: 0, y: 50, z: 0, dist: 240, yaw: -10, pitch: 3, fov: 38 }), LIN],
  // why so tall: low and side-on while it rises
  [b(10.2), cam({ x: 0, y: 46, z: 0, dist: 255, yaw: -50, pitch: 2, fov: 38 }), EIO],
  [b(13.8), cam({ x: 0, y: 56, z: 0, dist: 285, yaw: -58, pitch: 1, fov: 38 }), LIN],
  // a whole estate of the same height
  [b(15.6), cam({ x: 0, y: 60, z: -40, dist: 620, yaw: -24, pitch: 8, fov: 40 }), EIO],
  // the cut: straight on, the wall peeling from the top
  [b(16.6), cam({ x: 0, y: 52, z: 0, dist: 205, yaw: 0, pitch: 1, fov: 38 }), EIO],
  [b(19), cam({ x: 0, y: 50, z: 0, dist: 196, yaw: -3, pitch: 1, fov: 38 }), LIN],
  [b(22), cam({ x: 0, y: 50, z: 0, dist: 190, yaw: 3, pitch: 1, fov: 38 }), LIN],
  // noise: floors 8–22 around flat 58
  [b(24), cam({ x: 4, y: yf(14), z: 0, dist: 95, yaw: -4, pitch: 0, fov: 40 }), EIO],
  [b(28), cam({ x: 4, y: yf(14), z: 0, dist: 88, yaw: 4, pitch: 0, fov: 40 }), LIN],
  // 公摊: drift left, room for the plan on the right
  [b(29), cam({ x: 26, y: 42, z: 0, dist: 190, yaw: -6, pitch: 1, fov: 38 }), EIO],
  [b(32), cam({ x: 24, y: 44, z: 0, dist: 186, yaw: -2, pitch: 1, fov: 38 }), LIN],
  // the morning rush: the core and its queues
  [b(33), cam({ x: 0, y: yf(13), z: 0, dist: 78, yaw: -6, pitch: 1, fov: 42 }), EIO],
  [b(36), cam({ x: 0, y: yf(19), z: 0, dist: 84, yaw: 4, pitch: 1, fov: 42 }), LIN],
  // fire: back and to the side, the 50 m plane in the air
  [b(37), cam({ x: 0, y: 52, z: 0, dist: 300, yaw: 32, pitch: 6, fov: 40 }), EIO],
  [b(40), cam({ x: 0, y: 52, z: 0, dist: 290, yaw: 24, pitch: 6, fov: 40 }), LIN],
  // fifteen years: a slow arc while time flies
  [b(41.5), cam({ x: 0, y: 50, z: 0, dist: 250, yaw: 20, pitch: 4, fov: 38 }), EIO],
  [b(47.8), cam({ x: 0, y: 50, z: 0, dist: 235, yaw: -22, pitch: 4, fov: 38 }), LIN],
  // the machine
  [b(48.6), cam({ x: -4, y: 50, z: 0, dist: 205, yaw: -34, pitch: 4, fov: 38 }), EIO],
  [b(52), cam({ x: -4, y: 52, z: 0, dist: 196, yaw: -24, pitch: 4, fov: 38 }), LIN],
  // every lift in the city
  [b(53.4), cam({ x: 0, y: 0, z: -300, dist: 1800, yaw: 10, pitch: 15, fov: 40 }), EIO],
  [b(55.8), cam({ x: 0, y: 0, z: -340, dist: 2000, yaw: 6, pitch: 16, fov: 40 }), LIN],
  // the cost meter, then the jar in the garden
  [b(56.8), cam({ x: -14, y: 46, z: 10, dist: 230, yaw: 14, pitch: 4, fov: 40 }), EIO],
  [b(60), cam({ x: -10, y: 42, z: 14, dist: 215, yaw: 8, pitch: 3, fov: 40 }), LIN],
  [b(61), cam({ x: 0, y: 30, z: 18, dist: 170, yaw: 4, pitch: -2, fov: 42 }), EIO],
  [b(64), cam({ x: 0, y: 36, z: 14, dist: 175, yaw: 0, pitch: -1, fov: 42 }), LIN],
  // the vote: straight on, cut open again
  [b(64.8), cam({ x: 0, y: 50, z: 0, dist: 205, yaw: 0, pitch: 1, fov: 38 }), EIO],
  [b(72), cam({ x: 0, y: 50, z: 0, dist: 198, yaw: 0, pitch: 1, fov: 38 }), LIN],
  // nobody pays; the lifts stop; floor 11
  [b(75), cam({ x: 0, y: 46, z: 0, dist: 190, yaw: 6, pitch: 1, fov: 38 }), LIN],
  [b(77.2), cam({ x: -6, y: yf(10), z: 0, dist: 90, yaw: 6, pitch: 1, fov: 40 }), EIO],
  [b(80), cam({ x: -6, y: yf(10), z: 0, dist: 84, yaw: 2, pitch: 1, fov: 40 }), LIN],
  // (Florida: photographs, the world waits below)
  [b(87.6), cam({ x: 0, y: 46, z: 0, dist: 260, yaw: -6, pitch: 2, fov: 38 }), LIN],
  // rebuild: the walk-up next door
  [b(88.6), cam({ x: 60, y: 16, z: 0, dist: 112, yaw: -30, pitch: 4, fov: 46 }), EIO],
  [b(91.6), cam({ x: 54, y: 24, z: 0, dist: 128, yaw: -22, pitch: 3, fov: 46 }), LIN],
  // one more 33 floors on top
  [b(92.6), cam({ x: 0, y: 98, z: 0, dist: 470, yaw: -6, pitch: 1, fov: 38 }), EIO],
  [b(94.2), cam({ x: 0, y: 92, z: 0, dist: 460, yaw: -4, pitch: 1, fov: 38 }), LIN],
  // no way back: up over the whole city
  [b(96), cam({ x: 0, y: 0, z: -200, dist: 2300, yaw: 4, pitch: 20, fov: 40 }), EIO],
  // passing the baton: in again, cut open
  [b(97.6), cam({ x: 0, y: 50, z: 0, dist: 215, yaw: 4, pitch: 1, fov: 38 }), EIO],
  [b(104), cam({ x: 0, y: 50, z: 0, dist: 200, yaw: -4, pitch: 1, fov: 38 }), LIN],
  // the people grow old
  [b(107), cam({ x: 0, y: 50, z: 0, dist: 190, yaw: -2, pitch: 1, fov: 38 }), LIN],
  [b(109.6), cam({ x: 0, y: 50, z: 0, dist: 230, yaw: 6, pitch: 2, fov: 38 }), LIN],
  // the answer: over the city as its edges go dark
  [b(112.6), cam({ x: 0, y: 0, z: 0, dist: 6200, yaw: 8, pitch: 40, fov: 42 }), EIO],
  [b(116.2), cam({ x: 0, y: 0, z: 0, dist: 5600, yaw: 16, pitch: 36, fov: 42 }), LIN],
  // dawn, the tower, "you"
  [b(118.4), cam({ x: 0, y: 50, z: 0, dist: 300, yaw: 6, pitch: 3, fov: 38 }), EIO],
  [b(121.5), cam({ x: -6, y: 60, z: 0, dist: 150, yaw: -4, pitch: 1, fov: 38 }), ESO],
];

// ---------- households ----------

const shuffle = (k: number, off: number) =>
  Array.from({ length: 132 }, (_, i) => i)
    .sort((a, c) => ((a * k + off) % 1) - ((c * k + off) % 1))
    .reduce((acc, h, r) => ((acc[h] = r), acc), new Array(132) as number[]);
const RANK_LIT = shuffle(0.6180339, 0.1);
const RANK_YES = shuffle(0.7548776, 0.31);
const RANK_PAY = shuffle(0.41421356, 0.77);
const RANK_GO = shuffle(0.2360679, 0.53);
export const YES_MAX = 87;
export const NEED = 99;
export const NOISE_SRC = 58; // floor 14, the third flat
export const YOU = 81; // floor 20, the second flat
export const OLDIE = 42; // floor 10 (the 11th floor), the third flat
export const yesCount = (t: number) => Math.round(track(t, [[b(69), 0], [b(71.4), YES_MAX]], EO));
const vote1Of = (t: number) => win(t, b(64.9), b(68.8), 0.4);

// how the flats change hands in the second interlude
export const passShares = (t: number) => {
  const p = ramp(t, b(97.5), b(103.5), LIN);
  return { rented: Math.round(lerp(0, 46, p)), sub: Math.round(lerp(0, 18, ramp(t, b(99.5), b(103.5), LIN))), empty: Math.round(lerp(0, 30, ramp(t, b(100.5), b(104), LIN))) };
};

const households = (t: number) => {
  const a = new Float32Array(132 * 4);
  const a2 = new Float32Array(132 * 4);
  const lapse = t > b(41.5) && t < b(47.6);
  const nightSeed = lapse ? Math.floor(t / 0.2) : Math.floor(t / 6);
  const offShare = lapse ? 0.4 : 0.1;
  const vote1 = vote1Of(t);
  const rise1 = ramp(t, b(65.2), b(67), LIN);
  const yesN = yesCount(t);
  const vote2 = win(t, b(68.9), b(72), 0.4);
  const unpaid = win(t, b(72.2), b(80.2), 0.5) * ramp(t, b(72.2), b(74), LIN);
  const unpaidN = Math.round(132 * 0.29 * unpaid);
  const pass = passShares(t);
  const passOn = t > b(97.4);
  const fire = win(t, b(37.2), b(40.4), 0.4);
  const nOn = win(t, b(24.3), b(28.4), 0.3);
  const srcF = Math.floor(NOISE_SRC / 4);
  const srcU = NOISE_SRC % 4;
  for (let i = 0; i < 132; i++) {
    const fl = Math.floor(i / 4);
    const un = i % 4;
    let lit = ((i * 0.37 + nightSeed * 0.1309) % 1) < offShare ? 0 : 1;
    let yes = 0;
    let no = 0;
    let gone = 0;
    let tenant = 0;
    let sub = 0;
    let noise = 0;
    let mark = 0;
    if (vote1 > 0 && fl < rise1 * 33) {
      if (fl < 11) no = vote1;
      else yes = vote1;
    }
    if (vote2 > 0) {
      if (RANK_YES[i] < yesN) yes = vote2;
      else no = 0.5 * vote2 * ramp(t, b(71.4), b(71.9));
    }
    if (RANK_PAY[i] < unpaidN) gone = 0.55;
    if (passOn) {
      const r = RANK_GO[i];
      if (r < pass.empty) {
        gone = 1;
        lit = 0;
      } else if (r < pass.empty + pass.sub) {
        sub = 1;
        lit = 1;
      } else if (r < pass.empty + pass.sub + pass.rented) tenant = 1;
    }
    if (nOn > 0) {
      const d = Math.abs(fl - srcF) + Math.abs(un - srcU) * 0.6;
      const ph = (t - b(24.3)) * 2.2 - d * 0.32;
      const s = Math.sin(ph * Math.PI * 2);
      noise = nOn * (ph > 0 ? Math.max(0, s) * Math.max(0, s) : 0) * Math.exp(-d * 0.13);
      if (i === NOISE_SRC) noise = nOn * (0.6 + 0.4 * Math.abs(Math.sin(t * 18)));
    }
    if (fire > 0 && fl * FH > 50) noise = Math.max(noise, 0.28 * fire);
    const oldie = win(t, b(77.4), b(80.2), 0.4);
    if (i === OLDIE && oldie > 0) {
      mark = oldie;
      lit = 1;
      gone = 0;
    }
    if (i === YOU && t > b(119)) {
      mark = ramp(t, b(119.5), b(120.5));
      lit = 1;
      gone = 0;
      sub = 0;
    }
    if (lit === 0 && RANK_LIT[i] > 125 && !lapse && !passOn) lit = 1;
    a.set([lit, yes, no, gone], i * 4);
    a2.set([tenant, sub, noise, mark], i * 4);
  }
  return { a, a2 };
};

// ---------- people ----------

const h1 = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
// Each flat has two residents at home, drifting a little. In the rush (F32.4–36.6) they walk to the lift core,
// queue, and are picked up.
const peopleAt = (t: number, hh: Float32Array) => {
  const out = new Float32Array(PEOPLE * 4);
  const rushT = t - b(32.4);
  const rushOn = t > b(32.4) && t < b(36.6);
  const back = ramp(t, b(36.6), b(37.2), LIN);
  const queues = new Map<string, number>();
  for (let p = 0; p < PEOPLE; p++) {
    const u = p >> 1;
    const fl = Math.floor(u / 4);
    const k = u % 4;
    const [x0, x1] = UNITS[k];
    const hx = lerp(x0 + 1.4, x1 - 1.4, h1(p * 3.1));
    const hz = lerp(-2.6, 4.2, h1(p * 7.7));
    const y = fl * FH + 0.14;
    const drift = Math.sin(t * 0.4 + p) * 0.35;
    let x = hx + drift;
    let z = hz;
    let s = 1;
    const lit = hh[u * 4];
    const gone = hh[u * 4 + 3];
    if (gone > 0.9) s = 0;
    if (p % 2 === 1 && lit < 0.5) s = 0;
    if (t > b(36.6) && t < b(37.2)) s *= back;
    if (rushOn && fl > 0) {
      const start = h1(p * 1.7) * 1.4;
      const walk = clamp01((rushT - start) / 1.2);
      const side = k < 2 ? -1 : 1;
      const key = `${fl}:${side}`;
      const qi = queues.get(key) ?? 0;
      queues.set(key, qi + 1);
      const qx = side * (2.2 + qi * 0.62);
      x = lerp(hx, qx, EIO(walk));
      z = lerp(hz, 3.6, EIO(walk));
      const board = start + 1.8 + h1(p * 5.3) * 1.2 + (fl / 33) * 1.6;
      if (rushT > board) s = Math.max(0, 1 - (rushT - board) / 0.25);
    }
    out.set([x, y, z, s], p * 4);
  }
  return out;
};

// Lift cars: ride between random floors; in the rush they run fast.
export const liftY = (t: number, k: number, fast = 0) => {
  const period = lerp(7 + k * 2.3, 2.6 + k * 0.5, fast);
  const ph = (t + k * 4.1) / period;
  const leg = Math.floor(ph);
  const f = ph - leg;
  const fl = (n: number) => Math.floor(((n * 0.7548776 + k * 0.3) % 1) * 33);
  const m = clamp01((f - 0.2) / 0.62);
  return lerp(fl(leg) * FH, fl(leg + 1) * FH, EIO(m));
};

// ---------- the world ----------

export const worldAt = (t: number): WorldState => {
  const lights = track(t, [
    [0, 0.2],
    [b(3), 0.52],
    [b(8), 0.56],
    [b(53), 0.56],
    [b(53.8), 0.3],
    [b(56), 0.3],
    [b(56.8), 0.56],
    [b(112), 0.58],
    [b(118), 0.42],
    [b(124), 0.3],
  ]);
  const heroShot = Math.max(win(t, b(8), b(53), 0.8), win(t, b(56.6), b(95), 0.8), win(t, b(97), b(112), 0.8), win(t, b(117.5), b(130), 0.8));
  const openShot = Math.max(win(t, b(16.4), b(40.4), 0.8), win(t, b(64.4), b(80.4), 0.6), win(t, b(96.8), b(112.4), 0.8), win(t, b(119), b(130), 0.8));
  const darkR = track(t, [[b(112.4), 7000], [b(116.4), 1500]], EIO);
  const darkAmt = t >= b(110) ? 0.95 : 0;
  const patch = win(t, b(4.6), b(6.4), 0.35);

  const built = t < b(9.6) ? 1 : track(t, [[b(9.6), 1], [b(10.2), 0.18], [b(10.6), 0.18], [b(13.4), 1]], EIO);
  const peel = Math.max(
    t < b(41.6) ? track(t, [[b(16.2), 0], [b(18.6), 1], [b(40.2), 1], [b(41.4), 0]], EIO) : 0,
    t > b(64.2) && t < b(80.6) ? track(t, [[b(64.2), 0], [b(64.9), 1], [b(80), 1], [b(80.5), 0]], EIO) : 0,
    t > b(96.6) && t < b(112.7) ? track(t, [[b(96.6), 0], [b(97.6), 1], [b(112), 1], [b(112.6), 0]], EIO) : 0,
    t > b(118.8) ? ramp(t, b(118.8), b(120), EIO) : 0,
  );
  const xray = win(t, b(48.3), b(53.2), 0.6);
  const age = track(t, [[b(41.5), 0], [b(47.6), 0.55], [b(64), 0.6], [b(96), 0.7], [b(112), 0.85]], LIN);
  const water = track(t, [[b(48.6), -2], [b(50.6), HERO.h + 8]], EIO);
  const rushFast = win(t, b(32.4), b(36.6), 0.5);
  let lifts: [number, number] = [liftY(t, 0, rushFast), liftY(t, 1, rushFast)];
  const stopped = win(t, b(75.2), b(80.2), 0.2);
  if (stopped > 0) lifts = [lerp(lifts[0], 0, stopped), lerp(lifts[1], 0, stopped)];
  if (t > b(119)) lifts = [tween(t, b(119.4), b(121.6), 0, 20 * FH, EIO), liftY(t, 1)];
  const liftGlow = 1 - stopped * 0.92;
  const liftsFront = Math.max(win(t, b(19), b(24), 0.5), win(t, b(32.2), b(36.8), 0.4), win(t, b(75), b(80.2), 0.4), win(t, b(119), b(130), 0.6));
  const stairs = ramp(t, b(75.6), b(77.2), LIN) * win(t, b(75.4), b(80.2), 0.3);

  const { a: hh, a2: hh2 } = households(t);
  const pos = peopleAt(t, hh);

  const coinsT = tween(t, b(60.2), b(62.8), 0, 1, LIN);
  const tankVis = win(t, b(56.8), b(64.2), 0.5);
  const tankLevel = track(t, [[b(56.8), 0.02], [b(60.2), 0.02], [b(63), 0.34]], EIO);

  const oldVis = win(t, b(88.2), b(92.6), 0.4);
  const oldDrop = track(t, [[b(89.2), 0], [b(89.9), 1], [b(90.2), 1], [b(90.3), 0]], EI);
  const oldFloors = t < b(90.1) ? 6 : tween(t, b(90.2), b(91.6), 0.2, 11, EO);
  const ghostVis = win(t, b(92.4), b(94.6), 0.35);
  const ghostLift = tween(t, b(92.4), b(93.4), 0, HERO.h, EO);
  const outline = Math.max(win(t, b(8.1), b(9.8), 0.4), win(t, b(94.5), b(97.4), 0.6), win(t, b(112.4), b(117.4), 0.8));

  let c = camAt(t, KEYS);
  c = { ...c, yaw: c.yaw + Math.sin(t * 0.21) * 0.5, pitch: c.pitch + Math.sin(t * 0.17 + 1) * 0.2 };

  const lapse = win(t, b(41.6), b(47.4), 0.6);
  const lapseNight = 0.72 + 0.2 * Math.cos(((t - b(41.6)) / 1.4) * Math.PI * 2);
  let night = track(t, [[0, 0.5], [b(8), 0.86], [b(12), 0.9], [b(115), 0.9], [b(123), 0.5]]);
  night = lerp(night, lapseNight, lapse);

  return {
    cam: c,
    time: t,
    night,
    dim: ramp(t, 0, 0.6),
    traffic: 1,
    bloom: 0.42,
    outline,
    city: {
      lights,
      patch,
      elev: win(t, b(53.4), b(56.4), 0.6),
      elevAge: tween(t, b(54.6), b(56), 0, 0.85, EIO),
      darkR,
      darkAmt,
      dim: 1 - 0.45 * heroShot - 0.2 * openShot,
      hideEast: true,
    },
    hero: {
      vis: 1,
      built,
      hh,
      hh2,
      age,
      xray,
      vote: Math.max(vote1Of(t), win(t, b(68.9), b(72), 0.4)),
      peel,
      water,
      lifts,
      liftGlow,
      liftsFront,
      stairs,
      line100: win(t, b(12.2), b(14.4), 0.5),
      refuge: win(t, b(12.6), b(14.4), 0.4),
      fire: win(t, b(37.2), b(40.4), 0.4),
    },
    people: { pos, vis: peel > 0.5 ? 1 : 0, grey: ramp(t, b(104.2), b(107.5), LIN) * (t < b(118.8) ? 1 : 0) },
    coins: { t: coinsT, vis: win(t, b(60.2), b(63.4), 0.3) },
    tank: { vis: tankVis, level: tankLevel },
    old: { vis: oldVis, floors: oldFloors, drop: oldDrop },
    ghost: { vis: ghostVis, lift: ghostLift },
  };
};
