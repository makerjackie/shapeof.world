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

// ---------- GCJ-02 → WGS-84 (DataV is in GCJ-02, OSM in WGS-84) ----------
const GA = 6378245.0;
const GEE = 0.00669342162296594323;
const tLat = (x, y) => {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  r += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  return r;
};
const tLon = (x, y) => {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  r += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  return r;
};
const wgs2gcj = ([lon, lat]) => {
  let dLat = tLat(lon - 105, lat - 35);
  let dLon = tLon(lon - 105, lat - 35);
  const rad = (lat / 180) * Math.PI;
  const m = 1 - GEE * Math.sin(rad) ** 2;
  const sq = Math.sqrt(m);
  dLat = (dLat * 180) / (((GA * (1 - GEE)) / (m * sq)) * Math.PI);
  dLon = (dLon * 180) / ((GA / sq) * Math.cos(rad) * Math.PI);
  return [lon + dLon, lat + dLat];
};
const gcj2wgs = ([lon, lat]) => {
  let w = [lon, lat];
  for (let i = 0; i < 6; i++) {
    const g = wgs2gcj(w);
    w = [w[0] - (g[0] - lon), w[1] - (g[1] - lat)];
  }
  return w;
};
const rawJ = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`, "utf8"));
const toWgs = (fcol) => {
  for (const f of fcol.features) {
    const g = f.geometry;
    const parts = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of parts) for (const r of poly) for (let i = 0; i < r.length; i++) r[i] = gcj2wgs(r[i]);
  }
  return fcol;
};

// ---------- world.json ----------
const world = { origin: ORIGIN, prd: [], sz: [] };
world.sz = polysOf(read("shenzhen-districts.geojson"), 20, "name", 20000);
const PRD = new Set(["广州市", "深圳市", "珠海市", "佛山市", "江门市", "肇庆市", "惠州市", "东莞市", "中山市", "清远市", "河源市", "汕尾市", "云浮市", "阳江市", "韶关市"]);
const gd = toWgs(rawJ("dv-440000_full.json"));
gd.features = gd.features.filter((f) => PRD.has(f.properties.name));
world.prd = [...polysOf(gd, 150, "name", 4e6), ...polysOf(toWgs(rawJ("dv-810000.json")), 80, "name", 5e5), ...polysOf(toWgs(rawJ("dv-820000.json")), 30, "name", 1e5)];
fs.writeFileSync("src/geo/world.json", JSON.stringify(world));
console.log("world.json", "prd", world.prd.length, "sz", world.sz.length, fs.statSync("src/geo/world.json").size, "bytes");

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
  buildings.push({ h: Math.round(heightOf(t, e.id)), ring, bbox: b, cx: Math.round((b[0] + b[2]) / 2), cy: Math.round((b[1] + b[3]) / 2), name: t.name });
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
const city = { roads, metro, stations, buildings, pois, hero };
fs.writeFileSync("src/geo/city.json", JSON.stringify(city));
console.log("city.json", "roads", roads.length, "metro", metro.length, "stations", stations.length, "buildings", buildings.length, "pois", pois.length, fs.statSync("src/geo/city.json").size, "bytes");
