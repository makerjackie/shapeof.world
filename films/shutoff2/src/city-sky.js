import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { Rng } from './util.js';

// The sky over the city (a far-plane dome that follows the camera). Three moods, blended by uniforms:
//   day   — deep anime blue, towering white cumulus with lavender shade sides (after LEVIATHAN's world-sky, MIT)
//   night — low rain cloud lit from below by the city: ultramarine above, a violet-rose glow along the horizon
//   data  — the city as 安 sees it: near-black navy, a faint amber breath along the horizon
// Writes view depth 9000 (= sky for the atmosphere pass) and id 0 (painted).

function cloudTower(rng, o) {
  const puffs = [];
  const R0 = o.r ?? 3.4;
  const rows = Math.max(1, Math.round(o.h / (R0 * 0.9)));
  const prof = o.prof ?? ((f) => 1 - 0.42 * f * f);
  for (let k = 0; k <= rows; k++) {
    const f = rows ? k / rows : 0;
    const y = o.base + R0 * 0.55 + f * (o.h - R0 * 1.35);
    const width = Math.max(R0 * 0.6, o.w * prof(f));
    const n = Math.max(1, Math.round(width / (R0 * 1.12)));
    for (let i = 0; i < n; i++) {
      const uu = n === 1 ? 0 : i / (n - 1) - 0.5;
      const x = o.az + (o.lean ?? 0) * f * o.h + uu * (width - R0) + rng.range(-0.3, 0.3) * R0;
      const r = R0 * rng.range(0.8, 1.15) * (1 - 0.2 * f);
      const z = (1 - f) * R0 * 1.6 + (0.5 - Math.abs(uu)) * R0 * 1.3 + rng.range(0, 0.5) * R0;
      puffs.push([x, y + rng.range(-0.3, 0.3) * R0, r, z]);
    }
  }
  const body = puffs.length;
  for (let i = 0; i < body * 1.6 && puffs.length < 96; i++) {
    const [x, y, r, z] = puffs[i % body];
    if (y < o.base + o.h * 0.25 || rng.next() < 0.35) continue;
    const a = rng.range(0.25, Math.PI - 0.25);
    puffs.push([x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.8, r * rng.range(0.32, 0.5), z + r * 0.35]);
  }
  const topY = o.base + o.h - R0 * 0.7;
  const topW = Math.max(R0, o.w * prof(1));
  const nc = Math.max(2, Math.round(topW / (R0 * 0.7)));
  for (let i = 0; i < nc; i++) {
    const uu = i / (nc - 1) - 0.5;
    puffs.push([o.az + (o.lean ?? 0) * o.h + uu * topW * 0.85, topY - Math.abs(uu) * R0 * 1.1 + rng.range(-0.2, 0.3) * R0, R0 * rng.range(0.5, 0.72), rng.range(-0.3, 0.2) * R0]);
  }
  return { puffs: puffs.slice(0, 110), cut: o.cut ?? o.base + R0 * 0.3, haze: o.haze ?? 0 };
}

