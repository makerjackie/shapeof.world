import { observeWorldReducedMotion, worldPrefersReducedMotion } from '~/lib/world-motion'
import './styles/Rainbow.css'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  buildRainbowProfile,
  exitDirection,
  rainbowAngleDeg,
  sampleGraded,
  traceDropRay,
  waterRefractiveIndex,
  wavelengthToRgb,
  type RainbowProfile,
} from '~/components/experiences/worlds/rainbow/rainbow-optics'
import {
  CURTAIN_HALF_WIDTH_M,
  CURTAIN_TOP_M,
  CURTAIN_X_M,
  EYE_HEIGHT_M,
  advanceRain,
  antisolarOnCurtain,
  bowPointOnCurtain,
  bowTopElevationDeg,
  buildCamera,
  clamp,
  headShadowPoint,
  lerp,
  makeRainDrops,
  smoothstep,
  sunlightDirection,
  type Camera,
  type Vec3,
} from '~/components/experiences/worlds/rainbow/rainbow-scene'
import { useExperienceI18n } from '~/i18n/experience'

const WORLD_ID = 'rainbow'

/** Three wavelengths are enough to see dispersion without turning the drop into a smear. */
const TRACED_NM = [660, 545, 430]
const TRACED_COLOURS = TRACED_NM.map((nm) => wavelengthToRgb(nm))
/** Rays traced through the magnified drop; only the upper half, its mirror image adds nothing. */
const FAN_RAYS = 26
/** Angular span of the exit-angle gauge beside the magnified drop. */
const GAUGE_MAX_DEG = 60
/**
 * How much of the broad backscatter glow survives grading. Low enough that the
 * inside of the bow is a hint rather than a wash, which is also what keeps the
 * much fainter secondary bow from being crushed along with it.
 */
const GLOW_GAIN = 0.3
const DROP_COUNT = 5600
/** Pixel budget for the sky raster while the camera moves, and once it settles. */
const RASTER_PIXELS_MOVING = 52_000
const RASTER_PIXELS_STILL = 240_000
/** Walking speed of the observer, metres per second. */
const WALK_SPEED = 2.4

const MID_INDEX = waterRefractiveIndex(550)
const PRIMARY_DEG = rainbowAngleDeg(MID_INDEX, 1)
const SECONDARY_DEG = rainbowAngleDeg(MID_INDEX, 2)
/** Edges of the primary bow for the ends of the visible band, as quoted in the copy. */
const RED_DEG = rainbowAngleDeg(waterRefractiveIndex(660), 1)
const VIOLET_DEG = rainbowAngleDeg(waterRefractiveIndex(400), 1)
/** Impact parameter of the Descartes ray for mid-spectrum light. */
const CAUSTIC_IMPACT = Math.sin(Math.acos(Math.sqrt((MID_INDEX * MID_INDEX - 1) / 3)))
/** The same for light that reflects twice: cos²i = (n² − 1) / (k² + 2k) with k = 2. */
const SECONDARY_IMPACT = Math.sin(Math.acos(Math.sqrt((MID_INDEX * MID_INDEX - 1) / 8)))

const DEG = Math.PI / 180

type ViewId = 'drop' | 'sky'

type SceneStore = {
  view: ViewId
  magnify: number
  orbit: number
  orbitTarget: number
  sunElevation: number
  sunTarget: number
  walk: number
  walkTarget: number
  /** Sideways position of the observer, metres to their right. */
  side: number
  sideTarget: number
  geometry: number
  geometryTarget: number
  rays: number
  raysTarget: number
  labels: boolean
  showSecondary: boolean
  scanning: boolean
  impact: number
  colourNotes: boolean
  /** What the magnified drop shows: only its shape, or the rays through it. */
  dropDetail: 'sphere' | 'rays'
  /** Which internal-reflection order the inspected ray follows. */
  inspectOrder: 1 | 2
  /** Progress of the compass sweep that draws the bow's circle, 0..1. */
  sweep: number
  sweepTarget: number
  profile: RainbowProfile
  reducedMotion: boolean
  lastRaster: string
  rasterStillAt: number
}

function approach(current: number, target: number, rate: number, dt: number): number {
  const next = current + (target - current) * (1 - Math.exp(-rate * dt))
  return Math.abs(next - target) < 1e-3 ? target : next
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
}

