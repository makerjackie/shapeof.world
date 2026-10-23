import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { Scribble, Who } from "../art/paper";
import { FountainPen, GradingPen } from "../art/props";
import { Cam, EBACK, EIO, EO, progOf, Say, Sfx, useBeat } from "../kit";
import { K, NUM, SANS, SERIF } from "../theme";
import { ExamSheet, PH, PW, PX, PY } from "./open";
import { Answer } from "./panorama";

// ---------- S6 · the finding (B part 2 from its bar 4, the song's biggest entry, after a bar of silence) ----------
// A mountain of answered sheets; one grading box lights up, empty.

const HEAP = 70;
const heap = Array.from({ length: HEAP }, (_, i) => ({
  x: -300 + random(`hx${i}`) * 2500,
  y: -260 + random(`hy${i}`) * 1500,
  r: (random(`hr${i}`) - 0.5) * 50,
}));
const HX = 1080;
const HY = 470;
const HS = 2.3;

export const Finding: React.FC = () => {
  const b = useBeat();
  const glow = progOf(b, 0, 0.5, EO);
  const pulse = 0.85 + 0.15 * Math.sin(b * Math.PI * 0.5);
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 960, y: 540, s: 1 },
          { b: 12, x: 1010, y: 560, s: 1.08 },
        ]}
      >
        {heap.map((h, i) => (
          <div key={i} style={{ position: "absolute", left: h.x, top: h.y, transform: `rotate(${h.r}deg) scale(1.4)` }}>
            <Answer i={300 + i} />
          </div>
        ))}
        <div style={{ position: "absolute", inset: -400, background: K.desk, opacity: 0.45 }} />
        <div style={{ position: "absolute", left: HX, top: HY, transform: `scale(${HS}) rotate(-2deg)`, transformOrigin: "0 0" }}>
          <Answer i={999} />
          <div style={{ position: "absolute", left: 210, top: 134, width: 82, height: 58, borderRadius: 8, border: `4px solid ${K.gold}`, boxShadow: `0 0 ${18 * pulse}px ${K.gold}, inset 0 0 ${10 * pulse}px ${K.gold}`, opacity: glow }} />
        </div>
      </Cam>
      <Say at={0.5} out={11.6} y={150} size={104} lines={[["答题，已经不缺了。"], [{ t: "缺的是阅卷", k: true }, "。"]]} />
      <Sfx at={0} id="sfx-impact-05" vol={0.8} />
    </AbsoluteFill>
  );
};

// ---------- S7 · us (24 beats) ----------
// Most people ask for answers. A chat on the left: a student. An exam paper on the right: an examiner.

const ASKS = ["这句话什么意思？", "帮我写个请假条", "这道题怎么做？", "明天穿什么？"];

