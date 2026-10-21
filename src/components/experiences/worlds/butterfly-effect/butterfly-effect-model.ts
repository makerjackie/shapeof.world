/**
 * 蝴蝶效应世界的纯模型层：四套经典混沌吸引子 + Sprott 式随机多项式
 * 吸引子生成器（Lyapunov 筛选），RK4 积分与世界坐标映射。
 * 不依赖 three.js / React，方便单测与海报预跑。
 */

export type Vec3 = { x: number; y: number; z: number }

/** 四个经典系统的 id；随机生成系统使用 'custom'。 */
export type AttractorId = 'lorenz' | 'rossler' | 'aizawa' | 'thomas'

export type AttractorParam = {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export type AttractorDef = {
  id: AttractorId | 'custom'
  name: string
  nameEn: string
  /** 展示用方程（unicode 文本） */
  equations: [string, string, string]
  /** 参数说明（为什么面板） */
  paramsNote: string
  paramsNoteEn: string
  /** 可调参数当前值（经典系统） */
  params?: Record<string, number>
  /** 暴露给自由探索的参数滑杆（经典系统，最多 3 个） */
  paramDefs?: Array<AttractorParam>
  /** RK4 步长（模型时间单位） */
  dt: number
  /** 模拟坐标 → 世界坐标：(p - center) * scale，z 轴朝上 */
  scale: number
  center: Vec3
  /** 相机注视点高度（世界坐标 y） */
  targetY: number
  /** 默认种子（位于吸引子附近，能快速落上吸引子） */
  seed: Vec3
  /** 双胞胎间距（B 相对 A 的 x 偏移，模型单位） */
  twinOffset: number
  /** 拖尾速度着色的参考区间（|v| 的 sqrt 归一） */
  speedLo: number
  speedHi: number
  /** 自由探索默认流速：模型时间单位 / 秒 */
  unitsPerSecond: number
  /** 最大 Lyapunov 指数近似值（每模型时间单位），用于科普读数 */
  lyapunov: number
  /** 随机系统的 30 个二次多项式系数（仅 custom） */
  poly?: Float64Array
  /** 随机系统的展示种子号（仅 custom） */
  seedNumber?: number
}

export const ATTRACTORS: Record<AttractorId, AttractorDef> = {
  lorenz: {
    id: 'lorenz',
    name: '洛伦兹',
    nameEn: 'Lorenz',
    equations: ['ẋ = σ(y − x)', 'ẏ = x(ρ − z) − y', 'ż = xy − βz'],
    paramsNote: 'σ = 10，ρ = 28，β = 8/3（1963 年大气对流模型）',
    paramsNoteEn: 'σ = 10, ρ = 28, β = 8/3 (1963 atmospheric convection model)',
    params: { sigma: 10, rho: 28, beta: 8 / 3 },
    paramDefs: [
      { key: 'sigma', label: 'σ', min: 4, max: 20, step: 0.1, default: 10 },
      { key: 'rho', label: 'ρ', min: 2, max: 99, step: 0.1, default: 28 },
      { key: 'beta', label: 'β', min: 1, max: 4, step: 0.01, default: 8 / 3 },
    ],
    dt: 0.004,
    scale: 0.15,
    center: { x: 0, y: 0, z: 25 },
    targetY: 0,
    seed: { x: 1, y: 1, z: 1 },
    twinOffset: 1e-6,
    speedLo: 30,
    speedHi: 280,
    unitsPerSecond: 3,
    lyapunov: 0.9,
  },
  rossler: {
    id: 'rossler',
    name: '罗斯勒',
    nameEn: 'Rössler',
    equations: ['ẋ = −y − z', 'ẏ = x + ay', 'ż = b + z(x − c)'],
    paramsNote: 'a = 0.2，b = 0.2，c = 5.7（1976 年「连续混沌方程」）',
    paramsNoteEn: 'a = 0.2, b = 0.2, c = 5.7 (1976 “equation for continuous chaos”)',
    params: { a: 0.2, b: 0.2, c: 5.7 },
    paramDefs: [
      { key: 'a', label: 'a', min: 0.05, max: 0.4, step: 0.005, default: 0.2 },
      { key: 'b', label: 'b', min: 0.05, max: 0.5, step: 0.005, default: 0.2 },
      { key: 'c', label: 'c', min: 2, max: 10, step: 0.05, default: 5.7 },
    ],
    dt: 0.02,
    scale: 0.24,
    center: { x: 0, y: 0, z: 3.5 },
    targetY: 1.9,
    seed: { x: 5, y: 5, z: 0 },
    twinOffset: 1e-6,
    speedLo: 3,
    speedHi: 48,
    unitsPerSecond: 12,
    lyapunov: 0.07,
  },
  aizawa: {
    id: 'aizawa',
    name: '相泽',
    nameEn: 'Aizawa',
    equations: ['ẋ = (z − b)x − dy', 'ẏ = dx + (z − b)y', 'ż = c + az − z³/3 − (x² + y²)(1 + ez) + fzx³'],
    paramsNote: 'a = 0.95，b = 0.7，c = 0.6，d = 3.5，e = 0.25，f = 0.1',
    paramsNoteEn: 'a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1',
    params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
    paramDefs: [
      { key: 'c', label: 'c', min: 0.2, max: 1.2, step: 0.01, default: 0.6 },
      { key: 'd', label: 'd', min: 2, max: 5, step: 0.05, default: 3.5 },
      { key: 'f', label: 'f', min: 0.02, max: 0.3, step: 0.005, default: 0.1 },
    ],
    dt: 0.008,
    scale: 1.8,
    center: { x: 0, y: 0, z: 0.15 },
    targetY: 1.05,
    seed: { x: 0.1, y: 0, z: 0 },
    twinOffset: 1e-6,
    speedLo: 0.8,
    speedHi: 5.6,
    unitsPerSecond: 10,
    lyapunov: 0.1,
  },
  thomas: {
    id: 'thomas',
    name: '托马斯',
    nameEn: 'Thomas',
    equations: ['ẋ = sin(y) − bx', 'ẏ = sin(z) − by', 'ż = sin(x) − bz'],
    paramsNote: 'b = 0.208186（循环对称的极简混沌流）',
    paramsNoteEn: 'b = 0.208186 (a cyclically symmetric minimal chaotic flow)',
    params: { b: 0.208186 },
    paramDefs: [{ key: 'b', label: 'b', min: 0.1, max: 0.35, step: 0.001, default: 0.208186 }],
    dt: 0.04,
    scale: 0.85,
    center: { x: 0, y: 0, z: 0 },
    targetY: 1.15,
    seed: { x: 1.1, y: 1.1, z: -0.01 },
    twinOffset: 1e-6,
    speedLo: 0.25,
    speedHi: 1.6,
    unitsPerSecond: 30,
    lyapunov: 0.035,
  },
}

export const ATTRACTOR_ORDER: Array<AttractorId> = ['lorenz', 'rossler', 'aizawa', 'thomas']

/** 三元二次多项式的 10 个单项式：x, y, z, x², xy, xz, y², yz, z², 1 */
function evalPolyTerms(p: Vec3): Array<number> {
  const { x, y, z } = p
  return [x, y, z, x * x, x * y, x * z, y * y, y * z, z * z, 1]
}

function evalPoly(coeffs: Float64Array, p: Vec3, out: Vec3): Vec3 {
  const t = evalPolyTerms(p)
  let sx = 0
  let sy = 0
  let sz = 0
  for (let i = 0; i < 10; i += 1) {
    sx += coeffs[i] * t[i]
    sy += coeffs[10 + i] * t[i]
    sz += coeffs[20 + i] * t[i]
  }
  out.x = sx
  out.y = sy
  out.z = sz
  return out
}

/** 计算系统在状态 p 处的导数，写入 out。 */
export function deriv(def: AttractorDef, p: Vec3, out: Vec3): Vec3 {
  const { x, y, z } = p
  if (def.poly) return evalPoly(def.poly, p, out)
  const prm = def.params!
  switch (def.id) {
    case 'lorenz': {
      out.x = prm.sigma * (y - x)
      out.y = x * (prm.rho - z) - y
      out.z = x * y - prm.beta * z
      return out
    }
    case 'rossler': {
      out.x = -y - z
      out.y = x + prm.a * y
      out.z = prm.b + z * (x - prm.c)
      return out
    }
    case 'aizawa': {
      out.x = (z - prm.b) * x - prm.d * y
      out.y = prm.d * x + (z - prm.b) * y
      out.z = prm.c + prm.a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + prm.e * z) + prm.f * z * x * x * x
      return out
    }
    case 'thomas': {
      out.x = Math.sin(y) - prm.b * x
      out.y = Math.sin(z) - prm.b * y
      out.z = Math.sin(x) - prm.b * z
      return out
    }
    default:
      return out
  }
}

