// The world at every moment of the film: camera keys, the city, the hero tower (closed, cut open or X-rayed),
// its 128 households (floor 0 is the lobby) and their residents. Times are film bars F (timing.ts, SCRIPT.md);
// b(F) gives film seconds.
import { FH, HERO, UNITS } from "../world/city";
import { Cam, mixCam } from "../world/camera";
import { PEOPLE, WorldState } from "../world/engine";
import { clamp01, EIO, EO, ESO, lerp, ramp, sf as b, track, tween, win } from "../timing";

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
export const yf = (f: number) => f * FH + 1.5;

// ---------- the hook: fifty years in five seconds, then back ----------
export const HOOK_END = b(2.6); // 2060 reached
export const REWIND = [b(3.4), b(4.4)] as const; // back to 2010 while the camera pulls out
export const hookYear = (t: number) => (t < REWIND[0] ? Math.round(lerp(2010, 2060, ramp(t, 0.15, HOOK_END, (x) => x * (0.6 + 0.4 * x)))) : Math.round(lerp(2060, 2010, ramp(t, REWIND[0], REWIND[1], EIO))));

const KEYS: Key[] = [
  // hook: close on the cut-open tower, pushing in while the years fly
  [0, cam({ x: -4, y: 66, z: 0, dist: 100, yaw: -16, pitch: -2, fov: 40 })],
  [b(2.4), cam({ x: 0, y: 52, z: 0, dist: 168, yaw: -8, pitch: 1, fov: 40 }), ESO],
  [b(3.3), cam({ x: 0, y: 52, z: 0, dist: 160, yaw: -5, pitch: 1, fov: 40 }), LIN],
  // rewind: pull out fast over the city
  [b(4.6), cam({ x: 0, y: 0, z: -300, dist: 2400, yaw: 6, pitch: 16, fov: 42 }), EIO],
  [b(7.6), cam({ x: -200, y: 0, z: -250, dist: 2700, yaw: 12, pitch: 18, fov: 42 }), LIN],
  // down to the tower
  [b(9.2), cam({ x: 0, y: 50, z: 0, dist: 245, yaw: -12, pitch: 3, fov: 38 }), EIO],
  // why so tall: side-on while it rises
  [b(10.2), cam({ x: 0, y: 46, z: 0, dist: 255, yaw: -50, pitch: 2, fov: 38 }), EIO],
  [b(13.8), cam({ x: 0, y: 56, z: 0, dist: 285, yaw: -58, pitch: 1, fov: 38 }), LIN],
  [b(15.6), cam({ x: 0, y: 60, z: -40, dist: 620, yaw: -24, pitch: 8, fov: 40 }), EIO],
  // the cut
  [b(16.6), cam({ x: 0, y: 52, z: 0, dist: 205, yaw: 0, pitch: 1, fov: 38 }), EIO],
  [b(19), cam({ x: 0, y: 50, z: 0, dist: 196, yaw: -3, pitch: 1, fov: 38 }), LIN],
  [b(22), cam({ x: 0, y: 50, z: 0, dist: 190, yaw: 3, pitch: 1, fov: 38 }), LIN],
  // noise around flat 58
  [b(24), cam({ x: 4, y: yf(14), z: 0, dist: 92, yaw: -4, pitch: 0, fov: 40 }), EIO],
  [b(27.5), cam({ x: 4, y: yf(14), z: 0, dist: 86, yaw: 4, pitch: 0, fov: 40 }), LIN],
  // 公摊
  [b(28.3), cam({ x: 26, y: 42, z: 0, dist: 190, yaw: -6, pitch: 1, fov: 38 }), EIO],
  [b(31), cam({ x: 24, y: 44, z: 0, dist: 186, yaw: -2, pitch: 1, fov: 38 }), LIN],
  // the rush
  [b(31.8), cam({ x: 0, y: yf(13), z: 0, dist: 78, yaw: -6, pitch: 1, fov: 42 }), EIO],
  [b(34.5), cam({ x: 0, y: yf(19), z: 0, dist: 84, yaw: 4, pitch: 1, fov: 42 }), LIN],
  // the ladder
  [b(35.4), cam({ x: 0, y: 52, z: 0, dist: 300, yaw: 32, pitch: 6, fov: 40 }), EIO],
  [b(38), cam({ x: 0, y: 52, z: 0, dist: 290, yaw: 24, pitch: 6, fov: 40 }), LIN],
  // fifteen years: the machine ages
  [b(39.2), cam({ x: -4, y: 50, z: 0, dist: 215, yaw: -30, pitch: 4, fov: 38 }), EIO],
  [b(43.6), cam({ x: -4, y: 52, z: 0, dist: 200, yaw: -16, pitch: 4, fov: 38 }), LIN],
  // every lift in the city
  [b(44.8), cam({ x: 0, y: 0, z: -300, dist: 1800, yaw: 10, pitch: 15, fov: 40 }), EIO],
  [b(46.8), cam({ x: 0, y: 0, z: -340, dist: 2000, yaw: 6, pitch: 16, fov: 40 }), LIN],
  // three ledgers: back to the tower
  [b(48.3), cam({ x: 0, y: 50, z: 0, dist: 260, yaw: 8, pitch: 4, fov: 38 }), EIO],
  // money: the cost meter on the right
  [b(49.6), cam({ x: -16, y: 48, z: 0, dist: 230, yaw: 14, pitch: 4, fov: 40 }), EIO],
  [b(52.8), cam({ x: -12, y: 46, z: 0, dist: 222, yaw: 8, pitch: 4, fov: 40 }), LIN],
  // the jar in the garden
  [b(53.6), cam({ x: -6, y: 30, z: 18, dist: 175, yaw: 6, pitch: -2, fov: 42 }), EIO],
  [b(60.3), cam({ x: -4, y: 34, z: 14, dist: 168, yaw: 0, pitch: -1, fov: 42 }), LIN],
  // prices: the tower small on the left
  [b(61.2), cam({ x: 34, y: 60, z: 0, dist: 330, yaw: -4, pitch: 3, fov: 40 }), EIO],
  [b(64), cam({ x: 30, y: 58, z: 0, dist: 320, yaw: 0, pitch: 3, fov: 40 }), LIN],
  // rules: the vote
  [b(64.8), cam({ x: 0, y: 50, z: 0, dist: 205, yaw: 0, pitch: 1, fov: 38 }), EIO],
  [b(69), cam({ x: 0, y: 50, z: 0, dist: 198, yaw: 0, pitch: 1, fov: 38 }), LIN],
  // the managers leave (grid on the right): pull back a little
  [b(69.6), cam({ x: -18, y: 50, z: 0, dist: 260, yaw: 6, pitch: 2, fov: 38 }), EIO],
  [b(72), cam({ x: -16, y: 50, z: 0, dist: 252, yaw: 2, pitch: 2, fov: 38 }), LIN],
  // 柳州: floor 11
  [b(72.8), cam({ x: -6, y: yf(10), z: 0, dist: 90, yaw: 6, pitch: 1, fov: 40 }), EIO],
  [b(76), cam({ x: -6, y: yf(10), z: 0, dist: 84, yaw: 2, pitch: 1, fov: 40 }), LIN],
  // elsewhere: the city behind the cards
  [b(77), cam({ x: 0, y: 0, z: -200, dist: 1500, yaw: 4, pitch: 12, fov: 42 }), EIO],
  [b(80), cam({ x: 0, y: 0, z: -240, dist: 1600, yaw: 10, pitch: 13, fov: 42 }), LIN],
  // people: cut open again
  [b(81), cam({ x: 0, y: 50, z: 0, dist: 215, yaw: 4, pitch: 1, fov: 38 }), EIO],
  [b(88), cam({ x: 0, y: 50, z: 0, dist: 200, yaw: -4, pitch: 1, fov: 38 }), LIN],
  [b(92), cam({ x: -10, y: 50, z: 0, dist: 205, yaw: -2, pitch: 1, fov: 38 }), LIN],
  [b(96), cam({ x: -14, y: 50, z: 0, dist: 230, yaw: 6, pitch: 2, fov: 38 }), LIN],
  // the answer: over the city, quiet
  [b(98), cam({ x: 0, y: 0, z: 0, dist: 3600, yaw: 8, pitch: 22, fov: 42 }), EIO],
  [b(104), cam({ x: 0, y: 0, z: 0, dist: 4200, yaw: 14, pitch: 28, fov: 42 }), LIN],
  // the climax: the edges go dark
  [b(110), cam({ x: 0, y: 0, z: 0, dist: 6200, yaw: 20, pitch: 38, fov: 42 }), LIN],
  // dawn, the tower, "you"
  [b(112.4), cam({ x: 0, y: 50, z: 0, dist: 320, yaw: 6, pitch: 3, fov: 38 }), EIO],
  [b(116), cam({ x: 0, y: 52, z: 0, dist: 280, yaw: 0, pitch: 3, fov: 38 }), LIN],
  [b(120.5), cam({ x: -6, y: 60, z: 0, dist: 150, yaw: -4, pitch: 1, fov: 38 }), ESO],
];

