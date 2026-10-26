// The world at every moment of the film (v8, SCRIPT.md): camera keys, the city, the hero tower (closed, cut open
// or X-rayed), its 128 households (floor 0 is the lobby) and their residents, the fire props. Times are film bars
// F (timing.ts); b(F) gives film seconds.
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

// ---------- the beats (film bars) ----------
export const T = {
  hookDark: [0.12, 2.3] as const, // floors go dark from the top, down to floor 7
  hookX: 2.5, // X-ray: lifts stopped, people on the stairs
  hookOut: 6.3, // pull out over the city
  machine: 8.0,
  walkup: 11.5,
  cutPower: 12.3,
  village: 14.6,
  noise: 16.9,
  rush: 18.2,
  crack: 19.5,
  fire: 21.8,
  hk: 23.0,
  nanjing: 24.5,
  ladder: 27.6,
  fireSys: 29.8,
  alarmsAge: 31.0,
  shanghai: 32.3,
  quote: 33.7,
  ageing: 35.6,
  lifts: 39.6,
  japan: 42.1,
  money: 44.5,
  fees: 45.8,
  feeCut: 48.6,
  unpaid: 50.4,
  fund: 52.1,
  drain: 53.9,
  refill: 55.6,
  why: 57.7,
  archive: 59.0,
  owners: 65.7,
  vote: 68.1,
  stop: 72.5,
  exodus: 75.1,
  leave: 77.7,
  ageOwners: 83.1,
  births: 86.7,
  climax: 90.3,
  dark: [92.1, 96.6] as const,
  answer: 97.7,
  lift: 104.4,
  goes: 109.8,
  hundred: 113.2,
  you: 117.1,
  sources: 121,
  end: 122.3,
};

