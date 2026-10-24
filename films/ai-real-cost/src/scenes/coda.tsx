import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile } from "remotion";
import { ClockFace, CodeCard, Person, Spark, Verdict, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Chroma, CL, EBACK, EIO, EO, In, Kinetic, lerp, Note, progAt, Shockwave } from "../fx";
import { FONT, K } from "../theme3";

const TIME = K.time;

// ───────── TimeCost: the formula's missing, most expensive term ─────────

const TILES = ["单价", "×", "用量", "÷", "包月倍数"];

// The rework loop: Claude hands in code, you check it (5 minutes), it is wrong, it goes back, you check again.
const LANE_Y = 640;
const AI_X = 330;
const YOU_X = 1180;
const CLOCK_X = 1420;
const CARD_A = 430;
const CARD_B = 915;
const CHECK = 2; // beats one 5-minute check takes on screen
type Leg = { go: number; check: number; ok: boolean; back?: number };
const LEGS: Leg[] = [
  { go: 7, check: 8, ok: false, back: 11 },
  { go: 13, check: 14, ok: true },
];
const REDO = [11.8, 13]; // Claude rewrites

const Rework: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const show = progAt(frame, 6, 0.8, EO) * (1 - progAt(frame, 21.2, 0.8, EIO));
  if (show <= 0) return null;
  let cardX = CARD_A;
  let cardO = 0;
  let tint: string | undefined;
  let checks = 0;
  let mins = 0;
  let back = 0;
  let verdict: { ok: boolean; at: number } | null = null;
  for (const l of LEGS) {
    if (b >= l.go) {
      cardO = 1;
      cardX = lerp(CARD_A, CARD_B, progAt(frame, l.go, 0.9, EIO));
      tint = undefined;
      back = 0;
    }
    if (b >= l.check) {
      checks += 1;
      mins += 5 * Math.min(1, (b - l.check) / CHECK);
    }
    if (b >= l.check + CHECK) {
      verdict = { ok: l.ok, at: l.check + CHECK };
      tint = l.ok ? K.green : K.red;
    }
    if (l.back !== undefined && b >= l.back) {
      back = progAt(frame, l.back, 0.8, EIO);
      cardX = lerp(CARD_B, CARD_A, back);
      cardO = 1 - progAt(frame, l.back + 0.7, 0.3);
      verdict = null;
    }
  }
  const redo = b > REDO[0] && b < REDO[1];
  const vp = verdict ? progAt(frame, verdict.at, 0.5, EBACK) : 0;
  return (
    <AbsoluteFill style={{ opacity: show }}>
      <div style={{ position: "absolute", left: AI_X + 80, top: LANE_Y - 2, width: YOU_X - AI_X - 180, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", left: AI_X - 130, top: LANE_Y - 100, width: 260, display: "flex", flexDirection: "column", alignItems: "center", transform: redo ? `rotate(${Math.sin(frame * 0.9) * 6}deg)` : undefined }}>
        <Spark size={150} mood={b > 10 && b < 13 ? "sweat" : "happy"} />
        <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap" }}>Claude Opus 5.5</div>
      </div>
      {cardO > 0 ? (
        <div style={{ position: "absolute", left: cardX, top: LANE_Y - 56, opacity: cardO }}>
          {back > 0 ? (
            <div style={{ position: "absolute", left: 30, top: -62, padding: "4px 18px", borderRadius: 999, background: K.red, color: K.bg, fontFamily: FONT, fontSize: 32, fontWeight: 900, whiteSpace: "nowrap" }}>返工</div>
          ) : null}
          <CodeCard tint={tint} w={170} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: YOU_X - 75, top: LANE_Y - 115 }}>
        <Person size={150} shirt="#5A6688" mood={verdict ? (verdict.ok ? "happy" : "frown") : "calm"} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 178, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: K.muted }}>你</div>
        {verdict ? (
          <div style={{ position: "absolute", left: 96, top: -44, transform: `scale(${vp})` }}>
            <Verdict ok={verdict.ok} size={76} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: CLOCK_X - 70, top: LANE_Y - 70 }}>
        <ClockFace size={140} p={mins / 60} arc={mins / 60} />
      </div>
      <div style={{ position: "absolute", left: CLOCK_X + 96, top: LANE_Y - 50, fontFamily: FONT, whiteSpace: "nowrap", opacity: checks > 0 ? 1 : 0.35 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: K.muted }}>你检查了</div>
        <div style={{ fontSize: 54, fontWeight: 900, color: K.fg }}>
          {checks} 次 · <span style={{ color: K.timeHi }}>{Math.round(mins)} 分钟</span>
        </div>
      </div>
      <At x={960} y={875} center>
        <In at={17} out={21}>
          <div style={{ fontSize: 46, fontWeight: 900, whiteSpace: "nowrap" }}>
            平均要查 <span style={{ color: K.timeHi }}>1.6 次</span> × 5 分钟 × 时薪 ¥119 ≈ <span style={{ color: TIME, fontSize: 68 }}>¥16</span>
          </div>
        </In>
      </At>
    </AbsoluteFill>
  );
};

