// Cameras and looks for the Room department's shots: s05 night (the wide), s12 cctv (the ceiling camera).
import { ROOM, rw, roomAz, homeCamPose, DESK_PHONE } from '../room-layout.js';
export { s12Zoom, S12_ZOOM_CENTRE } from '../room-layout.js';     // the s12 push-in, for the UI's HUD box
import { PHONE } from '../room-figure.js';
import * as THREE from 'three';
import { smoother, smooth, invLerp, lerp } from '../util.js';

const phoneLight = (i) => ({ pos: rw(PHONE.c.x, PHONE.c.y + 0.06, PHONE.c.z + 0.05), r: 0.75, color: '#9fb8ff', i });
const NIGHT = (extra = {}) => ({
  preset: 'night', sunElev: 12, sunAz: roomAz(0, -1), sunStrength: 0.36,
  ambient: '#0a0d1d', fogDensity: 0.0007, rain: 0.8,
  ...extra,
});

// the desk phone's light: a tight cold pool on the desk and him, and a wide faint one that reaches the ceiling
const deskLights = (g) => {
  const p = DESK_PHONE.pos;
  return [
    { pos: rw(p.x, p.y + 0.06, p.z), r: 0.8, color: '#c4d6ff', i: 1.4 * g },
    { pos: rw(p.x, p.y + 0.95, p.z), r: 2.0, color: '#8ea6f0', i: 0.32 * g },
  ];
};
// h01 / k13 share a framing (they rhyme): low, from behind his left, the bowed silhouette against the rain window
const darkRoomCam = (lt, d, push) => {
  const k = smoother(lt / d);
  return { pos: rw(lerp(-1.05, -1.05 + push * 0.6, k), 1.0, lerp(0.45, 0.45 - push, k)), look: rw(0.05, 1.5, -1.7), fov: 56, near: 0.05 };
};

export const CAMS = {
  h01: (lt, d) => darkRoomCam(lt, d, 0.12),
  k13: (lt, d) => darkRoomCam(lt, d, 0.08),
  // 03:12: medium, from his right at desk height, his bowed profile over the phone's glow, the rain window behind
  s15: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(lerp(1.4, 1.3, k), lerp(1.32, 1.3, k), lerp(-0.4, -0.48, k)), look: rw(-0.02, 1.02, -1.3), fov: 42, near: 0.05 };
  },
  // dawn: the same window from behind him, the rain stopped, a slow push
  k14: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(lerp(-0.26, -0.2, k), lerp(1.3, 1.28, k), lerp(0.95, 0.55, k)), look: rw(0.0, 1.48, -2.0), fov: 48, near: 0.05 };
  },
  // 01:40. Behind him and to his left, low: the rain window fills the frame, the amber tower far off left of his head.
  s05: (lt, d) => {
    const k = smoother(lt / d);
    return { pos: rw(lerp(-0.24, -0.2, k), lerp(1.31, 1.29, k), lerp(0.78, 0.5, k)), look: rw(0.0, 1.5, -2.0), fov: 48, near: 0.05 };
  },
  // the home camera on the shelf: looking out of its lens at him; wide (the pass adds barrel distortion)
  s12: () => {
    const P = homeCamPose();
    const L = P.lens.clone().addScaledVector(P.fwd, 0.01), A = P.lens.clone().addScaledVector(P.fwd, 2.0);
    return { pos: rw(L.x, L.y, L.z), look: rw(A.x, A.y, A.z), fov: 92, near: 0.02 };
  },
  // close on the little camera on the shelf, from near his eyes: it turns a few degrees to keep him in frame
  k06: (lt, d) => {
    const P = homeCamPose();
    const k = smoother(lt / d);
    const hb = new THREE.Vector3(P.fwd.x, 0, P.fwd.z).normalize();   // level, from the camera toward him
    const side = new THREE.Vector3(-hb.z, 0, hb.x);
    const c = P.pivot.clone().add(new THREE.Vector3(0, -0.02, 0));
    const pos = c.clone().addScaledVector(hb, lerp(0.46, 0.4, k)).addScaledVector(side, -0.1).add(new THREE.Vector3(0, 0.03, 0));
    const at = c.clone().addScaledVector(side, -0.015).add(new THREE.Vector3(0, -0.01, 0));
    return { pos: rw(pos.x, pos.y, pos.z), look: rw(at.x, at.y, at.z), fov: 34, near: 0.01 };
  },
};

