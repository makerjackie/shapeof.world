// Rain on 林工's window, as a screen-space glass pass in the overlay scene (after the atmosphere, before bloom).
// Each pixel's view ray is intersected with the window plane; where the scene lies behind the glass, the pass draws
// the glass: condensation haze (a depth-aware bokeh blur of the night city from engine.rtA), static beads, running
// drops that stick and slip and leave cleared trails with beads in them, all refracting (inverting) the city lights,
// drawn cel-style with a bright crescent, a specular dot and a thin dark rim. Rain falls beyond the glass.
// The same pass draws the s12 CCTV look: barrel distortion, black fisheye corners, desaturated low-light video.
import * as THREE from 'three';
import { ROOM, rw, rwDir, s12Zoom, S12_ZOOM_CENTRE } from './room-layout.js';

const VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FS = /* glsl */ `
uniform sampler2D tScene, uSceneData;
uniform vec2 uRes;
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCamPos, uGO, uGU, uGV, uGN;
uniform vec2 uGSize;
uniform float uTime, uGlass, uCCTV, uHaze, uFogDensity, uBlur, uDropK, uFall, uDropScale, uZoom, uHunt, uBokeh;
uniform vec2 uZoomOut;
uniform vec3 uFogCool, uFogWarm, uTint, uWash;
uniform float uWashK;
varying vec2 vUv;
out vec4 oColor;

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h12(i), h12(i+vec2(1,0)), u.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), u.x), u.y); }

// ---- drops in glass space (metres). Each returns (lens normal xy in -1..1, coverage, radial distance 0..1)
vec4 beads(vec2 p, float cell, float seed, float dens){
  vec2 g = p / cell; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float r = mix(0.1, 0.3, h12(id + seed * 3.7));
  vec2 c = (h22(id + seed) - 0.5) * (1.0 - 2.0 * r - 0.04);
  float on = step(1.0 - dens, h12(id + seed * 9.1));
  vec2 d = (f - c);
  d.y *= d.y < 0.0 ? 0.88 : 1.1;                       // heavier at the bottom
  float ang = atan(d.y, d.x);
  float wob = 1.0 + 0.1 * sin(ang * 3.0 + seed * 7.0 + h12(id) * 6.3) + 0.05 * sin(ang * 5.0 + h12(id + 3.1) * 6.3);
  float dist = length(d) / (r * wob);
  return vec4(d / r, on * step(dist, 1.0), dist);
}
// running drops: one per column, sliding down with stick-slip; out: trail wetness 0..1, trail beads
vec4 runner(vec2 p, float t, float cw, float seed, out float trail){
  trail = 0.0;
  float col = floor(p.x / cw);
  float rc = h11(col * 7.31 + seed);
  float speed = mix(0.035, 0.11, h11(col * 3.17 + seed * 1.3));
  float H = uGSize.y / uDropScale + 0.6;
  float ph = t * speed + rc * 13.0;
  // stick-slip: the drop pauses, then lurches
  float cyc = 0.09;
  float k = fract(ph / cyc);
  float prog = (floor(ph / cyc) + smoothstep(0.55, 1.0, k)) * cyc;
  float yd = uGSize.y / uDropScale + 0.3 - mod(prog * 1.0, H);
  float wig = sin(p.y * 31.0 + rc * 40.0) * 0.003 + sin(p.y * 83.0 + rc * 9.0) * 0.001;
  float x0 = (col + 0.5 + (rc - 0.5) * 0.45) * cw;
  float dx = p.x - (x0 + wig);
  float r = mix(0.0055, 0.0095, h11(col * 5.9 + seed * 2.1));
  vec2 d = vec2(dx, (p.y - yd) * (p.y < yd ? 0.86 : 1.25)) / r;   // fatter at the bottom, a tail on top
  float dist = length(d);
  float m = step(dist, 1.0);
  float exists = step(0.25, h11(col * 1.77 + seed * 4.3));
  // trail: a thin wet streak above the drop with little beads left behind
  float above = p.y - yd;
  float tl = mix(0.18, 0.5, h11(col * 2.3 + seed));
  float inT = step(0.0, above) * (1.0 - smoothstep(tl * 0.5, tl, above)) * (1.0 - smoothstep(r * 0.3, r * 0.55, abs(dx)));
  trail = inT * exists;
  float by = above / 0.016; float bi = floor(by); float bf = fract(by) - 0.5;
  float br = r * mix(0.18, 0.32, h11(bi + col * 11.0)) * (1.0 - smoothstep(0.0, tl, above));
  vec2 bd = vec2(dx - (h11(bi * 3.3 + col) - 0.5) * r * 0.5, bf * 0.016) / max(br, 1e-4);
  float bdist = length(bd);
  float bm = step(bdist, 1.0) * step(0.0, above) * step(above, tl) * step(0.4, h11(bi * 1.7 + col * 5.0));
  if(bm * exists > 0.5 && m < 0.5) return vec4(bd, 1.0, bdist);
  return vec4(d, m * exists, dist);
}

vec3 sceneAt(vec2 uv){ return texture(tScene, uv).rgb; }
float depthAt(vec2 uv){ return texture(uSceneData, uv).b; }

// depth-aware disc blur: only samples behind the glass contribute (no bleeding of the man / frame into the window)
vec3 blurBehind(vec2 uv, float radPx, float gd){
  vec2 px = 1.0 / uRes;
  vec3 acc = vec3(0.0); float w = 0.0;
  float jit = h12(floor(gl_FragCoord.xy)) * 6.2831853;
  float jr = h12(floor(gl_FragCoord.xy) + 17.0);
  for(int i = 0; i < 40; i++){
    float fi = float(i);
    float a = fi * 2.39996323 + jit;
    float rr = sqrt((fi + jr) / 40.0) * radPx;
    vec2 q = uv + vec2(cos(a), sin(a)) * rr * px;
    float dq = depthAt(q);
    float ok = step(gd + 0.05, dq);
    vec3 c = sceneAt(q);
    float lum = dot(c, vec3(0.3, 0.6, 0.1));
    float ww = ok * (1.0 + uBokeh * smoothstep(0.35, 1.2, lum));   // bright lights spread into bokeh discs
    acc += c * ww; w += ww;
  }
  return w > 0.0 ? acc / w : sceneAt(uv);
}

void main(){
  vec2 uv = vUv;
  float S = uRes.x / 1080.0;
  // ---------------------------------------------------------------- CCTV (s12)
  if(uCCTV > 0.5){
    float asp = uRes.x / uRes.y;
    vec2 c = (uv - 0.5) * vec2(asp, 1.0);
    float r2 = dot(c, c);
    vec2 src = 0.5 + c * (1.0 + 0.55 * r2 + 0.3 * r2 * r2) * 0.86 / vec2(asp, 1.0);
    float inside = step(0.0, src.x) * step(src.x, 1.0) * step(0.0, src.y) * step(src.y, 1.0);
    // digital push-in on the subject (the UI's recognition box), through the same lens
    vec2 co = (uZoomOut - 0.5) * vec2(asp, 1.0);
    float ro = dot(co, co);
    vec2 zc = 0.5 + co * (1.0 + 0.55 * ro + 0.3 * ro * ro) * 0.86 / vec2(asp, 1.0);
    vec2 sz = zc + (src - zc) / uZoom;
    vec3 col = vec3(0.0);
    // autofocus hunting: a brief soft blur
    if(uHunt > 0.01){
      for(int i = 0; i < 8; i++){ float a = float(i) * 0.785398; col += sceneAt(sz + vec2(cos(a), sin(a)) * uHunt * S / uRes); }
      col /= 8.0;
    } else col = sceneAt(sz);
    // slight lens smear and chroma fringe toward the rim
    vec2 ca = (src - 0.5) * 0.004;
    col = vec3(mix(col.r, sceneAt(sz + ca).r, 0.6), col.g, mix(col.b, sceneAt(sz - ca).b, 0.6));
    float l = dot(col, vec3(0.3, 0.59, 0.11));
    vec3 g = mix(vec3(l), col, 0.22) * uTint;
    g = (g - 0.03) * 1.18;
    float scan = 0.96 + 0.04 * sin(gl_FragCoord.y / S * 1.6);
    float vig = 1.0 - smoothstep(0.55, 0.98, length(c) * 1.05);
    float corner = smoothstep(1.02, 0.96, length((src - 0.5) * 2.0 * vec2(0.88, 1.0)) * 0.78) * inside;
    oColor = vec4(g * scan * mix(0.55, 1.0, vig) * corner, 1.0);
    return;
  }
  if(uGlass < 0.5){ discard; }
  // ---------------------------------------------------------------- the window glass
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 vp = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = normalize(vp.xyz / vp.w);
  vec3 D = normalize(mat3(uCamWorld) * vdir);
  float den = dot(D, uGN);
  if(abs(den) < 1e-4) discard;
  float tg = dot(uGO - uCamPos, uGN) / den;
  if(tg <= 0.0) discard;
  vec3 P = uCamPos + D * tg;
  vec2 gp = vec2(dot(P - uGO, uGU), dot(P - uGO, uGV));
  if(gp.x < 0.0 || gp.y < 0.0 || gp.x > uGSize.x || gp.y > uGSize.y) discard;
  float gd = tg * (-vdir.z);                       // view depth of the glass here
  float sd = depthAt(uv);
  if(sd < gd + 0.03) discard;                       // something in front of the glass (frame, him, the desk)
  float t = uTime;

  // drops: running drops on top of two bead layers
  float trA, trB;
  vec2 gq = gp / uDropScale;
  vec4 dr = runner(gq, t / uDropScale, 0.075, 1.0, trA);
  vec4 dr2 = runner(gq + vec2(0.031, 0.0), t * 0.8 / uDropScale, 0.11, 7.0, trB);
  float trail = max(trA, trB);
  vec4 b1 = beads(gq, 0.016, 3.0, 0.5 * (1.0 - trail));
  vec4 b2 = beads(gq + 0.37, 0.034, 5.0, 0.4 * (1.0 - trail));
  vec4 b3 = beads(gq + 1.3, 0.0085, 9.0, 0.42 * (1.0 - trail));
  vec4 drop = dr.z > 0.5 ? dr : (dr2.z > 0.5 ? dr2 : (b2.z > 0.5 ? b2 : (b1.z > 0.5 ? b1 : b3)));
  float isRun = dr.z > 0.5 || dr2.z > 0.5 ? 1.0 : 0.0;
  float m = drop.z;
  vec2 n = drop.xy;
  float dist = drop.w;

  // background: hazy condensation, cleared along the trails
  float haze = uHaze * (1.0 - 0.85 * trail);
  vec3 bg = blurBehind(uv, uBlur * S * (0.55 + 0.45 * (1.0 - trail)), gd);
  // my own fog over the city (the scene texture is pre-atmosphere)
  float dist3 = sd / max(-vdir.z, 0.05);
  float sky = step(8000.0, sd);
  float fog = (1.0 - exp(-dist3 * uFogDensity)) * (1.0 - sky);
  vec3 fogC = mix(uFogCool, uFogWarm, 0.3);
  bg = mix(bg, fogC, fog * 0.9);
  // falling rain beyond the glass (thin slanted streaks lit by the city)
  vec2 fc = gl_FragCoord.xy / S;
  float fall = 0.0;
  for(int L = 0; L < 3; L++){
    float fl = float(L);
    float sc = 1.0 + fl * 0.7;
    vec2 q = vec2(fc.x * 0.085 * sc + fc.y * 0.012 * sc, fc.y * 0.0042 * sc + t * (2.6 + fl * 0.9));
    float id = floor(q.x);
    float fx = fract(q.x);
    float on = step(0.86, h11(id * 1.37 + floor(q.y + h11(id) * 7.0) * 0.71 + fl * 17.0));
    float seg = smoothstep(0.0, 0.25, fract(q.y + h11(id) * 7.0)) * (1.0 - smoothstep(0.35, 0.6, fract(q.y + h11(id) * 7.0)));
    fall += on * seg * (1.0 - smoothstep(0.0, 0.07 / sc, abs(fx - 0.5))) * (0.5 - fl * 0.12);
  }
  float bgl = dot(bg, vec3(0.3, 0.6, 0.1));
  bg += vec3(0.62, 0.7, 0.95) * fall * uFall * (0.05 + 0.5 * bgl) * step(30.0, sd);

  vec3 col = mix(bg, bg * 0.78 + fogC * 0.28 + vec3(0.016, 0.018, 0.034), haze);

  // inside a drop: the world refracted and inverted, sharper than the haze
  if(m > 0.5){
    float h = sqrt(max(0.0, 1.0 - dist * dist));
    vec2 off = -n * (isRun > 0.5 ? 46.0 : 26.0) * S * uDropK * (0.35 + 0.65 * h);
    vec2 ruv = clamp(uv + off / uRes, 0.001, 0.999);
    vec3 rc = depthAt(ruv) > gd + 0.05 ? blurBehind(ruv, 2.0 * S, gd) : bg;
    float rf = (1.0 - exp(-(depthAt(ruv) / max(-vdir.z, 0.05)) * uFogDensity)) * step(depthAt(ruv), 8000.0);
    rc = mix(rc, fogC, rf * 0.7);
    vec3 dc = rc * 1.22 + 0.012;
    // cel shading of the drop: a thin meniscus ring (darker underneath), a bright crescent inside the top edge,
    // and a specular dot on the bigger drops
    float ring = smoothstep(0.82, 0.93, dist);
    dc = mix(dc, dc * 0.5 + vec3(0.006, 0.008, 0.02), ring * (0.35 + 0.45 * smoothstep(0.1, -0.7, n.y)));
    float cres = smoothstep(0.6, 0.76, dist) * (1.0 - smoothstep(0.82, 0.9, dist)) * smoothstep(0.45, 0.9, dot(normalize(n + 1e-4), normalize(vec2(-0.35, 0.94))));
    dc = mix(dc, vec3(0.8, 0.86, 1.0) * (0.3 + 1.2 * bgl), cres * 0.6);
    float big = step(0.5, isRun) + step(0.6, m) * 0.0;
    float spec = (1.0 - smoothstep(0.09, 0.15, length(n - vec2(-0.3, 0.4)))) * (0.35 + 0.65 * big);
    dc = mix(dc, vec3(1.0), spec * 0.8);
    // anti-aliased edge
    float aa = 1.0 - smoothstep(1.0 - fwidth(dist) * 1.5, 1.0, dist);
    col = mix(col, dc, aa);
  }
  // trails are a touch darker and clearer, with a faint edge
  col = mix(col, col * 0.92, trail * 0.4);
  // the room's light caught on the wet glass (k05: the red flood)
  col += uWash * uWashK * (0.18 + 0.5 * haze + 0.6 * m * (0.4 + 0.6 * smoothstep(0.5, 0.9, dist)));
  float a = clamp(max(haze * 0.9 + 0.1, m), 0.0, 1.0);
  oColor = vec4(col, a);
}
`;

