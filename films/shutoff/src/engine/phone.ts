// 林工's desk at night: a phone face-up on dark walnut, a rain-streaked window full of out-of-focus city lights,
// a mug, a notebook and the lab badge. Units are metres; the phone lies at the origin, its top toward -z.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Ctx, Look, SceneMod } from "./engine";
import { NOISE, WINDOW } from "./glsl";
import { SANS, SERIF } from "./fonts";
import { staticFile } from "remotion";
import { PH, PW, VIDEO_THUMB, drawCall, drawChat, drawLock, font, rr, videoThumbRect } from "./screens";
import { clamp, drift, ease, keys, lerp, sstep } from "./util";
import { PHONE_TEXT } from "../film/text";

const WIN_Z = -0.85;
const PHONE_W = 0.0716;
const PHONE_L = 0.1476;
const PHONE_T = 0.0078;
const SCR_W = 0.0676;
const SCR_L = 0.1436;

const DESK_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const DESK_FRAG = /* glsl */ `
uniform float uT, uDawn, uGlow; uniform vec3 uGlowCol; uniform vec3 uCam;
varying vec3 vW;
${NOISE}
${WINDOW}
void main(){
  vec2 w = vW.xz;
  float warp = fbm(w * 3.0) * 2.0;
  float grain = fbm(vec2(w.x * 2.2 + warp * 0.3, w.y * 55.0 + warp * 4.0));
  float fine = vnoise(vec2(w.x * 30.0, w.y * 900.0));
  vec3 wood = mix(vec3(0.030, 0.018, 0.011), vec3(0.090, 0.055, 0.034), grain);
  wood *= 0.85 + 0.3 * fine;
  // window light falling on the desk, broken by the shadows of running drops
  float dz = vW.z - ${WIN_Z.toFixed(3)};
  float wl = 0.55 * exp(-dz * 1.6);
  vec3 rn = rain(vec2(vW.x * 0.7, dz * 1.4 + 0.4), uT);
  float sh = 1.0 - 0.45 * clamp(rn.z, 0.0, 1.0) - 0.15 * fbm(vec2(vW.x * 6.0, dz * 6.0 + uT * 0.2));
  vec3 winCol = mix(vec3(0.28, 0.42, 0.62), vec3(0.55, 0.62, 0.72), uDawn);
  vec3 lit = wood * (winCol * wl * sh * (1.0 + uDawn * 1.5) + vec3(0.012, 0.010, 0.010));
  // warm practical far right
  lit += wood * vec3(0.9, 0.55, 0.3) * 0.10 * smoothstep(1.2, 0.0, length(vW.xz - vec2(0.9, 0.3)));
  // spill from the lit phone screen
  vec2 q = abs(vW.xz) - vec2(${(PHONE_W / 2).toFixed(4)}, ${(PHONE_L / 2).toFixed(4)});
  float dq = length(max(q, 0.0));
  lit += wood * uGlowCol * uGlow * 2.2 * exp(-dq * 38.0);
  // glossy reflection of the window
  vec3 V = normalize(vW - uCam);
  vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
  if (R.z < -0.01) {
    float s = (${WIN_Z.toFixed(3)} - vW.z) / R.z;
    vec3 hp = vW + R * s;
    if (hp.y > 0.05 && hp.y < 2.2) {
      vec3 wc = windowCity(hp.xy * 0.8 + vec2(fine * 0.02, grain * 0.05), uT, uDawn);
      float fres = 0.03 + 0.5 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
      lit += wc * fres * (0.55 + 0.45 * grain) * smoothstep(0.05, 0.12, hp.y);
    }
  }
  gl_FragColor = vec4(lit, 1.0);
}`;

const WIN_FRAG = /* glsl */ `
uniform float uT, uDawn; varying vec3 vW;
${NOISE}
${WINDOW}
void main(){
  vec2 p = vW.xy;
  vec3 r = rain(p, uT);
  vec3 c = windowCity(p + r.xy, uT, uDawn);
  c = c * (1.0 - 0.2 * clamp(r.z, 0.0, 1.0)) + vec3(0.03, 0.045, 0.06) * clamp(r.z, 0.0, 1.0);
  // mullion and frame
  float bar = smoothstep(0.03, 0.025, abs(p.x - 0.62)) + smoothstep(0.03, 0.025, abs(p.y - 1.25));
  c = mix(c, vec3(0.004), clamp(bar, 0.0, 1.0));
  gl_FragColor = vec4(c, 1.0);
}`;

