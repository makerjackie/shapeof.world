// The city: a procedural metropolis at dusk and at night. Buildings are one instanced box mesh whose shader draws
// windows, glass, street-level glow and the blackout; the ground shader draws streets and street-light pools; cars,
// traffic lights, aviation lights and drones are point sprites recomputed per frame from time. Units: metres.
import * as THREE from "three";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { drawBillboard } from "./screens";
import { clamp, drift, ease, easeIn, easeOut, hash1, hash2, lerp, mulberry, sstep } from "./util";

const P = 110; // block pitch
const STREET = 24;
const N = 24; // blocks each side of the centre
const EXT = N * P;
const RING_R = 1150;
const RING_Y = 22;
const DC = new THREE.Vector3(1950, 0, -1650); // data-centre campus
const AVE_Z = 0.5 * P; // the avenue of the green wave

export type CityState = {
  dusk: number; // 1 dusk .. 0 night
  offR: number; // blackout front radius
  onR: number; // relight front radius
  blink: number; // global light multiplier (unison blink)
  allRed: number;
  flip: number[]; // billboard flips
  carT: number; // traffic clock
  hwT: number; // highway clock
  hwBlink: number;
};

// ---------------- shared GLSL: blackout mask ----------------
const MASK = /* glsl */ `
uniform float uOffR, uOnR, uBlink, uDusk;
float district(vec2 p){ vec2 c = floor(p / 520.0); float d = length(c * 520.0 + 260.0); return d + h21(c * 1.7) * 260.0; }
float lightsOn(vec2 p){
  float d = district(p);
  float off = step(d, uOffR) * (1.0 - step(d, uOnR));
  return (1.0 - off) * uBlink;
}`;
const lightsOnJS = (x: number, z: number, s: CityState) => {
  const cx = Math.floor(x / 520);
  const cz = Math.floor(z / 520);
  const d = Math.hypot(cx * 520 + 260, cz * 520 + 260) + h21js(cx * 1.7, cz * 1.7) * 260;
  const off = d <= s.offR && d > s.onR ? 1 : 0;
  return (1 - off) * s.blink;
};
// JS twin of the GLSL h21 (only needs to be a stable hash, not bit-identical: districts flip with their buildings
// because both use district() on the same centres within a few metres of tolerance)
function h21js(x: number, y: number) {
  let p3x = fract(x * 0.1031);
  let p3y = fract(y * 0.1031);
  let p3z = fract(x * 0.1031);
  const dd = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33);
  p3x += dd;
  p3y += dd;
  p3z += dd;
  return fract((p3x + p3y) * p3z);
}
function fract(x: number) {
  return x - Math.floor(x);
}

const SKY_GLSL = /* glsl */ `
vec3 skyCol(vec3 d){
  float e = d.y;
  vec3 nightTop = vec3(0.003, 0.005, 0.011), nightHor = vec3(0.075, 0.050, 0.040);
  vec3 duskTop = vec3(0.006, 0.014, 0.045), duskHor = vec3(0.40, 0.17, 0.07);
  float west = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(vec2(-1.0, 0.35)));
  vec3 hor = mix(nightHor, mix(vec3(0.12, 0.13, 0.2), duskHor, west), uDusk);
  vec3 top = mix(nightTop, duskTop, uDusk);
  return mix(hor, top, pow(clamp(e, 0.0, 1.0), 0.32));
}`;

