// The neighbours: ordinary residential towers across the street, seen through the rain from 林工's window (v12: no 安
// tower in his view). Painted slabs with balcony bands, AC units, rooftop machine rooms and scattered lit windows at
// 03:12 (mostly dark, a few warm lamps, a few cold TV glows). Room-local metres; the room floor is local y = 0 (world 45).
import * as THREE from 'three';
import { toonMaterial } from './materials.js';
import { Rng } from './util.js';

function facadeTex(seed, cols, rows) {
  const r = new Rng(seed);
  const W = 512, H = 1024;
  const cm = document.createElement('canvas'); cm.width = W; cm.height = H;
  const ce = document.createElement('canvas'); ce.width = W; ce.height = H;
  const g = cm.getContext('2d'), e = ce.getContext('2d');
  g.fillStyle = '#3a3f55'; g.fillRect(0, 0, W, H);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  for (let j = 0; j < rows; j++) {
    // balcony slab band per floor
    g.fillStyle = '#4b5068'; g.fillRect(0, j * rh + rh * 0.78, W, rh * 0.12);
    for (let i = 0; i < cols; i++) {
      const x = i * cw + cw * 0.18, y = j * rh + rh * 0.18, w = cw * 0.64, h = rh * 0.56;
      g.fillStyle = '#20243a'; g.fillRect(x, y, w, h);
      // AC unit under some windows
      if (r.next() < 0.35) { g.fillStyle = '#6d7288'; g.fillRect(x + w * 0.1, y + h + rh * 0.02, w * 0.35, rh * 0.14); }
      const p = r.next();
      if (p < 0.07) {                                  // a lamp still on (pale, not amber: amber is 安's)
        const c = r.next() < 0.5 ? '#ffe9d2' : '#f4f0e6';
        e.fillStyle = c; e.fillRect(x, y, w, h);
        e.fillStyle = 'rgba(0,0,0,0.45)'; e.fillRect(x + w * r.range(0.2, 0.7), y, w * 0.08, h);   // a curtain edge
      } else if (p < 0.12) {                           // a cold screen glow
        e.fillStyle = r.next() < 0.5 ? '#9fb6ff' : '#c7d6ff';
        e.globalAlpha = 0.55; e.fillRect(x, y + h * 0.3, w, h * 0.7); e.globalAlpha = 1;
      }
    }
  }
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return { map: mk(cm), emis: mk(ce) };
}

export function buildTowers(parent) {
  const g = new THREE.Group(); parent.add(g);
  // [x, z, width, depth, height above the city ground, seed, yaw]; local y = −45 is the street
  const T = [
    [-6, -150, 38, 18, 86, 3, 0.04],       // straight across: hides the CBD (and 安's tower) behind it
    [44, -92, 26, 16, 96, 5, -0.12],       // nearer, to the right
    [-58, -118, 30, 16, 104, 7, 0.1],      // left
    [26, -260, 34, 18, 128, 9, 0.0],       // further back, between them
    [-40, -300, 30, 18, 118, 11, -0.06],
    [90, -210, 30, 16, 100, 13, -0.2],
  ];
  for (const [x, z, w, d, h, seed, yaw] of T) {
    const floors = Math.round(h / 3.0), cols = Math.max(6, Math.round(w / 3.4));
    const tx = facadeTex(seed, cols, floors);
    const mat = toonMaterial({ color: '#ffffff', map: tx.map, emissiveMap: tx.emis, emissiveGain: 1.25, id: 0 });
    const side = toonMaterial({ color: '#2e3247', id: 0 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, mat, side]);
    b.position.set(x, -45 + h / 2, z); b.rotation.y = yaw; g.add(b);
    // rooftop: machine room, water tank, a parapet lip
    const roofM = toonMaterial({ color: '#262a3d', id: 0 });
    const mr = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 5, d * 0.5), roofM); mr.position.set(x + w * 0.15, -45 + h + 2.5, z); mr.rotation.y = yaw; g.add(mr);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.5, 16), roofM); tank.position.set(x - w * 0.25, -45 + h + 1.75, z + 2); g.add(tank);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.2, d + 0.6), roofM); lip.position.set(x, -45 + h + 0.6, z); lip.rotation.y = yaw; g.add(lip);
    // a red aviation light on the taller roofs
    if (h > 105) {
      const av = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), toonMaterial({ color: '#000', unlit: true, emissive: '#ff3b30', emissiveGain: 2.0, id: 0 }));
      av.position.set(x + w * 0.15, -45 + h + 5.6, z); g.add(av);
    }
  }
  return g;
}
