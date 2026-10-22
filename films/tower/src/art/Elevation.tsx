import React from "react";
import { K } from "../theme";
import { floorBase, FOLD, ripple, TowerId, TOWERS, TowerSpec } from "./mansion";

// East elevation of 深圳能源大厦 (looking west from 金田路: north tower on the right). Plan depths are the OSM
// footprints' north–south extents (ways 776897366, 776897367, 776897365), rounded to the metre.
export const ELEV = { sW: 53, gap: 32, nW: 56 };

export type Look = "dusk" | "night" | "plan";

export type ElevationProps = {
  x: number; // px, south edge of the podium
  ground: number; // px
  s: number; // px per metre
  built?: Partial<Record<TowerId, number>>; // floors of structure in place (fractional = rising)
  look?: Look;
  lit?: (t: TowerId, f: number, i: number) => number; // night: 0 dark … 1 lit
  tint?: (t: TowerId, f: number) => string | undefined; // highlight whole floors
  tintAmt?: number;
  crane?: boolean;
  dim?: number; // 0..1 fades the skin toward the background
  labels?: boolean;
};

const PAL = {
  dusk: { panel: "#d9d6cf", glass: "#26323f", glassHi: "#3a4b5e", slab: "#f4f0e8" },
  night: { panel: "#1c232c", glass: "#0d131a", glassHi: "#ffe7b0", slab: "#2a323c" },
  plan: { panel: "rgba(127,155,191,0.10)", glass: "rgba(127,155,191,0.0)", glassHi: "rgba(127,155,191,0.5)", slab: "rgba(127,155,191,0.75)" },
};