export const LOOKS = {
  // the film's first image: black, the rain fades in, then the phone on the desk lights the room from below
  h01: (lt, d, t, st) => {
    const g = smooth(invLerp(st.cues.deskLight, st.cues.deskLight + 0.25, st.tr));
    return NIGHT({
      sunStrength: 0.16, ambient: '#04050f', lights: deskLights(g),
      rainHaze: 0.72, rainBlur: 22, rainFall: 0.5, rainBokeh: 2.2,
      exposure: lerp(0.0, 1.05, smooth(invLerp(0.0, 1.4, lt))), bloom: 1.25,
    });
  },
  // after the blackout: dark, still; the phone wakes at CUES.phoneWake
  k13: (lt, d, t, st) => {
    const g = smooth(invLerp(st.cues.phoneWake, st.cues.phoneWake + 0.3, st.tr));
    return NIGHT({ sunStrength: 0.14, ambient: '#03040c', lights: deskLights(g), rainHaze: 0.75, rainBlur: 22, rainFall: 0.55, rainBokeh: 2, exposure: 1.0, bloom: 1.25 });
  },
  // 03:12: bowed over the phone in his hands; heavier rain on the glass
  s15: () => NIGHT({
    sunStrength: 0.14, ambient: '#04050f',
    lights: [phoneLight(1.2), { pos: rw(0, 1.5, -2.8), r: 4.2, color: '#3c4aa8', i: 0.3 }],
    rainHaze: 0.78, rainBlur: 22, rainFall: 1.0, rainScale: 2.0, rainBokeh: 2, exposure: 1.02, bloom: 1.25,
  }),
  // dawn: pale gold-blue sky, the rain has stopped (drops frozen on the glass), the towers dark against it, his silhouette
  k14: () => ({
    preset: 'dawn', sunElev: 7, sunAz: roomAz(0, -1) + 18, sunStrength: 0.55, ambient: '#151022', fogDensity: 0.0006,
    lights: [{ pos: rw(0, 1.4, -2.6), r: 4.5, color: '#f2c9a8', i: 0.35 }],
    rain: 0, rainHaze: 0.32, rainBlur: 14, rainFall: 0, rainFreeze: 1, rainBokeh: 1.5, rainDrop: 0.8,
    exposure: 1.08, bloom: 1.1,
  }),
  // k06: the shelf in the dark; the phone's cold light from the desk side-lights the white camera
  k06: () => {
    const P = homeCamPose();
    return NIGHT({
      sunStrength: 0.1, ambient: '#05071a',
      lights: [phoneLight(1.0), { pos: rw(...P.pivot.clone().addScaledVector(P.fwd, 0.55).add(new THREE.Vector3(0.0, -0.18, 0)).toArray()), r: 0.68, color: '#e2ebff', i: 1.1 }],
      exposure: 1.05, bloom: 1.25, rainGlass: 1,
    });
  },
  s05: () => NIGHT({
    lights: [phoneLight(0.85), { pos: rw(0, 1.5, -2.8), r: 4.2, color: '#3c4aa8', i: 0.45 }],
    rainHaze: 0.7, rainBlur: 22, rainFall: 0.45,
  }),
  // infrared fill from the camera itself: the room reads flat and grey, his face stays a dark void
  s12: () => NIGHT({
    lights: [phoneLight(0.7), { pos: rw(...homeCamPose().lens.toArray()), r: 5.5, color: '#b8c4d8', i: 0.55 }, { pos: rw(0, 1.5, -2.8), r: 4.2, color: '#3c4aa8', i: 0.3 }],
    ambient: '#1a1f2c', sat: 0.8, grain: 0.07, vignette: 0.15, exposure: 1.35, bloom: 0.6,
  }),
};
