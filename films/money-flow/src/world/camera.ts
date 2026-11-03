// Camera as a pure function of film time, shared by the WebGL engine and the screen-space overlays (labels).
import * as THREE from "three";
import { T, clamp } from "../timing";
import { TECH } from "./flows";

type V = [number, number, number];
type Key = { t: number; p: V; l: V; fov?: number };

const TABLE_P: V = [4.2, 3.4, 13.4];
const TABLE_L: V = [0.2, 1.7, 2.6];
const WIDE_P: V = [-5, 52, 63];
const WIDE_L: V = [-11, 0, -7];
const ROWB_P: V = [1, 21, 98];
const ROWB_L: V = [1, 5, 37];

const c1 = T.c1, c2 = T.c2, c3 = T.c3, c4 = T.c4, c5 = T.c5, c6 = T.c6, c7 = T.c7, c8 = T.c8, c9 = T.c9;
export const KEYS: Key[] = [
  // hook: the table, the note handed over
  { t: 0, p: TABLE_P, l: TABLE_L, fov: 34 },
  { t: 5.5, p: [3.4, 3.0, 12.0], l: [0.4, 1.5, 3.2], fov: 34 },
  { t: 9.2, p: [4.2, 3.2, 11.2], l: [1.6, 1.4, 3.4], fov: 34 },
  // 1: the counter, then up and out to see every place the coins reach
  { t: c1 + 2.8, p: [3.4, 4.2, 11.6], l: [1.8, 0.9, 3.8], fov: 36 },
  { t: c1 + 5.6, p: [-4, 12, 24], l: [-9, 0, 0], fov: 40 },
  { t: c1 + 9.8, p: WIDE_P, l: WIDE_L, fov: 46 },
  { t: c1 + 15, p: [-3, 53, 64], l: [-9, 0, -7], fov: 46 },
  { t: c1 + 21.6, p: [-6, 50, 61], l: [-10, 0, -7], fov: 46 },
  { t: c1 + 24.5, p: [-3, 20, 27], l: [-7, 0, -9], fov: 40 },
  { t: c1 + 30.5, p: [-5, 21, 26], l: [-8, 0, -9], fov: 40 },
  { t: c1 + 33.5, p: [0, 50, 62], l: [0, 0, -6], fov: 42 },
  // 2: the waiter's coins go home; the market splits; the landlord's mortgage; the platform
  { t: c2 + 1.0, p: [0, 46, 60], l: [-2, 0, -4], fov: 42 },
  { t: c2 + 4.6, p: [-15, 15, 47], l: [-21, 0, 23], fov: 38 },
  { t: c2 + 7.0, p: [-17, 25, 52], l: [-22, 0, 10], fov: 42 },
  { t: c2 + 12.4, p: [-18, 26, 53], l: [-23, 0, 9], fov: 42 },
  { t: c2 + 14.4, p: [-35, 16, 30], l: [-43, 0, 2], fov: 42 },
  { t: c2 + 19.6, p: [-36, 17, 31], l: [-43, 0, 2], fov: 42 },
  { t: c2 + 21.2, p: [-4, 22, 5], l: [-10, 0, -31], fov: 42 },
  { t: c2 + 26.2, p: [-5, 21, 3], l: [-10, 0, -31], fov: 42 },
  { t: c2 + 27.8, p: [25, 13, -6], l: [18, 1, -24], fov: 40 },
  { t: c2 + 32.6, p: [26, 13, -5], l: [18, 1, -24], fov: 40 },
  { t: c2 + 35.0, p: [0, 52, 62], l: [0, 0, -8], fov: 42 },
  // 3: the whole country
  { t: c3 + 1.5, p: [0, 72, 84], l: [0, 0, -2], fov: 42 },
  { t: c3 + 13, p: [-14, 68, 82], l: [-2, 0, 0], fov: 42 },
  { t: c3 + 30, p: [10, 62, 78], l: [2, 0, -2], fov: 42 },
  // 4: the ten households
  { t: c4 + 2.0, p: ROWB_P, l: ROWB_L, fov: 40 },
  { t: c4 + 17, p: [2, 20, 96], l: [1, 5, 37], fov: 40 },
  { t: c4 + 20, p: [3, 19, 95], l: [1, 6, 37], fov: 40 },
  { t: c4 + 31, p: [4, 19, 93], l: [2, 6, 37], fov: 40 },
  // 5: the house and the loan
  { t: c5 + 1.0, p: [17, 8.5, 40], l: [11, 1.5, 27], fov: 38 },
  { t: c5 + 4.5, p: [18, 9.5, 41], l: [11, 1.5, 27], fov: 38 },
  { t: c5 + 7.5, p: [22, 32, 58], l: [4, 0, -8], fov: 42 },
  { t: c5 + 11.6, p: [21, 31, 57], l: [3, 0, -8], fov: 42 },
  { t: c5 + 13.2, p: [7, 13, -22], l: [-2, 2, -40], fov: 40 },
  { t: c5 + 15.4, p: [-2, 60, 42], l: [-4, 0, -18], fov: 44 },
  { t: c5 + 24.5, p: [0, 58, 40], l: [-3, 0, -18], fov: 44 },
  { t: c5 + 26.6, p: [20, 25, -6], l: [17, 2, -40], fov: 42 },
  { t: c6 - 0.3, p: [21, 24, -5], l: [17, 2, -40], fov: 42 },
  // 6: the river into the new-homes district, then the new towers
  { t: c6 + 2.0, p: [-8, 50, 72], l: [-18, 0, -30], fov: 44 },
  { t: T.wave + 14, p: [-14, 54, 66], l: [-24, 5, -40], fov: 44 },
  { t: T.wave + 22, p: [-18, 36, 16], l: [-34, 8, -54], fov: 42 },
  { t: T.wave + 30, p: [-16, 34, 14], l: [-32, 8, -54], fov: 42 },
  { t: TECH.a + 1.5, p: [22, 22, -30], l: [20, 11, -68], fov: 44 },
  { t: TECH.a + 9, p: [24, 26, -26], l: [20, 11, -68], fov: 44 },
  { t: TECH.b - 0.5, p: [10, 60, 70], l: [4, 0, -20], fov: 44 },
  // 7: the world (the ten households again, from further off)
  { t: c7 + 2.5, p: [1, 27, 106], l: [1, 8, 37], fov: 40 },
  { t: c8 - 0.5, p: [2, 26, 103], l: [1, 8, 37], fov: 40 },
  // 8: but: the shop at dusk, the late buyers
  { t: c8 + 1.6, p: [6, 6.5, 17], l: [1, 1.5, 3], fov: 38 },
  { t: c8 + 5.4, p: [-3, 19, 26], l: [-8, 0, -8], fov: 40 },
  { t: c8 + 10.6, p: [-4, 20, 25], l: [-8, 0, -8], fov: 40 },
  { t: c8 + 12.6, p: [-28, 19, -28], l: [-38, 6, -58], fov: 42 },
  { t: c9 - 0.6, p: [-27, 18, -29], l: [-38, 6, -58], fov: 42 },
  // 9: back at the table, at night; then up over the whole town
  { t: c9 + 0.4, p: TABLE_P, l: TABLE_L, fov: 34 },
  { t: c9 + 3.4, p: [3.4, 4.2, 11.6], l: [1.8, 0.9, 3.8], fov: 36 },
  { t: c9 + 7.5, p: [0, 22, 36], l: [0, 0, 0], fov: 40 },
  { t: c9 + 15, p: [0, 56, 72], l: [0, 0, -6], fov: 42 },
  { t: T.last + 6, p: [0, 64, 80], l: [0, 0, -8], fov: 42 },
];

