import './styles/Aurora.css'

import { useEffect, useMemo, useRef, useState, type ComponentRef, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Pause, Play, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

// ---------------------------------------------------------------------------
// (shader note)
// (shader note)
// (shader note)
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180
const R_EARTH_KM = 6371
/* shader note */
const GEOMAG_POLE_LAT = 80.7
const GEOMAG_POLE_LON = -72.7
/* shader note */
const ALT_GAIN = 4
const OBLIQUITY = 23.4
/* shader note */
const SPIN_PHASE = -120
/* shader note */
const A_SHOT = -0.86 * Math.PI

/* shader note */
const KP_BOUNDARY = [66.5, 64.5, 62.4, 60.4, 58.3, 56.3, 54.2, 52.2, 50.1, 48.1]

const SUN_DIR = new THREE.Vector3(-1, 0.1, 0.2).normalize()
const AXIS_Y = new THREE.Vector3(0, 1, 0)

/* shader note */
const EARTH_QUAT = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -OBLIQUITY * DEG)
  .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Y, SPIN_PHASE * DEG))

/* shader note */
function geoLocal(lat: number, lon: number) {
  return new THREE.Vector3(Math.cos(lat * DEG), Math.sin(lat * DEG), 0).applyAxisAngle(AXIS_Y, lon * DEG)
}

/* shader note */
function geoWorld(lat: number, lon: number) {
  return geoLocal(lat, lon).applyQuaternion(EARTH_QUAT)
}

/* shader note */
const MAG_AXIS = geoWorld(GEOMAG_POLE_LAT, GEOMAG_POLE_LON)
/* shader note */
const MAG_NOON = SUN_DIR.clone().addScaledVector(MAG_AXIS, -SUN_DIR.dot(MAG_AXIS)).normalize()
const MAG_DUSK = new THREE.Vector3().crossVectors(MAG_AXIS, MAG_NOON).normalize()
/* shader note */
const SUN_PERP_A = MAG_DUSK.clone()
const SUN_PERP_B = new THREE.Vector3().crossVectors(SUN_DIR, SUN_PERP_A).normalize()

/* shader note */
function squash(r: number) {
  return r <= 1 ? r : 1 + Math.pow(r - 1, 0.45) * 0.33
}

/* shader note */
function auroraRadius(km: number) {
  return 1 + (km / R_EARTH_KM) * ALT_GAIN
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

function boundaryLatitude(kp: number) {
  const k = clamp(kp, 0, 9)
  const i = Math.min(8, Math.floor(k))
  return THREE.MathUtils.lerp(KP_BOUNDARY[i], KP_BOUNDARY[i + 1], k - i)
}

/* shader note */
function ovalColat(kp: number) {
  return 90 - boundaryLatitude(kp) - 2.2
}

/* shader note */
function geomagLatitude(lat: number, lon: number) {
  const p = GEOMAG_POLE_LAT * DEG
  const pl = GEOMAG_POLE_LON * DEG
  const l = lat * DEG
  const s = Math.sin(l) * Math.sin(p) + Math.cos(l) * Math.cos(p) * Math.cos(lon * DEG - pl)
  return Math.asin(clamp(s, -1, 1)) / DEG
}

/* shader note */
function magPoint(colat: number, a: number, r: number, out = new THREE.Vector3()) {
  const sc = Math.sin(colat)
  return out
    .copy(MAG_AXIS)
    .multiplyScalar(Math.cos(colat))
    .addScaledVector(MAG_NOON, sc * Math.cos(a))
    .addScaledVector(MAG_DUSK, sc * Math.sin(a))
    .multiplyScalar(r)
}

/* shader note */
const OVAL_NIGHT_OFFSET = 3.4

function ovalColatAt(kp: number, a: number) {
  return (ovalColat(kp) + OVAL_NIGHT_OFFSET * (0.5 - 0.5 * Math.cos(a))) * DEG
}

function ovalPoint(kp: number, a: number, km: number, hemi = 1, out = new THREE.Vector3()) {
  const colat = ovalColatAt(kp, a)
  magPoint(hemi > 0 ? colat : Math.PI - colat, a, auroraRadius(km), out)
  return out
}

const CITIES = [
  { name: '特罗姆瑟', lat: 69.6, lon: 18.9 },
  { name: '漠河', lat: 53.5, lon: 122.4 },
  { name: '北京', lat: 39.9, lon: 116.4 },
].map((c) => ({ ...c, magLat: geomagLatitude(c.lat, c.lon), dir: geoWorld(c.lat, c.lon) }))

type Visibility = 'overhead' | 'horizon' | 'camera' | 'none'

/* shader note */
function visibilityFor(magLat: number, kp: number): Visibility {
  const boundary = boundaryLatitude(kp)
  if (magLat >= boundary) return 'overhead'
  if (magLat >= boundary - 8) return 'horizon'
  if (kp >= 6 && magLat >= boundary - 20) return 'camera'
  return 'none'
}

const VISIBILITY_LABEL: Record<Visibility, string> = {
  overhead: '头顶',
  horizon: '北方地平线',
  camera: '相机可拍到红光',
  none: '看不到',
}

function stormLabel(kp: number) {
  if (kp < 3) return '平静'
  if (kp < 5) return '活跃'
  if (kp < 6) return '小磁暴 G1'
  if (kp < 7) return '中等磁暴 G2'
  if (kp < 8) return '强磁暴 G3'
  if (kp < 9) return '严重磁暴 G4'
  return '极端磁暴 G5'
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

type Reveal = {
  wind: number
  mpause: number
  field: number
  precip: number
  ruler: number
  bands: number
  cities: number
  gain: number
}

type LabelEntry = { el: HTMLDivElement | null; group: keyof Reveal; pos: THREE.Vector3 }

type Sim = {
  time: number
  speed: number
  playing: boolean
  kp: number
  kpTarget: number
  reveal: Reveal
  target: Reveal
  activity: Uint8Array
  activityTex: THREE.DataTexture
  ignite: number
  poseHold: boolean
  labels: Map<string, LabelEntry>
}

const REVEAL_FREE: Reveal = {
  wind: 0.85,
  mpause: 0.3,
  field: 0,
  precip: 1,
  ruler: 0.42,
  bands: 0,
  cities: 1,
  gain: 1,
}

const BEATS: Record<number, Partial<Reveal>> = {
  1: { wind: 1, mpause: 0, field: 0, precip: 0, ruler: 0, bands: 0, cities: 0, gain: 0.85 },
  2: { wind: 1, mpause: 1, field: 1, precip: 0.18, ruler: 0, bands: 0, cities: 0, gain: 0.5 },
  3: { wind: 0.7, mpause: 0.4, field: 1, precip: 1, ruler: 1, bands: 0, cities: 0, gain: 1.05 },
  4: { wind: 0.28, mpause: 0.1, field: 0.16, precip: 1, ruler: 1, bands: 1, cities: 0, gain: 1.15 },
  5: { wind: 0.5, mpause: 0.15, field: 0.4, precip: 1, ruler: 0.3, bands: 0, cities: 1, gain: 1.1 },
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v / 0.875;
  }
`

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const EARTH_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(normal);
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const EARTH_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec3 vWorld;
  ${NOISE_GLSL}
  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    float sun = dot(n, uSun);
    float lit = smoothstep(-0.14, 0.30, sun);
    float m = fbm(n * 2.6);
    float m2 = fbm(n * 7.5 + 4.0);
    vec3 night = mix(vec3(0.008, 0.014, 0.030), vec3(0.020, 0.034, 0.056), m);
    vec3 day = mix(vec3(0.10, 0.235, 0.45), vec3(0.20, 0.33, 0.52), m);
    day += vec3(0.26, 0.30, 0.33) * smoothstep(0.52, 1.0, m2);
    vec3 col = mix(night, day, lit);
    float fres = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.2);
    col += vec3(0.20, 0.48, 0.92) * fres * (0.08 + 0.95 * lit);
    // warm terminator rim
    float term = exp(-pow((sun - 0.03) / 0.12, 2.0));
    col += vec3(0.45, 0.30, 0.18) * term * fres * 0.85;
    gl_FragColor = vec4(col, 1.0);
  }
`

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(normal);
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.4);
    float sun = smoothstep(-0.30, 0.42, dot(n, uSun));
    vec3 col = mix(vec3(0.07, 0.19, 0.42), vec3(0.46, 0.70, 1.0), sun);
    col = mix(col, vec3(1.0, 0.66, 0.42), smoothstep(0.35, 0.0, abs(dot(n, uSun) - 0.05)) * 0.45);
    float a = rim * (0.055 + 0.62 * sun);
    gl_FragColor = vec4(col * a * 1.5, 1.0);
  }
