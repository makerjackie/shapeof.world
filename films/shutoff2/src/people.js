import * as THREE from 'three';
import { meetToon } from './meet-mat.js';
import { tube, tubeGeo, strip, sweep, blob, shell, rrect, loopTube, flatPoly, mergePainted, crSample, clamp, sm, mix } from './people-geo.js';

// The review committee: stylised anime adults, built as rigid sculpted parts on a small rig (no skinning).
// Faces carry no features (they are never shown); the eye band is pre-shaded (aMask) so under-light (s25) leaves the
// eyes in shadow. Every person faces +Z in its own space; +X is the person's left.

const V = THREE.Vector3;
const TAU = Math.PI * 2;
const wrapPi = (a) => { a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a; };

// shared materials (one per ink id; colours ride on vertices)
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const base = { vc: true, sil: 0.25, rimK: 1.0 };
  MATS = {
    skin: meetToon({ ...base, id: 50, eye: 0.0 }),
    face: meetToon({ ...base, id: 50, eye: 0.85 }),
    hair: meetToon({ ...base, id: 51, sheen: 0.18 }),
    suit: meetToon({ ...base, id: 52, sheen: 0.05 }),
    shirt: meetToon({ ...base, id: 53 }),
    tie: meetToon({ ...base, id: 54, sheen: 0.15 }),
    frame: meetToon({ ...base, id: 55, spec: 0.6 }),
    legs: meetToon({ ...base, id: 56 }),
    shoe: meetToon({ ...base, id: 57, spec: 0.5 }),
    lapel: meetToon({ ...base, id: 58, sheen: 0.08 }),
  };
  return MATS;
}

// ------------------------------------------------------------------------- head
// Head space: origin at the head centre, +Z front. A/B/Cz half extents.
function headPoint(d, H) {
  let { x, y, z } = d;
  const low = sm(0.2, -1.0, y);
  x *= 1 - 0.4 * low * low - 0.05 * low;          // jaw narrows to the chin
  if (z < 0) z *= 1 - 0.5 * sm(-0.05, -0.95, y);  // under-skull pulls in toward the neck
  if (z < 0) z *= 1 + 0.1 * sm(-0.4, 0.3, y) * (1 - sm(0.6, 1, y)); // occipital bulge
  // chin and jaw line forward
  z += 0.08 * sm(-0.5, -0.92, y) * sm(0.0, 0.8, d.z);
  // flatter cheeks in front (anime face plane)
  if (z > 0) z *= 1 - 0.06 * sm(0.3, 0.9, Math.abs(d.x)) * sm(0.5, -0.4, y);
  // nose: small anime ridge + tip
  const nose = Math.exp(-((d.x / 0.11) ** 2) - (((y + 0.2) / 0.17) ** 2)) * sm(0.55, 0.95, d.z);
  const bridge = Math.exp(-((d.x / 0.08) ** 2) - (((y - 0.02) / 0.16) ** 2)) * sm(0.6, 0.95, d.z);
  z += (0.11 * nose + 0.03 * bridge) * (H.nose ?? 1);
  // brow ridge and eye sockets
  z += 0.035 * Math.exp(-(((y - 0.12) / 0.07) ** 2)) * sm(0.5, 0.9, d.z) * sm(0.62, 0.2, Math.abs(d.x));
  z -= 0.03 * Math.exp(-(((Math.abs(d.x) - 0.36) / 0.14) ** 2) - (((y - 0.02) / 0.09) ** 2)) * sm(0.4, 0.9, d.z);
  // cheekbones
  x *= 1 + 0.04 * Math.exp(-(((y + 0.12) / 0.15) ** 2)) * sm(0.0, 0.5, d.z);
  // lips (hint)
  z += 0.018 * Math.exp(-((d.x / 0.16) ** 2) - (((y + 0.52) / 0.06) ** 2)) * sm(0.6, 0.95, d.z);
  return new V(x * H.A, y * H.B, z * H.C);
}
// the cranium only (no face features): what hair sits on
function cranPoint(d, H) {
  let { x, y, z } = d;
  const low = sm(0.2, -1.0, y);
  x *= 1 - 0.4 * low * low - 0.05 * low;
  if (z < 0) z *= 1 - 0.5 * sm(-0.05, -0.95, y);
  if (z < 0) z *= 1 + 0.1 * sm(-0.4, 0.3, y) * (1 - sm(0.6, 1, y));
  return new V(x * H.A, y * H.B, z * H.C);
}
function eyeMask(d) {
  // the band from the brow down to the cheekbone, front of the face
  return sm(0.45, 0.8, d.z) * sm(-0.24, -0.08, d.y) * sm(0.3, 0.16, d.y) * sm(0.75, 0.55, Math.abs(d.x));
}

