import '~/components/experiences/styles/OrbitalExperiences.css'
import './styles/SolarSystem.css'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  ArrowCounterClockwise,
  ArrowsOutLineHorizontal,
  CircleDashed,
  Compass,
  Crosshair,
  DotsNine,
  FastForward,
  FilmStrip,
  Pause,
  Planet,
  Play,
  Rewind,
} from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  EARTH_CLOUDS_TEXTURE_URL,
  EARTH_DAY_TEXTURE_URL,
  EARTH_NIGHT_TEXTURE_URL,
  MOON_TEXTURE_URL,
  SATURN_RING_TEXTURE_URL,
  SUN_TEXTURE_URL,
  planetTextureUrl,
  useLazyTexture,
} from '~/components/experiences/solar-system-textures'
import { useExperienceI18n } from '~/i18n/experience'

type SolarBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

const SIM_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0)
const AU_SCALE = 55
const SUN_RADIUS = 10

// Björn Jónsson 土星环模型的物理跨度（见 public/assets/solar-system/SOURCES.md）
const RING_STRIP_INNER_KM = 74500
const RING_STRIP_OUTER_KM = 140385

const SPEED_PRESETS = [
  { label: '实时', daysPerSec: 1 / 86400 },
  { label: '1 分/秒', daysPerSec: 1 / 1440 },
  { label: '1 时/秒', daysPerSec: 1 / 24 },
  { label: '1 天/秒', daysPerSec: 1 },
  { label: '1 周/秒', daysPerSec: 7 },
  { label: '1 月/秒', daysPerSec: 30.44 },
  { label: '1 年/秒', daysPerSec: 365.25 },
]

const SPEED_LOG_MIN = Math.log10(1 / 86400)
const SPEED_LOG_MAX = Math.log10(400)

function speedToSlider(daysPerSec: number) {
  return ((Math.log10(Math.max(daysPerSec, 1e-6)) - SPEED_LOG_MIN) / (SPEED_LOG_MAX - SPEED_LOG_MIN)) * 1000
}

function sliderToSpeed(value: number) {
  return Math.pow(10, SPEED_LOG_MIN + (value / 1000) * (SPEED_LOG_MAX - SPEED_LOG_MIN))
}

type PlanetData = {
  id: string
  name: string
  type: string
  elements: { a: number; e: number; i: number; L: number; lp: number; node: number }
  radiusKm: number
  rotationHours: number
  obliquity: number
  color: string
  texture: string
  description: string
  tempC: string
  dayLength: string
  yearLength: string
  moonCount: string
  moons?: { name: string; radiusKm: number; orbitFactor: number; periodDays: number; color: string }[]
  rings?: { inner: number; outer: number; opacity: number; color: string }
}

const PLANETS: PlanetData[] = [
  { id: 'mercury', name: '水星', type: '岩石行星', elements: { a: 0.387099, e: 0.205636, i: 7.004979, L: 252.250324, lp: 77.457796, node: 48.330766 }, radiusKm: 2439.7, rotationHours: 1407.6, obliquity: 0.034, color: '#9c8e82', texture: 'mercury', description: '最小且离太阳最近的行星。表面布满陨石坑，昼夜温差超过 600°C。', tempC: '167°C 平均', dayLength: '4,222.6 小时', yearLength: '88.0 天', moonCount: '0' },
  { id: 'venus', name: '金星', type: '岩石行星', elements: { a: 0.723336, e: 0.006777, i: 3.394676, L: 181.9791, lp: 131.602467, node: 76.679843 }, radiusKm: 6051.8, rotationHours: -5832.5, obliquity: 177.4, color: '#d9b47c', texture: 'venus', description: '被 CO₂ 和硫酸云包裹，是最热的行星（464°C）。它自转方向相反，一天比一年还长。', tempC: '464°C 平均', dayLength: '2,802.0 小时', yearLength: '224.7 天', moonCount: '0' },
  { id: 'earth', name: '地球', type: '岩石行星', elements: { a: 1.000003, e: 0.016711, i: -0.000015, L: 100.464572, lp: 102.937682, node: 0 }, radiusKm: 6371, rotationHours: 23.934, obliquity: 23.44, color: '#4d9de0', texture: 'earth', moons: [{ name: '月球', radiusKm: 1737.4, orbitFactor: 8, periodDays: 27.32, color: '#b8b8b8' }], description: '目前已知唯一存在生命的行星。液态水覆盖 71% 表面，磁场与富氧大气提供保护。', tempC: '15°C 平均', dayLength: '24.0 小时', yearLength: '365.25 天', moonCount: '1' },
  { id: 'mars', name: '火星', type: '岩石行星', elements: { a: 1.52371, e: 0.093394, i: 1.849691, L: -4.553432, lp: -23.94363, node: 49.559539 }, radiusKm: 3389.5, rotationHours: 24.623, obliquity: 25.19, color: '#c1683f', texture: 'mars', description: '红色星球，因氧化铁尘埃而锈红。拥有奥林帕斯山——高度近珠峰三倍的火山。', tempC: '-65°C 平均', dayLength: '24.7 小时', yearLength: '687.0 天', moonCount: '2' },
  { id: 'jupiter', name: '木星', type: '气态巨行星', elements: { a: 5.202887, e: 0.048386, i: 1.304397, L: 34.396441, lp: 14.72848, node: 100.473909 }, radiusKm: 69911, rotationHours: 9.925, obliquity: 3.13, color: '#d0a97c', texture: 'jupiter', moons: [{ name: '木卫一', radiusKm: 1821.6, orbitFactor: 2.1, periodDays: 1.77, color: '#d9c26e' }, { name: '木卫二', radiusKm: 1560.8, orbitFactor: 2.7, periodDays: 3.55, color: '#c9b8a6' }, { name: '木卫三', radiusKm: 2634.1, orbitFactor: 3.5, periodDays: 7.15, color: '#9a8f83' }, { name: '木卫四', radiusKm: 2410.3, orbitFactor: 4.6, periodDays: 16.69, color: '#7a7168' }], description: '质量超过其他行星总和。大红斑是一场比地球还宽、持续数百年的风暴。', tempC: '-110°C 云顶', dayLength: '9.9 小时', yearLength: '11.9 年', moonCount: '95' },
  { id: 'saturn', name: '土星', type: '气态巨行星', elements: { a: 9.536676, e: 0.053862, i: 2.485992, L: 49.954244, lp: 92.598878, node: 113.662424 }, radiusKm: 58232, rotationHours: 10.656, obliquity: 26.73, color: '#e0c795', texture: 'saturn', rings: { inner: 1.28, outer: 2.41, opacity: 0.95, color: '#d8c49a' }, description: '光环宽达 28 万公里却仅约 10 米厚，由无数近乎纯净的水冰碎块组成。', tempC: '-140°C 平均', dayLength: '10.7 小时', yearLength: '29.4 年', moonCount: '146' },
  { id: 'uranus', name: '天王星', type: '冰巨星', elements: { a: 19.189165, e: 0.047257, i: 0.772638, L: 313.238105, lp: 170.954276, node: 74.016925 }, radiusKm: 25362, rotationHours: -17.24, obliquity: 97.77, color: '#8fd1d4', texture: 'uranus', rings: { inner: 1.6, outer: 2.0, opacity: 0.35, color: '#a8c8cc' }, description: '远古撞击使它侧躺自转（倾角 98°）。甲烷雾霾赋予它宁静的青色光泽。', tempC: '-195°C 平均', dayLength: '17.2 小时', yearLength: '83.7 年', moonCount: '28' },
  { id: 'neptune', name: '海王星', type: '冰巨星', elements: { a: 30.069923, e: 0.00859, i: 1.770043, L: -55.12003, lp: 44.964762, node: 131.784226 }, radiusKm: 24622, rotationHours: 16.11, obliquity: 28.32, color: '#3f6fd1', texture: 'neptune', description: '最远的行星，先由数学计算预测再被望远镜发现。超音速风速达 2100 km/h。', tempC: '-200°C 平均', dayLength: '16.1 小时', yearLength: '164.8 年', moonCount: '16' },
]

