import React from "react";
import { random } from "remotion";
import { floorBase, FOLD, ripple, TOWERS, TowerSpec } from "../art/mansion";
import { K } from "../theme";
import { project, Proj, viewDir } from "./cam";
import { CITY } from "./data";
import type { Layers } from "./MapView";

// 深圳能源大厦 in the 3D map: OSM footprints of the two towers and the podium, extruded to the designer's heights,
// with the folded skin drawn floor by floor on the walls that face the camera.

export type Drawn = { depth: number; el: React.ReactNode; hero?: boolean };

const f1 = (v: number) => v.toFixed(1);

const quad = (p: Proj, ax: number, ay: number, bx: number, by: number, u0: number, u1: number, z0: number, z1: number) => {
  const x0 = ax + (bx - ax) * u0;
  const y0 = ay + (by - ay) * u0;
  const x1 = ax + (bx - ax) * u1;
  const y1 = ay + (by - ay) * u1;
  const a = project(p, x0, y0, z0);
  const b = project(p, x1, y1, z0);
  const c = project(p, x1, y1, z1);
  const d = project(p, x0, y0, z1);
  return `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}L${f1(d[0])} ${f1(d[1])}Z`;
};

const PAL = {
  dusk: { wall: ["#b9b6af", "#cfccc5", "#e2ded6"], glass: "#24303c", lit: K.lit, roof: "#d9d5cd" },
  night: { wall: ["#151b23", "#1b222b", "#222a34"], glass: "#0b1016", lit: K.lit, roof: "#262e38" },
};

const tower = (p: Proj, L: Layers, ring: number[], t: TowerSpec | null, key: string): Drawn | null => {
  if (!ring?.length) return null;
  const look = L.heroLook ?? "dusk";
  const pal = PAL[look];
  const built = L.heroBuilt ?? 1;
  const night = L.night ?? 0;
  const spec = t ?? { ...TOWERS.S, id: "S" as const, floors: 6, podium: 6, height: 34.5, crown: 0 };
  const floorsUp = t ? spec.floors * built : Math.min(6, TOWERS.S.floors * built * 3);
  const topH = t ? (built >= 1 ? spec.height : floorBase(spec, Math.floor(floorsUp) + 1)) : spec.podiumH * Math.min(1, built * 3);
  if (topH <= 0.5) return null;
  const [vx, vy] = viewDir(p);
  const n = ring.length / 2;
  const walls = ["", "", ""];
  let glass = "";
  let lit = "";
  let mid = "";
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += ring[2 * i] / n;
    cy += ring[2 * i + 1] / n;
  }
  for (let i = 0; i < n; i++) {
    const ax = ring[2 * i];
    const ay = ring[2 * i + 1];
    const bx = ring[(2 * i + 2) % ring.length];
    const by = ring[(2 * i + 3) % ring.length];
    const nx = by - ay;
    const ny = -(bx - ax);
    const len = Math.hypot(nx, ny);
    if (len < 1 || (nx * vx + ny * vy) / len >= 0) continue;
    const lightness = (nx / len) * 0.6 + (ny / len) * -0.8;
    const shade = lightness > 0.2 ? 2 : lightness > -0.4 ? 1 : 0;
    walls[shade] += quad(p, ax, ay, bx, by, 0, 1, 0, topH);
    const bays = Math.max(2, Math.round(len / FOLD));
    const floors = t ? Math.floor(floorsUp) : 6;
    for (let f = 1; f <= floors; f++) {
      const z0 = floorBase(spec, f);
      const z1 = f === spec.floors ? spec.height - spec.crown : floorBase(spec, f + 1);
      if (z1 > topH + 0.1) break;
      const fh = z1 - z0;
      for (let k = 0; k < bays; k++) {
        const g = ripple(k + i * 7, f, key === "N" ? 0 : 1);
        const u0 = (k + (1 - g) / 2) / bays;
        const u1 = (k + (1 + g) / 2) / bays;
        const qd = quad(p, ax, ay, bx, by, u0, u1, z0 + 0.18 * fh, z0 + 0.88 * fh);
        const r = random(`hw${key}${i}-${f}-${k}`);
        if (night > 0 && r < night * 0.85) {
          if (r < night * 0.6) lit += qd;
          else mid += qd;
        } else glass += qd;
      }
    }
  }
  const roof = (() => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const [sx, sy] = project(p, ring[2 * i], ring[2 * i + 1], topH);
      d += `${i ? "L" : "M"}${f1(sx)} ${f1(sy)}`;
    }
    return d + "Z";
  })();
  const [, , depth] = project(p, cx, cy);
  return {
    depth,
    hero: true,
    el: (
      <g key={key} opacity={L.hero ?? 1}>
        {walls.map((d, k) => (d ? <path key={k} d={d} fill={pal.wall[k]} stroke={look === "night" ? K.theme : "none"} strokeWidth={1.6} strokeOpacity={0.9} /> : null))}
        <path d={glass} fill={pal.glass} />
        <path d={mid} fill={pal.lit} opacity={0.45} />
        <path d={lit} fill={pal.lit} opacity={0.95} />
        <path d={roof} fill={pal.roof} stroke={K.theme} strokeWidth={1.4} strokeOpacity={0.9} />
      </g>
    ),
  };
};

export const heroFaces = (p: Proj, L: Layers): Drawn[] => {
  const h = CITY.hero;
  return [tower(p, L, h.podium, null, "P"), tower(p, L, h.S, TOWERS.S, "S"), tower(p, L, h.N, TOWERS.N, "N")].filter(Boolean) as Drawn[];
};
