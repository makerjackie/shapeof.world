import * as THREE from 'three';
import { G, COMMON, MRT_OUT, VERT_STD } from './glsl.js';

// Materials for the meeting room (dept meet).
//   meetToon   — toonMaterial + per-vertex colour (aCol), backlit-silhouette controls, directional rim,
//                eye-band shadow (aMask) and a lens glint. One material per ink id; colours ride on vertices.
//   airMaterial — volumetric sun shafts: ray-marches the room air against the character shadow map, so the
//                mullions, the screen and the people cut real beams out of the light. Drawn in the overlay pass.
//   skyMaterial — fallback painted sky (only when the City department is absent).

const C = (c) => new THREE.Color(c);

export function meetToon(o = {}) {
  const u = {
    ...G,
    uColor: { value: C(o.color ?? '#ffffff') },
    uDarkC: { value: C(o.dark ?? '#000000') }, uUseDark: { value: o.dark ? 1 : 0 },
    uId: { value: o.id ?? 1 },
    uMap: { value: o.map ?? null }, uUseMap: { value: o.map ? 1 : 0 },
    uEmis: { value: C(o.emissive ?? '#000000') },
    uEmisMap: { value: o.emissiveMap ?? null }, uUseEmisMap: { value: o.emissiveMap ? 1 : 0 },
    uEmisGain: { value: o.emissiveGain ?? 1 },
    uSpec: { value: o.spec ?? 0 }, uRim: { value: o.rim ?? 0 },
    uUnlit: { value: o.unlit ? 1 : 0 },
    uAlphaTest: { value: o.alphaTest ?? 0 },
    uUseVC: { value: o.vc ? 1 : 0 },
    uSil: { value: o.sil ?? 0 },
    uRimK: { value: o.rimK ?? 0 },
    uEye: { value: o.eye ?? 0 },
    uPLGain: { value: o.plGain ?? 1 },
    uSheen: { value: o.sheen ?? 0 },
    uLitGain: { value: o.litGain ?? 1 },
    uUnder: { value: 0 },
  };
  const vs = /* glsl */ `
    attribute vec3 aCol;
    attribute float aMask;
    varying vec3 vCol;
    varying float vMask;
    ${VERT_STD}
    void main(){ vCol = aCol; vMask = aMask; stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform vec3 uColor, uDarkC, uEmis;
    uniform float uUseDark, uId, uUseMap, uUseEmisMap, uEmisGain, uSpec, uRim, uUnlit, uAlphaTest;
    uniform float uUseVC, uSil, uRimK, uEye, uPLGain, uSheen, uLitGain, uUnder;
    uniform sampler2D uMap, uEmisMap;
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;
    varying vec2 vUv;
    varying vec3 vCol;
    varying float vMask;
    void main(){
      vec3 col = uUseVC > 0.5 ? uColor * vCol : uColor;
      if(uUseMap > 0.5){
        vec4 m = texture(uMap, vUv);
        if(uAlphaTest > 0.0 && m.a < uAlphaTest) discard;
        col = uUseVC > 0.5 ? col * mix(vec3(1.0), m.rgb, m.a) : mix(col, m.rgb, m.a);
      }
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 N = normalize(vNormalW); vec3 NV = normalize(vNormalV);
      if(!gl_FrontFacing){ N = -N; NV = -NV; }
      vec3 emis = uEmis;
      if(uUseEmisMap > 0.5) emis += texture(uEmisMap, vUv).rgb;
      emis *= uEmisGain;
      vec3 outc;
      if(uUnlit > 0.5){
        outc = (uUseMap > 0.5 ? col : vec3(0.0)) + emis;
      } else {
        float ndl = dot(N, uKeyDir);
        float sh = sunShadow(vWorld, N);
        float lit = smoothstep(-0.02, 0.04, ndl) * sh;
        vec3 litCol = col * mix(uSkyTint, uSunColor * 1.06, uSunStrength) * uLitGain;
        float up = smoothstep(-0.7, 0.6, N.y);
        vec3 shadeCol = uUseDark > 0.5 ? uDarkC : col * uShadeTint * mix(uBounce, vec3(1.0), up);
        shadeCol *= 1.0 - 0.5 * uSil;
        outc = mix(shadeCol, litCol, lit);
        float deep = step(ndl, -0.55) * step(N.y, -0.35);
        outc = mix(outc, col * uDeepTint * (1.0 - 0.35 * uSil), deep * 0.7);
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = 1.0 - max(dot(N, V), 0.0);
        // eye band: brow shadow that no light reaches (SEELE / Gendo)
        float eye = vMask * uEye;
        outc = mix(outc, col * uDeepTint * 0.42, eye);
        // under-light (phones on the table): only surfaces turned downward catch it
        float under = mix(1.0, smoothstep(0.3, -0.5, N.y), uUnder);
        outc += col * (uAmbient + localLights(vWorld, N) * uPLGain * under * (1.0 - eye * 0.92));
        if(uSpec > 0.0){
          vec3 H = normalize(uKeyDir + V);
          outc = mix(outc, mix(vec3(1.0), uSunColor, 0.3) * 1.05, step(0.982, dot(N, H)) * lit * uSpec);
        }
        if(uSheen > 0.0){
          // satin / polished sheen: a soft second band toward the light
          vec3 H = normalize(uKeyDir + V);
          outc += col * uSunColor * smoothstep(0.86, 0.9, dot(N, H)) * lit * uSheen;
        }
        if(uRim > 0.0) outc = mix(outc, uSunColor * 1.2, smoothstep(0.66, 0.72, fres) * uRim);
        if(uRimK > 0.0){
          // backlight rim: a thin hot edge on the side turned toward the key (sun behind the subject)
          float side = smoothstep(-0.25, 0.15, dot(N, uKeyDir));
          float back = smoothstep(-0.3, 0.35, dot(-V, uKeyDir));
          float r = smoothstep(0.56, 0.6, fres) * side * (0.35 + 0.65 * back) * mix(0.35, 1.0, sh);
          outc = mix(outc, uSunColor * 1.45, r * uRimK);
        }
        outc += emis;
      }
      writeOut(outc, 1.0, NV, vDepth, uId);
    }
  `;
  // private shadow-map slot: unbound during the shadow pass itself (else the depth texture being written is also
  // bound for sampling -> feedback loop -> WebGL drops every shadow draw)
  u.uShadowMap = { value: null };
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs,
    side: o.side ?? THREE.DoubleSide, transparent: false,
  });
  m.onBeforeRender = () => { u.uShadowMap.value = (G.uPass.value > 0.5 && G.uPass.value < 1.5) ? null : G.uShadowMap.value; };
  return m;
}

