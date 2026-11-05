import * as THREE from 'three';
import { G, COMMON, MRT_OUT, VERT_STD } from './glsl.js';

const base = (extra) => ({ ...G, ...extra });

function mat(uniforms, vertexShader, fragmentShader, opts = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader,
    fragmentShader,
    side: opts.side ?? THREE.DoubleSide,
    transparent: false,
    ...opts,
  });
}

// ---------------------------------------------------------------- cel (robot)
// Hand-inked anime cel: two hard tones, crisp highlights, posterised weathering.
// Weathering is computed from aRest (the vertex position in the slumped rest
// pose), so stains stay glued to the armour when the robot moves.
export function celMaterial(o = {}) {
  const u = base({
    uColor: { value: new THREE.Color(o.color ?? '#eef0f4') },
    uDark: { value: new THREE.Color(o.dark ?? '#6a6878') },
    uId: { value: o.id ?? 1 },
    uWeather: { value: new THREE.Vector4(...(o.weather ?? [1, 1, 1, 1])) },
    uGloss: { value: o.gloss ?? 1 },
    uMap: { value: o.map ?? null },
    uUseMap: { value: o.map ? 1 : 0 },
    uEmissive: { value: new THREE.Color(o.emissive ?? '#000000') },
    uEmisMode: { value: o.emisMode ?? 0 },
    uLampAxis: { value: o.lampAxis ?? 0 },
    uWetness: { value: o.wetness ?? 1 },
    uAlpha: { value: o.alpha ?? 1 },
  });
  // up to two projected panel decals: { tex, axis 0|1|2, sign ±1, rect [cu, cv, w, h] } in local units
  const det = o.det ?? [];
  for (const [i, k] of [[0, 'A'], [1, 'B']]) {
    const d = det[i];
    u['uDet' + k] = { value: d ? d.tex : null };
    u['uDet' + k + 'P'] = { value: new THREE.Vector4(d ? d.axis : 0, d ? d.sign : 1, d ? 1 : 0, 0) };
    u['uDet' + k + 'R'] = { value: new THREE.Vector4(...(d ? d.rect : [0, 0, 1, 1])) };
  }
  u.uRobotWet = G.uRobotWet; u.uBeacon = G.uBeacon; u.uBeaconPhase = G.uBeaconPhase; u.uEyes = G.uEyes; u.uFlat = G.uFlat;
  const vs = /* glsl */ `
    attribute vec3 aRest;
    varying vec3 vRest;
    varying vec3 vLocal;
    varying vec3 vLocalN;
    ${VERT_STD}
    void main(){ vRest = aRest; vLocal = position; vLocalN = normal; stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform vec3 uColor, uDark, uEmissive;
    uniform float uId, uGloss, uUseMap, uEmisMode, uLampAxis, uWetness, uAlpha;
    uniform vec4 uWeather;
    uniform sampler2D uMap;
    uniform float uRobotWet, uBeacon, uBeaconPhase, uEyes, uFlat;
    uniform sampler2D uDetA, uDetB;
    uniform vec4 uDetAP, uDetAR, uDetBP, uDetBR;
    varying vec3 vWorld, vNormalW, vNormalV, vRest, vLocal, vLocalN;
    // panel lines / markings projected along a local axis so they wrap curved armour
    vec4 projDecal(sampler2D t, vec4 P, vec4 R){
      if(P.z < 0.5) return vec4(0.0);
      int ax = int(P.x + 0.5); float sg = P.y;
      vec3 ln = normalize(vLocalN); vec3 lp = vLocal;
      float face = ax == 0 ? ln.x : (ax == 1 ? ln.y : ln.z);
      if(face * sg < 0.25) return vec4(0.0);
      vec2 q = ax == 0 ? vec2(-lp.z * sg, lp.y) : (ax == 2 ? vec2(lp.x * sg, lp.y) : vec2(lp.x, -lp.z * sg));
      vec2 uv = (q - R.xy) / R.zw + 0.5;
      if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
      return texture(t, uv);
    }
    varying float vDepth;
    varying vec2 vUv;

    void main(){
      if(uPass > 1.5 && vWorld.y < uWaterLevel - 0.03) discard;
      vec3 N = normalize(vNormalW);
      vec3 NV = normalize(vNormalV);
      if(!gl_FrontFacing){ N = -N; NV = -NV; }
      vec3 col = uColor;
      float a = 1.0;
      if(uUseMap > 0.5){
        vec4 m = texture(uMap, vUv);
        if(uAlpha < 0.5){ if(m.a < 0.5) discard; col = m.rgb; }
        else col = mix(col, m.rgb, m.a);
      }
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec4 dA = projDecal(uDetA, uDetAP, uDetAR); col = mix(col, dA.rgb, dA.a);
      vec4 dB = projDecal(uDetB, uDetBP, uDetBR); col = mix(col, dB.rgb, dB.a);

      vec3 r = vRest;
      float weathered = 1.0 - uFlat;
      // ---- grime blotches (one step darker, purple-shifted, hard edged)
      float g = fbm3(r * 0.85 + 3.1);
      float grime = step(0.63, g) * uWeather.x * weathered;
      col = mix(col, col * vec3(0.86, 0.85, 0.93), grime);
      // ---- fine wear: scuffs and hairline scratches catch the eye up close
      float scuff = step(0.8, vnoise3(r * 26.0 + 2.0)) * step(0.55, fbm3(r * 3.0));
      float scratch = step(0.94, vnoise3(vec3(r.x * 60.0, r.y * 6.0, r.z * 60.0)));
      col = mix(col, col * vec3(0.84, 0.83, 0.9), max(scuff, scratch) * weathered * step(0.01, uWeather.y) * 0.8);
      // ---- paint chips: dark metal with a pale primer rim
      float c = fbm3(r * 5.5 + 11.0) + 0.25 * vnoise3(r * 22.0);
      float ct = 0.92 - 0.05 * uWeather.y;
      float chip = step(ct, c) * weathered * step(0.01, uWeather.y);
      float rim = step(ct - 0.035, c) * (1.0 - chip) * weathered * step(0.01, uWeather.y);
      col = mix(col, mix(col, vec3(0.86, 0.80, 0.70), 0.55), rim);
      col = mix(col, uDark, chip);
      // ---- rust runs, stretched downward from chips
      float rs = fbm3(vec3(r.x * 6.0, r.y * 0.55, r.z * 6.0) + 7.0);
      float rust = step(0.73, rs) * step(0.45, fbm3(r * 2.0)) * uWeather.z * weathered;
      col = mix(col, mix(col, vec3(0.62, 0.36, 0.25), 0.7), rust);
      // ---- algae below the old waterline, stain band at the line
      float h = r.y + (fbm3(r * 1.7) - 0.5) * 0.45;
      float algae = step(h, -0.05) * uWeather.w * weathered;
      float deepA = step(h, -0.9) * algae;
      float spots = step(0.55, fbm3(r * 4.0 + 5.0));
      vec3 alg = mix(vec3(0.47, 0.55, 0.36), vec3(0.36, 0.44, 0.31), spots);
      alg = mix(alg, vec3(0.30, 0.36, 0.30), deepA);
      col = mix(col, mix(col, alg, 0.5), algae);
      float band = step(-0.05, h) * step(h, 0.16) * uWeather.w * weathered;
      col = mix(col, col * vec3(0.86, 0.82, 0.74), band);

      // ---- lighting: two hard tones
      float ndl = dot(N, uKeyDir);
      float sh = sunShadow(vWorld, N);
      float lit = smoothstep(-0.03, 0.05, ndl) * sh;
      vec3 litCol = col * mix(uSkyTint, uSunColor * 1.06, uSunStrength);
      float up = smoothstep(-0.7, 0.6, N.y);
      vec3 shadeCol = col * uShadeTint * mix(uBounce, vec3(1.0), up);
      vec3 outc = mix(mix(shadeCol, litCol, 0.12), litCol, lit);
      // third, darkest tone only in faces turned well away and pointing down
      float deep = step(ndl, -0.55) * step(N.y, -0.35);
      outc = mix(outc, col * uDeepTint, deep * 0.85);

      vec3 V = normalize(cameraPosition - vWorld);
      float wet = uRobotWet * uWetness * (algae > 0.5 ? 1.0 : 0.6);
      outc *= mix(1.0, 0.86, wet);
      vec3 H = normalize(uKeyDir + V);
      float sp = dot(N, H);
      float spec = step(0.985 - wet * 0.03, sp) * lit * uGloss;
      outc = mix(outc, mix(vec3(1.0), uSunColor, 0.3) * 1.04, spec * (0.55 + 0.4 * uSunStrength));
      // rim light when the sun is behind the robot
      float fres = 1.0 - max(dot(N, V), 0.0);
      float back = smoothstep(0.1, 0.5, dot(-V, uSunDir));
      float rimL = smoothstep(0.68, 0.72, fres) * smoothstep(-0.05, 0.15, ndl) * back * uSunStrength;
      outc = mix(outc, uSunColor * 1.15, rimL * 0.85);

      // ---- emissive parts
      if(uEmisMode > 0.5 && uEmisMode < 1.5){
        // eyes behind the visor
        vec3 off = col * vec3(0.35, 0.45, 0.55);
        outc = mix(off, uEmissive * (1.0 + 2.5 * uEyes), uEyes);
      } else if(uEmisMode > 1.5){
        // rotating beacon lamps inside the red lens
        float along = uLampAxis < 0.5 ? vLocal.x : vLocal.z;
        float side = uLampAxis < 0.5 ? vLocal.z : vLocal.x;
        float lampC = along > 0.0 ? 0.22 : -0.22;
        float ang = atan(side, along - lampC);
        float sweep = pow(max(cos(ang - uBeaconPhase * (along > 0.0 ? 1.0 : -1.0)), 0.0), 6.0);
        float core = smoothstep(0.16, 0.0, length(vec2(along - lampC, side)));
        vec3 lens = uColor;
        vec3 dull = mix(lens * 0.55, outc, 0.4);
        vec3 glow = uEmissive * (1.2 + 3.0 * sweep + 2.0 * core);
        outc = mix(dull, glow, uBeacon);
      }

      writeOut(outc, a, NV, vDepth, uId);
    }
  `;
  return mat(u, vs, fs);
}

