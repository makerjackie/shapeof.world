// 林工's apartment: shared layout (room-local metres). The room group sits at ROOM.origin, turned by ROOM.yaw so that
// its local −Z (the window) faces 安's HQ tower at the world origin. Floor y = 0 locally (= 45 in the world).
import * as THREE from 'three';

export const ROOM = {
  origin: new THREE.Vector3(1400, 45, 1800),
  yaw: Math.atan2(1400, 1800),
  x0: -2.05, x1: 2.05, zWin: -2.0, z1: 2.75, ceil: 2.7,
  win: { x0: -1.78, x1: 1.78, y0: 0.6, y1: 2.46, frame: 0.055, mull: [-0.6, 0.6] },
  desk: { x0: -0.82, x1: 0.82, z0: -1.93, z1: -1.27, top: 0.752 },
  seat: new THREE.Vector3(0.04, 0.0, -0.78),      // chair centre on the floor
  // v12: the little home camera sits on top of the bookshelf by the window (right wall), aimed at him
  homecam: { base: new THREE.Vector3(1.775, 1.872, -1.22), aim: new THREE.Vector3(0.05, 1.02, -1.15) },
};
export const ROOM_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ROOM.yaw);
export const ROOM_M = new THREE.Matrix4().compose(ROOM.origin, ROOM_Q, new THREE.Vector3(1, 1, 1));
const _v = new THREE.Vector3();
// room-local → world, as an array (for cameras) or into a Vector3
export function rw(x, y, z, out) { const v = (out ?? _v).set(x, y, z).applyMatrix4(ROOM_M); return out ? v : [v.x, v.y, v.z]; }
export function rwDir(x, y, z) { const v = _v.set(x, y, z).applyQuaternion(ROOM_Q); return [v.x, v.y, v.z]; }
// azimuth (look.js convention: 0 = −Z, + toward +X) of a room-local direction
export function roomAz(x, z) { const v = _v.set(x, 0, z).applyQuaternion(ROOM_Q); return Math.atan2(v.x, -v.z) * 180 / Math.PI; }

// the home camera's pan/tilt (radians) aimed at ROOM.homecam.aim (+ an offset in degrees), its lens centre and forward
// direction in room-local space (mirrors room-homecam.js: pan about Y at the base, tilt about X 0.07 m up)
export function homeCamPose(panOffDeg = 0, tiltOffDeg = 0) {
  const H = ROOM.homecam;
  const pivot = H.base.clone().add(new THREE.Vector3(0, 0.07, 0));
  const d = H.aim.clone().sub(pivot);
  const pan = Math.atan2(-d.x, -d.z) + panOffDeg * Math.PI / 180;
  const tilt = Math.atan2(d.y, Math.hypot(d.x, d.z)) + tiltOffDeg * Math.PI / 180;
  const fwd = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), pan);
  const lens = pivot.clone().addScaledVector(fwd, 0.046);
  return { pan, tilt, lens, fwd, pivot };
}

// s12: the CCTV digital push-in (shared with the UI's HUD box). Centre (470, 880) px of 1080×1920.
// zoom 1.0 → 1.3 over 1.0 s starting at CUES.lookUp + 0.25, smoothstep easing, then held.
export const S12_ZOOM_CENTRE = [470, 880];
export function s12Zoom(st) {
  const k = Math.min(1, Math.max(0, (st.tr - (st.cues.lookUp + 0.25)) / 1.0));
  return 1 + 0.3 * k * k * (3 - 2 * k);
}

// v13: the phone lying face-up on the desk in front of his hands (h01, k13, k14)
export const DESK_PHONE = { pos: new THREE.Vector3(-0.27, 0.752, -1.44), yaw: -24 };
