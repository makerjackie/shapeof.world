// v17 studio: a dark photo studio with a mirror floor. The Three-Body books stand in a key light, the prices are
// beams of light laid on the floor from the books' feet (length = price), and a gold price tag can come down on a
// string. Rendering is synchronous (Studio.tsx calls render inside a layout effect, then gl.finish), so every
// Remotion frame is complete when it is captured. Everything random is hashed, so parallel tabs draw the same.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FONT, MONO, SERIF } from "../v10/theme";

export const W = 1920;
export const H = 1080;

const hash = (a: number, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1440670441);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// ---------- camera, shared with the DOM overlay so labels can sit on the 3D scene ----------

export type Cam = { pos: [number, number, number]; target: [number, number, number]; fov: number };
const camMath = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
export const setCamera = (cam: THREE.PerspectiveCamera, c: Cam) => {
  cam.fov = c.fov;
  cam.aspect = W / H;
  cam.position.set(...c.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...c.target));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
};
/** screen position (px) of a world point under camera c; z > 1 means behind the camera */
export const project = (c: Cam, p: [number, number, number]) => {
  setCamera(camMath, c);
  const v = new THREE.Vector3(...p).project(camMath);
  return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1 };
};

// ---------- the scene's layout ----------

export const BOOKS = [
  { title: "三体", sub: "", t: 0.42, h: 2.3, d: 1.55, rot: 0.035 },
  { title: "三体", sub: "Ⅱ 黑暗森林", t: 0.55, h: 2.38, d: 1.6, rot: -0.02 },
  { title: "三体", sub: "Ⅲ 死神永生", t: 0.62, h: 2.42, d: 1.62, rot: 0.045 },
];
const GAP = 0.03;
const SHELF_W = BOOKS.reduce((s, b) => s + b.t, 0) + GAP * 2;
export const bookX = (i: number) => -SHELF_W / 2 + BOOKS.slice(0, i).reduce((s, b) => s + b.t + GAP, 0) + BOOKS[i].t / 2;

/** beams start at the books' right foot and run along +x; one row per model, in front of the books */
export const BEAM_X0 = SHELF_W / 2 + 0.25;
export const beamZ = (row: number) => 0.55 + row * 0.75;
export const BEAM_UNIT = 0.2; // world units per dollar of list price ($50 → 10 units)

export type BeamState = { len: number; level: number; color: string; row: number };
export type StudioState = {
  cam: Cam;
  time: number;
  books: number; // 0..1 visibility
  key: number; // key light gain
  rim: number;
  beams: BeamState[];
  tag?: { y: number; rotY: number; swing: number; on: number; light: number; x: number; z: number };
  bloom?: number;
  exposure?: number;
  env?: number; // environment (reflections) gain
};

