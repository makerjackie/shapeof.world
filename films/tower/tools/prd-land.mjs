// Land of the Pearl River Delta from the OSM coastline (ODbL), for the title shot, so no city-boundary data with
// licence limits is needed. Same method as data/scripts/build-land.mjs: chain the coastline ways (land on the
// left), clip them to the box, close the open pieces along the box edge.
// Usage: node tools/prd-land.mjs [rawDir]  (reads $RAW/prd-coast.json from tools/fetch-geo.sh, writes $RAW/prd-land.json)
import fs from "node:fs";

const RAW = process.argv[2] || "/tmp/towerv2-raw";
export const PRD_BBOX = [112.3, 21.8, 115.6, 23.75]; // minx, miny, maxx, maxy (same as the Overpass query)

const coast = JSON.parse(fs.readFileSync(`${RAW}/prd-coast.json`, "utf8"))
  .elements.filter((e) => e.geometry)
  .map((e) => e.geometry.map((p) => [p.lon, p.lat]));
const key = (p) => p[0] + "," + p[1];

// chain ways end-to-start
const startMap = new Map();
coast.forEach((w, i) => startMap.set(key(w[0]), i));
const used = new Set();
const hasPrev = new Set();
coast.forEach((w) => {
  const j = startMap.get(key(w[w.length - 1]));
  if (j !== undefined) hasPrev.add(j);
});
const chains = [];
const walk = (i) => {
  let c = coast[i].slice();
  used.add(i);
  for (;;) {
    const j = startMap.get(key(c[c.length - 1]));
    if (j === undefined || used.has(j)) break;
    used.add(j);
    c = c.concat(coast[j].slice(1));
  }
  chains.push(c);
};
coast.forEach((_, i) => {
  if (!hasPrev.has(i) && !used.has(i)) walk(i);
});
coast.forEach((_, i) => {
  if (!used.has(i)) walk(i);
});

const [x0, y0, x1, y1] = PRD_BBOX;
const W = x1 - x0;
const H = y1 - y0;
const PER = 2 * (W + H);
const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
// position along the box perimeter, counter-clockwise from the bottom-left corner
const tOf = (p) => {
  const eps = 1e-9;
  if (Math.abs(p[1] - y0) < eps) return p[0] - x0;
  if (Math.abs(p[0] - x1) < eps) return W + (p[1] - y0);
  if (Math.abs(p[1] - y1) < eps) return W + H + (x1 - p[0]);
  return 2 * W + H + (y1 - p[1]);
};
const clipSeg = (a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, a[0] - x0],
    [dx, x1 - a[0]],
    [-dy, a[1] - y0],
    [dy, y1 - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [t0, t1];
};
const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const pieces = [];
const islands = [];
for (const c of chains) {
  const closed = c.length > 3 && key(c[0]) === key(c[c.length - 1]);
  if (closed && c.every(inside)) {
    islands.push(c);
    continue;
  }
  let cur = null;
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i];
    const b = c[i + 1];
    const cl = clipSeg(a, b);
    if (!cl) {
      if (cur) {
        pieces.push(cur);
        cur = null;
      }
      continue;
    }
    const pa = at(a, b, cl[0]);
    const pb = at(a, b, cl[1]);
    if (!cur || cl[0] > 0) {
      if (cur) pieces.push(cur);
      cur = [pa];
    }
    cur.push(pb);
    if (cl[1] < 1) {
      pieces.push(cur);
      cur = null;
    }
  }
  if (cur) pieces.push(cur);
}
const snap = (p) => {
  const q = p.slice();
  for (const [i, v] of [
    [0, x0],
    [0, x1],
    [1, y0],
    [1, y1],
  ])
    if (Math.abs(q[i] - v) < 1e-9) q[i] = v;
  return q;
};
pieces.forEach((pc) => {
  pc[0] = snap(pc[0]);
  pc[pc.length - 1] = snap(pc[pc.length - 1]);
});
const open = pieces.filter((p) => !(key(p[0]) === key(p[p.length - 1])) && p.length > 1);
const corners = [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const cornerT = [0, W, W + H, 2 * W + H];
const rings = [];
const usedP = new Set();
for (let s = 0; s < open.length; s++) {
  if (usedP.has(s)) continue;
  let pts = [];
  let i = s;
  for (let guard = 0; guard < 5000; guard++) {
    usedP.add(i);
    pts = pts.concat(open[i]);
    const te = tOf(open[i][open[i].length - 1]);
    let best = -1;
    let bd = 1e9;
    open.forEach((p, j) => {
      let d = (tOf(p[0]) - te + PER) % PER;
      if (d < 1e-12) d = PER;
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    cornerT
      .map((t, k) => [(t - te + PER) % PER, k])
      .filter(([d]) => d > 1e-12 && d < bd)
      .sort((a, b) => a[0] - b[0])
      .forEach(([, k]) => pts.push(corners[k]));
    if (best === s || usedP.has(best)) break;
    i = best;
  }
  pts.push(pts[0]);
  rings.push(pts);
}
const cw = (r) => {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return s < 0;
};
const land = [...rings, ...islands.filter((r) => !cw(r))];
const lakes = islands.filter((r) => cw(r));
// The OSM coastline here has gaps (the estuary and river mouths), so the closed land polygons are not reliable; the
// film draws the chains themselves as the coast.
fs.writeFileSync(`${RAW}/prd-land.json`, JSON.stringify({ bbox: PRD_BBOX, land, lakes, chains }));
console.log("prd land: chains", chains.length, "open", open.length, "rings", rings.length, "islands", islands.length, "lakes", lakes.length);
