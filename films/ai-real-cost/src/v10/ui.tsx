// Type and labels of v10 (after films/tower/src/v4/ui.tsx). Times are film seconds; lines rise in character by
// character, labels are pinned to map points through the same camera the WebGL frame used.
import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Cam, toScreen } from "./camera";
import { FONT, K, SERIF } from "./theme";

export const FPS = 30;
export const sf = (s: number) => Math.round(s * FPS);
export const useSec = () => useCurrentFrame() / FPS;

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, a: number, b: number, ease: (v: number) => number = EIO) => ease(clamp01((t - a) / (b - a)));
export const track = (t: number, keys: [number, number][], ease: (v: number) => number = EIO) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))));
  }
  return keys[keys.length - 1][1];
};
export const fade = (t: number, a: number, b: number, f = 0.3) => Math.min(clamp01((t - a) / f), clamp01((b - t) / f));

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const SHADOW = "0 2px 4px rgba(4,6,10,0.6), 0 0 28px rgba(4,6,10,0.8)";

export type Part = string | { t: string; c?: string; w?: number; size?: number; font?: string };

// One line of type: characters rise in from `at`, the line lifts away at `out` (seconds).
export const Line: React.FC<{ at: number; out?: number; parts: Part[]; size?: number; weight?: number; serif?: boolean; color?: string; stagger?: number; style?: React.CSSProperties }> = ({
  at,
  out,
  parts,
  size = 64,
  weight = 800,
  serif,
  color = K.fg,
  stagger = 1.2,
  style,
}) => {
  const frame = useCurrentFrame();
  const t0 = sf(at);
  if (frame < t0 - 1) return null;
  const exit = out === undefined ? 0 : interpolate(frame, [sf(out) - 6, sf(out) + 6], [0, 1], { ...CL, easing: EIO });
  if (exit >= 1) return null;
  let idx = 0;
  return (
    <div style={{ fontFamily: serif ? SERIF : FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.25, whiteSpace: "nowrap", textShadow: SHADOW, opacity: 1 - exit, transform: `translateY(${-exit * 24}px)`, ...style }}>
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        return (
          <span key={pi} style={{ color: part.c, fontWeight: part.w, fontSize: part.size, fontFamily: part.font }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = t0 + idx++ * stagger;
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

// A label on top of a column: a leader up from the column's top (and sideways by `dx` when neighbours crowd it),
// then the name, the number and an optional note.
export const ColLabel: React.FC<{
  cam: Cam;
  o: number;
  x: number;
  y: number;
  h: number;
  name: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: string;
  side?: "left" | "right" | "center";
  lift?: number;
  dx?: number;
  size?: number;
}> = ({ cam, o, x, y, h, name, value, sub, color, side = "center", lift = 34, dx = 0, size = 40 }) => {
  if (o <= 0.001) return null;
  const [sx, sy, vis] = toScreen(cam, x, y, h);
  if (!vis || sx < -400 || sx > 2320 || sy < -300 || sy > 1380) return null;
  const ly = sy - lift;
  const lx = sx + dx;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", opacity: o }}>
      <div style={{ position: "absolute", left: sx - 1, top: ly, width: 2, height: sy - ly, background: `linear-gradient(${color}88, ${color})` }} />
      {dx !== 0 ? <div style={{ position: "absolute", left: Math.min(sx, lx), top: ly - 1, width: Math.abs(dx), height: 2, background: `${color}88` }} /> : null}
      <div
        style={{
          position: "absolute",
          left: lx + (side === "right" ? -8 : side === "left" ? 8 : 0),
          top: ly - 6,
          transform: `translate(${side === "center" ? "-50%" : side === "right" ? "0%" : "-100%"}, -100%)`,
          textAlign: side === "center" ? "center" : side === "right" ? "left" : "right",
          whiteSpace: "nowrap",
          textShadow: SHADOW,
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: size * 0.72, fontWeight: 700, color, letterSpacing: 1 }}>{name}</div>
        <div style={{ fontFamily: FONT, fontSize: size * 1.25, fontWeight: 900, color: K.fg, lineHeight: 1.05 }}>{value}</div>
        {sub ? <div style={{ fontFamily: FONT, fontSize: size * 0.6, fontWeight: 600, color: K.sub, marginTop: 4 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// A city name lying on the map, a little below its point.
export const CityLabel: React.FC<{ cam: Cam; o: number; x: number; y: number; name: string; dy?: number }> = ({ cam, o, x, y, name, dy = 18 }) => {
  if (o <= 0.001) return null;
  const [sx, sy, vis] = toScreen(cam, x, y, 0);
  if (!vis || sx < -200 || sx > 2120 || sy < -100 || sy > 1180) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: sx,
        top: sy + dy,
        transform: "translateX(-50%)",
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: 4,
        color: "rgba(244,240,232,0.82)",
        textShadow: SHADOW,
        opacity: o,
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </div>
  );
};

export const Note: React.FC<{ at: number; out: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const t = useSec();
  const o = fade(t, at, out, 0.35);
  if (o <= 0) return null;
  return <div style={{ position: "absolute", left: 64, bottom: 40, maxWidth: 1640, fontFamily: FONT, fontSize: 26, fontWeight: 500, color: "rgba(244,240,232,0.72)", textShadow: SHADOW, opacity: o, lineHeight: 1.4 }}>{children}</div>;
};

export const BrandMark: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 44, top: 34, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 * o }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: 44, height: 44 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2, textShadow: SHADOW }}>世界的形状</span>
    </div>
  );

export const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(2)}`);
