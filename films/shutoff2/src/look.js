import * as THREE from 'three';
import { G } from './glsl.js';
import { ENV } from './passes-env.js';
import { deg } from './util.js';

// Colour script for 关不掉:
//   night    — 01:40–03:12 in 林工's room and the city in rain: deep ultramarine, violet shadows, cold screen light,
//              warm sodium/neon accents. 安's colour is amber (#ffb547) everywhere.
//   dc       — the data centre: near-black teal, rows of LEDs, amber when 安 moves.
//   dawn     — the night turning: violet → rose → gold.
//   morning  — 08:57 the review: high-key anime daylight, white and pale blue, sun pouring in. The scariest moment
//              happens in the brightest light.
export const PRESETS = {
  night: {
    sunColor: '#8a98e0', sunStrength: 0.42, skyTint: '#46518a', shadeTint: '#272c58', deepTint: '#14163a', bounce: '#3b3266', ambient: '#0a0c1c',
    fog: { warm: '#3b3458', cool: '#1c2347', density: 0.0016, mist: 0.0, mistHeight: 8 },
    grade: { lift: '#04050e', gain: '#e9edff', sat: 1.06, exposure: 1.0, gamma: 0.95, bloom: 1.15, threshold: 0.85, vignette: 0.28, grain: 0.025 },
  },
  dc: {
    sunColor: '#5c80cc', sunStrength: 0.22, skyTint: '#22355e', shadeTint: '#151c38', deepTint: '#0a0e20', bounce: '#16233c', ambient: '#05070e',
    fog: { warm: '#121a30', cool: '#0b1124', density: 0.012, mist: 0.0, mistHeight: 4 },
    grade: { lift: '#020309', gain: '#e6f0ff', sat: 1.08, exposure: 1.0, gamma: 0.95, bloom: 1.3, threshold: 0.8, vignette: 0.3, grain: 0.025 },
  },
  dawn: {
    sunColor: '#ffb27c', sunStrength: 0.8, skyTint: '#c4a2cc', shadeTint: '#6a5a9e', deepTint: '#3c336e', bounce: '#e2a8a2', ambient: '#140f24',
    fog: { warm: '#f2b9a2', cool: '#8a82ba', density: 0.0009, mist: 0.0, mistHeight: 10 },
    grade: { lift: '#100b1c', gain: '#fff2e6', sat: 1.08, exposure: 1.06, gamma: 0.9, bloom: 1.0, threshold: 1.0, vignette: 0.2, grain: 0.02 },
  },
  morning: {
    sunColor: '#fff4e2', sunStrength: 1.0, skyTint: '#eef3fc', shadeTint: '#aab6e4', deepTint: '#7f88c6', bounce: '#d4ecec', ambient: '#000000',
    fog: { warm: '#f6f8f6', cool: '#dcecf6', density: 0.00035, mist: 0.0, mistHeight: 20 },
    grade: { lift: '#121830', gain: '#fffefb', sat: 1.06, exposure: 1.12, gamma: 0.84, bloom: 0.9, threshold: 1.05, vignette: 0.14, grain: 0.02 },
  },
};

const ca = new THREE.Color(), cb = new THREE.Color();
const mixC = (target, a, b, k) => target.copy(ca.set(a)).lerp(cb.set(b), k);
const mixN = (a, b, k) => a + (b - a) * k;

// look: { preset, to?, k? (blend preset → to by k), sunElev, sunAz (deg; az 0 = -Z, + toward +X),
//         lights: [{ pos:[x,y,z], r, color, i }] (≤ 6 local lights), ambient, fogDensity, fogMul, shafts,
//         exposure, bloom, threshold, vignette, grain, sat, paintRadius, inkWidth, water }
export function applyLook(ctx, look) {
  const A = PRESETS[look.preset ?? 'morning'];
  const B = PRESETS[look.to ?? look.preset ?? 'morning'];
  const k = look.to ? Math.min(1, Math.max(0, look.k ?? 0)) : 0;
  const el = deg(look.sunElev ?? 30), az = deg(look.sunAz ?? 150);
  G.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  mixC(G.uSunColor.value, A.sunColor, B.sunColor, k);
  G.uSunStrength.value = look.sunStrength ?? mixN(A.sunStrength, B.sunStrength, k);
  mixC(G.uSkyTint.value, A.skyTint, B.skyTint, k);
  mixC(G.uShadeTint.value, A.shadeTint, B.shadeTint, k);
  mixC(G.uDeepTint.value, A.deepTint, B.deepTint, k);
  mixC(G.uBounce.value, A.bounce, B.bounce, k);
  mixC(G.uAmbient.value, A.ambient, B.ambient, k);
  if (look.ambient) G.uAmbient.value.set(look.ambient);

  // local lights
  const L = look.lights ?? [];
  for (let i = 0; i < 6; i++) {
    const l = L[i];
    if (l) {
      G.uPL.value[i].set(l.pos[0], l.pos[1], l.pos[2], l.r ?? 3);
      const c = ca.set(l.color ?? '#ffffff');
      G.uPLC.value[i].set(c.r, c.g, c.b, l.i ?? 1);
    } else G.uPLC.value[i].set(0, 0, 0, 0);
  }

  ENV.uRain.value = look.rain ?? 0;
  ENV.uWaterOn.value = look.water ? 1 : 0;

  const e = ctx.engine;
  const a = e.mAtmos.uniforms;
  mixC(a.uFogWarm.value, A.fog.warm, B.fog.warm, k);
  mixC(a.uFogCool.value, A.fog.cool, B.fog.cool, k);
  if (look.fogWarm) a.uFogWarm.value.set(look.fogWarm);
  if (look.fogCool) a.uFogCool.value.set(look.fogCool);
  a.uFogDensity.value = (look.fogDensity ?? mixN(A.fog.density, B.fog.density, k)) * (look.fogMul ?? 1);
  a.uMist.value = look.mist ?? mixN(A.fog.mist, B.fog.mist, k);
  a.uMistHeight.value = mixN(A.fog.mistHeight, B.fog.mistHeight, k);
  a.uShafts.value = look.shafts ?? 0;

  const f = e.mFinal.uniforms;
  mixC(f.uLift.value, A.grade.lift, B.grade.lift, k);
  mixC(f.uGain.value, A.grade.gain, B.grade.gain, k);
  f.uSat.value = look.sat ?? mixN(A.grade.sat, B.grade.sat, k);
  f.uExposure.value = look.exposure ?? mixN(A.grade.exposure, B.grade.exposure, k);
  f.uGamma.value = look.gamma ?? mixN(A.grade.gamma, B.grade.gamma, k);
  f.uBloom.value = look.bloom ?? mixN(A.grade.bloom, B.grade.bloom, k);
  f.uVignette.value = look.vignette ?? mixN(A.grade.vignette, B.grade.vignette, k);
  f.uGrain.value = look.grain ?? mixN(A.grade.grain, B.grade.grain, k);
  e.mBright.uniforms.uThreshold.value = look.threshold ?? mixN(A.grade.threshold, B.grade.threshold, k);
}
