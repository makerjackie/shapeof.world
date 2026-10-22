import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { FONT, K, SERIF } from "./theme";
import { Branch, LIFE_BRANCHES, TipLabel, TreeGeo, Trunk } from "./tree";

// Covers (STYLE.md 二): paper brand bar on top, the first frame's sentence as the title, one main picture: the life
// tree drawn large over a field of week squares, the past lit warm.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

const Field: React.FC<{ W: number; top: number; H: number; pitch: number }> = ({ W, top, H, pitch }) => {
  const cols = Math.ceil(W / pitch);
  const rows = Math.ceil((H - top) / pitch);
  const now = Math.floor(cols * 0.36);
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const past = c < now;
      cells.push(
        <rect key={`${c}-${r}`} x={c * pitch} y={top + r * pitch} width={pitch * 0.74} height={pitch * 0.74} rx={3} fill={past ? (random(`cv${c}-${r}`) < 0.5 ? K.theme : K.gold) : K.fg} fillOpacity={past ? 0.1 + 0.3 * random(`co${c}-${r}`) : 0.06} />,
      );
    }
  return <>{cells}</>;
};

export const Cover: React.FC<{ tall: boolean }> = ({ tall }) => {
  const W = tall ? 1080 : 1920;
  const H = tall ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  const g: TreeGeo = tall ? { x0: 60, w: 960, y: 1090, scale: 1.3 } : { x0: 90, w: 1740, y: 760, scale: 1.4 };
  const k = tall ? 0.9 : 0.85;
  const bs = LIFE_BRANCHES.map((b) => ({ ...b, dy: b.dy * k, grow: 1, w: 10 }));
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% ${tall ? "76%" : "72%"}, ${K.theme}38 0%, transparent 55%)` }} />
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <Field W={W} top={tall ? 700 : 500} H={H} pitch={tall ? 40 : 44} />
        {bs.map((b, i) => (
          <Branch key={i} g={g} b={b} />
        ))}
        <Trunk g={g} glow={1} w={14} threads={1} />
      </svg>
      {bs.map((b, i) => (
        <TipLabel key={i} g={g} b={b} o={1} size={tall ? 30 : 34} />
      ))}
      <div
        style={{
          position: "absolute",
          left: tall ? 70 : 100,
          top: bar + (tall ? 70 : 50),
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: tall ? 150 : 160,
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
