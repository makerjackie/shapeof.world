// The film runs on two soundtracks back to back (tools/music.sh builds public/music.wav):
//   A《看不见的晕》invisible-halo: measured 135.99 BPM (the catalogue's 68 BPM, counted in halves), first beat
//     0.007 s. An "A bar" is four of those beats, 1.765 s. The film plays A from its start to A bar 78.
//   B《冰的后退》ice-retreat: measured 130.0 BPM, first beat 0.029 s; a "B bar" is 1.846 s. B starts right where A
//     stops and plays from its own start.
// Everything in the film is timed in these bars, so the picture lands on the music.
import { Easing } from "remotion";

export const FPS = 30;
export const A_BAR = (4 * 60) / 135.989;
export const A_PHASE = 0.0069;
export const B_BAR = (4 * 60) / 129.999;
export const B_PHASE = 0.0288;
export const A_END = 78;
export const B_START = A_PHASE + A_END * A_BAR; // film seconds where track B begins

// Film seconds at A bar b / B bar b.
export const sa = (b: number) => A_PHASE + b * A_BAR;
export const sb = (b: number) => B_START + B_PHASE + b * B_BAR;
// Film frame at A bar b / B bar b.
export const fa = (b: number) => Math.round(sa(b) * FPS);
export const fb = (b: number) => Math.round(sb(b) * FPS);

// Where the story is: "A12.5" style positions for any film second.
export const barA = (t: number) => (t - A_PHASE) / A_BAR;
export const barB = (t: number) => (t - B_START - B_PHASE) / B_BAR;

export const END_BAR_B = 71;
export const FILM_FRAMES = fb(END_BAR_B);

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1);
export const EI = Easing.bezier(0.5, 0, 0.75, 0);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, t0: number, t1: number, ease: (x: number) => number = EIO) => ease(clamp01((t - t0) / (t1 - t0)));
export const tween = (t: number, t0: number, t1: number, v0: number, v1: number, ease: (x: number) => number = EIO) => lerp(v0, v1, ramp(t, t0, t1, ease));

// Piecewise: [[t, v], ...] eased between keys.
export const track = (t: number, keys: [number, number][], ease: (x: number) => number = EIO) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  }
  return keys[keys.length - 1][1];
};

// 1 inside [a, b] with fades of f seconds.
export const win = (t: number, a: number, b: number, f = 0.4) => Math.min(clamp01((t - a) / f), clamp01((b - t) / f));
