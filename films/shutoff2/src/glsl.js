import * as THREE from 'three';

// Uniforms shared by every material. Spreading G into a material's uniforms
// copies references to these {value} objects, so one write updates them all.
export const G = {
  uTime: { value: 0 },
  uDrawTime: { value: 0 },          // time quantised to drawings (on twos)
  uPass: { value: 0 },              // 0 main, 1 shadow depth, 2 reflection
  uWaterLevel: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 0.1, -1).normalize() },
  uKeyDir: { value: new THREE.Vector3(0, 0.1, -1).normalize() },   // character key light (anime cheat), defaults to the sun
  uSunColor: { value: new THREE.Color('#ffd9a8') },
  uSunStrength: { value: 0 },
  uShadeTint: { value: new THREE.Color('#9da3d6') },
  uDeepTint: { value: new THREE.Color('#6f68a3') },
  uBounce: { value: new THREE.Color('#d8c6c4') },
  uSkyTint: { value: new THREE.Color('#eef0ff') },
  uShadowMap: { value: null },
  uShadowMatrix: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 },
  uRobotWet: { value: 0 },
  uBeacon: { value: 0 },            // shoulder light power 0..1
  uBeaconPhase: { value: 0 },
  uEyes: { value: 0 },              // eye glow 0..1
  uFlat: { value: 0 },              // debug: disable weathering
  // up to 6 local lights (lamps, screens, LEDs): xyz position, w radius (m); colour rgb, a intensity
  uPL: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, -1e4, 0, 0.001)) },
  uPLC: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uAmbient: { value: new THREE.Color('#000000') },   // flat fill added to every cel (night interiors)
};

export const COMMON = /* glsl */ `
uniform float uTime;
uniform float uDrawTime;
uniform float uPass;
uniform float uWaterLevel;
uniform vec3 uSunDir;
uniform vec3 uKeyDir;
uniform vec3 uSunColor;
uniform float uSunStrength;
uniform vec3 uShadeTint;
uniform vec3 uDeepTint;
uniform vec3 uBounce;
uniform vec3 uSkyTint;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
uniform vec4 uPL[6];
uniform vec4 uPLC[6];
uniform vec3 uAmbient;
// local lights, cel style: each light gives a hard-edged pool (two tones) with a soft outer falloff
vec3 localLights(vec3 wp, vec3 n){
  vec3 acc = vec3(0.0);
  for(int i = 0; i < 6; i++){
    vec4 L = uPL[i]; vec4 C = uPLC[i];
    if(C.a <= 0.0) continue;
    vec3 d = L.xyz - wp; float dist = length(d);
    float ndl = dot(n, d / max(dist, 1e-4));
    float fall = clamp(1.0 - dist / L.w, 0.0, 1.0);
    float band = smoothstep(0.0, 0.06, ndl) * (smoothstep(0.0, 0.08, fall) * 0.55 + smoothstep(0.35, 0.45, fall) * 0.45);
    acc += C.rgb * C.a * band;
  }
  return acc;
}

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float vnoise3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3.-2.*f);
  float a = mix(mix(hash13(i), hash13(i+vec3(1,0,0)), u.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), u.x), u.y);
  float b = mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), u.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), u.x), u.y);
  return mix(a, b, u.z); }
float fbm2(vec2 p){ float s = 0., a = .5; for(int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
float fbm3(vec3 p){ float s = 0., a = .5; for(int i = 0; i < 4; i++){ s += a*vnoise3(p); p = p*2.07 + vec3(1.7, 9.2, 4.1); a *= .5; } return s; }

float sunShadow(vec3 wp, vec3 n){
  if(uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp + n * 0.04, 1.0);
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if(c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.0;
  vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
  float s = 0.;
  for(int x = -1; x <= 1; x++) for(int y = -1; y <= 1; y++){
    float d = texture(uShadowMap, c.xy + vec2(x, y) * texel).r;
    s += (c.z - 0.0009 > d) ? 0. : 1.;
  }
  return s / 9.;
}
`;

export const MRT_OUT = /* glsl */ `
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oData;
// data: view normal xy, view depth, material id (0 painted bg, 1..99 inked cel, 100+ cel without ink)
void writeOut(vec3 col, float a, vec3 nView, float viewDepth, float id){
  // alpha marks painted pixels for the brushwork pass (cels stay crisp)
  oColor = vec4(col, id > 0.5 ? 0.0 : 1.0);
  oData = vec4(nView.xy * 0.5 + 0.5, viewDepth, id);
}
`;

// Standard vertex body: world/view position and normals.
export const VERT_STD = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vNormalV;
varying float vDepth;
varying vec2 vUv;
void stdVertex(vec3 pos, vec3 nrm){
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorld = wp.xyz;
  vNormalV = normalize(normalMatrix * nrm);
  vNormalW = normalize(transpose(mat3(viewMatrix)) * vNormalV);
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}
`;
