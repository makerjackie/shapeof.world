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
        if (len < 32) continue;
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
    const sw = Math.min(c.len * 0.82, 88);
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

// Rooftop name signs on the towers (the city's own, never amber): red, white and blue characters on the crowns.
// Lit at night; by day they are plain coloured letters on the facade.
const SIGNS = [['福田中心', '#ff4a3d'], ['国际大厦', '#f4f6ff'], ['金融中心', '#ff4a3d'], ['科技大厦', '#6fb6ff'], ['商务中心', '#f4f6ff'], ['湾区广场', '#ff5ab4'], ['信息港', '#6fb6ff'], ['大酒店', '#ff4a3d']];
export function buildRoofSigns(vols, targets) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 128 * SIGNS.length;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  SIGNS.forEach(([t, col], i) => {
    c.font = '800 104px "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';
    c.fillStyle = col;
    c.fillText(t, 512, i * 128 + 66, 980);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const rng = new Rng(8812);
  const P = [], UV = [], I = [];
  const used = new Set();
  for (const T of targets) {
    const cand = [];
    for (const V of vols) {
      if (V.part !== 0 || V.y1 < T.hmin || V.y1 < V.top - 16 || used.has(V)) continue;
      const d = Math.hypot(V.cx - T.p.x, V.cz - T.p.z);
      if (d < T.dmin || d > T.dmax) continue;
      if (T.dir && ((V.cx - T.p.x) * T.dir[0] + (V.cz - T.p.z) * T.dir[1]) / d < Math.cos(T.cone)) continue;
      for (let k = 0; k < V.ring.length; k++) {
        const [x0, z0] = V.ring[k], [x1, z1] = V.ring[(k + 1) % V.ring.length];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 22) continue;
        const nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const tl = Math.hypot(T.p.x - mx, T.p.z - mz);
        if ((nx * (T.p.x - mx) + nz * (T.p.z - mz)) / tl < 0.75) continue;
        cand.push({ V, mx, mz, nx, nz, len, score: len * (0.5 + rng.next()) });
      }
    }
    cand.sort((a, b) => b.score - a.score);
    let n = 0;
    for (const cd of cand) {
      if (n >= T.n) break;
      used.add(cd.V); n++;
      const k = Math.floor(rng.next() * SIGNS.length);
      const w = Math.min(cd.len * 0.8, 46), h = w / 8;
      const y = cd.V.y1 - h * 0.5 - 2.5;
      const cx = cd.mx + cd.nx * 0.7, cz = cd.mz + cd.nz * 0.7;
      const tx = -cd.nz, tz = cd.nx;          // along the wall, left → right seen from outside
      const base = P.length / 3;
      P.push(cx - tx * w / 2, y - h / 2, cz - tz * w / 2, cx + tx * w / 2, y - h / 2, cz + tz * w / 2, cx + tx * w / 2, y + h / 2, cz + tz * w / 2, cx - tx * w / 2, y + h / 2, cz - tz * w / 2);
      const v0 = 1 - (k + 1) / SIGNS.length, v1 = 1 - k / SIGNS.length;
      UV.push(0, v0, 1, v0, 1, v1, 0, v1);
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  const u = { ...G, ...CU, uMap: { value: tex } };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vDepth; varying vec3 vWorld; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vec4 mv = viewMatrix * wp; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${MRT_OUT}
      ${CITY_GLSL}
      uniform sampler2D uMap;
      varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
      void main(){
        vec4 t = texture(uMap, vUv);
        if(t.a < 0.4) discard;
        if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
        vec3 day = t.rgb * mix(uShadeTint, vec3(1.0), 0.5) * 0.85;
        vec3 night = t.rgb * 2.3;
        vec3 col = mix(day, night, uNight);
        float glow; float front = ringFront(vWorld, glow);
        float rv = clamp(step(0.0, front), 0.0, 1.0);
        col = mix(col, vec3(1.0, 0.71, 0.278) * 1.6, rv);
        writeOut(col, 1.0, vec3(0.0, 0.0, 1.0), vDepth < 150.0 ? vDepth : 150.0 + (vDepth - 150.0) * mix(0.62, 0.3, uNight), 160.0);
      }
    `,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  return m;
}
