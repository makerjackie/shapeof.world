import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cam } from "./world/camera";
import { engine, WorldState } from "./world/engine";
import { useWorldReady, World } from "./world/World";

const base = (cam: Cam, o: Partial<WorldState> = {}): WorldState => ({
  cam, time: 3, country: 0, exagC: 6, control: { p2014: 0, p2022_03: 0, p2022_06: 0, p2022_11: 0, p2026: 0 }, borders: 1, rivers: 1,
  field: 1, exag: 1.2, sat: [1, 0, 0], thermal: 0, works: 1, ...o,
});
export const SHOTS: WorldState[] = [
  base({ x: 800, y: 6200, h: 0, dist: 1400, yaw: 20, pitch: 58 }, { mines: { o: 1, depth: 500 } }),
  base({ x: 1100, y: 6300, h: 0, dist: 160, yaw: 30, pitch: 70 }, { cine: 1, mines: { o: 1, depth: 500 } }),
  base({ x: 1100, y: 6300, h: 0, dist: 170, yaw: 0, pitch: 0 }, { thermal: 1 }),
  base({ x: -3500, y: -3000, h: 0, dist: 260, yaw: 200, pitch: 60 }, { teeth: 1 }),
];
export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  const ready = useWorldReady();
  if (!ready) return <World s={null} />;
  const s = { ...SHOTS[Math.min(f, SHOTS.length - 1)] };
  s.cam = { ...s.cam, h: engine().heightAt(s.cam.x, s.cam.y) * s.exag };
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <World s={s} />
    </AbsoluteFill>
  );
};
