// Look-development shots: one frame each (render with tools/stills.mjs, COMP=Lab).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { worldAt } from "./film/state";
import { sf } from "./timing";
import { World } from "./world/World";

// film bars worth checking by eye
export const SHOTS = [3, 11, 17.5, 20, 26, 34, 38.5, 45, 50, 55, 62, 67, 70.5, 78.5, 90.5, 93.5, 100, 103, 106, 114, 117, 121];

export const Lab: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <World s={worldAt(sf(SHOTS[Math.min(f, SHOTS.length - 1)]))} />
    </AbsoluteFill>
  );
};
