// One WebGL scene for the whole film, rendered synchronously for each frame from a plain WorldState.
// The city, the hero tower and the two far sites are all instanced slabs drawn by one shader (shaders.ts); the
// hero's machinery (lift shafts, cars, stairs, water riser, roof tank, pump room) appears in X-ray.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Bldg, CITY, FH, HERO, MEIFOO, MEIFOO_X, OLD, P, PRUITT, PRUITT_X, ROAD, heroHH } from "./city";
import { Cam, H, W, setCamera } from "./camera";
import { BLDG_FRAG, BLDG_VERT, COIN_FRAG, COIN_VERT, DOT_FRAG, DOT_VERT, GLOW_FRAG, GLOW_VERT, GROUND_FRAG, GROUND_VERT, SKY_FRAG, SKY_VERT } from "./shaders";

export type WorldState = {
  cam: Cam;
  time: number;
  night: number; // 0 blue hour .. 1 night
  bloom?: number;
  exposure?: number;
  dim?: number; // whole picture (0 black .. 1)
  site?: 0 | 1 | 2; // main city, Pruitt-Igoe, 美孚新邨
  traffic?: number;
  city: { lights: number; darkR?: number; darkAmt?: number; patch?: number; elev?: number; elevAge?: number; dim?: number; hideEast?: boolean };
  hero: {
    vis: number;
    built: number; // 0 nothing .. 1 full height
    hh: Float32Array; // 132 x rgba
    age: number;
    xray: number;
    vote: number;
    water: number; // metres the water has climbed the riser
    lifts: [number, number]; // car heights (m)
    stairs: number; // 0..1 of the stairway lit
    line100?: number;
    refuge?: number; // the extra refuge floor above the roof (0..1)
    liftGlow?: number;
  };
  coins?: { t: number; vis: number }; // t 0..1 through the coin rain
  tank?: { vis: number; level: number };
  old?: { vis: number; floors: number; drop: number };
  ghost?: { vis: number; lift: number };
  outline?: number; // the hero picked out in gold (city-wide shots)
  pruitt?: { lights: number; drop: (i: number) => number; dust: number };
  meifoo?: { lights: number };
};

const C = (hex: string) => new THREE.Color(hex);

type Inst = { mesh: THREE.Mesh; geo: THREE.InstancedBufferGeometry; aC: THREE.InstancedBufferAttribute; aB: THREE.InstancedBufferAttribute; list: Bldg[] };

const unitBox = () => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
};

const kindOf = (b: Bldg) => b.kind;

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
    B.set([b.w, b.d, b.h, kindOf(b)], i * 4);
    Cc.set([b.occ, b.group, b.dist, 0], i * 4);
  });
  geo.setAttribute("aA", new THREE.InstancedBufferAttribute(A, 4));
  const aB = new THREE.InstancedBufferAttribute(B, 4);
  const aC = new THREE.InstancedBufferAttribute(Cc, 4);
  geo.setAttribute("aB", aB);
  geo.setAttribute("aC", aC);
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, mat);
  // the shader places each slab, so three's bounding box is meaningless: no frustum culling
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
});

const lineMat = (color: string, width: number) =>
  new LineMaterial({ color: C(color).getHex(), linewidth: width, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, resolution: new THREE.Vector2(W, H) });

const segs = (pts: number[]) => {
  const g = new LineSegmentsGeometry();
  g.setPositions(pts);
  return g;
};

const glowMat = (color: string, color2: string, rim = 0.6) =>
  new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uColor: { value: C(color) }, uColor2: { value: C(color2) }, uOpacity: { value: 0 }, uLevel: { value: 1e5 }, uFlow: { value: 0 }, uTime: { value: 0 }, uRim: { value: rim } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
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