/** 参数是否被用户拧离默认值（影响 λ 读数的有效性）。 */
export function paramsModified(def: AttractorDef): boolean {
  if (!def.paramDefs || !def.params) return false
  return def.paramDefs.some((pd) => Math.abs(def.params![pd.key] - pd.default) > pd.step / 2)
}

const k1: Vec3 = { x: 0, y: 0, z: 0 }
const k2: Vec3 = { x: 0, y: 0, z: 0 }
const k3: Vec3 = { x: 0, y: 0, z: 0 }
const k4: Vec3 = { x: 0, y: 0, z: 0 }
const tmp: Vec3 = { x: 0, y: 0, z: 0 }

/** 经典四阶 Runge–Kutta 单步推进，原地更新 p。 */
export function rk4Step(def: AttractorDef, p: Vec3, dt: number): Vec3 {
  deriv(def, p, k1)
  tmp.x = p.x + (k1.x * dt) / 2
  tmp.y = p.y + (k1.y * dt) / 2
  tmp.z = p.z + (k1.z * dt) / 2
  deriv(def, tmp, k2)
  tmp.x = p.x + (k2.x * dt) / 2
  tmp.y = p.y + (k2.y * dt) / 2
  tmp.z = p.z + (k2.z * dt) / 2
  deriv(def, tmp, k3)
  tmp.x = p.x + k3.x * dt
  tmp.y = p.y + k3.y * dt
  tmp.z = p.z + k3.z * dt
  deriv(def, tmp, k4)
  p.x += (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x)
  p.y += (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y)
  p.z += (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
  return p
}

/** 状态处的瞬时速度大小 |v|，用于拖尾着色。 */
export function speedOf(def: AttractorDef, p: Vec3): number {
  const d = deriv(def, p, tmp)
  return Math.hypot(d.x, d.y, d.z)
}

/** 模拟坐标 → 世界坐标（z 轴朝上居中）。 */
export function toWorld(def: AttractorDef, p: Vec3, out: Vec3): Vec3 {
  out.x = (p.x - def.center.x) * def.scale
  out.y = (p.z - def.center.z) * def.scale
  out.z = (p.y - def.center.y) * def.scale
  return out
}

export function separation(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/** 状态是否仍然有效（未发散 / 未 NaN）。 */
export function isFiniteState(p: Vec3, bound = 1e4): boolean {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) < bound &&
    Math.abs(p.y) < bound &&
    Math.abs(p.z) < bound
  )
}

