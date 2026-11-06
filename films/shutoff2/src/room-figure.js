// 林工 at his desk, 01:40: hunched over the phone in both hands, still in his work shirt. Sculpted (smooth-blended
// anatomy on a rig, polygonised once, skinned) in three meshes: body (5 mm), head + hair (2.5 mm), hands (2.5 mm).
// His face is never drawn: it carries a face mask that keeps it in shadow (sculptMaterial uFaceDark).
import * as THREE from 'three';
import { Rig, Prim, Sculpt, smin, smax, sdfAO, decoAttrs, sculptMaterial } from './hands-sdf.js';
import { toonMaterial } from './materials.js';

const V = (a) => new THREE.Vector3(...a);
// joints, room-local, rest = the s05 pose
export const J = {
  pelvis: [0.04, 0.6, -0.78], spine: [0.04, 0.765, -0.85], chest: [0.04, 0.93, -0.96], neck: [0.04, 1.07, -1.06], head: [0.04, 1.13, -1.115],
  shR: [0.215, 0.995, -1.06], shL: [-0.135, 0.995, -1.06],
  elR: [0.265, 0.79, -1.285], elL: [-0.185, 0.79, -1.285],
  wrR: [0.112, 0.872, -1.43], wrL: [-0.032, 0.872, -1.43],
  hipR: [0.135, 0.575, -0.8], hipL: [-0.055, 0.575, -0.8],
  knR: [0.165, 0.545, -1.22], knL: [-0.085, 0.545, -1.22],
  anR: [0.185, 0.09, -1.12], anL: [-0.105, 0.09, -1.12],
};
const PARENT = { pelvis: null, spine: 'pelvis', chest: 'spine', neck: 'chest', head: 'neck', shR: 'chest', shL: 'chest', elR: 'shR', elL: 'shL', wrR: 'elR', wrL: 'elL', hipR: 'pelvis', hipL: 'pelvis', knR: 'hipR', knL: 'hipL', anR: 'knR', anL: 'knL' };
export const HEAD_PITCH = -30;     // the head bowed over the phone

// the phone in his hands: centre, screen normal (toward his eyes), top direction
export const PHONE = (() => {
  const c = V([0.04, 0.925, -1.47]);
  const eye = V([0.04, 1.17, -1.17]);
  const n = eye.clone().sub(c).normalize();
  const x = V([1, 0, 0]);
  const top = new THREE.Vector3().crossVectors(n, x).normalize();   // n × x → up-forward
  return { c, n, top, x };
})();

function rigDefs() {
  return Object.keys(J).map((k) => {
    const p = PARENT[k];
    const t = p ? J[k].map((v, i) => v - J[p][i]) : J[k];
    return { n: k, p, t, r: [0, 0, 0] };
  });
}

// a tapered capsule from A to B (model-space rest positions) on bone b
function seg(rig, b, A, B, r0, r1, o = {}) {
  const a = V(A), bb = V(B), d = bb.clone().sub(a);
  const L = d.length();
  const yaw = Math.atan2(-d.z, d.x) * 180 / Math.PI, pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI;
  const j = J[b];
  return new Prim({ bone: rig.index[b], kind: 'cap', t: [a.x - j[0], a.y - j[1], a.z - j[2]], r: [o.twist ?? 0, yaw, pitch], L, r0, r1, sy: o.sy ?? 1, sz: o.sz ?? 1, tag: o.tag ?? 1, noTag: o.noTag });
}
function ell(rig, b, C, rad, o = {}) {
  const j = J[b];
  return new Prim({ bone: rig.index[b], kind: 'ell', t: [C[0] - j[0], C[1] - j[1], C[2] - j[2]], r: o.r ?? [0, 0, 0], order: o.order ?? 'XYZ', rad, tag: o.tag ?? 1, pre: o.pre });
}
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// union with bounding-sphere culling: prims are grouped; a group is skipped when it cannot change the result
function fieldOf(groups, k) {
  return (x, y, z) => {
    let d = 1e9;
    for (const g of groups) {
      if (Math.hypot(x - g.cx, y - g.cy, z - g.cz) - g.r > d + k) continue;
      for (const p of g.p) d = smin(d, p.d(x, y, z), g.k ?? k);
    }
    return d;
  };
}
function fitGroups(groups, worlds) {
  for (const g of groups) {
    const cs = g.p.map((p) => p.centre(worlds));
    const c = cs.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / cs.length);
    g.cx = c.x; g.cy = c.y; g.cz = c.z;
    g.r = Math.max(...g.p.map((p, i) => cs[i].distanceTo(c) + p.ext));
  }
}

