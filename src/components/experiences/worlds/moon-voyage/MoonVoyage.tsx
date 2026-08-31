import './styles/MoonVoyage.css'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  ArrowCounterClockwise,
  FastForward,
  FilmStrip,
  Globe,
  MapTrifold,
  Moon,
  Mountains,
  Pause,
  Play,
  Rocket,
  RocketLaunch,
  Ruler,
  SketchLogo,
} from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  EARTH_CLOUDS_TEXTURE_URL,
  EARTH_NIGHT_TEXTURE_URL,
  useLazyTexture,
} from '~/components/experiences/solar-system-textures'
import { useExperienceI18n } from '~/i18n/experience'
import {
  KM_PER_UNIT,
  MISSION_EVENTS,
  R_E,
  R_M,
  T_CIRC,
  T_COAST_END,
  T_INSERTION,
  T_LOI_END,
  T_LOI_START,
  T_S1_SEP,
  T_S2_SEP,
  T_S4B_SEP,
  T_STABLE,
  T_TLI_END,
  T_TLI_START,
  moonPosKm,
  sampleMission,
  sampleTrajectory,
  type BurnKind,
  type MissionEventId,
  type MissionPhase,
  type MissionSample,
} from '~/components/experiences/worlds/moon-voyage/moon-voyage/mission'

const WORLD_ID = 'moon-voyage'
const EARTH_R = R_E / KM_PER_UNIT // 63.71
const MOON_R = R_M / KM_PER_UNIT // 17.374
const PAD_POS_UNITS: [number, number, number] = [EARTH_R, 0, 0]
const PAD_DIR = new THREE.Vector3(1, 0, 0)
// 太阳方向：发射台上午（仰角约 36°）；到达时月相近上弦（地球看约一半亮），
// 使月球背面 LOI 段可见月面约八成被照亮（与 mission.ts 的 PHI_PERILUNE 配合）。
const SUN_DIR = new THREE.Vector3(0.656, 0.5, 0.755).normalize()
const SUN_DISTANCE = 120000
/** 世界 +y（任务平面近似法向）；只读，勿修改 */
const UP_Y = new THREE.Vector3(0, 1, 0)

// 本世界专享的 4K 贴图（共享注册表不动；useLazyTexture 已设 anisotropy=16）：
// NASA Blue Marble Next Generation 白昼 / LRO LROC 真彩 / LOLA 高程 bump
const EARTH_DAY_4K_URL = '/assets/solar-system/earth-bmng-4k.jpg'
const MOON_LROC_4K_URL = '/assets/solar-system/moon-lroc-4k.jpg'
const MOON_LDEM_BUMP_URL = '/assets/solar-system/moon-ldem-bump.jpg'

/** 任务阶段默认时间倍率（真实秒 / 玩家秒） */
const PHASE_SPEED: Record<MissionPhase, number> = {
  pad: 1,
  ascent: 30,
  orbit: 120,
  tli: 30,
  coast: 3000,
  approach: 1500,
  loi: 30,
  lunar: 600,
}

/** 跟随飞船时的相机默认距离（单位，1 = 100 km） */
const PHASE_CAM_DIST: Record<MissionPhase, number> = {
  pad: 0.012,
  ascent: 0.02,
  orbit: 6.2,
  tli: 5.5,
  coast: 6,
  approach: 2.4,
  loi: 5,
  lunar: 4.5,
}

const PHASE_NAME: Record<MissionPhase, string> = {
  pad: '发射台待命',
  ascent: '点火升空',
  orbit: '地球停泊轨道',
  tli: '地月转移点火',
  coast: '地月航行',
  approach: '接近月球',
  loi: '进入环月轨道',
  lunar: '环月轨道',
}

const SPEED_OPTIONS = [1, 60, 600, 6000]

type CameraMode = 'craft' | 'earth' | 'moon' | 'wide' | 'top'
/** 电影化镜头（覆盖机位选择，用户输入即打断） */
type CinematicShot = 'lookback' | 'earthrise'
type Shot = CameraMode | CinematicShot

type SimRefs = {
  t: number
  playing: boolean
  speed: number
  launched: boolean
  sample: MissionSample
}

function kmToUnits(v: [number, number, number], out: THREE.Vector3) {
  out.set(v[0] / KM_PER_UNIT, v[1] / KM_PER_UNIT, v[2] / KM_PER_UNIT)
  return out
}

