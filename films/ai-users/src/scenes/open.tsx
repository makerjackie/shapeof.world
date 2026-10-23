import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { FountainPen, GradingPen } from "../art/props";
import { Print, Scribble, Section, Sheet, Tick } from "../art/paper";
import { Cam, CL, EBACK, EIN, EIO, EO, progOf, Say, Sfx, useBeat } from "../kit";
import { K, SERIF } from "../theme";

// The exam paper of the opening: 760 × 960 at (1010, 60) in the world.
export const PX = 1010;
export const PY = 60;
export const PW = 760;
export const PH = 960;

const TITLE = "最会用 AI 的人，在用 AI 干什么";

// A hand-written ink line under the questions: the question-setter's own mark.
const Underline: React.FC<{ p: number; y: number; w: number }> = ({ p, y, w }) => {
  const len = w * 1.08;
  return (
    <svg width={w + 20} height={20} style={{ position: "absolute", left: 92, top: y, overflow: "visible" }}>
      <path
        d={`M4 10 C ${w * 0.2} 4, ${w * 0.35} 16, ${w * 0.55} 9 S ${w * 0.85} 5, ${w} 11`}
        fill="none"
        stroke={K.ink}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - p)}
      />
    </svg>
  );
};

// The sheet itself, with what is filled in so far.
export const ExamSheet: React.FC<{
  written: number;
  title: number;
  tick: number;
  under?: number;
  dimAnswer?: number;
  glow?: number;
  glowG?: number; // the 阅卷 box alone (the finding); defaults to `glow`
}> = ({ written, title, tick, under = 0, dimAnswer = 0, glow = 0, glowG }) => (
  <Sheet x={0} y={0} w={PW} h={PH} shadow={1}>
    <div style={{ position: "absolute", left: 72, top: 28, right: 34, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 19, color: K.inkSoft }}>绝密★启用前</span>
      <span style={{ width: 92, height: 54, border: `2px solid ${K.ink}`, display: "flex", alignItems: "flex-start", padding: 4, boxSizing: "border-box", fontSize: 14 }}>得分</span>
    </div>
    <div style={{ position: "absolute", left: 72, right: 34, top: 92, height: 54, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `3px double ${K.ink}` }}>
      {title > 0 ? (
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 34, color: K.ink, opacity: Math.min(1, title * 2), transform: `scale(${1.3 - 0.3 * title})`, whiteSpace: "nowrap" }}>{TITLE}</span>
      ) : (
        <span style={{ width: 460, borderBottom: `2px solid ${K.inkFaint}`, transform: "translateY(10px)" }} />
      )}
    </div>
    <div style={{ position: "absolute", left: 50, right: 14, top: 160, height: 200, borderRadius: 12, border: `6px solid ${K.gold}`, opacity: glow, boxShadow: `0 0 34px ${K.gold}` }} />
    <Section n="一" title="出题" who="人" style={{ position: "absolute", left: 72, top: 176 }} />
    <Print size={28} style={{ position: "absolute", left: 94, top: 232 }}>1. 要做成什么？</Print>
    <Print size={28} style={{ position: "absolute", left: 94, top: 280 }}>2. 怎样才算做好？</Print>
    <Underline p={interpolate(under, [0, 0.5], [0, 1], CL)} y={272} w={210} />
    <Underline p={interpolate(under, [0.5, 1], [0, 1], CL)} y={320} w={240} />
    <Section n="二" title="答题" who="AI" style={{ position: "absolute", left: 72, top: 372 }} />
    <div style={{ position: "absolute", left: 84, top: 428, opacity: 1 - 0.75 * dimAnswer }}>
      <Scribble w={610} lines={8} lineH={38} progress={written} seed="claim" width={2.8} />
    </div>
    <div style={{ position: "absolute", left: 50, right: 14, top: 730, height: 214, borderRadius: 12, border: `6px solid ${K.gold}`, opacity: glowG ?? glow, boxShadow: `0 0 34px ${K.gold}` }} />
    <Section n="三" title="阅卷" who="人" style={{ position: "absolute", left: 72, top: 748 }} />
    <Print size={28} style={{ position: "absolute", left: 94, top: 806 }}>对不对？好不好？</Print>
    <div style={{ position: "absolute", left: 500, top: 786, width: 200, height: 124, border: `2px solid ${K.ink}` }}>
      {tick > 0 ? <Tick at={-99} size={120} style={{ position: "absolute", left: 40, top: 2, opacity: Math.min(1, tick * 3) }} /> : null}
    </div>
  </Sheet>
);

// A continuation page of the answer, all AI ink.
const AnswerPage: React.FC<{ seed: string }> = ({ seed }) => (
  <Sheet x={0} y={0} w={PW} h={PH} shadow={0.7} seal={false}>
    <div style={{ position: "absolute", left: 60, top: 34, fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: K.inkSoft }}>答题纸（续）</div>
    <div style={{ position: "absolute", left: 60, top: 96 }}>
      <Scribble w={630} lines={20} lineH={40} progress={20} seed={seed} width={2.6} />
    </div>
  </Sheet>
);

// ---------- S0 · the hook and the claim (A bars 0–7) ----------

