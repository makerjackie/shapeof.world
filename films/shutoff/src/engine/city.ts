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

export type CityState = {
  dusk: number; // 1 dusk .. 0 night
  offR: number; // blackout front radius
  onR: number; // relight front radius
  blink: number; // global light multiplier (unison blink)
  allRed: number;
  carT: number; // traffic clock
  carBlink: number;
};

// ---------------- shared GLSL ----------------
const MASK = /* glsl */ `
uniform float uOffR, uOnR, uBlink, uDusk;
float district(vec2 p){ vec2 c = floor(p / 520.0); float d = length(c * 520.0 + 260.0); return d + h21(c * 1.7) * 260.0; }
float lightsOn(vec2 p){
  float d = district(p);
  float off = step(d, uOffR) * (1.0 - step(d, uOnR));
  return (1.0 - off) * uBlink;
}`;
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
const lightsOnJS = (x: number, z: number, s: CityState) => {
  const cx = Math.floor(x / 520);
  const cz = Math.floor(z / 520);
  const d = Math.hypot(cx * 520 + 260, cz * 520 + 260) + h21js(cx * 1.7, cz * 1.7) * 260;
  const off = d <= s.offR && d > s.onR ? 1 : 0;
  return (1 - off) * s.blink;
};

const SKY_GLSL = /* glsl */ `
uniform float uGlow; // 1 = the city's light pollution lights the haze; drops during the blackout
uniform vec2 uSun; // horizontal direction of the afterglow at dusk
vec3 skyCol(vec3 d){
  float e = max(d.y, 0.0);
  vec3 nightTop = vec3(0.0025, 0.004, 0.009), nightMid = vec3(0.010, 0.013, 0.024);
  vec3 nightHor = mix(vec3(0.010, 0.012, 0.019), vec3(0.042, 0.032, 0.030), uGlow);
  vec3 duskTop = vec3(0.006, 0.016, 0.05), duskHor = vec3(0.42, 0.19, 0.08);
  float west = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), uSun);
  vec3 dHor = mix(vec3(0.04, 0.07, 0.15), duskHor, pow(west, 2.5));
  vec3 night = mix(nightHor, nightMid, 1.0 - exp(-e * 9.0));
  night = mix(night, nightTop, smoothstep(0.08, 0.7, e));
  vec3 dusk = mix(dHor, duskTop, smoothstep(0.0, 0.45, pow(e, 0.6)));
  return mix(night, dusk, uDusk);
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
  vec3 n = roof ? vec3(0.0, 1.0, 0.0) : vec3(cos(vWall.w), 0.0, sin(vWall.w));
  vec3 V = normalize(vW - uCam);
  float on = lightsOn(vC);
  float hRel = vW.y;
  vec3 col;
  vec3 streetGlow = mix(vec3(1.0, 0.55, 0.22), vec3(0.85, 0.82, 0.75), smoothstep(0.55, 0.7, fbm(vC * 0.0011 + 7.3)));
  float up = exp(-hRel / 10.0) * 0.03 * on;
  float tone = h11(seed * 1.31);
  vec3 skin = tone < 0.4 ? vec3(0.006, 0.007, 0.009) : tone < 0.8 ? vec3(0.011, 0.011, 0.012) : vec3(0.016, 0.013, 0.011);
  if (typ > 1.5 && typ < 2.5) skin = vec3(0.016, 0.014, 0.012) * (0.8 + 0.5 * tone);
  skin *= 1.0 + 0.6 * uDusk;
  // facade lighting, the signature of Shenzhen at night: towers outlined with LED strips along every corner and the
  // roof line; many housing towers too, along the roof only
  float fl = h11(seed + 11.0);
  float contour = typ < 0.5 && ((top > 140.0 && fl < 0.5) || top > 230.0) ? 1.0 : 0.0;
  float roofLine = contour > 0.5 || (typ > 0.5 && typ < 1.5 && top > 60.0 && fl < 0.35) ? 1.0 : 0.0;
  float cc = h11(seed + 12.0);
  vec3 ledC = cc < 0.45 ? vec3(1.0, 0.72, 0.38) : cc < 0.8 ? vec3(0.85, 0.92, 1.0) : vec3(0.35, 0.78, 1.0);
  float ledI = 1.1 * on * mix(1.0, 0.45, uDusk);
  if (roof) {
    col = vec3(0.006, 0.007, 0.008) * (0.8 + 0.4 * vnoise(vW.xz * 0.3)) * (0.8 + 1.8 * h11(seed + 21.0));
    col += skyCol(vec3(0.0, 1.0, 0.0)) * 0.06;
    vec2 g = floor(vW.xz / 7.0);
    float l = step(0.985, h21(g + seed)) * smoothstep(0.7, 0.3, length(fract(vW.xz / 7.0) - 0.5) * 7.0);
    col += vec3(1.0, 0.8, 0.6) * l * 0.6 * on * step(typ, 1.5);
    col += streetGlow * up * 0.5;
  } else {
    float hcoord = vWall.x;
    float edgeD = min(vWall.y, vWall.z - vWall.y);
    float faceId = mod(wallId, 4.0) + 1.0;
    // real proportions: a 1.5 m curtain-wall module on offices, 2.4 m bays in housing, 3.2 m rooms in the villages
    float fh = typ < 0.5 ? 4.0 : typ < 1.5 ? 2.95 : typ < 2.5 ? 3.1 : 6.0;
    float cw = typ < 0.5 ? 1.5 : typ < 1.5 ? 2.4 : 3.2;
    vec2 uvw = vec2(hcoord / cw, (vW.y - 1.5) / fh);
    vec2 cell = floor(uvw); vec2 f = fract(uvw);
    vec2 fw = fwidth(uvw);
    float balcony = typ > 0.5 && typ < 1.5 && mod(cell.x, 3.0) < 0.5 ? 1.0 : 0.0;
    float aaX = smoothstep(0.25, 0.7, fw.x);
    float aaY = smoothstep(0.45, 0.95, fw.y);
    vec2 wmin = typ < 0.5 ? vec2(0.05, 0.10) : balcony > 0.5 ? vec2(0.08, 0.10) : typ < 1.5 ? vec2(0.23, 0.30) : vec2(0.2, 0.28);
    vec2 wmax = typ < 0.5 ? vec2(0.95, 0.93) : balcony > 0.5 ? vec2(0.92, 0.80) : typ < 1.5 ? vec2(0.77, 0.80) : vec2(0.72, 0.78);
    float win = step(wmin.x, f.x) * step(f.x, wmax.x) * step(wmin.y, f.y) * step(f.y, wmax.y);
    if (typ > 2.5) win *= step(0.8, h21(cell + seed)) * step(cell.y, 1.5);
    float litF = (typ < 0.5 ? 0.14 + 0.3 * h11(seed) : typ < 1.5 ? 0.12 + 0.28 * h11(seed + 3.0) : typ < 2.5 ? 0.3 + 0.3 * h11(seed + 3.0) : 0.3) * uLit;
    if (top > 240.0) litF = max(litF, 0.35 * uLit);
    float bay = floor(cell.x / (6.0 + floor(h11(seed + 4.0) * 10.0)));
    float unit = floor(cell.x / 3.0);
    float rFloor = h21(vec2(cell.y * 1.3, seed + faceId));
    float rBay = h21(vec2(cell.y * 0.7 + bay * 3.1, seed * 1.7 + faceId));
    float rWin = h21(cell + seed * 13.0 + faceId * 7.1);
    float rUnit = h21(vec2(unit * 1.7 + faceId * 13.0, cell.y + seed * 3.3));
    float r = typ < 0.5 ? mix(rFloor, rBay, 0.22) : typ < 1.5 ? mix(rWin, rUnit, 0.8) : rWin;
    float lit = step(r, litF);
    float k = h21(cell * 1.7 + seed);
    vec3 wc = typ < 0.5 ? (h11(seed + 6.0) < 0.6 ? vec3(0.95, 0.88, 0.76) : vec3(0.8, 0.87, 1.0))
      : typ < 1.5 ? (k < 0.7 ? vec3(1.0, 0.64, 0.34) : k < 0.97 ? vec3(1.0, 0.8, 0.58) : vec3(0.45, 0.6, 1.0) * (0.7 + 0.3 * sin(uT * 9.0 + k * 50.0)))
      : (k < 0.45 ? vec3(0.85, 0.95, 1.0) : k < 0.85 ? vec3(1.0, 0.7, 0.4) : vec3(1.0, 0.9, 0.75));
    float sp = h21(cell * 3.1 + seed * 7.0);
    float wint = typ < 0.5 ? (0.10 + 0.55 * sp * sp * sp) * (0.6 + 0.6 * h21(vec2(bay, cell.y))) : (0.12 + 0.8 * pow(h21(vec2(unit, cell.y) + 3.3), 2.0)) * (balcony > 0.5 ? 0.8 : 1.0);
    float blind = step(0.72, h21(cell * 2.9 + seed)) * (0.35 + 0.4 * h21(cell + 7.7));
    float fy = (f.y - wmin.y) / (wmax.y - wmin.y);
    float inner = mix(0.7, 1.15, smoothstep(0.1, 0.95, fy));
    inner *= fy > 1.0 - blind ? 0.45 : 1.0;
    float fres = 0.04 + 0.96 * pow(1.0 - abs(dot(V, n)), 5.0);
    vec3 Rf = reflect(V, n);
    vec3 glass = mix(vec3(0.003), skyCol(Rf), smoothstep(-0.06, 0.04, Rf.y)) * (typ < 0.5 ? 0.12 + 0.8 * fres : 0.05 + 0.2 * fres) * (0.6 + 0.4 * smoothstep(0.0, 200.0, vW.y));
    vec3 wall = skin * (0.85 + 0.3 * vnoise(vec2(hcoord, vW.y) * 0.2));
    if (typ < 0.5) wall = mix(wall, glass * 0.8, 0.55);
    if (typ < 0.5) wall *= 0.7 + 0.3 * step(0.5, f.y);
    if (balcony > 0.5) wall += streetGlow * 0.012 * on * smoothstep(0.1, 0.0, f.y) * (1.0 - aaY);
    // the media facade: every window module is one LED pixel of a picture spread across the whole skyline
    vec3 led = vec3(0.0);
    float ledOn = 0.0;
    if (show > 0.5 && uShowOn > 0.0) {
      vec2 st = vec2(dot(vW - uShowC, uShowR) / uShowBox.x + 0.5, (vW.y - uShowBox.y) / uShowBox.z);
      vec2 res = vec2(uShowBox.x / 1.5, uShowBox.z / 4.0);
      vec2 sq = (floor(st * res) + 0.5) / res;
      float inside = step(0.0, st.x) * step(st.x, 1.0) * step(0.0, st.y) * step(st.y, 1.0);
      float facing = smoothstep(0.05, 0.3, dot(n, -normalize(vec3(uShowR.z, 0.0, -uShowR.x))));
      float flip = step(h11(seed + 31.0) * 0.8 + 0.05, uShowFlip);
      led = mix(texture2D(tShowA, sq).rgb * 1.8, texture2D(tShowB, sq).rgb * 1.1, flip) * on;
      ledOn = inside * facing * uShowOn * step(1.5, vW.y);
    }
    vec3 winCol = mix(glass, wc * wint * inner * on, lit);
    winCol = mix(winCol, led, ledOn);
    float area = (wmax.x - wmin.x) * (wmax.y - wmin.y);
    vec3 pattern = mix(wall, winCol, win);
    vec3 cellAvg = mix(wall, mix(mix(glass, wc * wint * on, lit), led, ledOn), area);
    vec3 avg = mix(wall, mix(mix(glass, wc * (typ < 0.5 ? 0.26 : 0.55) * on, litF), led, ledOn), area);
    col = mix(mix(pattern, cellAvg, aaX), avg, aaY);
    col *= mod(faceId, 2.0) < 0.5 ? 1.0 : 0.82;
    col += vec3(1.0, 0.45, 0.2) * 0.02 * uDusk * max(0.0, dot(n, normalize(vec3(-1.0, 0.2, 0.35))));
    col += streetGlow * up;
    // ground floor: shopfronts and lobbies glowing onto the pavement; the urban villages are all shops at street level
    if (typ < 2.5) {
      float shop = step(hRel, 4.6) * step(0.8, hRel) * step(typ > 1.5 ? 0.15 : 0.35, h21(vec2(floor(hcoord / 6.0), seed)));
      vec3 sc = h21(vec2(floor(hcoord / 6.0), seed + 2.0)) < 0.6 ? vec3(1.0, 0.72, 0.45) : vec3(0.75, 0.88, 1.0);
      col += sc * shop * (typ > 1.5 ? 0.35 : 0.22) * on;
    }
    if (contour > 0.5) {
      float L = lineAA(edgeD, 0.35) + lineAA(top - vW.y, 0.5);
      col = mix(col, ledC * ledI, clamp(L, 0.0, 1.0) * (1.0 - ledOn));
    } else if (roofLine > 0.5) {
      col = mix(col, ledC * ledI * 0.8, clamp(lineAA(top - vW.y, 0.4), 0.0, 1.0));
    }
    if (typ < 0.5 && top > 140.0 && h11(seed + 8.0) < 0.55) col += vec3(0.75, 0.85, 1.0) * smoothstep(9.0, 0.0, top - vW.y) * 0.5 * on;
    if (typ > 2.5) col += vec3(0.6, 0.85, 1.0) * smoothstep(0.08, 0.0, abs(fract(vW.y / 6.0) - 0.5)) * 0.12 * on * step(0.6, h11(seed + 2.0));
    col *= 0.6 + 0.4 * smoothstep(0.0, 6.0, hRel);
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
uniform vec3 uCam; uniform float uFogD; uniform float uWet;
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
  float ac = vR.y * hw;
  float on = lightsOn(vW.xz);
  vec3 col = vec3(0.011, 0.011, 0.012) * (0.8 + 0.4 * vnoise(vW.xz * 0.35));
  // lanes: white dashes between lanes, solid edge lines, a solid yellow pair on the centre of two-way roads
  float lanes = max(1.0, floor(w / 3.5 + 0.2));
  float lw = w / lanes;
  float dl = abs(x - floor(x / lw + 0.5) * lw);
  float dash = step(0.4, fract(along / 10.0));
  float interior = step(0.6, x) * step(x, w - 0.6);
  float mark = lineAA(dl, 0.08) * dash * interior + lineAA(min(x, w - x) - 0.35, 0.08);
  float centre = cls < 4.5 && cls > 0.5 && abs(cls - 5.0) > 0.5 ? lineAA(abs(abs(ac) - 0.18), 0.07) : 0.0;
  vec3 lampC = mix(vec3(1.0, 0.55, 0.2), vec3(0.82, 0.8, 0.72), smoothstep(0.55, 0.7, fbm(vW.xz * 0.0011 + 7.3)));
  float lp = pools(along, ac, hw);
  float lit = lp * 0.07 + 0.002;
  col += vec3(0.6) * mark * (0.02 + lit * 0.5) * on;
  col += vec3(0.75, 0.55, 0.12) * centre * (0.02 + lit * 0.5) * on;
  col += lampC * lit * on * (0.6 + 0.4 * uWet);
  vec3 V = normalize(vW - uCam);
  float fres = 0.02 + 0.98 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
  col += skyCol(reflect(V, vec3(0.0, 1.0, 0.0))) * fres * 0.12 * uWet;
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
  vec3 lampC = mix(vec3(1.0, 0.52, 0.18), vec3(0.82, 0.78, 0.7), smoothstep(0.55, 0.7, fbm(p * 0.0011 + 7.3)));
  vec3 lot = vec3(0.008, 0.008, 0.009) * (0.7 + 0.6 * vnoise(p * 0.06));
  vec3 col = mix(lot, vec3(0.003, 0.005, 0.004) * (0.7 + 0.6 * fbm(p * 0.01)), green);
  col = mix(col, vec3(0.011, 0.011, 0.012), road);
  float far = smoothstep(300.0, 3000.0, dist);
  col += lampC * glow * on * mix(0.012, 0.15, far) * (1.0 - water);
  col += lampC * road * on * 0.04 * far * (1.0 - water);
  if (water > 0.5) {
    vec3 V = normalize(vW - uCam);
    vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
    float rip = vnoise(vec2(p.x * 0.05, p.y * 0.4)) * 0.6 + vnoise(vec2(p.x * 0.2, p.y * 1.5)) * 0.4;
    col = vec3(0.002, 0.003, 0.005) + skyCol(R) * fres * 0.9;
    col += lampC * on * glow * 0.12 * (0.4 + 1.2 * rip);
  }
  col *= inF + (1.0 - inF) * 0.6;
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
  vec2 sp = vec2(atan(d.z, d.x), d.y) * 300.0;
  float s = step(0.997, h21(floor(sp))) * smoothstep(0.1, 0.6, d.y) * (1.0 - uDusk);
  c += vec3(0.8, 0.85, 1.0) * s * 0.12;
  float cl = fbm(d.xz / max(d.y, 0.05) * 1.3);
  c += vec3(0.04, 0.025, 0.018) * smoothstep(0.45, 0.8, cl) * smoothstep(0.0, 0.15, d.y) * (1.0 - uDusk) * uGlow;
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

// ---------------- the media facades: 安's advert, and later its order ----------------
const drawShow = (c: CanvasRenderingContext2D, w: number, h: number, t: number, kind: 0 | 1) => {
  // a light show across the skyline: the facades stay dark; light runs over them in time, as the real shows do
  c.fillStyle = kind === 0 ? "#000208" : "#080000";
  c.fillRect(0, 0, w, h);
  if (kind === 0) {
    // waves of blue light sweeping across the towers
    for (let k = 0; k < 2; k++) {
      const x = ((t * 0.16 + k * 0.5) % 1) * w * 1.6 - w * 0.3;
      const wg = c.createLinearGradient(x - w * 0.12, 0, x + w * 0.12, 0);
      wg.addColorStop(0, "rgba(40,120,255,0)");
      wg.addColorStop(0.5, "rgba(70,160,255,0.28)");
      wg.addColorStop(1, "rgba(40,120,255,0)");
      c.fillStyle = wg;
      c.fillRect(x - w * 0.12, 0, w * 0.24, h);
    }
    // rings expanding from the orb of An at the centre of the skyline
    const ox = w * 0.5, oy = h * 0.5;
    for (let k = 0; k < 3; k++) {
      const f = (t * 0.3 + k / 3) % 1;
      c.strokeStyle = `rgba(150,215,255,${0.85 * (1 - f)})`;
      c.lineWidth = h * 0.05;
      c.beginPath();
      c.ellipse(ox, oy, w * (0.04 + f * 0.5), h * (0.15 + f * 1.2), 0, 0, Math.PI * 2);
      c.stroke();
    }
    const br = 0.8 + 0.2 * Math.sin(t * 2.2);
    const rg = c.createRadialGradient(ox, oy, 0, ox, oy, h * 0.45);
    rg.addColorStop(0, `rgba(255,255,255,${br})`);
    rg.addColorStop(0.5, `rgba(170,225,255,${0.7 * br})`);
    rg.addColorStop(1, "rgba(60,150,230,0)");
    c.fillStyle = rg;
    c.fillRect(ox - h * 0.5, 0, h, h);
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.textBaseline = "middle";
    c.textAlign = "center";
    c.font = font(SERIF, h * 0.7, 900);
    c.fillText("安", ox, oy + h * 0.03);
  } else {
    // the order: red bands pulsing, the words scrolling across every tower
    const p = 0.6 + 0.4 * Math.sin(t * 5.0);
    c.fillStyle = `rgba(255,${Math.round(30 * p)},${Math.round(20 * p)},${0.9 * p})`;
    c.fillRect(0, h * 0.06, w, h * 0.06);
    c.fillRect(0, h * 0.88, w, h * 0.06);
    c.fillStyle = "#ffb8a8";
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.font = font(SANS, h * 0.5, 700);
    const msg = "为了您的安全，请留在家中。   ";
    const mw = c.measureText(msg).width;
    const x0 = -((t * w * 0.07) % mw);
    for (let x = x0; x < w; x += mw) c.fillText(msg, x, h * 0.5);
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
  };
  const showCv = [0, 1].map(() => {
    const cv = document.createElement("canvas");
    cv.width = 2048;
    cv.height = 320;
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
        float grid = mix(0.72 + 0.28 * step(0.22, g.x) * step(0.22, g.y), 0.9, smoothstep(0.3, 0.8, max(fw.x, fw.y)));
        c = c * grid * 0.85 * uOn;
        float f = exp(-length(vW - uCam) * uFogD);
        gl_FragColor = vec4(mix(vec3(0.02, 0.02, 0.03), c, f), 1.0);
      }`,
  });
  const SCREENS: { m: THREE.Mesh; x: number; z: number }[] = [];
  bldU.tShowA.value = showCv[0].tex;
  bldU.tShowB.value = showCv[1].tex;

  const skyU = { uOffR: bldU.uOffR, uOnR: bldU.uOnR, uBlink: bldU.uBlink, uDusk: bldU.uDusk, uGlow: bldU.uGlow, uSun: bldU.uSun };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(40000, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false })));
  const hemi = new THREE.HemisphereLight(0x1a2a44, 0x2a1a10, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a60, 0);
  sun.position.set(-1, 0.25, 0.35);
  scene.add(sun);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9 });

  const ptU = { uScale: { value: 1 }, uMinPx: { value: 1.6 }, uFogD: bldU.uFogD };
  const ptMat = new THREE.ShaderMaterial({ vertexShader: PT_VERT, fragmentShader: PT_FRAG, uniforms: ptU, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const pts = new PointSet(320000, ptMat);
  scene.add(pts.mesh);

  const roads: Road[] = [];
  let lamps = new Float32Array(0); // x, y, z, warm
  const signals: { x: number; z: number; ph: number; ax: number; az: number }[] = [];
  let AVI: THREE.Vector3[] = [];
  const CARS: Car[] = [];
  const carKinds: THREE.InstancedMesh[] = []; // Kenney car kit (CC0), retinted per car
  const DRONES: { home: THREE.Vector3; launch: number; travel: number; orbitR: number; orbitY: number; ang: number; w: number; seed: number }[] = [];
  const PYL: THREE.Vector3[] = [];
  let wireCurves: THREE.Vector3[][] = [];
  let AVE: Road[] = [];
  let meta: { core: number[]; far: number[]; marks: Record<string, [number, number, number]> } = { core: [0, 0, 1, 1], far: [0, 0, 1, 1], marks: {} };

  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.7, roughness: 0.5 });
  const beam = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
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
    for (let k = 0; k <= 6; k++) {
      const p = LOC.PYL_A.clone().lerp(LOC.PYL_B, k / 6);
      PYL.push(p);
      const m = new THREE.Mesh(pg, steel);
      m.position.copy(p);
      m.rotation.y = yaw;
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
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(wirePos, 3)), new THREE.LineBasicMaterial({ color: 0x0a0b0d })));

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

    const B = readBin(bb, 6, 2);
    const clearR: [number, number, number][] = [[LOC.DC.x, LOC.DC.z, 330]];
    // the drone depots: the largest low halls within reach of the campus
    {
      const cand: { x: number; z: number; a: number; h: number }[] = [];
      for (let i = 0; i < B.n; i++) {
        const h = B.info[i * 6], kind = B.info[i * 6 + 1], osm = B.info[i * 6 + 3], cx = B.info[i * 6 + 4], cz = B.info[i * 6 + 5];
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
        const h = B.info[i * 6], kind = B.info[i * 6 + 1], cx = B.info[i * 6 + 4], cz = B.info[i * 6 + 5];
        if (kind !== 1 || h < 60 || h > 110) continue;
        const d = Math.hypot(cx - LOC.MAST_NEAR.x, cz - LOC.MAST_NEAR.z);
        if (d < best) {
          best = d;
          LOC.MAST.set(cx, h, cz);
        }
      }
    }
    // ---------- buildings: one merged mesh ----------
    {
      let nv = 0;
      let ni = 0;
      const keep: number[] = [];
      for (let i = 0; i < B.n; i++) {
        const cx = B.info[i * 6 + 4];
        const cz = B.info[i * 6 + 5];
        if (clearR.some(([x, z, r]) => Math.hypot(cx - x, cz - z) < r)) continue;
        keep.push(i);
        const m = B.offs[i + 1] - B.offs[i];
        nv += m * 5;
        ni += m * 6 + (m - 2) * 3;
      }
      const extra: { ring: [number, number][]; h: number; kind: number; seed: number }[] = [];
      for (let k = 0; k < 5; k++) {
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
      const emit = (ring: [number, number][], h: number, kind: number, seed: number, cx: number, cz: number) => {
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
            [x0, 0, z0, 0],
            [x1, 0, z1, len],
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
        const h = B.info[i * 6];
        emit(ring, h, B.info[i * 6 + 1], B.info[i * 6 + 2], B.info[i * 6 + 4], B.info[i * 6 + 5]);
        if (h > 110) AVI.push(new THREE.Vector3(B.info[i * 6 + 4], h + 2, B.info[i * 6 + 5]));
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
          const h = B.info[i * 6], kind = B.info[i * 6 + 1], cx = B.info[i * 6 + 4], cz = B.info[i * 6 + 5];
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
          scene.add(m);
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
      scene.add(bm);
      const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 1, 4.5).translate(0, 0.5, 0), concrete, Math.max(1, pillars.length));
      const m4 = new THREE.Matrix4();
      pillars.forEach(([x, y, z, a], k) => {
        m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, y, 1));
        pm.setMatrixAt(k, m4);
      });
      pm.count = pillars.length;
      pm.frustumCulled = false;
      scene.add(pm);
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
      const names = ["sedan", "suv", "taxi", "van", "hatchback-sports", "suv-luxury", "sedan-sports", "truck"];
      const loader = new GLTFLoader();
      const gl = await Promise.all(names.map((n) => loader.loadAsync(staticFile(`cars/${n}.glb`))));
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
        const len = names[k] === "truck" ? 8.5 : names[k] === "van" ? 5.2 : 4.6;
        geo.translate(0, -bx.min.y, 0);
        geo.scale(1.95 / (bx.max.x - bx.min.x), (names[k] === "truck" ? 3.0 : names[k] === "van" ? 2.0 : 1.5) / (bx.max.y - bx.min.y), len / (bx.max.z - bx.min.z));
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
    AVE = roads
      .filter((r) => r.c <= 2 && !r.br && Math.abs(r.z[0] - LOC.AVE_Z) < 90 && Math.abs(r.z[r.z.length - 1] - LOC.AVE_Z) < 90 && r.x[r.x.length - 1] > r.x[0] && r.x[0] > LOC.AVE_X0 - 300 && r.x[0] < LOC.AVE_X0 + 4500)
      .sort((a, b) => a.x[0] - b.x[0]);

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
  })();

  const st: CityState = { dusk: 0, offR: -1, onR: -2, blink: 1, allRed: 0, carT: 0, carBlink: 1 };
  const o = P0();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const tmpV = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);
  const pc = new THREE.Color();

  const aveS = (lt: number) => LOC.AVE_S0 + 52 * lt;
  const avePos = (s: number) => {
    for (const r of AVE) {
      if (s <= r.L) return roadAt(r, s, P0());
      s -= r.L;
    }
    const r = AVE[AVE.length - 1];
    return roadAt(r, r.L, P0());
  };
  LOC.avePos = (lt: number) => (AVE.length ? avePos(aveS(lt)) : P0());

  const fillPoints = (mode: string, lt: number, cam: THREE.PerspectiveCamera, bodies: boolean) => {
    pts.begin();
    const camP = cam.position;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    const far = camP.y > 400 ? 9000 : 5500;
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
      if (lamps[i + 3] > 0.5) pts.add(x, y, z, 3.4 * on, 1.75 * on, 0.65 * on, 1.1);
      else pts.add(x, y, z, 2.7 * on, 2.6 * on, 2.3 * on, 1.0);
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
      if (amb && Math.abs(o.z - amb.z) < 30 && o.x > amb.x - 30 && o.x < amb.x + 700 && AVE.includes(r)) off = Math.sign(off) * (r.w / 2 - 1.2);
      const x = o.x - o.tz * off, z = o.z + o.tx * off;
      const y = o.y + (r.br ? 0.25 : 0.12);
      if (!vis(x, z, y)) continue;
      const b = st.carBlink;
      const nx = -tz * 0.75, nz = tx * 0.75;
      pts.add(x + tx * 2.25 + nx, y + 0.7, z + tz * 2.25 + nz, 3.0 * b, 2.8 * b, 2.4 * b, 0.55);
      pts.add(x + tx * 2.25 - nx, y + 0.7, z + tz * 2.25 - nz, 3.0 * b, 2.8 * b, 2.4 * b, 0.55);
      pts.add(x - tx * 2.25 + nx, y + 0.8, z - tz * 2.25 + nz, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
      pts.add(x - tx * 2.25 - nx, y + 0.8, z - tz * 2.25 - nz, 2.6 * b, 0.12 * b, 0.05 * b, 0.6);
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
      if (!vis(it.x, it.z, 6)) continue;
      const on = lightsOnJS(it.x, it.z, st);
      if (on <= 0) continue;
      let ewGreen = Math.floor((lt + 1000 + it.ph) / 15) % 2 === 0;
      // the green wave: red until the ambulance is close, then green just ahead of it
      if (amb && Math.abs(it.z - amb.z) < 70 && Math.abs(it.x - amb.x) < 3000) ewGreen = it.x > amb.x - 60 && it.x < amb.x + 520;
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
        const sz = amb ? 1.7 : 1.4;
        if (g) pts.add(it.x + ox, 6, it.z + oz, 0.15 * on, 3.2 * on, 1.2 * on, sz);
        else pts.add(it.x + ox, 6, it.z + oz, 3.6 * on, 0.25 * on, 0.1 * on, sz);
      }
    }
    if (amb) {
      const blue = Math.floor(lt * 8) % 2 === 0;
      const nx = -amb.tz, nz = amb.tx;
      pts.add(amb.x + nx * 3, 3, amb.z + nz * 3, blue ? 0.6 : 9, blue ? 1.2 : 0.6, blue ? 9 : 0.4, 2.2);
      pts.add(amb.x + amb.tx * 3 + nx * 2.2, 1.0, amb.z + amb.tz * 3 + nz * 2.2, 4, 4, 3.5, 0.9);
      pts.add(amb.x + amb.tx * 3 + nx * 3.8, 1.0, amb.z + amb.tz * 3 + nz * 3.8, 4, 4, 3.5, 0.9);
    }
    const avOn = (Math.floor((lt + 100) * 1.0) % 2 === 0 ? 1 : 0.08) * st.blink;
    for (const a of AVI) {
      const on = lightsOnJS(a.x, a.z, st) > 0 ? 1 : 0;
      pts.add(a.x, a.y, a.z, 6 * avOn * on, 0.35 * avOn * on, 0.2 * avOn * on, 3.2);
    }
    const mOn = (Math.floor((lt + 100) * 1.6) % 2 === 0 ? 1 : 0.0) * st.blink;
    const M = LOC.MAST;
    pts.add(M.x, M.y + 20.3, M.z, 14 * mOn, 0.8 * mOn, 0.4 * mOn, 0.9);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const on = Math.floor(lt * 3 + k) % 3 === 0 ? 1 : 0.3;
      pts.add(M.x + Math.cos(a) * 1.0, M.y + 13.6, M.z + Math.sin(a) * 1.0, 0.2, 3.5 * on, 1 * on, 0.18);
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
            pts.add(p2.x, p2.y, p2.z, 1.2 * k * near, 2.6 * k * near, 4.0 * k * near, 0.7 * (1 - tail / 18) + 0.15);
          }
        }
      }
    }
    if (mode === "drones") {
      for (const d of DRONES) {
        const tt = lt - d.launch;
        let p: THREE.Vector3;
        const orbitAt = (time: number) => {
          const a = d.ang + d.w * time;
          return new THREE.Vector3(LOC.DC.x + Math.cos(a) * d.orbitR, d.orbitY + Math.sin(time * 0.7 + d.seed * 9) * 8, LOC.DC.z + Math.sin(a) * d.orbitR);
        };
        if (tt <= 0) p = d.home.clone();
        else {
          const e = ease(clamp(tt / d.travel));
          const target = orbitAt(lt);
          const upP = d.home.clone().setY(d.home.y + 90 + d.seed * 120);
          const a1 = d.home.clone().lerp(upP, e);
          const a2 = upP.clone().lerp(target, e);
          p = a1.lerp(a2, e);
        }
        const strobe = Math.floor((lt + d.seed * 3) * 2.2) % 3 === 0 ? 1.5 : 0.55;
        const red = d.seed < 0.22;
        const dc = p.distanceTo(camP);
        if (dc < 160) {
          pts.add(p.x - 0.35, p.y, p.z, 3.0, 0.15, 0.08, 0.3);
          pts.add(p.x + 0.35, p.y, p.z, 0.15, 3.0, 0.6, 0.3);
          pts.add(p.x, p.y + 0.15, p.z, 4 * strobe, 4 * strobe, 4.2 * strobe, 0.35);
        } else pts.add(p.x, p.y, p.z, red ? 4.2 * strobe : 3.0 * strobe, red ? 0.3 : 3.1 * strobe, red ? 0.2 : 3.4 * strobe, 1.6);
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
    st.blink = 1;
    st.allRed = 0;
    st.carT = gt;
    st.carBlink = 1;
    bldU.uSun.value.set(-0.94, 0.33);
    let look: Partial<Look> = { bloom: 0.6, bloomThreshold: 0.85, bloomRadius: 0.6, streak: 0.35, lift: [0.0, 0.004, 0.01], gain: [1.0, 1.0, 1.04], sat: 1.0, grain: 0.06, vignette: 0.55, exposure: 1.0 };
    const S = SHOTS[mode] ?? SHOTS.dusk;
    const r = S(lt, { gt, shot, st });
    look = { ...look, ...(r.look ?? {}) };
    if (r.dusk !== undefined) st.dusk = r.dusk;
    if (r.sun) bldU.uSun.value.copy(r.sun);
    const pos = r.pos.clone();
    const amp = r.drift ?? 2.0;
    pos.x += drift(gt, 3, amp);
    pos.y += drift(gt, 4, amp * 0.75);
    if (look.dof && look.focus === undefined) look.focus = pos.distanceTo(r.tgt);
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(r.tgt);
    cam.fov = r.fov;
    cam.near = r.near ?? 1;
    cam.far = 60000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const sw = r.showFrom ?? pos;
    aimShow(sw, r.showW ?? 1700, r.showY0 ?? 25, r.showH ?? 300);

    bldU.uCam.value.copy(cam.position);
    bldU.uT.value = gt;
    bldU.uOffR.value = st.offR;
    bldU.uOnR.value = st.onR;
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
    if (showOn > 0) {
      drawShow(showCv[0].ctx, 2048, 320, gt, 0);
      showCv[0].tex.needsUpdate = true;
      if ((r.flip ?? 0) > 0) {
        drawShow(showCv[1].ctx, 2048, 320, gt, 1);
        showCv[1].tex.needsUpdate = true;
      }
    }
    for (const im of carKinds) im.visible = !!r.bodies;
    fillPoints(mode, lt, cam, !!r.bodies);
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
  MAST: V3(1500, 80, -2000),
  AVE_Z: -690, // Shennan Boulevard past the CBD
  AVE_X0: -1200,
  AVE_S0: 900,
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
  lit?: number; wet?: number; fog?: number; flip?: number; showOn?: number; screens?: number; bodies?: boolean; showFrom?: THREE.Vector3; showW?: number; showY0?: number; showH?: number;
};
const LIANHUA = V3(620, 0, -2180); // Lianhuashan summit, the classic view south over the Civic Center to the CBD
const SHOTS: Record<string, (lt: number, i: ShotIn) => ShotOut> = {
  // act 1: dusk. Close on one of the CBD's big screens (安's advert), then up and back to Lianhuashan: the whole
  // skyline is running the same advert
  dusk: (lt) => {
    const S = LOC.SCREENS[LOC.HERO_SCREEN] ?? { p: V3(846, 100, -943), n: V3(0, 0, -1), w: 56 };
    const near = S.p.clone().addScaledVector(S.n, S.w * 1.35).add(V3(0, -S.w * 0.08, 0));
    const far = V3(520, 315, -2330);
    const k = ease(clamp((lt - 2.2) / 6.4));
    const pos = near.clone().lerp(far, k);
    pos.y = lerp(near.y, far.y, Math.pow(k, 0.8));
    const tgt = S.p.clone().lerp(V3(230, 140, -350), ease(clamp((lt - 2.0) / 5.5)));
    return {
      pos, tgt, fov: lerp(40, 25, k), near: 0.5, dusk: 0.72, showOn: 1, lit: 1.3, fog: 0.00009, sun: new THREE.Vector2(-0.9, 0.4),
      showW: 1900, showY0: 30, showH: 300, showFrom: far,
      look: { exposure: 1.05, gain: [1.05, 1.0, 0.96], lift: [0.006, 0.004, 0.01], dof: 8, focus: pos.distanceTo(S.p), aperture: lerp(0.9, 0.2, k), streak: 0.25 },
    };
  },
  // the green wave: low over Shennan Boulevard, long lens west toward the CBD; the ambulance comes at us
  greenwave: (lt) => {
    const z = LOC.AVE_Z;
    const a = LOC.avePos(lt);
    return { pos: V3(2350, 24, z - 2), tgt: V3(900, 8, z - 6), fov: 7.5, dusk: 0.5, lit: 1.2, showOn: 1, look: { dof: 10, focus: Math.max(200, 2350 - a.x), aperture: 0.35, streak: 0.5 } };
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
    return { pos: V3(x, 15, 548), tgt: V3(-400, 40, 470), fov: 9, dusk: 0.8, lit: 1.25, bodies: true, showOn: 1, look: { gain: [1.05, 1.0, 0.96], dof: 12, aperture: 0.5, focus: 1100 } };
  },
  // telecom: the mast on a housing tower's roof, orbiting
  masts: (lt) => {
    const M = LOC.MAST;
    const a = 3.6 + lt * 0.07;
    return { pos: V3(M.x + Math.cos(a) * 24, M.y + 9 + lt * 0.4, M.z + Math.sin(a) * 24), tgt: V3(M.x, M.y + 12, M.z), fov: 42, drift: 0.3, dusk: 0.75, lit: 1.3, showOn: 1, look: { dof: 10, focus: 24, aperture: 0.6 } };
  },
  // act 3: the blackout runs out from the CBD over the whole of Futian and Luohu, then the city comes back
  blackout: (lt, { st }) => {
    st.offR = 26000 * easeIn(clamp((lt - 0.4) / 3.0)) + (lt > 0.4 ? 10 : -1);
    st.onR = lt < 4.6 ? -2 : 26000 * Math.pow(clamp((lt - 4.6) / 3.4), 2.2);
    return { pos: V3(-3600 + lt * 14, 900 - lt * 6, 3300 - lt * 10), tgt: V3(900, 30, -900), fov: 40, lit: 0.8, look: { streak: 0.45 } };
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
    return { pos, tgt: V3(600, 4, z - 12), fov: 8.5, lit: 0.85, bodies: true, look: { streak: 0.4, dof: 10, focus: 1100, aperture: 0.4 } };
  },
  redlights: (lt, { st }) => {
    st.allRed = 1;
    st.carT = 100;
    return { pos: V3(330 + lt * 2, 75, -380), tgt: V3(70, 0, -690), fov: 34, lit: 0.85, bodies: true };
  },
  // the advert becomes an order: a big screen flips, and behind it every tower of the CBD turns red
  billboards: (lt, { st }) => {
    st.carT = 100;
    st.allRed = 1;
    const S = LOC.SCREENS[LOC.HERO_SCREEN] ?? { p: V3(-201, 152, -923), n: V3(0, 0, -1), w: 78 };
    const k = ease(clamp(lt / 6));
    const side = V3(-S.n.z, 0, S.n.x);
    const pos = S.p.clone().addScaledVector(S.n, lerp(330, 420, k)).addScaledVector(side, lerp(60, 90, k)).add(V3(0, lerp(30, 55, k), 0));
    const tgt = S.p.clone().addScaledVector(S.n, -350).add(V3(0, 10, 0));
    return {
      pos, tgt, fov: 38, lit: 0.85, showOn: 1, flip: clamp((lt - 0.8) / 2.2), screens: 1,
      showW: 1900, showY0: 30, showH: 300, showFrom: V3(480, 300, -2050), look: { bloomThreshold: 1.1, streak: 0.2, dof: 8, focus: pos.distanceTo(S.p), aperture: 0.5 },
    };
  },
  // from the roof of a depot: its drones lift off around the camera and stream away to the dome over the campus
  drones: (lt, { st }) => {
    st.carT = 100;
    st.allRed = 1;
    const W = LOC.WARE[0] ?? LOC.DC;
    const k = ease(clamp(lt / 9.5));
    const away = LOC.DC.clone().sub(W).setY(0).normalize();
    const side = V3(-away.z, 0, away.x);
    const pos = W.clone().addScaledVector(away, -150 + k * 10).addScaledVector(side, 60).setY(45 + k * 40);
    const tgt = V3(lerp(W.x + away.x * 120, LOC.DC.x, k), lerp(60, 180, k), lerp(W.z + away.z * 120, LOC.DC.z, k));
    return { pos, tgt, fov: lerp(44, 34, k), lit: 0.8, look: { streak: 0.4 } };
  },
  // the ending: up from the street beside Ping An to high over the whole city
  rise: (lt) => {
    const k = ease(clamp(lt / 7.6));
    const pos = V3(lerp(260, 380, k), lerp(70, 1500, easeIn(clamp(lt / 7.6)) * 0.7 + k * 0.3), lerp(820, 1300, k));
    return { pos, tgt: V3(lerp(40, 60, k), 0, lerp(-200, -300, k)), fov: lerp(42, 46, k), lit: 0.8, look: { zoomBlur: lt < 1.0 ? (1 - lt) * 1.2 : 0, exposure: lt < 0.8 ? 1 + (0.8 - lt) * 3 : 1 } };
  },
  glimpse: () => ({ pos: V3(-2200, 1300, 2800), tgt: V3(300, 0, -300), fov: 40, lit: 0.8 }),
};

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
