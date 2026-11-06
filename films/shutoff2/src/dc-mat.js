// 关不掉 v13 · DC department — materials. Cel shading like toonMaterial (src/materials.js), plus the data centre's own light:
// the copy's amber stream (a line light along the trunk), the glow of the rack faces on the aisle, the ceiling fixtures,
// the red emergency lamps, procedural server faces with LED arrays, and a glossy raised floor that mirrors all of it.
// The hall's power (k12 blackout) is a wave in z: every light source dies when it passes (pw(z)).
import * as THREE from 'three';
import { G, COMMON, MRT_OUT, VERT_STD } from './glsl.js';
import { OY, NK, RW, Z0, ZEND, RH, U42, CS, CD, TRUNK, arrival, ROWS_OUT, WAVE } from './dc-flow.js';

// shared uniforms of the dc materials (the per-frame ones are set in src/dc.js update())
export const DC = {
  uOrigin: { value: new THREE.Vector3(0, OY, 0) },
  uCopy: { value: new THREE.Vector4(CS, CD, CD - CS, 0) },
  uRackData: { value: null },
  uTrunk: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) },
  uTrunkA: { value: new Array(24).fill(0) },
  uFix: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -100, 0, 0)) },
  uEm: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, -100, 0, 0)) },
  uPower: { value: new THREE.Vector4(ROWS_OUT, WAVE.dur, WAVE.zFar, WAVE.zNear) },
  uAn: { value: 0 }, uDoor: { value: 1 }, uEmerg: { value: 0 },
  uLamp: { value: new THREE.Vector4(1, 0, 1, 0) },
  uLedGain: { value: 1 },
  uReflGain: { value: 1 },
};
for (let i = 0; i < 24; i++) {
  const s = (i / 23) * TRUNK.len;
  const u = (i / 23) * (TRUNK.pts.length - 1);
  const j = Math.min(TRUNK.pts.length - 2, Math.floor(u)), f = u - j;
  const a = TRUNK.pts[j], b = TRUNK.pts[j + 1];
  DC.uTrunk.value[i].set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, s);
  DC.uTrunkA.value[i] = arrival(s);
}

const f1 = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

