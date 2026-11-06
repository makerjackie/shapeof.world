// Scene starts in seconds. Everything (camera, town state, captions, sound) keys off these, so the whole film can be
// retimed to the music by editing this one table.
export const FPS = 30;

// Score (tools/music.py): one library track per movement, cut on these scene starts. The bar grid below is kept from
// the first cut (信用火花, 90 BPM); HIT (106.75) is the impact under the reveal, where 活着的蓝 begins in silence.
export const A_BAR = 240 / 90;
export const A_FILM = (trackBar: number) => 0.08 + (trackBar + 16) * A_BAR; // for track bars ≥ 22
export const HIT = A_FILM(24); // 106.75

export const T = {
  hook: 0, // 18 万亿 of new money, prices up 0.2%: where did it go?
  c1: 10.5, // one 亿, lent to a factory: a deposit and a debt are born together
  c2: 34, // the factory pays it out (53 / 8 / 39); a year on, 八成 of the new deposits sit with households
  c3: 62, // spending only moves money: a year of flowing (12 months), six households
  c4: HIT - 3, // reveal (103.75): who saved it
  c5: A_FILM(35), // the savers' money is lent to young buyers; interest flows back (136.08)
  c7: 168.08, // new money lifts what it reaches first: 2009, then the housing wave and its ebb
  c10: 216, // but…
  c11: 240, // ending
  sources: 257,
  card: 265,
  end: 273,
};

// Light through the film: late golden afternoon while the money flows, sunset at the reveal, dusk for the savers and
// the wave, night for the ending (0 = golden, 0.6 = the blue hour of v4, 1 = night).
const NIGHT_KEYS: [number, number][] = [[0, 0], [100, 0.05], [136, 0.3], [168, 0.45], [200, 0.6], [216, 0.8], [243, 1]];
export const nightAt = (t: number) => {
  let i = 0;
  while (i < NIGHT_KEYS.length - 1 && t > NIGHT_KEYS[i + 1][0]) i++;
  const [a, x] = NIGHT_KEYS[i];
  const [b, y] = NIGHT_KEYS[Math.min(i + 1, NIGHT_KEYS.length - 1)];
  const u = b === a ? 1 : Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x + (y - x) * u * u * (3 - 2 * u);
};

export const MONTHS = { start: T.c3 + 2, end: T.c4 - 2 }; // 12 monthly cycles

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const ramp = (t: number, a: number, b: number) => ss((t - a) / (b - a));
// 0 → 1 over [a, a+fi], 1 → 0 over [b-fo, b]
export const win = (t: number, a: number, b: number, fi = 0.6, fo = 0.6) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b - fo, b));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// chapter 3: the camera visits the six households, lowest income first; the small boss's restaurant gets the long stop
// (its takings split on a receipt)
export const VISIT = { rider: T.c3 + 2.6, worker: T.c3 + 7.2, coder: T.c3 + 11.6, landlord: T.c3 + 16.0, boss: T.c3 + 20.4, holder: T.c3 + 32.2 } as const;
export const HOLD: Record<keyof typeof VISIT, number> = { rider: 3.6, worker: 3.4, coder: 3.4, landlord: 3.4, boss: 10.8, holder: 4.6 };

// chapter 7: national new-home sales, 亿元 (国家统计局), 1998–2025
export const SALES: [number, number][] = [
  [1998, 2513], [1999, 2988], [2000, 3935], [2001, 4863], [2002, 6032], [2003, 7956], [2004, 10376], [2005, 17576], [2006, 20826],
  [2007, 29889], [2008, 25068], [2009, 44355], [2010, 52721], [2011, 58589], [2012, 64456], [2013, 81428], [2014, 76292],
  [2015, 87281], [2016, 117627], [2017, 133701], [2018, 149973], [2019, 159725], [2020, 173613], [2021, 181930], [2022, 133308],
  [2023, 116622], [2024, 96750], [2025, 83937],
];
// the river's clock: 1998 at RIVER.a, 2021 at RIVER.peak (held until RIVER.hold), 2025 at RIVER.b
export const RIVER = { a: T.c7 + 15.2, peak: T.c7 + 25.0, hold: T.c7 + 31.0, b: T.c7 + 35.6, end: T.c7 + 42.0 };
// chapter 7 opens on 2009: loans nearly doubled, prices fell, land prices doubled where the new money went first
export const Y09 = { a: T.c7 + 3.4, b: T.c7 + 14.8 };
// the 2021 buyer: the money has run off, the debt has not
export const BUYER21 = T.c7 + 37.6;
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
// v5's next waves and world are cut; kept past the end so nothing fires
export const TECH = { a: 9000, b: 9001 };
export const WORLD = { a: 9000, b: 9001 };
