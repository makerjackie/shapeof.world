import * as THREE from 'three';
import { airMaterial, dustMaterial, skyMaterial } from './meet-mat.js';
import { buildRoom } from './meet-room.js';
import { buildProps } from './meet-props.js';
import { buildCast } from './people-cast.js';
import { armIK, headLook, bodyPose, peopleMats } from './people.js';
import { FLOOR, ROOM, TABLE, TOP, SCREEN, SEATS, PHONE_LIN, seatFrame } from './meet-layout.js';
import { onTwos, smooth, invLerp, clamp, lerp, Rng, noise1 } from './util.js';

// 安's HQ meeting room, 08:57–09:05. The film's main stage (dept meet).
// Exposes: { update, seat (林工's seat, world), phone (林工's phone position), table (edge z), screen }

const V = THREE.Vector3;
// v12 vote: five members light green one by one from CUES.votes (the chair presides and does not vote);
// 林工's light is the sixth and stays empty until CUES.pass
export const VOTE_ORDER = ['young', 'zhang', 'heavy', 'bob', 'bun'];
const VOTE_STEP = 0.5;
const voteTime = (id, C) => (id === 'lin' ? C.pass : id === 'chair' ? Infinity : C.votes + VOTE_ORDER.indexOf(id) * VOTE_STEP);

