export const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

/**
 * Fragment shader using emulated double-single precision (ds_add, ds_mul)
 * for deep zoom beyond float32 limits. Smooth coloring via continuous
 * escape time algorithm.
 */
export const FRAGMENT_SRC = `
precision highp float;

uniform vec2 u_resolution;
// Center in double-single: (hi, lo) for real and imaginary
uniform vec2 u_centerRe;
uniform vec2 u_centerIm;
// Zoom: half-height of the view in complex plane (double-single)
uniform vec2 u_scale;
uniform float u_maxIter;
uniform float u_palette;
// Julia mode: if u_juliaMode > 0.5, use u_juliaC as the constant
uniform float u_juliaMode;
uniform vec2 u_juliaC;

/* --- double-single arithmetic (Kahan-style) --- */
vec2 ds_add(vec2 a, vec2 b) {
  float t1 = a.x + b.x;
  float e = t1 - a.x;
  float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
  float hi = t1 + t2;
  float lo = t2 - (hi - t1);
  return vec2(hi, lo);
}

vec2 ds_mul(vec2 a, vec2 b) {
  // Dekker split: retain the rounding residual of the high product.
  float splitA = a.x * 4097.0;
  float ah = splitA - (splitA - a.x);
  float al = a.x - ah;
  float splitB = b.x * 4097.0;
  float bh = splitB - (splitB - b.x);
  float bl = b.x - bh;
  float product = a.x * b.x;
  float error = ((ah * bh - product) + ah * bl + al * bh) + al * bl;
  error += a.x * b.y + a.y * b.x;
  float hi = product + error;
  return vec2(hi, error - (hi - product));
}

vec2 ds_sub(vec2 a, vec2 b) {
  return ds_add(a, vec2(-b.x, -b.y));
}

/* --- color palettes --- */
vec3 ramp(float t, vec3 deep, vec3 mid, vec3 light, vec3 warm) {
  float s = fract(t);
  if (s < 0.28) return mix(deep, mid, smoothstep(0.0, 0.28, s));
  if (s < 0.52) return mix(mid, light, smoothstep(0.28, 0.52, s));
  if (s < 0.72) return mix(light, warm, smoothstep(0.52, 0.72, s));
  return mix(warm, deep, smoothstep(0.72, 1.0, s));
}
vec3 palette0(float t) {
  return ramp(t, vec3(0.008,0.022,0.04), vec3(0.035,0.25,0.32), vec3(0.65,0.9,0.85), vec3(0.84,0.41,0.19));
}
vec3 palette1(float t) {
  return ramp(t, vec3(0.005,0.015,0.04), vec3(0.015,0.18,0.4), vec3(0.4,0.8,0.95), vec3(0.87,0.94,1.0));
}
vec3 palette2(float t) {
  return ramp(t, vec3(0.025,0.005,0.018), vec3(0.4,0.04,0.065), vec3(1.0,0.46,0.15), vec3(1.0,0.88,0.56));
}
vec3 palette3(float t) {
  return ramp(t, vec3(0.018,0.008,0.055), vec3(0.16,0.065,0.35), vec3(0.65,0.38,0.82), vec3(0.45,0.92,0.8));
}

vec3 getColor(float t, float pal) {
  if (pal < 0.5) return palette0(t);
  if (pal < 1.5) return palette1(t);
  if (pal < 2.5) return palette2(t);
  return palette3(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Map pixel to complex plane using double-single
  vec2 px = ds_mul(vec2(uv.x, 0.0), u_scale);
  vec2 py = ds_mul(vec2(uv.y, 0.0), u_scale);
  vec2 cr = ds_add(u_centerRe, px);
  vec2 ci = ds_add(u_centerIm, py);

  // For Julia mode, c is fixed and z starts at pixel
  vec2 zr, zi, cR, cI;
  if (u_juliaMode > 0.5) {
    zr = cr;
    zi = ci;
    cR = vec2(u_juliaC.x, 0.0);
    cI = vec2(u_juliaC.y, 0.0);
  } else {
    zr = vec2(0.0, 0.0);
    zi = vec2(0.0, 0.0);
    cR = cr;
    cI = ci;
  }

  // Analytic interior tests avoid hundreds of iterations in the main bulbs.
  float x = cr.x - 0.25;
  float q = x * x + ci.x * ci.x;
  if (u_juliaMode < 0.5 && (q * (q + x) < 0.25 * ci.x * ci.x - 0.000001 ||
      (cr.x + 1.0) * (cr.x + 1.0) + ci.x * ci.x < 0.062499)) {
    gl_FragColor = vec4(0.005, 0.008, 0.014, 1.0);
    return;
  }
  bool escaped = false;
  float iter = 0.0;
  float zr2, zi2;
  const float BAILOUT = 256.0;

  for (float i = 0.0; i < 1600.0; i += 1.0) {
    if (i >= u_maxIter) break;

    // z = z^2 + c using double-single
    vec2 zr_new = ds_add(ds_sub(ds_mul(zr, zr), ds_mul(zi, zi)), cR);
    vec2 zi_new = ds_add(ds_add(ds_mul(zr, zi), ds_mul(zi, zr)), cI);
    zr = zr_new;
    zi = zi_new;

    zr2 = zr.x * zr.x;
    zi2 = zi.x * zi.x;
    if (zr2 + zi2 > BAILOUT * BAILOUT) {
      // Smooth coloring: continuous escape time
      float log_zn = log(zr2 + zi2) * 0.5;
      float nu = log(log_zn / log(BAILOUT)) / log(2.0);
      escaped = true;
      iter = i + 1.0 - nu;
      break;
    }
    iter = i + 1.0;
  }

  if (!escaped) {
    gl_FragColor = vec4(0.005, 0.008, 0.014, 1.0);
    return;
  }
  // Continuous and periodic: no seam at palette wrap, no fake density AA.
  float t = sqrt(max(iter, 0.0)) * 0.12 + 0.38;
  vec3 col = getColor(t, u_palette);
  col *= 0.16 + 0.84 * smoothstep(5.0, 28.0, iter);

  // Vignette
  vec2 vuv = gl_FragCoord.xy / u_resolution;
  float vig = 1.0 - 0.3 * length((vuv - 0.5) * 1.4);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`
