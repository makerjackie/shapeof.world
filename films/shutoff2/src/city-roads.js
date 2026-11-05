import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';
import { Rng } from './util.js';

// Streets from OSM (roads.bin: class, width, oneway, bridge; polylines with height): the elevated decks of the
// interchanges and flyovers on their piers, and the traffic — cars that drive the real avenues (a pure function of
// time). By night they are head- and tail-lights; in 安's view, packets of amber light running the network.

export function readRoads(buf) {
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), np = dv.getUint32(4, true);
  return { n, info: new Float32Array(buf, 8, n * 4), offs: new Uint32Array(buf, 8 + n * 16, n + 1), pts: new Float32Array(buf, 8 + n * 16 + (n + 1) * 4, np * 3) };
}

const SOLID_FS = /* glsl */ `
  ${COMMON}
  ${MRT_OUT}
  ${CITY_GLSL}
  varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv; varying float vK;
  void main(){
    if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
    vec3 N = normalize(vNormalW); vec3 w = vWorld;
    float mpp = length(fwidth(w));
    // deck top: asphalt with lane paint; sides: pale concrete with a railing line; piers: concrete
    vec3 alb = vK < 0.5 ? vec3(0.52, 0.53, 0.62) : vec3(0.84, 0.84, 0.86);
    if(vK < 0.5){
      float lane = 1.0 - smoothstep(0.012, 0.024, abs(vUv.y - 0.5));
      float dash = step(0.5, fract(vUv.x / 9.0));
      alb = mix(alb, vec3(0.92, 0.92, 0.9), lane * dash * (1.0 - smoothstep(0.3, 1.0, mpp)) * 0.7);
    } else if(vK < 1.5){
      float rail = 1.0 - smoothstep(0.0, max(0.05, mpp * 0.7), abs(vUv.y - 0.82));
      alb *= 1.0 - 0.25 * rail;
      alb *= 0.9 + 0.1 * step(0.5, vUv.y);
    }
    float ndl = dot(N, uSunDir);
    float sh = ndl > -0.05 ? cityShadow(w, N) : 0.0;
    float lit = smoothstep(-0.03, 0.12, ndl) * sh;
    float up = smoothstep(-0.6, 0.9, N.y);
    vec3 amb = mix(uShadeTint, uSkyTint, up * 0.45 + 0.2) * 0.88;
    amb *= 1.0 - 0.35 * step(N.y, -0.5);
    vec3 day = alb * (amb + uSunColor * 0.5 * lit * uSunStrength);
    vec3 night = alb * mix(vec3(0.04, 0.04, 0.09), vec3(0.07, 0.06, 0.13), up) + vec3(0.3, 0.22, 0.16) * (vK < 0.5 ? 0.25 : 0.0);
    vec3 col = mix(day, night, uNight);
    float glow;
    float front = ringFront(w, glow);
    float id = 0.0;
    if(front > -60.0 || glow > 0.01){
      float rv = step(hash12(floor(w.xz / 10.0)) * 30.0, front);
      vec3 data = vec3(0.01, 0.012, 0.024);
      float fwv = max(fwidth(vUv.y), 1e-4);
      float e = vK < 1.5 ? max(1.0 - smoothstep(fwv * 0.5, fwv * 1.5, vUv.y), 1.0 - smoothstep(fwv * 0.5, fwv * 1.5, 1.0 - vUv.y)) : 0.0;
      data += AMBER * e * 1.1;
      col = mix(col, data, rv);
      col += AMBER * glow * (1.7 - 0.7 * rv);
      id = rv > 0.5 ? 150.0 : 0.0;
    }
    writeOut(col, 1.0, normalize(vNormalV), fogDepth(vDepth), id);
  }
`;
const SOLID_VS = /* glsl */ `
  attribute float aK;
  varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv; varying float vK;
  void main(){
    vK = aK; vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal); vNormalV = normalize(normalMatrix * normal);
    vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
  }
`;

