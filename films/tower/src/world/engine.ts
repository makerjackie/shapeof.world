// The 3D city: one WebGL scene for the whole film, rendered synchronously for each frame from a plain WorldState.
// Real data only: land, parks, roads, metro and building footprints from OpenStreetMap (src/geo/city.json,
// src/world/ground.json), tower heights and completion years from CTBUH. Generic tower footprints (CTBUH towers
// outside the Futian OSM window) are squares, which only shows at city scale.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { TOWERS } from "../art/mansion";
import { Cam, H, W } from "../geo/cam";
import { Bldg, CITY, WORLD } from "../geo/data";
import { camDist, setCamera } from "./camera";
import groundJson from "./ground.json";
import nanshanJson from "./nanshan.json";
import { BLDG_FRAG, BLDG_VERT, SKY_FRAG, SKY_VERT } from "./shaders";

type Ground = {
  land: number[][][];
  green: { kind: string; p: number[][] }[];
  roads: { cls: string; pts: number[] }[];
  metro: { line: string; colour: string; pts: number[] }[];
};
const GROUND = groundJson as unknown as Ground;
// Nanshan (后海、科技园、粤海、前海、蛇口): OSM blocks and streets, tools/nanshan-prep.mjs
const NANSHAN = nanshanJson as unknown as { buildings: Bldg[]; roads: { cls: string; pts: number[] }[] };
// Every OSM block the city draws: Futian's (src/geo/city.json) then Nanshan's; per-building state uses this index.
export const ALL_BLDG: Bldg[] = [...CITY.buildings, ...NANSHAN.buildings];
const ALL_ROADS = [...CITY.roads, ...NANSHAN.roads];

// ---------- State ----------

export type Box = { x: number; y: number; w: number; d: number; h: number; base?: number; rot?: number; color: string; o: number; add?: boolean };
export type Poly = { pts: number[]; color: string; width: number; o: number; h?: number; closed?: boolean; dash?: number };

export type WorldState = {
  cam: Cam;
  night: number; // 0 blue-hour dusk → 1 deep night
  lights?: number; // share of windows lit, 0..1 (defaults to 0.35 + 0.65 × night)
  full?: number; // 0..1: office towers lit on (almost) every floor
  rise?: number; // global height of the OSM city, 0..1
  city?: number; // OSM buildings on (default 1)
  vacancy?: number; // share of floors gone dark
  bState?: (i: number, b: Bldg) => [number, number, number, number] | undefined; // lit, tint, height, vacancy
  roads?: number; // Futian street network
  cityRoads?: number; // Shenzhen's major roads
  metro?: number;
  metroFlow?: number; // metres the train dashes have travelled
  traffic?: number; // metres the car lights have travelled on the Futian main roads (undefined = off)
  led?: number; // LED outlines on towers at night
  sz?: number; // Shenzhen district outlines
  szTint?: number; // Shenzhen land lifted out of the delta
  green?: number;
  hero?: { built?: number; tint?: number; on?: number; hl?: { part: number; from: number; to: number; amt: number } };
  towers?: { year: number; ex: number; on: number; beacon?: number; fresh?: number; tint?: (i: number, t: [number, number, number, number]) => number };
  boxes?: Box[];
  polys?: Poly[];
  tint?: string;
  bloom?: number;
  exposure?: number;
};

// ---------- Palette (sRGB hex, blended between blue-hour dusk and night) ----------

const PAL = {
  dusk: {
    zen: "#0f1c36",
    mid: "#34416a",
    hor: "#b9846f",
    glow: "#f0a070",
    fog: "#4b4a5d",
    wallA: "#1e2431",
    wallB: "#8c7b72",
    roof: "#2d3440",
    glassLo: "#192131",
    glassHi: "#3d4c6c",
    land: "#1c222c",
    sea: "#0a1220",
    green: "#18261f",
    road: "#4f596c",
    roadMinor: "#2b3240",
  },
  night: {
    zen: "#03050a",
    mid: "#0b1020",
    hor: "#2b2230",
    glow: "#3a2620",
    fog: "#141420",
    wallA: "#0c1016",
    wallB: "#1c1e25",
    roof: "#12161c",
    glassLo: "#080b11",
    glassHi: "#121925",
    land: "#11161e",
    sea: "#04070c",
    green: "#0c1612",
    road: "#ffae5e",
    roadMinor: "#5e4530",
  },
};

