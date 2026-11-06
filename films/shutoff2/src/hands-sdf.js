// Sculpting kit for organic forms (林工's hands, his body, cloth): smooth-blended primitives hung on a bone rig,
// polygonised once per base pose with surface nets on a narrow-band grid, then skinned to the bones on the CPU so
// every drawing (on twos) re-poses the same mesh. Everything is deterministic: no randomness, no clocks.
import * as THREE from 'three';
import { G, COMMON, MRT_OUT, VERT_STD } from './glsl.js';

const D2R = Math.PI / 180;

// ------------------------------------------------------------------ rig
// defs: [{ n, p (parent name | null), t: [x,y,z] (in parent frame), r: [x,y,z] deg, order: 'YZX' }]  parents first
export class Rig {
  constructor(defs) {
    this.bones = defs.map((d) => ({ n: d.n, p: d.p ?? null, t: d.t ?? [0, 0, 0], r: d.r ?? [0, 0, 0], order: d.order ?? 'YZX',
      local: new THREE.Matrix4(), world: new THREE.Matrix4() }));
    this.index = {};
    this.bones.forEach((b, i) => { this.index[b.n] = i; });
    this.bones.forEach((b) => { b.pi = b.p ? this.index[b.p] : -1; });
    this._e = new THREE.Euler(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  // over[name] = { r: [dx,dy,dz] deg added to the rest rotation, t: [..] added to the rest offset }. Returns world matrices.
  pose(over = {}) {
    const out = [];
    for (const b of this.bones) {
      const o = over[b.n];
      const r = o && o.r ? [b.r[0] + o.r[0], b.r[1] + o.r[1], b.r[2] + o.r[2]] : b.r;
      const t = o && o.t ? [b.t[0] + o.t[0], b.t[1] + o.t[1], b.t[2] + o.t[2]] : b.t;
      this._e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, b.order);
      b.local.compose(this._v.set(t[0], t[1], t[2]), this._q.setFromEuler(this._e), this._s);
      if (b.pi >= 0) b.world.multiplyMatrices(this.bones[b.pi].world, b.local); else b.world.copy(b.local);
      out.push(b.world.clone());
    }
    return out;
  }
}

// ------------------------------------------------------------------ primitives
// Each primitive lives in a bone's frame (plus its own offset/rotation). `inv` maps model space → primitive space.
const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3();
export class Prim {
  constructor(o) {
    this.bone = o.bone;               // bone index
    this.kind = o.kind;               // 'cap' | 'ell' | 'box'
    this.tag = o.tag ?? 0;            // region tag (colour / id)
    this.local = new THREE.Matrix4().compose(_v.set(...(o.t ?? [0, 0, 0])), _q.setFromEuler(_e.set(...(o.r ?? [0, 0, 0]).map((x) => x * D2R), o.order ?? 'YZX')), _s);
    if (o.pre) this.local.premultiply(o.pre);
    this.inv = new Float64Array(12);
    // cap: segment along +X from 0 to L, radius r0 → r1, cross-section squashed by sy (local y) / sz (local z)
    this.L = o.L ?? 0; this.r0 = o.r0 ?? 0.01; this.r1 = o.r1 ?? this.r0; this.sy = o.sy ?? 1; this.sz = o.sz ?? 1;
    // ell: radii; box: half extents + rounding
    this.rad = o.rad ?? [0.01, 0.01, 0.01]; this.half = o.half ?? [0.01, 0.01, 0.01]; this.round = o.round ?? 0;
    this.f = this.kind === 'cap' ? this.dCap : this.kind === 'ell' ? this.dEll : this.dBox;
    this.noSkin = !!o.noSkin; this.noTag = !!o.noTag;
    this.ext = this.kind === 'cap' ? this.L + Math.max(this.r0, this.r1) * Math.max(1, this.sy, this.sz) : this.kind === 'ell' ? Math.max(...this.rad) : Math.hypot(...this.half);
  }
  // model-space centre for automatic bounds
  centre(worlds) {
    const w = new THREE.Matrix4().multiplyMatrices(worlds[this.bone], this.local);
    return new THREE.Vector3(this.kind === 'cap' ? this.L / 2 : 0, 0, 0).applyMatrix4(w);
  }
  setPose(worlds) {
    _m.multiplyMatrices(worlds[this.bone], this.local).invert();
    const e = _m.elements, a = this.inv;
    a[0] = e[0]; a[1] = e[1]; a[2] = e[2]; a[3] = e[4]; a[4] = e[5]; a[5] = e[6]; a[6] = e[8]; a[7] = e[9]; a[8] = e[10]; a[9] = e[12]; a[10] = e[13]; a[11] = e[14];
  }
  d(x, y, z) {
    const a = this.inv;
    return this.f(a[0] * x + a[3] * y + a[6] * z + a[9], a[1] * x + a[4] * y + a[7] * z + a[10], a[2] * x + a[5] * y + a[8] * z + a[11]);
  }
  local3(x, y, z, out) {
    const a = this.inv;
    out[0] = a[0] * x + a[3] * y + a[6] * z + a[9]; out[1] = a[1] * x + a[4] * y + a[7] * z + a[10]; out[2] = a[2] * x + a[5] * y + a[8] * z + a[11];
    return out;
  }
  dCap(x, y, z) {
    const L = this.L;
    const t = L > 0 ? Math.min(1, Math.max(0, x / L)) : 0;
    const qx = x - t * L, qy = y / this.sy, qz = z / this.sz;
    const r = this.r0 + (this.r1 - this.r0) * t;
    return (Math.sqrt(qx * qx + qy * qy + qz * qz) - r) * Math.min(1, this.sy, this.sz);
  }
  dEll(x, y, z) {
    const r = this.rad;
    const ax = x / r[0], ay = y / r[1], az = z / r[2];
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const bx = x / (r[0] * r[0]), by = y / (r[1] * r[1]), bz = z / (r[2] * r[2]);
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
  }
  dBox(x, y, z) {
    const h = this.half, rr = this.round;
    const qx = Math.abs(x) - h[0] + rr, qy = Math.abs(y) - h[1] + rr, qz = Math.abs(z) - h[2] + rr;
    const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
    return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - rr;
  }
}

// polynomial smooth min / max
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function smax(a, b, k) { return -smin(-a, -b, k); }

// Field builders: each returns f(x,y,z) → signed distance.
export const P = (prim) => (x, y, z) => prim.d(x, y, z);
export const U = (k, ...c) => (x, y, z) => {
  let d = c[0](x, y, z);
  for (let i = 1; i < c.length; i++) d = smin(d, c[i](x, y, z), k);
  return d;
};
export const SUB = (k, a, b) => (x, y, z) => smax(a(x, y, z), -b(x, y, z), k);
export const ISECT = (k, a, b) => (x, y, z) => smax(a(x, y, z), b(x, y, z), k);

// ------------------------------------------------------------------ polygoniser (naive surface nets, narrow band)
export function polygonize(f, min, max, h, opt = {}) {
  const B = 8;
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const bx = Math.ceil((nx - 1) / B), by = Math.ceil((ny - 1) / B), bz = Math.ceil((nz - 1) / B);
  const half = Math.sqrt(3) * B * h * 0.5;
  const margin = opt.margin ?? 1.6;
  const S = B + 1;
  const blocks = new Map();   // block index → Float32Array(S³)
  for (let K = 0; K < bz; K++) for (let J = 0; J < by; J++) for (let I = 0; I < bx; I++) {
    const cx = min[0] + (I * B + B / 2) * h, cy = min[1] + (J * B + B / 2) * h, cz = min[2] + (K * B + B / 2) * h;
    const d = f(cx, cy, cz);
    if (Math.abs(d) > half * margin + 2 * h) continue;
    const arr = new Float32Array(S * S * S);
    for (let k = 0; k < S; k++) for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      arr[i + S * (j + S * k)] = f(min[0] + (I * B + i) * h, min[1] + (J * B + j) * h, min[2] + (K * B + k) * h);
    }
    blocks.set(I + bx * (J + by * K), arr);
  }
  const pos = [];
  const cellOf = new Map();   // global cell index → vertex index
  const cells = [];           // per vertex: i, j, k, mask
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const v8 = new Float64Array(8);
  for (const [bi, arr] of blocks) {
    const I = bi % bx, J = Math.floor(bi / bx) % by, K = Math.floor(bi / (bx * by));
    for (let k = 0; k < B; k++) for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) {
      const gi = I * B + i, gj = J * B + j, gk = K * B + k;
      if (gi >= nx - 1 || gj >= ny - 1 || gk >= nz - 1) continue;
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        const o = CO[c];
        const v = arr[(i + o[0]) + S * ((j + o[1]) + S * (k + o[2]))];
        v8[c] = v;
        if (v < 0) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of EDGES) {
        const ia = (mask >> a) & 1, ib = (mask >> b) & 1;
        if (ia === ib) continue;
        const t = v8[a] / (v8[a] - v8[b]);
        const A = CO[a], Bc = CO[b];
        sx += A[0] + (Bc[0] - A[0]) * t; sy += A[1] + (Bc[1] - A[1]) * t; sz += A[2] + (Bc[2] - A[2]) * t; n++;
      }
      const vi = pos.length / 3;
      pos.push(min[0] + (gi + sx / n) * h, min[1] + (gj + sy / n) * h, min[2] + (gk + sz / n) * h);
      cellOf.set(gi + nx * (gj + ny * gk), vi);
      cells.push(gi, gj, gk, mask);
    }
  }
  // project onto the surface (Newton) and take the gradient as the normal
  const nv = pos.length / 3;
  const P3 = new Float32Array(pos);
  const N3 = new Float32Array(nv * 3);
  const e = h * 0.3;
  const grad = (x, y, z, o) => {
    o[0] = f(x + e, y, z) - f(x - e, y, z); o[1] = f(x, y + e, z) - f(x, y - e, z); o[2] = f(x, y, z + e) - f(x, y, z - e);
    const l = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= l; o[1] /= l; o[2] /= l;
  };
  const g = [0, 0, 0];
  for (let v = 0; v < nv; v++) {
    let x = P3[v * 3], y = P3[v * 3 + 1], z = P3[v * 3 + 2];
    for (let it = 0; it < (opt.project ?? 2); it++) {
      const d = f(x, y, z);
      grad(x, y, z, g);
      const s = Math.max(-h * 0.7, Math.min(h * 0.7, d));
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    grad(x, y, z, g);
    P3[v * 3] = x; P3[v * 3 + 1] = y; P3[v * 3 + 2] = z;
    N3[v * 3] = g[0]; N3[v * 3 + 1] = g[1]; N3[v * 3 + 2] = g[2];
  }
  // faces: every grid edge with a sign change → one quad from the four cells around it
  const idx = [];
  const cellId = (i, j, k) => cellOf.get(i + nx * (j + ny * k));
  const quad = (a, b, c, d) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    // orientation from the field normal
    const ax = P3[a * 3], ay = P3[a * 3 + 1], az = P3[a * 3 + 2];
    const ux = P3[b * 3] - ax, uy = P3[b * 3 + 1] - ay, uz = P3[b * 3 + 2] - az;
    const wx = P3[c * 3] - ax, wy = P3[c * 3 + 1] - ay, wz = P3[c * 3 + 2] - az;
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
    const nn = (N3[a * 3] + N3[b * 3] + N3[c * 3] + N3[d * 3]) * cx + (N3[a * 3 + 1] + N3[b * 3 + 1] + N3[c * 3 + 1] + N3[d * 3 + 1]) * cy + (N3[a * 3 + 2] + N3[b * 3 + 2] + N3[c * 3 + 2] + N3[d * 3 + 2]) * cz;
    if (nn < 0) { const t = b; b = d; d = t; }
    // split along the shorter diagonal
    const d1 = (P3[a * 3] - P3[c * 3]) ** 2 + (P3[a * 3 + 1] - P3[c * 3 + 1]) ** 2 + (P3[a * 3 + 2] - P3[c * 3 + 2]) ** 2;
    const d2 = (P3[b * 3] - P3[d * 3]) ** 2 + (P3[b * 3 + 1] - P3[d * 3 + 1]) ** 2 + (P3[b * 3 + 2] - P3[d * 3 + 2]) ** 2;
    if (d1 <= d2) idx.push(a, b, c, a, c, d); else idx.push(a, b, d, b, c, d);
  };
  for (let v = 0; v < nv; v++) {
    const i = cells[v * 4], j = cells[v * 4 + 1], k = cells[v * 4 + 2], mask = cells[v * 4 + 3];
    const in0 = mask & 1;
    if (((mask >> 1) & 1) !== in0 && j > 0 && k > 0) quad(v, cellId(i, j - 1, k), cellId(i, j - 1, k - 1), cellId(i, j, k - 1));
    if (((mask >> 2) & 1) !== in0 && i > 0 && k > 0) quad(v, cellId(i, j, k - 1), cellId(i - 1, j, k - 1), cellId(i - 1, j, k));
    if (((mask >> 4) & 1) !== in0 && i > 0 && j > 0) quad(v, cellId(i - 1, j, k), cellId(i - 1, j - 1, k), cellId(i, j - 1, k));
  }
  return { pos: P3, nrm: N3, idx: nv > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), count: nv };
}

