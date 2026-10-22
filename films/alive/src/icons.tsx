import React from "react";

// Small line icons (24 × 24 grid, stroked), drawn here so nothing depends on an icon font.
const PATHS: Record<string, string> = {
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  bowl: "M3 11h18a9 9 0 0 1-18 0z M8 7.5c0-1.5 1-1.5 1-3 M12 7.5c0-1.5 1-1.5 1-3 M16 7.5c0-1.5 1-1.5 1-3",
  bag: "M3 8h18v11H3z M9 8V5h6v3 M3 13h18",
  bus: "M5 4h14a1 1 0 0 1 1 1v12H4V5a1 1 0 0 1 1-1z M4 11h16 M7 20v-3 M17 20v-3 M7.5 14.5h.01 M16.5 14.5h.01",
  home: "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-5h4v5",
  book: "M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5z M12 6v14.5",
  sun: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  heart: "M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z",
  coin: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M15 9c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .9 3 2.1-1.3 2-3 2c-1.4 0-2.6-.6-3-1.6 M12 5.8v1.7 M12 16.5v1.7",
  key: "M8 15a4 4 0 1 1 0-8 4 4 0 0 1 0 8z M11.5 11H21 M18 11v3 M15 11v2",
  cap: "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5 M22 9v5",
  up: "M4 18l6-6 4 4 6-8 M14 8h6v6",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 11a2.5 2.5 0 1 0 0-5 M18 14c2 .6 3 2.5 3 5",
  brush: "M14 4l6 6-8 8H6v-6z M4 20l2-2 M11 7l6 6",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3 2",
};

export type IconName = keyof typeof PATHS;

// HTML icon, sized in px.
export const Icon: React.FC<{ name: IconName; size?: number; color?: string; w?: number; style?: React.CSSProperties }> = ({ name, size = 32, color = "currentColor", w = 2, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "none", ...style }}>
    <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The same icon placed inside an SVG at (x, y) centre.
export const SvgIcon: React.FC<{ name: IconName; x: number; y: number; size?: number; color?: string; w?: number; o?: number }> = ({ name, x, y, size = 32, color = "#fff", w = 2, o = 1 }) => (
  <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`} opacity={o}>
    <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

// A small person: head and shoulders. (x, y) is the feet; h the height. `age` 0–1 greys the head and bends the
// figure a little; `outline` draws it hollow (for the men no longer living).
export const Person: React.FC<{ x: number; y: number; h?: number; color: string; o?: number; age?: number; outline?: boolean; head?: string }> = ({ x, y, h = 36, color, o = 1, age = 0, outline = false, head }) => {
  const r = h * 0.17;
  const bw = h * 0.56;
  const bh = h * 0.5;
  const lean = age * h * 0.14;
  const hy = y - bh - r * 1.25 + age * h * 0.07;
  const fillProps = outline ? { fill: "none", stroke: color, strokeWidth: Math.max(1, h * 0.05) } : { fill: color };
  return (
    <g opacity={o}>
      <rect x={x - bw / 2} y={y - bh} width={bw} height={bh} rx={bw * 0.45} {...fillProps} />
      <circle cx={x + lean} cy={hy} r={r} {...(outline ? fillProps : { fill: head ?? color })} />
    </g>
  );
};
