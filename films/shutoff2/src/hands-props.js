// Props held or worn by people: a modern phone and 林工's smartwatch.
import * as THREE from 'three';
import { G, COMMON, MRT_OUT, VERT_STD } from './glsl.js';
import { toonMaterial } from './materials.js';

function rrect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
// extruded rounded slab lying flat: footprint w (x) × h (z), thickness along +y from y0
function slab(w, h, r, t, bevel, y0 = 0, seg = 10) {
  const g = new THREE.ExtrudeGeometry(rrect(w - 2 * bevel, h - 2 * bevel, Math.max(0.0002, r - bevel)), {
    depth: Math.max(1e-5, t - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: seg,
  });
  g.rotateX(-Math.PI / 2);        // shape xy → xz, extrude along +y
  g.translate(0, y0 + bevel, 0);
  g.computeVertexNormals();
  return g;
}
// flat rounded rect facing +y with uv 0..1 across it (u → +x, v → −z, so the canvas top sits at −z)
function screenGeo(w, h, r) {
  const g = new THREE.ShapeGeometry(rrect(w, h, r), 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  g.rotateX(-Math.PI / 2);
  return g;
}

// Emissive glass screen: shows a canvas, `glow` scales it; a faint sheen sells the glass when it is dark.
export function screenMaterial(o = {}) {
  const u = {
    ...G,
    uTex: { value: null }, uHas: { value: 0 }, uGlow: { value: 1 }, uGain: { value: o.gain ?? 1.0 },
    uOff: { value: new THREE.Color(o.off ?? '#07080c') }, uId: { value: o.id ?? 60 }, uSheen: { value: o.sheen ?? 0.035 },
  };
  const vs = /* glsl */ `${VERT_STD}\n void main(){ stdVertex(position, normal); }`;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    uniform sampler2D uTex; uniform float uHas, uGlow, uGain, uId, uSheen; uniform vec3 uOff;
    varying vec3 vWorld, vNormalW, vNormalV; varying float vDepth; varying vec2 vUv;
    void main(){
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 N = normalize(vNormalW); vec3 NV = normalize(vNormalV);
      vec3 c = uOff;
      if(uHas > 0.5) c = mix(uOff, texture(uTex, vUv).rgb * uGain, clamp(uGlow, 0.0, 1.0)) + texture(uTex, vUv).rgb * uGain * max(uGlow - 1.0, 0.0);
      vec3 V = normalize(cameraPosition - vWorld);
      vec3 R = reflect(-V, N);
      float sheen = smoothstep(0.86, 0.99, dot(R, normalize(uKeyDir + vec3(0.0, 0.3, 0.0)))) * uSheen;
      c += mix(uSkyTint, uSunColor, 0.5) * sheen * (1.0 - 0.6 * clamp(uGlow, 0.0, 1.0));
      writeOut(c, 1.0, NV, vDepth, uId);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.FrontSide });
}

function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---------------------------------------------------------------- phone
// 0.0715 × 0.147 × 0.008 m. Origin = centre of the back, screen faces +y, the screen's top edge toward −z.
export function makePhone(o = {}) {
  const W = 0.0715, H = 0.147, T = 0.008, R = 0.0105;
  const root = new THREE.Group();
  const body = new THREE.Mesh(slab(W, H, R, T, 0.0014, 0, 12), toonMaterial({ color: o.color ?? '#2b2f39', id: o.id ?? 61, spec: 0.8, rim: 0.25 }));
  root.add(body);
  // metal band along the sides (slightly lighter, catches rim light)
  const band = new THREE.Mesh(slab(W + 0.0003, H + 0.0003, R + 0.00015, T * 0.46, 0.0004, T * 0.27, 12), toonMaterial({ color: o.band ?? '#8b909c', id: (o.id ?? 61) + 1, spec: 1, rim: 0.5 }));
  root.add(band);
  // buttons
  const btnM = toonMaterial({ color: '#7d828e', id: (o.id ?? 61) + 1, spec: 1 });
  for (const [z, l] of [[-0.028, 0.012], [-0.044, 0.012]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0022, l), btnM); b.position.set(-W / 2 - 0.0004, T * 0.5, z); root.add(b); }
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0022, 0.02), btnM); b.position.set(W / 2 + 0.0004, T * 0.5, -0.034); root.add(b); }
  // camera bump on the back
  const bump = new THREE.Mesh(slab(0.031, 0.031, 0.007, 0.0016, 0.0005, -0.0013, 10), toonMaterial({ color: '#3a3f4b', id: (o.id ?? 61) + 2, spec: 0.8 }));
  bump.position.set(-W / 2 + 0.0205, 0, -H / 2 + 0.0205); root.add(bump);
  const lensM = toonMaterial({ color: '#0d0f14', id: (o.id ?? 61) + 3, spec: 1 });
  const ringM = toonMaterial({ color: '#9aa0ac', id: (o.id ?? 61) + 4, spec: 1 });
  for (const [dx, dz] of [[-0.0072, -0.0072], [0.0072, 0.0072], [-0.0072, 0.0072]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.0011, 24), ringM); ring.position.set(bump.position.x + dx, -0.0019, bump.position.z + dz); root.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.0012, 24), lensM); lens.position.set(bump.position.x + dx, -0.0021, bump.position.z + dz); root.add(lens);
  }
  // screen
  const SH = 0.1436, SW = SH * 720 / 1560;
  const smat = screenMaterial({ id: (o.id ?? 61) + 5, gain: o.gain ?? 1.0 });
  const screen = new THREE.Mesh(screenGeo(SW, SH, 0.0092), smat);
  screen.position.y = T + 0.00025; root.add(screen);
  let tex = null, lastCanvas = null;
  return {
    root, screen, size: [W, T, H],
    // canvas: HTMLCanvasElement (720×1560) or null (screen off); glow 0..1 (>1 overdrives)
    setScreen(canvas, glow = 1) {
      if (canvas) {
        if (canvas !== lastCanvas) { tex?.dispose(); tex = canvasTex(canvas); lastCanvas = canvas; smat.uniforms.uTex.value = tex; }
        tex.needsUpdate = true;
        smat.uniforms.uHas.value = 1;
      } else smat.uniforms.uHas.value = 0;
      smat.uniforms.uGlow.value = glow;
    },
  };
}

