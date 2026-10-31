import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FRONT_JUN23, LANE, PLACE } from "./geo";
import { Cam } from "./world/camera";
import { WorldState } from "./world/engine";
import { useWorldReady, World } from "./world/World";

const base = (cam: Cam, o: Partial<WorldState> = {}): WorldState => ({
  cam, time: 3, country: 0, exagC: 6, control: { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: 1, p2026: 0 }, borders: 1, rivers: 1,
  field: 1, exag: 4, sat: [1, 0, 0], thermal: 0, ...o,
});
const [rx, ry] = PLACE.robotyne;
export const SHOTS: WorldState[] = [
  base({ x: -380000, y: 130000, h: 0, dist: 2300000, yaw: 0, pitch: 18 }, { field: 0, country: 1 }),
  base({ x: 0, y: 4000, h: 0, dist: 60000, yaw: 0, pitch: 0 }, { front: FRONT_JUN23, frontGlow: 1, sideTint: 1 }),
  base({ x: -1000, y: 6000, h: 400, dist: 22000, yaw: 10, pitch: 58 }, { front: FRONT_JUN23, frontGlow: 1, sideTint: 1, trench: 1, mines: { o: 1, depth: 500 }, main: 1 }),
  base({ x: rx, y: ry - 3000, h: 500, dist: 3000, yaw: 20, pitch: 62 }, { main: 1, teeth: 1, trench: 1 }),
  base({ x: LANE.x, y: 7700, h: 500, dist: 420, yaw: 0, pitch: 0 }, { thermal: 1, mines: { o: 1, depth: 500, lane: 1 },
    units: [0, 1, 2, 3, 4, 5].map((i) => ({ kind: i === 0 ? "clear" : i === 2 ? "tank" : "ifv", x: LANE.x, y: 7700 + i * 22, yaw: 180, side: 0 })),
    fx: [{ x: LANE.x, y: 7690, age: 0.1, kind: "flash", size: 30 }, { x: LANE.x + 8, y: 7740, age: 1, kind: "smoke", size: 40 }] }),
  base({ x: LANE.x + 150, y: 7600, h: 520, dist: 700, yaw: -20, pitch: 55 }, { thermal: 0, mines: { o: 1, depth: 500, lane: 1 }, trench: 1,
    units: [0, 1, 2, 3, 4, 5].map((i) => ({ kind: i === 0 ? "clear" : i === 2 ? "tank" : "ifv", x: LANE.x, y: 7700 + i * 22, yaw: 180, side: 0 })) }),
];
export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  const ready = useWorldReady();
  if (!ready) return <World s={null} />;
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <World s={SHOTS[Math.min(f, SHOTS.length - 1)]} />
    </AbsoluteFill>
  );
};