// ---------- households ----------

const shuffle = (k: number, off: number) =>
  Array.from({ length: 132 }, (_, i) => i)
    .sort((a, c) => ((a * k + off) % 1) - ((c * k + off) % 1))
    .reduce((acc, h, r) => ((acc[h] = r), acc), new Array(132) as number[]);
const RANK_LIT = shuffle(0.6180339, 0.1);
const RANK_YES = shuffle(0.7548776, 0.31);
const RANK_GO = shuffle(0.2360679, 0.53);
export const HOMES = 128;
export const NEED = 96; // three quarters of 128
export const YES_MAX = 85;
export const NOISE_SRC = 58; // floor 14, the third flat
export const YOU = 81; // floor 20, the second flat
export const OLDIE = 42; // floor 10 (the 11th floor), the third flat
export const yesCount = (t: number) => Math.round(track(t, [[b(66.4), 0], [b(68.6), YES_MAX]], EO));

export const passShares = (t: number) => {
  const p = ramp(t, b(81.6), b(87.6), LIN);
  return { rented: Math.round(lerp(0, 46, p)), sub: Math.round(lerp(0, 18, ramp(t, b(83.4), b(87.6), LIN))), empty: Math.round(lerp(0, 28, ramp(t, b(84.4), b(88), LIN))) };
};

