import React from "react";
import { Box } from "./charts";
import { EIO, progAt } from "./fx";
import { useBeatFrame } from "./kit";
import { laneRect, Lanes } from "./lanes";
import { LaneKey, LANES } from "./theme";

// Chapter opener: the overview timeline is on screen with one lane lit, and in one beat that lane grows to fill the
// chart area while the chapter's own chart fades in underneath. A cut on the beat, not a slow camera push.
export const LaneZoom: React.FC<{ lane: LaneKey; to?: Box; at?: number; dur?: number }> = ({ lane, to = { x: 140, y: 300, w: 1640, h: 600 }, at = 0, dur = 1 }) => {
  const frame = useBeatFrame();
  const z = progAt(frame, at, dur, EIO);
  if (z >= 1) return null;
  const i = LANES.findIndex((l) => l.key === lane);
  const r = laneRect(i);
  const kx = 1 + (to.w / r.w - 1) * z;
  const ky = 1 + (to.h / r.h - 1) * z;
  const tx = (to.x - r.x * (to.w / r.w)) * z;
  const ty = (to.y - r.y * (to.h / r.h)) * z;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - z, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${kx}, ${ky})` }}>
      <Lanes focus={lane} dimOthers={0.5 + 0.5 * z} stations={0} />
    </div>
  );
};
