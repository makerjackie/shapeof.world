// 林工's left hand + forearm, sculpted from anatomical masses (carpus, metacarpal block, dorsal arch, thenar,
// hypothenar, knuckle heads, extensor tendons, styloid bumps, phalanges with PIP/DIP knuckles, finger pads, nails).
// Model frame (metres): wrist joint at the origin, fingers toward +X, back of the hand +Y, thumb toward +Z.
import * as THREE from 'three';
import { Rig, Prim, Sculpt, smin, sdfAO, decoAttrs } from './hands-sdf.js';

export const FINGERS = [
  { n: 'i', L: [0.045, 0.0265, 0.0222], rb: 0.0083, mcp: [0.086, 0.0, 0.0245], splay: -5 },
  { n: 'm', L: [0.049, 0.0305, 0.0235], rb: 0.0087, mcp: [0.089, 0.0005, 0.0082], splay: -1 },
  { n: 'r', L: [0.0455, 0.0295, 0.0222], rb: 0.0082, mcp: [0.0855, 0.0, -0.0085], splay: 3 },
  { n: 'l', L: [0.0365, 0.0218, 0.0200], rb: 0.0071, mcp: [0.0785, -0.001, -0.0242], splay: 8 },
];
export const WATCH_X = -0.034;          // watch centre along the forearm
// forearm cross-section (half thickness b along y, half width a along z) at x
export function wristSection(x) {
  const t = Math.min(1, Math.max(0, (x + 0.15) / 0.146));
  const r = 0.0285 + (0.0235 - 0.0285) * t;
  return { a: r * 1.22, b: r * 0.8 };
}

function rigDefs() {
  const d = [{ n: 'fore' }, { n: 'hand', p: 'fore' }];
  for (const f of FINGERS) {
    d.push({ n: f.n + '1', p: 'hand', t: f.mcp, r: [0, f.splay, 0] });
    d.push({ n: f.n + '2', p: f.n + '1', t: [f.L[0], 0, 0] });
    d.push({ n: f.n + '3', p: f.n + '2', t: [f.L[1], 0, 0] });
  }
  d.push({ n: 't1', p: 'hand', t: [0.012, -0.007, 0.016], r: [50, -40, -14] });
  d.push({ n: 't2', p: 't1', t: [0.044, 0, 0] });
  d.push({ n: 't3', p: 't2', t: [0.031, 0, 0] });
  return d;
}

// a group of primitives with a bounding sphere, so far-away fingers are skipped cheaply
class Grp {
  constructor(prims, f) { this.prims = prims; this.f = f; this.c = new THREE.Vector3(); this.r = 0; }
  fit(worlds) {
    const cs = this.prims.map((p) => p.centre(worlds));
    this.c.set(0, 0, 0); for (const c of cs) this.c.add(c); this.c.multiplyScalar(1 / cs.length);
    this.r = 0; this.prims.forEach((p, i) => { this.r = Math.max(this.r, cs[i].distanceTo(this.c) + p.ext); });
    this.cx = this.c.x; this.cy = this.c.y; this.cz = this.c.z;
  }
  lower(x, y, z) { return Math.hypot(x - this.cx, y - this.cy, z - this.cz) - this.r; }
}

