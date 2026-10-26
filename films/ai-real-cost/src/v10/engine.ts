// The WebGL map world: the NASA night picture laid flat, a dark sky behind the horizon, and the price columns.
// Rendering is synchronous (World.tsx calls render inside a layout effect, then gl.finish), so every Remotion
// frame is complete when it is captured.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { staticFile } from "remotion";
import { Cam, H, setCamera, W } from "./camera";
import { COL_W, COLS, ColId, MAP_X0, MAP_X1, MAP_Y0, MAP_Y1 } from "./geo";

export type ColState = {
  h: number; // height, km
  ghost?: number; // height of the outline left behind after a fall, km (0 = none)
  on?: number; // 0..1 visibility (columns rise out of the ground)
  hi?: number; // 0..1 highlight
  flash?: number; // 0..1 top flash (each step of a fall)
};

export type MapState = {
  cam: Cam;
  cols: Partial<Record<ColId, ColState>>;
  lights?: number; // city lights gain
  land?: number; // land brightness
  dim?: number; // whole map
  bloom?: number;
  exposure?: number;
  time?: number;
};

const FOG = new THREE.Color("#060a14");

const GROUND_VERT = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const GROUND_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uLights;
uniform float uLand;
uniform float uDim;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vDepth;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // City lights are warm, land and ice are blue: keep the land as a faint relief and lift only the warm lights.
  float warm = clamp((c.r - c.b) * 4.0 + 0.15, 0.0, 1.0);
  float lights = smoothstep(0.05, 0.55, lum) * warm;
  vec3 land = mix(vec3(lum), c, 0.55) * uLand * vec3(0.55, 0.68, 1.0);
  vec3 col = land + vec3(1.0, 0.74, 0.42) * pow(max(lights, 0.0), 1.15) * uLights;
  // (smoothstep needs edge0 < edge1; reversed edges are undefined in GLSL and give NaN on Metal)
  float e = smoothstep(0.0, 0.07, vUv.x) * (1.0 - smoothstep(0.93, 1.0, vUv.x)) * smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
  // the picture dissolves into the haze at its edges, so the map never shows a hard border
  float f = max(smoothstep(uFogNear, uFogFar, vDepth), 1.0 - e);
  col = mix(col, uFog, f) * uDim;
  if (any(isnan(col))) col = vec3(0.0);
  gl_FragColor = vec4(col, 1.0);
}`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uFog;
uniform float uDim;
varying vec3 vDir;
void main() {
  float up = clamp(vDir.y, 0.0, 1.0);
  // below the horizon the sky is exactly the haze the map dissolves into, so the map has no visible border
  vec3 col = mix(uFog, vec3(0.0012, 0.0016, 0.0035), smoothstep(0.0, 0.3, up));
  col += vec3(0.004, 0.009, 0.022) * exp(-up * 30.0) * step(0.0001, up); // a faint band of atmosphere
  gl_FragColor = vec4(col * uDim, 1.0);
}`;

// A column: unit box (0..1 high) scaled to its footprint and height. Sides glow brighter toward the top, carry
// faint floor lines every uStep km and bright vertical edges; the top face is the brightest (it blooms).
const COL_VERT = /* glsl */ `
uniform float uH;
varying vec3 vLocal;
varying vec3 vN;
varying float vKm;
varying float vDepth;
void main() {
  vLocal = position;
  vN = normal;
  vKm = position.y * uH;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const COL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uH;
uniform float uStep;
uniform float uHi;
uniform float uFlash;
uniform float uGhost;
uniform float uOn;
uniform vec3 uFog;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vLocal;
varying vec3 vN;
varying float vKm;
varying float vDepth;
void main() {
  float isTop = step(0.5, vN.y);
  float u = abs(vN.x) > 0.5 ? vLocal.z : vLocal.x; // -0.5..0.5 across the face
  float edge = smoothstep(0.40, 0.5, abs(u));
  float g = clamp(vLocal.y, 0.0, 1.0); // pow() of a tiny negative from interpolation is NaN
  float k = vKm / uStep;
  float fk = fract(k);
  float d = min(fk, 1.0 - fk) / max(fwidth(k), 1e-4);
  float floorLine = (1.0 - clamp(d - 0.6, 0.0, 1.0)) * step(0.5, 1.0 - isTop);
  vec3 col;
  float a = 1.0;
  if (uGhost > 0.5) {
    float topEdge = isTop * smoothstep(0.40, 0.5, max(abs(vLocal.x), abs(vLocal.z)));
    float line = max(edge * (1.0 - isTop), topEdge);
    col = uColor * (0.9 * line + 0.05);
    a = (0.07 + 0.55 * line) * uOn;
  } else {
    vec3 base = uColor * (0.18 + 0.75 * pow(g, 1.6));
    col = base + uColor * edge * (0.55 + 0.6 * g) + uColor * floorLine * 0.35;
    col = mix(col, uColor * 2.6 + vec3(0.35), isTop);
    col *= 1.0 + 0.8 * uHi;
    col += vec3(1.0, 0.95, 0.85) * uFlash * (isTop * 3.0 + 0.25 * g);
    a = uOn;
  }
  float f = smoothstep(uFogNear, uFogFar, vDepth);
  col = mix(col, uFog, f * 0.85);
  if (any(isnan(col))) col = vec3(0.0); // one NaN pixel would smear into black blocks through the bloom
  gl_FragColor = vec4(col, a);
}`;

