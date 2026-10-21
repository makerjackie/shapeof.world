/**
 * Engraved silhouettes used as scale references. Each shape is defined in
 * unit height (feet or base at y = 0, top at y = 1) and drawn with hatching.
 */
type Pt = readonly [number, number]

function mirrored(right: ReadonlyArray<Pt>): Array<Pt> {
  const left = [...right].reverse().map(([x, y]) => [-x, y] as const)
  return [...right, ...left]
}

const PERSON_BODY = mirrored([
  [0.03, 0.86], [0.1, 0.835], [0.132, 0.81], [0.148, 0.74], [0.155, 0.62], [0.152, 0.5], [0.142, 0.462],
  [0.126, 0.466], [0.122, 0.56], [0.112, 0.7], [0.1, 0.74], [0.098, 0.64], [0.094, 0.53], [0.099, 0.49],
  [0.092, 0.3], [0.084, 0.06], [0.098, 0.012], [0.094, 0], [0.034, 0], [0.032, 0.05], [0.028, 0.28], [0.012, 0.47], [0, 0.48],
])

const TOWER = mirrored([
  [0.06, 0], [0.06, 0.16], [0.047, 0.17], [0.047, 0.33], [0.036, 0.345], [0.036, 0.5], [0.026, 0.515],
  [0.026, 0.66], [0.017, 0.675], [0.017, 0.79], [0.008, 0.8], [0.005, 0.9], [0.0015, 1],
])

const MOUNTAIN: ReadonlyArray<Pt> = [
  [-1.35, 0], [-0.95, 0.24], [-0.7, 0.33], [-0.52, 0.46], [-0.36, 0.52], [-0.2, 0.74], [-0.08, 0.86], [0, 1],
  [0.07, 0.93], [0.16, 0.9], [0.3, 0.74], [0.46, 0.62], [0.62, 0.52], [0.86, 0.36], [1.05, 0.2], [1.35, 0],
]

export type Mapper = (x: number, y: number) => readonly [number, number]

function trace(ctx: CanvasRenderingContext2D, points: ReadonlyArray<Pt>, map: Mapper) {
  points.forEach(([x, y], i) => {
    const [px, py] = map(x, y)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
}

/** Fill the current clip with diagonal engraving lines. */
export function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spacing: number, angle = -0.9) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const len = Math.hypot(w, h) * 1.2
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.beginPath()
  for (let o = -len / 2; o <= len / 2; o += spacing) {
    const ox = cx - dy * o
    const oy = cy + dx * o
    ctx.moveTo(ox - dx * len / 2, oy - dy * len / 2)
    ctx.lineTo(ox + dx * len / 2, oy + dy * len / 2)
  }
  ctx.stroke()
}

export function drawPerson(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, heightPx: number, ink: string, alpha: number) {
  if (alpha <= 0.01 || heightPx < 6) return
  const map: Mapper = (x, y) => [baseX + x * heightPx, baseY - y * heightPx]
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  trace(ctx, PERSON_BODY, map)
  const [hx, hy] = map(0, 0.928)
  ctx.moveTo(hx + heightPx * 0.066, hy)
  ctx.arc(hx, hy, heightPx * 0.066, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8, 12, 10, 0.92)'
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = ink
  ctx.globalAlpha *= 0.42
  ctx.lineWidth = Math.max(0.6, heightPx * 0.004)
  hatch(ctx, baseX - heightPx * 0.2, baseY - heightPx, heightPx * 0.4, heightPx, Math.max(2.4, heightPx * 0.014))
  ctx.restore()
  ctx.beginPath()
  trace(ctx, PERSON_BODY, map)
  ctx.moveTo(hx + heightPx * 0.066, hy)
  ctx.arc(hx, hy, heightPx * 0.066, 0, Math.PI * 2)
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.8, heightPx * 0.005)
  ctx.stroke()
  ctx.restore()
}

export function drawTower(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, heightPx: number, ink: string, alpha: number) {
  if (alpha <= 0.01 || heightPx < 4) return
  const map: Mapper = (x, y) => [baseX + x * heightPx, baseY - y * heightPx]
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  trace(ctx, TOWER, map)
  ctx.fillStyle = 'rgba(8, 12, 10, 0.9)'
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = ink
  ctx.globalAlpha *= 0.5
  ctx.lineWidth = Math.max(0.5, heightPx * 0.0016)
  ctx.beginPath()
  for (let y = 0; y < 1; y += Math.max(0.006, 3 / heightPx)) {
    const [, py] = map(0, y)
    ctx.moveTo(baseX - heightPx * 0.07, py)
    ctx.lineTo(baseX + heightPx * 0.07, py)
  }
  ctx.stroke()
  ctx.restore()
  ctx.beginPath()
  trace(ctx, TOWER, map)
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.7, heightPx * 0.002)
  ctx.stroke()
  ctx.restore()
}

