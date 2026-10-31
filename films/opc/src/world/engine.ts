// One WebGL scene for the whole film, rendered synchronously for each frame from a plain WorldState.
// The market: near stalls are instanced geometry (one draw for desks, one for food carts), the whole market's lamps
// are one instanced glow layer whose brightness follows each stall's success, customers are moving glows.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Cam, H, W, setCamera } from "./camera";
import { BLOCKS, BULB, HERO, HERO_IDS, NEAR, SIGNS, STALLS, STREET_GAP, Stall, stallWorld } from "./market";
import {
  BLOCK_FRAG,
  BLOCK_VERT,
  TILT_FRAG,
  BLDG_FRAG,
  BLDG_VERT,
  GLASS_FRAG,
  GLASS_VERT,
  GLOW_FRAG,
  GLOW_VERT,
  GRADE_FRAG,
  GRADE_VERT,
  GROUND_FRAG,
  GROUND_VERT,
  PILLAR_FRAG,
  PILLAR_VERT,
  PLANE_FRAG,
  PLANE_VERT,
  POOL_FRAG,
  POOL_VERT,
  SKY_FRAG,
  SKY_VERT,
  STALL_FRAG,
  STALL_VERT,
} from "./shaders";

export type StallOverride = { lit?: number; screen?: number; sign?: number; vis?: number; s?: number; keep?: boolean };

export type Glow = { x: number; y: number; z: number; size: number; r: number; g: number; b: number; i: number };

// Income pillars over the near stalls (NEAR order): top height above the base (m), and a colour per pillar
// (0 gold, 1 a loss: dull red, 2 break-even: pale grey).
export type Pillars = { h: ArrayLike<number>; tint?: ArrayLike<number>; gain: number };

// A horizontal glass sheet (a ceiling, a floor, a revenue level). brk 0 whole .. 1 broken and gone.
export type Glass = { y: number; o: number; x?: number; z?: number; w?: number; d?: number; brk?: number; fall?: number; color?: [number, number, number]; grid?: number; lit?: number; base?: number };

export type WorldState = {
  cam: Cam;
  time: number;
  day?: number; // 0 night .. 1 morning
  bloom?: number;
  exposure?: number;
  fogD?: number;
  grade?: { vig: number; grain: number; fade: number };
  equal?: number; // 1: every lamp equally lit; 0: lamps follow success (the long tail)
  farGain?: number; // the market beyond the near streets
  dim?: number; // dim every near stall not marked keep
  over?: Record<number, StallOverride>;
  company?: { vis: number; off: number; sink: number };
  banners?: number;
  glows?: Glow[]; // customers, sparks, hero lights: rebuilt each frame
  stringLights?: number;
  tilt?: { focus: number; band: number; amt: number };
  windows?: number; // share of lit windows in the blocks
  reveal?: number; // lamps switch on out to this distance (m) from the hero street's centre
  pillars?: Pillars;
  glass?: (Glass | null)[]; // up to GLASS_SLOTS sheets
};

// Where a near stall's pillar stands: over its lamp pole, starting above the sign.
export const PILLAR_BASE = 2.5;
export const pillarAt = (st: Stall): [number, number, number] => stallWorld(st, 0, PILLAR_BASE, st.kind === 0 ? -0.36 : -0.4);
const GLASS_SLOTS = 5;

const C = (hex: string) => new THREE.Color(hex);

// ---------- stall geometry ----------
type Part = [number, [number, number, number], [number, number, number], number?, number?]; // part, centre, size, tilt (rad, about x), rounded radius (<0: a wheel)

const DESK: Part[] = [
  [12, [0, 0.76, 0], [1.5, 0.05, 0.75], 0, 0.02], // table top
  [1, [0, 0.42, 0.37], [1.5, 0.66, 0.02]], // the printed cloth on the front
  [0, [-0.7, 0.38, -0.33], [0.04, 0.76, 0.04]],
  [0, [0.7, 0.38, -0.33], [0.04, 0.76, 0.04]],
  [2, [0, 0.79, 0.04], [0.36, 0.016, 0.25]], // laptop base
  [3, [0, 0.9, -0.08], [0.36, 0.24, 0.012], -0.26], // laptop screen, facing the street
  [0, [0, 1.22, -0.36], [0.035, 1.0, 0.035]], // lamp pole
  [0, [0, 1.72, -0.12], [0.03, 0.03, 0.5]], // arm
  [4, [0, 1.68, 0.12], [0.07, 0.09, 0.07]], // bulb
  [5, [0, 2.0, -0.36], [0.96, 0.3, 0.035]], // sign board
  [0, [0, 0.23, -0.62], [0.32, 0.46, 0.32]], // stool
];

