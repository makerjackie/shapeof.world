import React from "react";
import { random } from "remotion";
import { FONT, K } from "../theme";
import { Cam, H, makeProj, project, Proj, viewDir, W } from "./cam";
import { Bldg, CITY, Line, Poly, WORLD } from "./data";
import { Drawn, heroFaces } from "./hero";

// One continuous map of the real city: Pearl River Delta → Shenzhen districts → Futian CBD streets, metro and
// extruded OSM buildings → the parcel and the tower. Every layer is projected per frame through the same camera,
// so a zoom from the delta down to one building is a single camera move.

export type Label = {
  text: string;
  x: number;
  y: number;
  h?: number;
  kind?: "city" | "district" | "road" | "poi" | "station" | "note";
  zMin?: number; // visible between these zoom levels (px per metre), with a soft fade
  zMax?: number;
  angle?: number; // degrees on screen; roads follow their own direction when `along` is given
  along?: string;
  color?: string;
  size?: number;
  o?: number;
  dot?: boolean;
};

export type Layers = {
  prd?: number; // the delta's land
  szTint?: { color: string; a: number }; // all of Shenzhen
  sz?: number;
  szFill?: Record<string, { color: string; a: number }>;
  roads?: number;
  metro?: number;
  metroFlow?: number; // px of dash travel: trains running
  bldg?: number;
  bldgH?: number; // 0..1 heights rise
  night?: number; // 0..1 windows lit
  lit?: (b: Bldg, i: number) => number | undefined; // per-building override of night light (0..1)
  bldgTint?: (b: Bldg, i: number) => string | undefined;
  hero?: number;
  heroBuilt?: number; // 0..1 of the floors (construction)
  heroLook?: "dusk" | "night";
  parcel?: number;
};

const ringPath = (p: Proj, r: number[], h = 0) => {
  let d = "";
  for (let i = 0; i < r.length; i += 2) {
    const [sx, sy] = project(p, r[i], r[i + 1], h);
    d += `${i ? "L" : "M"}${sx.toFixed(1)} ${sy.toFixed(1)}`;
  }
  return d + "Z";
};

const linePath = (p: Proj, r: number[]) => {
  let d = "";
  for (let i = 0; i < r.length; i += 2) {
    const [sx, sy] = project(p, r[i], r[i + 1]);
    d += `${i ? "L" : "M"}${sx.toFixed(1)} ${sy.toFixed(1)}`;
  }
  return d;
};

// Is a world bbox [x0, y0, x1, y1] possibly on screen?
const onScreen = (p: Proj, b: number[], h = 0, pad = 80) => {
  const pts = [project(p, b[0], b[1]), project(p, b[2], b[1]), project(p, b[0], b[3]), project(p, b[2], b[3])];
  if (h) pts.push(project(p, b[0], b[1], h), project(p, b[2], b[3], h));
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return Math.max(...xs) > -pad && Math.min(...xs) < W + pad && Math.max(...ys) > -pad && Math.min(...ys) < H + pad;
};

const zFade = (z: number, lo?: number, hi?: number) => {
  let o = 1;
  if (lo !== undefined) o = Math.min(o, Math.max(0, (Math.log(z) - Math.log(lo)) / 0.35 + 1));
  if (hi !== undefined) o = Math.min(o, Math.max(0, (Math.log(hi) - Math.log(z)) / 0.35 + 1));
  return Math.min(1, o);
};

const polys = (p: Proj, list: Poly[]) => list.filter((q) => onScreen(p, q.bbox)).map((q) => ({ q, d: q.rings.map((r) => ringPath(p, r)).join("") }));

// ---------- Extruded buildings ----------

const SHADES_DUSK = ["#1a222d", "#222c39", "#2b3747"];
const SHADES_NIGHT = ["#0c1117", "#10161e", "#151d27"];

