// Type and labels (from films/highrise/src/film/ui.tsx). All timing is in film seconds. Lines rise in character by
// character and lift away; pins hang on points of the 3D world through the same camera the WebGL frame used.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, FPS } from "../timing";
import { Cam, toScreen } from "../world/camera";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const SHADOW = "0 2px 4px rgba(3,5,9,0.65), 0 0 30px rgba(3,5,9,0.85)";

export const useT = () => useCurrentFrame() / FPS;

export type Part = string | { t: string; c?: string; w?: number; size?: number; font?: string };

// One line of type: characters rise in from `at` (seconds), the line lifts away at `out`.
export const Line: React.FC<{
  at: number;
  out?: number;
  parts: Part[];
  size?: number;
  weight?: number;
  serif?: boolean;
  color?: string;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ at, out, parts, size = 72, weight = 800, serif, color = K.fg, stagger = 0.03, style }) => {
  const t = useT();
  if (t < at - 0.05) return null;
  const exit = out === undefined ? 0 : interpolate(t, [out - 0.22, out + 0.12], [0, 1], { ...CL, easing: EIO });
  if (exit >= 1) return null;
  let idx = 0;
  return (
    <div
      style={{
        fontFamily: serif ? SERIF : FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.28,
        whiteSpace: "nowrap",
        textShadow: SHADOW,
        opacity: 1 - exit,
        transform: `translateY(${-exit * 20}px)`,
        ...style,
      }}
    >
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        return (
          <span key={pi} style={{ color: part.c, fontWeight: part.w, fontSize: part.size, fontFamily: part.font }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = at + idx++ * stagger;
              const k = interpolate(t, [s, s + 0.3], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.3}em)` }}>
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

export const At: React.FC<{ x: number; y: number; align?: "left" | "center" | "right"; gap?: number; children: React.ReactNode }> = ({ x, y, align = "left", gap = 8, children }) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? x : align === "center" ? x - 960 : undefined,
      right: align === "right" ? 1920 - x : undefined,
      width: align === "center" ? 1920 : undefined,
      top: y,
      display: "flex",
      flexDirection: "column",
      alignItems: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
      gap,
    }}
  >
    {children}
  </div>
);

// Source / caveat line, bottom left, only where honesty needs it.
export const Note: React.FC<{ at: number; out: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.35], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 64, bottom: 34, maxWidth: 1760, fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(244,240,232,0.66)", textShadow: SHADOW, opacity: o, lineHeight: 1.4 }}>
      {children}
    </div>
  );
};

// A label pinned to a 3D point: a dot, a thin leader, the text.
export const Pin: React.FC<{
  cam: Cam;
  at: number;
  out: number;
  p: [number, number, number];
  lift?: number;
  dx?: number;
  text: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  size?: number;
  side?: "left" | "right" | "center";
  dot?: boolean;
}> = ({ cam, at, out, p, lift = 60, dx = 0, text, sub, color = K.fg, size = 40, side = "center", dot = true }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], { ...CL, easing: EO }), interpolate(t, [out - 0.25, out], [1, 0], CL));
  if (o <= 0) return null;
  const [sx, sy, vis] = toScreen(cam, p[0], p[1], p[2]);
  if (!vis || sx < -400 || sx > 2320 || sy < -300 || sy > 1380) return null;
  const grow = clamp01(o * 1.3);
  const ly = sy - lift * grow;
  const lx = sx + dx * grow;
  const tx = side === "center" ? "-50%" : side === "right" ? "0%" : "-100%";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", opacity: o }}>
      {dot ? <div style={{ position: "absolute", left: sx - 6, top: sy - 6, width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 14px ${color}` }} /> : null}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={sx} y1={sy} x2={lx} y2={ly} stroke={color} strokeOpacity={0.7} strokeWidth={2} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: lx + (side === "right" ? 10 : side === "left" ? -10 : 0),
          top: ly - 6,
          transform: `translate(${tx}, -100%)`,
          fontFamily: FONT,
          fontSize: size,
          fontWeight: 800,
          color,
          whiteSpace: "nowrap",
          textShadow: SHADOW,
          textAlign: side === "center" ? "center" : side === "right" ? "left" : "right",
          lineHeight: 1.2,
        }}
      >
        {text}
        {sub ? <div style={{ fontSize: size * 0.6, fontWeight: 600, color: "rgba(244,240,232,0.82)", marginTop: 4 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// A soft pool of shade behind a block of type, fading with it.
export const Scrim: React.FC<{ at: number; out: number; kind: "tl" | "tc" | "c" | "r" | "l" | "bl" | "b"; k?: number }> = ({ at, out, kind, k = 0.62 }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at - 0.25, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out + 0.2], [1, 0], CL));
  if (o <= 0) return null;
  const shape = {
    tl: "ellipse 62% 58% at 0% 0%",
    tc: "ellipse 70% 46% at 50% 0%",
    c: "ellipse 60% 48% at 50% 50%",
    r: "ellipse 52% 72% at 100% 50%",
    l: "ellipse 52% 72% at 0% 50%",
    bl: "ellipse 62% 50% at 0% 100%",
    b: "ellipse 80% 46% at 50% 100%",
  }[kind];
  return <div style={{ position: "absolute", inset: 0, opacity: o, background: `radial-gradient(${shape}, rgba(3,5,10,${k}), rgba(3,5,10,${k * 0.55}) 40%, rgba(3,5,10,0) 78%)` }} />;
};

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Brand ----------

