// 关不掉 v11 · DC department — painted / lettered canvas textures.
import * as THREE from 'three';
import { Rng } from './util.js';

const FONT = '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// rack label plates: an atlas of 4 × 32 cells (256 × 64 px each)
export function labelAtlas(labels) {
  const CW = 256, CH = 64, cols = 4, rows = Math.ceil(labels.length / cols);
  const [c, g] = cv(CW * cols, CH * rows);
  g.fillStyle = '#0d1118'; g.fillRect(0, 0, c.width, c.height);
  labels.forEach((l, i) => {
    const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
    g.fillStyle = l.an ? '#1a1510' : '#121820'; g.fillRect(x + 2, y + 2, CW - 4, CH - 4);
    g.strokeStyle = 'rgba(200,220,255,0.35)'; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, CW - 10, CH - 10);
    g.fillStyle = '#e8eef8'; g.font = `600 34px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(l.text, x + 18, y + CH / 2 + 1);
    if (l.sub) { g.font = `500 20px ${FONT}`; g.fillStyle = 'rgba(220,230,245,0.75)'; g.textAlign = 'right'; g.fillText(l.sub, x + CW - 16, y + CH / 2 + 1); }
  });
  const t = tex(c);
  return { tex: t, cell: (i) => ({ u0: (i % cols) / cols, v0: 1 - (Math.floor(i / cols) + 1) / rows, du: 1 / cols, dv: 1 / rows }) };
}

// a hanging row sign: big name, small zone line; lit panel (white letters on deep teal)
export function rowSign(name, sub) {
  const [c, g] = cv(1024, 384);
  const gr = g.createLinearGradient(0, 0, 0, 384);
  gr.addColorStop(0, '#16303a'); gr.addColorStop(1, '#0c1d26');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 384);
  g.strokeStyle = 'rgba(190,235,255,0.55)'; g.lineWidth = 6; g.strokeRect(14, 14, 996, 356);
  g.fillStyle = '#f2f8ff'; g.textBaseline = 'middle';
  g.font = `600 210px ${FONT}`; g.textAlign = 'left'; g.fillText(name, 70, 175);
  g.font = `500 54px ${FONT}`; g.fillStyle = 'rgba(225,240,255,0.85)'; g.textAlign = 'right';
  g.fillText(sub, 960, 125);
  g.font = `500 40px ${FONT}`; g.fillStyle = 'rgba(200,225,240,0.6)';
  g.fillText('COLD AISLE · 冷通道', 960, 255);
  return tex(c);
}

// 安全出口 sign, green, running figure
export function exitSign() {
  const [c, g] = cv(512, 192);
  g.fillStyle = '#0fbf62'; g.fillRect(0, 0, 512, 192);
  g.fillStyle = '#f4fff8';
  g.save(); g.translate(78, 96); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#f4fff8'; g.lineWidth = 14;
  g.beginPath(); g.arc(14, -50, 13, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(4, -30); g.lineTo(-8, 10); g.lineTo(-34, 44); g.moveTo(-8, 10); g.lineTo(18, 30); g.lineTo(10, 60);
  g.moveTo(2, -26); g.lineTo(34, -10); g.moveTo(2, -26); g.lineTo(-28, -16); g.stroke();
  g.restore();
  g.strokeStyle = '#f4fff8'; g.lineWidth = 6; g.strokeRect(150, 30, 0.01, 132);
  g.font = `600 64px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('安全出口', 172, 78);
  g.font = `600 44px ${FONT}`; g.fillText('EXIT  →', 176, 146);
  return tex(c);
}

// perforated sheet metal (tray sides, containment panels): grey with a dark hole grid; multiply map
export function perfTex() {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#d8dce4'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#6a7080';
  for (let y = 8; y < 256; y += 16) for (let x = (y / 16) % 2 ? 16 : 8; x < 256; x += 16) { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); }
  return tex(c, { repeat: true });
}

// painted ceiling: tile grid with a little gouache variation
export function ceilTex() {
  const [c, g] = cv(512, 512);
  const r = new Rng(41);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = 0.9 + r.range(-0.06, 0.06);
    g.fillStyle = `rgb(${Math.round(196 * v)},${Math.round(206 * v)},${Math.round(214 * v)})`;
    g.fillRect(i * 128, j * 128, 128, 128);
  }
  g.strokeStyle = '#5c6670'; g.lineWidth = 5;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  return tex(c, { repeat: true });
}

// end wall: painted panels, an air-handler grille band
export function wallTex() {
  const [c, g] = cv(512, 512);
  const r = new Rng(9);
  g.fillStyle = '#b9c6cc'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(20,40,50,${r.range(0.02, 0.08)})`; g.fillRect(i * 128, 0, 128, 512); }
  g.strokeStyle = '#5f6d76'; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); }
  g.fillStyle = '#7b8a92'; g.fillRect(0, 60, 512, 70);
  g.fillStyle = '#4c5961'; for (let x = 0; x < 512; x += 10) g.fillRect(x, 66, 5, 58);
  return tex(c, { repeat: true });
}
