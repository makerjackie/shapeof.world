import React from "react";
import { K } from "./theme";

// The film's one prop: a life of weeks. 79 columns (years, China's 2024 life expectancy is 79.0) × 52 rows (weeks)
// = 4108 squares. A warm trunk (living) runs through the middle from the first week to the last; branches (school,
// work, money, the things you love) grow out of it, and can break while the trunk carries on.
export const COLS = 79;
export const ROWS = 52;

// A branch in pixels: leaves the trunk at (x0, y), bends to y + dy, runs on to x1. `cut` breaks it at that x and the
// far piece falls away with `fall` (0–1).
export type Br = { x0: number; x1: number; y: number; dy: number; color: string; grow: number; w?: number; o?: number; cut?: number; fall?: number };

const bendOf = (b: Br) => Math.min(110, (b.x1 - b.x0) * 0.3);
const pathTo = (b: Br, xe: number) => {
  const k = bendOf(b);
  return `M ${b.x0} ${b.y} C ${b.x0 + k} ${b.y}, ${b.x0 + k} ${b.y + b.dy}, ${b.x0 + 2 * k} ${b.y + b.dy} L ${Math.max(xe, b.x0 + 2 * k)} ${b.y + b.dy}`;
};

export const Branch: React.FC<{ b: Br }> = ({ b }) => {
  if (b.grow <= 0.001) return null;
  const w = b.w ?? 3;
  const d = pathTo(b, b.cut ?? b.x1);
  const dash = { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - Math.min(1, b.grow) };
  const fall = b.fall ?? 0;
  const ye = b.y + b.dy;
  return (
    <g opacity={b.o ?? 1}>
      <path d={d} stroke={b.color} strokeWidth={w * 4} strokeOpacity={0.14} fill="none" strokeLinecap="round" {...dash} />
      <path d={d} stroke={b.color} strokeWidth={w} fill="none" strokeLinecap="round" {...dash} />
      {b.cut !== undefined && fall < 1 ? (
        <g transform={`translate(${fall * 30} ${fall * fall * 220}) rotate(${fall * 9} ${b.cut + 14} ${ye})`} opacity={1 - fall}>
          <line x1={b.cut + 14} y1={ye} x2={b.x1} y2={ye} stroke={b.color} strokeWidth={w * 4} strokeOpacity={0.14} strokeLinecap="round" />
          <line x1={b.cut + 14} y1={ye} x2={b.x1} y2={ye} stroke={b.color} strokeWidth={w} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

// The trunk: a warm line drawn left to right (`draw` 0–1) with a soft glow and a bright head while it draws.
export const Trunk: React.FC<{ x0: number; x1: number; y: number; draw?: number; glow?: number; w?: number; color?: string; o?: number }> = ({
  x0,
  x1,
  y,
  draw = 1,
  glow = 0.5,
  w = 4,
  color = K.theme,
  o = 1,
}) => {
  if (draw <= 0.001) return null;
  const xe = x0 + (x1 - x0) * Math.min(1, draw);
  return (
    <g opacity={o}>
      <line x1={x0} y1={y} x2={xe} y2={y} stroke={color} strokeWidth={w * 7} strokeOpacity={0.06 + 0.12 * glow} strokeLinecap="round" />
      <line x1={x0} y1={y} x2={xe} y2={y} stroke={color} strokeWidth={w * 2.6} strokeOpacity={0.12 + 0.2 * glow} strokeLinecap="round" />
      <line x1={x0} y1={y} x2={xe} y2={y} stroke={color} strokeWidth={w} strokeLinecap="round" />
      {draw < 1 ? <circle cx={xe} cy={y} r={w * 2.2} fill={K.themeHi} /> : null}
    </g>
  );
};

// A branch in grid terms: ages (columns) and rows away from the trunk.
export type GBr = { from: number; to: number; dy: number; color: string; grow: number; w?: number; o?: number; cut?: number; fall?: number };

export type Cell = { c: string; o: number; outline?: boolean };

export type GridProps = {
  x: number;
  y: number;
  pitch: number;
  cell?: number;
  reveal?: number; // 0–1: columns arrive left to right
  paint?: (col: number, row: number) => Cell | null; // null = the default empty square
  trunk?: number;
  glow?: number;
  trunkO?: number;
  branches?: GBr[];
  o?: number;
  children?: React.ReactNode;
};

export const gridGeo = (x: number, y: number, pitch: number, cell = pitch * 0.75) => {
  const ty = y + (ROWS / 2) * pitch - (pitch - cell) / 2;
  return {
    ageX: (a: number) => x + a * pitch,
    rowY: (r: number) => y + r * pitch,
    trunkY: ty,
    w: COLS * pitch - (pitch - cell),
    h: ROWS * pitch - (pitch - cell),
  };
};

export const toBr = (g: ReturnType<typeof gridGeo>, pitch: number, b: GBr): Br => ({
  x0: g.ageX(b.from),
  x1: g.ageX(b.to),
  y: g.trunkY,
  dy: b.dy * pitch,
  color: b.color,
  grow: b.grow,
  w: b.w,
  o: b.o,
  cut: b.cut === undefined ? undefined : g.ageX(b.cut),
  fall: b.fall,
});

export const EMPTY: Cell = { c: K.fg, o: 0.14 };

export const LifeGrid: React.FC<GridProps> = ({ x, y, pitch, cell = pitch * 0.75, reveal = 1, paint, trunk = 1, glow = 0.5, trunkO = 1, branches = [], o = 1, children }) => {
  const g = gridGeo(x, y, pitch, cell);
  const front = reveal * (COLS + 14);
  const rects: React.ReactNode[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const a = reveal >= 1 ? 1 : Math.min(1, Math.max(0, (front - col - (row / ROWS) * 8) / 6));
      if (a <= 0) continue;
      const p = paint?.(col, row) ?? EMPTY;
      const px = x + col * pitch;
      const py = y + row * pitch;
      rects.push(
        p.outline ? (
          <rect key={col * ROWS + row} x={px + 0.75} y={py + 0.75} width={cell - 1.5} height={cell - 1.5} rx={1.5} fill="none" stroke={p.c} strokeOpacity={p.o * a} strokeWidth={1.2} />
        ) : (
          <rect key={col * ROWS + row} x={px} y={py} width={cell} height={cell} rx={1.5} fill={p.c} fillOpacity={p.o * a} />
        ),
      );
    }
  }
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      {rects}
      {branches.map((b, i) => (
        <Branch key={i} b={toBr(g, pitch, b)} />
      ))}
      <Trunk x0={g.ageX(0)} x1={g.ageX(COLS) - (pitch - cell)} y={g.trunkY} draw={trunk} glow={glow} o={trunkO} w={Math.max(3, pitch * 0.32)} />
      {children}
    </svg>
  );
};

// The layout most scenes share: the grid on the right, words on the left.
export const RIGHT = { x: 860, y: 250, pitch: 12, cell: 9 };
export const RG = gridGeo(RIGHT.x, RIGHT.y, RIGHT.pitch, RIGHT.cell);

// Where life's branches sit (ages, rows from the trunk; negative = above).
export const LIFE: Record<string, Omit<GBr, "grow">> = {
  school: { from: 6, to: 22, dy: -9, color: K.lilac },
  work: { from: 22, to: 62, dy: 10, color: K.steel },
  money: { from: 25, to: 70, dy: -17, color: K.sand },
};

// Squares under a grown branch take its colour: where those weeks went.
export const tintFor = (bs: GBr[]) => (col: number, row: number): Cell | null => {
  const mid = ROWS / 2;
  for (const b of bs) {
    if (b.grow <= 0 || col < b.from || col >= b.to) continue;
    const reach = b.from + (b.to - b.from) * b.grow;
    if (col > reach) continue;
    const lo = b.dy < 0 ? mid + b.dy : mid;
    const hi = b.dy < 0 ? mid : mid + b.dy;
    if (row >= lo && row < hi) return { c: b.color, o: 0.32 * (b.o ?? 1) };
  }
  return null;
};
