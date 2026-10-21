import * as THREE from 'three'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

/** Artistic thin-lens remapping, in units of viewport height. Also used by hit testing. */
export function lensSource(x: number, y: number, radius: number, inclination: number, aspect = 1): [number, number] {
  const r = Math.hypot(x, y)
  if (r < radius || radius <= 0) return [x, y]
  const q = r / radius
  const k = Math.min(1, Math.max(0, (q - 1) / 0.22))
  const edge = Math.max(0, Math.min(aspect / 2 - Math.abs(x), 0.5 - Math.abs(y)))
  const edgeK = Math.min(1, edge / (radius * 1.2))
  const edgeFade = edgeK * edgeK * (3 - 2 * edgeK)
  const envelope = edgeFade * k * k * (3 - 2 * k) * Math.exp(-(q - 1) * 1.15)
  const sourceR = r + radius * 0.65 * envelope
  const angle = Math.atan2(y, x) + 0.13 * envelope * (1 - inclination)
  return [Math.cos(angle) * sourceR, Math.sin(angle) * sourceR]
}

export function createLensingPass(): ShaderPass {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRadius: { value: 0.16 }, uAspect: { value: 1 }, uInclination: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uRadius,uAspect,uInclination; varying vec2 vUv;
      void main(){
        vec2 p=(vUv-.5)*vec2(uAspect,1.);
        float r=length(p),q=r/uRadius;
        if(q<1.){gl_FragColor=texture2D(tDiffuse,vUv);return;}
        float edge=max(0.,min(uAspect*.5-abs(p.x),.5-abs(p.y)));
        float envelope=smoothstep(0.,uRadius*1.2,edge)*smoothstep(1.,1.22,q)*exp(-(q-1.)*1.15);
        float sourceR=r+uRadius*.65*envelope;
        float a=atan(p.y,p.x)+.13*envelope*(1.-uInclination);
        vec2 uv=.5+vec2(cos(a),sin(a))*sourceR/vec2(uAspect,1.);
        gl_FragColor=texture2D(tDiffuse,clamp(uv,vec2(.001),vec2(.999)));
      }`,
  })
}

export function lensRadius(camera: THREE.PerspectiveCamera): number {
  const distance = camera.position.length()
  return 5.8 / Math.sqrt(Math.max(1, distance * distance - 5.8 * 5.8)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.5
}
