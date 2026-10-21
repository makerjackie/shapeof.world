import {
  clockFrameTime, polarizationVisibility, createDetectionDistribution, lightClockComparison, lightClockState, sampleDetection, SCREEN_HALF_WIDTH,
  vacuumPulseState, type ClockObserver, type DetectionDistribution,
} from './photon-model'

export type PhotonMode = 'detect' | 'color' | 'clock'
export type SceneSettings = {
  mode: PhotonMode; wavelength: number; slitDistance: number; twoSlits: boolean
  whichPath: boolean; markerAngle: number; compareColors: boolean; clockObserver: ClockObserver
  beta: number; running: boolean; held: boolean; reducedMotion: boolean
}
export type SceneReadout = { detections: number; sourceX: number; sourceY: number; groundTime: number; movingTime: number; groundTicks: number; movingTicks: number; pulseProgress: number; previousBins: number[]; currentBins: number[]; previousCount: number }
type V3 = { x: number; y: number; z: number }
type P2 = { x: number; y: number }
type Detection = { y: number; z: number; born: number; strength: number; tag: number }
const TAU = Math.PI * 2
const PULSE_DISTANCE = 3.03
const PULSE_SPEED = 0.74
const PULSE_DURATION = PULSE_DISTANCE / PULSE_SPEED
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const blend = (a: V3, b: V3, t: number): V3 => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), z: mix(a.z, b.z, t) })
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))

// Display RGB is a deliberately approximate rendering of a monochromatic source.
export function wavelengthRgb(nm: number): [number, number, number] {
  const anchors: Array<[number, number, number, number]> = [
    [400, 130, 87, 255], [450, 86, 127, 255], [490, 83, 220, 247],
    [520, 122, 243, 190], [560, 211, 243, 113], [590, 255, 207, 105],
    [630, 255, 124, 82], [700, 250, 66, 85],
  ]
  const i = Math.max(0, anchors.findIndex((a) => a[0] >= nm) - 1)
  const a = nm >= 700 ? anchors[6] : anchors[i]
  const b = nm >= 700 ? anchors[7] : anchors[i + 1]
  const f = clamp((nm - a[0]) / (b[0] - a[0]))
  return [mix(a[1], b[1], f), mix(a[2], b[2], f), mix(a[3], b[3], f)]
}

/** One persistent optical stage. Sheets visualize amplitudes; only the film records photons. */
export class PhotonScene {
  private ctx: CanvasRenderingContext2D
  private settings: SceneSettings
  private distribution: DetectionDistribution
  private dots: Detection[] = []
  private bins = new Float32Array(120)
  private count = 0
  private previousBins: number[] = []
  private previousCount = 0
  private width = 1
  private height = 1
  private dpr = 1
  private raf = 0
  private last = 0
  private time = 0
  private exposure = 0
  private clockTime = 0
  private pulseTime = 0
  private readoutAt = -1
  private colorMix = 0
  private clockMix = 0
  private compareMix = 0
  private pathMix = 0
  private frameDirection = 1
  private wavelength = 520
  private split = 1
  private immersive = false
  private safeTop = 200
  private safeBottom = 700
  private observer: ResizeObserver
  private overlayObserver: MutationObserver
  private dust: Array<[number, number, number]> = []
  private rgb: [number, number, number] = [122, 243, 190]
  private projection = { center: 0, yawSin: 0, yawCos: 1, turnSin: 0, turnCos: 1, scale: 1, x: 0, y: 0 }
  private onVisibility = () => { this.last = 0 }

