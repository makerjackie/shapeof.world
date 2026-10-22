import { geoAlbersUsa, geoNaturalEarth1, geoPath, GeoProjection } from "d3-geo";
import React from "react";
import { feature } from "topojson-client";
import usTopo from "us-atlas/states-10m.json";
import worldTopo from "world-atlas/countries-50m.json";
import { K } from "./theme";

// Real borders: Natural Earth 1:50m countries (world-atlas, ISC; data public domain) and US Census states
// (us-atlas, ISC). Paths are computed once per module; labels are HTML placed with the projection.

type Feat = { id?: string | number; properties: { name?: string }; geometry: unknown };

const world = feature(worldTopo as never, (worldTopo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: Feat[] };
const states = feature(usTopo as never, (usTopo as never as { objects: { states: never } }).objects.states) as unknown as { features: Feat[] };

export const WORLD_PROJ: GeoProjection = geoNaturalEarth1()
  .rotate([-12, 0])
  .fitExtent(
    [
      [70, 250],
      [1850, 1000],
    ],
    { type: "MultiPoint", coordinates: [[-128, -30], [-128, 66], [148, 66], [148, -30], [12, 70], [12, -36]] } as never,
  );

const worldPath = geoPath(WORLD_PROJ);
const WORLD_D = world.features.map((f) => ({ id: String(f.id ?? ""), name: f.properties.name ?? "", d: worldPath(f as never) ?? "" }));

export const proj = (lon: number, lat: number): [number, number] => WORLD_PROJ([lon, lat]) as [number, number];

export const WorldMap: React.FC<{ fills?: Record<string, string>; strokes?: Record<string, string>; opacity?: number; base?: string }> = ({ fills = {}, strokes = {}, opacity = 1, base = "#1a2028" }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity }}>
    {WORLD_D.map((c, i) => (
      <path key={i} d={c.d} fill={fills[c.id] ?? base} stroke={strokes[c.id] ?? "#07090b"} strokeWidth={strokes[c.id] ? 2.5 : 0.8} />
    ))}
  </svg>
);

// ISO 3166-1 numeric ids used in the film.
export const ISO = { us: "840", cn: "156", tw: "158", kr: "410", nl: "528", jp: "392" };

// A curved flow line between two lon/lat points, drawn up to `p` (0–1), with an arrow head at the end.
export const Arc: React.FC<{ from: [number, number]; to: [number, number]; color: string; p: number; lift?: number; width?: number }> = ({ from, to, color, p, lift = 0.25, width = 4 }) => {
  if (p <= 0) return null;
  const [x0, y0] = proj(...from);
  const [x1, y1] = proj(...to);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * lift;
  const N = 40;
  const pts: [number, number][] = [];
  for (let i = 0; i <= Math.round(N * p); i++) {
    const t = i / N;
    pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1]);
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [ex, ey] = pts[pts.length - 1];
  const [px, py] = pts[Math.max(0, pts.length - 2)];
  const a = Math.atan2(ey - py, ex - px);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={width * 3.5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="2 10" />
      <path d={d} fill="none" stroke={color} strokeWidth={width * 0.6} strokeLinecap="round" />
      {p > 0.15 ? (
        <path d={`M${ex},${ey} L${ex - 18 * Math.cos(a - 0.45)},${ey - 18 * Math.sin(a - 0.45)} L${ex - 18 * Math.cos(a + 0.45)},${ey - 18 * Math.sin(a + 0.45)} Z`} fill={color} />
      ) : null}
    </svg>
  );
};

// ── United States, Albers ──
export const US_PROJ: GeoProjection = geoAlbersUsa().fitExtent(
  [
    [80, 300],
    [1180, 960],
  ],
  states as never,
);
const usPath = geoPath(US_PROJ);
const US_D = states.features.map((f) => ({ id: String(f.id ?? ""), name: f.properties.name ?? "", d: usPath(f as never) ?? "" }));
export const usProj = (lon: number, lat: number): [number, number] => (US_PROJ([lon, lat]) ?? [0, 0]) as [number, number];

// PJM serves all or parts of 13 states and DC; shaded here: the states it covers wholly or mostly.
export const PJM_STATES = ["42", "34", "24", "10", "11", "51", "54", "39"];

export const UsMap: React.FC<{ fills?: Record<string, string>; opacity?: number }> = ({ fills = {}, opacity = 1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity }}>
    {US_D.map((s, i) => (
      <path key={i} d={s.d} fill={fills[s.id] ?? "#1a2028"} stroke="#07090b" strokeWidth={1.2} />
    ))}
  </svg>
);

export const MAP_BASE = "#1a2028";
export const MAP_LIT = (c: string) => `${c}55`;
export { K as MAP_K };