export function createRainGlass(ctx, glassZ) {
  const W = ROOM.win, f = W.frame;
  const x0 = W.x0 + f * 0.5, x1 = W.x1 - f * 0.5, y0 = W.y0 + f * 0.5, y1 = W.y1 - f * 0.5;
  const z = glassZ - 0.022;
  const atm = ctx.engine.mAtmos.uniforms;
  const u = {
    tScene: { value: ctx.engine.rtA.texture },
    uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1080, 1920) },
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uGO: { value: new THREE.Vector3(...rw(x0, y0, z)) },
    uGU: { value: new THREE.Vector3(...rwDir(1, 0, 0)) },
    uGV: { value: new THREE.Vector3(0, 1, 0) },
    uGN: { value: new THREE.Vector3(...rwDir(0, 0, 1)) },
    uGSize: { value: new THREE.Vector2(x1 - x0, y1 - y0) },
    uTime: { value: 0 }, uGlass: { value: 0 }, uCCTV: { value: 0 },
    uHaze: { value: 0.55 }, uFogDensity: atm.uFogDensity, uBlur: { value: 9 }, uDropK: { value: 1 }, uFall: { value: 1 }, uDropScale: { value: 2.4 },
    uZoom: { value: 1 }, uHunt: { value: 0 }, uBokeh: { value: 4 },
    uWash: { value: new THREE.Color('#ff2a1e') }, uWashK: { value: 0 }, uZoomOut: { value: new THREE.Vector2(S12_ZOOM_CENTRE[0] / 1080, 1 - S12_ZOOM_CENTRE[1] / 1920) },
    uFogCool: atm.uFogCool, uFogWarm: atm.uFogWarm, uTint: { value: new THREE.Color('#d6eee4') },
  };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: VS, fragmentShader: FS,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  quad.renderOrder = 1000;
  quad.visible = false;
  ctx.overlay.add(quad);
  return {
    mat,
    update(st, on) {
      const cctv = on && st.sid === 's12';
      const glass = on && !cctv && (st.look?.rainGlass ?? 1) > 0;
      quad.visible = cctv || glass;
      if (!quad.visible) return;
      const cam = ctx.camera;
      u.uInvProj.value.copy(cam.projectionMatrixInverse);
      u.uCamWorld.value.copy(cam.matrixWorld);
      u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
      u.uTime.value = st.look?.rainFreeze ? 977.0 : st.t;     // k14: the rain has stopped; the drops stay where they are
      u.uGlass.value = glass ? 1 : 0;
      u.uCCTV.value = cctv ? 1 : 0;
      const L = st.look || {};
      u.uHaze.value = L.rainHaze ?? 0.5;
      u.uBlur.value = L.rainBlur ?? 9;
      u.uDropK.value = L.rainDrop ?? 1;
      u.uFall.value = L.rainFall ?? 1;
      u.uDropScale.value = L.rainScale ?? 2.4;
      u.uBokeh.value = L.rainBokeh ?? 4;
      u.uWashK.value = L.rainTintK ?? 0;
      if (L.rainTint) u.uWash.value.set(L.rainTint);
      if (cctv) {
        // as he looks up, the camera "notices": a focus hunt, then a slow digital push-in that holds
        const lu = st.cues.lookUp, tr = st.tr;
        u.uZoom.value = s12Zoom(st);
        const kh = Math.min(1, Math.max(0, (tr - (lu - 0.05)) / 0.5));
        u.uHunt.value = 3.0 * Math.sin(Math.PI * kh) * (kh < 1 ? 1 : 0);
      } else { u.uZoom.value = 1; u.uHunt.value = 0; }
    },
  };
}

