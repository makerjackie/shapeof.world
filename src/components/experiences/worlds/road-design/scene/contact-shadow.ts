import * as T from 'three'

/** Soft rounded-rectangle falloff on a flat quad. `inner` is the car footprint
 * as a fraction of the quad; beyond it the shade fades to nothing. */
export const CONTACT_SHADE = `float contactShade(vec2 uv,vec2 inner){
  vec2 q=abs(uv-.5)*2.0;vec2 e=max(q-inner,0.0)/max(1.0-inner,vec2(1e-3));
  float d=clamp(length(e),0.0,1.0);float core=1.0-.18*smoothstep(0.0,1.0,length(q/inner));
  return pow(1.0-d,1.6)*core;
}`

/** A flat quad in the XZ plane, centred on the origin. */
export function contactShadowGeometry() {
  return new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
}

/** Contact shadow for a mesh or an InstancedMesh of flat quads. There is no
 * shadow-map pass in this world, so cars need their own dark footprint to sit
 * on the road in close and follow views. */
export function contactShadowMaterial(opacity: number, inner: [number, number]) {
  return new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6,
    uniforms: { opacity: { value: opacity }, inner: { value: new T.Vector2(...inner) } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;vec4 p=vec4(position,1.0);
      #ifdef USE_INSTANCING
      p=instanceMatrix*p;
      #endif
      gl_Position=projectionMatrix*modelViewMatrix*p;}`,
    fragmentShader: `uniform float opacity; uniform vec2 inner; varying vec2 vUv; ${CONTACT_SHADE}
      void main(){gl_FragColor=vec4(0.0,0.0,0.0,opacity*contactShade(vUv,inner));}`,
  })
}