function displayRadius(radiusKm: number) {
  const t = radiusKm / 6371
  return Math.max(0.62, 1.28 * Math.pow(t, 0.55))
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

function solveKepler(M: number, e: number) {
  let E = M < 0.8 ? M : Math.PI
  for (let i = 0; i < 8; i++) {
    const f = E - e * Math.sin(E) - M
    const fp = 1 - e * Math.cos(E)
    E -= f / fp
  }
  return E
}

function orbitalPeriodDays(elements: PlanetData['elements']) {
  return Math.pow(elements.a, 1.5) * 365.25
}

function orbitalPosition(elements: PlanetData['elements'], simDays: number): [number, number, number] {
  const { a, e, i, L, lp, node } = elements
  const inc = degToRad(i)
  const Lr = degToRad(L)
  const lpRad = degToRad(lp)
  const nodeRad = degToRad(node)
  const M = (((Lr - lpRad) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) + (2 * Math.PI / orbitalPeriodDays(elements)) * simDays
  const E = solveKepler(M, e)
  const x = a * (Math.cos(E) - e)
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const arg = lpRad - nodeRad
  const cosArg = Math.cos(arg)
  const sinArg = Math.sin(arg)
  const cosNode = Math.cos(nodeRad)
  const sinNode = Math.sin(nodeRad)
  const cosInc = Math.cos(inc)
  const sinInc = Math.sin(inc)
  const X = (cosNode * cosArg - sinNode * sinArg * cosInc) * x + (-cosNode * sinArg - sinNode * cosArg * cosInc) * y
  const Y = sinArg * sinInc * x + cosArg * sinInc * y
  const Z = (sinNode * cosArg + cosNode * sinArg * cosInc) * x + (-sinNode * sinArg + cosNode * cosArg * cosInc) * y
  return [X, Y, Z]
}

function orbitPathPoints(elements: PlanetData['elements'], segments = 420): Float32Array {
  const pts = new Float32Array(segments * 3)
  const { a, e, i, node, lp } = elements
  const inc = degToRad(i)
  const nodeRad = degToRad(node)
  const arg = degToRad(lp - node)
  const cosArg = Math.cos(arg)
  const sinArg = Math.sin(arg)
  const cosNode = Math.cos(nodeRad)
  const sinNode = Math.sin(nodeRad)
  const cosInc = Math.cos(inc)
  const sinInc = Math.sin(inc)
  for (let s = 0; s < segments; s++) {
    const M = (s / segments) * 2 * Math.PI
    const x = a * (Math.cos(M) - e)
    const y = a * Math.sqrt(1 - e * e) * Math.sin(M)
    pts[s * 3] = (cosNode * cosArg - sinNode * sinArg * cosInc) * x + (-cosNode * sinArg - sinNode * cosArg * cosInc) * y
    pts[s * 3 + 1] = sinArg * sinInc * x + cosArg * sinInc * y
    pts[s * 3 + 2] = (sinNode * cosArg + cosNode * sinArg * cosInc) * x + (-sinNode * sinArg + cosNode * cosArg * cosInc) * y
  }
  return pts
}

function seededRandom(seed: number) {
  let t = seed >>> 0
  return () => {
    t |= 0
    t = (t + 1831565813) | 0
    let n = Math.imul(t ^ (t >>> 15), 1 | t)
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

class ValueNoise {
  private perm: Uint8Array
  constructor(seed = 1337, size = 256) {
    const rand = seededRandom(seed)
    const p = new Uint8Array(size)
    for (let i = 0; i < size; i++) p[i] = i
    for (let i = size - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.perm = new Uint8Array(size * 2)
    for (let i = 0; i < size * 2; i++) this.perm[i] = p[i & (size - 1)]
  }
  private lattice(ix: number, iy: number) {
    return this.perm[(this.perm[ix & 255] + iy) & 255] / 255
  }
  noise(x: number, y: number) {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const a = this.lattice(ix, iy)
    const b = this.lattice(ix + 1, iy)
    const c = this.lattice(ix, iy + 1)
    const d = this.lattice(ix + 1, iy + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx }
}

function canvasTexture(canvas: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  return tex
}

function paintTexture(w: number, h: number, paint: (u: number, v: number) => [number, number, number, number?]) {
  const { canvas, ctx } = makeCanvas(w, h)
  const img = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 255] = paint(x / w, y / h)
      const i = (y * w + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = a
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvasTexture(canvas)
}

/** 天王星细环 / 土星环贴图加载完成前的占位条带（径向 u 剖面） */
function createRingStripTexture(color: string, isSaturn: boolean) {
  const rgb = hexToRgb(color)
  const noise = new ValueNoise(42)
  return paintTexture(512, 16, (u) => {
    let alpha: number
    if (isSaturn) {
      const a = 0.22 * smoothstep(0, 0.08, u) * (1 - smoothstep(0.16, 0.22, u))
      const b = 0.92 * smoothstep(0.2, 0.28, u) * (1 - smoothstep(0.58, 0.62, u))
      const c = u >= 0.62 && u < 0.7 ? 0.06 : 0
      const d = 0.55 * smoothstep(0.7, 0.75, u) * (1 - smoothstep(0.92, 1, u))
      const e = u > 0.85 && u < 0.875 ? 0.5 : 1
      alpha = Math.max(a, b, c, d * e)
      alpha *= 0.88 + 0.12 * noise.noise(u * 220, 0.5)
    } else {
      alpha = 0.35 * Math.exp(-Math.pow((u - 0.55) * 4, 2))
    }
    const brightness = 0.9 + 0.1 * noise.noise(u * 140, 3.7)
    return [rgb[0] * brightness, rgb[1] * brightness, rgb[2] * brightness, alpha * 255]
  })
}

function createStarSpriteTexture(color: string) {
  const { canvas, ctx } = makeCanvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, color)
  g.addColorStop(0.25, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return canvasTexture(canvas, false)
}

const WHITE = new THREE.Color('#ffffff')

function Sun({ registerBody }: { registerBody: (id: string, obj: THREE.Object3D | null) => void }) {
  const sunTex = useLazyTexture(SUN_TEXTURE_URL)
  const fadeRef = useRef(0)
  const rootRef = useRef<THREE.Group>(null)

  // 注册到 bodiesRef，让侧栏「太阳」可以聚焦（此前缺失，点击只高亮不聚焦）
  useEffect(() => {
    registerBody('sun', rootRef.current)
    return () => registerBody('sun', null)
  }, [registerBody])

  // 自发光表面：真实 SDO 全日面图 + fbm 噪声缓慢流动 + 边缘变暗（不受场景光照影响）
  const surfaceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: null }, uMapMix: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uMap;
        uniform float uMapMix;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec2 vUv;

        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float vnoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash3(i);
          float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
          return mix(
            mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
            mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
            f.z);
        }
        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * vnoise(p);
            p *= 2.03;
            a *= 0.5;
          }
          return v;
        }
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vView);
          float t = uTime * 0.045;
          float flow = fbm(n * 2.6 + vec3(t, -t * 0.6, t * 0.35));
          float granule = fbm(n * 7.5 + vec3(-t * 1.7, t * 1.2, t * 0.5));
          vec3 tex = texture2D(uMap, vUv).rgb * vec3(1.06, 0.94, 0.82);
          vec3 base = mix(vec3(1.0, 0.58, 0.16), tex, uMapMix);
          float limb = 0.52 + 0.48 * pow(clamp(dot(n, v), 0.0, 1.0), 0.7);
          float bright = 0.8 + flow * 0.4 + granule * 0.16;
          vec3 col = base * bright * limb;
          col += vec3(1.0, 0.72, 0.35) * pow(flow, 3.0) * 0.5;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }, [])
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffae45') } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float f = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
          float pulse = 0.92 + 0.08 * sin(uTime * 0.8);
          gl_FragColor = vec4(uColor * f * 1.6 * pulse, f * 0.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }, [])
  const sprite1 = useMemo(() => createStarSpriteTexture('rgba(255,196,110,0.85)'), [])
  const sprite2 = useMemo(() => createStarSpriteTexture('rgba(255,240,210,0.9)'), [])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    surfaceMaterial.uniforms.uTime.value = t
    glowMaterial.uniforms.uTime.value = t
    if (sunTex && fadeRef.current < 1) {
      if (!surfaceMaterial.uniforms.uMap.value) surfaceMaterial.uniforms.uMap.value = sunTex
      fadeRef.current = Math.min(1, fadeRef.current + delta / 1.2)
      const f = fadeRef.current
      surfaceMaterial.uniforms.uMapMix.value = f * f * (3 - 2 * f)
    }
  })

  return (
    <group ref={rootRef}>
      <mesh name="sun">
        <sphereGeometry args={[SUN_RADIUS, 64, 48]} />
        <primitive object={surfaceMaterial} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS * 1.18, 64, 48]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      <sprite scale={[SUN_RADIUS * 3.9, SUN_RADIUS * 3.9, 1]}>
        <spriteMaterial map={sprite1} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <sprite scale={[SUN_RADIUS * 2.2, SUN_RADIUS * 2.2, 1]}>
        <spriteMaterial map={sprite2} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <pointLight intensity={1.6} distance={0} decay={0} color="#fff4e0" />
    </group>
  )
}

