import * as THREE from 'three';
import { CU, MAXR } from './city-glsl.js';
import { createSky } from './city-sky.js';
import { readBld, buildBuildings, heightRaster, facadeMaterial } from './city-bld.js';
import { buildGround, buildHills } from './city-ground.js';
import { HQ, buildHQ, buildEmblems } from './city-hq.js';
import { buildScreens, buildRoofSigns } from './city-screens.js';
import { buildBeams, buildNightFx, buildLinks } from './city-fx.js';
import { buildRoofProps } from './city-props.js';
import { readRoads, buildBridges, buildTraffic } from './city-roads.js';
import { smooth, invLerp, clamp } from './util.js';

// 关不掉 · the city department: Futian CBD around 安's HQ, the sky, everything seen through the windows,
// and s26–s30 (the city turning into 安's points and lines).
//   day   (set meet, s26 until the rings): high-key anime morning
//   night (set room): rain, lit windows, wet streets, the HQ's amber emblem far away
//   data  (s26 from CUES.cityData, s27–s30): rings from every screen turn the paint into amber lattice and hairlines
const CORE = [-6220.558, -4262.628, 8174.122, 2371.812];
const FAR = [-20615.24, -15872.90, 25653.38, 12876.34];
const ROOM = new THREE.Vector3(1400, 46.5, 1800);

