// The machine hall where the AI runs: a long cold aisle between server racks, blue status LEDs, ceiling light strips,
// a glossy raised floor (mirrored geometry under a semi-transparent tile floor), haze and dust. On shutdown the racks
// die in a wave that runs toward the camera, then a red emergency beacon turns. Units: metres; aisle runs along -z.
import * as THREE from "three";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { clamp, drift, easeIn, lerp, mulberry, sstep } from "./util";

const RACKS = 92;
const PITCH = 0.6;
const AISLE = 1.2; // half width

const RACK_VERT = /* glsl */ `
attribute vec3 aRack; // seed, row side (+1 right / -1 left), z
varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec3 vRack;
void main(){
  mat4 m = modelMatrix * instanceMatrix;
  vec4 w = m * vec4(position, 1.0);
  vW = w.xyz; vL = position; vN = normalize(mat3(m) * normal); vRack = aRack;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const RACK_FRAG = /* glsl */ `
uniform float uT, uWave, uRed, uFogD; uniform vec3 uCam, uFog;
varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec3 vRack;
${NOISE}
float alive(float z){
  // 1 = running, 0 = dead; flicker at the wave front
  float d = z - uWave;
  float base = step(0.0, d);
  float edge = smoothstep(1.8, 0.0, abs(d));
  float fl = step(0.5, h21(vec2(floor(uT * 24.0), z * 13.0)));
  return mix(base, fl, edge * 0.8);
}
void main(){
  vec3 n = normalize(vN);
  float seed = vRack.x; float zr = vRack.z;
  float on = alive(zr);
  vec3 col = vec3(0.010, 0.011, 0.013);
  float dist = length(vW - uCam);
  // the face that looks into the aisle: local +x of the box after the row's rotation
  bool front = vL.x > 0.499;
  vec3 V = normalize(vW - uCam);
  if (front) {
    float u = (vL.z + 0.5) * 0.6; // 0..0.6 m across
    float v = (vL.y + 0.5) * 2.2; // 0..2.2 m up
    float U = 0.0445;
    float ui = floor((v - 0.12) / U);
    float fu = fract((v - 0.12) / U);
    float inside = step(0.12, v) * step(v, 0.12 + 42.0 * U) * step(0.03, u) * step(u, 0.57);
    float r = h21(vec2(ui, seed));
    float span = r < 0.18 ? 0.0 : r < 0.55 ? 1.0 : r < 0.8 ? 2.0 : 3.0; // blank, server, storage, switch
    vec3 face = vec3(0.025, 0.027, 0.03) + vec3(0.03, 0.035, 0.045) * smoothstep(0.0, 1.0, fu) * 0.3;
    // vents
    if (span == 1.0) face *= 0.7 + 0.3 * step(0.5, fract(u * 160.0));
    // seams between units
    face *= 0.6 + 0.4 * smoothstep(0.0, 0.08, fu) * smoothstep(1.0, 0.92, fu);
    vec3 led = vec3(0.0);
    if (span == 1.0) {
      // two LEDs on the right of a 1U server
      for (int k = 0; k < 2; k++) {
        vec2 c = vec2(0.50 + 0.025 * float(k), 0.5);
        float d = length((vec2(u, fu * U) - vec2(c.x, c.y * U)) / vec2(1.0, 1.0));
        float b = step(0.4, h21(vec2(floor(uT * (3.0 + 8.0 * h11(seed + ui)) + ui), seed + float(k))));
        vec3 lc = k == 0 ? vec3(0.25, 0.65, 1.0) : vec3(0.3, 1.0, 0.5);
        led += lc * smoothstep(0.0035, 0.0012, d) * mix(0.15, 1.0, b);
      }
    } else if (span == 2.0) {
      // drive bays, each with an activity light
      float bay = floor((u - 0.03) / 0.045);
      float bx = 0.03 + (bay + 0.5) * 0.045;
      float d = length(vec2(u - bx, (fu - 0.25) * U));
      float b = step(0.55, h21(vec2(floor(uT * 12.0 + bay * 3.0), seed + ui * 7.0 + bay)));
      led += vec3(0.25, 0.6, 1.0) * smoothstep(0.003, 0.001, d) * mix(0.1, 1.2, b);
      face *= 0.75 + 0.25 * step(0.08, fract((u - 0.03) / 0.045));
    } else if (span == 3.0) {
      // switch ports: rows of tiny green/amber lights
      float port = floor((u - 0.06) / 0.018);
      float px = 0.06 + (port + 0.5) * 0.018;
      float d = length(vec2(u - px, (fu - 0.3) * U));
      float b = step(0.35, h21(vec2(floor(uT * 20.0 + port), seed + ui + port * 1.3)));
      vec3 lc = h21(vec2(port, seed)) < 0.85 ? vec3(0.4, 1.0, 0.4) : vec3(1.0, 0.65, 0.2);
      led += lc * smoothstep(0.0022, 0.0008, d) * b * step(0.06, u) * step(u, 0.5);
    }
    // a light bar on some racks
    float bar = smoothstep(0.004, 0.0, abs(u - 0.3) - 0.24) * smoothstep(0.004, 0.0, abs(v - 2.05) - 0.006);
    led += vec3(0.25, 0.55, 1.0) * bar * step(0.5, h11(seed * 3.0)) * 0.6;
    col = mix(col, face, inside);
    // ceiling lights reflected in the faceplates
    col += vec3(0.6, 0.75, 1.0) * 0.03 * pow(clamp(dot(reflect(V, n), vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 6.0) * on;
    col += led * 6.0 * on * inside;
  } else {
    col *= 0.6;
  }
  // red emergency light sweeping
  float sweep = pow(0.5 + 0.5 * sin(uT * 3.2 + vW.z * 0.15), 6.0);
  col += vec3(1.0, 0.05, 0.03) * uRed * 0.05 * sweep * (front ? 1.0 : 0.3);
  col = mix(uFog * (0.4 + 0.6 * on), col, exp(-dist * uFogD));
  gl_FragColor = vec4(col, 1.0);
}`;

const SIMPLE_VERT = /* glsl */ `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FLOOR_FRAG = /* glsl */ `
uniform float uT, uWave, uRed, uFogD; uniform vec3 uCam, uFog;
varying vec3 vW;
${NOISE}
void main(){
  vec2 p = vW.xz / 0.6;
  vec2 f = fract(p);
  float seam = 1.0 - smoothstep(0.0, 0.02, f.x) * smoothstep(1.0, 0.98, f.x) * smoothstep(0.0, 0.02, f.y) * smoothstep(1.0, 0.98, f.y);
  float perf = step(abs(vW.x), 0.6) * step(0.5, h21(floor(p)));
  float holes = perf * smoothstep(0.25, 0.15, length(fract(vW.xz * 40.0) - 0.5));
  vec3 tile = vec3(0.035, 0.037, 0.04) * (0.85 + 0.3 * vnoise(vW.xz * 3.0));
  float dist = length(vW - uCam);
  float on = step(0.0, vW.z - uWave);
  // the reflection is the mirrored world showing through; tiles are glossy so let most of it through
  float a = mix(0.62, 1.0, max(seam, holes * 0.8));
  vec3 c = tile * (0.5 + 0.5 * on) * (1.0 - holes * 0.6);
  c += vec3(1.0, 0.05, 0.03) * uRed * 0.02;
  c = mix(uFog, c, exp(-dist * uFogD));
  gl_FragColor = vec4(c, a);
}`;

const STRIP_FRAG = /* glsl */ `
uniform float uWave, uT, uFogD; uniform vec3 uCam, uFog; varying vec3 vW;
${NOISE}
void main(){
  float d = vW.z - uWave;
  float on = mix(step(0.0, d), step(0.5, h21(vec2(floor(uT * 24.0), floor(vW.z / 2.4)))), smoothstep(2.0, 0.0, abs(d)) * 0.8);
  vec3 c = vec3(0.75, 0.88, 1.0) * 3.2 * on;
  float dist = length(vW - uCam);
  gl_FragColor = vec4(mix(uFog, c, exp(-dist * uFogD)), 1.0);
}`;

const SHAFT_FRAG = /* glsl */ `
uniform float uWave, uT; varying vec3 vW; varying vec2 vUv;
${NOISE}
void main(){
  float on = step(0.0, vW.z - uWave);
  float a = pow(vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
  a *= 0.6 + 0.4 * fbm(vec2(vW.x * 2.0 + uT * 0.05, vW.y * 1.5 + vW.z * 0.3));
  gl_FragColor = vec4(vec3(0.5, 0.65, 0.9) * a * 0.05 * on, 1.0);
}`;

const DUST_VERT = /* glsl */ `
attribute float aSeed; uniform float uT, uScale; varying float vA;
${NOISE}
void main(){
  vec3 p = position;
  p.x += sin(uT * 0.2 + aSeed * 30.0) * 0.15; p.y += sin(uT * 0.13 + aSeed * 17.0) * 0.2 + uT * 0.01; p.z += cos(uT * 0.17 + aSeed * 11.0) * 0.15;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, 0.006 * uScale / -mv.z);
  vA = (0.5 + 0.5 * sin(uT * 0.7 + aSeed * 50.0)) * smoothstep(0.2, 2.0, -mv.z) * smoothstep(14.0, 4.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FRAG = /* glsl */ `uniform float uOn; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.6, 0.75, 1.0) * smoothstep(0.5, 0.0, r) * vA * 0.5 * uOn, 1.0); }`;

export const serverScene = (): SceneMod => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const rnd = mulberry(4242);
  const U = {
    uT: { value: 0 }, uWave: { value: -999 }, uRed: { value: 0 }, uFogD: { value: 0.045 },
    uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color(0.012, 0.02, 0.035) },
  };

  const world = new THREE.Group();
  // racks: rows at x = ±(AISLE + 0.55) facing the aisle, plus two farther rows seen through the cross aisles
  const rows: { x: number; face: number }[] = [
    { x: AISLE + 0.55, face: -1 },
    { x: -(AISLE + 0.55), face: 1 },
    { x: AISLE + 3.9, face: -1 },
    { x: -(AISLE + 3.9), face: 1 },
  ];
  const list: { x: number; z: number; face: number; seed: number }[] = [];
  for (const r of rows)
    for (let k = 0; k < RACKS; k++) {
      if (k % 16 === 15) continue; // cross aisle
      list.push({ x: r.x, z: -k * PITCH - 0.3, face: r.face, seed: rnd() * 100 });
    }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const rackMat = new THREE.ShaderMaterial({ vertexShader: RACK_VERT, fragmentShader: RACK_FRAG, uniforms: U });
  const racks = new THREE.InstancedMesh(geo, rackMat, list.length);
  const aRack = new Float32Array(list.length * 3);
  const m4 = new THREE.Matrix4();
  list.forEach((r, i) => {
    // local +x is the front; rotate so it faces the aisle
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.face > 0 ? 0 : Math.PI);
    m4.compose(new THREE.Vector3(r.x, 1.1, r.z), q, new THREE.Vector3(1.1, 2.2, 0.6));
    racks.setMatrixAt(i, m4);
    aRack.set([r.seed, r.face, r.z], i * 3);
  });
  geo.setAttribute("aRack", new THREE.InstancedBufferAttribute(aRack, 3));
  racks.frustumCulled = false;
  world.add(racks);

  // ceiling light strips over the aisle and cable trays over the racks
  const stripMat = new THREE.ShaderMaterial({ vertexShader: SIMPLE_VERT, fragmentShader: STRIP_FRAG, uniforms: U });
  for (let k = 0; k < 24; k++) {
    for (const x of [0, AISLE + 3.9 - 1.7, -(AISLE + 3.9 - 1.7)]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.8), stripMat);
      s.position.set(x, 3.4, -k * 2.4 - 1.0);
      world.add(s);
    }
  }
  const trayMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.018, 0.015, 0.008) });
  for (const x of [AISLE + 0.55, -(AISLE + 0.55)]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 60), trayMat);
    t.position.set(x, 2.75, -28);
    world.add(t);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 70).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x030405 }));
  ceil.position.set(0, 3.6, -30);
  world.add(ceil);
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshBasicMaterial({ color: 0x020304 }));
  endWall.position.set(0, 2, -56);
  world.add(endWall);
  // red emergency beacon at the far end
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) }));
  beacon.position.set(0, 3.0, -54);
  world.add(beacon);
  scene.add(world);

  // the reflection: the same world mirrored under the floor
  const mirror = world.clone();
  mirror.scale.y = -1;
  scene.add(mirror);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 70).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: SIMPLE_VERT, fragmentShader: FLOOR_FRAG, uniforms: U, transparent: true }),
  );
  floor.position.set(0, 0, -30);
  floor.renderOrder = 2;
  scene.add(floor);

  // light shafts under the strips
  const shaftMat = new THREE.ShaderMaterial({ vertexShader: SIMPLE_VERT, fragmentShader: SHAFT_FRAG, uniforms: U, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let k = 0; k < 24; k++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.3), shaftMat);
    s.position.set(0, 1.7, -k * 2.4 - 1.0);
    s.rotation.y = Math.PI / 2;
    s.renderOrder = 3;
    scene.add(s);
  }

  // dust
  const DN = 3000;
  const dp = new Float32Array(DN * 3);
  const ds = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dp.set([(rnd() - 0.5) * 2.4, rnd() * 3.2, -rnd() * 20], i * 3);
    ds[i] = rnd();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  dg.setAttribute("aSeed", new THREE.BufferAttribute(ds, 1));
  const dustU = { uT: U.uT, uScale: { value: 1 }, uOn: { value: 1 } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: dustU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.frustumCulled = false;
  dust.renderOrder = 4;
  scene.add(dust);

  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    U.uT.value = gt;
    U.uWave.value = -999;
    U.uRed.value = 0;
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let fov = 40;
    const look: Partial<Look> = { bloom: 0.9, bloomThreshold: 0.6, bloomRadius: 0.55, streak: 0.4, lift: [0.0, 0.008, 0.02], gain: [0.92, 1.0, 1.12], sat: 0.95, vignette: 0.65, grain: 0.065 };
    if (mode === "aisle") {
      pos.set(0, 1.5, 2.2 - lt * 0.5);
      tgt.set(0, 1.35, -40);
      fov = 42;
    } else if (mode === "poweroff") {
      pos.set(0.18, 1.05, 1.8 - lt * 0.05);
      tgt.set(0, 1.25, -40);
      fov = 44;
      U.uWave.value = lerp(-58, 4, easeIn(clamp((lt - 0.3) / 2.6)));
      if (lt < 0.3) U.uWave.value = -999;
      U.uRed.value = sstep(3.9, 5.0, lt);
      look.exposure = 1 + U.uRed.value * 0.6;
    } else if (mode === "leds") {
      pos.set(0.35, 1.32, -6.0 + lt * 0.12);
      tgt.set(1.2, 1.2, -7.6);
      fov = 30;
      look.dof = 22;
      look.focus = pos.distanceTo(new THREE.Vector3(1.2, 1.25, -7.1));
      look.aperture = 3;
    }
    if (mode === "poweroff" && lt > 3.0) {
      const red = U.uRed.value * Math.pow(0.5 + 0.5 * Math.sin(gt * 3.2), 4);
      (beacon.material as THREE.MeshBasicMaterial).color.setRGB(12 * red, 0.3 * red, 0.2 * red);
    } else (beacon.material as THREE.MeshBasicMaterial).color.setRGB(0, 0, 0);
    dustU.uOn.value = mode === "poweroff" ? 1 - sstep(1.0, 3.0, lt) * 0.85 : 1;
    pos.x += drift(gt, 7, 0.01);
    pos.y += drift(gt, 8, 0.008);
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt);
    cam.fov = fov;
    cam.near = 0.05;
    cam.far = 120;
    U.uCam.value.copy(pos);
    dustU.uScale.value = H / (2 * Math.tan((fov * Math.PI) / 360));
    return look;
  };
  return { scene, ready: Promise.resolve(), update };
};