// ---------------- buildings ----------------
const BLD_VERT = /* glsl */ `
attribute vec4 aInfo; // seed, type, litFrac, hasBillboard
varying vec3 vW; varying vec3 vN; varying vec4 vInfo; varying vec3 vSize; varying vec3 vCenter;
void main(){
  mat4 m = modelMatrix * instanceMatrix;
  vec4 w = m * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(m) * normal);
  vInfo = aInfo;
  vSize = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
  vCenter = m[3].xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BLD_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD; uniform vec3 uFog; uniform float uT;
varying vec3 vW; varying vec3 vN; varying vec4 vInfo; varying vec3 vSize; varying vec3 vCenter;
${NOISE}
${MASK}
${SKY_GLSL}
void main(){
  float seed = vInfo.x; float typ = vInfo.y; float litF = vInfo.z;
  vec3 n = normalize(vN);
  vec3 V = normalize(vW - uCam);
  float dist = length(vW - uCam);
  float on = lightsOn(vCenter.xz);
  vec3 col;
  vec3 streetGlow = mix(vec3(1.0, 0.55, 0.22), vec3(0.85, 0.9, 1.0), step(0.6, h21(floor(vCenter.xz / 700.0)))) ;
  float up = exp(-vW.y / 26.0) * 0.10 * on;
  if (n.y > 0.5) {
    // roof: dark membrane, a few service lights
    col = vec3(0.012, 0.013, 0.016) * (0.8 + 0.4 * vnoise(vW.xz * 0.3));
    col += skyCol(vec3(0.0, 1.0, 0.0)) * 0.08;
    vec2 g = floor(vW.xz / 7.0);
    float l = step(0.985, h21(g + seed));
    col += vec3(1.0, 0.8, 0.6) * l * 0.6 * on;
  } else {
    float hcoord = abs(n.x) > 0.5 ? vW.z * sign(n.x) : -vW.x * sign(n.z);
    float faceId = abs(n.x) > 0.5 ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
    float fh = typ < 0.5 ? 3.9 : typ < 1.5 ? 3.0 : 6.0;
    float cw = typ < 0.5 ? 2.2 + h11(seed) * 1.2 : 3.0 + h11(seed) * 1.5;
    vec2 uvw = vec2(hcoord / cw, (vW.y - 1.5) / fh);
    vec2 cell = floor(uvw); vec2 f = fract(uvw);
    vec2 fw = fwidth(uvw);
    float aa = smoothstep(0.25, 0.7, max(fw.x, fw.y));
    vec2 wmin = typ < 0.5 ? vec2(0.05, 0.14) : vec2(0.18, 0.24);
    vec2 wmax = typ < 0.5 ? vec2(0.95, 0.9) : vec2(0.82, 0.82);
    float win = step(wmin.x, f.x) * step(f.x, wmax.x) * step(wmin.y, f.y) * step(f.y, wmax.y);
    if (typ > 1.5) win = 0.0;
    float r = mix(h21(cell + seed * 13.0 + faceId * 7.1), h21(vec2(cell.y * 1.3, seed + faceId)), typ < 0.5 ? 0.65 : 0.25);
    float lit = step(r, litF);
    float k = h21(cell * 1.7 + seed);
    vec3 wc = k < 0.62 ? vec3(1.0, 0.68, 0.38) : k < 0.92 ? vec3(0.78, 0.86, 1.0) : vec3(0.45, 0.6, 1.0) * (0.7 + 0.3 * sin(uT * 9.0 + k * 50.0));
    float wint = (0.35 + 0.9 * h21(cell + 3.3)) * (typ < 0.5 ? 1.0 : 0.85);
    vec3 glass = skyCol(reflect(V, n)) * (typ < 0.5 ? 0.2 : 0.08) * (0.5 + 0.5 * smoothstep(0.0, 200.0, vW.y));
    vec3 wall = vec3(0.020, 0.021, 0.024) * (0.85 + 0.3 * vnoise(vec2(hcoord, vW.y) * 0.2));
    if (typ < 0.5) wall = mix(wall, glass * 0.8, 0.6);
    vec3 winCol = mix(glass, wc * wint * on, lit);
    vec3 pattern = mix(wall, winCol, win);
    vec3 avg = mix(wall, mix(glass, wc * 0.45 * on, litF), (wmax.x - wmin.x) * (wmax.y - wmin.y));
    col = mix(pattern, avg, aa);
    // dusk light on west faces
    col += vec3(1.0, 0.45, 0.2) * 0.06 * uDusk * max(0.0, dot(n, normalize(vec3(-1.0, 0.2, 0.35))));
    col += streetGlow * up;
    // horizontal light strips on the data centre
    if (typ > 1.5) col += vec3(0.6, 0.85, 1.0) * smoothstep(0.08, 0.0, abs(fract(vW.y / 6.0) - 0.5)) * 0.25 * on;
  }
  col = mix(uFog, col, exp(-dist * uFogD));
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- ground ----------------
const GND_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GND_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD; uniform vec3 uFog;
varying vec3 vW;
${NOISE}
${MASK}
const float P = ${P.toFixed(1)}; const float HALF = ${(STREET / 2).toFixed(1)};
float pools(float along, float across){
  // lamps every 32 m on both sides of a street, 10 m off its centre line
  float a = along - floor(along / 32.0 + 0.5) * 32.0;
  float d1 = across - 9.0; float d2 = across + 9.0;
  return exp(-(a * a + d1 * d1) / 70.0) + exp(-(a * a + d2 * d2) / 70.0);
}
void main(){
  vec2 p = vW.xz;
  float dist = length(vW - uCam);
  float rC = length(p);
  vec2 u = p / P; vec2 cell = floor(u + 0.5); vec2 f = u - cell; // block centre at integer
  vec2 dToStreet = (0.5 - abs(f)) * P; // metres to the nearest street centre line (x, z)
  float inCity = step(rC, ${(EXT - 60).toFixed(1)});
  float park = step(0.93, h21(cell * 2.3)) * inCity;
  vec3 col;
  float streetX = step(dToStreet.x, HALF); float streetZ = step(dToStreet.y, HALF);
  float street = max(streetX, streetZ) * inCity;
  vec3 asphalt = vec3(0.010, 0.010, 0.011);
  vec3 block = park > 0.5 ? vec3(0.004, 0.008, 0.005) : vec3(0.016, 0.016, 0.017);
  vec3 field = vec3(0.006, 0.008, 0.006) * (0.7 + 0.6 * fbm(p * 0.004));
  col = inCity > 0.5 ? mix(block, asphalt, street) : field;
  float on = lightsOn(p);
  // street-light pools: sodium in old districts, white LED in new ones
  vec3 lampC = mix(vec3(1.0, 0.5, 0.16), vec3(0.62, 0.68, 0.78), step(0.72, h21(floor(p / 700.0))));
  float lp = 0.0;
  // streets running along z (at x = (cell.x + 0.5)P): across = distance in x from the centre line
  float sx = (floor(u.x) + 0.5) * P; lp += pools(p.y, p.x - sx);
  float sz = (floor(u.y) + 0.5) * P; lp += pools(p.x, p.y - sz);
  col += lampC * lp * 0.32 * on * inCity * (1.0 - park * 0.8);
  // general light spill near the street grid so the city reads from far away
  float far = smoothstep(250.0, 1400.0, dist);
  col += lampC * mix(0.035, 0.11, far) * on * inCity * exp(-min(dToStreet.x, dToStreet.y) / mix(9.0, 14.0, far)) * (1.0 - park * 0.8);
  col = mix(uFog, col, exp(-dist * uFogD));
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- sky ----------------
const SKY_VERT = /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = /* glsl */ `
uniform float uOffR, uOnR, uBlink, uDusk; uniform float uGlow;
varying vec3 vD;
${NOISE}
${SKY_GLSL}
void main(){
  vec3 d = normalize(vD);
  vec3 c = skyCol(d);
  c *= mix(0.35, 1.0, uGlow);
  // stars, mostly hidden by the city's own glow
  vec2 sp = vec2(atan(d.z, d.x), d.y) * 300.0;
  float s = step(0.997, h21(floor(sp))) * smoothstep(0.1, 0.6, d.y) * (1.0 - uDusk);
  c += vec3(0.8, 0.85, 1.0) * s * 0.12;
  // a thin cloud deck lit from below by the city
  float cl = fbm(d.xz / max(d.y, 0.05) * 1.3);
  c += vec3(0.035, 0.022, 0.016) * smoothstep(0.45, 0.8, cl) * smoothstep(0.0, 0.15, d.y) * (1.0 - uDusk) * uGlow;
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------------- points ----------------
const PT_VERT = /* glsl */ `
attribute vec3 aCol; attribute float aSize;
uniform float uScale, uMinPx; uniform float uFogD;
varying vec3 vCol;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float px = aSize * uScale / max(-mv.z, 0.1);
  gl_PointSize = max(uMinPx, px);
  float dim = clamp(px / uMinPx, 0.15, 1.0);
  vCol = aCol * dim * exp(-length(mv.xyz) * uFogD);
  if (aSize <= 0.0) vCol = vec3(0.0);
  gl_Position = projectionMatrix * mv;
}`;
const PT_FRAG = /* glsl */ `
varying vec3 vCol;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  float a = smoothstep(0.5, 0.0, r);
  a = a * a;
  if (dot(vCol, vCol) < 1e-6) discard;
  gl_FragColor = vec4(vCol * a, 1.0);
}`;

class PointSet {
  geo = new THREE.BufferGeometry();
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  mesh: THREE.Points;
  n = 0;
  constructor(public max: number, mat: THREE.ShaderMaterial) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("aCol", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Points(this.geo, mat);
    this.mesh.frustumCulled = false;
  }
  begin() {
    this.n = 0;
  }
  add(x: number, y: number, z: number, r: number, g: number, b: number, s: number) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.col[i * 3] = r;
    this.col[i * 3 + 1] = g;
    this.col[i * 3 + 2] = b;
    this.size[i] = s;
  }
  end() {
    this.geo.setDrawRange(0, this.n);
    for (const k of ["position", "aCol", "aSize"]) (this.geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }
}

type Bld = { x: number; z: number; w: number; d: number; h: number; type: number; seed: number; crown?: boolean };
type Car = { axis: 0 | 1; line: number; lane: number; dir: number; speed: number; phase: number; len: number };
type HwCar = { lane: number; dir: number; speed: number; phase: number; col: number };

export const cityScene = (): SceneMod => {
  const scene = new THREE.Scene();
  const rnd = mulberry(20261102);

  // ---------- layout ----------
  const blds: Bld[] = [];
  const hfun = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const r2 = Math.hypot(x - 1500, z + 700);
    const core = Math.max(Math.exp(-r / 520), 0.55 * Math.exp(-r2 / 380));
    return core;
  };
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++) {
      const cx = i * P;
      const cz = j * P;
      const r = Math.hypot(cx, cz);
      if (r > EXT - 60) continue;
      if (Math.abs(r - RING_R) < 70) continue; // the ring highway corridor
      if (Math.hypot(cx - DC.x, cz - DC.z) < 330) continue; // data centre campus
      if (hash2(i * 2.3, j * 2.3) > 0.93) continue; // parks
      const core = hfun(cx, cz);
      const tall = core > 0.35 && rnd() < 0.75;
      const supertall = core > 0.72 && rnd() < 0.35;
      const lot = P - STREET - 8;
      if (supertall) {
        const h = 300 + rnd() * 230;
        const w = lot * (0.42 + 0.12 * rnd());
        blds.push({ x: cx, z: cz, w, d: w * (0.9 + 0.2 * rnd()), h, type: 0, seed: rnd() * 100 });
        blds.push({ x: cx, z: cz, w: w * 0.7, d: w * 0.7, h: h + 25 + rnd() * 30, type: 0, seed: rnd() * 100, crown: true });
      } else if (tall) {
        const h = 90 + core * 260 * (0.55 + 0.6 * rnd());
        const w = lot * (0.55 + 0.35 * rnd());
        const d = lot * (0.55 + 0.35 * rnd());
        blds.push({ x: cx + (rnd() - 0.5) * (lot - w), z: cz + (rnd() - 0.5) * (lot - d), w, d, h, type: 0, seed: rnd() * 100 });
        if (rnd() < 0.5) {
          // podium
          blds.push({ x: cx, z: cz, w: lot * 0.95, d: lot * 0.95, h: 14 + rnd() * 12, type: 1, seed: rnd() * 100 });
        }
      } else {
        const sub = rnd() < 0.5 ? 2 : 1;
        const q = lot / sub;
        for (let a = 0; a < sub; a++)
          for (let b = 0; b < sub; b++) {
            if (rnd() < 0.08) continue;
            const base = 12 + core * 140 + (r < 2000 ? 18 : 4);
            const h = base * (0.45 + rnd() * 0.9) + (rnd() < 0.06 ? 40 : 0);
            const w = q * (0.7 + 0.25 * rnd());
            const d = q * (0.7 + 0.25 * rnd());
            const x = cx - lot / 2 + q * (a + 0.5);
            const z = cz - lot / 2 + q * (b + 0.5);
            blds.push({ x, z, w, d, h, type: core > 0.3 && rnd() < 0.5 ? 0 : 1, seed: rnd() * 100 });
          }
      }
    }
  // data centre: long low halls
  for (let k = 0; k < 5; k++) blds.push({ x: DC.x - 160 + k * 80, z: DC.z, w: 52, d: 190, h: 16, type: 2, seed: k * 7.7 });
  // warehouses where the drones live
  const WARE: THREE.Vector3[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.3;
    const rr = 1700 + (k % 3) * 260;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    blds.push({ x, z, w: 90, d: 60, h: 12, type: 2, seed: 50 + k });
    WARE.push(new THREE.Vector3(x, 12, z));
  }

  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bldU = {
    uCam: { value: new THREE.Vector3() }, uFogD: { value: 0.0003 }, uFog: { value: new THREE.Color() }, uT: { value: 0 },
    uOffR: { value: -1 }, uOnR: { value: -2 }, uBlink: { value: 1 }, uDusk: { value: 0 },
  };
  const bldMat = new THREE.ShaderMaterial({ vertexShader: BLD_VERT, fragmentShader: BLD_FRAG, uniforms: bldU });
  bldMat.extensions = { clipCullDistance: false, multiDraw: false } as never;
  const inst = new THREE.InstancedMesh(box, bldMat, blds.length);
  const info = new Float32Array(blds.length * 4);
  const m4 = new THREE.Matrix4();
  blds.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    inst.setMatrixAt(i, m4);
    const lit = b.type === 0 ? 0.1 + 0.28 * hash1(b.seed) : 0.12 + 0.3 * hash1(b.seed + 3);
    info.set([b.seed, b.type, lit, 0], i * 4);
  });
  box.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
  inst.frustumCulled = false;
  scene.add(inst);

  // ground
  const gndU = { uCam: bldU.uCam, uFogD: bldU.uFogD, uFog: bldU.uFog, uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: GND_VERT, fragmentShader: GND_FRAG, uniforms: gndU }));
  scene.add(ground);

  // sky
  const skyU = { uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk, uGlow: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false }));
  scene.add(sky);

  // standard-material lighting for the hero objects (mast, pylons, highway, car bodies)
  const hemi = new THREE.HemisphereLight(0x1a2a44, 0x2a1a10, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a60, 0);
  sun.position.set(-1, 0.25, 0.35);
  scene.add(sun);

  // ring highway deck, pillars, barrier lights
  const concrete = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9 });
  const deck = new THREE.Mesh(new THREE.RingGeometry(RING_R - 18, RING_R + 18, 512, 1).rotateX(-Math.PI / 2), concrete);
  deck.position.y = RING_Y;
  scene.add(deck);
  const deckSide = new THREE.Mesh(new THREE.CylinderGeometry(RING_R + 18, RING_R + 18, 2.2, 512, 1, true), concrete);
  deckSide.position.y = RING_Y - 1.1;
  scene.add(deckSide);
  const deckSideIn = new THREE.Mesh(new THREE.CylinderGeometry(RING_R - 18, RING_R - 18, 2.2, 512, 1, true), concrete);
  deckSideIn.position.y = RING_Y - 1.1;
  scene.add(deckSideIn);
  const pillarN = Math.round((2 * Math.PI * RING_R) / 45);
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(5, RING_Y, 3).translate(0, RING_Y / 2, 0), concrete, pillarN);
  for (let k = 0; k < pillarN; k++) {
    const a = (k / pillarN) * Math.PI * 2;
    m4.compose(new THREE.Vector3(Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), new THREE.Vector3(1, 1, 1));
    pillars.setMatrixAt(k, m4);
  }
  scene.add(pillars);

  // highway car bodies (instanced) — visible in the close highway shots
  const HW: HwCar[] = [];
  for (let lane = 0; lane < 8; lane++) {
    const dir = lane < 4 ? 1 : -1;
    const n = Math.round((2 * Math.PI * RING_R) / (13 + (lane % 4) * 2));
    for (let k = 0; k < n; k++) HW.push({ lane, dir, speed: 24 + (lane % 4) * 3 + rnd() * 3, phase: (k / n) * Math.PI * 2 + rnd() * 0.004, col: rnd() });
  }
  const carBody = new THREE.InstancedMesh(
    new THREE.BoxGeometry(4.6, 1.45, 1.9).translate(0, 0.75, 0),
    new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.6, roughness: 0.35 }),
    HW.length,
  );
  carBody.frustumCulled = false;
  scene.add(carBody);

  // billboards on the tallest downtown towers, facing +z and -x
  const tallest = blds.filter((b) => b.type === 0 && !b.crown && Math.hypot(b.x, b.z) < 900).sort((a, b) => b.h - a.h).slice(0, 9);
  const adCv = document.createElement("canvas");
  adCv.width = 1024;
  adCv.height = 512;
  drawBillboard(adCv.getContext("2d") as CanvasRenderingContext2D, 1024, 512, 0, 0);
  const homeCv = document.createElement("canvas");
  homeCv.width = 1024;
  homeCv.height = 512;
  drawBillboard(homeCv.getContext("2d") as CanvasRenderingContext2D, 1024, 512, 0, 1);
  const adTex = new THREE.CanvasTexture(adCv);
  const homeTex = new THREE.CanvasTexture(homeCv);
  for (const t of [adTex, homeTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  const BB_FRAG = /* glsl */ `
  uniform sampler2D tA, tB; uniform float uFlip, uOn, uFogD; uniform vec3 uFog, uCam; varying vec2 vUv; varying vec3 vW;
  void main(){
    vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb;
    float y = 1.0 - vUv.y;
    vec3 c = y < uFlip ? b : a;
    c += vec3(1.0) * smoothstep(0.012, 0.0, abs(y - uFlip)) * step(0.001, uFlip) * step(uFlip, 0.999) * 2.0;
    // LED pixel grid
    vec2 g = fract(vUv * vec2(256.0, 128.0));
    c *= 0.75 + 0.25 * step(0.2, g.x) * step(0.2, g.y);
    c *= 2.2 * uOn;
    float dist = length(vW - uCam);
    gl_FragColor = vec4(mix(uFog, c, exp(-dist * uFogD)), 1.0);
  }`;
  const BB_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const boards: { mesh: THREE.Mesh; u: Record<string, THREE.IUniform>; x: number; z: number }[] = [];
  tallest.forEach((b, i) => {
    const faceX = i % 2 === 1;
    const bw = (faceX ? b.d : b.w) * 0.92;
    const bh = bw * 0.5;
    const u = { tA: { value: adTex }, tB: { value: homeTex }, uFlip: { value: 0 }, uOn: { value: 1 }, uFogD: bldU.uFogD, uFog: bldU.uFog, uCam: bldU.uCam };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: BB_FRAG, uniforms: u }));
    const y = Math.min(b.h * (0.42 + 0.1 * hash1(i)), 170);
    if (faceX) {
      mesh.position.set(b.x - b.w / 2 - 0.6, y, b.z);
      mesh.rotation.y = -Math.PI / 2;
    } else {
      mesh.position.set(b.x, y, b.z + b.d / 2 + 0.6);
    }
    scene.add(mesh);
    boards.push({ mesh, u, x: b.x, z: b.z });
  });

  // pylons on the western outskirts: a line marching into the city
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.7, roughness: 0.5 });
  const PYL: THREE.Vector3[] = [];
  const pylGeo: THREE.BufferGeometry[] = [];
  const beam = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(r, r, len, 4, 1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    return g;
  };
  const pylonGeo = () => {
    const parts: THREE.BufferGeometry[] = [];
    const Hh = 48;
    const leg = (s: number) => (y: number) => lerp(5.5, 1.0, y / Hh) * s;
    const corners = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const lv = [0, 8, 16, 24, 32, 40, 48];
    for (const [sx, sz] of corners) for (let k = 0; k < lv.length - 1; k++) parts.push(beam(new THREE.Vector3(leg(sx)(lv[k]), lv[k], leg(sz)(lv[k])), new THREE.Vector3(leg(sx)(lv[k + 1]), lv[k + 1], leg(sz)(lv[k + 1])), 0.22));
    for (let k = 0; k < lv.length - 1; k++)
      for (let c = 0; c < 4; c++) {
        const [ax, az] = corners[c];
        const [bx, bz] = corners[(c + 1) % 4];
        parts.push(beam(new THREE.Vector3(leg(ax)(lv[k]), lv[k], leg(az)(lv[k])), new THREE.Vector3(leg(bx)(lv[k + 1]), lv[k + 1], leg(bz)(lv[k + 1])), 0.1));
        parts.push(beam(new THREE.Vector3(leg(bx)(lv[k]), lv[k], leg(bz)(lv[k])), new THREE.Vector3(leg(ax)(lv[k + 1]), lv[k + 1], leg(az)(lv[k + 1])), 0.1));
      }
    for (const y of [30, 38, 46]) {
      const w = y === 38 ? 15 : 11;
      parts.push(beam(new THREE.Vector3(-w, y, 0), new THREE.Vector3(w, y, 0), 0.3));
      parts.push(beam(new THREE.Vector3(-w, y, 0), new THREE.Vector3(0, y + 4, 0), 0.12));
      parts.push(beam(new THREE.Vector3(w, y, 0), new THREE.Vector3(0, y + 4, 0), 0.12));
    }
    const out = mergeGeos(parts);
    parts.forEach((p) => p.dispose());
    return out;
  };
  const pg = pylonGeo();
  const PYL_A = new THREE.Vector3(-4200, 0, 1500);
  const PYL_B = new THREE.Vector3(-2550, 0, 420);
  const pylDir = PYL_B.clone().sub(PYL_A).normalize();
  const pylYaw = Math.atan2(pylDir.x, pylDir.z);
  for (let k = 0; k <= 6; k++) {
    const p = PYL_A.clone().lerp(PYL_B, k / 6);
    PYL.push(p);
    const m = new THREE.Mesh(pg, steel);
    m.position.copy(p);
    m.rotation.y = pylYaw;
    scene.add(m);
  }
  void pylGeo;
  // wires: catenaries between cross-arm tips
  const armTips: [number, number][] = [
    [-11, 30],
    [11, 30],
    [-15, 38],
    [15, 38],
    [-11, 46],
    [11, 46],
  ];
  const wireCurves: THREE.Vector3[][] = [];
  const side = new THREE.Vector3(Math.cos(pylYaw), 0, -Math.sin(pylYaw));
  const wirePos: number[] = [];
  for (const [ox, oy] of armTips) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < PYL.length - 1; k++) {
      const a = PYL[k].clone().addScaledVector(side, ox).setY(oy - 1.5);
      const b = PYL[k + 1].clone().addScaledVector(side, ox).setY(oy - 1.5);
      for (let s = 0; s <= 24; s++) {
        const t = s / 24;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * 9;
        if (s > 0 || k === 0) pts.push(p);
      }
    }
    wireCurves.push(pts);
    for (let i = 0; i < pts.length - 1; i++) wirePos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  }
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(wirePos, 3)), new THREE.LineBasicMaterial({ color: 0x0a0b0d }));
  scene.add(wires);

  // hero rooftop mast
  const mastB = blds.filter((b) => b.type === 1 && b.h > 40 && b.h < 75 && Math.hypot(b.x + 500, b.z - 420) < 300)[0] ?? blds[100];
  const MAST = new THREE.Vector3(mastB.x, mastB.h, mastB.z);
  const mast = new THREE.Group();
  {
    const parts: THREE.BufferGeometry[] = [];
    const Hm = 16;
    const cs = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const wv = (y: number) => lerp(1.3, 0.5, y / Hm);
    for (const [sx, sz] of cs) parts.push(beam(new THREE.Vector3(sx * wv(0), 0, sz * wv(0)), new THREE.Vector3(sx * wv(Hm), Hm, sz * wv(Hm)), 0.07));
    for (let y = 0; y < Hm; y += 2)
      for (let c = 0; c < 4; c++) {
        const [ax, az] = cs[c];
        const [bx, bz] = cs[(c + 1) % 4];
        parts.push(beam(new THREE.Vector3(ax * wv(y), y, az * wv(y)), new THREE.Vector3(bx * wv(y + 2), y + 2, bz * wv(y + 2)), 0.035));
      }
    parts.push(beam(new THREE.Vector3(0, Hm, 0), new THREE.Vector3(0, Hm + 4, 0), 0.05));
    mast.add(new THREE.Mesh(mergeGeos(parts), steel));
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.6, metalness: 0.1 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.8, 0.14), panelMat);
      p.position.set(Math.cos(a) * 0.9, Hm - 1.4, Math.sin(a) * 0.9);
      p.rotation.y = -a + Math.PI / 2;
      mast.add(p);
    }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, 0.9), panelMat);
    dish.position.set(0.9, Hm - 5, 0);
    dish.rotation.z = Math.PI / 2;
    mast.add(dish);
  }
  mast.position.copy(MAST);
  scene.add(mast);

  // ---------- dynamic lights ----------
  const ptU = { uScale: { value: 1 }, uMinPx: { value: 1.6 }, uFogD: bldU.uFogD };
  const ptMat = new THREE.ShaderMaterial({ vertexShader: PT_VERT, fragmentShader: PT_FRAG, uniforms: ptU, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const pts = new PointSet(140000, ptMat);
  scene.add(pts.mesh);

  // street cars
  const CARS: Car[] = [];
  for (let k = -N; k < N; k++) {
    const line = (k + 0.5) * P;
    for (const axis of [0, 1] as const)
      for (const dir of [1, -1]) {
        const len = Math.sqrt(Math.max(0, (EXT - 80) ** 2 - line * line));
        if (len < 200) continue;
        const busy = 0.4 + 0.6 * Math.exp(-Math.abs(line) / 1400);
        const n = Math.round(((2 * len) / 70) * busy);
        for (let c = 0; c < n; c++) CARS.push({ axis, line, lane: dir * (3 + (c % 2) * 3.2), dir, speed: 9 + rnd() * 6, phase: rnd() * 2 * len, len });
      }
  }
  // the green-wave avenue is cleared for the ambulance
  const INTER: { x: number; z: number; ph: number }[] = [];
  for (let i = -N; i < N; i++)
    for (let j = -N; j < N; j++) {
      const x = (i + 0.5) * P;
      const z = (j + 0.5) * P;
      if (Math.hypot(x, z) > EXT - 100) continue;
      INTER.push({ x, z, ph: hash2(i, j) * 30 });
    }
  const AVI = blds.filter((b) => b.h > 110).map((b) => new THREE.Vector3(b.x, b.h + 2, b.z));
  const MASTS = blds.filter((b, i) => b.type === 1 && b.h > 25 && i % 9 === 0).map((b) => new THREE.Vector3(b.x + b.w * 0.3, b.h + 8, b.z - b.d * 0.3));

  // drones
  const DRONES = Array.from({ length: 5200 }, (_, k) => {
    const home = WARE[k % WARE.length];
    return {
      home: home.clone().add(new THREE.Vector3((rnd() - 0.5) * 80, 0, (rnd() - 0.5) * 50)),
      launch: rnd() * 1.8,
      travel: 2.6 + rnd() * 1.6,
      orbitR: 300 + (k % 3) * 40 + rnd() * 10,
      orbitY: 120 + (k % 3) * 45 + rnd() * 6,
      ang: rnd() * Math.PI * 2,
      w: 0.16 * ((k % 3) === 1 ? -1 : 1),
      seed: rnd(),
    };
  });

  const st: CityState = { dusk: 0, offR: -1, onR: -2, blink: 1, allRed: 0, flip: boards.map(() => 0), carT: 0, hwT: 0, hwBlink: 1 };

  const carS = (c: Car, T: number) => {
    let s = c.phase + c.dir * c.speed * T;
    const L = 2 * c.len;
    s = ((s % L) + L) % L - c.len;
    return s;
  };

  const fillPoints = (mode: string, lt: number, cam: THREE.PerspectiveCamera) => {
    pts.begin();
    const camP = cam.position;
    const far2 = 4200 * 4200;
    // street cars
    const ambX = mode === "greenwave" ? -1100 + 50 * lt : 1e9;
    for (const c of CARS) {
      const s = carS(c, st.carT);
      let x: number, z: number, hx: number, hz: number;
      if (c.axis === 0) {
        x = s;
        z = c.line + c.lane;
        hx = c.dir;
        hz = 0;
      } else {
        x = c.line + c.lane;
        z = s;
        hx = 0;
        hz = c.dir;
      }
      if (mode === "greenwave" && c.axis === 0 && Math.abs(c.line - AVE_Z) < 1) {
        // cars on the avenue pull over in front of the ambulance
        if (x > ambX - 30 && x < ambX + 700) z = c.line + Math.sign(c.lane) * 10;
      }
      const dx = x - camP.x;
      const dz = z - camP.z;
      if (dx * dx + dz * dz > far2) continue;
      const b = st.hwBlink;
      pts.add(x + hx * 2.2, 0.8, z + hz * 2.2, 2.6 * b, 2.4 * b, 2.1 * b, 1.6);
      pts.add(x - hx * 2.2, 0.8, z - hz * 2.2, 1.9 * b, 0.12 * b, 0.06 * b, 1.4);
    }
    // traffic lights
    for (const it of INTER) {
      const dx = it.x - camP.x;
      const dz = it.z - camP.z;
      if (dx * dx + dz * dz > 3000 * 3000) continue;
      const on = lightsOnJS(it.x, it.z, st);
      if (on <= 0) continue;
      let ewGreen = Math.floor((lt + 1000 + it.ph) / 15) % 2 === 0;
      if (mode === "greenwave" && Math.abs(it.z - AVE_Z) < 1) {
        // red until the ambulance is close, then green ahead of it: a wave of green running down the avenue
        ewGreen = it.x > ambX - 60 && it.x < ambX + 520;
      }
      const red = st.allRed > 0.5;
      for (const [ox, oz, ew] of [
        [-13, -13, 1],
        [13, 13, 1],
        [-13, 13, 0],
        [13, -13, 0],
      ] as const) {
        const g = !red && (ew === 1 ? ewGreen : !ewGreen);
        const s = mode === "greenwave" ? 7.5 : 3.0;
        if (g) pts.add(it.x + ox, 6, it.z + oz, 0.15 * on, 3.2 * on, 1.2 * on, s);
        else pts.add(it.x + ox, 6, it.z + oz, 3.6 * on, 0.25 * on, 0.1 * on, s);
      }
    }
    // ambulance strobe
    if (mode === "greenwave") {
      const blue = Math.floor(lt * 8) % 2 === 0;
      pts.add(ambX, 3, AVE_Z - 3, blue ? 0.6 : 9, blue ? 1.2 : 0.6, blue ? 9 : 0.4, 9);
      pts.add(ambX + 3, 1.2, AVE_Z - 3, 4, 4, 3.5, 3);
    }
    // aviation lights, in sync (as they really are)
    const avOn = (Math.floor((lt + 100) * 1.0) % 2 === 0 ? 1 : 0.08) * st.blink;
    for (const a of AVI) {
      const o = lightsOnJS(a.x, a.z, st) > 0 ? 1 : 0;
      pts.add(a.x, a.y, a.z, 6 * avOn * o, 0.35 * avOn * o, 0.2 * avOn * o, 3.2);
    }
    const mOn = (Math.floor((lt + 100) * 1.6) % 2 === 0 ? 1 : 0.0) * st.blink;
    for (const a of MASTS) pts.add(a.x, a.y, a.z, 5 * mOn, 0.3 * mOn, 0.15 * mOn, 2.2);
    // hero mast beacon + status LEDs
    pts.add(MAST.x, MAST.y + 20.3, MAST.z, 14 * mOn, 0.8 * mOn, 0.4 * mOn, 0.9);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const on = Math.floor(lt * 3 + k) % 3 === 0 ? 1 : 0.3;
      pts.add(MAST.x + Math.cos(a) * 1.0, MAST.y + 13.6, MAST.z + Math.sin(a) * 1.0, 0.2, 3.5 * on, 1 * on, 0.18);
    }
    // highway cars: head and tail lights
    const hwN = HW.length;
    for (let k = 0; k < hwN; k++) {
      const c = HW[k];
      const r = RING_R - 15 + c.lane * 3.6 + (c.lane >= 4 ? 2 : 0);
      const a = c.phase + (c.dir * c.speed * st.hwT) / r;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const dx = x - camP.x;
      const dz = z - camP.z;
      const tx = -Math.sin(a) * c.dir;
      const tz = Math.cos(a) * c.dir;
      m4.compose(new THREE.Vector3(x, RING_Y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-tz, tx)), new THREE.Vector3(1, 1, 1));
      carBody.setMatrixAt(k, m4);
      if (dx * dx + dz * dz > far2) continue;
      const b = st.hwBlink;
      pts.add(x + tx * 2.3 + tz * 0.7, RING_Y + 0.7, z + tz * 2.3 - tx * 0.7, 3.2 * b, 3.0 * b, 2.6 * b, 0.7);
      pts.add(x + tx * 2.3 - tz * 0.7, RING_Y + 0.7, z + tz * 2.3 + tx * 0.7, 3.2 * b, 3.0 * b, 2.6 * b, 0.7);
      pts.add(x - tx * 2.3 + tz * 0.7, RING_Y + 0.8, z - tz * 2.3 - tx * 0.7, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
      pts.add(x - tx * 2.3 - tz * 0.7, RING_Y + 0.8, z - tz * 2.3 + tx * 0.7, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
    }
    carBody.instanceMatrix.needsUpdate = true;
    // energy pulses along the pylon wires (grid shot)
    if (mode === "grid") {
      for (const w of wireCurves) {
        for (let q = 0; q < 6; q++) {
          const f = (lt * 0.09 + q / 6 + hash1(w.length + q) * 0.05) % 1;
          const idx = Math.floor(f * (w.length - 1));
          const p = w[idx];
          for (let tail = 0; tail < 10; tail++) {
            const p2 = w[Math.max(0, idx - tail)];
            const k = 1 - tail / 10;
            pts.add(p2.x, p2.y, p2.z, 1.2 * k, 2.6 * k, 4.0 * k, 1.1 * k + 0.2);
          }
          void p;
        }
      }
    }
    // drones
    if (mode === "drones") {
      for (const d of DRONES) {
        const tt = lt - d.launch;
        let p: THREE.Vector3;
        const orbitAt = (time: number) => {
          const a = d.ang + d.w * time;
          return new THREE.Vector3(DC.x + Math.cos(a) * d.orbitR, d.orbitY + Math.sin(time * 0.7 + d.seed * 9) * 8, DC.z + Math.sin(a) * d.orbitR);
        };
        if (tt <= 0) p = d.home.clone();
        else {
          const k = clamp(tt / d.travel);
          const e = ease(k);
          const target = orbitAt(lt);
          const up = d.home.clone().setY(d.home.y + 140 + d.seed * 80);
          // quadratic bezier home → above home → orbit
          const a1 = d.home.clone().lerp(up, e);
          const a2 = up.clone().lerp(target, e);
          p = a1.lerp(a2, e);
        }
        const strobe = Math.floor((lt + d.seed * 3) * 2.2) % 3 === 0 ? 1.6 : 0.5;
        const red = d.seed < 0.25;
        pts.add(p.x, p.y, p.z, red ? 4.5 * strobe : 3.2 * strobe, red ? 0.3 : 3.4 * strobe, red ? 0.2 : 3.8 * strobe, 2.2);
      }
    }
    pts.end();
  };

  const setCam = (cam: THREE.PerspectiveCamera, pos: THREE.Vector3, tgt: THREE.Vector3, fov: number) => {
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt);
    cam.fov = fov;
    cam.near = 1;
    cam.far = 16000;
  };

  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    // defaults: night
    st.dusk = 0;
    st.offR = -1;
    st.onR = -2;
    st.blink = 1;
    st.allRed = 0;
    st.carT = gt;
    st.hwT = gt;
    st.hwBlink = 1;
    st.flip = boards.map(() => 0);
    let boardOn = 1;
    let look: Partial<Look> = { bloom: 0.6, bloomThreshold: 0.85, bloomRadius: 0.6, streak: 0.35, lift: [0.0, 0.01, 0.02], gain: [1.0, 1.0, 1.04], sat: 1.0, grain: 0.06, vignette: 0.55, exposure: 1.0 };
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let fov = 40;
    if (mode === "dusk") {
      st.dusk = 1;
      const k = lt / 8;
      pos.set(lerp(-1500, -1050, k), lerp(330, 290, k), lerp(1700, 1250, k));
      tgt.set(lerp(-150, -60, k), 150, lerp(150, 60, k));
      fov = 34;
      look = { ...look, exposure: 1.1, gain: [1.06, 1.0, 0.95], lift: [0.01, 0.008, 0.02] };
    } else if (mode === "greenwave") {
      st.dusk = 0.55;
      const ax = -1100 + 50 * lt;
      pos.set(ax - 240, 290, AVE_Z + 250);
      tgt.set(ax + 170, 0, AVE_Z - 20);
      fov = 36;
    } else if (mode === "grid") {
      st.dusk = 1;
      const p0 = PYL[3];
      pos.copy(p0).addScaledVector(side, 60).add(new THREE.Vector3(0, 8 + lt * 1.5, 0)).addScaledVector(pylDir, -120 + lt * 6);
      tgt.copy(PYL[6]).add(new THREE.Vector3(0, 40, 0)).addScaledVector(pylDir, 400);
      fov = 36;
      look = { ...look, exposure: 1.15, gain: [1.06, 1.0, 0.94] };
    } else if (mode === "highway") {
      st.dusk = 0.85;
      const a = 2.55 + lt * 0.004;
      const r = RING_R + 95;
      pos.set(Math.cos(a) * r, 46, Math.sin(a) * r);
      const a2 = a - 0.09;
      tgt.set(Math.cos(a2) * RING_R, RING_Y + 2, Math.sin(a2) * RING_R);
      fov = 24;
      look = { ...look, gain: [1.05, 1.0, 0.96] };
    } else if (mode === "masts") {
      st.dusk = 0.75;
      const a = 0.6 + lt * 0.07;
      pos.set(MAST.x + Math.cos(a) * 24, MAST.y + 9 + lt * 0.4, MAST.z + Math.sin(a) * 24);
      tgt.set(MAST.x, MAST.y + 12, MAST.z);
      fov = 42;
      look = { ...look, dof: 10, focus: 24, aperture: 0.6 };
    } else if (mode === "blackout") {
      const k = lt;
      pos.set(-1500 + k * 10, 1050 - k * 5, 1950 - k * 8);
      tgt.set(150, 0, -150);
      fov = 46;
      st.offR = 4200 * easeIn(clamp((k - 0.4) / 2.6)) * 1.0 + (k > 0.4 ? 10 : -1);
      st.onR = k < 4.6 ? -2 : 4300 * ease(clamp((k - 4.6) / 3.0));
      if (k > 0.4 && k < 3.2) look.flash = 0;
      look.streak = 0.45;
    } else if (mode === "freeze") {
      const a = 4.05 + lt * 0.0025;
      const r = RING_R + 60;
      pos.set(Math.cos(a) * r, 34, Math.sin(a) * r);
      const a2 = a + 0.12;
      tgt.set(Math.cos(a2) * RING_R, RING_Y, Math.sin(a2) * RING_R);
      fov = 22;
      // every car stops at once at lt = 2.0, then all headlights blink twice
      const tf = shot.t0 - (shot.o ?? 0) + 2.0;
      const stopT = (t: number) => (t < tf ? t : tf + 0.35 * (1 - Math.exp(-(t - tf) / 0.35)));
      st.hwT = stopT(gt);
      st.carT = stopT(gt);
      const b1 = lt > 3.4 && lt < 3.62;
      const b2 = lt > 4.0 && lt < 4.22;
      st.hwBlink = b1 || b2 ? 0.0 : 1;
      look.streak = 0.5;
    } else if (mode === "redlights") {
      st.allRed = 1;
      st.carT = 100;
      st.hwT = 100;
      pos.set(-30 + lt * 2, 70, 1650);
      tgt.set(-30, 0, -400);
      fov = 30;
    } else if (mode === "billboards") {
      st.carT = 100;
      st.hwT = 100;
      st.allRed = 1;
      const b0 = boards[0];
      const by = (b0.mesh.position.y as number);
      pos.set(b0.x - 140 + lt * 5, by - 40 + lt * 3, b0.z + 420 - lt * 6);
      tgt.set(b0.x - 20, by + 10, b0.z);
      fov = 42;
      st.flip = boards.map((_, i) => ease(clamp((lt - 0.9 - i * 0.18) / 0.45)));
    } else if (mode === "drones") {
      st.carT = 100;
      st.hwT = 100;
      st.allRed = 1;
      const k = lt;
      pos.set(DC.x - 1350 + k * 14, 260 + k * 3, DC.z + 900 - k * 8);
      tgt.set(DC.x, 110 + k * 2, DC.z);
      fov = 30;
      look.streak = 0.5;
    } else if (mode === "rise") {
      const k = ease(clamp(lt / 7.6));
      pos.set(lerp(-380, -200, k), lerp(70, 3800, easeIn(clamp(lt / 7.6)) * 0.85 + k * 0.15), lerp(900, 300, k));
      tgt.set(lerp(-100, -150, k), 0, lerp(-200, 260, k));
      fov = lerp(50, 60, k);
      look.zoomBlur = lt < 1.0 ? (1 - lt) * 1.2 : 0;
      look.exposure = lt < 0.8 ? 1 + (0.8 - lt) * 3 : 1;
    } else if (mode === "glimpse") {
      pos.set(-1800, 1200, 2400);
      tgt.set(0, 0, 0);
    }
    pos.x += drift(gt, 3, mode === "masts" ? 0.3 : 2.0);
    pos.y += drift(gt, 4, mode === "masts" ? 0.2 : 1.5);
    setCam(cam, pos, tgt, fov);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    bldU.uCam.value.copy(cam.position);
    bldU.uT.value = gt;
    bldU.uOffR.value = st.offR;
    bldU.uOnR.value = st.onR;
    bldU.uBlink.value = st.blink;
    bldU.uDusk.value = st.dusk;
    bldU.uFogD.value = lerp(0.00024, 0.00018, st.dusk);
    bldU.uFog.value.setRGB(lerp(0.013, 0.085, st.dusk), lerp(0.011, 0.062, st.dusk), lerp(0.013, 0.07, st.dusk));
    skyU.uGlow.value = st.offR > 0 && st.onR < st.offR ? lerp(1, 0.35, clamp(st.offR / 3000) - clamp(st.onR / 3000)) : 1;
    hemi.intensity = lerp(0.35, 0.9, st.dusk);
    sun.intensity = st.dusk * 1.4;
    ptU.uScale.value = H / (2 * Math.tan((cam.fov * Math.PI) / 360));
    boards.forEach((b, i) => {
      b.u.uFlip.value = st.flip[i];
      b.u.uOn.value = boardOn * lightsOnJS(b.x, b.z, st);
    });
    void boardOn;
    void easeOut;
    void sstep;
    fillPoints(mode, lt, cam);
    return look;
  };

  return { scene, ready: Promise.resolve(), update };
};

// minimal geometry merge (positions + normals) to avoid pulling BufferGeometryUtils' attribute checks
function mergeGeos(gs: THREE.BufferGeometry[]) {
  let n = 0;
  const ng = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of ng) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of ng) {
    const p = g.getAttribute("position").array as Float32Array;
    g.computeVertexNormals();
    const q = g.getAttribute("normal").array as Float32Array;
    pos.set(p, o * 3);
    nor.set(q, o * 3);
    o += g.getAttribute("position").count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}
