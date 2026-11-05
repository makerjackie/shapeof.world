import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { paint } from './meet-mat.js';

// Sculpting kit for the committee: lofted body surfaces, surface strips (lapels, shirt fronts), a sculpted head,
// anime hair shells with pointed lock hems, glasses. Everything returns plain BufferGeometry (indexed, smooth).

const V = THREE.Vector3;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

// Catmull-Rom over an array of number arrays
export function crSample(arr, t) {
  const n = arr.length - 1, x = clamp(t) * n, i = Math.min(Math.floor(x), n - 1), f = x - i;
  const a = arr[Math.max(i - 1, 0)], b = arr[i], c = arr[i + 1], d = arr[Math.min(i + 2, n)];
  return b.map((_, k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * f + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f * f + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * f * f * f));
}

// Superellipse tube along local Y. secs: [y, rx, rz, cz=0, e=2.4, cx=0]. u in turns: 0 = +Z (front), .25 = +X.
// opt.shape(u, v) -> radius multiplier (bulges, seams).
export function tube(secs, opt = {}) {
  const S = secs.map((s) => [s[0], s[1], s[2], s[3] ?? 0, s[4] ?? 2.4, s[5] ?? 0]);
  const shape = opt.shape;
  const f = {
    sec: (v) => crSample(S, v),
    p(u, v, out = new V()) {
      const [y, rx, rz, cz, e, cx] = crSample(S, v);
      const a = u * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), p = 2 / e;
      const k = shape ? shape(u, v) : 1;
      return out.set(cx + k * rx * Math.sign(s) * Math.pow(Math.abs(s), p), y, cz + k * rz * Math.sign(c) * Math.pow(Math.abs(c), p));
    },
    // outward normal by finite differences
    n(u, v, out = new V()) {
      const e = 1e-3;
      const a = f.p(u + e, v), b = f.p(u - e, v), c = f.p(u, Math.min(v + e, 1)), d = f.p(u, Math.max(v - e, 0));
      const du = a.sub(b), dv = c.sub(d);
      return out.crossVectors(du, dv).normalize();
    },
  };
  return f;
}