const Phone: React.FC<{ b: number }> = ({ b }) => (
  <div style={{ width: 430, height: 780, borderRadius: 52, background: K.ink, padding: 16, boxSizing: "border-box", boxShadow: "0 24px 50px rgba(60,40,15,0.3)" }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 38, background: K.paperHi, overflow: "hidden", padding: "40px 22px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
      {ASKS.map((q, i) => {
        const p = progOf(b, 1 + i * 1.4, 0.5, EBACK);
        const a = progOf(b, 1.6 + i * 1.4, 0.5, EO);
        return (
          <React.Fragment key={q}>
            <div style={{ alignSelf: "flex-end", opacity: Math.min(1, p * 2), transform: `scale(${0.7 + 0.3 * p})`, transformOrigin: "100% 50%", background: K.ink, color: K.paper, fontFamily: SANS, fontWeight: 700, fontSize: 24, padding: "10px 16px", borderRadius: "18px 18px 4px 18px" }}>{q}</div>
            <div style={{ alignSelf: "flex-start", opacity: a, width: 250 * a, height: 54, background: "#efeafd", border: `2px solid ${K.ai}`, borderRadius: "18px 18px 18px 4px", padding: "12px 14px", boxSizing: "border-box", overflow: "hidden" }}>
              <div style={{ height: 5, width: "90%", background: K.ai, opacity: 0.6, borderRadius: 3 }} />
              <div style={{ height: 5, width: "60%", background: K.ai, opacity: 0.6, borderRadius: 3, marginTop: 10 }} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const Role: React.FC<{ t: string; gold?: boolean; p: number }> = ({ t, gold = false, p }) => (
  <span style={{ display: "inline-block", whiteSpace: "nowrap", fontFamily: SERIF, fontWeight: 900, fontSize: 52, color: K.ink, padding: "2px 22px", background: gold ? K.gold : K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, opacity: p, transform: `scale(${0.6 + 0.4 * p}) rotate(-3deg)`, boxShadow: "0 10px 20px rgba(60,40,15,0.18)" }}>{t}</span>
);

export const Us: React.FC = () => {
  const b = useBeat();
  const split = progOf(b, 9.2, 1.2, EIO);
  const exam = progOf(b, 13.6, 1, EO);
  const student = progOf(b, 12, 0.5, EBACK);
  const examiner = progOf(b, 17.4, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1180 - 820 * split, top: 230 + 200 * split, transform: `scale(${1 - 0.25 * split})`, transformOrigin: "0 0" }}>
        <Phone b={b} />
        <div style={{ position: "absolute", left: 120, top: 690 }}>
          <Role t="学生" p={student} />
        </div>
      </div>
      {exam > 0 ? (
        <div style={{ position: "absolute", left: 1060 + (1 - exam) * 300, top: 410, opacity: Math.min(1, exam * 2), transform: "scale(0.62) rotate(1.5deg)", transformOrigin: "0 0" }}>
          <ExamSheet written={8} title={1} tick={progOf(b, 18.4, 0.6, EO)} under={progOf(b, 16, 1.4, EIO)} glow={progOf(b, 17.4, 0.8, EO)} dimAnswer={0} />
          <div style={{ position: "absolute", left: 470, top: 40 }}>
            <div style={{ transform: "scale(1.6)", transformOrigin: "0 0" }}>
              <Role t="考官" gold p={examiner} />
            </div>
          </div>
        </div>
      ) : null}
      {b > 1 && split < 1 ? (
        <div style={{ position: "absolute", left: 96, top: 760, opacity: progOf(b, 3, 0.6) * (1 - split), background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, padding: "14px 24px", boxShadow: "0 14px 28px rgba(60,40,15,0.18)" }}>
          <div style={{ fontFamily: NUM, fontWeight: 300, fontSize: 92, color: K.ink, lineHeight: 1 }}>
            76<span style={{ fontSize: 50 }}>%</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: K.ink, marginTop: 6 }}>用 AI 的人，拿它回答问题</div>
        </div>
      ) : null}

      <Say at={1} out={8.8} y={140} lines={[["可大多数人，"], ["还在", { t: "问 AI 要答案", k: true }, "。"]]} src="中国 7 亿多人用过生成式 AI，其中 76% 拿它回答问题 · CNNIC 2026-10-08" />
      <Say at={9.6} out={23} y={140} lines={[["问 AI 要答案，你是", { t: "学生", k: true }, "；"], ["给 AI 出题、阅卷，你是", { t: "考官", k: true }, "。"]]} />

      {ASKS.map((q, i) => (
        <Sfx key={q} at={1 + i * 1.4} id="sfx-ui-01" vol={0.2} rate={1.2} />
      ))}
      <Sfx at={12} id="sfx-impact-06" vol={0.35} />
      <Sfx at={13.6} id="sfx-foley-02" vol={0.3} />
      <Sfx at={17.4} id="sfx-impact-06" vol={0.45} />
    </AbsoluteFill>
  );
};

// ---------- S8 · what's left (the 升华, 48 beats; the end card lands on B's wind-down) ----------

const GRADES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三", "高一", "高二", "高三"];

const Stacks: React.FC<{ b: number; out: number }> = ({ b, out }) => (
  <div style={{ position: "absolute", left: 150, top: 0, width: 1700, height: 1080, opacity: 1 - out, transform: `translateY(${out * 60}px)` }}>
    {GRADES.map((g, i) => {
      const p = progOf(b, 1 + i * 0.45, 0.6, EBACK);
      const n = 4 + i * 2.2;
      const h = n * 16 * p;
      return (
        <div key={g} style={{ position: "absolute", left: i * 136, top: 960 - h, width: 120, height: h }}>
          {Array.from({ length: Math.round(n * p) }, (_, j) => (
            <div key={j} style={{ position: "absolute", left: (random(`st${i}-${j}`) - 0.5) * 8, bottom: j * 16, width: 120, height: 14, background: K.paperHi, border: `1.5px solid ${K.ink}`, borderRadius: 1, boxSizing: "border-box" }} />
          ))}
          <div style={{ position: "absolute", left: 0, top: h + 14, width: 120, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 24, color: K.ink, opacity: p }}>{g}</div>
        </div>
      );
    })}
  </div>
);

const Medal: React.FC<{ p: number; out: number }> = ({ p, out }) => (
  <div style={{ position: "absolute", left: 1040, top: 330, width: 700, opacity: Math.min(1, p * 2) * (1 - out), transform: `translateY(${(1 - p) * 60}px) rotate(-2deg)`, background: K.paperHi, border: `3px solid ${K.ink}`, borderRadius: 10, padding: "30px 36px", boxShadow: "0 22px 44px rgba(60,40,15,0.24)" }}>
    <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 36, color: K.ink }}>国际数学奥林匹克 · 2025</div>
    <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 20 }}>
      <div style={{ width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #ffe7a3, ${K.gold} 55%, #c99a2e)`, border: `4px solid ${K.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: K.ink, transform: `rotate(${(1 - p) * -40}deg)` }}>金牌</div>
      <div>
        <div style={{ fontFamily: NUM, fontWeight: 300, fontSize: 110, color: K.ink, lineHeight: 1 }}>
          35<span style={{ fontSize: 56, opacity: 0.6 }}> / 42</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: K.ink }}>
          答题者 <Who who="AI" size={22} />
        </div>
      </div>
    </div>
  </div>
);

