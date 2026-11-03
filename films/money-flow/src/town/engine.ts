// The town in three.js, rendered synchronously per frame: render(t) sets every animated value from film time t.
// Blue hour over a miniature town of 100 households (Kenney CC0 models); money is glowing gold liquid in glass tanks
// on the roofs and light running in pipes along the streets. Post: bloom, tilt-shift (miniature look), grain, vignette.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { applyPose, H, poseAt, W } from "./camera";
import { animations, inst, Kit, loadModels, Look, newLook } from "./assets";
import {
  BANK, CAST, DEV, DEV_TOWERS, GOV, HOUSES, House, HUB, PIPES, ROLES, Role, SHACKS, SHANTY, SPINE_X, STREETS, TERRACES, TERRACE_X, TOWER, TRUNKS,
  byRank, groundY, housePath, rnd, ROW_END_X, tankBase, tankTop, yardOf, TECH_TOWERS, TECH_SCALE, ptOf,
} from "./layout";
import { T } from "../timing";
import { circulation, houseAt, machineryAt } from "./sim";
import { Pt, scene as sceneAt, SceneState } from "./state";

const GOLD = new THREE.Color("#ffb53d");
const GOLD_HI = new THREE.Color("#ffe2a0");
const RED = new THREE.Color("#ff3b2f");

// ---------------------------------------------------------------- shaders
const flowMat = (radius: number, len: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uK: { value: 0 },
      uDir: { value: 1 },
      uLen: { value: len },
      uCol: { value: GOLD.clone() },
      uDash: { value: 1.6 + radius * 4 },
      uFog: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uK, uDir, uLen, uDash; uniform vec3 uCol;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float s = vUv.x * uLen;
        float ph = (s - uDir * uT * 3.0) / (uDash * 5.0);
        float dash = 0.35 + 0.25 * sin(ph * 6.2832);
        float ndv = clamp(dot(vN, vV), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 2.0);
        // dark brushed metal with a little sky reflected, then the light inside
        vec3 metal = vec3(0.025, 0.028, 0.035) + vec3(0.05, 0.065, 0.09) * rim + vec3(0.04) * pow(ndv, 8.0);
        vec3 c = metal + uCol * uK * (0.3 + dash);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

const glassMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { uRed: { value: 0 }, uHi: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vUv = uv; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uRed, uHi; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){
        float rim = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
        vec3 c = mix(vec3(0.62, 0.76, 0.95), vec3(1.0, 0.18, 0.12), uRed);
        // measuring marks: five short ticks up one side
        float tick = (1.0 - smoothstep(0.004, 0.012, abs(fract(vUv.y * 5.0) - 0.5) - 0.48)) * step(abs(vUv.x - 0.5), 0.035);
        float streak = smoothstep(0.02, 0.0, abs(vUv.x - 0.62)) * 0.25;
        float a = 0.03 + 0.22 * rim + 0.35 * uRed * (1.0 - vUv.y) + 0.35 * tick + streak * 0.6;
        gl_FragColor = vec4(c * a * (1.0 + 0.6 * uHi), 1.0);
      }`,
  });

// liquid: a cylinder whose visible height is uLevel (0..1 of the tank); optional bands for the income split
const liquidMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uLevel: { value: 0 },
      uHi: { value: 0 },
      uBands: { value: 0 },
      uT: { value: 0 },
      uTint: { value: new THREE.Color(1, 1, 1) },
    },
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vY = position.y; vP = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uLevel, uHi, uBands, uT; uniform vec3 uTint;
      varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
      void main(){
        float wave = 0.012 * sin(vP.x * 9.0 + uT * 3.0) + 0.012 * sin(vP.z * 7.0 - uT * 2.3);
        if (vY > uLevel + wave || uLevel < 0.004) discard;
        float rim = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.0);
        vec3 deep = vec3(0.55, 0.2, 0.02);
        vec3 gold = vec3(1.0, 0.5, 0.08);
        vec3 c = mix(deep, gold, 0.3 + 0.7 * smoothstep(0.0, max(uLevel, 0.05), vY)) * (0.75 + 0.5 * rim);
        c += vec3(1.0, 0.62, 0.2) * smoothstep(uLevel - 0.04, uLevel, vY) * 0.45;
        // slow rising bubbles
        float b = smoothstep(0.985, 1.0, sin(vP.x * 40.0 + vY * 25.0 - uT * 4.0) * sin(vP.z * 37.0 + uT * 1.3));
        c += vec3(1.0, 0.85, 0.5) * b * 0.35;
        if (uBands > 0.0) {
          float f = vY / max(uLevel, 0.001);
          vec3 bb = f < 0.17 ? vec3(0.45, 0.75, 1.0) : f < 0.58 ? vec3(1.0, 0.62, 0.16) : f < 0.78 ? vec3(1.0, 0.42, 0.25) : f < 0.95 ? vec3(0.95, 0.85, 0.55) : vec3(0.6, 0.6, 0.6);
          float edge = 1.0 - smoothstep(0.0, 0.012, min(abs(f - 0.17), min(abs(f - 0.58), min(abs(f - 0.78), abs(f - 0.95)))));
          c = mix(c, bb * (0.45 + 0.45 * rim) + edge * 0.35, uBands);
        }
        gl_FragColor = vec4(c * uTint * (1.0 + 0.7 * uHi), 0.96);
      }`,
  });

