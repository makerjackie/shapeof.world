// The film's city: a generic Chinese city of housing estates (小区), drawn by code. It is an illustration, not a
// survey: blocks on a 300 m grid, rows of slab towers facing south, a few office towers in the centre, walk-ups
// (6-floor 老小区) around it and a new district of uniform 33-floor towers on the edge. The hero tower stands at the
// origin facing south (+z in three.js), with an open garden in front of it.
// Two other sites sit far away in the same world: Pruitt-Igoe (St. Louis, 33 slabs of 11 floors) and 美孚新邨
// (Hong Kong, 99 towers of 15–21 floors). Both are schematic layouts at the right counts and heights.

export type Bldg = {
  x: number;
  z: number;
  rot: number;
  seed: number;
  w: number;
  d: number;
  h: number;
  kind: number; // 0 high-rise housing, 1 old walk-up, 2 office, 3 mid-rise housing, 5 hero
  occ: number; // share of homes lived in
  group: number; // 0 core, 1 inner, 2 edge (new district), 3 Pruitt-Igoe, 4 美孚新邨, 9 the hero's east neighbour
  dist: number; // from the city centre
};

export const P = 300; // block pitch: a 264 m estate plus a 36 m road
export const ROAD = 36;
export const FH = 3;
export const HERO = { w: 44, d: 14, floors: 33, units: 4, h: 99 };

// The river: a band of water south of the hero, 220 m wide, wandering east-west.
export const RIVER_W = 220;
export const riverZ = (x: number) => 1150 + 380 * Math.sin(x / 1500 + 0.6) + 120 * Math.sin(x / 530);
const nearRiver = (x: number, z: number, pad: number) => Math.abs(z - riverZ(x)) < RIVER_W / 2 + pad;

const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rng = mulberry32(20101);
const r = (a = 0, b = 1) => a + (b - a) * rng();
const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length) % xs.length];

const out: Bldg[] = [];
const add = (b: Omit<Bldg, "seed" | "dist">) => out.push({ ...b, seed: rng(), dist: Math.hypot(b.x, b.z) });

// Rows of slab towers inside one estate (local box [-132, 132]²), facing south.
const estate = (cx: number, cz: number, floorsOf: () => number, occ: () => number, group: number, kind = 0) => {
  const first = floorsOf();
  const gap = Math.min(82, Math.max(46, first * FH * 0.72));
  for (let z = -110; z <= 112; z += gap) {
    let x = -126 + r(0, 10);
    while (x < 120) {
      const w = pick([30, 36, 44, 44, 52]);
      if (x + w > 128) break;
      if (rng() > 0.1) {
        const f = floorsOf();
        add({ x: cx + x + w / 2, z: cz + z, rot: 0, w, d: r(13, 15.5), h: f * FH, kind, occ: occ(), group });
      }
      x += w + r(14, 24);
    }
  }
};

const walkups = (cx: number, cz: number, group: number) => {
  for (let z = -112; z <= 112; z += 27) {
    let x = -126;
    while (x < 120) {
      const w = r(42, 62);
      if (x + w > 128) break;
      if (rng() > 0.08) add({ x: cx + x + w / 2, z: cz + z, rot: 0, w, d: 11, h: pick([5, 6, 6, 6, 7]) * FH, kind: 1, occ: r(0.75, 0.97), group });
      x += w + r(8, 14);
    }
  }
};

const offices = (cx: number, cz: number) => {
  const n = 1 + Math.floor(r(0, 3));
  for (let i = 0; i < n; i++) {
    const s = r(28, 40);
    add({ x: cx + r(-80, 80), z: cz + r(-80, 80), rot: 0, w: s, d: s * r(0.8, 1.2), h: Math.round(r(25, 60)) * 4, kind: 2, occ: r(0.6, 0.9), group: 0 });
  }
  if (rng() > 0.4) add({ x: cx + r(-60, 60), z: cz + 100, rot: 0, w: r(90, 140), d: 40, h: r(12, 24), kind: 2, occ: 0.8, group: 0 });
};

