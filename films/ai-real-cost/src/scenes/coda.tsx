import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile } from "remotion";
import { Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Chroma, CL, EBACK, EIO, EO, In, Kinetic, lerp, Note, progAt, Shockwave } from "../fx";
import { FONT, K, MONO } from "../theme3";

const TIME = "#B98CFF";

// ───────── TimeCost: the formula's missing, most expensive term ─────────

const TILES = ["单价", "×", "用量", "÷", "包月倍数"];

export const TimeCost: React.FC = () => {
  const frame = useBeatFrame();
  const W = 1400;
  const tokenShare = 2.25 / 17.4;
  const a = progAt(frame, 7, 1, EO);
  const b = progAt(frame, 8.4, 2.6, EIO);
  const slam = progAt(frame, 3.6, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <At x={960} y={170} center>
        <Kinetic at={0} size={80} parts={["公式里，还漏了", { t: "最贵的一项", c: TIME }]} />
      </At>
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, fontFamily: FONT }}>
        {TILES.map((t, i) => {
          const p = progAt(frame, 1.6 + i * 0.25, 0.6);
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
      <At x={260} y={500}>
        <In at={6.4}>
          <div style={{ fontSize: 32, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>用 Claude 写代码，真正解决一道题的成本</div>
        </In>
      </At>
      <div style={{ position: "absolute", left: 260, top: 560, width: W, height: 110, display: "flex", fontFamily: FONT }}>
        <div style={{ width: W * tokenShare * a, height: "100%", background: `linear-gradient(90deg, ${K.claude}aa, ${K.claude})`, borderRadius: "14px 0 0 14px" }} />
        <div style={{ width: W * (1 - tokenShare) * b, height: "100%", background: `linear-gradient(90deg, ${TIME}88, ${TIME})`, borderRadius: "0 14px 14px 0", boxShadow: `0 0 50px ${TIME}55` }} />
      </div>
      <At x={260} y={690}>
        <div style={{ opacity: a, fontSize: 34, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap" }}>token $2.25</div>
      </At>
      <At x={260 + W * tokenShare + (W * (1 - tokenShare)) / 2} y={615} center>
        <div style={{ opacity: b, fontSize: 40, fontWeight: 900, color: K.bg, whiteSpace: "nowrap" }}>你检查、返工的时间 $15.15</div>
      </At>
      <At x={960} y={860} center>
        <In at={11.6} from="slam" dur={0.5}>
          <div style={{ fontSize: 76, fontWeight: 900, whiteSpace: "nowrap" }}>
            <span style={{ color: TIME, fontSize: 110 }}>87%</span> 是你的时间
          </div>
        </In>
      </At>
      <Note>Artificial Analysis Coding Agent Index（Sonnet 5.5 high）：平均试 1.8 次才解决 · 每次人工检查按 5 分钟、时薪 $100 估算</Note>
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

const PEAK = 12;

export const Jevons: React.FC = () => {
  const frame = useBeatFrame();
  const pp = progAt(frame, 1.6, 3.4, EIO);
  const up = progAt(frame, 8, PEAK - 8, Easing.in(Easing.cubic));
  const price = partial(PRICE, pp);
  const usage = partial(USAGE, up);
  const pEnd = price[price.length - 1];
  const uEnd = usage[usage.length - 1];
  const path = (pts: number[][]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const labelP = progAt(frame, 4.6, 0.6);
  const labelU = progAt(frame, PEAK, 0.5, EBACK);
  return (
    <AbsoluteFill>
      <At x={960} y={150} center>
        <Kinetic at={0} out={PEAK - 0.4} size={80} parts={["AI 每年便宜 ", { t: "13 倍", c: K.green }]} />
      </At>
      <At x={960} y={150} center>
        <Chroma at={PEAK}>
          <Kinetic at={PEAK} stagger={1} size={80} parts={["可我们，", { t: "用得更多", c: K.gold }]} />
        </Chroma>
      </At>
      <svg width={CW + 400} height={CH + 120} style={{ position: "absolute", left: 210, top: 270, overflow: "visible", fontFamily: FONT }}>
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
        <div key={yr} style={{ position: "absolute", left: 210 + 40 + sx(X0 + i) - 60, top: 270 + 20 + CH + 32, width: 120, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.muted }}>
          {yr}
        </div>
      ))}
      <Shockwave at={PEAK} x={210 + 40 + sx(X1)} y={270 + 20 + sy(330)} color={K.gold} size={900} />
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
  const n = Math.round(interpolate(b, [0, 10], [40, 260], CL));
  const sand = progAt(frame, 0, 24, (t) => t);
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
        <Kinetic at={0} out={4.6} size={84} parts={["AI 会越来越", { t: "便宜", c: K.green }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={5} out={9.6} size={84} parts={["token 会越来越", { t: "多", c: K.gold }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={10} size={84} parts={["唯一不会变多的——"]} />
      </At>
      <At x={960} y={900} center>
        <Chroma at={13}>
          <In at={13} from="slam" dur={0.5}>
            <div style={{ fontFamily: FONT, fontSize: 132, fontWeight: 900, color: TIME, whiteSpace: "nowrap", textShadow: `0 0 60px ${TIME}88` }}>是你的时间</div>
          </In>
        </Chroma>
      </At>
    </AbsoluteFill>
  );
};

// ───────── Final: the claim again, now with its reason ─────────

export const Final: React.FC = () => (
  <AbsoluteFill>
    <Shockwave at={0} color={K.green} size={1800} />
    <At x={960} y={400} center>
      <Chroma at={0} amount={18}>
        <In at={0} from="slam" dur={0.5}>
          <div style={{ fontFamily: FONT, fontSize: 124, fontWeight: 900, letterSpacing: -3, whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.22 }}>
            最聪明的 AI，
            <br />
            就是<span style={{ color: K.green }}>最便宜</span>的 AI
          </div>
        </In>
      </Chroma>
    </At>
    <At x={960} y={670} center>
      <In at={4}>
        <div style={{ fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>
          因为它省下的，是你<span style={{ color: TIME }}>最贵的东西</span>
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
const FLIP = 8;

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
          <div style={{ position: "relative", width: 300, height: 300 }}>
            <svg width={0} height={0} style={{ position: "absolute" }}>
              <filter id="mark-alpha" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1.5 1.5 1.5 0 -0.06" />
              </filter>
            </svg>
            <div style={{ position: "absolute", inset: -160, borderRadius: "50%", background: `radial-gradient(circle, ${K.gold}${Math.round(glow * 90).toString(16).padStart(2, "0")} 0%, transparent 60%)` }} />
            <Img
              src={staticFile("mark-512.png")}
              style={{ width: 300, height: 300, filter: "url(#mark-alpha)", opacity: Math.min(1, mark * 1.6), transform: `scale(${0.55 + 0.45 * mark}) rotate(${-2 + 2 * mark}deg)` }}
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
          <div style={{ opacity: subOut, fontSize: 34, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>数据截至 2026 年 10 月 21 日 · 全部来源见视频简介</div>
        </In>
      </At>
      <At x={960} y={810} center>
        <In at={FLIP + 1.5}>
          <div style={{ fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>看见世界如何运行</div>
        </In>
      </At>
      <At x={960} y={895} center>
        <In at={FLIP + 2}>
          <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: K.claudeHi }}>shapeof.world</div>
        </In>
      </At>
      <At x={960} y={965} center>
        <In at={FLIP + 2.5}>
          <div style={{ fontSize: 34, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>制作 MakerJackie</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
