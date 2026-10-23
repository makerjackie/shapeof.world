import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { FONT } from "../theme";
import { Chip, DataHall, Silhouette } from "./art";
import { Backdrop, C, EBACK, EIO, EO, Label, lerp, Line, pr, Src, useT } from "./kit";

const CN = "#ff8a5c";

// ── 0:26–0:34 · Chips: the US builds a wall of export rules, brick by brick, one per round; chips bounce off it. On
// the far side, China's open models take the biggest share of downloads. ──
const BRICKS = [
  { at: 26.58, t: "2022.10" },
  { at: 27.08, t: "2023.10" },
  { at: 27.58, t: "2024.12" },
  { at: 28.08, t: "2025.01", note: "后撤销" },
  { at: 28.58, t: "2026.01" },
];
const WALL = { x: 960, w: 210, h: 92, base: 960 };

export const Chips: React.FC = () => {
  const t = useT();
  const us = pr(t, 26.08, 0.5, EO);
  const cn = pr(t, 26.33, 0.5, EO);
  const far = pr(t, 30.08, 0.5, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={far > 0.5 ? CN : C.cyan} at={far > 0.5 ? [75, 60] : [30, 60]} strength={0.12} />
      <div style={{ position: "absolute", left: 120, top: 470, width: 660, height: 420, opacity: us * lerp(1, 0.55, far), transform: `translateX(${(1 - us) * -40}px)` }}>
        <Silhouette id="840" w={660} h={420} fill="rgba(77,212,255,0.16)" stroke={C.cyan} />
      </div>
      <Label x={130} y={430} size={34} color={C.cyan} at={26.2} weight={900}>
        美国
      </Label>
      <div style={{ position: "absolute", left: 1150, top: 440, width: 640, height: 480, opacity: cn * lerp(1, 0.22, far), transform: `translateX(${(1 - cn) * 40}px)` }}>
        <Silhouette id="156" w={640} h={480} fill="rgba(255,138,92,0.16)" stroke={CN} />
      </div>
      <Label x={1790} y={410} anchor="right" size={34} color={CN} at={26.45} weight={900}>
        <span style={{ opacity: 1 - far }}>中国</span>
      </Label>
      {/* the wall */}
      <Label x={WALL.x} y={WALL.base - BRICKS.length * WALL.h - 52} anchor="center" size={24} color={C.sub} at={26.58} weight={800}>
        美国对华 AI 芯片出口管制
      </Label>
      {BRICKS.map((b, i) => {
        const p = pr(t, b.at - 0.18, 0.18, EIO);
        const settle = t >= b.at ? Math.max(0, 1 - (t - b.at) / 0.25) : 0;
        const y = WALL.base - (i + 1) * WALL.h;
        return (
          <div
            key={b.t}
            style={{
              position: "absolute",
              left: WALL.x - WALL.w / 2,
              top: lerp(-140, y, p) + settle * 6,
              width: WALL.w,
              height: WALL.h - 6,
              borderRadius: 8,
              opacity: p > 0 ? 1 : 0,
              background: b.note ? "rgba(77,212,255,0.06)" : "linear-gradient(180deg, #3a4656, #2a3340)",
              border: b.note ? `2px dashed ${C.cyan}88` : "1px solid #4d5b6e",
              boxShadow: b.note ? undefined : "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              color: C.fg,
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 1 }}>{b.t}</div>
            {b.note ? <div style={{ fontSize: 18, fontWeight: 700, color: C.sub }}>{b.note}</div> : null}
          </div>
        );
      })}
      {/* chips thrown at the wall bounce back */}
      {Array.from({ length: 6 }).map((_, i) => {
        const s0 = 29.08 + i * 0.16;
        const p = pr(t, s0, 0.42, (x) => x);
        if (p <= 0 || p >= 1) return null;
        const hit = 0.55;
        const y0 = 560 + (i % 3) * 110;
        const x = p < hit ? lerp(640, WALL.x - WALL.w / 2 - 40, p / hit) : lerp(WALL.x - WALL.w / 2 - 40, 760 - i * 30, (p - hit) / (1 - hit));
        const y = p < hit ? y0 : y0 + ((p - hit) / (1 - hit)) ** 2 * 260;
        return (
          <div key={i} style={{ position: "absolute", left: x - 28, top: y - 28, transform: `rotate(${p * 300}deg)`, opacity: p > 0.85 ? (1 - p) / 0.15 : 1 }}>
            <Chip w={56} color={C.cyan} />
          </div>
        );
      })}
      {/* the far side: downloads of open models, 41 of 100 Chinese */}
      {far > 0 ? (
        <>
          <div style={{ position: "absolute", left: 1170, top: 470, display: "grid", gridTemplateColumns: "repeat(10, 34px)", gap: 6, opacity: far }}>
            {Array.from({ length: 100 }).map((_, i) => {
              const on = i < 41 && t >= 30.58 + i * 0.024;
              return <div key={i} style={{ width: 34, height: 34, borderRadius: 7, background: on ? CN : "rgba(244,240,232,0.1)", boxShadow: on ? `0 0 10px ${CN}66` : undefined }} />;
            })}
          </div>
          <div style={{ position: "absolute", left: 1170, top: 880, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.muted, whiteSpace: "nowrap", opacity: far }}>每格 = 1% 的下载量</div>
          <div style={{ position: "absolute", left: 1600, top: 470, opacity: pr(t, 31.58, 0.4, EO) }}>
            <Odometer value={41 * pr(t, 30.58, 1, EIO)} size={110} suffix="%" color={CN} />
          </div>
          <Label x={1606} y={600} size={28} color={C.fg} at={31.83} weight={900}>
            中国模型
          </Label>
          <Label x={1606} y={642} size={22} color={C.sub} at={32.08}>
            排第一
          </Label>
          <Label x={1170} y={418} size={24} color={C.sub} at={30.33} weight={800}>
            Hugging Face（全球最大的开源模型网站）· 过去一年下载量
          </Label>
        </>
      ) : null}
      <Line at={26.08} text="芯片，成了中美之间的墙。" kw="墙" kwAt={28.58} />
      <Line at={30.08} y={262} text="墙那边，中国用开源追上来。" kw="开源" kwAt={31.58} />
      <Src at={26.4}>美国商务部 BIS 对华先进芯片规则五轮（联邦公报；2025-01 那轮后撤销）· Hugging Face 官方博客 2026-03：过去一年下载量，中国模型占 41%，最多</Src>
    </AbsoluteFill>
  );
};

