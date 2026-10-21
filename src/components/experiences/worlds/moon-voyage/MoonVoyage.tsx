import './styles/MoonVoyage.css'
import { journeyCamera, type CameraMode } from './journey-camera'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowCounterClockwise, FilmStrip, Pause, Play } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { CHAPTERS, JOURNEY_DURATION, chapterAt, journeyPositionAt, missionTimeAt } from './journey'
import {
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



type SimRefs = {
  t: number
  playing: boolean
  speed: number
  launched: boolean
  sample: MissionSample
  position: number
  revision: number
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
            float height = max(0.0, length(uCamPos) - 63.71);
            float dip = -sqrt(max(0.0, 1.0 - pow(63.71 / length(uCamPos), 2.0)));
            float horizonBand = exp(-pow((e - dip) / mix(0.3, 0.045, uSpace), 2.0));
            float sun = max(0.0, dot(dir, normalize(vec3(.656,.5,.755))));
            vec3 zenith = mix(vec3(.025,.16,.39), vec3(.002,.005,.015), uSpace);
            vec3 haze = mix(vec3(.39,.57,.72), vec3(.08,.28,.61), uSpace);
            vec3 atmo = mix(zenith, haze, horizonBand * exp(-height * .4));
            atmo += vec3(.14,.11,.07) * pow(sun, 14.0) * (1.0-uSpace);
            gl_FragColor = vec4(atmo, 1.0);
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
    material.uniforms.uSpace.value = THREE.MathUtils.smoothstep(altUnits, 0.04, 0.8)
    material.uniforms.uCamPos.value.copy(camera.position)
    mesh.scale.setScalar(camera.far * 0.5)
  })
  return (
    <mesh ref={meshRef} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}

