// The night market: every stall is a one-person company. The hero street runs along x at z = 0; parallel streets
// repeat every STREET_GAP metres to the horizon. Stalls stand on both sides, facing the street.
// Near streets get full stall geometry; the rest of the market is only lamps (glow sprites) seen through haze.
// All layout is deterministic (seeded), so every render draws the same market.

export const STREET_GAP = 24; // m between parallel streets
export const SIDE = 5; // stall line distance from the street centre
export const PITCH = 3.4; // m between stalls along a street
export const NEAR_K = 3; // streets |k| <= NEAR_K get geometry...
export const NEAR_X = 190; // ...within |x| <= NEAR_X
export const FAR_K = 50; // lamps on streets |k| <= FAR_K
export const FAR_X = 1400;
export const CROSS = 136; // a cross street every CROSS m (no stalls there)

// Hero places on the hero street (k = 0).
export const HERO = {
  laptop: { x: 0, side: -1 }, // the stall of the opening
  cart: { x: -78.2, side: -1 }, // the 煎饼 cart, at the west end
  plazaFrom: 15, // a gap in the south stall line for the company building
  plazaTo: 42,
  company: { x: 28.5, z: -15.5, w: 24, d: 10, h: 15 }, // the office building that folds into one stall
  folded: { x: 28.5, side: -1 }, // the one stall left where the company stood
};

export type Stall = {
  x: number;
  z: number;
  rot: number; // radians; 0 faces +z
  seed: number;
  kind: 0 | 1; // 0 laptop desk, 1 food cart
  hue: number;
  s: number; // success 0..1 (power law): a few very bright, most dim
  k: number; // street index
  near: boolean;
  id: number;
};

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let n = Math.imul(s ^ (s >>> 15), 1 | s);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};

const R = rng(20261030);

export const STALLS: Stall[] = [];
export const NEAR: Stall[] = [];
let heroLaptop = -1;
let heroCart = -1;
let heroFolded = -1;

for (let k = -FAR_K; k <= FAR_K; k++) {
  const zc = k * STREET_GAP;
  const near0 = Math.abs(k) <= NEAR_K;
  for (const side of [-1, 1]) {
    for (let i = -Math.floor(FAR_X / PITCH); i <= Math.floor(FAR_X / PITCH); i++) {
      // stagger the two sides and the streets a little
      const x = i * PITCH + (side > 0 ? PITCH * 0.5 : 0) + ((k * 7.3) % PITCH);
      const crossD = Math.abs(((x + CROSS / 2) % CROSS + CROSS) % CROSS - CROSS / 2);
      if (crossD < 7) continue;
      if (k === 0 && side < 0 && x > HERO.plazaFrom && x < HERO.plazaTo) continue;
      const u = R();
      // success: power law; most stalls barely lit, a handful blazing
      const s = Math.min(1, 0.06 / Math.pow(Math.max(1e-4, R()), 0.62));
      const near = near0 && Math.abs(x) <= NEAR_X;
      const st: Stall = {
        x,
        z: zc + side * SIDE,
        rot: side < 0 ? 0 : Math.PI,
        seed: R(),
        kind: u < 0.12 ? 1 : 0,
        hue: R(),
        s,
        k,
        near,
        id: STALLS.length,
      };
      STALLS.push(st);
      if (near) NEAR.push(st);
    }
  }
}

// pin the hero stalls (nearest to their places)
const pin = (x: number, side: number, kind: 0 | 1) => {
  let best = -1;
  let bd = 1e9;
  for (const st of NEAR) {
    if (st.k !== 0 || Math.sign(st.z) !== side) continue;
    const d = Math.abs(st.x - x);
    if (d < bd) {
      bd = d;
      best = st.id;
    }
  }
  const st = STALLS[best];
  st.x = x;
  st.kind = kind;
  return best;
};
heroLaptop = pin(HERO.laptop.x, HERO.laptop.side, 0);
heroCart = pin(HERO.cart.x, HERO.cart.side, 1);
// the folded company's stall: added in the plaza gap (hidden until the fold)
{
  const st: Stall = { x: HERO.folded.x, z: -SIDE, rot: 0, seed: 0.5, kind: 0, hue: 0.1, s: 0.3, k: 0, near: true, id: STALLS.length };
  STALLS.push(st);
  NEAR.push(st);
  heroFolded = st.id;
}

export const HERO_IDS = { laptop: heroLaptop, cart: heroCart, folded: heroFolded };

// The brightest stalls of the hero street and its neighbours: where the customers go after the turn.
export const STARS: number[] = STALLS.filter((s) => Math.abs(s.k) <= 6 && Math.abs(s.x) < 600)
  .sort((a, b) => b.s - a.s)
  .slice(0, 40)
  .map((s) => s.id);

// Local stall-space offsets (before rotation) of the lamp bulb, per kind.
export const BULB = [
  [0, 1.7, 0.12],
  [0, 1.88, 0.1],
] as const;

export const stallWorld = (st: Stall, lx: number, ly: number, lz: number): [number, number, number] => {
  const c = Math.cos(st.rot);
  const s = Math.sin(st.rot);
  return [st.x + lx * c + lz * s, ly, st.z - lx * s + lz * c];
};