export const BrandMark: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 44, top: 34, display: "flex", alignItems: "center", gap: 12, opacity: 0.72 * o }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: 44, height: 44 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2, textShadow: SHADOW }}>世界的形状</span>
    </div>
  );

export const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const t = useT() - at;
  if (t < 0) return null;
  const k = interpolate(t, [0, 0.8], [0, 1], { ...CL, easing: EO });
  const k2 = interpolate(t, [0.45, 1.3], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: Math.min(1, t / 0.35) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 132, height: 132 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: K.fg, letterSpacing: 10 }}>世界的形状</span>
      </div>
      <div style={{ marginTop: 34, fontFamily: SERIF, fontWeight: 600, fontSize: 40, letterSpacing: 18, color: "rgba(244,240,232,0.78)", opacity: k2, transform: `translateY(${(1 - k2) * 10}px)` }}>看见世界如何运行</div>
      <div style={{ position: "absolute", bottom: 120, fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: "rgba(244,240,232,0.7)", opacity: k2 }}>MakerJackie</div>
    </div>
  );
};

export const Sources: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.4], [0, 1], CL), interpolate(t, [out - 0.35, out], [1, 0], CL));
  if (o <= 0) return null;
  const rows = [
    "Base44：TechCrunch 2025-06-18 · 公开收入的小生意：Indie Hackers 分析 TrustMRR 5,079 个经 Stripe 核验的项目，2026-03",
    "个体工商户 1.25 亿户：市场监管总局，2024 年 6 月底（央视网、求是网）",
    "每月新上线的订阅收费 App：RevenueCat《State of Subscription Apps 2026》（数据来自 Appfigures）",
    "工信部《人工智能中小企业创业支持计划（2026—2028 年）》2026-09 · 《广东省支持人工智能 OPC 创新发展行动方案》2026-03",
    "《成都市支持人工智能 OPC 创新发展若干措施（征求意见稿）》2026-03 · 《公司法》（2023 修订）第二十三条",
    "34 倍、61 倍，回头客 30% 与 8%，第二年多花 47%：Stripe《Solo founding is at an all-time high》2026-05-28",
    "电视与明星效应：Felix Koenig，American Economic Review: Insights，2023",
    "知乎 37 个问题、505 个回答，作为观点参考 · 人民币按 1 美元约 6.72 元换算",
    "集市、摊位与光点由代码逐帧生成，是示意 · 配乐：《独立开发者的形状》原创曲",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.88 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 130, top: 120, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 28, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 25, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.66 }}>
            {r}
          </div>
        ))}
        <div style={{ fontSize: 22, color: "rgba(244,240,232,0.5)", marginTop: 24 }}>数据截至 2026 年 10 月 · 个人案例多为本人或媒体所述 · 不构成创业建议</div>
      </div>
    </div>
  );
};