// ------------------------------------------------------------------ skinned sculpt
// A sculpt = rig + primitives + field + per-vertex decoration. build(pose) polygonises at that pose and derives
// bone weights from the primitive distances; deform(pose) re-poses the mesh (linear blend skinning, top 4 bones).
export class Sculpt {
  constructor({ rig, prims, field, bounds, h, sigma = 0.004, decorate, margin, project, smoothEps = 0 }) {
    Object.assign(this, { rig, prims, field, bounds, h, sigma, decorate, margin, project, smoothEps });
  }
  setPose(worlds) { for (const p of this.prims) p.setPose(worlds); }
  build(over) {
    const worlds = this.rig.pose(over);
    this.setPose(worlds);
    const t0 = performance.now();
    let bounds = this.bounds;
    if (!bounds || bounds === 'auto') {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const p of this.prims) {
        const c = p.centre(worlds), r = p.ext + this.h * 3;
        mn[0] = Math.min(mn[0], c.x - r); mn[1] = Math.min(mn[1], c.y - r); mn[2] = Math.min(mn[2], c.z - r);
        mx[0] = Math.max(mx[0], c.x + r); mx[1] = Math.max(mx[1], c.y + r); mx[2] = Math.max(mx[2], c.z + r);
      }
      bounds = [mn, mx];
    }
    const m = polygonize(this.field, bounds[0], bounds[1], this.h, { margin: this.margin, project: this.project });
    const nv = m.count, nb = this.rig.bones.length;
    // bone weights from the distance to each bone's primitives
    const W = new Float32Array(nv * 4), BI = new Uint16Array(nv * 4);
    const nearest = new Int32Array(nv);
    const pd = new Float64Array(this.prims.length);
    const bd = new Float64Array(nb);
    for (let v = 0; v < nv; v++) {
      const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
      bd.fill(1e9);
      let best = 1e9, bp = 0;
      for (let i = 0; i < this.prims.length; i++) {
        const p = this.prims[i];
        const d = p.d(x, y, z);
        pd[i] = d;
        if (p.noSkin) continue;
        if (d < bd[p.bone]) bd[p.bone] = d;
        if (d < best && !p.noTag) { best = d; bp = i; }
      }
      nearest[v] = bp;
      let dmin = 1e9;
      for (let b = 0; b < nb; b++) dmin = Math.min(dmin, bd[b]);
      // pick top 4
      const top = [];
      for (let b = 0; b < nb; b++) {
        if (bd[b] > dmin + this.sigma * 6) continue;
        top.push([b, Math.exp(-(bd[b] - dmin) / this.sigma)]);
      }
      top.sort((a, b) => b[1] - a[1]);
      let s = 0;
      for (let i = 0; i < 4 && i < top.length; i++) s += top[i][1];
      for (let i = 0; i < 4; i++) {
        BI[v * 4 + i] = i < top.length ? top[i][0] : 0;
        W[v * 4 + i] = i < top.length ? top[i][1] / s : 0;
      }
    }
    // rest-pose inverse matrices
    const inv0 = worlds.map((w) => w.clone().invert());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.pos), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.nrm), 3));
    geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
    // shading normals: the gradient of the field over a wide stencil, so cel shadow shapes stay broad and simple
    const sn = new Float32Array(m.nrm);
    if (this.smoothEps > 0) {
      const f = this.field, e = this.smoothEps;
      for (let v = 0; v < nv; v++) {
        const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
        let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
        const l = Math.hypot(gx, gy, gz) || 1;
        gx /= l; gy /= l; gz /= l;
        // never let the shading normal face away from the true one
        const d = gx * m.nrm[v * 3] + gy * m.nrm[v * 3 + 1] + gz * m.nrm[v * 3 + 2];
        if (d > 0.2) { sn[v * 3] = gx; sn[v * 3 + 1] = gy; sn[v * 3 + 2] = gz; }
      }
    }
    geo.setAttribute('aSN', new THREE.BufferAttribute(new Float32Array(sn), 3));
    const base = { pos: m.pos, nrm: m.nrm, snrm: sn, W, BI, inv0, nearest, geo, count: nv };
    if (this.decorate) this.decorate(base, this);
    geo.boundingSphere = null; geo.computeBoundingSphere();
    base.ms = performance.now() - t0;
    return base;
  }
  // re-pose a built mesh in place
  deform(base, over) {
    const worlds = this.rig.pose(over);
    const nb = worlds.length;
    const S = new Float64Array(nb * 12);
    const tm = new THREE.Matrix4();
    for (let b = 0; b < nb; b++) {
      tm.multiplyMatrices(worlds[b], base.inv0[b]);
      const e = tm.elements;
      S.set([e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10], e[12], e[13], e[14]], b * 12);
    }
    const P0 = base.pos, N0 = base.nrm, SN0 = base.snrm, W = base.W, BI = base.BI;
    const pa = base.geo.attributes.position, na = base.geo.attributes.normal, sa = base.geo.attributes.aSN;
    const P1 = pa.array, N1 = na.array, SN1 = sa.array;
    for (let v = 0; v < base.count; v++) {
      const x = P0[v * 3], y = P0[v * 3 + 1], z = P0[v * 3 + 2];
      const nx = N0[v * 3], ny = N0[v * 3 + 1], nz = N0[v * 3 + 2];
      const sx = SN0[v * 3], sy = SN0[v * 3 + 1], sz = SN0[v * 3 + 2];
      let px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0, rx = 0, ry = 0, rz = 0;
      for (let i = 0; i < 4; i++) {
        const w = W[v * 4 + i];
        if (w <= 0) continue;
        const o = BI[v * 4 + i] * 12;
        px += w * (S[o] * x + S[o + 3] * y + S[o + 6] * z + S[o + 9]);
        py += w * (S[o + 1] * x + S[o + 4] * y + S[o + 7] * z + S[o + 10]);
        pz += w * (S[o + 2] * x + S[o + 5] * y + S[o + 8] * z + S[o + 11]);
        qx += w * (S[o] * nx + S[o + 3] * ny + S[o + 6] * nz);
        qy += w * (S[o + 1] * nx + S[o + 4] * ny + S[o + 7] * nz);
        qz += w * (S[o + 2] * nx + S[o + 5] * ny + S[o + 8] * nz);
        rx += w * (S[o] * sx + S[o + 3] * sy + S[o + 6] * sz);
        ry += w * (S[o + 1] * sx + S[o + 4] * sy + S[o + 7] * sz);
        rz += w * (S[o + 2] * sx + S[o + 5] * sy + S[o + 8] * sz);
      }
      const ls = Math.hypot(rx, ry, rz) || 1;
      SN1[v * 3] = rx / ls; SN1[v * 3 + 1] = ry / ls; SN1[v * 3 + 2] = rz / ls;
      const l = Math.hypot(qx, qy, qz) || 1;
      P1[v * 3] = px; P1[v * 3 + 1] = py; P1[v * 3 + 2] = pz;
      N1[v * 3] = qx / l; N1[v * 3 + 1] = qy / l; N1[v * 3 + 2] = qz / l;
    }
    pa.needsUpdate = true; na.needsUpdate = true; sa.needsUpdate = true;
    return worlds;
  }
}