`

function EarthGlobe() {
  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: SUN_DIR } },
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
      }),
    [],
  )
  const atmoMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: SUN_DIR } },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  )
  const graticule = useMemo(() => {
    const points: Array<number> = []
    const push = (v: THREE.Vector3) => points.push(v.x, v.y, v.z)
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let i = 0; i < 120; i += 1) {
        push(geoWorld(lat, i * 3).multiplyScalar(1.002))
        push(geoWorld(lat, (i + 1) * 3).multiplyScalar(1.002))
      }
    }
    for (let lon = 0; lon < 360; lon += 30) {
      for (let i = 0; i < 60; i += 1) {
        push(geoWorld(-90 + i * 3, lon).multiplyScalar(1.002))
        push(geoWorld(-90 + (i + 1) * 3, lon).multiplyScalar(1.002))
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [])

  useEffect(
    () => () => {
      earthMaterial.dispose()
      atmoMaterial.dispose()
      graticule.dispose()
    },
    [earthMaterial, atmoMaterial, graticule],
  )

  return (
    <group>
      <mesh material={earthMaterial}>
        <sphereGeometry args={[1, 96, 72]} />
      </mesh>
      <mesh material={atmoMaterial}>
        <sphereGeometry args={[1.055, 64, 48]} />
      </mesh>
      <lineSegments geometry={graticule}>
        <lineBasicMaterial color="#9fd8ff" transparent opacity={0.085} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const MPAUSE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vNose;
  attribute float aNose;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorld = position;
    vNose = aNose;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const MPAUSE_FRAG = /* glsl */ `
  uniform vec3 uCamera;
  uniform float uTime;
  uniform float uReveal;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vNose;
  ${NOISE_GLSL}
  void main() {
    if (vNose > uReveal) discard;
    vec3 view = normalize(uCamera - vWorld);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), view)), 5.0);
    float ripple = fbm(vec3(vWorld.yz * 2.2, vNose * 3.0 - uTime * 0.4));
    float front = smoothstep(0.14, 0.0, uReveal - vNose);
    float taper = pow(max(0.0, 1.0 - vNose), 1.6);
    float body = rim * (0.30 + 0.70 * ripple) * taper;
    vec3 col = mix(vec3(0.30, 0.66, 1.0), vec3(0.62, 0.92, 0.98), ripple);
    float a = (body * 0.20 + front * taper * 0.26) * smoothstep(0.0, 0.06, uReveal);
    gl_FragColor = vec4(col * a, 1.0);
  }
