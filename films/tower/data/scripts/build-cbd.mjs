// Build the Futian CBD layers, the Energy Mansion parcel and landmark points from raw Overpass downloads.
// Inputs (raw, not committed): RAW/{cbd-buildings,cbd-roads,cbd-green,rel-cbd,cbd-rail,site,lm}.json  (see fetch.sh)
// Usage: node build-cbd.mjs <RAW dir> <OUT dir>
import fs from 'fs';
import { ring, relationPolygons, ringAreaM2, ringCentroid, simplify, roundPts, r5, fc, clean, pip } from './lib.mjs';

const RAW = process.argv[2] || '/tmp/towergeo';
const OUT = process.argv[3] || '..';
const read = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`));
const write = (name, obj) => { fs.writeFileSync(`${OUT}/${name}`, JSON.stringify(obj)); console.log(name, fs.statSync(`${OUT}/${name}`).size, 'bytes,', obj.features.length, 'features'); };

// map window for the CBD layers (CBD proper is about 114.040-114.063 E, 22.531-22.552 N)
const BB = [114.037, 22.527, 114.069, 22.560];
const inBB = (p) => p[0] >= BB[0] && p[0] <= BB[2] && p[1] >= BB[1] && p[1] <= BB[3];
const pts = (g) => g.map((p) => [p.lon, p.lat]);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : undefined; };
const closed = (g) => g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;

// Liang-Barsky clip of a polyline to BB -> array of polylines
function clipLine(line) {
  const out = []; let cur = null;
  const [x0, y0, x1, y1] = BB;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } }
      else { const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } }
    }
    if (!ok) { if (cur) { out.push(cur); cur = null; } continue; }
    const pa = [a[0] + dx * t0, a[1] + dy * t0], pb = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur || t0 > 0) { if (cur) out.push(cur); cur = [pa]; }
    cur.push(pb);
    if (t1 < 1) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((l) => l.length >= 2);
}

// ---------- buildings ----------
const bEls = read('cbd-buildings.json').elements.filter((e) => e.geometry && closed(e.geometry));
const buildings = [];
for (const e of bEls) {
  const r = ring(pts(e.geometry), 0.4);
  if (!r) continue;
  const c = ringCentroid(r);
  if (!inBB(c)) continue;
  const t = e.tags || {};
  const height = num(t.height), levels = num(t['building:levels']);
  const h = height ?? (levels ? Math.round(levels * 3.5 * 10) / 10 : undefined);
  buildings.push({
    type: 'Feature',
    properties: clean({ id: e.id, name: t.name, name_en: t['name:en'], kind: t.building, levels, height, h, hs: height ? 'tag' : levels ? 'levels*3.5' : undefined }),
    geometry: { type: 'Polygon', coordinates: [r] },
    _c: c,
  });
}
// attach CTBUH facts (height, completion year, id) to the matching OSM footprint: nearest footprint within 40 m, one-to-one
const ctbuh = JSON.parse(fs.readFileSync(`${RAW}/ctbuh_sz.json`));
const cand = ctbuh.filter((t) => t.status === 'COM' && +t.height_architecture >= 150 && +t.longitude >= BB[0] && +t.longitude <= BB[2] && +t.latitude >= BB[1] && +t.latitude <= BB[3]);
const pairs = [];
for (const t of cand) for (const b of buildings) { const d = Math.hypot((b._c[0] - +t.longitude) * 102700, (b._c[1] - +t.latitude) * 110570); if (d < 40) pairs.push([d, t, b]); }
pairs.sort((x, y) => x[0] - y[0]);
const usedT = new Set(), usedB = new Set();
let matched = 0;
for (const [, t, b] of pairs) {
  if (usedT.has(t.id) || usedB.has(b)) continue;
  usedT.add(t.id); usedB.add(b); matched++;
  Object.assign(b.properties, clean({ ctbuh_id: t.id, ctbuh_name: t.name_intl, h_ctbuh: Math.round(+t.height_architecture * 10) / 10, year: t.completed ? +t.completed : undefined, floors_ctbuh: t.floors_above || undefined }));
  b.properties.h = b.properties.h_ctbuh; b.properties.hs = 'ctbuh';
}
buildings.forEach((b) => delete b._c);
console.log('CTBUH towers in window', cand.length, 'matched to OSM footprints', matched, 'unmatched', cand.filter((t) => !usedT.has(t.id)).map((t) => t.name_intl).join('; '));
const withH = buildings.filter((f) => f.properties.height).length;
const withL = buildings.filter((f) => f.properties.levels).length;
console.log('buildings', buildings.length, 'with height tag', withH, 'with levels', withL);
write('futian-cbd-buildings.geojson', fc(buildings, { name: 'futian-cbd-buildings', note: 'OSM building footprints, WGS-84. h = CTBUH height where matched (ctbuh_id, year), else OSM height tag, else levels*3.5 (hs says which); absent if none. kind=roof are canopies, not buildings' }));

// ---------- roads ----------
const cls = (hw) => hw.replace('_link', '');
const roads = [];
for (const e of read('cbd-roads.json').elements) {
  if (!e.geometry) continue;
  const t = e.tags || {};
  if (t.highway === 'service' && ['parking_aisle', 'driveway', 'drive-through'].includes(t.service)) continue;
  for (const l of clipLine(pts(e.geometry))) {
    const line = roundPts(simplify(l, 1.5));
    if (line.length < 2) continue;
    roads.push({ type: 'Feature', properties: clean({ id: e.id, cls: cls(t.highway), link: t.highway.endsWith('_link') ? 1 : undefined, name: t.name, name_en: t['name:en'], ref: t.ref, bridge: t.bridge && t.bridge !== 'no' ? 1 : undefined, tunnel: t.tunnel && t.tunnel !== 'no' ? 1 : undefined, layer: t.layer ? +t.layer : undefined, oneway: t.oneway === 'yes' ? 1 : undefined }), geometry: { type: 'LineString', coordinates: line } });
  }
}
write('futian-cbd-roads.geojson', fc(roads, { name: 'futian-cbd-roads', note: 'OSM highways; cls = motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service' }));

// ---------- green + water ----------
const green = [];
const kindOf = (t) => t.natural === 'water' || t.water ? 'water' : t.natural === 'wetland' ? 'wetland' : t.leisure === 'park' || t.leisure === 'garden' ? 'park' : t.leisure === 'pitch' ? 'pitch' : t.natural === 'wood' || t.landuse === 'forest' ? 'wood' : t.landuse === 'grass' || t.natural === 'grassland' || t.natural === 'scrub' ? 'grass' : t.landuse || t.natural || t.leisure;
for (const e of read('cbd-green.json').elements) {
  if (!e.geometry) continue;
  const t = e.tags || {};
  if (t.waterway) {
    for (const l of clipLine(pts(e.geometry))) { const line = roundPts(simplify(l, 2)); if (line.length > 1) green.push({ type: 'Feature', properties: clean({ id: e.id, kind: 'waterway', sub: t.waterway, name: t.name }), geometry: { type: 'LineString', coordinates: line } }); }
    continue;
  }
  if (!closed(e.geometry)) continue;
  const r = ring(pts(e.geometry), 1);
  if (!r || !inBB(ringCentroid(r))) continue;
  green.push({ type: 'Feature', properties: clean({ id: e.id, kind: kindOf(t), name: t.name, name_en: t['name:en'], area_m2: Math.round(ringAreaM2(r)) }), geometry: { type: 'Polygon', coordinates: [r] } });
}
for (const rel of read('rel-cbd.json').elements) {
  const t = rel.tags || {};
  const polys = relationPolygons(rel, 1).filter((p) => inBB(ringCentroid(p[0])));
  if (!polys.length) continue;
  green.push({ type: 'Feature', properties: clean({ id: rel.id, kind: kindOf(t), name: t.name, name_en: t['name:en'] }), geometry: { type: 'MultiPolygon', coordinates: polys } });
}
write('futian-cbd-green.geojson', fc(green, { name: 'futian-cbd-green', note: 'OSM parks, grass, woods, water, waterways; kind = park|grass|wood|water|wetland|pitch|waterway' }));

// ---------- metro (CBD window) ----------
const rail = read('cbd-rail.json').elements;
const metro = [];
for (const e of rail.filter((x) => x.type === 'way' && x.geometry && x.tags && /subway|rail|light_rail|construction/.test(x.tags.railway || ''))) {
  const t = e.tags;
  for (const l of clipLine(pts(e.geometry))) { const line = roundPts(simplify(l, 3)); if (line.length > 1) metro.push({ type: 'Feature', properties: clean({ id: e.id, kind: 'line', railway: t.railway, tunnel: t.tunnel === 'yes' || t.location === 'underground' ? 1 : undefined, name: t.name, colour: t.colour }), geometry: { type: 'LineString', coordinates: line } }); }
}
// stations: merge nodes with the same name within 300 m
const st = [];
for (const e of rail.filter((x) => x.type === 'node' && x.tags && x.tags.railway === 'station')) st.push({ name: e.tags.name, en: e.tags['name:en'], p: [e.lon, e.lat] });
for (const e of rail.filter((x) => x.type === 'way' && x.geometry && x.tags && (x.tags.railway === 'station' || x.tags.station === 'subway'))) { const r = ring(pts(e.geometry), 2); if (r) st.push({ name: e.tags.name, en: e.tags['name:en'], p: ringCentroid(r) }); }
const KX = 102.7, KY = 110.57; // km per degree near 22.54N
const groups = [];
for (const s of st) {
  const g = groups.find((g) => g.name === s.name && Math.hypot((g.p[0] - s.p[0]) * KX, (g.p[1] - s.p[1]) * KY) < 0.4);
  if (g) { g.n++; g.p = [(g.p[0] * (g.n - 1) + s.p[0]) / g.n, (g.p[1] * (g.n - 1) + s.p[1]) / g.n]; } else groups.push({ ...s, n: 1 });
}
for (const g of groups) if (inBB(g.p)) metro.push({ type: 'Feature', properties: clean({ kind: 'station', name: g.name, name_en: g.en }), geometry: { type: 'Point', coordinates: [r5(g.p[0]), r5(g.p[1])] } });
write('futian-cbd-metro.geojson', fc(metro, { name: 'futian-cbd-metro', note: 'OSM railway=subway lines (and construction) + merged station points. Line names/colours are not on the way objects; see shenzhen-metro.geojson for the route lines' }));

// ---------- Energy Mansion parcel + towers ----------
const site = read('site.json').elements.filter((e) => e.geometry);
const byId = Object.fromEntries(site.map((e) => [e.id, e]));
const parcel = ring(pts(byId[776897369].geometry), 0);
const parcelArea = ringAreaM2(parcel);
const mk = (id, role, extra) => {
  const e = byId[id]; const t = e.tags || {};
  const r = ring(pts(e.geometry), 0);
  return { type: 'Feature', properties: clean({ role, osm_way: id, name: t.name, name_en: t['name:en'], height_m: num(t.height), levels: num(t['building:levels']), footprint_m2: Math.round(ringAreaM2(r)), ...extra }), geometry: { type: 'Polygon', coordinates: [r] } };
};
const em = [
  { type: 'Feature', properties: { role: 'parcel', osm_way: 776897369, name: '深圳能源大厦 (B119-0053, OSM landuse outline)', area_m2_osm: Math.round(parcelArea), area_m2_official: 6427.7, note: 'OSM outline vs official 宗地面积 6,427.7 m2 (深圳能源 2008 公告); coverage 65.05% official' }, geometry: { type: 'Polygon', coordinates: [parcel] } },
  mk(776897365, 'north_tower', { height_ctbuh_m: 218, tip_m: 219.1, floors_ctbuh: 43 }),
  mk(776897366, 'south_tower', { height_wikipedia_m: 110, note: 'height 111.3 in OSM; zh-wiki 110 m roof / 111.1 tip' }),
  mk(776897367, 'podium', {}),
  { type: 'Feature', properties: { role: 'centroid', name: '深圳能源大厦', name_en: 'Shenzhen Energy Mansion', address: '福田区金田路2026号 (滨河大道与金田路交汇处东北角)' }, geometry: { type: 'Point', coordinates: ringCentroid(parcel) } },
];
console.log('parcel area (OSM outline) m2', Math.round(parcelArea), 'centroid', ringCentroid(parcel), 'N tower footprint', em[1].properties.footprint_m2, 'S tower', em[2].properties.footprint_m2, 'podium', em[3].properties.footprint_m2);
write('energy-mansion.geojson', fc(em, { name: 'energy-mansion', note: 'WGS-84. OSM footprints; official numbers in properties where given' }));

// ---------- Futian CBD boundary, approximated from the four named boundary roads ----------
// 法定图则 boundary: 西 新洲路, 东 彩田路, 南 滨河大道, 北 红荔路.  Built from OSM road centre lines; approximation only.
const roadLines = (name, hws) => read('cbd-roads.json').elements.filter((e) => e.geometry && e.tags && e.tags.name === name && hws.includes(e.tags.highway)).map((e) => pts(e.geometry));
const segInt = (a, b, c, d) => { const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]); if (!den) return null; const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] : null; };
const inter = (L1, L2) => { const hits = []; for (const l1 of L1) for (let i = 0; i < l1.length - 1; i++) for (const l2 of L2) for (let j = 0; j < l2.length - 1; j++) { const p = segInt(l1[i], l1[i + 1], l2[j], l2[j + 1]); if (p) hits.push(p); } if (!hits.length) return null; return [hits.reduce((s, p) => s + p[0], 0) / hits.length, hits.reduce((s, p) => s + p[1], 0) / hits.length]; };
const N = roadLines('红荔路', ['primary']), S = roadLines('滨河大道', ['trunk']), W = roadLines('新洲路', ['primary']), E = roadLines('彩田路', ['primary']);
const NW = inter(N, W), NE = inter(N, E), SW = inter(S, W), SE = inter(S, E);
console.log('corners', NW, NE, SE, SW);
function edge(lines, A, B) { // mean of road vertices between corners A and B, binned along A->B
  const ax = (B[0] - A[0]) * KX, ay = (B[1] - A[1]) * KY, L2 = ax * ax + ay * ay, bins = 24, acc = Array.from({ length: bins }, () => ({ n: 0, x: 0, y: 0 }));
  for (const l of lines) for (const p of l) { const dx = (p[0] - A[0]) * KX, dy = (p[1] - A[1]) * KY; const t = (dx * ax + dy * ay) / L2; const perp = Math.abs(dx * ay - dy * ax) / Math.sqrt(L2); if (t > 0.01 && t < 0.99 && perp < 0.15) { const b = Math.min(bins - 1, Math.floor(t * bins)); acc[b].n++; acc[b].x += p[0]; acc[b].y += p[1]; } }
  return acc.filter((a) => a.n).map((a) => [a.x / a.n, a.y / a.n]);
}
let cbd = null;
if (NW && NE && SE && SW) {
  const poly = [NW, ...edge(N, NW, NE), NE, ...edge(E, NE, SE), SE, ...edge(S, SE, SW), SW, ...edge(W, SW, NW), NW];
  const r = ring(poly.map((p) => [p[0], p[1]]), 5);
  const a = ringAreaM2(r);
  console.log('CBD boundary approx area km2', (a / 1e6).toFixed(2));
  cbd = { type: 'Feature', properties: { name: '福田中心区 (approx.)', name_en: 'Futian CBD (approx. from road centre lines)', area_km2_approx: +(a / 1e6).toFixed(2), basis: '法定图则 福田01-01&02号片区(中心区): W 新洲路, E 彩田路, S 滨河大道, N 红荔路', note: 'approximation from OSM centre lines; not the official 法定图则 boundary' }, geometry: { type: 'Polygon', coordinates: [r] } };
  write('futian-cbd-boundary.geojson', fc([cbd], { name: 'futian-cbd-boundary' }));
}
