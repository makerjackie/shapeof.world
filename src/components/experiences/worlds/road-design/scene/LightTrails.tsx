import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { TrafficRuntime, TrailSample } from './runtime'

// 1000 vehicles × 48 segments × four lamp ribbons × six vertices, with headroom.
const MAX_VERTICES = 1_500_000

export function LightTrails({ runtime, shutter }: { runtime: TrafficRuntime; shutter: number }) {
  const assets = useMemo(() => {
    const geometry = new T.BufferGeometry()
    const position = new Float32Array(MAX_VERTICES * 3), tangent = new Float32Array(MAX_VERTICES * 3)
    const data = new Float32Array(MAX_VERTICES * 4)
    geometry.setAttribute('position', new T.BufferAttribute(position, 3).setUsage(T.DynamicDrawUsage))
    geometry.setAttribute('direction', new T.BufferAttribute(tangent, 3).setUsage(T.DynamicDrawUsage))
    geometry.setAttribute('trailData', new T.BufferAttribute(data, 4).setUsage(T.DynamicDrawUsage))
    const material = new T.ShaderMaterial({
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false,
      uniforms: { resolution: { value: new T.Vector2(1600, 1000) }, shutter: { value: 3 }, simTime: { value: 0 } },
      vertexShader: `
        attribute vec3 direction; attribute vec4 trailData;
        uniform vec2 resolution; uniform float shutter; uniform float simTime;
        varying vec3 vLight; varying float vSide; varying float vFade;
        void main(){
          vec4 view=modelViewMatrix*vec4(position,1.0);
          vec4 clip=projectionMatrix*view;
          vec4 ahead=projectionMatrix*modelViewMatrix*vec4(position+direction,1.0);
          vec2 screenDir=(ahead.xy/ahead.w-clip.xy/clip.w)*resolution;
          vec2 perpendicular=normalize(vec2(-screenDir.y,screenDir.x)+vec2(0.000001));
          float pixelWidth=max(1.5,0.14*projectionMatrix[1][1]*resolution.y/max(1.0,-view.z));
          clip.xy+=perpendicular*trailData.x*pixelWidth/resolution*clip.w;
          gl_Position=clip;
          float facing=dot(normalize(direction)*trailData.z,normalize(cameraPosition-position));
          float visibility=pow(max(0.0,facing),1.6);
          vLight=(trailData.z>0.0 ? vec3(7.0,6.2,4.8) : vec3(5.0,0.23,0.10)*(1.0+trailData.w*0.8))*visibility;
          vFade=pow(clamp(1.0-(simTime-trailData.y)/max(0.001,shutter),0.0,1.0),0.7);
          vSide=trailData.x;
        }`,
      fragmentShader: `varying vec3 vLight; varying float vSide; varying float vFade;
        void main(){ float edge=pow(max(0.0,1.0-abs(vSide)),0.55); gl_FragColor=vec4(vLight,edge*vFade*0.72); }`,
    })
    return { geometry, material, position, tangent, data }
  }, [])
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose() }, [assets])
  useFrame(({ size }) => {
    const time = runtime.simulation.time
    assets.material.uniforms.resolution.value.set(size.width, size.height)
    assets.material.uniforms.shutter.value = shutter; assets.material.uniforms.simTime.value = time
    if (shutter <= 0.01) { assets.geometry.setDrawRange(0, 0); return }
    let cursor = 0
    const vertex = (sample: TrailSample, side: number, head: number, lamp: number) => {
      const { position: p, tangent: t } = sample
      const longitudinal = head * sample.length / 2
      assets.position[cursor * 3] = p.x + t.x * longitudinal - t.z * lamp * 0.72
      assets.position[cursor * 3 + 1] = p.y + 0.68 + t.y * longitudinal
      assets.position[cursor * 3 + 2] = p.z + t.z * longitudinal + t.x * lamp * 0.72
      assets.tangent[cursor * 3] = t.x; assets.tangent[cursor * 3 + 1] = t.y; assets.tangent[cursor * 3 + 2] = t.z
      assets.data[cursor * 4] = side; assets.data[cursor * 4 + 1] = sample.time; assets.data[cursor * 4 + 2] = head; assets.data[cursor * 4 + 3] = Number(sample.braking)
      cursor++
    }
    for (const history of runtime.trails.values()) {
      const samples = history.samples
      let start = 0
      while (start < samples.length - 1 && samples[start].time < time - shutter) start++
      const stride = Math.max(1, Math.ceil((samples.length - start) / 48))
      for (let i = start; i < samples.length - 1; i += stride) {
        if (cursor + 24 > MAX_VERTICES) break
        const a = samples[i], b = samples[Math.min(samples.length - 1, i + stride)]
        // A defensive continuity check prevents a missed exit ever drawing a beam across the map.
        if (Math.hypot(b.position.x - a.position.x, b.position.z - a.position.z) > 35) continue
        for (const head of [-1, 1]) for (const lamp of [-1, 1]) {
          vertex(a, -1, head, lamp); vertex(b, -1, head, lamp); vertex(a, 1, head, lamp)
          vertex(a, 1, head, lamp); vertex(b, -1, head, lamp); vertex(b, 1, head, lamp)
        }
      }
    }
    for (const name of ['position', 'direction', 'trailData']) {
      const attr = assets.geometry.getAttribute(name) as T.BufferAttribute
      attr.clearUpdateRanges(); attr.addUpdateRange(0, cursor * attr.itemSize); attr.needsUpdate = true
    }
    assets.geometry.setDrawRange(0, cursor)
  })
  return <mesh geometry={assets.geometry} material={assets.material} frustumCulled={false} renderOrder={2} />
}