// ---------------------------------------------------------------- volumetric sun shafts
// A box around the room air, drawn back faces in the overlay pass. Each pixel marches its view ray through the box
// (clipped by the scene depth) and sums sunlight that reaches each sample, read from the character shadow map
// (the ceiling, walls, mullions, screen and people are all shadow casters). Additive.
export function airMaterial(o = {}) {
  const u = {
    uSceneData: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uShadowMap: G.uShadowMap, uShadowMatrix: G.uShadowMatrix, uShadowOn: G.uShadowOn,
    uSunDir: G.uSunDir, uSunColor: G.uSunColor, uSunStrength: G.uSunStrength,
    uTime: G.uTime,
    uBoxMin: { value: new THREE.Vector3(...(o.min ?? [-9, 150, -7])) },
    uBoxMax: { value: new THREE.Vector3(...(o.max ?? [9, 154.6, 7])) },
    uDensity: { value: o.density ?? 0.06 },
    uTint: { value: C(o.tint ?? '#fff1d6') },
    uDust: { value: o.dust ?? 0.5 },
    uCamPos2: { value: new THREE.Vector3() },
  };
  const vs = /* glsl */ `
    varying vec3 vW;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vW = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uSceneData, uShadowMap;
    uniform vec2 uRes;
    uniform mat4 uShadowMatrix;
    uniform float uShadowOn, uSunStrength, uTime, uDensity, uDust;
    uniform vec3 uSunDir, uSunColor, uBoxMin, uBoxMax, uTint;
    varying vec3 vW;
    out vec4 oColor;
    float h13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3.-2.*f);
      return mix(mix(mix(h13(i), h13(i+vec3(1,0,0)), u.x), mix(h13(i+vec3(0,1,0)), h13(i+vec3(1,1,0)), u.x), u.y),
                 mix(mix(h13(i+vec3(0,0,1)), h13(i+vec3(1,0,1)), u.x), mix(h13(i+vec3(0,1,1)), h13(i+vec3(1,1,1)), u.x), u.y), u.z); }
    float litAt(vec3 p){
      vec4 sc = uShadowMatrix * vec4(p, 1.0);
      vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
      if(c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 0.0;
      float d = texture(uShadowMap, c.xy).r;
      return (c.z - 0.0012 > d) ? 0.0 : 1.0;
    }
    void main(){
      if(uShadowOn < 0.5) discard;
      vec3 ro = cameraPosition;
      vec3 rd = normalize(vW - ro);
      // ray / box
      vec3 inv = 1.0 / rd;
      vec3 t0 = (uBoxMin - ro) * inv, t1 = (uBoxMax - ro) * inv;
      vec3 tmin = min(t0, t1), tmax = max(t0, t1);
      float ta = max(max(max(tmin.x, tmin.y), tmin.z), 0.0);
      float tb = min(min(tmax.x, tmax.y), tmax.z);
      // scene depth (view space) -> distance along this ray
      vec4 sd = texture(uSceneData, gl_FragCoord.xy / uRes);
      vec3 fwd = normalize((inverse(viewMatrix) * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
      float cosv = max(dot(rd, fwd), 0.05);
      float sceneT = sd.b > 0.0 ? sd.b / cosv : 1e5;
      tb = min(tb, sceneT);
      if(tb <= ta) discard;
      // never haze over the big screen (or the phone screens): keep the text crisp
      float onScreen = (sd.a > 100.5 && sd.a < 102.5) ? 1.0 : 0.0;
      const int N = 56;
      float dt = (tb - ta) / float(N);
      // interleaved gradient noise: an even, fine dither (no clumpy grain)
      float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float acc = 0.0;
      for(int i = 0; i < N; i++){
        vec3 p = ro + rd * (ta + (float(i) + jit) * dt);
        float l = litAt(p);
        if(l > 0.0){
          // drifting dust density: slow, large; brighter low in the room
          float n = vn3(p * vec3(1.3, 1.6, 1.3) + vec3(uTime * 0.05, uTime * 0.02, -uTime * 0.04));
          float dens = mix(1.0, 0.55 + 0.9 * n, uDust);
          dens *= mix(1.0, 0.7, smoothstep(uBoxMin.y + 1.0, uBoxMax.y, p.y));
          acc += l * dens;
        }
      }
      acc *= dt * mix(1.0, 0.1, onScreen);
      float toSun = dot(rd, uSunDir);
      float phase = 0.35 + 1.6 * pow(max(toSun, 0.0), 5.0) + 0.25 * max(toSun, 0.0);
      float a = 1.0 - exp(-acc * uDensity * phase);
      vec3 c = uSunColor * uTint * a * uSunStrength;
      oColor = vec4(c, 0.0);
    }
  `;
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.BackSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
}

