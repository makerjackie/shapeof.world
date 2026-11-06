// Hands department: 林工's hand + forearm (sculpted, skinned, posed per shot), his smartwatch, and the phone prop.
//   ctx.hands.makePhone() → { root, setScreen(canvas, glow) }   origin = centre of the back, screen +y, screen top −z
//   ctx.hands.makeWatch() → { root, setScreen(canvas) }
// Shots: s02 wrist (meet), s15 pulse (room), s18 jump (room), s21 grip (meet).
import * as THREE from 'three';
import { makePhone, makeWatch } from './hands-props.js';
import { makeHandSculpt, makeSleeveSculpt, WATCH_X, wristSection } from './hands-rig.js';
import { sculptMaterial } from './hands-sdf.js';
import { STAGES, MESHES, PHONE_IN_HAND, bindCtx, meetTable } from './hands-stage.js';
import { ROOM_M } from './room-layout.js';
import { toonMaterial } from './materials.js';

const FLAT = new Set(['phone', 'card', 'black']);
// v13 has no hand close-ups: no shot stages the hand rig (the stage data is kept for reference)
const ACTIVE = new Set([]);

export function createHands(ctx) {
  bindCtx(ctx);
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  root.visible = false;
  ctx.scene.add(root);
  ctx.shadowRoots.push(root);

  const skinMat = sculptMaterial({ warmK: 0.4, rim: 0.75, aoK: 1.0, lineW: 0.00045, lineCol: '#7a4a4a' });
  const shirtMat = sculptMaterial({ rim: 0.55, aoK: 0.9, lineW: 0.0007, lineCol: '#55607a' });

  // base sculpts are built lazily, the first time a shot needs them (deterministic, cached)
  const built = {};
  function get(key) {
    if (built[key]) return built[key];
    const M = MESHES[key];
    const hs = makeHandSculpt({ tendon: M.tendon, veins: M.veins, knuckle: M.knuckle, h: M.h ?? 0.0009 });
    const pose = M.pose();
    const hb = hs.sculpt.build(pose);
    const ss = makeSleeveSculpt(hs.rig, { loose: key === 'desk' ? 1 : 0 });
    const sb = ss.build(pose);
    const hm = new THREE.Mesh(hb.geo, skinMat), sm = new THREE.Mesh(sb.geo, shirtMat);
    hm.frustumCulled = sm.frustumCulled = false;
    const g = new THREE.Group(); g.add(hm, sm); g.visible = false;
    root.add(g);
    built[key] = { hs, hb, ss, sb, g };
    console.log(`[hands] built ${key}: ${hb.count} + ${sb.count} verts in ${(hb.ms + sb.ms).toFixed(0)} ms`);
    return built[key];
  }

  const sec = wristSection(WATCH_X);
  const watch = makeWatch({ a: sec.a, b: sec.b });
  watch.root.position.x = WATCH_X;
  root.add(watch.root);

  const phone = makePhone();
  phone.root.matrixAutoUpdate = false;
  phone.root.visible = false;
  ctx.scene.add(phone.root);
  ctx.shadowRoots.push(phone.root);

  // stand-in meeting table edge until the Meet department's table exists
  const standin = new THREE.Group();
  {
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.045, 2.6), toonMaterial({ color: '#efece6', id: 71, spec: 0.3 }));
    top.position.set(0, -0.0225, -1.3);
    standin.add(top);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.006, 0.01), toonMaterial({ color: '#b9b4ab', id: 72 }));
    lip.position.set(0, -0.003, 0.0);
    standin.add(lip);
  }
  standin.visible = false;
  ctx.scene.add(standin);

  // 林工's wedding ring: a plain platinum band on the ring finger of his left hand, following the 'r1' bone
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0089, 0.00125, 10, 40).rotateY(Math.PI / 2).scale(1, 0.88, 1),
    toonMaterial({ color: '#dfe3ea', id: 76, spec: 1, rim: 0.7 }));
  ring.matrixAutoUpdate = false;
  root.add(ring);
  const RING_AT = new THREE.Matrix4().makeTranslation(0.0165, 0.0, 0.0);

  const tmp = new THREE.Matrix4();
  return {
    makePhone, makeWatch,
    watch, phone,
    update(st) {
      const S = ACTIVE.has(st.sid) ? STAGES[st.sid] : null;
      const on = !!S && !FLAT.has(st.set);
      root.visible = on;
      phone.root.visible = on && !!S.phone;
      standin.visible = false;
      if (!on) return;
      const b = get(S.mesh);
      for (const k in built) built[k].g.visible = k === S.mesh;
      root.matrix.copy(S.matrix());
      root.matrixWorldNeedsUpdate = true;
      const over = S.over(st.lt, st.dur, st);
      const worlds = b.hs.sculpt.deform(b.hb, over);
      ring.matrix.multiplyMatrices(worlds[b.hs.rig.index.r1], RING_AT);
      ring.matrixWorldNeedsUpdate = true;
      b.ss.deform(b.sb, over);
      skinMat.uniforms.uPale.value = S.pale(st.lt, st.dur, st);
      skinMat.uniforms.uSmoothK.value = S.smoothK ?? 0.8;
      const wc = ctx.ui?.screen?.('watch', st);
      watch.setScreen(wc || null, 1);
      if (S.phone) {
        const p = S.phone;
        if (p.inHand) phone.root.matrix.multiplyMatrices(root.matrix, PHONE_IN_HAND);
        else {
          tmp.makeRotationY(p.yaw * Math.PI / 180).setPosition(p.pos[0], p.pos[1], p.pos[2]);
          phone.root.matrix.multiplyMatrices(ROOM_M, tmp);
        }
        phone.root.matrixWorldNeedsUpdate = true;
        const pc = ctx.ui?.screen?.(p.canvas, st);
        const g = p.useCanvasGlow && pc && pc.glow != null ? Math.min(pc.glow, p.glow(st.lt, st.dur, st)) : p.glow(st.lt, st.dur, st);
        phone.setScreen(pc || null, g);
      }
      if (st.set === 'meet') {
        const T = meetTable();
        if (!T.real) { standin.visible = true; standin.position.set(T.x, T.top, T.edgeZ); }
      }
    },
  };
}