// opts: { tendon (0..1 prominence), veins (0..1) }
export function makeHandSculpt(opts = {}) {
  const tendon = opts.tendon ?? 0.5;
  const rig = new Rig(rigDefs());
  const prims = [];
  const add = (b, o) => { const p = new Prim({ ...o, bone: rig.index[b] }); prims.push(p); return p; };
  const unionOf = (k, ps) => (x, y, z) => { let d = ps[0].d(x, y, z); for (let i = 1; i < ps.length; i++) d = smin(d, ps[i].d(x, y, z), k); return d; };

  // ---- palm masses
  const carpal = add('hand', { kind: 'ell', t: [0.017, 0.0, 0.0], rad: [0.024, 0.0165, 0.0275] });
  const meta = add('hand', { kind: 'box', t: [0.056, -0.0015, -0.002], half: [0.029, 0.0098, 0.0365], round: 0.0092 });
  const arch = add('hand', { kind: 'ell', t: [0.054, 0.0012, 0.0], rad: [0.036, 0.0118, 0.0375] });
  const thenar = add('hand', { kind: 'ell', t: [0.033, -0.0115, 0.0205], r: [0, -30, 0], rad: [0.026, 0.0125, 0.0165] });
  const hypo = add('hand', { kind: 'ell', t: [0.047, -0.0085, -0.0285], rad: [0.032, 0.0095, 0.0105] });
  const heel = add('hand', { kind: 'ell', t: [0.080, -0.0085, -0.001], rad: [0.012, 0.0075, 0.036] });
  const palm0 = unionOf(0.012, [carpal, meta, arch, thenar, hypo, heel]);
  const kn = opts.knuckle ?? 1;
  const knuck = FINGERS.map((f) => add('hand', { kind: 'ell', t: [f.mcp[0] - 0.002, 0.0062 + 0.0008 * (kn - 1), f.mcp[2]], rad: [0.0088 * kn, 0.0072 * kn, f.rb * 0.92 * kn], tag: 1 }));
  // dorsal surface height of the palm (for laying tendons on it)
  const ySurf = (x, z) => {
    const e1 = 1 - ((x - 0.054) / 0.036) ** 2 - (z / 0.0375) ** 2;
    const e2 = 1 - ((x - 0.017) / 0.024) ** 2 - (z / 0.0275) ** 2;
    return Math.max(e1 > 0 ? 0.0012 + 0.0118 * Math.sqrt(e1) : -1, e2 > 0 ? 0.0165 * Math.sqrt(e2) : -1);
  };
  const tendons = FINGERS.map((f) => {
    const ax = 0.02, az = f.mcp[2] * 0.42, bx = f.mcp[0] - 0.008, bz = f.mcp[2];
    const r = 0.0011 + 0.0011 * tendon;
    const ay = ySurf(ax, az) - 0.0012 + r * 0.55, by = ySurf(bx, bz) - 0.0012 + r * 0.55;
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(-dz, dx) * 180 / Math.PI, pitch = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
    return add('hand', { kind: 'cap', t: [ax, ay, az], r: [0, yaw, pitch], L, r0: r * 0.7, r1: r, sy: 0.8, sz: 1.3, noSkin: true });
  });
  // dorsal veins: two branches across the back of the hand joined by an arch (raised a fraction of a millimetre)
  const veins = [];
  if (opts.veins) {
    const vr = 0.00105 * opts.veins;
    const vseg = (ax, az, bx, bz) => {
      const ay = ySurf(ax, az) - 0.0011 + vr * 0.6, by = ySurf(bx, bz) - 0.0011 + vr * 0.6;
      const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
      veins.push(add('hand', { kind: 'cap', t: [ax, ay, az], r: [0, Math.atan2(-dz, dx) * 180 / Math.PI, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI], L, r0: vr, r1: vr * 0.8, sz: 1.2, noSkin: true }));
    };
    vseg(0.006, 0.019, 0.03, 0.012); vseg(0.03, 0.012, 0.052, 0.009); vseg(0.052, 0.009, 0.07, 0.016);
    vseg(0.008, -0.02, 0.032, -0.014); vseg(0.032, -0.014, 0.05, -0.011); vseg(0.05, -0.011, 0.066, -0.017);
    vseg(0.05, 0.009, 0.05, -0.011);
  }
  const palmK = (x, y, z) => {
    let d = palm0(x, y, z);
    for (const k of knuck) d = smin(d, k.d(x, y, z), 0.006);
    for (const t of tendons) d = smin(d, t.d(x, y, z), 0.003);
    for (const v of veins) d = smin(d, v.d(x, y, z), 0.0022);
    return d;
  };
  // ---- forearm and wrist
  const arm = add('fore', { kind: 'cap', t: [-0.15, 0, 0], L: 0.146, r0: 0.0285, r1: 0.0235, sy: 0.8, sz: 1.22 });
  const ulna = add('fore', { kind: 'ell', t: [-0.009, 0.0105, -0.0255], rad: [0.0075, 0.0058, 0.0062] });
  const radial = add('fore', { kind: 'ell', t: [-0.005, -0.001, 0.0275], rad: [0.0085, 0.0085, 0.0048] });
  const foreF = unionOf(0.006, [arm, ulna, radial]);

  // ---- fingers
  const fingerGroups = FINGERS.map((f, fi) => {
    const rb = f.rb, [L1, L2, L3] = f.L, b = f.n;
    const p1 = add(b + '1', { kind: 'cap', L: L1, r0: rb, r1: rb * 0.9, sy: 0.86 });
    const pip = add(b + '2', { kind: 'ell', t: [0, 0.0004, 0], rad: [rb * 0.95, rb * 0.9 * 0.86 + 0.0004, rb * 0.93], tag: 2 });
    const p2 = add(b + '2', { kind: 'cap', L: L2, r0: rb * 0.87, r1: rb * 0.79, sy: 0.86 });
    const dip = add(b + '3', { kind: 'ell', t: [0, 0.0003, 0], rad: [rb * 0.8, rb * 0.8 * 0.86, rb * 0.83] });
    const p3 = add(b + '3', { kind: 'cap', L: L3 - rb * 0.62, r0: rb * 0.78, r1: rb * 0.64, sy: 0.85 });
    const pad = add(b + '3', { kind: 'ell', t: [L3 * 0.5, -rb * 0.2, 0], rad: [L3 * 0.42, rb * 0.56, rb * 0.7] });
    const nail = add(b + '3', { kind: 'ell', t: [L3 * 0.6, rb * 0.47, 0], rad: [L3 * 0.36, rb * 0.2, rb * 0.6], tag: 3, noTag: true });
    const chain = [p1, pip, p2, dip, p3];
    const f0 = (x, y, z) => {
      let d = chain[0].d(x, y, z);
      for (let i = 1; i < chain.length; i++) d = smin(d, chain[i].d(x, y, z), 0.0035);
      d = smin(d, pad.d(x, y, z), 0.004);
      return smin(d, nail.d(x, y, z), 0.0008);
    };
    const g = new Grp([p1, pip, p2, dip, p3, pad, nail], f0);
    g.finger = fi; g.nail = nail; g.pip = pip; g.dip = dip; g.L3 = L3; g.rb = rb; g.distal = new Set([dip, p3, pad, nail]);
    return g;
  });
  // ---- thumb
  const t1 = add('t1', { kind: 'cap', L: 0.044, r0: 0.0125, r1: 0.0108, sy: 0.88 });
  const tm = add('t2', { kind: 'ell', rad: [0.0112, 0.0098, 0.0112], tag: 2 });
  const t2 = add('t2', { kind: 'cap', L: 0.031, r0: 0.0105, r1: 0.0097, sy: 0.86 });
  const tip = add('t3', { kind: 'ell', rad: [0.0098, 0.0086, 0.0098] });
  const t3 = add('t3', { kind: 'cap', L: 0.026 - 0.0082, r0: 0.0098, r1: 0.0083, sy: 0.84 });
  const tpad = add('t3', { kind: 'ell', t: [0.013, -0.002, 0], rad: [0.012, 0.0066, 0.0085] });
  const tnail = add('t3', { kind: 'ell', t: [0.0158, 0.0062, 0], rad: [0.0092, 0.0018, 0.0068], tag: 3, noTag: true });
  const thumbF = (x, y, z) => {
    let d = smin(smin(smin(t1.d(x, y, z), tm.d(x, y, z), 0.004), t2.d(x, y, z), 0.004), tip.d(x, y, z), 0.0035);
    d = smin(d, t3.d(x, y, z), 0.0035);
    d = smin(d, tpad.d(x, y, z), 0.004);
    return smin(d, tnail.d(x, y, z), 0.0008);
  };
  const thumbG = new Grp([t1, tm, t2, tip, t3, tpad, tnail], thumbF);
  thumbG.nail = tnail; thumbG.L3 = 0.026; thumbG.rb = 0.0098; thumbG.distal = new Set([tip, t3, tpad, tnail]); thumbG.ip = tip;

  const palmG = new Grp([carpal, meta, arch, thenar, hypo, heel, ...knuck, arm], null);
  const field = (x, y, z) => {
    const base = smin(palmK(x, y, z), foreF(x, y, z), 0.016);
    let d = base;
    for (const g of fingerGroups) {
      if (g.lower(x, y, z) > base + 0.0065) continue;
      d = Math.min(d, smin(base, g.f(x, y, z), 0.0065));
    }
    if (thumbG.lower(x, y, z) <= base + 0.013) d = Math.min(d, smin(base, thumbF(x, y, z), 0.013));
    return d;
  };

  const sculpt = new Sculpt({ rig, prims, field, bounds: 'auto', h: opts.h ?? 0.001, sigma: 0.0035, margin: 1.5, smoothEps: opts.smoothEps ?? 0.0055 });
  const origSetPose = sculpt.setPose.bind(sculpt);
  sculpt.setPose = (worlds) => { origSetPose(worlds); for (const g of [...fingerGroups, thumbG, palmG]) if (g.prims) g.fit(worlds); };

  // ---- decoration: skin colour, pale knuckles, nails, creases, crevices
  const SKIN = new THREE.Color(opts.skin ?? '#f1d9cf'), RED = new THREE.Color('#e6a59c');
  sculpt.decorate = (base) => {
    const n = base.count, Pp = base.pos;
    const col = new Float32Array(n * 3), id = new Float32Array(n).fill(opts.id ?? 41), pale = new Float32Array(n);
    const nail = new Float32Array(n * 3), crease = new Float32Array(n).fill(1);
    const ao = sdfAO(field, Pp, base.nrm, n, [0.0016, 0.0042, 0.008]);
    const L = [0, 0, 0];
    const byPrim = new Map();
    for (const g of [...fingerGroups, thumbG]) for (const p of g.prims) byPrim.set(p, g);
    const c = new THREE.Color();
    for (let v = 0; v < n; v++) {
      const x = Pp[v * 3], y = Pp[v * 3 + 1], z = Pp[v * 3 + 2];
      const pr = prims[base.nearest[v]];
      const g = byPrim.get(pr);
      let red = 0, pl = 0, cr = 1;
      // knuckle heads: pale under strain, a touch of red at rest
      for (const k of knuck) { const d = k.d(x, y, z); if (d < 0.004) { const w = 1 - Math.max(0, d) / 0.004; pl = Math.max(pl, w); red = Math.max(red, w * 0.35); } }
      if (g) {
        // pale PIP knuckle tops
        const pk = g.pip ?? g.ip;
        if (pk) { pk.local3(x, y, z, L); const w = Math.max(0, 1 - Math.hypot(L[0] / 0.008, Math.max(0, 0.006 - L[1]) / 0.006, L[2] / 0.007)); pl = Math.max(pl, w * (L[1] > 0 ? 1 : 0)); red = Math.max(red, w * 0.25); }
        // nails and fingertips
        if (g.distal.has(pr)) {
          g.nail.local3(x, y, z, L);
          const hl = g.L3 * 0.33, hw = g.rb * 0.56;
          nail[v * 3] = L[0] / hl; nail[v * 3 + 1] = L[2] / hw; nail[v * 3 + 2] = L[1] > -g.rb * 0.12 ? 1 : 0;
          red = Math.max(red, 0.3 * Math.max(0, 1 - Math.hypot(L[0] - g.L3 * 0.2, L[1] + g.rb * 0.4) / 0.012));
        }
        // creases: two arcs on the PIP knuckle, one on the DIP (back of the finger only)
        const arc = (prim, off, curve, lim) => {
          prim.local3(x, y, z, L);
          if (L[1] < g.rb * 0.3) return 1;
          const s = L[2] / g.rb;
          const over = Math.max(0, Math.abs(s) - lim) * g.rb * 2.5;
          return Math.abs(L[0] - (off + curve * s * s)) + over;
        };
        if (g.pip) { cr = Math.min(cr, arc(g.pip, -0.0009, 0.0022, 0.36), arc(g.pip, 0.0016, 0.0014, 0.2)); }
        if (g.ip) cr = Math.min(cr, arc(g.ip, 0.0004, 0.0018, 0.36));
      }
      c.copy(SKIN).lerp(RED, Math.min(0.6, red));
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
      pale[v] = pl; crease[v] = cr;
    }
    decoAttrs(base, { col, id, ao, pale, nail, crease });
  };
  return { sculpt, rig, field, fingerGroups, thumbG };
}