// elevated decks + piers
export function buildBridges(R) {
  const P = [], N = [], UV = [], K = [], I = [];
  const quad = (a, b, c, d, n, uvs, k) => {
    const base = P.length / 3;
    for (const v of [a, b, c, d]) P.push(...v);
    for (let i = 0; i < 4; i++) { N.push(...n); K.push(k); }
    UV.push(...uvs);
    I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  const box = (cx, y0, y1, cz, hw, hd, ang) => {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [cx + u * ca - v * sa, cz + u * sa + v * ca]);
    for (let e = 0; e < 4; e++) {
      const [x0, z0] = c[e], [x1, z1] = c[(e + 1) % 4];
      const L = Math.hypot(x1 - x0, z1 - z0) || 1;
      const n = [(z1 - z0) / L, 0, -(x1 - x0) / L];
      // outward normal for a CW/CCW-agnostic box: flip if it points to the centre
      if ((x0 + x1) / 2 - cx) { /* noop */ }
      const mx = (x0 + x1) / 2 - cx, mz = (z0 + z1) / 2 - cz;
      if (n[0] * mx + n[2] * mz < 0) { n[0] = -n[0]; n[2] = -n[2]; quad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], n, [0, 0, 1, 0, 1, 1, 0, 1], 2); }
      else quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], n, [0, 0, 1, 0, 1, 1, 0, 1], 2);
    }
  };
  for (let i = 0; i < R.n; i++) {
    if (R.info[i * 4 + 3] < 0.5) continue;
    const w = R.info[i * 4 + 1];
    const o0 = R.offs[i], o1 = R.offs[i + 1];
    let along = 0, nextPier = 18;
    for (let k = o0; k < o1 - 1; k++) {
      const x0 = R.pts[k * 3], y0 = R.pts[k * 3 + 1], z0 = R.pts[k * 3 + 2];
      const x1 = R.pts[k * 3 + 3], y1 = R.pts[k * 3 + 4], z1 = R.pts[k * 3 + 5];
      const L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 0.5) continue;
      if (y0 < 0.8 && y1 < 0.8) { along += L; continue; }
      const dx = (x1 - x0) / L, dz = (z1 - z0) / L, nx = -dz, nz = dx;
      const hw = w / 2 + 1.0, T = 1.6;
      const yt0 = y0 + 0.15, yt1 = y1 + 0.15;
      const A = [x0 + nx * hw, yt0, z0 + nz * hw], B = [x1 + nx * hw, yt1, z1 + nz * hw];
      const C = [x1 - nx * hw, yt1, z1 - nz * hw], D = [x0 - nx * hw, yt0, z0 - nz * hw];
      // top (uv: x along in m, y across 0..1 lanes); winding chosen so the normal points up
      const up = (B[0] - A[0]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[0] - A[0]) < 0;
      if (up) quad(A, B, C, D, [0, 1, 0], [along, 1, along + L, 1, along + L, 0, along, 0], 0);
      else quad(D, C, B, A, [0, 1, 0], [along, 0, along + L, 0, along + L, 1, along, 1], 0);
      // the two sides (parapets) and the soffit
      const sideL = [[A, B, [nx, 0, nz]], [C, D, [-nx, 0, -nz]]];
      for (const [p, q, n] of sideL) {
        const pl = [p[0], p[1] - T, p[2]], ql = [q[0], q[1] - T, q[2]];
        const pu = [p[0], p[1] + 1.1, p[2]], qu = [q[0], q[1] + 1.1, q[2]];
        quad(pl, ql, qu, pu, n, [along, 0, along + L, 0, along + L, 1, along, 1], 1);
      }
      quad([D[0], D[1] - T, D[2]], [C[0], C[1] - T, C[2]], [B[0], B[1] - T, B[2]], [A[0], A[1] - T, A[2]], [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1], 1);
      // piers every ~32 m
      while (nextPier < along + L) {
        const f = (nextPier - along) / L;
        const px = x0 + (x1 - x0) * f, pz = z0 + (z1 - z0) * f, py = y0 + (y1 - y0) * f;
        if (py > 3) box(px, 0, py - T, pz, Math.min(w * 0.3, 5), 1.3, Math.atan2(dz, dx) + Math.PI / 2);
        nextPier += 32;
      }
      along += L;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 1));
  g.setIndex(I);
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { ...G, ...CU }, vertexShader: SOLID_VS, fragmentShader: SOLID_FS, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  return m;
}

