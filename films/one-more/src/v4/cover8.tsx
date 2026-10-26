// Covers: the question in plain words beside the phone at the moment the enemy crystal is at 1%. Brand bar on top.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Cam } from "../cam";
import { FONT, K, SERIF } from "../theme";
import { FightScreen } from "./fight";
import { PhoneBody, PhoneScreen } from "./phone4";
import { beat } from "./time";

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

export const Cover8: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  // the picture lives on a 1920 × 1080 stage; the tall cover shows its lower part
  const cam: Cam = tall ? { cx: 0, cy: -150, z: 0.8 } : { cx: -520, cy: -120, z: 0.92 };
  const gx = 960 + cam.z * (0 - cam.cx);
  const gy = 540 + cam.z * (-150 - cam.cy);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: tall ? (W - 1920) / 2 : 0, top: tall ? H - 1080 + 30 : 0, width: 1920, height: 1080 }}>
        <Img src={staticFile("bed.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350 }} />
        <div style={{ position: "absolute", left: gx - 1500 * cam.z, top: gy - 1000 * cam.z, width: 3000 * cam.z, height: 2000 * cam.z, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(80,130,220,0.45) 0%, rgba(50,90,180,0.16) 40%, rgba(20,40,90,0) 70%)" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <PhoneBody cam={cam} o={1} />
        </svg>
        <PhoneScreen cam={cam}>
          <FightScreen t={beat(3.62)} />
        </PhoneScreen>
      </div>
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 80 : bar + 230, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 58, fontWeight: 800, color: "rgba(244,240,232,0.85)", marginBottom: 20, letterSpacing: 2 }}>打游戏</div>
        <div style={{ fontSize: tall ? 112 : 108, fontWeight: 900, lineHeight: 1.16, letterSpacing: -2 }}>
          明知道该停，
          <br />
          为什么<span style={{ color: K.want }}>停不下来</span>？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
