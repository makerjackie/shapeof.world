import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { Tile } from "../art";
import { At, CL, EBACK, EIO, EO, In, Kinetic, lerp, progAt, Shockwave } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FPB } from "../timing";
import { Box, Src } from "../ui";

// ───────── The long tail: every verified project lined up by revenue ─────────

// Monthly revenue by percentile rank (1 = top) from the Indie Hackers analysis of 5,079 TrustMRR projects:
// top 1% > $98,500, top 10% > $10,000, top 25% > ~$800, median $169. Between the anchors the curve is joined
// geometrically and below the median it falls to zero (about a quarter never recorded a payment): 推算.
const ANCHORS: [number, number][] = [
  [1, 98500],
  [10, 10000],
  [25, 800],
  [50, 169],
  [74, 1],
];
export const tailValue = (r: number) => {
  if (r > 74) return 0;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [r0, v0] = ANCHORS[i];
    const [r1, v1] = ANCHORS[i + 1];
    if (r >= r0 && r <= r1) return v0 * Math.pow(v1 / v0, (r - r0) / (r1 - r0));
  }
  return 0;
};

const X0 = 170;
const W = 1600;
const BASE = 880;
const MAX_H = 600;
const barH = (v: number) => Math.max(3, (v / 98500) * MAX_H);

export const TailChart: React.FC<{ n: number; grow: number; drop: number; gold: number; opacity?: number }> = ({ n, grow, drop, gold, opacity = 1 }) => {
  const pitch = W / n;
  const bw = Math.max(1.5, pitch * 0.72);
  const bars: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const r = i + 1;
    const old = r <= 100;
    const v = old ? tailValue(r) : 0;
    const d = old ? Math.min(1, Math.max(0, drop * 1.6 - (i / 100) * 0.6)) : 1;
    if (d <= 0) continue;
    const hgt = lerp(3, barH(v), grow);
    const top = r === 1 && gold > 0;
    bars.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: X0 + i * pitch,
          top: BASE - hgt - (1 - d) * 200,
          width: bw,
          height: hgt,
          borderRadius: Math.min(4, bw / 2),
          background: top ? K.gold : r <= 10 ? K.green : v > 0 ? K.theme : "#3a414d",
          boxShadow: top ? `0 0 ${30 * gold}px ${K.gold}` : undefined,
          opacity: d,
        }}
      />,
    );
  }
  return <div style={{ position: "absolute", inset: 0, opacity }}>{bars}<div style={{ position: "absolute", left: X0 - 20, top: BASE, width: W + 40, height: 2, background: K.line }} /></div>;
};

// Which tail tiles wake up and look up (x as a fraction of the chart).
const WAKE = [0.42, 0.53, 0.61, 0.7, 0.79, 0.9];

export const Shape: React.FC = () => {
  const frame = useBeatFrame();
  const drop = progAt(frame, 0.4, 2, EO);
  const grow = progAt(frame, 3, 3, EO);
  const n = Math.round(interpolate(frame, [16 * FPB, 20 * FPB], [100, 700], { ...CL, easing: EIO }));
  const gold = progAt(frame, 20, 1);
  const spikeTop = BASE - barH(98500) * grow;
  return (
    <AbsoluteFill>
      <TailChart n={n} grow={grow} drop={drop} gold={gold} />
      {/* Labels on the first pass */}
      <At x={X0 + 34} y={spikeTop + 10} style={{ whiteSpace: "nowrap" }}>
        <In at={5.4} out={15.5} from="left" dist={20}>
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.green }}>前 1%：每月 $98,500 以上</div>
        </In>
      </At>
      <At x={X0 + 49 * 16} y={BASE - 70} center>
        <In at={6} out={15.5} from="fade">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            中位数：$169
            <span style={{ fontSize: 28 }}>↓</span>
          </div>
        </In>
      </At>
      <At x={1000} y={170} center>
        <In at={0} out={15.5}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>把核验过的项目按收入从高到低排队，分成 100 份</div>
        </In>
      </At>
      <At x={1040} y={420} center>
        <Kinetic at={8} out={15.5} size={88} parts={["这就是", { t: "独立开发者的形状", c: K.themeHi }]} />
      </At>
      {/* Second pass: more products, the same top */}
      <At x={1040} y={380} center>
        <Kinetic at={16} out={23.5} size={88} parts={["代码，越来越", { t: "便宜", c: K.themeHi }]} />
      </At>
      <At x={1040} y={510} center>
        <Kinetic at={20} out={23.5} size={88} parts={["信任，越来越", { t: "贵", c: K.gold }]} />
      </At>
      {gold > 0 ? (
        <>
          {Array.from({ length: 70 }, (_, k) => {
            const p = progAt(frame, 20.2 + random(`tf${k}`) * 3, 1.2, EIO);
            if (p <= 0 || p >= 1) return null;
            const sx = X0 + 300 + random(`tx${k}`) * 1300;
            return <div key={k} style={{ position: "absolute", left: lerp(sx, X0 + 4, p), top: lerp(BASE - 10, spikeTop + 40, p) - Math.sin(p * Math.PI) * 120, width: 10, height: 10, borderRadius: "50%", background: K.themeHi, opacity: 0.8 }} />;
          })}
          <div style={{ position: "absolute", left: X0 - 28, top: spikeTop - 66, transform: `scale(${progAt(frame, 20, 0.6, EBACK)})` }}>
            <Tile size={60} tone="gold" mood="happy" crown glow={gold} />
          </div>
        </>
      ) : null}
      {/* Last pass: the tail wakes up */}
      {WAKE.map((f, i) => {
        const p = progAt(frame, 25.5 + i * 0.35, 0.6, EBACK);
        if (p <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: X0 + f * W - 23, top: BASE - 46 * p - 4, opacity: Math.min(1, p * 2) }}>
            <Tile size={46} tone="sleep" mood={frame > (27 + i * 0.3) * FPB ? "look" : "sleep"} />
          </div>
        );
      })}
      <At x={1040} y={330} center>
        <Kinetic at={24} size={80} parts={["做了很多产品，没赚到钱"]} />
      </At>
      <At x={1040} y={450} center>
        <Kinetic at={28} size={80} parts={["不是你一个人的失败"]} />
      </At>
      <At x={1040} y={620} center>
        <In at={32} from="slam" dur={0.5}>
          <div style={{ fontFamily: FONT, fontSize: 124, fontWeight: 900, color: K.gold, whiteSpace: "nowrap", letterSpacing: -3, textShadow: `0 0 60px ${K.gold}66` }}>是这个游戏的形状</div>
        </In>
      </At>
      <Shockwave at={32} x={1040} y={620} color={K.gold} size={1800} />
      <Src>按 Indie Hackers 对 TrustMRR 上 5,079 个项目的分位数连线（推算）：前 1% &gt; $98,500，前 10% &gt; $10,000，中位数 $169</Src>
    </AbsoluteFill>
  );
};

