// The film runs on the original score of 《独立开发者的形状》 (music/score.js, re-arranged for this film):
// 120 BPM, one bar = 2 s, bar 0 starts at 0.5 s. Everything is timed in film bars: b(4.5) is the middle of bar 4.
import { Easing } from "remotion";

export const FPS = 30;
export const BAR = 2;
export const PHASE = 0.5;
export const b = (bar: number) => PHASE + bar * BAR; // seconds at film bar
export const fb = (bar: number) => Math.round(b(bar) * FPS);

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1);
export const EI = Easing.bezier(0.5, 0, 0.75, 0);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, c: number, t: number) => a + (c - a) * t;
export const ramp = (t: number, t0: number, t1: number, ease: (x: number) => number = EIO) => ease(clamp01((t - t0) / (t1 - t0)));
export const tween = (t: number, t0: number, t1: number, v0: number, v1: number, ease: (x: number) => number = EIO) => lerp(v0, v1, ramp(t, t0, t1, ease));
export const fade = (t: number, a: number, z: number, f = 0.35) => Math.min(clamp01((t - a) / f), clamp01((z - t) / f));

// The film: 91 bars (the score's tail fades under the end card).
export const FILM_BARS = 91;
export const FILM_FRAMES = Math.round(b(FILM_BARS) * FPS);
