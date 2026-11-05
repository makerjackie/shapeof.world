import * as THREE from 'three';
import { CU } from './city-glsl.js';

// Pillars of amber light that shoot up from each screen as its ring leaves it (overlay pass, additive, soft against
// the scene's depth). They mark where 安 speaks from, and give the wide data shot its vertical rhythm.
export function buildBeams(screens) {
  const n = screens.length;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const base = new Float32Array(n * 4), info = new Float32Array(n * 4);
  screens.forEach((s, i) => { base.set([s.p.x, s.p.y, s.p.z, s.w], i * 4); });
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 4));
  const aInfo = new THREE.InstancedBufferAttribute(info, 4);
  g.setAttribute('aInfo', aInfo);      // x intensity, y age
  g.instanceCount = n;
  const u = {
    uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uNight: CU.uNight,
  };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aBase; attribute vec4 aInfo;
      varying vec2 vQ; varying float vDepth; varying vec4 vInfo;
      void main(){
        vec3 c = aBase.xyz;
        vec3 toCam = cameraPosition - c; toCam.y = 0.0;
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam + vec3(1e-4, 0.0, 0.0)));
        float w = aBase.w * 0.09 + 2.0;
        float H = 1600.0;
        vec3 p = c + right * position.x * w + vec3(0.0, position.y * H - aBase.w * 0.25, 0.0);
        vQ = vec2(position.x, position.y);
        vInfo = aInfo;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uNight;
      varying vec2 vQ; varying float vDepth; varying vec4 vInfo;
      out vec4 oColor;
      float fogDepth(float d){ float k = mix(0.62, 0.4, uNight); float d0 = mix(500.0, 150.0, uNight); return d < d0 ? d : d0 + (d - d0) * k; }
      void main(){
        float I = vInfo.x;
        if(I < 0.002) discard;
        float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
        float soft = clamp((sceneD - fogDepth(vDepth)) / 6.0, 0.0, 1.0);
        float core = exp(-vQ.x * vQ.x * 40.0), halo = exp(-vQ.x * vQ.x * 4.0);
        // the pulse climbs: brightest just above the screen early, a travelling knot of light rising
        float y = vQ.y;
        float knot = exp(-pow((y - vInfo.y * 0.55) / 0.05, 2.0)) * smoothstep(0.0, 0.3, vInfo.y) * exp(-vInfo.y * 0.6);
        float fade = smoothstep(0.0, 0.01, y) * (1.0 - smoothstep(0.15, 1.0, y));
        float a = (core * 0.9 + halo * 0.25) * fade * I + core * knot * 2.0;
        vec3 col = mix(vec3(1.0, 0.62, 0.2), vec3(1.0, 0.85, 0.6), core * 0.35) * a * soft;
        oColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return {
    mesh,
    set(i, intensity, age) { info[i * 4] = intensity; info[i * 4 + 1] = age; aInfo.needsUpdate = true; },
  };
}