function OrbitLine({ elements, color, highlighted }: { elements: PlanetData['elements']; color: string; highlighted: boolean }) {
  const geometry = useMemo(() => {
    const pts = orbitPathPoints(elements, 420)
    for (let i = 0; i < pts.length; i++) pts[i] *= AU_SCALE
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3))
  }, [elements])

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25)} transparent opacity={highlighted ? 0.65 : 0.32} />
    </lineLoop>
  )
}

/**
 * 行星环：径向条带贴图按真实半径映射（C 环半透明、B 环不透明、卡西尼缝、A 环、细 F 环），
 * 相机处于背光面时整体变暗（环的透射光效果）。
 */
function PlanetRings({ radius, radiusKm, rings, planetId }: { radius: number; radiusKm: number; rings: NonNullable<PlanetData['rings']>; planetId: string }) {
  const isSaturn = planetId === 'saturn'
  const stripTex = useLazyTexture(isSaturn ? SATURN_RING_TEXTURE_URL : null)
  const fallbackTex = useMemo(() => createRingStripTexture(rings.color, isSaturn), [rings.color, isSaturn])

  const innerKm = isSaturn ? RING_STRIP_INNER_KM : rings.inner * radiusKm
  const outerKm = isSaturn ? RING_STRIP_OUTER_KM : rings.outer * radiusKm

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRingTex: { value: fallbackTex },
        uStripInnerKm: { value: innerKm },
        uStripOuterKm: { value: outerKm },
        uPlanetRadiusKm: { value: radiusKm },
        uDisplayRadius: { value: radius },
        uOpacity: { value: rings.opacity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexShader: `
        varying vec2 vRingPos;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        void main() {
          vRingPos = position.xy;
          vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uRingTex;
        uniform float uStripInnerKm;
        uniform float uStripOuterKm;
        uniform float uPlanetRadiusKm;
        uniform float uDisplayRadius;
        uniform float uOpacity;
        varying vec2 vRingPos;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        void main() {
          float km = length(vRingPos) / uDisplayRadius * uPlanetRadiusKm;
          float u = (km - uStripInnerKm) / (uStripOuterKm - uStripInnerKm);
          if (u < 0.0 || u > 1.0) discard;
          vec4 ring = texture2D(uRingTex, vec2(u, 0.5));
          vec3 n = normalize(vNormalW);
          vec3 sunDir = normalize(-vWorldPos);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          // 相机与太阳分居环面两侧 → 背光面，环变暗且略透
          float backlit = step(dot(n, sunDir) * dot(n, viewDir), 0.0);
          float bright = mix(1.0, 0.32, backlit);
          float alpha = ring.a * uOpacity * mix(1.0, 0.7, backlit);
          float grazing = 0.55 + 0.45 * abs(dot(n, sunDir));
          // 条带原图（Voyager 反向散射）偏苍白，调色回水冰环的暖米色；
          // 亮度跟随光学深度（alpha）：B 环亮、A 环次之、C 环暗，贴近真实观感
          vec3 graded = pow(ring.rgb, vec3(1.25)) * vec3(1.06, 0.94, 0.72);
          graded *= 0.4 + 0.6 * ring.a;
          gl_FragColor = vec4(graded * bright * grazing, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }, [fallbackTex, isSaturn, radius, radiusKm, rings])

  useEffect(() => {
    if (stripTex) material.uniforms.uRingTex.value = stripTex
  }, [stripTex, material])

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      {/* 几何半径与条带物理跨度（km）对齐，否则外 A 环与 F 环会被裁掉 */}
      <ringGeometry args={[radius * (innerKm / radiusKm), radius * (outerKm / radiusKm), 128, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/** 地球夜景：NASA Black Marble 城市灯光，只在晨昏线背阳一侧发光 */
function EarthNightLights() {
  const nightTex = useLazyTexture(EARTH_NIGHT_TEXTURE_URL)
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null }, uIntensity: { value: 1.25 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 sunDir = normalize(-vWorldPos); // 太阳在世界原点
          float day = dot(normalize(vWorldNormal), sunDir);
          float night = smoothstep(0.08, -0.22, day);
          vec3 lights = texture2D(uMap, vUv).rgb;
          float lum = max(max(lights.r, lights.g), lights.b);
          gl_FragColor = vec4(lights * vec3(1.0, 0.86, 0.62) * uIntensity * night, lum * night);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }, [])

  useEffect(() => {
    if (nightTex) material.uniforms.uMap.value = nightTex
  }, [nightTex, material])

  return <primitive object={material} attach="material" />
}

/** 地球大气：菲涅尔边缘辉光薄壳，向阳侧更亮 */
function EarthAtmosphere({ radius }: { radius: number }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#79b8ff') }, uStrength: { value: 0.6 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vec4 mv = viewMatrix * wp;
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 4.0);
          float day = smoothstep(-0.35, 0.45, dot(normalize(vWorldNormal), normalize(-vWorldPos)));
          f *= 0.25 + 0.75 * day;
          gl_FragColor = vec4(uColor * f * uStrength, f * 0.2);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }, [])
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.16, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/**
 * 故事步的场景焦点环：字幕轨留在底部，「看哪里」的提示进入场景。
 * 环始终面向镜头——共面环会被误读成行星环（火星没有环），
 * 框住星球的正圆只读作「高亮这里」。减少动态偏好下保持静态不闪烁。
 */
function StoryFocusRing({ radius, color }: { radius: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && false,
  )
  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return
    meshRef.current.quaternion.copy(camera.quaternion)
    if (!matRef.current || reducedMotion.current) return
    const t = clock.elapsedTime
    matRef.current.opacity = 0.34 + 0.2 * Math.sin(t * 2.2)
  })
  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[radius * 1.72, radius * 1.8, 72]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.42}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function PlanetNode({
  data,
  simDaysRef,
  selected,
  storyFocus,
  onSelect,
  registerBody,
}: {
  data: PlanetData
  simDaysRef: React.MutableRefObject<number>
  selected: boolean
  storyFocus?: boolean
  onSelect: (id: string) => void
  registerBody: (id: string, obj: THREE.Object3D | null) => void
}) {
  const rootRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const radius = displayRadius(data.radiusKm)
  const isEarth = data.id === 'earth'
  const dayTex = useLazyTexture(isEarth ? EARTH_DAY_TEXTURE_URL : planetTextureUrl(data.texture))
  const cloudsTex = useLazyTexture(isEarth ? EARTH_CLOUDS_TEXTURE_URL : null, false)
  const moonTex = useLazyTexture(isEarth ? MOON_TEXTURE_URL : null)
  const baseColor = useMemo(() => new THREE.Color(data.color), [data.color])
  const fadeRef = useRef(0)

  useEffect(() => {
    registerBody(data.id, rootRef.current)
    return () => registerBody(data.id, null)
  }, [data.id, registerBody])

  useFrame((_, delta) => {
    if (!rootRef.current || !spinRef.current) return
    const [x, y, z] = orbitalPosition(data.elements, simDaysRef.current)
    rootRef.current.position.set(x * AU_SCALE, y * AU_SCALE, z * AU_SCALE)
    const rot = (simDaysRef.current * 24) / data.rotationHours * Math.PI * 2
    spinRef.current.rotation.y = rot
    if (cloudRef.current) cloudRef.current.rotation.y = rot * 1.12
    // 贴图懒加载：先显示纯色低模，纹理 ready 后从基色淡入真实影像
    if (dayTex && matRef.current && fadeRef.current < 1) {
      if (!matRef.current.map) {
        matRef.current.map = dayTex
        matRef.current.needsUpdate = true
      }
      fadeRef.current = Math.min(1, fadeRef.current + delta / 0.9)
      const f = fadeRef.current
      const e = f * f * (3 - 2 * f)
      matRef.current.color.copy(baseColor).lerp(WHITE, e)
    }
    for (const child of rootRef.current.children) {
      if (child.userData.moonOrbit) {
        const m = child.userData.moonOrbit
        const p = m.phase + (simDaysRef.current / m.period) * Math.PI * 2
        child.position.set(Math.cos(p) * m.orbitRadius, Math.sin(p) * m.orbitRadius * m.tilt, Math.sin(p) * m.orbitRadius)
      }
    }
  })

  return (
    <group ref={rootRef}>
      <group rotation={[0, 0, THREE.MathUtils.degToRad(data.obliquity)]}>
        <mesh
          ref={spinRef}
          onClick={(e) => { e.stopPropagation(); onSelect(data.id) }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <sphereGeometry args={[radius, 48, 32]} />
          <meshStandardMaterial ref={matRef} roughness={0.92} metalness={0.02} color={data.color} emissive={selected ? data.color : '#000000'} emissiveIntensity={selected ? 0.18 : 0} />
          {isEarth && (
            <mesh>
              <sphereGeometry args={[radius * 1.004, 48, 32]} />
              <EarthNightLights />
            </mesh>
          )}
        </mesh>
        {isEarth && cloudsTex && (
          <mesh ref={cloudRef}>
            <sphereGeometry args={[radius * 1.025, 48, 32]} />
            <meshStandardMaterial alphaMap={cloudsTex} transparent opacity={0.42} depthWrite={false} roughness={1} />
          </mesh>
        )}
        {data.rings && <PlanetRings radius={radius} radiusKm={data.radiusKm} rings={data.rings} planetId={data.id} />}
        {isEarth && <EarthAtmosphere radius={radius} />}
        {selected && (
          <mesh>
            <sphereGeometry args={[radius * 1.12, 32, 32]} />
            <meshBasicMaterial color={data.color} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )}
      </group>
      {storyFocus && <StoryFocusRing radius={radius} color={data.color} />}
      {data.moons?.map((moon, i) => {
        // 月球按真实地月半径比 0.27 显示；伽利略卫星太小，统一适度放大保证可辨
        const mr = Math.max(0.16, displayRadius(moon.radiusKm) * (isEarth && i === 0 ? 0.55 : 0.45))
        const orbit = radius * moon.orbitFactor
        const moonMap = isEarth && i === 0 ? moonTex : null
        return (
          <mesh
            key={moon.name}
            userData={{ moonOrbit: { orbitRadius: orbit, period: moon.periodDays, phase: i * 1.7 + 0.5, tilt: (i % 3 - 1) * 0.12 } }}
          >
            <sphereGeometry args={[mr, 24, 16]} />
            <meshStandardMaterial key={moonMap ? 'map' : 'flat'} color={moonMap ? '#ffffff' : moon.color} map={moonMap ?? undefined} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

function AsteroidBelt({ simDaysRef, visible }: { simDaysRef: React.MutableRefObject<number>; visible: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const beltData = useMemo(() => {
    const arr: { a: number; phase: number; n: number; y: number; e: number }[] = []
    for (let i = 0; i < 2600; i++) {
      const a = 2.1 + Math.random() * 1.2
      const period = Math.pow(a, 1.5) * 365.25
      arr.push({ a, phase: Math.random() * Math.PI * 2, n: (2 * Math.PI) / period, y: (Math.random() - 0.5) * 0.06 * a, e: Math.random() * 0.08 })
    }
    return arr
  }, [])

  useFrame(() => {
    if (!pointsRef.current || !visible) return
    const attr = pointsRef.current.geometry.attributes.position
    const arr = attr.array as Float32Array
    for (let i = 0; i < beltData.length; i++) {
      const d = beltData[i]
      const angle = d.phase + d.n * simDaysRef.current
      const r = d.a * (1 - d.e * Math.cos(angle)) * AU_SCALE
      arr[i * 3] = Math.cos(angle) * r
      arr[i * 3 + 1] = d.y * AU_SCALE
      arr[i * 3 + 2] = Math.sin(angle) * r
    }
    attr.needsUpdate = true
  })

  if (!visible) return null
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(beltData.length * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b09a80" size={0.55} sizeAttenuation transparent opacity={0.75} />
    </points>
  )
}

function KuiperBelt({ simDaysRef, visible }: { simDaysRef: React.MutableRefObject<number>; visible: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const beltData = useMemo(() => {
    const arr: { a: number; phase: number; n: number; y: number; e: number }[] = []
    for (let i = 0; i < 3200; i++) {
      const a = 30 + Math.random() * 20
      const period = Math.pow(a, 1.5) * 365.25
      arr.push({ a, phase: Math.random() * Math.PI * 2, n: (2 * Math.PI) / period, y: (Math.random() - 0.5) * 0.15 * a, e: Math.random() * 0.12 })
    }
    return arr
  }, [])

  useFrame(() => {
    if (!pointsRef.current || !visible) return
    const attr = pointsRef.current.geometry.attributes.position
    const arr = attr.array as Float32Array
    for (let i = 0; i < beltData.length; i++) {
      const d = beltData[i]
      const angle = d.phase + d.n * simDaysRef.current
      const r = d.a * (1 - d.e * Math.cos(angle)) * AU_SCALE
      arr[i * 3] = Math.cos(angle) * r
      arr[i * 3 + 1] = d.y * AU_SCALE
      arr[i * 3 + 2] = Math.sin(angle) * r
    }
    attr.needsUpdate = true
  })

  if (!visible) return null
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(beltData.length * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8fa8c8" size={0.5} sizeAttenuation transparent opacity={0.45} />
    </points>
  )
}

/** 三层视差星场：近景亮星稀疏而大，中层银河带倾斜，远景暗星细小 */
function StarField() {
  const groupRef = useRef<THREE.Group>(null)
  const materials = useMemo(() => {
    const mats: THREE.ShaderMaterial[] = []
    const make = (count: number, minR: number, maxR: number, tilt: number | null, minSize: number, maxSize: number, brightness: number) => {
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const phases = new Float32Array(count)
      const palette = ['#9bb4ff', '#cfd8ff', '#ffffff', '#fff2d8', '#ffd9a0', '#ffb08a'].map((c) => new THREE.Color(c))
      const quat = new THREE.Quaternion()
      if (tilt !== null) quat.setFromEuler(new THREE.Euler(tilt, 0.4, 0.25))
      for (let i = 0; i < count; i++) {
        let v: THREE.Vector3
        if (tilt !== null) {
          const l = Math.random() * Math.PI * 2
          const b = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.22
          v = new THREE.Vector3(Math.cos(l), b(), Math.sin(l)).normalize().applyQuaternion(quat)
        } else {
          v = new THREE.Vector3().randomDirection()
        }
        const d = minR + Math.random() * (maxR - minR)
        v.multiplyScalar(d)
        positions.set([v.x, v.y, v.z], i * 3)
        const c = palette[Math.floor(Math.random() * palette.length)]
        colors.set([c.r * brightness, c.g * brightness, c.b * brightness], i * 3)
        sizes[i] = minSize + Math.pow(Math.random(), 2.5) * (maxSize - minSize)
        phases[i] = Math.random() * Math.PI * 2
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute vec3 aColor;
          attribute float aSize;
          attribute float aPhase;
          uniform float uTime;
          varying vec3 vColor;
          varying float vTw;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float tw = 0.78 + 0.22 * sin(uTime * 1.6 + aPhase);
            vTw = tw;
            gl_PointSize = aSize * tw * (14000.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor;
          varying float vTw;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.02, d);
            gl_FragColor = vec4(vColor * vTw, a);
          }`,
      })
      mats.push(mat)
      return { geo, mat }
    }
    const near = make(2400, 5500, 9500, null, 2.2, 6.5, 0.95)
    const band = make(9000, 15000, 24000, 1.05, 0.9, 2.4, 0.55)
    const far = make(6000, 28000, 42000, null, 0.6, 1.7, 0.4)
    return [
      { geometry: near.geo, material: near.mat },
      { geometry: band.geo, material: band.mat },
      { geometry: far.geo, material: far.mat },
    ]
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (const m of materials) m.material.uniforms.uTime.value = t
    if (groupRef.current) groupRef.current.rotation.y = t * 0.0022
  })

  return (
    <group ref={groupRef}>
      {materials.map((m, i) => (
        <points key={i} geometry={m.geometry} material={m.material} />
      ))}
    </group>
  )
}

