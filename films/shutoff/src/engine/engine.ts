// The one WebGL renderer of the film. Each scene module owns a THREE.Scene and drives the shared camera; the engine
// renders the active shot into an HDR multisampled target, then runs its own post chain:
//   depth of field (gather, golden-angle spiral) → bloom (UnrealBloomPass) → anamorphic streak (quarter-res) →
//   final grade (exposure, ACES, lift/gamma/gain, saturation, chromatic aberration, vignette, grain, fades, glitch).
// Everything is a pure function of time, and each frame is rendered synchronously and finished with gl.finish().
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { CUT, Shot, shotsAt } from "../film/cut";
import { loadFonts } from "./fonts";
import { clamp } from "./util";

export const W = 1920;
const MSAA = 4;
export const H = 1080;

export type Look = {
  exposure: number;
  bloom: number;
  bloomRadius: number;
  bloomThreshold: number;
  streak: number;
  dof: number; // max blur radius in px; 0 = off
  focus: number; // focus distance (m, view depth)
  aperture: number; // blur growth with defocus
  vignette: number;
  grain: number;
  ca: number;
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  sat: number;
  contrast: number;
  fade: number;
  flash: number;
  zoomBlur: number;
  glitch: number;
};

export const BASE_LOOK: Look = {
  exposure: 1,
  bloom: 0.6,
  bloomRadius: 0.55,
  bloomThreshold: 0.8,
  streak: 0.25,
  dof: 0,
  focus: 1,
  aperture: 1,
  vignette: 0.55,
  grain: 0.06,
  ca: 0.6,
  lift: [0.0, 0.012, 0.022],
  gamma: [1.0, 1.0, 1.0],
  gain: [1.0, 1.0, 1.0],
  sat: 1.0,
  contrast: 1.06,
  fade: 0,
  flash: 0,
  zoomBlur: 0,
  glitch: 0,
};

export type Ctx = { lt: number; gt: number; shot: Shot; cam: THREE.PerspectiveCamera };
export interface SceneMod {
  scene: THREE.Scene;
  ready: Promise<void>;
  update(c: Ctx): Partial<Look>;
  init?(r: THREE.WebGLRenderer): void;
}

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOF_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxBlur;
varying vec2 vUv;
float viewZ(float d){ return uNear * uFar / (uFar - d * (uFar - uNear)); }
float cocZ(float z){ return clamp(abs(z - uFocus) / max(z, 1e-4) * uAperture, 0.0, 1.0) * uMaxBlur; }
void main(){
  vec3 acc = vec3(0.0); float wsum = 0.0;
  float z0 = viewZ(texture2D(tDepth, vUv).x);
  float c0 = cocZ(z0);
  vec3 col0 = texture2D(tColor, vUv).rgb;
  acc += col0; wsum += 1.0;
  const int N = 72; const float GA = 2.39996323;
  for (int i = 1; i < N; i++) {
    float fi = float(i);
    float r = sqrt(fi / float(N)) * uMaxBlur;
    float a = fi * GA;
    vec2 o = vec2(cos(a), sin(a)) * r / uRes;
    vec2 suv = vUv + o;
    float zs = viewZ(texture2D(tDepth, suv).x);
    float cs = cocZ(zs);
    // a sample contributes when its own blur disc reaches this pixel; a sample behind a sharper pixel can't spill over it
    float eff = zs > z0 ? min(cs, c0) : cs;
    float reach = smoothstep(r - 1.5, r + 0.5, eff);
    vec3 s = texture2D(tColor, suv).rgb;
    float l = dot(s, vec3(0.3, 0.59, 0.11));
    float w = reach * (1.0 + 2.0 * smoothstep(1.0, 6.0, l));
    acc += s * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, 1.0);
}`;

const SAN_FRAG = /* glsl */ `
uniform sampler2D tColor; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  gl_FragColor = vec4(clamp(c, 0.0, 400.0), 1.0);
}`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform float uThr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tColor, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThr, uThr * 2.5, l), 1.0); }`;

