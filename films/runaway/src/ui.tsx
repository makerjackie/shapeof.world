// Shared UI of the film's one world: the assistant's chat window, the green ✓ card, the weekend task cards, numbers,
// stamps. Everything is drawn here; nothing imitates a real product.
import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, EO, ramp, SHADOW, useT } from "./kit";
import { FONT, K, MONO, NUM } from "./theme";
import { FPS } from "./time";

export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Wrapping typed text. Characters fade and rise in from `at` at `cps` characters per second.
export const Type: React.FC<{
  at: number;
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  cps?: number;
  font?: string;
  width?: number;
  lh?: number;
  style?: React.CSSProperties;
  cursor?: boolean;
}> = ({ at, text, size = 44, color = K.fg, weight = 700, cps = 30, font = FONT, width, lh = 1.38, style, cursor }) => {
  const t = useT();
  if (t < at - 0.05) return null;
  const chars = Array.from(text);
  const shown = (t - at) * cps;
  const done = shown >= chars.length;
  return (
    <div style={{ fontFamily: font, fontSize: size, color, fontWeight: weight, lineHeight: lh, width, textShadow: SHADOW, ...style }}>
      {chars.map((ch, i) => {
        const k = clamp01((shown - i) / 3);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.25}em)` }}>
            {ch}
          </span>
        );
      })}
      {cursor && !done ? <span style={{ display: "inline-block", width: size * 0.08, height: size * 1.05, marginLeft: 4, background: color, verticalAlign: "middle" }} /> : null}
    </div>
  );
};

// Fade + lift for a block between a and b.
export const useIn = (a: number, b = 1e9, fi = 0.35, fo = 0.35) => {
  const t = useT();
  const kin = ramp(t, a, a + fi, EO);
  const kout = ramp(t, b - fo, b);
  return { o: Math.min(kin, 1 - kout), y: (1 - kin) * 18 - kout * 12, kin, t };
};

export const Orb: React.FC<{ size: number; color?: string; o?: number }> = ({ size, color = K.cyan, o = 1 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      opacity: o,
      background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 38%, ${color}33 72%, transparent 74%)`,
      boxShadow: `0 0 ${size * 0.6}px ${color}88`,
      flex: "none",
    }}
  />
);

