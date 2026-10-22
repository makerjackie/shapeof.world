import React from "react";
import { AbsoluteFill, random } from "remotion";
import { EnergyTower, Ground, Label, makeSkyline, Skyline } from "../art";
import { EBACK, EO, Odometer, progAt, Shockwave } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { Cap, Head, Src } from "../ui";

const SKY = makeSkyline("open", 40, -20, 1960, 160, 560);

// 0 s: the whole conclusion is on screen from the first frame and slams on the first beat.
export const Claim: React.FC = () => {
  const frame = useBeatFrame();
  const hit = frame >= 0 ? Math.max(0, 1 - frame / 14) : 0;
  const scale = 1 + 0.06 * hit;
  return (
    <AbsoluteFill>
      <Skyline towers={SKY} ground={1000} seed="open" litFrac={0.5} flash={hit * 0.9} />
      <Ground y={1000} />
      <Shockwave at={0} x={960} y={400} color={K.fg} size={1800} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", transform: `scale(${scale})` }}>
        <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, color: K.fg, letterSpacing: -2, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}>
          深圳的高楼，<span style={{ color: K.theme }}>不是盖来收租的</span>。
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 4 s: the same street, two plots, two land prices.
export const Evidence: React.FC = () => {
  const frame = useBeatFrame();
  const g1 = progAt(frame, 0.6, 2.2, EO);
  const g2 = progAt(frame, 1.6, 1.4, EO);
  const base = 900;
  const H = 560; // 10.86 万
  const h1 = H * g1;
  const h2 = H * (1.11 / 10.86) * g2;
  const col = (x: number, h: number, color: string) => (
    <div style={{ position: "absolute", left: x - 130, top: base - h, width: 260, height: h, background: `linear-gradient(180deg, ${color}, ${color}66)`, borderRadius: "10px 10px 0 0" }} />
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center" }}>
        <Cap at={0} size={44} color={K.fg}>同一个街道 · 每平方米楼面地价</Cap>
      </div>
      <Ground y={base} />
      {col(700, h1, K.steel)}
      {col(1220, h2, K.green)}
      <Label x={700} y={base + 50} size={40}>住宅地</Label>
      <Label x={1220} y={base + 50} size={40}>写字楼地</Label>
      <div style={{ position: "absolute", left: 700, top: base - h1 - 70, transform: "translateX(-50%)", opacity: g1 > 0.05 ? 1 : 0 }}>
        <Odometer value={10.86 * g1} decimals={2} size={84} suffix=" 万" />
      </div>
      <div style={{ position: "absolute", left: 1220, top: base - h2 - 110, transform: "translateX(-50%)", opacity: g2 > 0.05 ? 1 : 0 }}>
        <Odometer value={1.1 * g2} decimals={1} size={84} suffix=" 万" color={K.green} />
      </div>
      <div style={{ position: "absolute", left: 1460, top: 560 }}>
        <Stamp at={4} color={K.green} size={78} rotate={-8}>便宜 10 倍</Stamp>
      </div>
      <Src>按楼面地价 · 深圳南山粤海街道 · 住宅地：第一财经 2026 · 写字楼地：澎湃新闻 2025</Src>
    </AbsoluteFill>
  );
};

// 8 s: the two questions the film answers.
export const Why: React.FC = () => (
  <AbsoluteFill>
    <EnergyTower cx={1500} ground={1000} s={0.75} progress={0} blueprint={0.6} crane={false} />
    <div style={{ position: "absolute", left: 140, top: 300, display: "flex", flexDirection: "column", gap: 34 }}>
      <Head at={0} parts={["同一个街道，", { t: "凭什么差 10 倍", c: K.theme }, "？"]} size={80} />
      <Head at={2} parts={["盖楼的人，又图什么？"]} size={80} />
      <Cap at={4.5} size={38}>跟着一栋楼，从一块空地走到今天。</Cap>
    </div>
  </AbsoluteFill>
);

// 12 s: the title card, on the music's first main section.
export const TitleCard: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, 0, 1.2, EBACK);
  const sub = progAt(frame, 1.5, 1, EO);
  const rule = progAt(frame, 0.6, 1.4, EO);
  return (
    <AbsoluteFill>
      <EnergyTower cx={960} ground={1080} s={1.05} progress={1} crane={false} lit={(f, c) => (random(`title${f}-${c}`) < 0.45 ? 0.6 : 0)} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(7,9,11,0.88) 0%, rgba(7,9,11,0.6) 45%, transparent 75%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ fontFamily: FONT, fontSize: 170, fontWeight: 900, letterSpacing: -6, color: K.fg, opacity: Math.min(1, p * 1.5), transform: `scale(${0.85 + 0.15 * p})`, whiteSpace: "nowrap" }}>高楼的形状</div>
        <div style={{ width: 760 * rule, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${K.theme}, ${K.themeHi})` }} />
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: K.sub, opacity: sub, letterSpacing: 8, whiteSpace: "nowrap" }}>· 世界的形状 ·</div>
      </div>
    </AbsoluteFill>
  );
};