/** 地球：BMNG 白昼、Black Marble 夜光、近地空气透视与大气边缘光。 */
function Earth() {
  const dayTex = useLazyTexture(EARTH_DAY_4K_URL)
  const nightTex = useLazyTexture(EARTH_NIGHT_TEXTURE_URL)

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
            // Aerial perspective hides coarse distant terrain at low altitude.
            float height = max(0.0, length(uCamPos)-63.71);
            float air = exp(-height * 3.5);
            float distanceFog = 1.0-exp(-length(uCamPos-vWorldPos)*2.2);
            vec3 ray = normalize(vWorldPos-uCamPos);
            float space = smoothstep(.04,.8,height);
            float dip = -sqrt(max(0.0,1.0-pow(63.71/length(uCamPos),2.0)));
            float band = exp(-pow((dot(ray,normalize(uCamPos))-dip)/mix(.3,.045,space),2.0));
            vec3 haze = mix(mix(vec3(.025,.16,.39),vec3(.002,.005,.015),space),mix(vec3(.39,.57,.72),vec3(.08,.28,.61),space),band*exp(-height*.4));
            col = mix(col,haze,distanceFog*air);
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
            float outside = smoothstep(65.4, 66.0, uCamDist);
            gl_FragColor = vec4(uColor * f * 1.5, f * 0.55 * outside);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  const fadeRef = useRef(0)
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
    surface.uniforms.uCamPos.value.copy(camera.position)
    atmosphere.uniforms.uCamDist.value = camera.position.length()
  })

  return (
    <group>
      {/* 轴倾角 23.44°（自转忽略，见 ⓘ 模型边界） */}
      <group rotation={[0, 0, (23.44 * Math.PI) / 180]}>
        <mesh material={surface}>
          <sphereGeometry args={[EARTH_R, 512, 256]} />
        </mesh>
      </group>
      <mesh material={atmosphere}>
        <sphereGeometry args={[EARTH_R * 1.025, 128, 96]} />
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
    const wave = Math.sin(simRef.current.position * 2.4)
    const pulse = 0.26 + 0.08 * wave
    const target = show ? pulse : 0
    if (matRef.current) matRef.current.opacity = target
    if (spriteRef.current) spriteRef.current.opacity = show ? 0.5 + 0.15 * wave : 0
    // 缓慢脉冲圆环：呼吸式放大 + 明暗
    if (ringMatRef.current && ringRef.current) {
      const ringTarget = show ? 0.75 + 0.2 * wave : 0
      ringMatRef.current.opacity = ringTarget
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
    return { line, times, count, geometry, original: points.slice(), moonPositions: Array.from(times, t => moonPosKm(t)), lunarStart: Array.from(times).findIndex(t => t >= T_LOI_START) }
  }, [])
  const bright = useMemo(() => new THREE.Color('#c4ecff'), [])
  const dim = useMemo(() => new THREE.Color('#5b7699'), [])
  useFrame(({ camera }) => {
    if (!visible) return
    const now = simRef.current.t
    const local = now >= T_LOI_START
    const positions = line.geometry.attributes.position as THREE.BufferAttribute
    const currentMoon = simRef.current.sample.moonPos
    for(let i=0;i<line.count;i++) for(let j=0;j<3;j++) {
      (positions.array as Float32Array)[i*3+j] = line.original[i*3+j] + (local ? (currentMoon[j]-line.moonPositions[i][j])/KM_PER_UNIT : 0)
    }
    positions.needsUpdate=true
    line.geometry.setDrawRange(local ? line.lunarStart : 0, local ? line.count-line.lunarStart : line.count)
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
function Flame({
  simRef,
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
  simRef: React.MutableRefObject<SimRefs>
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
            float y = 1.0-vUv.y;
            float x = (vUv.x-.5)*2.0;
            float turbulence = sin(y*37.0-uTime*25.0)*sin(y*19.0+uTime*17.0);
            x += turbulence*.06*y;
            float width = .13 + .3*sin(y*2.7);
            float soft = exp(-pow(x/width,2.0)*3.0);
            float tip = 1.0-smoothstep(.45,1.0,y);
            float core = exp(-pow(x/(width*.45),2.0)*2.0)*(1.0-y);
            float cells = .84+.16*sin(y*70.0-uTime*32.0);
            vec3 col = mix(uEdge,uCore,core);
            gl_FragColor = vec4(col*(1.2+core),soft*tip*cells*uIntensity*.42);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [core, edge],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = simRef.current.position
    material.uniforms.uIntensity.value = visibleRef.current
  })
  return (
    <group position={[0, -length * .5, 0]}>
      {[0,Math.PI/3,Math.PI*2/3].map(angle=><mesh key={angle} material={material} rotation={[0,angle,0]}>
        <planeGeometry args={[radius*5,length]} />
      </mesh>)}
    </group>
  )
}

type StageRefs = {
  s1: React.RefObject<THREE.Group | null>
  s2: React.RefObject<THREE.Group | null>
  s3: React.RefObject<THREE.Group | null>
  csm: React.RefObject<THREE.Group | null>
}

function SaturnV({ simRef, stageRefs, flameS1, flameS2, flameS3, flameCsm }: {
  simRef: React.MutableRefObject<SimRefs>
  stageRefs: StageRefs
  flameS1: React.MutableRefObject<number>
  flameS2: React.MutableRefObject<number>
  flameS3: React.MutableRefObject<number>
  flameCsm: React.MutableRefObject<number>
}) {
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f4ef', roughness: 0.48, metalness: 0.12 }), [])
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141519', roughness: 0.55, metalness: 0.25 }), [])
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bfc5cc', roughness: 0.42, metalness: 0.35 }), [])
  const escapeRef=useRef<THREE.Group>(null)
  useFrame(()=>{if(escapeRef.current)escapeRef.current.visible=simRef.current.t<190})
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
        <Flame simRef={simRef} length={60} radius={5.2} core="#fff3d0" edge="#ff7a26" visibleRef={flameS1} />
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
          <Flame simRef={simRef} length={34} radius={4.2} core="#f4f8ff" edge="#5d8fff" visibleRef={flameS2} />
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
          <Flame simRef={simRef} length={22} radius={2.6} core="#f4f8ff" edge="#4d7dff" visibleRef={flameS3} />
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
        <group ref={escapeRef}>
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
        </group>
        <mesh material={bell} position={[0,94.8,0]}>
          <cylinderGeometry args={[.8,1.5,2.6,24,1,true]}/>
        </mesh>
        {[0,Math.PI/2,Math.PI,Math.PI*1.5].map(angle=><mesh key={angle} material={white} position={[Math.cos(angle)*1.93,99.6,Math.sin(angle)*1.93]} rotation={[0,-angle,0]}><boxGeometry args={[.1,5.6,1.1]}/></mesh>)}
        <group position={[0, 96, 0]}>
          <Flame simRef={simRef} length={22} radius={1.8} core="#f6f9ff" edge="#3d6dff" visibleRef={flameCsm} />
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
    if(s.t>=T_COAST_END) {
      const before=sampleMission(s.t-.5), after=sampleMission(s.t+.5)
      tmpVel.current.set(...after.pos).sub(new THREE.Vector3(...before.pos)).sub(new THREE.Vector3(...after.moonPos).sub(new THREE.Vector3(...before.moonPos)))
    }
    const speedLen = tmpVel.current.length()
    if (s.phase === 'pad' || (s.phase === 'ascent' && s.t < 12) || speedLen < 1e-6) {
      dirVec.current.copy(PAD_DIR)
    } else if (s.phase === 'ascent') {
      dirVec.current.copy(tmpPos.current).normalize().lerp(tmpVel.current.clone().normalize(),THREE.MathUtils.smoothstep(s.t,12,150)).normalize()
    } else if (s.burn === 'loi' || (s.burn === 'puff' && s.t >= T_CIRC)) {
      const before=sampleMission(s.t-.5), after=sampleMission(s.t+.5)
      tmpVel.current.set(...after.pos).sub(new THREE.Vector3(...before.pos)).sub(new THREE.Vector3(...after.moonPos).sub(new THREE.Vector3(...before.moonPos)))
      dirVec.current.copy(tmpVel.current).normalize().negate()
    } else {
      dirVec.current.copy(tmpVel.current).normalize()
    }
    targetQuat.current.setFromUnitVectors(upVec.current, dirVec.current)
    // 发射台上立即就位（故事开场就是立好的火箭），之后平滑转向
    if (s.phase === 'pad') root.quaternion.copy(targetQuat.current)
    else root.quaternion.copy(targetQuat.current)

    // 屏幕空间恒尺寸：真实尺寸在地月尺度不可见，按「当前船体长度」归一化放大，
    // 使全箭 / 末级 / CSM 在各阶段都保持相近的屏幕主角尺寸（分离时平滑过渡）；
    // 放大必须绕当前船体中心膨胀（否则 CSM 的 +96 m 局部偏移会被放大到偏离锚点）。
    camVec.current.copy(camera.position).sub(tmpPos.current)
    const dist = camVec.current.length()
    const targetLen = s.stage >= 3 ? 111 : s.stage >= 2 ? 69 : s.stage >= 1 ? 44 : 15
    lenRef.current = targetLen
    const boost = trueScale ? 1 : Math.max(1, (dist * (s.phase==='ascent'?9500:6000) * Math.min(1, (camera as THREE.PerspectiveCamera).aspect / 1.1)) / lenRef.current)
    const scale = 0.00001 * boost
    model.scale.setScalar(scale)
    const targetCenter = s.stage >= 3 ? 55 : s.stage >= 2 ? 76.5 : s.stage >= 1 ? 89 : 103.5
    centerRef.current = targetCenter
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
          posKm: sampleMission(tSep).pos,
          velKms: sampleMission(tSep).vel,
          tSep,
          tumble: new THREE.Vector3(Math.sin(tSep), .4, Math.cos(tSep)).normalize(),
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
          <SaturnV simRef={simRef} stageRefs={{ s1, s2, s3, csm }} flameS1={flameS1} flameS2={flameS2} flameS3={flameS3} flameCsm={flameCsm} />
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
    g.quaternion.setFromAxisAngle(d.tumble, since * .008)
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
      const seed=(n:number)=>{const v=Math.sin(n*127.1+1.7)*43758.5453;return v-Math.floor(v)}
      const a = seed(i+1) * Math.PI * 2
      const r = 0.012 + seed(i+21) * 0.05
      const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.15, depthWrite: false })
      fadeMats.push({ mat, base: 0.15 })
      arr.push({
        pos: [Math.cos(a) * r, 0.009 + seed(i+41) * 0.016, Math.sin(a) * r],
        scale: 0.005 + seed(i+61) * 0.006,
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
          gl_FragColor = vec4(tex.rgb * mix(vec3(.34,.39,.45),vec3(.91,.86,.77),(1.0-smoothstep(.15,.9,gl_PointCoord.y))), tex.a * vAlpha * uFade);
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
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const glowRef = useRef<THREE.SpriteMaterial>(null)

  useFrame(({ camera, size, viewport }, delta) => {
    const s = simRef.current.sample
    const dt = simRef.current.playing ? Math.min(delta, 0.1) : 0
    const spawning =
      s.burn === 'launch' && s.t < 40 && simRef.current.playing && !reducedMotion.current
    const persp = camera as THREE.PerspectiveCamera
    smoke.mat.uniforms.uPxScale.value =
      (size.height * viewport.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2))

    // 发射场近景在升空后淡出，避免地面切片变成悬浮圆盘。
    const altKm = s.nearBody === 'earth' ? s.altKm : 1e9
    const fade = 1 - THREE.MathUtils.smoothstep(altKm, .3, 4)
    smoke.mat.uniforms.uFade.value = fade
    for (const { mat, base } of fadeMats) {
      ;(mat as THREE.MeshStandardMaterial).opacity = base * fade
    }
    if (groupRef.current) groupRef.current.visible = fade > 0.002

    if (glowRef.current) {
      const glowTarget = s.burn === 'launch' && s.altKm < 1.5 ? 0.38 + 0.14 * Math.sin(s.t) : 0
      glowRef.current.opacity = glowTarget
    }
    const posAttr = smoke.geo.attributes.position as THREE.BufferAttribute
    const alphaAttr = smoke.geo.attributes.aAlpha as THREE.BufferAttribute
    const sizeAttr = smoke.geo.attributes.aSize as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const alphaArr = alphaAttr.array as Float32Array
    const sizeArr = sizeAttr.array as Float32Array

    // Analytic exhaust ages: scrubbing and replay never inherit old particles.
    for (let i = 0; i < SMOKE_N; i++) {
      const seed=(n:number)=>{const x=Math.sin(n*127.1+3.7)*43758.5453;return x-Math.floor(x)}
      const born=i/SMOKE_N*2.2
      const age=simRef.current.position-born
      if(age<0 || age>3 || reducedMotion.current){alphaArr[i]=0;continue}
      const angle=seed(i+1)*Math.PI*2
      const radius=.0005+age*(.0003+seed(i+3)*.0004)
      posArr[i*3]=Math.cos(angle)*radius
      posArr[i*3+1]=.00005+age*.0001
      posArr[i*3+2]=Math.sin(angle)*radius
      alphaArr[i]=.32*(1-age/3)*Math.min(1,age*8)
      sizeArr[i]=(.0003+seed(i+5)*.0004)*(1+age*.65)
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

function CameraRig({ simRef, mode, storyMode, onUserControl }: {
  simRef: React.MutableRefObject<SimRefs>; mode: CameraMode; storyMode: boolean; onUserControl: () => void
}) {
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null)
  const user = useRef(false)
  const revision = useRef(-1)
  const priorTarget = useRef(new THREE.Vector3())
  useEffect(() => { user.current = false }, [mode])
  useFrame(({ camera, size }) => {
    const sim = simRef.current, s = sim.sample
    if (revision.current !== sim.revision) { user.current = false; revision.current = sim.revision }
    const {position:cameraPosition,target,up}=journeyCamera(s,sim.position,size.width/size.height,mode,storyMode)
    if (!user.current) {
      camera.up.copy(up)
      camera.position.copy(cameraPosition)
      camera.lookAt(target)
      orbit.current?.target.copy(target)
    } else {
      const delta=target.clone().sub(priorTarget.current)
      camera.position.add(delta); orbit.current?.target.add(delta)
    }
    priorTarget.current.copy(target)
    orbit.current?.update()
  }, -0.5)
  return <OrbitControls ref={orbit} enablePan={false} enableDamping={false} minDistance={.001} maxDistance={30000}
    onStart={() => { user.current=true; onUserControl() }} />
}

/** One authoritative, reversible clock; no phase callback can change its rate. */
function MissionDriver({ simRef }: { simRef: React.MutableRefObject<SimRefs> }) {
  useFrame(({ camera }, delta) => {
    const sim=simRef.current
    if(sim.playing) {
      sim.position=Math.min(JOURNEY_DURATION,sim.position+Math.min(delta,.1)*sim.speed)
      if(sim.position>=JOURNEY_DURATION) sim.playing=false
    }
    sim.t=missionTimeAt(sim.position); sim.sample=sampleMission(sim.t)
    if(import.meta.env.DEV) {
      ;(window as unknown as { __mvProbe: () => unknown }).__mvProbe=()=>({
        t:sim.t, position:sim.position, playing:sim.playing, phase:sim.sample.phase,
        craft:sim.sample.pos, camera:camera.position.toArray(), up:camera.up.toArray(),
        projected:kmToUnits(sim.sample.pos,new THREE.Vector3()).project(camera).toArray(),
      })
    }
  }, -1)
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

function useHudSync(simRef: React.MutableRefObject<SimRefs>) {
  const read=useCallback(():HudState=>{
    const s=simRef.current.sample
    return {phase:s.phase,t:s.t,speed:s.speedKms,altKm:s.altKm,distMoonKm:s.distMoonKm,distEarthKm:s.distEarthKm,nearBody:s.nearBody}
  },[simRef])
  const [hud,setHud]=useState(read)
  const sync=useCallback(()=>setHud(read()),[read])
  useEffect(()=>{const id=window.setInterval(sync,200);return()=>window.clearInterval(id)},[sync])
  return [hud,sync] as const
}

// ---------------------------------------------------------------------------
// 主组件

export function MoonVoyage({ controls }: { controls: ExperienceControls }) {
  const tx=useExperienceI18n()
  const [storyMode,setStoryMode]=useState(true)
  const simRef=useRef<SimRefs>({ t:0, position:0, revision:0, playing:false, speed:1, launched:true, sample:sampleMission(0) })
  const [playing,setPlayingState]=useState(false)
  const [playbackSpeed,setPlaybackSpeed]=useState(1)
  const [cameraMode,setCameraMode]=useState<CameraMode>('journey')
  const [showTraj,setShowTraj]=useState(true)
  const [trueScale,setTrueScale]=useState(false)
  const finishRef=useRef(false)
  const [hud,syncHud]=useHudSync(simRef)
  const position=journeyPositionAt(hud.t)
  const chapter=chapterAt(position)
  useEffect(()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    simRef.current.playing=!reduce; setPlayingState(!reduce)
  },[])
  useEffect(()=>{
    setPlayingState(simRef.current.playing)
    if(position>=JOURNEY_DURATION && !finishRef.current) { finishRef.current=true; controls.finish() }
  },[position,controls])
  const seek=useCallback((value:number)=>{
    const sim=simRef.current
    sim.position=Math.max(0,Math.min(JOURNEY_DURATION,value)); sim.t=missionTimeAt(sim.position)
    sim.sample=sampleMission(sim.t); sim.playing=false; sim.revision++; setPlayingState(false)
    if(sim.position<JOURNEY_DURATION) finishRef.current=false
    syncHud()
  },[syncHud])
  const replay=()=>{ seek(0); setStoryMode(true); setCameraMode('journey'); simRef.current.playing=true;setPlayingState(true);controls.registerInteraction() }
  const toggle=()=>{ if(simRef.current.position>=JOURNEY_DURATION) seek(0);simRef.current.playing=!simRef.current.playing;setPlayingState(simRef.current.playing);controls.registerInteraction() }
  useEffect(()=>{
    if(!import.meta.env.DEV)return
    const w=window as unknown as {__mv?:unknown}
    w.__mv={ jump:(t:number)=>seek(journeyPositionAt(t)), state:()=>simRef.current }
    return()=>{delete w.__mv}
  },[seek])
  const playLabel=tx(position>=JOURNEY_DURATION?'重播故事':playing?'暂停':'播放')
  const transport=<>
    <button type="button" className="experience-freebar-play mv-play" data-playing={playing} aria-label={playLabel} title={playLabel} onClick={toggle}>
      {position>=JOURNEY_DURATION?<ArrowCounterClockwise/>:playing?<Pause weight="fill"/>:<Play weight="fill"/>}<span>{tx(position>=JOURNEY_DURATION?'重播':playing?'暂停':'播放')}</span>
    </button>
    <label className="mv-scrub"><span>{tx('航程定位')} <output>{formatGet(hud.t)}</output></span>
      <input type="range" min="0" max={JOURNEY_DURATION} step="0.05" value={position} aria-label={tx('航程定位')}
        aria-valuetext={`${tx(CHAPTERS[chapter].label)} ${formatGet(hud.t)}`} onChange={event=>{seek(Number(event.target.value));controls.registerInteraction()}} />
    </label>
    <select className="mv-speed" aria-label={tx('播放速度')} title={tx('播放速度')} value={playbackSpeed} onChange={event=>{
      const speed=Number(event.target.value);setPlaybackSpeed(speed);simRef.current.speed=speed;controls.registerInteraction()
    }}>
      {[.25,.5,1,2,4].map(speed=><option key={speed} value={speed}>{speed}×</option>)}
    </select>
  </>
  const secondary=<div className="mv-secondary experience-freebar-chips">
    {(['journey','craft','earth','moon','wide'] as const).map((mode,i)=><button type="button" key={mode} aria-pressed={cameraMode===mode} className={cameraMode===mode?'is-active':''} onClick={()=>{setCameraMode(mode);simRef.current.revision++;controls.registerInteraction()}}>{tx(['旅程镜头','跟随飞船','地球','月球','全程'][i])}</button>)}
    <button type="button" aria-pressed={showTraj} onClick={()=>{setShowTraj(!showTraj);controls.registerInteraction()}}>{tx('轨迹线')}</button>
    <button type="button" aria-pressed={trueScale} onClick={()=>{setTrueScale(!trueScale);controls.registerInteraction()}}>{tx(trueScale?'飞船原尺寸':'飞船放大')}</button>
    <button type="button" className="experience-freebar-story" onClick={replay} aria-label={tx('重播故事')}><FilmStrip/><span>{tx('故事')}</span></button>
  </div>
  return <div className={`mv-experience ${storyMode?'is-story':'is-free'} ${hud.nearBody==='earth' && hud.t>20 && hud.t<150?'is-atmosphere':''}`} >
    <div className="mv-stage">
      <Canvas className="mv-canvas" role="img" aria-label={tx('奔月三维场景')}
        camera={{position:[EARTH_R+.00178,.00746,.00923],up:[1,0,0],fov:55,near:.00002,far:300000}}
        dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true}}>
        <color attach="background" args={['#04070f']}/>
        <MissionDriver simRef={simRef}/><StarField/><Sun/><SkyDome/><Earth/><MoonBody simRef={simRef}/>
        <TrajectoryLine simRef={simRef} visible={showTraj}/>
        <GhostMoon simRef={simRef}/>
        <BodyLabels simRef={simRef} visible={!storyMode && cameraMode==='wide'}/>
        <LaunchPad simRef={simRef}/><Craft simRef={simRef} trueScale={trueScale}/>
        <CameraRig simRef={simRef} mode={cameraMode} storyMode={storyMode} onUserControl={()=>{setStoryMode(false);controls.registerInteraction()}}/>
      </Canvas>
    </div>
    <section className="mv-narrative" data-experience-overlay="true">
      <div className="mv-kicker">{tx('四天抵达月球')} <span>{String(chapter+1).padStart(2,'0')} / 07</span></div>
      <h1>{tx(CHAPTERS[chapter].title)}</h1>
      <p>{tx(CHAPTERS[chapter].body)}</p>
      <div className="mv-readout"><strong>{formatGet(hud.t)}</strong><span>{tx(hud.nearBody==='earth'?'相对地球速度':'相对月球速度')} · {hud.speed.toFixed(2)} km/s</span></div>
      <small>{tx('时间分段压缩 · 天体与间距同比例 · 飞船放大示意')}</small>
    </section>
    {storyMode?<div className="mv-story-controls" data-experience-overlay="true">
      <nav aria-label={tx('航程章节')}>{CHAPTERS.map((item,i)=><button type="button" key={item.at} aria-current={i===chapter?'step':undefined} onClick={()=>{seek(item.at);controls.registerInteraction()}}>{tx(item.label)}</button>)}</nav>
      <div className="mv-transport">{transport}<button type="button" className="mv-replay" aria-label={tx('重播故事')} onClick={replay}><ArrowCounterClockwise/></button>
      <button type="button" className="mv-handoff" onClick={()=>{setStoryMode(false);controls.registerInteraction()}}>{tx('自由探索')}</button></div>
    </div>:<Freebar className="mv-freebar" ariaLabel={tx('航程控制')} primaryControlBudget={3} secondaryDefault="closed" secondary={secondary}>{transport}</Freebar>}
  </div>
}
