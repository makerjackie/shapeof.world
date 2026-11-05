// Canvas textures for 林工's flat (seeded, deterministic).
import * as THREE from 'three';
import { Rng } from './util.js';

function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

// oak laminate floor: planks along z
export function floorTex() {
  const [c, g] = cv(1024, 1024), r = new Rng(11);
  const cols = 6;
  for (let i = 0; i < cols; i++) {
    let y = -r.range(0, 600);
    while (y < 1024) {
      const L = r.range(420, 700);
      const base = r.range(0.86, 1.06);
      g.fillStyle = `rgb(${Math.round(150 * base)},${Math.round(116 * base)},${Math.round(88 * base)})`;
      g.fillRect(i * 1024 / cols, y, 1024 / cols, L);
      // grain
      for (let k = 0; k < 18; k++) {
        g.strokeStyle = `rgba(80,52,34,${r.range(0.05, 0.16)})`;
        g.lineWidth = r.range(1, 3);
        const x = i * 1024 / cols + r.range(4, 1024 / cols - 4);
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + r.range(-8, 8), y + L * 0.3, x + r.range(-8, 8), y + L * 0.7, x + r.range(-6, 6), y + L); g.stroke();
      }
      g.fillStyle = 'rgba(40,26,18,0.55)'; g.fillRect(i * 1024 / cols, y, 1024 / cols, 3);
      y += L;
    }
    g.fillStyle = 'rgba(40,26,18,0.5)'; g.fillRect(i * 1024 / cols, 0, 3, 1024);
  }
  return tex(c, [1, 1]);
}

// wall paint with soft mottling
export function wallTex(seed = 3, rgb = [205, 208, 216]) {
  const [c, g] = cv(512, 512), r = new Rng(seed);
  g.fillStyle = `rgb(${rgb.join(',')})`; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(${r.next() < 0.5 ? '255,255,255' : '120,124,140'},${r.range(0.02, 0.05)})`;
    g.beginPath(); g.arc(r.range(0, 512), r.range(0, 512), r.range(20, 90), 0, 7); g.fill();
  }
  return tex(c, [2, 1]);
}

// a row of book spines; returns { map, count } texture atlas of n spines
export function booksTex(seed = 5) {
  const [c, g] = cv(1024, 256), r = new Rng(seed);
  const pal = ['#3e4a6b', '#8c3b3b', '#d9d2c3', '#2f5b57', '#c49a4a', '#5a4a7a', '#1f2430', '#a7b3c4', '#6d7f5a', '#b45f3c', '#e8e2d6', '#44506e'];
  let x = 0;
  while (x < 1024) {
    const w = r.range(18, 46);
    const col = r.pick(pal);
    g.fillStyle = col; g.fillRect(x, 0, w, 256);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, 0, 2, 256);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 3, 0, 2, 256);
    // title bands
    g.fillStyle = r.next() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(20,20,30,0.45)';
    const by = r.range(30, 120); g.fillRect(x + w * 0.2, by, w * 0.6, r.range(30, 70));
    if (r.next() < 0.6) { g.fillRect(x + w * 0.15, 200, w * 0.7, 6); g.fillRect(x + w * 0.15, 214, w * 0.7, 3); }
    x += w;
  }
  return tex(c);
}

// keyboard keys
export function keysTex() {
  const [c, g] = cv(512, 160);
  g.fillStyle = '#23262e'; g.fillRect(0, 0, 512, 160);
  const rows = [[14, 0], [14, 6], [13, 12], [12, 20], [8, 0]];
  rows.forEach(([n, off], ri) => {
    for (let i = 0; i < n; i++) {
      const w = ri === 4 && i === 3 ? 150 : 30;
      const x = 8 + off + i * 35 + (ri === 4 && i > 3 ? 120 : 0);
      g.fillStyle = '#3a3e49'; g.beginPath(); g.roundRect(x, 8 + ri * 30, w, 26, 4); g.fill();
      g.fillStyle = '#4a4f5c'; g.fillRect(x + 3, 10 + ri * 30, w - 6, 3);
    }
  });
  return tex(c);
}

// a framed poster: an abstract mountain print (no text)
export function posterTex() {
  const [c, g] = cv(256, 340), r = new Rng(21);
  const gr = g.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, '#d8d4c8'); gr.addColorStop(1, '#bfc7cf');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#6f7f94'; g.beginPath(); g.moveTo(0, 260); g.lineTo(90, 150); g.lineTo(150, 220); g.lineTo(200, 170); g.lineTo(256, 230); g.lineTo(256, 340); g.lineTo(0, 340); g.fill();
  g.fillStyle = '#3f4d63'; g.beginPath(); g.moveTo(0, 300); g.lineTo(120, 230); g.lineTo(256, 290); g.lineTo(256, 340); g.lineTo(0, 340); g.fill();
  g.fillStyle = '#e9e3d6'; g.beginPath(); g.arc(180, 90, 26, 0, 7); g.fill();
  void r;
  return tex(c);
}

// mesh chair back: dark weave
export function meshTex() {
  const [c, g] = cv(128, 128);
  g.fillStyle = '#1b1d24'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2c303b'; g.lineWidth = 2;
  for (let i = -128; i < 256; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 128, 0); g.stroke(); }
  return tex(c, [4, 5]);
}

// notebook page with ruled lines and handwriting scribbles
export function pageTex(seed = 8) {
  const [c, g] = cv(256, 360), r = new Rng(seed);
  g.fillStyle = '#ece8de'; g.fillRect(0, 0, 256, 360);
  g.strokeStyle = 'rgba(110,130,170,0.35)'; g.lineWidth = 1;
  for (let y = 40; y < 360; y += 16) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke(); }
  g.strokeStyle = 'rgba(40,44,70,0.7)'; g.lineWidth = 1.4;
  for (let y = 54; y < 300; y += 16) {
    if (r.next() < 0.2) continue;
    let x = 16; const end = r.range(120, 236);
    g.beginPath(); g.moveTo(x, y);
    while (x < end) { x += r.range(4, 9); g.lineTo(x, y - r.range(0, 7)); }
    g.stroke();
  }
  return tex(c);
}

// the work badge (工牌): photo area blank, company bar, no readable name
export function badgeTex() {
  const [c, g] = cv(160, 240);
  g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, 160, 240);
  g.fillStyle = '#2b3550'; g.fillRect(0, 0, 160, 46);
  g.fillStyle = '#c9ced8'; g.fillRect(40, 66, 80, 96);
  g.fillStyle = '#9aa3b4'; g.beginPath(); g.arc(80, 100, 20, 0, 7); g.fill(); g.fillRect(52, 126, 56, 36);
  g.fillStyle = '#2b3550'; g.fillRect(30, 180, 100, 10); g.fillStyle = '#7d869a'; g.fillRect(44, 200, 72, 6);
  g.fillStyle = '#ffffff'; g.fillRect(64, 14, 32, 6);
  return tex(c);
}
