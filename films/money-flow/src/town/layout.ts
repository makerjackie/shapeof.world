// The town: 100 households (all Chinese households scaled down to 100), sorted by income from the hill at the back
// (richest five) to the dense rows at the front. On the left, the machinery money passes through: the central bank's
// tower, the bank, the government, the market (factories and shops), the developer's towers and the old shanty area.
// Coordinates: x east, z toward the camera (south), y up. Pipes run along the streets at ground level.
// Houses are Kenney City Kit Suburban models (CC0); see tools/assets.sh.
import * as THREE from "three";

export type Group = 0 | 1 | 2 | 3 | 4; // 0: top 5 · 1: 6–10 · 2: 11–25 · 3: 26–60 · 4: 61–100
export type House = {
  rank: number; // 0 = highest income
  g: Group;
  kind: "mansion" | "villa" | "house" | "small";
  x: number;
  y: number; // ground height (the hill)
  z: number;
  w: number;
  d: number;
  h: number;
  tankR: number;
  tankH: number;
  street: number; // z of the street in front
  red: boolean; // one of the ~40 households that spent more than they earned this year
  seed: number;
  model: string; // building type: public/models/sub/building-type-<model>.glb
  scale: number;
};

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export { rnd };

// Kenney suburban building sizes (w, h, d) at scale 1
export const SUB: Record<string, [number, number, number]> = {
  a: [1.3, 0.83, 1.03], b: [1.83, 1.14, 1.14], c: [1.29, 1.03, 1.03], d: [1.76, 1.24, 1.03], e: [1.3, 1.14, 1.03], f: [1.43, 1.14, 1.41],
  g: [1.45, 0.77, 1.18], h: [1.3, 0.74, 0.92], i: [1.29, 0.74, 1.03], j: [1.37, 1.04, 0.92], k: [0.92, 1.15, 1.02], l: [1.03, 1.05, 1.02],
  m: [1.43, 0.74, 1.43], n: [1.78, 1.14, 1.38], o: [1.27, 1.14, 1.03], p: [1.24, 0.92, 0.99], q: [1.24, 0.92, 0.89], r: [1.03, 1.14, 1.02],
  s: [1.41, 1.14, 1.09], t: [1.31, 1.16, 1.41], u: [1.43, 1.14, 1.09],
};
const MODELS = {
  mansion: { types: ["n", "d", "b", "f", "n"], scale: 4.4 },
  villa: { types: ["n", "b", "d", "f", "t"], scale: 3.0 },
  house: { types: ["b", "s", "u", "f", "d", "t", "n", "u"], scale: 2.6 },
  small: { types: ["a", "c", "e", "j", "o", "p", "q", "h", "i", "g", "k", "r", "l"], scale: 2.25 },
};

export const SPINE_X = -4;
export const HUB = new THREE.Vector3(-15, 0, 4);
export const TOWER = new THREE.Vector3(-30, 0, -15); // central bank
export const BANK = new THREE.Vector3(-17, 0, -21);
export const GOV = new THREE.Vector3(-17, 0, -8);
export const SHANTY = new THREE.Vector3(-45, 0, 9); // old low sheds west of the market
export const DEV = new THREE.Vector3(-44, 0, 6); // the developer's new towers go up where the old sheds stood
export const DEV_TOWERS = [
  [-50, 2, 4.2, 4.2],
  [-42.5, 1.5, 4.2, 4.2],
  [-50, 10, 4.2, 4.2],
  [-42.5, 10.5, 4.2, 4.2],
  [-35, 6, 3.6, 3.6],
] as const;
export const SHACKS: { x: number; z: number; w: number; d: number; h: number; r: number }[] = [];
for (let i = 0; i < 14; i++) {
  const a = rnd(i + 900);
  SHACKS.push({
    x: SHANTY.x - 7 + (i % 5) * 3.3 + (a - 0.5) * 0.8,
    z: SHANTY.z - 4 + Math.floor(i / 5) * 3.4 + (rnd(i + 950) - 0.5) * 0.8,
    w: 2.0 + a * 0.6,
    d: 1.8 + rnd(i + 970) * 0.5,
    h: 1.1 + rnd(i + 990) * 0.5,
    r: (a - 0.5) * 0.3,
  });
}

