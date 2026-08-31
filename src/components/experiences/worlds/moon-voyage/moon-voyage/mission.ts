/**
 * moon-voyage 任务轨道力学。
 *
 * 真实常数 + 剧本化分段圆锥曲线（预计算解析求值，不做实时积分）：
 *   发射台 → 程序化上升剖面 → 190 km 停泊圆轨道 → TLI → 转移椭圆（开普勒方程
 *   数值求解半长轴，使椭圆段飞行时间 = 73 h − 月心接近段）→ 月球影响球边缘
 *   混合到月心双曲线 → 月球背面 LOI 刹车 → 110×314 km 月心椭圆 → 圆化到 110 km。
 *
 * 坐标：地心惯性系，任务平面 = 月球轨道面（对黄道倾角 5.14° 全部施加在同一个
 * 平面→世界旋转里，简化掉真实停泊轨道的 28.5° 倾角——见目录 sources 的模型边界）。
 * 单位：km、秒；场景侧再除以 KM_PER_UNIT。
 */

export const MU_E = 398600.4418 // km³/s²
export const MU_M = 4902.8 // km³/s²
export const R_E = 6371 // km
export const R_M = 1737.4 // km
export const MOON_ORBIT_R = 384400 // km（圆轨道近似）
export const MOON_PERIOD_S = 27.321661 * 86400 // s
export const OMEGA_M = (2 * Math.PI) / MOON_PERIOD_S // 月球轨道角速度 rad/s
export const KM_PER_UNIT = 100 // 1 场景单位 = 100 km
export const PLANE_TILT = (5.14 * Math.PI) / 180

export type MissionPhase =
  | 'pad'
  | 'ascent'
  | 'orbit'
  | 'tli'
  | 'coast'
  | 'approach'
  | 'loi'
  | 'lunar'

export type BurnKind = 'none' | 'launch' | 'stage2' | 'tli' | 'loi' | 'puff'

export type MissionEventId =
  | 'ignition'
  | 'maxq'
  | 's1-sep'
  | 's2-sep'
  | 'insertion'
  | 'tli-start'
  | 'tli-end'
  | 's4b-sep'
  | 'midcourse'
  | 'equigrav'
  | 'soi'
  | 'loi-start'
  | 'loi-end'
  | 'circ'
  | 'stable'

export type MissionEvent = { id: MissionEventId; t: number; label: string }

export type MissionSample = {
  t: number
  phase: MissionPhase
  /** 世界坐标（地心惯性系，km，已含轨道面倾角） */
  pos: [number, number, number]
  /** 地心惯性速度 km/s（解析或数值微分） */
  vel: [number, number, number]
  /** HUD 速度：近地段为地心系速度，月心段为相对月球速度 km/s */
  speedKms: number
  /** 主导天体表面高度 km（近地/近月段有意义） */
  altKm: number
  distEarthKm: number
  distMoonKm: number
  moonPos: [number, number, number]
  /** 还连在船上的最底一级：3 = S-IC 在，2 = S-II 在，1 = S-IVB 在，0 = 仅 CSM */
  stage: 0 | 1 | 2 | 3
  burn: BurnKind
  nearBody: 'earth' | 'moon'
}

type Vec3 = [number, number, number]

// ---------------------------------------------------------------------------
// 基础工具

const DEG = Math.PI / 180

function solveKeplerElliptic(M: number, e: number): number {
  // f(E) = E − e·sinE − M 在 [0, 2π) 严格单调递增，有唯一根。
  // 高偏心率时 E₀ = π 才能保证牛顿法收敛（E₀ = M 会 overshoot 到错误分支）。
  let E = e > 0.8 ? Math.PI : M
  let converged = false
  for (let i = 0; i < 12; i++) {
    const f = E - e * Math.sin(E) - M
    E -= f / (1 - e * Math.cos(E))
    if (Math.abs(E - e * Math.sin(E) - M) < 1e-12) {
      converged = true
      break
    }
  }
  if (!converged) {
    // 兜底二分（单调函数，必收敛）
    let lo = 0
    let hi = 2 * Math.PI
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (mid - e * Math.sin(mid) - M < 0) lo = mid
      else hi = mid
    }
    E = (lo + hi) / 2
  }
  return E
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function vAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function vSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vLen(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2])
}

