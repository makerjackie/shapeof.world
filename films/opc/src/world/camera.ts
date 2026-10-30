// Camera: look at a target point (x, y, z in metres: x along the hero street, y up, z across it) from `dist`
// metres away, turned `yaw` degrees (0 = looking toward -z, positive turns toward +x) and pitched `pitch` degrees
// down from the horizon. Overlays use toScreen with the same camera, so they sit exactly on the WebGL picture.
// (From films/highrise/src/world/camera.ts.)
import * as THREE from "three";

export const W = 1920;
export const H = 1080;

export type Cam = { x: number; y: number; z: number; dist: number; yaw: number; pitch: number; fov: number; roll?: number; ox?: number; oy?: number };

export const camPos = (c: Cam): [number, number, number] => {
  const yw = (c.yaw * Math.PI) / 180;
  const pt = (c.pitch * Math.PI) / 180;
  const fx = Math.sin(yw) * Math.cos(pt);
  const fy = -Math.sin(pt);
  const fz = -Math.cos(yw) * Math.cos(pt);
  return [c.x - fx * c.dist, c.y - fy * c.dist, c.z - fz * c.dist];
};

export const setCamera = (cam3: THREE.PerspectiveCamera, c: Cam) => {
  const [px, py, pz] = camPos(c);
  cam3.position.set(px, py, pz);
  cam3.up.set(0, 1, 0);
  cam3.lookAt(c.x, c.y, c.z);
  if (c.roll) cam3.rotateZ((c.roll * Math.PI) / 180);
  cam3.fov = c.fov;
  cam3.aspect = W / H;
  cam3.near = Math.max(0.05, c.dist * 0.01);
  cam3.far = 9000;
  const ox = c.ox ?? W / 2;
  const oy = c.oy ?? H / 2;
  if (Math.abs(ox - W / 2) > 0.01 || Math.abs(oy - H / 2) > 0.01) cam3.setViewOffset(W, H, W / 2 - ox, H / 2 - oy, W, H);
  else cam3.clearViewOffset();
  cam3.updateProjectionMatrix();
  cam3.updateMatrixWorld(true);
};

const PROJ = new THREE.PerspectiveCamera();
const V = new THREE.Vector3();
let last: Cam | null = null;

// [screen x, screen y, in front of the camera]
export const toScreen = (c: Cam, x: number, y: number, z: number): [number, number, boolean] => {
  if (last !== c) {
    setCamera(PROJ, c);
    last = c;
  }
  V.set(x, y, z).project(PROJ);
  return [((V.x + 1) / 2) * W, ((1 - V.y) / 2) * H, V.z < 1 && V.z > -1];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

// Blend two cameras: target and angles linearly, distance in log space (so zooms feel even).
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
  dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)),
  yaw: lerpAngle(a.yaw, b.yaw, t),
  pitch: lerp(a.pitch, b.pitch, t),
  fov: lerp(a.fov, b.fov, t),
  roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
  ox: lerp(a.ox ?? W / 2, b.ox ?? W / 2, t),
  oy: lerp(a.oy ?? H / 2, b.oy ?? H / 2, t),
});

// A camera path through keyframes [time, cam], eased between neighbours.
export const camPath = (t: number, keys: [number, Cam][], ease: (x: number) => number) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      return mixCam(a, b, ease((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
};

// CSS matrix3d that maps a w x h element onto the screen quad tl, tr, br, bl (a projective map), so flat UI
// (a laptop screen, a licence, a banner) can sit on a plane of the 3D world and stay crisp.
export const quadMatrix = (w: number, h: number, q: [number, number][]) => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  // unit square -> quad (Heckbert)
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // compose with scale(1/w, 1/h); column-major 4x4 for matrix3d
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => v.toFixed(8)).join(",")})`;
};

// The four screen corners of a world-space rectangle centred at p, spanning half-vectors u (right) and v (up).
export const rectCorners = (cam: Cam, p: [number, number, number], u: [number, number, number], v: [number, number, number]): [number, number][] | null => {
  const pts: [number, number][] = [];
  for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
    const [x, y, ok] = toScreen(cam, p[0] + su * u[0] + sv * v[0], p[1] + su * u[1] + sv * v[1], p[2] + su * u[2] + sv * v[2]);
    if (!ok) return null;
    pts.push([x, y]);
  }
  return pts;
};