const KEYS: Key[] = [
  // hook: close on the top of the tower (right of the title), tilting down as the floors go dark
  [0, cam({ x: -2, y: 80, z: 0, dist: 118, yaw: -14, pitch: -7, fov: 40, ox: 1330, oy: 520 })],
  [b(2.3), cam({ x: 0, y: 40, z: 0, dist: 150, yaw: -8, pitch: -3, fov: 40, ox: 1330, oy: 560 }), ESO],
  [b(3.0), cam({ x: 0, y: 50, z: 0, dist: 232, yaw: -16, pitch: 1, fov: 38, ox: 1420, oy: 560 }), EIO],
  [b(6.2), cam({ x: 0, y: 52, z: 0, dist: 222, yaw: -8, pitch: 1, fov: 38, ox: 1420, oy: 560 }), LIN],
  // the city
  [b(7.3), cam({ x: 0, y: 0, z: -300, dist: 2400, yaw: 6, pitch: 16, fov: 42 }), EIO],
  [b(7.9), cam({ x: -60, y: 0, z: -290, dist: 2500, yaw: 8, pitch: 17, fov: 42 }), LIN],
  // the machine (X-ray, three-quarter view, low in the frame under the headline)
  [b(8.9), cam({ x: 0, y: 50, z: 0, dist: 252, yaw: -28, pitch: 3, fov: 38, oy: 640 }), EIO],
  [b(11.4), cam({ x: 0, y: 52, z: 0, dist: 240, yaw: -14, pitch: 3, fov: 38, oy: 640 }), LIN],
  // the walk-up beside it (both on the right, the type on the left)
  [b(12.1), cam({ x: 33, y: 40, z: 0, dist: 230, yaw: -4, pitch: 3, fov: 40, ox: 1340, oy: 600 }), EIO],
  [b(14.3), cam({ x: 33, y: 42, z: 0, dist: 222, yaw: 0, pitch: 3, fov: 40, ox: 1340, oy: 600 }), LIN],
  // cut open: a village stood on end
  [b(15.2), cam({ x: 0, y: 51, z: 0, dist: 206, yaw: 0, pitch: 1, fov: 38, oy: 640 }), EIO],
  [b(16.7), cam({ x: 0, y: 50, z: 0, dist: 198, yaw: 3, pitch: 1, fov: 38, oy: 640 }), LIN],
  [b(17.3), cam({ x: 4, y: yf(14), z: 0, dist: 96, yaw: -4, pitch: 0, fov: 40, ox: 1300 }), EIO],
  [b(18.1), cam({ x: 4, y: yf(14), z: 0, dist: 90, yaw: 3, pitch: 0, fov: 40, ox: 1300 }), LIN],
  [b(18.6), cam({ x: 0, y: yf(15), z: 0, dist: 112, yaw: -6, pitch: 1, fov: 42 }), EIO],
  [b(19.4), cam({ x: 0, y: yf(18), z: 0, dist: 116, yaw: 4, pitch: 1, fov: 42 }), LIN],
  [b(20.0), cam({ x: 0, y: 48, z: 0, dist: 214, yaw: -4, pitch: 1, fov: 38, ox: 1320, oy: 560 }), EIO],
  [b(21.6), cam({ x: 0, y: 50, z: 0, dist: 208, yaw: 2, pitch: 1, fov: 38, ox: 1320, oy: 560 }), LIN],
  // fire: low and wide, looking up, under the headline
  [b(22.4), cam({ x: 0, y: 58, z: 0, dist: 330, yaw: -10, pitch: -6, fov: 40, oy: 700 }), EIO],
  [b(24.3), cam({ x: 0, y: 60, z: 0, dist: 300, yaw: -4, pitch: -6, fov: 40, oy: 700 }), LIN],
  // 南京: the cut-open tower, smoke climbing the core
  [b(25.0), cam({ x: 0, y: 28, z: 0, dist: 150, yaw: -4, pitch: 0, fov: 40, ox: 1360 }), EIO],
  [b(27.3), cam({ x: 0, y: 66, z: 0, dist: 170, yaw: 3, pitch: 0, fov: 40, ox: 1360 }), ESO],
  // the ladder truck, from the front left
  [b(28.2), cam({ x: -12, y: 40, z: 14, dist: 235, yaw: -38, pitch: 2, fov: 40, ox: 1250, oy: 580 }), EIO],
  [b(29.7), cam({ x: -10, y: 44, z: 12, dist: 228, yaw: -30, pitch: 2, fov: 40, ox: 1250, oy: 580 }), LIN],
  // the fire systems in X-ray
  [b(30.4), cam({ x: 0, y: 50, z: 0, dist: 222, yaw: -22, pitch: 3, fov: 38, ox: 1320, oy: 560 }), EIO],
  [b(32.2), cam({ x: 0, y: 50, z: 0, dist: 214, yaw: -12, pitch: 3, fov: 38, ox: 1320, oy: 560 }), LIN],
  [b(35.4), cam({ x: 0, y: 50, z: 0, dist: 260, yaw: -4, pitch: 3, fov: 38, ox: 1200, oy: 560 }), LIN],
  // ageing: time-lapse
  [b(36.2), cam({ x: -4, y: 50, z: 0, dist: 220, yaw: -30, pitch: 4, fov: 38, ox: 1150, oy: 540 }), EIO],
  [b(39.4), cam({ x: -4, y: 52, z: 0, dist: 202, yaw: -16, pitch: 4, fov: 38, ox: 1150, oy: 540 }), LIN],
  // every lift in the city
  [b(40.4), cam({ x: 0, y: 0, z: -300, dist: 1800, yaw: 10, pitch: 15, fov: 40 }), EIO],
  [b(42.0), cam({ x: 0, y: 0, z: -330, dist: 1950, yaw: 7, pitch: 16, fov: 40 }), LIN],
  [b(44.3), cam({ x: 0, y: 0, z: -360, dist: 2100, yaw: 3, pitch: 17, fov: 40 }), LIN],
  // money: the tower and its garden
  [b(45.2), cam({ x: 0, y: 44, z: 12, dist: 262, yaw: 8, pitch: 3, fov: 38, oy: 680 }), EIO],
  [b(46.3), cam({ x: 0, y: 50, z: 0, dist: 300, yaw: -2, pitch: 3, fov: 40, ox: 1040, oy: 580 }), EIO],
  [b(50.2), cam({ x: 0, y: 50, z: 0, dist: 292, yaw: 3, pitch: 3, fov: 40, ox: 1040, oy: 580 }), LIN],
  [b(50.9), cam({ x: 0, y: 50, z: 0, dist: 206, yaw: 0, pitch: 1, fov: 38, ox: 1300, oy: 560 }), EIO],
  [b(52.0), cam({ x: 0, y: 50, z: 0, dist: 200, yaw: 2, pitch: 1, fov: 38, ox: 1300, oy: 560 }), LIN],
  [b(52.7), cam({ x: -6, y: 30, z: 18, dist: 176, yaw: 6, pitch: -2, fov: 42, ox: 1250 }), EIO],
  [b(57.4), cam({ x: -4, y: 33, z: 14, dist: 168, yaw: 0, pitch: -1, fov: 42, ox: 1250 }), LIN],
  // why: the city, soft
  [b(58.4), cam({ x: 0, y: 0, z: -200, dist: 1500, yaw: 4, pitch: 12, fov: 42 }), EIO],
  [b(65.4), cam({ x: 0, y: 0, z: -240, dist: 1640, yaw: 12, pitch: 13, fov: 42 }), LIN],
  // owners: cut open, right of the type
  [b(66.3), cam({ x: 0, y: 50, z: 0, dist: 212, yaw: 4, pitch: 1, fov: 38, ox: 1300, oy: 560 }), EIO],
  [b(67.9), cam({ x: 0, y: 50, z: 0, dist: 206, yaw: 1, pitch: 1, fov: 38, ox: 1300, oy: 560 }), LIN],
  // the vote: tower in the middle, the tally on the right
  [b(68.6), cam({ x: 0, y: 50, z: 0, dist: 240, yaw: 0, pitch: 1, fov: 38, ox: 1000, oy: 560 }), EIO],
  [b(72.3), cam({ x: 0, y: 50, z: 0, dist: 232, yaw: -2, pitch: 1, fov: 38, ox: 1000, oy: 560 }), LIN],
  // the lifts stop
  [b(73.0), cam({ x: 0, y: 38, z: 0, dist: 140, yaw: -5, pitch: 0, fov: 40, ox: 1330 }), EIO],
  [b(74.9), cam({ x: 0, y: 42, z: 0, dist: 132, yaw: 3, pitch: 0, fov: 40, ox: 1330 }), LIN],
  // managers leave: tower in the middle, grid right
  [b(75.6), cam({ x: 0, y: 50, z: 0, dist: 285, yaw: -2, pitch: 2, fov: 40, ox: 1000, oy: 560 }), EIO],
  [b(77.4), cam({ x: 0, y: 50, z: 0, dist: 278, yaw: 2, pitch: 2, fov: 40, ox: 1000, oy: 560 }), LIN],
  // who leaves: cut open again, the legend on the right
  [b(78.3), cam({ x: 0, y: 50, z: 0, dist: 262, yaw: 2, pitch: 1, fov: 38, ox: 1000, oy: 560 }), EIO],
  [b(86.4), cam({ x: 0, y: 50, z: 0, dist: 252, yaw: -3, pitch: 1, fov: 38, ox: 1000, oy: 560 }), LIN],
  [b(90.0), cam({ x: 0, y: 50, z: 0, dist: 268, yaw: -6, pitch: 2, fov: 38, ox: 1000, oy: 560 }), LIN],
  // the climax: closed tower, low; the floors go dark from the top
  [b(91.0), cam({ x: 0, y: 56, z: 0, dist: 260, yaw: -8, pitch: -4, fov: 40, ox: 1250, oy: 560 }), EIO],
  [b(96.6), cam({ x: 0, y: 40, z: 0, dist: 236, yaw: 2, pitch: -2, fov: 40, ox: 1250, oy: 600 }), ESO],
  // the answer: over the city, the edges go dark
  [b(98.6), cam({ x: 0, y: 0, z: 0, dist: 3600, yaw: 8, pitch: 22, fov: 42 }), EIO],
  [b(104.2), cam({ x: 0, y: 0, z: 0, dist: 5200, yaw: 16, pitch: 32, fov: 42 }), LIN],
  // dawn, the tower under the lines, "you"
  [b(106.2), cam({ x: 0, y: 50, z: 0, dist: 330, yaw: 6, pitch: 3, fov: 38, oy: 760 }), EIO],
  [b(113.0), cam({ x: 0, y: 52, z: 0, dist: 300, yaw: 0, pitch: 3, fov: 38, oy: 760 }), LIN],
  [b(116.8), cam({ x: 0, y: 54, z: 0, dist: 262, yaw: -3, pitch: 2, fov: 38, oy: 700 }), LIN],
  [b(120.8), cam({ x: -6, y: 60, z: 0, dist: 150, yaw: -4, pitch: 1, fov: 38, oy: 640 }), ESO],
];

