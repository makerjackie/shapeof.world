import './styles/Eclipses.css'

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ArrowsOut, CircleDashed, CircleHalf, Globe, Moon, Pause, Play, Sun, FilmStrip, SpeakerHigh, SpeakerSlash, GlobeHemisphereWest } from '@phosphor-icons/react'

import { ClientOnly } from '~/components/ClientOnly'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  createAtmosphereMaterial,
  createBackdropTexture,
  createConeEdges,
  createConeMaterial,
  createEclipticGrid,
  createFadeCone,
  createMoonTexture,
  createOrbitLine,
  createRayGeometry,
  createRayMaterial,
  createSpotTexture,
  createSunGlowTexture,
  createSunSurfaceTexture,
  createEarthEclipseMaterial,
  createInclinationWedge,
  createStarGeometry,
  createStarSprite,
  writeInclinationWedge,
} from '~/components/experiences/worlds/eclipses/eclipses-visuals'
import { MOON_LROC_TEXTURE_URL } from '~/components/experiences/solar-system-textures'
import { paintSky, projectMoonNearSide, type SkyFraming, type SkyView } from '~/components/experiences/worlds/eclipses/eclipses-sky'
import { createEclipseAudio, type EclipseAudio } from '~/components/experiences/worlds/eclipses/eclipses-audio'
const TIDES_NIGHT_MAP_URL = '/assets/tides/earth-night-black-marble.jpg'
import {
  D_MOON_MAX,
  D_MOON_MEAN,
  D_MOON_MIN,
  D_SUN,
  INCLINATION,
  KM_PER_UNIT,
  MOON_UMBRA_MEAN,
  R_EARTH,
  R_MOON,
  R_SUN,
  SUN_DIR,
  YEAR_SPAN,
  computeEclipse,
  createEclipseState,
  findScenario,
  moonDirection,
  nodeLongitude,
  orbitLookAtShadow,
  seasonWindows,
  smooth01,
  type EclipseKind,
  type EclipseState,
  type ScenarioKey,
  type SimState,
} from '~/components/experiences/worlds/eclipses/eclipses-model'
import { useExperienceI18n } from '~/i18n/experience'

/*
 * 日食与月食
 * ==========================================================================
 * 这个世界只讲一件事：**影子**。
 *
 * 舞台上地球与月球按真实比例（月球画大 1.8 倍便于辨认，距离真实），
 * 影锥长度由真实角径算出，于是「有时全食有时环食」「全食带只有一条
 * 窄带」「一年只有两段食季」都是长出来的，不是画上去的。
 * 几何全部在 eclipses-model.ts。
 *
 * 太阳必须看得见：它画在 −X 轴 88 个地球半径处（真实是 2.3 万个，
 * 压缩约 267 倍，界面披露），半径取「地球本影锥反向延长恰好相切」的
 * 1.4 个地球半径；平行的阳光柱把光的方向带到每一个机位。
 *
 * 天空之窗与舞台同屏：舞台是原因（影子往哪落），窗里是结果
 * （站在落点抬头看见什么）。这两件事必须同时在场，因果才连得上。
 */

/* 影锥只画到镜头够得到的一段：真实锥长 217 R⊕ 会把机位逼得太远 */
const EARTH_CONE_DRAW = 78
const MOON_CONE_DRAW = MOON_UMBRA_MEAN
/* 太阳的示意位置：−X 轴 72 R⊕；半径按地球本影锥反向延长恰好相切取值 */
const SUN_DRAW_X = -72
const R_SUN_DRAW = R_EARTH + (-SUN_DRAW_X * (R_SUN - R_EARTH)) / D_SUN // ≈ 1.332
/* 月球视觉放大倍数：真实 0.27 个地球半径在全景里只有几个像素。
   只放大球体与影锥底，锥尖位置不变——戏眼保持真实；界面披露。 */
const MOON_VISUAL = 1.8
const R_MOON_DRAW = R_MOON * MOON_VISUAL
const TRACK_MAX = 220

/** 阳光柱：从太阳射向地月系统的平行光（绕开天体的壳层位置，确定性） */
const RAYS: Array<{ y: number; z: number; r: number }> = [
  { y: 2.1, z: 0.7, r: 0.042 },
  { y: -2.4, z: 1.2, r: 0.034 },
  { y: 0.9, z: -2.5, r: 0.048 },
  { y: -1.5, z: -2.0, r: 0.03 },
  { y: 3.1, z: -1.0, r: 0.028 },
  { y: -3.2, z: 0.1, r: 0.04 },
  { y: 1.7, z: 2.9, r: 0.03 },
]

const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)
const CONE_TO_X = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(1, 0, 0))
const RAY_QUAT = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(-1, 0, 0))
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _v3 = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _m = new THREE.Matrix4()

const MOON_WHITE = new THREE.Color('#ffffff')
const MOON_BLOOD = new THREE.Color('#c47860')
const MOON_REFRACTED = new THREE.Color('#8a3a22') // 被地球大气折进本影的红光

const SPEEDS = [
  { label: '10 分 / 秒', days: 10 / 1440 },
  { label: '1 小时 / 秒', days: 1 / 24 },
  { label: '1 天 / 秒', days: 1 },
  { label: '10 天 / 秒', days: 10 },
]

const PHASE_NAMES = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月']
function phaseName(phase: number) {
  const wrapped = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return PHASE_NAMES[Math.round(wrapped / (Math.PI / 4)) % 8]
}

const KIND_LABEL: Record<EclipseKind, string> = {
  'total-solar': '日全食',
  annular: '日环食',
  'partial-solar': '日偏食',
  'total-lunar': '月全食',
  'partial-lunar': '月偏食',
  penumbral: '半影月食',
  none: '没有食',
}

const SCENARIOS: Array<{ key: ScenarioKey; label: string; icon?: typeof Sun; focus?: Focus }> = [
  { key: 'total-solar', label: '日全食', icon: Sun },
  { key: 'annular', label: '日环食', icon: CircleDashed },
  { key: 'partial-solar', label: '日偏食', icon: CircleHalf },
  { key: 'total-lunar', label: '月全食', icon: Moon },
  { key: 'miss', label: '影子擦过', focus: 'edge' },
]

type GroundSite = 'china' | 'europe' | 'usa'
type LookFrom = 'space' | 'ground'
type FilmShot = 'ground' | 'close' | 'orbit' | 'space'

type EclipseFilmCue = {
  film?: FilmShot | null
  scenario?: ScenarioKey
  focus?: Focus
  lookFrom?: LookFrom
  skyFraming?: SkyFraming
  groundSite?: GroundSite
  guides?: boolean
  playing?: boolean
  speed?: number
  dayNudge?: number
}

const GROUND_SITES: Record<GroundSite, { lat: number; lon: number; label: string; city: string; day: string; night: string }> = {
  china: { lat: 30.6, lon: 114.3, label: '中国', city: '武汉', day: '/assets/eclipses/ground-china-day.jpg', night: '/assets/eclipses/ground-china-night.jpg' },
  europe: { lat: 40.4, lon: -3.7, label: '欧洲', city: '马德里', day: '/assets/eclipses/ground-europe-day.jpg', night: '/assets/eclipses/ground-europe-night.jpg' },
  usa: { lat: 32.8, lon: -96.8, label: '美国', city: '达拉斯', day: '/assets/eclipses/ground-usa-day.jpg', night: '/assets/eclipses/ground-usa-night.jpg' },
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const INITIAL: SimState = { day: 0, moonDist: D_MOON_MIN + 0.35, speed: 1 / 24, playing: false, tilted: true }

function initialSim(): SimState {
  const found = findScenario('total-solar')
  return { day: found.day, moonDist: found.moonDist, speed: 1 / 24, playing: false, tilted: true }
}

type MutRef<T> = { current: T }
type Focus = 'auto' | 'earth' | 'moon' | 'system' | 'edge' | 'orbit'
type FrameGoal = { target: THREE.Vector3; dist: number; elevation: number; azimuth: number }

/**
 * 地球贴图：自己加载，**不要**用 useTexture 去 suspend 整个舞台。
 * 一旦挂在 Suspense 上，贴图慢一点首屏就是纯黑——而这个世界的主角
 * 是影锥的几何，没有贴图照样成立。贴图到了再换上。
 */
function useEarthTexture() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      '/assets/earth-blue-marble.jpg',
      (loaded) => {
        if (!alive) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.anisotropy = 8
        setTexture(loaded)
      },
      undefined,
      () => {
        // 贴图取不到也照样有个地球，只是素色
      },
    )
    return () => {
      alive = false
    }
  }, [])
  return texture
}

function useNightTexture() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      TIDES_NIGHT_MAP_URL,
      (loaded) => {
        if (!alive) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.anisotropy = 8
        setTexture(loaded)
      },
      undefined,
      () => {
        /* 夜灯贴图取不到就只靠本影压暗，舞台仍然成立 */
      },
    )
    return () => {
      alive = false
    }
  }, [])
  return texture
}

function useMoonMaps() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [disk, setDisk] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      MOON_LROC_TEXTURE_URL,
      (loaded) => {
        if (!alive) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.anisotropy = 8
        setTexture(loaded)
        const img = loaded.image as HTMLImageElement | undefined
        if (img && (img.naturalWidth || img.width)) {
          setDisk(projectMoonNearSide(img, 640))
        }
      },
      undefined,
      () => {
        /* LROC 取不到就用程序月面，舞台仍然成立 */
      },
    )
    return () => {
      alive = false
    }
  }, [])
  return { texture, disk }
}

function resolveFocus(focus: Focus, kind: EclipseKind): Exclude<Focus, 'auto'> {
  if (focus !== 'auto') return focus
  if (kind === 'total-solar' || kind === 'annular' || kind === 'partial-solar') return 'earth'
  if (kind === 'total-lunar' || kind === 'partial-lunar' || kind === 'penumbral') return 'moon'
  return 'system'
}

