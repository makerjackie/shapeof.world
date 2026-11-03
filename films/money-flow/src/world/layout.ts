// Where everything stands. x east, z south (the camera mostly looks north from the south), y up; 1 unit ≈ 1 m at
// the miniature scale of the Kenney kits. The restaurant is the centre of the town; every place the 100 yuan reaches
// is a named node with a spot on the ground where its coins pile up.
import * as THREE from "three";

export type V = [number, number, number];
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------- places
export const HILL_Y = 3.2;
export const PLACE = {
  shop: [0, 0, 0] as V,
  market: [-31, 0, 3] as V,
  farm: [-60, 0, -8] as V,
  landlord: [-17, 0, -23] as V,
  platform: [17, 0, -29] as V,
  power: [37, 0, -9] as V,
  gov: [31, 0, 18] as V,
  bank: [-4, 0, -45] as V,
  hill: [42, HILL_Y, -48] as V,
  dev: [-40, 0, -60] as V,
  tech: [20, 0, -68] as V,
};

// residential: row A (z = 24) is ordinary houses; row B (z = 37) is the ten-household street used for the wealth
// columns, poorest on the left, richest on the right
export const ROW_A_Z = 24;
export const ROW_B_Z = 37;
export const ROW_B_X = Array.from({ length: 10 }, (_, i) => -34.2 + i * 7.6);
export const ROW_A_X = Array.from({ length: 11 }, (_, i) => -45 + i * 9);
export const WAITER_HOME: V = [-27, 0, ROW_A_Z];
export const COUPLE_HOME: V = [9, 0, ROW_A_Z];

// roads: [x0, z0, x1, z1, width]
export const ROADS: [number, number, number, number, number][] = [
  [-80, 10, 70, 10, 3.4],
  [-80, 30.5, 70, 30.5, 3],
  [-80, -12, 70, -12, 3],
  [6, -80, 6, 46, 3.4],
  [-44, -80, -44, 46, 3],
  [-80, -36, 70, -36, 2.6],
];

// ---------------------------------------------------------------- coin nodes: where coins land and pile up
// pile = ground spot (the stack grows up from here); the flight targets the top of the pile
export const NODE = {
  table: [-0.6, 0.78, 5.6] as V, // the diner's table: the 100-yuan note lies here
  till: [2.2, 0, 4.4] as V, // the boss's takings (the split starts here)
  staff: [-3.6, 0, 3.6] as V, // cook and waiter
  boss: [3.6, 0, 5.2] as V, // what is left for the boss
  market: [-28.5, 0, 7.5] as V,
  farmer: [-55, 0, -2] as V,
  driver: [-40, 0, 12.5] as V,
  vendor: [-33, 0, 8.5] as V,
  landlord: [-13.5, 0, -16.5] as V,
  platform: [20, 0, -22.5] as V,
  rider: [13.5, 0, -21.5] as V,
  owners: [26, 0, -24] as V, // the platform's shareholders' pile
  power: [33, 0, -3.5] as V,
  gov: [27.5, 0, 23] as V,
  bank: [-1, 0, -39.5] as V,
  hill: [36, HILL_Y, -41.5] as V,
  waiter: [-24, 0, ROW_A_Z + 4.6] as V,
  home: [-36, 0, 46] as V, // "寄回老家": off along the south road
  couple: [12, 0, ROW_A_Z + 4.6] as V,
  dev: [-34, 0, -52] as V,
  devLand: [26, 0, 27] as V, // land money to the local government (next to gov)
  you: [-1.6, 0, 7.4] as V, // the diner, for the ending
};
export type NodeId = keyof typeof NODE;
// extra nodes made on the fly: the ten households of row B, "d0".."d9"
export const deciles = Array.from({ length: 10 }, (_, i) => [ROW_B_X[i] + 2.2, 0, ROW_B_Z + 4.2] as V);

// the four towers of the next waves (phones, the internet, batteries, chips)
export const TECH_TOWERS: { x: number; z: number; h: number; model: string; name: string }[] = [
  { x: 6, z: -70, h: 1.5, model: "building-skyscraper-b", name: "手机" },
  { x: 16, z: -66, h: 1.9, model: "building-skyscraper-c", name: "互联网" },
  { x: 26, z: -71, h: 1.4, model: "building-skyscraper-e", name: "电池" },
  { x: 36, z: -66, h: 1.7, model: "building-skyscraper-a", name: "芯片" },
];
export const nodePos = (id: string): V => {
  if (id in NODE) return NODE[id as NodeId];
  if (id === "town") return [2, 7, 12];
  if (id === "town2") return [8, 7, 18];
  const k = Number(id.slice(1));
  if (id[0] === "d" || id[0] === "e") return deciles[k];
  if (id[0] === "a") return [ROW_A_X[k] + 2.4, 0, ROW_A_Z + 4.4];
  if (id[0] === "t") return [TECH_TOWERS[k].x, 9, TECH_TOWERS[k].z + 3];
  if (id === "town") return [2, 7, 12];
  if (id === "town2") return [8, 7, 18];
  throw new Error("node " + id);
};
export const v3 = (v: V, dy = 0) => new THREE.Vector3(v[0], v[1] + dy, v[2]);

// ---------------------------------------------------------------- people
export type Who = { id: string; model: string; at: V; face: number; s?: number };
export const PEOPLE: Who[] = [
  { id: "you", model: "character-male-a", at: [-1.4, 0, 7.0], face: Math.PI, s: 1.15 },
  { id: "boss", model: "character-male-b", at: [2.3, 0, 3.3], face: 0.2, s: 1.15 },
  { id: "cook", model: "character-male-d", at: [-4.6, 0, 2.9], face: 0.4, s: 1.15 },
  { id: "waiter", model: "character-female-a", at: [-2.9, 0, 4.0], face: 0.3, s: 1.15 },
  { id: "waiterHome", model: "character-female-a", at: [-25.8, 0, ROW_A_Z + 3.2], face: 0.1, s: 1.25 },
  { id: "vendor", model: "character-female-d", at: [-30.5, 0, 7.4], face: 0.2, s: 1.15 },
  { id: "farmer", model: "character-male-e", at: [-57, 0, -1.2], face: 0.3, s: 1.2 },
  { id: "landlord", model: "character-female-c", at: [-15.6, 0, -16.6], face: 0.2, s: 1.25 },
  { id: "rider", model: "character-male-f", at: [15.2, 0, -21.2], face: 0.3, s: 1.2 },
  { id: "rich", model: "character-male-c", at: [38.5, HILL_Y, -41.2], face: 0.3, s: 1.3 },
  { id: "coupleA", model: "character-female-b", at: [10.6, 0, ROW_A_Z + 3.4], face: 0.2, s: 1.2 },
  { id: "coupleB", model: "character-male-a", at: [11.8, 0, ROW_A_Z + 3.2], face: -0.2, s: 1.2 },
];
export const personPos = (id: string) => PEOPLE.find((p) => p.id === id)!.at;
