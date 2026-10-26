import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { b2f, BOOKEND, FPS, INTRO, SHOTS } from "./edl";
import { Frame } from "./Frame";
import { fullPose, H, Laptop3D, mixPose, orbitPose, screenPose, W } from "./Laptop3D";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Intro (two bars before the montage): the real homepage on the 3D laptop, close up. A large pointer reaches the
// Starry Night card and presses it at 1.0 s, the card opens to fill the page, and the camera pushes into the screen,
// arriving square on (the page exactly filling the frame) a few frames before the bar-0 hit, so the last intro
// frames are already the montage's first shot.
const PRESS = 30; // home-click presses the card at 1.0 s
const ARRIVE = 100;
const CARD = { x: 878 / 1920, y: 154 / 1080, w: 898 / 1920, h: 561 / 1080 };
const OPEN = [PRESS + 2, PRESS + 20];
const START = screenPose(1.8, -0.7, 1.25, 0.28);
const SETTLE = screenPose(1.62, -0.42, 0.95, 0.2);

export const Intro3D: React.FC = () => {
  const f = useCurrentFrame();
  const end = b2f(INTRO);
  const first = SHOTS[0];
  const r = first.rate ?? 1;
  const z0 = first.zoom?.[0] ?? 1;
  const a = interpolate(f, [0, PRESS], [0, 1], { ...CL, easing: Easing.bezier(0.3, 0.1, 0.3, 1) });
  const p = interpolate(f, [PRESS, ARRIVE], [0, 1], { ...CL, easing: Easing.bezier(0.5, 0, 0.15, 1) });
  const pose = p > 0 ? mixPose(SETTLE, fullPose(), p) : mixPose(START, SETTLE, a);
  const o = interpolate(f, OPEN, [0, 1], { ...CL, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const fade = interpolate(f, [OPEN[0], OPEN[0] + 4], [0, 1], CL);
  const box = { left: lerp(CARD.x, 0, o) * W, top: lerp(CARD.y, 0, o) * H, width: lerp(CARD.w, 1, o) * W, height: lerp(CARD.h, 1, o) * H };
  return (
    <Laptop3D pose={pose} glare={1 - p}>
      <AbsoluteFill>
        <Frame id="home-click" t={Math.min(2.15, f / FPS)} from={0} />
      </AbsoluteFill>
      {f >= OPEN[0] ? (
        <div style={{ position: "absolute", ...box, overflow: "hidden", borderRadius: lerp(18, 0, o), opacity: fade }}>
          <AbsoluteFill style={{ transform: `scale(${lerp(1, z0, o)})` }}>
            <Frame id={first.id} t={Math.max(0, first.src + ((f - end) / FPS) * r)} from={0} />
          </AbsoluteFill>
        </div>
      ) : null}
    </Laptop3D>
  );
};

// Bookend: the black hole starts square on and full frame, then pulls back to a three-quarter view of the same
// laptop, a pointer orbiting the black hole in its browser; the laptop settles right of centre for the closing lines.
const WIDE = orbitPose(new THREE.Vector3(-2.1, 0.95, -0.3), -24, 7.6, 1.8);
const WIDE_END = orbitPose(new THREE.Vector3(-2.1, 0.95, -0.3), -20, 8.0, 1.9);

export const Bookend3D: React.FC<{ from?: number }> = ({ from = b2f(BOOKEND.at) }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [1, b2f(4.5)], [0, 1], { ...CL, easing: Easing.bezier(0.3, 0, 0.1, 1) });
  const drift = interpolate(f, [b2f(4.5), b2f(BOOKEND.len)], [0, 1], CL);
  const pose = p < 1 ? mixPose(fullPose(), WIDE, p) : mixPose(WIDE, WIDE_END, drift);
  return (
    <Laptop3D pose={pose} glare={p}>
      <Frame id={BOOKEND.id} t={BOOKEND.src + f / FPS} from={from} />
    </Laptop3D>
  );
};
