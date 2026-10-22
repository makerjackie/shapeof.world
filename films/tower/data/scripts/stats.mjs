// Derived numbers used in research/06-map-and-planning.md (run after the build scripts).
// Usage: node stats.mjs <DATA dir>
import fs from 'fs';
import { pip, ringAreaM2 } from './lib.mjs';
const D = process.argv[2] || '..';
const rd = (f) => JSON.parse(fs.readFileSync(`${D}/${f}`));
const KX = 102700, KY = 110570;
const dist = (a, b) => Math.hypot((a[0] - b[0]) * KX, (a[1] - b[1]) * KY);
const towers = rd('shenzhen-towers-ctbuh.geojson').features.filter((f) => f.properties.status === 'COM');
const cbd = rd('futian-cbd-boundary.geojson').features[0].geometry.coordinates[0];
const districts = rd('shenzhen-districts.geojson').features;
const dv = rd('alt-shenzhen-districts-datav.geojson').features;
const lm = rd('landmarks.geojson').features;
const L = (n) => lm.find((f) => f.properties.name.startsWith(n)).geometry.coordinates;

// towers inside the (approximate) CBD polygon
const inCbd = towers.filter((f) => pip(f.geometry.coordinates, cbd));
const n = (arr, h) => arr.filter((f) => f.properties.height_m >= h).length;
console.log('CBD polygon area km2', (ringAreaM2(cbd) / 1e6).toFixed(2));
console.log('CTBUH COM towers inside approx CBD polygon: >=150', n(inCbd, 150), '>=200', n(inCbd, 200), '>=300', n(inCbd, 300));
const by = {}; for (const f of inCbd) if (f.properties.height_m >= 200 && f.properties.year) by[f.properties.year] = (by[f.properties.year] || 0) + 1;
console.log('CBD 200m+ by completion year', JSON.stringify(by));
const rank = inCbd.filter((f) => f.properties.height_m >= 200).sort((a, b) => b.properties.height_m - a.properties.height_m);
const i = rank.findIndex((f) => f.properties.ctbuh_id === 14295);
console.log('Energy Mansion North Tower rank among CBD 200m+:', i + 1, 'of', rank.length);
console.log('CBD 200m+ list:', rank.map((f) => `${f.properties.name_en} ${f.properties.height_m}m ${f.properties.year}`).join('; '));

// towers per district (OSM land polygons clipped; fall back to nearest DataV admin polygon for reclaimed coast)
const cnt = {};
for (const f of towers) {
  const p = f.geometry.coordinates;
  let hit = districts.find((d) => d.geometry.coordinates.some((poly) => pip(p, poly[0])));
  if (!hit) hit = dv.find((d) => d.geometry.coordinates.some((poly) => pip(p, poly[0])));
  const k = hit ? hit.properties.name : 'outside Shenzhen';
  cnt[k] = cnt[k] || { n150: 0, n200: 0, n300: 0 };
  cnt[k].n150++; if (f.properties.height_m >= 200) cnt[k].n200++; if (f.properties.height_m >= 300) cnt[k].n300++;
}
console.log('COM towers per district (CTBUH, point in polygon):', JSON.stringify(cnt));

// distances from the Energy Mansion
const em = L('深圳能源大厦');
for (const k of ['平安金融中心', '市民中心', '深圳会展中心', '莲花山', '深圳市少年宫', '福田高铁站', '卓越世纪中心', '京基100', '华润大厦', '腾讯滨海大厦']) console.log('Energy Mansion ->', k, (dist(em, L(k)) / 1000).toFixed(2), 'km');
const st = rd('shenzhen-metro.geojson').features.filter((f) => f.properties.kind === 'station').map((f) => [f.properties.name, dist(em, f.geometry.coordinates)]).sort((a, b) => a[1] - b[1]).slice(0, 5);
console.log('nearest metro stations:', st.map((s) => `${s[0]} ${Math.round(s[1])}m`).join(', '));
const bd = rd('futian-cbd-buildings.geojson').features;
console.log('CBD window buildings', bd.length, 'with h', bd.filter((f) => f.properties.h).length, 'ctbuh-matched', bd.filter((f) => f.properties.ctbuh_id).length, 'roof canopies', bd.filter((f) => f.properties.kind === 'roof').length);
