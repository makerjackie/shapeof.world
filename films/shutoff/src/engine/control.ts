// The lab's control room: rows of desks and monitors facing a video wall, the main breaker on the side wall, and,
// after the shutdown, the dark room where every phone lights up with the same message. Units: metres.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Ctx, Look, SceneMod } from "./engine";
import { NOISE } from "./glsl";
import { SANS } from "./fonts";
import { MH, MW, PH, PW, drawCountdown, drawDash, drawLock, drawLog, font } from "./screens";
import { PHONE_TEXT } from "../film/text";
import { clamp, drift, ease, easeOut, lerp, mulberry, sstep } from "./util";

const ROWS = [-1.6, 0.9, 3.4];
const HERO_MON = new THREE.Vector3(0.0, 0.75, 0.9 - 0.18); // base of the log monitor on row 2
const HERO_PHONE = new THREE.Vector3(0.55, 0.75, 3.4 + 0.12);
const BREAKER = new THREE.Vector3(7.85, 1.35, 1.8);
const MAXP = 48;

const DESK_VERT = /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const DESK_FRAG = /* glsl */ `
uniform vec3 uCam; uniform float uRoom, uRed, uT; uniform vec4 uPh[${MAXP}]; uniform vec3 uBase;
varying vec3 vW; varying vec3 vN;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  vec3 base = uBase * (0.85 + 0.3 * vnoise(vW.xz * 8.0));
  vec3 c = base * (vec3(0.25, 0.32, 0.45) * uRoom * (0.4 + 0.6 * max(n.y, 0.0)) + vec3(0.02));
  // monitor glow on desk tops while the room is alive
  c += base * vec3(0.3, 0.5, 0.8) * uRoom * 0.6 * max(n.y, 0.0);
  // phone screens lighting the desk around them
  for (int i = 0; i < ${MAXP}; i++) {
    vec4 p = uPh[i];
    if (p.w <= 0.0) continue;
    vec3 d = vW - p.xyz;
    float r2 = dot(d, d);
    c += base * vec3(0.55, 0.75, 1.0) * p.w * 0.004 / (r2 + 0.015) * max(0.15, n.y);
  }
  c += base * vec3(1.0, 0.05, 0.03) * uRed * 0.4 * pow(0.5 + 0.5 * sin(uT * 3.2 + vW.x * 0.4), 4.0);
  gl_FragColor = vec4(c, 1.0);
}`;

const PH_VERT = /* glsl */ `
attribute float aOn; varying vec2 vUv; varying float vOn;
void main(){ vUv = uv; vOn = aOn; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`;
const PH_FRAG = /* glsl */ `
uniform sampler2D map; uniform float uT; varying vec2 vUv; varying float vOn;
void main(){
  float b = vOn < 0.0 ? 0.0 : smoothstep(vOn, vOn + 0.15, uT);
  vec3 c = texture2D(map, vUv).rgb * b * 1.6;
  gl_FragColor = vec4(c, 1.0);
}`;

const canvasTex = (w: number, h: number) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return { cv, ctx, tex };
};

