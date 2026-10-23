// Ground layers for the 3D city (src/world/ground.json), in the same local metres as src/geo/*.json:
// - land: the delta's land (data/land-mask.geojson, from the OSM coastline), outer rings plus holes;
// - green: parks, woods and water around Futian (data/futian-district-green.geojson, data/futian-cbd-green.geojson);
// - roads: Shenzhen's major roads (data/shenzhen-roads-major.geojson);
// - metro: Shenzhen's metro lines with their own colours (data/shenzhen-metro.geojson).
// All © OpenStreetMap contributors (ODbL). Usage: node tools/world3d-prep.mjs
import fs from "node:fs";

const ORIGIN = [114.06, 22.54];
const KX = 111320 * Math.cos((22.54 * Math.PI) / 180);
const KY = 110574;
const toM = ([lon, lat]) => [(lon - ORIGIN[0]) * KX, (lat - ORIGIN[1]) * KY];
const read = (f) => JSON.parse(fs.readFileSync(`data/${f}`, "utf8"));
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
// Open ring in local metres, simplified; outer rings counter-clockwise, holes clockwise.
const mring = (coords, tol, hole) => {
  let m = coords.map(toM);
  if (m.length > 1 && m[0][0] === m[m.length - 1][0] && m[0][1] === m[m.length - 1][1]) m = m.slice(0, -1);
  if (tol && m.length > 8) {
    const half = Math.floor(m.length / 2);
    m = [...dp(m.slice(0, half + 1), tol).slice(0, -1), ...dp([...m.slice(half), m[0]], tol).slice(0, -1)];
  }
  if (m.length < 3) return null;
  if ((area(m) < 0) !== !!hole) m.reverse();
  return m;
};
const flat = (m) => m.flatMap(([x, y]) => [r1(x), r1(y)]);

// [[outer, hole, hole...], ...] per polygon, flat rings.
const polys = (g, tol, minArea) => {
  const parts = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const out = [];
  for (const p of parts) {
    const outer = mring(p[0], tol, false);
    if (!outer || Math.abs(area(outer)) < minArea) continue;
    const holes = p
      .slice(1)
      .map((h) => mring(h, tol, true))
      .filter((h) => h && Math.abs(area(h)) >= minArea);
    out.push([flat(outer), ...holes.map(flat)]);
  }
  return out;
};

const ground = { land: [], green: [], roads: [], metro: [] };

for (const f of read("land-mask.geojson").features) ground.land.push(...polys(f.geometry, 12, 2000));

const seen = new Set();
for (const file of ["futian-district-green.geojson", "futian-cbd-green.geojson"]) {
  for (const f of read(file).features) {
    const id = f.properties.id ?? JSON.stringify(f.geometry.coordinates).slice(0, 80);
    if (seen.has(id)) continue;
    seen.add(id);
    const kind = f.properties.kind === "water" ? "water" : "green";
    for (const p of polys(f.geometry, 3, 300)) ground.green.push({ kind, p });
  }
}

for (const f of read("shenzhen-roads-major.geojson").features) {
  if (f.geometry.type !== "LineString") continue;
  const pts = dp(f.geometry.coordinates.map(toM), 8);
  if (pts.length < 2) continue;
  ground.roads.push({ cls: f.properties.cls, pts: flat(pts) });
}

for (const f of read("shenzhen-metro.geojson").features) {
  if (f.geometry.type !== "LineString") continue;
  const pts = dp(f.geometry.coordinates.map(toM), 5);
  if (pts.length < 2) continue;
  ground.metro.push({ line: f.properties.line, colour: f.properties.colour, pts: flat(pts) });
}

fs.mkdirSync("src/world", { recursive: true });
fs.writeFileSync("src/world/ground.json", JSON.stringify(ground));
console.log(
  "ground.json",
  Object.entries(ground)
    .map(([k, v]) => `${k} ${v.length}`)
    .join(", "),
  fs.statSync("src/world/ground.json").size,
  "bytes",
);