// ---------- textures ----------

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const speckle = (g: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number, rgb: string, a: number) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb},${hash(seed, i, 1) * a})`;
    g.fillRect(hash(seed, i, 2) * w, hash(seed, i, 3) * h, 1 + hash(seed, i, 4) * 1.5, 1 + hash(seed, i, 5) * 1.5);
  }
};

const spineTex = (b: (typeof BOOKS)[number], i: number) => {
  const w = 256;
  const h = Math.round((w * b.h) / b.t);
  return canvasTex(w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "#110d0a");
    grd.addColorStop(0.3, "#2a2118");
    grd.addColorStop(0.55, "#33291e");
    grd.addColorStop(1, "#100c09");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 11 + i, 12000, "255,228,186", 0.035);
    g.fillStyle = "#c9a25c";
    for (const y of [0.05, 0.062, 0.938, 0.95]) g.fillRect(26, h * y, w - 52, 5);
    g.fillStyle = "#b8944f";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `700 ${Math.round(w * 0.62)}px ${SERIF}`;
    [...b.title].forEach((ch, k) => g.fillText(ch, w / 2, h * 0.17 + k * w * 0.72));
    if (b.sub) {
      g.font = `700 ${Math.round(w * 0.22)}px ${SERIF}`;
      g.fillStyle = "#a88a52";
      [...b.sub].forEach((ch, k) => g.fillText(ch, w / 2, h * 0.43 + k * w * 0.27));
    }
    g.font = `700 ${Math.round(w * 0.12)}px ${FONT}`;
    g.fillStyle = "rgba(201,165,101,0.7)";
    g.fillText("刘慈欣", w / 2, h * 0.88);
  });
};
const coverTex = (b: (typeof BOOKS)[number], i: number) =>
  canvasTex(512, Math.round((512 * b.h) / b.d), (g) => {
    const h = Math.round((512 * b.h) / b.d);
    g.fillStyle = "#16120e";
    g.fillRect(0, 0, 512, h);
    speckle(g, 512, h, 21 + i, 20000, "255,228,186", 0.03);
    g.fillStyle = "rgba(201,165,101,0.18)";
    g.font = `700 220px ${SERIF}`;
    g.textAlign = "center";
    g.fillText("三体", 256, h * 0.45);
  });
const pagesTex = canvasTex.bind(null, 64, 512, (g) => {
  g.fillStyle = "#d8ccb4";
  g.fillRect(0, 0, 64, 512);
  for (let y = 0; y < 512; y += 2) {
    g.fillStyle = `rgba(90,70,40,${0.08 + hash(y, 7) * 0.1})`;
    g.fillRect(0, y, 64, 1);
  }
});

const tagTex = () =>
  canvasTex(1024, 1408, (g) => {
    const grd = g.createLinearGradient(0, 0, 1024, 1408);
    grd.addColorStop(0, "#f6d98c");
    grd.addColorStop(0.45, "#d6a64b");
    grd.addColorStop(1, "#9c7027");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 1408);
    speckle(g, 1024, 1408, 31, 16000, "255,255,255", 0.05);
    // eyelet
    g.fillStyle = "#3a2a12";
    g.beginPath();
    g.arc(512, 150, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#f8e2a6";
    g.lineWidth = 18;
    g.beginPath();
    g.arc(512, 150, 72, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#1c1408";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.font = `700 330px ${MONO}`;
    g.fillText("$200", 512, 760);
    g.font = `900 150px ${FONT}`;
    g.fillText("每 月", 512, 1010);
    g.font = `700 64px ${FONT}`;
    g.fillStyle = "rgba(28,20,8,0.7)";
    g.fillText("约 1,344 元", 512, 1200);
  });

// ---------- shaders ----------

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uLen;
uniform float uTime;
uniform float uLevel;
varying vec2 vUv;
varying vec3 vPos;
void main() {
  float u = clamp(vPos.x, 0.0, 1.0);           // 0 at the start, 1 at the tip
  float d = u * uLen;                            // distance along the beam, world units
  float streak = 0.5 + 0.5 * sin(d * 9.0 - uTime * 7.0);
  streak = pow(max(streak, 0.0), 6.0);
  vec3 c = uColor * (0.35 + 1.5 * u * u + 0.6 * streak);
  c = mix(c, vec3(1.0), smoothstep(0.82, 1.0, u) * 0.85);
  c *= 2.2 * uLevel;
  if (any(isnan(c))) c = vec3(0.0);
  gl_FragColor = vec4(c, 1.0);
}`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uLevel;
varying vec2 vUv;
void main() {
  float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
  float along = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
  float a = pow(max(across, 0.0), 2.5) * (0.3 + 0.7 * vUv.x) * along * uLevel;
  vec3 c = uColor * a * 0.9;
  if (any(isnan(c))) c = vec3(0.0);
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------- the engine ----------

export type Studio = { canvas: HTMLCanvasElement; ready: Promise<void>; render: (s: StudioState) => void };

const createStudio = (): Studio => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040507");
  scene.fog = new THREE.FogExp2("#040507", 0.06);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  // mirror floor, dimmed by a dark glossy sheet on top, plus a sheet that only catches shadows
  const mirror = new Reflector(new THREE.PlaneGeometry(80, 80), { textureWidth: W / 2, textureHeight: H / 2, color: 0x2e3036 });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: "#07080b", roughness: 0.55, metalness: 0, transparent: true, opacity: 0.94, envMapIntensity: 0.3 }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.002;
  scene.add(sheet);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  shadow.receiveShadow = true;
  scene.add(shadow);

  // lights
  const amb = new THREE.AmbientLight("#5a6478", 0.06);
  scene.add(amb);
  const key = new THREE.SpotLight("#ffdcb0", 70, 0, 0.42, 0.85, 1.4);
  key.position.set(-3.2, 7.5, 5.5);
  key.target.position.set(0, 1.0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight("#8fb2ff", 60, 0, 0.5, 0.9, 1.4);
  rim.position.set(2.5, 6, -5);
  rim.target.position.set(0, 1.2, 0);
  scene.add(rim, rim.target);
  const tagLight = new THREE.SpotLight("#fff1d0", 0, 0, 0.32, 0.8, 1.2);
  scene.add(tagLight, tagLight.target);

  // books, built once the fonts for their lettering are in
  const books = new THREE.Group();
  scene.add(books);
  const pages = pagesTex();
  const buildBooks = () => {
    BOOKS.forEach((b, i) => {
      const side = new THREE.MeshStandardMaterial({ map: coverTex(b, i), roughness: 0.75, metalness: 0, envMapIntensity: 0.2 });
      const spine = new THREE.MeshStandardMaterial({ map: spineTex(b, i), roughness: 0.55, metalness: 0.05, envMapIntensity: 0.35 });
      const page = new THREE.MeshStandardMaterial({ map: pages, roughness: 0.9, metalness: 0, envMapIntensity: 0.1 });
      // box faces: +x, -x, +y, -y, +z (spine, towards the camera), -z
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.t, b.h, b.d), [side, side, page, page, spine, page]);
      m.position.set(bookX(i), b.h / 2, 0);
      m.rotation.y = b.rot;
      m.castShadow = true;
      m.receiveShadow = true;
      books.add(m);
    });
  };

  // beams: a unit box from x = 0 to 1, scaled to the length; a glow on the floor under each
  const beamGeo = new THREE.BoxGeometry(1, 0.045, 0.13);
  beamGeo.translate(0.5, 0.0225, 0);
  const glowGeo = new THREE.PlaneGeometry(1, 0.9);
  glowGeo.translate(0.5, 0, 0);
  const beams = Array.from({ length: 5 }, () => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uColor: { value: new THREE.Color() }, uLen: { value: 1 }, uTime: { value: 0 }, uLevel: { value: 1 } },
    });
    const beam = new THREE.Mesh(beamGeo, mat);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color() }, uLevel: { value: 1 } },
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4) }));
    scene.add(beam, glow, tip);
    return { beam, glow, tip, mat, glowMat };
  });

  // the price tag on its string
  let tag: THREE.Group | null = null;
  const buildTag = () => {
    tag = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: "#d9a94e", metalness: 1, roughness: 0.28, envMapIntensity: 1.4 });
    const face = new THREE.MeshStandardMaterial({ map: tagTex(), metalness: 0.75, roughness: 0.32, envMapIntensity: 1.2 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.035), [gold, gold, gold, gold, face, face]);
    card.position.y = -1.1; // hangs from its top edge
    card.castShadow = true;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 12, 6), new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 0.6 }));
    string.position.y = 6 - 0.2;
    tag.add(card, string);
    scene.add(tag);
  };

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const glyphs = "三体Ⅱ黑暗森林Ⅲ死神永生刘慈欣每月约1,344元$200";
  const ready = Promise.all([
    document.fonts.load(`700 150px ${SERIF}`, glyphs),
    document.fonts.load(`700 60px ${FONT}`, glyphs),
    document.fonts.load(`900 150px ${FONT}`, glyphs),
    document.fonts.load(`700 330px ${MONO}`, "$0123456789"),
  ])
    .catch(() => undefined)
    .then(() => {
      buildBooks();
      buildTag();
    });

  const render = (s: StudioState) => {
    setCamera(camera, s.cam);
    books.visible = s.books > 0.001;
    books.children.forEach((m) => {
      ((m as THREE.Mesh).material as THREE.MeshStandardMaterial[]).forEach((mat) => {
        mat.transparent = s.books < 0.999;
        mat.opacity = s.books;
      });
    });
    key.intensity = 70 * s.key;
    rim.intensity = 60 * s.rim;
    amb.intensity = 0.06 * Math.max(s.key, 0.25);
    scene.environmentIntensity = s.env ?? 1;
    s.beams.forEach((b, i) => {
      const o = beams[i];
      const len = Math.max(0.001, b.len);
      const vis = b.level > 0.002 && b.len > 0.002;
      o.beam.visible = o.glow.visible = o.tip.visible = vis;
      const z = beamZ(b.row);
      o.beam.position.set(BEAM_X0, 0.004, z);
      o.beam.scale.set(len, 1, 1);
      o.mat.uniforms.uColor.value.set(b.color);
      o.mat.uniforms.uLen.value = len;
      o.mat.uniforms.uTime.value = s.time;
      o.mat.uniforms.uLevel.value = b.level;
      o.glow.position.set(BEAM_X0, 0.006, z);
      o.glow.scale.set(len, 1, 1);
      o.glowMat.uniforms.uColor.value.set(b.color);
      o.glowMat.uniforms.uLevel.value = b.level;
      o.tip.position.set(BEAM_X0 + len, 0.03, z);
      (o.tip.material as THREE.MeshBasicMaterial).color.setScalar(4 * b.level);
    });
    if (tag) {
      const tg = s.tag;
      tag.visible = !!tg && tg.on > 0.001;
      if (tg) {
        tag.position.set(tg.x, tg.y, tg.z);
        tag.rotation.set(0, tg.rotY, tg.swing);
        tagLight.intensity = 120 * tg.light;
        tagLight.position.set(tg.x - 1.5, tg.y + 6, tg.z + 4);
        tagLight.target.position.set(tg.x, tg.y - 1.1, tg.z);
      }
    }
    bloom.strength = s.bloom ?? 0.7;
    renderer.toneMappingExposure = s.exposure ?? 1;
    composer.render();
    renderer.getContext().finish();
  };

  return { canvas, ready, render };
};

let STUDIO: Studio | null = null;
export const studio = () => {
  if (!STUDIO) STUDIO = createStudio();
  return STUDIO;
};
