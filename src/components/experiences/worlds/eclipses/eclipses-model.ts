import * as THREE from 'three'

/*
 * 食 · 几何模型
 * ==========================================================================
 * 长度单位 = 1 个地球半径 R⊕（6371 km）。地月系统按真实比例建模，
 * 太阳只压缩「画出来的位置」，不压缩它的角直径与由此决定的影锥几何。
 *
 * 这样做的关键回报：教科书插图里被画错的三件事，在这里会自己长出来——
 *
 *   1. 月球本影长约 58.7 R⊕，而月地距离在 56.0 – 63.8 R⊕ 之间摆动。
 *      影锥尖端刚好落在地球附近：近地点时锥尖够得到 → 日全食；
 *      远地点时锥尖悬在地球上空 → 日环食。不需要人为设定「模式」。
 *   2. 月球半影落到地面上有 ~3500 km 宽，本影只有 ~110 km。
 *      「全食带只有窄窄一条」是算出来的，不是画上去的。
 *   3. 交点线相对太阳方向的回归周期 = 食年 346.62 天，
 *      于是每年只有两段很窄的「食季」；其余朔望影锥从地球上下方擦过。
 *
 * 时间单位 = 天。月球沿轨道的角度用交点月（27.21222 d）推进，
 * 交点线按食年退行，两者之差自然给出朔望月 29.5306 d。
 */

/* ---------------------------------------------------------------- */
/* 真实常数（IAU / NASA 数值，换算成 R⊕）                              */
/* ---------------------------------------------------------------- */

export const R_EARTH = 1
export const R_MOON = 1737.4 / 6371.0 // 0.27270
export const R_SUN = 696_000 / 6371.0 // 109.245
export const D_SUN = 149_597_870.7 / 6371.0 // 23481.1
export const KM_PER_UNIT = 6371.0

/** 月地距离范围：真实近地点 356 500 km ～ 远地点 406 700 km */
export const D_MOON_MIN = 356_500 / 6371.0 // 55.96
export const D_MOON_MAX = 406_700 / 6371.0 // 63.84
export const D_MOON_MEAN = 384_400 / 6371.0 // 60.34

export const INCLINATION = THREE.MathUtils.degToRad(5.145)
export const DRACONIC_MONTH = 27.21222
export const ECLIPSE_YEAR = 346.6201
export const SYNODIC_MONTH = 29.530589
export const YEAR_SPAN = 365.25
/** 交点线离日地连线近到这个角度以内，才算进入食季（与 NASA 食限同量级） */
export const SEASON_LIMIT_DEG = 15

/** 太阳固定在 −X 无穷远处，阳光沿 +X 传播；地球在原点 */
export const SUN_POS = new THREE.Vector3(-D_SUN, 0, 0)
export const SUN_DIR = new THREE.Vector3(-1, 0, 0) // 地心 → 太阳
export const SHADOW_AXIS = new THREE.Vector3(1, 0, 0) // 地影轴（背日）

/** 半径为 R 的天体，本影锥长度 */
export function umbraLength(radius: number) {
  return (radius * D_SUN) / (R_SUN - radius)
}
export const EARTH_UMBRA_LEN = umbraLength(R_EARTH) // ≈ 216.9
export const MOON_UMBRA_MEAN = umbraLength(R_MOON) // ≈ 58.74

/** 沿影轴走 d 之后的本影半径（负值 = 已经过锥尖） */
function umbraRadiusAt(radius: number, d: number) {
  return radius - (d * (R_SUN - radius)) / D_SUN
}
/** 沿影轴走 d 之后的半影半径 */
function penumbraRadiusAt(radius: number, d: number) {
  return radius + (d * (R_SUN + radius)) / D_SUN
}

const t0Node = Math.PI // t=0 时交点线指向太阳 → 食季
const t0Arg = 0 // t=0 时月球正在交点上 → 新月 + 交点 = 中心日食

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const smooth01 = (v: number) => {
  const t = clamp(v, 0, 1)
  return t * t * (3 - 2 * t)
}

/** 两圆（半径 R、r，圆心距 d）的重叠面积 —— 食分的几何基础 */
export function circleOverlap(R: number, r: number, d: number) {
  if (R <= 0 || r <= 0) return 0
  if (d >= R + r) return 0
  const small = Math.min(R, r)
  const big = Math.max(R, r)
  if (d <= big - small) return Math.PI * small * small
  const a1 = Math.acos(clamp((d * d + R * R - r * r) / (2 * d * R), -1, 1))
  const a2 = Math.acos(clamp((d * d + r * r - R * R) / (2 * d * r), -1, 1))
  const tail = Math.sqrt(Math.max(0, (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r)))
  return Math.max(0, R * R * a1 + r * r * a2 - 0.5 * tail)
}

