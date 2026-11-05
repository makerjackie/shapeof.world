import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/addons/RoundedBoxGeometry.js';
import { meetToon, paint, canvasTex } from './meet-mat.js';
import { mergePainted, sweep, tube, tubeGeo } from './people-geo.js';
import { Rng } from './util.js';
import { FLOOR, TOP, SEATS, PHONE_LIN, seatFrame } from './meet-layout.js';

// Table props: phones (face up), vote units with their green lights, water glasses, papers, nameplates,
// 林工's coffee cup and notebook. World coordinates (the props group is a child of the scene, not the room).

const rbox = (w, h, d, r, x = 0, y = 0, z = 0, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r).translate(x, y, z);

const NAMES = { chair: '周明远 · 主持', bun: '许 佳', zhang: '张启华', young: '陈 默', bob: '苏 晴', heavy: '何建国' };

function docTex(seed) {
  return canvasTex(256, 362, (g, w, h) => {
    const R = new Rng(seed);
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b3550'; g.fillRect(20, 22, 120, 9);
    g.fillStyle = '#c0392b'; g.fillRect(w - 64, 20, 44, 14);
    g.fillStyle = '#9aa0ad';
    let y = 52;
    for (let k = 0; k < 16; k++) { const ww = R.range(150, 214); g.fillRect(20, y, ww, 4); y += k % 5 === 4 ? 16 : 10; }
    // a small bar chart
    g.fillStyle = '#7f93b8';
    for (let k = 0; k < 6; k++) { const hh = R.range(16, 52); g.fillRect(28 + k * 22, 300 - hh, 14, hh); }
    g.fillStyle = '#c8cdd6'; g.fillRect(20, 300, 160, 2);
  });
}
function nameTex(name) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9a25e'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#20232c';
    g.font = '600 64px "PingFang SC", "Hiragino Sans GB", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, w / 2, h / 2 - 4);
  });
}

// placeholder phone in the Hands department's size: lying flat, screen up (+Y), top toward -Z
function placeholderPhone(M) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(mergePainted([[rbox(0.0715, 0.008, 0.147, 0.0035, 0, 0.004, 0, 3), '#2a2c33']]), M.phoneBody);
  const rim = new THREE.Mesh(mergePainted([[rbox(0.0722, 0.004, 0.1477, 0.0035, 0, 0.004, 0, 2), '#9aa0aa']]), M.phoneRim);
  // the first upload fixes the texture's storage size: start with a canvas of the UI's phone size (720×1560)
  const c0 = document.createElement('canvas'); c0.width = 720; c0.height = 1560;
  const tex = new THREE.CanvasTexture(c0);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sm = meetToon({ id: 102, unlit: true, emissiveMap: tex, emissiveGain: 0, color: '#000000' });
  const scr = new THREE.Mesh(paint(new THREE.PlaneGeometry(0.0665, 0.142).rotateX(-Math.PI / 2).translate(0, 0.0082, 0), '#ffffff'), sm);
  for (const o of [body, rim, scr]) { o.frustumCulled = false; root.add(o); }
  scr.userData.noShadow = true;
  return {
    root,
    setScreen(canvas, glow = 1) {
      if (canvas && tex.image !== canvas) tex.image = canvas;
      if (canvas) tex.needsUpdate = true;
      sm.uniforms.uEmisGain.value = glow;
      sm.uniforms.uUseEmisMap.value = canvas ? 1 : 0;
    },
  };
}

// The Hands department's phone may be modelled standing (screen +Z) or lying (screen +Y): normalise to lying, top -Z.
function adoptPhone(p) {
  const bb = new THREE.Box3().setFromObject(p.root);
  const sz = bb.getSize(new THREE.Vector3());
  const wrap = new THREE.Group();
  wrap.add(p.root);
  if (sz.z < sz.y && sz.z < sz.x) p.root.rotation.x = -Math.PI / 2;      // standing, screen +Z -> up
  else if (sz.x < sz.y && sz.x < sz.z) p.root.rotation.z = Math.PI / 2;
  return { root: wrap, setScreen: (c, g) => p.setScreen(c, g) };
}