const drawBuildings = (p: Proj, list: Bldg[], L: Layers, key: string): Drawn[] => {
  const hs = L.bldgH ?? 1;
  const night = L.night ?? 0;
  const [vx, vy] = viewDir(p);
  const out: Drawn[] = [];
  const tilted = p.st > 0.05;
  list.forEach((b, bi) => {
    const h = b.h * hs;
    if (!onScreen(p, b.bbox, h)) return;
    const r = b.ring;
    const n = r.length / 2;
    const tint = L.bldgTint?.(b, bi);
    const walls: string[] = ["", "", ""];
    let win = "";
    if (tilted && h > 0.5) {
      for (let i = 0; i < n; i++) {
        const ax = r[2 * i];
        const ay = r[2 * i + 1];
        const bx = r[(2 * i + 2) % r.length];
        const by = r[(2 * i + 3) % r.length];
        const nx = by - ay;
        const ny = -(bx - ax);
        const len = Math.hypot(nx, ny);
        if (len < 0.5) continue;
        const facing = (nx * vx + ny * vy) / len;
        if (facing >= 0) continue; // faces away
        const [x1, y1] = project(p, ax, ay);
        const [x2, y2] = project(p, bx, by);
        const [x3, y3] = project(p, bx, by, h);
        const [x4, y4] = project(p, ax, ay, h);
        const shade = (nx / len) * 0.6 + (ny / len) * -0.8 > 0.2 ? 2 : (nx / len) * 0.6 + (ny / len) * -0.8 > -0.4 ? 1 : 0;
        walls[shade] += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}L${x4.toFixed(1)} ${y4.toFixed(1)}Z`;
        if (night > 0 && b.h > 25 && len > 6) {
          for (let z = 3; z < h - 2; z += 4.2) {
            const [a1, a2] = project(p, ax + (bx - ax) * 0.06, ay + (by - ay) * 0.06, z);
            const [b1, b2] = project(p, ax + (bx - ax) * 0.94, ay + (by - ay) * 0.94, z);
            win += `M${a1.toFixed(1)} ${a2.toFixed(1)}L${b1.toFixed(1)} ${b2.toFixed(1)}`;
          }
        }
      }
    }
    const roof = ringPath(p, r, h);
    const sh = night > 0.5 ? SHADES_NIGHT : SHADES_DUSK;
    const litOverride = L.lit?.(b, bi);
    const litAmt = litOverride ?? night * (0.35 + 0.65 * random(`lit${key}${bi}`));
    const winW = Math.max(1.1, Math.min(3.2, p.cam.z * 3));
    const [, , depth] = project(p, b.cx, b.cy);
    out.push({
      depth,
      el: (
        <g key={`${key}${bi}`}>
          {walls.map((d, k) => (d ? <path key={k} d={d} fill={tint ?? sh[k]} fillOpacity={tint ? 0.55 + 0.15 * k : 1} stroke={tint ?? "#2f3b4a"} strokeOpacity={0.35} strokeWidth={0.6} /> : null))}
          {win && litAmt > 0.02 ? (
            <path d={win} stroke={K.lit} strokeWidth={winW} strokeDasharray={`${(winW * 1.6).toFixed(1)} ${(winW * 1.4).toFixed(1)}`} opacity={0.85 * litAmt} fill="none" />
          ) : null}
          <path d={roof} fill={tint ?? (tilted ? "#323f50" : "#1d2733")} fillOpacity={tint ? 0.85 : 1} stroke={tint ?? "#41505f"} strokeOpacity={tint ? 1 : 0.5} strokeWidth={0.7} />
        </g>
      ),
    });
  });
  return out;
};

// ---------- Labels ----------

const LabelEl: React.FC<{ p: Proj; l: Label; o: number }> = ({ p, l, o }) => {
  const [sx, sy] = project(p, l.x, l.y, l.h ?? 0);
  if (sx < -200 || sx > W + 200 || sy < -100 || sy > H + 100) return null;
  let angle = l.angle ?? 0;
  if (l.along) {
    const road = CITY.roads.find((r) => r.name === l.along);
    if (road) {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < road.pts.length - 2; i += 2) {
        const d = Math.hypot(road.pts[i] - l.x, road.pts[i + 1] - l.y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      const a = project(p, road.pts[best], road.pts[best + 1]);
      const b = project(p, road.pts[best + 2], road.pts[best + 3]);
      angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
    }
  }
  const kind = l.kind ?? "poi";
  const size = l.size ?? (kind === "city" ? 30 : kind === "district" ? 26 : kind === "road" ? 19 : kind === "station" ? 17 : 22);
  const color = l.color ?? (kind === "road" ? "rgba(244,240,232,0.62)" : kind === "station" ? "#8fc6e0" : kind === "district" ? "rgba(244,240,232,0.7)" : K.fg);
  return (
    <div
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: kind === "road" ? 600 : 700,
        letterSpacing: kind === "road" ? 4 : kind === "district" ? 3 : 1,
        color,
        whiteSpace: "nowrap",
        opacity: o,
        textShadow: "0 0 6px rgba(7,9,11,0.95), 0 0 2px rgba(7,9,11,1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {l.dot ? <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}` }} /> : null}
      {l.text}
    </div>
  );
};

