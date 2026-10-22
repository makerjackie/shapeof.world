import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { EnergyTower, makeSkyline, Skyline } from "./art";
import { FONT, K, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, the first frame's sentence as the title, one main picture.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const lit = (f: number, c: number) => (random(`cover${f}-${c}`) < 0.7 ? 0.85 : 0);
const SKY = makeSkyline("cover", 30, -20, 1960, 120, 380);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${tall ? "60% 75%" : "72% 60%"}, ${K.theme}40 0%, transparent 45%)` }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        <Skyline towers={SKY} ground={H} seed="cover" litFrac={0.35} />
      </div>
      {tall ? (
        <EnergyTower cx={600} ground={H} s={1.45} progress={1} crane={false} lit={lit} />
      ) : (
        <EnergyTower cx={1420} ground={H} s={1.55} progress={1} crane={false} lit={lit} />
      )}
      <div
        style={{
          position: "absolute",
          left: tall ? 70 : 90,
          top: tall ? bar + 80 : bar + 170,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: tall ? 128 : 136,
          lineHeight: 1.18,
          color: K.fg,
          letterSpacing: -3,
          textShadow: "0 10px 50px rgba(0,0,0,0.85)",
        }}
      >
        深圳的高楼，
        <br />
        <span style={{ color: K.theme }}>不是盖来</span>
        <br />
        <span style={{ color: K.theme }}>收租的</span>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