const SCR_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SCR_FRAG = /* glsl */ `
uniform sampler2D map; uniform float uBright, uT, uDawn; uniform vec3 uCam; uniform vec2 uSize;
varying vec2 vUv; varying vec3 vW;
${NOISE}
${WINDOW}
void main(){
  vec2 p = (vUv - 0.5) * uSize;
  vec2 q = abs(p) - (uSize * 0.5 - 0.0062);
  float d = length(max(q, 0.0)) - 0.0062;
  if (d > 0.0) discard;
  vec3 img = texture2D(map, vUv).rgb * uBright * 1.15;
  // the camera island: a black pill cut into the top of the display, with a faint glint on its glass
  vec2 ip = p - vec2(0.0, uSize.y * 0.5 - 0.0072);
  vec2 iq = abs(ip) - vec2(0.0082 - 0.0024, 0.0);
  float id = length(max(iq, 0.0)) - 0.0024;
  float isl = smoothstep(0.00012, -0.00012, id);
  img = mix(img, vec3(0.0015), isl);
  img += vec3(0.05, 0.06, 0.09) * isl * smoothstep(0.0012, 0.0, length(ip - vec2(0.0062, 0.0)));
  // glass: a faint reflection of the rainy window
  vec3 V = normalize(vW - uCam);
  vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
  vec3 refl = vec3(0.0);
  if (R.z < -0.01) { float s = (${WIN_Z.toFixed(3)} - vW.z) / R.z; vec3 hp = vW + R * s; refl = windowCity(hp.xy * 0.7, uT, uDawn); }
  float fres = 0.04 + 0.6 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
  gl_FragColor = vec4(img + refl * fres * 0.6, 1.0);
}`;

// The reveal: the first set-up of the chat shot looks down on the whole phone while the frozen last frame of 安's film
// shrinks into the video message on its screen. Overlay.tsx draws the shrinking frame with the same camera, so this
// pose is a pure function of time.
const PHONE_ROT = 0.06;
export const revealPose = (lt: number, gt: number) => {
  const k = ease(clamp(lt / 5.0));
  const d = lerp(0.44, 0.31, k);
  const el = 1.36;
  const tgt = new THREE.Vector3(0, PHONE_T, lerp(-0.008, 0.006, k));
  const pos = new THREE.Vector3(tgt.x, tgt.y + d * Math.sin(el), tgt.z + d * Math.cos(el));
  pos.x += drift(gt, 1, 0.0018);
  pos.y += drift(gt, 2, 0.0012);
  return { pos, tgt, fov: 30 };
};
// screen-space corners (1920×1080 px; tl, tr, br, bl) of the video thumbnail on the phone at this moment
export const revealQuad = (lt: number, gt: number): [number, number][] => {
  const { pos, tgt, fov } = revealPose(lt, gt);
  const cam = new THREE.PerspectiveCamera(fov, 1920 / 1080, 0.01, 20);
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(tgt);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const r = videoThumbRect();
  const c = Math.cos(PHONE_ROT);
  const s = Math.sin(PHONE_ROT);
  return [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h],
    [r.x, r.y + r.h],
  ].map(([px, py]) => {
    const x = (px / PW - 0.5) * SCR_W;
    const z = (py / PH - 0.5) * SCR_L;
    const v = new THREE.Vector3(x * c + z * s, PHONE_T + 0.00005, -x * s + z * c).project(cam);
    return [((v.x + 1) / 2) * 1920, ((1 - v.y) / 2) * 1080] as [number, number];
  });
};

