import * as THREE from 'three';
import { G, COMMON, MRT_OUT } from './glsl.js';
import { CU, CITY_GLSL } from './city-glsl.js';

// The city's buildings: real Futian/Luohu footprints and heights (OSM, via the old film's city build), extruded into one
// merged mesh. Towers get setbacks, mechanical penthouses and the decorative roof frames Shenzhen's housing towers wear.
// One shader paints every facade by kind and style (glass curtain walls with mullions, fins, ribbon windows, stone grids,
// tiled housing with balconies and AC boxes, urban-village blocks), in three moods: day, night in rain, and 安's data view.

export function readBld(buf) {
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), np = dv.getUint32(4, true);
  return { n, info: new Float32Array(buf, 8, n * 7), offs: new Uint32Array(buf, 8 + n * 28, n + 1), pts: new Float32Array(buf, 8 + n * 28 + (n + 1) * 4, np * 2) };
}

function convex(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], [x2, z2] = ring[(i + 2) % ring.length];
    const c = (x1 - x0) * (z2 - z1) - (z1 - z0) * (x2 - x1);
    if (Math.abs(c) < 1e-6) continue;
    const sg = Math.sign(c);
    if (s === 0) s = sg; else if (sg !== s) return false;
  }
  return true;
}
function inradius(ring, cx, cz) {
  let r = 1e9;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length];
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1;
    r = Math.min(r, Math.abs((cx - x0) * dz - (cz - z0) * dx) / L);
  }
  return r;
}
const shrink = (ring, cx, cz, f) => ring.map(([x, z]) => [cx + (x - cx) * f, cz + (z - cz) * f]);

