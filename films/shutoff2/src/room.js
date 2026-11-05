// Room department: 林工's flat at night (01:40–03:12, rain). The set, 林工 at his desk with the phone, rain on the
// window glass (a screen-space glass pass over the City department's night city), and the CCTV view (s12).
import * as THREE from 'three';
import { ROOM, ROOM_M } from './room-layout.js';
import { buildSet } from './room-set.js';
import { makeFigure, PHONE, J } from './room-figure.js';
import { createRainGlass, createHalo } from './room-rain.js';
import { onTwos, smoother, invLerp, clamp } from './util.js';

const FIGURE_SHOTS = new Set(['s05', 's12']);

export function createRoom(ctx) {
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  root.matrix.copy(ROOM_M);
  root.visible = false;
  ctx.scene.add(root);
  const set = buildSet(root);
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

  function poseFor(st) {
    const t = onTwos(st.tr);
    const breath = Math.sin(t * Math.PI * 2 / 3.6) * 0.7;
    const o = { chest: { r: [breath, 0, 0] }, head: { r: [breath * 0.4, 0, 0] } };
    if (st.sid === 's12') {
      // at CUES.lookUp he slowly lifts his head and turns toward the ceiling camera
      const k = smoother(invLerp(st.cues.lookUp - 0.05, st.cues.lookUp + 1.25, t));
      const k2 = smoother(invLerp(st.cues.lookUp + 0.1, st.cues.lookUp + 1.45, t));
      o.chest = { r: [breath + 6 * k, -10 * k2, 0] };
      o.neck = { r: [22 * k, -22 * k2, 0] };
      o.head = { r: [42 * k, -38 * k2, -4 * k2] };
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
      const showFig = FIGURE_SHOTS.has(st.sid);
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
          if (st.sid === 's05') {
            _hp.setFromMatrixPosition(phone.root.matrix).applyMatrix4(ROOM_M);
            halo.set(_hp, 0.5 * glow, 0.75);
          }
        }
        // re-pose resets restW's rig state; restore the current pose for later readers
        fig.rig.pose(poseFor(st));
      }
    },
  };
}
