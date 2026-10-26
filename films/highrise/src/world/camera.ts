// Camera: look at a target point (x, y, z in three.js metres: x east, y up, z south) from `dist` metres away,
// turned `yaw` degrees (0 = looking north, positive turns to the east) and pitched `pitch` degrees down from the
// horizon. Labels use toScreen with the same camera, so they sit exactly on the WebGL picture.
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
  cam3.near = Math.max(0.3, c.dist * 0.01);
  cam3.far = 60000;
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
  let d = ((b - a + 540) % 360) - 180;
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
