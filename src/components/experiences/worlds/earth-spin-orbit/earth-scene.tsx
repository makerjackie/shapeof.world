import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useExperienceI18n } from '~/i18n/experience'
import * as THREE from 'three'
import { SiderealTime } from 'astronomy-engine'
import { EARTH_NIGHT_TEXTURE_URL, SUN_TEXTURE_URL } from '~/components/experiences/solar-system-textures'
import { BEIJING, PLACES, OBLIQUITY_DEG, POLAR_CIRCLE_LAT_DEG, TROPIC_LAT_DEG, inertialAxis, latLonToVec3, simTimeAt, solarCoordsAt, SIDEREAL_DAY_HOURS, vec3ToLatLon, type Place, type SimTime } from './earth-spin-orbit-model'

import { EarthTeachingOverlays } from './EarthTeachingOverlays'
import type { Topic } from './earth-teaching'
import { loadLandMask, type EarthSkin } from './earth-appearance'
import { earthMoonAt, moonOrbitAt, MOON_RADIUS } from './earth-moon-model'

import { EARTH_ORBIT_RADIUS, SUN_RADIUS, earthSunAt } from './earth-sun-model'

const ORBIT_RADIUS = EARTH_ORBIT_RADIUS
const EARTH_SUN_SCALE = 1.0
const CLOSE_VIEW_ROLL = -OBLIQUITY_DEG * Math.PI / 180

export const SPEEDS = [
  { id: 'live', hoursPerSec: 1 / 3600, label: '实时' },
  { id: 'hour', hoursPerSec: 1, label: '1 小时/秒' },
  { id: 'day', hoursPerSec: 24, label: '1 天/秒' },
  { id: 'year', hoursPerSec: 438, label: '1 年/20秒' },
] as const

export type SpeedId = (typeof SPEEDS)[number]['id']
export type ViewMode = 'earth' | 'sun' | 'moon'

export type Layers = {
  clouds: boolean
  atmosphere: boolean
  lights: boolean
  grid: boolean
  axis: boolean
  equator: boolean
  tropics: boolean
  polar: boolean
  terminator: boolean
  markers: boolean
  autoRotate: boolean
}

export const DEFAULT_LAYERS: Layers = {
  clouds: true,
  atmosphere: true,
  lights: true,
  grid: false,
  axis: false,
  equator: false,
  tropics: false,
  polar: false,
  terminator: false,
  markers: false,
  autoRotate: false,
}

export const LAYER_CHIPS: Array<{ key: keyof Layers; label: string }> = [
  { key: 'clouds', label: '云层' },
  { key: 'atmosphere', label: '大气层' },
  { key: 'lights', label: '城市灯光' },
  { key: 'grid', label: '经纬网格' },
  { key: 'axis', label: '地轴' },
  { key: 'equator', label: '赤道' },
  { key: 'tropics', label: '回归线' },
  { key: 'polar', label: '极圈' },
  { key: 'terminator', label: '昼夜分界线' },
  { key: 'markers', label: '地点标记' },
  { key: 'autoRotate', label: '自动旋转' },
]

export type Picked = { lat: number; lon: number; name: string; tz: number; timeZone?: string; id?: string }

export type SceneState = {
  skin?: EarthSkin
  nightShade?: boolean
  topic?: Topic
  labels?: boolean
  projection?: boolean
  compareId?: string
  time: SimTime
  epoch: number
  rotationEpoch?: number
  direction?: 1 | -1
  spinAngle?: number
  playing: boolean
  speedId: SpeedId
  view: ViewMode
  yaw: number
  pitch: number
  radius: number
  velYaw: number
  velPitch: number
  sunFocus?: boolean
  moonFocus?: boolean
  moonOrbit?: boolean
  sunAz: number
  sunEl: number
  sunRadius: number
  lastUserInput: number
  layers: Layers
  picked: Picked
}