export function drawMountain(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, heightPx: number, ink: string, alpha: number) {
  if (alpha <= 0.01 || heightPx < 4) return
  const map: Mapper = (x, y) => [baseX + x * heightPx, baseY - y * heightPx]
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  trace(ctx, MOUNTAIN, map)
  ctx.fillStyle = 'rgba(8, 12, 10, 0.88)'
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = ink
  ctx.globalAlpha *= 0.4
  ctx.lineWidth = Math.max(0.5, heightPx * 0.004)
  hatch(ctx, baseX - heightPx * 1.4, baseY - heightPx, heightPx * 2.8, heightPx, Math.max(2.5, heightPx * 0.025), -0.5)
  ctx.restore()
  ctx.beginPath()
  trace(ctx, MOUNTAIN, map)
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.7, heightPx * 0.005)
  ctx.stroke()
  ctx.restore()
}

/** A small engraved orbiting station: truss and four panels. */
export function drawStation(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, alpha: number) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.strokeStyle = ink
  ctx.fillStyle = 'rgba(8, 12, 10, 0.9)'
  ctx.lineWidth = Math.max(0.8, size * 0.08)
  ctx.beginPath()
  ctx.moveTo(x - size, y)
  ctx.lineTo(x + size, y)
  ctx.stroke()
  for (const sx of [-0.8, -0.45, 0.45, 0.8]) {
    ctx.beginPath()
    ctx.rect(x + sx * size - size * 0.13, y - size * 0.55, size * 0.26, size * 1.1)
    ctx.fill()
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.rect(x - size * 0.16, y - size * 0.2, size * 0.32, size * 0.4)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** An engraved sphere: hatch density follows a light from the upper left. */
export function drawGlobe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  ink: string,
  glow: string,
  alpha: number,
  craters = false,
  /** Glow thickness in pixels; a thin limb rather than a halo that tints the sky. */
  haloPx = r * 0.22,
) {
  if (alpha <= 0.01 || r < 0.5) return
  ctx.save()
  ctx.globalAlpha *= alpha
  if (r > 3 && haloPx > 0.5) {
    const atmosphere = ctx.createRadialGradient(cx, cy, Math.max(0, r - haloPx * 0.2), cx, cy, r + haloPx)
    atmosphere.addColorStop(0, glow)
    atmosphere.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = atmosphere
    ctx.beginPath()
    ctx.arc(cx, cy, r + haloPx, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(6, 9, 8, 0.96)'
  ctx.fill()
  if (r < 3) {
    ctx.fillStyle = ink
    ctx.fill()
    ctx.restore()
    return
  }
  ctx.save()
  ctx.clip()
  if (r > 260) {
    // Seen close up, the globe is engraved with rings parallel to its limb.
    const spacing = Math.max(3, Math.min(9, r / 140))
    ctx.lineWidth = 0.7
    ctx.strokeStyle = ink
    for (let k = 1; k < 90; k++) {
      const rr = r - k * spacing * (1 + k * 0.04)
      if (rr <= 0) break
      ctx.globalAlpha = alpha * Math.max(0, 0.55 - k * 0.012)
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = ink
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    return
  }
  const lines = Math.min(420, Math.max(6, Math.round(r / 1.6)))
  ctx.lineWidth = Math.max(0.45, Math.min(0.9, (r / lines) * 0.3))
  for (let i = 0; i < lines; i++) {
    const v = (i + 0.5) / lines
    const yy = cy - r + v * 2 * r
    const half = Math.sqrt(Math.max(0, 1 - Math.pow(2 * v - 1, 2))) * r
    // Lit side upper-left: draw a lit segment whose length follows the terminator.
    const lit = 0.55 + 0.45 * (1 - v)
    ctx.strokeStyle = ink
    ctx.globalAlpha = alpha * (0.25 + 0.55 * lit)
    ctx.beginPath()
    ctx.moveTo(cx - half, yy)
    ctx.lineTo(cx - half + half * 2 * lit * 0.85, yy)
    ctx.stroke()
  }
  if (craters) {
    ctx.globalAlpha = alpha * 0.55
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(0.5, r * 0.02)
    const spots: ReadonlyArray<readonly [number, number, number]> = [[-0.35, -0.2, 0.16], [0.1, 0.25, 0.12], [-0.05, -0.45, 0.08], [0.32, -0.1, 0.1], [-0.4, 0.3, 0.09]]
    for (const [ox, oy, rr] of spots) {
      ctx.beginPath()
      ctx.ellipse(cx + ox * r, cy + oy * r, rr * r, rr * r * 0.82, 0.3, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.7, Math.min(1.6, r * 0.01))
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