// Azimuth: 0 = -Z (north, the meeting-room window), + toward +X (east, the sun).
function makeClouds() {
  const rng = new Rng(11305);
  const T = [];
  const add = (o) => T.push(cloudTower(rng, o));
  // the meeting-room view (north): a castle of summer cumulus right over the CBD, a second one to the west
  add({ az: 10, base: -2, w: 24, h: 33, r: 4.6, lean: 0.06, haze: 0.0 });
  add({ az: -30, base: -2.5, w: 20, h: 24, r: 3.6, lean: -0.04 });
  add({ az: 32, base: -2, w: 16, h: 18, r: 2.4 });
  add({ az: -14, base: -0.5, w: 10, h: 8, r: 1.9 });
  add({ az: 48, base: -1.5, w: 20, h: 24, r: 2.6, lean: 0.04 });
  add({ az: -62, base: -2, w: 26, h: 34, r: 2.9, lean: 0.05 });
  add({ az: 84, base: -2, w: 24, h: 22, r: 2.6 });
  add({ az: 120, base: -2, w: 28, h: 30, r: 2.8, lean: -0.04 });
  add({ az: 165, base: -2, w: 26, h: 28, r: 2.7 });
  add({ az: 210, base: -2, w: 30, h: 32, r: 2.9 });
  add({ az: 255, base: -2, w: 26, h: 25, r: 2.7 });
  add({ az: -95, base: -2, w: 24, h: 22, r: 2.6 });
  // fair-weather cumulus higher up
  for (const [az, el, w] of [[-48, 16, 5], [-8, 44, 6], [20, 36, 4], [-26, 52, 5], [140, 14, 5], [-2, 60, 7], [118, 19, 5], [176, 13, 4], [66, 30, 6], [205, 15, 5], [-80, 22, 6], [250, 17, 5], [30, 58, 5], [-40, 38, 4]]) {
    add({ az, base: el, w, h: w * 0.55, r: w * 0.24, cut: el + w * 0.06 });
  }
  return { towers: T };
}

