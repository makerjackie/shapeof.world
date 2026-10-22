import React from "react";
import { K } from "./theme";

// The film's one prop: a product as a small rounded tile with a face. Grey and asleep = never earned;
// blue = launched; green and smiling = made money; gold = the one at the very top.

export type Mood = "sleep" | "idle" | "happy" | "shock" | "sad" | "look";
export type Tone = "sleep" | "blue" | "green" | "gold" | "dark";

const FILL: Record<Tone, { bg: string; edge: string; face: string }> = {
  sleep: { bg: K.sleep, edge: "#3a414d", face: "#6b7380" },
  blue: { bg: K.theme, edge: K.themeHi, face: "#10213d" },
  green: { bg: K.green, edge: "#8ff0c4", face: "#0b2a1d" },
  gold: { bg: K.gold, edge: "#ffe6a8", face: "#3a2a05" },
  dark: { bg: "#1b2028", edge: "#2c323c", face: "#4a515c" },
};

// Mouth and eyes in a 100×100 box. Shapes only, no SVG text.
const Face: React.FC<{ mood: Mood; color: string }> = ({ mood, color }) => {
  const sw = 7;
  const eye = (x: number) => {
    if (mood === "sleep") return <path d={`M${x - 8} 46 Q${x} 53 ${x + 8} 46`} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    if (mood === "happy") return <path d={`M${x - 8} 48 Q${x} 38 ${x + 8} 48`} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    if (mood === "shock") return <circle cx={x} cy={44} r={7.5} fill={color} />;
    if (mood === "look") return <circle cx={x + 1} cy={38} r={6} fill={color} />;
    return <circle cx={x} cy={45} r={6} fill={color} />;
  };
  const mouth =
    mood === "happy" ? <path d="M36 62 Q50 78 64 62" stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" /> :
    mood === "shock" ? <ellipse cx={50} cy={68} rx={7} ry={9} fill={color} /> :
    mood === "sad" ? <path d="M38 72 Q50 62 62 72" stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" /> :
    mood === "sleep" ? <circle cx={50} cy={68} r={4} fill={color} /> :
    mood === "look" ? <path d="M42 62 Q50 68 58 62" stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    <path d="M40 66 L60 66" stroke={color} strokeWidth={6} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      {eye(34)}
      {eye(66)}
      {mouth}
    </svg>
  );
};

export const Tile: React.FC<{
  size: number;
  tone?: Tone;
  mood?: Mood;
  glow?: number;
  face?: boolean;
  crown?: boolean;
  style?: React.CSSProperties;
}> = ({ size, tone = "blue", mood = "idle", glow = 0, face = true, crown = false, style }) => {
  const f = FILL[tone];
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: `linear-gradient(160deg, ${f.edge} 0%, ${f.bg} 38%, ${f.bg} 100%)`,
        boxShadow: glow > 0 ? `0 0 ${size * 0.6 * glow}px ${f.bg}${Math.round(150 * Math.min(1, glow)).toString(16).padStart(2, "0")}` : undefined,
        flexShrink: 0,
        ...style,
      }}
    >
      {face && size >= 18 ? <Face mood={mood} color={f.face} /> : null}
      {crown ? <Crown size={size * 0.62} style={{ position: "absolute", left: size * 0.19, top: -size * 0.46 }} /> : null}
    </div>
  );
};

export const Crown: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg viewBox="0 0 100 70" width={size} height={size * 0.7} style={style}>
    <path d="M6 62 L12 18 L34 40 L50 6 L66 40 L88 18 L94 62 Z" fill={K.gold} stroke="#ffe6a8" strokeWidth={4} strokeLinejoin="round" />
    <circle cx={50} cy={6} r={6} fill="#ffe6a8" />
  </svg>
);

// A plain shovel, blade down.
export const Shovel: React.FC<{ size: number; color?: string; style?: React.CSSProperties }> = ({ size, color = K.gold, style }) => (
  <svg viewBox="0 0 100 200" width={size * 0.5} height={size} style={style}>
    <rect x={44} y={6} width={12} height={110} rx={6} fill="#c9a06a" />
    <rect x={30} y={2} width={40} height={14} rx={7} fill="#c9a06a" />
    <path d="M22 118 L78 118 L74 170 Q50 198 26 170 Z" fill={color} stroke="#fff3cf" strokeWidth={3} />
  </svg>
);

// A row-major grid of positions for n tiles.
export const gridPos = (n: number, cols: number, size: number, gap: number, cx: number, top: number) => {
  const rows = Math.ceil(n / cols);
  const w = cols * size + (cols - 1) * gap;
  return Array.from({ length: n }, (_, i) => ({
    x: cx - w / 2 + (i % cols) * (size + gap),
    y: top + Math.floor(i / cols) * (size + gap),
    r: Math.floor(i / cols),
    c: i % cols,
    rows,
  }));
};