// ---------------------------------------------------------------- watch
// A rectangular smartwatch on an elliptical wrist section (a = half width along z, b = half thickness along y).
// Origin = centre of the wrist section under the case; the case sits on +y; the display's top (12 o'clock) faces −z,
// its right (3 o'clock, the crown side) faces +x. Display canvas 400 × 480.
export function makeWatch(o = {}) {
  const a = o.a ?? 0.0299, b = o.b ?? 0.0196;
  const root = new THREE.Group();
  const CW = 0.0375, CH = 0.0445, CT = 0.0095;        // case: width along x (3–9), height along z (12–6)
  const caseM = toonMaterial({ color: o.caseColor ?? '#c3c7cf', id: o.id ?? 66, spec: 1, rim: 0.55 });
  const y0 = b + 0.0012;
  const kase = new THREE.Mesh(slab(CW, CH, 0.0098, CT, 0.0024, y0, 14), caseM); root.add(kase);
  // black glass dome
  const glass = new THREE.Mesh(slab(CW - 0.0016, CH - 0.0016, 0.0091, 0.0016, 0.0007, y0 + CT - 0.001, 14), toonMaterial({ color: '#06070a', id: (o.id ?? 66) + 1 }));
  root.add(glass);
  const DH = 0.0362, DW = DH * 400 / 480;
  const smat = screenMaterial({ id: (o.id ?? 66) + 2, gain: o.gain ?? 1.0, sheen: 0.1 });
  const disp = new THREE.Mesh(screenGeo(DW, DH, 0.0068), smat);
  disp.position.y = y0 + CT + 0.0006 + 0.0003; root.add(disp);
  // digital crown + side button on the +x side
  const crownM = toonMaterial({ color: '#a9aeb8', id: (o.id ?? 66) + 3, spec: 1 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0028, 20), crownM);
  crown.rotation.z = Math.PI / 2; crown.position.set(CW / 2 + 0.0012, y0 + CT * 0.55, -0.006); root.add(crown);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0034, 0.00035, 6, 20), toonMaterial({ color: '#d4573f', id: (o.id ?? 66) + 4 }));
  ring.rotation.y = Math.PI / 2; ring.position.set(CW / 2 + 0.0027, y0 + CT * 0.55, -0.006); root.add(ring);
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0032, 0.011), crownM); btn.position.set(CW / 2 + 0.0004, y0 + CT * 0.5, 0.007); root.add(btn);
  // band: swept around the wrist ellipse from one lug to the other
  const BW = 0.0215, BT = 0.0031;
  const bandGeo = (() => {
    const seg = 96, pos = [], nrm = [], idx = [];
    const th0 = Math.asin(Math.min(0.99, (CH / 2 - 0.004) / (a + BT))), th1 = Math.PI * 2 - th0;
    const ring = [];
    for (let i = 0; i <= seg; i++) {
      const th = th0 + (th1 - th0) * (i / seg);   // th = 0 at +y (under the case)
      const ca = Math.cos(th), sa = Math.sin(th);
      // inner point on the ellipse (+ a little gap), outward normal
      const ri = 0.0007;
      const iy = (b + ri) * ca, iz = -(a + ri) * sa;
      let ny = ca / (b + ri), nz = -sa / (a + ri); const nl = Math.hypot(ny, nz); ny /= nl; nz /= nl;
      // near the lugs, lift the band to meet the case
      const lugK = Math.max(0, 1 - Math.min(th - th0, th1 - th) / 0.35);
      const lift = lugK * lugK * (y0 + CT * 0.35 - iy) * (ca > 0 ? 1 : 0);
      ring.push([iy + lift, iz, ny, nz]);
    }
    const prof = [[-BW / 2, 0], [BW / 2, 0], [BW / 2, BT], [-BW / 2, BT]];
    const pn = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    // four strips (inner, +x side, outer, −x side) with hard normals
    for (let s = 0; s < 4; s++) {
      const base = pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const [iy, iz, ny, nz] = ring[i];
        for (const k of [s, (s + 1) % 4]) {
          const [px, pt] = prof[k];
          pos.push(px, iy + ny * pt, iz + nz * pt);
          const [qx, qt] = pn[s];
          nrm.push(qx, ny * qt, nz * qt);
        }
      }
      for (let i = 0; i < seg; i++) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  })();
  const bandM = toonMaterial({ color: o.bandColor ?? '#2c3446', id: (o.id ?? 66) + 5, spec: 0.3, side: THREE.DoubleSide });
  root.add(new THREE.Mesh(bandGeo, bandM));
  // band keeper loop and pin holes (small dark ellipses on the outer side)
  const holeM = toonMaterial({ color: '#141824', id: (o.id ?? 66) + 6 });
  for (let i = 0; i < 6; i++) {
    const th = Math.PI * 0.62 + i * 0.13;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 10), holeM);
    const yy = (b + 0.0007 + BT + 0.0001) * Math.cos(th), zz = -(a + 0.0007 + BT + 0.0001) * Math.sin(th);
    hole.position.set(0, yy, zz);
    hole.lookAt(new THREE.Vector3(0, yy * 2, zz * 2));
    root.add(hole);
  }
  const keeper = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 24), bandM);
  keeper.scale.set(BW * 0.56, BW * 0.56, 0.012);
  root.add(keeper);
  keeper.visible = false;
  let tex = null, lastCanvas = null;
  return {
    root, display: disp,
    setScreen(canvas, glow = 1) {
      if (canvas) {
        if (canvas !== lastCanvas) { tex?.dispose(); tex = canvasTex(canvas); lastCanvas = canvas; smat.uniforms.uTex.value = tex; }
        tex.needsUpdate = true; smat.uniforms.uHas.value = 1;
      } else smat.uniforms.uHas.value = 0;
      smat.uniforms.uGlow.value = glow;
    },
  };
}