const sm = (x: number) => x * x * (3 - 2 * x);

const households = (t: number) => {
  const a = new Float32Array(132 * 4);
  const a2 = new Float32Array(132 * 4);
  // hook: each home fades out at its own moment, then fades back during the rewind
  const hookK = ramp(t, 0.4, HOOK_END, LIN);
  const backK = ramp(t, REWIND[0], REWIND[1], LIN);
  const vote1 = win(t, b(64.9), b(66.3), 0.3);
  const rise1 = ramp(t, b(65), b(66), LIN);
  const yesN = yesCount(t);
  const vote2 = win(t, b(66.3), b(69.4), 0.4);
  const pass = passShares(t);
  const passOn = t > b(81.5) && t < b(112);
  const fire = win(t, b(35.6), b(38.4), 0.4);
  const nOn = win(t, b(24.3), b(28.2), 0.3);
  const srcF = Math.floor(NOISE_SRC / 4);
  const srcU = NOISE_SRC % 4;
  for (let i = 0; i < 132; i++) {
    const fl = Math.floor(i / 4);
    const un = i % 4;
    let lit = RANK_LIT[i] < 14 ? 0 : 1; // a few homes out on any night, always the same ones
    let yes = 0;
    let no = 0;
    let gone = 0;
    let tenant = 0;
    let sub = 0;
    let noise = 0;
    let mark = 0;
    if (t < REWIND[1]) {
      const at = RANK_GO[i] / 132;
      const out = sm(clamp01((hookK - at * 0.92) / 0.08));
      const back = sm(clamp01((backK - (1 - at) * 0.9) / 0.1));
      const k = out * (1 - back);
      if (RANK_GO[i] > 118) {
        lit = 1; // a few stay to the end
      } else {
        gone = k;
        lit = 1 - k;
      }
      if (RANK_GO[i] > 100 && RANK_GO[i] <= 118) tenant = k;
    }
    if (vote1 > 0 && fl < rise1 * 33 && fl > 0) {
      if (fl < 11) no = vote1;
      else yes = vote1;
    }
    if (vote2 > 0 && fl > 0) {
      if (RANK_YES[i] < yesN + 4) yes = vote2;
      else no = 0.5 * vote2 * ramp(t, b(68.6), b(69.1));
    }
    if (passOn) {
      const r = RANK_GO[i];
      const fadeIn = (n: number, len: number) => clamp01((n - r) / 1.5 + 0.0) * (len > 0 ? 1 : 0);
      if (r < pass.empty) {
        gone = fadeIn(pass.empty, 1);
        lit = 1 - gone;
      } else if (r < pass.empty + pass.sub) sub = 1;
      else if (r < pass.empty + pass.sub + pass.rented) tenant = 1;
    }
    if (nOn > 0) {
      const d = Math.abs(fl - srcF) + Math.abs(un - srcU) * 0.6;
      const ph = (t - b(24.3)) * 2.2 - d * 0.32;
      const s = Math.sin(ph * Math.PI * 2);
      noise = nOn * (ph > 0 ? Math.max(0, s) * Math.max(0, s) : 0) * Math.exp(-d * 0.13);
      if (i === NOISE_SRC) noise = nOn * 0.85;
    }
    if (fire > 0 && fl * FH > 50) noise = Math.max(noise, 0.28 * fire);
    const oldie = win(t, b(72.9), b(76.2), 0.4);
    if (i === OLDIE && oldie > 0) {
      mark = oldie;
      lit = 1;
      gone = 0;
    }
    if (i === YOU && t > b(117)) {
      mark = ramp(t, b(117.6), b(118.6));
      lit = 1;
      gone = 0;
      sub = 0;
      tenant = 0;
    }
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
const peopleAt = (t: number, hh: Float32Array) => {
  const out = new Float32Array(PEOPLE * 4);
  const rushT = t - b(31.6);
  const rushOn = t > b(31.6) && t < b(35);
  const queues = new Map<string, number>();
  for (let p = 0; p < PEOPLE; p++) {
    const u = p >> 1;
    const fl = Math.floor(u / 4);
    const k = u % 4;
    const [x0, x1] = UNITS[k];
    const hx = lerp(x0 + 1.4, x1 - 1.4, h1(p * 3.1));
    const hz = lerp(-2.6, 4.2, h1(p * 7.7));
    const y = fl * FH + 0.17;
    let x = hx + Math.sin(t * 0.35 + p) * 0.3;
    let z = hz;
    const lit = hh[u * 4];
    const gone = hh[u * 4 + 3];
    let s = fl === 0 ? 0 : clamp01(1 - gone * 1.5);
    if (p % 2 === 1) s *= clamp01(lit * 1.5 - 0.3);
    if (rushOn && fl > 0) {
      const start = h1(p * 1.7) * 1.2;
      const walk = clamp01((rushT - start) / 1.1);
      const side = k < 2 ? -1 : 1;
      const key = `${fl}:${side}`;
      const qi = queues.get(key) ?? 0;
      queues.set(key, qi + 1);
      x = lerp(hx, side * (2.3 + qi * 0.62), EIO(walk));
      z = lerp(hz, 3.6, EIO(walk));
      const board = start + 1.6 + h1(p * 5.3) * 1.0 + (fl / 33) * 1.4;
      if (rushT > board) s *= clamp01(1 - (rushT - board) / 0.3);
    }
    if (t > b(35) && t < b(35.6)) s *= ramp(t, b(35), b(35.6), LIN);
    out.set([x, y, z, s], p * 4);
  }
  return out;
};

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
    [0, 0.5],
    [b(4.4), 0.56],
    [b(44.6), 0.56],
    [b(45.2), 0.3],
    [b(47.2), 0.3],
    [b(48), 0.56],
    [b(98), 0.58],
    [b(110), 0.5],
    [b(116), 0.36],
    [b(124), 0.3],
  ]);
  const heroShot = Math.max(win(t, 0, b(4.2), 0.3), win(t, b(8.8), b(44.4), 0.8), win(t, b(47.6), b(76.6), 0.8), win(t, b(80.6), b(97.6), 0.8), win(t, b(112), b(130), 0.8));
  const openShot = Math.max(win(t, 0, b(4.0), 0.3), win(t, b(16.4), b(38.6), 0.8), win(t, b(64.4), b(76.4), 0.6), win(t, b(80.8), b(97.4), 0.8), win(t, b(117), b(130), 0.8));
  const darkR = track(t, [[b(104), 7000], [b(110), 1500]], EIO);
  const darkAmt = t >= b(103) && t < b(112.2) ? 0.95 : t >= b(112.2) ? 0.6 : 0;

  // the tower: open in the hook, closed for its story, open again for the people chapters
  const built = t < b(9.6) ? 1 : track(t, [[b(9.6), 1], [b(10.2), 0.18], [b(10.6), 0.18], [b(13.4), 1]], EIO);
  const peel = Math.max(
    t < b(4.6) ? 1 - ramp(t, b(3.9), b(4.5), EIO) : 0,
    t > b(16) && t < b(39) ? track(t, [[b(16.2), 0], [b(18.6), 1], [b(38.2), 1], [b(38.9), 0]], EIO) : 0,
    t > b(64.2) && t < b(76.6) ? track(t, [[b(64.2), 0], [b(64.9), 1], [b(76), 1], [b(76.5), 0]], EIO) : 0,
    t > b(80.6) && t < b(97.8) ? track(t, [[b(80.6), 0], [b(81.4), 1], [b(97), 1], [b(97.6), 0]], EIO) : 0,
    t > b(116.8) ? ramp(t, b(116.8), b(118), EIO) : 0,
  );
  const xray = win(t, b(39.3), b(44.6), 0.6);
  const hookAge = t < REWIND[1] ? ramp(t, 0.3, HOOK_END, LIN) * (1 - ramp(t, REWIND[0], REWIND[1], EIO)) : 0;
  const age = Math.max(hookAge * 0.95, track(t, [[b(39.3), 0], [b(43.6), 0.55], [b(64), 0.6], [b(80), 0.7], [b(97), 0.85]], LIN));
  const water = track(t, [[b(39.6), -2], [b(41.4), HERO.h + 8]], EIO);
  const rushFast = win(t, b(31.6), b(35), 0.5);
  let lifts: [number, number] = [liftY(t, 0, rushFast), liftY(t, 1, rushFast)];
  const hookStop = t < REWIND[1] ? ramp(t, b(1.6), b(2.4), LIN) * (1 - ramp(t, REWIND[0], REWIND[1], LIN)) : 0;
  const stopped = Math.max(win(t, b(73), b(76.2), 0.2), hookStop);
  if (stopped > 0) lifts = [lerp(lifts[0], 0, stopped), lerp(lifts[1], 0, stopped)];
  if (t > b(117)) lifts = [tween(t, b(117.2), b(119.6), 0, 20 * FH, EIO), liftY(t, 1)];
  const liftGlow = 1 - stopped * 0.92;
  const liftsFront = Math.max(win(t, 0, b(4), 0.3), win(t, b(19), b(24), 0.5), win(t, b(31.4), b(35.2), 0.4), win(t, b(72.8), b(76.2), 0.4), win(t, b(117), b(130), 0.6));
  const stairs = 0;

  const { a: hh, a2: hh2 } = households(t);
  const pos = peopleAt(t, hh);

  // money: a year of fees rains into the jar; maintenance drains it; a lift replacement takes a big bite
  const coinsT = tween(t, b(53.8), b(56.2), 0, 1, LIN);
  const tankVis = win(t, b(53.5), b(61), 0.5);
  const tankLevel = track(t, [[b(53.6), 0.02], [b(56.4), 0.7], [b(57.2), 0.7], [b(57.9), 0.42], [b(58.4), 0.85], [b(59.6), 0.85], [b(60.4), 0.48]], EIO);

  let c = camAt(t, KEYS);
  c = { ...c, yaw: c.yaw + Math.sin(t * 0.21) * 0.5, pitch: c.pitch + Math.sin(t * 0.17 + 1) * 0.2 };

  const lapse = win(t, b(39.4), b(43.6), 0.6);
  const lapseNight = 0.74 + 0.18 * Math.cos(((t - b(39.4)) / 1.6) * Math.PI * 2);
  let night = track(t, [[0, 0.82], [b(4.4), 0.88], [b(110), 0.9], [b(121), 0.5]]);
  night = lerp(night, lapseNight, lapse);

  return {
    cam: c,
    time: t,
    night,
    dim: 1,
    traffic: 1,
    bloom: 0.42,
    outline: Math.max(win(t, b(8.6), b(9.8), 0.4), win(t, b(98), b(112), 0.8)),
    city: {
      lights,
      patch: 0,
      elev: win(t, b(44.8), b(47.6), 0.6),
      elevAge: tween(t, b(45.6), b(47), 0, 0.85, EIO),
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
      vote: Math.max(vote1Of(t), win(t, b(66.3), b(69.4), 0.4)),
      peel,
      water,
      lifts,
      liftGlow,
      liftsFront,
      stairs,
      line100: win(t, b(12.2), b(14.4), 0.5),
      refuge: win(t, b(12.6), b(14.4), 0.4),
      fire: win(t, b(35.6), b(38.4), 0.4),
    },
    people: { pos, vis: peel > 0.5 ? 1 : 0, grey: ramp(t, b(88.2), b(91.6), LIN) * (t < b(116.8) ? 1 : 0) },
    coins: { t: coinsT, vis: win(t, b(53.8), b(56.6), 0.3) },
    tank: { vis: tankVis, level: tankLevel },
  };
};

const vote1Of = (t: number) => win(t, b(64.9), b(66.3), 0.3);
