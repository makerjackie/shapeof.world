// The film runs on one soundtrack, 《千年之后（氛围版）》, edited on bar lines by tools/music.sh into
// public/music.wav: track bars 0–64, 56–64, 16–48, 64 to the end. Measured 111.62 BPM, first beat 0.487 s, one bar
// 2.150 s. Because the edit is one continuous file, "film bars" F run evenly from the first beat: F0–64 are track
// 0–64, F64–72 track 56–64, F72–104 track 16–48, F104 on track 64 to the end. Everything is timed in film bars.
import { Easing } from "remotion";

export const FPS = 30;
export const BPM = 111.62;
export const BAR = (4 * 60) / BPM;
export const PHASE = 0.487;

// film seconds / frame at film bar f
export const sf = (f: number) => PHASE + f * BAR;
export const ff = (f: number) => Math.round(sf(f) * FPS);
export const barAt = (t: number) => (t - PHASE) / BAR;

const TRACK_END = 181.91; // 《千年之后（氛围版）》 length, s
export const MUSIC_S = sf(64) + 8 * BAR + 32 * BAR + (TRACK_END - sf(64));
export const FILM_FRAMES = Math.floor((MUSIC_S - 0.1) * FPS);

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1);
export const EI = Easing.bezier(0.5, 0, 0.75, 0);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, t0: number, t1: number, ease: (x: number) => number = EIO) => ease(clamp01((t - t0) / (t1 - t0)));
export const tween = (t: number, t0: number, t1: number, v0: number, v1: number, ease: (x: number) => number = EIO) => lerp(v0, v1, ramp(t, t0, t1, ease));

export const track = (t: number, keys: [number, number][], ease: (x: number) => number = EIO) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  }
  return keys[keys.length - 1][1];
};

// 1 inside [a, b] with fades of f seconds.
export const win = (t: number, a: number, b: number, f = 0.4) => Math.min(clamp01((t - a) / f), clamp01((b - t) / f));
