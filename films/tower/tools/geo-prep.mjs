// Turns data/*.geojson (WGS-84) into the compact local-metre layers the film draws: src/geo/world.json and
// src/geo/city.json. Usage: node tools/geo-prep.mjs
import fs from "node:fs";

const ORIGIN = [114.06, 22.54];
const KX = 111320 * Math.cos((22.54 * Math.PI) / 180);
const KY = 110574;
const toM = ([lon, lat]) => [(lon - ORIGIN[0]) * KX, (lat - ORIGIN[1]) * KY];
const read = (f) => JSON.parse(fs.readFileSync(`data/${f}`, "utf8"));
const exists = (f) => fs.existsSync(`data/${f}`);
const r1 = (v) => Math.round(v * 10) / 10;

const perp = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const dp = (pts, tol) => {
  if (pts.length <= 2 || !tol) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [s, e] = st.pop();
    let m = 0;
    let k = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perp(pts[i], pts[s], pts[e]);
      if (d > m) {
        m = d;
        k = i;
      }
    }
    if (m > tol) {
      keep[k] = 1;
      st.push([s, k], [k, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
};
const area = (r) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};
// Local-metre ring, simplified, open (no repeated last point), counter-clockwise.
const mring = (coords, tol) => {
  let m = coords.map(toM);
  if (m.length > 1 && m[0][0] === m[m.length - 1][0] && m[0][1] === m[m.length - 1][1]) m = m.slice(0, -1);
  if (tol && m.length > 8) {
    const half = Math.floor(m.length / 2);
    m = [...dp(m.slice(0, half + 1), tol).slice(0, -1), ...dp([...m.slice(half), m[0]], tol).slice(0, -1)];
  }
  if (m.length < 3) return null;
  if (area(m) < 0) m.reverse();
  return m;
};
const flat = (m) => m.flatMap(([x, y]) => [r1(x), r1(y)]);
const bboxOf = (rings) => {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings)
    for (let i = 0; i < r.length; i += 2) {
      b[0] = Math.min(b[0], r[i]);
      b[1] = Math.min(b[1], r[i + 1]);
      b[2] = Math.max(b[2], r[i]);
      b[3] = Math.max(b[3], r[i + 1]);
    }
  return b.map(Math.round);
};
// Area-weighted centroid of the biggest outer ring (label anchor).
const centre = (rings) => {
  let best = null;
  let ba = 0;
  for (const r of rings) {
    const pts = [];
    for (let i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]);
    const a = Math.abs(area(pts));
    if (a > ba) {
      ba = a;
      best = pts;
    }
  }
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < best.length; i++) {
    const p = best[i];
    const q = best[(i + 1) % best.length];
    const f = p[0] * q[1] - q[0] * p[1];
    a += f;
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  }
  return [Math.round(cx / (3 * a)), Math.round(cy / (3 * a))];
};

const polysOf = (fcol, tol, nameKey = "name", minArea = 0) =>
  fcol.features.map((f) => {
    const g = f.geometry;
    const parts = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const rings = [];
    for (const poly of parts) {
      const outer = mring(poly[0], tol);
      if (outer && Math.abs(area(outer)) >= minArea) rings.push(flat(outer));
    }
    return { name: f.properties[nameKey], rings, bbox: bboxOf(rings), c: centre(rings) };
  });

// ---------- world.json ----------
const world = { origin: ORIGIN, prd: [], sz: [] };
world.sz = polysOf(read("shenzhen-districts.geojson"), 20, "name", 20000);
if (exists("prd-cities.geojson")) world.prd = polysOf(read("prd-cities.geojson"), 200, "name", 2e6);
fs.writeFileSync("src/geo/world.json", JSON.stringify(world));
console.log("world.json", "prd", world.prd.length, "sz", world.sz.length, fs.statSync("src/geo/world.json").size, "bytes");
