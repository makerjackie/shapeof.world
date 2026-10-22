// Map camera. World coordinates are metres east (x) and north (y) of the origin in src/geo/data.ts, heights (h)
// in metres. A camera looks at (x, y) with `z` pixels per metre, turned to `bearing` degrees (clockwise from north,
// that direction is screen-up) and tilted `tilt` degrees from straight down. A light perspective keeps tall towers
// readable when tilted.
import { Easing, interpolate } from "remotion";

export const W = 1920;
export const H = 1080;

export type Cam = { x: number; y: number; z: number; bearing: number; tilt: number; ox?: number; oy?: number };

export type Proj = {
  cam: Cam;
  cb: number;
  sb: number;
  ct: number;
  st: number;
  ox: number;
  oy: number;
  dist: number; // camera distance in metres (perspective)
};

export const makeProj = (cam: Cam): Proj => {
  const b = (cam.bearing * Math.PI) / 180;
  const t = (cam.tilt * Math.PI) / 180;
  return {
    cam,
    cb: Math.cos(b),
    sb: Math.sin(b),
    ct: Math.cos(t),
    st: Math.sin(t),
    ox: cam.ox ?? W / 2,
    oy: cam.oy ?? H / 2,
    dist: (H / cam.z) * 1.9,
  };
};

// Screen position of a world point; the third value is its depth (bigger = farther from the viewer).
export const project = (p: Proj, x: number, y: number, h = 0): [number, number, number] => {
  const dx = x - p.cam.x;
  const dy = y - p.cam.y;
  const rx = dx * p.cb - dy * p.sb;
  const ry = dx * p.sb + dy * p.cb;
  const depth = ry * p.st - h * p.ct;
  const s = p.dist / Math.max(p.dist * 0.25, p.dist + depth);
  return [p.ox + rx * p.cam.z * s, p.oy - (ry * p.ct + h * p.st) * p.cam.z * s, ry];
};

// The viewing direction on the ground (unit vector pointing away from the viewer).
export const viewDir = (p: Proj): [number, number] => [p.sb, p.cb];

// ---------- Camera moves ----------

const cosh = (x: number) => (Math.exp(x) + Math.exp(-x)) / 2;
const sinh = (x: number) => (Math.exp(x) - Math.exp(-x)) / 2;
const tanh = (x: number) => sinh(x) / cosh(x);

// van Wijk & Nuij smooth zoom + pan (the d3.interpolateZoom path): zooms out while it travels, so a long jump
// never loses the target off screen. Points are [x, y, viewport width in metres].
const zoomPath = (p0: [number, number, number], p1: [number, number, number]) => {
  const rho = Math.SQRT2;
  const [ux0, uy0, w0] = p0;
  const [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-6) {
    const S = Math.log(w1 / w0) / rho;
    return (t: number): [number, number, number] => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + 4 * d2) / (2 * w0 * 2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - 4 * d2) / (2 * w1 * 2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return (t: number): [number, number, number] => {
    const s = t * S;
    const u = (w0 / (2 * d1)) * (cosh(r0) * tanh(rho * s + r0) - sinh(r0));
    return [ux0 + u * dx, uy0 + u * dy, (w0 * cosh(r0)) / cosh(rho * s + r0)];
  };
};

export const EASE_MOVE = Easing.bezier(0.7, 0, 0.2, 1);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const mixCam = (a: Cam, b: Cam, t: number): Cam => {
  const path = zoomPath([a.x, a.y, W / a.z], [b.x, b.y, W / b.z]);
  const [x, y, w] = path(t);
  return {
    x,
    y,
    z: W / w,
    bearing: lerp(a.bearing, b.bearing, t),
    tilt: lerp(a.tilt, b.tilt, t),
    ox: lerp(a.ox ?? W / 2, b.ox ?? W / 2, t),
    oy: lerp(a.oy ?? H / 2, b.oy ?? H / 2, t),
  };
};

// A camera track: hold each key until `at` (frames), then move to the next over `dur` frames. Moves are decisive
// eased cuts on the beat, never a drift.
export type CamKey = { at: number; dur: number; cam: Cam; ease?: (t: number) => number };

export const camAt = (frame: number, keys: CamKey[]): Cam => {
  let cam = keys[0].cam;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.at) break;
    const t = interpolate(frame, [k.at, k.at + k.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    cam = t >= 1 ? k.cam : mixCam(cam, k.cam, (k.ease ?? EASE_MOVE)(t));
  }
  return cam;
};
