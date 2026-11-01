// The one world of the film: old paper at night, family trees whose nodes wear gold leaf (money) around a warm inner
// light (a family's standing), archival photographs toned to one album, captions in one band at the bottom.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { EO, EIO, Say, SHADOW, clamp01, ramp, win } from "./kit";
import type { Part } from "./kit";
import { FONT, K, NUM, SERIF } from "./theme";

export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const Paper: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(42,33,22,${glow}) 0%, ${K.deep} 45%, ${K.bg} 100%)` }}>
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "512px 512px", opacity: 0.22, mixBlendMode: "overlay" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)" }} />
  </AbsoluteFill>
);

// ---------- captions ----------
export const CAP_Y = 856;
type Line = Part[] | string;
const asParts = (l: Line): Part[] => (typeof l === "string" ? [l] : l);
const len = (l: Line) => asParts(l).reduce((n, p) => n + Array.from(typeof p === "string" ? p : p.t).length, 0);

// One or two lines in the caption band; the second line starts once the first is typed.
// Reading time: a caption must stay up at least 0.6 s + one second per 4.5 characters (checked while rendering stills).
const warned = new Set<string>();
const readCheck = (at: number, out: number, lines: Line[]) => {
  // Chinese characters and punctuation count one each; a run of digits or Latin letters counts one per three.
  const text = lines.map((l) => asParts(l).map((p) => (typeof p === "string" ? p : p.t)).join("")).join("");
  const n = text.replace(/[ ]/g, "").replace(/[0-9A-Za-z.%–]+/g, (m) => "x".repeat(Math.ceil(m.length / 3))).length;
  const need = 0.6 + n / 4.5;
  const key = `${at.toFixed(2)}`;
  if (out - at < need && !warned.has(key)) {
    warned.add(key);
    console.warn(`READ ${Math.floor(at / 60)}:${(at % 60).toFixed(1)} has ${(out - at).toFixed(1)}s, needs ${need.toFixed(1)}s: ${lines.map((l) => asParts(l).map((p) => (typeof p === "string" ? p : p.t)).join("")).join(" / ")}`);
  }
};
export const Cap: React.FC<{ at: number; out: number; lines: Line[]; size?: number; y?: number; stagger?: number }> = ({ at, out, lines, size = 64, y = CAP_Y, stagger = 1.0 }) => {
  readCheck(at, out, lines);
  let t0 = at;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {lines.map((l, i) => {
        const a = t0;
        t0 += (len(l) * stagger) / 30 + 0.12;
        return <Say key={i} at={a} out={out} size={size} parts={asParts(l)} stagger={stagger} />;
      })}
    </div>
  );
};

// Big centred statement (the discovery, the questions).
export const Big: React.FC<{ at: number; out?: number; lines: Line[]; size?: number; y?: number; gap?: number; serif?: boolean; stagger?: number }> = ({
  at, out, lines, size = 104, y = 400, gap = 18, serif = true, stagger = 1.3,
}) => {
  if (out !== undefined) readCheck(at, out, lines);
  let t0 = at;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", gap }}>
      {lines.map((l, i) => {
        const a = t0;
        t0 += (len(l) * stagger) / 30 + 0.15;
        return <Say key={i} at={a} out={out} size={size} serif={serif} weight={900} stagger={stagger} parts={asParts(l)} />;
      })}
    </div>
  );
};

// A small source line under a picture, only where a number is converted or estimated.
export const Fine: React.FC<{ t: number; at: number; out: number; y?: number; children: React.ReactNode }> = ({ t, at, out, y = 836, children }) => {
  const o = win(t, at, out, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(244,236,220,0.6)", opacity: o, textShadow: SHADOW }}>
      {children}
    </div>
  );
};

// ---------- archival photographs ----------
export const Photo: React.FC<{
  src: string; x: number; y: number; w: number; h: number; o: number; zoom?: number; px?: number; py?: number; frame?: boolean; dim?: number;
}> = ({ src, x, y, w, h, o, zoom = 1, px = 50, py = 50, frame = true, dim = 0 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o, overflow: "hidden", borderRadius: 3,
      boxShadow: frame ? "0 24px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(240,192,98,0.35)" : undefined }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%` }} />
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: K.bg, opacity: dim }} /> : null}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)" }} />
    </div>
  );

