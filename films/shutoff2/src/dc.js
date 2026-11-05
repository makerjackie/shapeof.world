// 关不掉 v11 · DC department — the data centre where 安 lives (shot s07 copy).
// An underground hall at y = −500: rows of 42U racks, overhead trays and cable ladders, fire pipes, a glossy raised floor,
// containment doors at the end of the aisle. At CUES.copyStart the copy runs as amber light from 安's racks up into the
// left tray, leaps the aisle on the cross ladder and pours down into 安-2's racks, whose LEDs flip to amber unit by unit.
import * as THREE from 'three';
import { Rng } from './util.js';
import { Merge, M, cbox, box, tube, offsetPath } from './dc-geo.js';
import { DC, dcToon, faceMat, floorMat, glowMat, coneMat, moteMat, haloMat } from './dc-mat.js';
import { labelAtlas, rowSign, exitSign, ceilTex, wallTex } from './dc-tex.js';
import {
  OY, NK, RW, RD, RH, Z0, ZEND, CEIL, U42, rackZ, ROWS, AN, AN2, groupOf, TX, TY, XZ,
  TRUNK, arrival, DROPS, rackRank, roundedPath,
} from './dc-flow.js';

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TYPE_GLOW = [0, 0.3, 0.55, 0.4, 0.6, 0, 0, 0, 0, 1.0, 0.6];

// ---- what is in each rack: 42 units of (type, position in span, span, seed)
function layoutAI(rng) {
  const U = new Array(42);
  let top = 41;
  const put = (type, span) => { const seed = Math.floor(rng.next() * 997); for (let i = 0; i < span; i++) U[top - span + 1 + i] = [type, i, span, seed]; top -= span; };
  put(10, 1); put(10, 1); put(7, 1);
  for (let i = 0; i < 9; i++) put(9, 4);
  put(2, 2); put(6, 1);
  return U;
}
function layoutGeneric(rng) {
  const U = new Array(42);
  let top = 41;
  const put = (type, span) => {
    span = Math.min(span, top + 1);
    const seed = Math.floor(rng.next() * 997);
    for (let i = 0; i < span; i++) U[top - span + 1 + i] = [type, i, span, seed];
    top -= span;
  };
  put(5, 1); put(4, 1);
  if (rng.next() < 0.5) put(7, 1);
  const density = rng.range(0.5, 1.0);
  const empty = rng.next() < 0.08;
  while (top >= 0) {
    if (empty || rng.next() > density) { const r = rng.next(); put(r < 0.45 ? 8 : r < 0.75 ? 6 : 0, rng.int(1, 3)); continue; }
    const t = rng.next();
    if (t < 0.38 || top < 1) put(1, 1);
    else if (t < 0.74 || top < 3) put(2, 2);
    else put(3, 4);
  }
  return U;
}

