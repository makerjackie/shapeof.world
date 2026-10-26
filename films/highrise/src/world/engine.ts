// One WebGL scene for the whole film, rendered synchronously for each frame from a plain WorldState.
// The city is instanced slabs drawn by one shader (shaders.ts). The hero tower can be cut open (its south wall
// peels away floor by floor) to show its 132 flats as lit rooms with people in them, or turned into an X-ray of
// its machinery (lift shafts and cars, stairs, water riser, roof tank, pump room).
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Bldg, CITY, FH, HERO, OLD, P, ROAD, ROOFS, ROOM_Z, UNITS, heroHH } from "./city";
import { Cam, H, W, setCamera } from "./camera";
import {
  ADOT_FRAG,
  ADOT_VERT,
  BLDG_FRAG,
  BLDG_VERT,
  GRADE_FRAG,
  GRADE_VERT,
  SMOKE_FRAG,
  COIN_FRAG,
  COIN_VERT,
  CONC_FRAG,
  CONC_VERT,
  DOT_FRAG,
  DOT_VERT,
  GLOW_FRAG,
  GLOW_VERT,
  GROUND_FRAG,
  GROUND_VERT,
  PERSON_FRAG,
  ROOM_FRAG,
  ROOM_VERT,
  SKY_FRAG,
  SKY_VERT,
} from "./shaders";

export const PEOPLE = 264; // two per flat
export const CLIMBERS = 26; // people on the stairs when the lifts stop

export type WorldState = {
  cam: Cam;
  time: number;
  night: number; // 0 blue hour .. 1 night
  bloom?: number;
  exposure?: number;
  dim?: number;
  traffic?: number;
  blur?: number; // CSS blur of the whole world, px (behind full-screen typography)
  grade?: { vig: number; grain: number; fade: number };
  city: {
    lights: number;
    darkR?: number;
    darkAmt?: number;
    patch?: number;
    elev?: number;
    elevAge?: number;
    dim?: number;
    hideEast?: boolean;
    focus?: [number, number, number]; // x, z, radius
    iso?: number;
    lampK?: number;
  };
  walkup?: { vis: number; rise: number }; // the 6-floor walk-up beside the hero
  smoke?: { vis: number; level: number };
  ladder?: { vis: number; ext: number };
  alarms?: { vis: number; alive: Float32Array }; // 33 floors
  climbers?: { vis: number; t: number; top: number };
  fireSys?: number; // X-ray: the fire mains and pump in red
  hero: {
    vis: number;
    built: number;
    hh: Float32Array; // 132 x [lit, yes, no, gone]
    hh2: Float32Array; // 132 x [tenant, subdivided, noise, mark]
    hh3?: Float32Array; // 132 x [unpaid, smoke, cold, spare]
    owners?: number;
    age: number;
    xray: number;
    vote: number;
    peel: number; // 0 closed .. 1 the whole south wall gone
    water: number;
    lifts: [number, number];
    liftGlow?: number;
    liftsFront?: number; // lift cars shown in the open core (cut-open view)
    stairs: number;
    line100?: number;
    refuge?: number;
    fire?: number; // the 50 m ladder line
  };
  people?: { pos: Float32Array; vis: number; grey?: number }; // PEOPLE x [x, y, z, scale]
  coins?: { t: number; vis: number };
  tank?: { vis: number; level: number };
  old?: { vis: number; floors: number; drop: number };
  ghost?: { vis: number; lift: number };
  outline?: number;
};

const C = (hex: string) => new THREE.Color(hex);

type Inst = { mesh: THREE.Mesh; geo: THREE.InstancedBufferGeometry; aC: THREE.InstancedBufferAttribute; aB: THREE.InstancedBufferAttribute; list: Bldg[] };

const unitBox = () => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
};

const makeInst = (list: Bldg[], mat: THREE.ShaderMaterial): Inst => {
  const base = unitBox();
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("normal", base.getAttribute("normal"));
  const n = list.length;
  const A = new Float32Array(n * 4);
  const B = new Float32Array(n * 4);
  const Cc = new Float32Array(n * 4);
  list.forEach((b, i) => {
    A.set([b.x, b.z, b.rot, b.seed], i * 4);
    B.set([b.w, b.d, b.h, b.kind], i * 4);
    Cc.set([b.occ, b.group, b.dist, 0], i * 4);
  });
  geo.setAttribute("aA", new THREE.InstancedBufferAttribute(A, 4));
  const aB = new THREE.InstancedBufferAttribute(B, 4);
  const aC = new THREE.InstancedBufferAttribute(Cc, 4);
  geo.setAttribute("aB", aB);
  geo.setAttribute("aC", aC);
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, geo, aB, aC, list };
};

const bldgUniforms = () => ({
  uTime: { value: 0 },
  uNight: { value: 1 },
  uLights: { value: 0.6 },
  uFogC: { value: C("#141a28") },
  uFogD: { value: 1 / 9000 },
  uSkyHor: { value: C("#2a3550") },
  uDarkR: { value: 99999 },
  uDarkAmt: { value: 0 },
  uPatch: { value: 0 },
  uElev: { value: 0 },
  uElevAge: { value: 0 },
  uDim: { value: 1 },
  uHide: { value: -99 },
  uFocus: { value: new THREE.Vector3(0, 0, 1e5) },
  uIso: { value: 0 },
  uLampK: { value: 1 },
});