function headGeo(H) {
  const g = blob((d) => headPoint(d, H), 30, 44);
  // eye mask per vertex from its original direction: recompute by sampling direction of the vertex
  return g;
}

// ------------------------------------------------------------------------- hair
// style: { hem: [[a, theta], ...] by angle-from-front a in [0, pi] (and optional hemR for the person's right side),
//          thick: s -> m, jag, locks, skirt: {flare, drop} for long hair, part: phi, top: extra volume }
export function hairShellFor(H, st) { return hairShell(H, st); }
function tabAt(tab, a) {
  let th = tab[tab.length - 1][1];
  for (let i = 1; i < tab.length; i++) if (a <= tab[i][0]) { const [a0, t0] = tab[i - 1], [a1, t1] = tab[i]; const f = (a - a0) / (a1 - a0); th = t0 + (t1 - t0) * (f * f * (3 - 2 * f)); break; }
  return th;
}
function hairShell(H, st) {
  const hemL = st.hem, hemR = st.hemR ?? st.hem;
  const topAt = st.top ? (ph) => tabAt(st.top, Math.abs(wrapPi(ph))) : null;
  const hemAt = (ph) => {
    const a = Math.abs(wrapPi(ph));
    const tab = wrapPi(ph) >= 0 ? hemL : hemR;           // +phi = toward +X = the person's left
    // tabulated as [a, theta]; sample by a
    let th = tab[tab.length - 1][1];
    for (let i = 1; i < tab.length; i++) if (a <= tab[i][0]) { const [a0, t0] = tab[i - 1], [a1, t1] = tab[i]; const f = (a - a0) / (a1 - a0); th = t0 + (t1 - t0) * (f * f * (3 - 2 * f)); break; }
    return th;
  };
  const nL = st.locks ?? 14;
  const lockF = (ph) => { const q = (ph / TAU) * nL + (st.lockPhase ?? 0); return 1 - 2 * Math.abs(q - Math.floor(q) - 0.5); }; // 0 at lock edges, 1 at centres
  const at = (ph, s) => {
    const lf = lockF(ph);
    const jag = (st.jag ?? 0) * (st.jagMask ? st.jagMask(ph) : 1);
    const thMax = hemAt(ph) + jag * (lf - 0.5);
    const th0 = topAt ? Math.min(topAt(ph), thMax) : 0;
    const th = th0 + s * (thMax - th0);
    const eq = Math.PI / 2;
    const thC = Math.min(th, st.skirt ? eq : th);
    const d = new V(Math.sin(thC) * Math.sin(ph), Math.cos(thC), Math.sin(thC) * Math.cos(ph));
    let p = cranPoint(d, H);
    const nrm = new V(p.x / (H.A * H.A), p.y / (H.B * H.B), p.z / (H.C * H.C)).normalize();
    let t = st.thick(s, ph, th);
    // lock clumps: creases between locks
    t *= 0.78 + 0.22 * sm(0.0, 0.45, lf);
    if (st.part != null) { const dp = Math.abs(wrapPi(ph - st.part)); t *= 1 - 0.55 * Math.exp(-((dp / 0.12) ** 2)) * sm(0.05, 0.4, s) * (1 - sm(0.6, 0.95, s)); }
    p.addScaledVector(nrm, t);
    if (st.skirt && th > eq) {
      // long hair falls straight from the widest line, flaring a little and curling in at the hem
      const k = (th - eq) / (Math.max(thMax, eq + 1e-3) - eq + 1e-6);
      const drop = (th - eq) * (st.skirt.drop ?? 0.11);
      const fl = 1 + (st.skirt.flare ?? 0.08) * sm(0.1, 0.85, k) - (st.skirt.curl ?? 0.06) * sm(0.85, 1.0, k);
      p.x *= fl; p.z *= fl; p.y -= drop;
      // the hem tucks under the jaw toward the front
      const front = Math.max(Math.cos(ph), 0);
      p.z -= front * 0.02 * k;
    }
    if (st.warp) st.warp(p, ph, s, th);
    return p;
  };
  return shell(at, st.nPh ?? 132, st.nS ?? 24, !!topAt);
}

