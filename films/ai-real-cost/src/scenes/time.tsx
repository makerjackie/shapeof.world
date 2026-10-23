import React from "react";
import { AbsoluteFill, random } from "remotion";
import { ClaudeGlyph, Clock, Dev, LampGlow, Spark, TaskCard, Whale, WhaleGlyph, You } from "../art";
import { drift, EBACK, EIN, EIO, EO, Lab, lerp, Odometer, pr, Source, useT } from "../kit";
import { FONT, K, SANS } from "../theme";
import { BAR, BEAT, FB } from "../timing";

export * from "./time2";

// The "your time" chapter: film bars 28–72 (track 40–64, 56–76). One bar = 2.150 s, one beat = 0.538 s.

// ───────── 7. Your desk: AI hands in code. Would you use it as is? ─────────

export const LAMP_ON = FB(28);
export const ROW_AT = FB(32);
export const DESK_END = FB(36);
const TICK0 = FB(26); // the wall clock starts ticking (on the beat) two bars before the lamp

export const Desk: React.FC = () => {
  const t = useT();
  const lamp = pr(t, LAMP_ON, 0.25, EO);
  const pan = pr(t, ROW_AT - 0.35, 0.8, EIO); // camera tilts down from the desk to the row of programmers
  const exit = pr(t, DESK_END - 0.35, 0.55, EIN);
  const msg = pr(t, FB(28.75), 0.4, EBACK);
  const almost = pr(t, FB(30), 0.4, EBACK);
  const codeLines = Math.min(9, Math.max(0, (t - LAMP_ON - 0.1) * 6));
  const minutes = 9 * 60 + 41 + (t - TICK0) / 1.2; // the wall clock creeps forward with the ticks
  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 1900}px)` }}>
      <AbsoluteFill style={{ transform: `translateY(${-pan * 1080}px)` }}>
        {/* ── the desk ── */}
        <LampGlow on={lamp} x={640} y={180} />
        <div style={{ position: "absolute", left: 1500, top: 110, opacity: lamp }}>
          <Clock size={210} minutes={minutes} seconds={Math.floor((t - TICK0) / BEAT)} />
        </div>
        <div style={{ position: "absolute", left: 330, top: 420 + drift(t, 5, 3), opacity: lamp }}>
          <You size={380} gaze={t > FB(28.75) ? 0.9 : 0.3} worry={pr(t, FB(30), 0.6)} blinkT={t} />
        </div>
        {/* monitor */}
        <div style={{ position: "absolute", left: 930, top: 330, width: 680, height: 420, borderRadius: 26, background: "#1b1f25", boxShadow: "0 40px 90px rgba(0,0,0,0.6)", opacity: lamp }}>
          <div style={{ position: "absolute", inset: 18, borderRadius: 14, background: "#0b0e12", overflow: "hidden" }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 30 + (i % 3) * 28,
                  top: 26 + i * 34,
                  height: 14,
                  width: (120 + random(`cl${i}`) * 300) * Math.min(1, Math.max(0, codeLines - i)),
                  borderRadius: 7,
                  background: [K.claudeHi, "#7fd1b9", "#c9c3b5", "#8fb4ff"][i % 4],
                  opacity: 0.8,
                }}
              />
            ))}
            {/* one line is almost right: it turns red with a squiggle */}
            <div style={{ position: "absolute", left: 58, top: 26 + 4 * 34 - 8, width: 330, height: 30, borderRadius: 6, background: `rgba(255,90,95,${0.28 * almost})` }} />
            <svg width={330} height={14} style={{ position: "absolute", left: 58, top: 26 + 4 * 34 + 20, opacity: almost }}>
              <path d={`M0 7 ${Array.from({ length: 22 }, (_, k) => `Q${k * 15 + 7.5} ${k % 2 ? 14 : 0} ${(k + 1) * 15} 7`).join(" ")}`} stroke={K.red} strokeWidth={3} fill="none" />
            </svg>
            <div style={{ position: "absolute", left: 400, top: 26 + 4 * 34 - 12, transform: `scale(${almost})`, transformOrigin: "0 50%", padding: "4px 14px", borderRadius: 10, background: K.red, fontFamily: SANS, fontWeight: 900, fontSize: 26, color: "#fff", whiteSpace: "nowrap" }}>
              差一点
            </div>
            <div style={{ position: "absolute", right: 24, bottom: 22, transform: `scale(${msg})`, transformOrigin: "100% 100%", padding: "12px 22px", borderRadius: 16, background: K.paper, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: K.ink, whiteSpace: "nowrap" }}>
              AI：写好了 ✓
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 1230, top: 750, width: 80, height: 40, background: "#15181c" }} />
        {/* desk top */}
        <div style={{ position: "absolute", left: -100, right: -100, top: 780, height: 320, background: "linear-gradient(180deg, #3a2a1e, #1c140e 70%)", boxShadow: "0 -2px 0 rgba(255,220,180,0.12)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 780, height: 320, background: `radial-gradient(ellipse 50% 60% at 40% 0%, rgba(255,214,150,${0.18 * lamp}), transparent 70%)` }} />

        {/* ── one screen down: ten programmers ── */}
        <DevRow t={t} />
      </AbsoluteFill>
      <Source o={pr(t, FB(30), 0.5) * (1 - pr(t, ROW_AT - 0.4, 0.3))}>Stack Overflow（程序员问答网站）2025 开发者调查：66% 的人说，用 AI 最大的烦恼是答案"差一点就对"（25,332 人回答）</Source>
      <Source o={pr(t, ROW_AT, 0.5) * (1 - exit)}>Stack Overflow 2026 开发者调查"拿到 AI 生成的开发答案，使用前你通常会做什么？"：选"直接用"的 9.6%（13,162 人回答，可多选）</Source>
    </AbsoluteFill>
  );
};

const SHIRTS = ["#3a6ea5", "#a5583a", "#4f8a5b", "#7a5aa5", "#a58a3a", "#3a8aa5", "#c0623e", "#5a6aa5", "#8a4f6e", "#4a7f86"];
const OK_IDX = 6;

const DevRow: React.FC<{ t: number }> = ({ t }) => {
  const y0 = 1080 + 330;
  const lensAt = (i: number) => ROW_AT + 0.45 + i * 0.07;
  const okP = pr(t, ROW_AT + 0.9, 0.4, EBACK);
  const bob = (i: number) => (t > FB(34) ? Math.sin(t * 5 + i) * 6 : 0);
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => {
        const lens = i === OK_IDX ? 0 : pr(t, lensAt(i), 0.35, EBACK);
        return (
          <div key={i} style={{ position: "absolute", left: 110 + i * 172, top: y0 + bob(i) }}>
            <Dev size={165} lens={lens} shirt={SHIRTS[i]} ok={i === OK_IDX ? okP : 0} hair={i % 4 === 3 ? "#5b3a24" : "#2a2420"} />
          </div>
        );
      })}
      {/* braces under the row */}
      <div style={{ position: "absolute", left: 110, top: y0 + 245, width: 172 * OK_IDX - 20, borderTop: `5px solid ${K.time}`, opacity: pr(t, ROW_AT + 1.0, 0.4) }} />
      <div style={{ position: "absolute", left: 110 + 172 * (OK_IDX + 1), top: y0 + 245, width: 172 * 3 - 20, borderTop: `5px solid ${K.time}`, opacity: pr(t, ROW_AT + 1.0, 0.4) }} />
      <div style={{ position: "absolute", left: 110 + 172 * OK_IDX, top: y0 + 245, width: 152, borderTop: `5px solid ${K.green}`, opacity: pr(t, ROW_AT + 1.0, 0.4) }} />
      <div style={{ position: "absolute", left: 470, top: y0 + 270, opacity: pr(t, ROW_AT + 1.1, 0.4) }}>
        <Lab size={46} color={K.timeHi} w={900}>9 个：先检查</Lab>
      </div>
      <div style={{ position: "absolute", left: 110 + 172 * OK_IDX - 20, top: y0 + 270, opacity: pr(t, ROW_AT + 1.2, 0.4) }}>
        <Lab size={46} color={K.green} w={900}>1 个：直接用</Lab>
      </div>
      <div style={{ position: "absolute", left: 1600, top: y0 - 330, opacity: pr(t, ROW_AT + 0.3, 0.4) }}>
        <Clock size={150} minutes={9 * 60 + 41 + (t - TICK0) / 1.2} seconds={Math.floor((t - TICK0) / BEAT)} />
      </div>
    </>
  );
};

// ───────── 8. The loop for one task: you → AI → back to you → check 5 minutes → pass or send back ─────────

export const LOOP_AT = FB(36);
export const LOOP_END = FB(40);
type Round = { r0: number; ok: boolean };
export const ROUNDS_C: Round[] = [{ r0: FB(36), ok: true }];
export const ROUNDS_D: Round[] = [
  { r0: FB(36), ok: false },
  { r0: FB(38), ok: true },
];
// Phase times inside a round (seconds after r0); the verdict lands on the next downbeat.
export const PH = { toAI: 0.45, work: 0.9, back: 1.3, check: 2.0, verdict: BAR };

const X_YOU = 220;
const X_AI = 740;
const X_CHK = 1180;

const cardPos = (t: number, rounds: Round[]) => {
  // returns [x, yOffset, state] of the travelling card
  let x = X_YOU;
  let dy = 0;
  let state = 0;
  for (const r of rounds) {
    const d = t - r.r0;
    if (d < 0) break;
    if (d < PH.toAI) x = lerp(r === rounds[0] ? X_YOU : X_CHK, X_AI, EIO(d / PH.toAI));
    else if (d < PH.work) x = X_AI + Math.sin(d * 40) * 6;
    else if (d < PH.back) x = lerp(X_AI, X_CHK, EIO((d - PH.work) / (PH.back - PH.work)));
    else x = X_CHK;
    if (r !== rounds[0] && d < PH.toAI) dy = Math.sin((d / PH.toAI) * Math.PI) * 110;
    state = d >= PH.verdict ? (r.ok ? 1 : -1) : 0;
  }
  return [x, dy, state] as const;
};

const Lane: React.FC<{ t: number; y: number; rounds: Round[]; who: "c" | "d" }> = ({ t, y, rounds, who }) => {
  const [x, dy, state] = cardPos(t, rounds);
  const checks = rounds.filter((r) => t >= r.r0 + PH.check).length;
  const cur = [...rounds].reverse().find((r) => t >= r.r0);
  const sweep = cur ? pr(t, cur.r0 + PH.back, PH.check - PH.back, (z) => z) : 0;
  const verdictAt = cur ? cur.r0 + PH.verdict : 1e9;
  const vp = pr(t, verdictAt, 0.3, EBACK);
  const mins = checks * 5;
  const checking = sweep > 0 && sweep < 1;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1920 }}>
      {/* track */}
      <div style={{ position: "absolute", left: X_YOU + 90, width: X_CHK - X_YOU - 90, top: 0, borderTop: "4px dashed rgba(244,240,232,0.18)" }} />
      <div style={{ position: "absolute", left: X_YOU - 115, top: -150 }}>
        <You size={210} gaze={x > X_AI ? 0.8 : 0.2} worry={who === "d" && t > rounds[0].r0 + PH.verdict ? 0.8 : 0} blinkT={t + (who === "d" ? 1 : 0)} />
      </div>
      <div style={{ position: "absolute", left: who === "c" ? X_AI - 110 : X_AI - 140, top: who === "c" ? -110 : -105 }}>
        {who === "c" ? <Spark t={t} size={220} mood={state > 0 ? "party" : "happy"} beat={BEAT} /> : <Whale t={t} size={280} mood={state < 0 ? "sweat" : "happy"} beat={BEAT} />}
      </div>
      <div style={{ position: "absolute", left: X_CHK + 95, top: -110, transform: `scale(${checking ? 1.06 : 1})` }}>
        <Clock size={210} minutes={sweep * 5} arc={sweep} arcFrom={0} />
      </div>
      {/* the card */}
      <div style={{ position: "absolute", left: x - 65, top: -47 - dy }}>
        <TaskCard w={130} state={state} />
      </div>
      {/* verdict */}
      {cur && t >= verdictAt ? (
        <div style={{ position: "absolute", left: X_CHK + 320, top: -78, transform: `scale(${vp})`, transformOrigin: "0 50%", fontFamily: FONT, fontWeight: 900, fontSize: 68, color: state > 0 ? K.green : K.red, whiteSpace: "nowrap" }}>
          {state > 0 ? "✓ 通过" : "✗ 打回"}
        </div>
      ) : null}
      {/* tally */}
      <div style={{ position: "absolute", left: X_CHK + 320, top: 12, fontFamily: FONT, fontWeight: 700, fontSize: 36, color: K.timeHi, whiteSpace: "nowrap", opacity: checks > 0 ? 1 : 0 }}>
        检查 {checks} 次 · {mins} 分钟
      </div>
    </div>
  );
};

export const Loop: React.FC = () => {
  const t = useT();
  const enter = pr(t, LOOP_AT - 0.35, 0.6, EO);
  const exit = pr(t, LOOP_END - 0.45, 0.35, EIN);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 1900}px) scale(${1 - exit * 0.4})`, opacity: 1 - exit, transformOrigin: "960px 600px" }}>
      <div style={{ position: "absolute", left: 120, top: 300, opacity: enter }}>
        <Lab size={30} color={K.muted} w={500}>举个例子：同一个任务</Lab>
      </div>
      <Lane t={t} y={500} rounds={ROUNDS_C} who="c" />
      <Lane t={t} y={860} rounds={ROUNDS_D} who="d" />
      <div style={{ position: "absolute", left: X_CHK + 40, top: 300, opacity: enter }}>
        <Lab size={30} color={K.timeHi} w={700}>每次检查 5 分钟（假设，往少了算）</Lab>
      </div>
    </AbsoluteFill>
  );
};

