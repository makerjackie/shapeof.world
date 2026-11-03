// The money, as coins. One coin = 1 yuan in the restaurant chapters; in the country-scale chapters one coin = 1% of
// the total. Every coin leaves a pile (or appears out of nothing: a seed), flies an arc, and lands on a pile or is
// absorbed by a building (sink). Piles are conserved: count = seeds + arrivals − departures.
// Numbers: private/videos/money-flow/LEDGER.md §8.
import { T } from "../timing";

export type Col = "gold" | "loan" | "dim";
export type Flow = {
  from: string;
  to: string;
  n: number; // coins
  t0: number; // first departure
  gap?: number; // seconds between departures
  dur?: number; // flight time
  lift?: number; // arc height above the higher end
  col?: Col;
  size?: number;
  sink?: boolean; // absorbed on arrival (no pile)
  label?: string; // shown at the destination once the first coin lands
  labelOut?: number; // when that label leaves
  trail?: boolean; // faint line along the route (default true)
  rate?: (t: number) => number; // a stream: coins per second over [t0, t1] instead of n evenly spaced
  t1?: number;
};
export type Seed = { at: string; n: number; t: number; spread?: number; size?: number };
// a pile is drawn only inside its window; after b it shrinks away (the story has moved on)
export type PileWin = { node: string; a: number; b: number; size?: number; per?: number; count?: (t: number) => number };

const c1 = T.c1;
const c2 = T.c2;
const c3 = T.c3;
const c4 = T.c4;
const c5 = T.c5;
const c8 = T.c8;
const c9 = T.c9;

// national new-home sales, 亿元 (国家统计局), 1998–2025
export const SALES: [number, number][] = [
  [1998, 2513], [1999, 2988], [2000, 3935], [2001, 4863], [2002, 6032], [2003, 7956], [2004, 10376], [2005, 17576], [2006, 20826],
  [2007, 29889], [2008, 25068], [2009, 44355], [2010, 52721], [2011, 58589], [2012, 64456], [2013, 81428], [2014, 76292],
  [2015, 87281], [2016, 117627], [2017, 133701], [2018, 149973], [2019, 159725], [2020, 173613], [2021, 181930], [2022, 133308],
  [2023, 116622], [2024, 96750], [2025, 83937],
];
// the river's clock: 1998 at RIVER.a, 2021 at RIVER.peak (held until RIVER.hold), 2025 at RIVER.b
export const RIVER = { a: T.wave + 2.4, peak: T.wave + 13.0, hold: T.wave + 19.4, b: T.wave + 25.6, end: T.wave + 29 };
export const yearAt = (t: number) => {
  if (t <= RIVER.peak) return 1998 + (23 * Math.max(0, t - RIVER.a)) / (RIVER.peak - RIVER.a);
  if (t <= RIVER.hold) return 2021;
  return Math.min(2025, 2021 + (4 * (t - RIVER.hold)) / (RIVER.b - RIVER.hold));
};
export const salesAt = (y: number) => {
  const i = Math.max(0, Math.min(SALES.length - 2, Math.floor(y - 1998)));
  const k = Math.max(0, Math.min(1, y - SALES[i][0]));
  return SALES[i][1] + (SALES[i + 1][1] - SALES[i][1]) * k;
};
export const TECH = { a: T.wave + 32, b: T.c7 - 0.5 };

export const SEEDS: Seed[] = [
  // the note becomes a hundred coins on the counter
  { at: "till", n: 100, t: c1 + 3.4, spread: 1.0 },
  // chapter 3: one year of the country's output, as a hundred big coins
  { at: "till", n: 100, t: c3 + 2.0, spread: 1.4, size: 1.7 },
  // chapter 5: the bank lends: new money appears at the bank
  { at: "bank", n: 36, t: c5 + 13.0, spread: 1.6 },
  // ending: a new note, a new hundred
  { at: "till", n: 100, t: c9 + 3.8, spread: 0.6 },
];

