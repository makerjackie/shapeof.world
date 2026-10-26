// Covers: the question in plain words beside the film's own picture, the glowing 再来一局 button inside its rings of
// open loops, a fingertip hovering over it. Brand bar on top (paper), as on every 世界的形状 cover.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Cam } from "./cam";
import { Rings } from "./game";
import { PhoneHtml, PhoneState, PhoneSvg } from "./phone";
import { FONT, K, SERIF } from "./theme";
import { sA } from "./timing";

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const STILL_T = sA(20.2); // all five rings drawn, before they spin
const button = (): PhoneState => ({ o: 1, ui: 0, stamp: 1, beat: 0, lit: 4, touch: { x: 92, y: 80, s: 1.08, o: 0.95 } });

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  // the picture is drawn on a 1920 × 1080 stage; the tall cover shows its lower part
  const cam: Cam = tall ? { cx: 0, cy: -150, z: 1.12 } : { cx: -470, cy: -40, z: 1.18 };
  const s = button();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: tall ? "radial-gradient(ellipse 80% 55% at 50% 72%, #1a2446 0%, #0a1224 50%, #05070b 100%)" : "radial-gradient(ellipse 60% 85% at 72% 55%, #1a2446 0%, #0a1224 50%, #05070b 100%)" }} />
      <div style={{ position: "absolute", left: tall ? (W - 1920) / 2 : 0, top: tall ? H - 1080 + 40 : 0, width: 1920, height: 1080 }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <Rings t={STILL_T} cam={cam} />
          <PhoneSvg cam={cam} s={s} />
        </svg>
        <PhoneHtml cam={cam} s={s} />
      </div>
      <div style={{ position: "absolute", left: tall ? 76 : 110, top: tall ? bar + 84 : bar + 230, fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.7)" }}>
        <div style={{ fontSize: tall ? 58 : 58, fontWeight: 800, color: "rgba(244,240,232,0.85)", marginBottom: 20, letterSpacing: 2 }}>打游戏</div>
        <div style={{ fontSize: tall ? 116 : 116, fontWeight: 900, lineHeight: 1.16, letterSpacing: -2 }}>
          明知道该停，
          <br />
          为什么<span style={{ color: K.want }}>停不下来</span>？
        </div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
