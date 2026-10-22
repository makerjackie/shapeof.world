import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Scribble, Section, Sheet } from "./art/paper";
import { FONT, K, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, one plain sentence (no numbers, ≥ 110 px), and one picture drawn
// for the cover: the film's exam paper, with the two human columns lit in gold and the AI column overflowing.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

// The cover picture: a 760 × 980 exam paper.
const Picture: React.FC = () => (
  <div style={{ position: "relative", width: 760, height: 980 }}>
    {/* AI ink spilling out of the answer column */}
    <div style={{ position: "absolute", left: 60, top: 420, width: 640, height: 900, background: `linear-gradient(180deg, ${K.ai}88, ${K.ai}00)`, clipPath: "polygon(16% 0, 84% 0, 100% 100%, 0 100%)" }}>
      <div style={{ position: "absolute", left: 40, top: 30 }}>
        <Scribble w={560} lines={22} lineH={40} progress={22} seed="cover-river" color={K.aiHi} width={3.4} />
      </div>
    </div>
    <Sheet x={0} y={0} w={760} h={980} rot={-2.5}>
      <div style={{ position: "absolute", left: 76, top: 30, right: 34, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, color: K.inkSoft }}>绝密★启用前</span>
        <span style={{ fontSize: 34, fontWeight: 900 }}>用 AI 做事 · 试卷</span>
      </div>
      <div style={{ position: "absolute", left: 76, right: 34, top: 92, borderTop: `3px double ${K.ink}` }} />
      <div style={{ position: "absolute", left: 60, right: 22, top: 112, height: 210, borderRadius: 12, border: `7px solid ${K.gold}`, boxShadow: `0 0 50px ${K.gold}` }} />
      <Section n="一" title="出题" who="人" size={58} style={{ position: "absolute", left: 86, top: 140 }} />
      <div style={{ position: "absolute", left: 104, top: 232, fontSize: 30, lineHeight: 1.5 }}>要做成什么？怎样才算做好？</div>
      <Section n="二" title="答题" who="AI" size={40} style={{ position: "absolute", left: 86, top: 350 }} />
      <div style={{ position: "absolute", left: 96, top: 418 }}>
        <Scribble w={600} lines={7} lineH={40} progress={7} seed="cover-answer" />
      </div>
      <div style={{ position: "absolute", left: 60, right: 22, top: 716, height: 236, borderRadius: 12, border: `7px solid ${K.gold}`, boxShadow: `0 0 50px ${K.gold}` }} />
      <Section n="三" title="阅卷" who="人" size={58} style={{ position: "absolute", left: 86, top: 744 }} />
      <div style={{ position: "absolute", left: 470, top: 826, width: 200, height: 104, border: `3px solid ${K.ink}` }}>
        <svg width="150" height="150" viewBox="0 0 100 100" style={{ position: "absolute", left: 30, top: -40, overflow: "visible" }}>
          <path d="M8 54 C 20 62, 30 74, 38 86 C 52 58, 70 30, 96 8" fill="none" stroke={K.greenInk} strokeWidth={10} strokeLinecap="round" />
        </svg>
      </div>
    </Sheet>
  </div>
);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${tall ? "62% 78%" : "74% 62%"}, ${K.ai}44 0%, transparent 46%)` }} />
      <div style={{ position: "absolute", left: tall ? 300 : 1060, top: tall ? 560 : bar + 46, transform: `scale(${tall ? 0.92 : 0.98})`, transformOrigin: "0 0" }}>
        <Picture />
      </div>
      <AbsoluteFill
        style={{
          background: tall
            ? "linear-gradient(180deg, #07090b 0%, #07090b 34%, rgba(7,9,11,0.5) 46%, rgba(7,9,11,0) 58%)"
            : "linear-gradient(90deg, #07090b 0%, rgba(7,9,11,0.9) 44%, rgba(7,9,11,0) 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: tall ? 70 : 96,
          top: tall ? bar + 90 : bar + 250,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: tall ? 118 : 124,
          lineHeight: 1.16,
          color: K.fg,
          letterSpacing: -3,
          whiteSpace: "nowrap",
        }}
      >
        最会用 AI 的人，
        <br />
        只做<span style={{ color: K.gold }}>两件事</span>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