/* ============================================================
   随机吸引子生成器（Sprott 式搜索 + Benettin Lyapunov 筛选）
   ============================================================ */

/** 确定性伪随机数（同一种子 → 同一只吸引子，可分享）。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cloneVec(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: p.z }
}

const POLY_TERMS = ['x', 'y', 'z', 'x²', 'xy', 'xz', 'y²', 'yz', 'z²', '']

/** 方程左端符号：ẋ / ẏ / ż。ẏ 必须是 y + 组合上点 U+0307——预组合的 U+1E8F 在等宽字体下渲染成 ý。 */
const LHS_MARKS: [string, string, string] = ['\u1e8b', 'y\u0307', '\u017c']

/** 把 10 个系数格式化成一条可展示的方程，如「ẋ = 0.42x − 1.07y² + 0.63xz + 0.20」。 */
export function formatPolyEquation(coeffs: Float64Array, offset: number, lhs: string): string {
  let out = ''
  for (let i = 0; i < 10; i += 1) {
    const c = coeffs[offset + i]
    if (Math.abs(c) < 0.005) continue
    const term = POLY_TERMS[i]
    const abs = Math.abs(c)
    const mag = term === '' || Math.abs(abs - 1) > 0.005 ? abs.toFixed(2) : ''
    const piece = `${mag}${term}`
    if (out === '') out = c < 0 ? `−${piece}` : piece
    else out += c < 0 ? ` − ${piece}` : ` + ${piece}`
  }
  return `${lhs} = ${out || '0'}`
}

/**
 * 用给定种子生成一只「确认混沌」的随机三元二次多项式吸引子。
 * 拒绝：发散到无穷、收敛到定点、极限环（λ ≈ 0）。
 * 接受：有界且 Benettin 估算的最大 Lyapunov 指数 λ > 0.015。
 * 找不到（极罕见）时返回 null，调用方换种子重试。
 */
