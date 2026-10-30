// GLSL for the night market. Everything fogs toward the horizon colour with the same exponential haze.

const COMMON = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float hash1(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
// Pseudo-Chinese lettering for signs seen from a distance: a row of square cells, each a few strokes.
float glyphs(vec2 uv, float seed, float n) {
  float cell = floor(uv.x * n);
  vec2 q = vec2(fract(uv.x * n), uv.y);
  if (q.y < 0.18 || q.y > 0.82 || q.x < 0.1 || q.x > 0.9) return 0.0;
  vec2 g = (q - vec2(0.1, 0.18)) / vec2(0.8, 0.64);
  float h = hash(vec2(cell, seed * 31.7));
  float ink = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float r = hash(vec2(cell + fi * 3.1, seed * 7.3 + fi));
    float horiz = step(0.5, hash(vec2(fi, cell + seed)));
    float pos = 0.15 + 0.7 * r;
    float len0 = 0.1 + 0.5 * hash(vec2(cell * 1.7, fi + seed));
    float len1 = len0 + 0.3 + 0.4 * h;
    float w = 0.09;
    if (horiz > 0.5) ink = max(ink, step(abs(g.y - pos), w) * step(len0, g.x) * step(g.x, min(len1, 0.95)));
    else ink = max(ink, step(abs(g.x - pos), w) * step(len0, g.y) * step(g.y, min(len1, 0.95)));
  }
  return ink;
}
`;

const FOG = /* glsl */ `
uniform vec3 uFog;
uniform float uFogD;
vec3 fogged(vec3 col, vec3 w) {
  float d = length(w - cameraPosition);
  float f = 1.0 - exp(-uFogD * d);
  return mix(col, uFog, clamp(f, 0.0, 1.0));
}
`;

// ---------- Stalls (instanced; parts tagged per vertex) ----------
export const STALL_VERT = /* glsl */ `
attribute float part;
attribute vec4 aP; // x, z, rot, seed
attribute vec4 aS; // lit, success, hue, laptop-glow
attribute vec4 aE; // screen, sign, keep (not dimmed), visible (y scale)
uniform vec3 uBulb;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
varying float vPart;
varying vec4 vS;
varying vec4 vE;
varying vec3 vLocal;
varying float vSeed;
varying vec2 vUv;
void main() {
  float c = cos(aP.z), s = sin(aP.z);
  vec3 p = position;
  p.y *= aE.w;
  vec3 w = vec3(aP.x + p.x * c + p.z * s, p.y, aP.y - p.x * s + p.z * c);
  vec3 n = vec3(normal.x * c + normal.z * s, normal.y, -normal.x * s + normal.z * c);
  vec3 b = uBulb;
  vL = vec3(aP.x + b.x * c + b.z * s, b.y * aE.w, aP.y - b.x * s + b.z * c);
  vW = w;
  vN = n;
  vPart = part;
  vS = aS;
  vE = aE;
  vLocal = position;
  vSeed = aP.w;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const STALL_FRAG = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uLamp;
uniform float uDim;
uniform float uTime;
uniform float uDay;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
varying float vPart;
varying vec4 vS;
varying vec4 vE;
varying vec3 vLocal;
varying float vSeed;
varying vec2 vUv;
${COMMON}
${FOG}
void main() {
  if (vE.w < 0.01) discard;
  int pt = int(vPart + 0.5);
  float lit = vS.x;
  float succ = vS.y;
  float hue = vS.z;
  vec3 paint = hsv2rgb(vec3(hue, 0.5, 0.62));
  vec3 albedo = vec3(0.14, 0.15, 0.17);
  vec3 emis = vec3(0.0);
  vec3 n = normalize(vN);
  if (pt == 0) {
    albedo = vec3(0.12, 0.13, 0.15);
  } else if (pt == 1) {
    // the cloth hung on the front of the table, printed with the shop's name
    albedo = mix(vec3(0.78, 0.74, 0.66), paint, 0.55);
    if (abs(n.z) > 0.5) {
      float ink = glyphs(vec2(vUv.x * 0.8 + 0.1, (vUv.y - 0.35) * 2.2), vSeed, 4.0);
      albedo = mix(albedo, vec3(0.07, 0.06, 0.06), ink * 0.9);
    }
  } else if (pt == 2) {
    albedo = vec3(0.5, 0.52, 0.56);
  } else if (pt == 3) {
    albedo = vec3(0.03);
    if (abs(n.z) > 0.5) {
      // a working screen: a bright column of rows
      float row = step(0.45, fract(vUv.y * 9.0)) * step(0.12, vUv.x) * step(vUv.x, 0.12 + 0.76 * hash(vec2(floor(vUv.y * 9.0), vSeed)));
      emis = vec3(0.55, 0.72, 1.0) * vE.x * (0.45 + 0.4 * row);
    }
  } else if (pt == 4) {
    emis = uLamp * (0.35 + 3.0 * lit * (0.35 + succ));
  } else if (pt == 5) {
    vec3 sc = hsv2rgb(vec3(hue, 0.45, 1.0));
    float ink = abs(n.z) > 0.5 ? glyphs(vec2(vUv.x, vUv.y), vSeed + 3.0, 3.0) : 0.0;
    emis = mix(sc * 0.18, sc * 1.1, ink) * vE.y * (0.25 + 0.75 * lit);
    albedo = vec3(0.05);
  } else if (pt == 6) {
    albedo = paint * 0.85;
  } else if (pt == 7) {
    albedo = vec3(0.08);
    emis = vec3(1.0, 0.72, 0.42) * 0.55 * lit;
  } else if (pt == 8) {
    albedo = vec3(0.04);
    emis = vec3(1.0, 0.32, 0.06) * 0.35 * lit * (0.8 + 0.2 * sin(uTime * 3.0 + vSeed * 10.0));
  } else if (pt == 9) {
    albedo = vec3(0.025);
  } else if (pt == 10) {
    float stripe = step(0.5, fract(vLocal.x * 2.2));
    albedo = mix(paint, vec3(0.86, 0.82, 0.76), stripe * 0.75);
  } else if (pt == 11) {
    // the payment QR sign
    vec2 g = floor(vUv * 21.0);
    float m = step(0.5, hash(g + vSeed));
    vec2 c3 = min(g, 20.0 - g);
    float finder = step(c3.x, 6.0) * step(c3.y, 6.0);
    if (finder > 0.5) {
      vec2 fc = (g.x < 10.0 ? g : vec2(20.0 - g.x, g.y));
      fc = vec2(min(fc.x, 6.0 - fc.x + 0.0), fc.y);
      m = 1.0;
    }
    vec2 e = abs(vUv - 0.5);
    float pad = step(max(e.x, e.y), 0.44);
    albedo = mix(vec3(0.95), vec3(0.03), m * pad);
    emis = albedo * 0.35 * lit;
  }
  // light from the stall's own bulb, plus a little moonlight and (at dawn) daylight
  vec3 L = vL - vW;
  float d = length(L);
  L /= max(d, 1e-3);
  float ndl = max(dot(n, L), 0.0);
  float bulb = lit * (0.35 + 1.4 * succ);
  vec3 light = uAmb * (0.6 + 0.4 * n.y) + uLamp * bulb * (0.15 + ndl) * 2.6 / (1.0 + d * d * 1.4);
  light += vec3(0.55, 0.62, 0.75) * uDay * (0.45 + 0.55 * max(n.y, 0.0));
  vec3 col = albedo * light + emis;
  float keep = vE.z;
  col *= mix(1.0, 0.22, uDim * (1.0 - keep));
  gl_FragColor = vec4(fogged(col, vW), 1.0);
}
`;

// ---------- Glow sprites (bulbs, string lights, customers, sparks) ----------
export const GLOW_VERT = /* glsl */ `
attribute vec4 aC; // x, y, z, world size
attribute vec4 aK; // r, g, b, intensity
uniform float uPx; // world units per pixel at 1 m
uniform float uMinPx;
uniform float uFogD;
varying vec2 vUv;
varying vec4 vK;
varying float vFog;
void main() {
  vec4 mv = viewMatrix * vec4(aC.xyz, 1.0);
  float dist = max(-mv.z, 0.01);
  float minS = uMinPx * uPx * dist;
  float s = max(aC.w, minS);
  float energy = (aC.w * aC.w) / (s * s);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy;
  vK = aK;
  vK.w *= clamp(energy, 0.16, 1.0);
  vFog = 1.0 - exp(-uFogD * dist);
}
`;

export const GLOW_FRAG = /* glsl */ `
uniform float uGain;
varying vec2 vUv;
varying vec4 vK;
varying float vFog;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 5.0) * 0.7 + exp(-r2 * 38.0) * 1.1;
  a *= 1.0 - r2;
  gl_FragColor = vec4(vK.rgb * vK.w * a * uGain * (1.0 - 0.88 * vFog), 1.0);
}
`;

// ---------- Ground ----------
export const GROUND_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const GROUND_FRAG = /* glsl */ `
uniform vec3 uAmb;
uniform float uGap;
uniform float uDay;
varying vec3 vW;
${COMMON}
${FOG}
void main() {
  vec2 p = vW.xz;
  float zz = mod(p.y + uGap * 0.5, uGap) - uGap * 0.5;
  float az = abs(zz);
  float road = 1.0 - smoothstep(3.3, 3.5, az);
  float pave = smoothstep(3.3, 3.5, az) * (1.0 - smoothstep(7.6, 7.9, az));
  vec3 col = vec3(0.016, 0.019, 0.026);
  vec3 pv = vec3(0.03, 0.031, 0.036);
  // paving joints
  vec2 tile = abs(fract(p * vec2(1.6, 1.6)) - 0.5);
  pv *= 0.88 + 0.12 * smoothstep(0.44, 0.47, max(tile.x, tile.y)) * -1.0 + 0.12;
  col = mix(col, pv, pave);
  col *= 0.8 + 0.4 * vnoise(p * 0.9) * (0.7 + 0.3 * vnoise(p * 7.0));
  // a faint wet sheen in the road: brighter toward the light-pool layer
  col += uAmb * 0.25;
  col += vec3(0.42, 0.45, 0.5) * uDay * (0.18 + 0.1 * pave);
  gl_FragColor = vec4(fogged(col, vW), 1.0);
}
`;

// ---------- Light pools on the ground (instanced, additive) ----------
export const POOL_VERT = /* glsl */ `
attribute vec4 aC; // x, z, radius, intensity
attribute vec3 aCol;
varying vec2 vUv;
varying float vI;
varying vec3 vCol;
varying vec3 vW;
void main() {
  vec3 w = vec3(aC.x + position.x * aC.z, 0.012, aC.y + position.y * aC.z);
  vW = w;
  vUv = position.xy;
  vI = aC.w;
  vCol = aCol;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const POOL_FRAG = /* glsl */ `
uniform float uGain;
varying vec2 vUv;
varying float vI;
varying vec3 vCol;
varying vec3 vW;
uniform vec3 uFog;
uniform float uFogD;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 3.2) * (1.0 - r2);
  float d = length(vW - cameraPosition);
  float f = 1.0 - exp(-uFogD * d);
  gl_FragColor = vec4(vCol * vI * a * uGain * (1.0 - f), 1.0);
}
`;

// ---------- Sky ----------
export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform float uStars;
varying vec3 vDir;
${COMMON}
void main() {
  float y = vDir.y;
  vec3 col = mix(uHor, uTop, smoothstep(-0.02, 0.45, y));
  col += uGlow * exp(-max(y, 0.0) * 9.0) * 0.9;
  col = mix(col, uHor * 0.6, smoothstep(0.0, -0.2, y));
  vec2 sp = vec2(atan(vDir.z, vDir.x) * 180.0, y * 320.0);
  float st = step(0.996, hash(floor(sp))) * smoothstep(0.08, 0.5, y);
  col += vec3(0.8, 0.85, 1.0) * st * uStars * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- The company building: an office whose windows go dark one by one ----------
export const BLDG_VERT = /* glsl */ `
uniform float uSink;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
void main() {
  vec3 p = position;
  vL = p;
  vec4 w = modelMatrix * vec4(p, 1.0);
  w.y -= uSink;
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const BLDG_FRAG = /* glsl */ `
uniform vec3 uAmb;
uniform float uOff; // fraction of windows dark
uniform float uFloors;
uniform float uCols;
uniform vec3 uSize;
uniform float uDim;
uniform float uDay;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
${COMMON}
${FOG}
void main() {
  if (vW.y < -0.01) discard;
  vec3 n = normalize(vN);
  vec3 wall = vec3(0.06, 0.065, 0.075);
  vec3 col = wall * (uAmb * 6.0 + 0.04);
  // windows on the four sides
  vec2 f;
  float side = 0.0;
  if (abs(n.z) > 0.5) { f = vec2((vL.x / uSize.x + 0.5) * uCols, vL.y / uSize.y * uFloors); side = 1.0; }
  else if (abs(n.x) > 0.5) { f = vec2((vL.z / uSize.z + 0.5) * uCols * 0.45, vL.y / uSize.y * uFloors); side = 1.0; }
  if (side > 0.5 && vL.y > 0.6) {
    vec2 c = floor(f);
    vec2 q = fract(f);
    float win = step(0.12, q.x) * step(q.x, 0.88) * step(0.22, q.y) * step(q.y, 0.86);
    float id = hash(c + n.xz * 13.0);
    float on = step(uOff, id * 0.999);
    // inside: warm ceiling light, a desk band, a monitor
    vec3 room = vec3(1.0, 0.84, 0.6) * (0.55 + 0.25 * hash(c * 1.7));
    float desk = step(q.y, 0.42) * step(0.22, q.y);
    float mon = step(0.36, q.x) * step(q.x, 0.62) * step(0.42, q.y) * step(q.y, 0.62);
    room = mix(room, room * 0.35, desk);
    room = mix(room, vec3(0.55, 0.75, 1.0) * 1.2, mon);
    vec3 dark = vec3(0.012, 0.015, 0.022);
    col = mix(col, mix(dark, room, on), win);
  }
  col += vec3(0.5, 0.55, 0.65) * uDay * 0.12;
  col *= mix(1.0, 0.3, uDim);
  gl_FragColor = vec4(fogged(col, vW), 1.0);
}
`;

// ---------- Textured planes (banners, signs with real lettering) ----------
export const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const PLANE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform float uEmis;
uniform vec3 uAmb;
varying vec2 vUv;
varying vec3 vW;
${FOG}
void main() {
  vec4 t = texture2D(map, vUv);
  if (t.a * uOpacity < 0.01) discard;
  vec3 col = t.rgb * (uAmb * 4.0 + uEmis);
  gl_FragColor = vec4(fogged(col, vW), t.a * uOpacity);
}
`;

// ---------- Post: split tone, vignette, grain, fade ----------
export const GRADE_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uVig;
uniform float uGrain;
uniform float uFade;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col += vec3(0.004, 0.009, 0.024) * (1.0 - smoothstep(0.0, 0.3, l));
  col *= mix(vec3(1.0), vec3(1.04, 1.0, 0.93), smoothstep(0.35, 0.9, l));
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  vec2 q = vUv - 0.5;
  q.x *= 1.777;
  col *= 1.0 - uVig * smoothstep(0.38, 1.08, length(q));
  float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.31) * 113.0) - 0.5;
  col += g * uGrain * (0.6 + 0.4 * (1.0 - l));
  col *= 1.0 - uFade;
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}
`;
