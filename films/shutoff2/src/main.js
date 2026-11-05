import * as THREE from 'three';
import { Engine } from './engine.js';
import { G } from './glsl.js';
import { applyLook } from './look.js';
import { FPS, FRAMES, CUES, SHOTS, evalFrame, registerCams } from './shots.js';
import { onTwos, deg } from './util.js';

// 关不掉 v11 — vertical 1080×1920. Every frame is a pure function of its frame number.
// URL params:
//   scale=2            internal supersampling (1 for quick previews)
//   frame=N | t=S      show this frame on load
//   test=1&cam=x,y,z&at=x,y,z&fov=35&t=30&set=room   free camera at film time t (set overrides the shot's set)
//   ui=0               hide the screen-space UI layer;  <dept>=0  skip a department
const P = new URLSearchParams(location.search);
const S = parseFloat(P.get('scale') ?? '2');
export const W = 1080, H = 1920;

const canvas = document.getElementById('c');
const engine = new Engine(canvas, W, H, S);
const scene = new THREE.Scene();
const overlay = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 9000);

const ctx = { THREE, scene, overlay, engine, camera, G, CUES, SHOTS, FPS, W, H, shadowRoots: [] };

// Each department owns the cameras/looks of its shots in src/cams/<dept>.js
for (const c of ['meet', 'room', 'hands', 'city', 'dc', 'ui']) {
  try { registerCams(await import(`./cams/${c}.js`)); } catch (e) { console.error(`[cams/${c}] failed to load: ${e.stack || e}`); }
}
// Departments load independently: a broken module falls back to a no-op so the others keep rendering.
const NOOP = { update() {} };
async function dept(name, file, fn) {
  if (P.get(name) === '0') return NOOP;
  try {
    const mod = await import(file);
    return (await mod[fn](ctx)) || NOOP;
  } catch (e) {
    console.error(`[${name}] failed to load: ${e.stack || e}`);
    return NOOP;
  }
}
// UI first: the 3D departments read in-world screen canvases from ctx.ui.screen(id, st)
ctx.ui = await dept('ui', './ui.js', 'createUI');
ctx.hands = await dept('hands', './hands.js', 'createHands');     // 林工's hands, the watch, the phone prop (used by every set)
ctx.city = await dept('city', './city.js', 'createCity');
ctx.meet = await dept('meet', './meet.js', 'createMeet');
ctx.room = await dept('room', './room.js', 'createRoom');
ctx.dc = await dept('dc', './dc.js', 'createDC');
const ORDER = ['city', 'meet', 'room', 'dc', 'hands'];

const num3 = (s) => s.split(',').map(Number);
const FLAT = new Set(['phone', 'card', 'black']);   // sets drawn by the UI alone (no 3D)

function stateFor(frame) {
  const st = evalFrame(frame);
  if (P.get('test') === '1') {
    if (P.get('set')) st.set = P.get('set');
    if (P.get('cam')) st.cam = { pos: num3(P.get('cam')), look: num3(P.get('at') ?? '0,1.5,0'), fov: parseFloat(P.get('fov') ?? '35') };
  }
  return st;
}

const _sc = new THREE.Vector3();
const uiTex = new THREE.Texture();
uiTex.flipY = false; uiTex.premultiplyAlpha = true; uiTex.colorSpace = THREE.NoColorSpace;
uiTex.minFilter = THREE.LinearFilter; uiTex.magFilter = THREE.LinearFilter; uiTex.generateMipmaps = false;

function renderState(st) {
  G.uTime.value = st.t;
  G.uDrawTime.value = onTwos(st.t);
  const flat = FLAT.has(st.set);
  let uiCanvas = null;
  if (P.get('ui') !== '0' && ctx.ui.draw) {
    try { uiCanvas = ctx.ui.draw(st); } catch (e) { console.error(`[ui] draw failed: ${e.stack || e}`); }
  }
  if (uiCanvas) { uiTex.image = uiCanvas; uiTex.needsUpdate = true; }
  if (!flat) {
    applyLook(ctx, st.look);
    if (st.key) G.uKeyDir.value.set(...st.key).normalize(); else G.uKeyDir.value.copy(G.uSunDir.value);
    engine.mWater.uniforms.uOn.value = st.look.water ? 1 : 0;
    const c = st.cam;
    camera.position.set(...c.pos);
    camera.up.set(...(c.up ?? [0, 1, 0]));
    camera.lookAt(_sc.set(...c.look));
    if (c.roll) camera.rotateZ(deg(c.roll));
    camera.updateMatrixWorld();
    camera.near = c.near ?? 0.05;
    camera.far = c.far ?? 9000;
    camera.aspect = W / H;
    // lens shift: c.py puts the optical centre at this fraction of the frame height (0 top, 1 bottom),
    // e.g. 1/6 for a subject framed in the top third of a split screen. c.fov is always the visible frame's fov.
    const py = (c.py ?? 0.5) * H;
    if (Math.abs(py - H / 2) > 0.5) {
      const Hv = py < H / 2 ? 2 * (H - py) : 2 * py;
      const offY = py < H / 2 ? H - 2 * py : 0;
      camera.fov = 2 * Math.atan(Math.tan(deg(c.fov) / 2) * Hv / H) * 180 / Math.PI;
      camera.setViewOffset(W, Hv, 0, offY, W, H);
    } else {
      camera.clearViewOffset();
      camera.fov = c.fov;
    }
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    for (const d of ORDER) {
      try { ctx[d].update(st); } catch (e) { console.error(`[${d}] update failed: ${e.stack || e}`); }
    }
    scene.updateMatrixWorld(true);
    overlay.updateMatrixWorld(true);
  }
  const L = st.look || {};
  engine.render(scene, overlay, camera, {
    skip3D: flat, ui: uiCanvas ? uiTex : null, clear: L.clear,
    shadow: !flat && st.shadow && { center: _sc.set(...st.shadow.center).clone(), radius: st.shadow.radius, depth: st.shadow.depth },
    shadowRoots: ctx.shadowRoots.length ? ctx.shadowRoots : undefined,
    frame: st.frame, fade: st.fade, fadeColor: st.fadeColor, reflect: !!L.water,
    inkSeed: Math.floor(onTwos(st.t) * 12) % 5, paintRadius: L.paintRadius ?? 4, inkWidth: L.inkWidth, waterLevel: L.waterLevel ?? 0,
    bw: st.bw ?? 0, bloom: L.bloom, exposure: L.exposure, vignette: L.vignette, grain: L.grain, threshold: L.threshold,
  });
  ctx.lastState = st;
}

window.FILM = {
  FPS, FRAMES, CUES, SHOTS, ctx,
  renderFrame(n) { renderState(stateFor(n)); return true; },
  capture(q = 0.93) { return canvas.toDataURL('image/jpeg', q); },
  stateFor,
};
// fonts and images used by the UI must be ready before the first frame
if (ctx.ui.ready) await ctx.ui.ready;
renderState(stateFor(0));
window.FILM_READY = true;

const startFrame = parseInt(P.get('frame') ?? (P.get('t') ? Math.round(parseFloat(P.get('t')) * FPS) : 0), 10);
if (P.get('headless') !== '1') {
  window.FILM.renderFrame(startFrame);
  document.dispatchEvent(new CustomEvent('film-ready', { detail: { frame: startFrame } }));
}
