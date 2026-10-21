import { lightClockLegGeometry, lorentzFactor, properTimeRate, transformEvent } from './light-speed-model'

/**
 * Original, orthographically projected light sculpture.
 *
 * Coordinates in the cone use equal units for x, z and ct. The light generators
 * are at 45 degrees in an unprojected x/ct chart, not necessarily on this tilted
 * screen projection. Orthographic projection, bloom,
 * colour and the physical scale of the light-clock comparison are illustrative.
 * A change of beta compares inertial experiments; it is not an acceleration
 * history. Every frame is a pure function of the supplied time and parameters.
 */
export type LightSceneState = {
  time: number
  chapter: number
  beta: number
  frame: 'lab' | 'ship'
  wavelength: number
  refractiveIndex: number
  orbit: number
  reducedMotion: boolean
  immersive: boolean
  /** Bottom of the currently visible copy, in the canvas's CSS coordinates. */
  contentBottom?: number
  experiment?: boolean
  showGeometry?: boolean
  showMeasurements?: boolean
  /** Introductory measurement demonstrated within the opening scene. */
  lesson?: 'speed' | 'ball' | 'light' | 'unit'
  lessonProgress?: number
  lessonTime?: number
  tx: (text: string) => string
}

type Point3 = { x: number; y: number; z: number }
type Point2 = { x: number; y: number; depth: number }
type Palette = 'ice' | 'warm' | 'violet' | 'white'

const TAU = Math.PI * 2
const INK = '#090914'
const COLORS: Record<Palette, string> = {
  ice: '#a7e9ff',
  warm: '#ffb19c',
  violet: '#b5a0ed',
  white: '#f4f6ed',
}
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (lo: number, hi: number, x: number) => {
  const t = clamp((x - lo) / (hi - lo))
  return t * t * (3 - 2 * t)
}
const bump = (x: number, center: number, span = 1) => 1 - smooth(0, span, Math.abs(x - center))
const fract = (x: number) => x - Math.floor(x)
const vec = (x: number, y: number, z = 0): Point3 => ({ x, y, z })