/**
 * 已移除 EffectComposer + UnrealBloomPass。
 * 与 R3F 默认渲染双通道叠画是「拖动/移动时整屏闪烁」的主因。
 * 太阳辉光改由 Sun 组件内 additive sprite / shell 承担。
 */

function CameraController({
  focusedId,
  bodiesRef,
  viewPreset,
  onUserControl,
  interactive,
}: {
  focusedId: string | null
  bodiesRef: React.MutableRefObject<Map<string, THREE.Object3D>>
  viewPreset: string
  onUserControl: () => void
  interactive: boolean
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const userControlled = useRef(false)
  const hasFocusedRef = useRef(false)
  const tweenRef = useRef<{ fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTgt: THREE.Vector3; toTgt: THREE.Vector3; t: number; dur: number } | null>(null)
  const tempTarget = useRef(new THREE.Vector3())

  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  const focusOn = (id: string | null, instant = false) => {
    if (!controlsRef.current) return
    const controls = controlsRef.current
    const body = id ? bodiesRef.current.get(id) : undefined
    const target = body ? body.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3()
    let camPos: THREE.Vector3
    if (body && id) {
      const planet = PLANETS.find((p) => p.id === id)
      const radius = planet ? displayRadius(planet.radiusKm) : id === 'sun' ? SUN_RADIUS : 1
      const dir = target.clone().normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize()
      const offset = dir.clone().multiplyScalar(-0.62).add(side.multiplyScalar(0.72)).add(new THREE.Vector3(0, 0.38, 0)).normalize()
      const dist = Math.max(radius * 5.5, 4.5)
      camPos = target.clone().add(offset.multiplyScalar(dist))
      controls.minDistance = Math.max(radius * 1.6, 1.2)
      controls.maxDistance = Math.max(radius * 120, 400)
    } else {
      camPos = new THREE.Vector3(0, 160, 460)
      controls.minDistance = 3
      controls.maxDistance = 12000
    }
    if (instant) {
      controls.object.position.copy(camPos)
      controls.target.copy(target)
      tweenRef.current = null
      return
    }
    tweenRef.current = {
      fromPos: controls.object.position.clone(),
      toPos: camPos,
      fromTgt: controls.target.clone(),
      toTgt: target,
      t: 0,
      dur: 1.5,
    }
  }

  useEffect(() => {
    if (!controlsRef.current) return
    if (viewPreset !== 'free') {
      const presets: Record<string, [number, number, number]> = {
        top: [0, 1400, 0],
        side: [0, 80, 1600],
      }
      const p = presets[viewPreset] ?? [0, 160, 460]
      tweenRef.current = {
        fromPos: controlsRef.current.object.position.clone(),
        toPos: new THREE.Vector3(...p),
        fromTgt: controlsRef.current.target.clone(),
        toTgt: new THREE.Vector3(0, 0, 0),
        t: 0,
        dur: 1.8,
      }
      userControlled.current = false
      hasFocusedRef.current = false
      return
    }
    if (focusedId) {
      const body = bodiesRef.current.get(focusedId)
      if (body) {
        focusOn(focusedId)
        hasFocusedRef.current = true
      } else {
        hasFocusedRef.current = false
      }
    } else if (hasFocusedRef.current) {
      focusOn(null)
      hasFocusedRef.current = false
    }
  }, [focusedId, viewPreset])

  useFrame((_, delta) => {
    if (!controlsRef.current) return
    const controls = controlsRef.current

    if (!hasFocusedRef.current && focusedId) {
      const body = bodiesRef.current.get(focusedId)
      if (body) {
        focusOn(focusedId)
        hasFocusedRef.current = true
      }
    }

    if (tweenRef.current) {
      const tw = tweenRef.current
      tw.t += delta / tw.dur
      const e = easeInOutCubic(Math.min(tw.t, 1))
      controls.object.position.lerpVectors(tw.fromPos, tw.toPos, e)
      controls.target.lerpVectors(tw.fromTgt, tw.toTgt, e)
      if (tw.t >= 1) tweenRef.current = null
    } else if (focusedId && !userControlled.current) {
      const body = bodiesRef.current.get(focusedId)
      if (body) {
        body.getWorldPosition(tempTarget.current)
        const deltaV = tempTarget.current.clone().sub(controls.target)
        if (deltaV.lengthSq() > 0) {
          controls.target.add(deltaV)
          controls.object.position.add(deltaV)
        }
      }
    }
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={interactive}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minDistance={3}
      maxDistance={12000}
      onStart={() => {
        // 用户一动手就取消镜头补间，并保持手动控制，避免松手后又被行星跟随抢镜头导致闪跳
        userControlled.current = true
        tweenRef.current = null
        onUserControl()
      }}
    />
  )
}

function Scene({
  simDaysRef,
  selectedId,
  onSelectPlanet,
  showOrbits,
  showAsteroids,
  showKuiper,
  focusedId,
  storyFocusId,
  bodiesRef,
  viewPreset,
  onUserControl,
  interactive,
}: {
  simDaysRef: React.MutableRefObject<number>
  selectedId: string | null
  onSelectPlanet: (id: string) => void
  showOrbits: boolean
  showAsteroids: boolean
  showKuiper: boolean
  focusedId: string | null
  storyFocusId?: string | null
  bodiesRef: React.MutableRefObject<Map<string, THREE.Object3D>>
  viewPreset: string
  onUserControl: () => void
  interactive: boolean
}) {
  const registerBody = (id: string, obj: THREE.Object3D | null) => {
    if (obj) bodiesRef.current.set(id, obj)
    else bodiesRef.current.delete(id)
  }

  return (
    <>
      <color attach="background" args={['#04050a']} />
      <ambientLight intensity={0.04} color="#8899bb" />
      <StarField />
      <Sun registerBody={registerBody} />
      {PLANETS.map((planet) => (
        <group key={planet.id}>
          {showOrbits && <OrbitLine elements={planet.elements} color={planet.color} highlighted={selectedId === planet.id} />}
          <PlanetNode data={planet} simDaysRef={simDaysRef} selected={selectedId === planet.id} storyFocus={storyFocusId === planet.id} onSelect={interactive ? onSelectPlanet : () => {}} registerBody={registerBody} />
        </group>
      ))}
      <AsteroidBelt simDaysRef={simDaysRef} visible={showAsteroids} />
      <KuiperBelt simDaysRef={simDaysRef} visible={showKuiper} />
      <CameraController focusedId={focusedId} bodiesRef={bodiesRef} viewPreset={viewPreset} onUserControl={onUserControl} interactive={interactive} />
    </>
  )
}

function formatSimDate(simDays: number) {
  const date = new Date(SIM_EPOCH + simDays * 86400000)
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const d = `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
  const t = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')} UTC`
  const days = `T${simDays < 0 ? '−' : '+'}${Math.abs(Math.floor(simDays)).toLocaleString('en-US')} DAYS`
  return { date: d, time: t, days }
}

function formatSpeed(daysPerSec: number) {
  if (daysPerSec >= 365.25) return `${(daysPerSec / 365.25).toFixed(daysPerSec / 365.25 < 10 ? 1 : 0)} 年/秒`
  if (daysPerSec >= 30.44) return `${(daysPerSec / 30.44).toFixed(1)} 月/秒`
  if (daysPerSec >= 7) return `${(daysPerSec / 7).toFixed(daysPerSec / 7 < 10 ? 1 : 0)} 周/秒`
  if (daysPerSec >= 1) return `${daysPerSec.toFixed(daysPerSec < 10 ? 1 : 0)} 天/秒`
  const hr = daysPerSec * 24
  if (hr >= 1) return `${hr.toFixed(hr < 10 ? 1 : 0)} 时/秒`
  const min = daysPerSec * 1440
  if (min >= 1) return `${min.toFixed(min < 10 ? 1 : 0)} 分/秒`
  const sec = daysPerSec * 86400
  return `${sec.toFixed(sec < 10 ? 1 : 0)} 秒/秒`
}

/** 时钟独立订阅 simDaysRef，避免拖动画布时父组件 setState 牵动 R3F 树 */
function SolarClock({ simDaysRef, tx }: { simDaysRef: React.MutableRefObject<number>; tx: (s: string) => string }) {
  const [simDays, setSimDays] = useState(0)
  useEffect(() => {
    let id = 0
    const tick = () => {
      setSimDays(simDaysRef.current)
      id = window.setTimeout(tick, 250)
    }
    id = window.setTimeout(tick, 250)
    return () => window.clearTimeout(id)
  }, [simDaysRef])
  const { date, time, days } = formatSimDate(simDays)
  return (
    <div className="ss-clock">
      <strong>{tx(date)}</strong>
      <span>{tx(time)}</span>
      <em>{tx(days)}</em>
    </div>
  )
}

export function SolarSystem({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('solar-system')
  const simDaysRef = useRef(0)
  const [daysPerSec, setDaysPerSec] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [direction, setDirection] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>('earth')
  const [focusedId, setFocusedId] = useState<string | null>('earth')
  const [viewPreset, setViewPreset] = useState('free')
  const [showOrbits, setShowOrbits] = useState(true)
  const [showAsteroids, setShowAsteroids] = useState(true)
  const [showKuiper, setShowKuiper] = useState(true)
  const [beat, setBeat] = useState<SolarBeat>(0)
  const bodiesRef = useRef(new Map<string, THREE.Object3D>())
  const sliderValue = speedToSlider(daysPerSec)
  const interactedRef = useRef(false)
  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // 物理时间只写 ref，不 setState —— 杜绝拖动时整树重绘
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      simDaysRef.current += daysPerSec * dt * direction
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, daysPerSec, direction])

  const selectPlanet = useCallback((id: string) => {
    setSelectedId(id)
    setFocusedId(id)
    setViewPreset('free')
    controls.registerInteraction()
  }, [controls])

  const handleUserControl = useCallback(() => {
    if (interactedRef.current) return
    interactedRef.current = true
    controls.registerInteraction()
  }, [controls])

  const returnToFree = useCallback(() => {
    setBeat(0)
    setSelectedId(null)
    setFocusedId(null)
    setViewPreset('free')
    setShowOrbits(true)
    setShowAsteroids(true)
    setShowKuiper(true)
    simDaysRef.current = 0
    setDaysPerSec(1)
    setDirection(1)
    setIsPlaying(true)
    enterFree()
  }, [enterFree])

  function resetView() {
    setSelectedId('earth')
    setFocusedId('earth')
    setViewPreset('free')
    setShowOrbits(true)
    setShowAsteroids(true)
    setShowKuiper(true)
    simDaysRef.current = 0
    setDaysPerSec(1)
    setDirection(1)
    setIsPlaying(true)
    setBeat(0)
    controls.registerInteraction()
  }

  const handleReplay = useCallback(() => {
    controls.registerInteraction()
    setBeat(0)
    enterStory()
    replayGuide('solar-system')
  }, [controls, enterStory])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: '八颗行星，挤在一张薄盘里',
      body: '它们大小不同、速度不同，却几乎沿着同一个方向，在同一张薄薄的平面里绕太阳转。先从上方看清这套秩序。',
      action: () => {
        setBeat(1)
        setSelectedId(null)
        setFocusedId(null)
        setViewPreset('top')
        setShowOrbits(true)
        setShowAsteroids(false)
        setShowKuiper(false)
        setDaysPerSec(36.5)
        setIsPlaying(true)
      },
    },
    {
      title: '侧过来看，它薄得惊人',
      body: '太阳系诞生在一团旋转的气体和尘埃里。旋转会让云团越收越扁，最后留下一个盘；行星就在盘里长大。',
      action: () => {
        setBeat(2)
        setSelectedId(null)
        setFocusedId(null)
        setViewPreset('side')
      },
    },
    {
      title: '离太阳越近，转得越快',
      body: '水星贴着太阳跑，一年只有 88 天；地球远一点，要 365 天；最远的海王星，转一圈要 165 年。400 多年前开普勒发现：每颗行星的一年有多长，都被它和太阳的距离精确锁定，谁也不例外。',
      action: () => {
        setBeat(4)
        setSelectedId('mars')
        setFocusedId('mars')
        setViewPreset('free')
        setDaysPerSec(8)
      },
    },
    {
      title: '木星像一座小型行星系',
      body: '木星的质量比其他七颗行星加起来还大。四颗最大的卫星绕着它，让早期望远镜第一次清楚证明：并非一切都绕地球转。',
      action: () => {
        setBeat(5)
        setSelectedId('jupiter')
        setFocusedId('jupiter')
        setViewPreset('free')
        setDaysPerSec(2.4)
      },
    },
    {
      title: '从土星环走向最外侧',
      body: '土星主环横跨约 28 万公里，平均却只有几十米厚，由无数冰块共同绕行。更远的海王星跑完一圈要 165 个地球年：从发现到 2011 年，人类才看完它的第一圈公转。',
      action: () => {
        setBeat(7)
        setSelectedId('neptune')
        setFocusedId('neptune')
        setViewPreset('free')
        setDaysPerSec(365.25 * 8)
      },
    },
  ], [])

  const selectedPlanet = PLANETS.find((p) => p.id === selectedId)
  const selectedSpeedPreset = SPEED_PRESETS.find(
    (preset) => Math.abs(Math.log10(daysPerSec) - Math.log10(preset.daysPerSec)) < 0.015,
  )

  /** 同级工具保持一条横向仪表带；故事从左进入，破坏性更强的重置在最右端。 */
  const viewsGroup = (
    <div className="ss-freebar-views experience-freebar-seg" role="group" aria-label={tx('视角')}>
      <button type="button" className={viewPreset === 'free' ? 'is-active' : undefined} onClick={() => { setViewPreset('free'); controls.registerInteraction() }} aria-label={tx('自由')}>
        <Compass weight="bold" />
        <span>{tx('自由')}</span>
      </button>
      <button type="button" className={viewPreset === 'top' ? 'is-active' : undefined} onClick={() => { setViewPreset('top'); setFocusedId(null); controls.registerInteraction() }} aria-label={tx('俯瞰')}>
        <Crosshair weight="bold" />
        <span>{tx('俯瞰')}</span>
      </button>
      <button type="button" className={viewPreset === 'side' ? 'is-active' : undefined} onClick={() => { setViewPreset('side'); setFocusedId(null); controls.registerInteraction() }} aria-label={tx('侧面')}>
        <ArrowsOutLineHorizontal weight="bold" />
        <span>{tx('侧面')}</span>
      </button>
    </div>
  )

  const layersGroup = (
    <div className="ss-freebar-layers experience-freebar-chips" role="group" aria-label={tx('显示层')}>
      <button type="button" className={showOrbits ? 'is-active' : undefined} aria-pressed={showOrbits} onClick={() => { setShowOrbits((v) => !v); controls.registerInteraction() }}>
        <Planet weight="bold" />
        <span>{tx('轨道')}</span>
      </button>
      <button type="button" className={showAsteroids ? 'is-active' : undefined} aria-pressed={showAsteroids} onClick={() => { setShowAsteroids((v) => !v); controls.registerInteraction() }}>
        <DotsNine weight="bold" />
        <span>{tx('小行星带')}</span>
      </button>
      <button type="button" className={showKuiper ? 'is-active' : undefined} aria-pressed={showKuiper} onClick={() => { setShowKuiper((v) => !v); controls.registerInteraction() }}>
        <CircleDashed weight="bold" />
        <span>{tx('柯伊伯带')}</span>
      </button>
    </div>
  )

  const toolsGroup = (
    <div className="ss-tools-strip">
      <button
        type="button"
        className="experience-freebar-story"
        aria-label={tx('重播故事')}
        onClick={handleReplay}
      >
        <FilmStrip weight="fill" aria-hidden="true" />
        <span>{tx('故事')}</span>
      </button>
      <span className="ss-tools-divider" aria-hidden="true" />
      {viewsGroup}
      <span className="ss-tools-divider" aria-hidden="true" />
      {layersGroup}
      <span className="ss-tools-divider" aria-hidden="true" />
      <button
        type="button"
        className="ss-direction-toggle"
        onClick={() => { setDirection((current) => -current); controls.registerInteraction() }}
      >
        {direction === 1 ? <FastForward weight="fill" /> : <Rewind weight="fill" />}
        {tx(direction === 1 ? '倒放' : '正放')}
      </button>
      <label className="ss-speed-select">
        <span>{tx('速度')}</span>
        <select
          value={selectedSpeedPreset?.daysPerSec ?? ''}
          aria-label={tx('时间流速')}
          onChange={(event) => {
            if (!event.target.value) return
            setDaysPerSec(Number(event.target.value))
            controls.registerInteraction()
          }}
        >
          <option value="">{tx('自定义')}</option>
          {SPEED_PRESETS.map((preset) => {
            return (
              <option
                key={preset.label}
                value={preset.daysPerSec}
              >
                {tx(preset.label)}
              </option>
            )
          })}
        </select>
      </label>
      <span className="ss-tools-divider" aria-hidden="true" />
      <button type="button" className="experience-freebar-reset" aria-label={tx('重置')} onClick={resetView}>
        <ArrowCounterClockwise weight="bold" aria-hidden="true" />
        <span>{tx('重置')}</span>
      </button>
    </div>
  )

  return (
    <div className={`oss-experience solar-system-experience solar-system-beat-${beat}${storyMode ? ' is-story' : ' is-free'}`}>
      <Canvas
        camera={{ position: [0, 220, 780], fov: 46, near: 0.5, far: 60000 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        frameloop="always"
      >
        <Scene
          simDaysRef={simDaysRef}
          selectedId={selectedId}
          onSelectPlanet={selectPlanet}
          showOrbits={showOrbits}
          showAsteroids={showAsteroids}
          showKuiper={showKuiper}
          focusedId={focusedId}
          storyFocusId={storyMode ? focusedId : null}
          bodiesRef={bodiesRef}
          viewPreset={viewPreset}
          onUserControl={handleUserControl}
          interactive={beat === 0 || !storyMode}
        />
      </Canvas>
      {/* 自由探索不再叠大标题，避免与壳层「世界的形状」顶栏抢位 */}
      {storyMode && beat === 0 && (
        <header className="solar-system-story-title" data-experience-overlay="true">
          <span>SOLAR SYSTEM</span>
          <h1>{tx('太阳系')}</h1>
          <p>{tx('八颗行星，为什么几乎挤在同一张薄盘里？')}</p>
        </header>
      )}

      {storyMode && beat === 1 && (
        <div className="solar-system-story solar-system-story-family">
          <strong>8</strong>
          <span>{tx('颗行星')}</span>
          <i aria-hidden="true" />
          <p>{tx('同向 · 近乎共面 · 各有自己的速度')}</p>
        </div>
      )}

      {storyMode && beat === 2 && (
        <div className="solar-system-story solar-system-story-disc">
          <span>{tx('从一团旋转的云')}</span>
          <strong>{tx('压成一张孕育行星的薄盘')}</strong>
          <i aria-hidden="true" />
        </div>
      )}

      {storyMode && beat === 3 && (
        <div className="solar-system-story solar-system-story-years">
          <div><span>{tx('水星')}</span><strong>88 {tx('天')}</strong></div>
          <i aria-hidden="true" />
          <div><span>{tx('地球')}</span><strong>365 {tx('天')}</strong></div>
          <p>{tx('越近，跑得越快')}</p>
        </div>
      )}

      {storyMode && beat === 4 && (
        <div className="solar-system-story solar-system-story-kepler">
          <span>Johannes Kepler · 1619</span>
          <strong>{tx('越远，一年就越长')}</strong>
          <p>{tx('这不是感觉，而是精确的数学规律（T² ∝ a³）。')}</p>
          <small>{tx('水星 88 天 · 地球 365 天 · 海王星 165 年')}</small>
        </div>
      )}

      {storyMode && beat === 5 && (
        <div className="solar-system-story solar-system-story-jupiter">
          <span>{tx('一颗行星')}</span>
          <strong>＞</strong>
          <span>{tx('其余七颗的质量总和')}</span>
          <p>{tx('四颗大卫星，像一套迷你太阳系')}</p>
        </div>
      )}

      {storyMode && beat === 6 && (
        <div className="solar-system-story solar-system-story-rings">
          <div><strong>≈ 280,000 km</strong><span>{tx('环的宽度')}</span></div>
          <i aria-hidden="true" />
          <div><strong>{tx('几十米')}</strong><span>{tx('平均厚度')}</span></div>
        </div>
      )}

      {storyMode && beat === 7 && (
        <div className="solar-system-story solar-system-story-neptune">
          <span>{tx('海王星的一年')}</span>
          <strong>164.8</strong>
          <p>{tx('个地球年')}</p>
          <small>1846 → 2011</small>
        </div>
      )}

      {!storyMode && (
        <div className="ss-planet-rail" data-experience-overlay="true" role="listbox" aria-label={tx('天体')}>
          <button
            type="button"
            role="option"
            aria-selected={selectedId === 'sun'}
            className={selectedId === 'sun' ? 'is-active' : undefined}
            onClick={() => selectPlanet('sun')}
          >
            <i style={{ background: '#ffcf6b' }} aria-hidden="true" />
            {tx('太阳')}
          </button>
          {PLANETS.map((planet) => (
            <button
              key={planet.id}
              type="button"
              role="option"
              aria-selected={selectedId === planet.id}
              className={selectedId === planet.id ? 'is-active' : undefined}
              onClick={() => selectPlanet(planet.id)}
            >
              <i style={{ background: planet.color }} aria-hidden="true" />
              {tx(planet.name)}
            </button>
          ))}
        </div>
      )}

      {!storyMode && selectedPlanet && (
        <div
          className="ss-freebar-pick"
          data-experience-overlay="true"
          data-freebar-clearance="true"
          aria-live="polite"
        >
          <strong>{tx(selectedPlanet.name)}</strong>
          <span>{tx(selectedPlanet.yearLength)} · {tx(selectedPlanet.tempC)}</span>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="ss-freebar"
          mainClassName="ss-freebar-main"
          ariaLabel={tx('时间控制')}
          primaryControlBudget={2}
          secondaryDefault="open"
          mobileDensity="comfortable"
          secondaryClassName="ss-freebar-secondary"
          secondary={toolsGroup}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={isPlaying ? 'true' : 'false'}
            onClick={() => { setIsPlaying((playing) => !playing); controls.registerInteraction() }}
            aria-label={tx(isPlaying ? '暂停' : '播放')}
          >
            {isPlaying ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          <div className="ss-freebar-speed">
            <SolarClock simDaysRef={simDaysRef} tx={tx} />
            <input
              type="range"
              className="ss-speed"
              min={0}
              max={1000}
              value={sliderValue}
              aria-label={tx('时间流速')}
              onChange={(event) => {
                setDaysPerSec(sliderToSpeed(Number(event.target.value)))
                controls.registerInteraction()
              }}
            />
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="solar-system"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental', cue: 'right' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental' },
        ]}
        replayLabel={tx('重播故事')}
        showReplayChip={false}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="solar-system"
          gesture={{ type: 'scrub', target: '.ss-speed', label: tx('拨快时间，看行星赛跑') }}
        />
      )}
    </div>
  )
}
