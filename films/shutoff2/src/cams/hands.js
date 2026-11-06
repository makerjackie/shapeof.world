// Cameras and looks for the Hands department's shots: s02 wrist, s15 pulse, s18 jump, s21 grip.
import * as THREE from 'three';
import { STAGES } from '../hands-stage.js';
import { PHONE } from '../room-figure.js';
import { WATCH_X, wristSection } from '../hands-rig.js';
import { ROOM, rw, rwDir, roomAz } from '../room-layout.js';
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
  // k01: the first frame. Low over the dark desk: the still hand at the edge, the phone beyond, the rain window above.
  k01: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(-0.1, lerp(1.025, 1.01, k), lerp(-0.985, -1.03, k)), look: rw(-0.095, 0.70, -1.594), fov: 50, near: 0.01 };
  },
  // k05: 02:30. Medium, from behind his right shoulder in the dark room: his silhouette at the desk by the rain
  // window, the phone small in his hands, the only light. A slow push-in through the red flood.
  k05: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(lerp(0.5, 0.42, k), lerp(1.46, 1.42, k), lerp(-0.5, -0.6, k)), look: rw(lerp(0.0, 0.02, k), lerp(1.02, 1.0, k), -1.6), fov: 46, near: 0.03 };
  },
  // close on the wrist at the table edge, from his side; the watch face reads upright
  s02: (lt, d) => {
    const w = watchFrame('s02');
    const k = smoother(lt / d);
    const dist = lerp(1.0, 0.9, k);
    const tgt = add(w.c, [w.fwd, 0.06], [w.top, 0.0]);
    const pos = [tgt.x + 0.03 * dist, tgt.y + 0.36 * dist, tgt.z + 0.25 * dist];
    return { pos, look: A(tgt), fov: 40, up: [0.12, 0, -1], near: 0.01, far: 9000 };
  },
  // 03:12: from his eyes, down at the desk: the wrist at the bottom, the phone beyond, the rain window at the top
  s15: (lt, d) => {
    const k = smoother(lt / d);
    const pos = rw(lerp(-0.092, -0.094, k), lerp(1.13, 1.09, k), lerp(-1.05, -1.11, k));
    const look = rw(-0.09, 0.77, -1.49);
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
  return { pos: rw(p.pos[0], p.pos[1] + 0.06, p.pos[2]), r: 0.42, color: '#a9c0ff', i: i * g };
};

export const LOOKS = {
  // one light: the phone. Before CUES.deskLight only the rain window's faint blue.
  k01: (lt, d, t, st) => {
    const g = smooth(invLerp(st.cues.deskLight - 0.02, st.cues.deskLight + 0.12, st.tr));
    const p = STAGES.k01.phone.pos;
    return {
      preset: 'night', sunElev: 9, sunAz: roomAz(0, -1), sunStrength: 0.14, ambient: '#05071a', fogDensity: 0.0007, rain: 0.8,
      // anime key cheat: the key comes from the phone, so the ring catches a hard glint and the hand's lit side faces it
      key: rwDir(0.22, 0.62, -0.75),
      lights: [{ pos: rw(p[0], p[1] + 0.07, p[2]), r: 0.62, color: '#b9cfff', i: 1.25 * g }],
      rainHaze: 0.85, rainBlur: 26, rainFall: 0.3, rainBokeh: 1.2, exposure: 1.05, bloom: 1.3,
    };
  },
  // 02:30: cold screen light, then at CUES.killPress the screen turns red and floods the room
  k05: (lt, d, t, st) => {
    const r = smooth(invLerp(st.cues.killPress - 0.02, st.cues.killPress + 0.12, st.tr));
    const c = new THREE.Color('#bcd0ff').lerp(new THREE.Color('#ff3326'), r);
    return {
      preset: 'night', sunElev: 10, sunAz: roomAz(0, -1), sunStrength: lerp(0.2, 0.08, r), ambient: '#04050f', fogDensity: 0.0007, rain: 0.8,
      lights: [{ pos: rw(PHONE.c.x, PHONE.c.y + 0.07, PHONE.c.z + 0.06), r: lerp(0.85, 1.7, r), color: '#' + c.getHexString(), i: lerp(0.95, 1.7, r) }],
      rainHaze: 0.72, rainBlur: 22, rainFall: 0.4, rainBokeh: 2, rainTint: '#ff2a1e', rainTintK: 0.32 * r,
      exposure: 1.05, bloom: lerp(1.2, 1.45, r), sat: lerp(1.0, 1.08, r),
    };
  },
  s02: (lt, d) => {
    const w = watchFrame('s02');
    // anime key cheat: a grazing key across the back of the hand so knuckles, tendons and veins catch the terminator
    const el = 10 * Math.PI / 180, az = 128 * Math.PI / 180;
    return { preset: 'morning', sunElev: 22, sunAz: 120, key: [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)],
      shadow: { center: A(w.c), radius: 0.4, depth: 4 }, exposure: 1.1 };
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
      // the low sun swings round so the window mullion's shadow sweeps across the wrist and watch mid-shot
      ...a, sunElev: lerp(7, 13, k), sunAz: roomAz(0, -1) + lerp(-50, -8, smooth(invLerp(0.0, d, lt))), sunStrength: lerp(0.26, 1.0, k),
      lights: [phoneLight('s18', st, 0.8)], ambient: k < 0.5 ? '#0a0d1c' : '#100c12', fogDensity: 0.0007,
      shadow: { center: A(w.c), radius: 0.4, depth: 4 },
    };
  },
  s21: (lt, d) => {
    const m = STAGES.s21.matrix();
    const hp = new THREE.Vector3(0.05, 0, 0).applyMatrix4(m);
    return { preset: 'morning', sunElev: 24, sunAz: 120, shadow: { center: A(hp), radius: 0.35, depth: 4 }, exposure: 0.94, bloom: 0.75 };
  },
};