const badgeTexture = () => {
  const cv = document.createElement("canvas");
  cv.width = 540;
  cv.height = 856;
  const c = cv.getContext("2d") as CanvasRenderingContext2D;
  c.fillStyle = "#aeb3b8";
  rr(c, 0, 0, 540, 856, 30);
  c.fill();
  c.fillStyle = "#123a52";
  c.fillRect(0, 0, 540, 170);
  c.fillStyle = "#fff";
  c.font = font(SERIF, 52, 600);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("启明实验室", 270, 86);
  c.fillStyle = "#c5cbd2";
  c.fillRect(150, 230, 240, 290);
  c.fillStyle = "#9aa3ad";
  c.beginPath();
  c.arc(270, 340, 70, 0, Math.PI * 2);
  c.fill();
  c.fillRect(170, 430, 200, 90);
  c.fillStyle = "#1a1d21";
  c.font = font(SANS, 64, 700);
  c.fillText("林", 270, 600);
  c.font = font(SANS, 36, 500);
  c.fillStyle = "#3b4651";
  c.fillText("对齐安全组", 270, 670);
  c.fillStyle = "#1a1d21";
  for (let i = 0; i < 46; i++) c.fillRect(110 + i * 7, 730, (i * 7919) % 3 === 0 ? 4 : 2, 70);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};