`

function magnetopauseRadius(kp: number) {
  return 10.4 - 3.6 * (kp / 9)
}

function Magnetopause({ sim }: { sim: { current: Sim } }) {
  const camera = useThree((s) => s.camera)
  const { geometry, material } = useMemo(() => {
    const thetaSegments = 44
    const phiSegments = 72
    const positions: Array<number> = []
    const noses: Array<number> = []
    const index: Array<number> = []
    for (let i = 0; i <= thetaSegments; i += 1) {
      const t = i / thetaSegments
      const theta = t * 2.35
      for (let j = 0; j <= phiSegments; j += 1) {
        const phi = (j / phiSegments) * Math.PI * 2
        // (shader note)
        const r = Math.pow(2 / (1 + Math.cos(theta)), 0.62)
        const dir = SUN_DIR.clone()
          .multiplyScalar(Math.cos(theta))
          .addScaledVector(SUN_PERP_A, Math.sin(theta) * Math.cos(phi))
          .addScaledVector(SUN_PERP_B, Math.sin(theta) * Math.sin(phi))
        positions.push(dir.x * r, dir.y * r, dir.z * r)
        noses.push(t)
      }
    }
    const row = phiSegments + 1
    for (let i = 0; i < thetaSegments; i += 1) {
      for (let j = 0; j < phiSegments; j += 1) {
        const a = i * row + j
        index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aNose', new THREE.Float32BufferAttribute(noses, 1))
    geometry.setIndex(index)
    geometry.computeVertexNormals()
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uCamera: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uReveal: { value: 0 },
      },
      vertexShader: MPAUSE_VERT,
      fragmentShader: MPAUSE_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    return { geometry, material }
  }, [])

  const mesh = useRef<THREE.Mesh>(null)
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const s = sim.current
    material.uniforms.uCamera.value.copy(camera.position)
    material.uniforms.uTime.value = s.time
    material.uniforms.uReveal.value = s.reveal.mpause
    if (mesh.current) {
      const r = squash(magnetopauseRadius(s.kp))
      mesh.current.scale.setScalar(r)
      mesh.current.visible = s.reveal.mpause > 0.02
    }
  })

  return <mesh ref={mesh} geometry={geometry} material={material} />
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const FIELD_VERT = /* glsl */ `
  attribute float aProgress;
  attribute float aLine;
  varying float vProgress;
  varying float vLine;
  void main() {
    vProgress = aProgress;
    vLine = aLine;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FIELD_FRAG = /* glsl */ `
  uniform float uReveal;
  uniform float uTime;
  uniform float uOpacity;
  varying float vProgress;
  varying float vLine;
  void main() {
    float reveal = clamp(uReveal * 1.35 - vLine * 0.22, 0.0, 1.0);
    if (vProgress > reveal) discard;
    float edge = smoothstep(0.10, 0.0, reveal - vProgress);
    float pulse = 0.55 + 0.45 * sin(vProgress * 26.0 - uTime * 1.4 + vLine * 5.0);
    vec3 col = mix(vec3(0.42, 0.68, 1.0), vec3(0.75, 0.94, 1.0), edge);
    float a = (0.16 + 0.24 * pulse + edge * 0.75) * uOpacity;
    gl_FragColor = vec4(col * a, a);
  }
`

/* shader note */
function distortField(p: THREE.Vector3, rmp: number) {
  const r = p.length()
  if (r < 1.02) return p
  const sunFrac = -p.dot(SUN_DIR) / r // (shader note)
  const night = Math.max(0, sunFrac)
  const day = Math.max(0, -sunFrac)
  const stretch = 1 + 0.55 * night * Math.min(1, (r - 1) / 3)
  p.addScaledVector(SUN_DIR, -(r - 1) * 0.42 * night * night)
  p.multiplyScalar(stretch)
  const limit = rmp * (0.98 - 0.26 * day)
  const nr = p.length()
  if (nr > limit) p.multiplyScalar(limit / nr)
  return p
}

function FieldLines({ sim }: { sim: { current: Sim } }) {
  const { geometry, material } = useMemo(() => {
    const shells = [1.6, 2.3, 3.4, 5.2, 8.0]
    const azimuths = 10
    const samples = 74
    const positions: Array<number> = []
    const progress: Array<number> = []
    const lineIds: Array<number> = []
    const rmp = squash(magnetopauseRadius(3))
    let lineIndex = 0
    const point = new THREE.Vector3()
    for (const L of shells) {
      for (let j = 0; j < azimuths; j += 1) {
        const a = (j / azimuths) * Math.PI * 2
        const lineId = lineIndex / (shells.length * azimuths)
        lineIndex += 1
        const maxLat = Math.acos(Math.sqrt(1 / L))
        const prev = new THREE.Vector3()
        for (let i = 0; i <= samples; i += 1) {
          const t = i / samples
          const lat = -maxLat + t * 2 * maxLat
          const r = L * Math.cos(lat) * Math.cos(lat)
          point.copy(magPoint(Math.PI / 2 - lat, a, squash(r)))
          distortField(point, rmp)
          if (i > 0) {
            positions.push(prev.x, prev.y, prev.z, point.x, point.y, point.z)
            const p0 = (i - 1) / samples
            progress.push(Math.abs(p0 - 0.5) * 2, Math.abs(t - 0.5) * 2)
            lineIds.push(lineId, lineId)
          }
          prev.copy(point)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progress, 1))
    geometry.setAttribute('aLine', new THREE.Float32BufferAttribute(lineIds, 1))
    const material = new THREE.ShaderMaterial({
      uniforms: { uReveal: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return { geometry, material }
  }, [])

  const lines = useRef<THREE.LineSegments>(null)
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const s = sim.current
    material.uniforms.uReveal.value = Math.min(1, s.reveal.field * 1.05)
    material.uniforms.uTime.value = s.time
    material.uniforms.uOpacity.value = Math.min(1, s.reveal.field * 1.6)
    if (lines.current) lines.current.visible = s.reveal.field > 0.02
  })

  return <lineSegments ref={lines} geometry={geometry} material={material} />
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const WIND_COUNT = 2100
const WIND_STREAMS = 46
const WIND_SAMPLES = 132

function buildWindStreams() {
  const a = magnetopauseRadius(3)
  const paths: Array<Float32Array> = []
  const point = new THREE.Vector3()
  for (let s = 0; s < WIND_STREAMS; s += 1) {
    const ring = Math.floor(s / 8)
    const b = a * (0.28 + ring * 0.42 + ((s % 8) / 8) * 0.12)
    const phi = ((s * 2.399963) % (Math.PI * 2)) + ring * 0.4
    const arr = new Float32Array(WIND_SAMPLES * 3)
    // (shader note)
    let x = -30
    let y = b
    for (let i = 0; i < WIND_SAMPLES; i += 1) {
      const r = Math.hypot(x, y)
      const cosT = x / r
      const sinT = y / r
      const k = Math.pow(a / Math.max(r, a * 1.001), 3)
      const vr = cosT * (1 - k)
      let vt = -sinT * (1 + k * 0.5)
      if (x > 0) vt *= 0.4
      let vx = vr * cosT - vt * sinT
      let vy = vr * sinT + vt * cosT
      const speed = Math.hypot(vx, vy) || 1
      vx /= speed
      vy /= speed
      const ds = 0.42 + Math.max(0, 1 - r / (a * 2.6)) * 0.1
      x += vx * ds * 1.6
      y += vy * ds * 1.6
      const rr = Math.hypot(x, y)
      const sq = squash(rr) / rr
      // (shader note)
      point
        .copy(SUN_DIR)
        .multiplyScalar(-x * sq)
        .addScaledVector(SUN_PERP_A, y * sq * Math.cos(phi))
        .addScaledVector(SUN_PERP_B, y * sq * Math.sin(phi))
      arr[i * 3] = point.x
      arr[i * 3 + 1] = point.y
      arr[i * 3 + 2] = point.z
    }
    paths.push(arr)
  }
  return paths
}

const STREAK_VERT = /* glsl */ `
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const STREAK_FRAG = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor * vAlpha, 1.0);
  }
`

function SolarWind({ sim, reduced }: { sim: { current: Sim }; reduced: boolean }) {
  const streams = useMemo(buildWindStreams, [])
  const count = reduced ? Math.floor(WIND_COUNT * 0.55) : WIND_COUNT

  const { geometry, material, meta } = useMemo(() => {
    const positions = new Float32Array(count * 6)
    const alphas = new Float32Array(count * 2)
    const colors = new Float32Array(count * 6)
    const stream = new Int32Array(count)
    const phase = new Float32Array(count)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      stream[i] = i % streams.length
      phase[i] = Math.random()
      speed[i] = 0.048 + Math.random() * 0.022
      const warm = 0.7 + Math.random() * 0.3
      for (let v = 0; v < 2; v += 1) {
        colors[(i * 2 + v) * 3] = 1
        colors[(i * 2 + v) * 3 + 1] = 0.82 * warm + 0.14
        colors[(i * 2 + v) * 3 + 2] = 0.55 * warm + 0.26
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return { geometry, material, meta: { positions, alphas, stream, phase, speed } }
  }, [count, streams])

  const lineGeometry = useMemo(() => {
    const positions: Array<number> = []
    const alphas: Array<number> = []
    for (let s = 0; s < streams.length; s += 2) {
      const path = streams[s]
      for (let i = 0; i < WIND_SAMPLES - 1; i += 1) {
        positions.push(path[i * 3], path[i * 3 + 1], path[i * 3 + 2])
        positions.push(path[(i + 1) * 3], path[(i + 1) * 3 + 1], path[(i + 1) * 3 + 2])
        const fade = Math.min(1, (i / WIND_SAMPLES) * 3) * (1 - i / WIND_SAMPLES)
        alphas.push(fade, fade)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1))
    return geometry
  }, [streams])

  const lineMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.5 } },
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float a = vAlpha * uOpacity * 0.34;
            gl_FragColor = vec4(vec3(0.62, 0.70, 0.92) * a, a);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  const points = useRef<THREE.LineSegments>(null)
  const lines = useRef<THREE.LineSegments>(null)

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
    },
    [geometry, material, lineGeometry, lineMaterial],
  )

  useFrame((_, delta) => {
    const s = sim.current
    const dt = Math.min(delta, 0.05) * s.speed * (s.playing ? 1 : 0)
    const flux = 0.55 + 0.75 * (s.kp / 9)
    const gust = 0.5 + 0.5 * Math.sin(s.time * 0.55)
    const { positions, alphas, stream, phase, speed } = meta
    const tail = 0.015
    for (let i = 0; i < count; i += 1) {
      phase[i] += dt * speed[i] * (0.7 + flux * 0.8)
      if (phase[i] > 1) phase[i] -= 1
      const path = streams[stream[i]]
      const head = phase[i]
      const back = Math.max(0, head - tail)
      const sample = (u: number, offset: number) => {
        const f = u * (WIND_SAMPLES - 1)
        const i0 = Math.floor(f)
        const frac = f - i0
        const i1 = Math.min(WIND_SAMPLES - 1, i0 + 1)
        positions[offset] = path[i0 * 3] + (path[i1 * 3] - path[i0 * 3]) * frac
        positions[offset + 1] = path[i0 * 3 + 1] + (path[i1 * 3 + 1] - path[i0 * 3 + 1]) * frac
        positions[offset + 2] = path[i0 * 3 + 2] + (path[i1 * 3 + 2] - path[i0 * 3 + 2]) * frac
      }
      sample(head, i * 6)
      sample(back, i * 6 + 3)
      // (shader note)
      const band = Math.sin((head * 3.0 - s.time * 0.17) * Math.PI * 2)
      const pulse = 0.24 + 0.76 * Math.pow(Math.max(0, band), 1.7)
      const envelope = Math.min(1, head * 8) * (1 - Math.pow(head, 4))
      const a = pulse * envelope * (0.45 + gust * 0.55) * flux * s.reveal.wind
      alphas[i * 2] = a
      alphas[i * 2 + 1] = a * 0.12
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aAlpha.needsUpdate = true
    lineMaterial.uniforms.uOpacity.value = s.reveal.wind
    if (points.current) points.current.visible = s.reveal.wind > 0.02
    if (lines.current) lines.current.visible = s.reveal.wind > 0.02
  })

  return (
    <group>
      <lineSegments ref={lines} geometry={lineGeometry} material={lineMaterial} frustumCulled={false} />
      <lineSegments ref={points} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const ENTRY_PATHS = 34
const ENTRY_SAMPLES = 88
const PRECIP_COUNT = 820
const ACTIVITY_BINS = 128

type EntryPath = { data: Float32Array; a: number; hemi: number }

function buildEntryPaths(kp: number): Array<EntryPath> {
  const paths: Array<EntryPath> = []
  const point = new THREE.Vector3()
  for (let i = 0; i < ENTRY_PATHS; i += 1) {
    const hemi = i % 2 === 0 ? 1 : -1
    const slot = Math.floor(i / 2)
    // (shader note)
    const a = -Math.PI + ((slot + 0.5) / (ENTRY_PATHS / 2)) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
    const colatOval = ovalColatAt(kp, a)
    const latOval = Math.PI / 2 - colatOval
    const L = 1 / (Math.cos(latOval) * Math.cos(latOval))
    const rMid = Math.min(L * 0.98, 4.2)
    const latMid = Math.acos(Math.sqrt(Math.min(1, rMid / L)))
    const data = new Float32Array(ENTRY_SAMPLES * 3)
    const captureCount = Math.floor(ENTRY_SAMPLES * 0.42)
    const aCusp = 0.42 * (Math.random() - 0.5) + 0.1
    for (let j = 0; j < ENTRY_SAMPLES; j += 1) {
      if (j < captureCount) {
        // (shader note)
        const t = j / captureCount
        const e = t * t * (3 - 2 * t)
        const r = THREE.MathUtils.lerp(squash(magnetopauseRadius(kp) * 1.04), squash(rMid), Math.pow(t, 0.72))
        const colat = THREE.MathUtils.lerp(15 * DEG, Math.PI / 2 - latMid, e)
        let dA = a - aCusp
        while (dA > Math.PI) dA -= Math.PI * 2
        while (dA < -Math.PI) dA += Math.PI * 2
        const az = aCusp + dA * e
        magPoint(hemi > 0 ? colat : Math.PI - colat, az, r, point)
      } else {
        // (shader note)
        const t = (j - captureCount) / (ENTRY_SAMPLES - 1 - captureCount)
        const lat = THREE.MathUtils.lerp(latMid, latOval, t * t * (3 - 2 * t))
        const r = Math.max(auroraRadius(100), squash(L * Math.cos(lat) * Math.cos(lat)))
        magPoint(hemi > 0 ? Math.PI / 2 - lat : Math.PI / 2 + lat, a, r, point)
      }
      data[j * 3] = point.x
      data[j * 3 + 1] = point.y
      data[j * 3 + 2] = point.z
    }
    paths.push({ data, a, hemi })
  }
  return paths
}

function Precipitation({ sim, reduced }: { sim: { current: Sim }; reduced: boolean }) {
  const count = reduced ? Math.floor(PRECIP_COUNT * 0.6) : PRECIP_COUNT
  const pathsRef = useRef<Array<EntryPath>>([])
  const kpBuiltRef = useRef(-1)

  const { geometry, material, meta } = useMemo(() => {
    const positions = new Float32Array(count * 6)
    const alphas = new Float32Array(count * 2)
    const colors = new Float32Array(count * 6)
    const path = new Int32Array(count)
    const phase = new Float32Array(count)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      path[i] = i % ENTRY_PATHS
      phase[i] = Math.random()
      speed[i] = 0.14 + Math.random() * 0.1
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return { geometry, material, meta: { positions, alphas, colors, path, phase, speed } }
  }, [count])

  const points = useRef<THREE.LineSegments>(null)
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    const s = sim.current
    if (Math.abs(s.kp - kpBuiltRef.current) > 0.35 || pathsRef.current.length === 0) {
      kpBuiltRef.current = s.kp
      pathsRef.current = buildEntryPaths(s.kp)
    }
    const paths = pathsRef.current
    const dt = Math.min(delta, 0.05) * s.speed * (s.playing ? 1 : 0)
    const flux = 0.35 + 0.9 * (s.kp / 9)
    const { positions, alphas, colors, path, phase, speed } = meta
    const activity = s.activity
    for (let i = 0; i < count; i += 1) {
      const entry = paths[path[i] % paths.length]
      phase[i] += dt * speed[i] * (0.6 + flux)
      if (phase[i] >= 1) {
        phase[i] -= 1
        // (shader note)
        const row = entry.hemi > 0 ? 0 : 1
        const bin = Math.round(((((entry.a / (Math.PI * 2)) % 1) + 1) % 1) * ACTIVITY_BINS) % ACTIVITY_BINS
        for (let k = -2; k <= 2; k += 1) {
          const b = (bin + k + ACTIVITY_BINS) % ACTIVITY_BINS
          const idx = (row * ACTIVITY_BINS + b) * 4
          const add = (k === 0 ? 90 : 42 / Math.abs(k)) * (0.5 + flux * 0.6)
          activity[idx] = Math.min(255, activity[idx] + add)
        }
      }
      const f = phase[i] * (ENTRY_SAMPLES - 1)
      const i0 = Math.floor(f)
      const frac = f - i0
      const i1 = Math.min(ENTRY_SAMPLES - 1, i0 + 1)
      const i2 = Math.max(0, i0 - 2)
      const d = entry.data
      positions[i * 6] = d[i0 * 3] + (d[i1 * 3] - d[i0 * 3]) * frac
      positions[i * 6 + 1] = d[i0 * 3 + 1] + (d[i1 * 3 + 1] - d[i0 * 3 + 1]) * frac
      positions[i * 6 + 2] = d[i0 * 3 + 2] + (d[i1 * 3 + 2] - d[i0 * 3 + 2]) * frac
      positions[i * 6 + 3] = d[i2 * 3]
      positions[i * 6 + 4] = d[i2 * 3 + 1]
      positions[i * 6 + 5] = d[i2 * 3 + 2]
      // (shader note)
      const dive = Math.pow(phase[i], 2.2)
      const a = (0.16 + dive * 1.05) * s.reveal.precip * (0.5 + flux * 0.6)
      alphas[i * 2] = a
      alphas[i * 2 + 1] = a * 0.15
      for (let v = 0; v < 2; v += 1) {
        colors[(i * 2 + v) * 3] = 0.72 - dive * 0.42
        colors[(i * 2 + v) * 3 + 1] = 0.86 + dive * 0.14
        colors[(i * 2 + v) * 3 + 2] = 1 - dive * 0.35
      }
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aAlpha.needsUpdate = true
    geometry.attributes.aColor.needsUpdate = true
    if (points.current) points.current.visible = s.reveal.precip > 0.02
  })

  return <lineSegments ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const CURTAIN_VERT = /* glsl */ `
  uniform vec3 uAxis;
  uniform vec3 uNoon;
  uniform vec3 uDusk;
  uniform float uColat;
  uniform float uNight;
  uniform float uBand;
  uniform float uFold;
  uniform float uTime;
  uniform float uPhase;
  uniform float uHemi;
  uniform float uRBottom;
  uniform float uRTop;
  varying float vA;
  varying float vV;
  varying float vFade;
  ${NOISE_GLSL}
  void main() {
    float a = uv.x * 6.2831853 + uPhase;
    float v = uv.y;
    vec3 dir = uNoon * cos(a) + uDusk * sin(a);
    float colat = uColat + uBand + uNight * (0.5 - 0.5 * cos(a));
    vec3 np = vec3(cos(a) * 1.05, sin(a) * 1.05, uTime * 0.055 + uPhase);
    float fold = fbm(np) - 0.5;
    float fold2 = fbm(np * 2.7 + 13.0) - 0.5;
    colat += uFold * (fold * 1.7 + fold2 * 0.8 * (0.3 + v));
    float signedColat = uHemi > 0.0 ? colat : 3.14159265 - colat;
    vec3 rhat = uAxis * cos(signedColat) + dir * sin(signedColat);
    vec3 lhat = uAxis * sin(signedColat) - dir * cos(signedColat);
    vec3 up = normalize(2.0 * cos(signedColat) * rhat - sin(signedColat) * lhat);
    vec3 pos = rhat * uRBottom + up * ((uRTop - uRBottom) * v);
    vFade = smoothstep(0.12, 0.52, fbm(vec3(cos(a) * 0.62, sin(a) * 0.62, uTime * 0.035 + uPhase * 2.0)));
    vA = a;
    vV = v;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const CURTAIN_FRAG = /* glsl */ `
  uniform sampler2D uActivity;
  uniform float uTime;
  uniform float uGain;
  uniform float uKp;
  uniform float uHemiRow;
  uniform float uHBottom;
  uniform float uHTop;
  uniform float uIntensity;
  varying float vA;
  varying float vV;
  varying float vFade;
  ${NOISE_GLSL}
  void main() {
    float h = mix(uHBottom, uHTop, vV);
    vec3 rp = vec3(cos(vA) * 12.5, sin(vA) * 12.5, uTime * 0.12);
    float ray = fbm(rp);
    ray = pow(clamp(ray * 1.42, 0.0, 1.0), 2.0);
    float fine = 0.5 + 0.5 * vnoise(vec3(cos(vA) * 33.0, sin(vA) * 33.0, uTime * 0.24));
    float flick = 0.86 + 0.14 * sin(vV * 20.0 - uTime * 2.1 + vA * 6.0);
    float act = texture2D(uActivity, vec2(vA / 6.2831853, uHemiRow)).r;

    float wGreen = exp(-pow((h - 128.0) / 66.0, 2.0));
    float wRed = smoothstep(195.0, 305.0, h) * (0.45 + 0.75 * uKp);
    float wViolet = smoothstep(114.0, 93.0, h) * (0.35 + 1.05 * uKp);

    vec3 green = vec3(0.24, 1.0, 0.52);
    vec3 red = vec3(1.0, 0.14, 0.26);
    vec3 violet = vec3(0.88, 0.24, 0.92);
    vec3 col = green * wGreen + red * wRed * 0.9 + violet * wViolet;

    float shape = smoothstep(0.0, 0.03, vV) * smoothstep(1.0, 0.5, vV);
    float body = wGreen * 0.95 + wRed * 0.42 + wViolet * 0.7;
    float intensity = body * ray * fine * flick * vFade * shape * (0.22 + act * 1.55) * uGain * uIntensity;
    if (intensity < 0.002) discard;
    gl_FragColor = vec4(col * min(intensity, 0.62) * 1.55, 1.0);
  }
`

type BandSpec = { hemi: number; band: number; phase: number; intensity: number; fold: number; night: number }

const BANDS: Array<BandSpec> = [
  { hemi: 1, band: -1.7, phase: 0, intensity: 0.55, fold: 0.026, night: 2.4 },
  { hemi: 1, band: 0, phase: 1.7, intensity: 1, fold: 0.030, night: 3.4 },
  { hemi: 1, band: 2.2, phase: 4.1, intensity: 0.4, fold: 0.036, night: 4.6 },
  { hemi: -1, band: -1.1, phase: 2.4, intensity: 0.62, fold: 0.028, night: 2.8 },
  { hemi: -1, band: 1.7, phase: 5.3, intensity: 0.36, fold: 0.034, night: 4.0 },
]

const H_BOTTOM_KM = 92
const H_TOP_KM = 380

function AuroraCurtains({ sim, reduced }: { sim: { current: Sim }; reduced: boolean }) {
  const segU = reduced ? 180 : 300
  const segV = reduced ? 14 : 20
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, segU, segV), [segU, segV])
  const materials = useMemo(
    () =>
      BANDS.map((spec) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uAxis: { value: MAG_AXIS },
            uNoon: { value: MAG_NOON },
            uDusk: { value: MAG_DUSK },
            uColat: { value: ovalColat(3) * DEG },
            uNight: { value: spec.night * DEG },
            uBand: { value: spec.band * DEG },
            uFold: { value: spec.fold },
            uTime: { value: 0 },
            uPhase: { value: spec.phase },
            uHemi: { value: spec.hemi },
            uRBottom: { value: auroraRadius(H_BOTTOM_KM) },
            uRTop: { value: auroraRadius(H_TOP_KM) },
            uActivity: { value: sim.current.activityTex },
            uGain: { value: 1 },
            uKp: { value: 0.33 },
            uHemiRow: { value: spec.hemi > 0 ? 0.25 : 0.75 },
            uHBottom: { value: H_BOTTOM_KM },
            uHTop: { value: H_TOP_KM },
            uIntensity: { value: spec.intensity },
          },
          vertexShader: CURTAIN_VERT,
          fragmentShader: CURTAIN_FRAG,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      materials.forEach((m) => m.dispose())
    },
    [geometry, materials],
  )

  useFrame(() => {
    const s = sim.current
    const colat = ovalColat(s.kp) * DEG
    for (const material of materials) {
      material.uniforms.uTime.value = s.time
      material.uniforms.uColat.value = colat
      material.uniforms.uGain.value = s.reveal.gain
      material.uniforms.uKp.value = s.kp / 9
    }
  })

  return (
    <group>
      {BANDS.map((spec, index) => (
        <mesh key={`${spec.hemi}-${spec.band}`} geometry={geometry} material={materials[index]} frustumCulled={false} />
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const RULER_TICKS = [100, 200, 300]
const RULER_A = A_SHOT + 0.16

function AltitudeRuler({ sim }: { sim: { current: Sim } }) {
  const { geometry, material, buffer } = useMemo(() => {
    const buffer = new Float32Array((1 + RULER_TICKS.length) * 6)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(buffer, 3))
    const material = new THREE.LineBasicMaterial({
      color: '#cfe6ff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    return { geometry, material, buffer }
  }, [])
  const lines = useRef<THREE.LineSegments>(null)

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const s = sim.current
    material.opacity = 0.5 * s.reveal.ruler
    if (lines.current) lines.current.visible = s.reveal.ruler > 0.02
    if (s.reveal.ruler <= 0.02) return
    const colat = ovalColatAt(s.kp, RULER_A) + 4.6 * DEG
    const base = magPoint(colat, RULER_A, 1)
    const horizontal = MAG_NOON.clone().multiplyScalar(Math.cos(RULER_A)).addScaledVector(MAG_DUSK, Math.sin(RULER_A))
    const north = MAG_AXIS.clone().multiplyScalar(Math.sin(colat)).addScaledVector(horizontal, -Math.cos(colat))
    const at = (km: number, out = new THREE.Vector3()) => out.copy(base).multiplyScalar(auroraRadius(km))
    let cursor = 0
    const push = (v: THREE.Vector3) => {
      buffer[cursor] = v.x
      buffer[cursor + 1] = v.y
      buffer[cursor + 2] = v.z
      cursor += 3
    }
    const scratch = new THREE.Vector3()
    push(at(0, scratch))
    push(at(H_TOP_KM, scratch))
    for (const km of RULER_TICKS) {
      push(at(km, scratch))
      push(scratch.addScaledVector(north, km === 100 ? 0.055 : 0.032))
    }
    geometry.attributes.position.needsUpdate = true
    // (shader note)
    for (const km of RULER_TICKS) {
      const label = s.labels.get(`alt${km}`)
      if (label) label.pos.copy(at(km, scratch)).addScaledVector(north, km === 100 ? 0.085 : 0.055)
    }
    const note = s.labels.get('rulerNote')
    if (note) note.pos.copy(at(H_TOP_KM, scratch)).addScaledVector(north, 0.04)
    const bandAnchor = (id: string, km: number) => {
      const label = s.labels.get(id)
      if (label) {
        label.pos
          .copy(magPoint(ovalColatAt(s.kp, RULER_A - 0.05), RULER_A - 0.05, auroraRadius(km)))
          .addScaledVector(north, -0.03)
      }
    }
    bandAnchor('bandViolet', 96)
    bandAnchor('bandGreen', 140)
    bandAnchor('bandRed', 300)
  })

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

function CityMarkers({ sim }: { sim: { current: Sim } }) {
  useFrame(() => {
    const s = sim.current
    CITIES.forEach((city, index) => {
      const label = s.labels.get(`city${index}`)
      if (label) label.pos.copy(city.dir).multiplyScalar(1.03 + index * 0.04)
    })
  })
  return null
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,247,220,0.55)')
  grad.addColorStop(0.52, 'rgba(255,225,160,0.12)')
  grad.addColorStop(1, 'rgba(255,210,130,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function SunGlow() {
  const texture = useMemo(createGlowTexture, [])
  useEffect(() => () => texture.dispose(), [texture])
  const position = useMemo(() => SUN_DIR.clone().multiplyScalar(34), [])
  return (
    <group position={position}>
      <sprite scale={[3.6, 3.6, 1]}>
        <spriteMaterial map={texture} color="#fff6e0" transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.95} />
      </sprite>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial map={texture} color="#ffd9a0" transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.34} />
      </sprite>
    </group>
  )
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

export type ViewId = 'wide' | 'day' | 'cusp' | 'curtain' | 'ground' | 'polar'

type OrbitRef = { current: ComponentRef<typeof OrbitControls> | null }

function poseFor(view: ViewId, kp: number) {
  const eye = new THREE.Vector3()
  const focus = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const colat = ovalColatAt(kp, A_SHOT)
  switch (view) {
    case 'wide':
      eye.set(1.9, 2.3, 6.2)
      focus.copy(SUN_DIR).multiplyScalar(0.9)
      break
    case 'day':
      // (shader note)
      eye.copy(SUN_DIR).multiplyScalar(3.2).addScaledVector(SUN_PERP_A, 6.6).addScaledVector(MAG_AXIS, 2.6)
      focus.copy(SUN_DIR).multiplyScalar(0.85)
      break
    case 'cusp':
      // (shader note)
      magPoint(colat + 42 * DEG, A_SHOT + 0.5, 1.42, eye)
      magPoint(colat, A_SHOT + 0.02, auroraRadius(170), focus)
      up.copy(focus).normalize()
      break
    case 'curtain': {
      // (shader note)
      magPoint(colat + 17 * DEG, A_SHOT + 0.30, auroraRadius(255), eye)
      magPoint(colat + 0.5 * DEG, A_SHOT - 0.12, auroraRadius(150), focus)
      up.copy(focus).normalize()
      break
    }
    case 'ground': {
      magPoint(colat + 6 * DEG, A_SHOT + 0.02, 1.004, eye)
      magPoint(colat + 0.5 * DEG, A_SHOT + 0.02, auroraRadius(180), focus)
      up.copy(eye).normalize()
      break
    }
    case 'polar':
    default:
      eye.copy(MAG_AXIS).multiplyScalar(3.85).addScaledVector(MAG_NOON, 0.85).addScaledVector(MAG_DUSK, 0.45)
      focus.copy(MAG_AXIS).multiplyScalar(0.12)
      up.copy(MAG_NOON).multiplyScalar(-1)
      break
  }
  return { eye, focus, up }
}

const scratchProject = new THREE.Vector3()
const scratchDir = new THREE.Vector3()
const scratchClosest = new THREE.Vector3()

function SceneDriver({
  sim,
  view,
  reduced,
  controlsRef,
}: {
  sim: { current: Sim }
  view: ViewId
  reduced: boolean
  controlsRef: OrbitRef
}) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const viewRef = useRef(view)
  const settleRef = useRef(0)

  useEffect(() => {
    viewRef.current = view
    sim.current.poseHold = false
    settleRef.current = 0
  }, [view, sim])

  useFrame((_, delta) => {
    const s = sim.current
    const dt = Math.min(delta, 0.05)
    s.time += dt * s.speed * (s.playing ? 1 : 0)

    // (shader note)
    const kpK = 1 - Math.exp(-dt * 1.5)
    s.kp += (s.kpTarget - s.kp) * kpK
    // (shader note)
    const revealK = 1 - Math.exp(-dt * (reduced ? 6 : 2.2))
    const keys = Object.keys(s.target) as Array<keyof Reveal>
    for (const key of keys) s.reveal[key] += (s.target[key] - s.reveal[key]) * revealK

    // (shader note)
    const activity = s.activity
    const decay = Math.exp(-dt * Math.max(0.35, s.speed) * 0.85)
    if (s.ignite > 0) {
      const before = s.ignite
      s.ignite = Math.max(0, s.ignite - dt * 0.85)
      const from = 1 - before
      const to = 1 - s.ignite
      for (let row = 0; row < 2; row += 1) {
        for (let b = 0; b < ACTIVITY_BINS; b += 1) {
          const f = b / ACTIVITY_BINS
          if (f >= from && f < to) activity[(row * ACTIVITY_BINS + b) * 4] = 240
        }
      }
    }
    for (let i = 0; i < ACTIVITY_BINS * 2; i += 1) {
      const idx = i * 4
      activity[idx] = Math.max(24, activity[idx] * decay)
    }
    s.activityTex.needsUpdate = true

    // (shader note)
    const controls = controlsRef.current
    if (!s.poseHold) {
      const pose = poseFor(viewRef.current, s.kp)
      if (reduced && settleRef.current === 0) {
        camera.position.copy(pose.eye)
        camera.up.copy(pose.up)
        if (controls) controls.target.copy(pose.focus)
        settleRef.current = 1
      } else {
        const k = 1 - Math.exp(-dt * 1.55)
        camera.position.lerp(pose.eye, k)
        camera.up.lerp(pose.up, k).normalize()
        if (controls) controls.target.lerp(pose.focus, k)
      }
      if (controls) controls.update()
    }

    // (shader note)
    const canvas = gl.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    s.labels.forEach((label) => {
      const el = label.el
      if (!el) return
      const groupOpacity = s.reveal[label.group]
      if (groupOpacity < 0.05) {
        el.style.opacity = '0'
        return
      }
      scratchProject.copy(label.pos)
      const distance = camera.position.distanceTo(scratchProject)
      scratchProject.project(camera)
      if (scratchProject.z > 1) {
        el.style.opacity = '0'
        return
      }
      // (shader note)
      scratchDir.copy(label.pos).sub(camera.position)
      const len = scratchDir.length()
      scratchDir.normalize()
      const t = -camera.position.dot(scratchDir)
      const closest =
        t > 0 && t < len ? scratchClosest.copy(camera.position).addScaledVector(scratchDir, t).length() : 99
      const x = (scratchProject.x * 0.5 + 0.5) * width
      const y = (-scratchProject.y * 0.5 + 0.5) * height
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      // (shader note)
      const near =
        label.group === 'cities'
          ? clamp(2.6 - distance * 0.18, 0.35, 1)
          : clamp((3.1 - distance) / 0.9, 0, 1)
      el.style.opacity = String(closest < 0.995 ? 0 : groupOpacity * near)
    })
  })

  return null
}

// ---------------------------------------------------------------------------
// (shader note)
// ---------------------------------------------------------------------------

const WORLD_ID = 'aurora'

const VIEW_CHIPS: Array<{ id: ViewId; label: string }> = [
  { id: 'polar', label: '极地' },
  { id: 'wide', label: '侧视' },
  { id: 'ground', label: '地面' },
]

function createSim(): Sim {
  const activity = new Uint8Array(ACTIVITY_BINS * 2 * 4)
  activity.fill(26)
  const activityTex = new THREE.DataTexture(activity, ACTIVITY_BINS, 2, THREE.RGBAFormat, THREE.UnsignedByteType)
  activityTex.wrapS = THREE.RepeatWrapping
  activityTex.wrapT = THREE.ClampToEdgeWrapping
  activityTex.minFilter = THREE.LinearFilter
  activityTex.magFilter = THREE.LinearFilter
  activityTex.generateMipmaps = false
  activityTex.needsUpdate = true
  return {
    time: 0,
    speed: 1,
    playing: true,
    kp: 3,
    kpTarget: 3,
    reveal: { ...REVEAL_FREE, gain: 0.15, precip: 0, wind: 0.15, ruler: 0, cities: 0 },
    target: { ...REVEAL_FREE },
    activity,
    activityTex,
    ignite: 0,
    poseHold: false,
    labels: new Map(),
  }
}

export function Aurora({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reduced = false
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)

  const [kp, setKp] = useState(3)
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(true)
  const [fieldOn, setFieldOn] = useState(false)
  const [view, setView] = useState<ViewId>(storyMode ? 'wide' : 'polar')
  const [beat, setBeat] = useState(storyMode ? 1 : 0)
  const [hud, setHud] = useState({ kp: 3, boundary: boundaryLatitude(3) })

  const simRef = useRef<Sim | null>(null)
  if (!simRef.current) simRef.current = createSim()
  const sim = simRef as { current: Sim }

  // (shader note)
  const labelDefs = useMemo(
    () => [
      { id: 'alt100', group: 'ruler' as keyof Reveal, text: '100 km', note: '绿色氧原子层' },
      { id: 'alt200', group: 'ruler' as keyof Reveal, text: '200 km', note: '' },
      { id: 'alt300', group: 'ruler' as keyof Reveal, text: '300 km', note: '' },
      { id: 'rulerNote', group: 'ruler' as keyof Reveal, text: '高度 ×4 放大', note: '' },
      { id: 'bandViolet', group: 'bands' as keyof Reveal, text: '紫 · 氮分子', note: '约 90 km' },
      { id: 'bandGreen', group: 'bands' as keyof Reveal, text: '绿 · 氧原子', note: '约 100–150 km' },
      { id: 'bandRed', group: 'bands' as keyof Reveal, text: '红 · 更高的氧', note: '200 km 以上' },
      ...CITIES.map((city, index) => ({
        id: `city${index}`,
        group: 'cities' as keyof Reveal,
        text: city.name,
        note: '',
        cityIndex: index,
      })),
    ] as Array<{ id: string; group: keyof Reveal; text: string; note: string; cityIndex?: number }>,
    [],
  )

  useEffect(() => {
    const map = sim.current.labels
    for (const def of labelDefs) {
      if (!map.has(def.id)) map.set(def.id, { el: null, group: def.group, pos: new THREE.Vector3() })
    }
  }, [labelDefs])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // (shader note)
  useEffect(() => {
    sim.current.kpTarget = kp
  }, [kp])
  useEffect(() => {
    sim.current.speed = reduced ? speed * 0.5 : speed
  }, [speed, reduced])
  useEffect(() => {
    sim.current.playing = playing
  }, [playing])

  useEffect(() => {
    const base = beat > 0 ? { ...REVEAL_FREE, ...BEATS[beat] } : { ...REVEAL_FREE, field: fieldOn ? 1 : 0 }
    sim.current.target = base
    if (beat === 3) sim.current.ignite = 1
  }, [beat, fieldOn])

  // (shader note)
  useEffect(() => {
    if (beat !== 5) return
    setKp(3)
    let raf = 0
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 7600)
      setKp(3 + 6 * t * t * (3 - 2 * t))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [beat])

  // (shader note)
  useEffect(() => {
    const id = window.setInterval(() => {
      const value = sim.current.kp
      setHud({ kp: value, boundary: boundaryLatitude(value) })
    }, 180)
    return () => window.clearInterval(id)
  }, [])

  const applyView = (next: ViewId) => {
    setView(next)
    sim.current.poseHold = false
  }

  const guideSteps: Array<GuideStep> = useMemo(
    () => [
      {
        title: '一阵阵太阳风，正吹过来',
        body: '太阳每秒抛出上百万吨带电粒子，以 300–800 km/s 扑向地球。画面里的暖色粒子流就是它——两极那两道淡绿，是它留下的痕迹。',
        action: () => {
          setBeat(1)
          setKp(3)
          applyView('wide')
        },
        durationMs: 6200,
      },
      {
        title: '磁层像船头波，把粒子挡开',
        body: '地球的偶极磁场撑起一个空腔。太阳风撞上来，绝大多数粒子顺着这层「船头波」滑向身后的磁尾——真实的磁层顶在 10 个地球半径外，这里压缩了距离。',
        action: () => {
          setBeat(2)
          setKp(3)
          applyView('day')
        },
        durationMs: 7000,
      },
      {
        title: '只有极区是漏斗',
        body: '磁力线在两极收拢成漏斗。灌进来的粒子沿着磁力线俯冲，一路加速，撞在 100 km 高的氧原子上——被撞中的地方，光帘就亮起来。',
        action: () => {
          setBeat(3)
          setKp(4)
          applyView('cusp')
        },
        durationMs: 7400,
      },
      {
        title: '同一片光帘，三种颜色',
        body: '颜色是高度写出来的：100–150 km 的氧原子发绿光，200 km 以上更稀薄的氧发红光，下缘那道紫色来自氮分子。光帘的褶皱和竖直射线，是沿磁力线排列的粒子束。',
        action: () => {
          setBeat(4)
          setKp(4.5)
          applyView('curtain')
        },
        durationMs: 7200,
      },
      {
        title: '太阳风一大，光环压向低纬',
        body: 'Kp 每涨一级，极光椭圆就向赤道推进约 2°。它围着地磁极，不是地理极：北京地理纬度 40°，地磁纬度只有 31°——只有 Kp 9 的极端磁暴，相机才可能在北方地平线上拍到那抹红。',
        action: () => {
          setBeat(5)
          applyView('polar')
        },
        durationMs: 9200,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const boundary = Math.round(hud.boundary)
  const kpText = hud.kp.toFixed(1)

  return (
    <div
      className={`oss-experience aurora-experience${storyMode ? ' is-story' : ' is-free'}`}
      onPointerDown={() => controls.registerInteraction()}
    >
      <Canvas
        className="aurora-canvas"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [1.9, 2.3, 6.2], fov: 38, near: 0.02, far: 400 }}
      >
        <color attach="background" args={['#01020a']} />
        <Stars radius={120} depth={60} count={2400} factor={3.4} saturation={0} fade speed={reduced ? 0 : 0.2} />
        <SunGlow />
        <EarthGlobe />
        <FieldLines sim={sim} />
        <Magnetopause sim={sim} />
        <SolarWind sim={sim} reduced={reduced} />
        <Precipitation sim={sim} reduced={reduced} />
        <AuroraCurtains sim={sim} reduced={reduced} />
        <AltitudeRuler sim={sim} />
        <CityMarkers sim={sim} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={0.08}
          maxDistance={14}
          rotateSpeed={0.5}
          onStart={() => {
            sim.current.poseHold = true
          }}
        />
        <SceneDriver sim={sim} view={view} reduced={reduced} controlsRef={controlsRef} />
      </Canvas>

      <div className="aurora-labels" aria-hidden="true" data-experience-overlay="true">
        {labelDefs.map((def) => (
          <div
            key={def.id}
            className={`aurora-label is-${def.group}${
              def.cityIndex === undefined ? '' : ` is-${visibilityFor(CITIES[def.cityIndex].magLat, hud.kp)}`
            }`}
            ref={(el) => {
              const entry = sim.current.labels.get(def.id)
              if (entry) entry.el = el
            }}
          >
            <b>{tx(def.text)}</b>
            {def.note && <span>{tx(def.note)}</span>}
          </div>
        ))}
      </div>

      {!storyMode && (
        <header className="aurora-plaque" data-experience-overlay="true">
          <h1>{tx('极光')}</h1>
          <p>{tx('太阳风撞上磁层，粒子沿磁力线灌进两极。')}</p>
        </header>
      )}

      {!storyMode && (
        <div className="aurora-readout" data-experience-overlay="true" aria-live="polite">
          <div className="aurora-readout-row">
            <small>{tx('太阳风强度')}</small>
            <strong>Kp {tx(kpText)}</strong>
            <span>{tx(stormLabel(hud.kp))}</span>
          </div>
          <div className="aurora-readout-row">
            <small>{tx('极光椭圆下缘')}</small>
            <strong>
              {tx('地磁纬度')} {tx(boundary)}°
            </strong>
          </div>
          <ul className="aurora-cities">
            {CITIES.map((city) => {
              const state = visibilityFor(city.magLat, hud.kp)
              return (
                <li key={city.name} className={`is-${state}`}>
                  <b>{tx(city.name)}</b>
                  <span>{tx(VISIBILITY_LABEL[state])}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="aurora-freebar"
          mainClassName="aurora-freebar-main"
          ariaLabel={tx('极光控制台')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <div className="aurora-tray">
              <div className="aurora-chip-rail experience-freebar-chips" role="group" aria-label={tx('视角与显示')}>
                {VIEW_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={view === chip.id ? 'is-active' : undefined}
                    aria-pressed={view === chip.id}
                    onClick={() => {
                      controls.registerInteraction()
                      applyView(chip.id)
                    }}
                  >
                    {tx(chip.label)}
                  </button>
                ))}
                <button
                  type="button"
                  className={fieldOn ? 'is-active' : undefined}
                  aria-pressed={fieldOn}
                  onClick={() => {
                    controls.registerInteraction()
                    setFieldOn((v) => !v)
                  }}
                >
                  {tx('磁力线')}
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    setBeat(1)
                    enterStory()
                    replayGuide(WORLD_ID)
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              <div className="experience-freebar-field aurora-speed">
                <div>
                  <span>{tx('流速')}</span>
                  <strong>×{tx(speed.toFixed(1))}</strong>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3}
                  step={0.1}
                  value={speed}
                  style={{ '--fill': `${((speed - 0.2) / 2.8) * 100}%` } as CSSProperties}
                  aria-label={tx('时间流速')}
                  onChange={(event) => {
                    controls.registerInteraction()
                    setSpeed(Number(event.target.value))
                  }}
                />
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            onClick={() => {
              controls.registerInteraction()
              setPlaying((v) => !v)
            }}
            aria-label={tx(playing ? '暂停' : '播放')}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>

          <div className="experience-freebar-field aurora-kp">
            <div>
              <span>{tx('Kp')}</span>
              <strong>{tx(kp.toFixed(1))}</strong>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.1}
              value={kp}
              style={{ '--fill': `${(kp / 9) * 100}%` } as CSSProperties}
              aria-label={tx('太阳风强度 Kp 指数')}
              onChange={(event) => {
                controls.registerInteraction()
                setKp(Number(event.target.value))
              }}
            />
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          {position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial'},
          {position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation'},
          {position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'monumental'},
          {position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'wide', treatment: 'caption'},
          {position: 'top-center', mobilePosition: 'bottom-center', motion: 'scale', tone: 'light', width: 'wide', treatment: 'editorial'},
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={() => {
          setBeat(0)
          applyView('polar')
          enterFree()
        }}
      />
      {!storyMode && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{ type: 'scrub', target: '.aurora-kp input', label: tx('拧大太阳风') }}
        />
      )}
    </div>
  )
}
