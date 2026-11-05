import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';
import { Rng } from './util.js';

// The ground: streets, plazas, the banyan-lined avenues, parks and the river, painted from the OSM rasters
// (R street surface, G water, B green, A lamp glow). The core at ~1.8 m/px, the far plain at ~11 m/px.
// Day: gouache streets under the long morning shadows of the towers. Night: wet asphalt and pools of street light.
// Data: the street network as amber hairlines on black.

export function groundMaterial(tCore, tFar, core, far) {
  const u = {
    ...G, ...CU,
    tCore: { value: tCore }, tFar: { value: tFar },
    uCore: { value: new THREE.Vector4(...core) }, uFar: { value: new THREE.Vector4(...far) },
  };
  const vs = /* glsl */ `
    varying vec3 vWorld; varying float vDepth;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vec4 mv = viewMatrix * wp;
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    ${CITY_GLSL}
    uniform sampler2D tCore, tFar;
    uniform vec4 uCore, uFar;
    varying vec3 vWorld; varying float vDepth;

    // painted tree canopies: a union of shaded clumps; x = light on the front clump, y = coverage
    vec2 billows(vec2 p, float cs, float seed){
      vec2 ci = floor(p / cs);
      float best = -1.0; vec3 bn = vec3(0.0, 0.0, 1.0);
      for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
        vec2 c = ci + vec2(float(i), float(j));
        vec2 h = hash22(c + seed);
        vec2 ctr = (c + 0.2 + 0.6 * h) * cs;
        float r = cs * (0.6 + 0.35 * hash12(c + seed * 1.7));
        vec2 d = (p - ctr) / r;
        float q = dot(d, d);
        if(q >= 1.0) continue;
        float hz = sqrt(1.0 - q) + hash12(c * 1.3 + seed) * 0.5;
        if(hz > best){ best = hz; bn = vec3(d.x, sqrt(1.0 - q), d.y); }
      }
      float lit = dot(bn, normalize(uSunDir + vec3(0.0, 0.3, 0.0)));
      return vec2(lit, best);
    }
    vec3 leafTone(float lit){
      vec3 c = vec3(0.14, 0.28, 0.32);
      c = mix(c, vec3(0.20, 0.40, 0.35), smoothstep(0.05, 0.12, lit));
      c = mix(c, vec3(0.34, 0.54, 0.35), smoothstep(0.5, 0.58, lit));
      c = mix(c, vec3(0.56, 0.70, 0.40), smoothstep(0.84, 0.9, lit));
      return c;
    }

    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 w = vWorld;
      vec2 uvC = (w.xz - uCore.xy) / (uCore.zw - uCore.xy);
      bool inCore = uvC.x > 0.0 && uvC.y > 0.0 && uvC.x < 1.0 && uvC.y < 1.0;
      vec2 uvF = (w.xz - uFar.xy) / (uFar.zw - uFar.xy);
      vec4 g = inCore ? texture(tCore, uvC) : texture(tFar, uvF);
      float road = g.r, water = g.g, green = g.b, lamp = g.a;
      float roadB = inCore ? textureLod(tCore, uvC, 3.0).r : textureLod(tFar, uvF, 1.0).r;
      float mpp = length(fwidth(w));
      float n1 = fbm2(w.xz * 0.02), n2 = vnoise(w.xz * 0.15);

      // ---------------- day
      vec3 day;
      {
        float sh = cityShadow(w, vec3(0.0, 1.0, 0.0));
        // contact shade at the foot of every building
        vec2 hu = (w.xz - uHBox.xy) / (uHBox.zw - uHBox.xy);
        float occ = 0.0;
        for(int k = 0; k < 4; k++){
          vec2 o = vec2(cos(float(k) * 1.5708 + 0.4), sin(float(k) * 1.5708 + 0.4)) * 7.0 / (uHBox.zw - uHBox.xy);
          occ += texture(uHMap, hu + o).g;
        }
        occ *= 0.25;
        vec3 pave = mix(vec3(0.70, 0.69, 0.67), vec3(0.78, 0.76, 0.72), n1) * (0.95 + 0.08 * n2);
        // estates and courtyards inside the blocks are lush
        float yard = smoothstep(0.64, 0.7, fbm2(w.xz * 0.012 + 3.0)) * (1.0 - road) * (1.0 - water);
        // blocks with no buildings become parks and gardens (Futian is a green CBD), with paved squares left open
        float bld = 0.0;
        for(int k = 0; k < 6; k++){
          vec2 o = vec2(cos(float(k) * 1.047), sin(float(k) * 1.047)) * 32.0 / (uHBox.zw - uHBox.xy);
          bld += texture(uHMap, hu + o).g;
        }
        float empty = (1.0 - smoothstep(0.0, 0.2, bld / 6.0)) * (inCore ? 1.0 : 0.0);
        yard = max(yard, empty * smoothstep(0.38, 0.46, fbm2(w.xz * 0.025 + 7.0)) * (1.0 - smoothstep(0.2, 0.4, road)) * (1.0 - water));
        // paving patterns in the plazas: big stone squares, a darker border
        vec2 pv = fract(w.xz / 9.0);
        float joint = 1.0 - smoothstep(0.0, max(0.02, mpp / 9.0 * 1.5), min(min(pv.x, 1.0 - pv.x), min(pv.y, 1.0 - pv.y)));
        pave *= 1.0 - 0.06 * joint * (1.0 - smoothstep(0.3, 1.0, mpp));
        vec3 asph = mix(vec3(0.50, 0.52, 0.62), vec3(0.56, 0.57, 0.66), n2);
        vec3 col = mix(pave, asph, smoothstep(0.35, 0.6, road));
        // kerbs and lane paint: a pale line where the street meets the pavement
        float curb = 1.0 - smoothstep(0.0, 0.25, abs(road - 0.45));
        col = mix(col, vec3(0.92, 0.92, 0.9), curb * 0.55 * (1.0 - smoothstep(0.6, 2.0, mpp)));
        // the river and the ponds: sky-blue with painted ripple strokes
        vec3 wat = mix(vec3(0.36, 0.60, 0.78), vec3(0.56, 0.78, 0.90), smoothstep(0.3, 0.7, vnoise(vec2(w.x * 0.01, w.z * 0.06))));
        wat = mix(wat, vec3(0.85, 0.93, 0.98), smoothstep(0.72, 0.8, vnoise(vec2(w.x * 0.05, w.z * 0.4))) * 0.5);
        col = mix(col, wat, water);
        // canopies: the banyan rows along every avenue, parks, estate gardens
        float belt = smoothstep(0.06, 0.22, roadB) * (1.0 - smoothstep(0.3, 0.55, road)) * (1.0 - water);
        float treeAmt = max(max(green, belt * 0.95), yard * 0.8);
        // canopy clumps grow with distance so parks keep their texture instead of turning into lawn
        float cs = mix(6.0, 3.6, belt) * max(1.0, mpp * 1.1);
        vec2 b = billows(w.xz, cs, 3.0 + floor(log2(max(1.0, mpp * 1.1))));
        float cov = smoothstep(0.0, 0.05, b.y) * step(0.25, treeAmt + (b.y - 0.6) * 0.4);
        if(mpp > 6.0){ cov = treeAmt * 0.85; b.x = 0.45; }
        vec3 leaf = leafTone(b.x * mix(0.35, 1.0, sh));
        col = mix(col, leaf, cov * treeAmt / max(treeAmt, 0.001));
        // light
        vec3 amb = mix(uShadeTint, uSkyTint, 0.6) * 0.9;
        vec3 sun = uSunColor * 0.5 * sh * uSunStrength;
        day = col * (amb * (1.0 - 0.1 * sh) * (1.0 - 0.35 * occ) + sun);
      }
      // ---------------- night
      vec3 night;
      {
        vec3 col = mix(vec3(0.035, 0.035, 0.065), vec3(0.05, 0.045, 0.08), n1);
        vec3 asph = vec3(0.03, 0.03, 0.055);
        col = mix(col, asph, smoothstep(0.35, 0.6, road));
        // wet streets: the lamps pool and smear
        vec3 lampC = mix(vec3(1.0, 0.82, 0.62), vec3(1.0, 0.62, 0.42), smoothstep(0.4, 0.9, n1));
        float wet = 0.6 + 0.4 * vnoise(w.xz * 0.3);
        // pools of light under the street lamps, ~24 m apart along the lit streets
        vec2 ci = floor(w.xz / 24.0);
        vec2 pc = (ci + 0.25 + 0.5 * hash22(ci)) * 24.0;
        float pd = length(w.xz - pc);
        float pool = exp(-pd * pd / 18.0) * smoothstep(0.35, 0.6, lamp) * step(0.3, hash12(ci + 7.0));
        float near = 1.0 - smoothstep(0.6, 3.0, mpp);
        col += lampC * mix(pow(lamp, 1.5) * (inCore ? 0.7 : 1.4), pool * 0.9 + pow(lamp, 2.0) * 0.08, near) * wet;
        // car lights streaking along the avenues: white heading one way, red the other
        float avenue = smoothstep(0.7, 0.95, road) * smoothstep(0.45, 0.75, roadB);
        float lane = fract(dot(w.xz, vec2(0.011, 0.007)) * 9.0 + hash12(floor(w.xz / 60.0)) - uTime * 0.25);
        col += mix(vec3(1.0, 0.25, 0.2), vec3(1.0, 0.95, 0.85), step(0.5, hash12(floor(w.xz / 30.0)))) * avenue * step(0.94, lane) * 0.9;
        col += lampC * smoothstep(0.5, 0.9, road) * 0.03;
        // the river: black water with broken light
        vec3 wat = vec3(0.02, 0.025, 0.05) + vec3(0.25, 0.18, 0.3) * smoothstep(0.7, 0.9, vnoise(vec2(w.x * 0.02, w.z * 0.3))) * 0.3;
        col = mix(col, wat, water);
        col = mix(col, vec3(0.02, 0.035, 0.04), green * 0.7);
        night = col;
      }
      vec3 col = mix(day, night, uNight);

      // ---------------- data
      float glow;
      float front = ringFront(w, glow);
      float id = 0.0;
      if(front > -60.0 || glow > 0.01){
        float th = hash12(floor(w.xz / 8.0)) * 30.0;
        float rv = step(th, front);
        vec3 data = vec3(0.006, 0.008, 0.016);
        // street edges: hairlines where the road mask crosses one half
        float fr = max(fwidth(road), 1e-4);
        float edge = 1.0 - smoothstep(0.6, 1.6, abs(road - 0.5) / fr);
        edge *= 1.0 - smoothstep(3.0, 14.0, mpp);
        data += AMBER * edge * 0.75;
        // traffic: packets of light running along the main avenues
        float main = smoothstep(0.75, 0.95, road) * smoothstep(0.5, 0.8, roadB);
        float pk = step(0.93, fract(dot(w.xz, vec2(0.0131, 0.0093)) * 3.0 - uTime * 0.6 + hash12(floor(w.xz / 40.0)) ));
        data += AMBER * main * pk * 0.35;
        // a faint survey grid of points every 20 m across blocks
        vec2 gq = (fract(w.xz / 20.0) - 0.5) * 20.0;
        float gd = 1.0 - smoothstep(max(0.35, mpp * 0.8) - mpp * 0.5, max(0.35, mpp * 0.8) + mpp * 0.5, length(gq));
        data += vec3(0.6, 0.7, 0.9) * gd * 0.22 * (1.0 - water) * smoothstep(2.0, 5.0, 20.0 / max(mpp, 1e-4) / 2.0);
        // water and parks as contour-like hatching
        float wl = 1.0 - smoothstep(0.0, 1.2, abs(fract(w.z / 14.0) - 0.5) * 14.0 / max(mpp, 0.05));
        data += vec3(0.35, 0.5, 0.8) * wl * water * 0.25;
        data += AMBER * (1.0 - smoothstep(0.6, 1.6, abs(water - 0.5) / max(fwidth(water), 1e-4))) * 0.5;
        float flash = rv * (1.0 - smoothstep(0.0, 10.0, front - th));
        data += AMBER * flash * 0.5;
        col = mix(col, data, rv);
        col += mix(AMBER, vec3(1.0, 0.95, 0.85), 0.35) * glow * (1.5 - 0.6 * rv);
        id = rv > 0.5 ? 150.0 : 0.0;
      }
      writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), fogDepth(vDepth), id);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.FrontSide });
}

export function buildGround(tCore, tFar, core, far) {
  const g = new THREE.PlaneGeometry(36000, 32000, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(1000, 0, -1000);
  const m = new THREE.Mesh(g, groundMaterial(tCore, tFar, core, far));
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

// ------------------------------------------------------------------ the far hills (a ring that follows the camera)
// Shenzhen's green ranges behind the CBD (Bijia, Meilin, Tanglang) and Hong Kong's hills to the south, as painted
// silhouettes. They write a nearer fog depth than their geometry, so the haze leaves them a little shape.
export function buildHills() {
  const rng = new Rng(5501);
  const layers = [
    { r: 5600, seg: 720, base: 40, amp: 230, f: 2.0, tone: 0 },
    { r: 7000, seg: 720, base: 110, amp: 470, f: 1.2, tone: 1 },
  ];
  const pos = [], aL = [], idx = [];
  const noise = (a, f, s) => {
    let v = 0, amp = 1, n = 0;
    for (let o = 0; o < 5; o++) { v += amp * (Math.sin(a * f * (o + 1) * 1.93 + s * 17.1 + o * 2.3) * 0.5 + Math.sin(a * f * (o + 1) * 3.71 + s * 5.3 + o) * 0.5); n += amp; amp *= 0.5; }
    return v / n;
  };
  for (const L of layers) {
    const s = rng.next() * 10;
    const base = pos.length / 3;
    for (let i = 0; i <= L.seg; i++) {
      const a = (i / L.seg) * Math.PI * 2;
      // az from north (−Z) toward east (+X)
      const az = a;
      // mountains sit to the north and the south (HK); the bay to the west is open water
      const north = Math.max(0, Math.cos(az)), south = Math.max(0, -Math.cos(az));
      const west = Math.max(0, -Math.sin(az));
      // rounded ranges with sharper spurs (abs-noise ridges), stronger to the north (Meilin) and south (HK hills)
      const ridge = 1 - Math.abs(noise(a, L.f * 14, s + 3));
      let h = L.base + L.amp * (0.45 + 0.35 * noise(a, L.f * 6, s) + 0.3 * ridge * ridge) * (0.25 + 0.75 * Math.max(north, south * 0.9)) * (1 - 0.8 * west * west);
      h = Math.max(h, 8);
      const x = Math.sin(az) * L.r, z = -Math.cos(az) * L.r;
      pos.push(x, -60, z, x, h, z);
      aL.push(L.tone, 0, L.tone, 1);
      if (i < L.seg) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aL', new THREE.Float32BufferAttribute(aL, 2));
  g.setIndex(idx);
  const u = { ...G, ...CU, uHillData: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aL; varying vec2 vL; varying vec3 vWorld; varying float vDepth;
      void main(){ vL = aL; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      ${CITY_GLSL}
      varying vec2 vL; varying vec3 vWorld; varying float vDepth;
      uniform float uHillData;
      void main(){
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        float far = vL.x, t = vL.y;
        vec2 dir = normalize(vWorld.xz - cameraPosition.xz);
        float az = atan(dir.x, -dir.y);
        float ridge = vnoise(vec2(az * 60.0, t * 3.0)) * 0.5 + vnoise(vec2(az * 180.0, t * 9.0)) * 0.5;
        // day: blue-green hills, sunlit slopes picked out in paler strokes
        vec3 dNear = vec3(0.50, 0.62, 0.66), dFar = vec3(0.66, 0.75, 0.86);
        vec3 day = mix(dNear, dFar, far);
        float sunSide = dot(dir, normalize(uSunDir.xz + 1e-4));
        day = mix(day, day * 1.12 + 0.03, smoothstep(0.55, 0.75, ridge + 0.2 * sunSide) * (1.0 - far * 0.5));
        day = mix(day, vec3(0.80, 0.86, 0.92), (1.0 - t) * 0.5);
        // night: violet silhouettes against the rose glow
        vec3 night = mix(vec3(0.07, 0.06, 0.13), vec3(0.13, 0.10, 0.20), far);
        vec3 col = mix(day, night, uNight);
        // data: dark, a single amber contour at the ridge
        float glow;
        float front = ringFront(vec3(vWorld.x, 0.0, vWorld.z), glow);
        float rv = clamp(uDataAll + smoothstep(-250.0, 50.0, front), 0.0, 1.0);
        vec3 data = vec3(0.01, 0.012, 0.022);
        float fwT = fwidth(t);
        data += AMBER * (1.0 - smoothstep(fwT * 0.5, fwT * 1.5, 1.0 - t)) * (0.6 - 0.3 * far);
        col = mix(col, data, rv);
        writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), vDepth * mix(0.5, 0.42, far) * mix(1.0, 0.12, rv), 0.0);
      }
    `,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  m.renderOrder = -20;
  m.userData.u = u;
  return m;
}
