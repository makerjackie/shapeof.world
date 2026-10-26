// Camera of the map world (same conventions as films/tower/src/world/camera.ts): look at (x, y) km with `z` pixels
// per km at the target, turned to `bearing` (clockwise from north = screen up) and tilted `tilt` degrees from
// straight down. three.js axes: x = east, y = up, z = south, so a map point (x, y, h) sits at (x, h, -y).
import * as THREE from "three";

export const W = 1920;
export const H = 1080;
export const FOV = 30;

export type Cam = { x: number; y: number; z: number; bearing: number; tilt: number; ox?: number; oy?: number; fov?: number };

export const camDist = (c: Cam) => H / c.z / (2 * Math.tan(((c.fov ?? FOV) * Math.PI) / 360));

export const setCamera = (cam3: THREE.PerspectiveCamera, c: Cam) => {
  const d = camDist(c);
  const b = (c.bearing * Math.PI) / 180;
  const t = (Math.max(0.05, c.tilt) * Math.PI) / 180;
  const fx = Math.sin(b);
  const fy = Math.cos(b);
  cam3.position.set(c.x - fx * d * Math.sin(t), d * Math.cos(t), -(c.y - fy * d * Math.sin(t)));
  cam3.up.set(fx, 0, -fy);
  cam3.lookAt(c.x, 0, -c.y);
  cam3.fov = c.fov ?? FOV;
  cam3.aspect = W / H;
  cam3.near = Math.max(0.5, d * 0.02);
  cam3.far = d * 60;
  const ox = c.ox ?? W / 2;
  const oy = c.oy ?? H / 2;
  if (Math.abs(ox - W / 2) > 0.01 || Math.abs(oy - H / 2) > 0.01) cam3.setViewOffset(W, H, W / 2 - ox, H / 2 - oy, W, H);
  else cam3.clearViewOffset();
  cam3.updateProjectionMatrix();
  cam3.updateMatrixWorld(true);
  return d;
};

const PROJ = new THREE.PerspectiveCamera();
const V = new THREE.Vector3();
let last: Cam | null = null;

// Screen position of a map point under camera `c`: [x, y, visible]. Labels use this, so they sit exactly on the
// WebGL picture.
export const toScreen = (c: Cam, x: number, y: number, h = 0): [number, number, boolean] => {
  if (last !== c) {
    setCamera(PROJ, c);
    last = c;
  }
  V.set(x, h, -y).project(PROJ);
  return [((V.x + 1) / 2) * W, ((1 - V.y) / 2) * H, V.z < 1 && V.z > -1];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

// Zoom is interpolated in log space so a push-in feels even.
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)),
  bearing: lerpAngle(a.bearing, b.bearing, t),
  tilt: lerp(a.tilt, b.tilt, t),
  ox: lerp(a.ox ?? W / 2, b.ox ?? W / 2, t),
  oy: lerp(a.oy ?? H / 2, b.oy ?? H / 2, t),
  fov: lerp(a.fov ?? FOV, b.fov ?? FOV, t),
});
