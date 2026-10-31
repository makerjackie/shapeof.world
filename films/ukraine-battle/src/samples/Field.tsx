// 样片E: 8 June 2023, the column in the wheat south of Mala Tokmachka. Four Blender shots (blender/battlefield.py,
// frames copied to public/field/), labels that follow the 3D defence lines (public/field/anchorsB.json), the drone's
// display in shot C, captions. 24 fps.
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SHADOW } from "../kit";
import { HAN, MONO } from "../theme";
import anchors from "../../public/field/anchorsB.json";

export const E_FPS = 24;
const SH = { A: [1, 84], B: [85, 204], C: [205, 276], D: [277, 348] } as const;
export const E_FRAMES = 348;
const EXP = 245;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const src = (shot: string, f: number) => staticFile(`field/E${shot}/f_${String(f).padStart(4, "0")}.jpg`);
const AMBER = "#f2a33a";
const RED = "#ff5a3c";

const Grain: React.FC<{ o: number; seed: number }> = ({ o, seed }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o, mixBlendMode: "overlay" }}>
    <filter id={`g${seed}`}>
      <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={seed} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter={`url(#g${seed})`} />
  </svg>
);

const Vignette: React.FC<{ k?: number }> = ({ k = 0.5 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${k}) 100%)` }} />
);

const fade = (f: number, a: number, b: number, d = 8) => Math.min(interpolate(f, [a, a + d], [0, 1], CL), interpolate(f, [b - d, b], [1, 0], CL));

const Caption: React.FC<{ f: number; a: number; b: number; children: React.ReactNode; y?: number; size?: number; sub?: string }> = ({ f, a, b, children, y = 880, size = 62, sub }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: fade(f, a, b), fontFamily: HAN, color: "#f3f1ea", textShadow: SHADOW }}>
    <div style={{ fontSize: size, fontWeight: 600, letterSpacing: 1 }}>{children}</div>
    {sub ? <div style={{ fontSize: 32, marginTop: 16, color: "rgba(243,241,234,0.78)" }}>{sub}</div> : null}
  </div>
);

const Place: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", left: 96, top: 80, opacity: fade(f, 4, 80), fontFamily: HAN, color: "#f3f1ea", textShadow: SHADOW }}>
    <div style={{ fontSize: 48, fontWeight: 600 }}>2023 年 6 月 8 日清晨 · 扎波罗热州</div>
    <div style={{ fontSize: 30, marginTop: 12, color: "rgba(243,241,234,0.75)" }}>三维重建 · 示意（车型简化）</div>
  </div>
);

// a label pinned to a 3D point: a short leader line up from the point, then the text
const Pin: React.FC<{ p?: number[]; o: number; color: string; title: string; sub?: string; side?: 1 | -1 }> = ({ p, o, color, title, sub, side = 1 }) => {
  if (!p || !p[2] || o <= 0) return null;
  const [x, y] = p;
  const lx = x + side * 40;
  const ly = y - 120;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={x} cy={y} r={7} fill={color} />
        <polyline points={`${x},${y} ${lx},${ly} ${lx + side * 30},${ly}`} stroke={color} strokeWidth={3} fill="none" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: side > 0 ? lx + 40 : undefined,
          right: side < 0 ? 1920 - (lx - 40) : undefined,
          top: ly - 34,
          fontFamily: HAN,
          color: "#f3f1ea",
          textShadow: SHADOW,
          textAlign: side > 0 ? "left" : "right",
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 700, color }}>{title}</div>
        {sub ? <div style={{ fontSize: 30, marginTop: 6 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

const DroneOSD: React.FC<{ g: number }> = ({ g }) => {
  const W = "rgba(255,255,255,0.85)";
  const txt: React.CSSProperties = { position: "absolute", fontFamily: MONO, fontSize: 28, color: W, letterSpacing: 2 };
  const blink = Math.floor(g / 6) % 2 === 0;
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
        <g stroke={W} strokeWidth={2}>
          <line x1={900} y1={540} x2={940} y2={540} />
          <line x1={980} y1={540} x2={1020} y2={540} />
          <line x1={960} y1={480} x2={960} y2={520} />
          <line x1={960} y1={560} x2={960} y2={600} />
        </g>
      </svg>
      <div style={{ ...txt, left: 120, top: 112 }}>EO · DAY</div>
      <div style={{ ...txt, right: 120, top: 112, textAlign: "right" }}>ALT 60 m</div>
      <div style={{ ...txt, right: 120, bottom: 112, textAlign: "right" }}>{blink ? "● " : "  "}REC 05:41:{String(12 + Math.floor(g / 24)).padStart(2, "0")}</div>
    </AbsoluteFill>
  );
};

export const SampleE: React.FC = () => {
  const f = useCurrentFrame() + 1; // global frame, 1-based like Blender
  let body: React.ReactNode;
  if (f <= SH.A[1]) {
    body = (
      <>
        <Img src={src("A", f)} style={{ width: 1920, height: 1080, filter: "contrast(1.12) saturate(0.88) brightness(1.04)" }} />
        <Vignette />
        <Grain o={0.14} seed={f} />
        <Place f={f} />
        <Caption f={f} a={20} b={86}>
          乌军第 47 旅的纵队，开进马拉托克马奇卡以南的田野。
        </Caption>
      </>
    );
  } else if (f <= SH.B[1]) {
    const g = f - SH.B[0];
    const an = (anchors as Record<string, Record<string, number[]>>)[String(g)] || {};
    body = (
      <>
        <Img src={src("B", g + 1)} style={{ width: 1920, height: 1080, filter: "contrast(1.1) saturate(0.9) brightness(1.05)" }} />
        <Vignette k={0.4} />
        <Grain o={0.12} seed={f} />
        <Pin p={an.mines} o={fade(g, 34, 140, 10)} color={RED} title="雷场" sub="纵深可达 500 米" side={-1} />
        <Pin p={an.trench} o={fade(g, 62, 140, 10)} color={AMBER} title="第一道防线" sub="林带里的战壕" side={1} />
        <Pin p={an.main} o={fade(g, 86, 140, 10)} color={AMBER} title="主防线" sub="反坦克壕 + 龙牙 · 约 10 公里外" side={-1} />
        <Caption f={g} a={92} b={128} y={900} size={56}>
          三道防线，合起来约 30 公里纵深。
        </Caption>
      </>
    );
  } else if (f <= SH.C[1]) {
    const g = f - SH.C[0];
    const flash = interpolate(f, [EXP - 1, EXP, EXP + 5], [0, 0.7, 0], CL);
    const shake = f >= EXP && f < EXP + 14 ? (14 - (f - EXP)) * 1.6 : 0;
    const sx = Math.sin(f * 2.7) * shake;
    const sy = Math.cos(f * 3.3) * shake;
    body = (
      <>
        <Img src={src("C", g + 1)} style={{ width: 1920, height: 1080, transform: `translate(${sx}px, ${sy}px) scale(1.03)`, filter: "contrast(1.15) saturate(0.85) brightness(1.03)" }} />
        <Grain o={0.2} seed={f} />
        <Vignette k={0.35} />
        <DroneOSD g={g} />
        <AbsoluteFill style={{ background: "#fff2dc", opacity: flash }} />
      </>
    );
  } else {
    const g = f - SH.D[0];
    body = (
      <>
        <Img src={src("D", g + 1)} style={{ width: 1920, height: 1080, filter: "contrast(1.12) saturate(0.82) brightness(1.02)" }} />
        <Vignette k={0.55} />
        <Grain o={0.15} seed={f} />
        <Caption f={g} a={10} b={80}>
          第一天，就停在了这片麦田。
        </Caption>
      </>
    );
  }
  return <AbsoluteFill style={{ background: "#000" }}>{body}</AbsoluteFill>;
};