// ---------- households ----------

const shuffle = (k: number, off: number) =>
  Array.from({ length: 132 }, (_, i) => i)
    .sort((a, c) => ((a * k + off) % 1) - ((c * k + off) % 1))
    .reduce((acc, h, r) => ((acc[h] = r), acc), new Array(132) as number[]);
const RANK_LIT = shuffle(0.6180339, 0.1);
const RANK_YES = shuffle(0.7548776, 0.31);
const RANK_GO = shuffle(0.2360679, 0.53);
const RANK_PAY = shuffle(0.4142135, 0.17);
export const HOMES = 128;
export const NEED = 96; // three quarters of 128 (if every household votes)
export const YES_MAX = 85;
export const NOISE_SRC = 58; // floor 14, the third flat
export const YOU = 81; // floor 20, the second flat
export const yesCount = (t: number) => Math.round(track(t, [[b(T.vote + 0.6), 0], [b(T.vote + 2.6), YES_MAX]], EO));

export const passShares = (t: number) => {
  const p = ramp(t, b(T.leave + 0.3), b(T.leave + 4.6), LIN);
  return { rented: Math.round(lerp(0, 46, p)), sub: Math.round(lerp(0, 18, ramp(t, b(T.leave + 1.6), b(T.leave + 4.8), LIN))), empty: Math.round(lerp(0, 28, ramp(t, b(T.leave + 2.6), b(T.leave + 5.2), LIN))) };
};