class Engine {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, W / H, 1, 60000);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  sky: THREE.Mesh;
  skyU: Record<string, THREE.IUniform>;
  ground: THREE.Mesh;
  groundU: Record<string, THREE.IUniform>;
  bMat: THREE.ShaderMaterial;
  heroMat: THREE.ShaderMaterial;
  city: Inst;
  pruitt: Inst;
  meifoo: Inst;
  old: Inst;
  hero: Inst;
  hhTex: THREE.DataTexture;
  hhData = new Float32Array(4 * 33 * 4);
  heroLines: LineSegments2;
  heroLinesMat: LineMaterial;
  stairLines: LineSegments2;
  stairMat: LineMaterial;
  stairCount: number;
  ghost: LineSegments2;
  ghostMat: LineMaterial;
  outlineL: LineSegments2;
  outlineMat: LineMaterial;
  line100: LineSegments2;
  line100Mat: LineMaterial;
  refuge: THREE.Mesh;
  refugeMat: THREE.ShaderMaterial;
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
  dust: THREE.Points;
  dustBase: Float32Array;
  dustVel: Float32Array;

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
    };
    const gg = new THREE.PlaneGeometry(160000, 160000, 1, 1);
    gg.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(gg, new THREE.ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: this.groundU }));
    this.ground.frustumCulled = false;
    this.scene.add(this.ground);

    // buildings
    this.bMat = new THREE.ShaderMaterial({ vertexShader: BLDG_VERT, fragmentShader: BLDG_FRAG, uniforms: bldgUniforms() });
    this.city = makeInst(CITY, this.bMat);
    this.scene.add(this.city.mesh);
    this.pruitt = makeInst(PRUITT, this.bMat.clone());
    this.scene.add(this.pruitt.mesh);
    this.meifoo = makeInst(MEIFOO, this.bMat.clone());
    this.scene.add(this.meifoo.mesh);
    this.old = makeInst([{ x: OLD.x, z: OLD.z, rot: 0, seed: 0.37, w: OLD.w, d: OLD.d, h: 6 * FH, kind: 1, occ: 0.9, group: 7, dist: 66 }], this.bMat.clone());
    this.scene.add(this.old.mesh);

    // the hero
    this.hhTex = new THREE.DataTexture(this.hhData, 4, 33, THREE.RGBAFormat, THREE.FloatType);
    this.hhTex.magFilter = THREE.NearestFilter;
    this.hhTex.minFilter = THREE.NearestFilter;
    this.hhTex.needsUpdate = true;
    this.heroMat = new THREE.ShaderMaterial({
      vertexShader: BLDG_VERT,
      fragmentShader: BLDG_FRAG,
      uniforms: { ...bldgUniforms(), uHH: { value: this.hhTex }, uXray: { value: 0 }, uAge: { value: 0 }, uVote: { value: 0 } },
      defines: { HERO: 1 },
      transparent: true,
    });
    this.hero = makeInst([{ x: 0, z: 0, rot: 0, seed: 0.618, w: HERO.w, d: HERO.d, h: HERO.h, kind: 5, occ: 1, group: 5, dist: 0 }], this.heroMat);
    this.hero.mesh.renderOrder = 2;
    this.scene.add(this.hero.mesh);

    // X-ray: floor outlines, core box
    const hw = HERO.w / 2;
    const hd = HERO.d / 2;
    const fl: number[] = [];
    for (let f = 0; f <= HERO.floors; f++) {
      const y = f * FH;
      fl.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    }
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) fl.push(x, 0, z, x, HERO.h, z);
    // party walls between the four homes
    for (const x of [-11, 0, 11]) for (let f = 0; f < HERO.floors; f++) fl.push(x, f * FH, -hd, x, f * FH, hd);
    this.heroLinesMat = lineMat("#7fe3ff", 1.4);
    this.heroLines = new LineSegments2(segs(fl), this.heroLinesMat);
    this.heroLines.renderOrder = 3;
    this.heroLines.frustumCulled = false;
    this.scene.add(this.heroLines);

    // lift shafts and cars (core, just north of centre)
    this.shaftMat = glowMat("#7fe3ff", "#7fe3ff", 1.2);
    this.carMat = glowMat("#fff4dc", "#fff4dc", 0.4);
    for (const x of [-1.7, 1.7]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.8, HERO.h + 4, 2.8), this.shaftMat);
      s.position.set(x, (HERO.h + 4) / 2, -3);
      s.renderOrder = 4;
      this.shafts.push(s);
      this.scene.add(s);
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), this.carMat);
      c.position.set(x, 1.3, -3);
      c.renderOrder = 5;
      this.cars.push(c);
      this.scene.add(c);
    }

    // stairs: one flight up and one back per floor, east of the core
    const st: number[] = [];
    for (let f = 0; f < HERO.floors; f++) {
      const y = f * FH;
      st.push(4.2, y, -1.2, 8.2, y + FH / 2, -1.2);
      st.push(8.2, y + FH / 2, -4.2, 4.2, y + FH, -4.2);
    }
    this.stairCount = st.length / 6;
    this.stairMat = lineMat("#ffd9a0", 2.2);
    this.stairLines = new LineSegments2(segs(st), this.stairMat);
    this.stairLines.renderOrder = 6;
    this.stairLines.frustumCulled = false;
    this.scene.add(this.stairLines);

    // water: pump room at the west end of the ground floor, a riser up the west core, a tank on the roof
    this.pumpMat = glowMat("#4fb4ff", "#4fb4ff", 1.0);
    this.pump = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 6), this.pumpMat);
    this.pump.position.set(-16, 1.6, -2);
    this.pump.renderOrder = 4;
    this.scene.add(this.pump);
    this.riserMat = glowMat("#6cc6ff", "#16324a", 0.5);
    this.riser = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, HERO.h + 4, 12, 1, true), this.riserMat);
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

    // the extra refuge floor that 100 m would demand, and the 100 m line
    this.refugeMat = glowMat("#ff5a5f", "#ff5a5f", 1.4);
    this.refuge = new THREE.Mesh(new THREE.BoxGeometry(HERO.w, FH, HERO.d), this.refugeMat);
    this.refuge.position.set(0, HERO.h + 1.5 + 0.2, 0);
    this.refuge.renderOrder = 4;
    this.scene.add(this.refuge);
    this.line100Mat = lineMat("#ffffff", 1.6);
    this.line100 = new LineSegments2(segs([-60, 100, HERO.d / 2 + 0.5, 60, 100, HERO.d / 2 + 0.5]), this.line100Mat);
    this.line100.frustumCulled = false;
    this.line100.renderOrder = 6;
    this.scene.add(this.line100);

    // the ghost of "one more 33-floor tower" above the hero
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

    // the hero picked out in gold for the city-wide shots
    const ol: number[] = [];
    for (const y of [0, HERO.h]) ol.push(-hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd);
    for (const [x, z] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) ol.push(x, 0, z, x, HERO.h, z);
    this.outlineMat = lineMat("#ffcf5a", 3);
    this.outlineL = new LineSegments2(segs(ol), this.outlineMat);
    this.outlineL.frustumCulled = false;
    this.outlineL.renderOrder = 8;
    this.scene.add(this.outlineL);

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
    const cg = new THREE.CylinderGeometry(2.0, 2.0, 0.45, 28);
    this.coins = new THREE.InstancedMesh(cg, this.coinMat, 132);
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

    // implosion dust at Pruitt-Igoe
    const dn = PRUITT.length * 48;
    this.dustBase = new Float32Array(dn * 3);
    this.dustVel = new Float32Array(dn * 3);
    const dp = new Float32Array(dn * 3);
    const dsd: number[] = [];
    const dsz: number[] = [];
    let k = 0;
    PRUITT.forEach((b, bi) => {
      for (let j = 0; j < 48; j++) {
        const a = (j * 2.399 + bi) % (Math.PI * 2);
        const rr = ((j * 0.618 + bi * 0.31) % 1) * 0.5;
        this.dustBase.set([b.x + Math.cos(a) * b.w * rr, 2, b.z + Math.sin(a) * b.d * rr * 2], k * 3);
        this.dustVel.set([Math.cos(a) * (8 + 10 * rr), 3 + ((j * 0.37) % 1) * 9, Math.sin(a) * (8 + 10 * rr)], k * 3);
        dsd.push(bi);
        dsz.push(9000 + 6000 * ((j * 0.77) % 1));
        k++;
      }
    });
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dg.setAttribute("aSeed", new THREE.Float32BufferAttribute(dsd, 1));
    dg.setAttribute("aSize", new THREE.Float32BufferAttribute(dsz, 1));
    const dm = new THREE.ShaderMaterial({
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uBlink: { value: 0 }, uColor: { value: C("#3a3530") }, uOpacity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.dust = new THREE.Points(dg, dm);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    // post
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(W, H);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.5, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  render(s: WorldState) {
    const t = s.time;
    const night = s.night;
    const dim = s.dim ?? 1;
    // sky and fog: blue hour → night
    const hor = C("#3a4a6e").lerp(C("#1a2236"), night);
    const fog = hor.clone().add(new THREE.Color(0.014, 0.011, 0.01).multiplyScalar(night));
    this.skyU.uZen.value.copy(C("#0a1838").lerp(C("#03060e"), night));
    this.skyU.uMid.value.copy(C("#1d3160").lerp(C("#0a1122"), night));
    this.skyU.uHor.value.copy(hor);
    this.skyU.uNight.value = night;
    this.skyU.uDim.value = dim;
    const site = s.site ?? 0;
    const fogD = site === 0 ? 1 / 7000 : 1 / 3800;

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
    };
    setB(this.bMat, s.city.lights, s.city.dim ?? 1);
    this.bMat.uniforms.uHide.value = s.city.hideEast ? 9 : -99;
    this.city.mesh.visible = site === 0;
    setB(this.pruitt.mesh.material as THREE.ShaderMaterial, s.pruitt?.lights ?? 0.8);
    (this.pruitt.mesh.material as THREE.ShaderMaterial).uniforms.uElev.value = 0;
    this.pruitt.mesh.visible = site === 1;
    setB(this.meifoo.mesh.material as THREE.ShaderMaterial, s.meifoo?.lights ?? 0.9);
    (this.meifoo.mesh.material as THREE.ShaderMaterial).uniforms.uElev.value = 0;
    this.meifoo.mesh.visible = site === 2;

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
    gu.uSea.value = site === 2 ? 1 : 0;
    gu.uSeaZ.value = 190;
    gu.uSiteC.value.set(site === 1 ? PRUITT_X : site === 2 ? MEIFOO_X : 0, 0);
    gu.uSiteR.value = site === 0 ? 5200 : 1600;
    gu.uRiver.value = site === 0 ? 1 : 0;
    gu.uP.value = site === 0 ? P : site === 1 ? 130 : 170;

    // Pruitt-Igoe: each slab sinks as it is blown up
    if (site === 1 && s.pruitt) {
      const arr = this.pruitt.aC.array as Float32Array;
      PRUITT.forEach((_, i) => (arr[i * 4 + 3] = s.pruitt!.drop(i)));
      this.pruitt.aC.needsUpdate = true;
      const pos = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
      const pa = pos.array as Float32Array;
      const n = pa.length / 3;
      for (let k = 0; k < n; k++) {
        const bi = Math.floor(k / 48);
        const dt = Math.max(0, s.pruitt.drop(bi) * 6);
        const age = dt;
        pa[k * 3] = this.dustBase[k * 3] + this.dustVel[k * 3] * age;
        pa[k * 3 + 1] = this.dustBase[k * 3 + 1] + this.dustVel[k * 3 + 1] * age;
        pa[k * 3 + 2] = this.dustBase[k * 3 + 2] + this.dustVel[k * 3 + 2] * age;
      }
      pos.needsUpdate = true;
      (this.dust.material as THREE.ShaderMaterial).uniforms.uOpacity.value = s.pruitt.dust;
      this.dust.visible = s.pruitt.dust > 0.001;
    } else this.dust.visible = false;

    // the old walk-up next door (and its rebuild)
    const ov = s.old?.vis ?? 0;
    this.old.mesh.visible = site === 0 && ov > 0.001;
    if (s.old) {
      const ob = this.old.aB.array as Float32Array;
      ob[2] = s.old.floors * FH;
      this.old.aB.needsUpdate = true;
      const oc = this.old.aC.array as Float32Array;
      oc[3] = s.old.drop;
      this.old.aC.needsUpdate = true;
      setB(this.old.mesh.material as THREE.ShaderMaterial, 0.85);
      (this.old.mesh.material as THREE.ShaderMaterial).uniforms.uElev.value = 0;
    }

    // ---------- the hero ----------
    const he = s.hero;
    const hu = this.heroMat.uniforms;
    setB(this.heroMat, 1);
    hu.uElev.value = 0;
    hu.uXray.value = he.xray;
    hu.uAge.value = he.age;
    hu.uVote.value = he.vote;
    this.hhData.set(he.hh);
    this.hhTex.needsUpdate = true;
    const hc = this.hero.aC.array as Float32Array;
    hc[3] = 1 - he.built;
    this.hero.aC.needsUpdate = true;
    this.hero.mesh.visible = site === 0 && he.vis > 0.001;
    this.heroMat.depthWrite = he.xray < 0.01;
    const xr = site === 0 ? he.xray : 0;
    this.heroLinesMat.opacity = 0.55 * xr;
    this.heroLines.visible = xr > 0.001;
    this.shaftMat.uniforms.uOpacity.value = 0.12 * xr;
    this.carMat.uniforms.uOpacity.value = 1.6 * xr * (he.liftGlow ?? 1);
    this.cars.forEach((c, i) => (c.position.y = he.lifts[i] + 1.3));
    [...this.shafts, ...this.cars].forEach((m) => (m.visible = xr > 0.001));
    this.stairMat.opacity = he.stairs > 0 ? 0.95 * xr : 0;
    this.stairLines.visible = he.stairs > 0.001 && xr > 0.001;
    (this.stairLines.geometry as LineSegmentsGeometry).instanceCount = Math.max(1, Math.round(he.stairs * this.stairCount));
    for (const m of [this.riserMat, this.roofTankMat, this.pumpMat]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uOpacity.value = xr;
    }
    this.riserMat.uniforms.uLevel.value = he.water;
    this.riserMat.uniforms.uFlow.value = 1;
    this.riserMat.uniforms.uOpacity.value = 1.3 * xr;
    this.roofTankMat.uniforms.uLevel.value = he.water > HERO.h ? HERO.h + Math.min(4.5, (he.water - HERO.h) * 0.6) : -10;
    this.roofTankMat.uniforms.uOpacity.value = 0.9 * xr;
    this.pumpMat.uniforms.uLevel.value = 1e4;
    this.pumpMat.uniforms.uOpacity.value = 0.55 * xr * (0.8 + 0.2 * Math.sin(t * 6));
    for (const m of [this.riser, this.roofTank, this.pump]) m.visible = xr > 0.001;
    this.machine.visible = site === 0 && he.built > 0.99;
    this.refugeMat.uniforms.uOpacity.value = 0.5 * (he.refuge ?? 0);
    this.refuge.visible = (he.refuge ?? 0) > 0.001;
    this.line100Mat.opacity = 0.9 * (he.line100 ?? 0);
    this.line100.visible = (he.line100 ?? 0) > 0.001;

    this.outlineMat.opacity = s.outline ?? 0;
    this.outlineL.visible = (s.outline ?? 0) > 0.001 && site === 0;

    // ghost tower
    const gv = s.ghost?.vis ?? 0;
    this.ghostMat.opacity = 0.9 * gv;
    this.ghost.visible = gv > 0.001;
    this.ghost.position.y = s.ghost?.lift ?? HERO.h;

    // fund jar and the coin rain
    const tv = s.tank?.vis ?? 0;
    this.tankGlass.visible = this.tankFill.visible = tv > 0.001 && site === 0;
    this.tankGlassMat.uniforms.uOpacity.value = 0.18 * tv;
    this.tankGlassMat.uniforms.uLevel.value = -100;
    const lvl = Math.max(0.02, Math.min(1, s.tank?.level ?? 0));
    this.tankFill.scale.set(1, lvl * 19.4, 1);
    this.tankFill.position.set(0, 0.3 + (lvl * 19.4) / 2, 34);
    this.tankFillMat.uniforms.uOpacity.value = 0.95 * tv;
    this.tankFillMat.uniforms.uLevel.value = 1e4;
    const cv = s.coins?.vis ?? 0;
    this.coins.visible = cv > 0.001 && site === 0;
    if (s.coins && cv > 0.001) {
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3(1, 1, 1);
      const zero = new THREE.Vector3(0, 0, 0);
      for (let i = 0; i < 132; i++) {
        const [hx, hy, hz] = heroHH(i);
        const start = (Math.floor(i / 4) / 33) * 0.55 + (i % 4) * 0.02;
        const k = Math.max(0, Math.min(1, (s.coins.t - start) / 0.4));
        if (k <= 0 || k >= 1) {
          m4.compose(new THREE.Vector3(0, -50, 0), q, zero);
        } else {
          const e = k * k;
          const x = hx + (0 - hx) * k;
          const z = hz + 2 + (34 - hz - 2) * k;
          const y = hy + (21 - hy) * e + Math.sin(k * Math.PI) * 4;
          q.setFromEuler(new THREE.Euler(t * 3 + i, i, 0));
          m4.compose(new THREE.Vector3(x, y, z), q, sc);
        }
        this.coins.setMatrixAt(i, m4);
      }
      this.coins.instanceMatrix.needsUpdate = true;
      this.coinMat.uniforms.uOpacity.value = cv;
    }

    // lights
    const avm = this.avLights.material as THREE.ShaderMaterial;
    avm.uniforms.uTime.value = t;
    avm.uniforms.uOpacity.value = 0.9 * night * dim * (s.city.dim ?? 1);
    this.avLights.visible = site === 0;
    const lpm = this.lampHeads.material as THREE.ShaderMaterial;
    lpm.uniforms.uOpacity.value = 0.55 * night * dim * (s.city.dim ?? 1);
    this.lampHeads.visible = site === 0;

    setCamera(this.camera, s.cam);
    this.sky.position.copy(this.camera.position);
    this.renderer.toneMappingExposure = s.exposure ?? 1.0;
    this.bloom.strength = s.bloom ?? 0.6;
    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let E: Engine | null = null;
export const engine = () => (E ??= new Engine());
