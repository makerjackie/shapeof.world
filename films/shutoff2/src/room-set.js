// 林工's flat, the set: architecture (painted, id 0) and dressing (inked cels). Room-local metres (see room-layout.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { toonMaterial } from './materials.js';
import { Rng } from './util.js';
import { ROOM } from './room-layout.js';
import { floorTex, wallTex, booksTex, keysTex, posterTex, meshTex, pageTex, badgeTex } from './room-tex.js';

const RB = (w, h, d, r = 0.006, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));

export function buildSet(parent) {
  const g = new THREE.Group(); parent.add(g);
  const casters = new THREE.Group(); g.add(casters);     // things that may cast the window light's shadow
  const M = {
    wall: toonMaterial({ color: '#ffffff', map: wallTex(3, [196, 200, 212]), id: 0 }),
    wallB: toonMaterial({ color: '#ffffff', map: wallTex(4, [188, 192, 206]), id: 0 }),
    ceil: toonMaterial({ color: '#d9dbe2', id: 0 }),
    floor: toonMaterial({ color: '#ffffff', map: floorTex(), id: 0 }),
    skirt: toonMaterial({ color: '#e4e4e8', id: 2 }),
    frame: toonMaterial({ color: '#4a5060', id: 6, spec: 0.6 }),
    sill: toonMaterial({ color: '#d8d6d0', id: 7, spec: 0.3 }),
    curtain: toonMaterial({ color: '#56607a', id: 5 }),
    curtainIn: toonMaterial({ color: '#3d4558', id: 5 }),
    rail: toonMaterial({ color: '#2b2f38', id: 8 }),
    deskTop: toonMaterial({ color: '#d8c8b8', map: floorTex(), id: 10 }),
    deskEdge: toonMaterial({ color: '#6e5c4c', id: 9 }),
    black: toonMaterial({ color: '#1d2028', id: 11, spec: 0.5 }),
    monitor: toonMaterial({ color: '#16181e', id: 12, spec: 0.7 }),
    screenOff: toonMaterial({ color: '#0b0d12', id: 13, spec: 1 }),
    keys: toonMaterial({ color: '#ffffff', map: keysTex(), id: 14 }),
    mouse: toonMaterial({ color: '#2a2d36', id: 15, spec: 0.8 }),
    mug: toonMaterial({ color: '#f1f0ec', id: 16, spec: 0.7, rim: 0.3 }),
    coffee: toonMaterial({ color: '#2a1a12', id: 17, spec: 1 }),
    page: toonMaterial({ color: '#ffffff', map: pageTex(), id: 18 }),
    cover: toonMaterial({ color: '#33415e', id: 19 }),
    pen: toonMaterial({ color: '#20242c', id: 20, spec: 0.8 }),
    badge: toonMaterial({ color: '#ffffff', map: badgeTex(), id: 21 }),
    lanyard: toonMaterial({ color: '#2f4a8a', id: 22 }),
    lamp: toonMaterial({ color: '#e9e9ec', id: 23, spec: 0.6 }),
    lampJ: toonMaterial({ color: '#8a8f9a', id: 24, spec: 0.8 }),
    cable: toonMaterial({ color: '#191b21', id: 25 }),
    strip: toonMaterial({ color: '#efefef', id: 26 }),
    chairMesh: toonMaterial({ color: '#ffffff', map: meshTex(), id: 27 }),
    chairFrame: toonMaterial({ color: '#2a2d35', id: 28, spec: 0.6 }),
    chairSeat: toonMaterial({ color: '#2c2f38', id: 29 }),
    chrome: toonMaterial({ color: '#8f95a1', id: 30, spec: 1 }),
    jacket: toonMaterial({ color: '#2d3446', id: 31 }),
    shelf: toonMaterial({ color: '#efece6', id: 32 }),
    books: toonMaterial({ color: '#ffffff', map: booksTex(5), id: 33 }),
    books2: toonMaterial({ color: '#ffffff', map: booksTex(9), id: 34 }),
    bed: toonMaterial({ color: '#6b6158', id: 35 }),
    duvet: toonMaterial({ color: '#a8b0c4', id: 36 }),
    sheet: toonMaterial({ color: '#e8eaee', id: 37 }),
    pillow: toonMaterial({ color: '#dfe2ea', id: 38 }),
    ac: toonMaterial({ color: '#eceeef', id: 39, spec: 0.3 }),
    acDark: toonMaterial({ color: '#8d939e', id: 40 }),
    dome: toonMaterial({ color: '#eef0f2', id: 50, spec: 0.8 }),
    domeGlass: toonMaterial({ color: '#15171d', id: 51, spec: 1 }),
    door: toonMaterial({ color: '#c8c0b4', id: 52 }),
    handle: toonMaterial({ color: '#9ca2ad', id: 53, spec: 1 }),
    plate: toonMaterial({ color: '#f1f1f1', id: 54 }),
    poster: toonMaterial({ color: '#ffffff', map: posterTex(), id: 55 }),
    posterF: toonMaterial({ color: '#2a2c33', id: 56 }),
    plant: toonMaterial({ color: '#4f6b4a', id: 57 }),
    pot: toonMaterial({ color: '#c9b9a5', id: 58 }),
    bag: toonMaterial({ color: '#2f3442', id: 59 }),
    ledG: toonMaterial({ color: '#000000', id: 120, unlit: true, emissive: '#4dff9a', emissiveGain: 1.6 }),
    ledB: toonMaterial({ color: '#000000', id: 121, unlit: true, emissive: '#5fb4ff', emissiveGain: 1.4 }),
    ledR: toonMaterial({ color: '#000000', id: 122, unlit: true, emissive: '#ff4a3a', emissiveGain: 1.2 }),
    ledW: toonMaterial({ color: '#000000', id: 123, unlit: true, emissive: '#bfe6ff', emissiveGain: 1.0 }),
  };
  const add = (geo, mat, x = 0, y = 0, z = 0, par = g, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; };
  const { x0, x1, zWin, z1, ceil } = ROOM, W = ROOM.win, D = ROOM.desk;

  // ---------------------------------------------------------------- architecture
  // floor (uv in metres / 1.6)
  {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - zWin + 0.3).rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 1.6, uv.getY(i) * (z1 - zWin) / 1.6);
    add(geo, M.floor, (x0 + x1) / 2, 0, (zWin + z1) / 2 - 0.15);
    const c = new THREE.PlaneGeometry(x1 - x0, z1 - zWin + 0.3).rotateX(Math.PI / 2);
    add(c, M.ceil, (x0 + x1) / 2, ceil, (zWin + z1) / 2 - 0.15);
  }
  // window wall with the opening (four slabs around it, 0.24 deep reveal)
  const WT = 0.24;
  {
    const parts = [
      [x1 - x0, W.y0, (x0 + x1) / 2, W.y0 / 2],
      [x1 - x0, ceil - W.y1, (x0 + x1) / 2, (W.y1 + ceil) / 2],
      [W.x0 - x0, W.y1 - W.y0, (x0 + W.x0) / 2, (W.y0 + W.y1) / 2],
      [x1 - W.x1, W.y1 - W.y0, (W.x1 + x1) / 2, (W.y0 + W.y1) / 2],
    ];
    for (const [w, h, cx, cy] of parts) add(new THREE.BoxGeometry(w, h, WT), M.wall, cx, cy, zWin - WT / 2, casters);
  }
  // side and back walls
  add(new THREE.BoxGeometry(0.1, ceil, z1 - zWin), M.wallB, x0 - 0.05, ceil / 2, (zWin + z1) / 2);
  add(new THREE.BoxGeometry(0.1, ceil, z1 - zWin), M.wallB, x1 + 0.05, ceil / 2, (zWin + z1) / 2);
  add(new THREE.BoxGeometry(x1 - x0, ceil, 0.1), M.wall, (x0 + x1) / 2, ceil / 2, z1 + 0.05);
  // skirting boards
  add(new THREE.BoxGeometry(0.012, 0.08, z1 - zWin), M.skirt, x0 + 0.006, 0.04, (zWin + z1) / 2);
  add(new THREE.BoxGeometry(0.012, 0.08, z1 - zWin), M.skirt, x1 - 0.006, 0.04, (zWin + z1) / 2);
  add(new THREE.BoxGeometry(x1 - x0, 0.08, 0.012), M.skirt, (x0 + x1) / 2, 0.04, z1 - 0.006);
  // inner sill (deep ledge) + a cactus and a book on it
  add(RB(W.x1 - W.x0 + 0.1, 0.035, WT + 0.06, 0.008), M.sill, 0, W.y0 - 0.0175, zWin - WT / 2 + 0.03, casters);
  // window frame: outer frame, two mullions, transom, sashes, handle
  const glassZ = zWin - WT + 0.05;
  {
    const f = W.frame, fd = 0.07;
    const fz = glassZ;
    const bars = [
      [W.x1 - W.x0, f, (W.x0 + W.x1) / 2, W.y0 + f / 2], [W.x1 - W.x0, f, (W.x0 + W.x1) / 2, W.y1 - f / 2],
      [f, W.y1 - W.y0, W.x0 + f / 2, (W.y0 + W.y1) / 2], [f, W.y1 - W.y0, W.x1 - f / 2, (W.y0 + W.y1) / 2],
      [f * 0.8, W.y1 - W.y0, W.mull[0], (W.y0 + W.y1) / 2], [f * 0.8, W.y1 - W.y0, W.mull[1], (W.y0 + W.y1) / 2],
      [W.x1 - W.x0, f * 0.7, (W.x0 + W.x1) / 2, 2.08],
    ];
    for (const [w, h, cx, cy] of bars) add(RB(w, h, fd, 0.008), M.frame, cx, cy, fz, casters);
    // sash frames of the middle (openable) pane, a little proud
    const sx0 = W.mull[0] + 0.03, sx1 = W.mull[1] - 0.03, sy0 = W.y0 + 0.05, sy1 = 2.08 - 0.04;
    for (const [w, h, cx, cy] of [[sx1 - sx0, 0.035, (sx0 + sx1) / 2, sy0], [sx1 - sx0, 0.035, (sx0 + sx1) / 2, sy1], [0.035, sy1 - sy0, sx0, (sy0 + sy1) / 2], [0.035, sy1 - sy0, sx1, (sy0 + sy1) / 2]]) add(RB(w, h, 0.05, 0.006), M.frame, cx, cy, fz + 0.03, casters);
    const hnd = add(RB(0.02, 0.12, 0.03, 0.006), M.handle, sx1 - 0.04, 1.3, fz + 0.065);
    void hnd;
    // outer ledge beyond the glass (rain lands here)
    add(new THREE.BoxGeometry(W.x1 - W.x0 + 0.2, 0.04, 0.22), M.sill, 0, W.y0 - 0.06, zWin - WT - 0.08);
  }
  // curtains: gathered folds hanging from a rail, either side of the window
  {
    add(new THREE.CylinderGeometry(0.012, 0.012, x1 - x0 - 0.1, 10).rotateZ(Math.PI / 2), M.rail, 0, ceil - 0.08, zWin + 0.12);
    const curtain = (xa, xb, seed) => {
      const r = new Rng(seed), nx = 64, ny = 24, H = ceil - 0.1;
      const geo = new THREE.PlaneGeometry(1, 1, nx, ny);
      const p = geo.attributes.position;
      const ph = r.range(0, 6);
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
        const x = xa + (xb - xa) * u;
        const y = 0.02 + v * H;
        const fold = Math.sin(u * Math.PI * 2 * 7 + ph + Math.sin(u * 9) * 0.6) * (0.045 + 0.02 * (1 - v)) + Math.sin(u * 37 + ph) * 0.008;
        p.setXYZ(i, x + Math.sin(v * 3 + u * 5) * 0.01, y, zWin + 0.12 + fold);
      }
      geo.computeVertexNormals();
      add(geo, M.curtain, 0, 0, 0, casters);
    };
    curtain(x0 + 0.05, W.x0 + 0.32, 3);
    curtain(W.x1 - 0.3, x1 - 0.05, 7);
  }
  // ceiling light (off), smoke detector, AC unit high on the right wall
  {
    add(new THREE.CylinderGeometry(0.26, 0.28, 0.06, 40), M.ac, 0, ceil - 0.03, 0.2);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), M.ac, -0.9, ceil - 0.015, 1.2);
    add(new THREE.SphereGeometry(0.004, 8, 6), M.ledG, -0.9, ceil - 0.032, 1.2);
    const ac = new THREE.Group(); ac.position.set(x1 - 0.12, 2.3, -0.9); ac.rotation.y = -Math.PI / 2; g.add(ac);
    add(RB(0.92, 0.29, 0.21, 0.04, 3), M.ac, 0, 0, 0, ac);
    add(RB(0.86, 0.035, 0.12, 0.01), M.acDark, 0, -0.13, 0.05, ac);
    for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.84, 0.004, 0.006), M.acDark, 0, -0.145, 0.0 + i * 0.012, ac);
    add(new THREE.BoxGeometry(0.03, 0.008, 0.002), M.ledB, 0.3, 0.02, 0.106, ac);
  }
  // door (back wall, left), light switch, poster
  {
    add(RB(0.9, 2.05, 0.05, 0.01), M.door, -1.3, 1.025, z1 - 0.03);
    add(RB(0.14, 0.02, 0.03, 0.008), M.handle, -0.95, 1.0, z1 - 0.075);
    add(RB(0.08, 0.12, 0.012, 0.004), M.plate, -0.68, 1.3, z1 - 0.006);
    const pf = new THREE.Group(); pf.position.set(x0 + 0.012, 1.55, 0.6); pf.rotation.y = Math.PI / 2; g.add(pf);
    add(RB(0.44, 0.58, 0.022, 0.004), M.posterF, 0, 0, 0, pf);
    add(new THREE.PlaneGeometry(0.4, 0.54), M.poster, 0, 0, 0.0115, pf);
  }

  // ---------------------------------------------------------------- the desk
  const desk = new THREE.Group(); g.add(desk); casters.add(desk);
  {
    const w = D.x1 - D.x0, d = D.z1 - D.z0, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2;
    add(RB(w, 0.026, d, 0.006), M.deskTop, cx, D.top - 0.013, cz, desk);
    add(new THREE.BoxGeometry(w - 0.02, 0.004, 0.004), M.deskEdge, cx, D.top - 0.024, D.z1 - 0.002, desk);
    // black steel frame: two A-legs and a rail
    for (const sx of [D.x0 + 0.06, D.x1 - 0.06]) {
      add(RB(0.04, D.top - 0.03, 0.04, 0.006), M.black, sx, (D.top - 0.03) / 2, D.z1 - 0.08, desk);
      add(RB(0.04, D.top - 0.03, 0.04, 0.006), M.black, sx, (D.top - 0.03) / 2, D.z0 + 0.08, desk);
      add(RB(0.04, 0.03, d - 0.1, 0.006), M.black, sx, 0.015, cz, desk);
      add(RB(0.04, 0.03, d - 0.1, 0.006), M.black, sx, D.top - 0.045, cz, desk);
    }
    add(RB(w - 0.14, 0.05, 0.02, 0.006), M.black, cx, D.top - 0.06, D.z0 + 0.1, desk);
    // monitor (off) on a stand, right of centre
    const mon = new THREE.Group(); mon.position.set(0.36, D.top, -1.76); mon.rotation.y = -0.12; desk.add(mon);
    add(RB(0.24, 0.012, 0.18, 0.006), M.monitor, 0, 0.006, 0.0, mon);
    add(RB(0.05, 0.3, 0.025, 0.008), M.monitor, 0, 0.16, -0.03, mon);
    add(RB(0.63, 0.375, 0.022, 0.008), M.monitor, 0, 0.36, 0.0, mon);
    add(new THREE.PlaneGeometry(0.605, 0.34), M.screenOff, 0, 0.365, 0.0115, mon);
    add(new THREE.SphereGeometry(0.0025, 8, 6), M.ledR, 0.29, 0.18, 0.012, mon);
    // sticky notes on the bezel
    const noteM = toonMaterial({ color: '#f2e6a6', id: 60 });
    add(new THREE.PlaneGeometry(0.05, 0.05), noteM, -0.27, 0.2, 0.0125, mon).rotation.z = 0.06;
    add(new THREE.PlaneGeometry(0.05, 0.05), toonMaterial({ color: '#b9d8e8', id: 59 }), -0.21, 0.205, 0.0126, mon).rotation.z = -0.08;
    // keyboard + mouse
    add(RB(0.44, 0.018, 0.135, 0.006), M.black, 0.4, D.top + 0.009, -1.56, desk).rotation.y = -0.05;
    const kb = add(new THREE.PlaneGeometry(0.42, 0.12).rotateX(-Math.PI / 2), M.keys, 0.4, D.top + 0.0185, -1.56, desk); kb.rotation.y = -0.05;
    add(new THREE.SphereGeometry(0.03, 20, 12).scale(1, 0.45, 1.6), M.mouse, 0.69, D.top + 0.008, -1.5, desk);
    // the mug (☕), cold coffee inside
    const mug = new THREE.Group(); mug.position.set(-0.34, D.top, -1.5); desk.add(mug);
    const prof = [[0, 0], [0.036, 0], [0.04, 0.004], [0.041, 0.09], [0.038, 0.095], [0.035, 0.09], [0.034, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(prof, 32), M.mug, 0, 0, 0, mug);
    add(new THREE.CircleGeometry(0.0345, 28).rotateX(-Math.PI / 2), M.coffee, 0, 0.07, 0, mug);
    add(new THREE.TorusGeometry(0.024, 0.006, 8, 20, Math.PI * 1.2).rotateZ(-Math.PI * 0.6), M.mug, 0.041, 0.05, 0, mug);
    // notebook + pen, the work badge on its lanyard
    add(RB(0.17, 0.012, 0.235, 0.003), M.cover, -0.55, D.top + 0.006, -1.62, desk).rotation.y = 0.2;
    add(new THREE.PlaneGeometry(0.155, 0.22).rotateX(-Math.PI / 2), M.page, -0.55, D.top + 0.0125, -1.62, desk).rotation.y = 0.2;
    add(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 10).rotateZ(Math.PI / 2), M.pen, -0.47, D.top + 0.017, -1.54, desk).rotation.y = 0.9;
    const badge = add(RB(0.054, 0.003, 0.086, 0.002), M.badge, -0.5, D.top + 0.0016, -1.78, desk); badge.rotation.y = 0.35;
    add(new THREE.PlaneGeometry(0.05, 0.08).rotateX(-Math.PI / 2), M.badge, -0.5, D.top + 0.0034, -1.78, desk).rotation.y = 0.35;
    {
      const pts = [[-0.51, -1.735], [-0.55, -1.66], [-0.64, -1.63], [-0.72, -1.7], [-0.68, -1.8], [-0.58, -1.84], [-0.51, -1.82]].map(([x, z]) => new THREE.Vector3(x, D.top + 0.003, z));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, 0.003, 4, true).scale(1, 0.4, 1).translate(0, D.top * 0.6 + 0.0005, 0), M.lanyard, 0, 0, 0, desk);
    }
    // desk lamp (off): base, two arms, shade
    const lamp = new THREE.Group(); lamp.position.set(-0.66, D.top, -1.78); desk.add(lamp);
    add(new THREE.CylinderGeometry(0.075, 0.08, 0.02, 32), M.lamp, 0, 0.01, 0, lamp);
    const a1 = add(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 10), M.lampJ, 0, 0.19, 0.04, lamp); a1.rotation.x = 0.25;
    const a2 = add(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 10), M.lampJ, 0.0, 0.42, 0.18, lamp); a2.rotation.x = 1.1;
    const shade = add(new THREE.ConeGeometry(0.07, 0.12, 28, 1, true), M.lamp, 0, 0.42, 0.33, lamp); shade.rotation.x = 2.3;
    add(new THREE.SphereGeometry(0.014, 10, 8), M.lampJ, 0, 0.36, 0.07, lamp);
    // cables: monitor + lamp → behind the desk → power strip on the floor

    const cable = (pts, r = 0.004) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 48, r, 6), M.cable, 0, 0, 0, desk);
    cable([[0.36, D.top + 0.15, -1.8], [0.34, D.top - 0.05, -1.9], [0.3, 0.35, -1.93], [0.2, 0.05, -1.9], [0.1, 0.03, -1.86]]);
    cable([[-0.66, D.top + 0.01, -1.85], [-0.6, D.top - 0.04, -1.92], [-0.4, 0.4, -1.94], [-0.1, 0.06, -1.92], [0.05, 0.03, -1.86]]);
    cable([[0.0, D.top - 0.01, -1.6], [0.02, 0.5, -1.7], [0.1, 0.12, -1.75], [0.2, 0.03, -1.82]], 0.0028);
    cable([[0.3, 0.02, -1.86], [0.6, 0.01, -1.7], [1.0, 0.01, -1.85], [1.5, 0.01, -1.95]], 0.003);
    // a small plant on the window sill, a stack of books
    const pot = add(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 20), M.pot, 1.25, W.y0 + 0.045, zWin - 0.06);
    void pot;
    for (let i = 0; i < 7; i++) {
      const l = add(new THREE.ConeGeometry(0.018, 0.16 + (i % 3) * 0.03, 6), M.plant, 1.25 + Math.sin(i * 2.4) * 0.025, W.y0 + 0.16, zWin - 0.06 + Math.cos(i * 2.4) * 0.025);
      l.rotation.set(Math.cos(i * 2.4) * 0.35, 0, -Math.sin(i * 2.4) * 0.35);
    }
    add(RB(0.22, 0.04, 0.16, 0.004), M.cover, -1.3, W.y0 + 0.02, zWin - 0.08).rotation.y = 0.1;
    add(RB(0.2, 0.03, 0.15, 0.004), toonMaterial({ color: '#8c3b3b', id: 61 }), -1.3, W.y0 + 0.055, zWin - 0.08).rotation.y = -0.05;
  }

  // ---------------------------------------------------------------- the chair (mesh office chair) + his jacket on it
  const chair = new THREE.Group(); chair.position.copy(ROOM.seat); chair.rotation.y = 0.32; g.add(chair); casters.add(chair);
  {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3;
      const leg = add(RB(0.3, 0.03, 0.045, 0.01), M.chairFrame, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, chair); leg.rotation.y = -a;
      add(new THREE.SphereGeometry(0.025, 12, 8), M.black, Math.cos(a) * 0.3, 0.025, Math.sin(a) * 0.3, chair);
    }
    add(new THREE.CylinderGeometry(0.022, 0.026, 0.34, 16), M.chrome, 0, 0.24, 0, chair);
    add(RB(0.5, 0.075, 0.48, 0.03, 3), M.chairSeat, 0, 0.45, -0.02, chair);
    // back: frame + mesh, curved
    const back = new THREE.Group(); back.position.set(0, 0.56, 0.24); back.rotation.x = -0.12; back.scale.set(1, 0.72, 1); chair.add(back);
    {
      const geo = new THREE.CylinderGeometry(0.9, 0.9, 0.56, 24, 1, true, -0.27, 0.54);
      geo.translate(0, 0.3, -0.88);
      add(geo, M.chairMesh, 0, 0, 0, back);
      const arc = (y) => { const pts = []; for (let i = 0; i <= 16; i++) { const a = -0.27 + 0.54 * i / 16; pts.push(new THREE.Vector3(0.9 * Math.sin(a), y, 0.9 * Math.cos(a) - 0.88)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.016, 8); };
      add(arc(0.02), M.chairFrame, 0, 0, 0, back); add(arc(0.58), M.chairFrame, 0, 0, 0, back);
      for (const s of [-1, 1]) add(RB(0.03, 0.6, 0.03, 0.01), M.chairFrame, s * 0.24, 0.3, 0.02, back);
      add(RB(0.06, 0.2, 0.03, 0.01), M.chairFrame, 0, -0.08, 0.02, back);
    }
    for (const s of [-1, 1]) {
      add(RB(0.03, 0.2, 0.03, 0.01), M.chairFrame, s * 0.24, 0.57, 0.02, chair);
      add(RB(0.06, 0.03, 0.24, 0.012), M.chairSeat, s * 0.25, 0.68, 0.0, chair);
    }
  }
  // his jacket hung over the chair back: draped shell with folds
  {
    const geo = new THREE.PlaneGeometry(0.56, 0.62, 40, 30);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const v = 0.5 - y / 0.62;                   // 0 at the top fold, 1 at the hem
      const over = Math.max(0, 0.18 - v) / 0.18;  // the part folded over the top rail
      const z = 0.27 + 0.04 + Math.sin(x * 22 + v * 3) * 0.012 * v + over * -0.05;
      const yy = 1.15 - v * 0.62 + over * 0.0;
      p.setXYZ(i, x * (1 + v * 0.12) + Math.sin(v * 9 + x * 4) * 0.01, yy, z + (1 - over) * v * 0.06);
    }
    geo.computeVertexNormals();
    const j = add(geo, M.jacket, 0, 0, 0, chair);
    j.position.set(0, -0.2, 0.0);
  }

  // ---------------------------------------------------------------- the bookshelf on the left wall
  {
    const sh = new THREE.Group(); sh.position.set(x0 + 0.17, 0, -0.5); sh.rotation.y = Math.PI / 2; g.add(sh);
    const Wd = 0.9, H = 1.9, Dp = 0.3;
    add(RB(0.022, H, Dp, 0.004), M.shelf, -Wd / 2, H / 2, 0, sh); add(RB(0.022, H, Dp, 0.004), M.shelf, Wd / 2, H / 2, 0, sh);
    const r = new Rng(31);
    for (let k = 0; k < 6; k++) {
      const y = 0.04 + k * 0.37;
      add(RB(Wd, 0.022, Dp, 0.004), M.shelf, 0, y, 0, sh);
      if (k === 5) break;
      let x = -Wd / 2 + 0.03;
      while (x < Wd / 2 - 0.08) {
        if (r.next() < 0.18) {   // an object / gap
          if (r.next() < 0.5) add(RB(0.12, 0.09, 0.14, 0.01), M.bag, x + 0.06, y + 0.056, 0.02, sh);
          x += r.range(0.12, 0.2); continue;
        }
        const n = r.int(4, 11);
        const bw = n * r.range(0.022, 0.032), bh = r.range(0.2, 0.3);
        const bk = add(new THREE.BoxGeometry(bw, bh, 0.2), r.next() < 0.5 ? M.books : M.books2, x + bw / 2, y + 0.011 + bh / 2, 0.03, sh);
        const uv = bk.geometry.attributes.uv; const u0 = r.range(0, 0.7);
        for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * bw * 1.4);
        x += bw + 0.005;
      }
    }
    // router with LEDs on the middle shelf
    add(RB(0.2, 0.035, 0.13, 0.01), M.black, 0.25, 0.04 + 2 * 0.37 + 0.03, 0.0, sh);
    for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.0025, 6, 4), i === 2 ? M.ledB : M.ledG, 0.18 + i * 0.03, 0.04 + 2 * 0.37 + 0.04, 0.066, sh);
  }

  // ---------------------------------------------------------------- a tall narrow bookshelf on the right wall by the window
  // (the home camera stands on top of it; see room-homecam.js)
  {
    const sh = new THREE.Group(); sh.position.set(x1 - 0.17, 0, -1.2); sh.rotation.y = -Math.PI / 2; g.add(sh);
    const Wd = 0.66, H = 1.86, Dp = 0.3;
    add(RB(0.022, H, Dp, 0.004), M.shelf, -Wd / 2, H / 2, 0, sh); add(RB(0.022, H, Dp, 0.004), M.shelf, Wd / 2, H / 2, 0, sh);
    add(RB(Wd, 0.012, 0.004, 0.002), M.shelf, 0, H / 2, -Dp / 2 + 0.002, sh);
    const r = new Rng(57);
    const ys = [0.03, 0.39, 0.75, 1.11, 1.47, H - 0.011];
    ys.forEach((y, k) => {
      add(RB(Wd, 0.022, Dp, 0.004), M.shelf, 0, y, 0, sh);
      if (k === ys.length - 1) return;
      let x = -Wd / 2 + 0.025;
      while (x < Wd / 2 - 0.07) {
        if (r.next() < 0.16) { if (r.next() < 0.5) add(RB(0.1, 0.08, 0.13, 0.01), M.bag, x + 0.05, y + 0.05, 0.02, sh); x += r.range(0.1, 0.16); continue; }
        const n = r.int(3, 9);
        const bw = n * r.range(0.022, 0.032), bh = r.range(0.19, 0.29);
        const bk = add(new THREE.BoxGeometry(bw, bh, 0.2), r.next() < 0.5 ? M.books : M.books2, x + bw / 2, y + 0.011 + bh / 2, 0.03, sh);
        const uv = bk.geometry.attributes.uv; const u0 = r.range(0, 0.7);
        for (let q = 0; q < uv.count; q++) uv.setX(q, u0 + uv.getX(q) * bw * 1.4);
        x += bw + 0.005;
      }
    });
    // on top: a stack of books lying flat, a small succulent in a pot, a framed photo turned to the wall
    const top = H + 0.0;
    add(RB(0.21, 0.035, 0.15, 0.004), M.cover, -0.2, top + 0.0175, 0.02, sh).rotation.y = 0.12;
    add(RB(0.19, 0.03, 0.14, 0.004), toonMaterial({ color: '#8c3b3b', id: 62 }), -0.2, top + 0.05, 0.02, sh).rotation.y = -0.05;
    add(RB(0.17, 0.026, 0.13, 0.004), toonMaterial({ color: '#d9d2c3', id: 63 }), -0.21, top + 0.078, 0.025, sh).rotation.y = 0.2;
    add(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 18), M.pot, 0.23, top + 0.03, 0.03, sh);
    for (let q = 0; q < 6; q++) { const l = add(new THREE.SphereGeometry(0.016, 10, 8).scale(0.7, 1.3, 0.7), M.plant, 0.23 + Math.sin(q * 2.1) * 0.014, top + 0.075, 0.03 + Math.cos(q * 2.1) * 0.014, sh); l.rotation.set(Math.cos(q * 2.1) * 0.5, 0, -Math.sin(q * 2.1) * 0.5); }
    const ph = add(RB(0.13, 0.17, 0.012, 0.004), M.posterF, 0.12, top + 0.085, -0.1, sh); ph.rotation.x = -0.18;
    // the camera's power cable down the back of the shelf
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.02, top + 0.01, 0.0], [0.05, top + 0.005, 0.12], [0.08, top - 0.05, 0.145], [0.1, 1.2, 0.148], [0.12, 0.05, 0.148]].map((a) => new THREE.Vector3(...a))), 40, 0.0022, 5), M.cable, 0, 0, 0, sh);
  }

  // ---------------------------------------------------------------- the bed (right, back)
  {
    const bed = new THREE.Group(); bed.position.set(1.32, 0, 1.7); g.add(bed);
    add(RB(1.5, 0.28, 2.05, 0.03, 3), M.bed, 0, 0.14, 0, bed);
    add(RB(1.46, 0.16, 2.0, 0.06, 3), M.sheet, 0, 0.36, 0, bed);
    add(RB(1.5, 0.9, 0.08, 0.03, 3), M.bed, 0, 0.45, 1.06, bed);
    // rumpled duvet: a soft slab with seeded bumps, thrown back
    const geo = new RoundedBoxGeometry(1.56, 0.12, 1.5, 6, 0.05);
    const p = geo.attributes.position, nrm = geo.attributes.normal;
    const r = new Rng(77);
    const bumps = Array.from({ length: 14 }, () => [r.range(-0.8, 0.8), r.range(-0.75, 0.75), r.range(0.12, 0.3), r.range(0.02, 0.06)]);
    const gp = new THREE.PlaneGeometry(1.56, 1.5, 48, 46).rotateX(-Math.PI / 2);
    const q = gp.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), z = q.getZ(i);
      let h = 0;
      for (const [bx, bz, rad, amp] of bumps) h += amp * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (rad * rad));
      const edge = Math.max(Math.abs(x) - 0.72, 0) * 1.6;
      const fold = z < -0.55 ? (z + 0.55) * -0.25 : 0;   // the turned-back fold near the foot
      q.setY(i, 0.47 + h + fold * 0.6 - edge * edge * 1.2);
    }
    gp.computeVertexNormals();
    void p; void nrm; geo.dispose();
    add(gp, M.duvet, 0, 0, 0.18, bed);
    add(RB(0.6, 0.13, 0.38, 0.06, 3), M.pillow, -0.36, 0.5, 0.78, bed).rotation.y = 0.1;
    add(RB(0.6, 0.12, 0.36, 0.06, 3), M.pillow, 0.34, 0.49, 0.8, bed).rotation.y = -0.08;
    // a phone charger cable trailing from the bedside
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.72, 0.44, 0.9], [-0.8, 0.3, 0.8], [-0.82, 0.02, 0.6], [-0.9, 0.01, 0.2]].map((a) => new THREE.Vector3(...a))), 30, 0.0025, 5), M.cable, 0, 0, 0, bed);
  }
  // backpack leaning on the desk leg, slippers
  {
    const bag = add(RB(0.3, 0.42, 0.16, 0.06, 3), M.bag, -0.95, 0.21, -1.35); bag.rotation.set(-0.12, 0.5, 0.05);
    add(RB(0.2, 0.13, 0.03, 0.02), M.bag, -0.95, 0.14, -1.25).rotation.set(-0.12, 0.5, 0.05);
  }
  return { group: g, casters, glassZ, mats: M };
}
