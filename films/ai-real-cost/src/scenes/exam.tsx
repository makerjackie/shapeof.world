import React from "react";
import { AbsoluteFill } from "remotion";
import { Receipt, receiptHeight, RLine, Spark, Whale } from "../art";
import { drift, EBACK, EIN, EIO, EO, keys, Lab, lerp, Odometer, pr, Source, Stamp, useT } from "../kit";
import { FONT, K } from "../theme";
import { A_END_HIT, barA, BEAT_A } from "../timing";

// ───────── 5. Same exam, two receipts: 4 lines against 33 (one line = 5 million tokens) ─────────

const ROWS_C = 4;
const ROWS_D = 33;
const rowLabel = (i: number) => (i % 3 === 1 ? "换个思路……" : i % 3 === 2 ? "再想想……" : "思考 + 作答");

export const EXAM_C: RLine[] = [
  { k: "head", text: "CLAUDE OPUS 5.5", sub: "同一套考题 · 低推理档" },
  ...Array.from({ length: ROWS_C }, (): RLine => ({ k: "row", l: "思考 + 作答", r: "500 万" })),
  { k: "rule" },
  { k: "row", l: "得分", r: "42 分", big: true },
];
export const EXAM_D: RLine[] = [
  { k: "head", text: "DEEPSEEK V4 PRO", sub: "同一套考题 · 最高推理档" },
  ...Array.from({ length: ROWS_D }, (_, i): RLine => ({ k: "row", l: rowLabel(i), r: "500 万" })),
  { k: "rule" },
  { k: "row", l: "得分", r: "36 分", big: true },
];

const HC = receiptHeight(EXAM_C) + 30;
const HD = receiptHeight(EXAM_D) + 30;

export const EXAM_START = barA(14);
export const C_ROW_AT = (i: number) => barA(14.5) + i * BEAT_A; // 4 rows on the beats
export const D_ROW_AT = (i: number) => barA(14.5) + i * ((barA(17.75) - barA(14.5)) / (ROWS_D - 1));
export const C_DONE = barA(16);
export const D_DONE = barA(18);
export const EXAM_END = barA(22);

// Lines out at time t, from a list of line start times (each line feeds over `feed` s).
const printedAt = (t: number, starts: number[], feed = 0.14) => {
  let n = 0;
  for (const s of starts) n += pr(t, s, feed, (x) => x);
  return n;
};

