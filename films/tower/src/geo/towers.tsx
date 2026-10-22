import React from "react";
import { K } from "../theme";
import { project, Proj } from "./cam";
import { CITY } from "./data";

// Shenzhen's completed towers of 150 m and up (CTBUH), as light columns standing at their real places. At city
// scale a 200 m tower is a few pixels, so heights are scaled up `ex` times (the screen says so).
export const TowerColumns: React.FC<{
  p: Proj;
  year: number; // towers completed up to this (fractional) year are standing
  ex: number;
  minH?: number;
  hi?: (t: [number, number, number, number]) => string | undefined;
  o?: number;
}> = ({ p, year, ex, minH = 150, hi, o = 1 }) => {
  const list = CITY.towers
    .filter((t) => t[2] >= minH && t[3] <= Math.ceil(year))
    .map((t) => {
      const grow = Math.max(0, Math.min(1, year - t[3] + 1)); // rises during its completion year
      const [x0, y0, d] = project(p, t[0], t[1], 0);
      const [x1, y1] = project(p, t[0], t[1], t[2] * ex * grow);
      return { t, x0, y0, x1, y1, d, grow };
    })
    .filter((q) => q.grow > 0)
    .sort((a, b) => b.d - a.d);
  return (
    <g opacity={o}>
      {list.map(({ t, x0, y0, x1, y1, grow }, i) => {
        const c = hi?.(t);
        const fresh = Math.max(0, 1 - (year - t[3]) * 1.2);
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={c ?? (t[2] >= 300 ? "#ffe7b0" : t[2] >= 200 ? "#d8cfb8" : "#7f8a96")} strokeWidth={c ? 4 : t[2] >= 200 ? 2.6 : 1.6} strokeLinecap="round" opacity={c ? 1 : 0.55 + 0.45 * grow} />
            {fresh > 0.05 ? <circle cx={x1} cy={y1} r={3 + 5 * fresh} fill={K.lit} opacity={0.8 * fresh} /> : null}
          </g>
        );
      })}
    </g>
  );
};

// Cumulative counts for a year from the CTBUH series: [150 m+, 200 m+, 300 m+].
export const skylineAt = (year: number): [number, number, number] => {
  const rows = CITY.skyline;
  const y = Math.floor(year);
  const r = rows.find((q) => q[0] === y) ?? (y < rows[0][0] ? [0, 0, 0, 0] : rows[rows.length - 1]);
  return [r[1], r[2], r[3]];
};
