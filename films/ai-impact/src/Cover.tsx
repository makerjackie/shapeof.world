import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { lin, linePath, stepPath, toXY } from "./charts";
import { DRAM_REV, NVDA, PJM_PLOT, Pt, T0, T1, UNRATE } from "./data";
import { FONT, K, LANES, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, one plain sentence (no numbers), and a main picture drawn for the
// cover: the film's four-lane prop, big. Three lines shoot up; the work line stays flat and ends on a gold point.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const SERIES: { pts: Pt[]; max: number; step?: boolean }[] = [
  { pts: NVDA, max: 6.2 },
  { pts: DRAM_REV, max: 165 },
  { pts: PJM_PLOT, max: 360, step: true },
  { pts: UNRATE, max: 10 },
];

const Glyph: React.FC<{ x: number; y: number; w: number; h: number; label: number }> = ({ x, y, w, h, label }) => {
  const gap = h * 0.05;
  const lh = (h - gap * 3) / 4;
  const sx = lin(T0, T1, x, x + w);
  return (
    <>
      <svg width={x + w + 80} height={y + h + 80} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          {LANES.map((l) => (
            <linearGradient key={l.key} id={`cg-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {LANES.map((l, i) => {
          const top = y + i * (lh + gap);
          const s = SERIES[i];
          const sy = lin(0, s.max, top + lh, top + 6);
          const pts = toXY(s.pts, sx, sy);
          const xEnd = s.step ? sx(T1) : pts[pts.length - 1][0];
          const d = s.step ? stepPath(pts, xEnd) : linePath(pts);
          return (
            <g key={l.key}>
              <rect x={x - 12} y={top} width={w + 24} height={lh} rx={18} fill={`${l.color}0f`} stroke={`${l.color}33`} />
              <path d={`${d}L${xEnd},${top + lh}L${pts[0][0]},${top + lh}Z`} fill={`url(#cg-${l.key})`} />
              <path d={d} fill="none" stroke={l.color} strokeOpacity={0.3} strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
              <path d={d} fill="none" stroke={l.color} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {LANES.map((l, i) => {
        const top = y + i * (lh + gap);
        return (
          <div key={l.key} style={{ position: "absolute", left: x + 18, top: top + 10, fontFamily: FONT, fontSize: label, fontWeight: 900, color: l.color }}>
            {l.name}
          </div>
        );
      })}
      {(() => {
        const top = y + 3 * (lh + gap);
        const sy = lin(0, 10, top + lh, top + 6);
        const [ex, ey] = [sx(T1), sy(4.2)];
        return (
          <>
            <div style={{ position: "absolute", left: ex - 34, top: ey - 34, width: 68, height: 68, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,209,102,0.55) 0%, rgba(255,209,102,0) 70%)" }} />
            <div style={{ position: "absolute", left: ex - 15, top: ey - 15, width: 30, height: 30, borderRadius: "50%", background: K.gold, boxShadow: `0 0 30px ${K.gold}` }} />
          </>
        );
      })()}
    </>
  );
};

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${tall ? "60% 72%" : "74% 55%"}, ${K.theme}2a 0%, transparent 50%)` }} />
      {tall ? <Glyph x={90} y={700} w={900} h={640} label={52} /> : <Glyph x={1010} y={bar + 110} w={820} h={840} label={60} />}
      <div style={{ position: "absolute", left: tall ? 70 : 90, top: tall ? bar + 90 : bar + 250, fontFamily: FONT, fontWeight: 900, fontSize: tall ? 132 : 138, lineHeight: 1.18, color: K.fg, letterSpacing: -3, textShadow: "0 10px 50px rgba(0,0,0,0.85)" }}>
        AI 先改变的，
        <br />
        {tall ? (
          <>
            不是你的
            <br />
            <span style={{ color: K.gold }}>工作</span>
          </>
        ) : (
          <>
            不是你的<span style={{ color: K.gold }}>工作</span>
          </>
        )}
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
