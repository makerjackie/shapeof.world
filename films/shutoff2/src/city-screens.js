import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';
import { Rng } from './util.js';

// LED screens hung on the towers. Through the film they run the city's own (non-amber) ads; in s26 each one flips,
// in turn, to 安's 「早上好」 (ctx.ui.screen('billboard')), and each becomes the centre of a ring.

function adCanvases() {
  const ads = [];
  const mk = (draw) => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; draw(cv.getContext('2d')); ads.push(cv); };
  const F = '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';
  mk((c) => {
    const g = c.createLinearGradient(0, 0, 1024, 512); g.addColorStop(0, '#1d4fd8'); g.addColorStop(1, '#13b5c9');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#ffffff'; c.font = `800 150px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('湾区之光', 512, 220);
    c.font = `500 60px ${F}`; c.fillText('深圳 · 福田 2026', 512, 380);
  });
  mk((c) => {
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#f2f4f8'); g.addColorStop(1, '#c9d3e6');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#e8364a'; c.fillRect(0, 380, 1024, 132);
    c.fillStyle = '#1a2233'; c.font = `800 140px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('城市马拉松', 512, 190);
    c.fillStyle = '#ffffff'; c.font = `700 70px ${F}`; c.fillText('11 · 20  开跑', 512, 448);
  });
  mk((c) => {
    c.fillStyle = '#0d1a2e'; c.fillRect(0, 0, 1024, 512);
    const g = c.createRadialGradient(760, 256, 20, 760, 256, 300); g.addColorStop(0, '#7df0ff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#e9f6ff'; c.font = `800 120px ${F}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('新能源', 70, 200);
    c.font = `500 64px ${F}`; c.fillText('一次充电 900 公里', 70, 340);
  });
  mk((c) => {
    const g = c.createLinearGradient(0, 0, 1024, 0); g.addColorStop(0, '#ff4f8b'); g.addColorStop(1, '#7b4dff');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#ffffff'; c.font = `800 160px ${F}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('双十一', 512, 230);
    c.font = `600 64px ${F}`; c.fillText('全城狂欢 · 限时开抢', 512, 390);
  });
  return ads.map((cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
}

function screenMaterial(map, bb) {
  const u = { ...G, ...CU, uMap: { value: map }, uBB: { value: bb }, uMix: { value: 0 }, uGain: { value: 1 }, uFlash: { value: 0 }, uOn: { value: 1 } };
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vDepth;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      uniform sampler2D uMap, uBB;
      uniform float uMix, uGain, uFlash, uOn, uNight;
      varying vec2 vUv; varying float vDepth;
      void main(){
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        vec3 a = texture(uMap, vUv).rgb;
        vec3 b = texture(uBB, vUv).rgb;
        vec3 col = mix(a, b, uMix);
        // LED pixel grid up close
        vec2 px = fract(vUv * vec2(256.0, 128.0));
        float led = mix(1.0, 0.82 + 0.18 * step(0.2, px.x) * step(0.2, px.y), 1.0 - smoothstep(0.5, 2.0, fwidth(vUv.x) * 256.0));
        col *= led * uGain * uOn;
        col = mix(col, vec3(1.0, 0.96, 0.9) * 2.0, uFlash);
        // off screens: dark glass
        col = mix(vec3(0.03, 0.035, 0.05), col, uOn);
        writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), vDepth, 160.0);
      }
    `,
  });
}

// vols: from buildBuildings; targets: [{ p: Vector3, n, dmin, dmax }] — where the screens should face
export function buildScreens(vols, targets, uiTex) {
  const ads = adCanvases();
  const rng = new Rng(2611);
  const used = new Set();
  const picked = [];
  for (const T of targets) {
    const cand = [];
    for (let i = 0; i < vols.length; i++) {
      const V = vols[i];
      if (V.part !== 0 || V.y1 < 70 || V.y1 > 360 || V.kind === 2 || V.kind === 3 || used.has(V)) continue;
      const d = Math.hypot(V.cx - T.p.x, V.cz - T.p.z);
      if (d < T.dmin || d > T.dmax) continue;
      const ring = V.ring;
      for (let k = 0; k < ring.length; k++) {
        const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 26) continue;
        const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const tx = T.p.x - mx, tz = T.p.z - mz, tl = Math.hypot(tx, tz);
        const f = (nx * tx + nz * tz) / tl;
        if (f < 0.7) continue;
        cand.push({ V, score: f * Math.min(len, 60) * Math.min(1, V.y1 / 140) * (0.7 + 0.6 * rng.next()), mx, mz, nx, nz, len });
      }
    }
    cand.sort((a, b) => b.score - a.score);
    let n = 0;
    for (const c of cand) {
      if (n >= T.n) break;
      if (picked.some((p) => Math.hypot(p.mx - c.mx, p.mz - c.mz) < T.gap)) continue;
      picked.push(c); used.add(c.V); n++;
    }
  }
  const grp = new THREE.Group();
  const screens = [];
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bezU = { ...G, ...CU };
  const bezel = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: bezU,
    vertexShader: /* glsl */ `varying float vDepth; varying vec3 vN; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      uniform float uNight;
      varying float vDepth; varying vec3 vN;
      void main(){ if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        writeOut(mix(vec3(0.16, 0.17, 0.22), vec3(0.02, 0.02, 0.04), uNight), 1.0, normalize(vN), vDepth, 40.0); }
    `,
  });
  void bezelMat;
  picked.forEach((c, i) => {
    const sw = Math.min(c.len * 0.78, 64);
    const sh = sw / 2;
    const y = Math.max(sh / 2 + 30, Math.min(c.V.y1 - sh / 2 - 8, c.V.y1 * (0.55 + 0.25 * rng.next())));
    const mat = screenMaterial(ads[i % ads.length], uiTex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
    const ang = Math.atan2(c.nx, c.nz);
    m.position.set(c.mx + c.nx * 1.6, y, c.mz + c.nz * 1.6);
    m.rotation.y = ang;
    const bz = new THREE.Mesh(new THREE.BoxGeometry(sw + 2.4, sh + 2.4, 1.2), bezel);
    bz.position.set(c.mx + c.nx * 0.9, y, c.mz + c.nz * 0.9);
    bz.rotation.y = ang;
    grp.add(bz, m);
    screens.push({ m, mat, p: m.position.clone(), n: new THREE.Vector3(c.nx, 0, c.nz), w: sw });
  });
  return { grp, screens };
}