// Dust motes caught in the sun: small soft points that only show where the shadow map says the air is lit.
export function dustMaterial(o = {}) {
  const u = {
    uSceneData: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uShadowMap: G.uShadowMap, uShadowMatrix: G.uShadowMatrix, uShadowOn: G.uShadowOn,
    uSunColor: G.uSunColor, uSunStrength: G.uSunStrength, uSunDir: G.uSunDir,
    uDrawTime: G.uDrawTime,
    uSize: { value: o.size ?? 0.006 },
    uGain: { value: o.gain ?? 1.0 },
    uBoxMin: { value: new THREE.Vector3(...(o.min ?? [-9, 150, -7])) },
    uBoxMax: { value: new THREE.Vector3(...(o.max ?? [9, 154.6, 7])) },
  };
  const vs = /* glsl */ `
    attribute vec4 aSeed;
    uniform sampler2D uShadowMap;
    uniform mat4 uShadowMatrix;
    uniform float uShadowOn, uDrawTime, uSize;
    uniform vec3 uBoxMin, uBoxMax;
    varying vec2 vUv;
    varying float vLit;
    varying float vDepth;
    void main(){
      vec3 span = uBoxMax - uBoxMin;
      float t = uDrawTime;
      vec3 p = aSeed.xyz;
      p += vec3(sin(t * 0.21 + aSeed.w * 6.0) * 0.06 + t * 0.012, sin(t * 0.13 + aSeed.w * 9.0) * 0.05 - t * 0.006, cos(t * 0.17 + aSeed.w * 4.0) * 0.06);
      p = uBoxMin + mod(p - uBoxMin, span);
      vec4 sc = uShadowMatrix * vec4(p, 1.0);
      vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
      float lit = 0.0;
      if(uShadowOn > 0.5 && c.x > 0. && c.x < 1. && c.y > 0. && c.y < 1. && c.z < 1.) lit = (c.z - 0.0012 > texture(uShadowMap, c.xy).r) ? 0.0 : 1.0;
      vLit = lit * (0.5 + 0.5 * fract(aSeed.w * 17.0));
      vec4 mv = viewMatrix * vec4(p, 1.0);
      float s = uSize * (0.6 + 0.8 * fract(aSeed.w * 7.0));
      mv.xy += position.xy * s;
      vUv = uv; vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uSceneData;
    uniform vec2 uRes;
    uniform vec3 uSunColor;
    uniform float uSunStrength, uGain;
    varying vec2 vUv;
    varying float vLit;
    varying float vDepth;
    out vec4 oColor;
    void main(){
      if(vLit <= 0.0) discard;
      float sd = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      if(sd > 0.0 && vDepth > sd) discard;
      float r = length(vUv - 0.5) * 2.0;
      float a = smoothstep(1.0, 0.2, r) * vLit * uGain * uSunStrength;
      // out-of-focus near the lens: fainter
      a *= smoothstep(0.15, 0.6, vDepth);
      oColor = vec4(uSunColor * a, 0.0);
    }
  `;
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
}

