// 关不掉 v13 · DC department — the main switchgear (主电源) against the hall's back wall, for k11 breaker.
// A lineup of five steel cabinets; the centre one holds the motorised main breaker: meters, a digital power meter,
// pilot lamps (green 合闸 / red 分闸 / white 电源), a big lever on an ON/OFF ring, the breaker fascia with its arc chute.
// At CUES.breaker the lever slams down by itself (overshoot, rattle), the lamps flip green → red, the needles fall,
// and an arc flashes out of the chute with a spray of sparks. Pure functions of st.t.
import * as THREE from 'three';
import { Merge, M, cbox, box } from './dc-geo.js';
import { DC, dcToon, haloMat } from './dc-mat.js';
import { mainPlate, warnLabel, handleRing, meterFace, meterDisplay } from './dc-tex.js';
import { SW, CEIL, BREAKER, handleAngle, shakeAt, arcAt, hash1, smooth } from './dc-flow.js';
import { G } from './glsl.js';

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const X = { aCol: 3, aMisc: 4, aFlow: 4 };
const part = (m, geo, mat, col, id, o = {}) => m.add(geo, mat, { aCol: lin(col), aMisc: [id, o.emis ?? 0, o.kind ?? 0, o.unlit ?? 0], aFlow: o.flow ?? [0, 0, 0, 0] });
const deg = (d) => (d * Math.PI) / 180;
const cyl = (r, h, n = 24) => new THREE.CylinderGeometry(r, r, h, n);   // axis y; rotate rx = π/2 for an axis along z

