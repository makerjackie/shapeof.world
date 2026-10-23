import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { FONT, MONO } from "../theme";
import { ChatBox, Crowd } from "./art";
import { DOOR } from "./ch1";
import { AI_MARKS, Frame, Marks } from "./door";
import { Backdrop, C, EIO, EO, lerp, Lines, pr, Src, useT } from "./kit";
import { BAR, BEAT, bar } from "./timing";

// 04 害怕 · 片中 46–56. The marks climb the door frame (doubling every 4 months) to 17 hours; programmers stop asking
// strangers on Stack Overflow; layoff notices say "because of AI"; will I be next?

export const CH4 = {
  s24: ["它能独自干完的活，", "大约每 4 个月翻一倍。"],
  s25: ["现在，人干 17 小时的活，", "它能独自干完。"],
  s26: ["程序员有难题，", "就来这里问陌生人。"],
  s27: ["如今，他们不再来这里问人了。"],
  s28: ['裁员公告写着"因为 AI"，', "下一个会是我吗？"],
} as const;

export const GROW = {
  m39: bar(46) + 0.4,
  h1: bar(46) + 0.4 + BEAT,
  h3: bar(46) + 0.4 + 2 * BEAT,
  h12: bar(46) + 0.4 + 3 * BEAT,
  h17: bar(48) + 0.2,
};
export const doorMarks = (upTo: number) =>
  [
    { min: AI_MARKS.m4, label: "人干 4 分钟的活", at: -10 },
    { min: AI_MARKS.m39, label: "39 分钟", at: GROW.m39 },
    { min: AI_MARKS.h1, label: "1 小时", at: GROW.h1 },
    { min: AI_MARKS.h3, label: "3 小时", at: GROW.h3 },
    { min: AI_MARKS.h12, label: "12 小时", at: GROW.h12 },
    { min: AI_MARKS.h17, label: "人干 17 小时的活", sub: "≈ 两个工作日", at: GROW.h17 },
  ].slice(0, upTo);

// ── 24–25 · bars 46–50: the marks climb to the top of the frame ──
export const Climbing: React.FC = () => {
  const t = useT();
  const b0 = bar(46);
  const top = pr(t, GROW.h17, 0.6, EO);
  const years = ["2023", "2024", "2025", "2026"];
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} at={[62, 50]} strength={0.1 + 0.08 * top} />
      <Frame x={DOOR.x} floor={DOOR.floor} w={DOOR.w} h={DOOR.h} grow={1} />
      <div style={{ position: "absolute", left: DOOR.x, top: DOOR.floor - DOOR.h - 56, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 800, fontSize: 26, color: C.cyan, whiteSpace: "nowrap", letterSpacing: 2 }}>AI 能独自干完的活</div>
      <Marks t={t} x={DOOR.x} floor={DOOR.floor} w={DOOR.w} labelSize={36} marks={doorMarks(6)} />
      <div style={{ position: "absolute", left: DOOR.x - DOOR.w / 2 - 60, top: DOOR.floor - 40, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.muted, whiteSpace: "nowrap", opacity: pr(t, b0, 0.4) }}>
        {years[Math.min(3, Math.floor(pr(t, b0 + 0.3, BAR * 1.9, (x) => x) * 4))]}
      </div>
      {top > 0 ? <div style={{ position: "absolute", left: DOOR.x - DOOR.w / 2 - 40, right: 1920 - (DOOR.x + DOOR.w / 2 + 40), top: DOOR.floor - DOOR.h - 30, height: 60, background: `radial-gradient(ellipse, rgba(77,212,255,${0.4 * top}), transparent 70%)` }} /> : null}
      <Lines at={b0} a={CH4.s24[0]} b={CH4.s24[1]} out={bar(48) - 0.05} />
      <Lines at={bar(48)} a={CH4.s25[0]} b={CH4.s25[1]} out={bar(50) - 0.05} />
      <Src at={b0 + 0.3}>METR：AI 有一半把握独自做完的任务长度（按人类专家耗时）· GPT-4 4 分钟（2023-03）→ o1 39 分钟 → Claude 3.7 约 1 小时 → GPT-5 3.4 小时 → Opus 4.6 12 小时 → Mythos Preview 约 17 小时（2026-04，Anthropic 的模型）· 2023 年以来约每 4 个月翻一倍</Src>
    </AbsoluteFill>
  );
};