/* ------------------------------------------------------------------ */
/* 舞台                                                                */
/* ------------------------------------------------------------------ */

type SceneProps = {
  sim: MutRef<SimState>
  model: MutRef<EclipseState>
  focus: Focus
  focusNonce: number
  reducedMotion: boolean
  guides: boolean
  groundSite: GroundSite
  filmShot: FilmShot | null
  onInteract: () => void
  sunCompass: MutRef<HTMLDivElement | null>
  moonTex: THREE.Texture | null
}

function EclipseScene({ sim, model, focus, focusNonce, reducedMotion, guides, groundSite, filmShot, onInteract, sunCompass, moonTex }: SceneProps) {
  const tx = useExperienceI18n()
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const earthSpin = useRef<THREE.Group>(null)
  const moonGroup = useRef<THREE.Group>(null)
  const moonConeGroup = useRef<THREE.Group>(null)
  const earthConeGroup = useRef<THREE.Group>(null)
  const spotPen = useRef<THREE.Mesh>(null)
  const spotUmb = useRef<THREE.Mesh>(null)
  const spotRing = useRef<THREE.Mesh>(null)
  const nodeA = useRef<THREE.Group>(null)
  const nodeB = useRef<THREE.Group>(null)
  const sunGlow = useRef<THREE.Sprite>(null)
  const backdrop = useRef<THREE.Mesh>(null)
  const moonLabel = useRef<THREE.Group>(null)
  const umbraLabel = useRef<THREE.Group>(null)
  const wedgeLabel = useRef<THREE.Group>(null)
  const moonMat = useRef<THREE.MeshStandardMaterial>(null)
  const reference = useRef<THREE.Group>(null)
  const spotPenRing = useRef<THREE.Mesh>(null)
  const moonRing = useRef<THREE.Mesh>(null)

  const earthTex = useEarthTexture()
  const nightTex = useNightTexture()
  const earthMat = useMemo(() => createEarthEclipseMaterial(), [])
  useEffect(() => {
    if (earthTex) earthMat.uniforms.uDayMap.value = earthTex
  }, [earthTex, earthMat])
  useEffect(() => {
    if (nightTex) earthMat.uniforms.uNightMap.value = nightTex
  }, [nightTex, earthMat])
  useEffect(() => () => earthMat.dispose(), [earthMat])
  const moonFallback = useMemo(createMoonTexture, [])
  useEffect(() => {
    const mat = moonMat.current
    if (!mat) return
    mat.map = moonTex ?? moonFallback
    mat.emissiveMap = moonTex
    mat.needsUpdate = true
  }, [moonTex, moonFallback])
  const backdropTex = useMemo(createBackdropTexture, [])
  const starGeo = useMemo(() => createStarGeometry(), [])
  const starSprite = useMemo(createStarSprite, [])
  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 1.7,
        map: starSprite,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    [starSprite],
  )
  useEffect(() => () => {
    starGeo.dispose()
    starMat.dispose()
    starSprite.dispose()
  }, [starGeo, starMat, starSprite])
  const sunSurfaceTex = useMemo(createSunSurfaceTexture, [])
  const sunGlowTex = useMemo(createSunGlowTexture, [])
  const rayGeo = useMemo(createRayGeometry, [])
  const rayMat = useMemo(createRayMaterial, [])
  const penTex = useMemo(() => createSpotTexture(0.55, 0.45), [])
  const umbTex = useMemo(() => createSpotTexture(0.95, 0.72), [])
  const atmoMat = useMemo(() => createAtmosphereMaterial(SUN_DIR), [])
  /* 两套影锥材质：朔看月影、望看地影，交界处按角距平滑交接，不快闪 */
  const moonConeMat = useMemo(createConeMaterial, [])
  const earthConeMat = useMemo(createConeMaterial, [])
  const moonEdgeMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: '#8ea4d8',
        transparent: true,
        opacity: 0,
        dashSize: 1.6,
        gapSize: 2,
        depthWrite: false,
      }),
    [],
  )
  const earthEdgeMat = useMemo(() => moonEdgeMat.clone(), [moonEdgeMat])

  /* 影锥：真实收敛率，只截取镜头够得到的一段 */
  const cones = useMemo(() => {
    const earthTipR = R_EARTH - (EARTH_CONE_DRAW * (R_SUN - R_EARTH)) / D_SUN
    const earthPenTipR = R_EARTH + (EARTH_CONE_DRAW * (R_SUN + R_EARTH)) / D_SUN
    const moonPenTipR = R_MOON_DRAW + (MOON_CONE_DRAW * (R_SUN + R_MOON)) / D_SUN
    return {
      earthUmbra: createFadeCone(R_EARTH * 0.995, earthTipR, EARTH_CONE_DRAW, '#04070f', 0.5, 0.9, 0.3),
      earthPenumbra: createFadeCone(R_EARTH, earthPenTipR, EARTH_CONE_DRAW, '#0b1526', 0.16, 0.7, 0.25),
      earthEdges: createConeEdges(R_EARTH, EARTH_CONE_DRAW, earthTipR),
      // 月球本影的锥尖点在地球上 —— 那一端必须还看得见，否则戏眼就没了。
      // 锥底随月球的视觉放大同步放大，锥尖位置不变。
      moonUmbra: createFadeCone(R_MOON_DRAW * 0.98, 0.0015, MOON_CONE_DRAW, '#03060d', 0.66, 0.5, 0.62),
      moonPenumbra: createFadeCone(R_MOON_DRAW, moonPenTipR, MOON_CONE_DRAW, '#0a1122', 0.13, 0.6, 0.55),
      moonEdges: createConeEdges(R_MOON_DRAW, MOON_CONE_DRAW, 0.0015),
    }
  }, [])

  const eclipticGeo = useMemo(() => createEclipticGrid([20, 40, D_MOON_MEAN]), [])
  const orbitLine = useMemo(() => createOrbitLine(192, '#ffc46b', 0.2), [])
  const inclinationWedge = useMemo(() => createInclinationWedge(), [])

  /* 影迹：记在地球自转坐标系里，所以它是真正的地面路径 */
  const trackObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRACK_MAX * 3), 3))
    geo.setDrawRange(0, 0)
    const mat = new THREE.LineBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.72, depthWrite: false })
    const line = new THREE.Line(geo, mat)
    line.frustumCulled = false
    line.visible = false
    return line
  }, [])
  const track = useRef({ count: 0, last: new THREE.Vector3(9, 9, 9) })

  const viewSize = useThree((s) => s.size)
  const aspect = viewSize.height > 1 ? viewSize.width / viewSize.height : 1
  const portrait = aspect < 0.78
  const filmPortrait = Boolean(filmShot) && portrait
  const widen = clamp(1.45 / Math.max(aspect, 0.08), 1, 2.4)
  // 全景 / 贴黄道的横向取景在竖屏上要拉得更远，否则太阳与地球总有一个出画
  const widenFar = clamp(1.45 / Math.max(aspect, 0.08), 1, 3.2)

  const goalRef = useRef<FrameGoal | null>(null)
  const distLocked = useRef(false)
  const shaderTime = useRef(0)

  /* —— 镜头：看哪里由当前现象决定，环绕方向留给用户 —— */
  useEffect(() => {
    const m = model.current
    const resolved = resolveFocus(focus, m.kind)
    // 方位角约定：太阳在 −X，所以受光面朝 −X。机位必须留在受光那一侧，
    // 否则看到的是地球的夜半球 —— 一片纯黑，什么也读不出来。
    // 全景 / 贴黄道的机位在 +Z 一侧：太阳位于画面左端，光的故事从左向右读。
    const goals: Record<Exclude<Focus, 'auto'>, FrameGoal> = {
      // 地球特写：偏离影轴 35° —— 影锥仍看得出在收敛，影斑也还落在正脸上。
      // 竖屏短片不要再乘 widen，否则地球缩成一颗弹珠，本影半影圈读不出来。
      earth: filmPortrait
        ? { target: new THREE.Vector3(), dist: 5.9, elevation: 0.22, azimuth: -2.95 }
        : { target: new THREE.Vector3(), dist: 6.4 * widen, elevation: 0.28, azimuth: -2.95 },
      // 月球特写：月球连着影针，或正泡在地影里（月球视觉放大过，机位稍退）
      moon: { target: m.moonPos.clone(), dist: 4.3 * widen, elevation: 0.3, azimuth: -2.2 },
      // 地月全景：太阳在左、地月在右，一屏读完「光 → 遮挡 → 影子」。
      // 竖屏短片把机位拉近、抬高一点视场，否则 9:16 水平视场只剩 ~24°，三体出画或整屏空黑。
      system: filmPortrait
        ? { target: new THREE.Vector3(-32, 0, 0), dist: 142, elevation: 0.11, azimuth: 1.52 }
        : { target: new THREE.Vector3(-36, 0, 0), dist: 78 * widenFar, elevation: 0.24, azimuth: 1.57 },
      // 贴着黄道面看：5.1° 的倾角只有这个角度才看得出来。
      // 竖屏上全轨道视角只剩尘埃，改收地影附近的一段——锥从地球上下空过才是这步的戏
      edge: {
        target: new THREE.Vector3(-6, 0, 0),
        dist: (viewSize.width / viewSize.height < 1 ? 66 * widenFar : 132 * widenFar),
        elevation: 0.03,
        azimuth: 1.57,
      },
      orbit: { target: new THREE.Vector3(), dist: 1.45, elevation: 0.16, azimuth: -2.35 },
    }
    goalRef.current = goals[resolved]
    distLocked.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusNonce, widen, widenFar, filmPortrait])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const s = sim.current
    // 时间推进与几何求解由外层的单一循环负责（见 useEclipseEngine）。
    // 舞台与天空之窗都只是读者，任何一边出问题都不会冻住另一边。
    const m = model.current

    if (!reducedMotion) shaderTime.current += dt
    const t = shaderTime.current

    /* —— 天体 —— */
    if (moonGroup.current) {
      moonGroup.current.position.copy(m.moonPos)
      // 潮汐锁定：Three.js 球 u=0 在 −X（180°），LROC 图中央 0° 经线（近地面）贴在 +X。
      // 让局部 +X 永远朝向地球，看到的才是那张有月海的熟悉脸。
      _v1.copy(m.moonPos).negate().normalize()
      _v2.copy(UP).addScaledVector(_v1, -UP.dot(_v1))
      if (_v2.lengthSq() < 1e-6) _v2.set(0, 0, 1)
      else _v2.normalize()
      _v3.crossVectors(_v1, _v2).normalize()
      moonGroup.current.quaternion.setFromRotationMatrix(_m.makeBasis(_v1, _v2, _v3))
    }

    /* 平行光不投影，所以进了地影的月球必须手动染暗染红：
       否则舞台上会出现一个「泡在本影里却照样雪亮」的月亮，把现象讲反了。
       本影里的那点亮不是残留日光，是地球大气折射进来的红光。 */
    if (moonMat.current) {
      const darken = clamp(m.umbralCoverage * 0.52 + m.penumbralCoverage * 0.1, 0, 1)
      moonMat.current.color.setRGB(1.45, 1.4, 1.32).lerp(MOON_BLOOD, darken)
      moonMat.current.emissive.copy(MOON_REFRACTED).multiplyScalar(m.umbralCoverage * 0.72)
    }
    if (earthSpin.current) {
      const site = GROUND_SITES[groundSite]
      const yaw = Math.PI - THREE.MathUtils.degToRad(site.lon) - (s.day / 0.99727) * Math.PI * 2
      earthSpin.current.rotation.set(0, yaw, THREE.MathUtils.degToRad(site.lat))
    }
    const earthU = earthMat.uniforms
    earthU.uMoonPos.value.copy(m.moonPos)
    earthU.uShadowAxis.value.copy(m.moonShadowAxis)
    earthU.uUmbraR.value = m.groundUmbraR
    earthU.uPenumbraR.value = m.groundPenumbraR
    earthU.uShadowOn.value = m.shadowOnEarth ? 1 : 0
    earthU.uAnnular.value = m.kind === 'annular' || m.tipInsideEarth ? 1 : 0
    earthU.uMoonR.value = R_MOON
    earthU.uUmbraSlope.value = (R_SUN - R_MOON) / D_SUN
    earthU.uPenumbraSlope.value = (R_SUN + R_MOON) / D_SUN
    if (backdrop.current && !reducedMotion) backdrop.current.rotation.y += dt * 0.0015
    /* 太阳辉光与阳光柱的呼吸：光是活的，但 reduced-motion 下静止。
       阳光柱在特写机位淡出成微光 —— 近看靠太阳方向指示器，远看它们
       才把「光从太阳来、向地月去」连成一条线。 */
    if (sunGlow.current) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 0.7) * 0.03
      sunGlow.current.scale.setScalar(R_SUN_DRAW * 9.5 * pulse)
    }
    const showGuides = guides && focus !== 'orbit'
    const camPos = state.camera.position
    const dNear = Math.min(camPos.length(), camPos.distanceTo(m.moonPos))
    const rayVis = showGuides ? clamp((dNear - 2.6) / 26, 0.08, 0.55) : 0
    rayMat.opacity = rayVis * (reducedMotion ? 0.28 : 0.22 + Math.sin(t * 0.55) * 0.04)

    /* —— 影锥：朔看月影、望看地影，交界处按角距平滑交接，不快闪 —— */
    const moonConeF = 1 - smooth01((m.elongation - Math.PI * 0.42) / (Math.PI * 0.08))
    moonConeMat.opacity = moonConeF
    moonEdgeMat.opacity = showGuides ? 0.32 * moonConeF : 0
    earthConeMat.opacity = 1 - moonConeF
    earthEdgeMat.opacity = showGuides ? 0.32 * (1 - moonConeF) : 0
    if (moonConeGroup.current) {
      moonConeGroup.current.position.copy(m.moonPos)
      _q.setFromUnitVectors(UP, m.moonShadowAxis)
      moonConeGroup.current.quaternion.copy(_q)
      moonConeGroup.current.visible = moonConeF > 0.02 && focus !== 'orbit'
    }
    if (earthConeGroup.current) earthConeGroup.current.visible = moonConeF < 0.98 && focus !== 'orbit'

    /* —— 地面影斑：着色器已经把分区颜色画在地球上。
       标线打开时才加外圈，方便量宽度；默认关掉，避免和影子叠两套轮廓。 —— */
    const showSpot = m.shadowOnEarth
    if (spotPen.current && spotUmb.current && spotRing.current && spotPenRing.current) {
      spotPen.current.visible = false
      spotUmb.current.visible = false
      spotPenRing.current.visible = showGuides && showSpot
      spotRing.current.visible = showGuides && showSpot && (m.umbraTouches || m.kind === 'annular')
      if (showSpot) {
        _v1.copy(m.shadowSpot).normalize()
        _q.setFromUnitVectors(FORWARD, _v1)
        for (const mesh of [spotPen.current, spotPenRing.current, spotUmb.current, spotRing.current]) {
          mesh.position.copy(_v1).multiplyScalar(R_EARTH + 0.004)
          mesh.quaternion.copy(_q)
        }
        spotPen.current.scale.setScalar(Math.max(0.05, m.groundPenumbraR))
        spotPenRing.current.scale.setScalar(Math.max(0.05, m.groundPenumbraR))
        spotUmb.current.scale.setScalar(Math.max(0.004, m.groundUmbraR || 0.018))
        spotRing.current.scale.setScalar(Math.max(0.085, (m.groundUmbraR || 0.018) * 5))
      }
    }

    /* —— 影迹：写进自转坐标系，于是它是真正的地面路径 —— */
    if (earthSpin.current) {
      const buf = trackObj.geometry.attributes.position as THREE.BufferAttribute
      if (showSpot && m.umbraTouches) {
        _v2.copy(m.shadowSpot).multiplyScalar(1.004)
        earthSpin.current.worldToLocal(_v2)
        if (_v2.distanceTo(track.current.last) > 0.01) {
          if (track.current.count >= TRACK_MAX) {
            ;(buf.array as Float32Array).copyWithin(0, 3)
            track.current.count = TRACK_MAX - 1
          }
          buf.setXYZ(track.current.count, _v2.x, _v2.y, _v2.z)
          track.current.count++
          track.current.last.copy(_v2)
          buf.needsUpdate = true
          trackObj.geometry.setDrawRange(0, track.current.count)
        }
      } else if (track.current.count > 0) {
        track.current.count = 0
        trackObj.geometry.setDrawRange(0, 0)
        track.current.last.set(9, 9, 9)
      }
      trackObj.visible = track.current.count > 1 && focus !== 'orbit'
    }

    /* —— 轨道线与交点 —— */
    const node = nodeLongitude(s.day)
    const incl = s.tilted ? INCLINATION : 0
    const attr = orbitLine.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i <= 192; i++) {
      moonDirection((i / 192) * Math.PI * 2, node, incl, _v1)
      attr.setXYZ(i, _v1.x * s.moonDist, _v1.y * s.moonDist, _v1.z * s.moonDist)
    }
    attr.needsUpdate = true
    if (nodeA.current && nodeB.current) {
      nodeA.current.position.set(Math.cos(node) * s.moonDist, 0, Math.sin(node) * s.moonDist)
      nodeB.current.position.set(-Math.cos(node) * s.moonDist, 0, -Math.sin(node) * s.moonDist)
      nodeA.current.visible = s.tilted
      nodeB.current.visible = s.tilted
    }

    const showWedge = s.tilted && focus !== 'orbit' && Math.abs(m.latitudeOffset) > 0.35
    inclinationWedge.visible = showWedge && (focus === 'edge' || focus === 'system')
    if (inclinationWedge.visible) writeInclinationWedge(inclinationWedge, m.moonPos)
    if (wedgeLabel.current) {
      wedgeLabel.current.visible = inclinationWedge.visible
      if (inclinationWedge.visible) {
        _v1.copy(m.moonPos)
        _v1.y = 0
        if (_v1.lengthSq() < 1e-8) _v1.set(-1, 0, 0)
        _v1.setLength(m.moonDist)
        wedgeLabel.current.position.copy(_v1).lerp(m.moonPos, 0.5).setLength(m.moonDist * 0.62)
      }
    }

    /* —— 跟随标签 —— */
    if (moonLabel.current) moonLabel.current.position.copy(m.moonPos).add(_v3.set(0, R_MOON_DRAW + 0.6, 0))
    if (umbraLabel.current) {
      umbraLabel.current.position.copy(m.moonPos).addScaledVector(m.moonShadowAxis, MOON_CONE_DRAW * 0.5)
      umbraLabel.current.visible = moonConeF > 0.4
    }

    /* —— 镜头：目标与距离由现象驱动，环绕方向永远是用户的 —— */
    const cam = state.camera as THREE.PerspectiveCamera
    const ctrl = controlsRef.current
    const goal = goalRef.current
    if (ctrl && goal) {
      const resolved = resolveFocus(focus, m.kind)
      const orbiting = resolved === 'orbit'

      if (orbiting) {
        if (m.shadowOnEarth) {
          orbitLookAtShadow(m.shadowSpot, m.moonShadowAxis, _v2, _v3)
        } else {
          // 食已经扫出地球：仍停在日面这一侧，不要被阻尼拽到夜半球
          _v1.copy(SUN_DIR).setLength(R_EARTH)
          orbitLookAtShadow(_v1, m.moonShadowAxis, _v2, _v3)
        }
        // 竖屏短片把气象卫星机位再退一截：原 3.5 R⊕ / 36° 在 9:16 里水平视场不够装下整颗地球
        const orbitFov = filmPortrait ? 46 : 36
        if (filmPortrait) _v2.multiplyScalar(1.92)
        const snapOrbit = filmPortrait || reducedMotion
        if (snapOrbit) {
          cam.position.copy(_v2)
          ctrl.target.copy(_v3)
          cam.fov = orbitFov
        } else {
          cam.position.lerp(_v2, 1 - Math.exp(-1.8 * dt))
          ctrl.target.lerp(_v3, 1 - Math.exp(-2.2 * dt))
          cam.fov = THREE.MathUtils.damp(cam.fov, orbitFov, 3.4, dt)
        }
        cam.lookAt(ctrl.target)
        cam.updateProjectionMatrix()
        if (reference.current) reference.current.visible = false
        if (moonRing.current) moonRing.current.visible = false
        if (sunCompass.current) sunCompass.current.style.opacity = '0'
      } else {
      // 移动的目标要逐帧重算，否则快放时会跑出画面
      if (resolved === 'moon') goal.target.copy(m.moonPos)
      // 全景的取景跟着剧情走：朔（日食）对准太阳—月球—地球一线；
      // 望（月食）月球跑到地球背后，取景改收地球—地影—月球一侧，
      // 太阳留在画外，由屏幕边缘的方向指示器接管。
      else if (resolved === 'system') {
        const sunward = m.elongation < Math.PI / 2
        if (filmPortrait) {
          goal.target.set(sunward ? -32 : 10, 0, 0)
          goal.dist = sunward ? 142 : 162
        } else {
          goal.target.set(sunward ? -36 : 8, 0, 0)
          goal.dist = (sunward ? 78 : 110) * widenFar
        }
      }
      // 地球特写：把取景中心往影斑那边挪一点，别让影斑贴在边缘上
      else if (resolved === 'earth' && m.shadowOnEarth) goal.target.copy(m.shadowSpot).multiplyScalar(0.42)
      else if (resolved === 'earth') goal.target.set(0, 0, 0)

      _v1.copy(cam.position).sub(ctrl.target)
      const dist = Number.isFinite(_v1.length()) ? _v1.length() : goal.dist
      if (dist > 1e-4) _v1.divideScalar(dist)
      else _v1.set(0, 0.4, 1).normalize()

      const snapFilm = filmPortrait && (filmShot === 'space' || filmShot === 'orbit')
      const instant = reducedMotion || snapFilm
      if (instant) ctrl.target.copy(goal.target)
      else ctrl.target.lerp(goal.target, 1 - Math.exp(-3.2 * dt))

      if (distLocked.current && !snapFilm) {
        cam.position.copy(ctrl.target).addScaledVector(_v1, dist)
      } else {
        const next = instant ? goal.dist : THREE.MathUtils.damp(dist, goal.dist, 2.6, dt)
        _v2
          .set(
            Math.cos(goal.azimuth) * Math.cos(goal.elevation),
            Math.sin(goal.elevation),
            Math.sin(goal.azimuth) * Math.cos(goal.elevation),
          )
          .normalize()
        _v3.copy(_v1).lerp(_v2, instant ? 1 : 1 - Math.exp(-2.6 * dt))
        // 两个方向接近对顶时插值会掠过原点，直接换成目标方向，别让它 NaN
        if (_v3.lengthSq() < 0.0025) _v3.copy(_v2)
        else _v3.normalize()
        cam.position.copy(ctrl.target).addScaledVector(_v3, next)
        // 距离与方向都到位了才交还控制权，否则会卡在半路的机位上
        if (Math.abs(dist - goal.dist) < goal.dist * 0.015 && _v3.dot(_v2) > 0.9995) distLocked.current = true
        if (snapFilm) distLocked.current = true
      }
      const goalFov = filmPortrait && filmShot === 'space' ? 58 : 42
      if (Math.abs(cam.fov - goalFov) > 0.04) {
        cam.fov = instant ? goalFov : THREE.MathUtils.damp(cam.fov, goalFov, 3.4, dt)
        cam.updateProjectionMatrix()
      }
      ctrl.update()

      // 参考几何只在拉远时出现：贴近看时轨道线会横穿整个画面，抢掉主角
      const far = cam.position.distanceTo(ctrl.target) > 22
      if (reference.current) reference.current.visible = far
      if (moonRing.current) {
        moonRing.current.visible = showGuides && far
        if (showGuides && far) {
          moonRing.current.quaternion.copy(cam.quaternion)
          moonRing.current.scale.setScalar(clamp(cam.position.distanceTo(m.moonPos) * 0.03, R_MOON_DRAW * 2.2, 6))
        }
      }

      /* —— 太阳方向指示器：特写时太阳在画面外，把「☀ 太阳」钉在屏幕边缘。
          全景里太阳本体入画时自动隐去 —— 指示永远不和他的本体打架。 —— */
      const compassEl = sunCompass.current
      if (compassEl) {
        _v1.set(SUN_DRAW_X, 0, 0).project(cam)
        const behind = _v1.z > 1
        const nx = behind ? -_v1.x : _v1.x
        const ny = behind ? -_v1.y : _v1.y
        const onScreen = !behind && Math.abs(nx) < 0.8 && Math.abs(ny) < 0.78
        if (onScreen) {
          compassEl.style.opacity = '0'
        } else {
          const w = state.size.width
          const h = state.size.height
          const padX = Math.min(72, w * 0.16)
          const padTop = 86
          const padBottom = Math.min(200, h * 0.26)
          const px = clamp((nx * 0.5 + 0.5) * w, padX, w - padX)
          const py = clamp((-ny * 0.5 + 0.5) * h, padTop, h - padBottom)
          compassEl.style.opacity = '1'
          compassEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`
        }
      }
      }
    }
  })

  const wide = focus === 'system' || focus === 'edge'
  const photographic = focus === 'orbit'

  return (
    <>
      <color attach="background" args={['#03040a']} />
      <ambientLight intensity={0.16} />
      {/* 平行阳光：太阳远到可以当无穷远光源 */}
      <directionalLight position={[-300, 0, 0]} intensity={3.1} color="#fff4e0" />
      {/* 夜面微光：让背光侧还读得出球体，不至于一转身就剩一片死黑 */}
      <hemisphereLight args={['#26314e', '#05060c', 0.34]} />

      <mesh ref={backdrop}>
        <sphereGeometry args={[420, 40, 24]} />
        <meshBasicMaterial map={backdropTex} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <points geometry={starGeo} material={starMat} frustumCulled={false} />

      {/* 太阳：画在 −X 轴 88 R⊕ 处（真实 23481 R⊕，压缩约 267 倍，界面披露）。
          半径 1.405 R⊕ —— 地球本影锥的反向延长恰好与它相切，
          于是「影子从太阳边缘出发」在画面里是真的。 */}
      <group position={[SUN_DRAW_X, 0, 0]}>
        <mesh>
          <sphereGeometry args={[R_SUN_DRAW, 48, 32]} />
          <meshBasicMaterial map={sunSurfaceTex} toneMapped={false} />
        </mesh>
        <sprite ref={sunGlow} scale={[R_SUN_DRAW * 9.5, R_SUN_DRAW * 9.5, 1]}>
          <spriteMaterial
            map={sunGlowTex}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>

      {/* 阳光柱：标线打开时才画。 */}
      <group visible={guides && focus !== 'orbit'}>
      {RAYS.map((ray, i) => (
        <mesh
          key={i}
          geometry={rayGeo}
          material={rayMat}
          quaternion={RAY_QUAT}
          position={[-6, ray.y, ray.z]}
          scale={[ray.r, 156, ray.r]}
        />
      ))}
      </group>

      {/* 参考几何：黄道面 + 轨道 + 交点。
          只在镜头拉远时出现——贴近看时它们会横穿整个画面，反而盖住主角。 */}
      <group ref={reference}>
        <lineSegments geometry={eclipticGeo}>
          <lineBasicMaterial color="#5f7bb0" transparent opacity={0.08} depthWrite={false} />
        </lineSegments>
        <Html position={[SUN_DRAW_X, R_SUN_DRAW + 2.2, 0]} center zIndexRange={[5, 0]} pointerEvents="none">
          <span className="eclipses-tag is-sun">{tx('太阳 · 示意距离')}</span>
        </Html>
        <primitive object={orbitLine} />
        <primitive object={inclinationWedge} />
        <group ref={wedgeLabel} visible={false}>
          <Html center zIndexRange={[6, 0]} pointerEvents="none">
            <span className="eclipses-tag is-incline">{tx('倾角 5.1°')}</span>
          </Html>
        </group>
        <group ref={nodeA}>
          <mesh>
            <octahedronGeometry args={[0.42]} />
            <meshBasicMaterial color="#ffd58a" transparent opacity={0.5} />
          </mesh>
          <Html center position={[0, 1.15, 0]} zIndexRange={[6, 0]} pointerEvents="none">
            <span className="eclipses-tag is-node">{tx('升交点')}</span>
          </Html>
        </group>
        <group ref={nodeB}>
          <mesh>
            <octahedronGeometry args={[0.42]} />
            <meshBasicMaterial color="#ffd58a" transparent opacity={0.5} />
          </mesh>
          <Html center position={[0, 1.15, 0]} zIndexRange={[6, 0]} pointerEvents="none">
            <span className="eclipses-tag is-node">{tx('降交点')}</span>
          </Html>
        </group>
      </group>

      {/* 地球：半径 1，自转按真实恒星日 —— 影迹挂在这个坐标系里 */}
      <group ref={earthSpin}>
        <mesh material={earthMat}>
          <sphereGeometry args={[R_EARTH, 96, 64]} />
        </mesh>
        <primitive object={trackObj} />
      </group>
      <mesh material={atmoMat}>
        <sphereGeometry args={[R_EARTH * 1.045, 64, 48]} />
      </mesh>

      {/* 地球影锥（背日 +X）：月食就发生在这根锥子里 */}
      <group ref={earthConeGroup} quaternion={CONE_TO_X}>
        <mesh geometry={cones.earthUmbra} material={earthConeMat} position={[0, EARTH_CONE_DRAW / 2, 0]} />
        <mesh geometry={cones.earthPenumbra} material={earthConeMat} position={[0, EARTH_CONE_DRAW / 2, 0]} />
        <lineSegments geometry={cones.earthEdges} material={earthEdgeMat} position={[0, EARTH_CONE_DRAW / 2, 0]} visible={guides} />
      </group>

      {/* 地面影斑 */}
      <mesh ref={spotPen} visible={false}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial map={penTex} transparent depthWrite={false} />
      </mesh>
      <mesh ref={spotUmb} visible={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial map={umbTex} transparent depthWrite={false} />
      </mesh>
      <mesh ref={spotRing} visible={false}>
        <ringGeometry args={[0.9, 1, 40]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 半影的外圈：和里面那个小点并排，尺寸差才读得出来 */}
      <mesh ref={spotPenRing} visible={false}>
        <ringGeometry args={[0.985, 1, 72]} />
        <meshBasicMaterial color="#d4789a" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 月球：真实半径 0.273 在全景里只有几个像素 —— 视觉放大 1.8 倍（已披露），
          距离与影锥长度保持真实 */}
      <group ref={moonGroup}>
        <mesh>
          <sphereGeometry args={[R_MOON_DRAW, 96, 64]} />
          <meshStandardMaterial ref={moonMat} map={moonTex ?? moonFallback} emissiveMap={moonTex ?? undefined} roughness={0.96} metalness={0} />
        </mesh>
        {/* 拉远看时月球只有十几个像素宽 —— 套个准星才找得到它。
            准星不谎报大小：真实的小是这个世界要讲的事之一。 */}
        <mesh ref={moonRing} visible={false}>
          <ringGeometry args={[0.94, 1, 44]} />
          <meshBasicMaterial color="#cfd8ee" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 月球影锥：58.7 R⊕ 长的一根黑针，针尖刚好点到地球附近 */}
      <group ref={moonConeGroup}>
        <mesh geometry={cones.moonUmbra} material={moonConeMat} position={[0, MOON_CONE_DRAW / 2, 0]} />
        <mesh geometry={cones.moonPenumbra} material={moonConeMat} position={[0, MOON_CONE_DRAW / 2, 0]} />
        <lineSegments geometry={cones.moonEdges} material={moonEdgeMat} position={[0, MOON_CONE_DRAW / 2, 0]} visible={guides} />
      </group>

      {!photographic && (
        <Html position={[0, R_EARTH + 0.6, 0]} center zIndexRange={[5, 0]} pointerEvents="none">
          <span className="eclipses-tag">{tx('地球')}</span>
        </Html>
      )}
      {!photographic && (
      <group ref={moonLabel}>
        <Html center zIndexRange={[5, 0]} pointerEvents="none">
          <span className="eclipses-tag">{tx('月球')}</span>
        </Html>
      </group>
      )}
      {wide && (
        <group ref={umbraLabel}>
          <Html center zIndexRange={[5, 0]} pointerEvents="none">
            <span className="eclipses-tag is-shadow">{tx('月球本影 · 长 58 个地球半径')}</span>
          </Html>
        </group>
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={focus === 'orbit' ? 2.2 : 1.35}
        maxDistance={430}
        onStart={onInteract}
        onEnd={() => {
          distLocked.current = true
        }}
      />
    </>
  )
}

/* 克制的电影感 bloom：日冕与钻石环的高光在此晕开 */
function Effects() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const composer = useMemo(() => {
    const c = new EffectComposer(gl)
    c.addPass(new RenderPass(scene, camera))
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.3, 0.6, 0.9))
    c.addPass(new OutputPass())
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera])
  useEffect(() => {
    composer.setSize(size.width, size.height)
  }, [composer, size])
  useEffect(() => () => composer.dispose(), [composer])
  useFrame(() => {
    composer.render()
  }, 1)
  return null
}

/* ------------------------------------------------------------------ */
/* 天空之窗：站在影子里抬头                                              */
/* ------------------------------------------------------------------ */

function useGroundPlate(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!url) {
      setImg(null)
      return
    }
    let alive = true
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (alive) setImg(image)
    }
    image.onerror = () => {
      if (alive) setImg(null)
    }
    image.src = url
    return () => {
      alive = false
      image.onload = null
      image.onerror = null
    }
  }, [url])
  return img
}

function SkyWindow({
  model,
  expanded,
  framing,
  stage,
  reducedMotion,
  annotations,
  moonDisk,
  groundPlate,
  onToggle,
  label,
  hint,
  musicOn,
  onToggleMusic,
}: {
  model: MutRef<EclipseState>
  expanded: boolean
  framing: SkyFraming
  stage: boolean
  reducedMotion: boolean
  annotations: boolean
  moonDisk: CanvasImageSource | null
  groundPlate: CanvasImageSource | null
  onToggle: () => void
  label: string
  hint: string
  musicOn: boolean
  onToggleMusic: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tx = useExperienceI18n()
  const motionRef = useRef(reducedMotion)
  motionRef.current = reducedMotion
  const framingRef = useRef(framing)
  framingRef.current = framing
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations
  const moonDiskRef = useRef(moonDisk)
  moonDiskRef.current = moonDisk
  const plateRef = useRef(groundPlate)
  plateRef.current = groundPlate

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const view: SkyView = {
      mode: 'solar',
      framing: 'wide',
      annotations: true,
      sunAng: 0.00465,
      moonAng: 0.00452,
      separation: 0,
      posAngle: 0,
      obscuration: 0,
      totality: 0,
      annularity: 0,
      daylight: 1,
      moonR: R_MOON,
      umbraR: 0.72,
      penumbraR: 1.28,
      shadowOffset: 9,
      lunarPosAngle: 0,
      umbralCoverage: 0,
      illumination: 1,
      sunPosAngle: Math.PI,
      time: 0,
      reducedMotion,
    }

    let raf = 0
    let last = performance.now()
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const m = model.current
      view.mode = m.target === 'sun' ? 'solar' : 'lunar'
      view.framing = framingRef.current
      view.annotations = annotationsRef.current
      view.sunAng = m.sunAngRadius
      view.moonAng = m.moonAngRadius
      view.separation = m.separation
      view.posAngle = m.posAngle
      view.obscuration = m.obscuration
      view.totality = m.totality
      view.annularity = m.annularity
      view.daylight = m.daylight
      view.umbraR = m.earthUmbraR
      view.penumbraR = m.earthPenumbraR
      view.shadowOffset = m.shadowOffset
      view.lunarPosAngle = m.lunarPosAngle
      view.umbralCoverage = m.umbralCoverage
      view.illumination = m.illumination
      view.sunPosAngle = m.lunarSunAngle
      view.reducedMotion = motionRef.current
      view.moonDisk = moonDiskRef.current
      view.groundPlate = plateRef.current
      if (!motionRef.current) view.time += dt
      try {
        paintSky(ctx, w, h, view)
      } catch (error) {
        cancelAnimationFrame(raf)
        console.error('[eclipses] sky window stopped painting', error)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  return (
    <div className={`eclipses-sky${expanded ? ' is-expanded' : ''}${stage ? ' is-stage' : ''} is-${framing}`}>
      <div className="eclipses-sky-shot">
        <button type="button" className="eclipses-sky-frame" onClick={stage ? undefined : onToggle} title={stage ? label : hint} aria-label={stage ? label : hint} aria-expanded={stage || expanded}>
          <canvas ref={canvasRef} className="eclipses-sky-canvas" />
          <span className="eclipses-sky-badge">
            <i>{label}</i>
            <ArrowsOut aria-hidden="true" />
          </span>
        </button>
        {(expanded || stage) && (
          <button
            type="button"
            className="eclipses-sky-music"
            aria-pressed={musicOn}
            aria-label={tx(musicOn ? '关闭配乐' : '开启配乐')}
            title={tx(musicOn ? '关闭配乐' : '开启配乐')}
            onClick={onToggleMusic}
          >
            {musicOn ? <SpeakerHigh weight="fill" aria-hidden="true" /> : <SpeakerSlash weight="fill" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 世界                                                                */
/* ------------------------------------------------------------------ */

type Mirror = {
  moonDist: number
  speed: number
  playing: boolean
  tilted: boolean
  day: number
  kind: EclipseKind
  target: 'sun' | 'moon'
  phase: number
  angRatio: number
  magnitude: number
  obscuration: number
  umbralCoverage: number
  groundUmbraR: number
  axisMiss: number
  earthUmbraR: number
  totality: number
  annularity: number
  daylight: number
  nodeSunOffset: number
  inSeason: boolean
  tipInsideEarth: boolean
}

/**
 * 时间与几何的唯一推进者。
 * 舞台（WebGL）与天空之窗（2D canvas）是两套独立的绘制循环，
 * 都只读这一份解算结果——否则一边出错就会把另一边冻在初始状态。
 */
function useEclipseEngine(sim: MutRef<SimState>, model: MutRef<EclipseState>, onTotality: () => void) {
  const witnessed = useRef(false)
  const witness = useRef(onTotality)
  witness.current = onTotality

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = sim.current
      if (s.playing) s.day += dt * s.speed
      const m = computeEclipse(s, model.current)
      /* 第一次亲眼看到全食：这段体验有了自然的高潮 */
      if (!witnessed.current && (m.totality > 0.6 || m.umbralCoverage > 0.995)) {
        witnessed.current = true
        witness.current()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sim, model])
}

const mirrorScratch = createEclipseState()
function readMirror(sim: SimState): Mirror {
  const m = computeEclipse(sim, mirrorScratch)
  return {
    moonDist: sim.moonDist,
    speed: sim.speed,
    playing: sim.playing,
    tilted: sim.tilted,
    day: sim.day,
    kind: m.kind,
    target: m.target,
    phase: m.phase,
    angRatio: m.angRatio,
    magnitude: m.magnitude,
    obscuration: m.obscuration,
    umbralCoverage: m.umbralCoverage,
    groundUmbraR: m.groundUmbraR,
    axisMiss: m.axisMiss,
    earthUmbraR: m.earthUmbraR,
    totality: m.totality,
    annularity: m.annularity,
    daylight: m.daylight,
    nodeSunOffset: m.nodeSunOffset,
    inSeason: m.inSeason,
    tipInsideEarth: m.tipInsideEarth,
  }
}

export function Eclipses({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('eclipses')
  const reducedMotion = false
  const simRef = useRef<SimState>(initialSim())
  const modelRef = useRef<EclipseState>(createEclipseState())
  const [ui, setUi] = useState<Mirror>(() => readMirror(simRef.current))
  const [focus, setFocus] = useState<Focus>('auto')
  const [focusNonce, setFocusNonce] = useState(0)
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>('total-solar')
  const [toolTab, setToolTab] = useState<'scenes' | 'views' | 'params'>('scenes')
  const [skyExpanded, setSkyExpanded] = useState(false)
  const [skyFraming, setSkyFraming] = useState<SkyFraming>('wide')
  const [lookFrom, setLookFrom] = useState<LookFrom>('space')
  const [groundSite, setGroundSite] = useState<GroundSite>('china')
  const [musicOn, setMusicOn] = useState(false)
  const [guidesOn, setGuidesOn] = useState(true)
  const [filmShot, setFilmShot] = useState<FilmShot | null>(null)
  const audioRef = useRef<EclipseAudio | null>(null)
  const sunCompassRef = useRef<HTMLDivElement>(null)
  const moonMaps = useMoonMaps()

  useEclipseEngine(simRef, modelRef, controls.finish)

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    const id = window.setInterval(() => setUi(readMirror(simRef.current)), 110)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!musicOn || !audioRef.current) return
    audioRef.current.setIntensity(Math.max(ui.totality, ui.annularity, ui.umbralCoverage * 0.85, (1 - ui.daylight) * 0.4))
  }, [musicOn, ui.totality, ui.annularity, ui.umbralCoverage, ui.daylight])

  function sync() {
    setUi(readMirror(simRef.current))
  }

  function reframe(next: Focus) {
    setFocus(next)
    setFocusNonce((n) => n + 1)
  }

  /** 摆好一个场景。故事也走这条路，所以这里**不**记 interaction —— 真实互动只由用户点击登记。 */
  function applyScenario(key: ScenarioKey, nextFocus: Focus = 'auto') {
    const found = findScenario(key)
    const s = simRef.current
    s.day = found.day
    s.moonDist = found.moonDist
    s.tilted = true
    s.playing = false
    setActiveScenario(key)
    reframe(nextFocus)
    sync()
  }

  /* —— 读数：每一种状态都留一个真数字 —— */
  const readout = useMemo(() => {
    const pct = (v: number) => `${Math.round(v * 100)}%`
    const hybrid = ui.tipInsideEarth ? `${tx('锥尖没入地球 · 有的地方全食，有的地方环食')} · ` : ''
    switch (ui.kind) {
      case 'total-solar':
        return `${hybrid}${tx('食分')} ${ui.magnitude.toFixed(2)} · ${tx('全食带宽')} ${Math.round(ui.groundUmbraR * KM_PER_UNIT * 2)} km`
      case 'annular':
        return `${hybrid}${tx('月／日角径')} ${ui.angRatio.toFixed(3)} · ${tx('只遮住日面')} ${pct(ui.obscuration)}`
      case 'partial-solar':
        return `${tx('遮住日面')} ${pct(ui.obscuration)} · ${tx('天光仍有')} ${pct(Math.pow(1 - ui.obscuration, 1 / 3))}`
      case 'total-lunar':
        return `${tx('地影宽达')} ${(ui.earthUmbraR / R_MOON).toFixed(1)} ${tx('倍月径，所以全食能持续一个多小时')}`
      case 'partial-lunar':
        return `${tx('月面进入本影')} ${pct(ui.umbralCoverage)}`
      case 'penumbral':
        return tx('只掠过半影，亮度微降，肉眼几乎看不出来')
      default:
        return `${tx(phaseName(ui.phase))} · ${tx('距交点')} ${THREE.MathUtils.radToDeg(ui.nodeSunOffset).toFixed(1)}° · ${tx(ui.inSeason ? '在食季里' : '不在食季')} · ${tx('影锥从地球外')} ${ui.axisMiss.toFixed(1)} ${tx('个地球半径处空过')}`
    }
  }, [ui.kind, ui.magnitude, ui.groundUmbraR, ui.angRatio, ui.obscuration, ui.earthUmbraR, ui.umbralCoverage, ui.phase, ui.axisMiss, ui.nodeSunOffset, ui.inSeason, ui.tipInsideEarth, tx])

  /* —— 时间轴上的食季：一年里只有这两段窄窗轮得到食 —— */
  const cycleStart = Math.floor(ui.day / YEAR_SPAN) * YEAR_SPAN
  const dayInYear = clamp(ui.day - cycleStart, 0, YEAR_SPAN)
  const seasonBands = useMemo(
    () =>
      seasonWindows(cycleStart, YEAR_SPAN).map(([a, b]) => ({
        left: ((a - cycleStart) / YEAR_SPAN) * 100,
        width: ((b - a) / YEAR_SPAN) * 100,
      })),
    [cycleStart],
  )

  /* 故事动作要用的最新句柄。分镜数组本身必须常量化：
     GuideTour 的「进入新一步」effect 依赖 step 的对象引用，
     而读数每 110ms 就会触发一次重渲染 —— 分镜数组一旦每帧重建，
     step.action 就会每秒重跑十来次：镜头永远 settle 不下来，
     还会把导览动作误报成用户互动。 */
  function enterFilm(shot: 'ground' | 'close' | 'orbit') {
    applyFilmCue(
      shot === 'ground'
        ? { film: 'ground', scenario: 'total-solar', focus: 'earth', lookFrom: 'ground', skyFraming: 'wide', playing: false }
        : shot === 'close'
          ? { film: 'close', scenario: 'annular', focus: 'earth', lookFrom: 'ground', skyFraming: 'close', playing: false }
          : {
              film: 'orbit',
              scenario: 'total-solar',
              focus: 'orbit',
              lookFrom: 'space',
              dayNudge: -0.035,
              speed: 8 / 1440,
              playing: !reducedMotion,
            },
    )
  }

  function applyFilmCue(cue: EclipseFilmCue) {
    if (cue.groundSite) setGroundSite(cue.groundSite)
    if (cue.guides !== undefined) setGuidesOn(cue.guides)
    const framing = cue.skyFraming ?? skyFraming
    if (cue.skyFraming) setSkyFraming(cue.skyFraming)

    const look = cue.lookFrom
    if (look === 'ground') {
      setLookFrom('ground')
      setSkyExpanded(true)
      setFilmShot(cue.film ?? (framing === 'close' ? 'close' : 'ground'))
    } else if (look === 'space') {
      setLookFrom('space')
      setSkyExpanded(false)
      setFilmShot(cue.film ?? (cue.focus === 'orbit' ? 'orbit' : 'space'))
    } else if (cue.film !== undefined) {
      setFilmShot(cue.film)
      if (cue.film === 'ground' || cue.film === 'close') {
        setLookFrom('ground')
        setSkyExpanded(true)
        if (cue.film === 'close') setSkyFraming('close')
        if (cue.film === 'ground') setSkyFraming('wide')
      } else if (cue.film === 'orbit' || cue.film === 'space') {
        setLookFrom('space')
        setSkyExpanded(false)
      }
    } else if (!filmShot) {
      setFilmShot('space')
    }

    if (cue.scenario) applyScenario(cue.scenario, cue.focus ?? 'auto')
    else if (cue.focus) reframe(cue.focus)

    const sim = simRef.current
    if (cue.speed !== undefined) sim.speed = cue.speed
    if (cue.dayNudge !== undefined) sim.day += cue.dayNudge
    if (cue.playing !== undefined) sim.playing = cue.playing
    document.documentElement.classList.add('eclipses-promo-capture')
    sync()
  }

  function exitFilm() {
    document.documentElement.classList.remove('eclipses-promo-capture')
    setFilmShot(null)
    setLookFrom('space')
    setSkyExpanded(false)
    simRef.current.playing = false
    if (audioRef.current?.running) {
      setMusicOn(audioRef.current.toggle())
    }
    sync()
  }

  const filmRef = useRef({
    enterFilm,
    exitFilm,
    cue: applyFilmCue,
    snapshot: () => ({
      kind: modelRef.current.kind,
      day: simRef.current.day,
      lookFrom,
      filmShot,
    }),
  })
  filmRef.current = {
    enterFilm,
    exitFilm,
    cue: applyFilmCue,
    snapshot: () => ({
      kind: modelRef.current.kind,
      day: simRef.current.day,
      lookFrom,
      filmShot,
    }),
  }

  useEffect(() => {
    const api = {
      prepare: (shot: 'ground' | 'close' | 'orbit') => filmRef.current.enterFilm(shot),
      cue: (spec: EclipseFilmCue) => filmRef.current.cue(spec),
      exit: () => filmRef.current.exitFilm(),
      snapshot: () => filmRef.current.snapshot(),
    }
    ;(window as Window & { __eclipsesFilm?: typeof api }).__eclipsesFilm = api
    return () => {
      delete (window as Window & { __eclipsesFilm?: typeof api }).__eclipsesFilm
      document.documentElement.classList.remove('eclipses-promo-capture')
    }
  }, [])

  const actionsRef = useRef({ applyScenario, reframe, setSkyExpanded, setSkyFraming, setLookFrom, sync, reducedMotion })
  actionsRef.current = { applyScenario, reframe, setSkyExpanded, setSkyFraming, setLookFrom, sync, reducedMotion }

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: '正午，天怎么突然黑了？',
      body: '抬头看：不是云，是月亮正好走到太阳前面。城市路灯自己亮了起来。站在那一小块本影里的人，才能看见这一幕。',
      durationMs: 9000,
      action: () => {
        const a = actionsRef.current
        a.setSkyFraming('wide')
        a.applyScenario('total-solar', 'earth')
        a.setLookFrom('ground')
        a.setSkyExpanded(true)
      },
    },
    {
      title: '从天上，你看不见日食',
      body: '卫星只看见影子扫过地球。中央金边深核是本影——站在那里看见日全食；周围品红圈是半影，那里只是日偏食。',
      durationMs: 11_000,
      action: () => {
        const a = actionsRef.current
        a.applyScenario('total-solar', 'orbit')
        a.setLookFrom('space')
        a.setSkyExpanded(false)
        const sim = simRef.current
        sim.day -= 0.035
        sim.speed = 10 / 1440
        sim.playing = !a.reducedMotion
        a.sync()
      },
    },
    {
      title: '这根影子，是月亮的',
      body: '拉远看清全貌：最左边是太阳（距离压缩了两百多倍才画得进来），光线笔直向右。月亮挡在中间，拖出一根 58 个地球半径长的细影锥，锥尖正好点到地球。',
      durationMs: 10_500,
      action: () => {
        const a = actionsRef.current
        a.applyScenario('total-solar', 'system')
        a.setLookFrom('space')
        a.setSkyExpanded(false)
      },
    },
    {
      title: '差四万公里，就只剩金环',
      body: '月亮的轨道是椭的。这回它离地球远了四万多公里，影锥够不到地面——月面盖不满日面，漏出一圈金环。把这枚环放大：太阳比月亮大 400 倍、又恰好远 400 倍，全食和环食只差这一点距离。',
      durationMs: 11_000,
      action: () => {
        const a = actionsRef.current
        a.setSkyFraming('close')
        a.applyScenario('annular', 'earth')
        a.setLookFrom('ground')
        a.setSkyExpanded(true)
      },
    },
    {
      title: '所以不是每个月都有',
      body: '月亮轨道歪了 5.1°，大约是日月视直径的十倍。贴着黄道面看：大多数新月从太阳上方或下方掠过，影锥甩空地球。日食只能发生在新月靠近升交点、降交点这两个门口的时候——一年里只有两段这样的食季。',
      durationMs: 13_000,
      action: () => {
        const a = actionsRef.current
        a.applyScenario('miss', 'edge')
        a.setSkyFraming('wide')
        a.setLookFrom('space')
        a.setSkyExpanded(false)
        const sim = simRef.current
        sim.speed = 10
        sim.playing = !a.reducedMotion
        a.sync()
      },
    },
    {
      title: '这回，轮到地球的影子',
      body: '半个月后，月亮绕到地球背后，钻进地球的影子里。它没有变黑，而是泛起铜红：地球大气把全世界日出日落的红光折进了本影。地影在月亮那里宽达两个半月径，所以月全食能慢慢看上一个多小时。',
      durationMs: 10_500,
      action: () => {
        const a = actionsRef.current
        a.setSkyFraming('wide')
        a.applyScenario('total-lunar', 'moon')
        a.setLookFrom('ground')
        a.setSkyExpanded(true)
      },
    },
    ],
    [],
  )

  const speedIndex = SPEEDS.findIndex((s) => Math.abs(s.days - ui.speed) < 1e-9)
  const bodyFocus = resolveFocus(focus, ui.kind)
  const site = GROUND_SITES[groundSite]
  const dayPlate = useGroundPlate(site.day)
  const nightPlate = useGroundPlate(site.night)
  const groundPlate = ui.target === 'moon' ? nightPlate : dayPlate
  const solarOnEarth = ui.kind === 'total-solar' || ui.kind === 'annular' || ui.kind === 'partial-solar'
  const lookingUp = lookFrom === 'ground'

  function enterGround(framing: SkyFraming) {
    setLookFrom('ground')
    setSkyFraming(framing)
    setSkyExpanded(true)
    if (focus === 'orbit' || focus === 'system' || focus === 'edge') reframe('earth')
  }

  function enterSpace(next: Focus = 'earth') {
    setLookFrom('space')
    setSkyExpanded(false)
    setSkyFraming('wide')
    reframe(next)
  }

  return (
    <div
      className={`oss-experience eclipses-experience${storyMode ? ' is-story' : ' is-free'}${filmShot ? ` is-film is-film-${filmShot}` : ''}${lookingUp && !filmShot ? ' is-ground' : ''}`}
    >
      <ClientOnly fallback={<div className="canvas-loading">{tx('正在架起日月地三体…')}</div>}>
        <div className="eclipses-globe">
          <Canvas
            // 开局机位就已经在受光侧对好：首屏不需要等镜头飞过来
            camera={{ position: [-5.2, 1.55, -1.35], fov: 42, near: 0.02, far: 1400 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false }}
            onPointerDown={controls.registerInteraction}
          >
            <Suspense fallback={null}>
              <EclipseScene
                sim={simRef}
                model={modelRef}
                focus={focus}
                focusNonce={focusNonce}
                reducedMotion={reducedMotion}
                guides={guidesOn}
                groundSite={groundSite}
                filmShot={filmShot}
                onInteract={controls.registerInteraction}
                sunCompass={sunCompassRef}
                moonTex={moonMaps.texture}
              />
            </Suspense>
            <Effects />
          </Canvas>
          {lookingUp && !filmShot && (
            <button
              type="button"
              className="eclipses-globe-back"
              onClick={() => {
                enterSpace('earth')
                controls.registerInteraction()
              }}
            >
              {tx('返回太空')}
            </button>
          )}
        </div>
      </ClientOnly>

      {/* 太阳方向指示器：特写时太阳在画面外，这颗小标钉在屏幕边缘指着它；
          舞台每帧直接写 style，不走 React 渲染 */}
      <div ref={sunCompassRef} className="eclipses-sun-compass" data-experience-overlay="true" aria-hidden="true">
        <Sun weight="fill" aria-hidden="true" />
        <span>{tx('太阳')}</span>
      </div>

      {/* 点题铭牌 */}
      {!storyMode && !lookingUp && (
        <div className="eclipses-plate" data-experience-overlay="true">
          <strong>{tx('影子的几何')}</strong>
          <small>{tx('地月真实比例 · 月球放大 1.8× · 太阳距离压缩 267×')}</small>
        </div>
      )}

      {!storyMode && !lookingUp && solarOnEarth && (
        <div className="eclipses-zone-legend" data-experience-overlay="true">
          {ui.tipInsideEarth || ui.kind === 'total-solar' ? (
            <span className="is-umbra">{tx('本影 · 日全食')}</span>
          ) : null}
          {ui.tipInsideEarth || ui.kind === 'annular' ? (
            <span className="is-antumbra">{tx('伪本影 · 日环食')}</span>
          ) : null}
          <span className="is-penumbra">{tx('半影 · 日偏食')}</span>
        </div>
      )}

      {/* 天空之窗：舞台是原因，窗里是结果；地表模式改为全屏仰望 */}
      <SkyWindow
        model={modelRef}
        expanded={skyExpanded}
        framing={skyFraming}
        stage={lookingUp}
        reducedMotion={reducedMotion}
        annotations={guidesOn && !lookingUp}
        moonDisk={moonMaps.disk}
        groundPlate={groundPlate}
        onToggle={() => {
          if (lookingUp) enterSpace('earth')
          else enterGround(skyFraming)
          controls.registerInteraction()
        }}
        label={
          skyFraming === 'close'
            ? tx(ui.target === 'sun' ? '长焦 · 日面' : '长焦 · 月面')
            : `${tx(ui.target === 'sun' ? '仰望太阳' : '仰望月亮')} · ${tx(site.city)}`
        }
        hint={lookingUp ? tx('返回太空') : tx('切到地面仰望')}
        musicOn={musicOn}
        onToggleMusic={() => {
          if (!audioRef.current) audioRef.current = createEclipseAudio()
          setMusicOn(audioRef.current.toggle())
          controls.registerInteraction()
        }}
      />

      {/* 被动读数 */}
      {!storyMode && (
        <div className={`eclipses-readout is-${ui.kind}`} data-experience-overlay="true" aria-live="polite">
          <strong>{tx(ui.tipInsideEarth && (ui.kind === 'total-solar' || ui.kind === 'annular') ? '全环食' : KIND_LABEL[ui.kind])}</strong>
          <small>{readout}</small>
        </div>
      )}

      {!storyMode && !filmShot && !lookingUp && (
        <div className="eclipses-body-rail" data-experience-overlay="true" role="listbox" aria-label={tx('主体')}>
          <button
            type="button"
            role="option"
            aria-selected={bodyFocus === 'earth'}
            className={bodyFocus === 'earth' ? 'is-active' : undefined}
            onClick={() => {
              reframe('earth')
              controls.registerInteraction()
            }}
          >
            <Globe weight="fill" aria-hidden="true" />
            {tx('地球')}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={bodyFocus === 'moon'}
            className={bodyFocus === 'moon' ? 'is-active' : undefined}
            onClick={() => {
              reframe('moon')
              controls.registerInteraction()
            }}
          >
            <Moon weight="fill" aria-hidden="true" />
            {tx('月球')}
          </button>
        </div>
      )}

      {!storyMode && !filmShot && (
        <div className="eclipses-site-rail" data-experience-overlay="true" role="listbox" aria-label={tx('落点')}>
          {(Object.keys(GROUND_SITES) as GroundSite[]).map((id) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={groundSite === id}
              className={groundSite === id ? 'is-active' : undefined}
              onClick={() => {
                setGroundSite(id)
                controls.registerInteraction()
              }}
            >
              {tx(GROUND_SITES[id].label)}
            </button>
          ))}
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="eclipses-freebar"
          mainClassName="eclipses-freebar-main"
          ariaLabel={tx('探索')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondaryClassName="eclipses-freebar-secondary"
          secondary={(
            <div className="eclipses-tray">
              <div className="eclipses-tray-head">
                <FreebarTabs
                  activeId={toolTab}
                  ariaLabel={tx('次级工具')}
                  className="eclipses-tool-tabs"
                  onChange={setToolTab}
                  tabs={[
                    { id: 'scenes', label: tx('场景') },
                    { id: 'views', label: tx('机位') },
                    { id: 'params', label: tx('参数') },
                  ]}
                />
                <div className="eclipses-tray-tools">
                  <button
                    type="button"
                    className="experience-freebar-story"
                    onClick={() => {
                      controls.registerInteraction()
                      enterStory()
                      replayGuide('eclipses')
                    }}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>
              {toolTab === 'scenes' ? (
                <div className="eclipses-set experience-freebar-chips eclipses-chip-rail" role="group" aria-label={tx('场景')}>
                  {SCENARIOS.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.key}
                        type="button"
                        className={activeScenario === s.key ? 'is-active' : undefined}
                        onClick={() => {
                          controls.registerInteraction()
                          applyScenario(s.key, s.focus ?? 'auto')
                        }}
                      >
                        {Icon && <Icon weight="fill" aria-hidden="true" />}
                        {tx(s.label)}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ui.tilted}
                    className={`eclipses-tilt-switch${ui.tilted ? ' is-active' : ''}`}
                    onClick={() => {
                      simRef.current.tilted = !simRef.current.tilted
                      setActiveScenario(null)
                      controls.registerInteraction()
                      sync()
                    }}
                  >
                    {ui.tilted ? tx('倾角开') : tx('倾角关')}
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={guidesOn}
                    className={guidesOn ? 'is-active' : undefined}
                    onClick={() => {
                      setGuidesOn((v) => !v)
                      controls.registerInteraction()
                    }}
                  >
                    {guidesOn ? tx('标线开') : tx('标线关')}
                  </button>
                </div>
              ) : toolTab === 'views' ? (
                <div className="eclipses-set experience-freebar-chips eclipses-chip-rail" role="group" aria-label={tx('机位')}>
                  <button
                    type="button"
                    className={lookingUp && skyFraming === 'wide' ? 'is-active' : undefined}
                    onClick={() => {
                      enterGround('wide')
                      controls.registerInteraction()
                    }}
                  >
                    {tx('地表')}
                  </button>
                  <button
                    type="button"
                    className={lookingUp && skyFraming === 'close' ? 'is-active' : undefined}
                    onClick={() => {
                      enterGround('close')
                      controls.registerInteraction()
                    }}
                  >
                    {tx('特写')}
                  </button>
                  <button
                    type="button"
                    className={!lookingUp && focus === 'orbit' ? 'is-active' : undefined}
                    onClick={() => {
                      enterSpace('orbit')
                      applyScenario(activeScenario === 'annular' ? 'annular' : 'total-solar', 'orbit')
                      simRef.current.speed = 10 / 1440
                      simRef.current.playing = true
                      sync()
                      controls.registerInteraction()
                    }}
                  >
                    <GlobeHemisphereWest weight="fill" aria-hidden="true" />
                    {tx('地影')}
                  </button>
                  <button
                    type="button"
                    className={!lookingUp && focus === 'system' ? 'is-active' : undefined}
                    onClick={() => {
                      enterSpace(focus === 'system' ? 'auto' : 'system')
                      controls.registerInteraction()
                    }}
                  >
                    {tx('全景')}
                  </button>
                  <button
                    type="button"
                    className={filmShot ? 'is-active' : undefined}
                    onClick={() => {
                      controls.registerInteraction()
                      if (filmShot) exitFilm()
                      else enterFilm('ground')
                    }}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    {tx('短片')}
                  </button>
                </div>
              ) : (
                <div className="eclipses-params">
                  <label className="eclipses-field experience-freebar-field">
                    <span>{tx('月地距离')}</span>
                    <input
                      type="range"
                      min={D_MOON_MIN}
                      max={D_MOON_MAX}
                      step={0.01}
                      value={ui.moonDist}
                      aria-label={tx('调整月地距离')}
                      onChange={(e) => {
                        simRef.current.moonDist = Number(e.target.value)
                        setActiveScenario(null)
                        controls.registerInteraction()
                        sync()
                      }}
                    />
                    <strong>{Math.round(ui.moonDist * KM_PER_UNIT).toLocaleString('en-US')} km</strong>
                  </label>
                  <div className="eclipses-set experience-freebar-chips" role="group" aria-label={tx('时间流速')}>
                    {SPEEDS.map((s, i) => (
                      <button
                        key={s.label}
                        type="button"
                        className={speedIndex === i ? 'is-active' : undefined}
                        onClick={() => {
                          simRef.current.speed = s.days
                          simRef.current.playing = true
                          controls.registerInteraction()
                          sync()
                        }}
                      >
                        {tx(s.label === '10 分 / 秒' ? '10分' : s.label === '1 小时 / 秒' ? '1时' : s.label === '1 天 / 秒' ? '1天' : '10天')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={ui.playing ? 'true' : 'false'}
            aria-label={tx(ui.playing ? '暂停时间' : '播放时间')}
            onClick={() => {
              simRef.current.playing = !simRef.current.playing
              controls.registerInteraction()
              sync()
            }}
          >
            {ui.playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>

          <div className="eclipses-field is-time">
            <span>{tx('时间')}</span>
            <div className="eclipses-track">
              {seasonBands.map((band) => (
                <i key={`${band.left}-${band.width}`} className="eclipses-season" style={{ left: `${band.left}%`, width: `${band.width}%` }}>
                  {band.width > 6 ? <em>{tx('食季')}</em> : null}
                </i>
              ))}
              <input
                type="range"
                className="eclipses-time-range"
                min={0}
                max={YEAR_SPAN}
                step={0.002}
                value={dayInYear}
                aria-label={tx('拖动时间，等一场食')}
                onChange={(e) => {
                  simRef.current.day = cycleStart + Number(e.target.value)
                  setActiveScenario(null)
                  controls.registerInteraction()
                  sync()
                }}
              />
            </div>
            <strong>{tx(phaseName(ui.phase))}</strong>
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="eclipses"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'drift-left', width: 'normal', treatment: 'caption', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'fade', width: 'narrow', treatment: 'annotation', cue: 'left' },
          { position: 'top-left', mobilePosition: 'top-center', motion: 'scale', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'drift-left', width: 'normal', treatment: 'editorial', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'rise', width: 'wide', treatment: 'monumental', cue: 'up' },
        ]}
        showReplayChip={false}
        onExit={() => {
          enterFree()
          setLookFrom('space')
          setSkyExpanded(false)
          setSkyFraming('wide')
          // 食季那一步把时间开到 10 天/秒。退出故事时必须收回来，
          // 否则自由探索一上手就是一个已经飘走一个月的场面。
          const s = simRef.current
          s.playing = false
          s.speed = INITIAL.speed
          if (activeScenario) {
            const found = findScenario(activeScenario)
            s.day = found.day
            s.moonDist = found.moonDist
          }
          reframe('auto')
          sync()
        }}
      />
      {/* 用 tap 而不是 scrub：scrub 会真的去推滑杆，
          而这根滑杆一格是一整年 —— 一次 14% 的示范就把时间甩出去五十天，
          刚讲完的那场食当场消失。tap 只画一圈涟漪，不动世界的状态。 */}
      {!storyMode && !filmShot && (
        <GhostHint
          worldId="eclipses"
          gesture={{ type: 'tap', target: '.experience-freebar-play', label: tx('按下播放，等一场食') }}
        />
      )}
      {filmShot && (
        <div className="eclipses-film-bar" data-experience-overlay="true">
          <p>{tx('本世界模拟，不是观测录像')}</p>
          <div className="eclipses-film-reels" role="group" aria-label={tx('短片')}>
            {(
              [
                ['ground', '城市全食'],
                ['close', '金环特写'],
                ['orbit', '地影扫过'],
              ] as const
            ).map(([shot, label]) => (
              <button
                key={shot}
                type="button"
                className={filmShot === shot ? 'is-active' : undefined}
                onClick={() => {
                  controls.registerInteraction()
                  enterFilm(shot)
                }}
              >
                {tx(label)}
              </button>
            ))}
          </div>
          <button type="button" className="eclipses-film-exit" onClick={() => { controls.registerInteraction(); exitFilm() }}>
            {tx('退出短片')}
          </button>
        </div>
      )}
    </div>
  )
}
