import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network, Vec3 } from '../sim/types'
import { fillInstances, samplePath, type Instance } from './mesh-kit'

export interface Lamp { position: Vec3; height: number; urban: boolean; rotation: number }

export function buildLamps(network: Network): Lamp[] {
  const urban = network.id !== 'cloverleaf'
  const lamps: Lamp[] = []
  if (!urban) {
    for (const x of [-172, 172]) for (const z of [-172, 172]) lamps.push({ position: { x, y: 0, z }, height: 30, urban: false, rotation: 0 })
  }
  for (const road of network.carriageways) {
    if (road.kind === 'ramp') continue
    const offset = road.laneCount * road.laneWidth / 2 + (road.shoulder ?? 0) + 1.4
    for (const { position: p, tangent: t } of samplePath(road.points, urban ? 36 : 120)) {
      if (urban && Math.hypot(p.x, p.z) < 35) continue
      lamps.push({ position: { x: p.x - t.z * offset, y: p.y, z: p.z + t.x * offset }, height: urban ? 9 : 26, urban, rotation: Math.atan2(t.x, t.z) })
    }
  }
  return lamps
}

/** One top-down irradiance atlas, no per-lamp point lights or shadow maps. */
export function makeLightingAtlas(lamps: Lamp[]) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048
  const context = canvas.getContext('2d')!
  context.fillStyle = '#000'; context.fillRect(0, 0, 2048, 2048)
  context.globalCompositeOperation = 'lighter'
  const extent = 1800, scale = canvas.width / (extent * 2)
  for (const { position: p, height, urban } of lamps) {
    const x = (p.x + extent) * scale, z = (p.z + extent) * scale, r = height * (urban ? 2.5 : 3.7) * scale
    const gradient = context.createRadialGradient(x, z, 0, x, z, r)
    gradient.addColorStop(0, urban ? 'rgba(255,180,100,0.98)' : 'rgba(255,220,166,0.98)')
    gradient.addColorStop(0.3, 'rgba(255,193,112,0.50)')
    gradient.addColorStop(0.65, 'rgba(215,153,90,0.15)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient; context.fillRect(x - r, z - r, r * 2, r * 2)
  }
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping
  return texture
}

export function litMaterial(atlas: T.Texture, color: string, gain = 0.5, roughness = 0.9) {
  const material = new T.MeshStandardMaterial({ color, roughness, metalness: 0.05, side: T.DoubleSide })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.roadLighting = { value: atlas }
    shader.vertexShader = 'varying vec3 roadWorld;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nroadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = 'uniform sampler2D roadLighting;\nvarying vec3 roadWorld;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 lightUV = (roadWorld.xz + 1800.0) / 3600.0;
      vec3 illumination = texture2D(roadLighting, vec2(lightUV.x, 1.0-lightUV.y)).rgb;
      float grain = fract(sin(dot(floor(roadWorld.xz * 7.0), vec2(127.1,311.7))) * 43758.5453);
      outgoingLight += diffuseColor.rgb * illumination * ${gain.toFixed(3)} * (0.90 + grain * 0.20) * max(0.25, normal.y);
      #include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => `road-light-${gain}`
  return material
}

export function NightWorld({ network, atlas }: { network: Network; atlas: T.Texture }) {
  const urban = network.id !== 'cloverleaf'
  const assets = useMemo(() => {
    const buildings: Instance[] = [], windows: Instance[] = [], trees: Instance[] = []
    let seed = 491
    const rand = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
    const building = (x: number, z: number, w: number, d: number, h: number) => {
      buildings.push({ position: [x, h / 2 - 0.4, z], scale: [w, h, d], color: rand() > 0.5 ? '#33414e' : '#3b464e' })
      for (let y = 3; y < h - 2; y += 3.2) {
        for (let dx = -w / 2 + 2; dx < w / 2 - 1; dx += 3.4) {
          for (const side of [-1, 1]) if (rand() < (urban ? 0.28 : 0.12)) windows.push({ position: [x + dx, y, z + side * (d / 2 + 0.06)], scale: [1.25, 1.5, 0.08], color: rand() > 0.22 ? '#b69d74' : '#7894ab' })
        }
        for (let dz = -d / 2 + 2; dz < d / 2 - 1; dz += 3.4) {
          for (const side of [-1, 1]) if (rand() < (urban ? 0.28 : 0.12)) windows.push({ position: [x + side * (w / 2 + 0.06), y, z + dz], scale: [0.08, 1.5, 1.25], color: rand() > 0.22 ? '#b69d74' : '#7894ab' })
        }
      }
    }
    if (urban) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 3; iz++) {
          const x = sx * (45 + ix * 44), z = sz * (46 + iz * 45)
          building(x, z, 23 + rand() * 12, 20 + rand() * 14, 12 + rand() * 30)
        }
      }
    }
    for (let i = 0; i < 150; i++) {
      const angle = rand() * Math.PI * 2, radius = 900 + rand() * 1400
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius
      if (Math.abs(x) < 65 || Math.abs(z) < 65) continue
      building(x, z, 14 + rand() * 48, 16 + rand() * 35, 10 + rand() ** 3 * 120)
    }
    if (!urban) for (let i = 0; i < 340; i++) {
      const x = (rand() - 0.5) * 1200, z = (rand() - 0.5) * 1200
      if (Math.abs(x) < 230 && Math.abs(z) < 230 || Math.abs(x) < 45 || Math.abs(z) < 45) continue
      const h = 3 + rand() * 6
      trees.push({ position: [x, h / 2, z], scale: [h * 0.6, h, h * 0.6], color: '#101e1c' })
    }
    return { buildings, windows, trees, ground: litMaterial(atlas, urban ? '#242c30' : '#1b282a', urban ? 1.6 : 0.85), sky: new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, uniforms: {},
      vertexShader: 'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec3 vDirection; void main(){
        float h=normalize(vDirection).y;
        vec3 top=vec3(0.009,0.019,0.048), horizon=vec3(0.100,0.137,0.210);
        vec3 c=mix(horizon,top,smoothstep(0.0,0.55,h));
        c+=vec3(0.075,0.035,0.014)*exp(-abs(h)*38.0);
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }) }
  }, [urban, atlas])
  useEffect(() => () => { assets.ground.dispose(); assets.sky.dispose() }, [assets])
  return <>
    <fogExp2 attach="fog" args={['#253652', 0.00065]} />
    <hemisphereLight args={['#91a4cd', '#1a1e22', 1.05]} />
    <directionalLight position={[-450, 750, -200]} color="#c4d5f5" intensity={1.1} />
    <mesh material={assets.sky}><sphereGeometry args={[7000, 32, 20]} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} material={assets.ground}><planeGeometry args={[14000, 14000]} /></mesh>
    <instancedMesh args={[undefined, undefined, assets.buildings.length]} ref={m => { if (m) fillInstances(m, assets.buildings) }}>
      <boxGeometry /><meshStandardMaterial roughness={0.92} />
    </instancedMesh>
    <instancedMesh args={[undefined, undefined, assets.windows.length]} ref={m => { if (m) fillInstances(m, assets.windows) }}>
      <boxGeometry /><meshBasicMaterial color={[1.4, 1.3, 1.1]} toneMapped={false} />
    </instancedMesh>
    {!!assets.trees.length && <instancedMesh args={[undefined, undefined, assets.trees.length]} ref={m => { if (m) fillInstances(m, assets.trees) }}><icosahedronGeometry args={[0.5, 1]} /><meshStandardMaterial roughness={1} /></instancedMesh>}
  </>
}