/* ---------------------------------------------------------------- */
/* 轨道                                                             */
/* ---------------------------------------------------------------- */

/** t=0 起 t 天后的升交点黄经（相对太阳方向退行，周期 = 食年） */
export function nodeLongitude(day: number) {
  return t0Node - (day / ECLIPSE_YEAR) * Math.PI * 2
}
/** t 天后月球距升交点的角距（周期 = 交点月） */
export function argumentOfLatitude(day: number) {
  return t0Arg + (day / DRACONIC_MONTH) * Math.PI * 2
}

/**
 * 交点线与日地连线的最小夹角（0 … π/2）。
 * 0 = 交点正对太阳，食季正中；大于食限则影子从地球南北两侧掠走。
 */
export function nodeSunOffset(day: number) {
  const node = nodeLongitude(day)
  const wrapped = Math.abs(((node % Math.PI) + Math.PI) % Math.PI)
  return Math.min(wrapped, Math.PI - wrapped)
}

/**
 * 月球的单位方向向量。
 * 黄道 = XZ 平面；轨道面绕交点线抬起 incl。
 */
export function moonDirection(arg: number, node: number, incl: number, out: THREE.Vector3) {
  const cn = Math.cos(node)
  const sn = Math.sin(node)
  const ci = Math.cos(incl)
  const si = Math.sin(incl)
  const ca = Math.cos(arg)
  const sa = Math.sin(arg)
  // n = 交点方向（黄道内）；q = 距交点 90° 的方向（抬起 incl）
  out.set(cn * ca - sn * ci * sa, si * sa, sn * ca + cn * ci * sa)
  return out.normalize()
}

/* ---------------------------------------------------------------- */
/* 状态                                                             */
/* ---------------------------------------------------------------- */

export type SimState = {
  /** 绝对时间（天），播放时单调增长 */
  day: number
  /** 月地距离（R⊕） */
  moonDist: number
  /** 天/秒 */
  speed: number
  playing: boolean
  /** 关掉倾角 → 每个朔望都有食（用于讲清「为什么不是每月都有」） */
  tilted: boolean
}

export type EclipseKind =
  | 'total-solar'
  | 'annular'
  | 'partial-solar'
  | 'total-lunar'
  | 'partial-lunar'
  | 'penumbral'
  | 'none'

export type EclipseState = {
  /* —— 位置 —— */
  moonPos: THREE.Vector3
  moonDir: THREE.Vector3
  moonDist: number
  /** 月球本影锥长度（随距离变化的只有它相对地球的够不够） */
  moonUmbraLen: number
  /** 月球影锥轴（太阳 → 月球方向） */
  moonShadowAxis: THREE.Vector3
  /** 相对太阳的真实角距（含黄纬）：0 = 三者连成一线 */
  elongation: number
  /** 只看黄经的月相角 0–2π：0 = 新月，π = 满月。倾角让 elongation 到不了 0，月相却照走。 */
  phase: number
  /** 被照亮的比例 0–1 */
  illumination: number
  /** 月球中心到黄道面的垂直距离（R⊕），正 = 黄道以北 */
  latitudeOffset: number

  /* —— 日食 —— */
  /** 观测者（地表上离影轴最近的点） */
  observer: THREE.Vector3
  sunAngRadius: number
  moonAngRadius: number
  /** 月/日角径比 —— >1 才可能全食 */
  angRatio: number
  /** 日月中心角距 */
  separation: number
  /** 天空上月心相对日心的方位角（画天空窗用） */
  posAngle: number
  /** 太阳被遮掩的面积比 0–1 */
  obscuration: number
  /** 食分（月面直径覆盖日面直径的比例） */
  magnitude: number
  /** 影轴与地心的最小距离（R⊕）；> 1 表示影轴脱靶 */
  axisMiss: number
  /** 本影是否真的落到地面 */
  umbraTouches: boolean
  /** 地面上的本影 / 半影半径（R⊕） */
  groundUmbraR: number
  groundPenumbraR: number
  /** 影斑中心（地表上，仅 shadowOnEarth 为真时有效） */
  shadowSpot: THREE.Vector3
  shadowOnEarth: boolean
  /** 平滑的全食程度（驱动天光骤暗与日冕） */
  totality: number
  /** 平滑的环食程度 */
  annularity: number

  /* —— 月食 —— */
  /** 月球沿地影轴的深度 */
  shadowDepth: number
  /** 月心到地影轴的垂距 */
  shadowOffset: number
  earthUmbraR: number
  earthPenumbraR: number
  umbralCoverage: number
  penumbralCoverage: number
  /** 月食时地影中心相对月心的方位角 */
  lunarPosAngle: number
  /** 同一视框里太阳相对月心的方位角（月相亮侧朝向） */
  lunarSunAngle: number

  /* —— 汇总 —— */
  kind: EclipseKind
  /** 当前该看太阳还是看月亮 */
  target: 'sun' | 'moon'
  /** 观测者处的日照强度 0–1（1 = 未被遮） */
  daylight: number
  /** 交点线离日地连线的夹角（弧度）；0 = 食季正中 */
  nodeSunOffset: number
  /** 交点线在食限以内 */
  inSeason: boolean
  /** 本影锥尖落在地球体内：近地点全食、远地点环食，同一次食可以两种都有 */
  tipInsideEarth: boolean
}

