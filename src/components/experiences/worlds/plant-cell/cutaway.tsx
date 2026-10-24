import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'

export interface CutState { plane: T.Plane; normal: T.Vector3; angle: number; offset: number; fromWorld: T.Matrix4 }
const CutContext = createContext<CutState | null>(null)
export const useCutaway = () => useContext(CutContext)

/** Keep the cut oblique to the view: a 35° reveal preserves the slice's depth. */
export function Cutaway({ children, offset = -1.2, reveal = 35 }: { children: ReactNode; offset?: number; reveal?: number }) {
  const group = useRef<T.Group>(null)
  const cut = useMemo<CutState>(() => ({ plane: new T.Plane(), normal: new T.Vector3(0, 0, 1), angle: 0, offset, fromWorld: new T.Matrix4() }), [offset])
  const scratch = useMemo(() => ({ eye: new T.Vector3(), point: new T.Vector3(), normal: new T.Vector3() }), [])
  const initialized = useRef(false)
  useFrame(({ camera }, dt) => {
    if (!group.current) return
    group.current.updateWorldMatrix(true, false)
    cut.fromWorld.copy(group.current.matrixWorld).invert()
    scratch.eye.copy(camera.position); group.current.worldToLocal(scratch.eye)
    const desired = Math.atan2(scratch.eye.x, scratch.eye.z) - T.MathUtils.degToRad(reveal)
    const difference = Math.atan2(Math.sin(desired - cut.angle), Math.cos(desired - cut.angle))
    cut.angle += initialized.current ? difference * (1 - Math.exp(-dt * 7)) : difference
    initialized.current = true
    cut.normal.set(Math.sin(cut.angle), 0, Math.cos(cut.angle))
    scratch.normal.copy(cut.normal).negate().transformDirection(group.current.matrixWorld)
    scratch.point.copy(cut.normal).multiplyScalar(offset); group.current.localToWorld(scratch.point)
    cut.plane.setFromNormalAndCoplanarPoint(scratch.normal, scratch.point)
  }, -0.5)
  return <CutContext.Provider value={cut}><group ref={group}>{children}</group></CutContext.Provider>
}

/** Lit surfaces share real clipping/shadows; only membranes use Fresnel alpha. */
export function TissueMaterial({ color = '#2f5a24', opacity = 1, kind = 'solid', roughness = 0.72, clipped = true, attenuation = true, depthWrite = true, starch = 0, glow = 0, ...props }: {
  color?: string; opacity?: number; kind?: 'solid' | 'chloroplast' | 'chloroplast-cut' | 'nucleus' | 'wall'; roughness?: number; clipped?: boolean; attenuation?: boolean; depthWrite?: boolean; starch?: number; glow?: number
}) {
  const cut = useCutaway()
  const starchUniform = useRef({ value: starch }); starchUniform.current.value = starch
  const glowUniform = useRef({ value: glow }); glowUniform.current.value = glow
  const planes = useMemo(() => cut && clipped ? [cut.plane] : [], [cut, clipped])
  const grana = useMemo(() => {
    if (kind !== 'chloroplast') return null
    const size = 128, data = new Uint8Array(size * size)
    const centres = Array.from({ length: 50 }, (_, i) => {
      const angle = i * 2.399963, r = Math.sqrt((i + 0.5) / 50) * 0.86
      return [Math.cos(angle) * r * 2.65, Math.sin(angle) * r * 1.65]
    })
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = (x / (size - 1) - 0.5) * 6, py = (y / (size - 1) - 0.5) * 3.8
      const shade = centres.reduce((sum, [cx, cy]) => sum + Math.exp(-((px - cx) ** 2 + (py - cy) ** 2) * 38), 0)
      data[y * size + x] = Math.min(255, Math.round(shade * 255))
    }
    const texture = new T.DataTexture(data, size, size, T.RedFormat)
    texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearFilter; texture.needsUpdate = true
    return texture
  }, [kind])
  useEffect(() => () => grana?.dispose(), [grana])
  return <meshPhysicalMaterial {...props} color={color} roughness={roughness} metalness={0} clearcoat={kind === 'chloroplast' ? 0.15 : 0.04} clearcoatRoughness={0.55}
    transparent opacity={opacity} side={T.DoubleSide} clippingPlanes={planes} clipShadows depthWrite={depthWrite}
    customProgramCacheKey={() => `plant-${kind}-${attenuation}`}
    onBeforeCompile={(shader) => {
      shader.uniforms.cellFromWorld = { value: cut?.fromWorld ?? new T.Matrix4() }
      shader.uniforms.granaMap = { value: grana }
      shader.uniforms.starchAmount = starchUniform.current
      shader.uniforms.glowAmount = glowUniform.current
      shader.vertexShader = 'uniform mat4 cellFromWorld; varying vec3 vTissue; varying vec3 vShape;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vShape=position; vec4 tissueP=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
        tissueP=instanceMatrix*tissueP;
        #endif
        vTissue=(cellFromWorld*modelMatrix*tissueP).xyz;`)
      shader.fragmentShader = 'uniform sampler2D granaMap; uniform float starchAmount; uniform float glowAmount; varying vec3 vTissue; varying vec3 vShape;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${attenuation ? 'float received=0.4+0.8*exp(-max(0.0,35.0-vTissue.y)*0.026); diffuseColor.rgb*=received;' : ''}
        ${kind === 'chloroplast' ? `
        float thickness=sqrt(max(0.0,1.0-dot(vShape.xy/vec2(3.0,1.9),vShape.xy/vec2(3.0,1.9))));
        diffuseColor.rgb*=mix(vec3(1.75,1.48,1.15),vec3(0.48,0.61,0.46),thickness);
        float stipple=texture2D(granaMap,vShape.xy/vec2(6.0,3.8)+0.5).r;
        diffuseColor.rgb*=1.0-0.42*min(1.0,stipple);
        float sr=max(0.001,0.7*pow(starchAmount,0.333333));
        vec2 sp=(vShape.xy-vec2(-0.6,0.35))/vec2(sr,sr*0.43);
        float starchSpot=exp(-dot(sp,sp)*2.0)*smoothstep(0.0,0.05,starchAmount);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.42,0.45,0.32),starchSpot*0.38);
        if(!gl_FrontFacing) { float stripe=smoothstep(0.28,0.5,abs(sin(vShape.y*48.0))); diffuseColor.rgb=vec3(0.035,0.095,0.025)*mix(0.5,1.5,stripe); }
        ` : ''}
        ${kind === 'chloroplast-cut' ? 'float lines=smoothstep(0.1,0.7,abs(sin(vShape.y*100.0+sin(vShape.x*4.0)*0.3))); diffuseColor.rgb*=0.6+0.6*lines;' : ''}
        ${kind === 'nucleus' ? 'if(!gl_FrontFacing) diffuseColor.rgb*=0.52+0.18*sin(vShape.x*18.0)*sin(vShape.y*14.0);' : ''}
      `)
      // Thin lens rims transmit sunlight: a soft chlorophyll glow, darker where grana sit.
      if (kind === 'chloroplast') shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if(gl_FrontFacing) totalEmissiveRadiance+=glowAmount*${attenuation ? 'received' : '1.0'}*vec3(0.07,0.13,0.03)*(0.35+0.65*(1.0-thickness))*(1.0-0.55*min(1.0,stipple));
      `)
    }} />
}
