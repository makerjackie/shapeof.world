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
  cam: new THREE.Vector3(1.72, 2.6, 0.55),        // the ceiling dome camera (lens centre)
};
export const ROOM_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ROOM.yaw);
export const ROOM_M = new THREE.Matrix4().compose(ROOM.origin, ROOM_Q, new THREE.Vector3(1, 1, 1));
const _v = new THREE.Vector3();
// room-local → world, as an array (for cameras) or into a Vector3
export function rw(x, y, z, out) { const v = (out ?? _v).set(x, y, z).applyMatrix4(ROOM_M); return out ? v : [v.x, v.y, v.z]; }
export function rwDir(x, y, z) { const v = _v.set(x, y, z).applyQuaternion(ROOM_Q); return [v.x, v.y, v.z]; }
// azimuth (look.js convention: 0 = −Z, + toward +X) of a room-local direction
export function roomAz(x, z) { const v = _v.set(x, 0, z).applyQuaternion(ROOM_Q); return Math.atan2(v.x, -v.z) * 180 / Math.PI; }