// tapered pointed lock along a path (anime strand) — pts in head space
function lock(pts, w0, t0 = 0.008, o = {}) {
  return sweep(pts, (t) => [Math.max(w0 * (1 - Math.pow(t, o.p ?? 1.4)) * (o.bulge ? 1 + o.bulge * Math.sin(t * Math.PI) : 1), 0.0006), Math.max(t0 * (1 - t), 0.0004)], { nu: 8, nv: o.nv ?? 14, e: 1.6, up: o.up ?? [0, 0, 1] });
}

// ------------------------------------------------------------------------- glasses
function glassesGeo(H, kind) {
  const w = kind === 'round' ? 0.044 : 0.05, h = kind === 'round' ? 0.038 : 0.03, r = kind === 'round' ? 0.017 : 0.008;
  const loop = rrect(w, h, r, 6);
  const zF = H.C * 1.04, y = H.B * 0.05;
  const parts = [];
  for (const sx of [-1, 1]) {
    const g = loopTube(loop, 0.0019, 6);
    g.rotateY(sx * 0.12);
    g.translate(sx * 0.031, y, zF - 0.004);
    parts.push(g);
    // temple arm back to the ear
    parts.push(sweep([[sx * 0.056, y + 0.006, zF - 0.008], [sx * (H.A + 0.006), y + 0.004, H.C * 0.35], [sx * (H.A + 0.004), y - 0.006, -H.C * 0.15]], [[0.0016, 0.0016], [0.0016, 0.0016]], { nu: 5, nv: 10 }));
  }
  parts.push(sweep([[-0.008, y + 0.008, zF + 0.002], [0, y + 0.011, zF + 0.004], [0.008, y + 0.008, zF + 0.002]], [[0.0015, 0.0015], [0.0015, 0.0015]], { nu: 5, nv: 6 }));
  const lens = [];
  for (const sx of [-1, 1]) {
    const g = flatPoly(loop);
    g.rotateY(sx * 0.12);
    g.translate(sx * 0.031, y, zF - 0.003);
    lens.push(g);
  }
  return { frame: parts, lens };
}

// ------------------------------------------------------------------------- hands
function handGeo(side, skin) {
  // mitten-like anime hand: palm + fingers block with knuckle line, separate thumb. Hangs along -Y, palm toward
  // the body (-side * X), thumb forward (+Z).
  const T = tube([[0.012, 0.022, 0.012, 0, 2.2], [0.0, 0.03, 0.014, 0, 2.6], [-0.045, 0.036, 0.0145, 0, 3.0], [-0.075, 0.036, 0.0125, 0, 3.0], [-0.1, 0.031, 0.01, 0.003, 2.6], [-0.112, 0.022, 0.008, 0.004, 2.2], [-0.117, 0.008, 0.005, 0.004, 2.0]]);
  const palm = tubeGeo(T, { nu: 20, nv: 16 });
  // fingers curl slightly toward the palm: bend the lower part
  const p = palm.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -0.06) { const k = (-0.06 - y) / 0.06; p.setX(i, p.getX(i) - 0.015 * k * k); }
  }
  palm.computeVertexNormals();
  // rotate so the flat of the hand faces X (palm toward the body)
  palm.rotateY(Math.PI / 2);
  if (side < 0) palm.scale(-1, 1, 1);
  const thumb = sweep([[0, -0.01, 0.024], [side * -0.006, -0.04, 0.034], [side * -0.012, -0.065, 0.03]], [[0.011, 0.009], [0.009, 0.008], [0.006, 0.005]], { nu: 8, nv: 10 });
  return mergePainted([[palm, skin], [thumb, skin]]);
}