// ---------- The city ----------

const N = 17;
for (let gx = -N; gx <= N; gx++) {
  for (let gz = -N; gz <= N; gz++) {
    const cx = gx * P;
    const cz = gz * P;
    const d = Math.hypot(cx, cz) * (0.92 + 0.16 * Math.sin(gx * 1.7 + gz * 0.9));
    if (gx === 0 && gz === 0) continue;
    if (gz === 1 && Math.abs(gx) <= 1) continue; // a park in front of the hero's estate (the camera works there)
    if (d > 5300) continue;
    if (nearRiver(cx, cz, 140) || nearRiver(cx - 130, cz, 140) || nearRiver(cx + 130, cz, 140)) continue;
    const roll = rng();
    if (roll < 0.07) continue; // parks, schools, open ground
    if (d < 800) {
      if (roll < 0.55) offices(cx, cz);
      else walkups(cx, cz, 0);
    } else if (d < 2100) {
      if (roll < 0.38) walkups(cx, cz, 1);
      else estate(cx, cz, () => pick([18, 24, 26, 30, 33]), () => r(0.75, 0.97), 1, rng() < 0.3 ? 3 : 0);
    } else if (d < 3500) {
      estate(cx, cz, () => pick([26, 28, 30, 32, 33, 33]), () => r(0.68, 0.95), 1);
    } else {
      if (roll < 0.2) continue; // the new district is not built out
      estate(cx, cz, () => pick([30, 32, 33, 33, 33]), () => r(0.3, 0.75), 2);
    }
  }
}

// The hero's estate: the hero at the origin, a neighbour each side, a row behind; the garden in front stays open.
const HOME: Omit<Bldg, "seed" | "dist">[] = [
  { x: -66, z: 0, rot: 0, w: 44, d: 14, h: 33 * FH, kind: 0, occ: 0.9, group: 1 },
  { x: 66, z: 0, rot: 0, w: 44, d: 14, h: 33 * FH, kind: 0, occ: 0.9, group: 9 },
  { x: -66, z: -80, rot: 0, w: 44, d: 14, h: 33 * FH, kind: 0, occ: 0.9, group: 1 },
  { x: 0, z: -80, rot: 0, w: 44, d: 14, h: 33 * FH, kind: 0, occ: 0.9, group: 1 },
  { x: 66, z: -80, rot: 0, w: 44, d: 14, h: 33 * FH, kind: 0, occ: 0.9, group: 1 },
];
HOME.forEach(add);

export const CITY: Bldg[] = out.splice(0, out.length);

// Lift machine rooms and water tanks on the housing roofs (kind 4: plain boxes, no windows).
export const ROOFS: Bldg[] = CITY.filter((b) => b.kind !== 2 && b.h > 40 && b.group !== 9).map((b) => ({
  x: b.x + (b.seed - 0.5) * b.w * 0.3,
  z: b.z - b.d * 0.12,
  rot: 0,
  seed: b.seed,
  w: Math.max(6, b.w * 0.22),
  d: b.d * 0.55,
  h: b.h + 4.5,
  kind: 4,
  occ: 0,
  group: b.group,
  dist: b.dist,
}));

// The old 6-floor block that is pulled down and rebuilt at 11 floors, where the hero's east neighbour stands.
export const OLD = { x: 66, z: 0, w: 52, d: 11 };

// The hero's plan: four flats a floor, two each side of a 3 m lift core in the middle (x in metres, west to east).
export const UNITS: [number, number][] = [
  [-22, -11.75],
  [-11.75, -1.5],
  [1.5, 11.75],
  [11.75, 22],
];
export const ROOM_Z: [number, number] = [-6.6, 6.6];
// Household i (0..131): floor-major, flats west to east. Point = middle of the flat's open front, mid-height.
export const heroHH = (i: number): [number, number, number] => {
  const floor = Math.floor(i / HERO.units);
  const [a, b] = UNITS[i % HERO.units];
  return [(a + b) / 2, floor * FH + 1.5, HERO.d / 2];
};
