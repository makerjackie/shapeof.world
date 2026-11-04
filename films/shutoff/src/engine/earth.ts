// The night side of the Earth: NASA Black Marble 2016 city lights (public domain), procedural clouds, an atmosphere
// shell with a thin sunrise on the far limb, and stars. At the end every city light on the planet goes out at once
// and comes back — one heartbeat. Units: Earth radii.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { clamp, drift, ease, lerp, mulberry } from "./util";

const ll = (lat: number, lon: number) => {
  const a = (lat * Math.PI) / 180;
  const o = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o));
};

const VERT = /* glsl */ `varying vec3 vO; varying vec3 vW; void main(){ vO = normalize(position); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FRAG = /* glsl */ `
uniform sampler2D tNight; uniform float uLights, uT, uAmber; uniform vec3 uSun, uCam;
varying vec3 vO; varying vec3 vW;
${NOISE}
float dotPx(vec2 uv, float R, float cap){
  vec2 fw = max(fwidth(uv), vec2(1e-5));
  vec2 f = fract(uv) - 0.5;
  float d = length(f / fw);
  float nearD = smoothstep(R + 0.7, R - 0.3, d);
  float cov = 3.14159 * R * R * fw.x * fw.y;
  float k = smoothstep(0.22, 0.42, max(fw.x, fw.y));
  return mix(nearD, cap * (1.0 - exp(-cov / cap)), k);
}
void main(){
  vec3 n = normalize(vO);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(n.x, n.z);
  vec2 uv1 = vec2(lon / 6.2831853 + 0.5, 0.5 + lat / 3.1415926);
  vec2 uv2 = vec2(fract(uv1.x + 0.5) - 0.5, uv1.y);
  vec2 d1x = dFdx(uv1), d1y = dFdy(uv1), d2x = dFdx(uv2), d2y = dFdy(uv2);
  vec3 tex = (abs(d1x.x) + abs(d1y.x) < abs(d2x.x) + abs(d2y.x)) ? textureGrad(tNight, uv1, d1x, d1y).rgb : textureGrad(tNight, uv2, d2x, d2y).rgb;
  float lum = dot(tex, vec3(0.3, 0.59, 0.11));
  float city = smoothstep(0.16, 0.75, lum);
  // the data look: every lit place on the planet is a point on a lattice a third of a degree apart
  vec2 g = vec2(lon * cos(lat), lat) * 57.29578 / 0.3;
  float pts = dotPx(g, 0.8, 0.7);
  vec3 lc = mix(vec3(0.60, 0.76, 1.0), vec3(1.0, 0.50, 0.15), uAmber);
  vec3 lights = lc * smoothstep(0.08, 0.5, lum) * pts * 10.0 * uLights + lc * city * 0.25 * uLights;
  vec3 base = vec3(0.004, 0.006, 0.01) * smoothstep(0.02, 0.1, lum);
  // clouds drifting over the lights
  float cl = 0.0;
  vec3 col = base + lights;
  // thin day side where the sun grazes the far limb
  float ndl = dot(n, uSun);
  vec3 day = mix(vec3(0.02, 0.05, 0.12), vec3(0.5, 0.55, 0.6), cl) * smoothstep(-0.05, 0.25, ndl);
  col = mix(col, day * 0.05, smoothstep(-0.05, 0.15, ndl) * 0.5);
  // atmosphere thickness toward the limb
  vec3 V = normalize(uCam - vW);
  float limb = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
  col += vec3(0.60, 0.76, 1.0) * limb * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;
const ATM_FRAG = /* glsl */ `
uniform vec3 uSun, uCam; varying vec3 vO; varying vec3 vW;
void main(){
  vec3 n = normalize(vO);
  vec3 V = normalize(uCam - vW);
  float f = 1.0 - abs(dot(n, V));
  float glow = pow(f, 5.0);
  float s = dot(n, uSun);
  // a hair-thin rim of cold light: the planet's outline, no more
  vec3 c = vec3(0.60, 0.76, 1.0) * pow(f, 14.0) * 0.6;
  gl_FragColor = vec4(c, 1.0);
}`;
const STAR_VERT = /* glsl */ `attribute float aB; varying float vB; void main(){ vB = aB; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.0 + aB * 1.5; gl_Position = projectionMatrix * mv; }`;
const STAR_FRAG = /* glsl */ `varying float vB; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * vB * smoothstep(0.5, 0.0, r) * 1.2, 1.0); }`;

export const earthScene = (): SceneMod => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const U = { tNight: { value: null as THREE.Texture | null }, uLights: { value: 1 }, uAmber: { value: 0 }, uT: { value: 0 }, uSun: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() } };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 384, 192), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: EARTH_FRAG, uniforms: U }));
  scene.add(earth);
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 256, 128),
    new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ATM_FRAG, uniforms: U, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }),
  );
  scene.add(atm);
  const rnd = mulberry(99);
  const SN = 7000;
  const sp = new Float32Array(SN * 3);
  const sb = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(80);
    sp.set([v.x, v.y, v.z], i * 3);
    sb[i] = Math.pow(rnd(), 6);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("aB", new THREE.BufferAttribute(sb, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(stars);

  const ready = new Promise<void>((res, rej) => {
    new THREE.TextureLoader().load(
      staticFile("tex/bm3k.jpg"),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 16;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        U.tNight.value = t;
        res();
      },
      undefined,
      rej,
    );
  });

  const END_DIR = ll(28, 112);
  const sunDir = END_DIR.clone().multiplyScalar(-1).add(new THREE.Vector3(0.35, 0.3, 0)).normalize();

  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    U.uT.value = gt;
    U.uSun.value.copy(sunDir);
    let lights = 1;
    U.uAmber.value = 0;
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let fov = 40;
    if (shot.mode === "orbit") {
      const k = ease(clamp((lt - 0.4) / 8.0));
      const startDir = ll(23, 121.5);
      const dir = startDir.clone().lerp(END_DIR, k).normalize();
      const dist = Math.exp(lerp(Math.log(1.06), Math.log(3.4), k));
      pos.copy(dir).multiplyScalar(dist);
      const hz = ll(38, 118);
      tgt.copy(hz).lerp(new THREE.Vector3(0, 0, 0), ease(clamp((lt - 0.2) / 6.5)));
      up.copy(startDir).lerp(new THREE.Vector3(0, 1, 0), k).normalize();
      fov = lerp(55, 32, k);
      // one heartbeat: every light on the planet goes out and comes back
      const b0 = 9.0;
      if (lt > b0 && lt < b0 + 0.42) lights = lt < b0 + 0.06 ? 1 - (lt - b0) / 0.06 : lt > b0 + 0.3 ? (lt - b0 - 0.3) / 0.12 : 0;
      // and they come back in 安's colour
      U.uAmber.value = lt > b0 + 0.3 ? 1 : 0;
    } else {
      // montage glimpse: low over East Asia
      const d = ll(20, 118);
      pos.copy(d).multiplyScalar(1.12);
      tgt.copy(ll(40, 122));
      up.copy(d);
      fov = 45;
      U.uAmber.value = 1;
    }
    U.uLights.value = clamp(lights);
    pos.add(new THREE.Vector3(drift(gt, 11, 0.001), drift(gt, 12, 0.001), 0));
    cam.position.copy(pos);
    cam.up.copy(up);
    cam.lookAt(tgt);
    cam.fov = fov;
    cam.near = 0.001;
    cam.far = 200;
    U.uCam.value.copy(pos);
    void H;
    return { bloom: 0.7, bloomThreshold: 0.7, bloomRadius: 0.7, streak: 0.3, lift: [0, 0.006, 0.016], gain: [1.0, 1.0, 1.05], sat: 1.05, vignette: 0.5, grain: 0.05 };
  };
  return { scene, ready, update };
};
