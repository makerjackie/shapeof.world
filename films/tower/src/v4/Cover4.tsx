// Covers for v4: the question in plain words over the same 3D Futian as the film, at blue hour with a quarter of
// the office floors dark. Brand bar on top (paper), as on every 世界的形状 cover.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
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
  cam: tall ? { x: -989, y: -1000, z: 0.7, bearing: 8, tilt: 80, ox: 960, oy: 820 } : { x: -1250, y: -1350, z: 0.95, bearing: 12, tilt: 79, ox: 1260, oy: 700 },
  night: 0.55,
  lights: 0.85,
  full: 0.8,
  vacancy: 0.27,
  roads: 1,
  traffic: 400,
  towers: { year: 2026, ex: 1, on: 1 },
});

export const Cover4: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      {tall ? (
        <div style={{ position: "absolute", left: -740, top: 0, width: 1920, height: 1080, transform: "scale(1.3334)", transformOrigin: "0 0" }}>
          <World s={shot(true)} />
        </div>
      ) : (
        <World s={shot(false)} />
      )}
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, rgba(5,6,8,0.92) 0%, rgba(5,6,8,0.75) 34%, rgba(5,6,8,0) 58%)"
            : "linear-gradient(90deg, rgba(5,6,8,0.9) 0%, rgba(5,6,8,0.72) 36%, rgba(5,6,8,0) 62%)",
        }}
      />
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 96 : bar + 200, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: tall ? 54 : 56, fontWeight: 800, color: "rgba(244,240,232,0.85)", marginBottom: 18, letterSpacing: 2 }}>深圳写字楼</div>
        <div style={{ fontSize: tall ? 128 : 136, fontWeight: 900, lineHeight: 1.14, letterSpacing: -3 }}>
          空了<span style={{ color: K.gold }}>四分之一</span>，
          <br />
          为什么还在盖？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
