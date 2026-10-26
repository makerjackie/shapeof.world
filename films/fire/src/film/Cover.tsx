// Covers: the question in plain words beside the film's own pile of money bricks, looked up at from the floor.
// Brand bar on top (paper), as on every 世界的形状 cover.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { K, SANS, SERIF } from "../theme";
import { WorldState } from "../world/engine";
import { World } from "../world/World";

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const shot = (tall: boolean): WorldState => ({
  cam: tall ? { x: 4.2, y: 12.5, z: -2.4, dist: 34, yaw: -30, pitch: -2, fov: 40 } : { x: -6.1, y: 7.2, z: 3.5, dist: 27, yaw: -30, pitch: -2, fov: 40 },
  piles: [{ x: 0, z: 0, n: 400, seed: 1, glow: 0.03 }],
  flyers: [
    { p: [-1.6, 13.2, -1.2], r: [0.2, 0.5, 0.1], s: 1 },
    { p: [0.9, 14.6, 0.6], r: [-0.15, 1.3, 0.2], s: 1 },
  ],
  focus: [0, 0, 20],
  floorGlow: 0.9,
  exposure: 1.05,
  fog: 0.004,
  bloom: 0.3,
});

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {tall ? (
        <div style={{ position: "absolute", left: -420, top: 0, width: 1920, height: 1080, transform: "scale(1.3334)", transformOrigin: "0 0" }}>
          <World s={shot(true)} />
        </div>
      ) : (
        <World s={shot(false)} />
      )}
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, rgba(8,6,5,0.92) 0%, rgba(8,6,5,0.7) 34%, rgba(8,6,5,0) 56%)"
            : "linear-gradient(90deg, rgba(8,6,5,0.9) 0%, rgba(8,6,5,0.7) 40%, rgba(8,6,5,0) 62%)",
        }}
      />
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 80 : bar + 210, color: K.paper, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ fontFamily: SANS, fontSize: tall ? 58 : 60, fontWeight: 800, color: "rgba(241,236,223,0.88)", marginBottom: 18, letterSpacing: 2 }}>提前退休</div>
        <div style={{ fontFamily: SANS, fontSize: tall ? 124 : 130, fontWeight: 900, lineHeight: 1.16, letterSpacing: -3, whiteSpace: "nowrap" }}>
          不上班，
          <br />
          到底要攒
          <br />
          <span style={{ color: K.gold }}>多少钱</span>？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
