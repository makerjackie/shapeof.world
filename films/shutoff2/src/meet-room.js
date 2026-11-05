import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/addons/RoundedBoxGeometry.js';
import { meetToon, paint, canvasTex } from './meet-mat.js';
import { mergePainted, sweep, tube, tubeGeo } from './people-geo.js';
import { Rng } from './util.js';
import { FLOOR, ROOM, TABLE, SCREEN, SEATS } from './meet-layout.js';

// The boardroom: architecture (painted, id 0), the table, chairs, the screen stand and plants (inked cels).
// All in room-local coordinates (the group sits at y = FLOOR).

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const rbox = (w, h, d, r, x, y, z, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r).translate(x, y, z);

// ------------------------------------------------------------------ textures
function oakTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e2c9a6'; g.fillRect(0, 0, w, h);
    const R = new Rng(41);
    // long planks along the texture's V (table length)
    for (let i = 0; i < 6; i++) {
      const x0 = (i / 6) * w;
      g.fillStyle = `hsl(${32 + R.range(-3, 3)}, ${36 + R.range(-6, 6)}%, ${78 + R.range(-4, 3)}%)`;
      g.fillRect(x0, 0, w / 6, h);
    }
    // grain: flowing lines with cathedral arches
    for (let k = 0; k < 220; k++) {
      const x = R.range(0, w), amp = R.range(2, 16), f = R.range(0.002, 0.008), ph = R.range(0, 6.28);
      g.strokeStyle = `rgba(${150 + R.int(-20, 10)}, ${104 + R.int(-15, 10)}, ${66 + R.int(-10, 10)}, ${R.range(0.08, 0.22)})`;
      g.lineWidth = R.range(0.6, 2.2);
      g.beginPath();
      for (let y = 0; y <= h; y += 8) { const xx = x + Math.sin(y * f + ph) * amp + Math.sin(y * f * 3.1 + ph) * amp * 0.25; if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); }
      g.stroke();
    }
    // a few darker knots / flecks
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(120, 80, 50, ${R.range(0.05, 0.14)})`; g.fillRect(R.range(0, w), R.range(0, h), R.range(1, 3), R.range(6, 30)); }
  }, { repeat: true });
}
function floorTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e4e2de'; g.fillRect(0, 0, w, h);
    const R = new Rng(7);
    // large-format stone tiles 1.2 m (texture = 2.4 m): soft mottling + seams
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${R.int(150, 200)}, ${R.int(150, 195)}, ${R.int(150, 190)}, ${R.range(0.02, 0.06)})`; const r = R.range(4, 40); g.beginPath(); g.arc(R.range(0, w), R.range(0, h), r, 0, 6.28); g.fill(); }
    g.strokeStyle = 'rgba(150, 150, 160, 0.55)'; g.lineWidth = 2;
    for (const p of [0, w / 2]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  }, { repeat: true });
}
function rugTex() {
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#a7b0c2'; g.fillRect(0, 0, w, h);
    const R = new Rng(3);
    for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(${R.int(120, 190)}, ${R.int(130, 195)}, ${R.int(150, 210)}, 0.08)`; g.fillRect(R.range(0, w), R.range(0, h), 2, R.range(2, 6)); }
    g.strokeStyle = 'rgba(80, 90, 120, 0.35)'; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
  });
}

// ------------------------------------------------------------------ build
export function buildRoom(ctx) {
  const room = new THREE.Group();
  const casters = new THREE.Group();     // everything that casts sun shadows
  const plain = new THREE.Group();       // receivers only (floor, rug)
  room.add(casters, plain);
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, Hh = ROOM.h;

  // ---- materials
  const M = {
    floor: meetToon({ id: 0, color: '#ffffff', map: floorTex() }),
    rug: meetToon({ id: 0, color: '#ffffff', map: rugTex() }),
    wall: meetToon({ id: 0, vc: true }),
    ceil: meetToon({ id: 0, vc: true }),
    mull: meetToon({ id: 0, vc: true, spec: 0.3 }),
    slat: meetToon({ id: 0, vc: true }),
    table: meetToon({ id: 10, color: '#ffffff', map: oakTex(), sheen: 0.12 }),
    tableEdge: meetToon({ id: 11, color: '#ffffff', map: null, vc: true }),
    base: meetToon({ id: 12, vc: true, spec: 0.4 }),
    chairShell: meetToon({ id: 13, vc: true, sheen: 0.12, sil: 0.1 }),
    chairPad: meetToon({ id: 14, vc: true, sil: 0.1 }),
    chairMetal: meetToon({ id: 15, vc: true, spec: 0.8 }),
    screenFrame: meetToon({ id: 17, vc: true, spec: 0.4 }),
    post: meetToon({ id: 18, vc: true, spec: 0.5 }),
    pot: meetToon({ id: 19, vc: true }),
    leaf: meetToon({ id: 30, vc: true, rimK: 0.8, sil: 0.0 }),
    trunk: meetToon({ id: 31, vc: true }),
    lightBar: meetToon({ id: 16, vc: true, spec: 0.5 }),
    glow: meetToon({ id: 104, vc: true, unlit: true, emissive: '#000000' }),
  };
  M.floor.uniforms.uMap.value.repeat.set(1, 1);
  const mesh = (g, m, parent = casters) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; parent.add(o); return o; };

  // ---- floor (stone, UVs in metres / 2.4) + rug under the table
  {
    const g = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2).translate((ROOM.x0 + ROOM.x1) / 2, 0, (ROOM.z0 + ROOM.z1) / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2.4, p.getZ(i) / 2.4);
    paint(g, '#ffffff');
    mesh(g, M.floor, plain);
    const r = new THREE.PlaneGeometry(4.4, 8.0).rotateX(-Math.PI / 2).translate(TABLE.cx, 0.006, TABLE.cz + 0.1);
    paint(r, '#ffffff');
    mesh(r, M.rug, plain);
  }

  // ---- ceiling: white plane with a raised coffer over the table lined with oak slats; linear pendant
  {
    const parts = [];
    const cx0 = -2.0, cx1 = 2.0, cz0 = -5.0, cz1 = 4.0;
    const ceil = '#f4f5f7';
    // main ceiling around the coffer (4 slabs)
    parts.push([box(W, 0.2, cz0 - ROOM.z0, 0, Hh + 0.1, (ROOM.z0 + cz0) / 2), ceil]);
    parts.push([box(W, 0.2, ROOM.z1 - cz1, 0, Hh + 0.1, (cz1 + ROOM.z1) / 2), ceil]);
    parts.push([box(cx0 - ROOM.x0, 0.2, cz1 - cz0, (ROOM.x0 + cx0) / 2, Hh + 0.1, (cz0 + cz1) / 2), ceil]);
    parts.push([box(ROOM.x1 - cx1, 0.2, cz1 - cz0, (cx1 + ROOM.x1) / 2, Hh + 0.1, (cz0 + cz1) / 2), ceil]);
    // coffer top + sides
    parts.push([box(cx1 - cx0, 0.1, cz1 - cz0, 0, Hh + 0.42, (cz0 + cz1) / 2), '#e9e6e0']);
    for (const x of [cx0, cx1]) parts.push([box(0.04, 0.42, cz1 - cz0, x, Hh + 0.2, (cz0 + cz1) / 2), '#eef0f2']);
    for (const z of [cz0, cz1]) parts.push([box(cx1 - cx0, 0.42, 0.04, 0, Hh + 0.2, z), '#eef0f2']);
    // window head: blind pocket along the glass
    parts.push([box(W, 0.14, 0.32, 0, Hh - 0.07, ROOM.z0 + 0.16), '#e3e6ea']);
    parts.push([box(0.32, 0.14, D, ROOM.x1 - 0.16, Hh - 0.07, 0), '#e3e6ea']);
    mesh(mergePainted(parts), M.ceil);
    // oak slats in the coffer, running along Z
    const sl = [];
    for (let x = cx0 + 0.07; x < cx1 - 0.04; x += 0.1) sl.push([box(0.035, 0.12, cz1 - cz0 - 0.08, x, Hh + 0.31, (cz0 + cz1) / 2), '#c99d72']);
    mesh(mergePainted(sl), M.slat);
    // downlights in the flat ceiling (dark rings) and their glowing disks
    const dl = [], dg = [];
    for (let x = -7; x <= 7; x += 2.33) for (let z = -5.8; z <= 6; z += 2.3) {
      if (x > cx0 - 0.3 && x < cx1 + 0.3 && z > cz0 - 0.3 && z < cz1 + 0.3) continue;
      dl.push([new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20).translate(x, Hh - 0.005, z), '#c8ccd4']);
      dg.push([new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20).translate(x, Hh - 0.012, z), '#fff6e8']);
    }
    mesh(mergePainted(dl), M.mull);
    const glowDL = mesh(mergePainted(dg), M.glow);
    glowDL.userData.noShadow = true;
    // linear pendant over the table: a slim bar on two cables, glowing underside
    const pz0 = TABLE.cz - 2.3, pz1 = TABLE.cz + 2.3, py = 2.95;
    const lb = [[rbox(0.07, 0.05, pz1 - pz0, 0.012, 0, py, (pz0 + pz1) / 2), '#d7dbe2']];
    for (const z of [pz0 + 0.3, pz1 - 0.3]) lb.push([new THREE.CylinderGeometry(0.003, 0.003, Hh + 0.42 - py, 4).translate(0, (Hh + 0.42 + py) / 2, z), '#7d828c']);
    mesh(mergePainted(lb), M.lightBar);
    const strip = mesh(mergePainted([[box(0.045, 0.01, pz1 - pz0 - 0.04, 0, py - 0.026, (pz0 + pz1) / 2), '#fff4e2']]), M.glow);
    strip.userData.noShadow = true;
  }

  // ---- window walls: -Z (CBD) and +X (east, the sun). Slim interior fins, floor grille, corner post.
  {
    const parts = [];
    const fin = '#e8ebf0';
    // deep blade fins on the CBD wall: the low ENE sun slants through them and cuts the light into shafts
    for (let x = ROOM.x0; x <= ROOM.x1 + 1e-3; x += 1.5) parts.push([box(0.06, Hh, 0.84, x, Hh / 2, ROOM.z0 + 0.42), fin]);
    for (let z = ROOM.z0 + 1.5; z <= ROOM.z1 + 1e-3; z += 1.5) parts.push([box(0.2, Hh, 0.05, ROOM.x1 - 0.1, Hh / 2, z), fin]);
    // glazing beads at floor and head (thin frame lines)
    parts.push([box(W, 0.06, 0.06, 0, 0.03, ROOM.z0 + 0.02), '#cfd4dc']);
    parts.push([box(0.06, 0.06, D, ROOM.x1 - 0.02, 0.03, 0), '#cfd4dc']);
    parts.push([box(W, 0.04, 0.05, 0, Hh - 0.16, ROOM.z0 + 0.02), '#cfd4dc']);
    parts.push([box(0.05, 0.04, D, ROOM.x1 - 0.02, Hh - 0.16, 0), '#cfd4dc']);
    // corner post
    parts.push([box(0.24, Hh, 0.24, ROOM.x1 - 0.12, Hh / 2, ROOM.z0 + 0.12), '#eef0f4']);
    mesh(mergePainted(parts), M.mull);
    // floor-edge vent grille (dark strip with slots) along both glass walls
    const gr = [];
    gr.push([box(W - 0.4, 0.004, 0.16, 0, 0.003, ROOM.z0 + 0.32), '#7c8290']);
    gr.push([box(0.16, 0.004, D - 0.4, ROOM.x1 - 0.32, 0.003, 0), '#7c8290']);
    for (let x = ROOM.x0 + 0.2; x < ROOM.x1 - 0.2; x += 0.05) gr.push([box(0.012, 0.006, 0.13, x, 0.005, ROOM.z0 + 0.32), '#c9ced8']);
    mesh(mergePainted(gr), M.mull, plain);
    // roller blinds. CBD wall: a few bays partly lowered. East wall (the sun side): sunscreen fabric down on most
    // bays, glowing with the sun behind it; three bays left open let the sun in as broad shafts.
    const bl = [], glowBl = [];
    const R = new Rng(19);
    for (let x = ROOM.x0 + 0.75; x < ROOM.x1; x += 1.5) {
      if (Math.abs(x) < 3.2) continue;            // keep the bays behind the screen clear
      const drop = R.range(0.25, 1.1);
      bl.push([box(1.44, drop, 0.01, x, Hh - 0.14 - drop / 2, ROOM.z0 + 0.9), '#f1efe9']);
      bl.push([box(1.44, 0.03, 0.025, x, Hh - 0.14 - drop, ROOM.z0 + 0.9), '#b8bcc6']);
    }
    let bay = 0;
    for (let z = ROOM.z0 + 0.75; z < ROOM.z1; z += 1.5, bay++) {
      const open = bay === 0 || bay === 2;
      const drop = open ? 0.12 : Hh - 0.14 - R.range(0.12, 0.35);
      if (open) {
        // venetian blind in the open bays: tilted slats slice the sun into sheets of light
        for (let y = 0.32; y < Hh - 0.3; y += 0.21) {
          const g = new THREE.BoxGeometry(0.11, 0.008, 1.42).rotateZ(0.7).translate(ROOM.x1 - 0.3, y, z);
          bl.push([g, '#e9e6df']);
        }
        for (const dz of [-0.45, 0.45]) bl.push([box(0.004, Hh - 0.4, 0.004, ROOM.x1 - 0.3, Hh / 2 - 0.05, z + dz), '#c9ccd2']);
      }
      glowBl.push([box(0.01, drop, 1.44, ROOM.x1 - 0.24, Hh - 0.14 - drop / 2, z), '#ffffff']);
      bl.push([box(0.025, 0.03, 1.44, ROOM.x1 - 0.24, Hh - 0.14 - drop, z), '#b8bcc6']);
    }
    const fab = mesh(mergePainted(glowBl), meetToon({ id: 0, vc: true, unlit: true, emissive: '#f4ecdf', emissiveGain: 1.0 }));
    void fab;
    mesh(mergePainted(bl), M.wall);
  }

  // ---- solid walls: west = oak slat feature wall, south = white with a door
  {
    const parts = [];
    parts.push([box(0.2, Hh, D, ROOM.x0 - 0.1, Hh / 2, 0), '#d8cfc4']);
    parts.push([box(W, Hh, 0.2, 0, Hh / 2, ROOM.z1 + 0.1), '#eceef1']);
    // skirting
    parts.push([box(0.02, 0.08, D, ROOM.x0 + 0.01, 0.04, 0), '#9aa0aa']);
    parts.push([box(W, 0.08, 0.02, 0, 0.04, ROOM.z1 - 0.01), '#9aa0aa']);
    // door (double, dark walnut) on the south wall, behind 林工 and off to the side
    parts.push([box(1.8, 2.6, 0.06, -4.5, 1.3, ROOM.z1 - 0.03), '#6e5444']);
    parts.push([box(0.02, 2.6, 0.065, -4.5, 1.3, ROOM.z1 - 0.035), '#3a2c24']);
    for (const x of [-4.62, -4.38]) parts.push([box(0.02, 0.5, 0.04, x, 1.1, ROOM.z1 - 0.08), '#c9ccd2']);
    mesh(mergePainted(parts), M.wall);
    const sl = [];
    for (let z = ROOM.z0 + 0.3; z < ROOM.z1 - 0.2; z += 0.09) sl.push([box(0.05, Hh - 0.1, 0.045, ROOM.x0 + 0.03, Hh / 2, z), '#c39a73']);
    mesh(mergePainted(sl), M.slat);
    // long credenza against the west wall
    const cr = [];
    cr.push([rbox(0.5, 0.62, 4.2, 0.02, ROOM.x0 + 0.33, 0.33, -0.5), '#3d3f47']);
    cr.push([box(0.52, 0.03, 4.24, ROOM.x0 + 0.33, 0.655, -0.5), '#e9e4dc']);
    mesh(mergePainted(cr), M.base);
  }

  // ---- the table: pale oak top with a knife edge, graphite pedestals, centre cable channel
  const table = new THREE.Group();
  casters.add(table);
  {
    const L = TABLE.L, Wd = TABLE.W, T = 0.05;
    const sh = new THREE.Shape();
    const r = 0.22, hx = Wd / 2, hz = L / 2;
    sh.moveTo(-hx + r, -hz); sh.lineTo(hx - r, -hz); sh.quadraticCurveTo(hx, -hz, hx, -hz + r); sh.lineTo(hx, hz - r);
    sh.quadraticCurveTo(hx, hz, hx - r, hz); sh.lineTo(-hx + r, hz); sh.quadraticCurveTo(-hx, hz, -hx, hz - r); sh.lineTo(-hx, -hz + r); sh.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
    const top = new THREE.ExtrudeGeometry(sh, { depth: T * 0.45, bevelEnabled: true, bevelThickness: T * 0.25, bevelSize: 0.012, bevelSegments: 2, curveSegments: 18 });
    top.rotateX(Math.PI / 2);
    top.translate(TABLE.cx, TABLE.top - T * 0.25, TABLE.cz);
    // UVs: metres along the table / 1.6 (grain runs along Z)
    const uv = top.attributes.uv, p = top.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + 0.8) / 1.6, p.getZ(i) / 2.4);
    paint(top, '#ffffff');
    mesh(top, M.table, table);
    // the underside chamfer (knife edge), a slightly smaller dark-oak slab under the top
    const sh2 = new THREE.Shape();
    const r2 = 0.2, hx2 = hx - 0.05, hz2 = hz - 0.05;
    sh2.moveTo(-hx2 + r2, -hz2); sh2.lineTo(hx2 - r2, -hz2); sh2.quadraticCurveTo(hx2, -hz2, hx2, -hz2 + r2); sh2.lineTo(hx2, hz2 - r2);
    sh2.quadraticCurveTo(hx2, hz2, hx2 - r2, hz2); sh2.lineTo(-hx2 + r2, hz2); sh2.quadraticCurveTo(-hx2, hz2, -hx2, hz2 - r2); sh2.lineTo(-hx2, -hz2 + r2); sh2.quadraticCurveTo(-hx2, -hz2, -hx2 + r2, -hz2);
    const under = new THREE.ExtrudeGeometry(sh2, { depth: 0.03, bevelEnabled: false, curveSegments: 18 });
    under.rotateX(Math.PI / 2).translate(TABLE.cx, TABLE.top - T * 0.75, TABLE.cz);
    mesh(mergePainted([[under, '#8f7660']]), M.tableEdge, table);
    // pedestals + spine
    const bp = [];
    for (const dz of [-1.75, 1.75]) {
      bp.push([rbox(0.7, TABLE.top - 0.07, 0.09, 0.02, TABLE.cx, (TABLE.top - 0.07) / 2, TABLE.cz + dz), '#41444d']);
      bp.push([rbox(0.86, 0.025, 0.2, 0.01, TABLE.cx, 0.0125, TABLE.cz + dz), '#2f3138']);
    }
    bp.push([rbox(0.16, 0.1, 3.6, 0.02, TABLE.cx, TABLE.top - 0.12, TABLE.cz), '#41444d']);
    mesh(mergePainted(bp), M.base, table);
    // centre cable channel cover + power hatches
    const ch = [];
    ch.push([box(0.11, 0.003, L - 1.2, TABLE.cx, TABLE.top + 0.0015, TABLE.cz), '#b9bec8']);
    for (const dz of [-1.8, 0, 1.8]) ch.push([box(0.15, 0.004, 0.28, TABLE.cx, TABLE.top + 0.002, TABLE.cz + dz), '#4b4f59']);
    mesh(mergePainted(ch), M.chairMetal, table);
  }

  // ---- chairs
  const chairs = {};
  const chairGeo = (() => {
    const parts = [], pads = [], metal = [];
    // seat
    pads.push([rbox(0.52, 0.08, 0.5, 0.035, 0, 0.43, 0.02, 3), '#ece9e3']);
    // back: curved, reclined, wraps around the sitter; pad inset
    const back = tubeGeo(tube([[0.0, 0.24, 0.04, 0, 3.2], [0.12, 0.255, 0.045, 0, 3.4], [0.36, 0.25, 0.045, 0, 3.4], [0.56, 0.23, 0.04, 0, 3.0], [0.62, 0.17, 0.035, 0, 2.6]]), { nu: 32, nv: 12 });
    const bp = back.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); bp.setZ(i, bp.getZ(i) + 0.55 * x * x); }
    back.computeVertexNormals();
    back.rotateX(-0.16); back.translate(0, 0.5, -0.24);
    parts.push([back, '#dcd9d2']);
    // armrests: loops from the back to the seat front
    for (const sx of [-1, 1]) {
      metal.push([sweep([[sx * 0.27, 0.43, -0.2], [sx * 0.285, 0.64, -0.12], [sx * 0.285, 0.665, 0.06], [sx * 0.27, 0.62, 0.2], [sx * 0.25, 0.44, 0.22]], [[0.012, 0.012], [0.012, 0.012]], { nu: 8, nv: 24 }), '#c7ccd4']);
      pads.push([rbox(0.06, 0.03, 0.26, 0.012, sx * 0.285, 0.675, 0.0), '#cfcac2']);
    }
    // column + five-star base + casters
    metal.push([new THREE.CylinderGeometry(0.03, 0.035, 0.32, 12).translate(0, 0.23, 0.0), '#b3b8c1']);
    metal.push([new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14).translate(0, 0.38, 0.0), '#3a3c44']);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      const leg = sweep([[0, 0.08, 0], [Math.sin(a) * 0.18, 0.07, Math.cos(a) * 0.18], [Math.sin(a) * 0.32, 0.055, Math.cos(a) * 0.32]], [[0.022, 0.014], [0.018, 0.012], [0.014, 0.01]], { nu: 6, nv: 8 });
      metal.push([leg, '#b3b8c1']);
      metal.push([new THREE.SphereGeometry(0.028, 10, 8).translate(Math.sin(a) * 0.32, 0.028, Math.cos(a) * 0.32), '#2b2d33']);
    }
    return { shell: mergePainted(parts), pad: mergePainted(pads), metal: mergePainted(metal) };
  })();
  for (const [id, s] of Object.entries(SEATS)) {
    const c = new THREE.Group();
    c.position.set(s.x - Math.sin(s.yaw) * 0.0, 0, s.z - Math.cos(s.yaw) * 0.0);
    c.rotation.y = s.yaw;
    mesh(chairGeo.shell, M.chairShell, c); mesh(chairGeo.pad, M.chairPad, c); mesh(chairGeo.metal, M.chairMetal, c);
    casters.add(c);
    chairs[id] = c;
  }

  // ---- the screen: a 4 m LED wall on two floor-to-ceiling steel posts, in front of the glass
  const screen = {};
  {
    const g = new THREE.Group();
    g.position.set(SCREEN.x, 0, SCREEN.z);
    casters.add(g);
    const yC = SCREEN.y - FLOOR;
    const fr = [];
    fr.push([rbox(SCREEN.w + 0.07, SCREEN.h + 0.07, 0.06, 0.012, 0, yC, -0.02), '#1d1f25']);
    fr.push([rbox(SCREEN.w * 0.7, SCREEN.h * 0.6, 0.12, 0.02, 0, yC, -0.1), '#2c2f37']);
    // a slim "安-2" status bar under the screen (thin light line)
    mesh(mergePainted(fr), M.screenFrame, g);
    const po = [];
    for (const sx of [-1, 1]) {
      po.push([box(0.06, Hh + 0.42, 0.06, sx * (SCREEN.w / 2 + 0.16), (Hh + 0.42) / 2, -0.1), '#30333b']);
      // brackets
      for (const y of [yC - SCREEN.h * 0.3, yC + SCREEN.h * 0.3]) po.push([box(0.2, 0.04, 0.04, sx * (SCREEN.w / 2 + 0.06), y, -0.1), '#30333b']);
    }
    mesh(mergePainted(po), M.post, g);
    // the emissive face (UI canvas)
    const c0 = document.createElement('canvas'); c0.width = 1920; c0.height = 1080;
    const tex = new THREE.CanvasTexture(c0);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = ctx.engine?.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    const faceM = meetToon({ id: 101, unlit: true, emissiveMap: tex, emissiveGain: 1.0, emissive: '#000000' });
    const face = mesh(paint(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h).translate(0, yC, 0.012), '#ffffff'), faceM, g);
    face.userData.noShadow = true;
    screen.tex = tex; screen.mat = faceM; screen.group = g;
  }

  // ---- plants: two fiddle-leaf figs flanking the screen against the glass, one in the east corner
  {
    const R = new Rng(77);
    const leafG = (() => {
      // fiddle leaf: broad top, narrow base, slightly cupped, with a midrib fold
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.bezierCurveTo(0.06, 0.03, 0.11, 0.12, 0.1, 0.2);
      sh.bezierCurveTo(0.095, 0.27, 0.03, 0.3, 0, 0.29);
      sh.bezierCurveTo(-0.03, 0.3, -0.095, 0.27, -0.1, 0.2);
      sh.bezierCurveTo(-0.11, 0.12, -0.06, 0.03, 0, 0);
      const g = new THREE.ShapeGeometry(sh, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.abs(x) * 0.35 - 0.12 * (y / 0.29) ** 2); }
      g.computeVertexNormals();
      return g;
    })();
    const tree = (x, z, h, seed) => {
      const Rr = new Rng(seed);
      const leaves = [], wood = [], pot = [];
      pot.push([tubeGeo(tube([[0, 0.24, 0.24, 0, 2.0], [0.5, 0.27, 0.27, 0, 2.0], [0.52, 0.255, 0.255, 0, 2.0]]), { nu: 28, nv: 4 }).translate(x, 0, z), '#e9e7e2']);
      pot.push([new THREE.CylinderGeometry(0.25, 0.25, 0.02, 24).translate(x, 0.49, z), '#5a4a3e']);
      // trunk
      const trunk = [[x, 0.48, z], [x + Rr.range(-0.05, 0.05), 0.48 + h * 0.4, z + Rr.range(-0.05, 0.05)], [x + Rr.range(-0.1, 0.1), 0.48 + h * 0.75, z + Rr.range(-0.08, 0.08)], [x + Rr.range(-0.12, 0.12), 0.48 + h, z + Rr.range(-0.1, 0.1)]];
      wood.push([sweep(trunk, [[0.035, 0.035], [0.025, 0.025], [0.015, 0.015]], { nu: 8, nv: 20 }), '#8a7462']);
      // branches with leaf clusters
      const nB = 7;
      for (let b = 0; b < nB; b++) {
        const t = 0.35 + 0.65 * (b / (nB - 1));
        const ty = 0.48 + h * t;
        const a = Rr.range(0, Math.PI * 2), len = Rr.range(0.25, 0.5) * (1.1 - t * 0.4);
        const bx = x + Math.cos(a) * len, bz = z + Math.sin(a) * len, by = ty + Rr.range(0.1, 0.3);
        wood.push([sweep([[x, ty, z], [(x + bx) / 2, ty + 0.06, (z + bz) / 2], [bx, by, bz]], [[0.014, 0.014], [0.008, 0.008]], { nu: 6, nv: 10 }), '#8a7462']);
        const nL = Rr.int(6, 10);
        for (let k = 0; k < nL; k++) {
          const u = k / nL;
          const lp = new THREE.Vector3(bx + Rr.range(-0.15, 0.15), by + Rr.range(-0.12, 0.2), bz + Rr.range(-0.15, 0.15));
          const g = leafG.clone();
          const sc = Rr.range(0.75, 1.25);
          g.scale(sc, sc, sc);
          g.rotateX(-Rr.range(0.3, 1.2));
          g.rotateY(Rr.range(0, Math.PI * 2));
          g.rotateZ(Rr.range(-0.4, 0.4));
          g.translate(lp.x, lp.y, lp.z);
          const gc = ['#4f7f3c', '#5d8f43', '#3f6c34', '#6a9a4a'][Rr.int(0, 3)];
          leaves.push([g, gc]);
          void u;
        }
      }
      mesh(mergePainted(pot), M.pot);
      mesh(mergePainted(wood), M.trunk);
      mesh(mergePainted(leaves), M.leaf);
    };
    tree(-3.75, -5.75, 1.9, 11);
    tree(3.75, -5.75, 2.1, 12);
    tree(8.1, 5.6, 2.0, 13);
    tree(-8.25, -5.6, 1.7, 14);
    void R;
  }

  return { room, casters, plain, chairs, screen, M };
}
