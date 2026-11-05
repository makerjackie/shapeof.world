// 关不掉 v11 · DC department — geometry helpers: chamfered boxes, merged meshes with per-part attributes, tubes along paths.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();

export function M(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
}

// Merges many transformed geometries into one BufferGeometry. Extra attributes are constants per part,
// or functions (worldPos, u, v, i) → value for per-vertex values.
export class Merge {
  constructor(extra = {}) {
    this.P = []; this.N = []; this.U = []; this.X = {};
    for (const k in extra) this.X[k] = { n: extra[k], a: [] };
  }
  add(geo, m, vals = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    _nm.getNormalMatrix(m);
    const keys = Object.keys(this.X);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m);
      this.P.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
      this.N.push(_n.x, _n.y, _n.z);
      const u = U ? U.getX(i) : 0, w = U ? U.getY(i) : 0;
      this.U.push(u, w);
      for (const k of keys) {
        const e = this.X[k];
        let v = vals[k] ?? 0;
        if (typeof v === 'function') v = v(_v, u, w, i);
        if (e.n === 1) e.a.push(v);
        else for (let j = 0; j < e.n; j++) e.a.push(v[j] ?? 0);
      }
    }
    if (g !== geo) g.dispose();
    return this;
  }
  get count() { return this.P.length / 3; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
    for (const k in this.X) g.setAttribute(k, new THREE.Float32BufferAttribute(this.X[k].a, this.X[k].n));
    g.computeBoundingSphere();
    return g;
  }
}

// A box with 45° chamfers on every edge (flat-shaded facets): catches a highlight line and an ink line on each edge.
// UVs are planar per facet, 0..1 over the box's extent on that face.
const cache = new Map();
export function cbox(w, h, d, r = 0.01) {
  const key = `${w},${h},${d},${r}`;
  if (cache.has(key)) return cache.get(key);
  const H = [w / 2, h / 2, d / 2];
  r = Math.min(r, H[0] * 0.49, H[1] * 0.49, H[2] * 0.49);
  const P = [], N = [], U = [];
  const uvOf = (p, n) => {
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    if (ax >= ay && ax >= az) return [(p[2] + H[2]) / (2 * H[2]), (p[1] + H[1]) / (2 * H[1])];
    if (ay >= az) return [(p[0] + H[0]) / (2 * H[0]), (p[2] + H[2]) / (2 * H[2])];
    return [(p[0] + H[0]) / (2 * H[0]), (p[1] + H[1]) / (2 * H[1])];
  };
  const poly = (pts, n) => {
    const l = Math.hypot(n[0], n[1], n[2]); n = n.map((x) => x / l);
    for (let i = 1; i < pts.length - 1; i++) {
      let a = pts[0], b = pts[i], c = pts[i + 1];
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) [b, c] = [c, b];
      for (const p of [a, b, c]) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); U.push(...uvOf(p, n)); }
    }
  };
  const pt = (i, vi, j, vj, k, vk) => { const p = [0, 0, 0]; p[i] = vi; p[j] = vj; p[k] = vk; return p; };
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, k = (i + 2) % 3;
    for (const s of [-1, 1]) {
      // face
      const n = [0, 0, 0]; n[i] = s;
      const a = H[j] - r, b = H[k] - r;
      poly([pt(i, s * H[i], j, -a, k, -b), pt(i, s * H[i], j, a, k, -b), pt(i, s * H[i], j, a, k, b), pt(i, s * H[i], j, -a, k, b)], n);
      // edges between face i and face j
      for (const t of [-1, 1]) {
        const ne = [0, 0, 0]; ne[i] = s; ne[j] = t;
        const c = H[k] - r;
        poly([pt(i, s * H[i], j, t * (H[j] - r), k, -c), pt(i, s * (H[i] - r), j, t * H[j], k, -c), pt(i, s * (H[i] - r), j, t * H[j], k, c), pt(i, s * H[i], j, t * (H[j] - r), k, c)], ne);
      }
    }
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    poly([[sx * H[0], sy * (H[1] - r), sz * (H[2] - r)], [sx * (H[0] - r), sy * H[1], sz * (H[2] - r)], [sx * (H[0] - r), sy * (H[1] - r), sz * H[2]]], [sx, sy, sz]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  cache.set(key, g);
  return g;
}

const bcache = new Map();
export function box(w, h, d) {
  const key = `${w},${h},${d}`;
  if (!bcache.has(key)) bcache.set(key, new THREE.BoxGeometry(w, h, d).toNonIndexed());
  return bcache.get(key);
}

// A curve through a dense polyline, parametrised by arc length.
export class PolyCurve extends THREE.Curve {
  constructor(pts) {
    super();
    this.pts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.len = this.cum[this.cum.length - 1];
  }
  getPoint(u, out = new THREE.Vector3()) {
    const s = Math.min(1, Math.max(0, u)) * this.len;
    let a = 0, b = this.cum.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (this.cum[m] < s) a = m; else b = m; }
    const t = (s - this.cum[a]) / Math.max(this.cum[b] - this.cum[a], 1e-9);
    return out.copy(this.pts[a]).lerp(this.pts[b], t);
  }
  getPointAt(u, out) { return this.getPoint(u, out); }
  getLength() { return this.len; }
}

// offsets a dense polyline sideways (in the horizontal plane, perpendicular to travel) and up
export function offsetPath(pts, side, up) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[2] - a[2];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    out.push([pts[i][0] - tz * side, pts[i][1] + up, pts[i][2] + tx * side]);
  }
  return out;
}

export function tube(pts, radius, radial = 5, segPerM = 14) {
  const c = new PolyCurve(pts);
  const segs = Math.max(2, Math.ceil(c.len * segPerM));
  const g = new THREE.TubeGeometry(c, segs, radius, radial, false);
  g.userData.len = c.len;
  return g;
}
