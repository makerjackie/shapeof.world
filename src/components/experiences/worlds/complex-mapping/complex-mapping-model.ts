export type Complex = { re: number; im: number }

export type ComplexFnId = 'exp' | 'sin' | 'tan' | 'sq' | 'inv' | 'zeta'

export function complexExp(z: Complex): Complex {
  const e = Math.exp(z.re)
  return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) }
}

export function complexSin(z: Complex): Complex {
  return {
    re: Math.sin(z.re) * Math.cosh(z.im),
    im: Math.cos(z.re) * Math.sinh(z.im),
  }
}

/** tan(x+iy) = (sin 2x + i·sinh 2y) / (cos 2x + cosh 2y) */
export function complexTan(z: Complex): Complex {
  const d = Math.cos(2 * z.re) + Math.cosh(2 * z.im)
  return { re: Math.sin(2 * z.re) / d, im: Math.sinh(2 * z.im) / d }
}

export function complexSquare(z: Complex): Complex {
  return { re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im }
}

export function complexInverse(z: Complex): Complex {
  const r2 = z.re * z.re + z.im * z.im
  if (r2 < 1e-12) return { re: Infinity, im: Infinity }
  return { re: z.re / r2, im: -z.im / r2 }
}

const ZETA_TERMS = 32
const ZETA_LOGS = Array.from({ length: ZETA_TERMS + 1 }, (_, n) => Math.log(n || 1))
const ZETA_BERNOULLI = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510, 43867 / 798, -174611 / 330]
const ZETA_CORRECTIONS = ZETA_BERNOULLI.map((b, k) => {
  let factorial = 1
  for (let n = 2; n <= 2 * k + 2; n++) factorial *= n
  return b / factorial
})

// Euler–Maclaurin continuation (DLMF 25.11.7), validated for Re z ∈ [-4, 4], Im z ∈ [-18, 18].
export function complexZeta(z: Complex): Complex {
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return { re: NaN, im: NaN }
  if (z.re === 1 && z.im === 0) return { re: Infinity, im: Infinity }
  if (z.im === 0 && z.re < 0 && z.re % 2 === 0) return { re: 0, im: 0 }
  let re = 0, im = 0, errorRe = 0, errorIm = 0
  for (let n = 1; n < ZETA_TERMS; n++) {
    const magnitude = Math.exp(-z.re * ZETA_LOGS[n])
    const angle = -z.im * ZETA_LOGS[n]
    // Compensated summation limits cancellation on the left side of the display window.
    const partRe = magnitude * Math.cos(angle) - errorRe
    const partIm = magnitude * Math.sin(angle) - errorIm
    const nextRe = re + partRe, nextIm = im + partIm
    errorRe = (nextRe - re) - partRe; errorIm = (nextIm - im) - partIm
    re = nextRe; im = nextIm
  }
  const magnitude = Math.exp(-z.re * ZETA_LOGS[ZETA_TERMS])
  const angle = -z.im * ZETA_LOGS[ZETA_TERMS]
  const baseRe = magnitude * Math.cos(angle), baseIm = magnitude * Math.sin(angle)
  const poleRe = z.re - 1, denominator = poleRe * poleRe + z.im * z.im
  re += ZETA_TERMS * (baseRe * poleRe + baseIm * z.im) / denominator + baseRe / 2
  im += ZETA_TERMS * (baseIm * poleRe - baseRe * z.im) / denominator + baseIm / 2
  let risingRe = z.re / ZETA_TERMS, risingIm = z.im / ZETA_TERMS
  for (let k = 0; k < ZETA_CORRECTIONS.length; k++) {
    const coefficient = ZETA_CORRECTIONS[k]
    re += coefficient * (baseRe * risingRe - baseIm * risingIm)
    im += coefficient * (baseRe * risingIm + baseIm * risingRe)
    for (let offset = 2 * k + 1; offset <= 2 * k + 2; offset++) {
      const factorRe = (z.re + offset) / ZETA_TERMS, factorIm = z.im / ZETA_TERMS
      const nextRe = risingRe * factorRe - risingIm * factorIm
      risingIm = risingRe * factorIm + risingIm * factorRe
      risingRe = nextRe
    }
  }
  return { re, im }
}

export type ComplexFunctionDef = {
  id: ComplexFnId
  /** 语言中立的数学记号，直接用作界面标签 */
  notation: string
  apply: (z: Complex) => Complex
  poles: Array<Complex>
}

export const COMPLEX_FUNCTIONS: ReadonlyArray<ComplexFunctionDef> = [
  { id: 'exp', notation: 'e^z', apply: complexExp, poles: [] },
  { id: 'sin', notation: 'sin z', apply: complexSin, poles: [] },
  {
    id: 'tan',
    notation: 'tan z',
    apply: complexTan,
    poles: [
      { re: -Math.PI / 2, im: 0 },
      { re: Math.PI / 2, im: 0 },
      { re: (-3 * Math.PI) / 2, im: 0 },
      { re: (3 * Math.PI) / 2, im: 0 },
    ],
  },
  { id: 'sq', notation: 'z²', apply: complexSquare, poles: [] },
  { id: 'inv', notation: '1/z', apply: complexInverse, poles: [{ re: 0, im: 0 }] },
  { id: 'zeta', notation: 'ζ(z)', apply: complexZeta, poles: [{ re: 1, im: 0 }] },
]

