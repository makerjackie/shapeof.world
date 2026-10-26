// v11 look test: the film as a race of "who is cheapest". Five lanes, one per flagship; the cheapest runs on top.
// Each term of the real price (单价 × 用量 ÷ 包月倍数 + 你的时间) is one more lap: bars change length, rows overtake.
// This sample is the opening, the title and the first two laps. Timed in film bars on the 千年之后 edit.
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { barAt, bf, sec } from "../v10/bars";
import { FONT, K, MONO, SERIF } from "../v10/theme";

export const RACE_FRAMES = bf(18.6);

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const r = (b: number, a: number, z: number, e: (v: number) => number = EIO) => e(clamp01((b - a) / (z - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SHADOW = "0 2px 6px rgba(0,0,0,0.55)";

type Id = "claude" | "chatgpt" | "kimi" | "glm" | "deepseek";
const M: { id: Id; name: string; model: string; color: string }[] = [
  { id: "claude", name: "Claude", model: "Opus 5.5", color: "#ff9a5c" },
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", color: "#6fd6bd" },
  { id: "kimi", name: "Kimi", model: "K3.1 Pro", color: "#ad9bff" },
  { id: "glm", name: "智谱", model: "GLM-5.3", color: "#5cc8f2" },
  { id: "deepseek", name: "DeepSeek", model: "V4.1 Flash", color: "#7a94ff" },
];
const PRICE: Record<Id, number> = { claude: 20, chatgpt: 50, kimi: 10, glm: 4.4, deepseek: 1.19 };
const TASK: Record<Id, number> = { claude: 5.98, chatgpt: 3.26, kimi: 2.11, glm: 2.01, deepseek: 0.26 };

// ---------- the lanes ----------

const X0 = 600; // bar start
const BAR_MAX = 1000; // px for the largest value of the lap
const ROW_H = 116;
const ROW_GAP = 14;
const TOP = 350;

const rankOf = (vals: Record<Id, number>) => {
  const order = [...M].sort((a, b) => vals[a.id] - vals[b.id]).map((m) => m.id);
  return Object.fromEntries(order.map((id, i) => [id, i])) as Record<Id, number>;
};
const START: Record<Id, number> = { claude: 0, chatgpt: 1, kimi: 2, glm: 3, deepseek: 4 };
const R1 = rankOf(PRICE);
const R2 = rankOf(TASK);

const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);

const Lanes: React.FC<{ bar: number }> = ({ bar }) => {
  const on = r(bar, 6.4, 6.9, EO) * (1 - r(bar, 18.2, 18.6));
  if (on <= 0) return null;
  // lap 1: bars race out to the list price; lap 2: they change to the cost of one task
  const grow = r(bar, 7.1, 8.3, EO);
  const morph = r(bar, 12.6, 13.6);
  const sort1 = r(bar, 8.7, 9.3);
  const sort2 = r(bar, 13.9, 14.5);
  const lap2 = morph > 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on }}>
      {/* unit, top right of the track */}
      <div style={{ position: "absolute", right: 140, top: TOP - 58, fontFamily: FONT, fontSize: 26, fontWeight: 600, color: K.sub, whiteSpace: "nowrap" }}>
        <span style={{ opacity: 1 - r(bar, 12.4, 12.8) }}>每 100 万个 token 的价格（美元）</span>
        <span style={{ position: "absolute", right: 0, opacity: r(bar, 13.0, 13.4) }}>做一道难题的花费（美元）</span>
      </div>
      {M.map((m) => {
        const rank = lerp(lerp(START[m.id], R1[m.id], sort1), R2[m.id], sort2);
        const y = TOP + rank * (ROW_H + ROW_GAP);
        const v1 = PRICE[m.id] * grow;
        const v = lap2 ? lerp(PRICE[m.id], TASK[m.id], morph) : v1;
        const w1 = (PRICE[m.id] / 50) * BAR_MAX * grow;
        const w2 = (TASK[m.id] / 6) * BAR_MAX;
        const w = Math.max(6, lerp(w1, w2, morph));
        const shownRank = Math.round(rank) + 1;
        const leader = shownRank === 1 && (sort1 > 0.9 || sort2 > 0.9);
        const hl =
          (m.id === "claude" || m.id === "deepseek" ? Math.min(r(bar, 9.6, 9.9), 1 - r(bar, 11.2, 11.5)) : 0) +
          (m.id === "claude" || m.id === "deepseek" ? Math.min(r(bar, 15.0, 15.3), 1 - r(bar, 18.0, 18.3)) : 0) +
          (m.id === "chatgpt" ? Math.min(r(bar, 13.9, 14.2), 1 - r(bar, 14.8, 15.0)) : 0);
        const dim = Math.max(Math.min(r(bar, 9.6, 9.9), 1 - r(bar, 11.2, 11.5)), Math.min(r(bar, 15.0, 15.3), 1 - r(bar, 18.0, 18.3))) * (1 - hl);
        return (
          <div key={m.id} style={{ position: "absolute", left: 0, top: y, width: 1920, height: ROW_H, opacity: 1 - 0.55 * dim }}>
            <div style={{ position: "absolute", left: 120, right: 120, top: 0, height: ROW_H, borderRadius: 16, background: `rgba(255,255,255,${0.035 + 0.05 * hl})`, border: `1.5px solid rgba(255,255,255,${0.04 + 0.2 * hl})` }} />
            <div style={{ position: "absolute", left: 150, top: 0, height: ROW_H, display: "flex", alignItems: "center", fontFamily: MONO, fontSize: 40, fontWeight: 700, color: leader ? K.gold : "rgba(244,240,232,0.45)" }}>{shownRank}</div>
            <div style={{ position: "absolute", left: 230, top: 0, height: ROW_H, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: m.color, boxShadow: `0 0 16px ${m.color}` }} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, color: K.fg, lineHeight: 1.1 }}>{m.name}</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: K.muted }}>{m.model}</div>
              </div>
            </div>
            <div style={{ position: "absolute", left: X0, top: ROW_H / 2 - 1, width: BAR_MAX, height: 2, background: "rgba(255,255,255,0.06)" }} />
            <div
              style={{
                position: "absolute",
                left: X0,
                top: ROW_H / 2 - 29,
                width: w,
                height: 58,
                borderRadius: 12,
                background: `linear-gradient(90deg, ${m.color}33, ${m.color})`,
                boxShadow: `0 0 22px ${m.color}44`,
              }}
            />
            <div style={{ position: "absolute", left: X0 + w + 22, top: 0, height: ROW_H, display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: FONT, fontSize: 56, fontWeight: 900, color: K.fg, textShadow: SHADOW, opacity: clamp01(grow * 3) }}>{money(v)}</span>
              {leader ? <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: "#14110a", background: K.gold, borderRadius: 6, padding: "3px 10px" }}>最便宜</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- the formula across the top: which term we are on ----------

