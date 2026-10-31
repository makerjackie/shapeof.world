// GLSL for the night market. Everything fogs toward the horizon colour with the same exponential haze.

const COMMON = /* glsl */ `
// Hash without sine (Dave Hoskins): the sin() hash lost precision on large inputs and gave different patterns
// from one render to the next (a QR sign that changed every frame, windows that blinked).
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash1(float n) { return hash(vec2(n, n * 1.618)); }
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
attribute vec4 aS; // lit, success, hue, sign index
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
varying vec3 vNl;
void main() {
  float c = cos(aP.z), s = sin(aP.z);
  vNl = normal;
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
uniform sampler2D uSigns;
varying vec3 vNl;
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
  // the per-stall seed, snapped: interpolation noise in a varying would flip the hash from frame to frame
  float sd = floor(vSeed * 1000.0 + 0.5) / 1000.0;
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
    albedo = mix(vec3(0.78, 0.74, 0.66), paint, 0.62);
    albedo *= 0.94 + 0.06 * sin(vUv.x * 22.0 + sd * 9.0);
  } else if (pt == 2) {
    albedo = vec3(0.5, 0.52, 0.56);
  } else if (pt == 3) {
    albedo = vec3(0.03);
    if (abs(n.z) > 0.5) {
      // a working screen: a bright column of rows
      float row = step(0.45, fract(vUv.y * 9.0)) * step(0.12, vUv.x) * step(vUv.x, 0.12 + 0.76 * hash(vec2(floor(vUv.y * 9.0), sd)));
      emis = vec3(0.55, 0.72, 1.0) * vE.x * (0.45 + 0.4 * row);
    }
  } else if (pt == 4) {
    emis = uLamp * (0.35 + 3.0 * lit * (0.35 + succ));
  } else if (pt == 5) {
    vec3 sc = mix(vec3(1.0, 0.93, 0.82), hsv2rgb(vec3(hue, 0.55, 1.0)), 0.45);
    float ink = 0.0;
    if (vNl.z > 0.5) {
      float idx = vS.w;
      float cc = mod(idx, 8.0);
      float row = floor(idx / 8.0);
      vec2 uvA = vec2((cc + vUv.x) / 8.0, 1.0 - (row + 1.0 - vUv.y) / 8.0);
      ink = texture2D(uSigns, uvA).a;
    }
    emis = mix(sc * 0.05, sc * 1.35, ink) * vE.y * (0.3 + 0.7 * lit);
    albedo = vec3(0.04);
  } else if (pt == 6) {
    albedo = paint * 0.85;
  } else if (pt == 7) {
    albedo = vec3(0.08);
    emis = vec3(1.0, 0.72, 0.42) * 0.55 * lit;
  } else if (pt == 8) {
    albedo = vec3(0.04);
    emis = vec3(1.0, 0.32, 0.06) * 0.35 * lit * (0.8 + 0.2 * sin(uTime * 3.0 + sd * 10.0));
  } else if (pt == 9) {
    albedo = vec3(0.025);
  } else if (pt == 10) {
    float stripe = step(0.5, fract(vLocal.x * 2.2));
    albedo = mix(paint, vec3(0.86, 0.82, 0.76), stripe * 0.75);
  } else if (pt == 11) {
    // the price board: a few rows of hand-written items and prices
    float rowsN = 5.0;
    float r = floor((1.0 - vUv.y) * rowsN);
    vec2 q = vec2(vUv.x, fract((1.0 - vUv.y) * rowsN));
    float ink = 0.0;
    if (r >= 0.5 && r < rowsN - 0.5 && q.y > 0.18 && q.y < 0.82) {
      if (vUv.x < 0.62) ink = glyphs(vec2((vUv.x - 0.1) / 0.52, q.y), r + 3.0, 3.0) * step(0.1, vUv.x);
      else ink = glyphs(vec2((vUv.x - 0.68) / 0.24, q.y), r + 9.0, 1.4) * step(0.68, vUv.x) * step(vUv.x, 0.92);
    }
    float head = step(0.82, vUv.y) * step(0.2, vUv.x) * step(vUv.x, 0.8) * step(abs(fract(vUv.y * 2.0 * rowsN) - 0.5), 0.3);
    vec2 e = abs(vUv - 0.5);
    float pad = step(max(e.x, e.y), 0.46);
    albedo = mix(vec3(0.12, 0.09, 0.06), mix(vec3(0.93, 0.88, 0.76), vec3(0.62, 0.12, 0.08), max(ink, head * 0.9)), pad);
    emis = albedo * 0.32 * lit;
  }
  // light from the stall's own bulb, plus a little moonlight and (at dawn) daylight
  vec3 L = vL - vW;
  float d = length(L);
  L /= max(d, 1e-3);
  float ndl = max(dot(n, L), 0.0);
  float bulb = lit * (0.35 + 1.4 * succ);
  vec3 light = uAmb * (0.6 + 0.4 * n.y) + uLamp * bulb * (0.15 + ndl) * 2.6 / (1.0 + d * d * 1.4);
  light += vec3(0.62, 0.6, 0.62) * uDay * (0.28 + 0.4 * max(n.y, 0.0));
  vec3 col = albedo * light + emis;
  float keep = vE.z;
  col *= mix(1.0, 0.22, uDim * (1.0 - keep));
  col = fogged(col, vW);
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 8.0), 1.0);
}
`;

