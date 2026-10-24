import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Carriageway, Network } from '../sim/types'
import { isRiver, scenicGround } from './chongqing-context'
import { fillInstances, type Instance } from './mesh-kit'

type Triple = [number,number,number]
interface OcclusionVolume { center: Triple; size: Triple }
interface Building extends Instance { size: Triple; seed: number; kind: number; occlusion: OcclusionVolume }

/** Façades are metre-scaled procedural windows, not thousands of window meshes. */
export function CityBuildings({ urban, service = false, roads, network }: { urban: boolean; service?: boolean; roads?: readonly Carriageway[]; network?: Network }) {
  const shaderRef = useRef<T.WebGLProgramParametersWithUniforms | null>(null)
  const assets = useMemo(() => {
    const blocks: Building[] = [], beacons: number[] = []
    let seed = 12963
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
    const box = (x: number, z: number, width: number, depth: number, height: number, base: number, kind: number, tint: string, occlusion?: OcclusionVolume) => {
      blocks.push({ position: [x, base + height / 2 + scenicGround(network, x, z), z], scale: [width, height, depth], color: tint, size: [width, height, depth], seed: random() * 1000, kind, occlusion: occlusion ?? { center:[x,base+height/2,z], size:[width,height,depth] } })
    }
    const building = (x: number, z: number, width: number, depth: number, height: number, near: boolean) => {
      const glass = random() < 0.26
      const occlusion: OcclusionVolume = { center:[x,height/2+scenicGround(network,x,z),z], size:[width+5,height,depth+5] }
      if (near) {
        const podiumHeight = 4.1 + Math.floor(random() * 2) * 3.3
        box(x, z, width + 5, depth + 5, podiumHeight, 0, 1, '#20211f', occlusion)
        box(x, z, width, depth, height - podiumHeight, podiumHeight, glass ? 2 : 0, glass ? '#11191c' : random() < 0.5 ? '#20211f' : '#24211d', occlusion)
        box(x-width*0.13,z+depth*0.12,width*0.24,depth*0.21,2,height,3,'#48505a',occlusion)
        if(width>20)box(x+width*0.25,z-depth*0.2,3.5,3.5,1.3,height,3,'#51545a',occlusion)
      } else {
        const crown = height > 65 ? height * (0.08 + random() * 0.12) : 0
        box(x, z, width, depth, height - crown, 0, glass ? 2 : 0, glass ? '#10141a' : '#141719')
        if (crown) box(x + width * 0.06, z, width * 0.65, depth * 0.75, crown, height - crown, 0, '#11151a')
      }
      if (height > 100) beacons.push(x, height + scenicGround(network,x,z) + 1.3, z, random() * 6)
    }
    if (urban) {
      // The nearest frontage is > 12 m behind a 7.5 m half-width road curb.
      // Blocks are irregular but street-aligned; podiums give the street a human scale.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) {
          const near = ix === 0 && iz === 0
          const width = 18 + random() * 10, depth = 18 + random() * 10
          const x = sx * (48 + ix * 48 + (random() - 0.5) * 5), z = sz * (48 + iz * 49 + (random() - 0.5) * 5)
          const floors = near ? 4 + Math.floor(random() * 8) : 7 + Math.floor(random() ** 1.8 * 24)
          building(x, z, width, depth, floors * 3.3, true)
        }
      }
    }
    if (service || !urban) {
      // Small suburban blocks give the two ramp terminals a city-edge setting.
      // Keep the entire podium footprint outside every carriageway reservation.
      const clearsRoads = (x: number, z: number, width: number, depth: number) => {
        const clearance = Math.hypot(width + 5, depth + 5) / 2 + 8
        return (roads ?? []).every(road => {
          const roadHalf = road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0)
          for (let i = 1; i < road.points.length; i++) {
            const a = road.points[i - 1], b = road.points[i]
            const dx = b.x - a.x, dz = b.z - a.z
            const t = Math.max(0, Math.min(1, ((x-a.x)*dx+(z-a.z)*dz) / Math.max(0.001,dx*dx+dz*dz)))
            if (Math.hypot(x-a.x-t*dx,z-a.z-t*dz) < clearance + roadHalf) return false
          }
          return true
        })
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (const blockX of [190, 290, 420, 570]) for (const blockZ of [110, 240, 390, 550]) {
          const width = 20 + random() * 10, depth = 18 + random() * 10
          const x = sx * (blockX + (random() - 0.5) * 8), z = sz * (blockZ + (random() - 0.5) * 8)
          if (!clearsRoads(x, z, width, depth)) continue
          building(x, z, width, depth, (network?.id === 'huangjuewan' ? 12 + Math.floor(random() * 18) : 2 + Math.floor(random() * 6)) * 3.3, true)
        }
      }
    }
    // Dense city blocks sit between 0.7 and 3 km, leaving long axial street corridors.
    for (let x = -2880; x <= 2880; x += 120) for (let z = -2880; z <= 2880; z += 120) {
      const radius = Math.hypot(x, z)
      const clusterDensity = 0.18 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(x * 0.004 + Math.cos(z * 0.004) * 2.0), 2)
      if (radius < 720 || radius > 3000 || Math.abs(x) < 100 || Math.abs(z) < 100 || random() > clusterDensity) continue
      const px = x + (random() - 0.5) * 38, pz = z + (random() - 0.5) * 38
      if (network?.id === 'huangjuewan' && isRiver(px,pz)) continue
      const cluster = 0.5 + 0.5 * Math.sin(x * 0.0014 + z * 0.0019)
      const height = 14 + random() ** 2.2 * (60 + cluster * 145)
      building(px, pz, 19 + random() * 35, 17 + random() * 31, height, false)
    }
    const geometry = new T.BoxGeometry()
    geometry.setAttribute('citySize', new T.InstancedBufferAttribute(new Float32Array(blocks.flatMap(b => b.size)), 3))
    geometry.setAttribute('citySeed', new T.InstancedBufferAttribute(new Float32Array(blocks.map(b => b.seed)), 1))
    geometry.setAttribute('cityKind', new T.InstancedBufferAttribute(new Float32Array(blocks.map(b => b.kind)), 1))
    geometry.setAttribute('cityOcclusionCenter',new T.InstancedBufferAttribute(new Float32Array(blocks.flatMap(b=>b.occlusion.center)),3))
    geometry.setAttribute('cityOcclusionSize',new T.InstancedBufferAttribute(new Float32Array(blocks.flatMap(b=>b.occlusion.size)),3))
    const material = new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0.08, depthWrite: true, fog: false })
    material.onBeforeCompile = shader => {
      shaderRef.current = shader
      shader.uniforms.cityCamera = { value: new T.Vector3() }
      shader.uniforms.cityFadeEnabled = { value: 1 }
      shader.vertexShader = `attribute vec3 citySize; attribute float citySeed; attribute float cityKind;
        attribute vec3 cityOcclusionCenter; attribute vec3 cityOcclusionSize;
        uniform vec3 cityCamera; uniform float cityFadeEnabled;
        varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityWorld;
        varying float cityRandom; varying float cityType; varying float cityFade;\n` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        cityLocal = position * citySize; cityLocal.y += citySize.y * 0.5;
        cityNormal = normal; cityRandom = citySeed; cityType = cityKind;
        vec3 center = (modelMatrix * vec4(cityOcclusionCenter, 1.0)).xyz;
        cityWorld = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        vec3 sight = vec3(0.0, 1.0, 0.0) - cityCamera;
        float t = clamp(dot(center.xz - cityCamera.xz, sight.xz) / max(1.0, dot(sight.xz, sight.xz)), 0.0, 1.0);
        vec3 ray = cityCamera + sight * t;
        float radius = length(cityOcclusionSize.xz) * 0.62 + 30.0;
        float overlap = (1.0-smoothstep(radius * 0.65, radius, distance(center.xz, ray.xz))) * step(0.02,t) * (1.0-step(0.93,t));
        overlap *= (1.0-smoothstep(center.y+cityOcclusionSize.y*0.5+25.0,center.y+cityOcclusionSize.y*0.5+33.0,ray.y));
        overlap *= 1.0-smoothstep(220.0, 320.0, length(center.xz));
        cityFade = mix(1.0, 0.0, overlap * cityFadeEnabled);
      `)
      shader.fragmentShader = `varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityWorld;
        varying float cityRandom; varying float cityType; varying float cityFade;
        float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n` + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphahash_fragment>', 'if (cityFade < 0.5) discard;\n#include <alphahash_fragment>')
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(cityNormal.y) < 0.5 && cityType < 2.5) {
          float horizontal = abs(cityNormal.z) > 0.5 ? cityLocal.x : cityLocal.z;
          vec2 meters = vec2(horizontal + cityRandom, cityLocal.y);
          vec2 cell = floor(meters / vec2(2.6, 3.3));
          vec2 within = mod(meters, vec2(2.6,3.3));
          vec2 footprint = fwidth(meters);
          vec2 aa = max(footprint * 0.5, vec2(0.012));
          float resolved = 1.0-smoothstep(0.6,2.8,max(footprint.x,footprint.y));
          float windowShape = smoothstep(0.8-aa.x,0.8+aa.x,within.x) * (1.0-smoothstep(1.8-aa.x,1.8+aa.x,within.x))
            * smoothstep(1.1-aa.y,1.1+aa.y,within.y) * (1.0-smoothstep(2.5-aa.y,2.5+aa.y,within.y));
          float hash = cityHash(cell + cityRandom);
          float officeFloor = step(0.955, cityHash(vec2(cell.y,cityRandom)));
          float occupancy=0.15+cityHash(vec2(cityRandom,42.0))*0.28;
          float darkFloor=step(0.13,cityHash(vec2(cell.y+71.0,cityRandom)));
          float occupied = max(step(1.0-occupancy,hash), officeFloor * step(0.12,hash))*darkFloor;
          vec3 windowLight = mix(vec3(1.5,1.75,2.05),vec3(2.0,1.37,0.77),step(0.3,cityHash(cell*1.31+cityRandom)));
          float variation = 0.22 + 0.78*cityHash(cell*2.7+cityRandom);
          // Once a window is subpixel, integrate its area and occupancy rather
          // than selecting a random on/off cell: stable lights, no sparkly facade.
          windowShape = mix(0.163,windowShape,resolved);
          occupied = mix(occupancy*0.9,occupied,resolved);
          windowLight = mix(vec3(1.83,1.49,1.13),windowLight,resolved);
          variation = mix(0.72,variation,resolved);
          float distanceDimming = mix(1.0,0.46,smoothstep(350.0,1500.0,distance(cameraPosition,cityWorld)));
          float farLightRecovery=mix(1.0,1.8,smoothstep(350.0,700.0,distance(cameraPosition,cityWorld)));
          totalEmissiveRadiance += windowLight * windowShape * occupied * variation * distanceDimming * 0.35 * farLightRecovery;
          diffuseColor.rgb *= mix(1.0,0.32,windowShape*(1.0-occupied));
          if (cityType > 1.5) {
            float mullion = max(1.0-smoothstep(0.025,0.06,min(within.x,2.6-within.x)),1.0-smoothstep(0.025,0.06,min(within.y,3.3-within.y)));
            diffuseColor.rgb *= mix(0.74,1.6,mullion);
            totalEmissiveRadiance += vec3(0.001,0.0016,0.0020)*(1.0-windowShape);
          }
          if (cityType > 0.5 && cityType < 1.5) {
            float storefront = smoothstep(0.45,0.55,cityLocal.y)*(1.0-smoothstep(3.1,3.2,cityLocal.y));
            float mullion = smoothstep(0.06,0.11,mod(horizontal+cityRandom,2.6));
            totalEmissiveRadiance += vec3(0.42,0.245,0.112)*storefront*mullion*(0.5+0.5*cityHash(vec2(floor(horizontal/5.2),cityRandom)));
          }
        }
        totalEmissiveRadiance += diffuseColor.rgb*(0.07+0.06*max(0.0,cityNormal.x*0.45+cityNormal.y*0.7+cityNormal.z*0.3));
        totalEmissiveRadiance *= cityFade*cityFade;
      `)
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float cityDistance = distance(cameraPosition,cityWorld);
        float lowHaze = 1.0-exp(-max(0.0,cityDistance-280.0) * 0.00077 * exp(-max(0.0,cityWorld.y)*0.0035));
        outgoingLight = mix(outgoingLight, vec3(0.0025,0.0035,0.0055), lowHaze);
        #include <opaque_fragment>`)
    }
    material.customProgramCacheKey = () => 'road-city-facades-v5'
    const beaconGeometry = new T.BufferGeometry()
    const beaconPosition: number[] = [], phase: number[] = []
    for (let i = 0; i < beacons.length; i += 4) { beaconPosition.push(...beacons.slice(i, i + 3)); phase.push(beacons[i + 3]) }
    beaconGeometry.setAttribute('position', new T.Float32BufferAttribute(beaconPosition, 3))
    beaconGeometry.setAttribute('phase', new T.Float32BufferAttribute(phase, 1))
    const beaconMaterial = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute float phase; uniform float time; uniform float pixelRatio; varying float brightness;
        void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p;
          gl_PointSize=clamp(1100.0/-p.z,2.5,7.0)*pixelRatio;
          brightness=0.18+0.82*pow(max(0.0,sin(time*2.0+phase)),12.0); }`,
      fragmentShader: `varying float brightness; void main(){float r=length(gl_PointCoord-0.5)*2.0; if(r>1.0)discard;gl_FragColor=vec4(vec3(2.8,0.04,0.018)*brightness, exp(-r*r*4.0));}`,
    })
    return { blocks, geometry, material, beaconGeometry, beaconMaterial }
  }, [urban, service, roads, network])
  useFrame(({ camera, clock, gl }) => {
    shaderRef.current?.uniforms.cityCamera.value.copy(camera.position)
    assets.beaconMaterial.uniforms.time.value = clock.elapsedTime
    assets.beaconMaterial.uniforms.pixelRatio.value = gl.getPixelRatio()
  })
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose(); assets.beaconGeometry.dispose(); assets.beaconMaterial.dispose() }, [assets])
  return <>
    <instancedMesh args={[assets.geometry, assets.material, assets.blocks.length]} ref={mesh => { if (mesh) fillInstances(mesh, assets.blocks) }} />
    <points geometry={assets.beaconGeometry} material={assets.beaconMaterial} frustumCulled={false} />
  </>
}
