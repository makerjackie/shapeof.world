import * as THREE from 'three';
import { G } from './glsl.js';
import { NOISE, PAINT_FS, WATER_FS, ATMOS_FS, ENV_UNIFORMS } from './passes-env.js';

// Post passes. Order per frame:
//   shadow depth -> reflection -> main MRT (color + data)
//   -> paint (Kuwahara brushwork on painted pixels only)
//   -> ink (hand-inked lines on cel pixels only)
//   -> water (screen-space plane: reflection, refraction, ripples, foam)
//   -> atmosphere (height mist, fog, light shafts) -> overlay sprites
//   -> bloom -> final grade + grain + downsample to the canvas.

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const INK_FS = /* glsl */ `
uniform sampler2D tColor, tData;
uniform vec2 uRes;
uniform float uS, uWidth, uSeed;
uniform vec3 uInk;
varying vec2 vUv;
out vec4 o;
${NOISE}
bool inked(float id){ return id > 0.5 && id < 99.5; }
vec3 nrm(vec4 d){ vec2 xy = d.rg * 2.0 - 1.0; return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy)))); }
float edgeAt(vec2 uv, vec4 dC, vec3 nC, float w){
  vec2 px = w / uRes;
  float e = 0.0;
  for(int k = 0; k < 8; k++){
    float a = float(k) * 0.78539816;
    vec2 off = vec2(cos(a), sin(a)) * px;
    vec4 dN = texture(tData, uv + off);
    bool cC = inked(dC.a), cN = inked(dN.a);
    if(!cC && !cN) continue;
    float ee = 0.0;
    if(abs(dN.a - dC.a) > 0.5){
      // silhouette against painted bg: only draw when the cel is in front
      if(cC && cN) ee = 1.0;
      else if(cC) ee = (dC.b < dN.b + 0.5) ? 1.0 : 0.0;
      else ee = (dN.b < dC.b + 0.5) ? 1.0 : 0.0;
    } else {
      float rel = abs(dN.b - dC.b) / max(min(dN.b, dC.b), 0.01);
      ee = smoothstep(0.015, 0.035, rel);
      float nd = dot(nC, nrm(dN));
      ee = max(ee, smoothstep(0.78, 0.6, nd) * 0.85);
    }
    e = max(e, ee);
  }
  return e;
}
void main(){
  vec4 col = texture(tColor, vUv);
  vec4 dC = texture(tData, vUv);
  vec3 nC = nrm(dC);
  vec2 fc = gl_FragCoord.xy / uS;
  float press = 0.72 + 0.56 * vnoise(fc / 34.0 + uSeed * 7.0);
  float dist = clamp(14.0 / max(dC.b, 0.1), 0.5, 1.25);
  float w = uWidth * uS * press * dist;
  float e = 0.5 * edgeAt(vUv, dC, nC, w) + 0.5 * edgeAt(vUv, dC, nC, w * 0.55);
  float alpha = e * (0.82 + 0.18 * vnoise(fc / 7.0 + uSeed));
  vec3 ink = mix(uInk, col.rgb * 0.32, 0.25);
  o = vec4(mix(col.rgb, ink, clamp(alpha, 0.0, 1.0)), 1.0);
}
`;

const BRIGHT_FS = /* glsl */ `
uniform sampler2D tColor;
uniform float uThreshold;
varying vec2 vUv;
out vec4 o;
void main(){
  vec3 c = texture(tColor, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(uThreshold, uThreshold + 0.4, l), 1.0);
}
`;

const BLUR_FS = /* glsl */ `
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
out vec4 o;
void main(){
  vec3 s = texture(tColor, vUv).rgb * 0.227;
  s += texture(tColor, vUv + uDir * 1.385).rgb * 0.316;
  s += texture(tColor, vUv - uDir * 1.385).rgb * 0.316;
  s += texture(tColor, vUv + uDir * 3.231).rgb * 0.070;
  s += texture(tColor, vUv - uDir * 3.231).rgb * 0.070;
  o = vec4(s, 1.0);
}
`;