export function generateCustomAttractor(seedNumber: number): AttractorDef | null {
  const rng = mulberry32(seedNumber * 2654435761 + 1)
  const padded = String(seedNumber).padStart(4, '0')

  for (let attempt = 0; attempt < 4000; attempt += 1) {
    const coeffs = new Float64Array(30)
    for (let i = 0; i < 30; i += 1) {
      // 稀疏化：约一半系数为零，形态更有结构感
      coeffs[i] = rng() < 0.52 ? 0 : (rng() * 2 - 1) * 1.4
    }
    const def: AttractorDef = {
      id: 'custom',
      name: `#${padded}`,
      nameEn: `#${padded}`,
      equations: ['ẋ = P₁(x, y, z)', 'ẏ = P₂(x, y, z)', 'ż = P₃(x, y, z)'],
      paramsNote: 'P₁…P₃ 是 30 个随机系数的三元二次多项式，经 Lyapunov 检验筛出：λ > 0，确认混沌',
      paramsNoteEn: 'P₁…P₃ are quadratic polynomials with 30 random coefficients, filtered by a Lyapunov test: λ > 0, chaos confirmed',
      dt: 0.01,
      scale: 1,
      center: { x: 0, y: 0, z: 0 },
      targetY: 0,
      seed: { x: 0, y: 0, z: 0 },
      twinOffset: 1e-5,
      speedLo: 0,
      speedHi: 1,
      unitsPerSecond: 4,
      lyapunov: 0,
      poly: coeffs,
      seedNumber,
    }

    const p: Vec3 = { x: rng() - 0.5, y: rng() - 0.5, z: rng() - 0.5 }

    // 快速排除发散
    let alive = true
    for (let i = 0; i < 500; i += 1) {
      rk4Step(def, p, 0.01)
      if (!isFiniteState(p, 1e3)) {
        alive = false
        break
      }
    }
    if (!alive) continue

    // 速度中位数 → 自适应步长（兼顾 RK4 精度与计算成本）
    const speeds: Array<number> = []
    for (let i = 0; i < 1000; i += 1) {
      rk4Step(def, p, 0.01)
      if (!isFiniteState(p, 1e3)) {
        alive = false
        break
      }
      speeds.push(speedOf(def, p))
    }
    if (!alive) continue
    speeds.sort((a, b) => a - b)
    const vMed = speeds[Math.floor(speeds.length / 2)]
    if (vMed < 1e-4) continue // 收敛到定点

    const dt = Math.min(Math.max(0.8 / vMed, 0.0005), 0.03)
    def.dt = dt

    // 用展示步长重新预热 + Benettin 双轨迹估算 λ
    p.x = rng() - 0.5
    p.y = rng() - 0.5
    p.z = rng() - 0.5
    for (let i = 0; i < 2000; i += 1) {
      rk4Step(def, p, dt)
      if (!isFiniteState(p, 1e3)) {
        alive = false
        break
      }
    }
    if (!alive) continue

    const q = cloneVec(p)
    q.x += 1e-9
    let logSum = 0
    const benettinSteps = 9000
    for (let i = 0; i < benettinSteps; i += 1) {
      rk4Step(def, p, dt)
      rk4Step(def, q, dt)
      if (!isFiniteState(p, 1e3) || !isFiniteState(q, 1e3)) {
        alive = false
        break
      }
      const d = separation(p, q)
      if (d <= 0) continue
      logSum += Math.log(d / 1e-9)
      // 沿连线把 q 拉回 1e-9 间距
      const pull = 1e-9 / d
      q.x = p.x + (q.x - p.x) * pull
      q.y = p.y + (q.y - p.y) * pull
      q.z = p.z + (q.z - p.z) * pull
    }
    if (!alive) continue

    const lambda = logSum / (benettinSteps * dt)
    if (lambda < 0.04) continue // 定点 / 极限环 / 近周期

    // 确认窗口：24000 步的包围盒覆盖展示期轨迹（测试与海报只重跑它的前缀），
    // 长尾漫游不会被截断成「越界」。
    const min = { x: Infinity, y: Infinity, z: Infinity }
    const max = { x: -Infinity, y: -Infinity, z: -Infinity }
    const displaySpeeds: Array<number> = []
    for (let i = 0; i < 24000; i += 1) {
      rk4Step(def, p, dt)
      if (!isFiniteState(p, 1e3)) {
        alive = false
        break
      }
      if (p.x < min.x) min.x = p.x
      if (p.y < min.y) min.y = p.y
      if (p.z < min.z) min.z = p.z
      if (p.x > max.x) max.x = p.x
      if (p.y > max.y) max.y = p.y
      if (p.z > max.z) max.z = p.z
      if (i % 4 === 0) displaySpeeds.push(speedOf(def, p))
    }
    if (!alive) continue

    const extentX = max.x - min.x
    const extentY = max.y - min.y
    const extentZ = max.z - min.z
    const maxExtent = Math.max(extentX, extentY, extentZ)
    const minExtent = Math.min(extentX, extentY, extentZ)
    if (!(maxExtent > 0.3 && maxExtent < 800)) continue // 太缩或太散都不好看
    if (minExtent / maxExtent < 0.12) continue // 针状 / 饼状的退化形态不收
    // 每次穿越吸引子的有效分离率：太小则轨迹近乎自我重叠（细环准周期感），
    // 经典四个系统在 0.16–0.47，低于 0.12 的大多是「绕很多圈才错开一点」。
    if ((lambda * maxExtent) / vMed < 0.12) continue

    // 展示参数归一：吸引子装入半径约 3 的世界（留 1/3 余量吸收长尾漫游）
    def.center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }
    def.scale = 4.5 / maxExtent
    def.seed = cloneVec(p)
    def.lyapunov = lambda
    displaySpeeds.sort((a, b) => a - b)
    def.speedLo = displaySpeeds[Math.floor(displaySpeeds.length * 0.06)]
    def.speedHi = displaySpeeds[Math.floor(displaySpeeds.length * 0.96)]
    if (def.speedHi / Math.max(def.speedLo, 1e-9) > 80) continue // 速度动态范围过大，着色只剩一团黑
    const worldSpeed = vMed * def.scale
    def.unitsPerSecond = Math.min(Math.max(5 / Math.max(worldSpeed, 1e-6), 0.5), 40)
    // 展示真实方程：30 个随机系数就是这只吸引子的「配方」
    def.equations = [
      formatPolyEquation(coeffs, 0, 'ẋ'),
      formatPolyEquation(coeffs, 10, 'ẏ'),
      formatPolyEquation(coeffs, 20, 'ż'),
    ]
    return attachSensitiveParams(def)
  }
  return null
}