// ---------- Glow sprites (bulbs, string lights, customers, sparks) ----------
export const GLOW_VERT = /* glsl */ `
attribute vec4 aC; // x, y, z, world size
attribute vec4 aK; // r, g, b, intensity
uniform float uPx; // world units per pixel at 1 m
uniform float uMinPx;
uniform float uMaxPx;
uniform float uFogD;
varying vec2 vUv;
varying vec4 vK;
varying float vFog;
void main() {
  vec4 mv = viewMatrix * vec4(aC.xyz, 1.0);
  float dist = max(-mv.z, 0.01);
  float minS = uMinPx * uPx * dist;
  float s = min(max(aC.w, minS), uMaxPx * uPx * dist);
  float energy = (aC.w * aC.w) / (s * s);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy;
  vK = aK;
  vK.w *= clamp(energy, 0.6, 1.0);
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
  float a = exp(-r2 * 6.0) * 0.42 + exp(-r2 * 40.0) * 1.25;
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
  vec3 pv = vec3(0.024, 0.025, 0.03);
  // paving joints
  vec2 tile = abs(fract(p * vec2(1.6, 1.6)) - 0.5);
  pv *= 0.88 + 0.12 * smoothstep(0.44, 0.47, max(tile.x, tile.y)) * -1.0 + 0.12;
  col = mix(col, pv, pave);
  col *= 0.8 + 0.4 * vnoise(p * 0.9) * (0.7 + 0.3 * vnoise(p * 7.0));
  // a faint wet sheen in the road: brighter toward the light-pool layer
  col += uAmb * 0.16;
  col += vec3(0.4, 0.38, 0.4) * uDay * (0.11 + 0.06 * pave);
  col = fogged(col, vW);
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 2.0), 1.0);
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
  col += vec3(0.07, 0.045, 0.03) * exp(-abs(y) * 30.0) * uStars;
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
    float id = hash(c + floor(n.xz * 1.5 + 0.5) * 13.0);
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

// ---------- Low buildings in the blocks (instanced unit boxes, windows on every side) ----------
export const BLOCK_VERT = /* glsl */ `
attribute vec4 aB; // x, z, w, d
attribute vec2 aH; // h, seed
varying vec3 vW;
varying vec3 vN;
varying vec3 vL; // metres within the building: x across, y up, z across
varying vec3 vSize;
varying float vSeed;
void main() {
  vec3 p = position; // unit box, y 0..1
  vec3 size = vec3(aB.z, aH.x, aB.w);
  vL = vec3((p.x + 0.5) * size.x, p.y * size.y, (p.z + 0.5) * size.z);
  vec3 w = vec3(aB.x + p.x * size.x, p.y * size.y, aB.y + p.z * size.z);
  vW = w;
  vN = normal;
  vSize = size;
  vSeed = aH.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const BLOCK_FRAG = /* glsl */ `
uniform vec3 uAmb;
uniform float uDay;
uniform float uDim;
uniform float uWin;
varying vec3 vW;
varying vec3 vN;
varying vec3 vL;
varying vec3 vSize;
varying float vSeed;
${COMMON}
${FOG}
void main() {
  vec3 n = normalize(vN);
  float sd = floor(vSeed * 1000.0 + 0.5) / 1000.0;
  vec2 fn = floor(n.xz * 1.5 + 0.5); // -1, 0, 1 exactly
  vec3 wall = mix(vec3(0.035, 0.038, 0.045), vec3(0.055, 0.05, 0.047), sd);
  vec3 col = wall * (uAmb * 6.0 + 0.025);
  // light from the stall lamps below, fading up the wall
  col += vec3(1.0, 0.6, 0.3) * 0.05 * exp(-vL.y / 2.5) * step(n.y, 0.5);
  if (n.y < 0.5) {
    float along = abs(n.z) > 0.5 ? vL.x : vL.z;
    float span = abs(n.z) > 0.5 ? vSize.x : vSize.z;
    float cols = max(1.0, floor(span / 1.55));
    vec2 f = vec2(along / span * cols, (vL.y - 0.6) / 2.9);
    vec2 c = floor(f);
    vec2 q = fract(f);
    float win = step(0.26, q.x) * step(q.x, 0.74) * step(0.32, q.y) * step(q.y, 0.82) * step(0.0, f.y) * step(vL.y, vSize.y - 0.9);
    float id = hash(c + vec2(sd * 37.0, fn.x * 5.0 + fn.y * 11.0));
    float on = step(1.0 - uWin, id);
    vec3 room = mix(vec3(1.0, 0.62, 0.3), vec3(0.62, 0.78, 1.0), step(0.88, hash(c * 3.1 + sd)));
    float wx = (q.x - 0.26) / 0.48;
    float wy = (q.y - 0.32) / 0.5;
    room *= (0.16 + 0.42 * hash(c + 0.3)) * (0.35 + 0.9 * wy);
    // half the rooms have blinds drawn; the others a lamp somewhere in the room
    float blinds = step(0.5, hash(c * 7.7 + sd));
    room *= mix(1.0 - 0.35 * smoothstep(0.42, 0.5, abs(fract(wy * 7.0) - 0.5)), 1.0, 1.0 - blinds);
    room *= mix(1.0, 0.45 + 0.9 * exp(-((wx - hash(c + 1.3)) * 3.0) * ((wx - hash(c + 1.3)) * 3.0)), 1.0 - blinds);
    // mullion
    room *= 1.0 - 0.8 * step(abs(wx - 0.5), 0.03);
    vec3 glass = vec3(0.008, 0.011, 0.018) + uAmb * 0.25 + vec3(0.02, 0.025, 0.035) * smoothstep(0.3, 0.9, q.y);
    col = mix(col, mix(glass, room, on), win);
  }
  col *= mix(1.0, 0.45, step(0.5, n.y)); // roofs
  col += vec3(0.42, 0.4, 0.44) * uDay * (0.07 + 0.04 * n.y);
  col *= mix(1.0, 0.45, uDim);
  col = fogged(col, vW);
  // guard: a NaN or runaway value here gets smeared by the bloom into big white blobs
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 2.0), 1.0);
}
`;

// ---------- Tilt-shift: blur grows away from a horizontal band, so the market reads as a miniature ----------
export const TILT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uFocus;
uniform float uBand;
uniform float uAmt; // px at the frame edge
uniform vec2 uRes;
varying vec2 vUv;
void main() {
  float d = max(0.0, abs(vUv.y - uFocus) - uBand);
  float r = uAmt * smoothstep(0.0, 0.4, d);
  vec4 c0 = texture2D(tDiffuse, vUv);
  if (r < 0.6) { gl_FragColor = c0; return; }
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  for (int i = 0; i < 28; i++) {
    float fi = float(i);
    float a = fi * 2.39996;
    float rr = sqrt((fi + 0.5) / 28.0) * r;
    vec3 c = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * rr / uRes).rgb;
    float w = 1.0 + 0.6 * dot(c, vec3(0.33));
    acc += c * w;
    ws += w;
  }
  gl_FragColor = vec4(acc / ws, c0.a);
}
`;

// ---------- Income pillars: a beam of light over each near stall, its height one year's revenue ----------
// Cylindrical billboards (they turn about the vertical to face the camera), never thinner than uMinPx pixels.
export const PILLAR_VERT = /* glsl */ `
attribute vec4 aP; // x, z, base y, height
attribute vec4 aK; // r, g, b, intensity
uniform float uPx;
uniform float uMinPx;
uniform float uWidth;
uniform float uFogD;
varying vec2 vUv;
varying vec4 vK;
varying float vFog;
varying float vH;
void main() {
  vec3 base = vec3(aP.x, aP.z, aP.y);
  vec3 w = base + vec3(0.0, position.y * aP.w, 0.0);
  vec3 toCam = cameraPosition - w;
  vec2 side = normalize(vec2(-toCam.z, toCam.x) + vec2(1e-5, 0.0));
  float dist = length(toCam);
  float hw = max(uWidth, uMinPx * uPx * dist) * 0.5;
  w.xz += side * position.x * hw * 3.0; // the quad is 3x the core: room for the halo
  vUv = vec2(position.x, position.y);
  vK = aK;
  vK.w *= clamp(uWidth / (2.0 * hw), 0.35, 1.0); // thin far beams get dimmer, not wider and brighter
  vH = aP.w;
  vFog = 1.0 - exp(-uFogD * dist);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const PILLAR_FRAG = /* glsl */ `
uniform float uGain;
varying vec2 vUv;
varying vec4 vK;
varying float vFog;
varying float vH;
void main() {
  float u = vUv.x * 3.0;
  float core = exp(-u * u * 7.0);
  float halo = exp(-u * u * 0.9) * 0.22;
  float v = vUv.y;
  float rise = 0.4 + 0.6 * smoothstep(0.0, 1.0, v);
  float tip = smoothstep(1.0, 1.0 - min(0.5, 1.2 / max(vH, 0.01)), v); // soft top over the last metre
  float foot = smoothstep(0.0, min(0.3, 0.6 / max(vH, 0.01)), v);
  vec3 col = vK.rgb * vK.w * (core * 1.4 + halo) * rise * tip * foot * uGain * (1.0 - 0.85 * vFog);
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 6.0), 1.0);
}
`;

// ---------- Glass levels: horizontal sheets (a ceiling, a floor, the revenue levels), made of tiles that can break ----------
export const GLASS_VERT = /* glsl */ `
attribute vec3 aT; // tile ix, iz, seed
uniform vec3 uC; // centre x, y, z
uniform vec2 uSize; // w, d
uniform vec2 uN; // tiles across, deep
uniform float uBreak; // 0 whole .. 1 gone
uniform float uFall; // +1 tiles fall down, -1 they fly up
varying vec3 vW;
varying float vK;
varying float vCtr;
mat3 rotAxis(vec3 a, float t) {
  float c = cos(t), s = sin(t), ic = 1.0 - c;
  return mat3(c + a.x * a.x * ic, a.y * a.x * ic + a.z * s, a.z * a.x * ic - a.y * s,
              a.x * a.y * ic - a.z * s, c + a.y * a.y * ic, a.z * a.y * ic + a.x * s,
              a.x * a.z * ic + a.y * s, a.y * a.z * ic - a.x * s, c + a.z * a.z * ic);
}
void main() {
  vec2 cell = uSize / uN;
  vec3 ctr = vec3(uC.x - uSize.x * 0.5 + (aT.x + 0.5) * cell.x, uC.y, uC.z - uSize.y * 0.5 + (aT.y + 0.5) * cell.y);
  vec3 p = vec3(position.x * cell.x * 0.5 * 1.002, 0.0, position.y * cell.y * 0.5 * 1.002);
  float dly = aT.z * 0.55 + 0.25 * fract(aT.z * 7.31);
  float k = clamp((uBreak - dly) / 0.45, 0.0, 1.0);
  vec3 ax = normalize(vec3(fract(aT.z * 3.7) - 0.5, 0.3, fract(aT.z * 5.3) - 0.5));
  p = rotAxis(ax, k * (2.0 + 4.0 * fract(aT.z * 11.1))) * (p * (1.0 - 0.35 * k));
  vec3 w = ctr + p;
  w.y -= uFall * (k * k) * (cell.x * 6.0 + 4.0);
  w.xz += (vec2(fract(aT.z * 13.7), fract(aT.z * 17.3)) - 0.5) * k * cell.x * 1.6;
  vW = w;
  vK = k;
  vCtr = length((ctr.xz - uC.xz) / (uSize * 0.5));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

export const GLASS_FRAG = /* glsl */ `
uniform vec3 uC;
uniform vec2 uSize;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uGrid;
uniform float uFogD;
uniform float uLit; // tiles whose centre lies within this (0..1.5, in half-sizes) glow warm
uniform float uBase; // how much of the plain sheet shows (the dawn floor shows only its laid tiles)
varying vec3 vW;
varying float vK;
varying float vCtr;
void main() {
  // soft edges: the sheet fades out toward its border instead of ending in a hard rectangle
  vec2 d = abs(vW.xz - uC.xz) / (uSize * 0.5);
  float edge = (1.0 - smoothstep(0.55, 1.0, d.x)) * (1.0 - smoothstep(0.55, 1.0, d.y));
  vec2 g = abs(fract(vW.xz / uGrid) - 0.5);
  vec2 fw = fwidth(vW.xz / uGrid);
  float line = max(1.0 - smoothstep(0.0, fw.x * 1.5, 0.5 - g.x), 1.0 - smoothstep(0.0, fw.y * 1.5, 0.5 - g.y));
  line *= 1.0 - smoothstep(0.08, 0.3, max(fw.x, fw.y)); // no moire where the cells shrink to a few pixels
  vec3 V = normalize(cameraPosition - vW);
  float graze = 1.0 - abs(V.y);
  float a = 0.012 + 0.035 * graze * graze + 0.16 * line;
  // breaking tiles flash as they go
  a += vK * (1.0 - vK) * 0.8;
  float dist = length(cameraPosition - vW);
  float fog = 1.0 - exp(-uFogD * dist);
  vec3 col = uColor * a * edge * uOpacity * uBase * (1.0 - vK) * (1.0 - 0.85 * fog);
  float lit = step(vCtr, uLit);
  col += vec3(1.0, 0.72, 0.38) * lit * (0.1 + 0.55 * line) * uOpacity * edge;
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 4.0), 1.0);
}
`;
