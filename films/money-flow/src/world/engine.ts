// The town in three.js, rendered synchronously per frame: render(t) sets every animated value from film time t.
// A miniature town (Kenney CC0 models) from midday to night. Money is real-looking gold coins (one coin = 1 yuan in
// the restaurant chapters) that fly calm arcs between people and pile up where they stop. No blinking: routes are
// faint solid lines drawn once, coins move at an even pace.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyPose, H, poseAt, W } from "./camera";
import { animations, inst, Kit, loadModels, Look, newLook } from "../town/assets";
import {
  COUPLE_HOME, HILL_Y, nodePos, PEOPLE, PLACE, ROADS, ROW_A_X, ROW_A_Z, ROW_B_X, ROW_B_Z, rnd, TECH_TOWERS, v3, V, WAITER_HOME,
} from "./layout";
import { Flow, FLOWS, PILES, PileWin, RIVER, SEEDS, TECH, salesAt, yearAt } from "./flows";
import { dayAt, lerp, ramp, T, win } from "../timing";

const GOLD = new THREE.Color("#ffbf3a");
const LOAN = new THREE.Color("#8fc4ff");

// ---------------------------------------------------------------- post
const tiltShift = (dir: [number, number]) =>
  new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(...dir) }, uFocus: { value: 0.5 }, uBand: { value: 0.2 }, uAmt: { value: 1 }, uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uAmt; varying vec2 vUv;
      void main(){
        float d = max(0.0, abs(vUv.y - uFocus) - uBand);
        float r = clamp(d * 3.0, 0.0, 1.0) * 3.2 * uAmt;
        if (r < 0.05) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
        vec4 s = vec4(0.0); float ws = 0.0;
        for (int i = -7; i <= 7; i++) { float fi = float(i); float w = exp(-fi * fi / 24.0); s += texture2D(tDiffuse, vUv + uDir * fi * r / uRes) * w; ws += w; }
        gl_FragColor = s / ws;
      }`,
  });
const gradePass = () =>
  new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uVig: { value: 0.28 }, uNight: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uT, uVig, uNight; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 q = vUv - 0.5; q.x *= 1.25;
        c.rgb *= 1.0 - (uVig + 0.12 * uNight) * smoothstep(0.25, 0.85, length(q));
        // warm the highlights a touch in the day, cool the shadows at night
        c.rgb = mix(c.rgb, c.rgb * vec3(1.03, 1.0, 0.95), 1.0 - uNight);
        c.rgb += vec3(0.004, 0.008, 0.02) * uNight;
        c.rgb += (h(vUv * vec2(1920.0, 1080.0) + fract(uT * 7.31) * 100.0) - 0.5) * 0.018;
        gl_FragColor = vec4(c.rgb, 1.0);
      }`,
  });

