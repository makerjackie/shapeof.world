// Bars on the 千年之后 grid (film bar b = track bar b + 2; one bar = 2.150 s, see src/timing.ts) and the easing
// helpers every v4 layer uses. Everything in v4 is timed in film bars, so picture changes land on the music.
import { Easing } from "remotion";
import { BEAT_S, barToFrame, FIRST_BEAT_S, FPS } from "../timing";

export const BAR_S = BEAT_S * 4;
// Story bars: the film starts at track bar 4 and plays track bars 56–64 twice (public/music-v5.m4a, built by
// tools/music-edit.sh), so story bar b = track bar b + 2 up to 62 and track bar b − 6 from 70. The music is one
// continuous file, so story bars run evenly through the film.
export const STORY0 = 2;
export const barAt = (frame: number) => (frame / FPS - FIRST_BEAT_S) / BAR_S + STORY0;
export const bf = (bar: number) => barToFrame(bar - STORY0);

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1); // camera moves: decisive start, long settle

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 0 → 1 between bars b0 and b1.
export const ramp = (bar: number, b0: number, b1: number, ease: (t: number) => number = EIO) => ease(clamp01((bar - b0) / (b1 - b0)));

// v0 before b0, v1 after b1, eased in between.
export const tween = (bar: number, b0: number, b1: number, v0: number, v1: number, ease: (t: number) => number = EIO) => lerp(v0, v1, ramp(bar, b0, b1, ease));

// Piecewise track: [[bar, value], ...], eased between keys.
export const track = (bar: number, keys: [number, number][], ease: (t: number) => number = EIO) => {
  if (bar <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (bar <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(clamp01((bar - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  }
  return keys[keys.length - 1][1];
};

// Visible between bars [a, b] with fades of `f` bars at both ends.
export const window01 = (bar: number, a: number, b: number, f = 0.25) => Math.min(clamp01((bar - a) / f), clamp01((b - bar) / f));
