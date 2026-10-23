import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { FONT, K, SANS, SERIF } from "./theme";

// Every scene reads the film clock (seconds) from this context, so all keyframes are absolute film seconds taken
// from the music grid in timing.ts (barA, barB, CHORD) and the sound list can use the very same numbers.
export const FilmTime = createContext(0);
export const useT = () => useContext(FilmTime);

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EIN = Easing.bezier(0.55, 0, 1, 0.45);
export const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const LIN = (x: number) => x;
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0 → 1 from second `a` over `d` seconds.
export const pr = (t: number, a: number, d: number, e: (x: number) => number = EO) => interpolate(t, [a, a + d], [0, 1], { ...CL, easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Damped swing after an impulse at `at` (for hanging tags, landing objects): 0 before, decays to 0.
export const swing = (t: number, at: number, amp = 1, freq = 2.2, decay = 3.2) => {
  const d = t - at;
  if (d < 0) return 0;
  return amp * Math.sin(d * freq * Math.PI * 2) * Math.exp(-d * decay);
};

// Piecewise keyframes [[second, value], ...] with easing between neighbours.
export const keys = (t: number, k: [number, number][], e: (x: number) => number = EIO) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], e((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  }
  return k[k.length - 1][1];
};

// Slow drift so nothing ever sits perfectly still (two incommensurate sines).
export const drift = (t: number, seed: number, amp: number) => amp * (Math.sin(t * 0.53 + seed) * 0.6 + Math.sin(t * 0.31 + seed * 2.1) * 0.4);

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// ───────── Brand corner (hard rule 1): round ball only, 46 px, 48/38 px from the edges, 80% ─────────
export const Corner: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div style={{ position: "absolute", left: 48, top: 38, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 * opacity }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 46, height: 46, borderRadius: "50%", boxShadow: "0 0 0 1.5px rgba(241,236,223,0.45), 0 0 14px rgba(241,236,223,0.12)" }} />
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", color: K.paper }}>世界的形状</span>
  </div>
);

// ───────── Narrative caption: paper strip, typed at 14 characters a second, first character on the beat ─────────
export const CPS = 14;
export type Cap = { at: number; end: number; text: string; kw?: string; kwAt?: number; x?: number; y?: number; size?: number };

export const Caption: React.FC<Cap & { t: number }> = ({ t, at, end, text, kw, kwAt, x = 110, y = 128, size = 76 }) => {
  const slide = pr(t, at - 0.25, 0.25, EO);
  if (slide <= 0) return null;
  const out = pr(t, end - 0.3, 0.3, EIO);
  if (out >= 1) return null;
  const chars = Array.from(text);
  const shown = t < at ? 0 : Math.floor((t - at) * CPS) + 1;
  const k0 = kw ? text.indexOf(kw) : -1;
  const a0 = k0 >= 0 ? Array.from(text.slice(0, k0)).length : chars.length;
  const a1 = k0 >= 0 ? a0 + Array.from(kw!).length : chars.length;
  const hl = kwAt === undefined ? 0 : pr(t, kwAt, 0.3, EO);
  const seg = (from: number, to: number) =>
    chars.slice(from, to).map((c, j) => (
      <span key={from + j} style={{ position: "relative", zIndex: 1, color: from + j < shown ? K.ink : "transparent" }}>
        {c}
      </span>
    ));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: Math.min(1, slide * 1.5) * (1 - out),
        transform: `translateX(${(1 - slide) * -60}px) translateY(${-out * 14}px)`,
        background: K.paper,
        borderLeft: `10px solid ${K.ink}`,
        padding: `${size * 0.2}px ${size * 0.42}px ${size * 0.24}px ${size * 0.36}px`,
        boxShadow: "0 22px 50px rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.05)",
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.12,
        color: K.ink,
        whiteSpace: "nowrap",
        zIndex: 20,
      }}
    >
      {seg(0, a0)}
      {a1 > a0 ? (
        <span style={{ position: "relative", display: "inline-block" }}>
          <span style={{ position: "absolute", left: -6, bottom: size * 0.05, height: size * 0.44, width: `calc(${hl * 100}% + ${hl * 12}px)`, background: K.gold, borderRadius: 4, zIndex: 0 }} />
          {seg(a0, a1)}
        </span>
      ) : null}
      {seg(a1, chars.length)}
    </div>
  );
};

