import React from "react";
import { AbsoluteFill, random } from "remotion";
import { ClockFace, Coin, CodeCard, Magnifier, Person, Spark, Verdict, Whale } from "../art";
import { Stamp, useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Badge, EBACK, EIO, EO, In, Kinetic, lerp, Note, Odometer, progAt, Shockwave, Tag } from "../fx";
import { FONT, K } from "../theme3";

const SHIRTS = ["#566079", "#6B5A7A", "#4F6E6A", "#7A5F52", "#5A6688", "#6E6A52", "#5C5470", "#4E6680", "#7A5668", "#56705A"];

// ───────── Devs: would you use AI's code as it is? ─────────

const BRAVE = 6; // the one programmer in ten who uses it as is

export const Devs: React.FC = () => {
  const frame = useBeatFrame();
  const split = progAt(frame, 3, 0.8, EO);
  return (
    <AbsoluteFill>
      <At x={960} y={190} center>
        <Kinetic at={0} out={4.6} size={80} parts={["AI 写的代码，你敢", { t: "直接用", c: K.green }, "吗？"]} />
      </At>
      <At x={960} y={190} center>
        <Kinetic at={5} size={80} parts={["10 个程序员，只有 ", { t: "1 个", c: K.green }, "敢"]} />
      </At>
      {Array.from({ length: 10 }).map((_, i) => {
        const x = 285 + i * 150;
        const p = progAt(frame, 0.6 + i * 0.1, 0.8, EBACK);
        const brave = i === BRAVE;
        const lift = brave ? split * 40 : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x - 60, top: 470 - lift, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 60}px)` }}>
            <Person size={120} shirt={SHIRTS[i]} mood={split > 0.5 ? (brave ? "happy" : "frown") : "calm"} />
            <div style={{ position: "absolute", left: brave ? 64 : 58, top: -58, transform: `scale(${progAt(frame, 3 + (brave ? 0 : 0.05 * i), 0.6, EBACK)})`, transformOrigin: "30% 80%" }}>
              {brave ? <Verdict ok size={58} /> : <Magnifier size={58} color={K.time} />}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 225, top: 650, width: 150 * 6 - 30, height: 4, borderRadius: 2, background: K.time, opacity: split, transformOrigin: "left", transform: `scaleX(${split})` }} />
      <div style={{ position: "absolute", left: 225 + 150 * 7, top: 650, width: 150 * 3 - 30, height: 4, borderRadius: 2, background: K.time, opacity: split, transformOrigin: "left", transform: `scaleX(${split})` }} />
      <At x={690} y={710} center>
        <In at={3.6}>
          <div style={{ fontSize: 44, fontWeight: 900, color: K.timeHi, whiteSpace: "nowrap" }}>9 个：先检查一遍</div>
        </In>
      </At>
      <At x={1185} y={700} center>
        <In at={3.4}>
          <div style={{ fontSize: 36, fontWeight: 900, color: K.green, whiteSpace: "nowrap" }}>直接用</div>
        </In>
      </At>
      <Note>Stack Overflow（程序员问答网站）2026 开发者调查：拿到 AI 写的答案，选“直接用”的只有 9.6%，其余先跑一遍、对照代码、看测试（13,162 人回答）</Note>
    </AbsoluteFill>
  );
};

// ───────── Loop: one check costs you 5 minutes; a wrong answer goes back for another round ─────────

const LANE_C = 430;
const LANE_D = 760;
const AI_X = 380;
const YOU_X = 1180;
const CLOCK_X = 1400;

type Leg = { go: number; check: number; ok: boolean; back?: number };
const C_LEGS: Leg[] = [{ go: 1, check: 2, ok: true }];
const D_LEGS: Leg[] = [{ go: 1.2, check: 2.2, ok: false, back: 5 }, { go: 6.4, check: 7.2, ok: true }];
const CHECK_LEN = 1.5;

const Lane: React.FC<{ y: number; legs: Leg[]; who: "c" | "d" }> = ({ y, legs, who }) => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const lane = progAt(frame, 0.3, 0.8, EO);
  // where the card is and how it looks
  let cardX = AI_X;
  let cardO = 0;
  let tint: string | undefined;
  let checks = 0;
  let arc = 0;
  let verdict: { ok: boolean; at: number } | null = null;
  for (const l of legs) {
    if (b >= l.go) {
      cardO = 1;
      cardX = lerp(AI_X, YOU_X - 150, progAt(frame, l.go, 0.9, EIO));
      tint = undefined;
    }
    if (b >= l.check) {
      checks += 1;
      arc = Math.min(1, (b - l.check) / CHECK_LEN);
    }
    if (b >= l.check + CHECK_LEN) {
      verdict = { ok: l.ok, at: l.check + CHECK_LEN };
      tint = l.ok ? K.green : K.red;
    }
    if (l.back !== undefined && b >= l.back) {
      cardX = lerp(YOU_X - 150, AI_X, progAt(frame, l.back, 0.8, EIO));
      cardO = 1 - progAt(frame, l.back + 0.7, 0.3);
      verdict = null;
      arc = 0;
    }
  }
  const redo = who === "d" && b > 5.6 && b < 6.6;
  const vp = verdict ? progAt(frame, verdict.at, 0.5, EBACK) : 0;
  const mins = checks * 5;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: lane }}>
      <div style={{ position: "absolute", left: AI_X - 20, top: y - 2, width: YOU_X - AI_X - 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: 120, top: y - 110, width: 260, display: "flex", flexDirection: "column", alignItems: "center", transform: redo ? `rotate(${Math.sin(frame * 0.9) * 6}deg)` : undefined }}>
        {who === "c" ? <Spark size={150} mood="happy" /> : <Whale size={180} mood={b > 4 && b < 7.5 ? "sweat" : "happy"} />}
        <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 900, color: who === "c" ? K.claudeHi : K.deepseekHi, whiteSpace: "nowrap", marginTop: who === "c" ? 0 : -14 }}>
          {who === "c" ? "Claude Opus 5.5" : "DeepSeek V4.1 Flash"}
        </div>
      </div>
      {cardO > 0 ? (
        <div style={{ position: "absolute", left: cardX, top: y - 56, opacity: cardO }}>
          <CodeCard tint={tint} w={170} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: YOU_X - 75, top: y - 115 }}>
        <Person size={150} shirt={who === "c" ? "#5A6688" : "#6B5A7A"} mood={verdict ? (verdict.ok ? "happy" : "frown") : "calm"} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 178, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: K.muted }}>你</div>
        {verdict ? (
          <div style={{ position: "absolute", left: 96, top: -44, transform: `scale(${vp})` }}>
            <Verdict ok={verdict.ok} size={76} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: CLOCK_X - 70, top: y - 70 }}>
        <ClockFace size={140} p={arc * (5 / 60)} arc={arc * (5 / 60) * 1} />
      </div>
      <div style={{ position: "absolute", left: CLOCK_X + 96, top: y - 50, fontFamily: FONT, whiteSpace: "nowrap", opacity: checks > 0 ? 1 : 0.35 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: K.muted }}>你检查了</div>
        <div style={{ fontSize: 54, fontWeight: 900, color: K.fg }}>
          {checks} 次 · <span style={{ color: K.timeHi }}>{mins} 分钟</span>
        </div>
      </div>
    </div>
  );
};

export const Loop: React.FC = () => (
  <AbsoluteFill>
    <At x={960} y={170} center>
      <Kinetic at={0} out={4.6} size={76} parts={["AI 交活，你来检查：", { t: "一次 5 分钟", c: K.timeHi }]} />
    </At>
    <At x={960} y={170} center>
      <Kinetic at={4.8} size={76} parts={["没做对？", { t: "返工", c: K.red }, "，你再查一遍"]} />
    </At>
    <Lane y={LANE_C} legs={C_LEGS} who="c" />
    <Lane y={LANE_D} legs={D_LEGS} who="d" />
    <Note>每次检查按 5 分钟算：本片的假设，往少了算</Note>
  </AbsoluteFill>
);

// ───────── Grid: 100 coding tasks, checked until every one is right ─────────

// Tasks solved in each round (whole tasks, so the totals hit 100 ÷ pass@1: 162 and 216 checks).
const ROUNDS_C = [62, 23, 9, 4, 1, 1];
const ROUNDS_D = [46, 25, 12, 8, 5, 2, 1, 1];
const R1 = 1.2;
const RN = (k: number) => 5.2 + (k - 1) * 0.55; // rounds 2… after the headline swap
const HOURS_AT = 11;

// Round in which each of the 100 cells is solved, in a fixed shuffled order.
const roundOf = (rounds: number[], seed: string) => {
  const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => random(`${seed}${a}`) - random(`${seed}${b}`));
  const r = new Array<number>(100);
  let k = 0;
  rounds.forEach((n, ri) => {
    for (let j = 0; j < n; j++) r[order[k++]] = ri;
  });
  return r;
};
const RC = roundOf(ROUNDS_C, "c");
const RD = roundOf(ROUNDS_D, "d");

const checksAfter = (rounds: number[], k: number) => {
  let left = 100;
  let sum = 0;
  for (let i = 0; i <= k && i < rounds.length; i++) {
    sum += left;
    left -= rounds[i];
  }
  return sum;
};

const roundAt = (k: number) => (k === 0 ? R1 : RN(k));

const Wall: React.FC<{ x: number; rounds: number[]; cells: number[]; m: "opus" | "dsflash"; color: string }> = ({ x, rounds, cells, m, color }) => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const CELL = 38;
  const GAP = 6;
  const W = 10 * CELL + 9 * GAP;
  let k = -1;
  rounds.forEach((_, i) => {
    if (b >= roundAt(i)) k = i;
  });
  const checks = k < 0 ? 0 : checksAfter(rounds, k);
  const toHours = progAt(frame, HOURS_AT, 1.4, EIO);
  const hours = (checksAfter(rounds, rounds.length) * 5) / 60;
  const first = progAt(frame, R1, 1, EO);
  const swap = progAt(frame, 4.6, 0.5, EIO);
  return (
    <div style={{ position: "absolute", left: x - W / 2, top: 222, width: W, fontFamily: FONT, color: K.fg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", marginBottom: 18, opacity: progAt(frame, 0.2, 0.6) }}>
        <Badge m={m} size={48} />
        <span style={{ fontSize: 34, fontWeight: 900, whiteSpace: "nowrap" }}>{m === "opus" ? "Claude Opus 5.5" : "DeepSeek V4.1 Flash"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${CELL}px)`, gap: GAP }}>
        {cells.map((r, i) => {
          const at = roundAt(r) + (r === 0 ? (i % 10) * 0.05 + Math.floor(i / 10) * 0.03 : random(`t${m}${i}`) * 0.35);
          const on = progAt(frame, at, 0.35, EBACK);
          return (
            <div
              key={i}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 8,
                background: on > 0 ? (r === 0 ? K.green : lerpC(K.green, "#2FB37F", 0.6)) : "rgba(255,255,255,0.06)",
                border: on > 0 ? "none" : "1.5px solid rgba(255,255,255,0.12)",
                transform: `scale(${on > 0 ? 0.6 + 0.4 * on : 1})`,
                boxShadow: on > 0 ? `0 0 14px ${K.green}55` : undefined,
              }}
            />
          );
        })}
      </div>
      <div style={{ position: "relative", height: 150, marginTop: 26, textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: first * (1 - swap) }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>一次就做对</div>
          <Odometer value={(m === "opus" ? 62 : 46) * first} size={96} suffix=" 个" color={color} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: swap * (1 - toHours) }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>你一共检查了</div>
          <Odometer value={checks} size={96} suffix=" 次" color={K.fg} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: toHours }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>× 5 分钟 =</div>
          <Odometer value={hours * toHours} decimals={1} size={96} suffix=" 小时" color={K.timeHi} />
        </div>
      </div>
    </div>
  );
};

