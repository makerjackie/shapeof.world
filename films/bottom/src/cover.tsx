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

// One design, one file per platform ratio (films/DIRECTOR.md): 16:9 1920×1080, 4:3 1440×1080, 3:4 1080×1440. In 4:3 and
// 3:4 the title sits in the middle, inside both a centre 3:4 and a centre 16:9 crop, because the platforms crop covers.
type Ratio = "16x9" | "4x3" | "3x4";
const SPEC: Record<Ratio, { W: number; H: number; fh: number; title: number; two: boolean; mid: number }> = {
  "16x9": { W: 1920, H: 1080, fh: 8.5, title: 200, two: false, mid: 0 },
  "4x3": { W: 1440, H: 1080, fh: 5.5, title: 150, two: true, mid: 470 },
  "3x4": { W: 1080, H: 1440, fh: 6, title: 160, two: true, mid: 660 },
};
export const Cover: React.FC<{ ratio: Ratio }> = ({ ratio }) => {
  const { W, H, fh, title, two, mid } = SPEC[ratio];
  const bar = Math.round(Math.min(W, H) * 0.06);
  const base = H - 70;
  const n = d.years.length;
  const x0 = 70;
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
      <div style={{ position: "absolute", left: 0, width: W, ...(two ? { top: mid, transform: "translateY(-50%)" } : { top: bar + 50 }), textAlign: "center", fontFamily: FONT, color: K.fg, textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 0 60px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: title, fontWeight: 900, lineHeight: 1.08, letterSpacing: -2 }}>
          房价，
          {two ? <br /> : null}
          到底了吗？
        </div>
        <div style={{ marginTop: 22, fontSize: 64, fontWeight: 800, color: K.winHi }}>跌了 5 年，按房租算一算</div>
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
