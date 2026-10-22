import React from "react";
import { Easing, interpolate } from "remotion";
import { useBeatFrame } from "./kit";
import { FPB } from "./timing";
import { FONT, K } from "./theme";

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0→1 between beats `at` and `at + dur` (scene-local beats).
export const progAt = (frame: number, at: number, dur = 1, easing = EO) =>
  interpolate(frame, [at * FPB, (at + dur) * FPB], [0, 1], { ...CL, easing });

export const useProg = (at: number, dur = 1, easing = EO) => progAt(useBeatFrame(), at, dur, easing);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- Kinetic type ----------

export type Part = string | { t: string; c?: string; hl?: string; strike?: string; w?: number; size?: number };

// Characters rise out of a mask one after another, starting on beat `at`.
export const Kinetic: React.FC<{
  at: number;
  parts: Part[];
  size: number;
  stagger?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
  out?: number;
}> = ({ at, parts, size, stagger = 1.6, color = K.fg, weight = 900, style, out }) => {
  const frame = useBeatFrame();
  let idx = 0;
  const exit = out === undefined ? 0 : progAt(frame, out, 0.5, EIO);
  if (exit >= 1) return null;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.12,
        letterSpacing: size > 90 ? -0.02 * size : 0,
        whiteSpace: "nowrap",
        opacity: 1 - exit,
        transform: `translateY(${-exit * 40}px)`,
        ...style,
      }}
    >
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        const chars = Array.from(part.t);
        const start = idx;
        idx += chars.length;
        const partEnd = at * FPB + (start + chars.length) * stagger;
        const hlP = interpolate(frame, [partEnd, partEnd + 10], [0, 1], { ...CL, easing: EO });
        const stP = interpolate(frame, [partEnd + 4, partEnd + 14], [0, 1], { ...CL, easing: EO });
        return (
          <span key={pi} style={{ position: "relative", display: "inline-block", color: part.c, fontWeight: part.w, fontSize: part.size }}>
            {part.hl ? (
              <span
                style={{
                  position: "absolute",
                  left: -6,
                  right: -6,
                  top: "4%",
                  bottom: "-2%",
                  background: part.hl,
                  borderRadius: 8,
                  transform: `scaleX(${hlP})`,
                  transformOrigin: "left center",
                }}
              />
            ) : null}
            {chars.map((ch, ci) => {
              const t0 = at * FPB + (start + ci) * stagger;
              const p1 = interpolate(frame, [t0, t0 + 14], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0", position: "relative" }}>
                  <span
                    style={{
                      display: "inline-block",
                      transform: `translateY(${(1 - p1) * 105}%) rotate(${(1 - p1) * 10}deg)`,
                      whiteSpace: "pre",
                    }}
                  >
                    {ch}
                  </span>
                </span>
              );
            })}
            {part.strike ? (
              <span
                style={{
                  position: "absolute",
                  left: -10,
                  top: "50%",
                  height: Math.max(6, size * 0.09),
                  width: `calc(${stP * 100}% + ${stP * 20}px)`,
                  background: part.strike,
                  borderRadius: 6,
                  transform: "rotate(-3deg)",
                  boxShadow: `0 0 20px ${part.strike}`,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Rolling odometer digits ----------

const Digit: React.FC<{ pos: number; h: number }> = ({ pos, h }) => (
  <span style={{ display: "inline-block", height: h, overflow: "hidden", verticalAlign: "top", width: "0.62em", textAlign: "center" }}>
    <span style={{ display: "block", transform: `translateY(${-pos * h}px)` }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
        <span key={i} style={{ display: "block", height: h, lineHeight: `${h}px` }}>
          {d}
        </span>
      ))}
    </span>
  </span>
);

// Shows `value` with each digit column rolling like a meter.
export const Odometer: React.FC<{
  value: number;
  size: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  style?: React.CSSProperties;
  minDigits?: number;
  sep?: boolean; // thousands separators (off for years)
}> = ({ value, size, decimals = 0, prefix = "", suffix = "", color = K.fg, style, minDigits = 1, sep = true }) => {
  const scale = Math.pow(10, decimals);
  const n = Math.max(0, value * scale);
  const intDigits = Math.max(minDigits + decimals, Math.floor(n).toString().length, decimals + 1);
  const h = Math.round(size * 1.08);
  const cols: React.ReactNode[] = [];
  const ip = Math.floor(n);
  const fr = n - ip;
  for (let k = intDigits - 1; k >= 0; k--) {
    const cycle = Math.pow(10, k);
    const base = Math.floor(ip / cycle) % 10;
    // A column rolls only while every column below it reads 9 (a mechanical counter), so a settled value never
    // shows a half-turned digit.
    const carry = k === 0 || ip % cycle === cycle - 1 ? fr : 0;
    cols.push(<Digit key={`d${k}`} pos={base + carry} h={h} />);
    const intPos = k - decimals;
    if (decimals > 0 && k === decimals) cols.push(<span key="dot">.</span>);
    else if (sep && intPos > 0 && intPos % 3 === 0) cols.push(<span key={`c${k}`} style={{ width: "0.28em", display: "inline-block" }}>,</span>);
  }
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 900,
        color,
        fontVariantNumeric: "tabular-nums",
        display: "inline-flex",
        alignItems: "flex-start",
        lineHeight: `${h}px`,
        whiteSpace: "nowrap",
        letterSpacing: -0.02 * size,
        ...style,
      }}
    >
      {prefix ? <span>{prefix}</span> : null}
      {cols}
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
};

// ---------- Surfaces ----------

export const Glass: React.FC<{ style?: React.CSSProperties; glow?: string; children?: React.ReactNode; radius?: number }> = ({
  style,
  glow,
  children,
  radius = 26,
}) => (
  <div
    style={{
      position: "relative",
      borderRadius: radius,
      background: "linear-gradient(160deg, rgba(255,255,255,0.085), rgba(255,255,255,0.02) 60%)",
      border: "1px solid rgba(255,255,255,0.13)",
      boxShadow: `0 40px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)${glow ? `, 0 0 70px ${glow}40` : ""}`,
      fontFamily: FONT,
      color: K.fg,
      ...style,
    }}
  >
    {children}
  </div>
);

// Expanding ring at beat `at`, centred on (x, y).
export const Shockwave: React.FC<{ at: number; x?: number; y?: number; color?: string; size?: number }> = ({
  at,
  x = 960,
  y = 540,
  color = K.fg,
  size = 1400,
}) => {
  const frame = useBeatFrame();
  const t = (frame - at * FPB) / 22;
  if (t < 0 || t > 1) return null;
  const e = EO(t);
  return (
    <div
      style={{
        position: "absolute",
        left: x - (size * e) / 2,
        top: y - (size * e) / 2,
        width: size * e,
        height: size * e,
        borderRadius: "50%",
        border: `${Math.max(1, 14 * (1 - t))}px solid ${color}`,
        opacity: 1 - t,
        pointerEvents: "none",
      }}
    />
  );
};

// Red/cyan split that decays after beat `at` (for impact words).
export const Chroma: React.FC<{ at: number; children: React.ReactNode; amount?: number; style?: React.CSSProperties }> = ({
  at,
  children,
  amount = 14,
  style,
}) => {
  const frame = useBeatFrame();
  const t = (frame - at * FPB) / 12;
  const d = t < 0 || t > 1 ? 0 : (1 - t) * amount;
  return (
    <div style={{ position: "relative", ...style }}>
      {d > 0.3 ? (
        <>
          <div style={{ position: "absolute", inset: 0, transform: `translate(${-d}px, 0)`, opacity: 0.75, filter: "sepia(1) saturate(9) hue-rotate(-45deg)", mixBlendMode: "screen" }}>
            {children}
          </div>
          <div style={{ position: "absolute", inset: 0, transform: `translate(${d}px, 0)`, opacity: 0.75, filter: "sepia(1) saturate(9) hue-rotate(150deg)", mixBlendMode: "screen" }}>
            {children}
          </div>
        </>
      ) : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

// Small caption label with a coloured dot.
export const Tag: React.FC<{ color?: string; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  color = K.muted,
  children,
  size = 26,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: `${size * 0.28}px ${size * 0.7}px`,
      borderRadius: 999,
      background: `${color}1c`,
      border: `1.5px solid ${color}66`,
      color,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <span style={{ width: size * 0.32, height: size * 0.32, borderRadius: "50%", background: color, boxShadow: `0 0 12px ${color}` }} />
    {children}
  </div>
);

// Generic entrance wrapper: fades/slides/scales in on beat `at`, optional exit on beat `out`.
export const In: React.FC<{
  at: number;
  out?: number;
  from?: "up" | "down" | "left" | "right" | "scale" | "slam" | "fade" | "flip";
  dist?: number;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, out, from = "up", dist = 60, dur = 0.9, style, children }) => {
  const frame = useBeatFrame();
  const p = progAt(frame, at, dur, from === "slam" ? EBACK : EO);
  const x = out === undefined ? 0 : progAt(frame, out, 0.45, EIO);
  if (p <= 0 || x >= 1) return null;
  const d = 1 - p;
  const tr =
    from === "up" ? `translateY(${d * dist}px)` :
    from === "down" ? `translateY(${-d * dist}px)` :
    from === "left" ? `translateX(${-d * dist * 1.6}px)` :
    from === "right" ? `translateX(${d * dist * 1.6}px)` :
    from === "scale" ? `scale(${0.7 + 0.3 * p})` :
    from === "slam" ? `scale(${1 + d * 1.4})` :
    from === "flip" ? `perspective(1200px) rotateX(${d * 80}deg)` : "none";
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.8) * (1 - x),
        transform: `${tr} translateY(${-x * 30}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Absolutely positioned box helper.
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; center?: boolean; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  center,
  style,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: center ? "translate(-50%, -50%)" : undefined,
      fontFamily: FONT,
      color: K.fg,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Note: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", left: 72, bottom: 54, fontFamily: FONT, fontSize: 21, fontWeight: 500, color: K.muted, opacity: 0.9, whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
