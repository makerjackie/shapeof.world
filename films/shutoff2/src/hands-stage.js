// Where 林工's hand is and how it is posed in each of its shots. Shared by hands.js (the meshes) and cams/hands.js.
import * as THREE from 'three';
import { ROOM, ROOM_M } from './room-layout.js';
import { onTwos, noise1, smooth, invLerp, clamp, lerp } from './util.js';
import * as ML from './meet-layout.js';
import { makeHandSculpt } from './hands-rig.js';

let CTX = null;
export function bindCtx(ctx) { CTX = ctx; }

// The meeting-room table edge on 林工's side (+Z). The Meet department may expose ctx.meet.table =
// { top (world y of the table top), edgeZ (world z of 林工's edge), x (world x of his seat centre) }.
// Read from the Meet department's layout module (src/meet-layout.js: TOP, EDGE_LIN, SEATS.lin).
const STANDIN = { top: 150.74, edgeZ: 2.4, x: 0.0 };
export function meetTable() {
  if (Number.isFinite(ML.TOP) && Number.isFinite(ML.EDGE_LIN)) return { top: ML.TOP, edgeZ: ML.EDGE_LIN, x: ML.SEATS?.lin?.x ?? 0, real: true };
  return { ...STANDIN, real: false };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// rig-root matrix from a position, the finger direction (model +X) and the back-of-hand direction (model +Y)
function frame(p, fwd, up, roll = 0) {
  const x = fwd.clone().normalize();
  const y0 = up.clone().normalize();
  const z = new THREE.Vector3().crossVectors(x, y0).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationX(roll * Math.PI / 180));
  return m;
}
const tw = (t, seed, amp) => noise1(onTwos(t) * 7.0, seed) * amp;     // tremor, drawn on twos

// finger pose helpers: f = { i: [mcp, pip, dip], ... } flexion (deg, negative curls toward the palm)
function fingers(over, f, spread = {}) {
  for (const n of ['i', 'm', 'r', 'l']) {
    const [a, b, c] = f[n];
    over[n + '1'] = { r: [0, spread[n] ?? 0, a] };
    over[n + '2'] = { r: [0, 0, b] };
    over[n + '3'] = { r: [0, 0, c] };
  }
  return over;
}

// The phone in his left hand (k05): phone-local → hand-model. The phone's back lies against the palm and fingers,
// screen facing away from the palm (hand −Y), its width along the fingers (+X, the right edge under the fingertips),
// its top toward the thumb side (+Z). The thumb crosses the screen from the left edge.
export const PHONE_IN_HAND = new THREE.Matrix4().makeRotationX(Math.PI).setPosition(0.092, -0.0175, -0.004);
// k05: where the phone is in the room (screen toward his eyes), and the hand root derived from it
function phoneWorldK05() {
  const c = V(0.0, 0.93, -1.43), eye = V(0.04, 1.2, -1.14);
  const n = eye.clone().sub(c).normalize();
  const xr = V(1, 0, 0.0).normalize();
  const top = new THREE.Vector3().crossVectors(n, xr).normalize();
  const x = new THREE.Vector3().crossVectors(n, top.clone().negate()).normalize();
  return new THREE.Matrix4().makeBasis(x, n, top.clone().negate()).setPosition(c.clone().addScaledVector(n, -0.008));
}
export const K05 = { phone: () => ROOM_M.clone().multiply(phoneWorldK05()) };

// Solve the thumb (t1 Y/Z rotation + t2 flexion) so the thumb pad lands on a point (hand-model space) while the
// thumb's middle joint stays in front of the screen plane (y < frontY), i.e. the thumb arches over the phone's edge.
let _rig = null;
const _thumbCache = {};
function solveThumb(key, over, target, frontY) {
  if (_thumbCache[key]) return _thumbCache[key];
  _rig = _rig || makeHandSculpt({}).rig;
  const pad = new THREE.Vector3(0.016, -0.0072, 0);       // the pad's underside, in the t3 frame
  const i2 = _rig.index.t2, i3 = _rig.index.t3, J2 = new THREE.Vector3(), M3 = new THREE.Vector3(0.009, 0, 0);
  const err = (a, b, c) => {
    const o = { ...over, t1: { r: [over.t1.r[0], a, b] }, t2: { r: [0, 0, c] } };
    const w = _rig.pose(o);
    let e = pad.clone().applyMatrix4(w[i3]).distanceTo(target);
    J2.setFromMatrixPosition(w[i2]);
    e += Math.max(0, J2.y - frontY) * 3;
    e += Math.max(0, M3.clone().applyMatrix4(w[i3]).y - (frontY + 0.004)) * 3;
    return e;
  };
  let a = over.t1.r[1], b = over.t1.r[2], c = over.t2.r[2], step = 8, e = err(a, b, c);
  for (let it = 0; it < 400 && step > 0.01; it++) {
    let moved = false;
    for (const [da, db, dc] of [[step, 0, 0], [-step, 0, 0], [0, step, 0], [0, -step, 0], [0, 0, step], [0, 0, -step]]) {
      const e2 = err(a + da, b + db, c + dc);
      if (e2 < e) { a += da; b += db; c += dc; e = e2; moved = true; break; }
    }
    if (!moved) step *= 0.5;
  }
  if (typeof location !== 'undefined' && location.search.includes('thumbdbg')) console.error(`[thumb ${key}] err ${(e * 1000).toFixed(1)} mm  a ${a.toFixed(1)} b ${b.toFixed(1)} c ${c.toFixed(1)}`);
  return (_thumbCache[key] = { t1: [over.t1.r[0], a, b], t2: c });
}

