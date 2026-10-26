// Look-development shots: one frame each (render with tools/stills.mjs, COMP=Lab).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { worldAt } from "./film/state";
import { sf } from "./timing";
import { World } from "./world/World";

// film bars worth checking by eye
export const SHOTS = [0, 0.8, 1.6, 2.4, 3.2, 3.9, 4.5, 8.8, 20, 26, 33, 41, 51, 55.5, 59, 62.5, 67, 71, 74.5, 78.5, 85, 90, 94, 99, 102, 107, 113, 119.5];

export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={worldAt(sf(SHOTS[Math.min(f, SHOTS.length - 1)]))} />
    </AbsoluteFill>
  );
};
