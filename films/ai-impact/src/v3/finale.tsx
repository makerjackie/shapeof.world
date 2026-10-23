import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, SERIF } from "../theme";
import { Door, Person } from "../v2/art";
import { ChatBox } from "./art";
import { DOOR } from "./ch1";
import { doorMarks } from "./ch4";
import { AI_MARKS, Frame, Mark, Marks } from "./door";
import { Backdrop, C, EBACK, EIO, EO, lerp, Line, Lines, pr, Src, useT } from "./kit";
import { BAR, BEAT, bar } from "./timing";

// 06 未知 (片中 80–88), 升华 (88–100), 收尾 (100–108).

export const FIN = {
  s41: ["再过四年，它也许能干完", "人一个月的活。"],
  s42: ["它哪天全面超过人？", "各家说法差了 15 年。"],
  s43: ["能确定的是：", "它会更强，也更能吃。"],
  s44: "那我们呢？",
  s45: ["从 4 分钟到 17 小时，", "它长了 260 倍。"],
  s46: ["一个人要长 22 年，", "才走到第一份工作门前。"],
  s47: ["AI 四个月长一倍。", "人，还是要一年一年地长大。"],
  s48: ["可那扇变窄的门，", "正是新人变老手的地方。"],
  s50: "它改变了钱、芯片和电。",
  s51: "也改变了，一个人长大的路。",
} as const;

// ── 41 · bars 80–82: a dashed mark above the frame: a month of work ──
export const MONTH_AT = bar(80) + 2 * BEAT;
export const Month: React.FC = () => {
  const t = useT();
  const b0 = bar(80);
  const marks: Mark[] = [...doorMarks(6), { min: AI_MARKS.month, label: "人干一个月的活", sub: "METR 按趋势推算：2028–2031", at: MONTH_AT, dashed: true }];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[62, 30]} strength={0.12} />
      <Frame x={DOOR.x} floor={DOOR.floor} w={DOOR.w} h={DOOR.h} grow={1} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={DOOR.x + DOOR.w / 2 - 20} x2={DOOR.x + DOOR.w / 2 - 20} y1={DOOR.floor - DOOR.h} y2={lerp(DOOR.floor - DOOR.h, 135, pr(t, b0 + 0.3, 0.8, EIO))} stroke={C.cyan} strokeWidth={3} strokeDasharray="8 10" opacity={0.7} />
      </svg>
      <Marks t={t} x={DOOR.x} floor={DOOR.floor} w={DOOR.w} labelSize={34} marks={marks} />
      <Lines at={b0} a={FIN.s41[0]} b={FIN.s41[1]} out={bar(82) - 0.05} />
      <Src at={b0 + 0.3}>METR 论文（2026-07 版）按趋势外推：AI 有一半把握独自做完"一个月的活"（167 个工作小时），在 2028 年中到 2031 年中 · 预测</Src>
    </AbsoluteFill>
  );
};