// Source line, bottom left (Noto Sans SC 19 px, 60%). Fades with its scene.
export const Source: React.FC<{ children: React.ReactNode; o?: number }> = ({ children, o = 1 }) => (
  <div style={{ position: "absolute", left: 96, bottom: 34, fontFamily: SANS, fontSize: 19, fontWeight: 500, color: K.paper, opacity: 0.6 * o, whiteSpace: "nowrap", zIndex: 15 }}>
    {children}
  </div>
);

// A rubber stamp that slams down at `at` (scale from big, slight rotation) and stays.
export const Stamp: React.FC<{ t: number; at: number; color: string; size?: number; rot?: number; children: React.ReactNode; bg?: string }> = ({
  t,
  at,
  color,
  size = 64,
  rot = -8,
  children,
  bg = "rgba(7,9,11,0.82)",
}) => {
  const p = pr(t, at, 0.28, EBACK);
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${size * 0.1}px ${size * 0.38}px`,
        border: `${Math.max(5, size * 0.09)}px solid ${color}`,
        borderRadius: size * 0.22,
        color,
        background: bg,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 900,
        whiteSpace: "nowrap",
        transform: `rotate(${rot}deg) scale(${1 + (1 - p) * 1.5})`,
        opacity: Math.min(1, p * 3),
        boxShadow: `0 0 ${40 * p}px ${color}44`,
      }}
    >
      {children}
    </div>
  );
};

// ───────── Rolling odometer digits ─────────
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

export const Odometer: React.FC<{ value: number; size: number; decimals?: number; prefix?: string; suffix?: string; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  value,
  size,
  decimals = 0,
  prefix = "",
  suffix = "",
  color = K.fg,
  weight = 900,
  style,
}) => {
  const scale = Math.pow(10, decimals);
  const n = Math.max(0, value * scale);
  const intDigits = Math.max(Math.floor(n).toString().length, decimals + 1);
  const h = Math.round(size * 1.08);
  const cols: React.ReactNode[] = [];
  for (let k = intDigits - 1; k >= 0; k--) {
    const cycle = Math.pow(10, k);
    const base = Math.floor(n / cycle) % 10;
    const carry = k === 0 ? n - Math.floor(n) : Math.min(1, Math.max(0, ((n % cycle) / cycle - 0.92) / 0.08));
    cols.push(<Digit key={`d${k}`} pos={base + carry} h={h} />);
    const intPos = k - decimals;
    if (decimals > 0 && k === decimals) cols.push(<span key="dot">.</span>);
    else if (intPos > 0 && intPos % 3 === 0) cols.push(<span key={`c${k}`} style={{ width: "0.28em", display: "inline-block" }}>,</span>);
  }
  return (
    <span style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, color, fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "flex-start", lineHeight: `${h}px`, whiteSpace: "nowrap", letterSpacing: -0.02 * size, ...style }}>
      {prefix ? <span>{prefix}</span> : null}
      {cols}
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
};

// Scene shell: fades/moves a whole scene in and out (the in-world transitions live inside the scenes).
export const Shell: React.FC<{ t: number; from: number; to: number; fin?: number; fout?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t,
  from,
  to,
  fin = 0.35,
  fout = 0.35,
  children,
  style,
}) => {
  const o = Math.min(pr(t, from, fin, EO), 1 - pr(t, to - fout, fout, EIO));
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o, ...style }}>{children}</AbsoluteFill>;
};

// Label in a scene (Noto Sans SC), used next to objects.
export const Lab: React.FC<{ size?: number; color?: string; w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ size = 34, color = K.fg, w = 700, style, children }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: w, color, whiteSpace: "nowrap", lineHeight: 1.2, ...style }}>{children}</div>
);