/* ============================================================
   随机系统的可调参数：对形状影响最大的 3 个系数
   ============================================================ */

const SIG_SIDE = 8
const SIG_CELLS = SIG_SIDE * SIG_SIDE * SIG_SIDE

type ShapeFrame = { min: Vec3; size: Vec3 }

/**
 * 把长期轨迹渲染成 8×8×8 占据直方图，作为「形状指纹」。
 * 混沌下两条轨迹逐点比较会指数分离，但占据分布是稳定的；
 * 传入同一个 frame 时，比较的是同一坐标框里的绝对形状。
 */
function shapeSignature(
  def: AttractorDef,
  frame: ShapeFrame | null,
): { sig: Float64Array; frame: ShapeFrame } | null {
  const p = cloneVec(def.seed)
  for (let i = 0; i < 1200; i += 1) {
    rk4Step(def, p, def.dt)
    if (!isFiniteState(p, 1e3)) return null
  }
  let f = frame
  if (!f) {
    const min = { x: Infinity, y: Infinity, z: Infinity }
    const max = { x: -Infinity, y: -Infinity, z: -Infinity }
    const q = cloneVec(p)
    for (let i = 0; i < 4000; i += 1) {
      rk4Step(def, q, def.dt)
      if (!isFiniteState(q, 1e3)) return null
      if (q.x < min.x) min.x = q.x
      if (q.y < min.y) min.y = q.y
      if (q.z < min.z) min.z = q.z
      if (q.x > max.x) max.x = q.x
      if (q.y > max.y) max.y = q.y
      if (q.z > max.z) max.z = q.z
    }
    f = {
      min,
      size: {
        x: Math.max(max.x - min.x, 1e-6),
        y: Math.max(max.y - min.y, 1e-6),
        z: Math.max(max.z - min.z, 1e-6),
      },
    }
  }
  const sig = new Float64Array(SIG_CELLS)
  for (let i = 0; i < 6000; i += 1) {
    rk4Step(def, p, def.dt)
    if (!isFiniteState(p, 1e3)) return null
    const ix = Math.min(SIG_SIDE - 1, Math.max(0, Math.floor(((p.x - f.min.x) / f.size.x) * SIG_SIDE)))
    const iy = Math.min(SIG_SIDE - 1, Math.max(0, Math.floor(((p.y - f.min.y) / f.size.y) * SIG_SIDE)))
    const iz = Math.min(SIG_SIDE - 1, Math.max(0, Math.floor(((p.z - f.min.z) / f.size.z) * SIG_SIDE)))
    sig[ix + SIG_SIDE * (iy + SIG_SIDE * iz)] += 1
  }
  for (let i = 0; i < SIG_CELLS; i += 1) sig[i] /= 6000
  return { sig, frame: f }
}