function vScale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s]
}

/** 任务平面 → 世界：绕 X 轴（交点线）旋转 5.14° */
function planeToWorld(p: Vec3): Vec3 {
  const c = Math.cos(PLANE_TILT)
  const s = Math.sin(PLANE_TILT)
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
}

function circlePos(r: number, theta: number): Vec3 {
  return [r * Math.cos(theta), 0, r * Math.sin(theta)]
}

// ---------------------------------------------------------------------------
// 任务时间线常数（GET 秒，Apollo 量级）

export const T_LIFTOFF = 0
export const T_MAXQ = 78
export const T_S1_SEP = 161
export const T_S2_SEP = 550
export const T_INSERTION = 702 // 进入 190 km 圆轨道
export const T_TLI_START = 10000
export const T_TLI_END = 10360 // TLI 燃烧 6 min
export const T_S4B_SEP = T_TLI_END + 1500 // CSM 与 S-IVB 分离
export const T_MIDCOURSE = T_TLI_END + 108000 // TLI 后 30 h 中途修正
export const T_LOI_BURN_S = 360
export const T_CIRC_BURN_S = 30

// 停泊轨道
export const PARK_ALT_KM = 190
export const PARK_R = R_E + PARK_ALT_KM // 6561 km
export const V_PARK = Math.sqrt(MU_E / PARK_R) // ≈ 7.793 km/s
const N_PARK = Math.sqrt(MU_E / PARK_R ** 3)

// 月心段
export const LUNAR_PERI_ALT = 110
export const LUNAR_APO_ALT = 314
export const RP_LUNAR = R_M + LUNAR_PERI_ALT // 1847.4 km
export const RA_LUNAR = R_M + LUNAR_APO_ALT // 2051.4 km
const A_LUNAR = (RP_LUNAR + RA_LUNAR) / 2
const E_LUNAR = 1 - RP_LUNAR / A_LUNAR
const T_LUNAR_ELLIPSE = 2 * Math.PI * Math.sqrt(A_LUNAR ** 3 / MU_M)
const N_LUNAR_CIRCLE = Math.sqrt(MU_M / RP_LUNAR ** 3)

// 月心双曲线接近段
export const APPROACH_VINF = 0.85 // km/s，Apollo 量级
const A_HYP = MU_M / APPROACH_VINF ** 2
const E_HYP = 1 + RP_LUNAR / A_HYP
const P_HYP = A_HYP * (E_HYP * E_HYP - 1)
const APPROACH_R0 = 25000 // km，进入月球影响球（脚本化选取）

function hyperbolaTimeFromPerigee(nu: number): number {
  // ν < 0 接近段
  const tanhF2 = Math.sqrt((E_HYP - 1) / (E_HYP + 1)) * Math.tan(nu / 2)
  const F = 2 * Math.atanh(Math.max(-0.999999, Math.min(0.999999, tanhF2)))
  return Math.sqrt(A_HYP ** 3 / MU_M) * (E_HYP * Math.sinh(F) - F)
}

function hyperbolaNuAtTime(tau: number): number {
  // 牛顿法解 e·sinhF − F = tau / sqrt(a³/μ)
  const target = tau / Math.sqrt(A_HYP ** 3 / MU_M)
  let F =
    Math.abs(target) > 3
      ? Math.sign(target) * Math.log((2 * Math.abs(target)) / E_HYP + 1)
      : Math.asinh(target / E_HYP)
  for (let i = 0; i < 12; i++) {
    const f = E_HYP * Math.sinh(F) - F - target
    const fp = E_HYP * Math.cosh(F) - 1
    F -= f / fp
  }
  return 2 * Math.atan(Math.sqrt((E_HYP + 1) / (E_HYP - 1)) * Math.tanh(F / 2))
}