// ---------------------------------------------------------------- shirt sleeve with a buttoned cuff
// Built on the same rig (bone 'fore'), so it follows the forearm. opts: { cuff: x of the cuff edge, loose: 0..1 }
export function makeSleeveSculpt(rig, opts = {}) {
  const x0 = opts.cuff ?? -0.064;           // cuff edge (toward the hand)
  const cuffLen = 0.058;
  const loose = opts.loose ?? 0;
  const prims = [new Prim({ bone: rig.index.fore, kind: 'cap', t: [-0.3, 0, 0], L: 0.3 + x0, r0: 0.04, r1: 0.03 })];
  const ell = (y, z, a, b) => { const k0 = Math.hypot(y / b, z / a), k1 = Math.hypot(y / (b * b), z / (a * a)); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(a, b); };
  const field = (x, y, z) => {
    // cuff: a firm band just bigger than the wrist
    const ws = wristSection(Math.max(x, x0));
    const cuffA = ws.a + 0.0042 + loose * 0.004, cuffB = ws.b + 0.0044 + loose * 0.004;
    // sleeve: bigger, gathered into folds above the cuff
    const u = Math.max(0, (x0 - cuffLen) - x);                 // distance above the cuff
    const grow = Math.min(1, u / 0.06);
    const ang = Math.atan2(z, y);
    const fold = (Math.sin(ang * 5 + x * 55 + 0.6) * 0.6 + Math.sin(ang * 3 - x * 31 + 2.1) * 0.4) * (0.0024 * grow + 0.0006);
    const sa = cuffA + 0.007 * grow + 0.002, sb = cuffB + 0.006 * grow + 0.002;
    const inCuff = x > x0 - cuffLen;
    let dt = inCuff ? ell(y, z, cuffA, cuffB) : ell(y, z, sa, sb) - fold;
    // blend cuff → sleeve with a small step (the cuff seam)
    if (!inCuff && u < 0.006) dt = Math.min(dt, ell(y, z, cuffA + 0.0006, cuffB + 0.0006));
    const shell = Math.abs(dt) - 0.0011;
    return Math.max(shell, x - x0, -0.26 - x);
  };
  const sculpt = new Sculpt({ rig, prims, field, bounds: [[-0.27, -0.06, -0.07], [x0 + 0.004, 0.06, 0.07]], h: opts.h ?? 0.0014, sigma: 0.01, smoothEps: 0.006 });
  const SH = new THREE.Color(opts.color ?? '#eef2f7');
  sculpt.decorate = (base) => {
    const n = base.count, Pp = base.pos;
    const col = new Float32Array(n * 3), id = new Float32Array(n).fill(opts.id ?? 44), crease = new Float32Array(n).fill(1);
    const ao = sdfAO(field, Pp, base.nrm, n, [0.002, 0.005, 0.01]);
    for (let v = 0; v < n; v++) {
      const x = Pp[v * 3], y = Pp[v * 3 + 1], z = Pp[v * 3 + 2];
      col[v * 3] = SH.r; col[v * 3 + 1] = SH.g; col[v * 3 + 2] = SH.b;
      // stitch line around the cuff, the cuff seam, and fold lines in the gathered fabric
      const a = Math.abs(x - (x0 - 0.004));
      const seam = Math.abs(x - (x0 - cuffLen));
      let cr = Math.min(a, seam);
      const u = (x0 - cuffLen) - x;
      if (u > 0.008) {
        const ang = Math.atan2(z, y);
        const ph = ang * 5 + x * 55 + 0.6;
        const s = Math.sin(ph);
        if (s < -0.82) cr = Math.min(cr, Math.abs(Math.cos(ph)) * 0.004);
      }
      crease[v] = cr;
    }
    decoAttrs(base, { col, id, ao, crease });
  };
  return sculpt;
}