const HBLUR_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform vec2 uRes; uniform float uSpread; varying vec2 vUv;
void main(){ vec3 a = vec3(0.0); float ws = 0.0;
  for (int i = -24; i <= 24; i++){ float fi = float(i); float w = exp(-abs(fi) / 9.0); a += texture2D(tColor, vUv + vec2(fi * uSpread / uRes.x, 0.0)).rgb * w; ws += w; }
  gl_FragColor = vec4(a / ws, 1.0); }`;

const FINAL_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tStreak; uniform vec2 uRes; uniform float uTime, uFrame;
uniform float uExposure, uStreak, uVig, uGrain, uCA, uSat, uContrast, uFade, uFlash, uZoom, uGlitch;
uniform vec3 uLift, uGamma, uGain;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 sampleHDR(vec2 uv){
  vec2 d = uv - 0.5; float r2 = dot(d, d);
  vec2 off = d * r2 * uCA * 0.012;
  vec3 c;
  c.r = texture2D(tColor, uv - off).r; c.g = texture2D(tColor, uv).g; c.b = texture2D(tColor, uv + off).b;
  return c;
}
void main(){
  vec2 uv = vUv;
  if (uGlitch > 0.0) {
    float band = floor(uv.y * 38.0 + floor(uFrame * 0.5) * 7.0);
    float g = step(1.0 - uGlitch * 0.55, h12(vec2(band, floor(uFrame))));
    uv.x += g * (h12(vec2(band, uFrame + 3.0)) - 0.5) * 0.12 * uGlitch;
  }
  vec3 col;
  if (uZoom > 0.0) {
    col = vec3(0.0); vec2 d = uv - 0.5;
    for (int i = 0; i < 16; i++){ float k = 1.0 - uZoom * 0.18 * float(i) / 15.0; col += sampleHDR(0.5 + d * k); }
    col /= 16.0;
  } else col = sampleHDR(uv);
  if (uGlitch > 0.0) { float s = uGlitch * 0.006; col.r = mix(col.r, texture2D(tColor, uv + vec2(s, 0.0)).r, 0.8); col.b = mix(col.b, texture2D(tColor, uv - vec2(s, 0.0)).b, 0.8); }
  vec3 st = texture2D(tStreak, uv).rgb;
  col += st * vec3(0.55, 0.75, 1.25) * uStreak;
  col *= uExposure;
  col = aces(col);
  // grade in display-ish space
  col = pow(max(col, 0.0), 1.0 / uGamma);
  col = col * uGain + uLift * (1.0 - col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.18) * uContrast + 0.18;
  vec2 dv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  col *= mix(1.0, smoothstep(1.25, 0.25, length(dv)), uVig);
  col = clamp(col, 0.0, 1.0);
  col = toSRGB(col);
  float n = h12(vUv * uRes + vec2(uFrame * 37.0, uFrame * 91.0)) + h12(vUv * uRes * 0.5 + uFrame * 13.0) - 1.0;
  col += n * uGrain * (0.35 + 0.65 * (1.0 - l));
  col = mix(col, vec3(1.0), uFlash);
  col *= 1.0 - uFade;
  gl_FragColor = vec4(col, 1.0);
}`;

const MIX_FRAG = /* glsl */ `
uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; varying vec2 vUv;
void main(){ gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, uMix), 1.0); }`;

const quad = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
  new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }));