function hyperbolaRadius(nu: number): number {
  return P_HYP / (1 + E_HYP * Math.cos(nu))
}

const NU_APPROACH0 = -Math.acos(
  Math.min(1, Math.max(-1, (P_HYP / APPROACH_R0 - 1) / E_HYP)),
)
/** 从 APPROACH_R0 到近月点的真实双曲线飞行时间 */
export const APPROACH_DURATION = -hyperbolaTimeFromPerigee(NU_APPROACH0)

// ---------------------------------------------------------------------------
// 转移椭圆：解半长轴 a，使近地点 → r = 384400 km 的飞行时间 = 73 h − 接近段

export const TLI_TO_LOI_S = 73 * 3600 // TLI 关机 → LOI 的总时间（与 Apollo 11 一致）
export const COAST_TARGET_S = TLI_TO_LOI_S - APPROACH_DURATION

function ellipseTimeToRadius(a: number, targetR: number): number {
  const e = 1 - PARK_R / a
  const p = a * (1 - e * e)
  const cosNu = Math.min(1, Math.max(-1, (p / targetR - 1) / e))
  const nu = Math.acos(cosNu) // 出航段 0..π
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2))
  return Math.sqrt(a ** 3 / MU_E) * (E - e * Math.sin(E))
}

function solveTransferA(): number {
  // 飞行时间随 a 单调递减（霍曼下限 ≈ 119.5 h → 大 a 更短），二分求 COAST_TARGET_S
  let lo = (MOON_ORBIT_R + PARK_R) / 2 + 1 // 霍曼下限
  let hi = 1_500_000
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (ellipseTimeToRadius(mid, MOON_ORBIT_R) > COAST_TARGET_S) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export const TRANSFER_A = solveTransferA()
const TRANSFER_E = 1 - PARK_R / TRANSFER_A
const TRANSFER_P = TRANSFER_A * (1 - TRANSFER_E * TRANSFER_E)
const N_TRANSFER = Math.sqrt(MU_E / TRANSFER_A ** 3)
export const V_TLI = Math.sqrt(MU_E * (2 / PARK_R - 1 / TRANSFER_A)) // ≈ 10.97 km/s

/** 到达月球轨道半径时的真近点角 */
const NU_ARRIVAL = Math.acos(
  Math.min(1, Math.max(-1, (TRANSFER_P / MOON_ORBIT_R - 1) / TRANSFER_E)),
)

function transferNuAtTime(tau: number): number {
  const M = N_TRANSFER * tau
  const E = solveKeplerElliptic(M % (2 * Math.PI), TRANSFER_E)
  return 2 * Math.atan(Math.sqrt((1 + TRANSFER_E) / (1 - TRANSFER_E)) * Math.tan(E / 2))
}

function transferRadius(nu: number): number {
  return TRANSFER_P / (1 + TRANSFER_E * Math.cos(nu))
}

// ---------------------------------------------------------------------------
// 上升段剖面（程序化：高度 + 下程角，锚定真实 Saturn V 关键点）

const ASCENT_H_KEYS: Array<[number, number]> = [
  [0, 0],
  [12, 0.14], // 塔架清空
  [80, 13.5], // max-q 高度量级
  [T_S1_SEP, 68],
  [T_S2_SEP, 182],
  [T_INSERTION, PARK_ALT_KM],
]
const ASCENT_DOWNRANGE_DEG = 28 // 入轨点下程角

function ascentAltitude(t: number): number {
  // 单调分段三次（Hermite，端点切线有限差分，末端切线 ≈ 0）
  const keys = ASCENT_H_KEYS
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, h0] = keys[i]
    const [t1, h1] = keys[i + 1]
    if (t > t1) continue
    const dt = t1 - t0
    const m0 =
      i === 0
        ? (h1 - h0) / dt
        : (h1 - keys[i - 1][1]) / (t1 - keys[i - 1][0])
    const m1 =
      i + 1 >= keys.length - 1
        ? 0 // 入轨时垂直速度 ≈ 0
        : (keys[i + 2][1] - h0) / (keys[i + 2][0] - t0)
    const u = (t - t0) / dt
    const u2 = u * u
    const u3 = u2 * u
    return (
      (2 * u3 - 3 * u2 + 1) * h0 +
      (u3 - 2 * u2 + u) * dt * m0 +
      (-2 * u3 + 3 * u2) * h1 +
      (u3 - u2) * dt * m1
    )
  }
  return keys[keys.length - 1][1]
}

