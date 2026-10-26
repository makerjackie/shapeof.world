// Brick and pile geometry shared by the engine and the director. One brick = one month of spending: a bundle of
// banknotes with a paper strap. Units are arbitrary (1 unit ≈ 10 cm); gaps between bricks are at least 0.02 so no two
// faces are ever coplanar (coplanar faces flicker).
export const BL = 1.55; // length (x)
export const BH = 0.5; // height (y)
export const BD = 0.77; // depth (z)
export const SX = 1.6; // spacing along the length
export const SY = 0.52; // layer height
export const SZ = 0.8; // spacing along the depth
export const PER = 18; // bricks per layer: 3 x 6, every other layer turned 90 degrees
export const FOOT = 4.8; // pile footprint (square)

// Local position and yaw of brick i in a pile (pile centre at the origin, floor at y = 0).
export const brickAt = (i: number): { x: number; y: number; z: number; yaw: number } => {
  const L = Math.floor(i / PER);
  const j = i % PER;
  const y = L * SY + BH / 2;
  if (L % 2 === 0) {
    const c = j % 3;
    const r = Math.floor(j / 3);
    return { x: (c - 1) * SX, y, z: (r - 2.5) * SZ, yaw: 0 };
  }
  const c = j % 6;
  const r = Math.floor(j / 6);
  return { x: (c - 2.5) * SZ, y, z: (r - 1) * SX, yaw: Math.PI / 2 };
};

export const pileHeight = (n: number) => Math.ceil(Math.max(0, n) / PER) * SY;
