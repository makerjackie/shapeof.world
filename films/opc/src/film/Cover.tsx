// Covers: the question in plain words over the film's night market: the opening stall's lamp in front, a sea of
// lamps behind, a few blazing. Brand bar on top (paper), as on every 世界的形状 cover (from films/highrise).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { WorldState } from "../world/engine";
import { HERO_IDS, STALLS, STAR } from "../world/market";
import { World } from "../world/World";
import { flows } from "./crowd";

const PAPER = "#f1ecdf";
const INK = "#19231f";
const LAP = STALLS[HERO_IDS.laptop];

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: PAPER, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: INK, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: INK, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const shot = (tall: boolean): WorldState => ({
  cam: tall
    ? { x: LAP.x + 6, y: 0.6, z: LAP.z, dist: 26, yaw: 64, pitch: 18, fov: 44, ox: 960, oy: 640 }
    : { x: LAP.x + 8, y: 0.6, z: LAP.z, dist: 30, yaw: 66, pitch: 17, fov: 40, ox: 1300, oy: 560 },
  time: 30,
  equal: 0.25,
  over: { [HERO_IDS.laptop]: { keep: true, lit: 1, s: 0.6 }, [STAR]: { keep: true, s: 1 } },
  glows: flows(30, 2400, 1, 0.7),
  bloom: 0.55,
  tilt: { focus: 0.6, band: 0.12, amt: 6 },
  windows: 0.14,
  fogD: 0.0012,
  grade: { vig: 0.55, grain: 0.015, fade: 0 },
});

export const Cover: React.FC<{ tall: boolean; four3?: boolean }> = ({ tall, four3 }) => {
  const W = tall ? 1080 : four3 ? 1440 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      {tall ? (
        <div style={{ position: "absolute", left: -560, top: 0, width: 1920, height: 1080, transform: "scale(1.3334)", transformOrigin: "0 0" }}>
          <World s={shot(true)} />
        </div>
      ) : four3 ? (
        <div style={{ position: "absolute", left: -250, top: 0, width: 1920, height: 1080 }}>
          <World s={shot(false)} />
        </div>
      ) : (
        <World s={shot(false)} />
      )}
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, rgba(5,6,8,0.9) 0%, rgba(5,6,8,0.72) 36%, rgba(5,6,8,0) 60%)"
            : "linear-gradient(90deg, rgba(5,6,8,0.88) 0%, rgba(5,6,8,0.62) 42%, rgba(5,6,8,0) 66%)",
        }}
      />
      <div style={{ position: "absolute", left: tall ? 76 : four3 ? 80 : 110, top: tall ? bar + 90 : bar + 230, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: tall ? 60 : 62, fontWeight: 800, color: "rgba(244,240,232,0.88)", marginBottom: 16, letterSpacing: 2 }}>一人公司（OPC）</div>
        <div style={{ fontSize: tall ? 124 : four3 ? 110 : 128, fontWeight: 900, lineHeight: 1.16, letterSpacing: -3, whiteSpace: "nowrap" }}>
          一个人开公司，
          <br />
          <span style={{ color: K.gold }}>最难的</span>是什么？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
