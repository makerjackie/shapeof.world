import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { Branch, Trunk } from "./grid";
import { FONT, K, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, the first frame's sentence as the title, one main picture: the
// trunk and its branches drawn large over a field of week squares, the past lit warm.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const Field: React.FC<{ W: number; top: number; H: number; trunkY: number; pitch: number }> = ({ W, top, H, trunkY, pitch }) => {
  const cols = Math.ceil(W / pitch);
  const rows = Math.ceil((H - top) / pitch);
  const now = Math.floor(cols * 0.4);
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const y = top + r * pitch;
      const near = Math.max(0, 1 - Math.abs(y - trunkY) / (H * 0.42));
      const past = c < now;
      cells.push(
        <rect key={`${c}-${r}`} x={c * pitch} y={y} width={pitch * 0.74} height={pitch * 0.74} rx={3} fill={past ? (random(`cv${c}-${r}`) < 0.5 ? K.theme : K.gold) : K.fg} fillOpacity={(past ? 0.12 + 0.45 * random(`co${c}-${r}`) : 0.07) * (0.35 + 0.65 * near)} />,
      );
    }
  const s = W / 1920;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {cells}
      <Branch b={{ x0: 120 * s, x1: 620 * s, y: trunkY, dy: -170 * s, color: K.lilac, grow: 1, w: 7 * s, o: 0.9 }} />
      <Branch b={{ x0: 460 * s, x1: 1500 * s, y: trunkY, dy: 150 * s, color: K.steel, grow: 1, w: 7 * s, o: 0.9 }} />
      <Branch b={{ x0: 760 * s, x1: 1880 * s, y: trunkY, dy: -260 * s, color: K.sand, grow: 1, w: 7 * s, o: 0.9 }} />
      <Trunk x0={-20} x1={W + 20} y={trunkY} glow={1} w={14 * s} />
      <circle cx={now * pitch - pitch * 0.13} cy={trunkY} r={22 * s} fill={K.themeHi} />
    </svg>
  );
};

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% ${tall ? "78%" : "74%"}, ${K.theme}38 0%, transparent 55%)` }} />
      <Field W={W} top={tall ? 760 : 560} H={H} trunkY={tall ? 1110 : 830} pitch={tall ? 40 : 44} />
      <div
        style={{
          position: "absolute",
          left: tall ? 70 : 100,
          top: bar + (tall ? 70 : 60),
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: tall ? 150 : 170,
          lineHeight: 1.12,
          color: K.fg,
          letterSpacing: -4,
          textShadow: "0 10px 50px rgba(0,0,0,0.85)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: K.theme }}>活着是主线，</span>
        <br />
        {tall ? (
          <>
            其他都是
            <br />
            支线
          </>
        ) : (
          "其他都是支线"
        )}
      </div>
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
