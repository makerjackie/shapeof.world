// Covers: the question in plain words over the stopped red city, with the green ✓ the user loves. Brand bar on top.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { City } from "./city";
import { FONT, K, SERIF } from "./theme";
import { SuccessCard } from "./ui";

const PAPER = "#f1ecdf";
const INK = "#19231f";
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: PAPER, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: INK, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: INK, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: tall ? (W - 1920) / 2 : 0, top: tall ? H - 1080 : 0, width: 1920, height: 1080 }}>
        <City t={20} cam={{ cx: tall ? 1050 : 760, cy: 560, k: 1.15 }} stop={-100} />
        <div style={{ position: "absolute", inset: 0, background: tall ? "linear-gradient(180deg, rgba(5,7,11,0.95) 0%, rgba(5,7,11,0.2) 45%, rgba(5,7,11,0.1) 100%)" : "linear-gradient(90deg, rgba(5,7,11,0.95) 0%, rgba(5,7,11,0.6) 42%, rgba(5,7,11,0.05) 75%)" }} />
        <div style={{ position: "absolute", left: tall ? 960 - 330 : 1180, top: tall ? 420 : 300, transform: "rotate(-4deg)" }}>
          <SuccessCard w={660} />
        </div>
      </div>
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 70 : bar + 250, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: "rgba(244,240,232,0.88)", marginBottom: 22, letterSpacing: 2 }}>一句普通的话，</div>
        <div style={{ fontSize: tall ? 116 : 112, fontWeight: 900, lineHeight: 1.16, letterSpacing: -2 }}>
          AI 能闯
          <br />
          <span style={{ color: K.red }}>多大的祸</span>？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