// ------------------------------------------------------------------------- the person
export function buildPerson(spec) {
  const M = mats();
  const s = spec.scale ?? 1;
  const fem = spec.sex === 'f';
  const W = spec.width ?? 1;      // build
  const belly = spec.belly ?? 0;
  const H = { A: fem ? 0.072 : 0.076, B: fem ? 0.108 : 0.113, C: fem ? 0.093 : 0.097, nose: fem ? 0.75 : 1 };
  const col = spec.colors;

  const root = new THREE.Group();
  root.name = spec.name;
  const bone = (parent, x, y, z) => { const b = new THREE.Group(); b.position.set(x, y, z); parent.add(b); return b; };
  const hipY = 0.94 * s;
  const hips = bone(root, 0, hipY, 0);
  const torso = bone(hips, 0, 0.1 * s, 0);
  const neckB = bone(torso, 0, 0.395 * s, -0.012 * s);
  const head = bone(neckB, 0, 0.085 * s, 0.01 * s);
  const shX = (fem ? 0.165 : 0.19) * W * s, shY = 0.305 * s;
  const shoulder = [bone(torso, shX, shY, -0.008), bone(torso, -shX, shY, -0.008)];
  const upperLen = 0.29 * s, foreLen = 0.255 * s;
  const elbow = shoulder.map((b) => bone(b, 0, -upperLen, 0));
  const wrist = elbow.map((b) => bone(b, 0, -foreLen, 0));
  const hipX = (fem ? 0.088 : 0.095) * s;
  const thigh = [bone(hips, hipX, -0.04 * s, 0), bone(hips, -hipX, -0.04 * s, 0)];
  const thighLen = 0.44 * s, shinLen = 0.43 * s;
  const knee = thigh.map((b) => bone(b, 0, -thighLen, 0));
  const ankle = knee.map((b) => bone(b, 0, -shinLen, 0));

  const add = (b, geo, mat, name) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.name = name || ''; m.frustumCulled = false; b.add(m); return m; };
  const S = (g) => { g.scale(s, s, s); return g; };

  // ---- torso (jacket / blazer / shirt)
  const kind = spec.top ?? 'suit';
  const tw = W * (fem ? 0.9 : 1), td = W * (fem ? 0.92 : 1);
  const bl = belly;
  const secs = fem ? [
    [-0.17, 0.165 * tw, 0.118 * td, 0.0, 2.5],
    [-0.08, 0.152 * tw, 0.108 * td, 0.0, 2.5],
    [0.0, 0.132 * tw, 0.098 * td, 0.004, 2.5],
    [0.1, 0.146 * tw, 0.112 * td, 0.014, 2.4],
    [0.18, 0.158 * tw, 0.122 * td, 0.018, 2.4],
    [0.26, 0.165 * tw, 0.11 * td, 0.004, 2.6],
    [0.315, 0.178 * tw, 0.098 * td, -0.008, 2.9],
    [0.348, 0.166 * tw, 0.088 * td, -0.012, 2.9],
    [0.372, 0.115 * tw, 0.074 * td, -0.012, 2.4],
    [0.388, 0.06, 0.056, -0.01, 2.1],
    [0.396, 0.05, 0.048, -0.01, 2.0],
  ] : [
    [-0.17, (0.178 + bl * 0.03) * tw, (0.125 + bl * 0.04) * td, bl * 0.02, 2.6],
    [-0.08, (0.172 + bl * 0.035) * tw, (0.122 + bl * 0.05) * td, bl * 0.035, 2.6],
    [0.0, (0.16 + bl * 0.04) * tw, (0.112 + bl * 0.05) * td, 0.005 + bl * 0.035, 2.6],
    [0.1, (0.172 + bl * 0.03) * tw, (0.12 + bl * 0.035) * td, 0.012 + bl * 0.02, 2.6],
    [0.19, 0.188 * tw, 0.126 * td, 0.012, 2.6],
    [0.27, 0.197 * tw, 0.118 * td, 0.0, 2.8],
    [0.322, 0.21 * tw, 0.106 * td, -0.008, 3.1],
    [0.352, 0.196 * tw, 0.096 * td, -0.012, 3.1],
    [0.375, 0.14 * tw, 0.082 * td, -0.012, 2.6],
    [0.39, 0.072, 0.064, -0.01, 2.2],
    [0.398, 0.058, 0.054, -0.01, 2.0],
  ];
  const vY = (y) => clamp((y - secs[0][0]) / (secs[secs.length - 1][0] - secs[0][0]));
  const back = (u, v) => 1 + (kind !== 'shirt' ? 0.012 * Math.exp(-(((u - 0.5) / 0.02) ** 2)) * sm(0.1, 0.4, v) : 0); // centre-back seam ridge
  const TT = tube(secs, { shape: back });
  const topCol = kind === 'shirt' ? col.shirt : col.suit;
  const torsoG = S(tubeGeo(TT, { nu: 40, nv: 30 }));
  add(torso, mergePainted([[torsoG, topCol]]), kind === 'shirt' ? M.shirt : M.suit, 'torso');

  // front: shirt V, lapels, tie, buttons
  if (kind !== 'shirt') {
    const vB = vY(fem ? 0.08 : 0.06), vT = vY(0.39);
    const opening = (v) => mix(0.0, fem ? 0.066 : 0.056, sm(vB, vT, v) ** 0.9);       // half-width of the V in turns
    const shirtG = S(strip(TT, vB - 0.01, vT + 0.005, (v) => -opening(v) - 0.006, (v) => opening(v) + 0.006, { off: 0.0025, nu: 10, nv: 18 }));
    add(torso, mergePainted([[shirtG, col.shirt]]), M.shirt, 'shirtV');
    // lapels: a band beside each edge of the V, widening to the notch then narrowing to the collar
    const lw = (v) => { const k = sm(vB, vT, v); return mix(0.01, fem ? 0.034 : 0.04, sm(0, 0.7, k)) * (1 - 0.5 * sm(0.8, 1.0, k)); };
    const notch = (v) => { const k = sm(vB, vT, v); return 1 - 0.35 * Math.exp(-(((k - 0.78) / 0.025) ** 2)); };
    for (const sg of [-1, 1]) {
      const inner = (v) => sg * (opening(v) + 0.002), outer = (v) => sg * (opening(v) + lw(v) * notch(v));
      const g = S(strip(TT, vB - 0.02, vT, sg < 0 ? outer : inner, sg < 0 ? inner : outer, { off: (v, q) => 0.0045 + 0.002 * (sg < 0 ? q : 1 - q), nu: 6, nv: 22 }));
      add(torso, mergePainted([[g, col.lapel ?? col.suit]]), M.lapel, 'lapel');
    }
    if (col.tie) {
      const tieG = S(strip(TT, vY(-0.05), vT - 0.01, (v) => -mix(0.017, 0.012, sm(vY(-0.05), vT, v)) * (v > vT - 0.05 ? 1.25 : 1), (v) => mix(0.017, 0.012, sm(vY(-0.05), vT, v)) * (v > vT - 0.05 ? 1.25 : 1), { off: 0.0055, nu: 4, nv: 16 }));
      add(torso, mergePainted([[tieG, col.tie]]), M.tie, 'tie');
    }
    // buttons
    const bP = new V(), bN = new V();
    const btn = [];
    for (const y of fem ? [0.06] : [0.035, -0.04]) {
      TT.p(0, vY(y), bP); TT.n(0, vY(y), bN);
      const g = new THREE.SphereGeometry(0.0075, 10, 6); g.scale(1, 1, 0.45);
      g.lookAt(bN); g.translate(bP.x + bN.x * 0.003, bP.y + bN.y * 0.003, bP.z + bN.z * 0.003);
      btn.push([S(g), col.button ?? '#1b1c22']);
    }
    // breast pocket line (left chest) as a thin strip
    const pk = S(strip(TT, vY(0.215), vY(0.225), () => 0.06, () => 0.115, { off: 0.0035, nu: 4, nv: 2 }));
    btn.push([pk, col.lapel ?? col.suit]);
    add(torso, mergePainted(btn), M.frame, 'buttons');
  } else {
    // open-collar shirt: placket line and two pockets
    const parts = [];
    parts.push([S(strip(TT, vY(-0.15), vY(0.33), () => -0.006, () => 0.006, { off: 0.0025, nu: 2, nv: 12 })), col.shirt2 ?? col.shirt]);
    for (const sg of [-1, 1]) parts.push([S(strip(TT, vY(0.15), vY(0.24), () => (sg < 0 ? -0.1 : 0.045), () => (sg < 0 ? -0.045 : 0.1), { off: 0.003, nu: 4, nv: 4 })), col.shirt2 ?? col.shirt]);
    add(torso, mergePainted(parts), M.lapel, 'placket');
  }
  // collar: shirt collar band around the neck base, jacket collar behind it
  {
    const parts = [];
    const neckR = fem ? 0.045 : 0.054;
    const shirtCollar = tube([[0.0, neckR + 0.006, neckR + 0.004, 0.0, 2.0], [0.025, neckR + 0.004, neckR + 0.002, -0.002, 2.0], [0.045, neckR + 0.003, neckR + 0.001, -0.004, 2.0]], {
      shape: (u) => 1,
    });
    const scG = S(tubeGeo(shirtCollar, { nu: 28, nv: 4, capTop: false, capBot: false }));
    // cut the front open (V at the throat): drop front vertices
    const pp = scG.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), y = pp.getY(i); const ang = Math.atan2(x, z); if (Math.abs(ang) < 0.35) { pp.setY(i, y - 0.012 * s * (1 - Math.abs(ang) / 0.35)); } }
    scG.computeVertexNormals();
    scG.translate(0, 0.37 * s, -0.012 * s);
    parts.push([scG, col.shirt]);
    add(torso, mergePainted(parts), M.shirt, 'collar');
    if (kind !== 'shirt') {
      const jc = tube([[0.0, neckR + 0.022, neckR + 0.018, -0.008, 2.2], [0.03, neckR + 0.014, neckR + 0.01, -0.012, 2.2]], { shape: (u) => 1 });
      const jG = S(tubeGeo(jc, { nu: 28, nv: 3, capTop: false, capBot: false }));
      const jp = jG.attributes.position;
      for (let i = 0; i < jp.count; i++) { const x = jp.getX(i), z = jp.getZ(i); const ang = Math.atan2(x, z); if (Math.abs(ang) < 0.9) jp.setY(i, jp.getY(i) - 0.045 * s * (1 - Math.abs(ang) / 0.9)); }
      jG.computeVertexNormals();
      jG.translate(0, 0.355 * s, -0.012 * s);
      add(torso, mergePainted([[jG, col.lapel ?? col.suit]]), M.lapel, 'jcollar');
    }
  }

  // ---- hips / trousers seat
  const hipsG = S(tubeGeo(tube([[-0.11, 0.15 * tw, 0.105, 0.0, 2.4], [-0.04, 0.168 * tw, 0.115, 0.0, 2.6], [0.06, 0.16 * tw, 0.11, 0.0, 2.6], [0.12, 0.15 * tw, 0.1, 0.0, 2.5]]), { nu: 28, nv: 8 }));
  add(hips, mergePainted([[hipsG, col.legs ?? col.suit]]), M.legs, 'hips');

  // ---- neck
  const nr = fem ? 0.043 : 0.052;
  const neckG = S(tubeGeo(tube([[-0.06, nr * 1.05, nr, 0.0, 2.0], [0.02, nr, nr * 0.95, 0.004, 2.0], [0.09, nr * 0.92, nr * 0.95, 0.0, 2.0]]), { nu: 20, nv: 6 }));
  add(neckB, mergePainted([[neckG, col.skin]]), M.skin, 'neck');

  // ---- head
  const hc = new V(0, 0.072 * s, 0.012 * s);    // head centre relative to the head bone
  {
    const g = blob((d) => headPoint(d, H), 30, 44);
    // eye mask from the original directions: recompute via a second blob of plain directions
    const dirs = blob((d) => d.clone(), 30, 44).attributes.position;
    const n = dirs.count, m = new Float32Array(n);
    for (let i = 0; i < n; i++) m[i] = eyeMask(new V(dirs.getX(i), dirs.getY(i), dirs.getZ(i)));
    g.scale(s, s, s); g.translate(hc.x, hc.y, hc.z);
    const merged = mergePainted([[g, col.skin]]);
    merged.setAttribute('aMask', new THREE.BufferAttribute(m, 1));
    add(head, merged, M.face, 'head');
    // ears
    const ears = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.SphereGeometry(1, 12, 8); e.scale(0.012, 0.03, 0.02); e.rotateY(sx * 0.35); e.rotateZ(sx * -0.1);
      e.translate(sx * H.A * 0.97, -0.012, -0.012);
      e.scale(s, s, s); e.translate(hc.x, hc.y, hc.z);
      ears.push([e, col.skin]);
    }
    add(head, mergePainted(ears), M.skin, 'ears');
  }
  // hair
  {
    const parts = spec.hair(H).map((g) => { g.scale(s, s, s); g.translate(hc.x, hc.y, hc.z); return [g, col.hair]; });
    add(head, mergePainted(parts), M.hair, 'hair');
    if (spec.hairExtra) {
      const ex = spec.hairExtra(H).map(([g, c]) => { g.scale(s, s, s); g.translate(hc.x, hc.y, hc.z); return [g, c]; });
      add(head, mergePainted(ex), M.hair, 'hair2');
    }
  }
  // glasses
  let lensMat = null;
  if (spec.glasses) {
    const gl = glassesGeo(H, spec.glasses);
    add(head, mergePainted(gl.frame.map((g) => { g.scale(s, s, s); g.translate(hc.x, hc.y, hc.z); return [g, col.frame ?? '#2a2b31']; })), M.frame, 'frames');
    lensMat = meetToon({ vc: true, id: 103, unlit: true, emissive: '#ffffff', emissiveGain: 0 });
    const lens = add(head, mergePainted(gl.lens.map((g) => { g.scale(s, s, s); g.translate(hc.x, hc.y, hc.z); return [g, '#000000']; })), lensMat, 'lens');
    lens.visible = false;
    lensMat.userData.mesh = lens;
  }

  // ---- arms
  const sleeveCol = kind === 'shirt' ? col.shirt : col.suit;
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? 1 : -1;
    const ar = (fem ? 0.85 : 1) * W;
    const up = S(tubeGeo(tube([[0.07, 0.02 * ar, 0.02 * ar, 0, 2.0], [0.058, 0.05 * ar, 0.05 * ar, 0, 2.0], [0.03, 0.064 * ar, 0.064 * ar, 0, 2.2], [-0.02, 0.066 * ar, 0.063 * ar, 0, 2.2], [-0.12, 0.06 * ar, 0.057 * ar, 0, 2.2], [-0.24, 0.054 * ar, 0.051 * ar, 0, 2.2], [-0.3, 0.05 * ar, 0.048 * ar, 0, 2.2]]), { nu: 22, nv: 14, capTop: true, capBot: true }));
    add(shoulder[k], mergePainted([[up, sleeveCol]]), kind === 'shirt' ? M.shirt : M.suit, 'upper');
    const fore = S(tubeGeo(tube([[0.03, 0.048 * ar, 0.046 * ar, 0, 2.2], [0.0, 0.05 * ar, 0.048 * ar, 0, 2.2], [-0.12, 0.046 * ar, 0.043 * ar, 0, 2.2], [-0.215, 0.043 * ar, 0.04 * ar, 0, 2.2], [-0.232, 0.045 * ar, 0.042 * ar, 0, 2.2]]), { nu: 22, nv: 10, capBot: kind === 'shirt' }));
    add(elbow[k], mergePainted([[fore, sleeveCol]]), kind === 'shirt' ? M.shirt : M.suit, 'fore');
    if (kind !== 'shirt') {
      const cuff = S(tubeGeo(tube([[-0.215, 0.037 * ar, 0.034 * ar, 0, 2.2], [-0.248, 0.035 * ar, 0.032 * ar, 0, 2.2]]), { nu: 18, nv: 2 }));
      add(elbow[k], mergePainted([[cuff, col.shirt]]), M.shirt, 'cuff');
    }
    const wr = S(tubeGeo(tube([[-0.23, 0.026, 0.021, 0, 2.0], [-0.262, 0.025, 0.02, 0, 2.0]]), { nu: 14, nv: 2 }));
    add(elbow[k], mergePainted([[wr, col.skin]]), M.skin, 'wrist');
    const hand = S(handGeo(side, col.skin)); hand.translate(0, 0, 0);
    add(wrist[k], hand, M.skin, 'hand');
  }

  // ---- legs
  for (let k = 0; k < 2; k++) {
    const lw = (fem ? 0.88 : 1) * W;
    const th = S(tubeGeo(tube([[0.05, 0.08 * lw, 0.085 * lw, 0, 2.2], [0.0, 0.088 * lw, 0.092 * lw, 0.005, 2.2], [-0.2, 0.074 * lw, 0.078 * lw, 0.005, 2.2], [-0.42, 0.056 * lw, 0.06 * lw, 0, 2.2], [-0.46, 0.054 * lw, 0.058 * lw, 0, 2.2]]), { nu: 20, nv: 10 }));
    add(thigh[k], mergePainted([[th, col.legs ?? col.suit]]), M.legs, 'thigh');
    const sh = S(tubeGeo(tube([[0.03, 0.054 * lw, 0.058 * lw, 0, 2.2], [-0.2, 0.05 * lw, 0.052 * lw, -0.003, 2.2], [-0.4, 0.045 * lw, 0.048 * lw, 0, 2.2], [-0.42, 0.047 * lw, 0.05 * lw, 0, 2.2]]), { nu: 18, nv: 8 }));
    add(knee[k], mergePainted([[sh, col.legs ?? col.suit]]), M.legs, 'shin');
    const shoe = S(blob((d) => {
      const x = d.x * 0.045, y = (d.y > 0 ? d.y * 0.04 : d.y * 0.022), z = d.z * 0.13 + 0.05;
      return new V(x * (1 - 0.25 * Math.max(0, d.z)), y * (d.z > 0.3 ? 1 - 0.4 * (d.z - 0.3) : 1), z);
    }, 12, 18));
    shoe.translate(0, -0.035 * 1, 0);
    add(ankle[k], mergePainted([[shoe, col.shoe ?? '#1d1d22']]), M.shoe, 'shoe');
  }

  const rig = { root, hips, torso, neck: neckB, head, shoulder, elbow, wrist, thigh, knee, ankle, upperLen, foreLen, hipY, s };
  return { root, rig, lensMat, spec };
}

