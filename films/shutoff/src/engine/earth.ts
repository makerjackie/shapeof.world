// The night side of the Earth: NASA Black Marble 2016 city lights (public domain), procedural clouds, an atmosphere
// shell with a thin sunrise on the far limb, and stars. At the end every city light on the planet goes out at once
// and comes back — one heartbeat. Units: Earth radii.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { clamp, drift, ease, lerp, mulberry, sstep } from "./util";
import { endAlt } from "../film/cut";

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
// B-spline bicubic from four bilinear taps: close up the 3 km texels are many pixels wide, and plain bilinear
// magnification draws stars and diamonds between them
vec4 cubicW(float v){ vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v; vec4 s = n * n * n; float x = s.x; float y = s.y - 4.0 * s.x; float z = s.z - 4.0 * s.y + 6.0 * s.x; return vec4(x, y, z, 6.0 - x - y - z) / 6.0; }
vec3 bicubic(sampler2D t, vec2 uv){
  vec2 ts = vec2(textureSize(t, 0));
  vec2 p = uv * ts - 0.5;
  vec2 f = fract(p);
  p -= f;
  vec4 xc = cubicW(f.x), yc = cubicW(f.y);
  vec4 c = p.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 sm = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / sm) / ts.xxyy;
  vec3 s0 = textureLod(t, off.xz, 0.0).rgb, s1 = textureLod(t, off.yz, 0.0).rgb, s2 = textureLod(t, off.xw, 0.0).rgb, s3 = textureLod(t, off.yw, 0.0).rgb;
  float sx = sm.x / (sm.x + sm.y), sy = sm.z / (sm.z + sm.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
// dotPx with the footprint given (the lattice coordinates jump between rows, so fwidth of them would lie there)
float dotF(vec2 uv, vec2 fw, float R, float cap){
  fw = max(fw, vec2(1e-5));
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
  bool useA = abs(d1x.x) + abs(d1y.x) < abs(d2x.x) + abs(d2y.x);
  vec3 tex = useA ? textureGrad(tNight, uv1, d1x, d1y).rgb : textureGrad(tNight, uv2, d2x, d2y).rgb;
  float texPx = max(length(useA ? d1x : d2x), length(useA ? d1y : d2y)) * float(textureSize(tNight, 0).x);
  if (texPx < 0.8) tex = mix(bicubic(tNight, useA ? uv1 : vec2(fract(uv2.x), uv2.y)), tex, smoothstep(0.4, 0.8, texPx));
  float lum = dot(tex, vec3(0.3, 0.59, 0.11));
  float city = smoothstep(0.16, 0.75, lum);
  // the data look: every lit place on the planet is a point on a lattice; close up the lattice gets finer. Each row
  // of points keeps its own east-west spacing (cos of the row's latitude), so the lattice never shears; the levels
  // nest (0.3 = 5 x 0.06 = 25 x 0.012, centres aligned), so a finer level only adds points between the coarser ones
  float latD = lat * 57.29578, lonD = lon * 57.29578;
  float dLon = min(fwidth(lonD), fwidth(atan(-n.x, -n.z) * 57.29578));
  float dLat = fwidth(latD);
  float pts = 0.0;
  {
    float s3 = 0.012, s2 = 0.06, s1 = 0.3;
    float r3 = floor(latD / s3), r2 = floor(latD / s2), r1 = floor(latD / s1);
    float k3 = cos((r3 + 0.5) * s3 / 57.29578), k2 = cos((r2 + 0.5) * s2 / 57.29578), k1 = cos((r1 + 0.5) * s1 / 57.29578);
    vec2 g3 = vec2(lonD * k3 / s3, latD / s3), g2 = vec2(lonD * k2 / s2, latD / s2), g1 = vec2(lonD * k1 / s1, latD / s1);
    vec2 f3 = vec2(dLon * k3, dLat) / s3, f2 = vec2(dLon * k2, dLat) / s2, f1 = vec2(dLon * k1, dLat) / s1;
    float c3 = 1.0 / max(max(f3.x, f3.y), 1e-5), c2 = 1.0 / max(max(f2.x, f2.y), 1e-5);
    float w2 = smoothstep(4.5, 10.0, c2), w3 = smoothstep(4.5, 10.0, c3);
    if (c3 >= 4.5) {
      vec2 i3 = floor(g3);
      vec2 i2 = floor(g2);
      // a fine point sits on the coarser lattice only if its row is that lattice's centre row too
      bool on2 = mod(i3.y, 5.0) == 2.0 && mod(i3.x, 5.0) == 2.0;
      bool on1 = on2 && mod(i2.y, 5.0) == 2.0 && mod(i2.x, 5.0) == 2.0;
      pts = dotF(g3, f3, 0.85, 0.7) * (on1 ? 1.0 : on2 ? w2 : w3);
    } else if (c2 >= 4.5) {
      vec2 i2 = floor(g2);
      bool on1 = mod(i2.y, 5.0) == 2.0 && mod(i2.x, 5.0) == 2.0;
      pts = dotF(g2, f2, 0.8, 0.7) * (on1 ? 1.0 : w2);
    } else pts = dotF(g1, f1, 0.8, 0.7);
  }
  vec3 lc = mix(vec3(0.60, 0.76, 1.0), vec3(1.0, 0.50, 0.15), uAmber);
  // close up the soft glow under the points would flood the frame: there the points carry the picture
  float fillK = mix(0.035, 0.25, smoothstep(0.25, 1.5, texPx));
  vec3 lights = lc * smoothstep(0.08, 0.5, lum) * pts * 10.0 * mix(0.3, 1.0, smoothstep(0.1, 1.2, texPx)) * uLights + lc * city * fillK * uLights;
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
    let bloomK = 1;
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
    } else if (shot.mode === "out") {
      // the earth leg of the ending's one move: straight down over Shenzhen at the city shot's altitude, then out and
      // out until the night side of the planet fills the frame; one heartbeat, and every light comes back amber
      const alt = endAlt(gt) / 6371000;
      const a = clamp(Math.log(alt / 0.006) / Math.log(2.4 / 0.006));
      const SZ = ll(22.54, 114.06);
      const m = sstep(0.3, 1.0, a);
      const dir = ll(22.54 - (0.25 * alt * 57.3), 114.06).lerp(END_DIR, m).normalize();
      pos.copy(dir).multiplyScalar(1 + alt);
      tgt.copy(SZ).lerp(new THREE.Vector3(0, 0, 0), sstep(0.35, 0.95, a));
      const north = ll(23.54, 114.06).sub(SZ).normalize();
      up.copy(north).lerp(new THREE.Vector3(0, 1, 0), sstep(0.3, 1.0, a)).normalize();
      fov = lerp(40, 32, sstep(0.4, 1.0, a));
      bloomK = lerp(0.35, 1, sstep(0.3, 0.8, a));
      const b0 = 6.0;
      if (lt > b0 && lt < b0 + 0.42) lights = lt < b0 + 0.06 ? 1 - (lt - b0) / 0.06 : lt > b0 + 0.3 ? (lt - b0 - 0.3) / 0.12 : 0;
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
    cam.near = shot.mode === "out" ? Math.max(1e-6, (endAlt(gt) / 6371000) * 0.05) : 0.001;
    cam.far = 200;
    U.uCam.value.copy(pos);
    void H;
    return { bloom: 0.7 * bloomK, bloomThreshold: 0.7, bloomRadius: 0.7, streak: shot.mode === "out" ? 0.1 : 0.3, lift: [0, 0.006, 0.016], gain: [1.0, 1.0, 1.05], sat: 1.05, vignette: 0.5, grain: 0.05 };
  };
  return { scene, ready, update };
};