export function createSky() {
  const clouds = makeClouds();
  const MAXT = 32;
  const all = [], tb = [], ti = [];
  for (const t of clouds.towers.slice(0, MAXT)) {
    const start = all.length;
    let a0 = 1e9, a1 = -1e9, e0 = 1e9, e1 = -1e9;
    const azC = t.puffs[0][0];
    for (const p of t.puffs.slice(0, 110)) {
      const da = ((p[0] - azC + 540) % 360) - 180;
      const ra = p[2] * 1.45 / Math.max(0.2, Math.cos(Math.min(80, Math.abs(p[1]) + p[2] * 1.45) * Math.PI / 180));
      a0 = Math.min(a0, da - ra); a1 = Math.max(a1, da + ra);
      e0 = Math.min(e0, p[1] - p[2] * 1.45); e1 = Math.max(e1, p[1] + p[2] * 1.45);
      all.push(p);
    }
    const mid = (a0 + a1) / 2;
    tb.push(new THREE.Vector4(azC + mid, (a1 - a0) / 2, Math.max(e0, t.cut ?? -90) - 0.5, e1));
    ti.push(new THREE.Vector4(start, all.length - start, t.haze ?? 0, t.cut ?? -90));
  }
  while (tb.length < MAXT) { tb.push(new THREE.Vector4(0, 0, 100, 100)); ti.push(new THREE.Vector4(0, 0, 0, -90)); }
  const data = new Float32Array(Math.max(1, all.length) * 4);
  all.forEach((p, i) => data.set(p, i * 4));
  const ptex = new THREE.DataTexture(data, Math.max(1, all.length), 1, THREE.RGBAFormat, THREE.FloatType);
  ptex.minFilter = ptex.magFilter = THREE.NearestFilter;
  ptex.needsUpdate = true;

  const u = {
    ...G,
    uZenith: { value: new THREE.Color('#2a63c8') },
    uMid: { value: new THREE.Color('#62a6ec') },
    uHorizonWarm: { value: new THREE.Color('#eef3f2') },
    uHorizonCool: { value: new THREE.Color('#cfe4f4') },
    uCloudLit: { value: new THREE.Color('#ffffff') },
    uCloudMid: { value: new THREE.Color('#eef1fa') },
    uCloudShade: { value: new THREE.Color('#a6aedb') },
    uPuffs: { value: ptex },
    uTower: { value: tb },
    uTowerI: { value: ti },
    uNTowers: { value: Math.min(MAXT, clouds.towers.length) },
    uCloudDrift: { value: 0 },
    uNight: { value: 0 },
    uData: { value: 0 },
    uDataWipe: { value: 0 },   // 0..1: the data look climbs the sky from the horizon
    uBreath: { value: 0 },
    uCloudL: { value: new THREE.Vector3(0.3, 0.55, 0.78).normalize() },   // an anime cheat: the cumulus is lit from behind the viewer
  };
  const vs = /* glsl */ `
    varying vec3 vDir;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vDir = normalize(wp.xyz - cameraPosition);
      gl_Position = projectionMatrix * viewMatrix * wp;
      gl_Position.z = gl_Position.w * 0.99999;
    }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform vec3 uZenith, uMid, uHorizonWarm, uHorizonCool, uCloudLit, uCloudMid, uCloudShade;
    uniform float uNTowers, uCloudDrift, uNight, uData, uDataWipe, uBreath;
    uniform vec3 uCloudL;
    uniform sampler2D uPuffs;
    uniform vec4 uTower[${MAXT}];
    uniform vec4 uTowerI[${MAXT}];
    varying vec3 vDir;
    const float D2R = 0.0174532925;

    vec3 bubbles(vec2 p, float seed){
      vec2 ip = floor(p), bv = vec2(0.0); float bd = 1e9;
      for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
        vec2 c = ip + vec2(float(i), float(j));
        vec2 o = hash22(c + seed);
        float r = 0.62 + 0.5 * o.x;
        vec2 v = p - (c + 0.5 + (o - 0.5) * 0.76);
        float dd = dot(v, v) / (r * r) - o.y * 0.4;
        if(dd < bd){ bd = dd; bv = v / r; }
      }
      return vec3(bv, sqrt(max(1.0 - dot(bv, bv), 0.04)));
    }

    vec3 daySky(vec3 d, vec3 s){
      float el = d.y;
      float elD = asin(clamp(el, -1.0, 1.0)) / D2R;
      float azD = atan(d.x, -d.z) / D2R;
      float toSun = dot(d, s);
      vec2 hs = normalize(s.xz + 1e-5);
      float sunSide = dot(normalize(d.xz + 1e-5), hs) * 0.5 + 0.5;
      vec3 hor = mix(uHorizonCool, uHorizonWarm, smoothstep(0.35, 1.0, sunSide));
      float h = max(elD, 0.0);
      vec3 col = mix(hor, uMid, smoothstep(0.0, 14.0, h));
      col = mix(col, uZenith, smoothstep(9.0, 70.0, h));
      float glow = pow(max(toSun, 0.0), 14.0);
      col = mix(col, mix(hor, vec3(1.0), 0.35), glow * 0.5);
      col = mix(col, hor * 0.98, step(el, 0.0));
      // high cirrus wisps in the deep blue
      if(el > 0.05){
        vec2 cp = d.xz / (el + 0.25);
        vec2 cr = vec2(cp.x * 0.8 + cp.y * 0.6, -cp.x * 0.6 + cp.y * 0.8);
        float ci = fbm2(cr * vec2(0.9, 5.5) + vec2(3.0, 0.0)) * fbm2(cr * 0.5 + 11.0);
        float wisp = smoothstep(0.27, 0.36, ci) * smoothstep(0.1, 0.35, el);
        col = mix(col, mix(col, vec3(1.0), 0.7), wisp * 0.3);
      }
      // towering cumulus
      vec3 east = normalize(vec3(-d.z, 0.0, d.x) + vec3(1e-6, 0.0, 0.0));
      vec3 upT = normalize(vec3(0.0, 1.0, 0.0) - d * el + vec3(0.0, 1e-6, 0.0));
      vec3 cl = normalize(uCloudL);
      vec3 L = normalize(vec3(dot(cl, east), dot(cl, upT), dot(cl, -d)));
      float edgeN = fbm3(d * 24.0 + 3.1) - 0.5;
      float edgeN2 = vnoise3(d * 66.0) - 0.5;
      float ce = cos(elD * D2R);
      float best = -1e9, second = -1e9, maxE = -1.0;
      vec3 bn = vec3(0.0, 0.0, 1.0);
      float bHaze = 0.0, bBase = 0.0, bTop = 1.0, bR = 1.0;
      vec2 tC = vec2(0.0);
      for(int ti = 0; ti < ${MAXT}; ti++){
        if(float(ti) >= uNTowers) break;
        vec4 tb = uTower[ti];
        float daz = mod(azD - tb.x - uCloudDrift + 540.0, 360.0) - 180.0;
        if(abs(daz) > tb.y || elD < tb.z || elD > tb.w) continue;
        vec4 tinf = uTowerI[ti];
        int st = int(tinf.x + 0.5), cnt = int(tinf.y + 0.5);
        float cut = tinf.w;
        for(int k = 0; k < 110; k++){
          if(k >= cnt) break;
          vec4 P = texelFetch(uPuffs, ivec2(st + k, 0), 0);
          float dx = (mod(azD - P.x - uCloudDrift + 540.0, 360.0) - 180.0) * ce;
          float dy = elD - P.y;
          float q2 = (dx * dx + dy * dy) / (P.z * P.z);
          if(q2 > 2.1) continue;
          float e = 1.0 - q2 + (edgeN * 0.5 + edgeN2 * 0.12) * (0.45 + 1.6 / (P.z + 1.5));
          e -= max(cut - elD, 0.0) * 0.9;
          maxE = max(maxE, e);
          if(e <= 0.0) continue;
          float hz = sqrt(e) * P.z + P.w + edgeN * P.z * 1.1 + edgeN2 * P.z * 0.35;
          if(hz > best){ second = best; best = hz; bn = vec3(dx / P.z, dy / P.z, sqrt(e)); bHaze = tinf.z; bBase = max(cut, tb.z); bTop = tb.w; bR = P.z; tC = vec2(daz / max(tb.y, 1.0), (elD - 0.5 * (tb.z + tb.w)) / max(0.5 * (tb.w - tb.z), 1.0)); }
          else if(hz > second) second = hz;
        }
      }
      float fwE = max(fwidth(maxE), 1e-4);
      if(maxE > -0.6){
        float cov = smoothstep(-fwE * 0.6, fwE * 0.9, maxE);
        vec2 bp = vec2(azD * ce, elD) + vec2(edgeN, -edgeN2) * bR * 0.5;
        vec3 b1 = bubbles(bp / (bR * 0.62), 3.0), b2 = bubbles(bp / (bR * 0.25), 11.0);
        vec3 nn = normalize(bn + vec3(edgeN2 * 0.3 + edgeN * 0.25, edgeN * 0.4 - edgeN2 * 0.15, 0.0) + vec3(b1.xy * 0.6 + b2.xy * 0.16, 0.0));
        vec3 tN = normalize(vec3(tC.x * 0.62, tC.y * 0.3 + 0.3, 0.62));
        float lit = mix(dot(nn, L), dot(tN, L), 0.8) - 0.03;
        float bandN = (abs(vnoise3(d * 14.0) - 0.5) * 2.0 + 0.5 * abs(vnoise3(d * 33.0) - 0.5) * 2.0 - 0.72) * 1.6;
        float tLit = smoothstep(-0.04, 0.04, lit + bandN * 0.14);
        float tHi = smoothstep(0.46, 0.54, lit + bandN * 0.1);
        float back = smoothstep(0.35, 0.95, dot(d, cl));
        vec3 shadeC = mix(uCloudShade, mix(uCloudShade, uCloudMid, 0.4) * vec3(1.02, 1.0, 1.0), back);
        vec3 cc = mix(shadeC, uCloudMid, tLit);
        cc = mix(cc, uCloudLit, tHi);
        float hgt = clamp((elD - bBase) / max(bTop - bBase, 1.0), 0.0, 1.0);
        cc = mix(cc, mix(uCloudShade, uCloudMid, 0.25) * vec3(0.96, 0.97, 1.02), smoothstep(0.2, 0.0, hgt) * 0.55 * (1.0 - tHi));
        float ov = 1.0 - smoothstep(0.0, 0.08 * bR + 0.1, best - second);
        cc = mix(cc, cc * vec3(0.93, 0.94, 0.985), ov * 0.4 * (1.0 - tHi * 0.6));
        float thin = 1.0 - smoothstep(0.0, 0.3, maxE);
        float rimDir = clamp(dot(normalize(bn.xy + 1e-4), normalize(L.xy + 1e-4)) * 0.5 + 0.5, 0.0, 1.0);
        cc = mix(cc, uCloudLit * 1.12, thin * rimDir * back * 0.9);
        cc = mix(cc, hor, clamp(smoothstep(7.0, 0.0, elD) * 0.85 + bHaze, 0.0, 0.96));
        col = mix(col, cc, cov);
      }
      // sun
      float disk = smoothstep(0.99955, 0.9997, toSun);
      float halo = pow(max(toSun, 0.0), 320.0) * 0.9 + pow(max(toSun, 0.0), 40.0) * 0.16 + pow(max(toSun, 0.0), 8.0) * 0.05;
      col += mix(uHorizonWarm, vec3(1.0, 0.98, 0.92), 0.6) * halo;
      col = mix(col, vec3(1.0, 0.98, 0.92) * 2.6, disk);
      return col;
    }

    vec3 nightSky(vec3 d){
      float el = d.y;
      float h = max(el, 0.0);
      // low rain deck lit from below by the city: violet-rose at the horizon, ultramarine overhead
      vec3 zen = vec3(0.035, 0.045, 0.11);
      vec3 mid = vec3(0.10, 0.10, 0.24);
      vec3 hor = vec3(0.36, 0.24, 0.40);
      vec3 col = mix(hor, mid, smoothstep(0.0, 0.16, h));
      col = mix(col, zen, smoothstep(0.1, 0.7, h));
      // cloud deck: soft billows, brighter undersides near the horizon where the city light catches them
      vec2 cp = d.xz / (h + 0.06);
      float n = fbm2(cp * 0.55 + vec2(uTime * 0.01, 0.0));
      float n2 = fbm2(cp * 1.7 + 4.0);
      float deck = smoothstep(0.35, 0.75, n * 0.75 + n2 * 0.35);
      vec3 under = mix(vec3(0.20, 0.17, 0.33), vec3(0.42, 0.28, 0.40), smoothstep(0.35, 0.0, h));
      col = mix(col, under, deck * 0.55 * smoothstep(0.9, 0.05, h));
      // rain veils hanging under the deck
      float veil = vnoise(vec2(atan(d.x, -d.z) * 40.0, 1.0)) * smoothstep(0.25, 0.0, h);
      col = mix(col, hor * 1.05, veil * 0.15);
      col = mix(col, hor * 0.9, step(el, 0.0));
      return col;
    }

    vec3 dataSky(vec3 d){
      float h = max(d.y, 0.0);
      vec3 col = mix(vec3(0.07, 0.065, 0.10), vec3(0.016, 0.022, 0.045), smoothstep(0.0, 0.22, h));
      col = mix(col, vec3(0.006, 0.009, 0.02), smoothstep(0.2, 0.9, h));
      // the lit city's amber breath along the horizon
      float b = 0.75 + 0.25 * uBreath;
      col += vec3(1.0, 0.71, 0.28) * 0.11 * b * exp(-h * 22.0);
      col = mix(col, vec3(0.05, 0.045, 0.06), step(d.y, 0.0));
      return col;
    }

    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 d = normalize(vDir);
      vec3 col = uNight > 0.999 ? vec3(0.0) : daySky(d, normalize(uSunDir));
      if(uNight > 0.001) col = mix(col, nightSky(d), uNight);
      if(uData > 0.001){
        // the data look climbs from the horizon to the zenith
        float h = asin(clamp(d.y, -1.0, 1.0)) / 1.5708;
        float w = smoothstep(h - 0.04, h + 0.04, uDataWipe * 1.1 - 0.05);
        col = mix(col, dataSky(d), uData * w);
      }
      writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), 9000.0, 0.0);
    }
  `;
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.BackSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.userData.noShadow = true;
  return { mesh, u };
}
