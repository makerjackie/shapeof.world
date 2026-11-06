// Cameras and looks for the meet department's shots (v12: s19 vote, s20 ask, s23 pass, s25 phones).
import { FLOOR, TOP, SCREEN, seatFrame } from '../meet-layout.js';
import { smooth, smoother, invLerp, lerp } from '../util.js';

const mixA = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const Y = (y) => FLOOR + y;

// 09:00 gold: the morning preset pulled toward dawn's warm key; low ENE sun through the blinds; highlights held down
const SUN = { sunElev: 14, sunAz: 58 };
const base = (o = {}) => ({
  preset: 'morning', to: 'dawn', k: 0.24, ...SUN, shafts: 0.22, ambient: '#6a6a78', fogCool: '#d6e2ee',
  bloom: 0.55, threshold: 1.3, exposure: 1.06,
  shadow: { center: [0, Y(2.0), -0.5], radius: 12.5, depth: 26 },
  ...o,
});

// committee phones (match meet-props: seat-local a = 0.2, b = 0.13), the light sits just above the glass
const phonePos = (id) => { const p = seatFrame(id).at(0.2, 0.13); return [p[0], p[1] + 0.06, p[2]]; };

export const CAMS = {
  // a04 (the day before): the empty room in late gold light. The notice on the screen, then a slow glide back
  // along the empty table that settles over 林工's place at CUES.plate, his nameplate low in frame.
  a04: (lt, d, t, st) => {
    const ta = (st.cues.plate ?? 41.6) - 37.5;
    const k = smoother(invLerp(0, ta, lt));
    const drift = smooth(invLerp(ta, d, lt));
    const pos = mixA([0, Y(1.42), 0.4], [0, Y(1.0), 2.86 - 0.08 * drift], k);
    const look = mixA([0, Y(1.95), -6], [0, Y(1.12), -6], k);
    return { pos, look, fov: 58 };
  },
  // k15 (silence): from behind 林工, his head and shoulders dark in the lower third; beyond him the five green
  // lights and his empty one, and the row of faces turned to him. A very slow push-in.
  k15: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.2, Y(1.37), 4.2], [0.19, Y(1.36), 3.92], k), look: [0.0, Y(1.0), -6], fov: 46 };
  },
  // s19 vote: behind 林工 — his dark head and shoulder low left, the big screen filling the top; slow push
  s19: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.3, Y(1.47), 4.75], [0.27, Y(1.45), 4.4], k), look: mixA([0.02, Y(2.25), -6], [0.02, Y(2.22), -6], k), fov: 41 };
  },
  // s20 ask: from 林工's eyeline along the right-hand row — 张主任 near, 苏晴 beyond, the chair at the head.
  // At CUES.turn the three heads come round to us together. Very slow push.
  s20: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.12, Y(1.15), 3.35], [0.13, Y(1.15), 2.9], k), look: [0.25, Y(1.1), -6], fov: 50 };
  },
  // s23 pass: the s19 frame again, a little higher and further, drifting back — the room stands and claps around
  // 林工's still, dark head. Hollow.
  s23: (lt, d) => {
    const k = smooth(lt / d);
    return { pos: mixA([0.3, Y(1.5), 4.9], [0.31, Y(1.52), 5.15], k), look: [0.02, Y(2.15), -6], fov: 43 };
  },
  // s25 phones: straight down on the long table (screen end at the top of frame). At CUES.phonesLight the five phones
  // light at once — five glowing rectangles, the members only dark heads and hands at the edges. Then a descending,
  // rolling move down onto 张主任's phone until 定时发送已取消 reads (the roll brings its top to the top of frame).
  s25: (lt, d) => {
    const ph = seatFrame('zhang').at(0.2, 0.13);
    const T = 3.0;                                              // 96.6: start the descent
    const k = smoother(invLerp(T, d - 0.15, lt));
    const drift = smooth(invLerp(0, T, lt));
    const hi = [0.0, TOP + lerp(3.36, 3.2, drift), -0.42];
    const lo = [ph[0], TOP + 0.27, ph[2]];
    const pos = mixA(hi, lo, k);
    const roll = lerp(0.04 * drift, Math.PI / 2 - 0.22, k);   // brings 张主任's phone top (≈ +X, turned ~0.22 rad) to the top of frame
    return { pos, look: [pos[0], TOP, pos[2]], up: [Math.sin(roll), 0, -Math.cos(roll)], fov: lerp(66, 40, k), near: 0.02 };
  },
};

export const LOOKS = {
  a04: () => base({ k: 0.5, sunElev: 9, exposure: 1.02, shafts: 0.3 }),
  k15: () => base({ k: 0.34, exposure: 1.04, ambient: '#2c2c36' }),
  s19: () => base(),
  s20: () => base({ shafts: 0.26 }),
  s23: () => base({ exposure: 1.0 }),
  s25: (lt, d, t, st) => {
    const c = st.cues.phonesLight;
    const on = st.tr >= c ? smooth(invLerp(c, c + 0.08, st.tr)) : 0;
    const ids = ['bun', 'bob', 'zhang', 'heavy', 'young'];
    const lights = ids.map((id) => ({ pos: phonePos(id), r: 0.42, color: '#a9c6ff', i: 0.5 * on }));
    return base({ lights, exposure: 0.94, bloom: 0.6, threshold: 1.0, shafts: 0.0, ambient: '#3c4252' });
  },
};