// ------------------------------------------------------------------------- posing
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v1 = new V(), _v2 = new V(), _v3 = new V();
const _x = new V(), _y = new V(), _z = new V();

// two-bone IK: put the wrist of arm k at world point T; pole = world direction the elbow points to.
export function armIK(rig, k, T, pole, twist = 0) {
  const sh = rig.shoulder[k], par = sh.parent;
  par.updateWorldMatrix(true, false);
  const inv = _m.copy(par.matrixWorld).invert();
  const t = _v1.copy(T).applyMatrix4(inv);              // target in the torso frame
  const S0 = sh.position;
  const pW = _v3.copy(pole).transformDirection(inv);     // pole in the torso frame
  const a = rig.upperLen, b = rig.foreLen;
  const dv = _v2.copy(t).sub(S0);
  let d = dv.length();
  d = clamp(d, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  dv.normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const alpha = Math.acos(cosA);
  const cosB = clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1);
  const beta = Math.acos(cosB);
  // bend plane normal
  const n = _x.crossVectors(dv, pW);
  if (n.lengthSq() < 1e-8) n.set(1, 0, 0);
  n.normalize();
  // upper arm direction: rotate dv toward the pole side by alpha around n
  const upDir = dv.clone().applyAxisAngle(n, -alpha);
  // check it goes toward the pole; if not flip
  if (upDir.dot(pW) < dv.dot(pW)) upDir.copy(dv).applyAxisAngle(n, alpha);
  // frame: -Y along the upper arm, +Z toward the target side (forearm bends toward local +Z)
  _y.copy(upDir).negate();
  _z.copy(dv).addScaledVector(upDir, -dv.dot(upDir)).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  sh.quaternion.setFromRotationMatrix(_m);
  const el = rig.elbow[k];
  el.rotation.set(-(Math.PI - beta), twist, 0, 'XYZ');
}

