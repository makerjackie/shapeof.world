// 样片D: the trench. Three Blender shots (blender/trench.py, frames copied to public/trench/) with grade, grain,
// the drone camera's on-screen display, and captions. 24 fps.
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SHADOW } from "../kit";
import { HAN, MONO } from "../theme";

export const D_FPS = 24;
const S1 = 101;
const S2 = 62;
const S3 = 77;
export const D_FRAMES = S1 + S2 + S3;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const src = (shot: number, f: number) => staticFile(`trench/s${shot}/f_${String(f).padStart(4, "0")}.jpg`);

const Grain: React.FC<{ o: number; seed: number; freq?: number }> = ({ o, seed, freq = 0.85 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o, mixBlendMode: "overlay" }}>
    <filter id={`g${seed}`}>
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter={`url(#g${seed})`} />
  </svg>
);

const Vignette: React.FC<{ k?: number }> = ({ k = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${k}) 100%)` }} />
);

const Caption: React.FC<{ f: number; a: number; b: number; children: React.ReactNode; y?: number; size?: number; sub?: string }> = ({ f, a, b, children, y = 880, size = 62, sub }) => {
  const o = Math.min(interpolate(f, [a, a + 8], [0, 1], CL), interpolate(f, [b - 8, b], [1, 0], CL));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: o, fontFamily: HAN, color: "#f3f1ea", textShadow: SHADOW }}>
      <div style={{ fontSize: size, fontWeight: 600, letterSpacing: 1 }}>{children}</div>
      {sub ? <div style={{ fontSize: 32, marginTop: 16, color: "rgba(243,241,234,0.78)" }}>{sub}</div> : null}
    </div>
  );
};

const Place: React.FC<{ f: number }> = ({ f }) => {
  const o = Math.min(interpolate(f, [8, 20], [0, 1], CL), interpolate(f, [86, 98], [1, 0], CL));
  return (
    <div style={{ position: "absolute", left: 96, top: 80, opacity: o, fontFamily: HAN, color: "#f3f1ea", textShadow: SHADOW }}>
      <div style={{ fontSize: 48, fontWeight: 600 }}>扎波罗热州 · 前线林带里的一段战壕</div>
      <div style={{ fontSize: 30, marginTop: 12, color: "rgba(243,241,234,0.75)" }}>三维重建 · 示意</div>
    </div>
  );
};

// The drone camera's display: corner marks, centre cross, zoom, then a box that closes on the man and locks.
const OSD: React.FC<{ g: number }> = ({ g }) => {
  const zoom = interpolate(g, [10, 30], [1, 5.6], CL);
  const lock = g >= 30;
  const box = interpolate(g, [24, 31], [360, 120], CL);
  const blink = Math.floor(g / 6) % 2 === 0;
  const W = "rgba(255,255,255,0.88)";
  const txt: React.CSSProperties = { position: "absolute", fontFamily: MONO, fontSize: 28, color: W, letterSpacing: 2 };
  const sec = 44 + Math.floor(g / 24);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[
          [80, 80, 1, 1],
          [1840, 80, -1, 1],
          [80, 1000, 1, -1],
          [1840, 1000, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M${x} ${y + sy * 60} L${x} ${y} L${x + sx * 60} ${y}`} stroke={W} strokeWidth={3} fill="none" />
        ))}
        <g stroke={W} strokeWidth={2.5}>
          <line x1={960 - 70} y1={540} x2={960 - 18} y2={540} />
          <line x1={960 + 18} y1={540} x2={960 + 70} y2={540} />
          <line x1={960} y1={540 - 70} x2={960} y2={540 - 18} />
          <line x1={960} y1={540 + 18} x2={960} y2={540 + 70} />
        </g>
        {g >= 24 ? (
          <rect x={960 - box / 2} y={540 - box / 2 - 10} width={box} height={box * 1.05} stroke={lock ? "#ffffff" : W} strokeWidth={lock ? 4 : 2} fill="none" strokeDasharray={lock ? "none" : "14 10"} />
        ) : null}
      </svg>
      <div style={{ ...txt, left: 120, top: 112 }}>IR · WHT</div>
      <div style={{ ...txt, right: 120, top: 112, textAlign: "right" }}>{zoom.toFixed(1)}×</div>
      <div style={{ ...txt, left: 120, bottom: 112 }}>ALT 40 m</div>
      <div style={{ ...txt, right: 120, bottom: 112, textAlign: "right" }}>
        {blink ? "● " : "  "}REC 04:57:{String(sec).padStart(2, "0")}
      </div>
      {lock ? <div style={{ ...txt, left: 960 + 80, top: 540 - 94, fontSize: 26 }}>TRACK</div> : null}
    </AbsoluteFill>
  );
};

export const SampleD: React.FC = () => {
  const f = useCurrentFrame();
  let body: React.ReactNode;
  if (f < S1) {
    body = (
      <>
        <Img src={src(1, f + 1)} style={{ width: 1920, height: 1080, filter: "contrast(1.12) saturate(0.85) brightness(1.12)" }} />
        <AbsoluteFill style={{ background: "#1d2c36", mixBlendMode: "soft-light", opacity: 0.28 }} />
        <Vignette />
        <Grain o={0.16} seed={f} />
        <Place f={f} />
      </>
    );
  } else if (f < S1 + S2) {
    const g = f - S1;
    body = (
      <>
        <Img src={src(2, g + 1)} style={{ width: 1920, height: 1080, filter: "contrast(1.15) saturate(0.8) brightness(1.08)" }} />
        <AbsoluteFill style={{ background: "#1d2c36", mixBlendMode: "soft-light", opacity: 0.28 }} />
        <Vignette k={0.6} />
        <Grain o={0.16} seed={f} />
        <Caption f={g} a={6} b={60}>
          头顶，嗡嗡声越来越近。
        </Caption>
      </>
    );
  } else {
    const g = f - S1 - S2;
    const flash = interpolate(g, [0, 3], [0.55, 0], CL);
    body = (
      <>
        <Img src={src(3, g + 1)} style={{ width: 1920, height: 1080, filter: "contrast(1.35) brightness(1.08) blur(0.6px)" }} />
        <Grain o={0.26} seed={f} freq={1.1} />
        <Vignette k={0.35} />
        <OSD g={g} />
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
        <Caption f={g} a={34} b={77 + 8} y={846} sub="—— 一名俄军士兵，2026 年（俄新社）">
          “只要被一架发现，好几架就会飞过来。”
        </Caption>
      </>
    );
  }
  return <AbsoluteFill style={{ background: "#000" }}>{body}</AbsoluteFill>;
};
