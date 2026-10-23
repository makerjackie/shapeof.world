import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { FONT, MONO } from "../theme";
import { ChatBox, Crowd } from "../v3/art";
import { AI_MARKS, Frame, markY, Pencil } from "../v3/door";
import { BAR, bar, BEAT } from "../v3/timing";
import { At, E, Key, lerp, Plane, pr, rnd, Stage, useT } from "./engine";
import { Fine, Words } from "./type";

// 04 害怕 · 片中 46–56 (PLAN-v4 S24–S28). Cold blue. The marks race up the door frame and the camera rises with them;
// programmers' questions fall like snow on the wall where they asked strangers, then get sucked into a chat box;
// layoff notices drift down and the crowd looks up.

const B = (n: number) => bar(n);
const CYAN = "#4dd4ff";
const RED = "#ff5a5f";
const FG = "#f4f0e8";

export const GROW4 = {
  m39: B(46) + 0.4,
  h1: B(46) + 0.4 + BEAT,
  h3: B(46) + 0.4 + 2 * BEAT,
  h12: B(46) + 0.4 + 3 * BEAT,
  h17: B(48) + 0.2,
};
const MARKS = [
  { min: AI_MARKS.m4, label: "4 分钟", at: -10 },
  { min: AI_MARKS.m39, label: "39 分钟", at: GROW4.m39 },
  { min: AI_MARKS.h1, label: "1 小时", at: GROW4.h1 },
  { min: AI_MARKS.h3, label: "3 小时", at: GROW4.h3 },
  { min: AI_MARKS.h12, label: "12 小时", at: GROW4.h12 },
  { min: AI_MARKS.h17, label: "人干 17 小时的活", sub: "≈ 两个工作日", at: GROW4.h17 },
];
const DR = { x: 0, floor: 400, w: 520, h: 760, jamb: 64 };

