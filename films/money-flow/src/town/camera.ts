// Camera as a pure function of film time, shared by the WebGL engine and the screen-space overlays (labels).
import * as THREE from "three";
import { BUYER21, HOLD, RIVER, T, VISIT, Y09, clamp } from "../timing";
import { BANK, CAST, DEV, GOV, HOUSES, HUB, Role, YOU_RANK, byRank, tankTop } from "./layout";

type V = [number, number, number];
type Key = { t: number; p: V; l: V; fov?: number; hold?: number };

const top = (rank: number): V => {
  const h = HOUSES.find((x) => x.rank === rank)!;
  const v = tankTop(h);
  return [v.x, v.y - 1, v.z];
};
const at = (v: THREE.Vector3, dy = 0): V => [v.x, v.y + dy, v.z];
const off = (a: V, d: V): V => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];

// a portrait of one household: house, tank and the person in the yard, from the south-east (flows leave north-west)
const portrait = (role: Role, push = 1): { p: V; l: V; fov: number } => {
  const h = byRank(CAST[role]);
  const k = { small: 1, house: 1.25, villa: 1.45, mansion: 2.2 }[h.kind] * push;
  const l: V = [h.x - h.w * 0.05, h.y + h.h + 0.6, h.z + h.d * 0.3];
  return { p: [l[0] + 6.5 * k, l[1] + 6.5 * k, l[2] + 11.5 * k], l, fov: 36 };
};
const portraitOf = (rank: number, push = 1) => portrait((Object.keys(CAST) as Role[]).find((r) => CAST[r] === rank)!, push);
const visit = (role: Role): Key[] => [
  { t: VISIT[role], ...portrait(role, 1.05) },
  { t: VISIT[role] + HOLD[role], ...portrait(role, 0.92) },
];

// Wide: the whole town from the south, a little to the west.
const WIDE_P: V = [8, 58, 92];
const WIDE_L: V = [8, 0, -6];

