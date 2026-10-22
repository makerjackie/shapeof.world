import React from "react";
import { K } from "./theme";

// The film's main prop: a life of weeks. 79 columns (years; China's 2024 life expectancy is 79.0) × 52 rows (weeks)
// = 4108 squares, one square a week. Week i of a life is column floor(i / 52), row i % 52.
export const COLS = 79;
export const ROWS = 52;
export const WEEKS = COLS * ROWS;

export type Cell = { c: string; o: number; outline?: boolean };
export type GridBox = { x: number; y: number; pitch: number; cell: number };

// Most of the frame: the grid as the star.
export const BIG: GridBox = { x: 369, y: 205, pitch: 15, cell: 11.5 };

export const geo = (g: GridBox) => ({
  colX: (c: number) => g.x + c * g.pitch,
  rowY: (r: number) => g.y + r * g.pitch,
  w: COLS * g.pitch - (g.pitch - g.cell),
  h: ROWS * g.pitch - (g.pitch - g.cell),
  midY: g.y + (ROWS / 2) * g.pitch - (g.pitch - g.cell) / 2,
});

export const EMPTY: Cell = { c: K.fg, o: 0.13 };

export type GridProps = GridBox & {
  paint?: (col: number, row: number) => Cell | null; // null = the empty square
  appear?: (col: number, row: number) => number; // 0–1 per square, default 1
  trunk?: number; // 0–1, a warm line through the middle
  o?: number;
  children?: React.ReactNode; // extra SVG on top
};

export const LifeGrid: React.FC<GridProps> = ({ x, y, pitch, cell, paint, appear, trunk = 0, o = 1, children }) => {
  const rects: React.ReactNode[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const a = appear ? appear(col, row) : 1;
      if (a <= 0.001) continue;
      const p = paint?.(col, row) ?? EMPTY;
      const px = x + col * pitch;
      const py = y + row * pitch;
      const k = col * ROWS + row;
      rects.push(
        p.outline ? (
          <rect key={k} x={px + 0.75} y={py + 0.75} width={cell - 1.5} height={cell - 1.5} rx={2} fill="none" stroke={p.c} strokeOpacity={p.o * a} strokeWidth={1.3} />
        ) : (
          <rect key={k} x={px} y={py} width={cell} height={cell} rx={2} fill={p.c} fillOpacity={p.o * a} />
        ),
      );
    }
  }
  const G = geo({ x, y, pitch, cell });
  const xe = x + G.w * Math.min(1, trunk);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      {rects}
      {trunk > 0.001 ? (
        <g>
          <line x1={x - 20} y1={G.midY} x2={xe + 20} y2={G.midY} stroke={K.theme} strokeWidth={26} strokeOpacity={0.12} strokeLinecap="round" />
          <line x1={x - 20} y1={G.midY} x2={xe + 20} y2={G.midY} stroke={K.theme} strokeWidth={5} strokeLinecap="round" />
        </g>
      ) : null}
      {children}
    </svg>
  );
};