// Night details for the window views: red aviation lights blinking on the tall roofs, and fine rain falling through
// the street light between 林工's window and the towers (overlay, additive, soft against the scene's depth).
export function buildNightFx(vols, room) {
  const grp = new THREE.Group();
  // ---- aviation lights
  const pts = [];
  for (const V of vols) {
    if (V.y1 < 90 || V.part === 2 || V.y1 < V.top - 0.5) continue;
    const r = V.ring;
    const k = Math.floor(((V.seed * 7.3) % 1) * r.length);
    pts.push(r[k][0], V.y1 + 1.5, r[k][1], V.seed);
    if (V.y1 > 180) { const k2 = (k + Math.floor(r.length / 2)) % r.length; pts.push(r[k2][0], V.y1 + 1.5, r[k2][1], V.seed + 0.5); }
  }
  pts.push(0, 662, 23.1, 0.25);   // the HQ mast
  const ga = new THREE.BufferGeometry();
  ga.setAttribute('position', new THREE.Float32BufferAttribute(pts.filter((_, i) => i % 4 !== 3), 3));
  ga.setAttribute('aSeed', new THREE.Float32BufferAttribute(pts.filter((_, i) => i % 4 === 3), 1));
  const ua = { uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uOn: { value: 1 } };
  const ma = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: ua, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; varying float vA; varying float vDepth;
      uniform float uTime;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        float ph = fract(uTime / 1.6 + aSeed * 3.7);
        vA = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.25, 0.45, ph));
        gl_PointSize = clamp(2400.0 / vDepth, 2.0, 10.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uOn;
      varying float vA; varying float vDepth;
      out vec4 oColor;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float a = exp(-dot(q, q) * 18.0) * vA * uOn;
        float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
        float fd = vDepth < 150.0 ? vDepth : 150.0 + (vDepth - 150.0) * 0.4;
        a *= clamp((sceneD - fd + 4.0) / 4.0, 0.0, 1.0);
        if(a < 0.003) discard;
        oColor = vec4(vec3(1.0, 0.16, 0.12) * a * 2.2, 1.0);
      }
    `,
  });
  const avi = new THREE.Points(ga, ma);
  avi.frustumCulled = false;
  grp.add(avi);

  // ---- rain: streaks in a slab of air in front of the window, falling (pure function of time)
  const N = 2600;
  const rg = new THREE.InstancedBufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  rg.setIndex([0, 1, 2, 0, 2, 3]);
  const seeds = new Float32Array(N * 4);
  let s = 12345;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < N; i++) seeds.set([rnd(), rnd(), rnd(), rnd()], i * 4);
  rg.setAttribute('aR', new THREE.InstancedBufferAttribute(seeds, 4));
  rg.instanceCount = N;
  const ur = { uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uRoom: { value: room.clone() }, uAmt: { value: 1 } };
  const mr = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: ur, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aR; uniform float uTime; uniform vec3 uRoom;
      varying vec2 vQ; varying float vDepth; varying float vI;
      void main(){
        // a wedge of air from 12 m to 260 m out of the window, toward the HQ (−X, −Z)
        vec3 dir = normalize(vec3(-1400.0, 0.0, -1800.0));
        vec3 side = vec3(-dir.z, 0.0, dir.x);
        float dist = mix(12.0, 260.0, aR.x * aR.x);
        float across = (aR.y - 0.5) * dist * 1.3;
        float H = 160.0;
        float speed = 9.0 + 3.0 * aR.w;
        float y = uRoom.y - 60.0 + mod(aR.z * H - uTime * speed, H);
        vec3 c = uRoom + dir * dist + side * across;
        c.y = y;
        vec3 toCam = normalize(cameraPosition - c);
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
        float len = 1.2 + 0.03 * dist;
        float wid = 0.012 + dist * 0.0009;
        vec3 p = c + right * position.x * wid + vec3(0.0, position.y * len, 0.0);
        vQ = position.xy;
        vI = 0.55 - 0.35 * aR.x;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uAmt;
      varying vec2 vQ; varying float vDepth; varying float vI;
      out vec4 oColor;
      void main(){
        float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
        float fd = vDepth < 150.0 ? vDepth : 150.0 + (vDepth - 150.0) * 0.4;
        float soft = clamp((sceneD - fd) / 3.0, 0.0, 1.0);
        float a = (1.0 - abs(vQ.x) * 2.0) * smoothstep(0.0, 0.3, vQ.y) * (1.0 - smoothstep(0.7, 1.0, vQ.y));
        a *= vI * soft * uAmt;
        if(a < 0.003) discard;
        oColor = vec4(vec3(0.62, 0.66, 0.9) * a * 0.32, 1.0);
      }
    `,
  });
  const rain = new THREE.Mesh(rg, mr);
  rain.frustumCulled = false;
  grp.add(rain);
  return { grp, avi, rain, ua, ur };
}