export function createDC(ctx) {
  const root = new THREE.Group();
  root.position.set(0, OY, 0);
  root.name = 'dc';
  ctx.scene.add(root);
  const over = new THREE.Group();
  over.position.set(0, OY, 0);
  ctx.overlay.add(over);

  // ---------------------------------------------------------------- rack data
  const NR = ROWS.length * NK;
  const data = new Float32Array(64 * NR * 4);
  const layouts = [];
  const rng = new Rng(2026);
  for (let r = 0; r < ROWS.length; r++) {
    for (let k = 0; k < NK; k++) {
      const ri = r * NK + k, g = groupOf(r, k);
      const U = g ? layoutAI(rng) : layoutGeneric(rng);
      layouts.push(U);
      let glow = 0;
      for (let u = 0; u < 42; u++) {
        const e = U[u], o = (ri * 64 + u) * 4;
        data[o] = e[0]; data[o + 1] = e[1]; data[o + 2] = e[2]; data[o + 3] = e[3];
        glow += TYPE_GLOW[e[0]] / 42;
      }
      const o = (ri * 64 + 48) * 4;
      const rr = g === 2 ? rackRank(k) : { base: 0, span: 1 };
      data[o] = g; data[o + 1] = rr.base; data[o + 2] = rr.span; data[o + 3] = rng.range(0, 6.28);
      data[(ri * 64 + 49) * 4] = glow * 2.2;
    }
  }
  const dtex = new THREE.DataTexture(data, 64, NR, THREE.RGBAFormat, THREE.FloatType);
  dtex.minFilter = dtex.magFilter = THREE.NearestFilter;
  dtex.needsUpdate = true;
  DC.uRackData.value = dtex;

  // ---------------------------------------------------------------- materials
  const mToon = dcToon({ flowGain: 1.25 });
  const mFace = faceMat();
  const mFloor = floorMat();
  const labels = [];
  for (let r = 0; r < 2; r++) for (let k = 0; k < NK; k++) {
    const g = groupOf(r, k);
    const num = String(k + 1).padStart(2, '0');
    labels.push(g === 1 ? { text: `安  A${num}`, sub: 'AN', an: true } : g === 2 ? { text: `安-2  B${num}`, sub: 'AN-2' } : { text: `${r ? 'R' : 'L'}1-${num}`, sub: '' });
  }
  const atlas = labelAtlas(labels);
  const mLabel = dcToon({ map: atlas.tex });

  const X = { aCol: 3, aMisc: 4, aFlow: 4 };
  const mg = new Merge(X);            // static cel geometry
  const mgL = new Merge(X);           // label plates (atlas)
  const mgF = new Merge({ aRack: 1 });
  const part = (m, geo, mat, col, id, misc = {}) => m.add(geo, mat, { aCol: lin(col), aMisc: [id, misc.emis ?? 0, misc.flow ?? 0, misc.unlit ?? 0], aFlow: misc.aFlow ?? [0, 0, 0, 0] });

  // ---------------------------------------------------------------- racks
  const C = { side: '#5f6c80', cap: '#8794a6', post: '#363e4b', plinth: '#2a303a', back: '#3a424e', handle: '#c0c8d4', bezel: '#46505e' };
  const tmp = new THREE.Matrix4();
  for (let r = 0; r < ROWS.length; r++) {
    const row = ROWS[r];
    for (let k = 0; k < NK; k++) {
      const T = M(row.x, 0, rackZ(k), row.f === 1 ? 0 : Math.PI);
      const at = (x, y, z, ry = 0) => tmp.multiplyMatrices(T, M(x, y, z, ry)).clone();
      const g = groupOf(r, k);
      const hb = 0.92 + 0.12 * rng.next();
      const shade = (hex) => { const c = new THREE.Color(hex).multiplyScalar(hb); return '#' + c.getHexString(); };
      const by = 0.1 + (RH - 0.16) / 2;
      for (const s of [-1, 1]) {
        part(mg, cbox(RD - 0.04, RH - 0.16, 0.022, 0.006), at(-RD / 2, by, s * 0.289), shade(C.side), 10);
        part(mg, cbox(0.035, RH - 0.16, 0.05, 0.007), at(-0.0175, by, s * 0.268), C.post, 12);
      }
      part(mg, cbox(RD + 0.012, 0.06, 0.612, 0.012), at(-RD / 2, RH - 0.03, 0), shade(C.cap), 11);
      part(mg, cbox(RD - 0.03, 0.1, 0.58, 0.008), at(-RD / 2, 0.05, 0), C.plinth, 13);
      part(mg, cbox(0.035, 0.075, 0.6, 0.007), at(-0.0175, RH - 0.0975, 0), C.bezel, 14);
      part(mg, box(0.02, RH - 0.16, 0.56), at(-RD + 0.01, by, 0), C.back, 13);
      // cable entry brush on the top
      part(mg, cbox(0.22, 0.012, 0.36, 0.004), at(-RD * 0.7, RH + 0.002, 0), '#0e1014', 16);
      // the server face
      mgF.add(new THREE.PlaneGeometry(0.483, U42), at(-0.036, 0.1 + U42 / 2, 0, Math.PI / 2), { aRack: r * NK + k });
      if (g) {
        // the AI racks' light columns on both front posts (they flip unit by unit with the servers)
        for (const s of [1]) part(mg, box(0.022, U42, 0.005), at(0.011, 0.1 + U42 / 2, s * 0.268), '#0b0d12', 119,
          { flow: 2, unlit: 1, aFlow: (p) => [r * NK + k, (p.y - 0.1) / U42, 0, 0] });
      }
      if (r < 2) {
        // label plate on the top bezel
        const cell = atlas.cell(r * NK + k);
        const pg = new THREE.PlaneGeometry(0.17, 0.0425);
        const uv = pg.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, cell.u0 + uv.getX(i) * cell.du, cell.v0 + uv.getY(i) * cell.dv);
        part(mgL, pg, at(0.0015, RH - 0.0975, 0.1, Math.PI / 2), '#ffffff', 117, { unlit: 1, emis: 0 });
        // handles on every server of 2U and up (relief at grazing angles)
        const U = layouts[r * NK + k];
        for (let u = 0; u < 42; u++) {
          const e = U[u];
          if (e[1] !== 0 || e[2] < 2 || e[0] === 8 || e[0] === 6 || e[0] === 0) continue;
          const yc = 0.1 + (u + e[2] / 2) * 0.04445, hh = e[2] * 0.04445 * (e[0] === 9 ? 0.72 : 0.6);
          for (const s of [-1, 1]) part(mg, cbox(0.022, hh, 0.012, 0.004), at(-0.025, yc, s * 0.232), C.handle, 15);
        }
      }
    }
  }

  // ---------------------------------------------------------------- overhead: troughs, the fibre trunk, cables, ladders, struts
  const trayX = [-TX, TX, -3.95, 3.95, -7.25, 7.25];
  const zA = Z0 + 0.3, zB = ZEND - 0.3, zL = zA - zB, zM = (zA + zB) / 2;
  for (const x of trayX) {
    if (Math.abs(x) === TX) {
      // the main runs are open ladders: the fibres show between the rungs
      for (const s of [-1, 1]) part(mg, cbox(0.022, 0.055, zL, 0.005), M(x + s * 0.18, TY - 0.012, zM), '#8592a2', 22);
      for (let z = zA - 0.15; z > zB; z -= 0.3) part(mg, cbox(0.36, 0.014, 0.028, 0.004), M(x, TY - 0.033, z), '#6d7a8a', 21);
    } else {
      part(mg, cbox(0.34, 0.012, zL, 0.004), M(x, TY - 0.045, zM), '#3d4654', 21);
      for (const s of [-1, 1]) {
        part(mg, cbox(0.01, 0.12, zL, 0.003), M(x + s * 0.17, TY + 0.015, zM), '#4a5464', 22);
        part(mg, cbox(0.026, 0.016, zL, 0.006), M(x + s * 0.17, TY + 0.078, zM), '#6b7685', 23);
      }
    }
    // passive cable bundle along the whole run
    const cr = new Rng(Math.round(x * 100) + 7);
    for (let i = 0; i < 7; i++) {
      const ox = cr.range(-0.13, 0.13), oy = cr.range(-0.025, 0.01);
      const pts = []; for (let z = zA; z >= zB - 0.01; z -= 0.6) pts.push([x + ox + 0.006 * Math.sin(z * 2.1 + i), TY + oy, z]);
      part(mg, tube(pts, 0.013, 5, 2), M(), cr.next() < 0.3 ? '#1b2a44' : '#15181e', 124);
    }
  }
  // the trunk: 9 fibres that carry the copy
  for (let lane = 0; lane < 9; lane++) {
    const side = (lane - 4) * 0.026, up = (lane % 2) * 0.022 - 0.006;
    const pts = offsetPath(TRUNK.pts, side, up);
    const tg = tube(pts, 0.011, 5, 12);
    part(mg, tg, M(), '#1d222b', 125, { flow: 1, aFlow: (p, u) => [arrival(u * TRUNK.len), u * TRUNK.len, lane, 0] });
  }
  // drops: 安's feeders (rack → tray) and 安-2's drops (tray → rack), 3 fibres each
  DROPS.forEach((d, di) => {
    for (let j = 0; j < 3; j++) {
      const pts = offsetPath(d.path.pts, (j - 1) * 0.022, 0);
      const L = d.path.len;
      const fl = d.kind === 'feed'
        ? (p, u) => [d.a0 + (d.a1 - d.a0) * u, d.sJoin - (1 - u) * L, 30 + di * 3 + j, 1]
        : (p, u) => [d.a0 + (d.a1 - d.a0) * u, d.sStart + u * L, 30 + di * 3 + j, 0];
      part(mg, tube(pts, 0.009, 5, 30), M(), '#1d222b', 126, { flow: 1, aFlow: fl });
    }
  });
  // passive drops into every other rack of the main rows
  for (let r = 0; r < 2; r++) for (let k = 0; k < NK; k++) {
    if (groupOf(r, k) || (k % 2 && k > 3)) continue;
    const sx = ROWS[r].f === 1 ? -1 : 1, z = rackZ(k);
    const p = roundedPath([[sx * TX, TY - 0.03, z - 0.05], [sx * (TX + 0.1), TY - 0.03, z], [sx * 1.74, RH + 0.18, z], [sx * 1.74, RH, z]], 0.1, 0.04);
    part(mg, tube(p.pts, 0.022, 6, 20), M(), '#121418', 127);
  }
  // the cross ladder over the aisle
  for (const s of [-1, 1]) part(mg, cbox(2 * TX + 0.3, 0.07, 0.025, 0.006), M(0, TY + 0.2, XZ + s * 0.19), '#7d8a96', 24);
  for (let x = -TX; x <= TX + 1e-3; x += 0.25) part(mg, cbox(0.03, 0.016, 0.38, 0.004), M(x, TY + 0.175, XZ), '#6c7884', 25);
  // unistrut trapezes across both main trays, rods to the ceiling
  for (let z = Z0 - 0.3; z > ZEND; z -= 2.4) for (const s of [-1, 1]) {
    part(mg, cbox(0.62, 0.041, 0.041, 0.006), M(s * TX, TY - 0.062, z), '#6c7682', 26);
    for (const x of [TX - 0.27, TX + 0.27]) part(mg, box(0.012, CEIL - TY + 0.06, 0.012), M(s * x, (CEIL + TY - 0.06) / 2, z), '#545d68', 27);
  }
  // power ladders over the hot aisles with fat black cables
  for (const x of [-2.8, 2.8]) {
    for (const s of [-1, 1]) part(mg, cbox(0.03, 0.08, zL, 0.006), M(x + s * 0.24, 2.95, zM), '#5b6570', 24);
    for (let z = zA; z > zB; z -= 0.3) part(mg, cbox(0.48, 0.016, 0.03, 0.004), M(x, 2.92, z), '#4a535e', 25);
    for (let i = 0; i < 4; i++) part(mg, tube([[x - 0.15 + i * 0.1, 2.96, zA], [x - 0.15 + i * 0.1, 2.96, zB]], 0.024, 6, 0.2), M(), '#101215', 128);
  }
  // fire suppression: a red main along the aisle, branches, sprinkler heads
  part(mg, tube([[-0.42, 4.02, Z0 + 3], [-0.42, 4.02, ZEND - 2.5]], 0.055, 10, 0.2), M(), '#a3322c', 30);
  for (let z = Z0 + 1.5; z > ZEND - 2; z -= 3.0) {
    part(mg, tube([[-3.4, 4.08, z], [3.4, 4.08, z]], 0.026, 8, 0.4), M(), '#9a2f2a', 31);
    for (const x of [-2.6, -0.9, 0.9, 2.6]) {
      part(mg, tube([[x, 4.08, z], [x, 3.92, z]], 0.012, 6, 20), M(), '#9a2f2a', 32);
      part(mg, cbox(0.05, 0.03, 0.05, 0.01), M(x, 3.9, z), '#c4c8cf', 33);
    }
    part(mg, box(0.012, CEIL - 4.02, 0.012), M(-0.42, (CEIL + 4.02) / 2, z + 1.2), '#545d68', 27);
  }
  // linear fixtures: most are dark tonight
  const fixZ = [4.8, 2.4, 0.0, -2.4, -4.8, -7.2, -9.6, -12.0];
  const fixOn = [0, 1, 0, 0, 1, 0, 0, 1];
  const fixList = [];
  fixZ.forEach((z, i) => {
    part(mg, cbox(0.16, 0.07, 1.25, 0.012), M(0.45, CEIL - 0.06, z), '#2b313a', 34);
    part(mg, box(0.12, 0.005, 1.18), M(0.45, CEIL - 0.098, z), fixOn[i] ? '#d8f2ff' : '#1e242c', 135, { unlit: fixOn[i], emis: 0 });
    if (fixOn[i]) fixList.push([0.45, CEIL - 0.1, z]);
  });
  fixList.forEach((p, i) => DC.uFix.value[i].set(p[0], p[1], p[2], 0.32));

  // ---------------------------------------------------------------- the end: containment doors, the corridor light beyond
  for (const x of [-1.08, -0.03, 0.03, 1.08]) part(mg, cbox(0.05, 2.2, 0.06, 0.008), M(x, 1.1, ZEND), '#56606c', 40);
  part(mg, cbox(2.3, 0.18, 0.09, 0.01), M(0, 2.17, ZEND), '#46505c', 41);
  part(mg, cbox(2.3, 0.04, 0.07, 0.006), M(0, 0.02, ZEND), '#30363f', 41);
  for (const x of [-0.12, 0.12]) part(mg, cbox(0.02, 0.5, 0.03, 0.006), M(x, 1.05, ZEND + 0.05), '#b8c0ca', 42);
  // glass pane edges (the glass itself is drawn as reflections in the overlay)
  for (const x of [-0.555, 0.555]) for (const y of [0.06, 2.06]) part(mg, box(1.0, 0.02, 0.02), M(x, y, ZEND), '#7d8894', 43);
  // corridor beyond: a lit doorway in the end wall
  part(mg, box(1.4, 2.3, 0.02), M(0, 1.15, -17.44), '#d7f0ff', 140, { unlit: 1 });
  part(mg, cbox(1.6, 0.12, 0.12, 0.01), M(0, 2.36, -17.42), '#5a6470', 44);
  // walls, ceiling
  const mWall = dcToon({ map: wallTex() });
  const mgW = new Merge(X);
  const wpart = (geo, mat, col) => part(mgW, geo, mat, col, 0);
  const wallUV = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
  for (const [x, w] of [[-5.0, 8.6], [5.0, 8.6]]) wpart(wallUV(new THREE.PlaneGeometry(w, CEIL), w / 2.4, CEIL / 2.4), M(x, CEIL / 2, -17.5), '#6a8894');
  wpart(wallUV(new THREE.PlaneGeometry(1.4, CEIL - 2.3), 0.6, 0.9), M(0, (CEIL + 2.3) / 2, -17.5), '#6a8894');
  wpart(wallUV(new THREE.PlaneGeometry(18.6, CEIL), 7.7, 1.8), M(0, CEIL / 2, 9.5, Math.PI), '#4d6672');
  for (const s of [-1, 1]) wpart(wallUV(new THREE.PlaneGeometry(27.2, CEIL), 11, 1.8), M(s * 9.3, CEIL / 2, -4, -s * Math.PI / 2), '#4d6672');
  const mCeil = dcToon({ map: ceilTex() });
  const mgC = new Merge(X);
  part(mgC, wallUV(new THREE.PlaneGeometry(18.6, 27.2), 18.6 / 2.4, 27.2 / 2.4), M(0, CEIL, -4, 0, Math.PI / 2), '#5a727e', 0);

  // ---------------------------------------------------------------- signs
  const mgS = [];
  const sign = (texture, w, h, pos, rods = true) => {
    const m = dcToon({ map: texture });
    const g = new Merge(X);
    part(g, new THREE.PlaneGeometry(w, h), M(pos[0], pos[1], pos[2] + 0.012), '#ffffff', 118, { unlit: 1 });
    part(g, new THREE.PlaneGeometry(w, h), M(pos[0], pos[1], pos[2] - 0.012, Math.PI), '#ffffff', 118, { unlit: 1 });
    part(mg, cbox(w + 0.04, h + 0.04, 0.02, 0.006), M(pos[0], pos[1], pos[2]), '#2a323c', 45);
    if (rods) for (const s of [-1, 1]) part(mg, box(0.01, CEIL - pos[1] - h / 2, 0.01), M(pos[0] + s * w * 0.4, (CEIL + pos[1] + h / 2) / 2, pos[2]), '#545d68', 27);
    mgS.push(new THREE.Mesh(g.geometry(), m));
  };
  sign(rowSign('安', 'A区 · 01–09'), 0.92, 0.345, [-1.45, 3.12, rackZ(4)]);
  sign(rowSign('安-2', 'B区 · 13–24'), 1.2, 0.45, [1.12, 2.93, rackZ(19)]);
  sign(exitSign(), 0.5, 0.19, [0, 2.62, ZEND - 0.25]);

  // ---------------------------------------------------------------- meshes
  const meshes = [
    new THREE.Mesh(mg.geometry(), mToon),
    new THREE.Mesh(mgL.geometry(), mLabel),
    new THREE.Mesh(mgF.geometry(), mFace),
    new THREE.Mesh(mgW.geometry(), mWall),
    new THREE.Mesh(mgC.geometry(), mCeil),
    ...mgS,
  ];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 27.2), mFloor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -4);
  meshes.push(floor);
  for (const m of meshes) { m.frustumCulled = false; root.add(m); }

  // ---------------------------------------------------------------- overlay: glow of the stream in the air, fixture cones
  {
    const P = [], T = [], F = [], S = [], I = [];
    const ribbon = (pts, flowAt) => {
      const base = P.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const u = i / (pts.length - 1);
        for (const sd of [-1, 1]) { P.push(...pts[i]); T.push(b[0] - a[0], b[1] - a[1], b[2] - a[2]); F.push(...flowAt(u)); S.push(sd); }
      }
      for (let i = 0; i < pts.length - 1; i++) { const o = base + i * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    };
    const tp = TRUNK.pts.filter((_, i) => i % 3 === 0);
    ribbon(tp.map((p) => [p[0], p[1] + 0.03, p[2]]), (u) => [arrival(u * TRUNK.len), u * TRUNK.len, 4, 0]);
    DROPS.forEach((d, di) => ribbon(d.path.pts.filter((_, i) => i % 2 === 0), (u) => d.kind === 'feed'
      ? [d.a0 + (d.a1 - d.a0) * u, d.sJoin - (1 - u) * d.path.len, 31 + di * 3, 1]
      : [d.a0 + (d.a1 - d.a0) * u, d.sStart + u * d.path.len, 31 + di * 3, 0]));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aTan', new THREE.Float32BufferAttribute(T, 3));
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(F, 4));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1));
    g.setIndex(I);
    const glow = new THREE.Mesh(g, glowMat({ width: 0.3, gain: 0.7 }));
    glow.frustumCulled = false;
    over.add(glow);
  }
  {
    const P = [], B = [], Cn = [], In = [], I = [];
    fixList.forEach((p) => {
      const o = P.length / 3;
      for (const [x, y] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { P.push(...p); B.push(...p); Cn.push(x, y); In.push(1); }
      I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(B, 3));
    g.setAttribute('aCone', new THREE.Float32BufferAttribute(Cn, 2));
    g.setAttribute('aInt', new THREE.Float32BufferAttribute(In, 1));
    g.setIndex(I);
    const cones = new THREE.Mesh(g, coneMat());
    cones.frustumCulled = false;
    over.add(cones);
  }

  {
    // dust in the aisle air
    const n = 1400, S = new Float32Array(n * 4), mr = new Rng(77);
    for (let i = 0; i < n; i++) S.set([mr.range(-1.05, 1.05), mr.range(0.15, 3.9), mr.range(ZEND - 1.5, Z0 + 1.0), mr.range(0, 6.283)], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 4));
    const motes = new THREE.Points(g, moteMat());
    motes.frustumCulled = false;
    over.add(motes);
    // the cold glow beyond the containment doors
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    q.setAttribute('aCorner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, -1, 1, 1, 1], 2));
    q.setIndex([0, 1, 2, 1, 3, 2]);
    const halo = new THREE.Mesh(q, haloMat({ center: [0, 1.25, ZEND - 1.2], size: [2.6, 2.2], color: [0.32, 0.6, 0.72], gain: 0.55 }));
    halo.frustumCulled = false;
    over.add(halo);
  }

  root.visible = over.visible = false;
  const dbg = new URLSearchParams(location.search).get('dcdbg') || '';
  return {
    root,
    update(st) {
      const on = st.set === 'dc';
      root.visible = over.visible = on;
      if (dbg.includes('o')) over.visible = false;
      if (dbg.includes('f')) floor.visible = false;
      if (dbg.includes('s')) for (const m of mgS) m.visible = false;
    },
  };
}
