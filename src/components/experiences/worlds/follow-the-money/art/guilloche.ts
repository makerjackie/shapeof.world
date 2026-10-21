/**
 * Guilloché: the interlaced engine-turned curves printed on banknotes.
 * Every rosette here is a family of phase-shifted sine-modulated circles.
 */
export type GuillocheRing = {
  /** Base radius as a fraction of the rosette radius. */
  r: number
  /** Primary modulation depth (fraction of radius). */
  a: number
  /** Primary lobes per turn. */
  n: number
  /** Number of phase-shifted copies. */
  m: number
  /** Optional secondary modulation. */
  b?: number
  k?: number
  /** Line alpha multiplier. */
  alpha?: number
}

export type RosetteSpec = ReadonlyArray<GuillocheRing>

export function strokeRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ring: GuillocheRing,
  rotation = 0,
) {
  const steps = Math.max(220, Math.round(ring.n * 28 + (ring.k ?? 0) * 12))
  const base = ring.r * radius
  const amp = ring.a * radius
  const amp2 = (ring.b ?? 0) * radius
  const k = ring.k ?? 0
  for (let j = 0; j < ring.m; j++) {
    const phase = (j / ring.m) * Math.PI * 2
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2
      const rr = base + amp * Math.sin(ring.n * t + phase) + amp2 * Math.sin(k * t - phase * 0.5)
      const x = cx + rr * Math.cos(t + rotation)
      const y = cy + rr * Math.sin(t + rotation)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export function strokeRosette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  spec: RosetteSpec,
  color: string,
  lineWidth: number,
  rotation = 0,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  const baseAlpha = ctx.globalAlpha
  for (const ring of spec) {
    ctx.globalAlpha = baseAlpha * (ring.alpha ?? 1)
    strokeRing(ctx, cx, cy, radius, ring, rotation)
  }
  ctx.restore()
}

/** A straight guilloché band: interlaced sine lines along a path segment. */
export function strokeBand(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  length: number,
  height: number,
  waves: number,
  copies: number,
  vertical = false,
) {
  const steps = Math.max(80, Math.round(waves * 18))
  for (let j = 0; j < copies; j++) {
    const phase = (j / copies) * Math.PI * 2
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const along = u * length
      const across = height * 0.5 + height * 0.42 * Math.sin(u * waves * Math.PI * 2 + phase) * Math.cos(u * Math.PI * 2 * 0.5 + phase * 0.25)
      const x = vertical ? x0 + across : x0 + along
      const y = vertical ? y0 + along : y0 + across
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Distinct rosettes, one per destination and a few for decoration. */
export const ROSETTES = {
  wages: [
    { r: 0.78, a: 0.16, n: 9, m: 14 },
    { r: 0.46, a: 0.12, n: 12, m: 10, alpha: 0.8 },
    { r: 0.2, a: 0.08, n: 6, m: 6, alpha: 0.7 },
  ],
  profit: [
    { r: 0.76, a: 0.18, n: 7, m: 16, b: 0.05, k: 21 },
    { r: 0.42, a: 0.14, n: 14, m: 8, alpha: 0.8 },
    { r: 0.16, a: 0.06, n: 7, m: 5, alpha: 0.7 },
  ],
  depreciation: [
    { r: 0.8, a: 0.12, n: 16, m: 10 },
    { r: 0.5, a: 0.2, n: 5, m: 12, alpha: 0.75 },
    { r: 0.2, a: 0.07, n: 10, m: 6, alpha: 0.7 },
  ],
  tax: [
    { r: 0.78, a: 0.14, n: 11, m: 12, b: 0.04, k: 33 },
    { r: 0.48, a: 0.16, n: 8, m: 10, alpha: 0.8 },
    { r: 0.18, a: 0.08, n: 8, m: 6, alpha: 0.7 },
  ],
  imports: [
    { r: 0.78, a: 0.2, n: 6, m: 18 },
    { r: 0.44, a: 0.1, n: 18, m: 8, alpha: 0.8 },
    { r: 0.18, a: 0.07, n: 9, m: 6, alpha: 0.7 },
  ],
  watermark: [
    { r: 0.86, a: 0.1, n: 24, m: 18, b: 0.03, k: 72, alpha: 0.7 },
    { r: 0.64, a: 0.16, n: 12, m: 22 },
    { r: 0.4, a: 0.12, n: 18, m: 16, alpha: 0.85 },
    { r: 0.18, a: 0.08, n: 9, m: 10, alpha: 0.7 },
  ],
  medallion: [
    { r: 0.82, a: 0.12, n: 15, m: 20, b: 0.03, k: 45 },
    { r: 0.56, a: 0.18, n: 9, m: 18, alpha: 0.9 },
    { r: 0.3, a: 0.12, n: 12, m: 12, alpha: 0.8 },
  ],
} satisfies Record<string, RosetteSpec>

const cache = new Map<string, HTMLCanvasElement>()

/** Pre-render a rosette once; callers draw the bitmap rotated and scaled. */
export function rosetteBitmap(key: keyof typeof ROSETTES, color: string, pixels: number, lineWidth = 1): HTMLCanvasElement {
  const size = Math.max(16, Math.round(pixels))
  const id = `${key}|${color}|${size}|${lineWidth}`
  const hit = cache.get(id)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    strokeRosette(ctx, size / 2, size / 2, size * 0.48, ROSETTES[key], color, lineWidth)
  }
  if (cache.size > 80) cache.clear()
  cache.set(id, canvas)
  return canvas
}
