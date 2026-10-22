// Build: land polygon from OSM coastline, districts clipped to land, DataV alt (GCJ-02 -> WGS-84).
// Inputs (raw downloads, not committed): RAW/coast.json adm-geom.json dv.json  (see fetch.sh)
// Usage: node build-land.mjs <RAW dir> <OUT dir>
import fs from 'fs';
import pc from 'polygon-clipping';
import { ring, relationPolygons, ringAreaM2, gcj2wgs, fc, clean } from './lib.mjs';

const RAW = process.argv[2] || '/tmp/towergeo';
const OUT = process.argv[3] || '..';
const BBOX = [113.70, 22.38, 114.70, 22.90]; // minx, miny, maxx, maxy  (same as the Overpass query)
const read = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`));

// ---------- 1. coastline -> land polygon ----------
const coast = read('coast.json').elements.filter((e) => e.geometry).map((e) => e.geometry.map((p) => [p.lon, p.lat]));
const key = (p) => p[0] + ',' + p[1];
// chain ways end-to-start (OSM coastline: land on the left)
const startMap = new Map();
coast.forEach((w, i) => startMap.set(key(w[0]), i));
const used = new Set();
const chains = [];
const hasPrev = new Set();
coast.forEach((w) => { const j = startMap.get(key(w[w.length - 1])); if (j !== undefined) hasPrev.add(j); });
const walk = (i) => {
  let c = coast[i].slice(); used.add(i);
  for (;;) {
    const j = startMap.get(key(c[c.length - 1]));
    if (j === undefined || used.has(j)) break;
    used.add(j); c = c.concat(coast[j].slice(1));
  }
  chains.push(c);
};
coast.forEach((_, i) => { if (!hasPrev.has(i) && !used.has(i)) walk(i); }); // open chains first
coast.forEach((_, i) => { if (!used.has(i)) walk(i); });                     // then closed loops

const [x0, y0, x1, y1] = BBOX;
const W = x1 - x0, H = y1 - y0, PER = 2 * (W + H);
const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
// parameter along bbox perimeter, CCW from bottom-left
function tOf(p) {
  const eps = 1e-9;
  if (Math.abs(p[1] - y0) < eps) return p[0] - x0;
  if (Math.abs(p[0] - x1) < eps) return W + (p[1] - y0);
  if (Math.abs(p[1] - y1) < eps) return W + H + (x1 - p[0]);
  return 2 * W + H + (y1 - p[1]);
}
function clipSeg(a, b) { // Liang-Barsky, returns [tin, tout] or null
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return null; }
    else { const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
  }
  return [t0, t1];
}
const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const pieces = []; // open pieces clipped to bbox
const islands = []; // closed chains fully inside
for (const c of chains) {
  const closed = c.length > 3 && key(c[0]) === key(c[c.length - 1]);
  if (closed && c.every(inside)) { islands.push(c); continue; }
  let cur = null;
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i], b = c[i + 1];
    const cl = clipSeg(a, b);
    if (!cl) { if (cur) { pieces.push(cur); cur = null; } continue; }
    const pa = at(a, b, cl[0]), pb = at(a, b, cl[1]);
    if (!cur || cl[0] > 0) { if (cur) pieces.push(cur); cur = [pa]; }
    cur.push(pb);
    if (cl[1] < 1) { pieces.push(cur); cur = null; }
  }
  if (cur) pieces.push(cur);
}
// snap piece ends exactly onto the bbox edge
const snap = (p) => { const q = p.slice(); for (const [i, v] of [[0, x0], [0, x1], [1, y0], [1, y1]]) if (Math.abs(q[i] - v) < 1e-9) q[i] = v; return q; };
pieces.forEach((pc_) => { pc_[0] = snap(pc_[0]); pc_[pc_.length - 1] = snap(pc_[pc_.length - 1]); });
const open = pieces.filter((p) => !(key(p[0]) === key(p[p.length - 1])));
const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const cornerT = [0, W, W + H, 2 * W + H];
const rings = [];
const usedP = new Set();
for (let s = 0; s < open.length; s++) {
  if (usedP.has(s)) continue;
  let ringPts = []; let i = s;
  for (let guard = 0; guard < 1000; guard++) {
    usedP.add(i);
    ringPts = ringPts.concat(open[i]);
    const e = open[i][open[i].length - 1];
    const te = tOf(e);
    // next entry CCW from exit
    let best = -1, bd = 1e9;
    open.forEach((p, j) => { let d = (tOf(p[0]) - te + PER) % PER; if (d < 1e-12) d = PER; if (d < bd) { bd = d; best = j; } });
    // corners passed between te and entry
    const cs = cornerT.map((t, k) => [(t - te + PER) % PER, k]).filter(([d]) => d > 1e-12 && d < bd).sort((a, b) => a[0] - b[0]);
    cs.forEach(([, k]) => ringPts.push(corners[k]));
    if (best === s || usedP.has(best)) break;
    i = best;
  }
  ringPts.push(ringPts[0]);
  rings.push(ringPts);
}
console.log('chains', chains.length, 'open pieces', open.length, 'bbox-rings', rings.length, 'islands', islands.length);

const cw = (r) => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s < 0; };
const landPolys = [];
const lakeRings = [];
for (const r of [...rings, ...islands]) (cw(r) && islands.includes(r) ? lakeRings : landPolys).push(r);
let land = pc.union(...landPolys.map((r) => [[r]]));
if (lakeRings.length) land = pc.difference(land, ...lakeRings.map((r) => [[r.slice().reverse()]]));
const areaOf = (mp) => mp.reduce((a, poly) => a + ringAreaM2(poly[0]) - poly.slice(1).reduce((s, h) => s + ringAreaM2(h), 0), 0) / 1e6;
console.log('land polygons', land.length, 'area km2 (whole bbox)', areaOf(land).toFixed(0));

// ---------- 2. OSM administrative relations clipped to land ----------
const adm = read('adm-geom.json').elements;
const byName = {};
for (const rel of adm) byName[rel.tags.name] = relationPolygons(rel, 0);

const names = ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'];
const en = { 福田区: 'Futian', 罗湖区: 'Luohu', 南山区: 'Nanshan', 宝安区: 'Baoan', 龙岗区: 'Longgang', 盐田区: 'Yantian', 龙华区: 'Longhua', 坪山区: 'Pingshan', 光明区: 'Guangming', 大鹏新区: 'Dapeng' };
const sims = (mp, tol) => mp.map((poly) => poly.map((r) => ring(r, tol)).filter(Boolean)).filter((p) => p.length && p[0]);
const feats = [];
const stats = [];
for (const n of names) {
  let g = byName[n];
  if (n === '龙岗区') g = pc.difference(g, byName['大鹏新区']);
  const clipped = pc.intersection(g, land);
  const a = areaOf(clipped);
  const simp = sims(clipped, 20);
  stats.push([n, a.toFixed(1)]);
  const rel = adm.find((r) => r.tags.name === n);
  feats.push({ type: 'Feature', properties: clean({ name: n, name_en: en[n], osm_relation: rel.id, area_km2_land: +a.toFixed(1), wikidata: rel.tags.wikidata }), geometry: { type: 'MultiPolygon', coordinates: simp } });
}
console.log(stats.map((s) => s.join(' ')).join(' | '));
const city = pc.intersection(byName['深圳市'], land);
console.log('Shenzhen city land area km2', areaOf(city).toFixed(1), 'sum of districts', stats.reduce((s, x) => s + +x[1], 0).toFixed(1));
fs.writeFileSync(`${OUT}/shenzhen-districts.geojson`, JSON.stringify(fc(feats, { name: 'shenzhen-districts', crs_note: 'WGS-84 lon/lat; land only (clipped to OSM coastline)' })));
fs.writeFileSync(`${OUT}/shenzhen-outline.geojson`, JSON.stringify(fc([{ type: 'Feature', properties: { name: '深圳市', name_en: 'Shenzhen', area_km2_land: +areaOf(city).toFixed(1) }, geometry: { type: 'MultiPolygon', coordinates: sims(city, 60) } }])));

// land polygon (whole bbox, for sea/land masks) - simplified at 30 m
const landFeat = { type: 'Feature', properties: { name: 'land', bbox: BBOX }, geometry: { type: 'MultiPolygon', coordinates: sims(land, 30) } };
fs.writeFileSync(`${OUT}/land-mask.geojson`, JSON.stringify(fc([landFeat], { name: 'land-mask' })));

// ---------- 3. DataV (AMap) districts, GCJ-02 -> WGS-84, unclipped ----------
const dv = read('dv.json');
const dvFeats = dv.features.map((f) => {
  const conv = f.geometry.coordinates.map((poly) => poly.map((r) => r.map(gcj2wgs)));
  const mp = conv.map((poly) => poly.map((r) => ring(r, 25)).filter(Boolean));
  return { type: 'Feature', properties: { adcode: f.properties.adcode, name: f.properties.name, area_km2_admin: +areaOf(conv).toFixed(1) }, geometry: { type: 'MultiPolygon', coordinates: mp } };
});
fs.writeFileSync(`${OUT}/alt-shenzhen-districts-datav.geojson`, JSON.stringify(fc(dvFeats, { name: 'datav-districts-wgs84', crs_note: 'converted from GCJ-02 to WGS-84; includes sea within the admin boundary; Dapeng is inside Longgang' })));
for (const f of ['shenzhen-districts', 'shenzhen-outline', 'land-mask', 'alt-shenzhen-districts-datav']) console.log(f, fs.statSync(`${OUT}/${f}.geojson`).size);