export async function createCity(ctx) {
  const { scene } = ctx;
  const url = (f) => new URL(`../public/city2/${f}`, import.meta.url).href;
  const loadTex = (f, mips = true) => new Promise((ok, err) => new THREE.TextureLoader().load(url(f), (t) => {
    t.flipY = false;
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = mips;
    t.anisotropy = 8;
    ok(t);
  }, undefined, err));
  const [bb, rb, tCore, tFar] = await Promise.all([fetch(url('bld.bin')).then((r) => r.arrayBuffer()), fetch(url('roads.bin')).then((r) => r.arrayBuffer()), loadTex('ground.png'), loadTex('far.png')]);

  const root = new THREE.Group();
  root.name = 'city';
  scene.add(root);

  // ---- sky
  const sky = createSky();
  root.add(sky.mesh);

  // ---- buildings (the HQ site and 林工's own block cleared)
  const B = readBld(bb);
  const { geo, vols } = buildBuildings(B, [[0, 15, 92], [ROOM.x, ROOM.z, 36]], [[-75, -600, 75, -60]], [[ROOM.x - 60, ROOM.z - 80, 240, 38]]);
  const fac = facadeMaterial();
  const city = new THREE.Mesh(geo, fac);
  city.frustumCulled = false;
  root.add(city);
  const props = buildRoofProps(vols);
  root.add(props);
  // ---- flyovers and traffic
  const RD = readRoads(rb);
  root.add(buildBridges(RD));
  const traffic = buildTraffic(RD, [[0, -900, 2800], [900, 1300, 1700]]);
  root.add(traffic.mesh);

  // ---- HQ
  const hq = buildHQ();
  const hqMesh = new THREE.Mesh(hq.geo, facadeMaterial());
  hqMesh.frustumCulled = false;
  root.add(hqMesh);
  const emb = buildEmblems();
  root.add(emb.grp);

  // ---- height raster for the long shadows
  const hr = heightRaster(vols, CORE, 4096, 1888, hq.foot);
  CU.uHMap.value = hr.tex;
  CU.uHBox.value.set(...CORE);

  // ---- ground + hills
  const ground = buildGround(tCore, tFar, CORE, FAR);
  root.add(ground);
  const hills = buildHills();
  root.add(hills);

  // ---- screens: facing the s26 flight and the meeting-room window, a few facing 林工's window
  const uiTex = new THREE.CanvasTexture(document.createElement('canvas'));
  uiTex.colorSpace = THREE.SRGBColorSpace;
  const scr = buildScreens(vols, [
    { p: new THREE.Vector3(0, 0, -300), n: 9, dmin: 250, dmax: 1500, gap: 230 },
    { p: new THREE.Vector3(0, 0, -300), n: 5, dmin: 1500, dmax: 3200, gap: 420 },
    { p: new THREE.Vector3(0, 0, 0), n: 4, dmin: 200, dmax: 1400, gap: 300 },
    { p: ROOM, n: 4, dmin: 250, dmax: 1800, gap: 300 },
  ], uiTex);
  root.add(scr.grp);
  root.add(buildRoofSigns(vols, [{ p: ROOM, n: 14, dmin: 200, dmax: 2000, hmin: 48, dir: [-0.614, -0.789], cone: 0.55 }, { p: new THREE.Vector3(0, 0, 0), n: 8, dmin: 300, dmax: 2500, hmin: 90 }]));
  // rings start nearest the camera's view first, then outward
  const ringOrder = scr.screens.map((s, i) => [Math.hypot(s.p.x, s.p.z + 500), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const ringT0 = new Array(scr.screens.length);
  ringOrder.forEach((i, k) => { ringT0[i] = ctx.CUES.cityData + 0.12 + k * 0.17; });
  const flipT = new Array(scr.screens.length);
  ringOrder.forEach((i, k) => { flipT[i] = ctx.CUES.cityOut + 1.6 + k * 0.1; });

  // light pillars from the screens (overlay)
  const beams = buildBeams(scr.screens);
  ctx.overlay.add(beams.mesh);
  const links = buildLinks(new THREE.Vector3(0, HQ.crown - 20, HQ.zc), scr.screens);
  ctx.overlay.add(links.mesh);
  const nfx = buildNightFx(vols, ROOM);
  ctx.overlay.add(nfx.grp);

  const anchors = {
    hqTop: new THREE.Vector3(0, HQ.crown, HQ.zc),
    roomWindow: ROOM.clone(),
    hqRoom: new THREE.Vector3(0, 151.5, -7.4),
  };

  let warned = false;
  return {
    anchor: (name) => (anchors[name] ? anchors[name].clone() : new THREE.Vector3()),
    screens: scr.screens.map((s) => ({ p: s.p.clone(), n: s.n.clone(), w: s.w })),
    update(st) {
      const vis = st.set === 'meet' || st.set === 'room' || st.set === 'city';
      root.visible = vis;
      beams.mesh.visible = vis && st.set === 'city';
      nfx.grp.visible = vis && st.set === 'room';
      links.mesh.visible = vis && st.set === 'city';
      nfx.ua.uTime.value = st.t; nfx.ur.uTime.value = st.t;
      if (!vis) return;
      const tr = st.tr;
      const cam = ctx.camera;
      traffic.update(st.t);
      sky.mesh.position.copy(cam.position);
      hills.position.set(cam.position.x, 0, cam.position.z);
      // the room set is night; a look that blends night → dawn/morning (e.g. s18's jump) brings the city's day back
      let night = 0;
      if (st.set === 'room') {
        const L = st.look || {};
        const dayish = (p) => p === 'dawn' || p === 'morning';
        if (dayish(L.preset)) night = L.to === 'night' ? clamp(L.k ?? 0) : 0;
        else night = L.to && dayish(L.to) ? 1 - clamp(L.k ?? 0) : 1;
      }
      CU.uNight.value = night;
      nfx.ur.uAmt.value = night; nfx.ua.uOn.value = night;
      sky.u.uNight.value = night;
      CU.uCamY.value = cam.position.y;
      // the HQ: hidden from inside the meeting room; in s26 the room's window is cut out of its north face
      hqMesh.visible = st.set !== 'meet';
      emb.grp.visible = st.set !== 'meet';
      const inS26 = st.set === 'city';
      // HQ facade cut-out where the meeting room sits (the camera starts inside it in s26)
      CU.uHide.value.set(HQ.room.x, HQ.room.y0, HQ.room.y1, inS26 && tr < ctx.CUES.cityOut + 3.5 ? 1 : 0);

      // ---- screens: ads, then (s26) 早上好 one by one
      let bb = null;
      if (inS26 && ctx.ui && ctx.ui.screen) {
        try { bb = ctx.ui.screen('billboard', st); } catch (e) { if (!warned) { console.error('[city] billboard', e); warned = true; } }
      }
      if (bb) { uiTex.image = bb; uiTex.needsUpdate = true; }
      scr.screens.forEach((s, i) => {
        const u = s.mat.uniforms;
        u.uBB.value = uiTex;
        const k = inS26 && bb ? clamp((tr - flipT[i]) / 0.12) : 0;
        u.uMix.value = k >= 1 ? 1 : k > 0 ? (Math.floor(tr * 30) % 2) : 0;
        u.uFlash.value = inS26 ? Math.max(0, 1 - Math.abs(tr - flipT[i] - 0.05) / 0.12) * 0.8 : 0;
        u.uGain.value = inS26 ? 1.7 : 1.35 - 0.25 * night;
        u.uOn.value = 1;
      });

      // ---- data: rings from every screen
      const R = CU.uRing.value;
      const P = CU.uRingP.value;
      if (inS26 || st.set === 'city') {
        const n = Math.min(MAXR, scr.screens.length);
        // the first 16 screens to speak (in ring order) carry a ring each
        for (let k = 0; k < MAXR; k++) {
          const i = ringOrder[k];
          if (k < n) R[k].set(scr.screens[i].p.x, scr.screens[i].p.y, scr.screens[i].p.z, ringT0[i]);
          else R[k].set(0, -1e5, 0, 1e9);
        }
        P.set(70, n, tr, 190);
        scr.screens.forEach((s, i) => {
          const age = tr - ringT0[i];
          let I = age > 0 ? smooth(age / 0.25) * (0.22 + 0.78 * Math.exp(-age / 1.4)) : 0;
          I *= 0.35 + 0.65 * smooth(invLerp(ctx.CUES.cityData + 1.6, ctx.CUES.cityData + 3.5, tr));   // softer in daylight
          if (tr > ctx.CUES.end1) I = 0.1 + 0.05 * Math.sin(tr * 1.1 + i * 1.7);
          beams.set(i, I, Math.max(0, age));
          // the link from the HQ lands on the screen as its ring leaves
          const drawn = clamp((tr - (ringT0[i] - 0.7)) / 0.7);
          const glow = drawn >= 1 ? 0.25 + 0.75 * Math.exp(-(tr - ringT0[i]) / 1.2) : 0.6;
          links.set(i, drawn, glow * (tr > ctx.CUES.end1 ? 0.6 : 1), tr * 0.8 + i * 0.37);
        });
        links.u.uTime.value = tr;
        CU.uDataAll.value = tr > ctx.CUES.end1 ? 1 : 0;
        // 安's last wave: from the HQ, overtaking every ring, to the edge of the world by the end of s26
        const sw = tr - (ctx.CUES.cityData + 1.6);
        CU.uSweep.value.set(0, 300, HQ.zc, sw > 0 && tr < ctx.CUES.end1 ? 600 * sw + 1600 * sw * sw + 900 * sw * sw * sw : -1);
        CU.uBreath.value = smooth(invLerp(ctx.CUES.cityData + 1.5, ctx.CUES.end1, tr));
        CU.uRipple.value = 0.24 * smooth(invLerp(ctx.CUES.cityData + 2.0, ctx.CUES.cityData + 3.5, tr)) * (1 - 0.45 * smooth(invLerp(ctx.CUES.end1, ctx.CUES.end1 + 2.5, tr)));
        // a slow pulse from 安's HQ every 6 s through the end texts
        const pt = tr - ctx.CUES.end1;
        CU.uPulse.value.set(0, 0, HQ.zc, pt > 0 ? ((pt % 6.5) * 700) : -1);
        // the sky and the hills turn with the grade (cams/city.js cityLook: day → data over cityData + 1.9 … + 4.4)
        const kLook = smooth(invLerp(ctx.CUES.cityData + 1.6, ctx.CUES.cityData + 3.8, tr));
        sky.u.uData.value = tr > ctx.CUES.cityData + 1.6 ? 1 : 0;
        sky.u.uDataWipe.value = tr >= ctx.CUES.end1 ? 1 : 0;
        sky.u.uSweepSky.value.set(0, HQ.zc, CU.uSweep.value.w, CU.uSweep.value.w > 0 ? 1 : 0);
        sky.u.uBreath.value = 0.5 + 0.5 * Math.sin(tr * 0.9);
        hills.userData.u.uHillData.value = smooth(invLerp(0.0, 0.12, kLook));
      } else {
        P.set(70, 0, tr, 190);
        CU.uDataAll.value = 0;
        CU.uPulse.value.w = -1;
        CU.uSweep.value.w = -1;
        CU.uRipple.value = 0;
        sky.u.uData.value = 0;
        hills.userData.u.uHillData.value = 0;
      }
      // sun shadows only by day
      CU.uCityShadow.value = night > 0.5 ? 0 : 1;
      emb.u.uGain.value = 0.9 + 0.1 * night;
    },
  };
}
