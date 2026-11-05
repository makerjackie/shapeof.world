import * as THREE from 'three';
import { blob, sweep, sm, mix, clamp } from './people-geo.js';
import { buildPerson, hairShellFor } from './people.js';

// The cast: six committee members (the chair + five) and 林工 (seen from behind).
// Hair is the silhouette: each style is a shell over the cranium with a pointed-lock hem (see people.js hairShell).

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const wrapPi = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

// tapered strand from a list of points (head space)
function strand(pts, w, t = 0.006, p = 1.3) {
  return sweep(pts, (u) => [Math.max(w * (1 - Math.pow(u, p)), 0.0005), Math.max(t * (1 - u * 0.8), 0.0005)], { nu: 8, nv: 16, e: 1.7, up: [0, 0, 1] });
}

export const CAST = {
  // 主持人: navy suit, white shirt, deep red tie, rectangular glasses, neat side part
  chair: {
    name: 'chair', sex: 'm', scale: 1.0, width: 1.0, glasses: 'rect',
    colors: { suit: '#36405f', lapel: '#323b58', shirt: '#f3f4f7', tie: '#8a2a38', skin: '#ecc8ab', hair: '#2b2a31', frame: '#1f2026', legs: '#323b58' },
    hair: (H) => [hairShellFor(H, {
      hem: [[0, 0.98], [0.55, 1.04], [1.0, 1.3], [1.35, 1.36], [1.6, 1.4], [1.95, 1.72], [2.5, 1.98], [Math.PI, 2.06]],
      thick: (s, ph) => (0.011 + 0.011 * (1 - s * s) + 0.012 * Math.max(Math.cos(ph), 0) * sm(0.5, 0.95, s)) * (1 - 0.85 * sm(0.9, 1.0, s) * (1 - Math.max(Math.cos(ph), 0))),
      part: 0.75, locks: 16, jag: 0.05, jagMask: (ph) => Math.max(Math.cos(ph), 0) ** 2,
      warp: (p, ph, s) => { p.x -= 0.006 * sm(0.4, 1, s) * Math.max(Math.cos(ph), 0); },  // swept to the right
    })],
  },
  // 张主任: senior, white swept-back hair, round gold glasses, charcoal suit, light blue shirt; stocky
  zhang: {
    name: 'zhang', sex: 'm', scale: 0.98, width: 1.07, belly: 0.7, glasses: 'round', age: true, shine: 1.06,
    colors: { suit: '#4a4d58', lapel: '#444752', shirt: '#d3e2f3', tie: '#56688c', skin: '#e4bd9f', hair: '#eceef3', frame: '#b39a62', legs: '#444752' },
    hair: (H) => [hairShellFor(H, {
      hem: [[0, 0.72], [0.35, 0.68], [0.7, 0.98], [1.05, 1.2], [1.4, 1.38], [1.65, 1.44], [2.0, 1.72], [2.6, 1.96], [Math.PI, 2.02]],
      thick: (s, ph) => (0.009 + 0.012 * (1 - s) + 0.006 * sm(0.3, 0.9, Math.abs(Math.sin(ph)))) * (1 - 0.9 * sm(0.88, 1.0, s)),
      locks: 22, jag: 0.03, lockPhase: 0.25,
      warp: (p, ph, s) => { p.z -= 0.006 * (1 - s); },
    })],
  },
  // woman, black bob with side-swept bangs, cream blazer over a dark blouse
  bob: {
    name: 'bob', sex: 'f', scale: 0.95, width: 0.98,
    colors: { suit: '#ddd3c3', lapel: '#d4c9b8', shirt: '#2e3345', skin: '#f0ceb6', hair: '#1f1e25', legs: '#2e3345', button: '#b9ad99' },
    hair: (H) => [hairShellFor(H, {
      hem: [[0, 1.2], [0.3, 1.18], [0.55, 1.4], [0.8, 2.05], [1.2, 2.32], [1.8, 2.36], [2.5, 2.3], [Math.PI, 2.26]],
      hemR: [[0, 1.14], [0.3, 1.25], [0.55, 1.55], [0.8, 2.1], [1.2, 2.34], [1.8, 2.36], [2.5, 2.3], [Math.PI, 2.26]],
      thick: (s, ph) => 0.014 + 0.012 * (1 - s) + 0.008 * sm(0.55, 0.95, s),
      skirt: { flare: 0.1, drop: 0.115, curl: 0.07 }, locks: 18, jag: 0.09, lockPhase: 0.1,
      warp: (p, ph, s) => { const f = Math.max(Math.cos(ph), 0); p.x += 0.012 * f * sm(0.5, 1, s); p.z += 0.004 * f * sm(0.6, 1, s); },
    })],
  },
  // woman, dark brown hair in a high bun, near-black blazer, ivory blouse
  bun: {
    name: 'bun', sex: 'f', scale: 0.97, width: 0.95,
    colors: { suit: '#2c2f3a', lapel: '#282b35', shirt: '#f4efe8', skin: '#eecbb0', hair: '#3b2c27', legs: '#2c2f3a', button: '#c8c2b8' },
    hair: (H) => [hairShellFor(H, {
      hem: [[0, 1.02], [0.5, 1.08], [1.0, 1.3], [1.5, 1.45], [2.0, 1.78], [2.6, 2.05], [Math.PI, 2.1]],
      thick: (s) => (0.006 + 0.006 * (1 - s)) * (1 - 0.7 * sm(0.9, 1, s)),
      part: 0.0, locks: 24, jag: 0.02,
    })],
    hairExtra: (H) => {
      const c = '#3b2c27';
      const bun = blob((d) => {
        const r = 0.043 * (1 + 0.06 * Math.sin(Math.atan2(d.x, d.z) * 5 + d.y * 6));
        return new V(d.x * r * 1.05, d.y * r * 0.85, d.z * r * 0.95);
      }, 14, 22).translate(0, H.B * 0.82, -H.C * 0.55);
      const tie = new THREE.TorusGeometry(0.03, 0.006, 6, 18).rotateX(1.0).translate(0, H.B * 0.72, -H.C * 0.46);
      const s1 = strand([[H.A * 0.82, H.B * 0.25, H.C * 0.55], [H.A * 0.95, -H.B * 0.1, H.C * 0.55], [H.A * 0.9, -H.B * 0.55, H.C * 0.5]], 0.012, 0.004);
      const s2 = strand([[-H.A * 0.82, H.B * 0.25, H.C * 0.55], [-H.A * 0.97, -H.B * 0.15, H.C * 0.5], [-H.A * 0.92, -H.B * 0.6, H.C * 0.42]], 0.011, 0.004);
      return [[bun, c], [tie, '#1a1a20'], [s1, c], [s2, c]];
    },
  },
  // younger man, textured top with an undercut, mid-grey suit, black knit top (no tie)
  young: {
    name: 'young', sex: 'm', scale: 1.02, width: 0.95,
    colors: { suit: '#666d7d', lapel: '#5f6676', shirt: '#22252d', skin: '#ebc6a8', hair: '#25242b', legs: '#3c404a' },
    hair: (H) => [
      hairShellFor(H, {
        hem: [[0, 1.0], [0.6, 1.1], [1.1, 1.35], [1.6, 1.5], [2.1, 1.8], [2.7, 2.0], [Math.PI, 2.05]],
        thick: () => 0.0035, locks: 30, jag: 0.0,
      }),
      hairShellFor(H, {
        hem: [[0, 1.3], [0.4, 1.22], [0.8, 1.02], [1.3, 0.92], [1.9, 0.98], [2.5, 1.2], [Math.PI, 1.3]],
        thick: (s, ph) => 0.02 + 0.016 * (1 - s) + 0.01 * Math.max(Math.cos(ph), 0),
        locks: 11, jag: 0.2, lockPhase: 0.37,
        warp: (p, ph, s) => { const f = Math.max(Math.cos(ph), 0); p.y += 0.004 * (1 - s); p.z += 0.01 * f * sm(0.6, 1, s); p.x += 0.008 * f * sm(0.5, 1, s); },
      }),
    ],
  },
  // heavy-set man, balding crown with a short horseshoe of hair, dark suit, white shirt, navy tie
  heavy: {
    name: 'heavy', sex: 'm', scale: 1.0, width: 1.13, belly: 1.0, age: true,
    colors: { suit: '#2d3038', lapel: '#2a2c34', shirt: '#f1f1f3', tie: '#3f5180', skin: '#dcb192', hair: '#3a3a41', legs: '#2a2c34' },
    hair: (H) => [hairShellFor(H, {
      top: [[0, 1.05], [0.8, 1.0], [1.5, 0.95], [2.3, 0.82], [Math.PI, 0.78]],
      hem: [[0, 1.05], [0.8, 1.2], [1.2, 1.38], [1.6, 1.46], [2.1, 1.76], [2.7, 1.98], [Math.PI, 2.02]],
      thick: (s) => 0.006 * (1 - 0.8 * sm(0.85, 1, s)) * (0.4 + 0.6 * sm(0.0, 0.15, s)),
      locks: 26, jag: 0.0,
      cut: (ph) => Math.abs(wrapPi(ph)) < 0.85,   // no hair over the forehead
    })],
  },
  // 林工 (from behind): light grey-blue shirt, no jacket, messy black hair longer at the nape
  lin: {
    name: 'lin', sex: 'm', scale: 1.0, width: 0.97, top: 'shirt',
    colors: { suit: '#c4cedd', shirt: '#c4cedd', shirt2: '#b6c1d2', skin: '#e9c4a6', hair: '#1c1c22', legs: '#2c3039', shoe: '#2a2a30' },
    hair: (H) => [hairShellFor(H, {
      hem: [[0, 1.22], [0.5, 1.28], [1.0, 1.45], [1.5, 1.62], [2.0, 1.95], [2.6, 2.18], [Math.PI, 2.22]],
      thick: (s, ph) => 0.018 + 0.014 * (1 - s),
      locks: 15, jag: 0.16, lockPhase: 0.2,
      warp: (p, ph, s) => { p.z -= 0.006 * sm(0.7, 1, s) * Math.max(-Math.cos(ph), 0); },
    })],
  },
};

export function buildCast() {
  const out = {};
  for (const [id, spec] of Object.entries(CAST)) out[id] = buildPerson(spec);
  return out;
}
