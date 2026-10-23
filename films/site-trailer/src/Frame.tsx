import React from "react";
import { Freeze, OffthreadVideo, staticFile } from "remotion";
import { FPS } from "./edl";

// One frame of a clip at an exact source time. Inside <Freeze frame={1}> the video sees frame 1 + `from` of the
// enclosing <Sequence>, and asks for media time frame × playbackRate / fps; so playbackRate = t·fps / (1 + from)
// makes Remotion fetch time t, and ramps and odd start points stay frame-accurate.
export const Frame: React.FC<{ id: string; t: number; from: number; fit?: "cover" | "fill" }> = ({ id, t, from, fit = "cover" }) => (
  <Freeze frame={1}>
    <OffthreadVideo muted src={staticFile(`footage/${id}.mp4`)} playbackRate={Math.max(0.0001, (t * FPS) / (1 + from))} style={{ width: "100%", height: "100%", objectFit: fit }} />
  </Freeze>
);