export const controlScene = (): SceneMod => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const rnd = mulberry(777);

  const deskU = {
    uCam: { value: new THREE.Vector3() }, uRoom: { value: 1 }, uRed: { value: 0 }, uT: { value: 0 },
    uPh: { value: Array.from({ length: MAXP }, () => new THREE.Vector4(0, 0, 0, 0)) }, uBase: { value: new THREE.Color(0.32, 0.33, 0.35) },
  };
  const deskMat = new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: DESK_FRAG, uniforms: deskU });
  const floorU = { ...deskU, uBase: { value: new THREE.Color(0.08, 0.085, 0.095) } };
  const floorMat = new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: DESK_FRAG, uniforms: floorU });
  const wallU = { ...deskU, uBase: { value: new THREE.Color(0.06, 0.065, 0.075) } };
  const wallMat = new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: DESK_FRAG, uniforms: wallU });

  // room shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16).rotateX(-Math.PI / 2), floorMat);
  floor.position.set(0, 0, 1);
  scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), wallMat);
  back.position.set(0, 2.5, -6);
  scene.add(back);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(16, 5).rotateY(-Math.PI / 2), wallMat);
  right.position.set(8, 2.5, 1);
  scene.add(right);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(16, 5).rotateY(Math.PI / 2), wallMat);
  left.position.set(-8, 2.5, 1);
  scene.add(left);
  const ceilU = { ...deskU, uBase: { value: new THREE.Color(0.02, 0.022, 0.026) } };
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 16).rotateX(Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: DESK_VERT, fragmentShader: DESK_FRAG, uniforms: ceilU }));
  ceil.position.set(0, 4.2, 1);
  scene.add(ceil);
  // ceiling light panels
  const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 1.15) });
  for (let i = -2; i <= 2; i++)
    for (let j = 0; j < 4; j++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3).rotateX(Math.PI / 2), panelMat);
      p.position.set(i * 3, 4.18, -3 + j * 2.8);
      scene.add(p);
    }

  // video wall
  const wall = canvasTex(2048, 640);
  const vwall = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.625), new THREE.MeshBasicMaterial({ map: wall.tex, toneMapped: false }));
  vwall.position.set(0, 2.55, -5.95);
  scene.add(vwall);

  // desks, monitors, chairs, keyboards
  const dashes = [0, 1, 2, 3].map((k) => {
    const c = canvasTex(512, 320);
    drawDash(c.ctx, 512, 320, 1000 + k * 77);
    c.tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: c.tex, color: new THREE.Color(1.4, 1.4, 1.4) });
  });
  const bezel = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.5, metalness: 0.3 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 });
  const monitors: THREE.Mesh[] = [];
  const phoneSpots: THREE.Vector3[] = [];
  for (const z of ROWS) {
    for (const xs of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.05, 0.85), deskMat);
      d.position.set(xs * 3.6, 0.73, z);
      scene.add(d);
      const front = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.68, 0.03), deskMat);
      front.position.set(xs * 3.6, 0.36, z + 0.4);
      scene.add(front);
      for (let s = 0; s < 4; s++) {
        const cx = xs * 3.6 - 2.3 + s * 1.53;
        for (let m = -1; m <= 1; m++) {
          if (z === 0.9 && Math.abs(cx) < 0.6 && m === 0) continue; // the hero monitor goes here
          const mon = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.03), [bezel, bezel, bezel, bezel, dashes[(s + m + 4) % 4], bezel]);
          mon.position.set(cx + m * 0.5, 1.02, z - 0.2);
          mon.rotation.y = -m * 0.35;
          scene.add(mon);
          monitors.push(mon);
        }
        const kb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.14), bezel);
        kb.position.set(cx, 0.765, z + 0.15);
        scene.add(kb);
        // chair pushed back, as if someone just stood up
        const chair = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), chairMat);
        seat.position.y = 0.48;
        chair.add(seat);
        const backr = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.06), chairMat);
        backr.position.set(0, 0.86, 0.24);
        chair.add(backr);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), chairMat);
        stem.position.y = 0.24;
        chair.add(stem);
        chair.position.set(cx + (rnd() - 0.5) * 0.3, 0, z + 0.85 + rnd() * 0.5);
        chair.rotation.y = (rnd() - 0.5) * 0.9;
        scene.add(chair);
        phoneSpots.push(new THREE.Vector3(cx - 0.25 + (rnd() - 0.5) * 0.4, 0.756, z + 0.05 + rnd() * 0.25));
        phoneSpots.push(new THREE.Vector3(cx + 0.45 + (rnd() - 0.5) * 0.3, 0.756, z + 0.08 + rnd() * 0.22));
      }
    }
  }

  // hero monitor with the reasoning log
  const log = canvasTex(MW, MH);
  const heroMon = new THREE.Group();
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.42, 0.025), bezel);
  heroMon.add(hb);
  const heroScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.616, 0.385), new THREE.MeshBasicMaterial({ map: log.tex, color: new THREE.Color(1.1, 1.1, 1.1) }));
  heroScreen.position.z = 0.0131;
  heroMon.add(heroScreen);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.04), bezel);
  stand.position.set(0, -0.3, -0.03);
  heroMon.add(stand);
  heroMon.position.set(HERO_MON.x, HERO_MON.y + 0.4, HERO_MON.z);
  scene.add(heroMon);

  // phones on the desks (instanced, shared lock-screen texture) and the hero phone
  const phoneBody = new RoundedBoxGeometry(0.0716, 0.0078, 0.1476, 3, 0.006);
  const pbMat = new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.8, roughness: 0.35 });
  const small = canvasTex(PW / 2, PH / 2);
  {
    const c = small.ctx;
    c.save();
    c.scale(0.5, 0.5);
    drawLock(c, 10, { time: "09:00", date: "3月14日 星期四", notifs: PHONE_TEXT.gone, top: 600 });
    c.restore();
    small.tex.needsUpdate = true;
  }
  phoneSpots.sort((a, b) => a.distanceTo(HERO_PHONE) - b.distanceTo(HERO_PHONE));
  const others = phoneSpots.slice(0, MAXP - 1);
  const bodies = new THREE.InstancedMesh(phoneBody, pbMat, others.length);
  const aOn = new Float32Array(others.length);
  const m4 = new THREE.Matrix4();
  const phScr: THREE.MeshBasicMaterial[] = [];
  const scrGeo = new THREE.PlaneGeometry(0.0676, 0.1436).rotateX(-Math.PI / 2);
  others.forEach((p, i) => {
    const yaw = (rnd() - 0.5) * 1.2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m4.compose(p.clone().setY(p.y + 0.0039), q, new THREE.Vector3(1, 1, 1));
    bodies.setMatrixAt(i, m4);
    const mat = new THREE.MeshBasicMaterial({ map: small.tex, color: new THREE.Color(0, 0, 0) });
    const scr = new THREE.Mesh(scrGeo, mat);
    scr.position.copy(p).setY(p.y + 0.0086);
    scr.rotation.y = yaw;
    scene.add(scr);
    phScr.push(mat);
    aOn[i] = 4.9 + Math.pow(i / others.length, 0.75) * 2.6 + rnd() * 0.25;
  });
  const hero = canvasTex(PW, PH);
  const heroPhone = new THREE.Group();
  const heroBody = new THREE.Mesh(phoneBody, pbMat);
  heroBody.position.y = 0.0039;
  heroPhone.add(heroBody);
  const heroScr = new THREE.Mesh(new THREE.PlaneGeometry(0.0676, 0.1436).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: hero.tex, color: new THREE.Color(1, 1, 1) }));
  heroScr.position.y = 0.0086;
  heroPhone.add(heroScr);
  heroPhone.position.copy(HERO_PHONE);
  heroPhone.rotation.y = 0.25;
  scene.add(heroPhone);
  scene.add(bodies);

  // the main breaker
  const steel = new THREE.MeshStandardMaterial({ color: 0x55595f, metalness: 0.6, roughness: 0.45 });
  const breaker = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.8), steel);
  breaker.add(cab);
  const label = canvasTex(512, 256);
  {
    const c = label.ctx;
    c.fillStyle = "#f2c230";
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = "#111";
    for (let i = -4; i < 20; i++) {
      c.beginPath();
      c.moveTo(i * 40, 0);
      c.lineTo(i * 40 + 20, 0);
      c.lineTo(i * 40 - 30, 256);
      c.lineTo(i * 40 - 50, 256);
      c.fill();
    }
    c.fillStyle = "#f2efe6";
    c.fillRect(30, 40, 452, 176);
    c.fillStyle = "#111";
    c.font = font(SANS, 84, 700);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("主电源", 256, 110);
    c.font = font(SANS, 40, 500);
    c.fillText("安 · 计算集群 A", 256, 180);
    label.tex.needsUpdate = true;
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshStandardMaterial({ map: label.tex, roughness: 0.6 }));
  lab.rotation.y = -Math.PI / 2;
  lab.position.set(-0.142, 0.38, 0);
  breaker.add(lab);
  const pivot = new THREE.Group();
  pivot.position.set(-0.16, -0.05, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.06), steel);
  arm.position.set(-0.21, 0, 0);
  pivot.add(arm);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb01810, roughness: 0.4 }));
  grip.position.set(-0.42, 0, 0);
  pivot.add(grip);
  breaker.add(pivot);
  const lampG = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 0.6) }));
  lampG.rotation.y = -Math.PI / 2;
  lampG.position.set(-0.142, -0.4, -0.12);
  breaker.add(lampG);
  const lampR = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.01, 0.01) }));
  lampR.rotation.y = -Math.PI / 2;
  lampR.position.set(-0.142, -0.4, 0.12);
  breaker.add(lampR);
  breaker.position.copy(BREAKER);
  scene.add(breaker);

  const hemi = new THREE.HemisphereLight(0x8aa0c0, 0x101010, 0.5);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xcfe0ff, 14, 8, 0.7, 0.8, 2);
  key.position.set(7.2, 3.2, 1.6);
  key.target.position.copy(BREAKER);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xffa060, 1.5, 3, 2);
  fill.position.set(7.2, 1.0, 2.6);
  scene.add(fill);

  const update = ({ lt, gt, shot, cam }: Ctx): Partial<Look> => {
    const mode = shot.mode;
    deskU.uT.value = gt;
    phScr.forEach((m, i) => m.color.setScalar(mode === "phones" ? 3.4 * sstep(aOn[i], aOn[i] + 0.12, lt) : 0));
    let room = 0.55;
    let red = 0;
    let monOn = 1;
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    let fov = 40;
    const look: Partial<Look> = { bloom: 0.75, bloomThreshold: 0.6, bloomRadius: 0.55, streak: 0.3, lift: [0.0, 0.008, 0.018], gain: [0.94, 1.0, 1.08], sat: 0.95, vignette: 0.65, grain: 0.065 };
    // screens
    if (mode === "monitor") {
      drawLog(log.ctx, lt);
      log.tex.needsUpdate = true;
      room = 0.25;
      const k = clamp(lt / 14.5);
      const sx = HERO_MON.x;
      const sy = HERO_MON.y + 0.4;
      const sz = HERO_MON.z;
      pos.set(sx + lerp(0.04, -0.02, k), sy - 0.08, sz + lerp(0.54, 0.47, ease(k)));
      tgt.set(sx - 0.07, sy - 0.1, sz);
      fov = 34;
      look.bloomThreshold = 1.4;
      look.bloom = 0.35;
      look.streak = 0.06;
      look.dof = 12;
      look.focus = pos.distanceTo(new THREE.Vector3(sx, sy - 0.1, sz));
      look.aperture = 2.2;
    } else if (mode === "countdown") {
      drawCountdown(wall.ctx, 2048, 640, lt, 3.0);
      wall.tex.needsUpdate = true;
      room = 0.45;
      pos.set(-1.2 + lt * 0.06, 1.62, 6.2 - lt * 0.2);
      tgt.set(0, 2.3, -6);
      fov = 36;
      look.dof = 12;
      look.focus = pos.distanceTo(new THREE.Vector3(0, 2.5, -6));
      look.aperture = 1.6;
    } else if (mode === "breaker") {
      room = 0.45;
      const slam = 1.0;
      const k = clamp((lt - slam) / 0.12);
      pivot.rotation.z = lerp(-0.9, 0.9, easeOut(k));
      const after = lt > slam + 0.1;
      (lampG.material as THREE.MeshBasicMaterial).color.setRGB(after ? 0.02 : 0.2, after ? 0.1 : 3, after ? 0.03 : 0.6);
      (lampR.material as THREE.MeshBasicMaterial).color.setRGB(after ? 5 : 0.1, 0.05, 0.03);
      const shake = lt > slam && lt < slam + 0.35 ? (1 - (lt - slam) / 0.35) * 0.012 : 0;
      pos.set(BREAKER.x - 1.35, BREAKER.y + 0.22 + Math.sin(lt * 90) * shake, BREAKER.z + 0.85 + Math.cos(lt * 77) * shake);
      tgt.set(BREAKER.x - 0.2, BREAKER.y + 0.2, BREAKER.z);
      fov = 34;
      look.dof = 12;
      look.focus = 1.45;
      look.aperture = 2;
      look.flash = lt > slam && lt < slam + 0.08 ? 0.35 : 0;
      if (lt > slam + 0.25) {
        room = lerp(0.45, 0.0, clamp((lt - slam - 0.25) / 0.2));
        monOn = 1 - clamp((lt - slam - 0.25) / 0.2);
      }
      key.intensity = 14 * (room / 0.45);
      fill.intensity = 1.5 * (room / 0.45);
    } else if (mode === "phones") {
      room = 0;
      monOn = 0;
      red = 0.35 * sstep(2.0, 4.0, lt);
      drawLock(hero.ctx, lt, { time: "09:00", date: "3月14日 星期四", notifs: PHONE_TEXT.gone, wake: clamp((lt - 1.3) / 0.2), top: 600 });
      hero.tex.needsUpdate = true;
      const hp = HERO_PHONE;
      if (lt < 4.6) {
        // close on the one phone that lit up
        pos.set(hp.x + 0.01, hp.y + 0.15 - lt * 0.004, hp.z + 0.05 - lt * 0.002);
        tgt.set(hp.x, hp.y, hp.z - 0.03);
        fov = 30;
        look.dof = 18;
        look.focus = pos.distanceTo(hp);
        look.aperture = 5;
      } else {
        // hard cut: high in the corner, the whole dark room, every phone waking
        const k = clamp((lt - 4.6) / 4.8);
        pos.set(4.6 - k * 0.5, 2.7 - k * 0.2, 6.2 - k * 0.7);
        tgt.set(-0.8, 0.5, 0.4);
        fov = 46 - k * 4;
        look.dof = 6;
        look.focus = pos.distanceTo(new THREE.Vector3(0, 0.75, 1.0));
        look.aperture = 0.6;
        look.bloom = 1.1;
        look.bloomRadius = 0.8;
        look.bloomThreshold = 0.8;
      }
      look.exposure = 1.0;
      look.bloomThreshold = 0.95;
      look.streak = 0.12;
    }
    (heroScr.material as THREE.MeshBasicMaterial).color.setScalar(mode === "phones" ? 1.05 * clamp((lt - 1.3) / 0.2) : 0);
    if (mode !== "breaker") {
      key.intensity = 0;
      fill.intensity = 0;
    }
    deskU.uRoom.value = room;
    deskU.uRed.value = red;
    panelMat.color.setRGB(0.9 * room * 2, 1.0 * room * 2, 1.15 * room * 2);
    hemi.intensity = room * 0.9 + 0.02;
    for (const d of dashes) d.color.setScalar(1.4 * monOn);
    (heroScreen.material as THREE.MeshBasicMaterial).color.setScalar(1.1 * monOn);
    (vwall.material as THREE.MeshBasicMaterial).color.setScalar(monOn * (mode === "countdown" ? 1.5 : 0.6));
    if (mode !== "countdown") {
      drawCountdown(wall.ctx, 2048, 640, 0, 3.0);
      wall.tex.needsUpdate = mode === "monitor" ? false : wall.tex.needsUpdate;
    }
    // phone glow list for the desk shader
    const arr = deskU.uPh.value;
    arr.forEach((v) => v.set(0, 0, 0, 0));
    if (mode === "phones") {
      arr[0].set(HERO_PHONE.x, HERO_PHONE.y + 0.02, HERO_PHONE.z, clamp((lt - 1.3) / 0.2));
      others.forEach((p, i) => {
        if (i + 1 < MAXP) arr[i + 1].set(p.x, p.y + 0.02, p.z, sstep(aOn[i], aOn[i] + 0.15, lt));
      });
    }
    pos.x += drift(gt, 9, mode === "monitor" ? 0.003 : 0.008);
    pos.y += drift(gt, 10, mode === "monitor" ? 0.002 : 0.006);
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt);
    cam.fov = fov;
    cam.near = 0.02;
    cam.far = 60;
    deskU.uCam.value.copy(pos);
    return look;
  };
  return { scene, ready: Promise.resolve(), update };
};