// Per shot: { mesh: key of the base sculpt, h: build resolution, tendon, matrix (world), over(t) bone pose,
//             pale, phone: { matrix, glow(t), canvasId } }
export const STAGES = {
  // k01: 03:12, the first frame. The dark desk; the phone face up lights; a still hand at the desk edge, the ring.
  k01: {
    mesh: 'desk', tendon: 0.4,
    // the forearm along the desk edge, the hand still, fingers loosely curled toward his right
    matrix() { return ROOM_M.clone().multiply(frame(V(-0.19, ROOM.desk.top + 0.0205, -1.34), V(1, -0.04, -0.06), V(0, 1, 0), -9)); },
    over() { return STAGES.s15.over(0); },
    pale: () => 0.1,
    phone: { pos: [-0.06, ROOM.desk.top, -1.6], yaw: 6, canvas: 'phone-lin', glow: (lt, d, st) => smooth(invLerp(st.cues.deskLight - 0.02, st.cues.deskLight + 0.12, st.tr)), useCanvasGlow: true },
  },
  // k05: 02:30. The phone in his left hand, his thumb comes down on 执行关停.
  k05: {
    mesh: 'hold', tendon: 0.7, smoothK: 0.7,
    matrix() { return K05.phone().multiply(PHONE_IN_HAND.clone().invert()); },
    over(lt, d, st) {
      const t = onTwos(st.tr);
      // the thumb hovers, then presses at CUES.killPress and stays down
      const kp = smooth(invLerp(st.cues.killPress - 0.25, st.cues.killPress + 0.04, t));
      const o = fingers({}, { i: [-10, -62, -18], m: [-11, -64, -20], r: [-12, -66, -20], l: [-14, -64, -18] }, { i: -2, m: 0, r: 2, l: 4 });
      o.hand = { r: [0, 0, 4] };
      // screen centre in hand space: the phone's back is at PHONE_IN_HAND, the screen 8 mm below it (hand −Y)
      const sc = new THREE.Vector3(0, 0.008, 0).applyMatrix4(PHONE_IN_HAND);
      // the red button (ui-v12 killScreen) is centred 54.7 % down the screen: phone-local z +0.0067 → hand −Z;
      // aimed a little below it so the thumb's bulk (2 cm above the glass) doesn't hide the button in the oblique view
      const btn = sc.clone().add(V(-0.004, 0, -0.013));
      const front = sc.y - 0.009;          // the thumb's joints stay this far in front of the glass
      const up = solveThumb('up', { ...o, t1: { r: [-6, 30, -30] }, t2: { r: [0, 0, 10] }, t3: { r: [0, 0, -8] } }, btn.clone().add(V(-0.008, -0.02, -0.004)), front - 0.006);
      const dn = solveThumb('dn', { ...o, t1: { r: [-6, 30, -30] }, t2: { r: [0, 0, 10] }, t3: { r: [0, 0, -24] } }, btn.clone().add(V(0.0, -0.0004, 0.0)), front);
      o.t1 = { r: up.t1.map((v, i) => lerp(v, dn.t1[i], kp)) };
      o.t2 = { r: [0, 0, lerp(up.t2, dn.t2, kp)] };
      o.t3 = { r: [0, 0, lerp(-8, -24, kp)] };
      return o;
    },
    pale: (lt, d, st) => 0.15 + 0.4 * smooth(invLerp(st.cues.killPress, st.cues.killPress + 0.3, st.tr)),
    phone: { inHand: true, canvas: 'phone-lin', glow: () => 1 },
  },
  // s02: 08:57, the meeting table. Forearm along the edge, the watch face up; the fingers tense as the pulse climbs.
  s02: {
    mesh: 'rest', tendon: 0.85, smoothK: 0.45,
    matrix() {
      const T = meetTable();
      return frame(V(T.x - 0.24, T.top + 0.0205, T.edgeZ - 0.06), V(0.906, -0.03, -0.423), V(0, 1, 0), -7);
    },
    over(lt, d) {
      const k = smooth(invLerp(0.3, d - 0.4, onTwos(lt)));           // tension builds through the shot
      const t = onTwos(lt);
      const o = fingers({}, {
        i: [lerp(-6, -2, k) + tw(t, 1, 0.5 * k), lerp(-16, -34, k), lerp(-9, -24, k)],
        m: [lerp(-8, -4, k) + tw(t, 2, 0.5 * k), lerp(-20, -40, k), lerp(-12, -28, k)],
        r: [lerp(-10, -6, k), lerp(-24, -44, k), lerp(-14, -30, k)],
        l: [lerp(-12, -8, k), lerp(-28, -48, k), lerp(-16, -32, k)],
      }, { i: lerp(-6, -8, k), m: lerp(-1, -2, k), r: lerp(4, 5, k), l: lerp(9, 12, k) });
      o.hand = { r: [0, 26, lerp(-6, -1, k)] };
      o.t1 = { r: [0, lerp(0, 6, k), lerp(0, -4, k)] };
      o.t2 = { r: [0, 0, lerp(-6, -14, k)] };
      o.t3 = { r: [0, 0, lerp(-8, -22, k)] };
      return o;
    },
    pale: (lt, d) => 0.15 + 0.35 * smooth(invLerp(0.3, d, lt)),
  },
  // s15: 03:12, his desk. Forearm resting along the desk edge, the phone face up beyond it lights with 安's message.
  s15: {
    mesh: 'desk', tendon: 0.4,
    matrix() { return ROOM_M.clone().multiply(frame(V(-0.12, ROOM.desk.top + 0.0205, -1.385), V(1, -0.04, 0.06), V(0, 1, 0), -9)); },
    over(lt) {
      const t = onTwos(lt);
      const twitch = smooth(invLerp(1.5, 1.75, t)) * (1 - smooth(invLerp(2.1, 2.6, t)));   // the index finger lifts when the phone lights
      const o = fingers({}, {
        i: [-12 + 10 * twitch, -36 + 8 * twitch, -22], m: [-14, -40, -24], r: [-16, -44, -26], l: [-18, -46, -26],
      }, { i: -1, m: 0, r: 1, l: 2 });
      o.hand = { r: [0, 0, -5] };
      o.t2 = { r: [0, 0, -6] }; o.t3 = { r: [0, 0, -10] };
      return o;
    },
    pale: () => 0.1,
    phone: { pos: [-0.05, ROOM.desk.top, -1.56], yaw: -8, canvas: 'phone-lin', glow: (lt, d, st) => smooth(invLerp(st.cues.pulse - 0.05, st.cues.pulse + 0.2, st.tr)) },
  },
  // s18: the watch rolls 03:12 → 08:59 (same pose as s15, a still hand)
  s18: {
    mesh: 'desk', tendon: 0.4,
    matrix() { return STAGES.s15.matrix(); },
    over() { return STAGES.s15.over(0); },
    pale: () => 0.1,
    phone: { pos: [-0.05, ROOM.desk.top, -1.56], yaw: -8, canvas: 'phone-lin', glow: () => 0 },
  },
  // s21: 「……没有。」 He grips the table edge: palm over the edge, fingers clawing the top, thumb hooked under, knuckles white.
  s21: {
    mesh: 'grip', tendon: 1.0, smoothK: 0.6,
    matrix() {
      const T = meetTable();
      return frame(V(T.x - 0.17, T.top + 0.026, T.edgeZ - 0.012), V(0.1, 0.17, -1), V(0, 1, 0.17), -4);
    },
    over(lt, d) {
      const t = onTwos(lt);
      const k = smooth(invLerp(0.0, 0.6, t));
      const tr = (s) => tw(t, s, 0.7);
      const o = fingers({}, {
        i: [lerp(2, 6, k) + tr(3), lerp(-60, -72, k), lerp(-30, -38, k)],
        m: [lerp(0, 4, k) + tr(4), lerp(-62, -74, k), lerp(-30, -38, k)],
        r: [lerp(-2, 2, k) + tr(5), lerp(-62, -74, k), lerp(-30, -38, k)],
        l: [lerp(-4, 0, k) + tr(6), lerp(-60, -72, k), lerp(-28, -36, k)],
      }, { i: -3, l: 5 });
      o.hand = { r: [tr(7) * 0.5, 0, lerp(2, 5, k) + tr(8) * 0.5] };
      o.t1 = { r: [6, 4, -24] };
      o.t2 = { r: [0, 0, -12] };
      o.t3 = { r: [0, 0, -14] };
      return o;
    },
    pale: (lt) => 0.6 + 0.4 * smooth(invLerp(0.0, 0.8, lt)),
  },
};

// the sculpt each mesh key is built from (base pose = the shot's pose at lt = 0 / its tension peak)
export const MESHES = {
  rest: { tendon: 0.85, veins: 1, knuckle: 1.15, pose: () => STAGES.s02.over(1.3, 2.6) },
  desk: { tendon: 0.4, pose: () => STAGES.s15.over(0) },
  flat: { tendon: 0.45, veins: 0.6, pose: () => STAGES.k01.over() },
  hold: { tendon: 0.7, veins: 0.8, knuckle: 1.05, pose: () => STAGES.k05.over(0, 2.4, { tr: 32.5, cues: { killPress: 32.5 } }) },
  grip: { tendon: 1.0, veins: 1.2, knuckle: 1.1, pose: () => STAGES.s21.over(1.0, 3.2) },
};
