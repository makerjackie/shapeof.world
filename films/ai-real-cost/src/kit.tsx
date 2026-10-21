import React, { createContext, useContext } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";
import { FPB } from "./timing";

// Frames between a scene's Sequence start and its first beat (only the opening scene, which starts at frame 0).
export const BeatOffset = createContext(0);

// Scene-local frame measured from the scene's first beat.
export const useBeatFrame = () => useCurrentFrame() - useContext(BeatOffset);

// All `at` values are beats relative to the start of the current scene.
export const useEnter = (at: number, config?: Parameters<typeof spring>[0]["config"]) => {
  const frame = useBeatFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(at * FPB), fps, config: { damping: 14, stiffness: 190, mass: 0.7, ...config } });
};

export const useLocalBeat = () => useBeatFrame() / FPB;

type From = "up" | "down" | "left" | "right" | "scale" | "slam" | "fade";

export const Pop: React.FC<{
  at: number;
  from?: From;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, from = "up", style, children }) => {
  const slam = from === "slam";
  const p = useEnter(at, slam ? { damping: 10, stiffness: 320, mass: 0.6 } : undefined);
  const o = Math.min(1, Math.max(0, p * (slam ? 3 : 1.6)));
  const d = 1 - p;
  const t =
    from === "up" ? `translateY(${d * 70}px)` :
    from === "down" ? `translateY(${-d * 70}px)` :
    from === "left" ? `translateX(${-d * 120}px)` :
    from === "right" ? `translateX(${d * 120}px)` :
    from === "scale" ? `scale(${0.55 + 0.45 * p})` :
    slam ? `scale(${1 + d * 1.6})` : "none";
  return (
    <div style={{ opacity: o, transform: t, filter: `blur(${Math.max(0, d) * (slam ? 0 : 12)}px)`, ...style }}>
      {children}
    </div>
  );
};

// Fades a whole block out at a beat (for replacing content within a scene).
export const Out: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useBeatFrame();
  const o = interpolate(frame, [at * FPB - 4, at * FPB + 4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <div style={{ opacity: o, transform: `translateY(${(1 - o) * -30}px)`, ...style }}>{children}</div>;
};

// A full-frame centered layer that fades out at `out` beats (content replaced mid-scene).
export const Layer: React.FC<{ out: number; gap?: number; children: React.ReactNode }> = ({ out, gap = 26, children }) => (
  <Out at={out} style={{ position: "absolute", inset: 0 }}>
    <Center gap={gap}>{children}</Center>
  </Out>
);

export const Center: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 24, style }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap,
      fontFamily: FONT,
      color: C.fg,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

export const T: React.FC<{ size?: number; w?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  size = 64,
  w = 900,
  color = C.fg,
  style,
  children,
}) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: w, color, lineHeight: 1.15, letterSpacing: size > 100 ? -2 : 0, whiteSpace: "nowrap", ...style }}>{children}</div>
);

export const CountUp: React.FC<{
  from: number;
  to: number;
  start: number;
  end: number;
  format: (n: number) => string;
  style?: React.CSSProperties;
}> = ({ from, to, start, end, format, style }) => {
  const frame = useBeatFrame();
  const v = interpolate(frame, [start * FPB, end * FPB], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(v)}</span>;
};

export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = C.red, children }) => {
  const p = useEnter(at, { damping: 20, stiffness: 220 });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: -8,
          top: "52%",
          height: 10,
          width: `calc(${Math.min(1, p) * 100}% + 16px)`,
          background: color,
          borderRadius: 5,
          transform: "rotate(-4deg)",
        }}
      />
    </span>
  );
};

export const Stamp: React.FC<{ at: number; color?: string; size?: number; rotate?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  color = C.gold,
  size = 56,
  rotate = -6,
  children,
  style,
}) => {
  const p = useEnter(at, { damping: 9, stiffness: 300, mass: 0.6 });
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        display: "inline-block",
        padding: "10px 28px",
        border: `6px solid ${color}`,
        borderRadius: 14,
        color,
        fontSize: size,
        fontWeight: 900,
        fontFamily: FONT,
        transform: `rotate(${rotate}deg) scale(${1 + (1 - p) * 1.8})`,
        opacity: Math.min(1, p * 3),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Chip: React.FC<{ color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ color = C.muted, children, style }) => (
  <span
    style={{
      display: "inline-block",
      padding: "8px 22px",
      borderRadius: 999,
      border: `2px solid ${color}`,
      color,
      fontSize: 30,
      fontWeight: 700,
      fontFamily: FONT,
      ...style,
    }}
  >
    {children}
  </span>
);

export type BarDatum = { label: string; value: number; display: string; color: string; note?: string };

export const Bars: React.FC<{
  data: BarDatum[];
  at: number;
  step?: number;
  max: number;
  width?: number;
  rowH?: number;
  labelW?: number;
}> = ({ data, at, step = 0.5, max, width = 1150, rowH = 78, labelW = 380 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: rowH * 0.22, fontFamily: FONT }}>
    {data.map((d, i) => (
      <BarRow key={d.label} d={d} at={at + i * step} max={max} width={width} rowH={rowH} labelW={labelW} />
    ))}
  </div>
);

const BarRow: React.FC<{ d: BarDatum; at: number; max: number; width: number; rowH: number; labelW: number }> = ({ d, at, max, width, rowH, labelW }) => {
  const p = useEnter(at, { damping: 16, stiffness: 140 });
  const w = Math.max(6, (d.value / max) * width * p);
  return (
    <div style={{ display: "flex", alignItems: "center", height: rowH, opacity: Math.min(1, p * 2) }}>
      <div style={{ width: labelW, textAlign: "right", paddingRight: 28, fontSize: rowH * 0.42, fontWeight: 700, color: C.fg }}>{d.label}</div>
      <div style={{ width: w, height: rowH * 0.72, background: d.color, borderRadius: 8, boxShadow: `0 0 30px ${d.color}55` }} />
      <div style={{ paddingLeft: 22, fontSize: rowH * 0.5, fontWeight: 900, color: d.color, whiteSpace: "nowrap" }}>
        {d.display}
        {d.note ? <span style={{ fontSize: rowH * 0.3, color: C.muted, fontWeight: 500, marginLeft: 14 }}>{d.note}</span> : null}
      </div>
    </div>
  );
};

export const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 60, bottom: 46, fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.muted, opacity: 0.85 }}>
    {children}
  </div>
);

export const LayerTag: React.FC<{ n: string; title: string }> = ({ n, title }) => (
  <Pop at={0} from="left" style={{ position: "absolute", left: 60, top: 50 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT }}>
      <span style={{ background: C.gold, color: C.bg, fontWeight: 900, fontSize: 30, padding: "6px 16px", borderRadius: 8 }}>{n}</span>
      <span style={{ color: C.fg, fontWeight: 700, fontSize: 32 }}>{title}</span>
    </div>
  </Pop>
);