const CART: Part[] = [
  [6, [0, 0.64, 0], [1.7, 0.74, 0.86], 0, 0.06], // body
  [7, [0.36, 1.2, 0.04], [0.9, 0.38, 0.6], 0, 0.03], // glass box
  [8, [-0.46, 1.03, 0.04], [0.62, 0.04, 0.62]], // griddle
  [9, [-0.62, 0.2, 0.44], [0.38, 0.38, 0.07], 0, -1],
  [9, [0.62, 0.2, 0.44], [0.38, 0.38, 0.07], 0, -1],
  [9, [-0.62, 0.2, -0.44], [0.38, 0.38, 0.07], 0, -1],
  [9, [0.62, 0.2, -0.44], [0.38, 0.38, 0.07], 0, -1],
  [10, [0, 2.02, 0.06], [1.95, 0.05, 1.25], 0.12, 0.02], // canopy
  [0, [-0.88, 1.52, -0.4], [0.035, 1.0, 0.035]],
  [0, [0.88, 1.52, -0.4], [0.035, 1.0, 0.035]],
  [0, [-0.88, 1.52, 0.5], [0.035, 1.0, 0.035]],
  [0, [0.88, 1.52, 0.5], [0.035, 1.0, 0.035]],
  [4, [0, 1.86, 0.1], [0.08, 0.1, 0.08]], // bulb
  [5, [0, 2.2, 0.66], [1.6, 0.3, 0.035]], // sign on the canopy front
  [11, [0.84, 1.28, 0.44], [0.24, 0.3, 0.012]], // price board
];

const buildStall = (parts: Part[]) => {
  const geos = parts.map(([part, c, s, tilt, round]) => {
    let g: THREE.BufferGeometry;
    if (round !== undefined && round < 0) {
      g = new THREE.CylinderGeometry(s[1] / 2, s[1] / 2, s[2], 20);
      g.rotateX(Math.PI / 2);
    } else if (round) g = new RoundedBoxGeometry(s[0], s[1], s[2], 3, round);
    else g = new THREE.BoxGeometry(s[0], s[1], s[2]);
    if (g.index) g = g.toNonIndexed(); // RoundedBoxGeometry has no index; merge everything non-indexed
    if (tilt) g.rotateX(tilt);
    g.translate(c[0], c[1], c[2]);
    const n = g.getAttribute("position").count;
    g.setAttribute("part", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
    return g;
  });
  return mergeGeometries(geos)!;
};

type StallSet = { mesh: THREE.Mesh; list: Stall[]; aS: THREE.InstancedBufferAttribute; aE: THREE.InstancedBufferAttribute; mat: THREE.ShaderMaterial };

const quad = () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
};

// Equal-lit vs long-tail brightness of a stall
export const effS = (s: number, equal: number) => equal * 0.42 + (1 - equal) * s;
export const effLit = (s: number, equal: number) => equal + (1 - equal) * Math.min(1, 0.12 + 1.2 * Math.sqrt(s));

