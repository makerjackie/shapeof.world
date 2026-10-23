import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, SERIF } from "../theme";

// v2 · one look for the whole film: dark, polished kinetic type and clean 2D objects (the user's pick, 2026-10-23).
// Time is in film seconds. The beat grid runs unbroken through both tracks: beats at 0.08 + n × 0.5 s, bars at
// 0.08 + 2b (120 BPM). See SCRIPT.md for the scene and music map.

export const FPS = 30;
export const END = 116.0;
export const FRAMES = Math.round(END * FPS);
export const bt = (n: number) => 0.08 + n * 0.5;
export const barT = (b: number) => 0.08 + b * 2;
export const fr = (s: number) => Math.round(s * FPS);

export const C = {
  bg: "#07090b",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3c3e40",
  line: "rgba(244,240,232,0.12)",
  grid: "rgba(244,240,232,0.05)",
  gold: "#ffd166",
  ink: "#19231f",
  red: "#ff5a5f",
  green: "#3ddc97",
  cyan: "#4dd4ff",
  violet: "#a78bfa",
  orange: "#ff9f43",
  glass: "rgba(255,255,255,0.055)",
  glassLine: "rgba(255,255,255,0.12)",
};

export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const useT = () => useCurrentFrame() / FPS;
export const pr = (t: number, a: number, d: number, e = EO) => interpolate(t, [a, a + d], [0, 1], { ...CL, easing: e });
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ── A scene window: visible from `from` to `to` (seconds) with a short in/out move on the cut. ──
export const Scene: React.FC<{ from: number; to: number; children: React.ReactNode; inMove?: "scale" | "up" | "none"; outMove?: "scale" | "fade" | "none" }> = ({
  from,
  to,
  children,
  inMove = "scale",
  outMove = "scale",
}) => {
  const t = useT();
  if (t < from - (inMove === "none" ? 0 : 0.2) || t > to + (outMove === "none" ? 0.05 : 0.25)) return null;
  const i = pr(t, from - 0.12, 0.3, EO);
  const o = outMove === "none" ? 0 : pr(t, to - 0.05, 0.25, EIO);
  const s = (inMove === "scale" ? lerp(1.04, 1, i) : 1) * (outMove === "scale" ? lerp(1, 0.97, o) : 1);
  const y = inMove === "up" ? (1 - i) * 40 : 0;
  return <AbsoluteFill style={{ opacity: (inMove === "none" ? 1 : i) * (1 - o), transform: `translateY(${y}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// ── Camera for a scene: interpolates a transform between keyframes [time, x, y, scale]. ──
export const Cam: React.FC<{ keys: [number, number, number, number][]; children: React.ReactNode; origin?: string }> = ({ keys, children, origin = "960px 540px" }) => {
  const t = useT();
  let [, x, y, s] = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const [t0] = keys[i - 1];
    const [t1, x1, y1, s1] = keys[i];
    if (t >= t0) {
      const k = pr(t, t0, t1 - t0, EIO);
      x = lerp(keys[i - 1][1], x1, k);
      y = lerp(keys[i - 1][2], y1, k);
      s = lerp(keys[i - 1][3], s1, k);
    }
  }
  return <AbsoluteFill style={{ transformOrigin: origin, transform: `translate(${x}px, ${y}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// ── Background: night, a slowly drifting grid and a coloured glow that follows the scene ──
export const Backdrop: React.FC<{ glow: string; at?: [number, number]; strength?: number }> = ({ glow, at = [50, 50], strength = 0.22 }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: "absolute", inset: -100, backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: "80px 80px", backgroundPosition: `${-t * 12}px ${t * 7}px` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 55% at ${at[0]}% ${at[1]}%, ${glow}${Math.round(strength * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};

// ── Kinetic caption: characters rise out of a mask at 14 a second from `at`; the keyword gets a full gold marker
// with ink type on the beat `kwAt`; the line lifts and fades out at `out`. ──
export const Line: React.FC<{ at: number; text: string; size?: number; kw?: string; kwAt?: number; out?: number; color?: string; x?: number; y?: number; weight?: number; center?: boolean }> = ({
  at,
  text,
  size = 92,
  kw,
  kwAt,
  out,
  color = C.fg,
  x = 120,
  y = 150,
  weight = 900,
  center = false,
}) => {
  const t = useT();
  if (t < at - 0.05) return null;
  const chars = Array.from(text);
  const k0 = kw ? text.indexOf(kw) : -1;
  const k1 = k0 >= 0 ? k0 + Array.from(kw!).length : -1;
  const hl = kwAt === undefined ? 0 : pr(t, kwAt, 0.3, EO);
  const o = out === undefined ? 0 : pr(t, out, 0.3, EIO);
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: center ? 0 : x, width: center ? 1920 : undefined, textAlign: center ? "center" : undefined, top: y, fontFamily: FONT, fontWeight: weight, fontSize: size, color, whiteSpace: "nowrap", lineHeight: 1.15, letterSpacing: -1, opacity: 1 - o, transform: `translateY(${-o * 14}px)` }}>
      {chars.map((c, i) => {
        const p = pr(t, at + i / 14, 0.22, EO);
        const inKw = i >= k0 && i < k1;
        const fill = inKw ? clamp01(hl * (k1 - k0) - (i - k0)) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "pre" }}>
            {fill > 0 ? <span style={{ position: "absolute", left: 0, top: size * 0.1, bottom: size * 0.03, width: `${fill * 100}%`, background: C.gold, zIndex: 0 }} /> : null}
            <span style={{ position: "relative", zIndex: 1, display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: inKw && hl > 0.5 ? C.ink : undefined }}>{c}</span>
          </span>
        );
      })}
    </div>
  );
};

// ── Small type ──
export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; at?: number; anchor?: "left" | "center" | "right"; weight?: number }> = ({
  x,
  y,
  children,
  size = 28,
  color = C.sub,
  at = -1,
  anchor = "left",
  weight = 700,
}) => {
  const t = useT();
  const p = pr(t, at, 0.35, EO);
  if (p <= 0) return null;
  const tx = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0";
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, ${(1 - p) * 12}px)`, opacity: p, fontFamily: FONT, fontSize: size, fontWeight: weight, color, whiteSpace: "nowrap" }}>{children}</div>;
};

export const Src: React.FC<{ children: React.ReactNode; at?: number }> = ({ children, at = -1 }) => {
  const t = useT();
  return <div style={{ position: "absolute", left: 96, top: 1028, opacity: 0.6 * pr(t, at, 0.4), fontFamily: FONT, fontSize: 20, fontWeight: 500, color: C.fg, whiteSpace: "nowrap" }}>{children}</div>;
};

// ── Glass card ──
export const Glass: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode; glow?: string; radius?: number; style?: React.CSSProperties }> = ({ x, y, w, h, children, glow, radius = 26, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: radius,
      background: "linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025) 60%)",
      border: `1px solid ${C.glassLine}`,
      boxShadow: `0 40px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)${glow ? `, 0 0 80px ${glow}40` : ""}`,
      fontFamily: FONT,
      color: C.fg,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

// ── Brand corner (hard rule 1): the round ball + 世界的形状, paper white on the dark look ──
export const Corner: React.FC<{ until: number }> = ({ until }) => {
  const t = useT();
  const o = 1 - pr(t, until - 0.4, 0.4, EIO);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 48, top: 38, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 * o }}>
      <Img src={staticFile("brand/mark-disc.png")} style={{ width: 46, height: 46 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", color: C.fg }}>世界的形状</span>
    </div>
  );
};

export const money = (v: number) => `¥${Math.round(v).toLocaleString("en-US")}`;
