import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { b2f, BOOKEND, FPS, INTRO, SHOTS } from "./edl";
import { Frame } from "./Frame";
import { CW, FULL, Laptop } from "./Laptop";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// zoom in log space, so the push feels like a steady dolly rather than a speeding one
const zoom = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

// Intro (two bars before the montage): the real homepage on a laptop, a pointer gliding onto the Starry Night card,
// a press on the beat, the card opening to fill the page, and the camera pushing into the screen until the page is
// the frame. The last intro frame and the first montage shot show the same footage at the same time and zoom.
const PRESS = 72; // home-cursor presses the card at 2.4 s
// the Starry Night card on the homepage, as fractions of the page (from the live layout at 1920×1080)
const CARD = { x: 878 / 1920, y: 154 / 1080, w: 898 / 1920, h: 561 / 1080 };
const OPEN = [PRESS + 2, PRESS + 22];

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const end = b2f(INTRO);
  const first = SHOTS[0]; // starry-night-flight, the montage's first shot
  const r = first.rate ?? 1;
  const z0 = first.zoom?.[0] ?? 1;
  // settle: a slow dolly and the laptop turning to face us, in motion from frame 0
  const a = interpolate(f, [0, PRESS], [0, 1], { ...CL, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
  // push: from the press to the downbeat, landing softly on the full frame
  const p = interpolate(f, [PRESS, end - 1], [0, 1], { ...CL, easing: Easing.bezier(0.55, 0, 0.2, 1) });
  const s = p > 0 ? zoom(1, FULL, p) : lerp(0.9, 1, a);
  const cam = { s, cx: 960, cy: lerp(lerp(526, 512, a), 540, p), ry: lerp(-11, 0, a), glare: 1 - p };
  // the card opening into the page
  const o = interpolate(f, OPEN, [0, 1], { ...CL, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const fade = interpolate(f, [OPEN[0], OPEN[0] + 5], [0, 1], CL);
  const box = { left: lerp(CARD.x, 0, o) * CW, top: lerp(CARD.y, 0, o) * (CW * 9 / 16), width: lerp(CARD.w, 1, o) * CW, height: lerp(CARD.h, 1, o) * (CW * 9 / 16) };
  return (
    <Laptop cam={cam}>
      <AbsoluteFill>
        <Frame id="home-cursor" t={Math.min(3.3, f / FPS)} from={0} />
      </AbsoluteFill>
      {f >= OPEN[0] ? (
        <div style={{ position: "absolute", ...box, overflow: "hidden", borderRadius: lerp(10, 0, o), opacity: fade }}>
          <AbsoluteFill style={{ transform: `scale(${lerp(1, z0, o)})` }}>
            <Frame id={first.id} t={first.src + ((f - end) / FPS) * r} from={0} />
          </AbsoluteFill>
        </div>
      ) : null}
    </Laptop>
  );
};

// Bookend: the black hole starts full frame, and while "这些都不是视频" plays the camera pulls back to show it running
// in the same laptop's browser, a pointer orbiting it. The laptop settles right of centre, leaving the left third
// for the closing lines.
export const Bookend: React.FC = () => {
  const f = useCurrentFrame();
  const from = b2f(BOOKEND.at);
  const p = interpolate(f, [1, b2f(4.5)], [0, 1], { ...CL, easing: Easing.bezier(0.3, 0, 0.1, 1) });
  const drift = interpolate(f, [b2f(4.5), b2f(BOOKEND.len)], [0, 1], CL);
  const s = zoom(FULL, 0.72, p) * (1 - 0.03 * drift);
  const cam = { s, cx: lerp(960, 1410, p), cy: lerp(540, 515, p), ry: lerp(0, -7, p), glare: p };
  return (
    <Laptop cam={cam}>
      <Frame id={BOOKEND.id} t={BOOKEND.src + f / FPS} from={from} />
    </Laptop>
  );
};
