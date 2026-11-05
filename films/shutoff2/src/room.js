// PLACEHOLDER (director's pipeline test) — the Room department replaces this file.
import * as THREE from 'three';
import { toonMaterial } from './materials.js';
export function createRoom(ctx) {
  const g = new THREE.Group(); g.position.set(1400, 45, 1800); ctx.scene.add(g);
  const wall = toonMaterial({ color: '#59607e', id: 0 });
  const desk = toonMaterial({ color: '#8a6f5a', id: 3 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(8, 0.1, 8, wall, 0, 0, 0); box(8, 3, 0.1, wall, 0, 1.5, -4); box(0.1, 3, 8, wall, -4, 1.5, 0); box(0.1, 3, 8, wall, 4, 1.5, 0);
  box(1.6, 0.05, 0.7, desk, 0, 0.75, -3.4); box(0.05, 0.75, 0.6, desk, -0.75, 0.375, -3.4); box(0.05, 0.75, 0.6, desk, 0.75, 0.375, -3.4);
  const phone = box(0.075, 0.008, 0.16, toonMaterial({ color: '#111', id: 4, emissive: '#5b6fa0' }), 0.1, 0.79, -3.3);
  return { update(st) { g.visible = st.set === 'room'; } };
}