const S1 = (dt: number) => c1 + dt;
export const FLOWS: Flow[] = [
  // ------------------------------------------------ 1. the bill
  { from: "till", to: "market", n: 42, t0: S1(5.0), gap: 0.05, dur: 2.4, lift: 7, label: "食材 42.1", labelOut: c2 + 13.4 },
  { from: "till", to: "staff", n: 22, t0: S1(8.4), gap: 0.05, dur: 1.2, lift: 2.6, label: "人工 22.2", labelOut: c2 + 2.0 },
  { from: "till", to: "landlord", n: 10, t0: S1(11.6), gap: 0.08, dur: 2.4, lift: 8, label: "房租 9.7", labelOut: c2 + 20.4 },
  { from: "till", to: "platform", n: 4, t0: S1(14.6), gap: 0.12, dur: 2.4, lift: 9, label: "外卖平台 4.5", labelOut: c2 + 27 },
  { from: "till", to: "power", n: 4, t0: S1(17.0), gap: 0.12, dur: 2.2, lift: 7, label: "水电燃气 3.6", labelOut: c2 + 1 },
  { from: "till", to: "gov", n: 2, t0: S1(19.2), gap: 0.2, dur: 2.2, lift: 7, label: "税费 1.8", labelOut: c2 + 1 },
  // ------------------------------------------------ 2. every share keeps moving
  // the waiter's half of the staff money goes home with her, then out again
  { from: "staff", to: "waiter", n: 11, t0: c2 + 2.2, gap: 0.07, dur: 2.6, lift: 9 },
  { from: "waiter", to: "landlord", n: 4, t0: c2 + 7.4, gap: 0.12, dur: 2.4, lift: 9, label: "房租", labelOut: c2 + 13 },
  { from: "waiter", to: "market", n: 4, t0: c2 + 8.4, gap: 0.12, dur: 2.0, lift: 6, label: "吃饭", labelOut: c2 + 13 },
  { from: "waiter", to: "home", n: 3, t0: c2 + 9.4, gap: 0.15, dur: 1.8, lift: 5, sink: true, label: "寄回老家", labelOut: c2 + 13 },
  // the market's coins split again
  { from: "market", to: "farmer", n: 24, t0: c2 + 14.6, gap: 0.05, dur: 2.0, lift: 6, label: "菜农", labelOut: c2 + 20.2 },
  { from: "market", to: "driver", n: 7, t0: c2 + 15.4, gap: 0.08, dur: 1.4, lift: 4, label: "司机", labelOut: c2 + 20.2 },
  { from: "market", to: "vendor", n: 15, t0: c2 + 16.0, gap: 0.06, dur: 0.9, lift: 2.5, label: "摊主", labelOut: c2 + 20.2 },
  // the landlord's rent pays a mortgage
  { from: "landlord", to: "bank", n: 7, t0: c2 + 21.4, gap: 0.1, dur: 2.4, lift: 8, label: "房贷", labelOut: c2 + 27 },
  // the platform pays riders; the rest is profit for the owners
  { from: "platform", to: "rider", n: 2, t0: c2 + 27.6, gap: 0.3, dur: 1.4, lift: 4, size: 1.3, label: "骑手", labelOut: c2 + 33 },
  { from: "platform", to: "owners", n: 2, t0: c2 + 28.6, gap: 0.3, dur: 1.4, lift: 4, size: 1.3, label: "股东", labelOut: c2 + 33 },
  // ------------------------------------------------ 3. the whole country: every 100 yuan produced
  ...houseFan("till", 53, c3 + 5.0, 2.4, 1.7),
  { from: "till", to: "gov", n: 8, t0: c3 + 6.2, gap: 0.1, dur: 2.6, lift: 10, size: 1.7 },
  { from: "till", to: "hill", n: 20, t0: c3 + 7.2, gap: 0.06, dur: 3.0, lift: 12, size: 1.7 },
  { from: "till", to: "owners", n: 11, t0: c3 + 7.6, gap: 0.07, dur: 2.6, lift: 10, size: 1.7 },
  { from: "till", to: "bank", n: 8, t0: c3 + 8.0, gap: 0.08, dur: 2.8, lift: 10, size: 1.7 },
  // what households spend flows back to shops, the market, landlords, platforms: the circle
  ...spendBack(c3 + 12.5, c3 + 32),
  // ------------------------------------------------ 4. where it stops: in and out of the ten households
  ...decileYear(c4 + 3.8, c4 + 17.5),
  // ------------------------------------------------ 5. the house: monthly payments to the bank for 30 years
  { from: "couple", to: "bank", n: 0, t0: c5 + 5.0, t1: c5 + 31.5, rate: () => 3.2, dur: 2.6, lift: 7, sink: true, label: "每月还贷", labelOut: c5 + 12 },
  // new money from the loan goes to whoever sold the house; the developer pays for the land
  { from: "bank", to: "dev", n: 36, t0: c5 + 15.2, gap: 0.05, dur: 2.6, lift: 10, col: "loan", label: "新造出的钱", labelOut: c5 + 26 },
  { from: "dev", to: "devLand", n: 14, t0: c5 + 19.6, gap: 0.07, dur: 3.2, lift: 12, col: "loan", label: "卖地", labelOut: c5 + 26 },
  // interest: the bank pays the people who keep money there
  { from: "bank", to: "hill", n: 0, t0: c5 + 26.0, t1: c5 + 32.6, rate: () => 2.4, dur: 2.4, lift: 8, sink: true, label: "存款利息", labelOut: c5 + 32.6 },
  // ------------------------------------------------ 6. the housing river (rate follows national sales) and the next waves
  ...river(),
  ...techWave(),
  // ------------------------------------------------ 8. but: the shop still pays rent in a bad month
  { from: "boss", to: "landlord", n: 6, t0: c8 + 4.6, gap: 0.25, dur: 2.4, lift: 8, label: "房租照交", labelOut: c8 + 10.5 },
  // ------------------------------------------------ 9. ending: the same split, all at once
  { from: "till", to: "market", n: 42, t0: c9 + 5.0, gap: 0.03, dur: 2.2, lift: 7 },
  { from: "till", to: "staff", n: 22, t0: c9 + 5.1, gap: 0.03, dur: 1.2, lift: 2.6 },
  { from: "till", to: "landlord", n: 10, t0: c9 + 5.2, gap: 0.05, dur: 2.4, lift: 8 },
  { from: "till", to: "platform", n: 4, t0: c9 + 5.3, gap: 0.08, dur: 2.4, lift: 9 },
  { from: "till", to: "power", n: 4, t0: c9 + 5.4, gap: 0.08, dur: 2.2, lift: 7 },
  { from: "till", to: "gov", n: 2, t0: c9 + 5.5, gap: 0.1, dur: 2.2, lift: 7 },
  ...nightCircle(c9 + 8.5, T.sources + 0.4),
];

