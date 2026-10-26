import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { Carriageway, Network } from '../sim/types'
import {cityLayout} from './city-layout'
import { fillInstances } from './mesh-kit'

/** Façades are metre-scaled procedural windows, not thousands of window meshes. */
export function CityBuildings({ urban, service = false, roads, network, visible = true }: { visible?: boolean; urban: boolean; service?: boolean; roads?: readonly Carriageway[]; network?: Network }) {
  const meshRef = useRef<T.InstancedMesh>(null)
  const assets = useMemo(() => {
    const {blocks,beacons}=cityLayout(urban,service,roads,network)
    const geometry = new T.BoxGeometry()
    geometry.setAttribute('citySize', new T.InstancedBufferAttribute(new Float32Array(blocks.flatMap(b => b.size)), 3))
    geometry.setAttribute('citySeed', new T.InstancedBufferAttribute(new Float32Array(blocks.map(b => b.seed)), 1))
    geometry.setAttribute('cityKind', new T.InstancedBufferAttribute(new Float32Array(blocks.map(b => b.kind)), 1))
    const material = new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0.08, depthWrite: true, fog: false })
    material.onBeforeCompile = shader => {
      shader.vertexShader = `attribute vec3 citySize; attribute float citySeed; attribute float cityKind;
        varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityWorld;
        varying float cityRandom; varying float cityType;\n` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        cityLocal = position * citySize; cityLocal.y += citySize.y * 0.5;
        cityNormal = normal; cityRandom = citySeed; cityType = cityKind;
        cityWorld = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
      `)
      shader.fragmentShader = `varying vec3 cityLocal; varying vec3 cityNormal; varying vec3 cityWorld;
        varying float cityRandom; varying float cityType;
        float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n` + shader.fragmentShader
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
      `)
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float cityDistance = distance(cameraPosition,cityWorld);
        float lowHaze = 1.0-exp(-max(0.0,cityDistance-280.0) * 0.00077 * exp(-max(0.0,cityWorld.y)*0.0035));
        outgoingLight = mix(outgoingLight, vec3(0.0025,0.0035,0.0055), lowHaze);
        #include <opaque_fragment>`)
    }
    material.customProgramCacheKey = () => 'road-city-facades-v7'
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
  useLayoutEffect(() => {
    if (!meshRef.current) return
    fillInstances(meshRef.current, assets.blocks)
  }, [assets])
  useFrame(({ clock, gl }) => {
    assets.beaconMaterial.uniforms.time.value = clock.elapsedTime
    assets.beaconMaterial.uniforms.pixelRatio.value = gl.getPixelRatio()
  })
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose(); assets.beaconGeometry.dispose(); assets.beaconMaterial.dispose() }, [assets])
  return <group visible={visible}>
    <instancedMesh args={[assets.geometry, assets.material, assets.blocks.length]} ref={meshRef} />
    <points geometry={assets.beaconGeometry} material={assets.beaconMaterial} frustumCulled={false} />
  </group>
}