const MAX_GLOWS = 6000;

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 9000);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  common: Record<string, THREE.IUniform>;
  sky: THREE.Mesh;
  skyU: Record<string, THREE.IUniform>;
  ground: THREE.Mesh;
  groundMat: THREE.ShaderMaterial;
  sets: StallSet[] = [];
  pools: THREE.Mesh;
  poolC: THREE.InstancedBufferAttribute;
  poolList: Stall[];
  bulbs: THREE.Mesh;
  bulbK: THREE.InstancedBufferAttribute;
  bulbC: THREE.InstancedBufferAttribute;
  bulbMat: THREE.ShaderMaterial;
  strings: THREE.Mesh;
  stringMat: THREE.ShaderMaterial;
  glows: THREE.Mesh;
  glowC: THREE.InstancedBufferAttribute;
  glowK: THREE.InstancedBufferAttribute;
  glowMat: THREE.ShaderMaterial;
  bldg: THREE.Mesh;
  bldgMat: THREE.ShaderMaterial;
  banners: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  blocks: THREE.Mesh;
  blockMat: THREE.ShaderMaterial;
  tilt: ShaderPass;
  signs: THREE.CanvasTexture;
  pillars: THREE.Mesh;
  pillarP: THREE.InstancedBufferAttribute;
  pillarK: THREE.InstancedBufferAttribute;
  pillarMat: THREE.ShaderMaterial;
  caps: THREE.Mesh;
  capC: THREE.InstancedBufferAttribute;
  capK: THREE.InstancedBufferAttribute;
  capMat: THREE.ShaderMaterial;
  glass: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // shared fog/light uniforms (one object, so every material sees the same values)
    this.common = {
      uFog: { value: C("#060b14") },
      uFogD: { value: 0.0016 },
      uAmb: { value: C("#0b1220") },
      uLamp: { value: C("#ffb86e") },
      uTime: { value: 0 },
      uDim: { value: 0 },
      uDay: { value: 0 },
    };
    const cu = this.common;

    // sky
    this.skyU = { uTop: { value: C("#03060d") }, uHor: { value: C("#0b1322") }, uGlow: { value: C("#2a2236") }, uStars: { value: 1 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, depthTest: false }));
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // ground
    this.groundMat = new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: { ...cu, uGap: { value: STREET_GAP } } });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    // the sign atlas: 8 x 8 cells, white lettering on transparent
    {
      const cw = 512;
      const ch = 160;
      const cv = document.createElement("canvas");
      cv.width = cw * 8;
      cv.height = ch * 8;
      const g2 = cv.getContext("2d")!;
      g2.fillStyle = "#fff";
      g2.textAlign = "center";
      g2.textBaseline = "middle";
      SIGNS.forEach((t, i) => {
        const x = (i % 8) * cw;
        const y = Math.floor(i / 8) * ch;
        let size = 96;
        g2.font = `800 ${size}px "OPC Sans", "PingFang SC", sans-serif`;
        while (g2.measureText(t).width > cw * 0.84 && size > 40) {
          size -= 4;
          g2.font = `800 ${size}px "OPC Sans", "PingFang SC", sans-serif`;
        }
        g2.fillText(t, x + cw / 2, y + ch / 2 + size * 0.04);
      });
      this.signs = new THREE.CanvasTexture(cv);
      this.signs.anisotropy = 8;
      this.signs.generateMipmaps = true;
      this.signs.minFilter = THREE.LinearMipmapLinearFilter;
    }

    // low buildings between the streets
    {
      const base = new THREE.BoxGeometry(1, 1, 1);
      base.translate(0, 0.5, 0);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = base.index;
      geo.setAttribute("position", base.getAttribute("position"));
      geo.setAttribute("normal", base.getAttribute("normal"));
      const n = BLOCKS.length;
      const A = new Float32Array(n * 4);
      const Hh = new Float32Array(n * 2);
      BLOCKS.forEach((b, i) => {
        A.set([b.x, b.z, b.w, b.d], i * 4);
        Hh.set([b.h, b.seed], i * 2);
      });
      geo.setAttribute("aB", new THREE.InstancedBufferAttribute(A, 4));
      geo.setAttribute("aH", new THREE.InstancedBufferAttribute(Hh, 2));
      geo.instanceCount = n;
      this.blockMat = new THREE.ShaderMaterial({ vertexShader: BLOCK_VERT, fragmentShader: BLOCK_FRAG, uniforms: { ...cu, uWin: { value: 0.32 } } });
      this.blocks = new THREE.Mesh(geo, this.blockMat);
      this.blocks.frustumCulled = false;
      this.scene.add(this.blocks);
    }

    // near stalls
    for (const [kind, parts] of [
      [0, DESK],
      [1, CART],
    ] as const) {
      const list = NEAR.filter((s) => s.kind === kind);
      const base = buildStall(parts as Part[]);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = base.index;
      for (const name of ["position", "normal", "uv", "part"]) geo.setAttribute(name, base.getAttribute(name));
      const n = list.length;
      const P = new Float32Array(n * 4);
      list.forEach((s, i) => P.set([s.x, s.z, s.rot, s.seed], i * 4));
      geo.setAttribute("aP", new THREE.InstancedBufferAttribute(P, 4));
      const aS = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const aE = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      geo.setAttribute("aS", aS);
      geo.setAttribute("aE", aE);
      geo.instanceCount = n;
      const b = BULB[kind];
      const mat = new THREE.ShaderMaterial({ vertexShader: STALL_VERT, fragmentShader: STALL_FRAG, uniforms: { ...cu, uBulb: { value: new THREE.Vector3(b[0], b[1], b[2]) }, uSigns: { value: this.signs } } });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.sets.push({ mesh, list, aS, aE, mat });
    }

    // light pools under the near stalls
    {
      this.poolList = NEAR;
      const g = quad();
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = g.index;
      geo.setAttribute("position", g.getAttribute("position"));
      const n = NEAR.length;
      this.poolC = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([1.0, 0.62, 0.32], i * 3);
      geo.setAttribute("aC", this.poolC);
      geo.setAttribute("aCol", new THREE.InstancedBufferAttribute(col, 3));
      geo.instanceCount = n;
      const mat = new THREE.ShaderMaterial({ vertexShader: POOL_VERT, fragmentShader: POOL_FRAG, uniforms: { ...cu, uGain: { value: 1 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      this.pools = new THREE.Mesh(geo, mat);
      this.pools.frustumCulled = false;
      this.pools.renderOrder = 1;
      this.scene.add(this.pools);
    }

    // every stall's lamp (the whole market)
    {
      const g = quad();
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = g.index;
      geo.setAttribute("position", g.getAttribute("position"));
      const n = STALLS.length;
      this.bulbC = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      this.bulbK = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      STALLS.forEach((s, i) => {
        const b = BULB[s.kind];
        const [x, y, z] = stallWorld(s, b[0], b[1], b[2]);
        this.bulbC.array.set([x, y, z, 0.4], i * 4);
      });
      geo.setAttribute("aC", this.bulbC);
      geo.setAttribute("aK", this.bulbK);
      geo.instanceCount = n;
      this.bulbMat = new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { ...cu, uPx: { value: 0.001 }, uMinPx: { value: 3.0 }, uMaxPx: { value: 38 }, uGain: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.bulbs = new THREE.Mesh(geo, this.bulbMat);
      this.bulbs.frustumCulled = false;
      this.bulbs.renderOrder = 3;
      this.scene.add(this.bulbs);
    }

    // string lights across the near streets
    {
      const pts: number[] = [];
      const ks: number[] = [];
      const R = (i: number) => Math.abs(Math.sin(i * 91.7) * 43758.5) % 1;
      let q = 0;
      for (let k = -3; k <= 3; k++) {
        for (let x0 = -186; x0 < 190; x0 += 9) {
          if (Math.abs(((x0 + 68) % 136 + 136) % 136 - 68) < 9) continue;
          const zc = k * STREET_GAP;
          for (let j = 0; j <= 14; j++) {
            const u = j / 14;
            const z = zc - 4.6 + 9.2 * u;
            const y = 3.6 - 0.7 * Math.sin(Math.PI * u);
            const x = x0 + 1.2 * Math.sin(u * 3.0);
            const h = R(q++);
            const col = h < 0.5 ? [1.0, 0.72, 0.38] : h < 0.75 ? [1.0, 0.45, 0.32] : h < 0.9 ? [0.55, 0.85, 1.0] : [0.7, 1.0, 0.55];
            pts.push(x, y, z, 0.07);
            ks.push(col[0], col[1], col[2], 0.55);
          }
        }
      }
      const g = quad();
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = g.index;
      geo.setAttribute("position", g.getAttribute("position"));
      geo.setAttribute("aC", new THREE.InstancedBufferAttribute(new Float32Array(pts), 4));
      geo.setAttribute("aK", new THREE.InstancedBufferAttribute(new Float32Array(ks), 4));
      geo.instanceCount = pts.length / 4;
      this.stringMat = new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { ...cu, uPx: { value: 0.001 }, uMinPx: { value: 1.6 }, uMaxPx: { value: 16 }, uGain: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.strings = new THREE.Mesh(geo, this.stringMat);
      this.strings.frustumCulled = false;
      this.strings.renderOrder = 3;
      this.scene.add(this.strings);
    }

    // per-frame glows: customers, sparks
    {
      const g = quad();
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = g.index;
      geo.setAttribute("position", g.getAttribute("position"));
      this.glowC = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS * 4), 4);
      this.glowK = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOWS * 4), 4);
      this.glowC.setUsage(THREE.DynamicDrawUsage);
      this.glowK.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("aC", this.glowC);
      geo.setAttribute("aK", this.glowK);
      geo.instanceCount = 0;
      this.glowMat = new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { ...cu, uPx: { value: 0.001 }, uMinPx: { value: 2.0 }, uMaxPx: { value: 11 }, uGain: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.glows = new THREE.Mesh(geo, this.glowMat);
      this.glows.frustumCulled = false;
      this.glows.renderOrder = 4;
      this.scene.add(this.glows);
    }

    // income pillars over the near stalls, and a glow at each top
    {
      const g = quad();
      // a vertical strip: x -1..1, y 0..1
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = g.index;
      geo.setAttribute("position", g.getAttribute("position"));
      const n = NEAR.length;
      this.pillarP = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      this.pillarK = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      NEAR.forEach((st, i) => {
        const [x, y, z] = pillarAt(st);
        this.pillarP.array.set([x, z, y, 0], i * 4);
      });
      geo.setAttribute("aP", this.pillarP);
      geo.setAttribute("aK", this.pillarK);
      geo.instanceCount = n;
      this.pillarMat = new THREE.ShaderMaterial({
        vertexShader: PILLAR_VERT,
        fragmentShader: PILLAR_FRAG,
        uniforms: { ...cu, uPx: { value: 0.001 }, uMinPx: { value: 1.8 }, uWidth: { value: 0.14 }, uGain: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.pillars = new THREE.Mesh(geo, this.pillarMat);
      this.pillars.frustumCulled = false;
      this.pillars.renderOrder = 5;
      this.pillars.visible = false;
      this.scene.add(this.pillars);

      const q = quad();
      const cg = new THREE.InstancedBufferGeometry();
      cg.index = q.index;
      cg.setAttribute("position", q.getAttribute("position"));
      this.capC = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      this.capK = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      cg.setAttribute("aC", this.capC);
      cg.setAttribute("aK", this.capK);
      cg.instanceCount = n;
      this.capMat = new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { ...cu, uPx: { value: 0.001 }, uMinPx: { value: 3.0 }, uMaxPx: { value: 26 }, uGain: { value: 1 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.caps = new THREE.Mesh(cg, this.capMat);
      this.caps.frustumCulled = false;
      this.caps.renderOrder = 6;
      this.caps.visible = false;
      this.scene.add(this.caps);
    }

    // glass sheets: tiles of one big horizontal plane
    for (let k = 0; k < GLASS_SLOTS; k++) {
      const NX = 28;
      const NZ = 14;
      const q = quad();
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = q.index;
      geo.setAttribute("position", q.getAttribute("position"));
      const T = new Float32Array(NX * NZ * 3);
      for (let ix = 0; ix < NX; ix++)
        for (let iz = 0; iz < NZ; iz++) {
          const i = ix * NZ + iz;
          const h = Math.abs(Math.sin((ix * 12.9898 + iz * 78.233 + k * 37.719) * 1.0) * 43758.5453) % 1;
          T.set([ix, iz, h], i * 3);
        }
      geo.setAttribute("aT", new THREE.InstancedBufferAttribute(T, 3));
      geo.instanceCount = NX * NZ;
      const mat = new THREE.ShaderMaterial({
        vertexShader: GLASS_VERT,
        fragmentShader: GLASS_FRAG,
        uniforms: {
          uFogD: cu.uFogD,
          uC: { value: new THREE.Vector3() },
          uSize: { value: new THREE.Vector2(400, 160) },
          uN: { value: new THREE.Vector2(NX, NZ) },
          uBreak: { value: 0 },
          uFall: { value: 1 },
          uColor: { value: new THREE.Color(0.62, 0.8, 1.0) },
          uOpacity: { value: 0 },
          uGrid: { value: 4 },
          uLit: { value: -1 },
          uBase: { value: 1 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 7;
      mesh.visible = false;
      this.scene.add(mesh);
      this.glass.push({ mesh, mat });
    }

    // the company building
    {
      const c = HERO.company;
      this.bldgMat = new THREE.ShaderMaterial({
        vertexShader: BLDG_VERT,
        fragmentShader: BLDG_FRAG,
        uniforms: { ...cu, uOff: { value: 0 }, uSink: { value: 0 }, uFloors: { value: 4 }, uCols: { value: 9 }, uSize: { value: new THREE.Vector3(c.w, c.h, c.d) } },
      });
      const g = new THREE.BoxGeometry(c.w, c.h, c.d);
      g.translate(0, c.h / 2, 0);
      this.bldg = new THREE.Mesh(g, this.bldgMat);
      this.bldg.position.set(c.x, 0, c.z);
      this.scene.add(this.bldg);
    }

    // policy banners hung across the hero street (lettering drawn into canvas textures)
    const BANNERS: [number, string][] = [
      [58, "人工智能 OPC 社区 · 欢迎入驻"],
      [76, "一人公司 · 免费工位 · 算力补贴"],
      [94, "超级个体 · 拎包创业"],
    ];
    for (const [x, text] of BANNERS) {
      const cv = document.createElement("canvas");
      cv.width = 1024;
      cv.height = 128;
      const g2 = cv.getContext("2d")!;
      g2.fillStyle = "#b8141c";
      g2.fillRect(0, 0, 1024, 128);
      g2.fillStyle = "#ffd66b";
      g2.font = `700 62px "OPC Sans", "PingFang SC", sans-serif`;
      g2.textAlign = "center";
      g2.textBaseline = "middle";
      g2.fillText(text, 512, 68);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const mat = new THREE.ShaderMaterial({ vertexShader: PLANE_VERT, fragmentShader: PLANE_FRAG, uniforms: { ...cu, map: { value: tex }, uOpacity: { value: 1 }, uEmis: { value: 0.55 } }, transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.1), mat);
      mesh.position.set(x, 4.3, 0);
      mesh.rotation.y = -Math.PI / 2; // lettering reads for a camera coming from -x
      mesh.visible = false;
      this.scene.add(mesh);
      this.banners.push({ mesh, mat });
    }

    // post: bloom, tone mapping, then the grade (split tone, vignette, grain)
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.55, 0.8);
    this.composer.addPass(this.bloom);
    this.tilt = new ShaderPass(
      new THREE.ShaderMaterial({ vertexShader: GRADE_VERT, fragmentShader: TILT_FRAG, uniforms: { tDiffuse: { value: null }, uFocus: { value: 0.5 }, uBand: { value: 0.12 }, uAmt: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } } }),
    );
    this.composer.addPass(this.tilt);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(
      new THREE.ShaderMaterial({ vertexShader: GRADE_VERT, fragmentShader: GRADE_FRAG, uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.5 }, uGrain: { value: 0.024 }, uFade: { value: 0 } } }),
    );
    this.composer.addPass(this.grade);
  }

  render(s: WorldState) {
    const cu = this.common;
    const day = s.day ?? 0;
    const equal = s.equal ?? 1;
    cu.uTime.value = s.time;
    cu.uDim.value = s.dim ?? 0;
    cu.uDay.value = day;
    cu.uFogD.value = s.fogD ?? 0.0016;
    // night -> morning: sky, fog, ambient
    const mixC = (a: string, b: string, t: number) => C(a).lerp(C(b), t);
    (cu.uFog.value as THREE.Color).copy(mixC("#060b14", "#8e8f99", day));
    (cu.uAmb.value as THREE.Color).copy(mixC("#0b1220", "#2c3240", day));
    (this.skyU.uTop.value as THREE.Color).copy(mixC("#03060d", "#2d4f7c", day));
    (this.skyU.uHor.value as THREE.Color).copy(mixC("#0b1322", "#a9b6c6", day));
    (this.skyU.uGlow.value as THREE.Color).copy(mixC("#2a2236", "#ffb27a", day));
    this.skyU.uStars.value = 1 - day;
    const lampDay = 1 - 0.85 * day;

    // near stalls: brightness from success unless overridden
    const over = s.over ?? {};
    for (const set of this.sets) {
      const aS = set.aS.array as Float32Array;
      const aE = set.aE.array as Float32Array;
      set.list.forEach((st, i) => {
        const o = over[st.id];
        const sv = o?.s ?? effS(st.s, equal);
        let lit = (o?.lit ?? effLit(st.s, equal)) * lampDay;
        let vis = o?.vis ?? 1;
        if (st.id === HERO_IDS.folded && o?.vis === undefined) vis = 0;
        aS[i * 4] = lit;
        aS[i * 4 + 1] = sv;
        aS[i * 4 + 2] = st.hue;
        aS[i * 4 + 3] = st.sign;
        aE[i * 4] = (o?.screen ?? 0.35 + 0.65 * lit) * (st.kind === 0 ? 1 : 0);
        aE[i * 4 + 1] = o?.sign ?? 0.9;
        aE[i * 4 + 2] = o?.keep ? 1 : 0;
        aE[i * 4 + 3] = vis;
      });
      set.aS.needsUpdate = true;
      set.aE.needsUpdate = true;
    }

    // pools under near stalls
    {
      const a = this.poolC.array as Float32Array;
      const dim = s.dim ?? 0;
      this.poolList.forEach((st, i) => {
        const o = over[st.id];
        const sv = o?.s ?? effS(st.s, equal);
        const lit = (o?.lit ?? effLit(st.s, equal)) * lampDay;
        let vis = o?.vis ?? 1;
        if (st.id === HERO_IDS.folded && o?.vis === undefined) vis = 0;
        const [x, , z] = stallWorld(st, 0, 0, 0.7);
        const keep = o?.keep ? 1 : 0;
        a.set([x, z, 1.6 + 3.2 * sv, lit * vis * (0.18 + 0.7 * sv) * (1 - dim * 0.78 * (1 - keep))], i * 4);
      });
      this.poolC.needsUpdate = true;
    }

    // every lamp in the market
    {
      const K = this.bulbK.array as Float32Array;
      const Cc = this.bulbC.array as Float32Array;
      const far = s.farGain ?? 1;
      const dim = s.dim ?? 0;
      STALLS.forEach((st, i) => {
        const o = over[st.id];
        const sv = o?.s ?? effS(st.s, equal);
        const lit = (o?.lit ?? effLit(st.s, equal)) * lampDay;
        let vis = o?.vis ?? 1;
        if (st.id === HERO_IDS.folded && o?.vis === undefined) vis = 0;
        const keep = o?.keep ? 1 : 0;
        const rv = s.reveal ?? 1e9;
        const dd = Math.hypot(st.x * 0.6, st.z);
        const on = Math.min(1, Math.max(0, (rv - dd) / 40));
        const g = (st.near ? 1 : far) * (1 - dim * 0.8 * (1 - keep)) * on;
        // brighter stalls glow larger and whiter-gold
        const warm = Math.min(1, sv * 1.4);
        const cool = st.tint;
        Cc[i * 4 + 3] = 0.22 + 0.75 * sv + 5.5 * sv * sv * sv * sv * (1 - equal);
        K[i * 4] = 1.0 - 0.25 * cool;
        K[i * 4 + 1] = 0.6 + 0.25 * warm + 0.25 * cool;
        K[i * 4 + 2] = 0.3 + 0.25 * warm + 0.62 * cool;
        K[i * 4 + 3] = Math.min(1.7, lit * vis * g * (0.5 + 3.5 * sv) * (equal * st.jit + (1 - equal)));
      });
      this.bulbK.needsUpdate = true;
      this.bulbC.needsUpdate = true;
    }

    // per-frame glows
    {
      const list = s.glows ?? [];
      const n = Math.min(MAX_GLOWS, list.length);
      const Cc = this.glowC.array as Float32Array;
      const K = this.glowK.array as Float32Array;
      for (let i = 0; i < n; i++) {
        const g = list[i];
        Cc[i * 4] = g.x;
        Cc[i * 4 + 1] = g.y;
        Cc[i * 4 + 2] = g.z;
        Cc[i * 4 + 3] = g.size;
        K[i * 4] = g.r;
        K[i * 4 + 1] = g.g;
        K[i * 4 + 2] = g.b;
        K[i * 4 + 3] = g.i;
      }
      (this.glows.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
      this.glowC.needsUpdate = true;
      this.glowK.needsUpdate = true;
    }

    // income pillars
    {
      const pl = s.pillars;
      const on = !!pl && pl.gain > 0.001;
      this.pillars.visible = on;
      this.caps.visible = on;
      if (pl && on) {
        const P = this.pillarP.array as Float32Array;
        const Kk = this.pillarK.array as Float32Array;
        const Cc = this.capC.array as Float32Array;
        const Kc = this.capK.array as Float32Array;
        const n = NEAR.length;
        for (let i = 0; i < n; i++) {
          const h = Math.max(0, pl.h[i] ?? 0);
          const tint = pl.tint ? pl.tint[i] ?? 0 : 0;
          P[i * 4 + 3] = h;
          // gold, brighter and whiter the taller it stands; losses dull red; break-even pale grey
          const tall = Math.min(1, Math.log10(1 + h) / 2.6);
          let r = 1.0, g = 0.62 + 0.25 * tall, b = 0.26 + 0.4 * tall;
          if (tint > 0.5 && tint < 1.5) { r = 0.85; g = 0.2; b = 0.16; }
          else if (tint >= 1.5) { r = 0.62; g = 0.66; b = 0.72; }
          const vis = h > 0.03 ? 1 : 0;
          const k = pl.gain * vis * (0.55 + 0.45 * tall);
          Kk.set([r, g, b, k], i * 4);
          Cc.set([P[i * 4], P[i * 4 + 2] + h, P[i * 4 + 1], 0.32 + 0.25 * tall], i * 4);
          Kc.set([r, g, b, k * (0.9 + 0.8 * tall)], i * 4);
        }
        this.pillarP.needsUpdate = true;
        this.pillarK.needsUpdate = true;
        this.capC.needsUpdate = true;
        this.capK.needsUpdate = true;
      }
    }

    // glass sheets
    for (let k = 0; k < GLASS_SLOTS; k++) {
      const gs = s.glass?.[k];
      const { mesh, mat } = this.glass[k];
      const show = !!gs && gs.o > 0.002 && (gs.brk ?? 0) < 0.999;
      mesh.visible = show;
      if (!gs || !show) continue;
      const u = mat.uniforms;
      (u.uC.value as THREE.Vector3).set(gs.x ?? 0, gs.y, gs.z ?? 0);
      (u.uSize.value as THREE.Vector2).set(gs.w ?? 420, gs.d ?? 170);
      u.uBreak.value = gs.brk ?? 0;
      u.uFall.value = gs.fall ?? 1;
      u.uOpacity.value = gs.o;
      u.uGrid.value = gs.grid ?? 4;
      u.uLit.value = gs.lit ?? -1;
      u.uBase.value = gs.base ?? 1;
      const c = gs.color ?? [0.62, 0.8, 1.0];
      (u.uColor.value as THREE.Color).setRGB(c[0], c[1], c[2]);
    }

    this.blockMat.uniforms.uWin.value = (s.windows ?? 0.32) * (1 - 0.6 * day);
    const tl = s.tilt ?? { focus: 0.5, band: 0.2, amt: 0 };
    this.tilt.uniforms.uFocus.value = tl.focus;
    this.tilt.uniforms.uBand.value = tl.band;
    this.tilt.uniforms.uAmt.value = tl.amt;
    this.stringMat.uniforms.uGain.value = (s.stringLights ?? 1) * lampDay * (1 - (s.dim ?? 0) * 0.7);

    // company building
    const co = s.company ?? { vis: 0, off: 0, sink: 0 };
    this.bldg.visible = co.vis > 0.001;
    this.bldgMat.uniforms.uOff.value = co.off;
    this.bldgMat.uniforms.uSink.value = co.sink * HERO.company.h;

    for (const b of this.banners) {
      b.mesh.visible = (s.banners ?? 0) > 0.01;
      b.mat.uniforms.uOpacity.value = s.banners ?? 0;
    }

    setCamera(this.camera, s.cam);
    const px = (2 * Math.tan(((s.cam.fov / 2) * Math.PI) / 180)) / H;
    this.bulbMat.uniforms.uPx.value = px;
    this.stringMat.uniforms.uPx.value = px;
    this.glowMat.uniforms.uPx.value = px;
    this.pillarMat.uniforms.uPx.value = px;
    this.capMat.uniforms.uPx.value = px;
    this.sky.position.copy(this.camera.position);
    this.renderer.toneMappingExposure = s.exposure ?? 1.0;
    this.bloom.strength = s.bloom ?? 0.6;
    const gu = this.grade.uniforms;
    gu.uTime.value = s.time;
    gu.uVig.value = s.grade?.vig ?? 0.5;
    gu.uGrain.value = s.grade?.grain ?? 0.024;
    gu.uFade.value = s.grade?.fade ?? 0;
    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let E: Engine | null = null;
export const engine = () => (E ??= new Engine());
