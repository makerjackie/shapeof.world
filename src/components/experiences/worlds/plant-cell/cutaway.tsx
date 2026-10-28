import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { illustrateShader } from './illustration'

export interface CutState { plane: T.Plane; normal: T.Vector3; angle: number; offset: number; wedge: boolean; planes: T.Plane[]; facePlanes: T.Plane[][]; fromWorld: T.Matrix4 }
const CutContext = createContext<CutState | null>(null)
export const useCutaway = () => useContext(CutContext)

/** Keep the cut oblique to the view: a 35° reveal preserves the slice's depth. */
export function Cutaway({ children, offset = -1.2, reveal = 35, wedge = false }: { children: ReactNode; offset?: number; reveal?: number; wedge?: boolean }) {
  const group = useRef<T.Group>(null)
  const cut = useMemo<CutState>(() => ({ plane: new T.Plane(), normal: new T.Vector3(0, 0, 1), angle: 0, offset: wedge ? 0 : offset, wedge, planes: Array.from({length:wedge?2:1},()=>new T.Plane()), facePlanes: [[new T.Plane()], [new T.Plane()]], fromWorld: new T.Matrix4() }), [offset, wedge])
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
    if (wedge) {
      // Remove the intersection of two half-spaces: a 120° longitudinal wedge.
      // The two faces meet at the cell axis, so the remaining shell stays 3D.
      for (let i=0;i<2;i++) {
        const a=cut.angle+(i===0?1:-1)*Math.PI/6
        scratch.normal.set(Math.sin(a),0,Math.cos(a)).negate().transformDirection(group.current.matrixWorld)
        scratch.point.set(0,0,0); group.current.localToWorld(scratch.point)
        cut.planes[i].setFromNormalAndCoplanarPoint(scratch.normal,scratch.point)
      }
      cut.facePlanes[0][0].copy(cut.planes[1]).negate()
      cut.facePlanes[1][0].copy(cut.planes[0]).negate()
    } else cut.planes[0].copy(cut.plane)
  }, -0.5)
  return <CutContext.Provider value={cut}><group ref={group}>{children}</group></CutContext.Provider>
}

