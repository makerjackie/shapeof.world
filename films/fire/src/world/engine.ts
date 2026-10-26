// One WebGL scene for the whole film, rendered synchronously for each frame from a plain WorldState.
// Everything is money bricks: instanced rounded boxes whose banknote look (red faces, paper-edge sides, a white paper
// strap) is drawn procedurally in the shader. Far-away piles ("blocks") are single boxes with the brick seams drawn
// on. A dark warm floor, one soft key light, fog, and a light grade.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Cam, H, W, setCamera } from "./camera";
import { BD, BH, BL, brickAt, FOOT, SY } from "./piles";

export type Lift = { k: number; t: number; to: [number, number, number]; spin?: number };
export type Pile = {
  x: number;
  z: number;
  n: number; // bricks, may be fractional (the top brick scales in)
  seed?: number;
  ash?: number; // 0..1 grey
  fall?: number; // 0..1 the pile collapses onto the floor
  glow?: number; // warm emissive
  dim?: number; // 0..1 darker (focus elsewhere)
  scale?: number; // brick size multiplier (the brick "grows")
  rain?: number; // how many top bricks are still falling into place
  lift?: Lift[]; // top bricks flying away (k = 0 is the top brick)
  yaw?: number; // pile rotation
};
export type Flyer = { p: [number, number, number]; r?: [number, number, number]; s?: number; ash?: number; glow?: number; dim?: number };
export type Label = {
  text: string;
  x: number;
  z: number;
  y?: number;
  size: number; // world units per em
  color?: string;
  alpha?: number;
  rot?: number; // around the vertical, degrees
  weight?: number;
  serif?: boolean;
  upright?: boolean; // stands up instead of lying on the floor
  align?: "left" | "center" | "right";
};
export type Block = { x: number; z: number; h: number; vis?: number };
export type WorldState = {
  cam: Cam;
  piles: Pile[];
  flyers?: Flyer[];
  labels?: Label[];
  blocks?: Block[];
  lights?: { vis: number; t: number; origin: [number, number, number] };
  band?: { pile: number; text: string; vis: number; flip?: number }; // the printed strap on a pile's top brick
  exposure?: number;
  fog?: number;
  bloom?: number;
  focus?: [number, number, number]; // shadow focus: x, z, radius
  key?: number; // key light multiplier
  floorGlow?: number;
  grain?: number;
};

const MAX_BRICKS = 160000;
const MAX_BLOCKS = 4000;
export const DAYS = 18250;

