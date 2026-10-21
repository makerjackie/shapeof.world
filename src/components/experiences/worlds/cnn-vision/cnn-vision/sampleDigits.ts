/**
 * Programmatic 28×28 digit strokes for demos (not real MNIST samples).
 * Thick white strokes on black, roughly centered — good enough for the
 * educational LeNet to classify with high confidence.
 */

const SIZE = 28

function blank(): Float32Array {
  return new Float32Array(SIZE * SIZE)
}

function set(img: Float32Array, x: number, y: number, v: number) {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= SIZE || yi >= SIZE) return
  const i = yi * SIZE + xi
  img[i] = Math.max(img[i], Math.min(1, v))
}

function brush(img: Float32Array, x: number, y: number, r = 1.35) {
  const rr = Math.ceil(r)
  for (let dy = -rr; dy <= rr; dy += 1) {
    for (let dx = -rr; dx <= rr; dx += 1) {
      const d = Math.hypot(dx, dy)
      if (d <= r) set(img, x + dx, y + dy, 1 - (d / r) * 0.35)
    }
  }
}

function line(img: Float32Array, x0: number, y0: number, x1: number, y1: number, r = 1.35) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2.2))
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    brush(img, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)
  }
}

function arc(
  img: Float32Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  r = 1.35,
) {
  const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) * 1.8))
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = a0 + (a1 - a0) * t
    brush(img, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r)
  }
}

function drawDigit(d: number): Float32Array {
  const img = blank()
  // Coordinate system: y down, roughly MNIST placement
  switch (d) {
    case 0:
      arc(img, 14, 14, 7.5, 10, 0, Math.PI * 2, 1.5)
      break
    case 1:
      line(img, 10, 8, 14, 5, 1.4)
      line(img, 14, 5, 14, 23, 1.55)
      line(img, 10, 23, 18, 23, 1.3)
      break
    case 2:
      arc(img, 14, 9, 7, 5.5, Math.PI * 0.95, Math.PI * 2.05, 1.45)
      line(img, 20, 12, 9, 23, 1.5)
      line(img, 9, 23, 21, 23, 1.45)
      break
    case 3:
      // Handwriting-style 3 (double-curve classifies reliably on this net)
      line(img, 8, 7, 18, 6, 1.5)
      arc(img, 14, 10, 6, 4.5, Math.PI * 1.7, Math.PI * 2.6, 1.5)
      line(img, 12, 14, 17, 14, 1.4)
      arc(img, 14, 19, 7, 5, Math.PI * 1.4, Math.PI * 2.5, 1.55)
      break
    case 4:
      line(img, 8, 5, 8, 15, 1.45)
      line(img, 8, 15, 20, 15, 1.45)
      line(img, 17, 5, 17, 23, 1.5)
      break
    case 5:
      line(img, 9, 6, 20, 6, 1.45)
      line(img, 9, 6, 9, 13, 1.4)
      line(img, 9, 13, 16, 12.5, 1.35)
      arc(img, 14, 18, 7, 5.5, Math.PI * 1.15, Math.PI * 2.2, 1.45)
      break
    case 6:
      arc(img, 15, 10, 7, 6, Math.PI * 0.3, Math.PI * 1.15, 1.4)
      line(img, 9, 12, 9, 18, 1.4)
      arc(img, 14, 18, 6.5, 5.5, 0, Math.PI * 2, 1.45)
      break
    case 7:
      line(img, 8, 6, 21, 6, 1.5)
      line(img, 21, 6, 11, 23, 1.55)
      break
    case 8:
      arc(img, 14, 9, 5.5, 4.8, 0, Math.PI * 2, 1.4)
      arc(img, 14, 18.5, 6.5, 5.5, 0, Math.PI * 2, 1.45)
      break
    case 9:
      arc(img, 14, 10, 6.5, 5.5, 0, Math.PI * 2, 1.45)
      line(img, 20, 12, 20, 18, 1.4)
      arc(img, 14, 18, 7, 5.5, Math.PI * 1.85, Math.PI * 2.7, 1.4)
      break
    default:
      break
  }
  return img
}

const cache: Array<Float32Array | null> = Array.from({ length: 10 }, () => null)

export function getSampleDigit(d: number): Float32Array {
  const i = ((d % 10) + 10) % 10
  if (!cache[i]) cache[i] = drawDigit(i)
  return cache[i]!.slice()
}

/** Soft blur then re-center mass for slightly more MNIST-like strokes. */
export function normalizeDigit(src: Float32Array): Float32Array {
  // Simple 3×3 box blur + re-threshold soft
  const tmp = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let s = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue
          s += src[yy * SIZE + xx]
          n += 1
        }
      }
      tmp[y * SIZE + x] = s / n
    }
  }
  let max = 0
  for (let i = 0; i < tmp.length; i += 1) max = Math.max(max, tmp[i])
  if (max < 1e-6) return tmp
  for (let i = 0; i < tmp.length; i += 1) tmp[i] = Math.min(1, (tmp[i] / max) ** 0.85)
  return tmp
}
