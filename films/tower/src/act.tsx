import React, { useContext } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { CL, EIO } from "./fx";
import { BeatOffset, useBeatFrame } from "./kit";
import { barToFrame } from "./timing";

// An act is one scene whose stage (a map camera, a building) runs continuously while the screens on top of it change
// on bar lines. Each sub-screen gets its own beat clock, so `at` values inside it count from its first downbeat.

export type Sub = {
  from: number; // film bar
  to: number;
  C: React.FC;
};

// Frames since the act's first downbeat (the act's BeatOffset is its pre-roll).
export const useActFrame = () => useBeatFrame();

// Act-local frame of a film bar.
export const actBar = (actFrom: number, bar: number) => barToFrame(bar) - barToFrame(actFrom);

const FADE = 7;

export const Subs: React.FC<{ act: number; subs: Sub[] }> = ({ act, subs }) => {
  const f = useBeatFrame();
  const off = useContext(BeatOffset);
  return (
    <>
      {subs.map((s, i) => {
        const a = actBar(act, s.from);
        const b = actBar(act, s.to);
        const last = i === subs.length - 1;
        const start = i === 0 ? 0 : Math.max(0, off + a - 4);
        const o = last ? 1 : interpolate(f, [b - FADE, b + 2], [1, 0], { ...CL, easing: EIO });
        return (
          <Sequence key={i} from={start} durationInFrames={off + b - start + (last ? 400 : FADE + 2)} layout="none">
            <BeatOffset.Provider value={off + a - start}>
              <AbsoluteFill style={{ opacity: o, transform: o < 1 ? `translateY(${(1 - o) * -24}px)` : undefined }}>
                <s.C />
              </AbsoluteFill>
            </BeatOffset.Provider>
          </Sequence>
        );
      })}
    </>
  );
};

// Piecewise value over act frames: [[frame, value], ...] with eased segments (for layer opacities and the like).
export const track = (f: number, pts: [number, number][], ease = EIO) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return interpolate(f, [pts[i - 1][0], pts[i][0]], [pts[i - 1][1], pts[i][1]], { ...CL, easing: ease });
  }
  return pts[pts.length - 1][1];
};

export const useFrameNow = useCurrentFrame;