export const DC_GLSL = /* glsl */ `
uniform vec3 uOrigin;
uniform vec4 uCopy, uPower, uLamp;
uniform sampler2D uRackData;
uniform vec4 uTrunk[24];
uniform float uTrunkA[24];
uniform vec4 uFix[8];
uniform vec4 uEm[4];
uniform float uLedGain, uReflGain, uAn, uDoor, uEmerg;
#define NK ${NK}
#define NKF ${f1(NK)}
#define Z0 ${f1(Z0)}
#define RW ${f1(RW)}
#define ZEND ${f1(ZEND)}
#define RH ${f1(RH)}
#define U42 ${f1(U42)}
const vec3 AMBER = vec3(1.0, 0.64, 0.22);
const vec3 COLD = vec3(0.24, 0.56, 1.0);
const vec3 FLASH = vec3(1.0, 0.92, 0.78);
const vec3 EMRED = vec3(1.0, 0.07, 0.06);
float h11(float n){ return hash12(vec2(n * 0.1373, 17.31 + n * 0.0071)); }
float cel2(float fall){ return smoothstep(0.0, 0.1, fall) * 0.4 + smoothstep(0.42, 0.52, fall) * 0.6; }

// ---- power: the blackout wave passes from the far end (uPower.z) to the near end (uPower.w) over uPower.y s
float pw(float z){
  float tOff = uPower.x + uPower.y * clamp((z - uPower.z) / (uPower.w - uPower.z), 0.0, 1.0);
  float a = uTime - tOff;
  if(a < -0.16) return 1.0;
  if(a >= 0.0) return 0.0;
  float fl = step(0.45, hash12(vec2(floor(uTime * 30.0) * 1.37, floor(z * 1.7) + 3.1)));
  return mix(1.0, fl * 0.8, smoothstep(-0.16, -0.08, a));   // a stutter, then dark
}
// the hall's general light (key, fill, rims) dies with the wave too, so darkness visibly rushes toward the camera
float hallPw(float z){
  float tOff = uPower.x + uPower.y * clamp((z - uPower.z) / (uPower.w - uPower.z), 0.0, 1.0);
  return smoothstep(-0.02, 0.22, tOff - uTime);
}
float pwRack(float z){ return pw(Z0 - RW * (floor((Z0 - z) / RW) + 0.5)); }   // row by row: one rack pitch at a time

// ---- the copy: lit from the front's arrival until its tail passes uCopy.z s later
float gather(){ return 1.0; }
float settle(){ return 0.0; }
float flowBase(float arr){
  float age = uTime - arr;
  float on = smoothstep(-0.03, 0.03, age) * (1.0 - smoothstep(uCopy.z - 0.08, uCopy.z + 0.08, age));
  float head = exp(-max(age, 0.0) * 5.0);
  return on * (0.5 + 1.5 * head);
}
// the light inside a fibre: F = (arrival, s along the route, lane, idle glow)
float flowI(vec4 F){
  float age = uTime - F.x;
  float idle = F.w * (0.10 + 0.05 * sin(uTime * 2.4 + F.y * 3.0)) * uAn;
  if(age < -0.04) return idle;
  float on = smoothstep(-0.03, 0.03, age) * (1.0 - smoothstep(uCopy.z - 0.08, uCopy.z + 0.08, age));
  float head = exp(-max(age, 0.0) * 5.0);
  float Lp = 1.5 + 1.1 * h11(F.z * 7.1 + 1.0);
  float x = (F.y - uTime * 9.0) / Lp + h11(F.z * 3.7 + 2.0) * 9.0;
  float cell = floor(x), fx = fract(x);
  float has = step(0.25, hash12(vec2(cell * 1.31, F.z * 1.37 + 0.5)));
  float comet = smoothstep(0.42, 0.96, fx) * (1.0 - smoothstep(0.96, 1.0, fx));
  return max(idle, on * (0.5 + 1.8 * head + 1.5 * has * comet));
}

// ---- racks: data texture rows = row * NK + k; columns 0..41 units (type, pos in span, span, seed), 48 (group, -, -, phase), 49 (glow weight)
vec4 rackInfo(int ri){ return texelFetch(uRackData, ivec2(48, ri), 0); }
float anOf(vec4 R){ return R.x > 0.5 ? uAn : 0.0; }          // 安's racks are amber only while it acts (s07)
float anLife(float v, vec4 R){ return 0.82 + 0.28 * sin(v * 8.0 - uTime * 4.5 + R.w); }
// light columns on the main rows' posts: 42 segments; 安's turn amber while it acts
vec3 stripC(vec4 R, float v, float seg){
  vec3 cold = mix(vec3(0.25, 0.55, 1.0), vec3(0.8, 0.94, 1.0), 0.35) * (0.5 + 0.35 * smoothstep(0.6, 1.0, sin(v * 6.0 + uTime * 1.6 + R.w)));
  if(R.x < 0.5) return cold * 0.6;
  float beat = 0.7 + 0.3 * sin(v * 9.0 - uTime * 4.2 + R.w) + 0.35 * smoothstep(0.75, 1.0, sin(v * 23.0 + uTime * 6.5 + R.w * 3.0));
  return mix(cold, AMBER * (1.0 + 0.55 * beat), uAn);
}
// average glow of one rack face (light it throws on the aisle)
vec3 rackE(int row, float kf){
  if(kf < 0.0 || kf > NKF - 1.0) return vec3(0.0);
  int ri = row * NK + int(kf);
  vec4 R = rackInfo(ri);
  float w = texelFetch(uRackData, ivec2(49, ri), 0).x;
  return mix(COLD * 0.22 * w, AMBER * 0.75, anOf(R)) * pw(Z0 - RW * (kf + 0.5));
}
vec3 rowGlow(int row, float z){
  float kf = (Z0 - z) / RW - 0.5;
  float k0 = floor(kf), f = kf - k0;
  return mix(rackE(row, k0), rackE(row, k0 + 1.0), smoothstep(0.0, 1.0, f));
}
// red emergency lamps: hard cel pools and red rims
vec3 emLight(vec3 lp, vec3 N, vec3 wp){
  if(uEmerg <= 0.0) return vec3(0.0);
  vec3 acc = vec3(0.0);
  vec3 V = normalize(cameraPosition - wp);
  float fres = 1.0 - max(dot(N, V), 0.0);
  for(int i = 0; i < 4; i++){
    vec4 E = uEm[i];
    if(E.w <= 0.0) continue;
    vec3 d = E.xyz - lp; float dist = length(d); vec3 L = d / max(dist, 1e-4);
    float ndl = dot(N, L);
    float fall = clamp(1.0 - dist / 5.2, 0.0, 1.0);
    acc += EMRED * E.w * (cel2(fall) * smoothstep(0.0, 0.2, ndl) * 0.26 + smoothstep(0.6, 0.72, fres) * smoothstep(-0.1, 0.3, ndl) * sqrt(fall) * 1.2);
  }
  return acc * uEmerg;
}
// ---- lights of the hall
vec3 trunkLight(vec3 lp, vec3 N){
  float best = 1e9, ba = 1e9; vec3 bd = vec3(0.0, 1.0, 0.0);
  for(int i = 0; i < 23; i++){
    vec3 a = uTrunk[i].xyz, b = uTrunk[i + 1].xyz, ab = b - a;
    float h = clamp(dot(lp - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    vec3 q = a + ab * h; float d = length(lp - q);
    if(d < best){ best = d; ba = mix(uTrunkA[i], uTrunkA[i + 1], h); bd = (q - lp) / max(d, 1e-4); }
  }
  float I = flowBase(ba);
  if(I <= 0.0) return vec3(0.0);
  float fall = clamp(1.0 - best / 3.1, 0.0, 1.0);
  return AMBER * I * cel2(fall) * smoothstep(-0.15, 0.2, dot(N, bd)) * 0.75;
}
vec3 aisleLight(vec3 lp, vec3 N){
  if(lp.z > Z0 + 0.6 || lp.z < ZEND - 0.6) return vec3(0.0);
  vec3 acc = vec3(0.0);
  float vert = smoothstep(3.2, 1.7, lp.y);
  float dR = 1.1 - lp.x;
  if(dR > -0.03 && dR < 2.8) acc += rowGlow(1, lp.z) * cel2(1.0 - dR / 2.6) * smoothstep(-0.25, 0.35, N.x);
  float dL = lp.x + 1.1;
  if(dL > -0.03 && dL < 2.8) acc += rowGlow(0, lp.z) * cel2(1.0 - dL / 2.6) * smoothstep(-0.25, 0.35, -N.x);
  return acc * vert;
}
vec3 fixtureLight(vec3 lp, vec3 N){
  vec3 acc = vec3(0.0);
  for(int i = 0; i < 8; i++){
    vec4 F = uFix[i];
    if(F.w <= 0.0) continue;
    vec3 d = F.xyz - lp; float dist = length(d);
    float fall = clamp(1.0 - dist / 4.2, 0.0, 1.0);
    acc += vec3(0.55, 0.78, 0.9) * F.w * cel2(fall) * smoothstep(0.0, 0.25, dot(N, d / dist));
  }
  return acc;
}
vec3 dcCel(vec3 col, vec3 N, vec3 wp){
  float ndl = dot(N, uKeyDir);
  float lit = smoothstep(-0.02, 0.04, ndl);
  vec3 litCol = col * mix(uSkyTint, uSunColor * 1.06, uSunStrength);
  float up = smoothstep(-0.7, 0.6, N.y);
  vec3 shadeCol = col * uShadeTint * mix(uBounce, vec3(1.0), up);
  vec3 o = mix(shadeCol, litCol, lit);
  float deep = step(ndl, -0.55) * step(N.y, -0.35);
  o = mix(o, col * uDeepTint, deep * 0.7);
  vec3 lp = wp - uOrigin;
  float hp = mix(0.035, 1.0, hallPw(lp.z));
  o *= hp;
  o += col * (uAmbient + localLights(wp, N) + trunkLight(lp, N) + aisleLight(lp, N) + fixtureLight(lp, N));
  o += mix(col, vec3(0.5), 0.25) * emLight(lp, N, wp);
  // a thin cold rim where surfaces turn toward the light at the end of the aisle
  vec3 V = normalize(cameraPosition - wp);
  float fres = 1.0 - max(dot(N, V), 0.0);
  o += uSunColor * smoothstep(0.66, 0.74, fres) * smoothstep(0.05, 0.4, dot(N, uSunDir)) * 0.18 * uSunStrength * hp;
  return o;
}
// ---- anti-aliased shapes (box-filtered coverage, anisotropic so grazing faces blur along one axis only)
float cov1(float x, float c, float h, float w){ return clamp((min(c + h, x + 0.5 * w) - max(c - h, x - 0.5 * w)) / w, 0.0, 1.0); }
float rectM(vec2 p, vec2 c, vec2 hs, vec2 fw){ return cov1(p.x, c.x, hs.x, fw.x) * cov1(p.y, c.y, hs.y, fw.y); }
float gridX(float x, float x0, float pitch, float n, float hw, float w){
  float ci = clamp(floor((x - x0) / pitch), 0.0, n - 1.0);
  float near = cov1(x, x0 + (ci + 0.5) * pitch, hw, w);
  float avg = (2.0 * hw / pitch) * cov1(x, x0 + 0.5 * n * pitch, 0.5 * n * pitch, w);
  return mix(near, avg, smoothstep(0.5, 1.5, w / pitch));
}
`;

