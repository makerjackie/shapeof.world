// Cameras and looks for the city department's shots: s26 (out of the meeting room, over the CBD, 安's view) and
// s27–s30 (the data city breathing behind the end texts). Times are real film seconds (st.tr; no stamps after 86.4 s).
import * as THREE from 'three';
import { smooth, invLerp, clamp } from '../util.js';

const T0 = 113.0;   // s26 start
// s26: start in the room beside the LED wall, between two window fins (x −4.5 / −3); push through the glass, rise over
// the CBD and tilt down as the rings spread; 安's last wave as we reach the top.
const S26 = [
  // [t, pos, look, fov]
  [113.0, [-5.25, 151.7, -1.2], [-5.4, 151.2, -60], 46],
  [114.0, [-5.25, 151.75, -5.2], [-5.0, 150.6, -80], 47],
  [114.9, [-5.0, 152.6, -11.0], [-3.5, 146, -120], 48],
  [116.0, [-2.8, 178, -46], [-0.5, 92, -460], 51],
  [117.5, [-0.6, 255, -118], [0, 22, -800], 53],
  [119.5, [0, 430, -220], [0, -40, -1120], 55],
  [122.0, [0, 640, -320], [0, -90, -1520], 56],
];
// s27–s30: one continuous slow drift deeper into the data city (122 → 143.6)
const END = [
  [122.0, [0, 640, -320], [0, -90, -1520], 56],
  [128.0, [30, 590, -560], [20, -90, -1760], 56],
  [136.0, [80, 500, -900], [50, -80, -2080], 55],
  [143.6, [130, 420, -1200], [80, -70, -2380], 54],
];

// Catmull-Rom through the keys (position, look target and fov)
function camAt(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return { pos: keys[0][1], look: keys[0][2], fov: keys[0][3] };
  if (t >= keys[n - 1][0]) return { pos: keys[n - 1][1], look: keys[n - 1][2], fov: keys[n - 1][3] };
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]);
  const cr = (a, b, c, d) => {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  };
  const v3 = (j) => [0, 1, 2].map((c) => cr(k0[j][c], k1[j][c], k2[j][c], k3[j][c]));
  return { pos: v3(1), look: v3(2), fov: cr(k0[3], k1[3], k2[3], k3[3]) };
}

// warp the s26 clock: a held beat in the room, then the glide out
function s26Clock(tr) {
  const a = clamp((tr - T0) / 9);
  const w = a < 0.3 ? 0.3 * Math.pow(a / 0.3, 1.6) : a;
  return T0 + w * 9;
}

export const CAMS = {
  s26: (lt, d, t, st) => {
    const c = camAt(S26, s26Clock(st.tr));
    return { pos: c.pos, look: c.look, fov: c.fov, near: 0.12, far: 9000 };
  },
};
for (const id of ['s27', 's28', 's29', 's30']) {
  CAMS[id] = (lt, d, t, st) => {
    const c = camAt(END, st.tr);
    return { pos: c.pos, look: c.look, fov: c.fov, near: 0.5, far: 9000 };
  };
}

const hex = (c) => '#' + c.getHexString();
const cA = new THREE.Color(), cB = new THREE.Color();
const mixHex = (a, b, k) => hex(cA.set(a).lerp(cB.set(b), clamp(k)));

// one continuous grade over s26–s30: morning until 安's last wave, then the dark data view, dimming under the texts
function cityLook(tr) {
  const k = smooth(invLerp(118.9, 121.4, tr));          // day → data
  const dim = smooth(invLerp(122.0, 124.5, tr));         // settle under the end texts
  const inRoom = 1 - smooth(invLerp(114.2, 115.2, tr));
  return {
    preset: 'morning', to: 'dc', k: 0.85 * k + 0.15 * dim,
    sunElev: 14, sunAz: 58,                               // the meeting room's sun (ENE, low)
    sunStrength: 1.0 - 0.8 * k,
    fogDensity: 0.00034 * (1 - k) + 0.00022 * k,
    fogWarm: mixHex('#eef3f5', '#140f12', k), fogCool: mixHex('#cfe2f2', '#05070f', k),
    exposure: 1.1 - 0.04 * k + 0.05 * inRoom - 0.1 * dim,
    bloom: 0.85 + 0.65 * k, threshold: 1.05 - 0.38 * k,
    vignette: 0.14 + 0.16 * k, grain: 0.02,
    shafts: 0.3 * (1 - k),
    paintRadius: 4,
  };
}
export const LOOKS = {};
for (const id of ['s26', 's27', 's28', 's29', 's30']) LOOKS[id] = (lt, d, t, st) => cityLook(st.tr);
