// Cameras and looks for the Hands department's shots: s02 wrist, s15 pulse, s18 jump, s21 grip.
import * as THREE from 'three';
import { STAGES } from '../hands-stage.js';
import { WATCH_X, wristSection } from '../hands-rig.js';
import { ROOM, rw, roomAz } from '../room-layout.js';
import { smooth, smoother, invLerp, lerp } from '../util.js';

const _m = new THREE.Matrix4();
// the watch face in world space: centre, face normal (n), 12 o'clock direction (top), finger direction (fwd)
function watchFrame(sid) {
  _m.copy(STAGES[sid].matrix());
  const b = wristSection(WATCH_X).b;
  const c = new THREE.Vector3(WATCH_X, b + 0.011, 0).applyMatrix4(_m);
  const e = _m.elements;
  const fwd = new THREE.Vector3(e[0], e[1], e[2]).normalize();
  const n = new THREE.Vector3(e[4], e[5], e[6]).normalize();
  const top = new THREE.Vector3(-e[8], -e[9], -e[10]).normalize();
  return { c, n, top, fwd };
}
const A = (v) => [v.x, v.y, v.z];
const add = (c, ...terms) => { const v = c.clone(); for (const [d, k] of terms) v.addScaledVector(d, k); return v; };

export const CAMS = {
  // close on the wrist at the table edge, from his side; the watch face reads upright
  s02: (lt, d) => {
    const w = watchFrame('s02');
    const k = smoother(lt / d);
    const dist = lerp(1.0, 0.9, k);
    const tgt = add(w.c, [w.fwd, 0.075], [w.top, 0.045]);
    const pos = [tgt.x + 0.03 * dist, tgt.y + 0.36 * dist, tgt.z + 0.25 * dist];
    return { pos, look: A(tgt), fov: 40, up: [0.12, 0, -1], near: 0.01, far: 9000 };
  },
  // 03:12: from his eyes, down at the desk: the wrist at the bottom, the phone beyond, the rain window at the top
  s15: (lt, d) => {
    const k = smoother(lt / d);
    const pos = rw(lerp(-0.11, -0.115, k), lerp(1.12, 1.08, k), lerp(-1.06, -1.12, k));
    const look = rw(-0.1, 0.77, -1.49);
    return { pos, look, fov: 40, near: 0.01 };
  },
  // macro on the watch face while the night turns to morning
  s18: (lt, d) => {
    const w = watchFrame('s18');
    const k = smoother(lt / d);
    const dist = lerp(1.0, 0.9, k);
    const pos = add(w.c, [w.n, 0.25 * dist], [w.top, -0.085 * dist], [w.fwd, -0.004]);
    return { pos: A(pos), look: A(add(w.c, [w.top, -0.006])), fov: 30, up: A(w.top), near: 0.01 };
  },
  // the hand gripping the table edge, low and close, from his left
  s21: (lt, d) => {
    const m = STAGES.s21.matrix();
    const hp = new THREE.Vector3(0.06, 0.0, 0.0).applyMatrix4(m);
    const k = smoother(lt / d);
    const pos = [hp.x - lerp(0.16, 0.145, k), hp.y + lerp(0.2, 0.185, k), hp.z - lerp(0.32, 0.29, k)];
    return { pos, look: [hp.x, hp.y - 0.015, hp.z + 0.01], fov: 36, near: 0.01 };
  },
};

const phoneLight = (sid, st, i) => {
  const p = STAGES[sid].phone;
  const g = p.glow(st.lt, st.dur, st);
  return { pos: rw(p.pos[0], p.pos[1] + 0.06, p.pos[2]), r: 0.55, color: '#a9c0ff', i: i * g };
};

export const LOOKS = {
  s02: (lt, d) => {
    const w = watchFrame('s02');
    return { preset: 'morning', sunElev: 22, sunAz: 120, shadow: { center: A(w.c), radius: 0.35, depth: 4 }, exposure: 1.1 };
  },
  s15: (lt, d, t, st) => {
    const w = watchFrame('s15');
    return {
      preset: 'night', sunElev: 10, sunAz: roomAz(0, -1), sunStrength: 0.26,
      lights: [phoneLight('s15', st, 0.8)],
      ambient: '#0a0d1c', fogDensity: 0.0007,
      shadow: { center: A(w.c), radius: 0.45, depth: 4 },
    };
  },
  s18: (lt, d, t, st) => {
    const w = watchFrame('s18');
    const k = smooth(invLerp(0.15, d - 0.15, lt));
    // night → dawn → morning: blue, a rose-gold pass, then clean high-key gold-white
    const a = k < 0.55 ? { preset: 'night', to: 'dawn', k: k / 0.55 } : { preset: 'dawn', to: 'morning', k: (k - 0.55) / 0.45 };
    return {
      ...a, sunElev: lerp(6, 14, k), sunAz: roomAz(0, -1) + lerp(-6, 34, k), sunStrength: lerp(0.26, 1.0, k),
      lights: [phoneLight('s18', st, 0.8)], ambient: k < 0.5 ? '#0a0d1c' : '#100c12', fogDensity: 0.0007,
      shadow: { center: A(w.c), radius: 0.35, depth: 4 },
    };
  },
  s21: (lt, d) => {
    const m = STAGES.s21.matrix();
    const hp = new THREE.Vector3(0.05, 0, 0).applyMatrix4(m);
    return { preset: 'morning', sunElev: 24, sunAz: 120, shadow: { center: A(hp), radius: 0.35, depth: 4 }, exposure: 1.06 };
  },
};