const BILL = 22; // the bill replaces the loop
const TOKEN_Y = 3.5; // Claude's tokens per solved task, a fully used Max 20x
const TIME_Y = 16.1; // 1.62 checks × 5 min × ¥119/h

export const TimeCost: React.FC = () => {
  const frame = useBeatFrame();
  const W = 1400;
  const tokenShare = TOKEN_Y / (TOKEN_Y + TIME_Y);
  const a = progAt(frame, BILL + 1.4, 1, EO);
  const b = progAt(frame, BILL + 2.6, 2.4, EIO);
  const slam = progAt(frame, 2.6, 0.5, EBACK);
  const bill = progAt(frame, BILL, 0.6);
  return (
    <AbsoluteFill>
      <At x={960} y={170} center>
        <Kinetic at={0} out={5.6} size={80} parts={["公式里，还漏了", { t: "最贵的一项", c: TIME }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={6} out={10.4} size={76} parts={["AI 交活，你来检查：", { t: "一次 5 分钟", c: K.timeHi }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={10.6} out={BILL - 0.6} size={76} parts={["没做对？", { t: "返工", c: K.red }, "，你再查一遍"]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={BILL} size={76} parts={["做对一道题，", { t: "一共花多少", c: K.gold }, "？"]} />
      </At>
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, fontFamily: FONT }}>
        {TILES.map((t, i) => {
          const p = progAt(frame, 1 + i * 0.2, 0.6);
          const op = t === "×" || t === "÷";
          return (
            <div
              key={i}
              style={{
                opacity: p * 0.55,
                fontSize: op ? 56 : 48,
                fontWeight: 900,
                color: K.muted,
                padding: op ? 0 : "10px 26px",
                borderRadius: 16,
                border: op ? undefined : "2px solid rgba(255,255,255,0.18)",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </div>
          );
        })}
        <div style={{ fontSize: 56, fontWeight: 900, color: TIME, opacity: slam }}>+</div>
        <div
          style={{
            opacity: Math.min(1, slam * 2),
            transform: `scale(${1 + (1 - slam) * 1.2})`,
            fontSize: 72,
            fontWeight: 900,
            color: TIME,
            padding: "14px 34px",
            borderRadius: 20,
            border: `4px solid ${TIME}`,
            background: `${TIME}22`,
            boxShadow: `0 0 60px ${TIME}66`,
            whiteSpace: "nowrap",
          }}
        >
          你的时间
        </div>
      </div>
      <Rework />
      <At x={260} y={500}>
        <div style={{ opacity: bill, fontSize: 32, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>用 Claude 包月（用满）写代码，做对一道题</div>
      </At>
      <div style={{ position: "absolute", left: 260, top: 560, width: W, height: 110, display: "flex", fontFamily: FONT }}>
        <div style={{ width: W * tokenShare * a, height: "100%", background: `linear-gradient(90deg, ${K.claude}aa, ${K.claude})`, borderRadius: "14px 0 0 14px" }} />
        <div style={{ width: W * (1 - tokenShare) * b, height: "100%", background: `linear-gradient(90deg, ${TIME}88, ${TIME})`, borderRadius: "0 14px 14px 0", boxShadow: `0 0 50px ${TIME}55` }} />
      </div>
      <At x={260} y={690}>
        <div style={{ opacity: a, fontSize: 34, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap" }}>token 约 ¥3.5</div>
      </At>
      <At x={260 + W * tokenShare + (W * (1 - tokenShare)) / 2} y={615} center>
        <div style={{ opacity: b, fontSize: 40, fontWeight: 900, color: K.bg, whiteSpace: "nowrap" }}>你检查、返工的时间 约 ¥16</div>
      </At>
      <At x={960} y={860} center>
        <In at={BILL + 6.4} from="slam" dur={0.5}>
          <div style={{ fontSize: 76, fontWeight: 900, whiteSpace: "nowrap" }}>
            <span style={{ color: TIME, fontSize: 110 }}>82%</span> 是你的时间
          </div>
        </In>
      </At>
      <Note>
        Artificial Analysis 编程榜 v2.0：Opus 5.5 一次做对 62% · 每次检查按 5 分钟（假设）· 时薪 ¥119：国家统计局 2025 年软件业平均工资折算 · token 按包月用满折算
      </Note>
    </AbsoluteFill>
  );
};

// ───────── Jevons: cheaper every year, used ever more ─────────

const X0 = 2024.4;
const X1 = 2026.4;
const PRICE = [
  [2024.4, 1],
  [2025.4, 1 / 13],
  [2026.4, 1 / 169],
];
const USAGE = [
  [2024.4, 1],
  [2025.4, 480 / 9.7],
  [2026.4, 3200 / 9.7],
];
const CW = 1300;
const CH = 520;
const sx = (x: number) => ((x - X0) / (X1 - X0)) * CW;
const sy = (v: number) => CH / 2 - (Math.log10(v) / Math.log10(400)) * (CH / 2);

// Polyline points up to progress p (0–1 along x).
const partial = (pts: number[][], p: number) => {
  const xEnd = X0 + (X1 - X0) * p;
  const out: number[][] = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][0] <= xEnd) out.push(pts[i]);
    else {
      const [xa, va] = pts[i - 1];
      const [xb, vb] = pts[i];
      const t = (xEnd - xa) / (xb - xa);
      out.push([xEnd, Math.pow(10, lerp(Math.log10(va), Math.log10(vb), t))]);
      break;
    }
  }
  return out;
};

const PEAK = 10; // the track's peak (bar 64)

export const Jevons: React.FC = () => {
  const frame = useBeatFrame();
  const pp = progAt(frame, 4.4, 3, EIO);
  const up = progAt(frame, 7.6, PEAK - 7.6, Easing.in(Easing.cubic));
  const price = partial(PRICE, pp);
  const usage = partial(USAGE, up);
  const pEnd = price[price.length - 1];
  const uEnd = usage[usage.length - 1];
  const path = (pts: number[][]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const labelP = progAt(frame, 7, 0.6);
  const labelU = progAt(frame, PEAK, 0.5, EBACK);
  const chart = progAt(frame, 3.6, 0.8); // the chart comes in with its headline, after the opener
  return (
    <AbsoluteFill>
      <At x={960} y={150} center>
        <Kinetic at={0} out={3.6} size={80} parts={["最聪明的最便宜，", { t: "只是今天的答案", c: K.gold }]} />
      </At>
      <At x={960} y={150} center>
        <Kinetic at={4} out={PEAK - 0.4} size={80} parts={["AI 每年便宜 ", { t: "13 倍", c: K.green }]} />
      </At>
      <At x={960} y={150} center>
        <Chroma at={PEAK}>
          <Kinetic at={PEAK} stagger={1} size={80} parts={["可我们，", { t: "用得更多", c: K.gold }]} />
        </Chroma>
      </At>
      <svg width={CW + 400} height={CH + 120} style={{ position: "absolute", left: 210, top: 270, overflow: "visible", fontFamily: FONT, opacity: chart }}>
        <g transform="translate(40, 20)">
          <line x1={0} x2={CW} y1={sy(1)} y2={sy(1)} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="8 10" />
          <path d={path(price)} stroke={K.green} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Glow as a wide translucent stroke: a CSS filter here made the whole chart shift between frames. */}
          <path d={path(usage)} stroke={K.gold} strokeOpacity={0.18 + 0.12 * labelU} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path(usage)} stroke={K.gold} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pp > 0 ? <circle cx={sx(pEnd[0])} cy={sy(pEnd[1])} r={12} fill={K.green} /> : null}
          {up > 0 ? <circle cx={sx(uEnd[0])} cy={sy(uEnd[1])} r={12 + 6 * labelU} fill={K.gold} /> : null}
          <text x={sx(X1) + 26} y={sy(1 / 169) + 12} fontSize={36} fontWeight={900} fill={K.green} opacity={labelP}>
            价格 ÷169
          </text>
          <text x={sx(X1) + 26} y={sy(330) + 12} fontSize={36} fontWeight={900} fill={K.gold} opacity={labelU}>
            用量 ×330
          </text>
        </g>
      </svg>
      {/* Year labels as HTML: centre-anchored SVG text drifted between frames in the full render. */}
      {[2024, 2025, 2026].map((yr, i) => (
        <div key={yr} style={{ position: "absolute", left: 210 + 40 + sx(X0 + i) - 60, top: 270 + 20 + CH + 32, width: 120, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.muted, opacity: chart }}>
          {yr}
        </div>
      ))}
      <Shockwave at={PEAK} x={210 + 40 + sx(X1)} y={270 + 20 + sy(330)} color={K.gold} size={900} />
      <At x={960} y={935} center>
        <In at={PEAK + 3}>
          <div style={{ fontSize: 44, fontWeight: 900, whiteSpace: "nowrap" }}>
            明年，谁最便宜、谁最聪明，<span style={{ color: K.gold }}>都还不一定</span>
          </div>
        </In>
      </At>
      <Note>价格：Epoch AI，同等能力的成本每年约降 13 倍 · 用量：Google 每月处理 token 9.7 万亿 → 3,200 万亿（2024.5 → 2026.5）· Claude Code 人均日花费也从 $6 涨到 $13</Note>
    </AbsoluteFill>
  );
};

// ───────── Scarce: tokens multiply, your time doesn't ─────────

const Hourglass: React.FC<{ p: number }> = ({ p }) => {
  const top = 1 - p;
  return (
    <svg width={300} height={420} viewBox="0 0 300 420" style={{ overflow: "visible" }}>
      <defs>
        <clipPath id="hg-top">
          <path d="M40 30 L260 30 C260 120 175 170 155 205 L145 205 C125 170 40 120 40 30 Z" />
        </clipPath>
        <clipPath id="hg-bot">
          <path d="M145 215 L155 215 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 215 Z" />
        </clipPath>
      </defs>
      <rect x={20} y={10} width={260} height={20} rx={8} fill="rgba(255,255,255,0.75)" />
      <rect x={20} y={390} width={260} height={20} rx={8} fill="rgba(255,255,255,0.75)" />
      <rect x={40} y={205 - 175 * top} width={220} height={175 * top} fill={TIME} clipPath="url(#hg-top)" />
      <rect x={40} y={390 - 175 * p} width={220} height={175 * p} fill={TIME} clipPath="url(#hg-bot)" />
      {p > 0 && p < 1 ? <rect x={147} y={205} width={6} height={185 - 175 * p} fill={TIME} opacity={0.9} /> : null}
      <path
        d="M40 30 L260 30 C260 120 175 170 155 210 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 210 C125 170 40 120 40 30 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={5}
      />
    </svg>
  );
};

const TOKEN_COLORS = [K.claude, K.gold, K.deepseek, K.fg, K.green];

export const Scarce: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const n = Math.round(interpolate(b, [0, 9], [40, 260], CL));
  const sand = progAt(frame, 0, 16, (t) => t);
  return (
    <AbsoluteFill>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 4 + random(`v${i}`) * 14;
        const size = 6 + random(`s${i}`) * 14;
        const y = random(`y${i}`) * 1080;
        const x = ((random(`x${i}`) * 2200 + frame * speed) % 2200) - 140;
        // Tokens part around the hourglass instead of crossing it.
        const dx = x - 960;
        const dy = y - 560;
        const push = Math.max(0, 1 - Math.hypot(dx / 260, dy / 300));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + Math.sign(dy || 1) * push * 220,
              width: size,
              height: size,
              borderRadius: 3,
              background: TOKEN_COLORS[i % TOKEN_COLORS.length],
              opacity: 0.18 + random(`o${i}`) * 0.3,
            }}
          />
        );
      })}
      <At x={960} y={560} center>
        <In at={0.5} from="scale">
          <Hourglass p={sand} />
        </In>
      </At>
      <At x={960} y={170} center>
        <Kinetic at={0} out={3.6} size={84} parts={["AI 会越来越", { t: "便宜", c: K.green }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={4} out={7.6} size={84} parts={["token 会越来越", { t: "多", c: K.gold }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={8} size={84} parts={["唯一不会变多的——"]} />
      </At>
      <At x={960} y={900} center>
        <Chroma at={10.4}>
          <In at={10.4} from="slam" dur={0.5}>
            <div style={{ fontFamily: FONT, fontSize: 132, fontWeight: 900, color: TIME, whiteSpace: "nowrap", textShadow: `0 0 60px ${TIME}88` }}>是你的时间</div>
          </In>
        </Chroma>
      </At>
    </AbsoluteFill>
  );
};

// ───────── Final: what stays true after the ranking changes ─────────

export const Final: React.FC = () => (
  <AbsoluteFill>
    <Shockwave at={0} color={K.green} size={1800} />
    <At x={960} y={400} center>
      <Chroma at={0} amount={18}>
        <In at={0} from="slam" dur={0.5}>
          <div style={{ fontFamily: FONT, fontSize: 124, fontWeight: 900, letterSpacing: -3, whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.22 }}>
            <span style={{ color: K.green }}>最便宜</span>的 AI，
            <br />
            是最省<span style={{ color: TIME }}>你时间</span>的那个
          </div>
        </In>
      </Chroma>
    </At>
    <At x={960} y={670} center>
      <In at={3.4}>
        <div style={{ fontSize: 52, fontWeight: 900, whiteSpace: "nowrap" }}>
          今天，它是<span style={{ color: K.claudeHi }}>最聪明</span>的那个；明天，<span style={{ color: K.gold }}>不一定</span>
        </div>
      </In>
    </At>
    <At x={330} y={880} center>
      <In at={2} from="left">
        <Spark size={170} mood="party" />
      </In>
    </At>
    <At x={1590} y={880} center>
      <In at={2.5} from="right">
        <Whale size={200} mood="happy" />
      </In>
    </At>
  </AbsoluteFill>
);

// ───────── Brand outro: "AI 的真实价格" rolls into "世界的形状" ─────────

const SIZE = 190;
const FLIP = 3;

// One slot of the title: `from` rolls up and out, `to` rolls in from below.
const Slot: React.FC<{ from: string; to: string; wFrom: number; wTo: number; q: number }> = ({ from, to, wFrom, wTo, q }) => (
  <span style={{ display: "inline-block", position: "relative", width: lerp(wFrom, wTo, q), height: SIZE * 1.2, overflow: "hidden", verticalAlign: "top" }}>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: -q * SIZE * 1.3 }}>{from}</span>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: (1 - q) * SIZE * 1.3 }}>{to}</span>
  </span>
);

