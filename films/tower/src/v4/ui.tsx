// Type and labels for v4. All timing is in film bars. Lines rise in character by character; world labels are
// pinned to points in the 3D city through the same camera the WebGL frame used.
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Cam } from "../geo/cam";
import { FONT, K, MONO, SERIF } from "../theme";
import { toScreen } from "../world/camera";
import { barAt, bf, clamp01, EIO, EO } from "./bars";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SHADOW = "0 2px 4px rgba(4,6,10,0.55), 0 0 26px rgba(4,6,10,0.75)";

export type Part = string | { t: string; c?: string; w?: number; size?: number; font?: string };

// One line of type: characters rise in from bar `at`, the line lifts away at bar `out`.
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
}> = ({ at, out, parts, size = 64, weight = 800, serif, color = K.fg, stagger = 1.3, style }) => {
  const frame = useCurrentFrame();
  const t0 = bf(at);
  if (frame < t0 - 1) return null;
  const exit = out === undefined ? 0 : interpolate(frame, [bf(out) - 6, bf(out) + 6], [0, 1], { ...CL, easing: EIO });
  if (exit >= 1) return null;
  let idx = 0;
  return (
    <div
      style={{
        fontFamily: serif ? SERIF : FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        textShadow: SHADOW,
        opacity: 1 - exit,
        transform: `translateY(${-exit * 24}px)`,
        ...style,
      }}
    >
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        return (
          <span key={pi} style={{ color: part.c, fontWeight: part.w, fontSize: part.size, fontFamily: part.font }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = t0 + (idx++) * stagger;
              const k = interpolate(frame, [s, s + 12], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.35}em)` }}>
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

// A positioned block of lines.
export const At: React.FC<{ x: number; y: number; align?: "left" | "center" | "right"; gap?: number; children: React.ReactNode }> = ({ x, y, align = "left", gap = 10, children }) => (
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
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [bf(at), bf(at) + 10], [0, 1], CL), interpolate(frame, [bf(out) - 8, bf(out)], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 64, bottom: 40, maxWidth: 1640, fontFamily: FONT, fontSize: 25, fontWeight: 500, color: "rgba(244,240,232,0.7)", textShadow: SHADOW, opacity: o, lineHeight: 1.4 }}>
      {children}
    </div>
  );
};

// A label pinned to a point of the city: a dot on the spot, a thin leader up, the text on top.
export const Pin: React.FC<{
  cam: Cam;
  at: number;
  out: number;
  x: number;
  y: number;
  h?: number;
  lift?: number;
  text: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  size?: number;
  side?: "left" | "right" | "center";
  dot?: boolean;
}> = ({ cam, at, out, x, y, h = 0, lift = 70, text, sub, color = K.fg, size = 30, side = "center", dot = true }) => {
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [bf(at), bf(at) + 10], [0, 1], { ...CL, easing: EO }), interpolate(frame, [bf(out) - 8, bf(out)], [1, 0], CL));
  if (o <= 0) return null;
  const [sx, sy, vis] = toScreen(cam, x, y, h);
  if (!vis || sx < -300 || sx > 2220 || sy < -200 || sy > 1280) return null;
  const grow = clamp01(o * 1.4);
  const ly = sy - lift * grow;
  const tx = side === "center" ? "-50%" : side === "right" ? "0%" : "-100%";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", opacity: o }}>
      {dot ? <div style={{ position: "absolute", left: sx - 6, top: sy - 6, width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 14px ${color}` }} /> : null}
      <div style={{ position: "absolute", left: sx - 1, top: ly, width: 2, height: sy - ly, background: `linear-gradient(${color}, ${color}00)` }} />
      <div
        style={{
          position: "absolute",
          left: sx + (side === "right" ? 10 : side === "left" ? -10 : 0),
          top: ly - 8,
          transform: `translate(${tx}, -100%)`,
          fontFamily: FONT,
          fontSize: size,
          fontWeight: 800,
          color,
          whiteSpace: "nowrap",
          textShadow: SHADOW,
          textAlign: side === "center" ? "center" : side === "right" ? "left" : "right",
        }}
      >
        {text}
        {sub ? <div style={{ fontSize: size * 0.66, fontWeight: 600, color: "rgba(244,240,232,0.78)", marginTop: 2 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// A number that runs between keys [[bar, value], ...].
export const runNum = (bar: number, keys: [number, number][]) => {
  if (bar <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (bar <= keys[i][0]) {
      const t = (bar - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * EIO(Math.max(0, Math.min(1, t)));
    }
  }
  return keys[keys.length - 1][1];
};

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const useBar = () => barAt(useCurrentFrame());

export const fade = (bar: number, a: number, b: number, f = 0.25) => Math.min(clamp01((bar - a) / f), clamp01((b - bar) / f));

// ---------- Brand ----------

export const BrandMark: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 44, top: 34, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 * o }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: 44, height: 44 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2, textShadow: SHADOW }}>世界的形状</span>
    </div>
  );

export const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = frame - bf(at);
  if (t < 0) return null;
  const k = interpolate(t, [0, 24], [0, 1], { ...CL, easing: EO });
  const k2 = interpolate(t, [14, 40], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: Math.min(1, t / 10) }}>
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
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [bf(at), bf(at) + 12], [0, 1], CL), interpolate(frame, [bf(out) - 10, bf(out)], [1, 0], CL));
  if (o <= 0) return null;
  const rows = [
    "深圳能源：竞买总部用地公告 2008、投资大厦项目公告 2010（含融资安排）、关联租赁公告 2018 / 2023、年报 2008–2018",
    "CTBUH Skyscraper Center：深圳已建成高楼的高度与竣工年份（2026-10）",
    "空置率：高力、仲量联行、戴德梁行、第一太平戴维斯 2026 年三季度；莱坊 2026 年二季度（分片区）",
    "租金：戴德梁行（21 世纪经济报道 2026-07、南方+ 2026-10）",
    "仲量联行《2025 年深圳房地产市场回顾》2026-01",
    "地价：第一财经 2026-06（粤海住宅地）；澎湃新闻 2025-10（K602-0016 出让公告）",
    "福田区政府：税收过亿元楼宇（2012、2025 年政府工作报告，《福田概况》2026）",
    "深圳市规划和自然资源局《2026 年度建设用地供应计划》；每日经济新闻（2021 年商服用地 52.3 公顷）",
    "财政部：全国国有土地使用权出让收入 2021、2025 年；戴德梁行（上海）、莱坊（北京）2026；深圳市政府工作报告 2026",
    "观点网 2022-11（恒大深超总地块停工、转让）；赢商网 2024-05（万科深超总地块转让）",
    "回报率为估算：整栋按市场租金出租、租金不涨，扣除税费、运营与大修，地到期后不计价值；十年期国债收益率（2026-10）",
    "地图：© OpenStreetMap contributors（ODbL）· 三维城市由代码逐帧生成，CTBUH 高楼位置为示意轮廓",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.82 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 140, top: 120, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 27, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.85, fontFamily: i === rows.length ? MONO : FONT }}>
            {r}
          </div>
        ))}
        <div style={{ fontSize: 22, color: "rgba(244,240,232,0.5)", marginTop: 26 }}>数据截至 2026 年 10 月 · 不构成投资建议</div>
      </div>
    </div>
  );
};
