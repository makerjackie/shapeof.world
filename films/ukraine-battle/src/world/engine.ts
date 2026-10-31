// The one WebGL world of the film: Ukraine at country scale (Natural Earth borders, Terrarium relief, our control-area
// sketches) and, inside it, the Orikhiv–Robotyne battlefield (Copernicus DEM, Sentinel-2 imagery, OSM tree belts,
// villages and roads, our sketches of the defences). Everything is driven by a plain WorldState and rendered
// synchronously per frame, so Remotion captures a finished picture.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { staticFile } from "remotion";
import fieldJson from "../data/field.json";
import reliefJson from "../data/relief.json";
import ukraineJson from "../data/ukraine.json";
import { FIELD, MAIN_LINE, MINE_BELT, THIRD_LINE, TRENCH_1 } from "../geo";
import { Cam, H, W, camPos, setCamera } from "./camera";
import { COMMON, DRAPE, FRONT } from "./glsl";

type Field = { treeRows: number[][]; woods: number[][]; roads: { c: string; p: number[] }[]; rail: number[][]; rivers: { c: string; p: number[] }[]; water: number[][]; towns: number[][] };
type Ukr = {
  ukraine: number[][][];
  control: Record<string, number[][][]>;
  neighbours: { a3: string; poly: number[][][] }[];
  rivers: { n: string; r: number; p: number[] }[];
  lakes: number[][][];
  coast: number[][];
};
const FIELD_DATA = fieldJson as unknown as Field;
const UKR = ukraineJson as unknown as Ukr;

// ---------------- State ----------------

export type Unit = { kind: "tank" | "ifv" | "clear" | "moto" | "gun" | "truck"; x: number; y: number; yaw: number; side: 0 | 1; heat?: number; dead?: number; o?: number };
export type Fx = { x: number; y: number; h?: number; age: number; kind: "flash" | "smoke" | "dust" | "mine" | "glow"; size?: number; o?: number };
export type Trail = { pts: [number, number, number][]; color: string; o: number; width?: number };
export type Drone = { x: number; y: number; h: number; o: number; cone?: number; r?: number };
export type Dot = { x: number; y: number; o: number; side: 0 | 1; r?: number };

export type WorldState = {
  cam: Cam;
  time: number;
  // country scale
  country: number;
  exagC: number;
  control: { p2014: number; p2022_03: number; p2022_06: number; p2022_11: number; p2026: number };
  borders: number;
  rivers: number;
  // field scale
  field: number;
  exag: number;
  sat: [number, number, number]; // Jun 2023, Sep 2023, Jul 2021
  thermal: number;
  front?: [number, number][];
  frontGlow?: number;
  sideTint?: number;
  kill?: { w: number; o: number };
  scan?: number;
  woods?: number;
  houses?: number;
  roads?: number;
  trench?: number;
  mines?: { o: number; depth: number; lane?: number };
  main?: number;
  third?: number;
  teeth?: number;
  units?: Unit[];
  unitScale?: number;
  dots?: Dot[];
  fx?: Fx[];
  trails?: Trail[];
  drones?: Drone[];
  heli?: { x: number; y: number; h: number; yaw: number; o: number; rotor: number };
  exposure?: number;
  bloom?: number;
  fade?: number;
  grain?: number;
  night?: number;
  craters?: number;
};

// ---------------- Helpers ----------------

const C = (hex: string) => new THREE.Color(hex);
const pairs = (a: number[]) => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], a[i + 1]]);
  return out;
};

const linesGeom = (polys: number[][], h: number, close = false) => {
  const pos: number[] = [];
  for (const p of polys) {
    const pts = pairs(p);
    const n = close ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      pos.push(a[0], h, -a[1], b[0], h, -b[1]);
    }
  }
  const g = new LineSegmentsGeometry();
  g.setPositions(pos);
  return g;
};

const lineMat = (color: string, width: number) => {
  const m = new LineMaterial({ color: C(color).getHex(), linewidth: width, transparent: true, depthTest: false, depthWrite: false });
  m.resolution.set(W, H);
  return m;
};

const shapeFrom = (rings: number[][]) => {
  const s = new THREE.Shape(pairs(rings[0]).map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of rings.slice(1)) s.holes.push(new THREE.Path(pairs(h).map(([x, y]) => new THREE.Vector2(x, y))));
  return s;
};

// Flat polygons (local metres) at height h, as a mesh in world space.
const flatPolys = (polys: number[][][], h: number) => {
  const geos = polys.map((rings) => new THREE.ShapeGeometry(shapeFrom(rings)));
  const g = merge(geos, "polys");
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setXYZ(i, x, h, -y);
  }
  g.computeBoundingSphere();
  return g;
};

