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

  // phone
  const phone = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.85, roughness: 0.3 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(PHONE_W, PHONE_T, PHONE_L, 5, 0.0068), bodyMat);
  body.position.y = PHONE_T / 2;
  phone.add(body);
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
  screen.position.y = PHONE_T + 0.00005;
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
  badge.position.set(-0.115, 0.00045, 0.035);
  badge.rotation.y = 0.42;
  scene.add(badge);
  const strap = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.13, 0.002, -0.01),
        new THREE.Vector3(-0.17, 0.002, -0.07),
        new THREE.Vector3(-0.26, 0.002, -0.08),
        new THREE.Vector3(-0.33, 0.002, 0.02),
        new THREE.Vector3(-0.42, 0.002, 0.09),
      ]),
      64, 0.0022, 6,
    ),
    new THREE.MeshStandardMaterial({ color: 0x173a4c, roughness: 0.8 }),
  );
  scene.add(strap);
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
    else drawChat(ctx, mode === "pullout" ? 45 : lt, P.chat);
    tex.needsUpdate = true;
  };

  const chatFocus = new THREE.Vector3();
  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    deskU.uT.value = gt;
    deskU.uDawn.value = mode === "morning" || mode === "morning9" ? 1 : 0;
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
      if (lt < 5.0) {
        // the reveal: high over the whole phone while the film lands in it, then 安 asks if he watched it
        const p = revealPose(lt, gt);
        pos.copy(p.pos);
        tgt.copy(p.tgt);
        fov = p.fov;
        aperture = 0.5;
        chatFocus.set(0, PHONE_T, 0.01);
      } else if (lt < 9.6) {
        const k = clamp((lt - 5.0) / 4.6);
        pos.set(0.012, lerp(0.112, 0.104, k), lerp(0.098, 0.094, k));
        tgt.set(0, 0, 0.046);
        fov = 30;
        aperture = 1.4;
        chatFocus.set(0, PHONE_T, 0.05);
      } else if (lt < 14.6) {
        const k = clamp((lt - 9.6) / 5);
        pos.set(lerp(0.33, 0.29, k), lerp(0.21, 0.19, k), lerp(0.36, 0.31, k));
        tgt.set(0.0, 0.0, -0.03);
        fov = 32;
        aperture = 4;
        chatFocus.set(0, PHONE_T, 0);
        exposure = 1.15;
      } else if (lt < 19.5) {
        const k = clamp((lt - 14.6) / 4.9);
        pos.set(lerp(-0.13, -0.11, k), lerp(0.16, 0.145, k), lerp(0.2, 0.175, k));
        tgt.set(0, 0, 0.022);
        fov = 30;
        aperture = 2.2;
        chatFocus.set(0, PHONE_T, 0.035);
      } else if (lt < 30) {
        const k = clamp((lt - 19.5) / 10.5);
        pos.set(0.003, lerp(0.168, 0.15, k), lerp(0.072, 0.064, k));
        tgt.set(0, 0, lerp(0.016, 0.02, k));
        fov = 30;
        aperture = 1.2;
        chatFocus.set(0, PHONE_T, 0.03);
      } else {
        const k = clamp((lt - 30) / 12);
        pos.set(lerp(0.011, 0.008, k), lerp(0.155, 0.132, k), lerp(0.08, 0.072, k));
        tgt.set(0, 0, lerp(0.022, 0.03, k));
        fov = 30;
        aperture = 1.3;
        chatFocus.set(0, PHONE_T, 0.04);
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
    if (!(mode === "chat" && lt < 5.0)) {
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
