// Chart camera: where the data sits on screen at a given bar. Shared by the canvas and the HTML overlays.
import { births, deaths, Y0 } from "./data";
import { CURSOR, HEADX, SPAN } from "./plan";
import { W } from "./time";

export const Y_TOP = 900;
export const Y_BASE = 1500;

const rawMax = (bar: number) => {
  const c = CURSOR(bar);
  const span = SPAN(bar);
  const x0 = c - HEADX(bar) * span;
  let m = Math.max(births(c), deaths(c));
  for (let y = Math.max(Y0, Math.ceil(x0)); y <= c; y++) m = Math.max(m, births(y), deaths(y));
  return m;
};

// smoothed over the last ~0.7 bar so the scale breathes instead of jumping
export const yMaxAt = (bar: number) => {
  let s = 0;
  let w = 0;
  for (let i = 0; i < 10; i++) {
    const k = 1 - i / 10;
    s += rawMax(bar - i * 0.07) * k;
    w += k;
  }
  return Math.max(900, (s / w) * 1.22);
};

export type Cam = { c: number; x0: number; span: number; yMax: number };
export const camAt = (bar: number): Cam => {
  const c = CURSOR(bar);
  const span = SPAN(bar);
  return { c, span, x0: c - HEADX(bar) * span, yMax: yMaxAt(bar) };
};
export const sx = (cam: Cam, x: number) => ((x - cam.x0) / cam.span) * W;
export const sy = (cam: Cam, v: number) => Y_BASE - (v / cam.yMax) * (Y_BASE - Y_TOP);