const houses: House[] = [];
const push = (rank: number, kind: House["kind"], x: number, z: number, y: number) => {
  const g: Group = rank < 5 ? 0 : rank < 10 ? 1 : rank < 25 ? 2 : rank < 60 ? 3 : 4;
  const tank = {
    mansion: { tankR: 1.85, tankH: 3.8 },
    villa: { tankR: 1.0, tankH: 2.2 },
    house: { tankR: 0.8, tankH: 1.75 },
    small: { tankR: 0.66, tankH: 1.45 },
  }[kind];
  const mm = MODELS[kind];
  const model = mm.types[Math.floor(rnd(rank * 7.7 + 3) * mm.types.length)];
  const [mw, mh, md] = SUB[model];
  const street = kind === "mansion" ? z + 5.0 : kind === "small" ? z + 3.05 : z + 3.9;
  houses.push({ rank, g, kind, x, y, z, w: mw * mm.scale, h: mh * mm.scale, d: md * mm.scale, ...tank, street, red: false, seed: rnd(rank + 17), model, scale: mm.scale });
};
// hill: the richest five
[8, 22, 36, 50, 64].forEach((x, i) => push(i, "mansion", x, -31, 3.2));
// two rows of ten
for (let j = 0; j < 10; j++) push(5 + j, j < 5 ? "villa" : "house", 4 + j * 7, -20, 1.3);
for (let j = 0; j < 10; j++) push(15 + j, "house", 4 + j * 7, -11.5, 0.5);
// five rows of fifteen
for (let r = 0; r < 5; r++) for (let j = 0; j < 15; j++) push(25 + r * 15 + j, "small", 2 + j * 4.6, -3.5 + r * 7.2, 0);

// six households the film follows (ranks by income, 0 = highest). Illustrative: the survey data are by income group,
// not by job; each sits in the income group its job usually falls in.
export const CAST = { holder: 0, boss: 3, landlord: 7, coder: 21, rider: 47, worker: 57 } as const;
export type Role = keyof typeof CAST;
export const ROLES = Object.keys(CAST) as Role[];
export const ROLE_NAME: Record<Role, string> = { holder: "大股东", boss: "小老板", landlord: "房东", coder: "程序员", worker: "工厂工人", rider: "外卖骑手" };

// the ~40 households (of 100) that spent more than they earned (CHFS 2015: 40% in 2014). The survey doesn't say who
// they are; most are among the lower incomes, a few higher up. None of the six the film follows.
{
  const cast = Object.values(CAST) as number[];
  const cand = houses
    .filter((h) => h.rank >= 15 && !cast.includes(h.rank))
    .map((h) => ({ h, k: rnd(h.rank * 3.3) + (h.rank - 15) / 85 }));
  cand.sort((a, b) => b.k - a.k);
  cand.slice(0, 40).forEach((c) => (c.h.red = true));
}
export const HOUSES = houses;
export const byRank = (r: number) => houses.find((h) => h.rank === r)!;
// the household the film follows ("你"): the factory worker on 5,000 a month
export const YOU_RANK = CAST.worker;

// street rows (z) and their extent
export const STREETS = Array.from(new Set(houses.map((h) => +h.street.toFixed(2)))).sort((a, b) => a - b);
export const ROW_END_X = 70;

// the tank stands on a short frame on the roof
export const tankBase = (h: House) => new THREE.Vector3(h.x + h.w * 0.08, h.y + h.h + 0.25, h.z - h.d * 0.05);
export const tankTop = (h: House) => tankBase(h).add(new THREE.Vector3(0, h.tankH, 0));
// where the household's person stands: the front yard, by the street
export const yardOf = (h: House) => new THREE.Vector3(h.x - h.w * 0.32, h.y, h.z + h.d / 2 + 1.0);

const P = 0.28; // pipe height above the ground
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
// terraces: the hill (richest five), the two middle rows, then flat ground for the front rows
export const TERRACES = [
  { y: 3.2, z0: -44, z1: -25.5 },
  { y: 1.3, z0: -25.5, z1: -15.2 },
  { y: 0.5, z0: -15.2, z1: -7 },
];
export const TERRACE_X = [-6.5, 74];
export const groundY = (x: number, z: number) => {
  if (x < TERRACE_X[0] || x > TERRACE_X[1]) return 0;
  for (const t of TERRACES) if (z >= t.z0 && z < t.z1) return t.y;
  return 0;
};
// along the spine from z0 to z1, stepping down (or up) at each terrace edge
const spineRun = (z0: number, z1: number) => {
  const out: THREE.Vector3[] = [v(SPINE_X, groundY(SPINE_X, z0) + P, z0)];
  const edges = TERRACES.flatMap((t) => [t.z0, t.z1]).filter((e, i, a) => a.indexOf(e) === i);
  const dir = Math.sign(z1 - z0);
  edges.filter((e) => (e - z0) * dir > 0 && (z1 - e) * dir > 0).sort((a, b) => (a - b) * dir)
    .forEach((e) => {
      out.push(v(SPINE_X, groundY(SPINE_X, e - dir * 0.01) + P, e));
      out.push(v(SPINE_X, groundY(SPINE_X, e + dir * 0.01) + P, e));
    });
  out.push(v(SPINE_X, groundY(SPINE_X, z1) + P, z1));
  return out;
};