export function createEclipseState(): EclipseState {
  return {
    moonPos: new THREE.Vector3(),
    moonDir: new THREE.Vector3(1, 0, 0),
    moonDist: D_MOON_MEAN,
    moonUmbraLen: MOON_UMBRA_MEAN,
    moonShadowAxis: new THREE.Vector3(1, 0, 0),
    elongation: Math.PI,
    phase: Math.PI,
    illumination: 1,
    latitudeOffset: 0,
    observer: new THREE.Vector3(-1, 0, 0),
    sunAngRadius: 0.00465,
    moonAngRadius: 0.00452,
    angRatio: 0.97,
    separation: Math.PI,
    posAngle: 0,
    obscuration: 0,
    magnitude: 0,
    axisMiss: 99,
    umbraTouches: false,
    groundUmbraR: 0,
    groundPenumbraR: 0,
    shadowSpot: new THREE.Vector3(),
    shadowOnEarth: false,
    totality: 0,
    annularity: 0,
    shadowDepth: 0,
    shadowOffset: 99,
    earthUmbraR: 0,
    earthPenumbraR: 0,
    umbralCoverage: 0,
    penumbralCoverage: 0,
    lunarPosAngle: 0,
    lunarSunAngle: Math.PI,
    kind: 'none',
    target: 'sun',
    daylight: 1,
    nodeSunOffset: 0,
    inSeason: true,
    tipInsideEarth: false,
  }
}

const _dir = new THREE.Vector3()
const _axis = new THREE.Vector3()
const _foot = new THREE.Vector3()
const _toSun = new THREE.Vector3()
const _toMoon = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _delta = new THREE.Vector3()