const C = (hex: string) => new THREE.Color(hex);
const mixC = (a: string, b: string, t: number) => C(a).lerp(C(b), t);

// ---------- Geometry builders ----------

const signedArea = (pts: [number, number][]) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

const toPts = (ring: number[]): [number, number][] => {
  const pts: [number, number][] = [];
  for (let k = 0; k + 1 < ring.length; k += 2) pts.push([ring[k], ring[k + 1]]);
  if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  if (signedArea(pts) < 0) pts.reverse();
  return pts;
};

type PrismIn = { ring: number[]; h: number; year?: number; spec?: [number, number, number]; cov?: number };

const prisms = (list: PrismIn[], extra: { year?: boolean; hero?: boolean } = {}) => {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const bi: number[] = [];
  const roof: number[] = [];
  const hh: number[] = [];
  const yr: number[] = [];
  const spec: number[] = [];
  const face: number[] = [];
  const edge: number[] = [];
  const cen: number[] = [];
  const cov: number[] = [];
  let ex = 0;
  let el = 0;
  let cx = 0;
  let cy = 0;
  const v = (x: number, y: number, h: number, nx: number, ny: number, nz: number, u: number, w: number, i: number, r: number, b: PrismIn, f: number) => {
    pos.push(x, h, -y);
    nor.push(nx, ny, nz);
    uv.push(u, w);
    bi.push(i);
    roof.push(r);
    hh.push(b.h);
    edge.push(ex, el);
    cen.push(cx, cy);
    cov.push(b.cov ?? 0);
    if (extra.year) yr.push(b.year ?? 0);
    if (extra.hero) {
      spec.push(...(b.spec ?? [b.h, Math.max(1, Math.round(b.h / 4)), 0]));
      face.push(f);
    }
  };
  list.forEach((b, i) => {
    const pts = toPts(b.ring);
    if (pts.length < 3) return;
    const n = pts.length;
    const h = b.h;
    cx = pts.reduce((s, p) => s + p[0], 0) / n;
    cy = pts.reduce((s, p) => s + p[1], 0) / n;
    let u = 0;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[(k + 1) % n];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 0.05) continue;
      const nx = (by - ay) / len;
      const ny = -(bx - ax) / len;
      // world normal (nx east, ny north) → three (nx, 0, -ny); aEdge = (metres along this wall, wall length)
      el = len;
      ex = 0;
      v(ax, ay, 0, nx, 0, -ny, u, 0, i, 0, b, k);
      ex = len;
      v(bx, by, 0, nx, 0, -ny, u + len, 0, i, 0, b, k);
      v(bx, by, h, nx, 0, -ny, u + len, h, i, 0, b, k);
      ex = 0;
      v(ax, ay, 0, nx, 0, -ny, u, 0, i, 0, b, k);
      ex = len;
      v(bx, by, h, nx, 0, -ny, u + len, h, i, 0, b, k);
      ex = 0;
      v(ax, ay, h, nx, 0, -ny, u, h, i, 0, b, k);
      u += len;
    }
    const tris = THREE.ShapeUtils.triangulateShape(
      pts.map((p) => new THREE.Vector2(p[0], p[1])),
      [],
    );
    ex = 1e4;
    el = 2e4;
    for (const t of tris) for (const k of t) v(pts[k][0], pts[k][1], h, 0, 1, 0, pts[k][0], pts[k][1], i, 1, b, 0);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aUV", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aB", new THREE.Float32BufferAttribute(bi, 1));
  g.setAttribute("aRoof", new THREE.Float32BufferAttribute(roof, 1));
  g.setAttribute("aH", new THREE.Float32BufferAttribute(hh, 1));
  g.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 2));
  g.setAttribute("aC", new THREE.Float32BufferAttribute(cen, 2));
  g.setAttribute("aCov", new THREE.Float32BufferAttribute(cov, 1));
  if (extra.year) g.setAttribute("aYear", new THREE.Float32BufferAttribute(yr, 1));
  if (extra.hero) {
    g.setAttribute("aSpec", new THREE.Float32BufferAttribute(spec, 3));
    g.setAttribute("aFace", new THREE.Float32BufferAttribute(face, 1));
  }
  g.computeBoundingSphere();
  return g;
};

