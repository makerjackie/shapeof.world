// Customers: small cool glows moving through the market (people are never drawn). Every mode is a pure function of
// film time, so any frame renders the same picture.
import { Glow } from "../world/engine";
import { HERO_IDS, NEAR, STALLS, STAR, STARS, STREET_GAP, Stall, stallWorld } from "../world/market";

const h = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const COOL = { r: 0.8, g: 0.9, b: 1.0 };
const GOLD = { r: 1.0, g: 0.82, b: 0.45 };

const front = (st: Stall, d = 1.3) => stallWorld(st, 0, 0, d);

// Shoppers strolling along the near streets, now and then stepping up to a stall.
export const strollers = (t: number, n: number, gain: number, spanX = 190): Glow[] => {
  const out: Glow[] = [];
  if (gain <= 0.01) return out;
  for (let i = 0; i < n; i++) {
    const k = Math.round((h(i, 1) - 0.5) * 6.99);
    const dir = h(i, 2) < 0.5 ? -1 : 1;
    const v = 0.7 + 0.8 * h(i, 3);
    const span = spanX * 2;
    const x = ((((h(i, 4) * span + dir * v * t) % span) + span) % span) - spanX;
    const lane = (h(i, 5) - 0.5) * 5.6 + Math.sin(t * 0.3 + i) * 0.3;
    out.push({ x, y: 1.25, z: k * STREET_GAP + lane, size: 0.14, ...COOL, i: 1.1 * gain });
  }
  return out;
};

// Customers walking to stalls: share `toStar` of them heads for the brightest stalls, the rest to any stall.
// Each one walks along its street, turns in, and fades at the counter, then a new one starts (period P).
const RANDOM = STALLS.filter((s) => Math.abs(s.k) <= 10 && Math.abs(s.x) < 700);
export const flows = (t: number, n: number, gain: number, toStar: number): Glow[] => {
  const out: Glow[] = [];
  if (gain <= 0.01) return out;
  const P = 9;
  for (let i = 0; i < n; i++) {
    const star = h(i, 7) < toStar;
    const st = star ? STALLS[STARS[Math.floor(Math.pow(h(i, 1), 2.2) * STARS.length)]] : RANDOM[Math.floor(h(i, 8) * RANDOM.length)];
    const [tx, , tz] = front(st, 1.2);
    const u = (h(i, 2) + t / P) % 1;
    const far = star ? 40 + 420 * h(i, 3) : 8 + 60 * h(i, 3);
    const sx = tx + (h(i, 4) < 0.5 ? -1 : 1) * far;
    const streetZ = st.k * STREET_GAP + (h(i, 5) - 0.5) * 3;
    let x: number;
    let z: number;
    if (u < 0.88) {
      const w = u / 0.88;
      x = sx + (tx - sx) * w;
      z = streetZ;
    } else {
      const w = (u - 0.88) / 0.12;
      x = tx;
      z = streetZ + (tz - streetZ) * w;
    }
    const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 10);
    out.push({ x, y: 1.25, z, size: 0.16, ...COOL, i: 1.4 * gain * fade });
  }
  return out;
};

// One customer arriving at a stall at time `at` (walk of `dur` seconds), gold if a regular.
export const arrival = (st: Stall, t: number, at: number, dur: number, from: number, gold = false, gain = 1): Glow | null => {
  const u = (t - (at - dur)) / dur;
  if (u < 0 || u > 1.25) return null;
  const [tx, , tz] = front(st, 1.1);
  const streetZ = st.k * STREET_GAP + (st.z > st.k * STREET_GAP ? 1.2 : -1.2);
  const w = Math.min(1, u);
  const e = w < 0.8 ? w / 0.8 : 1;
  const x = from + (tx - from) * e;
  const z = w < 0.8 ? streetZ : streetZ + (tz - streetZ) * ((w - 0.8) / 0.2);
  const fade = u > 1 ? 1 - (u - 1) / 0.25 : Math.min(1, u * 6);
  const c = gold ? GOLD : COOL;
  return { x, y: 1.25, z, size: gold ? 0.2 : 0.16, ...c, i: (gold ? 2.2 : 1.4) * fade * gain };
};

// The regulars of the brightest stall coming back again and again (gold), with new faces now and then.
export const regulars = (t: number, t0: number, gain: number): Glow[] => {
  const out: Glow[] = [];
  if (gain <= 0.01) return out;
  const st = STALLS[STAR];
  for (let i = 0; i < 26; i++) {
    const period = 2.6 + 1.4 * h(i, 1);
    const ph = h(i, 2) * period;
    const n = Math.floor((t - t0 + ph) / period);
    const at = t0 - ph + (n + 1) * period;
    const from = st.x + (h(i, 3) < 0.5 ? -1 : 1) * (10 + 30 * h(i, 4));
    const g = arrival(st, t, at, 2.2, from, i % 3 !== 2, gain);
    if (g) out.push(g);
  }
  return out;
};

// Word of mouth: customers reach the opening stall in a growing chain (one brings two).
export const wordOfMouth = (t: number, t0: number, gain: number): Glow[] => {
  const out: Glow[] = [];
  if (gain <= 0.01) return out;
  const st = STALLS[HERO_IDS.laptop];
  const dt = t - t0;
  const n = Math.min(240, Math.floor(Math.pow(2, dt * 0.75)));
  for (let i = 0; i < n; i++) {
    const born = Math.log2(i + 1) / 0.75;
    const far = 20 + 260 * h(i, 3);
    const from = st.x + (h(i, 4) < 0.5 ? -1 : 1) * far;
    const dur = 1.6 + far / 70;
    const loop = (dt - born) % (dur + 0.6);
    const g = arrival(st, t, t - loop + dur, dur, from, i % 2 === 0, gain);
    if (g) out.push({ ...g, size: g.size * 1.6 });
  }
  return out;
};

// The 煎饼 cart's street: passers-by, a customer at `buyAt`, the regular at `regAt`.
export const cartStreet = (t: number, gain: number, buyAt: number, regAt: number[]): Glow[] => {
  const out: Glow[] = [];
  if (gain <= 0.01) return out;
  const st = STALLS[HERO_IDS.cart];
  for (let i = 0; i < 22; i++) {
    const dir = h(i, 2) < 0.5 ? -1 : 1;
    const span = 80;
    const x = st.x - 40 + ((((h(i, 4) * span + dir * (0.8 + 0.6 * h(i, 3)) * t) % span) + span) % span);
    out.push({ x, y: 1.25, z: (h(i, 5) - 0.5) * 5, size: 0.14, ...COOL, i: 1.0 * gain });
  }
  const b = arrival(st, t, buyAt, 2.4, st.x + 14, false, gain);
  if (b) out.push(b);
  for (const r of regAt) {
    const g = arrival(st, t, r, 2.6, st.x - 16, true, gain);
    if (g) out.push(g);
  }
  return out;
};

export const NEAR_ROW = NEAR; // re-export for the film
