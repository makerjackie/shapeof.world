// Shared type and brand pieces (after films/inherit/src/kit.tsx). All times are film seconds.
import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, NUM, SERIF } from "./theme";
import { FPS } from "./timing";

export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ramp = (t: number, a: number, b: number, ease: (x: number) => number = EIO) => ease(clamp01((t - a) / (b - a)));
export const win = (t: number, a: number, b: number, fi = 0.35, fo = 0.35) => Math.min(clamp01((t - a) / fi), clamp01((b - t) / fo));
export const useT = () => useCurrentFrame() / FPS;

export const SHADOW = "0 2px 6px rgba(2,3,8,0.75), 0 0 30px rgba(2,3,8,0.9), 0 0 60px rgba(2,3,8,0.6)";

export type Part = string | { t: string; c?: string; w?: number; mark?: boolean; num?: boolean; s?: number };

// One line: characters rise in from `at`, the line lifts away at `out`. `mark` parts are gold with a sweep under them.
export const Say: React.FC<{ at: number; out?: number; parts: Part[]; size?: number; weight?: number; serif?: boolean; color?: string; stagger?: number; style?: React.CSSProperties }> = ({
  at,
  out,
  parts,
  size = 64,
  weight = 800,
  serif,
  color = K.fg,
  stagger = 0.9,
  style,
}) => {
  const frame = useCurrentFrame();
  const f0 = at * FPS;
  if (frame < f0 - 1) return null;
  const exit = out === undefined ? 0 : interpolate(frame, [out * FPS - 7, out * FPS + 5], [0, 1], { ...CL, easing: EIO });
  if (exit >= 1) return null;
  const total = parts.reduce((n, p) => n + Array.from(typeof p === "string" ? p : p.t).length, 0);
  const typed = f0 + total * stagger + 8;
  let idx = 0;
  return (
    <div style={{ fontFamily: serif ? SERIF : FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.28, whiteSpace: "nowrap", textShadow: SHADOW, opacity: 1 - exit, transform: `translateY(${-exit * 22}px)`, ...style }}>
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        const sweep = part.mark ? interpolate(frame, [typed, typed + 10], [0, 1], { ...CL, easing: EO }) : 0;
        return (
          <span key={pi} style={{ position: "relative", color: part.mark ? K.gold : part.c, fontWeight: part.w, fontFamily: part.num ? NUM : undefined, fontSize: part.s ? `${part.s}em` : undefined }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = f0 + idx++ * stagger;
              const k = interpolate(frame, [s, s + 11], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.3}em)` }}>
                  {ch}
                </span>
              );
            })}
            {part.mark ? <span style={{ position: "absolute", left: 0, bottom: "-0.06em", height: "0.08em", width: `${sweep * 100}%`, background: K.gold, borderRadius: 4, boxShadow: `0 0 18px ${K.gold}aa` }} /> : null}
          </span>
        );
      })}
    </div>
  );
};

// A screen-space label (for buildings and tanks), fading in and out.
export const Tag: React.FC<{ x: number; y: number; o: number; color?: string; size?: number; children: React.ReactNode; anchor?: "left" | "center" | "right"; line?: boolean }> = ({
  x,
  y,
  o,
  color = K.fg,
  size = 34,
  children,
  anchor = "center",
  line,
}) => {
  if (o <= 0.001) return null;
  const tx = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, -100%) translateY(${(1 - o) * 8}px)`, opacity: o, fontFamily: FONT, fontWeight: 800, fontSize: size, color, whiteSpace: "nowrap", textShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: anchor === "left" ? "flex-start" : anchor === "right" ? "flex-end" : "center" }}>
      <span>{children}</span>
      {line ? <span style={{ width: 2, height: 26, background: color, opacity: 0.7, marginTop: 4 }} /> : null}
    </div>
  );
};

export const BrandMark: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 46, top: 36, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 * o }}>
      <div style={{ position: "relative", width: 58, height: 58 }}>
        <div style={{ position: "absolute", inset: -9, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,240,232,0.18) 0%, rgba(244,240,232,0.05) 55%, transparent 72%)" }} />
        <Img src={staticFile("mark-disc.png")} style={{ position: "relative", width: 58, height: 58 }} />
      </div>
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 46, color: K.fg, letterSpacing: 3, textShadow: SHADOW }}>世界的形状</span>
    </div>
  );

export const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const d = t - at;
  if (d < 0) return null;
  const k = ramp(d, 0, 0.8, EO);
  const k2 = ramp(d, 0.45, 1.3, EO);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: clamp01(d / 0.33) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 132, height: 132 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: K.fg, letterSpacing: 10 }}>世界的形状</span>
      </div>
      <div style={{ marginTop: 34, fontFamily: SERIF, fontWeight: 600, fontSize: 40, letterSpacing: 18, color: "rgba(244,240,232,0.78)", opacity: k2, transform: `translateY(${(1 - k2) * 10}px)` }}>看见世界如何运行</div>
      <div style={{ position: "absolute", bottom: 120, fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: "rgba(244,240,232,0.7)", opacity: k2 }}>MakerJackie</div>
    </div>
  );
};

export const SOURCES = [
  "钱怎么造出来：英格兰银行季报 2014《Money creation in the modern economy》",
  "贷款和存款：人民银行 2024 年金融统计数据报告、贷款投向统计报告（经新华社等转引）；物价：国家统计局",
  "每 100 元怎么分：国家统计局《中国统计年鉴 2025》资金流量表（2023 年）",
  "六户的收入：美团 2024 年披露；国家统计局农民工监测调查、城镇单位平均工资（2024 年）；饭馆的账：中国饭店协会调研",
  "谁存下了钱：西南财经大学中国家庭金融调查（CHFS 2015，2014 年数据）；水箱高低按这个分布画",
  "家庭资产和负债：人民银行《2019 年中国城镇居民家庭资产负债情况调查》；房贷利率：人民银行 2025 年四季度货币政策执行报告",
  "2009：人民银行货币政策执行报告；国家统计局统计公报；Deng, Morck, Wu & Yeung（NBER 16871；Review of Finance 2015）",
  "房子：国家统计局新建商品房销售额（1998–2025）；标普全球（2026）",
  "但是：英格兰银行季报 2012；Lenza & Slacalek, 欧央行工作论文 2190（2018）",
  "全国家庭户数：第七次全国人口普查",
];

export const Sources: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = win(t, at, out, 0.5, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,9,${0.92 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 130, top: 120, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {SOURCES.map((r, i) => (
          <div key={i} style={{ fontSize: 28, fontWeight: 500, color: "rgba(244,240,232,0.82)", lineHeight: 1.85 }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};
