import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { WorkerTrafficRuntime } from './worker-runtime'
import { CAR_STRIDE } from './frame-packet'
import { mergeGeometry } from './mesh-kit'
import { CONTACT_SHADE, contactShadowGeometry } from './contact-shadow'

const CAPACITY=6000
const PAINT=['#a7aaa8','#252c32','#4e5960','#48555e','#5c3331','#c4bfb1','#1a242e'].map(hex=>new T.Color(hex))
/** Four instanced draws, as before, but the GPU expands each car's pose. Camera
 * dependent lamps no longer require thousands of JS matrices/color allocations. */
export function Vehicles({runtime,dim=false}:{runtime:WorkerTrafficRuntime;dim?:boolean}) {
  const assets=useMemo(()=>{
    const buffer=new T.InstancedInterleavedBuffer(new Float32Array(CAPACITY*CAR_STRIDE),CAR_STRIDE).setUsage(T.DynamicDrawUsage)
    const uniforms={brightness:{value:1},lampBrightness:{value:1},simTime:{value:0},paints:{value:PAINT}}
    const geometry=(base:T.BufferGeometry)=>{
      const g=new T.InstancedBufferGeometry();T.BufferGeometry.prototype.copy.call(g,base);base.dispose()
      g.setAttribute('carPosition',new T.InterleavedBufferAttribute(buffer,3,1))
      g.setAttribute('carTangent',new T.InterleavedBufferAttribute(buffer,3,4))
      g.setAttribute('carShape',new T.InterleavedBufferAttribute(buffer,4,7))
      g.setAttribute('carIdentity',new T.InterleavedBufferAttribute(buffer,1,0))
      g.setAttribute('carIndicator',new T.InterleavedBufferAttribute(buffer,1,11))
      g.instanceCount=0;return g
    }
    const lamps=(indicator:boolean)=>{
      const pieces:T.BufferGeometry[]=[],ends:number[]=[],sides:number[]=[]
      for(const end of[-1,1])for(const side of indicator?[0]:[-1,1]){
        const box=new T.BoxGeometry().toNonIndexed();pieces.push(box)
        for(let i=0;i<box.getAttribute('position').count;i++){ends.push(end);sides.push(side)}
      }
      const g=mergeGeometry(pieces)
      g.setAttribute('lampEnd',new T.Float32BufferAttribute(ends,1));g.setAttribute('lampSide',new T.Float32BufferAttribute(sides,1))
      return g
    }
    const rows=(['body','cabin','lights','indicators'] as const).map(kind=>{
      const shell=kind==='body'||kind==='cabin'
      const g=geometry(shell?new RoundedBoxGeometry(1,1,1,1,.08):lamps(kind==='indicators'))
      const material=shell?new T.MeshStandardMaterial({color:kind==='body'?'#ffffff':'#1c2b35',roughness:kind==='body'?.35:.18,metalness:kind==='body'?.35:.6}):new T.MeshBasicMaterial({toneMapped:false})
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms)
        shader.vertexShader=`attribute vec3 carPosition;attribute vec3 carTangent;attribute vec4 carShape;attribute float carIdentity;attribute float carIndicator;
          uniform float simTime;uniform vec3 paints[7];varying vec3 vehicleColor;
          ${shell?'':'attribute float lampEnd;attribute float lampSide;'}
          mat3 vehicleRotation(){
            float horizontal=max(0.00001,length(carTangent.xz));float sy=carTangent.x/horizontal,cy=carTangent.z/horizontal;
            float norm=max(0.00001,length(carTangent));float sp=-carTangent.y/norm,cp=horizontal/norm;
            return mat3(cy,sp*sy,-cp*sy,0.0,cp,sp,sy,-sp*cy,cp*cy);
          }
          vec3 vehicleScale(){return ${kind==='body'?'vec3(carShape.y,mix(0.65,1.7,carShape.z),carShape.x)':kind==='cabin'?'vec3(carShape.y*0.84,mix(0.6,0.75,carShape.z),carShape.x*mix(0.52,0.73,carShape.z))':kind==='lights'?'vec3(0.3,0.16,0.14)':'vec3(0.22,0.18,0.2)'};}
        `+shader.vertexShader
        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
          objectNormal=vehicleRotation()*(objectNormal/vehicleScale());`)
        let placement:string
        if(kind==='body')placement='transformed+=carPosition+vec3(0.0,mix(0.58,1.05,carShape.z),0.0);vehicleColor=paints[int(mod(carIdentity,7.0))];'
        else if(kind==='cabin')placement='transformed+=carPosition-vec3(carTangent.x,0.0,carTangent.z)*0.15+vec3(0.0,mix(1.14,2.1,carShape.z),0.0);vehicleColor=vec3(1.0);'
        else if(kind==='lights')placement=`transformed+=carPosition+vec3(carTangent.x,0.0,carTangent.z)*carShape.x*0.5*lampEnd+vec3(-carTangent.z*lampSide*carShape.y*0.36,0.70,carTangent.x*lampSide*carShape.y*0.36);
          float facing=dot(carTangent,normalize(cameraPosition-carPosition));float gain=0.10+pow(max(0.0,facing*lampEnd),1.6);
          vehicleColor=lampEnd>0.0?vec3(7.0,6.1,4.7)*gain:vec3(5.0*(carShape.w< -0.6?1.8:1.0),0.2,0.08)*gain;`
        else placement=`float lit=abs(carIndicator)*float(mod(floor(simTime*3.0),2.0)<0.5);transformed*=lit;
          transformed+=carPosition+vec3(carTangent.x,0.0,carTangent.z)*carShape.x*0.48*lampEnd+vec3(-carTangent.z*carIndicator*carShape.y*0.48,0.8,carTangent.x*carIndicator*carShape.y*0.48);vehicleColor=vec3(6.0,2.4,0.1);`
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=vehicleRotation()*(position*vehicleScale());${placement}`)
        shader.fragmentShader='uniform float brightness; uniform float lampBrightness; varying vec3 vehicleColor;\n'+shader.fragmentShader
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n diffuseColor.rgb*=vehicleColor*${shell?'brightness':'lampBrightness'};`)
      }
      material.customProgramCacheKey=()=>`road-vehicle-pose-${kind}-v2`
      return {kind,geometry:g,material}
    })
    // Contact shadow: a soft dark footprint a little wider and longer than
    // each car, posed like the body so it follows ramps and banking.
    const shadow={geometry:geometry(contactShadowGeometry()),material:new T.ShaderMaterial({
      transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-6,
      uniforms:{strength:{value:.8}},
      vertexShader:`attribute vec3 carPosition;attribute vec3 carTangent;attribute vec4 carShape;varying vec2 vUv;varying vec2 vInner;
        void main(){
          float horizontal=max(0.00001,length(carTangent.xz));float sy=carTangent.x/horizontal,cy=carTangent.z/horizontal;
          float norm=max(0.00001,length(carTangent));float sp=-carTangent.y/norm,cp=horizontal/norm;
          mat3 r=mat3(cy,sp*sy,-cp*sy,0.0,cp,sp,sy,-sp*cy,cp*cy);
          vec2 car=vec2(carShape.y,carShape.x),quad=car*vec2(1.7,1.3)+vec2(.6,.6);
          vUv=uv;vInner=car/quad;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(r*(position*vec3(quad.x,1.0,quad.y))+carPosition+vec3(0.0,.08,0.0),1.0);
        }`,
      fragmentShader:`uniform float strength;varying vec2 vUv;varying vec2 vInner;${CONTACT_SHADE}
        void main(){gl_FragColor=vec4(0.0,0.0,0.0,strength*contactShade(vUv,vInner));}`,
    })}
    return {buffer,uniforms,rows,shadow,revision:-1,runtime}
  },[])
  useFrame(()=>{
    // Beside a chosen route, other cars recede but keep their lamps.
    assets.uniforms.brightness.value=dim?.18:1;assets.shadow.material.uniforms.strength.value=dim?.3:.8;assets.uniforms.lampBrightness.value=dim?.6:1
    assets.uniforms.simTime.value=runtime.simulation.time
    if(assets.revision===runtime.revision&&assets.runtime===runtime)return
    assets.runtime=runtime;assets.revision=runtime.revision
    const count=Math.min(CAPACITY,runtime.frame.carCount)
    assets.buffer.array.set(runtime.frame.cars.subarray(0,count*CAR_STRIDE))
    assets.buffer.clearUpdateRanges();assets.buffer.addUpdateRange(0,count*CAR_STRIDE);assets.buffer.needsUpdate=true
    for(const row of assets.rows)row.geometry.instanceCount=count
    assets.shadow.geometry.instanceCount=count
  })
  useEffect(()=>()=>{for(const row of [...assets.rows,assets.shadow]){row.geometry.dispose();row.material.dispose()}},[assets])
  return <><mesh geometry={assets.shadow.geometry} material={assets.shadow.material} frustumCulled={false} renderOrder={1} />{assets.rows.map(row=><mesh key={row.kind} geometry={row.geometry} material={row.material} frustumCulled={false} />)}</>
}