// ---- traffic
export function buildTraffic(R, focus) {
  const rng = new Rng(4409);
  const roads = [];   // { pts: [[x,y,z]...], cum: [...], L }
  const cars = [];    // road, s0, v, lane, col
  for (let i = 0; i < R.n; i++) {
    const c = R.info[i * 4];
    if (c > 4) continue;
    const o0 = R.offs[i], o1 = R.offs[i + 1];
    const x = R.pts[o0 * 3], z = R.pts[o0 * 3 + 2];
    if (!focus.some(([fx, fz, fr]) => Math.hypot(x - fx, z - fz) < fr)) continue;
    const pts = [], cum = [0];
    for (let k = o0; k < o1; k++) {
      pts.push([R.pts[k * 3], R.pts[k * 3 + 1], R.pts[k * 3 + 2]]);
      if (k > o0) cum.push(cum[cum.length - 1] + Math.hypot(pts[pts.length - 1][0] - pts[pts.length - 2][0], pts[pts.length - 1][2] - pts[pts.length - 2][2]));
    }
    const L = cum[cum.length - 1];
    if (L < 40) continue;
    const ri = roads.length;
    roads.push({ pts, cum, L });
    const w = R.info[i * 4 + 1], oneway = R.info[i * 4 + 2] > 0.5;
    const lanes = Math.max(1, Math.min(3, Math.round(w / 7)));
    const dirs = oneway ? [1] : [1, -1];
    const gap = c <= 1 ? 26 : c <= 2 ? 34 : 48;
    for (const dir of dirs) {
      for (let ln = 0; ln < lanes; ln++) {
        const off = oneway ? (ln - (lanes - 1) / 2) * 3.3 : dir * (1.8 + ln * 3.3);
        for (let s = rng.range(0, gap); s < L; s += gap * rng.range(0.5, 1.6)) {
          if (cars.length >= 9000) break;
          const r = rng.next();
          const col = r < 0.3 ? [0.94, 0.94, 0.95] : r < 0.5 ? [0.72, 0.74, 0.78] : r < 0.68 ? [0.12, 0.13, 0.16] : r < 0.78 ? [0.78, 0.2, 0.2] : r < 0.88 ? [0.25, 0.4, 0.7] : [0.9, 0.82, 0.6];
          cars.push({ ri, s0: s, v: dir * rng.range(8, 15) * (c <= 1 ? 1.3 : 1), off, col, big: rng.next() < 0.08 });
        }
      }
    }
  }
  const n = cars.length;
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const aC = new Float32Array(n * 4);
  cars.forEach((c, i) => aC.set([...c.col, c.big ? 1 : 0], i * 4));
  geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(aC, 4));
  const u = { ...G, ...CU };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      attribute vec4 aCol;
      varying vec4 vCol; varying vec3 vWorld, vNormalW, vNormalV, vLocal; varying float vDepth;
      void main(){
        vCol = aCol; vLocal = position;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vWorld = wp.xyz;
        vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vNormalW = n; vNormalV = normalize(mat3(viewMatrix) * n);
        vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      ${CITY_GLSL}
      varying vec4 vCol; varying vec3 vWorld, vNormalW, vNormalV, vLocal; varying float vDepth;
      void main(){
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        vec3 N = normalize(vNormalW); vec3 w = vWorld;
        vec3 alb = vCol.rgb;
        // the glasshouse: a darker band on the upper half
        if(vLocal.y > 0.55 && abs(vLocal.x) < 0.3) alb = mix(alb, vec3(0.15, 0.18, 0.25), 0.8);
        float ndl = dot(N, uSunDir);
        float sh = ndl > -0.05 ? cityShadow(w, N) : 0.0;
        float lit = smoothstep(-0.03, 0.12, ndl) * sh;
        float up = smoothstep(-0.6, 0.9, N.y);
        vec3 amb = mix(uShadeTint, uSkyTint, up * 0.45 + 0.2) * 0.85;
        vec3 day = alb * (amb + uSunColor * 0.55 * lit * uSunStrength);
        // by night: dark bodies, two headlights in front, two tail-lights behind
        vec2 lp = vec2(abs(vLocal.z) - 0.3, vLocal.y - 0.42);
        float lamp = 1.0 - smoothstep(0.1, 0.16, length(lp * vec2(1.0, 1.6)));
        vec3 night = alb * 0.06 + vec3(1.0, 0.95, 0.85) * 3.2 * lamp * step(0.46, vLocal.x) + vec3(1.0, 0.12, 0.08) * 2.4 * lamp * step(vLocal.x, -0.46);
        vec3 col = mix(day, night, uNight);
        float glow;
        float front = ringFront(w, glow);
        float id = 0.0;
        if(front > -40.0 || glow > 0.01){
          float rv = step(hash12(floor(w.xz / 10.0)) * 20.0, front);
          vec3 data = AMBER * 2.4 * (0.7 + 0.3 * vCol.r);
          col = mix(col, data, rv);
          col += AMBER * glow;
          id = rv > 0.5 ? 150.0 : 0.0;
        }
        writeOut(col, 1.0, normalize(vNormalV), fogDepth(vDepth), id);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  function update(t) {
    for (let i = 0; i < n; i++) {
      const c = cars[i], r = roads[c.ri];
      let s = (c.s0 + c.v * t) % r.L; if (s < 0) s += r.L;
      // binary search the segment
      let lo = 0, hi = r.cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (r.cum[mid] <= s) lo = mid; else hi = mid; }
      const a = r.pts[lo], b = r.pts[lo + 1];
      const segL = r.cum[lo + 1] - r.cum[lo] || 1;
      const f = (s - r.cum[lo]) / segL;
      const dx = (b[0] - a[0]) / segL, dz = (b[2] - a[2]) / segL;
      const sgn = Math.sign(c.v);
      const x = a[0] + (b[0] - a[0]) * f - dz * c.off, z = a[2] + (b[2] - a[2]) * f + dx * c.off;
      const y = a[1] + (b[1] - a[1]) * f + 0.15;
      Q.setFromAxisAngle(Y, -Math.atan2(dz * sgn, dx * sgn));
      M.compose(T.set(x, y, z), Q, c.big ? S.set(11, 3.2, 2.5) : S.set(4.5, 1.45, 1.85));
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update, count: n };
}