const lerpC = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
};

export const Grid: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <At x={960} y={130} center>
        <Kinetic at={0} out={4.4} size={72} parts={["100 个编程任务，", { t: "一次就做对", c: K.green }, "的："]} />
      </At>
      <At x={960} y={130} center>
        <Kinetic at={4.6} out={HOURS_AT - 0.4} size={72} parts={["剩下的", { t: "返工到全对", c: K.red }, "，你要查几次？"]} />
      </At>
      <At x={960} y={130} center>
        <Kinetic at={HOURS_AT} size={72} parts={["每次 5 分钟，", { t: "加起来就是", c: K.timeHi }, "："]} />
      </At>
      <Wall x={560} rounds={ROUNDS_C} cells={RC} m="opus" color={K.claudeHi} />
      <Wall x={1360} rounds={ROUNDS_D} cells={RD} m="dsflash" color={K.deepseekHi} />
      <At x={1690} y={800} center>
        <In at={9.2} out={HOURS_AT - 0.3} from="slam" dur={0.5}>
          <div style={{ fontSize: 60, fontWeight: 900, color: K.red, whiteSpace: "nowrap" }}>+54 次</div>
        </In>
      </At>
      <At x={960} y={985} center>
        <In at={13} from="up">
          <div style={{ display: "flex", alignItems: "baseline", gap: 24, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 60, fontWeight: 900 }}>
              便宜的，要你多盯 <span style={{ color: K.red }}>4.5 小时</span>
            </span>
            <span style={{ fontSize: 34, fontWeight: 700, color: K.muted }}>比半天班还长</span>
          </div>
        </In>
      </At>
      <Note style={{ bottom: 22, opacity: 1 - progAt(frame, 12.6, 0.4) }}>
        Artificial Analysis 编程智能体榜 v2.0（2026-10）：一次做对 Opus 5.5 61.7%、DeepSeek V4.1 Flash 46.3% · 检查次数 = 100 ÷ 做对的比例（推算）
      </Note>
    </AbsoluteFill>
  );
};