// ───────── 9. 100 tasks each, checked until all pass ─────────

export const WALL_AT = FB(40);
export const WALL_END = FB(44);
const SOLVED_C = [62, 23, 9, 4, 1, 1];
const SOLVED_D = [46, 25, 12, 8, 5, 2, 1, 1];
export const ROUND_AT = [FB(40), FB(40.5), FB(41), FB(41.25), FB(41.5), FB(41.75), FB(42), FB(42.25)];
export const PLUS54_AT = FB(42.5);
const roundOf = (solved: number[], seed: string) => {
  const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => random(`${seed}${a}`) - random(`${seed}${b}`));
  const r = new Array(100).fill(0);
  let k = 0;
  solved.forEach((n, ri) => {
    for (let j = 0; j < n; j++) r[order[k++]] = ri;
  });
  return r;
};
const RC = roundOf(SOLVED_C, "c");
const RD = roundOf(SOLVED_D, "d");
// Checks done after round r (inclusive): sum of tasks still open before each round.
const checksAfter = (solved: number[], r: number) => {
  let open = 100;
  let sum = 0;
  for (let i = 0; i <= r && i < solved.length; i++) {
    sum += open;
    open -= solved[i];
  }
  return sum;
};

const Wall: React.FC<{ t: number; x0: number; rounds: number[]; solved: number[]; who: "c" | "d" }> = ({ t, x0, rounds, solved, who }) => {
  const cw = 50;
  const gap = 10;
  let rDone = -1;
  ROUND_AT.forEach((s, i) => {
    if (t >= s && i < solved.length) rDone = i;
  });
  const shown = rDone < 0 ? 0 : checksAfter(solved, rDone);
  const lastAt = rDone < 0 ? -9 : ROUND_AT[rDone];
  const firstPass = solved[0];
  return (
    <div style={{ position: "absolute", left: x0, top: 300 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        {who === "c" ? <ClaudeGlyph size={44} /> : <WhaleGlyph size={48} />}
        <Lab size={38} color={who === "c" ? K.claudeHi : K.deepseekHi} w={900}>
          {who === "c" ? "Claude Opus 5.5" : "DeepSeek V4.1 Flash"}
        </Lab>
      </div>
      <div style={{ position: "relative", width: 10 * cw + 9 * gap, height: 10 * cw * 0.72 + 9 * gap }}>
        {Array.from({ length: 100 }).map((_, i) => {
          const ri = rounds[i];
          const passAt = ROUND_AT[ri] + (i % 10) * 0.012 + Math.floor(i / 10) * 0.01;
          // flip animation around the pass time: scaleX 1 → 0 → 1 and the colour changes at the edge
          const f = pr(t, passAt, 0.22, (z) => z);
          const flip = f <= 0 || f >= 1 ? 1 : Math.abs(Math.cos(f * Math.PI));
          const state = f >= 0.5 ? 1 : 0;
          // being checked: a short purple flash on every open card at each round
          let checking = 0;
          for (let r = 0; r <= ri && r < ROUND_AT.length; r++) {
            const d = t - ROUND_AT[r];
            if (d >= -0.05 && d < 0.18) checking = 1 - d / 0.18;
          }
          return (
            <div key={i} style={{ position: "absolute", left: (i % 10) * (cw + gap), top: Math.floor(i / 10) * (cw * 0.72 + gap), outline: checking > 0 && state === 0 ? `3px solid rgba(180,140,255,${checking})` : undefined, borderRadius: 6 }}>
              <TaskCard w={cw} state={state} flip={flip} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 26, display: "flex", alignItems: "baseline", gap: 14, opacity: pr(t, WALL_AT, 0.3) }}>
        <Lab size={34} color={K.sub} w={700}>你检查了</Lab>
        <div style={{ transform: `scale(${1 + 0.1 * Math.max(0, 1 - (t - lastAt) / 0.2)})`, transformOrigin: "0 80%" }}>
          <Odometer value={shown} size={84} color={K.timeHi} />
        </div>
        <Lab size={34} color={K.sub} w={700}>次</Lab>
      </div>
      <div style={{ marginTop: 4, opacity: pr(t, ROUND_AT[0] + 0.3, 0.3) }}>
        <Lab size={30} color={K.green} w={700}>一次就做对：{firstPass} 个</Lab>
      </div>
    </div>
  );
};

export const Walls: React.FC = () => {
  const t = useT();
  const enter = pr(t, WALL_AT - 0.1, 0.45, EO);
  const exit = pr(t, WALL_END - 0.45, 0.35, EIN);
  const plus = pr(t, PLUS54_AT, 0.35, EBACK);
  return (
    <AbsoluteFill style={{ transform: `scale(${lerp(1.35, 1, enter) - exit * 0.1})`, opacity: Math.min(enter, 1 - exit), transformOrigin: "960px 560px" }}>
      <div style={{ position: "absolute", left: 960, top: 265, transform: "translateX(-50%)", opacity: enter }}>
        <Lab size={30} color={K.muted} w={700}>各做 100 个编程任务，查到全对为止</Lab>
      </div>
      <Wall t={t} x0={220} rounds={RC} solved={SOLVED_C} who="c" />
      <Wall t={t} x0={1110} rounds={RD} solved={SOLVED_D} who="d" />
      {plus > 0 ? (
        <div style={{ position: "absolute", left: 1560, top: 905, transform: `scale(${plus}) rotate(-6deg)`, fontFamily: FONT, fontWeight: 900, fontSize: 76, color: K.red, whiteSpace: "nowrap" }}>+54</div>
      ) : null}
      <Source o={1 - exit}>
        Artificial Analysis 编程智能体榜 v2.0（2026-10-22）：一次做对 61.7%（Claude Code + Opus 5.5）、46.3%（DeepSeek 自家工具 + V4.1 Flash）· 检查次数 = 100 ÷ 一次做对的比例（推算，取整）
      </Source>
    </AbsoluteFill>
  );
};

