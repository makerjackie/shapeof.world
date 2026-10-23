import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, SERIF } from "../theme";
import { Door } from "../v2/art";
import { ChatBox, Gpu } from "../v3/art";
import { AI_MARKS, Frame, markY, Pencil } from "../v3/door";
import { BAR, bar, BEAT, END } from "../v3/timing";
import { At, clamp01, E, Key, lerp, Plane, pr, rnd, spring, Stage, useT } from "./engine";
import { Fine, Tag, Words } from "./type";

// 06 未知 (片中 80–88), 升华 (88–100), 收尾 (100–108), PLAN-v4 S41–S52. The dashed line climbs out of the frame into
// the night sky; the guesses hang there like stars; the hall keeps growing; a breath. Then the signature shot: next to
// the AI's frame, a child grows up one pencil mark a year, from 3 to 22, and the sky turns to dawn.

const B = (n: number) => bar(n);
const CYAN = "#4dd4ff";
const GOLD = "#ffd166";
const FG = "#f4f0e8";

// ── S41 + S42 · a month of work, above the frame; the guesses in the sky (B80 → B84) ──
const AIF = { x: 0, floor: 400, w: 400, h: 720 };
export const MONTH4 = B(80) + 2 * BEAT;
const GUESSES: [number, string, string, boolean, number][] = [
  [2026.9, "Altman", "OpenAI CEO · 今年底", true, -260],
  [2027.6, "Amodei", "Anthropic CEO · 1–2 年", true, 140],
  [2030, "Hassabis", "DeepMind CEO · 2030 前后", true, -200],
  [2033, "Metaculus", "预测社区 · 约 2033", false, 140],
  [2042, "AI 研究者问卷", "1,580 人 · 2042", false, -200],
];
const SKY_Y = -2300; // the ruler of years, up in the sky
const px = (y: number) => 900 + ((y - 2026) / (2044 - 2026)) * 2600;
export const Sky4: React.FC = () => {
  const t = useT();
  if (t < B(80) - 0.05 || t > B(84) + 0.05) return null;
  const monthY = AIF.floor - markY(AI_MARKS.month);
  const keys: Key[] = [
    [B(80) - 0.05, { x: 200, y: -60, z: 0.95 }],
    [MONTH4 + 0.5, { x: 220, y: monthY + 180, z: 0.9 }, E.inOut],
    [B(82) - 0.1, { x: 240, y: monthY + 160, z: 0.92 }, E.lin],
    [B(82) + 0.8, { x: px(2033), y: SKY_Y, z: 0.62 }, E.inOut],
    [B(84) + 0.05, { x: px(2034), y: SKY_Y, z: 0.6 }, E.lin],
  ];
  const climb = pr(t, B(80) + 0.2, 0.9, E.inOut);
  const draw = pr(t, B(82) + 0.3, 0.8, E.inOut);
  const yOf = (m: number) => AIF.floor - markY(m);
  const prev = [AI_MARKS.m4, AI_MARKS.m39, AI_MARKS.h1, AI_MARKS.h3, AI_MARKS.h12, AI_MARKS.h17];
  return (
    <Stage keys={keys} drift={0}>
      <Plane d={0.3}>
        {Array.from({ length: 160 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: rnd(`st${i}`) * 6000 - 2000, top: rnd(`sy${i}`) * -5000 + 600, width: 3, height: 3, borderRadius: 2, background: "#dfe6ff", opacity: (0.3 + 0.5 * rnd(`sa${i}`)) * (0.6 + 0.4 * Math.sin(t * 2 + i)) * pr(t, B(80) + 0.4, 1) }} />
        ))}
      </Plane>
      <Plane>
        <Frame x={AIF.x} floor={AIF.floor} w={AIF.w} h={AIF.h} grow={1} tone="cool" />
        {prev.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: AIF.x + AIF.w / 2 - 64, top: yOf(m) - 2, width: 92, height: 5, borderRadius: 3, background: CYAN, opacity: i === 5 ? 1 : 0.5 }} />
        ))}
        <At x={AIF.x + AIF.w / 2 + 40} y={yOf(AI_MARKS.h17) - 26}>
          <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: "#9fb3c8", whiteSpace: "nowrap" }}>17 小时</div>
        </At>
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <line x1={AIF.x + AIF.w / 2 - 20} x2={AIF.x + AIF.w / 2 - 20} y1={yOf(AI_MARKS.h17)} y2={lerp(yOf(AI_MARKS.h17), monthY, climb)} stroke={CYAN} strokeWidth={5} strokeDasharray="14 12" style={{ filter: `drop-shadow(0 0 8px ${CYAN})` }} />
          <line x1={AIF.x + AIF.w / 2 - 80} x2={AIF.x + AIF.w / 2 + 60} y1={monthY} y2={monthY} stroke={CYAN} strokeWidth={6} strokeDasharray="14 10" opacity={pr(t, MONTH4, 0.3)} />
        </svg>
        <At x={AIF.x + AIF.w / 2 + 90} y={monthY - 60}>
          <Tag at={MONTH4 + 0.1} text="人干一个月的活" sub="METR 按趋势推算：2028–2031" size={52} color={FG} />
        </At>
        {/* the ruler of guesses in the sky */}
        <div style={{ position: "absolute", left: px(2026), top: SKY_Y, width: (px(2044) - px(2026)) * draw, height: 6, background: "rgba(223,230,255,0.45)" }} />
        {[2026, 2030, 2035, 2040].map((y) => (
          <At key={y} x={px(y)} y={SKY_Y + 26} o={draw}>
            <div style={{ transform: "translateX(-50%)", fontFamily: FONT, fontSize: 44, fontWeight: 800, color: "#9aa4c4" }}>{y}</div>
          </At>
        ))}
        {GUESSES.map(([y, who, note, seller, dy], i) => {
          const p = spring(t, B(82) + 0.7 + i * 0.32, 2, 8);
          if (p <= 0) return null;
          const top = SKY_Y + dy;
          return (
            <React.Fragment key={who}>
              <div style={{ position: "absolute", left: px(y) - 3, top: Math.min(top + 110, SKY_Y), width: 6, height: Math.abs(dy) - 110 > 0 ? (Math.abs(dy) - (dy < 0 ? 110 : 0)) * clamp01(p) : 0, background: seller ? GOLD : CYAN, opacity: 0.7 }} />
              <div style={{ position: "absolute", left: px(y), top, transform: `translateX(-50%) scale(${p})`, padding: "16px 28px", borderRadius: 22, background: "rgba(10,14,30,0.85)", border: `2px solid ${seller ? GOLD : CYAN}`, fontFamily: FONT, textAlign: "center", whiteSpace: "nowrap", boxShadow: `0 0 40px ${seller ? "rgba(255,209,102,0.25)" : "rgba(77,212,255,0.25)"}` }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: FG }}>{who}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#9aa4c4" }}>{note}</div>
              </div>
            </React.Fragment>
          );
        })}
      </Plane>
      <Words at={B(80) + 0.1} lines={["再过四年，它也许能干完", "人一个月的活。"]} x={110} y={130} size={74} kw={["一个月"]} kwColor={CYAN} kwAt={MONTH4 + 0.2} out={B(82) - 0.1} />
      <Words at={B(82) + 0.1} lines={["它哪天全面超过人？", "各家说法差了 15 年。"]} x={110} y={130} size={74} kw={["15 年"]} kwAt={B(83) + 1.2} />
      <div style={{ position: "absolute", left: 110, top: 330, display: "flex", gap: 36, fontFamily: FONT, fontSize: 28, fontWeight: 800, opacity: pr(t, B(83) + 0.6, 0.4) }}>
        <span style={{ color: GOLD }}>■ 卖 AI 的公司</span>
        <span style={{ color: CYAN }}>■ 预测社区和研究者</span>
      </div>
      <Fine at={B(80) + 0.4} out={B(82) - 0.1}>
        METR 论文（2026-07 版）按趋势外推：AI 有一半把握独自做完"一个月的活"（167 个工作小时），在 2028 年中到 2031 年中 · 预测
      </Fine>
      <Fine at={B(82) + 0.4} out={B(84) - 0.1}>
        各人对"全面超过人"的定义不同 · Altman（TIME，2026-08）· Amodei（2026-01）· Hassabis（2026-05）· Metaculus 社区（2026）· AI Impacts 研究者问卷（2024-12 调查）· 本片作者 Claude 是 Anthropic 的模型
      </Fine>
    </Stage>
  );
};

