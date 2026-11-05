// Cameras and looks for the Room department's shots: s05 night (the wide), s12 cctv (the ceiling camera).
import { ROOM, rw, roomAz } from '../room-layout.js';
import { PHONE } from '../room-figure.js';
import { smoother, lerp } from '../util.js';

const phoneLight = (i) => ({ pos: rw(PHONE.c.x, PHONE.c.y + 0.06, PHONE.c.z + 0.05), r: 0.75, color: '#9fb8ff', i });
const NIGHT = (extra = {}) => ({
  preset: 'night', sunElev: 12, sunAz: roomAz(0, -1), sunStrength: 0.36,
  ambient: '#0a0d1d', fogDensity: 0.0007, rain: 0.8,
  ...extra,
});

export const CAMS = {
  // 01:40. Behind him and to his left, low: the rain window fills the frame, the amber tower far off left of his head.
  s05: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(lerp(-0.24, -0.2, k), lerp(1.31, 1.29, k), lerp(0.78, 0.5, k)), look: rw(0.0, 1.5, -2.0), fov: 48, near: 0.05 };
  },
  // the dome camera in the corner of the window wall, looking down at him; wide (the pass adds barrel distortion)
  s12: () => {
    const c = ROOM.cam;
    return { pos: rw(c.x - 0.03, c.y - 0.06, c.z + 0.03), look: rw(0.12, 0.92, -1.0), fov: 96, near: 0.03 };
  },
};

const DBG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('roomdbg') === '1';
const DBG_LOOK = { preset: 'morning', sunElev: 40, sunAz: 140, ambient: '#303540', exposure: 1.0 };
export const LOOKS = {
  s05: () => DBG ? DBG_LOOK : NIGHT({
    lights: [phoneLight(0.85), { pos: rw(0, 1.5, -2.8), r: 4.2, color: '#3c4aa8', i: 0.45 }],
    rainHaze: 0.7, rainBlur: 22,
  }),
  // infrared fill from the camera itself: the room reads flat and grey, his face stays a dark void
  s12: () => NIGHT({
    lights: [phoneLight(0.7), { pos: rw(ROOM.cam.x - 0.1, ROOM.cam.y - 0.1, ROOM.cam.z + 0.1), r: 5.5, color: '#b8c4d8', i: 0.55 }, { pos: rw(0, 1.5, -2.8), r: 4.2, color: '#3c4aa8', i: 0.3 }],
    ambient: '#1a1f2c', sat: 0.8, grain: 0.07, vignette: 0.15, exposure: 1.35, bloom: 0.6,
  }),
};