// tilt-shift: a separable blur that grows away from a horizontal band of focus (the miniature look)
const tiltShift = (dir: [number, number]) =>
  new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(...dir) }, uFocus: { value: 0.5 }, uBand: { value: 0.16 }, uAmt: { value: 1 }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uAmt; varying vec2 vUv;
      void main(){
        float d = max(0.0, abs(vUv.y - uFocus) - uBand);
        float r = clamp(d * 3.0, 0.0, 1.0) * 3.6 * uAmt;
        if (r < 0.05) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
        vec4 s = vec4(0.0); float ws = 0.0;
        for (int i = -7; i <= 7; i++) { float fi = float(i); float w = exp(-fi * fi / 24.0); s += texture2D(tDiffuse, vUv + uDir * fi * r / uRes) * w; ws += w; }
        gl_FragColor = s / ws;
      }`,
  });

// final grade (after tone mapping): vignette, a touch of grain, lift the blacks toward blue
const gradePass = () =>
  new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uVig: { value: 0.32 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uT, uVig; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 q = vUv - 0.5; q.x *= 1.25;
        float v = 1.0 - uVig * smoothstep(0.25, 0.85, length(q));
        c.rgb *= v;
        c.rgb = c.rgb * 0.97 + vec3(0.008, 0.012, 0.022);
        float g = h(vUv * vec2(1920.0, 1080.0) + fract(uT * 7.31) * 100.0) - 0.5;
        c.rgb += g * 0.01;
        gl_FragColor = vec4(c.rgb, 1.0);
      }`,
  });

