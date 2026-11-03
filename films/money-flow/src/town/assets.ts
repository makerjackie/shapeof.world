// Kenney CC0 models (public/models, copied by tools/assets.sh), loaded once and cloned per use.
// Every material gets a small shader patch: green roofs repainted (uRoof), window glass lit at night (uWin, per-window
// on/off by a hash of the world position), and an overall dim (uDim) for scenes that push a building into the dark.
import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";

export type Kit = "sub" | "com" | "ind" | "car" | "chr" | "nat" | "fur";
const cache = new Map<string, GLTF>();
const loader = new GLTFLoader();

export const modelUrl = (kit: Kit, name: string) => staticFile(`models/${kit}/${name}.glb`);

export async function loadModels(list: [Kit, string][]) {
  await Promise.all(
    list.map(async ([kit, name]) => {
      const key = `${kit}/${name}`;
      if (cache.has(key)) return;
      const g = await loader.loadAsync(modelUrl(kit, name));
      cache.set(key, g);
    }),
  );
}

export type Look = {
  uWin: { value: number }; // window light 0..1
  uLit: { value: number }; // share of windows lit
  uRoof: { value: THREE.Color };
  uRoofK: { value: number };
  uDim: { value: number };
  uTint: { value: THREE.Color };
};
export const newLook = (o: Partial<{ win: number; lit: number; roof: string; roofK: number; tint: string }> = {}): Look => ({
  uWin: { value: o.win ?? 1 },
  uLit: { value: o.lit ?? 0.6 },
  uRoof: { value: new THREE.Color(o.roof ?? "#4a4f5c") },
  uRoofK: { value: o.roofK ?? 1 },
  uDim: { value: 0 },
  uTint: { value: new THREE.Color(o.tint ?? "#ffffff") },
});

export function patch(m: THREE.MeshStandardMaterial, look: Look) {
  m.roughness = 0.85;
  m.metalness = 0.0;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, look);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWP; uniform float uWin, uLit, uRoofK, uDim; uniform vec3 uRoof, uTint; float kWin;
        float h13(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          vec3 kc = diffuseColor.rgb;
          float lum = dot(kc, vec3(0.299, 0.587, 0.114));
          float green = smoothstep(0.02, 0.08, kc.g - kc.r) * smoothstep(0.0, 0.05, kc.g - kc.b);
          diffuseColor.rgb = mix(kc, uRoof * (0.45 + 1.4 * lum), green * uRoofK);
          kWin = step(0.08, kc.g - kc.r) * smoothstep(0.06, 0.14, kc.b - kc.g) * smoothstep(0.35, 0.6, kc.b) * (1.0 - green);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.045, 0.07), kWin * 0.85);
          diffuseColor.rgb *= uTint * (1.0 - 0.75 * uDim);
        }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float on = step(1.0 - uLit, h13(floor(vWP * vec3(1.7, 2.1, 1.7)) + 0.31));
          float var = 0.55 + 0.45 * h13(floor(vWP * vec3(1.7, 2.1, 1.7)) + 7.0);
          vec3 warm = mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.82, 0.55), h13(floor(vWP * 1.7) + 3.0));
          totalEmissiveRadiance += kWin * on * var * uWin * (1.0 - uDim) * warm * 1.5;
        }`,
      );
  };
  m.customProgramCacheKey = () => "kenney-look";
  return m;
}

// a fresh copy of a model with its own patched materials
// nature-kit materials are flat colours (metallic 1 in the files); repaint them in a soft daylight palette
const NAT: Record<string, string> = { leafsDark: "#4f8a55", leafs: "#6a9a4c", woodBarkDark: "#6b4a33", woodBark: "#7a5537", grass: "#6f9a52" };
export function inst(kit: Kit, name: string, look: Look, opts: { shadow?: boolean; paint?: string } = {}) {
  const g = cache.get(`${kit}/${name}`);
  if (!g) throw new Error(`model not loaded: ${kit}/${name}`);
  const o = kit === "chr" ? (skClone(g.scene) as THREE.Object3D) : g.scene.clone(true);
  o.traverse((c: THREE.Object3D) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = opts.shadow ?? true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // a few detail models have a texture but no UVs; sampling then reads garbage GPU memory under ANGLE (ghost glyphs
    // of the page's own captions). Drop the map and paint them flat.
    const noUv = !mesh.geometry.getAttribute("uv");
    const patched = mats.map((mm) => {
      const m = (mm as THREE.MeshStandardMaterial).clone();
      if (noUv && m.map) {
        m.map = null;
        if (opts.paint) m.color.set(opts.paint);
      }
      if (kit === "nat" || kit === "fur") {
        m.metalness = 0;
        m.roughness = 0.9;
        if (NAT[m.name]) m.color.set(NAT[m.name]);
        return m;
      }
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      return patch(m, look);
    });
    mesh.material = Array.isArray(mesh.material) ? patched : patched[0];
  });
  return o;
}

export const animations = (kit: Kit, name: string) => cache.get(`${kit}/${name}`)?.animations ?? [];