// ───────── Wage: what an hour of yours costs ─────────

export const Wage: React.FC = () => {
  const frame = useBeatFrame();
  const turn = progAt(frame, 0.4, 3.2, EIO);
  const drop = progAt(frame, 2.4, 0.6, EBACK);
  return (
    <AbsoluteFill>
      <At x={960} y={170} center>
        <Kinetic at={0} size={80} parts={["你的 ", { t: "1 小时", c: K.timeHi }, "，值多少钱？"]} />
      </At>
      <At x={620} y={560} center>
        <In at={0.2} from="scale">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <ClockFace size={360} p={turn} arc={turn} />
            <div style={{ fontSize: 40, fontWeight: 900, color: K.timeHi }}>你的 1 小时</div>
          </div>
        </In>
      </At>
      <At x={1330} y={540} center>
        <div style={{ opacity: Math.min(1, drop * 2), transform: `translateY(${(1 - Math.min(1, drop)) * -260}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Coin size={170} />
          <div style={{ fontFamily: FONT, fontSize: 130, fontWeight: 900, color: K.gold, letterSpacing: -4, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 52, marginRight: 10 }}>约</span>¥119
          </div>
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>程序员平均工资，折成每小时</div>
        </div>
      </At>
      <Shockwave at={2.9} x={1330} y={460} color={K.gold} size={900} />
      <Note>国家统计局：2025 年城镇非私营单位“信息传输、软件和信息技术服务业”年平均工资 248,752 元 · ÷ 12 个月 ÷ 21.75 天 ÷ 8 小时（人社部折算办法）</Note>
    </AbsoluteFill>
  );
};

// ───────── Bill: tokens first, then your time (the purple line lands on the peak) ─────────

const ROWS = [
  { m: "opus" as const, name: "Claude Opus 5.5", sub: "包月用满", token: 346, time: 1610, hours: "13.5 小时", total: 1956, share: "占 8 成", c: K.claude, hi: K.claudeHi, y: 470 },
  { m: "dsflash" as const, name: "DeepSeek V4.1 Flash", sub: "闲时价，它最便宜的时候", token: 213, time: 2144, hours: "18 小时", total: 2357, share: "占 9 成", c: K.deepseek, hi: K.deepseekHi, y: 720 },
];
const BX0 = 560;
const ROW_H = 110;
const HUSH = 6; // film bar 37: silence
const PEAK = 10; // film bar 38: the peak comes in
const TOTALS = 12.6;
const SHARE = 15;
const SAVE = 18.5;

export const Bill: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const rise = progAt(frame, 0, 0.9, EO);
  const tok = progAt(frame, 0.6, 1.2, EO);
  // Before the peak the bars are drawn at a large scale (the token rows fill the screen); on the peak the scale pulls
  // back while the purple rows grow, so "your time" runs off the right edge and is then seen whole.
  const pull = progAt(frame, PEAK, 1.8, EIO);
  const px = lerp(2.3, 0.44, pull);
  const grow = progAt(frame, PEAK, 1.1, EO);
  const slot = progAt(frame, HUSH + 0.3, 0.8, EBACK) * (1 - progAt(frame, PEAK - 0.1, 0.2));
  const hush = progAt(frame, HUSH, 0.6, EIO) * (1 - progAt(frame, PEAK, 0.3, EO));
  const tot = progAt(frame, TOTALS, 1.2, EO);
  const save = progAt(frame, SAVE, 0.6, EBACK);
  return (
    <AbsoluteFill>
      <At x={960} y={150} center>
        <Kinetic at={0} out={HUSH - 0.4} size={72} parts={["只看 token：", { t: "最便宜的 DeepSeek", c: K.deepseekHi }, "，更省"]} />
      </At>
      <At x={960} y={150} center style={{ opacity: 1 - 0.3 * hush }}>
        <Kinetic at={HUSH} out={SHARE - 0.4} size={72} parts={["再把你", { t: "检查的时间", c: K.timeHi }, "，也记进账单"]} />
      </At>
      <At x={960} y={150} center>
        <Kinetic at={SHARE} out={SAVE - 0.4} size={72} parts={["账单上最贵的一行，", { t: "是你的时间", c: K.timeHi }]} />
      </At>
      <At x={960} y={150} center>
        <Kinetic at={SAVE} size={72} parts={["算上你的时间，", { t: "聪明的反而更省", c: K.green }]} />
      </At>
      <At x={960} y={262} center>
        <div style={{ opacity: rise * 0.85, fontSize: 30, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>100 个编程任务 · 做到全对 · 一共花多少</div>
      </At>
      {ROWS.map((r, i) => {
        const tw = r.token * px * tok;
        const pw = r.time * px * grow;
        const y = r.y + (1 - rise) * 200;
        return (
          <div key={r.m} style={{ position: "absolute", left: 0, top: y - ROW_H / 2, width: 1920, height: ROW_H, opacity: Math.min(1, rise * 1.5), fontFamily: FONT, color: K.fg }}>
            <div style={{ position: "absolute", left: 90, width: BX0 - 120, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 900, whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: r.hi, whiteSpace: "nowrap" }}>{r.sub}</div>
              </div>
              <Badge m={r.m} size={64} />
            </div>
            {/* token */}
            <div style={{ position: "absolute", left: BX0, top: 14, height: ROW_H - 28, width: tw, borderRadius: pw > 2 ? "14px 0 0 14px" : 14, background: `linear-gradient(90deg, ${r.c}99, ${r.c})`, boxShadow: `0 0 30px ${r.c}55` }} />
            <div style={{ position: "absolute", left: BX0 + 12, top: -34 - (1 - pull) * 0, fontSize: 28, fontWeight: 900, color: r.hi, whiteSpace: "nowrap", opacity: tok }}>
              token <span style={{ fontSize: lerp(56, 32, pull) }}>¥{r.token}</span>
            </div>
            {/* the empty slot during the silence */}
            {slot > 0 ? (
              <div style={{ position: "absolute", left: BX0 + tw + 14, top: 14, height: ROW_H - 28, width: 220 * slot, borderRadius: 14, border: `4px dashed ${K.time}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 900, color: K.time, opacity: slot }}>
                ？
              </div>
            ) : null}
            {/* your time */}
            {pw > 1 ? (
              <div style={{ position: "absolute", left: BX0 + tw, top: 14, height: ROW_H - 28, width: pw, borderRadius: "0 14px 14px 0", background: `linear-gradient(90deg, ${K.time}aa, ${K.time})`, boxShadow: `0 0 50px ${K.time}66`, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 900, color: "#120A22", whiteSpace: "nowrap" }}>
                  你的时间 · {r.hours} · ¥{r.time.toLocaleString("en-US")}
                </div>
              </div>
            ) : null}
            {pw > 1 ? (
              <div style={{ position: "absolute", left: BX0 + tw + pw - 200, top: -40 }}>
                <Stamp at={SHARE + 0.5 + i * 0.4} color={K.timeHi} size={40} rotate={-4} style={{ background: "#06060Add", padding: "4px 18px" }}>
                  {r.share}
                </Stamp>
              </div>
            ) : null}
            {/* total */}
            <div style={{ position: "absolute", left: 1640, top: 0, height: ROW_H, display: "flex", flexDirection: "column", justifyContent: "center", opacity: tot }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: K.muted }}>合计</div>
              <Odometer value={r.total * tot} prefix="¥" size={66} color={i === 0 && save > 0 ? K.green : K.fg} />
            </div>
          </div>
        );
      })}
      <Shockwave at={PEAK} x={BX0 + 300} y={595} color={K.time} size={2000} />
      <At x={1770} y={350} center>
        <div style={{ transform: `rotate(-6deg) scale(${1 + (1 - Math.min(1, save)) * 1.4})`, opacity: Math.min(1, save * 3) }}>
          <div style={{ padding: "8px 24px", border: `6px solid ${K.green}`, borderRadius: 14, color: K.green, fontSize: 46, fontWeight: 900, whiteSpace: "nowrap", background: "#06060Add", fontFamily: FONT }}>便宜 ¥400</div>
        </div>
      </At>
      <At x={960} y={905} center>
        <In at={SAVE + 1.4}>
          <Tag color={K.timeHi} size={30}>
            每次检查只要超过 1.2 分钟，就是它更省
          </Tag>
        </In>
      </At>
      <At x={170} y={960} center>
        <In at={SAVE} from="left">
          <Spark size={130} mood={b > SAVE ? "party" : "happy"} />
        </In>
      </At>
      <At x={1760} y={970} center>
        <In at={SAVE + 0.3} from="right">
          <Whale size={150} mood="sweat" />
        </In>
      </At>
      <Note style={{ left: 300, bottom: 30, opacity: 1 - progAt(frame, SAVE - 0.4, 0.4) }}>
        token：Artificial Analysis 每轮实测花费 × 检查次数；Opus 按包月用满 ÷ 36（按 API 原价约 ¥1.25 万），DeepSeek 按闲时价 · 你的时间：检查次数 × 5 分钟 × ¥119 · 全部为推算
      </Note>
    </AbsoluteFill>
  );
};
