// Facade shader for every building in the 3D city: OSM blocks, CTBUH towers and 深圳能源大厦 (HERO).
// Windows are drawn procedurally per floor and bay; the pattern is band-limited by its screen footprint, so far
// facades fade to their average colour instead of shimmering. Towers get curtain walls with lights in clusters,
// low blocks get punched windows. Night lights, empty floors (vacancy), tint and rising heights are per-building
// values in a float texture (uState: r = lit, g = tint, b = height, a = vacancy).

export const BLDG_VERT = /* glsl */ `
attribute vec2 aUV;
attribute float aB;
attribute float aRoof;
attribute float aH;
attribute vec2 aEdge;
attribute vec2 aC;
attribute float aCov;
uniform float uHideCov;
#ifdef TOWERS
attribute float aYear;
uniform float uYear;
uniform float uEx;
varying float vFresh;
#endif
#ifdef HERO
attribute vec3 aSpec; // roof height, floors above ground, crown
attribute float aFace;
varying vec3 vSpec;
varying float vFace;
#endif
uniform sampler2D uState;
uniform float uStateW;
uniform float uRise;
uniform float uClip;
uniform vec4 uHide; // footprint centres inside this box are hidden (x0, y0, x1, y1)
varying vec2 vUV;
varying float vB;
varying float vRoof;
varying vec3 vN;
varying vec4 vS;
varying float vH;
varying float vY;
varying vec2 vEdge;
#include <common>
#include <fog_pars_vertex>
void main() {
  int i = int(aB + 0.5);
  int w = int(uStateW);
  vec4 s = texelFetch(uState, ivec2(i - (i / w) * w, i / w), 0);
  float hs = s.b * uRise;
#ifdef TOWERS
  hs *= clamp(uYear - aYear + 1.0, 0.0, 1.0) * uEx;
  vFresh = clamp(1.6 - (uYear - aYear), 0.0, 1.0) * step(aYear, uYear);
#endif
  if (aC.x > uHide.x && aC.x < uHide.z && aC.y > uHide.y && aC.y < uHide.w) hs = 0.0;
  if (aCov > 0.5 && uHideCov > 0.5) hs = 0.0;
  vec3 p = position;
  p.y = min(p.y * hs, uClip);
  vUV = aUV;
  if (aRoof < 0.5) vUV.y = min(aUV.y * min(hs, 1.0), uClip);
  vB = aB;
  vRoof = aRoof;
  vN = normal;
  vS = s;
  vH = min(aH * min(hs, 1.0), uClip);
  vY = p.y;
  vEdge = aEdge;
#ifdef HERO
  vSpec = aSpec;
  vFace = aFace;
#endif
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const BLDG_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uWallA;
uniform vec3 uWallB;
uniform vec3 uRoofC;
uniform vec3 uGlassLo;
uniform vec3 uGlassHi;
uniform vec3 uLitW;
uniform vec3 uLitC;
uniform vec3 uTint;
uniform float uNight;
uniform float uLights;
uniform float uFull; // offices lit floor after floor, for the vacancy reveal
uniform float uVacancy;
uniform float uLitGain;
uniform float uTintGlow;
uniform float uLed;
uniform vec4 uHL; // hero: part, first floor, last floor, amount
uniform float uBeacon; // towers glow as light needles at city scale
uniform float uFresh; // while the years run, towers that just went up flash
#ifdef TOWERS
varying float vFresh;
#endif
varying vec2 vUV;
varying float vB;
varying float vRoof;
varying vec3 vN;
varying vec4 vS;
varying float vH;
varying float vY;
varying vec2 vEdge;
#ifdef HERO
varying vec3 vSpec;
varying float vFace;
#endif
#include <common>
#include <fog_pars_fragment>

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

// Anti-aliased box: 1 inside the centred share w of a unit cell coordinate f, blurred by the pixel footprint e.
float box(float f, float w, float e) {
  float a = 0.5 - 0.5 * w;
  float b = 0.5 + 0.5 * w;
  return smoothstep(a - e, a + e, f) * (1.0 - smoothstep(b - e, b + e, f));
}

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float sun = clamp(dot(n, uSun), 0.0, 1.0);
  float seed = h21(vec2(vB, 7.3));
  float tall = smoothstep(55.0, 90.0, vH);
  vec3 col;
  float px = fwidth(vUV.y); // metres per pixel on this surface
  if (vRoof > 0.5) {
    col = uRoofC * (0.8 + 0.4 * seed);
    col = mix(col, uTint * 0.75, 0.7 * vS.g);
    float r = h21(floor(vUV / 7.0) + vB);
    col += uLitW * step(0.997, r) * uLights * vS.r * 0.6;
  } else {
    vec3 wall = mix(uWallA, uWallB, sun) * (0.85 + 0.3 * seed);
    // sky light: facades brighten a little with height
    wall *= 0.85 + 0.3 * smoothstep(0.0, 250.0, vUV.y);
#ifdef HERO
    // The folded skin: 1.6 m bays; each fold is part glass, part angled white panel. The glazed share ripples
    // across the facade and up the floors (the "涟漪" the designers describe).
    float roofH = vSpec.x;
    float floors = vSpec.y;
    float crown = vSpec.z;
    float podH = 34.5;
    float fl = vUV.y < podH ? vUV.y / (podH / 6.0) : 6.0 + (vUV.y - podH) / ((roofH - crown - podH) / max(1.0, floors - 6.0));
    vec2 g = vec2(vUV.x / 1.6, fl);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec2 e = clamp(fwidth(g), 0.0005, 0.5);
    float a = sin(cell.x * 0.23 + cell.y * 0.21 + vFace * 1.7);
    float b = sin(cell.x * 0.07 - cell.y * 0.12 + vFace);
    float share = clamp(0.5 + 0.3 * a + 0.12 * b, 0.12, 0.88);
    float win = smoothstep(share + e.x, share - e.x, f.x) * box(f.y, 0.78, e.y);
    float far = clamp(max(e.x, e.y) * 2.2 - 0.6, 0.0, 1.0);
    win = mix(win, share * 0.78, far);
    win *= step(vUV.y, roofH - crown);
    // the panel side of each fold catches light at its own angle
    float panel = mix(0.75 + 0.45 * smoothstep(share, 1.0, f.x), 0.95, far);
    vec3 skin = vec3(0.6, 0.6, 0.58) * (0.35 + 0.75 * sun) * panel * (1.0 - 0.8 * uNight);
    vec3 glass = mix(uGlassLo, uGlassHi, clamp(vUV.y / 220.0, 0.0, 1.0)) * 0.8;
    col = mix(skin, glass, win);
    float r = h31(vec3(floor(cell.x / 4.0), cell.y, vB));
    // a range of floors picked out (rented floors, its own floors): those light up, the rest go quiet
    float inHL = step(abs(vB - uHL.x), 0.5) * step(uHL.y - 1.0, fl) * step(fl, uHL.z) * step(vUV.y, roofH - crown);
    float hlOn = step(-0.5, uHL.x) * uHL.w;
    float litP = uLights * vS.r * 0.45 * (1.0 - 0.6 * hlOn);
    float lit = step(r, litP);
    lit = mix(lit, litP, far);
    lit = max(lit, step(r, 0.92) * vS.g);
    vec3 lc = mix(mix(uLitW, uLitC, 0.4), uTint * 1.3, vS.g);
    col += lc * lit * win * uLitGain * 0.85;
    col += uTint * inHL * hlOn * (0.25 + 1.6 * win);
#else
    // towers: curtain wall (1.5 m mullions, 4 m floors), lights by floor sections; low blocks: punched windows
    float fh = mix(3.0, 4.0, tall);
    float cw = mix(mix(2.6, 3.6, h21(vec2(vB, 1.7))), 1.5, tall);
    vec2 g = vec2(vUV.x / cw, vUV.y / fh);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec2 e = clamp(fwidth(g), 0.0005, 0.5);
    float ww = mix(mix(0.45, 0.7, h21(vec2(vB, 2.9))), 0.9, tall);
    float wh = mix(0.55, 0.78, tall);
    float win = box(f.x, ww, e.x) * box(f.y, wh, e.y);
    float far = clamp(max(e.x, e.y) * 2.2 - 0.6, 0.0, 1.0);
    win = mix(win, ww * wh, far);
    win *= step(4.5, vUV.y) * step(vUV.y, vH - 1.8);
    // a light is a room: towers light a tenant's run of bays along a floor, homes window by window
    float run = mix(1.0, mix(8.0, 22.0, h21(vec2(vB, 5.5))), tall);
    vec3 key = vec3(floor(cell.x / run), cell.y, vB);
    float r = h31(key);
    float litP = uLights * vS.r * (0.08 + 0.42 * seed);
    litP = mix(litP, 0.93, uFull * tall);
    // empty floors go dark in runs of two or three, like whole vacant floors of a tower
    float dark = step(h21(vec2(floor(cell.y / mix(1.0, 2.5, tall)), vB + 3.1)), uVacancy * vS.a);
    float lit = step(r, litP) * (1.0 - dark);
    lit = mix(lit, litP * (1.0 - uVacancy * vS.a), far);
    lit = max(lit, mix(step(r, 0.85), 0.85, far) * vS.g);
    vec3 glass = mix(uGlassLo, uGlassHi, clamp(vUV.y / 260.0, 0.0, 1.0)) * (0.8 + 0.4 * h21(vec2(vB, 4.4)));
    glass *= mix(0.85 + 0.3 * h31(vec3(cell, vB + 2.0)), 1.0, tall);
    col = mix(wall, glass, win);
    float tone = mix(0.6 + 0.6 * h31(key + 9.0), 0.85 + 0.3 * h31(key + 9.0), tall);
    // offices mostly cool white, one colour per building; homes mostly warm
    float cool = mix(step(h31(key + 4.0), 0.12), step(h21(vec2(vB, 4.0)), 0.6), tall);
    vec3 lc = mix(mix(uLitW, uLitC, cool), uTint * 1.25, vS.g);
    col += lc * lit * win * tone * uLitGain * mix(1.0, 0.5, uFull * tall);
    // LED outlines on some towers at night: vertical corners and the roof line
    float ledOn = max(uLed * uNight * step(0.7, h21(vec2(vB, 8.8))) * smoothstep(140.0, 180.0, vH), vS.g * smoothstep(30.0, 70.0, vH));
    if (ledOn > 0.0) {
      float lw = max(0.6, px * 1.2);
      float corner = 1.0 - smoothstep(lw * 0.5, lw, min(vEdge.x, vEdge.y - vEdge.x));
      float top = smoothstep(vH - lw * 1.5, vH - lw * 0.5, vUV.y);
      vec3 ledC = mix(mix(vec3(0.55, 0.85, 1.0), vec3(1.0, 0.85, 0.55), step(0.7, h21(vec2(vB, 6.1)))), uTint * 1.6, vS.g);
      col += ledC * max(corner, top) * ledOn * 1.1;
    }
#endif
  }
  // contact shadow at the foot of every wall
  col *= mix(0.4, 1.0, smoothstep(0.0, 30.0, vY));
  // tinted buildings: a warm wash on the walls (their windows are lit in the tint colour above)
  col += uTint * vS.g * uTintGlow * 0.08;
#ifdef TOWERS
  // city scale: towers read as light needles; the ones just finished flash
  if (vRoof < 0.5) col += mix(uLitW, uLitC, 0.3) * uBeacon * (0.25 + 0.75 * smoothstep(0.0, vH + 1.0, vY));
  col += uTint * vFresh * 1.4 * uFresh;
#endif
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZen;
uniform vec3 uMid;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  float y = vDir.y;
  vec3 c = mix(uHor, uMid, smoothstep(-0.02, 0.14, y));
  c = mix(c, uZen, smoothstep(0.14, 0.65, y));
  vec3 hd = normalize(vec3(vDir.x, 0.0, vDir.z) + 1e-5);
  float g = pow(max(dot(hd, uSunDir), 0.0), 3.0) * exp(-max(y, 0.0) * 9.0);
  c += uGlow * g;
  gl_FragColor = vec4(c, 1.0);
}
`;