function ascentTheta(t: number): number {
  // 下程角：θ(0)=θ'(0)=0（垂直起飞，重力转向自然出现），
  // 入轨时角速度连续接停泊轨道角速度 N_PARK（θ(t) = total·(a·u² + b·u³)）
  const u = Math.min(1, Math.max(0, t / T_INSERTION))
  const total = ASCENT_DOWNRANGE_DEG * DEG
  const endSlope = (N_PARK * T_INSERTION) / total // 2a + 3b
  const b = endSlope - 2
  const a = 1 - b
  return total * (a * u * u + b * u * u * u)
}

// ---------------------------------------------------------------------------
// 派生时间线与月球相位

export const T_COAST_END = T_TLI_END + COAST_TARGET_S // 到达 r=384400（进入影响球）
export const T_LOI_START = T_COAST_END + APPROACH_DURATION
export const T_LOI_END = T_LOI_START + T_LOI_BURN_S
export const T_CIRC = T_LOI_END + 2 * T_LUNAR_ELLIPSE
export const T_STABLE = T_CIRC + T_CIRC_BURN_S

// 上升段起点（发射台）：任务平面内 θ=0 处（位于交点线上，世界坐标 = (R_E,0,0)）
const PAD_THETA = 0
// 入轨点角 = 下程角；TLI 近地点角 = 入轨点 + 停泊轨道转过角
const THETA_INSERTION = PAD_THETA + ASCENT_DOWNRANGE_DEG * DEG
const THETA_PERIGEE = THETA_INSERTION + N_PARK * (T_TLI_END - T_INSERTION)
// 到达点（进入影响球）地心角
const ALPHA_ARRIVAL = THETA_PERIGEE + NU_ARRIVAL
// 月球相位：到达时月球在飞船前方 δ（对应 25000 km 月距）
const DELTA_SOI = 2 * Math.asin(APPROACH_R0 / (2 * MOON_ORBIT_R))
const MOON_THETA0 = ALPHA_ARRIVAL + DELTA_SOI - OMEGA_M * T_COAST_END

export function moonAngle(t: number): number {
  return MOON_THETA0 + OMEGA_M * t
}

export function moonPosKm(t: number): Vec3 {
  return planeToWorld(circlePos(MOON_ORBIT_R, moonAngle(t)))
}

// 近月点方向：月球背面偏晨昏线一侧（距远侧中心约 54°，仍在地球不可见的背面），
// 与太阳几何配合使 LOI/绕月段可见月面约八成被照亮——Apollo LOI 正是在背面晨昏线附近。
const PHI_PERILUNE = moonAngle(T_LOI_START) - 54.5 * DEG

// 地月引力平衡点（距地）：μ_E/r² = μ_M/(D−r)²
export const EQUIGRAV_R = MOON_ORBIT_R / (1 + Math.sqrt(MU_M / MU_E))

function solveEquigravTime(): number {
  let lo = 0
  let hi = COAST_TARGET_S
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (transferRadius(transferNuAtTime(mid)) < EQUIGRAV_R) lo = mid
    else hi = mid
  }
  return T_TLI_END + (lo + hi) / 2
}
export const T_EQUIGRAV = solveEquigravTime()