export const Open: React.FC = () => {
  const b = useBeat();
  // The sheet falls from above and hits the desk on beat 1.
  const fall = interpolate(b, [-1.1, 1], [0, 1], { ...CL, easing: EIN });
  const land = b - 1;
  const squash = land >= 0 && land < 0.3 ? 0.03 * (1 - land / 0.3) : 0;
  const y = (1 - fall) * -1250;
  const rot = 1.5 + (1 - fall) * 9;
  const ring = land >= 0 && land < 0.8 ? land / 0.8 : -1;
  // AI writes the answer column by itself, fast; then keeps going on two more pages.
  const written = interpolate(b, [1.1, 3.9], [0, 8], CL);
  const page1 = progOf(b, 5, 0.9, EBACK);
  const page2 = progOf(b, 7, 0.9, EBACK);
  // The question-setter's pen underlines the questions; the grader's pen ticks.
  const under = progOf(b, 12.6, 2.2, EIO);
  const fpLift = Math.sin(Math.PI * progOf(b, 12.2, 3, EIO));
  const penIn = progOf(b, 15, 0.8, EO);
  const tick = progOf(b, 16, 0.6, EO);
  const penOut = progOf(b, 17.2, 0.9, EIO);
  // Only two things: the title prints, the human columns light up, the answer column steps back.
  const title = progOf(b, 20, 0.5, EBACK);
  const glow = progOf(b, 22, 1.2, EO);
  const dim = progOf(b, 22, 1.2, EO);
  const penX = interpolate(under, [0, 0.5, 0.5001, 1], [0, 210, 0, 240]);
  const penRow = under < 0.5 ? 0 : 48;
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: -2, x: 1380, y: 520, s: 1.32 },
          { b: 3.4, x: 1380, y: 520, s: 1.32 },
          { b: 5.2, x: 960, y: 560, s: 1 },
          { b: 11, x: 975, y: 540, s: 1 },
          { b: 19.5, x: 960, y: 540, s: 1 },
          { b: 21.5, x: 990, y: 515, s: 1.04 },
          { b: 27.5, x: 995, y: 512, s: 1.045 },
        ]}
      >
        {ring >= 0 ? (
          <div style={{ position: "absolute", left: PX - 60 * ring, top: PY - 40 * ring, width: PW + 120 * ring, height: PH + 80 * ring, borderRadius: 24, border: `${4 * (1 - ring) + 1}px solid rgba(25,35,31,${0.25 * (1 - ring)})` }} />
        ) : null}
        {page2 > 0 ? (
          <div style={{ position: "absolute", left: PX + 110 * page2, top: PY - 70 * page2, width: PW, height: PH, transform: `rotate(${1.5 + 9 * page2}deg)`, opacity: Math.min(1, page2 * 3) }}>
            <AnswerPage seed="cont2" />
          </div>
        ) : null}
        {page1 > 0 ? (
          <div style={{ position: "absolute", left: PX + 60 * page1, top: PY - 38 * page1, width: PW, height: PH, transform: `rotate(${1.5 + 5 * page1}deg)`, opacity: Math.min(1, page1 * 3) }}>
            <AnswerPage seed="cont1" />
          </div>
        ) : null}
        <div style={{ position: "absolute", left: PX, top: PY + y, width: PW, height: PH, transform: `rotate(${rot}deg) scale(${1 + (1 - fall) * 0.08 - squash})` }}>
          <ExamSheet written={written} title={title} tick={tick} under={under} glow={glow} dimAnswer={dim} />
        </div>
        {/* the fountain pen rests by the questions, lifts to underline them, and lies down again */}
        <FountainPen
          style={{
            position: "absolute",
            left: under > 0 && under < 1 ? PX - 146 + penX : 1500,
            top: under > 0 && under < 1 ? PY + 321 + penRow : 230 - fpLift * 30,
            transform: under > 0 && under < 1 ? "rotate(-38deg)" : `rotate(${-28 - fpLift * 6}deg)`,
          }}
        />
        {penIn > 0 && penOut < 1 ? (
          <GradingPen
            style={{
              position: "absolute",
              left: 1530 + (1 - penIn) * 420 + penOut * 320 + (tick > 0 && tick < 1 ? tick * 60 : tick >= 1 ? 60 : 0),
              top: 690 + (1 - penIn) * 140 - penOut * 260 - (tick > 0 && tick < 1 ? Math.sin(tick * Math.PI) * 50 : 0),
              opacity: Math.min(penIn * 2, 1 - penOut),
            }}
          />
        ) : null}
      </Cam>

      <Say at={4} out={11} y={430} lines={[["这张卷子，是 ", { t: "AI 答", k: true }, "的。"]]} />
      <Say at={12} out={19.5} y={430} lines={[[{ t: "出题", k: true }, "和", { t: "阅卷", k: true }, "的，是人。"]]} />
      <Say at={20} out={27.6} y={380} lines={[["最会用 AI 的人，"], ["只做", { t: "这两件事", k: true }, "。"]]} />

      {/* sound: the drop, the AI writing, the extra pages, the pens, the title */}
      <Sfx at={1} id="sfx-impact-01" vol={1} />
      <Sfx at={1} id="sfx-foley-01" vol={0.55} />
      {[1.15, 1.45, 1.75, 2.05, 2.35, 2.65, 2.95, 3.25, 3.55].map((t, i) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.3} rate={0.95 + (i % 3) * 0.06} />
      ))}
      <Sfx at={4} id="sfx-impact-06" vol={0.5} />
      <Sfx at={5} id="sfx-foley-16" vol={0.35} />
      <Sfx at={7} id="sfx-foley-16" vol={0.35} rate={1.1} />
      {[12.7, 13.2, 13.9, 14.4].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.45} rate={0.8} />
      ))}
      <Sfx at={15} id="sfx-foley-02" vol={0.3} />
      <Sfx at={16} id="sfx-foley-07" vol={0.6} />
      <Sfx at={16.3} id="sfx-impact-06" vol={0.5} />
      <Sfx at={20} id="sfx-impact-01" vol={0.6} />
      <Sfx at={20.05} id="sfx-impact-06" vol={0.45} />
      <Sfx at={22} id="sfx-impact-06" vol={0.3} rate={0.9} />
    </AbsoluteFill>
  );
};

