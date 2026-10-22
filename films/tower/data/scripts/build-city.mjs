// Build city-scale layers: metro, major roads, Futian district roads/green, Guangdong cities, CTBUH towers, landmarks.
// Inputs (raw, not committed): RAW/{adm-geom,metro-rel,stations-b,roads-major,fut-roads,fut-green,dv-440000_full,dv-810000,dv-820000,coast,ctbuh_sz,lm}.json
// Usage: node build-city.mjs <RAW dir> <OUT dir>
import fs from 'fs';
import pc from 'polygon-clipping';
import { ring, relationPolygons, ringAreaM2, ringCentroid, simplify, roundPts, r5, fc, clean, pip, gcj2wgs } from './lib.mjs';

const RAW = process.argv[2] || '/tmp/towergeo';
const OUT = process.argv[3] || '..';
const read = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`));
const write = (name, obj) => { fs.writeFileSync(`${OUT}/${name}`, typeof obj === 'string' ? obj : JSON.stringify(obj)); console.log(name, fs.statSync(`${OUT}/${name}`).size, 'bytes', obj.features ? obj.features.length + ' features' : ''); };
const pts = (g) => g.map((p) => [p.lon, p.lat]);
const closed = (g) => g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
const KX = 102700, KY = 110570;

// Shenzhen administrative polygon from OSM (includes territorial sea) for point-in-city tests
const szRel = read('adm-geom.json').elements.find((e) => e.tags.name === '深圳市');
const szPolys = relationPolygons(szRel, 30);
const inSZ = (p) => szPolys.some((poly) => pip(p, poly[0]) && !poly.slice(1).some((h) => pip(p, h)));

// ---------- metro lines ----------
const rels = read('metro-rel.json').elements.filter((r) => r.tags && /深圳地铁/.test(r.tags.network || ''));
const wayRefs = new Map(); // way id -> {geometry, refs:Set, colour}
for (const r of rels) {
  const ref = r.tags.ref === '2;8' ? '2&8' : r.tags.ref;
  for (const m of r.members || []) {
    if (m.type !== 'way' || !m.geometry || (m.role && m.role !== '')) continue;
    const w = wayRefs.get(m.ref) || { geometry: m.geometry, refs: new Set(), colour: r.tags.colour };
    w.refs.add(ref); wayRefs.set(m.ref, w);
  }
}
const metroLines = [];
for (const [id, w] of wayRefs) {
  const line = roundPts(simplify(pts(w.geometry), 8));
  if (line.length < 2) continue;
  metroLines.push({ type: 'Feature', properties: { id, line: [...w.refs].sort().join('/'), colour: w.colour }, geometry: { type: 'LineString', coordinates: line } });
}
const lineRefs = [...new Set(rels.map((r) => (r.tags.ref === '2;8' ? '2&8' : r.tags.ref)))].sort();
// stations
let stations = [];
if (fs.existsSync(`${RAW}/stations-b.json`)) {
  const raw = read('stations-b.json').elements.filter((e) => e.tags && e.tags.name);
  for (const e of raw) {
    const p = [e.lon, e.lat];
    if (!inSZ(p)) continue;
    const g = stations.find((s) => s.name === e.tags.name && Math.hypot((s.p[0] - p[0]) * KX, (s.p[1] - p[1]) * KY) < 500);
    if (g) continue;
    stations.push({ name: e.tags.name, en: e.tags['name:en'], wd: e.tags.wikidata, p });
  }
}
const metroFeats = [...metroLines, ...stations.map((s) => ({ type: 'Feature', properties: clean({ kind: 'station', name: s.name, name_en: s.en, wikidata: s.wd }), geometry: { type: 'Point', coordinates: [r5(s.p[0]), r5(s.p[1])] } }))];
console.log('metro refs in OSM:', lineRefs.join(','), '| ways', metroLines.length, '| stations', stations.length);
write('shenzhen-metro.geojson', fc(metroFeats, { name: 'shenzhen-metro', note: 'OSM route=subway relations of 深圳地铁 (track ways deduplicated; line = line number(s), colour = hex) + station points. OSM may lag the real network: lines present: ' + lineRefs.join(',') }));

// ---------- major roads, Shenzhen ----------
const major = [];
for (const e of read('roads-major.json').elements) {
  if (!e.geometry || e.geometry.length < 2) continue;
  const mid = e.geometry[Math.floor(e.geometry.length / 2)];
  if (!inSZ([mid.lon, mid.lat])) continue;
  const t = e.tags || {};
  if (t.highway === 'primary') continue; // primary roads: see futian-district-roads / futian-cbd-roads
  const line = roundPts(simplify(pts(e.geometry), 60));
  if (line.length < 2) continue;
  major.push({ type: 'Feature', properties: clean({ cls: t.highway, name: t.name, ref: t.ref }), geometry: { type: 'LineString', coordinates: line } });
}
write('shenzhen-roads-major.geojson', fc(major, { name: 'shenzhen-roads-major', note: 'OSM motorway + trunk inside the Shenzhen admin area, simplified to 60 m (primary roads omitted at city scale)' }));

// ---------- Futian district roads + green ----------
const FB = [113.98, 22.49, 114.12, 22.60];
function clip(line, BB) {
  const out = []; let cur = null; const [x0, y0, x1, y1] = BB;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1]; const dx = b[0] - a[0], dy = b[1] - a[1]; let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } } else { const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } }
    }
    if (!ok) { if (cur) { out.push(cur); cur = null; } continue; }
    const pa = [a[0] + dx * t0, a[1] + dy * t0], pb = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur || t0 > 0) { if (cur) out.push(cur); cur = [pa]; }
    cur.push(pb); if (t1 < 1) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((l) => l.length > 1);
}
const fut = [];
for (const e of read('fut-roads.json').elements) {
  if (!e.geometry) continue; const t = e.tags || {};
  for (const l of clip(pts(e.geometry), FB)) { const line = roundPts(simplify(l, 8)); if (line.length > 1) fut.push({ type: 'Feature', properties: clean({ cls: t.highway.replace('_link', ''), link: t.highway.endsWith('_link') ? 1 : undefined, name: t.name, ref: t.ref, bridge: t.bridge && t.bridge !== 'no' ? 1 : undefined, tunnel: t.tunnel && t.tunnel !== 'no' ? 1 : undefined }), geometry: { type: 'LineString', coordinates: line } }); }
}
write('futian-district-roads.geojson', fc(fut, { name: 'futian-district-roads', bbox: FB, note: 'OSM motorway..secondary in 113.98-114.12 E, 22.49-22.60 N (Futian district + Shenzhen Bay shore), simplified to 8 m' }));

const kindOf = (t) => t.natural === 'water' || t.water ? 'water' : t.natural === 'wetland' ? 'wetland' : t.leisure === 'park' ? 'park' : t.leisure === 'nature_reserve' ? 'reserve' : t.natural === 'wood' || t.landuse === 'forest' ? 'wood' : t.landuse === 'grass' ? 'grass' : t.natural || t.landuse || t.leisure;
const green = [];
const MINA = 20000;
for (const e of read('fut-green.json').elements) {
  const t = e.tags || {};
  if (e.type === 'way' && e.geometry && closed(e.geometry)) {
    const r = ring(pts(e.geometry), 6); if (!r) continue; const a = ringAreaM2(r); if (a < MINA) continue;
    green.push({ type: 'Feature', properties: clean({ kind: kindOf(t), name: t.name, name_en: t['name:en'], area_m2: Math.round(a) }), geometry: { type: 'Polygon', coordinates: [r] } });
  } else if (e.type === 'relation') {
    const polys = relationPolygons(e, 6).filter((p) => ringAreaM2(p[0]) >= MINA);
    if (polys.length) green.push({ type: 'Feature', properties: clean({ kind: kindOf(t), name: t.name, name_en: t['name:en'] }), geometry: { type: 'MultiPolygon', coordinates: polys } });
  }
}
// clip non-water polygons to land (the OSM nature-reserve / wetland outlines run out into Shenzhen Bay)
const landMask = JSON.parse(fs.readFileSync(`${OUT}/land-mask.geojson`)).features[0].geometry.coordinates
  .filter((poly) => { const xs = poly[0].map((p) => p[0]), ys = poly[0].map((p) => p[1]); return Math.max(...xs) >= FB[0] && Math.min(...xs) <= FB[2] && Math.max(...ys) >= FB[1] && Math.min(...ys) <= FB[3]; });
for (const f of green) {
  if (f.properties.kind === 'water') continue;
  const mp = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const cl = pc.intersection(mp, landMask).map((poly) => poly.map((r) => ring(r, 0)).filter(Boolean)).filter((p) => p.length && ringAreaM2(p[0]) >= MINA);
  f.geometry = { type: 'MultiPolygon', coordinates: cl };
}
const greenClipped = green.filter((f) => f.geometry.coordinates.length);
write('futian-district-green.geojson', fc(greenClipped, { name: 'futian-district-green', bbox: FB, note: 'OSM parks, nature reserves, woods, water and wetlands >= 2 ha in the same window; simplified to 6 m; non-water polygons clipped to the OSM coastline' }));

// ---------- Guangdong cities + HK + Macau (DataV / AMap) ----------
// coastline segments for datum check
const KXc = KX, KYc = KY;
const segs = [];
for (const e of read('coast.json').elements) if (e.geometry) for (let i = 0; i < e.geometry.length - 1; i += 3) { const a = e.geometry[i], b = e.geometry[Math.min(i + 3, e.geometry.length - 1)]; segs.push([a.lon * KXc, a.lat * KYc, b.lon * KXc, b.lat * KYc]); }
const dcoast = (p) => { const x = p[0] * KXc, y = p[1] * KYc; let best = 1e9; for (const s of segs) { const dx = s[2] - s[0], dy = s[3] - s[1]; const l2 = dx * dx + dy * dy; let t = l2 ? ((x - s[0]) * dx + (y - s[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(x - (s[0] + t * dx), y - (s[1] + t * dy)); if (d < best) best = d; } return best; };
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
function datumCheck(fc0) { // sample HK vertices near OSM coast: raw vs converted
  const raw = [], conv = [];
  for (const f of fc0.features) for (const poly of f.geometry.coordinates) for (const r of poly) for (let i = 0; i < r.length; i += 7) { const p = r[i]; if (p[0] > 113.85 && p[0] < 114.45 && p[1] > 22.15 && p[1] < 22.45) { const d0 = dcoast(p); if (d0 < 1500) { raw.push(d0); conv.push(dcoast(gcj2wgs(p))); } } }
  return { n: raw.length, raw: med(raw), conv: med(conv) };
}
const gd = read('dv-440000_full.json'), hk = read('dv-810000.json'), mo = read('dv-820000.json');
const hkc = datumCheck(hk);
console.log('HK DataV datum check (median m to OSM coast): n', hkc.n, 'as-is', Math.round(hkc.raw), 'if GCJ->WGS', Math.round(hkc.conv));
const hkIsGcj = hkc.n > 20 && hkc.conv < hkc.raw;
const conv = (f, gcj) => f.geometry.coordinates.map((poly) => poly.map((r) => { const rr = gcj ? r.map(gcj2wgs) : r; return ring(rr, 100); }).filter(Boolean)).filter((p) => p.length);
const gdFeats = gd.features.map((f) => ({ type: 'Feature', properties: { adcode: f.properties.adcode, name: f.properties.name, level: 'city' }, geometry: { type: 'MultiPolygon', coordinates: conv(f, true) } }));
gdFeats.push({ type: 'Feature', properties: { adcode: 810000, name: '香港特别行政区', level: 'sar', datum_converted_from_gcj02: hkIsGcj }, geometry: { type: 'MultiPolygon', coordinates: conv(hk.features[0], hkIsGcj) } });
gdFeats.push({ type: 'Feature', properties: { adcode: 820000, name: '澳门特别行政区', level: 'sar', datum_converted_from_gcj02: hkIsGcj }, geometry: { type: 'MultiPolygon', coordinates: conv(mo.features[0], hkIsGcj) } });
write('guangdong-cities-datav.geojson', fc(gdFeats, { name: 'guangdong-cities-datav', crs_note: 'WGS-84 (mainland polygons converted from GCJ-02; HK/Macau datum per property), simplified to 100 m; boundaries include coastal waters', licence_note: 'DataV.GeoAtlas / AMap data: 仅供学习和交流使用 - see README' }));

// ---------- CTBUH towers (facts only) ----------
const cb = read('ctbuh_sz.json');
const useOf = (t) => [t.main_use_01, t.main_use_02, t.main_use_03].filter(Boolean).join('/');
const towers = [];
const byYear = {};
for (const t of cb) {
  const h = +t.height_architecture; if (!(h >= 150)) continue;
  const com = t.status === 'COM';
  if (!com && !(h >= 200 && (t.status === 'UC' || t.status === 'STO'))) continue;
  towers.push({ type: 'Feature', properties: clean({ ctbuh_id: t.id, name_en: t.name_intl, name_zh: t.name_chinese || t.name_local || undefined, height_m: Math.round(h * 10) / 10, floors: t.floors_above || undefined, year: com && t.completed ? +t.completed : undefined, status: t.status, use: useOf(t) || undefined, gfa_m2: t.gross_floor_area ? +t.gross_floor_area : undefined }), geometry: { type: 'Point', coordinates: [r5(+t.longitude), r5(+t.latitude)] } });
  if (com && t.completed) { const y = +t.completed; byYear[y] = byYear[y] || { n150: 0, n200: 0, n300: 0 }; byYear[y].n150++; if (h >= 200) byYear[y].n200++; if (h >= 300) byYear[y].n300++; }
}
write('shenzhen-towers-ctbuh.geojson', fc(towers, { name: 'shenzhen-towers-ctbuh', note: 'CTBUH Skyscraper Center facts, retrieved 2026-10-22 from /city/shenzhen. status COM=completed (>=150 m), UC=under construction, STO=structurally topped out (>=200 m only). Coordinates are WGS-84 (match OSM within ~10 m)' }));
const years = []; for (let y = 1985; y <= 2026; y++) years.push(y);
let c150 = 0, c200 = 0, c300 = 0;
const series = years.map((y) => { const b = byYear[y] || { n150: 0, n200: 0, n300: 0 }; c150 += b.n150; c200 += b.n200; c300 += b.n300; return { year: y, new150: b.n150, new200: b.n200, new300: b.n300, cum150: c150, cum200: c200, cum300: c300 }; });
write('shenzhen-skyline-by-year.json', JSON.stringify({ source: 'CTBUH Skyscraper Center, Shenzhen city page, retrieved 2026-10-22; completed (COM) buildings only, architectural height. cum150 excludes 7 buildings >=150 m that CTBUH lists without a completion year (CTBUH total 472)', series }, null, 0).replace(/\},\{/g, '},\n{'));
console.log('cum at 2017', JSON.stringify(series.find((s) => s.year === 2017)), 'end', JSON.stringify(series[series.length - 1]));

// ---------- landmarks ----------
const lm = read('lm.json').elements;
const lmC = (type, id) => { const e = lm.find((x) => x.type === type && x.id === id); return e && (e.center ? [e.center.lon, e.center.lat] : [e.lon, e.lat]); };
const cbById = Object.fromEntries(cb.map((t) => [t.id, t]));
const ct = (id) => [r5(+cbById[id].longitude), r5(+cbById[id].latitude)];
const stationBy = (name) => { const s = stations.find((x) => x.name === name); return s ? [r5(s.p[0]), r5(s.p[1])] : null; };
const em = JSON.parse(fs.readFileSync(`${OUT}/energy-mansion.geojson`));
const emC = em.features.find((f) => f.properties.role === 'centroid').geometry.coordinates;
const cbdB = JSON.parse(fs.readFileSync(`${OUT}/futian-cbd-boundary.geojson`)).features[0].geometry.coordinates[0];
const L = [];
const add = (name, name_en, kind, p, extra = {}) => { if (p) L.push({ type: 'Feature', properties: clean({ name, name_en, kind, ...extra }), geometry: { type: 'Point', coordinates: [r5(p[0]), r5(p[1])] } }); };
add('深圳能源大厦', 'Shenzhen Energy Mansion', 'subject', emC, { height_m: 218, source: 'OSM parcel centroid', note: '宗地 B119-0053, 福田区金田路2026号' });
add('平安金融中心', 'Ping An Finance Center', 'landmark', lmC('way', 535860513), { height_m: 599.1, source: 'OSM footprint centre' });
add('市民中心', 'Civic Center', 'landmark', lmC('relation', 10837975), { source: 'OSM relation centre (building=civic)', note: '2004-05-31 启用' });
add('深圳会展中心', 'Shenzhen Convention & Exhibition Center', 'landmark', lmC('way', 146862823), { source: 'OSM footprint centre' });
add('莲花山', 'Lotus Hill', 'landmark', lmC('node', 1889340321), { source: 'OSM natural=peak' });
add('莲花山公园', 'Lianhuashan Park', 'landmark', lmC('way', 41281446), { source: 'OSM way centre' });
add('深圳市少年宫', "Shenzhen Children's Palace", 'landmark', lmC('way', 269895570), { source: 'OSM footprint centre' });
add('深圳图书馆', 'Shenzhen Library', 'landmark', lmC('way', 146867406), { source: 'OSM' });
add('深圳音乐厅', 'Shenzhen Concert Hall', 'landmark', lmC('way', 146867409), { source: 'OSM' });
add('深圳书城中心城', 'Shenzhen Book City Central', 'landmark', lmC('way', 183019559), { source: 'OSM' });
add('福田高铁站', 'Futian Railway Station', 'landmark', lmC('node', 5271707950), { source: 'OSM' });
add('深圳中心公园', 'Shenzhen Central Park', 'landmark', lmC('relation', 17354200), { source: 'OSM relation centre' });
add('卓越世纪中心', 'Excellence Century Center', 'landmark', ct(595), { height_m: 280, source: 'CTBUH id 595 (tower 1)' });
add('大百汇广场(深圳中心)', 'Dabaihui Plaza / Shenzhen Center', 'landmark', ct(14198), { height_m: 375.55, source: 'CTBUH id 14198' });
add('京基100', 'KK100', 'landmark', ct(173), { height_m: 441.8, source: 'CTBUH id 173' });
add('华润大厦(春笋)', 'China Resources Tower', 'landmark', ct(14589), { height_m: 392.5, source: 'CTBUH id 14589' });
add('腾讯滨海大厦', 'Tencent Seafront Tower 1', 'landmark', ct(13860), { height_m: 245.78, source: 'CTBUH id 13860' });
add('深业上城T1', 'Shum Yip Upperhills Tower 1', 'landmark', ct(16001), { height_m: 388.05, source: 'CTBUH id 16001' });
add('招商银行全球总部大厦', 'China Merchants Bank Global HQ Main Tower', 'landmark', ct(42765), { height_m: 393, source: 'CTBUH id 42765' });
add('福田中心区', 'Futian CBD', 'area', ringCentroid(cbdB), { source: 'centroid of approx. boundary polygon' });
// submarkets (Knight Frank definitions, point = anchor metro station, NOT a boundary)
const sm = [['车公庙', '车公庙', 'Chegongmiao'], ['后海', '后海', 'Houhai'], ['前海', '前海湾', 'Qianhai'], ['科技园', '科苑', 'Science Park'], ['蛇口', '海上世界', 'Shekou'], ['罗湖', '国贸', 'Luohu'], ['宝安中心区', '宝安中心', "Bao'an Center"]];
for (const [n, st, en] of sm) add(n + ' (写字楼分区锚点)', en + ' submarket anchor', 'submarket_anchor', stationBy(st), { anchor_station: st, note: 'approximate: the metro station inside the submarket, not its boundary' });
add('南山粤海 K602-0016 (估算)', 'K602-0016 (estimated)', 'hq_land', [113.9383, 22.5135], { note: '科苑南路与登良路交汇处西北角, 土地9,508.38㎡; 坐标由OSM路口 (22.5131N,113.9388E) 推算, 误差约100m, 非官方', source: '澎湃 2025-10-12 + OSM' });
write('landmarks.geojson', fc(L, { name: 'landmarks', note: 'WGS-84 points; source per feature' }));