export const MISSION_EVENTS: Array<MissionEvent> = [
  { id: 'ignition', t: T_LIFTOFF, label: '点火' },
  { id: 'maxq', t: T_MAXQ, label: '最大动压' },
  { id: 's1-sep', t: T_S1_SEP, label: '一级分离' },
  { id: 's2-sep', t: T_S2_SEP, label: '二级分离' },
  { id: 'insertion', t: T_INSERTION, label: '进入地球轨道' },
  { id: 'tli-start', t: T_TLI_START, label: 'TLI 点火' },
  { id: 'tli-end', t: T_TLI_END, label: 'TLI 关机' },
  { id: 's4b-sep', t: T_S4B_SEP, label: 'S-IVB 分离' },
  { id: 'midcourse', t: T_MIDCOURSE, label: '中途修正' },
  { id: 'equigrav', t: T_EQUIGRAV, label: '地月引力平衡点' },
  { id: 'soi', t: T_COAST_END, label: '进入月球影响球' },
  { id: 'loi-start', t: T_LOI_START, label: 'LOI 点火' },
  { id: 'loi-end', t: T_LOI_END, label: '进入环月轨道' },
  { id: 'circ', t: T_CIRC, label: '圆化燃烧' },
  { id: 'stable', t: T_STABLE, label: '稳定环月轨道' },
]

export function phaseAt(t: number): MissionPhase {
  if (t < T_LIFTOFF) return 'pad'
  if (t < T_INSERTION) return 'ascent'
  if (t < T_TLI_START) return 'orbit'
  if (t < T_TLI_END) return 'tli'
  if (t < T_COAST_END) return 'coast'
  if (t < T_LOI_START) return 'approach'
  if (t < T_LOI_END) return 'loi'
  return 'lunar'
}

// ---------------------------------------------------------------------------
// 位置求值（任务平面，未加倾角）

const BLEND_SOI_S = 4800 // 转移椭圆 → 月心双曲线的混合窗（秒）
const BLEND_LOI_S = T_LOI_BURN_S // LOI 燃烧期双曲线 → 月心椭圆混合

function ascentPosPlane(t: number): Vec3 {
  const h = Math.max(0, ascentAltitude(t))
  const theta = PAD_THETA + ascentTheta(t)
  return circlePos(R_E + h, theta)
}

function parkPosPlane(t: number): Vec3 {
  return circlePos(PARK_R, THETA_INSERTION + N_PARK * (t - T_INSERTION))
}

function transferPosPlane(t: number): Vec3 {
  const nu = transferNuAtTime(t - T_TLI_END)
  return circlePos(transferRadius(nu), THETA_PERIGEE + nu)
}

function hyperbolaRelPlane(t: number): Vec3 {
  const nu = hyperbolaNuAtTime(t - T_LOI_START)
  return circlePos(hyperbolaRadius(nu), PHI_PERILUNE + nu)
}

function lunarEllipseRelPlane(t: number): Vec3 {
  const M = ((2 * Math.PI) / T_LUNAR_ELLIPSE) * (t - T_LOI_END)
  const E = solveKeplerElliptic(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), E_LUNAR)
  const nu = 2 * Math.atan(Math.sqrt((1 + E_LUNAR) / (1 - E_LUNAR)) * Math.tan(E / 2))
  const r = A_LUNAR * (1 - E_LUNAR * Math.cos(E))
  return circlePos(r, PHI_PERILUNE + nu)
}

function lunarCircleRelPlane(t: number): Vec3 {
  return circlePos(RP_LUNAR, PHI_PERILUNE + N_LUNAR_CIRCLE * (t - T_STABLE))
}

function moonPosPlane(t: number): Vec3 {
  return circlePos(MOON_ORBIT_R, moonAngle(t))
}

