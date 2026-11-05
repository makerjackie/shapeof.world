// Cameras and looks for the city department's shots: s26 (out of the meeting room, over the CBD, 安's view) and
// s27–s30 (the data city breathing behind the end texts). All times are relative to the CUES (real film seconds,
// st.tr), so a retime of the cut moves everything with it.
import * as THREE from 'three';
import { CUES } from '../shots.js';
import { smooth, invLerp, clamp } from '../util.js';

// s26: start in the room beside the LED wall, between two window fins (x −6 / −4.5); push through the glass, rise over
// the CBD and tilt down as the rings spread; 安's last wave as we reach the top.   [dt from cityOut, pos, look, fov]
const S26 = [
  [0.0, [-3.3, 151.85, 3.6], [-4.7, 151.35, -40], 48],
  [1.2, [-4.9, 151.8, -3.0], [-5.0, 150.9, -70], 48],
  [2.0, [-5.2, 152.3, -9.5], [-3.8, 146.5, -120], 49],
  [3.2, [-10, 185, -60], [-40, 90, -520], 51],        // rising over the CBD, looking north
  [4.6, [-250, 300, -230], [-100, 40, -900], 53],     // drifting north-west as the screens flip
  [6.2, [-800, 470, -520], [100, 80, -800], 54],      // the orbit begins: 安's HQ swings into frame
  [7.6, [-1250, 600, -760], [200, 190, -300], 55],
  [9.0, [-1500, 680, -900], [260, 245, -60], 56],     // the HQ (right third, clear of the end texts), its links to every screen
];
// s27–s30: one continuous slow push toward the HQ over the breathing data city   [fraction of end1 → title2, ...]
const END = [
  [0.0, [-1500, 680, -900], [260, 245, -60], 56],
  [0.25, [-1380, 640, -865], [170, 250, -120], 55],   // the HQ eases to the right edge of the safe area, clear of the texts
  [0.5, [-1260, 600, -830], [89, 255, -175], 54],
  [1.0, [-1020, 525, -770], [-150, 265, -260], 52],
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

// warp the s26 clock: a held beat in the room, then the glide out (9 s of keys over the shot's length)
function s26Clock(tr) {
  const D = CUES.end1 - CUES.cityOut;
  const a = clamp((tr - CUES.cityOut) / D);
  const w = a < 0.3 ? 0.3 * Math.pow(a / 0.3, 1.6) : a;
  return w * 9;
}

export const CAMS = {
  s26: (lt, d, t, st) => {
    const k = s26Clock(st.tr);
    const c = camAt(S26, k);
    // a short near plane inside the room, a long one over the city (depth precision for the far skyline)
    const near = k < 2.4 ? 0.12 : Math.min(2.0, 0.12 + (k - 2.4) * 2.0);
    return { pos: c.pos, look: c.look, fov: c.fov, near, far: 9000 };
  },
};
for (const id of ['s27', 's28', 's29', 's30']) {
  CAMS[id] = (lt, d, t, st) => {
    const c = camAt(END, invLerp(CUES.end1, CUES.title2, st.tr));
    return { pos: c.pos, look: c.look, fov: c.fov, near: 2.0, far: 9000 };
  };
}

const hex = (c) => '#' + c.getHexString();
const cA = new THREE.Color(), cB = new THREE.Color();
const mixHex = (a, b, k) => hex(cA.set(a).lerp(cB.set(b), clamp(k)));

// one continuous grade over s26–s30: morning until 安's last wave, then the dark data view, dimming under the texts
export function cityLook(tr) {
  const D = CUES.cityData;
  const k = smooth(invLerp(D + 2.2, D + 3.9, tr));                 // day → data, in step with 安's sweep reaching the far city
  const dim = smooth(invLerp(CUES.end1, CUES.end1 + 2.5, tr));       // settle under the end texts
  const inRoom = 1 - smooth(invLerp(CUES.cityOut + 1.2, CUES.cityOut + 2.2, tr));
  return {
    preset: 'morning', to: 'dc', k: 0.85 * k + 0.15 * dim,
    sunElev: 14, sunAz: 58,                               // the meeting room's sun (ENE, low)
    sunStrength: 1.0 - 0.8 * k,
    fogDensity: 0.00027 * (1 - k) + 0.00013 * k,
    fogWarm: mixHex('#e6eef3', '#140f12', k), fogCool: mixHex('#c2d8ec', '#05070f', k),
    exposure: 1.1 - 0.04 * k + 0.05 * inRoom - 0.1 * dim,
    bloom: 0.85 + 0.65 * k, threshold: 1.05 - 0.38 * k,
    vignette: 0.14 + 0.16 * k, grain: 0.02,
    shafts: 0.3 * (1 - k),
    paintRadius: 4,
  };
}
export const LOOKS = {};
for (const id of ['s26', 's27', 's28', 's29', 's30']) LOOKS[id] = (lt, d, t, st) => cityLook(st.tr);