// excl: [[x, z, r], ...] — clear these discs (the HQ site, 林工's own block)
export function buildBuildings(B, excl, rects = [], lowers = []) {
  const vols = [];   // { ring, y0, y1, kind, seed, style, top, part, cx, cz }
  const keep = [];
  for (let i = 0; i < B.n; i++) {
    const cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
    if (excl.some(([x, z, r]) => Math.hypot(cx - x, cz - z) < r)) continue;
    keep.push(i);
  }
  for (const i of keep) {
    const o0 = B.offs[i], o1 = B.offs[i + 1];
    const ring = [];
    for (let k = o0; k < o1; k++) ring.push([B.pts[k * 2], B.pts[k * 2 + 1]]);
    if (ring.length < 3) continue;
    let h = B.info[i * 7], kind = B.info[i * 7 + 1];
    const seed = B.info[i * 7 + 2], base = B.info[i * 7 + 6];
    const cx = B.info[i * 7 + 4], cz = B.info[i * 7 + 5];
    // the view corridor north of the HQ: towers there become low podiums (malls, a library), so the window sees the CBD
    if (rects.some(([x0, z0, x1, z1]) => cx > x0 && cx < x1 && cz > z0 && cz < z1)) { if (base > 1) continue; h = Math.min(h, 16 + 14 * ((seed * 5.77) % 1)); if (kind === 4) kind = 0; }
    // 林工's neighbours: kept under his eye line so his window sees over their roofs to the CBD
    for (const [lx, lz, lr, lh] of lowers) if (Math.hypot(cx - lx, cz - lz) < lr && h > lh) { if (base > 1) h = -1; else h = lh - 6 * ((seed * 3.3) % 1); }
    if (h < 0) continue;
    const r1 = (seed * 7.31) % 1, r2 = (seed * 13.7) % 1, r3 = (seed * 3.17) % 1;
    let style;
    if (kind === 0 || kind === 4) style = h > 140 ? (r1 < 0.45 ? 0 : r1 < 0.8 ? 1 : 2) : (r1 < 0.3 ? 0 : r1 < 0.5 ? 1 : r1 < 0.72 ? 2 : 3);
    else if (kind === 1) style = r1 < 0.55 ? 4 : r1 < 0.8 ? 5 : 6;
    else if (kind === 2) style = 7;
    else style = 8;
    const v = (ring, y0, y1, part) => vols.push({ ring, y0, y1, kind, seed, style, top: h, part, cx, cz });
    const tall = h > 85 && base < 1 && ring.length <= 20 && convex(ring);
    const ir = tall ? inradius(ring, cx, cz) : 0;
    if (tall && ir > 9 && (kind === 0 || kind === 4)) {
      // office tower: shaft, a setback, a mechanical crown (sometimes a lattice frame or a mast)
      const sb = r2 < 0.55;
      const crownH = Math.min(14, h * 0.06 + 4);
      const s1 = h - crownH;
      if (sb) {
        const s0 = h * (0.8 + 0.08 * r3);
        v(ring, base, s0, 0);
        v(shrink(ring, cx, cz, 1 - 2.6 / ir), s0, s1, 0);
        v(shrink(ring, cx, cz, 1 - 6.5 / ir), s1, h, 3);
      } else {
        v(ring, base, s1, 0);
        if (r3 < 0.5) v(ring, s1, h, 2);                                      // lattice crown frame flush with the facade
        else v(shrink(ring, cx, cz, 1 - 5 / ir), s1, h, 3);
      }
      if (h > 200 && r2 > 0.8) v(shrink(ring, cx, cz, 2.2 / ir), h, h + h * 0.12, 3);   // a mast
    } else if (tall && ir > 6 && kind === 1) {
      // housing tower: the decorative open roof frame ("hat") over a small penthouse
      const fH = 6 + 4 * r2;
      v(ring, base, h - fH, 0);
      v(ring, h - fH, h, 2);
      v(shrink(ring, cx, cz, 0.45), h - fH, h - fH + 3.2, 3);
    } else {
      v(ring, base, h, 0);
    }
  }

  // ---- count and fill
  let nv = 0, ni = 0;
  for (const V of vols) { const m = V.ring.length; nv += m * 4 + m; ni += m * 6 + (m - 2) * 3; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3);
  const AP = new Float32Array(nv * 4), AB = new Float32Array(nv * 4), AC = new Float32Array(nv * 4);
  const I = new Uint32Array(ni);
  let v = 0, ii = 0;
  const put = (x, y, z, nx, ny, nz, p0, p1, p2, p3, V) => {
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
    N[v * 3] = nx; N[v * 3 + 1] = ny; N[v * 3 + 2] = nz;
    AP[v * 4] = p0; AP[v * 4 + 1] = p1; AP[v * 4 + 2] = p2; AP[v * 4 + 3] = p3;
    AB[v * 4] = V.kind; AB[v * 4 + 1] = V.seed; AB[v * 4 + 2] = V.style; AB[v * 4 + 3] = V.top;
    AC[v * 4] = V.cx; AC[v * 4 + 1] = V.cz; AC[v * 4 + 2] = V.y0; AC[v * 4 + 3] = V.y1;
    return v++;
  };
  for (const V of vols) {
    const { ring, y0, y1 } = V;
    const m = ring.length;
    let u = 0;
    for (let e = 0; e < m; e++) {
      const [x0, z0] = ring[e], [x1, z1] = ring[(e + 1) % m];
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1e-3;
      const nx = dz / len, nz = -dx / len;
      const a = put(x0, y0, z0, nx, 0, nz, 0, len, u, V.part, V);
      const b = put(x1, y0, z1, nx, 0, nz, len, len, u, V.part, V);
      const c = put(x1, y1, z1, nx, 0, nz, len, len, u, V.part, V);
      const d = put(x0, y1, z0, nx, 0, nz, 0, len, u, V.part, V);
      I[ii++] = a; I[ii++] = c; I[ii++] = b;
      I[ii++] = a; I[ii++] = d; I[ii++] = c;
      u += len;
    }
    if (V.part === 2) continue;   // open frames have no lid
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
    const base = v;
    for (const [x, z] of ring) put(x, y1, z, 0, 1, 0, 0, 0, 0, 1, V);
    for (const [a, b, c] of tris) {
      const ax = ring[a][0], az = ring[a][1];
      const cr = (ring[b][0] - ax) * (ring[c][1] - az) - (ring[b][1] - az) * (ring[c][0] - ax);
      I[ii++] = base + a;
      if (cr < 0) { I[ii++] = base + b; I[ii++] = base + c; } else { I[ii++] = base + c; I[ii++] = base + b; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P.subarray(0, v * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N.subarray(0, v * 3), 3));
  g.setAttribute('aP', new THREE.BufferAttribute(AP.subarray(0, v * 4), 4));
  g.setAttribute('aB', new THREE.BufferAttribute(AB.subarray(0, v * 4), 4));
  g.setAttribute('aC', new THREE.BufferAttribute(AC.subarray(0, v * 4), 4));
  g.setIndex(new THREE.BufferAttribute(I.subarray(0, ii), 1));
  return { geo: g, vols };
}

// Height raster for the long-shadow march: R = height / 620, G = footprint.
export function heightRaster(vols, box, W, H, extra = []) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const sx = W / (box[2] - box[0]), sz = H / (box[3] - box[1]);
  const L = vols.map((V) => [V.y1, V.ring]).concat(extra).sort((a, b) => a[0] - b[0]);
  for (const [h, ring] of L) {
    const r = Math.min(255, Math.round((h / 620) * 255));
    c.fillStyle = `rgb(${r},255,0)`;
    c.beginPath();
    ring.forEach(([x, z], i) => { const px = (x - box[0]) * sx, pz = (z - box[1]) * sz; if (i) c.lineTo(px, pz); else c.moveTo(px, pz); });
    c.closePath();
    c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return { tex: t, canvas: cv };
}

// ------------------------------------------------------------------------------------------------ the facade shader
export const FACADE_GLSL = /* glsl */ `
// palettes (linear-ish sRGB values; the grade lifts them)
vec3 glassTint(float r){
  vec3 a = vec3(0.50, 0.70, 0.92), b = vec3(0.50, 0.78, 0.80), c = vec3(0.70, 0.80, 0.92), d = vec3(0.36, 0.52, 0.80);
  return r < 0.3 ? a : r < 0.5 ? b : r < 0.78 ? c : d;
}
vec3 frameCol(float r){ return r < 0.5 ? vec3(0.90, 0.92, 0.95) : r < 0.8 ? vec3(0.96, 0.96, 0.94) : vec3(0.42, 0.46, 0.56); }
vec3 stoneCol(float r){ return r < 0.3 ? vec3(0.92, 0.88, 0.80) : r < 0.55 ? vec3(0.86, 0.87, 0.89) : r < 0.8 ? vec3(0.90, 0.82, 0.70) : vec3(0.86, 0.74, 0.70); }
vec3 houseCol(float r){
  return r < 0.22 ? vec3(0.95, 0.94, 0.91) : r < 0.42 ? vec3(0.94, 0.89, 0.79) : r < 0.56 ? vec3(0.95, 0.88, 0.70)
       : r < 0.7 ? vec3(0.86, 0.87, 0.90) : r < 0.85 ? vec3(0.93, 0.83, 0.79) : vec3(0.80, 0.85, 0.90);
}
vec3 villageCol(float r){ return r < 0.3 ? vec3(0.91, 0.90, 0.87) : r < 0.55 ? vec3(0.86, 0.79, 0.68) : r < 0.75 ? vec3(0.88, 0.74, 0.68) : vec3(0.78, 0.78, 0.80); }

struct Fac { vec3 albedo; float glass; float lightable; vec2 cell; float accent; vec2 uvc; };

// The facade pattern for this pixel. U = metres along the perimeter, Y = metres up, s = style, seed, mpp = metres per pixel.
Fac facade(float U, float Y, float s, float seed, float mpp, float part, float y1){
  Fac F; F.glass = 0.0; F.lightable = 0.0; F.cell = vec2(0.0); F.accent = 0.0; F.uvc = vec2(0.5);
  float r1 = fract(seed * 7.31), r2 = fract(seed * 13.7), r3 = fract(seed * 3.17), r4 = fract(seed * 21.3);
  if(s < 3.5){
    float fh = 4.2;
    float fy = fract(Y / fh);
    F.cell = floor(vec2(U / 1.5, Y / fh));
    F.uvc = vec2(fract(U / 1.5), fy);
    float slabAA = clamp(mpp / fh * 1.5, 0.002, 0.5);
    if(s < 0.5){
      // glass grid: slim bright mullions every 1.5 m, a spandrel band at each slab
      float mx = abs(fract(U / 1.5) - 0.5) * 1.5;                 // m from the mullion line (at cell edges)
      float mull = 1.0 - smoothstep(0.7 - max(mpp, 0.04), 0.7, 0.75 - mx);
      mull = 1.0 - smoothstep(0.05, 0.05 + mpp, 0.75 - mx);
      float span = smoothstep(0.86 - slabAA, 0.86, fy) + (1.0 - smoothstep(0.0, slabAA, fy));
      span = clamp(span, 0.0, 1.0);
      float far = smoothstep(0.08, 0.25, mpp);
      F.glass = (1.0 - max(mull * (1.0 - far), span * 0.8)) ;
      F.albedo = frameCol(r2);
    } else if(s < 1.5){
      // vertical fins every 3 m (light stone/aluminium), glass between
      float fx = fract(U / 3.0);
      float fin = 1.0 - smoothstep(0.1, 0.1 + mpp / 3.0, abs(fx - 0.5) * 2.0 - 0.82);
      fin = smoothstep(0.82 - mpp / 3.0, 0.82, abs(fx - 0.5) * 2.0);
      float span = smoothstep(0.9 - slabAA, 0.9, fy);
      F.glass = 1.0 - max(fin, span * 0.6);
      F.albedo = mix(stoneCol(r2), frameCol(r2), 0.5);
      F.accent = fin * sign(fx - 0.5);
    } else if(s < 2.5){
      // ribbon windows: pale spandrel bands, a continuous glass strip
      float band = smoothstep(0.58 - slabAA, 0.58, fy) * (1.0 - smoothstep(0.98 - slabAA, 0.98, fy));
      F.glass = 1.0 - band;
      F.glass *= 1.0 - (1.0 - smoothstep(0.03, 0.03 + mpp / 1.8, abs(fract(U / 1.8) - 0.5) * 1.8 - 0.83)) * 0.0;
      F.albedo = r2 < 0.6 ? vec3(0.93, 0.94, 0.95) : stoneCol(r3);
    } else {
      // 90s stone grid: punched windows in a cream/grey stone frame
      vec2 c = vec2(fract(U / 3.0), fy);
      float win = smoothstep(0.18 - mpp / 3.0, 0.18, c.x) * (1.0 - smoothstep(0.82, 0.82 + mpp / 3.0, c.x)) *
                  smoothstep(0.22 - slabAA, 0.22, c.y) * (1.0 - smoothstep(0.84, 0.84 + slabAA, c.y));
      float far = smoothstep(0.15, 0.4, mpp);
      F.glass = mix(win, 0.42, far);
      F.albedo = stoneCol(r2);
      F.cell = floor(vec2(U / 3.0, Y / fh));
      F.uvc = vec2((c.x - 0.18) / 0.64, (c.y - 0.22) / 0.62);
    }
    F.lightable = F.glass;
  } else if(s < 6.5){
    // housing: tile walls, paired windows, balconies with railings, AC boxes
    float fh = 3.0;
    float sp = s < 4.5 ? 3.6 : s < 5.5 ? 4.2 : 3.2;
    vec2 c = vec2(fract(U / sp), fract(Y / fh));
    F.cell = floor(vec2(U / sp, Y / fh));
    F.uvc = c;
    float rc = hash12(F.cell + seed);
    float aaX = clamp(mpp / sp * 1.2, 0.002, 0.5), aaY = clamp(mpp / fh * 1.2, 0.002, 0.5);
    float ww = s < 4.5 ? 0.62 : s < 5.5 ? 0.8 : 0.42;
    float win = smoothstep(0.5 - ww * 0.5 - aaX, 0.5 - ww * 0.5, c.x) * (1.0 - smoothstep(0.5 + ww * 0.5, 0.5 + ww * 0.5 + aaX, c.x)) *
                smoothstep(0.3 - aaY, 0.3, c.y) * (1.0 - smoothstep(0.86, 0.86 + aaY, c.y));
    vec3 wall = houseCol(r2);
    // vertical slot / accent stripes (the paint colour of each estate)
    float stripe = step(0.82, fract(U / (sp * 4.0) + r3)) * step(0.5, r4);
    wall = mix(wall, wall * vec3(0.86, 0.88, 0.95), stripe);
    // balcony slab + railing band on alternating bays
    float balc = step(0.45, fract(F.cell.x * 0.5 + r3)) * (s < 5.5 ? 1.0 : 0.0);
    float rail = balc * smoothstep(0.0, aaY, c.y) * (1.0 - smoothstep(0.3, 0.3 + aaY, c.y));
    float ac = step(0.72, rc) * step(abs(c.x - 0.12) * sp, 0.4) * step(abs(c.y - 0.2) * fh, 0.3);
    float far = smoothstep(0.12, 0.35, mpp);
    F.glass = mix(win * (1.0 - rail), ww * 0.5, far);
    F.albedo = wall;
    F.albedo = mix(F.albedo, vec3(0.97, 0.97, 0.96), rail * (1.0 - far) * 0.8);
    F.albedo = mix(F.albedo, vec3(0.93, 0.93, 0.92), ac * (1.0 - far));
    F.accent = rail * (1.0 - far);
    F.lightable = win;
  } else if(s < 7.5){
    // urban-village block ("handshake buildings"): small windows, tile, stains, laundry
    float fh = 3.0, sp = 3.2;
    vec2 c = vec2(fract(U / sp), fract(Y / fh));
    F.cell = floor(vec2(U / sp, Y / fh));
    F.uvc = c;
    float aaX = clamp(mpp / sp * 1.2, 0.002, 0.5), aaY = clamp(mpp / fh * 1.2, 0.002, 0.5);
    float win = smoothstep(0.25 - aaX, 0.25, c.x) * (1.0 - smoothstep(0.72, 0.72 + aaX, c.x)) * smoothstep(0.35 - aaY, 0.35, c.y) * (1.0 - smoothstep(0.82, 0.82 + aaY, c.y));
    float far = smoothstep(0.12, 0.35, mpp);
    F.glass = mix(win, 0.3, far) * 0.7;
    vec3 wall = villageCol(r2);
    float stain = smoothstep(0.55, 0.8, fbm2(vec2(U * 0.15, Y * 0.05) + seed));
    F.albedo = mix(wall, wall * vec3(0.78, 0.77, 0.8), stain * 0.6);
    F.lightable = win;
  } else {
    // low halls: ribbed metal cladding
    float rib = smoothstep(0.4, 0.6, fract(U / 0.9));
    F.albedo = mix(vec3(0.74, 0.78, 0.84), vec3(0.92, 0.93, 0.94), r2) * (0.94 + 0.06 * rib * (1.0 - smoothstep(0.03, 0.1, mpp)));
    float band = smoothstep(0.6, 0.62, fract(Y / 6.0)) * (1.0 - smoothstep(0.9, 0.92, fract(Y / 6.0)));
    F.glass = band * 0.6;
    F.cell = floor(vec2(U / 4.0, Y / 6.0));
    F.lightable = band;
  }
  return F;
}
`;

export function facadeMaterial() {
  const u = { ...G, ...CU };
  const vs = /* glsl */ `
    attribute vec4 aP; attribute vec4 aB; attribute vec4 aC;
    varying vec4 vP, vB, vC;
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;
    void main(){
      vP = aP; vB = aB; vC = aC;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vNormalV = normalize(normalMatrix * normal);
      vec4 mv = viewMatrix * wp;
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fs = /* glsl */ `
    ${COMMON}
    ${MRT_OUT}
    ${CITY_GLSL}
    ${FACADE_GLSL}
    varying vec4 vP, vB, vC;
    varying vec3 vWorld, vNormalW, vNormalV;
    varying float vDepth;

    void main(){
      vec3 w = vWorld;
      float kind = vB.x, seed = vB.y, style = vB.z, top = vB.w;
      float part = vP.w;
      bool roof = part > 0.5 && part < 1.5;
      float U = vP.z + vP.x, Y = w.y;
      float mpp = length(fwidth(w));
      // the meeting-room window cut out of the HQ's north face (s26 starts inside the room)
      if(uHide.w > 0.5 && kind > 4.5 && abs(w.x) < uHide.x && w.y > uHide.y && w.y < uHide.z && w.z < 0.0) discard;
      // the lattice crown: open holes in the frame
      if(part > 1.5 && part < 2.5){
        float fx = fract(U / 3.0), fy = (Y - vC.z) / max(vC.w - vC.z, 1.0);
        float hole = step(0.18, fx) * step(fx, 0.82) * step(0.12, fy) * step(fy, 0.86);
        if(hole > 0.5 && mpp < 1.2) discard;
      }
      if(uPass > 0.5 && uPass < 1.5){ oColor = vec4(1); oData = vec4(0); return; }
      vec3 N = normalize(vNormalW);
      vec3 V = normalize(cameraPosition - w);
      float ndl = dot(N, uSunDir);
      float up = smoothstep(-0.6, 0.9, N.y);

      // ---------------- day / night colour
      vec3 col;
      Fac F;
      float r2 = fract(seed * 13.7), r3 = fract(seed * 3.17);
      if(roof){
        F.albedo = mix(vec3(0.78, 0.76, 0.74), vec3(0.70, 0.72, 0.70), r3);
        if(kind > 1.5 && kind < 2.5) F.albedo = mix(vec3(0.66, 0.62, 0.6), vec3(0.78, 0.74, 0.7), r2);
        // roof slabs and gravel blotches
        F.albedo *= 0.92 + 0.12 * fbm2(w.xz * 0.2 + seed);
        // roof finishes: paving slabs, gravel, a garden, rows of solar panels, a helipad on the tallest towers
        float rt = fract(seed * 29.3);
        float pxs = 1.0 - smoothstep(0.08, 0.35, mpp);
        vec2 sl = fract(w.xz / 2.0);
        F.albedo *= 1.0 - 0.06 * pxs * (1.0 - smoothstep(0.0, 0.06, min(min(sl.x, 1.0 - sl.x), min(sl.y, 1.0 - sl.y))));
        if(rt < 0.12 && kind < 1.5 && top < 120.0){
          vec2 b = vec2(fbm2(w.xz * 0.6 + seed), fbm2(w.xz * 0.6 + seed + 3.0));
          F.albedo = mix(vec3(0.30, 0.48, 0.34), vec3(0.50, 0.66, 0.38), smoothstep(0.4, 0.6, b.x));
        } else if(rt < 0.22 && kind < 1.5 && top < 160.0){
          float row = step(0.35, fract(dot(w.xz, vec2(0.7, 0.7)) / 2.6));
          F.albedo = mix(F.albedo, vec3(0.24, 0.30, 0.46), row * 0.85);
        }
        if(top > 150.0 && abs(vC.w - top) < 0.5 && kind < 4.5){
          float rr = length(w.xz - vC.xy);
          float ringH = 1.0 - smoothstep(0.35, 0.35 + mpp, abs(rr - 9.0));
          vec2 q = w.xz - vC.xy;
          float H = (step(abs(q.x - 2.5), 0.6) + step(abs(q.x + 2.5), 0.6) + step(abs(q.y), 0.5) * step(abs(q.x), 2.5)) * step(abs(q.y), 3.5) * step(abs(q.x), 3.1);
          F.albedo = mix(F.albedo, vec3(0.95, 0.93, 0.86), clamp(ringH + H, 0.0, 1.0) * step(rr, 12.0));
          F.albedo = mix(F.albedo, vec3(0.42, 0.44, 0.48), step(rr, 11.0) * (1.0 - clamp(ringH + H, 0.0, 1.0)) * 0.6);
        }
        F.glass = 0.0; F.lightable = 0.0; F.cell = vec2(0.0); F.accent = 0.0; F.uvc = vec2(0.5);
      } else if(part > 2.5){
        F.albedo = style < 3.5 ? vec3(0.82, 0.84, 0.88) : houseCol(r2) * 0.96;
        F.glass = 0.0; F.lightable = 0.0; F.cell = vec2(0.0); F.accent = 0.0; F.uvc = vec2(0.5);
        float louvre = step(0.5, fract(Y / 0.8));
        F.albedo *= 0.95 + 0.05 * louvre * (1.0 - smoothstep(0.05, 0.15, mpp));
      } else if(part > 1.5){
        F.albedo = style < 3.5 ? frameCol(r2) : houseCol(r2);
        F.glass = 0.0; F.lightable = 0.0; F.cell = vec2(0.0); F.accent = 0.0; F.uvc = vec2(0.5);
      } else {
        F = facade(U, Y, style, seed, mpp, part, vC.w);
      }
      // broad gouache variation
      float v1 = fbm2(vec2(U * 0.03 + seed * 9.0, Y * 0.02));
      F.albedo *= 0.94 + 0.1 * v1;

      vec3 dayC, nightC;
      {
        // ---- day: soft terminator, lavender shade, the long shadows of the neighbours
        float sh = ndl > -0.05 ? cityShadow(w, N) : 0.0;
        float lit = smoothstep(-0.03, 0.12, ndl) * sh;
        vec3 amb = mix(uShadeTint, uSkyTint, up * 0.45 + 0.22) * 0.9;
        // street-level occlusion: the bottom of every facade sits in the cool shade of the canyon
        float canyon = smoothstep(40.0, 0.0, Y) * (1.0 - up);
        amb *= 1.0 - 0.28 * canyon;
        vec3 sun = uSunColor * 0.5 * lit * uSunStrength;
        vec3 opaque = F.albedo * (amb * (1.0 - 0.1 * lit) + sun);
        // fins: one cheek lit, one in shade
        if(abs(F.accent) > 0.01 && style > 0.5 && style < 1.5){
          vec3 tang = normalize(vec3(-N.z, 0.0, N.x));
          float side = dot(tang, uSunDir) * F.accent;
          opaque *= side > 0.0 ? 1.06 : 0.86;
        }
        // ---- anime glass: flat painted tones with hard-edged reflection shapes (zenith blue / sky / horizon / city below)
        vec3 R = reflect(-V, N);
        float pj = hash12(F.cell + floor(seed * 10.0));
        float flo = hash12(vec2(floor(Y / 4.2), seed * 7.0));
        float ry = R.y + (pj - 0.5) * 0.025 + (flo - 0.5) * 0.04;
        float fr = max(fwidth(ry), 1e-4) * 1.2;
        vec3 tint = style < 3.5 ? glassTint(r3) : vec3(0.62, 0.70, 0.82);
        vec3 gDeep = tint * vec3(0.40, 0.50, 0.74);
        vec3 gMid = mix(tint, vec3(0.50, 0.68, 0.93), 0.5) * 0.9;
        vec3 gPale = mix(vec3(0.84, 0.91, 0.97), tint, 0.18);
        vec3 gDown = mix(tint * 0.5, vec3(0.46, 0.52, 0.66), 0.5);
        vec3 glass = mix(gDown, gPale, smoothstep(-0.1, -0.04, ry));
        glass = mix(glass, gMid, smoothstep(0.09 - fr, 0.09 + fr, ry));
        glass = mix(glass, gDeep, smoothstep(0.36 - fr, 0.36 + fr, ry));
        float az = atan(R.x, -R.z);
        float cl = smoothstep(0.56, 0.6, fbm2(vec2(az * 2.5 + seed * 5.0, ry * 5.0)));
        glass = mix(glass, vec3(0.95, 0.97, 1.0), cl * smoothstep(0.0, 0.05, ry) * 0.75);
        // big diagonal light shapes sliding across the curtain wall
        float dg = fract((U * 0.8 + Y) / 73.0 + seed * 3.0);
        float fdg = max(fwidth(dg), 1e-4);
        float dsh = smoothstep(0.62 - fdg, 0.62 + fdg, dg) * (1.0 - smoothstep(0.79 - fdg, 0.79 + fdg, dg))
                  + smoothstep(0.85 - fdg, 0.85 + fdg, dg) * (1.0 - smoothstep(0.89 - fdg, 0.89 + fdg, dg));
        glass = mix(glass, glass * 1.1 + 0.08, dsh * step(style, 3.5) * (1.0 - smoothstep(0.6, 3.0, mpp)));
        // interiors: dim rooms and ceiling light strips where the glass looks straight in
        float fy = fract(Y / (style < 3.5 ? 4.2 : 3.0));
        float look = smoothstep(0.55, 0.95, max(dot(N, V), 0.0)) * (1.0 - smoothstep(0.1, 0.3, mpp));
        vec3 inside = mix(tint * 0.5, vec3(0.62, 0.66, 0.74), 0.4) * (0.85 + 0.3 * pj);
        inside = mix(inside, vec3(0.88, 0.92, 0.96) * 0.8, (1.0 - smoothstep(0.0, 0.05, abs(fy - 0.82))) * step(0.3, pj));
        glass = mix(glass, inside, look * 0.3 * step(ry, 0.1));
        // light: sunlit glass warms and brightens, shaded glass drops into the lavender
        glass = mix(glass * vec3(0.70, 0.73, 0.88), glass * 1.04 + uSunColor * 0.07, lit);
        float glint = smoothstep(0.985, 0.995, dot(normalize(R), uSunDir)) * sh;
        glass = mix(glass, vec3(1.0, 0.98, 0.94) * 1.5, glint * 0.85);
        // window glass on housing: darker, with curtains
        if(style > 3.5){
          vec3 cur = mix(vec3(0.92, 0.9, 0.84), vec3(0.78, 0.84, 0.86), hash12(F.cell * 1.7 + seed));
          glass = mix(glass * 0.8, cur * (amb + sun * 0.5), step(0.7, hash12(F.cell + seed * 2.0)) * 0.6);
        }
        dayC = mix(opaque, glass, clamp(F.glass, 0.0, 1.0));
        // painted edge accents: lit corners catch a bright line, every parapet a pale lip
        if(!roof){
          float fwS = max(fwidth(vP.x), 1e-4), fwY = max(fwidth(Y), 1e-4);
          float cw = max(0.35, fwS * 0.8);
          float edgeL = 1.0 - smoothstep(cw, cw + fwS, min(vP.x, vP.y - vP.x));
          float lw = max(0.6, fwY * 0.9);
          float lip = 1.0 - smoothstep(lw, lw + fwY, vC.w - Y);
          vec3 hiC = F.albedo * (amb * 0.9 + sun * 1.1) + 0.05;
          dayC = mix(dayC, hiC, max(edgeL * lit, lip * mix(0.55, 1.0, lit)) * 0.8);
        }
        if(roof) dayC = F.albedo * (amb * 1.02 + sun);
      }
      {
        // ---- night in rain: dark violet walls, a deck-lit sheen, scattered lit windows of every warmth and strength
        float bt = fract(seed * 17.3);
        vec3 amb = mix(vec3(0.045, 0.045, 0.10), vec3(0.085, 0.075, 0.16), up);
        amb *= mix(vec3(1.0), vec3(1.08, 0.96, 1.1), bt);
        // the glow of the streets climbs the lower floors; the sky deck lights the upper ones
        amb += vec3(0.20, 0.11, 0.15) * exp(-Y / 34.0) * (1.0 - up);
        amb += vec3(0.04, 0.035, 0.07) * smoothstep(0.0, 1.0, Y / max(top, 1.0));
        vec3 opaque = F.albedo * amb;
        vec3 R = reflect(-V, N);
        vec3 glass = nightReflect(R) * 0.6;
        // homes light up as units (two or three windows together), offices by the floor
        vec2 unit = vec2(floor(F.cell.x / (style < 3.5 ? 4.0 : 3.0)), F.cell.y);
        float hr = mix(hash12(unit + seed * 5.0), hash12(F.cell + seed * 5.0), 0.25);
        float hb = hash12(unit * 1.37 + seed * 2.0);
        float floorH = hash12(vec2(F.cell.y, seed * 3.0));
        float p = style < 3.5 ? 0.05 : style < 6.5 ? 0.26 : style < 7.5 ? 0.3 : 0.04;
        if(kind > 4.5) p = 0.1;
        float on = step(hr, p);
        float officeFloor = step(floorH, 0.1) * step(0.2, fract(seed * 5.3));
        if(style < 3.5) on = max(on, officeFloor);
        on *= step(0.1, fract(seed * 9.1));
        vec3 warm = mix(vec3(1.0, 0.80, 0.58), vec3(1.0, 0.91, 0.78), hash12(F.cell * 3.1));
        vec3 cool = mix(vec3(0.78, 0.88, 1.0), vec3(0.93, 0.96, 1.0), hash12(F.cell * 2.3));
        float hc = hash12(F.cell * 5.7 + seed);
        vec3 lc = style < 3.5 ? cool : (hc < 0.12 ? vec3(0.50, 0.64, 1.0) : hc < 0.3 ? cool : warm);
        // strength: most rooms dim (a lamp, a screen), a few bright
        float lev = hb < 0.55 ? mix(0.25, 0.6, hb / 0.55) : mix(0.9, 2.4, (hb - 0.55) / 0.45);
        vec2 c = F.uvc;
        // ceiling light at the top of the pane, curtains with folds on some homes
        float grad = mix(0.7, 1.15, smoothstep(0.0, 1.0, c.y));
        float cur = step(0.55, hash12(F.cell * 2.9 + seed)) * step(3.5, style);
        float folds = 0.82 + 0.18 * sin(c.x * 40.0 + hr * 20.0);
        vec3 lit = lc * lev * grad * mix(1.0, folds * 0.8, cur);
        if(style < 3.5) lit *= mix(0.6, 1.25, smoothstep(0.75, 0.9, c.y)) ;
        float farW = smoothstep(0.2, 0.8, mpp);
        lit = mix(lit, lc * lev * 0.85, farW);
        glass = mix(glass, lit, on * F.lightable);
        nightC = mix(opaque, glass, clamp(F.glass, 0.0, 1.0));
        // rain sheen streaks down the glass
        float rs = vnoise(vec2(U * 1.3, Y * 0.04 + seed)) * vnoise(vec2(U * 0.31, Y * 0.2));
        nightC += vec3(0.09, 0.08, 0.15) * smoothstep(0.35, 0.6, rs) * (1.0 - up);
        // parapets catch the glow of the deck: a thin lip that separates one dark tower from the next
        if(!roof){
          float fwY = max(fwidth(Y), 1e-4);
          float lw = max(0.5, fwY * 0.9);
          nightC += vec3(0.16, 0.13, 0.24) * (1.0 - smoothstep(lw, lw + fwY, vC.w - Y));
        }
        // crown light bands on some towers (white / cyan / violet)
        if(top > 120.0 && fract(seed * 4.7) < 0.35 && !roof && kind < 4.5){
          float d = abs(Y - (top - 1.5));
          vec3 cc = fract(seed * 11.0) < 0.5 ? vec3(0.75, 0.95, 1.0) : vec3(0.85, 0.75, 1.0);
          nightC += cc * 2.2 * (1.0 - smoothstep(0.3, 0.3 + mpp * 1.5, d));
        }
        // 安's HQ: the lattice crown uplit in a cold violet-white, a thin amber line under it
        if(kind > 4.5 && part > 1.5){
          float hk = clamp((Y - 560.0) / 60.0, 0.0, 1.0);
          nightC = mix(vec3(0.42, 0.42, 0.62), vec3(0.08, 0.08, 0.16), hk) * (part > 2.5 ? 0.6 : 1.0);
        }
        // 安's HQ: a thin amber line under the crown, and the beacon on the mast
        if(kind > 4.5 && !roof){
          float d = abs(Y - 558.0);
          nightC += AMBER * 2.5 * (1.0 - smoothstep(0.6, 0.6 + mpp * 1.5, d));
        }
        if(roof) nightC = F.albedo * amb * 0.8;
      }
      col = mix(dayC, nightC, uNight);

      // ---------------- 安's view: the ring passes, the paint dissolves into a lattice of points and hairlines
      float glow;
      float front = ringFront(w, glow);
      float id = 0.0;
      if(front > -60.0 || glow > 0.01){
        vec2 pane = floor(vec2(U / 3.0, Y / 3.6));
        float th = hash12(pane + seed * 3.3) * 45.0 + 1.0;
        float rv = step(th, front);
        // data look
        float fh = style < 3.5 ? 4.2 : 3.0;
        vec2 cellM = vec2(3.0, fh);
        vec2 q = vec2(U, Y - vC.z);
        // window points with a level of detail: far away, ever larger cells keep one point each, so a distant tower
        // stays a scatter of distinct sparks instead of a smear of gold
        float cellPx = min(cellM.x, cellM.y) / max(mpp, 1e-4);
        float lodF = clamp(log2(4.0 / cellPx), 0.0, 5.0);
        float l0 = floor(lodF), fl = fract(lodF);
        vec3 dA = vec3(0.0);
        for(int li = 0; li < 2; li++){
          float L = l0 + float(li);
          vec2 cs = cellM * exp2(L);
          vec2 cid = floor(q / cs);
          vec2 jit = L > 0.5 ? (hash22(cid + seed + L * 7.0) - 0.5) * 0.6 : vec2(0.0);
          vec2 f = (fract(q / cs) - 0.5 - jit) * cs;
          float rr = max(0.24, mpp * 0.62);
          float da = 1.0 - smoothstep(rr - mpp * 0.5, rr + mpp * 0.5, length(f));
          float hc = hash12(cid + seed * 7.0 + L * 13.0);
          float alive = step(L > 0.5 ? 0.5 : 0.42, hc);
          float tw = (0.35 + 2.4 * pow(fract(hc * 17.0), 4.0)) * (1.0 + 0.35 * sin(uTime * 1.3 + hc * 40.0) * uBreath);
          tw *= L > 0.5 ? 1.5 : 1.0;
          vec3 c = hc > 0.9 ? vec3(0.95, 0.97, 1.0) * 2.2 : AMBER * 1.7;
          dA += c * da * alive * tw * (li == 0 ? 1.0 - fl : fl);
        }
        vec3 data = vec3(0.010, 0.013, 0.026) + vec3(0.02, 0.016, 0.03) * smoothstep(0.0, 300.0, Y);
        if(!roof && part < 1.5){
          data += dA;
          // hairlines: the vertical corners, the roof line, every third slab
          float fwS = fwidth(vP.x);
          float corner = max(hair(vP.x, fwS, 0.8), hair(vP.y - vP.x, fwS, 0.8));
          float fwY = fwidth(Y);
          float topL = hair(vC.w - Y, fwY, 0.9);
          float baseL = hair(Y - vC.z, fwY, 0.9) * step(0.5, vC.z);
          float slab = hair((fract((Y - vC.z) / (fh * 3.0) + 0.5) - 0.5) * fh * 3.0, fwY, 0.6) * 0.35 * smoothstep(1.2, 3.0, fh * 3.0 / max(mpp, 1e-4) / 6.0);
          // light climbing the corners of the towers
          float climb = corner * smoothstep(0.82, 0.97, fract(Y / 55.0 - uTime * 0.45 + hash12(vec2(seed, floor(U / 30.0))) )) * 1.6;
          float lines = max(max(corner, topL), max(baseL, slab)) + climb;
          lines *= 1.0 - 0.75 * smoothstep(1.2, 5.0, mpp);
          data += AMBER * lines * 1.4;
        } else if(part > 1.5){
          float fwY = fwidth(Y);
          data += AMBER * 0.8 * max(hair(vC.w - Y, fwY, 0.9), max(hair(vP.x, fwidth(vP.x), 0.8), hair(vP.y - vP.x, fwidth(vP.x), 0.8)));
        } else {
          // roofs: a faint dot at every 6 m
          vec2 rq = (fract(w.xz / 6.0) - 0.5) * 6.0;
          float rd = 1.0 - smoothstep(max(0.25, mpp * 0.8) - mpp * 0.5, max(0.25, mpp * 0.8) + mpp * 0.5, length(rq));
          data += AMBER * rd * 0.35 * smoothstep(1.0, 3.0, 6.0 / max(mpp, 1e-4) / 2.0);
        }
        // a flash where panes have just flipped
        float flash = rv * (1.0 - smoothstep(0.0, 14.0, front - th));
        data += mix(AMBER, vec3(1.0), 0.3) * flash * 0.9;
        col = mix(col, data, rv);
        // the front itself: an amber-white band of light sweeping across the paint
        col += mix(AMBER, vec3(1.0, 0.92, 0.8), 0.2) * glow * (1.9 - 0.8 * rv);
        id = rv > 0.5 ? 150.0 : 0.0;
      }
      writeOut(col, 1.0, normalize(vNormalV), fogDepth(vDepth), id);
    }
  `;
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, vertexShader: vs, fragmentShader: fs, side: THREE.FrontSide });
}