/** 月心段合成：月球地心位置 + 月心相对位置 */
function moonCentricPosPlane(t: number, rel: Vec3): Vec3 {
  return vAdd(moonPosPlane(t), rel)
}

/** 全程位置（任务平面坐标，km） */
function posPlaneAt(t: number): Vec3 {
  if (t < T_LIFTOFF) return circlePos(R_E, PAD_THETA)
  if (t < T_INSERTION) return ascentPosPlane(t)
  if (t < T_TLI_END) return parkPosPlane(t) // TLI 燃烧期间位置≈仍在圆轨道，关机即椭圆近地点

  if (t < T_COAST_END + BLEND_SOI_S) {
    // 转移椭圆 → 月心双曲线混合
    const w = smooth01((t - (T_COAST_END - BLEND_SOI_S)) / (2 * BLEND_SOI_S))
    if (w <= 0) return transferPosPlane(t)
    const a = transferPosPlane(t)
    const b = moonCentricPosPlane(t, hyperbolaRelPlane(t))
    if (w >= 1) return b
    return lerp3(a, b, w)
  }

  if (t < T_LOI_END) {
    const hyp = moonCentricPosPlane(t, hyperbolaRelPlane(t))
    if (t <= T_LOI_START) return hyp
    const w = smooth01((t - T_LOI_START) / BLEND_LOI_S)
    const ell = moonCentricPosPlane(t, lunarEllipseRelPlane(t))
    return lerp3(hyp, ell, w)
  }

  if (t < T_CIRC + T_CIRC_BURN_S) {
    const ell = moonCentricPosPlane(t, lunarEllipseRelPlane(t))
    if (t <= T_CIRC) return ell
    const w = smooth01((t - T_CIRC) / T_CIRC_BURN_S)
    const cir = moonCentricPosPlane(t, lunarCircleRelPlane(t))
    return lerp3(ell, cir, w)
  }

  return moonCentricPosPlane(t, lunarCircleRelPlane(t))
}

// ---------------------------------------------------------------------------
// HUD 速度（主导天体参考系，解析）

function ascentSpeed(t: number): number {
  // 位置数值微分（上升剖面是 Hermite 样条，微分便宜且足够准）
  const dt = 0.5
  const a = posPlaneAt(Math.max(T_LIFTOFF, t - dt))
  const b = posPlaneAt(Math.min(T_INSERTION, t + dt))
  const span = Math.min(T_INSERTION, t + dt) - Math.max(T_LIFTOFF, t - dt)
  return vLen(vScale(vSub(b, a), 1 / Math.max(span, 1e-6)))
}

function transferSpeed(t: number): number {
  const r = vLen(transferPosPlane(t))
  return Math.sqrt(MU_E * (2 / r - 1 / TRANSFER_A))
}

function hyperbolaSpeed(t: number): number {
  const r = vLen(hyperbolaRelPlane(t))
  return Math.sqrt(APPROACH_VINF ** 2 + (2 * MU_M) / r)
}

function lunarEllipseSpeed(t: number): number {
  const r = vLen(lunarEllipseRelPlane(t))
  return Math.sqrt(MU_M * (2 / r - 1 / A_LUNAR))
}

function displaySpeed(t: number): number {
  if (t < T_LIFTOFF) return 0
  if (t < T_INSERTION) return ascentSpeed(t)
  if (t < T_TLI_START) return V_PARK
  if (t < T_TLI_END) return lerp(V_PARK, V_TLI, (t - T_TLI_START) / (T_TLI_END - T_TLI_START))
  if (t < T_COAST_END - BLEND_SOI_S) return transferSpeed(t)
  if (t < T_COAST_END + BLEND_SOI_S) {
    const w = smooth01((t - (T_COAST_END - BLEND_SOI_S)) / (2 * BLEND_SOI_S))
    return lerp(transferSpeed(t), hyperbolaSpeed(t), w)
  }
  if (t < T_LOI_START) return hyperbolaSpeed(t)
  if (t < T_LOI_END) {
    const w = smooth01((t - T_LOI_START) / T_LOI_BURN_S)
    return lerp(hyperbolaSpeed(t), lunarEllipseSpeed(t), w)
  }
  if (t < T_CIRC) return lunarEllipseSpeed(t)
  if (t < T_STABLE) {
    const w = smooth01((t - T_CIRC) / T_CIRC_BURN_S)
    return lerp(lunarEllipseSpeed(t), Math.sqrt(MU_M / RP_LUNAR), w)
  }
  return Math.sqrt(MU_M / RP_LUNAR)
}

