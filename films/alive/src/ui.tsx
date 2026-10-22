import React from "react";
import { In, Kinetic, Part } from "./fx";
import { FONT, K } from "./theme";

// Type scale (STYLE.md 三、4): conclusions 72–84 px, big numbers 120–220 px, captions 30–46 px, sources 22 px.

// A conclusion line that types in on beat `at`.
export const Head: React.FC<{ at: number; parts: Part[]; size?: number; color?: string; out?: number; style?: React.CSSProperties }> = ({ at, parts, size = 76, color, out, style }) => (
  <Kinetic at={at} parts={parts} size={size} color={color} out={out} stagger={1.3} style={style} />
);

export const Cap: React.FC<{ at: number; children: React.ReactNode; size?: number; color?: string; w?: number; out?: number; from?: "up" | "left" | "right" | "fade" | "scale"; style?: React.CSSProperties }> = ({
  at,
  children,
  size = 40,
  color = K.sub,
  w = 700,
  out,
  from = "up",
  style,
}) => (
  <In at={at} out={out} from={from} dist={30}>
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: w, color, whiteSpace: "nowrap", lineHeight: 1.3, ...style }}>{children}</div>
  </In>
);

export const Num: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 160, color = K.fg, style }) => (
  <span style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, color, letterSpacing: -0.03 * size, fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap", ...style }}>{children}</span>
);

// Source line, bottom left.
export const Src: React.FC<{ at?: number; children: React.ReactNode }> = ({ at = 0.5, children }) => (
  <div style={{ position: "absolute", left: 48, bottom: 40 }}>
    <In at={at} from="fade">
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>{children}</div>
    </In>
  </div>
);

// Positioned block; `cx` centres it horizontally on x.
export const Box: React.FC<{ x: number; y: number; cx?: boolean; cy?: boolean; w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, cx, cy, w, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      transform: `translate(${cx ? "-50%" : "0"}, ${cy ? "-50%" : "0"})`,
      display: "flex",
      flexDirection: "column",
      alignItems: cx ? "center" : "flex-start",
      gap: 18,
      fontFamily: FONT,
      color: K.fg,
      ...style,
    }}
  >
    {children}
  </div>
);

// A pill with the film's theme colour, for facts that appear one by one.
export const Pill: React.FC<{ children: React.ReactNode; color?: string; size?: number; fill?: boolean }> = ({ children, color = K.theme, size = 40, fill = false }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: `${size * 0.22}px ${size * 0.6}px`,
      borderRadius: 14,
      border: `2px solid ${color}aa`,
      background: fill ? color : `${color}18`,
      color: fill ? K.bg : K.fg,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);