// ── 0:34–0:42 · Power: the world's data centres in 2030 use about as much electricity as all of Japan. ──
export const Power: React.FC = () => {
  const t = useT();
  const grow = pr(t, 35.08, 2, EIO);
  const twh = lerp(4150, 9450, grow);
  const jp = pr(t, 38.08, 1.5, EIO);
  const eq = pr(t, 38.08, 0.4, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.violet} at={[50, 65]} strength={0.1 + 0.1 * grow} />
      <Label x={150} y={440} size={28} color={C.sub} at={34.33} weight={800}>
        全球数据中心，一年用电
      </Label>
      <div style={{ position: "absolute", left: 140, top: 482, opacity: pr(t, 34.4, 0.3) }}>
        <Odometer value={twh} size={110} suffix=" 亿度" color={grow >= 1 ? C.violet : C.fg} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 610, display: "flex", gap: 14, fontFamily: FONT, fontSize: 24, fontWeight: 800, whiteSpace: "nowrap" }}>
        <span style={{ padding: "4px 14px", borderRadius: 8, background: grow < 1 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", color: grow < 1 ? C.fg : C.muted }}>2024 · 4,150</span>
        <span style={{ padding: "4px 14px", borderRadius: 8, background: grow >= 1 ? "rgba(167,139,250,0.22)" : "rgba(255,255,255,0.05)", color: grow >= 1 ? C.violet : C.muted }}>2030 · 9,450（预测）</span>
      </div>
      <div style={{ position: "absolute", left: 150, top: 680, opacity: pr(t, 34.08, 0.5) }}>
        <DataHall w={760} h={290} n={7} lit={0.35 + 0.65 * grow} t={t} color={C.violet} title="全球数据中心" />
      </div>
      <div style={{ position: "absolute", left: 1010, top: 600, transform: `translate(-50%, -50%) scale(${eq})`, opacity: Math.min(1, eq * 2), fontFamily: FONT, fontSize: 140, fontWeight: 900, color: C.fg }}>≈</div>
      <div style={{ position: "absolute", left: 1140, top: 400, width: 600, height: 560, opacity: pr(t, 34.58, 0.5) * (0.35 + 0.65 * pr(t, 37.58, 0.5)) }}>
        <Silhouette id="392" w={600} h={560} fill="rgba(167,139,250,0.08)" stroke={C.violet} level={jp} levelColor={C.violet} />
      </div>
      <Label x={1440} y={970} anchor="center" size={28} color={C.fg} at={38.33} weight={900}>
        日本全国一年的用电
      </Label>
      <Line at={34.08} text="到 2030 年，全球数据中心" />
      <Line at={38.08} y={262} text="要用掉一个日本的电。" kw="一个日本" kwAt={39.08} />
      <Src at={34.4}>IEA（国际能源署）《能源与 AI》2025，基准情景：2024 年约 415 太瓦时，2030 年约 945 太瓦时（9,450 亿度），"略多于日本全国用电" · 预测</Src>
    </AbsoluteFill>
  );
};
