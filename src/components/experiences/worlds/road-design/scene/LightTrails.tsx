import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { WorkerTrafficRuntime as TrafficRuntime } from './worker-runtime'
import { TRAIL_WIDTHS } from './frame-packet'

// Each history segment is uploaded once; the GPU expands its four lamp ribbons.
// 256 samples per car are retained by the distance/curvature adaptive recorder.
const MAX_SEGMENTS = 256_000
export function LightTrails({ runtime, shutter, blueprint = false, highlightLeft = false }: { runtime: TrafficRuntime; shutter: number; blueprint?: boolean; highlightLeft?: boolean }) {
  const assets = useMemo(() => {
    const geometry = new T.InstancedBufferGeometry()
    const corners: number[] = [], indices: number[] = []
    for (const head of [-1, 1]) for (const lamp of [-1, 1]) {
      const base = corners.length / 4
      for (const [end, side] of [[0, -1], [1, -1], [0, 1], [1, 1]]) corners.push(end, side, head, lamp)
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
    }
    geometry.setIndex(indices)
    geometry.setAttribute('corner', new T.Float32BufferAttribute(corners, 4))
    geometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(16 * 3), 3))
    const arrays = { start: new Float32Array(MAX_SEGMENTS * 3), end: new Float32Array(MAX_SEGMENTS * 3), directionA: new Float32Array(MAX_SEGMENTS * 3), directionB: new Float32Array(MAX_SEGMENTS * 3), times: new Float32Array(MAX_SEGMENTS * 2), properties: new Float32Array(MAX_SEGMENTS * 4) }
    for (const [name, array] of Object.entries(arrays)) geometry.setAttribute(name, new T.InstancedBufferAttribute(array, name === 'times' ? 2 : name === 'properties' ? 4 : 3).setUsage(T.DynamicDrawUsage))
    const material = new T.ShaderMaterial({
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false,
      uniforms: { resolution: { value: new T.Vector2(1600, 1000) }, minimumWidth: { value: 3.2 }, shutter: { value: 6 }, simTime: { value: 0 }, blueprint: { value: 0 }, highlightLeft: { value: 0 } },
      vertexShader: `
        attribute vec4 corner; attribute vec3 start; attribute vec3 end;
        attribute vec3 directionA; attribute vec3 directionB; attribute vec2 times; attribute vec4 properties;
        uniform vec2 resolution; uniform float minimumWidth; uniform float shutter; uniform float simTime; uniform float blueprint; uniform float highlightLeft;
        varying vec3 vLight; varying float vSide; varying float vFade;
        void main(){
          vec3 direction=normalize(mix(directionA,directionB,corner.x));
          vec3 p=mix(start,end,corner.x)+direction*corner.z*properties.z*0.5;
          p+=vec3(-direction.z*corner.w*0.72,0.68,direction.x*corner.w*0.72);
          vec4 view=modelViewMatrix*vec4(p,1.0), clip=projectionMatrix*view;
          vec4 ahead=projectionMatrix*modelViewMatrix*vec4(p+direction,1.0);
          vec2 screenDir=(ahead.xy/ahead.w-clip.xy/clip.w)*resolution;
          vec2 perpendicular=normalize(vec2(-screenDir.y,screenDir.x)+vec2(0.000001));
          float pixelWidth=max(minimumWidth,0.23*projectionMatrix[1][1]*resolution.y/max(1.0,-view.z));
          pixelWidth*=mix(1.0,properties.w< -0.5 ? 1.3 : 1.0,highlightLeft);
          clip.xy+=perpendicular*corner.y*pixelWidth/resolution*clip.w;
          gl_Position=clip;
          float facing=dot(direction*corner.z,normalize(cameraPosition-p));
          float visibility=pow(max(0.0,facing),1.35)+0.075*smoothstep(-0.15,0.12,facing);
          float braking=mix(properties.x,properties.y,corner.x);
          vLight=(corner.z>0.0 ? vec3(10.0,8.8,7.0) : vec3(9.0,0.07,0.025)*(1.0+braking*0.8))*visibility;
          vLight=mix(vLight,properties.w< -0.5 ? vec3(10.0,4.5,0.63)*max(visibility,0.18) : vLight*0.4,highlightLeft);
          vec3 flowColor=properties.w< -0.5 ? vec3(1.0,0.19,0.058) : properties.w>0.5 ? vec3(0.114,0.65,0.323) : vec3(0.254,0.456,1.0);
          vLight=mix(vLight,flowColor*1.4*max(0.0,corner.z),blueprint);
          vFade=pow(clamp(1.0-(simTime-mix(times.x,times.y,corner.x))/max(0.001,shutter),0.0,1.0),0.55);
          vSide=corner.y;
        }`,
      fragmentShader: `varying vec3 vLight; varying float vSide; varying float vFade;
        void main(){ float core=exp(-vSide*vSide*10.0); float halo=exp(-vSide*vSide*2.4)*0.14;
          gl_FragColor=vec4(vLight,(core+halo)*vFade*0.92); }`,
    })
    return { geometry, material, arrays, lastTime: -1, lastRevision: -1, lastShutter: -1, simulation: runtime.simulation }
  }, [])
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose() }, [assets])
  useFrame(({ size, gl }) => {
    if (assets.simulation !== runtime.simulation) { assets.simulation = runtime.simulation; assets.lastTime = -1; assets.lastRevision = -1 }
    const time = runtime.simulation.time
    assets.material.uniforms.resolution.value.set(size.width, size.height); assets.material.uniforms.minimumWidth.value = size.width < 720 ? 1.5 / Math.max(1, gl.getPixelRatio()) : 3.2
    assets.material.uniforms.blueprint.value = blueprint ? 1 : 0; assets.material.uniforms.highlightLeft.value = highlightLeft && !blueprint ? 1 : 0;
    assets.material.uniforms.shutter.value = shutter; assets.material.uniforms.simTime.value = time
    if (shutter <= 0.01) { assets.geometry.instanceCount = 0; assets.lastShutter = shutter; return }
    if (runtime.revision === assets.lastRevision && shutter === assets.lastShutter) return
    assets.lastTime = time; assets.lastShutter = shutter; assets.lastRevision = runtime.revision
    const cursor = Math.min(runtime.frame.exposureCounts[Math.min(450,Math.ceil(shutter*30))], MAX_SEGMENTS)
    for (const name of Object.keys(TRAIL_WIDTHS) as (keyof typeof TRAIL_WIDTHS)[]) {
      assets.arrays[name].set(runtime.frame.trails[name].subarray(0,cursor*TRAIL_WIDTHS[name]))
    }
    for (const name of Object.keys(assets.arrays)) {
      const attr = assets.geometry.getAttribute(name) as T.BufferAttribute
      attr.clearUpdateRanges(); attr.addUpdateRange(0, cursor * attr.itemSize); attr.needsUpdate = true
    }
    assets.geometry.instanceCount = cursor
  })
  return <mesh geometry={assets.geometry} material={assets.material} frustumCulled={false} renderOrder={2} />
}