// aim the head (and a share of the neck) at a world point, with extra pitch/roll
export function headLook(rig, T, share = 0.35, extra = { pitch: 0, roll: 0 }) {
  const tor = rig.torso;
  tor.updateWorldMatrix(true, false);
  const inv = _m.copy(tor.matrixWorld).invert();
  const hp = _v1.setFromMatrixPosition(rig.head.matrixWorld);
  const loc = _v2.copy(T).applyMatrix4(inv).sub(_v3.copy(hp).applyMatrix4(inv));
  const yaw = Math.atan2(loc.x, loc.z);
  const pitch = -Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
  rig.neck.rotation.set(pitch * share + (extra.pitch ?? 0) * 0.3, yaw * share, 0, 'YXZ');
  rig.head.rotation.set(pitch * (1 - share) + (extra.pitch ?? 0) * 0.7, yaw * (1 - share), extra.roll ?? 0, 'YXZ');
}

// seated / standing body: k = 0 seated, 1 standing. lean = forward lean of the torso (rad), twist = torso yaw.
export function bodyPose(rig, k, o = {}) {
  const s = rig.s;
  const seatY = (o.seatY ?? 0.47) + 0.035;
  const stand = rig.hipY;
  const kk = clamp(k);
  // rising arc: hips move forward over the feet, then up and back
  const y = mix(seatY, stand, sm(0.15, 1.0, kk));
  const z = (o.z ?? 0) + 0.12 * Math.sin(Math.PI * clamp(kk * 1.1)) * s - 0.05 * kk;
  rig.hips.position.set(o.x ?? 0, y, z);
  const thighA = mix(-Math.PI / 2 + 0.06, -0.02, sm(0.1, 1.0, kk));
  const kneeA = mix(Math.PI / 2 + (o.kneeOut ?? 0.1), 0.03, sm(0.1, 1.0, kk));
  for (let i = 0; i < 2; i++) {
    const sp = (i === 0 ? 1 : -1) * (o.spread ?? 0.08);
    rig.thigh[i].rotation.set(thighA, 0, sp * (1 - kk) + (i === 0 ? 1 : -1) * 0.02, 'XYZ');
    rig.knee[i].rotation.set(kneeA, 0, -sp * 0.8 * (1 - kk), 'XYZ');
    rig.ankle[i].rotation.set(-thighA - kneeA, 0, 0, 'XYZ');
  }
  const lean = (o.lean ?? 0) + 0.45 * Math.sin(Math.PI * clamp(kk)) * (o.riseLean ?? 1);
  rig.hips.rotation.set(-0.0, o.twistHips ?? 0, 0, 'YXZ');
  rig.torso.rotation.set(lean, o.twist ?? 0, o.tilt ?? 0, 'YXZ');
  rig.root.updateMatrixWorld(true);
}
