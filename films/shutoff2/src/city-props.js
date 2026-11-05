import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';
import { Rng } from './util.js';

// Roof furniture: cooling towers, plant rooms, lift overruns, water tanks, the odd billboard frame — the clutter that
// makes a roofscape read as a real city from the air. One instanced box mesh, painted like the facades.

function inside(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export function buildRoofProps(vols) {
  const rng = new Rng(7721);
  const mats = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const tint = [];
  for (const V of vols) {
    if (V.part === 2 || V.y1 < 12) continue;
    const ring = V.ring;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, area = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x, z] = ring[i], [xn, zn] = ring[(i + 1) % ring.length];
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      area += x * zn - xn * z;
    }
    area = Math.abs(area) / 2;
    if (area < 60) continue;
    // the longest edge orients the clutter
    let best = 0, ang = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x, z] = ring[i], [xn, zn] = ring[(i + 1) % ring.length];
      const L = Math.hypot(xn - x, zn - z);
      if (L > best) { best = L; ang = Math.atan2(zn - z, xn - x); }
    }
    const village = V.kind === 2;
    const n = village ? (rng.next() < 0.7 ? 1 + Math.floor(rng.next() * 2) : 0) : Math.min(7, 1 + Math.floor(area / 380 * rng.range(0.6, 1.3)));
    const r = Math.sqrt(area);
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 8; tries++) {
        const x = rng.range(x0, x1), z = rng.range(z0, z1);
        let w, d, h, kind;
        if (village) { w = rng.range(1.6, 3.2); d = w; h = rng.range(1.4, 2.6); kind = 1; }        // water tank / stair hut
        else {
          const big = k === 0 && r > 18;
          w = big ? rng.range(0.22, 0.42) * r : rng.range(2.5, Math.min(9, 0.25 * r));
          d = big ? rng.range(0.18, 0.32) * r : rng.range(2.0, Math.min(7, 0.2 * r));
          h = big ? rng.range(3.2, 5.5) : rng.range(1.2, 3.6);
          kind = big ? 0 : rng.next() < 0.5 ? 2 : 3;
        }
        // keep the whole box on the roof
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const ok = [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => inside(ring, x + (a * w / 2 + 1) * ca - (b * d / 2 + 1) * sa, z + (a * w / 2 + 1) * sa + (b * d / 2 + 1) * ca));
        if (!ok) continue;
        Q.setFromAxisAngle(Y, -ang);
        M.compose(T.set(x, V.y1, z), Q, S.set(w, h, d));
        mats.push(M.clone());
        tint.push(kind, V.seed, V.y1, 0);
        break;
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const u = { ...G, ...CU };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      attribute vec4 aT;
      varying vec4 vT; varying vec3 vWorld, vNormalW, vNormalV, vLocal, vScale; varying float vDepth;
      void main(){
        vT = aT;
        mat4 im = instanceMatrix;
        vScale = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz));
        vLocal = position * vScale;
        vec4 wp = modelMatrix * im * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec3 n = normalize(mat3(modelMatrix) * mat3(im) * (normal / vScale));
        vNormalW = n;
        vNormalV = normalize(mat3(viewMatrix) * n);
        vec4 mv = viewMatrix * wp; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      ${CITY_GLSL}
      varying vec4 vT; varying vec3 vWorld, vNormalW, vNormalV, vLocal, vScale; varying float vDepth;
      void main(){
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        vec3 N = normalize(vNormalW); vec3 w = vWorld;
        float kind = vT.x, seed = vT.y;
        float r = hash12(vec2(seed, kind + floor(w.x)));
        vec3 alb = kind < 0.5 ? vec3(0.80, 0.82, 0.84) : kind < 1.5 ? mix(vec3(0.86, 0.86, 0.84), vec3(0.42, 0.55, 0.72), step(0.6, r)) : kind < 2.5 ? vec3(0.72, 0.74, 0.76) : vec3(0.88, 0.88, 0.86);
        // louvres on plant rooms, a dark grille on top of the cooling towers
        float side = 1.0 - abs(N.y);
        alb *= 1.0 - 0.08 * side * step(0.5, fract(vLocal.y / 0.6)) * (1.0 - smoothstep(0.05, 0.2, length(fwidth(w))));
        if(N.y > 0.5 && kind > 1.5 && kind < 2.5){ vec2 q = vLocal.xz / vScale.xz; alb *= 1.0 - 0.5 * step(length(q), 0.3); }
        float ndl = dot(N, uSunDir);
        float sh = ndl > -0.05 ? cityShadow(w, N) : 0.0;
        float lit = smoothstep(-0.03, 0.12, ndl) * sh;
        float up = smoothstep(-0.6, 0.9, N.y);
        vec3 amb = mix(uShadeTint, uSkyTint, up * 0.45 + 0.2) * 0.88;
        vec3 day = alb * (amb + uSunColor * 0.5 * lit * uSunStrength);
        vec3 night = alb * mix(vec3(0.04, 0.04, 0.09), vec3(0.08, 0.07, 0.15), up);
        vec3 col = mix(day, night, uNight);
        float glow;
        float front = ringFront(w, glow);
        float id = 0.0;
        if(front > -60.0 || glow > 0.01){
          float rv = step(hash12(vec2(seed, 3.0)) * 30.0, front);
          vec3 data = vec3(0.01, 0.012, 0.024);
          // box edges as hairlines
          vec3 q = abs(vLocal / vScale - vec3(0.0, 0.5, 0.0)) * 2.0;     // 0 centre .. 1 face edges
          vec3 fw = fwidth(vLocal) / vScale * 2.0;
          float e = 0.0;
          e = max(e, (1.0 - abs(N.x)) * (1.0 - abs(N.z)) * 0.0);
          float ex = 1.0 - smoothstep(1.0 - fw.x * 1.5, 1.0 - fw.x * 0.5, q.x);
          float ey = 1.0 - smoothstep(1.0 - fw.y * 1.5, 1.0 - fw.y * 0.5, q.y);
          float ez = 1.0 - smoothstep(1.0 - fw.z * 1.5, 1.0 - fw.z * 0.5, q.z);
          float edges = abs(N.y) > 0.5 ? max(1.0 - ex, 1.0 - ez) : abs(N.x) > 0.5 ? max(1.0 - ey, 1.0 - ez) : max(1.0 - ex, 1.0 - ey);
          data += AMBER * edges * 1.0;
          col = mix(col, data, rv);
          col += AMBER * glow * (1.6 - 0.7 * rv);
          id = rv > 0.5 ? 150.0 : 0.0;
        }
        writeOut(col, 1.0, normalize(vNormalV), fogDepth(vDepth), id);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  geo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(tint), 4));
  mesh.frustumCulled = false;
  return mesh;
}
