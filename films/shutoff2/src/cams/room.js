// Cameras and looks for the Room department's shots: s05 night (the wide), s12 cctv (the ceiling camera).
import { ROOM, rw, roomAz, homeCamPose } from '../room-layout.js';
export { s12Zoom, S12_ZOOM_CENTRE } from '../room-layout.js';     // the s12 push-in, for the UI's HUD box
import { PHONE } from '../room-figure.js';
import * as THREE from 'three';
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
