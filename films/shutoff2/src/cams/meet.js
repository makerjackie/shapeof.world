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
  // s25 phones: a low slide along the table centre; the five phones light at once; end close on 张主任's card
  s25: (lt, d) => {
    const ph = seatFrame('zhang').at(0.2, 0.13);
    const k = smoother(invLerp(0.0, d, lt));
    const k2 = smoother(invLerp(2.6, d - 0.2, lt));
    // along the right-hand row: 张主任's phone near, 苏晴's beyond, their faces above them
    const pos0 = mixA([0.24, TOP + 0.3, 1.25], [0.28, TOP + 0.28, 0.75], smooth(invLerp(0, 2.8, lt)));
    const pos = mixA(pos0, [ph[0] - 0.2, TOP + 0.24, ph[2] + 0.03], k2);
    const look0 = [1.2, Y(0.9), -2.3];
    const look = mixA(look0, [ph[0] + 0.01, TOP, ph[2]], k2);
    void k;
    return { pos, look, fov: lerp(52, 40, k2), near: 0.02 };
  },
};

export const LOOKS = {
  s19: () => base(),
  s20: () => base({ shafts: 0.26 }),
  s23: () => base({ exposure: 1.0 }),
  s25: (lt, d, t, st) => {
    const c = st.cues.phonesLight;
    const on = st.tr >= c ? smooth(invLerp(c, c + 0.08, st.tr)) : 0;
    const ids = ['bun', 'bob', 'zhang', 'heavy', 'young'];
    const lights = ids.map((id) => ({ pos: phonePos(id), r: 0.85, color: '#a9c6ff', i: 0.95 * on }));
    return base({ lights, exposure: 0.94, bloom: 0.35, threshold: 1.5, shafts: 0.0, ambient: '#3c4252' });
  },
};
