import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot } from "./edl";
import { Grain, Shots, Vignette } from "./Film";

// Muted homepage loop: ten 2-beat shots on the film's grid (5 bars, 280 frames), no text. The last shot cuts back
// to the first exactly like any other cut, so the loop has no seam.
export const LOOP_SHOTS: Shot[] = [
  { id: "starry-night-flight", at: 0, len: 2, src: 3.2, rate: 1.2, zoom: [1.04, 1.1] },
  { id: "fluid-swirl", at: 2, len: 2, src: 2.2, rate: 1.3, zoom: [1.0, 1.06] },
  { id: "galaxy-wide", at: 4, len: 2, src: 0.4, rate: 1.3, zoom: [1.0, 1.1] },
  { id: "eclipse-sky", at: 6, len: 2, src: 1.0, zoom: [1.0, 1.25], origin: [0.5, 0.26] },
  { id: "earth-terminator", at: 8, len: 2, src: 1.0, rate: 2, zoom: [1.02, 1.1] },
  { id: "butterfly-flow", at: 10, len: 2, src: 2.2, rate: 1.2, zoom: [1.0, 1.06] },
  { id: "flame-gravity", at: 12, len: 2, src: 1.0, rate: 1.6, ramp: { at: 12, rate: 3.4 }, zoom: [1.0, 1.05], origin: [0.5, 0.7] },
  { id: "ink-landscape-flight", at: 14, len: 2, src: 0.4, rate: 1.5, zoom: [1.0, 1.06] },
  { id: "equation-blackhole", at: 16, len: 2, src: 1.0, rate: 1.2, zoom: [1.0, 1.06] },
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