// ---------- The map ----------

export const MapView: React.FC<{
  cam: Cam;
  layers: Layers;
  labels?: Label[];
  under?: (p: Proj) => React.ReactNode;
  over?: (p: Proj) => React.ReactNode;
  html?: (p: Proj) => React.ReactNode;
}> = ({ cam, layers: L, labels = [], under, over, html }) => {
  const p = makeProj(cam);
  const z = cam.z;
  const prdO = (L.prd ?? 0) * zFade(z, undefined, 0.06);
  const szO = L.sz ?? 0;
  const roadsO = (L.roads ?? 0) * zFade(z, 0.05);
  const metroO = (L.metro ?? 0) * zFade(z, 0.012);
  const bldgO = (L.bldg ?? 0) * zFade(z, 0.08);

  const coastD = prdO > 0.01 ? WORLD.coast.map((r) => linePath(p, r)).join("") : "";
  const sz = szO > 0.01 ? polys(p, WORLD.sz) : [];

  const drawn: Drawn[] = bldgO > 0.01 ? drawBuildings(p, CITY.buildings, L, "b") : [];
  if ((L.hero ?? 0) > 0.01) drawn.push(...heroFaces(p, L));
  drawn.sort((a, b) => b.depth - a.depth);

  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        {coastD ? <path d={coastD} fill="none" stroke="#9fb3c4" strokeOpacity={0.55 * prdO} strokeWidth={1.3} strokeLinejoin="round" /> : null}
        {sz.map(({ q, d }, i) => {
          const f = L.szFill?.[q.name ?? ""];
          return (
            <g key={`s${i}`} opacity={szO}>
              <path d={d} fill="#161c24" stroke="rgba(244,240,232,0.28)" strokeWidth={1.2} />
              {f ? <path d={d} fill={f.color} fillOpacity={f.a} /> : null}
              {L.szTint && L.szTint.a > 0.005 ? <path d={d} fill={L.szTint.color} fillOpacity={L.szTint.a} stroke={L.szTint.color} strokeOpacity={Math.min(1, L.szTint.a * 2.5)} strokeWidth={1.5} /> : null}
            </g>
          );
        })}
        {roadsO > 0.01
          ? CITY.roads.map((r, i) =>
              onScreen(p, r.bbox) ? (
                <path
                  key={`r${i}`}
                  d={linePath(p, r.pts)}
                  fill="none"
                  stroke="#f4f0e8"
                  strokeOpacity={(r.cls === "major" ? 0.42 : 0.2) * roadsO * (1 - 0.55 * (L.night ?? 0))}
                  strokeWidth={Math.max(1, Math.min(r.cls === "major" ? 9 : 4, z * (r.cls === "major" ? 22 : 10)))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null,
            )
          : null}
        {metroO > 0.01
          ? CITY.metro.map((m: Line, i) => (
              <path
                key={`m${i}`}
                d={linePath(p, m.pts)}
                fill="none"
                stroke={L.metroFlow !== undefined ? "#8fd3f0" : "#5fb0d8"}
                strokeOpacity={0.75 * metroO}
                strokeWidth={Math.max(2, Math.min(L.metroFlow !== undefined ? 7 : 6, z * 8))}
                strokeDasharray={L.metroFlow !== undefined ? "18 14" : z > 0.15 ? "10 6" : undefined}
                strokeDashoffset={L.metroFlow !== undefined ? -L.metroFlow : undefined}
                strokeLinecap="round"
              />
            ))
          : null}
        {under?.(p)}
        {drawn.map((d, i) => (
          <g key={i} opacity={d.hero ? 1 : bldgO}>
            {d.el}
          </g>
        ))}
        {over?.(p)}
      </svg>
      {labels.map((l, i) => {
        const o = (l.o ?? 1) * zFade(z, l.zMin, l.zMax);
        return o > 0.01 ? <LabelEl key={i} p={p} l={l} o={o} /> : null;
      })}
      {html?.(p)}
    </>
  );
};