/** Lit surfaces share real clipping/shadows; only membranes use Fresnel alpha. */
export function TissueMaterial({ color = '#2f5a24', opacity = 1, kind = 'solid', roughness = 0.72, clipped = true, attenuation = true, depthWrite = true, starch = 0, glow = 0, face, selectiveCut = false, ...props }: {
  color?: string; opacity?: number; kind?: 'solid' | 'chloroplast' | 'chloroplast-cut' | 'nucleus' | 'wall' | 'vacuole'; roughness?: number; clipped?: boolean; attenuation?: boolean; depthWrite?: boolean; starch?: number; glow?: number; face?: number; selectiveCut?: boolean
}) {
  const cut = useCutaway()
  // ScaleLayer stores the unfaded alpha here. Preserve it across React renders,
  // including entry while this layer is hidden and the later pause action.
  const paintData=useMemo(()=>({plantSelectiveCut:selectiveCut,plantBaseOpacity:opacity,plantDepthWrite:depthWrite}),[selectiveCut,opacity,depthWrite])
  const selectivePlanes=useMemo(()=>({a:{value:new T.Vector4()},b:{value:new T.Vector4()}}),[])
  useFrame(()=>{if(cut&&selectiveCut)for(const [i,key]of(['a','b']as const).entries()){const p=cut.planes[i]??cut.plane;selectivePlanes[key].value.set(p.normal.x,p.normal.y,p.normal.z,p.constant)}})
  const starchUniform = useRef({ value: starch }); starchUniform.current.value = starch
  const glowUniform = useRef({ value: glow }); glowUniform.current.value = glow
  const planes = useMemo(() => cut && face !== undefined && cut.wedge ? cut.facePlanes[face] : cut && clipped ? cut.planes : [], [cut, clipped, face])
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
  return <meshPhysicalMaterial {...props} color={color} roughness={roughness} metalness={0} clearcoat={0} clearcoatRoughness={0.55}
    forceSinglePass userData={paintData} transparent opacity={opacity} side={T.DoubleSide} clippingPlanes={planes} clipIntersection={!!cut?.wedge && face === undefined} clipShadows depthWrite={depthWrite}
    customProgramCacheKey={() => `plant-${kind}-${attenuation}-${selectiveCut}`}
    onBeforeCompile={(shader) => {
      shader.uniforms.cutFaceA=selectivePlanes.a;shader.uniforms.cutFaceB=selectivePlanes.b
      shader.uniforms.cellFromWorld = { value: cut?.fromWorld ?? new T.Matrix4() }
      shader.uniforms.granaMap = { value: grana }
      shader.uniforms.starchAmount = starchUniform.current
      shader.uniforms.glowAmount = glowUniform.current
      shader.vertexShader = 'varying float cutOrdinal; varying float tissueUnit; varying vec3 tissueCenter; varying vec3 tissueWorld; uniform mat4 cellFromWorld; varying vec3 vTissue; varying vec3 vShape;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        cutOrdinal=0.;
        #ifdef USE_INSTANCING
        cutOrdinal=mod(float(gl_InstanceID),4.);
        #endif
        vShape=position; vec4 tissueP=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
        tissueP=instanceMatrix*tissueP;
        #endif
        tissueUnit=length(modelMatrix[0].xyz);tissueCenter=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
        #ifdef USE_INSTANCING
        tissueCenter=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
        #endif
        tissueWorld=(modelMatrix*tissueP).xyz;vTissue=(cellFromWorld*modelMatrix*tissueP).xyz;`)
      shader.fragmentShader = 'uniform vec4 cutFaceA;uniform vec4 cutFaceB; varying float cutOrdinal; varying float tissueUnit; varying vec3 tissueCenter; varying vec3 tissueWorld; uniform sampler2D granaMap; uniform float starchAmount; uniform float glowAmount; varying vec3 vTissue; varying vec3 vShape;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${selectiveCut ? 'float edgeDistance=min(abs(dot(cutFaceA,vec4(tissueCenter,1.))),abs(dot(cutFaceB,vec4(tissueCenter,1.))))/max(tissueUnit,.00001);if((cutOrdinal<.5 || edgeDistance>3.1) && dot(cutFaceA,vec4(tissueWorld,1.))<0. && dot(cutFaceB,vec4(tissueWorld,1.))<0.)discard;' : ''}
        ${attenuation ? 'float received=.92+.08*exp(-max(0.0,35.0-vTissue.y)*0.026); diffuseColor.rgb*=received;' : ''}
        ${kind === 'chloroplast' ? `
        float chloroplastLight=dot(normalize(vShape/vec3(3.,1.9,1.15)),normalize(vec3(-.5,.4,1.)));
        diffuseColor.rgb*=mix(.48,1.,smoothstep(-.3,.6,chloroplastLight));
        float thickness=sqrt(max(0.0,1.0-dot(vShape.xy/vec2(3.0,1.9),vShape.xy/vec2(3.0,1.9))));
        diffuseColor.rgb*=mix(vec3(1.08,1.08,1.02),vec3(.90,.98,.89),thickness);
        float stipple=texture2D(granaMap,vShape.xy/vec2(6.0,3.8)+0.5).r;
        diffuseColor.rgb*=1.0-0.42*min(1.0,stipple);
        float sr=max(0.001,0.7*pow(starchAmount,0.333333));
        vec2 sp=(vShape.xy-vec2(-0.6,0.35))/vec2(sr,sr*0.43);
        float starchSpot=exp(-dot(sp,sp)*2.0)*smoothstep(0.0,0.05,starchAmount);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.42,0.45,0.32),starchSpot*0.38);
        if(!gl_FrontFacing) diffuseColor.rgb*=.83;
        ` : ''}
        ${kind === 'chloroplast-cut' ? 'float stacks=step(.36,fract(vShape.x*3.+sin(vShape.y*4.)*.16)); float lines=smoothstep(.16,.38,abs(sin(vShape.y*38.))); diffuseColor.rgb=mix(vec3(.12,.34,.15),vec3(.40,.69,.26),1.-stacks*(1.-lines));' : ''}
        ${kind === 'vacuole' ? 'if(distance(vTissue,vec3(-8.3,-10.,7.7))<4.2)discard;float sap=sin(vTissue.x*1.7+sin(vTissue.y*.9))*sin(vTissue.z*1.3+vTissue.y*.4);diffuseColor.rgb*=.82+.3*(.5+.5*sap);' : ''}
        ${kind === 'wall' ? 'float fiberA=pow(.5+.5*sin(vTissue.y*17.+vTissue.x*4.),12.);float fiberB=pow(.5+.5*sin(vTissue.y*13.-vTissue.z*8.),14.);diffuseColor.rgb*=.68+.30*min(1.,fiberA+fiberB);' : ''}
        ${kind === 'nucleus' ? `
          vec3 unit=normalize(vShape);float baseIndex=floor((1.-unit.y)*63.-.5);
          for(int k=-3;k<=3;k++){
            float fi=clamp(baseIndex+float(k),0.,125.),yy=1.-(fi+.5)/63.,rr=sqrt(max(0.,1.-yy*yy));
            vec3 pore=vec3(rr*cos(fi*2.399963),yy,rr*sin(fi*2.399963));
            if(dot(unit,pore)>.9993)discard;
          }
          if(!gl_FrontFacing)diffuseColor.rgb*=.68;
        ` : ''}
      `)
      // Thin lens rims transmit sunlight: a soft chlorophyll glow, darker where grana sit.
      if (kind === 'chloroplast') shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if(gl_FrontFacing) totalEmissiveRadiance+=glowAmount*${attenuation ? 'received' : '1.0'}*vec3(0.07,0.13,0.03)*(0.35+0.65*(1.0-thickness))*(1.0-0.55*min(1.0,stipple));
      `)
      illustrateShader(shader)
    }} />
}
