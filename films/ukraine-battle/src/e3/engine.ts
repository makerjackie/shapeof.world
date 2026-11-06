// 样片E in three.js: the same scene as blender/battlefield.py, rendered in real time. Blender only lays it out and
// exports it (blender/export3_scene.py, export3_tanks.py → public/e3/): camera paths, the tanks with their baked paint,
// tree and wheat placements, the detailed patch. Here: terrain from the Copernicus DEM under the Sentinel-2 image,
// the patch with Poly Haven aerial textures, instanced trees and wheat, the tanks, smoke and dust as lit sprites,
// sky and light from the same HDRI and sun. Scene coordinates are Blender's (metres, Z up) inside a root group that
// turns them Y up.
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { getInputProps, staticFile } from "remotion";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

export const W = 1920;
export const H = 1080;
const url = (p: string) => staticFile(`e3/${p}`);
// look knobs, overridable from Remotion input props while tuning (e.g. --props '{"skyRot":0.7}')
const K = { debug: 0, skyRot: NaN, exposure: 1.0, contrast: 1.3, sat: 1.12, wheatGlow: 0.04, wheatK: 0.75, leafK: 0.45, holes: 0.88, vegEnv: 0.45, nrm: 1, dustA: 0.55, ...(getInputProps() as Record<string, number>) };

type Mat = number[];
type FxV = { m: Mat; k: number | null; e: number | null };
export type Frame = { f: number; cam: Mat; lens: number; sensor: number; focus: number; fstop: number; tanks: { m: Mat; dist: number }[]; fx: Record<string, FxV>; flash: number };
type Meta = {
  CX: number;
  CY: number;
  EXAG: number;
  H0: number;
  PATCH: number;
  FX: [number, number, number, number];
  EXP: number;
  SHOTS: Record<string, [number, number]>;
  gz: number;
  patch: { x0: number; y0: number; nx: number; ny: number; step: number };
  sun: { dir: number[]; strength: number; color: number[] };
  sky: { rot: number; strength: number };
  tanks: string[];
  radii: Record<string, number[]>;
  spinners: Record<string, string[]>;
};

// ---------------------------------------------------------------- GLSL helpers
const NOISE = /* glsl */ `
float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float vnoise(vec3 p){ return 0.5 + 0.5 * snoise(p); }
float fbm(vec3 p, int oct){ float a = 0.5, s = 0.0, n = 0.0; for (int i = 0; i < 8; i++){ if (i >= oct) break; s += a * vnoise(p); n += a; p = p * 2.03 + 7.1; a *= 0.5; } return s / n; }
float sstep(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float voro(vec3 p){
  vec3 i = floor(p), f = fract(p); float d = 1.5;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(h13(i + g), h13(i + g + 17.1), h13(i + g + 31.7));
    d = min(d, length(g + o - f));
  }
  return d;
}
vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
`;

// the satellite colour exactly as blender/battlefield.py sat_material does it (linear colour)
const SAT = /* glsl */ `
uniform sampler2D tSat; uniform vec4 uFX;
vec3 satColor(vec3 w){
  vec2 uv = vec2((w.x - uFX.x) / (uFX.y - uFX.x), (w.y - uFX.z) / (uFX.w - uFX.z));
  vec3 c = texture2D(tSat, uv).rgb;
  vec3 h = rgb2hsv(c); h.y *= 0.85; h.z *= 0.95; c = hsv2rgb(h);
  c = max(c * 1.12 - 0.06, 0.0);
  float nz = fbm(w * 0.08, 6);
  return mix(c, vec3(0.05, 0.04, 0.03), nz * 0.18);
}
`;

const PATCH = /* glsl */ `
uniform sampler2D tGrass; uniform sampler2D tDirt; uniform sampler2D tMud;
varying vec4 vAttr;
vec3 patchColor(vec3 w, vec3 col){
  // two scales of the grass texture blended by noise so its 7 m tiles do not line up into a grid far away
  float df = 1.0 - smoothstep(60.0, 260.0, length(vViewPosition));
  float bn = fbm(w * 0.05, 3);
  vec3 grass = mix(texture2D(tGrass, w.xy / 7.0).rgb, texture2D(tGrass, mat2(0.8, -0.6, 0.6, 0.8) * w.xy / 19.3).rgb, smoothstep(0.35, 0.65, bn));
  vec3 dirt = texture2D(tDirt, w.xy / 6.0).rgb;
  vec3 mud = texture2D(tMud, vec2(-w.y, w.x) / 5.0).rgb;
  float bw = dot(grass, vec3(0.2126, 0.7152, 0.0722));
  float k = mix(0.6, 1.45, clamp((bw - 0.1) / 0.5, 0.0, 1.0));
  vec3 avg = texture2D(tGrass, vec2(0.5), 16.0).rgb; // the texture's smallest mip: its average colour
  vec3 det = mix(mix(col, avg, 0.25), mix(col * k, grass, 0.25), df);
  det = mix(det, dirt * vec3(0.8, 0.75, 0.7), vAttr.y * 0.85);
  vec3 scorched = mix(vec3(0.018, 0.015, 0.012), vec3(0.05, 0.04, 0.03), fbm(w * 1.5, 3));
  det = mix(det, scorched, sstep(0.05, 0.4, vAttr.x));
  det = mix(det, mud, vAttr.z * 0.9);
  return mix(col, det, vAttr.w);
}
`;

