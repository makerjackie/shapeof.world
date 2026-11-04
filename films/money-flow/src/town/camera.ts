// Camera as a pure function of film time, shared by the WebGL engine and the screen-space overlays (labels).
// v7 cuts on the bar lines of the score: each shot is a short move, and the next shot starts with a hard cut.
import * as THREE from "three";
import { B, T, clamp } from "../timing";
import { BANK, CAST, DEV, GOV, HOUSES, HUB, Role, YOU_RANK, byRank, tankTop } from "./layout";

type V = [number, number, number];
type Key = { t: number; p: V; l: V; fov?: number; e?: "out" | "io" | "lin" };
type View = { p: V; l: V; fov?: number };

const top = (rank: number): V => {
  const h = HOUSES.find((x) => x.rank === rank)!;
  const v = tankTop(h);
  return [v.x, v.y - 1, v.z];
};
const off = (a: V, d: V): V => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
const at = (v: THREE.Vector3, dy = 0): V => [v.x, v.y + dy, v.z];

// a portrait of one household: house, tank and the person in the yard, from the south-east
const portraitR = (rank: number, push = 1): View => {
  const h = byRank(rank);
  const k = { small: 1, house: 1.25, villa: 1.45, mansion: 2.2 }[h.kind] * push;
  const l: V = [h.x - h.w * 0.05, h.y + h.h + 0.6, h.z + h.d * 0.3];
  return { p: [l[0] + 6.5 * k, l[1] + 6.5 * k, l[2] + 11.5 * k], l, fov: 36 };
};
const portrait = (role: Role, push = 1) => portraitR(CAST[role], push);
const YOU = YOU_RANK;

// one shot from bar a to bar b (hard cut at both ends), moving from view x to view y
const CUT = 1 / 60;
const shot = (a: number, b: number, x: View, y: View, e: Key["e"] = "out"): Key[] => [
  { t: a, ...x, e },
  { t: b - CUT, ...y },
];

const WIDE: View = { p: [8, 58, 92], l: [8, 0, -6], fov: 38 };