export function buildProps(ctx) {
  const g = new THREE.Group();
  const M = {
    phoneBody: meetToon({ id: 43, vc: true, spec: 0.6 }),
    phoneRim: meetToon({ id: 45, vc: true, spec: 0.9 }),
    unit: meetToon({ id: 46, vc: true, spec: 0.5 }),
    glass: meetToon({ id: 40, vc: true, spec: 1.0, rim: 0.5 }),
    water: meetToon({ id: 47, vc: true, spec: 0.8 }),
    cup: meetToon({ id: 48, vc: true, spec: 0.7 }),
    note: meetToon({ id: 49, vc: true }),
  };
  const add = (geo, mat, parent = g) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; parent.add(m); return m; };
  const R = new Rng(2026);

  const makePhone = () => {
    const hp = ctx.hands?.makePhone?.();
    return hp && hp.root ? adoptPhone(hp) : placeholderPhone(M);
  };

  // ---- 林工's place
  const linPhone = makePhone();
  linPhone.root.position.set(PHONE_LIN.x, PHONE_LIN.y - 0.004, PHONE_LIN.z);
  linPhone.root.rotation.y = 0.06;
  g.add(linPhone.root);
  {
    const parts = [];
    // coffee: cup on a saucer, to his left
    const cx = -0.3, cz = 2.06;
    parts.push([tubeGeo(tube([[0, 0.07, 0.07, 0, 2], [0.008, 0.074, 0.074, 0, 2], [0.012, 0.072, 0.072, 0, 2]]), { nu: 28, nv: 3 }).translate(cx, TOP, cz), '#f6f5f2']);
    parts.push([tubeGeo(tube([[0.01, 0.03, 0.03, 0, 2], [0.03, 0.04, 0.04, 0, 2], [0.075, 0.044, 0.044, 0, 2], [0.078, 0.045, 0.045, 0, 2]]), { nu: 28, nv: 6, capTop: false }).translate(cx, TOP, cz), '#f6f5f2']);
    parts.push([sweep([[cx + 0.043, TOP + 0.064, cz], [cx + 0.07, TOP + 0.055, cz], [cx + 0.068, TOP + 0.03, cz], [cx + 0.04, TOP + 0.025, cz]], [[0.006, 0.004], [0.006, 0.004]], { nu: 6, nv: 12 }), '#f6f5f2']);
    parts.push([new THREE.TorusGeometry(0.0205, 0.0013, 6, 24), '#c4c0b8']);
    parts[parts.length - 1][0].rotateX(Math.PI / 2).translate(cx + 0.042, TOP + 0.016, cz + 0.05);
    add(mergePainted(parts), M.cup);
    add(mergePainted([[new THREE.CylinderGeometry(0.041, 0.041, 0.002, 28).translate(cx, TOP + 0.068, cz), '#4a2f22']]), M.water);
    // spoon on the saucer
    // notebook (closed, navy) and a pen, to his right
    const nb = [[rbox(0.15, 0.012, 0.21, 0.004, 0.42, TOP + 0.006, 2.02), '#2f3a55']];
    nb.push([rbox(0.152, 0.004, 0.012, 0.002, 0.42, TOP + 0.0125, 1.93), '#c9a25e']);
    add(mergePainted(nb), M.note);
    const pen = sweep([[0.53, TOP + 0.006, 2.1], [0.56, TOP + 0.006, 1.96]], [[0.0045, 0.0045], [0.004, 0.004]], { nu: 10, nv: 4 });
    add(mergePainted([[pen, '#1e2026']]), M.phoneRim);
  }

  // ---- committee places
  const units = [];     // vote light materials in seat order
  const phones = [];    // committee phones by phone index 0..4
  const seatOrder = ['bun', 'bob', 'zhang', 'heavy', 'young', 'chair'];
  for (const id of seatOrder) {
    const s = SEATS[id], F = seatFrame(id);
    const yawP = s.yaw - Math.PI;
    // vote unit: slim graphite base with three keys and a light bar facing the member; gooseneck mic
    const u = new THREE.Group();
    const [ux, uy, uz] = F.at(0.13, -0.22);
    u.position.set(ux, uy, uz);
    u.rotation.y = s.yaw + Math.PI;           // its front (+Z) faces the member
    const up = [];
    up.push([rbox(0.15, 0.024, 0.1, 0.008, 0, 0.012, 0), '#33363e']);
    for (const kx of [-0.035, 0, 0.035]) up.push([rbox(0.026, 0.006, 0.02, 0.003, kx, 0.025, 0.012), '#5b606b']);
    up.push([sweep([[0, 0.02, -0.03], [0, 0.18, -0.06], [0, 0.31, -0.01], [0, 0.36, 0.06]], [[0.0045, 0.0045], [0.004, 0.004]], { nu: 8, nv: 24 }), '#2a2c32']);
    up.push([tubeGeo(tube([[0, 0.008, 0.008, 0, 2], [0.045, 0.01, 0.01, 0, 2], [0.05, 0.007, 0.007, 0, 2]]), { nu: 14, nv: 4 }).rotateX(Math.PI / 2 - 0.5).translate(0, 0.36, 0.06), '#26282e']);
    add(mergePainted(up), M.unit, u);
    const lightM = meetToon({ id: 105, unlit: true, color: '#000000', emissive: '#ffffff', emissiveGain: 1 });
    const bar = add(mergePainted([[rbox(0.11, 0.006, 0.008, 0.003, 0, 0.018, 0.049), '#ffffff'], [rbox(0.124, 0.005, 0.03, 0.0024, 0, 0.0245, -0.022), '#ffffff'],
      [new THREE.SphereGeometry(0.011, 12, 8).translate(0, 0.362, 0.063), '#ffffff']]), lightM, u);
    bar.userData.noShadow = true;
    g.add(u);
    units.push({ id, mat: lightM, group: u, pos: new THREE.Vector3(ux, uy + 0.02, uz) });

    // water glass + water
    const [wx, , wz] = F.at(0.3, -0.34);
    add(mergePainted([[tubeGeo(tube([[0, 0.028, 0.028, 0, 2], [0.11, 0.033, 0.033, 0, 2]]), { nu: 22, nv: 2, capTop: false }).translate(wx, TOP, wz), '#eef5f8']]), M.glass);
    add(mergePainted([[new THREE.CylinderGeometry(0.0315, 0.0285, 0.075, 22).translate(wx, TOP + 0.04, wz), '#d3e6f0']]), M.water);
    // papers: two fanned sheets
    for (let k = 0; k < 2; k++) {
      const [px, , pz] = F.at(0.27 + k * 0.02, 0.05 - k * 0.03);
      const pm = meetToon({ id: 41, color: '#ffffff', map: docTex(17 + k + id.length * 3) });
      const sh = paint(new THREE.PlaneGeometry(0.21, 0.297).rotateX(-Math.PI / 2).translate(0, 0, 0), '#ffffff');
      const m = add(sh, pm);
      m.position.set(px, TOP + 0.0015 + k * 0.0012, pz);
      m.rotation.y = yawP + R.range(-0.25, 0.25);
    }
    // nameplate (tent card) facing across the table
    {
      const [nx, , nz] = F.at(0.58, 0.0);
      const nm = meetToon({ id: 44, color: '#ffffff', map: nameTex(NAMES[id] ?? '') });
      const card = new THREE.Group();
      for (const sgn of [-1, 1]) {
        const pl = paint(new THREE.PlaneGeometry(0.2, 0.075), '#ffffff');
        const m = new THREE.Mesh(pl, nm);
        m.position.set(0, 0.035, sgn * 0.012);
        m.rotation.x = -sgn * 0.33;
        if (sgn < 0) m.rotation.y = Math.PI;
        m.frustumCulled = false;
        card.add(m);
      }
      card.position.set(nx, TOP, nz);
      card.rotation.y = s.yaw;                 // the +Z face looks away from the member
      g.add(card);
    }
    // phone (members only)
    if (s.phone != null) {
      const ph = makePhone();
      const [px, py, pz] = F.at(0.2, 0.13);
      ph.root.position.set(px, py, pz);
      ph.root.rotation.y = yawP + R.range(-0.18, 0.18) + (id === 'zhang' ? Math.PI + 0.25 : 0);   // 张主任's lies the other way round (readable from across the table)
      g.add(ph.root);
      phones[s.phone] = { ...ph, id, pos: new THREE.Vector3(px, py + 0.01, pz) };
    } else {
      // the chair has a tablet instead
      const [tx, , tz] = F.at(0.22, 0.2);
      const tb = add(mergePainted([[rbox(0.25, 0.008, 0.175, 0.006, 0, 0.004, 0), '#26282e']]), M.phoneBody);
      tb.position.set(tx, TOP, tz); tb.rotation.y = s.yaw + 0.2;
    }
  }
  return { group: g, linPhone, phones, units, M };
}