// ---------------------------------------------------------------- loading
const bin = async (p: string) => (await fetch(p)).arrayBuffer();
const json = async <T>(p: string) => (await (await fetch(p)).json()) as T;
const tex = (p: string, srgb = true, repeat = false) =>
  new Promise<THREE.Texture>((res, rej) =>
    new THREE.TextureLoader().load(
      p,
      (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        res(t);
      },
      undefined,
      rej,
    ),
  );
const gltf = (p: string) => new Promise<THREE.Group>((res, rej) => new GLTFLoader().load(p, (g) => res(g.scene), undefined, rej));

// a grid of heights as a mesh (rows along y, columns along x)
function grid(nx: number, ny: number, x0: number, y0: number, dx: number, dy: number, z: (i: number, j: number) => number) {
  const pos = new Float32Array(nx * ny * 3);
  for (let i = 0; i < ny; i++)
    for (let j = 0; j < nx; j++) {
      const k = (i * nx + j) * 3;
      pos[k] = x0 + j * dx;
      pos[k + 1] = y0 + i * dy;
      pos[k + 2] = z(i, j);
    }
  const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let n = 0;
  for (let i = 0; i < ny - 1; i++)
    for (let j = 0; j < nx - 1; j++) {
      const a = i * nx + j;
      idx[n++] = a;
      idx[n++] = a + 1;
      idx[n++] = a + nx + 1;
      idx[n++] = a;
      idx[n++] = a + nx + 1;
      idx[n++] = a + nx;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

// a soft smoke puff (4 variants in a 2x2 atlas): alpha from a noisy round blob, rgb = a fake normal's z for shading
function puffAtlas() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S * 2;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S * 2, S * 2);
  const hash = (x: number, y: number, s: number) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const vn = (x: number, y: number, s: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    const fx = x - ix,
      fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx),
      uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s),
      b = hash(ix + 1, iy, s),
      cc = hash(ix, iy + 1, s),
      d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy;
  };
  const fb = (x: number, y: number, s: number) => {
    let a = 0.5,
      t = 0,
      n = 0;
    for (let o = 0; o < 5; o++) {
      t += a * vn(x, y, s + o * 13);
      n += a;
      x *= 2.07;
      y *= 2.07;
      a *= 0.5;
    }
    return t / n;
  };
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * S,
      oy = Math.floor(v / 2) * S;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const px = (x / S) * 2 - 1,
          py = (y / S) * 2 - 1;
        const r = Math.hypot(px, py);
        const n = fb(x / 38 + v * 5.3, y / 38, v);
        const blob = Math.max(0, 1 - Math.pow(r / (0.62 + 0.38 * n), 2.2));
        const a = Math.min(1, blob * (0.55 + 0.9 * n));
        // shading term: lighter at the top-left of each puff
        const sh = Math.min(1, Math.max(0, 0.55 - 0.35 * py - 0.15 * px + 0.4 * (n - 0.5)));
        const k = ((oy + y) * S * 2 + ox + x) * 4;
        img.data[k] = sh * 255;
        img.data[k + 1] = n * 255;
        img.data[k + 2] = 0;
        img.data[k + 3] = a * 255;
      }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------------- sprites (smoke, dust, fire)
