/**
 * Thin-film iridescent bubble shaders.
 *
 * Adapted from pompa-iridiscencia (SantiagoGR11 et al.)
 * https://github.com/SantiagoGR11/pompa-iridiscencia
 *
 * Copyright (c) 2026 Santiago García Rodríguez
 * Released under the MIT License (see repository LICENSE).
 *
 * Physical model: Airy multilayer reflectance with Fresnel s/p amplitudes,
 * spectral integration over CIE 1931 CMFs × D65, XYZ→linear RGB→sRGB.
 * Optical quality of the upstream fragment path is preserved intentionally.
 */

export const bubbleVertexShader = /* glsl */ `
precision highp float;

varying vec3 vNormalObj;  // normal in the OBJECT space
varying vec3 vPosObj;     // position in the OBJECT space

void main(){
  vNormalObj = normalize(normal);
  vPosObj    = position;

  // FINAL PROJECTION
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const bubbleFragmentShader = /* glsl */ `
precision highp float;

varying vec3 vNormalObj;
varying vec3 vPosObj;

// ---- Thickness parameters ----
uniform float e0_nm;            // nm
uniform float eavg_nm;          // nm
uniform float alpha;            // drainage (kept for API parity)

// ---- Optics parameters ----
uniform float n1;               // IOR air
uniform float n2;               // IOR film
uniform float n3;               // IOR air

// ---- Spectrum CIE+D65 by texture (81 λ). RGBA = (x̄,ȳ,z̄,E) ----
uniform sampler2D cmfTex;
uniform float wlStart;          // 380
uniform float wlEnd;            // 780
uniform float stepNm;           // 5
uniform float kNorm;            // 1 / sum(E*ybar)*Δλ

// ---- Light parameters ----
uniform vec3 Ldir;
uniform int lightMode;
uniform float lambda0;
uniform float spectralWidth;

// ---- Reflectance parameter ----
uniform bool showTransmission;


// -------------------------- Constant values --------------------------------
const float PI = 3.14159265358979323846;

// -------------------------- Spectral utilities --------------------------

// Performance: 41 samples @ 10 nm (still full visible range). Upstream used 81 @ 5 nm.
// Colour stays physically driven; mobile GPUs no longer thrash on the spectral loop.
const int NS = 41;

vec4 sampleSpectral(int i){
  float u = (float(i) + 0.5) / float(NS);
  return texture2D(cmfTex, vec2(u, 0.5));
}

// -------------------------- Thickness model ------------------------------
float thickness_nm_from_cosphi(float cosPhi){
  cosPhi = clamp(cosPhi, -1.0, 1.0);
  // Upstream model (pompa-iridiscencia): linear gravity drainage from top (e0)
  // toward average (eavg). The alpha uniform is retained for material API parity;
  // Shape of the World drives drainage by setting e0_nm from JS.
  return e0_nm + (eavg_nm - e0_nm) * (1.0 - cosPhi) + (alpha * 0.0);
}

// -------------------------- Fresnel (amplitude) ------------------------------
void fresnel(float ni,float nt,float cosi,
             out float rs,out float rp,out float cost)
{
  float sin2i = max(0.0, 1.0 - cosi*cosi);
  float sin2t = (ni/nt)*(ni/nt)*sin2i;
  if (sin2t > 1.0){
    rs = 1.0; rp = 1.0; cost = 0.0;
    return;
  }
  cost = sqrt(max(0.0, 1.0 - sin2t));
  rs = (ni*cosi - nt*cost) / (ni*cosi + nt*cost);
  rp = (nt*cosi - ni*cost) / (nt*cosi + ni*cost);
}

// -------------------------- XYZ to sRGB --------------------------------------
// XYZ -> LINEAR RGB (no gamma)
vec3 xyz2rgbLinear(vec3 XYZ){
  mat3 M = mat3(
     3.2406, -1.5372, -0.4986,
    -0.9689,  1.8758,  0.0415,
     0.0557, -0.2040,  1.0570
  );
  return max(M * XYZ, vec3(0.0));
}

// LINEAR -> sRGB (gamma)
vec3 linear2srgb(vec3 lin){
  vec3 a = 12.92 * lin;
  vec3 b = 1.055 * pow(max(lin, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), lin));
}

// -------------------------- MAIN -------------------------------------------
void main(){
  vec3 N = normalize(vNormalObj);
  vec3 L = normalize(Ldir);

  float cosInc = clamp(abs(dot(N, L)), 1e-4, 1.0);

  // Local thickness: cosφ ≈ yLocal (sphere with radius 1)
  float cosPhi = clamp(vPosObj.y, -1.0, 1.0);
  float d_nm   = thickness_nm_from_cosphi(cosPhi);
  float d_m    = d_nm * 1e-9;

  // Spectral integration (Airy + Fresnel s/p)
  float X=0.0, Y=0.0, Z=0.0, Rsum=0.0;

  for (int i = 0; i < NS; ++i) {

    float wl_nm = wlStart + float(i) * stepNm;
    float wl_m  = wl_nm * 1e-9;

    float rs12, rp12, cos2;
    float n2_disp = n2 + 0.004 * (550.0 - wl_nm) / 170.0;
    fresnel(n1, n2_disp, cosInc, rs12, rp12, cos2);

    float rs23, rp23, cos3;
    fresnel(n2_disp, n3, cos2, rs23, rp23, cos3);

    float phi = 4.0 * PI * n2_disp * d_m * cos2 / wl_m;
    float c = cos(phi), s = sin(phi);

    float a = rs12, b = rs23;
    float Rs = ((a+b*c)*(a+b*c) + (b*s)*(b*s)) /
                ((1.0+a*b*c)*(1.0+a*b*c) + (a*b*s)*(a*b*s));

    a = rp12; b = rp23;
    float Rp = ((a+b*c)*(a+b*c) + (b*s)*(b*s)) /
                ((1.0+a*b*c)*(1.0+a*b*c) + (a*b*s)*(a*b*s));

    float R = 0.5 * (Rs + Rp);
    Rsum += R;

    vec4 spec = sampleSpectral(i);

    // SPECTRAL WEIGHT: depending on the light mode
    float weight;

    if (lightMode == 0) { // White light: uniform weight as D65
      weight = spec.a;

    } else { // Monochromatic light: a gaussian centered in lambda0
      float d = wl_nm - lambda0;
      weight = exp(-(d*d) / (2.0 * spectralWidth * spectralWidth));

    }

    float I = weight * R;

    X += I * spec.r;
    Y += I * spec.g;
    Z += I * spec.b;
  }


// ------- Photometric normalization and reflected irradiance -------
float scale = kNorm * stepNm;
vec3 XYZ    = vec3(X, Y, Z) * scale;
vec3 rgbLin = xyz2rgbLinear(XYZ);
vec3 rgbRefl = linear2srgb(rgbLin);  // reflexión en sRGB

// ----------- Average local reflectance -----------
float Rmean = Rsum / float(NS);

vec3 rgb = rgbRefl;

// Soft rim lift so the bubble reads on a dark stage even at low R
float rim = pow(1.0 - cosInc, 2.2) * 0.12;
rgb += vec3(rim * 0.55, rim * 0.72, rim * 0.95);

// ---------- Transparence ----------
float alphaOut = showTransmission ? clamp(0.15 + 0.85 * Rmean, 0.15, 1.0) : 0.99;

// ---------- Exit -----------
gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), alphaOut);

}
`