const FINAL_FS = /* glsl */ `
uniform sampler2D tColor, tBloom1, tBloom2, tUI;
uniform float uUIOn, uUIGrain, uBW;
uniform vec2 uRes;      // internal resolution
uniform float uS, uFrame, uBloom, uVignette, uGrain, uFade;
uniform vec3 uLift, uGain, uFadeColor;
uniform float uSat, uExposure, uGamma, uVibrance;
varying vec2 vUv;
out vec4 o;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 px = 1.0 / uRes;
  vec3 c;
  if(uS > 1.5){
    c = (texture(tColor, vUv + px * vec2(-0.5, -0.5)).rgb + texture(tColor, vUv + px * vec2(0.5, -0.5)).rgb +
         texture(tColor, vUv + px * vec2(-0.5, 0.5)).rgb + texture(tColor, vUv + px * vec2(0.5, 0.5)).rgb) * 0.25;
  } else c = texture(tColor, vUv).rgb;
  vec3 b = texture(tBloom1, vUv).rgb * 0.6 + texture(tBloom2, vUv).rgb * 0.8;
  c += b * uBloom;
  // soft shoulder for over-bright glows
  c = c / (1.0 + max(c - 1.0, 0.0) * 0.6);
  // high-key anime grade: open the mids, keep colour clean and vivid
  c *= uExposure;
  c = pow(max(c, 0.0), vec3(uGamma));
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  c = mix(vec3(l), c, uSat * (1.0 + uVibrance * (1.0 - chroma)));
  c = uLift + c * (uGain - uLift);
  if(uBW > 0.0){
    float y = dot(c, vec3(0.299, 0.587, 0.114));
    y = smoothstep(0.12, 0.78, y);
    c = mix(c, vec3(y), uBW);
  }
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVignette * dot(q, q) * 1.6;
  float g = hash12(gl_FragCoord.xy + uFrame * 17.31) - 0.5;
  c += g * uGrain;
  // screen-space UI (phone screens, cards, stamps): premultiplied canvas at output resolution, on top of the graded picture
  if(uUIOn > 0.5){
    vec4 ui = texture(tUI, vec2(vUv.x, 1.0 - vUv.y));
    c = c * (1.0 - ui.a) + ui.rgb;
    c += g * uUIGrain * ui.a;
  }
  c = mix(c, uFadeColor, uFade);
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

function fsMat(fs, uniforms) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: fs, uniforms,
    depthTest: false, depthWrite: false,
  });
}

export class Engine {
  constructor(canvas, W, H, S) {
    this.W = W; this.H = H; this.S = S;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.autoClear = false;
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    const IW = this.IW = Math.round(W * S), IH = this.IH = Math.round(H * S);
    const half = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.rtMain = new THREE.WebGLRenderTarget(IW, IH, {
      count: 2, type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(IW, IH),
    });
    this.rtMain.textures[0].minFilter = this.rtMain.textures[0].magFilter = THREE.LinearFilter;
    this.rtA = new THREE.WebGLRenderTarget(IW, IH, half);
    this.rtB = new THREE.WebGLRenderTarget(IW, IH, half);
    this.rtRefl = new THREE.WebGLRenderTarget(Math.round(IW / 2), Math.round(IH / 2), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtShadow = new THREE.WebGLRenderTarget(4096, 4096, { depthTexture: new THREE.DepthTexture(4096, 4096) });
    const bw = Math.round(IW / 4), bh = Math.round(IH / 4);
    this.rtBl = [0, 1, 2, 3].map((i) => new THREE.WebGLRenderTarget(i < 2 ? bw : bw >> 1, i < 2 ? bh : bh >> 1, half));

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene(); this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const res = new THREE.Vector2(IW, IH);
    this.mPaint = fsMat(PAINT_FS, { tColor: { value: null }, uRes: { value: res }, uRadius: { value: 4 }, uStep: { value: S }, uS: { value: S }, ...ENV_UNIFORMS.paint });
    this.mInk = fsMat(INK_FS, { tColor: { value: null }, tData: { value: null }, uRes: { value: res }, uS: { value: S }, uWidth: { value: 1.15 }, uSeed: { value: 0 }, uInk: { value: new THREE.Color('#2a2236') } });
    this.mWater = fsMat(WATER_FS, {
      tColor: { value: null }, tData: { value: null }, tRefl: { value: null }, uRes: { value: res },
      uCamPos: { value: new THREE.Vector3() }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uReflMat: { value: new THREE.Matrix4() },
      uWaterLevel: G.uWaterLevel, uTime: G.uTime, uFxTime: { value: 0 },
      uSunDir: G.uSunDir, uSunColor: G.uSunColor, uSunStrength: G.uSunStrength,
      uDeep: { value: new THREE.Color('#3f5f6e') }, uShallow: { value: new THREE.Color('#6f9e9a') }, uFoam: { value: new THREE.Color('#f4f1ea') }, uSkyRefl: { value: new THREE.Color('#d9c3d0') },
      uRip: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uRipB: { value: Array.from({ length: 12 }, () => new THREE.Vector4(2, 0.4, 0.5, 1)) },
      uWake: { value: new THREE.Vector4(0, 0, 0, 0) }, uWake2: { value: new THREE.Vector4(30, 3, 0, 0) },
      uWaveAmp: { value: 0.35 }, uReflStrength: { value: 1 }, uOn: { value: 1 },
      ...ENV_UNIFORMS.water,
    });
    this.mAtmos = fsMat(ATMOS_FS, {
      tColor: { value: null }, tData: { value: null },
      uCamPos: { value: new THREE.Vector3() }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uWaterLevel: G.uWaterLevel, uTime: G.uTime, uSunDir: G.uSunDir, uSunColor: G.uSunColor, uSunStrength: G.uSunStrength,
      uFogWarm: { value: new THREE.Color('#f3d2b6') }, uFogCool: { value: new THREE.Color('#c7bfd8') },
      uFogDensity: { value: 0.0022 }, uMist: { value: 0.35 }, uMistHeight: { value: 6 }, uMistNear: { value: 10 },
      uSunUV: { value: new THREE.Vector2(0.5, 0.5) }, uShafts: { value: 0 },
      ...ENV_UNIFORMS.atmos,
    });
    this.mBright = fsMat(BRIGHT_FS, { tColor: { value: null }, uThreshold: { value: 1.05 } });
    this.mBlur = fsMat(BLUR_FS, { tColor: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mFinal = fsMat(FINAL_FS, {
      tColor: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, uRes: { value: res }, uS: { value: S },
      uFrame: { value: 0 }, uBloom: { value: 0.9 }, uVignette: { value: 0.16 }, uGrain: { value: 0.02 }, uFade: { value: 0 },
      uExposure: { value: 1.12 }, uGamma: { value: 0.84 }, uVibrance: { value: 0.3 },
      uLift: { value: new THREE.Color('#14101e') }, uGain: { value: new THREE.Color('#fffaf2') }, uSat: { value: 1.0 },
      uFadeColor: { value: new THREE.Color('#000000') },
      tUI: { value: null }, uUIOn: { value: 0 }, uUIGrain: { value: 0.012 }, uBW: { value: 0 },
    });

    this.shadowCam = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 200);
    this.reflCam = new THREE.PerspectiveCamera();
    this.reflMat = new THREE.Matrix4();
    this._v = new THREE.Vector3(); this._t = new THREE.Vector3(); this._u = new THREE.Vector3();
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  setupShadow(center, radius, depth = 24) {   // tight depth range: small bias, so the bird shades the fingers
    const sc = this.shadowCam;
    const dir = G.uKeyDir.value;
    sc.left = -radius; sc.right = radius; sc.top = radius; sc.bottom = -radius;
    sc.near = 1; sc.far = depth * 2;
    sc.position.copy(center).addScaledVector(dir, depth);
    sc.up.set(0, 1, 0);
    sc.lookAt(center);
    sc.updateProjectionMatrix();
    sc.updateMatrixWorld();
    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    // shader does its own *0.5+0.5, so pass the raw clip matrix
    G.uShadowMatrix.value.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
    void bias;
  }

  updateReflection(cam) {
    const wl = G.uWaterLevel.value;
    cam.updateMatrixWorld();
    const p = this._v.setFromMatrixPosition(cam.matrixWorld);
    const rc = this.reflCam;
    rc.position.set(p.x, 2 * wl - p.y, p.z);
    const look = this._t.set(0, 0, -1).applyQuaternion(cam.quaternion).add(p);
    look.y = 2 * wl - look.y;
    const up = this._u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    up.y = -up.y;
    rc.up.copy(up);
    rc.lookAt(look);
    rc.fov = cam.fov; rc.aspect = cam.aspect; rc.near = cam.near; rc.far = cam.far;
    rc.updateProjectionMatrix();
    rc.updateMatrixWorld();
    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.reflMat.copy(bias).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
  }

  render(scene, overlay, cam, opt) {
    const r = this.renderer;
    const f0 = this.mFinal.uniforms;
    f0.tUI.value = opt.ui ?? null; f0.uUIOn.value = opt.ui ? 1 : 0;
    if (opt.skip3D) {
      for (const t of [this.rtB, ...this.rtBl]) { r.setRenderTarget(t); r.setClearColor(opt.clear ?? 0x000000, 1); r.clear(true, false, false); }
      f0.tColor.value = this.rtB.texture; f0.tBloom1.value = this.rtBl[0].texture; f0.tBloom2.value = this.rtBl[3].texture;
      f0.uFrame.value = opt.frame ?? 0; f0.uFade.value = opt.fade ?? 0; f0.uBW.value = opt.bw ?? 0;
      if (opt.fadeColor) f0.uFadeColor.value.set(opt.fadeColor);
      r.setRenderTarget(null); r.setViewport(0, 0, this.W, this.H);
      this.quad.material = this.mFinal; r.render(this.quadScene, this.quadCam);
      return;
    }
    G.uWaterLevel.value = opt.waterLevel ?? 0;
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();

    // 1. shadow map
    if (opt.shadow) {
      this.setupShadow(opt.shadow.center, opt.shadow.radius, opt.shadow.depth);
      // the depth texture being written must not also be bound for sampling (feedback loop → WebGL drops every draw)
      G.uShadowMap.value = null;
      G.uShadowOn.value = 1;
      G.uPass.value = 1;
      r.setRenderTarget(this.rtShadow);
      r.setClearColor(0xffffff, 1);
      r.clear(true, true, false);
      // only the listed roots cast shadows (the character), so set dressing never
      // drops a building's shadow across the robot — painted lighting, not physics
      const roots = opt.shadowRoots || [scene];
      for (const root of roots) {
        root.traverse((o) => { if (o.userData.noShadow) { o.userData._v = o.visible; o.visible = false; } });
        r.render(root, this.shadowCam);
        root.traverse((o) => { if (o.userData.noShadow) o.visible = o.userData._v; });
      }
      G.uShadowMap.value = this.rtShadow.depthTexture;
    } else G.uShadowOn.value = 0;

    // 2. reflection (only for shots that show the water/mirror plane)
    if (opt.reflect) {
    this.updateReflection(cam);
    G.uPass.value = 2;
    r.setRenderTarget(this.rtRefl);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    scene.traverse((o) => { if (o.userData.noReflect) { o.userData._v = o.visible; o.visible = false; } });
    r.render(scene, this.reflCam);
    scene.traverse((o) => { if (o.userData.noReflect) o.visible = o.userData._v; });
    }

    // 3. main MRT
    G.uPass.value = 0;
    r.setRenderTarget(this.rtMain);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(scene, cam);

    // 4. paint
    this.mPaint.uniforms.tColor.value = this.rtMain.textures[0];
    this.mPaint.uniforms.uRadius.value = opt.paintRadius ?? 4;
    this.pass(this.mPaint, this.rtA);
    // 5. ink
    const ink = this.mInk.uniforms;
    ink.tColor.value = this.rtA.texture; ink.tData.value = this.rtMain.textures[1];
    ink.uSeed.value = opt.inkSeed ?? 0; ink.uWidth.value = opt.inkWidth ?? 1.15;
    this.pass(this.mInk, this.rtB);

    const invProj = cam.projectionMatrixInverse;
    // 6. water
    const w = this.mWater.uniforms;
    w.tColor.value = this.rtB.texture; w.tData.value = this.rtMain.textures[1]; w.tRefl.value = this.rtRefl.texture;
    w.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    w.uInvProj.value.copy(invProj); w.uCamWorld.value.copy(cam.matrixWorld); w.uReflMat.value.copy(this.reflMat);
    this.pass(this.mWater, this.rtA);
    // 7. atmosphere
    const a = this.mAtmos.uniforms;
    a.tColor.value = this.rtA.texture; a.tData.value = this.rtMain.textures[1];
    a.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    a.uInvProj.value.copy(invProj); a.uCamWorld.value.copy(cam.matrixWorld);
    const sp = this._v.copy(G.uSunDir.value).multiplyScalar(5000).add(a.uCamPos.value).project(cam);
    a.uSunUV.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    this.pass(this.mAtmos, this.rtB);
    // 8. overlay sprites straight onto rtB
    if (overlay) {
      overlay.traverse((o) => {
        const m = o.material;
        if (m && m.uniforms && m.uniforms.uSceneData) { m.uniforms.uSceneData.value = this.rtMain.textures[1]; m.uniforms.uRes.value.set(this.IW, this.IH); }
      });
      r.setRenderTarget(this.rtB);
      r.render(overlay, cam);
    }
    // 9. bloom
    this.mBright.uniforms.tColor.value = this.rtB.texture;
    this.pass(this.mBright, this.rtBl[0]);
    const blur = (src, dst, dx, dy, tw, th) => { this.mBlur.uniforms.tColor.value = src.texture; this.mBlur.uniforms.uDir.value.set(dx / tw, dy / th); this.pass(this.mBlur, dst); };
    const [b0, b1, b2, b3] = this.rtBl;
    blur(b0, b1, 1, 0, b0.width, b0.height); blur(b1, b0, 0, 1, b0.width, b0.height);
    blur(b0, b2, 1, 0, b0.width, b0.height); blur(b2, b3, 0, 1, b2.width, b2.height);
    blur(b3, b2, 2, 0, b2.width, b2.height); blur(b2, b3, 0, 2, b2.width, b2.height);
    // 10. final
    const f = this.mFinal.uniforms;
    f.tColor.value = this.rtB.texture; f.tBloom1.value = b0.texture; f.tBloom2.value = b3.texture;
    f.uFrame.value = opt.frame ?? 0;
    f.uFade.value = opt.fade ?? 0;
    if (opt.bloom != null) f.uBloom.value = opt.bloom;
    if (opt.exposure != null) f.uExposure.value = opt.exposure;
    if (opt.vignette != null) f.uVignette.value = opt.vignette;
    if (opt.grain != null) f.uGrain.value = opt.grain;
    if (opt.threshold != null) this.mBright.uniforms.uThreshold.value = opt.threshold;
    f.uBW.value = opt.bw ?? 0;
    if (opt.fadeColor) f.uFadeColor.value.set(opt.fadeColor);
    r.setRenderTarget(null);
    r.setViewport(0, 0, this.W, this.H);
    this.quad.material = this.mFinal;
    r.render(this.quadScene, this.quadCam);
  }
}
