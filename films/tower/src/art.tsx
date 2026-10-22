import React from "react";
import { random } from "remotion";
import { CL, EO, progAt } from "./fx";
import { useBeatFrame } from "./kit";
import { FONT, K } from "./theme";
import { interpolate } from "remotion";

// ---------- The main prop: a tower made of floors and windows ----------

// Light level 0..1 for window (floor, col) of building `id`.
export type LitFn = (floor: number, col: number) => number;

// Stable random threshold per window, so "a quarter of the windows" is always the same quarter.
export const seedOf = (id: string, f: number, c: number) => random(`${id}-${f}-${c}`);

export const Building: React.FC<{
  id: string;
  x: number; // left edge
  ground: number; // y of the base
  w: number;
  floors: number;
  floorH?: number;
  cols?: number;
  built?: number; // floors standing (fractional = the top one is going up)
  lit?: LitFn;
  blueprint?: number; // 0..1: dashed outline drawn around the future building
  fold?: boolean; // the folded "ripple" facade of 深圳能源大厦
  body?: string;
  hue?: (floor: number, col: number) => string | undefined; // colour for a lit window (default warm light)
}> = ({ id, x, ground, w, floors, floorH = 14, cols = 8, built = floors, lit, blueprint = 0, fold = false, body = "#0e1319", hue }) => {
  const H = floors * floorH;
  const top = ground - H;
  const standing = Math.max(0, Math.min(floors, built));
  const whole = Math.floor(standing);
  const frac = standing - whole;
  const colW = w / cols;
  const perim = 2 * (w + H);
  const rects: React.ReactNode[] = [];
  for (let f = 0; f < whole; f++) {
    const y = ground - (f + 1) * floorH;
    for (let c = 0; c < cols; c++) {
      const l = lit ? lit(f, c) : 0;
      const shade = fold ? (c % 2 === 0 ? 1 : 0.72) : 1;
      rects.push(
        <rect key={`${id}${f}-${c}`} x={x + c * colW + 2} y={y + 2.5} width={colW - 4} height={floorH - 4} fill={l > 0.02 ? (hue?.(f, c) ?? K.lit) : "#1b2430"} opacity={l > 0.02 ? 0.25 + 0.75 * l * shade : 0.9 * shade} />,
      );
    }
  }
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
      {blueprint > 0 ? (
        <g>
          <rect x={x} y={top} width={w} height={H} fill="none" stroke={K.steel} strokeWidth={3} strokeDasharray={`${perim * blueprint} ${perim}`} opacity={0.9} />
          {Array.from({ length: Math.floor(floors / 3) }).map((_, i) => (
            <line key={i} x1={x} x2={x + w * Math.min(1, blueprint * 1.4)} y1={ground - (i + 1) * 3 * floorH} y2={ground - (i + 1) * 3 * floorH} stroke={K.steel} strokeWidth={1.2} strokeDasharray="6 8" opacity={0.45 * blueprint} />
          ))}
        </g>
      ) : null}
      {whole > 0 ? <rect x={x} y={ground - whole * floorH} width={w} height={whole * floorH} fill={body} /> : null}
      {rects}
      {frac > 0 ? (
        // The floor going up: just the slab and the core.
        <g>
          <rect x={x + w * 0.32} y={ground - (whole + frac) * floorH} width={w * 0.36} height={frac * floorH} fill={K.theme} opacity={0.8} />
          <rect x={x} y={ground - whole * floorH - 3} width={w} height={3} fill={K.themeHi} opacity={0.7} />
        </g>
      ) : null}
    </svg>
  );
};

// 深圳能源大厦, stylised: north tower 41 floors, south tower 19 floors, a 6-floor podium joining them.
export const ENERGY = { north: 41, south: 19, podium: 6 };