export function createMeet(ctx) {
  const { scene, overlay, CUES } = ctx;
  const R = buildRoom(ctx);
  R.room.position.y = FLOOR;
  scene.add(R.room);

  const P = buildProps(ctx);
  scene.add(P.group);

  // ---- people
  const cast = buildCast();
  const people = new THREE.Group();
  scene.add(people);
  for (const [id, p] of Object.entries(cast)) {
    const s = SEATS[id];
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
    const sit = id === 'lin' ? 0.02 : 0.07;   // sit forward on the chair, close to the table
    p.root.position.set(s.x + fx * sit, FLOOR, s.z + fz * sit);
    p.root.rotation.y = s.yaw;
    people.add(p.root);
  }
  ctx.shadowRoots.push(R.casters, P.group, people);

  // ---- light in the air: volumetric shafts + dust motes (overlay pass)
  const airBox = new THREE.Mesh(new THREE.BoxGeometry(ROOM.x1 - ROOM.x0 - 0.02, ROOM.h - 0.02, ROOM.z1 - ROOM.z0 - 0.02).translate(0, FLOOR + ROOM.h / 2, 0),
    airMaterial({ min: [ROOM.x0 + 0.01, FLOOR + 0.01, ROOM.z0 + 0.01], max: [ROOM.x1 - 0.01, FLOOR + ROOM.h - 0.01, ROOM.z1 - 0.01], density: 0.8, dust: 0.75 }));
  airBox.frustumCulled = false;
  overlay.add(airBox);
  const NDUST = 5200;
  const dustGeo = new THREE.InstancedBufferGeometry();
  dustGeo.index = new THREE.PlaneGeometry(1, 1).index;
  dustGeo.setAttribute('position', new THREE.PlaneGeometry(1, 1).attributes.position);
  dustGeo.setAttribute('uv', new THREE.PlaneGeometry(1, 1).attributes.uv);
  {
    const rng = new Rng(909), a = new Float32Array(NDUST * 4);
    for (let i = 0; i < NDUST; i++) {
      // concentrate dust around the table and in front of the windows
      a[i * 4] = rng.range(-5, 8); a[i * 4 + 1] = FLOOR + rng.range(0.3, 3.8); a[i * 4 + 2] = rng.range(-6.4, 4); a[i * 4 + 3] = rng.next();
    }
    dustGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(a, 4));
    dustGeo.instanceCount = NDUST;
  }
  const dust = new THREE.Mesh(dustGeo, dustMaterial({ min: [-5, FLOOR + 0.3, -6.8], max: [8, FLOOR + 3.8, 4], size: 0.014, gain: 2.4 }));
  dust.frustumCulled = false;
  overlay.add(dust);

  // ---- fallback sky + distant towers, only when the City department is absent
  let sky = null;
  if (typeof ctx.city?.anchor !== 'function') {
    sky = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8400, 32, 16).translate(0, FLOOR, 0), skyMaterial());
    dome.renderOrder = -10; dome.frustumCulled = false;
    sky.add(dome);
    scene.add(sky);
  }

  // ---- screens
  const screenTex = R.screen.tex;
  const setScreen = (st) => {
    const c = ctx.ui?.screen?.('bigscreen', st);
    if (c) { screenTex.image = c; screenTex.needsUpdate = true; R.screen.mat.uniforms.uUseEmisMap.value = 1; }
    else R.screen.mat.uniforms.uUseEmisMap.value = 0;
  };

  // ---- posing helpers
  const scrT = new V(SCREEN.x, SCREEN.y - 0.25, SCREEN.z);
  const linHead = new V(SEATS.lin.x, FLOOR + 1.2, SEATS.lin.z - 0.1);
  const tmp = new V(), pole = new V();
  const handsOnTable = (id, p, o = {}) => {
    const F = seatFrame(id), rig = p.rig;
    // hands rest near the edge; elbows out and back
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;     // +1 = person's left
      const tgt = o.hand?.[k] ?? F.at(o.reach ?? 0.05, side * (o.spread ?? 0.15), TOP + 0.035);
      tmp.set(...tgt);
      pole.set(-F.fx * 0.6 + F.lx * side * 1.0, -0.7, -F.fz * 0.6 + F.lz * side * 1.0);
      armIK(rig, k, tmp, pole, side * (o.twist ?? 1.2));
      rig.wrist[k].rotation.set(o.wristBend ?? 0.25, 0, 0);
    }
  };

  const ROSTER = ['chair', 'bun', 'zhang', 'young', 'bob', 'heavy'];
  // per-person idle phase (tiny breathing / weight shifts, on twos)
  const idle = (id, t) => noise1(onTwos(t) * 0.35, id.length * 7.3 + id.charCodeAt(0));

  function poseAll(st) {
    const t = st.tr, tt = onTwos(st.t);
    for (const id of [...ROSTER, 'lin']) {
      const p = cast[id], rig = p.rig;
      const F = seatFrame(id);
      let clapSeat = 0, stand = 0, lean = 0.06, look = scrT.clone(), share = 0.35, extraPitch = 0, extraRoll = 0, handO = {};
      if (id === 'chair') { look.set(0, TOP + 0.05, -2.9); lean = 0.12; }       // reading his tablet
      if (id === 'lin') { look.set(PHONE_LIN.x, TOP, PHONE_LIN.z + 0.1); lean = 0.22; }
      const i = ROSTER.indexOf(id);
      // breathing
      lean += 0.012 * idle(id, tt);
      // ---- shot-specific acting
      if (st.sid === 's20' && id !== 'lin') {
        // at CUES.turn every head turns to 林工, almost together; the chair lifts his eyes from the tablet as he speaks
        const t0 = id === 'chair' ? CUES.ask - 0.35 : (CUES.turn ?? CUES.ask + 1) + [0, 0.12, 0.04, 0.2, 0.08, 0.16][i];
        const k = smooth(invLerp(t0, t0 + (id === 'chair' ? 0.5 : 0.6), onTwos(t)));
        look.lerp(linHead.clone(), k);
        if (id === 'chair') lean = lerp(0.12, 0.08, k);
        share = 0.45;
      }
      if (st.sid === 's23' && id !== 'lin') {
        const t0 = CUES.pass + 0.15 + [0.0, 0.3, 0.55, 0.15, 0.4, 0.7][i];
        stand = smooth(invLerp(t0, t0 + 0.9, onTwos(t)));
        look = scrT.clone();
        // the chair stays seated (he would stand right in front of 全票通过) and claps where he sits
        if (id === 'chair') { look.set(0, FLOOR + 1.3, 1.5); clapSeat = stand; stand = 0; }
      }
      if (st.sid === 's25' && id !== 'lin') {
        // looking down at their phones; the light catches them
        const ph = P.phones[SEATS[id].phone];
        if (ph) look.copy(ph.pos);
        else look.set(...F.at(0.22, 0.2, TOP));
        lean = 0.2;
        share = 0.5;
        extraPitch = 0.12 * smooth(invLerp(CUES.phonesLight, CUES.phonesLight + 0.5, onTwos(t)));
      }
      bodyPose(rig, stand, { lean, seatY: 0.47 });
      // hands
      if (stand > 0.05 || clapSeat > 0.05) {
        // clapping once up
        const up = Math.max(stand, clapSeat);
        const clap = up > 0.85 ? Math.abs(Math.sin((onTwos(t) - CUES.pass) * Math.PI * 2.6 + i)) : 1;
        const chest = new V(0, 0, 0);
        rig.torso.updateWorldMatrix(true, false);
        chest.set(0, 0.22 * rig.s, 0.28).applyMatrix4(rig.torso.matrixWorld);
        for (let k = 0; k < 2; k++) {
          const side = k === 0 ? 1 : -1;
          const off = new V(side * (0.012 + 0.06 * clap), -0.02, 0).applyMatrix4(new THREE.Matrix4().extractRotation(rig.torso.matrixWorld));
          const tgtStand = chest.clone().add(off);
          const tgtSeat = new V(...F.at(0.05, side * 0.15, TOP + 0.035));
          const tg = tgtSeat.lerp(tgtStand, smooth(invLerp(0.3, 0.9, up)));
          pole.set(-F.fx * 0.3 + F.lx * side, -1.0, -F.fz * 0.3 + F.lz * side);
          armIK(rig, k, tg, pole, side * lerp(1.2, 0.2, up));
          rig.wrist[k].rotation.set(0.1, 0, 0);
        }
      } else if (id === 'lin') {
        handsOnTable(id, p, { reach: 0.1, spread: 0.17 });
      } else {
        // s19: each member reaches for the vote key just before their light comes on
        let o = {};
        if (st.sid === 's19') {
          const tv = voteTime(id, CUES);
          const k = smooth(invLerp(tv - 0.45, tv - 0.05, onTwos(t))) * (1 - smooth(invLerp(tv + 0.25, tv + 0.7, onTwos(t))));
          if (k > 0) {
            const u = P.units.find((x) => x.id === id);
            const rest = new V(...F.at(0.05, -0.15, TOP + 0.035));
            const key = u.pos.clone(); key.y = TOP + 0.04;
            o.hand = [null, rest.lerp(key, k).toArray()];
          }
        }
        if (st.sid === 's25') o = { hand: id === 'zhang' ? [F.at(-0.1, 0.17, TOP - 0.15), F.at(0.04, -0.24, TOP + 0.035)] : [F.at(0.03, 0.26, TOP + 0.035), F.at(0.04, -0.2, TOP + 0.035)] };   // 张主任's left hand drops to his lap, clear of the phone close-up
        handsOnTable(id, p, o);
      }
      headLook(rig, look, share, { pitch: extraPitch, roll: extraRoll });
    }
  }

  // ---- glasses glint (anime: lenses go opaque white for a beat)
  function glints(st) {
    const set = (id, g) => {
      const m = cast[id].lensMat; if (!m) return;
      m.uniforms.uEmisGain.value = g;
      m.userData.mesh.visible = g > 0.02;
    };
    let gc = 0, gz = 0;
    const t = onTwos(st.tr);
    if (st.sid === 's20') {
      const tu = CUES.turn ?? CUES.ask + 1;
      gc = 0.5 * smooth(invLerp(CUES.ask - 0.1, CUES.ask + 0.1, t)) + 0.9 * smooth(invLerp(tu + 0.45, tu + 0.6, t));
      gz = smooth(invLerp(tu + 0.5, tu + 0.66, t));
    }
    if (st.sid === 's25') {
      gz = smooth(invLerp(CUES.phonesLight, CUES.phonesLight + 0.12, t)) * 1.15;
      gc = gz * 0.7;
    }
    set('chair', gc * 1.6); set('zhang', gz * 1.6);
  }

  // s26 starts inside this room and flies out through the window: keep the room for its first 3 s
  const s26 = (ctx.SHOTS || []).find((x) => x.id === 's26');
  const ROOM_UNTIL = s26 ? s26.start + 3 : 116;
  const seat = new V(SEATS.lin.x, FLOOR + 0.47, SEATS.lin.z);
  return {
    seat,
    phone: new V(PHONE_LIN.x, PHONE_LIN.y, PHONE_LIN.z),
    tableEdgeZ: TABLE.cz + TABLE.L / 2,
    screen: new V(SCREEN.x, SCREEN.y, SCREEN.z),
    cast, props: P, room: R,
    update(st) {
      const on = st.set === 'meet' || (st.sid === 's26' && st.tr < ROOM_UNTIL);
      R.room.visible = P.group.visible = people.visible = on;
      airBox.visible = dust.visible = st.set === 'meet';
      if (sky) sky.visible = on;
      if (!on) return;
      setScreen(st);
      // 林工's phone: the scheduled message, always live
      const pc = ctx.ui?.screen?.('phone-lin', st);
      P.linPhone.setScreen(pc ?? null, pc ? 1 : 0);
      // committee phones: dark until s25's cue, then all at once
      const lit = st.sid === 's25' && st.tr >= CUES.phonesLight;
      const g = lit ? smooth(invLerp(CUES.phonesLight, CUES.phonesLight + 0.07, st.tr)) : 0;
      for (let i = 0; i < 5; i++) {
        const ph = P.phones[i]; if (!ph) continue;
        const c = lit ? ctx.ui?.screen?.('phone-c' + i, st) : null;
        // overhead (until the descent at lt 3.0) the five screens glow as bright rectangles; the backlight eases off
        // as the camera comes down so the card stays crisp in the close-up
        const bl = lerp(4.2, 0.12, smooth(invLerp(2.9, 4.3, st.lt)));
        ph.setScreen(c ?? null, c ? g * 1.15 * (c.glow ?? 1) : 0, c ? g * (c.glow ?? 1) * bl : 0);
      }
      // vote lights
      for (const u of P.units) {
        const k = st.tr >= voteTime(u.id, CUES) && st.sid !== 's25' ? 1 : 0;   // s25: the vote is over, the lights are off
        const m = u.mat.uniforms;
        if (k) { m.uEmis.value.set('#46ff86'); m.uEmisGain.value = 2.4; }
        else { m.uEmis.value.set('#59606c'); m.uEmisGain.value = 0.6; }
      }
      // 林工 (from behind) and his chair: hidden where the camera sits at his eyeline or the Hands team shows him
      const linOn = ['s19', 's23', 's25'].includes(st.sid);
      cast.lin.root.visible = linOn;
      R.chairs.lin.visible = st.sid !== 's20';
      // the pendant bar would slice through the screen from the s19/s23 camera behind 林工
      for (const m of R.pendant) m.visible = !(st.sid === 's19' || st.sid === 's23' || st.sid === 's25');
      // s25: the room's light falls away from the faces; the phones light them from below
      const PM = peopleMats(), s25 = st.sid === 's25';
      for (const k of ['face', 'skin', 'hair', 'suit', 'shirt', 'tie', 'lapel']) { const sk = k === 'face' || k === 'skin'; PM[k].uniforms.uPLGain.value = s25 ? (sk ? 3.4 : 1.6) : 1; PM[k].uniforms.uSil.value = s25 ? (sk ? 1.5 : 1.15) : 0.25; PM[k].uniforms.uUnder.value = s25 ? 1 : 0; }
      poseAll(st);
      glints(st);
    },
  };
}
