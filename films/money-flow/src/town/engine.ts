// The town in three.js, rendered synchronously per frame: render(t) sets every animated value from film time t.
// Night, a miniature town of 100 households; money is glowing gold liquid in glass tanks and light running in pipes.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { applyPose, H, poseAt, W } from "./camera";
import { BANK, DEV, DEV_TOWERS, GOV, HOUSES, House, HUB, PIPES, SHACKS, SHANTY, SPINE_X, TOWER, TRUNKS, housePath, tankBase, tankTop } from "./layout";
import { T } from "../timing";
import { circulation, houseAt, machineryAt } from "./sim";
import { scene as sceneAt, SceneState } from "./state";

const GOLD = new THREE.Color("#ffb53d");
const GOLD_HI = new THREE.Color("#ffe2a0");
const RED = new THREE.Color("#ff3b2f");

// ---------------------------------------------------------------- textures
function windowTex(cols: number, rows: number, lit: number, seed: number, warm = "#ffcf8a") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 256);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const cw = 256 / cols;
  const rh = 256 / rows;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (r() > lit) continue;
      const b = 0.55 + r() * 0.45;
      g.globalAlpha = b;
      g.fillStyle = r() < 0.15 ? "#bcd6ff" : warm;
      g.fillRect(x * cw + cw * 0.28, y * rh + rh * 0.25, cw * 0.44, rh * 0.48);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- shaders
const flowMat = (radius: number, len: number, base = "#2a3446") =>
  new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uK: { value: 0 },
      uDir: { value: 1 },
      uLen: { value: len },
      uCol: { value: GOLD.clone() },
      uBase: { value: new THREE.Color(base) },
      uDash: { value: 1.6 + radius * 4 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uK, uDir, uLen, uDash; uniform vec3 uCol, uBase;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float s = vUv.x * uLen;
        float ph = fract((s - uDir * uT * 7.0) / uDash);
        float dash = smoothstep(0.0, 0.18, ph) * smoothstep(0.7, 0.35, ph);
        float rim = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.0);
        vec3 c = uBase * (0.9 + 0.8 * rim) + uCol * uK * (0.3 + 1.7 * dash);
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
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uRed, uHi; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        float rim = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
        vec3 c = mix(vec3(0.55, 0.7, 0.9), vec3(1.0, 0.18, 0.12), uRed);
        float a = 0.03 + 0.32 * rim + 0.3 * uRed * (1.0 - vY);
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
        vec3 gold = vec3(1.0, 0.62, 0.16);
        vec3 c = gold * (0.42 + 0.5 * rim);
        c += vec3(1.0, 0.7, 0.3) * smoothstep(uLevel - 0.06, uLevel, vY) * 0.45;
        if (uBands > 0.0) {
          float f = vY / max(uLevel, 0.001);
          vec3 b = f < 0.17 ? vec3(0.45, 0.75, 1.0) : f < 0.58 ? vec3(1.0, 0.62, 0.16) : f < 0.78 ? vec3(1.0, 0.42, 0.25) : f < 0.95 ? vec3(0.95, 0.85, 0.55) : vec3(0.6, 0.6, 0.6);
          float edge = 1.0 - smoothstep(0.0, 0.012, min(abs(f - 0.17), min(abs(f - 0.58), min(abs(f - 0.78), abs(f - 0.95)))));
          c = mix(c, b * (0.45 + 0.45 * rim) + edge * 0.35, uBands);
        }
        gl_FragColor = vec4(c * uTint * (1.0 + 0.7 * uHi), 0.95);
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
const tube = (pts: THREE.Vector3[], r: number, base?: string) => {
  const c = new Poly(pts);
  const seg = Math.max(8, Math.ceil(c.len * 3) + pts.length * 6);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8, false), flowMat(r, c.len, base));
  return { mesh: m, curve: c };
};

type HouseObj = { grp: THREE.Group; h: House; liquid: THREE.Mesh; glass: THREE.Mesh; ring: THREE.Mesh; pipe: ReturnType<typeof tube>; body: THREE.Mesh; mail: THREE.Mesh; surface: THREE.Mesh; spill: Poly[] };

