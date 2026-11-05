// Cameras and looks for the meet department's shots (see CONTRACT.md).
import { FLOOR, TOP, SCREEN, SEATS, PHONE_LIN, seatFrame } from '../meet-layout.js';
import { smooth, smoother, invLerp, lerp, clamp, deg } from '../util.js';

const mixA = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const Y = (y) => FLOOR + y;
const SCR = [SCREEN.x, SCREEN.y, SCREEN.z];

// shared morning look: low ENE sun through both glass walls, character shadow map over the whole room
const SUN = { sunElev: 14, sunAz: 58 };
const base = (o = {}) => ({
  preset: 'morning', ...SUN, shafts: 0.3, ambient: '#707888', fogCool: '#cfe2f2',
  shadow: { center: [0, Y(2.0), -0.5], radius: 12.5, depth: 26 },
  ...o,
});

// the committee phones' positions (match meet-props: seat-local a = 0.2, b = 0.13, just above the glass)
const phonePos = (id) => { const p = seatFrame(id).at(0.2, 0.13); return [p[0], p[1] + 0.06, p[2]]; };

export const CAMS = {
  // s01: macro on 林工's phone, then a slow crane up and tilt to reveal the room
  s01: (lt, d) => {
    const k = smoother(invLerp(0.9, 3.35, lt));
    const drift = lt * 0.004;
    const pos = [lerp(PHONE_LIN.x + 0.003, 0.03, k), lerp(TOP + 0.29 + drift, Y(1.16), k), lerp(PHONE_LIN.z + 0.02, 2.92, k)];
    const pitch = deg(lerp(-87.5, -4.5, smooth(invLerp(0.95, 3.4, lt))));
    const yaw = deg(lerp(1.2, -0.4, k));
    const look = [pos[0] + Math.sin(yaw) * Math.cos(pitch), pos[1] + Math.sin(pitch), pos[2] - Math.cos(yaw) * Math.cos(pitch)];
    return { pos, look, fov: lerp(31, 56, smooth(invLerp(0.9, 3.4, lt))), near: 0.02 };
  },
  // s04 q1: over the shoulders from the left side (zhang backlit across the table), slow push-in
  s04: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([-1.95, Y(1.5), 1.95], [-1.7, Y(1.47), 1.3], k), look: mixA([0.05, SCREEN.y - 0.28, SCREEN.z], [0.0, SCREEN.y - 0.22, SCREEN.z], k), fov: 58 };
  },
  // s09 q2: dead centre from the foot, low, symmetric; the chair under the screen
  s09: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0, Y(1.17), 3.15], [0, Y(1.19), 2.8], k), look: [0, SCREEN.y - 0.42, SCREEN.z], fov: 54 };
  },
  // s14 q3: high from the left-back corner, looking down across the table to the screen
  s14: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([-2.7, Y(2.55), 2.9], [-2.35, Y(2.45), 2.3], k), look: mixA([0.15, SCREEN.y - 0.55, SCREEN.z], [0.1, SCREEN.y - 0.45, SCREEN.z], k), fov: 56 };
  },
  // s19 vote: low along the left row of vote units toward the screen
  s19: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([-0.3, TOP + 0.26, 2.55], [-0.29, TOP + 0.28, 2.25], k), look: mixA([-0.62, Y(1.0), -6], [-0.58, Y(1.05), -6], k), fov: 54, near: 0.03 };
  },
  // s20 ask (top band): 林工's eyeline down the table to the chair; heads turn toward us
  s20: (lt, d, t, st) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.04, Y(1.24), 2.8], [0.04, Y(1.24), 2.45], k), look: [0, Y(1.28), -3.7], fov: 56, py: (st.split || 0.42) / 2 };
  },
  // s23 pass: behind 林工 (his back in the foreground, still seated) while the room stands and applauds
  s23: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.32, Y(1.5), 4.75], [0.28, Y(1.52), 4.45], k), look: [0.0, Y(1.95), -6], fov: 46 };
  },
  // s25 phones: open on 张主任's phone (readable), then tilt up to his under-lit face
  s25: (lt, d, t, st) => {
    const ph = seatFrame('zhang').at(0.2, 0.13);
    const k = smoother(invLerp(2.7, 4.9, lt));
    // ends with 张主任 large on the right and 苏晴 (bob) further down the row, both lit from below by their phones
    const pos = mixA([ph[0] - 0.13, TOP + 0.26, ph[2] + 0.02], [0.26, TOP + 0.3, 0.75], k);
    const look = mixA([ph[0] + 0.02, TOP, ph[2]], [1.0, Y(1.0), -1.0], k);
    return { pos, look, fov: lerp(40, 46, k), near: 0.02 };
  },
};

export const LOOKS = {
  s01: () => base({ shafts: 0.35 }),
  s04: () => base(),
  s09: () => base(),
  s14: () => base(),
  s19: () => base(),
  s20: () => base({ shafts: 0.4 }),
  s23: () => base({ shafts: 0.4 }),
  s25: (lt, d, t, st) => {
    // five phones as cold local lights, lit at the cue
    const c = st.cues.phonesLight;
    const on = st.tr >= c ? smooth(invLerp(c, c + 0.08, st.tr)) : 0;
    const ids = ['bun', 'bob', 'zhang', 'heavy', 'young'];
    const lights = ids.map((id) => ({ pos: phonePos(id), r: 0.85, color: '#a9c6ff', i: 0.95 * on }));
    return base({ lights, exposure: 0.92, bloom: 0.35, threshold: 1.5, shafts: 0.0, ambient: '#3c4252' });
  },
};