const COL = { 1: '#2b3249', 2: '#15171f', 3: '#ebd2c6', 4: '#0b0c11', 5: '#2a2d36', 6: '#1f2330', 7: '#ebd2c6' };
const ID = { 1: 46, 2: 47, 3: 49, 4: 45, 5: 48, 6: 43, 7: 49 };

function decorateTags(sculpt, field, prims, extra) {
  return (base) => {
    const n = base.count;
    const col = new Float32Array(n * 3), id = new Float32Array(n), fx = new Float32Array(n * 2), crease = new Float32Array(n).fill(1);
    const ao = sdfAO(field, base.pos, base.nrm, n, [0.006, 0.014, 0.026]);
    const c = new THREE.Color();
    for (let v = 0; v < n; v++) {
      const tag = prims[base.nearest[v]].tag;
      c.set(COL[tag] ?? '#ff00ff');
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
      id[v] = ID[tag] ?? 46;
      fx[v * 2] = tag === 7 ? 1 : 0;
      fx[v * 2 + 1] = tag === 6 ? 1 : 0;
      if (extra) crease[v] = extra(base.pos[v * 3], base.pos[v * 3 + 1], base.pos[v * 3 + 2], tag);
    }
    decoAttrs(base, { col, id, ao, fx, crease });
  };
}