// Rectangles as one path: [x, y, w, h][].
const rects = (rs: number[][]) => rs.map(([x, y, w, h]) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`).join("");

const towerX = (id: TowerId) => (id === "S" ? 0 : ELEV.sW + ELEV.gap);
const towerW = (id: TowerId) => (id === "S" ? ELEV.sW : ELEV.nW);

export const Elevation: React.FC<ElevationProps> = ({ x, ground, s, built, look = "dusk", lit, tint, tintAmt = 1, crane = false, dim = 0, labels = false }) => {
  const pal = PAL[look];
  const X = (m: number) => x + m * s;
  const Y = (h: number) => ground - h * s;
  const glass: number[][] = [];
  const glassLit: number[][] = [];
  const glassMid: number[][] = [];
  const panels: number[][] = [];
  const slabs: number[][] = [];
  const tints: { r: number[]; c: string }[] = [];
  const structure: number[][] = [];
  let craneAt: { x: number; y: number } | null = null;

  const drawTower = (t: TowerSpec) => {
    const b = Math.min(t.floors, built?.[t.id] ?? t.floors);
    if (b <= 0) return;
    const x0 = towerX(t.id);
    const w = towerW(t.id);
    const bays = Math.floor(w / FOLD);
    const bw = w / bays;
    const skinTop = look === "plan" || b >= t.floors ? b : Math.max(0, b - 3); // while rising, the curtain wall trails the structure
    const full = Math.floor(b);
    for (let f = 1; f <= full + 1 && f <= t.floors; f++) {
      const y0 = floorBase(t, f);
      const y1 = f === t.floors ? t.height - t.crown : floorBase(t, f + 1);
      const frac = f <= full ? 1 : b - full;
      if (frac <= 0) break;
      const top = y0 + (y1 - y0) * frac;
      if (f <= skinTop) {
        panels.push([X(x0), Y(y1), w * s, (y1 - y0) * s]);
        for (let i = 0; i < bays; i++) {
          const g = ripple(i, f, t.id === "N" ? 0 : 1);
          const gx = X(x0 + i * bw + bw * (1 - g) * 0.5);
          const r = [gx, Y(y1) + 0.18 * (y1 - y0) * s, g * bw * s, 0.7 * (y1 - y0) * s];
          const l = lit ? lit(t.id, f, i) : 0;
          if (l > 0.66) glassLit.push(r);
          else if (l > 0.33) glassMid.push(r);
          else glass.push(r);
        }
        const c = tint?.(t.id, f);
        if (c) tints.push({ r: [X(x0), Y(y1), w * s, (y1 - y0) * s], c });
      } else {
        // bare structure: core and slab edge
        structure.push([X(x0 + w * 0.3), Y(top), w * 0.4 * s, (top - y0) * s]);
      }
      slabs.push([X(x0), Y(top) - 0.6, w * s, 1.4]);
      if (f === full + 1 || (f === full && full === b)) craneAt = { x: X(x0 + w * 0.5), y: Y(top) };
    }
    if (b >= t.floors && look !== "plan") {
      // crown: a plain parapet band
      panels.push([X(x0), Y(t.height), w * s, t.crown * s]);
    }
  };

  // Podium spans both towers.
  const podW = ELEV.sW + ELEV.gap + ELEV.nW;
  const podiumUp = Math.min(TOWERS.S.podium, built?.S ?? 99, built?.N ?? 99);
  if (podiumUp > 0) {
    const h = floorBase(TOWERS.S, Math.floor(podiumUp) + 1) || TOWERS.S.podiumH * (podiumUp / TOWERS.S.podium);
    panels.push([X(0), Y(h), podW * s, h * s]);
    const bays = Math.floor(ELEV.gap / FOLD);
    for (let f = 1; f <= Math.floor(podiumUp); f++) {
      const y0 = floorBase(TOWERS.S, f);
      const y1 = floorBase(TOWERS.S, f + 1);
      for (let i = 0; i < bays; i++) {
        const g = ripple(i + 40, f, 2) * 0.9;
        glass.push([X(ELEV.sW + i * (ELEV.gap / bays) + (ELEV.gap / bays) * (1 - g) * 0.5), Y(y1) + 0.2 * (y1 - y0) * s, g * (ELEV.gap / bays) * s, 0.65 * (y1 - y0) * s]);
      }
    }
  }
  drawTower(TOWERS.S);
  drawTower(TOWERS.N);

  const fade = 1 - dim;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={rects(panels)} fill={pal.panel} opacity={fade} />
      <path d={rects(glass)} fill={pal.glass} opacity={fade} />
      <path d={rects(glassMid)} fill={pal.glassHi} opacity={0.45 * fade} />
      <path d={rects(glassLit)} fill={pal.glassHi} opacity={0.92 * fade} />
      {tints.map((t, i) => (
        <rect key={i} x={t.r[0]} y={t.r[1]} width={t.r[2]} height={t.r[3]} fill={t.c} opacity={0.55 * tintAmt} />
      ))}
      <path d={rects(structure)} fill="none" stroke={K.theme} strokeWidth={2} opacity={0.9} />
      <path d={rects(slabs)} fill={look === "plan" ? pal.slab : K.theme} opacity={look === "plan" ? 0.8 : 0.35} />
      {crane && craneAt ? <Crane x={(craneAt as { x: number; y: number }).x} y={(craneAt as { x: number; y: number }).y} s={s} /> : null}
      {labels ? null : null}
    </svg>
  );
};

// Tower crane on top of the rising structure (theme orange).
const Crane: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => {
  const mast = 26 * s;
  const jib = 44 * s;
  return (
    <g stroke={K.theme} strokeWidth={2.2} fill="none">
      <line x1={x} y1={y} x2={x} y2={y - mast} />
      <line x1={x - jib * 0.3} y1={y - mast} x2={x + jib} y2={y - mast} />
      <line x1={x} y1={y - mast - 6 * s} x2={x + jib * 0.8} y2={y - mast} />
      <line x1={x} y1={y - mast - 6 * s} x2={x - jib * 0.3} y2={y - mast} />
      <line x1={x + jib * 0.62} y1={y - mast} x2={x + jib * 0.62} y2={y - mast * 0.45} strokeWidth={1.2} />
      <rect x={x - jib * 0.3} y={y - mast} width={7 * s} height={4 * s} fill={K.theme} />
    </g>
  );
};
