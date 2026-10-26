// Camera: look at a target point (x, y, z; y up) from `dist` units away, turned `yaw` degrees around the vertical
// (0 = looking toward −z) and pitched `pitch` degrees down from the horizon. Overlays use project() with the same
// camera, so 2D type sits exactly on the WebGL picture.
import * as THREE from "three";

export const W = 1920;
export const H = 1080;

export type Cam = { x: number; y: number; z: number; dist: number; yaw: number; pitch: number; fov: number; roll?: number };

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
  cam3.far = 5000;
  cam3.updateProjectionMatrix();
  cam3.updateMatrixWorld(true);
};

const PROJ = new THREE.PerspectiveCamera();
const V = new THREE.Vector3();

// Screen position (px) of a world point, and whether it is in front of the camera.
export const project = (c: Cam, p: [number, number, number]): { x: number; y: number; front: boolean } => {
  setCamera(PROJ, c);
  V.set(p[0], p[1], p[2]);
  const view = V.clone().applyMatrix4(PROJ.matrixWorldInverse);
  V.project(PROJ);
  return { x: ((V.x + 1) / 2) * W, y: ((1 - V.y) / 2) * H, front: view.z < 0 };
};

export const lerpCam = (a: Cam, b: Cam, t: number): Cam => {
  const L = (u: number, v: number) => u + (v - u) * t;
  return { x: L(a.x, b.x), y: L(a.y, b.y), z: L(a.z, b.z), dist: Math.exp(L(Math.log(a.dist), Math.log(b.dist))), yaw: L(a.yaw, b.yaw), pitch: L(a.pitch, b.pitch), fov: L(a.fov, b.fov), roll: L(a.roll ?? 0, b.roll ?? 0) };
};
