import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';

// 安's headquarters: a 600 m supertall at the origin. A chamfered square that tapers like a blade, stainless fins,
// mechanical belts every 50 m, a lattice crown and a mast. The meeting room (y 150, x ±9, window wall at z ≈ −7) sits
// behind its north face. Four amber 安 emblems ring the top of the shaft.
// Built in the same vertex layout as the city (city-bld.js) so it shares the facade shader (kind 5 = HQ).
export const HQ = { zc: 23.1, roof: 560, crown: 600, mast: 660, half0: 34, half1: 22, room: { x: 9.3, y0: 149.8, y1: 156.2 } };
const halfAt = (y) => HQ.half0 + (HQ.half1 - HQ.half0) * Math.pow(y / HQ.roof, 1.1);
// north face at the meeting room: z = zc − half(150) ≈ −7.4

function octo(a, c, zc) {
  return [[a, -a + c], [a, a - c], [a - c, a], [-a + c, a], [-a, a - c], [-a, -a + c], [-a + c, -a], [a - c, -a]].map(([x, z]) => [x, z + zc]);
}

export function buildHQ() {
  const P = [], N = [], AP = [], AB = [], AC = [], I = [];
  const seed = 0.4203;   // silver-blue glass, fins
  const put = (p, n, ap, kind, style, y0, y1) => {
    P.push(...p); N.push(...n); AP.push(...ap); AB.push(kind, seed, style, HQ.crown); AC.push(0, HQ.zc, y0, y1);
    return P.length / 3 - 1;
  };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
  // a lofted band between two rings (same vertex count); part 0 wall, 2 lattice, 3 plain
  const loft = (r0, y0, r1, y1, part, style = 1, kind = 5) => {
    const m = r0.length;
    let u = 0;
    for (let e = 0; e < m; e++) {
      const A0 = r0[e], B0 = r0[(e + 1) % m], A1 = r1[e], B1 = r1[(e + 1) % m];
      const len = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]);
      _a.set(B0[0] - A0[0], 0, B0[1] - A0[1]);
      _b.set(A1[0] - A0[0], y1 - y0, A1[1] - A0[1]);
      _n.crossVectors(_b, _a).normalize();
      const nn = [_n.x, _n.y, _n.z];
      const a = put([A0[0], y0, A0[1]], nn, [0, len, u, part], kind, style, y0, y1);
      const b = put([B0[0], y0, B0[1]], nn, [len, len, u, part], kind, style, y0, y1);
      const c = put([B1[0], y1, B1[1]], nn, [len, len, u, part], kind, style, y0, y1);
      const d = put([A1[0], y1, A1[1]], nn, [0, len, u, part], kind, style, y0, y1);
      I.push(a, c, b, a, d, c);
      u += len;
    }
  };
  const lid = (ring, y, kind = 5, style = 1) => {
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
    const base = P.length / 3;
    for (const [x, z] of ring) put([x, y, z], [0, 1, 0], [0, 0, 0, 1], kind, style, y, y);
    for (const [a, b, c] of tris) {
      const ax = ring[a][0], az = ring[a][1];
      const cr = (ring[b][0] - ax) * (ring[c][1] - az) - (ring[b][1] - az) * (ring[c][0] - ax);
      if (cr < 0) I.push(base + a, base + b, base + c); else I.push(base + a, base + c, base + b);
    }
  };
  // podium: a stepped stone base with a roof garden
  const pod = (x0, z0, x1, z1, h) => {
    const r = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].reverse();
    // make it CCW in (x, z) math orientation
    const ring = [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];
    let area = 0; for (let i = 0; i < 4; i++) { const p = ring[i], q = ring[(i + 1) % 4]; area += p[0] * q[1] - q[0] * p[1]; }
    const R = area > 0 ? ring : r;
    loft(R, 0, R, h, 0, 3, 0);
    lid(R, h, 0, 3);
  };
  pod(-62, -30, 62, 78, 24);
  pod(-46, -22, 46, 70, 36);
  // the shaft, chamfer growing toward the top
  const steps = 28;
  let prev = null, py = 0;
  for (let k = 0; k <= steps; k++) {
    const y = (k / steps) * HQ.roof;
    const a = halfAt(y), c = 6 + 4 * (y / HQ.roof);
    const ring = octo(a, c, HQ.zc);
    if (prev) loft(prev, py, ring, y, 0);
    prev = ring; py = y;
  }
  // the lattice crown (open frame) and a solid lantern inside it
  const a1 = halfAt(HQ.roof), c1 = 10;
  const top = octo(a1 * 0.7, c1 * 0.7, HQ.zc);
  loft(prev, HQ.roof, top, HQ.crown, 2);
  const lant = octo(a1 * 0.55, c1 * 0.5, HQ.zc), lant2 = octo(a1 * 0.4, c1 * 0.35, HQ.zc);
  loft(lant, HQ.roof, lant2, HQ.crown - 6, 3);
  lid(lant2, HQ.crown - 6);
  // mast
  const m0 = octo(3.2, 1.0, HQ.zc), m1 = octo(0.5, 0.15, HQ.zc);
  loft(m0, HQ.crown - 6, m1, HQ.mast, 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aP', new THREE.Float32BufferAttribute(AP, 4));
  g.setAttribute('aB', new THREE.Float32BufferAttribute(AB, 4));
  g.setAttribute('aC', new THREE.Float32BufferAttribute(AC, 4));
  g.setIndex(I);
  // footprints for the shadow raster
  const foot = [[HQ.crown, octo(halfAt(0), 6, HQ.zc)], [36, [[-46, -22], [46, -22], [46, 70], [-46, 70]]], [24, [[-62, -30], [62, -30], [62, 78], [-62, 78]]]];
  return { geo: g, foot };
}

// ---- the emblem: 安 in a rounded square, amber on dark glass (drawn once)
function emblemCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 512, 512);
  const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  c.strokeStyle = '#ffb547'; c.lineWidth = 22;
  rr(40, 40, 432, 432, 96); c.stroke();
  c.fillStyle = '#ffb547';
  c.font = '700 300px "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('安', 256, 270);
  return cv;
}

export function buildEmblems() {
  const tex = new THREE.CanvasTexture(emblemCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const u = { ...G, ...CU, uMap: { value: tex }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.FrontSide, depthWrite: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld; varying float vDepth;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      ${CITY_GLSL}
      uniform sampler2D uMap; uniform float uGain;
      varying vec2 vUv; varying vec3 vWorld; varying float vDepth;
      void main(){
        vec4 t = texture(uMap, vUv);
        if(t.a < 0.35) discard;
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        // amber glyph: lit metal letters by day, a hot glow by night and in the data city
        vec3 col = t.rgb * mix(1.1, 2.6, max(uNight, uDataAll)) * uGain;
        writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), vDepth * 0.15, 160.0);   // a light shines through the rain haze
      }
    `,
  });
  const grp = new THREE.Group();
  const y = 532, s = 30;
  const a = halfAt(y) + 0.9;
  const faces = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const [nx, nz] of faces) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
    m.position.set(nx * a, y, HQ.zc + nz * a);
    m.rotation.y = Math.atan2(nx, nz);
    grp.add(m);
  }
  return { grp, u };
}