export const EnergyTower: React.FC<{
  cx: number;
  ground: number;
  s?: number; // scale
  progress?: number; // 0..1 construction progress
  lit?: LitFn; // north tower floors are 0..40, south 100..118, podium 200..205
  hue?: (floor: number, col: number) => string | undefined;
  blueprint?: number;
  crane?: boolean;
}> = ({ cx, ground, s = 1, progress = 1, lit, hue, blueprint = 0, crane = true }) => {
  const fh = 14 * s;
  const nW = 250 * s;
  const sW = 200 * s;
  const pW = 560 * s;
  const left = cx - pW / 2;
  // Podium first, then both towers; the south one tops out earlier.
  const pod = Math.min(1, progress / 0.15) * ENERGY.podium;
  const towerP = Math.max(0, (progress - 0.1) / 0.9);
  const north = towerP * ENERGY.north;
  const south = Math.min(ENERGY.south, towerP * ENERGY.north * 1.1);
  const off = (k: number) => (lit ? (f: number, c: number) => lit(f + k, c) : undefined);
  const offH = (k: number) => (hue ? (f: number, c: number) => hue(f + k, c) : undefined);
  const nx = left + pW - nW;
  const building = progress > 0.001 && progress < 0.999;
  return (
    <>
      <Building id="pod" x={left + sW - 10 * s} ground={ground} w={pW - sW - nW + 20 * s} floors={ENERGY.podium} floorH={fh} cols={4} built={pod} lit={off(200)} hue={offH(200)} blueprint={blueprint} />
      <Building id="south" x={left} ground={ground} w={sW} floors={ENERGY.south} floorH={fh} cols={7} built={south} lit={off(100)} hue={offH(100)} blueprint={blueprint} fold />
      <Building id="north" x={nx} ground={ground} w={nW} floors={ENERGY.north} floorH={fh} cols={8} built={north} lit={off(0)} hue={offH(0)} blueprint={blueprint} fold />
      {crane && building && towerP > 0 ? <Crane x={nx + nW * 0.55} y={ground - north * fh} s={s} /> : null}
    </>
  );
};

// A tower crane riding the top of the building while it goes up.
export const Crane: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const frame = useBeatFrame();
  const swing = Math.sin(frame / 40) * 6;
  const mast = 150 * s;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
      <g transform={`translate(${x}, ${y})`} stroke={K.theme} strokeWidth={3 * s} fill="none">
        <line x1={0} y1={0} x2={0} y2={-mast} />
        <line x1={-8 * s} y1={0} x2={-8 * s} y2={-mast} />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1={-8 * s} y1={-i * (mast / 8)} x2={0} y2={-(i + 1) * (mast / 8)} strokeWidth={1.5 * s} />
        ))}
        <g transform={`rotate(${swing}, -4, ${-mast})`}>
          <line x1={-90 * s} y1={-mast} x2={230 * s} y2={-mast} />
          <line x1={-4 * s} y1={-mast - 30 * s} x2={230 * s} y2={-mast} strokeWidth={1.5 * s} />
          <line x1={-4 * s} y1={-mast - 30 * s} x2={-90 * s} y2={-mast} strokeWidth={1.5 * s} />
          <line x1={170 * s} y1={-mast} x2={170 * s} y2={-mast + 70 * s} strokeWidth={1.5 * s} />
          <rect x={160 * s} y={-mast + 70 * s} width={20 * s} height={10 * s} fill={K.theme} />
          <rect x={-90 * s} y={-mast} width={30 * s} height={16 * s} fill={K.theme} />
        </g>
      </g>
    </svg>
  );
};

// ---------- A night skyline ----------

export type SkyTower = { x: number; w: number; h: number; cols: number; floorH: number };