// ── S43 · stronger and hungrier (B84 → B86) ──
export const Hungrier4: React.FC = () => {
  const t = useT();
  if (t < B(84) - 0.05 || t > B(86) + 0.05) return null;
  const grow = pr(t, B(84) + 0.3, BAR * 1.3, E.inOut);
  const boxW = lerp(520, 980, grow);
  const boxH = lerp(300, 560, grow);
  const s = lerp(1.05, 0.98, pr(t, B(84), BAR * 2, E.lin));
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "70% 85%" }}>
      <div style={{ position: "absolute", left: 1320 - boxW / 2, top: 940 - boxH, width: boxW, height: boxH, borderRadius: 28, border: `2px solid rgba(77,212,255,${0.4 + 0.4 * grow})`, background: "rgba(77,212,255,0.05)", boxShadow: `0 0 ${60 + 80 * grow}px rgba(77,212,255,0.2)` }}>
        <div style={{ position: "absolute", left: 28, top: 18, fontFamily: FONT, fontSize: 34, fontWeight: 900, color: FG, whiteSpace: "nowrap" }}>AI 数据中心</div>
      </div>
      {Array.from({ length: 42 }).map((_, i) => {
        const c = (i % 7) - 3;
        const r = Math.floor(i / 7);
        const o = Math.min(clamp01((boxW / 2 - 16 - (Math.abs(c) * 130 + 54)) / 24), clamp01((boxH - 74 - ((r + 1) * 64 + 20)) / 24));
        return o > 0 ? (
          <div key={i} style={{ position: "absolute", left: 1320 + c * 130 - 54, top: 940 - 20 - (r + 1) * 64, opacity: o }}>
            <Gpu w={108} t={t} glow={o} id={`h4g${i}`} />
          </div>
        ) : null;
      })}
      {[
        ["2027", "内存更紧"],
        ["2028", "内存更紧"],
      ].map(([y, s2], i) => {
        const p = spring(t, B(84) + 0.6 + i * BEAT * 2, 2, 8);
        return (
          <div key={y} style={{ position: "absolute", left: 130 + i * 300, top: 520, transform: `scale(${p}) rotate(${-4 + i * 6}deg)`, opacity: clamp01(p * 2), padding: "22px 30px", borderRadius: 20, background: "#ece6da", color: "#19231f", fontFamily: FONT, textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 48, fontWeight: 900 }}>{y}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#c0392b" }}>{s2}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 130, top: 780, fontFamily: FONT, opacity: pr(t, B(85), 0.4), whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#b8b8b3" }}>四家大厂投入，2027 年预计</div>
        <div style={{ fontSize: 66, fontWeight: 900, color: GOLD }}>超过 1 万亿美元 / 年</div>
      </div>
      <Words at={B(84) + 0.1} lines={["能确定的是：", "它会更强，也更能吃。"]} x={110} y={130} size={78} kw={["更强", "更能吃"]} kwColor={CYAN} kwAt={B(85)} />
      <Fine at={B(84) + 0.4} out={B(86) - 0.1}>
        美光（美国内存大厂）：2027、2028 年内存比今年更紧（2026 财年四季度财报，公司自报）· 美银、Evercore 预测四家大厂 2027 年资本开支超过 1 万亿美元
      </Fine>
    </AbsoluteFill>
  );
};

// ── A person who grows: the cover's child at 3, a graduate at 22. h is the full height in px. ──
const Grower: React.FC<{ h: number; age: number; look?: number }> = ({ h, age, look = 0 }) => {
  const k = clamp01((age - 3) / 15);
  const headR = lerp(31, 17, k);
  const hy = headR + 6;
  const neck = hy + headR - 2;
  const shirt = age >= 18 ? "#2b3a55" : "#ffd166";
  const pants = "#34456b";
  const bodyW = lerp(52, 40, k);
  const bodyTop = neck;
  const bodyBot = lerp(150, 120, k);
  const cap = clamp01((age - 21) / 0.6);
  return (
    <svg width={h * 0.5} height={h} viewBox="0 0 100 200" style={{ overflow: "visible", display: "block" }}>
      <rect x={50 - bodyW * 0.32} y={bodyBot - 6} width={bodyW * 0.28} height={200 - bodyBot + 2} rx={6} fill={pants} />
      <rect x={50 + bodyW * 0.04} y={bodyBot - 6} width={bodyW * 0.28} height={200 - bodyBot + 2} rx={6} fill={pants} />
      <ellipse cx={50 - bodyW * 0.18} cy={197} rx={bodyW * 0.24} ry={4} fill="#1d2230" />
      <ellipse cx={50 + bodyW * 0.18} cy={197} rx={bodyW * 0.24} ry={4} fill="#1d2230" />
      <rect x={50 - bodyW / 2 - 11} y={bodyTop + 6} width={11} height={(bodyBot - bodyTop) * 0.82} rx={5.5} fill={shirt} />
      <rect x={50 + bodyW / 2} y={bodyTop + 6} width={11} height={(bodyBot - bodyTop) * 0.82} rx={5.5} fill={shirt} />
      <rect x={50 - bodyW / 2} y={bodyTop} width={bodyW} height={bodyBot - bodyTop} rx={14} fill={shirt} />
      <g transform={`translate(${look * 3} 0)`}>
        <circle cx={50} cy={hy} r={headR} fill="#f1c7a0" />
        <path d={`M${50 - headR},${hy} C${50 - headR},${hy - headR * 0.9} ${50 - headR * 0.4},${hy - headR * 1.05} 50,${hy - headR * 1.05} C${50 + headR * 0.6},${hy - headR * 1.05} ${50 + headR},${hy - headR * 0.7} ${50 + headR * 0.95},${hy - headR * 0.1} C${50 + headR * 0.6},${hy - headR * 0.55} ${50 + headR * 0.2},${hy - headR * 0.6} 50,${hy - headR * 0.55} C${50 - headR * 0.4},${hy - headR * 0.5} ${50 - headR * 0.8},${hy - headR * 0.3} ${50 - headR},${hy} Z`} fill="#2b2320" />
        <circle cx={50 - headR * 0.32 + look * 2} cy={hy + headR * 0.05} r={headR * 0.11} fill="#1b1b1f" />
        <circle cx={50 + headR * 0.32 + look * 2} cy={hy + headR * 0.05} r={headR * 0.11} fill="#1b1b1f" />
        <path d={`M${50 - headR * 0.22},${hy + headR * 0.42} Q50,${hy + headR * 0.55} ${50 + headR * 0.22},${hy + headR * 0.42}`} stroke="#7a2e2e" strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={50 - headR * 0.6} cy={hy + headR * 0.32} r={headR * 0.16} fill="#f28c8c" opacity={0.35 * (1 - k)} />
        <circle cx={50 + headR * 0.6} cy={hy + headR * 0.32} r={headR * 0.16} fill="#f28c8c" opacity={0.35 * (1 - k)} />
        {cap > 0 ? (
          <g opacity={cap}>
            <path d={`M${50 - headR * 1.5},${hy - headR * 0.75} L50,${hy - headR * 1.35} L${50 + headR * 1.5},${hy - headR * 0.75} L50,${hy - headR * 0.2} Z`} fill="#1d2230" />
            <path d={`M${50 + headR * 1.3},${hy - headR * 0.8} L${50 + headR * 1.3},${hy + headR * 0.3}`} stroke={GOLD} strokeWidth={2.5} />
          </g>
        ) : null}
      </g>
    </svg>
  );
};

// ── S44 → S49 · 那我们呢, then the two frames and the child who grows (B86 → B100) ──
const PX = 3; // px per cm on the human frame
const HEIGHT: Record<number, number> = { 3: 96, 4: 103, 5: 110, 6: 117, 7: 123, 8: 129, 9: 134, 10: 139, 11: 145, 12: 151, 13: 158, 14: 163, 15: 166, 16: 168, 17: 169, 18: 170, 19: 170, 20: 170, 21: 170, 22: 170, 23: 170 };
const AIL = { x: -520, floor: 380, w: 380, h: 600 };
const HUL = { x: 300, floor: 380, w: 380, h: 600 };
const JOB = { x: 960, w: 150, h: 470 };
export const HUMAN4 = B(90) + 0.25;
export const ageAt = (t: number) => clamp01((t - HUMAN4) / (BAR * 2.5)) * 19 + 3;
const aiYOf = (min: number) => AIL.floor - (40 + 66 * 0.8 * Math.log2(min / 4));
const huY = (age: number) => HUL.floor - HEIGHT[Math.min(23, Math.max(3, Math.floor(age)))] * PX;
export const Rise4: React.FC = () => {
  const t = useT();
  if (t < B(86) - 0.05 || t > B(100) + 0.05) return null;
  const b47 = B(93);
  const b48 = B(96);
  const b49 = B(98);
  const keys: Key[] = [
    [B(86) - 0.05, { x: -200, y: 40, z: 0.9 }],
    [B(88) - 0.2, { x: -120, y: 20, z: 0.98 }, E.lin],
    [B(88) + 0.4, { x: -360, y: -40, z: 1.05 }, E.out],
    [B(90) - 0.1, { x: -330, y: -40, z: 1.08 }, E.lin],
    [B(90) + 0.5, { x: 200, y: 20, z: 0.95 }, E.inOut],
    [b47 - 0.1, { x: 220, y: 10, z: 0.92 }, E.lin],
    [b48, { x: 200, y: 0, z: 0.88 }, E.lin],
    [b49, { x: 380, y: 20, z: 0.95 }, E.inOut],
    [b49 + 1.8, { x: 640, y: 0, z: 1.1 }, E.inOut],
    [B(100) + 0.05, { x: 520, y: 20, z: 1.05 }, E.inOut],
  ];
  const us = pr(t, B(86) + 0.4, 0.8);
  const aiMarks = [AI_MARKS.m4, AI_MARKS.m39, AI_MARKS.h1, AI_MARKS.h3, AI_MARKS.h12, AI_MARKS.h17];
  const aiRace = (i: number) => B(88) + 0.15 + i * 0.13;
  const x260 = spring(t, B(88) + 1.05, 2, 8);
  const huIn = pr(t, B(90) - 0.2, 0.6);
  const age = ageAt(t);
  const dim = pr(t, b47 - 0.1, 0.5, E.inOut) * (1 - pr(t, b48 - 0.25, 0.5, E.inOut));
  const doorGlow = pr(t, b48 + 0.1, 0.7);
  const walk = pr(t, b49 + 0.1, 1.5, E.inOut);
  const enter = pr(t, b49 + 1.9, 0.9, E.inOut);
  const squeeze = pr(enter, 0, 0.4);
  const mark23 = pr(t, b49 + 2.9, 0.35, E.inOut);
  const kidH = HEIGHT[Math.floor(Math.min(22, age))] * PX;
  const kidX = HUL.x - 40;
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <div style={{ opacity: 1 - 0.75 * dim }}>
          {/* the AI's frame */}
          <div style={{ position: "absolute", left: AIL.x - 500, top: AIL.floor - 900, width: 1000, height: 1000, background: "radial-gradient(ellipse at 50% 55%, rgba(77,212,255,0.14), transparent 62%)" }} />
          <Frame x={AIL.x} floor={AIL.floor} w={AIL.w} h={AIL.h} grow={1} tone="cool" />
          {aiMarks.map((m, i) => {
            const p = t < B(88) ? 1 : pr(t, aiRace(i), 0.18, E.out);
            return <div key={i} style={{ position: "absolute", left: AIL.x - AIL.w / 2 + 16, top: aiYOf(m) - 3, width: (AIL.w - 32) * p, height: i === 5 ? 7 : 5, borderRadius: 3, background: CYAN, opacity: i === 5 ? 1 : 0.6, boxShadow: i === 5 ? `0 0 14px ${CYAN}` : undefined }} />;
          })}
          {[
            [AI_MARKS.m4, "4 分钟"],
            [AI_MARKS.h17, "17 小时"],
          ].map(([m, l]) => (
            <At key={l as string} x={AIL.x + AIL.w / 2 + 24} y={aiYOf(m as number) - 22}>
              <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 800, color: "#9fb3c8", whiteSpace: "nowrap" }}>{l as string}</div>
            </At>
          ))}
          {x260 > 0 ? (
            <At x={AIL.x} y={AIL.floor - 330} anchor="c" s={x260}>
              <div style={{ fontFamily: FONT, fontSize: 96, fontWeight: 900, color: CYAN, whiteSpace: "nowrap", textShadow: `0 0 40px ${CYAN}` }}>×260</div>
            </At>
          ) : null}
          <At x={AIL.x} y={AIL.floor + 24}>
            <div style={{ transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: CYAN, whiteSpace: "nowrap" }}>它 · 3 年</div>
          </At>
          {/* the empty place next to it, then the person's frame */}
          {huIn < 1 ? <div style={{ position: "absolute", left: HUL.x - HUL.w / 2, top: HUL.floor - HUL.h, width: HUL.w, height: HUL.h, border: "3px dashed rgba(255,209,102,0.35)", borderBottom: "none", opacity: us * (1 - huIn) }} /> : null}
          {huIn > 0 ? (
            <>
              <div style={{ position: "absolute", left: HUL.x - 500, top: HUL.floor - 900, width: 1000, height: 1000, background: "radial-gradient(ellipse at 50% 60%, rgba(255,209,102,0.14), transparent 62%)", opacity: huIn }} />
              <div style={{ opacity: huIn }}>
                <Frame x={HUL.x} floor={HUL.floor} w={HUL.w} h={HUL.h} grow={huIn} tone="warm" />
              </div>
              {Array.from({ length: 20 }, (_, i) => i + 3).map((a) => {
                const p = pr(age, a, 0.6, E.out);
                if (p <= 0) return null;
                const y = huY(a);
                const tilt = (rnd(`ht${a}`) - 0.5) * 3;
                return (
                  <React.Fragment key={a}>
                    <div style={{ position: "absolute", left: HUL.x + HUL.w / 2 - 60, top: y - 2, width: 74 * p, height: 4, borderRadius: 2, background: "#e8d9b5", transform: `rotate(${tilt}deg)`, transformOrigin: "0 50%", opacity: 0.9 }} />
                    {[3, 6, 12, 18, 22].includes(a) ? (
                      <div style={{ position: "absolute", left: HUL.x + HUL.w / 2 + 26, top: y - 18, fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: GOLD, opacity: p * (a === Math.floor(Math.min(22, age)) ? 1 : 0.6), whiteSpace: "nowrap" }}>{a} 岁</div>
                    ) : null}
                  </React.Fragment>
                );
              })}
              {age < 22.9 && t >= HUMAN4 ? (
                <div style={{ position: "absolute", left: HUL.x + HUL.w / 2 + 14 - 6, top: huY(age) - 56, transform: "rotate(-28deg)", transformOrigin: "50% 100%" }}>
                  <Pencil color={GOLD} />
                </div>
              ) : null}
              {/* the child who grows */}
              {t < b49 + 0.05 ? (
                <At x={kidX - kidH * 0.25} y={HUL.floor - kidH} o={pr(t, HUMAN4 - 0.2, 0.3)}>
                  <Grower h={kidH} age={Math.min(22, age)} look={pr(t, b48, 0.6)} />
                </At>
              ) : null}
              <At x={HUL.x} y={HUL.floor + 24} o={huIn}>
                <div style={{ transform: "translateX(-50%)", fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: GOLD, whiteSpace: "nowrap" }}>一个人 · 22 年</div>
              </At>
            </>
          ) : null}
          {/* the narrow first-job door */}
          {age >= 21.5 ? (
            <At x={JOB.x - JOB.w / 2} y={HUL.floor - JOB.h} o={pr(age, 21.5, 1)}>
              <div style={{ position: "absolute", left: -300, top: -200, width: JOB.w + 600, height: JOB.h + 400, background: `radial-gradient(ellipse at 50% 60%, rgba(255,209,102,${0.15 + 0.35 * doorGlow}), transparent 60%)` }} />
              <Door w={JOB.w} h={JOB.h} light={0.5 + 0.5 * doorGlow} frame="rgba(255,209,102,0.85)" />
              <div style={{ position: "absolute", left: JOB.w / 2, top: -66, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: GOLD, whiteSpace: "nowrap" }}>第一份工作</div>
            </At>
          ) : null}
          {/* he walks to it and squeezes through sideways */}
          {t >= b49 ? (
            <At x={lerp(kidX - kidH * 0.25, JOB.x - 250, walk) + enter * 170} y={HUL.floor - HEIGHT[22] * PX} o={1 - pr(enter, 0.55, 0.45)} style={{ transformOrigin: "50% 100%" }} s={1}>
              <div style={{ transform: `scaleX(${lerp(1, 0.45, squeeze)})`, transformOrigin: "50% 100%" }}>
                <Grower h={HEIGHT[22] * PX} age={22} look={1} />
              </div>
            </At>
          ) : null}
          {mark23 > 0 ? (
            <>
              <div style={{ position: "absolute", left: HUL.x + HUL.w / 2 - 60, top: huY(22) - 14, width: 74 * mark23, height: 4, borderRadius: 2, background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
              <div style={{ position: "absolute", left: HUL.x + HUL.w / 2 + 26, top: huY(22) - 52, fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: GOLD, opacity: mark23, whiteSpace: "nowrap" }}>23 岁 · 第一份工作</div>
            </>
          ) : null}
        </div>
      </Plane>
      <Words at={B(86) + 0.3} lines={["那我们呢？"]} x={960} y={150} size={110} align="center" reveal="blur" cps={8} out={B(88) - 0.15} outStyle="blur" />
      <Words at={B(88) + 0.1} lines={["从 4 分钟到 17 小时，", "它长了 260 倍。"]} x={110} y={120} size={74} kw={["260 倍"]} kwColor={CYAN} kwAt={B(88) + 1.1} out={B(90) - 0.1} />
      <Words at={B(90) + 0.1} lines={["一个人要长 22 年，", "才走到第一份工作门前。"]} x={110} y={120} size={74} kw={["22 年"]} kwAt={HUMAN4 + BAR * 2.5} out={b47 - 0.15} />
      <Words at={b47 + 0.15} lines={["AI 四个月长一倍。", "人，还是要一年一年地长大。"]} x={960} y={360} size={104} serif align="center" gap={1.1} kw={["一年一年地长大"]} kwAt={b47 + 2.4} out={b48 - 0.2} outStyle="blur" glow="rgba(0,0,0,0.5)" />
      <Words at={b48 + 0.1} lines={["可那扇变窄的门，", "正是新人变老手的地方。"]} x={110} y={120} size={74} kw={["新人变老手"]} kwAt={b48 + 1.2} out={b49 - 0.1} />
    </Stage>
  );
};

// ── S50 – S52 · the answer and the end card (B100 → END) ──
export const Answer4: React.FC = () => {
  const t = useT();
  if (t < B(100) - 0.05 || t > B(104) + 0.3) return null;
  const box = pr(t, B(100), 0.5);
  const boxOut = pr(t, B(102), 0.7, E.inOut);
  const s = lerp(1, 1.06, pr(t, B(100), BAR * 4, E.lin));
  const out = pr(t, B(104) - 0.15, 0.4);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, opacity: 1 - out }}>
      <div style={{ position: "absolute", left: 960 - 430, top: 330, opacity: box * (1 - boxOut), transform: `scale(${lerp(0.9, 1, box)})` }}>
        <ChatBox t={t} w={860} h={300} userAt={B(100) + 0.2} user="AI 到底改变了什么？" replyAt={Infinity} />
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: boxOut * 0.4 }}>
        <Frame x={780} floor={1000} w={300} h={560} grow={1} tone="cool" />
        <Frame x={1140} floor={1000} w={300} h={560} grow={1} tone="warm" />
      </div>
      <Words at={B(100) + 1.1} lines={["它改变了钱、芯片和电。"]} x={960} y={720} size={80} align="center" out={B(102) - 0.1} />
      <Words at={B(102) + 0.1} lines={["也改变了，一个人长大的路。"]} x={960} y={420} size={104} serif align="center" color={GOLD} reveal="blur" cps={14} glow="rgba(255,209,102,0.25)" />
    </AbsoluteFill>
  );
};