export function computeEclipse(sim: SimState, s: EclipseState): EclipseState {
  const incl = sim.tilted ? INCLINATION : 0
  const arg = argumentOfLatitude(sim.day)
  const node = nodeLongitude(sim.day)
  const dist = sim.moonDist

  moonDirection(arg, node, incl, _dir)
  s.moonDir.copy(_dir)
  s.moonDist = dist
  s.moonPos.copy(_dir).multiplyScalar(dist)
  s.latitudeOffset = s.moonPos.y
  s.elongation = Math.acos(clamp(_dir.dot(SUN_DIR), -1, 1))
  // 月相只看黄经：太阳黄经 = π（太阳在 −X），月相 0 = 新月
  s.phase = (Math.atan2(_dir.z, _dir.x) - Math.PI + Math.PI * 4) % (Math.PI * 2)
  s.illumination = (1 - Math.cos(s.phase)) / 2
  s.moonUmbraLen = MOON_UMBRA_MEAN

  /* —— 月球影锥：轴 = 太阳 → 月球 —— */
  _axis.copy(s.moonPos).sub(SUN_POS).normalize()
  s.moonShadowAxis.copy(_axis)

  // 影轴离地心最近的点（沿轴从月球出发的参数 t）
  const tFoot = -s.moonPos.dot(_axis)
  _foot.copy(s.moonPos).addScaledVector(_axis, tFoot)
  s.axisMiss = _foot.length()

  // 观测者：影轴穿过地球时取入射点，否则取地表上离影轴最近的点
  if (s.axisMiss < R_EARTH && tFoot > 0) {
    const half = Math.sqrt(Math.max(0, R_EARTH * R_EARTH - s.axisMiss * s.axisMiss))
    s.observer.copy(s.moonPos).addScaledVector(_axis, tFoot - half)
  } else if (_foot.lengthSq() > 1e-9) {
    s.observer.copy(_foot).setLength(R_EARTH)
  } else {
    s.observer.copy(SUN_DIR).setLength(R_EARTH)
  }

  /* —— 从观测者看日月 —— */
  _toSun.copy(SUN_POS).sub(s.observer)
  const sunDist = _toSun.length()
  _toSun.divideScalar(sunDist)
  _toMoon.copy(s.moonPos).sub(s.observer)
  const moonObsDist = _toMoon.length()
  _toMoon.divideScalar(Math.max(moonObsDist, 1e-6))

  s.sunAngRadius = Math.asin(clamp(R_SUN / sunDist, 0, 1))
  s.moonAngRadius = Math.asin(clamp(R_MOON / Math.max(moonObsDist, 1e-6), 0, 1))
  s.angRatio = s.moonAngRadius / s.sunAngRadius
  s.separation = Math.acos(clamp(_toSun.dot(_toMoon), -1, 1))

  const sunArea = Math.PI * s.sunAngRadius * s.sunAngRadius
  const facingSun = _toMoon.dot(_toSun) > 0
  s.obscuration = facingSun
    ? clamp(circleOverlap(s.sunAngRadius, s.moonAngRadius, s.separation) / sunArea, 0, 1)
    : 0
  s.magnitude = facingSun
    ? clamp((s.sunAngRadius + s.moonAngRadius - s.separation) / (2 * s.sunAngRadius), 0, 2)
    : 0

  // 天空方位角：以「看向太阳」为视线，算月心相对日心的偏移方向
  _up.copy(s.observer).normalize()
  _right.crossVectors(_up, _toSun)
  if (_right.lengthSq() < 1e-9) _right.set(0, 0, 1)
  _right.normalize()
  _up.crossVectors(_toSun, _right).normalize()
  _delta.copy(_toMoon).sub(_toSun)
  s.posAngle = Math.atan2(_delta.dot(_up), _delta.dot(_right))

  /* —— 影斑：本影 / 半影落在地面上的尺寸 —— */
  const central = s.separation < Math.abs(s.moonAngRadius - s.sunAngRadius)
  s.shadowOnEarth = false
  s.umbraTouches = false
  s.groundUmbraR = 0
  s.groundPenumbraR = 0
  if (facingSun && s.obscuration > 0.001) {
    const gap = Math.max(0.01, s.observer.distanceTo(s.moonPos))
    const uR = umbraRadiusAt(R_MOON, gap)
    s.groundUmbraR = Math.max(0, uR)
    s.groundPenumbraR = penumbraRadiusAt(R_MOON, gap)
    s.umbraTouches = uR > 0 && s.axisMiss < R_EARTH + s.groundUmbraR
    s.shadowOnEarth = s.axisMiss < R_EARTH + s.groundPenumbraR
    s.shadowSpot.copy(s.observer).multiplyScalar(1 + 0.0015)
  }

  /* —— 月食：月球在地影里的位置 —— */
  s.shadowDepth = s.moonPos.x
  s.shadowOffset = Math.hypot(s.moonPos.y, s.moonPos.z)
  if (s.shadowDepth > 0) {
    s.earthUmbraR = Math.max(0, umbraRadiusAt(R_EARTH, s.shadowDepth))
    s.earthPenumbraR = penumbraRadiusAt(R_EARTH, s.shadowDepth)
    const moonArea = Math.PI * R_MOON * R_MOON
    s.umbralCoverage = clamp(circleOverlap(s.earthUmbraR, R_MOON, s.shadowOffset) / moonArea, 0, 1)
    s.penumbralCoverage = clamp(circleOverlap(s.earthPenumbraR, R_MOON, s.shadowOffset) / moonArea, 0, 1)
  } else {
    s.earthUmbraR = 0
    s.earthPenumbraR = 0
    s.umbralCoverage = 0
    s.penumbralCoverage = 0
  }

  // 月食方位角：以「看向月球」为视线，算地影中心相对月心的偏移方向
  _toMoon.copy(s.moonDir)
  _right.set(0, 1, 0).cross(_toMoon)
  if (_right.lengthSq() < 1e-9) _right.set(0, 0, 1)
  _right.normalize()
  _up.crossVectors(_toMoon, _right).normalize()
  _delta.set(0, -s.moonPos.y, -s.moonPos.z)
  s.lunarPosAngle = Math.atan2(_delta.dot(_up), _delta.dot(_right))
  // 太阳方向在同一视框里的方位角 —— 月相亮侧朝这边
  _delta.copy(SUN_POS).sub(s.moonPos).normalize()
  s.lunarSunAngle = Math.atan2(_delta.dot(_up), _delta.dot(_right))

  /* —— 分类 —— */
  // 教科书定义：月面整个落在日面之内（central）就是「中心食」，
  // 再由角径比决定是全食还是环食。环食时的面积遮掩率上限只有角径比²
  // （远地点约 0.84），所以不能用「遮住 90%」当判据。
  if (central && facingSun) s.kind = s.angRatio >= 1 ? 'total-solar' : 'annular'
  else if (s.obscuration > 0.004) s.kind = 'partial-solar'
  else if (s.umbralCoverage >= 0.999) s.kind = 'total-lunar'
  else if (s.umbralCoverage > 0.004) s.kind = 'partial-lunar'
  else if (s.penumbralCoverage > 0.04) s.kind = 'penumbral'
  else s.kind = 'none'

  // 全食 / 环食的「深度」用离第二次接触的余量衡量，而不是遮掩面积
  const soft = 0.3 * s.sunAngRadius
  s.totality =
    s.kind === 'total-solar'
      ? smooth01((s.moonAngRadius - s.sunAngRadius - s.separation) / soft)
      : 0
  s.annularity =
    s.kind === 'annular' ? smooth01((s.sunAngRadius - s.moonAngRadius - s.separation) / soft) : 0

  const solarish = s.kind === 'total-solar' || s.kind === 'annular' || s.kind === 'partial-solar'
  const lunarish = s.kind === 'total-lunar' || s.kind === 'partial-lunar' || s.kind === 'penumbral'
  s.target = solarish ? 'sun' : lunarish ? 'moon' : s.elongation < Math.PI / 2 ? 'sun' : 'moon'

  // 天光：照度 ∝ 未被遮的日面，人的亮度感觉 ≈ 照度^(1/3)
  // → 遮到 90% 天空只暗一点点，最后 1% 才骤然天黑。这一条本身就是个科普点。
  s.daylight = Math.pow(clamp(1 - s.obscuration, 0, 1), 1 / 3)

  s.nodeSunOffset = nodeSunOffset(sim.day)
  s.inSeason = s.nodeSunOffset <= THREE.MathUtils.degToRad(SEASON_LIMIT_DEG)
  _delta.copy(s.moonPos).addScaledVector(s.moonShadowAxis, s.moonUmbraLen)
  s.tipInsideEarth = _delta.length() < R_EARTH
  return s
}

