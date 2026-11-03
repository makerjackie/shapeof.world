// Scene starts in seconds. Everything (camera, town state, captions, sound) keys off these, so the whole film can be
// retimed to the music by editing this one table.
export const FPS = 30;

// Score (tools/music.py): A 信用火花 (90 BPM, bar 2.6667 s, phase 0.08) from film 0 with two 8-bar repeats inserted
// (bars 0–16, 9–21, 14–end), so its one silence (track 62.2–64.0 s) falls on the reveal question and the downbeat of
// track bar 24 (film 106.75) on "约 5000 万". B 核心坍缩 from track 15.6 s at film 168.08: its pause (track 82–86 s)
// ends on the US bridge (film 238.5). C 安静的账本 from track 101.6 s at film 285: its silence (track 131–132.5 s)
// sits before the last line (film 316.4).
export const A_BAR = 240 / 90;
export const A_FILM = (trackBar: number) => 0.08 + (trackBar + 16) * A_BAR; // for track bars ≥ 22
export const HIT = A_FILM(24); // 106.75

export const T = {
  hook: 0,
  c1: 11, // where the money comes from
  c2: 40.4, // first split
  c3: 75, // a year of flowing (12 months)
  c4: HIT - 3, // reveal (103.75)
  c5: A_FILM(35), // where the rich get their money (US tax data) (136.08)
  c6: 168.08, // how they spend; savings lent back, interest flows back
  c7: 197.08, // stopped money buys assets
  c8: 213.08, // your 500k
  c9: 238.08, // US: another entrance (2008 vs 2020)
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

// chapter 3: the camera visits the six households, lowest income first (hold ≈ 3.1 s each, 1 s to travel)
export const VISIT = { rider: T.c3 + 2.6, worker: T.c3 + 6.7, coder: T.c3 + 10.8, landlord: T.c3 + 14.9, boss: T.c3 + 19.0, holder: T.c3 + 23.1 } as const;
export const VISIT_HOLD = 3.1;