// A soft disc of light where a column meets the ground.
const SPOT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOn;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float g = exp(-r * r * 5.0) * (1.0 - smoothstep(0.85, 1.0, r));
  gl_FragColor = vec4(uColor * g * 1.4 * uOn, 1.0);
}`;
const SPOT_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export type Engine = { canvas: HTMLCanvasElement; ready: Promise<void>; render: (s: MapState) => void };

export const createEngine = (): Engine => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { width: `${W}px`, height: `${H}px`, position: "absolute", left: "0", top: "0" });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 1e7);

  const fogU = { uFog: { value: FOG.clone() }, uFogNear: { value: 1e5 }, uFogFar: { value: 2e5 } };

  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false, uniforms: { uFog: fogU.uFog, uDim: { value: 1 } } });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // Ground: the night picture, slightly larger than the texture's footprint is not needed — edges fade to fog.
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    depthWrite: false,
    uniforms: { uMap: { value: tex }, uLights: { value: 1 }, uLand: { value: 1 }, uDim: { value: 1 }, ...fogU },
  });
  const gw = MAP_X1 - MAP_X0;
  const gh = MAP_Y1 - MAP_Y0;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh).rotateX(-Math.PI / 2), groundMat);
  ground.position.set((MAP_X0 + MAP_X1) / 2, 0, -(MAP_Y0 + MAP_Y1) / 2);
  ground.renderOrder = -5;
  scene.add(ground);

  const ready = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
      resolve();
    };
    img.onerror = () => reject(new Error("night map failed to load"));
    img.src = staticFile("v10/night.jpg");
  });

  // Columns, their ghosts and ground spots.
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const spotGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const cols = COLS.map((c) => {
    const color = new THREE.Color(c.color);
    const mk = (ghost: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: COL_VERT,
        fragmentShader: COL_FRAG,
        transparent: true,
        depthWrite: !ghost,
        uniforms: {
          uColor: { value: color },
          uH: { value: 1 },
          uStep: { value: 50 },
          uHi: { value: 0 },
          uFlash: { value: 0 },
          uGhost: { value: ghost ? 1 : 0 },
          uOn: { value: 1 },
          ...fogU,
        },
      });
    const solid = new THREE.Mesh(box, mk(false));
    const ghost = new THREE.Mesh(box, mk(true));
    ghost.renderOrder = 2;
    const spot = new THREE.Mesh(
      spotGeo,
      new THREE.ShaderMaterial({ vertexShader: SPOT_VERT, fragmentShader: SPOT_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uColor: { value: color }, uOn: { value: 1 } } }),
    );
    spot.renderOrder = -1;
    for (const m of [solid, ghost]) m.position.set(c.at[0], 0, -c.at[1]);
    spot.position.set(c.at[0], 1, -c.at[1]);
    spot.scale.set(COL_W * 5, 1, COL_W * 5);
    scene.add(solid, ghost, spot);
    return { id: c.id, solid, ghost, spot };
  });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const render = (s: MapState) => {
    const d = setCamera(camera, s.cam);
    fogU.uFogNear.value = d * 1.05;
    fogU.uFogFar.value = d * 2.6;
    const dim = s.dim ?? 1;
    skyMat.uniforms.uDim.value = dim;
    groundMat.uniforms.uLights.value = (s.lights ?? 1) * 2.4;
    groundMat.uniforms.uLand.value = (s.land ?? 1) * 1.7;
    groundMat.uniforms.uDim.value = dim;
    // floor lines every ~14 px on screen, snapped to a round number of km
    const pxPerKm = s.cam.z;
    const step = [10, 20, 50, 100, 200, 500, 1000].find((v) => v * pxPerKm >= 12) ?? 1000;
    for (const c of cols) {
      const st = s.cols[c.id];
      const on = st?.on ?? 0;
      const h = Math.max(0.01, st?.h ?? 0);
      c.solid.visible = on > 0.001 && h > 0.5;
      c.solid.scale.set(COL_W, h, COL_W);
      const u = (c.solid.material as THREE.ShaderMaterial).uniforms;
      u.uH.value = h;
      u.uStep.value = step;
      u.uHi.value = st?.hi ?? 0;
      u.uFlash.value = st?.flash ?? 0;
      u.uOn.value = on;
      const gh = st?.ghost ?? 0;
      c.ghost.visible = on > 0.001 && gh > h + 1;
      c.ghost.scale.set(COL_W * 1.02, gh, COL_W * 1.02);
      const gu = (c.ghost.material as THREE.ShaderMaterial).uniforms;
      gu.uH.value = gh;
      gu.uStep.value = step;
      gu.uOn.value = on;
      (c.spot.material as THREE.ShaderMaterial).uniforms.uOn.value = on * dim;
    }
    bloom.strength = s.bloom ?? 0.6;
    renderer.toneMappingExposure = s.exposure ?? 1.0;
    composer.render();
    renderer.getContext().finish();
  };

  return { canvas, ready, render };
};

let ENGINE: Engine | null = null;
export const engine = () => {
  if (!ENGINE) ENGINE = createEngine();
  return ENGINE;
};