const adots = (n: number, color: string) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aAlpha", new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(new Float32Array(n).fill(1), 1));
  const m = new THREE.ShaderMaterial({
    vertexShader: ADOT_VERT,
    fragmentShader: ADOT_FRAG,
    uniforms: { uColor: { value: C(color) }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 9;
  return p;
};

const lineMat = (color: string, width: number) =>
  new LineMaterial({ color: C(color).getHex(), linewidth: width, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, resolution: new THREE.Vector2(W, H) });

const segs = (pts: number[]) => {
  const g = new LineSegmentsGeometry();
  g.setPositions(pts);
  return g;
};

const glowMat = (color: string, color2: string, rim = 0.6, depthTest = false) =>
  new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uColor: { value: C(color) }, uColor2: { value: C(color2) }, uOpacity: { value: 0 }, uLevel: { value: 1e5 }, uFlow: { value: 0 }, uTime: { value: 0 }, uRim: { value: rim } },
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: THREE.AdditiveBlending,
  });

const dots = (pts: number[], seeds: number[], sizes: number[], color: string, blink: number, scale: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  const m = new THREE.ShaderMaterial({
    vertexShader: DOT_VERT,
    fragmentShader: DOT_FRAG,
    uniforms: { uTime: { value: 0 }, uScale: { value: scale }, uBlink: { value: blink }, uColor: { value: C(color) }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
};

const dataTex = (data: Float32Array) => {
  const t = new THREE.DataTexture(data, 4, 33, THREE.RGBAFormat, THREE.FloatType);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
};

// the lift core sits in the 3 m gap between the middle flats, open to the front when the tower is cut
const LIFT_X = [-0.72, 0.72];
const LIFT_Z_FRONT = 4.6;

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, W / H, 1, 60000);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  sky: THREE.Mesh;
  skyU: Record<string, THREE.IUniform>;
  groundU: Record<string, THREE.IUniform>;
  bMat: THREE.ShaderMaterial;
  heroMat: THREE.ShaderMaterial;
  city: Inst;
  old: Inst;
  hero: Inst;
  hhData = new Float32Array(4 * 33 * 4);
  hh2Data = new Float32Array(4 * 33 * 4);
  hhTex: THREE.DataTexture;
  hh2Tex: THREE.DataTexture;
  rooms: THREE.Mesh;
  roomMat: THREE.ShaderMaterial;
  slabs: THREE.InstancedMesh;
  walls: THREE.InstancedMesh;
  concMat: THREE.ShaderMaterial;
  people: THREE.InstancedMesh;
  personMat: THREE.ShaderMaterial;
  heroLines: LineSegments2;
  heroLinesMat: LineMaterial;
  stairLines: LineSegments2;
  stairMat: LineMaterial;
  stairCount: number;
  ghost: LineSegments2;
  ghostMat: LineMaterial;
  outlineL: LineSegments2;
  outlineMat: LineMaterial;
  oldLine: LineSegments2;
  oldLineMat: LineMaterial;
  line100: LineSegments2;
  line100Mat: LineMaterial;
  refuge: THREE.Mesh;
  refugeMat: THREE.ShaderMaterial;
  fire: THREE.Mesh;
  fireMat: THREE.ShaderMaterial;
  fireLine: LineSegments2;
  fireLineMat: LineMaterial;
  shafts: THREE.Mesh[] = [];
  cars: THREE.Mesh[] = [];
  carMat: THREE.ShaderMaterial;
  shaftMat: THREE.ShaderMaterial;
  riser: THREE.Mesh;
  riserMat: THREE.ShaderMaterial;
  roofTank: THREE.Mesh;
  roofTankMat: THREE.ShaderMaterial;
  pump: THREE.Mesh;
  pumpMat: THREE.ShaderMaterial;
  machine: THREE.Mesh;
  coins: THREE.InstancedMesh;
  coinMat: THREE.ShaderMaterial;
  tankGlass: THREE.Mesh;
  tankGlassMat: THREE.ShaderMaterial;
  tankFill: THREE.Mesh;
  tankFillMat: THREE.ShaderMaterial;
  avLights: THREE.Points;
  lampHeads: THREE.Points;
  hh3Data = new Float32Array(4 * 33 * 4);
  hh3Tex: THREE.DataTexture;
  smoke: THREE.Mesh;
  smokeMat: THREE.ShaderMaterial;
  ladder: LineSegments2;
  ladderMat: LineMaterial;
  truck: THREE.Mesh;
  alarms: THREE.Points;
  climbers: THREE.Points;
  fireRiser: THREE.Mesh;
  fireRiserMat: THREE.ShaderMaterial;
  firePump: THREE.Mesh;
  firePumpMat: THREE.ShaderMaterial;
  grade: ShaderPass;

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

    // sky
    this.skyU = { uZen: { value: C("#050a18") }, uMid: { value: C("#0e1a34") }, uHor: { value: C("#2a3550") }, uGlow: { value: C("#c8784a") }, uNight: { value: 1 }, uDim: { value: 1 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, depthTest: false }));
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // ground
    this.groundU = {
      uTime: { value: 0 },
      uNight: { value: 1 },
      uTraffic: { value: 1 },
      uFogC: { value: C("#141a28") },
      uFogD: { value: 1 / 9000 },
      uSkyHor: { value: C("#2a3550") },
      uP: { value: P },
      uRoadW: { value: ROAD },
      uDarkR: { value: 99999 },
      uDarkAmt: { value: 0 },
      uDim: { value: 1 },
      uSea: { value: 0 },
      uSeaZ: { value: 0 },
      uSiteC: { value: new THREE.Vector2(0, 0) },
      uSiteR: { value: 5200 },
      uRiver: { value: 1 },
      uFocus: { value: new THREE.Vector3(0, 0, 1e5) },
      uIso: { value: 0 },
    };
    const gg = new THREE.PlaneGeometry(160000, 160000, 1, 1);
    gg.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(gg, new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: this.groundU }));
    ground.frustumCulled = false;
    this.scene.add(ground);

    // the city, with machine rooms on the roofs
    this.bMat = new THREE.ShaderMaterial({ vertexShader: BLDG_VERT, fragmentShader: BLDG_FRAG, uniforms: bldgUniforms() });
    this.city = makeInst([...CITY, ...ROOFS], this.bMat);
    this.scene.add(this.city.mesh);
    this.old = makeInst([{ x: OLD.x, z: OLD.z, rot: 0, seed: 0.37, w: OLD.w, d: OLD.d, h: 6 * FH, kind: 1, occ: 0.9, group: 7, dist: 66 }], this.bMat.clone());
    this.scene.add(this.old.mesh);

    // the hero
    this.hhTex = dataTex(this.hhData);
    this.hh2Tex = dataTex(this.hh2Data);
    this.hh3Tex = dataTex(this.hh3Data);
    this.heroMat = new THREE.ShaderMaterial({
      vertexShader: BLDG_VERT,
      fragmentShader: BLDG_FRAG,
      uniforms: { ...bldgUniforms(), uHH: { value: this.hhTex }, uXray: { value: 0 }, uAge: { value: 0 }, uVote: { value: 0 }, uPeelY: { value: 999 }, uFireY: { value: 50 }, uFire: { value: 0 } },
      defines: { HERO: 1 },
      transparent: true,
    });
    this.hero = makeInst([{ x: 0, z: 0, rot: 0, seed: 0.618, w: HERO.w, d: HERO.d, h: HERO.h, kind: 5, occ: 1, group: 5, dist: 0 }], this.heroMat);
    this.hero.mesh.renderOrder = 2;
    this.scene.add(this.hero.mesh);

    // the cut-open tower: one room box per flat, slabs, party walls, people
    const rb = unitBox();
    const rgeo = new THREE.InstancedBufferGeometry();
    rgeo.index = rb.index;
    rgeo.setAttribute("position", rb.getAttribute("position"));
    rgeo.setAttribute("normal", rb.getAttribute("normal"));
    const RA = new Float32Array(132 * 4);
    const RS = new Float32Array(132 * 4);
    for (let i = 0; i < 132; i++) {
      const f = Math.floor(i / 4);
      const [a, b] = UNITS[i % 4];
      RA.set([(a + b) / 2, f * FH + 0.17, (ROOM_Z[0] + ROOM_Z[1]) / 2, i], i * 4);
      RS.set([b - a - 0.38, FH - 0.34, ROOM_Z[1] - ROOM_Z[0], ((i * 0.6180339) % 1) * 0.999], i * 4);
    }
    rgeo.setAttribute("aR", new THREE.InstancedBufferAttribute(RA, 4));
    rgeo.setAttribute("aS", new THREE.InstancedBufferAttribute(RS, 4));
    rgeo.instanceCount = 132;
    this.roomMat = new THREE.ShaderMaterial({
      vertexShader: ROOM_VERT,
      fragmentShader: ROOM_FRAG,
      side: THREE.BackSide,
      uniforms: {
        uHH: { value: this.hhTex },
        uHH2: { value: this.hh2Tex },
        uHH3: { value: this.hh3Tex },
        uOwners: { value: 0 },
        uTime: { value: 0 },
        uNight: { value: 1 },
        uVote: { value: 0 },
        uAge: { value: 0 },
        uDim: { value: 1 },
        uFogC: { value: C("#141a28") },
        uFogD: { value: 1 / 9000 },
      },
    });
    this.rooms = new THREE.Mesh(rgeo, this.roomMat);
    this.rooms.frustumCulled = false;
    this.scene.add(this.rooms);

    this.concMat = new THREE.ShaderMaterial({ vertexShader: CONC_VERT, fragmentShader: CONC_FRAG, uniforms: { uNight: { value: 1 }, uDim: { value: 1 }, uAge: { value: 0 }, uCut: { value: 1 }, uFogC: { value: C("#141a28") }, uFogD: { value: 1 / 9000 } } });
    this.slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(HERO.w - 0.1, 0.28, 13.62), this.concMat, HERO.floors + 1);
    const m4 = new THREE.Matrix4();
    for (let f = 0; f <= HERO.floors; f++) {
      m4.makeTranslation(0, f * FH + 0.003, 0.12);
      this.slabs.setMatrixAt(f, m4);
    }
    this.slabs.frustumCulled = false;
    this.scene.add(this.slabs);
    const wallXs = [-11.75, -1.5, 1.5, 11.75];
    this.walls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, HERO.h - 0.02, 13.6), this.concMat, wallXs.length);
    wallXs.forEach((x, i) => {
      m4.makeTranslation(x, HERO.h / 2, 0.11);
      this.walls.setMatrixAt(i, m4);
    });
    this.walls.frustumCulled = false;
    this.scene.add(this.walls);

    this.personMat = new THREE.ShaderMaterial({ vertexShader: CONC_VERT, fragmentShader: PERSON_FRAG, uniforms: { uDim: { value: 1 }, uGrey: { value: 0 } } });
    const pg = new THREE.CapsuleGeometry(0.24, 1.05, 4, 8);
    pg.translate(0, 0.77, 0);
    this.people = new THREE.InstancedMesh(pg, this.personMat, PEOPLE);
    this.people.frustumCulled = false;
    this.scene.add(this.people);

    // X-ray: floor outlines, party walls
    const hw = HERO.w / 2;
    const hd = HERO.d / 2;
    const fl: number[] = [];
    for (let f = 0; f <= HERO.floors; f++) {
      const y = f * FH;
      fl.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    }
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) fl.push(x, 0, z, x, HERO.h, z);
    for (const x of [-11.75, -1.5, 1.5, 11.75]) for (let f = 0; f < HERO.floors; f++) fl.push(x, f * FH, -hd, x, f * FH, hd);
    this.heroLinesMat = lineMat("#7fe3ff", 1.4);
    this.heroLines = new LineSegments2(segs(fl), this.heroLinesMat);
    this.heroLines.renderOrder = 3;
    this.heroLines.frustumCulled = false;
    this.scene.add(this.heroLines);

    // lift shafts and cars, in the core between the middle flats
    this.shaftMat = glowMat("#7fe3ff", "#7fe3ff", 1.2);
    this.carMat = glowMat("#fff4dc", "#fff4dc", 0.4);
    for (const x of LIFT_X) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, HERO.h + 4, 2.4), this.shaftMat);
      s.position.set(x, (HERO.h + 4) / 2, LIFT_Z_FRONT - 1.2);
      s.renderOrder = 4;
      this.shafts.push(s);
      this.scene.add(s);
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.5, 1.6), this.carMat);
      c.position.set(x, 1.3, LIFT_Z_FRONT - 1.0);
      c.renderOrder = 5;
      this.cars.push(c);
      this.scene.add(c);
    }

    // stairs, east of the core
    const st: number[] = [];
    for (let f = 0; f < HERO.floors; f++) {
      const y = f * FH;
      st.push(3.0, y, -1.2, 7.0, y + FH / 2, -1.2);
      st.push(7.0, y + FH / 2, -4.2, 3.0, y + FH, -4.2);
    }
    this.stairCount = st.length / 6;
    this.stairMat = lineMat("#ffd9a0", 2.2);
    this.stairLines = new LineSegments2(segs(st), this.stairMat);
    this.stairLines.renderOrder = 6;
    this.stairLines.frustumCulled = false;
    this.scene.add(this.stairLines);

    // water: pump room, riser, roof tank
    this.pumpMat = glowMat("#4fb4ff", "#4fb4ff", 1.0);
    this.pump = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 6), this.pumpMat);
    this.pump.position.set(-16, 1.6, -2);
    this.pump.renderOrder = 4;
    this.scene.add(this.pump);
    this.riserMat = glowMat("#6cc6ff", "#16324a", 0.5);
    this.riser = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, HERO.h + 4, 16, 1, true), this.riserMat);
    this.riser.position.set(-16, (HERO.h + 4) / 2, -2);
    this.riser.renderOrder = 4;
    this.scene.add(this.riser);
    this.roofTankMat = glowMat("#4fb4ff", "#123048", 1.0);
    this.roofTank = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 5), this.roofTankMat);
    this.roofTank.position.set(-14, HERO.h + 2.25, -2);
    this.roofTank.renderOrder = 4;
    this.scene.add(this.roofTank);
    this.machine = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 6), new THREE.MeshBasicMaterial({ color: C("#15181d") }));
    this.machine.position.set(0, HERO.h + 2.5, -3);
    this.scene.add(this.machine);

    // 100 m: the refuge floor and the line
    this.refugeMat = glowMat("#ff5a5f", "#ff5a5f", 1.4);
    this.refuge = new THREE.Mesh(new THREE.BoxGeometry(HERO.w, FH, HERO.d), this.refugeMat);
    this.refuge.position.set(0, HERO.h + 1.7, 0);
    this.refuge.renderOrder = 4;
    this.scene.add(this.refuge);
    this.line100Mat = lineMat("#ffffff", 1.6);
    this.line100 = new LineSegments2(segs([-70, 100, HERO.d / 2 + 0.5, 70, 100, HERO.d / 2 + 0.5]), this.line100Mat);
    this.line100.frustumCulled = false;
    this.line100.renderOrder = 6;
    this.scene.add(this.line100);

    // 50 m: how high a ladder truck reaches
    this.fireMat = glowMat("#ff3b30", "#ff3b30", 0.0, true);
    const fp = new THREE.PlaneGeometry(90, 60);
    fp.rotateX(-Math.PI / 2);
    this.fire = new THREE.Mesh(fp, this.fireMat);
    this.fire.position.set(0, 50, 10);
    this.fire.renderOrder = 6;
    this.scene.add(this.fire);
    this.fireLineMat = lineMat("#ff6a5f", 2.4);
    this.fireLine = new LineSegments2(segs([-45, 50, 40, 45, 50, 40, -45, 50, -20, 45, 50, -20, -45, 50, -20, -45, 50, 40, 45, 50, -20, 45, 50, 40]), this.fireLineMat);
    this.fireLine.frustumCulled = false;
    this.fireLine.renderOrder = 7;
    this.scene.add(this.fireLine);

    // "one more 33 floors" ghost, the gold outline, the walk-up's outline
    const gh: number[] = [];
    for (let f = 0; f <= HERO.floors; f += 3) {
      const y = f * FH;
      gh.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    }
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) gh.push(x, 0, z, x, HERO.h, z);
    this.ghostMat = lineMat("#ffffff", 2.2);
    this.ghost = new LineSegments2(segs(gh), this.ghostMat);
    this.ghost.frustumCulled = false;
    this.ghost.renderOrder = 6;
    this.scene.add(this.ghost);
    const ol: number[] = [];
    for (const y of [0, HERO.h]) ol.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) ol.push(x, 0, z, x, HERO.h, z);
    this.outlineMat = lineMat("#ffcf5a", 3);
    this.outlineL = new LineSegments2(segs(ol), this.outlineMat);
    this.outlineL.frustumCulled = false;
    this.outlineL.renderOrder = 8;
    this.scene.add(this.outlineL);
    const ub: number[] = [];
    for (const y of [0, 1]) ub.push(-0.5, y, -0.5, 0.5, y, -0.5, 0.5, y, -0.5, 0.5, y, 0.5, 0.5, y, 0.5, -0.5, y, 0.5, -0.5, y, 0.5, -0.5, y, -0.5);
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) ub.push(x, 0, z, x, 1, z);
    this.oldLineMat = lineMat("#e8e2d4", 2.2);
    this.oldLine = new LineSegments2(segs(ub), this.oldLineMat);
    this.oldLine.frustumCulled = false;
    this.oldLine.renderOrder = 8;
    this.scene.add(this.oldLine);

    // the repair fund: a glass jar in the garden, filled with gold
    this.tankGlassMat = glowMat("#cfe6ff", "#cfe6ff", 2.2);
    this.tankGlass = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 20, 64, 1, true), this.tankGlassMat);
    this.tankGlass.position.set(0, 10, 34);
    this.tankGlass.renderOrder = 7;
    this.scene.add(this.tankGlass);
    this.tankFillMat = glowMat("#ffc24a", "#ffc24a", 0.8);
    this.tankFill = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 1, 64), this.tankFillMat);
    this.tankFill.renderOrder = 7;
    this.scene.add(this.tankFill);
    this.coinMat = new THREE.ShaderMaterial({ vertexShader: COIN_VERT, fragmentShader: COIN_FRAG, uniforms: { uOpacity: { value: 1 } }, depthWrite: true });
    this.coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.0, 2.0, 0.45, 28), this.coinMat, 132);
    this.coins.frustumCulled = false;
    this.scene.add(this.coins);

    // aviation lights on the tall towers, lamp heads along the roads
    const av: number[] = [];
    const avs: number[] = [];
    const avz: number[] = [];
    for (const b of CITY) {
      if (b.h < 80) continue;
      av.push(b.x - b.w / 2 + 1, b.h + 1, b.z, b.x + b.w / 2 - 1, b.h + 1, b.z);
      avs.push(b.seed, b.seed);
      avz.push(900, 900);
    }
    this.avLights = dots(av, avs, avz, "#ff2a2a", 1, 1);
    this.scene.add(this.avLights);
    const lp: number[] = [];
    const ls: number[] = [];
    const lz: number[] = [];
    for (let k = -18; k <= 18; k++) {
      const c = (k + 0.5) * P;
      for (let s = -5200; s <= 5200; s += 34) {
        if (Math.hypot(c, s) > 5600) continue;
        for (const side of [-1, 1]) {
          lp.push(c + side * (ROAD / 2 - 2), 9, s, s, 9, c + side * (ROAD / 2 - 2));
          ls.push(0, 0);
          lz.push(260, 260);
        }
      }
    }
    this.lampHeads = dots(lp, ls, lz, "#ffb066", 0, 1);
    this.scene.add(this.lampHeads);

    // fire: smoke climbing the open core, the ladder truck, an alarm on every floor, the fire main and pump
    this.smokeMat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: SMOKE_FRAG,
      uniforms: { uOpacity: { value: 0 }, uLevel: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
    });
    this.smoke = new THREE.Mesh(new THREE.BoxGeometry(9, HERO.h + 3, 9), this.smokeMat);
    this.smoke.position.set(0, (HERO.h + 3) / 2, 2.6);
    this.smoke.renderOrder = 5;
    this.scene.add(this.smoke);
    const lad: number[] = [];
    const L = 1; // unit length along the ladder; scaled at render time
    for (const off of [-0.55, 0.55]) lad.push(off, 0, 0, off, 0, L);
    for (let k = 0; k <= 40; k++) lad.push(-0.55, 0, (k / 40) * L, 0.55, 0, (k / 40) * L);
    this.ladderMat = lineMat("#ffb0a0", 4);
    this.ladder = new LineSegments2(segs(lad), this.ladderMat);
    this.ladder.frustumCulled = false;
    this.ladder.renderOrder = 8;
    this.scene.add(this.ladder);
    this.truck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 12), new THREE.MeshBasicMaterial({ color: C("#a8261c") }));
    this.truck.position.set(-34, 1.6, 44);
    this.scene.add(this.truck);
    this.alarms = adots(33, "#ff4a3a");
    {
      const pa = (this.alarms.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      for (let f = 0; f < 33; f++) pa.set([0, f * FH + 2.55, 6.2], f * 3);
      (this.alarms.geometry.getAttribute("aSize") as THREE.BufferAttribute).array.fill(4.2);
    }
    this.scene.add(this.alarms);
    this.climbers = adots(CLIMBERS, "#ffd9a0");
    (this.climbers.geometry.getAttribute("aSize") as THREE.BufferAttribute).array.fill(2.6);
    this.scene.add(this.climbers);
    this.fireRiserMat = glowMat("#ff5a4a", "#ff5a4a", 0.6);
    this.fireRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, HERO.h + 2, 12, 1, true), this.fireRiserMat);
    this.fireRiser.position.set(16, (HERO.h + 2) / 2, -2);
    this.fireRiser.renderOrder = 4;
    this.scene.add(this.fireRiser);
    this.firePumpMat = glowMat("#ff5a4a", "#ff5a4a", 1.0);
    this.firePump = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 6), this.firePumpMat);
    this.firePump.position.set(16, 1.6, -2);
    this.firePump.renderOrder = 4;
    this.scene.add(this.firePump);

    // post: bloom, tone mapping, then the grade (split tone, vignette, grain)
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.5, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(
      new THREE.ShaderMaterial({ vertexShader: GRADE_VERT, fragmentShader: GRADE_FRAG, uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.45 }, uGrain: { value: 0.022 }, uFade: { value: 0 } } }),
    );
    this.composer.addPass(this.grade);
  }

  render(s: WorldState) {
    const t = s.time;
    const night = s.night;
    const dim = s.dim ?? 1;
    const hor = C("#3a4a6e").lerp(C("#1a2236"), night);
    const fog = hor.clone().add(new THREE.Color(0.014, 0.011, 0.01).multiplyScalar(night));
    this.skyU.uZen.value.copy(C("#0a1838").lerp(C("#03060e"), night));
    this.skyU.uMid.value.copy(C("#1d3160").lerp(C("#0a1122"), night));
    this.skyU.uHor.value.copy(hor);
    this.skyU.uNight.value = night;
    this.skyU.uDim.value = dim;
    const camH = s.cam.y + Math.sin((s.cam.pitch * Math.PI) / 180) * s.cam.dist;
    const hk = Math.max(0, Math.min(1, (camH - 600) / 4000));
    const fogD = 1 / (7000 + 15000 * hk);

    const setB = (m: THREE.ShaderMaterial, lights: number, extraDim = 1) => {
      const u = m.uniforms;
      u.uTime.value = t;
      u.uNight.value = night;
      u.uLights.value = lights;
      u.uFogC.value.copy(fog);
      u.uFogD.value = fogD;
      u.uSkyHor.value.copy(hor);
      u.uDarkR.value = s.city.darkR ?? 99999;
      u.uDarkAmt.value = s.city.darkAmt ?? 0;
      u.uPatch.value = s.city.patch ?? 0;
      u.uElev.value = s.city.elev ?? 0;
      u.uElevAge.value = s.city.elevAge ?? 0;
      u.uDim.value = dim * extraDim;
      const fo = s.city.focus ?? [0, 0, 1e5];
      u.uFocus.value.set(fo[0], fo[1], fo[2]);
      u.uIso.value = s.city.iso ?? 0;
      u.uLampK.value = s.city.lampK ?? 1;
    };
    setB(this.bMat, s.city.lights, s.city.dim ?? 1);
    this.bMat.uniforms.uHide.value = s.city.hideEast ? 9 : -99;
    {
      const fo = s.city.focus ?? [0, 0, 1e5];
      this.groundU.uFocus.value.set(fo[0], fo[1], fo[2]);
      this.groundU.uIso.value = s.city.iso ?? 0;
    }

    const gu = this.groundU;
    gu.uTime.value = t;
    gu.uNight.value = night;
    gu.uTraffic.value = s.traffic ?? 1;
    gu.uFogC.value.copy(fog);
    gu.uFogD.value = fogD;
    gu.uSkyHor.value.copy(hor);
    gu.uDarkR.value = s.city.darkR ?? 99999;
    gu.uDarkAmt.value = s.city.darkAmt ?? 0;
    gu.uDim.value = dim;

    // the walk-up beside the hero (it rises out of the ground for the comparison)
    const wv = s.walkup?.vis ?? 0;
    this.old.mesh.visible = wv > 0.001;
    this.oldLine.visible = false;
    if (s.walkup && wv > 0.001) {
      const ob = this.old.aB.array as Float32Array;
      ob[2] = 6 * FH;
      this.old.aB.needsUpdate = true;
      const oc = this.old.aC.array as Float32Array;
      oc[3] = 1 - s.walkup.rise;
      this.old.aC.needsUpdate = true;
      setB(this.old.mesh.material as THREE.ShaderMaterial, 1.0);
      const om = (this.old.mesh.material as THREE.ShaderMaterial).uniforms;
      om.uElev.value = 0;
      om.uIso.value = 0;
    }
    const ov = s.old?.vis ?? 0;
    if (!s.walkup) this.old.mesh.visible = ov > 0.001;
    if (s.old && ov > 0.001) {
      const ob = this.old.aB.array as Float32Array;
      ob[2] = s.old.floors * FH;
      this.old.aB.needsUpdate = true;
      const oc = this.old.aC.array as Float32Array;
      oc[3] = s.old.drop;
      this.old.aC.needsUpdate = true;
      setB(this.old.mesh.material as THREE.ShaderMaterial, 1.0);
      (this.old.mesh.material as THREE.ShaderMaterial).uniforms.uElev.value = 0;
      const oh = s.old.floors * FH * (1 - s.old.drop);
      this.oldLine.scale.set(OLD.w + 1, Math.max(0.1, oh + 0.5), OLD.d + 1);
      this.oldLine.position.set(OLD.x, 0, OLD.z);
      this.oldLineMat.opacity = 0.8 * ov * (1 - s.old.drop);
      this.oldLine.visible = oh > 0.5;
    }

    // ---------- the hero ----------
    const he = s.hero;
    const hu = this.heroMat.uniforms;
    setB(this.heroMat, 1);
    hu.uElev.value = 0;
    hu.uXray.value = he.xray;
    hu.uAge.value = he.age;
    hu.uVote.value = he.vote;
    hu.uPeelY.value = he.peel > 0.0005 ? HERO.h * (1 - he.peel) - 0.01 : 999;
    hu.uFire.value = he.fire ?? 0;
    this.hhData.set(he.hh);
    this.hhTex.needsUpdate = true;
    this.hh2Data.set(he.hh2);
    this.hh2Tex.needsUpdate = true;
    if (he.hh3) this.hh3Data.set(he.hh3);
    else this.hh3Data.fill(0);
    this.hh3Tex.needsUpdate = true;
    this.roomMat.uniforms.uOwners.value = he.owners ?? 0;
    const hc = this.hero.aC.array as Float32Array;
    hc[3] = 1 - he.built;
    this.hero.aC.needsUpdate = true;
    this.hero.mesh.visible = he.vis > 0.001;
    this.heroMat.depthWrite = he.xray < 0.01;

    // cut-open interior
    const open = he.peel > 0.0005 && he.built > 0.99;
    this.rooms.visible = this.slabs.visible = this.walls.visible = open;
    const ru = this.roomMat.uniforms;
    ru.uTime.value = t;
    ru.uNight.value = night;
    ru.uVote.value = he.vote;
    ru.uAge.value = he.age;
    ru.uDim.value = dim;
    ru.uFogC.value.copy(fog);
    ru.uFogD.value = fogD;
    const cu = this.concMat.uniforms;
    cu.uNight.value = night;
    cu.uDim.value = dim;
    cu.uAge.value = he.age;
    cu.uFogC.value.copy(fog);
    cu.uFogD.value = fogD;
    const pv = s.people?.vis ?? 0;
    this.people.visible = open && pv > 0.001;
    if (s.people && this.people.visible) {
      const q = new THREE.Quaternion();
      const v = new THREE.Vector3();
      const sc = new THREE.Vector3();
      const pm = new THREE.Matrix4();
      const pa = s.people.pos;
      for (let i = 0; i < PEOPLE; i++) {
        v.set(pa[i * 4], pa[i * 4 + 1], pa[i * 4 + 2]);
        const k = pa[i * 4 + 3] * pv;
        sc.set(k, k, k);
        pm.compose(v, q, sc);
        this.people.setMatrixAt(i, pm);
      }
      this.people.instanceMatrix.needsUpdate = true;
      this.personMat.uniforms.uDim.value = dim;
      this.personMat.uniforms.uGrey.value = s.people.grey ?? 0;
    }

    // X-ray machinery; in the cut-open view the lift cars ride the open core
    const xr = he.xray;
    const front = he.liftsFront ?? 0;
    this.heroLinesMat.opacity = 0.55 * xr;
    this.heroLines.visible = xr > 0.001;
    const wear = Math.max(0, Math.min(1, (he.age - 0.12) / 0.4));
    const amber = C("#ffa040");
    this.shaftMat.uniforms.uColor.value.copy(C("#7fe3ff").lerp(amber, wear));
    this.shaftMat.uniforms.uColor2.value.copy(C("#7fe3ff").lerp(amber, wear));
    this.carMat.uniforms.uColor.value.copy(C("#fff4dc").lerp(C("#ffb060"), wear));
    this.carMat.uniforms.uColor2.value.copy(C("#fff4dc").lerp(C("#ffb060"), wear));
    this.pumpMat.uniforms.uColor.value.copy(C("#4fb4ff").lerp(amber, wear));
    this.pumpMat.uniforms.uColor2.value.copy(C("#4fb4ff").lerp(amber, wear));
    this.riserMat.uniforms.uColor.value.copy(C("#6cc6ff").lerp(amber, wear));
    this.roofTankMat.uniforms.uColor.value.copy(C("#4fb4ff").lerp(amber, wear));
    const liftVis = Math.max(xr, front);
    this.shaftMat.uniforms.uOpacity.value = (0.12 * xr + 0.05 * front) * (he.liftGlow ?? 1);
    this.carMat.uniforms.uOpacity.value = 1.6 * liftVis * (he.liftGlow ?? 1);
    this.cars.forEach((c, i) => (c.position.y = he.lifts[i] + 1.3));
    [...this.shafts, ...this.cars].forEach((m) => (m.visible = liftVis > 0.001));
    this.stairMat.opacity = he.stairs > 0 ? 0.95 * xr : 0;
    this.stairLines.visible = he.stairs > 0.001 && xr > 0.001;
    (this.stairLines.geometry as LineSegmentsGeometry).instanceCount = Math.max(1, Math.round(he.stairs * this.stairCount));
    for (const m of [this.riserMat, this.roofTankMat, this.pumpMat]) m.uniforms.uTime.value = t;
    this.riserMat.uniforms.uLevel.value = he.water;
    this.riserMat.uniforms.uFlow.value = 1;
    this.riserMat.uniforms.uOpacity.value = 1.3 * xr;
    this.roofTankMat.uniforms.uLevel.value = he.water > HERO.h ? HERO.h + Math.min(4.5, (he.water - HERO.h) * 0.6) : -10;
    this.roofTankMat.uniforms.uOpacity.value = 0.9 * xr;
    this.pumpMat.uniforms.uLevel.value = 1e4;
    this.pumpMat.uniforms.uOpacity.value = 0.55 * xr * (0.8 + 0.2 * Math.sin(t * 6));
    for (const m of [this.riser, this.roofTank, this.pump]) m.visible = xr > 0.001;
    this.machine.visible = he.built > 0.99;
    this.refugeMat.uniforms.uOpacity.value = 0.5 * (he.refuge ?? 0);
    this.refuge.visible = (he.refuge ?? 0) > 0.001;
    this.line100Mat.opacity = 0.9 * (he.line100 ?? 0);
    this.line100.visible = (he.line100 ?? 0) > 0.001;
    const fv = he.fire ?? 0;
    this.fireMat.uniforms.uOpacity.value = 0.22 * fv;
    this.fire.visible = this.fireLine.visible = fv > 0.001;
    this.fireLineMat.opacity = 0.9 * fv;

    const gv = s.ghost?.vis ?? 0;
    this.ghostMat.opacity = 0.9 * gv;
    this.ghost.visible = gv > 0.001;
    this.ghost.position.y = s.ghost?.lift ?? HERO.h;
    this.outlineMat.opacity = s.outline ?? 0;
    this.outlineL.visible = (s.outline ?? 0) > 0.001;

    // fund jar and the coin rain
    const tv = s.tank?.vis ?? 0;
    this.tankGlass.visible = this.tankFill.visible = tv > 0.001;
    this.tankGlassMat.uniforms.uOpacity.value = 0.18 * tv;
    this.tankGlassMat.uniforms.uLevel.value = -100;
    const lvl = Math.max(0.02, Math.min(1, s.tank?.level ?? 0));
    this.tankFill.scale.set(1, lvl * 19.4, 1);
    this.tankFill.position.set(0, 0.3 + (lvl * 19.4) / 2, 34);
    this.tankFillMat.uniforms.uOpacity.value = 0.95 * tv;
    this.tankFillMat.uniforms.uLevel.value = 1e4;
    const cv = s.coins?.vis ?? 0;
    this.coins.visible = cv > 0.001;
    if (s.coins && cv > 0.001) {
      const cm = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3(1, 1, 1);
      const zero = new THREE.Vector3(0, 0, 0);
      for (let i = 0; i < 132; i++) {
        const [hx, hy, hz] = heroHH(i);
        const start = (Math.floor(i / 4) / 33) * 0.55 + (i % 4) * 0.02;
        const k = Math.max(0, Math.min(1, (s.coins.t - start) / 0.4));
        if (k <= 0 || k >= 1) {
          cm.compose(new THREE.Vector3(0, -50, 0), q, zero);
        } else {
          const e = k * k;
          const x = hx + (0 - hx) * k;
          const z = hz + 2 + (34 - hz - 2) * k;
          const y = hy + (21 - hy) * e + Math.sin(k * Math.PI) * 4;
          q.setFromEuler(new THREE.Euler(t * 3 + i, i, 0));
          cm.compose(new THREE.Vector3(x, y, z), q, sc);
        }
        this.coins.setMatrixAt(i, cm);
      }
      this.coins.instanceMatrix.needsUpdate = true;
      this.coinMat.uniforms.uOpacity.value = cv;
    }

    const avm = this.avLights.material as THREE.ShaderMaterial;
    avm.uniforms.uTime.value = t;
    avm.uniforms.uOpacity.value = 0.9 * night * dim * (s.city.dim ?? 1);
    const lpm = this.lampHeads.material as THREE.ShaderMaterial;
    lpm.uniforms.uOpacity.value = 0.55 * night * dim * (s.city.dim ?? 1);

    // fire
    const sv = s.smoke?.vis ?? 0;
    this.smoke.visible = sv > 0.001;
    this.smokeMat.uniforms.uOpacity.value = sv;
    this.smokeMat.uniforms.uLevel.value = s.smoke?.level ?? 0;
    this.smokeMat.uniforms.uTime.value = t;
    const lv = s.ladder?.vis ?? 0;
    this.ladder.visible = this.truck.visible = lv > 0.001;
    if (lv > 0.001) {
      const base = new THREE.Vector3(-34, 3.4, 40);
      const tip = new THREE.Vector3(-15, 50, 8.5);
      const dir = tip.clone().sub(base);
      const len = dir.length() * Math.max(0.02, s.ladder!.ext);
      this.ladder.position.copy(base);
      this.ladder.lookAt(tip);
      this.ladder.scale.set(1, 1, len);
      this.ladderMat.opacity = 0.95 * lv;
      (this.truck.material as THREE.MeshBasicMaterial).opacity = lv;
    }
    const av = s.alarms?.vis ?? 0;
    this.alarms.visible = av > 0.001;
    if (s.alarms && av > 0.001) {
      const aa = this.alarms.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
      (aa.array as Float32Array).set(s.alarms.alive);
      aa.needsUpdate = true;
      (this.alarms.material as THREE.ShaderMaterial).uniforms.uOpacity.value = av;
    }
    const cv2 = s.climbers?.vis ?? 0;
    this.climbers.visible = cv2 > 0.001;
    if (s.climbers && cv2 > 0.001) {
      const pa = this.climbers.geometry.getAttribute("position") as THREE.BufferAttribute;
      const al = this.climbers.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
      const P3 = pa.array as Float32Array;
      const A1 = al.array as Float32Array;
      for (let i = 0; i < CLIMBERS; i++) {
        // each climber is a few floors up the zigzag stair, moving up at about a floor every 2.5 s
        const start = ((i * 0.6180339) % 1) * s.climbers.top;
        const sp = 0.32 + 0.12 * ((i * 0.381966) % 1);
        const pos = Math.min(s.climbers.top, start + s.climbers.t * sp);
        const f = Math.floor(pos);
        const fr = pos - f;
        const y = f * FH + 0.6;
        let x: number;
        let z: number;
        let yy: number;
        if (fr < 0.5) {
          const k = fr / 0.5;
          x = 3 + 4 * k;
          z = -1.2;
          yy = y + (FH / 2) * k;
        } else {
          const k = (fr - 0.5) / 0.5;
          x = 7 - 4 * k;
          z = -4.2;
          yy = y + FH / 2 + (FH / 2) * k;
        }
        P3.set([x, yy, z], i * 3);
        A1[i] = 1;
      }
      pa.needsUpdate = true;
      al.needsUpdate = true;
      (this.climbers.material as THREE.ShaderMaterial).uniforms.uOpacity.value = cv2;
    }
    const fs = s.fireSys ?? 0;
    this.fireRiser.visible = this.firePump.visible = fs > 0.001;
    this.fireRiserMat.uniforms.uOpacity.value = 1.1 * fs;
    this.fireRiserMat.uniforms.uLevel.value = 1e4;
    this.fireRiserMat.uniforms.uTime.value = t;
    this.firePumpMat.uniforms.uOpacity.value = 0.6 * fs;
    this.firePumpMat.uniforms.uLevel.value = 1e4;

    setCamera(this.camera, s.cam);
    this.sky.position.copy(this.camera.position);
    this.renderer.toneMappingExposure = s.exposure ?? 1.0;
    this.bloom.strength = s.bloom ?? 0.42;
    const gu2 = this.grade.uniforms;
    gu2.uTime.value = t;
    gu2.uVig.value = s.grade?.vig ?? 0.45;
    gu2.uGrain.value = s.grade?.grain ?? 0.022;
    gu2.uFade.value = s.grade?.fade ?? 0;
    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let E: Engine | null = null;
export const engine = () => (E ??= new Engine());