export function complexFunctionById(id: ComplexFnId): ComplexFunctionDef {
  return COMPLEX_FUNCTIONS.find((fn) => fn.id === id) ?? COMPLEX_FUNCTIONS[0]
}

/** z 与 f(z) 之间的线性混合点，t=0 是原像，t=1 是像 */
export function morphPoint(z: Complex, fz: Complex, t: number): Complex {
  return { re: z.re + (fz.re - z.re) * t, im: z.im + (fz.im - z.im) * t }
}

export function complexArg(z: Complex): number {
  return Math.atan2(z.im, z.re)
}

export function complexAbs(z: Complex): number {
  return Math.hypot(z.re, z.im)
}

export function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}

/** 3D 地形高度：ln(1+|f|) 软压缩并封顶，极点处冲成封顶尖峰 */
export const SURFACE_HEIGHT_CAP = 3.4

export function surfaceHeight(absFz: number): number {
  if (!Number.isFinite(absFz)) return SURFACE_HEIGHT_CAP
  return Math.min(SURFACE_HEIGHT_CAP, Math.log1p(absFz) * 1.18)
}

export type SolidCamera = { yaw: number; pitch: number; dist: number }

/** 世界点 (x=re, y=im, h=高度) 的转盘相机透视投影 */
export function projectSolid(
  p: { x: number; y: number; h: number },
  cam: SolidCamera,
  cx: number,
  cy: number,
  focal: number,
): { x: number; y: number; depth: number } {
  const cyaw = Math.cos(cam.yaw)
  const syaw = Math.sin(cam.yaw)
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const a = p.x * syaw - p.y * cyaw
  const b = p.x * cyaw + p.y * syaw
  const depth = cam.dist + cp * b + sp * p.h
  return {
    x: cx + (focal * a) / depth,
    y: cy - (focal * (-sp * b + cp * p.h)) / depth,
    depth,
  }
}

/** 从屏幕点反解地面 (h=0) 上的复平面坐标，用于 3D 视图里放置探针 */
export function unprojectSolidGround(
  px: number,
  py: number,
  cam: SolidCamera,
  cx: number,
  cy: number,
  focal: number,
): Complex | null {
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const sx = px - cx
  const sy = cy - py
  const denom = focal * sp + sy * cp
  if (Math.abs(denom) < 1e-6) return null
  const b = (-sy * cam.dist) / denom
  const depth = cam.dist + cp * b
  if (depth < 0.5) return null
  const a = (sx * depth) / focal
  const cyaw = Math.cos(cam.yaw)
  const syaw = Math.sin(cam.yaw)
  return { re: a * syaw + b * cyaw, im: -a * cyaw + b * syaw }
}

/** 方形网格线：竖线族（x=常数）与横线族（y=常数） */
export function cartesianGridLines(
  xMax: number,
  yMax: number,
  step: number,
  samples: number,
): { vertical: Array<Array<Complex>>; horizontal: Array<Array<Complex>> } {
  const vertical: Array<Array<Complex>> = []
  const horizontal: Array<Array<Complex>> = []
  const xCount = Math.round(xMax / step)
  const yCount = Math.round(yMax / step)
  for (let i = -xCount; i <= xCount; i += 1) {
    const x = i * step
    const line: Array<Complex> = []
    for (let j = 0; j <= samples; j += 1) {
      line.push({ re: x, im: -yMax + (2 * yMax * j) / samples })
    }
    vertical.push(line)
  }
  for (let j = -yCount; j <= yCount; j += 1) {
    const y = j * step
    const line: Array<Complex> = []
    for (let k = 0; k <= samples; k += 1) {
      line.push({ re: -xMax + (2 * xMax * k) / samples, im: y })
    }
    horizontal.push(line)
  }
  return { vertical, horizontal }
}

/** 极坐标网格线：同心圆族与射线族 */
export function polarGridLines(
  maxRadius: number,
  ringStep: number,
  rayCount: number,
  samples: number,
): Array<Array<Complex>> {
  const lines: Array<Array<Complex>> = []
  const ringCount = Math.round(maxRadius / ringStep)
  for (let i = 1; i <= ringCount; i += 1) {
    const r = i * ringStep
    const ring: Array<Complex> = []
    for (let j = 0; j <= samples; j += 1) {
      const theta = (2 * Math.PI * j) / samples
      ring.push({ re: r * Math.cos(theta), im: r * Math.sin(theta) })
    }
    lines.push(ring)
  }
  for (let i = 0; i < rayCount; i += 1) {
    const theta = (2 * Math.PI * i) / rayCount
    const ray: Array<Complex> = []
    for (let j = 1; j <= samples / 2; j += 1) {
      const r = (maxRadius * j) / (samples / 2)
      ray.push({ re: r * Math.cos(theta), im: r * Math.sin(theta) })
    }
    lines.push(ray)
  }
  return lines
}
