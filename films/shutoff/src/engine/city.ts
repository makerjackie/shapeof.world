// The city: Futian and Luohu, Shenzhen, built from OpenStreetMap (© OpenStreetMap contributors, ODbL) by
// tools/city_build.py — real footprints, heights, streets, bridges, water and parks, with the gaps OSM leaves filled by
// buildings that follow the real streets. Buildings are one merged mesh whose shader draws windows, LED outlines, the
// media facades of the CBD towers (安's advert, later its order to stay at home) and the blackout; streets are ribbons
// with lane markings and lamp pools; the far plain is a raster carpet of lit streets; cars, lamps, signals, aviation
// lights and drones are point sprites recomputed per frame from time. Units: metres, x east, z south, origin at the
// Ping An Finance Centre.
import * as THREE from "three";
import { staticFile } from "remotion";
import { Ctx, H, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SANS, SERIF } from "./fonts";
import { drawAd, font } from "./screens";
import { clamp, drift, ease, easeIn, hash1, lerp, mulberry, sstep } from "./util";
import { endAlt } from "../film/cut";

const BLACKOUT_REACH = 6400; // m from the data centre to under the blackout shot's camera, where the wave breaks

export type CityState = {
  dusk: number; // 1 dusk .. 0 night
  offR: number; // blackout front radius
  onR: number; // relight front radius, from onX/onZ (安's data centre)
  onX: number;
  onZ: number;
  blink: number; // global light multiplier (unison blink)
  allRed: number;
  carT: number; // traffic clock
  carBlink: number;
  revR: number; // the reveal: radius of the scan that draws the city, from revX/revZ
  revX: number;
  revZ: number;
  ambR: number; // radius of 安's amber, from ambC
  ambX: number;
  ambZ: number;
};

// ---------------- shared GLSL ----------------
const MASK = /* glsl */ `
uniform float uOffR, uOnR, uBlink, uDusk; uniform float uRevR; uniform vec2 uRevC; uniform vec2 uOnC;
// the city goes dark and comes back block by block: the front runs over 260 m blocks, each a little early or late
float distr(vec2 p, vec2 c){ vec2 g = floor(p / 260.0); return length(g * 260.0 + 130.0 - c) + h21(g * 1.7) * 220.0; }
float district(vec2 p){ return distr(p, vec2(0.0)); }
float lightsOn(vec2 p){
  float off = step(district(p), uOffR) * (1.0 - step(distr(p, uOnC), uOnR));
  float rv = uRevR > 0.0 ? smoothstep(uRevR, uRevR - 120.0, length(p - uRevC)) : 1.0;
  return (1.0 - off) * uBlink * rv;
}
float relitAt(vec2 p){ return uOnR > 0.0 ? step(distr(p, uOnC), uOnR) : 0.0; }
// a block flares as 安 takes it, then settles: the bright crest of the takeover wave
float crestAt(vec2 p){ if (uOnR <= 0.0) return 0.0; float d = uOnR - distr(p, uOnC); return d < 0.0 ? 0.0 : exp(-d / 420.0); }`;
function fract(x: number) {
  return x - Math.floor(x);
}
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
const ICE: [number, number, number] = [0.6, 0.76, 1.0];
const AMB: [number, number, number] = [1.0, 0.5, 0.15];
// mirrors dataCol() in the shaders: 1 where the place is 安's (relit after the blackout, or inside the takeover front)
const distrJS = (x: number, z: number, ox: number, oz: number) => {
  const cx = Math.floor(x / 260);
  const cz = Math.floor(z / 260);
  return Math.hypot(cx * 260 + 130 - ox, cz * 260 + 130 - oz) + h21js(cx * 1.7, cz * 1.7) * 220;
};
const ambJS = (x: number, z: number, s: CityState) => {
  if (s.onR > 0 && distrJS(x, z, s.onX, s.onZ) <= s.onR) return 1;
  if (s.ambR <= 0) return 0;
  return Math.hypot(x - s.ambX, z - s.ambZ) + h21js(Math.floor(x / 180), Math.floor(z / 180)) * 260 < s.ambR ? 1 : 0;
};
const dcol = (x: number, z: number, s: CityState) => (ambJS(x, z, s) > 0.5 ? AMB : ICE);
const crestJS = (x: number, z: number, s: CityState) => {
  if (s.onR <= 0) return 0;
  const d = s.onR - distrJS(x, z, s.onX, s.onZ);
  return d < 0 ? 0 : Math.exp(-d / 420);
};
const lightsOnJS = (x: number, z: number, s: CityState) => {
  const off = distrJS(x, z, 0, 0) <= s.offR && distrJS(x, z, s.onX, s.onZ) > s.onR ? 1 : 0;
  const rv = s.revR > 0 ? clamp((s.revR - Math.hypot(x - s.revX, z - s.revZ)) / 120) : 1;
  return (1 - off) * s.blink * rv;
};

const SKY_GLSL = /* glsl */ `
uniform float uGlow; // 1 = the city's light pollution lights the haze; drops during the blackout
uniform vec2 uSun; // horizontal direction of the afterglow at dusk
// the data look: the city is what 安 sees. A black void; every surface sampled as points of light, every edge a hair
// line. Cold white is the human world; amber is 安.
const vec3 ICE = vec3(0.60, 0.76, 1.0);
const vec3 AMB = vec3(1.0, 0.50, 0.15);
uniform float uHazeA; // 0 the haze over the city is the people's cold light; 1 it is 安's amber
vec3 skyCol(vec3 d){
  float e = max(d.y, 0.0);
  // the city's own light hangs in the haze: a low dome along the horizon, so the void has a floor and a distance
  vec3 hc = mix(vec3(0.020, 0.026, 0.040), vec3(0.026, 0.014, 0.006), uHazeA);
  vec3 hor = hc * mix(0.12, 1.0, uGlow);
  vec3 top = vec3(0.0005, 0.0007, 0.0012);
  return mix(hor, top, smoothstep(0.0, 0.2, pow(e, 0.75)));
}
vec3 fogTo(vec3 col, vec3 wp, vec3 cam, float dens){
  vec3 v = wp - cam;
  float dist = length(v);
  float hk = mix(1.0, 0.25, clamp(wp.y / 400.0, 0.0, 1.0));
  float f = exp(-dist * dens * hk);
  vec3 d = normalize(v);
  vec3 fc = skyCol(normalize(vec3(d.x, max(d.y, 0.0) * 0.25 + 0.004, d.z)));
  return mix(fc, col, f);
}
float lineAA(float d, float w){
  float px = max(fwidth(d), 1e-4);
  return smoothstep(w + px, w - px, d) * min(1.0, w / px);
}
// a hair line of constant width in pixels
float lpx(float d, float wpx){
  float px = max(fwidth(d), 1e-5);
  return clamp(wpx + 0.5 - abs(d) / px, 0.0, 1.0);
}
// a lattice of round points of constant pixel radius R; once the lattice is finer than a few pixels the points merge
// into their average light, so far facades glow evenly instead of shimmering
float dotPx(vec2 uv, float R, float cap){
  vec2 fw = max(fwidth(uv), vec2(1e-5));
  vec2 f = fract(uv) - 0.5;
  float d = length(f / fw);
  float nearD = smoothstep(R + 0.7, R - 0.3, d);
  float cov = 3.14159 * R * R * fw.x * fw.y;
  float k = smoothstep(0.22, 0.42, max(fw.x, fw.y));
  return mix(nearD, cap * (1.0 - exp(-cov / cap)), k);
}
// how much of 安 is in this place: the districts it relit after the blackout, and the takeover front
uniform float uAmbR; uniform vec2 uAmbC; uniform float uScanR; uniform vec2 uScanC;
vec3 dataCol(vec2 p, float relit){
  float a = max(relit, step(length(p - uAmbC) + h21(floor(p / 180.0)) * 260.0, uAmbR));
  return mix(ICE, AMB, a);
}
float scanRing(vec2 p){
  if (uScanR <= 0.0) return 0.0;
  float d = length(p - uScanC) - uScanR;
  return exp(-d * d / 900.0) + 0.25 * exp(-max(-d, 0.0) / 260.0) * step(d, 0.0);
}`;