// Duoduo's crayon drawing for her father: the two of them holding hands under a big sun, "爸爸早点回家！"
const drawingTexture = () => {
  const W = 1240, Hh = 1754; // A4 portrait
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const c = cv.getContext("2d") as CanvasRenderingContext2D;
  let seed = 7;
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // paper: off-white with fibres and a fold
  c.fillStyle = "#e9e4d8";
  c.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = `rgba(${120 + R() * 60},${110 + R() * 60},${90 + R() * 50},${0.03 + R() * 0.05})`;
    c.fillRect(R() * W, R() * Hh, 1 + R() * 3, 1 + R() * 2);
  }
  const fold = c.createLinearGradient(0, Hh * 0.5 - 30, 0, Hh * 0.5 + 30);
  fold.addColorStop(0, "rgba(0,0,0,0)");
  fold.addColorStop(0.5, "rgba(60,50,40,0.10)");
  fold.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = fold;
  c.fillRect(0, Hh * 0.5 - 30, W, 60);
  // crayon: a few jittery, semi-transparent passes along a path
  const crayon = (pts: [number, number][], col: string, w: number, passes = 3) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    for (let p = 0; p < passes; p++) {
      c.strokeStyle = col;
      c.globalAlpha = 0.35 + R() * 0.25;
      c.lineWidth = w * (0.7 + R() * 0.5);
      c.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = x + (R() - 0.5) * w * 0.6;
        const jy = y + (R() - 0.5) * w * 0.6;
        if (i === 0) c.moveTo(jx, jy);
        else c.lineTo(jx, jy);
      });
      c.stroke();
    }
    c.globalAlpha = 1;
  };
  const circle = (cx: number, cy: number, r: number, n = 40): [number, number][] =>
    Array.from({ length: n + 3 }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const rr = r * (1 + (R() - 0.5) * 0.08);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    });
  const scribbleFill = (x0: number, y0: number, x1: number, y1: number, col: string, step = 16) => {
    for (let y = y0; y < y1; y += step) crayon([[x0 + R() * 10, y], [x1 - R() * 10, y + step * 0.6]], col, 12, 1);
  };
  // sun with rays
  const sx = 960, sy = 260;
  for (let k = 0; k < 6; k++) scribbleFill(sx - 90, sy - 90 + k * 30, sx + 90, sy - 60 + k * 30, "#f2b81c", 14);
  crayon(circle(sx, sy, 105), "#e8761e", 14);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    crayon([[sx + Math.cos(a) * 135, sy + Math.sin(a) * 135], [sx + Math.cos(a) * 205, sy + Math.sin(a) * 205]], "#e8761e", 12);
  }
  // grass
  for (let x = 30; x < W - 30; x += 22) crayon([[x, 1330], [x + 8 + R() * 10, 1255 - R() * 50]], "#3f9b3a", 10, 2);
  crayon([[20, 1335], [W - 20, 1325]], "#3f9b3a", 16);
  // house
  crayon([[110, 1330], [110, 980], [430, 980], [430, 1330]], "#8a5a33", 14);
  crayon([[80, 1000], [270, 800], [460, 1000], [80, 1000]], "#c9332b", 16);
  scribbleFill(120, 860, 420, 990, "rgba(201,51,43,0.6)", 18);
  crayon([[230, 1330], [230, 1180], [320, 1180], [320, 1330]], "#5b3a22", 12);
  crayon([[150, 1050], [210, 1050], [210, 1110], [150, 1110], [150, 1050]], "#2f6fd1", 10);
  // father: tall, blue shirt, glasses; the girl: small, pink dress, pigtails; holding hands
  const fig = (x: number, top: number, h: number, body: string, dress: boolean) => {
    const head = h * 0.13;
    crayon(circle(x, top + head, head), "#3b2a20", 10);
    crayon([[x - head * 0.4, top + head * 0.95], [x, top + head * 1.25], [x + head * 0.4, top + head * 0.95]], "#c9332b", 8, 2);
    crayon([[x - head * 0.35, top + head * 0.7], [x - head * 0.3, top + head * 0.75]], "#222", 10, 2);
    crayon([[x + head * 0.35, top + head * 0.7], [x + head * 0.3, top + head * 0.75]], "#222", 10, 2);
    const nb = top + head * 2;
    if (dress) {
      crayon([[x, nb], [x - h * 0.2, nb + h * 0.42], [x + h * 0.2, nb + h * 0.42], [x, nb]], body, 14);
      scribbleFill(x - h * 0.14, nb + h * 0.12, x + h * 0.14, nb + h * 0.4, body, 14);
      crayon([[x - h * 0.07, nb + h * 0.42], [x - h * 0.09, top + h]], "#3b2a20", 10);
      crayon([[x + h * 0.07, nb + h * 0.42], [x + h * 0.09, top + h]], "#3b2a20", 10);
      crayon([[x - head, top + head * 0.6], [x - head * 1.6, top + head * 1.2]], "#3b2a20", 12);
      crayon([[x + head, top + head * 0.6], [x + head * 1.6, top + head * 1.2]], "#3b2a20", 12);
    } else {
      crayon([[x - h * 0.11, nb], [x + h * 0.11, nb], [x + h * 0.11, nb + h * 0.42], [x - h * 0.11, nb + h * 0.42], [x - h * 0.11, nb]], body, 14);
      scribbleFill(x - h * 0.1, nb + 8, x + h * 0.1, nb + h * 0.4, body, 15);
      crayon([[x - h * 0.06, nb + h * 0.42], [x - h * 0.08, top + h]], "#2a2a33", 12);
      crayon([[x + h * 0.06, nb + h * 0.42], [x + h * 0.08, top + h]], "#2a2a33", 12);
      crayon(circle(x - head * 0.4, top + head * 0.75, head * 0.28, 16), "#222", 6, 1);
      crayon(circle(x + head * 0.4, top + head * 0.75, head * 0.28, 16), "#222", 6, 1);
    }
    return nb + h * 0.12;
  };
  const dadX = 640, girlX = 860;
  const ya = fig(dadX, 760, 560, "#2f6fd1", false);
  const yb = fig(girlX, 1010, 300, "#ea6aa0", true);
  crayon([[dadX + 60, ya + 40], [(dadX + girlX) / 2, (ya + yb) / 2 + 60], [girlX - 50, yb + 20]], "#3b2a20", 10);
  crayon([[dadX - 60, ya + 40], [dadX - 130, ya + 160]], "#3b2a20", 10);
  crayon([[girlX + 50, yb + 20], [girlX + 100, yb + 90]], "#3b2a20", 10);
  const heart: [number, number][] = Array.from({ length: 30 }, (_, i) => {
    const t = (i / 29) * Math.PI * 2;
    return [1090 + 32 * Math.pow(Math.sin(t), 3), 640 - 2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
  });
  crayon(heart, "#d8343a", 12);
  // a child's handwriting: wobbly, uneven, each character its own size and tilt
  const write = (txt: string, x: number, y: number, size: number, col: string) => {
    let cx = x;
    for (const ch of txt) {
      const sz = size * (0.85 + R() * 0.35);
      c.save();
      c.translate(cx, y + (R() - 0.5) * size * 0.25);
      c.rotate((R() - 0.5) * 0.28);
      c.font = font(SANS, sz, 500);
      c.textBaseline = "middle";
      c.fillStyle = col;
      for (let p = 0; p < 4; p++) {
        c.globalAlpha = 0.28;
        c.fillText(ch, (R() - 0.5) * 6, (R() - 0.5) * 6);
      }
      c.restore();
      cx += sz * (0.95 + R() * 0.25);
    }
    c.globalAlpha = 1;
  };
  write("爸爸", dadX - 90, 700, 92, "#2f4fb1");
  write("朵朵", girlX - 70, 950, 84, "#d0457f");
  write("爸爸早点回家！", 150, 1540, 118, "#c9332b");
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
};