// The answer column overflowing: an endless violet stream of AI handwriting running off the desk.
const River: React.FC<{ b: number; grow: number }> = ({ b, grow }) => {
  const shift = (b * 42) % 1600;
  return (
    <div
      style={{
        position: "absolute",
        left: PX - 1700,
        top: PY + 432,
        width: 1700,
        height: 300,
        overflow: "hidden",
        clipPath: `inset(0 0 0 ${(1 - grow) * 100}%)`,
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 35%)",
        maskImage: "linear-gradient(90deg, transparent 0%, #000 35%)",
      }}
    >
      <div style={{ position: "absolute", left: shift - 1600, top: 0, display: "flex" }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ width: 1600 }}>
            <Scribble w={1580} lines={7} lineH={40} progress={7} seed={`river${k % 2}`} width={2.6} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Coda: React.FC = () => {
  const b = useBeat();
  const stacksOut = progOf(b, 17.2, 1, EIO);
  const medal = progOf(b, 9.2, 1, EO);
  const medalOut = progOf(b, 17.2, 1, EIO);
  const sheet = progOf(b, 17.8, 1.2, EO);
  const dim = progOf(b, 19.8, 1.2, EIO);
  const glow = progOf(b, 24, 1, EO);
  const under = progOf(b, 26, 2.2, EIO);
  const tick = progOf(b, 29.2, 0.6, EO);
  const grow = progOf(b, 32, 4, EIO);
  const penX = interpolate(under, [0, 0.5, 0.5001, 1], [0, 210, 0, 240]);
  const penRow = under < 0.5 ? 0 : 48;
  return (
    <AbsoluteFill>
      <Cam
        keys={[
          { b: 0, x: 960, y: 540, s: 1 },
          { b: 16.4, x: 960, y: 540, s: 1 },
          { b: 18.2, x: 880, y: 540, s: 1 },
          { b: 31.6, x: 885, y: 536, s: 1 },
          { b: 34, x: 650, y: 560, s: 0.78 },
          { b: 48, x: 620, y: 566, s: 0.78 },
        ]}
      >
        <Stacks b={b} out={stacksOut} />
        {sheet > 0 ? (
          <>
            <River b={b} grow={grow} />
            <div style={{ position: "absolute", left: PX, top: PY + (1 - sheet) * 1100, width: PW, height: PH, transform: `rotate(${1.5 - (1 - sheet) * 6}deg)` }}>
              <ExamSheet written={8} title={1} tick={tick} under={under} glow={glow} dimAnswer={dim} />
            </div>
            {under > 0 && under < 1 ? (
              <FountainPen style={{ position: "absolute", left: PX - 146 + penX, top: PY + 321 + penRow, transform: "rotate(-38deg)" }} />
            ) : null}
            {tick > 0 && b < 31.6 ? <GradingPen style={{ position: "absolute", left: 1590 + tick * 60, top: 690 - Math.sin(tick * Math.PI) * 50, opacity: 1 - progOf(b, 30.8, 0.8) }} /> : null}
          </>
        ) : null}
      </Cam>
      <Medal p={medal} out={medalOut} />

      <Say at={1} out={8.4} y={140} lines={[["我们上了十几年学，"], ["练的都是", { t: "答题", k: true }, "。"]]} />
      <Say at={9} out={17.6} y={140} lines={[["最难的答题考试，"], ["AI 也拿到了", { t: "金牌分数", k: true }, "。"]]} src="国际数学奥林匹克 2025 · Google DeepMind 的 Gemini Deep Think · IMO 协调员官方评分" />
      <Say at={18.2} out={23.8} y={140} lines={[["剩下的，是另外", { t: "两门课", k: true }, "："]]} />
      <Say at={24.4} out={32.2} y={140} lines={[[{ t: "出一道值得答的题", k: true }, "，"], [{ t: "认出哪份答对了", k: true }, "。"]]} />
      <Say at={33} out={47.4} y={140} lines={[["答案会越来越便宜。"], [{ t: "会出题、会阅卷的人", k: true }, "，不会。"]]} />

      {/* sound */}
      {GRADES.map((g, i) => (
        <Sfx key={g} at={1 + i * 0.45} id="sfx-foley-02" vol={0.16} rate={0.9 + i * 0.03} />
      ))}
      <Sfx at={9.4} id="sfx-impact-03" vol={0.45} />
      <Sfx at={17.8} id="sfx-transition-03" vol={0.35} />
      <Sfx at={19.8} id="sfx-impact-06" vol={0.3} rate={0.9} />
      <Sfx at={24} id="sfx-impact-06" vol={0.45} />
      {[26.2, 26.8, 27.4, 28].map((t) => (
        <Sfx key={t} at={t} id="sfx-foley-07" vol={0.4} rate={0.8} />
      ))}
      <Sfx at={29.2} id="sfx-foley-07" vol={0.55} />
    </AbsoluteFill>
  );
};

// ---------- End card: 世界的形状 with the round ball, MakerJackie at the bottom (films/DIRECTOR.md 硬规则 1) ----------

export const EndCard: React.FC = () => {
  const b = useBeat();
  const ball = progOf(b, 0, 0.8, EBACK);
  const word = progOf(b, 0.5, 0.8, EO);
  const name = progOf(b, 1.2, 0.8, EO);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, transform: "translateY(-20px)" }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 150, height: 150, transform: `scale(${ball}) rotate(${(1 - ball) * -90}deg)`, opacity: Math.min(1, ball * 2) }} />
        <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 96, letterSpacing: "0.08em", color: K.ink, opacity: word, transform: `translateX(${(1 - word) * -20}px)` }}>世界的形状</span>
      </div>
      <div style={{ position: "absolute", bottom: 90, fontFamily: SANS, fontWeight: 500, fontSize: 28, letterSpacing: "0.06em", color: K.ink, opacity: 0.7 * name }}>MakerJackie</div>
      <Sfx at={0} id="sfx-impact-01" vol={0.3} rate={1.2} />
    </AbsoluteFill>
  );
};