function signatureDistance(a: Float64Array, b: Float64Array): number {
  let sum = 0
  for (let i = 0; i < SIG_CELLS; i += 1) sum += Math.abs(a[i] - b[i])
  return sum
}

function withCoefficient(def: AttractorDef, index: number, value: number): AttractorDef {
  const poly = new Float64Array(def.poly!)
  poly[index] = value
  return { ...def, poly }
}

/**
 * 从 30 个随机系数里挑出「对形状影响最大」的 3 个，暴露成自由探索滑杆：
 * 逐个扰动 +δ，用占据直方图距离衡量形状变化（对混沌稳健），扰动后
 * 发散的系数记最大分。入选的系数再从默认值向外扫描存活区间——滑杆
 * 整个行程都是活的，不会拧到一半看着光点飞散。同一种子结果完全确定，
 * 分享链接才能复原。
 */
export function attachSensitiveParams(def: AttractorDef): AttractorDef {
  if (!def.poly) return def
  const ref = shapeSignature(def, null)
  if (!ref) return def
  const scores: Array<{ index: number; score: number }> = []
  for (let i = 0; i < 30; i += 1) {
    const perturbed = shapeSignature(withCoefficient(def, i, def.poly[i] + 0.12), ref.frame)
    scores.push({ index: i, score: perturbed ? signatureDistance(perturbed.sig, ref.sig) : 2 })
  }
  scores.sort((a, b) => b.score - a.score)

  // 从默认值向外逐格试跑，找出仍然存活的系数区间（两侧至少各活一格，
  // 否则滑杆的默认位置顶在死区边缘，一碰就拒，手感是坏的）。
  const RANGE = 0.4
  const STEP = 0.02
  const scan = (index: number, dir: 1 | -1): number => {
    const c = def.poly![index]
    let last = c
    for (let k = 1; k <= RANGE / STEP; k += 1) {
      const v = c + dir * k * STEP
      if (v < -1.8 || v > 1.8) break
      if (!survives(withCoefficient(def, index, v), def.seed)) break
      last = v
    }
    return last
  }
  const picked: Array<{ index: number; min: number; max: number }> = []
  for (let rank = 0; rank < scores.length && picked.length < 3 && rank <= 12; rank += 1) {
    const index = scores[rank].index
    const c = def.poly![index]
    const lo = scan(index, -1)
    const hi = scan(index, 1)
    if (lo > c - STEP || hi < c + STEP) continue
    picked.push({
      index,
      // 直接用最后一次实测存活的取值（0.02 是步长 0.005 的整数倍，滑杆网格对齐）
      min: lo,
      max: hi,
    })
  }
  picked.sort((a, b) => a.index - b.index)
  if (picked.length === 0) return def

  const params: Record<string, number> = {}
  const paramDefs: Array<AttractorParam> = picked.map(({ index, min, max }) => {
    const c = def.poly![index]
    const key = `c${index}`
    params[key] = c
    const term = POLY_TERMS[index % 10] || '1'
    return {
      key,
      label: `${LHS_MARKS[Math.floor(index / 10)]}·${term}`,
      min,
      max,
      step: 0.005,
      default: c,
    }
  })
  return { ...def, params, paramDefs }
}

/**
 * 应用一次参数调整。经典系统只改 params；随机系统同步改写多项式系数，
   并重算展示方程（「看懂它」面板里的配方实时反映拧过的参数）。
 */
export function withParam(def: AttractorDef, key: string, value: number): AttractorDef {
  if (!def.params || !def.paramDefs) return def
  const params = { ...def.params, [key]: value }
  if (!def.poly || !key.startsWith('c')) return { ...def, params }
  const index = Number(key.slice(1))
  if (!Number.isInteger(index) || index < 0 || index >= 30) return { ...def, params }
  const poly = new Float64Array(def.poly)
  poly[index] = value
  return {
    ...def,
    params,
    poly,
    equations: [
      formatPolyEquation(poly, 0, LHS_MARKS[0]),
      formatPolyEquation(poly, 10, LHS_MARKS[1]),
      formatPolyEquation(poly, 20, LHS_MARKS[2]),
    ],
  }
}