// The printed face of a banknote, stylised (no portrait, no lettering): frame lines, guilloche waves, a pale watermark.
const noteFace = () => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 1024, 512);
  grd.addColorStop(0, "#7d1914");
  grd.addColorStop(0.55, "#a62b22");
  grd.addColorStop(1, "#8a1f19");
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);
  g.globalAlpha = 0.28;
  g.strokeStyle = "#f0a090";
  g.lineWidth = 2;
  for (let k = 0; k < 22; k++) {
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = 70 + k * 17 + Math.sin(x / 61 + k * 0.7) * 18 + Math.sin(x / 23 + k) * 4;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 0.5;
  g.lineWidth = 6;
  g.strokeRect(34, 30, 1024 - 68, 512 - 60);
  g.lineWidth = 2;
  g.strokeRect(52, 48, 1024 - 104, 512 - 96);
  g.globalAlpha = 0.22;
  g.fillStyle = "#ffd8c8";
  g.beginPath();
  g.ellipse(250, 256, 120, 150, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.18;
  for (let r = 40; r < 200; r += 14) {
    g.beginPath();
    g.arc(800, 256, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const brickMaterial = (top: THREE.Texture) => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTop = { value: top };
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 aFx;
varying vec3 vLP;
varying vec3 vLN;
varying vec4 vFx;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vLP = position; vLN = normal; vFx = aFx;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uTop;
varying vec3 vLP;
varying vec3 vLN;
varying vec4 vFx;`,
      )
      .replace(
        "#include <map_fragment>",
        `{
  vec3 p = vLP; vec3 nn = normalize(vLN);
  float topF = step(0.6, abs(nn.y));
  float sideX = step(0.6, abs(nn.x));
  float sideZ = step(0.6, abs(nn.z));
  vec3 col = vec3(0.48, 0.075, 0.058);
  // paper edges of the stacked notes on the sides, faded out where they would be finer than a pixel
  float fq = p.y * 140.0;
  float fw = fwidth(fq);
  float sheets = 0.5 + 0.5 * sin(fq * 6.2832);
  sheets = mix(0.5, sheets, clamp(1.0 - fw * 1.2, 0.0, 1.0));
  vec3 edge = mix(vec3(0.40, 0.065, 0.05), vec3(0.58, 0.20, 0.15), sheets * 0.7);
  col = mix(col, edge, max(sideX, sideZ));
  vec2 uv = vec2(p.x / ${BL.toFixed(3)} + 0.5, p.z / ${BD.toFixed(3)} + 0.5);
  vec3 face = texture2D(uTop, uv).rgb;
  col = mix(col, face, topF);
  // the paper strap round the middle
  float ax = abs(p.x);
  float bw = fwidth(ax) * 1.5 + 0.002;
  float band = (1.0 - smoothstep(0.14 - bw, 0.14 + bw, ax)) * (1.0 - sideX);
  vec3 paper = vec3(0.76, 0.72, 0.64);
  float pl = fwidth(p.x * 30.0);
  paper *= 0.96 + 0.04 * mix(sin(p.x * 30.0 * 6.2832), 0.0, clamp(pl, 0.0, 1.0));
  col = mix(col, paper, band);
  float ash = vFx.y;
  vec3 g = vec3(dot(col, vec3(0.3, 0.59, 0.11)));
  col = mix(col, g * 0.55 + vec3(0.035, 0.032, 0.03), ash);
  col *= 1.0 - 0.78 * vFx.z;
  diffuseColor.rgb *= col;
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0, 0.55, 0.26) * vFx.x * 0.85;`,
      );
  };
  return m;
};

const blockMaterial = () => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWP;\nvarying vec3 vON;`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;\nvON = normal;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP;\nvarying vec3 vON;`).replace(
      "#include <map_fragment>",
      `{
  float ly = vWP.y / ${SY.toFixed(3)};
  float w = fwidth(ly);
  float seam = 1.0 - smoothstep(0.0, w * 1.5 + 0.04, abs(fract(ly) - 0.5) * 2.0 - 0.9);
  vec3 col = mix(vec3(0.30, 0.05, 0.04), vec3(0.42, 0.12, 0.09), step(0.5, abs(vON.y)) * 0.6);
  col *= 0.55 + 0.45 * seam;
  diffuseColor.rgb *= col;
}`,
    );
  };
  return m;
};

const floorMaterial = () => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = { value: 0 };
    sh.uniforms.uCenter = { value: new THREE.Vector2(0, 0) };
    (m as any).userData.sh = sh;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWP;`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP;\nuniform float uGlow;\nuniform vec2 uCenter;`).replace(
      "#include <map_fragment>",
      `{
  vec2 q = vWP.xz;
  float d = length(q - uCenter);
  vec3 col = vec3(0.060, 0.050, 0.043);
  col *= 0.75 + 0.25 * exp(-d * d / 9000.0);
  // a faint ruled grid every 8 units, anti-aliased, fading with distance
  vec2 gq = q / 8.0;
  vec2 gw = fwidth(gq);
  vec2 gl = 1.0 - smoothstep(vec2(0.0), gw * 1.5, abs(fract(gq - 0.5) - 0.5));
  float grid = max(gl.x, gl.y) * clamp(1.0 - max(gw.x, gw.y) * 3.0, 0.0, 1.0);
  col += vec3(0.020, 0.016, 0.012) * grid;
  col += vec3(0.10, 0.055, 0.025) * uGlow * exp(-d * d / 400.0);
  diffuseColor.rgb *= col;
}`,
    );
  };
  return m;
};

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uGrain: { value: 0.035 }, uSeed: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; uniform float uGrain; uniform float uSeed; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  vec2 d = vUv - 0.5; d.x *= ${(W / H).toFixed(4)};
  float v = smoothstep(0.95, 0.25, length(d));
  c.rgb *= mix(1.0 - uVig, 1.0, v);
  c.rgb += (h(vUv * 1000.0) - 0.5) * uGrain;
  gl_FragColor = c;
}`,
};

const POINT_VERT = `attribute float aRow; attribute vec3 aFrom; attribute float aSeed;
uniform float uT; uniform float uVis; varying float vA;
void main(){
  float k = clamp((uT - aRow * 0.55 - aSeed * 0.25) / 0.6, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 p = mix(aFrom, position, k);
  p.y += sin(k * 3.14159) * (2.0 + aSeed * 3.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (2.6 + aSeed * 2.2) * (240.0 / -mv.z);
  vA = uVis * (0.35 + 0.65 * k) * (0.55 + 0.45 * aSeed);
}`;
const POINT_FRAG = `varying float vA;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vec3(1.0, 0.70, 0.38) * a * vA, a * vA); }`;

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  bricks: THREE.InstancedMesh;
  fx: THREE.InstancedBufferAttribute;
  blocks: THREE.InstancedMesh;
  floor: THREE.Mesh;
  floorMat: THREE.MeshStandardMaterial;
  labelPool: THREE.Mesh[] = [];
  labelTex = new Map<string, { tex: THREE.CanvasTexture; w: number; h: number }>();
  points: THREE.Points;
  pointMat: THREE.ShaderMaterial;
  bandMesh: THREE.Mesh;
  bandTex = new Map<string, THREE.CanvasTexture>();
  m4 = new THREE.Matrix4();
  q = new THREE.Quaternion();
  e = new THREE.Euler();
  v = new THREE.Vector3();
  s = new THREE.Vector3();
  frame = 0;
  lightsOrigin = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0907);
    this.scene.fog = new THREE.FogExp2(0x0b0907, 0.004);
    this.camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 5000);

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;

    this.key = new THREE.DirectionalLight(0xffdcb4, 2.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(4096, 4096);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 4;
    this.scene.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight(0x9fb8ff, 0.9);
    this.scene.add(this.rim, this.rim.target);
    this.hemi = new THREE.HemisphereLight(0xb9c4e6, 0x2a1c12, 0.42);
    this.scene.add(this.hemi);

    this.floorMat = floorMaterial();
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const geo = new RoundedBoxGeometry(BL, BH, BD, 2, 0.045);
    this.fx = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BRICKS * 4), 4);
    this.fx.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aFx", this.fx);
    this.bricks = new THREE.InstancedMesh(geo, brickMaterial(noteFace()), MAX_BRICKS);
    this.bricks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bricks.castShadow = true;
    this.bricks.receiveShadow = true;
    this.bricks.frustumCulled = false;
    this.scene.add(this.bricks);

    const bg = new THREE.BoxGeometry(1, 1, 1);
    bg.translate(0, 0.5, 0);
    this.blocks = new THREE.InstancedMesh(bg, blockMaterial(), MAX_BLOCKS);
    this.blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.blocks.castShadow = true;
    this.blocks.receiveShadow = true;
    this.blocks.frustumCulled = false;
    this.scene.add(this.blocks);

    // The days: 50 rows (years) of 365 points, laid out on the floor ahead of the pile.
    const pos = new Float32Array(DAYS * 3);
    const from = new Float32Array(DAYS * 3);
    const row = new Float32Array(DAYS);
    const seed = new Float32Array(DAYS);
    for (let i = 0; i < DAYS; i++) {
      const r = Math.floor(i / 365);
      const c = i % 365;
      const sd = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const jx = (Math.abs(Math.sin(i * 78.233) * 12345.6789) % 1) - 0.5;
      pos.set([(c - 182) * 0.78 + jx * 0.45, 0.08, -6 - r * 2.3 - (sd - 0.5) * 0.9], i * 3);
      row[i] = r / 49;
      seed[i] = sd;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pg.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    pg.setAttribute("aRow", new THREE.BufferAttribute(row, 1));
    pg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    this.pointMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uVis: { value: 0 } },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(pg, this.pointMat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.scene.add(this.points);

    this.bandMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, BD * 0.98), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.bandMesh.visible = false;
    this.scene.add(this.bandMesh);

    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.55, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
  }

  labelTexture(l: Label) {
    const key = `${l.text}|${l.weight ?? 700}|${l.serif ? 1 : 0}|${l.color ?? "#f1ecdf"}|${l.align ?? "center"}`;
    let t = this.labelTex.get(key);
    if (t) return t;
    const px = 160;
    const font = `${l.weight ?? 700} ${px}px ${l.serif ? '"FR Serif"' : '"FR Sans"'}`;
    const c = document.createElement("canvas");
    const g0 = c.getContext("2d")!;
    g0.font = font;
    const tw = Math.ceil(g0.measureText(l.text).width) + 40;
    c.width = tw;
    c.height = Math.ceil(px * 1.4);
    const g = c.getContext("2d")!;
    g.font = font;
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillStyle = l.color ?? "#f1ecdf";
    g.fillText(l.text, tw / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    t = { tex, w: tw / px, h: c.height / px };
    this.labelTex.set(key, t);
    return t;
  }

  bandTexture(text: string) {
    let t = this.bandTex.get(text);
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 580;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e9e1d0";
    g.fillRect(0, 0, 256, 580);
    g.strokeStyle = "rgba(120,40,30,0.5)";
    g.lineWidth = 6;
    g.strokeRect(14, 14, 228, 552);
    g.save();
    g.translate(128, 290);
    g.rotate(-Math.PI / 2);
    g.fillStyle = "#7a1a14";
    g.font = `900 150px "FR Sans"`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, 6);
    g.restore();
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    this.bandTex.set(text, t);
    return t;
  }

  render(s: WorldState, frame: number) {
    setCamera(this.camera, s.cam);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = s.fog ?? 0.004;
    this.renderer.toneMappingExposure = s.exposure ?? 1.0;
    this.bloom.strength = s.bloom ?? 0.35;
    this.key.intensity = 2.6 * (s.key ?? 1);
    const fsh = (this.floorMat as any).userData.sh;
    if (fsh) fsh.uniforms.uGlow.value = s.floorGlow ?? 0;
    this.grade.uniforms.uSeed.value = (frame % 97) * 1.37;
    this.grade.uniforms.uGrain.value = s.grain ?? 0.026;

    // shadow camera follows the focus
    const [fx, fz, fr] = s.focus ?? [s.cam.x, s.cam.z, 40];
    this.key.position.set(fx - 0.55 * fr - 10, 1.1 * fr + 20, fz + 0.45 * fr + 12);
    this.key.target.position.set(fx, 0, fz);
    const sc = this.key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -fr;
    sc.right = fr;
    sc.top = fr;
    sc.bottom = -fr;
    sc.near = 1;
    sc.far = fr * 4 + 80;
    sc.updateProjectionMatrix();
    this.rim.position.set(fx + 30, 25, fz - 60);
    this.rim.target.position.set(fx, 0, fz);
    if (fsh) fsh.uniforms.uCenter.value.set(fx, fz);

    // bricks
    let n = 0;
    const fx4 = this.fx.array as Float32Array;
    const put = (x: number, y: number, z: number, rx: number, ry: number, rz: number, sc: number, glow: number, ash: number, dim: number) => {
      if (n >= MAX_BRICKS || sc <= 0.001) return;
      this.e.set(rx, ry, rz);
      this.q.setFromEuler(this.e);
      this.v.set(x, y, z);
      this.s.set(sc, sc, sc);
      this.m4.compose(this.v, this.q, this.s);
      this.bricks.setMatrixAt(n, this.m4);
      fx4[n * 4] = glow;
      fx4[n * 4 + 1] = ash;
      fx4[n * 4 + 2] = dim;
      fx4[n * 4 + 3] = 0;
      n++;
    };
    let bandPose: { x: number; y: number; z: number; yaw: number; sc: number } | null = null;
    s.piles.forEach((p, pi) => {
      const total = Math.max(0, p.n);
      const full = Math.floor(total + 1e-6);
      const frac = total - full;
      const count = full + (frac > 0.02 ? 1 : 0);
      const seed = p.seed ?? pi * 7.31;
      const sc0 = p.scale ?? 1;
      const cy = Math.cos(p.yaw ?? 0);
      const sy = Math.sin(p.yaw ?? 0);
      const fall = p.fall ?? 0;
      const rain = p.rain ?? 0;
      const liftK = new Map<number, Lift>();
      (p.lift ?? []).forEach((l) => liftK.set(l.k, l));
      for (let i = 0; i < count; i++) {
        const b = brickAt(i);
        let x = b.x * sc0;
        let y = b.y * sc0;
        let z = b.z * sc0;
        let yaw = b.yaw + (p.yaw ?? 0);
        let rx = 0;
        let rz = 0;
        let bsc = sc0;
        let ash = p.ash ?? 0;
        if (i === full && frac > 0) {
          bsc *= 0.4 + 0.6 * frac;
          y += (1 - frac) * 1.2;
        }
        if (rain > 0 && i >= total - rain) {
          const k = Math.max(0, Math.min(1, (total - i) / rain));
          y += (1 - k) * (1 - k) * 6;
        }
        const fromTop = count - 1 - i;
        const lf = liftK.get(fromTop);
        // world position before pile rotation
        let wx = p.x + x * cy + z * sy;
        let wz = p.z - x * sy + z * cy;
        if (lf) {
          const t = Math.max(0, Math.min(1, lf.t));
          const e = t * t * (3 - 2 * t);
          wx = wx + (lf.to[0] - wx) * e;
          y = y + (lf.to[1] - y) * e + Math.sin(t * Math.PI) * 2.0;
          wz = wz + (lf.to[2] - wz) * e;
          yaw += (lf.spin ?? 1.2) * e;
          rx = 0.6 * e;
          bsc *= 1 - 0.85 * Math.max(0, (t - 0.7) / 0.3);
        }
        if (fall > 0) {
          const hsh = (k: number) => {
            const v = Math.sin((i + 1) * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453;
            return v - Math.floor(v);
          };
          const st = hsh(1) * 0.35 + (y / Math.max(1, (count / 18) * SY)) * 0.15;
          const k = Math.max(0, Math.min(1, (fall - st) / 0.55));
          const e = 1 - (1 - k) * (1 - k);
          const ang = hsh(2) * Math.PI * 2;
          const rad = 1.5 + hsh(3) * (FOOT * 0.9 + Math.sqrt(count) * 0.18);
          const tx = p.x + Math.cos(ang) * rad;
          const tz = p.z + Math.sin(ang) * rad;
          const ty = BH / 2 + Math.floor(hsh(4) * 2.2) * SY;
          wx = wx + (tx - wx) * e;
          wz = wz + (tz - wz) * e;
          y = y + (ty - y) * (k * k) + Math.sin(k * Math.PI) * 0.8;
          yaw += (hsh(5) - 0.5) * 3 * e;
          rz = (hsh(6) - 0.5) * 0.5 * e;
          ash = Math.max(ash, Math.min(1, k * 1.4));
        }
        put(wx, y, wz, rx, yaw, rz, bsc, p.glow ?? 0, ash, p.dim ?? 0);
        if (s.band && s.band.pile === pi && i === count - 1 && !lf) bandPose = { x: wx, y: y + (BH / 2) * bsc + 0.012, z: wz, yaw, sc: bsc };
      }
    });
    (s.flyers ?? []).forEach((f) => {
      const r = f.r ?? [0, 0, 0];
      put(f.p[0], f.p[1], f.p[2], r[0], r[1], r[2], f.s ?? 1, f.glow ?? 0, f.ash ?? 0, f.dim ?? 0);
    });
    this.bricks.count = n;
    this.bricks.instanceMatrix.needsUpdate = true;
    this.fx.needsUpdate = true;

    // printed strap on the top brick
    const bp = bandPose as { x: number; y: number; z: number; yaw: number; sc: number } | null;
    if (s.band && bp && s.band.vis > 0.01) {
      const m = this.bandMesh.material as THREE.MeshStandardMaterial;
      m.map = this.bandTexture(s.band.text);
      m.opacity = s.band.vis;
      m.needsUpdate = true;
      this.bandMesh.visible = true;
      this.bandMesh.position.set(bp.x, bp.y, bp.z);
      this.bandMesh.rotation.set(-Math.PI / 2, 0, 0);
      this.bandMesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), bp.yaw);
      // a flip turns the strap like a card: squash across its width, swap the text at the midpoint (director)
      this.bandMesh.scale.set(bp.sc * Math.max(0.02, Math.abs(Math.cos((s.band.flip ?? 0) * Math.PI))), bp.sc, 1);
    } else this.bandMesh.visible = false;

    // far piles as blocks
    let nb = 0;
    (s.blocks ?? []).forEach((b) => {
      if (nb >= MAX_BLOCKS) return;
      const h = Math.max(0.01, b.h * (b.vis ?? 1));
      this.v.set(b.x, 0, b.z);
      this.q.identity();
      this.s.set(FOOT, h, FOOT);
      this.m4.compose(this.v, this.q, this.s);
      this.blocks.setMatrixAt(nb++, this.m4);
    });
    this.blocks.count = nb;
    this.blocks.instanceMatrix.needsUpdate = true;

    // the days
    if (s.lights && s.lights.vis > 0.001) {
      this.points.visible = true;
      this.pointMat.uniforms.uT.value = s.lights.t;
      this.pointMat.uniforms.uVis.value = s.lights.vis;
      const from = this.points.geometry.getAttribute("aFrom") as THREE.BufferAttribute;
      const fa = from.array as Float32Array;
      const [ox, oy, oz] = s.lights.origin;
      const ok = `${ox},${oy},${oz}`;
      if (this.lightsOrigin !== ok) {
        this.lightsOrigin = ok;
        for (let i = 0; i < DAYS; i++) {
          const a = Math.sin(i * 3.1) * 43758.5;
          const r1 = a - Math.floor(a);
          const b = Math.sin(i * 7.7) * 24634.6;
          const r2 = b - Math.floor(b);
          const c = Math.sin(i * 1.3) * 9134.2;
          const r3 = c - Math.floor(c);
          fa[i * 3] = ox + (r1 - 0.5) * FOOT;
          fa[i * 3 + 1] = oy * r2 + 0.2;
          fa[i * 3 + 2] = oz + (r3 - 0.5) * FOOT;
        }
        from.needsUpdate = true;
      }
    } else this.points.visible = false;

    // labels
    const ls = s.labels ?? [];
    while (this.labelPool.length < ls.length) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true }));
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      this.labelPool.push(mesh);
    }
    this.labelPool.forEach((mesh, i) => {
      const l = ls[i];
      if (!l || (l.alpha ?? 1) <= 0.001) {
        mesh.visible = false;
        return;
      }
      const t = this.labelTexture(l);
      const m = mesh.material as THREE.MeshBasicMaterial;
      if (m.map !== t.tex) {
        m.map = t.tex;
        m.needsUpdate = true;
      }
      m.opacity = l.alpha ?? 1;
      mesh.visible = true;
      const w = t.w * l.size;
      const h = t.h * l.size;
      mesh.scale.set(w, h, 1);
      const shift = l.align === "left" ? w / 2 : l.align === "right" ? -w / 2 : 0;
      const rot = ((l.rot ?? 0) * Math.PI) / 180;
      mesh.rotation.set(0, 0, 0);
      if (l.upright) {
        mesh.rotation.y = rot;
        mesh.position.set(l.x + Math.cos(rot) * shift, l.y ?? h / 2, l.z - Math.sin(rot) * shift);
      } else {
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = rot;
        mesh.position.set(l.x + Math.cos(rot) * shift, l.y ?? 0.02, l.z - Math.sin(rot) * shift);
      }
    });

    this.composer.render();
    this.renderer.getContext().finish();
    this.frame = frame;
  }
}

let E: Engine | null = null;
export const engine = () => (E ??= new Engine());
