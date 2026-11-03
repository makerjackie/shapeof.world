// Shared GLSL snippets.
export const NOISE = /* glsl */ `
float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float h31(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), u.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), u.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), u.x), u.y), u.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise3(p); p = p * 2.02 + 11.3; a *= 0.5; } return s; }
`;

// night window seen from the desk: out-of-focus city lights behind rain-streaked glass.
// p: metres on the window plane (x right, y up), t: seconds, blur: extra softness, dawn: 0 night .. 1 rainy morning
export const WINDOW = /* glsl */ `
// one layer of out-of-focus lights: discs of one size (one depth), mostly sodium and warm white, a few cool LEDs,
// rare red/green; a faint bright rim like a real lens, low intensity so overlaps build up instead of saturating
vec3 bokehLayer(vec2 p, float cell, float t, float seed, float rad, float drift, float fill){
  p.x += t * drift;
  vec2 g = floor(p / cell); vec2 f = p / cell - g;
  vec3 acc = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o = vec2(float(i), float(j));
    vec2 id = g + o;
    float r0 = h21(id + seed);
    if (r0 > fill) continue;
    vec2 c = o + h22(id + seed * 3.1);
    float r = rad * (0.85 + 0.3 * h21(id + seed * 7.7)) / cell;
    float d = length(f - c);
    float disc = smoothstep(r, r * 0.9, d) * (0.78 + 0.32 * smoothstep(r * 0.55, r * 0.92, d));
    float k = h21(id + seed * 9.3);
    vec3 col = k < 0.58 ? vec3(1.0, 0.56, 0.22) : k < 0.84 ? vec3(1.0, 0.82, 0.62) : k < 0.95 ? vec3(0.78, 0.86, 1.0) : k < 0.98 ? vec3(1.0, 0.16, 0.08) : vec3(0.3, 1.0, 0.55);
    float tw = 0.85 + 0.15 * sin(t * (0.4 + 1.5 * h21(id + 1.7)) + r0 * 40.0);
    float e = h21(id + seed * 5.5);
    acc += col * disc * tw * (0.12 + 0.75 * e * e);
  }
  return acc;
}
vec3 windowCity(vec2 p, float t, float dawn){
  // the far side of the glass: a dark sky, a band of sodium haze where the city meets it, the city below
  float hy = 0.86 + 0.04 * sin(p.x * 1.3);
  vec3 sky = mix(vec3(0.006, 0.010, 0.020), vec3(0.035, 0.030, 0.034), exp(-max(p.y - hy, 0.0) * 3.0));
  vec3 c = sky;
  float below = smoothstep(hy + 0.05, hy - 0.25, p.y);
  c = mix(c, vec3(0.012, 0.011, 0.014), below);
  // distant lights: small and dense near the horizon, larger and sparser closer (lower in the window)
  float near = smoothstep(hy, 0.0, p.y);
  c += bokehLayer(p, 0.05, t, 1.0, 0.020, 0.0, 0.55) * below * (1.0 - 0.5 * near) * 0.7;
  c += bokehLayer(p + vec2(3.3, 0.0), 0.095, t, 4.0, 0.042, 0.0, 0.4) * below * near * 0.65;
  c += bokehLayer(p + vec2(7.1, 0.0), 0.2, t, 6.0, 0.085, 0.0, 0.22) * below * near * 0.5;
  // a few lit windows and aviation lights of towers above the horizon
  c += bokehLayer(p + vec2(1.7, 0.0), 0.12, t, 8.0, 0.03, 0.0, 0.18) * smoothstep(hy + 0.5, hy, p.y) * (1.0 - below) * 0.35;
  // a street far below: moving tail lights and headlights
  vec2 q = p - vec2(0.0, 0.30);
  float band = exp(-q.y * q.y * 300.0);
  c += bokehLayer(vec2(p.x, p.y * 5.0), 0.12, t, 9.0, 0.045, 0.22, 0.5) * band * 0.6;
  c += bokehLayer(vec2(p.x + 7.0, p.y * 5.0), 0.14, t, 12.0, 0.045, -0.3, 0.5) * band * 0.5;
  c = mix(c, vec3(0.20, 0.25, 0.32) * (0.6 + 0.4 * smoothstep(0.0, 1.5, p.y)), dawn * 0.75);
  return c;
}
// rain on glass: returns (refraction offset xy, droplet mask)
vec3 rain(vec2 p, float t){
  vec3 r = vec3(0.0);
  // static droplets
  vec2 g = floor(p * 38.0); vec2 f = fract(p * 38.0);
  vec2 c = h22(g) * 0.6 + 0.2; float s = h21(g + 4.0);
  float d = length(f - c);
  float m = smoothstep(0.18 * s + 0.05, 0.06 * s, d) * step(0.45, s);
  r.xy += (f - c) * m * 0.03; r.z += m;
  // running streaks
  float col = floor(p.x * 9.0);
  float sp = 0.15 + 0.35 * h11(col * 3.7);
  float yy = fract(p.y * 1.2 + t * sp + h11(col));
  float xx = fract(p.x * 9.0) - 0.5 + 0.08 * sin(p.y * 13.0 + col);
  float head = smoothstep(0.05, 0.0, abs(yy - 0.9)) * smoothstep(0.08, 0.0, abs(xx));
  float trail = smoothstep(0.9, 0.2, yy) * smoothstep(0.9, 0.85, yy) * 0.0 + smoothstep(0.03, 0.0, abs(xx)) * smoothstep(0.0, 0.9, yy) * step(yy, 0.9) * 0.35;
  float on = step(0.55, h11(col * 9.1));
  r.xy += vec2(xx * 0.05, 0.02) * (head + trail) * on; r.z += (head + trail) * on;
  return r;
}
`;