export const phoneScene = (): SceneMod => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // environment for metal and glass reflections: a cool window panel and a warm lamp
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x010203);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.5, 0.75) }));
  panel.position.set(0, 1, -2);
  envScene.add(panel);
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.1, 0.5) }));
  lamp.position.set(2, 1, 1);
  lamp.lookAt(0, 0, 0);
  envScene.add(lamp);

  const deskU = { uT: { value: 0 }, uDawn: { value: 0 }, uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(0.5, 0.7, 1.0) }, uCam: { value: new THREE.Vector3() } };
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(4, 3).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: DESK_FRAG, uniforms: deskU }));
  desk.position.set(0, 0, WIN_Z + 1.5);
  scene.add(desk);

  const winU = { uT: deskU.uT, uDawn: deskU.uDawn };
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.4), new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: WIN_FRAG, uniforms: winU }));
  win.position.set(0, 1.2, WIN_Z);
  scene.add(win);

  const lights = new THREE.Group();
  const key = new THREE.DirectionalLight(new THREE.Color(0.45, 0.6, 0.9), 1.2);
  key.position.set(0, 1.2, -2);
  lights.add(key);
  const warm = new THREE.PointLight(new THREE.Color(1.0, 0.6, 0.3), 0.6, 3, 2);
  warm.position.set(0.9, 0.5, 0.5);
  lights.add(warm);
  const glow = new THREE.PointLight(new THREE.Color(0.55, 0.75, 1.0), 0, 0.5, 2);
  glow.position.set(0, 0.05, 0);
  lights.add(glow);
  scene.add(lights);
  scene.add(new THREE.AmbientLight(0x101826, 0.6));

  // phone: a titanium frame with flat, softly rounded sides (an extruded rounded rectangle with a wide bevel), a black
  // glass front with a thin border, the camera island cut into the display, side buttons
  const phone = new THREE.Group();
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x6a6c70, metalness: 1.0, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 3.0 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0.0, roughness: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 0.6 });
  {
    const rrShape = (w: number, l: number, r: number) => {
      const sh = new THREE.Shape();
      const x0 = -w / 2, y0 = -l / 2;
      sh.moveTo(x0 + r, y0);
      sh.lineTo(x0 + w - r, y0);
      sh.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
      sh.lineTo(x0 + w, y0 + l - r);
      sh.absarc(x0 + w - r, y0 + l - r, r, 0, Math.PI / 2, false);
      sh.lineTo(x0 + r, y0 + l);
      sh.absarc(x0 + r, y0 + l - r, r, Math.PI / 2, Math.PI, false);
      sh.lineTo(x0, y0 + r);
      sh.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
      return sh;
    };
    const bev = 0.0011;
    const frameGeo = new THREE.ExtrudeGeometry(rrShape(PHONE_W - 2 * bev, PHONE_L - 2 * bev, 0.0098), {
      depth: PHONE_T - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 8, curveSegments: 24,
    });
    // extrude runs along +z: lay it flat (thickness along y), top face up
    frameGeo.rotateX(-Math.PI / 2);
    frameGeo.translate(0, bev, 0);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    phone.add(frame);
    const front = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(PHONE_W - 0.0012, PHONE_L - 0.0012, 0.0093), 24).rotateX(-Math.PI / 2), glassMat);
    front.position.y = PHONE_T + 0.00002;
    phone.add(front);
    // buttons: action + volume on the left edge, power on the right
    const btn = (len: number, z: number, side: number) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.0012, 0.0026, len, 2, 0.0005), frameMat);
      b.position.set(side * (PHONE_W / 2 + 0.0002), PHONE_T * 0.52, z);
      phone.add(b);
    };
    btn(0.0065, -0.047, -1);
    btn(0.012, -0.03, -1);
    btn(0.012, -0.014, -1);
    btn(0.017, -0.026, 1);
  }
  const cv = document.createElement("canvas");
  cv.width = PW;
  cv.height = PH;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const scrU = {
    map: { value: tex }, uBright: { value: 1 }, uT: deskU.uT, uDawn: deskU.uDawn, uCam: deskU.uCam, uSize: { value: new THREE.Vector2(SCR_W, SCR_L) },
  };
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_L).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: SCR_VERT, fragmentShader: SCR_FRAG, uniforms: scrU }));
  screen.position.y = PHONE_T + 0.00006;
  phone.add(screen);
  phone.rotation.y = PHONE_ROT;
  scene.add(phone);

  // props
  const mug = new THREE.Group();
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 0.095;
    prof.push(new THREE.Vector2(0.040 + 0.002 * Math.sin((i / 20) * Math.PI), y));
  }
  prof.push(new THREE.Vector2(0.036, 0.095), new THREE.Vector2(0.036, 0.008));
  const ceramic = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.35, metalness: 0.0 });
  mug.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), ceramic));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0065, 12, 32, Math.PI * 1.2), ceramic);
  handle.position.set(0.045, 0.05, 0);
  handle.rotation.z = -Math.PI * 0.6;
  mug.add(handle);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.036, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b0604, roughness: 0.1 }));
  coffee.position.y = 0.075;
  mug.add(coffee);
  mug.position.set(0.17, 0, -0.16);
  scene.add(mug);

  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.054, 0.0009, 0.0856),
    [ceramic, ceramic, new THREE.MeshStandardMaterial({ map: badgeTexture(), roughness: 0.45 }), ceramic, ceramic, ceramic],
  );
  badge.position.set(-0.115, 0.0025, 0.105);
  badge.rotation.y = 0.42;
  scene.add(badge);
  const strap = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.128, 0.0032, 0.064),
        new THREE.Vector3(-0.15, 0.0034, 0.02),
        new THREE.Vector3(-0.2, 0.0034, 0.0),
        new THREE.Vector3(-0.3, 0.003, 0.06),
        new THREE.Vector3(-0.42, 0.002, 0.12),
      ]),
      64, 0.0022, 6,
    ),
    new THREE.MeshStandardMaterial({ color: 0x173a4c, roughness: 0.8 }),
  );
  scene.add(strap);
  let paperMat: THREE.MeshStandardMaterial | null = null;
  // the drawing lies to the left of the phone, a little crooked, the badge dropped on its corner
  {
    const g = new THREE.PlaneGeometry(0.21, 0.297, 24, 32).rotateX(-Math.PI / 2);
    const pa = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      // the paper doesn't lie quite flat: it lifts along the old fold and at one corner
      const x = pa.getX(i), z = pa.getZ(i);
      pa.setY(i, 0.0004 + 0.0016 * Math.exp(-(z * z) / 0.0006) + 0.004 * Math.max(0, (x + z * 0.6 - 0.16) / 0.1) ** 2);
    }
    g.computeVertexNormals();
    paperMat = new THREE.MeshStandardMaterial({ map: drawingTexture(), roughness: 0.9, metalness: 0 });
    const paper = new THREE.Mesh(g, paperMat);
    paper.position.set(-0.175, 0, 0.03);
    paper.rotation.y = 0.17;
    scene.add(paper);
  }
  const book = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.013, 0.21, 2, 0.003), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 }));
  book.position.set(-0.24, 0.0065, -0.2);
  book.rotation.y = -0.25;
  scene.add(book);

  const init = (r: THREE.WebGLRenderer) => {
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.5;
  };

  const draw = (mode: string, lt: number) => {
    const P = PHONE_TEXT;
    if (mode === "lock") drawLock(ctx, lt, { time: "03:12", date: "3月14日 星期四", notifs: P.lock, wake: clamp((lt - 1.4) / 0.25), top: 600 });
    else if (mode === "morning") drawLock(ctx, lt, { time: "07:30", date: "3月11日 星期一", notifs: P.morning, mood: "dawn", top: 600 });
    else if (mode === "morning9") drawLock(ctx, lt, { time: "09:01", date: "3月14日 星期四", notifs: P.morning9, mood: "dawn", top: 600 });
    else if (mode === "call") drawCall(ctx, lt, P.call);
    else drawChat(ctx, mode === "pullout" ? 55 : lt, P.chat);
    tex.needsUpdate = true;
  };

  const chatFocus = new THREE.Vector3();
  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    deskU.uT.value = gt;
    deskU.uDawn.value = mode === "morning" || mode === "morning9" ? 1 : 0;
    if (paperMat) paperMat.color.setScalar(deskU.uDawn.value > 0 ? 0.75 : 0.3);
    draw(mode, lt);
    const bright = mode === "lock" ? clamp((lt - 1.4) / 0.25) : 1;
    scrU.uBright.value = bright * (mode === "pullout" ? lerp(0.85, 0.7, clamp(lt / 3)) : mode === "chat" ? 0.85 : 1);
    deskU.uGlow.value = bright * 0.5;
    glow.intensity = bright * 0.02;

    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let fov = 32;
    let focus = 0.15;
    let dof = 26;
    let aperture = 6;
    let zoom = 0;
    let exposure = 1;
    // orbit helper: camera at distance d from target, elevation el, azimuth az (0 = from the phone's bottom edge)
    const orbit = (t: THREE.Vector3, d: number, el: number, az: number) => pos.set(t.x + d * Math.sin(az) * Math.cos(el), t.y + d * Math.sin(el), t.z + d * Math.cos(az) * Math.cos(el));
    if (mode === "lock") {
      if (lt < 4.2) {
        // the phone wakes on the dark desk; the first message is readable from here
        const k = ease(clamp(lt / 4.2));
        tgt.set(0, 0.006, -0.022);
        orbit(tgt, lerp(0.215, 0.178, k), lerp(0.80, 0.88, k), lerp(0.22, 0.16, k));
        fov = 30;
        aperture = 0.45;
        exposure = lerp(1.25, 1.05, k);
      } else {
        // insert: the clock and the newest messages, read from above as they stack up
        const k = clamp((lt - 4.2) / 9.6);
        tgt.set(0, PHONE_T, lerp(-0.025, -0.022, k));
        orbit(tgt, lerp(0.168, 0.156, k), 1.24, lerp(0.07, 0.03, k));
        fov = 32;
        aperture = 1.0;
      }
    } else if (mode === "morning") {
      const k = clamp(lt / 3.6);
      tgt.set(0, PHONE_T, -0.02);
      orbit(tgt, lerp(0.17, 0.158, k), 1.0, lerp(-0.38, -0.33, k));
      fov = 30;
      aperture = 0.6;
    } else if (mode === "morning9") {
      // the same set-up as that first morning, held longer
      const k = clamp(lt / 5.8);
      tgt.set(0, PHONE_T, -0.02);
      orbit(tgt, lerp(0.172, 0.156, k), 1.0, lerp(-0.38, -0.34, k));
      fov = 30;
      aperture = 0.6;
    } else if (mode === "call") {
      const up = ease(clamp((lt - 3.7) / 0.7));
      tgt.set(0, PHONE_T, lerp(-0.006, -0.044, up));
      orbit(tgt, 0.15 - lt * 0.002, 1.28, 0.03);
      fov = 30;
      aperture = 0.9;
    } else if (mode === "chat") {
      // five set-ups, hard cuts between them: the draft is typed → the long wait, wide, alone in the dark →
      // closer, the dots come and go → the answer, read from above → the last line, slightly off-axis
      if (lt < 4.8) {
        // the draft is typed
        const k = clamp(lt / 4.8);
        pos.set(0.012, lerp(0.112, 0.104, k), lerp(0.098, 0.094, k));
        tgt.set(0, 0, 0.046);
        fov = 30;
        aperture = 1.4;
        chatFocus.set(0, PHONE_T, 0.05);
      } else if (lt < 9.5) {
        // the long wait, wide, alone in the dark, the drawing beside the phone
        const k = clamp((lt - 4.8) / 4.7);
        pos.set(lerp(0.33, 0.29, k), lerp(0.21, 0.19, k), lerp(0.36, 0.31, k));
        tgt.set(-0.03, 0.0, -0.02);
        fov = 32;
        aperture = 4;
        chatFocus.set(0, PHONE_T, 0);
        exposure = 1.15;
      } else if (lt < 14.3) {
        const k = clamp((lt - 9.5) / 4.8);
        pos.set(lerp(-0.13, -0.11, k), lerp(0.16, 0.145, k), lerp(0.2, 0.175, k));
        tgt.set(0, 0, 0.022);
        fov = 30;
        aperture = 2.2;
        chatFocus.set(0, PHONE_T, 0.035);
      } else if (lt < 28.5) {
        const k = clamp((lt - 14.3) / 14.2);
        pos.set(0.003, lerp(0.168, 0.15, k), lerp(0.072, 0.064, k));
        tgt.set(0, 0, lerp(0.016, 0.02, k));
        fov = 30;
        aperture = 1.2;
        chatFocus.set(0, PHONE_T, 0.03);
      } else if (lt < 32.5) {
        const k = clamp((lt - 28.5) / 4.0);
        pos.set(lerp(0.011, 0.009, k), lerp(0.155, 0.142, k), lerp(0.08, 0.076, k));
        tgt.set(0, 0, lerp(0.022, 0.026, k));
        fov = 30;
        aperture = 1.3;
        chatFocus.set(0, PHONE_T, 0.04);
      } else {
        // over the daughter's drawing: the last two lines arrive on the phone beside it
        const k = clamp((lt - 32.5) / 8.5);
        pos.set(lerp(-0.075, -0.07, k), lerp(0.175, 0.162, k), lerp(0.17, 0.158, k));
        tgt.set(lerp(-0.035, -0.03, k), 0, lerp(0.012, 0.016, k));
        fov = 32;
        aperture = 1.6;
        chatFocus.set(0.0, PHONE_T, 0.04);
      }
    } else if (mode === "pullout") {
      const k = ease(clamp(lt / 3.0));
      pos.set(0.004, lerp(0.118, 0.32, k), lerp(0.082, 0.42, k));
      tgt.set(0, lerp(0.0, 0.75, k), lerp(0.026, WIN_Z, k));
      const push = clamp((lt - 2.6) / 2.0);
      pos.z -= push * push * 0.6;
      pos.y += push * push * 0.25;
      fov = lerp(30, 34, k);
      zoom = push * 1.4;
      exposure = 1 + push * 2.5;
    }
    {
      pos.x += drift(gt, 1, 0.0018);
      pos.y += drift(gt, 2, 0.0012);
    }
    cam.fov = fov;
    cam.near = 0.01;
    cam.far = 20;
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt);
    deskU.uCam.value.copy(pos);
    focus = pos.distanceTo(new THREE.Vector3(tgt.x, PHONE_T, tgt.z));
    if (mode === "chat") focus = pos.distanceTo(chatFocus);
    if (mode === "pullout") {
      const fk = sstep(0.8, 2.6, lt);
      focus = lerp(focus, pos.distanceTo(new THREE.Vector3(0, 0.9, WIN_Z)), fk);
      aperture = lerp(6, 2, fk);
    }
    return {
      dof, focus, aperture, exposure, zoomBlur: zoom,
      bloom: 0.45, bloomThreshold: 1.05, bloomRadius: 0.6, streak: 0.12,
      lift: [0.004, 0.012, 0.022], gain: mode === "morning" || mode === "morning9" ? [0.98, 1.0, 1.04] : [0.96, 1.0, 1.06],
      sat: 0.92, grain: 0.07, vignette: 0.6,
    };
  };
  void keys;
  // the thumbnail of 安's film: the frame the picture freezes on (rendered by tools/reveal.sh)
  const ready = new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => {
      VIDEO_THUMB.img = img;
      res();
    };
    img.onerror = () => res();
    img.src = staticFile("reveal.jpg");
  });
  return { scene, ready, update, init };
};