export function createSwitch(root, over) {
  const g = new THREE.Group();
  root.add(g);
  const mg = new Merge(X);
  const zf = SW.z - 0.03;                       // the doors' front plane
  const xc = SW.x;
  const C = { body: '#9aa5b0', door: '#aeb8c2', plinth: '#343a43', dark: '#2c323b', steel: '#717b87', black: '#15181d' };
  for (let i = 0; i < SW.n; i++) {
    const x = xc + (i - (SW.n - 1) / 2) * SW.w, main = i === (SW.n - 1) / 2;
    part(mg, cbox(SW.w - 0.012, SW.h, SW.d, 0.012), M(x, 0.1 + SW.h / 2, SW.z + SW.d / 2), C.body, 50);
    part(mg, cbox(SW.w, 0.1, SW.d - 0.04, 0.008), M(x, 0.05, SW.z + SW.d / 2), C.plinth, 51);
    part(mg, cbox(SW.w - 0.07, SW.h - 0.14, 0.028, 0.008), M(x, 0.1 + SW.h / 2, zf + 0.012), C.door, 52);
    // hinges (left as seen from the hall = +x) and a latch handle
    for (const y of [0.45, 1.25, 2.05]) part(mg, cyl(0.014, 0.09, 10), M(x + SW.w / 2 - 0.045, y, zf - 0.006), C.steel, 53);
    part(mg, cbox(0.03, 0.2, 0.035, 0.008), M(x - SW.w / 2 + 0.07, 1.25, zf - 0.016), C.black, 54);
    // louvres top and bottom
    for (let j = 0; j < 6; j++) {
      for (const y0 of [0.26, 2.0]) part(mg, cbox(SW.w - 0.26, 0.012, 0.022, 0.003), M(x, y0 + j * 0.03, zf - 0.006, 0, deg(-30)), C.dark, 55);
    }
    if (!main) {
      // instrument strip and a tag on the other cabinets
      part(mg, box(0.16, 0.045, 0.004), M(x, 2.2, zf - 0.004), '#e9ecef', 56);
      for (let j = 0; j < 2; j++) part(mg, cyl(0.03, 0.02, 16), M(x - 0.08 + j * 0.16, 1.85, zf - 0.008, 0, Math.PI / 2), C.black, 57);
      part(mg, box(0.22, 0.12, 0.006), M(x, 1.6, zf - 0.004), '#1b2128', 58);
    }
  }
  // ---- the main cabinet's front
  const yM = 1.92, yD = 1.72, yL = 1.56, yH = 1.2, yB = 0.66;
  part(mg, cbox(0.62, 0.62, 0.02, 0.006), M(xc, 1.82, zf - 0.006), '#c3cbd3', 60);       // instrument panel
  part(mg, cbox(0.56, 0.5, 0.055, 0.01), M(xc, yB, zf - 0.03), '#3b414b', 61);            // breaker fascia
  for (let j = 0; j < 9; j++) part(mg, box(0.035, 0.012, 0.02), M(xc - 0.2 + j * 0.05, yB + 0.2, zf - 0.06), '#0b0d10', 62);   // arc chute slots
  for (const [dx, col] of [[-0.06, '#1fa64a'], [0.06, '#c3202a']]) part(mg, cyl(0.024, 0.025, 20), M(xc + dx, yB - 0.12, zf - 0.065, 0, Math.PI / 2), col, 63);
  part(mg, cyl(0.06, 0.06, 28), M(xc, yH, zf - 0.03, 0, Math.PI / 2), C.steel, 64);         // the lever's hub
  // pilot lamps: bezels + domes (kind 6: lit by uLamp: id 0 green, 1 red, 2 white)
  [[-0.13, 0, '#2a7a3c'], [0, 1, '#7a2228'], [0.13, 2, '#9aa2aa']].forEach(([dx, id, col]) => {
    part(mg, cyl(0.036, 0.02, 24), M(xc + dx, yL, zf - 0.012, 0, Math.PI / 2), '#1d2228', 65);
    part(mg, new THREE.SphereGeometry(0.027, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(xc + dx, yL, zf - 0.022, 0, -Math.PI / 2), col, 166, { kind: 6, unlit: 1, flow: [id, 0, 0, 0] });
  });
  // the breaker's ON / OFF indicator flags
  part(mg, box(0.07, 0.04, 0.004), M(xc - 0.12, yB + 0.02, zf - 0.06), '#1f6a33', 167, { kind: 6, unlit: 1, flow: [0, 0, 0, 0] });
  part(mg, box(0.07, 0.04, 0.004), M(xc + 0.12, yB + 0.02, zf - 0.06), '#6a1f24', 167, { kind: 6, unlit: 1, flow: [1, 0, 0, 0] });
  // busway above the lineup, dropping into the main cabinet; cable bundles into the others; hanger rods
  const bz = SW.z + 0.45;
  part(mg, cbox(4.6, 0.24, 0.44, 0.02), M(xc, 3.3, bz), '#7f8a95', 70);
  part(mg, cbox(0.44, 0.98, 0.24, 0.02), M(xc, 2.85, bz), '#7f8a95', 70);
  for (let j = -2; j <= 2; j++) part(mg, cbox(0.05, 0.3, 0.5, 0.008), M(xc + j * 0.92, 3.3, bz), '#5f6873', 71);
  for (const y of [2.55, 3.0]) part(mg, cbox(0.5, 0.04, 0.3, 0.008), M(xc, y, bz), '#5f6873', 71);
  for (let j = -2; j <= 2; j++) part(mg, box(0.014, CEIL - 3.42, 0.014), M(xc + j * 0.92 + 0.3, (CEIL + 3.42) / 2, bz), '#545d68', 27);
  for (let i = 0; i < SW.n; i++) {
    if (i === (SW.n - 1) / 2) continue;
    const x = xc + (i - (SW.n - 1) / 2) * SW.w;
    for (let j = 0; j < 3; j++) {
      const ox = (j - 1) * 0.09, curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x + ox, CEIL, bz + 0.12), new THREE.Vector3(x + ox * 1.3, 3.0, bz + 0.1), new THREE.Vector3(x + ox, 0.1 + SW.h + 0.01, SW.z + 0.5)]);
      part(mg, new THREE.TubeGeometry(curve, 16, 0.032, 8, false), M(), C.black, 72);
    }
  }
  const body = new THREE.Mesh(mg.geometry(), dcToon());
  body.frustumCulled = false;
  g.add(body);

  // ---- textured plates (unlit-ish cel: kind 0, lit by the hall)
  const plate = (texture, w, h, x, y, id, unlit = 0, dz = 0.0045) => {
    const m = new Merge(X);
    part(m, new THREE.PlaneGeometry(w, h), M(x, y, zf - dz, Math.PI), '#ffffff', id, { unlit });
    const mesh = new THREE.Mesh(m.geometry(), dcToon({ map: texture }));
    mesh.frustumCulled = false;
    g.add(mesh);
    return mesh;
  };
  plate(mainPlate(), 0.56, 0.175, xc, 2.24, 80);
  plate(warnLabel(), 0.13, 0.163, xc + 0.27, yH, 81);
  plate(warnLabel(), 0.13, 0.163, xc - 0.27, yH, 81);
  const ring = plate(handleRing(), 0.36, 0.36, xc, yH, 82);
  ring.position.z = -0.002;
  const fA = meterFace('A'), fV = meterFace('V');
  const dialX = [-0.2, 0, 0.2];
  dialX.forEach((dx, i) => plate(i === 1 ? fV : fA, 0.14, 0.14, xc + dx, yM, 83, 0, 0.0185));
  const dispOn = meterDisplay(true), dispOff = meterDisplay(false);
  const disp = plate(dispOn, 0.24, 0.075, xc, yD, 184, 1, 0.0185);

  // ---- moving parts: the lever (pivot at the hub) and the needles
  const lever = new THREE.Group();
  lever.position.set(xc, yH, zf - 0.065);
  {
    const m = new Merge(X);
    part(m, cbox(0.4, 0.06, 0.032, 0.01), M(-0.18, 0, 0), '#2a2f37', 90);
    part(m, cyl(0.04, 0.03, 24), M(0, 0, 0, 0, Math.PI / 2), '#59626d', 91);
    part(m, cyl(0.034, 0.17, 20), M(-0.36, 0, -0.085, 0, Math.PI / 2), C.black, 92);
    part(m, cyl(0.037, 0.035, 20), M(-0.36, 0, -0.185, 0, Math.PI / 2), '#c3202a', 93);
    const mesh = new THREE.Mesh(m.geometry(), dcToon());
    mesh.frustumCulled = false;
    lever.add(mesh);
  }
  g.add(lever);
  const needles = dialX.map((dx) => {
    const n = new THREE.Group();
    n.position.set(xc + dx, yM - 0.032, zf - 0.023);
    const m = new Merge(X);
    part(m, box(0.004, 0.06, 0.003), M(0, 0.03, 0), '#141820', 94);
    part(m, cyl(0.007, 0.005, 12), M(0, 0, 0, 0, Math.PI / 2), '#141820', 94);
    const mesh = new THREE.Mesh(m.geometry(), dcToon());
    mesh.frustumCulled = false;
    n.add(mesh);
    g.add(n);
    return n;
  });

  // ---- the arc: sparks (streaks) and a flash halo out of the chute
  const chute = [xc, yB + 0.22, zf - 0.08];
  const NS = 110;
  const seed = new Float32Array(NS * 2 * 4), end = new Float32Array(NS * 2);
  for (let i = 0; i < NS; i++) {
    const a = hash1(i * 3.1) * Math.PI - Math.PI / 2, sp = 1.5 + 3.5 * hash1(i * 7.7), up = hash1(i * 5.3) * 2.6 - 0.4;
    const v = [Math.sin(a) * sp * 0.8, up, -Math.abs(Math.cos(a)) * sp * 0.9 - 0.4];
    for (let e = 0; e < 2; e++) { seed.set([v[0], v[1], v[2], 0.25 + 0.5 * hash1(i * 1.9)], (i * 2 + e) * 4); end[i * 2 + e] = e; }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 2 * 3), 3));
  sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
  sg.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 1));
  const sparkMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uTime: G.uTime, uT0: { value: BREAKER + 0.07 }, uO: { value: new THREE.Vector3(...chute) } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; attribute float aEnd;
      uniform float uTime, uT0; uniform vec3 uO;
      varying float vK;
      void main(){
        float a = uTime - uT0 - aEnd * 0.022;
        float life = aSeed.w;
        if(a < 0.0 || a > life){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vK = 0.0; return; }
        vec3 p = uO + aSeed.xyz * a + vec3(0.0, -4.9, 0.0) * a * a;
        p.y = max(p.y, 0.005);
        vK = 1.0 - a / life;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK; out vec4 oColor;
      void main(){ oColor = vec4(vec3(0.75, 0.88, 1.0) * 2.4 * vK * vK, 1.0); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.LineSegments(sg, sparkMat);
  sparks.frustumCulled = false;
  const sparkG = new THREE.Group();
  sparkG.add(sparks);
  over.add(sparkG);
  const q = new THREE.BufferGeometry();
  q.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  q.setAttribute('aCorner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, -1, 1, 1, 1], 2));
  q.setIndex([0, 1, 2, 1, 3, 2]);
  const flash = new THREE.Mesh(q, haloMat({ center: chute, size: [0.9, 0.9], color: [0.7, 0.85, 1.0], gain: 0 }));
  flash.frustumCulled = false;
  over.add(flash);

  const needleAngle = (t, i) => {
    const live = 34 + i * 6 + 1.5 * Math.sin(t * 3.1 + i * 2.0);
    const a = t - BREAKER - 0.05;
    if (a <= 0) return live;
    const zero = -45;
    return zero + (live - zero) * Math.exp(-a * 6) * Math.cos(a * 9);
  };
  return {
    chute,
    update(st, on) {
      g.visible = on;
      sparkG.visible = flash.visible = on;
      if (!on) return;
      const t = st.t;
      lever.rotation.z = -deg(handleAngle(t));
      const sh = shakeAt(t);
      lever.position.x = xc + sh; lever.position.y = yH + sh * 0.6;
      needles.forEach((n, i) => { n.rotation.z = deg(needleAngle(t, i)); n.position.x = xc + dialX[i] + sh * 0.5; });
      disp.material.uniforms.uMap.value = t < BREAKER + 0.05 ? dispOn : dispOff;
      const a = t - BREAKER;
      const redOn = a < 0.06 ? 0 : a < 0.2 ? (hash1(Math.floor(t * 30)) > 0.4 ? 1 : 0.2) : 1;
      DC.uLamp.value.set(a < 0.04 ? 1 : 0, redOn, a < 0 ? 1 : 0, 0);
      flash.material.uniforms.uGain.value = 0.9 * arcAt(t);
    },
  };
}
