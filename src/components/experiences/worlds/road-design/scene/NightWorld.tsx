import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network, Vec3 } from '../sim/types'
import { fillInstances, samplePath, type Instance } from './mesh-kit'
import { CityBuildings } from './CityBuildings'
import { ContextLand, contextLayout } from './ContextLand'
import { Terrain } from './Terrain'
import { ChongqingRiver } from './ChongqingRiver'
import { terrainHeight } from '../sim/terrain'

export interface Lamp { position: Vec3; height: number; urban: boolean; rotation: number; radius?: number }

export function buildLamps(network: Network): Lamp[] {
  const urban = network.carriageways.every(road => road.kind === 'urban')
  const lamps: Lamp[] = []
  if (!urban) for (const x of [-98, 98]) for (const z of [-98, 98]) lamps.push({ position: { x, y: terrainHeight(network,x,z), z }, height: 30, urban: false, rotation: 0 })
  for (const road of network.carriageways) {
    if (road.kind !== 'ramp' && road.oneWay && Math.hypot(road.points.at(-1)!.x-road.points[0].x,road.points.at(-1)!.z-road.points[0].z)<200) continue
    const cityRoad=road.kind==='urban'
    const offset = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2 + (road.shoulder ?? 0) + 1.4
    for (const { position: p, tangent: t } of samplePath(road.points, cityRoad ? 36 : road.kind === 'ramp' && network.id !== 'huangjuewan' ? 95 : 110)) {
      if (cityRoad && urban && Math.hypot(p.x, p.z) < 28) continue
      for (const side of cityRoad && !road.oneWay ? [-1, 1] : [1]) {
        lamps.push({ position: { x: p.x - t.z * offset * side, y: p.y, z: p.z + t.x * offset * side }, height: cityRoad ? 9 : 28, urban:cityRoad, rotation: Math.atan2(t.x, t.z) + (side < 0 ? Math.PI : 0) })
      }
    }
  }
  if(network.urbanJunctions?.length) {
    for(const node of network.urbanJunctions) {
      const x=(node.arms.find(arm=>arm.direction==='north'||arm.direction==='south')?.halfWidth??3.5)+3.35
      const z=(node.arms.find(arm=>arm.direction==='east'||arm.direction==='west')?.halfWidth??3.5)+3.35
      for(const sx of[-1,1])for(const sz of[-1,1]) lamps.push({position:{x:node.position.x+sx*(x+12),y:node.position.y,z:node.position.z+sz*z},height:Math.max(x,z)>13?12:9,urban:true,rotation:sz<0?-Math.PI/2:Math.PI/2,radius:Math.max(28,Math.hypot(x+12,z)*1.55)})
    }
  } else if(urban) {
    const horizontal=network.carriageways.find(road=>Math.abs(road.points[0].x)>Math.abs(road.points[0].z))
    const vertical=network.carriageways.find(road=>Math.abs(road.points[0].z)>Math.abs(road.points[0].x))
    const x=(vertical?vertical.laneCount*vertical.laneWidth/2:3.5)+3.8
    const z=(horizontal?horizontal.laneCount*horizontal.laneWidth/2:3.5)+3.8
    for(const sx of[-1,1])for(const sz of[-1,1]) lamps.push({position:{x:sx*(x+12),y:0.1,z:sz*z},height:9,urban:true,rotation:sz<0?-Math.PI/2:Math.PI/2,radius:28})
  }
  lamps.push(...contextLayout(network).lamps)
  return lamps
}