// Mesh a tube: nu around, nv along; caps close the ends with a fan to the centre.
export function tubeGeo(T, o = {}) {
  const nu = o.nu ?? 32, nv = o.nv ?? 24;
  const pos = [], idx = [];
  const p = new V();
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i < nu; i++) { T.p(i / nu, v, p); pos.push(p.x, p.y, p.z); }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * nu + i, b = j * nu + (i + 1) % nu, c = (j + 1) * nu + i, d = (j + 1) * nu + (i + 1) % nu;
    idx.push(a, c, b, b, c, d);
  }
  const cap = (j, flip) => {
    const [y, , , cz, , cx] = T.sec(j / nv);
    const ci = pos.length / 3; pos.push(cx, y, cz);
    for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + (i + 1) % nu; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  };
  if (o.capBot !== false) cap(0, true);
  if (o.capTop !== false) cap(nv, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A sheet lying on a tube surface: v from v0..v1, u from uL(v)..uR(v), lifted off the surface by `off(v,s)`.
export function strip(T, v0, v1, uL, uR, o = {}) {
  const nu = o.nu ?? 8, nv = o.nv ?? 16;
  const off = typeof o.off === 'function' ? o.off : () => (o.off ?? 0.003);
  const pos = [], idx = [];
  const p = new V(), n = new V();
  for (let j = 0; j <= nv; j++) {
    const v = mix(v0, v1, j / nv);
    const a = uL(v), b = uR(v);
    for (let i = 0; i <= nu; i++) {
      const s = i / nu, u = mix(a, b, s);
      T.p(u, v, p); T.n(u, v, n);
      p.addScaledVector(n, off(v, s));
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Loft along an arbitrary 3D path: pts [[x,y,z],...], radii [[rx, rz],...] or a function(t)->[rx,rz].
// Cross-section frame from a parallel-transported normal. Lens/flat sections via e (superellipse).
export function sweep(pts, rad, o = {}) {
  const nu = o.nu ?? 10, nv = o.nv ?? Math.max(8, pts.length * 4);
  const e = o.e ?? 2;
  const P = pts.map((q) => q.slice());
  const R = typeof rad === 'function' ? rad : (t) => crSample(rad, t);
  const at = (t) => new V(...crSample(P, t));
  const pos = [], idx = [];
  let prevN = o.up ? new V(...o.up) : new V(0, 1, 0);
  const tan = new V(), nrm = new V(), bin = new V();
  for (let j = 0; j <= nv; j++) {
    const t = j / nv;
    const c = at(t);
    tan.copy(at(Math.min(t + 0.01, 1))).sub(at(Math.max(t - 0.01, 0))).normalize();
    nrm.copy(prevN).addScaledVector(tan, -prevN.dot(tan)).normalize();
    if (nrm.lengthSq() < 0.5) nrm.set(1, 0, 0);
    bin.crossVectors(tan, nrm).normalize();
    prevN.copy(nrm);
    const [rx, rz] = R(t);
    const twist = o.twist ? o.twist(t) : 0;
    for (let i = 0; i < nu; i++) {
      const a = (i / nu) * Math.PI * 2 + twist, ca = Math.cos(a), sa = Math.sin(a), pp = 2 / e;
      const x = rx * Math.sign(ca) * Math.pow(Math.abs(ca), pp), y = rz * Math.sign(sa) * Math.pow(Math.abs(sa), pp);
      pos.push(c.x + nrm.x * x + bin.x * y, c.y + nrm.y * x + bin.y * y, c.z + nrm.z * x + bin.z * y);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * nu + i, b = j * nu + (i + 1) % nu, c = (j + 1) * nu + i, d = (j + 1) * nu + (i + 1) % nu;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (j, flip) => {
    const c = at(j / nv); const ci = pos.length / 3; pos.push(c.x, c.y, c.z);
    for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + (i + 1) % nu; if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); }
  };
  if (o.caps !== false) { cap(0, false); cap(nv, true); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Deformed sphere: fn(dir: Vector3 unit, theta, phi) -> Vector3 point. theta 0 = top, phi 0 = +Z (front), + toward +X.
export function blob(fn, nTh = 28, nPh = 40) {
  const pos = [], idx = [];
  const d = new V();
  // poles as single vertices
  pos.push(...fn(new V(0, 1, 0), 0, 0).toArray());
  for (let j = 1; j < nTh; j++) {
    const th = (j / nTh) * Math.PI;
    for (let i = 0; i < nPh; i++) {
      const ph = (i / nPh) * Math.PI * 2;
      d.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      pos.push(...fn(d.clone(), th, ph).toArray());
    }
  }
  pos.push(...fn(new V(0, -1, 0), Math.PI, 0).toArray());
  const last = pos.length / 3 - 1;
  const ring = (j, i) => 1 + (j - 1) * nPh + (i % nPh);
  for (let i = 0; i < nPh; i++) idx.push(0, ring(1, i + 1), ring(1, i));
  for (let j = 1; j < nTh - 1; j++) for (let i = 0; i < nPh; i++) {
    const a = ring(j, i), b = ring(j, i + 1), c = ring(j + 1, i), dd = ring(j + 1, i + 1);
    idx.push(a, b, c, b, dd, c);
  }
  for (let i = 0; i < nPh; i++) idx.push(last, ring(nTh - 1, i), ring(nTh - 1, i + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Hair shell over a head: for each azimuth phi, a profile from the crown (s=0) to the hem (s=1).
// at(phi, s) -> Vector3. Grid nPh × nS, open hem, crown closed with a vertex.
export function shell(at, nPh = 120, nS = 22, open = false) {
  const pos = [], idx = [];
  if (open) {
    // open crown (bald top): ring 0 is a real ring at s = 0
    for (let j = 0; j <= nS; j++) for (let i = 0; i < nPh; i++) pos.push(...at((i / nPh) * Math.PI * 2, j / nS).toArray());
    for (let j = 0; j < nS; j++) for (let i = 0; i < nPh; i++) {
      const a = j * nPh + i, b = j * nPh + (i + 1) % nPh, c = (j + 1) * nPh + i, d = (j + 1) * nPh + (i + 1) % nPh;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  pos.push(...at(0, 0).toArray());
  for (let j = 1; j <= nS; j++) {
    const s = j / nS;
    for (let i = 0; i < nPh; i++) pos.push(...at((i / nPh) * Math.PI * 2, s).toArray());
  }
  const ring = (j, i) => 1 + (j - 1) * nPh + (i % nPh);
  for (let i = 0; i < nPh; i++) idx.push(0, ring(1, i + 1), ring(1, i));
  for (let j = 1; j < nS; j++) for (let i = 0; i < nPh; i++) {
    const a = ring(j, i), b = ring(j, i + 1), c = ring(j + 1, i), d = ring(j + 1, i + 1);
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Rounded-rectangle loop (for glasses rims, lens shapes)
export function rrect(w, h, r, n = 6) {
  const pts = [];
  const cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}

// Closed tube along a 2D loop in the XY plane (z = 0)
export function loopTube(pts2, r, nu = 6) {
  const pts = pts2.map(([x, y]) => new V(x, y, 0));
  const n = pts.length, pos = [], idx = [];
  for (let j = 0; j < n; j++) {
    const a = pts[(j - 1 + n) % n], b = pts[j], c = pts[(j + 1) % n];
    const t = c.clone().sub(a).normalize();
    const nr = new V(t.y, -t.x, 0);
    for (let i = 0; i < nu; i++) {
      const ang = (i / nu) * Math.PI * 2;
      const q = b.clone().addScaledVector(nr, Math.cos(ang) * r).add(new V(0, 0, Math.sin(ang) * r));
      pos.push(q.x, q.y, q.z);
    }
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < nu; i++) {
    const a = j * nu + i, b = j * nu + (i + 1) % nu, c = ((j + 1) % n) * nu + i, d = ((j + 1) % n) * nu + (i + 1) % nu;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Flat polygon (fan) in XY
export function flatPoly(pts2) {
  const sh = new THREE.Shape(pts2.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(sh, 4);
  return g;
}

// Merge geometries after painting each one: parts = [[geo, color, mask?], ...]. Keeps only position/normal/uv/aCol/aMask.
export function mergePainted(parts) {
  const gs = [];
  for (const [g0, col, mask] of parts) {
    let g = g0.index ? g0 : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    paint(g, col, mask ?? 0);
    gs.push(g.index ? g : g);
  }
  // mergeGeometries needs all indexed or all non-indexed
  const allIdx = gs.every((g) => g.index);
  const list = allIdx ? gs : gs.map((g) => (g.index ? g.toNonIndexed() : g));
  return mergeGeometries(list, false);
}