/* ---------------------------------------------------------------- */
/* 近地轨道机位：从天上只看见影子扫过地球，看不见日冕                   */
/* ---------------------------------------------------------------- */

const _orbitRadial = new THREE.Vector3()
const _orbitTangent = new THREE.Vector3()
const _orbitUp = new THREE.Vector3(0, 1, 0)
const _orbitBinormal = new THREE.Vector3(0, 0, 1)

/**
 * 把镜头放在日面这一侧、大约 1.4 万公里高的气象卫星机位，斜看整颗地球。
 * 贴图只有 2K：再近大陆会糊成马赛克；再远本影又缩成几个像素。
 * 这个距离刚好让半影铺在一块大陆上，本影是中央那块深灰圆斑。
 */
export function orbitLookAtShadow(
  shadowSpot: THREE.Vector3,
  axis: THREE.Vector3,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
) {
  _orbitRadial.copy(shadowSpot)
  if (_orbitRadial.lengthSq() < 1e-8) _orbitRadial.copy(SUN_DIR)
  _orbitRadial.normalize()
  _orbitTangent.crossVectors(_orbitRadial, _orbitUp)
  if (_orbitTangent.lengthSq() < 1e-8) _orbitTangent.crossVectors(_orbitRadial, _orbitBinormal)
  _orbitTangent.normalize()
  // 若切向几乎顺着影轴，改用另一侧，保证能看见日面那一侧的地球肢体
  if (Math.abs(_orbitTangent.dot(axis)) > 0.86) {
    _orbitTangent.crossVectors(_orbitRadial, axis)
    if (_orbitTangent.lengthSq() < 1e-8) _orbitTangent.copy(_orbitBinormal)
    else _orbitTangent.normalize()
  }
  outPos
    .copy(SUN_DIR)
    .multiplyScalar(3.42)
    .addScaledVector(_orbitTangent, 0.42)
    .addScaledVector(_orbitUp, 0.38)
  // 取景略偏向地心：日面铺满画面，本影落在白昼中央
  outTarget.copy(shadowSpot).multiplyScalar(0.22)
}