// ───────── Fixed end (STYLE.md 三、6): sources → making-of → brand card ─────────

const NOTES = [
  "$145,000 是 15 位知名海外独立开发者公开月收入的中位数（推算）；$169 是 TrustMRR 上 5,079 个 Stripe 核验项目月收入的中位数。",
  "这些平台和案例都是创始人自己选择公开的，真实世界里没赚到钱的更多；个人案例的收入多为本人自述。",
  "长尾曲线按分位数连线推算；61 倍是前 10% 与中位数头 6 个月收入之比。",
];

const SOURCES = [
  "RevenueCat · State of Subscription Apps · 2026　｜　Stripe · Solo founding is at an all-time high · 2026",
  "皮尤研究中心 · AI 摘要与 Google 搜索点击 · 2025　｜　hunted.space · Product Hunt Pulse · 2026",
  "Indie Hackers · 5,079 个 Stripe 核验项目分析 · 2026　｜　TrustMRR · 公开收入榜 · 2026",
  "Pieter Levels · 项目页 · 2026　｜　idoubi · 2024 年，我上线了 11 款 AI 产品 · 2025",
  "Fox · MkSaaS 2025 年总结 · 2026　｜　Marc Lou · ShipFast 推文 · 2026　｜　Superframeworks · Chatbase 案例 · 2026",
];

const Dimmed: React.FC = () => <TailChart n={700} grow={1} drop={1} gold={1} opacity={0.12} />;

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={130} y={130} style={{ gap: 16 }} w={1660}>
      <In at={0} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg }}>口径与假设</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.4 + i * 0.3} from="up">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.2} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg, marginTop: 26 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.5 + i * 0.25} from="up">
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={3} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.muted, marginTop: 22 }}>数据截至 2026 年 10 月 21 日 · 不构成任何建议</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const MAKING: [string, string][] = [
  ["选题与撰稿", "MakerJackie"],
  ["数据核对", "MakerJackie"],
  ["画面", "代码逐帧渲染"],
  ["配乐", "原创，代码生成"],
  ["制作", "MakerJackie"],
];

export const Making: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={960} y={330} cx style={{ gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.25} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 420, fontSize: 44, fontWeight: 700, color: K.fg }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.6} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const FROM = Array.from("独立开发者的形状");
const TO = Array.from("世界的形状");
const SIZE = 140;

// The title flips into 世界的形状, the orb lands, then the slogan and the signature. The audio logo plays on beat 0.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const mark = progAt(frame, 1.6, 1.6, EBACK);
  const halo = progAt(frame, 1.6, 2, EO);
  const slogan = progAt(frame, 3, 1, EO);
  const sign = progAt(frame, 3.6, 1, EO);
  const row = (chars: string[], font: string, weight: number, q: (i: number) => number, inward: boolean) => (
    <div style={{ position: "absolute", left: 0, right: 0, top: 480, display: "flex", justifyContent: "center", gap: 4, perspective: 1400 }}>
      {chars.map((ch, i) => {
        const p = q(i);
        const ang = inward ? (1 - p) * 90 : -p * 90;
        const vis = inward ? p > 0 : p < 1;
        return (
          <div key={i} style={{ width: SIZE * 1.02, height: SIZE * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateX(${ang}deg)`, opacity: vis ? 1 : 0 }}>
            <span style={{ fontFamily: font, fontWeight: weight, fontSize: SIZE, color: K.fg, lineHeight: 1 }}>{ch}</span>
          </div>
        );
      })}
    </div>
  );
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 120, top: 170, width: 240, height: 240 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 240, height: 240, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      {row(FROM, FONT, 900, (i) => progAt(frame, 0.2 + i * 0.08, 0.45, EIO), false)}
      {row(TO, SERIF, 700, (i) => progAt(frame, 0.9 + i * 0.1, 0.5, EIO), true)}
      <div style={{ position: "absolute", left: 0, right: 0, top: 730, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 830, display: "flex", justifyContent: "center", opacity: sign }}>
        <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.muted, letterSpacing: 4, whiteSpace: "nowrap" }}>MakerJackie</div>
      </div>
    </AbsoluteFill>
  );
};