export const PILES: PileWin[] = [
  { node: "till", a: c1 + 3.0, b: c2 + 1.0 },
  { node: "market", a: c1 + 6, b: c2 + 20.6 },
  { node: "staff", a: c1 + 9, b: c2 + 6.0 },
  { node: "landlord", a: c1 + 12.5, b: c2 + 27.0 },
  { node: "platform", a: c1 + 15.5, b: c2 + 33.5 },
  { node: "power", a: c1 + 18, b: c2 + 1.0 },
  { node: "gov", a: c1 + 20, b: c2 + 1.0 },
  { node: "waiter", a: c2 + 3, b: c2 + 13.5 },
  { node: "farmer", a: c2 + 15, b: c3 },
  { node: "driver", a: c2 + 15.5, b: c3 },
  { node: "vendor", a: c2 + 16, b: c3 },
  { node: "bank", a: c2 + 22, b: c3 },
  { node: "rider", a: c2 + 28, b: c3 },
  { node: "owners", a: c2 + 29, b: c3 },
  // chapter 3
  { node: "till", a: c3 + 1.8, b: c3 + 11.5, size: 1.7, per: 12 },
  { node: "gov", a: c3 + 7, b: c3 + 22, size: 1.7 },
  { node: "hill", a: c3 + 8, b: c3 + 22, size: 1.7 },
  { node: "owners", a: c3 + 8, b: c3 + 22, size: 1.7 },
  { node: "bank", a: c3 + 9, b: c3 + 22, size: 1.7 },
  // chapter 4: a year of saving in the ten households, then what each tenth owns; chapter 7 turns it into the world
  ...Array.from({ length: 10 }, (_, i) => ({ node: `d${i}`, a: c4 + 3, b: c4 + 18.4, size: 1.35, per: 200 })),
  ...Array.from({ length: 10 }, (_, i) => ({ node: `e${i}`, a: c4 + 18.2, b: T.c8 + 0.8, size: 2.0, per: 400, count: (t: number) => wealthCoins(i, t) })),
  // chapter 5
  { node: "bank", a: c5 + 12.6, b: c5 + 22 },
  { node: "dev", a: c5 + 17, b: c5 + 31 },
  { node: "devLand", a: c5 + 22, b: c5 + 31 },
  // chapter 8
  { node: "boss", a: c8 + 1.5, b: c8 + 11 },
  // ending
  { node: "till", a: c9 + 3.6, b: c9 + 8.5 },
  { node: "market", a: c9 + 6, b: T.sources + 0.4 },
  { node: "staff", a: c9 + 6, b: T.sources + 0.4 },
  { node: "landlord", a: c9 + 6.5, b: T.sources + 0.4 },
  { node: "platform", a: c9 + 7, b: T.sources + 0.4 },
  { node: "power", a: c9 + 7, b: T.sources + 0.4 },
  { node: "gov", a: c9 + 7, b: T.sources + 0.4 },
];
// chapter 8 seeds: the boss's last coins (the pile that pays the rent)
SEEDS.push({ at: "boss", n: 8, t: c8 + 1.6, spread: 0.6 });

