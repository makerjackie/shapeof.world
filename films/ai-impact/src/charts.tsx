import React from "react";
import { Pt, yr } from "./data";
import { FONT, K } from "./theme";

// Chart primitives. Lines and areas are SVG; every label is HTML (STYLE.md 三、4: no centred SVG text, no CSS
// filters on charts). Axes are linear and zero-based unless a chart says otherwise.

export type Box = { x: number; y: number; w: number; h: number };

export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const toXY = (pts: Pt[], sx: (t: number) => number, sy: (v: number) => number): [number, number][] =>
  pts.map(([d, v]) => [sx(yr(d)), sy(v)]);

export const linePath = (p: [number, number][]) => p.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

export const stepPath = (p: [number, number][], xEnd: number) => {
  let d = "";
  p.forEach(([x, y], i) => {
    if (i === 0) d += `M${x.toFixed(1)},${y.toFixed(1)}`;
    else d += `H${x.toFixed(1)}V${y.toFixed(1)}`;
  });
  return d + `H${xEnd.toFixed(1)}`;
};

export const areaPath = (line: string, x0: number, x1: number, base: number) => `${line}L${x1.toFixed(1)},${base}L${x0.toFixed(1)},${base}Z`;

// Value of a series at time t (linear interpolation; clamps at the ends).
export const valueAt = (pts: Pt[], t: number) => {
  const xs = pts.map(([d]) => yr(d));
  if (t <= xs[0]) return pts[0][1];
  for (let i = 1; i < xs.length; i++) {
    if (t <= xs[i]) {
      const u = (t - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u;
    }
  }
  return pts[pts.length - 1][1];
};

// A stroke + soft area + glow, revealed left to right up to `draw` (0–1) of the box width.
export const Curve: React.FC<{
  id: string;
  box: Box;
  d: string;
  color: string;
  draw?: number;
  width?: number;
  area?: string;
  areaOpacity?: number;
  dash?: string;
  glow?: number;
  opacity?: number;
}> = ({ id, box, d, color, draw = 1, width = 4, area, areaOpacity = 0.28, dash, glow = 0.35, opacity = 1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}>
    <defs>
      <clipPath id={`clip-${id}`}>
        <rect x={box.x - 20} y={box.y - 200} width={Math.max(0, (box.w + 40) * draw)} height={box.h + 400} />
      </clipPath>
      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={areaOpacity} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
    <g clipPath={`url(#clip-${id})`}>
      {area ? <path d={area} fill={`url(#grad-${id})`} /> : null}
      {glow > 0 ? <path d={d} fill="none" stroke={color} strokeOpacity={glow * 0.35} strokeWidth={width * 4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} />
    </g>
  </svg>
);

// Horizontal gridlines with HTML tick labels on the left (or right).
export const GridY: React.FC<{ box: Box; ticks: number[]; sy: (v: number) => number; fmt: (v: number) => string; side?: "left" | "right"; opacity?: number; size?: number }> = ({
  box,
  ticks,
  sy,
  fmt,
  side = "left",
  opacity = 1,
  size = 22,
}) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    {ticks.map((t) => (
      <React.Fragment key={t}>
        <div style={{ position: "absolute", left: box.x, top: sy(t), width: box.w, borderTop: `1px solid ${t === 0 ? K.line : K.grid}` }} />
        <div
          style={{
            position: "absolute",
            top: sy(t) - size * 0.65,
            ...(side === "left" ? { right: 1920 - box.x + 14, textAlign: "right" as const } : { left: box.x + box.w + 14 }),
            fontFamily: FONT,
            fontSize: size,
            fontWeight: 500,
            color: K.muted,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(t)}
        </div>
      </React.Fragment>
    ))}
  </div>
);

// Year ticks under a time axis.
export const TimeTicks: React.FC<{ box: Box; sx: (t: number) => number; years: number[]; y?: number; opacity?: number; size?: number }> = ({ box, sx, years, y, opacity = 1, size = 22 }) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    {years.map((yv) => (
      <React.Fragment key={yv}>
        <div style={{ position: "absolute", left: sx(yv), top: box.y, height: box.h, borderLeft: `1px dashed ${K.grid}` }} />
        <div style={{ position: "absolute", left: sx(yv) + 8, top: (y ?? box.y + box.h) + 8, fontFamily: FONT, fontSize: size, fontWeight: 700, color: K.muted, fontVariantNumeric: "tabular-nums" }}>{yv}</div>
      </React.Fragment>
    ))}
  </div>
);

// A small dot with a halo, for data points and stations.
export const Dot: React.FC<{ x: number; y: number; color: string; r?: number; ring?: boolean; opacity?: number; pulse?: number }> = ({ x, y, color, r = 7, ring = true, opacity = 1, pulse = 0 }) => (
  <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, opacity }}>
    {ring ? <div style={{ position: "absolute", inset: -r * (0.8 + pulse * 1.5), borderRadius: "50%", border: `2px solid ${color}`, opacity: 0.45 * (1 - pulse * 0.6) }} /> : null}
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, boxShadow: `0 0 ${10 + r}px ${color}` }} />
  </div>
);

// A label anchored at a point: `dir` places it relative to the point.
export const PinLabel: React.FC<{
  x: number;
  y: number;
  dir?: "up" | "down" | "left" | "right";
  color?: string;
  size?: number;
  w?: number;
  opacity?: number;
  stem?: number;
  children: React.ReactNode;
}> = ({ x, y, dir = "up", color = K.fg, size = 24, opacity = 1, stem = 26, children }) => {
  const pos: React.CSSProperties =
    dir === "up"
      ? { left: x, bottom: 1080 - y + stem, transform: "translateX(-50%)", alignItems: "center" }
      : dir === "down"
        ? { left: x, top: y + stem, transform: "translateX(-50%)", alignItems: "center" }
        : dir === "left"
          ? { right: 1920 - x + stem, top: y, transform: "translateY(-50%)", alignItems: "flex-end" }
          : { left: x + stem, top: y, transform: "translateY(-50%)", alignItems: "flex-start" };
  return (
    <>
      {dir === "up" || dir === "down" ? (
        <div style={{ position: "absolute", left: x, top: dir === "up" ? y - stem : y, height: stem, borderLeft: `1.5px solid ${color}`, opacity: opacity * 0.6 }} />
      ) : (
        <div style={{ position: "absolute", top: y, left: dir === "left" ? x - stem : x, width: stem, borderTop: `1.5px solid ${color}`, opacity: opacity * 0.6 }} />
      )}
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", gap: 2, fontFamily: FONT, fontSize: size, fontWeight: 700, color, whiteSpace: "nowrap", opacity, lineHeight: 1.2, ...pos }}>
        {children}
      </div>
    </>
  );
};
