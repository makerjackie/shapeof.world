// Look-dev: one frame per shot, to judge the world as stills before the film is cut.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cam } from "./world/camera";
import { Glow, WorldState } from "./world/engine";
import { HERO, STALLS, STARS, stallWorld } from "./world/market";
import { World } from "./world/World";

const cam = (x: number, y: number, z: number, dist: number, yaw: number, pitch: number, fov = 40): Cam => ({ x, y, z, dist, yaw, pitch, fov });

// customers drifting along the hero street toward a few stalls
const crowd = (t: number, n: number, toStars: boolean): Glow[] => {
  const out: Glow[] = [];
  for (let i = 0; i < n; i++) {
    const h = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    if (toStars) {
      const st = STALLS[STARS[Math.floor(Math.pow(h(1), 1.8) * STARS.length)]];
      const [tx, , tz] = stallWorld(st, 0, 0, 1.4);
      const u = (h(2) + t * 0.05) % 1;
      const x = tx - (1 - u) * (40 + 260 * h(3)) * (h(4) < 0.5 ? -1 : 1);
      const z = u < 0.92 ? st.k * 24 + (h(5) - 0.5) * 3 : tz;
      out.push({ x, y: 1.3, z, size: 0.18, r: 0.78, g: 0.9, b: 1.0, i: 1.6 });
    } else {
      const x = -180 + 360 * h(1) + t * (h(2) - 0.5) * 2;
      const z = (h(3) - 0.5) * 6;
      out.push({ x, y: 1.3, z, size: 0.18, r: 0.78, g: 0.9, b: 1.0, i: 1.4 });
    }
  }
  return out;
};

const base = (c: Cam, extra: Partial<WorldState> = {}): WorldState => ({ cam: c, time: 3, equal: 1, ...extra });

export const SHOTS: WorldState[] = [
  base(cam(22, 1.7, 0, 24, 90, 4, 46), { glows: crowd(3, 900, false) }), // 0 street level, looking along the hero street
  base(cam(HERO.laptop.x, 1.1, -5, 5.5, 8, 20, 40), { tilt: { focus: 0.52, band: 0.1, amt: 7 } }), // 1 the opening stall
  base(cam(10, 0, 0, 60, 70, 34, 42), { glows: crowd(3, 1400, false), banners: 1, tilt: { focus: 0.55, band: 0.08, amt: 9 } }), // 2 miniature street
  base(cam(60, 0, 0, 420, 75, 30, 40), { glows: crowd(3, 1800, false) }), // 3 the market to the horizon
  base(cam(80, 0, 0, 1300, 60, 52, 40), { equal: 0, glows: crowd(3, 3000, true) }), // 4 the long tail from high above
  base(cam(HERO.cart.x, 1.0, -5, 7.5, -16, 22, 40), { tilt: { focus: 0.55, band: 0.1, amt: 8 } }), // 5 the cart
  base(cam(HERO.company.x, 6, -6, 46, 10, 14, 44), { company: { vis: 1, off: 0.05, sink: 0 } }), // 6 the company building
  base(cam(-40, 1.7, 0, 30, 270, 3, 46), { day: 1 }), // 7 morning on the street
  base(cam(30, 0, 0, 140, 80, 34, 42), { equal: 0, dim: 0, glows: crowd(3, 1800, true) }), // 8 after the turn, mid height
];

export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={SHOTS[Math.min(f, SHOTS.length - 1)]} />
    </AbsoluteFill>
  );
};
