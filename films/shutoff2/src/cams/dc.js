// Cameras and looks for the dc department's shots (see CONTRACT.md).
// s07 copy: down the main cold aisle at eye level, a slow push-in. 安's racks (left, near) wake amber; the copy rises into
//   the trays, leaps the aisle and races the length of the hall into the dark end wall.
// k11 breaker: low angle on the main switchgear; the motorised lever slams down at CUES.breaker.
// k12 blackout: the main aisle, lit; from CUES.rowsOut the hall dies row by row toward us; red emergency light at
//   CUES.emergency; a very slow push to the end.
// s07b (optional insert, not in SHOTS): a macro on one of 安's racks while it is amber (story t ≈ 56.5–60.5).
import { OY, dcLights, rackZ, SW, BREAKER, ROWS_OUT, shakeAt, arcAt, hallLit, emergAt, doorAt } from '../dc-flow.js';
import { lerp, clamp, smooth } from '../util.js';
import * as THREE from 'three';

const z5 = rackZ(5);
const ca = new THREE.Color(), cb = new THREE.Color();
const mixHex = (a, b, k) => '#' + ca.set(a).lerp(cb.set(b), clamp(k)).getHexString();
const py = (st) => (st.split ? st.split / 2 : 0.5);

export const CAMS = {
  s07: (lt, d, t, st) => {
    const u = clamp(lt / d);
    return { pos: [lerp(-0.42, -0.32, u), OY + lerp(1.62, 1.56, u), lerp(6.4, 4.6, u)], look: [lerp(0.22, 0.3, u), OY + lerp(1.9, 1.88, u), -12], fov: 74, py: py(st) };
  },
  s07b: (lt, d, t, st) => {
    const u = clamp(lt / Math.max(d, 0.1));
    return { pos: [lerp(-0.42, -0.5, u), OY + lerp(1.72, 1.64, u), z5 - lerp(1.05, 0.9, u)], look: [-1.1, OY + lerp(1.38, 1.32, u), z5 + 0.25], fov: st.split ? 60 : 34, py: py(st) };
  },
  k11: (lt, d, t, st) => {
    const u = smooth(clamp(lt / d));
    const zf = SW.z - 0.03;
    const j = 2.5 * shakeAt(t);
    return { pos: [SW.x + lerp(0.5, 0.42, u), OY + 0.4 + j, zf - lerp(1.7, 1.42, u)], look: [SW.x + 0.04, OY + 1.42 + j * 0.5, zf], fov: 64, py: py(st) };
  },
  k12: (lt, d, t, st) => {
    const u = clamp(lt / d);
    return { pos: [lerp(-0.36, -0.3, u), OY + lerp(1.6, 1.57, u), lerp(5.9, 4.7, u)], look: [lerp(0.24, 0.28, u), OY + 1.88, -12], fov: 72, py: py(st) };
  },
};

// the hall's normal look; `lit` 1 → 0 as the blackout wave passes, `em` = emergency light level
const hallLook = (t, lit = 1, em = 0) => {
  // the key and fill die spatially in the shaders (hallPw); here only the haze (lit from the far end) and the fill fade
  const k = 1 - smooth((t - ROWS_OUT) / 0.9);
  return {
    preset: 'dc',
    // the key is the cold light at the far end of the aisle: it backlights the racks and makes the haze glow there
    sunElev: 30, sunAz: 8, sunStrength: 0.55,
    lights: dcLights(t),
    ambient: mixHex(mixHex('#030405', '#16242e', lit), '#080203', em * (1 - lit)),
    fogDensity: 0.034,
    fogWarm: mixHex(mixHex('#030506', '#3a8496', k), '#1e0508', em * (1 - k)),
    fogCool: mixHex(mixHex('#020304', '#08151c', k), '#070203', em * (1 - k)),
    bloom: 1.3, threshold: 0.72, exposure: 1.12, vignette: 0.32 + 0.12 * (1 - k), grain: 0.025,
    inkWidth: 1.0, paintRadius: 3,
  };
};

export const LOOKS = {
  s07: (lt, d, t) => hallLook(t),
  s07b: (lt, d, t) => ({ ...hallLook(t), fogDensity: 0.02 }),
  k11: (lt, d, t) => {
    const a = t - BREAKER, arc = arcAt(t);
    const zf = SW.z - 0.03;
    const L = [
      { pos: [SW.x + 0.15, OY + 3.4, zf - 0.9], r: 3.4, color: '#bfe6ff', i: 0.75 },                      // the fixture above the switchgear
      { pos: [SW.x, OY + 1.56, zf - 0.3], r: 1.1, color: a < 0.04 ? '#3dff7a' : '#ff2a24', i: a < 0.04 ? 0.35 : (a < 0.2 ? 0.1 : 0.4) },
    ];
    if (arc > 0.01) L.push({ pos: [SW.x, OY + 0.95, zf - 0.35], r: 3.0, color: '#cfe8ff', i: 1.1 * arc });
    return { ...hallLook(t), sunElev: 48, sunAz: -42, sunStrength: 0.3, ambient: '#0c141a', lights: L, fogDensity: 0.03, exposure: 1.12 + 0.12 * arc, bloom: 1.3 + 0.25 * arc, vignette: 0.45 };
  },
  k12: (lt, d, t) => hallLook(t, hallLit(t), emergAt(t)),
};