const STATE_W = 128;
const stateTex = (n: number) => {
  const h = Math.max(1, Math.ceil(n / STATE_W));
  const data = new Float32Array(STATE_W * h * 4);
  for (let i = 0; i < n; i++) data.set([1, 0, 1, 1], i * 4);
  const t = new THREE.DataTexture(data, STATE_W, h, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
};

const bldgMaterial = (n: number, defines: Record<string, string> = {}) =>
  new THREE.ShaderMaterial({
    vertexShader: BLDG_VERT,
    fragmentShader: BLDG_FRAG,
    defines,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uState: { value: null },
        uStateW: { value: STATE_W },
        uRise: { value: 1 },
        uClip: { value: 1e6 },
        uYear: { value: 3000 },
        uEx: { value: 1 },
        uSun: { value: new THREE.Vector3(-0.75, 0.35, -0.55).normalize() },
        uWallA: { value: new THREE.Color() },
        uWallB: { value: new THREE.Color() },
        uRoofC: { value: new THREE.Color() },
        uGlassLo: { value: new THREE.Color() },
        uGlassHi: { value: new THREE.Color() },
        uLitW: { value: new THREE.Color("#ffd9a0") },
        uLitC: { value: new THREE.Color("#d7e8ff") },
        uTint: { value: new THREE.Color("#ff8a3d") },
        uNight: { value: 0 },
        uLights: { value: 0 },
        uFull: { value: 0 },
        uVacancy: { value: 0 },
        uLitGain: { value: 1.8 },
        uTintGlow: { value: 1 },
        uLed: { value: 0 },
        uHL: { value: new THREE.Vector4(-1, 0, 0, 0) },
        uBeacon: { value: 0 },
        uFresh: { value: 0 },
        uHideCov: { value: 0 },
        uHide: { value: new THREE.Vector4(1, 1, -1, -1) },
      },
    ]),
  });

// Polygon rings (flat, local metres) → a flat mesh on the ground at height y.
const groundMesh = (polys: number[][][], y: number, color: THREE.Color, order: number) => {
  const geos: THREE.BufferGeometry[] = [];
  for (const p of polys) {
    const outer = toPts(p[0]);
    if (outer.length < 3) continue;
    const shape = new THREE.Shape(outer.map((q) => new THREE.Vector2(q[0], q[1])));
    for (const hole of p.slice(1)) {
      const hp = toPts(hole).reverse();
      if (hp.length >= 3) shape.holes.push(new THREE.Path(hp.map((q) => new THREE.Vector2(q[0], q[1]))));
    }
    geos.push(new THREE.ShapeGeometry(shape));
  }
  const g = mergeGeos(geos);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  // Opaque and depth-free: ground layers paint in renderOrder before the buildings, which then cover them.
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, fog: true }));
  m.renderOrder = order;
  return m;
};

const mergeGeos = (geos: THREE.BufferGeometry[]) => {
  let n = 0;
  for (const g of geos) n += (g.index ? g.index.count : g.attributes.position.count) * 3;
  const out = new Float32Array(n);
  let o = 0;
  for (const g of geos) {
    const p = g.attributes.position.array as ArrayLike<number>;
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        out[o++] = p[idx[i] * 3];
        out[o++] = p[idx[i] * 3 + 1];
        out[o++] = p[idx[i] * 3 + 2];
      }
    } else {
      for (let i = 0; i < p.length; i++) out[o++] = p[i];
    }
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  return g;
};