// ── 42 · bars 82–84: the timeline of guesses ──
const GUESSES: [number, string, string, boolean][] = [
  [2026.9, "Altman", "OpenAI CEO · 今年底", true],
  [2027.6, "Amodei", "Anthropic CEO · 1–2 年", true],
  [2030, "Hassabis", "DeepMind CEO · 2030 前后", true],
  [2033, "Metaculus", "预测社区 · 约 2033", false],
  [2042, "AI 研究者问卷", "1,580 人 · 2042", false],
];
export const Guesses: React.FC = () => {
  const t = useT();
  const b0 = bar(82);
  const X0 = 300;
  const X1 = 1700;
  const px = (y: number) => X0 + ((y - 2026) / (2044 - 2026)) * (X1 - X0);
  const draw = pr(t, b0 + 0.1, 0.6, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[55, 60]} strength={0.1} />
      <div style={{ position: "absolute", left: X0, top: 760, width: (X1 - X0) * draw, height: 4, background: "rgba(244,240,232,0.4)" }} />
      {[2026, 2030, 2035, 2040].map((y) => (
        <div key={y} style={{ position: "absolute", left: px(y), top: 780, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.muted, opacity: draw }}>
          {y}
        </div>
      ))}
      {GUESSES.map(([y, who, note, seller], i) => {
        const p = pr(t, b0 + 0.4 + i * 0.45, 0.4, EBACK);
        if (p <= 0) return null;
        const up = i % 2 === 0;
        return (
          <React.Fragment key={who}>
            <div style={{ position: "absolute", left: px(y) - 2, top: up ? 560 : 762, width: 4, height: 198 * p, background: seller ? C.gold : C.cyan, transformOrigin: "top", opacity: 0.7 }} />
            <div style={{ position: "absolute", left: px(y), top: up ? 470 : 870, transform: `translateX(-50%) scale(${p})`, padding: "10px 18px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: `1px solid ${seller ? C.gold : C.cyan}`, fontFamily: FONT, textAlign: "center", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.fg }}>{who}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.muted }}>{note}</div>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: X0, top: 960, display: "flex", gap: 40, fontFamily: FONT, fontSize: 22, fontWeight: 800, opacity: pr(t, b0 + 2.6, 0.4) }}>
        <span style={{ color: C.gold }}>■ 卖 AI 的公司</span>
        <span style={{ color: C.cyan }}>■ 预测社区和研究者</span>
      </div>
      <Lines at={b0} a={FIN.s42[0]} b={FIN.s42[1]} out={bar(84) - 0.05} />
      <Src at={b0 + 0.3}>各人对"全面超过人"的定义不同 · Altman（TIME，2026-08）· Amodei（2026-01）· Hassabis（2026-05）· Metaculus 社区（2026）· AI Impacts 研究者问卷（调查 2024-12）· 本片作者 Claude 是 Anthropic 的模型</Src>
    </AbsoluteFill>
  );
};

// ── 43 · bars 84–86: stronger, and hungrier ──
export const Hungrier: React.FC = () => {
  const t = useT();
  const b0 = bar(84);
  const grow = pr(t, b0 + 0.3, BAR * 1.2, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[62, 60]} strength={0.12} />
      <div style={{ position: "absolute", left: 1300 - lerp(220, 380, grow), top: 900 - lerp(260, 470, grow), width: lerp(440, 760, grow), height: lerp(260, 470, grow), borderRadius: 26, border: `2px solid rgba(77,212,255,${0.4 + 0.4 * grow})`, background: "rgba(77,212,255,0.05)" }}>
        <div style={{ position: "absolute", left: 24, top: 16, fontFamily: FONT, fontSize: 28, fontWeight: 900, color: C.fg, whiteSpace: "nowrap" }}>AI 数据中心</div>
      </div>
      {[
        ["2027", "内存更紧"],
        ["2028", "内存更紧"],
      ].map(([y, s], i) => {
        const p = pr(t, b0 + 0.6 + i * BEAT * 2, 0.4, EBACK);
        return (
          <div key={y} style={{ position: "absolute", left: 140 + i * 280, top: 520, transform: `scale(${p}) rotate(${-4 + i * 6}deg)`, opacity: Math.min(1, p), padding: "20px 26px", borderRadius: 18, background: "#ece6da", color: C.ink, fontFamily: FONT, textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 40, fontWeight: 900 }}>{y}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#c0392b" }}>{s}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 140, top: 760, fontFamily: FONT, opacity: pr(t, b0 + 1.6, 0.4), whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>四家大厂投入，2027 年预计</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.gold }}>超过 1 万亿美元 / 年</div>
      </div>
      <Lines at={b0} a={FIN.s43[0]} b={FIN.s43[1]} out={bar(86) - 0.05} />
      <Src at={b0 + 0.3}>美光（美国内存大厂）：2027、2028 年内存比今年更紧（2026 财年四季度财报，自报）· 美银、Evercore 预测四家大厂 2027 年资本开支超过 1 万亿美元</Src>
    </AbsoluteFill>
  );
};

// ── 44 · bars 86–88: and us? ──
export const Us: React.FC = () => {
  const t = useT();
  const b0 = bar(86);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[66, 60]} strength={0.06} />
      <div style={{ opacity: 0.55 }}>
        <Frame x={DOOR.x - 300} floor={DOOR.floor} w={DOOR.w} h={DOOR.h} grow={1} />
        <Marks t={t} x={DOOR.x - 300} floor={DOOR.floor} w={DOOR.w} labelSize={0.01} marks={doorMarks(6)} />
      </div>
      <div style={{ position: "absolute", left: DOOR.x + 160, top: DOOR.floor - DOOR.h, width: DOOR.w, height: DOOR.h, border: "2px dashed rgba(255,209,102,0.25)", borderBottom: "none", opacity: pr(t, b0 + 0.8, 0.8) }} />
      <Line at={b0 + 0.3} text={FIN.s44} size={110} x={120} y={150} out={bar(88) - 0.1} />
    </AbsoluteFill>
  );
};

// ── 45–49 · bars 88–100: two door frames ──
export const AI_FRAME = { x: 560, floor: 960, w: 340, h: 600 };
export const HU_FRAME = { x: 1180, floor: 960, w: 340, h: 600 };
// both frames reach the same height: the AI in 3 years (doubling scale), a person in 22 years (one notch a year)
const aiY = (m: Mark) => 100 + 52.2 * Math.log2(m.min / 4);
const HUMAN_AGES = Array.from({ length: 20 }, (_, i) => i + 3); // 3 … 22
const humanY = (m: Mark) => 100 + (m.min - 3) * 22; // one notch a year
export const HUMAN_START = bar(90) + 0.3;
export const humanAt = (age: number) => HUMAN_START + (age - 3) * 0.17;
export const FIRST_JOB = { x: 1600, w: 120, h: 420 };
export const TwoFrames: React.FC = () => {
  const t = useT();
  const b45 = bar(88);
  const b47 = bar(93);
  const b48 = bar(96);
  const b49 = bar(98);
  const dimForQuote = pr(t, b47 - 0.1, 0.4, EIO) * (1 - pr(t, b48 - 0.2, 0.4, EIO));
  const aiMarks: Mark[] = doorMarks(6).map((m) => ({ ...m, at: b45 + 0.2 + doorMarks(6).indexOf(m) * 0.12 }));
  const human: Mark[] = HUMAN_AGES.map((a) => ({ min: a, label: [3, 6, 12, 18, 22].includes(a) ? `${a} 岁` : "", at: humanAt(a) }));
  const extra: Mark[] = t >= b49 + 1.2 ? [{ min: 23, label: "23 岁", at: b49 + 1.2 }] : [];
  const x260 = pr(t, b45 + 1.2, 0.4, EBACK);
  const doorGlow = pr(t, b48 + 0.1, 0.6, EO);
  const walk = pr(t, b49 + 0.1, 1.0, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={t < b47 ? C.cyan : C.gold} at={[50, 60]} strength={0.08 + 0.06 * doorGlow} />
      <AbsoluteFill style={{ opacity: 1 - 0.8 * dimForQuote }}>
        <Frame x={AI_FRAME.x} floor={AI_FRAME.floor} w={AI_FRAME.w} h={AI_FRAME.h} grow={pr(t, b45, 0.5, EO)} />
        <Marks t={t} x={AI_FRAME.x} floor={AI_FRAME.floor} w={AI_FRAME.w} labelSide="left" labelSize={30} marks={aiMarks} yOf={aiY} />
        {x260 > 0 ? <div style={{ position: "absolute", left: AI_FRAME.x, top: AI_FRAME.floor - 330, transform: `translateX(-50%) scale(${x260})`, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: C.cyan, whiteSpace: "nowrap" }}>×260</div> : null}
        <div style={{ position: "absolute", left: AI_FRAME.x, top: AI_FRAME.floor + 14, transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: C.cyan, whiteSpace: "nowrap" }}>它 · 3 年</div>
        {t >= bar(90) - 0.2 ? (
          <>
            <Frame x={HU_FRAME.x} floor={HU_FRAME.floor} w={HU_FRAME.w} h={HU_FRAME.h} grow={pr(t, bar(90) - 0.2, 0.5, EO)} tone="warm" />
            <Marks t={t} x={HU_FRAME.x} floor={HU_FRAME.floor} w={HU_FRAME.w} labelSide="left" labelSize={30} color={C.gold} hand marks={[...human, ...extra]} yOf={humanY} />
            <div style={{ position: "absolute", left: HU_FRAME.x, top: HU_FRAME.floor + 14, transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: C.gold, whiteSpace: "nowrap" }}>一个人 · 22 年</div>
          </>
        ) : null}
        {/* the first-job door, next to the last notch */}
        {t >= humanAt(22) ? (
          <div style={{ position: "absolute", left: FIRST_JOB.x - FIRST_JOB.w / 2, top: HU_FRAME.floor - FIRST_JOB.h, opacity: pr(t, humanAt(22) + 0.1, 0.4) }}>
            <Door w={FIRST_JOB.w} h={FIRST_JOB.h} light={0.5 + 0.5 * doorGlow} frame="rgba(255,209,102,0.8)" />
            <div style={{ position: "absolute", left: FIRST_JOB.w / 2, top: -54, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 800, color: C.gold, whiteSpace: "nowrap" }}>第一份工作</div>
          </div>
        ) : null}
        {t >= b49 ? (
          <div style={{ position: "absolute", left: lerp(FIRST_JOB.x - 170, FIRST_JOB.x - 30, walk), top: HU_FRAME.floor - 150, opacity: 1 - pr(t, b49 + 0.9, 0.3), transform: `scaleX(${lerp(1, 0.6, pr(walk, 0.6, 0.4))})` }}>
            <Person h={150} color="#7b8696" cap={1} />
          </div>
        ) : null}
      </AbsoluteFill>
      <Lines at={b45} a={FIN.s45[0]} b={FIN.s45[1]} out={bar(90) - 0.05} />
      <Lines at={bar(90)} a={FIN.s46[0]} b={FIN.s46[1]} out={b47 - 0.05} />
      <Lines at={b47 + 0.1} a={FIN.s47[0]} b={FIN.s47[1]} center size={96} y={420} kw="一年一年地长大" kwAt={b47 + 0.1 + 2 * BAR * 0.6} out={b48 - 0.1} />
      <Lines at={b48} a={FIN.s48[0]} b={FIN.s48[1]} out={b49 - 0.05} />
    </AbsoluteFill>
  );
};

// ── 50–52 · bars 100–108: the answer, then the end card ──
export const Answer: React.FC = () => {
  const t = useT();
  const b0 = bar(100);
  const box = pr(t, b0, 0.5, EO);
  const boxOut = pr(t, bar(102), 0.6, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[50, 50]} strength={0.08} />
      <div style={{ position: "absolute", left: 960 - 430, top: 300, opacity: box * (1 - boxOut), transform: `scale(${lerp(0.9, 1, box)})` }}>
        <ChatBox t={t} w={860} h={300} userAt={b0 + 0.2} user="AI 到底改变了什么？" replyAt={Infinity} />
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: boxOut * 0.5 }}>
        <Frame x={760} floor={980} w={300} h={560} grow={1} tone="cool" />
        <Frame x={1160} floor={980} w={300} h={560} grow={1} tone="warm" />
      </div>
      <Line at={b0 + 1.0} text={FIN.s50} size={84} center y={700} out={bar(102) - 0.05} />
      <Line at={bar(102)} text={FIN.s51} size={96} center y={440} color={C.gold} out={bar(104) - 0.1} />
    </AbsoluteFill>
  );
};

export const EndCard: React.FC = () => {
  const t = useT();
  const b0 = bar(104);
  const from = Array.from("AI 到底改变了什么");
  const to = Array.from("世界的形状");
  const flip = pr(t, b0 + 0.4, 1.0, EIO);
  const ball = pr(t, b0 + 1.2, 0.6, EBACK);
  const maker = pr(t, b0 + 2.0, 0.6, EO);
  const shown = flip < 0.5 ? from : to;
  const k = flip < 0.5 ? 1 - flip * 2 : (flip - 0.5) * 2;
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[50, 45]} strength={0.06} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, display: "flex", justifyContent: "center", alignItems: "center", gap: 28 }}>
        {ball > 0 ? <Img src={staticFile("brand/mark-disc.png")} style={{ width: 120, height: 120, transform: `scale(${ball})`, opacity: Math.min(1, ball) }} /> : null}
        <div style={{ fontFamily: flip < 0.5 ? FONT : SERIF, fontSize: flip < 0.5 ? 120 : 132, fontWeight: flip < 0.5 ? 900 : 700, color: C.fg, letterSpacing: flip < 0.5 ? -3 : 10, whiteSpace: "pre", transform: `scaleY(${Math.max(0.02, k)})` }}>
          {shown.join("")}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: C.sub, opacity: maker }}>MakerJackie</div>
    </AbsoluteFill>
  );
};