export const BrandOutro: React.FC = () => {
  const frame = useBeatFrame();
  const settle = progAt(frame, 0, 1.2, EO);
  const q1 = progAt(frame, FLIP, 0.9, EIO);
  const q2 = progAt(frame, FLIP + 0.25, 0.9, EIO);
  const mark = progAt(frame, FLIP + 0.9, 1.6, EBACK);
  const glow = Math.max(0, 1 - (frame - (FLIP + 0.9) * FPB) / 18);
  const ruleW = lerp(SIZE * 6.2, SIZE * 4.9, q2) * progAt(frame, 0.4, 1, EO);
  const subOut = 1 - progAt(frame, FLIP - 0.5, 0.4);
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <At x={960} y={300} center>
          <div style={{ position: "relative", width: 230, height: 230 }}>
            <div style={{ position: "absolute", inset: -170, borderRadius: "50%", background: `radial-gradient(circle, ${K.gold}${Math.round(glow * 90).toString(16).padStart(2, "0")} 0%, transparent 60%)` }} />
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", boxShadow: "0 0 0 2px rgba(245,242,235,0.35), 0 0 40px rgba(245,242,235,0.12)", opacity: Math.min(1, mark * 1.6), transform: `scale(${0.55 + 0.45 * mark})` }} />
            <Img
              src={staticFile("mark-disc.png")}
              style={{ width: 230, height: 230, borderRadius: "50%", opacity: Math.min(1, mark * 1.6), transform: `translateY(${(1 - Math.min(1, mark)) * -120}px) scale(${0.55 + 0.45 * mark})` }}
            />
          </div>
        </At>
      ) : null}
      <At x={960} y={590} center>
        <div style={{ transform: `scale(${1.15 - 0.15 * settle})`, opacity: settle, fontFamily: FONT, fontSize: SIZE, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", lineHeight: 1.2, display: "flex" }}>
          <Slot from="AI" to="世界" wFrom={SIZE * 1.35} wTo={SIZE * 2} q={q1} />
          <span>的</span>
          <Slot from="真实价格" to="形状" wFrom={SIZE * 4} wTo={SIZE * 2} q={q2} />
        </div>
      </At>
      <div style={{ position: "absolute", left: 960 - ruleW / 2, top: 720, width: ruleW, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${K.claude}, ${K.gold})` }} />
      <At x={960} y={800} center>
        <In at={1.5}>
          <div style={{ opacity: subOut, fontSize: 34, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>数据截至 2026 年 10 月 23 日 · 来源见视频简介</div>
        </In>
      </At>
      <At x={960} y={810} center>
        <In at={FLIP + 1.5}>
          <div style={{ fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>看见世界如何运行</div>
        </In>
      </At>
      <At x={960} y={925} center>
        <In at={FLIP + 2}>
          <div style={{ fontSize: 38, fontWeight: 700, color: K.muted, letterSpacing: 3, whiteSpace: "nowrap" }}>MakerJackie</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
