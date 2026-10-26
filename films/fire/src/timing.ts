// The film runs on one soundtrack, 《千年之后（氛围版）》, cut on bar lines by tools/music.sh into public/music.wav:
// track bars 8–64, then 16–40, then 64 to the end. Measured 111.62 BPM, first beat 0.487 s, one bar 2.150 s.
// The edit starts exactly on the downbeat of track bar 8, so film bar F starts at F × BAR seconds:
// F0–56 = track 8–64 (F32–40 is the quiet break), F56–80 = track 16–40, F80 on = track 64 to the end (F80–94 the
// last big section, F94 on the fade).
import { Easing } from "remotion";

export const FPS = 30;
export const BPM = 111.62;
export const BAR = (4 * 60) / BPM;
export const BEAT = BAR / 4;

const TRACK_END = 181.905; // track length, s
const PHASE = 0.487;
export const MUSIC_S = 56 * BAR + 24 * BAR + (TRACK_END - (PHASE + 64 * BAR));
export const FILM_FRAMES = Math.floor((MUSIC_S - 0.05) * FPS);

// film seconds at film bar f, and the frame
export const F = (f: number) => f * BAR;
export const ff = (f: number) => Math.round(F(f) * FPS);

export const EO = Easing.bezier(0.16, 1, 0.3, 1); // fast out, long settle
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1);
export const EI = Easing.bezier(0.5, 0, 0.75, 0);
export const LIN = (x: number) => x;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, t0: number, t1: number, ease: (x: number) => number = EIO) => ease(clamp01((t - t0) / (t1 - t0)));
export const tween = (t: number, t0: number, t1: number, v0: number, v1: number, ease: (x: number) => number = EIO) => lerp(v0, v1, ramp(t, t0, t1, ease));

// Piecewise keyframes [time, value]; eased between keys.
export const track = (t: number, keys: [number, number][], ease: (x: number) => number = EIO) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  }
  return keys[keys.length - 1][1];
};

// 1 inside [a, b] with fades of f seconds.
export const win = (t: number, a: number, b: number, f = 0.35) => Math.min(clamp01((t - a) / f), clamp01((b - t) / f));

// Deterministic hash noise in [0, 1).
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