// The assistant's window: title bar, scrollable body (children), input bar.
export const ChatWindow: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  scale?: number;
  o?: number;
  clock?: string;
  input?: React.ReactNode;
  children?: React.ReactNode;
  glow?: string;
}> = ({ x, y, w, h, scale = 1, o = 1, clock = "20:14", input, children, glow }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: `scale(${scale})`,
      transformOrigin: "50% 50%",
      opacity: o,
      borderRadius: 26,
      background: "linear-gradient(180deg, rgba(22,28,44,0.97), rgba(12,16,27,0.97))",
      border: "1.5px solid rgba(255,255,255,0.1)",
      boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.6)${glow ? `, 0 0 90px ${glow}` : ""}`,
      overflow: "hidden",
      fontFamily: FONT,
    }}
  >
    <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 26px", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 15, height: 15, borderRadius: "50%", background: c, opacity: 0.85 }} />
      ))}
      <div style={{ marginLeft: 22, display: "flex", alignItems: "center", gap: 12 }}>
        <Orb size={30} />
        <span style={{ color: K.fg, fontSize: 25, fontWeight: 700 }}>你的 AI 助手</span>
        <span style={{ color: K.ok, fontSize: 19, fontWeight: 600, marginLeft: 6 }}>● 在线</span>
      </div>
      <div style={{ marginLeft: "auto", color: K.muted, fontFamily: NUM, fontSize: 22, fontWeight: 500 }}>{clock}</div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 64, bottom: input ? 104 : 0, padding: "30px 40px", display: "flex", flexDirection: "column", gap: 22, justifyContent: "flex-end" }}>
      {children}
    </div>
    {input ? (
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 20, height: 72, borderRadius: 36, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", padding: "0 10px 0 30px" }}>
        {input}
      </div>
    ) : null}
  </div>
);

export const UserBubble: React.FC<{ children: React.ReactNode; o?: number; y?: number; size?: number }> = ({ children, o = 1, y = 0, size = 34 }) => (
  <div style={{ alignSelf: "flex-end", maxWidth: "78%", opacity: o, transform: `translateY(${y}px)`, background: "linear-gradient(180deg,#34446b,#2a3858)", color: K.fg, fontSize: size, fontWeight: 600, lineHeight: 1.4, padding: "18px 28px", borderRadius: "28px 28px 8px 28px", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
    {children}
  </div>
);

export const AiBubble: React.FC<{ children: React.ReactNode; o?: number; y?: number; size?: number }> = ({ children, o = 1, y = 0, size = 34 }) => (
  <div style={{ alignSelf: "flex-start", display: "flex", gap: 16, alignItems: "flex-start", opacity: o, transform: `translateY(${y}px)`, maxWidth: "84%" }}>
    <div style={{ marginTop: 10 }}>
      <Orb size={40} />
    </div>
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: K.fg, fontSize: size, fontWeight: 600, lineHeight: 1.4, padding: "18px 28px", borderRadius: "8px 28px 28px 28px" }}>{children}</div>
  </div>
);

// The green ✓ pill, popping in at `at`.
export const Check: React.FC<{ at: number; size?: number; label?: string; style?: React.CSSProperties }> = ({ at, size = 40, label = "已解决", style }) => {
  const t = useT();
  if (t < at) return null;
  const k = ramp(t, at, at + 0.35, EO);
  const pop = 1 + 0.25 * Math.sin(Math.PI * clamp01((t - at) / 0.3)) * (1 - clamp01((t - at) / 0.3));
  const flash = 1 - ramp(t, at, at + 0.8);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        padding: `${size * 0.22}px ${size * 0.6}px ${size * 0.22}px ${size * 0.4}px`,
        borderRadius: size,
        background: `linear-gradient(180deg, ${K.ok}33, ${K.ok}1a)`,
        border: `2px solid ${K.ok}`,
        boxShadow: `0 0 ${20 + 50 * flash}px ${K.ok}${flash > 0.3 ? "aa" : "55"}`,
        color: K.okHi,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        opacity: k,
        transform: `scale(${(0.6 + 0.4 * k) * pop})`,
        transformOrigin: "0% 50%",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ display: "inline-flex", width: size * 1.05, height: size * 1.05, borderRadius: "50%", background: K.ok, color: "#06281a", alignItems: "center", justifyContent: "center", fontSize: size * 0.72, fontWeight: 900 }}>✓</span>
      {label}
    </div>
  );
};

// The big success card the user loves (cold open, Monday, the flip).
export const SuccessCard: React.FC<{ w?: number; at?: number; dim?: number }> = ({ w = 760, at = -10, dim = 0 }) => {
  const t = useT();
  const k = ramp(t, at, at + 0.4, EO);
  return (
    <div
      style={{
        width: w,
        borderRadius: 30,
        padding: "40px 48px 44px",
        background: "linear-gradient(160deg, rgba(30,74,56,0.95), rgba(14,32,28,0.96))",
        border: `2.5px solid ${K.ok}`,
        boxShadow: `0 0 80px ${K.ok}66, inset 0 0 60px ${K.ok}22`,
        fontFamily: FONT,
        transform: `scale(${0.85 + 0.15 * k})`,
        opacity: k * (1 - dim),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: K.ok, color: "#06281a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 900, boxShadow: `0 0 40px ${K.ok}` }}>✓</div>
        <div style={{ fontSize: 66, fontWeight: 900, color: K.okHi, letterSpacing: 2 }}>已解决</div>
      </div>
      <div style={{ marginTop: 30, fontSize: 40, fontWeight: 700, color: K.fg }}>旅行 App 已上线</div>
      <div style={{ marginTop: 14, display: "flex", gap: 40, fontSize: 32, color: K.sub, fontWeight: 600 }}>
        <span>全球地图 · 190 个国家</span>
      </div>
      <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontSize: 32, color: K.sub, fontWeight: 600 }}>地图费</span>
        <span style={{ fontFamily: NUM, fontSize: 92, fontWeight: 900, color: K.okHi, lineHeight: 1 }}>¥0</span>
      </div>
    </div>
  );
};

// Confetti from the top of a box, deterministic.
export const Confetti: React.FC<{ at: number; x: number; y: number; w: number; n?: number; o?: number }> = ({ at, x, y, w, n = 70, o = 1 }) => {
  const t = useT();
  const d = t - at;
  if (d < 0 || d > 5) return null;
  const r = rng(77);
  const cols = [K.ok, K.okHi, K.gold, "#7fd1ff", "#ff9bd2", "#ffffff"];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o * (1 - clamp01((d - 3.5) / 1.5)) }}>
      {Array.from({ length: n }, (_, i) => {
        const x0 = x + r() * w;
        const vx = (r() - 0.5) * 260;
        const vy = -380 - r() * 420;
        const g = 900;
        const px = x0 + vx * d;
        const py = y + vy * d + 0.5 * g * d * d;
        const rot = (r() * 360 + d * (r() - 0.5) * 900) % 360;
        const c = cols[i % cols.length];
        const s = 8 + r() * 10;
        return <rect key={i} x={px - s / 2} y={py - s / 4} width={s} height={s / 2} fill={c} transform={`rotate(${rot.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})`} />;
      })}
    </svg>
  );
};

// A rolling number (integer), formatted with thousands separators.
export const Num: React.FC<{ v: number; size: number; color?: string; weight?: number }> = ({ v, size, color = K.fg, weight = 900 }) => (
  <span style={{ fontFamily: NUM, fontSize: size, fontWeight: weight, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{Math.round(v).toLocaleString("en-US")}</span>
);

// Red rubber stamp "测试里发生过", slamming down at `at`.
export const Stamp: React.FC<{ at: number; x: number; y: number; rot?: number; size?: number; text?: string }> = ({ at, x, y, rot = -9, size = 1, text = "测试里发生过" }) => {
  const t = useT();
  if (t < at) return null;
  const d = t - at;
  const k = ramp(d, 0, 0.16, (v) => v * v);
  const s = 2.4 - 1.4 * k;
  const o = clamp01(d / 0.08);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s * size})`,
        opacity: o * 0.94,
        border: `5px solid ${K.red}`,
        outline: `2px solid ${K.red}`,
        outlineOffset: 5,
        borderRadius: 10,
        padding: "8px 22px",
        color: K.red,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 40,
        letterSpacing: 4,
        whiteSpace: "nowrap",
        background: "rgba(40,6,12,0.55)",
        textShadow: `0 0 16px ${K.red}66`,
        boxShadow: `0 0 30px ${K.red}44`,
      }}
    >
      {text}
    </div>
  );
};

// Screen shake (px) after a hit.
export const shake = (t: number, hits: number[], amp = 9) => {
  let dx = 0;
  let dy = 0;
  for (const h of hits) {
    const d = t - h;
    if (d < 0 || d > 0.25) continue;
    const e = (1 - d / 0.25) * amp;
    dx += Math.sin(d * 90) * e;
    dy += Math.cos(d * 77) * e * 0.6;
  }
  return { dx, dy };
};

export const Label: React.FC<{ c: string; children: React.ReactNode; size?: number }> = ({ c, children, size = 24 }) => (
  <span style={{ display: "inline-block", padding: "5px 14px", borderRadius: 10, background: `${c}22`, border: `1.5px solid ${c}88`, color: c, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: 1, whiteSpace: "nowrap" }}>{children}</span>
);

export const useFrame = () => useCurrentFrame();
export const sec = (f: number) => f / FPS;
export { MONO };