/** A single top-down irradiance atlas replaces hundreds of shadowed point lights. */
export function makeLightingAtlas(lamps: Lamp[]) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048
  const context = canvas.getContext('2d')!
  context.fillStyle = '#000'; context.fillRect(0, 0, 2048, 2048)
  context.globalCompositeOperation = 'lighter'
  const extent = 1800, scale = canvas.width / (extent * 2)
  for (const { position: p, urban, rotation, radius } of lamps) {
    // Urban luminaires project into the road, while mast lights cover a 52 m radius.
    const cx = p.x + (urban ? Math.cos(rotation) * 4.5 : 0), cz = p.z - (urban ? Math.sin(rotation) * 4.5 : 0)
    const x = (cx + extent) * scale, z = (cz + extent) * scale, r = (radius ?? (urban ? 26 : 52)) * scale
    const gradient = context.createRadialGradient(x, z, 0, x, z, r)
    gradient.addColorStop(0, urban ? 'rgba(255,206,144,1)' : 'rgba(255,237,201,1)')
    gradient.addColorStop(0.21, urban ? 'rgba(255,198,130,0.85)' : 'rgba(255,228,182,0.85)')
    gradient.addColorStop(0.48, 'rgba(255,218,166,0.46)')
    gradient.addColorStop(0.76, 'rgba(245,208,163,0.10)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient; context.fillRect(x - r, z - r, r * 2, r * 2)
  }
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping
  return texture
}

