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
vec3 bokehLayer(vec2 p, float cell, float t, float seed, float rad, float drift){
  p.x += t * drift;
  vec2 g = floor(p / cell); vec2 f = p / cell - g;
  vec3 acc = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o = vec2(float(i), float(j));
    vec2 id = g + o;
    float r0 = h21(id + seed);
    if (r0 > 0.62) continue;
    vec2 c = o + h22(id + seed * 3.1);
    float r = rad * (0.55 + 0.6 * h21(id + seed * 7.7)) / cell;
    float d = length(f - c);
    float disc = smoothstep(r, r * 0.82, d) * (0.82 + 0.25 * smoothstep(r * 0.5, r * 0.95, d));
    float k = h21(id + seed * 9.3);
    vec3 col = k < 0.55 ? vec3(1.0, 0.62, 0.28) : k < 0.75 ? vec3(0.95, 0.92, 0.85) : k < 0.88 ? vec3(1.0, 0.25, 0.18) : vec3(0.35, 0.8, 1.0);
    float tw = 0.75 + 0.25 * sin(t * (0.5 + 2.0 * h21(id + 1.7)) + r0 * 40.0);
    acc += col * disc * tw * (0.35 + 1.2 * h21(id + seed * 5.5));
  }
  return acc;
}
vec3 windowCity(vec2 p, float t, float dawn){
  vec3 sky = mix(vec3(0.010, 0.020, 0.040), vec3(0.04, 0.07, 0.11), smoothstep(1.6, 0.2, p.y));
  sky = mix(sky, vec3(0.20, 0.25, 0.32), dawn);
  vec3 c = sky;
  float hor = smoothstep(1.5, 0.3, p.y);
  c += bokehLayer(p, 0.22, t, 1.0, 0.10, 0.0) * 0.55 * hor;
  c += bokehLayer(p + vec2(3.3, 0.0), 0.13, t, 4.0, 0.055, 0.0) * 0.5 * hor;
  // a street far below: moving tail lights and headlights
  vec2 q = p - vec2(0.0, 0.32);
  float band = exp(-q.y * q.y * 400.0);
  c += bokehLayer(vec2(p.x, p.y * 6.0), 0.18, t, 9.0, 0.06, 0.25) * band * 0.9;
  c += bokehLayer(vec2(p.x + 7.0, p.y * 6.0), 0.2, t, 12.0, 0.06, -0.32) * band * 0.7;
  return c * (1.0 - dawn * 0.6);
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
