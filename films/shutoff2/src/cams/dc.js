// Cameras and looks for the dc department's shots (see CONTRACT.md).
// s07 copy (split 0.42): down the main cold aisle at eye level, a slow steady push-in. 安's racks (amber light columns)
// line the left; the copy runs overhead, leaps the aisle on the cross ladder, and 安-2's racks on the right flip to amber.
// s07b (optional insert, not in SHOTS yet): a macro on 安-2 rack B20. It flips during story t ≈ 24.7–25.0, halts at the
// console's 73 % pause (25.0–25.5) halfway down the rack, then finishes by ≈ 25.75. Works full-frame (split 0) or split.
import { OY, dcLights, rackZ } from '../dc-flow.js';
import { lerp, clamp } from '../util.js';

const z20 = rackZ(20);

export const CAMS = {
  s07: (lt, d, t, st) => {
    const u = clamp(lt / d);
    return {
      pos: [lerp(-0.42, -0.32, u), OY + lerp(1.62, 1.56, u), lerp(6.4, 4.4, u)],
      look: [lerp(0.22, 0.3, u), OY + lerp(1.95, 1.92, u), -12],
      fov: 82,
      py: 0.5,   // v12: full frame
    };
  },
  s07b: (lt, d, t, st) => {
    const u = clamp(lt / Math.max(d, 0.1));
    const split = st.split || 0;
    return {
      pos: [lerp(0.38, 0.46, u), OY + lerp(1.72, 1.64, u), z20 + lerp(1.05, 0.9, u)],
      look: [1.1, OY + lerp(1.38, 1.32, u), z20 - 0.25],
      fov: split ? 60 : 34,
      ...(split ? { py: split / 2 } : {}),
    };
  },
};

const look = (t) => ({
  preset: 'dc',
  // the key is the cold light at the far end of the aisle: it backlights the racks and makes the haze glow there
  sunElev: 30, sunAz: 8, sunStrength: 0.55,
  lights: dcLights(t),
  ambient: '#16242e',
  fogDensity: 0.034, fogWarm: '#3a8496', fogCool: '#08151c',
  bloom: 1.3, threshold: 0.72, exposure: 1.12, vignette: 0.32, grain: 0.025,
  inkWidth: 1.0, paintRadius: 3,
});

export const LOOKS = {
  s07: (lt, d, t) => look(t),
  s07b: (lt, d, t) => ({ ...look(t), fogDensity: 0.02 }),
};
