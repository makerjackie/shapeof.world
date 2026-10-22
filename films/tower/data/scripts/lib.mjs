// Shared helpers for the tower map data build. Plain ES module, no dependencies.

const LAT0 = 22.54; // Shenzhen latitude, for local metre projection
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 110574;

export const r5 = (x) => Math.round(x * 1e5) / 1e5;

// ---------- GCJ-02 <-> WGS-84 ----------
const A = 6378245.0;
const EE = 0.00669342162296594323;
const outOfChina = (lon, lat) => lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
function tLat(x, y) {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  r += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  return r;
}
function tLon(x, y) {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  r += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  return r;
}
export function wgs2gcj([lon, lat]) {
  if (outOfChina(lon, lat)) return [lon, lat];
  let dLat = tLat(lon - 105, lat - 35);
  let dLon = tLon(lon - 105, lat - 35);
  const rad = (lat / 180) * Math.PI;
  let magic = Math.sin(rad);
  magic = 1 - EE * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sq)) * Math.PI);
  dLon = (dLon * 180) / ((A / sq) * Math.cos(rad) * Math.PI);
  return [lon + dLon, lat + dLat];
}
export function gcj2wgs([lon, lat]) {
  let w = [lon, lat];
  for (let i = 0; i < 8; i++) {
    const g = wgs2gcj(w);
    w = [w[0] - (g[0] - lon), w[1] - (g[1] - lat)];
  }
  return w;
}

// ---------- geometry ----------
const toM = ([lon, lat]) => [lon * KX, lat * KY];

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Douglas-Peucker on [lon,lat] points, tolerance in metres.
export function simplify(pts, tolM) {
  if (pts.length <= 2 || !tolM) return pts;
  const m = pts.map(toM);
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(m[i], m[s], m[e]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolM) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function roundPts(pts) {
  const out = [];
  for (const p of pts) {
    const q = [r5(p[0]), r5(p[1])];
    const l = out[out.length - 1];
    if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push(q);
  }
  return out;
}

export function ring(pts, tolM = 0) {
  // closed ring: simplify open part, keep closure
  let p = pts.slice(0, -1);
  if (tolM && p.length > 4) {
    // split ring at furthest-from-start point so DP is stable
    let fi = 0, fd = 0;
    const m0 = toM(p[0]);
    p.forEach((q, i) => { const d = Math.hypot(toM(q)[0] - m0[0], toM(q)[1] - m0[1]); if (d > fd) { fd = d; fi = i; } });
    const a = simplify(p.slice(0, fi + 1), tolM);
    const b = simplify([...p.slice(fi), p[0]], tolM);
    p = [...a, ...b.slice(1, -1)];
  }
  p = roundPts(p);
  if (p.length < 3) return null;
  p.push(p[0]);
  return p;
}

// planar polygon area in m^2 for a [lon,lat] ring
export function ringAreaM2(r) {
  const m = r.map(toM);
  let s = 0;
  for (let i = 0; i < m.length - 1; i++) s += m[i][0] * m[i + 1][1] - m[i + 1][0] * m[i][1];
  return Math.abs(s) / 2;
}
export function ringCentroid(r) {
  const m = r.map(toM);
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < m.length - 1; i++) {
    const f = m[i][0] * m[i + 1][1] - m[i + 1][0] * m[i][1];
    a += f; cx += (m[i][0] + m[i + 1][0]) * f; cy += (m[i][1] + m[i + 1][1]) * f;
  }
  a /= 2;
  if (!a) return r[0];
  return [r5(cx / (6 * a) / KX), r5(cy / (6 * a) / KY)];
}

// ---------- Overpass -> GeoJSON ----------
const geomPts = (g) => g.map((p) => [p.lon, p.lat]);
const isClosed = (g) => g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;

// join way fragments into closed rings
export function assembleRings(frags) {
  const rings = [];
  let rest = frags.map((f) => f.slice());
  while (rest.length) {
    let cur = rest.shift();
    let guard = 0;
    while (!(cur.length > 3 && eq(cur[0], cur[cur.length - 1])) && guard++ < 10000) {
      const end = cur[cur.length - 1];
      let found = -1, rev = false;
      for (let i = 0; i < rest.length; i++) {
        if (eq(rest[i][0], end)) { found = i; break; }
        if (eq(rest[i][rest[i].length - 1], end)) { found = i; rev = true; break; }
      }
      if (found < 0) break;
      let nxt = rest.splice(found, 1)[0];
      if (rev) nxt = nxt.slice().reverse();
      cur = cur.concat(nxt.slice(1));
    }
    if (cur.length > 3 && eq(cur[0], cur[cur.length - 1])) rings.push(cur);
  }
  return rings;
}
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

export function relationPolygons(rel, tolM = 0) {
  const outer = [], inner = [];
  for (const m of rel.members || []) {
    if (m.type !== 'way' || !m.geometry) continue;
    (m.role === 'inner' ? inner : outer).push(geomPts(m.geometry));
  }
  const o = assembleRings(outer).map((r) => ring(r, tolM)).filter(Boolean);
  const i = assembleRings(inner).map((r) => ring(r, tolM)).filter(Boolean);
  // assign each inner ring to the outer ring containing its first point
  const polys = o.map((r) => [r]);
  for (const h of i) {
    const k = o.findIndex((r) => pip(h[0], r));
    if (k >= 0) polys[k].push(h);
  }
  return polys;
}

export function pip(pt, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function wayGeom(e, { polygon, tolM = 0 } = {}) {
  const pts = geomPts(e.geometry);
  if (polygon && isClosed(e.geometry)) {
    const r = ring(pts, tolM);
    return r ? { type: 'Polygon', coordinates: [r] } : null;
  }
  const l = roundPts(simplify(pts, tolM));
  return l.length >= 2 ? { type: 'LineString', coordinates: l } : null;
}

export const fc = (features, meta = {}) => ({ type: 'FeatureCollection', ...meta, features });
export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