  constructor(private canvas: HTMLCanvasElement, initial: SceneSettings, private onReadout: (r: SceneReadout) => void) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas 2D is unavailable')
    this.ctx = context
    this.settings = initial
    this.wavelength = initial.wavelength
    this.distribution = createDetectionDistribution(initial.wavelength, initial.slitDistance, initial.twoSlits, initial.whichPath, initial.markerAngle)
    // Static, faint film grain, not an extra animated particle system.
    let seed = 1771
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    this.dust = Array.from({ length: 1400 }, () => [random(), random(), random()])
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(canvas)
    const page = canvas.closest('.experience-page')
    this.overlayObserver = new MutationObserver(() => {
      this.immersive = page?.getAttribute('data-overlays-hidden') === 'true'
    })
    if (page) {
      this.overlayObserver.observe(page, { attributes: true, attributeFilter: ['data-overlays-hidden'] })
      this.immersive = page.getAttribute('data-overlays-hidden') === 'true'
    }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
    this.raf = requestAnimationFrame(this.frame)
  }

  update(next: SceneSettings) {
    const opticsChanged = next.wavelength !== this.settings.wavelength || next.slitDistance !== this.settings.slitDistance || next.twoSlits !== this.settings.twoSlits || next.whichPath !== this.settings.whichPath || next.markerAngle !== this.settings.markerAngle
    const viewChanged = next.mode !== this.settings.mode || next.reducedMotion !== this.settings.reducedMotion
    const speedChanged = next.beta !== this.settings.beta
    const observerChanged = next.clockObserver !== this.settings.clockObserver
    const clockChanged = speedChanged || observerChanged
    const pulseChanged = next.compareColors !== this.settings.compareColors || next.mode !== this.settings.mode
    if (opticsChanged) {
      this.distribution = createDetectionDistribution(next.wavelength, next.slitDistance, next.twoSlits, next.whichPath, next.markerAngle)
      // Keep the last substantial exposure during a continuous slider gesture.
      if (this.count >= 30) {
        this.previousBins = Array.from(this.bins)
        this.previousCount = this.count
      }
      this.resetExposure()
    }
    if (speedChanged || next.mode !== this.settings.mode) this.clockTime = 0
    else if (observerChanged) {
      const shipTime = lightClockComparison(this.clockTime, next.beta, this.settings.clockObserver).moving.properTime
      this.clockTime = clockFrameTime(shipTime, next.beta, next.clockObserver)
    }
    if (pulseChanged) this.pulseTime = 0
    this.settings = next
    if (next.reducedMotion && (viewChanged || opticsChanged || clockChanged || pulseChanged)) this.reducedSnapshot()
  }

  resetExposure() { this.dots = []; this.bins.fill(0); this.count = 0; this.exposure = 0 }
  reset() { this.previousBins = []; this.previousCount = 0; this.resetExposure(); this.time = 0; this.clockTime = 0; this.pulseTime = 0; this.reducedSnapshot() }
  launchPulse() { this.pulseTime = this.settings.reducedMotion ? PULSE_DURATION * 1.025 : 0 }
  reducedSnapshot() {
    if (!this.settings.reducedMotion) return
    if (this.settings.mode === 'detect' && this.count === 0) this.fire(850)
    if (this.settings.mode === 'clock' && this.clockTime === 0) this.clockTime = 2 * 0.9 / (0.62 * Math.sqrt(1 - this.settings.beta ** 2)) * 1.06
    if (this.settings.mode === 'color') this.pulseTime = PULSE_DURATION * 1.025
  }
  fire(amount = 1) {
    for (let i = 0; i < amount; i++) {
      const z = sampleDetection(this.distribution, Math.random()) / SCREEN_HALF_WIDTH
      const dot = { y: (Math.random() - 0.5) * 1.04, z, born: this.time, strength: 0.4 + Math.random() * 0.6, tag: this.settings.whichPath && this.settings.twoSlits && this.settings.markerAngle === 90 ? (Math.random() < 0.5 ? 1 : 2) : 0 }
      if (this.dots.length < 10000) this.dots.push(dot)
      else this.dots[this.count % 10000] = dot
      this.bins[Math.min(119, Math.floor((z + 1) * 60))] += 1
      this.count++
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.observer.disconnect()
    this.overlayObserver.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect()
    this.width = Math.max(1, r.width); this.height = Math.max(1, r.height)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
  }

  private configureProjection() {
    const portrait = this.width < 720
    const shortLandscape = !portrait && this.height < 520 && !this.immersive
    const clockSpan = 2 * 0.9 * this.settings.beta / Math.sqrt(1 - this.settings.beta ** 2) * 1.12
    const yaw = mix(0.69, 0.22, this.clockMix)
    const angle = portrait ? mix(-0.72, -0.88, this.clockMix) : -0.055
    const desktopWidth = mix(4.4, Math.max(4.4, clockSpan + 1.9), this.clockMix)
    const portraitWidth = mix(this.immersive ? 3.35 : 3.7, Math.max(3.6, clockSpan * 0.64 + 2.1), this.clockMix)
    const scale = portrait
      ? Math.min(this.width / portraitWidth, this.immersive
        ? this.height / Math.max(4.8, clockSpan * 0.78 + 2)
        : Math.max(140, this.safeBottom - this.safeTop) / mix(3.25, Math.max(3.5, clockSpan * 0.78 + 1.8), this.clockMix))
      : shortLandscape
        ? Math.min(this.width * 0.57 / desktopWidth, (this.height - 120) / 2.9)
        : Math.min(this.width / desktopWidth, this.height / 2.9)
    this.projection = {
      center: this.clockMix * (-1.05 + this.frameDirection * clockSpan / 2),
      yawSin: Math.sin(yaw), yawCos: Math.cos(yaw), turnSin: Math.sin(angle), turnCos: Math.cos(angle), scale,
      x: this.width * (portrait ? 0.51 : shortLandscape ? 0.69 : 0.54),
      y: this.immersive ? this.height * 0.52 : portrait ? (this.safeTop + this.safeBottom) / 2 : this.height * (shortLandscape ? 0.48 : 0.59),
    }
    if (this.clockMix > 0.001) {
      // Fit the complete segment after perspective projection, including mirror
      // corners. At high speeds the nearer, stationary clock can otherwise clip.
      const corners: P2[] = []
      for (const moving of [false, true]) {
        const z = moving ? -0.46 : 0.74
        const travels = this.settings.clockObserver === 'ground' ? moving : !moving
        const travel = travels ? clockSpan * (this.settings.clockObserver === 'ground' ? 1 : -1) : 0
        for (const x of [-1.35, -0.75, -1.35 + travel, -0.75 + travel]) {
          for (const y of [-0.4, 0.56]) for (const edgeZ of [z - 0.34, z + 0.34]) corners.push(this.project({ x, y, z: edgeZ }))
        }
      }
      const left = shortLandscape ? this.width * 0.36 : portrait ? 18 : 40
      const right = this.width - (portrait ? 18 : 40)
      const top = this.immersive ? 30 : portrait ? this.safeTop : 76
      const bottom = this.immersive ? this.height - 30 : portrait ? this.safeBottom : this.height - (shortLandscape ? 128 : 145)
      const c = this.projection
      let fit = 1
      for (const p of corners) {
        if (p.x < left) fit = Math.min(fit, (c.x - left) / (c.x - p.x))
        if (p.x > right) fit = Math.min(fit, (right - c.x) / (p.x - c.x))
        if (p.y < top) fit = Math.min(fit, (c.y - top) / (c.y - p.y))
        if (p.y > bottom) fit = Math.min(fit, (bottom - c.y) / (p.y - c.y))
      }
      this.projection.scale *= mix(1, clamp(fit), this.clockMix)
    }
  }

  private project = (p: V3): P2 => {
    const c = this.projection
    const x = p.x - c.center
    const depth = p.z * c.yawCos - x * c.yawSin
    const perspective = 5.8 / (5.8 + depth)
    const px = (x * c.yawCos + p.z * c.yawSin) * perspective
    const py = (-p.y + depth * 0.34) * perspective
    return { x: c.x + (px * c.turnCos - py * c.turnSin) * c.scale, y: c.y + (px * c.turnSin + py * c.turnCos) * c.scale }
  }

  private color(alpha: number, white = 0) {
    return `rgba(${Math.round(mix(this.rgb[0], 255, white))},${Math.round(mix(this.rgb[1], 255, white))},${Math.round(mix(this.rgb[2], 255, white))},${clamp(alpha)})`
  }

  private path(points: V3[], close = false) {
    const ctx = this.ctx
    ctx.beginPath()
    points.forEach((point, i) => { const p = this.project(point); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
    if (close) ctx.closePath()
  }

  private halo(point: V3, radius: number, strength: number, warm = false) {
    const { x, y } = this.project(point)
    const ctx = this.ctx
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
    g.addColorStop(0, warm ? `rgba(255,219,162,${strength})` : this.color(strength, 0.75))
    g.addColorStop(0.12, warm ? `rgba(255,168,83,${strength * 0.45})` : this.color(strength * 0.52))
    g.addColorStop(0.4, this.color(strength * 0.13))
    g.addColorStop(1, this.color(0))
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }

  private screenPoint(y: number, z: number): V3 {
    const optical = { x: 1.27 - 0.16 * z * z, y, z }
    if (this.clockMix < 0.0001) return optical
    const clock = lightClockComparison(this.clockTime, this.settings.beta, this.settings.clockObserver, 0.9, 0.62).moving
    const windowDuration = 2 * 0.9 / (0.62 * Math.sqrt(1 - this.settings.beta ** 2)) * 1.12
    const offset = clock.relativeBeta * 0.62 * Math.floor(this.clockTime / windowDuration) * windowDuration
    const mirror = { x: -1.05 + clock.x - offset + y * 0.48, y: 0.53, z: -0.46 + z * 0.32 }
    return blend(optical, mirror, this.clockMix)
  }

  private drawFilm() {
    if (this.clockMix > 0.999 || this.compareMix > 0.999) return
    const ctx = this.ctx
    const filmAlpha = 1 - this.clockMix * 0.64
    ctx.save()
    ctx.globalAlpha = (1 - this.clockMix) * (1 - this.compareMix)
    // The receiver itself folds into the upper mirror of the moving clock.
    for (let i = 0; i < 80; i++) {
      const z = -1 + i / 40
      const j = Math.min(119, Math.floor((z + 1) * 60))
      const accumulated = Math.min(0.27, this.bins[j] / 210)
      this.path([
        this.screenPoint(-0.56, z), this.screenPoint(0.56, z),
        this.screenPoint(0.56, z + 0.026), this.screenPoint(-0.56, z + 0.026),
      ], true)
      ctx.fillStyle = this.color((0.017 + accumulated * (1 - this.colorMix * 0.75) * (1 - this.clockMix)) * filmAlpha)
      ctx.fill()
    }
    for (const y of [-0.56, 0.56]) {
      this.path(Array.from({ length: 90 }, (_, i) => this.screenPoint(y, -1 + i / 44.5)))
      ctx.strokeStyle = this.color(0.34, 0.55); ctx.lineWidth = 0.8; ctx.stroke()
    }
    for (const z of [-1, 1]) {
      this.path([this.screenPoint(-0.56, z), this.screenPoint(0.56, z)])
      ctx.strokeStyle = this.color(0.12, 0.65); ctx.stroke()
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = (1 - this.clockMix) * (1 - this.colorMix * 0.82) * (1 - this.compareMix)
    for (const dot of this.dots) {
      const p = this.project(this.screenPoint(dot.y, dot.z))
      const age = this.time - dot.born
      const fresh = this.settings.reducedMotion ? 0 : Math.exp(-age * 5)
      ctx.fillStyle = dot.tag ? `rgba(${dot.tag === 2 ? '255,206,146' : '150,244,207'},${0.3 + dot.strength * 0.55})` : this.color(0.3 + dot.strength * 0.55, 0.4 + fresh * 0.5)
      const size = (this.width < 720 ? 0.65 : 0.85) + fresh * 1.5
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill()
      if (fresh > 0.55) {
        const spectrumColor = this.rgb
        if (dot.tag === 1) this.rgb = [150, 244, 207]
        this.halo(this.screenPoint(dot.y, dot.z), 16, fresh * 0.32, dot.tag === 2)
        this.rgb = spectrumColor
      }
    }
    ctx.restore()
  }

  private drawField() {
    const ctx = this.ctx
    const fade = (1 - this.clockMix) * (1 - this.compareMix)
    if (fade < 0.002) return
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    // Transverse slices of a scalar amplitude field. No point moves along these curves.
    const rows = this.width < 720 ? 64 : 84
    const columns = this.width < 720 ? 88 : 112
    const cycles = 7.5 * 520 / this.wavelength
    // Temporal frequency changes with spatial frequency, keeping propagation speed fixed.
    const beat = this.time * 0.7 * 520 / this.wavelength
    let previousLine: V3[] | null = null
    for (let row = 0; row <= rows; row++) {
      const u = row / rows * 2 - 1
      const envelope = Math.exp(-u * u * 2.3)
      const line: V3[] = []
      for (let i = 0; i <= columns; i++) {
        const s = i / columns
        const x = mix(-1.76, 1.27 - 0.16 * u * u, s)
        const spread = 0.026 + Math.pow(s, 1.25) * (1 - this.colorMix * 0.64)
        const z = u * spread
        const after = clamp((s - 0.33) / 0.67)
        const diff = Math.PI * (this.settings.slitDistance * 1e-3) * (u * SCREEN_HALF_WIDTH) / (this.wavelength * 1e-9 * 2)
        const interference = mix(1, Math.cos(diff) * Math.sqrt(Math.max(0.06, envelope)), after * this.split * (1 - this.pathMix) * (1 - this.colorMix))
        const phase = TAU * (s * cycles - beat) - u * u * 2.4 * (1 - this.colorMix)
        const opening = Math.sin(Math.PI * s) ** 0.7
        const y = (Math.sin(phase) * 0.23 * interference + Math.cos(phase * 0.5) * 0.012) * opening * envelope * (1 + this.colorMix * 0.8)
        line.push({ x, y, z })
      }
      if (previousLine) {
        this.path([...previousLine, ...line.slice().reverse()], true)
        ctx.fillStyle = this.color(fade * envelope * 0.028, 0.25); ctx.fill()
      }
      previousLine = line
      this.path(line)
      ctx.lineWidth = row % 5 === 0 ? 1.3 : 0.8
      ctx.strokeStyle = this.color(fade * envelope * (row % 5 === 0 ? 0.35 : 0.17), row % 5 === 0 ? 0.55 : 0.2)
      ctx.stroke()
      if (row % 4 === 0) { ctx.lineWidth = 6; ctx.strokeStyle = this.color(fade * envelope * 0.04); ctx.stroke() }
    }
    // Soft transverse wavefronts give the field body and a readable propagation direction.
    for (let i = 0; i < 24; i++) {
      const s = ((i / 24 + this.time * 0.043) % 1)
      const points: V3[] = []
      for (let j = 0; j <= 54; j++) {
        const u = j / 27 - 1
        const spread = 0.026 + s ** 1.25 * (1 - this.colorMix * 0.64)
        const env = Math.exp(-u * u * 2.3)
        const phase = TAU * (s * cycles - beat) - u * u * 2.4 * (1 - this.colorMix)
        const diff = Math.PI * (this.settings.slitDistance * 1e-3) * u * SCREEN_HALF_WIDTH / (this.wavelength * 1e-9 * 2)
        const amp = mix(1, Math.cos(diff) * Math.sqrt(Math.max(0.06, env)), clamp((s - 0.33) / 0.67) * this.split * (1 - this.pathMix) * (1 - this.colorMix))
        points.push({ x: mix(-1.76, 1.27 - 0.16 * u * u, s), y: (Math.sin(phase) * 0.23 * amp + Math.cos(phase * 0.5) * 0.012) * Math.sin(Math.PI * s) ** 0.7 * env * (1 + this.colorMix * 0.8), z: u * spread })
      }
      this.path(points); ctx.strokeStyle = this.color(Math.sin(Math.PI * s) * fade * 0.12, 0.2); ctx.lineWidth = 0.7; ctx.stroke()
    }
    ctx.restore()
  }

  private drawAperture() {
    const ctx = this.ctx
    const opacity = (1 - this.colorMix) * (1 - this.clockMix)
    if (opacity < 0.005) return
    ctx.save(); ctx.globalAlpha = opacity
    const d = this.settings.slitDistance * 0.63
    // A thin smoked plate with two luminous openings. The aperture is visibly tactile.
    const edges = [-0.45, -d - 0.025, -d + 0.025, d - 0.025, d + 0.025, 0.45]
    for (let n = 0; n < 3; n++) {
      const a = edges[n * 2], b = edges[n * 2 + 1]
      this.path([{ x: -0.77, y: -0.35, z: a }, { x: -0.77, y: 0.35, z: a }, { x: -0.77, y: 0.35, z: b }, { x: -0.77, y: -0.35, z: b }], true)
      ctx.fillStyle = 'rgba(8,19,23,.80)'; ctx.fill()
      ctx.strokeStyle = this.color(0.2, 0.6); ctx.lineWidth = 0.6; ctx.stroke()
    }
    for (const side of [-1, 1]) {
      this.path([{ x: -0.765, y: -0.22, z: side * d }, { x: -0.765, y: 0.22, z: side * d }])
      ctx.strokeStyle = this.color(side < 0 ? 0.8 : this.split * 0.8, 0.6)
      ctx.lineWidth = 2; ctx.shadowColor = this.color(0.8); ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0
      if (this.settings.whichPath && this.settings.twoSlits) {
        ctx.save()
        // Distinguishable records, not a ray that reveals a hidden trajectory.
        const mark = { x: -0.735, y: 0.32, z: side * d }
        this.path(Array.from({ length: 49 }, (_, i) => ({ x: mark.x, y: mark.y + Math.cos(i / 48 * TAU) * 0.075, z: mark.z + Math.sin(i / 48 * TAU) * 0.075 })))
        ctx.strokeStyle = side > 0 ? 'rgba(255,206,146,.9)' : 'rgba(150,244,207,.9)'
        ctx.lineWidth = 1.5; ctx.stroke()
        const angle = side < 0 ? 0 : this.settings.markerAngle * Math.PI / 180
        const dy = Math.cos(angle) * 0.065, dz = Math.sin(angle) * 0.065
        this.path([{ x: mark.x, y: mark.y - dy, z: mark.z - dz }, { x: mark.x, y: mark.y + dy, z: mark.z + dz }])
        ctx.lineWidth = 2.3; ctx.stroke()
        const spectrumColor = this.rgb
        this.rgb = [150, 244, 207]
        this.halo(mark, this.width < 720 ? 19 : 30, 0.36, side > 0)
        this.rgb = spectrumColor
        ctx.restore()
      }
    }
    if (this.split < 0.98) {
      const z = d
      this.path([{ x: -0.75, y: -0.25, z: z - 0.027 }, { x: -0.75, y: 0.25, z: z - 0.027 }, { x: -0.75, y: 0.25, z: z + 0.027 }, { x: -0.75, y: -0.25, z: z + 0.027 }], true)
      ctx.fillStyle = `rgba(25,36,40,${1 - this.split})`; ctx.fill()
    }
    ctx.restore()
  }

  private drawEmitter() {
    const ctx = this.ctx
    const point = blend({ x: -1.76, y: 0, z: 0 }, { x: -1.05, y: -0.37, z: 0.60 }, this.clockMix)
    if (this.clockMix > 0.99) return
    ctx.save(); ctx.globalAlpha = (1 - this.clockMix) * (1 - this.compareMix)
    this.halo(point, this.width < 720 ? 65 : 125, 0.68 + (this.settings.held ? 0.15 : 0))
    for (const r of [0.072, 0.12, 0.14]) {
      this.path(Array.from({ length: 81 }, (_, i) => ({ x: point.x, y: Math.cos(i / 80 * TAU) * r, z: Math.sin(i / 80 * TAU) * r })))
      ctx.strokeStyle = this.color(r === 0.072 ? 0.9 : 0.25, 0.6); ctx.lineWidth = r === 0.072 ? 2 : 0.7; ctx.stroke()
    }
    ctx.restore()
  }

  private drawSpectralPulses() {
    const fade = this.compareMix * (1 - this.clockMix)
    if (fade < 0.002) return
    const ctx = this.ctx
    const originalColor = this.rgb
    const elapsed = this.pulseTime
    const progress = vacuumPulseState(elapsed, 650, PULSE_SPEED).x / PULSE_DISTANCE
    const arrival = progress >= 1 ? Math.exp(-(elapsed - PULSE_DURATION) * 2.8) : 0
    ctx.save(); ctx.globalAlpha = fade; ctx.globalCompositeOperation = 'lighter'
    for (const [lane, wavelength] of [[-1, 650], [1, 450]]) {
      this.rgb = wavelengthRgb(wavelength)
      const z = lane * 0.36
      const start = { x: -1.76, y: 0, z }
      const end = { x: 1.27, y: 0, z }
      // Equal straight propagation distances. Carrier frequency and packet speed
      // both obey the vacuum dispersion relation; neither color takes a shortcut.
      const cycles = 9.5 * 520 / wavelength
      const beat = elapsed * cycles / PULSE_DURATION
      let previous: V3[] | null = null
      for (let row = 0; row <= 26; row++) {
        const u = row / 13 - 1
        const cross = Math.exp(-u * u * 2.3)
        const points: V3[] = []
        for (let i = 0; i <= 128; i++) {
          const s = i / 128
          const envelope = Math.exp(-(((s - progress) / 0.17) ** 2))
          const carrier = Math.sin(TAU * (cycles * s - beat))
          const amplitude = envelope * 0.30 * cross
          points.push({ x: -1.76 + PULSE_DISTANCE * s, y: carrier * amplitude, z: z + u * 0.19 })
        }
        if (previous) {
          this.path([...previous, ...points.slice().reverse()], true)
          ctx.fillStyle = this.color(cross * 0.032, 0.18); ctx.fill()
        }
        previous = points
        this.path(points)
        ctx.strokeStyle = this.color(cross * (row % 4 === 0 ? 0.48 : 0.18), 0.36)
        ctx.lineWidth = row % 4 === 0 ? 1.2 : 0.65; ctx.stroke()
        if (row % 5 === 0) { ctx.strokeStyle = this.color(cross * 0.075); ctx.lineWidth = 5; ctx.stroke() }
      }
      for (const [p, receiver] of [[start, false], [end, true]] as const) {
        const radius = receiver ? 0.23 : 0.15
        this.path(Array.from({ length: 65 }, (_, i) => ({ x: p.x, y: p.y + Math.cos(i / 64 * TAU) * radius, z: p.z + Math.sin(i / 64 * TAU) * radius })))
        ctx.strokeStyle = this.color(receiver ? 0.25 + arrival * 0.7 : 0.65, 0.45)
        ctx.lineWidth = 1.1; ctx.stroke()
        this.halo(p, this.width < 720 ? 32 : 62, receiver ? 0.12 + arrival * 0.85 : 0.4)
      }
      // The packet is a local stretch of the field, not a particle following a sine.
      if (progress <= 1.12) {
        this.halo({ x: -1.76 + PULSE_DISTANCE * clamp(progress), y: 0, z }, this.width < 720 ? 31 : 59, 0.32)
      }
      if (arrival > 0.05) {
        const radius = 0.23 + (1 - arrival) * 0.22
        this.path(Array.from({ length: 65 }, (_, i) => ({ x: end.x, y: Math.cos(i / 64 * TAU) * radius, z: end.z + Math.sin(i / 64 * TAU) * radius })))
        ctx.strokeStyle = this.color(arrival * 0.6, 0.7); ctx.lineWidth = 1; ctx.stroke()
      }
    }
    this.rgb = originalColor
    // A faint common wavefront makes equal progress legible without a graph.
    if (progress > 0 && progress < 1) {
      this.path([{ x: -1.76 + PULSE_DISTANCE * progress, y: 0, z: -0.55 }, { x: -1.76 + PULSE_DISTANCE * progress, y: 0, z: 0.55 }])
      ctx.strokeStyle = 'rgba(226,235,241,.24)'; ctx.lineWidth = 0.7; ctx.stroke()
    }
    ctx.restore()
  }

  private mirror(x: number, y: number, z: number, warm = false) {
    const ctx = this.ctx
    const points = [{ x: x - 0.30, y, z: z - 0.31 }, { x: x + 0.30, y, z: z - 0.31 }, { x: x + 0.30, y, z: z + 0.31 }, { x: x - 0.30, y, z: z + 0.31 }]
    const a = this.project(points[0]), b = this.project(points[2])
    const surface = ctx.createLinearGradient(a.x, a.y, b.x, b.y + 0.01)
    surface.addColorStop(0, warm ? 'rgba(242,208,154,.10)' : 'rgba(165,226,215,.12)')
    surface.addColorStop(0.36, warm ? 'rgba(242,208,154,.25)' : 'rgba(190,239,227,.26)')
    surface.addColorStop(0.4, warm ? 'rgba(105,87,66,.12)' : 'rgba(31,62,61,.22)')
    surface.addColorStop(1, 'rgba(15,22,26,.6)')
    this.path(points, true)
    ctx.fillStyle = surface; ctx.fill()
    ctx.strokeStyle = warm ? 'rgba(255,216,168,.55)' : this.color(0.5, 0.65); ctx.lineWidth = 1; ctx.stroke()
    this.path(points.map((p) => ({ ...p, y: p.y - 0.025 })), true)
    ctx.strokeStyle = warm ? 'rgba(255,216,168,.12)' : this.color(0.14, 0.65); ctx.lineWidth = 0.6; ctx.stroke()
    this.path([points[2], points[3]])
    ctx.strokeStyle = warm ? 'rgba(255,225,182,.75)' : this.color(0.78, 0.7)
    ctx.lineWidth = 2.5; ctx.stroke()
  }

  private drawClocks() {
    if (this.clockMix < 0.002) return
    const ctx = this.ctx
    const originalColor = this.rgb
    this.rgb = [122, 243, 190]
    const comparison = lightClockComparison(this.clockTime, this.settings.beta, this.settings.clockObserver, 0.9, 0.62)
    const windowDuration = 2 * 0.9 / (0.62 * Math.sqrt(1 - this.settings.beta ** 2)) * 1.12
    const windowStart = Math.floor(this.clockTime / windowDuration) * windowDuration
    ctx.save(); ctx.globalAlpha = this.clockMix
    for (const moving of [false, true]) {
      const state = moving ? comparison.moving : comparison.ground
      const beta = state.relativeBeta
      const z = moving ? -0.46 : 0.74
      const offset = beta * 0.62 * windowStart
      const x = -1.05 + state.x - offset
      if (Math.abs(beta) > 0.005 && this.clockTime - windowStart > 0.4) {
        // Past mirror positions anchor the diagonal path to actual clock motion.
        ctx.save(); ctx.globalAlpha *= 0.15
        this.mirror(-1.05, -0.37, z, moving)
        this.mirror(-1.05, 0.53, z, moving)
        const bounceTime = 0.9 / (0.62 * Math.sqrt(1 - beta ** 2))
        const nextBounce = (Math.floor(windowStart / bounceTime) + 1) * bounceTime
        if (this.clockTime > nextBounce) {
          const bounceX = -1.05 + beta * 0.62 * nextBounce - offset
          this.mirror(bounceX, Math.round(nextBounce / bounceTime) % 2 ? 0.53 : -0.37, z, moving)
        }
        ctx.restore()
      }
      this.mirror(x, -0.37, z, moving)
      this.mirror(x, 0.53, z, moving)
      const trail: V3[] = []
      const start = windowStart
      for (let t = start; t <= this.clockTime; t += 0.025) {
        const sample = lightClockState(t, beta, 0.9, 0.62)
        trail.push({ x: -1.05 + sample.x - offset, y: -0.37 + sample.y, z })
      }
      trail.push({ x, y: -0.37 + state.y, z })
      this.path(trail)
      ctx.lineWidth = 1.6
      ctx.strokeStyle = moving ? 'rgba(255,202,133,.85)' : this.color(0.85, 0.25)
      ctx.shadowColor = moving ? '#f4b968' : this.color(0.9); ctx.shadowBlur = 13; ctx.stroke(); ctx.shadowBlur = 0
      const point = { x, y: -0.37 + state.y, z }
      this.halo(point, this.width < 720 ? 32 : 56, 0.92, moving)
      const p = this.project(point)
      ctx.fillStyle = '#fffae9'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAU); ctx.fill()
      // One ring for a complete round trip to the lower mirror, not each reflection.
      const tickAge = state.phase * (2 * 0.9 / (0.62 * Math.sqrt(1 - beta * beta)))
      if (tickAge < 0.6 && state.ticks > 0) {
        const r = 0.06 + tickAge * 0.8
        this.path(Array.from({ length: 70 }, (_, i) => ({ x: x + Math.cos(i / 69 * TAU) * r, y: -0.368, z: z + Math.sin(i / 69 * TAU) * r })))
        ctx.strokeStyle = moving ? `rgba(255,202,133,${1 - tickAge / 0.6})` : this.color(1 - tickAge / 0.6); ctx.lineWidth = 1; ctx.stroke()
      }
    }
    ctx.restore()
    this.rgb = originalColor
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    if (document.hidden) { this.last = 0; return }
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0
    this.last = now
    const animate = !this.settings.reducedMotion && this.settings.running
    // Reduced motion retains a composed field and permits discrete user exposure.
    if (animate || (this.settings.held && !this.settings.reducedMotion)) this.time += dt
    const smoothing = this.settings.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2)
    this.colorMix = mix(this.colorMix, this.settings.mode === 'color' ? 1 : 0, smoothing)
    this.clockMix = mix(this.clockMix, this.settings.mode === 'clock' ? 1 : 0, smoothing)
    this.compareMix = mix(this.compareMix, this.settings.mode === 'color' && this.settings.compareColors ? 1 : 0, smoothing)
    this.pathMix = mix(this.pathMix, this.settings.whichPath && this.settings.twoSlits ? 1 - polarizationVisibility(this.settings.markerAngle) : 0, smoothing)
    this.frameDirection = mix(this.frameDirection, this.settings.clockObserver === 'ground' ? 1 : -1, smoothing)
    this.wavelength = mix(this.wavelength, this.settings.wavelength, smoothing)
    this.split = mix(this.split, this.settings.twoSlits ? 1 : 0, smoothing)
    this.rgb = wavelengthRgb(this.wavelength)
    if ((animate || (this.settings.held && !this.settings.reducedMotion)) && this.settings.mode === 'detect') {
      this.exposure += dt * (this.settings.held ? 800 : 85)
      const amount = Math.floor(this.exposure)
      if (amount) { this.fire(amount); this.exposure -= amount }
    }
    if (animate && this.settings.mode === 'clock') {
      this.clockTime += dt * 0.8
      // Proper times accumulate continuously. Only the local path window repeats.
    }
    if (animate && this.settings.mode === 'color' && this.settings.compareColors) {
      this.pulseTime += dt
      if (this.pulseTime > PULSE_DURATION + 1.65) this.pulseTime = 0
    }
    const ctx = this.ctx
    if (now - this.readoutAt > 180 && this.width < 720 && !this.immersive) {
      const root = this.canvas.parentElement
      const copy = root?.querySelector('.guide-stage-copy, .photon-nameplate')?.getBoundingClientRect()
      const readout = root?.querySelector('.photon-readout')?.getBoundingClientRect()
      this.safeTop = (copy?.bottom ?? 190) + 28
      this.safeBottom = (readout?.top ?? this.height - 120) - 24
    }
    this.configureProjection()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#050b10'; ctx.fillRect(0, 0, this.width, this.height)
    const ambient = ctx.createRadialGradient(this.width * 0.53, this.height * 0.56, 0, this.width * 0.53, this.height * 0.56, Math.max(this.width * 0.58, this.height * 0.5))
    ambient.addColorStop(0, this.color(0.048)); ambient.addColorStop(0.6, this.color(0.013)); ambient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = ambient; ctx.fillRect(0, 0, this.width, this.height)
    for (const [x, y, strength] of this.dust) {
      ctx.fillStyle = `rgba(191,212,208,${0.012 + strength * 0.017})`
      ctx.fillRect(x * this.width, y * this.height, 0.7, 0.7)
    }
    this.drawFilm(); this.drawField(); this.drawAperture(); this.drawEmitter(); this.drawSpectralPulses(); this.drawClocks()
    if (now - this.readoutAt > 180) {
      this.readoutAt = now
      const source = this.project({ x: -1.76, y: 0, z: 0 })
      const clocks = lightClockComparison(this.clockTime, this.settings.beta, this.settings.clockObserver, 0.9, 0.62)
      this.onReadout({ detections: this.count, sourceX: source.x, sourceY: source.y, groundTime: clocks.ground.properTime, movingTime: clocks.moving.properTime, groundTicks: clocks.ground.ticks, movingTicks: clocks.moving.ticks, pulseProgress: this.pulseTime / PULSE_DURATION, previousBins: this.previousBins, currentBins: Array.from(this.bins), previousCount: this.previousCount })
    }
  }
}
