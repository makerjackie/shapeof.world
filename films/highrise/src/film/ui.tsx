// Type and labels. All timing is in film seconds (from the music grid). Lines rise in character by character and
// lift away; labels are pinned to points of the 3D world through the same camera the WebGL frame used.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, FPS } from "../timing";
import { Cam, toScreen } from "../world/camera";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const SHADOW = "0 2px 4px rgba(3,5,9,0.6), 0 0 28px rgba(3,5,9,0.8)";

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
  stagger?: number; // seconds per character
  style?: React.CSSProperties;
}> = ({ at, out, parts, size = 72, weight = 800, serif, color = K.fg, stagger = 0.035, style }) => {
  const t = useT();
  if (t < at - 0.05) return null;
  const exit = out === undefined ? 0 : interpolate(t, [out - 0.2, out + 0.2], [0, 1], { ...CL, easing: EIO });
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
        transform: `translateY(${-exit * 22}px)`,
        ...style,
      }}
    >
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        return (
          <span key={pi} style={{ color: part.c, fontWeight: part.w, fontSize: part.size, fontFamily: part.font }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = at + idx++ * stagger;
              const k = interpolate(t, [s, s + 0.4], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.32}em)`, filter: undefined }}>
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
    <div style={{ position: "absolute", left: 64, bottom: 36, maxWidth: 1700, fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(244,240,232,0.66)", textShadow: SHADOW, opacity: o, lineHeight: 1.4 }}>
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
}> = ({ cam, at, out, p, lift = 60, dx = 0, text, sub, color = K.fg, size = 34, side = "center", dot = true }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.35], [0, 1], { ...CL, easing: EO }), interpolate(t, [out - 0.3, out], [1, 0], CL));
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
        <line x1={sx} y1={sy} x2={lx} y2={ly} stroke={color} strokeOpacity={0.75} strokeWidth={2} />
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
        {sub ? <div style={{ fontSize: size * 0.62, fontWeight: 600, color: "rgba(244,240,232,0.8)", marginTop: 4 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fade = (t: number, a: number, b: number, f = 0.35) => Math.min(clamp01((t - a) / f), clamp01((b - t) / f));

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
    "高层住宅约 102.3 万栋（2023 年底）：中国消防协会科普教育工作委员会委员许传升，据《中国新闻周刊》2024",
    "《建筑设计防火规范》GB 50016；《民用建筑隔声设计规范》GB 50118-2010；《住宅项目规范》GB 55038-2025；《民法典》第 278 条",
    "得房率：中国新闻网 2022-08；云梯高度：第一财经；家庭户规模：第七次全国人口普查",
    "电梯：市场监管总局 2025、质检总局 2013；住房城乡建设部、财政部 2015 年通知",
    "维护占物业费：中国物业管理协会；收缴率：克而瑞；物业撤场：中指研究院；柳州：南方周末（均据智谷趋势 2026-07）",
    "维修资金：南京市住房保障和房产局 2017；浙工新村：杭州日报、新华社、拱墅区住建局",
    "Champlain Towers South：NPR、WPTV、Miami-Dade 2021；照片 Mapillary（CC BY-SA 4.0）、Miami-Dade Fire Rescue（公有领域）",
    "购房年龄：贝壳研究院 2018；出生：《中国统计年鉴》、国家统计局 2026-01",
    "美孚新邨：Wikipedia、星岛头条 2025-10；照片 Wpcpey（CC BY 4.0）",
    "城市与楼由代码逐帧生成，是示意；音乐《千年之后（氛围版）》",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.86 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 130, top: 104, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 26, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 26, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.8 }}>
            {r}
          </div>
        ))}
        <div style={{ fontSize: 22, color: "rgba(244,240,232,0.5)", marginTop: 22 }}>数据截至 2026 年 10 月 · 不构成购房建议</div>
      </div>
    </div>
  );
};