const sm = (x: number) => x * x * (3 - 2 * x);

// How many floors are dark from the top, over [t0, t1], down to floor `keep` + 1. Each flat fades on its own.
const fromTop = (t: number, t0: number, t1: number, fl: number, un: number, keep = 6) => {
  const n = lerp(0, 32 - keep, ramp(t, t0, t1, (x) => x * (0.75 + 0.25 * x)));
  const idx = 32 - fl + un * 0.18;
  return fl > keep ? sm(clamp01(n - idx + 0.5)) : 0;
};

const households = (t: number) => {
  const a = new Float32Array(132 * 4);
  const a2 = new Float32Array(132 * 4);
  const a3 = new Float32Array(132 * 4);
  const vote1 = win(t, b(T.vote), b(T.vote + 1.3), 0.3);
  const rise1 = ramp(t, b(T.vote + 0.1), b(T.vote + 1.0), LIN);
  const yesN = yesCount(t);
  const vote2 = win(t, b(T.vote + 1.3), b(T.stop + 0.2), 0.4);
  const pass = passShares(t);
  const passOn = t > b(T.leave) && t < b(T.climax + 0.6);
  const nOn = win(t, b(T.noise), b(T.rush - 0.1), 0.3);
  const srcF = Math.floor(NOISE_SRC / 4);
  const srcU = NOISE_SRC % 4;
  const hookBack = ramp(t, b(6.6), b(7.6), LIN);
  const powerOn = win(t, b(T.cutPower), b(T.village - 0.3), 0.5);
  const crackGo = ramp(t, b(T.crack + 1.1), b(T.crack + 2.0), LIN);
  const crackBack = ramp(t, b(T.fire), b(T.fire + 0.5), LIN);
  const smokeLv = track(t, [[b(T.nanjing + 0.4), -3], [b(T.nanjing + 2.6), HERO.h + 3]], EIO);
  const smokeOn = win(t, b(T.nanjing), b(T.ladder + 0.2), 0.4);
  const unpaidOn = win(t, b(T.unpaid + 0.3), b(T.fund), 0.4);
  const climaxBack = ramp(t, b(T.lift + 0.4), b(T.lift + 2.0), LIN);
  for (let i = 0; i < 132; i++) {
    const fl = Math.floor(i / 4);
    const un = i % 4;
    let lit = RANK_LIT[i] < 12 ? 0 : 1; // a few homes out on any night, always the same ones
    let yes = 0;
    let no = 0;
    let gone = 0;
    let tenant = 0;
    let sub = 0;
    let noise = 0;
    let mark = 0;
    let unpaid = 0;
    let smoke = 0;
    let cold = 0;
    // hook: the floors go dark from the top; they light again while we fly over the city
    if (t < b(7.6)) {
      const k = fromTop(t, b(T.hookDark[0]), b(T.hookDark[1]), fl, un) * (1 - hookBack);
      lit = Math.max(0, lit - k);
      cold = k;
    }
    // power cut beside the walk-up
    if (powerOn > 0 && fl > 6) {
      lit *= 1 - powerOn;
      cold = Math.max(cold, powerOn);
    }
    // 哈尔滨: the homes above the cut empty, upward
    if (fl >= 3 && fl <= 21 && t > b(T.crack) && t < b(T.fire + 0.6)) {
      const k = sm(clamp01((crackGo * 19 - (fl - 3)) / 2)) * (1 - crackBack);
      gone = Math.max(gone, k);
      lit *= 1 - k;
    }
    if (vote1 > 0 && fl < rise1 * 33 && fl > 0) {
      if (fl < 11) no = vote1;
      else yes = vote1;
    }
    if (vote2 > 0 && fl > 0) {
      if (RANK_YES[i] < yesN + 4) yes = vote2;
      else no = 0.5 * vote2 * ramp(t, b(T.vote + 2.6), b(T.vote + 3.1));
    }
    if (passOn) {
      const r = RANK_GO[i];
      if (r < pass.empty) {
        gone = clamp01((pass.empty - r) / 1.5);
        lit = 1 - gone;
      } else if (r < pass.empty + pass.sub) sub = 1;
      else if (r < pass.empty + pass.sub + pass.rented) tenant = 1;
    }
    if (nOn > 0) {
      const d = Math.abs(fl - srcF) + Math.abs(un - srcU) * 0.6;
      const ph = (t - b(T.noise)) * 2.2 - d * 0.32;
      const s = Math.sin(ph * Math.PI * 2);
      noise = nOn * (ph > 0 ? Math.max(0, s) * Math.max(0, s) : 0) * Math.exp(-d * 0.13);
      if (i === NOISE_SRC) noise = nOn * 0.85;
    }
    // 南京: smoke spills into the flats either side of the core, up to the smoke's height
    if (smokeOn > 0 && (un === 1 || un === 2)) smoke = smokeOn * 0.75 * clamp01((smokeLv - fl * FH) / 6);
    if (smokeOn > 0 && (un === 0 || un === 3)) smoke = smokeOn * 0.35 * clamp01((smokeLv - fl * FH - 8) / 6);
    // one in eight households has not paid this year's fees
    if (unpaidOn > 0 && RANK_PAY[i] % 8 === 0 && fl > 0) unpaid = unpaidOn;
    // the climax: the floors go dark from the top, for good (until the present returns at dawn)
    if (t > b(T.dark[0])) {
      const k = fromTop(t, b(T.dark[0]), b(T.dark[1]), fl, un) * (1 - climaxBack);
      gone = Math.max(gone, k);
      lit *= 1 - k;
      cold = Math.max(cold, k * 0.6);
    }
    if (i === YOU && t > b(T.you)) {
      mark = ramp(t, b(T.you + 0.5), b(T.you + 1.5));
      lit = 1;
      gone = 0;
      sub = 0;
      tenant = 0;
      cold = 0;
    }
    a.set([lit, yes, no, gone], i * 4);
    a2.set([tenant, sub, noise, mark], i * 4);
    a3.set([unpaid, smoke, cold, 0], i * 4);
  }
  return { a, a2, a3 };
};

