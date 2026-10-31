// Shared GLSL. Every field object is "draped": its vertex shader adds the terrain height at its map position, so
// woods, houses, trenches and vehicles sit on the Copernicus DEM at any vertical exaggeration.

export const DRAPE = /* glsl */ `
uniform sampler2D uDem;
uniform vec4 uDemBox;   // x0, x1, y0, y1 (metres)
uniform float uExag;
float terrainH(vec2 p) {
  vec2 uv = vec2((p.x - uDemBox.x) / (uDemBox.y - uDemBox.x), (uDemBox.w - p.y) / (uDemBox.w - uDemBox.z));
  return texture2D(uDem, uv).r * uExag;
}
vec3 mapToWorld(vec2 p, float up) { return vec3(p.x, terrainH(p) + up, -p.y); }
`;

// Thermal ("white-hot") helpers and the common fog.
export const COMMON = /* glsl */ `
uniform float uThermal;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uCamPos;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
vec3 thermalMix(vec3 col, float heat) { return mix(col, vec3(heat), uThermal); }
vec3 fogIt(vec3 col, vec3 wp) {
  float d = length(wp - uCamPos);
  float f = 1. - exp(-d * uFogDensity);
  return mix(col, mix(uFogColor, vec3(0.16), uThermal), clamp(f, 0., 1.));
}
`;

// Distance from a point to the front polyline (up to 48 points), with the signed side: + north/left of the line
// as drawn west→east.
export const FRONT = /* glsl */ `
uniform vec2 uFront[48];
uniform int uFrontN;
vec2 frontDist(vec2 p) {
  float best = 1e9; float side = 1.;
  for (int i = 0; i < 47; i++) {
    if (i >= uFrontN - 1) break;
    vec2 a = uFront[i], b = uFront[i + 1];
    vec2 ab = b - a; float L2 = max(dot(ab, ab), 1e-3);
    float t = clamp(dot(p - a, ab) / L2, 0., 1.);
    vec2 q = a + ab * t;
    float d = length(p - q);
    if (d < best) { best = d; side = sign(ab.x * (p.y - a.y) - ab.y * (p.x - a.x)); }
  }
  return vec2(best, side);
}
`;
