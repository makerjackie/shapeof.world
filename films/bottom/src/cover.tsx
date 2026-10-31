// Covers: the question in plain words over the 50-city skyline (one floor = one year of rent, the line at 38, the
// floors above it glowing). Brand bar on top.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import d from "./data2.json";
import { FONT, K, SERIF } from "./theme";
import { FloorTower, Sky } from "./world";

const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  const base = H - (tall ? 90 : 70);
  const fh = tall ? 8 : 8.5;
  const n = d.years.length;
  const x0 = tall ? 40 : 70;
  const step = (W - 2 * x0) / (n - 1);
  const lineY = base - 38 * fh;
  return (
    <AbsoluteFill style={{ background: K.sky0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: (W - 1920) / 2, top: H - 1080, width: 1920, height: 1080 }}>
        <Sky t={0} horizon={1080 - (H - base)} />
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {d.years.map((c, i) => (
          <FloorTower key={c.c} x={x0 + i * step} base={base} w={step * 0.78} floors={c.yrs} fh={fh} seed={i + 3} line={38} glass={1} roof={c.yrs <= 38.01 ? 0.7 : 0} lit={0.62} />
        ))}
        <rect x={0} y={lineY - 9} width={W} height={18} fill={K.ice} opacity={0.14} />
        <rect x={0} y={lineY - 2} width={W} height={4} fill={K.iceHi} />
      </svg>
      <div style={{ position: "absolute", left: tall ? 70 : 110, top: bar + (tall ? 90 : 80), fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}>
        <div style={{ fontSize: tall ? 150 : 150, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2 }}>
          房价，
          {tall ? <br /> : null}
          到底了吗？
        </div>
        <div style={{ marginTop: 26, fontSize: tall ? 64 : 64, fontWeight: 800, color: K.winHi }}>按房租算一算</div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
