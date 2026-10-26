// Look-development shots: one frame each (render with tools/stills.mjs, COMP=Lab).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cam } from "./world/camera";
import { WorldState } from "./world/engine";
import { makeHH, World } from "./world/World";
import { HERO, MEIFOO_X, PRUITT_X } from "./world/city";

const lit = (p: number) => makeHH((i) => [((i * 0.6180339) % 1) < p ? 1 : 0, 0, 0, 0]);
const cam = (c: Partial<Cam>): Cam => ({ x: 0, y: 40, z: 0, dist: 300, yaw: 0, pitch: 10, fov: 35, ...c });
const base = (c: Partial<Cam>, extra: Partial<WorldState> = {}): WorldState => ({
  cam: cam(c),
  time: 12,
  night: 0.85,
  city: { lights: 0.62 },
  hero: { vis: 1, built: 1, hh: lit(0.82), age: 0, xray: 0, vote: 0, water: 0, lifts: [20, 60], stairs: 0 },
  ...extra,
});

export const SHOTS: WorldState[] = [
  base({ x: 0, y: 0, z: 200, dist: 6200, yaw: 6, pitch: 20, fov: 40 }, { night: 0.92, city: { lights: 0.0 } }),
  base({ x: 0, y: 0, z: 200, dist: 6200, yaw: 6, pitch: 20, fov: 40 }, { night: 0.92, city: { lights: 0.58, darkR: 2300, darkAmt: 0.95 } }),
  base({ x: 46, y: 26, z: 0, dist: 190, yaw: -26, pitch: 3, fov: 40 }, { old: { vis: 1, floors: 6, drop: 0 }, city: { lights: 0.6, hideEast: true } }),
  base({ x: 46, y: 26, z: 0, dist: 190, yaw: -26, pitch: 3, fov: 40 }, { old: { vis: 1, floors: 11, drop: 0 }, city: { lights: 0.6, hideEast: false } }),
  base({ x: 0, y: 0, z: -400, dist: 3200, yaw: 20, pitch: 22, fov: 40 }),
  base({ x: 0, y: 60, z: 0, dist: 520, yaw: -25, pitch: 4, fov: 38 }, { night: 0.55 }),
  base({ x: 0, y: 50, z: 0, dist: 210, yaw: 0, pitch: 6, fov: 38 }),
  base({ x: 0, y: 50, z: 0, dist: 190, yaw: -28, pitch: 8, fov: 38 }, { hero: { vis: 1, built: 1, hh: lit(0.82), age: 0, xray: 1, vote: 0, water: 70, lifts: [24, 66], stairs: 0.45 } }),
  base({ x: 0, y: 50, z: 0, dist: 200, yaw: 0, pitch: 4, fov: 38 }, { hero: { vis: 1, built: 1, hh: makeHH((i, f) => [1, f > 10 ? 1 : 0, f <= 10 ? 1 : 0, 0]), age: 0.2, xray: 0, vote: 1, water: 0, lifts: [0, 0], stairs: 0 } }),
  base({ x: 0, y: 30, z: 10, dist: 150, yaw: 12, pitch: 10, fov: 40 }, { coins: { t: 0.45, vis: 1 }, tank: { vis: 1, level: 0.4 } }),
  base({ x: 0, y: 0, z: -300, dist: 1600, yaw: 10, pitch: 16, fov: 40 }, { city: { lights: 0.4, elev: 1, elevAge: 0.5 } }),
  base({ x: PRUITT_X, y: 0, z: 0, dist: 700, yaw: 25, pitch: 18, fov: 38 }, { site: 1, pruitt: { lights: 0.8, drop: () => 0, dust: 0 } }),
  base({ x: PRUITT_X, y: 10, z: 0, dist: 520, yaw: 25, pitch: 14, fov: 38 }, { site: 1, pruitt: { lights: 0.1, drop: (i) => (i % 3 === 0 ? 0.55 : 0), dust: 0.8 } }),
  base({ x: MEIFOO_X, y: 20, z: 0, dist: 900, yaw: 180, pitch: 14, fov: 38 }, { site: 2, meifoo: { lights: 0.92 } }),
  base({ x: 30, y: 40, z: 0, dist: 260, yaw: -10, pitch: 8, fov: 38 }, { old: { vis: 1, floors: 6, drop: 0 }, city: { lights: 0.62, hideEast: true }, ghost: { vis: 1, lift: HERO.h } }),
  base({ x: 0, y: 0, z: -400, dist: 3600, yaw: 20, pitch: 24, fov: 40 }, { city: { lights: 0.62, darkR: 2600, darkAmt: 1 } }),
];

export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={SHOTS[Math.min(f, SHOTS.length - 1)]} />
    </AbsoluteFill>
  );
};
