// Nanshan's buildings and streets for the 3D city (src/world/nanshan.json), from tools/fetch-nanshan.sh downloads.
// Heights: CTBUH (completed towers, matched to the footprint that contains or is nearest to the tower's point,
// within 45 m) > OSM height > building:levels × 3.4 > a low drawing default. © OpenStreetMap contributors, ODbL.
// Usage: node tools/nanshan-prep.mjs [rawDir]
import fs from "node:fs";

const RAW = process.argv[2] || "/tmp/tower3-ns";
const ORIGIN = [114.06, 22.54];
const KX = 111320 * Math.cos((22.54 * Math.PI) / 180);
const KY = 110574;
const toM = ([lon, lat]) => [(lon - ORIGIN[0]) * KX, (lat - ORIGIN[1]) * KY];
const r1 = (v) => Math.round(v * 10) / 10;
const area = (r) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};
const perp = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const dp = (pts, tol) => {
  if (pts.length <= 2) return pts;
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
const pip = (p, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
};

const els = JSON.parse(fs.readFileSync(`${RAW}/ns-buildings.json`, "utf8")).elements;
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

const list = [];
for (const e of els) {
  const t = e.tags || {};
  if (t.building === "roof" || t["building:part"]) continue;
  const coords = e.type === "way" ? (e.geometry ? e.geometry.map((p) => [p.lon, p.lat]) : null) : ringOfRel(e);
  if (!coords || coords.length < 4) continue;
  let m = coords.map(toM);
  if (m[0][0] === m[m.length - 1][0] && m[0][1] === m[m.length - 1][1]) m = m.slice(0, -1);
  if (m.length > 8) m = dp([...m, m[0]], 1).slice(0, -1);
  if (m.length < 3) continue;
  if (area(m) < 0) m.reverse();
  if (Math.abs(area(m)) < 100) continue;
  const h = parseFloat(t.height);
  const l = parseFloat(t["building:levels"]);
  const rnd = ((e.id * 2654435761) % 1000) / 1000;
  const def = t.building === "apartments" || t.building === "residential" ? 24 + rnd * 30 : 9 + rnd * 14;
  const xs = m.map((p) => p[0]);
  const ys = m.map((p) => p[1]);
  list.push({ id: e.id, m, h: h > 0 ? h : l > 0 ? l * 3.4 : def, src: h > 0 ? "tag" : l > 0 ? "levels" : "default", bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], name: t.name });
}

// CTBUH: completed towers inside the window, matched one-to-one to a footprint
const towers = JSON.parse(fs.readFileSync("data/shenzhen-towers-ctbuh.geojson", "utf8")).features.filter((f) => f.properties.status === "COM");
let matched = 0;
const used = new Set();
for (const f of towers) {
  const p = toM(f.geometry.coordinates);
  let best = null;
  let bd = 45;
  for (const b of list) {
    if (used.has(b)) continue;
    if (p[0] < b.bbox[0] - 60 || p[0] > b.bbox[2] + 60 || p[1] < b.bbox[1] - 60 || p[1] > b.bbox[3] + 60) continue;
    let d;
    if (pip(p, b.m)) d = 0;
    else {
      d = Infinity;
      for (let i = 0; i < b.m.length; i++) d = Math.min(d, perp(p, b.m[i], b.m[(i + 1) % b.m.length]));
    }
    // prefer footprints big enough to carry a tower
    if (d < bd || (d === bd && best && Math.abs(area(b.m)) > Math.abs(area(best.m)))) {
      bd = d;
      best = b;
    }
  }
  if (best) {
    used.add(best);
    best.h = f.properties.height_m;
    best.year = f.properties.year;
    best.src = "ctbuh";
    matched++;
  }
}

const out = {
  buildings: list.map((b) => ({ h: Math.round(b.h), ring: b.m.flatMap(([x, y]) => [r1(x), r1(y)]), bbox: b.bbox.map(Math.round), cx: Math.round((b.bbox[0] + b.bbox[2]) / 2), cy: Math.round((b.bbox[1] + b.bbox[3]) / 2), ...(b.year ? { year: b.year } : {}), ...(b.name && b.src === "ctbuh" ? { name: b.name } : {}) })),
  roads: [],
};
for (const e of JSON.parse(fs.readFileSync(`${RAW}/ns-roads.json`, "utf8")).elements) {
  if (!e.geometry) continue;
  const pts = dp(e.geometry.map((p) => toM([p.lon, p.lat])), 2);
  if (pts.length < 2) continue;
  const c = e.tags?.highway ?? "";
  out.roads.push({ cls: /^(motorway|trunk|primary|secondary)/.test(c) ? "major" : "minor", pts: pts.flatMap(([x, y]) => [r1(x), r1(y)]) });
}
fs.writeFileSync("src/world/nanshan.json", JSON.stringify(out));
const srcs = {};
list.forEach((b) => (srcs[b.src] = (srcs[b.src] || 0) + 1));
console.log("nanshan.json", out.buildings.length, "buildings", out.roads.length, "roads", "ctbuh matched", matched, JSON.stringify(srcs), fs.statSync("src/world/nanshan.json").size, "bytes");