export const Exam: React.FC = () => {
  const t = useT();
  const enter = pr(t, EXAM_START - 0.3, 0.6, EO);
  const exit = pr(t, EXAM_END - 0.35, 0.55, EIN);
  const startsC = [EXAM_START + 0.15, ...Array.from({ length: ROWS_C }, (_, i) => C_ROW_AT(i)), C_DONE, C_DONE + 0.12];
  const startsD = [EXAM_START + 0.25, ...Array.from({ length: ROWS_D }, (_, i) => D_ROW_AT(i)), D_DONE, D_DONE + 0.12];
  const pc = printedAt(t, startsC);
  const pd = printedAt(t, startsD);
  const cam = keys(t, [[EXAM_START, 1.0], [barA(15), 1.0], [barA(18), 0.52], [barA(20), 0.5], [EXAM_END, 0.56]], EIO);
  const camX = drift(t, 4, 10);
  const totalsC = pr(t, C_DONE, 0.5, EBACK);
  const totalsD = pr(t, D_DONE, 0.5, EBACK);
  const eighth = pr(t, barA(20), 0.8, EIO);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 1900 - exit * 1900}px)` }}>
      <AbsoluteFill style={{ transform: `translateX(${camX}px) scale(${cam})`, transformOrigin: "960px 990px" }}>
        <div style={{ position: "absolute", left: 700, top: 990 }}>
          <Receipt lines={EXAM_C} printed={pc} w={420} accent={K.claude} label="CLAUDE" />
        </div>
        <div style={{ position: "absolute", left: 1450, top: 990 }}>
          <Receipt lines={EXAM_D} printed={pd} w={420} accent={K.deepseek} label="DEEPSEEK" />
        </div>
      </AbsoluteFill>
      {/* big totals in screen space, next to each printer */}
      <div style={{ position: "absolute", left: 130, top: 470, opacity: totalsC, transform: `translateY(${(1 - totalsC) * 40}px)` }}>
        <Lab size={30} color={K.claudeHi}>Claude Opus 5.5</Lab>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <Odometer value={2000 * Math.min(1, totalsC)} size={84} color={K.fg} />
          <span style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub }}>万 token</span>
        </div>
        <Lab size={46} color={K.claudeHi} w={900} style={{ marginTop: 4 }}>
          约 ¥5,800 · <span style={{ color: K.fg }}>42 分</span>
        </Lab>
        <div style={{ marginTop: 26, marginLeft: 10 }}>
          <Stamp t={t} at={barA(18.5)} color={K.green} size={60} rot={-6}>
            总价更低
          </Stamp>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1500, top: 470, opacity: totalsD, transform: `translateY(${(1 - totalsD) * 40}px)` }}>
        <Lab size={30} color={K.deepseekHi}>DeepSeek V4 Pro</Lab>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <Odometer value={1.6 * Math.min(1, totalsD)} decimals={1} size={84} color={K.fg} />
          <span style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub }}>亿 token</span>
        </div>
        <Lab size={46} color={K.deepseekHi} w={900} style={{ marginTop: 4 }}>
          约 ¥7,500 · <span style={{ color: K.fg }}>36 分</span>
        </Lab>
      </div>
      {/* 8x bracket at bar 20: from the top of the long receipt down to the top of the short one */}
      {eighth > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 960 + (1300 - 960) * cam,
            top: 990 - HD * cam,
            width: 30,
            height: (HD - HC) * cam,
            transform: `scaleY(${lerp(0.2, 1, eighth)})`,
            transformOrigin: "0 0",
            borderRight: `6px solid ${K.gold}`,
            borderTop: `6px solid ${K.gold}`,
            borderBottom: `6px solid ${K.gold}`,
            borderRadius: "0 10px 10px 0",
            opacity: eighth,
          }}
        >
          <div style={{ position: "absolute", right: 50, top: "42%", fontFamily: FONT, fontWeight: 900, fontSize: 80, color: K.gold, whiteSpace: "nowrap" }}>8 倍</div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 60, top: lerp(1200, 820, pr(t, EXAM_START + 0.5, 0.5, EBACK)) + exit * 300 }}>
        <Spark t={t} size={150} mood={t > D_DONE ? "smug" : "happy"} beat={BEAT_A} />
      </div>
      <div style={{ position: "absolute", left: 1660, top: lerp(1200, 850, pr(t, EXAM_START + 0.7, 0.5, EBACK)) + exit * 300 }}>
        <Whale t={t} size={210} mood={t > barA(16) ? "sweat" : "happy"} beat={BEAT_A} />
      </div>
      <Source o={1 - exit}>
        Artificial Analysis（美国 AI 评测机构）智能指数 v4.3 整套考题 · Opus 5.5 低推理档 $860、输出 1,960 万 token · DeepSeek V4 Pro 最高档 $1,122、1.63 亿 token · 按 2026-10-22 中间价换算 · 每行 = 500 万 token
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 6. The formula receipt: three lines, then a fourth that won't print ─────────

export const FORMULA: RLine[] = [
  { k: "head", text: "AI 的真实价格", sub: "= 单价 × 用量 ÷ 包月" },
  { k: "row", l: "单价", r: "Claude 贵 17 倍", color: K.redDeep, big: true },
  { k: "row", l: "用量", r: "只用 1/8", color: K.greenDeep, big: true },
  { k: "row", l: "包月", r: "再 ÷ 36", color: K.greenDeep, big: true },
  { k: "row", l: "？？？", r: "？", color: K.timeDeep, big: true },
];
export const F_ROW_AT = [barA(22) + 0.15, barA(23), barA(24), barA(25)];
export const F_STUCK_AT = barA(26);
export const FORMULA_END = 59.45;

export const Formula: React.FC = () => {
  const t = useT();
  const t0 = barA(22);
  const enter = pr(t, t0 - 0.3, 0.6, EO);
  const out = pr(t, FORMULA_END - 0.9, 0.9, EIO);
  let printed = 0;
  for (const s of F_ROW_AT) printed += pr(t, s, 0.22, (x) => x);
  // the fourth line feeds in fits and starts, then jams; it jolts on the music's last accent
  const stuck = pr(t, F_STUCK_AT, 0.3, (x) => x) * 0.35 + pr(t, F_STUCK_AT + 1.0, 0.15, (x) => x) * 0.15 + pr(t, A_END_HIT, 0.12, (x) => x) * 0.12;
  printed += stuck;
  const jam = t > F_STUCK_AT + 1.2;
  const shake = jam ? Math.sin(t * 60) * 2 * Math.exp(-Math.max(0, t - A_END_HIT) * 4) : 0;
  const dim = pr(t, 58.3, 1.2, EIO);
  const ledBlink = jam && Math.floor(t * 3) % 2 === 0;
  const cam = keys(t, [[t0, 0.96], [F_STUCK_AT, 1.04], [59.5, 1.14]], EIO);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 1900}px)`, opacity: 1 - out }}>
      <AbsoluteFill style={{ transform: `scale(${cam}) translateX(${shake}px)`, transformOrigin: "960px 700px", opacity: 1 - dim * 0.55 }}>
        <div style={{ position: "absolute", left: 960 - 560, top: 950 }}>
          <Receipt lines={FORMULA} printed={printed} w={1070} s={1.5} accent={ledBlink ? K.red : K.time} glow={jam ? 0.3 : 0} label="真实价格" />
        </div>
      </AbsoluteFill>
      <Source o={(1 - out) * (1 - dim)}>17 倍：输出单价 $20 ÷ $1.20 · 1/8：同一套考题的 token 用量 · 36 倍：包月用满（wokey.ai 实测中位数）</Source>
    </AbsoluteFill>
  );
};