export const makeSkyline = (seed: string, n: number, x0: number, x1: number, minH: number, maxH: number): SkyTower[] => {
  const out: SkyTower[] = [];
  let x = x0;
  for (let i = 0; i < n && x < x1; i++) {
    const w = 60 + random(`${seed}w${i}`) * 90;
    const h = minH + random(`${seed}h${i}`) ** 1.6 * (maxH - minH);
    out.push({ x, w, h, cols: Math.max(3, Math.round(w / 18)), floorH: 12 });
    x += w + 6 + random(`${seed}g${i}`) * 26;
  }
  return out;
};

// Every window twinkles slowly; `flash` (0..1) lights them all at once.
export const Skyline: React.FC<{ towers: SkyTower[]; ground: number; seed: string; litFrac?: number; flash?: number; opacity?: number; color?: string }> = ({
  towers,
  ground,
  seed,
  litFrac = 0.55,
  flash = 0,
  opacity = 1,
  color = "#0c1117",
}) => {
  const frame = useBeatFrame();
  const rects: React.ReactNode[] = [];
  towers.forEach((t, i) => {
    rects.push(<rect key={`b${i}`} x={t.x} y={ground - t.h} width={t.w} height={t.h} fill={color} />);
    const floors = Math.floor(t.h / t.floorH) - 1;
    const cw = t.w / t.cols;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < t.cols; c++) {
        const r = random(`${seed}${i}-${f}-${c}`);
        const tw = 0.5 + 0.5 * Math.sin(frame / 50 + r * 40);
        const on = r < litFrac ? 0.35 + 0.45 * tw : 0;
        const l = Math.max(on, flash);
        if (l < 0.03) continue;
        rects.push(<rect key={`${i}-${f}-${c}`} x={t.x + c * cw + 2} y={ground - (f + 1) * t.floorH + 2} width={cw - 4} height={t.floorH - 5} fill={K.lit} opacity={l * 0.85} />);
      }
    }
  });
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, opacity }} width={1920} height={1080}>
      {rects}
    </svg>
  );
};

export const Ground: React.FC<{ y: number; opacity?: number }> = ({ y, opacity = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 2, background: `linear-gradient(90deg, transparent, ${K.line} 15%, ${K.line} 85%, transparent)`, opacity }} />
);

// ---------- Clock: a dial whose arc fills to `value / max` ----------

export const Dial: React.FC<{
  cx: number;
  cy: number;
  r: number;
  value: number; // current reading
  max: number;
  used?: number; // part of the dial already gone (drawn dim)
  color: string;
  track?: string;
}> = ({ cx, cy, r, value, max, used = 0, color, track = "rgba(244,240,232,0.10)" }) => {
  const C = 2 * Math.PI * r;
  const usedL = (used / max) * C;
  const valL = (Math.min(value, max) / max) * C;
  const ticks = Array.from({ length: max / 5 + 1 }).map((_, i) => {
    const a = (i / (max / 5)) * Math.PI * 2 - Math.PI / 2;
    return <line key={i} x1={cx + Math.cos(a) * (r + 18)} y1={cy + Math.sin(a) * (r + 18)} x2={cx + Math.cos(a) * (r + 30)} y2={cy + Math.sin(a) * (r + 30)} stroke={K.muted} strokeWidth={i % 2 === 0 ? 3 : 1.5} opacity={0.6} />;
  });
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
      {ticks}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={22} />
      {used > 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={K.dim} strokeWidth={22} strokeDasharray={`${usedL} ${C}`} transform={`rotate(-90 ${cx} ${cy})`} />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={`${valL} ${C}`}
        strokeDashoffset={-usedL}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
};

// ---------- Small helpers ----------

export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; w?: number; align?: "left" | "center" | "right"; style?: React.CSSProperties }> = ({
  x,
  y,
  children,
  size = 34,
  color = K.fg,
  w = 700,
  align = "center",
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: align === "center" ? "translate(-50%, -50%)" : align === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: w,
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// Grows 0 → 1 with an ease, from beat `at` over `dur` beats.
export const useGrow = (at: number, dur = 1) => progAt(useBeatFrame(), at, dur, EO);

export const fade = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], CL);