// SDF ambient occlusion per vertex (0 open … 1 deep crevice)
export function sdfAO(f, pos, nrm, count, steps = [0.002, 0.005, 0.009]) {
  const ao = new Float32Array(count);
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const a = nrm[v * 3], b = nrm[v * 3 + 1], c = nrm[v * 3 + 2];
    let occ = 0, wsum = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const d = f(x + a * s, y + b * s, z + c * s);
      occ += Math.max(0, s - d) / s * (1 / (i + 1));
      wsum += 1 / (i + 1);
    }
    ao[v] = Math.min(1, occ / wsum);
  }
  return ao;
}

// ------------------------------------------------------------------ material for sculpted cels
// Per-vertex: aCol (base colour), aMat = (id, ao, pale, gloss), aNail = (u, v, on) nail-local coords, aCrease (m to the
// nearest drawn crease / fold line). Two hard tones from the key light, banded local lights, crevice shadows from the
// baked AO, rim light, nails with a highlight, and pen lines on creases that fade out when they get too thin to draw.
export function sculptMaterial(o = {}) {
  const u = {
    ...G,
    uPL: G.uPL, uPLC: G.uPLC, uAmbient: G.uAmbient,
    uShadeWarm: { value: new THREE.Color(o.shadeWarm ?? '#c06a6a') },   // skin: shade pulled toward warm red
    uWarmK: { value: o.warmK ?? 0 },
    uNailCol: { value: new THREE.Color(o.nailCol ?? '#f3cfc6') },
    uPaleCol: { value: new THREE.Color(o.paleCol ?? '#f7ece6') },
    uPale: { value: 0 },
    uRimK: { value: o.rim ?? 0.6 },
    uRimCol: { value: new THREE.Color(o.rimCol ?? '#ffffff') },
    uRimUseSun: { value: o.rimCol ? 0 : 1 },
    uLineCol: { value: new THREE.Color(o.lineCol ?? '#3a2a36') },
    uLineW: { value: o.lineW ?? 0.00035 },
    uAOK: { value: o.aoK ?? 1 },
    uSpecK: { value: o.spec ?? 0 },
    uSheen: { value: o.sheen ?? 0 },         // hair "angel ring"
    uSheenAxis: { value: new THREE.Vector3(0, 1, 0) },
    uExtraDark: { value: o.extraDark ?? 0 },
    uLocalK: { value: o.localK ?? 1 },
    uSmoothK: { value: o.smoothK ?? 0.8 },
    uFaceDark: { value: o.faceDark ?? 1 },
    uRimW: { value: o.rimW ?? 0.62 },
    uFaceK: { value: o.faceK ?? 0.5 },
    // per-fragment regions from the signed value in aFx.y: >= 0 → colP/idP, < 0 → colN/idN, a band just below 0 → colB/idB
    uRegOn: { value: o.region ? 1 : 0 },
    uColP: { value: new THREE.Color(o.region?.colP ?? '#ffffff') }, uIdP: { value: o.region?.idP ?? 1 },
    uColN: { value: new THREE.Color(o.region?.colN ?? '#000000') }, uIdN: { value: o.region?.idN ?? 2 },
    uColB: { value: new THREE.Color(o.region?.colB ?? '#000000') }, uIdB: { value: o.region?.idB ?? 3 }, uBand: { value: o.region?.band ?? 0 },
    uHairNeg: { value: o.region?.hairNeg ? 1 : 0 },
    uColC: { value: new THREE.Color(o.region?.colC ?? '#ffffff') }, uRegC: { value: o.region?.colC ? 1 : 0 },   // a 4th tone where aFx.y >= 0.5 (a collar)
    uLineLight: { value: o.lineLight ?? 0 },                                                                       // lines lighter than the cloth (dark fabric)
    uCrevT: { value: o.crevT ?? 0.62 },
  };
  const vs = /* glsl */ `
    attribute vec3 aCol;
    attribute vec4 aMat;
    attribute vec3 aNail;
    attribute float aCrease;
    attribute vec3 aSN;
    attribute vec2 aFx;
    varying vec3 vSN;
    varying vec2 vFx;
    varying vec3 vCol;
    flat varying float vId;
    varying vec4 vMat;
    varying vec3 vNail;
    varying float vCrease;
    ${VERT_STD}
    void main(){ vCol = aCol; vId = aMat.x; vMat = aMat; vNail = aNail; vCrease = aCrease; vSN = normalize(mat3(modelMatrix) * aSN); vFx = aFx; stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform vec3 uShadeWarm, uNailCol, uPaleCol, uRimCol, uLineCol;
    uniform float uWarmK, uPale, uRimK, uRimUseSun, uLineW, uAOK, uSpecK, uSheen, uExtraDark, uLocalK;
    uniform vec3 uSheenAxis;
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;
    varying vec2 vUv;
    varying vec3 vCol;
    flat varying float vId;
    varying vec4 vMat;
    varying vec3 vNail;
    varying float vCrease;
    varying vec3 vSN;
    varying vec2 vFx;
    uniform float uRimW, uFaceK;
    uniform float uSmoothK, uCrevT, uFaceDark, uRegOn, uIdP, uIdN, uIdB, uBand, uHairNeg;
    uniform vec3 uColP, uColN, uColB, uColC;
    uniform float uRegC, uLineLight;
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 Nd = normalize(vNormalW); vec3 NV = normalize(vNormalV);
      vec3 Ns = normalize(vSN);
      if(!gl_FrontFacing){ Nd = -Nd; NV = -NV; Ns = -Ns; }
      vec3 N = normalize(mix(Nd, Ns, uSmoothK));
      vec3 col = vCol;
      float id = vId;
      float hairM = step(0.5, vFx.y);
      if(uRegOn > 0.5){
        float rg = vFx.y;
        if(rg >= 0.5 && uRegC > 0.5){ col = uColC; id = uIdP; hairM = 0.0; }
        else if(rg >= 0.0){ col = uColP; id = uIdP; hairM = 0.0; }
        else if(rg > -uBand){ col = uColB; id = uIdB; hairM = 0.0; }
        else { col = uColN; id = uIdN; hairM = uHairNeg; }
      }
      // nail plate: crisp ellipse from interpolated nail coordinates
      float nr = length(vNail.xy);
      float nail = step(0.5, vNail.z) * (1.0 - step(1.0, nr));
      col = mix(col, uPaleCol, clamp(vMat.z * uPale, 0.0, 1.0));
      vec3 nailC = mix(uNailCol, vec3(1.0, 0.97, 0.95), smoothstep(0.55, 0.95, vNail.x) * 0.6);   // pale free edge
      col = mix(col, nailC, nail);
      if(nail > 0.5) id = vId + 1.0;
      // lighting: two hard tones
      float ndl = dot(N, uKeyDir);
      float sh = sunShadow(vWorld, N);
      float lit = smoothstep(-0.02, 0.04, ndl) * sh;
      float face = step(0.5, vFx.x) * uFaceDark;     // faces stay in shadow: never lit, barely touched by local light
      lit *= 1.0 - face;
      float crev = step(uCrevT, vMat.y * uAOK);
      lit *= 1.0 - crev;
      vec3 litCol = col * mix(uSkyTint, uSunColor * 1.06, uSunStrength);
      float up = smoothstep(-0.7, 0.6, N.y);
      vec3 shadeCol = col * uShadeTint * mix(uBounce, vec3(1.0), up);
      shadeCol = mix(shadeCol, shadeCol * uShadeWarm * 1.6, uWarmK);
      vec3 outc = mix(shadeCol, litCol, lit);
      float deep = step(ndl, -0.55) * step(N.y, -0.35);
      outc = mix(outc, col * uDeepTint, deep * 0.6);
      outc *= 1.0 - crev * 0.18 - uExtraDark;
      vec3 ll = localLights(vWorld, N) * uLocalK * (1.0 - 0.9 * face);
      outc += col * (uAmbient + ll * (1.0 - crev * 0.6));
      outc *= 1.0 - uFaceK * face;
      vec3 V = normalize(cameraPosition - vWorld);
      // rim: strongest when the key is behind the subject
      float fres = 1.0 - max(dot(Nd, V), 0.0);
      float back = smoothstep(-0.2, 0.5, dot(-V, uKeyDir));
      float rimL = smoothstep(uRimW, uRimW + 0.08, fres) * smoothstep(-0.25, 0.1, ndl) * back * uRimK;
      vec3 rimC = uRimUseSun > 0.5 ? uSunColor * 1.25 : uRimCol;
      outc = mix(outc, rimC * mix(1.0, length(col) * 0.7 + 0.4, 0.5), clamp(rimL, 0.0, 1.0));
      // hard highlight (nails always; elsewhere by gloss)
      vec3 H = normalize(uKeyDir + V);
      float gl = max(nail, vMat.w) ;
      float spec = step(0.975, dot(N, H)) * lit * gl * (nail > 0.5 ? 1.0 : uSpecK);
      outc = mix(outc, mix(vec3(1.0), uSunColor, 0.35) * 1.1, spec * 0.85);
      // local-light highlight on nails (phone glow catching the nail)
      // hair sheen band
      if(uSheen > 0.0 && hairM > 0.5){
        // hair: a broken highlight band ("angel ring") across the locks, brighter where lit
        float band = dot(N, normalize(V + uKeyDir * 0.3));
        float ring = step(0.58, band) * step(band, 0.7);
        outc += mix(uSkyTint, vec3(1.0), 0.5) * uSheen * ring * (0.35 + lit * 0.65) + ll * col * 0.6 * ring;
      }
      // drawn creases / folds
      // pen lines ~1.3 px wide; drawn only while a pixel covers less than uLineW metres (close enough to read)
      float fw = max(fwidth(vCrease), 1e-7);
      float lw = fw * 1.4;
      float line = 1.0 - smoothstep(lw, lw + fw, vCrease);
      float vis = (1.0 - smoothstep(uLineW * 0.6, uLineW * 1.2, fw)) * smoothstep(0.3, 0.55, dot(Nd, V));
      vec3 lc = uLineLight > 0.5 ? outc * 1.4 + vec3(0.07, 0.085, 0.16) : mix(outc * 0.42, uLineCol * 0.6, 0.25);
      outc = mix(outc, lc, line * vis * (uLineLight > 0.5 ? 0.65 : 0.8));
      writeOut(outc, 1.0, NV, vDepth, id);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: o.side ?? THREE.FrontSide });
}

// Fill the decoration attributes with defaults (colour, id) so a sculpt can override only what it needs.
export function decoAttrs(base, { col, id, ao, pale, gloss, nail, crease, fx }) {
  const n = base.count, geo = base.geo;
  geo.setAttribute('aCol', new THREE.BufferAttribute(col ?? new Float32Array(n * 3).fill(0.8), 3));
  const m = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    m[v * 4] = id ? id[v] : 1; m[v * 4 + 1] = ao ? ao[v] : 0; m[v * 4 + 2] = pale ? pale[v] : 0; m[v * 4 + 3] = gloss ? gloss[v] : 0;
  }
  geo.setAttribute('aMat', new THREE.BufferAttribute(m, 4));
  geo.setAttribute('aNail', new THREE.BufferAttribute(nail ?? new Float32Array(n * 3), 3));
  geo.setAttribute('aCrease', new THREE.BufferAttribute(crease ?? new Float32Array(n).fill(1), 1));
  geo.setAttribute('aFx', new THREE.BufferAttribute(fx ?? new Float32Array(n * 2), 2));
}