function burnAt(t: number): BurnKind {
  if (t >= T_LIFTOFF && t < T_S1_SEP) return 'launch'
  if (t >= T_S1_SEP && t < T_S2_SEP) return 'stage2'
  if (t >= T_TLI_START && t < T_TLI_END) return 'tli'
  if (t >= T_MIDCOURSE - 20 && t <= T_MIDCOURSE + 20) return 'puff'
  if (t >= T_LOI_START && t < T_LOI_END) return 'loi'
  if (t >= T_CIRC && t < T_STABLE) return 'puff'
  return 'none'
}

function stageAt(t: number): 0 | 1 | 2 | 3 {
  if (t < T_S1_SEP) return 3
  if (t < T_S2_SEP) return 2
  if (t < T_S4B_SEP) return 1
  return 0
}

export function sampleMission(t: number): MissionSample {
  const posPlane = posPlaneAt(t)
  const pos = planeToWorld(posPlane)
  const moonPos = moonPosKm(t)
  // 地心惯性速度：数值微分（ε 远小于任何一段的特征时间）
  const eps = t < T_INSERTION ? 0.25 : 2
  const v0 = planeToWorld(posPlaneAt(t - eps))
  const v1 = planeToWorld(posPlaneAt(t + eps))
  const vel = vScale(vSub(v1, v0), 1 / (2 * eps))
  const distEarth = vLen(pos)
  const distMoon = vLen(vSub(pos, moonPos))
  const nearBody = distEarth - R_E < distMoon - R_M ? 'earth' : 'moon'
  const alt = nearBody === 'earth' ? distEarth - R_E : distMoon - R_M
  return {
    t,
    phase: phaseAt(t),
    pos,
    vel,
    speedKms: displaySpeed(t),
    altKm: alt,
    distEarthKm: distEarth,
    distMoonKm: distMoon,
    moonPos,
    stage: stageAt(t),
    burn: burnAt(t),
    nearBody,
  }
}

// ---------------------------------------------------------------------------
// 轨迹预采样（渲染用；每点附带 GET 时间用于已飞/未飞着色）

export function sampleTrajectory(): { points: Float32Array; times: Float32Array } {
  const segments: Array<[number, number, number]> = [
    [T_LIFTOFF, T_INSERTION, 420],
    [T_INSERTION, T_TLI_END, 320],
    [T_TLI_END, T_COAST_END, 420],
    [T_COAST_END, T_LOI_END, 900],
    [T_LOI_END, T_CIRC + T_CIRC_BURN_S, 700],
    [T_CIRC + T_CIRC_BURN_S, T_STABLE + (2 * Math.PI) / N_LUNAR_CIRCLE, 500],
  ]
  const total = segments.reduce((sum, s) => sum + s[2], 0)
  const points = new Float32Array(total * 3)
  const times = new Float32Array(total)
  let k = 0
  for (const [t0, t1, n] of segments) {
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / (n - 1)
      const p = posPlaneAt(t)
      const w = planeToWorld(p)
      points[k * 3] = w[0] / KM_PER_UNIT
      points[k * 3 + 1] = w[1] / KM_PER_UNIT
      points[k * 3 + 2] = w[2] / KM_PER_UNIT
      times[k] = t
      k++
    }
  }
  return { points, times }
}

export { planeToWorld }
