import { geoAlbers, geoConicEqualArea, geoMercator, geoPath, GeoProjection } from "d3-geo";
import React from "react";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-50m.json";
import { FONT } from "../theme";
import { C } from "./kit";

// v2 drawings: flat, clean 2D objects that live in the dark look. Labels are HTML on top of SVG (no centred SVG text).

// ── Country silhouettes (Natural Earth 1:50m via world-atlas). The US keeps only the lower 48. ──
type Geom = { type: string; coordinates: number[][][][] | number[][][] };
type Feat = { id?: string | number; type: string; properties: object; geometry: Geom };
const world = feature(worldTopo as never, (worldTopo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: Feat[] };

const lower48 = (f: Feat): Feat => {
  if (f.geometry.type !== "MultiPolygon") return f;
  const polys = (f.geometry.coordinates as number[][][][]).filter((p) => {
    const [lon, lat] = p[0][0];
    return lon > -126 && lon < -65 && lat > 24 && lat < 50;
  });
  return { ...f, geometry: { type: "MultiPolygon", coordinates: polys } };
};

const PROJ: Record<string, () => GeoProjection> = {
  "840": () => geoAlbers(),
  "156": () => geoConicEqualArea().parallels([25, 47]).rotate([-105, 0]),
  "392": () => geoMercator(),
};
const shapeCache = new Map<string, string>();
const shapeD = (id: string, w: number, h: number) => {
  const key = `${id}-${w}-${h}`;
  const hit = shapeCache.get(key);
  if (hit !== undefined) return hit;
  let f = world.features.find((x) => String(x.id) === id)!;
  if (id === "840") f = lower48(f);
  const p = (PROJ[id] ?? geoMercator)().fitExtent(
    [
      [4, 4],
      [w - 4, h - 4],
    ],
    f as never,
  );
  const d = geoPath(p)(f as never) ?? "";
  shapeCache.set(key, d);
  return d;
};

export const Silhouette: React.FC<{ id: string; w: number; h: number; fill: string; stroke?: string; strokeWidth?: number; clipId?: string; level?: number; levelColor?: string }> = ({
  id,
  w,
  h,
  fill,
  stroke = "rgba(244,240,232,0.35)",
  strokeWidth = 2,
  clipId,
  level = 0,
  levelColor = C.gold,
}) => {
  const d = shapeD(id, w, h);
  const cid = clipId ?? `sil-${id}-${w}`;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <clipPath id={cid}>
          <path d={d} />
        </clipPath>
        <linearGradient id={`${cid}-lv`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={levelColor} stopOpacity="0.95" />
          <stop offset="1" stopColor={levelColor} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d={d} fill={fill} />
      {level > 0 ? <rect x={0} y={h * (1 - level)} width={w} height={h * level} fill={`url(#${cid}-lv)`} clipPath={`url(#${cid})`} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
};

// ── A data hall: a glass box of server racks. `lit` (0–1) lights the rack rows from the bottom up; LEDs blink slowly. ──
export const DataHall: React.FC<{ w: number; h: number; n?: number; lit: number; t: number; label?: boolean; color?: string; title?: string }> = ({ w, h, n = 8, lit, t, label = true, color = C.cyan, title = "AI 数据中心" }) => {
  const top = label ? 64 : 22;
  const pad = 26;
  const gap = 18;
  const rw = (w - pad * 2 - gap * (n - 1)) / n;
  const rh = h - top - 30;
  const rows = Math.max(4, Math.round(rh / 34));
  const uh = (rh - 20) / rows;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", left: -60, right: -60, top: 20, bottom: -50, background: `radial-gradient(ellipse at 50% 70%, ${color}${Math.round(lit * 70).toString(16).padStart(2, "0")} 0%, transparent 65%)` }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          border: `1px solid ${C.glassLine}`,
          boxShadow: "0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      />
      {label ? (
        <div style={{ position: "absolute", left: 26, top: 16, fontFamily: FONT, fontSize: 28, fontWeight: 900, color: C.fg, letterSpacing: 2, whiteSpace: "nowrap" }}>
          {title} <span style={{ color, fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>● {lit > 0.05 ? "运行中" : "待机"}</span>
        </div>
      ) : null}
      {Array.from({ length: n }).map((_, r) => (
        <div key={r} style={{ position: "absolute", left: pad + r * (rw + gap), top, width: rw, height: rh, borderRadius: 10, background: "linear-gradient(180deg, #232a35, #151a21)", border: "1px solid #303948" }}>
          {Array.from({ length: rows }).map((__, u) => {
            const on = (rows - u) / rows <= lit + 0.001;
            return (
              <div key={u} style={{ position: "absolute", left: 8, right: 8, top: 10 + u * uh, height: uh - 6, borderRadius: 4, background: on ? "#1d2833" : "#1a1f27", display: "flex", alignItems: "center", gap: 5, paddingLeft: 6 }}>
                {[0, 1, 2].map((k) => {
                  const blink = Math.sin(t * 2.2 + r * 1.9 + u * 0.7 + k * 2.1) > -0.4;
                  const c = k === 2 ? color : C.green;
                  return <div key={k} style={{ width: 6, height: 6, borderRadius: 3, background: on && blink ? c : "#323a46", boxShadow: on && blink ? `0 0 6px ${c}` : undefined }} />;
                })}
                <div style={{ flex: 1 }} />
                <div style={{ width: rw * 0.3, height: 3, marginRight: 8, borderRadius: 2, background: on ? `${color}66` : "#2a313c" }} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── A person: head and shoulders, feet at the bottom of the box. ──
export const Person: React.FC<{ h: number; color?: string; head?: string; phone?: number; cap?: number; tool?: number }> = ({ h, color = "#56606e", head, phone = 0, cap = 0, tool = 0 }) => {
  const w = h * 0.5;
  return (
    <svg width={w} height={h} viewBox="0 0 50 100" style={{ overflow: "visible", display: "block" }}>
      <circle cx="25" cy="20" r="14" fill={head ?? color} />
      <path d="M4,100 L4,58 Q4,40 25,40 Q46,40 46,58 L46,100 Z" fill={color} />
      {cap > 0 ? (
        <g opacity={cap}>
          <path d="M5,9 L25,1 L45,9 L25,17 Z" fill={C.fg} />
          <rect x="15" y="10" width="20" height="7" fill={C.fg} />
          <path d="M43,9 L43,20" stroke={C.gold} strokeWidth="2" />
        </g>
      ) : null}
      {phone > 0 ? (
        <g>
          <circle cx="36" cy="54" r={16} fill={C.cyan} opacity={0.28 * phone} />
          <rect x="31" y="46" width="10" height="16" rx="2" fill={C.cyan} opacity={phone} />
        </g>
      ) : null}
      {tool > 0 ? <rect x="34" y="52" width="26" height="12" rx="3" fill={C.cyan} opacity={tool} /> : null}
    </svg>
  );
};

// ── A doorway with warm light: width w, height h. `light` 0–1. Floor spill below. ──
export const Door: React.FC<{ w: number; h: number; light: number; color?: string; frame?: string }> = ({ w, h, light, color = C.gold, frame = "#3a4250" }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    <div style={{ position: "absolute", left: -14, top: -14, width: w + 28, height: h + 14, borderRadius: "10px 10px 0 0", background: frame }} />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, ${color}${Math.round(150 * light).toString(16).padStart(2, "0")}, ${color}${Math.round(255 * light).toString(16).padStart(2, "0")})`,
        boxShadow: `0 0 ${80 * light}px ${color}${Math.round(110 * light).toString(16).padStart(2, "0")}`,
      }}
    />
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={`M0,0 L${Math.min(70, w * 0.24)},${h * 0.05} L${Math.min(70, w * 0.24)},${h * 0.95} L0,${h} Z`} fill="#262c35" />
      <circle cx={Math.min(70, w * 0.24) - 12} cy={h * 0.52} r={4} fill={color} opacity={0.8} />
    </svg>
    <div
      style={{
        position: "absolute",
        left: -w * 0.5,
        width: w * 2,
        top: h,
        height: h * 0.35,
        background: `linear-gradient(180deg, ${color}${Math.round(90 * light).toString(16).padStart(2, "0")}, transparent)`,
        clipPath: "polygon(25% 0, 75% 0, 100% 100%, 0 100%)",
      }}
    />
  </div>
);

// ── A laptop icon (for the coders) ──
export const Laptop: React.FC<{ w: number; color?: string; screen?: string }> = ({ w, color = "#56606e", screen = C.cyan }) => (
  <svg width={w} height={w * 0.7} viewBox="0 0 100 70" style={{ display: "block", overflow: "visible" }}>
    <rect x="14" y="4" width="72" height="48" rx="5" fill={color} />
    <rect x="19" y="9" width="62" height="38" rx="2" fill="#0e1218" />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={24 + (i % 2) * 6} y={15 + i * 8} width={[30, 40, 22, 34][i]} height="3.5" rx="1.5" fill={screen} opacity={0.75} />
    ))}
    <path d="M4,56 L96,56 L90,66 L10,66 Z" fill={color} />
  </svg>
);

// ── An envelope (a tiny task) ──
export const Mail: React.FC<{ w: number; color?: string }> = ({ w, color = C.fg }) => (
  <svg width={w} height={w * 0.7} viewBox="0 0 100 70" style={{ display: "block" }}>
    <rect x="3" y="3" width="94" height="64" rx="8" fill="none" stroke={color} strokeWidth="6" />
    <path d="M8,10 L50,40 L92,10" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" />
  </svg>
);

// ── A GPU chip ──
export const Chip: React.FC<{ w: number; color?: string }> = ({ w, color = C.cyan }) => (
  <svg width={w} height={w} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
    {[22, 40, 58, 76].map((p) => (
      <g key={p}>
        <rect x={p - 3} y="2" width="6" height="14" rx="2" fill={color} opacity="0.7" />
        <rect x={p - 3} y="84" width="6" height="14" rx="2" fill={color} opacity="0.7" />
        <rect x="2" y={p - 3} width="14" height="6" rx="2" fill={color} opacity="0.7" />
        <rect x="84" y={p - 3} width="14" height="6" rx="2" fill={color} opacity="0.7" />
      </g>
    ))}
    <rect x="14" y="14" width="72" height="72" rx="10" fill="#1b222c" stroke={color} strokeWidth="4" />
    <rect x="32" y="32" width="36" height="36" rx="5" fill={color} opacity="0.85" />
  </svg>
);
