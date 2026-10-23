import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { engine, WorldState } from "./world/engine";
import { World } from "./world/World";

// Look-development shots for the 3D city: node tools/lab.mjs <outDir> <frame...>
export const SHOTS: WorldState[] = [
  { cam: { x: -700, y: -350, z: 0.75, bearing: 15, tilt: 74 }, night: 0, lights: 0.45, roads: 1, metro: 0, towers: { year: 2026, ex: 1, on: 1 }, traffic: 0 },
  { cam: { x: -700, y: -350, z: 0.75, bearing: 15, tilt: 74 }, night: 0.85, roads: 1, vacancy: 0.25, towers: { year: 2026, ex: 1, on: 1 }, traffic: 0, led: 1 },
  { cam: { x: -900, y: -1400, z: 0.9, bearing: 10, tilt: 80, oy: 760 }, night: 0.55, roads: 1, towers: { year: 2026, ex: 1, on: 1 }, traffic: 0, led: 1 },
  { cam: { x: -400, y: 0, z: 0.28, bearing: 0, tilt: 0 }, night: 0.6, roads: 1, metro: 1 },
  { cam: { x: -2000, y: 0, z: 0.03, bearing: 0, tilt: 40 }, night: 0.85, city: 0, cityRoads: 1, sz: 1, metro: 0.6, towers: { year: 2026, ex: 4, on: 1 } },
  { cam: { x: -128, y: -810, z: 2.6, bearing: -35, tilt: 68, oy: 600 }, night: 0.1, roads: 1, hero: { tint: 0 } },
  { cam: { x: -128, y: -810, z: 2.6, bearing: -35, tilt: 68, oy: 600 }, night: 0.3, roads: 1, hero: { built: 0.45 } },
  { cam: { x: -128, y: -810, z: 2.6, bearing: -35, tilt: 68, oy: 600 }, night: 0.1, roads: 1, hero: { on: 0 } },
  { cam: { x: -128, y: -810, z: 2.6, bearing: -35, tilt: 68, oy: 600 }, night: 0.1, roads: 1, city: 0 },
  { cam: { x: -128, y: -810, z: 2.6, bearing: -35, tilt: 68, oy: 600 }, night: 0.1, roads: 0 },
  { cam: { x: -12720, y: -2620, z: 0.95, bearing: -32, tilt: 75, oy: 760 }, night: 0.45, roads: 1, tint: "#ffd166", bState: (_i, b) => (b.year && b.year >= 2024 ? [1, 1, 1, 1] : [1, 0, 1, 1]), towers: { year: 2026, ex: 1, on: 1 } },
  { cam: { x: -12720, y: -2620, z: 0.95, bearing: -32, tilt: 75, oy: 760 }, night: 0.45, roads: 1, city: 0, tint: "#ffd166", towers: { year: 2026, ex: 1, on: 1, tint: (_i, t) => (t[3] >= 2024 ? 1 : 0) } },
];

const GlInfo: React.FC = () => {
  let info = "";
  try {
    const gl = engine().canvas.getContext("webgl2") as WebGL2RenderingContext;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    info = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch (e) {
    info = String(e);
  }
  return <div style={{ position: "absolute", right: 12, bottom: 8, color: "#ffffff80", fontSize: 14, fontFamily: "monospace" }}>{info}</div>;
};

export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={SHOTS[f % SHOTS.length]} />
      <GlInfo />
    </AbsoluteFill>
  );
};