// ---------------- buildings ----------------
const BLD_VERT = /* glsl */ `
attribute vec4 aW; // u along the perimeter, u within this wall, wall length, outward direction (rad)
attribute vec4 aB; // height, kind (+10 on a media-facade tower), seed, wall index (-1 = roof)
attribute vec2 aC; // footprint centre
varying vec3 vW; varying vec4 vWall; varying vec4 vB; varying vec2 vC;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vWall = aW; vB = aB; vC = aC;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BLD_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD; uniform float uT; uniform float uLit;
uniform sampler2D tShowA, tShowB; uniform float uShowOn, uShowFlip; uniform vec3 uShowC, uShowR; uniform vec3 uShowBox;
varying vec3 vW; varying vec4 vWall; varying vec4 vB; varying vec2 vC;
${NOISE}
${MASK}
${SKY_GLSL}
void main(){
  float top = vB.x; float seed = vB.z; float wallId = vB.w;
  float show = step(9.5, vB.y); float kind = vB.y - 10.0 * show;
  // typ: 0 glass office / landmark, 1 housing, 2 urban village, 3 low (industry, stations, halls)
  float typ = kind > 3.5 ? 0.0 : kind;
  bool roof = wallId < -0.5;
  float on = lightsOn(vC);
  vec3 dc = dataCol(vC, relitAt(vC));
  vec3 col = vec3(0.0016, 0.0019, 0.0028);
  float hk = 0.55 + 0.45 * smoothstep(0.0, 260.0, vW.y); // points brighten with height: crowns read against the void
  float scan = scanRing(vC);
  if (roof) {
    float d = dotPx(vW.xz / 5.0, 0.55, 0.5);
    col += dc * d * 0.05 * on * hk;
  } else {
    float hcoord = vWall.x;
    float edgeD = min(vWall.y, vWall.z - vWall.y);
    float faceId = mod(wallId, 4.0) + 1.0;
    // one point per window module: 3 m x 4 m on offices, a 2.4 m bay per floor in housing, a room in the villages
    float fh = typ < 0.5 ? 4.0 : typ < 1.5 ? 2.95 : typ < 2.5 ? 3.1 : 6.0;
    float cw = typ < 0.5 ? 3.0 : typ < 1.5 ? 2.4 : typ < 2.5 ? 3.2 : 6.0;
    vec2 uvw = vec2(hcoord / cw, (vW.y - 1.0) / fh);
    vec2 cell = floor(uvw);
    vec2 fwc = fwidth(uvw);
    float litF = (typ < 0.5 ? 0.18 + 0.3 * h11(seed) : typ < 1.5 ? 0.22 + 0.3 * h11(seed + 3.0) : typ < 2.5 ? 0.35 + 0.3 * h11(seed + 3.0) : 0.15) * uLit;
    float bay = floor(cell.x / (6.0 + floor(h11(seed + 4.0) * 10.0)));
    float unit = floor(cell.x / 3.0);
    float rFloor = h21(vec2(cell.y * 1.3, seed + faceId));
    float rBay = h21(vec2(cell.y * 0.7 + bay * 3.1, seed * 1.7 + faceId));
    float rWin = h21(cell + seed * 13.0 + faceId * 7.1);
    float rUnit = h21(vec2(unit * 1.7 + faceId * 13.0, cell.y + seed * 3.3));
    float r = typ < 0.5 ? mix(mix(rFloor, rBay, 0.3), rWin, 0.55) : typ < 1.5 ? mix(rWin, rUnit, 0.8) : rWin;
    float lit = step(r, litF);
    // every module is a faint point; the rooms with people in them burn bright
    float big0 = smoothstep(9.0, 28.0, min(1.0 / max(fwc.x, 1e-5), 1.0 / max(fwc.y, 1e-5)));
    // three kinds of office facade, so the towers stop reading as one material: point grids, ribbon windows (floor
    // slabs as lines), vertical fins
    float vr = typ < 0.5 ? floor(h11(seed + 9.0) * 3.0) : 0.0;
    float bNear = mix(mix(0.02, 0.085, big0) * (vr > 0.5 ? 0.35 : 1.0), (typ < 0.5 ? 0.6 : 0.9) + 0.5 * h21(cell * 3.1 + seed), lit);
    float bFar = mix(0.012, 0.7, litF);
    float b = mix(bNear, bFar, smoothstep(0.7, 1.4, max(fwc.x, fwc.y)));
    // close up, the lattice opens into the building's own grid: window frames and floor slabs as hair lines
    vec2 cpx = 1.0 / max(fwc, vec2(1e-5));
    float big = smoothstep(9.0, 28.0, min(cpx.x, cpx.y));
    vec2 fr = fract(uvw);
    float dB = min(min(fr.x, 1.0 - fr.x) * cpx.x * 1.6, min(fr.y, 1.0 - fr.y) * cpx.y);
    float frame = smoothstep(1.3, 0.3, dB) * big;
    float pt = dotPx(uvw, (lit > 0.5 ? 0.95 : 0.7) + big * min(cpx.x, cpx.y) * 0.07, 0.4);
    // the lit rooms are people, and people stay cold white even in 安's amber city
    vec3 pc = mix(dc, ICE, lit);
    // the media facades of the CBD, as Shenzhen runs them: each tower face is a screen of LED points. First 安's mark
    // on every face, an amber tide rising up the towers; later the order, written down every face and marching
    if (show > 0.5 && uShowOn > 0.0) {
      float W = vWall.z;
      float k = uShowOn * step(1.5, vW.y) * step(26.0, W) * step(mix(150.0, 90.0, uShowFlip), top);
      float flip = step(h11(seed + 31.0) * 0.8 + 0.05, uShowFlip);
      float S = min(W * 0.8, top * 0.4);
      // read left to right whichever way the wall was wound
      float ux = dFdx(vWall.y) + dFdy(vWall.y) * 0.0 >= 0.0 ? vWall.y : W - vWall.y;
      vec2 g = vec2((ux - 0.5 * W) / S + 0.5, (vW.y - (top - 0.1 * top - S)) / S);
      float inA = step(0.0, g.x) * step(g.x, 1.0) * step(0.0, g.y) * step(g.y, 1.0);
      float breathe = 0.75 + 0.25 * sin(uT * 1.7 + h11(seed) * 6.0);
      float tide = exp(-pow((vW.y / top - fract(uT * 0.16 + h11(seed + 2.0) * 0.25)) * 9.0, 2.0)) * 0.22;
      float A = max(texture2D(tShowA, g).r * inA * breathe, tide);
      float Sb = min(W * 0.62, 34.0);
      vec2 gb = vec2((ux - 0.5 * W) / Sb + 0.5, fract((vW.y + uT * 9.0 + h11(seed) * 40.0) / (Sb * 12.0)));
      float inB = step(0.0, gb.x) * step(gb.x, 1.0) * step(4.0, vW.y);
      float Bv = texture2D(tShowB, gb).r * inB;
      float lum = mix(A, Bv, flip) * k;
      // the LED pitch is finer than the windows: 1.5 m by 2 m
      float ptL = dotPx(vec2(vWall.x / 1.5, vW.y / 2.0), 0.85, 0.6);
      float m = smoothstep(0.04, 0.2, lum);
      pc = mix(pc, AMB, m);
      pt = mix(pt, ptL, m);
      b = mix(b, 0.15 + 2.6 * lum, m);
    }
    // the crowns of the tall towers burn brighter, as Shenzhen's do: the skyline gets its tops back
    float crown = (typ < 0.5 && top > 150.0) ? smoothstep(top - 16.0, top - 4.0, vW.y) : 0.0;
    b *= 1.0 + crown * 1.8;
    col += pc * pt * b * on * hk;
    col += dc * frame * 0.11 * on;
    float nearL = 1.0 - smoothstep(0.35, 0.9, max(fwc.x, fwc.y));
    float lineF = 0.0;
    if (vr > 0.5 && vr < 1.5) lineF = lpx(min(fr.y, 1.0 - fr.y) * fh, 0.45);
    if (vr > 1.5) lineF = lpx(min(fr.x, 1.0 - fr.x) * cw, 0.45);
    col += dc * (lineF * nearL * 0.07 + (vr > 0.5 ? 0.012 : 0.0) * (1.0 - nearL)) * on * hk;
    // hair lines on the corners and along the roof; the ground line where the tower meets the street
    float e = lpx(edgeD, 0.55) * 0.45 + lpx(top - vW.y, 0.6) * 0.8 + lpx(vW.y - 0.3, 0.5) * 0.35;
    e *= typ > 2.5 ? 0.5 : 1.0;
    e *= 1.0 + crown * 1.5;
    col += dc * e * 0.16 * on * hk;
    col += AMB * scan * (pt * 1.6 + e * 0.4) * on;
    // the crest of 安's wave: each block flares as it is taken
    float cr = crestAt(vC);
    col += AMB * cr * (pt * 1.1 + e * 0.6 + lineF * nearL * 0.2 + 0.006) * on;
  }
  col = fogTo(col, vW, uCam, uFogD);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- streets ----------------
const ROAD_VERT = /* glsl */ `
attribute vec4 aR; // along (m), across (-1..1), width (m), class
varying vec3 vW; varying vec4 vR;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vR = aR; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ROAD_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD; uniform float uWet; uniform float uCarT, uFlow;
varying vec3 vW; varying vec4 vR;
${NOISE}
${MASK}
${SKY_GLSL}
float pools(float along, float across, float hw){
  float a = along - floor(along / 32.0 + 0.5) * 32.0;
  float d1 = across - (hw + 0.5); float d2 = across + (hw + 0.5);
  float s = 5.5;
  return exp(-(a * a / 70.0 + d1 * d1 / (s * s))) + exp(-(a * a / 70.0 + d2 * d2 / (s * s)));
}
void main(){
  float along = vR.x; float w = vR.z; float hw = 0.5 * w; float cls = vR.w;
  float x = (vR.y * 0.5 + 0.5) * w; // metres from the left edge
  float on = lightsOn(vW.xz);
  vec3 dc = dataCol(vW.xz, relitAt(vW.xz));
  vec3 col = vec3(0.0012, 0.0014, 0.002);
  float bright = cls < 1.5 ? 0.30 : cls < 3.5 ? 0.20 : cls < 5.5 ? 0.12 : 0.06;
  // the kerbs as two hair lines; lane dividers as a dotted line
  float edge = lpx(min(x, w - x) - 0.4, 0.5);
  float lanes = max(1.0, floor(w / 3.5 + 0.2));
  float lw = w / lanes;
  float dl = x - floor(x / lw + 0.5) * lw;
  float interior = step(1.0, x) * step(x, w - 1.0);
  float dashes = dotPx(vec2(dl / lw + 0.5, along / 6.0), 0.5, 0.25) * interior * step(1.5, lanes);
  col += dc * (edge * bright + dashes * bright * 0.5) * on;
  col += AMB * scanRing(vW.xz) * (edge * 1.5 + 0.08) * on;
  // the traffic as rivers of light, seen from far off: white heads on one side, red tails on the other. Up close the
  // real cars (points) take over, so the river only shows once a metre is under a pixel or so
  if (cls < 4.5) {
    float pxm = 1.0 / max(fwidth(along), 1e-4);
    float farK = smoothstep(2.5, 0.6, pxm) * uFlow;
    float side = step(0.5 * w, x);
    float dir = side > 0.5 ? -1.0 : 1.0;
    float lane = floor(x / lw);
    float sp = (cls < 1.5 ? 22.0 : 15.0) * (0.85 + 0.3 * h11(lane + 3.0));
    float gap = cls < 1.5 ? 14.0 : 22.0;
    float f = fract((along - dir * uCarT * sp) / gap + h11(lane * 7.1));
    float car = exp(-f * 6.0);
    float fw2 = fwidth(along) / gap;
    car = mix(car, 0.13, smoothstep(0.15, 0.6, fw2));
    float laneM = smoothstep(0.5, 0.15, abs(dl / lw)) * interior;
    laneM = mix(laneM, 0.45 * interior, smoothstep(0.3, 1.2, fwidth(x)));
    vec3 cc = side > 0.5 ? vec3(1.0, 0.10, 0.04) * 0.35 : ICE * 1.1;
    float flowB = cls < 1.5 ? 1.6 : cls < 3.5 ? 1.0 : 0.55;
    col += cc * car * laneM * flowB * farK * on;
  }
  col += AMB * crestAt(vW.xz) * (edge * 1.2 + 0.05) * on;
  col = fogTo(col, vW, uCam, uFogD);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------- ground ----------------
const GND_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GND_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uFogD;
uniform sampler2D tNear, tFar; uniform vec4 uNear, uFar; // x0, z0, x1, z1
varying vec3 vW;
${NOISE}
${MASK}
${SKY_GLSL}
void main(){
  vec2 p = vW.xz;
  float dist = length(vW - uCam);
  vec2 un = (p - uNear.xy) / (uNear.zw - uNear.xy);
  vec2 uf = (p - uFar.xy) / (uFar.zw - uFar.xy);
  vec4 gf = texture2D(tFar, uf);
  vec4 gn = texture2D(tNear, un);
  float inN = step(0.0, un.x) * step(un.x, 1.0) * step(0.0, un.y) * step(un.y, 1.0);
  float inF = step(0.0, uf.x) * step(uf.x, 1.0) * step(0.0, uf.y) * step(uf.y, 1.0);
  vec4 g = mix(gf * inF, gn, inN);
  float road = g.r, water = g.g, green = g.b, glow = g.a;
  float on = lightsOn(p);
  vec3 dc = dataCol(p, relitAt(p));
  vec3 col = vec3(0.0010, 0.0012, 0.0017);
  // a survey lattice over the land, every 20 m; trees in the parks as a scatter of points; the water left black
  float lat = dotPx(p / 20.0, 0.5, 0.18) * 0.05;
  vec2 tc = floor(p / 4.0);
  vec2 tj = p / 4.0 + (vec2(h21(tc), h21(tc + 7.7)) - 0.5) * 0.6;
  float trees = dotPx(tj, 0.55, 0.35) * step(0.45, h21(tc * 1.3)) * green * 0.09;
  float land = 1.0 - water;
  col += dc * (lat + trees) * land * on;
  // beyond the mapped core, the far plain: its streets drawn from the raster as a faint carpet of light
  float far = 1.0 - inN;
  col += dc * road * on * 0.05 * far * land;
  col += dc * glow * on * 0.035 * far * land;
  // under the mapped city too: the light spilling off its streets lies on the ground, so the towers stand on something
  col += dc * (glow * 0.03 + road * 0.012) * on * inN * land;
  col += AMB * crestAt(p) * (lat * 8.0 + 0.012) * land * on;
  // the shore: a hair line where land meets water
  float sh = lpx(water - 0.5, 0.6) * 0.12;
  col += dc * sh * on;
  col += AMB * scanRing(p) * (0.12 + lat * 6.0) * land * on;
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
  float a = smoothstep(0.5, 0.3, r) * 0.75 + 0.25 * exp(-r * r * 30.0);
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
    if (this.n >= this.max) console.warn("PointSet full", this.max);
    this.geo.setDrawRange(0, this.n);
    for (const k of ["position", "aCol", "aSize"]) (this.geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }
}

// ---------------- the media facades: 安's advert, and later its order ----------------
const drawShow = (c: CanvasRenderingContext2D, w: number, h: number, kind: 0 | 1) => {
  c.fillStyle = "#000";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff";
  c.textBaseline = "middle";
  c.textAlign = "center";
  if (kind === 0) {
    c.font = font(SERIF, w * 0.9, 900);
    c.fillText("安", w * 0.5, h * 0.53);
  } else {
    // twelve glyphs top to bottom, the texture repeats down the facade
    const msg = "为了您的安全，请留在家中";
    c.font = font(SANS, w * 0.82, 700);
    for (let k = 0; k < 12; k++) c.fillText(msg[k], w * 0.5, (k + 0.5) * (h / 12));
  }
};

type Bin = { n: number; info: Float32Array; offs: Uint32Array; pts: Float32Array };
const readBin = (buf: ArrayBuffer, stride: number, dim: number): Bin => {
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  const np = dv.getUint32(4, true);
  const info = new Float32Array(buf, 8, n * stride);
  const offs = new Uint32Array(buf, 8 + n * stride * 4, n + 1);
  const pts = new Float32Array(buf, 8 + n * stride * 4 + (n + 1) * 4, np * dim);
  return { n, info, offs, pts };
};

type Road = { c: number; w: number; oneway: boolean; br: boolean; x: Float32Array; y: Float32Array; z: Float32Array; s: Float32Array; L: number; bb: [number, number, number, number] };
type Car = { r: number; off: number; dir: number; speed: number; phase: number; col: number };
type P3 = { x: number; y: number; z: number; tx: number; tz: number };

const roadAt = (r: Road, s: number, out: P3) => {
  let lo = 0;
  let hi = r.s.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (r.s[m] <= s) lo = m;
    else hi = m;
  }
  const L = r.s[hi] - r.s[lo] || 1;
  const k = clamp((s - r.s[lo]) / L);
  out.x = r.x[lo] + (r.x[hi] - r.x[lo]) * k;
  out.y = r.y[lo] + (r.y[hi] - r.y[lo]) * k;
  out.z = r.z[lo] + (r.z[hi] - r.z[lo]) * k;
  out.tx = (r.x[hi] - r.x[lo]) / L;
  out.tz = (r.z[hi] - r.z[lo]) / L;
  return out;
};
const P0 = (): P3 => ({ x: 0, y: 0, z: 0, tx: 0, tz: 0 });

