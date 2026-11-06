// Cameras and looks for the city department's shots (v13):
//   a03     the painted day city, a slow calm aerial drift; every screen shows 安's orb
//   s26     ONE smooth continuous move: from inside the meeting room out through the window (between two fins) and up
//           over the day city; no data transform; fades to black over the last 0.6 s
//   s27–30  the dim data city breathing behind the end texts
// All times come from SHOTS (real film seconds, st.tr). Everything is a pure function of st (k09 replays s26 frames).
import * as THREE from 'three';
import { SHOTS } from '../shots.js';
import { smooth, smoother, invLerp, clamp, lerp } from '../util.js';
const shot = (id) => SHOTS.find((x) => x.id === id) || { start: 0, end: 1 };

// ---- a smooth path: a Catmull-Rom (centripetal-ish, uniform here) through control points, walked by arc length, so the
// speed along it is exactly what the easing says — no kinks where the control points are unevenly spaced.
function makePath(pts) {
  const P = pts.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const N = 600;
  const samples = curve.getSpacedPoints(N);   // equal arc-length steps
  return (u) => {
    const x = clamp(u) * N, i = Math.min(N - 1, Math.floor(x)), f = x - i;
    const a = samples[i], b = samples[i + 1];
    return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f];
  };
}

// ---- a03: a calm aerial drift toward the CBD from the south-east, the HQ standing left of centre
const A03_POS = makePath([[930, 430, 1130], [880, 418, 1060], [830, 406, 990]]);
const A03_LOOK = makePath([[-180, 235, -520], [-175, 230, -505], [-170, 225, -490]]);

// ---- s26: beside the LED wall (x −5.25, between the sun-blade fins at −6 and −4.5), straight out through the glass,
// then a long rising curve over the CBD. Positions and look targets walk their paths with the same eased progress.
const S26_POS = makePath([
  [-5.25, 151.7, -1.0], [-5.25, 151.72, -4.0], [-5.25, 151.8, -6.6], [-5.25, 152.0, -8.6],   // dead straight through the fins
  [-5.0, 154.5, -16], [-4.0, 166, -40], [-1.5, 196, -88], [0, 248, -150], [0, 300, -215],
]);
const S26_LOOK = makePath([
  [-5.3, 151.5, -60], [-5.2, 151.0, -90], [-4.6, 149.0, -140], [-3.2, 140, -230],
  [-1.5, 118, -360], [0, 92, -520], [0, 70, -700], [0, 52, -860],
]);
// progress over the shot: a long gentle ease-in (the room, the glass), steady flight, a soft ease-out
function s26Progress(a) {
  // integrate a smooth speed profile: speed(a) = smoothstep(0, 0.42, a) * (1 - 0.6 * smoothstep(0.75, 1, a))
  const S = (x) => {
    const n = 64;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * x;
      acc += smooth(t / 0.42) * (1 - 0.6 * smooth((t - 0.75) / 0.25));
    }
    return (acc / n) * x;
  };
  return S(clamp(a)) / S(1);
}

export const CAMS = {
  a03: (lt, d, t, st) => {
    const S = shot('a03');
    const u = smooth(invLerp(S.start - 0.5, S.end + 0.5, st.tr));
    return { pos: A03_POS(u), look: A03_LOOK(u), fov: 50, near: 2.0, far: 9000 };
  },
  s26: (lt, d, t, st) => {
    const S = shot('s26');
    const p = s26Progress((st.tr - S.start) / (S.end - S.start));
    const pos = S26_POS(p);
    // a short near plane while inside the room and the fins, a longer one over the city (depth precision)
    const near = pos[2] > -12 ? 0.1 : Math.min(2.0, 0.1 + (-12 - pos[2]) * 0.05);
    return { pos, look: S26_LOOK(p), fov: lerp(47, 52, smoother(p)), near, far: 9000 };
  },
};

// s27–s30: one continuous slow push toward the HQ over the breathing data city
const END_POS = makePath([[-1500, 680, -900], [-1380, 640, -865], [-1260, 600, -830], [-1020, 525, -770]]);
const END_LOOK = makePath([[260, 245, -60], [170, 250, -120], [89, 255, -175], [-150, 265, -260]]);
for (const id of ['s27', 's28', 's29', 's30']) {
  CAMS[id] = (lt, d, t, st) => {
    const u = invLerp(shot('s27').start, shot('s30').end, st.tr);
    return { pos: END_POS(u), look: END_LOOK(u), fov: lerp(56, 52, u), near: 2.0, far: 9000 };
  };
}

const hex = (c) => '#' + c.getHexString();
const cA = new THREE.Color(), cB = new THREE.Color();
const mixHex = (a, b, k) => hex(cA.set(a).lerp(cB.set(b), clamp(k)));

// the morning look (a03, s26): the meeting room's low ENE sun; s26 fades to black over its last 0.6 s
function dayLook(tr) {
  const S = shot('s26');
  const inS26 = tr >= S.start - 0.01 && tr < S.end + 0.01;
  const fade = inS26 ? smooth(invLerp(S.end - 0.6, S.end, tr)) : 0;
  const inRoom = inS26 ? 1 - smooth(invLerp(S.start + 1.2, S.start + 2.6, tr)) : 0;
  return {
    preset: 'morning', to: 'dc', k: fade,
    sunElev: 14, sunAz: 58,
    sunStrength: 1.0,
    fogDensity: 0.00027,
    fogWarm: '#e6eef3', fogCool: '#c2d8ec',
    exposure: (1.1 + 0.05 * inRoom) * (1 - fade),
    bloom: 0.85 * (1 - fade), threshold: 1.05,
    vignette: 0.14 + 0.3 * fade, grain: 0.02 * (1 - fade),
    shafts: 0.3 * (1 - fade),
    paintRadius: 4,
  };
}
// the data look (s27–s30): dark, amber, dimmed under the end texts
function dataLook(tr) {
  const E1 = shot('s27').start;
  const dim = smooth(invLerp(E1, E1 + 2.5, tr));
  return {
    preset: 'morning', to: 'dc', k: 0.85 + 0.15 * dim,
    sunElev: 14, sunAz: 58, sunStrength: 0.2,
    fogDensity: 0.00013, fogWarm: '#140f12', fogCool: '#05070f',
    exposure: 1.06 - 0.1 * dim,
    bloom: 1.5, threshold: 0.67,
    vignette: 0.3, grain: 0.02,
    shafts: 0, paintRadius: 4,
  };
}
export const LOOKS = {
  a03: (lt, d, t, st) => dayLook(st.tr),
  s26: (lt, d, t, st) => dayLook(st.tr),
};
for (const id of ['s27', 's28', 's29', 's30']) LOOKS[id] = (lt, d, t, st) => dataLook(st.tr);
