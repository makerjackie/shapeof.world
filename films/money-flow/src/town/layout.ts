// The town: 100 households (all Chinese households scaled down to 100), sorted by income from the hill at the back
// (richest five) to the dense rows at the front. On the left, the machinery money passes through: the central bank's
// tower, the bank, the government, the market (factories and shops), the developer's towers and the old shanty area.
// Coordinates: x east, z toward the camera (south), y up. Pipes run along the streets at ground level.
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
};

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const SPINE_X = -4;
export const HUB = new THREE.Vector3(-15, 0, 4);
export const TOWER = new THREE.Vector3(-30, 0, -15); // central bank
export const BANK = new THREE.Vector3(-17, 0, -21);
export const GOV = new THREE.Vector3(-17, 0, -8);
export const DEV = new THREE.Vector3(-40, 0, -27); // developer: new apartment towers
export const SHANTY = new THREE.Vector3(-45, 0, 9); // old houses to be torn down
export const DEV_TOWERS = [
  [-44, -30, 4.2, 4.2],
  [-37, -31, 4.2, 4.2],
  [-44, -23, 4.2, 4.2],
  [-36.5, -23.5, 4.2, 4.2],
  [-50, -26, 3.6, 3.6],
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
  const dims = {
    mansion: { w: 8.5, d: 6.5, h: 4.6, tankR: 1.75, tankH: 3.6 },
    villa: { w: 5.2, d: 4.4, h: 3.3, tankR: 0.95, tankH: 2.1 },
    house: { w: 4.4, d: 3.8, h: 2.8, tankR: 0.78, tankH: 1.7 },
    small: { w: 3.0, d: 2.7, h: 2.1, tankR: 0.62, tankH: 1.35 },
  }[kind];
  houses.push({ rank, g, kind, x, y, z, ...dims, street: z + dims.d / 2 + 1.7, red: false, seed: rnd(rank + 17) });
};
// hill: the richest five
[8, 22, 36, 50, 64].forEach((x, i) => push(i, "mansion", x, -31, 3.2));
// two rows of ten
for (let j = 0; j < 10; j++) push(5 + j, j < 5 ? "villa" : "house", 4 + j * 7, -20, 1.3);
for (let j = 0; j < 10; j++) push(15 + j, "house", 4 + j * 7, -11.5, 0.5);
// five rows of fifteen
for (let r = 0; r < 5; r++) for (let j = 0; j < 15; j++) push(25 + r * 15 + j, "small", 2 + j * 4.6, -3.5 + r * 7.2, 0);

// the ~40 households (of 100) that spent more than they earned (CHFS 2015: 40% in 2014). The survey doesn't say who
// they are; most are among the lower incomes, a few higher up.
{
  const cand = houses.filter((h) => h.rank >= 15).map((h) => ({ h, k: rnd(h.rank * 3.3) + (h.rank - 15) / 85 }));
  cand.sort((a, b) => b.k - a.k);
  cand.slice(0, 40).forEach((c) => (c.h.red = true));
}
export const HOUSES = houses;
// the ordinary household the ending comes down to ("你"): a small house in the middle of the third row, not red
export const YOU_RANK = (houses.filter((h) => h.kind === "small" && h.rank >= 55 && h.rank < 70 && !h.red).sort((a, b) => Math.abs(a.x - 34) - Math.abs(b.x - 34))[0] ?? houses[60]).rank;

// street rows (z) and their extent
export const STREETS = Array.from(new Set(houses.map((h) => +h.street.toFixed(2)))).sort((a, b) => a - b);
export const ROW_END_X = 70;

export const tankTop = (h: House) => new THREE.Vector3(h.x + h.w * 0.18, h.y + h.h + 0.35 + h.tankH, h.z - h.d * 0.12);
export const tankBase = (h: House) => new THREE.Vector3(h.x + h.w * 0.18, h.y + h.h + 0.35, h.z - h.d * 0.12);

const P = 0.28; // pipe height above the ground
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// pipe from a house's tank down to its street, along the street to the spine, down the spine to the hub
export function housePath(h: House): THREE.Vector3[] {
  const tb = tankBase(h);
  const fx = h.x + h.w * 0.5 + 0.35; // down the east wall
  return [
    v(tb.x, tb.y + 0.05, tb.z),
    v(fx, tb.y + 0.05, tb.z),
    v(fx, h.y + P, tb.z),
    v(fx, h.y + P, h.street - 0.4),
    v(fx, P, h.street),
    v(SPINE_X, P, h.street),
    v(SPINE_X, P, HUB.z),
    v(HUB.x + 4, P, HUB.z),
  ];
}

// a few named machinery pipes (from → to), routed with right angles
const elbow = (a: THREE.Vector3, b: THREE.Vector3, viaX = true) =>
  viaX ? [v(a.x, P, a.z), v(b.x, P, a.z), v(b.x, P, b.z)] : [v(a.x, P, a.z), v(a.x, P, b.z), v(b.x, P, b.z)];

export const PIPES: Record<string, THREE.Vector3[]> = {
  towerBank: [v(TOWER.x + 3, 6, TOWER.z), v(TOWER.x + 3, P, TOWER.z), ...elbow(v(TOWER.x + 3, 0, TOWER.z), v(BANK.x - 4, 0, BANK.z), false)],
  bankShanty: elbow(v(BANK.x - 4, 0, BANK.z + 2), v(SHANTY.x + 7, 0, SHANTY.z - 6), false).concat([v(SHANTY.x + 1, P, SHANTY.z - 6)]),
  shantyDev: elbow(v(SHANTY.x - 2, 0, SHANTY.z - 6), v(DEV.x - 4, 0, DEV.z + 7), false),
  devGov: elbow(v(DEV.x + 4, 0, DEV.z + 7), v(GOV.x - 4, 0, GOV.z), false),
  devHub: elbow(v(DEV.x + 2, 0, DEV.z + 8), v(HUB.x - 4, 0, HUB.z + 1), false),
  govHub: elbow(v(GOV.x, 0, GOV.z + 3), v(HUB.x + 1, 0, HUB.z - 3), false),
  hubGov: elbow(v(HUB.x - 1, 0, HUB.z - 3), v(GOV.x - 2, 0, GOV.z + 3), false),
  hubSpine: [v(HUB.x + 4, P, HUB.z), v(SPINE_X, P, HUB.z)],
  // savings into the bank (from the hill down the spine) and loans out
  spineBank: [v(SPINE_X, P, -31), v(SPINE_X, P, BANK.z + 1), v(BANK.x + 4, P, BANK.z + 1)],
  // overflow from the hill to the asset district (developer towers)
  hillDev: [v(SPINE_X, P, -36), v(DEV.x + 6, P, -36), v(DEV.x + 6, P, DEV.z - 2)],
};

// the spine and street trunks (drawn as wider, always-on pipes)
export const TRUNKS: THREE.Vector3[][] = [
  [v(SPINE_X, P, STREETS[0] - 6.5), v(SPINE_X, P, STREETS[STREETS.length - 1])],
  ...STREETS.map((z) => [v(SPINE_X, P, z), v(ROW_END_X, P, z)]),
];
