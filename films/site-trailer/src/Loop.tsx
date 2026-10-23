import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot } from "./edl";
import { Grain, Shots, Vignette } from "./Film";

// Muted homepage loop: ten 2-beat shots on the film's grid (5 bars, 280 frames), no text. The last shot cuts back
// to the first exactly like any other cut, so the loop has no seam.
export const LOOP_SHOTS: Shot[] = [
  { id: "starry-night-flight", at: 0, len: 2, src: 3.2, rate: 1.2, zoom: [1.04, 1.1] },
  { id: "coffee-vortex", at: 2, len: 2, src: 3.0, rate: 1.3, zoom: [1.16, 1.24], origin: [0.5, 0.15] },
  { id: "galaxy-collision-top", at: 4, len: 2, src: 2.4, rate: 1.1, zoom: [1.3, 1.45] },
  { id: "eclipse-corona", at: 6, len: 2, src: 1.0, zoom: [1.0, 1.28] },
  { id: "earth-terminator", at: 8, len: 2, src: 1.0, rate: 2, zoom: [1.16, 1.26] },
  { id: "attractor-thomas", at: 10, len: 2, src: 3.0, rate: 1.2, zoom: [1.05, 1.12] },
  { id: "flame-zero-g", at: 12, len: 2, src: 2.2, rate: 1.6, zoom: [1.0, 1.1], origin: [0.5, 1.0] },
  { id: "ink-landscape-flight", at: 14, len: 2, src: 0.4, rate: 1.5, zoom: [1.0, 1.06] },
  { id: "neural-spiral", at: 16, len: 2, src: 0.8, rate: 1.2, zoom: [1.05, 1.12] },
  { id: "black-hole-flyby", at: 18, len: 2, src: 1.0, rate: 0.8, zoom: [1.0, 1.06], origin: [0.5, 0.42] },
];
export const LOOP_FRAMES = 20 * 14;

export const Loop: React.FC = () => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <Shots shots={LOOP_SHOTS} labels={false} />
    <Vignette />
    <Grain o={0.04} />
  </AbsoluteFill>
);