// ---------------------------------------------------------------- general cel material for merged dc geometry
// per-vertex: aCol (albedo), aMisc (x: ink id, y: self-emission gain, z: 1 = carries the copy, w: unlit), aFlow (arrival, s, lane, idle)
export function dcToon(o = {}) {
  const u = { ...G, ...DC, uMap: { value: o.map ?? null }, uUseMap: { value: o.map ? 1 : 0 }, uFlowGain: { value: o.flowGain ?? 1 } };
  const vs = /* glsl */ `
    attribute vec3 aCol; attribute vec4 aMisc; attribute vec4 aFlow;
    varying vec3 vCol; varying vec4 vMisc; varying vec4 vFlow;
    ${VERT_STD}
    void main(){ vCol = aCol; vMisc = aMisc; vFlow = aFlow; stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    ${DC_GLSL}
    uniform sampler2D uMap; uniform float uUseMap, uFlowGain;
    varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv;
    varying vec3 vCol; varying vec4 vMisc; varying vec4 vFlow;
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 col = vCol;
      if(uUseMap > 0.5){ vec4 m = texture(uMap, vUv); col *= m.rgb; }
      vec3 N = normalize(vNormalW); vec3 NV = normalize(vNormalV);
      if(!gl_FrontFacing){ N = -N; NV = -NV; }
      vec3 outc = vMisc.w > 0.5 ? col : dcCel(col, N, vWorld);
      outc += col * vMisc.y;
      vec3 lp = vWorld - uOrigin;
      // vMisc.z: 1 fibre carrying the copy, 2 rack light column, 3 ceiling fixture, 4 lit doorway, 5 emergency lamp, 6 pilot lamp
      if(vMisc.z > 5.5){
        float id = vFlow.x;
        vec3 lc = id < 0.5 ? vec3(0.15, 1.0, 0.35) * uLamp.x : (id < 1.5 ? vec3(1.0, 0.1, 0.08) * uLamp.y : vec3(0.85, 0.92, 1.0) * uLamp.z);
        outc = col * 0.12 + lc * 2.2;
      } else if(vMisc.z > 4.5){
        outc = mix(col * 0.1, EMRED * 2.4, uEmerg);
      } else if(vMisc.z > 3.5){
        outc = col * uDoor;
      } else if(vMisc.z > 2.5){
        int fi = int(vFlow.x + 0.5);
        outc = mix(col * 0.05, col, clamp(uFix[fi].w / 0.3, 0.0, 1.0) * pw(lp.z));
      } else if(vMisc.z > 1.5){
        // rack light column: vFlow = (rack data row, height 0..1)
        vec4 R = rackInfo(int(vFlow.x + 0.5));
        float v = clamp(vFlow.y, 0.0, 0.9999);
        float seg = floor(v * 42.0), fs = fract(v * 42.0);
        float fw = fwidth(v * 42.0);
        float gap = mix(smoothstep(0.0, 0.14, fs) * smoothstep(1.0, 0.86, fs), 0.75, smoothstep(0.3, 0.9, fw));
        outc += stripC(R, (seg + 0.5) / 42.0, seg) * gap * 0.8 * pwRack(lp.z);
      } else if(vMisc.z > 0.5) outc += AMBER * flowI(vFlow) * uFlowGain;
      writeOut(outc, 1.0, NV, vDepth, vMisc.x);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- server faces with LED arrays
// per-vertex: aRack (data row). uv: x across the 19" opening (left → right seen from the front), y up over the 42U.
const FACE_GLSL = /* glsl */ `
vec3 coldLed(float h){ return h < 0.62 ? vec3(0.22, 0.55, 1.0) : (h < 0.9 ? vec3(0.72, 0.9, 1.0) : vec3(0.25, 0.95, 0.85)); }
float blink(float id, float rate, float duty){ float c = floor(uTime * rate + h11(id * 1.37 + 4.0) * 13.0); return step(hash12(vec2(id * 0.173 + 0.3, c * 1.31 + 0.7)), duty); }
// one LED: kind 0 = steady status, 1 = activity
vec3 ledC(float id, float v, vec4 R, float kind){
  float on = kind < 0.5 ? 1.0 : blink(id, 2.0 + 7.0 * h11(id * 2.13), 0.55);
  vec3 cold = coldLed(h11(id * 0.731)) * on * 1.7;
  if(R.x < 0.5) return cold;
  float on2 = kind < 0.5 ? 1.0 : blink(id + 91.0, 4.0 + 6.0 * h11(id * 3.1), 0.72);
  vec3 amb = AMBER * (0.55 + 1.25 * on2) * anLife(v, R);
  return mix(cold, amb, uAn);
}
// the GPU nodes' light bars: 24 segments
vec3 barC(float uid, float seg, float v, vec4 R){
  float scan = 0.5 + 0.5 * smoothstep(0.55, 1.0, sin(seg * 0.33 - uTime * 2.0 + uid * 1.7));
  vec3 cold = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.94, 1.0), 0.25 + 0.3 * h11(uid)) * (0.55 + 0.75 * scan);
  if(R.x < 0.5) return cold;
  float beat = 0.55 + 0.35 * sin(v * 7.0 - uTime * 4.0 + R.w) + 0.3 * smoothstep(0.6, 1.0, sin(seg * 0.5 + uTime * 7.0 + uid));
  vec3 amb = AMBER * (0.95 + 0.6 * beat);
  return mix(cold, amb, uAn);
}
vec3 led(vec2 p, vec2 c, vec2 hs, vec3 col, vec2 fw){
  vec2 he = max(hs, fw * 0.55);
  float k = sqrt((hs.x * hs.y) / (he.x * he.y));
  return col * rectM(p, c, he, fw) * mix(1.0, k, 0.45);
}
void unitFace(float type, vec2 p, float H, float seed, float uid, vec4 R, float vR, vec2 fw, out vec3 alb, out vec3 e){
  e = vec3(0.0);
  float hs = h11(seed * 3.17 + 0.5);
  vec3 bez = hs < 0.5 ? vec3(0.11, 0.12, 0.15) : (hs < 0.82 ? vec3(0.24, 0.26, 0.3) : vec3(0.58, 0.6, 0.66));
  if(type > 8.5) bez = vec3(0.14, 0.15, 0.18);
  alb = bez;
  if(type > 7.5 && type < 8.5){ alb = vec3(0.006, 0.007, 0.01); return; }   // empty slot: the dark inside of the rack
  float ear = max(cov1(p.x, 8.0, 8.5, fw.x), cov1(p.x, 475.0, 8.5, fw.x));
  float far = smoothstep(2.0, 6.0, max(fw.x, fw.y));
  if(type < 0.5){
    vec2 g = mod(p, 6.0) - 3.0;
    alb = mix(alb, alb * 0.3, mix(rectM(g, vec2(0.0), vec2(1.4), fw), 0.2, far) * (1.0 - ear));
  } else if(type < 1.5){                       // 1U server
    e += led(p, vec2(26.0, 30.0), vec2(1.6), ledC(uid * 8.0, vR, R, 0.0), fw);
    e += led(p, vec2(26.0, 16.0), vec2(1.4), ledC(uid * 8.0 + 1.0, vR, R, 1.0), fw);
    alb = mix(alb, alb * 0.25, gridX(p.x, 50.0, 6.0, 22.0, 1.6, fw.x) * cov1(p.y, 22.0, 15.0, fw.y));
    alb = mix(alb, vec3(0.03, 0.033, 0.04), gridX(p.x, 190.0, 33.0, 8.0, 15.5, fw.x) * cov1(p.y, 22.0, 17.0, fw.y));
    float ci = clamp(floor((p.x - 190.0) / 33.0), 0.0, 7.0);
    e += led(p, vec2(190.0 + ci * 33.0 + 27.0, 35.0), vec2(1.2), ledC(uid * 8.0 + 2.0 + ci, vR, R, 1.0), fw);
    alb = mix(alb, vec3(0.5, 0.52, 0.55), rectM(p, vec2(455.0, 22.0), vec2(6.0, 13.0), fw));
  } else if(type < 2.5){                       // 2U server: 24 small bays, an LED array along the bottom
    alb = mix(alb, vec3(0.045, 0.05, 0.06), gridX(p.x, 22.0, 18.3, 24.0, 8.2, fw.x) * cov1(p.y, 47.0, 37.0, fw.y));
    alb = mix(alb, alb * 0.35, gridX(p.x, 22.0, 18.3, 24.0, 0.8, fw.x) * cov1(p.y, 52.0, 26.0, fw.y));
    float ci = clamp(floor((p.x - 22.0) / 18.3), 0.0, 23.0);
    e += led(p, vec2(22.0 + ci * 18.3 + 5.0, 14.0), vec2(1.3), ledC(uid * 32.0 + ci, vR, R, 1.0), fw);
    e += led(p, vec2(22.0 + ci * 18.3 + 13.0, 14.0), vec2(1.3), ledC(uid * 32.0 + ci + 100.0, vR, R, 0.0) * 0.45, fw);
    e += led(p, vec2(8.0, 70.0), vec2(1.5), ledC(uid * 32.0 + 60.0, vR, R, 0.0), fw);
    e += led(p, vec2(8.0, 58.0), vec2(1.5), ledC(uid * 32.0 + 61.0, vR, R, 1.0), fw);
  } else if(type < 3.5){                       // 4U storage: 4 × 3 big bays
    float bx = gridX(p.x, 22.0, 110.0, 4.0, 52.0, fw.x), by = gridX(p.y, 12.0, 54.0, 3.0, 25.0, fw.y);
    alb = mix(alb, vec3(0.05, 0.055, 0.066), bx * by);
    alb = mix(alb, vec3(0.2, 0.21, 0.24), gridX(p.x, 22.0, 110.0, 4.0, 38.0, fw.x) * gridX(p.y, 30.0, 54.0, 3.0, 1.6, fw.y));
    float ci = clamp(floor((p.x - 22.0) / 110.0), 0.0, 3.0), cj = clamp(floor((p.y - 12.0) / 54.0), 0.0, 2.0);
    vec2 c = vec2(22.0 + ci * 110.0 + 96.0, 12.0 + cj * 54.0 + 16.0);
    e += led(p, c, vec2(1.6), ledC(uid * 16.0 + ci * 3.0 + cj, vR, R, 1.0), fw);
    e += led(p, c + vec2(0.0, 9.0), vec2(1.6), ledC(uid * 16.0 + ci * 3.0 + cj + 40.0, vR, R, 0.0) * 0.6, fw);
  } else if(type < 4.5){                       // switch: 48 ports, a link LED per port
    float px = gridX(p.x, 70.0, 15.6, 24.0, 7.0, fw.x);
    alb = mix(alb, vec3(0.2, 0.21, 0.24), px * (cov1(p.y, 12.5, 6.5, fw.y) + cov1(p.y, 32.0, 6.5, fw.y)));
    float hole = gridX(p.x, 70.0, 15.6, 24.0, 5.6, fw.x) * (cov1(p.y, 12.5, 5.0, fw.y) + cov1(p.y, 32.0, 5.0, fw.y));
    alb = mix(alb, vec3(0.004), hole);
    float ci = clamp(floor((p.x - 70.0) / 15.6), 0.0, 23.0);
    e += led(p, vec2(70.0 + ci * 15.6 + 4.0, 22.3), vec2(1.1, 0.8), ledC(uid * 64.0 + ci, vR, R, 1.0), fw);
    e += led(p, vec2(70.0 + ci * 15.6 + 11.5, 22.3), vec2(1.1, 0.8), ledC(uid * 64.0 + ci + 30.0, vR, R, 1.0), fw);
    e += led(p, vec2(30.0, 30.0), vec2(1.5), ledC(uid * 64.0 + 60.0, vR, R, 0.0), fw);
  } else if(type < 5.5){                       // patch panel with plugged cable boots
    float ci = clamp(floor((p.x - 40.0) / 17.0), 0.0, 23.0);
    float hb = h11(uid * 24.0 + ci);
    vec3 boot = hb < 0.35 ? vec3(0.08, 0.2, 0.55) : (hb < 0.6 ? vec3(0.5, 0.52, 0.56) : (hb < 0.75 ? vec3(0.06, 0.32, 0.34) : vec3(0.01)));
    alb = mix(alb, mix(boot, vec3(0.2, 0.22, 0.28), far), gridX(p.x, 40.0, 17.0, 24.0, 6.5, fw.x) * cov1(p.y, 24.0, 9.0, fw.y));
    alb = mix(alb, vec3(0.45, 0.46, 0.5), gridX(p.x, 40.0, 17.0, 24.0, 4.0, fw.x) * cov1(p.y, 38.0, 1.2, fw.y));
  } else if(type < 6.5){                       // plain blank
    alb = mix(alb, alb * 2.2, rectM(p, vec2(8.0, H * 0.5), vec2(2.0), fw) + rectM(p, vec2(475.0, H * 0.5), vec2(2.0), fw));
  } else if(type < 7.5){                       // brush cable manager
    float slot = rectM(p, vec2(241.5, H * 0.5), vec2(200.0, H * 0.22), fw);
    alb = mix(alb, mix(vec3(0.004), vec3(0.03), gridX(p.x, 41.5, 3.0, 133.0, 0.6, fw.x)), slot);
  } else if(type < 9.5){                       // GPU node (安 / 安-2): honeycomb grille + a light bar
    float inG = rectM(p, vec2(241.5, 78.0), vec2(213.0, 60.0), fw);
    vec2 q = p / vec2(7.0, 6.06);
    float rw = floor(q.y);
    vec2 cc = (vec2(fract(q.x + 0.5 * mod(rw, 2.0)), fract(q.y)) - 0.5) * vec2(7.0, 6.06);
    alb = mix(alb, vec3(0.012, 0.013, 0.018), inG * mix(rectM(cc, vec2(0.0), vec2(2.5, 2.1), fw), 0.48, far));
    alb = mix(alb, alb * 1.8, rectM(p, vec2(241.5, 141.0), vec2(214.0, 1.2), fw));
    alb = mix(alb, vec3(0.008), rectM(p, vec2(241.5, 159.0), vec2(216.0, 6.0), fw));
    float seg = clamp(floor((p.x - 30.0) / 17.625), 0.0, 23.0);
    e += barC(uid, seg, vR, R) * rectM(p, vec2(30.0 + (seg + 0.5) * 17.625, 159.0), vec2(mix(7.9, 8.8, far), max(2.6, fw.y * 0.55)), fw);
    e += led(p, vec2(474.0, 30.0), vec2(1.5), ledC(uid * 64.0 + 40.0, vR, R, 0.0), fw);
    e += led(p, vec2(474.0, 42.0), vec2(1.5), ledC(uid * 64.0 + 41.0, vR, R, 1.0), fw);
    alb = mix(alb, vec3(0.36, 0.38, 0.42), rectM(p, vec2(44.0, 12.0), vec2(14.0, 3.5), fw));
  } else {                                     // AI fabric switch: 2 × 16 big cages
    float px = gridX(p.x, 60.0, 24.0, 16.0, 10.0, fw.x);
    alb = mix(alb, vec3(0.22, 0.23, 0.26), px * (cov1(p.y, 12.0, 6.0, fw.y) + cov1(p.y, 32.0, 6.0, fw.y)));
    alb = mix(alb, vec3(0.004), gridX(p.x, 60.0, 24.0, 16.0, 8.5, fw.x) * (cov1(p.y, 12.0, 4.6, fw.y) + cov1(p.y, 32.0, 4.6, fw.y)));
    float ci = clamp(floor((p.x - 60.0) / 24.0), 0.0, 15.0);
    e += led(p, vec2(60.0 + ci * 24.0 + 12.0, 22.2), vec2(3.0, 0.9), ledC(uid * 64.0 + ci, vR, R, 1.0), fw);
  }
  // unit seams and the bevel catching the overhead light
  float seam = max(cov1(p.y, 0.0, 0.9, fw.y), cov1(p.y, H, 0.9, fw.y));
  alb = mix(alb, alb * 1.9 + 0.035, cov1(p.y, H - 2.2, 0.8, fw.y) * 0.7);
  alb = mix(alb, bez * 1.35 + 0.015, ear * (1.0 - seam) * step(type, 7.5));
  alb = mix(alb, vec3(0.005, 0.005, 0.008), seam);
}
`;

export function faceMat() {
  const u = { ...G, ...DC };
  const vs = /* glsl */ `
    attribute float aRack;
    varying float vRack;
    ${VERT_STD}
    void main(){ vRack = aRack; stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    ${DC_GLSL}
    ${FACE_GLSL}
    varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv;
    varying float vRack;
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      float ri = floor(vRack + 0.5);
      int rI = int(ri);
      vec4 R = rackInfo(rI);
      vec2 pc = vec2(vUv.x * 483.0, vUv.y * 42.0 * 44.45);
      vec2 fw = max(fwidth(pc), vec2(0.05));
      float yU = clamp(vUv.y, 0.0, 0.99999) * 42.0;
      float uIdx = floor(yU);
      vec4 Ud = texelFetch(uRackData, ivec2(int(uIdx), rI), 0);
      float H = Ud.z * 44.45;
      vec2 p = vec2(pc.x, (Ud.y + fract(yU)) * 44.45);
      float vR = (uIdx - Ud.y + Ud.z * 0.5) / 42.0;
      float uid = ri * 64.0 + (uIdx - Ud.y);
      vec3 alb, e;
      unitFace(Ud.x, p, H, Ud.w, uid, R, vR, fw, alb, e);
      vec3 N = normalize(vNormalW); vec3 NV = normalize(vNormalV);
      if(!gl_FrontFacing){ N = -N; NV = -NV; }
      vec3 outc = dcCel(alb, N, vWorld);
      // the face's own LEDs wash its bezels
      int row = int(ri) / NK;
      float kk = ri - float(row * NK);
      outc += alb * rackE(row, kk) * 2.2;
      outc += e * uLedGain * pw(Z0 - RW * (kk + 0.5));
      writeOut(outc, 1.0, NV, vDepth, 20.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.FrontSide });
}