// Ribbon along a polyline: per-vertex map position, 2D normal, side (−1..1) and distance along.
const densify = (pts: [number, number][], step = 25) => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let j = 0; j < n; j++) out.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const ribbon = (pts0: [number, number][], closed = false) => {
  const pts = densify(pts0);
  const pos: number[] = [];
  const nrm: number[] = [];
  const side: number[] = [];
  const along: number[] = [];
  const idx: number[] = [];
  let s = 0;
  const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(P.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    if (i > 0) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    for (const sd of [-1, 1]) {
      pos.push(P[i][0], P[i][1], 0);
      nrm.push(nx, ny);
      side.push(sd);
      along.push(s);
    }
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aNrm", new THREE.Float32BufferAttribute(nrm, 2));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(idx);
  return { g, length: s };
};
const merge = (list: (THREE.BufferGeometry | undefined)[], name: string) => {
  const ok = list.filter((g): g is THREE.BufferGeometry => !!g);
  if (!ok.length) throw new Error(`merge ${name}: nothing to merge`);
  const m = mergeGeometries(ok);
  if (!m) throw new Error(`merge ${name}: attributes differ`);
  return m;
};
const mergeRibbons = (lines: [number, number][][]) => merge(lines.filter((l) => l.length > 1).map((l) => ribbon(l).g), "ribbons");

// Densify a polyline to a step (metres) and add a small zigzag (trenches are dug in traverses).
const zigzag = (pts: [number, number][], step: number, amp: number) => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(L / step));
    const nx = -(by - ay) / L;
    const ny = (bx - ax) / L;
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const z = (j % 2 === 0 ? 1 : -1) * amp;
      out.push([ax + (bx - ax) * t + nx * z, ay + (by - ay) * t + ny * z]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

// Deterministic random.
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const inPoly = (x: number, y: number, ring: [number, number][]) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

// ---------------- Vehicle and prop geometry (built from boxes; x right, y forward, z up, metres) ----------------

const boxG = (sx: number, sy: number, sz: number, cx: number, cy: number, cz: number, heat: number) => {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
  g.translate(cx, cy, cz);
  const n = g.getAttribute("position").count;
  g.setAttribute("aHeat", new THREE.Float32BufferAttribute(new Array(n).fill(heat), 1));
  return g;
};
const MODELS: Record<Unit["kind"], THREE.BufferGeometry> = {
  tank: mergeGeometries([
    boxG(3.6, 7.4, 1.1, 0, 0, 0.95, 0.45),
    boxG(0.7, 7.6, 1.0, -1.55, 0, 0.5, 0.55),
    boxG(0.7, 7.6, 1.0, 1.55, 0, 0.5, 0.55),
    boxG(2.0, 2.2, 0.35, 0, -2.4, 1.6, 1.0),
    boxG(3.0, 3.8, 0.85, 0, -0.3, 1.95, 0.4),
    boxG(0.26, 5.0, 0.26, 0, 4.0, 2.05, 0.35),
  ])!,
  clear: mergeGeometries([
    boxG(3.6, 7.4, 1.1, 0, 0, 0.95, 0.45),
    boxG(0.7, 7.6, 1.0, -1.55, 0, 0.5, 0.55),
    boxG(0.7, 7.6, 1.0, 1.55, 0, 0.5, 0.55),
    boxG(2.0, 2.2, 0.35, 0, -2.4, 1.6, 1.0),
    boxG(3.0, 3.4, 0.8, 0, -0.5, 1.9, 0.4),
    boxG(4.2, 0.5, 0.8, 0, 4.3, 0.45, 0.3),
    boxG(0.3, 1.0, 0.3, -1.4, 3.9, 0.7, 0.3),
    boxG(0.3, 1.0, 0.3, 1.4, 3.9, 0.7, 0.3),
  ])!,
  ifv: mergeGeometries([
    boxG(3.3, 6.4, 1.8, 0, 0, 1.25, 0.45),
    boxG(0.6, 6.5, 0.9, -1.45, 0, 0.45, 0.55),
    boxG(0.6, 6.5, 0.9, 1.45, 0, 0.45, 0.55),
    boxG(1.4, 1.5, 0.3, -0.7, 2.2, 2.25, 1.0),
    boxG(1.8, 1.8, 0.7, 0.3, 0.2, 2.5, 0.4),
    boxG(0.15, 1.8, 0.15, 0.3, 1.9, 2.6, 0.35),
  ])!,
  truck: mergeGeometries([boxG(2.4, 2.2, 2.0, 0, 2.4, 1.4, 1.0), boxG(2.4, 4.6, 1.8, 0, -1.0, 1.5, 0.4)])!,
  moto: mergeGeometries([boxG(0.5, 1.9, 0.8, 0, 0, 0.7, 0.9), boxG(0.6, 0.6, 0.8, 0, -0.2, 1.4, 1.0)])!,
  gun: mergeGeometries([boxG(2.6, 4.0, 1.0, 0, 0, 0.6, 0.6), boxG(0.3, 6.0, 0.3, 0, 3.0, 1.4, 0.4), boxG(1.6, 1.6, 0.9, 0, -0.4, 1.4, 0.45)])!,
};

// ---------------- Engine ----------------

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, W / H, 1, 1e7);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  ready: Promise<void>;
  isReady = false;
  common: Record<string, THREE.IUniform>;
  drape: Record<string, THREE.IUniform>;
  // layers
  reliefMat!: THREE.ShaderMaterial;
  fieldMat!: THREE.ShaderMaterial;
  woodsMat!: THREE.ShaderMaterial;
  crownMat!: THREE.ShaderMaterial;
  sky!: THREE.Mesh;
  houseMat!: THREE.ShaderMaterial;
  ribbonMats: Record<string, THREE.ShaderMaterial> = {};
  teethMat!: THREE.ShaderMaterial;
  ctrl: Record<string, { fill: THREE.Mesh; edge: LineSegments2 }> = {};
  ukrFill!: THREE.Mesh;
  ukrEdge!: LineSegments2;
  nbEdge!: LineSegments2;
  riverLines!: LineSegments2;
  unitMeshes: Record<string, THREE.InstancedMesh> = {};
  unitMat!: THREE.ShaderMaterial;
  fxPoints!: THREE.Points;
  fxMat!: THREE.ShaderMaterial;
  trailPool: LineSegments2[] = [];
  droneMesh!: THREE.InstancedMesh;
  coneMesh!: THREE.InstancedMesh;
  heli!: THREE.Group;
  rotor!: THREE.Mesh;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.canvas = this.renderer.domElement;
    this.scene.background = C("#05070a");
    this.common = {
      uThermal: { value: 0 },
      uTime: { value: 0 },
      uFogColor: { value: C("#0b1118") },
      uFogDensity: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
    };
    this.drape = {
      uDem: { value: null },
      uDemBox: { value: new THREE.Vector4(FIELD.x0, FIELD.x1, FIELD.y0, FIELD.y1) },
      uExag: { value: 1 },
    };
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.82);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uThermal: { value: 0 }, uTime: { value: 0 }, uFade: { value: 0 }, uGrain: { value: 0.04 }, uExposure: { value: 1 }, uNight: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uThermal, uTime, uFade, uGrain, uExposure, uNight; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure;
          float ln = dot(c, vec3(0.3,0.5,0.2)); c = mix(c, vec3(ln) * vec3(0.30,0.42,0.78) * 0.9 + c * 0.12, uNight * (1. - uThermal));
          // thermal: grey, a little contrast, sensor noise and soft scan lines
          float l = dot(c, vec3(0.299,0.587,0.114));
          vec3 th = vec3(smoothstep(0.02, 0.95, l));
          th += (h(vUv*vec2(1920.,1080.) + fract(uTime*7.3)*91.) - 0.5) * 0.09;
          th *= 0.94 + 0.06 * sin(vUv.y * 1080. * 1.2);
          c = mix(c, th * vec3(0.96,1.0,0.98), uThermal);
          // film grain + vignette
          c += (h(vUv*vec2(1920.,1080.)*1.3 + fract(uTime*3.1)*17.) - 0.5) * uGrain;
          vec2 d = vUv - 0.5; c *= 1. - dot(d,d) * mix(0.55, 1.1, uThermal);
          c *= 1. - uFade;
          gl_FragColor = vec4(max(c, 0.), 1.);
        }`,
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.ready = this.load().then(() => {
      this.isReady = true;
    });
  }

  async load() {
    const bin = async (f: string) => new Float32Array(await (await fetch(staticFile(f))).arrayBuffer());
    const tex = (f: string) =>
      new Promise<THREE.Texture>((res, rej) =>
        new THREE.TextureLoader().load(
          staticFile(f),
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
            t.generateMipmaps = true;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            res(t);
          },
          undefined,
          rej,
        ),
      );
    const half = (a: Float32Array, w: number, h: number) => {
      const u = new Uint16Array(a.length);
      for (let i = 0; i < a.length; i++) u[i] = THREE.DataUtils.toHalfFloat(a[i]);
      const t = new THREE.DataTexture(u, w, h, THREE.RedFormat, THREE.HalfFloatType);
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      return t;
    };
    const [dem, relief, s0, s1, s2] = await Promise.all([bin("dem80.f32"), bin("relief.f32"), tex("s2-2023-06-05.jpg"), tex("s2-2023-09-28.jpg"), tex("s2-2021-07-15.jpg")]);
    this.drape.uDem.value = half(dem, 500, 550);
    this.demJS = dem;
    const R = reliefJson as { w: number; h: number; x0: number; x1: number; y0: number; y1: number };
    this.buildCountry(half(relief, R.w, R.h), R);
    this.buildField(s0, s1, s2);
    this.buildUnits();
    this.buildFx();
  }
  demJS!: Float32Array;

  // JS terrain height (metres, unexaggerated) for labels and paths.
  heightAt(x: number, y: number) {
    if (!this.demJS) return 0;
    const u = ((x - FIELD.x0) / (FIELD.x1 - FIELD.x0)) * 500 - 0.5;
    const v = ((FIELD.y1 - y) / (FIELD.y1 - FIELD.y0)) * 550 - 0.5;
    const i = Math.max(0, Math.min(498, Math.floor(u)));
    const j = Math.max(0, Math.min(548, Math.floor(v)));
    const fu = Math.max(0, Math.min(1, u - i));
    const fv = Math.max(0, Math.min(1, v - j));
    const g = (a: number, b: number) => this.demJS[b * 500 + a];
    return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv;
  }

  // ---------- Country scale ----------
  buildCountry(relief: THREE.Texture, R: { w: number; h: number; x0: number; x1: number; y0: number; y1: number }) {
    const geo = new THREE.PlaneGeometry(R.x1 - R.x0, R.y1 - R.y0, 505, 392);
    geo.rotateX(-Math.PI / 2);
    geo.translate((R.x0 + R.x1) / 2, 0, -(R.y0 + R.y1) / 2);
    this.reliefMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.common,
        uRelief: { value: relief },
        uBox: { value: new THREE.Vector4(R.x0, R.x1, R.y0, R.y1) },
        uExagC: { value: 6 },
        uHole: { value: 0 },
        uO: { value: 1 },
        uFieldBox: { value: new THREE.Vector4(FIELD.x0, FIELD.x1, FIELD.y0, FIELD.y1) },
      },
      transparent: true,
      vertexShader: /* glsl */ `
        uniform sampler2D uRelief; uniform vec4 uBox; uniform float uExagC;
        varying vec2 vMap; varying float vH; varying vec3 vW; varying vec3 vN;
        float rh(vec2 p){ vec2 uv = vec2((p.x-uBox.x)/(uBox.y-uBox.x), (uBox.w-p.y)/(uBox.w-uBox.z)); return texture2D(uRelief, uv).r; }
        void main(){
          vec2 p = vec2(position.x, -position.z);
          float h = rh(p); vH = h;
          float e = 2400.;
          float hx = rh(p+vec2(e,0.)) - rh(p-vec2(e,0.)); float hy = rh(p+vec2(0.,e)) - rh(p-vec2(0.,e));
          vN = normalize(vec3(-hx*uExagC*3., 2.*e, hy*uExagC*3.));
          vMap = p;
          vec3 w = vec3(position.x, max(h, 0.) * uExagC - 40., position.z);
          vW = w;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uHole, uO; uniform vec4 uFieldBox; uniform vec4 uBox;
        varying vec2 vMap; varying float vH; varying vec3 vW; varying vec3 vN;
        void main(){
          vec3 sun = normalize(vec3(-0.65, 0.5, -0.55));
          float sh = clamp(dot(vN, sun), 0., 1.);
          float relief = smoothstep(80., 1600., vH);
          vec3 land = mix(vec3(0.030,0.034,0.036), vec3(0.085,0.080,0.072), relief);
          land *= 0.45 + 1.25 * sh;
          land += (noise2(vMap/9000.) - 0.5) * 0.008;
          vec3 sea = vec3(0.010,0.018,0.030) + 0.006 * noise2(vMap/40000.);
          vec3 col = vH <= 0.5 ? sea : land;
          float th = vH <= 0.5 ? 0.10 : 0.20 + 0.25 * sh;
          col = thermalMix(col, th);
          // fade out under the battlefield when it is shown
          float inF = step(uFieldBox.x+800., vMap.x) * step(vMap.x, uFieldBox.y-800.) * step(uFieldBox.z+800., vMap.y) * step(vMap.y, uFieldBox.w-800.);
          if (inF * uHole > 0.5) discard;
          float ed = min(min(vMap.x - uBox.x, uBox.y - vMap.x), min(vMap.y - uBox.z, uBox.w - vMap.y));
          col = mix(vec3(0.02,0.024,0.03), col, smoothstep(0., 180000., ed));
          gl_FragColor = vec4(fogIt(col, vW), uO);
        }`,
    });
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: { ...this.common },
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: /* glsl */ `
          ${COMMON}
          varying vec3 vD;
          void main(){
            float e = vD.y;
            vec3 hor = uFogColor * 1.25;
            vec3 zen = vec3(0.012,0.016,0.026);
            vec3 col = mix(hor, zen, smoothstep(-0.02, 0.45, e));
            col += vec3(0.10,0.07,0.05) * exp(-abs(e) * 18.) * 0.6;
            col = mix(col, vec3(0.10 + 0.12*smoothstep(0.3,-0.05,e)), uThermal);
            gl_FragColor = vec4(col, 1.);
          }`,
      }),
    );
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const relief3 = new THREE.Mesh(geo, this.reliefMat);
    relief3.renderOrder = 0;
    this.scene.add(relief3);

    // Ukraine fill and border, neighbours, rivers, control areas (flat, on top, no depth test).
    const ALT = 3000;
    this.ukrFill = new THREE.Mesh(flatPolys(UKR.ukraine, ALT), new THREE.MeshBasicMaterial({ color: C("#b9c7d6"), transparent: true, opacity: 0.06, depthTest: false, depthWrite: false }));
    this.ukrFill.renderOrder = 10;
    this.scene.add(this.ukrFill);
    this.ukrEdge = new LineSegments2(linesGeom(UKR.ukraine.map((r) => r[0]), ALT, true), lineMat("#e9eef3", 2.2));
    this.ukrEdge.renderOrder = 14;
    this.scene.add(this.ukrEdge);
    const nb = UKR.neighbours.filter((n) => n.a3 !== "UKR").flatMap((n) => n.poly.map((r) => r[0]));
    this.nbEdge = new LineSegments2(linesGeom(nb, ALT, true), lineMat("#56606a", 1.2));
    this.nbEdge.renderOrder = 11;
    this.scene.add(this.nbEdge);
    this.riverLines = new LineSegments2(linesGeom(UKR.rivers.filter((r) => r.r <= 5).map((r) => r.p), ALT), lineMat("#3b6f93", 1.6));
    this.riverLines.renderOrder = 12;
    this.scene.add(this.riverLines);
    const ctrlCol = "#f2a33a";
    for (const key of ["p2014", "p2022_03", "p2022_06", "p2022_11", "p2026"]) {
      const polys = UKR.control[key] as unknown as number[][][];
      const fill = new THREE.Mesh(flatPolys(polys, ALT), new THREE.MeshBasicMaterial({ color: C(ctrlCol), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      fill.renderOrder = 12;
      const edge = new LineSegments2(linesGeom(polys.map((r) => r[0]), ALT, true), lineMat(ctrlCol, 2.4));
      edge.renderOrder = 13;
      this.scene.add(fill, edge);
      this.ctrl[key] = { fill, edge };
    }
  }

  // ---------- Field scale ----------
  buildField(s0: THREE.Texture, s1: THREE.Texture, s2: THREE.Texture) {
    const fw = FIELD.x1 - FIELD.x0;
    const fh = FIELD.y1 - FIELD.y0;
    const geo = new THREE.PlaneGeometry(fw, fh, 500, 550);
    // keep map coords in position.xy (x east, y north); the shader drapes
    this.fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.common,
        ...this.drape,
        uS0: { value: s0 },
        uS1: { value: s1 },
        uS2: { value: s2 },
        uSat: { value: new THREE.Vector3(1, 0, 0) },
        uO: { value: 1 },
        uFront: { value: new Array(48).fill(0).map(() => new THREE.Vector2()) },
        uFrontN: { value: 0 },
        uGlow: { value: 0 },
        uTint: { value: 0 },
        uKill: { value: new THREE.Vector2(0, 0) },
        uScan: { value: 0 },
        uBelt: { value: (MINE_BELT as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y)) },
        uMines: { value: new THREE.Vector4(0, 500, 0, 1000) },
        uCrater: { value: 0 },
        uUA: { value: C("#45d6c8") },
        uRU: { value: C("#f2a33a") },
      },
      transparent: true,
      vertexShader: /* glsl */ `
        ${DRAPE}
        varying vec2 vMap; varying vec3 vW; varying vec3 vN;
        void main(){
          vec2 p = position.xy;
          vMap = p;
          float e = 80.;
          float hx = terrainH(p+vec2(e,0.)) - terrainH(p-vec2(e,0.));
          float hy = terrainH(p+vec2(0.,e)) - terrainH(p-vec2(0.,e));
          vN = normalize(vec3(-hx, 2.*e, hy));
          vW = mapToWorld(p, 0.);
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        ${FRONT}
        uniform sampler2D uS0, uS1, uS2; uniform vec3 uSat; uniform float uO, uGlow, uTint, uScan; uniform vec2 uKill;
        uniform vec3 uUA, uRU; uniform vec4 uDemBox; uniform vec2 uBelt[13]; uniform vec4 uMines; uniform float uCrater;
        varying vec2 vMap; varying vec3 vW; varying vec3 vN;
        void main(){
          vec2 uv = vec2((vMap.x-uDemBox.x)/(uDemBox.y-uDemBox.x), (vMap.y-uDemBox.z)/(uDemBox.w-uDemBox.z));
          vec3 c0 = texture2D(uS0, vec2(uv.x, uv.y)).rgb, c1 = texture2D(uS1, uv).rgb, c2 = texture2D(uS2, uv).rgb;
          vec3 sat = (c0*uSat.x + c1*uSat.y + c2*uSat.z) / max(uSat.x+uSat.y+uSat.z, 1e-3);
          float lum = dot(sat, vec3(0.299,0.587,0.114));
          float px0 = length(fwidth(vMap));
          // close-range detail: furrows, grass grain, soil patches (fades out once a texel is bigger than a pixel)
          float near = 1. - smoothstep(1.5, 6., px0);
          float fur = noise2(vMap * 0.35) * 0.5 + noise2(vMap * 1.7) * 0.5;
          float grain = noise2(vMap * 0.9) * 0.6 + noise2(vMap * 0.23) * 0.4;
          float patchy = noise2(vMap / 23.);
          vec3 detail = vec3(1.) + near * ((fur - 0.5) * 0.10 + (grain - 0.5) * 0.22 + (patchy - 0.5) * 0.16);
          // dark, slightly warm-cool grade; low sun lifts the relief
          vec3 sun = normalize(vec3(-0.55, 0.62, 0.48));
          float sh = clamp(dot(vN, sun), 0., 1.);
          vec3 g = mix(vec3(lum), sat, 0.48);
          g = pow(g, vec3(1.12)) * vec3(0.92, 0.98, 1.04);
          vec3 col = g * 0.78 * (0.55 + 0.8 * sh) * detail;
          col = mix(col, col * vec3(1.06, 1.0, 0.9), smoothstep(0.25, 0.5, lum));
          float heat = 0.13 + lum * 0.85 + (grain - 0.5) * 0.10 * (0.4 + near) + (fur - 0.5) * 0.05 * near;
          col = thermalMix(col, heat * (0.78 + 0.32 * sh));
          // front: side tint, the line itself, the drone kill zone, and the "everything is seen" scan
          if (uFrontN > 1) {
            vec2 fd = frontDist(vMap);
            vec3 sideC = fd.y > 0. ? uUA : uRU;
            col = mix(col, col + sideC * (0.012 + 0.05 * exp(-fd.x / 1800.)), uTint * (1. - uThermal));
            float px = length(fwidth(vMap));
            float line = 1. - smoothstep(px*1.5, px*3.5, fd.x);
            col = mix(col, vec3(1.0, 0.97, 0.9), line * uGlow);
            col += vec3(1.0,0.9,0.75) * exp(-fd.x / (px*14.)) * 0.18 * uGlow;
            if (uKill.y > 0.) {
              float inside = 1. - smoothstep(uKill.x - px*2., uKill.x + px*2., fd.x);
              float hatch = step(0.82, fract((vMap.x + vMap.y) / max(px*14., 30.)));
              float edge = 1. - smoothstep(px*1., px*3., abs(fd.x - uKill.x));
              vec3 kc = vec3(1.0, 0.36, 0.28);
              col = mix(col, col*0.75 + kc*0.22, inside * uKill.y * 0.8);
              col += kc * hatch * inside * uKill.y * 0.18;
              col = mix(col, kc, edge * uKill.y);
            }
          }
          if (uCrater > 0. && px0 < 4.) {
            // shell craters, denser near the front line
            float dens = uCrater;
            if (uFrontN > 1) dens *= 0.15 + 0.85 * exp(-frontDist(vMap).x / 1800.);
            for (int k = 0; k < 2; k++) {
              float sc = k == 0 ? 17. : 41.;
              vec2 cell = floor(vMap / sc + float(k) * 0.37);
              float hp = hash12(cell + 3.1 + float(k) * 9.);
              if (hp < dens) {
                vec2 cc = (cell + 0.5 + (vec2(hash12(cell + 5.), hash12(cell + 11.)) - 0.5) * 0.6) * sc - float(k) * 0.37 * sc;
                float rad = (k == 0 ? 1.4 : 3.5) + hash12(cell + 23.) * (k == 0 ? 3.0 : 5.0);
                float d = length(vMap - cc) / rad;
                float inside = 1. - smoothstep(0.85, 1.0, d);
                float rim = smoothstep(0.75, 1.0, d) * (1. - smoothstep(1.0, 1.45, d));
                float fade = 1. - smoothstep(1.5, 4., px0);
                col = mix(col, col * 0.45, inside * fade * (1. - uThermal));
                col = mix(col, col * 1.35 + 0.03, rim * fade * (1. - uThermal));
                col = mix(col, col * 0.62, inside * fade * uThermal);
                col = mix(col, col * 1.25, rim * fade * uThermal);
              }
            }
          }
          if (uMines.x > 0.) {
            // the minefield belt: north of the belt line, uMines.y metres deep; a lane cut at x = uMines.w
            float best = 1e9; float side = 0.;
            for (int i = 0; i < 12; i++) {
              vec2 a = uBelt[i], b = uBelt[i+1]; vec2 ab = b - a; float tt = clamp(dot(vMap - a, ab) / dot(ab, ab), 0., 1.);
              float d = length(vMap - (a + ab * tt)); if (d < best) { best = d; side = sign(ab.x * (vMap.y - a.y) - ab.y * (vMap.x - a.x)); }
            }
            float inBelt = step(0., side) * (1. - smoothstep(uMines.y - px0*1.5, uMines.y + px0*1.5, best)) * step(uBelt[0].x, vMap.x) * step(vMap.x, uBelt[12].x);
            float lane = 1. - (1. - smoothstep(3.0, 3.0 + px0 * 2., abs(vMap.x - uMines.w))) * uMines.z;
            vec2 cell = floor(vMap / 7.);
            vec2 j = vec2(hash12(cell), hash12(cell + 17.)) - 0.5;
            float dm = length(fract(vMap / 7.) - 0.5 - j * 0.5) * 7.;
            float mine = (1. - smoothstep(0.42, 0.42 + px0 * 1.5, dm)) * (1. - smoothstep(0.6, 2.5, px0));
            float hatch = step(0.75, fract((vMap.x - vMap.y) / max(px0 * 9., 10.)));
            float edge = 1. - smoothstep(px0 * 1., px0 * 2.5, min(best, abs(best - uMines.y)));
            vec3 mc = vec3(1.0, 0.62, 0.20);
            float a = inBelt * lane * uMines.x;
            col = mix(col, col * 0.8 + mc * 0.16, a * (1. - uThermal));
            col += mc * hatch * a * 0.10 * (1. - uThermal);
            col = mix(col, vec3(0.05), mine * a * 0.85 * (1. - uThermal));
            col = mix(col, mc, edge * step(0., side) * step(uBelt[0].x, vMap.x) * step(vMap.x, uBelt[12].x) * uMines.x * 0.9 * (1. - uThermal));
          }
          if (uScan > 0.) {
            float g = max(step(0.97, fract(vMap.x/500.)), step(0.97, fract(vMap.y/500.)));
            float sweep = fract(vMap.y/6000. - uTime*0.12);
            col += vec3(0.75,0.95,1.0) * (g*0.10 + smoothstep(0.96,1.0,sweep)*0.12) * uScan;
          }
          float ed = min(min(vMap.x - uDemBox.x, uDemBox.y - vMap.x), min(vMap.y - uDemBox.z, uDemBox.w - vMap.y));
          col = mix(vec3(0.03,0.034,0.036) * (0.6 + 0.8*sh), col, smoothstep(200., 4000., ed));
          gl_FragColor = vec4(fogIt(col, vW), uO);
        }`,
    });
    const fieldMesh = new THREE.Mesh(geo, this.fieldMat);
    fieldMesh.renderOrder = 1;
    fieldMesh.frustumCulled = false;
    this.scene.add(fieldMesh);

    // Woods / windbreaks (OSM). Inside the action box: one crown per ~8 m (instanced, jittered); outside it a low
    // dark extrusion is enough at the distances we see it from.
    const ACT = { x0: -8500, x1: 10500, y0: -5500, y1: 14500 };
    const woods: THREE.BufferGeometry[] = [];
    const crowns: number[] = [];
    const rc = rng(11);
    for (const ring of FIELD_DATA.woods) {
      const pts = pairs(ring);
      if (pts.length < 4) continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const inside = !(x1 < ACT.x0 || x0 > ACT.x1 || y1 < ACT.y0 || y0 > ACT.y1);
      if (inside) {
        const st = 8;
        for (let x = x0 + st / 2; x < x1; x += st)
          for (let y = y0 + st / 2; y < y1; y += st) {
            const jx = x + (rc() - 0.5) * st * 0.9;
            const jy = y + (rc() - 0.5) * st * 0.9;
            if (inPoly(jx, jy, pts)) crowns.push(jx, jy, 3.6 + rc() * 2.2, 9 + rc() * 7);
          }
        continue;
      }
      try {
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 10, bevelEnabled: false, steps: 1 });
        g.deleteAttribute("uv");
        woods.push(g);
      } catch {
        /* skip broken rings */
      }
    }
    this.woodsMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uO: { value: 1 } },
      transparent: true,
      vertexShader: /* glsl */ `
        ${DRAPE}
        varying vec3 vW; varying float vTop; varying vec3 vNrm;
        void main(){
          vec2 p = position.xy;
          vTop = position.z / 10.;
          vNrm = normal;
          vW = mapToWorld(p, position.z * clamp(uExag * 0.5, 1., 2.));
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uO; varying vec3 vW; varying float vTop; varying vec3 vNrm;
        void main(){
          float n = noise2(vW.xz/5.);
          vec3 col = mix(vec3(0.016,0.028,0.018), vec3(0.04,0.06,0.035), n) * (0.6 + 0.6*vTop);
          col = thermalMix(col, 0.17 + 0.10*n);
          gl_FragColor = vec4(fogIt(col, vW), uO);
        }`,
    });
    const woodsMesh = new THREE.Mesh(merge(woods, "woods"), this.woodsMat);
    woodsMesh.frustumCulled = false;
    woodsMesh.renderOrder = 2;
    this.scene.add(woodsMesh);
    const cg = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
    const cInst = new THREE.InstancedBufferGeometry();
    cInst.setAttribute("position", cg.getAttribute("position"));
    cInst.setAttribute("normal", cg.getAttribute("normal"));
    cInst.setAttribute("aInst", new THREE.InstancedBufferAttribute(new Float32Array(crowns), 4));
    cInst.instanceCount = crowns.length / 4;
    this.crownMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uO: { value: 1 } },
      transparent: true,
      vertexShader: /* glsl */ `
        ${DRAPE}
        attribute vec4 aInst; varying vec3 vW; varying vec3 vNrm; varying float vJ; varying float vUp;
        void main(){
          float j = fract(sin(dot(aInst.xy, vec2(12.9898,78.233)))*43758.5);
          vec3 p = position;
          p.xy += (vec2(fract(j*7.1), fract(j*13.7)) - 0.5) * 0.5 * p.z;
          float hgt = aInst.w * clamp(uExag * 0.45, 1., 2.);
          vec3 q = vec3(p.x * aInst.z, p.y * aInst.z, p.z * hgt * 0.42 + hgt * 0.58);
          vNrm = normalize(normal * vec3(1., 1., 0.8)); vJ = j; vUp = p.z;
          vW = mapToWorld(aInst.xy + q.xy, q.z);
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uO; varying vec3 vW; varying vec3 vNrm; varying float vJ; varying float vUp;
        void main(){
          vec3 sun = normalize(vec3(-0.55, -0.45, 0.7));
          float d = clamp(dot(normalize(vec3(vNrm.x, vNrm.y, vNrm.z)), sun), 0., 1.);
          float n = noise2(vW.xz * 0.9 + vJ * 10.);
          vec3 leaf = mix(vec3(0.020,0.040,0.022), vec3(0.075,0.10,0.045), vJ * 0.6 + n * 0.4);
          vec3 col = leaf * (0.35 + 1.1 * d) * (0.75 + 0.35 * vUp);
          col = thermalMix(col, 0.15 + 0.12 * d + 0.06 * n);
          gl_FragColor = vec4(fogIt(col, vW), uO);
        }`,
    });
    const crownMesh = new THREE.Mesh(cInst, this.crownMat);
    crownMesh.frustumCulled = false;
    crownMesh.renderOrder = 2;
    this.scene.add(crownMesh);

    // Houses scattered inside OSM residential areas (deterministic).
    const rand = rng(7);
    const houses: number[] = [];
    for (const ring of FIELD_DATA.towns) {
      const pts = pairs(ring);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
      const area = (x1 - x0) * (y1 - y0);
      const n = Math.min(4000, Math.floor(area / 2600));
      for (let i = 0; i < n; i++) {
        const x = x0 + rand() * (x1 - x0);
        const y = y0 + rand() * (y1 - y0);
        if (inPoly(x, y, pts)) houses.push(x, y, rand() * Math.PI, 0.8 + rand() * 0.5);
      }
    }
    const hg = mergeGeometries([boxG(9, 7, 3.2, 0, 0, 1.6, 0.5), (() => {
      const g = new THREE.CylinderGeometry(0, 6.2, 2.4, 4, 1).toNonIndexed();
      g.rotateX(Math.PI / 2);
      g.rotateZ(Math.PI / 4);
      g.scale(1.05, 0.82, 1);
      g.translate(0, 0, 4.4);
      g.setAttribute("aHeat", new THREE.Float32BufferAttribute(new Array(g.getAttribute("position").count).fill(0.35), 1));
      return g;
    })()])!;
    const nH = houses.length / 4;
    const hInst = new THREE.InstancedBufferGeometry();
    hInst.index = hg.index;
    hInst.setAttribute("position", hg.getAttribute("position"));
    hInst.setAttribute("normal", hg.getAttribute("normal"));
    hInst.setAttribute("aHeat", hg.getAttribute("aHeat"));
    hInst.setAttribute("aInst", new THREE.InstancedBufferAttribute(new Float32Array(houses), 4));
    hInst.instanceCount = nH;
    this.houseMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uO: { value: 1 }, uScaleH: { value: 1 } },
      transparent: true,
      vertexShader: /* glsl */ `
        ${DRAPE}
        attribute vec4 aInst; attribute float aHeat; uniform float uScaleH;
        varying vec3 vW; varying vec3 vNrm; varying float vHeat;
        void main(){
          float c = cos(aInst.z), s = sin(aInst.z);
          vec3 p = position * vec3(aInst.w, aInst.w, aInst.w * uScaleH);
          vec2 m = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + aInst.xy;
          vNrm = vec3(normal.x*c - normal.y*s, normal.x*s + normal.y*c, normal.z);
          vHeat = aHeat;
          vW = mapToWorld(m, p.z);
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uO; varying vec3 vW; varying vec3 vNrm; varying float vHeat;
        void main(){
          vec3 sun = normalize(vec3(-0.5, -0.4, 0.75));
          float d = clamp(dot(normalize(vNrm), sun), 0., 1.);
          vec3 col = (vNrm.z > 0.3 ? vec3(0.20,0.13,0.11) : vec3(0.32,0.30,0.28)) * (0.35 + 0.8*d);
          col = thermalMix(col, 0.26 + 0.18*vHeat);
          gl_FragColor = vec4(fogIt(col, vW), uO);
        }`,
    });
    const houseMesh = new THREE.Mesh(hInst, this.houseMat);
    houseMesh.frustumCulled = false;
    houseMesh.renderOrder = 2;
    this.scene.add(houseMesh);

    // Ribbons: roads, trenches, ditches, minefield belt, fronts.
    const roads = FIELD_DATA.roads.filter((r) => r.c !== "t").map((r) => pairs(r.p));
    const tracks = FIELD_DATA.roads.filter((r) => r.c === "t").map((r) => pairs(r.p));
    this.addRibbon("roads", mergeRibbons(roads), { width: 7, color: "#8b8577", heat: 0.42, lift: 0.4, o: 0.55 });
    this.addRibbon("tracks", mergeRibbons(tracks), { width: 3, color: "#6d6758", heat: 0.34, lift: 0.3, o: 0.35 });
    const tr = [TRENCH_1].map((l) => zigzag(l as [number, number][], 14, 3));
    this.addRibbon("trench", mergeRibbons(tr), { width: 3.2, color: "#0d0c0b", heat: 0.1, lift: 0.5, o: 0, berm: true });
    this.addRibbon("main", mergeRibbons([MAIN_LINE as [number, number][]].map((l) => zigzag(l, 10, 0.6))), { width: 6, color: "#0b0a09", heat: 0.08, lift: 0.5, o: 0, berm: true });
    this.addRibbon("mainTrench", mergeRibbons([MAIN_LINE as [number, number][]].map((l) => zigzag(l.map(([x, y]) => [x, y - 260]) as [number, number][], 14, 3))), { width: 3, color: "#0d0c0b", heat: 0.1, lift: 0.5, o: 0, berm: true });
    this.addRibbon("third", mergeRibbons([THIRD_LINE as [number, number][]].map((l) => zigzag(l, 10, 0.6))), { width: 6, color: "#0b0a09", heat: 0.08, lift: 0.5, o: 0, berm: true });
    this.addRibbon("mines", ribbon(MINE_BELT as [number, number][]).g, { width: 500, color: "#f2a33a", heat: 0.2, lift: 0.6, o: 0, mines: true });

    // Dragon's teeth: three staggered rows of small pyramids just south of the main ditch.
    const teeth: number[] = [];
    const ML = MAIN_LINE as [number, number][];
    for (let i = 0; i + 1 < ML.length; i++) {
      const [ax, ay] = ML[i];
      const [bx, by] = ML[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      const nx = (by - ay) / L;
      const ny = -(bx - ax) / L;
      for (let s = 0; s < L; s += 2.6) {
        for (let r = 0; r < 3; r++) {
          const t = s / L;
          const off = 22 + r * 2.4;
          teeth.push(ax + (bx - ax) * t + nx * off + (r % 2) * 1.3 * (bx - ax) / L, ay + (by - ay) * t + ny * off + (r % 2) * 1.3 * (by - ay) / L);
        }
      }
    }
    const tg = new THREE.ConeGeometry(0.75, 1.3, 4, 1).toNonIndexed();
    tg.rotateX(Math.PI / 2);
    tg.translate(0, 0, 0.65);
    const tInst = new THREE.InstancedBufferGeometry();
    tInst.setAttribute("position", tg.getAttribute("position"));
    tInst.setAttribute("normal", tg.getAttribute("normal"));
    tInst.setAttribute("aInst", new THREE.InstancedBufferAttribute(new Float32Array(teeth), 2));
    tInst.instanceCount = teeth.length / 2;
    this.teethMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uO: { value: 0 }, uS: { value: 1 } },
      transparent: true,
      vertexShader: /* glsl */ `
        ${DRAPE}
        attribute vec2 aInst; uniform float uS; varying vec3 vW; varying vec3 vNrm;
        void main(){ vNrm = normal; vW = mapToWorld(aInst + position.xy*uS, position.z*uS); gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.); }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform float uO; varying vec3 vW; varying vec3 vNrm;
        void main(){ float d = clamp(dot(normalize(vNrm), normalize(vec3(-0.4,-0.5,0.8))),0.,1.); vec3 col = vec3(0.62,0.6,0.55)*(0.4+0.7*d); col = thermalMix(col, 0.42); gl_FragColor = vec4(fogIt(col, vW), uO); }`,
    });
    const teethMesh = new THREE.Mesh(tInst, this.teethMat);
    teethMesh.frustumCulled = false;
    teethMesh.renderOrder = 3;
    this.scene.add(teethMesh);
  }

  addRibbon(key: string, g: THREE.BufferGeometry, o: { width: number; color: string; heat: number; lift: number; o: number; berm?: boolean; mines?: boolean }) {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uW: { value: o.width }, uCol: { value: C(o.color) }, uHeat: { value: o.heat }, uLift: { value: o.lift }, uO: { value: o.o }, uReveal: { value: 1e9 }, uDepth: { value: 500 }, uLane: { value: 0 }, uLaneX: { value: 1000 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        ${DRAPE}
        attribute vec2 aNrm; attribute float aSide; attribute float aAlong;
        uniform float uW, uLift; uniform float uDepth;
        varying vec3 vW; varying float vSide; varying float vAlong; varying vec2 vMap;
        void main(){
          vec2 p = position.xy + aNrm * ${o.mines ? "max(aSide, 0.) * uDepth" : "aSide * uW * 0.5"};
          vSide = aSide; vAlong = aAlong; vMap = p;
          vW = mapToWorld(p, uLift);
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uCol; uniform float uHeat, uO, uReveal, uLane, uLaneX, uDepth;
        varying vec3 vW; varying float vSide; varying float vAlong; varying vec2 vMap;
        void main(){
          if (vAlong > uReveal) discard;
          vec3 col = uCol; float a = uO;
          ${o.berm ? "float edge = smoothstep(0.55, 0.95, abs(vSide)); col = mix(col, vec3(0.55,0.48,0.38), edge*0.8);" : ""}
          ${
            o.mines
              ? `
            // belt: faint amber wash, and at close range the mines themselves (dark discs on a grid with jitter)
            float px = length(fwidth(vMap));
            vec2 cell = floor(vMap / 7.);
            vec2 j = vec2(hash12(cell), hash12(cell + 17.)) - 0.5;
            float d = length(fract(vMap / 7.) - 0.5 - j*0.5) * 7.;
            float mine = (1. - smoothstep(0.45, 0.45 + px*1.5, d)) * smoothstep(3.0, 1.0, px);
            float laneCut = 1. - (1. - smoothstep(2.6, 3.4, abs(vMap.x - uLaneX))) * uLane;
            col = mix(vec3(0.95,0.62,0.22), vec3(0.06,0.05,0.04), mine * 0.9);
            float hatch = step(0.7, fract((vMap.x - vMap.y) / max(px*10., 12.)));
            a = uO * (0.30 + hatch * 0.25 + mine * 0.7) * laneCut;
            float rim = max(1. - smoothstep(0., 0.04, max(vSide, 0.)), smoothstep(0.96, 1.0, max(vSide,0.)));
            a = max(a, uO * rim * 0.8 * laneCut);`
              : ""
          }
          col = thermalMix(col, uHeat);
          gl_FragColor = vec4(fogIt(col, vW), a);
        }`,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = o.mines ? 4 : 3;
    this.scene.add(mesh);
    this.ribbonMats[key] = m;
  }

  // ---------- Units, fx, drones, helicopter ----------
  buildUnits() {
    this.unitMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, ...this.drape, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        ${DRAPE}
        attribute float aHeat; attribute vec4 aU; attribute vec4 aC;
        uniform float uScale; varying vec3 vW; varying vec3 vNrm; varying float vHeat; varying vec4 vC;
        void main(){
          float c = cos(aU.z), s = sin(aU.z);
          vec3 p = position * uScale;
          vec2 m = vec2(p.x*c + p.y*s, -p.x*s + p.y*c) + aU.xy;
          vNrm = vec3(normal.x*c + normal.y*s, -normal.x*s + normal.y*c, normal.z);
          vHeat = aHeat; vC = aC;
          vW = mapToWorld(m, p.z);
          gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec3 vW; varying vec3 vNrm; varying float vHeat; varying vec4 vC;
        void main(){
          float d = clamp(dot(normalize(vNrm), normalize(vec3(-0.45,-0.5,0.75))), 0., 1.);
          float dead = vC.a;
          vec3 base = mix(vec3(0.17,0.19,0.15), vC.rgb, 0.16);
          float top = smoothstep(0.2, 0.9, normalize(vNrm).z);
          vec3 col = base * (0.30 + 0.9*d) + vC.rgb * top * 0.10;
          col = mix(col, vec3(0.03), dead*0.7);
          float heat = 0.32 + 0.7*vHeat + 0.10*d;
          col = thermalMix(col, clamp(heat, 0., 1.4));
          gl_FragColor = vec4(fogIt(col, vW), 1.);
        }`,
    });
    for (const kind of Object.keys(MODELS) as Unit["kind"][]) {
      const g = new THREE.InstancedBufferGeometry();
      const src = MODELS[kind];
      g.setAttribute("position", src.getAttribute("position"));
      g.setAttribute("normal", src.getAttribute("normal"));
      g.setAttribute("aHeat", src.getAttribute("aHeat"));
      g.setAttribute("aU", new THREE.InstancedBufferAttribute(new Float32Array(64 * 4), 4));
      g.setAttribute("aC", new THREE.InstancedBufferAttribute(new Float32Array(64 * 4), 4));
      g.instanceCount = 0;
      const mesh = new THREE.Mesh(g, this.unitMat) as unknown as THREE.InstancedMesh;
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      this.scene.add(mesh);
      this.unitMeshes[kind] = mesh;
    }
    // drones: small dark quad bodies + translucent view cones
    const dg = mergeGeometries([boxG(0.6, 0.6, 0.18, 0, 0, 0, 1), boxG(1.4, 0.12, 0.06, 0, 0, 0.06, 0.6), boxG(0.12, 1.4, 0.06, 0, 0, 0.06, 0.6)])!;
    this.droneMesh = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ color: C("#f4f7f8"), transparent: true }), 64);
    this.droneMesh.frustumCulled = false;
    this.droneMesh.renderOrder = 7;
    this.scene.add(this.droneMesh);
    const cg = new THREE.ConeGeometry(1, 1, 24, 1, true);
    cg.translate(0, -0.5, 0);
    this.coneMesh = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: C("#bfefff"), transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 64);
    this.coneMesh.frustumCulled = false;
    this.coneMesh.renderOrder = 8;
    this.scene.add(this.coneMesh);
    // helicopter (generic attack helicopter silhouette)
    const hm = new THREE.MeshBasicMaterial({ color: C("#1c2024") });
    const heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 7, 4, 10), hm);
    body.rotation.z = Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.5, 0.5), hm);
    tail.position.set(-6, 0.4, 0);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.2), hm);
    fin.position.set(-9, 1.3, 0);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 5), hm);
    wing.position.set(0.5, -0.3, 0);
    this.rotor = new THREE.Mesh(new THREE.CircleGeometry(7.2, 40), new THREE.MeshBasicMaterial({ color: C("#9aa4ab"), transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    this.rotor.rotation.x = -Math.PI / 2;
    this.rotor.position.y = 1.6;
    const rotor2 = this.rotor.clone();
    rotor2.position.y = 2.4;
    heli.add(body, tail, fin, wing, this.rotor, rotor2);
    heli.visible = false;
    heli.renderOrder = 7;
    this.heli = heli;
    this.scene.add(heli);
  }

  buildFx() {
    const N = 600;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aF", new THREE.Float32BufferAttribute(new Float32Array(N * 4), 4));
    g.setDrawRange(0, 0);
    this.fxMat = new THREE.ShaderMaterial({
      uniforms: { ...this.common, uProj: { value: 1 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec4 aF; uniform float uProj; varying vec4 vF;
        void main(){
          vF = aF;
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_PointSize = clamp(aF.y * uProj / -mv.z, 1.5, 900.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec4 vF; // kind, size, age, opacity
        void main(){
          vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.;
          if (r > 1.) discard;
          float k = vF.x; float age = vF.z; float o = vF.w;
          vec3 col; float a;
          float n = noise2(gl_PointCoord*6. + vF.y + age*0.7);
          float rr = r + (n - 0.5) * 0.35;
          if (k < 0.5) { // flash: a hard white core, a short orange bloom
            float core = exp(-r*r*18.); float bl = exp(-r*r*4.);
            col = mix(vec3(1.0,0.45,0.12), vec3(1.0,0.96,0.85), core); a = (core + 0.45*bl) * o * exp(-age*6.);
            col = thermalMix(col*2.4, 1.8);
          } else if (k < 1.5) { // smoke: dark, ragged
            a = smoothstep(1.0, 0.45, rr) * o * 0.85; col = vec3(0.05,0.05,0.05) + n*0.07;
            col = thermalMix(col, 0.38 + 0.25*exp(-age*0.4));
          } else if (k < 2.5) { // dust / soil thrown up
            a = smoothstep(1.0, 0.3, rr) * o * 0.6; col = vec3(0.30,0.25,0.19) * (0.7 + 0.5*n);
            col = thermalMix(col, 0.30 + 0.25*exp(-age*0.8));
          } else if (k < 3.5) { // mine flash (small, hot)
            float core = exp(-r*r*14.); col = vec3(1.0,0.85,0.6); a = core * o * exp(-age*7.); col = thermalMix(col*2., 1.6);
          } else { // glow (people, beacons)
            float core = exp(-r*r*7.); col = vec3(1.0); a = (core + 0.3*exp(-r*r*2.5)) * o; col = thermalMix(col*1.2, 1.25);
          }
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.fxPoints = new THREE.Points(g, this.fxMat);
    this.fxPoints.frustumCulled = false;
    this.fxPoints.renderOrder = 9;
    this.scene.add(this.fxPoints);
    for (let i = 0; i < 24; i++) {
      const l = new LineSegments2(new LineSegmentsGeometry(), lineMat("#ffffff", 2));
      (l.material as LineMaterial).depthTest = true;
      l.visible = false;
      l.renderOrder = 9;
      l.frustumCulled = false;
      this.trailPool.push(l);
      this.scene.add(l);
    }
  }

  // ---------- Per frame ----------
  render(s: WorldState) {
    if (!this.fieldMat) return;
    setCamera(this.camera, s.cam);
    const cp = camPos(s.cam);
    this.common.uCamPos.value.set(cp[0], cp[1], cp[2]);
    this.common.uThermal.value = s.thermal;
    this.common.uTime.value = s.time;
    // haze grows with distance scale
    this.common.uFogDensity.value = 0.32 / Math.max(2000, s.cam.dist * 3.2);
    this.drape.uExag.value = s.exag;
    this.sky.position.set(cp[0], cp[1], cp[2]);
    this.sky.scale.setScalar(this.camera.far * 0.9);

    // country
    this.reliefMat.uniforms.uExagC.value = s.exagC;
    this.reliefMat.uniforms.uO.value = 1;
    this.reliefMat.uniforms.uHole.value = s.field > 0.02 ? 1 : 0;
    const co = s.country;
    (this.ukrFill.material as THREE.MeshBasicMaterial).opacity = 0.05 * co * Math.min(1, Math.max(0, (s.cam.dist - 60000) / 150000));
    const hi = Math.min(1, Math.max(0, (s.cam.dist - 60000) / 150000));
    (this.ukrEdge.material as LineMaterial).opacity = 0.9 * co * s.borders * hi;
    (this.nbEdge.material as LineMaterial).opacity = 0.7 * co * s.borders * hi;
    (this.riverLines.material as LineMaterial).opacity = 0.8 * co * s.rivers * hi;
    this.ukrEdge.visible = this.nbEdge.visible = co > 0.01;
    this.riverLines.visible = co * s.rivers > 0.01;
    for (const key of Object.keys(this.ctrl)) {
      const v = s.control[key as keyof WorldState["control"]] * co * Math.min(1, Math.max(0, (s.cam.dist - 60000) / 150000));
      (this.ctrl[key].fill.material as THREE.MeshBasicMaterial).opacity = 0.42 * v;
      (this.ctrl[key].edge.material as LineMaterial).opacity = 0.95 * v;
      this.ctrl[key].fill.visible = this.ctrl[key].edge.visible = v > 0.01;
    }

    // field
    const fo = s.field;
    const fu = this.fieldMat.uniforms;
    fu.uO.value = fo;
    fu.uSat.value.set(s.sat[0], s.sat[1], s.sat[2]);
    const fr = s.front ?? [];
    fu.uFrontN.value = Math.min(48, fr.length);
    for (let i = 0; i < 48; i++) fu.uFront.value[i].set(...(fr[Math.min(i, fr.length - 1)] ?? [0, 0]));
    fu.uGlow.value = s.frontGlow ?? 0;
    fu.uTint.value = s.sideTint ?? 0;
    fu.uKill.value.set(s.kill?.w ?? 0, s.kill?.o ?? 0);
    fu.uScan.value = s.scan ?? 0;
    fu.uCrater.value = s.craters ?? 0;
    this.woodsMat.uniforms.uO.value = fo * (s.woods ?? 1);
    this.crownMat.uniforms.uO.value = fo * (s.woods ?? 1);
    this.houseMat.uniforms.uO.value = fo * (s.houses ?? 1);
    const R = this.ribbonMats;
    R.roads.uniforms.uO.value = 0.5 * fo * (s.roads ?? 1);
    R.tracks.uniforms.uO.value = 0.3 * fo * (s.roads ?? 1);
    R.trench.uniforms.uO.value = fo * (s.trench ?? 0);
    R.main.uniforms.uO.value = fo * (s.main ?? 0);
    R.mainTrench.uniforms.uO.value = fo * (s.main ?? 0);
    R.third.uniforms.uO.value = fo * (s.third ?? 0);
    R.mines.uniforms.uO.value = 0;
    fu.uMines.value.set(s.mines?.o ?? 0, s.mines?.depth ?? 500, s.mines?.lane ?? 0, 1000);
    R.mines.uniforms.uDepth.value = s.mines?.depth ?? 500;
    R.mines.uniforms.uLane.value = s.mines?.lane ?? 0;
    this.teethMat.uniforms.uO.value = fo * (s.teeth ?? 0);
    this.teethMat.uniforms.uS.value = s.cam.dist < 1200 ? 1.6 : 1;
    // line widths that stay readable from far away
    const px = s.cam.dist / 1100;
    R.trench.uniforms.uW.value = Math.max(3.2, px * 2.2);
    R.mainTrench.uniforms.uW.value = Math.max(3, px * 2.0);
    R.main.uniforms.uW.value = Math.max(6, px * 3.0);
    R.third.uniforms.uW.value = Math.max(6, px * 3.0);
    R.roads.uniforms.uW.value = Math.max(7, px * 1.4);
    R.tracks.uniforms.uW.value = Math.max(3, px * 0.9);

    // units
    const scale = s.unitScale ?? 1;
    this.unitMat.uniforms.uScale.value = scale;
    const byKind: Record<string, Unit[]> = {};
    for (const u of s.units ?? []) (byKind[u.kind] ??= []).push(u);
    for (const kind of Object.keys(this.unitMeshes)) {
      const mesh = this.unitMeshes[kind];
      const list = (byKind[kind] ?? []).filter((u) => (u.o ?? 1) > 0.01).slice(0, 64);
      const g = mesh.geometry as THREE.InstancedBufferGeometry;
      const aU = g.getAttribute("aU") as THREE.InstancedBufferAttribute;
      const aC = g.getAttribute("aC") as THREE.InstancedBufferAttribute;
      list.forEach((u, i) => {
        const c = C(u.side === 0 ? "#45d6c8" : "#f2a33a");
        aU.setXYZW(i, u.x, u.y, (u.yaw * Math.PI) / 180, 0);
        aC.setXYZW(i, c.r, c.g, c.b, u.dead ?? 0);
      });
      aU.needsUpdate = aC.needsUpdate = true;
      g.instanceCount = fo > 0.05 ? list.length : 0;
    }

    // fx points
    const fx = s.fx ?? [];
    const pg = this.fxPoints.geometry;
    const pos = pg.getAttribute("position") as THREE.BufferAttribute;
    const af = pg.getAttribute("aF") as THREE.BufferAttribute;
    const kindN = { flash: 0, smoke: 1, dust: 2, mine: 3, glow: 4 };
    const dots = (s.dots ?? []).map((d) => ({ x: d.x, y: d.y, h: 1.2, age: 0, kind: "glow" as const, size: (d.r ?? 2.2) * scale, o: d.o }));
    const all = [...fx, ...dots].slice(0, 600);
    all.forEach((f, i) => {
      const h = this.heightAt(f.x, f.y) * s.exag + (f.h ?? 2);
      pos.setXYZ(i, f.x, h, -f.y);
      af.setXYZW(i, kindN[f.kind], f.size ?? 10, f.age, f.o ?? 1);
    });
    pos.needsUpdate = af.needsUpdate = true;
    pg.setDrawRange(0, fo > 0.05 ? all.length : 0);
    this.fxMat.uniforms.uProj.value = H / (2 * Math.tan(((s.cam.fov ?? 34) * Math.PI) / 360));

    // trails
    const trails = s.trails ?? [];
    this.trailPool.forEach((l, i) => {
      const t = trails[i];
      if (!t || fo < 0.05 || t.o <= 0.01 || t.pts.length < 2) {
        l.visible = false;
        return;
      }
      const p: number[] = [];
      for (let j = 0; j + 1 < t.pts.length; j++) {
        const a = t.pts[j];
        const b = t.pts[j + 1];
        p.push(a[0], this.heightAt(a[0], a[1]) * s.exag + a[2], -a[1], b[0], this.heightAt(b[0], b[1]) * s.exag + b[2], -b[1]);
      }
      (l.geometry as LineSegmentsGeometry).setPositions(p);
      const m = l.material as LineMaterial;
      m.color.set(t.color);
      m.opacity = t.o;
      m.linewidth = t.width ?? 2;
      l.visible = true;
    });

    // drones + cones
    const dr = (s.drones ?? []).slice(0, 64);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    dr.forEach((d, i) => {
      const h = this.heightAt(d.x, d.y) * s.exag + d.h;
      const sc = Math.max(1, s.cam.dist / 500) * (d.r ?? 1);
      M.compose(new THREE.Vector3(d.x, h, -d.y), Q, new THREE.Vector3(sc, sc, sc));
      M.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      this.droneMesh.setMatrixAt(i, M);
      const cr = d.h * 0.55;
      M.compose(new THREE.Vector3(d.x, h, -d.y), Q, new THREE.Vector3(cr * (d.cone ?? 0) + 0.001, d.h, cr * (d.cone ?? 0) + 0.001));
      this.coneMesh.setMatrixAt(i, M);
    });
    this.droneMesh.count = fo > 0.05 ? dr.length : 0;
    this.coneMesh.count = fo > 0.05 ? dr.length : 0;
    this.droneMesh.instanceMatrix.needsUpdate = this.coneMesh.instanceMatrix.needsUpdate = true;
    const dOp = dr.length ? Math.max(...dr.map((d) => d.o)) : 0;
    (this.droneMesh.material as THREE.MeshBasicMaterial).opacity = dOp;
    (this.coneMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    this.coneMesh.count = 0;

    // helicopter
    if (s.heli && s.heli.o > 0.01 && fo > 0.05) {
      const hh = this.heightAt(s.heli.x, s.heli.y) * s.exag + s.heli.h;
      this.heli.visible = true;
      this.heli.position.set(s.heli.x, hh, -s.heli.y);
      this.heli.rotation.y = -((s.heli.yaw - 90) * Math.PI) / 180;
      const hs = Math.max(1, s.cam.dist / 900);
      this.heli.scale.setScalar(hs);
      this.rotor.rotation.z = s.heli.rotor;
    } else this.heli.visible = false;

    // post
    this.bloom.strength = s.bloom ?? 0.55;
    this.grade.uniforms.uThermal.value = s.thermal;
    this.grade.uniforms.uTime.value = s.time;
    this.grade.uniforms.uFade.value = s.fade ?? 0;
    this.grade.uniforms.uGrain.value = s.grain ?? 0.035;
    this.grade.uniforms.uExposure.value = s.exposure ?? 1;
    this.grade.uniforms.uNight.value = s.night ?? 0;
    this.composer.render();
    const gl = this.renderer.getContext();
    gl.finish();
  }
}

let ENGINE: Engine | null = null;
export const engine = () => (ENGINE ??= new Engine());