// ── 26 · bars 50–52: the place where programmers asked strangers ──
const QCard: React.FC<{ seed: number; w?: number }> = ({ seed, w = 230 }) => (
  <div style={{ width: w, padding: "12px 14px", borderRadius: 10, background: "rgba(244,240,232,0.09)", border: "1px solid rgba(244,240,232,0.12)", fontFamily: MONO }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: ["#5d6776", "#4a5462", "#6b7280"][seed % 3] }} />
      <div style={{ height: 8, width: 60 + (seed % 4) * 18, borderRadius: 4, background: "rgba(244,240,232,0.35)" }} />
    </div>
    <div style={{ marginTop: 10, fontSize: 15, color: "#f9b46b", whiteSpace: "nowrap", overflow: "hidden" }}>{["TypeError: undefined", "how to sort a dict?", "SQL join is slow", "segfault in loop", "regex for email", "git rebase help"][seed % 6]}</div>
    <div style={{ marginTop: 8, height: 6, width: "80%", borderRadius: 3, background: "rgba(244,240,232,0.15)" }} />
  </div>
);
const SO = { x: 600, y: 380, w: 1180, h: 600 };
export const Asking: React.FC = () => {
  const t = useT();
  const b0 = bar(50);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[62, 58]} strength={0.1} />
      <div style={{ position: "absolute", left: SO.x, top: SO.y, width: SO.w, height: SO.h, borderRadius: 24, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.glassLine}`, overflow: "hidden", opacity: pr(t, b0, 0.4) }}>
        <div style={{ position: "absolute", left: 28, top: 18, fontFamily: FONT, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: C.fg }}>全球最大的程序员问答网站</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginLeft: 16 }}>Stack Overflow · 2008 年起</span>
        </div>
        {Array.from({ length: 36 }).map((_, i) => {
          const col = i % 4;
          const start = b0 + 0.2 + i * 0.1;
          const p = pr(t, start, 0.7, EO);
          const y = 90 + Math.floor(i / 4) * 110;
          if (p <= 0 || y > SO.h + 40) return null;
          return (
            <div key={i} style={{ position: "absolute", left: 30 + col * 285, top: lerp(y - 160, y, p), opacity: p }}>
              <QCard seed={i} w={260} />
            </div>
          );
        })}
      </div>
      <Lines at={b0} a={CH4.s26[0]} b={CH4.s26[1]} out={bar(52) - 0.05} />
      <Src at={b0 + 0.3}>Stack Overflow（全球最大的程序员问答网站），2008 年上线 · 问题卡片为示意</Src>
    </AbsoluteFill>
  );
};

// ── 27 · bars 52–54: the questions fly into a chat box; the wall empties ──
export const Quiet: React.FC = () => {
  const t = useT();
  const b0 = bar(52);
  const count = lerp(109120, 971, pr(t, b0 + 0.3, BAR * 1.2, EIO));
  return (
    <AbsoluteFill>
      <Backdrop glow={C.orange} at={[62, 58]} strength={0.08} />
      <div style={{ position: "absolute", left: SO.x, top: SO.y, width: SO.w, height: SO.h, borderRadius: 24, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassLine}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 28, top: 18, fontFamily: FONT, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: C.fg }}>全球最大的程序员问答网站</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginLeft: 16 }}>Stack Overflow · 2008 年起</span>
        </div>
        {Array.from({ length: 20 }).map((_, i) => {
          const col = i % 4;
          const leave = pr(t, b0 + 0.3 + random(`lv${i}`) * BAR * 1.1, 0.6, EIO);
          if (leave >= 1 && i !== 5) return null;
          const y = 90 + Math.floor(i / 4) * 110;
          const x0 = 30 + col * 285;
          const stay = i === 5;
          return (
            <div key={i} style={{ position: "absolute", left: stay ? x0 : lerp(x0, 1500 - SO.x, leave), top: stay ? y : lerp(y, -SO.y + 330, leave), transform: `scale(${stay ? 1 : lerp(1, 0.2, leave)})`, opacity: stay ? 1 : 1 - leave * 0.6 }}>
              <QCard seed={i} w={260} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 1280, top: 140, transform: "scale(0.5)", transformOrigin: "0 0", opacity: pr(t, b0 + 0.2, 0.4) }}>
        <ChatBox t={t} w={760} h={300} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 520, fontFamily: FONT, opacity: pr(t, b0 + 0.3, 0.4) }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.sub }}>每月新提问</div>
        <Odometer value={count} size={100} color={count < 5000 ? C.red : C.fg} />
        <div style={{ fontSize: 24, fontWeight: 700, color: C.muted, marginTop: 4 }}>2022 年 11 月 → 2026 年 9 月</div>
      </div>
      <Lines at={b0} a={CH4.s27[0]} out={bar(54) - 0.05} />
      <Src at={b0 + 0.3}>每月新问题：2022-11 约 10.9 万 → 2026-09 约 971（Stack Exchange API，本片自取）· 2014 年峰值 20.7 万，ChatGPT 之前已经在跌</Src>
    </AbsoluteFill>
  );
};

// ── 28 · bars 54–56: layoff notices fall; heads go up ──
export const Notices: React.FC = () => {
  const t = useT();
  const b0 = bar(54);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.red} at={[55, 50]} strength={0.1} />
      {Array.from({ length: 16 }).map((_, i) => {
        const start = b0 + 0.1 + i * 0.18;
        const p = pr(t, start, 1.6, (x) => x);
        if (p <= 0) return null;
        const x = 520 + random(`nx${i}`) * 1250;
        const rot = (random(`nr${i}`) - 0.5) * 30 + Math.sin(t * 2 + i) * 8;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: lerp(-260, 760 + random(`ny${i}`) * 80, Math.min(1, p)), transform: `rotate(${rot}deg)`, width: 190, padding: "14px 16px", borderRadius: 6, background: "#ece6da", color: C.ink, fontFamily: FONT, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", opacity: 0.95 }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>裁员通知</div>
            <div style={{ marginTop: 8, height: 5, width: "85%", background: "rgba(25,35,31,0.3)", borderRadius: 3 }} />
            <div style={{ marginTop: 6, height: 5, width: "65%", background: "rgba(25,35,31,0.3)", borderRadius: 3 }} />
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: "#c0392b" }}>原因：AI</div>
          </div>
        );
      })}
      <Crowd t={t} ground={800} open={pr(t, b0 + 0.6, 0.6, EO)} asks={[b0 + 1.6, b0 + 1.6 + BEAT, b0 + 1.6 + 2 * BEAT, b0 + 1.6 + 3 * BEAT]} />
      <div style={{ position: "absolute", left: 120, top: 440, fontFamily: FONT, opacity: pr(t, b0 + 0.4, 0.4) }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.sub }}>今年前 9 个月，美国公司公告</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Odometer value={lerp(0, 120136, pr(t, b0 + 0.4, 1.4, EIO))} size={84} color={C.red} />
          <span style={{ fontSize: 36, fontWeight: 900, color: C.red }}>人</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>写的原因是 AI</div>
      </div>
      <Lines at={b0} a={CH4.s28[0]} b={CH4.s28[1]} out={bar(56) - 0.05} />
      <Src at={b0 + 0.3}>Challenger, Gray & Christmas：2026 年 1–9 月美国公司公告裁员中以 AI 为由 120,136 人，是公司自己说的原因，不是统计出来的失业 · 中国 54% 的受访者担心被 AI 抢走工作（腾讯 × 复旦，网络调查）</Src>
    </AbsoluteFill>
  );
};