// ---------------------------------------------------------------- an arc through the air between two points
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
    this.len = a.distanceTo(b) * 1.2 + lift;
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const t = Math.min(1, Math.max(0, u));
    const s = 1 - t;
    return target.set(0, 0, 0).addScaledVector(this.a, s * s).addScaledVector(this.c, 2 * s * t).addScaledVector(this.b, t * t);
  }
}
// the route: a faint solid line that draws itself from payer to payee as the first coin flies, then fades
const trailMat = (col: THREE.Color) =>
  new THREE.ShaderMaterial({
    uniforms: { uHead: { value: 0 }, uK: { value: 0 }, uCol: { value: col.clone() }, uNight: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHead, uK, uNight; uniform vec3 uCol; varying vec2 vUv;
      void main(){
        float drawn = 1.0 - smoothstep(uHead - 0.04, uHead, vUv.x);
        float ends = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        float a = uK * drawn * ends * (0.42 + 0.25 * uNight);
        gl_FragColor = vec4(uCol * (1.1 + 0.9 * uNight), a);
      }`,
  });

type FlowRT = { f: Flow; curve: Arc; dep: number[]; trail?: THREE.Mesh; size: number; col: THREE.Color; dur: number };
type PileRT = { w: PileWin; ev: number[]; sign: number[] }; // sorted events (time, ±1)

// every model the town uses
const SUB = "abcdefghijklmnopqrstu".split("").map((c) => ["sub", `building-type-${c}`] as [Kit, string]);
const NEEDED: [Kit, string][] = [
  ...SUB,
  ["com", "building-skyscraper-a"], ["com", "building-skyscraper-b"], ["com", "building-skyscraper-c"], ["com", "building-skyscraper-d"], ["com", "building-skyscraper-e"],
  ["com", "building-a"], ["com", "building-b"], ["com", "building-c"], ["com", "building-d"], ["com", "building-e"], ["com", "building-f"], ["com", "building-g"], ["com", "building-h"],
  ["com", "building-j"], ["com", "building-l"], ["com", "building-n"], ["com", "detail-awning-wide"], ["com", "detail-parasol-a"], ["com", "detail-parasol-b"],
  ["com", "low-detail-building-b"], ["com", "low-detail-building-e"], ["com", "low-detail-building-wide-a"],
  ["ind", "building-f"], ["ind", "building-l"], ["ind", "chimney-large"], ["ind", "detail-tank-large"], ["ind", "detail-tank"], ["ind", "building-h"],
  ["car", "sedan"], ["car", "suv-luxury"], ["car", "van"], ["car", "delivery"], ["car", "taxi"], ["car", "hatchback-sports"], ["car", "truck"],
  ...["character-male-a", "character-male-b", "character-male-c", "character-male-d", "character-male-e", "character-male-f", "character-female-a", "character-female-b", "character-female-c", "character-female-d"].map(
    (n) => ["chr", n] as [Kit, string],
  ),
  ["nat", "tree_oak_dark"], ["nat", "tree_default_dark"], ["nat", "tree_detailed_dark"], ["nat", "tree_fat_darkh"], ["nat", "tree_pineRoundC"], ["nat", "plant_bushLarge"], ["nat", "plant_bush"],
  ["nat", "crops_cornStageD"], ["nat", "crops_leafsStageB"], ["nat", "crops_wheatStageB"], ["nat", "crop_pumpkin"], ["nat", "crop_carrot"], ["nat", "fence_simple"],
  ["fur", "tableRound"], ["fur", "chair"], ["fur", "cardboardBoxClosed"], ["fur", "cardboardBoxOpen"],
];

class Town {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, W / H, 0.3, 1200);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  tsH: ShaderPass;
  tsV: ShaderPass;
  grade: ShaderPass;
  looks: Look[] = [];
  hemi!: THREE.HemisphereLight;
  sun!: THREE.DirectionalLight;
  skyMat!: THREE.ShaderMaterial;
  lamps: THREE.PointLight[] = [];
  bulbs!: THREE.MeshBasicMaterial;
  people: { obj: THREE.Object3D; mixer: THREE.AnimationMixer; id: string }[] = [];
  dev: { o: THREE.Object3D; look: Look; base: number; k: number }[] = [];
  tech: { o: THREE.Object3D; look: Look; h: number }[] = [];
  bill!: THREE.Mesh;
  coins!: THREE.InstancedMesh;
  coinCol: THREE.Color[] = [];
  flows: FlowRT[] = [];
  piles: PileRT[] = [];
  isReady = false;
  ready: Promise<void>;
  lastT = 0;
  M = new THREE.Matrix4();
  Q = new THREE.Quaternion();
  E = new THREE.Euler();
  P = new THREE.Vector3();
  S = new THREE.Vector3();

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
    this.scene.fog = new THREE.FogExp2("#cfe0ee", 0.0019);
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.2, 0.45, 0.92);
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

  look(o: Partial<{ win: number; lit: number; roof: string; roofK: number; tint: string }> = {}) {
    const l = newLook({ win: 0, ...o });
    this.looks.push(l);
    return l;
  }
  put(kit: Kit, name: string, x: number, y: number, z: number, s = 1, ry = 0, lk?: Look, paint?: string) {
    const o = inst(kit, name, lk ?? this.look({ lit: 0.55 }), { paint });
    o.position.set(x, y, z);
    o.scale.setScalar(s);
    o.rotation.y = ry;
    this.scene.add(o);
    return o;
  }

  build() {
    const S = this.scene;
    // ---------- light
    this.hemi = new THREE.HemisphereLight("#cfe4ff", "#7d6e55", 1.5);
    S.add(this.hemi);
    const sun = new THREE.DirectionalLight("#fff1dc", 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -110;
    sc.right = 110;
    sc.top = 90;
    sc.bottom = -90;
    sc.near = 10;
    sc.far = 500;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    sun.target.position.set(-5, 0, -15);
    S.add(sun, sun.target);
    this.sun = sun;
    // warm lamps that come on at night: the shop, the street, the hill
    for (const [x, y, z, i] of [
      [0, 4, 6, 60], [-30, 4, 6, 40], [-10, 4, 12, 30], [16, 4, 12, 30], [-24, 4, 28, 30], [10, 4, 28, 30], [38, 7, -42, 40], [-16, 4, -17, 30], [18, 4, -22, 30],
    ] as number[][]) {
      const l = new THREE.PointLight("#ffb366", 0, 26, 1.6);
      l.position.set(x, y, z);
      l.userData.i = i;
      S.add(l);
      this.lamps.push(l);
    }

    // ---------- sky: midday blue → evening amber → night
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uDay: { value: 1 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uDay; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vP); float y = clamp(d.y, -0.2, 1.0);
          vec3 dZ = vec3(0.30, 0.56, 0.90), dH = vec3(0.80, 0.89, 0.96);
          vec3 eZ = vec3(0.20, 0.27, 0.52), eH = vec3(1.0, 0.70, 0.45);
          vec3 nZ = vec3(0.015, 0.03, 0.08), nH = vec3(0.12, 0.15, 0.28);
          float k1 = smoothstep(0.55, 1.0, uDay), k2 = smoothstep(0.0, 0.55, uDay);
          vec3 Z = mix(mix(nZ, eZ, k2), dZ, k1), Hh = mix(mix(nH, eH, k2), dH, k1);
          vec3 c = mix(Hh, Z, smoothstep(0.0, 0.55, y));
          float w = pow(max(0.0, dot(normalize(vec2(d.x, d.z)), normalize(vec2(-1.0, 0.3)))), 3.0);
          c += vec3(1.0, 0.45, 0.2) * w * exp(-max(y, 0.0) * 10.0) * 0.8 * (1.0 - k1) * (0.3 + 0.7 * k2);
          float st = step(0.9975, h(floor(d * 260.0))) * smoothstep(0.15, 0.6, y) * (1.0 - k2);
          c += vec3(0.85, 0.9, 1.0) * st;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    S.add(new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.skyMat));

    // ---------- ground: grass, a paved square at the shop, roads with markings, the farm's soil, the hill
    const flat = (w: number, d: number, col: string, x: number, z: number, y = 0.01, rough = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: col, roughness: rough }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      S.add(m);
      return m;
    };
    {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 512;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#86a463";
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) {
        const x = rnd(i * 3 + 1) * 512, y = rnd(i * 3 + 2) * 512, r = 6 + rnd(i * 3 + 3) * 40;
        g.fillStyle = rnd(i + 77) > 0.5 ? "rgba(70,110,50,0.10)" : "rgba(160,180,100,0.10)";
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(60, 60);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
      m.rotation.x = -Math.PI / 2;
      m.receiveShadow = true;
      S.add(m);
    }
    flat(22, 14, "#cbbfa6", 0, 3.5, 0.02); // the square in front of the shop
    flat(16, 12, "#c7b89c", -31, 4, 0.02); // market ground
    flat(30, 20, "#8b6b47", -60, -8, 0.02); // farm soil
    const roadM = new THREE.MeshStandardMaterial({ color: "#56585f", roughness: 0.85 });
    const markM = new THREE.MeshBasicMaterial({ color: "#e9e4d6" });
    const walkM = new THREE.MeshStandardMaterial({ color: "#c9c3b6", roughness: 0.95 });
    const poleM = new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.6 });
    const bulbG = new THREE.SphereGeometry(0.2, 10, 8);
    this.bulbs = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd29a") });
    const cars = ["sedan", "taxi", "hatchback-sports", "van", "sedan", "suv-luxury"];
    let ci0 = 0;
    for (const [x0, z0, x1, z1, w] of ROADS) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ang = -Math.atan2(z1 - z0, x1 - x0);
      // sidewalks either side
      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.1), walkM);
        sw.rotation.x = -Math.PI / 2;
        sw.rotation.z = ang;
        const nx = x0 === x1 ? side * (w / 2 + 0.55) : 0;
        const nz = x0 === x1 ? 0 : side * (w / 2 + 0.55);
        sw.position.set((x0 + x1) / 2 + nx, 0.025, (z0 + z1) / 2 + nz);
        sw.receiveShadow = true;
        S.add(sw);
      }
      // lamps every 14 m on one side, a parked car now and then
      for (let d = 7; d < len - 3; d += 14) {
        const k = d / len;
        const px = x0 + (x1 - x0) * k + (x0 === x1 ? w / 2 + 0.9 : 0);
        const pz = z0 + (z1 - z0) * k + (x0 === x1 ? 0 : w / 2 + 0.9);
        if (Object.values(PLACE).some((p) => Math.hypot(p[0] - px, p[2] - pz) < 5)) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6), poleM);
        pole.position.set(px, 1.6, pz);
        pole.castShadow = true;
        S.add(pole);
        const b = new THREE.Mesh(bulbG, this.bulbs);
        b.position.set(px, 3.25, pz);
        S.add(b);
        if (rnd(d + x0 * 3 + z0) > 0.72) {
          const cx = x0 + (x1 - x0) * k - (x0 === x1 ? w / 2 - 0.9 : -3);
          const cz = z0 + (z1 - z0) * k - (x0 === x1 ? -3 : w / 2 - 0.9);
          this.put("car", cars[ci0++ % cars.length], cx, 0.3, cz, 0.6, x0 === x1 ? 0 : Math.PI / 2, this.look({ roofK: 0 }));
        }
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), roadM);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = ang;
      m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
      m.receiveShadow = true;
      S.add(m);
      for (let d = 1; d < len - 1; d += 3) {
        const k = d / len;
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.1), markM);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = ang;
        dash.position.set(x0 + (x1 - x0) * k, 0.045, z0 + (z1 - z0) * k);
        S.add(dash);
      }
    }
    // the hill: a raised green terrace on the north-east with its wall
    {
      const [hx, , hz] = PLACE.hill;
      const top = new THREE.MeshStandardMaterial({ color: "#86a865", roughness: 1 });
      const wall = new THREE.MeshStandardMaterial({ color: "#b9ad97", roughness: 0.95 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(34, HILL_Y, 20), [wall, wall, top, top, wall, wall]);
      box.position.set(hx, HILL_Y / 2, hz);
      box.receiveShadow = box.castShadow = true;
      S.add(box);
    }

    // ---------- the restaurant: a shop front with an awning, parasols and round tables on the square
    {
      const lk = this.look({ lit: 0.95, roof: "#a5453a" });
      this.put("com", "building-c", 0, 0, -1.2, 3.0, 0, lk);
      {
        const cv = document.createElement("canvas");
        cv.width = 256;
        cv.height = 32;
        const g = cv.getContext("2d")!;
        for (let i = 0; i < 16; i++) {
          g.fillStyle = i % 2 ? "#f3ece0" : "#c8402f";
          g.fillRect(i * 16, 0, 16, 32);
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        const aw = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
        aw.position.set(0, 2.55, 2.15);
        aw.rotation.x = 0.32;
        aw.castShadow = true;
        S.add(aw);
      }
      this.put("com", "building-b", -8.5, 0, -1.6, 3.0, 0);
      this.put("com", "building-e", 8.5, 0, -1.6, 3.0, 0);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.16), new THREE.MeshStandardMaterial({ color: "#b8322a", roughness: 0.6, emissive: new THREE.Color("#ff5a3a"), emissiveIntensity: 0 }));
      sign.position.set(0, 3.3, 1.55);
      sign.castShadow = true;
      sign.userData.neon = 1;
      S.add(sign);
      this.signMat = sign.material as THREE.MeshStandardMaterial;
      // two red lanterns
      for (const x of [-3.1, 3.1]) {
        const lan = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: "#d63a2a", emissive: new THREE.Color("#ff6a3a"), emissiveIntensity: 0.2 }));
        lan.scale.y = 1.35;
        lan.position.set(x, 2.2, 2.6);
        S.add(lan);
        this.lanterns.push(lan.material as THREE.MeshStandardMaterial);
      }
      for (const [x, z, p] of [[-0.6, 5.6, "detail-parasol-a"], [-5.6, 6.2, "detail-parasol-b"], [5.0, 6.4, "detail-parasol-a"]] as [number, number, string][]) {
        this.put("com", p, x, 0, z, 2.6, 0.3, undefined, p.endsWith("a") ? "#e8e1d2" : "#c8402f");
        this.put("fur", "tableRound", x, 0, z, 1.5);
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + 0.5;
          this.put("fur", "chair", x + Math.cos(a) * 1.05, 0, z + Math.sin(a) * 1.05, 1.4, -a + Math.PI / 2);
        }
      }
    }

    // ---------- the market: stalls under parasols, crates, a van
    {
      const [mx, , mz] = PLACE.market;
      this.put("com", "building-h", mx - 2, 0, mz - 6.5, 2.8);
      this.put("com", "building-g", mx + 6, 0, mz - 6.5, 2.8);
      for (let i = 0; i < 6; i++) {
        const x = mx - 6 + (i % 3) * 5;
        const z = mz + 1 + Math.floor(i / 3) * 4.4;
        this.put("com", i % 2 ? "detail-parasol-b" : "detail-parasol-a", x, 0, z, 2.4, i * 0.4, undefined, ["#3f7fb8", "#e8e1d2", "#d0623a"][i % 3]);
        this.put("fur", "cardboardBoxOpen", x - 0.6, 0, z + 0.3, 1.6, i);
        this.put("fur", "cardboardBoxClosed", x + 0.6, 0, z - 0.2, 1.4, i * 2);
      }
      this.put("car", "van", -40, 0.3, 12.6, 0.8, Math.PI / 2, this.look({ roofK: 0 }));
    }
    // ---------- the farm: rows of crops and a fence, a little farmhouse
    {
      const [fx, , fz] = PLACE.farm;
      const crops = ["crops_cornStageD", "crops_leafsStageB", "crops_wheatStageB", "crop_pumpkin", "crop_carrot"];
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 12; c++) this.put("nat", crops[r % crops.length], fx - 13 + c * 2.2, 0, fz - 7 + r * 2.4, 2.4, rnd(r * 13 + c) * 6);
      for (let c = 0; c < 14; c++) this.put("nat", "fence_simple", fx - 14 + c * 2.1, 0, fz + 9.5, 2.1);
      this.put("sub", "building-type-a", fx + 6, 0, fz - 14, 2.0, 0.3);
    }
    // ---------- the landlord's flats, the platform's tower, power, government, bank
    {
      const [lx, , lz] = PLACE.landlord;
      this.put("com", "building-l", lx, 0, lz, 3.6, 0.1);
      this.put("com", "building-j", lx - 9, 0, lz + 1, 3.2, 0.1);
      const [px, , pz] = PLACE.platform;
      this.put("com", "building-skyscraper-b", px, 0, pz - 2, 3.6, 0, this.look({ lit: 0.7, roof: "#3a6fb8" }));
      this.put("car", "delivery", px - 4, 0.3, pz + 6.5, 0.7, 0.4, this.look({ roofK: 0 }));
      const [ex, , ez] = PLACE.power;
      this.put("ind", "building-f", ex, 0, ez - 2, 3.0);
      this.put("ind", "chimney-large", ex + 5, 0, ez - 5, 2.6);
      this.put("ind", "detail-tank-large", ex - 5, 0, ez + 1, 2.4);
      const [gx, , gz] = PLACE.gov;
      this.put("com", "building-n", gx, 0, gz - 1, 3.6, -0.2, this.look({ lit: 0.6, roof: "#8e3a33" }));
      const [bx, , bz] = PLACE.bank;
      this.put("com", "building-d", bx, 0, bz - 2, 3.8, 0, this.look({ lit: 0.6, roof: "#2e4f7a" }));
      this.put("com", "building-a", bx - 9, 0, bz - 1, 3.0);
      this.put("com", "building-f", bx + 9, 0, bz - 1, 3.0);
    }
    // ---------- houses: row A (ordinary), row B (poorest → richest), the waiter's and the couple's homes, the hill
    {
      const ROOFS = ["#a5543f", "#5d6f8a", "#8a6b4f", "#6f7f5e", "#9b4d48", "#4f5f74"];
      ROW_A_X.forEach((x, i) => {
        const m = "abcdefghijklmnopqrstu"[Math.floor(rnd(i + 40) * 21)];
        const lk = this.look({ lit: 0.5 + 0.4 * rnd(i + 3), roof: ROOFS[i % ROOFS.length] });
        this.put("sub", `building-type-${m}`, x, 0, ROW_A_Z, 2.0 + rnd(i + 9) * 0.3, rnd(i + 2) * 0.3 - 0.15, lk);
        if (rnd(i + 70) > 0.4) this.put("nat", "tree_default_dark", x - 3.6, 0, ROW_A_Z + 2.5, 2.2);
      });
      const order = ["s", "n", "p", "e", "d", "h", "k", "l", "t", "u"];
      ROW_B_X.forEach((x, i) => {
        const lk = this.look({ lit: 0.5 + 0.05 * i, roof: ROOFS[(i + 2) % ROOFS.length] });
        this.put("sub", `building-type-${order[i]}`, x, 0, ROW_B_Z, 1.7 + i * 0.09, 0, lk);
        if (i >= 7) this.put("car", i === 9 ? "suv-luxury" : "sedan", x + 3.4, 0.3, ROW_B_Z + 2.4, 0.62, Math.PI / 2, this.look({ roofK: 0 }));
        if (i % 2 === 0) this.put("nat", "plant_bushLarge", x - 3.5, 0, ROW_B_Z + 2.8, 2.0);
      });
      // a pool for the richest one
      const pool = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.8), new THREE.MeshStandardMaterial({ color: "#5fd0ea", roughness: 0.15 }));
      pool.position.set(ROW_B_X[9] - 1.6, 0.06, ROW_B_Z + 3.4);
      S.add(pool);
      // mansions on the hill
      for (const [x, z, m] of [[32, -50, "u"], [43, -52, "t"], [54, -50, "l"]] as [number, number, string][]) {
        this.put("sub", `building-type-${m}`, x, HILL_Y, z, 2.9, 0, this.look({ lit: 0.85, roof: "#6a4a3e" }));
        const p = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 2), new THREE.MeshStandardMaterial({ color: "#5fd0ea", roughness: 0.15 }));
        p.position.set(x + 1, HILL_Y + 0.06, z + 5);
        S.add(p);
      }
      this.put("car", "suv-luxury", 49, HILL_Y + 0.3, -43, 0.8, 0.2, this.look({ roofK: 0 }));
      void WAITER_HOME;
      void COUPLE_HOME;
    }
    // ---------- the new-homes district (the wave): towers that rise with the money poured into houses
    {
      const [dx, , dz] = PLACE.dev;
      const models = ["building-skyscraper-a", "building-skyscraper-c", "building-skyscraper-e", "building-skyscraper-a", "building-skyscraper-b", "building-skyscraper-e", "building-skyscraper-c"];
      models.forEach((m, i) => {
        const lk = this.look({ lit: 0.6, tint: "#f1ece4" });
        const x = dx - 15 + (i % 4) * 9 + (i >= 4 ? 4.5 : 0);
        const z = dz - (i >= 4 ? 9 : 0);
        const o = this.put("com", m, x, 0, z, 3.0, 0, lk);
        this.dev.push({ o, look: lk, base: 3.0, k: 0.7 + 0.5 * rnd(i + 90) });
      });
      // the cranes' district has a few low blocks already
      this.put("com", "low-detail-building-wide-a", dx + 20, 0, dz + 2, 3.2);
    }
    // ---------- the next waves: four new towers
    TECH_TOWERS.forEach((tw) => {
      const lk = this.look({ lit: 0.8, tint: "#e6eefc" });
      const o = this.put("com", tw.model, tw.x, 0, tw.z, 3.2, 0, lk);
      this.tech.push({ o, look: lk, h: tw.h });
    });
    // ---------- filler: every empty block gets a building or two and some trees, so the town reads as lived-in
    {
      const nearRoad = (x: number, z: number, m: number) => ROADS.some(([x0, z0, x1, z1, w]) => (x0 === x1 ? Math.abs(x - x0) < w / 2 + m && z > Math.min(z0, z1) - m && z < Math.max(z0, z1) + m : Math.abs(z - z0) < w / 2 + m && x > Math.min(x0, x1) - m && x < Math.max(x0, x1) + m));
      const busy = (x: number, z: number) =>
        Object.entries(PLACE).some(([k, p]) => Math.hypot(p[0] - x, p[2] - z) < (k === "dev" || k === "hill" || k === "tech" ? 24 : k === "farm" ? 18 : 12)) ||
        (z > 16 && z < 47 && x > -52 && x < 54) || (z < -58 && x > -4 && x < 44);
      const subs = "abcdefghijklmnopqrstu";
      const coms = ["building-a", "building-b", "building-d", "building-e", "building-f", "building-g", "building-h", "low-detail-building-b", "low-detail-building-e"];
      const ROOFS2 = ["#a5543f", "#5d6f8a", "#8a6b4f", "#6f7f5e", "#9b4d48"];
      let n = 0;
      for (let x = -86; x <= 66; x += 8.5)
        for (let z = -92; z <= 56; z += 8.5) {
          const jx = x + (rnd(x * 7 + z) - 0.5) * 2.5;
          const jz = z + (rnd(x + z * 5) - 0.5) * 2.5;
          if (nearRoad(jx, jz, 3.2) || busy(jx, jz)) continue;
          const r = rnd(jx * 3.3 + jz * 1.7);
          const ry = Math.floor(rnd(jx + jz) * 4) * (Math.PI / 2);
          if (r < 0.42) this.put("sub", `building-type-${subs[Math.floor(rnd(n + 5) * 21)]}`, jx, 0, jz, 1.8 + rnd(n) * 0.4, ry, this.look({ lit: 0.5, roof: ROOFS2[n % 5] }));
          else if (r < 0.7) this.put("com", coms[n % coms.length], jx, 0, jz, 2.4 + rnd(n + 9) * 0.8, ry);
          else if (r < 0.92) this.put("nat", ["tree_oak_dark", "tree_default_dark", "tree_fat_darkh", "tree_detailed_dark"][n % 4], jx, 0, jz, 2.4 + rnd(n + 3) * 1.4);
          if (r < 0.7 && rnd(n + 11) > 0.45) this.put("nat", "plant_bushLarge", jx + 2.8, 0, jz + 2.2, 1.8);
          n++;
        }
    }
    // ---------- background: low blocks far behind, trees
    for (let i = 0; i < 40; i++) {
      const x = -110 + i * 6 + (rnd(i + 400) - 0.5) * 3;
      const z = -95 - rnd(i + 410) * 30;
      this.put("com", ["low-detail-building-b", "low-detail-building-e", "building-a", "building-h"][i % 4], x, 0, z, 3 + rnd(i + 420) * 2.4, rnd(i + 430) * 0.5);
    }
    const trees = ["tree_oak_dark", "tree_default_dark", "tree_detailed_dark", "tree_fat_darkh", "tree_pineRoundC"];
    const treeSpots: [number, number][] = [];
    for (let i = 0; i < 90; i++) {
      const x = -90 + rnd(i + 600) * 170;
      const z = -85 + rnd(i + 610) * 140;
      // keep roads, buildings and the camera's main views clear
      const nearRoad = ROADS.some(([x0, z0, x1, z1, w]) => (x0 === x1 ? Math.abs(x - x0) < w + 2 && z > Math.min(z0, z1) && z < Math.max(z0, z1) : Math.abs(z - z0) < w + 2 && x > Math.min(x0, x1) && x < Math.max(x0, x1)));
      const nearPlace = Object.values(PLACE).some((p) => Math.hypot(p[0] - x, p[2] - z) < 13) || (z > 17 && z < 46 && x > -50 && x < 52);
      if (nearRoad || nearPlace) continue;
      treeSpots.push([x, z]);
    }
    treeSpots.forEach(([x, z], i) => this.put("nat", trees[i % trees.length], x, 0, z, 2.6 + rnd(i + 700) * 1.6));

    // ---------- people
    for (const p of PEOPLE) {
      const obj = inst("chr", p.model, this.look({ roofK: 0 }));
      obj.position.set(...p.at);
      obj.rotation.y = p.face;
      obj.scale.setScalar(p.s ?? 1.2);
      S.add(obj);
      const mixer = new THREE.AnimationMixer(obj);
      const clip = animations("chr", p.model).find((a) => a.name === "idle");
      if (clip) mixer.clipAction(clip).play();
      this.people.push({ obj, mixer, id: p.id });
      if (p.id === "rider") {
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
        bike.traverse((c) => ((c as THREE.Mesh).castShadow = true));
        bike.position.set(p.at[0] + 1.5, 0, p.at[2] + 0.3);
        bike.scale.setScalar(1.1);
        S.add(bike);
      }
    }

    // ---------- the 100-yuan note: a pink paper rectangle, lying on the table
    {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 256;
      const g = cv.getContext("2d")!;
      const grd = g.createLinearGradient(0, 0, 512, 256);
      grd.addColorStop(0, "#f5b3c0");
      grd.addColorStop(0.5, "#ec8fa4");
      grd.addColorStop(1, "#d9708a");
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "rgba(120,20,50,0.55)";
      g.lineWidth = 6;
      g.strokeRect(12, 12, 488, 232);
      g.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        g.beginPath();
        g.ellipse(150, 128, 30 + i * 4, 18 + i * 3, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = "rgba(110,15,45,0.85)";
      g.font = "bold 92px sans-serif";
      g.textAlign = "right";
      g.fillText("100", 482, 110);
      g.font = "bold 46px sans-serif";
      g.textAlign = "left";
      g.fillText("100", 28, 228);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      this.bill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide, transparent: true }));
      this.bill.castShadow = true;
      S.add(this.bill);
    }

    // ---------- coins: one instanced mesh, metal with a soft studio reflection
    {
      const pm = new THREE.PMREMGenerator(this.renderer);
      const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28);
      const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.92, roughness: 0.3, envMap: env, envMapIntensity: 1.25, emissive: new THREE.Color("#4a2c00"), emissiveIntensity: 0.4 });
      this.coins = new THREE.InstancedMesh(geo, mat, 6000);
      this.coins.castShadow = true;
      this.coins.frustumCulled = false;
      this.coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < 6000; i++) this.coins.setColorAt(i, GOLD);
      this.coinMat = mat;
      S.add(this.coins);
    }

    // ---------- flows: curves, departure times, trails
    for (const f of FLOWS) {
      const a = v3(nodePos(f.from), 0.7 * (f.size ?? 1));
      const b = v3(nodePos(f.to), 0.7 * (f.size ?? 1));
      const curve = new Arc(a, b, f.lift ?? 6);
      const dep: number[] = [];
      if (f.rate) {
        let acc = 0.5;
        for (let t = f.t0; t < (f.t1 ?? f.t0); t += 1 / 120) {
          acc += f.rate(t) / 120;
          while (acc >= 1) {
            dep.push(t);
            acc -= 1;
          }
        }
      } else for (let i = 0; i < f.n; i++) dep.push(f.t0 + i * (f.gap ?? 0.08));
      const col = f.col === "loan" ? LOAN : GOLD;
      const rt: FlowRT = { f, curve, dep, size: f.size ?? 1, col, dur: f.dur ?? 2.2 };
      if (f.trail !== false && dep.length) {
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035 * rt.size, 5, false), trailMat(col));
        m.frustumCulled = false;
        m.renderOrder = 2;
        S.add(m);
        rt.trail = m;
      }
      this.flows.push(rt);
    }
    // piles: event lists
    for (const w of PILES) {
      const ev: [number, number][] = [];
      for (const s of SEEDS) if (s.at === w.node) for (let i = 0; i < s.n; i++) ev.push([s.t + ((s.spread ?? 0.5) * i) / s.n, 1]);
      for (const f of this.flows) {
        if (f.f.to === w.node && !f.f.sink) for (const d of f.dep) ev.push([d + f.dur, 1]);
        if (f.f.from === w.node) for (const d of f.dep) ev.push([d, -1]);
      }
      ev.sort((x, y) => x[0] - y[0]);
      this.piles.push({ w, ev: ev.map((e) => e[0]), sign: ev.map((e) => e[1]) });
    }
  }
  signMat!: THREE.MeshStandardMaterial;
  lanterns: THREE.MeshStandardMaterial[] = [];
  coinMat!: THREE.MeshStandardMaterial;

  pileCount(p: PileRT, t: number) {
    if (p.w.count) return p.w.count(t);
    let n = 0;
    for (let i = 0; i < p.ev.length && p.ev[i] <= t; i++) n += p.sign[i];
    return Math.max(0, n);
  }

  // coins stacked in columns around a spot: column j at a ring position, coin k up the column
  stack(i0: number, at: V, n: number, size: number, per: number, scale: number) {
    if (n <= 0 || scale <= 0.01) return i0;
    const th = 0.07 * size;
    for (let k = 0; k < n && i0 < 6000; k++) {
      const col = Math.floor(k / per);
      const h = k % per;
      let ox = 0;
      let oz = 0;
      if (col > 0) {
        const ring = col <= 6 ? 1 : col <= 18 ? 2 : 3;
        const idx = ring === 1 ? col - 1 : ring === 2 ? col - 7 : col - 19;
        const cnt = ring === 1 ? 6 : ring === 2 ? 12 : 18;
        const a = (idx / cnt) * Math.PI * 2 + ring * 0.4;
        ox = Math.cos(a) * 0.64 * size * ring;
        oz = Math.sin(a) * 0.64 * size * ring;
      }
      const j = rnd(k * 3.1 + at[0]) - 0.5;
      this.P.set(at[0] + ox + j * 0.05 * size, at[1] + (h + 0.5) * th * scale, at[2] + oz + j * 0.04 * size);
      this.E.set(0, j * 2, 0);
      this.Q.setFromEuler(this.E);
      this.S.setScalar(size * scale);
      this.M.compose(this.P, this.Q, this.S);
      this.coins.setMatrixAt(i0, this.M);
      this.coins.setColorAt(i0, GOLD);
      i0++;
    }
    return i0;
  }

  render(t: number) {
    this.lastT = t;
    if (!this.isReady) return;
    const pose = poseAt(t);
    applyPose(this.camera, pose);
    const day = dayAt(t);
    const night = 1 - day;

    // ---------- light and sky
    this.skyMat.uniforms.uDay.value = day;
    const sunDay = new THREE.Vector3(70, 130, 60);
    const sunEve = new THREE.Vector3(-150, 45, 40);
    const k = THREE.MathUtils.clamp((1 - day) / 0.6, 0, 1);
    this.sun.position.copy(sunDay).lerp(sunEve, k);
    this.sun.color.set("#fff1dc").lerp(new THREE.Color("#ff9a5a"), k);
    this.sun.intensity = day > 0.3 ? 2.6 - 0.6 * k : lerp(0.25, 2.0, day / 0.3);
    if (day < 0.3) this.sun.color.lerp(new THREE.Color("#8fa6ff"), 1 - day / 0.3);
    this.hemi.color.set("#cfe4ff").lerp(new THREE.Color("#3a4c80"), night);
    this.hemi.groundColor.set("#7d6e55").lerp(new THREE.Color("#1c1a22"), night);
    this.hemi.intensity = lerp(0.55, 1.5, day);
    (this.scene.fog as THREE.FogExp2).color.set("#cfe0ee").lerp(new THREE.Color("#e9b892"), Math.min(1, k * 1.2) * (day > 0.3 ? 1 : day / 0.3)).lerp(new THREE.Color("#121a33"), Math.max(0, 1 - day / 0.3));
    this.renderer.toneMappingExposure = lerp(1.05, 1.0, night);
    const lampsOn = THREE.MathUtils.clamp((0.45 - day) / 0.3, 0, 1);
    for (const l of this.lamps) l.intensity = lampsOn * l.userData.i;
    const winOn = THREE.MathUtils.clamp((0.55 - day) / 0.35, 0, 1);
    for (const lk of this.looks) lk.uWin.value = winOn;
    this.bulbs.color.set("#8a8478").lerp(new THREE.Color("#ffd29a").multiplyScalar(2.4), lampsOn);
    this.signMat.emissiveIntensity = 0.1 + 1.6 * lampsOn;
    for (const m of this.lanterns) m.emissiveIntensity = 0.3 + 2.2 * lampsOn;
    this.coinMat.emissiveIntensity = 0.35 + 0.5 * night;
    this.bloom.strength = 0.16 + 0.34 * night;
    const close = THREE.MathUtils.clamp(1 - (pose.dist - 10) / 70, 0, 1);
    for (const p of [this.tsH, this.tsV]) {
      p.uniforms.uBand.value = 0.26 - 0.08 * close;
      p.uniforms.uAmt.value = 0.25 + 0.55 * close;
    }
    this.grade.uniforms.uT.value = t;
    this.grade.uniforms.uNight.value = night;

    // ---------- the wave: towers rise with money poured into houses, dim when it ebbs; then the new towers
    const y = yearAt(t);
    let cum = 0;
    let tot = 0;
    for (let yy = 1998; yy <= 2021; yy++) {
      const s = salesAt(yy);
      tot += s;
      if (yy <= y) cum += s * Math.min(1, y - yy + 1);
    }
    const riseK = t < T.wave ? 0.12 : 0.12 + 0.88 * Math.min(1, cum / tot);
    const ebb = ramp(t, RIVER.hold, RIVER.b);
    this.dev.forEach((d, i) => {
      d.o.scale.set(d.base, d.base * Math.max(0.05, riseK * d.k * 1.25), d.base);
      d.look.uDim.value = 0.45 * ebb;
      d.look.uWin.value = Math.max(d.look.uWin.value, 0.6 * (t > T.wave && t < RIVER.peak + 1 ? 1 : 0) * (i % 2));
    });
    this.tech.forEach((tw, i) => {
      const r = ramp(t, TECH.a + i * 0.6, TECH.a + 4 + i * 0.6);
      tw.o.scale.set(3.2, Math.max(0.05, 3.2 * tw.h * r), 3.2);
      tw.o.visible = r > 0.001;
    });

    // ---------- the note: on the table, handed to the boss, then it becomes coins
    {
      const showA = t < T.c1 + 4.2;
      const showB = t > T.c9 + 0.2 && t < T.c9 + 4.6;
      this.bill.visible = showA || showB;
      if (this.bill.visible) {
        const t0 = showA ? 0 : T.c9;
        const hand = ramp(t, t0 + (showA ? 7.6 : 1.6), t0 + (showA ? 9.0 : 2.8));
        const gone = showA ? ramp(t, T.c1 + 3.2, T.c1 + 4.1) : ramp(t, T.c9 + 3.6, T.c9 + 4.5);
        const a = new THREE.Vector3(-0.6, 0.8, 5.6);
        const b = new THREE.Vector3(2.2, 1.0, 4.3);
        const p = a.clone().lerp(b, hand);
        p.y += Math.sin(hand * Math.PI) * 0.6;
        this.bill.position.copy(p);
        this.bill.rotation.set(-Math.PI / 2 + Math.sin(hand * Math.PI) * 0.5, 0, 0.25 + hand * 0.4);
        this.bill.scale.setScalar(1 + gone * 0.4);
        (this.bill.material as THREE.MeshStandardMaterial).opacity = 1 - gone;
      }
    }

    // ---------- coins: piles, then coins in flight
    let ci = 0;
    for (const p of this.piles) {
      const sc = win(t, p.w.a, p.w.b, 0.25, 0.7);
      if (sc <= 0) continue;
      const n = this.pileCount(p, t);
      const at = nodePos(p.w.node);
      const far = Math.max(p.w.size ?? 1, this.camera.position.distanceTo(this.P.set(at[0], at[1], at[2])) * 0.018);
      ci = this.stack(ci, at, n, far, p.w.per ?? 14, sc);
    }
    const cam = this.camera.position;
    for (const f of this.flows) {
      const last = f.dep.length ? f.dep[f.dep.length - 1] + f.dur : 0;
      if (f.trail) {
        const u = f.trail.material as THREE.ShaderMaterial;
        const head = f.dep.length ? THREE.MathUtils.clamp((t - f.dep[0]) / f.dur, 0, 1) : 0;
        u.uniforms.uHead.value = 0.5 - 0.5 * Math.cos(Math.PI * head) + 0.02;
        u.uniforms.uK.value = t < f.dep[0] ? 0 : 1 - ramp(t, last + 0.4, last + 1.6);
        u.uniforms.uNight.value = night;
        f.trail.visible = u.uniforms.uK.value > 0.002;
      }
      if (!f.dep.length || t < f.dep[0] || t > last) continue;
      // binary search the first coin still in the air
      let lo = 0;
      let hi = f.dep.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (f.dep[m] + f.dur < t) lo = m + 1;
        else hi = m;
      }
      for (let i = lo; i < f.dep.length && f.dep[i] <= t && ci < 6000; i++) {
        const s = (t - f.dep[i]) / f.dur;
        const u = 0.5 - 0.5 * Math.cos(Math.PI * s);
        f.curve.getPoint(u, this.P);
        // stand the coin up and turn it toward the camera, with a slow gentle wobble (never edge-on)
        const yaw = Math.atan2(cam.x - this.P.x, cam.z - this.P.z) + Math.sin(f.dep[i] * 7 + t * 2.2) * 0.45;
        this.E.set(Math.PI / 2, 0, 0, "YXZ");
        this.E.y = yaw;
        this.Q.setFromEuler(this.E);
        const pop = Math.min(1, s * 8, (1 - s) * 8 + 0.35);
        const far = Math.max(f.size, cam.distanceTo(this.P) * 0.03);
        this.S.setScalar(far * Math.max(0.35, pop));
        this.M.compose(this.P, this.Q, this.S);
        this.coins.setMatrixAt(ci, this.M);
        this.coins.setColorAt(ci, f.col);
        ci++;
      }
    }
    this.coins.count = ci;
    this.coins.instanceMatrix.needsUpdate = true;
    if (this.coins.instanceColor) this.coins.instanceColor.needsUpdate = true;

    for (const p of this.people) p.mixer.setTime(t + p.obj.position.x * 0.13);
    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let inst_: Town | null = null;
export const town = () => (inst_ ??= new Town());
export { W, H };
