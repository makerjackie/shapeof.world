import React from "react";
import { AbsoluteFill, random } from "remotion";
import { ClaudeGlyph, Clock, Coin, Dev, LampGlow, Receipt, RLine, Spark, TaskCard, Whale, WhaleGlyph, You } from "../art";
import { drift, EBACK, EIN, EIO, EO, keys, Lab, lerp, Odometer, pr, Source, Stamp, useT } from "../kit";
import { FONT, K, SANS } from "../theme";
import { barB, BEAT_B, CHORD } from "../timing";

// The "your time" chapter, on track B. One bar = 2.391 s, one beat = 0.598 s.

// ───────── 7. Your desk: AI hands in code. Would you use it as is? ─────────

export const LAMP_ON = 59.55;
export const ROW_AT = barB(2);
export const DESK_END = barB(4);

export const Desk: React.FC = () => {
  const t = useT();
  const lamp = pr(t, LAMP_ON, 0.25, EO);
  const pan = pr(t, ROW_AT - 0.35, 0.8, EIO); // camera tilts down from the desk to the row of programmers
  const exit = pr(t, DESK_END - 0.35, 0.55, EIN);
  const msg = pr(t, barB(0.75), 0.4, EBACK);
  const codeLines = Math.min(9, Math.max(0, (t - 60.2) * 6));
  const minutes = 9 * 60 + 41 + (t - 58) / 1.2; // the wall clock creeps forward with the ticks
  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 1900}px)` }}>
      <AbsoluteFill style={{ transform: `translateY(${-pan * 1080}px)` }}>
        {/* ── the desk ── */}
        <LampGlow on={lamp} x={640} y={180} />
        <div style={{ position: "absolute", left: 1500, top: 110, opacity: 0.4 + 0.6 * lamp }}>
          <Clock size={210} minutes={minutes} seconds={Math.floor((t - 56.4) / BEAT_B)} />
        </div>
        <div style={{ position: "absolute", left: 330, top: 420 + drift(t, 5, 3), opacity: 0.25 + 0.75 * lamp }}>
          <You size={380} gaze={t > barB(0.75) ? 0.9 : 0.3} worry={pr(t, barB(1.5), 0.6)} blinkT={t} />
        </div>
        {/* monitor */}
        <div style={{ position: "absolute", left: 930, top: 330, width: 680, height: 420, borderRadius: 26, background: "#1b1f25", boxShadow: "0 40px 90px rgba(0,0,0,0.6)", opacity: 0.3 + 0.7 * lamp }}>
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
      <Source o={pr(t, ROW_AT, 0.5) * (1 - exit)}>Stack Overflow（程序员问答网站）2026 开发者调查：拿到 AI 写的答案后"直接用"的占 9.6%，其余先在本地跑、对照代码、看测试（13,162 人回答，可多选）</Source>
    </AbsoluteFill>
  );
};

const SHIRTS = ["#3a6ea5", "#a5583a", "#4f8a5b", "#7a5aa5", "#a58a3a", "#3a8aa5", "#c0623e", "#5a6aa5", "#8a4f6e", "#4a7f86"];
const OK_IDX = 6;

const DevRow: React.FC<{ t: number }> = ({ t }) => {
  const y0 = 1080 + 330;
  const lensAt = (i: number) => ROW_AT + 0.45 + i * 0.07;
  const okP = pr(t, ROW_AT + 0.9, 0.4, EBACK);
  const bob = (i: number) => (t > barB(3) ? Math.sin(t * 5 + i) * 6 : 0);
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
        <Clock size={150} minutes={9 * 60 + 41 + (t - 58) / 1.2} seconds={Math.floor((t - 56.4) / BEAT_B)} />
      </div>
    </>
  );
};

// ───────── 8. The loop for one task: you → AI → back to you → check 5 minutes → pass or send back ─────────

export const LOOP_AT = barB(4);
export const LOOP_END = barB(8);
type Round = { r0: number; ok: boolean };
export const ROUNDS_C: Round[] = [{ r0: barB(4), ok: true }];
export const ROUNDS_D: Round[] = [
  { r0: barB(4), ok: false },
  { r0: barB(6), ok: true },
];
// Phase times inside a round (seconds after r0); the verdict lands on the next downbeat.
export const PH = { toAI: 0.45, work: 0.95, back: 1.4, check: 2.2, verdict: barB(1) - barB(0) };

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
        {who === "c" ? <Spark t={t} size={220} mood={state > 0 ? "party" : "happy"} beat={BEAT_B} /> : <Whale t={t} size={280} mood={state < 0 ? "sweat" : "happy"} beat={BEAT_B} />}
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

export const WALL_AT = barB(8);
export const WALL_END = barB(12);
const SOLVED_C = [62, 23, 9, 4, 1, 1];
const SOLVED_D = [46, 25, 12, 8, 5, 2, 1, 1];
export const ROUND_AT = [barB(8), barB(8.5), barB(9), barB(9.25), barB(9.5), barB(9.75), barB(10), barB(10.25)];
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
  const plus = pr(t, barB(10.5), 0.35, EBACK);
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

// ───────── 10. Hours, then the price of one of your hours ─────────

export const HOURS_AT = barB(12);
export const PRICE_AT = barB(14);
export const HUSH_AT = barB(15);
export const HOURS_END = barB(16);

export const Hours: React.FC = () => {
  const t = useT();
  const enter = pr(t, HOURS_AT - 0.1, 0.4, EO);
  const spin = pr(t, HOURS_AT + 0.1, 1.7, EIO);
  const coin = pr(t, PRICE_AT, 0.45, EBACK);
  const hush = pr(t, HUSH_AT, 1.6, EIO);
  const exit = pr(t, HOURS_END - 0.25, 0.35, EIN);
  const extra = pr(t, HOURS_AT + 1.9, 0.5, EO);
  const side = pr(t, PRICE_AT - 0.2, 0.5, EIO); // the clocks slide apart to make room for the coin
  const block = 50;
  const gap = 8;
  const rowW = 18 * (block + gap) - gap;
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit), transform: `scale(${1 + hush * 0.08})`, transformOrigin: "960px 700px" }}>
      {[
        { x: 520 - side * 150, h: 13.5 * spin, mins: 810 * spin, c: K.claudeHi, name: "Claude Opus 5.5" },
        { x: 1400 + side * 150, h: 18 * spin, mins: 1080 * spin, c: K.deepseekHi, name: "DeepSeek V4.1 Flash" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x - 200, top: 280, width: 400, opacity: 1 - hush * 0.5 }}>
          <Lab size={34} color={s.c} w={900} style={{ textAlign: "center", width: 400 }}>
            {s.name}
          </Lab>
          <div style={{ margin: "14px auto 0", width: 320 }}>
            <Clock size={320} minutes={s.mins} seconds={Math.floor((t - HOURS_AT) / BEAT_B)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <Odometer value={s.h} decimals={1} size={100} color={K.timeHi} />
            <Lab size={40} color={K.sub}>小时</Lab>
          </div>
        </div>
      ))}
      {/* hour blocks: one block = one hour */}
      <div style={{ position: "absolute", left: 960 - rowW / 2 - 120, top: 862, opacity: (1 - hush * 0.6) * pr(t, HOURS_AT + 0.4, 0.4) }}>
        {[13.5, 18].map((n, row) => (
          <div key={row} style={{ display: "flex", gap, marginBottom: 12, height: block * 0.8 }}>
            {Array.from({ length: 18 }).map((_, i) => {
              const fill = Math.max(0, Math.min(1, n * spin - i));
              const isExtra = row === 1 && i >= 13.5;
              return (
                <div key={i} style={{ width: block, height: block * 0.8, borderRadius: 7, background: "rgba(244,240,232,0.06)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: isExtra && extra > 0 ? K.red : row === 0 ? K.claude : K.deepseek, opacity: 0.9 }} />
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ position: "absolute", left: rowW + 24, top: 18, opacity: extra, whiteSpace: "nowrap" }}>
          <Lab size={40} color={K.red} w={900}>多 4.5 小时</Lab>
          <Lab size={28} color={K.sub} w={700}>= 54 次 × 5 分钟</Lab>
        </div>
      </div>
      {/* the price of one hour */}
      {coin > 0 ? (
        <div style={{ position: "absolute", left: 960, top: lerp(-200, 470, coin), opacity: 1 - hush * 0.4 }}>
          <div style={{ transform: "scale(1.8)" }}>
            <Coin w={190} />
          </div>
          <div style={{ position: "absolute", left: -240, top: 90, width: 480, textAlign: "center" }}>
            <Lab size={34} color={K.sub} style={{ textAlign: "center" }}>软件业平均时薪</Lab>
            <Lab size={110} color={K.gold} w={900} style={{ textAlign: "center", letterSpacing: -2 }}>
              约 ¥119
            </Lab>
            <Lab size={34} color={K.sub} style={{ textAlign: "center" }}>
              每小时
            </Lab>
          </div>
        </div>
      ) : null}
      <Source o={1 - exit}>
        时间 = 检查次数 × 5 分钟（假设）· 时薪：国家统计局 2025 年城镇非私营单位"信息传输、软件和信息技术服务业"平均工资 248,752 元 ÷ 12 ÷ 21.75 天 ÷ 8 小时（人社部发〔2025〕2 号的折算办法），约 ¥119（推算）
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 11. The bill: two receipts print at once; your time is the longest line by far ─────────

export const BILL_AT = barB(16);
export const BILL_END = CHORD[0];
const KY = 0.2; // px per yuan on the bars
export const BILL_C: RLine[] = [
  { k: "head", text: "CLAUDE OPUS 5.5", sub: "包月用满 · 100 个编程任务" },
  { k: "bar", l: "token", r: "¥346", color: K.claude, h: 346 * KY },
  { k: "bar", l: "你的时间 · 13.5 小时", r: "¥1,610", color: K.time, h: 1610 * KY, note: "检查 162 次" },
  { k: "rule" },
  { k: "total", l: "合计", r: "¥1,956", color: K.greenDeep },
];
export const BILL_D: RLine[] = [
  { k: "head", text: "DEEPSEEK V4.1 FLASH", sub: "闲时价 · 100 个编程任务" },
  { k: "bar", l: "token", r: "¥213", color: K.deepseek, h: 213 * KY },
  { k: "bar", l: "你的时间 · 18 小时", r: "¥2,144", color: K.time, h: 2144 * KY, note: "检查 216 次" },
  { k: "rule" },
  { k: "total", l: "合计", r: "¥2,357", color: K.ink },
];
// line start times and how long each feeds
export const BILL_LINES: [number, number][] = [
  [BILL_AT, 0.12],
  [BILL_AT + BEAT_B, 0.3],
  [BILL_AT + 2 * BEAT_B, barB(18) - BILL_AT - 2 * BEAT_B - 0.1],
  [barB(18), 0.1],
  [barB(18) + 0.12, 0.2],
];
export const SHARE_AT = barB(19.5);
export const SAVE_AT = barB(21.5);

const billPrinted = (t: number) => BILL_LINES.reduce((a, [s, d]) => a + pr(t, s, d, (z) => z), 0);

export const Bill: React.FC = () => {
  const t = useT();
  const enter = pr(t, BILL_AT - 0.6, 0.6, EO);
  const n = billPrinted(t);
  const cam = keys(t, [[BILL_AT, 1.3], [barB(17.4), 1.18], [barB(18.4), 0.8], [barB(23), 0.78], [BILL_END, 0.72]], EIO);
  const out = pr(t, BILL_END - 0.6, 0.8, EIO);
  const tot = pr(t, barB(18), 0.5, EBACK);
  const cx = 680;
  const dx = 1270;
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <AbsoluteFill style={{ transform: `scale(${cam}) translateY(${-out * 140}px)`, transformOrigin: "960px 1050px", opacity: 1 - out * 0.85 }}>
        <div style={{ position: "absolute", left: cx - 295, top: 1050 }}>
          <Receipt lines={BILL_C} printed={n} w={520} s={1.12} accent={K.claude} label="CLAUDE" glow={pr(t, SAVE_AT, 0.4) * 0.6} />
        </div>
        <div style={{ position: "absolute", left: dx - 295, top: 1050 }}>
          <Receipt lines={BILL_D} printed={n} w={520} s={1.12} accent={K.deepseek} label="DEEPSEEK" />
        </div>
        {/* share stamps on the time bars */}
        <div style={{ position: "absolute", left: cx - 150, top: 1050 - 360 }}>
          <Stamp t={t} at={SHARE_AT} color={K.time} size={64} rot={-7}>
            占 8 成
          </Stamp>
        </div>
        <div style={{ position: "absolute", left: dx - 150, top: 1050 - 400 }}>
          <Stamp t={t} at={SHARE_AT + 0.2} color={K.time} size={64} rot={6}>
            占 9 成
          </Stamp>
        </div>
      </AbsoluteFill>
      {/* the two totals, big, in screen space */}
      <div style={{ position: "absolute", left: 110, top: 400, opacity: Math.min(1, tot * 2) * (1 - out), transform: `translateY(${(1 - tot) * 30}px)` }}>
        <Lab size={30} color={K.claudeHi} w={900}>Claude Opus 5.5</Lab>
        <Lab size={26} color={K.claudeHi} w={700}>包月用满</Lab>
        <Lab size={30} color={K.sub} w={700} style={{ marginTop: 6 }}>合计</Lab>
        <Lab size={112} color={K.green} w={900} style={{ letterSpacing: -3 }}>¥1,956</Lab>
        <div style={{ marginTop: 18, marginLeft: 6 }}>
          <Stamp t={t} at={SAVE_AT} color={K.green} size={66} rot={-7}>
            便宜 ¥400
          </Stamp>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1480, top: 400, opacity: Math.min(1, tot * 2) * (1 - out), transform: `translateY(${(1 - tot) * 30}px)` }}>
        <Lab size={30} color={K.deepseekHi} w={900}>DeepSeek V4.1 Flash</Lab>
        <Lab size={26} color={K.deepseekHi} w={700}>闲时价</Lab>
        <Lab size={30} color={K.sub} w={700} style={{ marginTop: 6 }}>合计</Lab>
        <Lab size={112} color={K.fg} w={900} style={{ letterSpacing: -3 }}>¥2,357</Lab>
      </div>
      <div style={{ position: "absolute", left: 40, top: lerp(1200, 850, pr(t, BILL_AT + 0.5, 0.5, EBACK)) + out * 300 }}>
        <Spark t={t} size={150} mood={t > SAVE_AT ? "party" : "happy"} beat={BEAT_B} />
      </div>
      <div style={{ position: "absolute", left: 1680, top: lerp(1200, 860, pr(t, BILL_AT + 0.7, 0.5, EBACK)) + out * 300 }}>
        <Whale t={t} size={200} mood={t > SHARE_AT ? "sweat" : "happy"} beat={BEAT_B} />
      </div>
      <Source o={(1 - out) * pr(t, BILL_AT + 0.5, 0.5)}>
        token：AA 实测每轮花费 × 检查次数 · Opus 按 Max 包月用满折算（÷36；按 API 原价约 ¥1.25 万）· DeepSeek 按闲时价 · 你的时间 = 小时 × ¥119 · 均为推算，按 2026-10-22 中间价换算
      </Source>
    </AbsoluteFill>
  );
};
