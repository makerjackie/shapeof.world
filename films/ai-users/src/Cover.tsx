import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Scribble, Section, Sheet } from "./art/paper";
import { GradingPen } from "./art/props";
import { K, SANS, SERIF } from "./theme";

// Covers (films/DIRECTOR.md 三): paper brand bar on top, one plain sentence (no numbers, ≥ 110 px, Noto Sans SC
// Black, the keyword under the film's gold highlighter), and one picture drawn for the cover on the film's warm
// desk: the exam paper with the two human columns lit in gold and the AI column overflowing in violet.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box", boxShadow: "0 4px 16px rgba(70,45,15,0.12)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const GOLD = { border: `8px solid ${K.gold}`, boxShadow: `0 0 46px ${K.gold}`, borderRadius: 14 };

// The cover picture: a 760 × 980 exam paper, its answer column spilling a violet river of AI handwriting.
const Picture: React.FC = () => (
  <div style={{ position: "relative", width: 760, height: 980 }}>
    <div style={{ position: "absolute", left: 40, top: 430, width: 700, height: 1000, clipPath: "polygon(12% 0, 88% 0, 100% 100%, 0 100%)", background: "linear-gradient(180deg, rgba(107,87,224,0.32), rgba(107,87,224,0))" }}>
      <div style={{ position: "absolute", left: 40, top: 40 }}>
        <Scribble w={620} lines={22} lineH={44} progress={22} seed="cover-river" width={3.6} />
      </div>
    </div>
    <Sheet x={0} y={0} w={760} h={980} rot={-2.5}>
      <div style={{ position: "absolute", left: 76, top: 30, right: 34, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, color: K.inkSoft }}>绝密★启用前</span>
        <span style={{ fontSize: 34, fontWeight: 900 }}>用 AI 做事 · 试卷</span>
      </div>
      <div style={{ position: "absolute", left: 76, right: 34, top: 92, borderTop: `3px double ${K.ink}` }} />
      <div style={{ position: "absolute", left: 60, right: 22, top: 112, height: 210, ...GOLD }} />
      <Section n="一" title="出题" who="人" size={58} style={{ position: "absolute", left: 86, top: 140 }} />
      <div style={{ position: "absolute", left: 104, top: 232, fontSize: 30, lineHeight: 1.5 }}>要做成什么？怎样才算做好？</div>
      <Section n="二" title="答题" who="AI" size={40} style={{ position: "absolute", left: 86, top: 350 }} />
      <div style={{ position: "absolute", left: 96, top: 418 }}>
        <Scribble w={600} lines={7} lineH={40} progress={7} seed="cover-answer" width={3} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 22, top: 716, height: 236, ...GOLD }} />
      <Section n="三" title="阅卷" who="人" size={58} style={{ position: "absolute", left: 86, top: 744 }} />
      <div style={{ position: "absolute", left: 470, top: 826, width: 200, height: 104, border: `3px solid ${K.ink}` }}>
        <svg width="150" height="150" viewBox="0 0 100 100" style={{ position: "absolute", left: 30, top: -40, overflow: "visible" }}>
          <path d="M8 54 C 20 62, 30 74, 38 86 C 52 58, 70 30, 96 8" fill="none" stroke={K.green} strokeWidth={10} strokeLinecap="round" />
        </svg>
      </div>
    </Sheet>
    <GradingPen style={{ position: "absolute", left: 640, top: 700, transform: "scale(1.5) rotate(10deg)" }} />
  </div>
);

const Mark: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ backgroundImage: `linear-gradient(transparent 56%, ${K.gold} 56%, ${K.gold} 94%, transparent 94%)` }}>{children}</span>
);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.desk, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at ${tall ? "60% 70%" : "70% 55%"}, ${K.deskHi} 0%, ${K.desk} 55%, ${K.deskLo} 100%)` }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "300px 300px", opacity: 0.09, mixBlendMode: "multiply" }} />
      <div style={{ position: "absolute", left: tall ? 250 : 1060, top: tall ? 640 : bar + 40, transform: `scale(${tall ? 0.9 : 0.98})`, transformOrigin: "0 0" }}>
        <Picture />
      </div>
      <div
        style={{
          position: "absolute",
          left: tall ? 76 : 96,
          top: tall ? bar + 70 : bar + 270,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: tall ? 136 : 128,
          lineHeight: 1.18,
          color: K.ink,
          letterSpacing: -2,
          whiteSpace: "nowrap",
        }}
      >
        {tall ? (
          <>
            最会用
            <br />
            AI 的人，
            <br />
            只做<Mark>两件事</Mark>
          </>
        ) : (
          <>
            最会用 AI 的人，
            <br />
            只做<Mark>两件事</Mark>
          </>
        )}
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