function makeGlow(color: Palette): HTMLCanvasElement {
  const image = document.createElement('canvas')
  image.width = image.height = 128
  const ctx = image.getContext('2d')!
  const rgb: Record<Palette, string> = {
    ice: '143,216,255', warm: '255,141,113', violet: '156,125,231', white: '235,250,255',
  }
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.035, `rgba(${rgb[color]},0.95)`)
  g.addColorStop(0.11, `rgba(${rgb[color]},0.35)`)
  g.addColorStop(0.3, `rgba(${rgb[color]},0.09)`)
  g.addColorStop(1, `rgba(${rgb[color]},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return image
}

export function createLightScene(canvas: HTMLCanvasElement): {
  draw(state: LightSceneState): void
  resize(width: number, height: number, dpr: number): void
  dispose(): void
} {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('The light-speed scene needs a 2D canvas context.')
  const ctx: CanvasRenderingContext2D = context
  const glows: Record<Palette, HTMLCanvasElement> = {
    ice: makeGlow('ice'), warm: makeGlow('warm'), violet: makeGlow('violet'), white: makeGlow('white'),
  }
  let width = 1
  let height = 1
  let dpr = 1
  let mobile = false
  let scale = 1
  let cx = 0
  let cy = 0
  let yaw = 0
  let elevation = 0
  let cosYaw = 1
  let sinYaw = 0
  let cosElevation = 1
  let sinElevation = 0
  let destroyed = false
  let background: HTMLCanvasElement | null = null

  function project(p: Point3): Point2 {
    const horizontal = p.x * cosYaw - p.z * sinYaw
    const depth = p.x * sinYaw + p.z * cosYaw
    return {
      x: cx + horizontal * scale,
      y: cy + (-p.y * cosElevation + depth * sinElevation) * scale,
      depth: p.y * sinElevation + depth * cosElevation,
    }
  }

  function glowAt(x: number, y: number, size: number, alpha: number, color: Palette = 'ice') {
    if (alpha <= 0 || size <= 0) return
    ctx.save()
    ctx.globalAlpha = clamp(alpha)
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(glows[color], x - size / 2, y - size / 2, size, size)
    ctx.restore()
  }

  function point(p: Point3, color: Palette, radius: number, alpha = 1) {
    const q = project(p)
    glowAt(q.x, q.y, radius * 20, alpha * 0.8, color)
    ctx.save()
    ctx.globalAlpha = clamp(alpha)
    ctx.fillStyle = COLORS[color]
    ctx.beginPath()
    ctx.arc(q.x, q.y, radius, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  function stroke(color: Palette, alpha: number, lineWidth = 0.8, bloom = true) {
    if (alpha <= 0.002) return
    ctx.save()
    ctx.strokeStyle = COLORS[color]
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (bloom) {
      ctx.globalAlpha = clamp(alpha * 0.05)
      ctx.lineWidth = lineWidth * 2 + 9
      ctx.stroke()
      ctx.globalAlpha = clamp(alpha * 0.13)
      ctx.lineWidth = lineWidth + 3
      ctx.stroke()
    }
    ctx.globalAlpha = clamp(alpha)
    ctx.lineWidth = lineWidth
    ctx.stroke()
    ctx.restore()
  }

  function line(a: Point3, b: Point3, color: Palette, alpha: number, thickness = 0.8, bloom = true) {
    const p = project(a)
    const q = project(b)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    stroke(color, alpha, thickness, bloom)
  }

  function curve(
    sample: (t: number) => Point3,
    color: Palette,
    alpha: number,
    thickness = 0.8,
    count = 72,
    bloom = true,
  ) {
    if (alpha <= 0.002) return
    ctx.beginPath()
    for (let i = 0; i <= count; i++) {
      const p = project(sample(i / count))
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    stroke(color, alpha, thickness, bloom)
  }

  function ring(y: number, radius: number, color: Palette, alpha: number, thickness = 0.8, x = 0) {
    curve((t) => vec(x + radius * Math.cos(t * TAU), y, radius * Math.sin(t * TAU)), color, alpha, thickness)
  }

  function label(
    state: LightSceneState,
    text: string,
    p: Point3,
    color: Palette,
    alpha: number,
    offsetX = 0,
    offsetY = 0,
    align: CanvasTextAlign = 'center',
    emphasis = false,
  ) {
    if (state.immersive || alpha < 0.12) return
    const pos = project(p)
    pos.x += offsetX
    pos.y += offsetY
    const textBottom = state.contentBottom ?? height * 0.32
    if (mobile && (pos.y < textBottom + 12 || pos.y > height - 175)) return
    ctx.save()
    ctx.font = `${emphasis ? 500 : 400} ${emphasis ? mobile ? 12 : 16 : mobile ? 10 : 11}px "Inter", "PingFang SC", sans-serif`
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = clamp(alpha * 0.78)
    ctx.fillStyle = COLORS[color]
    const translated = state.tx(text)
    const textWidth = ctx.measureText(translated).width
    // The event remains at its scientific coordinate. Only its annotation moves
    // inward when a translation would otherwise extend past the viewport edge.
    if (align === 'left' || align === 'start') pos.x = clamp(pos.x, 12, width - textWidth - 12)
    else if (align === 'right' || align === 'end') pos.x = clamp(pos.x, textWidth + 12, width - 12)
    else pos.x = clamp(pos.x, textWidth / 2 + 12, width - textWidth / 2 - 12)
    ctx.fillText(translated, pos.x, pos.y)
    ctx.restore()
  }

  function prepareBackground() {
    background = document.createElement('canvas')
    background.width = Math.max(1, Math.round(width))
    background.height = Math.max(1, Math.round(height))
    const b = background.getContext('2d')!
    b.fillStyle = INK
    b.fillRect(0, 0, width, height)
    const plum = b.createRadialGradient(width * 0.72, height * 0.46, 0, width * 0.72, height * 0.46, width * 0.61)
    plum.addColorStop(0, '#1b162c')
    plum.addColorStop(0.48, '#11111f')
    plum.addColorStop(1, '#090914')
    b.fillStyle = plum
    b.fillRect(0, 0, width, height)
    const bloom = b.createRadialGradient(width * 0.7, height * 0.58, 0, width * 0.7, height * 0.58, Math.min(width, height) * 0.7)
    bloom.addColorStop(0, 'rgba(43,79,102,0.12)')
    bloom.addColorStop(1, 'rgba(12,19,35,0)')
    b.fillStyle = bloom
    b.fillRect(0, 0, width, height)
    // Fixed, low-contrast grain is environmental texture, not a spacetime lattice.
    for (let i = 0; i < 260; i++) {
      const x = fract(Math.sin(i * 731.73 + 4) * 14365.793) * width
      const y = fract(Math.sin(i * 161.33 + 5) * 96465.793) * height
      const a = 0.035 + fract(Math.sin(i * 51.32) * 415.73) * 0.12
      b.fillStyle = `rgba(185,198,221,${a})`
      b.fillRect(x, y, i % 23 === 0 ? 1.5 : 0.7, i % 23 === 0 ? 1.5 : 0.7)
    }
  }

  /** The same ring family continuously becomes a sphere, a clock, a cone, a wave. */
  function sculpture(state: LightSceneState, time: number) {
    const ch = state.chapter
    const clock = smooth(0.1, 1, ch) * (1 - smooth(1, 2, ch))
    const cone = smooth(1, 2, ch) * (1 - smooth(4, 5, ch)) + smooth(5, 6, ch)
    const medium = bump(ch, 5)
    const sphere = 1 - smooth(0.05, 1, ch)
    const amount = mix(0.92, 0.022, clock)
    const count = mobile ? 31 : 43
    const breathe = state.reducedMotion ? 1 : 1 + Math.sin(time * 0.4) * 0.006
    const shape = (u: number, angle: number): Point3 => {
      const latitude = u * Math.PI
      const sy = Math.cos(latitude) * 1.14
      const sr = Math.sin(latitude) * 1.14
      const cy = (0.5 - u) * 1.34
      const cr = 0.43
      const ty = (0.5 - u) * 2.42
      const tr = Math.abs(ty)
      const y = sphere * sy + clock * cy + cone * ty
      const r = sphere * sr + clock * cr + cone * tr
      const x = (u - 0.5) * 2.92
      const waveRadius = 0.29 + 0.012 * Math.cos(u * TAU * 4 - time * 2)
      return vec(
        (Math.cos(angle) * r + medium * x) * breathe,
        (y + medium * Math.cos(angle) * waveRadius) * breathe,
        (Math.sin(angle) * (r + medium * waveRadius)) * breathe,
      )
    }

    // Translucent surface strips model the illustration's lighting, not a
    // material membrane or an ether. Their continuous body distinguishes the
    // wave sculpture from a latitude/longitude cage.
    glowAt(cx, cy - scale * 0.23, scale * 3.0, 0.12 + cone * 0.08, 'violet')
    glowAt(cx + scale * 0.22, cy + scale * 0.42, scale * 2.6, 0.16, 'ice')
    const surfaceOpacity = (sphere + cone) * 0.8
    if (surfaceOpacity > 0.005) {
      for (let side = 0; side < 2; side++) {
        const strips = mobile ? 28 : 40
        for (let j = 0; j < strips; j++) {
          const angle = (j / strips) * Math.PI + side * Math.PI - yaw
          const next = angle + Math.PI / strips
          const facing = Math.abs(Math.cos(angle + yaw))
          const reflection = Math.exp(-(((angle + yaw - 3.77) / 0.4) ** 2)) + Math.exp(-(((angle + yaw - 0.61) / 0.31) ** 2))
          const strength = surfaceOpacity * (0.012 + facing ** 7 * 0.08 + reflection * 0.18)
          ctx.save()
          ctx.beginPath()
          for (let k = 0; k <= 48; k++) {
            const p = project(shape(mix(0.007, 0.993, k / 48), angle))
            if (k === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          for (let k = 48; k >= 0; k--) {
            const p = project(shape(mix(0.007, 0.993, k / 48), next))
            ctx.lineTo(p.x, p.y)
          }
          ctx.closePath()
          const light = ctx.createLinearGradient(cx - scale, cy - scale, cx + scale * 0.6, cy + scale * 1.2)
          light.addColorStop(0, 'rgba(132,219,252,0.85)')
          light.addColorStop(0.28, 'rgba(220,252,255,0.9)')
          light.addColorStop(0.56, 'rgba(100,179,205,0.45)')
          light.addColorStop(1, 'rgba(135,108,225,0.75)')
          ctx.globalAlpha = strength
          ctx.fillStyle = light
          ctx.fill()
          ctx.restore()
        }
      }
    }
    if (sphere > 0.01) {
      const radius = 1.14 * scale * breathe
      const pearl = ctx.createRadialGradient(cx - radius * 0.22, cy - radius * 0.25, radius * 0.04, cx, cy, radius)
      pearl.addColorStop(0, 'rgba(124,203,238,0.035)')
      pearl.addColorStop(0.62, 'rgba(56,145,176,0.02)')
      pearl.addColorStop(0.87, 'rgba(125,220,250,0.075)')
      pearl.addColorStop(0.97, 'rgba(154,235,255,0.19)')
      pearl.addColorStop(1, 'rgba(212,253,255,0.35)')
      ctx.save()
      ctx.globalAlpha = sphere
      ctx.fillStyle = pearl
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, TAU)
      ctx.fill()
      ctx.restore()
      // A narrow optical rim and a broad reflection have different widths,
      // so the silhouette remains luminous at both poster and phone sizes.
      ctx.beginPath()
      ctx.arc(cx, cy, radius, -2.5, -0.72)
      stroke('ice', sphere * 0.75, 1.15)
      ctx.beginPath()
      ctx.arc(cx, cy, radius - 1.7, -2.35, -1.16)
      stroke('white', sphere * 0.65, 0.65)
    }
    for (let i = 1; i < count; i++) {
      const u = i / count
      const edge = Math.pow(Math.sin(u * Math.PI), 0.4)
      const a = amount * (0.14 + edge * 0.24) * (1 - medium * 0.7)
      const color: Palette = u < 0.54 ? 'ice' : 'violet'
      const accent = i % 5 === 0
      if (accent && medium < 0.99 && clock < 0.99) {
        // A lit wavefront is a narrow translucent band, with a bright edge.
        for (let side = 0; side < 2; side++) {
          ctx.save()
          ctx.beginPath()
          for (let k = 0; k <= 44; k++) {
            const angle = (side + k / 44) * Math.PI - yaw
            const p = project(shape(u, angle))
            if (k === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          for (let k = 44; k >= 0; k--) {
            const angle = (side + k / 44) * Math.PI - yaw
            const p = project(shape(clamp(u + 0.012, 0.002, 0.998), angle))
            ctx.lineTo(p.x, p.y)
          }
          ctx.closePath()
          ctx.globalAlpha = a * (side === 0 ? 0.35 : 0.11) * (1 - medium) * (1 - clock)
          ctx.fillStyle = COLORS[color]
          ctx.fill()
          ctx.restore()
        }
      }
      curve((t) => shape(u, t * TAU), color, a * (accent ? 1.8 : 0.8), accent ? 1.35 : 0.6, mobile ? 56 : 84, accent)
      // A fixed reflection band, rather than a fictitious particle circling light.
      curve((t) => shape(u, mix(3.45, 4.25, t) - yaw), 'white', a * (accent ? 1.9 : 0.7), accent ? 1.15 : 0.7, 12, accent)
    }
    const meridians = mobile ? 5 : 8
    for (let i = 0; i < meridians; i++) {
      const angle = (i / meridians) * TAU
      curve((u) => shape(u * 0.99 + 0.005, angle), 'ice', (0.014 + Math.max(0, Math.sin(angle + yaw)) * 0.018) * (1 - medium) * (1 - clock), 0.55, 56, false)
    }
    if (cone > 0.01) {
      ring(1.21, 1.21, 'ice', cone * 0.95, 1.55)
      ring(-1.21, 1.21, 'violet', cone * 0.48, 1.05)
      line(vec(0, 0), vec(1.21, 1.21), 'white', cone * 0.45, 1.15)
      line(vec(0, 0), vec(-1.21, 1.21), 'ice', cone * 0.23, 0.8)
      point(vec(0, 0), 'white', mobile ? 2 : 2.6, cone)
    }
  }

  function spherePulse(state: LightSceneState, time: number, opacity: number) {
    if (opacity < 0.005) return
    // A light front has radius ct in either selected inertial frame. Switching
    // frame changes the observers, never c or the radius-versus-time law.
    const age = fract(time * 0.115 + 0.62)
    const radius = 0.15 + age * 1.16
    const fade = smooth(0, 0.12, age) * (1 - smooth(0.84, 1, age)) * opacity
    for (let k = 0; k < 3; k++) {
      const r = radius + k * 0.012
      curve((t) => vec(r * Math.cos(t * TAU), r * Math.sin(t * TAU), 0), 'ice', fade * (k === 0 ? 0.8 : 0.13), k === 0 ? 1.15 : 0.6, 100)
      curve((t) => vec(r * Math.cos(t * TAU), 0, r * Math.sin(t * TAU)), 'ice', fade * 0.43, 0.8, 100)
      curve((t) => vec(0, r * Math.cos(t * TAU), r * Math.sin(t * TAU)), 'violet', fade * 0.28, 0.65, 100)
    }
    const beta = clamp(state.beta, -0.995, 0.995)
    const labX = state.frame === 'lab' ? 0 : -beta * radius
    const shipX = state.frame === 'lab' ? beta * radius : 0
    const pulse = vec(radius, 0)
    line(vec(0, 0), pulse, 'ice', opacity * 0.22, 0.6)
    point(pulse, 'white', 2.4, fade)
    point(vec(labX, 0), 'ice', 2.7, state.frame === 'lab' ? opacity : fade)
    observer(vec(shipX, 0.055, 0.035), state.frame === 'ship' ? opacity : fade, time, 0.06)
    const spacing = mobile ? 13 : 16
    label(state, '实验室', vec(labX, 0), 'ice', state.frame === 'lab' ? opacity : fade, 0, spacing + 9)
    label(state, '飞船', vec(shipX, 0.055, 0.035), 'warm', state.frame === 'ship' ? opacity : fade, 0, -spacing - 10)
    label(state, '光', pulse, 'white', opacity, 9, 2, 'left')
    // A travelling transverse field, not a little solid pellet: its wavelength
    // can change without altering its vacuum phase velocity in normalized units.
    const wavelength = normalizedWavelength(state.wavelength)
    const waveY = -0.65
    for (let j = 0; j < 2; j++) {
      curve((t) => {
        const x = mix(-1.03, 1.03, t)
        const phase = (x - time * 0.115 * 1.16) * TAU / wavelength
        const amp = Math.sin(Math.PI * t) ** 0.6 * 0.085
        return vec(x, waveY + Math.sin(phase) * amp, j === 0 ? 0.18 : 0.18 + Math.cos(phase) * amp)
      }, j === 0 ? 'ice' : 'violet', opacity * (j === 0 ? 0.64 : 0.3), 0.9, 150)
    }
  }

  function observer(p: Point3, opacity: number, time: number, size = 0.045, color: 'warm' | 'ice' = 'warm') {
    const q = project(p)
    const r = Math.max(2.2, scale * size)
    glowAt(q.x, q.y, r * 8, opacity * 0.8, color)
    ctx.save()
    ctx.globalAlpha = clamp(opacity)
    const shell = ctx.createRadialGradient(q.x - r * 0.24, q.y - r * 0.4, 0, q.x, q.y, r)
    shell.addColorStop(0, color === 'warm' ? '#fff0d9' : '#effbff')
    shell.addColorStop(0.22, color === 'warm' ? '#ffc6ac' : '#b9ecff')
    shell.addColorStop(0.65, color === 'warm' ? '#ba705e' : '#6a9ebf')
    shell.addColorStop(1, color === 'warm' ? '#382133' : '#1d2a3f')
    ctx.fillStyle = shell
    ctx.beginPath()
    ctx.arc(q.x, q.y, r, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,222,191,0.8)'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(q.x, q.y, r * 0.95, -2.8, -0.5)
    ctx.stroke()
    ctx.restore()
    const shimmer = 0.85 + 0.15 * Math.sin(time * 0.9)
    glowAt(q.x - r * 0.2, q.y - r * 0.35, r * 1.4, opacity * shimmer, 'white')
  }

  function mirror(x: number, y: number, color: Palette, opacity: number, side: number) {
    const rx = 0.225
    const rz = 0.17
    const outerY = y + side * 0.044
    const a = project(vec(x - rx, y, 0))
    const b = project(vec(x + rx, y, 0))
    // The reflective plane remains exactly at y. Its metal backing extends
    // away from the optical gap, preserving the proper mirror separation.
    const body = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    body.addColorStop(0, 'rgba(91,114,131,0.55)')
    body.addColorStop(0.19, 'rgba(234,246,249,0.82)')
    body.addColorStop(0.38, 'rgba(54,74,87,0.85)')
    body.addColorStop(0.72, 'rgba(18,32,43,0.92)')
    body.addColorStop(1, 'rgba(164,199,216,0.75)')
    ctx.save()
    ctx.globalAlpha = clamp(opacity)
    ctx.fillStyle = body
    ctx.beginPath()
    for (let i = 0; i <= 48; i++) {
      const angle = i / 48 * Math.PI - yaw
      const p = project(vec(x + Math.cos(angle) * rx, outerY, Math.sin(angle) * rz))
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    for (let i = 48; i >= 0; i--) {
      const angle = i / 48 * Math.PI - yaw
      const p = project(vec(x + Math.cos(angle) * rx, y, Math.sin(angle) * rz))
      ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    const g = ctx.createLinearGradient(a.x, a.y - 7, b.x, b.y + 7)
    g.addColorStop(0, 'rgba(96,133,155,0.52)')
    g.addColorStop(0.28, 'rgba(222,243,248,0.38)')
    g.addColorStop(0.64, 'rgba(66,107,125,0.22)')
    g.addColorStop(1, 'rgba(213,242,251,0.65)')
    ctx.save()
    ctx.globalAlpha = clamp(opacity)
    ctx.fillStyle = g
    ctx.beginPath()
    for (let i = 0; i <= 64; i++) {
      const angle = i / 64 * TAU
      const p = project(vec(x + Math.cos(angle) * rx, y, Math.sin(angle) * rz))
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    stroke(color, opacity * 0.95, 1.5)
    curve((t) => vec(x + Math.cos(t * TAU) * rx, outerY, Math.sin(t * TAU) * rz), color, opacity * 0.62, 1.15, 64)
    curve((t) => vec(x + Math.cos(mix(3.3, 4.55, t) - yaw) * rx, y, Math.sin(mix(3.3, 4.55, t) - yaw) * rz), 'white', opacity * 0.95, 1.5, 24)
    curve((t) => vec(x + Math.cos(t * TAU) * rx * 0.88, y, Math.sin(t * TAU) * rz * 0.88), color, opacity * 0.28, 0.7, 64, false)
  }

  function pastMirror(x: number, y: number, color: Palette, opacity: number) {
    // Dashed, unfilled outlines are past mirror positions, never extra current
    // mirrors. At a reflection event the past photon and mirror coincide.
    ctx.save()
    ctx.setLineDash([3, 4])
    curve((t) => vec(x + Math.cos(t * TAU) * 0.225, y, Math.sin(t * TAU) * 0.17), color, opacity, 1, 64, false)
    ctx.restore()
  }

  function clockScene(state: LightSceneState, time: number, opacity: number) {
    if (opacity < 0.005) return
    const beta = clamp(state.beta, -0.995, 0.995)
    const rate = properTimeRate(beta)
    const geometry = state.showGeometry ? lightClockLegGeometry(beta) : null
    // Fit the complete preceding half-trip and the current partial trip. Both
    // spatial axes, both clocks and c share this viewing scale: a fast clock's
    // triangle becomes smaller, never narrower than its physical proportions.
    const geometryScale = geometry
      ? Math.min(0.92 / geometry.vertical, geometry.horizontal > 0 ? 1.5 / (2 * geometry.horizontal) : Infinity)
      : 0.92 / 3
    const halfHeight = geometry ? geometry.vertical * geometryScale / 2 : 0.46
    const c = 0.53 * halfHeight / 0.46
    const properPeriod = 4 * halfHeight / c
    const stacked = mobile && state.immersive
    // The film's beta sweep compares separate inertial experiments. Hide the
    // accumulated clock displays during that sweep so re-sampling t/gamma is
    // never presented as one physical clock running backwards. The optical
    // geometry remains visible, and the interactive experiment is unchanged.
    const elapsedOpacity = opacity * (state.experiment ? 1 : 1 - smooth(42, 43, time) + smooth(61, 63, time))
    const clocks = [
      { x: stacked ? -0.33 : -0.82, y: stacked ? 0.88 : 0, rate: 1, beta: 0, color: state.frame === 'lab' ? 'ice' as const : 'warm' as const },
      { x: stacked ? 0.71 : 0.84, y: stacked ? -0.70 : 0, rate, beta, color: state.frame === 'lab' ? 'warm' as const : 'ice' as const },
    ]
    for (let n = 0; n < clocks.length; n++) {
      const clock = clocks[n]
      const phase = fract(time * clock.rate / properPeriod)
      const triangle = 1 - Math.abs(phase * 2 - 1)
      const currentY = clock.y + mix(-halfHeight, halfHeight, triangle)
      // This is a local tracking view in the comparison's selected inertial
      // frame. Old positions remain behind the current apparatus. The trace's
      // derivatives obey dx/dt = beta c and |dy/dt| = c sqrt(1-beta²).
      const oneWay = properPeriod / (2 * clock.rate)
      const sinceReflection = fract(time / oneWay) * oneWay
      const maxLookback = Math.abs(clock.beta) > 0.005 ? 1.55 / (Math.abs(clock.beta) * c) : properPeriod
      const visiblePast = Math.min(sinceReflection + oneWay, maxLookback)
      const croppedTail = sinceReflection + oneWay > maxLookback
      const tail = (u: number) => {
        const lag = (1 - u) * visiblePast
        const past = fract((time - lag) * clock.rate / properPeriod)
        const y = clock.y + mix(-halfHeight, halfHeight, 1 - Math.abs(past * 2 - 1))
        return vec(clock.x - clock.beta * c * lag, y, 0)
      }
      // Two almost transparent glass edges support the mirror material without
      // introducing a second central cylinder unrelated to either clock.
      const left = project(vec(clock.x - 0.205, clock.y + halfHeight))
      const right = project(vec(clock.x + 0.205, clock.y - halfHeight))
      const sleeve = ctx.createLinearGradient(left.x, left.y, right.x, right.y)
      sleeve.addColorStop(0, 'rgba(172,222,245,0.018)')
      sleeve.addColorStop(0.35, 'rgba(186,233,255,0.008)')
      sleeve.addColorStop(1, 'rgba(168,216,239,0.065)')
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = sleeve
      ctx.fillRect(left.x, left.y, right.x - left.x, right.y - left.y)
      ctx.restore()
      for (const side of [-1, 1]) {
        if (n === 1) {
          const oldX = clock.x - clock.beta * c * visiblePast
          ctx.save()
          ctx.setLineDash([2, 6])
          line(vec(oldX, clock.y + side * halfHeight), vec(clock.x, clock.y + side * halfHeight), clock.color, opacity * 0.16, 0.65, false)
          ctx.restore()
        }
        mirror(clock.x, clock.y + side * halfHeight, clock.color, opacity, side)
      }
      if (n === 1 && Math.abs(beta) > 0.04) {
        let markedPast = false
        for (const lag of [sinceReflection + oneWay, sinceReflection]) {
          if (lag < 0.1 || lag > visiblePast + 0.001) continue
          const past = fract((time - lag) * clock.rate / properPeriod)
          const y = clock.y + (past < 0.25 || past > 0.75 ? -halfHeight : halfHeight)
          const oldX = clock.x - clock.beta * c * lag
          pastMirror(oldX, y, clock.color, opacity * 0.47)
          if (!markedPast) {
            if (!geometry) label(state, '镜面先前的位置', vec(oldX, y), clock.color, opacity * 0.58, 0, y > clock.y ? 21 : -21)
            markedPast = true
          }
        }
        if (!markedPast && croppedTail) {
          const oldX = clock.x - clock.beta * c * visiblePast * 0.8
          pastMirror(oldX, clock.y + halfHeight, clock.color, opacity * 0.2)
          pastMirror(oldX, clock.y - halfHeight, clock.color, opacity * 0.2)
        }
      }
      for (const z of [-0.13, 0.13]) {
        line(vec(clock.x - 0.19, clock.y - halfHeight, z), vec(clock.x - 0.19, clock.y + halfHeight, z), clock.color, opacity * 0.22, 0.75, false)
        line(vec(clock.x + 0.19, clock.y - halfHeight, z), vec(clock.x + 0.19, clock.y + halfHeight, z), clock.color, opacity * 0.16, 0.65, false)
      }
      if (geometry && n === 1) {
        // These endpoints belong to the latest completed half-trip already in
        // the photon trace. Alternate upward/downward legs have equal lengths;
        // neither leg is counted as a complete tick. At beta=.8 they are 3:4:5.
        const endY = clock.y + (phase < 0.5 ? -halfHeight : halfHeight)
        const endX = clock.x - clock.beta * c * sinceReflection
        const startX = endX - geometry.reflectionLab.x * geometryScale
        const start = vec(startX, 2 * clock.y - endY)
        const corner = vec(startX, endY)
        const end = vec(endX, endY)
        ctx.save()
        ctx.beginPath()
        for (const [index, vertex] of [start, corner, end].entries()) {
          const p = project(vertex)
          if (index === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.closePath()
        ctx.fillStyle = COLORS.ice
        ctx.globalAlpha = opacity * 0.055
        ctx.fill()
        ctx.restore()
        line(start, corner, 'ice', opacity * 0.65, 1.1)
        line(corner, end, 'warm', opacity * 0.7, 1.1)
        line(start, end, 'white', opacity * 0.9, 1.5)
        const square = Math.min(0.055, halfHeight * 0.3, geometry.horizontal * geometryScale * 0.2)
        if (square > 0.003) {
          const dx = Math.sign(beta) * square
          const dy = Math.sign(start.y - endY) * square
          line(vec(startX, endY + dy), vec(startX + dx, endY + dy), 'white', opacity * 0.45, 0.65, false)
          line(vec(startX + dx, endY + dy), vec(startX + dx, endY), 'white', opacity * 0.45, 0.65, false)
        }
        label(state, '镜距', vec(startX, clock.y), 'ice', opacity, -12, 0, 'right')
        if (geometry.horizontal > 0.08) {
          label(state, '镜子位移', vec((startX + endX) / 2, endY), 'warm', opacity, 0, endY > clock.y ? -14 : 14)
          label(state, '光路', vec((startX + endX) / 2, clock.y), 'white', opacity, 10, endY > clock.y ? 12 : -12, 'left')
        }
      }
      if (croppedTail && n === 1) {
        for (let segment = 0; segment < 7; segment++) {
          curve((u) => tail((segment + u) / 7), clock.color, opacity * mix(0.025, 0.95, (segment / 6) ** 0.65), 1.65, 18)
        }
      } else curve(tail, clock.color, opacity * 0.95, 1.65, 120)
      point(vec(clock.x, currentY), 'white', mobile ? 2.8 : 3.5, opacity)
      const contact = Math.min(triangle, 1 - triangle)
      const flash = 1 - smooth(0, 0.1, contact)
      glowAt(project(vec(clock.x, currentY)).x, project(vec(clock.x, currentY)).y, scale * 0.58, opacity * flash * 0.75, clock.color)
      // The tick ring is a hand on a clock, advancing by the actual proper-time
      // ratio. It remains readable even when the two photon positions coincide.
      const face = vec(clock.x, clock.y - 0.77, 0)
      const center = project(face)
      const clockRadius = mobile ? 17 : 23
      ctx.save()
      ctx.globalAlpha = elapsedOpacity
      ctx.fillStyle = 'rgba(8,15,25,0.72)'
      ctx.beginPath()
      ctx.arc(center.x, center.y, clockRadius, 0, TAU)
      ctx.fill()
      stroke(clock.color, elapsedOpacity * 0.5, 1, true)
      ctx.beginPath()
      ctx.arc(center.x, center.y, clockRadius, -Math.PI / 2, -Math.PI / 2 + phase * TAU)
      stroke(clock.color, elapsedOpacity * 0.95, 1.4)
      for (let tick = 0; tick < 12; tick++) {
        const theta = tick / 12 * TAU - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(center.x + Math.cos(theta) * (clockRadius - 4), center.y + Math.sin(theta) * (clockRadius - 4))
        ctx.lineTo(center.x + Math.cos(theta) * (clockRadius - 2), center.y + Math.sin(theta) * (clockRadius - 2))
        stroke(clock.color, elapsedOpacity * 0.3, 0.6, false)
      }
      const hand = phase * TAU - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(center.x, center.y)
      ctx.lineTo(center.x + Math.cos(hand) * (clockRadius - 6), center.y + Math.sin(hand) * (clockRadius - 6))
      stroke(clock.color, elapsedOpacity * 0.8, 0.9, false)
      ctx.restore()
      label(state, n === 0 ? '本参考系静止钟' : '运动钟', vec(clock.x, clock.y + halfHeight), clock.color, opacity, 0, -24)
      if (!state.immersive) {
        const valueY = center.y + clockRadius + (mobile ? 15 : 18)
        if (!mobile || valueY < height - 175) {
          ctx.save()
          ctx.globalAlpha = elapsedOpacity * 0.8
          ctx.font = `400 ${mobile ? 11 : 13}px "IBM Plex Mono", monospace`
          ctx.textAlign = 'center'
          ctx.fillStyle = COLORS[clock.color]
          ctx.fillText(`${(time * clock.rate).toFixed(1)} s`, center.x, valueY)
          ctx.restore()
        }
      }
    }
  }

  function plane(state: LightSceneState, opacity: number, beta: number, now: number, color: Palette, extent = 1.02) {
    if (opacity < 0.005) return
    const sample = (x: number, z: number) => vec(x, now + beta * x, z)
    const corners = [sample(-extent, -extent), sample(extent, -extent), sample(extent, extent), sample(-extent, extent)]
    ctx.save()
    ctx.globalAlpha = clamp(opacity)
    const a = project(corners[0])
    const b = project(corners[2])
    const fill = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    fill.addColorStop(0, color === 'warm' ? 'rgba(250,157,137,0.015)' : 'rgba(138,214,242,0.008)')
    fill.addColorStop(0.5, color === 'warm' ? 'rgba(250,157,137,0.095)' : 'rgba(138,214,242,0.055)')
    fill.addColorStop(1, color === 'warm' ? 'rgba(250,157,137,0.012)' : 'rgba(138,214,242,0.008)')
    ctx.fillStyle = fill
    ctx.beginPath()
    corners.forEach((v, i) => {
      const p = project(v)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    stroke(color, opacity * 0.29, 0.7, false)
    for (let i = -3; i <= 3; i++) {
      const v = i / 3 * extent
      line(sample(-extent, v), sample(extent, v), color, opacity * (i === 0 ? 0.51 : 0.11), i === 0 ? 0.9 : 0.55, false)
      line(sample(v, -extent), sample(v, extent), color, opacity * (i === 0 ? 0.26 : 0.07), 0.55, false)
    }
    label(state, color === 'warm' ? '飞船的此刻' : '实验室的此刻', sample(extent, extent), color, opacity, 0, 17)
  }

  function coneScene(state: LightSceneState, time: number, opacity: number) {
    if (opacity < 0.005) return
    const beta = clamp(state.beta, -0.995, 0.995)
    const sign = state.frame === 'lab' ? 1 : -1
    const tilted = beta * sign
    const direction = Math.sign(tilted) || 1
    const stationaryColor = state.frame === 'lab' ? 'ice' : 'warm'
    const movingColor = state.frame === 'lab' ? 'warm' : 'ice'
    const chapter = state.chapter
    const nowWeight = bump(chapter, 2, 1.5) * 0.7 + bump(chapter, 3, 0.8) * 0.5
    const simultaneity = bump(chapter, 2, 0.92)
    const causality = bump(chapter, 3, 0.85)
    const now = 0.35 * simultaneity
    plane(state, opacity * nowWeight * 0.47, 0, now, stationaryColor)
    plane(state, opacity * nowWeight, tilted, now, movingColor)
    // t'=constant gives ct = beta x + ct'/gamma, in untransformed lab axes.
    // The selected frame changes which observer is at rest; the null cone stays.
    line(vec(0, -1.21), vec(0, 1.34), stationaryColor, opacity * 0.23, 0.65, false)
    line(vec(-1.3, 0), vec(1.3, 0), stationaryColor, opacity * 0.13, 0.65, false)
    const energy = bump(chapter, 4)
    const maxT = 1.13
    curve((u) => {
      const ct = mix(-0.86, maxT, u)
      return vec(tilted * ct, ct, 0)
    }, movingColor, opacity * (0.58 + energy * 0.25), 1.15 + energy * 0.6, 48)
    const particleAge = fract(time * 0.075 + 0.62)
    const particleFade = smooth(0, 0.08, particleAge) * (1 - smooth(0.9, 1, particleAge))
    const particleT = mix(0.27, maxT, particleAge)
    const particle = vec(tilted * particleT, particleT)
    observer(particle, opacity * particleFade, time, 0.032 + energy * 0.006, movingColor)
    if (energy > 0.01) {
      const gamma = lorentzFactor(beta)
      for (let i = 0; i < 9; i++) {
        const visible = clamp(gamma * 1.25 - i) * energy * opacity * particleFade
        const r = 0.055 + i * 0.021
        curve((u) => vec(particle.x + Math.cos(u * TAU) * r, particle.y + Math.sin(u * TAU) * r, Math.sin(u * TAU) * r * 0.3), movingColor, visible * 0.13, 0.6, 44, false)
      }
      const rim = vec(direction * particleT, particleT)
      line(particle, rim, movingColor, opacity * energy * 0.32, 0.7, false)
      point(rim, 'white', 1.7, opacity * energy * 0.65)
      label(state, '光速边界', vec(direction * 1.08, 1.08), 'ice', opacity * energy, direction * 8, -12, direction > 0 ? 'left' : 'right')
    }
    label(state, '时间 ct', vec(0, 1.34), 'ice', opacity * (1 - energy), 0, -10)
    label(state, '空间 x', vec(1.3, 0), 'ice', opacity * (1 - energy), 4, 12)
    const measurement = Math.max(causality, state.showMeasurements ? 1 : 0)
    label(state, '此时此地', vec(0, 0), 'white', opacity * measurement, -9, 19, 'right')
    label(state, '有质量的物体', particle, movingColor, opacity * energy * particleFade, -12, 17, 'right')
    if (simultaneity > 0.01 && !state.showMeasurements) {
      const events = [vec(-0.75, 0.35), vec(0.75, 0.35)]
      line(events[0], events[1], stationaryColor, opacity * simultaneity * 0.45, 0.9)
      events.forEach((event, i) => {
        point(event, 'white', mobile ? 2.3 : 2.9, opacity * simultaneity)
        const transformed = transformEvent({ x: event.x, ct: event.y }, tilted)
        if (!state.immersive) {
          const p = project(event)
          ctx.save()
          ctx.globalAlpha = opacity * simultaneity * 0.88
          ctx.fillStyle = COLORS[movingColor]
          ctx.font = `400 ${mobile ? 10 : 12}px "IBM Plex Mono", monospace`
          ctx.textAlign = mobile ? 'center' : i === 0 ? 'right' : 'left'
          ctx.textBaseline = 'middle'
          const value = Math.abs(transformed.ct) < 0.005 ? 0 : transformed.ct
          // c=1 in this normalized illustration; A, B and t′ are language-neutral.
          ctx.fillText(`${i === 0 ? 'A' : 'B'} · t′=${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`, p.x + (mobile ? 0 : i === 0 ? -10 : 10), p.y - 17)
          ctx.restore()
        }
      })
    }
    if (measurement > 0.01) {
      const event = vec(1.12, 0.41, 0)
      // O and R are one fixed pair of lab-anchored null-separated events. A
      // switch into the ship frame uses +beta, independent of the -beta used
      // above to draw the other observer's worldline in that selected frame.
      const received = state.frame === 'ship' ? transformEvent({ x: 1, ct: 1 }, beta) : { x: 1, ct: 1 }
      const reception = vec(received.x, received.ct, 0)
      const a = opacity * measurement
      if (!state.experiment && !state.showMeasurements) {
        ring(0.41, 0.41, 'ice', a * 0.38, 0.9)
        point(event, 'violet', 2.1, a * 0.85)
        label(state, '来不及到达的事件', event, 'violet', a, 0, 18)
      }
      line(vec(0, 0), reception, 'white', a * 0.75, 1.3)
      if (state.showMeasurements) point(vec(0, 0), 'white', 2.6, a * 0.9)
      point(reception, 'white', 2.6, a * 0.9)
      label(state, '接收事件', reception, 'ice', a, received.ct < 0.3 ? 17 : 9, received.ct < 0.3 ? -18 : -8, 'left')
    }
    // A single outgoing ripple sweeps the cone at r=ct. The cone itself is
    // history, not an object growing or a physical material filling empty space.
    const waveT = fract(time * 0.105 + 0.56) * 1.2
    const rippleFade = (1 - smooth(0.96, 1.2, waveT)) * smooth(0, 0.1, waveT)
    ring(waveT, waveT, 'white', opacity * rippleFade * 0.5, 1.05)
  }

  function normalizedWavelength(value: number) {
    // The controller may supply nanometres or a normalized illustration length.
    return value > 10 ? mix(0.27, 0.57, clamp((value - 380) / 400)) : clamp(value, 0.22, 0.8)
  }

  function glassScene(state: LightSceneState, time: number, opacity: number) {
    if (opacity < 0.005) return
    const n = clamp(state.refractiveIndex, 1, 2.5)
    const minX = -0.36
    const maxX = 0.57
    const h = 0.49
    const depth = 0.44
    const corners = [
      vec(minX, -h, -depth), vec(maxX, -h, -depth), vec(maxX, h, -depth), vec(minX, h, -depth),
      vec(minX, -h, depth), vec(maxX, -h, depth), vec(maxX, h, depth), vec(minX, h, depth),
    ]
    const faces = [[0, 1, 2, 3], [0, 3, 7, 4], [3, 2, 6, 7], [4, 5, 6, 7], [1, 5, 6, 2]]
    for (let f = 0; f < faces.length; f++) {
      const face = faces[f]
      const a = project(corners[face[0]])
      const b = project(corners[face[2]])
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
      g.addColorStop(0, 'rgba(174,224,246,0.065)')
      g.addColorStop(0.43, 'rgba(55,109,144,0.018)')
      g.addColorStop(0.97, 'rgba(197,233,247,0.08)')
      g.addColorStop(1, 'rgba(229,244,255,0.14)')
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = g
      ctx.beginPath()
      face.forEach((index, j) => {
        const p = project(corners[index])
        if (j === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      stroke('ice', opacity * (f === 4 ? 0.46 : 0.21), 0.7, false)
    }
    const wavelength = normalizedWavelength(state.wavelength)
    const k = TAU / wavelength
    const c = 0.3
    const omega = k * c
    // Continuous phase with common omega. dk/dx changes at each interface;
    // consequently wavelength=lambda0/n and phase speed=c/n inside the slab.
    const opticalDistance = (x: number) => x + (n - 1) * clamp(x - minX, 0, maxX - minX)
    const phase = (x: number) => k * opticalDistance(x) - omega * time
    const envelope = (x: number) => smooth(-1.46, -1.25, x) * (1 - smooth(1.22, 1.47, x))
    line(vec(-1.42, 0), vec(1.42, 0), 'ice', opacity * 0.13, 0.6, false)
    const wave = (t: number, field: number) => {
      const x = mix(-1.43, 1.43, t)
      const amp = Math.sin(phase(x)) * 0.215 * envelope(x)
      return vec(x, field === 0 ? amp : 0, field === 1 ? amp : 0)
    }
    // Translucent ribbons supply a coherent field body, not absorption dots.
    for (let field = 0; field < 2; field++) {
      const color: Palette = field === 0 ? 'ice' : 'violet'
      ctx.save()
      ctx.beginPath()
      for (let i = 0; i <= 180; i++) {
        const p = project(wave(i / 180, field))
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      const end = project(vec(1.43, 0))
      const start = project(vec(-1.43, 0))
      ctx.lineTo(end.x, end.y)
      ctx.lineTo(start.x, start.y)
      ctx.closePath()
      ctx.globalAlpha = opacity * (field === 0 ? 0.065 : 0.04)
      ctx.fillStyle = COLORS[color]
      ctx.fill()
      ctx.restore()
      curve((t) => wave(t, field), color, opacity * (field === 0 ? 0.94 : 0.52), field === 0 ? 1.6 : 1.05, 200)
      for (let j = 0; j <= 64; j++) {
        const x = mix(-1.4, 1.4, j / 64)
        const amp = Math.sin(phase(x)) * 0.215 * envelope(x)
        line(vec(x, 0), vec(x, field === 0 ? amp : 0, field === 1 ? amp : 0), color, opacity * 0.12, 0.6, false)
      }
    }
    // Bound-charge displacements oscillate coherently at the incident frequency.
    // Their size is illustrative; this is not a microscopic scattering movie.
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7; i++) {
        const x = mix(minX + 0.09, maxX - 0.09, i / 6)
        const y = (row - 1) * 0.27
        const z = row % 2 ? -0.22 : 0.23
        const displacement = Math.sin(phase(x)) * 0.028 * (n - 1)
        const base = project(vec(x, y, z))
        const moving = project(vec(x, y + displacement, z))
        ctx.save()
        ctx.globalAlpha = opacity * 0.29
        ctx.fillStyle = COLORS.ice
        ctx.beginPath()
        ctx.arc(base.x, base.y, mobile ? 1.1 : 1.5, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = opacity * 0.67
        ctx.fillStyle = COLORS.warm
        ctx.beginPath()
        ctx.arc(moving.x + 2, moving.y, mobile ? 1 : 1.5, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    }
    label(state, '真空', vec(-1, -0.35), 'ice', opacity, 0, 18)
    label(state, '介质', vec(0.1, h + 0.09), 'ice', opacity, 0, -16)
    label(state, '真空', vec(1.08, -0.35), 'ice', opacity, 0, 18)
    label(state, '频率不变 · 波长缩短', vec(0.12, -h - 0.08), 'white', opacity, 0, 18)
    const shine = project(vec(minX, h, depth))
    glowAt(shine.x, shine.y, scale * 0.36, opacity * 0.5, 'white')
  }

  /** The introductory ruler is also available without a WebGL context. */
  function lessonScene(state: LightSceneState, opacity: number) {
    const lesson = state.lesson
    if (!lesson || opacity < 0.005) return
    const duration = lesson === 'speed' ? 3 : 1
    const localTime = Math.max(0, state.lessonTime ?? (state.lessonProgress ?? 0) * duration)
    const elapsed = Math.min(duration, localTime % (duration + 1.2))
    const progress = elapsed / duration
    const number = (value: number) => Number(value.toFixed(2)).toString()
    const annotate = (text: string, at: Point3, color: Palette = 'white', emphasis = true) => label(state, text, at, color, opacity, 0, 0, 'center', emphasis)
    function ruler(x: number, y: number, span: number, divisions: number, fraction: number, color: Palette) {
      line(vec(x, y), vec(x + span, y), color, opacity * 0.35, 1.15)
      line(vec(x, y + 0.013), vec(x + span * fraction, y + 0.013), color, opacity * 0.86, 2.4)
      for (let i = 0; i <= divisions; i++) {
        const at = x + span * i / divisions
        const size = i === 0 || i === divisions ? 0.072 : 0.042
        line(vec(at, y - size), vec(at, y + size * 0.4), color, opacity * 0.65, 0.85, false)
      }
      point(vec(x, y), color, mobile ? 1.6 : 2, opacity * 0.85)
      point(vec(x + span, y), color, mobile ? 1.6 : 2, opacity * 0.85)
    }
    function ball(at: Point3, color: Palette) {
      const p = project(at), radius = clamp(scale * 0.053, 5, 12)
      glowAt(p.x, p.y, radius * 5, opacity * 0.32, color)
      ctx.save()
      ctx.globalAlpha = opacity
      const shine = ctx.createRadialGradient(p.x - radius * 0.32, p.y - radius * 0.35, 0, p.x, p.y, radius)
      shine.addColorStop(0, '#f4fcff'); shine.addColorStop(0.3, COLORS[color]); shine.addColorStop(1, color === 'warm' ? '#783f37' : '#294b69')
      ctx.fillStyle = shine
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TAU); ctx.fill()
      ctx.restore()
    }
    function clock(at: Point3, seconds: number, labelDrop = 0.25) {
      curve(t => vec(at.x + Math.cos(t * TAU) * 0.1, at.y + Math.sin(t * TAU) * 0.1), 'white', opacity * 0.7, 1, 40)
      const angle = Math.PI / 2 - progress * TAU
      line(at, vec(at.x + Math.cos(angle) * 0.078, at.y + Math.sin(angle) * 0.078), 'white', opacity * 0.9, 1.4)
      annotate(`${number(seconds)} s`, vec(at.x, at.y - labelDrop))
    }
    if (lesson === 'speed') {
      const x = -1.2 + 2.4 * progress
      ruler(-1.2, 0, 2.4, 6, progress, 'ice')
      ball(vec(x, 0.09), 'ice')
      annotate('0 m', vec(-1.2, -0.22), 'ice', false)
      annotate('6 m', vec(1.2, -0.22), 'ice', false)
      annotate(`${number(elapsed * 2)} m`, vec(x, 0.34), 'ice')
      annotate('6 m / 3 s = 2 m/s', vec(0, 0.77))
      clock(vec(0, -0.55), elapsed)
    } else if (lesson === 'ball') {
      const ballX = -1.2 + 2.4 * progress, followerX = -1.2 + 2.4 * 0.6 * progress
      ruler(-1.2, 0.34, 2.4, 10, progress, 'ice')
      ruler(-1.2, -0.35, 2.4, 10, progress * 0.6, 'warm')
      ball(vec(ballX, 0.43), 'ice'); ball(vec(followerX, -0.26), 'warm')
      line(vec(ballX, 0.34), vec(ballX, -0.73), 'ice', opacity * 0.2, 0.65, false)
      line(vec(followerX, -0.35), vec(followerX, -0.73), 'warm', opacity * 0.25, 0.65, false)
      line(vec(followerX, -0.73), vec(ballX, -0.73), 'white', opacity * 0.72, 1.2)
      annotate(`${state.tx('小球')} · 10 m/s`, vec(0, 0.68), 'ice', false)
      annotate(`${state.tx('追逐者')} · 6 m/s`, vec(0, -0.06), 'warm', false)
      annotate(`${number(elapsed * 4)} m`, vec((ballX + followerX) / 2, -0.91))
      annotate('10 − 6 = 4 m/s', vec(0, 1.06))
      clock(vec(-1.09, -0.74), elapsed, 0.47)
    } else {
      const radius = 1.2 * progress
      // The expanding wavefront meets the measured pulse at x=r; no decorative
      // sphere is allowed to imply a second, inconsistent propagation speed.
      for (let plane = 0; plane < 3; plane++) curve(t => {
        const a = t * TAU, s = Math.sin(a) * radius, c = Math.cos(a) * radius
        return plane === 0 ? vec(c, s) : plane === 1 ? vec(c, 0, s) : vec(0, c, s)
      }, 'ice', opacity * 0.12, 0.8)
      ruler(0, -0.16, 1.2, 4, progress, 'ice')
      point(vec(0, 0), 'ice', mobile ? 2.4 : 3, opacity)
      point(vec(radius, 0), 'white', mobile ? 2.8 : 3.5, opacity)
      line(vec(0, 0), vec(radius, 0), 'ice', opacity * 0.4, 0.9)
      if (lesson === 'unit') {
        annotate('0', vec(0, -0.39), 'ice', false)
        annotate(`1 ${state.tx('光秒')}`, vec(1.2, -0.39), 'ice', false)
        annotate('约 300,000 km', vec(0.55, 0.55))
        annotate(`${number(progress)} ${state.tx('光秒')}`, vec(0.6, -0.77), 'ice')
        clock(vec(-0.55, -0.53), elapsed)
      } else {
        // Same emitted/received null event as the WebGL lesson: in the ship
        // frame both its distance and elapsed time are one third as large.
        // Keep the introduction's labels at c; the later scene proves the ratio.
        const ratio = transformEvent({ x: 1, ct: 1 }, 0.8).x
        ruler(0, -0.78, 1.2 * ratio, 4, progress, 'warm')
        point(vec(0, -0.63), 'warm', mobile ? 2.6 : 3.3, opacity)
        point(vec(radius * ratio, -0.63), 'white', mobile ? 2.5 : 3, opacity)
        annotate('实验室测量', vec(-0.62, 0.34), 'ice', false)
        annotate('c', vec(0.63, 0.38), 'ice')
        annotate('飞船测量', vec(-0.62, -1.0), 'warm', false)
        annotate('c', vec(0.63, -1.0), 'warm')
        annotate('两次测量，都是 c', vec(0.1, 0.95))
      }
    }
  }

  function uncertainty(state: LightSceneState, time: number, opacity: number) {
    if (opacity < 0.005) return
    // Unresolved, continuous grain deliberately has no cubic cells or lattice.
    for (let i = 0; i < (mobile ? 80 : 160); i++) {
      const u = fract(Math.sin(i * 523.53 + 8) * 633.87)
      const angle = fract(Math.sin(i * 932.3 + 2) * 3432.17) * TAU
      const y = mix(-0.9, 1.12, u)
      const radius = Math.abs(y) * (0.83 + 0.16 * Math.sin(i * 4.7))
      const p = project(vec(Math.cos(angle) * radius, y, Math.sin(angle) * radius))
      const a = opacity * (0.1 + 0.15 * Math.sin(time * 0.3 + i) ** 2)
      ctx.save()
      ctx.globalAlpha = a
      ctx.fillStyle = i % 3 === 0 ? COLORS.warm : COLORS.ice
      ctx.beginPath()
      ctx.arc(p.x, p.y, i % 13 === 0 ? 1.2 : 0.55, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    point(vec(0, 0), 'white', 2.5, opacity)
    label(state, '这里仍然未知', vec(0, -0.12), 'white', opacity, 0, 17)
  }

  function draw(state: LightSceneState) {
    if (destroyed || width <= 1 || height <= 1) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (background) ctx.drawImage(background, 0, 0, width, height)
    else {
      ctx.fillStyle = INK
      ctx.fillRect(0, 0, width, height)
    }
    const chapter = clamp(state.chapter, 0, 6)
    const time = Math.max(0, state.time)
    mobile = width < 760 || state.immersive && height > width * 1.6
    cx = width * (state.immersive ? 0.5 : mobile ? 0.5 : 0.681)
    const clockWeight = bump(chapter, 1)
    // A continuous camera descent makes the spatial wavefront become a readable
    // cone of histories. Drag orbit remains available throughout the same scene.
    yaw = mix(-0.25, -0.10, smooth(0, 2.5, chapter)) + state.orbit * 0.65
    elevation = mix(0.29, 0.38, smooth(1.3, 3, chapter)) - clockWeight * 0.11
    cosYaw = Math.cos(yaw)
    sinYaw = Math.sin(yaw)
    cosElevation = Math.cos(elevation)
    sinElevation = Math.sin(elevation)
    const coneWeight = smooth(1, 2, chapter) * (1 - smooth(4, 5, chapter)) + smooth(5, 6, chapter)
    const mediumWeight = bump(chapter, 5)
    const coneExtent = 1.21 * (cosElevation + sinElevation)
    if (mobile && !state.immersive) {
      const top = Math.max(78, state.contentBottom ?? height * 0.34) + 20
      const bottom = height - 170
      const available = Math.max(70, bottom - top)
      const symmetricExtent = mix(mix(1.34, coneExtent, coneWeight), 0.76, mediumWeight)
      const upperExtent = mix(symmetricExtent, 0.53, clockWeight)
      const lowerExtent = mix(symmetricExtent, 0.8, clockWeight)
      const topPadding = mix(8, 27, clockWeight)
      const bottomPadding = mix(13, 47, clockWeight)
      const widthScale = width * mix(0.355, 0.415, clockWeight)
      scale = Math.max(12, Math.min(widthScale, (available - topPadding - bottomPadding) / (upperExtent + lowerExtent)))
      const bodyHeight = scale * (upperExtent + lowerExtent) + topPadding + bottomPadding
      cy = top + Math.max(0, available - bodyHeight) / 2 + topPadding + upperExtent * scale
    } else if (mobile) {
      scale = Math.min(width * mix(0.395, 0.43, clockWeight), height * 0.79 / mix(coneExtent * 2, 3.17, clockWeight))
      cy = height * mix(0.5, 0.486, clockWeight)
    } else {
      const availableHeight = state.immersive ? height * 0.82 : height * 0.69
      const widthScale = width * (state.immersive ? 0.3 : 0.228)
      const heightExtent = state.immersive ? 2.75 : mix(2.75, coneExtent * 2, coneWeight)
      scale = Math.max(45, Math.min(widthScale, availableHeight / mix(heightExtent, 2.22, clockWeight)))
      cy = height * (state.immersive ? 0.49 : 0.505)
    }
    const sphereOpacity = 1 - smooth(0.1, 1, chapter)
    const coneOpacity = smooth(1.1, 2, chapter) * (1 - smooth(4.05, 5, chapter))
    const introLesson = state.lesson && !state.experiment && sphereOpacity > 0.01
    if (introLesson) {
      const top = state.immersive ? 48 : mobile ? Math.max(78, state.contentBottom ?? height * 0.34) + 20 : 100
      const bottom = height - (state.immersive ? 45 : mobile ? 175 : 120)
      const availableWidth = width * (state.immersive ? 0.86 : mobile ? 0.9 : 0.53)
      scale = Math.max(12, Math.min(availableWidth / 3.05, (bottom - top - 28) / 2.6))
      cy = (top + bottom) / 2
      lessonScene(state, sphereOpacity)
    } else {
      sculpture({ ...state, chapter }, time)
      spherePulse(state, time, sphereOpacity)
    }
    clockScene(state, time, clockWeight)
    coneScene(state, time, coneOpacity)
    glassScene(state, time, bump(chapter, 5))
    uncertainty(state, state.reducedMotion ? 0 : time, smooth(5, 6, chapter))
    // A quiet focus falloff keeps the viewer's eye on light, not the edges.
    const vignette = ctx.createRadialGradient(cx, cy, scale * 0.75, cx, cy, Math.max(width, height) * 0.85)
    vignette.addColorStop(0, 'rgba(7,7,17,0)')
    vignette.addColorStop(1, 'rgba(7,7,17,0.43)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)
  }

  return {
    draw,
    resize(nextWidth, nextHeight, nextDpr) {
      if (destroyed) return
      width = Math.max(1, nextWidth)
      height = Math.max(1, nextHeight)
      dpr = clamp(nextDpr || 1, 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      prepareBackground()
    },
    dispose() {
      destroyed = true
      background = null
      for (const glow of Object.values(glows)) glow.width = glow.height = 1
    },
  }
}