const ease = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; dist: number };

export function poseAt(t: number): Pose {
  const k = KEYS;
  let i = 0;
  while (i < k.length - 1 && t > k[i + 1].t) i++;
  const a = k[i];
  const b = k[Math.min(i + 1, k.length - 1)];
  const u = b.t === a.t ? 1 : ease((t - a.t) / (b.t - a.t));
  const lp = (x: V, y: V) => new THREE.Vector3(x[0] + (y[0] - x[0]) * u, x[1] + (y[1] - x[1]) * u, x[2] + (y[2] - x[2]) * u);
  const pos = lp(a.p, b.p);
  const look = lp(a.l, b.l);
  const d = pos.distanceTo(look);
  // a slow breathing drift so held shots are never frozen, scaled to the distance
  const s = Math.min(1, d / 40);
  pos.add(new THREE.Vector3(Math.sin(t * 0.21) * 0.5 * s, Math.sin(t * 0.17) * 0.3 * s, Math.cos(t * 0.19) * 0.5 * s));
  return { pos, look, fov: (a.fov ?? 38) + ((b.fov ?? 38) - (a.fov ?? 38)) * u, dist: d };
}

export const W = 1920;
export const H = 1080;
const cam = new THREE.PerspectiveCamera(38, W / H, 0.3, 1200);
export function applyPose(c: THREE.PerspectiveCamera, p: Pose) {
  c.fov = p.fov;
  c.position.copy(p.pos);
  c.lookAt(p.look);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
}
// world point → screen pixels at time t
export function project(t: number, v: THREE.Vector3): { x: number; y: number; vis: boolean } {
  applyPose(cam, poseAt(t));
  const q = v.clone().project(cam);
  return { x: (q.x * 0.5 + 0.5) * W, y: (-q.y * 0.5 + 0.5) * H, vis: q.z < 1 && q.z > -1 && Math.abs(q.x) < 1.1 && Math.abs(q.y) < 1.1 };
}
