// Turns the raw map downloads into the compact local-metre layers the film draws: src/geo/world.json and
// src/geo/city.json. Raw files come from tools/fetch-geo.sh (Overpass + DataV.GeoAtlas) into $RAW (default
// /tmp/towerv2-raw); the district polygons come from data/shenzhen-districts.geojson.
// Usage: node tools/geo-prep.mjs [rawDir]
import fs from "node:fs";

const RAW = process.argv[2] || "/tmp/towerv2-raw";
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

const rawJ = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`, "utf8"));

// ---------- world.json ----------
// The delta's land from the OSM coastline (tools/prd-land.mjs) and Shenzhen's districts (data/, OSM, land only).
const world = { origin: ORIGIN, coast: [], sz: [] };
world.sz = polysOf(read("shenzhen-districts.geojson"), 20, "name", 20000);
{
  const pl = rawJ("prd-land.json");
  const len = (m) => m.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - m[i - 1][0], p[1] - m[i - 1][1]) : 0), 0);
  world.coast = pl.chains
    .map((c) => dp(c.map(toM), 70))
    .filter((m) => m.length > 1 && len(m) > 2500)
    .map(flat);
}
fs.writeFileSync("src/geo/world.json", JSON.stringify(world));
console.log("world.json", "coast", world.coast.length, "sz", world.sz.length, fs.statSync("src/geo/world.json").size, "bytes");

// ---------- city.json ----------
// OSM ways of 深圳能源大厦 (金田路 2026): north tower, south tower and the block between them.
const HERO = { N: 776897365, S: 776897366, podium: 776897367 };
const hero = { N: [], S: [], podium: [], parcel: [] };
const els = rawJ("cbd-buildings.json").elements;
const ringOfWay = (g) => g.map((p) => [p.lon, p.lat]);
// Outer ring of a multipolygon relation: chain its outer member ways end to end.
const ringOfRel = (e) => {
  const frags = (e.members || []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  if (!frags.length) return null;
  let cur = frags.shift();
  for (let guard = 0; frags.length && guard < 500; guard++) {
    const end = cur[cur.length - 1];
    const same = (p) => p[0] === end[0] && p[1] === end[1];
    const i = frags.findIndex((f) => same(f[0]) || same(f[f.length - 1]));
    if (i < 0) break;
    let f = frags.splice(i, 1)[0];
    if (!same(f[0])) f = f.slice().reverse();
    cur = cur.concat(f.slice(1));
  }
  return cur;
};
const heightOf = (t, id) => {
  const h = parseFloat(t.height);
  if (h > 0) return h;
  const l = parseFloat(t["building:levels"]);
  if (l > 0) return l * 3.4;
  // No height in OSM: a low default, varied so the ground reads as a city. Drawing only, never shown as data.
  const r = ((id * 2654435761) % 1000) / 1000;
  return t.building === "apartments" || t.building === "residential" ? 24 + r * 30 : 9 + r * 14;
};
// Best heights for the CBD window (data/futian-cbd-buildings.geojson): CTBUH > OSM height > levels × 3.5.
const bestH = new Map(read("futian-cbd-buildings.geojson").features.filter((f) => f.properties.h > 0).map((f) => [f.properties.id, { h: f.properties.h, year: f.properties.year }]));
const buildings = [];
for (const e of els) {
  const t = e.tags || {};
  if (t.building === "roof" || t["building:part"]) continue;
  if (e.id === HERO.N || e.id === HERO.S || e.id === HERO.podium) {
    const k = e.id === HERO.N ? "N" : e.id === HERO.S ? "S" : "podium";
    hero[k] = flat(mring(ringOfWay(e.geometry), 0));
    continue;
  }
  const coords = e.type === "way" ? (e.geometry ? ringOfWay(e.geometry) : null) : ringOfRel(e);
  if (!coords || coords.length < 4) continue;
  const m = mring(coords, 1);
  if (!m || Math.abs(area(m)) < 80) continue;
  const ring = flat(m);
  const b = bboxOf([ring]);
  const best = bestH.get(e.id);
  buildings.push({ h: Math.round(best ? best.h : heightOf(t, e.id)), ring, bbox: b, cx: Math.round((b[0] + b[2]) / 2), cy: Math.round((b[1] + b[3]) / 2), name: t.name, year: best?.year });
}
// The parcel outline drawn on the map: the box around the three footprints (the site itself is 6,427.7 m²).
{
  const xs = [];
  const ys = [];
  for (const k of ["N", "S", "podium"])
    for (let i = 0; i < hero[k].length; i += 2) {
      xs.push(hero[k][i]);
      ys.push(hero[k][i + 1]);
    }
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  hero.parcel = [x0, y0, x1, y0, x1, y1, x0, y1].map(r1);
}

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link"]);
const roads = [];
for (const e of rawJ("cbd-roads.json").elements) {
  const t = e.tags || {};
  if (!e.geometry) continue;
  const pts = flat(dp(e.geometry.map((p) => toM([p.lon, p.lat])), 1.5));
  roads.push({ name: t.name, cls: MAJOR.has(t.highway) ? "major" : t.highway === "tertiary" ? "mid" : "minor", pts, bbox: bboxOf([pts]) });
}

const metro = [];
const stations = [];
for (const e of rawJ("metro.json").elements) {
  const t = e.tags || {};
  if (e.type === "way" && e.geometry) {
    const line = /深圳地铁(\d+)号线/.exec(t.name || "");
    if (!line || /试车|检|洗车|车辆段|存放/.test(t.name)) continue;
    const pts = flat(dp(e.geometry.map((p) => toM([p.lon, p.lat])), 6));
    metro.push({ name: t.name, ref: line[1], pts, bbox: bboxOf([pts]) });
  } else if (e.type === "node" && t.name && !/[A-Za-z]/.test(t.name)) {
    const name = t.name.replace(/站$/, "");
    if (stations.some((s) => s.name === name)) continue;
    const [x, y] = toM([e.lon, e.lat]);
    stations.push({ name, x: Math.round(x), y: Math.round(y) });
  }
}
const WANT = { 平安金融中心: "平安金融中心", 市民中心: "市民中心", 深圳会展中心: "会展中心", 深圳市少年宫: "少年宫", 皇岗商务中心: "皇岗商务中心" };
const pois = [];
for (const e of els) {
  const t = e.tags || {};
  if (!t.name || !WANT[t.name] || pois.some((p) => p.name === WANT[t.name])) continue;
  const c = e.geometry ? e.geometry : (e.members || []).flatMap((m) => m.geometry || []);
  if (!c.length && e.bounds) c.push({ lon: (e.bounds.minlon + e.bounds.maxlon) / 2, lat: (e.bounds.minlat + e.bounds.maxlat) / 2 });
  const ms = c.map((p) => toM([p.lon, p.lat]));
  if (!ms.length) continue;
  const b = buildings.find((q) => q.name === t.name);
  pois.push({ name: WANT[t.name], x: Math.round(ms.reduce((s, p) => s + p[0], 0) / ms.length), y: Math.round(ms.reduce((s, p) => s + p[1], 0) / ms.length), h: b ? b.h : 0 });
}
// Landmarks (data/landmarks.geojson): HQ towers, the 7 submarket anchors (a metro station inside each, not a
// boundary) and K602-0016 (estimated from its road corner, ~100 m).
for (const f of read("landmarks.geojson").features) {
  const p = f.properties;
  const [x, y] = toM(f.geometry.coordinates);
  const name = p.name.startsWith("南山粤海 K602-0016") ? "K602-0016" : p.name.replace(" (写字楼分区锚点)", "");
  if (pois.some((q) => q.name === name)) continue;
  pois.push({ name, x: Math.round(x), y: Math.round(y), h: Math.round(p.height_m || 0), kind: p.kind });
}
// CTBUH completed towers ≥150 m with a year, for the skyline growing city-wide: [x, y, height, year].
const towers = read("shenzhen-towers-ctbuh.geojson")
  .features.filter((f) => f.properties.status === "COM" && f.properties.year)
  .map((f) => {
    const [x, y] = toM(f.geometry.coordinates);
    return [Math.round(x), Math.round(y), Math.round(f.properties.height_m), f.properties.year];
  });
const skyline = JSON.parse(fs.readFileSync("data/shenzhen-skyline-by-year.json", "utf8")).series.map((r) => [r.year, r.cum150, r.cum200, r.cum300]);
const cbdRing = flat(mring(read("futian-cbd-boundary.geojson").features[0].geometry.coordinates[0], 0));
const city = { roads, metro, stations, buildings, pois, hero, towers, skyline, cbd: cbdRing };
fs.writeFileSync("src/geo/city.json", JSON.stringify(city));
console.log("city.json", "roads", roads.length, "metro", metro.length, "stations", stations.length, "buildings", buildings.length, "pois", pois.length, fs.statSync("src/geo/city.json").size, "bytes");