type Loader = () => SceneMod;

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  cam: THREE.PerspectiveCamera;
  mods: Record<string, SceneMod> = {};
  ready: Promise<void>;
  isReady = false;
  private px = new Uint8Array(4);
  private rtScene: THREE.WebGLRenderTarget;
  private rtDof: THREE.WebGLRenderTarget;
  private rtSan: THREE.WebGLRenderTarget;
  private qSan: FullScreenQuad;
  private rtB1: THREE.WebGLRenderTarget;
  private rtB2: THREE.WebGLRenderTarget;
  private rtOutA: THREE.WebGLRenderTarget;
  private rtOutB: THREE.WebGLRenderTarget;
  private bloom: UnrealBloomPass;
  private qDof: FullScreenQuad;
  private qBright: FullScreenQuad;
  private qHBlur: FullScreenQuad;
  private qFinal: FullScreenQuad;
  private qMix: FullScreenQuad;

  constructor(loaders: Record<string, Loader>) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = W + "px";
    this.canvas.style.height = H + "px";
    this.cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);

    const hdr = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...hdr, samples: Number(new URLSearchParams(location.search).get("msaa") ?? MSAA), depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
    this.rtDof = new THREE.WebGLRenderTarget(W, H, hdr);
    this.rtSan = new THREE.WebGLRenderTarget(W, H, hdr);
    this.qSan = quad(SAN_FRAG, { tColor: { value: null } });
    this.rtB1 = new THREE.WebGLRenderTarget(W / 4, H / 4, hdr);
    this.rtB2 = new THREE.WebGLRenderTarget(W / 4, H / 4, hdr);
    this.rtOutA = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType });
    this.rtOutB = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.8);

    this.qDof = quad(DOF_FRAG, {
      tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(W, H) },
      uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 1 }, uAperture: { value: 1 }, uMaxBlur: { value: 0 },
    });
    this.qBright = quad(BRIGHT_FRAG, { tColor: { value: null }, uThr: { value: 1.2 } });
    this.qHBlur = quad(HBLUR_FRAG, { tColor: { value: null }, uRes: { value: new THREE.Vector2(W / 4, H / 4) }, uSpread: { value: 1 } });
    this.qFinal = quad(FINAL_FRAG, {
      tColor: { value: null }, tStreak: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uTime: { value: 0 }, uFrame: { value: 0 },
      uExposure: { value: 1 }, uStreak: { value: 0 }, uVig: { value: 0 }, uGrain: { value: 0 }, uCA: { value: 0 }, uSat: { value: 1 },
      uContrast: { value: 1 }, uFade: { value: 0 }, uFlash: { value: 0 }, uZoom: { value: 0 }, uGlitch: { value: 0 },
      uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    });
    this.qMix = quad(MIX_FRAG, { tA: { value: null }, tB: { value: null }, uMix: { value: 0 } });

    this.ready = loadFonts().then(async () => {
      for (const [k, f] of Object.entries(loaders)) this.mods[k] = f();
      await Promise.all(Object.values(this.mods).map((m) => m.ready));
      for (const m of Object.values(this.mods)) m.init?.(this.renderer);
      this.isReady = true;
    });
  }

  private renderShot(shot: Shot, gt: number, target: THREE.WebGLRenderTarget | null) {
    const r = this.renderer;
    const mod = this.mods[shot.scene];
    const lt = gt - shot.t0 + (shot.o ?? 0);
    const look: Look = { ...BASE_LOOK, ...mod.update({ lt, gt, shot, cam: this.cam }) };
    if (shot.glitch) {
      // a short burst of picture tear on every montage cut
      const k = gt - shot.t0;
      look.glitch = Math.max(look.glitch, shot.glitch * (k < 0.1 ? 1 : 0));
      look.flash = Math.max(look.flash, k < 0.034 ? 0.35 : 0);
    }
    // shot-level fade in/out
    if (shot.fi) look.fade = Math.max(look.fade, 1 - clamp((gt - shot.t0) / shot.fi));
    if (shot.fo) look.fade = Math.max(look.fade, 1 - clamp((shot.t1 - gt) / shot.fo));
    this.cam.aspect = W / H;
    this.cam.updateProjectionMatrix();

    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(mod.scene, this.cam);

    // sanitise: a single NaN/Inf pixel would otherwise be smeared by the bloom blur into a large black block
    (this.qSan.material as THREE.ShaderMaterial).uniforms.tColor.value = this.rtScene.texture;
    r.setRenderTarget(this.rtSan);
    this.qSan.render(r);
    let hdrTex: THREE.WebGLRenderTarget = this.rtSan;
    if (look.dof > 0.5) {
      const u = (this.qDof.material as THREE.ShaderMaterial).uniforms;
      u.tColor.value = this.rtSan.texture;
      u.tDepth.value = this.rtScene.depthTexture;
      u.uNear.value = this.cam.near;
      u.uFar.value = this.cam.far;
      u.uFocus.value = look.focus;
      u.uAperture.value = look.aperture;
      u.uMaxBlur.value = look.dof;
      r.setRenderTarget(this.rtDof);
      this.qDof.render(r);
      hdrTex = this.rtDof;
    }
    if (look.bloom > 0.001) {
      this.bloom.strength = look.bloom;
      this.bloom.radius = look.bloomRadius;
      this.bloom.threshold = look.bloomThreshold;
      this.bloom.render(r, null as unknown as THREE.WebGLRenderTarget, hdrTex, 0, false);
    }
    // anamorphic streak from the brightest highlights
    (this.qBright.material as THREE.ShaderMaterial).uniforms.tColor.value = hdrTex.texture;
    (this.qBright.material as THREE.ShaderMaterial).uniforms.uThr.value = Math.max(0.9, look.bloomThreshold * 1.4);
    r.setRenderTarget(this.rtB1);
    this.qBright.render(r);
    const hb = (this.qHBlur.material as THREE.ShaderMaterial).uniforms;
    hb.tColor.value = this.rtB1.texture;
    hb.uSpread.value = 1.5;
    r.setRenderTarget(this.rtB2);
    this.qHBlur.render(r);
    hb.tColor.value = this.rtB2.texture;
    hb.uSpread.value = 5.0;
    r.setRenderTarget(this.rtB1);
    this.qHBlur.render(r);

    const u = (this.qFinal.material as THREE.ShaderMaterial).uniforms;
    u.tColor.value = hdrTex.texture;
    u.tStreak.value = this.rtB1.texture;
    u.uTime.value = gt;
    u.uFrame.value = Math.round(gt * 30);
    u.uExposure.value = look.exposure;
    u.uStreak.value = look.streak;
    u.uVig.value = look.vignette;
    u.uGrain.value = look.grain;
    u.uCA.value = look.ca;
    u.uSat.value = look.sat;
    u.uContrast.value = look.contrast;
    u.uFade.value = clamp(look.fade);
    u.uFlash.value = clamp(look.flash);
    u.uZoom.value = look.zoomBlur;
    u.uGlitch.value = look.glitch;
    u.uLift.value.set(...look.lift);
    u.uGamma.value.set(...look.gamma);
    u.uGain.value.set(...look.gain);
    r.setRenderTarget(target);
    this.qFinal.render(r);
  }

  render(gt: number) {
    const r = this.renderer;
    const act = shotsAt(gt);
    if (act.length === 0) {
      r.setRenderTarget(null);
      r.setClearColor(0x000000, 1);
      r.clear();
    } else if (act.length === 1 || !act[1].xf) {
      this.renderShot(act[act.length - 1], gt, null);
    } else {
      // act[1] dissolves in over act[1].xf seconds on top of act[0]
      const [a, b] = act;
      this.renderShot(a, gt, this.rtOutA);
      this.renderShot(b, gt, this.rtOutB);
      const u = (this.qMix.material as THREE.ShaderMaterial).uniforms;
      u.tA.value = this.rtOutA.texture;
      u.tB.value = this.rtOutB.texture;
      u.uMix.value = clamp((gt - b.t0) / (b.xf as number));
      r.setRenderTarget(null);
      this.qMix.render(r);
    }
    const gl = r.getContext();
    gl.finish();
    // a 1-pixel read forces the GPU to finish every tile before Remotion takes the screenshot
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.px);
  }
}

let _engine: Engine | null = null;
let _loaders: Record<string, Loader> | null = null;
export const registerScenes = (l: Record<string, Loader>) => {
  _loaders = l;
};
export const engine = () => {
  if (!_engine) _engine = new Engine(_loaders as Record<string, Loader>);
  return _engine;
};
export { CUT };