// pipe from a house's tank down to its street, along the street to the spine, down the spine to the hub
export function housePath(h: House): THREE.Vector3[] {
  const tb = tankBase(h);
  const fx = h.x + h.w * 0.5 + 0.3; // down the east wall
  const sz = h.street - 0.9;
  return [
    v(tb.x, tb.y + 0.05, tb.z),
    v(fx, tb.y + 0.05, tb.z),
    v(fx, h.y + P, tb.z),
    v(fx, h.y + P, sz),
    v(SPINE_X, h.y + P, sz),
    ...spineRun(sz, HUB.z).slice(1),
    v(HUB.x + 4, P, HUB.z),
  ];
}

// a few named machinery pipes (from → to), routed with right angles
const elbow = (a: THREE.Vector3, b: THREE.Vector3, viaX = true) =>
  viaX ? [v(a.x, P, a.z), v(b.x, P, a.z), v(b.x, P, b.z)] : [v(a.x, P, a.z), v(a.x, P, b.z), v(b.x, P, b.z)];

export const PIPES: Record<string, THREE.Vector3[]> = {
  towerBank: [v(TOWER.x + 3, 6, TOWER.z), v(TOWER.x + 3, P, TOWER.z), ...elbow(v(TOWER.x + 3, 0, TOWER.z), v(BANK.x - 4, 0, BANK.z), false)],
  // the first loan: bank → the factory
  bankHub: elbow(v(BANK.x - 2, 0, BANK.z + 3), v(HUB.x - 5, 0, HUB.z - 1), false),
  govHub: elbow(v(GOV.x, 0, GOV.z + 3), v(HUB.x + 1, 0, HUB.z - 3), false),
  hubGov: elbow(v(HUB.x - 1, 0, HUB.z - 3), v(GOV.x - 2, 0, GOV.z + 3), false),
  hubSpine: [v(HUB.x + 4, P, HUB.z), v(SPINE_X, P, HUB.z)],
  // savings into the bank (from the hill down the spine) and loans out
  spineBank: [...spineRun(-31, BANK.z + 1), v(BANK.x + 4, P, BANK.z + 1)],
};

// the next waves: four new towers rising behind the hill (phones, the internet, batteries, chips)
export const TECH_TOWERS: { x: number; z: number; h: number; model: string; name: string }[] = [
  { x: 14, z: -52, h: 1.5, model: "building-skyscraper-b", name: "手机" },
  { x: 30, z: -55, h: 1.9, model: "building-skyscraper-c", name: "互联网" },
  { x: 46, z: -52, h: 1.4, model: "building-skyscraper-e", name: "电池" },
  { x: 62, z: -55, h: 1.7, model: "building-skyscraper-a", name: "芯片" },
];
export const TECH_SCALE = 3.4; // model height ≈ 5.47 at scale 1
export const techTop = (i: number) => v(TECH_TOWERS[i].x, 5.47 * TECH_SCALE * TECH_TOWERS[i].h * 0.8 + 1, TECH_TOWERS[i].z);

// end points of the flows through the air: a household's tank (rank), or a named place
export type Pt = number | "hub" | "bank" | "gov" | "dev" | "t0" | "t1" | "t2" | "t3";
export const ptOf = (p: Pt) => {
  if (p === "hub") return v(HUB.x, 9, HUB.z);
  if (p === "bank") return v(BANK.x, 9.5, BANK.z);
  if (p === "gov") return v(GOV.x, 9.5, GOV.z);
  if (p === "dev") return v(DEV.x + 1, 13, DEV.z);
  if (typeof p === "string") return techTop(Number(p[1]));
  return tankTop(byRank(p)).add(v(0, 0.3, 0));
};

// the spine and street trunks (drawn as wider, always-on pipes)
export const TRUNKS: THREE.Vector3[][] = [
  spineRun(STREETS[0] - 6.5, STREETS[STREETS.length - 1]),
  ...STREETS.map((z) => [v(SPINE_X, groundY(0, z - 0.9) + P, z - 0.9), v(ROW_END_X, groundY(0, z - 0.9) + P, z - 0.9)]),
];
