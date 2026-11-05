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