export function Rainbow({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const notesRef = useRef<HTMLCanvasElement>(null)
  const closeupRef = useRef<{ cx: number; cy: number; radius: number; rotation: number } | null>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID)

  // Both the story and a return visit open on the rainbow itself.
  const [view, setView] = useState<ViewId>('sky')
  const [sunElevation, setSunElevation] = useState(12)
  const [dropRadiusMm, setDropRadiusMm] = useState(0.5)
  const [showSecondary, setShowSecondary] = useState(true)
  const [inspectOrder, setInspectOrder] = useState<1 | 2>(1)
  const [showGeometry, setShowGeometry] = useState(false)
  const [impact, setImpact] = useState(0.5)
  const [exitDeg, setExitDeg] = useState(0)
  /** Observer position mirrored for the readout, metres forward and to the right. */
  const [position, setPosition] = useState<[number, number]>([0, 0])
  const interactedRef = useRef(false)

  // Rebuilding the profile costs tens of milliseconds, so the slider stays live
  // and the optics catch up a frame later.
  const deferredRadius = useDeferredValue(dropRadiusMm)
  const deferredSecondary = useDeferredValue(showSecondary)
  const profile = useMemo<RainbowProfile>(() => buildRainbowProfile({
    dropRadiusMm: deferredRadius,
    orders: deferredSecondary ? [1, 2] : [1],
    bins: 760,
    samples: 2000,
    slices: 26,
  }), [deferredRadius, deferredSecondary])

  const markInteraction = useCallback(() => {
    if (interactedRef.current) return
    interactedRef.current = true
    controls.registerInteraction()
  }, [controls])

  /** Everything the animation loop reads. Story steps and controls both write here. */
  const scene = useRef<SceneStore>({
    view: 'sky',
    magnify: 0,
    orbit: 1,
    orbitTarget: 1,
    sunElevation: 12,
    sunTarget: 12,
    walk: 0,
    walkTarget: 0,
    side: 0,
    sideTarget: 0,
    geometry: 0,
    geometryTarget: 0,
    rays: 0,
    raysTarget: 0,
    labels: true,
    showSecondary: true,
    scanning: true,
    impact: 0.5,
    colourNotes: false,
    dropDetail: 'rays',
    inspectOrder: 1,
    sweep: 1,
    sweepTarget: 1,
    profile,
    reducedMotion: false,
    lastRaster: '',
    rasterStillAt: 0,
  })
  if (scene.current.profile !== profile) {
    scene.current.profile = profile
    scene.current.lastRaster = ''
  }

  const orbitBeforeDrop = useRef(1)
  const applyView = useCallback((next: ViewId) => {
    setView(next)
    const store = scene.current
    if (next === 'drop' && store.view !== 'drop') {
      orbitBeforeDrop.current = store.orbitTarget
      store.orbitTarget = 0
    } else if (next === 'sky' && store.view === 'drop') {
      store.orbitTarget = orbitBeforeDrop.current
    }
    store.view = next
  }, [])

  const applySun = useCallback((next: number) => {
    setSunElevation(next)
    scene.current.sunTarget = next
  }, [])

  const applySecondary = useCallback((next: boolean) => {
    setShowSecondary(next)
    scene.current.showSecondary = next
    scene.current.inspectOrder = next ? 2 : 1
    setInspectOrder(next ? 2 : 1)
  }, [])

  const applyGeometry = useCallback((next: boolean) => {
    setShowGeometry(next)
    scene.current.geometryTarget = next ? 1 : 0
  }, [])

  const applyImpact = useCallback((next: number) => {
    const store = scene.current
    store.scanning = false
    store.impact = next
    setImpact(next)
  }, [])

  // --- drawing -----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    scene.current.reducedMotion = worldPrefersReducedMotion()
    const onMotionChange = () => { scene.current.reducedMotion = worldPrefersReducedMotion() }
    const stopObservingMotion = observeWorldReducedMotion(onMotionChange)

    const drops = makeRainDrops(DROP_COUNT)
    const raster = document.createElement('canvas')
    const rasterContext = raster.getContext('2d')
    if (!rasterContext) return
    let rasterImage: ImageData | null = null
    // The raster belongs to this effect run; a re-run (language change) starts blank.
    scene.current.lastRaster = ''
    const gaugeCanvas = document.createElement('canvas')
    const gaugeContext = gaugeCanvas.getContext('2d')
    if (!gaugeContext) return
    const gaugeCache = { key: '', canvas: gaugeCanvas, context: gaugeContext }
    let profileSerial = 0
    let lastProfile: RainbowProfile | null = null

    let raf = 0
    let clock = 0
    let shownImpact = -1
    let shownExit = -1
    let shownPosition: [number, number] = [0, 0]
    let lastFrame = performance.now()
    const colour: [number, number, number] = [0, 0, 0]
    const store = scene.current

    const eyeOf = (): Vec3 => [store.walk, EYE_HEIGHT_M, store.side]

    /**
     * Sky, ground, the grey of the rain curtain and — only once the camera has
     * reached the eye — the rainbow itself, painted per direction from the same
     * profile that colours the drops. Rendered small and stretched: all of it
     * varies smoothly with direction.
     */
    const paintRaster = (camera: Camera, eye: Vec3, bowWeight: number, pixelBudget: number) => {
      const aspect = camera.width / camera.height
      const rw = Math.max(48, Math.round(Math.sqrt(pixelBudget * aspect)))
      const rh = Math.max(48, Math.round(rw / aspect))
      if (raster.width !== rw || raster.height !== rh || !rasterImage) {
        raster.width = rw
        raster.height = rh
        rasterImage = rasterContext.createImageData(rw, rh)
      }
      const pixels = rasterImage.data
      const [fx, fy, fz] = camera.forward
      const [rx, ry, rz] = camera.right
      const [ux, uy, uz] = camera.up
      const [px, py, pz] = camera.position
      const sun = sunlightDirection(store.sunElevation)
      const focal = camera.focal * (rw / camera.width)
      const profileNow = store.profile

      for (let j = 0; j < rh; j += 1) {
        const sy = (rh * 0.5 - (j + 0.5)) / focal
        for (let i = 0; i < rw; i += 1) {
          const sx = ((i + 0.5) - rw * 0.5) / focal
          let dx = fx + rx * sx + ux * sy
          let dy = fy + ry * sx + uy * sy
          let dz = fz + rz * sx + uz * sy
          const norm = Math.hypot(dx, dy, dz)
          dx /= norm
          dy /= norm
          dz /= norm

          let r: number
          let g: number
          let b: number
          if (dy < 0) {
            // Ground: wet, dark, fading into the same haze as the horizon.
            const t = -py / dy
            const fog = 1 - Math.exp(-t / 260)
            r = lerp(30, 118, fog)
            g = lerp(34, 116, fog)
            b = lerp(36, 122, fog)
            // A faint sheen on the ground where the low sun rakes across it.
            const sheen = Math.max(dx * sun[0] + dz * sun[2], 0) * 0.08 * (1 - fog)
            r += 60 * sheen
            g += 48 * sheen
            b += 30 * sheen
          } else {
            const elevation = Math.asin(Math.min(dy, 1))
            const height = Math.min(elevation / 1.05, 1)
            const zenith = Math.pow(height, 0.75)
            r = lerp(107, 20, zenith)
            g = lerp(112, 29, zenith)
            b = lerp(124, 48, zenith)
            // Warm rake along the horizon: the sun is behind the viewer and low.
            const rake = Math.exp(-elevation / 0.11) * Math.max(0.25, 1 - store.sunElevation / 60)
            r += 26 * rake
            g += 14 * rake
            b += 0 * rake
          }

          // Inside the curtain the air is full of water, so it reads slightly
          // greyer and brighter; and, seen from the eye, it carries the bow.
          if (dx > 1e-4 && px < CURTAIN_X_M) {
            const t = (CURTAIN_X_M - px) / dx
            const hy = py + dy * t
            const hz = pz + dz * t
            if (hy > -0.5 && hy < CURTAIN_TOP_M + 6 && Math.abs(hz) < CURTAIN_HALF_WIDTH_M + 8) {
              const feather = smoothstep(0, 14, CURTAIN_TOP_M + 6 - hy)
                * smoothstep(0, 18, CURTAIN_HALF_WIDTH_M + 8 - Math.abs(hz))
              r = lerp(r, 128, 0.16 * feather)
              g = lerp(g, 130, 0.16 * feather)
              b = lerp(b, 138, 0.16 * feather)
              if (bowWeight > 0.001) {
                const vx = CURTAIN_X_M - eye[0]
                const vy = hy - eye[1]
                const vz = hz - eye[2]
                const vn = Math.hypot(vx, vy, vz)
                const cosine = clamp((vx * sun[0] + vy * sun[1] + vz * sun[2]) / vn, -1, 1)
                const theta = Math.acos(cosine) / DEG
                sampleGraded(profileNow, theta, colour, GLOW_GAIN)
                const gain = 235 * bowWeight * feather * (1 + (store.showSecondary ? 1.5 * smoothstep(47, 50, theta) : 0))
                r += colour[0] * gain
                g += colour[1] * gain
                b += colour[2] * gain
              }
            }
          }

          const offset = (j * rw + i) * 4
          pixels[offset] = Math.min(r, 255)
          pixels[offset + 1] = Math.min(g, 255)
          pixels[offset + 2] = Math.min(b, 255)
          pixels[offset + 3] = 255
        }
      }
      rasterContext.putImageData(rasterImage, 0, 0)
    }

    const drawSunbeams = (camera: Camera, alpha: number) => {
      if (alpha < 0.01) return
      const sun = sunlightDirection(store.sunElevation)
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.lineWidth = 1.2
      let labelAt: [number, number] | null = null
      for (let i = 0; i < 14; i += 1) {
        const anchor: Vec3 = [store.walk - 34, 3 + i * 4.6, store.side + ((i % 5) - 2) * 9]
        const reach = (CURTAIN_X_M - anchor[0]) / sun[0]
        const start = camera.project([anchor[0] - sun[0] * 40, anchor[1] - sun[1] * 40, anchor[2]])
        const end = camera.project([anchor[0] + sun[0] * reach, anchor[1] + sun[1] * reach, anchor[2]])
        if (!start || !end) continue
        if (!labelAt && start[0] > 0 && start[1] > 40 && start[1] < camera.height * 0.6) labelAt = [start[0], start[1]]
        const beam = context.createLinearGradient(start[0], start[1], end[0], end[1])
        beam.addColorStop(0, rgba(255, 232, 190, 0.02 * alpha))
        beam.addColorStop(0.3, rgba(255, 236, 200, 0.4 * alpha))
        beam.addColorStop(1, rgba(255, 240, 210, 0.08 * alpha))
        context.strokeStyle = beam
        context.beginPath()
        context.moveTo(start[0], start[1])
        context.lineTo(end[0], end[1])
        context.stroke()
      }
      // A warm wash where the beams enter the frame: the sun itself is behind the camera.
      const glowAt = camera.project([store.walk - 74, 24 - sun[1] * 40, store.side])
      if (glowAt) {
        const glow = context.createRadialGradient(glowAt[0], glowAt[1], 0, glowAt[0], glowAt[1], Math.min(camera.width, camera.height) * 0.45)
        glow.addColorStop(0, rgba(255, 214, 150, 0.32 * alpha))
        glow.addColorStop(1, rgba(255, 214, 150, 0))
        context.fillStyle = glow
        context.fillRect(0, 0, camera.width, camera.height)
      }
      context.restore()
      if (labelAt) {
        context.save()
        context.globalAlpha = alpha
        context.font = '600 13px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 236, 200, 0.92)'
        context.textAlign = 'left'
        context.textBaseline = 'middle'
        context.fillText(
          tx('阳光：太阳在你背后'),
          clamp(labelAt[0] + 14, 12, camera.width - 170),
          clamp(labelAt[1] + 18, 60, camera.height - 20),
        )
        context.restore()
      }
    }

    /** Every drop is coloured by its own angle from the eye's antisolar direction. */
    const drawDrops = (camera: Camera, eye: Vec3, alpha: number, bowWeight: number) => {
      if (alpha < 0.01) return
      const quiet = 1 - 0.78 * bowWeight
      const [fx, fy, fz] = camera.forward
      const [rx, ry, rz] = camera.right
      const [ux, uy, uz] = camera.up
      const [px, py, pz] = camera.position
      const sun = sunlightDirection(store.sunElevation)
      const halfW = camera.width * 0.5
      const halfH = camera.height * 0.5
      const focal = camera.focal
      const profileNow = store.profile
      context.save()
      context.globalCompositeOperation = 'lighter'
      // Plain rain shares one style and one path; only drops on a bow get their own colour.
      context.beginPath()
      const plainAlpha = alpha * quiet * 0.5
      for (let i = 0; i < drops.count; i += 1) {
        const wx = drops.x[i]
        const wy = drops.y[i]
        const wz = drops.z[i]
        const relX = wx - px
        const relY = wy - py
        const relZ = wz - pz
        const depth = relX * fx + relY * fy + relZ * fz
        if (depth < 0.5) continue
        const sx = halfW + ((relX * rx + relY * ry + relZ * rz) / depth) * focal
        const sy = halfH - ((relX * ux + relY * uy + relZ * uz) / depth) * focal
        if (sx < -4 || sy < -4 || sx > camera.width + 4 || sy > camera.height + 4) continue

        const vx = wx - eye[0]
        const vy = wy - eye[1]
        const vz = wz - eye[2]
        const vn = Math.hypot(vx, vy, vz)
        const cosine = clamp((vx * sun[0] + vy * sun[1] + vz * sun[2]) / vn, -1, 1)
        const theta = Math.acos(cosine) / DEG
        sampleGraded(profileNow, theta, colour, GLOW_GAIN)
        const luma = Math.max(colour[0], colour[1], colour[2])
        const size = clamp((96 / depth) * drops.size[i], 0.6, 3) * (1 + 1.1 * Math.min(luma, 1))
        if (luma < 0.035) {
          // Falling rain reads as short vertical streaks, not dust.
          context.rect(sx - size * 0.4, sy - size * 1.1, size * 0.8, size * 2.2)
          continue
        }
        const glint = 0.05 + 0.04 * drops.size[i]
        context.fillStyle = rgba(
          Math.min((glint * 0.9 + colour[0]) * 255, 255),
          Math.min((glint * 0.95 + colour[1]) * 255, 255),
          Math.min((glint + colour[2]) * 255, 255),
          alpha * quiet * Math.min(0.45 + luma * 0.6, 1),
        )
        context.fillRect(sx - size * 0.4, sy - size * 1.1, size * 0.8, size * 2.2)
        context.beginPath()
      }
      context.fillStyle = rgba(150, 158, 170, plainAlpha)
      context.fill()
      context.restore()
    }

    const drawObserver = (camera: Camera, eye: Vec3, alpha: number) => {
      const feet = camera.project([eye[0], 0, eye[2]])
      const crown = camera.project([eye[0], 1.76, eye[2]])
      if (!feet || !crown || alpha < 0.01) return
      const heightPx = feet[1] - crown[1]
      if (heightPx < 3) return
      const fade = alpha * smoothstep(4, 12, feet[2])
      if (fade < 0.01) return
      const x = feet[0]
      const w = heightPx * 0.3
      context.save()
      context.globalAlpha = fade
      const body = context.createLinearGradient(x - w * 0.5, 0, x + w * 0.5, 0)
      body.addColorStop(0, '#ffe2b4')
      body.addColorStop(0.22, '#2c313a')
      body.addColorStop(1, '#14171d')
      context.fillStyle = body
      const shoulders = feet[1] - heightPx * 0.8
      context.beginPath()
      context.roundRect(x - w * 0.5, shoulders, w, heightPx * 0.8, w * 0.32)
      context.fill()
      context.beginPath()
      context.arc(x, feet[1] - heightPx * 0.885, heightPx * 0.095, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }

    const drawShadow = (camera: Camera, eye: Vec3, alpha: number) => {
      if (alpha < 0.01) return
      const shadow = headShadowPoint(eye, store.sunElevation, CURTAIN_X_M - 2 - eye[0])
      const a = camera.project([eye[0], 0.01, eye[2] - 0.32])
      const b = camera.project([eye[0], 0.01, eye[2] + 0.32])
      const c = camera.project([shadow[0], 0.01, shadow[2] + 0.14])
      const d = camera.project([shadow[0], 0.01, shadow[2] - 0.14])
      if (!a || !b || !c || !d) return
      context.save()
      context.globalAlpha = alpha * 0.55
      const grad = context.createLinearGradient(a[0], a[1], c[0], c[1])
      grad.addColorStop(0, 'rgba(4, 6, 10, 0.9)')
      grad.addColorStop(1, 'rgba(4, 6, 10, 0.25)')
      context.fillStyle = grad
      context.beginPath()
      context.moveTo(a[0], a[1])
      context.lineTo(b[0], b[1])
      context.lineTo(c[0], c[1])
      context.lineTo(d[0], d[1])
      context.closePath()
      context.fill()
      context.restore()
    }

    const ringPath = (camera: Camera, eye: Vec3, bowDeg: number, aboveGround: boolean, fraction = 1) => {
      const path = new Path2D()
      let open = false
      const steps = Math.round(180 * clamp(fraction, 0, 1))
      for (let step = 0; step <= steps; step += 1) {
        const phi = -180 + step * 2
        const point = bowPointOnCurtain(eye, store.sunElevation, bowDeg, phi)
        const keep = point && ((point[1] >= 0) === aboveGround)
        const screen = keep ? camera.project(point) : null
        if (!screen) {
          open = false
          continue
        }
        if (!open) path.moveTo(screen[0], screen[1])
        else path.lineTo(screen[0], screen[1])
        open = true
      }
      return path
    }

    /** Cone, axis, ring and the head-shadow marker: the geometry the bow is made of. */
    const drawGeometry = (camera: Camera, eye: Vec3, alpha: number) => {
      if (alpha < 0.01) return
      context.save()
      context.globalAlpha = alpha
      context.lineWidth = 1.2

      const sweep = clamp(store.sweep, 0, 1)
      const bows = store.showSecondary && sweep >= 1 ? [PRIMARY_DEG, SECONDARY_DEG] : [PRIMARY_DEG]
      for (const bowDeg of bows) {
        const tone = bowDeg === PRIMARY_DEG ? '255, 222, 160' : '160, 196, 240'
        const fraction = bowDeg === PRIMARY_DEG ? sweep : 1
        context.setLineDash([])
        context.strokeStyle = `rgba(${tone}, 0.8)`
        context.stroke(ringPath(camera, eye, bowDeg, true, fraction))
        context.setLineDash([3, 7])
        context.strokeStyle = `rgba(${tone}, 0.42)`
        context.stroke(ringPath(camera, eye, bowDeg, false, fraction))
      }
      // The compass hand: one 42° direction swung round the axis, tracing the circle.
      const eyeForSweep = camera.project(eye)
      if (sweep < 1 && eyeForSweep) {
        const tip = bowPointOnCurtain(eye, store.sunElevation, PRIMARY_DEG, -180 + 360 * sweep)
        const tipScreen = tip ? camera.project(tip) : null
        if (tipScreen) {
          context.setLineDash([])
          context.strokeStyle = 'rgba(255, 240, 200, 0.95)'
          context.lineWidth = 1.8
          context.beginPath()
          context.moveTo(eyeForSweep[0], eyeForSweep[1])
          context.lineTo(tipScreen[0], tipScreen[1])
          context.stroke()
          context.fillStyle = 'rgba(255, 244, 214, 1)'
          context.beginPath()
          context.arc(tipScreen[0], tipScreen[1], 4, 0, Math.PI * 2)
          context.fill()
        }
      }

      // The axis of the cone: through the head's shadow to the antisolar point.
      const eyeScreen = camera.project(eye)
      const anti = antisolarOnCurtain(eye, store.sunElevation)
      const antiScreen = camera.project(anti)
      context.setLineDash([5, 7])
      context.strokeStyle = 'rgba(255, 224, 168, 0.72)'
      if (eyeScreen && antiScreen) {
        context.beginPath()
        context.moveTo(eyeScreen[0], eyeScreen[1])
        context.lineTo(antiScreen[0], antiScreen[1])
        context.stroke()
      }
      context.setLineDash([])
      if (antiScreen) {
        context.beginPath()
        context.arc(antiScreen[0], antiScreen[1], 4.5, 0, Math.PI * 2)
        context.strokeStyle = 'rgba(255, 224, 168, 0.9)'
        context.stroke()
      }

      // Lines of the cone, eye to ring.
      context.strokeStyle = 'rgba(255, 228, 176, 0.5)'
      context.lineWidth = 1
      const topScreen = (() => {
        const point = bowPointOnCurtain(eye, store.sunElevation, PRIMARY_DEG, 0)
        return point ? camera.project(point) : null
      })()
      if (eyeScreen && sweep >= 1) {
        for (const phi of [0, -52, 52, -98, 98, -140, 140]) {
          const point = bowPointOnCurtain(eye, store.sunElevation, PRIMARY_DEG, phi)
          const screen = point ? camera.project(point) : null
          if (!screen) continue
          context.beginPath()
          context.moveTo(eyeScreen[0], eyeScreen[1])
          context.lineTo(screen[0], screen[1])
          context.stroke()
        }
      }

      // The angle itself, marked at the eye between the axis and the top of the bow.
      if (eyeScreen && antiScreen && topScreen && eyeScreen[2] > 12) {
        const axisAngle = Math.atan2(antiScreen[1] - eyeScreen[1], antiScreen[0] - eyeScreen[0])
        const topAngle = Math.atan2(topScreen[1] - eyeScreen[1], topScreen[0] - eyeScreen[0])
        const radius = Math.min(camera.width, camera.height) * 0.11
        context.beginPath()
        context.strokeStyle = 'rgba(255, 224, 168, 0.95)'
        context.lineWidth = 1.5
        context.arc(eyeScreen[0], eyeScreen[1], radius, Math.min(axisAngle, topAngle), Math.max(axisAngle, topAngle))
        context.stroke()
        const mid = (axisAngle + topAngle) / 2
        context.font = '700 14px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 232, 186, 0.98)'
        context.textAlign = 'left'
        context.textBaseline = 'middle'
        context.fillText(
          `${PRIMARY_DEG.toFixed(0)}°`,
          eyeScreen[0] + Math.cos(mid) * (radius + 12),
          eyeScreen[1] + Math.sin(mid) * (radius + 12),
        )
      }

      // Where the shadow of the head lands, labelled: that is the centre of the bow.
      const shadow = headShadowPoint(eye, store.sunElevation, CURTAIN_X_M - 2 - eye[0])
      const shadowScreen = camera.project(shadow)
      if (shadowScreen && store.sunElevation > 2.5 && shadowScreen[2] > 6) {
        context.beginPath()
        context.arc(shadowScreen[0], shadowScreen[1], 4, 0, Math.PI * 2)
        context.strokeStyle = 'rgba(255, 224, 168, 0.9)'
        context.lineWidth = 1.3
        context.stroke()
        context.font = '600 12px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 228, 176, 0.95)'
        context.textAlign = 'left'
        context.textBaseline = 'middle'
        context.fillText(tx('你头影的方向'), shadowScreen[0] + 10, shadowScreen[1])
      }
      context.restore()
    }

    /** A handful of drops on the bow, each with the sunbeam that feeds it and the ray it sends to the eye. */
    const drawReturnRays = (camera: Camera, eye: Vec3, alpha: number) => {
      if (alpha < 0.01) return
      const sun = sunlightDirection(store.sunElevation)
      const eyeScreen = camera.project(eye)
      if (!eyeScreen) return
      context.save()
      context.globalCompositeOperation = 'lighter'
      const picks: Array<[number, number]> = [
        [RED_DEG, 0], [41.9, -46], [41.5, 46], [41.1, -84], [VIOLET_DEG, 84], [41.7, -122], [41.3, 122],
      ]
      for (const [bowDeg, phi] of picks) {
        const point = bowPointOnCurtain(eye, store.sunElevation, bowDeg, phi)
        if (!point || point[1] < 0) continue
        const screen = camera.project(point)
        const from = camera.project([point[0] - sun[0] * 70, point[1] - sun[1] * 70, point[2]])
        if (!screen) continue
        sampleGraded(store.profile, bowDeg, colour, GLOW_GAIN)
        const peak = Math.max(colour[0], colour[1], colour[2], 1e-3)
        const tone = `${Math.round(255 * colour[0] / peak)}, ${Math.round(255 * colour[1] / peak)}, ${Math.round(255 * colour[2] / peak)}`
        if (from) {
          const beam = context.createLinearGradient(from[0], from[1], screen[0], screen[1])
          beam.addColorStop(0, rgba(255, 238, 205, 0))
          beam.addColorStop(1, rgba(255, 238, 205, 0.5 * alpha))
          context.strokeStyle = beam
          context.lineWidth = 1
          context.beginPath()
          context.moveTo(from[0], from[1])
          context.lineTo(screen[0], screen[1])
          context.stroke()
        }
        context.strokeStyle = `rgba(${tone}, ${0.85 * alpha})`
        context.lineWidth = 1.6
        context.beginPath()
        context.moveTo(screen[0], screen[1])
        context.lineTo(eyeScreen[0], eyeScreen[1])
        context.stroke()
        context.fillStyle = `rgba(${tone}, ${alpha})`
        context.beginPath()
        context.arc(screen[0], screen[1], 3.4, 0, Math.PI * 2)
        context.fill()
        // Pulses of light travelling sun → drop → eye, so the direction is unmistakable.
        if (from && !store.reducedMotion) {
          const legA = Math.hypot(screen[0] - from[0], screen[1] - from[1])
          const legB = Math.hypot(eyeScreen[0] - screen[0], eyeScreen[1] - screen[1])
          const total = legA + legB
          for (let k = 0; k < 3; k += 1) {
            const t = ((clock * 0.28 + k / 3 + phi / 900) % 1 + 1) % 1
            const along = t * total
            let x: number
            let y: number
            let colourNow: string
            if (along < legA) {
              const f = along / legA
              x = from[0] + (screen[0] - from[0]) * f
              y = from[1] + (screen[1] - from[1]) * f
              colourNow = `rgba(255, 240, 210, ${0.9 * alpha})`
            } else {
              const f = (along - legA) / legB
              x = screen[0] + (eyeScreen[0] - screen[0]) * f
              y = screen[1] + (eyeScreen[1] - screen[1]) * f
              colourNow = `rgba(${tone}, ${alpha})`
            }
            context.fillStyle = colourNow
            context.beginPath()
            context.arc(x, y, 2.6, 0, Math.PI * 2)
            context.fill()
          }
        }
      }
      context.restore()
    }

    /**
     * The magnified drop. Drawn in the drop's own frame — light travelling along
     * +x — then rotated to match the sun's slant in the scene, so when the view
     * pulls back the rays still point the way the scene's sunbeams do.
     */
    const drawCloseup = (cx: number, cy: number, radius: number, rotation: number, alpha: number, width: number, height: number) => {
      if (alpha < 0.01 || radius < 1) return
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      const toScreen = (lx: number, ly: number): [number, number] => [
        cx + radius * (lx * cosR + ly * sinR),
        cy + radius * (lx * sinR - ly * cosR),
      ]
      const impactOf = (index: number) => 0.03 + (index / (FAN_RAYS - 1)) * 0.955
      const inspectOrder = store.showSecondary ? store.inspectOrder : 1
      const sense = inspectOrder === 2 ? -1 : 1
      const picked = sense * clamp(Math.abs(store.impact), 0.03, 0.985)
      const orders = [inspectOrder]
      const reach = Math.min(Math.hypot(width, height) / radius, 40)
      const fade = alpha

      context.save()
      context.globalAlpha = fade

      // --- incoming sunlight -------------------------------------------
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.lineWidth = 1
      const [bx0, by0] = toScreen(-3.8, 0.5)
      const [bx1, by1] = toScreen(-0.6, 0.5)
      const beam = context.createLinearGradient(bx0, by0, bx1, by1)
      beam.addColorStop(0, 'rgba(255, 243, 218, 0)')
      beam.addColorStop(1, 'rgba(255, 246, 226, 0.6)')
      context.strokeStyle = beam
      context.beginPath()
      for (let i = 0; i < FAN_RAYS; i += 1) {
        const b = sense * impactOf(i)
        const entry = traceDropRay(b, MID_INDEX, 1).path[0]
        context.moveTo(...toScreen(-3.8, b))
        context.lineTo(...toScreen(entry[0], entry[1]))
      }
      context.stroke()
      context.restore()

      // --- the drop ------------------------------------------------------
      const [hx, hy] = toScreen(-0.36, 0.4)
      const shade = context.createRadialGradient(hx, hy, radius * 0.04, cx, cy, radius * 1.04)
      shade.addColorStop(0, 'rgba(206, 232, 255, 0.28)')
      shade.addColorStop(0.45, 'rgba(96, 132, 172, 0.12)')
      shade.addColorStop(0.87, 'rgba(24, 40, 62, 0.1)')
      shade.addColorStop(1, 'rgba(150, 196, 240, 0.3)')
      context.beginPath()
      context.arc(cx, cy, radius, 0, Math.PI * 2)
      context.fillStyle = shade
      context.fill()
      context.strokeStyle = 'rgba(178, 214, 250, 0.5)'
      context.lineWidth = 1.2
      context.stroke()

      if (store.dropDetail === 'sphere') {
        // Only the shape matters here: a glossy sphere with its size named.
        const [gx, gy] = toScreen(-0.42, 0.46)
        const gloss = context.createRadialGradient(gx, gy, 0, gx, gy, radius * 0.5)
        gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
        gloss.addColorStop(1, 'rgba(255, 255, 255, 0)')
        context.fillStyle = gloss
        context.beginPath()
        context.arc(cx, cy, radius, 0, Math.PI * 2)
        context.fill()
        if (radius >= 14) {
          // Diameter bar under the drop.
          const [ax, ay] = toScreen(-1, -1.28)
          const [bx, by] = toScreen(1, -1.28)
          context.strokeStyle = 'rgba(206, 220, 236, 0.7)'
          context.lineWidth = 1
          context.beginPath()
          context.moveTo(ax, ay)
          context.lineTo(bx, by)
          context.stroke()
          for (const [tx0, ty0] of [[ax, ay], [bx, by]]) {
            context.beginPath()
            context.arc(tx0, ty0, 2, 0, Math.PI * 2)
            context.fillStyle = 'rgba(206, 220, 236, 0.9)'
            context.fill()
          }
          const [lx, ly] = toScreen(0, -1.55)
          context.font = '600 13px Manrope, system-ui, sans-serif'
          context.fillStyle = 'rgba(230, 238, 248, 0.92)'
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.fillText(tx('直径约 1 毫米'), lx, ly)
          const sunLabel = toScreen(-3.7, sense * 1.16)
          context.font = '500 12px Manrope, system-ui, sans-serif'
          context.fillStyle = 'rgba(206, 220, 236, 0.72)'
          context.textAlign = 'left'
          context.fillText(tx('阳光'), clamp(sunLabel[0], 8, width - 60), clamp(sunLabel[1], 90, height - 16))
        }
        context.restore()
        return undefined
      }

      // --- ray fan -------------------------------------------------------
      const strokeRay = (b: number, index: number, order: number) => {
        const traced = traceDropRay(b, index, order)
        context.moveTo(...toScreen(traced.path[0][0], traced.path[0][1]))
        for (let hit = 1; hit < traced.path.length; hit += 1) {
          context.lineTo(...toScreen(traced.path[hit][0], traced.path[hit][1]))
        }
        const last = traced.path[traced.path.length - 1]
        const [dx, dy] = exitDirection(traced)
        context.lineTo(...toScreen(last[0] + dx * reach, last[1] + dy * reach))
        return traced
      }
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.lineWidth = 1
      for (const order of orders) {
        const dim = 0.42
        for (let slice = 0; slice < TRACED_NM.length; slice += 1) {
          const index = waterRefractiveIndex(TRACED_NM[slice])
          const [cr, cg, cb] = TRACED_COLOURS[slice]
          context.strokeStyle = rgba(cr, cg, cb, 0.2 * dim)
          context.beginPath()
          for (let ray = 0; ray < FAN_RAYS; ray += 1) strokeRay(sense * impactOf(ray), index, order)
          context.stroke()
        }
      }
      context.restore()

      // --- the ray under inspection ---------------------------------------
      context.save()
      context.globalCompositeOperation = 'lighter'
      context.lineWidth = 1.9
      context.lineJoin = 'round'
      let pickedExitDeg = 0
      for (let slice = 0; slice < TRACED_NM.length; slice += 1) {
        const index = waterRefractiveIndex(TRACED_NM[slice])
        const [cr, cg, cb] = TRACED_COLOURS[slice]
        context.strokeStyle = rgba(cr, cg, cb, 0.78)
        context.beginPath()
        const entry = traceDropRay(picked, index, inspectOrder).path[0]
        context.moveTo(...toScreen(-3.8, picked))
        context.lineTo(...toScreen(entry[0], entry[1]))
        const traced = strokeRay(picked, index, inspectOrder)
        if (slice === 1) pickedExitDeg = traced.scatterDeg
        context.stroke()
      }
      context.restore()
      const pathRay = traceDropRay(picked, MID_INDEX, inspectOrder)
      const pathPoints = [toScreen(-3.8, picked), ...pathRay.path.map(([x, y]) => toScreen(x, y))]
      const lastHit = pathRay.path[pathRay.path.length - 1]
      const outgoing = exitDirection(pathRay)
      pathPoints.push(toScreen(lastHit[0] + outgoing[0] * 3, lastHit[1] + outgoing[1] * 3))
      const lengths = pathPoints.slice(1).map((p, i) => Math.hypot(p[0] - pathPoints[i][0], p[1] - pathPoints[i][1]))
      let travel = ((clock * 0.22) % 1) * lengths.reduce((a, b) => a + b, 0)
      for (let i = 0; i < lengths.length; i += 1) {
        if (travel <= lengths[i]) {
          const t = travel / Math.max(lengths[i], 0.001)
          context.save()
          context.shadowBlur = 14
          context.shadowColor = '#fff3ce'
          context.fillStyle = '#fff9e8'
          context.beginPath()
          context.arc(lerp(pathPoints[i][0], pathPoints[i + 1][0], t), lerp(pathPoints[i][1], pathPoints[i + 1][1], t), 3, 0, Math.PI * 2)
          context.fill()
          context.restore()
          break
        }
        travel -= lengths[i]
      }
      for (let bounce = 1; bounce <= inspectOrder; bounce += 1) {
        const hit = pathRay.path[bounce]
        const [x, y] = toScreen(hit[0] * 1.16, hit[1] * 1.16)
        context.beginPath()
        context.arc(x, y, 10, 0, Math.PI * 2)
        context.fillStyle = 'rgba(20, 32, 48, 0.95)'
        context.fill()
        context.strokeStyle = 'rgba(255, 219, 152, 0.7)'
        context.stroke()
        context.font = '600 12px system-ui'
        context.fillStyle = '#ffe3a8'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(String(bounce), x, y)
      }
      const entry = traceDropRay(picked, MID_INDEX, inspectOrder).path[0]
      const [mx, my] = toScreen(entry[0], entry[1])
      context.beginPath()
      context.arc(mx, my, 3.4, 0, Math.PI * 2)
      context.fillStyle = 'rgba(255, 250, 236, 0.96)'
      context.fill()

      if (radius < 14) {
        context.restore()
        return pickedExitDeg
      }

      // --- the axis straight back at the sun ------------------------------
      context.save()
      context.setLineDash([5, 7])
      context.strokeStyle = 'rgba(196, 214, 236, 0.36)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(cx, cy)
      context.lineTo(...toScreen(-3.1, 0))
      context.stroke()
      context.restore()

      // --- exit-angle gauge ----------------------------------------------
      // An angle gauge, not a screen: the returning rays are a parallel bundle
      // and never meet at any finite point. Only where they point matters, so
      // the gauge reads their direction and shows how much light heads each way.
      const gaugeRadius = radius * 2.3
      const bandWidth = Math.max(radius * 0.17, 10)
      const localDir = (deg: number): [number, number] => [-Math.cos(deg * DEG), -Math.sin(deg * DEG)]
      const gaugePoint = (deg: number, distance: number): [number, number] => {
        const [lx, ly] = localDir(deg)
        return toScreen((lx * distance) / radius, (ly * distance) / radius)
      }
      const screenAngle = (deg: number) => {
        const [ax, ay] = gaugePoint(deg, gaugeRadius)
        return Math.atan2(ay - cy, ax - cx)
      }

      const a0 = screenAngle(0)
      const a1 = screenAngle(GAUGE_MAX_DEG)
      const anticlockwise = ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI < 0

      // The band and its pile-up bars only change with the optics profile or
      // the layout, so they are painted once into a cache and blitted per frame.
      const gaugeKey = `${radius.toFixed(1)}|${rotation.toFixed(3)}|${cx.toFixed(1)}|${cy.toFixed(1)}|${width}|${height}|${profileSerial}`
      if (gaugeCache.key !== gaugeKey) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        if (gaugeCache.canvas.width !== Math.round(width * dpr) || gaugeCache.canvas.height !== Math.round(height * dpr)) {
          gaugeCache.canvas.width = Math.round(width * dpr)
          gaugeCache.canvas.height = Math.round(height * dpr)
        }
        const gc = gaugeCache.context
        gc.setTransform(dpr, 0, 0, dpr, 0, 0)
        gc.clearRect(0, 0, width, height)
        gc.lineWidth = bandWidth
        gc.strokeStyle = 'rgba(4, 6, 10, 0.82)'
        gc.beginPath()
        gc.arc(cx, cy, gaugeRadius, a0, a1, anticlockwise)
        gc.stroke()
        gc.globalCompositeOperation = 'lighter'
        const steps = 150
        for (let step = 0; step < steps; step += 1) {
          const deg = (step / steps) * GAUGE_MAX_DEG
          sampleGraded(store.profile, deg, colour, GLOW_GAIN)
          const luma = Math.max(colour[0], colour[1], colour[2])
          const r = Math.min(Math.pow(colour[0], 0.62) * 262, 255)
          const g = Math.min(Math.pow(colour[1], 0.62) * 262, 255)
          const b = Math.min(Math.pow(colour[2], 0.62) * 262, 255)
          gc.strokeStyle = `rgb(${r}, ${g}, ${b})`
          gc.lineWidth = bandWidth
          gc.beginPath()
          gc.arc(cx, cy, gaugeRadius, screenAngle(deg), screenAngle(((step + 1.4) / steps) * GAUGE_MAX_DEG), anticlockwise)
          gc.stroke()
          // Pile-up bars: how many rays leave in this direction.
          if (luma > 0.02) {
            const spike = Math.pow(luma, 0.55) * radius * 0.8
            const inner = gaugePoint(deg, gaugeRadius + bandWidth * 0.5 + 2)
            const outer = gaugePoint(deg, gaugeRadius + bandWidth * 0.5 + 2 + spike)
            gc.lineWidth = Math.max((gaugeRadius * GAUGE_MAX_DEG * DEG) / steps, 1)
            gc.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.55)`
            gc.beginPath()
            gc.moveTo(inner[0], inner[1])
            gc.lineTo(outer[0], outer[1])
            gc.stroke()
          }
        }
        gc.globalCompositeOperation = 'source-over'
        gaugeCache.key = gaugeKey
      }
      context.drawImage(gaugeCache.canvas, 0, 0, width, height)

      context.strokeStyle = 'rgba(158, 182, 208, 0.36)'
      context.lineWidth = 1
      context.beginPath()
      context.arc(cx, cy, gaugeRadius - bandWidth / 2, a0, a1, anticlockwise)
      context.stroke()
      context.beginPath()
      context.arc(cx, cy, gaugeRadius + bandWidth / 2, a0, a1, anticlockwise)
      context.stroke()

      // Ticks.
      context.font = '500 11px Manrope, system-ui, sans-serif'
      context.fillStyle = 'rgba(186, 205, 226, 0.7)'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      for (const deg of [0, 20, 60]) {
        const a = gaugePoint(deg, gaugeRadius - bandWidth / 2 - 2)
        const b = gaugePoint(deg, gaugeRadius - bandWidth / 2 - 9)
        context.strokeStyle = 'rgba(186, 205, 226, 0.6)'
        context.beginPath()
        context.moveTo(a[0], a[1])
        context.lineTo(b[0], b[1])
        context.stroke()
        const label = gaugePoint(deg, gaugeRadius - bandWidth / 2 - 22)
        context.fillText(`${deg}°`, label[0], label[1])
      }

      // The caustic: where the light piles up. On a tall screen the outside of
      // the gauge runs off the left edge, so the words move inside it.
      const portrait = height > width
      const causticIn = gaugePoint(PRIMARY_DEG, gaugeRadius + bandWidth / 2 + radius * 0.82)
      const causticOut = gaugePoint(PRIMARY_DEG, gaugeRadius + bandWidth / 2 + radius * 1.0)
      context.strokeStyle = 'rgba(255, 218, 150, 0.9)'
      context.lineWidth = 1.4
      context.beginPath()
      context.moveTo(causticIn[0], causticIn[1])
      context.lineTo(causticOut[0], causticOut[1])
      context.stroke()
      if (!store.colourNotes && inspectOrder === 1) {
        const causticLabel = portrait
          ? gaugePoint(PRIMARY_DEG, gaugeRadius - bandWidth / 2 - radius * 0.86)
          : gaugePoint(PRIMARY_DEG, gaugeRadius + bandWidth / 2 + radius * 1.16)
        context.font = '700 14px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 226, 170, 0.98)'
        context.fillText(`${PRIMARY_DEG.toFixed(1)}°`, causticLabel[0], causticLabel[1])
        context.font = '500 11.5px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 226, 170, 0.8)'
        context.fillText(tx('主虹 · 一次反射'), causticLabel[0], causticLabel[1] + 16)
      }

      // The second bow's edge, when its light is traced.
      if (store.showSecondary) {
        const label = portrait
          ? gaugePoint(SECONDARY_DEG, gaugeRadius - bandWidth / 2 - radius * 0.86)
          : gaugePoint(SECONDARY_DEG, gaugeRadius + bandWidth / 2 + radius * 0.5)
        const tickA = gaugePoint(SECONDARY_DEG, gaugeRadius + bandWidth / 2 + 2)
        const tickB = gaugePoint(SECONDARY_DEG, gaugeRadius + bandWidth / 2 + radius * 0.3)
        context.strokeStyle = 'rgba(170, 206, 246, 0.9)'
        context.lineWidth = 1.3
        context.beginPath()
        context.moveTo(tickA[0], tickA[1])
        context.lineTo(tickB[0], tickB[1])
        context.stroke()
        context.font = '700 13px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(190, 216, 248, 0.98)'
        context.fillText(`${SECONDARY_DEG.toFixed(1)}°`, label[0], label[1])
        context.font = '500 11px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(190, 216, 248, 0.8)'
        context.fillText(tx('副虹 · 两次反射'), label[0], label[1] + 15)
      }

      // Per-colour edges: red furthest out, violet furthest in.
      if (store.colourNotes) {
        const notes: Array<[number, number, string, number]> = [
          [RED_DEG, 0, tx('红'), portrait ? -(bandWidth / 2 + radius * 0.5) : bandWidth / 2 + radius * 1.16],
          [VIOLET_DEG, 2, tx('紫'), -(bandWidth / 2 + radius * (portrait ? 1.3 : 0.62))],
        ]
        for (const [deg, slice, name, offset] of notes) {
          const [cr, cg, cb] = TRACED_COLOURS[slice]
          const inward = offset < 0
          const a = gaugePoint(deg, gaugeRadius + (inward ? -bandWidth / 2 - 2 : bandWidth / 2 + 2))
          const b = gaugePoint(deg, gaugeRadius + (inward ? -bandWidth / 2 - 14 : bandWidth / 2 + radius * 0.82))
          context.strokeStyle = rgba(cr, cg, cb, 0.95)
          context.lineWidth = 1.6
          context.beginPath()
          context.moveTo(a[0], a[1])
          context.lineTo(b[0], b[1])
          context.stroke()
          context.font = '700 13px Manrope, system-ui, sans-serif'
          context.fillStyle = rgba(cr, cg, cb, 1)
          const label = gaugePoint(deg, gaugeRadius + offset)
          context.fillText(`${name} ${deg.toFixed(1)}°`, label[0], label[1])
        }
      }

      // Live marker of the inspected ray.
      if (pickedExitDeg <= GAUGE_MAX_DEG) {
      const markerDeg = pickedExitDeg
      const m0 = gaugePoint(markerDeg, gaugeRadius - bandWidth / 2 - 3)
      const m1 = gaugePoint(markerDeg, gaugeRadius - bandWidth / 2 - 13)
      context.strokeStyle = 'rgba(255, 250, 235, 0.95)'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(m0[0], m0[1])
      context.lineTo(m1[0], m1[1])
      context.stroke()
      const nearCaustic = Math.abs(markerDeg - (inspectOrder === 2 ? SECONDARY_DEG : PRIMARY_DEG)) < (portrait ? 5 : 3)
      if (!(store.colourNotes || portrait) || !nearCaustic) {
        context.font = '600 12px Manrope, system-ui, sans-serif'
        context.fillStyle = 'rgba(255, 250, 235, 0.95)'
        const label = gaugePoint(markerDeg, gaugeRadius - bandWidth / 2 - (portrait ? radius * 0.36 : 44))
        context.fillText(`${pickedExitDeg.toFixed(1)}°`, label[0], label[1])
      }

      }

      // Words that name what is on screen.
      context.font = '500 12px Manrope, system-ui, sans-serif'
      context.fillStyle = 'rgba(206, 220, 236, 0.72)'
      context.textAlign = 'left'
      const sunLabel = toScreen(-3.7, sense * 1.16)
      context.fillText(tx('阳光'), clamp(sunLabel[0], 8, width - 60), clamp(sunLabel[1], 90, height - 16))
      const axisLabel = toScreen(-2.4, 0.16)
      context.fillText(tx('朝太阳的方向'), clamp(axisLabel[0], 8, width - 100), clamp(axisLabel[1], 16, height - 16))
      const eyeLabel = gaugePoint(GAUGE_MAX_DEG + 4, gaugeRadius + bandWidth / 2 + radius * 0.55)
      context.textAlign = 'center'
      context.fillText(tx('出射方向'), clamp(eyeLabel[0], 50, width - 50), clamp(eyeLabel[1], 16, height - 16))

      context.restore()
      return pickedExitDeg
    }

    const drawSkyNotes = (camera: Camera, eye: Vec3, alpha: number) => {
      const overlay = notesRef.current
      const nc = overlay?.getContext('2d')
      if (!overlay || !nc) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (overlay.width !== Math.round(camera.width * dpr) || overlay.height !== Math.round(camera.height * dpr)) {
        overlay.width = Math.round(camera.width * dpr)
        overlay.height = Math.round(camera.height * dpr)
      }
      nc.setTransform(dpr, 0, 0, dpr, 0, 0)
      nc.clearRect(0, 0, camera.width, camera.height)
      if (!store.labels || alpha < 0.1 || store.orbit < 0.98 || store.profile.primaryDeg < 1) return
      const portrait = camera.height > camera.width
      const notes: Array<[number, number, string, number]> = [
        [PRIMARY_DEG, -26, tx('主虹 · 外红内紫'), 34],
        ...(store.showSecondary ? [
          [SECONDARY_DEG, 24, tx('副虹 · 外紫内红'), -38],
          [46, 0, tx('两圈之间更暗'), 0],
        ] as Array<[number, number, string, number]> : []),
      ]
      nc.globalAlpha = alpha
      nc.font = `${portrait ? 11 : 12}px Manrope, system-ui, sans-serif`
      nc.textAlign = 'center'
      nc.textBaseline = 'middle'
      for (const [theta, phi, label, offset] of notes) {
        const point = bowPointOnCurtain(eye, store.sunElevation, theta, phi)
        if (!point || point[1] <= 0 || Math.abs(point[2]) >= CURTAIN_HALF_WIDTH_M) continue
        const at = camera.project(point)
        if (!at) continue
        const halfText = nc.measureText(label).width / 2 + 8
        const x = clamp(at[0], halfText, camera.width - halfText)
        const y = at[1] + offset
        if (y < (portrait ? 160 : 90) || y > camera.height * 0.72) continue
        nc.shadowColor = '#06111f'
        nc.shadowBlur = 7
        nc.fillStyle = 'rgba(234, 241, 251, 0.88)'
        nc.fillText(label, x, y)
        nc.shadowBlur = 0
        if (offset) {
          nc.strokeStyle = 'rgba(217, 230, 246, 0.42)'
          nc.beginPath()
          nc.moveTo(x, y - Math.sign(offset) * 10)
          nc.lineTo(at[0], at[1] + Math.sign(offset) * 5)
          nc.stroke()
        }
      }
    }

    const frame = (now: number) => {
      try {
        const dt = Math.min((now - lastFrame) / 1000, 0.1)
        lastFrame = now
        const reduced = store.reducedMotion
        if (!reduced) clock += dt

        // Ease every continuous quantity towards its target.
        const rate = reduced ? 1e6 : 1
        store.orbit = approach(store.orbit, store.orbitTarget, 1.7 * rate, dt)
        store.sunElevation = approach(store.sunElevation, store.sunTarget, 2.2 * rate, dt)
        store.geometry = approach(store.geometry, store.geometryTarget, 3 * rate, dt)
        store.rays = approach(store.rays, store.raysTarget, 2.6 * rate, dt)
        if (store.sweep < store.sweepTarget) {
          store.sweep = reduced ? store.sweepTarget : Math.min(store.sweep + dt / 4.5, store.sweepTarget)
        }
        store.magnify = approach(store.magnify, store.view === 'drop' ? 1 : 0, 2.4 * rate, dt)
        if (store.walk !== store.walkTarget) {
          const stepM = reduced ? Infinity : WALK_SPEED * dt
          store.walk = Math.abs(store.walkTarget - store.walk) <= stepM
            ? store.walkTarget
            : store.walk + Math.sign(store.walkTarget - store.walk) * stepM
        }
        if (store.side !== store.sideTarget) {
          const stepM = reduced ? Infinity : WALK_SPEED * dt
          store.side = Math.abs(store.sideTarget - store.side) <= stepM
            ? store.sideTarget
            : store.side + Math.sign(store.sideTarget - store.side) * stepM
        }
        if (!reduced) advanceRain(drops, dt)

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        // A frame that throws leaves save() unpaired; start every frame from a clean state.
        ;(context as CanvasRenderingContext2D & { reset?: () => void }).reset?.()
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'

        if (store.profile !== lastProfile) {
          lastProfile = store.profile
          profileSerial += 1
        }
        const eye = eyeOf()
        const camera = buildCamera({ eye, orbit: store.orbit, sunElevationDeg: store.sunElevation, width, height })
        const bowWeight = smoothstep(0.6, 1, store.orbit)
        const insideDrop = store.magnify >= 0.999

        // Repaint the raster only when the view it depends on has changed, at
        // low resolution while moving and full resolution once it settles.
        const rasterKey = [
          store.orbit.toFixed(3), store.sunElevation.toFixed(2), store.walk.toFixed(2), store.side.toFixed(2),
          width, height, store.showSecondary ? 's' : 'n',
        ].join('|')
        const changed = rasterKey !== store.lastRaster && `${rasterKey}|hi` !== store.lastRaster
        if (changed) store.rasterStillAt = now
        const settled = now - store.rasterStillAt > 220
        const wantHigh = settled && (store.magnify < 0.98)
        const highKey = `${rasterKey}|hi`
        if (!insideDrop) {
          if (changed || (wantHigh && store.lastRaster !== highKey)) {
            paintRaster(camera, eye, bowWeight, wantHigh ? RASTER_PIXELS_STILL : RASTER_PIXELS_MOVING)
            store.lastRaster = wantHigh ? highKey : rasterKey
          }
          context.imageSmoothingEnabled = true
          context.imageSmoothingQuality = 'high'
          context.drawImage(raster, 0, 0, width, height)
        }

        if (Math.abs(store.walk - shownPosition[0]) > 0.3 || Math.abs(store.side - shownPosition[1]) > 0.3) {
          shownPosition = [store.walk, store.side]
          setPosition(shownPosition)
        }
        const sceneAlpha = 1 - smoothstep(0.15, 0.85, store.magnify)
        const nearEye = smoothstep(0.86, 1, store.orbit)
        drawSunbeams(camera, (1 - nearEye) * sceneAlpha)
        drawShadow(camera, eye, sceneAlpha)
        drawDrops(camera, eye, sceneAlpha, bowWeight)
        drawGeometry(camera, eye, store.geometry * sceneAlpha)
        drawReturnRays(camera, eye, store.rays * sceneAlpha)
        drawObserver(camera, eye, sceneAlpha)
        drawSkyNotes(camera, eye, sceneAlpha)

        // The magnified drop grows out of the top of the bow and shrinks back into it.
        if (store.magnify > 0.002) {
          const hero = bowPointOnCurtain(eye, store.sunElevation, PRIMARY_DEG, 0)
          const heroScreen = hero ? camera.project(hero) : null
          const portrait = height > width * 1.05
          const fullRadius = portrait ? Math.min(width * 0.2, height * 0.1) : Math.min(width * 0.115, height * 0.19)
          const fullCentre: [number, number] = portrait
            ? [width * 0.6, height * 0.4]
            : [width * 0.66, height * 0.36]
          const m = smoothstep(0, 1, store.magnify)
          const anchor: [number, number] = heroScreen ? [heroScreen[0], heroScreen[1]] : fullCentre
          const cx = lerp(anchor[0], fullCentre[0], m)
          const cy = lerp(anchor[1], fullCentre[1], m)
          const radius = Math.exp(lerp(Math.log(1.2), Math.log(fullRadius), m))
          // Slant of sunlight on screen, so the diagram agrees with the scene.
          const sun = sunlightDirection(store.sunElevation)
          const p0 = camera.project([CURTAIN_X_M - 20, 40, 0])
          const p1 = camera.project([CURTAIN_X_M - 20 + sun[0] * 10, 40 + sun[1] * 10, 0])
          const rotation = p0 && p1 ? Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) : 0

          // Studio dark behind the diagram, so the ray fan is the only light in the room.
          const backdrop = context.createRadialGradient(cx, cy, radius * 0.5, cx, cy, Math.hypot(width, height) * 0.75)
          backdrop.addColorStop(0, rgba(9, 13, 20, 0.985 * m))
          backdrop.addColorStop(1, rgba(3, 5, 9, 0.99 * m))
          context.fillStyle = backdrop
          context.fillRect(0, 0, width, height)

          if (store.scanning && !reduced) {
            // Sweep the entry point across the drop and back again. The exit
            // angle it drags along the gauge is the whole lesson.
            const cycle = (clock * 0.13) % 1
            const triangle = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2
            store.impact = 0.03 + 0.955 * triangle
            if (Math.abs(store.impact - shownImpact) > 0.004) {
              shownImpact = store.impact
              setImpact(store.impact)
            }
          }
          closeupRef.current = { cx, cy, radius, rotation }
          const exit = drawCloseup(cx, cy, radius, rotation, smoothstep(0.3, 0.75, store.magnify), width, height)
          if (exit !== undefined && Math.abs(exit - shownExit) > 0.05) {
            shownExit = exit
            setExitDeg(exit)
          }
        }
      } catch (error) {
        console.error('[rainbow] frame failed', error)
        return
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      stopObservingMotion()
    }
  }, [tx])

  /** Move the observer by a step; the rain stays where it is. */
  const walkBy = useCallback((forwardM: number, rightM: number) => {
    const store = scene.current
    if (store.view !== 'sky') applyView('sky')
    store.walkTarget = clamp(store.walkTarget + forwardM, -70, 80)
    store.sideTarget = clamp(store.sideTarget + rightM, -150, 150)
  }, [applyView])

  const walkHome = useCallback(() => {
    const store = scene.current
    store.walkTarget = 0
    store.sideTarget = 0
  }, [])

  // Arrow keys and WASD walk in free mode; the story owns the arrows while it runs.
  useEffect(() => {
    if (storyMode) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, button, [contenteditable="true"]')) return
      const step = 8
      const moves: Record<string, [number, number]> = {
        ArrowUp: [step, 0], w: [step, 0], W: [step, 0],
        ArrowDown: [-step, 0], s: [-step, 0], S: [-step, 0],
        ArrowLeft: [0, -step], a: [0, -step], A: [0, -step],
        ArrowRight: [0, step], d: [0, step], D: [0, step],
      }
      const move = moves[event.key]
      if (!move) return
      event.preventDefault()
      markInteraction()
      walkBy(move[0], move[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [markInteraction, storyMode, walkBy])

  // --- pointer: pick a ray on the drop, or swing the camera round the scene --
  const drag = useRef<{ x: number; y: number; orbit: number } | null>(null)
  const pickRay = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const layout = closeupRef.current
    if (!layout) return
    const { cx, cy, radius, rotation } = layout
    const dx = event.clientX - rect.left - cx
    const dy = event.clientY - rect.top - cy
    // Local "height above the axis" in the drop frame, undoing the slant.
    const ly = (dx * Math.sin(rotation) - dy * Math.cos(rotation)) / radius
    applyImpact(clamp(Math.abs(ly), 0.03, 0.985))
  }, [applyImpact])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (storyMode) return
    drag.current = { x: event.clientX, y: event.clientY, orbit: scene.current.orbitTarget }
    event.currentTarget.setPointerCapture(event.pointerId)
    markInteraction()
    if (view === 'drop') pickRay(event)
  }, [markInteraction, storyMode, view])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current || storyMode) return
    if (view === 'drop') {
      pickRay(event)
      return
    }
    const width = canvasRef.current?.clientWidth || 1
    const next = clamp(drag.current.orbit + ((event.clientX - drag.current.x) / width) * 1.6, 0, 1)
    scene.current.orbitTarget = next
  }, [pickRay, storyMode, view])

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  /** Reset every story-only flag so a beat starts from a known state. */
  const settle = useCallback(() => {
    setDropRadiusMm(0.5)
    applySun(12)
    const store = scene.current
    store.raysTarget = 0
    store.geometryTarget = 0
    setShowGeometry(false)
    store.walkTarget = 0
    store.sideTarget = 0
    store.labels = false
    store.scanning = false
    store.colourNotes = false
    store.dropDetail = 'rays'
    store.inspectOrder = 1
    store.sweep = 1
    store.sweepTarget = 1
  }, [applySun])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('彩虹外面，还有一道彩虹'),
      body: tx('里面鲜亮的是主虹，外面较淡的是副虹。仔细看：两圈的颜色顺序正好相反，红色都朝着中间的暗带。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 1
        applySun(12)
        applySecondary(true)
        applyGeometry(false)
        setDropRadiusMm(0.5)
        store.walkTarget = 0
        store.sideTarget = 0
        store.labels = true
      },
      durationMs: 7000,
    },
    {
      title: tx('一道彩虹，一次反射'),
      body: tx('阳光进入水滴时分开颜色，在内壁反射一次，再折出水面。跟着亮点走：标着 1 的地方就是反射。许多光线集中在约 42° 的方向，形成主虹。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('drop')
        applySun(12)
        applySecondary(false)
        applyImpact(CAUSTIC_IMPACT)
      },
      durationMs: 7500,
    },
    {
      title: tx('外面那道，多反射了一次'),
      body: tx('另一部分光在水滴里反射两次才出来。跟着亮点数 1、2：多一次反射，留下的光更少，亮边移到约 51°，颜色也反过来。这就是副虹。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('drop')
        applySecondary(true)
        applyImpact(SECONDARY_IMPACT)
      },
      durationMs: 8500,
    },
    {
      title: tx('两道彩虹，把暗带夹在中间'),
      body: tx('回到天空：主虹内侧和副虹外侧都有额外的雨滴散射光，两圈之间却少了这部分光，于是显得更暗。这圈较暗的天空叫亚历山大暗带，并不是完全没有光。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 1
        applySecondary(true)
        store.labels = true
      },
      durationMs: 7500,
    },
    {
      title: tx('太阳升高，两道彩虹一起下沉'),
      body: tx('把太阳从 12° 升到 45°。主虹先落到地平线下，外圈还剩一小段。能不能看见彩虹，要看太阳有多高、那个方向有没有水滴，不能只看是不是正午。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 1
        applySecondary(true)
        applySun(45)
      },
      durationMs: 7500,
    },
    {
      title: tx('雨滴变小，彩虹渐渐发白'),
      body: tx('把水滴缩到雾滴大小，光的波动效应让色带变宽、互相重叠，彩虹便淡成白色的雾虹。把水滴调大，颜色又会分开。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 1
        applySun(12)
        applySecondary(false)
        setDropRadiusMm(0.01)
      },
      durationMs: 7500,
    },
    {
      title: tx('你走一步，换一批雨滴送光'),
      body: tx('从侧面看，彩虹围绕你的头影方向。你向前走，送光的雨滴换了，角度却几乎不变，所以总也走不到彩虹脚下。底部的方向键可以让你自己试。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 0.2
        applySun(12)
        setDropRadiusMm(0.5)
        applySecondary(true)
        applyGeometry(true)
        store.raysTarget = 1
        store.walkTarget = 10
      },
      durationMs: 8000,
    },
    {
      title: tx('回到雨后，自己找一找'),
      body: tx('在「天空」「主虹光路」「副虹光路」之间切换，比较一次和两次反射。展开底栏，还能改变太阳高度、水滴大小，或走动看看彩虹怎样跟着你变。'),
      action: () => {
        settle()
        const store = scene.current
        applyView('sky')
        store.orbitTarget = 1
        applySun(12)
        setDropRadiusMm(0.5)
        applySecondary(true)
        applyGeometry(false)
        store.walkTarget = 0
        store.labels = true
      },
      durationMs: 6500,
    },
  ]

  const bowTop = bowTopElevationDeg(sunElevation, PRIMARY_DEG)
  const rainDistance = CURTAIN_X_M - position[0]
  const insideRain = Math.abs(position[0] - CURTAIN_X_M) <= 3
  const beyondRain = position[0] > CURTAIN_X_M + 3
  const dropLabel = dropRadiusMm >= 0.5
    ? tx('雨滴')
    : dropRadiusMm >= 0.1
      ? tx('细雨')
      : tx('雾滴')

  return (
    <div className={`oss-experience rb-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="rb-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <canvas ref={notesRef} className="rb-notes" data-experience-overlay="true" aria-hidden="true" />

      {!storyMode && (
        <header className="rb-plaque" data-experience-overlay="true">
          <h1>{view === 'sky' ? tx('彩虹为什么会有两道？') : inspectOrder === 2 ? tx('副虹：水滴里反射两次') : tx('主虹：水滴里反射一次')}</h1>
          <p>{view === 'drop'
            ? tx('跟着亮点数反射；拖动光线，看出射方向怎样改变。')
            : dropRadiusMm < 0.04
              ? tx('雾滴让色带变宽、重叠，形成近乎白色的雾虹。')
              : sunElevation >= 54
                ? tx('两道彩虹都已落到地平线下。降低太阳，彩虹会重新升起。')
                : !showSecondary
                  ? tx('主虹外红内紫。打开第二道彩虹，比较相反的颜色顺序。')
              : sunElevation > 43
                ? tx('主虹已在地平线下；副虹要到太阳更高时才消失。')
                : tx('外圈更淡、颜色反过来，两圈之间的天空更暗。')}</p>
        </header>
      )}

      {!storyMode && (
        <aside className="rb-hud" data-experience-overlay="true" data-freebar-clearance="true">
          {view === 'sky' ? (
            <>
              <div className="rb-hud-row">
                <small>{tx('太阳高度')}</small>
                <strong className="is-warm">{sunElevation}°</strong>
              </div>
              {dropRadiusMm >= 0.04 && <div className="rb-hud-row">
                <small>{tx('彩虹顶')}</small>
                <strong className="is-cool">{bowTop > 0 ? `${bowTop.toFixed(0)}°` : tx('地平线下')}</strong>
              </div>}
              <div className="rb-hud-row">
                <small>{tx('到雨幕')}</small>
                <strong>{beyondRain ? tx('已走出雨') : insideRain ? tx('雨里') : `${Math.round(rainDistance)} m`}</strong>
              </div>
              {Math.abs(position[1]) > 0.5 && (
                <div className="rb-hud-row">
                  <small>{tx('偏离起点')}</small>
                  <strong>{position[1] > 0 ? tx('右') : tx('左')} {Math.round(Math.abs(position[1]))} m</strong>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rb-hud-row">
                <small>{tx('入射位置')}</small>
                <strong className="is-cool">{Math.abs(impact).toFixed(2)}</strong>
              </div>
              <div className="rb-hud-row">
                <small>{tx('偏离回头方向')}</small>
                <strong>{exitDeg.toFixed(1)}°</strong>
              </div>
              <div className="rb-hud-row">
                <small>{inspectOrder === 2 ? tx('副虹亮边') : tx('主虹亮边')}</small>
                <strong className="is-warm">{(inspectOrder === 2 ? SECONDARY_DEG : PRIMARY_DEG).toFixed(1)}°</strong>
              </div>
            </>
          )}
          <div className="rb-hud-row">
            <small>{tx('水滴')}</small>
            <strong>{dropLabel}</strong>
          </div>
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="rb-freebar"
          ariaLabel={tx('彩虹控制')}
          primaryControlBudget={3}
          secondaryDefault="auto"
          mobileDensity="comfortable"
          secondary={(
            <div className="rb-tray">
          {view === 'sky' ? (
            <label className="rb-field">
              <span>{tx('太阳高度')}</span>
              <input
                type="range"
                min="0"
                max="55"
                step="1"
                value={sunElevation}
                onChange={(event) => { markInteraction(); applySun(Number(event.target.value)) }}
              />
              <b>{sunElevation}°</b>
            </label>
          ) : (
            <label className="rb-field">
              <span>{tx('入射位置')}</span>
              <input
                type="range"
                min="0.03"
                max="0.985"
                step="0.005"
                value={Math.abs(impact)}
                onChange={(event) => { markInteraction(); applyImpact(Number(event.target.value)) }}
              />
              <b>{Math.abs(impact).toFixed(2)}</b>
            </label>
          )}
              <label className="rb-field experience-freebar-field">
                <span>{tx('水滴半径')}</span>
                <input
                  type="range"
                  min="-2.3"
                  max="0.3"
                  step="0.05"
                  value={Math.log10(dropRadiusMm)}
                  onChange={(event) => {
                    markInteraction()
                    const radius = Number((10 ** Number(event.target.value)).toFixed(4))
                    setDropRadiusMm(radius)
                    scene.current.labels = radius >= 0.04
                  }}
                />
                <b>{dropRadiusMm >= 0.1 ? `${dropRadiusMm.toFixed(2)}mm` : `${Math.round(dropRadiusMm * 1000)}µm`}</b>
              </label>
              <div className="rb-chip-rail experience-freebar-chips" role="group" aria-label={tx('显示')}>
                <button
                  type="button"
                  className={`rb-chip${showSecondary ? ' is-active' : ''}`}
                  aria-pressed={showSecondary}
                  onClick={() => { markInteraction(); applySecondary(!showSecondary) }}
                >
                  {tx('第二道彩虹')}
                </button>
                <button
                  type="button"
                  className={`rb-chip${showGeometry ? ' is-active' : ''}`}
                  aria-pressed={showGeometry}
                  onClick={() => { markInteraction(); applyGeometry(!showGeometry) }}
                >
                  {tx('几何线')}
                </button>
                <div className="rb-walk" role="group" aria-label={tx('走动')}>
                  <span className="rb-walk-label">{tx('走动')}</span>
                  <button type="button" className="rb-walk-btn" aria-label={tx('往左走 8 米')} onClick={() => { markInteraction(); walkBy(0, -8) }}>
                    <ArrowLeft weight="bold" />
                  </button>
                  <button type="button" className="rb-walk-btn" aria-label={tx('往前走 8 米')} onClick={() => { markInteraction(); walkBy(8, 0) }}>
                    <ArrowUp weight="bold" />
                  </button>
                  <button type="button" className="rb-walk-btn" aria-label={tx('往后退 8 米')} onClick={() => { markInteraction(); walkBy(-8, 0) }}>
                    <ArrowDown weight="bold" />
                  </button>
                  <button type="button" className="rb-walk-btn" aria-label={tx('往右走 8 米')} onClick={() => { markInteraction(); walkBy(0, 8) }}>
                    <ArrowRight weight="bold" />
                  </button>
                  <button type="button" className="rb-walk-btn" aria-label={tx('回到起点')} onClick={() => { markInteraction(); walkHome() }}>
                    <ArrowCounterClockwise weight="bold" />
                  </button>
                </div>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    markInteraction()
                    enterStory()
                    replayGuide(WORLD_ID)
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="experience-freebar-seg" role="group" aria-label={tx('视角')}>
            <button type="button" className={view === 'sky' ? 'is-active' : undefined} aria-pressed={view === 'sky'}
              onClick={() => { markInteraction(); applyView('sky'); applySecondary(true); scene.current.orbitTarget = 1; scene.current.labels = dropRadiusMm >= 0.04 }}>
              {tx('天空')}
            </button>
            <button type="button" className={view === 'drop' && inspectOrder === 1 ? 'is-active' : undefined} aria-pressed={view === 'drop' && inspectOrder === 1}
              onClick={() => { markInteraction(); applyView('drop'); applySecondary(false); applyImpact(CAUSTIC_IMPACT) }}>
              {tx('主虹光路')}
            </button>
            <button type="button" className={view === 'drop' && inspectOrder === 2 ? 'is-active' : undefined} aria-pressed={view === 'drop' && inspectOrder === 2}
              onClick={() => { markInteraction(); applyView('drop'); applySecondary(true); applyImpact(SECONDARY_IMPACT) }}>
              {tx('副虹光路')}
            </button>
          </div>

        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
        ]}
        showReplayChip={false}
        onExit={() => {
          settle()
          const store = scene.current
          applyView('sky')
          applySun(12)
          applySecondary(true)
          applyGeometry(false)
          setDropRadiusMm(0.5)
          store.labels = true
          store.walkTarget = 0
          store.sideTarget = 0
          store.raysTarget = 0
          store.orbitTarget = 1
          enterFree()
        }}
      />
      {!storyMode && view === 'sky' && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{
            type: 'drag',
            target: '.rb-canvas',
            dx: -90,
            dy: 0,
            label: tx('左右拖动换个角度'),
          }}
        />
      )}
    </div>
  )
}