/* ---------------------------------------------------------------- */
/* 食季窗口：给时间轴画出「一年里只有两段窄窗」                          */
/* ---------------------------------------------------------------- */

/**
 * 交点线与日地连线夹角小于 limit 的时间段。
 * 返回 [start, end] 对，单位为天，落在 [from, from + span] 内。
 */
export function seasonWindows(from: number, span: number, limitDeg = SEASON_LIMIT_DEG) {
  const limit = THREE.MathUtils.degToRad(limitDeg)
  const rate = (Math.PI * 2) / ECLIPSE_YEAR
  const windows: Array<[number, number]> = []
  // 交点线指向太阳：node ≡ 0 或 π（mod π）
  const first = Math.floor((t0Node - rate * (from + span)) / Math.PI)
  const last = Math.ceil((t0Node - rate * from) / Math.PI)
  for (let k = first; k <= last; k++) {
    const center = (t0Node - k * Math.PI) / rate
    const half = limit / rate
    const a = Math.max(from, center - half)
    const b = Math.min(from + span, center + half)
    if (b > a) windows.push([a, b])
  }
  return windows
}

/* ---------------------------------------------------------------- */
/* 场景求解：找到「日全食 / 日环食 / 月全食 / 擦过」发生的确切时刻          */
/* ---------------------------------------------------------------- */

export type ScenarioKey = 'total-solar' | 'annular' | 'partial-solar' | 'total-lunar' | 'miss'

type Scenario = { day: number; moonDist: number }

const SCENARIO_DIST: Record<ScenarioKey, number> = {
  'total-solar': D_MOON_MIN + 0.35,
  annular: D_MOON_MAX - 0.35,
  'partial-solar': D_MOON_MEAN,
  'total-lunar': D_MOON_MEAN,
  miss: D_MOON_MEAN,
}

function score(key: ScenarioKey, s: EclipseState) {
  switch (key) {
    case 'total-solar':
      // 影轴越接近地心、全食程度越高越好
      return (s.kind === 'total-solar' ? 10 : 0) + s.obscuration - s.axisMiss * 0.4
    case 'annular':
      return (s.kind === 'annular' ? 10 : 0) + s.obscuration - s.axisMiss * 0.4
    case 'partial-solar':
      // 想要一次明显但绝不完整的偏食
      return s.kind === 'partial-solar' ? 10 - Math.abs(s.obscuration - 0.62) * 8 : 0
    case 'total-lunar':
      return (s.kind === 'total-lunar' ? 10 : 0) + s.umbralCoverage - s.shadowOffset * 0.5
    case 'miss': {
      // 新月，但影锥从地球上下方远远擦过
      const fromNew = Math.min(s.phase, Math.PI * 2 - s.phase)
      return fromNew < 0.03 ? 10 + Math.min(Math.abs(s.latitudeOffset), 6) : 0
    }
  }
}

const scenarioCache = new Map<ScenarioKey, Scenario>()

/** 在 0–2 个食年里扫描，找出该场景最漂亮的一刻（结果缓存） */
export function findScenario(key: ScenarioKey): Scenario {
  const cached = scenarioCache.get(key)
  if (cached) return cached

  const sim: SimState = { day: 0, moonDist: SCENARIO_DIST[key], speed: 1, playing: false, tilted: true }
  const state = createEclipseState()
  const span = ECLIPSE_YEAR * 2

  let bestDay = 0
  let bestScore = -Infinity
  for (let day = 0; day < span; day += 0.05) {
    sim.day = day
    const value = score(key, computeEclipse(sim, state))
    if (value > bestScore) {
      bestScore = value
      bestDay = day
    }
  }
  // 细化
  for (let day = bestDay - 0.06; day <= bestDay + 0.06; day += 0.0008) {
    sim.day = day
    const value = score(key, computeEclipse(sim, state))
    if (value > bestScore) {
      bestScore = value
      bestDay = day
    }
  }

  const result: Scenario = { day: bestDay, moonDist: SCENARIO_DIST[key] }
  scenarioCache.set(key, result)
  return result
}