function formatGet(t: number) {
  const sign = t < 0 ? 'T-' : 'T+'
  const s = Math.max(0, Math.abs(t))
  const dd = Math.floor(s / 86400)
  const hh = Math.floor((s % 86400) / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${sign}${pad(dd)}:${pad(hh)}:${pad(mm)}:${pad(ss)}`
}

function formatKm(km: number) {
  return `${Math.round(km).toLocaleString('en-US')} km`
}

// ---------------------------------------------------------------------------
// 共享小件

function makeGlowTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 星野：两层恒点，远处细小近处略亮；白天地表附近整体淡出 */
function StarField() {
  const { near, far } = useMemo(() => {
    const make = (count: number, radius: number, sizeMul: number) => {
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const palette = ['#ffffff', '#cdd8ff', '#ffe9c8', '#aebdff'].map((c) => new THREE.Color(c))
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.85 + Math.random() * 0.3))
        positions.set([v.x, v.y, v.z], i * 3)
        const c = palette[Math.floor(Math.random() * palette.length)]
        const b = (0.5 + Math.random() * 0.5) * sizeMul
        colors.set([c.r * b, c.g * b, c.b * b], i * 3)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return geo
    }
    return { near: make(2200, 95000, 1), far: make(4500, 130000, 0.6) }
  }, [])
  const nearMat = useRef<THREE.PointsMaterial>(null)
  const farMat = useRef<THREE.PointsMaterial>(null)
  useFrame(({ camera }) => {
    // 海拔 <~10 km 完全隐藏，~120 km 全亮（白天天空看不到星星）
    const alt = Math.max(0, camera.position.length() - EARTH_R)
    const k = THREE.MathUtils.smoothstep(alt, 0.1, 1.2)
    if (nearMat.current) nearMat.current.opacity = k
    if (farMat.current) farMat.current.opacity = k
  })
  return (
    <group>
      <points geometry={near}>
        <pointsMaterial ref={nearMat} size={1.7} sizeAttenuation={false} vertexColors transparent depthWrite={false} />
      </points>
      <points geometry={far}>
        <pointsMaterial ref={farMat} size={1.2} sizeAttenuation={false} vertexColors transparent depthWrite={false} />
      </points>
    </group>
  )
}

/** 太阳：平行光 + 正确小角直径的发光圆盘 */
function Sun() {
  const discTex = useMemo(() => makeGlowTexture('rgba(255,246,224,1)', 'rgba(255,190,90,0)'), [])
  const glowTex = useMemo(() => makeGlowTexture('rgba(255,214,140,0.55)', 'rgba(255,180,80,0)'), [])
  const pos = useMemo(() => SUN_DIR.clone().multiplyScalar(SUN_DISTANCE), [])
  const discRadius = SUN_DISTANCE * Math.tan((0.265 * Math.PI) / 180) // 真实视直径 0.53°
  return (
    <group>
      <directionalLight position={[SUN_DIR.x * 1000, SUN_DIR.y * 1000, SUN_DIR.z * 1000]} intensity={2.6} color="#fff5e6" />
      <ambientLight intensity={0.14} color="#93a7c8" />
      <sprite position={pos} scale={[discRadius * 2.6, discRadius * 2.6, 1]}>
        <spriteMaterial map={discTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <sprite position={pos} scale={[discRadius * 10, discRadius * 10, 1]}>
        <spriteMaterial map={glowTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.55} />
      </sprite>
    </group>
  )
}

/** 相机跟随的天空穹顶：地平线亮蓝 → 天顶深蓝，随海拔渐隐到太空黑 */
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSpace: { value: 0 },
          uCamPos: { value: new THREE.Vector3(1, 0, 0) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vWorldPos;
          #include <common>
          #include <logdepthbuf_pars_vertex>
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `
          uniform float uSpace;
          uniform vec3 uCamPos;
          varying vec3 vWorldPos;
          #include <logdepthbuf_pars_fragment>
          void main() {
            #include <logdepthbuf_fragment>
            vec3 dir = normalize(vWorldPos - cameraPosition);
            vec3 up = normalize(uCamPos);
            float e = dot(dir, up);
            float h = smoothstep(-0.02, 0.4, e);
            vec3 horizon = vec3(0.66, 0.78, 0.93);
            vec3 zenith = vec3(0.15, 0.35, 0.68);
            vec3 atmo = mix(horizon, zenith, h);
            vec3 space = vec3(0.006, 0.01, 0.026);
            gl_FragColor = vec4(mix(atmo, space, uSpace), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.copy(camera.position)
    const altUnits = Math.max(0, camera.position.length() - EARTH_R)
    material.uniforms.uSpace.value = THREE.MathUtils.smoothstep(altUnits, 0.25, 1.5)
    material.uniforms.uCamPos.value.copy(camera.position)
    mesh.scale.setScalar(camera.far * 0.5)
  })
  return (
    <mesh ref={meshRef} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}

/** 地球：BMNG 4K 白昼 + Black Marble 夜光混合 + 独立云层 + 大气边缘光 */
function Earth() {
  const dayTex = useLazyTexture(EARTH_DAY_4K_URL)
  const nightTex = useLazyTexture(EARTH_NIGHT_TEXTURE_URL)
  const cloudsTex = useLazyTexture(EARTH_CLOUDS_TEXTURE_URL, false)

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uDay: { value: null },
          uNight: { value: null },
          uMix: { value: 0 },
          uSunDir: { value: SUN_DIR.clone() },
          uCamPos: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vWorldPos;
          #include <common>
          #include <logdepthbuf_pars_vertex>
          void main() {
            vUv = uv;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `
          uniform sampler2D uDay;
          uniform sampler2D uNight;
          uniform float uMix;
          uniform vec3 uSunDir;
          uniform vec3 uCamPos;
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vWorldPos;
          #include <logdepthbuf_pars_fragment>
          void main() {
            #include <logdepthbuf_fragment>
            vec3 n = normalize(vNormalW);
            float d = dot(n, normalize(uSunDir));
            vec3 dayTex = texture2D(uDay, vUv).rgb;
            // BMNG 海洋反照率很低（深蓝近黑）：轻微 gamma 提亮暗部，
            // 让海洋带与发射场地面盘、夜光侧的亮度衔接更自然，同时保留陆地对比
            dayTex = pow(dayTex, vec3(0.82));
            // 掠射角下贴图被极度压缩采样（mip 色块/JPEG 色度拖影），
            // 按视角掠射程度把颜色向明度收拢，压掉彩虹伪影但保留地貌明暗
            vec3 viewDir = normalize(uCamPos - vWorldPos);
            float grazing = 1.0 - abs(dot(n, viewDir));
            float lum = dot(dayTex, vec3(0.299, 0.587, 0.114));
            dayTex = mix(dayTex, vec3(lum) * vec3(0.82, 0.95, 1.25), smoothstep(0.72, 0.95, grazing) * 0.65);
            vec3 flatCol = vec3(0.16, 0.34, 0.52);
            // BMNG 海洋带地形晕渲、整体偏深蓝：亮度曲线上抬，避免与昼夜混合后太暗
            vec3 dayCol = mix(flatCol, dayTex, uMix) * (0.18 + 1.72 * max(d, 0.0));
            vec3 nightTex = texture2D(uNight, vUv).rgb;
            float nightW = smoothstep(0.08, -0.2, d);
            vec3 nightCol = nightTex * vec3(1.05, 0.88, 0.6) * 1.6 * nightW
              + mix(flatCol, dayTex, uMix) * 0.03 * nightW;
            float dayW = smoothstep(-0.12, 0.22, d);
            vec3 col = dayCol * dayW + nightCol * (1.0 - dayW);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color('#7db9ff') },
          uSunDir: { value: SUN_DIR.clone() },
          uCamDist: { value: 1000 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vNormalW;
          #include <common>
          #include <logdepthbuf_pars_vertex>
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uSunDir;
          uniform float uCamDist;
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vNormalW;
          #include <logdepthbuf_pars_fragment>
          void main() {
            #include <logdepthbuf_fragment>
            float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.6);
            float day = smoothstep(-0.35, 0.5, dot(normalize(vNormalW), normalize(uSunDir)));
            f *= 0.2 + 0.8 * day;
            // 仅当相机真正飞出壳层之外才点亮，避免低轨相机在壳层内部被泛白洗屏
            float outside = smoothstep(76.5, 82.0, uCamDist);
            gl_FragColor = vec4(uColor * f * 1.5, f * 0.55 * outside);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  const fadeRef = useRef(0)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const cloudsMatRef = useRef<THREE.MeshStandardMaterial>(null)
  useEffect(() => {
    if (dayTex) surface.uniforms.uDay.value = dayTex
  }, [dayTex, surface])
  useEffect(() => {
    if (nightTex) surface.uniforms.uNight.value = nightTex
  }, [nightTex, surface])
  useFrame(({ camera }, delta) => {
    if (dayTex && fadeRef.current < 1) {
      fadeRef.current = Math.min(1, fadeRef.current + delta / 1.2)
      const f = fadeRef.current
      surface.uniforms.uMix.value = f * f * (3 - 2 * f)
    }
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.004
    // 低轨附近减弱云层：近处看是蓝海+薄纱，远看才是白云盖顶
    if (cloudsMatRef.current) {
      const alt = Math.max(0, camera.position.length() - EARTH_R)
      cloudsMatRef.current.opacity = THREE.MathUtils.lerp(0.16, 0.5, THREE.MathUtils.smoothstep(alt, 0.6, 14))
    }
    surface.uniforms.uCamPos.value.copy(camera.position)
    atmosphere.uniforms.uCamDist.value = camera.position.length()
  })

  return (
    <group>
      {/* 轴倾角 23.44°（自转忽略，见 ⓘ 模型边界） */}
      <group rotation={[0, 0, (23.44 * Math.PI) / 180]}>
        <mesh material={surface}>
          <sphereGeometry args={[EARTH_R, 96, 64]} />
        </mesh>
        {cloudsTex && (
          <mesh ref={cloudsRef}>
            <sphereGeometry args={[EARTH_R * 1.003, 64, 48]} />
            <meshStandardMaterial ref={cloudsMatRef} alphaMap={cloudsTex} transparent opacity={0.3} depthWrite={false} roughness={1} />
          </mesh>
        )}
      </group>
      <mesh material={atmosphere}>
        <sphereGeometry args={[EARTH_R * 1.18, 64, 48]} />
      </mesh>
    </group>
  )
}

/** 月球：LROC 4K 真彩 + LOLA 高程 bump（克制的环形山起伏）；位置由任务时钟驱动；夜面给一点「地照」补光 */
function MoonBody({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  const moonTex = useLazyTexture(MOON_LROC_4K_URL)
  const bumpTex = useLazyTexture(MOON_LDEM_BUMP_URL, false)
  const meshRef = useRef<THREE.Mesh>(null)
  const shineRef = useRef<THREE.DirectionalLight>(null)
  const shineTargetRef = useRef<THREE.Object3D>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const fadeRef = useRef(0)
  const tmp = useRef(new THREE.Vector3())
  useEffect(() => {
    if (shineRef.current && shineTargetRef.current) {
      shineRef.current.target = shineTargetRef.current
    }
  }, [])
  useFrame((_, delta) => {
    if (!meshRef.current) return
    kmToUnits(simRef.current.sample.moonPos, tmp.current)
    meshRef.current.position.copy(tmp.current)
    if (shineTargetRef.current) shineTargetRef.current.position.copy(tmp.current)
    const mat = matRef.current
    if (moonTex && mat && !mat.map) {
      mat.map = moonTex
      mat.needsUpdate = true
    }
    if (bumpTex && mat && !mat.bumpMap) {
      // bumpScale 以世界单位计：真实月面起伏 ±9 km 相对 1737 km 半径，
      // 取略夸大的 0.14（=14 km）让环形山在轨道高度可读，但不卡通
      mat.bumpMap = bumpTex
      mat.bumpScale = 0.14
      mat.needsUpdate = true
    }
    if (moonTex && mat && fadeRef.current < 1) {
      fadeRef.current = Math.min(1, fadeRef.current + delta / 1.2)
      const f = fadeRef.current
      mat.color.setRGB(0.55, 0.55, 0.55).lerp(new THREE.Color(0.8, 0.8, 0.8), f * f * (3 - 2 * f))
    }
  })
  return (
    <>
      {/* 地照：从地球方向来的微光补光（强度克制，只让夜面月纹隐约可辨） */}
      <directionalLight ref={shineRef} intensity={0.28} color="#8ba7d4" />
      <object3D ref={shineTargetRef} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[MOON_R, 96, 64]} />
        <meshStandardMaterial ref={matRef} color="#9e9e9e" roughness={0.95} metalness={0} />
      </mesh>
    </>
  )
}

/** 月球轨道圆（任务平面，淡显） */
function MoonOrbitLine({ visible }: { visible: boolean }) {
  const line = useMemo(() => {
    const pts = new Float32Array(257 * 3)
    const tilt = (5.14 * Math.PI) / 180
    const radius = 384400 / KM_PER_UNIT
    for (let i = 0; i <= 256; i++) {
      const theta = (i / 256) * Math.PI * 2
      const x = Math.cos(theta) * radius
      const zPlane = Math.sin(theta) * radius
      pts[i * 3] = x
      pts[i * 3 + 1] = -zPlane * Math.sin(tilt)
      pts[i * 3 + 2] = zPlane * Math.cos(tilt)
    }
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3))
    const line = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: '#3d4b6b', transparent: true, opacity: 0.4 }))
    line.frustumCulled = false
    return line
  }, [])
  return <primitive object={line} visible={visible} />
}

/** 「三天后月球在这里」幽灵标记：半透明月球 + 缓慢脉冲圆环（LOI 时刻月球的真实位置） */
function GhostMoon({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  const ghostPos = useMemo(() => {
    const p = moonPosKm(T_LOI_START)
    return new THREE.Vector3(p[0] / KM_PER_UNIT, p[1] / KM_PER_UNIT, p[2] / KM_PER_UNIT)
  }, [])
  const glowTex = useMemo(() => makeGlowTexture('rgba(190,215,255,0.8)', 'rgba(140,180,255,0)'), [])
  const ringTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = 'rgba(170,205,255,0.9)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(128, 128, 104, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(140,180,255,0.32)'
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.arc(128, 128, 106, 0, Math.PI * 2)
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const spriteRef = useRef<THREE.SpriteMaterial>(null)
  const ringMatRef = useRef<THREE.SpriteMaterial>(null)
  const ringRef = useRef<THREE.Sprite>(null)
  useFrame(({ clock }) => {
    const s = simRef.current.sample
    const show = s.t > 400 && s.t < T_COAST_END + 3600
    const wave = Math.sin(clock.elapsedTime * 2.4)
    const pulse = 0.26 + 0.08 * wave
    const target = show ? pulse : 0
    if (matRef.current) matRef.current.opacity += (target - matRef.current.opacity) * 0.08
    if (spriteRef.current) spriteRef.current.opacity += ((show ? 0.5 + 0.15 * wave : 0) - spriteRef.current.opacity) * 0.08
    // 缓慢脉冲圆环：呼吸式放大 + 明暗
    if (ringMatRef.current && ringRef.current) {
      const ringTarget = show ? 0.75 + 0.2 * wave : 0
      ringMatRef.current.opacity += (ringTarget - ringMatRef.current.opacity) * 0.08
      const sc = MOON_R * (4.6 + 0.5 * wave)
      ringRef.current.scale.set(sc, sc, 1)
    }
  })
  return (
    <group position={ghostPos}>
      <mesh>
        <sphereGeometry args={[MOON_R, 48, 32]} />
        <meshBasicMaterial ref={matRef} color="#bcd2ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <sprite scale={[MOON_R * 6, MOON_R * 6, 1]}>
        <spriteMaterial ref={spriteRef} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={ringRef} scale={[MOON_R * 4.6, MOON_R * 4.6, 1]}>
        <spriteMaterial ref={ringMatRef} map={ringTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

/** 全程轨迹线：已飞过亮色全不透明、未来淡色半透明（RGBA 顶点色）；近地面整体淡出 */
function TrajectoryLine({ simRef, visible }: { simRef: React.MutableRefObject<SimRefs>; visible: boolean }) {
  const line = useMemo(() => {
    const { points, times } = sampleTrajectory()
    const count = times.length
    const colors = new Float32Array(count * 4)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }))
    line.frustumCulled = false
    return { line, times, count, geometry }
  }, [])
  const bright = useMemo(() => new THREE.Color('#c4ecff'), [])
  const dim = useMemo(() => new THREE.Color('#5b7699'), [])
  useFrame(({ camera }) => {
    if (!visible) return
    const now = simRef.current.t
    const attr = line.geometry.attributes.color as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < line.count; i++) {
      const flown = line.times[i] <= now
      const c = flown ? bright : dim
      arr[i * 4] = c.r
      arr[i * 4 + 1] = c.g
      arr[i * 4 + 2] = c.b
      arr[i * 4 + 3] = flown ? 1 : 0.5
    }
    attr.needsUpdate = true
    // 相机近地面时淡出（蓝天里的细线像划痕），升入高空再显现
    const alt = Math.max(0, camera.position.length() - EARTH_R)
    line.line.material.opacity = 0.95 * THREE.MathUtils.smoothstep(alt, 0.06, 0.5)
  })
  return <primitive object={line.line} visible={visible} />
}

/** 事件光点：级间分离、TLI、平衡点、LOI 等；近地面淡出 */
const LABELED_EVENT_IDS: Array<MissionEventId> = [
  's1-sep',
  's2-sep',
  'insertion',
  'tli-start',
  'midcourse',
  'loi-start',
  'circ',
]

function EventMarkers() {
  const geometry = useMemo(() => {
    const picked = MISSION_EVENTS.filter((e) => e.id !== 'ignition' && e.id !== 'maxq')
    const pts = new Float32Array(picked.length * 3)
    picked.forEach((e, i) => {
      const p = sampleMission(e.t).pos
      pts[i * 3] = p[0] / KM_PER_UNIT
      pts[i * 3 + 1] = p[1] / KM_PER_UNIT
      pts[i * 3 + 2] = p[2] / KM_PER_UNIT
    })
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3))
  }, [])
  const matRef = useRef<THREE.PointsMaterial>(null)
  useFrame(({ camera }) => {
    const alt = Math.max(0, camera.position.length() - EARTH_R)
    if (matRef.current) matRef.current.opacity = 0.8 * THREE.MathUtils.smoothstep(alt, 0.06, 0.5)
  })
  return (
    <points geometry={geometry}>
      <pointsMaterial ref={matRef} color="#ffd27a" size={3} sizeAttenuation={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

/**
 * 天体方位标签：wide/top 大尺度机位下，地球和月球只有几到几十像素，
 * 用户常常找不到月亮在哪。给两个天体（以及「三天后的月球」幽灵位置）
 * 挂屏幕空间小标签，锚点跟随天体，CSS 偏移让标签落在球体旁边。
 */
function BodyLabels({ simRef, visible }: { simRef: React.MutableRefObject<SimRefs>; visible: boolean }) {
  const tx = useExperienceI18n()
  const posterMode = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ghost') === '0',
    [],
  )
  const moonRef = useRef<THREE.Group>(null)
  const ghostRef = useRef<THREE.Group>(null)
  const ghostPos = useMemo(() => {
    const p = moonPosKm(T_LOI_START)
    return new THREE.Vector3(p[0] / KM_PER_UNIT, p[1] / KM_PER_UNIT, p[2] / KM_PER_UNIT)
  }, [])
  useFrame(() => {
    if (moonRef.current) kmToUnits(simRef.current.sample.moonPos, moonRef.current.position)
    if (ghostRef.current) {
      // 与 GhostMoon 同一可见窗口
      const t = simRef.current.sample.t
      ghostRef.current.visible = t > 400 && t < T_COAST_END + 3600
    }
  })
  if (!visible || posterMode) return null
  return (
    <>
      <Html position={[0, 0, 0]} center zIndexRange={[5, 0]} wrapperClass="mv-event-label-wrap">
        <span className="mv-body-label mv-body-label-earth">{tx('地球')}</span>
      </Html>
      <group ref={moonRef}>
        <Html center zIndexRange={[5, 0]} wrapperClass="mv-event-label-wrap">
          <span className="mv-body-label mv-body-label-moon">{tx('月球')}</span>
        </Html>
      </group>
      <group ref={ghostRef} position={ghostPos}>
        <Html center zIndexRange={[5, 0]} wrapperClass="mv-event-label-wrap">
          <span className="mv-body-label mv-body-label-ghost">{tx('三天后的月球')}</span>
        </Html>
      </group>
    </>
  )
}

/** 事件文字标签：相机靠近事件点时显示双语名称，同屏最多 3 个，远了淡出 */
function EventLabels({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  const tx = useExperienceI18n()
  // 海报/深链模式（?ghost=0）不渲染，与 GhostHint 同一约定
  const posterMode = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ghost') === '0',
    [],
  )
  const events = useMemo(
    () =>
      MISSION_EVENTS.filter((e) => LABELED_EVENT_IDS.includes(e.id)).map((e) => {
        const p = sampleMission(e.t).pos
        return {
          id: e.id,
          pos: new THREE.Vector3(p[0] / KM_PER_UNIT, p[1] / KM_PER_UNIT, p[2] / KM_PER_UNIT),
        }
      }),
    [],
  )
  const [shown, setShown] = useState<Array<{ id: MissionEventId; opacity: number }>>([])
  const shownKeyRef = useRef('')
  const throttleRef = useRef(0)
  useFrame(({ camera }, delta) => {
    throttleRef.current -= delta
    if (throttleRef.current > 0) return
    throttleRef.current = 0.25
    // 近地面（白天发射场）不显示
    const alt = Math.max(0, camera.position.length() - EARTH_R)
    if (alt < 0.08) {
      if (shownKeyRef.current !== '') {
        shownKeyRef.current = ''
        setShown([])
      }
      return
    }
    const scored = events
      .map((e) => ({ id: e.id, d: camera.position.distanceTo(e.pos) }))
      .filter((x) => x.d < 700)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((x) => ({ id: x.id, opacity: 1 - THREE.MathUtils.smoothstep(x.d, 300, 700) }))
    const key = scored.map((x) => `${x.id}:${x.opacity.toFixed(2)}`).join('|')
    if (key !== shownKeyRef.current) {
      shownKeyRef.current = key
      setShown(scored)
    }
  })
  const labelFor = (id: MissionEventId): string => {
    switch (id) {
      case 's1-sep':
        return tx('一级分离')
      case 's2-sep':
        return tx('二级分离')
      case 'insertion':
        return tx('进入地球轨道')
      case 'tli-start':
        return tx('TLI 点火')
      case 'midcourse':
        return tx('中途修正')
      case 'loi-start':
        return tx('LOI 点火')
      default:
        return tx('圆化燃烧')
    }
  }
  if (posterMode || shown.length === 0) return null
  return (
    <>
      {shown.map(({ id, opacity }) => {
        const e = events.find((x) => x.id === id)!
        return (
          <Html key={id} position={e.pos} center zIndexRange={[5, 0]} wrapperClass="mv-event-label-wrap">
            <span className="mv-event-label" style={{ opacity }}>
              {labelFor(id)}
            </span>
          </Html>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// 火箭模型（程序化 Saturn V 风格；米制建模，渲染时换算）

function Flame({
  length,
  radius,
  core,
  edge,
  visibleRef,
}: {
  length: number
  radius: number
  core: string
  edge: string
  /** 每帧写入 0..1 强度；>0 即显示 */
  visibleRef: React.MutableRefObject<number>
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uCore: { value: new THREE.Color(core) },
          uEdge: { value: new THREE.Color(edge) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          #include <common>
          #include <logdepthbuf_pars_vertex>
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uCore;
          uniform vec3 uEdge;
          varying vec2 vUv;
          #include <logdepthbuf_pars_fragment>
          void main() {
            #include <logdepthbuf_fragment>
            if (uIntensity < 0.01) discard;
            float flick = 0.86 + 0.14 * sin(uTime * 43.0 + vUv.y * 21.0) * sin(uTime * 29.0);
            float axial = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
            vec3 col = mix(uEdge, uCore, pow(1.0 - vUv.y, 2.0));
            gl_FragColor = vec4(col * flick * 3.2, axial * uIntensity * flick);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [core, edge],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uIntensity.value += (visibleRef.current - material.uniforms.uIntensity.value) * 0.25
  })
  return (
    <mesh material={material} rotation={[Math.PI, 0, 0]} position={[0, -length * 0.5, 0]}>
      {/* 开口锥：uv.y 从喷口(0)到尾端(1) */}
      <coneGeometry args={[radius, length, 20, 1, true]} />
    </mesh>
  )
}

type StageRefs = {
  s1: React.RefObject<THREE.Group | null>
  s2: React.RefObject<THREE.Group | null>
  s3: React.RefObject<THREE.Group | null>
  csm: React.RefObject<THREE.Group | null>
}

function SaturnV({ stageRefs, flameS1, flameS2, flameS3, flameCsm }: {
  stageRefs: StageRefs
  flameS1: React.MutableRefObject<number>
  flameS2: React.MutableRefObject<number>
  flameS3: React.MutableRefObject<number>
  flameCsm: React.MutableRefObject<number>
}) {
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f4ef', roughness: 0.48, metalness: 0.12 }), [])
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.55, metalness: 0.25 }), [])
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9aa1ab', roughness: 0.32, metalness: 0.75 }), [])
  const bell = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }), [])
  // F-1 引擎喷口：1 台中央 + 4 台外圈（尾端大喇叭锥）
  const f1Positions = useMemo<Array<[number, number, number]>>(
    () => [[0, -2.2, 0], [2.6, -2.2, 0], [-2.6, -2.2, 0], [0, -2.2, 2.6], [0, -2.2, -2.6]],
    [],
  )
  // 尾翼：S-IC 底部 4 片
  const finAngles = useMemo(() => [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4], [])
  return (
    <group>
      {/* S-IC 一级：0–42 m，白体 + 顶部黑色级间环纹 + 尾翼 + 5×F-1 */}
      <group ref={stageRefs.s1}>
        <mesh material={white} position={[0, 18, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 36, 24]} />
        </mesh>
        <mesh material={black} position={[0, 38.5, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 7, 24]} />
        </mesh>
        {/* 尾裙 */}
        <mesh material={metal} position={[0, -1.2, 0]}>
          <cylinderGeometry args={[4.4, 5.25, 2.6, 24]} />
        </mesh>
        {/* 尾翼 */}
        {finAngles.map((a) => (
          <mesh key={a} material={white} position={[Math.cos(a) * 5.3, 1.2, Math.sin(a) * 5.3]} rotation={[0, -a, 0]}>
            <boxGeometry args={[1.4, 5.5, 0.5]} />
          </mesh>
        ))}
        {/* F-1 喷口 */}
        {f1Positions.map((p, i) => (
          <mesh key={i} material={bell} position={p}>
            <coneGeometry args={[1.75, 3.6, 14, 1, true]} />
          </mesh>
        ))}
        <Flame length={60} radius={5.2} core="#fff3d0" edge="#ff7a26" visibleRef={flameS1} />
      </group>
      {/* S-II 二级：42–67 m，白体 + 顶部黑环 */}
      <group ref={stageRefs.s2}>
        <mesh material={white} position={[0, 51, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 18, 24]} />
        </mesh>
        <mesh material={black} position={[0, 64, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 6, 24]} />
        </mesh>
        <mesh material={metal} position={[0, 41, 0]}>
          <cylinderGeometry args={[4.2, 4.9, 2.4, 24]} />
        </mesh>
        <group position={[0, 42, 0]}>
          <Flame length={34} radius={4.2} core="#f4f8ff" edge="#5d8fff" visibleRef={flameS2} />
        </group>
      </group>
      {/* S-IVB 三级 + SLA：67–96 m */}
      <group ref={stageRefs.s3}>
        <mesh material={white} position={[0, 76, 0]}>
          <cylinderGeometry args={[3.3, 3.3, 18, 20]} />
        </mesh>
        <mesh material={black} position={[0, 86.5, 0]}>
          <cylinderGeometry args={[3.3, 3.3, 3, 20]} />
        </mesh>
        {/* SLA 渐缩舱罩 */}
        <mesh material={white} position={[0, 92, 0]}>
          <cylinderGeometry args={[1.95, 3.3, 8, 20]} />
        </mesh>
        <group position={[0, 67, 0]}>
          <Flame length={22} radius={2.6} core="#f4f8ff" edge="#4d7dff" visibleRef={flameS3} />
        </group>
      </group>
      {/* CSM + 逃逸塔：96–111 m（银色服务舱 + 指令舱锥 + 白色逃逸塔） */}
      <group ref={stageRefs.csm}>
        <mesh material={metal} position={[0, 99.7, 0]}>
          <cylinderGeometry args={[1.95, 1.95, 7.4, 16]} />
        </mesh>
        <mesh material={white} position={[0, 105.2, 0]}>
          <cylinderGeometry args={[0.5, 1.95, 3.6, 16]} />
        </mesh>
        <mesh material={white} position={[0, 109, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 4.4, 8]} />
        </mesh>
        <mesh material={white} position={[0, 111.4, 0]}>
          <coneGeometry args={[0.7, 1.6, 8]} />
        </mesh>
        {/* 逃逸塔鸭翼 */}
        <mesh material={white} position={[0, 107.6, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[2.4, 0.5, 0.12]} />
        </mesh>
        <group position={[0, 96, 0]}>
          <Flame length={55} radius={3.2} core="#f6f9ff" edge="#3d6dff" visibleRef={flameCsm} />
        </group>
      </group>
    </group>
  )
}

type Debris = {
  posKm: [number, number, number]
  velKms: [number, number, number]
  tSep: number
  tumble: THREE.Vector3
}

/** 飞船：位置/姿态/级段/尾焰/分离残骸，全部由任务采样驱动 */
function Craft({ simRef, trueScale }: { simRef: React.MutableRefObject<SimRefs>; trueScale: boolean }) {
  const rootRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const s1 = useRef<THREE.Group>(null)
  const s2 = useRef<THREE.Group>(null)
  const s3 = useRef<THREE.Group>(null)
  const csm = useRef<THREE.Group>(null)
  const flameS1 = useRef(0)
  const flameS2 = useRef(0)
  const flameS3 = useRef(0)
  const flameCsm = useRef(0)
  const lenRef = useRef(111)
  const centerRef = useRef(55)
  const lightRef = useRef<THREE.PointLight>(null)
  const debrisRef = useRef<{ s1?: Debris; s2?: Debris; s3?: Debris }>({})
  const tmpPos = useRef(new THREE.Vector3())
  const tmpVel = useRef(new THREE.Vector3())
  const targetQuat = useRef(new THREE.Quaternion())
  const upVec = useRef(new THREE.Vector3(0, 1, 0))
  const dirVec = useRef(new THREE.Vector3())
  const camVec = useRef(new THREE.Vector3())

  const flameTargets = (burn: BurnKind): [number, number, number, number] => {
    switch (burn) {
      case 'launch':
        return [1, 0, 0, 0]
      case 'stage2':
        return [0, 1, 0, 0]
      case 'tli':
        return [0, 0, 1, 0]
      case 'loi':
        return [0, 0, 0, 1]
      case 'puff':
        return [0, 0, 0, 0.45]
      default:
        return [0, 0, 0, 0]
    }
  }

  useFrame(({ camera }, delta) => {
    const root = rootRef.current
    const model = modelRef.current
    if (!root || !model) return
    const sim = simRef.current
    const s = sim.sample
    kmToUnits(s.pos, tmpPos.current)
    root.position.copy(tmpPos.current)

    // 姿态：发射台/起飞初段沿径向；之后沿速度方向；LOI 刹车时掉头（发动机朝前）
    kmToUnits(s.vel, tmpVel.current)
    const speedLen = tmpVel.current.length()
    if (s.phase === 'pad' || (s.phase === 'ascent' && s.t < 12) || speedLen < 1e-6) {
      dirVec.current.copy(PAD_DIR)
    } else if (s.burn === 'loi') {
      dirVec.current.copy(tmpVel.current).normalize().negate()
    } else {
      dirVec.current.copy(tmpVel.current).normalize()
    }
    targetQuat.current.setFromUnitVectors(upVec.current, dirVec.current)
    // 发射台上立即就位（故事开场就是立好的火箭），之后平滑转向
    if (s.phase === 'pad') root.quaternion.copy(targetQuat.current)
    else root.quaternion.slerp(targetQuat.current, 0.06)

    // 屏幕空间恒尺寸：真实尺寸在地月尺度不可见，按「当前船体长度」归一化放大，
    // 使全箭 / 末级 / CSM 在各阶段都保持相近的屏幕主角尺寸（分离时平滑过渡）；
    // 放大必须绕当前船体中心膨胀（否则 CSM 的 +96 m 局部偏移会被放大到偏离锚点）。
    camVec.current.copy(camera.position).sub(tmpPos.current)
    const dist = camVec.current.length()
    const targetLen = s.stage >= 3 ? 111 : s.stage >= 2 ? 69 : s.stage >= 1 ? 44 : 15
    lenRef.current += (targetLen - lenRef.current) * Math.min(1, delta * 2.5)
    const boost = trueScale ? 1 : Math.max(1, (dist * 6450) / lenRef.current)
    const scale = 0.00001 * boost
    model.scale.setScalar(scale)
    const targetCenter = s.stage >= 3 ? 55 : s.stage >= 2 ? 76.5 : s.stage >= 1 ? 89 : 103.5
    centerRef.current += (targetCenter - centerRef.current) * Math.min(1, delta * 2.5)
    // 真实比例（scale=1e-5）时锚点即箭底（发射台站姿），放大时过渡到船体中心
    model.position.y = -centerRef.current * (scale - 0.00001)
    if (import.meta.env.DEV) {
      const w = window as unknown as { __mvCraft?: () => unknown }
      w.__mvCraft = () => ({
        root: root.position.toArray(),
        scale: model.scale.x,
        dist,
        stage: s.stage,
        s1v: s1.current?.visible,
        s2v: s2.current?.visible,
        s3v: s3.current?.visible,
        csmv: csm.current?.visible,
      })
    }

    // 级段可见性与分离残骸
    const stage = s.stage
    if (s1.current) s1.current.visible = stage >= 3
    if (s2.current) s2.current.visible = stage >= 2
    if (s3.current) s3.current.visible = stage >= 1
    const seps: Array<['s1' | 's2' | 's3', number]> = [
      ['s1', T_S1_SEP],
      ['s2', T_S2_SEP],
      ['s3', T_S4B_SEP],
    ]
    for (const [key, tSep] of seps) {
      const store = debrisRef.current
      if (s.t >= tSep && !store[key]) {
        store[key] = {
          posKm: [...s.pos] as [number, number, number],
          velKms: [...s.vel] as [number, number, number],
          tSep,
          tumble: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        }
      }
      if (s.t < tSep) delete store[key]
    }

    // 尾焰强度目标
    const [f1, f2, f3, f4] = flameTargets(s.burn)
    flameS1.current = stage >= 3 ? f1 : 0
    flameS2.current = stage >= 2 ? f2 : 0
    flameS3.current = stage >= 1 ? f3 : 0
    flameCsm.current = f4

    // 点火点光（低空最明显，随高度衰减）。
    // 注意：three 的物理衰减把 decay>0 的 falloff 钳在 1/max(d^decay, 0.01)，
    // 在我们的世界单位（1 = 100 km）下会形成数公里的均匀过曝区——
    // 所以用 decay=0 + 硬 cutoff：范围内均匀补光、边缘平滑收尾。
    if (lightRef.current) {
      const altKm = s.altKm
      const nearPad = s.burn === 'launch' && altKm < 90
      const burning = s.burn !== 'none'
      // TLI / LOI 主发动机点火：尾焰高亮一个档位，配合相机推近
      const burnBoost = s.burn === 'tli' || s.burn === 'loi' ? 1.6 : 0.9
      lightRef.current.intensity = nearPad ? 5.5 * Math.max(0, 1 - altKm / 90) : burning ? burnBoost : 0
      lightRef.current.distance = nearPad ? 0.008 : 0.0012
    }
  })

  return (
    <>
      <group ref={rootRef}>
        <group ref={modelRef}>
          <SaturnV stageRefs={{ s1, s2, s3, csm }} flameS1={flameS1} flameS2={flameS2} flameS3={flameS3} flameCsm={flameCsm} />
        </group>
        <pointLight ref={lightRef} color="#ffb268" intensity={0} decay={0} />
      </group>
      {/* 分离残骸（场景级，不随飞船旋转）：捕获分离时刻状态，漂离 + 翻滚 + 淡出 */}
      {(['s1', 's2', 's3'] as const).map((key) => (
        <DebrisStage key={key} id={key} simRef={simRef} debrisRef={debrisRef} />
      ))}
    </>
  )
}

function DebrisStage({
  id,
  simRef,
  debrisRef,
}: {
  id: 's1' | 's2' | 's3'
  simRef: React.MutableRefObject<SimRefs>
  debrisRef: React.MutableRefObject<{ s1?: Debris; s2?: Debris; s3?: Debris }>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const mats = useMemo(
    () => ({
      white: new THREE.MeshStandardMaterial({ color: '#e8e7e2', roughness: 0.6, transparent: true }),
      black: new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.6, transparent: true }),
    }),
    [],
  )
  const tmp = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    const g = groupRef.current
    if (!g) return
    const d = debrisRef.current[id]
    if (!d) {
      g.visible = false
      return
    }
    const since = simRef.current.t - d.tSep
    if (since < 0 || since > 420) {
      g.visible = false
      return
    }
    g.visible = true
    tmp.current.set(
      (d.posKm[0] + d.velKms[0] * since * 0.8) / KM_PER_UNIT,
      (d.posKm[1] + d.velKms[1] * since * 0.8) / KM_PER_UNIT,
      (d.posKm[2] + d.velKms[2] * since * 0.8) / KM_PER_UNIT,
    )
    g.position.copy(tmp.current)
    g.rotateOnAxis(d.tumble, 0.004)
    const fade = Math.max(0, 1 - since / 420)
    mats.white.opacity = fade
    mats.black.opacity = fade
    // 与主模型相同的屏幕尺寸增强（系数更大：分离的两截箭体是故事第 2 幕的看点）
    const boost = Math.max(1, camera.position.distanceTo(tmp.current) * 96)
    g.scale.setScalar(0.00001 * boost)
  })
  const body =
    id === 's1' ? (
      <group>
        <mesh material={mats.white} position={[0, 18, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 36, 16]} />
        </mesh>
        <mesh material={mats.black} position={[0, 38.5, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 7, 16]} />
        </mesh>
      </group>
    ) : id === 's2' ? (
      <group>
        <mesh material={mats.white} position={[0, 51, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 18, 16]} />
        </mesh>
        <mesh material={mats.black} position={[0, 64, 0]}>
          <cylinderGeometry args={[5.05, 5.05, 6, 16]} />
        </mesh>
      </group>
    ) : (
      <group>
        <mesh material={mats.white} position={[0, 76, 0]}>
          <cylinderGeometry args={[3.3, 3.3, 18, 16]} />
        </mesh>
        <mesh material={mats.white} position={[0, 92, 0]}>
          <cylinderGeometry args={[1.95, 3.3, 8, 16]} />
        </mesh>
      </group>
    )
  return (
    <group ref={groupRef} visible={false}>
      {body}
    </group>
  )
}

// ---------------------------------------------------------------------------
// 发射台局部场景（LC-39 风格：草地+海面切平面 + 混凝土坪火焰槽 + 灰色桁架塔
// + 避雷针 + 低云 + 烟雾；随飞船高度在 ~14–80 km 间整体淡出，露出真实地球曲面）

/** 程序化地面贴图：肯尼迪角 LC-39 真实布局——东侧大西洋直线海岸 + 沙滩、
 *  西侧 Banana River 泻湖、草地/灌木色斑、VAB → 39A/39B 的 Y 形爬行道。
 *  画布映射：canvas_x = (local_x + 0.12)/0.24·S，canvas_y = (local_z + 0.12)/0.24·S；
 *  东（发射下程方向 +z）在画布下方，北在画布左方。 */
function makeGroundTexture() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  // 草地基底
  ctx.fillStyle = '#436030'
  ctx.fillRect(0, 0, S, S)
  // 草地/灌木绿色变化块
  const patches = ['#3a522b', '#4f6a3a', '#566b3c', '#415a2f', '#616938', '#374d2a', '#5a6f42']
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * S
    const y = Math.random() * S
    const r = 3 + Math.random() * 30
    ctx.fillStyle = patches[Math.floor(Math.random() * patches.length)]
    ctx.globalAlpha = 0.13 + Math.random() * 0.26
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const water = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, '#3a6d99')
    g.addColorStop(0.45, '#2a5a80')
    g.addColorStop(1, '#1d4260')
    return g
  }
  const wavelets = (region: () => void) => {
    ctx.save()
    ctx.beginPath()
    region()
    ctx.clip()
    ctx.globalAlpha = 0.1
    ctx.strokeStyle = '#bcd6e4'
    for (let i = 0; i < 150; i++) {
      const y = Math.random() * S
      const x = Math.random() * S
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 18, y - 3, x + 38, y)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  // Banana River 泻湖（西 = 画布上方，蜿蜒的窄长水面）
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(S, 0)
  ctx.lineTo(S, S * 0.1)
  ctx.bezierCurveTo(S * 0.82, S * 0.15, S * 0.66, S * 0.08, S * 0.5, S * 0.14)
  ctx.bezierCurveTo(S * 0.36, S * 0.19, S * 0.22, S * 0.11, S * 0.08, S * 0.16)
  ctx.lineTo(0, S * 0.13)
  ctx.closePath()
  ctx.fillStyle = water(0, 0, 0, S * 0.2)
  ctx.fill()
  wavelets(() => {
    ctx.moveTo(0, 0)
    ctx.lineTo(S, 0)
    ctx.lineTo(S, S * 0.1)
    ctx.bezierCurveTo(S * 0.82, S * 0.15, S * 0.66, S * 0.08, S * 0.5, S * 0.14)
    ctx.bezierCurveTo(S * 0.36, S * 0.19, S * 0.22, S * 0.11, S * 0.08, S * 0.16)
    ctx.lineTo(0, S * 0.13)
    ctx.closePath()
  })

  // 大西洋（东 = 画布下方）：接近直线的海岸线，略倾斜
  const coastY = (x: number) => S * 0.6 + (x - S * 0.5) * 0.06
  ctx.beginPath()
  ctx.moveTo(0, S)
  ctx.lineTo(S, S)
  ctx.lineTo(S, coastY(S))
  ctx.lineTo(0, coastY(0))
  ctx.closePath()
  ctx.fillStyle = water(0, S * 0.6, 0, S)
  ctx.fill()
  wavelets(() => {
    ctx.moveTo(0, S)
    ctx.lineTo(S, S)
    ctx.lineTo(S, coastY(S))
    ctx.lineTo(0, coastY(0))
    ctx.closePath()
  })
  // 沙滩沿（海岸线亮带）
  ctx.strokeStyle = '#c9b789'
  ctx.lineWidth = 9
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.moveTo(0, coastY(0))
  ctx.lineTo(S, coastY(S))
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.lineWidth = 1

  // Y 形爬行道（VAB → 交汇点 → 39A / 39B）：浅砾石双带
  const vab = { x: S * 0.63, y: S * 0.3 }
  const junction = { x: S * 0.5, y: S * 0.385 }
  const padA = { x: S * 0.5, y: S * 0.5 }
  const padB = { x: S * 0.41, y: S * 0.44 }
  const crawlerway = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    ctx.strokeStyle = '#8d8168'
    ctx.lineWidth = 13
    ctx.globalAlpha = 0.92
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.strokeStyle = '#7c7159'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineWidth = 1
  }
  crawlerway(vab, junction)
  crawlerway(junction, padA)
  crawlerway(junction, padB)

  // VAB：世界最大单体建筑之一——白色长方体 + 淡蓝窗带（3D 场景中还有立体块）
  ctx.save()
  ctx.translate(vab.x, vab.y)
  ctx.fillStyle = '#e8eaec'
  ctx.globalAlpha = 0.95
  ctx.fillRect(-S * 0.011, -S * 0.008, S * 0.022, S * 0.016)
  ctx.fillStyle = '#9fc3dd'
  ctx.fillRect(-S * 0.011, -S * 0.0015, S * 0.022, S * 0.003)
  ctx.restore()
  ctx.globalAlpha = 1

  // 39B 发射位混凝土 apron（39A 的中心 apron 由下方径向渐变绘制）
  const apronAt = (p: { x: number; y: number }, r: number) => {
    const ap = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    ap.addColorStop(0, 'rgba(158,160,158,0.95)')
    ap.addColorStop(0.75, 'rgba(150,152,150,0.7)')
    ap.addColorStop(1, 'rgba(150,152,150,0)')
    ctx.fillStyle = ap
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  apronAt(padB, S * 0.022)
  apronAt(padA, S * 0.075)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function LaunchPad({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  const groupRef = useRef<THREE.Group>(null)
  const orientation = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), PAD_DIR)
    return q
  }, [])

  const cloudTex = useMemo(() => makeGlowTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)'), [])
  const smokeTexture = cloudTex
  const groundTex = useMemo(() => makeGroundTexture(), [])
  const groundAlphaTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.72, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  // 需要随高度淡出的材质登记表（base = 原始不透明度）
  const fadeMats = useMemo<Array<{ mat: THREE.Material; base: number }>>(() => [], [])

  const groundMat = useMemo(() => {
    // Lambert（纯漫反射）：Standard 材质在掠射角下 Fresnel 泛光会把整片地面洗白
    const m = new THREE.MeshLambertMaterial({ map: groundTex, color: '#b8c0b0', transparent: true, alphaMap: groundAlphaTex })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [groundTex, groundAlphaTex, fadeMats])
  const concreteMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#a4a8ab', roughness: 0.85, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])
  const trenchMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#3c3f43', roughness: 0.95, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])
  const steelMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#8b929c', roughness: 0.55, metalness: 0.3, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])
  const armMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#e6e3da', roughness: 0.6, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])
  const vabMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#e9ebee', roughness: 0.7, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])
  const vabBandMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#9fc3dd', roughness: 0.5, transparent: true })
    fadeMats.push({ mat: m, base: 1 })
    return m
  }, [fadeMats])

  // 低云广告牌
  const clouds = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; scale: number; mat: THREE.SpriteMaterial }> = []
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.012 + Math.random() * 0.05
      const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.15, depthWrite: false })
      fadeMats.push({ mat, base: 0.15 })
      arr.push({
        pos: [Math.cos(a) * r, 0.009 + Math.random() * 0.016, Math.sin(a) * r],
        scale: 0.005 + Math.random() * 0.006,
        mat,
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudTex])

  // 烟雾粒子池
  const SMOKE_N = 260
  const smoke = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(SMOKE_N * 3)
    const alpha = new Float32Array(SMOKE_N)
    const size = new Float32Array(SMOKE_N)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: smokeTexture }, uPxScale: { value: 800 }, uFade: { value: 1 } },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        uniform float uPxScale;
        varying float vAlpha;
          #include <common>
          #include <logdepthbuf_pars_vertex>
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uPxScale / -mv.z);
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uFade;
        varying float vAlpha;
          #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          vec4 tex = texture2D(uMap, gl_PointCoord);
          // 灰褐烟尘（真实发射烟不是纯白）
          gl_FragColor = vec4(tex.rgb * vec3(0.78, 0.74, 0.7), tex.a * vAlpha * uFade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
    const particles = Array.from({ length: SMOKE_N }, () => ({
      life: -1,
      maxLife: 1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      size: 0,
    }))
    return { geo, mat, particles, cursor: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reducedMotion = useRef(
    typeof window !== 'undefined' && false,
  )
  const glowRef = useRef<THREE.SpriteMaterial>(null)

  useFrame(({ camera, size, viewport }, delta) => {
    const s = simRef.current.sample
    const dt = Math.min(delta, 0.1)
    const spawning =
      s.burn === 'launch' && s.t < 40 && simRef.current.playing && !reducedMotion.current
    const persp = camera as THREE.PerspectiveCamera
    smoke.mat.uniforms.uPxScale.value =
      (size.height * viewport.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2))

    // 高度淡出：~14 km 开始透明，~80 km 完全隐藏（只在地表附近存在的人工场景）
    const altKm = s.nearBody === 'earth' ? s.altKm : 1e9
    const fade = 1 - THREE.MathUtils.smoothstep(altKm, 14, 80)
    smoke.mat.uniforms.uFade.value = fade
    for (const { mat, base } of fadeMats) {
      ;(mat as THREE.MeshStandardMaterial).opacity = base * fade
    }
    if (groupRef.current) groupRef.current.visible = fade > 0.002

    if (glowRef.current) {
      const glowTarget = s.burn === 'launch' && s.altKm < 1.5 ? 0.38 + 0.14 * Math.random() : 0
      glowRef.current.opacity += (glowTarget - glowRef.current.opacity) * 0.2
    }
    const posAttr = smoke.geo.attributes.position as THREE.BufferAttribute
    const alphaAttr = smoke.geo.attributes.aAlpha as THREE.BufferAttribute
    const sizeAttr = smoke.geo.attributes.aSize as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const alphaArr = alphaAttr.array as Float32Array
    const sizeArr = sizeAttr.array as Float32Array

    if (spawning) {
      let toSpawn = Math.floor(210 * dt)
      while (toSpawn-- > 0) {
        const p = smoke.particles[smoke.cursor]
        smoke.cursor = (smoke.cursor + 1) % SMOKE_N
        const a = Math.random() * Math.PI * 2
        // 在火箭底部外圈生成、贴地向四周翻滚，中间留出看清箭体与火焰的通道
        const r = 0.0005 + Math.random() * 0.001
        p.pos.set(Math.cos(a) * r, 0.00005, Math.sin(a) * r)
        const speed = 0.00025 + Math.random() * 0.0004
        p.vel.set(Math.cos(a) * speed, 0.00003 + Math.random() * 0.00007, Math.sin(a) * speed)
        p.life = 0
        p.maxLife = 1.6 + Math.random() * 1.6
        p.size = 0.00022 + Math.random() * 0.00038
      }
    }
    for (let i = 0; i < SMOKE_N; i++) {
      const p = smoke.particles[i]
      if (p.life < 0) {
        alphaArr[i] = 0
        continue
      }
      p.life += dt
      if (p.life >= p.maxLife) {
        p.life = -1
        alphaArr[i] = 0
        continue
      }
      p.pos.addScaledVector(p.vel, dt)
      p.vel.y *= 0.995
      const u = p.life / p.maxLife
      posArr[i * 3] = p.pos.x
      posArr[i * 3 + 1] = p.pos.y
      posArr[i * 3 + 2] = p.pos.z
      alphaArr[i] = 0.16 * (1 - u) * Math.min(1, u * 8)
      sizeArr[i] = p.size * (0.7 + u * 1.1)
    }
    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={PAD_POS_UNITS} quaternion={orientation}>
      {/* 地面切平面（草地+海面贴图，大半径 + 边缘羽化，融进远处地球表面） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.00004, 0]} material={groundMat}>
        <circleGeometry args={[0.12, 64]} />
      </mesh>
      {/* 混凝土发射坪 */}
      <mesh position={[0, 0.000035, 0]} material={concreteMat}>
        <boxGeometry args={[0.0016, 0.00007, 0.0016]} />
      </mesh>
      {/* 火焰导流槽（坪体中央凹槽） */}
      <mesh position={[0, 0.000071, 0]} material={trenchMat}>
        <boxGeometry args={[0.0009, 0.000012, 0.00034]} />
      </mesh>
      {/* 服务塔：灰色钢桁架（双立柱 + 多层平台 + 顶部吊臂） + 白色摆臂伸向火箭 */}
      <group position={[0.00055, 0, 0.00045]}>
        {[-0.00011, 0.00011].map((x) => (
          <mesh key={x} position={[x, 0.00055, 0]} material={steelMat}>
            <boxGeometry args={[0.00006, 0.0011, 0.00006]} />
          </mesh>
        ))}
        {[0.00016, 0.00036, 0.00056, 0.00076, 0.00096].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={steelMat}>
            <boxGeometry args={[0.00028, 0.000032, 0.0002]} />
          </mesh>
        ))}
        {/* 顶部锤头吊臂 */}
        <mesh position={[-0.0002, 0.00112, 0]} material={steelMat}>
          <boxGeometry args={[0.00046, 0.000045, 0.00005]} />
        </mesh>
        {/* 摆臂（白）伸向火箭：S-IC 中部 / S-II / CSM 三处 */}
        {[0.00035, 0.0006, 0.00092].map((y) => (
          <mesh key={y} position={[0.00024 - 0.00055, y, 0.0002 - 0.00045]} rotation={[0, 2.46, 0]} material={armMat}>
            <boxGeometry args={[0.0005, 0.00004, 0.00006]} />
          </mesh>
        ))}
      </group>
      {/* 避雷针（西南侧，浅灰细杆 + 拉线顶） */}
      <mesh position={[-0.0007, 0.00065, -0.0006]} material={steelMat}>
        <cylinderGeometry args={[0.00002, 0.00004, 0.0013, 6]} />
      </mesh>
      {/* VAB 垂直总装大楼（39A 西南约 5.7 km，白色巨块 + 淡蓝窗带） */}
      <group position={[0.031, 0, -0.048]}>
        <mesh position={[0, 0.0008, 0]} material={vabMat}>
          <boxGeometry args={[0.0022, 0.0016, 0.0016]} />
        </mesh>
        <mesh position={[0, 0.00095, 0]} material={vabBandMat}>
          <boxGeometry args={[0.00224, 0.00016, 0.00164]} />
        </mesh>
      </group>
      {/* 点火地面辉光 */}
      <sprite position={[0, 0.0001, 0]} scale={[0.0032, 0.0018, 1]}>
        <spriteMaterial ref={glowRef} map={cloudTex} color="#ffb268" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* 低云 */}
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale * 2.6, c.scale, 1]} material={c.mat} />
      ))}
      {/* 烟雾 */}
      <points geometry={smoke.geo} material={smoke.mat} frustumCulled={false} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// 相机

function CameraRig({
  simRef,
  mode,
  phase,
  followDist,
  autoOrbit,
  lastInputRef,
  onUserControl,
}: {
  simRef: React.MutableRefObject<SimRefs>
  mode: Shot
  phase: MissionPhase
  followDist: number
  /** 自由模式空闲自动环绕开关 */
  autoOrbit: boolean
  /** 最后一次用户输入时间戳（performance.now()） */
  lastInputRef: React.MutableRefObject<number>
  onUserControl: () => void
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const tweenRef = useRef<{
    fromPos: THREE.Vector3
    toPos: THREE.Vector3
    fromTgt: THREE.Vector3
    toTgt: THREE.Vector3
    t: number
    dur: number
  } | null>(null)
  const userZoomedRef = useRef(false)
  const lastModeRef = useRef<Shot | null>(null)
  const lastPhaseRef = useRef<MissionPhase | null>(null)
  const lastDistRef = useRef(0)
  const pushRef = useRef(1)
  const riseRef = useRef<{ elapsed: number; u: THREE.Vector3; perp: THREE.Vector3 } | null>(null)
  const tmp = useRef(new THREE.Vector3())
  const tmp2 = useRef(new THREE.Vector3())
  // 相机 up 过渡与 wide 机位方位锁定用的暂存向量
  const upDesired = useRef(new THREE.Vector3(1, 0, 0))
  const upQuat = useRef(new THREE.Quaternion())
  const upIdentity = useRef(new THREE.Quaternion())
  const lockMoon = useRef(new THREE.Vector3())
  const lockIdeal = useRef(new THREE.Vector3())
  const lockCur = useRef(new THREE.Vector3())
  const distTmp = useRef(new THREE.Vector3())
  const reducedMotion = useRef(
    typeof window !== 'undefined' && false,
  )

  const targetPos = useCallback(
    (out: THREE.Vector3) => {
      const s = simRef.current.sample
      if (mode === 'earth' || mode === 'lookback' || mode === 'earthrise') return out.set(0, 0, 0)
      if (mode === 'moon') return kmToUnits(s.moonPos, out)
      if (mode === 'wide') {
        kmToUnits(s.moonPos, out)
        return out.multiplyScalar(0.5)
      }
      if (mode === 'top') return out.set(0, 0, 0)
      return kmToUnits(s.pos, out)
    },
    [mode, simRef],
  )

  const desiredDist = useCallback(() => {
    if (mode === 'earth') return EARTH_R * 3.2
    if (mode === 'moon') return MOON_R * 4
    if (mode === 'wide') {
      // 按视口宽高比装下整个地月跨度：竖屏水平半视角很窄，需要远得多的机位
      const persp = camera as THREE.PerspectiveCamera
      const tanV = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2)
      const half = kmToUnits(simRef.current.sample.moonPos, distTmp.current).length() * 0.5
      return Math.max(2600, (half * 1.35) / (tanV * persp.aspect))
    }
    if (mode === 'top') {
      const persp = camera as THREE.PerspectiveCamera
      const tanV = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2)
      const orbitR = kmToUnits(simRef.current.sample.moonPos, distTmp.current).length()
      return Math.max(8600, (orbitR * 1.12) / (tanV * persp.aspect))
    }
    if (mode === 'lookback') {
      const s = simRef.current.sample
      return s.distEarthKm / KM_PER_UNIT + EARTH_R * 1.15
    }
    if (mode === 'earthrise') return 3800
    return followDist
  }, [mode, followDist, simRef, camera])

  /** 机位方向：craft 月心段让月球入画；wide 垂直于地月连线且站到向阳一侧，让地球呈蓝球 */
  const viewDir = useCallback(
    (out: THREE.Vector3) => {
      const s = simRef.current.sample
      if (mode === 'top') {
        // 俯视：黄道面斜上方正交感，一屏装下地球 + 月球轨道圆 + 转移椭圆
        return out.set(0.28, 1, 0.34).normalize()
      }
      if (mode === 'lookback') {
        // 回望地球：站在飞船外侧，越过飞船看蓝色新月地球居中
        const radial = kmToUnits(s.pos, new THREE.Vector3()).normalize()
        return out.copy(radial).addScaledVector(new THREE.Vector3(0, 1, 0), 0.14).normalize()
      }
      if (mode === 'earthrise') return out.set(0.5, 0.42, 0.76).normalize() // 占位，实际由地出扫描驱动
      if (mode === 'wide') {
        // 地月连线的水平垂线机位，站到向阳一侧：两个天体都以被照亮的一面入画。
        // 配合 camera.up = −y 的 180° 滚转，画面里地球在左、月亮在右。
        const moon = kmToUnits(s.moonPos, new THREE.Vector3())
        const side = new THREE.Vector3(moon.z, 0, -moon.x)
        if (side.lengthSq() < 1e-9) side.set(0, 0, 1)
        return out.copy(side.normalize()).addScaledVector(UP_Y, 0.22).normalize()
      }
      if (mode === 'craft' && s.phase === 'pad') {
        // 发射台设计机位：略高的侧向俯视（向阳一侧看亮面箭体；点火烟团沉在画面下缘）
        return out.set(0.001, 0.0042, 0.0052).normalize()
      }
      if (mode === 'craft' && s.phase === 'ascent') {
        // 上升段：起飞初段保持发射台低角度（火箭从镜头前升起），随后过渡到
        // 侧向追逐，高空再抬到外侧俯视——火箭衬着地球弧线。
        const radial = kmToUnits(s.pos, new THREE.Vector3()).normalize()
        const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), radial)
        if (east.lengthSq() < 1e-9) east.set(0, 0, 1)
        east.normalize()
        const side = new THREE.Vector3().crossVectors(radial, east).normalize()
        // 径向系数按高度门控：>2 km 才允许抬到火箭外侧，永远不穿到地面以下
        const k = THREE.MathUtils.smoothstep(s.altKm, 2, 60)
        const radialK = THREE.MathUtils.lerp(0.04, 0.52, k)
        const chase = new THREE.Vector3()
          .copy(east)
          .multiplyScalar(-0.9)
          .addScaledVector(radial, radialK)
          .addScaledVector(side, 0.3)
          .normalize()
        // 0–4 km 从发射台机位平滑混入追逐机位
        const blend = THREE.MathUtils.smoothstep(s.altKm, 0.5, 4)
        return out.set(0.001, 0.0042, 0.0052).normalize().lerp(chase, blend).normalize()
      }
      if (mode === 'craft' && (s.phase === 'orbit' || s.phase === 'tli')) {
        // 停泊轨道/TLI：略高于飞船的外侧俯视，地球在脚下占下半屏——
        // 视角更俯视可减轻地表贴图在掠射角的 mip 模糊与彩色拖影
        const radial = kmToUnits(s.pos, new THREE.Vector3()).normalize()
        const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), radial)
        if (east.lengthSq() < 1e-9) east.set(0, 0, 1)
        east.normalize()
        const side = new THREE.Vector3().crossVectors(radial, east).normalize()
        return out
          .copy(radial)
          .multiplyScalar(0.58)
          .addScaledVector(east, -0.68)
          .addScaledVector(side, 0.34)
          .normalize()
      }
      if (mode === 'craft' && (s.phase === 'approach' || s.phase === 'loi' || s.phase === 'lunar')) {
        const craft = kmToUnits(s.pos, new THREE.Vector3())
        const moon = kmToUnits(s.moonPos, new THREE.Vector3())
        const away = craft.clone().sub(moon).normalize()
        const velDir = kmToUnits(s.vel, new THREE.Vector3())
        if (velDir.lengthSq() < 1e-12) velDir.copy(away)
        velDir.normalize()
        // 月心段：侧后机位——LOI 刹车时发动机朝前、尾焰沿速度方向喷出，
        // 从侧后方能看到逆向尾焰锥；月球保持在背景里，向阳侧优先
        const sideV = new THREE.Vector3().crossVectors(velDir, away)
        if (sideV.lengthSq() < 1e-9) sideV.set(0, 1, 0)
        sideV.normalize()
        if (sideV.dot(SUN_DIR) < 0) sideV.negate()
        return out
          .copy(sideV)
          .multiplyScalar(0.72)
          .addScaledVector(away, 0.5)
          .addScaledVector(velDir, -0.32)
          .add(new THREE.Vector3(0, 0.22, 0))
          .normalize()
      }
      if (mode === 'craft') return out.set(0.55, 0.45, 0.72).normalize()
      return out.set(0.5, 0.42, 0.76).normalize()
    },
    [mode, simRef],
  )

  // 模式/阶段切换：缓动转场；首次挂载直接落位（初始机位已是发射台近景）
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const tgt = targetPos(new THREE.Vector3())
    const dist = desiredDist()
    if (lastModeRef.current === null) {
      controls.target.copy(tgt)
      controls.update()
      lastModeRef.current = mode
      lastPhaseRef.current = phase
      return
    }
    const modeChanged = lastModeRef.current !== mode
    const phaseChanged = lastPhaseRef.current !== null && lastPhaseRef.current !== phase
    if (!modeChanged && !phaseChanged) return
    // 仅阶段变化：craft 模式下用户没手动动过相机才顺新机位
    if (!modeChanged) {
      if (mode !== 'craft' || userZoomedRef.current) {
        lastPhaseRef.current = phase
        return
      }
    }
    userZoomedRef.current = false
    const dir = viewDir(new THREE.Vector3())
    const toPos = tgt.clone().add(dir.multiplyScalar(dist))
    tweenRef.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromTgt: controls.target.clone(),
      toTgt: tgt,
      t: 0,
      dur: 1.6,
    }
    lastModeRef.current = mode
    lastPhaseRef.current = phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase])

  // 跟随距离随阶段变化（用户未缩放时）
  useEffect(() => {
    if (Math.abs(followDist - lastDistRef.current) / Math.max(followDist, 1e-6) > 0.4) {
      userZoomedRef.current = false
    }
    lastDistRef.current = followDist
  }, [followDist])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    const s = simRef.current.sample

    // 相机 up 分场景平滑过渡（OrbitControls.update 每帧用当前 up 重建参考系）：
    // 发射台/上升段沿当地径向（地平线自然在下方）；wide 用 −y 滚转，与向阳机位
    // 配合得到「地球左 · 月亮右」；地出贴月面用当地月面法线，保持月平线水平；
    // 其余机位一律世界 +y（任务平面在画面里保持水平，地月连线不再竖过来）。
    if (mode === 'earthrise') {
      kmToUnits(s.moonPos, tmp.current)
      upDesired.current.copy(camera.position).sub(tmp.current).normalize()
    } else if (mode === 'wide') {
      upDesired.current.set(0, -1, 0)
    } else if (mode === 'craft' && (s.phase === 'pad' || s.phase === 'ascent')) {
      upDesired.current.set(s.pos[0], s.pos[1], s.pos[2]).normalize()
    } else {
      upDesired.current.copy(UP_Y)
    }
    if (camera.up.distanceToSquared(upDesired.current) > 1e-6) {
      upQuat.current.setFromUnitVectors(camera.up, upDesired.current)
      upIdentity.current.identity().slerp(upQuat.current, Math.min(1, delta * 1.6))
      camera.up.applyQuaternion(upIdentity.current).normalize()
    }

    // 地出机位：贴近月面、盯住地球，相机沿月平线缓慢扫出让地球升起
    if (mode === 'earthrise') {
      tweenRef.current = null
      const moonC = kmToUnits(s.moonPos, tmp.current)
      if (!riseRef.current) {
        const u = moonC.clone().negate().normalize() // 月球 → 地球
        const perp = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 1, 0))
        if (perp.lengthSq() < 1e-9) perp.set(1, 0, 0)
        perp.normalize()
        // 取向阳侧的切点，保证脚下月面被太阳照亮
        if (perp.dot(SUN_DIR) < 0) perp.negate()
        riseRef.current = { elapsed: 0, u, perp }
      }
      const rise = riseRef.current
      rise.elapsed += delta
      const sweep = THREE.MathUtils.smoothstep(Math.min(1, rise.elapsed / 5), 0, 1)
      const theta = THREE.MathUtils.lerp((-5 * Math.PI) / 180, (2.2 * Math.PI) / 180, sweep)
      tmp2.current
        .copy(rise.perp)
        .multiplyScalar(Math.cos(theta))
        .addScaledVector(rise.u, Math.sin(theta))
        .multiplyScalar(MOON_R + 0.4)
        .add(moonC)
      // 入场 1.5 s 内平滑飞入，之后锁定在随月球移动的扫描轨道上
      const k = rise.elapsed < 1.5 ? Math.min(1, delta * 2.4) : 1
      camera.position.lerp(tmp2.current, k)
      controls.target.set(0, 0, 0)
      controls.update()
      return
    }
    riseRef.current = null

    if (tweenRef.current) {
      const tw = tweenRef.current
      // 缓动两端整体跟随移动中的飞船：阶段切换的转场只插值相机相对位移，
      // 不被上升的火箭甩开（from/to 同步平移，转场期间飞船保持居中）
      targetPos(tmp.current)
      tmp2.current.copy(tmp.current).sub(tw.toTgt)
      if (tmp2.current.lengthSq() > 0) {
        tw.toTgt.add(tmp2.current)
        tw.toPos.add(tmp2.current)
        tw.fromTgt.add(tmp2.current)
        tw.fromPos.add(tmp2.current)
      }
      tw.t += delta / tw.dur
      const u = Math.min(tw.t, 1)
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
      camera.position.lerpVectors(tw.fromPos, tw.toPos, e)
      controls.target.lerpVectors(tw.fromTgt, tw.toTgt, e)
      if (tw.t >= 1) tweenRef.current = null
    } else {
      targetPos(tmp.current)
      const gap = tmp.current.distanceTo(controls.target)
      // 自愈：OrbitControls 被重建（HMR / 重挂载）或任务时间被跳段后，
      // 目标点与相机出现不可能的大偏移——整体重落位，而不是拖着旧偏移平移
      if (gap > Math.max(desiredDist() * 4, 0.02)) {
        const dir = viewDir(new THREE.Vector3())
        controls.target.copy(tmp.current)
        camera.position.copy(tmp.current).addScaledVector(dir, desiredDist())
        userZoomedRef.current = false
      } else {
        // 目标跟随：相机与目标一起平移，用户可绕动
        tmp2.current.copy(tmp.current).sub(controls.target)
        if (tmp2.current.lengthSq() > 0) {
          controls.target.add(tmp2.current)
          camera.position.add(tmp2.current)
        }
        // wide 方位锁定：滑行三天里月球公转约 40°，缓慢偏航追随，
        // 全程保持「地球左 · 月亮右」；用户拖拽/缩放后立即让位
        if (mode === 'wide' && !userZoomedRef.current) {
          kmToUnits(s.moonPos, lockMoon.current)
          lockIdeal.current.set(lockMoon.current.z, 0, -lockMoon.current.x)
          if (lockIdeal.current.lengthSq() > 1e-9) {
            lockIdeal.current.normalize()
            lockCur.current.copy(camera.position).sub(controls.target)
            lockCur.current.y = 0
            if (lockCur.current.lengthSq() > 1e-6) {
              lockCur.current.normalize()
              const sinA = lockCur.current.z * lockIdeal.current.x - lockCur.current.x * lockIdeal.current.z
              const angle = Math.atan2(sinA, lockCur.current.dot(lockIdeal.current))
              const step = angle * Math.min(1, delta * 1.2)
              camera.position.sub(controls.target).applyAxisAngle(UP_Y, step).add(controls.target)
            }
          }
        }
        // 自动距离（用户缩放后不再干预，直到下次模式/阶段变化）
        // 点火推近：TLI / LOI / 中途修正燃烧时轻微推进（+ 尾焰高亮），增加段落感
        const burning = s.burn === 'tli' || s.burn === 'loi' || s.burn === 'puff'
        const pushTarget = burning && mode === 'craft' && !userZoomedRef.current ? 0.93 : 1
        pushRef.current += (pushTarget - pushRef.current) * Math.min(1, delta * 1.8)
        if (!userZoomedRef.current) {
          const want = desiredDist() * pushRef.current
          const have = camera.position.distanceTo(controls.target)
          if (Math.abs(have - want) / want > 0.12) {
            tmp2.current.copy(camera.position).sub(controls.target).normalize()
            const next = THREE.MathUtils.lerp(have, want, Math.min(1, delta * 1.5))
            camera.position.copy(controls.target).addScaledVector(tmp2.current, next)
          }
        }
        // 空闲自动环绕：8 秒无输入后极缓慢绕目标旋转，任何输入即停。
        // wide/top 有固定构图职责（方位锁定/全览），不参与空闲环绕
        if (
          autoOrbit &&
          !reducedMotion.current &&
          mode !== 'lookback' &&
          mode !== 'wide' &&
          mode !== 'top' &&
          performance.now() - lastInputRef.current > 8000
        ) {
          tmp2.current.copy(camera.position).sub(controls.target)
          tmp2.current.applyAxisAngle(camera.up, 0.04 * delta)
          camera.position.copy(controls.target).add(tmp2.current)
        }
      }
    }

    controls.update()

    // 点火镜头震动（尊重减少动态偏好）
    if (!reducedMotion.current && s.burn === 'launch' && s.altKm < 30 && mode === 'craft') {
      const amp = 0.00004 * Math.max(0, 1 - s.altKm / 30)
      camera.position.x += (Math.random() - 0.5) * amp
      camera.position.y += (Math.random() - 0.5) * amp
      camera.position.z += (Math.random() - 0.5) * amp
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={0.00012}
      maxDistance={60000}
      onStart={() => {
        userZoomedRef.current = true
        tweenRef.current = null
        onUserControl()
      }}
    />
  )
}

/** 任务时钟推进（rAF 内写 ref，不触发 React 渲染） */
function MissionDriver({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  useFrame(({ camera }, delta) => {
    const sim = simRef.current
    const dt = Math.min(delta, 0.1)
    if (sim.playing) {
      sim.t = Math.min(sim.t + sim.speed * dt, T_STABLE + 3_000_000)
    }
    sim.sample = sampleMission(sim.t)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __mvCam?: () => number[] }).__mvCam = () => camera.position.toArray()
      const w = window as unknown as { __mvProbe?: () => unknown }
      w.__mvProbe = () => {
        const v = new THREE.Vector3(
          sim.sample.pos[0] / KM_PER_UNIT,
          sim.sample.pos[1] / KM_PER_UNIT,
          sim.sample.pos[2] / KM_PER_UNIT,
        )
        const ndc = v.clone().project(camera)
        const moon = new THREE.Vector3(
          sim.sample.moonPos[0] / KM_PER_UNIT,
          sim.sample.moonPos[1] / KM_PER_UNIT,
          sim.sample.moonPos[2] / KM_PER_UNIT,
        )
        const moonNdc = moon.clone().project(camera)
        const sun = new THREE.Vector3(0.656, 0.5, 0.755).normalize()
        const viewToMoon = moon.clone().sub(camera.position).normalize()
        return {
          craft: v.toArray(),
          cam: camera.position.toArray(),
          ndc: ndc.toArray(),
          moonNdc: moonNdc.toArray(),
          moonCamDist: moon.distanceTo(camera.position),
          visLitDot: viewToMoon.dot(sun),
          phase: sim.sample.phase,
        }
      }
    }
  })
  return null
}

// ---------------------------------------------------------------------------
// HUD / 铭牌（React 侧，低频同步）

type HudState = {
  phase: MissionPhase
  t: number
  speed: number
  altKm: number
  distMoonKm: number
  distEarthKm: number
  nearBody: 'earth' | 'moon'
}

function useHudSync(simRef: React.MutableRefObject<SimRefs>, onPhase: (p: MissionPhase, prev: MissionPhase) => void) {
  const [hud, setHud] = useState<HudState>(() => ({
    phase: 'pad',
    t: simRef.current.t,
    speed: 0,
    altKm: 0,
    distMoonKm: 0,
    distEarthKm: 0,
    nearBody: 'earth',
  }))
  const phaseRef = useRef<MissionPhase>('pad')
  const onPhaseRef = useRef(onPhase)
  onPhaseRef.current = onPhase
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = simRef.current.sample
      if (s.phase !== phaseRef.current) {
        const prev = phaseRef.current
        phaseRef.current = s.phase
        onPhaseRef.current(s.phase, prev)
      }
      setHud({
        phase: s.phase,
        t: s.t,
        speed: s.speedKms,
        altKm: s.altKm,
        distMoonKm: s.distMoonKm,
        distEarthKm: s.distEarthKm,
        nearBody: s.nearBody,
      })
    }, 200)
    return () => window.clearInterval(id)
  }, [simRef])
  return hud
}

// ---------------------------------------------------------------------------
// 主组件

export function MoonVoyage({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  // 自由优先：首次进入即发射台待命，故事只从 Freebar「故事」药丸重播
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID, { firstVisit: 'free' })
  const storyModeRef = useRef(storyMode)
  useEffect(() => {
    storyModeRef.current = storyMode
  }, [storyMode])

  const simRef = useRef<SimRefs>({
    t: -5,
    playing: false,
    speed: 1,
    launched: false,
    sample: sampleMission(-5),
  })
  const [playing, setPlayingState] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [launched, setLaunched] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('craft')
  const [showTraj, setShowTraj] = useState(true)
  const [trueScale, setTrueScale] = useState(false)
  const [finished, setFinished] = useState(false)
  const finishedRef = useRef(false)
  const interactedRef = useRef(false)
  // 电影化镜头（回望地球 / 地出）与空闲环绕的输入计时
  const [cinematic, setCinematic] = useState<CinematicShot | null>(null)
  const cinematicRef = useRef<CinematicShot | null>(null)
  const cinematicTimerRef = useRef(0)
  const lastInputRef = useRef(0)
  const lookbackDoneRef = useRef(false)

  const clearCinematic = useCallback(() => {
    cinematicRef.current = null
    setCinematic(null)
    if (cinematicTimerRef.current) {
      window.clearTimeout(cinematicTimerRef.current)
      cinematicTimerRef.current = 0
    }
  }, [])
  const playCinematic = useCallback((shot: CinematicShot, holdMs: number) => {
    cinematicRef.current = shot
    setCinematic(shot)
    if (cinematicTimerRef.current) window.clearTimeout(cinematicTimerRef.current)
    cinematicTimerRef.current = window.setTimeout(() => {
      cinematicTimerRef.current = 0
      if (cinematicRef.current === shot) {
        cinematicRef.current = null
        setCinematic(null)
      }
    }, holdMs)
  }, [])

  const setPlaying = useCallback((v: boolean) => {
    simRef.current.playing = v
    setPlayingState(v)
  }, [])
  const setSpeed = useCallback((v: number) => {
    simRef.current.speed = v
    setSpeedState(v)
  }, [])
  const setTime = useCallback((t: number) => {
    simRef.current.t = t
    simRef.current.sample = sampleMission(t)
  }, [])
  const setLaunchedBoth = useCallback((v: boolean) => {
    simRef.current.launched = v
    setLaunched(v)
  }, [])

  const handlePhase = useCallback(
    (phase: MissionPhase, prev: MissionPhase) => {
      setSpeed(PHASE_SPEED[phase])
      if (phase === 'lunar' && !finishedRef.current && simRef.current.t >= T_STABLE) {
        finishedRef.current = true
        setFinished(true)
        controls.finish()
      }
      // TLI 关机瞬间（自由模式、每次任务首次）：自动回望地球 3 秒
      if (prev === 'tli' && phase === 'coast' && !lookbackDoneRef.current && !storyModeRef.current) {
        lookbackDoneRef.current = true
        playCinematic('lookback', 3200)
      }
    },
    [controls, setSpeed, playCinematic],
  )
  const hud = useHudSync(simRef, handlePhase)

  // 抵达稳定环月轨道：自然完成时刻（只调用一次）
  useEffect(() => {
    if (!finishedRef.current && hud.t >= T_STABLE) {
      finishedRef.current = true
      setFinished(true)
      controls.finish()
      // 完成态 payoff：自动切到贴月面的「地出机位」5 秒
      if (!storyModeRef.current) playCinematic('earthrise', 5600)
    }
  }, [hud.t, controls, playCinematic])

  const ignite = useCallback(() => {
    clearCinematic()
    if (!simRef.current.launched) {
      setLaunchedBoth(true)
      setTime(-5)
      setPlaying(true)
      setSpeed(1)
      setCameraMode('craft')
      lookbackDoneRef.current = false
    } else {
      setPlaying(!simRef.current.playing)
    }
    lastInputRef.current = performance.now()
    controls.registerInteraction()
  }, [controls, clearCinematic, setLaunchedBoth, setPlaying, setSpeed, setTime])

  const relaunch = useCallback(() => {
    clearCinematic()
    setLaunchedBoth(true)
    setTime(-5)
    setPlaying(true)
    setSpeed(1)
    setCameraMode('craft')
    finishedRef.current = false
    setFinished(false)
    lookbackDoneRef.current = false
    lastInputRef.current = performance.now()
    controls.registerInteraction()
  }, [controls, clearCinematic, setLaunchedBoth, setPlaying, setSpeed, setTime])

  const skipToNextEvent = useCallback(() => {
    const now = simRef.current.t
    const next = MISSION_EVENTS.find((e) => e.t > now + 1)
    if (!next) return
    const gap = next.t - now
    setTime(next.t - (gap > 400 ? 240 : 5))
    setPlaying(true)
    controls.registerInteraction()
  }, [controls, setPlaying, setTime])

  const handleUserControl = useCallback(() => {
    lastInputRef.current = performance.now()
    if (cinematicRef.current) clearCinematic()
    if (interactedRef.current) return
    interactedRef.current = true
    controls.registerInteraction()
  }, [controls, clearCinematic])

  // 任何鼠标 / 触摸 / 键盘输入：停止空闲环绕、打断电影化镜头
  useEffect(() => {
    const mark = () => {
      lastInputRef.current = performance.now()
      if (cinematicRef.current) clearCinematic()
      if (!interactedRef.current) {
        interactedRef.current = true
        controls.registerInteraction()
      }
    }
    window.addEventListener('pointerdown', mark, true)
    window.addEventListener('wheel', mark, true)
    window.addEventListener('touchstart', mark, true)
    window.addEventListener('keydown', mark, true)
    return () => {
      window.removeEventListener('pointerdown', mark, true)
      window.removeEventListener('wheel', mark, true)
      window.removeEventListener('touchstart', mark, true)
      window.removeEventListener('keydown', mark, true)
    }
  }, [controls, clearCinematic])

  const resetToPad = useCallback(() => {
    clearCinematic()
    setLaunchedBoth(false)
    setTime(-5)
    setPlaying(false)
    setSpeed(1)
    setCameraMode('craft')
    finishedRef.current = false
    setFinished(false)
    lookbackDoneRef.current = false
  }, [clearCinematic, setLaunchedBoth, setPlaying, setSpeed, setTime])

  const handleGuideExit = useCallback(() => {
    // 故事开场第一步会自动点火；若用户在火箭尚未升空时就退出引导，
    // 自由模式应回到「静立待命、时钟未启动」的初始状态，把点火权交给用户。
    if (simRef.current.t < 2) resetToPad()
    enterFree()
  }, [enterFree, resetToPad])

  const handleReplay = useCallback(() => {
    clearCinematic()
    controls.registerInteraction()
    enterStory()
    replayGuide(WORLD_ID)
  }, [controls, clearCinematic, enterStory])

  // 开发态调试钩子：截图/自验脚本用（生产构建不包含）
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const api = {
      jump: (t: number, opts?: { playing?: boolean; mode?: CameraMode; speed?: number }) => {
        if (t >= 0 && !simRef.current.launched) setLaunchedBoth(true)
        setTime(t)
        if (opts?.mode) setCameraMode(opts.mode)
        if (opts?.speed !== undefined) setSpeed(opts.speed)
        setPlaying(opts?.playing ?? false)
      },
      state: () => ({ t: simRef.current.t, phase: simRef.current.sample.phase, launched: simRef.current.launched }),
    }
    ;(window as unknown as { __mv?: typeof api }).__mv = api
    return () => {
      delete (window as unknown as { __mv?: typeof api }).__mv
    }
  }, [setLaunchedBoth, setPlaying, setSpeed, setTime])

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: '去月球，为什么不能直着飞？',
        body: '倒计时结束，土星五号点火升空。它并不朝月球直冲，而是先直上、再慢慢倾倒——真正的奔月路线，要先学会绕开地球。',
        durationMs: 11000,
        action: () => {
          clearCinematic()
          setLaunchedBoth(true)
          setTime(-5)
          setPlaying(true)
          setSpeed(1)
          setCameraMode('craft')
        },
      },
      {
        title: '抛掉烧空的油箱',
        body: '两分半后一级火箭烧完，直接分离、坠回大海；再过四分钟，二级也抛掉。去月球不背空油箱——每扔一级，剩下的火箭就更轻、更快。',
        durationMs: 26000,
        action: () => {
          clearCinematic()
          // 从 100 秒起：一级分离（161 s）→ 二级分离（550 s）连看
          if (simRef.current.t < 100) setTime(100)
          setSpeed(22)
          setPlaying(true)
          setCameraMode('craft')
        },
      },
      {
        title: '先横着飞，不急着去月球',
        body: '火箭并不直接奔向月球。它先横着加速到每秒 7.8 公里，进入 190 公里高的地球轨道——轨道不是悬浮不动，而是一边下坠、一边错过地面。',
        durationMs: 16000,
        action: () => {
          clearCinematic()
          if (simRef.current.t < 640) setTime(640)
          setSpeed(60)
          setPlaying(true)
          setCameraMode('craft')
        },
      },
      {
        title: '瞄准三天后的月球',
        body: '绕地球一圈半后，TLI 点火六分钟，把速度提到每秒 11 公里甩向月球。注意：此刻月球并不在终点——半透明的影子，标出三天后它才会到达的位置。',
        durationMs: 16000,
        action: () => {
          clearCinematic()
          // 俯视：转移椭圆在月球轨道圆里展开，幽灵月球在终点等待
          if (simRef.current.t < 9500) setTime(9500)
          setSpeed(120)
          setPlaying(true)
          setCameraMode('top')
        },
      },
      {
        title: '回头看，地球在变小',
        body: 'TLI 关机后，末级火箭也分离了——剩下的旅程，宇航员只有小小的指令舱。回头看一眼：完整的地球挂在身后，像一弯蓝色新月，而且一天比一天小。',
        durationMs: 18000,
        action: () => {
          clearCinematic()
          if (simRef.current.t < T_S4B_SEP + 300) setTime(T_S4B_SEP + 300)
          setSpeed(600)
          setPlaying(true)
          // 回望机位跟随整幕；用户输入或下一步会打断
          playCinematic('lookback', 25000)
        },
      },
      {
        title: '地月之间，空旷得超乎想象',
        body: '接下来是约三天的滑行，几乎不烧燃料。地球在身后缩成一颗蓝点——画面里地球、月球的大小和距离全是真实比例，中间是真的什么都没有。',
        durationMs: 16000,
        action: () => {
          clearCinematic()
          if (simRef.current.t < T_TLI_END + 600) setTime(T_TLI_END + 600)
          setSpeed(3000)
          setPlaying(true)
          setCameraMode('wide')
        },
      },
      {
        title: '被月球抓住',
        body: '第三天，月球引力接手。在月球背面——地球看不见的地方——发动机反向点火六分钟，把速度降到每秒 1.7 公里，滑入环月轨道。从点火到这一刻，三天出头。',
        durationMs: 22000,
        action: () => {
          clearCinematic()
          if (simRef.current.t < T_COAST_END - 1800) setTime(T_COAST_END - 1800)
          setSpeed(1500)
          setPlaying(true)
          setCameraMode('craft')
        },
      },
      {
        title: '现在，你是月球的卫星',
        body: '环月两圈后再点一次火，轨道圆化到 110 公里——此后每两小时绕月一圈。转到合适的位置，还会遇见著名的「地出」：蓝色地球从月平线上升起。从点火到此刻：第四天。',
        durationMs: 22000,
        action: () => {
          clearCinematic()
          // 直接快进到圆化燃烧前：掠过两圈椭圆，落进稳定环月轨道
          if (simRef.current.t < T_STABLE - 1200) setTime(T_STABLE - 1200)
          setSpeed(600)
          setPlaying(true)
          setCameraMode('craft')
        },
      },
    ],
    [clearCinematic, playCinematic, setLaunchedBoth, setPlaying, setSpeed, setTime],
  )

  const phaseCaption = (() => {
    switch (hud.phase) {
      case 'pad':
        return tx('发射台上 · 等待点火')
      case 'ascent':
        return tx('正在爬出大气层')
      case 'orbit':
        return tx('先绕地球飞，不急着去月球')
      case 'tli':
        return tx('点火离开地球轨道')
      case 'coast': {
        // 天数从点火算起（与 GET 时钟一致）：第 1 天出发，第 4 天抵达
        const day = Math.max(1, Math.floor(hud.t / 86400) + 1)
        // 整句过 tx：英文模板规则「第 N 天 · …」→ "Day N · …"
        return tx(`第 ${day} 天 · 正在滑向月球`)
      }
      case 'approach':
        return tx('月球引力接手了')
      case 'loi':
        return tx('在月球背面刹车')
      case 'lunar':
        return tx('抵达：环绕月球飞行')
    }
  })()

  // 抵达倒计时：直接回答铭牌上的「去月球要几天？」（LOI 点火 = 抵达月球背面）
  const etaText = (() => {
    if (hud.phase !== 'coast' && hud.phase !== 'approach') return null
    const eta = T_LOI_START - hud.t
    if (eta <= 0) return null
    if (eta >= 86400) return tx(`距抵达还有 ${Math.floor(eta / 86400)} 天 ${Math.floor((eta % 86400) / 3600)} 小时`)
    if (eta >= 3600) return tx(`距抵达还有 ${Math.max(1, Math.round(eta / 3600))} 小时`)
    return tx(`距抵达还有 ${Math.max(1, Math.round(eta / 60))} 分钟`)
  })()

  const secondary = (
    <div className="mv-secondary experience-freebar-chips" role="group" aria-label={tx('相机视角')}>
      <button type="button" className={cameraMode === 'craft' ? 'is-active' : undefined} aria-pressed={cameraMode === 'craft'} onClick={() => { setCameraMode('craft'); controls.registerInteraction() }}>
        <Rocket weight="bold" />
        <span>{tx('跟随飞船')}</span>
      </button>
      <button type="button" className={cameraMode === 'earth' ? 'is-active' : undefined} aria-pressed={cameraMode === 'earth'} onClick={() => { setCameraMode('earth'); controls.registerInteraction() }}>
        <Globe weight="bold" />
        <span>{tx('地球')}</span>
      </button>
      <button type="button" className={cameraMode === 'moon' ? 'is-active' : undefined} aria-pressed={cameraMode === 'moon'} onClick={() => { setCameraMode('moon'); controls.registerInteraction() }}>
        <Moon weight="bold" />
        <span>{tx('月球')}</span>
      </button>
      <button type="button" className={cameraMode === 'wide' ? 'is-active' : undefined} aria-pressed={cameraMode === 'wide'} onClick={() => { setCameraMode('wide'); controls.registerInteraction() }}>
        <Mountains weight="bold" />
        <span>{tx('远景')}</span>
      </button>
      <button type="button" className={cameraMode === 'top' ? 'is-active' : undefined} aria-pressed={cameraMode === 'top'} onClick={() => { setCameraMode('top'); controls.registerInteraction() }}>
        <MapTrifold weight="bold" />
        <span>{tx('俯视')}</span>
      </button>
      <span className="mv-chip-divider" aria-hidden="true" />
      <button type="button" className={showTraj ? 'is-active' : undefined} aria-pressed={showTraj} onClick={() => { setShowTraj((v) => !v); controls.registerInteraction() }} title={tx('轨迹线')}>
        <SketchLogo weight="bold" />
        <span>{tx('轨迹线')}</span>
      </button>
      <button type="button" className={trueScale ? 'is-active' : undefined} aria-pressed={trueScale} onClick={() => { setTrueScale((v) => !v); controls.registerInteraction() }} title={tx('真实尺寸（默认放大显示）')}>
        <Ruler weight="bold" />
        <span>{tx('真实尺寸')}</span>
      </button>
      <button type="button" onClick={skipToNextEvent} disabled={!launched} title={tx('跳到下一事件')}>
        <FastForward weight="bold" />
        <span>{tx('跳到下一事件')}</span>
      </button>
      <button type="button" className="experience-freebar-reset" aria-label={tx('重新发射')} onClick={relaunch}>
        <ArrowCounterClockwise weight="bold" aria-hidden="true" />
        <span>{tx('重新发射')}</span>
      </button>
    </div>
  )

  return (
    <div className={`mv-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <Canvas
        className="mv-canvas"
        role="img"
        aria-label={tx('奔月三维场景')}
        camera={{ position: [EARTH_R + 0.00178, 0.00746, 0.00923], up: [1, 0, 0], fov: 55, near: 0.00002, far: 300000 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true }}
        frameloop="always"
      >
        <color attach="background" args={['#04070f']} />
        <MissionDriver simRef={simRef} />
        <StarField />
        <Sun />
        <SkyDome />
        <Earth />
        <MoonBody simRef={simRef} />
        <MoonOrbitLine visible={hud.phase !== 'pad' && hud.phase !== 'ascent'} />
        <GhostMoon simRef={simRef} />
        <TrajectoryLine simRef={simRef} visible={showTraj} />
        <EventMarkers />
        <EventLabels simRef={simRef} />
        <BodyLabels simRef={simRef} visible={(cinematic ?? cameraMode) === 'wide' || (cinematic ?? cameraMode) === 'top'} />
        <LaunchPad simRef={simRef} />
        <Craft simRef={simRef} trueScale={trueScale} />
        <CameraRig
          simRef={simRef}
          mode={cinematic ?? cameraMode}
          phase={hud.phase}
          followDist={
            hud.phase === 'ascent'
              ? Math.min(2.6, 0.012 + (hud.altKm / KM_PER_UNIT) * 0.6)
              : PHASE_CAM_DIST[hud.phase]
          }
          autoOrbit={!storyMode}
          lastInputRef={lastInputRef}
          onUserControl={handleUserControl}
        />
      </Canvas>

      {!storyMode && (
        <div className="mv-plaque" data-experience-overlay="true">
          <strong>{tx('去月球要几天？')}</strong>
          <span>{phaseCaption}</span>
        </div>
      )}

      {!storyMode && (
        <div className="mv-hud" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="mv-hud-top">
            <strong>{tx(PHASE_NAME[hud.phase])}</strong>
            <em>{formatGet(hud.t)}</em>
          </div>
          <div className="mv-hud-row">
            <span>{tx('速度')} {hud.speed.toFixed(2)} km/s</span>
            {hud.altKm < 4000 ? (
              <span>{tx('高度')} {formatKm(hud.altKm)}</span>
            ) : (
              <>
                <span>{tx('距月球')} {formatKm(hud.distMoonKm)}</span>
                <span>{tx('距地球')} {formatKm(hud.distEarthKm)}</span>
              </>
            )}
            {etaText && <span className="mv-hud-eta">{etaText}</span>}
          </div>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="mv-freebar"
          ariaLabel={tx('发射控制')}
          primaryControlBudget={5}
          secondaryDefault="closed"
          secondary={secondary}
        >
          {!launched ? (
            <button
              type="button"
              className="mv-ignite-btn"
              onClick={ignite}
              aria-label={tx('点火')}
            >
              <RocketLaunch weight="fill" aria-hidden="true" />
              <span>{tx('点火')}</span>
            </button>
          ) : finished ? (
            <button
              type="button"
              className="mv-ignite-btn"
              onClick={relaunch}
              aria-label={tx('重新发射')}
            >
              <RocketLaunch weight="fill" aria-hidden="true" />
              <span>{tx('重新发射')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="experience-freebar-play"
              data-playing={playing ? 'true' : 'false'}
              onClick={() => { setPlaying(!playing); controls.registerInteraction() }}
              aria-label={tx(playing ? '暂停' : '继续')}
            >
              {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
            </button>
          )}
          <div className="experience-freebar-seg mv-speed-seg" role="group" aria-label={tx('时间加速')}>
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={speed === option ? 'is-active' : undefined}
                aria-pressed={speed === option}
                onClick={() => { setSpeed(option); setPlaying(true); controls.registerInteraction() }}
              >
                {option}×
              </button>
            ))}
          </div>
          <button type="button" className="experience-freebar-story" aria-label={tx('重播故事')} onClick={handleReplay}>
            <FilmStrip weight="fill" aria-hidden="true" />
            <span>{tx('故事')}</span>
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'rise', tone: 'light', treatment: 'monumental', width: 'normal', cue: 'up' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'drift-right', tone: 'light', treatment: 'editorial', width: 'normal' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', treatment: 'editorial', width: 'normal' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'scale', tone: 'light', treatment: 'caption', width: 'normal', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', treatment: 'annotation', width: 'normal' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', treatment: 'annotation', width: 'wide' },
          { position: 'top-center', mobilePosition: 'bottom-center', motion: 'rise', tone: 'light', treatment: 'editorial', width: 'wide' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'rise', tone: 'light', treatment: 'editorial', width: 'normal' },
        ]}
        replayLabel={tx('重播故事')}
        showReplayChip={false}
        onExit={handleGuideExit}
      />

      {!storyMode && !launched && (
        <GhostHint
          worldId="moon-voyage-launch"
          gesture={{ type: 'tap', target: '.mv-ignite-btn', label: '点击点火，开始奔月之旅' }}
        />
      )}
      {!storyMode && launched && !interactedRef.current && (
        <GhostHint
          worldId="moon-voyage-orbit"
          gesture={{ type: 'drag', target: '.mv-canvas', label: '拖动旋转视角，看地球慢慢变小' }}
        />
      )}
      {finished && <span className="mv-finished-sr" role="status">{tx('抵达：环绕月球飞行')}</span>}
    </div>
  )
}