// 安's links: an amber arc from the HQ's crown to every screen, drawn out like a signal just before that screen's ring
// leaves it, then glowing faintly with packets of light running along it. Screen-space ribbons (constant pixel
// width) in the overlay pass, soft against the scene's depth.
export function buildLinks(from, screens) {
  const SEG = 64;
  const n = screens.length;
  const pos = [], aA = [], aB = [], aT = [], aI = [], idx = [];
  screens.forEach((s, i) => {
    const B = [s.p.x, s.p.y + s.w * 0.28, s.p.z];
    const A = [from.x, from.y, from.z];
    const d = Math.hypot(B[0] - A[0], B[2] - A[2]);
    const lift = 0.22 * d + 60;
    const P = (u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + lift * 4 * u * (1 - u), A[2] + (B[2] - A[2]) * u];
    for (let k = 0; k < SEG; k++) {
      const u0 = k / SEG, u1 = (k + 1) / SEG;
      const p0 = P(u0), p1 = P(u1);
      const base = pos.length / 3;
      for (const [side, end] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
        pos.push(side, end, 0);
        aA.push(...p0); aB.push(...p1);
        aT.push(end ? u1 : u0, i);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 3));
  g.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 2));
  g.setIndex(idx);
  const prog = new Float32Array(32 * 4);
  const u = {
    uSceneData: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNight: CU.uNight,
    uProg: { value: Array.from({ length: 32 }, () => new THREE.Vector4(0, 0, 0, 0)) },   // x drawn 0..1, y glow, z packet phase
    uView: { value: new THREE.Vector2(1080, 1920) }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: u, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aA, aB; attribute vec2 aT;
      uniform vec2 uView;
      uniform vec4 uProg[32];
      varying float vU, vSide, vDepth; varying vec4 vP;
      void main(){
        vec4 ca = projectionMatrix * viewMatrix * vec4(aA, 1.0);
        vec4 cb = projectionMatrix * viewMatrix * vec4(aB, 1.0);
        vec4 c = position.y > 0.5 ? cb : ca;
        vec2 sa = ca.xy / max(ca.w, 1e-3) * uView, sb = cb.xy / max(cb.w, 1e-3) * uView;
        vec2 dir = normalize(sb - sa + 1e-5);
        vec2 nrm = vec2(-dir.y, dir.x);
        float wpx = 2.2;
        c.xy += nrm * position.x * wpx / uView * c.w;
        vU = aT.x; vSide = position.x;
        vP = uProg[int(aT.y + 0.5)];
        vDepth = c.w;
        gl_Position = c;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSceneData; uniform vec2 uRes; uniform float uNight, uTime;
      varying float vU, vSide, vDepth; varying vec4 vP;
      out vec4 oColor;
      float fogDepth(float d){ float k = mix(0.62, 0.4, uNight); float d0 = mix(500.0, 150.0, uNight); return d < d0 ? d : d0 + (d - d0) * k; }
      void main(){
        float drawn = vP.x;
        if(vU > drawn || drawn <= 0.0) discard;
        float sceneD = texture(uSceneData, gl_FragCoord.xy / uRes).b;
        float soft = clamp((sceneD - fogDepth(vDepth)) / 8.0, 0.0, 1.0);
        float prof = exp(-vSide * vSide * 3.0);
        // the bright head while it is being drawn, then a steady glow with packets running down to the screen
        float head = exp(-pow((drawn - vU) / 0.025, 2.0)) * step(drawn, 0.999);
        float pk = smoothstep(0.92, 1.0, fract(vU * 5.0 - vP.z));
        float a = prof * (vP.y * (0.35 + 0.9 * pk) + head * 2.2) * soft;
        vec3 col = mix(vec3(1.0, 0.66, 0.24), vec3(1.0, 0.92, 0.75), head);
        oColor = vec4(col * a, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return {
    mesh, u,
    set(i, drawn, glow, phase) { if (i < 32) u.uProg.value[i].set(drawn, glow, phase, 0); },
  };
}