// Fallback sky: a painted gradient dome (id 0, depth > 8000 so the engine treats it as sky).
export function skyMaterial() {
  const u = { ...G };
  const vs = /* glsl */ `
    ${VERT_STD}
    varying vec3 vDir;
    void main(){ vDir = normalize(position); stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;
    varying vec2 vUv;
    varying vec3 vDir;
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      float h = vDir.y;
      vec3 zen = vec3(0.36, 0.58, 0.92), hor = vec3(0.86, 0.92, 0.98);
      vec3 c = mix(hor, zen, smoothstep(0.0, 0.55, h));
      float sun = max(dot(vDir, uSunDir), 0.0);
      c += uSunColor * (pow(sun, 8.0) * 0.5 + pow(sun, 200.0) * 2.0);
      // soft painted clouds
      float cl = fbm2(vDir.xz / max(h + 0.12, 0.05) * 1.6);
      c = mix(c, vec3(1.0, 0.99, 0.97), smoothstep(0.55, 0.75, cl) * smoothstep(0.02, 0.15, h) * 0.8);
      writeOut(c, 1.0, vec3(0.0, 0.0, 1.0), 8500.0, 0.0);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.BackSide, depthWrite: false });
}

// ------------------------------------------------------------------ geometry helpers shared by meet modules
// Give a geometry the aCol/aMask attributes meetToon expects (uniform colour, mask 0 unless given).
export function paint(g, color = '#ffffff', mask = 0) {
  const n = g.attributes.position.count;
  const c = C(color);
  const col = new Float32Array(n * 3), m = new Float32Array(n);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; m[i] = typeof mask === 'function' ? mask(g.attributes.position, i) : mask; }
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMask', new THREE.BufferAttribute(m, 1));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = o.aniso ?? 8;
  return t;
}