// marks drawn across the doorway, labels inside it: the doorway is the ruler
const DoorMarks: React.FC<{ t: number }> = ({ t }) => {
  const shown = MARKS.filter((m) => t >= m.at);
  const newest = shown[shown.length - 1];
  const x0 = DR.x - DR.w / 2;
  return (
    <>
      {MARKS.map((m, i) => {
        const p = pr(t, m.at, 0.3, E.inOut);
        if (p <= 0) return null;
        const y = DR.floor - markY(m.min);
        const isNew = m === newest;
        const len = DR.w - 20;
        return (
          <React.Fragment key={i}>
            <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
              <line x1={x0 + 10} y1={y} x2={x0 + 10 + len * p} y2={y} stroke={CYAN} strokeWidth={isNew ? 7 : 4} strokeLinecap="round" opacity={isNew ? 1 : 0.55} style={isNew ? { filter: `drop-shadow(0 0 10px ${CYAN})` } : undefined} />
            </svg>
            {p < 1 ? (
              <div style={{ position: "absolute", left: x0 + 10 + len * p - 6, top: y - 54, transform: "rotate(28deg)", transformOrigin: "50% 100%" }}>
                <Pencil color={CYAN} />
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: x0 + DR.jamb + 18,
                top: y - (isNew ? (m.sub ? 92 : 58) : 30),
                opacity: pr(t, m.at + 0.12, 0.25) * (isNew ? 1 : 0.6),
                fontFamily: FONT,
                fontWeight: isNew ? 900 : 700,
                fontSize: isNew ? 40 : 22,
                color: isNew ? FG : "#9fb3c8",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {m.label}
              {m.sub && isNew ? <div style={{ fontSize: 24, color: "#8a9bb0" }}>{m.sub}</div> : null}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const Climb4: React.FC = () => {
  const t = useT();
  if (t < B(46) || t > B(50) + 0.05) return null;
  const yOf = (min: number) => DR.floor - markY(min);
  const keys: Key[] = [
    [B(46), { x: -330, y: 300, z: 1.35 }],
    [GROW4.m39 + 0.2, { y: yOf(39) + 120, z: 1.3 }, E.out],
    [GROW4.h3 + 0.2, { y: yOf(204) + 80, z: 1.25 }, E.inOut],
    [GROW4.h12 + 0.25, { y: yOf(720) + 60, z: 1.2 }, E.inOut],
    [GROW4.h17 + 0.25, { y: yOf(1044) + 40, z: 1.18 }, E.out],
    [B(48) + 1.2, { x: -360, y: 20, z: 0.95 }, E.inOut],
    [B(50) + 0.05, { x: -360, y: 10, z: 1.0 }, E.lin],
  ];
  const top = pr(t, GROW4.h17, 0.6);
  const years = ["2023", "2024", "2025", "2026"];
  const yi = Math.min(3, Math.floor(pr(t, B(46) + 0.3, BAR * 1.9, E.lin) * 4));
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <div style={{ position: "absolute", left: -900, top: -700, width: 1800, height: 1500, background: `radial-gradient(ellipse at 50% 40%, rgba(127,200,255,${0.1 + 0.12 * top}), transparent 62%)` }} />
        <Frame x={DR.x} floor={DR.floor} w={DR.w} h={DR.h} grow={1} jamb={DR.jamb} tone="cool" light={0} />
        <div style={{ position: "absolute", left: DR.x, top: DR.floor - DR.h - 64, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: CYAN, whiteSpace: "nowrap", letterSpacing: 3 }}>AI 能独自干完的活</div>
        <DoorMarks t={t} />
        {top > 0 ? <div style={{ position: "absolute", left: DR.x - DR.w / 2 - 60, width: DR.w + 120, top: DR.floor - DR.h - 40, height: 80, background: `radial-gradient(ellipse, rgba(77,212,255,${0.55 * top}), transparent 70%)` }} /> : null}
        <div style={{ position: "absolute", left: DR.x + DR.w / 2 + 40, top: DR.floor - 70, fontFamily: FONT, fontSize: 44, fontWeight: 900, color: "rgba(244,240,232,0.45)", fontVariantNumeric: "tabular-nums" }}>{years[yi]}</div>
      </Plane>
      <Words at={B(46) + 0.1} lines={["它能独自干完的活，", "大约每 4 个月翻一倍。"]} x={110} y={150} size={74} kw={["每 4 个月翻一倍"]} kwColor={CYAN} kwAt={GROW4.h12} out={B(48) - 0.1} />
      <Words at={B(48) + 0.15} lines={["现在，人干 17 小时的活，", "它能独自干完。"]} x={110} y={150} size={74} kw={["17 小时"]} kwColor={CYAN} />
      <Fine at={B(46) + 0.5} out={B(50) - 0.1}>
        METR：AI 有一半把握独自做完的任务长度（按人类专家耗时）· GPT-4 4 分钟（2023-03）→ o1 39 分钟 → Claude 3.7 约 1 小时 → GPT-5 3.4 小时 → Opus 4.6 12 小时 → Mythos Preview 约 17 小时（2026-04，Anthropic 的模型）
      </Fine>
    </Stage>
  );
};

// ── S26 + S27 · the wall of questions, then the vacuum into a chat box (B50 → B54) ──
const QCard: React.FC<{ seed: number }> = ({ seed }) => (
  <div style={{ width: 250, padding: "12px 14px", borderRadius: 10, background: "rgba(214,232,255,0.1)", border: "1px solid rgba(214,232,255,0.16)", fontFamily: MONO }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: ["#5d6776", "#4a5462", "#6b7280"][seed % 3] }} />
      <div style={{ height: 8, width: 60 + (seed % 4) * 18, borderRadius: 4, background: "rgba(244,240,232,0.35)" }} />
    </div>
    <div style={{ marginTop: 10, fontSize: 16, color: "#f9b46b", whiteSpace: "nowrap", overflow: "hidden" }}>{["TypeError: undefined", "how to sort a dict?", "SQL join is slow", "segfault in loop", "regex for email", "git rebase help", "CSS center a div", "null pointer?"][seed % 8]}</div>
    <div style={{ marginTop: 8, height: 6, width: "80%", borderRadius: 3, background: "rgba(244,240,232,0.15)" }} />
  </div>
);
const WALL = { x: -85, y: -184, w: 1204, h: 653 };
const BOXP = { x: 629, y: -459 };
const NC = 44;
export const Asking4: React.FC = () => {
  const t = useT();
  if (t < B(50) || t > B(54) + 0.05) return null;
  const keys: Key[] = [
    [B(50), { x: 200, y: -10, z: 1.1 }],
    [B(52), { x: 180, y: 0, z: 0.98 }, E.inOut],
    [B(54) + 0.05, { x: 200, y: 0, z: 0.94 }, E.lin],
  ];
  const count = lerp(109120, 971, pr(t, B(52) + 0.3, BAR * 1.3, E.inOut));
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <At x={WALL.x} y={WALL.y} o={pr(t, B(50), 0.4)}>
          <div style={{ position: "relative", width: WALL.w, height: WALL.h, borderRadius: 26, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.12)", overflow: "visible" }}>
            <div style={{ position: "absolute", left: 30, top: 22, fontFamily: FONT, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: FG }}>全球最大的程序员问答网站</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#8a9bb0", marginLeft: 18 }}>Stack Overflow · 2008 年起</span>
            </div>
          </div>
        </At>
        {Array.from({ length: NC }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const land = B(50) + 0.15 + i * 0.07;
          const fall = pr(t, land - 0.55, 0.55, E.in);
          if (fall <= 0) return null;
          const tx = WALL.x + 26 + col * 290;
          const ty = WALL.y + 92 + row * 66;
          if (ty > WALL.y + WALL.h - 60) return null;
          const go = pr(t, B(52) + 0.2 + rnd(`go${i}`) * BAR * 1.2, 0.75, E.inOut);
          const stay = i === 17;
          const g = stay ? 0 : go;
          const cx = lerp(tx, BOXP.x + 160, g) + Math.sin(g * Math.PI) * -260;
          const cy = lerp(lerp(ty - 700, ty, fall), BOXP.y + 120, g);
          if (g >= 1) return null;
          return (
            <At key={i} x={cx} y={cy} r={(1 - fall) * (rnd(`rr${i}`) - 0.5) * 30 + g * 40} s={lerp(1, 0.15, g)} o={1 - g * 0.5}>
              <QCard seed={i} />
            </At>
          );
        })}
        <At x={BOXP.x} y={BOXP.y} s={0.6} o={pr(t, B(52), 0.4)}>
          <div style={{ position: "absolute", left: -200, top: -150, width: 1160, height: 700, background: "radial-gradient(ellipse, rgba(77,212,255,0.2), transparent 62%)" }} />
          <ChatBox t={t} w={760} h={300} />
        </At>
      </Plane>
      <Words at={B(50) + 0.1} lines={["程序员有难题，", "就来这里问陌生人。"]} x={110} y={150} size={76} kw={["问陌生人"]} out={B(52) - 0.1} />
      <Words at={B(52) + 0.1} lines={["如今，他们不再来这里问人了。"]} x={110} y={150} size={76} kw={["不再来"]} kwColor={CYAN} />
      <div style={{ position: "absolute", left: 110, top: 300, fontFamily: FONT, opacity: pr(t, B(52) + 0.3, 0.4), textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#b8c4d4" }}>每月新提问</div>
        <Odometer value={count} size={120} color={count < 5000 ? RED : FG} />
        <div style={{ fontSize: 26, fontWeight: 700, color: "#8a9bb0", marginTop: 4 }}>2022 年 11 月 → 2026 年 9 月</div>
      </div>
      <Fine at={B(52) + 0.3} out={B(54) - 0.1}>
        每月新问题：2022-11 约 10.9 万 → 2026-09 约 971（Stack Exchange API，本片自取）· 2014 年峰值 20.7 万，ChatGPT 之前已经在跌 · 问题卡片为示意
      </Fine>
    </Stage>
  );
};

// ── S28 · layoff notices, heads go up (B54 → B56); everything sinks into the dark at the end ──
export const Notices4: React.FC = () => {
  const t = useT();
  if (t < B(54) - 0.05 || t > B(56) + 0.5) return null;
  const sink = pr(t, B(56) - 0.25, 0.6, E.inOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - sink }}>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.06 * pr(t, B(54), BAR * 2, E.lin)})` }}>
        {Array.from({ length: 22 }).map((_, i) => {
          const start = B(54) + 0.05 + i * 0.15;
          const p = pr(t, start, 1.9, E.lin);
          if (p <= 0) return null;
          const x = 380 + rnd(`nx${i}`) * 1420;
          const sway = Math.sin(t * 2.4 + i) * 40;
          const rot = (rnd(`nr${i}`) - 0.5) * 30 + Math.sin(t * 2 + i) * 12;
          return (
            <div key={i} style={{ position: "absolute", left: x + sway, top: lerp(-280, 700 + rnd(`ny${i}`) * 120, Math.min(1, p)), transform: `rotate(${rot}deg)`, width: 200, padding: "14px 16px", borderRadius: 6, background: "#ece6da", color: "#19231f", fontFamily: FONT, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>裁员通知</div>
              <div style={{ marginTop: 8, height: 5, width: "85%", background: "rgba(25,35,31,0.3)", borderRadius: 3 }} />
              <div style={{ marginTop: 6, height: 5, width: "65%", background: "rgba(25,35,31,0.3)", borderRadius: 3 }} />
              <div style={{ marginTop: 10, fontSize: 20, fontWeight: 900, color: "#c0392b" }}>原因：AI</div>
            </div>
          );
        })}
        <Crowd t={t} ground={830} open={pr(t, B(54) + 0.4, 0.6)} asks={[B(54) + 1.3, B(54) + 1.3 + BEAT, B(55), B(55) + BEAT, B(55) + 2 * BEAT]} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 330, fontFamily: FONT, opacity: pr(t, B(54) + 0.4, 0.4), textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#c9c4c4" }}>今年前 9 个月，美国公司公告</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Odometer value={lerp(0, 120136, pr(t, B(54) + 0.4, 1.4, E.inOut))} size={100} color={RED} />
          <span style={{ fontSize: 42, fontWeight: 900, color: RED }}>人</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#9a9a95" }}>写的原因是 AI</div>
      </div>
      <Words at={B(54) + 0.1} lines={['裁员公告写着"因为 AI"，']} x={110} y={150} size={76} />
      <Words at={B(55) - 0.05} lines={["下一个会是我吗？"]} x={960} y={520} size={130} align="center" reveal="blur" cps={14} kw={["我"]} kwColor={RED} glow="rgba(0,0,0,0.6)" />
      <Fine at={B(54) + 0.3} out={B(56) - 0.2}>
        Challenger, Gray & Christmas：2026 年 1–9 月美国公司公告裁员中以 AI 为由 120,136 人，是公司自己说的原因，不是统计出来的失业 · 中国 54% 的受访者担心被 AI 抢走工作（腾讯 × 复旦，网络调查）
      </Fine>
    </AbsoluteFill>
  );
};
