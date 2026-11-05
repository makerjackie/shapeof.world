// The open ocean, drawn at kilometre scale. Lives inside WATER_FS (passes-env.js), which
// provides tColor, tRefl, uDeep, uShallow..., ripples() and glintLayer().
// Swell is shaded, not displaced: five hard painted tones, drawn whitecaps at three
// scales, foam streaks along the wind, hard cloud shadows, sun glitter, surf on any seabed.
export const OCEAN_GLSL = /* glsl */ `
const vec2 WIND = vec2(0.78, 0.625);
// one peaked swell train; crests wander so it never reads as parallel stripes
float swellTrain(vec2 q, vec2 dir, float lam, float spd, float sharp, float ph){
  float k = 6.2831853 / lam;
  vec2 s = vec2(-dir.y, dir.x);
  float a = dot(q, dir) * k + ph + uFxTime * spd + 1.5 * sin(dot(q, s) * k * 0.27 + ph * 3.1) + 0.8 * sin(dot(q, s) * k * 0.61 - ph);
  return pow(0.5 + 0.5 * sin(a), sharp);
}
// height of the sea in metres; octaves below the pixel footprint fade away
float seaH(vec2 q, float foot){
  float S = uOceanScale;
  q /= S;
  foot = max(foot / S, 0.01);
  vec2 w = vec2(vnoise(q * 0.0027 + 5.0), vnoise(q * 0.0027 + 13.0)) - 0.5;
  q += w * 260.0;
  float h = 0.0;
  float calm = 1.0 - 0.8 * uSeaCalm;
  h += swellTrain(q, vec2(0.78, 0.625), 520.0, 0.42, 1.6, 0.0) * 7.0 * smoothstep(3.0, 12.0, 520.0 / foot);
  h += swellTrain(q, vec2(0.96, 0.28), 230.0, 0.66, 2.0, 1.7) * 3.4 * smoothstep(3.0, 12.0, 230.0 / foot);
  h += swellTrain(q, vec2(0.45, 0.89), 96.0, 1.05, 2.2, 4.1) * 1.5 * smoothstep(3.0, 12.0, 96.0 / foot);
  h += swellTrain(q, vec2(0.88, -0.47), 39.0, 1.7, 2.2, 2.3) * 0.62 * smoothstep(3.0, 12.0, 39.0 / foot);
  h += swellTrain(q, vec2(0.2, 0.98), 15.0, 2.7, 2.0, 5.9) * 0.24 * smoothstep(3.0, 12.0, 15.0 / foot);
  h += swellTrain(q, vec2(0.99, -0.1), 6.0, 4.1, 2.0, 0.9) * 0.1 * smoothstep(3.0, 12.0, 6.0 / foot);
  return h * calm * S;
}
// a layer of drawn whitecaps: crescents across the wind that bloom, tear and fade on threes
float capLayer(vec2 q, float cs, float seed, float foot, float dens, out float shade){
  vec2 p = vec2(dot(q, WIND), dot(q, vec2(-WIND.y, WIND.x)));
  p.y *= 0.42;
  vec2 ci = floor(p / cs);
  float m = 0.0; shade = 0.0;
  float aa = foot * 1.2;
  for(int j = -1; j <= 1; j++) for(int i = -1; i <= 1; i++){
    vec2 c = ci + vec2(float(i), float(j));
    if(hash12(c * 1.37 + seed) > dens) continue;
    float per = 3.0 + 3.5 * hash12(c + seed + 2.7);
    float tt = uEnvTime / per + hash12(c + seed + 5.1);
    float cyc = floor(tt), age = tt - cyc;
    vec2 h = hash22(c + cyc * 7.3 + seed);
    vec2 ctr = (c + 0.2 + 0.6 * h) * cs;
    vec2 rel = p - ctr;
    rel.x -= age * cs * 0.3;
    float L = cs * (0.14 + 0.24 * h.x), W = cs * (0.035 + 0.04 * h.y);
    float y = rel.y / L;
    float x = (rel.x + y * y * W * 1.5) / W;
    float grow = smoothstep(0.0, 0.22, age) * (1.0 - smoothstep(0.5, 1.0, age));
    float e = 1.0 - (x * x * 0.8 + y * y * y * y);
    if(e < -6.0) continue;
    vec2 nq = rel / cs * 9.0 + cyc * 3.1;
    float n = vnoise(nq) * 0.7 + vnoise(nq * 2.7) * 0.3;
    float k = e * grow * 1.3 - 0.78 * n;
    // torn foam tail blown upwind of the leading crest
    float tailX = -(rel.x + y * y * W * 1.5) / (W * 3.4);
    float tail = step(0.0, tailX) * (1.0 - smoothstep(0.1, 1.2, tailX)) * max(1.0 - abs(y), 0.0) * grow;
    float tk = tail * 0.9 - 0.62 * vnoise(nq * vec2(0.55, 1.8));
    float a = max(smoothstep(0.0, max(0.03, aa / W * 0.2), k), step(0.0, tk) * 0.75);
    // a dust of bubbles round each cap
    float dust = step(0.74, vnoise(rel / cs * 60.0 + cyc)) * smoothstep(-3.0, 0.2, e) * grow * 0.8;
    m = max(m, max(a, dust * step(foot * 3.0, W)));
    shade = max(shade, smoothstep(-0.04, 0.1, k) * step(0.0, x));
  }
  return m;
}
// ship wakes: churned white centre, thin Kelvin arms, bow wave
void wakes(vec2 q, float foot, inout float foam, inout float pale){
  for(int i = 0; i < 8; i++){
    vec4 W = uShipWake[i];
    if(W.w <= 0.0) continue;
    vec2 f = vec2(sin(W.z), cos(W.z));
    vec2 rel = q - W.xy;
    float ahead = dot(rel, f), side = dot(rel, vec2(f.y, -f.x)), s = abs(side);
    float L = W.w;
    float beh = 165.0 - ahead;                    // metres behind the bow
    if(beh < -40.0 || beh > L + 300.0 || s > 90.0 + beh * 0.4) continue;
    float life = 1.0 - beh / (L + 200.0);
    // turbulent centre, from the stern aft
    float aft = beh - 300.0;
    float hw = 15.0 + 0.05 * max(aft, 0.0);
    vec2 nq = vec2(side * 0.05, aft * 0.012) + vec2(0.0, -uFxTime * 0.3);
    float n = vnoise(nq) * 0.6 + vnoise(nq * 3.1) * 0.4;
    // combed strands of foam with the water showing between them
    float strand = vnoise(vec2(side * 0.13, aft * 0.016 - uFxTime * 0.1));
    float core = (1.0 - smoothstep(hw * 0.25, hw * 1.15, s + (n - 0.5) * hw * 0.9)) * smoothstep(-40.0, 0.0, aft) * life;
    foam = max(foam, step(0.5 + 0.3 * (1.0 - life), core * (0.1 + 0.8 * n + 0.75 * strand)));
    pale = max(pale, core * 0.62);
    // Kelvin arms from the bow
    float arm = abs(s - (0.36 * max(beh, 0.0) + 8.0));
    float wd = 2.5 + 0.012 * beh + foot * 0.8;
    float brk = vnoise(vec2(beh * 0.03, float(i) * 3.0 + step(0.0, side) * 7.0 - uFxTime * 0.15));
    float am = (1.0 - smoothstep(wd * 0.5, wd, arm)) * smoothstep(L * 0.75, 0.0, beh) * smoothstep(-12.0, 16.0, beh);
    foam = max(foam, step(0.45, am * (0.3 + brk)));
    pale = max(pale, (1.0 - smoothstep(wd, wd * 6.0, arm)) * smoothstep(L * 0.9, 0.0, beh) * 0.28);
  }
}
vec3 oceanColor(vec2 q, float foot, float t, vec3 wdir, vec3 vdir, vec4 d, vec3 colIn, vec2 dqx, vec2 dqy, float pxS){
  float S = uOceanScale;
  float cosv = -vdir.z;
  float sceneVD = d.b;
  bool solid = sceneVD < 8000.0;
  // ---- the surface
  float e = max(foot * 1.3, 0.35);
  float h0 = seaH(q, foot);
  float hx = seaH(q + vec2(e, 0.0), foot), hz = seaH(q + vec2(0.0, e), foot);
  vec2 slope = vec2(hx - h0, hz - h0) / e;
  float rf = 0.0, rfx, rfz;
  float r0 = ripples(q, rf);
  slope += vec2(ripples(q + vec2(e, 0.0), rfx) - r0, ripples(q + vec2(0.0, e), rfz) - r0) / e;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 nD = normalize(vec3(-slope.x * 1.6, 1.0, -slope.y * 1.6));

  // ---- painted body colour: big patches of cobalt and turquoise, wave faces in hard tones
  vec2 fw = normalize(wdir.xz + 1e-5);
  float face = dot(slope, fw);                       // + on the slope turned away from us
  float sunS = dot(n, normalize(uSunDir + vec3(0.0, 0.35, 0.0))) - 0.9;
  float big = fbm2(q / S * 0.00042 + vec2(3.1, 7.7));
  float mid = fbm2(q / S * 0.0021 + vec2(uFxTime * 0.004, 1.7));
  float tone = 0.40 + face * 2.1 + sunS * 1.6 + (big - 0.5) * 0.9 + (mid - 0.5) * 0.35;
  float wob = (vnoise(q / S * 0.012) - 0.5) * 0.09 + (vnoise(q / S * 0.05) - 0.5) * 0.05;
  float tq = clamp(tone + wob, 0.0, 1.0);
  // five painted tones from deep ultramarine to pale lagoon, each edge crisp
  vec3 c0 = mix(uDeep, vec3(0.02, 0.10, 0.42), 0.55);
  vec3 c1 = uDeep;
  vec3 c2 = mix(uDeep, uShallow, 0.42);
  vec3 c3 = mix(uDeep, uShallow, 0.82);
  vec3 c4 = mix(uShallow, vec3(0.86, 1.0, 0.98), 0.45);
  float ef = 0.012;
  vec3 body = c0;
  body = mix(body, c1, smoothstep(0.26 - ef, 0.26 + ef, tq));
  body = mix(body, c2, smoothstep(0.47 - ef, 0.47 + ef, tq));
  body = mix(body, c3, smoothstep(0.64 - ef, 0.64 + ef, tq));
  body = mix(body, c4, smoothstep(0.83 - ef, 0.83 + ef, tq));
  // once the waves are sub-pixel the tones melt into a calm gradient
  float farK = smoothstep(14.0, 60.0, foot / S);
  vec3 farBody = mix(uDeep, mix(uDeep, uShallow, 0.6), clamp((big - 0.32) * 2.6, 0.0, 1.0));
  body = mix(body, farBody, farK * 0.75);

  // ---- towering clouds drop hard-edged shadows far out on the sea
  float cloudS = fbm2(q / S * 0.00026 + vec2(uTime * 0.0012, 4.0));
  float csh = smoothstep(0.545, 0.56, cloudS) * (1.0 - farK * 0.4);
  body = mix(body, body * vec3(0.62, 0.68, 0.92), csh * 0.55);

  // ---- what lies under the surface: the seabed by the shore, whales and shadows out at sea
  float sceneT = sceneVD / max(cosv, 1e-4);
  vec3 Ps = uCamPos + wdir * sceneT;
  float bed = solid ? max(uWaterLevel - Ps.y, 0.0) : 1e4;
  float under = solid ? max(sceneT - t, 0.0) : 1e4;
  if(solid && bed > 0.0){
    float cosI = clamp(-wdir.y, 0.0, 1.0);
    float sinR = sqrt(max(1.0 - cosI * cosI, 0.0)) / 1.333;
    float cosR = sqrt(max(1.0 - sinR * sinR, 0.0));
    float path = min(bed / max(cosR, 0.3), under);
    float ab = 1.0 - exp(-path * 0.03);
    vec2 ouv = vUv + n.xz * 0.006 * smoothstep(0.0, 3.0, under);
    vec3 below = texture(tColor, ouv).rgb;
    vec3 tinted = mix(below * vec3(0.72, 0.98, 0.96), uShallow, 0.34);
    body = mix(tinted, body, ab);
  }
  // a colossal dark shape gliding under the sea (s14)
  if(uSeaShadow.w > 0.0){
    vec2 f = vec2(sin(uSeaShadow.z), cos(uSeaShadow.z));
    vec2 rel = q - uSeaShadow.xy;
    float a = dot(rel, f) / uSeaShadowB.x, b = dot(rel, vec2(f.y, -f.x)) / uSeaShadowB.y;
    float wn = fbm2(q * 0.004) - 0.5;
    float wide = mix(1.0, 0.3, smoothstep(0.1, -1.0, a)) * mix(1.0, 0.7, smoothstep(0.3, 1.0, a));
    float dd = a * a + (b / wide) * (b / wide) + wn * 0.5;
    float sm = 1.0 - smoothstep(0.72, 1.0, dd);
    body = mix(body, mix(c0, vec3(0.01, 0.06, 0.26), 0.6), sm * uSeaShadow.w);
  }

  // ---- reflection: sky and whatever stands on the water, smeared like wet gouache
  vec4 rc = uReflMat * vec4(uCamPos + wdir * t, 1.0);
  vec2 ruv = rc.xy / rc.w + n.xz * vec2(0.04, 0.07);
  vec3 refl = vec3(0.0); float wsum = 0.0;
  for(int i = -2; i <= 2; i++){
    float w = 1.0 - abs(float(i)) / 3.0;
    refl += texture(tRefl, ruv + vec2(0.0, float(i) * 0.006)).rgb * w; wsum += w;
  }
  refl /= wsum;
  refl = mix(refl, uSkyRefl, 0.62);
  float ndv = max(dot(-wdir, nD), 0.0);
  float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
  vec3 wc = mix(body, refl, clamp(fres * 0.68, 0.0, 0.66));

  // ---- foam streaks combed along the wind
  vec2 wq = vec2(dot(q, WIND), dot(q, vec2(-WIND.y, WIND.x))) / S;
  wq += (vec2(vnoise(wq * 0.004 + 3.0), vnoise(wq * 0.004 + 8.0)) - 0.5) * 420.0;
  wq += (vec2(vnoise(wq * 0.03 + 3.0), vnoise(wq * 0.03 + 8.0)) - 0.5) * 34.0;
  float st1 = vnoise(vec2(wq.x * 0.006, wq.y * 0.075) + vec2(-uFxTime * 0.02, 3.0));
  float st2 = vnoise(vec2(wq.x * 0.018, wq.y * 0.22) + vec2(-uFxTime * 0.05, 9.0));
  float gust = smoothstep(0.42, 0.62, fbm2(wq * 0.0013 + 2.0));
  float streak = smoothstep(0.70, 0.73, st1 * 0.65 + st2 * 0.42) * gust * smoothstep(30.0, 6.0, foot / S);
  wc = mix(wc, mix(c3, vec3(1.0), 0.5), streak * 0.3);

  // ---- whitecaps at three scales; only cells that span pixels are drawn
  float foam = 0.0, shC = 0.0, sh = 0.0;
  float gustW = 0.45 + 1.1 * smoothstep(0.3, 0.7, mid);
  float l3 = smoothstep(26.0, 7.0, foot / S);
  if(l3 > 0.0){ float m = capLayer(q / S, 46.0, 3.0, foot / S, 0.46 * gustW, sh); foam = max(foam, m * l3); shC = max(shC, sh * l3); }
  float l2 = smoothstep(9.0, 2.2, foot / S);
  if(l2 > 0.0){ float m = capLayer(q / S + 31.7, 15.0, 11.0, foot / S, 0.30 * gustW, sh); foam = max(foam, m * l2); shC = max(shC, sh * l2); }
  float l1 = smoothstep(90.0, 22.0, foot / S) * smoothstep(0.6, 2.4, foot / S);
  if(l1 > 0.0){ float m = capLayer(q / S + 11.3, 170.0, 23.0, foot / S, 0.55 * gustW, sh); foam = max(foam, m * l1); shC = max(shC, sh * l1); }
  foam *= 1.0 - 0.75 * uSeaCalm;

  // ---- wakes, FX ripples and the robot's wake
  float pale = 0.0;
  wakes(q, foot, foam, pale);
  foam = max(foam, rf);
  if(uWake.w > 0.0){
    vec2 f = vec2(sin(uWake.z), cos(uWake.z));
    vec2 rel = q - uWake.xy;
    float behind = -dot(rel, f);
    float side = abs(dot(rel, vec2(f.y, -f.x)));
    if(behind > -2.0 && behind < uWake2.x){
      float churn = smoothstep(uWake2.y, uWake2.y * 0.3, side) * smoothstep(uWake2.x * 0.6, 0.0, behind) * smoothstep(-2.0, 1.0, behind);
      float cn = vnoise(rel * 0.14 + uFxTime * 0.6);
      foam = max(foam, step(0.62, churn * (0.6 + 0.8 * cn)) * uWake.w);
    }
  }

  // ---- the shore: lagoon colour, surf rows racing in, a swash line on the sand
  if(solid && bed > 0.0 && bed < 60.0){
    float wn = vnoise(q * 0.011) * 0.6 + vnoise(q * 0.043) * 0.4;
    float ph = bed * 0.115 + uEnvTime * 0.34 + wn * 2.2;
    float row = fract(ph);
    float cell = floor(ph);
    float brk = vnoise(vec2(dot(q, vec2(0.6, 0.8)) * 0.018, cell * 3.7));
    float band = (1.0 - smoothstep(0.03, 0.2 + wn * 0.18, abs(row - 0.5)));
    float lace = vnoise(q * 0.11 + cell) * 0.6 + vnoise(q * 0.31) * 0.4;
    float surf = step(0.42, band * (0.42 + 0.9 * lace) * (0.35 + 1.1 * brk)) * smoothstep(26.0, 11.0, bed);
    foam = max(foam, surf);
    pale = max(pale, band * 0.55 * smoothstep(34.0, 8.0, bed));
    float sw = bed - 0.5 - 0.7 * sin(uEnvTime * 0.9 + wn * 5.0);
    float swash = 1.0 - smoothstep(0.0, 1.0 + foot * 1.5, sw);
    foam = max(foam, step(0.4, swash * (0.45 + 0.9 * lace)));
    pale = max(pale, smoothstep(5.0, 0.0, bed) * 0.6);
  }
  // contact foam where hulls and rocks pierce the surface
  float contact = solid ? smoothstep(2.6 + foot * 2.0, 0.3, under) : 0.0;
  foam = max(foam, step(0.5, contact * (0.55 + 0.8 * vnoise(q * 0.5 + uFxTime * 0.8))));

  wc = mix(wc, mix(wc, vec3(0.86, 0.97, 1.0), 0.75), clamp(pale, 0.0, 1.0) * 0.6);

  // ---- sun on the water: broad sheen, then separate drawn glints that survive distance
  vec3 rd = reflect(wdir, nD);
  float sd = max(dot(rd, uSunDir), 0.0);
  float glowK = uSunStrength * (1.0 - 0.6 * uVeil);
  wc += uSunColor * (pow(sd, 90.0) * 0.20 + pow(sd, 14.0) * 0.06) * glowK;
  mat2 J = mat2(dqx, dqy);
  float det = J[0][0] * J[1][1] - J[1][0] * J[0][1];
  float glit = 0.0;
  if(abs(det) > 1e-12 && glowK > 0.02 && foot < 400.0){
    mat2 Ji = inverse(J);
    float l = log2(max(foot, 0.02) * 5.0);
    float c0s = pow(2.0, floor(l)), fr = fract(l);
    glit = max(glit, glintLayer(q, Ji, c0s, 17.0 + floor(l), nD, wdir, pxS) * (1.0 - fr));
    glit = max(glit, glintLayer(q + 3.7, Ji, c0s * 2.0, 18.0 + floor(l), nD, wdir, pxS) * fr);
  }
  wc += uSunColor * glit * 1.4 * glowK;

  // ---- foam on top: lit white with a lavender cel shadow on the lee side
  vec3 foamLit = uFoam * mix(vec3(1.0), uSunColor, 0.35 * uSunStrength);
  vec3 foamShade = mix(uFoam, vec3(0.62, 0.74, 0.95), 0.75);
  vec3 fc = mix(foamLit, foamShade, clamp(shC, 0.0, 1.0) * 0.65);
  wc = mix(wc, fc, clamp(foam, 0.0, 1.0) * 0.96);
  return wc;
}
`;
