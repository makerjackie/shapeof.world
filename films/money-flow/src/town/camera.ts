// Camera as a pure function of film time, shared by the WebGL engine and the screen-space overlays (labels).
import * as THREE from "three";
import { T, clamp } from "../timing";
import { BANK, DEV, GOV, HOUSES, HUB, SHANTY, TOWER, YOU_RANK, tankTop } from "./layout";

type V = [number, number, number];
type Key = { t: number; p: V; l: V; fov?: number; hold?: number };

const top = (rank: number): V => {
  const h = HOUSES.find((x) => x.rank === rank)!;
  const v = tankTop(h);
  return [v.x, v.y - 1, v.z];
};
const at = (v: THREE.Vector3, dy = 0): V => [v.x, v.y + dy, v.z];
const off = (a: V, d: V): V => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];

// Wide: the whole town from the south, a little to the west.
const WIDE_P: V = [8, 58, 92];
const WIDE_L: V = [8, 0, -6];

export const KEYS: Key[] = [
  // hook: from high above the town, settle on the wide shot, then down toward the tower as the gold falls
  { t: T.hook, p: [-4, 40, 30], l: [-30, 36, -15], fov: 44 },
  { t: T.hook + 2.6, p: [-12, 30, 22], l: [-28, 18, -14], fov: 42 },
  { t: T.hook + 6.4, p: [12, 64, 98], l: [6, 0, -8], fov: 36 },
  { t: T.hook + 10.4, p: [-8, 44, 66], l: [-16, 12, -12], fov: 36 },
  // chapter 1: the tower, the bank, then the shanty area
  { t: T.c1 + 3, p: [-14, 30, 24], l: at(TOWER, 13), fov: 38 },
  { t: T.c1 + 9, p: [-6, 22, 12], l: at(BANK, 3), fov: 38 },
  { t: T.c1 + 14.5, p: [-24, 26, 40], l: at(SHANTY, 0), fov: 38 },
  { t: T.c1 + 28, p: [-30, 21, 34], l: at(SHANTY, 0), fov: 38 },
  // chapter 2: shanty → developer → government → market, then the split into the town
  { t: T.c2 + 5, p: [-22, 34, 30], l: [-40, 4, -12], fov: 40 },
  { t: T.c2 + 10, p: [-8, 34, 26], l: [-26, 4, -16], fov: 40 },
  { t: T.c2 + 15.5, p: [-4, 28, 30], l: at(HUB, 2), fov: 40 },
  { t: T.c2 + 21, p: [14, 44, 58], l: [12, 0, -4], fov: 40 },
  { t: T.c2 + 30, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 3: down to a small house at the front, across to a mansion, back up for the whole town
  { t: T.c3 + 4, p: [24, 12, 40], l: [30, 1.5, 24.5], fov: 36 },
  { t: T.c3 + 11, p: [18, 9, 36], l: [26, 2, 25], fov: 34 },
  { t: T.c3 + 14.5, p: [42, 18, -2], l: top(2), fov: 34 },
  { t: T.c3 + 18.5, p: [44, 16, -6], l: top(2), fov: 34 },
  { t: T.c3 + 23, p: [10, 64, 86], l: [14, 0, -6], fov: 38 },
  { t: T.c4 - 1, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 4: reveal along the hill, the middle rows, the front rows
  { t: T.c4 + 3.0, p: [36, 26, 4], l: [36, 6, -31], fov: 40 },
  { t: T.c4 + 8.2, p: [36, 22, 6], l: [36, 4, -30], fov: 42 },
  { t: T.c4 + 10.4, p: [36, 30, 22], l: [36, 2, -16], fov: 42 },
  { t: T.c4 + 14.6, p: [36, 38, 52], l: [34, 0, 10], fov: 42 },
  { t: T.c4 + 21, p: [30, 50, 74], l: [30, 0, 4], fov: 40 },
  { t: T.c4 + 31, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 5: push into the richest house's tank
  { t: T.c5 + 4, p: [28, 16, -14], l: top(2), fov: 30 },
  { t: T.c5 + 13, p: [42, 12, -18], l: top(2), fov: 26 },
  { t: T.c5 + 16.5, p: [43, 12.5, -17], l: top(2), fov: 26 },
  { t: T.c5 + 21, p: [36, 24, 8], l: [36, 4, -30], fov: 40 },
  { t: T.c5 + 32, p: [36, 30, 16], l: [36, 4, -26], fov: 42 },
  // chapter 6: the hill, the bank, the front rows (loans out, interest back)
  { t: T.c6 + 3, p: [24, 26, 0], l: [26, 4, -31], fov: 40 },
  { t: T.c6 + 9, p: [24, 24, -2], l: [26, 4, -31], fov: 40 },
  { t: T.c6 + 12.5, p: [2, 34, 26], l: [-8, 0, -14], fov: 42 },
  { t: T.c6 + 16.5, p: [34, 26, 44], l: [32, 0, 4], fov: 40 },
  { t: T.c6 + 21, p: [30, 34, 50], l: [30, 1, -8], fov: 40 },
  { t: T.c6 + 27, p: [14, 52, 66], l: [14, 0, 0], fov: 40 },
  // chapter 7: the asset district rises
  { t: T.c7 + 3, p: [-12, 36, 22], l: at(DEV, 10), fov: 40 },
  { t: T.c7 + 15, p: [-16, 30, 16], l: at(DEV, 14), fov: 40 },
  // chapter 8: dim, a middle house (overlay carries the floor plan)
  { t: T.c8 + 2, p: [30, 20, 20], l: top(20), fov: 34 },
  { t: T.c8 + 24, p: [32, 18, 14], l: top(20), fov: 32 },
  // chapter 9: the US — the whole town again, then Wall Street (towers), then every door, then the shops
  { t: T.c9 + 3, p: WIDE_P, l: WIDE_L, fov: 38 },
  { t: T.c9 + 9, p: [-6, 40, 30], l: [-36, 10, -21], fov: 42 },
  { t: T.c9 + 21, p: [-4, 42, 28], l: [-37, 14, -23], fov: 42 },
  { t: T.c9 + 29.5, p: [30, 26, 42], l: [32, 0, 12], fov: 40 },
  { t: T.c9 + 35.5, p: [-2, 26, 30], l: at(HUB, 2), fov: 38 },
  { t: T.c9 + 43, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 10: slow drift over the town
  { t: T.c10 + 22, p: [24, 54, 80], l: [16, 0, -6], fov: 38 },
  // chapter 11: down to one ordinary house, then all the way out
  { t: T.c11 + 2, p: [24, 30, 50], l: [24, 0, 10], fov: 38 },
  { t: T.c11 + 7, p: off(top(YOU_RANK), [1, 5.5, 9]), l: top(YOU_RANK), fov: 34 },
  { t: T.c11 + 12, p: off(top(YOU_RANK), [1.5, 6, 10]), l: top(YOU_RANK), fov: 34 },
  { t: T.sources, p: [10, 110, 140], l: [4, 0, -8], fov: 34 },
];

const ease = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };

export function poseAt(t: number): Pose {
  const k = KEYS;
  let i = 0;
  while (i < k.length - 1 && t > k[i + 1].t) i++;
  const a = k[i];
  const b = k[Math.min(i + 1, k.length - 1)];
  const u = b.t === a.t ? 1 : ease((t - a.t) / (b.t - a.t));
  const lp = (x: V, y: V) => new THREE.Vector3(x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u);
  // a slow breathing drift so held shots are never frozen
  const drift = new THREE.Vector3(Math.sin(t * 0.21) * 0.6, Math.sin(t * 0.17) * 0.35, Math.cos(t * 0.19) * 0.6);
  return { pos: lp(a.p, b.p).add(drift), look: lp(a.l, b.l), fov: (a.fov ?? 38) + ((b.fov ?? 38) - (a.fov ?? 38)) * u };
}

export const W = 1920;
export const H = 1080;
const cam = new THREE.PerspectiveCamera(38, W / H, 0.5, 900);
export function applyPose(c: THREE.PerspectiveCamera, p: Pose) {
  c.fov = p.fov;
  c.position.copy(p.pos);
  c.lookAt(p.look);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
}
// world point → screen pixels at time t (null if behind the camera)
export function project(t: number, v: THREE.Vector3): { x: number; y: number; vis: boolean } {
  applyPose(cam, poseAt(t));
  const q = v.clone().project(cam);
  return { x: (q.x * 0.5 + 0.5) * W, y: (-q.y * 0.5 + 0.5) * H, vis: q.z < 1 && q.z > -1 };
}
export const ANCHORS = {
  tower: new THREE.Vector3(TOWER.x, 30, TOWER.z),
  bank: new THREE.Vector3(BANK.x, 8.5, BANK.z),
  gov: new THREE.Vector3(GOV.x, 7.5, GOV.z),
  hub: new THREE.Vector3(HUB.x, 7.5, HUB.z),
  dev: new THREE.Vector3(DEV.x - 3, 24, DEV.z),
  shanty: new THREE.Vector3(SHANTY.x, 4.5, SHANTY.z),
};