/** Light transfer respects world normals, including instanced piers and tree crowns. */
export function litMaterial(atlas: T.Texture, color: string, gain = 0.5, roughness = 0.9, roof?: T.Texture) {
  const material = new T.MeshStandardMaterial({ color, roughness, metalness: 0.035, side: T.DoubleSide })
  material.onBeforeCompile = shader => {
    shader.uniforms.roadLighting = { value: atlas }
    if (roof) shader.uniforms.highestDeck = { value: roof }
    shader.vertexShader = 'varying vec3 roadWorld; varying vec3 roadNormal;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 lightPosition = vec4(transformed, 1.0);
      vec3 lightNormal = objectNormal;
      #ifdef USE_INSTANCING
        lightPosition = instanceMatrix * lightPosition;
        lightNormal = mat3(instanceMatrix) * lightNormal;
      #endif
      roadWorld = (modelMatrix * lightPosition).xyz;
      roadNormal = normalize(mat3(modelMatrix) * lightNormal);
    `)
    shader.fragmentShader = (roof ? 'uniform sampler2D highestDeck;\n' : '') + 'uniform sampler2D roadLighting; varying vec3 roadWorld; varying vec3 roadNormal;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 lightUV = (roadWorld.xz + 1800.0) / 3600.0;
      vec3 illumination = texture2D(roadLighting, vec2(lightUV.x, 1.0-lightUV.y)).rgb;
      // The irradiance gradient gives walls a brighter lamp-facing side. Soffits
      // remain dark; a small upward fill prevents pure-black bridge structure.
      float leftLight = dot(texture2D(roadLighting,vec2(lightUV.x-0.002,1.0-lightUV.y)).rgb,vec3(0.333));
      float rightLight = dot(texture2D(roadLighting,vec2(lightUV.x+0.002,1.0-lightUV.y)).rgb,vec3(0.333));
      float nearLight = dot(texture2D(roadLighting,vec2(lightUV.x,1.0-lightUV.y+0.002)).rgb,vec3(0.333));
      float farLight = dot(texture2D(roadLighting,vec2(lightUV.x,1.0-lightUV.y-0.002)).rgb,vec3(0.333));
      vec3 lightDirection = normalize(vec3(rightLight-leftLight,0.16,farLight-nearLight));
      vec3 surfaceNormal=normalize(roadNormal)*(gl_FrontFacing?1.0:-1.0);
      float facing = max(0.0,dot(surfaceNormal,lightDirection));
      float transfer = surfaceNormal.y < -0.3 ? 0.04 : (surfaceNormal.y > 0.5 ? 1.0 : 0.04+facing*0.85);
      ${roof ? `float roofHeight=texture2D(highestDeck,lightUV).r;
      float overhead=1.0-smoothstep(2.8,5.5,roofHeight-roadWorld.y);
      illumination*=mix(surfaceNormal.y>0.5?0.18:0.65,1.0,overhead);
      outgoingLight*=mix(surfaceNormal.y>0.5?0.38:0.72,1.0,overhead);` : ''}
      float grain = fract(sin(dot(floor(roadWorld.xz * 7.0),vec2(127.1,311.7)))*43758.5453);
      outgoingLight += diffuseColor.rgb * illumination * ${gain.toFixed(3)} * 2.5 * (0.94+grain*0.12) * transfer;
      #include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => `road-light-v4-${gain}-${!!roof}`
  return material
}

function groundMaterial(atlas: T.Texture, urban: boolean, cloverleaf: boolean) {
  const material = litMaterial(atlas, urban ? '#15181b' : '#0c1013', 0.65)
  const illumination = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    illumination(shader, renderer)
    shader.fragmentShader = `float terrainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float terrainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(terrainHash(i),terrainHash(i+vec2(1,0)),f.x),mix(terrainHash(i+vec2(0,1)),terrainHash(i+vec2(1,1)),f.x),f.y);}\n` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float terrain = terrainNoise(roadWorld.xz*0.004)+0.3*terrainNoise(roadWorld.xz*0.017);
      vec3 grass=vec3(0.0034,0.0044,0.0051), earth=vec3(0.0048,0.0065,0.0052);
      vec2 loopCenter=sign(roadWorld.xz)*77.625;
      float loopGrass=${cloverleaf ? '1.0-smoothstep(48.0,57.0,length(roadWorld.xz-loopCenter))' : '0.0'};
      vec3 groundColor=mix(grass,earth,smoothstep(0.3,1.0,terrain));
      groundColor=mix(groundColor,vec3(0.0036,0.0065,0.0048),loopGrass*0.55);
      diffuseColor.rgb=${urban ? 'diffuseColor.rgb' : 'groundColor'};
    `)
  }
    const groundLighting = material.onBeforeCompile
    material.onBeforeCompile = (shader, renderer) => {
      groundLighting(shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float groundDistance=distance(cameraPosition,roadWorld);
        float horizonHaze=1.0-exp(-max(0.0,groundDistance-650.0)*0.00045);
        outgoingLight=max(outgoingLight,vec3(0.0075,0.0100,0.0120)*(0.85+0.3*terrainNoise(roadWorld.xz*0.009)));
        outgoingLight=mix(outgoingLight,vec3(0.006,0.008,0.011),horizonHaze);
        #include <opaque_fragment>`)
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#include <fog_fragment>
        float horizonBlend=smoothstep(900.0,8500.0,distance(cameraPosition,roadWorld));
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.030,0.045,0.076),horizonBlend);
      `)
    }
  material.customProgramCacheKey = () => `road-terrain-v7-${urban}-${cloverleaf}`
  return material
}

function treeInstances(network: Network) {
  const crowns: Instance[] = [], trunks: Instance[] = []
  let seed = 498
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
  const plant = (x: number, z: number, height: number) => {
    const ground = terrainHeight(network,x,z)
    trunks.push({ position: [x, ground + height * 0.3, z], scale: [0.25, height * 0.6, 0.25] })
    for (let lobe = 0; lobe < 3; lobe++) {
      const angle = lobe * 2.094 + random() * 0.4, spread = height * (0.44 + random() * 0.14)
      crowns.push({ position: [x + Math.cos(angle) * height * 0.15, ground + height * (0.62 + random() * 0.13), z + Math.sin(angle) * height * 0.15], scale: [spread, height * (0.48 + random() * 0.12), spread], color: '#0f1a12' })
    }
  }
  // Small copses occupy the inside of each loop, away from ramp sight lines.
  if(network.id==='cloverleaf') for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let group = 0; group < 4; group++) {
      const angle = group * Math.PI / 2 + 0.35, cx = sx * 77.625 + Math.cos(angle) * 32, cz = sz * 77.625 + Math.sin(angle) * 32
      for (let i = 0; i < 5; i++) plant(cx + (random() - 0.5) * 13, cz + (random() - 0.5) * 13, 4 + random() * 3.3)
    }
  }
  // The planting follows the motorway reservation instead of filling the ground
  // with unrelated random dots. Alternate sections leave open meadow between.
  for (const road of network.carriageways.filter(road => road.kind === 'main')) {
    const offset = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2 + (road.shoulder ?? 0) + 22
    let index = 0
    for (const { position: p, tangent: t } of samplePath(road.points, 13)) {
      if (Math.hypot(p.x, p.z) < 390 || index++ % 11 > 5) continue
      plant(p.x - t.z * offset + (random() - 0.5) * 4, p.z + t.x * offset + (random() - 0.5) * 4, 5 + random() * 3)
    }
  }
  return { crowns, trunks }
}

export function NightWorld({ network, atlas }: { network: Network; atlas: T.Texture }) {
  const urban = network.carriageways.every(road => road.kind === 'urban')
  const assets = useMemo(() => {
    const trees = urban ? { crowns: [], trunks: [] } : treeInstances(network)
    const skyColor = (hex: string) => new T.Color(hex).toArray()
    return { ...trees, ground: groundMaterial(atlas, urban,network.id==='cloverleaf'), foliage: litMaterial(atlas, '#ffffff', 1.65), sky: new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, toneMapped: false,
      uniforms: { zenith: { value: skyColor('#050a18') }, middle: { value: skyColor('#142446') }, horizon: { value: skyColor('#2c3b5e') }, pollution: { value: skyColor('#6a4a3c') } },
      vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec3 vDirection; uniform vec3 zenith; uniform vec3 middle; uniform vec3 horizon; uniform vec3 pollution;
        void main(){float h=normalize(vDirection).y;
          vec3 sky=mix(horizon,middle,smoothstep(0.0,0.20,max(h,0.0)));
          sky=mix(sky,zenith,smoothstep(0.16,0.85,max(h,0.0)));
          sky=mix(sky,pollution,exp(-abs(h)*150.0)*0.45);
          gl_FragColor=vec4(sky,1.0);
          #include <colorspace_fragment>
        }`,
    }) }
  }, [network, urban, atlas])
  useEffect(() => () => { assets.ground.dispose(); assets.foliage.dispose(); assets.sky.dispose() }, [assets])
  return <>
    <fogExp2 attach="fog" args={['#18243a', 0.00019]} />
    <hemisphereLight args={['#91a4cd', '#161e2a', 0.26]} />
    <directionalLight position={[-450, 750, -200]} color="#b9c9e2" intensity={0.52} />
    <mesh material={assets.sky}><sphereGeometry args={[7000, 32, 20]} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, network.terrain ? Math.min(...network.terrain.values) - .5 : -.15, 0]} material={assets.ground}><planeGeometry args={[30000, 30000]} /></mesh>
    <Terrain network={network} material={assets.ground} />
    <ContextLand network={network} atlas={atlas} />
    <CityBuildings urban={urban} service={network.id === 'diamond' || network.id === 'ddi' || network.id === 'parclo'} roads={network.carriageways} network={network} />
    {network.id === 'huangjuewan' && <ChongqingRiver />}
    {!!assets.crowns.length && <instancedMesh args={[undefined, assets.foliage, assets.crowns.length]} ref={m => { if (m) fillInstances(m, assets.crowns) }}><icosahedronGeometry args={[0.65, 1]} /></instancedMesh>}
    {!!assets.trunks.length && <instancedMesh args={[undefined, undefined, assets.trunks.length]} ref={m => { if (m) fillInstances(m, assets.trunks) }}><cylinderGeometry args={[0.5, 0.7, 1, 6]} /><meshStandardMaterial color="#2d2921" /></instancedMesh>}
  </>
}
