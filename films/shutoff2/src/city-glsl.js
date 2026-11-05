import * as THREE from 'three';

// Uniforms shared by every city material (spread into each material's uniforms: one write updates all).
export const MAXR = 16;
export const CU = {
  uNight: { value: 0 },           // 0 day … 1 night in rain
  uDataAll: { value: 0 },         // 1 = the whole city is data (s27–s30)
  uRing: { value: Array.from({ length: MAXR }, () => new THREE.Vector4(0, -1e5, 0, 1e9)) },  // xyz centre, w start time
  uRingP: { value: new THREE.Vector4(120, 0, 0, 0) },   // x speed (m/s), y count, z now (s), w acceleration (m/s²)
  uBreath: { value: 0 },          // 0..1 slow breathing of the data city
  uPulse: { value: new THREE.Vector4(0, 0, 0, -1) },   // xyz centre, w = radius of a travelling pulse ring (s27–30)
  uHMap: { value: null },         // building height raster (R = h / 620, G = footprint)
  uHBox: { value: new THREE.Vector4(-6220, -4263, 8174, 2372) },
  uCityShadow: { value: 1 },
  uCamY: { value: 150 },
  uHide: { value: new THREE.Vector4(0, 0, 0, 0) },
  uSweep: { value: new THREE.Vector4(0, 0, 0, -1) },   // 安's last wave from the HQ: xyz centre, w radius
};

export const CITY_GLSL = /* glsl */ `
uniform float uNight, uDataAll, uBreath, uCityShadow, uCamY;
uniform vec4 uRing[${MAXR}];
uniform vec4 uRingP;
uniform vec4 uPulse;
uniform vec4 uHide;
uniform vec4 uSweep;
uniform sampler2D uHMap;
uniform vec4 uHBox;
const vec3 AMBER = vec3(1.0, 0.71, 0.278);

// ---- 安's rings: how far behind the nearest ring front p lies (m, > 0 = already passed), plus the front glow
float ringFront(vec3 p, out float glow){
  float f = -1e5; glow = 0.0;
  for(int i = 0; i < ${MAXR}; i++){
    if(float(i) >= uRingP.y) break;
    vec4 R = uRing[i];
    float age = uRingP.z - R.w;
    if(age <= 0.0) continue;
    float rad = age * uRingP.x + age * age * uRingP.w;
    float d = length(p - R.xyz);
    float fr = rad - d;
    f = max(f, fr);
    float band = 4.0 + rad * 0.02;
    glow += exp(-abs(fr) / band) * smoothstep(0.0, 0.25, age) * (0.35 + 0.65 * exp(-age / 2.6));
    // ripples following the front, like rain on a pond
    for(int e = 1; e <= 3; e++){
      float lag = float(e) * (60.0 + rad * 0.12);
      glow += 0.3 / float(e) * exp(-abs(fr - lag) / (band * 1.3)) * step(lag * 0.5, fr + lag * 0.5) * exp(-age / 3.5);
    }
  }
  if(uSweep.w > 0.0){
    float fr = uSweep.w - length(p - uSweep.xyz);
    f = max(f, fr);
    glow += 1.3 * exp(-abs(fr) / (8.0 + uSweep.w * 0.012));
  }
  if(uPulse.w > 0.0){
    float d = length(p.xz - uPulse.xz);
    glow += 0.55 * exp(-abs(uPulse.w - d) / 14.0);
  }
  return max(f, uDataAll > 0.5 ? 1e4 : -1e5);
}

// ---- building height field: long morning shadows across streets and facades
float hAt(vec2 xz){
  vec2 uv = (xz - uHBox.xy) / (uHBox.zw - uHBox.xy);
  if(uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture(uHMap, uv).r * 620.0;
}
float cityShadow(vec3 p, vec3 n){
  if(uCityShadow < 0.5 || uSunDir.y < 0.03) return 1.0;
  vec2 dir = normalize(uSunDir.xz + 1e-5);
  float tanE = uSunDir.y / max(length(uSunDir.xz), 1e-3);
  vec3 q = p + n * 2.5;
  float sh = 1.0, dist = 4.0;
  for(int i = 0; i < 16; i++){
    float hq = hAt(q.xz + dir * dist);
    sh = min(sh, smoothstep(-2.0, 2.0, q.y + dist * tanE - hq));
    dist = dist * 1.3 + 4.0;
  }
  return sh;
}

// ---- what glass reflects in daylight: anime sky gradient, soft cloud blots, the city below the horizon
vec3 dayReflect(vec3 R, float seed){
  float az = atan(R.x, -R.z);
  vec3 hor = vec3(0.86, 0.92, 0.97);
  vec3 sky = mix(hor, vec3(0.40, 0.63, 0.92), smoothstep(0.0, 0.35, R.y));
  sky = mix(sky, vec3(0.20, 0.42, 0.82), smoothstep(0.3, 0.9, R.y));
  float cl = smoothstep(0.52, 0.7, fbm2(vec2(az * 3.0 + seed, R.y * 6.0)));
  sky = mix(sky, vec3(0.97, 0.98, 1.0), cl * smoothstep(-0.02, 0.15, R.y) * 0.85);
  vec3 city = mix(vec3(0.62, 0.68, 0.80), vec3(0.42, 0.47, 0.62), smoothstep(0.0, -0.4, R.y));
  return R.y > 0.0 ? sky : mix(hor * 0.94, city, smoothstep(0.0, -0.08, R.y));
}

// ---- night glass: the low violet deck and the glow of the streets below
vec3 nightReflect(vec3 R){
  vec3 up = mix(vec3(0.20, 0.15, 0.30), vec3(0.06, 0.07, 0.16), smoothstep(0.0, 0.5, R.y));
  vec3 dn = mix(vec3(0.16, 0.12, 0.22), vec3(0.06, 0.06, 0.12), smoothstep(0.0, -0.5, R.y));
  return R.y > 0.0 ? up : dn;
}

// the depth handed to the atmosphere pass: far distances compressed, so the haze leaves the skyline its shape
float fogDepth(float d){
  float k = mix(0.62, 0.4, uNight);
  float d0 = mix(500.0, 150.0, uNight);
  return d < d0 ? d : d0 + (d - d0) * k;
}
// anti-aliased hairline at distance d (same units as the derivative width fw)
float hair(float d, float fw, float px){ return 1.0 - smoothstep(fw * px * 0.5, fw * (px * 0.5 + 1.0), abs(d)); }
`;