// ---------------------------------------------------------------- polyline curves
class Poly extends THREE.Curve<THREE.Vector3> {
  pts: THREE.Vector3[];
  cum: number[];
  len: number;
  constructor(pts: THREE.Vector3[]) {
    super();
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.len = this.cum[this.cum.length - 1];
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const d = Math.min(1, Math.max(0, u)) * this.len;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const k = (d - this.cum[i - 1]) / Math.max(1e-6, this.cum[i] - this.cum[i - 1]);
    return target.copy(a).lerp(b, k);
  }
}
// an arc through the air between two points (personal flows: rent, dividends, interest, loans)
class Arc extends THREE.Curve<THREE.Vector3> {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  len: number;
  constructor(a: THREE.Vector3, b: THREE.Vector3, lift: number) {
    super();
    this.a = a.clone();
    this.b = b.clone();
    this.c = a.clone().lerp(b, 0.5);
    this.c.y = Math.max(a.y, b.y) + lift;
    this.len = a.distanceTo(b) * 1.25;
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const t = Math.min(1, Math.max(0, u));
    const s = 1 - t;
    return target.set(0, 0, 0).addScaledVector(this.a, s * s).addScaledVector(this.c, 2 * s * t).addScaledVector(this.b, t * t);
  }
}
// a ribbon of light along an arc: dashes running from payer to payee
const ribbonMat = (len: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 }, uLen: { value: len }, uCol: { value: GOLD.clone() } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uK, uLen; uniform vec3 uCol; varying vec2 vUv;
      void main(){
        float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
        gl_FragColor = vec4(uCol * uK * ends * 0.3, 1.0);
      }`,
  });
const tube = (pts: THREE.Vector3[], r: number) => {
  const c = new Poly(pts);
  const seg = Math.max(8, Math.ceil(c.len * 3) + pts.length * 6);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8, false), flowMat(r, c.len));
  m.castShadow = true;
  return { mesh: m, curve: c };
};

type HouseObj = { grp: THREE.Group; h: House; look: Look; liquid: THREE.Mesh; glass: THREE.Mesh; ring: THREE.Mesh; pipe: ReturnType<typeof tube>; mail: THREE.Mesh; surface: THREE.Mesh; spill: Poly[] };
type Person = { obj: THREE.Object3D; mixer: THREE.AnimationMixer; role: Role };

// every model the town uses
const SUB_TYPES = "abcdefghijklmnopqrstu".split("").map((c) => ["sub", `building-type-${c}`] as [Kit, string]);
const NEEDED: [Kit, string][] = [
  ...SUB_TYPES,
  ["sub", "tree-large"], ["sub", "tree-small"], ["sub", "fence-1x4"], ["sub", "planter"], ["sub", "driveway-short"],
  ["com", "building-skyscraper-d"], ["com", "building-skyscraper-a"], ["com", "building-skyscraper-b"], ["com", "building-skyscraper-c"], ["com", "building-skyscraper-e"],
  ["com", "building-n"], ["com", "building-j"], ["com", "building-l"], ["com", "building-m"], ["com", "building-i"], ["com", "low-detail-building-wide-a"], ["com", "low-detail-building-b"], ["com", "low-detail-building-e"],
  ["ind", "building-l"], ["ind", "building-f"], ["ind", "chimney-large"], ["ind", "chimney-medium"], ["ind", "building-h"], ["ind", "building-i"], ["ind", "building-j"], ["ind", "building-k"], ["ind", "building-p"], ["ind", "shipping-container-a"], ["ind", "shipping-container-c"],
  ["car", "sedan"], ["car", "suv-luxury"], ["car", "van"], ["car", "delivery"], ["car", "taxi"], ["car", "hatchback-sports"], ["car", "truck"],
  ["chr", "character-male-a"], ["chr", "character-male-b"], ["chr", "character-male-c"], ["chr", "character-male-d"], ["chr", "character-female-a"], ["chr", "character-female-c"],
  ["nat", "tree_oak_dark"], ["nat", "tree_default_dark"], ["nat", "tree_detailed_dark"], ["nat", "tree_fat_darkh"], ["nat", "tree_pineRoundC"], ["nat", "plant_bushLarge"], ["nat", "plant_bush"],
];
const ROLE_MODEL: Record<Role, string> = {
  holder: "character-male-c",
  boss: "character-male-b",
  landlord: "character-female-c",
  coder: "character-male-a",
  worker: "character-male-d",
  rider: "character-female-a",
};

class Town {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 900);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  tsH: ShaderPass;
  tsV: ShaderPass;
  grade: ShaderPass;
  houses: HouseObj[] = [];
  people: Person[] = [];
  pipes: Record<string, ReturnType<typeof tube>> = {};
  trunks: ReturnType<typeof tube>[] = [];
  shacks: THREE.Object3D[] = [];
  devTowers: THREE.Object3D[] = [];
  devLooks: Look[] = [];
  torrent!: THREE.Points;
  column!: THREE.Mesh;
  coins!: THREE.Points;
  coinPos!: Float32Array;
  coinCol!: Float32Array;
  towerCrown!: THREE.Mesh;
  hubGlow!: THREE.Mesh;
  hubLook!: Look;
  shantyGold: THREE.Mesh[] = [];
  techTowers: THREE.Object3D[] = [];
  techLooks: Look[] = [];
  arcs = new Map<string, Arc>();
  ribbons = new Map<string, THREE.Mesh>();
  isReady = false;
  ready: Promise<void>;
  lastT = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color("#0c1630");
    this.scene.fog = new THREE.FogExp2("#22304f", 0.0042);
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.38, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.tsH = tiltShift([1, 0]);
    this.tsV = tiltShift([0, 1]);
    this.composer.addPass(this.tsH);
    this.composer.addPass(this.tsV);
    this.composer.addPass(new OutputPass());
    this.grade = gradePass();
    this.composer.addPass(this.grade);
    this.ready = loadModels(NEEDED).then(() => {
      this.build();
      this.isReady = true;
    });
  }

  add<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, s = 1, ry = 0) {
    o.position.set(x, y, z);
    o.scale.setScalar(s);
    o.rotation.y = ry;
    this.scene.add(o);
    return o;
  }

  build() {
    const S = this.scene;
    // ---------- light: blue hour. Low warm sun from the west-southwest, cool sky, a cool moon fill from the east.
    S.add(new THREE.HemisphereLight("#8ea6dc", "#2c3040", 1.7));
    const sun = new THREE.DirectionalLight("#ffb07a", 2.1);
    sun.position.set(-150, 70, 70);
    sun.target.position.set(15, 0, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -95;
    sc.right = 95;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 10;
    sc.far = 400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    S.add(sun, sun.target);
    const moon = new THREE.DirectionalLight("#9fb6ff", 0.55);
    moon.position.set(90, 60, 40);
    S.add(moon);
    const warm = new THREE.PointLight("#ffb35a", 80, 60, 1.6);
    warm.position.set(HUB.x, 9, HUB.z + 4);
    S.add(warm);

    // ---------- sky: deep blue overhead, an ember band low in the west, a few stars
    {
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(700, 48, 24),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `
            varying vec3 vP;
            float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
            void main(){
              vec3 d = normalize(vP);
              float y = clamp(d.y, -0.2, 1.0);
              vec3 zen = vec3(0.025, 0.045, 0.12), mid = vec3(0.09, 0.15, 0.32), hor = vec3(0.32, 0.36, 0.55);
              vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, y));
              c = mix(c, zen, smoothstep(0.15, 0.7, y));
              float w = pow(max(0.0, dot(normalize(vec2(d.x, d.z)), normalize(vec2(-1.0, 0.25)))), 3.0);
              c += vec3(1.0, 0.45, 0.18) * w * exp(-max(y, 0.0) * 14.0) * 0.9;
              c += vec3(0.9, 0.5, 0.35) * w * exp(-max(y, 0.0) * 4.0) * 0.18;
              vec3 cell = floor(d * 260.0);
              float st = step(0.9975, h(cell)) * smoothstep(0.2, 0.6, y);
              c += vec3(0.8, 0.85, 1.0) * st * 0.9;
              gl_FragColor = vec4(c, 1.0);
            }`,
        }),
      );
      S.add(sky);
    }

    // ---------- ground, terraces, roads, lawns
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: "#232b3a", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground);
    const flat = (w: number, d: number, col: string, rough = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: col, roughness: rough }));
      m.rotation.x = -Math.PI / 2;
      m.receiveShadow = true;
      return m;
    };
    const terrM = new THREE.MeshStandardMaterial({ color: "#2e3d35", roughness: 1 });
    const wallM = new THREE.MeshStandardMaterial({ color: "#3a3d45", roughness: 0.95 });
    for (const t of TERRACES) {
      const w = TERRACE_X[1] - TERRACE_X[0];
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, t.y, t.z1 - t.z0), [wallM, wallM, terrM, terrM, wallM, wallM]);
      box.position.set((TERRACE_X[0] + TERRACE_X[1]) / 2, t.y / 2, (t.z0 + t.z1) / 2);
      box.receiveShadow = true;
      box.castShadow = true;
      S.add(box);
    }
    // lawn for the flat front rows
    const lawn = flat(TERRACE_X[1] - TERRACE_X[0], 40, "#2c3b33");
    lawn.position.set((TERRACE_X[0] + TERRACE_X[1]) / 2, 0.01, -7 + 20);
    S.add(lawn);
    // roads: each street row, the spine, the machinery district
    const roadM = new THREE.MeshStandardMaterial({ color: "#1d2028", roughness: 0.75 });
    const markM = new THREE.MeshBasicMaterial({ color: "#6b6450" });
    const road = (x0: number, z0: number, x1: number, z1: number, y: number, w = 2.4) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ang = -Math.atan2(z1 - z0, x1 - x0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), roadM);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = ang;
      m.position.set((x0 + x1) / 2, y + 0.02, (z0 + z1) / 2);
      m.receiveShadow = true;
      S.add(m);
      for (let d = 1; d < len - 1; d += 2.2) {
        const k = d / len;
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.08), markM);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = ang;
        dash.position.set(x0 + (x1 - x0) * k, y + 0.035, z0 + (z1 - z0) * k);
        S.add(dash);
      }
    };
    for (const z of STREETS) road(TERRACE_X[0] + 0.5, z, ROW_END_X + 2, z, groundY(0, z));
    road(-60, 14, 6, 14, 0, 3.2);
    road(-60, -2, -6, -2, 0, 3.2);
    road(-24, -40, -24, 30, 0, 3.2);
    road(-60, -14, -24, -14, 0, 3.2);

    // street lamps along the rows: a pole and a warm bulb
    const poleG = new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6);
    const poleM = new THREE.MeshStandardMaterial({ color: "#2a2d35", roughness: 0.6 });
    const bulbG = new THREE.SphereGeometry(0.16, 10, 8);
    const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd29a").multiplyScalar(2.2) });
    for (const z of STREETS)
      for (let x = 4; x < ROW_END_X; x += 11) {
        const y = groundY(x, z);
        const p = new THREE.Mesh(poleG, poleM);
        p.position.set(x, y + 1.3, z + 1.35);
        p.castShadow = true;
        S.add(p);
        const b = new THREE.Mesh(bulbG, bulbM);
        b.position.set(x, y + 2.65, z + 1.35);
        S.add(b);
      }

    // ---------- houses (Kenney suburban), each with a lawn, a tree or two, and a tank on the roof
    const ROOFS = ["#4a4f5c", "#5b4a44", "#3f4a55", "#615349", "#474b52"];
    for (const h of HOUSES) {
      const look = newLook({ roof: h.kind === "mansion" ? "#6a4a3e" : ROOFS[Math.floor(h.seed * ROOFS.length)], lit: h.kind === "mansion" ? 0.85 : 0.35 + 0.4 * h.seed, win: 1 });
      const grp = new THREE.Group();
      const m = inst("sub", `building-type-${h.model}`, look);
      m.scale.setScalar(h.scale);
      grp.add(m);
      // trees and bushes in the yard
      const nt = h.kind === "mansion" ? 4 : h.kind === "small" ? (h.seed > 0.55 ? 1 : 0) : 1;
      for (let i = 0; i < nt; i++) {
        const names = ["tree_oak_dark", "tree_default_dark", "tree_detailed_dark", "tree_fat_darkh"];
        const tr = inst("nat", names[Math.floor(rnd(h.rank * 5 + i) * names.length)], look);
        const side = i % 2 === 0 ? -1 : 1;
        tr.position.set(side * (h.w / 2 + 0.9 + rnd(h.rank + i) * 0.8), 0, -h.d * 0.2 + (i > 1 ? -h.d * 0.5 : 0) + rnd(h.rank * 3 + i));
        tr.scale.setScalar(h.kind === "mansion" ? 3.4 : 2.4);
        grp.add(tr);
      }
      if (h.kind === "mansion") {
        // pool, a luxury car, a hedge
        const pool = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 2.2), new THREE.MeshStandardMaterial({ color: "#39c6e6", emissive: new THREE.Color("#1a8fb5"), emissiveIntensity: 1.6, roughness: 0.1 }));
        pool.position.set(-1.6, 0.06, h.d / 2 + 2.0);
        grp.add(pool);
        const car = inst("car", "suv-luxury", newLook({ roofK: 0 }));
        car.position.set(h.w / 2 - 0.5, 0.35, h.d / 2 + 1.9);
        car.rotation.y = Math.PI / 2;
        car.scale.setScalar(0.85);
        grp.add(car);
      } else if (h.kind !== "small" && h.seed > 0.4) {
        const car = inst("car", h.seed > 0.7 ? "sedan" : "hatchback-sports", newLook({ roofK: 0 }));
        car.position.set(h.w / 2 + 0.2, 0.32, h.d / 2 + 1.3);
        car.rotation.y = Math.PI / 2;
        car.scale.setScalar(0.62);
        grp.add(car);
      }
      // tank on a short frame
      const tb = tankBase(h).sub(new THREE.Vector3(h.x, h.y, h.z));
      const legM = new THREE.MeshStandardMaterial({ color: "#23262e", roughness: 0.6, metalness: 0.4 });
      const legH = 0.45;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, legH + 0.6), legM);
        leg.position.set(tb.x + dx * h.tankR * 0.6, tb.y - (legH + 0.6) / 2, tb.z + dz * h.tankR * 0.6);
        leg.castShadow = true;
        grp.add(leg);
      }
      const lg = new THREE.CylinderGeometry(h.tankR * 0.94, h.tankR * 0.94, 1, 32, 1, false);
      lg.translate(0, 0.5, 0);
      const liquid = new THREE.Mesh(lg, liquidMat());
      liquid.scale.set(1, h.tankH, 1);
      liquid.position.copy(tb);
      grp.add(liquid);
      const surface = new THREE.Mesh(new THREE.CircleGeometry(h.tankR * 0.93, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb040").multiplyScalar(1.1), transparent: true, opacity: 0.9 }));
      surface.rotation.x = -Math.PI / 2;
      grp.add(surface);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(h.tankR, h.tankR, h.tankH, 32, 1, true), glassMat());
      glass.position.set(tb.x, tb.y + h.tankH / 2, tb.z);
      grp.add(glass);
      const capM = new THREE.MeshStandardMaterial({ color: "#8a7552", roughness: 0.35, metalness: 0.8 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(h.tankR * 1.05, h.tankR * 1.05, 0.1, 32), capM);
      cap.position.set(tb.x, tb.y + h.tankH, tb.z);
      cap.castShadow = true;
      grp.add(cap);
      const bot = cap.clone();
      bot.position.y = tb.y;
      grp.add(bot);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h.tankR * 1.1, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: RED }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(tb.x, tb.y + 0.05, tb.z);
      grp.add(ring);
      const mail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), new THREE.MeshBasicMaterial({ color: "#d9e6ff" }));
      mail.position.set(h.w * 0.32, 0.9, h.street - 1.4 - h.z);
      mail.visible = false;
      grp.add(mail);
      grp.position.set(h.x, h.y, h.z);
      S.add(grp);
      const pipe = tube(housePath(h), h.kind === "mansion" ? 0.11 : 0.06);
      S.add(pipe.mesh);
      // the richest tanks brim over in the reveal: gold spilling down four sides onto the roof
      const tt = tankTop(h);
      const spill = [0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.6;
        const dx = Math.cos(a), dz = Math.sin(a);
        return new Poly([
          new THREE.Vector3(tt.x + dx * h.tankR * 0.7, tt.y + 0.05, tt.z + dz * h.tankR * 0.7),
          new THREE.Vector3(tt.x + dx * (h.tankR + 0.15), tt.y + 0.1, tt.z + dz * (h.tankR + 0.15)),
          new THREE.Vector3(tt.x + dx * (h.tankR + 0.3), tankBase(h).y - 0.2, tt.z + dz * (h.tankR + 0.3)),
        ]);
      });
      this.houses.push({ grp, h, look, liquid, glass, ring, pipe, mail, surface, spill });
    }

    // ---------- the six people, in their yards
    for (const role of ROLES) {
      const h = byRank(CAST[role]);
      const y = yardOf(h);
      const obj = inst("chr", ROLE_MODEL[role], newLook({ roofK: 0, win: 0 }));
      obj.position.set(y.x, y.y, y.z);
      obj.scale.setScalar(h.kind === "mansion" ? 3.2 : 2.6);
      S.add(obj);
      const mixer = new THREE.AnimationMixer(obj);
      const clip = animations("chr", ROLE_MODEL[role]).find((a) => a.name === "idle");
      if (clip) mixer.clipAction(clip).play();
      this.people.push({ obj, mixer, role });
      if (role === "rider") {
        // an e-bike with a delivery box by the rider
        const bike = new THREE.Group();
        const yellow = new THREE.MeshStandardMaterial({ color: "#f2c230", roughness: 0.5 });
        const dark = new THREE.MeshStandardMaterial({ color: "#15171c", roughness: 0.7 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.24), yellow);
        body.position.y = 0.42;
        bike.add(body);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), yellow);
        box.position.set(-0.4, 0.82, 0);
        bike.add(box);
        for (const x of [-0.42, 0.45]) {
          const wh = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), dark);
          wh.position.set(x, 0.24, 0);
          bike.add(wh);
        }
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.5), dark);
        bar.position.set(0.5, 0.7, 0);
        bike.add(bar);
        bike.traverse((c) => ((c as THREE.Mesh).castShadow = true));
        bike.position.set(y.x + 1.5, y.y, y.z + 0.2);
        S.add(bike);
      }
    }

    // ---------- trunks and named pipes
    TRUNKS.forEach((p) => {
      const tb = tube(p, 0.11);
      this.trunks.push(tb);
      S.add(tb.mesh);
    });
    for (const [k, p] of Object.entries(PIPES)) {
      const tb = tube(p, 0.2);
      this.pipes[k] = tb;
      S.add(tb.mesh);
    }

    // ---------- central bank tower: the tallest skyscraper, a gold crown
    const towerLook = newLook({ lit: 0.4, roof: "#3c4250", win: 0.6 });
    this.add(inst("com", "building-skyscraper-d", towerLook), TOWER.x, 0, TOWER.z, 5.0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 1.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true }));
    crown.position.set(TOWER.x, 5.47 * 5 + 1.0, TOWER.z);
    S.add(crown);
    this.towerCrown = crown;
    // bank, government
    this.add(inst("com", "building-n", newLook({ lit: 0.55 })), BANK.x, 0, BANK.z, 3.4);
    this.add(inst("com", "building-j", newLook({ lit: 0.6 })), GOV.x, 0, GOV.z, 4.6);
    // market: factories and shops
    this.hubLook = newLook({ lit: 0.8, win: 1.2 });
    this.add(inst("ind", "building-l", this.hubLook), HUB.x - 1, 0, HUB.z - 0.5, 4.2);
    this.add(inst("ind", "chimney-large", this.hubLook), HUB.x + 4.5, 0, HUB.z - 3.5, 3.0);
    this.add(inst("com", "low-detail-building-wide-a", newLook({ lit: 0.9 })), HUB.x - 2, 0, HUB.z + 7.5, 3.6);
    this.add(inst("ind", "shipping-container-a", newLook({ roofK: 0 })), HUB.x - 8.5, 0, HUB.z - 1, 1.6, 0.1);
    this.add(inst("ind", "shipping-container-c", newLook({ roofK: 0 })), HUB.x - 8.5, 2.06, HUB.z - 1.3, 1.6, -0.05);
    this.add(inst("car", "delivery", newLook({ roofK: 0 })), HUB.x + 6.5, 0.3, HUB.z + 3.5, 0.7, Math.PI / 2);
    this.add(inst("car", "truck", newLook({ roofK: 0 })), HUB.x - 5, 0.4, HUB.z + 3.8, 0.75, -Math.PI / 2);
    this.hubGlow = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
    this.hubGlow.position.set(HUB.x, 4, HUB.z);
    S.add(this.hubGlow);

    // developer towers (they rise): skyscrapers scaled in y
    const devModels = ["building-skyscraper-a", "building-skyscraper-b", "building-skyscraper-c", "building-skyscraper-e", "building-skyscraper-a"];
    DEV_TOWERS.forEach(([x, z, w], i) => {
      const lk = newLook({ lit: 0.5 });
      const o = this.add(inst("com", devModels[i], lk), x, 0, z, w / 1.36);
      this.devTowers.push(o);
      this.devLooks.push(lk);
    });

    // the next waves: four towers behind the hill, built up from nothing
    TECH_TOWERS.forEach((tw) => {
      const lk = newLook({ lit: 0.7, win: 1.3 });
      const o = this.add(inst("com", tw.model, lk), tw.x, 0, tw.z, TECH_SCALE);
      o.visible = false;
      this.techTowers.push(o);
      this.techLooks.push(lk);
    });

    // the old industrial area west of the market: low sheds
    const shedNames = ["building-h", "building-i", "building-j", "building-k", "building-p"];
    SHACKS.forEach((s, i) => {
      const lk = newLook({ lit: 0.4, roof: "#4b3d35", tint: "#c7b39a" });
      const o = inst("ind", shedNames[i % shedNames.length], lk);
      o.scale.setScalar(1.9);
      const grp = new THREE.Group();
      grp.add(o);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
      gl.position.y = 2.6;
      grp.add(gl);
      this.shantyGold.push(gl);
      grp.position.set(s.x, 0, s.z);
      grp.rotation.y = s.r;
      S.add(grp);
      this.shacks.push(grp);
    });

    // background city: low-detail blocks far behind the hill and to the west, lit windows, for depth
    {
      const names = ["low-detail-building-b", "low-detail-building-e", "building-m", "building-i", "building-l"];
      for (let i = 0; i < 46; i++) {
        const a = rnd(i + 400);
        const x = -90 + i * 4.6 + (a - 0.5) * 3;
        const z = -62 - rnd(i + 410) * 26;
        const lk = newLook({ lit: 0.45, tint: "#9aa6c4" });
        this.add(inst("com", names[i % names.length], lk), x, 0, z, 3.2 + rnd(i + 420) * 2.2, rnd(i + 430) * 0.4);
      }
      // trees along the hill's back edge
      for (let i = 0; i < 30; i++) {
        const tr = inst("nat", i % 3 === 0 ? "tree_pineRoundC" : "tree_oak_dark", newLook({ roofK: 0 }));
        this.add(tr, -4 + i * 2.7 + rnd(i + 500) * 1.5, 3.2, -42 + rnd(i + 510) * 2.5, 2.6 + rnd(i + 520));
      }
    }

    // torrent: gold falling from the sky into the tower crown
    {
      const N = 5000;
      const seed = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        seed[i * 3] = rnd(i * 3 + 1);
        seed[i * 3 + 1] = rnd(i * 3 + 2);
        seed[i * 3 + 2] = rnd(i * 3 + 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      geo.setAttribute("seed", new THREE.BufferAttribute(seed, 3));
      const top = 5.47 * 5 + 1.0;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uK: { value: 0 }, uC: { value: new THREE.Vector3(TOWER.x, top, TOWER.z) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 seed; uniform float uT, uK; uniform vec3 uC; varying float vA;
          void main(){
            float h = 70.0; float y = fract(seed.y - uT * (0.35 + seed.z * 0.25));
            float r = (0.15 + 1.4 * seed.x * seed.x) * (0.5 + 0.5 * y);
            float a = seed.z * 6.2831 + y * 3.0;
            vec3 p = uC + vec3(cos(a) * r, y * h, sin(a) * r);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (3.0 + 7.0 * seed.z) * (200.0 / -mv.z);
            vA = uK * 0.32 * (0.5 + 0.5 * (1.0 - y));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(vec3(1.0, 0.62, 0.2) * vA * (1.0 - r * 3.5), 1.0); }`,
      });
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 1.1, 70, 24, 1, true),
        new THREE.ShaderMaterial({
          uniforms: { uK: { value: 0 }, uT: { value: 0 } },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
          fragmentShader: `uniform float uK, uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){ float edge = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.5); float s = 0.9 + 0.1 * sin(vUv.y * 12.0 + uT * 3.0);
              float fade = smoothstep(0.0, 0.12, vUv.y) * (0.55 + 0.45 * (1.0 - vUv.y));
              gl_FragColor = vec4(vec3(1.0, 0.6, 0.18) * uK * edge * s * fade * 0.42, 1.0); }`,
        }),
      );
      col.position.set(TOWER.x, top + 35, TOWER.z);
      S.add(col);
      this.column = col;
      this.torrent = new THREE.Points(geo, mat);
      this.torrent.frustumCulled = false;
      S.add(this.torrent);
    }

    // coins: moving dots along any pipe or arc (filled per frame)
    {
      const N = 4000;
      this.coinPos = new Float32Array(N * 3);
      this.coinCol = new Float32Array(N * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(this.coinPos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(this.coinCol, 3));
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        vertexShader: /* glsl */ `
          varying vec3 vC;
          void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.6 * (260.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          varying vec3 vC;
          void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(vC * (1.0 - r * 3.0), 1.0); }`,
      });
      this.coins = new THREE.Points(geo, mat);
      this.coins.frustumCulled = false;
      S.add(this.coins);
    }
  }

  // dots running along a curve: n dots, speed in units/s, reversed if dir < 0
  coinsOn(i0: number, c: THREE.Curve<THREE.Vector3> & { len: number }, n: number, k: number, t: number, dir: number, col: THREE.Color, lift = 0.35, speed = 6) {
    if (k <= 0.01) return i0;
    const p = new THREE.Vector3();
    for (let j = 0; j < n && i0 < 4000; j++) {
      let u = ((j / n + (t * speed) / c.len) % 1 + 1) % 1;
      if (dir < 0) u = 1 - u;
      c.getPoint(u, p);
      this.coinPos[i0 * 3] = p.x;
      this.coinPos[i0 * 3 + 1] = p.y + lift;
      this.coinPos[i0 * 3 + 2] = p.z;
      this.coinCol[i0 * 3] = col.r * k;
      this.coinCol[i0 * 3 + 1] = col.g * k;
      this.coinCol[i0 * 3 + 2] = col.b * k;
      i0++;
    }
    return i0;
  }

  pt(p: Pt) {
    return ptOf(p);
  }
  arc(from: Pt, to: Pt, lift: number) {
    const key = `${from}>${to}>${lift}`;
    let a = this.arcs.get(key);
    if (!a) {
      a = new Arc(this.pt(from), this.pt(to), lift);
      this.arcs.set(key, a);
    }
    return a;
  }

  render(t: number) {
    this.lastT = t;
    if (!this.isReady) return;
    const st: SceneState = sceneAt(t);
    const pose = poseAt(t);
    applyPose(this.camera, pose);
    const mc = machineryAt(t);

    this.renderer.toneMappingExposure = 1.0 - 0.45 * st.dim;
    this.bloom.strength = 0.38 + 0.3 * st.glow;
    // tilt-shift: stronger when the camera is close
    const close = THREE.MathUtils.clamp(1 - (pose.dist - 14) / 70, 0, 1);
    for (const p of [this.tsH, this.tsV]) {
      p.uniforms.uFocus.value = 0.5;
      p.uniforms.uBand.value = 0.24 - 0.06 * close;
      p.uniforms.uAmt.value = 0.4 + 0.5 * close;
    }
    this.grade.uniforms.uT.value = t;

    // torrent and tower crown
    const tm = this.torrent.material as THREE.ShaderMaterial;
    tm.uniforms.uT.value = t;
    tm.uniforms.uK.value = mc.torrent;
    const cm = this.column.material as THREE.ShaderMaterial;
    cm.uniforms.uK.value = mc.torrent;
    cm.uniforms.uT.value = t;
    (this.towerCrown.material as THREE.MeshBasicMaterial).color.copy(GOLD).multiplyScalar(0.35 + 1.4 * Math.max(mc.torrent, st.towerHi));

    // developer towers: low at first; they rise with the money poured into new homes 1998–2025, then go dark on the ebb
    this.devTowers.forEach((o, i) => {
      const base = [1.6, 2.0, 1.4, 1.8, 1.2][i];
      const hgt = base * 1.4 * st.built;
      o.visible = hgt > 0.02;
      o.scale.y = Math.max(0.02, hgt) * o.scale.x * 0.5;
      this.devLooks[i].uWin.value = 0.4 + 1.0 * st.built * (1 - st.devDim);
      this.devLooks[i].uDim.value = 0.75 * st.devDim;
    });
    // the old sheds sink away as the towers go up
    this.shacks.forEach((sh, i) => {
      const k = Math.max(0, Math.min(1, st.built * 4 - (i % 5) * 0.25));
      sh.position.y = -k * 4;
      sh.visible = k < 0.99;
    });
    // the next waves: four towers grow from the ground
    this.techTowers.forEach((o, i) => {
      const k = st.tech[i];
      o.visible = k > 0.01;
      o.scale.set(TECH_SCALE, Math.max(0.01, k) * TECH_SCALE * TECH_TOWERS[i].h * 0.8, TECH_SCALE);
      this.techLooks[i].uWin.value = 1.3 * k;
    });

    // named pipes
    const set = (k: string, v: number, dir = 1, col = GOLD) => {
      const p = this.pipes[k];
      if (!p) return;
      const u = (p.mesh.material as THREE.ShaderMaterial).uniforms;
      u.uT.value = t;
      u.uK.value = v;
      u.uDir.value = dir;
      u.uCol.value.copy(col);
    };
    set("towerBank", mc.towerBank);
    set("bankHub", mc.bankHub);
    set("hubGov", mc.hubGov * 0.7);
    set("hubSpine", Math.max(mc.hubSpine, circulation(t) * 0.8));
    set("spineBank", st.savingsToBank, 1);

    // trunks carry the circulation
    const circ = Math.max(circulation(t), mc.split * 0.8, st.loans * 0.8, st.interest * 0.7, st.glow * 0.9);
    this.trunks.forEach((tb) => {
      const u = (tb.mesh.material as THREE.ShaderMaterial).uniforms;
      u.uT.value = t;
      u.uK.value = circ * 0.75;
      u.uDir.value = -1;
    });

    // houses
    let ci = 0;
    for (const o of this.houses) {
      const hs = houseAt(o.h, t);
      const ov = st.house(o.h, hs);
      const lm = o.liquid.material as THREE.ShaderMaterial;
      lm.uniforms.uLevel.value = ov.level;
      lm.uniforms.uHi.value = ov.hi;
      lm.uniforms.uT.value = t;
      lm.uniforms.uBands.value = o.h.rank === CAST.holder ? st.bands : 0;
      const gs = 1 + st.grow * (o.h.g === 0 ? 0.32 : o.h.g === 1 ? 0.1 : o.h.g === 2 ? 0.04 : 0);
      o.grp.scale.setScalar(gs);
      o.surface.visible = ov.level > 0.01;
      o.surface.position.set(o.liquid.position.x, o.liquid.position.y + ov.level * o.h.tankH, o.liquid.position.z);
      (o.surface.material as THREE.MeshBasicMaterial).opacity = 0.6 * Math.min(1, ov.level * 20) * (st.bands > 0.5 && o.h.rank === CAST.holder ? 0.3 : 1);
      const gm = o.glass.material as THREE.ShaderMaterial;
      gm.uniforms.uRed.value = ov.red;
      gm.uniforms.uHi.value = ov.hi;
      (o.ring.material as THREE.MeshBasicMaterial).color.copy(RED).multiplyScalar(ov.red * 1.6);
      o.ring.visible = ov.red > 0.02;
      o.look.uDim.value = ov.dimHouse * 0.7;
      o.look.uWin.value = 1 + 0.8 * ov.hi;
      const pu = (o.pipe.mesh.material as THREE.ShaderMaterial).uniforms;
      pu.uT.value = t;
      pu.uK.value = ov.flow;
      pu.uDir.value = ov.dir; // +1: tank → hub (spending), −1: into the tank
      pu.uCol.value.copy(ov.flowCol);
      if (ov.coins > 0) ci = this.coinsOn(ci, o.pipe.curve, o.h.kind === "mansion" ? 10 : 5, ov.coins, t + o.h.seed * 3, ov.coinDir, ov.flowCol);
    }
    // people: idle animation at film time
    for (const p of this.people) p.mixer.setTime(t + CAST[p.role] * 0.37);
    // brimming over in the reveal
    const brim = Math.max(0, Math.min(1, (t - (T.c4 + 2.6)) / 0.6)) * Math.max(0, Math.min(1, (T.c4 + 9 - t) / 1.0));
    if (brim > 0) for (const o of this.houses) if (o.h.g === 0) for (const c of o.spill) ci = this.coinsOn(ci, c, 6, brim, t * 0.35 + o.h.seed, 1, GOLD_HI);
    // personal flows through the air (rent, shop takings, dividends, loans, interest)
    for (const r of this.ribbons.values()) r.visible = false;
    for (const a of st.arcs) {
      if (a.k <= 0.01) continue;
      const curve = this.arc(a.from, a.to, a.lift ?? 6);
      ci = this.coinsOn(ci, curve, a.n ?? 24, a.k, t, 1, a.col ?? GOLD_HI, 0, a.speed ?? 9);
      const key = `${a.from}>${a.to}>${a.lift ?? 6}`;
      let rb = this.ribbons.get(key);
      if (!rb) {
        rb = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.07, 6, false), ribbonMat(curve.len));
        rb.frustumCulled = false;
        this.scene.add(rb);
        this.ribbons.set(key, rb);
      }
      rb.visible = true;
      const u = (rb.material as THREE.ShaderMaterial).uniforms;
      u.uT.value = t;
      u.uK.value = a.k;
      u.uCol.value.copy(a.col ?? GOLD);
    }
    // coins in the machinery
    ci = this.coinsOn(ci, this.pipes.towerBank.curve, 30, mc.towerBank, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.bankHub.curve, 30, mc.bankHub, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.spineBank.curve, 30, st.savingsToBank, t, 1, GOLD_HI);
    for (let i = ci; i < 4000; i++) this.coinPos[i * 3 + 1] = -100;
    (this.coins.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.coins.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let inst_: Town | null = null;
export const town = () => (inst_ ??= new Town());
export { W, H, SPINE_X, SHANTY, DEV, BANK, GOV, HUB, TOWER };