export const EndCard4: React.FC = () => {
  const t = useT();
  if (t < B(104) - 0.05) return null;
  const from = "AI 到底改变了什么";
  const to = "世界的形状";
  const flip = pr(t, B(104) + 0.4, 1.0, E.inOut);
  const ball = spring(t, B(104) + 1.2, 2, 8);
  const maker = pr(t, B(104) + 2.0, 0.6);
  const k = flip < 0.5 ? 1 - flip * 2 : (flip - 0.5) * 2;
  const fade = pr(t, END - 0.6, 0.6);
  return (
    <AbsoluteFill style={{ opacity: 1 - fade }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, display: "flex", justifyContent: "center", alignItems: "center", gap: 28, opacity: pr(t, B(104), 0.4) }}>
        {ball > 0 ? <Img src={staticFile("brand/mark-disc.png")} style={{ width: 120, height: 120, transform: `scale(${ball})`, opacity: clamp01(ball) }} /> : null}
        <div style={{ fontFamily: flip < 0.5 ? FONT : SERIF, fontSize: flip < 0.5 ? 120 : 132, fontWeight: flip < 0.5 ? 900 : 700, color: FG, letterSpacing: flip < 0.5 ? -3 : 10, whiteSpace: "pre", transform: `scaleY(${Math.max(0.02, k)})` }}>
          {flip < 0.5 ? from : to}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: "#b8b8b3", opacity: maker }}>MakerJackie</div>
    </AbsoluteFill>
  );
};
