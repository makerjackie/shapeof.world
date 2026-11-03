// Scene starts in seconds. Everything (camera, town state, captions, sound) keys off these, so the whole film can be
// retimed to the music by editing this one table.
export const FPS = 30;

// Score (tools/music.py): A 信用火花 (90 BPM, bar 2.6667 s, phase 0.08) from film 0 with two 8-bar repeats inserted
// (bars 0–16, 9–21, 14–end), so its one silence (track 62.2–64.0 s) falls on the reveal question and the downbeat of
// track bar 24 (film 106.75) on "约 5000 万". B 核心坍缩 from track 15.6 s at film 168.08: its pause (track 82–86 s)
// ends on the bridge into the next waves (film 238.5). C 安静的账本 from track 101.6 s at film 285: its silence
// (track 131–132.5 s) sits before the last line (film 316.4).
export const A_BAR = 240 / 90;
export const A_FILM = (trackBar: number) => 0.08 + (trackBar + 16) * A_BAR; // for track bars ≥ 22
export const HIT = A_FILM(24); // 106.75

export const T = {
  hook: 0,
  c1: 11, // where the money comes from: loans
  c2: 31, // first stop: a factory; the split 53 / 8 / 39
  c3: 62, // a year of flowing (12 months), six households
  c4: HIT - 3, // reveal (103.75)
  c5: A_FILM(35), // where the rich get their money (136.08)
  c6: 168.08, // how they spend; savings lent back, interest flows back
  c7: 197.08, // the housing wave: rise and ebb
  c9: 238.08, // the next waves; the world
  c10: 285, // but…
  c11: 309, // ending
  sources: 326,
  card: 334,
  end: 342,
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
export const RIVER = { a: T.c7 + 6.6, peak: T.c7 + 18.0, hold: T.c7 + 26.0, b: T.c7 + 32.0, end: T.c7 + 40.6 };
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
// chapter 9: the next waves (phones, internet, batteries, chips), then the world
export const TECH = { a: T.c9 + 7.2, b: T.c9 + 24.2 };
export const WORLD = { a: T.c9 + 24.4, b: T.c10 - 0.2 };