type Puff = { p: THREE.Vector3; size: number; a: number; col: THREE.Color; emis: number; rot: number; v: number };
class Sprites {
  mesh: THREE.InstancedMesh;
  max: number;
  aPos: THREE.InstancedBufferAttribute;
  aSize: THREE.InstancedBufferAttribute;
  aCol: THREE.InstancedBufferAttribute;
  aMisc: THREE.InstancedBufferAttribute;
  mat: THREE.ShaderMaterial;
  constructor(max: number, atlas: THREE.Texture, sunDir: THREE.Vector3, sunCol: THREE.Color) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index;
    g.setAttribute("position", q.getAttribute("position"));
    g.setAttribute("uv", q.getAttribute("uv"));
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // rgb, alpha
    this.aMisc = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); // emission, rotation, variant
    for (const a of [this.aPos, this.aSize, this.aCol, this.aMisc]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iPos", this.aPos);
    g.setAttribute("iSize", this.aSize);
    g.setAttribute("iCol", this.aCol);
    g.setAttribute("iMisc", this.aMisc);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tPuff: { value: atlas }, uSunCol: { value: sunCol.clone().multiplyScalar(1) }, uSky: { value: new THREE.Color(0.32, 0.36, 0.42) }, uSunDir: { value: sunDir } },
      vertexShader: /* glsl */ `
        attribute vec3 iPos; attribute float iSize; attribute vec4 iCol; attribute vec3 iMisc;
        varying vec2 vUv; varying vec4 vCol; varying float vEmis; varying float vSunSide;
        uniform vec3 uSunDir;
        void main(){
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          float c = cos(iMisc.y), s = sin(iMisc.y);
          vec2 q = mat2(c, -s, s, c) * position.xy;
          mv.xy += q * iSize;
          gl_Position = projectionMatrix * mv;
          float v = iMisc.z;
          vUv = (uv + vec2(mod(v, 2.0), floor(v / 2.0))) * 0.5;
          vCol = iCol; vEmis = iMisc.x;
          // how much the sun lights this side of the cloud as seen from the camera
          vec3 sd = normalize((viewMatrix * vec4(-uSunDir, 0.0)).xyz);
          vSunSide = 0.5 + 0.5 * sd.y;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tPuff; uniform vec3 uSunCol; uniform vec3 uSky;
        varying vec2 vUv; varying vec4 vCol; varying float vEmis; varying float vSunSide;
        void main(){
          vec4 t = texture2D(tPuff, vUv);
          float a = t.a * vCol.a;
          if (a < 0.003) discard;
          float lit = mix(0.35, 1.0, t.r) * (0.55 + 0.45 * vSunSide);
          vec3 rad = vCol.rgb * (uSky * 1.6 + uSunCol * 0.9 * lit);
          rad += vec3(1.0, 0.45, 0.12) * vEmis * (0.4 + 0.6 * t.g);
          gl_FragColor = vec4(rad * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }
  set(puffs: Puff[], camPos: THREE.Vector3) {
    // back to front
    puffs.sort((a, b) => b.p.distanceToSquared(camPos) - a.p.distanceToSquared(camPos));
    const n = Math.min(puffs.length, this.max);
    for (let i = 0; i < n; i++) {
      const q = puffs[i];
      this.aPos.setXYZ(i, q.p.x, q.p.y, q.p.z);
      this.aSize.setX(i, q.size);
      this.aCol.setXYZW(i, q.col.r, q.col.g, q.col.b, q.a);
      this.aMisc.setXYZ(i, q.emis, q.rot, q.v);
    }
    this.mesh.count = n;
    for (const a of [this.aPos, this.aSize, this.aCol, this.aMisc]) a.needsUpdate = true;
  }
}

const rnd = (i: number, s: number) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------- the engine
export class E3 {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  root = new THREE.Group();
  camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 60000);
  composer!: EffectComposer;
  gtao!: GTAOPass;
  sun = new THREE.DirectionalLight();
  flash = new THREE.PointLight(0xff9a4d, 0, 0, 2);
  meta!: Meta;
  frames = new Map<number, Frame>();
  tanks: { obj: THREE.Object3D; wheels: { o: THREE.Object3D; r: number }[] }[] = [];
  wheatNear: { mesh: THREE.InstancedMesh; variant: number }[] = [];
  wheatFar!: THREE.InstancedMesh;
  wheatM!: Float32Array; // 16 per instance
  wheatV!: Uint8Array;
  wheatP!: Float32Array; // xyz per instance
  sprites!: Sprites;
  sunDir = new THREE.Vector3();
  timeU = { value: 0 };
  ready: Promise<void>;
  isReady = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = K.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.root.rotation.x = -Math.PI / 2; // Blender Z up -> three Y up
    this.scene.add(this.root);
    this.root.add(this.camera);
    this.camera.matrixAutoUpdate = false;
    this.ready = this.load().then(() => {
      this.isReady = true;
    });
  }

  async load() {
    const m = (this.meta = await json<Meta>(url("scene.json")));
    // per-frame data of all four shots
    const shots = await Promise.all(["A", "B", "C", "D"].map((s) => json<{ frames: Frame[] }>(url(`shot_${s}.json`))));
    for (const s of shots) for (const f of s.frames) this.frames.set(f.f, f);

    // sky and image-based light
    const sky = await new Promise<THREE.DataTexture>((res, rej) => new EXRLoader().setDataType(THREE.HalfFloatType).load(url("sky.exr"), res, undefined, rej));
    sky.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = pm.fromEquirectangular(sky).texture;
    this.scene.background = sky;
    this.scene.environment = env;
    // three samples the sky at Ry(-rotation)·dir; Blender at Rz(rot)·dir with its own equirect origin: this lines them up
    const rot = Number.isNaN(K.skyRot) ? Math.PI - m.sky.rot : K.skyRot;
    this.scene.backgroundRotation.set(0, rot, 0);
    this.scene.environmentRotation.set(0, rot, 0);
    this.scene.backgroundIntensity = m.sky.strength;
    this.scene.environmentIntensity = m.sky.strength;

    // sun
    this.sunDir.fromArray(m.sun.dir).normalize();
    this.sun.color.setRGB(m.sun.color[0], m.sun.color[1], m.sun.color[2]);
    this.sun.intensity = m.sun.strength;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.root.add(this.sun, this.sun.target);
    this.root.add(this.flash);

    // terrain: DEM + satellite
    const [demBuf, satT, patchBuf, attrBuf, grassT, dirtT, mudT, grassN] = await Promise.all([
      bin(staticFile("dem80.f32")),
      tex(staticFile("s2-2023-06-05.jpg")),
      bin(url("patch.f32")),
      bin(url("patch_attr.u8")),
      tex(url("tex/aerial_grass_rock/diff.jpg"), true, true),
      tex(url("tex/dirt_aerial_03/diff.jpg"), true, true),
      tex(url("tex/aerial_mud_1/diff.jpg"), true, true),
      tex(url("tex/aerial_grass_rock/nor.jpg"), false, true),
    ]);
    satT.anisotropy = 16;
    const DEM = new Float32Array(demBuf);
    const [FX0, FX1, FY0, FY1] = m.FX;
    const demH = (x: number, y: number) => {
      let u = ((x - FX0) / (FX1 - FX0)) * 500 - 0.5;
      let v = ((FY1 - y) / (FY1 - FY0)) * 550 - 0.5;
      u = Math.min(Math.max(u, 0), 498.999);
      v = Math.min(Math.max(v, 0), 548.999);
      const i0 = Math.floor(v),
        j0 = Math.floor(u);
      const fu = u - j0,
        fv = v - i0;
      const a = DEM[i0 * 500 + j0],
        b = DEM[i0 * 500 + j0 + 1],
        c = DEM[(i0 + 1) * 500 + j0],
        d = DEM[(i0 + 1) * 500 + j0 + 1];
      return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
    };
    const Hh = (x: number, y: number) => (demH(x, y) - m.H0) * m.EXAG;
    const satU = { tSat: { value: satT }, uFX: { value: new THREE.Vector4(FX0, FX1, FY0, FY1) } };
    const ground = (patch: boolean) => {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
      if (patch && K.nrm) {
        mat.normalMap = grassN;
        mat.normalScale.set(0.7, 0.7);
      }
      // the materials share this function's source, which is three's program cache key: give each its own
      mat.customProgramCacheKey = () => (patch ? "e3-patch" : "e3-field");
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, satU, patch ? { tGrass: { value: grassT }, tDirt: { value: dirtT }, tMud: { value: mudT } } : {});
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", `#include <common>\nvarying vec3 vW;${patch ? "\nattribute vec4 attr; varying vec4 vAttr;" : ""}`)
          .replace("#include <begin_vertex>", `#include <begin_vertex>\nvW = position;${patch ? "\nvAttr = attr;" : ""}`);
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", `#include <common>\nvarying vec3 vW;\n${NOISE}\n${SAT}\n${patch ? PATCH : ""}`)
          .replace("#include <map_fragment>", `vec3 gc = satColor(vW);${patch ? "\ngc = patchColor(vW, gc);" : ""}\ndiffuseColor.rgb = gc;`)
          .replace("#include <normal_fragment_maps>", THREE.ShaderChunk.normal_fragment_maps.replace("mapN.xy *= normalScale;", "mapN.xy *= normalScale * (1.0 - smoothstep(25.0, 90.0, length(vViewPosition)));"));
      };
      return mat;
    };
    // the whole field, lowered where the patch lies
    const P = m.PATCH;
    const g1 = grid(501, 551, FX0, FY0, (FX1 - FX0) / 500, (FY1 - FY0) / 550, (i, j) => {
      const x = FX0 + (j * (FX1 - FX0)) / 500,
        y = FY0 + (i * (FY1 - FY0)) / 550;
      const z = Hh(x, y);
      return Math.abs(x - m.CX) < P - 60 && Math.abs(y - m.CY) < P - 60 ? z - 3 : z;
    });
    const field = new THREE.Mesh(g1, ground(false));
    field.receiveShadow = true;
    this.root.add(field);
    // the detailed patch
    const PZ = new Float32Array(patchBuf);
    const pa = m.patch;
    const g2 = grid(pa.nx, pa.ny, pa.x0, pa.y0, pa.step, pa.step, (i, j) => PZ[i * pa.nx + j]);
    g2.setAttribute("attr", new THREE.BufferAttribute(new Uint8Array(attrBuf), 4, true));
    const pos2 = g2.getAttribute("position");
    const uv2 = new Float32Array(pos2.count * 2);
    for (let i = 0; i < pos2.count; i++) {
      uv2[i * 2] = pos2.getX(i) / 7;
      uv2[i * 2 + 1] = pos2.getY(i) / 7;
    }
    g2.setAttribute("uv", new THREE.BufferAttribute(uv2, 2));
    const patch = new THREE.Mesh(g2, ground(true));
    patch.receiveShadow = true;
    patch.castShadow = true;
    this.root.add(patch);

    // trees
    const [treeG, treeBuf] = await Promise.all([gltf(url("trees.glb")), bin(url("trees.f32"))]);
    const T = new Float32Array(treeBuf);
    const nT = T.length / 7;
    const bark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.075, 0.062, 0.05), roughness: 0.9 });
    const leaf = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: K.vegEnv });
    leaf.customProgramCacheKey = () => "e3-leaf";
    leaf.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vO; varying float vTint;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvO = position;\n#ifdef USE_INSTANCING\nvTint = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].y * 0.071);\n#else\nvTint = 0.5;\n#endif");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vO; varying float vTint;\n${NOISE}`)
        .replace(
          "#include <map_fragment>",
          `float nz = fbm(vO * 6.0, 4);
           vec3 lc = mix(vec3(0.018, 0.03, 0.01), vec3(0.07, 0.095, 0.03), nz);
           lc *= mix(0.8, 1.2, vTint) * ${K.leafK.toFixed(3)};
           diffuseColor.rgb = lc;
           float vd = voro(vO * 14.0);
           vec3 vdir = normalize(vViewPosition);
           float facing = 1.0 - abs(dot(normalize(vNormal), vdir));
           float hole = vd + 0.9 * pow(facing, 1.6);
           if (hole > ${K.holes.toFixed(3)}) discard;`,
        );
    };
    const tdummy = new THREE.Object3D();
    const meshes: THREE.Mesh[] = [];
    treeG.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    // each tree node has two primitives (bark, leaves) in slot order; group them by node
    const variants: THREE.Mesh[][] = [];
    treeG.children.forEach((c) => {
      const ms: THREE.Mesh[] = [];
      c.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) ms.push(o as THREE.Mesh);
      });
      variants.push(ms);
    });
    for (let v = 0; v < variants.length; v++) {
      const sel: number[] = [];
      for (let i = 0; i < nT; i++) if (Math.round(T[i * 7 + 5]) === v) sel.push(i);
      variants[v].forEach((src, pi) => {
        const im = new THREE.InstancedMesh(src.geometry, pi === 0 ? bark : leaf, sel.length);
        sel.forEach((i, k) => {
          tdummy.position.set(T[i * 7], T[i * 7 + 1], T[i * 7 + 2] - 0.3);
          tdummy.rotation.set(0, 0, T[i * 7 + 3]);
          tdummy.scale.setScalar(T[i * 7 + 4]);
          tdummy.updateMatrix();
          im.setMatrixAt(k, tdummy.matrix);
        });
        im.castShadow = true;
        im.receiveShadow = true;
        im.frustumCulled = false;
        this.root.add(im);
      });
    }

    // wheat: near plants from the GLB, far ones as two crossed strips; both re-filled per frame
    const [wheatG, wheatBuf] = await Promise.all([gltf(url("wheat.glb")), bin(url("wheat.f32"))]);
    const WB = new Float32Array(wheatBuf);
    const nW = WB.length / 9;
    this.wheatM = new Float32Array(nW * 16);
    this.wheatV = new Uint8Array(nW);
    this.wheatP = new Float32Array(nW * 3);
    const mm = new THREE.Matrix4();
    const qq = new THREE.Quaternion();
    const pp = new THREE.Vector3();
    const ss = new THREE.Vector3();
    for (let i = 0; i < nW; i++) {
      const b = i * 9;
      pp.set(WB[b], WB[b + 1], WB[b + 2]);
      qq.set(WB[b + 3], WB[b + 4], WB[b + 5], WB[b + 6]);
      ss.setScalar(WB[b + 7]);
      mm.compose(pp, qq, ss);
      mm.toArray(this.wheatM, i * 16);
      this.wheatV[i] = WB[b + 8];
      this.wheatP.set([WB[b], WB[b + 1], WB[b + 2]], i * 3);
    }
    const wheatMat = (ear: boolean) => {
      // a dense field shades itself: less sky reflection than an open surface would get
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: K.vegEnv });
      const base = ear ? "vec3(0.24, 0.26, 0.07)" : "vec3(0.07, 0.12, 0.025)";
      const tip = ear ? "vec3(0.38, 0.33, 0.11)" : "vec3(0.22, 0.25, 0.06)";
      mat.customProgramCacheKey = () => (ear ? "e3-ear" : "e3-stem");
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = this.timeU;
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uTime; varying float vZ; varying float vR;")
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             vZ = position.z;
             vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].y);
             vR = fract(sin(dot(ip, vec2(12.9898, 78.233))) * 43758.5453);
             float sway = sin(uTime * 1.3 + ip.x * 0.35 + ip.y * 0.21) * 0.6 + sin(uTime * 2.9 + ip.x * 1.7) * 0.25;
             transformed.x += sway * 0.035 * position.z * position.z;`,
          );
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vZ; varying float vR;")
          .replace(
            "#include <map_fragment>",
            `float t = clamp((vZ - 0.2) / 0.75, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
             vec3 c = mix(${base}, ${tip}, t);
             c = mix(c, vec3(0.4, 0.38, 0.12), vR * 0.5);
             diffuseColor.rgb = c * ${K.wheatK.toFixed(3)};`,
          )
          // a little light through the blades (Blender mixed 35% translucent)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * ${K.wheatGlow.toFixed(3)};`);
      };
      return mat;
    };
    const stemM = wheatMat(false);
    const earM = wheatMat(true);
    wheatG.children.forEach((c, v) => {
      const ms: THREE.Mesh[] = [];
      c.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) ms.push(o as THREE.Mesh);
      });
      ms.forEach((src, pi) => {
        const im = new THREE.InstancedMesh(src.geometry, pi === 0 ? stemM : earM, 60000);
        im.count = 0;
        im.frustumCulled = false;
        im.castShadow = true;
        im.receiveShadow = true;
        this.root.add(im);
        this.wheatNear.push({ mesh: im, variant: v });
      });
    });
    // far plants: two crossed strips 0.9 m tall, the top 12 cm wider (the ear)
    const fg = new THREE.BufferGeometry();
    const fp: number[] = [];
    const fz: number[] = [];
    for (const ang of [0, Math.PI / 2]) {
      const cx = Math.cos(ang),
        cy = Math.sin(ang);
      const quad = (z0: number, z1: number, w0: number, w1: number) => {
        const v = [
          [-w0, z0],
          [w0, z0],
          [w1, z1],
          [-w0, z0],
          [w1, z1],
          [-w1, z1],
        ];
        for (const [w, z] of v) {
          fp.push(cx * w, cy * w, z);
          fz.push(z);
        }
      };
      quad(0, 0.78, 0.004, 0.003);
      quad(0.78, 0.9, 0.007, 0.006);
    }
    fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    fg.computeVertexNormals();
    const farM = wheatMat(false);
    this.wheatFar = new THREE.InstancedMesh(fg, farM, 200000);
    this.wheatFar.count = 0;
    this.wheatFar.frustumCulled = false;
    this.wheatFar.receiveShadow = true;
    this.root.add(this.wheatFar);

    // tanks
    const tankGs = await Promise.all(m.tanks.map((n) => gltf(url(`tank_${n}.glb`))));
    tankGs.forEach((g, k) => {
      const name = m.tanks[k];
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      holder.add(g);
      const wheels: { o: THREE.Object3D; r: number }[] = [];
      const radii = m.radii[name];
      const spin = m.spinners[name];
      // GLTFLoader drops the "." of Blender's ".001" suffix: match a spinner name followed by digits only
      const san = (s: string) => s.replace(/[[\].:/]/g, "").replace(/\s/g, "_");
      const keys = spin.map(san);
      g.traverse((o) => {
        let best = -1;
        keys.forEach((s, i) => {
          if ((o.name === s || (o.name.startsWith(s) && /^\d+$/.test(o.name.slice(s.length)))) && (best < 0 || s.length > keys[best].length)) best = i;
        });
        if (best >= 0 && !wheels.some((w) => w.o === o.parent)) wheels.push({ o, r: radii[best] });
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
        }
      });
      this.root.add(holder);
      this.tanks.push({ obj: holder, wheels });
    });

    // sprites
    this.sprites = new Sprites(4000, puffAtlas(), this.sunDir, this.sun.color.clone().multiplyScalar(this.sun.intensity * 0.25));
    this.root.add(this.sprites.mesh);

    // post: MSAA render, ground-truth AO, AgX output
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, W, H);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.85;
    this.composer.addPass(this.gtao);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uC: { value: K.contrast }, uS: { value: K.sat } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform sampler2D tDiffuse; uniform float uC; uniform float uS; varying vec2 vUv;
          void main(){
            vec3 c = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0);
            vec3 p = pow(c, vec3(uC)); vec3 q = pow(1.0 - c, vec3(uC));
            c = p / (p + q);
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            gl_FragColor = vec4(clamp(mix(vec3(l), c, uS), 0.0, 1.0), 1.0);
          }`,
      }),
    );
  }

  // ---------------------------------------------------------------- per frame
  shotOf(f: number) {
    for (const [s, [a, b]] of Object.entries(this.meta.SHOTS)) if (f >= a && f <= b) return s;
    return "D";
  }

  render(f: number) {
    const fr = this.frames.get(f);
    if (!fr) return;
    const m = this.meta;
    const shot = this.shotOf(f);
    const t = (f - 1) / 24;
    this.timeU.value = t;
    // camera (a Blender camera looks down its -Z with Y up, as three's does)
    this.camera.matrix.fromArray(fr.cam);
    const hfov = 2 * Math.atan(fr.sensor / 2 / fr.lens);
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / (W / H)));
    this.camera.near = shot === "B" ? 1.0 : shot === "C" ? 1.0 : 0.25;
    this.camera.far = 60000;
    this.camera.updateProjectionMatrix();
    this.scene.updateMatrixWorld(true);
    const camB = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(fr.cam)); // Blender coords

    // tanks
    fr.tanks.forEach((tk, k) => {
      const T = this.tanks[k];
      T.obj.matrix.fromArray(tk.m);
      T.obj.matrixWorldNeedsUpdate = true;
      for (const w of T.wheels) w.o.rotation.x = -tk.dist / w.r;
    });

    // sun shadow box around what this shot looks at
    const focus = new THREE.Vector3(m.CX, m.CY + (shot === "A" ? 30 : 10), m.gz);
    const half = shot === "B" ? 700 : shot === "C" ? 70 : 90;
    if (shot === "B") focus.set(m.CX - 60, m.CY - 250, m.gz);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -half;
    sc.right = half;
    sc.top = half;
    sc.bottom = -half;
    sc.near = 1;
    sc.far = 6000;
    sc.updateProjectionMatrix();
    this.sun.position.copy(focus).addScaledVector(this.sunDir, -3000);
    this.sun.target.position.copy(focus);
    this.sun.shadow.needsUpdate = true;

    // fog only where Blender had its haze box (shot B)
    this.scene.fog = shot === "B" ? new THREE.FogExp2(new THREE.Color(0.62, 0.64, 0.68), 0.00012) : null;

    this.fillWheat(camB, fr);
    this.fillSprites(f, fr, camB);
    // the blast's light
    this.flash.intensity = fr.flash / 40;
    this.flash.position.set(m.CX, m.CY - 4.6, m.gz + 2);

    this.gtao.updateGtaoMaterial({ radius: shot === "B" ? 6 : 1.2, distanceExponent: 1, thickness: 1, scale: 1 });
    this.composer.render();
  }

  fillWheat(cam: THREE.Vector3, fr: Frame) {
    // frustum in Blender coordinates: camera axes from its matrix
    const M = new THREE.Matrix4().fromArray(fr.cam);
    const right = new THREE.Vector3().setFromMatrixColumn(M, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(M, 1).normalize();
    const back = new THREE.Vector3().setFromMatrixColumn(M, 2).normalize();
    const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * 1.15;
    const th = tv * (W / H);
    const NEAR = 30;
    const FAR = 260;
    const counts = this.wheatNear.map(() => 0);
    let nf = 0;
    const P = this.wheatP;
    const n = this.wheatV.length;
    const farArr = this.wheatFar.instanceMatrix.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const dx = P[i * 3] - cam.x,
        dy = P[i * 3 + 1] - cam.y,
        dz = P[i * 3 + 2] + 0.5 - cam.z;
      const z = -(dx * back.x + dy * back.y + dz * back.z);
      if (z < -1.5) continue;
      const x = dx * right.x + dy * right.y + dz * right.z;
      const y = dx * up.x + dy * up.y + dz * up.z;
      const zz = Math.max(z, 0.5);
      if (Math.abs(x) > th * zz + 1.5 || Math.abs(y) > tv * zz + 1.5) continue;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < NEAR) {
        const v = this.wheatV[i];
        for (let k = 0; k < this.wheatNear.length; k++) {
          const wn = this.wheatNear[k];
          if (wn.variant !== v) continue;
          const arr = wn.mesh.instanceMatrix.array as Float32Array;
          if (counts[k] < wn.mesh.instanceMatrix.count) {
            arr.set(this.wheatM.subarray(i * 16, i * 16 + 16), counts[k] * 16);
            counts[k]++;
          }
        }
      } else if (d < FAR && nf < this.wheatFar.instanceMatrix.count) {
        farArr.set(this.wheatM.subarray(i * 16, i * 16 + 16), nf * 16);
        nf++;
      }
    }
    this.wheatNear.forEach((wn, k) => {
      wn.mesh.count = counts[k];
      wn.mesh.instanceMatrix.needsUpdate = true;
    });
    this.wheatFar.count = nf;
    this.wheatFar.instanceMatrix.needsUpdate = true;
    if (K.debug) console.log("wheat", fr.f, "near", counts.join(","), "far", nf, "cam", cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1), "fov", this.camera.fov.toFixed(1));
  }

  fillSprites(f: number, fr: Frame, cam: THREE.Vector3) {
    const puffs: Puff[] = [];
    const m = this.meta;
    const t = (f - 1) / 24;
    const M = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const box = (fx: FxV | undefined, n: number, seed: number, opts: { col: THREE.Color; alpha: number; size: number; shape: (u: number, w: number, r: number) => number; rise?: number; emis?: number; lean?: number }) => {
      if (!fx || !fx.k || fx.k <= 0.001) return;
      M.fromArray(fx.m);
      const sx = new THREE.Vector3().setFromMatrixColumn(M, 0).length();
      for (let i = 0; i < n; i++) {
        let w = rnd(i, seed + 3) - 0.5;
        if (opts.rise) w = ((rnd(i, seed + 3) + t * opts.rise) % 1) - 0.5; // puffs climb through the box and wrap
        const ang = rnd(i, seed) * Math.PI * 2;
        const rr = Math.sqrt(rnd(i, seed + 1)) * 0.5;
        const zz = w + 0.5;
        const lean = (opts.lean ?? 0) * zz;
        const u0 = Math.cos(ang) * rr,
          v0 = Math.sin(ang) * rr;
        const dens = opts.shape(rr, w, zz);
        if (dens <= 0.01) continue;
        if (opts.lean === undefined) v.set(u0, v0, w);
        else v.set(u0 * (0.25 + zz * 1.3) + lean, v0 * (0.25 + zz * 1.3), w);
        v.applyMatrix4(M);
        // fade puffs in and out as they wrap
        const life = opts.rise ? Math.min(1, zz * 6, (1 - zz) * 2.5) : 1;
        puffs.push({
          p: v.clone(),
          size: sx * opts.size * (0.7 + 0.6 * rnd(i, seed + 5)) * (opts.lean !== undefined ? 0.4 + zz * 1.2 : 1),
          a: Math.min(1, fx.k * opts.alpha * dens * life),
          col: opts.col,
          emis: (opts.emis ?? 0) * (fx.e ?? 0),
          rot: rnd(i, seed + 6) * 6.28 + t * 0.15 * (rnd(i, seed + 7) - 0.5),
          v: Math.floor(rnd(i, seed + 8) * 4),
        });
      }
    };
    const dust = new THREE.Color(0.32, 0.28, 0.22);
    for (let k = 0; k < 4; k++) box(fr.fx[`dust${k}`], 90, 11 + k, { col: dust, alpha: K.dustA, size: 0.6, shape: (r, w) => (1 - r * 2) * (w < 0.2 ? 1 : 0.6), rise: 0.12 });
    box(fr.fx.fireball, 24, 41, { col: new THREE.Color(0.2, 0.12, 0.06), alpha: 0.6, size: 0.5, shape: (r) => 1 - r * 1.6, emis: 0.08 });
    box(fr.fx.earth, 140, 51, { col: new THREE.Color(0.07, 0.055, 0.04), alpha: 0.9, size: 0.32, shape: (r, w) => (1 - r * 1.8) * (w < 0.35 ? 1 : 0.4), rise: 0.03 });
    // the burning tank: a column of many overlapping soft puffs climbing through the plume shape of the Blender box
    // (narrow at the base, widening and leaning downwind, thinning at the top)
    const ts = fr.fx.tanksmoke;
    if (ts && ts.k && ts.k > 0.001) {
      M.fromArray(ts.m);
      const sx = new THREE.Vector3().setFromMatrixColumn(M, 0).length();
      const smoke = new THREE.Color(0.035, 0.034, 0.032);
      for (let i = 0; i < 320; i++) {
        const zz = (rnd(i, 61) + t * 0.11) % 1;
        const rad = 0.075 + 0.2 * zz;
        const ang = rnd(i, 62) * Math.PI * 2;
        const r = rad * 0.42 * Math.sqrt(rnd(i, 63));
        v.set(0.12 * zz + Math.cos(ang) * r + 0.03 * Math.sin(t * 0.7 + zz * 9), Math.sin(ang) * r, zz - 0.5).applyMatrix4(M);
        const life = Math.min(1, zz * 10, (1 - zz) * 2.2);
        puffs.push({ p: v.clone(), size: rad * sx * (1.2 + 0.7 * rnd(i, 64)), a: Math.min(1, (ts.k / 1.6) * 0.13 * life), col: smoke, emis: 0, rot: rnd(i, 65) * 6.28 + t * 0.2, v: Math.floor(rnd(i, 66) * 4) });
      }
    }
    this.sprites.set(puffs, cam);
  }
}

let ENGINE: E3 | null = null;
export const e3 = () => (ENGINE ??= new E3());