export const cityScene = (): SceneMod => {
  const scene = new THREE.Scene();
  const rnd = mulberry(20261104);
  const bldU = {
    uCam: { value: new THREE.Vector3() }, uFogD: { value: 0.00012 }, uT: { value: 0 }, uLit: { value: 1 },
    uOffR: { value: -1 }, uOnR: { value: -2 }, uBlink: { value: 1 }, uDusk: { value: 0 }, uGlow: { value: 1 }, uSun: { value: new THREE.Vector2(-0.94, 0.33) },
    tShowA: { value: null as THREE.Texture | null }, tShowB: { value: null as THREE.Texture | null }, uShowOn: { value: 1 }, uShowFlip: { value: 0 },
    uShowC: { value: new THREE.Vector3() }, uShowR: { value: new THREE.Vector3(1, 0, 0) }, uShowBox: { value: new THREE.Vector3(1600, 20, 260) },
    uWet: { value: 0.4 },
    uRevR: { value: -1 }, uRevC: { value: new THREE.Vector2(0, 0) },
    uAmbR: { value: -1 }, uAmbC: { value: new THREE.Vector2(3700, 1700) }, uScanR: { value: -1 }, uScanC: { value: new THREE.Vector2(0, 0) },
    uOnC: { value: new THREE.Vector2(3700, 1700) }, uCarT: { value: 0 }, uFlow: { value: 1 }, uHazeA: { value: 0 },
  };
  const showCv = [0, 1].map((k) => {
    const cv = document.createElement("canvas");
    cv.width = k === 0 ? 512 : 256;
    cv.height = k === 0 ? 512 : 3072;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return { cv, ctx: cv.getContext("2d") as CanvasRenderingContext2D, tex: t };
  });
  const adCv = document.createElement("canvas");
  adCv.width = 1280;
  adCv.height = 720;
  const adCtx = adCv.getContext("2d") as CanvasRenderingContext2D;
  const adTex = new THREE.CanvasTexture(adCv);
  adTex.colorSpace = THREE.SRGBColorSpace;
  adTex.anisotropy = 8;
  const scrU = { tAd: { value: adTex }, uOn: { value: 1 }, uFogD: { value: 0.0001 }, uCam: { value: new THREE.Vector3() } };
  const screenMat = new THREE.ShaderMaterial({
    uniforms: scrU,
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform sampler2D tAd; uniform float uOn, uFogD; uniform vec3 uCam; varying vec2 vUv; varying vec3 vW;
      void main(){
        vec3 c = texture2D(tAd, vUv).rgb;
        vec2 g = fract(vUv * vec2(320.0, 180.0));
        vec2 fw = fwidth(vUv * vec2(320.0, 180.0));
        float grid = mix(0.9 + 0.1 * step(0.15, g.x) * step(0.15, g.y), 0.97, smoothstep(0.3, 0.8, max(fw.x, fw.y)));
        c = c * grid * 0.8 * uOn;
        float f = exp(-length(vW - uCam) * uFogD);
        gl_FragColor = vec4(mix(vec3(0.02, 0.02, 0.03), c, f), 1.0);
      }`,
  });
  const SCREENS: { m: THREE.Mesh; x: number; z: number }[] = [];
  const NOTE_TXT = [
    "已为你避开拥堵",
    "孩子已安全到校",
    "妈妈的降压药，明天送到",
    "已为你拦截一封涉及隐私的邮件",
    "你的心率有点高，早点休息",
    "空调已调到 26°C",
    "已帮你清理 1,206 条过期记录",
    "已为你预约周四的体检",
    "外卖已到楼下",
    "天气转凉，记得加衣",
    "关机程序已更新",
    "已帮你回复：好的，马上到",
  ];
  const noteTex: THREE.CanvasTexture[] = [];
  const NOTES: { sp: THREE.Sprite; p: THREE.Vector3; t0: number; asp: number }[] = [];
  const makeNotes = () => {
    for (const txt of NOTE_TXT) {
      const cv = document.createElement("canvas");
      const c = cv.getContext("2d") as CanvasRenderingContext2D;
      const fs = 44;
      c.font = font(SANS, fs, 500);
      const w = Math.ceil(c.measureText(txt).width) + 90;
      cv.width = w;
      cv.height = 80;
      c.font = font(SANS, fs, 500);
      c.textBaseline = "middle";
      c.fillStyle = "rgba(0,0,0,0.55)";
      c.beginPath();
      c.roundRect(24, 6, w - 30, 56, 12);
      c.fill();
      c.fillStyle = "rgba(255,150,60,1)";
      c.beginPath();
      c.arc(14, 66, 9, 0, Math.PI * 2);
      c.fill();
      c.fillRect(13, 22, 2, 44);
      c.fillStyle = "rgba(255,214,170,1)";
      c.fillText(txt, 34, 34);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      noteTex.push(t);
    }
  };
  bldU.tShowA.value = showCv[0].tex;
  bldU.tShowB.value = showCv[1].tex;

  const skyU = { uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk, uGlow: bldU.uGlow, uSun: bldU.uSun, uHazeA: bldU.uHazeA };
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(40000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false }));
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);
  const hemi = new THREE.HemisphereLight(0x1a2a44, 0x2a1a10, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a60, 0);
  sun.position.set(-1, 0.25, 0.35);
  scene.add(sun);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9 });

  const ptU = { uScale: { value: 1 }, uMinPx: { value: 1.6 }, uFogD: bldU.uFogD };
  const ptMat = new THREE.ShaderMaterial({ vertexShader: PT_VERT, fragmentShader: PT_FRAG, uniforms: ptU, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const pts = new PointSet(900000, ptMat);
  scene.add(pts.mesh);

  const roads: Road[] = [];
  let lamps = new Float32Array(0); // x, y, z, warm
  const signals: { x: number; z: number; ph: number; ax: number; az: number }[] = [];
  let AVI: THREE.Vector3[] = [];
  const CARS: Car[] = [];
  const carKinds: THREE.InstancedMesh[] = []; // Kenney car kit (CC0), retinted per car
  const DRONES: { home: THREE.Vector3; launch: number; travel: number; orbitR: number; orbitY: number; ang: number; w: number; seed: number }[] = [];
  const DRONE_SLOTS: { p: THREE.Vector3; n: THREE.Vector3; d: number; seed: number }[] = [];
  const PYL: THREE.Vector3[] = [];
  let wireCurves: THREE.Vector3[][] = [];
  let AVE: Road[] = [];
  let meta: { core: number[]; far: number[]; marks: Record<string, [number, number, number]> } = { core: [0, 0, 1, 1], far: [0, 0, 1, 1], marks: {} };

  const steel = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(ICE[0] * 0.6, ICE[1] * 0.6, ICE[2] * 0.6) });
  let wire: number[] = [];
  const wireObj = () => {
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(wire, 3)), lineMat);
    wire = [];
    return l;
  };
  const beam = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    wire.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const len = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(r, r, len, 4, 1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    return g;
  };
  const buildProps = () => {
    // a 220 kV line marching in from the hills toward the city
    const yaw = Math.atan2(LOC.PYL_B.x - LOC.PYL_A.x, LOC.PYL_B.z - LOC.PYL_A.z);
    LOC.PYL_SIDE.set(Math.cos(yaw), 0, -Math.sin(yaw));
    LOC.PYL_DIR.copy(LOC.PYL_B).sub(LOC.PYL_A).normalize();
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
    const pg = mergeGeos(parts);
    const pylWire = wireObj();
    for (let k = 0; k <= 6; k++) {
      const p = LOC.PYL_A.clone().lerp(LOC.PYL_B, k / 6);
      PYL.push(p);
      const m = new THREE.Mesh(pg, steel);
      m.position.copy(p);
      m.rotation.y = yaw;
      m.add(new THREE.LineSegments(pylWire.geometry, lineMat));
      scene.add(m);
    }
    const armTips: [number, number][] = [
      [-11, 30],
      [11, 30],
      [-15, 38],
      [15, 38],
      [-11, 46],
      [11, 46],
    ];
    const wirePos: number[] = [];
    wireCurves = [];
    for (const [ox, oy] of armTips) {
      const pp: THREE.Vector3[] = [];
      for (let k = 0; k < PYL.length - 1; k++) {
        const a = PYL[k].clone().addScaledVector(LOC.PYL_SIDE, ox).setY(oy - 1.5);
        const b = PYL[k + 1].clone().addScaledVector(LOC.PYL_SIDE, ox).setY(oy - 1.5);
        for (let s = 0; s <= 24; s++) {
          const t = s / 24;
          const p = a.clone().lerp(b, t);
          p.y -= Math.sin(Math.PI * t) * 9;
          if (s > 0 || k === 0) pp.push(p);
        }
      }
      wireCurves.push(pp);
      for (let i = 0; i < pp.length - 1; i++) wirePos.push(pp[i].x, pp[i].y, pp[i].z, pp[i + 1].x, pp[i + 1].y, pp[i + 1].z);
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(wirePos, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(ICE[0] * 0.18, ICE[1] * 0.18, ICE[2] * 0.18) })));

    // the telecom mast on a housing tower's roof
    const mast = new THREE.Group();
    const pp: THREE.BufferGeometry[] = [];
    const Hm = 16;
    const cs = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const wv = (y: number) => lerp(1.3, 0.5, y / Hm);
    for (const [sx, sz] of cs) pp.push(beam(new THREE.Vector3(sx * wv(0), 0, sz * wv(0)), new THREE.Vector3(sx * wv(Hm), Hm, sz * wv(Hm)), 0.07));
    for (let y = 0; y < Hm; y += 2)
      for (let c = 0; c < 4; c++) {
        const [ax, az] = cs[c];
        const [bx, bz] = cs[(c + 1) % 4];
        pp.push(beam(new THREE.Vector3(ax * wv(y), y, az * wv(y)), new THREE.Vector3(bx * wv(y + 2), y + 2, bz * wv(y + 2)), 0.035));
      }
    pp.push(beam(new THREE.Vector3(0, Hm, 0), new THREE.Vector3(0, Hm + 4, 0), 0.05));
    mast.add(new THREE.Mesh(mergeGeos(pp), steel));
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
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
    mast.children.forEach((c) => {
      const mm = c as THREE.Mesh;
      if (mm.geometry && mm.geometry !== undefined && c !== mast.children[0]) wire.push(...edgeList(mm));
    });
    mast.add(wireObj());
    mast.position.copy(LOC.MAST);
    scene.add(mast);
  };

  const ready = (async () => {
    const [bb, rb, mj] = await Promise.all([
      fetch(staticFile("city/bld.bin")).then((r) => r.arrayBuffer()),
      fetch(staticFile("city/roads.bin")).then((r) => r.arrayBuffer()),
      fetch(staticFile("city/meta.json")).then((r) => r.json()),
    ]);
    meta = mj;
    LOC.mark = (name: string) => {
      const m = meta.marks[name];
      return m ? new THREE.Vector3(m[0], m[2], m[1]) : new THREE.Vector3();
    };
    const loadTex = (p: string) =>
      new Promise<THREE.Texture>((res) => {
        new THREE.TextureLoader().load(staticFile(p), (t) => {
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.anisotropy = 16;
          t.generateMipmaps = true;
          res(t);
        });
      });
    const [tNear, tFar] = await Promise.all([loadTex("city/ground.png"), loadTex("city/far.png")]);

    const B = readBin(bb, 7, 2);
    const clearR: [number, number, number][] = [];
    // the drone depots: the largest low halls within reach of the campus
    {
      const cand: { x: number; z: number; a: number; h: number }[] = [];
      for (let i = 0; i < B.n; i++) {
        const h = B.info[i * 7], kind = B.info[i * 7 + 1], osm = B.info[i * 7 + 3], cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
        if (kind !== 3 || h > 30 || osm < 0.5) continue;
        const d = Math.hypot(cx - LOC.DC.x, cz - LOC.DC.z);
        if (d < 700 || d > 3500) continue;
        let a = 0;
        const o0 = B.offs[i], o1 = B.offs[i + 1];
        for (let k = o0; k < o1; k++) {
          const k2 = k + 1 < o1 ? k + 1 : o0;
          a += B.pts[k * 2] * B.pts[k2 * 2 + 1] - B.pts[k2 * 2] * B.pts[k * 2 + 1];
        }
        cand.push({ x: cx, z: cz, a: Math.abs(a) / 2, h });
      }
      cand.sort((p, q) => q.a - p.a);
      for (const c of cand) {
        if (LOC.WARE.length >= 14) break;
        if (LOC.WARE.some((w) => Math.hypot(w.x - c.x, w.z - c.z) < 400)) continue;
        LOC.WARE.push(new THREE.Vector3(c.x, c.h + 0.5, c.z));
      }
    }

    // the mast stands on the roof of a housing tower east of Lianhuashan
    {
      let best = 1e9;
      for (let i = 0; i < B.n; i++) {
        const h = B.info[i * 7], kind = B.info[i * 7 + 1], cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
        if (kind !== 1 || h < 60 || h > 110) continue;
        const d = Math.hypot(cx - LOC.MAST_NEAR.x, cz - LOC.MAST_NEAR.z);
        if (d < best) {
          best = d;
          LOC.MAST.set(cx, h, cz);
        }
      }
    }
    // ---------- drone slots: in front of the windows of the housing towers around one street ----------
    {
      // the hero tower: housing nearest DRONE_C; the camera stands in the street in front of its longest wall
      let best = -1;
      let bd = 1e9;
      for (let i = 0; i < B.n; i++) {
        const h = B.info[i * 7], kind = B.info[i * 7 + 1], cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
        if (kind !== 1 || h < 70 || h > 140) continue;
        const d = Math.hypot(cx - LOC.DRONE_C.x, cz - LOC.DRONE_C.z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best >= 0) {
        const o0 = B.offs[best], o1 = B.offs[best + 1];
        let L = 0;
        for (let k = o0; k < o1; k++) {
          const k2 = k + 1 < o1 ? k + 1 : o0;
          const x0 = B.pts[k * 2], z0 = B.pts[k * 2 + 1], x1 = B.pts[k2 * 2], z1 = B.pts[k2 * 2 + 1];
          const len = Math.hypot(x1 - x0, z1 - z0);
          if (len > L) {
            L = len;
            const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
            LOC.DRONE_WALL.set((x0 + x1) / 2, B.info[best * 7], (z0 + z1) / 2);
            LOC.DRONE_N.set(nx, 0, nz);
          }
        }
        LOC.DRONE_CAM.copy(LOC.DRONE_WALL).setY(1.7).addScaledVector(LOC.DRONE_N, 55);
      }
      const cam = LOC.DRONE_CAM;
      // nearest homes first, so the slots run out far away, not in front of the camera
      const order: [number, number][] = [];
      for (let i = 0; i < B.n; i++) {
        const h = B.info[i * 7], kind = B.info[i * 7 + 1], cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
        if ((kind !== 1 && kind !== 2) || h < 20) continue;
        const d = Math.hypot(cx - cam.x, cz - cam.z);
        if (d < 1400) order.push([d, i]);
      }
      order.sort((a, b) => a[0] - b[0]);
      for (const [d, i] of order) {
        if (DRONE_SLOTS.length >= 7000) break;
        const h = B.info[i * 7], kind = B.info[i * 7 + 1];
        const o0 = B.offs[i], o1 = B.offs[i + 1];
        for (let k = o0; k < o1; k++) {
          const k2 = k + 1 < o1 ? k + 1 : o0;
          const x0 = B.pts[k * 2], z0 = B.pts[k * 2 + 1], x1 = B.pts[k2 * 2], z1 = B.pts[k2 * 2 + 1];
          const len = Math.hypot(x1 - x0, z1 - z0);
          if (len < 10) continue;
          const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
          const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
          const tl = Math.hypot(cam.x - mx, cam.z - mz);
          if ((nx * (cam.x - mx) + nz * (cam.z - mz)) / tl < 0.35) continue;
          const sx = kind === 2 ? 6.4 : 4.8, sy = kind === 2 ? 6.2 : 5.9;
          for (let u = 2.5; u < len - 2.5; u += sx)
            for (let y = 8; y < h - 3; y += sy) {
              const f = u / len;
              DRONE_SLOTS.push({
                p: new THREE.Vector3(x0 + (x1 - x0) * f + nx * 4.5, y, z0 + (z1 - z0) * f + nz * 4.5),
                n: new THREE.Vector3(nx, 0, nz),
                d,
                seed: h21js(x0 + u, y + z0),
              });
            }
        }
      }
    }

    // ---------- buildings: one merged mesh ----------
    {
      let nv = 0;
      let ni = 0;
      const keep: number[] = [];
      for (let i = 0; i < B.n; i++) {
        const cx = B.info[i * 7 + 4];
        const cz = B.info[i * 7 + 5];
        if (clearR.some(([x, z, r]) => Math.hypot(cx - x, cz - z) < r)) continue;
        keep.push(i);
        const m = B.offs[i + 1] - B.offs[i];
        nv += m * 5;
        ni += m * 6 + (m - 2) * 3;
      }
      const extra: { ring: [number, number][]; h: number; kind: number; seed: number }[] = [];
      for (let k = 0; k < 0; k++) {
        const x = LOC.DC.x - 160 + k * 80;
        const z = LOC.DC.z;
        extra.push({ ring: [[x - 26, z - 95], [x + 26, z - 95], [x + 26, z + 95], [x - 26, z + 95]], h: 16, kind: 3, seed: 70 + k });
      }
      nv += extra.length * 20;
      ni += extra.length * 30;
      const P = new Float32Array(nv * 3);
      const AW = new Float32Array(nv * 4);
      const AB = new Float32Array(nv * 4);
      const AC = new Float32Array(nv * 2);
      const I = new Uint32Array(ni);
      let v = 0;
      let ii = 0;
      const isShow = (h: number, cx: number, cz: number) => h > 110 && Math.hypot(cx - LOC.SHOW_C.x, cz - LOC.SHOW_C.z) < LOC.SHOW_R;
      const emit = (ring: [number, number][], h: number, kind: number, seed: number, cx: number, cz: number, y0 = 0) => {
        const m = ring.length;
        const k10 = isShow(h, cx, cz) && kind !== 3 ? kind + 10 : kind;
        let u = 0;
        for (let e = 0; e < m; e++) {
          const [x0, z0] = ring[e];
          const [x1, z1] = ring[(e + 1) % m];
          const dx = x1 - x0;
          const dz = z1 - z0;
          const len = Math.hypot(dx, dz);
          const ang = Math.atan2(-dx, dz); // outward normal (dz, -dx) of a CCW ring
          const base = v;
          const quad: [number, number, number, number][] = [
            [x0, y0, z0, 0],
            [x1, y0, z1, len],
            [x1, h, z1, len],
            [x0, h, z0, 0],
          ];
          for (const [x, y, z, su] of quad) {
            P[v * 3] = x;
            P[v * 3 + 1] = y;
            P[v * 3 + 2] = z;
            AW[v * 4] = u + su;
            AW[v * 4 + 1] = su;
            AW[v * 4 + 2] = len;
            AW[v * 4 + 3] = ang;
            AB[v * 4] = h;
            AB[v * 4 + 1] = k10;
            AB[v * 4 + 2] = seed;
            AB[v * 4 + 3] = e;
            AC[v * 2] = cx;
            AC[v * 2 + 1] = cz;
            v++;
          }
          I[ii++] = base;
          I[ii++] = base + 2;
          I[ii++] = base + 1;
          I[ii++] = base;
          I[ii++] = base + 3;
          I[ii++] = base + 2;
          u += len;
        }
        const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
        const base = v;
        for (const [x, z] of ring) {
          P[v * 3] = x;
          P[v * 3 + 1] = h;
          P[v * 3 + 2] = z;
          AW[v * 4] = -1;
          AW[v * 4 + 1] = -1;
          AW[v * 4 + 2] = -1;
          AW[v * 4 + 3] = 0;
          AB[v * 4] = h;
          AB[v * 4 + 1] = k10;
          AB[v * 4 + 2] = seed;
          AB[v * 4 + 3] = -1;
          AC[v * 2] = cx;
          AC[v * 2 + 1] = cz;
          v++;
        }
        for (const [a, b, c] of tris) {
          if (ii + 3 > I.length) break;
          const ax = ring[a][0], az = ring[a][1];
          const cr = (ring[b][0] - ax) * (ring[c][1] - az) - (ring[b][1] - az) * (ring[c][0] - ax);
          // (b-a)×(c-a) points up (+y) when this x/z cross product is negative
          I[ii++] = base + a;
          if (cr < 0) {
            I[ii++] = base + b;
            I[ii++] = base + c;
          } else {
            I[ii++] = base + c;
            I[ii++] = base + b;
          }
        }
      };
      for (const i of keep) {
        const ring: [number, number][] = [];
        for (let k = B.offs[i]; k < B.offs[i + 1]; k++) ring.push([B.pts[k * 2], B.pts[k * 2 + 1]]);
        const h = B.info[i * 7];
        emit(ring, h, B.info[i * 7 + 1], B.info[i * 7 + 2], B.info[i * 7 + 4], B.info[i * 7 + 5], B.info[i * 7 + 6]);
        if (h > 110) AVI.push(new THREE.Vector3(B.info[i * 7 + 4], h + 2, B.info[i * 7 + 5]));
      }
      for (const e of extra) emit(e.ring, e.h, e.kind, e.seed, LOC.DC.x, LOC.DC.z);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P.subarray(0, v * 3), 3));
      g.setAttribute("aW", new THREE.BufferAttribute(AW.subarray(0, v * 4), 4));
      g.setAttribute("aB", new THREE.BufferAttribute(AB.subarray(0, v * 4), 4));
      g.setAttribute("aC", new THREE.BufferAttribute(AC.subarray(0, v * 2), 2));
      g.setIndex(new THREE.BufferAttribute(I.subarray(0, ii), 1));
      const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: BLD_VERT, fragmentShader: BLD_FRAG, uniforms: bldU }));
      mesh.frustumCulled = false;
      scene.add(mesh);
      AVI = AVI.sort((a, b) => b.y - a.y).slice(0, 700);
    }

    // ---------- big LED screens: on the towers each establishing shot looks at, the wall that faces its camera ----------
    {
      const used = new Set<number>();
      for (const [cam, n, dmin, dmax] of LOC.SCREEN_CAMS) {
        const cand: { i: number; score: number; mid: [number, number]; nx: number; nz: number; len: number; h: number }[] = [];
        for (let i = 0; i < B.n; i++) {
          const h = B.info[i * 7], kind = B.info[i * 7 + 1], cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
          if (h < 90 || h > 330 || kind === 3 || used.has(i)) continue;
          const d = Math.hypot(cx - cam.x, cz - cam.z);
          if (d < dmin || d > dmax) continue;
          const o0 = B.offs[i], o1 = B.offs[i + 1];
          for (let k = o0; k < o1; k++) {
            const k2 = k + 1 < o1 ? k + 1 : o0;
            const x0 = B.pts[k * 2], z0 = B.pts[k * 2 + 1], x1 = B.pts[k2 * 2], z1 = B.pts[k2 * 2 + 1];
            const len = Math.hypot(x1 - x0, z1 - z0);
            if (len < 32) continue;
            const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
            const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
            const tx = cam.x - mx, tz = cam.z - mz;
            const tl = Math.hypot(tx, tz);
            const f = (nx * tx + nz * tz) / tl;
            if (f < 0.75) continue;
            cand.push({ i, score: f * Math.min(len, 70) * Math.min(1, h / 150), mid: [mx, mz], nx, nz, len, h });
          }
        }
        cand.sort((a, b) => b.score - a.score);
        const picked: typeof cand = [];
        for (const c of cand) {
          if (picked.length >= n) break;
          if (picked.some((p) => Math.hypot(p.mid[0] - c.mid[0], p.mid[1] - c.mid[1]) < 260)) continue;
          picked.push(c);
          used.add(c.i);
        }
        for (const c of picked) {
          const sw = Math.min(c.len * 0.86, 78);
          const sh = (sw * 9) / 16;
          const y = clamp(c.h * 0.62, sh / 2 + 25, c.h - sh / 2 - 10);
          const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
          m.position.set(c.mid[0] + c.nx * 0.8, y, c.mid[1] + c.nz * 0.8);
          m.rotation.y = Math.atan2(c.nx, c.nz);
          // the data look has no screens: the facades themselves are the display
          // a black bezel, so the screen reads as a screen hung on the tower
          const bz = new THREE.Mesh(new THREE.BoxGeometry(sw + 2.4, sh + 2.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6, metalness: 0.3 }));
          bz.position.set(c.mid[0] + c.nx * 0.35, y, c.mid[1] + c.nz * 0.35);
          bz.rotation.y = m.rotation.y;
          SCREENS.push({ m, x: c.mid[0], z: c.mid[1] });
          LOC.SCREENS.push({ p: new THREE.Vector3(c.mid[0] + c.nx * 0.8, y, c.mid[1] + c.nz * 0.8), n: new THREE.Vector3(c.nx, 0, c.nz), w: sw });
          console.log("screen", Math.round(c.mid[0]), Math.round(c.mid[1]), Math.round(y), Math.round(sw));
        }
      }
    }

    // ---------- streets ----------
    const R = readBin(rb, 4, 3);
    for (let i = 0; i < R.n; i++) {
      const c = R.info[i * 4];
      const n = R.offs[i + 1] - R.offs[i];
      if (n < 2) continue;
      const x = new Float32Array(n);
      const y = new Float32Array(n);
      const z = new Float32Array(n);
      const s = new Float32Array(n);
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (let k = 0; k < n; k++) {
        const o = (R.offs[i] + k) * 3;
        x[k] = R.pts[o];
        y[k] = R.pts[o + 1];
        z[k] = R.pts[o + 2];
        if (k) s[k] = s[k - 1] + Math.hypot(x[k] - x[k - 1], z[k] - z[k - 1]);
        x0 = Math.min(x0, x[k]);
        z0 = Math.min(z0, z[k]);
        x1 = Math.max(x1, x[k]);
        z1 = Math.max(z1, z[k]);
      }
      if (c >= 6 && clearR.some(([cx, cz, r]) => Math.hypot((x0 + x1) / 2 - cx, (z0 + z1) / 2 - cz) < r * 0.8)) continue;
      roads.push({ c, w: R.info[i * 4 + 1], oneway: R.info[i * 4 + 2] > 0.5, br: R.info[i * 4 + 3] > 0.5, x, y, z, s, L: Math.max(1, s[n - 1]), bb: [x0, z0, x1, z1] });
    }
    {
      let nv = 0;
      for (const r of roads) nv += r.x.length * 2;
      const P = new Float32Array(nv * 3);
      const A = new Float32Array(nv * 4);
      const idx: number[] = [];
      let v = 0;
      const barrier: number[] = [];
      const pillars: [number, number, number, number][] = [];
      const lampList: number[] = [];
      const o = P0();
      for (const r of roads) {
        const n = r.x.length;
        const half = r.w / 2;
        const lift = r.br ? 0.25 : 0.12 + (7 - Math.min(7, r.c)) * 0.012;
        const base = v;
        for (let k = 0; k < n; k++) {
          const ka = Math.max(0, k - 1);
          const kb = Math.min(n - 1, k + 1);
          let tx = r.x[kb] - r.x[ka];
          let tz = r.z[kb] - r.z[ka];
          const tl = Math.hypot(tx, tz) || 1;
          tx /= tl;
          tz /= tl;
          for (const sd of [-1, 1]) {
            P[v * 3] = r.x[k] - tz * half * sd;
            P[v * 3 + 1] = r.y[k] + lift;
            P[v * 3 + 2] = r.z[k] + tx * half * sd;
            A[v * 4] = r.s[k];
            A[v * 4 + 1] = sd;
            A[v * 4 + 2] = r.w;
            A[v * 4 + 3] = r.c;
            v++;
          }
          if (k < n - 1) {
            const a = base + k * 2;
            idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        if (r.c <= 6) {
          for (let s = 16; s < r.L; s += 32) {
            roadAt(r, s, o);
            const warm = h21js(o.x * 0.002 + 7.3, o.z * 0.002) < 0.55 ? 1 : 0;
            const hh = r.c <= 2 ? 11 : r.c <= 4 ? 9 : 6.5;
            for (const sd of [-1, 1]) lampList.push(o.x - o.tz * (half + 0.8) * sd, o.y + hh, o.z + o.tx * (half + 0.8) * sd, warm);
          }
        }
        if (r.br && r.c <= 5) {
          const a = P0();
          const b = P0();
          for (let s = 0; s < r.L; s += 4) {
            roadAt(r, s, a);
            roadAt(r, Math.min(r.L, s + 4), b);
            if (a.y < 0.5 && b.y < 0.5) continue;
            for (const sd of [-1, 1]) {
              const ax = a.x - a.tz * half * sd, az = a.z + a.tx * half * sd;
              const bx = b.x - b.tz * half * sd, bz = b.z + b.tx * half * sd;
              barrier.push(ax, a.y - 1.4, az, bx, b.y - 1.4, bz, bx, b.y + 1.1, bz, ax, a.y - 1.4, az, bx, b.y + 1.1, bz, ax, a.y + 1.1, az);
            }
          }
          for (let s = 15; s < r.L; s += 32) {
            roadAt(r, s, o);
            if (o.y > 4) pillars.push([o.x, o.y - 1.4, o.z, Math.atan2(o.tx, o.tz)]);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      g.setAttribute("aR", new THREE.BufferAttribute(A, 4));
      g.setIndex(idx);
      const rm = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: ROAD_VERT, fragmentShader: ROAD_FRAG, uniforms: bldU, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      rm.frustumCulled = false;
      scene.add(rm);
      const bg = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(barrier, 3));
      bg.computeVertexNormals();
      const bm = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0x2c2d30, roughness: 0.85, side: THREE.DoubleSide }));
      bm.frustumCulled = false;
      const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 1, 4.5).translate(0, 0.5, 0), concrete, Math.max(1, pillars.length));
      const m4 = new THREE.Matrix4();
      pillars.forEach(([x, y, z, a], k) => {
        m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, y, 1));
        pm.setMatrixAt(k, m4);
      });
      pm.count = pillars.length;
      pm.frustumCulled = false;
      lamps = new Float32Array(lampList);
    }
    // signals where two major streets meet at ground level
    {
      const ends = new Map<string, { x: number; z: number; ax: number; az: number; n: number }>();
      for (const r of roads) {
        if (r.c > 4 || r.c === 0 || r.br) continue;
        for (let k = 0; k < r.x.length; k++) {
          const key = `${Math.round(r.x[k])},${Math.round(r.z[k])}`;
          const e = ends.get(key);
          if (e) e.n++;
          else {
            const kb = Math.min(r.x.length - 1, k + 1);
            const ka = Math.max(0, k - 1);
            ends.set(key, { x: r.x[k], z: r.z[k], ax: r.x[kb] - r.x[ka], az: r.z[kb] - r.z[ka], n: 1 });
          }
        }
      }
      for (const e of ends.values()) {
        if (e.n < 2) continue;
        if (signals.some((s) => Math.abs(s.x - e.x) < 40 && Math.abs(s.z - e.z) < 40)) continue;
        const l = Math.hypot(e.ax, e.az) || 1;
        signals.push({ x: e.x, z: e.z, ph: h21js(e.x * 0.1, e.z * 0.1) * 30, ax: e.ax / l, az: e.az / l });
        if (signals.length > 6000) break;
      }
    }
    // cars: every lane of the streets, spaced by class
    {
      const gap = [26, 28, 34, 40, 55, 45, 140];
      roads.forEach((r, ri) => {
        if (r.c > 6) return;
        const lanes = Math.max(1, Math.floor(r.w / 3.4));
        const per = r.oneway ? lanes : Math.max(1, Math.floor(lanes / 2));
        for (const dir of r.oneway ? [1] : [1, -1])
          for (let l = 0; l < per; l++) {
            const off = r.oneway ? (l + 0.5 - per / 2) * 3.4 : dir * (l + 0.5) * 3.4;
            const cnt = Math.floor(r.L / (gap[r.c] * (0.8 + rnd() * 0.5)));
            const speed = [24, 20, 15, 13, 11, 14, 8][r.c] * (0.85 + rnd() * 0.3);
            for (let k = 0; k < cnt; k++) CARS.push({ r: ri, off, dir, speed, phase: rnd() * r.L, col: rnd() });
          }
      });
    }
    {
      const names = ["sedan", "suv", "taxi", "van", "hatchback-sports", "suv-luxury", "sedan-sports", "truck", "ambulance"];
      const loader = new GLTFLoader();
      const gl = DATA_LOOK ? [] : await Promise.all(names.map((n) => loader.loadAsync(staticFile(`cars/${n}.glb`))));
      gl.forEach((g, k) => {
        const parts: THREE.BufferGeometry[] = [];
        let map: THREE.Texture | null = null;
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh) return;
          const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
          for (const a of Object.keys(geo.attributes)) if (a !== "position" && a !== "normal" && a !== "uv") geo.deleteAttribute(a);
          parts.push(geo);
          map = ((mesh.material as THREE.MeshStandardMaterial).map as THREE.Texture) ?? map;
        });
        const geo = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
        // the kit's cars are chunky toys: stretch them to real proportions (4.6 m long, 1.85 m wide), nose along +x
        geo.computeBoundingBox();
        const bx = geo.boundingBox!;
        const len = names[k] === "truck" ? 8.5 : names[k] === "van" ? 5.2 : names[k] === "ambulance" ? 5.6 : 4.6;
        geo.translate(0, -bx.min.y, 0);
        geo.scale((names[k] === "ambulance" ? 2.05 : 1.95) / (bx.max.x - bx.min.x), (names[k] === "truck" ? 3.0 : names[k] === "van" ? 2.0 : names[k] === "ambulance" ? 2.6 : 1.5) / (bx.max.y - bx.min.y), len / (bx.max.z - bx.min.z));
        geo.rotateY(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.32, color: 0xffffff });
        const im = new THREE.InstancedMesh(geo, mat, 1600);
        im.setColorAt(0, new THREE.Color(1, 1, 1));
        im.count = 0;
        im.frustumCulled = false;
        scene.add(im);
        carKinds.push(im);
      });
    }
    // the avenue of the green wave: the chain of Shennan Boulevard's segments running east past the CBD
    {
      const cand = roads.filter((r) => r.c <= 3 && Math.abs(r.z[0] - LOC.AVE_Z) < 160);
      let cur = cand.filter((r) => Math.abs(r.x[0] - LOC.AVE_X0) < 400 && r.c <= 2 && r.x[r.x.length - 1] > r.x[0]).sort((a, b) => Math.abs(a.z[0] - LOC.AVE_Z) - Math.abs(b.z[0] - LOC.AVE_Z))[0];
      const seen = new Set<Road>();
      while (cur && !seen.has(cur) && AVE.length < 60) {
        AVE.push(cur);
        seen.add(cur);
        const ex = cur.x[cur.x.length - 1], ez = cur.z[cur.z.length - 1];
        cur = cand.filter((r) => !seen.has(r) && Math.hypot(r.x[0] - ex, r.z[0] - ez) < 3 && r.x[Math.min(r.x.length - 1, 1)] > r.x[0] - 1).sort((a, b) => a.c - b.c)[0];
      }
      console.log("avenue", AVE.length, AVE.length ? Math.round(AVE[0].x[0]) + "," + Math.round(AVE[0].z[0]) + " → " + Math.round(AVE[AVE.length - 1].x[AVE[AVE.length - 1].x.length - 1]) : "");
    }

    const gndU = { ...bldU, tNear: { value: tNear }, tFar: { value: tFar }, uNear: { value: new THREE.Vector4(meta.core[0], meta.core[1], meta.core[2], meta.core[3]) }, uFar: { value: new THREE.Vector4(meta.far[0], meta.far[1], meta.far[2], meta.far[3]) } };
    const fx0 = meta.far[0], fz0 = meta.far[1], fx1 = meta.far[2], fz1 = meta.far[3];
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(fx1 - fx0 + 40000, fz1 - fz0 + 40000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: GND_VERT, fragmentShader: GND_FRAG, uniforms: gndU }));
    ground.position.set((fx0 + fx1) / 2, 0, (fz0 + fz1) / 2);
    scene.add(ground);

    for (let k = 0; k < 5200; k++) {
      const home = LOC.WARE.length ? LOC.WARE[k % LOC.WARE.length] : LOC.DC;
      const phi = 0.12 + Math.acos(1 - rnd() * 0.85) * 0.9;
      const Rr = 430 + rnd() * 25;
      DRONES.push({
        home: home.clone().add(new THREE.Vector3((rnd() - 0.5) * 80, 0, (rnd() - 0.5) * 50)),
        launch: rnd() * 2.6,
        travel: 3.2 + rnd() * 2.2,
        orbitR: Rr * Math.cos(phi),
        orbitY: 20 + Rr * Math.sin(phi),
        ang: rnd() * Math.PI * 2,
        w: 0.05 * (k % 2 === 1 ? -1 : 1),
        seed: rnd(),
      });
    }
    buildProps();
    // 安's notes in the care shot: windows of the homes in front of the camera, spread out, nearest first
    {
      const slots = DRONE_SLOTS.filter((d) => d.seed < 0.5 && d.p.y > 12);
      const r2 = mulberry(77);
      const picked: THREE.Vector3[] = [];
      for (let tries = 0; tries < 4000 && picked.length < 44; tries++) {
        const d = slots[Math.floor(r2() * slots.length)];
        if (!d) break;
        if (picked.some((q) => q.distanceTo(d.p) < 45)) continue;
        picked.push(d.p.clone());
      }
      picked.forEach((pp, i) => {
        const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, opacity: 0 });
        const sp = new THREE.Sprite(mat);
        sp.center.set(0.012, 0.18);
        sp.position.copy(pp);
        sp.visible = false;
        sp.renderOrder = 10;
        scene.add(sp);
        // they come faster and faster: one, then a few, then everywhere at once
        const t0 = 0.5 + 5.0 * Math.pow(i / 44, 0.62);
        NOTES.push({ sp, p: pp, t0, asp: 1 });
      });
    }
  })();

  const st: CityState = { dusk: 0, offR: -1, onR: -2, onX: LOC.DC.x, onZ: LOC.DC.z, blink: 1, allRed: 0, carT: 0, carBlink: 1, revR: -1, revX: 0, revZ: 0, ambR: -1, ambX: 0, ambZ: 0 };
  const o = P0();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const tmpV = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);
  const pc = new THREE.Color();

  const aveS = (lt: number) => LOC.AVE_S0 + 19 * lt;
  const waveX = (amb: P3, lt: number) => amb.x + 50 + 170 * lt;
  const avePos = (s: number) => {
    for (const r of AVE) {
      if (s <= r.L) return roadAt(r, s, P0());
      s -= r.L;
    }
    const r = AVE[AVE.length - 1];
    return roadAt(r, r.L, P0());
  };
  LOC.avePos = (lt: number) => (AVE.length ? avePos(aveS(lt)) : P0());

  let gt0 = 0;
  let showDrawn = false;
  let noteOn = -1;
  let carK = 1;
  const fillPoints = (mode: string, lt: number, cam: THREE.PerspectiveCamera, bodies: boolean) => {
    pts.begin();
    const camP = cam.position;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    const far = camP.y > 400 ? Math.max(9000, camP.y * 2.2) : 5500;
    const far2 = far * far;
    const vis = (x: number, z: number, y: number) => {
      const dx = x - camP.x, dz = z - camP.z, dy = y - camP.y;
      if (dx * dx + dz * dz > far2) return false;
      return dx * fwd.x + dy * fwd.y + dz * fwd.z > -60;
    };
    for (let i = 0; i < lamps.length; i += 4) {
      const x = lamps[i], y = lamps[i + 1], z = lamps[i + 2];
      if (!vis(x, z, y)) continue;
      const on = lightsOnJS(x, z, st);
      if (on <= 0) continue;
      const c = dcol(x, z, st);
      const f = 1.3 * on * (1 + 3 * crestJS(x, z, st));
      pts.add(x, y, z, c[0] * f, c[1] * f, c[2] * f, 0.6);
    }
    const nbk = carKinds.map(() => 0);
    const amb = mode === "greenwave" && AVE.length ? avePos(aveS(lt)) : null;
    for (const c of CARS) {
      const r = roads[c.r];
      const bb = r.bb;
      if (bb[0] - camP.x > far || camP.x - bb[2] > far || bb[1] - camP.z > far || camP.z - bb[3] > far) continue;
      let s = c.phase + c.dir * c.speed * st.carT;
      s = ((s % r.L) + r.L) % r.L;
      roadAt(r, s, o);
      const tx = o.tx * c.dir, tz = o.tz * c.dir;
      let off = c.off;
      // on the avenue, cars pull over to the kerb ahead of the ambulance
      if (amb && Math.abs(o.z - amb.z) < 30 && o.x > amb.x + 8 && o.x < waveX(amb, lt) && AVE.includes(r)) off = Math.sign(off) * (r.w / 2 - 1.2);
      if (amb && AVE.includes(r) && Math.abs(o.x - amb.x) < 9 && Math.abs(o.z - amb.z) < 9) continue;
      const x = o.x - o.tz * off, z = o.z + o.tx * off;
      const y = o.y + (r.br ? 0.25 : 0.12);
      if (!vis(x, z, y)) continue;
      const b = st.carBlink;
      // a car is a bright head and a short fading tail along its lane
      const cc = b > 1.5 ? AMB : dcol(x, z, st);
      const kb = b > 1.5 ? 2.2 : b;
      const moving = Math.abs(c.speed) > 0 && st.carT === gt0 ? 1 : 0;
      const kb2 = kb * carK;
      pts.add(x + tx * 2.0, y + 0.8, z + tz * 2.0, cc[0] * 3.4 * kb2, cc[1] * 3.4 * kb2, cc[2] * 3.4 * kb2, 0.75);
      for (let k = 1; k <= 4; k++) {
        const f = (1 - k / 5) * (0.25 + 0.75 * moving);
        pts.add(x + tx * (2.0 - k * 2.2), y + 0.8, z + tz * (2.0 - k * 2.2), cc[0] * 1.6 * kb2 * f, cc[1] * 1.6 * kb2 * f, cc[2] * 1.6 * kb2 * f, 0.6);
      }
      if (bodies && carKinds.length) {
        const dx = x - camP.x, dz = z - camP.z;
        if (dx * dx + dz * dz < 1300 * 1300) {
          // mostly sedans and SUVs, a few taxis, vans and trucks
          const u = c.col;
          const k = u < 0.34 ? 0 : u < 0.6 ? 1 : u < 0.7 ? 2 : u < 0.78 ? 3 : u < 0.86 ? 4 : u < 0.92 ? 5 : u < 0.97 ? 6 : 7;
          const im = carKinds[k];
          if (nbk[k] < 1600) {
            q.setFromAxisAngle(Y, Math.atan2(-tz, tx));
            m4.compose(tmpV.set(x, y, z), q, ONE);
            im.setMatrixAt(nbk[k], m4);
            const tint = k === 2 ? 0.55 : 0.08 + 0.5 * hash1(c.phase);
            im.setColorAt(nbk[k], pc.setRGB(tint, tint, tint * 1.03));
            nbk[k]++;
          }
        }
      }
    }
    carKinds.forEach((im, k) => {
      im.count = nbk[k];
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
    for (const it of signals) {
      if (!amb && st.allRed < 0.5) continue;
      if (!vis(it.x, it.z, 6)) continue;
      const on = lightsOnJS(it.x, it.z, st);
      if (on <= 0) continue;
      let ewGreen = Math.floor((lt + 1000 + it.ph) / 15) % 2 === 0;
      // the green wave: red until the ambulance is close, then green just ahead of it
      if (amb && Math.abs(it.z - amb.z) < 70 && Math.abs(it.x - amb.x) < 3000) ewGreen = it.x > amb.x - 60 && it.x < waveX(amb, lt);
      const red = st.allRed > 0.5;
      const ax = it.ax * 14, az = it.az * 14;
      const heads: [number, number, number][] = [
        [ax - az * 0.6, az + ax * 0.6, 1],
        [-ax + az * 0.6, -az - ax * 0.6, 1],
        [-az + ax * 0.6, ax + az * 0.6, 0],
        [az - ax * 0.6, -ax - az * 0.6, 0],
      ];
      for (const [ox, oz, along] of heads) {
        const g = !red && (along === 1 ? ewGreen : !ewGreen);
        const sz = amb && Math.abs(it.z - amb.z) < 70 ? 2.6 : 1.4;
        if (g) pts.add(it.x + ox, 6, it.z + oz, 0.15 * on, 3.2 * on, 1.2 * on, sz);
        else pts.add(it.x + ox, 6, it.z + oz, 3.6 * on, 0.25 * on, 0.1 * on, sz);
      }
    }
    if (amb) {
      // roof bar strobing red and blue, headlights, and the beams thrown down the road ahead
      const ph = Math.floor(lt * 9) % 4;
      const nx = -amb.tz, nz = amb.tx;
      const ay = amb.y + 0.15;
      pts.add(amb.x + amb.tx * 1.6 + nx * 0.6, ay + 2.75, amb.z + amb.tz * 1.6 + nz * 0.6, ph < 2 ? 40 : 1, ph < 2 ? 2 : 0.6, ph < 2 ? 1.2 : 0.5, 2.2);
      pts.add(amb.x + amb.tx * 1.6 - nx * 0.6, ay + 2.75, amb.z + amb.tz * 1.6 - nz * 0.6, 0.8, ph >= 2 ? 4 : 0.4, ph >= 2 ? 44 : 0.4, 2.2);
      // the strobes wash the road around it red, then blue
      pts.add(amb.x, ay + 0.4, amb.z, ph < 2 ? 0.5 : 0.04, 0.03, ph < 2 ? 0.04 : 0.55, 26);
      pts.add(amb.x + amb.tx * 2.8 + nx * 0.8, ay + 0.8, amb.z + amb.tz * 2.8 + nz * 0.8, 5, 5, 4.5, 0.7);
      pts.add(amb.x + amb.tx * 2.8 - nx * 0.8, ay + 0.8, amb.z + amb.tz * 2.8 - nz * 0.8, 5, 5, 4.5, 0.7);
      pts.add(amb.x - amb.tx * 2.8 + nx * 0.8, ay + 0.9, amb.z - amb.tz * 2.8 + nz * 0.8, 3, 0.15, 0.08, 0.6);
      pts.add(amb.x - amb.tx * 2.8 - nx * 0.8, ay + 0.9, amb.z - amb.tz * 2.8 - nz * 0.8, 3, 0.15, 0.08, 0.6);
    }
    const avOn = (Math.floor((lt + 100) * 1.0) % 2 === 0 ? 1 : 0.08) * st.blink;
    for (const a of AVI) {
      const on = lightsOnJS(a.x, a.z, st) > 0 ? 1 : 0;
      pts.add(a.x, a.y, a.z, 3.5 * avOn * on, 0.3 * avOn * on, 0.15 * avOn * on, 2.0);
    }
    const mOn = (Math.floor((lt + 100) * 1.6) % 2 === 0 ? 1 : 0.0) * st.blink;
    const M = LOC.MAST;
    pts.add(M.x, M.y + 20.3, M.z, 3 * mOn, 0.25 * mOn, 0.12 * mOn, 0.5);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const on = Math.floor(lt * 3 + k) % 3 === 0 ? 1 : 0.3;
      pts.add(M.x + Math.cos(a) * 1.0, M.y + 13.6, M.z + Math.sin(a) * 1.0, AMB[0] * 3 * on, AMB[1] * 3 * on, AMB[2] * 3 * on, 0.25);
    }
    if (mode === "masts") {
      for (let k = 0; k < 4; k++) {
        const f = (lt * 0.55 + k / 4) % 1;
        const R = 6 + f * 520;
        const nn = Math.floor(60 + R * 1.2);
        const g = Math.pow(1 - f, 1.5) * 2.2;
        for (let j = 0; j < nn; j++) {
          const an = (j / nn) * Math.PI * 2;
          pts.add(M.x + Math.cos(an) * R, M.y + 14 - f * 10, M.z + Math.sin(an) * R, AMB[0] * g, AMB[1] * g, AMB[2] * g, 0.9);
        }
      }
    }
    if (mode === "grid") {
      for (const w of wireCurves) {
        for (let qq = 0; qq < 6; qq++) {
          const f = (lt * 0.09 + qq / 6 + hash1(w.length + qq) * 0.05) % 1;
          const idx = Math.floor(f * (w.length - 1));
          for (let tail = 0; tail < 18; tail++) {
            const p2 = w[Math.max(0, idx - Math.floor(tail / 2))];
            const k = (1 - tail / 18) * 0.45;
            const near = Math.exp(-p2.distanceTo(camP) / 700);
            pts.add(p2.x, p2.y, p2.z, AMB[0] * 4.5 * k * near, AMB[1] * 4.5 * k * near, AMB[2] * 4.5 * k * near, 0.7 * (1 - tail / 18) + 0.15);
          }
        }
      }
    }
    if (noteOn >= 0) {
      for (const n of NOTES) {
        const a = clamp((noteOn - n.t0) / 0.25) * clamp((n.t0 + 2.6 - noteOn) / 0.5);
        if (a > 0) pts.add(n.p.x, n.p.y, n.p.z, AMB[0] * 6 * a, AMB[1] * 6 * a, AMB[2] * 6 * a, 1.2);
      }
    }
    if (mode === "drones") {
      // they come down out of the dark sky, nearest homes first, and stop in front of the windows; each turns a small
      // white light on the window it watches
      for (const d of DRONE_SLOTS) {
        const delay = 0.4 + d.d / 420 + d.seed * 1.4;
        const k = ease(clamp((lt - delay) / 2.6));
        if (k <= 0 && lt < delay - 3) continue;
        const from = d.p.clone().addScaledVector(d.n, 60 + d.seed * 80).setY(d.p.y + 160 + d.seed * 200);
        const p = from.lerp(d.p, k);
        p.y += Math.sin(lt * 1.7 + d.seed * 40) * 0.25 * k;
        const dc = p.distanceTo(camP);
        const eye = k > 0.97 ? 1 : 0.15;
        const strobe = Math.floor((lt + d.seed * 3) * 2.2) % 3 === 0 ? 1.4 : 0.6;
        if (dc < 220) {
          pts.add(p.x - 0.35, p.y, p.z, AMB[0] * 2.4, AMB[1] * 2.4, AMB[2] * 2.4, 0.3);
          pts.add(p.x + 0.35, p.y, p.z, AMB[0] * 2.4, AMB[1] * 2.4, AMB[2] * 2.4, 0.3);
          pts.add(p.x - d.n.x * 0.5, p.y - 0.15, p.z - d.n.z * 0.5, AMB[0] * 2.5 * eye, AMB[1] * 2.5 * eye, AMB[2] * 2.5 * eye, 0.4);
        } else pts.add(p.x, p.y, p.z, AMB[0] * (1.6 + 1.6 * eye) * strobe, AMB[1] * (1.6 + 1.6 * eye) * strobe, AMB[2] * (1.6 + 1.6 * eye) * strobe, 0.9);
      }
    }
    pts.end();
  };

  const aimShow = (from: THREE.Vector3, width: number, y0: number, height: number) => {
    const d = LOC.SHOW_C.clone().sub(from).setY(0).normalize();
    bldU.uShowC.value.copy(LOC.SHOW_C);
    bldU.uShowR.value.set(-d.z, 0, d.x);
    bldU.uShowBox.value.set(width, y0, height);
  };

  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    st.dusk = 0;
    st.offR = -1;
    st.onR = -2;
    st.onX = LOC.DC.x;
    st.onZ = LOC.DC.z;
    st.blink = 1;
    st.allRed = 0;
    st.carT = gt;
    st.carBlink = 1;
    st.ambR = -1;
    st.revR = -1;
    st.ambX = LOC.DC.x;
    st.ambZ = LOC.DC.z;
    gt0 = gt;
    carK = 1;
    bldU.uSun.value.set(-0.94, 0.33);
    let look: Partial<Look> = { bloom: 0.75, bloomThreshold: 0.55, bloomRadius: 0.5, streak: 0.12, lift: [0.0, 0.0, 0.0], gain: [1.0, 1.0, 1.0], sat: 1.0, grain: 0.035, vignette: 0.5, exposure: 1.0, ca: 0.35 };
    const S = SHOTS[mode] ?? SHOTS.dusk;
    const r = S(lt, { gt, shot, st });
    look = { ...look, ...(r.look ?? {}) };
    if (r.dusk !== undefined) st.dusk = r.dusk;
    if (r.amb !== undefined) st.ambR = r.amb;
    if (r.carK !== undefined) carK = r.carK;
    if (r.ambC) {
      st.ambX = r.ambC.x;
      st.ambZ = r.ambC.z;
    }
    bldU.uAmbR.value = st.ambR;
    bldU.uAmbC.value.set(st.ambX, st.ambZ);
    if (r.rev !== undefined) {
      st.revR = r.rev;
      st.revX = r.revC?.x ?? 0;
      st.revZ = r.revC?.z ?? 0;
    }
    bldU.uRevR.value = st.revR;
    bldU.uRevC.value.set(st.revX, st.revZ);
    bldU.uScanR.value = r.scan ?? (st.revR > 0 ? st.revR : -1);
    if (r.scanC) bldU.uScanC.value.set(r.scanC.x, r.scanC.z);
    else if (st.revR > 0) bldU.uScanC.value.set(st.revX, st.revZ);
    if (r.sun) bldU.uSun.value.copy(r.sun);
    const pos = r.pos.clone();
    const amp = (r.drift ?? 1.2) * clamp(r.fov / 45, 0.06, 1);
    pos.x += drift(gt, 3, amp);
    pos.y += drift(gt, 4, amp * 0.75);
    if (look.dof && look.focus === undefined) look.focus = pos.distanceTo(r.tgt);
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(r.tgt);
    cam.fov = r.fov;
    cam.near = r.near ?? 1;
    cam.far = r.far ?? 60000;
    skyMesh.position.copy(cam.position);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const sw = r.showFrom ?? pos;
    aimShow(sw, r.showW ?? 1700, r.showY0 ?? 25, r.showH ?? 300);

    bldU.uCam.value.copy(cam.position);
    bldU.uT.value = gt;
    bldU.uOffR.value = st.offR;
    bldU.uOnR.value = st.onR;
    bldU.uOnC.value.set(st.onX, st.onZ);
    bldU.uCarT.value = st.carT;
    bldU.uFlow.value = r.flow ?? 1;
    bldU.uHazeA.value = st.onR > 0 ? clamp(st.onR / 9000) : st.ambR > 5e4 ? 1 : 0;
    bldU.uBlink.value = st.blink;
    bldU.uDusk.value = st.dusk;
    bldU.uLit.value = r.lit ?? 0.9;
    bldU.uWet.value = r.wet ?? 0.35;
    bldU.uFogD.value = r.fog ?? lerp(0.00013, 0.0001, st.dusk);
    bldU.uShowFlip.value = r.flip ?? 0;
    skyU.uGlow.value = st.offR > 0 && st.onR < st.offR ? lerp(1, 0.15, clamp(st.offR / 6000) - clamp(st.onR / 6000)) : 1;
    hemi.intensity = lerp(0.35, 0.9, st.dusk);
    sun.intensity = st.dusk * 1.4;
    ptU.uScale.value = H / (2 * Math.tan((cam.fov * Math.PI) / 360));
    const showOn = r.showOn ?? 0;
    bldU.uShowOn.value = showOn;
    scrU.uCam.value.copy(cam.position);
    scrU.uFogD.value = bldU.uFogD.value;
    const scrOn = r.screens ?? showOn;
    for (const sc of SCREENS) sc.m.visible = scrOn > 0;
    if (scrOn > 0) {
      drawAd(adCtx, 1280, 720, gt, r.flip ?? 0);
      adTex.needsUpdate = true;
      scrU.uOn.value = scrOn * (SCREENS.length ? lightsOnJS(SCREENS[0].x, SCREENS[0].z, st) : 1);
    }
    if (showOn > 0 && !showDrawn) {
      drawShow(showCv[0].ctx, 512, 512, 0);
      drawShow(showCv[1].ctx, 256, 3072, 1);
      showCv[0].tex.needsUpdate = true;
      showCv[1].tex.needsUpdate = true;
      showDrawn = true;
    }
    if (r.notes && !noteTex.length) makeNotes();
    const proj11 = 1 / Math.tan((cam.fov * Math.PI) / 360);
    NOTES.forEach((n, i) => {
      const a = r.notes ? clamp((lt - n.t0) / 0.25) * clamp((n.t0 + 2.6 - lt) / 0.5) : 0;
      n.sp.visible = a > 0.001;
      if (!n.sp.visible) return;
      const tx = noteTex[i % noteTex.length];
      const m = n.sp.material as THREE.SpriteMaterial;
      if (m.map !== tx) {
        m.map = tx;
        m.needsUpdate = true;
      }
      m.opacity = a;
      const img = tx.image as HTMLCanvasElement;
      const hpx = 46; // label height on a 1080-line frame
      const sy = hpx / 540 / proj11;
      n.sp.scale.set((sy * img.width) / img.height, sy, 1);
    });
    noteOn = r.notes ? lt : -1;
    for (const im of carKinds) im.visible = !!r.bodies;
    fillPoints(mode, lt, cam, !!r.bodies);
    if (carKinds[8]) {
      const amb = mode === "greenwave" && AVE.length ? avePos(aveS(lt)) : null;
      carKinds[8].count = amb ? 1 : 0;
      if (amb) {
        q.setFromAxisAngle(Y, Math.atan2(-amb.tz, amb.tx));
        m4.compose(tmpV.set(amb.x - amb.tz * 1.8, amb.y + 0.15, amb.z + amb.tx * 1.8), q, ONE);
        carKinds[8].setMatrixAt(0, m4);
        carKinds[8].setColorAt(0, pc.setRGB(0.85, 0.85, 0.85));
        carKinds[8].instanceMatrix.needsUpdate = true;
        if (carKinds[8].instanceColor) carKinds[8].instanceColor.needsUpdate = true;
        carKinds[8].visible = true;
      }
    }
    return look;
  };

  return { scene, ready, update };
};

// ---------------- places (metres from Ping An; read off tools/city_map.py) ----------------
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const LOC = {
  DC: V3(3700, 0, 1700), // 安's data-centre campus, by the river on the border
  WARE: [] as THREE.Vector3[], // drone depots: the bonded zone's warehouses
  SHOW_C: V3(250, 0, -450), // centre of the media-facade picture across the CBD
  SHOW_R: 1150,
  PYL_A: V3(2750, 0, -3350), // a 220 kV line over Bijiashan, pointing at the CBD
  PYL_B: V3(2050, 0, -2450),
  PYL_DIR: V3(1, 0, 0),
  PYL_SIDE: V3(0, 0, 1),
  MAST_NEAR: V3(1500, 0, -2000),
  DRONE_C: V3(1350, 0, 1300), // the housing estates south of the CBD
  DRONE_WALL: V3(1350, 90, 1300),
  DRONE_N: V3(0, 0, 1),
  DRONE_CAM: V3(1350, 1.7, 1360),
  MAST: V3(1500, 80, -2000),
  AVE_Z: -690, // Shennan Boulevard past the CBD
  AVE_X0: -1200,
  AVE_S0: 2600,
  // the cameras the big screens are turned to: [camera, how many, min/max distance]
  SCREENS: [] as { p: THREE.Vector3; n: THREE.Vector3; w: number }[],
  HERO_SCREEN: 1, // which screen the dusk shot opens on (index into SCREENS)
  BB_SCREEN: 0,
  SCREEN_CAMS: [
    [V3(540, 320, -2400), 3, 900, 2600],
    [V3(2350, 24, -692), 2, 300, 1800],
    [V3(2050, 15, 548), 2, 300, 1800],
  ] as [THREE.Vector3, number, number, number][],
  mark: (n: string) => V3(0, 0, 0 * n.length),
  avePos: (lt: number) => ({ x: lt * 0, y: 0, z: 0, tx: 1, tz: 0 }) as P3,
};

// ---------------- shots ----------------
// Each returns the camera and what the city is doing. lt = shot-local time, gt = film time.
type ShotIn = { gt: number; shot: Ctx["shot"]; st: CityState };
type ShotOut = {
  pos: THREE.Vector3; tgt: THREE.Vector3; fov: number; near?: number; drift?: number; look?: Partial<Look>; dusk?: number; sun?: THREE.Vector2;
  amb?: number; ambC?: THREE.Vector3; carK?: number; rev?: number; revC?: THREE.Vector3; notes?: boolean; scan?: number; scanC?: THREE.Vector3;
  far?: number; lit?: number; wet?: number; fog?: number; flow?: number; flip?: number; showOn?: number; screens?: number; bodies?: boolean; showFrom?: THREE.Vector3; showW?: number; showY0?: number; showH?: number;
};
const LIANHUA = V3(620, 0, -2180); // Lianhuashan summit, the classic view south over the Civic Center to the CBD
const SHOTS: Record<string, (lt: number, i: ShotIn) => ShotOut> = {
  // act 1: dusk. One of the CBD's big screens, 安's advert, the towers around it soft behind
  // act 1, under the name card: the city appears as 安 maps it, a scan running out from the CBD over all of Futian
  reveal: (lt) => {
    const k = ease(clamp(lt / 6.2));
    const pos = V3(lerp(-2350, -2050, k), lerp(1180, 1060, k), lerp(-2950, -2700, k));
    const rv = 60 + 6400 * ease(clamp((lt - 0.4) / 5.4));
    return { pos, tgt: V3(380, 40, -300), fov: 36, rev: rv, revC: V3(0, 0, -150), lit: 1.0, drift: 0.4, look: { exposure: 1.15 } };
  },
  // the whole skyline from Lianhuashan: 安's mark on the face of every tower, an amber tide running up them
  skyline: (lt) => {
    const k = ease(clamp(lt / 4.6));
    const pos = V3(lerp(540, 520, k), lerp(320, 312, k), lerp(-2380, -2330, k));
    return { pos, tgt: V3(240, 140, -350), fov: lerp(27, 25.5, k), showOn: 1, lit: 1.1, drift: 0.5, look: { exposure: 1.1, streak: 0.15 } };
  },
  // what it does for every one of them: the homes south of the CBD, and at their windows 安's notes, one, a few, then
  // everywhere at once
  care: (lt) => {
    const W = LOC.DRONE_WALL, N = LOC.DRONE_N;
    const side = V3(-N.z, 0, N.x);
    const k = ease(clamp(lt / 6.2));
    const pos = W.clone().setY(0).addScaledVector(N, lerp(640, 560, k)).addScaledVector(side, lerp(240, 150, k)).setY(lerp(260, 230, k));
    const tgt = W.clone().setY(35).addScaledVector(side, -60).addScaledVector(N, -120);
    return { pos, tgt, fov: 34, lit: 1.05, notes: true, drift: 0.4, look: { exposure: 1.1 } };
  },
  // the green wave: an ambulance down Shennan Boulevard, followed from above and behind; ahead of it every signal
  // turns from red to green, one after another, a wave running down the avenue faster than it drives
  greenwave: (lt) => {
    const a = LOC.avePos(lt);
    const t = V3(a.tx, 0, a.tz);
    const side = V3(-a.tz, 0, a.tx);
    const pos = V3(a.x, 0, a.z).addScaledVector(t, -70).addScaledVector(side, 5).setY(a.y + 34 - lt * 0.4);
    const tgt = V3(a.x, 0, a.z).addScaledVector(t, 120).setY(a.y);
    return { pos, tgt, fov: 42, lit: 1.1, showOn: 1, look: { dof: 6, focus: pos.distanceTo(V3(a.x, 0, a.z)), aperture: 0.25, streak: 0.3 } };
  },
  // power: the line over Bijiashan at dusk, the CBD at the end of it
  grid: (lt) => {
    const p0 = LOC.PYL_A.clone().lerp(LOC.PYL_B, 0.5);
    const pos = p0.clone().addScaledVector(LOC.PYL_SIDE, 60).add(V3(0, 8 + lt * 1.5, 0)).addScaledVector(LOC.PYL_DIR, -120 + lt * 6);
    const tgt = LOC.PYL_B.clone().add(V3(0, 40, 0)).addScaledVector(LOC.PYL_DIR, 400);
    return { pos, tgt, fov: 36, dusk: 1, lit: 1.3, showOn: 1, look: { exposure: 1.15, gain: [1.06, 1.0, 0.94] } };
  },
  // traffic: Binhe Boulevard from a footbridge, long lens, the CBD and Ping An over the river of lights
  highway: (lt) => {
    const x = 2050 - lt * 4;
    return { pos: V3(x, 15, 548), tgt: V3(-400, 40, 470), fov: 9, dusk: 0.8, lit: 1.25, bodies: true, showOn: 1, carK: 0.12, look: { gain: [1.05, 1.0, 0.96], dof: 12, aperture: 0.5, focus: 1100 } };
  },
  // telecom: the mast on a housing tower's roof, orbiting
  masts: (lt) => {
    // the mast on a housing tower's roof, and 安 going out of it over the whole city, ring after ring
    const M = LOC.MAST;
    const a = 3.6 + lt * 0.05;
    return { pos: V3(M.x + Math.cos(a) * 150, M.y + 46 + lt * 1.2, M.z + Math.sin(a) * 150), tgt: V3(M.x, M.y + 6, M.z), fov: 36, drift: 0.3, lit: 1.1, look: { exposure: 1.1 } };
  },
  // act 3: the blackout runs out from the CBD over the whole of Futian and Luohu, then the city comes back
  // then the city comes back as 安's: from its data centre on the river, block by block, a tide of amber that rolls
  // across Luohu and the CBD and breaks under the camera on the beat (lt 6.62 = beat 128 of 《三体》)
  blackout: (lt, { st }) => {
    st.offR = 26000 * easeIn(clamp((lt - 0.4) / 3.0)) + (lt > 0.4 ? 10 : -1);
    const HIT = 6.62;
    st.onR = lt < 4.0 ? -2 : BLACKOUT_REACH * Math.pow((lt - 4.0) / (HIT - 4.0), 1.3);
    const k = ease(clamp(lt / 9.6));
    const pos = V3(lerp(-2100, -1650, k), lerp(600, 480, k), lerp(-2000, -1600, k));
    const hit = lt > HIT ? Math.exp(-(lt - HIT) * 2.2) : 0;
    return { pos, tgt: V3(lerp(2300, 2100, k), 0, lerp(700, 600, k)), fov: 44, lit: 0.85, drift: 0.3, look: { streak: 0.45, exposure: 1.05 + hit * 0.45, bloom: 0.75 + hit * 0.5 } };
  },
  // every car in the city stops at once: Shennan Boulevard again, where the green wave ran in act 1, a little higher;
  // the whole river of lights stops dead, every signal red, then every head- and tail-light blinks twice
  freeze: (lt, { gt, shot, st }) => {
    st.allRed = lt > 2.05 ? 1 : 0;
    const tf = shot.t0 - (shot.o ?? 0) + 2.0;
    const stopT = (t: number) => (t < tf ? t : tf + 0.35 * (1 - Math.exp(-(t - tf) / 0.35)));
    st.carT = stopT(gt);
    st.carBlink = (lt > 3.4 && lt < 3.62) || (lt > 4.0 && lt < 4.22) ? 0 : 1;
    const z = LOC.AVE_Z;
    const pos = V3(2300 - lt * 3, 62, z - 4);
    return { pos, tgt: V3(600, 4, z - 12), fov: 8.5, lit: 0.85, amb: 1e5, carK: 0.2, look: { streak: 0.2, dof: 6, focus: 1100, aperture: 0.2 } };
  },
  redlights: (lt, { st }) => {
    st.allRed = 1;
    st.carT = 100;
    return { pos: V3(330 + lt * 2, 75, -380), tgt: V3(70, 0, -690), fov: 34, lit: 0.85, amb: 1e5 };
  },
  // the advert becomes an order: down Shennan Boulevard to the CBD, tower after tower turns from 安's mark to the words,
  // marching down every face
  order: (lt, { st }) => {
    st.carT = 100;
    st.allRed = 1;
    const k = ease(clamp(lt / 5.4));
    const pos = V3(lerp(1950, 1820, k), lerp(150, 140, k), lerp(-820, -800, k));
    return { pos, tgt: V3(250, 170, -560), fov: 26, lit: 0.9, showOn: 1, flip: clamp((lt - 0.5) / 2.4), amb: 1e5, drift: 0.3, look: { streak: 0.15 } };
  },
  // the drones: from the street, looking up the face of a housing tower as they come down and stop at every other
  // window; then up and back, and every tower in sight has them
  drones: (lt, { st }) => {
    st.carT = 100;
    st.allRed = 1;
    const W = LOC.DRONE_WALL, N = LOC.DRONE_N;
    const side = V3(-N.z, 0, N.x);
    const k = ease(clamp((lt - 4.6) / 4.9));
    const pos = LOC.DRONE_CAM.clone().addScaledVector(side, 8).lerp(W.clone().setY(0).addScaledVector(N, 330).addScaledVector(side, 120).setY(150), k);
    const tgt = W.clone().setY(lerp(W.y * 0.62, W.y * 0.35, k)).addScaledVector(side, lerp(-2, -60, k));
    return { pos, tgt, fov: lerp(52, 46, k), near: 0.5, lit: 0.9, amb: 1e5, drift: lerp(0.3, 0.8, k), look: { streak: 0.2, dof: 4, focus: pos.distanceTo(W), aperture: lerp(0.25, 0.1, k) } };
  },
  // the ending, the city leg of one move: out of a window of a home (the tower the drones stopped at), out over the
  // street, then up and up until the whole city is one patch of light, looking down; the earth shot takes over at
  // the same altitude (endAlt)
  rise: (lt, { gt }) => {
    const y = endAlt(gt);
    const W = LOC.DRONE_WALL, N = LOC.DRONE_N;
    const a = clamp(Math.log(y / 60) / Math.log(50000 / 60));
    const win = W.clone().setY(0).addScaledVector(N, 2.0);
    const C = V3(900, 0, -900);
    const out = win.clone().addScaledVector(N, Math.min(900, (y - 60) * 1.4));
    const top = C.clone().add(V3(0, 0, 0.25 * y));
    const m = sstep(0.12, 0.72, a);
    const pos = out.clone().lerp(top, m).setY(y);
    const ahead = win.clone().addScaledVector(N, 900).setY(y * 0.55);
    const tgt = ahead.lerp(C, sstep(0.04, 0.55, a));
    return {
      pos, tgt, fov: lerp(50, 40, sstep(0, 0.6, a)), near: Math.max(0.5, y * 0.004), far: Math.max(60000, y * 3), drift: 0.3 * (1 - a), lit: 0.8,
      fog: 0.00012 * clamp(500 / y, 0.004, 1),
      look: { zoomBlur: lt < 1.0 ? (1 - lt) * 1.2 : 0, exposure: lt < 0.8 ? 1 + (0.8 - lt) * 3 : 1 },
    };
  },
  glimpse: () => ({ pos: V3(-2200, 1300, 2800), tgt: V3(300, 0, -300), fov: 40, lit: 0.8, amb: 1e5 }),
};

export const DATA_LOOK = true;
function edgeList(m: THREE.Mesh): number[] {
  const e = new THREE.EdgesGeometry(m.geometry, 30);
  e.applyMatrix4(new THREE.Matrix4().compose(m.position, m.quaternion, m.scale));
  return Array.from(e.getAttribute("position").array as Float32Array);
}
// minimal geometry merge (positions + normals)
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
void sstep;
void easeIn;
