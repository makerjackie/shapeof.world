// Shared helpers for the style frames: renderer, seeded random, textures, the brand skeleton overlay.
import * as THREE from 'three';
export { THREE };
export const W = 1920, H = 1080;

export function makeRenderer({ shadows = true, toneMapping = THREE.NeutralToneMapping, exposure = 1 } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(2);                       // render at 2x, the screenshot downsamples
  r.setSize(W, H);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = toneMapping;
  r.toneMappingExposure = exposure;
  if (shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
  document.getElementById('stage').appendChild(r.domElement);
  return r;
}

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// vertical or radial gradient as a texture (for scene.background)
export function gradient(stops, { radial = false, w = 1024, h = 576 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const gr = radial ? g.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .5, w * .62) : g.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) gr.addColorStop(p, col);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// draw on a canvas and return it as a texture
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function toScreen(v, camera) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H };
}

export async function fontsReady() {
  const sample = '世界的形状芯片同一套内存条现在要美元年中月不到数据最低零售价追踪美国硬件网站枚等于显卡硬盘电源主板机箱显示器键鼠整机报价今日两根一套';
  await Promise.all([
    '700 60px NSerif', '600 28px NSerif', '400 20px NSans', '500 26px NSans', '700 40px NSans', '900 40px NSans',
    '700 40px Inter', '600 40px Inter', '300 40px Inter', '200 40px Inter',
  ].map(f => document.fonts.load(f, sample + '$0123456789')));
}

// the constant brand layer
export async function skeleton({ tone = 'light', chapter = '', caption = '', source = '' }) {
  const sk = document.getElementById('sk');
  sk.className = 'tone-' + tone;
  sk.innerHTML =
    `<div class="sk-corner"><img src="/brand/mark-disc.png" alt=""><span class="sk-name">世界的形状</span>` +
    (chapter ? `<span class="sk-chap">${chapter}</span>` : '') + `</div>` +
    (caption ? `<div class="sk-cap"><span class="sk-strip">${caption}</span></div>` : '') +
    (source ? `<div class="sk-src">${source}</div>` : '');
  await sk.querySelector('img').decode();
}

export function label(html, cls, x, y) {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html;
  d.style.left = x + 'px'; d.style.top = y + 'px';
  document.getElementById('labels').appendChild(d); return d;
}

// tilt-shift look in 2D: sharp band around `center`, blur growing with distance, plus grade and vignette
export function tiltShift(src, { center = .55, band = .06, edges = [.12, .2, .3, .42], blurs = [2.5, 5.5, 10, 16], grade = 'saturate(1.38) contrast(1.07) brightness(1.03)', vignette = .32 } = {}) {
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  ctx.filter = grade; ctx.drawImage(src, 0, 0, W, H); ctx.filter = 'none';
  let inner = band;
  blurs.forEach((b, i) => {
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    const l = layer.getContext('2d');
    l.filter = `blur(${b}px) ${grade}`; l.drawImage(src, 0, 0, W, H); l.filter = 'none';
    l.globalCompositeOperation = 'destination-in';
    const g = l.createLinearGradient(0, 0, 0, H), outer = edges[i];
    const clamp = p => Math.min(1, Math.max(0, p));
    [[0, 1], [center - outer, 1], [center - inner, 0], [center + inner, 0], [center + outer, 1], [1, 1]]
      .forEach(([p, a]) => g.addColorStop(clamp(p), `rgba(0,0,0,${a})`));
    l.fillStyle = g; l.fillRect(0, 0, W, H);
    ctx.drawImage(layer, 0, 0);
    inner = outer;
  });
  const v = ctx.createRadialGradient(W / 2, H * .52, H * .35, W / 2, H * .52, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,14,20,${vignette})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  return out;
}

export function done() { window.READY = true; }
