import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Tile } from "./art";
import { FONT, K, SERIF } from "./theme";

// Covers (STYLE.md 二): paper brand bar on top, the first frame's sentence in plain words (no numbers), and one
// main picture drawn for the cover: a heap of sleeping product tiles, one crowned tile in the spotlight on top.
const Bar: React.FC<{ h: number; w: number }> = ({ h, w }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: K.paper, borderBottom: `3px solid ${K.gold}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${h * 0.6}px`, boxSizing: "border-box", zIndex: 5 }}>
    <div style={{ display: "flex", alignItems: "center", gap: h * 0.22 }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: h * 0.72, height: h * 0.72 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: h * 0.42, color: K.ink, letterSpacing: 2 }}>世界的形状</span>
    </div>
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: h * 0.32, color: K.ink, letterSpacing: h * 0.18 }}>看见世界如何运行</span>
  </div>
);

// Rows of sleeping tiles from the bottom up, centred on cx; the hero tile stands on the top row.
const Heap: React.FC<{ cx: number; bottom: number; size: number; rows: number[]; hero: number }> = ({ cx, bottom, size, rows, hero }) => {
  const gap = size * 0.1;
  const tiles: React.ReactNode[] = [];
  rows.forEach((n, r) => {
    const w = n * size + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      tiles.push(
        <div key={`${r}-${i}`} style={{ position: "absolute", left: cx - w / 2 + i * (size + gap), top: bottom - (r + 1) * (size + gap) }}>
          <Tile size={size} tone={r === rows.length - 1 && i % 3 === 1 ? "blue" : "sleep"} mood={(r + i) % 4 === 0 ? "look" : "sleep"} />
        </div>,
      );
    }
  });
  const top = bottom - rows.length * (size + gap);
  return (
    <>
      <div style={{ position: "absolute", left: cx - hero * 1.2, top: top - hero * 2.6, width: hero * 2.4, height: hero * 2.8, background: "linear-gradient(to bottom, rgba(255,240,200,0), rgba(255,240,200,0.18))", clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", left: cx - hero * 1.1, top: top - hero * 0.5, width: hero * 2.2, height: hero * 0.9, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,240,200,0.35) 0%, transparent 70%)" }} />
      {tiles}
      <div style={{ position: "absolute", left: cx - hero / 2, top: top - hero - size * 0.1 }}>
        <Tile size={hero} tone="green" mood="happy" crown glow={1} />
      </div>
    </>
  );
};

const Line: React.FC<{ size: number; top: number; left: number; children: React.ReactNode }> = ({ size, top, left, children }) => (
  <div style={{ position: "absolute", left, top, fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: K.fg, letterSpacing: -size * 0.03, whiteSpace: "nowrap", textShadow: "0 10px 50px rgba(0,0,0,0.85)" }}>{children}</div>
);

const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: K.gold }}>{children}</span>;

export const Cover: React.FC<{ shape: "16x9" | "4x3" | "3x4" }> = ({ shape }) => {
  const W = shape === "16x9" ? 1920 : shape === "4x3" ? 1440 : 1080;
  const H = shape === "3x4" ? 1440 : 1080;
  const bar = Math.round(H * 0.06);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${shape === "3x4" ? "60% 72%" : "76% 62%"}, ${K.theme}38 0%, transparent 46%)` }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.06 }} />
      {shape === "16x9" ? (
        <>
          <Heap cx={1500} bottom={1100} size={74} rows={[20, 16, 11, 6]} hero={250} />
          <Line size={118} left={90} top={bar + 90}>你刷到的独立开发者</Line>
          <Line size={210} left={84} top={bar + 230}>
            都是<Gold>幸存者</Gold>
          </Line>
        </>
      ) : shape === "4x3" ? (
        <>
          <Heap cx={1110} bottom={1100} size={66} rows={[16, 12, 8, 4]} hero={210} />
          <Line size={136} left={70} top={bar + 70}>你刷到的独立开发者</Line>
          <Line size={210} left={64} top={bar + 230}>
            都是<Gold>幸存者</Gold>
          </Line>
        </>
      ) : (
        <>
          <Heap cx={620} bottom={1470} size={66} rows={[14, 11, 7, 3]} hero={230} />
          <Line size={176} left={66} top={bar + 70}>你刷到的</Line>
          <Line size={176} left={66} top={bar + 260}>独立开发者</Line>
          <Line size={176} left={62} top={bar + 450}>
            都是<Gold>幸存者</Gold>
          </Line>
        </>
      )}
      <Bar h={bar} w={W} />
    </AbsoluteFill>
  );
};