export type Tween = {
  startAt: number
  dur: number
  from: number
  to: number
  apply: (value: number) => void
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function placeFromLatLon(lat: number, lon: number): Picked {
  let best: Place = BEIJING
  let bestD = Infinity
  for (const place of PLACES) {
    const d = (place.lat - lat) ** 2 + (place.lon - lon) ** 2
    if (d < bestD) {
      best = place
      bestD = d
    }
  }
  // Keep arbitrary globe clicks exact; a nearby city can be hundreds of kilometres away.
  if (bestD < 1e-6) return { ...best }
  return { lat, lon, name: '选中地点', tz: Math.round(lon / 15) }
}

const EARTH_VERTEX = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const EARTH_FRAGMENT = `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec3 uSunDir;
uniform float uLights;
uniform float uGrid;
uniform float uTerminator;
uniform sampler2D uLand;
uniform float uSkin;
uniform float uAtmosphere;
uniform float uNightShade;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec3 n = normalize(vWorldNormal);
  float cosZ = dot(n, uSunDir);
  vec3 dayTex = texture2D(uDay, vUv).rgb;
  // Colour-grade the dark ocean pixels of the NASA composite, preserving
  // its coastlines, shallows and land detail rather than using the coarse map mask.
  float oceanMask = smoothstep(0.003, 0.028, dayTex.b - max(dayTex.r, dayTex.g));
  oceanMask *= 1.0 - smoothstep(0.08, 0.24, dot(dayTex, vec3(0.2126, 0.7152, 0.0722)));
  vec3 oceanBlue = vec3(0.004, 0.024, 0.082) + dayTex * vec3(0.35, 0.85, 1.1);
  dayTex = mix(dayTex, oceanBlue, oceanMask * 0.88);
  if (uSkin > 0.5) {
    float land = texture2D(uLand, vUv).r;
    vec3 oceanColor = uSkin < 1.5 ? vec3(0.055, 0.24, 0.34) : vec3(0.16, 0.25, 0.29);
    vec3 landColor = uSkin < 1.5 ? vec3(0.38, 0.63, 0.49) : vec3(0.86, 0.79, 0.63);
    dayTex = mix(oceanColor, landColor, land);
  }
  vec3 lightsTex = texture2D(uNight, vUv).rgb;
  float dayLit = smoothstep(-0.04, 0.14, cosZ);
  float lowSun = exp(-pow(max(cosZ, 0.0) / 0.26, 2.0));
  vec3 dayColor = dayTex * mix(vec3(1.0), vec3(1.02, 0.97, 0.90), lowSun * 0.22);
  dayColor *= 0.24 + 1.26 * pow(clamp(cosZ, 0.0, 1.0), 0.65);
  float nightMask = 1.0 - smoothstep(-0.14, 0.08, cosZ);
  vec3 nightBase = dayTex * vec3(0.030, 0.038, 0.058);
  vec3 nightColor = nightBase + lightsTex * vec3(1.0, 0.80, 0.52) * 1.9 * nightMask * uLights * (1.0 - step(0.5, uSkin));
  vec3 col = mix(nightColor, dayColor, dayLit);
  float twilight = exp(-pow(cosZ / 0.065, 2.0));
  col = mix(col, col * vec3(1.06, 0.88, 0.72), twilight * 0.28);
  // Camera-facing fill reveals the whole globe without changing solar geometry.
  vec3 viewDirE = normalize(cameraPosition - vWorldPos);
  vec3 studioNormal = normalize(mat3(viewMatrix) * n);
  float studioLight = max(dot(studioNormal, normalize(vec3(-0.45, 0.65, 1.4))), 0.0);
  vec3 globeColor = dayTex * (0.48 + 0.52 * studioLight);
  col = mix(globeColor, col, uNightShade);
  float horizon = pow(1.0 - max(dot(n, viewDirE), 0.0), 2.6);
  float scatterLight = mix(0.7, smoothstep(-0.10, 0.45, cosZ), uNightShade);
  col = mix(col, vec3(0.035, 0.22, 0.58), horizon * scatterLight * 0.46 * uAtmosphere * (1.0 - step(0.5, uSkin)));
  float edgeWidth = max(fwidth(cosZ) * 0.42, 0.00055);
  float terminatorLine = 1.0 - smoothstep(edgeWidth, edgeWidth * 2.0, abs(cosZ));
  col = mix(col, vec3(0.60, 0.76, 0.89), terminatorLine * 0.22 * uTerminator);
  vec2 grid = abs(fract(vec2(vUv.x * 12.0, vUv.y * 6.0)) - 0.5);
  float gridLine = smoothstep(0.485, 0.5, max(grid.x, grid.y));
  col += vec3(0.55, 0.72, 0.9) * gridLine * 0.16 * uGrid;
  vec3 refl = reflect(-uSunDir, n);
  float glint = pow(max(dot(refl, viewDirE), 0.0), 42.0);
  float ocean = smoothstep(0.015, 0.10, dayTex.b - dayTex.r);
  col += vec3(1.0, 0.92, 0.78) * glint * ocean * 0.26 * smoothstep(0.05, 0.45, cosZ) * uNightShade * (1.0 - step(0.5, uSkin));
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.004;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const CLOUD_FRAGMENT = `
uniform float uNightShade;
uniform sampler2D uClouds;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vWorldNormal;
void main() {
  vec3 n = normalize(vWorldNormal);
  float cosZ = dot(n, uSunDir);
  float raw = texture2D(uClouds, vUv).r;
  float cover = smoothstep(0.07, 0.92, raw);
  float dayLit = smoothstep(-0.06, 0.30, cosZ);
  float twilight = exp(-pow(cosZ / 0.08, 2.0));
  vec3 tint = mix(vec3(0.12, 0.20, 0.34), vec3(1.45, 1.49, 1.55), dayLit);
  tint = mix(tint, vec3(1.0, 0.78, 0.58), twilight * 0.18);
  float alpha = cover * (0.008 + 0.90 * dayLit) + cover * twilight * 0.035;
  tint = mix(vec3(1.25, 1.30, 1.35), tint, uNightShade);
  alpha = mix(cover * 0.70, alpha, uNightShade);
  gl_FragColor = vec4(tint, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const ATMO_VERTEX = `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const ATMO_FRAGMENT = `
uniform vec3 uSunDir;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - abs(dot(n, viewDir)), 3.0);
  float cosZ = dot(n, uSunDir);
  float dayA = smoothstep(-0.18, 0.42, cosZ);
  float twi = exp(-pow(cosZ / 0.12, 2.0));
  vec3 col = mix(vec3(0.12, 0.48, 1.0), vec3(0.70, 0.53, 0.42), twi * 0.24);
  float strength = fres * (0.025 + 0.52 * dayA + 0.12 * twi);
  gl_FragColor = vec4(col, strength);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function latCircleGeometry(latDeg: number, radius: number) {
  const lat = (latDeg * Math.PI) / 180
  const y = radius * Math.sin(lat)
  const r = radius * Math.cos(lat)
  const points: Array<THREE.Vector3> = []
  for (let i = 0; i <= 160; i += 1) {
    const a = (i / 160) * Math.PI * 2
    points.push(new THREE.Vector3(r * Math.cos(a), y, -r * Math.sin(a)))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

export function Stars({ count = 12000, spread = 100 }: { count?: number; spread?: number }) {
  const { gl } = useThree()
  const resources = useMemo(() => {
    let seed = 0x51a9e37
    const random = () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
      return (seed >>> 0) / 0x100000000
    }
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const u = random() * 2 - 1
      const a = random() * Math.PI * 2
      const r = spread * (0.75 + random() * 0.4)
      const radial = Math.sqrt(1 - u * u)
      positions[i * 3] = r * radial * Math.cos(a)
      positions[i * 3 + 1] = r * u
      positions[i * 3 + 2] = r * radial * Math.sin(a)
      const magnitude = random()
      const prominent = magnitude > 0.985
      sizes[i] = prominent ? 4.0 + random() * 1.5 : 0.9 + Math.pow(magnitude, 2) * 1.2
      const intensity = prominent ? 0.65 : 0.16 + Math.pow(magnitude, 1.8) * 0.34
      const warm = random()
      colors[i * 3] = intensity * (0.76 + warm * 0.24)
      colors[i * 3 + 1] = intensity * (0.86 + warm * 0.07)
      colors[i * 3 + 2] = intensity * (1 - warm * 0.19)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: 1 } },
      vertexColors: true,
      vertexShader: `
        uniform float uPixelRatio;
        attribute float aSize;
        varying vec3 vColor;
        varying float vProminent;
        void main() {
          vColor = color;
          vProminent = step(4.0, aSize);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vProminent;
        void main() {
          float radius = length(gl_PointCoord - 0.5) * 2.0;
          if (radius > 1.0) discard;
          float core = exp(-radius * radius * mix(3.2, 22.0, vProminent));
          float halo = exp(-radius * radius * 4.0) * 0.14 * vProminent;
          float alpha = (core + halo) * (1.0 - smoothstep(0.65, 1.0, radius));
          gl_FragColor = vec4(vColor, alpha);
          #include <colorspace_fragment>
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
    return { geometry, material }
  }, [count, spread])
  useFrame(() => { resources.material.uniforms.uPixelRatio.value = gl.getPixelRatio() })
  useEffect(() => () => { resources.geometry.dispose(); resources.material.dispose() }, [resources])
  return <points geometry={resources.geometry} material={resources.material} />
}

function Marker({ lat, lon, radius, color, reducedMotion, emphasis = false }: {
  lat: number
  lon: number
  radius: number
  color: string
  reducedMotion: boolean
  emphasis?: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const position = useMemo(() => {
    const v = latLonToVec3(lat, lon, radius)
    return new THREE.Vector3(v.x, v.y, v.z)
  }, [lat, lon, radius])
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize())
    return q
  }, [position])
  useFrame(({ clock }) => {
    if (!ringRef.current || reducedMotion) return
    const t = (clock.elapsedTime % 2.2) / 2.2
    ringRef.current.scale.setScalar(1 + t * 1.5)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.5 * (1 - t)
  })
  const s = radius * (emphasis ? 0.012 : 0.008)
  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <sphereGeometry args={[s, 12, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[s * 1.6, s * 2.1, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function GlobeOverlays({ radius, layers }: { radius: number; layers: Layers }) {
  const equator = useMemo(() => latCircleGeometry(0, radius * 1.004), [radius])
  const cancer = useMemo(() => latCircleGeometry(TROPIC_LAT_DEG, radius * 1.004), [radius])
  const capricorn = useMemo(() => latCircleGeometry(-TROPIC_LAT_DEG, radius * 1.004), [radius])
  const arctic = useMemo(() => latCircleGeometry(POLAR_CIRCLE_LAT_DEG, radius * 1.004), [radius])
  const antarctic = useMemo(() => latCircleGeometry(-POLAR_CIRCLE_LAT_DEG, radius * 1.004), [radius])
  useEffect(() => () => {
    for (const geometry of [equator, cancer, capricorn, arctic, antarctic]) geometry.dispose()
  }, [equator, cancer, capricorn, arctic, antarctic])
  return (
    <>
      {layers.equator && (
        <lineLoop geometry={equator}>
          <lineBasicMaterial color="#f0d9a0" transparent opacity={0.7} />
        </lineLoop>
      )}
      {layers.tropics && (
        <>
          <lineLoop geometry={cancer}>
            <lineBasicMaterial color="#7ec8ff" transparent opacity={0.65} />
          </lineLoop>
          <lineLoop geometry={capricorn}>
            <lineBasicMaterial color="#7ec8ff" transparent opacity={0.65} />
          </lineLoop>
        </>
      )}
      {layers.polar && (
        <>
          <lineLoop geometry={arctic}>
            <lineBasicMaterial color="#c9b6ff" transparent opacity={0.6} />
          </lineLoop>
          <lineLoop geometry={antarctic}>
            <lineBasicMaterial color="#c9b6ff" transparent opacity={0.6} />
          </lineLoop>
        </>
      )}
      {layers.axis && (
        <group>
          <mesh>
            <cylinderGeometry args={[radius * 0.0035, radius * 0.0035, radius * 2.5, 8]} />
            <meshBasicMaterial color="#f4e2c0" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, radius * 1.26, 0]}>
            <sphereGeometry args={[radius * 0.017, 12, 10]} />
            <meshBasicMaterial color="#ffd9a0" />
          </mesh>
        </group>
      )}
    </>
  )
}

export function useEarthMaterials(onReady?: () => void, onError?: (message: string) => void, includeSun = true) {
  const { gl } = useThree()
  const callbacks = useRef({ onReady, onError })
  callbacks.current = { onReady, onError }
  const [sunTexture, setSunTexture] = useState<THREE.Texture | null>(null)
  const materials = useMemo(() => ({
    earthMat: new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: null }, uNight: { value: null },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uAtmosphere: { value: 1 }, uLand: { value: null }, uSkin: { value: 0 }, uNightShade: { value: 1 },
        uLights: { value: 1 }, uGrid: { value: 0 }, uTerminator: { value: 1 },
      },
      vertexShader: EARTH_VERTEX, fragmentShader: EARTH_FRAGMENT,
    }),
    cloudMat: new THREE.ShaderMaterial({
      uniforms: { uNightShade: { value: 1 }, uClouds: { value: null }, uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
      vertexShader: EARTH_VERTEX, fragmentShader: CLOUD_FRAGMENT,
      transparent: true, depthWrite: false,
    }),
    atmoMat: new THREE.ShaderMaterial({
      uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
      vertexShader: ATMO_VERTEX, fragmentShader: ATMO_FRAGMENT,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    }),
  }), [])
  useEffect(() => {
    let alive = true
    const textures: THREE.Texture[] = []
    const abort = new AbortController()
    const loader = new THREE.TextureLoader()
    const load = (url: string, color = true) => new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, (texture) => {
        if (!alive) { texture.dispose(); return }
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
        texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
        texture.wrapS = THREE.RepeatWrapping
        textures.push(texture)
        resolve(texture)
      }, undefined, () => reject(new Error(`Texture unavailable: ${url}`)))
    })
    void Promise.all([
      load('/assets/solar-system/earth-bmng-4k.jpg'),
      load(EARTH_NIGHT_TEXTURE_URL), load('/assets/earth-spin-orbit/clouds-nasa-2k.jpg', false), includeSun ? load(SUN_TEXTURE_URL) : Promise.resolve(null),
      loadLandMask(abort.signal).then(texture => { if (!alive) texture.dispose(); else textures.push(texture); return texture }),
    ]).then(([day, night, clouds, sun, land]) => {
      if (!alive) return
      materials.earthMat.uniforms.uLand.value = land
      materials.earthMat.uniforms.uDay.value = day
      materials.earthMat.uniforms.uNight.value = night
      materials.cloudMat.uniforms.uClouds.value = clouds
      setSunTexture(sun)
      callbacks.current.onReady?.()
    }).catch((error: unknown) => {
      if (alive) callbacks.current.onError?.(error instanceof Error ? error.message : 'Texture unavailable')
    })
    return () => {
      alive = false
      abort.abort()
      for (const texture of textures) texture.dispose()
    }
  }, [gl, materials, includeSun])
  useEffect(() => () => {
    materials.earthMat.dispose()
    materials.cloudMat.dispose()
    materials.atmoMat.dispose()
  }, [materials])
  return { ...materials, sunTexture }
}

function OrbitAxisReference() {
  const label = useRef<THREE.Sprite>(null)
  const { size, camera } = useThree()
  const resources = useMemo(() => {
    const angle = OBLIQUITY_DEG * Math.PI / 180
    const axis = new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0)
    const north = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.03, 0), new THREE.Vector3(0, 2.45, 0)])
    const normalLine = new THREE.Line(north, new THREE.LineDashedMaterial({ color: '#b8c9d8', transparent: true, opacity: 0.65, dashSize: 0.105, gapSize: 0.075 }))
    normalLine.computeLineDistances()
    const axisCurve = new THREE.LineCurve3(axis.clone().multiplyScalar(-1.5), axis.clone().multiplyScalar(2.5))
    const axisGeometry = new THREE.TubeGeometry(axisCurve, 1, 0.013, 6, false)
    const arcPoints = Array.from({ length: 33 }, (_, index) => {
      const theta = angle * index / 32
      return new THREE.Vector3(Math.sin(theta) * 1.85, Math.cos(theta) * 1.85, 0)
    })
    const arc = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints), 32, 0.014, 6, false)
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '500 56px system-ui, sans-serif'
    ctx.fillStyle = '#f6ddb1'
    ctx.shadowColor = '#03070b'; ctx.shadowBlur = 9
    ctx.fillText(`${OBLIQUITY_DEG.toFixed(1)}°`, 128, 48)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { normalLine, axisGeometry, arc, texture }
  }, [])
  useEffect(() => () => {
    resources.normalLine.geometry.dispose()
    resources.normalLine.material.dispose()
    resources.axisGeometry.dispose(); resources.arc.dispose(); resources.texture.dispose()
  }, [resources])
  useFrame(() => {
    if (!label.current) return
    const factor = 2 * Math.tan((camera as THREE.PerspectiveCamera).fov * Math.PI / 360) / size.height
    label.current.scale.set(76 * factor, 28.5 * factor, 1)
  })
  return (
    <>
      <primitive object={resources.normalLine} />
      <mesh geometry={resources.axisGeometry}>
        <meshBasicMaterial color="#f3d4a1" transparent opacity={0.92} />
      </mesh>
      <mesh geometry={resources.arc}>
        <meshBasicMaterial color="#f3d4a1" transparent opacity={0.9} />
      </mesh>
      <sprite ref={label} position={[0.48, 2.58, 0]}>
        <spriteMaterial map={resources.texture} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} />
      </sprite>
    </>
  )
}

function SunGlobe() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: EARTH_VERTEX,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        float mu = max(0.0, dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos)));
        vec3 color = vec3(1.0, 0.98, 0.94) * (0.45 + 0.55 * mu);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  }), [])
  const corona = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(255,232,183,0.65)')
    gradient.addColorStop(0.35, 'rgba(255,224,160,0.38)')
    gradient.addColorStop(0.41, 'rgba(255,204,118,0.17)')
    gradient.addColorStop(0.55, 'rgba(255,181,85,0.045)')
    gradient.addColorStop(0.8, 'rgba(255,167,67,0.008)')
    gradient.addColorStop(1, 'rgba(255,157,56,0)')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    return map
  }, [])
  useEffect(() => () => { material.dispose(); corona.dispose() }, [material, corona])
  return (
    <>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS, 64, 48]} />
        <primitive object={material} attach="material" />
      </mesh>
      <sprite scale={[SUN_RADIUS * 2.4, SUN_RADIUS * 2.4, 1]}>
        <spriteMaterial map={corona} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </>
  )
}

export function WorldScene({
  scene, tweens, view, layers, picked, interactive, reducedMotion,
  onUserGesture, onPick, onFocus, onReady, onError,
}: {
  scene: { current: SceneState }
  tweens: { current: Array<Tween> }
  view: ViewMode
  layers: Layers
  picked: Picked
  interactive: boolean
  reducedMotion: boolean
  onUserGesture: () => void
  onPick: (lat: number, lon: number) => void
  onFocus: (lat: number, lon: number) => void
  onReady?: () => void
  onError?: (message: string) => void
}) {
  const tx = useExperienceI18n()
  const { camera, gl } = useThree()
  const earthGroup = useRef<THREE.Group>(null)
  const earthMesh = useRef<THREE.Mesh>(null)
  const solarSystem = useRef<THREE.Group>(null)
  const moonMesh = useRef<THREE.Mesh>(null)
  const lunarTrack = useRef<THREE.Group>(null)
  const orbitDay = useRef(Number.NaN)
  const orbitSidereal = useRef(0)
  const lunarPath = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(161 * 3), 3)), [])
  const lunarLine = useMemo(() => new THREE.Line(lunarPath, new THREE.LineBasicMaterial({ color: '#8aafcf', transparent: true, opacity: 0.4 })), [lunarPath])
  useEffect(() => () => { lunarPath.dispose(); lunarLine.material.dispose() }, [lunarPath, lunarLine])
  const axisReference = useRef<THREE.Group>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number; at: number }>())
  const gesture = useRef({ moved: false, multiple: false, x: 0, y: 0, downAt: 0, lastTap: 0, tapX: 0, tapY: 0 })
  const referenceEpoch = useRef(scene.current.rotationEpoch ?? scene.current.epoch)
  const astronomyEpoch = useRef(Number.NaN)
  const astronomyLive = useRef(false)
  const { earthMat, cloudMat, atmoMat } = useEarthMaterials(onReady, onError, false)
  const scratch = useMemo(() => ({
    localMoon: new THREE.Vector3(), moonPosition: new THREE.Vector3(), moonTarget: new THREE.Vector3(), moonNormal: new THREE.Vector3(), moonSide: new THREE.Vector3(), moonMatrix: new THREE.Matrix4(), zero: new THREE.Vector3(),
    localSun: new THREE.Vector3(), closeSun: new THREE.Vector3(), orbitSun: new THREE.Vector3(),
    axis: new THREE.Vector3(inertialAxis().x, inertialAxis().y, inertialAxis().z),
    up: new THREE.Vector3(0, 1, 0), orbit: new THREE.Vector3(), projected: new THREE.Vector3(), targetProjected: new THREE.Vector3(),
    rollQ: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), CLOSE_VIEW_ROLL),
    closeQ: new THREE.Quaternion(), orbitQ: new THREE.Quaternion(), tiltQ: new THREE.Quaternion(), spinQ: new THREE.Quaternion(),
    euler: new THREE.Euler(0, 0, 0, 'XYZ'), closeCamera: new THREE.Vector3(), sunCamera: new THREE.Vector3(), targetCamera: new THREE.Vector3(),
    pointer: new THREE.Vector2(), raycaster: new THREE.Raycaster(),
  }), [])
  const moonMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null }, uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: EARTH_VERTEX,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uSunDir;
      varying vec2 vUv; varying vec3 vWorldNormal;
      void main() {
        float light = max(0.0, dot(normalize(vWorldNormal), uSunDir));
        gl_FragColor = vec4(texture2D(uMap, vUv).rgb * (0.008 + 1.3 * pow(light, 0.65)), 1.0);
        #include <colorspace_fragment>
      }`,
  }), [])
  const moonGeometry = useMemo(() => new THREE.SphereGeometry(MOON_RADIUS, 96, 64).rotateY(-Math.PI / 2), [])
  useEffect(() => {
    let alive = true
    let loaded: THREE.Texture | undefined
    new THREE.TextureLoader().load('/assets/solar-system/moon-lroc-2k.jpg', texture => {
      if (!alive) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      loaded = texture; moonMaterial.uniforms.uMap.value = texture
    }, undefined, () => onError?.('Moon texture unavailable'))
    return () => { alive = false; loaded?.dispose() }
  }, [moonMaterial, onError])
  useEffect(() => () => { moonMaterial.dispose(); moonGeometry.dispose() }, [moonMaterial, moonGeometry])
  const orbitGeo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 256; i++) {
      const year = new Date(scene.current.epoch).getUTCFullYear()
      const start = Date.UTC(year, 0, 1), end = Date.UTC(year + 1, 0, 1)
      const p = earthSunAt(start + (end - start) * i / 256)
      pts.push(new THREE.Vector3(p.x, p.y, p.z))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  useEffect(() => () => orbitGeo.dispose(), [orbitGeo])

  useEffect(() => {
    const dom = gl.domElement
    if (!interactive) return
    const pointers = pointersRef.current
    let lastPinch = 0
    const previousTouchAction = dom.style.touchAction
    dom.style.touchAction = 'none'
    const hitGlobe = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect()
      scratch.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      scratch.raycaster.setFromCamera(scratch.pointer, camera)
      const mesh = earthMesh.current
      const group = earthGroup.current
      if (!mesh || !group) return null
      const hit = scratch.raycaster.intersectObject(mesh, false)[0]
      if (!hit) return null
      const local = group.worldToLocal(hit.point.clone())
      return vec3ToLatLon(local.x, local.y, local.z)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const now = performance.now()
      if (pointers.size === 0) {
        gesture.current.moved = false
        gesture.current.multiple = false
        gesture.current.x = event.clientX
        gesture.current.y = event.clientY
        gesture.current.downAt = now
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, at: now })
      dom.setPointerCapture(event.pointerId)
      scene.current.velYaw = 0
      scene.current.velPitch = 0
      scene.current.lastUserInput = now
      if (pointers.size > 1) {
        gesture.current.multiple = true
        gesture.current.lastTap = 0
        tweens.current = []
        const [a, b] = [...pointers.values()]
        lastPinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
      onUserGesture()
    }
    const onPointerMove = (event: PointerEvent) => {
      const prev = pointers.get(event.pointerId)
      if (!prev) return
      const s = scene.current
      const now = performance.now()
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, at: now })
      const distance = Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y)
      if (distance > 5) {
        if (!gesture.current.moved) tweens.current = []
        gesture.current.moved = true
      }
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (lastPinch > 0 && dist > 1) {
          const ratio = lastPinch / dist
          if (s.view === 'earth') s.radius = THREE.MathUtils.clamp(s.radius * ratio, 2.2, 5.6)
          else s.sunRadius = THREE.MathUtils.clamp(s.sunRadius * ratio, 8, 32)
        }
        lastPinch = dist
      } else if (gesture.current.moved) {
        let dx = event.clientX - prev.x
        let dy = event.clientY - prev.y
        const k = 0.0052
        if (s.view === 'earth') {
          // Undo the presentation roll so screen drags remain aligned with the pointer.
          const horizontal = Math.cos(CLOSE_VIEW_ROLL) * dx - Math.sin(CLOSE_VIEW_ROLL) * dy
          dy = Math.sin(CLOSE_VIEW_ROLL) * dx + Math.cos(CLOSE_VIEW_ROLL) * dy
          dx = horizontal
          s.yaw += dx * k
          s.pitch = THREE.MathUtils.clamp(s.pitch + dy * k, -1.48, 1.48)
          const dt = Math.max((now - prev.at) / 1000, 1 / 120)
          s.velYaw = reducedMotion ? 0 : THREE.MathUtils.clamp(dx * k / dt, -1.8, 1.8)
          s.velPitch = reducedMotion ? 0 : THREE.MathUtils.clamp(dy * k / dt, -1.2, 1.2)
        } else {
          s.sunAz -= dx * k
          s.sunEl = THREE.MathUtils.clamp(s.sunEl + dy * k, 0.2, 1.35)
        }
      }
      s.lastUserInput = now
    }
    const finish = (event: PointerEvent, cancelled: boolean) => {
      if (!pointers.has(event.pointerId)) return
      const lastMove = pointers.get(event.pointerId)
      if (lastMove && performance.now() - lastMove.at > 90) { scene.current.velYaw = 0; scene.current.velPitch = 0 }
      pointers.delete(event.pointerId)
      if (dom.hasPointerCapture(event.pointerId)) dom.releasePointerCapture(event.pointerId)
      if (pointers.size < 2) lastPinch = 0
      if (pointers.size > 0) return
      const now = performance.now()
      scene.current.lastUserInput = now
      if (cancelled || gesture.current.multiple || gesture.current.moved || now - gesture.current.downAt > 550) {
        gesture.current.lastTap = 0
        if (cancelled) { scene.current.velYaw = 0; scene.current.velPitch = 0 }
        return
      }
      const hit = hitGlobe(event.clientX, event.clientY)
      if (!hit) return
      const doubleTap = now - gesture.current.lastTap < 340
        && Math.hypot(event.clientX - gesture.current.tapX, event.clientY - gesture.current.tapY) < 28
      gesture.current.lastTap = doubleTap ? 0 : now
      gesture.current.tapX = event.clientX
      gesture.current.tapY = event.clientY
      if (doubleTap) onFocus(hit.lat, hit.lon)
      else onPick(hit.lat, hit.lon)
    }
    const onPointerUp = (event: PointerEvent) => finish(event, false)
    const onPointerCancel = (event: PointerEvent) => finish(event, true)
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const s = scene.current
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dom.clientHeight : 1)
      const factor = Math.exp(THREE.MathUtils.clamp(dy * 0.0011, -0.4, 0.4))
      tweens.current = []
      if (s.view === 'earth') s.radius = THREE.MathUtils.clamp(s.radius * factor, 2.2, 5.6)
      else s.sunRadius = THREE.MathUtils.clamp(s.sunRadius * factor, 8, 32)
      s.lastUserInput = performance.now()
      onUserGesture()
    }
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerCancel)
    dom.addEventListener('lostpointercapture', onPointerCancel)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerCancel)
      dom.removeEventListener('lostpointercapture', onPointerCancel)
      dom.removeEventListener('wheel', onWheel)
      for (const id of pointers.keys()) if (dom.hasPointerCapture(id)) dom.releasePointerCapture(id)
      pointers.clear()
      dom.style.touchAction = previousTouchAction
    }
  }, [camera, gl, interactive, onFocus, onPick, onUserGesture, reducedMotion, scene, scratch, tweens])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const s = scene.current
    if (s.playing) {
      if (s.time.live) s.epoch = Date.now()
      else {
        const speed = SPEEDS.find((item) => item.id === s.speedId)?.hoursPerSec ?? 24
        s.epoch += delta * speed * 3_600_000 * (s.direction ?? 1)
      }
    }
    const now = performance.now()
    if (tweens.current.length) tweens.current = tweens.current.filter((tw) => {
      const t = reducedMotion ? 1 : clamp01((now - tw.startAt) / tw.dur)
      tw.apply(tw.from + (tw.to - tw.from) * easeInOut(t))
      return t < 1
    })
    if (reducedMotion) { s.velYaw = 0; s.velPitch = 0 }
    const drifting = Math.abs(s.velYaw) > 0.001 || Math.abs(s.velPitch) > 0.001
    if (s.view === 'earth' && !reducedMotion && pointersRef.current.size === 0) {
      if (drifting) {
        s.yaw += s.velYaw * delta
        s.pitch = THREE.MathUtils.clamp(s.pitch + s.velPitch * delta, -1.48, 1.48)
        s.velYaw *= Math.exp(-delta * 4)
        s.velPitch *= Math.exp(-delta * 4)
      } else if (s.layers.autoRotate && now - s.lastUserInput > 2400) s.yaw += delta * 0.08
    }

    const b = s.view === 'sun' ? 1 : 0
    // Paused inspection changes the camera, but does not need new calendar or orbital calculations.
    if (astronomyEpoch.current !== s.epoch || astronomyLive.current !== s.time.live) {
      astronomyEpoch.current = s.epoch
      astronomyLive.current = s.time.live
      s.time = simTimeAt(s.epoch, s.time.live)
      s.spinAngle = ((s.epoch - referenceEpoch.current) / (SIDEREAL_DAY_HOURS * 3_600_000) * Math.PI * 2) % (Math.PI * 2)
      const lunar = earthMoonAt(s.epoch)
      scratch.localMoon.set(lunar.moon.x, lunar.moon.y, lunar.moon.z)
      const solar = solarCoordsAt(s.epoch)
      const point = latLonToVec3(solar.subsolarLat, solar.subsolarLon, 1)
      scratch.localSun.set(point.x, point.y, point.z)
      const orbit = earthSunAt(s.epoch)
      scratch.orbit.set(orbit.x, orbit.y, orbit.z)
      scratch.orbitSun.copy(scratch.orbit).negate().normalize()
      scratch.tiltQ.setFromUnitVectors(scratch.up, scratch.axis)
      scratch.projected.copy(scratch.localSun).applyQuaternion(scratch.tiltQ)
      scratch.projected.addScaledVector(scratch.axis, -scratch.projected.dot(scratch.axis)).normalize()
      scratch.targetProjected.copy(scratch.orbitSun).addScaledVector(scratch.axis, -scratch.orbitSun.dot(scratch.axis)).normalize()
      scratch.spinQ.setFromUnitVectors(scratch.projected, scratch.targetProjected)
      scratch.orbitQ.copy(scratch.spinQ).multiply(scratch.tiltQ)
    }
    scratch.euler.set(s.pitch, s.yaw + (s.spinAngle ?? 0), 0, 'XYZ')
    scratch.closeQ.setFromEuler(scratch.euler).premultiply(scratch.rollQ)
    scratch.closeSun.copy(scratch.localSun).applyQuaternion(scratch.closeQ)
    if (earthGroup.current) {
      earthGroup.current.position.copy(scratch.orbit).multiplyScalar(b)
      earthGroup.current.scale.setScalar(THREE.MathUtils.lerp(1, EARTH_SUN_SCALE, b))
      earthGroup.current.quaternion.copy(scratch.closeQ).slerp(scratch.orbitQ, b)
    }
    // Keeping the reference in the ecliptic frame preserves the same axial direction all year.
    if (axisReference.current) {
      axisReference.current.position.copy(scratch.orbit)
      axisReference.current.visible = false
    }
    scratch.closeSun.lerp(scratch.orbitSun, b).normalize()
    earthMat.uniforms.uSunDir.value.copy(scratch.closeSun)
    earthMat.uniforms.uAtmosphere.value = s.layers.atmosphere ? 1 : 0
    earthMat.uniforms.uSkin.value = s.skin === 'atlas' ? 1 : s.skin === 'ivory' ? 2 : 0
    earthMat.uniforms.uNightShade.value = s.nightShade === false ? 0 : 1
    cloudMat.uniforms.uNightShade.value = s.nightShade === false ? 0 : 1
    earthMat.uniforms.uLights.value = s.layers.lights ? 1 : 0
    earthMat.uniforms.uGrid.value = s.layers.grid ? 1 : 0
    earthMat.uniforms.uTerminator.value = s.layers.terminator ? 1 : 0
    cloudMat.uniforms.uSunDir.value.copy(scratch.closeSun)
    atmoMat.uniforms.uSunDir.value.copy(scratch.closeSun)
    if (solarSystem.current) {
      solarSystem.current.visible = b > 0.005
      solarSystem.current.scale.setScalar(Math.max(0.001, b))
    }
    if (moonMesh.current && earthGroup.current) {
      scratch.moonPosition.copy(scratch.localMoon).applyQuaternion(earthGroup.current.quaternion).add(earthGroup.current.position)
      moonMesh.current.position.copy(scratch.moonPosition)
      scratch.moonNormal.copy(scratch.up).applyQuaternion(earthGroup.current.quaternion)
      scratch.moonMatrix.lookAt(earthGroup.current.position, scratch.moonPosition, scratch.moonNormal)
      moonMesh.current.quaternion.setFromRotationMatrix(scratch.moonMatrix)
      // The Moon uses the same Earth-radius length unit in every view.
      moonMesh.current.visible = true
      moonMaterial.uniforms.uSunDir.value.copy(scratch.closeSun)
    }
    if (lunarTrack.current && earthGroup.current) {
      lunarTrack.current.visible = s.view === 'moon' && !s.moonFocus && s.moonOrbit !== false
      if (lunarTrack.current.visible) {
        const day = Math.floor(s.epoch / 86400000) * 86400000
        if (orbitDay.current !== day) {
          orbitDay.current = day
          orbitSidereal.current = SiderealTime(new Date(day))
          const points = moonOrbitAt(day)
          const attribute = lunarPath.getAttribute('position') as THREE.BufferAttribute
          points.forEach((p, i) => attribute.setXYZ(i, p.x, p.y, p.z))
          attribute.needsUpdate = true
          lunarPath.computeBoundingSphere()
        }
        lunarTrack.current.quaternion.copy(earthGroup.current.quaternion)
        lunarTrack.current.rotateY(-(SiderealTime(new Date(s.epoch)) - orbitSidereal.current) * Math.PI / 12)
      }
    }
    const cam = camera as THREE.PerspectiveCamera
    const aspect = cam.aspect || 1
    const fit = aspect < 1 ? Math.max(1, Math.min(2.5, 1 / Math.pow(aspect, 0.85)) * 0.85) : 1
    scratch.closeCamera.set(0, 0.04, s.radius * fit)
    // Fit the complete orbit to the narrower viewport dimension.
    const minOrbitDistance = (ORBIT_RADIUS * 1.03 + SUN_RADIUS) / Math.sin(Math.atan(Math.tan(21 * Math.PI / 180) * Math.min(1, aspect)))
    const distance = (s.sunFocus ? SUN_RADIUS * 6.5 * fit : minOrbitDistance * (aspect < 1 ? 1.8 : 1.1)) * s.sunRadius / 16
    scratch.sunCamera.set(Math.sin(s.sunAz) * Math.cos(s.sunEl) * distance, Math.sin(s.sunEl) * distance, Math.cos(s.sunAz) * Math.cos(s.sunEl) * distance)
    scratch.targetCamera.copy(scratch.closeCamera).lerp(scratch.sunCamera, b)
    cam.position.copy(scratch.targetCamera)
    cam.up.set(0, 1, 0)
    cam.lookAt(0, 0, 0)
    if (s.view === 'sun' && aspect < 1) {
      scratch.projected.copy(cam.position).normalize()
      scratch.targetProjected.copy(cam.up).addScaledVector(scratch.projected, -cam.up.dot(scratch.projected)).normalize()
      const offset = cam.position.length() * Math.tan(21 * Math.PI / 180) * (s.sunFocus ? 0.10 : 0.23)
      scratch.moonTarget.copy(scratch.targetProjected).multiplyScalar(-offset)
      cam.position.add(scratch.moonTarget)
      cam.lookAt(scratch.moonTarget)
    }
    if (s.view === 'moon') {
      // Camera framing only: both radii and the entire separation stay in Earth-radius units.
      const separation = scratch.moonPosition.length()
      scratch.moonSide.copy(scratch.moonPosition).normalize()
      scratch.moonNormal.crossVectors(scratch.moonSide, scratch.up).normalize()
      if (scratch.moonNormal.lengthSq() < 0.1) scratch.moonNormal.set(0, 0, 1)
      const framing = (s.moonOrbit !== false ? 68 : separation / 2 + 2) / Math.sin(Math.atan(Math.tan(21 * Math.PI / 180) * Math.min(1, aspect))) * 1.08 * (aspect < 1 && s.moonOrbit !== false ? 1.8 : 1)
      scratch.moonTarget.copy(scratch.moonPosition).multiplyScalar(s.moonFocus ? 1 : s.moonOrbit !== false ? 0 : 0.5)
      if (s.moonFocus) {
        scratch.projected.copy(scratch.moonSide).applyAxisAngle(scratch.up, s.sunAz - 0.62).applyAxisAngle(scratch.moonNormal, s.sunEl - 0.65)
        cam.position.copy(scratch.moonPosition).addScaledVector(scratch.projected, -(aspect < 1 ? 1.95 : 1.15) * Math.max(1, 0.75 / aspect) * s.sunRadius / 16)
        cam.up.copy(scratch.up).applyQuaternion(scratch.closeQ)
      } else {
        cam.up.copy(scratch.up).addScaledVector(scratch.moonSide, -scratch.up.dot(scratch.moonSide)).normalize()
        cam.position.copy(scratch.moonTarget)
          .addScaledVector(scratch.moonNormal, framing * Math.cos(s.sunAz - 0.62) * Math.cos(s.sunEl - 0.65) * s.sunRadius / 16)
          .addScaledVector(scratch.moonSide, framing * Math.sin(s.sunAz - 0.62) * Math.cos(s.sunEl - 0.65) * s.sunRadius / 16)
          .addScaledVector(scratch.up, framing * Math.sin(s.sunEl - 0.65) * s.sunRadius / 16)
      }
      if (aspect < 1) {
        scratch.projected.copy(cam.position).sub(scratch.moonTarget).normalize()
        scratch.targetProjected.copy(cam.up).addScaledVector(scratch.projected, -cam.up.dot(scratch.projected)).normalize()
        const offset = cam.position.distanceTo(scratch.moonTarget) * Math.tan(21 * Math.PI / 180) * (s.moonFocus ? 0.10 : 0.23)
        cam.position.addScaledVector(scratch.targetProjected, -offset)
        scratch.moonTarget.addScaledVector(scratch.targetProjected, -offset)
      }
      cam.lookAt(scratch.moonTarget)
    }
    if (cam.fov !== 42 || cam.near !== 0.06 || cam.far !== 3000000) {
      cam.fov = 42; cam.near = 0.06; cam.far = 3000000
      cam.updateProjectionMatrix()
    }
  })

  return (
    <>
      <Stars count={3200} spread={1000000} />
      <group ref={lunarTrack} visible={false}>
        <primitive object={lunarLine} />
      </group>
      <mesh ref={moonMesh} geometry={moonGeometry} material={moonMaterial}>
        {view === 'moon' && !scene.current.moonFocus && <Html center zIndexRange={[3, 0]}><span className="eso-body-label" data-experience-overlay="true">{tx('月球')}</span></Html>}
      </mesh>
      <group ref={earthGroup}>
        {((view === 'moon' && !scene.current.moonFocus) || (view === 'sun' && !scene.current.sunFocus)) && <Html center zIndexRange={[3, 0]}><span className="eso-body-label" data-experience-overlay="true">{tx('地球')}</span></Html>}
        <mesh ref={earthMesh}>
          <sphereGeometry args={[1, 128, 96]} />
          <primitive object={earthMat} attach="material" />
        </mesh>
        <mesh visible={layers.clouds} scale={1.003}>
          <sphereGeometry args={[1, 96, 64]} />
          <primitive object={cloudMat} attach="material" />
        </mesh>
        <mesh visible={layers.atmosphere} scale={1.012}>
          <sphereGeometry args={[1, 96, 64]} />
          <primitive object={atmoMat} attach="material" />
        </mesh>
        <GlobeOverlays radius={1} layers={layers} />
        {view === 'earth' && scene.current.topic && scene.current.topic !== 'explore' && <EarthTeachingOverlays topic={scene.current.topic} epoch={scene.current.epoch} lat={picked.lat} lon={picked.lon} labels={scene.current.labels !== false} projection={!!scene.current.projection} compare={PLACES.find(p => p.id === scene.current.compareId)} />}
        {layers.markers && <Marker lat={picked.lat} lon={picked.lon} radius={1.019} color="#f6d59c" reducedMotion={reducedMotion} emphasis />}
        {layers.markers && (!scene.current.topic || scene.current.topic === 'explore') && PLACES.filter((place) => place.name !== picked.name).map((place) => (
          <Marker key={place.id} lat={place.lat} lon={place.lon} radius={1.014} color="#9ecbff" reducedMotion={reducedMotion} />
        ))}
      </group>
      <group ref={axisReference} visible={false}>
        <OrbitAxisReference />
      </group>
      <group ref={solarSystem} visible={false}>
        <SunGlobe />
        {view === 'sun' && !scene.current.sunFocus && <Html center zIndexRange={[3, 0]}><span className="eso-body-label" data-experience-overlay="true">{tx('太阳')}</span></Html>}
        <lineLoop geometry={orbitGeo}>
          <lineBasicMaterial color="#a9b3c2" transparent opacity={0.35} />
        </lineLoop>
      </group>
    </>
  )
}