// ------------------------------------------------------- overlay soft sprites
// Rendered after the water/atmosphere passes. Soft-depth against the scene.
export function overlayMaterial(o = {}) {
  const u = {
    uTex: { value: o.map ?? null },
    uUseTex: { value: o.map ? 1 : 0 },
    uColor: { value: new THREE.Color(o.color ?? '#ffffff') },
    uOpacity: { value: o.opacity ?? 1 },
    uSceneData: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uSoft: { value: o.soft ?? 1.5 },
    uTime: G.uTime,
    uSunDir: G.uSunDir,
    uSunColor: G.uSunColor,
    uSunStrength: G.uSunStrength,
  };
  const vs = /* glsl */ `
    attribute vec4 aSprite;   // x frame / opacity scale, y rotation, z size mult, w unused
    varying vec2 vUv;
    varying float vDepth;
    varying vec4 vSprite;
    void main(){
      vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      vec3 ax = (modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
      vec3 ay = (modelMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
      float sx = length(ax), sy = length(ay);
      vec4 mv = viewMatrix * vec4(center, 1.0);
      float r = aSprite.y;
      vec2 p = vec2(position.x * sx, position.y * sy);
      p = mat2(cos(r), sin(r), -sin(r), cos(r)) * p;
      mv.xy += p;
      vUv = uv;
      vDepth = -mv.z;
      vSprite = aSprite;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    uniform sampler2D uTex, uSceneData;
    uniform float uUseTex, uOpacity, uSoft;
    uniform vec3 uColor;
    uniform vec2 uRes;
    varying vec2 vUv;
    varying float vDepth;
    varying vec4 vSprite;
    out vec4 oColor;
    void main(){
      vec4 t = uUseTex > 0.5 ? texture(uTex, vUv) : vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.0, length(vUv - 0.5)));
      float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
      float soft = clamp((sceneD - vDepth) / uSoft, 0.0, 1.0);
      float a = t.a * uOpacity * soft * vSprite.x;
      if(a < 0.002) discard;
      oColor = vec4(t.rgb * uColor, a);
    }
  `;
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs,
    transparent: true, depthWrite: false, depthTest: false,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

// ------------------------------------------------------------ toon (general)
// General cel material for 关不掉: two hard tones from the key light (sun / moon / window), plus hard-edged pools from
// the local lights (uPL), a flat ambient, an optional texture, an optional emissive (screens, LEDs, lit windows).
//   o.color, o.dark (shade colour; default = color × shadeTint), o.map, o.id (1–99 inked, 100+ cel no ink, 0 painted),
//   o.emissive (colour), o.emissiveMap (texture; screens), o.emissiveGain, o.spec (0..1 hard highlight), o.rim (0..1),
//   o.unlit (true: emissive/map only, e.g. a screen face), o.alphaTest (cut-out with map alpha), o.side
export function toonMaterial(o = {}) {
  const u = base({
    uColor: { value: new THREE.Color(o.color ?? '#cfd3dc') },
    uDarkC: { value: new THREE.Color(o.dark ?? '#000000') },
    uUseDark: { value: o.dark ? 1 : 0 },
    uId: { value: o.id ?? 1 },
    uMap: { value: o.map ?? null }, uUseMap: { value: o.map ? 1 : 0 },
    uEmis: { value: new THREE.Color(o.emissive ?? '#000000') },
    uEmisMap: { value: o.emissiveMap ?? null }, uUseEmisMap: { value: o.emissiveMap ? 1 : 0 },
    uEmisGain: { value: o.emissiveGain ?? 1 },
    uSpec: { value: o.spec ?? 0 }, uRim: { value: o.rim ?? 0 },
    uUnlit: { value: o.unlit ? 1 : 0 },
    uAlphaTest: { value: o.alphaTest ?? 0 },
    uPL: G.uPL, uPLC: G.uPLC, uAmbient: G.uAmbient,
  });
  const vs = /* glsl */ `
    ${VERT_STD}
    void main(){ stdVertex(position, normal); }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform vec3 uColor, uDarkC, uEmis;
    uniform float uUseDark, uId, uUseMap, uUseEmisMap, uEmisGain, uSpec, uRim, uUnlit, uAlphaTest;
    uniform sampler2D uMap, uEmisMap;
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;
    varying vec2 vUv;
    void main(){
      vec3 col = uColor;
      if(uUseMap > 0.5){ vec4 m = texture(uMap, vUv); if(uAlphaTest > 0.0 && m.a < uAlphaTest) discard; col = mix(col, m.rgb, m.a); }
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
        vec3 litCol = col * mix(uSkyTint, uSunColor * 1.06, uSunStrength);
        float up = smoothstep(-0.7, 0.6, N.y);
        vec3 shadeCol = uUseDark > 0.5 ? uDarkC : col * uShadeTint * mix(uBounce, vec3(1.0), up);
        outc = mix(shadeCol, litCol, lit);
        float deep = step(ndl, -0.55) * step(N.y, -0.35);
        outc = mix(outc, col * uDeepTint, deep * 0.7);
        outc += col * (uAmbient + localLights(vWorld, N));
        vec3 V = normalize(cameraPosition - vWorld);
        if(uSpec > 0.0){
          vec3 H = normalize(uKeyDir + V);
          outc = mix(outc, mix(vec3(1.0), uSunColor, 0.3) * 1.05, step(0.982, dot(N, H)) * lit * uSpec);
        }
        if(uRim > 0.0){
          float fres = 1.0 - max(dot(N, V), 0.0);
          outc = mix(outc, uSunColor * 1.2, smoothstep(0.66, 0.72, fres) * uRim);
        }
        outc += emis;
      }
      writeOut(outc, 1.0, NV, vDepth, uId);
    }
  `;
  return mat(u, vs, fs, { side: o.side ?? THREE.DoubleSide });
}