export function makeFigure() {
  const rig = new Rig(rigDefs());

  // ---------------------------------------------------------------- body (shirt, trousers, neck)
  const B = [];
  const lean = { r: [-35, 0, 0] };
  const torso = [
    ell(rig, 'pelvis', [0.04, 0.59, -0.76], [0.168, 0.11, 0.128], { tag: 2 }),
    ell(rig, 'spine', [0.04, 0.765, -0.855], [0.152, 0.13, 0.108], { ...lean }),
    ell(rig, 'chest', [0.04, 0.925, -0.975], [0.163, 0.145, 0.116], { ...lean }),
    ell(rig, 'chest', [0.04, 0.955, -0.945], [0.148, 0.11, 0.07], { ...lean }),
    ell(rig, 'chest', [0.04, 1.02, -1.04], [0.15, 0.045, 0.08], { ...lean }),
  ];
  const collar = [seg(rig, 'neck', [0.04, 1.005, -1.015], [0.04, 1.065, -1.07], 0.064, 0.058)];
  const neck = [];
  const arm = (s) => {
    const sh = 'sh' + s, el = 'el' + s, wr = 'wr' + s;
    const dirF = V(J[wr]).sub(V(J[el])).normalize();
    const cuff = V(J[wr]).addScaledVector(dirF, -0.025);
    return [
      ell(rig, sh, [J[sh][0] - (s === 'R' ? 0.018 : -0.018), J[sh][1] - 0.01, J[sh][2] - 0.005], [0.05, 0.05, 0.052]),
      seg(rig, sh, J[sh], J[el], 0.05, 0.043),
      ell(rig, el, J[el], [0.046, 0.044, 0.046]),
      seg(rig, el, J[el], [cuff.x, cuff.y, cuff.z], 0.043, 0.034, { sy: 0.9 }),
      ell(rig, el, [cuff.x, cuff.y, cuff.z], [0.036, 0.036, 0.036]),
    ];
  };
  const leg = (s) => {
    const hip = 'hip' + s, kn = 'kn' + s, an = 'an' + s;
    const toe = [J[an][0] + (s === 'R' ? 0.01 : -0.01), 0.035, J[an][2] - 0.17];
    return [
      seg(rig, hip, J[hip], J[kn], 0.085, 0.062, { tag: 2 }),
      ell(rig, kn, J[kn], [0.058, 0.058, 0.06], { tag: 2 }),
      seg(rig, kn, J[kn], J[an], 0.055, 0.043, { tag: 2 }),
      seg(rig, an, [J[an][0], 0.06, J[an][2] + 0.02], toe, 0.042, 0.036, { sy: 0.65, tag: 5 }),
    ];
  };
  const groups = [
    { p: torso, k: 0.05 }, { p: collar, k: 0.012 },
    { p: arm('R'), k: 0.05 }, { p: arm('L'), k: 0.05 }, { p: leg('R') }, { p: leg('L') },
  ];
  for (const g of groups) B.push(...g.p);
  const bodyF0 = fieldOf(groups, 0.028);
  const bodyF = (x, y, z) => {
    let d = bodyF0(x, y, z);
    // shirt folds on the back (hunched) and at the elbows: shallow grooves
    const fold = Math.sin(y * 70 + Math.sin(x * 18) * 1.5) * 0.0032 * Math.max(0, Math.min(1, (y - 0.7) * 6)) * (z > -1.12 ? 1 : 0);
    return d + fold;
  };
  // drawn lines: the shirt's back yoke, sleeve seams, folds bunching on the back and inside the elbows
  const creaseBody = (x, y, z, tag) => {
    if (tag !== 1) return 1;
    const yoke = Math.abs((y - 1.0) * 0.82 + (z + 1.02) * 0.57) + Math.max(0, Math.abs(x - 0.04) - 0.13) * 2;
    const slR = Math.abs(Math.hypot(x - J.shR[0], y - J.shR[1], z - J.shR[2]) - 0.06);
    const slL = Math.abs(Math.hypot(x - J.shL[0], y - J.shL[1], z - J.shL[2]) - 0.06);
    let c = Math.min(yoke, slR, slL);
    if (z > -0.97 && Math.abs(x - 0.04) < 0.14) {
      for (let i = 0; i < 3; i++) {
        const yy = 0.705 + i * 0.045 + 0.012 * Math.sin(x * 21 + i * 2.1);
        const len = 0.11 - i * 0.025;
        c = Math.min(c, Math.abs(y - yy) + Math.max(0, Math.abs(x - 0.04 - (i - 1) * 0.02) - len) * 1.5);
      }
    }
    for (const sd of ['R', 'L']) {
      const e = J['el' + sd];
      const dd = Math.hypot(x - e[0], y - e[1], z - e[2]);
      if (dd < 0.07 && y > e[1] + 0.01) c = Math.min(c, Math.abs(dd - 0.035), Math.abs(dd - 0.052) + 0.0006);
      // the shirt cuff, a band 3–5 cm up from the wrist
      const w = J['wr' + sd];
      const dw = Math.hypot(x - w[0], y - w[1], z - w[2]);
      c = Math.min(c, Math.abs(dw - 0.03), Math.abs(dw - 0.052));
    }
    // the collar's top edge and its seam where it meets the shoulders
    const ct = Math.hypot(x - 0.04, y - 1.068, z + 1.072);
    if (y > 1.0) c = Math.min(c, Math.abs(ct - 0.06), Math.abs(Math.hypot(x - 0.04, y - 1.005, z + 1.015) - 0.072));
    return c;
  };
  // region: + shirt, - trousers (a crisp belt line from a plane through the waist, following the lean)
  const waistN = V([0, 0.82, -0.57]).normalize(), waistP = V([0.04, 0.665, -0.8]);
  const body = new Sculpt({ rig, prims: B, field: bodyF, bounds: 'auto', h: 0.0052, sigma: 0.025, margin: 1.5, smoothEps: 0.022 });
  const sp0 = body.setPose.bind(body);
  body.setPose = (w) => { sp0(w); fitGroups(groups, w); };
  const torsoSet = new Set(torso), collarSet = new Set(collar);
  body.decorate = (base) => {
    const n = base.count;
    const fx = new Float32Array(n * 2), crease = new Float32Array(n).fill(1);
    const ao = sdfAO(bodyF, base.pos, base.nrm, n, [0.006, 0.014, 0.026]);
    for (let v = 0; v < n; v++) {
      const x = base.pos[v * 3], y = base.pos[v * 3 + 1], z = base.pos[v * 3 + 2];
      const pr = B[base.nearest[v]];
      const plane = (x - waistP.x) * waistN.x + (y - waistP.y) * waistN.y + (z - waistP.z) * waistN.z;
      fx[v * 2 + 1] = collarSet.has(pr) ? 0.8 : torsoSet.has(pr) ? Math.min(plane, 0.45) : (pr.tag === 1 ? 0.2 : -0.2);
      crease[v] = creaseBody(x, y, z, pr.tag);
    }
    decoAttrs(base, { ao, fx, crease });
  };

  // ---------------------------------------------------------------- head + hair
  const pre = new THREE.Matrix4().makeRotationX(HEAD_PITCH * Math.PI / 180);
  const hp = (t, rad, tag, r) => new Prim({ bone: rig.index.head, kind: 'ell', t, rad, tag, pre, r: r ?? [0, 0, 0], order: 'XYZ' });
  const hc = (A, Bp, r0, r1, tag = 6) => {
    const a = V(A), b = V(Bp), d = b.clone().sub(a);
    const yaw = Math.atan2(-d.z, d.x) * 180 / Math.PI, pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI;
    return new Prim({ bone: rig.index.head, kind: 'cap', t: A, r: [0, yaw, pitch], L: d.length(), r0, r1, tag, pre });
  };
  const skull = [
    hp([0, 0.1, 0.0], [0.077, 0.09, 0.096], 3),
    hp([0, 0.045, -0.04], [0.062, 0.066, 0.068], 7),
    hp([0, 0.004, -0.056], [0.044, 0.03, 0.036], 7),
    hp([0, 0.05, -0.104], [0.008, 0.016, 0.012], 7),
    hp([0.078, 0.075, 0.004], [0.012, 0.028, 0.02], 3, [0, 0, 10]),
    hp([-0.078, 0.075, 0.004], [0.012, 0.028, 0.02], 3, [0, 0, -10]),
  ];
  const neckTop = seg(rig, 'neck', [0.04, 1.0, -1.02], [0.04, 1.15, -1.14], 0.05, 0.046, { tag: 3 });
  const CC = [0, 0.106, 0.008], CR = [0.088, 0.1, 0.108];
  const cap = hp(CC, CR, 6);
  // a point on the hair cap: az 0 = back of the head, PI = front; el up from the equator; s = radial scale
  const on = (az, el, s = 1) => [CC[0] + CR[0] * s * Math.cos(el) * Math.sin(az), CC[1] + CR[1] * s * Math.sin(el), CC[2] + CR[2] * s * Math.cos(el) * Math.cos(az)];
  const locks = [];
  const lock = (a0, e0, a1, e1, r0, r1, s1 = 1.06, sm = 1.05) => {
    const A = on(a0, e0, 0.97), Bp = on(a1, e1, s1), M = on((a0 + a1) / 2, (e0 + e1) / 2, sm);
    locks.push(hc(A, M, r0, r0 * 0.7 + r1 * 0.3), hc(M, Bp, r0 * 0.7 + r1 * 0.3, r1));
  };
  for (const [i, a] of [-0.5, -0.17, 0.17, 0.5].entries()) lock(Math.PI + a * 0.8, 1.0, Math.PI + a * 1.15 + (i % 2 ? 0.06 : -0.06), 0.02 - (i % 2) * 0.12, 0.026, 0.004, 1.1, 1.08);
  for (const sd of [-1, 1]) {
    lock(Math.PI * 0.5 * sd + 0.55 * sd, 0.9, Math.PI * 0.5 * sd + 0.75 * sd, -0.15, 0.024, 0.004, 1.07);
    lock(Math.PI * 0.5 * sd, 0.85, Math.PI * 0.5 * sd + 0.12 * sd, -0.32, 0.024, 0.004, 1.06);
  }
  for (const [i, a] of [-0.95, -0.62, -0.3, 0.02, 0.33, 0.64, 0.95].entries()) lock(a * 0.55, 0.9 + (i % 2) * 0.12, a * 0.85 + (i % 3 - 1) * 0.05, -0.5 - ((i * 37) % 5) * 0.045, 0.02, 0.004, 1.07, 1.04);
  // outer layer: locks that break the silhouette (barely merged, so they read as separate clumps)
  const outer = [];
  const olock = (a0, e0, a1, e1, r0, r1, s1, sm) => {
    const A = on(a0, e0, 0.98), Bp = on(a1, e1, s1), M = on((a0 + a1) / 2, (e0 + e1) / 2, sm);
    outer.push(hc(A, M, r0, r0 * 0.65 + r1 * 0.35), hc(M, Bp, r0 * 0.65 + r1 * 0.35, r1));
  };
  // nape: pointed tips of different lengths, flicking out
  for (const [i, a] of [-1.05, -0.7, -0.35, 0.0, 0.33, 0.68, 1.02].entries()) {
    const len = [0.0, 0.12, 0.05, 0.16, 0.03, 0.1, 0.0][i];
    olock(a * 0.8, -0.05, a * 0.95 + (i % 2 ? 0.08 : -0.08), -0.72 - len, 0.015, 0.0018, 1.13 + len * 0.3, 1.06);
  }
  // over the ears: flared locks
  for (const sd of [-1, 1]) {
    olock(sd * 1.25, 0.45, sd * 1.42, -0.42, 0.014, 0.002, 1.17, 1.08);
    olock(sd * 0.95, 0.35, sd * 1.12, -0.55, 0.014, 0.002, 1.15, 1.07);
  }
  // crown whorl: a pinwheel of locks spiralling out from the crown
  for (let i = 0; i < 6; i++) {
    const a = 0.35 + i * 1.047;
    olock(a, 1.42, a + 1.0, 0.98, 0.013, 0.0025, 1.08, 1.1);
  }
  // unruly tufts sticking up and back (he never went to bed)
  for (const [a0, e0, da, de, sc, r] of [[0.25, 1.2, 0.45, -0.2, 1.2, 0.015], [-0.35, 1.18, -0.4, -0.22, 1.18, 0.014], [0.9, 1.0, 0.4, -0.18, 1.18, 0.012],
    [-1.0, 0.95, -0.35, -0.2, 1.17, 0.012], [0.0, 1.05, 0.15, -0.3, 1.16, 0.013], [0.55, 0.85, 0.3, -0.3, 1.15, 0.012], [-0.6, 0.82, -0.3, -0.32, 1.15, 0.012]]) {
    olock(a0, e0, a0 + da, e0 + de, r, 0.002, sc, 1.1);
  }
  const hairN = V([0, -0.6, -0.8]).normalize();
  const skullF = (x, y, z) => { let d = skull[0].d(x, y, z); for (let i = 1; i < skull.length; i++) d = smin(d, skull[i].d(x, y, z), 0.016); return smin(d, neckTop.d(x, y, z), 0.02); };
  const tmp = [0, 0, 0];
  const hairF = (x, y, z) => {
    cap.local3(x, y, z, tmp);   // cap-local = head-local relative to the cap centre
    const hl = [tmp[0] + CC[0], tmp[1] + CC[1], tmp[2] + CC[2]];
    let d = smax(cap.d(x, y, z), hairN.x * hl[0] + hairN.y * hl[1] + hairN.z * hl[2] - 0.035, 0.012);
    for (const p of locks) d = smin(d, p.d(x, y, z), 0.014);
    for (const p of outer) d = smin(d, p.d(x, y, z), 0.0045);
    return d;
  };
  const headF = (x, y, z) => smin(skullF(x, y, z), hairF(x, y, z), 0.003);
  const H = [...skull, neckTop, cap, ...locks, ...outer];
  // flyaway strands: thin tapered tubes off the hair surface, rim-lit against the window (no ink)
  const strands = new THREE.Group();
  {
    const pos = [], nrm = [], idx = [];
    const headPre = new THREE.Matrix4().makeRotationX(HEAD_PITCH * Math.PI / 180).setPosition(...J.head);
    const fly = [[0.2, 1.15, 0.5, 0.25, 1.34], [-0.4, 1.1, -0.45, 0.3, 1.32], [1.1, 0.7, 0.35, -0.2, 1.28], [-1.15, 0.65, -0.4, -0.15, 1.3],
      [0.6, 0.2, 0.25, -0.5, 1.22], [-0.65, 0.15, -0.3, -0.5, 1.22], [0.05, 1.3, 0.25, 0.1, 1.36], [1.4, 0.25, 0.2, -0.35, 1.25],
      [-1.45, 0.3, -0.25, -0.3, 1.25], [0.35, 0.6, 0.45, -0.1, 1.26], [-0.2, 0.75, -0.5, 0.05, 1.3], [0.85, 1.05, 0.4, 0.15, 1.3],
      [1.25, 0.55, 0.3, 0.1, 1.32], [-1.25, 0.5, -0.3, 0.12, 1.32], [0.5, 1.25, 0.2, 0.15, 1.38], [-0.55, 1.22, -0.25, 0.12, 1.36],
      [1.5, 0.0, 0.25, -0.2, 1.24], [-1.5, -0.05, -0.25, -0.2, 1.24], [0.15, 0.9, 0.5, 0.3, 1.35], [-0.9, 0.9, -0.3, 0.35, 1.33]];
    for (const [az, el, da, de, sc] of fly) {
      const pts = [0, 0.33, 0.66, 1].map((u) => new THREE.Vector3(...on(az + da * u, el + de * u, 1.0 + (sc - 1.0) * u)).applyMatrix4(headPre));
      const curve = new THREE.CatmullRomCurve3(pts);
      const N = 16, R = 6, base = pos.length / 3;
      const frames = curve.computeFrenetFrames(N, false);
      for (let i = 0; i <= N; i++) {
        const u = i / N, c = curve.getPointAt(u), r = 0.0019 * (1 - u) + 0.0003;
        for (let j = 0; j < R; j++) {
          const a = j / R * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
          pos.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); nrm.push(n.x, n.y, n.z);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) {
        const a = base + i * R + j, b = base + i * R + (j + 1) % R, c2 = a + R, d2 = b + R;
        idx.push(a, c2, b, b, c2, d2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, toonMaterial({ color: '#2a3048', id: 131, rim: 1.0 }));
    m.frustumCulled = false;
    strands.add(m);
    strands.matrixAutoUpdate = false;
  }
  const head = new Sculpt({ rig, prims: H, field: headF, bounds: 'auto', h: 0.0026, sigma: 0.02, margin: 1.5, smoothEps: 0.008 });
  head.decorate = (base) => {
    const n = base.count;
    const fx = new Float32Array(n * 2), crease = new Float32Array(n).fill(1);
    const ao = sdfAO(headF, base.pos, base.nrm, n, [0.003, 0.007, 0.012]);
    const faceSet = new Set(skull.filter((p) => p.tag === 7));
    for (let v = 0; v < n; v++) {
      const x = base.pos[v * 3], y = base.pos[v * 3 + 1], z = base.pos[v * 3 + 2];
      const hd = hairF(x, y, z), sd = skullF(x, y, z);
      fx[v * 2 + 1] = hd - sd - 0.0006;     // < 0 where the hair is the outer surface
      let bd = 1e9, face = 0;
      for (const p of skull) { const dd = p.d(x, y, z); if (dd < bd) { bd = dd; face = faceSet.has(p) ? 1 : 0; } }
      fx[v * 2] = face;
    }
    decoAttrs(base, { ao, fx, crease });
  };

  // ---------------------------------------------------------------- hands around the phone
  const P = PHONE;
  const HP = [];
  const handGroups = [];
  for (const [s, wr] of [[1, 'wrR'], [-1, 'wrL']]) {
    const W = V(J[wr]);
    const edge = P.c.clone().addScaledVector(P.x, s * 0.037);
    const toEdge = edge.clone().sub(W);
    const palmC = W.clone().addScaledVector(toEdge, 0.55).addScaledVector(P.n, -0.008);
    const A = (v) => [v.x, v.y, v.z];
    const ps = [
      seg(rig, wr, A(W.clone().addScaledVector(toEdge, -0.25)), A(W), 0.031, 0.027, { tag: 3, sy: 0.75 }),
      seg(rig, wr, A(W), A(palmC), 0.026, 0.028, { tag: 3, sy: 0.6 }),
    ];
    // four fingers wrapped behind the phone, stacked along its length
    for (let i = 0; i < 4; i++) {
      const along = -0.045 + i * 0.022;
      const base = edge.clone().addScaledVector(P.top, along).addScaledVector(P.n, -0.012).addScaledVector(P.x, s * 0.004);
      const tip = P.c.clone().addScaledVector(P.top, along + 0.004).addScaledVector(P.n, -0.013).addScaledVector(P.x, s * (0.012 - i * 0.002));
      ps.push(seg(rig, wr, A(base), A(tip), 0.0085 - i * 0.0006, 0.0068 - i * 0.0005, { tag: 3 }));
    }
    // thumb over the screen's lower corner
    const tb = W.clone().addScaledVector(toEdge, 0.4).addScaledVector(P.n, 0.016).addScaledVector(P.top, 0.01);
    const tt = edge.clone().addScaledVector(P.x, -s * 0.016).addScaledVector(P.n, 0.009).addScaledVector(P.top, -0.035);
    ps.push(seg(rig, wr, A(tb), A(tt), 0.011, 0.008, { tag: 3 }));
    handGroups.push({ p: ps, k: 0.008 });
    HP.push(...ps);
  }
  const handF = fieldOf(handGroups, 0.008);
  const hands = new Sculpt({ rig, prims: HP, field: handF, bounds: 'auto', h: 0.0024, sigma: 0.02, margin: 1.5, smoothEps: 0.006 });
  const hsp = hands.setPose.bind(hands);
  hands.setPose = (w) => { hsp(w); fitGroups(handGroups, w); };
  hands.decorate = decorateTags(hands, handF, HP);

  // ---------------------------------------------------------------- meshes
  const common = { warmK: 0.25, rim: 1.0, rimW: 0.5, rimCol: '#b9c6ff', aoK: 0.9, lineCol: '#6a7390', smoothK: 0.85, crevT: 0.72 };
  const matBody = sculptMaterial({ ...common, smoothK: 0.55, lineW: 0.0045, lineLight: 1, rimW: 0.44, region: { colC: '#3e4866', colP: COL[1], idP: ID[1], colN: COL[2], idN: ID[2], colB: COL[4], idB: ID[4], band: 0.028 } });
  const matHead = sculptMaterial({ ...common, lineW: 0.002, sheen: 0, smoothK: 0.7, rimW: 0.38, region: { colP: COL[3], idP: ID[3], colN: COL[6], idN: ID[6], hairNeg: true } });
  const matHands = sculptMaterial({ ...common, lineW: 0.002, region: { colP: COL[3], idP: ID[3], colN: COL[3], idN: ID[3] } });
  const group = new THREE.Group();
  group.add(strands);
  let built = null;
  let headRestInv = null;
  return {
    group, rig, mats: [matBody, matHead, matHands],
    build() {
      if (built) return built;
      const t0 = performance.now();
      const bb = body.build({}), hb = head.build({}), nb = hands.build({});
      built = { bb, hb, nb };
      [[bb, matBody], [hb, matHead], [nb, matHands]].forEach(([b, m]) => { const me = new THREE.Mesh(b.geo, m); me.frustumCulled = false; group.add(me); });
      console.log(`[room] figure built: ${bb.count}+${hb.count}+${nb.count} verts in ${(performance.now() - t0).toFixed(0)} ms`);
      return built;
    },
    pose(over) {
      const b = this.build();
      const w = body.deform(b.bb, over); head.deform(b.hb, over); hands.deform(b.nb, over);
      if (!headRestInv) headRestInv = rig.pose({})[rig.index.head].invert();
      strands.matrix.multiplyMatrices(w[rig.index.head], headRestInv);
      strands.matrixWorldNeedsUpdate = true;
      return w;
    },
  };
}
