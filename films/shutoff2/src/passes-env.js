// Environment passes: painted brushwork, water, atmosphere.
// Imported by engine.js; base uniforms are created in Engine's constructor.
// Extra uniforms for these passes go in ENV_UNIFORMS (merged by the engine).
import * as THREE from 'three';
import { G } from './glsl.js';
import { OCEAN_GLSL } from './world-ocean-glsl.js';

// Weather uniforms shared by the environment materials (sky, city, foliage)
// and the water / atmosphere passes. world.update(state) and applyLook() set them.
export const ENV = {
  uRain: { value: 0 },        // 0..1 sunshower intensity
  uWet: { value: 0 },         // 0..1 how soaked the city is
  uVeil: { value: 0 },        // 0..1 thin cloud over the sun
  uRainbow: { value: 0 },     // 0..1 rainbow growth
  uEnvTime: { value: 0 },     // film time on threes (drawn env FX)
  uOcean: { value: 1 },       // 1 = open-ocean drawing (km scale), 0 = plain water
  uOceanScale: { value: 1 },  // multiplies every swell and whitecap size
  uWaterOn: { value: 1 },     // mirrors look.water for the atmosphere pass
  uShipWake: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) },   // x, z, heading, length
  uSeaShadow: { value: new THREE.Vector4(0, 0, 0, 0) },    // x, z, heading, strength
  uSeaShadowB: { value: new THREE.Vector4(600, 160, 0, 0) },  // half length, half width
  uSeaCalm: { value: 0 },     // 0..1 flatten the swell (the held breath before the water mountain)
};

export const ENV_UNIFORMS = {
  paint: { tData: { value: null } },
  water: { uRain: ENV.uRain, uRainbow: ENV.uRainbow, uEnvTime: ENV.uEnvTime, uVeil: ENV.uVeil,
    uOcean: ENV.uOcean, uOceanScale: ENV.uOceanScale, uShipWake: ENV.uShipWake, uSeaShadow: ENV.uSeaShadow, uSeaShadowB: ENV.uSeaShadowB, uSeaCalm: ENV.uSeaCalm,
    // the robot's shadow map masks the caustics on the street floor
    uShadowMap: G.uShadowMap, uShadowMatrix: G.uShadowMatrix, uShadowOn: G.uShadowOn },
  atmos: { uRain: ENV.uRain, uVeil: ENV.uVeil, uEnvTime: ENV.uEnvTime, uWaterOn: ENV.uWaterOn,
    uHazeCool: { value: new THREE.Color('#cfe6f5') }, uHazeWarm: { value: new THREE.Color('#eef4f4') } },   // world.js shares the sky's own
};