// Polylines (flat x, y pairs) → fat line segments in world units, drawn on the ground.
const lineMesh = (lines: { pts: number[]; color?: string }[], width: number, color: string, order: number, y = 0.5, dashed = false) => {
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  for (const l of lines) {
    if (l.color) c.set(l.color);
    for (let i = 0; i + 3 < l.pts.length; i += 2) {
      pos.push(l.pts[i], y, -l.pts[i + 1], l.pts[i + 2], y, -l.pts[i + 3]);
      if (l.color) col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
  }
  const g = new LineSegmentsGeometry();
  g.setPositions(pos);
  if (col.length) g.setColors(col);
  // Opaque too (overlapping round caps would double up if blended); fades mix the colour into the land instead.
  const m = new LineMaterial({ color: col.length ? 0xffffff : new THREE.Color(color).getHex(), linewidth: width, worldUnits: true, vertexColors: col.length > 0, depthTest: false, depthWrite: false, dashed, dashSize: 90, gapSize: 140 });
  m.fog = true;
  m.resolution.set(W, H);
  const line = new LineSegments2(g, m);
  if (dashed) line.computeLineDistances();
  line.renderOrder = order;
  line.frustumCulled = false;
  return line;
};

// ---------- Engine ----------

export type Engine = { canvas: HTMLCanvasElement; render: (s: WorldState) => void };

const HERO_BOX = [-147.2 - 4, -878.6 - 4, -110.5 + 4, -737.7 + 4];

export const createEngine = (): Engine => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0x000000, 1000, 10000);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 1e6);

  // Sky dome, always centred on the camera.
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uZen: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(-0.8, 0, -0.6).normalize() },
    },
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // Ground: sea, land, Shenzhen, parks and water.
  const seaMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false, fog: true });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600000, 600000).rotateX(-Math.PI / 2), seaMat);
  sea.renderOrder = -5;
  scene.add(sea);
  const land = groundMesh(GROUND.land, 0, new THREE.Color(), -4);
  scene.add(land);
  const szFill = groundMesh(
    WORLD.sz.flatMap((d) => d.rings.map((r) => [r])),
    0,
    new THREE.Color("#ff8a3d"),
    -3,
  );
  {
    // A translucent wash over the land; it renders after the buildings, so it tests depth.
    const m = szFill.material as THREE.MeshBasicMaterial;
    m.transparent = true;
    m.depthTest = true;
    szFill.position.y = 0.6;
  }
  scene.add(szFill);
  const green = groundMesh(
    GROUND.green.filter((g) => g.kind === "green").map((g) => g.p),
    0,
    new THREE.Color(),
    -2,
  );
  scene.add(green);
  const water = groundMesh(
    GROUND.green.filter((g) => g.kind === "water").map((g) => g.p),
    0,
    new THREE.Color(),
    -2,
  );
  scene.add(water);

  const szLines = lineMesh(
    WORLD.sz.flatMap((d) => d.rings.map((r) => ({ pts: [...r, r[0], r[1]] }))),
    60,
    "#f4f0e8",
    1,
  );
  scene.add(szLines);
  const cityRoads = lineMesh(
    GROUND.roads.filter((r) => r.cls === "motorway" || r.cls === "trunk" || r.cls === "primary"),
    45,
    "#ffb46a",
    2,
  );
  scene.add(cityRoads);
  const roadsMajor = lineMesh(
    ALL_ROADS.filter((r) => r.cls === "major"),
    6,
    "#ffffff",
    3,
  );
  scene.add(roadsMajor);
  // Car lights: white heads one way, red tails the other, as dashes running along the main roads.
  const carsW = lineMesh(
    ALL_ROADS.filter((r) => r.cls === "major"),
    2.6,
    "#fff1d0",
    4,
    0.7,
    true,
  );
  const carsR = lineMesh(
    ALL_ROADS.filter((r) => r.cls === "major"),
    2.6,
    "#ff3b30",
    4,
    0.7,
    true,
  );
  for (const [l, dash, gap] of [
    [carsW, 7, 38],
    [carsR, 5, 31],
  ] as const) {
    const m = l.material as LineMaterial;
    m.dashSize = dash;
    m.gapSize = gap;
  }
  scene.add(carsW, carsR);
  const roadsMinor = lineMesh(
    ALL_ROADS.filter((r) => r.cls !== "major"),
    6,
    "#ffffff",
    3,
  );
  scene.add(roadsMinor);
  const metro = lineMesh(
    GROUND.metro.map((m) => ({ pts: m.pts, color: m.colour || "#6fd0ff" })),
    16,
    "#6fd0ff",
    4,
    0.8,
  );
  scene.add(metro);
  const metroFlow = lineMesh(
    GROUND.metro.map((m) => ({ pts: m.pts, color: "#e9f6ff" })),
    18,
    "#e9f6ff",
    5,
    1,
    true,
  );
  scene.add(metroFlow);

  // OSM buildings (minus the hero's own footprints), CTBUH towers, the hero.
  const bIndex: number[] = [];
  ALL_BLDG.forEach((b, i) => {
    if (!(b.cx > HERO_BOX[0] && b.cx < HERO_BOX[2] && b.cy > HERO_BOX[1] && b.cy < HERO_BOX[3])) bIndex.push(i);
  });
  const bl = bIndex.map((i) => ALL_BLDG[i]);
  const bTex = stateTex(bl.length);
  const bMat = bldgMaterial(bl.length);
  bMat.uniforms.uState.value = bTex;
  const bMesh = new THREE.Mesh(prisms(bl), bMat);
  bMesh.frustumCulled = false;
  bMesh.renderOrder = 10;
  scene.add(bMesh);

  const tw = CITY.towers;
  const covered = tw.map(([x, y, h, year]) => {
    if (x > -3104 && x < 3104 && y > -2807 && y < 2844) return 1;
    return NANSHAN.buildings.some((b) => b.year === year && Math.abs(b.h - h) < 2 && Math.hypot(b.cx - x, b.cy - y) < 150) ? 1 : 0;
  });
  const tTex = stateTex(tw.length);
  const tMat = bldgMaterial(tw.length, { TOWERS: "" });
  tMat.uniforms.uState.value = tTex;
  const tMesh = new THREE.Mesh(
    prisms(
      tw.map(([x, y, h, year]) => {
        const s = Math.min(75, 34 + (h - 150) * 0.08) / 2;
        return { ring: [x - s, y - s, x + s, y - s, x + s, y + s, x - s, y + s], h, year, cov: covered[tw.findIndex((q) => q[0] === x && q[1] === y)] };
      }),
      { year: true },
    ),
    tMat,
  );
  tMesh.frustumCulled = false;
  tMesh.renderOrder = 10;
  scene.add(tMesh);

  const hr = CITY.hero;
  const hTex = stateTex(3);
  const hMat = bldgMaterial(3, { HERO: "" });
  hMat.uniforms.uState.value = hTex;
  const hMesh = new THREE.Mesh(
    prisms(
      [
        { ring: hr.podium, h: TOWERS.S.podiumH, spec: [TOWERS.S.podiumH, 6, 0] },
        { ring: hr.S, h: TOWERS.S.height, spec: [TOWERS.S.height, TOWERS.S.floors, TOWERS.S.crown] },
        { ring: hr.N, h: TOWERS.N.height, spec: [TOWERS.N.height, TOWERS.N.floors, TOWERS.N.crown] },
      ],
      { hero: true },
    ),
    hMat,
  );
  hMesh.frustumCulled = false;
  hMesh.renderOrder = 11;
  scene.add(hMesh);

  // Pools for scene props: boxes (plots, stacks, light columns) and outlines.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const boxPool: THREE.Mesh[] = [];
  const polyPool: LineSegments2[] = [];

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const setState = (tex: THREE.DataTexture, n: number, f: ((i: number) => [number, number, number, number] | undefined) | undefined) => {
    const d = tex.image.data as unknown as Float32Array;
    let changed = false;
    for (let i = 0; i < n; i++) {
      const s = f?.(i) ?? [1, 0, 1, 1];
      const o = i * 4;
      if (d[o] !== s[0] || d[o + 1] !== s[1] || d[o + 2] !== s[2] || d[o + 3] !== s[3]) {
        d[o] = s[0];
        d[o + 1] = s[1];
        d[o + 2] = s[2];
        d[o + 3] = s[3];
        changed = true;
      }
    }
    if (changed) tex.needsUpdate = true;
  };

  const render = (s: WorldState) => {
    const k = Math.max(0, Math.min(1, s.night));
    const P = (key: keyof typeof PAL.dusk) => mixC(PAL.dusk[key], PAL.night[key], k);
    const d = setCamera(camera, s.cam);

    // sky + fog
    skyMat.uniforms.uZen.value.copy(P("zen"));
    skyMat.uniforms.uMid.value.copy(P("mid"));
    skyMat.uniforms.uHor.value.copy(P("hor"));
    skyMat.uniforms.uGlow.value.copy(P("glow")).multiplyScalar(0.6);
    sky.position.copy(camera.position);
    sky.scale.setScalar(camera.far * 0.5);
    // the far city sinks into the same colour as the sky at the horizon
    fog.color.copy(P("hor")).lerp(P("mid"), 0.35);
    fog.near = d * 1.05;
    fog.far = d * 5.5;

    // ground
    seaMat.color.copy(P("sea"));
    (land.material as THREE.MeshBasicMaterial).color.copy(P("land"));
    (green.material as THREE.MeshBasicMaterial).color.copy(P("green"));
    (water.material as THREE.MeshBasicMaterial).color.copy(P("sea"));
    const szT = s.szTint ?? 0;
    szFill.visible = szT > 0.002;
    (szFill.material as THREE.MeshBasicMaterial).opacity = szT * 0.22;
    green.visible = water.visible = (s.green ?? 1) > 0.01;
    (green.material as THREE.MeshBasicMaterial).opacity = (water.material as THREE.MeshBasicMaterial).opacity = s.green ?? 1;

    // Lines are opaque: a fade mixes the line colour into the land under it.
    const landC = P("land");
    const lineO = (l: LineSegments2, o: number, col?: THREE.Color) => {
      l.visible = o > 0.003;
      const m = l.material as LineMaterial;
      if (col) m.color.copy(landC).lerp(col, Math.min(1, o));
      else m.color.setScalar(Math.min(1, o));
    };
    lineO(szLines, s.sz ?? 0, C("#9aa3b2"));
    (szLines.material as LineMaterial).linewidth = Math.max(20, 1.4 / s.cam.z);
    lineO(cityRoads, (s.cityRoads ?? 0) * 0.55, mixC("#4c5568", "#d99a5c", k));
    (cityRoads.material as LineMaterial).linewidth = Math.max(10, 0.9 / s.cam.z);
    const roadsO = s.roads ?? 1;
    // street lights only take over once it is properly dark
    const kr = k * k * (3 - 2 * k);
    const PR = (key: "road" | "roadMinor") => mixC(PAL.dusk[key], PAL.night[key], Math.max(0, (kr - 0.25) / 0.75));
    lineO(roadsMajor, roadsO, PR("road").multiplyScalar(0.55 + 0.25 * k));
    (roadsMajor.material as LineMaterial).linewidth = Math.max(5, 1.2 / s.cam.z);
    lineO(roadsMinor, roadsO, PR("roadMinor"));
    (roadsMinor.material as LineMaterial).linewidth = Math.max(2.5, 0.8 / s.cam.z);
    // car lights read from the CBD scale down to a few hundred metres, then would turn into blocks
    const tr = s.traffic !== undefined ? roadsO * Math.min(1, s.cam.z / 0.25) * Math.min(1, Math.max(0, (2.0 - s.cam.z) / 0.8)) : 0;
    lineO(carsW, tr, C("#fff1d0").multiplyScalar(0.9 + 0.5 * k));
    lineO(carsR, tr, C("#ff3b30").multiplyScalar(0.8 + 0.4 * k));
    for (const l of [carsW, carsR]) (l.material as LineMaterial).linewidth = Math.max(1.6, 0.9 / s.cam.z);
    (carsW.material as LineMaterial).dashOffset = -(s.traffic ?? 0);
    (carsR.material as LineMaterial).dashOffset = (s.traffic ?? 0) * 0.9;
    lineO(metro, (s.metro ?? 0) * 0.9);
    (metro.material as LineMaterial).linewidth = Math.max(3, 2.4 / s.cam.z);
    const flowOn = s.metroFlow !== undefined ? s.metro ?? 0 : 0;
    lineO(metroFlow, flowOn, C("#e9f6ff").multiplyScalar(1.3));
    (metroFlow.material as LineMaterial).linewidth = Math.max(2.5, 1.4 / s.cam.z);
    (metroFlow.material as LineMaterial).dashOffset = -(s.metroFlow ?? 0);

    // building materials
    for (const m of [bMat, tMat, hMat]) {
      const u = m.uniforms;
      u.uNight.value = k;
      u.uLights.value = s.lights ?? 0.35 + 0.65 * k;
      u.uFull.value = s.full ?? 0;
      u.uVacancy.value = s.vacancy ?? 0;
      u.uWallA.value.copy(P("wallA"));
      u.uWallB.value.copy(P("wallB"));
      u.uRoofC.value.copy(P("roof"));
      u.uGlassLo.value.copy(P("glassLo"));
      u.uGlassHi.value.copy(P("glassHi"));
      u.uTint.value.set(s.tint ?? "#ff8a3d");
      u.uLed.value = s.led ?? 0;
    }
    hMat.uniforms.uVacancy.value = 0;
    bMat.uniforms.uRise.value = s.rise ?? 1;
    bMesh.visible = (s.city ?? 1) > 0.001 && (s.rise ?? 1) > 0.001;
    setState(bTex, bl.length, s.bState ? (i) => s.bState!(bIndex[i], ALL_BLDG[bIndex[i]]) : undefined);

    const T = s.towers;
    tMesh.visible = !!T && T.on > 0.001;
    if (T) {
      tMat.uniforms.uYear.value = T.year;
      tMat.uniforms.uBeacon.value = T.beacon ?? 0;
      tMat.uniforms.uFresh.value = T.fresh ?? 0;
      // where the OSM blocks stand, they already carry these towers with their real footprints
      tMat.uniforms.uHideCov.value = bMesh.visible ? 1 : 0;
      tMat.uniforms.uEx.value = T.ex * T.on;
      setState(tTex, tw.length, T.tint ? (i) => [1, T.tint!(i, tw[i]), 1, 1] : undefined);
    }

    const hs = s.hero ?? {};
    hMesh.visible = (hs.on ?? 1) > 0.001;
    const built = hs.built ?? 1;
    hMat.uniforms.uClip.value = built >= 1 ? 1e6 : Math.max(0.01, built * TOWERS.N.height);
    setState(hTex, 3, () => [1, hs.tint ?? 0, hs.on ?? 1, 1]);
    if (hs.hl) hMat.uniforms.uHL.value.set(hs.hl.part, hs.hl.from, hs.hl.to, hs.hl.amt);
    else hMat.uniforms.uHL.value.set(-1, 0, 0, 0);

    // props
    const boxes = s.boxes ?? [];
    while (boxPool.length < boxes.length) {
      const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: true }));
      m.renderOrder = 20;
      m.frustumCulled = false;
      scene.add(m);
      boxPool.push(m);
    }
    boxPool.forEach((m, i) => {
      const b = boxes[i];
      m.visible = !!b && b.o > 0.003;
      if (!b) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(b.color);
      if (b.add) mat.color.multiplyScalar(2);
      mat.opacity = b.o;
      mat.blending = b.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.position.set(b.x, b.base ?? 0, -b.y);
      m.scale.set(b.w, Math.max(0.01, b.h), b.d);
      m.rotation.set(0, ((b.rot ?? 0) * Math.PI) / 180, 0);
    });
    const polys = s.polys ?? [];
    while (polyPool.length < polys.length) {
      const g = new LineSegmentsGeometry();
      const m = new LineMaterial({ color: 0xffffff, linewidth: 4, worldUnits: true, transparent: true, depthTest: false, depthWrite: false });
      m.resolution.set(W, H);
      const l = new LineSegments2(g, m);
      l.renderOrder = 30;
      l.frustumCulled = false;
      scene.add(l);
      polyPool.push(l);
    }
    polyPool.forEach((l, i) => {
      const p = polys[i];
      l.visible = !!p && p.o > 0.003;
      if (!p) return;
      const pos: number[] = [];
      const pts = p.closed ? [...p.pts, p.pts[0], p.pts[1]] : p.pts;
      for (let j = 0; j + 3 < pts.length; j += 2) pos.push(pts[j], p.h ?? 1.5, -pts[j + 1], pts[j + 2], p.h ?? 1.5, -pts[j + 3]);
      l.geometry.setPositions(pos);
      const m = l.material as LineMaterial;
      m.color.set(p.color).multiplyScalar(1.6);
      m.linewidth = p.width;
      m.opacity = p.o;
      m.dashed = !!p.dash;
      if (p.dash) {
        m.dashSize = p.dash;
        m.gapSize = p.dash * 0.7;
        l.computeLineDistances();
      }
    });

    bloom.strength = s.bloom ?? 0.42 + 0.18 * k;
    renderer.toneMappingExposure = s.exposure ?? 1.05;
    composer.render();
    // block until the GPU is done, so the screenshot never catches a half-drawn frame
    renderer.getContext().finish();
  };

  return { canvas, render };
};

let ENGINE: Engine | null = null;
export const engine = () => {
  if (!ENGINE) ENGINE = createEngine();
  return ENGINE;
};

export const viewDistance = camDist;