// A soft additive glow at a world point (the phone screen), hidden where the scene stands in front of it, so his
// silhouette is rimmed by the phone's cold halo when seen from behind.
export function createHalo(ctx) {
  const u = {
    uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1080, 1920) },
    uColor: { value: new THREE.Color('#9fb6ff') }, uI: { value: 0 }, uSize: { value: 0.5 }, uSoft: { value: 0.25 },
  };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uSize;
      varying vec2 vUv; varying float vDepth;
      void main(){
        vec4 mv = viewMatrix * vec4((modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, 1.0);
        mv.xy += position.xy * uSize;
        vUv = uv; vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSceneData; uniform vec2 uRes; uniform vec3 uColor; uniform float uI, uSoft;
      varying vec2 vUv; varying float vDepth;
      out vec4 oColor;
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float g = exp(-r * r * 4.0) * (1.0 - smoothstep(0.85, 1.0, r));
        float sd = texture(uSceneData, gl_FragCoord.xy / uRes).b;
        float soft = clamp((sd - vDepth) / uSoft, 0.0, 1.0);
        float a = g * uI * soft;
        if(a < 0.002) discard;
        oColor = vec4(uColor * a, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.frustumCulled = false; m.visible = false; m.renderOrder = 1100;
  ctx.overlay.add(m);
  return {
    set(pos, i, size = 0.5, color) { m.visible = i > 0; m.position.copy(pos); u.uI.value = i; u.uSize.value = size; u.uColor.value.set(color ?? '#9fb6ff'); },
    hide() { m.visible = false; },
  };
}