class Town {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 900);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  houses: HouseObj[] = [];
  pipes: Record<string, ReturnType<typeof tube>> = {};
  trunks: ReturnType<typeof tube>[] = [];
  shacks: THREE.Group[] = [];
  devTowers: THREE.Mesh[] = [];
  devMats: THREE.MeshStandardMaterial[] = [];
  torrent!: THREE.Points;
  column!: THREE.Mesh;
  coins!: THREE.Points;
  coinPos!: Float32Array;
  coinCol!: Float32Array;
  towerCrown!: THREE.Mesh;
  hubGlow!: THREE.Mesh;
  hubMat!: THREE.MeshStandardMaterial;
  shantyGold: THREE.Mesh[] = [];
  bldMats: THREE.MeshStandardMaterial[] = [];
  ground!: THREE.MeshStandardMaterial;
  isReady = true;
  ready = Promise.resolve();

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
    this.scene.background = new THREE.Color("#0a1322");
    this.scene.fog = new THREE.FogExp2("#132033", 0.0042);
    this.build();
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  std(color: string, emissive?: THREE.Texture, ei = 1.0, rough = 0.85) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05, emissive: emissive ? new THREE.Color("#ffffff") : new THREE.Color("#000"), emissiveMap: emissive ?? null, emissiveIntensity: ei });
    this.bldMats.push(m);
    return m;
  }

  build() {
    const S = this.scene;
    S.add(new THREE.HemisphereLight("#7d97cf", "#1a1f2b", 1.5));
    const moon = new THREE.DirectionalLight("#b4c6f0", 1.5);
    moon.position.set(-60, 90, 40);
    S.add(moon);
    const warm = new THREE.PointLight("#ffb35a", 60, 120, 1.6);
    warm.position.set(HUB.x, 14, HUB.z);
    S.add(warm);

    // sky: a dome, deep navy overhead to a faint blue haze at the horizon
    {
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(600, 32, 16),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
          vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y / 600.0, 0.0, 1.0); vec3 c = mix(vec3(0.075,0.12,0.2), vec3(0.02,0.035,0.07), pow(h, 0.45)); gl_FragColor = vec4(c, 1.0); }`,
        }),
      );
      S.add(sky);
    }
    // ground, streets, terraces
    this.ground = new THREE.MeshStandardMaterial({ color: "#182234", roughness: 1 });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), this.ground);
    g.rotation.x = -Math.PI / 2;
    S.add(g);
    const streetM = new THREE.MeshStandardMaterial({ color: "#26303f", roughness: 0.9 });
    const strip = (x0: number, z0: number, x1: number, z1: number, w = 1.6) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), streetM);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
      m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2);
      S.add(m);
    };
    TRUNKS.forEach((p) => strip(p[0].x, p[0].z, p[1].x, p[1].z, 2.2));
    const terr = (y: number, z0: number, z1: number, col: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(80, y, z1 - z0), new THREE.MeshStandardMaterial({ color: col, roughness: 1 }));
      m.position.set(34, y / 2, (z0 + z1) / 2);
      S.add(m);
    };
    terr(3.2, -42, -25.5, "#1d2738");
    terr(1.3, -25.5, -15.2, "#1b2535");
    terr(0.5, -15.2, -7, "#1a2333");

    // street lamps along the trunks
    const lampGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: "#ffd9a0" });
    for (const p of TRUNKS) {
      const len = p[0].distanceTo(p[1]);
      for (let d = 3; d < len; d += 9) {
        const q = p[0].clone().lerp(p[1], d / len);
        const l = new THREE.Mesh(lampGeo, lampMat);
        l.position.set(q.x + 1.4, 2.4, q.z + 1.2);
        S.add(l);
      }
    }

    // ---------- houses
    const tex = {
      mansion: [windowTex(8, 3, 0.8, 11), windowTex(8, 3, 0.75, 12)],
      villa: [windowTex(5, 2, 0.6, 21), windowTex(5, 2, 0.7, 22)],
      house: [windowTex(4, 2, 0.55, 31), windowTex(4, 2, 0.6, 32)],
      small: [windowTex(3, 2, 0.5, 41), windowTex(3, 2, 0.6, 42), windowTex(3, 2, 0.35, 43)],
    };
    for (const h of HOUSES) {
      const grp = new THREE.Group();
      const ts = tex[h.kind];
      const bm = this.std(h.kind === "mansion" ? "#69707f" : h.kind === "small" ? "#4b5160" : "#5a6070", ts[h.rank % ts.length], h.kind === "mansion" ? 1.25 : 0.9);
      const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), bm);
      body.position.set(h.x, h.y + h.h / 2, h.z);
      grp.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(h.w, h.d) / 2 * 0.98, h.h * 0.32, 4), this.std(h.kind === "mansion" ? "#7a5646" : "#5a4a48"));
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, h.d / h.w);
      roof.position.set(h.x, h.y + h.h + h.h * 0.16, h.z);
      grp.add(roof);
      if (h.kind === "mansion") {
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ color: "#2fb8d8" }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(h.x - 1.2, h.y + 0.05, h.z + h.d / 2 + 2.4);
        grp.add(pool);
        const car = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.9), this.std("#7c1c22", undefined, 1, 0.3));
        car.position.set(h.x + 2.6, h.y + 0.3, h.z + h.d / 2 + 2.0);
        grp.add(car);
      }
      if (h.kind === "small" && h.rank === 77) {
        // a delivery rider's e-bike at the door
        const bike = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.25), this.std("#f2c230", undefined, 1, 0.5));
        bike.position.set(h.x - 0.8, 0.35, h.z + h.d / 2 + 0.7);
        grp.add(bike);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), this.std("#f2c230", undefined, 1, 0.5));
        box.position.set(h.x - 1.1, 0.8, h.z + h.d / 2 + 0.7);
        grp.add(box);
      }
      // tank on legs
      const tb = tankBase(h);
      const legM = this.std("#1d222c");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4 + h.h * 0.12), legM);
        leg.position.set(tb.x + dx * h.tankR * 0.6, h.y + h.h + (0.4 + h.h * 0.12) / 2 - 0.05, tb.z + dz * h.tankR * 0.6);
        grp.add(leg);
      }
      const lg = new THREE.CylinderGeometry(h.tankR * 0.94, h.tankR * 0.94, 1, 28, 1, false);
      lg.translate(0, 0.5, 0);
      const liquid = new THREE.Mesh(lg, liquidMat());
      liquid.scale.set(1, h.tankH, 1);
      liquid.position.copy(tb);
      grp.add(liquid);
      const surface = new THREE.Mesh(new THREE.CircleGeometry(h.tankR * 0.93, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffc76a").multiplyScalar(0.8), transparent: true, opacity: 0.9 }));
      surface.rotation.x = -Math.PI / 2;
      grp.add(surface);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(h.tankR, h.tankR, h.tankH, 28, 1, true), glassMat());
      glass.position.set(tb.x, tb.y + h.tankH / 2, tb.z);
      grp.add(glass);
      const capM = this.std("#2a303c");
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(h.tankR * 1.04, h.tankR * 1.04, 0.08, 28), capM);
      cap.position.set(tb.x, tb.y + h.tankH, tb.z);
      grp.add(cap);
      const bot = cap.clone();
      bot.position.y = tb.y;
      grp.add(bot);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h.tankR * 1.08, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: RED }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(tb.x, tb.y + 0.05, tb.z);
      grp.add(ring);
      const mail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), new THREE.MeshBasicMaterial({ color: "#d9e6ff" }));
      mail.position.set(h.x - h.w * 0.3, 0.9 + h.y, h.street - 0.9);
      mail.visible = false;
      grp.add(mail);
      const pipe = tube(housePath(h), h.kind === "mansion" ? 0.13 : 0.075);
      grp.add(pipe.mesh);
      S.add(grp);
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
      // re-base the group on the house so it can grow in place (pipe stays outside the group)
      grp.remove(pipe.mesh);
      S.add(pipe.mesh);
      const base = new THREE.Vector3(h.x, h.y, h.z);
      grp.children.forEach((c) => c.position.sub(base));
      grp.position.copy(base);
      this.houses.push({ grp, h, liquid, glass, ring, pipe, body, mail, surface, spill });
    }

    // ---------- trunks and named pipes
    TRUNKS.forEach((p) => {
      const tb = tube(p, 0.16);
      this.trunks.push(tb);
      S.add(tb.mesh);
    });
    for (const [k, p] of Object.entries(PIPES)) {
      const tb = tube(p, 0.24);
      this.pipes[k] = tb;
      S.add(tb.mesh);
    }

    // ---------- central bank tower
    const towerM = this.std("#3a4152", windowTex(4, 16, 0.55, 51, "#cfe0ff"), 0.9, 0.5);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(5, 26, 5), towerM);
    tw.position.set(TOWER.x, 13, TOWER.z);
    S.add(tw);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true }));
    crown.position.set(TOWER.x, 27.2, TOWER.z);
    S.add(crown);
    this.towerCrown = crown;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 4), this.std("#596276"));
    spire.position.set(TOWER.x, 29.5, TOWER.z);
    S.add(spire);

    // bank: a classical block with columns
    const bankM = this.std("#424a5c", windowTex(6, 2, 0.6, 61, "#ffe0a8"), 0.7);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 6), bankM);
    bk.position.set(BANK.x, 2.5, BANK.z);
    S.add(bk);
    const ped = new THREE.Mesh(new THREE.ConeGeometry(5.4, 1.6, 3), this.std("#4b5468"));
    ped.rotation.set(0, 0, 0);
    ped.scale.set(1, 1, 0.35);
    ped.position.set(BANK.x, 5.8, BANK.z + 2.6);
    S.add(ped);
    for (let i = 0; i < 6; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.6), this.std("#8d93a3"));
      col.position.set(BANK.x - 3.3 + i * 1.32, 2.3, BANK.z + 3.4);
      S.add(col);
    }
    // government: wide, symmetrical
    const govM = this.std("#3d4352", windowTex(10, 3, 0.65, 71, "#fff0cf"), 0.8);
    const gv = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 6), govM);
    gv.position.set(GOV.x, 2.5, GOV.z);
    S.add(gv);
    const gv2 = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 4), govM);
    gv2.position.set(GOV.x, 6.2, GOV.z);
    S.add(gv2);
    // market: factories and shops, sawtooth roof, chimney
    this.hubMat = this.std("#3b3a3f", windowTex(10, 2, 0.8, 81, "#ffc070"), 1.1);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 7), this.hubMat);
    hb.position.set(HUB.x, 2, HUB.z);
    S.add(hb);
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.6, 3), this.std("#4a4448"));
      tooth.rotation.z = Math.PI / 2;
      tooth.scale.set(1, 1, 2.2);
      tooth.position.set(HUB.x - 3.75 + i * 2.5, 4.8, HUB.z);
      S.add(tooth);
    }
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 7), this.std("#3f3a3a"));
    chim.position.set(HUB.x + 4, 5.5, HUB.z - 2.5);
    S.add(chim);
    this.hubGlow = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
    this.hubGlow.position.set(HUB.x, 4, HUB.z);
    S.add(this.hubGlow);

    // developer towers (they rise)
    DEV_TOWERS.forEach(([x, z, w, d], i) => {
      const m = this.std("#343b4b", windowTex(5, 20, 0.5, 91 + i, "#ffd8a0"), 0.0, 0.6);
      this.devMats.push(m);
      const geo = new THREE.BoxGeometry(w, 1, d);
      geo.translate(0, 0.5, 0);
      const t = new THREE.Mesh(geo, m);
      t.position.set(x, 0, z);
      S.add(t);
      this.devTowers.push(t);
    });

    // shanty area: low grey shacks with tilted roofs; a gold glow when compensation arrives
    for (const s of SHACKS) {
      const grp = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), this.std("#2b2a29", windowTex(2, 1, 0.5, Math.floor(s.x * 10), "#ffb870"), 0.5));
      b.position.y = s.h / 2;
      grp.add(b);
      const r = new THREE.Mesh(new THREE.BoxGeometry(s.w * 1.1, 0.12, s.d * 1.15), this.std("#3a3330"));
      r.position.y = s.h + 0.1;
      r.rotation.z = s.r;
      grp.add(r);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
      gl.position.y = s.h + 0.8;
      grp.add(gl);
      this.shantyGold.push(gl);
      grp.position.set(s.x, 0, s.z);
      S.add(grp);
      this.shacks.push(grp);
    }

    // torrent: gold falling from the sky into the tower crown
    {
      const N = 5000;
      const seed = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        seed[i * 3] = Math.random();
        seed[i * 3 + 1] = Math.random();
        seed[i * 3 + 2] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      geo.setAttribute("seed", new THREE.BufferAttribute(seed, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uK: { value: 0 }, uC: { value: new THREE.Vector3(TOWER.x, 28, TOWER.z) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 seed; uniform float uT, uK; uniform vec3 uC; varying float vA;
          void main(){
            float h = 70.0; float y = fract(seed.y - uT * (0.35 + seed.z * 0.25));
            float r = (0.15 + 1.3 * seed.x * seed.x) * (0.5 + 0.5 * y);
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
      // a glowing core column under the falling gold
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
            void main(){ float edge = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.5); float s = 0.75 + 0.25 * sin(vUv.y * 40.0 + uT * 18.0);
              float fade = smoothstep(0.0, 0.12, vUv.y) * (0.55 + 0.45 * (1.0 - vUv.y));
              gl_FragColor = vec4(vec3(1.0, 0.6, 0.18) * uK * edge * s * fade * 0.42, 1.0); }`,
        }),
      );
      col.position.set(TOWER.x, 28 + 35, TOWER.z);
      S.add(col);
      this.column = col;
      this.torrent = new THREE.Points(geo, mat);
      this.torrent.frustumCulled = false;
      S.add(this.torrent);
    }

    // coins: moving dots along any pipe (filled per frame)
    {
      const N = 3000;
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
          void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.15 * (260.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
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
  coinsOn(i0: number, c: Poly, n: number, k: number, t: number, dir: number, col: THREE.Color) {
    if (k <= 0.01) return i0;
    for (let j = 0; j < n && i0 < 3000; j++) {
      let u = ((j / n + (t * 6) / c.len) % 1 + 1) % 1;
      if (dir < 0) u = 1 - u;
      const p = c.getPoint(u);
      this.coinPos[i0 * 3] = p.x;
      this.coinPos[i0 * 3 + 1] = p.y + 0.35;
      this.coinPos[i0 * 3 + 2] = p.z;
      this.coinCol[i0 * 3] = col.r * k;
      this.coinCol[i0 * 3 + 1] = col.g * k;
      this.coinCol[i0 * 3 + 2] = col.b * k;
      i0++;
    }
    return i0;
  }

  render(t: number) {
    const st: SceneState = sceneAt(t);
    applyPose(this.camera, poseAt(t));
    const mc = machineryAt(t);
    const cool = st.us;

    // palette: China warm night; US cooler
    this.scene.background = new THREE.Color().lerpColors(new THREE.Color("#0a1322"), new THREE.Color("#081426"), cool);
    this.renderer.toneMappingExposure = 1.0 - 0.45 * st.dim;
    this.bloom.strength = 0.6 + 0.3 * st.glow;

    // torrent and tower crown
    const tm = this.torrent.material as THREE.ShaderMaterial;
    tm.uniforms.uT.value = t;
    tm.uniforms.uK.value = mc.torrent;
    const cm = this.column.material as THREE.ShaderMaterial;
    cm.uniforms.uK.value = mc.torrent;
    cm.uniforms.uT.value = t;
    (this.towerCrown.material as THREE.MeshBasicMaterial).color.copy(GOLD).multiplyScalar(0.35 + 1.4 * Math.max(mc.torrent, st.towerHi));

    // shanty: gold arrives, then the shacks sink away
    this.shacks.forEach((s, i) => {
      const k = Math.max(0, Math.min(1, mc.demolish * 1.6 - (i % 5) * 0.12));
      s.position.y = -k * 3;
      s.visible = k < 0.99;
      (this.shantyGold[i].material as THREE.MeshBasicMaterial).opacity = mc.shantyGold * (0.7 + 0.3 * Math.sin(t * 3 + i));
    });
    // developer towers: rise in chapter 2, again in chapter 7 (prices), and as Wall Street in chapter 9
    this.devTowers.forEach((m, i) => {
      const base = [9, 12, 8, 11, 7][i];
      const h = base * (0.25 + 0.75 * mc.devRise) * (1 + 0.6 * st.assetRise) * (1 + 1.6 * st.stockRise);
      m.scale.y = Math.max(0.1, h);
      this.devMats[i].emissiveIntensity = 0.25 + 0.75 * mc.devRise + 0.6 * st.assetRise + 0.6 * st.stockRise;
      this.devMats[i].color.set(st.stockRise > 0.01 ? "#2d3a52" : "#343b4b");
    });
    // market glow (prices in 2022)
    (this.hubGlow.material as THREE.MeshBasicMaterial).opacity = 0.0 + 0.5 * st.hubHot;
    this.hubMat.emissiveIntensity = 1.1 + 1.2 * st.hubHot;

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
    set("towerBank", Math.max(mc.towerBank, st.us2008));
    set("bankShanty", mc.bankShanty);
    set("shantyDev", mc.shantyDev);
    set("devGov", mc.devGov);
    set("devHub", mc.devHub);
    set("govHub", mc.govHub);
    set("hubGov", mc.hubGov * 0.7);
    set("hubSpine", Math.max(mc.hubSpine, circulation(t) * 0.8, st.checks * 0.6));
    set("spineBank", st.savingsToBank, 1);
    set("hillDev", Math.max(st.toAssets, st.us2008 * 0.0), 1);

    // trunks carry the circulation
    const circ = Math.max(circulation(t), mc.split * 0.8, st.loans * 0.8, st.checks, st.interest * 0.7, st.glow * 0.9);
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
      lm.uniforms.uBands.value = o.h.rank === 2 ? st.bands : 0;
      const gs = 1 + st.grow * (o.h.g === 0 ? 0.32 : o.h.g === 1 ? 0.1 : o.h.g === 2 ? 0.04 : 0);
      o.grp.scale.setScalar(gs);
      o.surface.visible = ov.level > 0.01;
      o.surface.position.set(o.liquid.position.x, o.liquid.position.y + ov.level * o.h.tankH, o.liquid.position.z);
      (o.surface.material as THREE.MeshBasicMaterial).opacity = 0.6 * Math.min(1, ov.level * 20) * (st.bands > 0.5 && o.h.rank === 2 ? 0.3 : 1);
      const gm = o.glass.material as THREE.ShaderMaterial;
      gm.uniforms.uRed.value = ov.red;
      gm.uniforms.uHi.value = ov.hi;
      (o.ring.material as THREE.MeshBasicMaterial).color.copy(RED).multiplyScalar(ov.red * 1.6);
      o.ring.visible = ov.red > 0.02;
      const bmat = o.body.material as THREE.MeshStandardMaterial;
      bmat.emissiveIntensity = (o.h.kind === "mansion" ? 1.25 : 0.9) * (1 - 0.7 * ov.dimHouse) + 0.8 * ov.hi;
      o.mail.visible = st.checks > 0.02;
      (o.mail.material as THREE.MeshBasicMaterial).color.setRGB(0.85 + st.checks, 0.9 + st.checks * 0.6, 1);
      const pu = (o.pipe.mesh.material as THREE.ShaderMaterial).uniforms;
      pu.uT.value = t;
      pu.uK.value = ov.flow;
      pu.uDir.value = ov.dir; // +1: tank → hub (spending), −1: into the tank
      pu.uCol.value.copy(ov.flowCol);
      if (ov.coins > 0) ci = this.coinsOn(ci, o.pipe.curve, o.h.kind === "mansion" ? 10 : 5, ov.coins, t + o.h.seed * 3, ov.coinDir, ov.flowCol);
    }
    // brimming over in the reveal and at the end of chapter 4
    const brim = Math.max(0, Math.min(1, (t - (T.c4 + 2.6)) / 0.6)) * Math.max(0, Math.min(1, (T.c4 + 9 - t) / 1.0));
    if (brim > 0) for (const o of this.houses) if (o.h.g === 0) for (const c of o.spill) ci = this.coinsOn(ci, c, 6, brim, t * 0.35 + o.h.seed, 1, GOLD_HI);
    // coins in the machinery
    ci = this.coinsOn(ci, this.pipes.towerBank.curve, 30, mc.towerBank, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.bankShanty.curve, 30, mc.bankShanty, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.shantyDev.curve, 26, mc.shantyDev, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.devGov.curve, 26, mc.devGov, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.spineBank.curve, 30, st.savingsToBank, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.hillDev.curve, 30, st.toAssets, t, 1, GOLD_HI);
    ci = this.coinsOn(ci, this.pipes.towerBank.curve, 30, st.us2008, t, 1, GOLD_HI);
    for (let i = ci; i < 3000; i++) {
      this.coinPos[i * 3 + 1] = -100;
    }
    (this.coins.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.coins.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    this.composer.render();
    this.renderer.getContext().finish();
  }
}

let inst: Town | null = null;
export const town = () => (inst ??= new Town());
export { W, H, SPINE_X, SHANTY, DEV, BANK, GOV, HUB, TOWER };