// A portrait in a round gold frame.
export const Portrait: React.FC<{ src: string; x: number; y: number; r: number; o: number; ash?: number; pos?: string }> = ({ src, x, y, r, o, ash = 0, pos = "50% 18%" }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: o }}>
      <div style={{ position: "absolute", inset: -r * 0.5, borderRadius: "50%", background: `radial-gradient(circle, rgba(240,192,98,${0.35 * (1 - ash)}) 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", border: `4px solid ${ash > 0.5 ? K.ashHi : K.gold}`, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos }} />
        <div style={{ position: "absolute", inset: 0, background: "#2a2622", opacity: ash * 0.55, mixBlendMode: "saturation" }} />
      </div>
    </div>
  );

// ---------- family trees ----------
export type Node = { x: number; y: number; row: number; i: number; parent: number };

export const buildTree = (cx: number, y0: number, dy: number, counts: number[], spread: number[]): Node[] => {
  const nodes: Node[] = [];
  let prevStart = -1;
  let prevCount = 0;
  counts.forEach((n, row) => {
    const start = nodes.length;
    for (let i = 0; i < n; i++) {
      const w = spread[row];
      const x = n === 1 ? cx : cx - w / 2 + (w * i) / (n - 1);
      const parent = row === 0 ? -1 : prevStart + Math.min(prevCount - 1, Math.floor(((i + 0.5) * prevCount) / n));
      nodes.push({ x, y: y0 + row * dy, row, i, parent });
    }
    prevStart = start;
    prevCount = n;
  });
  return nodes;
};

// grow 0..1 appearance; gold 0..1 (1 = gold leaf, 0 = ash); light 0..1 warm inner light (standing); flakeAt: when gold falls.
export const Tree: React.FC<{
  nodes: Node[];
  grow: (n: Node) => number;
  gold: (n: Node) => number;
  light?: (n: Node) => number;
  r?: number | ((n: Node) => number);
  flakeAt?: (n: Node) => number | null;
  t: number;
  id: string;
  links?: boolean;
}> = ({ nodes, grow, gold, light, r = 13, flakeAt, t, id, links = true }) => {
  const R = (n: Node) => (typeof r === "number" ? r : r(n));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="38%" cy="35%">
          <stop offset="0%" stopColor={K.goldHi} />
          <stop offset="55%" stopColor={K.gold} />
          <stop offset="100%" stopColor={K.goldLo} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor={K.gold} stopOpacity={0.55} />
          <stop offset="100%" stopColor={K.gold} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-warm`}>
          <stop offset="0%" stopColor="#fff1d6" />
          <stop offset="40%" stopColor={K.warm} />
          <stop offset="100%" stopColor={K.warm} stopOpacity={0} />
        </radialGradient>
      </defs>
      {links
        ? nodes.map((n, k) => {
            if (n.parent < 0) return null;
            const p = nodes[n.parent];
            const g = grow(n);
            if (g <= 0) return null;
            const gl = gold(n);
            const li = light ? light(n) : 0;
            const my = (p.y + n.y) / 2;
            const d = `M ${p.x} ${p.y} C ${p.x} ${my}, ${n.x} ${my}, ${n.x} ${n.y}`;
            const L = Math.hypot(n.x - p.x, n.y - p.y) * 1.25;
            const col = gl > 0.5 ? K.gold : li > 0.5 ? K.warm : K.ash;
            return <path key={`l${k}`} d={d} fill="none" stroke={col} strokeOpacity={0.3 + 0.35 * Math.max(gl, li)} strokeWidth={2.2} strokeDasharray={L} strokeDashoffset={L * (1 - clamp01(g * 1.6))} />;
          })
        : null}
      {nodes.map((n, k) => {
        const g = grow(n);
        if (g <= 0) return null;
        const gl = gold(n);
        const li = light ? light(n) : 0;
        const rr = R(n) * EO(clamp01(g));
        return (
          <g key={`n${k}`}>
            {gl > 0.02 ? <circle cx={n.x} cy={n.y} r={rr * 3.4} fill={`url(#${id}-halo)`} opacity={gl * 0.8} /> : null}
            {li > 0.02 ? <circle cx={n.x} cy={n.y} r={rr * 3.0} fill={`url(#${id}-warm)`} opacity={li * 0.75} /> : null}
            <circle cx={n.x} cy={n.y} r={rr} fill={K.ash} />
            {li > 0.02 ? <circle cx={n.x} cy={n.y} r={rr * 0.62} fill="#ffe2b8" opacity={li} /> : null}
            <circle cx={n.x} cy={n.y} r={rr} fill={`url(#${id}-g)`} opacity={gl} />
            <circle cx={n.x} cy={n.y} r={rr + 3} fill="none" stroke={gl > 0.5 ? K.goldHi : li > 0.5 ? K.warm : K.ashHi} strokeOpacity={0.35 + 0.4 * Math.max(gl, li)} strokeWidth={1.5} />
          </g>
        );
      })}
      {flakeAt
        ? nodes.map((n, k) => {
            const at = flakeAt(n);
            if (at === null || t < at) return null;
            return [0, 1, 2, 3, 4].map((j) => {
              const d = t - at - rnd(k * 7 + j, 3) * 0.25;
              if (d < 0 || d > 1.6) return null;
              const x = n.x + (rnd(k * 7 + j, 1) - 0.5) * 30 + (rnd(k * 7 + j, 5) - 0.5) * 40 * d;
              const y = n.y + 120 * d * d + 30 * d;
              const a = (rnd(k * 7 + j, 2) - 0.5) * 720 * d;
              const sz = 4 + rnd(k * 7 + j, 4) * 5;
              return <rect key={`f${k}-${j}`} x={x - sz / 2} y={y - sz / 2} width={sz} height={sz * 0.6} fill={K.gold} opacity={clamp01(1.3 - d)} transform={`rotate(${a} ${x} ${y})`} />;
            });
          })
        : null}
    </svg>
  );
};

// A big number with a gold glow.
export const Num: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; size?: number; color?: string; anchor?: "center" | "left" | "right" }> = ({
  x, y, o, children, size = 180, color = K.goldHi, anchor = "center",
}) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0"}, -50%) scale(${0.92 + 0.08 * o})`,
      fontFamily: NUM, fontWeight: 900, fontSize: size, color, opacity: o, whiteSpace: "nowrap", letterSpacing: 2,
      textShadow: "0 0 60px rgba(240,192,98,0.4), 0 4px 18px rgba(0,0,0,0.8)" }}>
      {children}
    </div>
  );

// A label in the serif face.
export const Label: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; size?: number; color?: string; anchor?: "center" | "left" | "right"; weight?: number }> = ({
  x, y, o, children, size = 44, color = K.fg, anchor = "center", weight = 900,
}) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0"}, -50%)`,
      fontFamily: SERIF, fontWeight: weight, fontSize: size, color, opacity: o, whiteSpace: "nowrap", textShadow: SHADOW }}>
      {children}
    </div>
  );

export { EIO, ramp, win };