export const KEYS: Key[] = [
  // hook: gold falls into the bank; the camera skims low over the roofs to the front rows, then rises for the town
  { t: T.hook, p: [4, 30, 16], l: [BANK.x, 12, BANK.z], fov: 46 },
  { t: T.hook + 2.8, p: [8, 16, 22], l: [-10, 5, -10], fov: 46 },
  { t: T.hook + 6.0, p: [44, 15, 40], l: [24, 2, 2], fov: 44 },
  { t: T.hook + 8.4, p: [46, 18, 44], l: [24, 1, 4], fov: 44 },
  { t: T.c1 + 0.2, p: [16, 52, 82], l: [8, 0, -6], fov: 38 },
  { t: T.c1 + 3.4, p: [12, 50, 78], l: [6, 0, -6], fov: 38 },
  // chapter 1: the bank lends to the factory; the debt stays with the factory
  { t: T.c1 + 6.0, p: [2, 24, 20], l: [-15, 3, -8], fov: 42 },
  { t: T.c1 + 10.5, p: [-2, 19, 24], l: at(HUB, 2), fov: 40 },
  { t: T.c1 + 16, p: [0, 20, 26], l: at(HUB, 2), fov: 40 },
  { t: T.c2 - 0.5, p: [0, 25, 31], l: [-16, 2, -6], fov: 40 },
  // chapter 2: the factory, then the split into the town
  { t: T.c2 + 4, p: [-2, 20, 26], l: at(HUB, 2), fov: 40 },
  { t: T.c2 + 9, p: [4, 28, 34], l: [-8, 0, 0], fov: 40 },
  { t: T.c2 + 13, p: [14, 44, 58], l: [12, 0, -4], fov: 40 },
  // down among the front rows, where wages are spent and become someone else's wages
  { t: T.c2 + 21, p: [46, 19, 46], l: [24, 1, 6], fov: 42 },
  { t: T.c2 + 30, p: [40, 21, 50], l: [21, 1, 4], fov: 42 },
  // chapter 3: one household after another, lowest income first, up to the hill; then the whole town
  ...visit("rider"),
  ...visit("worker"),
  ...visit("coder"),
  ...visit("landlord"),
  // the restaurant: wide enough to see where its takings go
  { t: VISIT.boss, p: [72, 31, 24], l: [24, 0, -10], fov: 48 },
  { t: VISIT.boss + HOLD.boss, p: [70, 30, 22], l: [23, 0, -10], fov: 48 },
  ...visit("holder"),
  { t: T.c4 - 0.6, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 4: reveal along the hill, the middle rows, the front rows
  { t: T.c4 + 3.0, p: [36, 26, 4], l: [36, 6, -31], fov: 40 },
  { t: T.c4 + 8.2, p: [36, 22, 6], l: [36, 4, -30], fov: 42 },
  { t: T.c4 + 10.4, p: [36, 30, 22], l: [36, 2, -16], fov: 42 },
  { t: T.c4 + 14.6, p: [36, 38, 52], l: [34, 0, 10], fov: 42 },
  { t: T.c4 + 21, p: [30, 50, 74], l: [30, 0, 4], fov: 40 },
  { t: T.c4 + 31, p: WIDE_P, l: WIDE_L, fov: 38 },
  // chapter 5: the hill (the savers), the bank, the front rows (loans out, interest back), the young buyer
  { t: T.c5 + 2, p: [24, 26, 0], l: [26, 4, -31], fov: 40 },
  { t: T.c5 + 9, p: [22, 24, -2], l: [26, 4, -31], fov: 40 },
  { t: T.c5 + 12.5, p: [18, 44, 40], l: [12, 2, -18], fov: 42 },
  { t: T.c5 + 16.5, p: [20, 42, 38], l: [14, 2, -18], fov: 42 },
  { t: T.c5 + 21, p: [30, 34, 50], l: [30, 1, -8], fov: 40 },
  { t: T.c5 + 26.5, ...portraitOf(CAST.coder, 1.2) },
  { t: T.c7 - 0.4, ...portraitOf(CAST.coder, 1.05) },
  // chapter 7: 2009 at the developer's district and the land office; then the wave over the town; then the 2021 buyer
  { t: T.c7 + 2.6, p: [-36, 30, 44], l: [-54, 3, -6], fov: 44 },
  { t: Y09.b, p: [-40, 28, 40], l: [-56, 3, -6], fov: 44 },
  { t: RIVER.a + 1, p: [-6, 44, 76], l: [-18, 4, 0], fov: 44 },
  { t: RIVER.peak, p: [-20, 40, 66], l: [-30, 6, 0], fov: 44 },
  { t: RIVER.hold, p: [-28, 28, 48], l: [-42, 9, 2], fov: 42 },
  { t: BUYER21 - 1.6, p: [-30, 27, 46], l: [-43, 9, 2], fov: 42 },
  { t: BUYER21 + 0.6, p: off(top(CAST.coder), [-9, 10, 30]), l: top(CAST.coder), fov: 34 },
  { t: T.c10 - 0.2, p: off(top(CAST.coder), [-7, 8, 24]), l: top(CAST.coder), fov: 32 },
  // chapter 10: slow drift over the town
  { t: T.c10 + 3, p: [62, 14, 40], l: [26, 1, 8], fov: 46 },
  { t: T.c10 + 11.6, p: [58, 15, 43], l: [24, 1, 8], fov: 46 },
  { t: T.c10 + 13.6, ...portraitOf(CAST.boss, 1.0) },
  { t: T.c10 + 18.2, ...portraitOf(CAST.boss, 0.92) },
  { t: T.c10 + 22, p: [30, 34, 60], l: [24, 0, 4], fov: 40 },
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

export type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; dist: number };

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
  const pos = lp(a.p, b.p).add(drift);
  const look = lp(a.l, b.l);
  return { pos, look, fov: (a.fov ?? 38) + ((b.fov ?? 38) - (a.fov ?? 38)) * u, dist: pos.distanceTo(look) };
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
  bank: new THREE.Vector3(BANK.x, 8.5, BANK.z),
  gov: new THREE.Vector3(GOV.x, 7.5, GOV.z),
  hub: new THREE.Vector3(HUB.x, 7.5, HUB.z),
  dev: new THREE.Vector3(DEV.x - 2, 27, DEV.z),
  land: new THREE.Vector3(DEV.x - 3, 6.5, DEV.z + 2),
};