export const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm2(vec2 p){ float s = 0., a = .5; for(int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
`;

export const PAINT_FS = /* glsl */ `
uniform sampler2D tColor, tData;
uniform vec2 uRes;
uniform float uRadius, uStep, uS;
varying vec2 vUv;
out vec4 o;
${NOISE}
// Generalised anisotropic Kuwahara: 8 overlapping sectors of an elliptical brush
// aligned to a slowly turning stroke field; sectors are blended by how flat they are,
// so edges and small painted details survive while flat areas get gouache strokes.
// The brush shrinks on distant surfaces so windows and signs stay readable.
void main(){
  vec4 c0 = texture(tColor, vUv);
  if(c0.a < 0.5){ o = vec4(c0.rgb, 0.0); return; }
  vec2 px = 1.0 / uRes;
  vec2 fc = gl_FragCoord.xy / uS;
  float ang = (fbm2(fc / 140.0) - 0.5) * 3.2 + 0.4;
  vec2 dA = vec2(cos(ang), sin(ang)), dB = vec2(-dA.y, dA.x);
  float depth = texture(tData, vUv).b;
  float rad = uRadius * mix(0.72, 0.4, smoothstep(10.0, 120.0, depth)) * uStep;
  vec3 m[8]; vec3 s[8]; float n[8];
  for(int k = 0; k < 8; k++){ m[k] = c0.rgb; s[k] = c0.rgb * c0.rgb; n[k] = 1.0; }
  for(int r = 1; r <= 3; r++){
    float rr = rad * float(r) / 3.0;
    for(int k = 0; k < 16; k++){
      float a = float(k) * 0.39269908 + (r == 2 ? 0.19634954 : 0.0);
      vec2 off = (dA * cos(a) * 1.45 + dB * sin(a) * 0.8) * rr;
      vec4 t = texture(tColor, vUv + off * px);
      vec3 tc = t.rgb * t.a, tq = t.rgb * t.rgb * t.a;
      if(k / 2 * 2 == k){
        int i0 = k / 2;
        m[i0] += tc; s[i0] += tq; n[i0] += t.a;
      } else {
        int i0 = (k - 1) / 2, i1 = ((k + 1) / 2) % 8;
        m[i0] += tc * 0.5; s[i0] += tq * 0.5; n[i0] += t.a * 0.5;
        m[i1] += tc * 0.5; s[i1] += tq * 0.5; n[i1] += t.a * 0.5;
      }
    }
  }
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for(int k = 0; k < 8; k++){
    vec3 mu = m[k] / n[k];
    vec3 v = abs(s[k] / n[k] - mu * mu);
    float sd = sqrt(v.r + v.g + v.b);
    float w = 1.0 / (1.0 + pow(sd * 22.0, 8.0));
    acc += mu * w; wsum += w;
  }
  vec3 col = wsum > 1e-5 ? acc / wsum : c0.rgb;
  // dry-brush grain and paper tooth
  mat2 R = mat2(dA.x, dA.y, dB.x, dB.y);
  vec2 sp = R * fc;
  float bristle = vnoise(vec2(sp.x / 26.0, sp.y / 2.2));
  float paper = vnoise(fc / 2.5) * 0.5 + vnoise(fc / 9.0) * 0.5;
  col *= 0.98 + 0.04 * bristle;
  col *= 0.99 + 0.02 * paper;
  o = vec4(col, 1.0);
}
`;

export const WATER_FS = /* glsl */ `
uniform sampler2D tColor, tData, tRefl;
uniform vec2 uRes;
uniform vec3 uCamPos;
uniform mat4 uInvProj, uCamWorld, uReflMat;
uniform float uWaterLevel, uTime, uFxTime;
uniform vec3 uSunDir, uSunColor;
uniform float uSunStrength;
uniform vec3 uDeep, uShallow, uFoam, uSkyRefl;
uniform vec4 uRip[12];      // x, z, start time, amplitude
uniform vec4 uRipB[12];     // speed, width, decay, foam
uniform vec4 uWake;         // x, z, heading, strength
uniform vec4 uWake2;        // trail length, width, unused
uniform float uWaveAmp, uReflStrength, uOn;
uniform float uRain, uRainbow, uEnvTime, uVeil;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
uniform float uOcean, uOceanScale, uSeaCalm;
uniform vec4 uShipWake[8];
uniform vec4 uSeaShadow, uSeaShadowB;
varying vec2 vUv;
out vec4 o;
${NOISE}
float hfield(vec2 q){
  float t = uFxTime;
  float h = fbm2(q * 0.18 + vec2(t * 0.035, t * 0.02)) * 1.0;
  h += vnoise(q * vec2(0.9, 1.6) - vec2(t * 0.22, -t * 0.05)) * 0.22;
  return h;
}
float ripples(vec2 q, out float foam){
  float h = 0.0; foam = 0.0;
  for(int i = 0; i < 12; i++){
    vec4 R = uRip[i]; vec4 B = uRipB[i];
    if(R.w <= 0.0) continue;
    float age = uFxTime - R.z;
    if(age <= 0.0) continue;
    float r = length(q - R.xy);
    float rad = age * B.x;
    float x = (r - rad) / B.y;
    float env = R.w * exp(-age * B.z) * smoothstep(0.0, 0.3, age);
    float ring = exp(-x * x) * env;
    h += ring * sin(x * 2.6);
    // a second, thinner trailing ring like drawn ripple FX
    float x2 = (r - rad * 0.72) / (B.y * 0.7);
    float ring2 = exp(-x2 * x2) * env * 0.6;
    foam = max(foam, smoothstep(0.32, 0.5, ring + ring2) * B.w);
  }
  return h;
}
// world point on the water plane under a screen uv (for pixel footprints)
vec2 waterAt(vec2 uv){
  vec4 vp = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 wd = normalize(mat3(uCamWorld) * normalize(vp.xyz / vp.w));
  float t = (uWaterLevel - uCamPos.y) / min(wd.y, -1e-4);
  return (uCamPos + wd * t).xz;
}
// One layer of drawn rain rings: each cell holds a drop that lands once per period
// at a fresh spot. Rings are SDF lines kept >= ~1 px wide via the pixel footprint.
void ringLayer(vec2 q, vec2 dqx, vec2 dqy, float cs, float seed, float dens,
               inout float line, inout vec2 nd, inout float spark){
  vec2 ci = floor(q / cs);
  for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
    vec2 c = ci + vec2(float(i), float(j));
    float on = hash12(c * 1.37 + seed + 4.1);
    if(on > dens) continue;
    float period = 0.62 + 0.55 * hash12(c + seed + 9.3);
    float tt = uEnvTime + hash12(c + seed) * 9.0;
    float cyc = floor(tt / period);
    float age = tt - cyc * period;
    vec2 jit = hash22(c + cyc * 13.7 + seed);
    vec2 ctr = (c + 0.2 + 0.6 * jit) * cs;
    vec2 rel = q - ctr;
    float r = length(rel);
    float R = 0.03 + age * (0.42 + 0.22 * jit.x);
    if(r > R + 0.2) continue;
    float life = 1.0 - age / period;
    float fade = life * life;
    vec2 g = rel / max(r, 1e-4);
    float fw = abs(dot(g, dqx)) + abs(dot(g, dqy));
    float w = max(0.006, fw * 0.55);
    float d1 = abs(r - R);
    float ln = 1.0 - smoothstep(w, w + fw, d1);
    float d2 = abs(r - R * 0.62);
    ln = max(ln, (1.0 - smoothstep(w * 0.8, w * 0.8 + fw, d2)) * 0.55 * step(0.12, age));
    line = max(line, ln * fade);
    float prof = exp(-pow((r - R) / (0.03 + 0.04 * age), 2.0)) * fade;
    nd += g * prof * 0.45;
    spark = max(spark, (1.0 - smoothstep(0.0, 0.13, age)) * (1.0 - smoothstep(w * 2.0, w * 2.0 + fw * 2.0, r)));
  }
}
// ---- caustics: a drawn net of light (Voronoi cell borders), animated on threes
float vorEdge(vec2 p, float t){
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for(int y = -1; y <= 1; y++) for(int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 h = hash22(i + g);
    vec2 o = 0.5 + 0.36 * sin(t * vec2(0.9, 1.1) + 6.2831 * h);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if(d < d1){ d2 = d1; d1 = d; } else if(d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
float causticNet(vec2 xz, float t, float aaM){
  // warp the domain so the net is drawn with curved, uneven strands
  xz += (vec2(vnoise(xz * 0.4 + 3.0), vnoise(xz * 0.4 + 17.0)) - 0.5) * 1.7;
  vec2 p1 = xz / 1.15;
  vec2 p2 = mat2(0.8, -0.6, 0.6, 0.8) * xz / 0.72 + vec2(3.1, 7.7);
  float a1 = max(aaM / 1.15, 1e-4), a2 = max(aaM / 0.72, 1e-4);
  float e1 = vorEdge(p1, t);
  float e2 = vorEdge(p2, t * 1.25 + 2.0);
  // strand width varies along the net: thick bright ropes and hair-thin threads
  float wv = 0.35 + 1.3 * vnoise(xz * 0.35 + t * 0.1);
  float l1 = 1.0 - smoothstep(0.03 * wv, 0.03 * wv + a1 * 1.5, e1);
  float l2 = 1.0 - smoothstep(0.022 * wv, 0.022 * wv + a2 * 1.5, e2);
  // brighter knots where the two nets cross; fade to an even glow once sub-pixel
  float c = l1 * 0.95 + l2 * 0.12 + l1 * l2 * 0.9;
  // a soft glow round each strand so the net reads as light, not as cracks
  c += (1.0 - smoothstep(0.0, 0.2, e1)) * 0.22 + (1.0 - smoothstep(0.0, 0.12, e2)) * 0.08;
  // light gathers in drifting patches
  c *= 0.45 + 0.9 * smoothstep(0.25, 0.75, vnoise(xz * 0.12 + vec2(t * 0.05, 0.0)));
  float lod = smoothstep(0.35, 0.12, max(a1, a2));
  return mix(0.12, c, lod);
}
float shadowAt(vec3 wp){
  if(uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp, 1.0);
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if(c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.0;
  float d = texture(uShadowMap, c.xy).r;
  return (c.z - 0.002 > d) ? 0.0 : 1.0;
}
// ---- little fish swimming over the old street: silhouettes and their shadows
// school: centre (x, z), depth, orbit radius, angular speed, count, size
const int NSCH = 4;
vec4 schA(int i){
  if(i == 0) return vec4(-0.6, -5.8, -1.9, 2.3);
  if(i == 1) return vec4(-5.8, -2.6, -3.0, 2.8);
  if(i == 2) return vec4(-2.2, -10.5, -1.3, 2.2);
  return vec4(4.8, -7.0, -2.4, 3.2);
}
vec4 schB(int i){   // speed, count, length, colour (0 dark, 1 koi)
  if(i == 0) return vec4(0.28, 6.0, 0.22, 0.0);
  if(i == 1) return vec4(-0.2, 5.0, 0.26, 0.0);
  if(i == 2) return vec4(0.16, 2.0, 0.55, 1.0);
  return vec4(-0.24, 6.0, 0.2, 0.0);
}
// fish body + tail mask at xz for fish k of school s; returns (mask, which koi pattern)
vec2 fishAt(vec2 xz, int s, float t, float aa){
  vec4 A = schA(s), B = schB(s);
  float best = 0.0, pat = 0.0;
  for(int k = 0; k < 6; k++){
    if(float(k) >= B.y) break;
    float fk = float(k);
    float ph = fk * 0.55 + hash12(vec2(fk, float(s))) * 0.4;
    float ang = t * B.x + ph * sign(B.x) * -0.6 + float(s) * 1.7;
    float rr = A.w * (0.75 + 0.35 * hash12(vec2(fk + 3.0, float(s))));
    vec2 c = A.xy + vec2(cos(ang), sin(ang)) * rr + (hash22(vec2(fk, float(s) + 5.0)) - 0.5) * 0.5;
    vec2 hd = normalize(vec2(-sin(ang), cos(ang)) * sign(B.x));
    vec2 rel = xz - c;
    float L = B.z * (0.85 + 0.3 * hash12(vec2(fk, 9.0 + float(s))));
    vec2 lp = vec2(dot(rel, hd), dot(rel, vec2(-hd.y, hd.x))) / L;
    if(abs(lp.x) > 1.6 || abs(lp.y) > 0.8) continue;
    lp.y += sin(lp.x * 4.0 + t * 9.0 + fk) * 0.06 * smoothstep(0.3, -1.0, lp.x);
    float wdt = 0.3 * (1.0 - 0.55 * smoothstep(-0.2, -1.0, lp.x)) * (1.0 - 0.3 * smoothstep(0.4, 1.0, lp.x));
    float body = length(vec2(lp.x, lp.y / wdt)) - 1.0;
    float tail = max(abs(lp.y) - (-lp.x - 0.8) * 0.9, max(lp.x + 0.85, -lp.x - 1.4));
    float sd = min(body, tail) * L;
    float m = 1.0 - smoothstep(-aa, aa, sd);
    if(m > best){ best = m; pat = step(0.2, vnoise(lp * 2.6 + fk * 3.0)); }
  }
  return vec2(best, pat);
}
// ---- sun glitter: separate drawn glints along the path, never one blown disc
float glintLayer(vec2 q, mat2 Ji, float cs, float seed, vec3 n, vec3 wdir, float pxS){
  vec2 ci = floor(q / cs);
  float g = 0.0;
  float tick = floor(uEnvTime * 8.0 + 0.5);
  for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
    vec2 c = ci + vec2(float(i), float(j));
    float roll = floor((tick + hash12(c + seed) * 7.0) / 3.0);   // each glint re-rolls every few drawings
    vec2 h = hash22(c * 1.31 + seed + roll * 0.173);
    vec2 ctr = (c + 0.15 + 0.7 * h) * cs;
    vec2 tilt = (hash22(c * 2.17 + seed + roll * 0.311) - 0.5) * 0.3;
    vec3 nf = normalize(n + vec3(tilt.x, 0.0, tilt.y));
    float a = dot(reflect(wdir, nf), uSunDir);
    float on = smoothstep(0.9885, 0.9975, a);
    if(on <= 0.0) continue;
    vec2 pd = Ji * (q - ctr) / pxS;      // offset in output pixels
    float sz = 0.7 + 1.3 * hash12(c + seed + 3.3);
    float core = 1.0 - smoothstep(sz * 0.6, sz * 1.4, length(pd));
    float arm = sz * (2.5 + 3.5 * on);
    float star = max((1.0 - smoothstep(0.3, 1.0, abs(pd.y))) * (1.0 - smoothstep(0.0, arm, abs(pd.x))),
                     (1.0 - smoothstep(0.3, 1.0, abs(pd.x))) * (1.0 - smoothstep(0.0, arm * 0.7, abs(pd.y))));
    g = max(g, on * max(core, star * 0.75));
  }
  return g;
}
${OCEAN_GLSL}
void main(){
  vec4 col = texture(tColor, vUv);
  if(uOn < 0.5){ o = col; return; }
  vec4 d = texture(tData, vUv);
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vp = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = normalize(vp.xyz / vp.w);
  vec3 wdir = normalize(mat3(uCamWorld) * vdir);
  if(wdir.y > -1e-4){ o = col; return; }
  float t = (uWaterLevel - uCamPos.y) / wdir.y;
  if(t <= 0.0){ o = col; return; }
  float cosv = -vdir.z;
  float waterVD = t * cosv;
  float sceneVD = d.b;
  if(sceneVD < 8000.0 && waterVD > sceneVD){ o = col; return; }
  vec3 P = uCamPos + wdir * t;
  vec2 q = P.xz;
  float pxWorld = waterVD * 0.0018;              // rough size of a pixel on the water
  vec2 dqx = waterAt(vUv + vec2(1.0 / uRes.x, 0.0)) - q;
  vec2 dqy = waterAt(vUv + vec2(0.0, 1.0 / uRes.y)) - q;
  float foot = max(length(dqx), length(dqy));    // metres per pixel (worst axis)
  float pxS = uRes.y / 1040.0;                   // internal pixels per output pixel
  if(uOcean > 0.5){ o = vec4(oceanColor(q, foot, t, wdir, vdir, d, col.rgb, dqx, dqy, pxS), 1.0); return; }

  // ---- surface normal from the height field + ring ripples + wake
  float e = max(0.06, pxWorld * 2.0);
  float rf;
  float waveAmp = uWaveAmp * (1.0 - 0.35 * uRain);
  float h0 = hfield(q) * waveAmp + ripples(q, rf);
  float rfx, rfz;
  float hx = hfield(q + vec2(e, 0.0)) * waveAmp + ripples(q + vec2(e, 0.0), rfx);
  float hz = hfield(q + vec2(0.0, e)) * waveAmp + ripples(q + vec2(0.0, e), rfz);
  vec3 n = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e) * vec3(0.6, 1.0, 0.6));

  // ---- the sunshower: a dense field of drawn rain rings + impact sparkles
  float rline = 0.0, rspark = 0.0; vec2 rnd = vec2(0.0);
  float ringLod = 0.0;
  if(uRain > 0.01){
    float dens = clamp(uRain * 1.1, 0.0, 0.95);
    ringLod = smoothstep(0.11, 0.035, foot);       // rings drawn only where a cell spans enough pixels
    if(ringLod > 0.0){
      ringLayer(q, dqx, dqy, 0.85, 0.0, dens, rline, rnd, rspark);
      ringLayer(q + vec2(0.31, 0.57), dqx, dqy, 1.25, 7.0, dens * 0.8, rline, rnd, rspark);
      rline *= ringLod; rspark *= ringLod; rnd *= ringLod;
      n = normalize(n + vec3(rnd.x, 0.0, rnd.y) * 0.6);
    }
    // far away the rings merge into a fine glittering roughness
    float fine = vnoise(q * 3.1 + vec2(uEnvTime * 7.3, -uEnvTime * 5.1)) - 0.5;
    n = normalize(n + vec3(fine, 0.0, -fine) * 0.12 * uRain);
  }

  // wake behind a wading robot: Kelvin arms + churned trail
  float wakeFoam = 0.0;
  if(uWake.w > 0.0){
    vec2 f = vec2(sin(uWake.z), cos(uWake.z));
    vec2 rel = q - uWake.xy;
    float behind = -dot(rel, f);
    float side = abs(dot(rel, vec2(f.y, -f.x)));
    if(behind > -2.0 && behind < uWake2.x){
      float arm = side - max(behind, 0.0) * 0.36 - 2.2;
      float armL = exp(-arm * arm / (0.5 + behind * 0.05)) * smoothstep(uWake2.x, 0.0, behind);
      float churn = smoothstep(uWake2.y, uWake2.y * 0.3, side) * smoothstep(uWake2.x * 0.6, 0.0, behind) * smoothstep(-2.0, 1.0, behind);
      float cn = vnoise(rel * 1.4 + uFxTime * 0.6);
      wakeFoam = max(step(0.55, armL * (0.7 + 0.6 * vnoise(rel * 0.8))) , step(0.62, churn * (0.6 + 0.8 * cn))) * uWake.w;
      n = normalize(n + vec3(cn - 0.5, 0.0, armL) * 0.25 * uWake.w);
    }
  }

  // ---- reflection: smeared vertically like painted water; signboard reflections drift
  vec3 camR = normalize(vec3(uCamWorld[0].x, 0.0, uCamWorld[0].z));
  vec3 camF = normalize(vec3(-uCamWorld[2].x, 0.0, -uCamWorld[2].z));
  vec2 qc = vec2(dot(P, camR), dot(P, camF));
  vec4 rc = uReflMat * vec4(P, 1.0);
  vec2 ruv = rc.xy / rc.w;
  ruv += n.xz * vec2(0.035, 0.05);
  ruv.x += sin(qc.y * 1.7 + uFxTime * 1.9) * 0.0025 * smoothstep(60.0, 8.0, waterVD);
  vec3 refl = vec3(0.0);
  float wsum = 0.0;
  float smear = 1.0 + 1.2 * uRain;
  for(int i = -3; i <= 3; i++){
    float w = 1.0 - abs(float(i)) / 4.0;
    vec2 jit = vec2((vnoise(vec2(q.x * 0.7, float(i)) ) - 0.5) * 0.004, float(i) * 0.0045 * smear);
    refl += texture(tRefl, ruv + jit).rgb * w; wsum += w;
  }
  refl /= wsum;
  refl = mix(refl, uSkyRefl, 0.1 + 0.08 * uRain);
  // posterise reflection value slightly (cel-like banding)
  float lum = dot(refl, vec3(0.299, 0.587, 0.114));
  float ql = floor(lum * 7.0 + 0.5) / 7.0;
  refl *= mix(1.0, ql / max(lum, 0.001), 0.3);

  // ---- looking into the clear water: the drowned street reads through it
  float sceneT = sceneVD / max(cosv, 1e-4);
  vec3 Ps = uCamPos + wdir * sceneT;                   // what lies under the surface here
  float depthB = max(uWaterLevel - Ps.y, 0.0);
  float under = (sceneVD - waterVD) / max(cosv, 0.05);
  // light leaves the floor at the refracted angle: short optical path even at grazing views
  float cosI = clamp(-wdir.y, 0.0, 1.0);
  float sinR = sqrt(max(1.0 - cosI * cosI, 0.0)) / 1.333;
  float cosR = sqrt(max(1.0 - sinR * sinR, 0.0));
  float pathR = min(depthB / max(cosR, 0.3), under);
  float bay = smoothstep(45.0, 160.0, length(Ps.xz));  // the bay deepens away from the street
  float kAbs = mix(0.085, 0.26, bay);
  float absorb = 1.0 - exp(-pathR * kAbs - max(t - 25.0, 0.0) * 0.004 - bay * 0.9);
  absorb = mix(absorb, 1.0, step(8000.0, sceneVD));
  vec2 ouv = vUv + n.xz * 0.009 * smoothstep(0.0, 1.5, under);
  vec3 below = texture(tColor, ouv).rgb;
  vec4 dO = texture(tData, ouv);

  // caustics on everything under the surface (floor, wrecks, the robot's legs)
  vec3 sR = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0 / 1.333);   // sunlight travelling down
  float sunK = uSunStrength * (1.0 - 0.55 * uVeil) * (1.0 - 0.45 * uRain);
  if(sceneVD < 8000.0 && depthB > 0.05 && sunK > 0.01){
    vec2 nvx = dO.rg * 2.0 - 1.0;
    vec3 nV = vec3(nvx, sqrt(max(0.0, 1.0 - dot(nvx, nvx))));
    vec3 Nw = normalize(mat3(uCamWorld) * nV);
    float facing = clamp(dot(Nw, -sR) * 0.8 + 0.25, 0.0, 1.0);
    vec2 xzc = Ps.xz - sR.xz * (depthB / max(-sR.y, 0.2));
    float cst = causticNet(xzc, uEnvTime * 1.6, foot * sceneT / max(t, 1e-3) / max(cosR, 0.4));
    float deepK = mix(1.0, 0.55, smoothstep(1.0, 7.0, depthB)) * smoothstep(0.05, 0.6, depthB);
    float sh = shadowAt(Ps + Nw * 0.05);
    float I = cst * facing * deepK * sunK * (0.35 + 0.65 * sh) * (1.0 - bay);
    below = mix(below, below * 1.5 + vec3(0.06, 0.12, 0.11), clamp(I, 0.0, 1.0) * 0.72);
    // shadows of the fish on the floor
    for(int s = 0; s < NSCH; s++){
      float fy = schA(s).z;
      if(Ps.y > fy - 0.1) continue;
      vec2 fs = Ps.xz - sR.xz * ((fy - Ps.y) / max(-sR.y, 0.2));
      float fm = fishAt(fs, s, uEnvTime, 0.04 + 0.02 * (fy - Ps.y)).x;
      below *= 1.0 - fm * 0.32 * sunK;
    }
  }
  vec3 tint = mix(vec3(0.9, 0.98, 0.96), vec3(0.68, 0.92, 0.9), smoothstep(1.0, 7.0, pathR));
  below = mix(below * tint, uShallow, 0.04 + 0.16 * smoothstep(2.0, 9.0, pathR));
  vec3 body = mix(below, uDeep, absorb);
  // the fish themselves, a little below the surface
  for(int s = 0; s < NSCH; s++){
    float fy = schA(s).z;
    float tf = (fy - uCamPos.y) / wdir.y;
    if(tf <= 0.0 || tf > sceneT) continue;
    vec2 fxz = uCamPos.xz + wdir.xz * tf;
    vec2 fm = fishAt(fxz, s, uEnvTime, foot * 1.2 + 0.01);
    if(fm.x <= 0.0) continue;
    vec3 fc = schB(s).w > 0.5 ? mix(vec3(0.98, 0.5, 0.22), vec3(0.97, 0.95, 0.9), fm.y) : vec3(0.16, 0.3, 0.33);
    float fa = 1.0 - exp(-(-fy) / max(cosR, 0.3) * kAbs * 1.1);
    fc = mix(fc * mix(vec3(1.0), uShallow * 1.3, 0.25), uDeep, fa);
    body = mix(body, fc, fm.x * (schB(s).w > 0.5 ? 0.85 : 0.6));
  }
  // sunlight scattering inside the water (turquoise glow on the sun side)
  float sunIn = pow(max(dot(normalize(vec3(wdir.x, 0.0, wdir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 2.0);
  body += uShallow * 0.14 * sunIn * uSunStrength * absorb;

  float ndv = max(dot(-wdir, n), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  fres = clamp(fres * uReflStrength, 0.0, 1.0);
  vec3 wc = mix(body, refl, fres);

  // ---- calm sheen bands drifting across the bay
  float sheen = smoothstep(0.6, 0.75, vnoise(vec2(qc.x * 0.012, qc.y * 0.035) + vec2(uFxTime * 0.01, 0.0)));
  wc = mix(wc, mix(uSkyRefl, vec3(1.0), 0.3), sheen * smoothstep(10.0, 60.0, waterVD) * (1.0 - 0.7 * uRain) * 0.1);

  // ---- sun on the water: a soft sheen and a path of separate drawn glints
  vec3 rd = reflect(wdir, n);
  float sd = max(dot(rd, uSunDir), 0.0);
  float glowK = uSunStrength * (1.0 - 0.6 * uVeil);
  wc += uSunColor * (pow(sd, 40.0) * 0.07 + pow(sd, 8.0) * 0.025) * glowK;
  mat2 J = mat2(dqx, dqy);
  float det = J[0][0] * J[1][1] - J[1][0] * J[0][1];
  float glit = 0.0;
  if(abs(det) > 1e-12 && glowK > 0.02){
    mat2 Ji = inverse(J);
    float near = smoothstep(0.03, 0.012, foot);
    float mid = smoothstep(0.12, 0.05, foot) * (1.0 - near);
    if(near > 0.0) glit = max(glit, glintLayer(q, Ji, 0.32, 0.0, n, wdir, pxS) * near);
    if(mid > 0.0) glit = max(glit, glintLayer(q, Ji, 1.4, 17.0, n, wdir, pxS) * mid);
    // far: a sparse stipple of points along the path
    float farK = 1.0 - near - mid;
    vec2 sp = floor(vUv * uRes / (2.0 * pxS));
    float stp = step(0.985, hash12(sp + floor(uEnvTime * 8.0) * 1.7)) * smoothstep(0.985, 0.999, sd);
    glit = max(glit, stp * farK);
  }
  wc += uSunColor * glit * 1.5 * glowK * (1.0 - 0.4 * uRain);

  // ---- drawn ripple dashes, aligned to the screen horizontal
  float sc = 1.0 / (1.0 + waterVD * 0.02);
  float dash = vnoise(vec2(qc.x * 0.22, qc.y * 3.2) + vec2(uFxTime * 0.15, 0.0));
  float dash2 = vnoise(vec2(qc.x * 0.5, qc.y * 7.0) - vec2(uFxTime * 0.25, 0.0));
  float lines = step(0.82, dash) * 0.5 + step(0.86, dash2) * 0.35 * sc;
  wc = mix(wc, mix(uSkyRefl, vec3(1.0), 0.4), lines * 0.4 * (1.0 - 0.6 * uRain) * smoothstep(400.0, 30.0, waterVD));

  // ---- rain on the water: rings catch the sky, the ones in the sun path flash
  if(uRain > 0.01){
    float sunPath = pow(max(dot(reflect(wdir, vec3(0.0, 1.0, 0.0)), uSunDir), 0.0), 6.0);
    vec3 ringC = mix(mix(uSkyRefl, vec3(1.0), 0.55), uSunColor * 1.6, sunPath * uSunStrength);
    wc = mix(wc, ringC, clamp(rline, 0.0, 1.0) * 0.62);
    wc += uSunColor * rspark * (0.7 + 1.6 * sunPath) * uSunStrength;
    // the far surface turns silvery and stippled with tiny splashes
    float far = 1.0 - ringLod;
    vec2 sp = floor(vUv * uRes / 2.0);
    float st = step(0.996, hash12(sp + floor(uEnvTime * 8.0) * 3.1)) * smoothstep(0.15, 0.6, sunPath + 0.2);
    wc = mix(wc, mix(uSkyRefl, vec3(1.0), 0.35), 0.08 * uRain * far);
    wc += uSunColor * st * far * uRain * (0.3 + 1.2 * sunPath) * uSunStrength;
  }

  // ---- contact foam where things pierce the surface, and a second broken line
  //      a little way out from walls and wrecks (not around the robot: FX draws that)
  float contact = smoothstep(0.35 + pxWorld * 2.0, 0.05, under) * step(sceneVD, 8000.0);
  float cn = vnoise(q * 3.0 + uFxTime * 0.8);
  float foamLine = step(0.45, contact * (0.7 + 0.6 * cn));
  float isStatic = 1.0 - step(0.5, d.a) * step(d.a, 99.5);
  float off = (under - (0.62 + 0.25 * vnoise(q * 0.7))) / (0.09 + pxWorld * 2.0);
  float foam2 = (1.0 - smoothstep(0.6, 1.0, abs(off))) * step(0.45, vnoise(q * vec2(1.3, 1.3) + vec2(uFxTime * 0.4, 0.0))) * isStatic * step(sceneVD, 8000.0) * smoothstep(60.0, 15.0, waterVD);
  float ringFoam = rf;
  float foam = max(max(foamLine, ringFoam), wakeFoam);
  wc = mix(wc, uFoam * mix(vec3(1.0), uSunColor, 0.35 * uSunStrength), foam * 0.85);
  wc = mix(wc, mix(uFoam, uSkyRefl, 0.3), foam2 * 0.55 * (1.0 - foam));

  o = vec4(wc, 1.0);
}
`;

export const ATMOS_FS = /* glsl */ `
uniform sampler2D tColor, tData;
uniform vec3 uCamPos;
uniform mat4 uInvProj, uCamWorld;
uniform float uWaterLevel, uTime;
uniform vec3 uSunDir, uSunColor;
uniform float uSunStrength;
uniform vec3 uFogWarm, uFogCool;
uniform float uFogDensity, uMist, uMistHeight, uMistNear;
uniform vec2 uSunUV;
uniform float uShafts;
uniform float uRain, uVeil, uEnvTime, uWaterOn;
uniform vec3 uHazeCool, uHazeWarm;
varying vec2 vUv;
out vec4 o;
${NOISE}
void main(){
  vec4 col = texture(tColor, vUv);
  vec4 d = texture(tData, vUv);
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vp = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = normalize(vp.xyz / vp.w);
  vec3 wdir = normalize(mat3(uCamWorld) * vdir);
  float cosv = -vdir.z;
  float vd = d.b;
  bool seaHit = false;
  if(wdir.y < -1e-4){
    float t = (uWaterLevel - uCamPos.y) / wdir.y;
    if(t > 0.0){ vd = min(vd, t * cosv); seaHit = uWaterOn > 0.5; }
  }
  bool sky = vd > 8000.0 && !seaHit;
  float dist = sky ? 3000.0 : vd / max(cosv, 0.05);
  vec3 P = uCamPos + wdir * dist;
  float toSun = dot(wdir, uSunDir);
  float sunward = smoothstep(-0.3, 1.0, toSun);
  vec3 fogC = mix(uFogCool, uFogWarm, sunward);
  // rain haze: sunlit droplets brighten the air, strongest looking into the light
  float rainFog = uRain * (0.0007 + 0.0011 * pow(max(toSun, 0.0), 3.0));
  float fog = 1.0 - exp(-dist * (uFogDensity + rainFog));
  if(sky) fog *= 0.0;
  // height mist hugging the water, drifting in soft banks
  float hgt = max(P.y - uWaterLevel, 0.0);
  float bank = fbm2(P.xz * 0.03 + vec2(uTime * 0.012, uTime * 0.004));
  float mist = uMist * exp(-hgt / uMistHeight) * smoothstep(uMistNear, uMistNear + 40.0, dist) * (0.35 + 1.1 * bank);
  if(sky){
    // mist sits low on the horizon in front of the sky
    float hz = exp(-max(wdir.y, 0.0) * 18.0);
    mist = uMist * hz * 0.7;
  }
  float f = clamp(fog + mist, 0.0, 0.95);
  vec3 c = mix(col.rgb, fogC, f);
  // the far sea melts into the sky's own horizon colour, so no hard seam is left between them.
  // Only open sea and open sky take it: whatever stands in front stays crisp.
  float seaVD = seaHit ? (uWaterLevel - uCamPos.y) / wdir.y * cosv : 1e9;
  if(uWaterOn > 0.5 && (sky || (seaHit && (d.b > seaVD - 1.0 || d.b > 8000.0)))){
    float sunSide = dot(normalize(wdir.xz + 1e-5), normalize(uSunDir.xz + 1e-5)) * 0.5 + 0.5;
    vec3 hazeC = mix(uHazeCool, uHazeWarm, smoothstep(0.35, 1.0, sunSide));
    float hy = wdir.y;
    float hk = hy < 0.0 ? exp(-pow(-hy / 0.03, 1.3)) : 0.72 * exp(-pow(hy / 0.016, 1.5));
    c = mix(c, hazeC, hk);
  }
  // backlit rain glow: a soft bright bloom of air around the (off-screen) sun
  c += uSunColor * uRain * pow(max(toSun, 0.0), 8.0) * 0.08 * uSunStrength * (sky ? 0.3 : 1.0);

  // light shafts: march toward the sun over open-sky pixels; above the frame counts as sky
  vec3 camF = normalize(mat3(uCamWorld) * vec3(0.0, 0.0, -1.0));
  float facing = dot(camF, uSunDir);
  if(uShafts > 0.0 && facing > 0.05){
    vec2 toS = uSunUV - vUv;
    float L = length(toS);
    vec2 dirS = toS / max(L, 1e-4);
    float span = min(L, 0.7);
    float acc = 0.0;
    for(int i = 1; i <= 28; i++){
      vec2 uv = vUv + dirS * span * (float(i) / 28.0);
      float s;
      if(uv.y > 1.0) s = 1.0;
      else if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0) s = 0.6;
      else s = texture(tData, uv).b > 8000.0 ? 1.0 : 0.0;
      acc += s;
    }
    acc /= 28.0;
    float ang = atan(toS.y, toS.x);
    float streak = smoothstep(0.25, 0.95, vnoise(vec2(ang * 30.0, uEnvTime * 0.15)) * 0.7 + vnoise(vec2(ang * 80.0, 3.0)) * 0.4);
    float k = uShafts * uSunStrength * smoothstep(0.05, 0.4, facing) * (0.3 + 1.0 * uRain);
    float fall = smoothstep(1.5, 0.3, L);
    c += uSunColor * acc * streak * k * fall * (sky ? 0.14 : 0.32);
  }
  o = vec4(c, 1.0);
}
`;