export const KEYS: Key[] = [
  // intro: one slow descent through the blue hour to the worker's roof, under the payslip
  ...shot(0, B(8), { p: [34, 46, 86], l: [14, 0, 2], fov: 36 }, { p: off(top(YOU), [6, 7, 13]), l: top(YOU), fov: 34 }, "io"),
  // DROP: the 2,570, one destination per bar
  ...shot(B(8), B(9), { p: [-2, 8, 20], l: [-16, 6, -14], fov: 50 }, { p: [-6, 9, 14], l: [-17, 7, -18], fov: 46 }), // 公积金 → bank
  ...shot(B(9), B(10), { p: [0, 7, 6], l: [-17, 7, -8], fov: 48 }, { p: [-4, 8, 2], l: [-17, 8, -8], fov: 44 }), // 养老·个人 → gov
  ...shot(B(10), B(11), { p: [-30, 20, 4], l: [24, 2, 8], fov: 50 }, { p: [-26, 24, 12], l: [30, 1, 10], fov: 48 }), // 养老·单位 → today's retirees
  ...shot(B(11), B(12), { p: [6, 22, 32], l: [-14, 4, -4], fov: 44 }, { p: [2, 20, 28], l: [-15, 4, -5], fov: 42 }), // 医保
  ...shot(B(12), B(13), { p: [14, 52, 74], l: [-4, 0, -6], fov: 40 }, { p: [10, 48, 68], l: [-6, 0, -6], fov: 40 }), // all of it
  ...shot(B(13), B(15), { ...portraitR(YOU, 1.25) }, { ...portraitR(YOU, 0.95) }), // 到手 4,075
  ...shot(B(15), B(16), { p: off(top(YOU), [3, 3.5, 7]), l: top(YOU), fov: 34 }, { p: off(top(YOU), [2.5, 3, 6]), l: top(YOU), fov: 34 }, "lin"), // 你以为你没交税？
  // spending: tax in every price
  ...shot(B(16), B(17), { p: [44, 9, 34], l: [10, 2, 6], fov: 46 }, { p: [40, 10, 30], l: [8, 2, 4], fov: 46 }),
  ...shot(B(17), B(18), { p: [0, 7, 18], l: [-15, 3, 3], fov: 46 }, { p: [-3, 7, 16], l: [-15, 3, 3], fov: 44 }),
  ...shot(B(18), B(20), { p: [-6, 3.5, 4], l: [-17, 9, -8], fov: 52 }, { p: [-8, 3, 2], l: [-17, 10, -8], fov: 48 }),
  // lift: the whole town circulating; profits and dividends up the hill; who holds the shares
  ...shot(B(20), B(24), { p: [26, 64, 96], l: [8, 0, -4], fov: 40 }, { p: [4, 46, 72], l: [6, 0, -6], fov: 40 }, "io"),
  ...shot(B(24), B(26), { p: [22, 14, -12], l: [10, 6, -31], fov: 48 }, { p: [16, 15, -13], l: [8, 6, -31], fov: 48 }),
  ...shot(B(26), B(27), { p: [-2, 12, 10], l: [-17, 6, -8], fov: 46 }, { p: [-4, 12, 8], l: [-17, 6, -8], fov: 44 }),
  ...shot(B(27), B(30), { p: [2, 13, -16], l: [16, 5, -31], fov: 44 }, { p: [70, 13, -16], l: [56, 5, -31], fov: 44 }, "io"),
  ...shot(B(30), B(32), { p: off(top(YOU), [5, 5, 10]), l: top(YOU), fov: 34 }, { p: off(top(YOU), [3, 3.5, 7]), l: top(YOU), fov: 34 }),
  ...shot(B(32), B(33), { ...WIDE }, { p: [8, 62, 98], l: [8, 0, -6], fov: 38 }, "lin"),
  // where it stops: along the hill, the middle rows, the front rows; then savings → bank → the young buyer
  ...shot(B(33), B(34.5), { p: [36, 26, 4], l: [36, 6, -31], fov: 40 }, { p: [36, 23, 6], l: [36, 4, -30], fov: 42 }),
  ...shot(B(34.5), B(36), { p: [36, 34, 40], l: [34, 0, 4], fov: 44 }, { p: [30, 46, 66], l: [30, 0, 4], fov: 40 }),
  ...shot(B(36), B(38), { p: [20, 44, 40], l: [0, 2, -22], fov: 42 }, { p: [14, 40, 36], l: [-2, 2, -20], fov: 42 }),
  ...shot(B(38), B(40), { p: [26, 30, 34], l: [18, 2, -16], fov: 44 }, { p: [30, 28, 30], l: [26, 2, -14], fov: 42 }),
  ...shot(B(40), B(42), { ...portrait("coder", 1.3) }, { ...portrait("coder", 1.1) }),
  ...shot(B(42), B(45), { p: off(top(CAST.coder), [-9, 10, 30]), l: top(CAST.coder), fov: 36 }, { p: off(top(CAST.coder), [-7, 8, 22]), l: top(CAST.coder), fov: 34 }, "io"),
  ...shot(B(45), B(47), { p: [24, 36, 52], l: [14, 0, -12], fov: 42 }, { p: [18, 40, 58], l: [10, 0, -12], fov: 40 }),
  // hard stop, then the breather
  ...shot(B(47), B(48), { p: [8, 70, 110], l: [8, 0, -6], fov: 36 }, { p: [8, 72, 112], l: [8, 0, -6], fov: 36 }, "lin"),
  ...shot(B(48), B(50), { p: [40, 30, 34], l: [24, 2, -12], fov: 44 }, { p: [34, 32, 40], l: [22, 2, -14], fov: 44 }),
  ...shot(B(50), B(53), { p: [70, 26, 30], l: [30, 3, -24], fov: 44 }, { p: [62, 24, 22], l: [26, 3, -26], fov: 44 }, "io"),
  ...shot(B(53), B(55), { p: [-30, 30, 46], l: [-44, 3, -6], fov: 46 }, { p: [-36, 28, 40], l: [-50, 3, -6], fov: 44 }),
  ...shot(B(55), B(57), { p: [16, 60, 92], l: [6, 0, -6], fov: 40 }, { p: [10, 86, 118], l: [6, 0, -10], fov: 38 }, "io"),
  // PEAK: night, everything flowing; big moves every two bars
  ...shot(B(57), B(59), { p: [62, 20, 58], l: [12, 2, -4], fov: 50 }, { p: [46, 26, 64], l: [8, 2, -6], fov: 46 }),
  ...shot(B(59), B(61), { p: [44, 22, 6], l: [28, 5, -31], fov: 46 }, { p: [20, 24, 4], l: [20, 5, -31], fov: 46 }),
  ...shot(B(61), B(63), { p: [-4, 16, 24], l: [-17, 6, -8], fov: 48 }, { p: [10, 26, 34], l: [10, 2, 0], fov: 46 }),
  ...shot(B(63), B(65), { p: [-26, 34, 42], l: [-30, 4, -10], fov: 46 }, { p: [-14, 40, 54], l: [-20, 4, -10], fov: 44 }),
  ...shot(B(65), B(69), { p: [8, 64, 96], l: [8, 0, -8], fov: 38 }, { p: [30, 52, 80], l: [26, 0, -10], fov: 38 }, "io"),
  ...shot(B(69), B(73), { p: [24, 30, 54], l: [16, 0, 4], fov: 42 }, { p: off(top(YOU), [8, 9, 17]), l: top(YOU), fov: 36 }, "io"),
  // ending: the worker's roof, then all the way out
  ...shot(B(73), B(78), { p: off(top(YOU), [5, 6, 11]), l: top(YOU), fov: 34 }, { p: [10, 110, 140], l: [4, 0, -8], fov: 34 }, "io"),
  { t: T.end, p: [10, 112, 142], l: [4, 0, -8], fov: 34 },
];

const easeIO = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

export type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; dist: number };

export function poseAt(t: number): Pose {
  const k = KEYS;
  let i = 0;
  while (i < k.length - 1 && t > k[i + 1].t) i++;
  const a = k[i];
  const b = k[Math.min(i + 1, k.length - 1)];
  const x = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
  const u = a.e === "lin" ? clamp(x) : a.e === "io" ? easeIO(x) : easeOut(x);
  const lp = (p: V, q: V) => new THREE.Vector3(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u);
  // a slow breathing drift so held shots are never frozen
  const drift = new THREE.Vector3(Math.sin(t * 0.21) * 0.4, Math.sin(t * 0.17) * 0.25, Math.cos(t * 0.19) * 0.4);
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
  dev: new THREE.Vector3(DEV.x - 2, 12, DEV.z),
  land: new THREE.Vector3(DEV.x - 3, 6.5, DEV.z + 2),
  you: (() => {
    const v = tankTop(byRank(YOU_RANK));
    return new THREE.Vector3(v.x, v.y + 1.2, v.z);
  })(),
};
export { at };
