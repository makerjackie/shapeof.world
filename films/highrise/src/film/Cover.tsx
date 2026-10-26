// Covers: the question in plain words over the film's own tower, looked up at from the garden at night, a third of
// its homes dark. Brand bar on top (paper), as on every 世界的形状 cover.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { WorldState } from "../world/engine";
import { makeHH, World } from "../world/World";

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

const shot = (tall: boolean): WorldState => ({
  cam: tall
    ? { x: 0, y: 52, z: 0, dist: 205, yaw: -14, pitch: -6, fov: 44, ox: 960, oy: 600 }
    : { x: 0, y: 52, z: 0, dist: 215, yaw: -16, pitch: -5, fov: 40, ox: 1330, oy: 540 },
  time: 8,
  night: 0.8,
  dim: 1,
  traffic: 1,
  bloom: 0.42,
  city: { lights: 0.45, dim: 0.5, hideEast: true },
  hero: {
    vis: 1,
    built: 1,
    hh: makeHH((i) => [((i * 0.6180339) % 1) < 0.62 ? 1 : 0, 0, 0, ((i * 0.41421356) % 1) < 0.3 ? 1 : 0]),
    hh2: new Float32Array(132 * 4),
    age: 0.75,
    xray: 0,
    vote: 0,
    peel: 0,
    water: 0,
    lifts: [0, 0],
    stairs: 0,
  },
});

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      {tall ? (
        <div style={{ position: "absolute", left: -560, top: 0, width: 1920, height: 1080, transform: "scale(1.3334)", transformOrigin: "0 0" }}>
          <World s={shot(true)} />
        </div>
      ) : (
        <World s={shot(false)} />
      )}
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, rgba(5,6,8,0.9) 0%, rgba(5,6,8,0.7) 36%, rgba(5,6,8,0) 60%)"
            : "linear-gradient(90deg, rgba(5,6,8,0.88) 0%, rgba(5,6,8,0.66) 40%, rgba(5,6,8,0) 64%)",
        }}
      />
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 90 : bar + 220, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: tall ? 60 : 62, fontWeight: 800, color: "rgba(244,240,232,0.88)", marginBottom: 16, letterSpacing: 2 }}>高层住宅</div>
        <div style={{ fontSize: tall ? 120 : 128, fontWeight: 900, lineHeight: 1.16, letterSpacing: -3 }}>
          几十年后，
          <br />
          会变成<span style={{ color: K.gold }}>贫民窟</span>吗？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