// ------------------------------------------------------------------ helpers that make many flows
// the wages: 53 coins fanned out over the 21 houses of rows A and B
function houseFan(from: string, n: number, t0: number, dur: number, size: number): Flow[] {
  const homes = [...Array.from({ length: 11 }, (_, i) => `a${i}`), ...Array.from({ length: 10 }, (_, i) => `d${i}`)];
  const out: Flow[] = [];
  let left = n;
  homes.forEach((h, i) => {
    const k = Math.round(left / (homes.length - i));
    left -= k;
    out.push({ from, to: h, n: k, t0: t0 + (i % 7) * 0.12, gap: 0.12, dur, lift: 8, size, sink: true });
  });
  return out;
}
// households spending: streams from the houses to the shop, the market, the landlord and the platform
function spendBack(t0: number, t1: number): Flow[] {
  const homes = ["a1", "a3", "a5", "a7", "a9", "d1", "d3", "d5", "d7", "d9"];
  const dests = ["till", "market", "landlord", "platform", "power"];
  return homes.map((h, i) => ({ from: h, to: dests[i % dests.length], n: 0, t0: t0 + (i % 5) * 0.3, t1, rate: () => 1.1, dur: 2.6, lift: 6, sink: true, size: 1.3 }));
}
// a year in the ten households: income in, spending out. The low ones spend everything (the lowest more than they
// earn); the high ones keep most of it. Shapes after CHFS savings shares; illustrative.
function decileYear(t0: number, t1: number): Flow[] {
  const out: Flow[] = [];
  const inc = [0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.1, 2.6, 3.4, 6.0];
  const keep = [-0.15, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45, 0.72];
  for (let i = 0; i < 10; i++) {
    out.push({ from: "town", to: `d${i}`, n: 0, t0: t0 + i * 0.05, t1, rate: () => inc[i], dur: 2.2, lift: 7, size: 1.35, sink: keep[i] <= 0 });
    out.push({ from: `d${i}`, to: "town2", n: 0, t0: t0 + 1.4 + i * 0.05, t1: t1 + 0.5, rate: () => inc[i] * (1 - Math.max(keep[i], -0.3)), dur: 2.2, lift: 7, size: 1.35, sink: true, trail: false });
  }
  return out;
}
function river(): Flow[] {
  const homes = ["a0", "a2", "a4", "a6", "a8", "a10", "d0", "d2", "d4", "d6", "d8"];
  const r = (t: number) => (t < RIVER.a ? 0 : t > RIVER.b + 0.5 ? 0 : (salesAt(yearAt(t)) / 181930) * 3.4);
  return homes.map((h, i) => ({ from: h, to: "dev", n: 0, t0: RIVER.a - 0.2 + (i % 4) * 0.1, t1: RIVER.end, rate: r, dur: 3.2, lift: 12, sink: true, size: 1.5 }));
}
// the next waves: small coins from every home into the four new towers (phones, the internet, batteries, chips)
function techWave(): Flow[] {
  const homes = ["a1", "a5", "a9", "d1", "d5", "d9", "till", "market"];
  const towers = ["t0", "t1", "t2", "t3"];
  return homes.map((h, i) => ({ from: h, to: towers[i % 4], n: 0, t0: TECH.a + 1.5 + i * 0.25, t1: TECH.b, rate: () => 1.6, dur: 3.0, lift: 12, sink: true, size: 1.3 }));
}
// the ending: money keeps going round the night town
function nightCircle(t0: number, t1: number): Flow[] {
  const pairs: [string, string][] = [
    ["a2", "till"], ["a6", "market"], ["d3", "landlord"], ["d7", "platform"], ["staff", "a4"], ["market", "farmer"], ["platform", "rider"],
    ["landlord", "bank"], ["bank", "hill"], ["a8", "power"], ["d1", "till"], ["gov", "a10"], ["till", "d5"], ["farmer", "a0"],
  ];
  return pairs.map(([a, b], i) => ({ from: a, to: b, n: 0, t0: t0 + i * 0.35, t1, rate: () => 1.0, dur: 3.0, lift: 7, sink: true, size: 1.2 }));
}

// one coin = 0.5% of all wealth. Urban China 2019 (人民银行): top 10% own 47.5% of household assets, top 20% 63.0%,
// bottom 20% 2.6%; the deciles in between are spread to match those sums (illustrative). The world 2025 (World
// Inequality Report 2026): top 10% 75%, the middle 40% 23%, the bottom half 2%.
export const CHINA_10 = [1.0, 1.6, 2.8, 3.6, 5, 6, 7.5, 9.5, 15.5, 47.5];
export const WORLD_10 = [0.4, 0.4, 0.4, 0.4, 0.4, 5.75, 5.75, 5.75, 5.75, 75];
export const WEALTH = { grow: T.c4 + 18.6, world: T.c7 + 3.2 };
export function wealthCoins(i: number, t: number) {
  const g = Math.max(0, Math.min(1, (t - WEALTH.grow - i * 0.15) / 3.2));
  const w = Math.max(0, Math.min(1, (t - WEALTH.world) / 3.6));
  const e = (x: number) => x * x * (3 - 2 * x);
  const v = CHINA_10[i] + (WORLD_10[i] - CHINA_10[i]) * e(w);
  return Math.round(v * 2 * e(g));
}