const TERMS = ["单价", "× 用量", "÷ 包月倍数", "＋ 你的时间"];
const Formula: React.FC<{ bar: number }> = ({ bar }) => {
  const on = r(bar, 5.2, 5.8, EO) * (1 - r(bar, 18.2, 18.6));
  if (on <= 0) return null;
  const active = bar < 11.2 ? 0 : 1;
  const top = lerp(700, 70, r(bar, 5.9, 6.6));
  const size = lerp(54, 40, r(bar, 5.9, 6.6));
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, top, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 22, opacity: on, fontFamily: FONT, fontSize: size, fontWeight: 800 }}>
      <span style={{ color: K.fg }}>真实价格 ＝</span>
      {TERMS.map((t, i) => {
        const lit = bar >= 6.2 && i === active;
        const done = bar >= 6.2 && i < active;
        return (
          <span key={t} style={{ color: lit ? K.gold : done ? K.fg : "rgba(244,240,232,0.28)", borderBottom: lit ? `3px solid ${K.gold}` : "3px solid transparent", paddingBottom: 4 }}>
            {t}
          </span>
        );
      })}
    </div>
  );
};

// ---------- type ----------

// A line that slams in: big, sharp, on the beat.
const Slam: React.FC<{ at: number; out: number; children: React.ReactNode; top: number; size: number; color?: string }> = ({ at, out, children, top, size, color = K.fg }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [bf(at), bf(at) + 9], [0, 1], { ...CL, easing: EO });
  const x = interpolate(frame, [bf(out) - 8, bf(out)], [1, 0], CL);
  if (k <= 0 || x <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, top, textAlign: "center", fontFamily: FONT, fontSize: size, fontWeight: 900, color, opacity: k * x, transform: `scale(${1.16 - 0.16 * k})`, filter: `blur(${(1 - k) * 12}px)`, textShadow: SHADOW, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

const Fade: React.FC<{ at: number; out: number; children: React.ReactNode; top: number; size: number; color?: string; weight?: number }> = ({ at, out, children, top, size, color = K.fg, weight = 800 }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [bf(at), bf(at) + 10], [0, 1], { ...CL, easing: EO });
  const x = interpolate(frame, [bf(out) - 8, bf(out)], [1, 0], CL);
  if (k <= 0 || x <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, top, textAlign: "center", fontFamily: FONT, fontSize: size, fontWeight: weight, color, opacity: k * x, transform: `translateY(${(1 - k) * 18}px)`, textShadow: SHADOW, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

const c = (t: string, color: string) => <span style={{ color }}>{t}</span>;

export const Race: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], CL);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #111827 0%, #080b12 55%, #040508 100%)", opacity: fadeIn }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.82} />

      {/* ---- opening: the claim, then the question ---- */}
      <Slam at={0.0} out={2.25} top={300} size={120}>
        全球最聪明的 AI：{c("Claude", "#ff9a5c")}
      </Slam>
      <Fade at={0.35} out={2.25} top={450} size={32} color={K.sub} weight={600}>
        Artificial Analysis 智能指数 · 全球第 1
      </Fade>
      <Slam at={1.15} out={2.25} top={590} size={120}>
        最便宜的 AI 之一：{c("DeepSeek", "#7a94ff")}
      </Slam>
      <Fade at={1.5} out={2.25} top={740} size={32} color={K.sub} weight={600}>
        每 100 万个 token 只要 $1.19
      </Fade>
      <Slam at={2.35} out={4.0} top={330} size={104}>
        最聪明的，能比最便宜的
      </Slam>
      <Slam at={2.85} out={4.0} top={500} size={170} color={K.gold}>
        还便宜吗？
      </Slam>

      {/* ---- title ---- */}
      <Fade at={4.1} out={5.95} top={330} size={150} weight={700}>
        <span style={{ fontFamily: SERIF, letterSpacing: 16 }}>AI 的真实价格</span>
      </Fade>
      <Fade at={4.5} out={5.95} top={540} size={40} color={K.gold} weight={700}>
        <span style={{ letterSpacing: 10 }}>第 1 集 · 文字 AI</span>
      </Fade>
      <Formula bar={bar} />

      {/* ---- lap 1: list price ---- */}
      <Fade at={6.2} out={9.5} top={160} size={58}>
        先看单价：每 100 万个 token，多少钱？
      </Fade>
      <Fade at={6.6} out={9.5} top={242} size={30} color={K.sub} weight={600}>
        AI 按 token 收钱，1 个 token 大约 1 个汉字
      </Fade>
      <Fade at={9.6} out={11.4} top={170} size={66}>
        按单价，Claude 是 DeepSeek 的 {c("17 倍", K.gold)}
      </Fade>

      {/* ---- lap 2: one task ---- */}
      <Fade at={11.5} out={14.9} top={160} size={58}>
        可 AI 干活，按事算：做一道难题，花多少？
      </Fade>
      <Fade at={12.0} out={14.9} top={242} size={30} color={K.sub} weight={600}>
        有的想得久、写得长，用掉的 token 多；有的想得少
      </Fade>
      <Fade at={15.0} out={18.3} top={170} size={66}>
        按量付钱，DeepSeek 还是第一：Claude 是它的 {c("23 倍", K.gold)}
      </Fade>

      <Lanes bar={bar} />

      <Fade at={6.6} out={18.3} top={1028} size={22} color="rgba(244,240,232,0.55)" weight={500}>
        单价：各家官方输出价（2026-10，DeepSeek 为高峰价）；做一道题：Artificial Analysis 智能指数每道题平均花费，各模型开到最强档
      </Fade>
    </AbsoluteFill>
  );
};
