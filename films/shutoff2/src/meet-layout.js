// Meeting-room layout (world metres). No imports: the camera module reads this too.
// 安's HQ, floor y = 150. Window wall at z = -7 faces the CBD; the east wall (x = +9) is glass too (corner room).
// The table runs along Z: the screen stands at the -Z end against the glass, 林工 sits at the +Z foot facing it.

export const FLOOR = 150;
export const ROOM = { x0: -9, x1: 9, z0: -7, z1: 7, h: 4.6 };
export const TABLE = { cx: 0, cz: -0.4, L: 5.6, W: 1.5, top: 0.74 };
export const TOP = FLOOR + TABLE.top;                 // table surface height (world y)
export const EDGE_LIN = TABLE.cz + TABLE.L / 2;      // z of the table edge in front of 林工 (2.4)
export const SCREEN = { x: 0, y: FLOOR + 2.45, z: -6.0, w: 4.0, h: 2.25 };

// yaw: rotation.y that turns a person's +Z (forward) to face the table
export const SEATS = {
  chair: { x: 0, z: -3.72, yaw: 0, role: 'chair' },
  bun: { x: -1.13, z: -2.2, yaw: Math.PI / 2, phone: 0 },
  heavy: { x: -1.13, z: -0.4, yaw: Math.PI / 2, phone: 3 },
  young: { x: -1.13, z: 1.4, yaw: Math.PI / 2, phone: 4 },
  bob: { x: 1.13, z: -2.2, yaw: -Math.PI / 2, phone: 1 },
  zhang: { x: 1.13, z: -0.4, yaw: -Math.PI / 2, phone: 2 },   // backlit by the east glass
  empty: { x: 1.13, z: 1.4, yaw: -Math.PI / 2 },
  lin: { x: 0, z: 3.05, yaw: Math.PI, role: 'lin' },
};

// 林工's phone, face up on the table in front of him (top of the phone toward the screen)
export const PHONE_LIN = { x: 0.12, y: TOP + 0.004, z: 2.1 };

// seat-local frame: a = toward the table centre (m from the person's table edge), b = along the edge (to the person's left)
export function seatFrame(id) {
  const s = SEATS[id];
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);         // forward (toward the table)
  const lx = fz, lz = -fx;                                  // the person's left
  // the table edge in front of this seat
  let ex, ez;
  if (Math.abs(fx) > 0.5) { ex = Math.sign(fx) * -TABLE.W / 2 + TABLE.cx; ez = s.z; } // side seats: edge at x = ∓0.75
  else { ex = s.x; ez = fz > 0 ? TABLE.cz - TABLE.L / 2 : TABLE.cz + TABLE.L / 2; }
  return {
    at: (a, b, y = TOP) => [ex + fx * a + lx * b, y, ez + fz * a + lz * b],
    yaw: s.yaw, fx, fz, lx, lz, ex, ez,
  };
}
