// Orbit camera over the local frame: look at (x, y, h) metres from `dist` metres away, facing `yaw` degrees
// (clockwise from north), tilted `pitch` degrees from straight down. three.js axes: x = east, y = up, z = south.
import * as THREE from "three";

export const W = 1920;
export const H = 1080;

export type Cam = { x: number; y: number; h: number; dist: number; yaw: number; pitch: number; fov?: number; oy?: number };

export const camPos = (c: Cam): [number, number, number] => {
  const yaw = (c.yaw * Math.PI) / 180;
  const p = (Math.max(0.01, c.pitch) * Math.PI) / 180;
  const fx = Math.sin(yaw) * Math.sin(p);
  const fy = -Math.cos(p);
  const fz = -Math.cos(yaw) * Math.sin(p);
  return [c.x - fx * c.dist, c.h - fy * c.dist, -c.y - fz * c.dist];
};

export const setCamera = (cam: THREE.PerspectiveCamera, c: Cam) => {
  const [px, py, pz] = camPos(c);
  const yaw = (c.yaw * Math.PI) / 180;
  cam.position.set(px, py, pz);
  cam.up.set(Math.sin(yaw), 0, -Math.cos(yaw));
  if (c.pitch > 3) cam.up.set(0, 1, 0);
  cam.lookAt(c.x, c.h, -c.y);
  cam.fov = c.fov ?? 34;
  cam.aspect = W / H;
  cam.near = Math.max(0.5, c.dist * 0.002);
  cam.far = c.dist * 60 + 60000;
  const oy = c.oy ?? H / 2;
  if (Math.abs(oy - H / 2) > 0.5) cam.setViewOffset(W, H, 0, H / 2 - oy, W, H);
  else cam.clearViewOffset();
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};

const PROJ = new THREE.PerspectiveCamera();
const V = new THREE.Vector3();
let last: Cam | null = null;
// Screen position of a local-frame point (x east, y north, h up) under camera c: [x, y, visible].
export const toScreen = (c: Cam, x: number, y: number, h = 0): [number, number, boolean] => {
  if (last !== c) {
    setCamera(PROJ, c);
    last = c;
  }
  V.set(x, h, -y).project(PROJ);
  return [((V.x + 1) / 2) * W, ((1 - V.y) / 2) * H, V.z < 1 && V.z > -1];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAng = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};
// Blend two cameras; distance in log space so long dives feel even.
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  h: lerp(a.h, b.h, t),
  dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)),
  yaw: lerpAng(a.yaw, b.yaw, t),
  pitch: lerp(a.pitch, b.pitch, t),
  fov: lerp(a.fov ?? 34, b.fov ?? 34, t),
  oy: lerp(a.oy ?? H / 2, b.oy ?? H / 2, t),
});
