// v20 kit: the printing press for the editorial sheet. Everything here lives in sheet coordinates (px on the
// paper); the camera in Film20 decides what the viewer sees. Times are in seconds.
import React from "react";
import { FONT, MONO, SERIF } from "../v10/theme";
import { EIO, EO, lerp, ramp, rgba } from "../v15/kit";

export { FONT, MONO, SERIF, EIO, EO, lerp, ramp, rgba };
export const INK = "#efe6d4";
export const MUTE = "rgba(239,230,212,0.62)";
export const FAINT = "rgba(239,230,212,0.4)";
export const GOLD = "#f2c35c";
export const RED = "#e5322d";

type Pos = { t: number; at: number; x: number; y: number };

/** Type printed onto the sheet: a press wipe left to right, or (slam) pressed down from above. */
export const P: React.FC<Pos & { dur?: number; slam?: boolean; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, at, x, y, dur, slam, style, children }) => {
  const d = dur ?? (slam ? 0.22 : 0.38);
  const p = ramp(t, at, at + d, EO);
  if (p <= 0) return null;
  const base: React.CSSProperties = { position: "absolute", left: x, top: y, whiteSpace: "nowrap", color: INK, textShadow: "0 0 1px rgba(239,230,212,0.35)", ...style };
  if (slam) {
    return (
      <div style={{ ...base, opacity: Math.min(1, p * 2), transform: `scale(${lerp(1.22, 1, p)})`, transformOrigin: "left center", filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined }}>
        {children}
      </div>
    );
  }
  return <div style={{ ...base, clipPath: p < 1 ? `inset(-20% ${(1 - p) * 100}% -20% 0)` : undefined }}>{children}</div>;
};

/** A rubber stamp, slammed on at an angle. */
export const Stamp: React.FC<Pos & { rot: number; size: number; color?: string; dashed?: boolean; children: React.ReactNode }> = ({ t, at, x, y, rot, size, color = RED, dashed, children }) => {
  const p = ramp(t, at, at + 0.13, EO);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rot + (1 - p) * 7}deg) scale(${lerp(1.75, 1, p)})`,
        opacity: Math.min(1, p * 1.6) * 0.93,
        border: `${size * 0.075}px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: size * 0.08,
        padding: `${size * 0.06}px ${size * 0.28}px`,
        color,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.12,
        whiteSpace: "nowrap",
        boxShadow: `0 0 ${size * 0.4}px ${rgba(color, 0.18)}`,
      }}
    >
      {children}
    </div>
  );
};

export const Rule: React.FC<Pos & { w: number }> = ({ t, at, x, y, w }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w * ramp(t, at, at + 0.5, EO), height: 2, background: "rgba(239,230,212,0.28)" }} />
);

/** A red marker stroke across something, drawn left to right. */
export const Strike: React.FC<Pos & { w: number; h?: number; rot?: number; color?: string }> = ({ t, at, x, y, w, h = 26, rot = -2.5, color = RED }) => {
  const p = ramp(t, at, at + 0.3, EIO);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, background: color, opacity: 0.94, transform: `rotate(${rot}deg) scaleX(${p})`, transformOrigin: "left center", boxShadow: `0 0 ${h}px ${rgba(color, 0.3)}` }} />
  );
};

/** Hand-drawn marker paths (circles, arrows, ticks, carets), drawn on along their length. */
export const Draw: React.FC<Pos & { w: number; h: number; d: string; dur?: number; stroke?: number; color?: string; head?: boolean }> = ({ t, at, x, y, w, h, d, dur = 0.35, stroke = 14, color = RED, head }) => {
  const p = ramp(t, at, at + dur, EIO);
  if (p <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <marker id={`ah-${Math.round(x)}-${Math.round(y)}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray="100 100"
        strokeDashoffset={100 - 100 * p}
        opacity={0.92}
        markerEnd={head && p > 0.97 ? `url(#ah-${Math.round(x)}-${Math.round(y)})` : undefined}
      />
    </svg>
  );
};

export type Row = { key: string; name: string; model?: string; value: number; label: string; hi?: "gold" | "dim" };

/** A printed bar chart: names, bars that run out in ink, values at their ends. */
export const Chart: React.FC<{
  t: number;
  at: number;
  x: number;
  y: number;
  rows: Row[];
  max: number;
  len?: number;
  pitch?: number;
  stagger?: number;
  first?: number; // when the first row prints, if earlier than the rest
}> = ({ t, at, x, y, rows, max, len = 1300, pitch = 130, stagger = 0.12, first }) => (
  <>
    {rows.map((r, i) => {
      const a = first !== undefined && i === 0 ? first : at + (first !== undefined ? i - 1 : i) * stagger;
      const g = ramp(t, a + 0.1, a + 1.0, EO);
      const full = Math.max(16, (r.value / max) * len);
      const ry = y + i * pitch;
      const gold = r.hi === "gold";
      return (
        <React.Fragment key={r.key}>
          <P t={t} at={a} x={x} y={ry - 4} dur={0.3} style={{ fontFamily: /[一-鿿]/.test(r.name) ? FONT : MONO, fontWeight: 900, fontSize: 38, opacity: r.hi === "dim" ? 0.55 : 1 }}>
            {r.name}
          </P>
          {r.model && (
            <P t={t} at={a + 0.1} x={x} y={ry + 44} dur={0.3} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: FAINT }}>
              {r.model}
            </P>
          )}
          {g > 0 && <div style={{ position: "absolute", left: x + 270, top: ry, width: full * g, height: 66, background: gold ? GOLD : `rgba(239,230,212,${r.hi === "dim" ? 0.28 : 0.5})`, boxShadow: gold ? `0 0 30px ${rgba(GOLD, 0.25)}` : undefined }} />}
          <P t={t} at={a + 0.85} x={x + 270 + full + 26} y={ry - 6} dur={0.25} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 66, color: gold ? GOLD : INK, opacity: r.hi === "dim" ? 0.6 : 1 }}>
            {r.label}
          </P>
        </React.Fragment>
      );
    })}
  </>
);