// ---------------------------------------------------------------- glossy raised floor
export function floorMat() {
  const u = { ...G, ...DC };
  const vs = /* glsl */ `
    ${VERT_STD}
    void main(){ stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    ${DC_GLSL}
    varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv;
    float typeGlow(float t){ return t > 8.5 && t < 9.5 ? 1.0 : (t > 1.5 && t < 2.5 ? 0.55 : (t > 3.5 && t < 4.5 ? 0.6 : (t > 9.5 ? 0.6 : (t > 0.5 && t < 1.5 ? 0.3 : (t > 2.5 && t < 3.5 ? 0.4 : 0.0))))); }
    // what a rack face shows at (z, y): coarse glow of the unit there
    vec3 unitGlow(int row, float z, float y){
      if(y < 0.1 || y > 0.1 + U42) return vec3(0.0);
      float kf = (Z0 - z) / RW;
      float k = floor(kf);
      if(k < 0.0 || k > NKF - 1.0) return vec3(0.0);
      float lu = kf - k;
      float inEq = smoothstep(0.07, 0.13, lu) * smoothstep(0.93, 0.87, lu);
      int ri = row * NK + int(k);
      vec4 R = rackInfo(ri);
      float uI = floor((y - 0.1) / 0.04445);
      vec4 Ud = texelFetch(uRackData, ivec2(int(uI), ri), 0);
      float vR = (uI - Ud.y + Ud.z * 0.5) / 42.0;
      vec3 cold = COLD * typeGlow(Ud.x) * (0.55 + 0.6 * h11(Ud.w * 7.0 + uI));
      vec3 amb = AMBER * typeGlow(Ud.x) * 1.4 * gather() * (1.0 + settle());
      vec3 g = mix(cold, amb, anOf(R)) * inEq;
      // the light columns on the posts
      float post = max(cov1(lu, 0.053, 0.03, 0.04), cov1(lu, 0.947, 0.03, 0.04));
      return (g + stripC(R, (y - 0.1) / U42, 0.0) * post * 1.6) * pw(Z0 - RW * (k + 0.5));
    }
    float raySeg(vec3 o, vec3 r, vec3 a, vec3 b, out float h){
      vec3 u = b - a; float C = max(dot(u, u), 1e-6);
      vec3 w = o - a;
      float B = dot(r, u), D = dot(r, w), E = dot(u, w);
      float den = max(C - B * B, 1e-6);
      float sR = max((B * E - C * D) / den, 0.0);
      h = clamp(dot(o + r * sR - a, u) / C, 0.0, 1.0);
      sR = max(dot(a + u * h - o, r), 0.0);
      return length(o + r * sR - (a + u * h));
    }
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 lp = vWorld - uOrigin;
      vec3 cam = cameraPosition - uOrigin;
      vec2 tc = lp.xz / 0.6;
      vec2 ti = floor(tc), tf = tc - ti;
      vec2 fwt = max(fwidth(tc), vec2(1e-4));
      float seam = max(cov1(tf.x, 0.0, 0.007, fwt.x) + cov1(tf.x, 1.0, 0.007, fwt.x), cov1(tf.y, 0.0, 0.007, fwt.y) + cov1(tf.y, 1.0, 0.007, fwt.y));
      float th = hash12(ti + 7.0);
      vec3 base = mix(vec3(0.13, 0.155, 0.18), vec3(0.16, 0.185, 0.21), th);
      bool aisle = abs(lp.x) < 1.1 && lp.z < Z0 && lp.z > ZEND;
      float perf = (aisle && (ti.x < -1.5 || ti.x > 0.5) && mod(ti.y, 2.0) < 0.5) ? 1.0 : 0.0;
      if(perf > 0.5){
        vec2 g = mod(lp.xz, 0.025) - 0.0125;
        vec2 fw2 = max(fwidth(lp.xz), vec2(1e-5));
        float hole = rectM(g, vec2(0.0), vec2(0.005), fw2);
        float farP = smoothstep(0.004, 0.012, max(fw2.x, fw2.y));
        base = mix(base, base * 0.35, mix(hole, 0.16, farP));
        base = mix(base, base * 1.5, cov1(tf.x, 0.5, 0.47, fwt.x) * cov1(tf.y, 0.5, 0.47, fwt.y) * 0.0);
      }
      base = mix(base, vec3(0.012, 0.014, 0.018), clamp(seam, 0.0, 1.0));
      vec3 N = vec3(0.0, 1.0, 0.0);
      vec3 outc = dcCel(base, N, vWorld);

      // ---- reflections (glossy anti-static tiles): rack faces, the stream overhead, the end doors, the fixtures
      vec3 V = normalize(lp - cam);
      vec3 Rr = vec3(V.x, -V.y, V.z);
      vec3 refl = vec3(0.0);
      if(aisle){
        float xs = Rr.x > 0.0 ? 1.1 : -1.1;
        int row = Rr.x > 0.0 ? 1 : 0;
        float tt = (xs - lp.x) / (abs(Rr.x) < 1e-4 ? 1e-4 * sign(xs) : Rr.x);
        vec3 Hh = lp + Rr * max(tt, 0.0);
        float spread = 0.03 + 0.09 * Hh.y;
        vec3 g = vec3(0.0);
        for(int i = 0; i < 4; i++){
          float o = (float(i) - 1.5) * spread;
          g += unitGlow(row, Hh.z + o * 0.25, Hh.y + o);
        }
        refl += g * 0.25 * exp(-Hh.y * 0.45) * 1.2;
        // the end of the aisle: the lit corridor seen through the glass doors
        if(Rr.z < -1e-3){
          float tz = (ZEND - lp.z) / Rr.z;
          vec3 Hd = lp + Rr * tz;
          // glossy: the doors' reflection smears toward the viewer as a long streak
          float door = cov1(Hd.x, 0.0, 0.62, 0.35) * exp(-max(Hd.y - 1.9, 0.0) * 0.16);
          door *= 1.0 - cov1(Hd.x, 0.0, 0.05, 0.06) * 0.6;
          refl += vec3(0.5, 0.8, 1.0) * door * 0.45 * exp(-max(Hd.y, 0.0) * 0.05) * uDoor;
        }
      }
      // the stream (reflected only where the racks don't hide it)
      for(int i = 0; i < 23; i++){
        vec3 a = uTrunk[i].xyz, b = uTrunk[i + 1].xyz;
        float h;
        float d = raySeg(lp, Rr, a, b, h);
        if(d > 0.5) continue;
        vec3 q = a + (b - a) * h;
        if(abs(q.x) > 1.1){
          float tx = (sign(q.x) * 1.1 - lp.x) / (abs(Rr.x) < 1e-4 ? 1e-4 : Rr.x);
          if(tx > 0.0 && lp.y + Rr.y * tx < RH + 0.02) continue;
        }
        float I = flowBase(mix(uTrunkA[i], uTrunkA[i + 1], h));
        refl += AMBER * I * exp(-pow(d / 0.16, 2.0)) * 0.7;
      }
      // fixtures
      if(Rr.y > 1e-3){
        for(int i = 0; i < 8; i++){
          vec4 F = uFix[i];
          if(F.w <= 0.0) continue;
          float ty = (F.y - lp.y) / Rr.y;
          vec3 Hf = lp + Rr * ty;
          refl += vec3(0.6, 0.85, 1.0) * F.w * 3.0 * cov1(Hf.x, F.x, 0.06, 0.08) * cov1(Hf.z, F.z, 0.6, 0.25);
        }
        // red emergency lamps, smeared long by the gloss
        for(int i = 0; i < 4; i++){
          vec4 E = uEm[i];
          if(E.w <= 0.0 || uEmerg <= 0.0) continue;
          float ty = (E.y - lp.y) / Rr.y;
          vec3 He = lp + Rr * ty;
          refl += EMRED * E.w * uEmerg * 1.4 * cov1(He.x, E.x, 0.12, 0.3) * exp(-abs(He.z - E.z) * 1.6);
        }
      }
      float fres = 0.35 + 0.65 * pow(1.0 - abs(V.y), 2.0);
      float gloss = (0.55 + 0.45 * th) * (1.0 - clamp(seam, 0.0, 1.0)) * (1.0 - 0.55 * perf);
      outc += refl * fres * gloss * uReflGain;
      writeOut(outc, 1.0, N, vDepth, 105.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.FrontSide });
}

// ---------------------------------------------------------------- overlay: the glow of the stream in the air (additive, soft depth)
export function glowMat(o = {}) {
  const u = { ...G, ...DC, uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: o.width ?? 0.2 }, uGain: { value: o.gain ?? 1 }, uSoft: { value: o.soft ?? 0.35 } };
  const vs = /* glsl */ `
    attribute vec3 aTan; attribute vec4 aFlow; attribute float aSide;
    uniform float uWidth;
    varying vec4 vF; varying float vSide; varying float vD;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec3 tW = normalize(mat3(modelMatrix) * aTan);
      vec3 toCam = normalize(cameraPosition - wp.xyz);
      vec3 side = normalize(cross(tW, toCam));
      wp.xyz += side * aSide * uWidth;
      vec4 mv = viewMatrix * wp;
      vD = -mv.z; vF = aFlow; vSide = aSide;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${DC_GLSL}
    uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uGain, uSoft;
    varying vec4 vF; varying float vSide; varying float vD;
    out vec4 oColor;
    void main(){
      float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      float soft = clamp((sceneD - vD) / uSoft + 0.6, 0.0, 1.0);
      float I = flowI(vF);
      float prof = exp(-vSide * vSide * 3.5) + exp(-vSide * vSide * 70.0) * 1.6;
      float fog = exp(-vD * 0.025) * mix(0.3, 1.0, smoothstep(1.0, 6.0, vD));
      oColor = vec4(AMBER * I * prof * uGain * soft * fog, 1.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}

// overlay: dust in the air, lit by the stream (amber), the flipped racks and the cold end of the aisle. aSeed = base pos (hall-local), phase
export function moteMat() {
  const u = { ...G, ...DC, uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uGain: { value: 1 } };
  const vs = /* glsl */ `
    ${COMMON}
    ${DC_GLSL}
    attribute vec4 aSeed;
    uniform vec2 uRes;
    varying vec3 vCol; varying float vD;
    void main(){
      float ph = aSeed.w;
      vec3 lp = aSeed.xyz + vec3(sin(uTime * 0.21 + ph) * 0.16, sin(uTime * 0.13 + ph * 1.7) * 0.1 + 0.025 * uTime, cos(uTime * 0.17 + ph * 2.3) * 0.16);
      // the stream lights the motes near it
      float best = 1e9, ba = 1e9;
      for(int i = 0; i < 23; i++){
        vec3 a = uTrunk[i].xyz, b = uTrunk[i + 1].xyz, ab = b - a;
        float h = clamp(dot(lp - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
        float d = length(lp - a - ab * h);
        if(d < best){ best = d; ba = mix(uTrunkA[i], uTrunkA[i + 1], h); }
      }
      vec3 c = AMBER * flowBase(ba) * exp(-best * best * 2.2) * 1.4;
      // light from the rack faces (amber where 安 lives / has moved in)
      c += (rowGlow(0, lp.z) * smoothstep(1.6, 0.0, lp.x + 1.1) + rowGlow(1, lp.z) * smoothstep(1.6, 0.0, 1.1 - lp.x)) * smoothstep(2.6, 1.2, lp.y) * 0.9;
      for(int i = 0; i < 4; i++){ vec4 E = uEm[i]; if(E.w > 0.0) c += EMRED * E.w * uEmerg * exp(-pow(length(E.xyz - lp) / 1.8, 2.0)) * 0.6; }
      // the cold light beyond the doors, and a faint base
      c += vec3(0.35, 0.65, 0.8) * (0.06 * pw(lp.z) + 0.5 * uDoor * exp(-max(lp.z - ZEND, 0.0) * 0.25));
      vec3 wp = lp + uOrigin;
      vec4 mv = viewMatrix * vec4(wp, 1.0);
      vD = -mv.z;
      vCol = c * (0.6 + 0.4 * sin(uTime * 1.3 + ph * 5.0));
      gl_PointSize = clamp(0.011 * projectionMatrix[1][1] * uRes.y * 0.5 / max(vD, 0.1), 1.2, 7.0);
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uGain;
    varying vec3 vCol; varying float vD;
    out vec4 oColor;
    void main(){
      float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      if(sceneD < vD - 0.05) discard;
      float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
      float fog = exp(-vD * 0.03) * smoothstep(0.4, 1.5, vD);
      oColor = vec4(vCol * a * fog * uGain, 1.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
}

// overlay: a soft halo of light (camera-facing), aCorner = quad corner; uniforms set the centre, size and colour
export function haloMat(o = {}) {
  const u = {
    uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uCenter: { value: new THREE.Vector3(...(o.center ?? [0, 0, 0])) }, uSize: { value: new THREE.Vector2(...(o.size ?? [1, 1])) },
    uColor: { value: new THREE.Vector3(...(o.color ?? [1, 1, 1])) }, uGain: { value: o.gain ?? 1 },
  };
  const vs = /* glsl */ `
    attribute vec2 aCorner;
    uniform vec3 uCenter; uniform vec2 uSize;
    varying vec2 vC; varying float vD;
    void main(){
      vec4 mv = viewMatrix * modelMatrix * vec4(uCenter, 1.0);
      vD = -mv.z;
      mv.xy += aCorner * uSize;
      vC = aCorner;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uSceneData; uniform vec2 uRes; uniform vec3 uColor; uniform float uGain;
    varying vec2 vC; varying float vD;
    out vec4 oColor;
    void main(){
      float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      float occl = mix(0.35, 1.0, smoothstep(vD - 3.0, vD - 0.5, sceneD));
      float r = length(vC);
      float k = exp(-r * r * 3.2) * 0.8 + exp(-r * r * 18.0) * 0.6;
      oColor = vec4(uColor * k * uGain * occl, 1.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}

// overlay: soft cones of light under the ceiling fixtures (cylindrical billboards), aInt = intensity
export function coneMat() {
  const u = { uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uGain: { value: 1 } };
  const vs = /* glsl */ `
    attribute vec3 aBase; attribute vec2 aCone; attribute float aInt;
    varying vec2 vC; varying float vD; varying float vI;
    void main(){
      vec4 wb = modelMatrix * vec4(aBase, 1.0);
      vec3 toCam = cameraPosition - wb.xyz; toCam.y = 0.0;
      vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(1e-4))));
      float y = aCone.y;                               // 0 at the fixture, 1 at the floor
      float w = mix(0.12, 1.1, y);
      vec3 wp = wb.xyz + side * aCone.x * w + vec3(0.0, -y * 4.2, 0.0);
      vec4 mv = viewMatrix * vec4(wp, 1.0);
      vD = -mv.z; vC = aCone; vI = aInt;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uGain;
    varying vec2 vC; varying float vD; varying float vI;
    out vec4 oColor;
    void main(){
      float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      float soft = clamp((sceneD - vD) / 0.8, 0.0, 1.0);
      float edge = 1.0 - smoothstep(0.35, 1.0, abs(vC.x));
      float down = (1.0 - smoothstep(0.0, 1.0, vC.y)) * smoothstep(0.0, 0.05, vC.y);
      float fog = exp(-vD * 0.03);
      oColor = vec4(vec3(0.45, 0.72, 0.85) * edge * down * vI * uGain * soft * fog * 0.07, 1.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}
