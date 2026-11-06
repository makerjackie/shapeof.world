// Room department: 林工's flat at night (01:40–03:12, rain). The set, 林工 at his desk with the phone, rain on the
// window glass (a screen-space glass pass over the City department's night city), and the CCTV view (s12).
import * as THREE from 'three';
import { ROOM, ROOM_M, homeCamPose } from './room-layout.js';
import { makeHomeCam } from './room-homecam.js';
import { buildSet } from './room-set.js';
import { buildTowers } from './room-towers.js';
import { makeFigure, PHONE, J, HEAD_PITCH } from './room-figure.js';
import { createRainGlass, createHalo } from './room-rain.js';
import { onTwos, smoother, invLerp, clamp } from './util.js';

const FIGURE_SHOTS = new Set(['s05', 's12', 'k05']);

export function createRoom(ctx) {
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  root.matrix.copy(ROOM_M);
  root.visible = false;
  ctx.scene.add(root);
  const set = buildSet(root);
  buildTowers(root);                     // v12: ordinary neighbours across the street fill the window, no 安 tower
  ctx.shadowRoots.push(set.casters);     // the window frame, curtains, desk and chair cast the low sun's shadow (s18 sweep)
  // the home camera on the shelf
  const hc = makeHomeCam();
  hc.root.position.copy(ROOM.homecam.base);
  root.add(hc.root);
  const fig = makeFigure();
  fig.group.visible = false;
  root.add(fig.group);

  // the phone in his hands
  const phone = ctx.hands?.makePhone?.();
  const phoneRest = new THREE.Matrix4();
  if (phone) {
    const z = PHONE.top.clone().negate(), y = PHONE.n.clone(), x = new THREE.Vector3().crossVectors(y, z).normalize();
    phoneRest.makeBasis(x, y, z).setPosition(PHONE.c.clone().addScaledVector(PHONE.n, -0.004));
    phone.root.matrixAutoUpdate = false;
    phone.root.matrix.copy(phoneRest);
    fig.group.add(phone.root);
  }
  let restW = null;
  const tm = new THREE.Matrix4();

  const rain = createRainGlass(ctx, set.glassZ);
  const halo = createHalo(ctx);
  const _hp = new THREE.Vector3();
  const _red = new THREE.Color();

  // s12: solve the chest / neck / head rotations that point his face straight into the dome camera's lens
  const D2R = Math.PI / 180;
  const FACE = new THREE.Vector3(0, Math.sin(HEAD_PITCH * D2R), -Math.cos(HEAD_PITCH * D2R));
  const HC = new THREE.Vector3(0, 0.075, -0.02).applyAxisAngle(new THREE.Vector3(1, 0, 0), HEAD_PITCH * D2R);
  const LENS = homeCamPose().lens;
  const lookOver = (Y, P, kY, kP, breath = 0) => ({
    chest: { r: [breath + 0.12 * P * kP, 0.16 * Y * kY, 0] },
    neck: { r: [0.33 * P * kP, 0.3 * Y * kY, 0] },
    head: { r: [0.55 * P * kP, 0.54 * Y * kY, -0.06 * Y * kY] },
  });
  let solved = null;
  function solveLook() {
    if (solved) return solved;
    let Y = -60, P = 60;
    const c = new THREE.Vector3(), f = new THREE.Vector3(), t = new THREE.Vector3();
    for (let it = 0; it < 16; it++) {
      const w = fig.rig.pose(lookOver(Y, P, 1, 1));
      const hm = w[fig.rig.index.head];
      c.copy(HC).applyMatrix4(hm); f.copy(FACE).transformDirection(hm); t.copy(LENS).sub(c).normalize();
      Y += (Math.atan2(-t.x, -t.z) - Math.atan2(-f.x, -f.z)) / D2R * 0.9;
      P += (Math.asin(t.y) - Math.asin(f.y)) / D2R * 0.9;
    }
    solved = { Y, P };
    return solved;
  }

  function poseFor(st) {
    const t = onTwos(st.tr);
    const breath = Math.sin(t * Math.PI * 2 / 3.6) * 0.7;
    const o = { chest: { r: [breath, 0, 0] }, head: { r: [breath * 0.4, 0, 0] } };
    if (st.sid === 's12') {
      // at CUES.lookUp he slowly lifts his head, then turns it, straight into the lens; holds the last 0.6 s
      const L = solveLook();
      const kP = smoother(invLerp(st.cues.lookUp - 0.1, st.cues.lookUp + 0.85, t));
      const kY = smoother(invLerp(st.cues.lookUp + 0.05, st.cues.lookUp + 1.0, t));
      Object.assign(o, lookOver(L.Y, L.P, kY, kP, breath * (1 - kP)));
    }
    return o;
  }

  return {
    root, set, figure: fig,
    update(st) {
      const on = st.set === 'room';
      root.visible = on;
      rain.update(st, on);
      halo.hide();
      if (!on) return;
      // the home camera: a few degrees off him until CUES.camTurn, then a servo step (fast, a hair of overshoot)
      {
        const u = clamp((st.tr - st.cues.camTurn) / 0.16, 0, 1);
        const off = 5.5 * (1 - u * u * (3 - 2 * u)) - 0.35 * Math.sin(Math.PI * clamp((st.tr - st.cues.camTurn - 0.12) / 0.22, 0, 1));
        const P = homeCamPose(st.sid === 'k06' ? off : 0, st.sid === 'k06' ? -off * 0.3 : 0);
        hc.set(P.pan, P.tilt, st.sid === 'k06' ? (st.tr >= st.cues.camTurn + 0.1 ? 1 : 0) : 0);
        hc.root.visible = st.sid !== 's12';
      }
      const showFig = FIGURE_SHOTS.has(st.sid);
      // s12 is infrared video: hair and skin read light grey, so the shadowed face becomes a void
      const ir = st.sid === 's12';
      const [mB, mH, mN] = fig.mats;
      mH.uniforms.uColN.value.set(ir ? '#8a90a0' : '#1f2330');
      mH.uniforms.uColP.value.set(ir ? '#f4ece8' : '#ebd2c6');
      mN.uniforms.uColP.value.set(ir ? '#f4ece8' : '#ebd2c6');
      mH.uniforms.uFaceK.value = ir ? 0.85 : 0.5;
      // k05: the rim on his silhouette turns with the screen, cold → red at CUES.killPress
      const red = st.sid === 'k05' ? clamp((st.tr - st.cues.killPress + 0.02) / 0.14, 0, 1) : 0;
      for (const m of fig.mats) m.uniforms.uRimCol.value.set('#b9c6ff').lerp(_red.set('#ff4a3a'), red);
      fig.group.children[0].visible = st.sid !== 'k05';     // the flyaway strands (their cold rim would fight the red)
      fig.group.visible = showFig;
      if (showFig) {
        const w = fig.pose(poseFor(st));
        if (!restW) restW = fig.rig.pose({}).map((m) => m.clone().invert());
        if (phone) {
          const i = fig.rig.index.wrR;
          tm.multiplyMatrices(w[i], restW[i]);
          phone.root.matrix.multiplyMatrices(tm, phoneRest);
          const pc = ctx.ui?.screen?.('phone-lin', st);
          const glow = pc ? (pc.glow ?? 1) : 1;
          phone.setScreen(pc || null, glow);
          // the phone's cold halo around his silhouette (s05, seen from behind)
          if (st.sid === 's05' || st.sid === 'k05') {
            _hp.setFromMatrixPosition(phone.root.matrix).applyMatrix4(ROOM_M);
            const red = st.sid === 'k05' ? clamp((st.tr - st.cues.killPress + 0.02) / 0.14, 0, 1) : 0;
            halo.set(_hp, (0.9 + 0.6 * red) * Math.max(glow, 0.6), 1.1 + 0.6 * red, red > 0 ? '#ff3a2c' : '#9fb6ff');
          }
        }
      }
    },
  };
}