// ---------- people ----------

const h1 = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
const peopleAt = (t: number, hh: Float32Array) => {
  const out = new Float32Array(PEOPLE * 4);
  const rushT = t - b(T.rush);
  const rushOn = t > b(T.rush) && t < b(T.crack + 0.4);
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
    if (t > b(T.crack - 0.2) && t < b(T.crack + 0.3)) s *= ramp(t, b(T.crack - 0.2), b(T.crack + 0.3), LIN);
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

const ALARM_RANK = Array.from({ length: 33 }, (_, f) => ((f * 0.7548776 + 0.13) % 1));

export const worldAt = (t: number): WorldState => {
  const lights = track(t, [
    [0, 0.44],
    [b(T.lifts), 0.44],
    [b(T.lifts + 0.6), 0.26],
    [b(T.japan + 2), 0.26],
    [b(T.money), 0.44],
    [b(T.answer), 0.46],
    [b(T.lift), 0.4],
    [b(T.end), 0.32],
  ]);
  // shots that are about the hero: the rest of the city sinks into the haze
  const heroShot = Math.max(
    win(t, 0, b(6.6), 0.3),
    win(t, b(8.4), b(39.6), 0.8),
    win(t, b(45.0), b(57.6), 0.8),
    win(t, b(65.9), b(97.4), 0.8),
    win(t, b(105.6), b(130), 1.2),
  );
  const openShot = Math.max(win(t, b(T.village + 0.2), b(T.fire), 0.6), win(t, b(T.nanjing), b(T.ladder), 0.5), win(t, b(T.unpaid), b(T.fund + 0.4), 0.5), win(t, b(T.owners), b(T.climax), 0.6), win(t, b(T.you), b(130), 0.8));
  const darkR = track(t, [[b(T.answer + 1.6), 7000], [b(T.answer + 6.2), 1500]], EIO);
  const darkAmt = t >= b(T.answer + 1.2) && t < b(T.lift + 2.2) ? 0.95 * (1 - ramp(t, b(T.lift + 0.6), b(T.lift + 2.2))) : 0;

  const peel = Math.max(
    t > b(T.village - 0.2) && t < b(T.fire + 0.8) ? track(t, [[b(T.village), 0], [b(T.village + 0.9), 1], [b(T.fire), 1], [b(T.fire + 0.6), 0]], EIO) : 0,
    t > b(T.nanjing - 0.5) && t < b(T.ladder + 0.5) ? track(t, [[b(T.nanjing - 0.4), 0], [b(T.nanjing + 0.2), 1], [b(T.ladder - 0.2), 1], [b(T.ladder + 0.3), 0]], EIO) : 0,
    t > b(T.unpaid - 0.2) && t < b(T.fund + 0.7) ? track(t, [[b(T.unpaid), 0], [b(T.unpaid + 0.5), 1], [b(T.fund), 1], [b(T.fund + 0.5), 0]], EIO) : 0,
    t > b(T.owners - 0.2) && t < b(T.climax + 0.8) ? track(t, [[b(T.owners), 0], [b(T.owners + 0.7), 1], [b(T.climax), 1], [b(T.climax + 0.6), 0]], EIO) : 0,
    t > b(T.you - 0.2) ? ramp(t, b(T.you), b(T.you + 1.1), EIO) : 0,
  );
  const xray = Math.max(win(t, b(T.hookX), b(6.6), 0.4), win(t, b(T.machine + 0.6), b(T.walkup), 0.6), win(t, b(T.fireSys), b(T.shanghai + 0.2), 0.5), win(t, b(T.ageing), b(T.lifts), 0.6));
  const age = track(t, [[b(T.ageing), 0], [b(T.ageing + 3.6), 0.55], [b(T.why), 0.6], [b(T.leave), 0.7], [b(T.answer), 0.85], [b(T.lift + 1), 0.7]], LIN);
  const water = Math.max(track(t, [[b(T.machine + 1.2), -2], [b(T.machine + 2.8), HERO.h + 8]], EIO) * (t < b(T.fireSys) ? 1 : 0), track(t, [[b(T.ageing + 0.2), -2], [b(T.ageing + 1.8), HERO.h + 8]], EIO));
  const rushFast = win(t, b(T.rush), b(T.crack), 0.5);
  let lifts: [number, number] = [liftY(t, 0, rushFast), liftY(t, 1, rushFast)];
  const stopped = Math.max(win(t, b(T.hookX - 0.4), b(7.0), 0.3), win(t, b(T.stop + 0.3), b(T.exodus), 0.3), win(t, b(T.dark[0]), b(T.lift + 1), 0.6), win(t, b(T.cutPower), b(T.village - 0.3), 0.4));
  if (stopped > 0) lifts = [lerp(lifts[0], 0, stopped), lerp(lifts[1], 0, stopped)];
  if (t > b(T.you)) lifts = [tween(t, b(T.you + 0.2), b(T.you + 2.6), 0, 20 * FH, EIO), liftY(t, 1)];
  const liftGlow = 1 - stopped * 0.85;
  const liftsFront = Math.max(win(t, b(T.village + 2), b(T.crack), 0.5), win(t, b(T.owners + 1), b(T.exodus), 0.6), win(t, b(T.you), b(130), 0.6));

  const { a: hh, a2: hh2, a3: hh3 } = households(t);
  const pos = peopleAt(t, hh);

  // money: a year of fees rains into the jar; maintenance drains it; a lift replacement takes a big bite
  const coinsT = tween(t, b(T.fund + 0.2), b(T.fund + 1.5), 0, 1, LIN);
  const tankVis = win(t, b(T.fund), b(T.why), 0.5);
  const tankLevel = track(t, [[b(T.fund + 0.1), 0.02], [b(T.fund + 1.6), 0.82], [b(T.drain), 0.82], [b(T.drain + 0.4), 0.52], [b(T.drain + 0.9), 0.4], [b(T.drain + 1.3), 0.3], [b(T.refill), 0.26]], EIO);

  let c = camAt(t, KEYS);
  c = { ...c, yaw: c.yaw + Math.sin(t * 0.21) * 0.5, pitch: c.pitch + Math.sin(t * 0.17 + 1) * 0.2 };

  const lapse = win(t, b(T.ageing + 0.2), b(T.ageing + 3.6), 0.6);
  const lapseNight = 0.74 + 0.18 * Math.cos(((t - b(T.ageing + 0.2)) / 1.6) * Math.PI * 2);
  let night = track(t, [[0, 0.86], [b(T.lift), 0.9], [b(T.lift + 6), 0.55], [b(T.end), 0.5]]);
  night = lerp(night, lapseNight, lapse);

  const blur = Math.max(
    5 * win(t, b(T.shanghai + 0.1), b(T.ageing - 0.1), 0.6),
    6 * win(t, b(T.japan), b(T.money), 0.6),
    7 * win(t, b(T.why), b(T.owners), 0.6),
    5 * win(t, b(T.births), b(T.climax), 0.6),
  );

  const alive = new Float32Array(33);
  const alarmFade = ramp(t, b(T.alarmsAge + 0.4), b(T.alarmsAge + 1.3), LIN);
  for (let f = 0; f < 33; f++) alive[f] = f === 0 ? 0 : clamp01((ALARM_RANK[f] - alarmFade * 0.75) / 0.06) * (0.75 + 0.25 * Math.sin(t * 2.4 + f));

  return {
    cam: c,
    time: t,
    night,
    dim: 1 - 0.05 * blur,
    traffic: 1,
    bloom: 0.4,
    blur,
    grade: { vig: 0.5, grain: 0.02, fade: 0 },
    outline: win(t, b(T.machine - 0.2), b(T.machine + 0.8), 0.4),
    city: {
      lights,
      lampK: 0.82,
      patch: 0,
      elev: win(t, b(T.lifts + 0.3), b(T.japan + 0.6), 0.6),
      elevAge: tween(t, b(T.lifts + 1.2), b(T.lifts + 2.3), 0, 0.85, EIO),
      darkR,
      darkAmt,
      dim: 1 - 0.18 * openShot,
      hideEast: t > b(T.walkup - 0.3) && t < b(T.village - 0.2),
      focus: [0, 0, 12],
      iso: 0.96 * heroShot,
    },
    walkup: { vis: win(t, b(T.walkup), b(T.village - 0.2), 0.3), rise: ramp(t, b(T.walkup), b(T.walkup + 0.8), EO) },
    smoke: { vis: win(t, b(T.nanjing + 0.3), b(T.ladder), 0.5), level: track(t, [[b(T.nanjing + 0.4), -3], [b(T.nanjing + 2.6), HERO.h + 3]], EIO) },
    ladder: { vis: win(t, b(T.ladder), b(T.fireSys + 0.4), 0.4), ext: ramp(t, b(T.ladder + 0.3), b(T.ladder + 1.3), EIO) },
    alarms: { vis: win(t, b(T.fireSys + 0.3), b(T.shanghai + 0.2), 0.4), alive },
    climbers: { vis: Math.max(win(t, b(T.hookX + 0.4), b(6.6), 0.4), win(t, b(T.stop + 0.6), b(T.exodus), 0.4)), t: t - b(T.hookX), top: 27 },
    fireSys: Math.max(win(t, b(T.machine + 1.4), b(T.walkup), 0.5), win(t, b(T.fireSys), b(T.shanghai + 0.2), 0.5)),
    hero: {
      vis: 1,
      built: 1,
      hh,
      hh2,
      hh3,
      owners: win(t, b(T.owners + 0.6), b(T.stop), 0.8),
      age,
      xray,
      vote: Math.max(win(t, b(T.vote), b(T.vote + 1.3), 0.3), win(t, b(T.vote + 1.3), b(T.stop + 0.2), 0.4)),
      peel,
      water,
      lifts,
      liftGlow,
      liftsFront,
      stairs: Math.max(win(t, b(T.hookX), b(6.6), 0.4), win(t, b(T.fireSys + 0.4), b(T.shanghai), 0.4)),
      line100: 0,
      refuge: 0,
      fire: win(t, b(T.ladder + 0.8), b(T.fireSys + 0.4), 0.5),
    },
    people: { pos, vis: peel > 0.5 ? 1 : 0, grey: ramp(t, b(T.ageOwners + 0.3), b(T.ageOwners + 3), LIN) * (t < b(T.you) ? 1 : 0) },
    coins: { t: coinsT, vis: win(t, b(T.fund + 0.1), b(T.fund + 1.7), 0.3) },
    tank: { vis: tankVis, level: tankLevel },
  };
};
