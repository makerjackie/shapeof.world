// The city: a procedural metropolis at dusk and at night. Buildings are one instanced box mesh whose shader draws
// windows, glass, street-level glow and the blackout; the ground shader draws streets and street-light pools; cars,
// traffic lights, aviation lights and drones are point sprites recomputed per frame from time. Units: metres.
import * as THREE from "three";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { drawBillboard } from "./screens";
import { clamp, drift, ease, easeIn, easeOut, hash1, hash2, lerp, mulberry, sstep } from "./util";

const P = 110; // block pitch
const STREET = 24;
const N = 44; // blocks each side of the centre: dense core out to ~2.6 km, low-rise suburbs out to ~4.8 km
const EXT = N * P;
const CORE = 24 * P;
// beyond the modelled blocks, the ground shader keeps drawing lit streets (a carpet of light) out to the horizon
const CARPET = 17000;
const OUT_R = 18000; // blackout / relight fronts sweep out this far
const RING_R = 1150;
const RING_Y = 22;
const DC = new THREE.Vector3(1950, 0, -1650); // data-centre campus
const AVE_Z = 0.5 * P; // the avenue of the green wave
// a river winds across the whole plain, south of downtown; every fourth north-south street bridges it
const riverZ = (x: number) => 700 + 350 * Math.sin(x / 900) + 120 * Math.sin(x / 370 + 1.3);
const riverW = (x: number) => 130 + 40 * Math.sin(x / 1300);
const inRiver = (x: number, z: number, pad = 0) => Math.abs(z - riverZ(x)) < riverW(x) / 2 + pad;
// the pylon line on the western outskirts runs down a cleared corridor (fields, no streets) into the city
const corridorJS = (x: number, z: number) => {
  const dx = 1650 / 1972.5, dz = -1080 / 1972.5;
  const qx = x + 4200, qz = z - 1500;
  const along = qx * dx + qz * dz;
  const perp = Math.abs(qx * dz - qz * dx);
  return perp < 420 && along < 1900;
};
const isBridge = (lineX: number) => (((Math.round(lineX / P - 0.5) % 4) + 4) % 4) === 0;

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
float riverZ(float x){ return 700.0 + 350.0 * sin(x / 900.0) + 120.0 * sin(x / 370.0 + 1.3); }
float riverW(float x){ return 130.0 + 40.0 * sin(x / 1300.0); }
float corridor(vec2 p){
  vec2 d = vec2(1650.0, -1080.0) / 1972.5; vec2 q = p - vec2(-4200.0, 1500.0);
  float along = dot(q, d); float perp = abs(q.x * d.y - q.y * d.x);
  return (1.0 - smoothstep(260.0, 420.0, perp)) * (1.0 - smoothstep(1650.0, 1900.0, along));
}
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
uniform float uGlow; // 1 = the city's light pollution lights the haze; drops during the blackout
uniform vec2 uSun; // horizontal direction of the afterglow at dusk
vec3 skyCol(vec3 d){
  float e = max(d.y, 0.0);
  vec3 nightTop = vec3(0.0025, 0.004, 0.009), nightMid = vec3(0.012, 0.014, 0.024);
  vec3 nightHor = mix(vec3(0.010, 0.012, 0.019), vec3(0.050, 0.034, 0.028), uGlow);
  vec3 duskTop = vec3(0.006, 0.014, 0.045), duskHor = vec3(0.40, 0.17, 0.07);
  float west = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), uSun);
  vec3 dHor = mix(vec3(0.035, 0.06, 0.13), duskHor, pow(west, 2.5));
  // night: a thin band of sodium haze on the horizon, quickly giving way to a deep blue-black
  vec3 night = mix(nightHor, nightMid, 1.0 - exp(-e * 9.0));
  night = mix(night, nightTop, smoothstep(0.08, 0.7, e));
  vec3 dusk = mix(dHor, duskTop, smoothstep(0.0, 0.45, pow(e, 0.6)));
  return mix(night, dusk, uDusk);
}
// aerial perspective: distant things melt into the colour of the sky right behind them
vec3 fogTo(vec3 col, vec3 wp, vec3 cam, float dens){
  vec3 v = wp - cam;
  float dist = length(v);
  float hk = mix(1.0, 0.25, clamp(wp.y / 400.0, 0.0, 1.0));
  float f = exp(-dist * dens * hk);
  vec3 d = normalize(v);
  vec3 fc = skyCol(normalize(vec3(d.x, max(d.y, 0.0) * 0.25 + 0.004, d.z)));
  return mix(fc, col, f);
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
// a thin light line at distance d from it, width w (m); thinner than a pixel it fades to its average instead of aliasing
float lineAA(float d, float w){
  float px = max(fwidth(d), 1e-4);
  return smoothstep(w + px, w - px, d) * min(1.0, w / px);
}
void main(){
  float seed = vInfo.x; float typ = vInfo.y; float litF = vInfo.z; float isRound = vInfo.w;
  vec3 n = normalize(vN);
  vec3 V = normalize(vW - uCam);
  float on = lightsOn(vCenter.xz);
  float top = vCenter.y + vSize.y;
  float hRel = vW.y - vCenter.y;
  vec2 rel = vW.xz - vCenter.xz;
  vec3 col;
  vec3 streetGlow = mix(vec3(1.0, 0.55, 0.22), vec3(0.85, 0.82, 0.75), smoothstep(0.58, 0.72, fbm(vCenter.xz * 0.0011 + 7.3)));
  float up = exp(-hRel / 10.0) * 0.03 * on;
  // skins: near-black glass, dark concrete, a little warm stone; at night the walls should read as silhouettes
  float tone = h11(seed * 1.31);
  vec3 skin = tone < 0.4 ? vec3(0.006, 0.007, 0.009) : tone < 0.8 ? vec3(0.011, 0.011, 0.012) : vec3(0.016, 0.013, 0.011);
  skin *= 1.0 + 0.5 * uDusk;
  // facade lighting, the signature of a Chinese city at night: towers outlined with LED strips along every corner and
  // the roof line, some with bands every few floors
  float fl = h11(seed + 11.0);
  float contour = typ < 0.5 && ((vSize.y > 150.0 && fl < 0.4) || vSize.y > 240.0) ? 1.0 : 0.0;
  float cc = h11(seed + 12.0);
  vec3 ledC = cc < 0.5 ? vec3(1.0, 0.70, 0.36) : cc < 0.82 ? vec3(0.85, 0.92, 1.0) : vec3(0.35, 0.78, 1.0);
  float ledI = 1.1 * on * mix(1.0, 0.45, uDusk);
  if (typ > 2.5) {
    // rooftop plant: plain metal boxes with a faint sky sheen on top
    col = vec3(0.010, 0.011, 0.013) * (0.8 + 0.4 * vnoise(vW.xz * 0.5 + vW.y));
    if (n.y > 0.5) col += skyCol(vec3(0.0, 1.0, 0.0)) * 0.10;
    col += streetGlow * up * 0.5;
    col *= 0.7 + 0.3 * smoothstep(vCenter.y, vCenter.y + 1.5, vW.y);
  } else if (n.y > 0.5) {
    // roof: dark membrane, a parapet edge catching the sky, a few service lights
    col = vec3(0.006, 0.007, 0.008) * (0.8 + 0.4 * vnoise(vW.xz * 0.3)) * (0.8 + 1.8 * h11(seed + 21.0));
    col += skyCol(vec3(0.0, 1.0, 0.0)) * 0.06;
    vec2 e2 = 0.5 * vSize.xz - abs(rel);
    float e = isRound > 0.5 ? 0.5 * vSize.x - length(rel) : min(e2.x, e2.y);
    float rim = 1.0 - smoothstep(0.4, 1.1, e);
    col = mix(col, skin * 1.8 + skyCol(vec3(0.0, 1.0, 0.0)) * 0.15, rim);
    vec2 g = floor(vW.xz / 7.0);
    float l = step(0.985, h21(g + seed)) * smoothstep(0.7, 0.3, length(fract(vW.xz / 7.0) - 0.5) * 7.0);
    col += vec3(1.0, 0.8, 0.6) * l * 0.6 * on;
    col += ledC * ledI * contour * lineAA(e, 0.45);
  } else {
    float hcoord, faceId, edgeD;
    if (isRound > 0.5) {
      float ang = atan(rel.y, rel.x);
      float R = 0.5 * vSize.x;
      hcoord = ang * R;
      faceId = 1.0 + floor((ang + 3.14159) / 1.5708);
      float sp = 6.28318 * R / 16.0; // sixteen vertical ribs stand in for corners
      edgeD = abs(mod(hcoord + 0.5 * sp, sp) - 0.5 * sp);
    } else {
      bool xf = abs(n.x) > 0.5;
      hcoord = xf ? vW.z * sign(n.x) : -vW.x * sign(n.z);
      faceId = xf ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
      edgeD = 0.5 * (xf ? vSize.z : vSize.x) - abs(xf ? rel.y : rel.x);
    }
    // real proportions: a 1.5 m curtain-wall module on offices, 1.3 m windows on 2.4 m bays in housing
    float fh = typ < 0.5 ? 4.0 : typ < 1.5 ? 2.95 : 6.0;
    float cw = typ < 0.5 ? 1.5 : 2.4;
    vec2 uvw = vec2(hcoord / cw, (vW.y - 1.5) / fh);
    vec2 cell = floor(uvw); vec2 f = fract(uvw);
    vec2 fw = fwidth(uvw);
    float balcony = typ > 0.5 && typ < 1.5 && mod(cell.x, 3.0) < 0.5 ? 1.0 : 0.0;
    // anti-aliasing in two steps: once a window is under a pixel wide, each floor/bay keeps its own average (so lit
    // floors still read as bands from a kilometre away); only once whole floors are sub-pixel does it fall back to the
    // building's overall average
    float aaX = smoothstep(0.25, 0.7, fw.x);
    float aaY = smoothstep(0.45, 0.95, fw.y);
    vec2 wmin = typ < 0.5 ? vec2(0.05, 0.10) : balcony > 0.5 ? vec2(0.08, 0.10) : vec2(0.23, 0.30);
    vec2 wmax = typ < 0.5 ? vec2(0.95, 0.93) : balcony > 0.5 ? vec2(0.92, 0.80) : vec2(0.77, 0.80);
    float win = step(wmin.x, f.x) * step(f.x, wmax.x) * step(wmin.y, f.y) * step(f.y, wmax.y);
    if (typ > 1.5) win = 0.0;
    // offices light whole floors or long bays; homes light rooms, and rooms stack (the same column lit floor after floor)
    float bay = floor(cell.x / (6.0 + floor(h11(seed + 4.0) * 10.0)));
    float unit = floor(cell.x / 3.0);
    float rFloor = h21(vec2(cell.y * 1.3, seed + faceId));
    float rBay = h21(vec2(cell.y * 0.7 + bay * 3.1, seed * 1.7 + faceId));
    float rWin = h21(cell + seed * 13.0 + faceId * 7.1);
    float rCol = h21(vec2(cell.x * 2.1 + faceId, seed * 0.37));
    float rUnit = h21(vec2(unit * 1.7 + faceId * 13.0, cell.y + seed * 3.3));
    float r = typ < 0.5 ? mix(rFloor, rBay, 0.22) : mix(rWin, rUnit, 0.8);
    // fewer lights high up in homes (it is 3 a.m. somewhere in this film), offices stay lit
    float lit = step(r, litF);
    float k = h21(cell * 1.7 + seed);
    vec3 wc = typ < 0.5 ? (h11(seed + 6.0) < 0.6 ? vec3(0.95, 0.88, 0.76) : vec3(0.8, 0.87, 1.0)) : (k < 0.7 ? vec3(1.0, 0.64, 0.34) : k < 0.97 ? vec3(1.0, 0.8, 0.58) : vec3(0.45, 0.6, 1.0) * (0.7 + 0.3 * sin(uT * 9.0 + k * 50.0)));
    float sp = h21(cell * 3.1 + seed * 7.0);
    float wint = (typ < 0.5 ? (0.10 + 0.55 * sp * sp * sp) * (0.6 + 0.6 * h21(vec2(bay, cell.y))) : (0.12 + 0.8 * pow(h21(vec2(unit, cell.y) + 3.3), 2.0)) * (balcony > 0.5 ? 0.8 : 1.0));
    // inside the window: ceiling lights bright at the top, a blind pulled part way down in some
    float blind = step(0.72, h21(cell * 2.9 + seed)) * (0.35 + 0.4 * h21(cell + 7.7));
    float fy = (f.y - wmin.y) / (wmax.y - wmin.y);
    float inner = mix(0.7, 1.15, smoothstep(0.1, 0.95, fy));
    inner *= fy > 1.0 - blind ? 0.45 : 1.0;
    float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
    vec3 Rf = reflect(V, n);
    vec3 glass = mix(vec3(0.003), skyCol(Rf), smoothstep(-0.06, 0.04, Rf.y)) * (typ < 0.5 ? 0.12 + 0.8 * fres : 0.05 + 0.2 * fres) * (0.6 + 0.4 * smoothstep(0.0, 200.0, vW.y));
    vec3 wall = skin * (0.85 + 0.3 * vnoise(vec2(hcoord, vW.y) * 0.2));
    if (typ < 0.5) wall = mix(wall, glass * 0.8, 0.55);
    // spandrel band between floors on the towers, darker; thin mullions catch a little light
    if (typ < 0.5) wall *= 0.7 + 0.3 * step(0.5, f.y);
    // housing: the balcony slab edge at each floor line catches the street light
    if (balcony > 0.5) wall += streetGlow * 0.012 * on * smoothstep(0.1, 0.0, f.y) * (1.0 - aaY);
    vec3 winCol = mix(glass, wc * wint * inner * on, lit);
    vec3 pattern = mix(wall, winCol, win);
    float area = (wmax.x - wmin.x) * (wmax.y - wmin.y);
    vec3 cellAvg = mix(wall, mix(glass, wc * wint * on, lit), typ > 1.5 ? 0.0 : area);
    vec3 avg = mix(wall, mix(glass, wc * 0.55 * on, litF), typ > 1.5 ? 0.0 : area);
    col = mix(mix(pattern, cellAvg, aaX), avg, aaY);
    // two faces of every box a touch darker, so corners read
    col *= faceId < 2.5 ? 1.0 : 0.8;
    // dusk light on west faces
    col += vec3(1.0, 0.45, 0.2) * 0.02 * uDusk * max(0.0, dot(n, normalize(vec3(-1.0, 0.2, 0.35))));
    col += streetGlow * up;
    // ground floor: shopfronts and lobbies glowing onto the pavement
    if (typ < 1.5) {
      float shop = step(hRel, 4.6) * step(0.8, hRel) * step(0.35, h21(vec2(floor(hcoord / 6.0), seed)));
      col += mix(vec3(1.0, 0.72, 0.45), vec3(0.75, 0.85, 1.0), step(0.6, h11(seed + 5.0))) * shop * 0.22 * on;
    }
    // LED outlines: corners (or ribs), the roof line, and on some towers a band every few floors
    if (contour > 0.5) {
      float L = lineAA(edgeD, 0.35) + lineAA(top - vW.y, 0.5);
      if (h11(seed + 13.0) < 0.0) L += 0.7 * lineAA(abs(mod(vW.y - 1.5 + 2.0 * fh, 4.0 * fh) - 2.0 * fh), 0.3) * step(8.0, hRel);
      col = mix(col, ledC * ledI, clamp(L, 0.0, 1.0));
    }
    // a lit crown on some of the tallest
    if (typ < 0.5 && vSize.y > 140.0 && h11(seed + 8.0) < 0.55) col += vec3(0.75, 0.85, 1.0) * smoothstep(9.0, 0.0, top - vW.y) * 0.5 * on;
    // horizontal light strips on the data centre
    if (typ > 1.5) col += vec3(0.6, 0.85, 1.0) * smoothstep(0.08, 0.0, abs(fract(vW.y / 6.0) - 0.5)) * 0.25 * on;
    // ambient occlusion where the wall meets the street
    col *= 0.6 + 0.4 * smoothstep(0.0, 6.0, hRel);
  }
  col = fogTo(col, vW, uCam, uFogD);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- ground ----------------
const GND_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GND_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD; uniform vec3 uFog;
varying vec3 vW;
${NOISE}
${MASK}
${SKY_GLSL}
const float P = ${P.toFixed(1)}; const float HALF = ${(STREET / 2).toFixed(1)};
float pools(float along, float across){
  // lamps every 32 m on both sides of a street, 10 m off its centre line
  float a = along - floor(along / 32.0 + 0.5) * 32.0;
  float d1 = across - 9.0; float d2 = across + 9.0;
  return 0.75 * (exp(-(a * a / 150.0 + d1 * d1 / 45.0)) + exp(-(a * a / 150.0 + d2 * d2 / 45.0))) + 0.3 * exp(-across * across / 140.0);
}
// glow around the lines of a grid of pitch q (half-width w metres), averaged out once the lines get thinner than a pixel
float lineGlow(vec2 p, float q, float w){
  vec2 u = p / q;
  vec2 d = (0.5 - abs(fract(u) - 0.5)) * q;
  vec2 fw = fwidth(u) * q;
  float px = max(fw.x, fw.y);
  float sharp = exp(-min(d.x, d.y) / w);
  float avg = min(1.0, 4.0 * w / q);
  return mix(sharp, avg, smoothstep(w * 0.6, w * 3.0, px));
}
void main(){
  vec2 p = vW.xz;
  float dist = length(vW - uCam);
  float rC = length(p);
  vec2 u = p / P; vec2 cell = floor(u + 0.5); vec2 f = u - cell; // block centre at integer
  vec2 dToStreet = (0.5 - abs(f)) * P; // metres to the nearest street centre line (x, z)
  float corr = corridor(p);
  float inCity = step(rC, ${(EXT - 60).toFixed(1)}) * step(corr, 0.5);
  float park = step(0.93, h21(cell * 2.3)) * inCity;
  vec3 col;
  float streetX = step(dToStreet.x, HALF); float streetZ = step(dToStreet.y, HALF);
  float street = max(streetX, streetZ) * inCity;
  vec3 asphalt = vec3(0.010, 0.010, 0.011);
  vec3 block = park > 0.5 ? vec3(0.003, 0.005, 0.004) : vec3(0.008, 0.008, 0.009) * (0.7 + 0.6 * vnoise(p * 0.08));
  vec3 field = vec3(0.006, 0.007, 0.007) * (0.7 + 0.6 * fbm(p * 0.004));
  col = inCity > 0.5 ? mix(block, asphalt, street) : field;
  float on = lightsOn(p);
  // street-light pools: sodium in old districts, white LED in new ones
  vec3 lampC = mix(vec3(1.0, 0.5, 0.16), vec3(0.78, 0.74, 0.66), smoothstep(0.58, 0.72, fbm(p * 0.0011 + 7.3)));
  float lp = 0.0;
  float sx = (floor(u.x) + 0.5) * P; lp += pools(p.y, p.x - sx);
  float sz = (floor(u.y) + 0.5) * P; lp += pools(p.x, p.y - sz);
  float nearK = 1.0 - smoothstep(600.0, 2600.0, dist);
  col += lampC * lp * 0.24 * on * inCity * (1.0 - park * 0.8) * nearK;
  // general light spill near the street grid so the city reads from far away
  float far = smoothstep(250.0, 1400.0, dist);
  col += lampC * mix(0.035, 0.11, far) * on * inCity * lineGlow(p + 0.5 * P, P, mix(9.0, 14.0, far)) * (1.0 - park * 0.8);
  // beyond the modelled city: towns and suburbs as a carpet of lit streets, arterials between them, out to the horizon
  float outR = rC - ${(EXT - 60).toFixed(1)};
  if (outR > -200.0) {
    float town = smoothstep(0.40, 0.66, fbm(p * 0.00028 + 3.1));
    float spill = 1.0 - smoothstep(0.0, 3500.0, outR);
    float fade = 1.0 - smoothstep(${(CARPET * 0.55).toFixed(1)}, ${CARPET.toFixed(1)}, rC);
    float dens = clamp(max(town, spill * 0.85), 0.0, 1.0) * fade * smoothstep(-200.0, 200.0, outR) * (1.0 - corr);
    float tex = 0.55 + 0.9 * fbm(p * 0.0021);
    float streets = lineGlow(p + 0.5 * P, P, 10.0);
    float arter = lineGlow(p + vec2(240.0, 610.0), 880.0, 16.0);
    vec3 lc = mix(vec3(1.0, 0.52, 0.18), vec3(0.8, 0.76, 0.68), smoothstep(0.6, 0.75, fbm(p * 0.0004 + 2.1)));
    col += lc * on * (streets * 0.085 * dens * tex + arter * 0.12 * max(dens, 0.3 * fade) + 0.006 * dens);
  }
  // the river: black water, the sky and both lit banks reflected in it, bridges every fourth street
  float rz = riverZ(p.x); float rw = riverW(p.x) * 0.5;
  float rd = abs(p.y - rz);
  float bridge = step(mod(floor(u.x), 4.0), 0.5) * step(dToStreet.x, HALF - 3.0);
  float bank = exp(-abs(rd - rw - 9.0) / 5.0) + 0.4 * exp(-abs(rd - rw - 9.0) / 30.0);
  if (rd < rw && bridge < 0.5) {
    vec3 V = normalize(vW - uCam);
    vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
    float rip = vnoise(vec2(p.x * 0.05, p.y * 0.4)) * 0.6 + vnoise(vec2(p.x * 0.2, p.y * 1.5)) * 0.4;
    col = vec3(0.002, 0.003, 0.005) + skyCol(R) * fres * 0.9;
    // light from both banks smeared toward the camera by the ripples
    float edge = exp(-(rw - rd) / 22.0);
    col += lampC * on * edge * 0.10 * (0.4 + 1.2 * rip);
    // downtown towers' glow stretched across the water
    col += vec3(1.0, 0.75, 0.5) * on * 0.012 * smoothstep(0.35, 0.8, rip) * exp(-length(p) / 1400.0);
  } else {
    // embankment roads
    col += lampC * on * bank * 0.10 * step(rw, rd);
    if (rd < rw) {
      // bridge deck: asphalt with lamps along both rails
      col = vec3(0.012, 0.012, 0.013) + lampC * on * (pools(p.y, p.x - sx) * 0.35 + 0.03);
    }
  }
  col = fogTo(col, vW, uCam, uFogD);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- sky ----------------
const SKY_VERT = /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = /* glsl */ `
uniform float uOffR, uOnR, uBlink, uDusk;
varying vec3 vD;
${NOISE}
${SKY_GLSL}
void main(){
  vec3 d = normalize(vD);
  vec3 c = skyCol(d);
  c *= mix(0.6, 1.0, uGlow);
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
  float dim = clamp(px / uMinPx, 0.0, 1.0); dim = max(dim * dim, 0.03);
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

// type: 0 glass tower, 1 concrete, 2 data centre / warehouse, 3 rooftop plant (no windows). y: base height (rooftop plant)
type Bld = { x: number; z: number; w: number; d: number; h: number; type: number; seed: number; crown?: boolean; part?: boolean; y?: number; round?: boolean };
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
  const WARE_XZ = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2 + 0.3;
    const rr = 1700 + (k % 3) * 260;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  });
  const inYard = (x: number, z: number) => WARE_XZ.some(([wx, wz]) => Math.hypot(x - wx, z - wz) < 240);
  const rnd2 = mulberry(4242); // suburbs, setbacks and roof clutter draw from their own stream so the core stays as cut
  // a residential estate (小区): rows of identical point towers, or now and then a low commercial block
  const estate = (cx: number, cz: number, lot: number, r: number, R: () => number) => {
    const k = R();
    if (inYard(cx, cz)) return;
    const far = sstep(1200, 3800, r); // 0 near the core .. 1 out in the suburbs
    if (k < 0.18) {
      blds.push({ x: cx, z: cz, w: lot * (0.75 + 0.2 * R()), d: lot * (0.55 + 0.35 * R()), h: 10 + R() * 14, type: 1, seed: R() * 100 });
      return;
    }
    const hh = lerp(70 + R() * 40, 30 + R() * 30, far);
    const nx = 2;
    const nz = R() < 0.55 ? 3 : 2;
    const tw = Math.min(24 + R() * 6, lot / nx - 12);
    const td = Math.min(15 + R() * 4, lot / nz - 9);
    const sd = R() * 100;
    for (let a = 0; a < nx; a++)
      for (let b = 0; b < nz; b++) {
        if (R() < 0.08) continue;
        const x = cx - lot / 2 + (lot / nx) * (a + 0.5);
        const z = cz - lot / 2 + (lot / nz) * (b + 0.5);
        blds.push({ x, z, w: tw, d: td, h: Math.round((hh * (0.9 + 0.2 * R())) / 2.95) * 2.95, type: 1, seed: sd + a * 1.3 + b * 2.9 });
      }
  };
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++) {
      const cx = i * P;
      const cz = j * P;
      const r = Math.hypot(cx, cz);
      if (r > EXT - 60) continue;
      if (r > CORE - 60) {
        // suburbs: low-rise blocks, more green, now and then a lone mid-rise
        if (Math.hypot(cx - DC.x, cz - DC.z) < 330) continue;
        if (hash2(i * 5.1, j * 3.7) > 0.8) continue;
        if (inRiver(cx, cz, 50)) continue;
        if (corridorJS(cx, cz)) continue;
        const lot = P - STREET - 6;
        if (rnd2() < 0.05) {
          const w = lot * (0.4 + 0.3 * rnd2());
          blds.push({ x: cx, z: cz, w, d: w * (0.8 + 0.4 * rnd2()), h: 35 + rnd2() * 45, type: 1, seed: rnd2() * 100 });
          continue;
        }
        estate(cx, cz, lot, r, rnd2);
        continue;
      }
      if (Math.abs(r - RING_R) < 70) continue; // the ring highway corridor
      if (Math.hypot(cx - DC.x, cz - DC.z) < 330) continue; // data centre campus
      if (hash2(i * 2.3, j * 2.3) > 0.93) continue; // parks
      if (inRiver(cx, cz, 50)) continue;
      if (corridorJS(cx, cz)) continue;
      const core = hfun(cx, cz);
      const tall = core > 0.35 && rnd() < 0.75;
      const supertall = core > 0.72 && rnd() < 0.35;
      const lot = P - STREET - 8;
      if (supertall) {
        const h = 300 + rnd() * 230;
        const w = lot * (0.42 + 0.12 * rnd());
        const dd = w * (0.9 + 0.2 * rnd());
        const sseed = rnd() * 100;
        const rd = hash1(sseed + 0.3) < 0.4;
        blds.push({ x: cx, z: cz, w, d: rd ? w : dd, h, type: 0, seed: sseed, round: rd });
        blds.push({ x: cx, z: cz, w: w * 0.7, d: (rd ? w : dd) * 0.7, h: h + 25 + rnd() * 30, type: 0, seed: rnd() * 100, crown: true, round: rd });
      } else if (tall) {
        const h = 90 + core * 260 * (0.55 + 0.6 * rnd());
        const w = lot * (0.55 + 0.35 * rnd());
        const d = lot * (0.55 + 0.35 * rnd());
        const tx = cx + (rnd() - 0.5) * (lot - w);
        const tz = cz + (rnd() - 0.5) * (lot - d);
        const tseed = rnd() * 100;
        if (h > 120 && hash1(tseed + 0.7) < 0.55) {
          // setback: a wider shaft to ~60 %, the tower narrows above it
          const hb = h * (0.5 + 0.15 * hash1(tseed + 1.3));
          blds.push({ x: tx, z: tz, w, d, h: hb, type: 0, seed: tseed, part: true });
          blds.push({ x: tx, z: tz, w: w * 0.74, d: d * 0.74, h, type: 0, seed: tseed + 0.5 });
        } else if (h > 100 && hash1(tseed + 2.9) < 0.3) blds.push({ x: tx, z: tz, w, d: w, h, type: 0, seed: tseed, round: true });
        else blds.push({ x: tx, z: tz, w, d, h, type: 0, seed: tseed });
        if (rnd() < 0.5) {
          // podium
          blds.push({ x: cx, z: cz, w: lot * 0.95, d: lot * 0.95, h: 14 + rnd() * 12, type: 1, seed: rnd() * 100 });
        }
      } else if (core > 0.3 && rnd() < 0.5) {
        // mid-rise offices around the core
        const h = 40 + core * 120 * (0.5 + rnd());
        blds.push({ x: cx, z: cz, w: lot * (0.55 + 0.3 * rnd()), d: lot * (0.5 + 0.3 * rnd()), h, type: 0, seed: rnd() * 100 });
        blds.push({ x: cx, z: cz, w: lot * 0.95, d: lot * 0.95, h: 12 + rnd() * 10, type: 1, seed: rnd() * 100 });
      } else estate(cx, cz, lot, r, rnd);
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

  const bldU = {
    uCam: { value: new THREE.Vector3() }, uFogD: { value: 0.0003 }, uFog: { value: new THREE.Color() }, uT: { value: 0 },
    uOffR: { value: -1 }, uOnR: { value: -2 }, uBlink: { value: 1 }, uDusk: { value: 0 }, uGlow: { value: 1 }, uSun: { value: new THREE.Vector2(-0.94, 0.33) },
  };
  const bldMat = new THREE.ShaderMaterial({ vertexShader: BLD_VERT, fragmentShader: BLD_FRAG, uniforms: bldU });
  const m4 = new THREE.Matrix4();
  const addInstances = (list: Bld[], round = false) => {
    const box = round ? new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1).translate(0, 0.5, 0) : new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(box, bldMat, list.length);
    const info = new Float32Array(list.length * 4);
    list.forEach((b, i) => {
      m4.compose(new THREE.Vector3(b.x, b.y ?? 0, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
      inst.setMatrixAt(i, m4);
      const lit = b.h > 240 ? 0.3 + 0.15 * hash1(b.seed) : b.type === 0 ? 0.1 + 0.28 * hash1(b.seed) : 0.12 + 0.3 * hash1(b.seed + 3);
      info.set([b.seed, b.type, lit, round ? 1 : 0], i * 4);
    });
    box.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
    inst.frustumCulled = false;
    scene.add(inst);
  };
  addInstances(blds.filter((b) => !b.round));
  addInstances(blds.filter((b) => b.round), true);

  // ground
  const gndU = { uCam: bldU.uCam, uFogD: bldU.uFogD, uFog: bldU.uFog, uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk, uGlow: bldU.uGlow, uSun: bldU.uSun };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * CARPET + 6000, 2 * CARPET + 6000, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: GND_VERT, fragmentShader: GND_FRAG, uniforms: gndU }));
  scene.add(ground);

  // street trees: dark canopies lit from below by the street lamps (the look of a Chinese street from above at night)
  let treeMesh: THREE.Object3D | null = null; // street trees: only near the ground; from the air they read as black dots
  {
    const TREE_VERT = /* glsl */ `varying vec3 vW; varying vec3 vN;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
    const TREE_FRAG = /* glsl */ `uniform vec3 uCam; uniform float uFogD; uniform vec3 uFog;
      varying vec3 vW; varying vec3 vN;
      ${NOISE}
      ${MASK}
      ${SKY_GLSL}
      void main(){
        vec3 n = normalize(vN);
        float on = lightsOn(vW.xz);
        vec3 lampC = mix(vec3(1.0, 0.5, 0.16), vec3(0.78, 0.74, 0.66), smoothstep(0.58, 0.72, fbm(vW.xz * 0.0011 + 7.3)));
        float leaf = 0.6 + 0.8 * vnoise(vW.xz * 0.9 + vW.y * 1.3);
        vec3 col = vec3(0.004, 0.007, 0.005) * leaf;
        col += lampC * on * 0.012 * leaf * max(n.y, 0.0) * smoothstep(0.45, 0.8, vnoise(vW.xz * 0.35));
        // lamp light from below and from the street side, brightest on the undersides
        col += lampC * on * 0.05 * leaf * (0.4 + 0.6 * max(-n.y, 0.0) + 0.3 * (1.0 - abs(n.y))) * exp(-max(vW.y - 3.0, 0.0) / 5.0);
        col += skyCol(vec3(0.0, 1.0, 0.0)) * 0.05 * max(n.y, 0.0);
        col = fogTo(col, vW, uCam, uFogD);
        gl_FragColor = vec4(col, 1.0);
      }`;
    const pos: number[] = [];
    const TR = 2300;
    for (let k = -N; k < N; k++) {
      const line = (k + 0.5) * P;
      if (Math.abs(line) > TR) continue;
      const len = Math.sqrt(TR * TR - line * line);
      for (const side of [-13, 13])
        for (let s = -len; s < len; s += 9) {
          const along = ((s % P) + P) % P;
          if (Math.abs(along - P / 2) < 18) continue; // keep the intersections clear
          for (const axis of [0, 1]) {
            const x = axis === 0 ? s : line + side;
            const z = axis === 0 ? line + side : s;
            if (Math.abs(Math.hypot(x, z) - RING_R) < 30) continue;
            if (inRiver(x, z, 8) || corridorJS(x, z)) continue;
            if (Math.hypot(x - DC.x, z - DC.z) < 330) continue;
            if (hash2(x * 0.37, z * 0.53) < 0.3) continue;
            pos.push(x + (hash2(x, z) - 0.5) * 4, z + (hash2(z, x) - 0.5) * 3, 0.55 + 0.75 * Math.pow(hash2(x * 1.7, z * 0.3), 1.5));
          }
        }
    }
    const n = pos.length / 3;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const trees = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ vertexShader: TREE_VERT, fragmentShader: TREE_FRAG, uniforms: bldU }), n);
    const tm = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const sc = pos[i * 3 + 2];
      tm.compose(new THREE.Vector3(pos[i * 3], 5.5 * sc, pos[i * 3 + 1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 0.37, i * 1.7, i * 0.61)), new THREE.Vector3(3.8 * sc, 2.8 * sc, 3.3 * sc));
      trees.setMatrixAt(i, tm);
    }
    trees.frustumCulled = false;
    scene.add(trees);
    treeMesh = trees;
  }

  // sky
  const skyU = { uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk, uGlow: bldU.uGlow, uSun: bldU.uSun };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false }));
  scene.add(sky);

  // standard-material lighting for the hero objects (mast, pylons, highway, car bodies)
  const hemi = new THREE.HemisphereLight(0x1a2a44, 0x2a1a10, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a60, 0);
  sun.position.set(-1, 0.25, 0.35);
  scene.add(sun);

  // ring highway deck, pillars, barrier lights
  const concrete = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9 });
  const deckMat = new THREE.ShaderMaterial({
    uniforms: bldU,
    vertexShader: GND_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uCam; uniform float uFogD; uniform vec3 uFog; uniform float uT;
      varying vec3 vW;
      ${NOISE}
      ${MASK}
      ${SKY_GLSL}
      void main(){
        float r = length(vW.xz);
        float along = atan(vW.z, vW.x) * ${RING_R.toFixed(1)};
        float across = r - ${RING_R.toFixed(1)};
        vec3 col = vec3(0.011, 0.011, 0.012) * (0.85 + 0.3 * vnoise(vW.xz * 0.4));
        float on = lightsOn(vW.xz);
        // tall lamps on both parapets every 36 m, a faint lane-marking sheen
        float a = along - floor(along / 36.0 + 0.5) * 36.0;
        float lp = exp(-(a * a + (across - 16.0) * (across - 16.0)) / 90.0) + exp(-(a * a + (across + 16.0) * (across + 16.0)) / 90.0);
        col += vec3(1.0, 0.62, 0.3) * (lp * 0.16 + 0.012) * on;
        col += vec3(0.6) * 0.02 * on * step(0.7, fract(along / 9.0)) * smoothstep(0.3, 0.0, abs(abs(across) - 3.6));
        col = fogTo(col, vW, uCam, uFogD);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const deck = new THREE.Mesh(new THREE.RingGeometry(RING_R - 18, RING_R + 18, 1024, 1).rotateX(-Math.PI / 2), deckMat);
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
    for (let k = 0; k < n; k++) HW.push({ lane, dir, speed: 22 + (lane % 4) * 3.5, phase: (k / n) * Math.PI * 2 + rnd() * 0.0035, col: rnd() });
  }
  // car: a low body and a glass cabin set back from the nose
  const carGeo = mergeGeos([
    new RoundedBoxGeometry(4.5, 0.75, 1.85, 2, 0.2).translate(0, 0.62, 0),
    new RoundedBoxGeometry(2.3, 0.6, 1.62, 2, 0.22).translate(-0.35, 1.22, 0),
  ]);
  const carBody = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.4 }), HW.length);
  {
    const paints = [0x0b0c0e, 0x1d1f22, 0x4a4d52, 0x9a9da2, 0xb8bbbf, 0x2a0807, 0x0c1626, 0x3a3d41];
    const c = new THREE.Color();
    HW.forEach((h, k) => carBody.setColorAt(k, c.setHex(paints[Math.floor(h.col * paints.length) % paints.length])));
  }
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
    c *= 1.25 * uOn;
    float dist = length(vW - uCam);
    gl_FragColor = vec4(mix(uFog, c, exp(-dist * uFogD)), 1.0);
  }`;
  const BB_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const boards: { mesh: THREE.Mesh; u: Record<string, THREE.IUniform>; x: number; z: number; set: "dusk" | "night"; parts: THREE.Object3D[] }[] = [];
  // rooftop LED screens, each turned to face the camera of the shot it belongs to
  const BB_CAM = new THREE.Vector3(-380, 120, 950);
  const BB_TGT = new THREE.Vector3(-60, 90, 300);
  const DUSK_CAM = new THREE.Vector3(-2600, 118, 2400);
  const DUSK_TGT = new THREE.Vector3(-40, 150, 40);
  const pickBoards = (cam: THREE.Vector3, tgt: THREE.Vector3, n: number, dmin: number, dmax: number, hmin: number, hmax: number) => {
    const fwd = tgt.clone().sub(cam).setY(0).normalize();
    const out: Bld[] = [];
    for (const b of blds) {
      if (b.crown || b.part || b.round || b.type > 1) continue;
      if (b.h < hmin || b.h > hmax) continue;
      const v = new THREE.Vector3(b.x - cam.x, 0, b.z - cam.z);
      const d = v.length();
      if (d < dmin || d > dmax) continue;
      const ang = Math.acos(v.normalize().dot(fwd));
      if (ang > 0.36) continue;
      if (out.some((o) => Math.hypot(o.x - b.x, o.z - b.z) < 150)) continue;
      // nothing taller right behind it (a board must stand on a roof, not inside a tower)
      if (blds.some((o) => o !== b && o.h > b.h && Math.abs(o.x - b.x) < (o.w + b.w) / 2 && Math.abs(o.z - b.z) < (o.d + b.d) / 2)) continue;
      out.push(b);
      if (out.length >= n) break;
    }
    return out;
  };
  const addBoard = (b: Bld, cam: THREE.Vector3, set: "dusk" | "night", i: number) => {
    const bw = set === "night" ? 70 + 30 * hash1(i * 3.1) : 46 + 24 * hash1(i * 3.1);
    const bh = bw * 0.5;
    const u = { tA: { value: adTex }, tB: { value: homeTex }, uFlip: { value: 0 }, uOn: { value: 1 }, uFogD: bldU.uFogD, uFog: bldU.uFog, uCam: bldU.uCam };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: BB_FRAG, uniforms: u, side: THREE.DoubleSide }));
    mesh.position.set(b.x, b.h + bh / 2 + 5, b.z);
    mesh.rotation.y = Math.atan2(cam.x - b.x, cam.z - b.z);
    scene.add(mesh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 2, bh + 2, 1.2), new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.8 }));
    frame.position.copy(mesh.position);
    frame.rotation.y = mesh.rotation.y;
    frame.translateZ(-0.8);
    scene.add(frame);
    // steel truss under the screen: two legs, a cross beam and diagonal braces down to the roof
    const legs: THREE.BufferGeometry[] = [];
    const gap = 5;
    for (const sx of [-0.36, 0.36]) {
      legs.push(new THREE.BoxGeometry(1.6, gap + 3, 1.6).translate(sx * bw, -bh / 2 - (gap + 3) / 2 + 1.5, -2.4));
      legs.push(new THREE.BoxGeometry(1.0, gap + 2, 1.0).translate(sx * bw, -bh / 2 - (gap + 2) / 2 + 1, -9));
      legs.push(new THREE.BoxGeometry(0.6, 0.6, 7).translate(sx * bw, -bh / 2 + 0.6, -5.7));
    }
    legs.push(new THREE.BoxGeometry(bw * 0.8, 0.9, 0.9).translate(0, -bh / 2 - 0.4, -2.4));
    const truss = new THREE.Mesh(mergeGeos(legs), trussMat);
    truss.position.copy(mesh.position);
    truss.rotation.y = mesh.rotation.y;
    scene.add(truss);
    // the screen washes its own roof with light
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(bw * 1.1, 26).rotateX(-Math.PI / 2), washMat(u));
    wash.position.set(b.x, b.h + 0.3, b.z);
    wash.rotation.y = mesh.rotation.y;
    wash.translateZ(10);
    scene.add(wash);
    boards.push({ mesh, u, x: b.x, z: b.z, set, parts: [mesh, frame, truss, wash] });
    boarded.add(b);
  };
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7, metalness: 0.4 });
  const washMat = (u: Record<string, THREE.IUniform>) =>
    new THREE.ShaderMaterial({
      uniforms: { uFlip: u.uFlip, uOn: u.uOn },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uFlip, uOn; varying vec2 vUv;
        void main(){ float a = smoothstep(0.0, 0.9, vUv.y) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          vec3 c = mix(vec3(0.25, 0.55, 0.9), vec3(1.0, 0.25, 0.2), step(0.5, uFlip)) * 0.18 * a * uOn; gl_FragColor = vec4(c, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
  const boarded = new Set<Bld>();
  pickBoards(BB_CAM, BB_TGT, 7, 170, 900, 25, 110).forEach((b, i) => addBoard(b, BB_CAM, "night", i));
  // facade media screens on two downtown towers, the face turned to the dusk camera: the city's own advert for 安
  const addFacade = (b: Bld, cam: THREE.Vector3) => {
    const vx = cam.x - b.x;
    const vz = cam.z - b.z;
    const alongX = Math.abs(vx) > Math.abs(vz);
    const fw = (alongX ? b.d : b.w) * 0.96;
    const fh = fw * 0.5;
    const u = { tA: { value: adTex }, tB: { value: homeTex }, uFlip: { value: 0 }, uOn: { value: 1 }, uFogD: bldU.uFogD, uFog: bldU.uFog, uCam: bldU.uCam };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: BB_FRAG, uniforms: u }));
    const y = Math.min(b.h * 0.6, b.h - fh * 0.6 - 6);
    if (alongX) {
      mesh.position.set(b.x + Math.sign(vx) * (b.w / 2 + 0.6), y, b.z);
      mesh.rotation.y = Math.sign(vx) * Math.PI / 2;
    } else {
      mesh.position.set(b.x, y, b.z + Math.sign(vz) * (b.d / 2 + 0.6));
      mesh.rotation.y = vz > 0 ? 0 : Math.PI;
    }
    scene.add(mesh);
    boards.push({ mesh, u, x: b.x, z: b.z, set: "dusk", parts: [mesh] });
  };
  {
    const cand = blds
      .filter((b) => b.type === 0 && !b.crown && !b.part && !b.round && b.h > 110 && b.h < 320 && Math.hypot(b.x - DUSK_TGT.x, b.z - DUSK_TGT.z) < 650)
      .filter((b) => {
        // nothing taller standing between it and the camera
        const d = new THREE.Vector3(DUSK_CAM.x - b.x, 0, DUSK_CAM.z - b.z);
        const L = d.length();
        d.normalize();
        return !blds.some((o) => {
          if (o === b || o.h < b.h * 0.6) return false;
          const t = (o.x - b.x) * d.x + (o.z - b.z) * d.z;
          if (t < 20 || t > Math.min(L, 900)) return false;
          return Math.abs((o.x - b.x) * d.z - (o.z - b.z) * d.x) < Math.max(o.w, o.d) / 2 + 25;
        });
      })
      .sort((a, b) => b.h - a.h);
    const picked: Bld[] = [];
    for (const b of cand) if (picked.length < 2 && picked.every((o) => Math.hypot(o.x - b.x, o.z - b.z) > 160)) picked.push(b);
    picked.forEach((b) => addFacade(b, DUSK_CAM));
  }
  void tallest;

  // rooftop plant: lift overruns, chillers, water tanks — breaks up the flat box tops against the sky
  const plant: Bld[] = [];
  for (const b of blds) {
    if (b.crown || b.part || b.type > 1 || boarded.has(b) || b.h < 14) continue;
    const k = 1 + Math.floor(hash1(b.seed + 9.1) * 3);
    for (let q = 0; q < k; q++) {
      const s = hash1(b.seed * 3.7 + q);
      const w = b.w * (0.14 + 0.22 * s);
      const d = b.d * (0.14 + 0.22 * hash1(b.seed + q * 5.3));
      const ox = (hash1(b.seed + q * 2.1) - 0.5) * (b.w - w) * (b.round ? 0.55 : 0.85);
      const oz = (hash1(b.seed + q * 7.9) - 0.5) * (b.d - d) * (b.round ? 0.55 : 0.85);
      plant.push({ x: b.x + ox, z: b.z + oz, w, d, h: 2.5 + s * (b.h > 80 ? 7 : 4), type: 3, seed: b.seed + q, y: b.h });
    }
  }
  addInstances(plant);

  // spires on the supertalls' crowns, each with an aviation light at the tip
  const SPIRES: THREE.Vector3[] = [];
  {
    const spMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: 0.8, roughness: 0.35 });
    for (const b of blds.filter((q) => q.crown)) {
      const hh = 35 + hash1(b.seed + 4.4) * 45;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.2, hh, 12, 1).translate(0, hh / 2, 0), spMat);
      m.position.set(b.x, b.h, b.z);
      scene.add(m);
      SPIRES.push(new THREE.Vector3(b.x, b.h + hh, b.z));
    }
  }
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
      if (inRiver(x, z, 14)) continue;
      if (corridorJS(x, z)) continue;
      INTER.push({ x, z, ph: hash2(i, j) * 30 });
    }
  const AVI = [...blds.filter((b) => b.h > 110 && !b.part).map((b) => new THREE.Vector3(b.x, b.h + 2, b.z)), ...SPIRES];
  const MASTS = blds.filter((b, i) => b.type === 1 && b.h > 25 && i % 9 === 0).map((b) => new THREE.Vector3(b.x + b.w * 0.3, b.h + 8, b.z - b.d * 0.3));

  // drones
  // every drone ends up on a slowly turning dome over the data centre, a shield of lights
  const DRONES = Array.from({ length: 5200 }, (_, k) => {
    const home = WARE[k % WARE.length];
    const phi = 0.12 + Math.acos(1 - rnd() * 0.85) * 0.9;
    const R = 430 + rnd() * 25;
    return {
      wh: k % WARE.length,
      home: home.clone().add(new THREE.Vector3((rnd() - 0.5) * 80, 0, (rnd() - 0.5) * 50)),
      launch: rnd() * 2.6,
      travel: 3.2 + rnd() * 2.2,
      orbitR: R * Math.cos(phi),
      orbitY: 20 + R * Math.sin(phi),
      ang: rnd() * Math.PI * 2,
      w: 0.05 * ((k % 2) === 1 ? -1 : 1),
      seed: rnd(),
    };
  });
  const DRONE_W = WARE[0];

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
      if (inRiver(x, z, 4) && !(c.axis === 1 && isBridge(c.line))) continue;
      if (x < -2300 && corridorJS(x, z)) continue;
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
        const s = mode === "greenwave" && Math.abs(it.z - AVE_Z) < 1 ? 1.6 : 1.4;
        if (g) pts.add(it.x + ox, 6, it.z + oz, 0.15 * on, 3.2 * on, 1.2 * on, s);
        else pts.add(it.x + ox, 6, it.z + oz, 3.6 * on, 0.25 * on, 0.1 * on, s);
      }
    }
    // ambulance strobe
    if (mode === "greenwave") {
      const blue = Math.floor(lt * 8) % 2 === 0;
      pts.add(ambX, 3, AVE_Z - 3, blue ? 0.6 : 9, blue ? 1.2 : 0.6, blue ? 9 : 0.4, 2.2);
      pts.add(ambX + 3, 1.0, AVE_Z - 3.8, 4, 4, 3.5, 0.9);
      pts.add(ambX + 3, 1.0, AVE_Z - 2.2, 4, 4, 3.5, 0.9);
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
      pts.add(x + tx * 2.3 + tz * 0.7, RING_Y + 0.7, z + tz * 2.3 - tx * 0.7, 3.2 * b, 3.0 * b, 2.6 * b, 0.5);
      pts.add(x + tx * 2.3 - tz * 0.7, RING_Y + 0.7, z + tz * 2.3 + tx * 0.7, 3.2 * b, 3.0 * b, 2.6 * b, 0.5);
      pts.add(x - tx * 2.3 + tz * 0.7, RING_Y + 0.8, z - tz * 2.3 - tx * 0.7, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
      pts.add(x - tx * 2.3 - tz * 0.7, RING_Y + 0.8, z - tz * 2.3 + tx * 0.7, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
    }
    carBody.instanceMatrix.needsUpdate = true;
    // highway lamps on both parapets
    {
      const n = Math.round((2 * Math.PI * RING_R) / 36);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        for (const off of [-16.5, 16.5]) {
          const x = Math.cos(a) * (RING_R + off);
          const z = Math.sin(a) * (RING_R + off);
          const dx = x - camP.x;
          const dz = z - camP.z;
          if (dx * dx + dz * dz > far2) continue;
          const o = lightsOnJS(x, z, st);
          pts.add(x, RING_Y + 10, z, 3.2 * o, 1.9 * o, 0.9 * o, 1.3);
        }
      }
    }
    // energy pulses along the pylon wires (grid shot)
    if (mode === "grid") {
      for (const w of wireCurves) {
        for (let q = 0; q < 6; q++) {
          const f = (lt * 0.09 + q / 6 + hash1(w.length + q) * 0.05) % 1;
          const idx = Math.floor(f * (w.length - 1));
          const p = w[idx];
          // a short streak running along the wire, fading at its tail and dying with distance from the camera
          for (let tail = 0; tail < 18; tail++) {
            const p2 = w[Math.max(0, idx - Math.floor(tail / 2))];
            const k = (1 - tail / 18) * 0.45;
            const near = Math.exp(-p2.distanceTo(camP) / 700);
            pts.add(p2.x, p2.y, p2.z, 1.2 * k * near, 2.6 * k * near, 4.0 * k * near, 0.7 * (1 - tail / 18) + 0.15);
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
          const up = d.home.clone().setY(d.home.y + 90 + d.seed * 120);
          // quadratic bezier home → above home → orbit
          const a1 = d.home.clone().lerp(up, e);
          const a2 = up.clone().lerp(target, e);
          p = a1.lerp(a2, e);
        }
        const strobe = Math.floor((lt + d.seed * 3) * 2.2) % 3 === 0 ? 1.5 : 0.55;
        const red = d.seed < 0.22;
        const dc = p.distanceTo(camP);
        if (dc < 160) {
          // close enough to see a craft: red and green nav lights either side, a white strobe on top
          pts.add(p.x - 0.35, p.y, p.z, 3.0, 0.15, 0.08, 0.3);
          pts.add(p.x + 0.35, p.y, p.z, 0.15, 3.0, 0.6, 0.3);
          pts.add(p.x, p.y + 0.15, p.z, 4 * strobe, 4 * strobe, 4.2 * strobe, 0.35);
        } else pts.add(p.x, p.y, p.z, red ? 4.2 * strobe : 3.0 * strobe, red ? 0.3 : 3.1 * strobe, red ? 0.2 : 3.4 * strobe, 1.6);
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
    cam.far = 45000;
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
    bldU.uSun.value.set(-0.94, 0.33);
    let look: Partial<Look> = { bloom: 0.6, bloomThreshold: 0.85, bloomRadius: 0.6, streak: 0.35, lift: [0.0, 0.004, 0.01], gain: [1.0, 1.0, 1.04], sat: 1.0, grain: 0.06, vignette: 0.55, exposure: 1.0 };
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let fov = 40;
    if (mode === "dusk") {
      st.dusk = 0.75;
      const k = ease(clamp(lt / 8.6));
      pos.set(lerp(-2600, -2380, k), lerp(118, 112, k), lerp(2400, 2180, k));
      tgt.set(lerp(-90, -10, k), lerp(150, 160, k), lerp(60, 20, k));
      fov = lerp(13, 12, k);
      // the afterglow sits behind the skyline: towers stand dark against it
      bldU.uSun.value.set(0.74, 0.67);
      look = { ...look, exposure: 1.1, gain: [1.06, 1.0, 0.95], lift: [0.006, 0.004, 0.01], dof: 8, focus: pos.distanceTo(tgt), aperture: 0.25 };
    } else if (mode === "greenwave") {
      st.dusk = 0.55;
      // overhead, almost straight down: the avenue runs across the frame, the lights turn green ahead of the strobe
      const ax = -1100 + 50 * lt;
      pos.set(-120, 26, AVE_Z + 3);
      tgt.set(-1000, 5, AVE_Z - 1);
      fov = 6.5;
      look = { ...look, dof: 10, focus: Math.max(200, -120 - ax), aperture: 0.35, streak: 0.5 };
    } else if (mode === "grid") {
      st.dusk = 1;
      const p0 = PYL[3];
      pos.copy(p0).addScaledVector(side, 60).add(new THREE.Vector3(0, 8 + lt * 1.5, 0)).addScaledVector(pylDir, -120 + lt * 6);
      tgt.copy(PYL[6]).add(new THREE.Vector3(0, 40, 0)).addScaledVector(pylDir, 400);
      fov = 36;
      look = { ...look, exposure: 1.15, gain: [1.06, 1.0, 0.94] };
    } else if (mode === "highway") {
      st.dusk = 0.85;
      const a = 2.55 + lt * 0.003;
      const r = RING_R + 6;
      pos.set(Math.cos(a) * r, RING_Y + 15, Math.sin(a) * r);
      const a2 = a - 0.34;
      tgt.set(Math.cos(a2) * RING_R, RING_Y + 1, Math.sin(a2) * RING_R);
      fov = 13;
      look = { ...look, gain: [1.05, 1.0, 0.96], dof: 12, focus: pos.distanceTo(tgt), aperture: 0.5 };
    } else if (mode === "masts") {
      st.dusk = 0.75;
      const a = 0.6 + lt * 0.07;
      pos.set(MAST.x + Math.cos(a) * 24, MAST.y + 9 + lt * 0.4, MAST.z + Math.sin(a) * 24);
      tgt.set(MAST.x, MAST.y + 12, MAST.z);
      fov = 42;
      look = { ...look, dof: 10, focus: 24, aperture: 0.6 };
    } else if (mode === "blackout") {
      const k = lt;
      pos.set(-1250 + k * 14, 560 - k * 6, 1650 - k * 10);
      tgt.set(250, 40, -500);
      fov = 42;
      st.offR = OUT_R * easeIn(clamp((k - 0.4) / 3.0)) + (k > 0.4 ? 10 : -1);
      st.onR = k < 4.6 ? -2 : OUT_R * Math.pow(clamp((k - 4.6) / 3.4), 2.2);
      if (k > 0.4 && k < 3.2) look.flash = 0;
      look.streak = 0.45;
    } else if (mode === "freeze") {
      // the elevated road of act 1 again, the same long lens along the traffic from another stretch: the river of
      // lights stops dead, then every head- and tail-light on it blinks twice
      const a = 1.3 + lt * 0.002;
      pos.set(Math.cos(a) * (RING_R + 6), RING_Y + 16, Math.sin(a) * (RING_R + 6));
      const a2 = a + 0.34;
      tgt.set(Math.cos(a2) * RING_R, RING_Y + 1, Math.sin(a2) * RING_R);
      fov = 11;
      look = { ...look, gain: [1.05, 1.0, 0.96], dof: 12, focus: pos.distanceTo(tgt), aperture: 0.55 };
      st.allRed = lt > 2.05 ? 1 : 0;
      // every car stops at once at lt = 2.0, then all headlights blink twice
      const tf = shot.t0 - (shot.o ?? 0) + 2.0;
      const stopT = (t: number) => (t < tf ? t : tf + 0.35 * (1 - Math.exp(-(t - tf) / 0.35)));
      st.hwT = stopT(gt);
      st.carT = stopT(gt);
      const b1 = lt > 3.4 && lt < 3.62;
      const b2 = lt > 4.0 && lt < 4.22;
      st.hwBlink = b1 || b2 ? 0.0 : 1;
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
      pos.set(BB_CAM.x + lt * 4, BB_CAM.y + lt * 1.5, BB_CAM.z - lt * 8);
      tgt.copy(BB_TGT);
      fov = 44;
      look.bloomThreshold = 1.3;
      look.streak = 0.2;
      let n = 0;
      st.flip = boards.map((b) => (b.set === "night" ? ease(clamp((lt - 0.9 - n++ * 0.2) / 0.45)) : 1));
    } else if (mode === "drones") {
      st.carT = 100;
      st.hwT = 100;
      st.allRed = 1;
      // from the roof of one warehouse: its drones lift off around the camera and stream away to the dome
      const k = ease(clamp(lt / 9.5));
      pos.set(DRONE_W.x - 150 + k * 10, 45 + k * 40, DRONE_W.z + 160 - k * 6);
      tgt.set(lerp(DRONE_W.x + 30, DC.x, k), lerp(60, 180, k), lerp(DRONE_W.z - 120, DC.z, k));
      fov = lerp(44, 34, k);
      look.streak = 0.4;
    } else if (mode === "rise") {
      const k = ease(clamp(lt / 7.6));
      pos.set(lerp(-380, -300, k), lerp(70, 1500, easeIn(clamp(lt / 7.6)) * 0.7 + k * 0.3), lerp(900, 1100, k));
      tgt.set(lerp(-100, -60, k), 0, lerp(-200, -150, k));
      fov = lerp(42, 46, k);
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
    bldU.uFogD.value = mode === "dusk" ? 0.00008 : lerp(0.00016, 0.00013, st.dusk);
    for (const b of boards) b.parts.forEach((o) => (o.visible = !(mode === "dusk" && b.set === "night")));
    bldU.uFog.value.setRGB(lerp(0.013, 0.045, st.dusk), lerp(0.011, 0.04, st.dusk), lerp(0.013, 0.06, st.dusk));
    skyU.uGlow.value = st.offR > 0 && st.onR < st.offR ? lerp(1, 0.15, clamp(st.offR / 6000) - clamp(st.onR / 6000)) : 1;
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
    if (treeMesh) treeMesh.visible = cam.position.y < 120 && mode !== "highway" && mode !== "freeze";
    // car bodies only in the close highway shots; from farther away they would hide their own lights
    carBody.visible = mode === "highway" || mode === "freeze";
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
