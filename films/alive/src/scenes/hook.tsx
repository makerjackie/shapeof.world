import React from "react";
import { AbsoluteFill } from "remotion";
import { Branch, LifeGrid, RIGHT, Trunk } from "../grid";
import { EBACK, EIO, EO, Odometer, progAt, Shockwave } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { Box, Cap, Head, Src } from "../ui";

// Sprigs off the opening trunk: [x0, length, dy, colour, beat it grows on]. The first two are already there on frame 0.
const SPRIGS: [number, number, number, string, number][] = [
  [180, 360, 120, K.steel, -9],
  [560, 300, -110, K.sand, -9],
  [900, 420, 150, K.lilac, 1],
  [1240, 300, -130, K.steel, 2],
  [1480, 380, 100, K.sand, 3],
  [330, 260, -70, K.lilac, 5],
  [1060, 280, -60, K.sand, 6],
];

// 0 s: the whole conclusion is on screen from the first frame; on the first beat a soft ring of light, not a hit.
export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const hit = frame >= 0 ? Math.max(0, 1 - frame / 22) : 0;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {SPRIGS.map(([x0, len, dy, color, at], i) => (
          <Branch key={i} b={{ x0, x1: x0 + len, y: 700, dy, color, grow: at < 0 ? 1 : progAt(frame, at, 1.6, EO), w: 3, o: 0.75 }} />
        ))}
        <Trunk x0={-20} x1={1940} y={700} glow={0.5 + 0.5 * hit} w={5} />
      </svg>
      <Shockwave at={0} x={960} y={420} color={K.themeHi} size={1500} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", justifyContent: "center", transform: `scale(${1 + 0.025 * hit})` }}>
        <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, color: K.fg, letterSpacing: -2, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}>
          <span style={{ color: K.theme }}>活着是主线，</span>其他都是支线。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 5 s: a life, one square a week.
export const Weeks: React.FC = () => {
  const frame = useBeatFrame();
  const reveal = progAt(frame, 0, 3.2, EIO);
  const trunk = progAt(frame, 3.6, 2.6, EIO);
  return (
    <AbsoluteFill>
      <LifeGrid {...RIGHT} reveal={reveal} trunk={trunk} glow={0.6} />
      <Box x={130} y={330} style={{ gap: 10 }}>
        <Cap at={0} size={48} color={K.fg}>人这一生，大约</Cap>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <Odometer value={4100 * reveal} size={190} sep={false} color={K.theme} />
          <span style={{ fontFamily: FONT, fontSize: 72, fontWeight: 900 }}>个星期</span>
        </div>
        <Cap at={3.5} size={36} color={K.sub}>每一格，是一周。</Cap>
      </Box>
      <Src>2024 年中国人均预期寿命 79.0 岁 · 国家卫健委 · 格子按 79 年 × 52 周</Src>
    </AbsoluteFill>
  );
};

// 10 s: the question the film answers.
export const Question: React.FC = () => (
  <AbsoluteFill>
    <LifeGrid {...RIGHT} glow={0.4} o={0.7} />
    <Box x={130} y={360} style={{ gap: 30 }}>
      <Head at={0} parts={["这些格子，", { t: "都去哪了", c: K.theme }, "？"]} size={84} />
      <Head at={3.5} parts={["又该怎么过？"]} size={84} />
    </Box>
  </AbsoluteFill>
);

// 15 s: the title card, on the music's first main section.
export const TitleCard: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, 0, 1.4, EBACK);
  const sub = progAt(frame, 1.6, 1, EO);
  const rule = progAt(frame, 0.6, 1.6, EO);
  return (
    <AbsoluteFill>
      <LifeGrid x={407} y={176} pitch={14} cell={10.5} glow={0.9} o={0.4} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(7,9,11,0.85) 0%, rgba(7,9,11,0.55) 40%, transparent 70%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ fontFamily: FONT, fontSize: 170, fontWeight: 900, letterSpacing: -6, color: K.fg, opacity: Math.min(1, p * 1.5), transform: `scale(${0.88 + 0.12 * p})`, whiteSpace: "nowrap" }}>活着是主线</div>
        <div style={{ width: 760 * rule, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${K.theme}, ${K.themeHi})` }} />
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: K.sub, opacity: sub, letterSpacing: 8, whiteSpace: "nowrap" }}>· 世界的形状 ·</div>
      </div>
    </AbsoluteFill>
  );
};