/**
 * 从 from 出发快速试跑，检验新参数下轨迹是否仍然活着。
 * 随机系统拧系数很容易飞出吸引域——二次场一旦发散就是爆炸式的，
 * 1500 步足够看出来；组件用它做「橡皮筋」回弹。
 */
export function survives(def: AttractorDef, from: Vec3, steps = 1500): boolean {
  const p = cloneVec(from)
  for (let i = 0; i < steps; i += 1) {
    rk4Step(def, p, def.dt)
    if (!isFiniteState(p, 1e3)) return false
  }
  return true
}

/* ============================================================
   分享链接：把当前系统（含拧过的参数）编码进 URL
   ============================================================ */

/**
 * 序列化当前系统为查询串（不含 ?）。
 * 经典系统：attractor=<id>，参数被拧离默认值时附 p=key:value,…
 * 随机系统：seed=<n>（确定性复原 30 个系数），拧过敏感系数时附 adj=index:value,…
 */
export function buildShareQuery(def: AttractorDef): string {
  if (def.id === 'custom' && def.seedNumber !== undefined) {
    let query = `seed=${def.seedNumber}`
    if (def.poly && def.params && def.paramDefs) {
      const adj = def.paramDefs
        .filter((pd) => Math.abs(def.params![pd.key] - pd.default) > pd.step / 2)
        .map((pd) => `${pd.key.slice(1)}:${Number(def.params![pd.key].toFixed(3))}`)
      if (adj.length > 0) query += `&adj=${adj.join(',')}`
    }
    return query
  }
  let query = `attractor=${def.id}`
  if (def.paramDefs && def.params && paramsModified(def)) {
    const p = def.paramDefs
      .filter((pd) => Math.abs(def.params![pd.key] - pd.default) > pd.step / 2)
      .map((pd) => `${pd.key}:${Number(def.params![pd.key].toFixed(4))}`)
    query += `&p=${p.join(',')}`
  }
  return query
}

/** 从 URL 查询串还原系统；无效输入回退到默认洛伦兹。 */
export function resolveShareDef(search: URLSearchParams): AttractorDef {
  const seedRaw = search.get('seed')
  const seedParam = seedRaw === null || seedRaw.trim() === '' ? NaN : Number(seedRaw)
  if (Number.isInteger(seedParam) && seedParam >= 0 && seedParam <= 9999) {
    const generated = generateCustomAttractor(seedParam)
    if (generated) {
      const adjRaw = search.get('adj')
      if (!adjRaw || !generated.poly) return generated
      const poly = new Float64Array(generated.poly)
      const params = generated.params ? { ...generated.params } : undefined
      for (const pair of adjRaw.split(',')) {
        const [iRaw, vRaw] = pair.split(':')
        const index = Number(iRaw)
        const value = Number(vRaw)
        if (!Number.isInteger(index) || index < 0 || index >= 30 || !Number.isFinite(value)) continue
        const clamped = Math.min(2, Math.max(-2, value))
        poly[index] = clamped
        const key = `c${index}`
        if (params && key in params) params[key] = clamped
      }
      return {
        ...generated,
        poly,
        params,
        equations: [
          formatPolyEquation(poly, 0, LHS_MARKS[0]),
          formatPolyEquation(poly, 10, LHS_MARKS[1]),
          formatPolyEquation(poly, 20, LHS_MARKS[2]),
        ],
      }
    }
  }
  const q = search.get('attractor')
  const base = ATTRACTOR_ORDER.includes(q as AttractorId) ? ATTRACTORS[q as AttractorId] : ATTRACTORS.lorenz
  const pRaw = search.get('p')
  if (!pRaw || !base.paramDefs || !base.params) return base
  const params = { ...base.params }
  for (const pair of pRaw.split(',')) {
    const [key, vRaw] = pair.split(':')
    const value = Number(vRaw)
    const pd = base.paramDefs.find((d) => d.key === key)
    if (pd && Number.isFinite(value)) params[key] = Math.min(pd.max, Math.max(pd.min, value))
  }
  return { ...base, params }
}
