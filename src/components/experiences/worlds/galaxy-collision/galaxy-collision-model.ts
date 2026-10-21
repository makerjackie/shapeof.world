/**
 * 银河系 × 仙女座：限制性 N 体模型（Toomre & Toomre 1972 的经典做法）
 *
 * - 两个星系核当**质点**，只解它们之间的二体问题；额外加一项动力学摩擦，
 *   把轨道能量耗散掉，让它们在几次穿越后真的并合（纯二体永远不会并合）。
 * - 几千颗盘星与气体云是**试验粒子**：只受这两个质点的引力，彼此之间不算力。
 *   这正是 1972 年那篇《Galactic Bridges and Tails》做出潮汐桥与潮尾的办法，
 *   真实、便宜，而且桥和尾的形态对交会几何非常敏感。
 * - 远距离阶段（仙女座还在几十万秒差距外）没有可见潮汐效应，盘按图案速度整体
 *   旋转，不做逐粒子积分——既正确又省算力；靠近到 HANDOFF_SEP 时交给积分器。
 *
 * 本文件是纯数值模块，不 import three，便于单独跑数校准。
 */

// ——————————————————————————————————————————————————————————————
// 单位与标定
// ——————————————————————————————————————————————————————————————

/** 1 长度单位 = 25 kpc（银河系恒星盘半径约 1.2 单位） */
export const KPC_PER_UNIT = 25
/** 1 速度单位对应的 km/s（由默认交会速度 110 km/s 反标定） */
export const KMS_PER_VUNIT = 1100
/**
 * 1 时间单位对应多少 Gyr。
 * 反标定自「默认参数下首次交会 = 40 亿年后、并合完成约 57 亿年后」
 * （NASA / Cox & Loeb 2008）。改动初始条件或摩擦项后需要重新校准。
 */
export const GYR_PER_UNIT = 4.0 / 101.6
export const T_MAX_GYR = 7
export const T_MAX = T_MAX_GYR / GYR_PER_UNIT

export const M_MW = 1
export const M_M31 = 1.25
export const M_TOT = M_MW + M_M31

/** 核的引力软化（Plummer 核）：≈ 7.5 kpc */
const CORE_SOFT = 0.3
const CORE_SOFT2 = CORE_SOFT * CORE_SOFT
/** 今天的银河系–仙女座距离 780 kpc */
const START_SEP = 780 / KPC_PER_UNIT
/** 靠近到这个距离才开始逐粒子积分（275 kpc） */
const HANDOFF_SEP = 11
/**
 * 动力学摩擦（示意项，见 ⓘ）：纯二体永远不会并合，真实并合靠星系晕之间的
 * 动力学摩擦把轨道能量耗散掉。这里用一项随距离急剧变强的阻尼近似它，
 * 使两个核在两三次穿越后落到一起——与大质量比并合的实际数值模拟一致。
 */
const DRAG_SCALE = 3.2
const DRAG_K = 0.011
const DRAG_NEAR = 12
const DRAG_NEAR_SCALE = 1.0
/** 视为已并合的核间距 */
const MERGE_SEP = 0.05

/** 粒子积分步长 */
export const DT = 0.06
/** 每多少步存一次状态快照（供时间轴倒着拖） */
const CHECKPOINT_EVERY = 100
/** 每多少步检查一次气体压缩点火 */
const IGNITE_EVERY = 4

// 盘的几何
const STAR_R_MIN = 0.16
const STAR_R_MAX = 1.3
const STAR_SCALE_LEN = 0.42
const GAS_R_MIN = 0.24
const GAS_R_MAX = 1.42
const GAS_SCALE_LEN = 0.6
/** 螺旋臂的紧卷程度（对数螺线 pitch angle） */
const PITCH_TAN = Math.tan((15 * Math.PI) / 180)
const ARM_INNER = 0.46

// ——————————————————————————————————————————————————————————————
// 类型
// ——————————————————————————————————————————————————————————————

export type EncounterMode = 'grazing' | 'head-on' | 'retrograde'

export type EncounterConfig = {
  mode: EncounterMode
  /**
   * 今天的银心系径向接近速度，km/s。
   * 观测标定约 −109 ± 4 km/s（van der Marel et al. 2012；常约写 110 km/s）。
   * 界面不再提供旋钮，仿真固定用此值。
   */
  approachKmS: number
}

export const DEFAULT_CONFIG: EncounterConfig = { mode: 'grazing', approachKmS: 110 }

export type CenterTrack = {
  dt: number
  count: number
  /** 相对位矢 p2 − p1，长度 3·count */
  rel: Float32Array
  /** 相对速度，长度 3·count */
  relV: Float32Array
  sep: Float32Array
  tPeri: number
  minSep: number
  tHandoff: number
  /** 并合时刻；不并合则为 Infinity */
  tMerge: number
}

export type ParticleSet = {
  n: number
  /** 前 nStar 个是恒星，其后是气体云 */
  nStar: number
  pos: Float32Array
  vel: Float32Array
  /** 0 = 银河系，1 = 仙女座 */
  host: Uint8Array
  r0: Float32Array
  th0: Float32Array
  z0: Float32Array
  /** 点火时刻（sim 时间）；−1 = 未点火 */
  ign: Float32Array
  color: Float32Array
  size: Float32Array
  seed: Float32Array
  sunIndex: number
}

type Checkpoint = {
  t: number
  pos: Float32Array
  vel: Float32Array
  ign: Float32Array
  ignited: number
}

export type Centers = {
  x1: number; y1: number; z1: number
  x2: number; y2: number; z2: number
  vx1: number; vy1: number; vz1: number
  vx2: number; vy2: number; vz2: number
  sep: number
}

export type SimRuntime = {
  cfg: EncounterConfig
  track: CenterTrack
  set: ParticleSet
  /** 各盘的朝向矩阵（3×3，列主序无关，见 rotateLocal） */
  orient: [Float64Array, Float64Array]
  spin: [number, number]
  patternOmega: number
  t: number
  live: boolean
  checkpoints: Array<Checkpoint>
  stepsSinceCheckpoint: number
  ignited: number
  /** 太阳粒子的轨迹（sim 时间递增） */
  sunTrail: Array<number>
  sunTrailT: Array<number>
  gridA: Int16Array
  gridB: Int16Array
}

// ——————————————————————————————————————————————————————————————
// 小工具
// ——————————————————————————————————————————————————————————————

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: () => number) {
  return (rand() + rand() + rand() + rand() - 2) * 0.86
}

/** 主体星系的圆周速度（自身软化点质量势） */
function circularSpeed(mass: number, r: number) {
  const s = r * r + CORE_SOFT2
  return Math.sqrt((mass * r * r) / (s * Math.sqrt(s)))
}

/** 指数盘的数密度 N(r) ∝ r·exp(−r/h)，拒绝采样 */
function sampleDiskRadius(rand: () => number, rMin: number, rMax: number, h: number) {
  for (let k = 0; k < 48; k += 1) {
    const r = rMin + (rMax - rMin) * rand()
    if (rand() < (r / h) * Math.exp(1 - r / h)) return r
  }
  return rMin + (rMax - rMin) * rand()
}

/** 绕 x 轴倾斜 inc，再绕 y 轴转 node，得到盘局部坐标 → 世界坐标的矩阵 */
function orientation(incDeg: number, nodeDeg: number): Float64Array {
  const i = (incDeg * Math.PI) / 180
  const n = (nodeDeg * Math.PI) / 180
  const ci = Math.cos(i)
  const si = Math.sin(i)
  const cn = Math.cos(n)
  const sn = Math.sin(n)
  // Ry(n) · Rx(i)
  return new Float64Array([
    cn, sn * si, sn * ci,
    0, ci, -si,
    -sn, cn * si, cn * ci,
  ])
}

function rotateLocal(m: Float64Array, x: number, y: number, z: number, out: Array<number>) {
  out[0] = m[0] * x + m[1] * y + m[2] * z
  out[1] = m[3] * x + m[4] * y + m[5] * z
  out[2] = m[6] * x + m[7] * y + m[8] * z
}

const MODE_SETUP: Record<EncounterMode, {
  /** 目标近星系点距离（长度单位），决定横向速度 */
  periapsis: number
  inc1: number; node1: number
  inc2: number; node2: number
  spin: number
}> = {
  // 擦边而过：经典的桥 + 长潮尾（Toomre 的招牌构型）
  grazing: { periapsis: 1.25, inc1: 16, node1: 14, inc2: 32, node2: -34, spin: 1 },
  // 迎面对撞：接近真实观测（仙女座的横向速度很小），几乎正撞
  'head-on': { periapsis: 0.24, inc1: 36, node1: 22, inc2: 68, node2: -42, spin: 1 },
  // 逆行擦过：盘的自转与轨道反向，潮尾变短变粗
  retrograde: { periapsis: 1.25, inc1: 16, node1: 14, inc2: 32, node2: -34, spin: -1 },
}

/** 由目标近星系点反解初始横向速度（二体解析解，忽略摩擦） */
function tangentialFor(periapsis: number, r0: number, vr: number) {
  const num = 2 * M_TOT * (1 / periapsis - 1 / r0) + vr * vr
  const den = (r0 * r0) / (periapsis * periapsis) - 1
  return Math.sqrt(Math.max(0, num / den))
}

// ——————————————————————————————————————————————————————————————
// 两个核的轨道（含动力学摩擦）
// ——————————————————————————————————————————————————————————————

export function buildCenterTrack(cfg: EncounterConfig, horizon = T_MAX): CenterTrack {
  const setup = MODE_SETUP[cfg.mode]
  const dt = 0.05
  const count = Math.ceil(horizon / dt) + 2
  const rel = new Float32Array(count * 3)
  const relV = new Float32Array(count * 3)
  const sep = new Float32Array(count)

  const vr = cfg.approachKmS / KMS_PER_VUNIT
  let x = START_SEP
  let y = 0
  let z = 0
  let vx = -vr
  let vy = 0
  let vz = -tangentialFor(setup.periapsis, START_SEP, vr)

  let tPeri = 0
  let minSep = START_SEP
  let tHandoff = Infinity
  let tMerge = Infinity
  let merged = false
  let prevSep = START_SEP
  let falling = true

  for (let i = 0; i < count; i += 1) {
    const t = i * dt
    const d = Math.sqrt(x * x + y * y + z * z)
    rel[i * 3] = x
    rel[i * 3 + 1] = y
    rel[i * 3 + 2] = z
    relV[i * 3] = vx
    relV[i * 3 + 1] = vy
    relV[i * 3 + 2] = vz
    sep[i] = d
    // 第一次擦身：第一个局部极小
    if (falling && d > prevSep) {
      falling = false
      tPeri = t - dt
      minSep = prevSep
    }
    prevSep = d
    if (tHandoff === Infinity && d <= HANDOFF_SEP) tHandoff = t
    if (!merged && d <= MERGE_SEP) {
      merged = true
      tMerge = t
      if (falling) {
        falling = false
        tPeri = t
        minSep = d
      }
    }
    if (merged) {
      x = 0; y = 0; z = 0
      vx = 0; vy = 0; vz = 0
      continue
    }

    // 靠得越近，步长越细
    const steps = d < 2 ? 48 : 8
    const h = dt / steps
    for (let s = 0; s < steps; s += 1) {
      const r = Math.sqrt(x * x + y * y + z * z)
      const r2 = r * r + CORE_SOFT2
      const inv = M_TOT / (r2 * Math.sqrt(r2))
      const ratio = r / DRAG_SCALE
      const drag = (DRAG_K * (1 + DRAG_NEAR * Math.exp(-r / DRAG_NEAR_SCALE)))
        / (1 + ratio * ratio * ratio)
      vx += (-x * inv - vx * drag) * h
      vy += (-y * inv - vy * drag) * h
      vz += (-z * inv - vz * drag) * h
      x += vx * h
      y += vy * h
      z += vz * h
    }
  }

  return { dt, count, rel, relV, sep, tPeri, minSep, tHandoff, tMerge }
}

const scratchCenters: Centers = {
  x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0,
  vx1: 0, vy1: 0, vz1: 0, vx2: 0, vy2: 0, vz2: 0, sep: 0,
}

const F1 = -M_M31 / M_TOT
const F2 = M_MW / M_TOT

export function centersAt(track: CenterTrack, t: number, out: Centers = scratchCenters): Centers {
  const u = Math.min(Math.max(t, 0) / track.dt, track.count - 1.001)
  const i = Math.floor(u)
  const f = u - i
  const a = i * 3
  const b = (i + 1) * 3
  const rx = track.rel[a] + (track.rel[b] - track.rel[a]) * f
  const ry = track.rel[a + 1] + (track.rel[b + 1] - track.rel[a + 1]) * f
  const rz = track.rel[a + 2] + (track.rel[b + 2] - track.rel[a + 2]) * f
  const vx = track.relV[a] + (track.relV[b] - track.relV[a]) * f
  const vy = track.relV[a + 1] + (track.relV[b + 1] - track.relV[a + 1]) * f
  const vz = track.relV[a + 2] + (track.relV[b + 2] - track.relV[a + 2]) * f
  out.x1 = F1 * rx; out.y1 = F1 * ry; out.z1 = F1 * rz
  out.x2 = F2 * rx; out.y2 = F2 * ry; out.z2 = F2 * rz
  out.vx1 = F1 * vx; out.vy1 = F1 * vy; out.vz1 = F1 * vz
  out.vx2 = F2 * vx; out.vy2 = F2 * vy; out.vz2 = F2 * vz
  out.sep = Math.sqrt(rx * rx + ry * ry + rz * rz)
  return out
}

// ——————————————————————————————————————————————————————————————
// 盘的粒子
// ——————————————————————————————————————————————————————————————

/** 银河系：暖金核 → 淡金外盘；仙女座：冷白核 → 蓝白外盘 */
const PALETTE = [
  { core: [1.0, 0.86, 0.62], edge: [0.86, 0.86, 0.78] },
  { core: [1.0, 0.92, 0.82], edge: [0.55, 0.68, 1.0] },
]

function starColor(host: number, rNorm: number, jitter: number, out: Float32Array, at: number) {
  const p = PALETTE[host]
  const w = Math.min(1, Math.max(0, rNorm))
  const s = w * w * (3 - 2 * w)
  out[at] = Math.min(1.2, (p.core[0] + (p.edge[0] - p.core[0]) * s) * jitter)
  out[at + 1] = Math.min(1.2, (p.core[1] + (p.edge[1] - p.core[1]) * s) * jitter)
  out[at + 2] = Math.min(1.2, (p.core[2] + (p.edge[2] - p.core[2]) * s) * jitter)
}

export function createParticleSet(nStar: number, nGas: number, seed = 20260726): ParticleSet {
  const rand = mulberry32(seed)
  const n = nStar + nGas
  const set: ParticleSet = {
    n,
    nStar,
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    host: new Uint8Array(n),
    r0: new Float32Array(n),
    th0: new Float32Array(n),
    z0: new Float32Array(n),
    ign: new Float32Array(n).fill(-1),
    color: new Float32Array(n * 3),
    size: new Float32Array(n),
    seed: new Float32Array(n),
    sunIndex: 0,
  }

  let bestSun = Infinity
  for (let i = 0; i < nStar; i += 1) {
    const host = i % 2
    // 26% 放在外盘（对应延展的 HI 盘）——潮尾主要由它们拉出来
    const outer = rand() < 0.26
    const r = outer
      ? Math.sqrt(0.66 + rand() * (STAR_R_MAX * STAR_R_MAX - 0.66))
      : sampleDiskRadius(rand, STAR_R_MIN, STAR_R_MAX, STAR_SCALE_LEN)
    let th: number
    if (r > ARM_INNER && rand() > 0.26) {
      // 两条对数螺旋臂 + 横向散布
      const arm = rand() < 0.5 ? 0 : 1
      th = Math.log(r / ARM_INNER) / PITCH_TAN + arm * Math.PI + gauss(rand) * 0.34
    } else {
      th = rand() * Math.PI * 2
    }
    const bulge = r < 0.3
    set.host[i] = host
    set.r0[i] = r
    set.th0[i] = th
    set.z0[i] = gauss(rand) * (bulge ? 0.11 : 0.028 * (1 + r))
    set.seed[i] = rand()
    const rNorm = (r - STAR_R_MIN) / (STAR_R_MAX - STAR_R_MIN)
    starColor(host, rNorm, 0.82 + rand() * 0.34, set.color, i * 3)
    // 外盘的星以后会变成潮尾——给它们多一点存在感，不然尾巴看不见
    set.size[i] = (bulge ? 1.3 : r > 0.78 ? 1.5 : 1.0) * (0.62 + rand() * 0.62)
    if (host === 0) {
      const d = Math.abs(r - 8.2 / KPC_PER_UNIT)
      if (d < bestSun) {
        bestSun = d
        set.sunIndex = i
      }
    }
  }

  for (let k = 0; k < nGas; k += 1) {
    const i = nStar + k
    const host = k % 2
    const r = sampleDiskRadius(rand, GAS_R_MIN, GAS_R_MAX, GAS_SCALE_LEN)
    set.host[i] = host
    set.r0[i] = r
    set.th0[i] = rand() * Math.PI * 2
    set.z0[i] = gauss(rand) * 0.018 * (1 + r)
    set.seed[i] = rand()
    // 冷气体：暗蓝灰，几乎看不见，被压缩点亮后才是主角
    const tint = 0.8 + rand() * 0.4
    set.color[i * 3] = 0.2 * tint
    set.color[i * 3 + 1] = 0.3 * tint
    set.color[i * 3 + 2] = 0.46 * tint
    set.size[i] = 1.5 + rand() * 1.4
  }

  return set
}

// ——————————————————————————————————————————————————————————————
// 运行时
// ——————————————————————————————————————————————————————————————

const GX = 44
const GY = 22
const GZ = 44
const CELL = 0.34
const GRID_LEN = GX * GY * GZ
/** 同一格里出现几朵对方星系的云才算「撞上了」 */
const IGNITE_THRESHOLD = 3

/**
 * 挑一颗「太阳」。
 * 银河系盘上 r ≈ 8 kpc 的候选星有很多，各自结局差别很大——Cox & Loeb (2008)
 * 估计太阳约有一半概率在并合后落到 30 kpc 以外。这里先把候选星单独跑一遍
 * （只有几十颗，几毫秒），挑一颗结局最接近这个中位数的，让读数讲得清故事。
 */
const SUN_R0 = 8.2 / KPC_PER_UNIT
const SUN_TARGET_R = 30 / KPC_PER_UNIT

function pickSun(rt: SimRuntime) {
  const { set } = rt
  const candidates: Array<number> = []
  for (let i = 0; i < set.nStar; i += 1) {
    if (set.host[i] !== 0) continue
    if (Math.abs(set.r0[i] - SUN_R0) < 0.035) candidates.push(i)
    if (candidates.length >= 72) break
  }
  if (candidates.length === 0) return

  const tEnd = Math.min(T_MAX, (rt.track.tMerge === Infinity ? T_MAX : rt.track.tMerge) + 20)
  const n = candidates.length
  const p = new Float64Array(n * 3)
  const v = new Float64Array(n * 3)
  const t0 = rt.track.tHandoff
  const c0 = centersAt(rt.track, t0)
  const out: Array<number> = [0, 0, 0]
  for (let k = 0; k < n; k += 1) {
    const i = candidates[k]
    const r = set.r0[i]
    const phi = set.th0[i] + angleAt(rt, r, 0, t0)
    rotateLocal(rt.orient[0], r * Math.cos(phi), set.z0[i], r * Math.sin(phi), out)
    p[k * 3] = c0.x1 + out[0]
    p[k * 3 + 1] = c0.y1 + out[1]
    p[k * 3 + 2] = c0.z1 + out[2]
    const speed = circularSpeed(M_MW, r) * rt.spin[0]
    rotateLocal(rt.orient[0], -Math.sin(phi) * speed, 0, Math.cos(phi) * speed, out)
    v[k * 3] = c0.vx1 + out[0]
    v[k * 3 + 1] = c0.vy1 + out[1]
    v[k * 3 + 2] = c0.vz1 + out[2]
  }

  const half = DT * 0.5
  for (let t = t0; t < tEnd; t += DT) {
    const c = centersAt(rt.track, t + half)
    for (let k = 0; k < n; k += 1) {
      const a = k * 3
      let px = p[a] + v[a] * half
      let py = p[a + 1] + v[a + 1] * half
      let pz = p[a + 2] + v[a + 2] * half
      let dx = c.x1 - px, dy = c.y1 - py, dz = c.z1 - pz
      let r2 = dx * dx + dy * dy + dz * dz + CORE_SOFT2
      let inv = M_MW / (r2 * Math.sqrt(r2))
      let ax = dx * inv, ay = dy * inv, az = dz * inv
      dx = c.x2 - px; dy = c.y2 - py; dz = c.z2 - pz
      r2 = dx * dx + dy * dy + dz * dz + CORE_SOFT2
      inv = M_M31 / (r2 * Math.sqrt(r2))
      ax += dx * inv; ay += dy * inv; az += dz * inv
      v[a] += ax * DT; v[a + 1] += ay * DT; v[a + 2] += az * DT
      p[a] = px + v[a] * half
      p[a + 1] = py + v[a + 1] * half
      p[a + 2] = pz + v[a + 2] * half
    }
  }

  const cEnd = centersAt(rt.track, tEnd)
  const cx = (cEnd.x1 + cEnd.x2) * 0.5
  const cy = (cEnd.y1 + cEnd.y2) * 0.5
  const cz = (cEnd.z1 + cEnd.z2) * 0.5
  let best = candidates[0]
  let bestErr = Infinity
  for (let k = 0; k < n; k += 1) {
    const d = Math.hypot(p[k * 3] - cx, p[k * 3 + 1] - cy, p[k * 3 + 2] - cz)
    const err = Math.abs(d - SUN_TARGET_R)
    if (err < bestErr) {
      bestErr = err
      best = candidates[k]
    }
  }
  set.sunIndex = best
}

export function createRuntime(cfg: EncounterConfig, nStar: number, nGas: number): SimRuntime {
  const track = buildCenterTrack(cfg)
  const set = createParticleSet(nStar, nGas)
  const setup = MODE_SETUP[cfg.mode]
  const rt: SimRuntime = {
    cfg,
    track,
    set,
    orient: [orientation(setup.inc1, setup.node1), orientation(setup.inc2, setup.node2)],
    spin: [setup.spin, setup.spin],
    patternOmega: circularSpeed(1, 0.7) / 0.7,
    t: 0,
    live: false,
    checkpoints: [],
    stepsSinceCheckpoint: 0,
    ignited: 0,
    sunTrail: [],
    sunTrailT: [],
    gridA: new Int16Array(GRID_LEN),
    gridB: new Int16Array(GRID_LEN),
  }
  pickSun(rt)
  applyRigid(rt, 0)
  return rt
}

/** 交接前：盘整体按图案速度转，靠近交接点时把角速度平滑过渡到各自的真实 Ω(r) */
const RAMP = 6

function angleAt(rt: SimRuntime, r: number, host: number, t: number) {
  const omega = circularSpeed(host === 0 ? M_MW : M_M31, r) / Math.max(r, 1e-4)
  const tH = rt.track.tHandoff
  const start = tH - RAMP
  let integral = rt.patternOmega * t
  if (t > start) {
    const d = Math.min(t, tH) - start
    integral += (omega - rt.patternOmega) * ((d * d) / (2 * RAMP))
  }
  return rt.spin[host] * integral
}

export function applyRigid(rt: SimRuntime, t: number) {
  const { set } = rt
  const c = centersAt(rt.track, t)
  const out: Array<number> = [0, 0, 0]
  for (let i = 0; i < set.n; i += 1) {
    const host = set.host[i]
    const r = set.r0[i]
    const phi = set.th0[i] + angleAt(rt, r, host, t)
    rotateLocal(rt.orient[host], r * Math.cos(phi), set.z0[i], r * Math.sin(phi), out)
    const cx = host === 0 ? c.x1 : c.x2
    const cy = host === 0 ? c.y1 : c.y2
    const cz = host === 0 ? c.z1 : c.z2
    set.pos[i * 3] = cx + out[0]
    set.pos[i * 3 + 1] = cy + out[1]
    set.pos[i * 3 + 2] = cz + out[2]
  }
  rt.t = t
  rt.live = false
}

/** 交接：给每颗粒子一个绕自己母星系的圆轨道速度 */
function seedLive(rt: SimRuntime) {
  const t = rt.track.tHandoff
  applyRigid(rt, t)
  const { set } = rt
  const c = centersAt(rt.track, t)
  const out: Array<number> = [0, 0, 0]
  for (let i = 0; i < set.n; i += 1) {
    const host = set.host[i]
    const r = set.r0[i]
    const phi = set.th0[i] + angleAt(rt, r, host, t)
    const v = circularSpeed(host === 0 ? M_MW : M_M31, r) * rt.spin[host]
    // 局部切向 (−sinφ, 0, cosφ)
    rotateLocal(rt.orient[host], -Math.sin(phi) * v, 0, Math.cos(phi) * v, out)
    set.vel[i * 3] = (host === 0 ? c.vx1 : c.vx2) + out[0]
    set.vel[i * 3 + 1] = (host === 0 ? c.vy1 : c.vy2) + out[1]
    set.vel[i * 3 + 2] = (host === 0 ? c.vz1 : c.vz2) + out[2]
    set.ign[i] = -1
  }
  rt.live = true
  rt.ignited = 0
  rt.checkpoints = []
  rt.stepsSinceCheckpoint = 0
  rt.sunTrail = []
  rt.sunTrailT = []
  pushCheckpoint(rt)
}

function pushCheckpoint(rt: SimRuntime) {
  rt.checkpoints.push({
    t: rt.t,
    pos: rt.set.pos.slice(),
    vel: rt.set.vel.slice(),
    ign: rt.set.ign.slice(),
    ignited: rt.ignited,
  })
  rt.stepsSinceCheckpoint = 0
}

function restoreCheckpoint(rt: SimRuntime, cp: Checkpoint) {
  rt.set.pos.set(cp.pos)
  rt.set.vel.set(cp.vel)
  rt.set.ign.set(cp.ign)
  rt.ignited = cp.ignited
  rt.t = cp.t
  rt.live = true
  rt.stepsSinceCheckpoint = 0
  while (rt.sunTrailT.length > 0 && rt.sunTrailT[rt.sunTrailT.length - 1] > cp.t) {
    rt.sunTrailT.pop()
    rt.sunTrail.length -= 3
  }
}

/** 气体压缩：两个星系的气体云在同一格里相遇 → 激波压缩 → 点亮蓝色新生星团 */
function igniteGas(rt: SimRuntime) {
  const { set, gridA, gridB } = rt
  const c = centersAt(rt.track, rt.t)
  if (c.sep > 9) return
  gridA.fill(0)
  gridB.fill(0)
  const mx = (c.x1 + c.x2) * 0.5
  const my = (c.y1 + c.y2) * 0.5
  const mz = (c.z1 + c.z2) * 0.5
  const cell = (x: number, y: number, z: number) => {
    const gx = Math.floor((x - mx) / CELL) + GX / 2
    if (gx < 0 || gx >= GX) return -1
    const gy = Math.floor((y - my) / CELL) + GY / 2
    if (gy < 0 || gy >= GY) return -1
    const gz = Math.floor((z - mz) / CELL) + GZ / 2
    if (gz < 0 || gz >= GZ) return -1
    return (gy * GZ + gz) * GX + gx
  }
  for (let i = set.nStar; i < set.n; i += 1) {
    const k = cell(set.pos[i * 3], set.pos[i * 3 + 1], set.pos[i * 3 + 2])
    if (k < 0) continue
    if (set.host[i] === 0) gridA[k] += 1
    else gridB[k] += 1
  }
  for (let i = set.nStar; i < set.n; i += 1) {
    if (set.ign[i] >= 0) continue
    const k = cell(set.pos[i * 3], set.pos[i * 3 + 1], set.pos[i * 3 + 2])
    if (k < 0) continue
    const other = set.host[i] === 0 ? gridB[k] : gridA[k]
    if (other >= IGNITE_THRESHOLD) {
      set.ign[i] = rt.t
      rt.ignited += 1
    }
  }
}

const TRAIL_EVERY = 0.02
const TRAIL_MAX = 16

function recordSun(rt: SimRuntime) {
  const n = rt.sunTrailT.length
  if (n > 0 && rt.t - rt.sunTrailT[n - 1] < TRAIL_EVERY) return
  const i = rt.set.sunIndex * 3
  rt.sunTrailT.push(rt.t)
  rt.sunTrail.push(rt.set.pos[i], rt.set.pos[i + 1], rt.set.pos[i + 2])
  if (rt.sunTrailT.length > TRAIL_MAX) {
    rt.sunTrailT.shift()
    rt.sunTrail.splice(0, 3)
  }
}

function integrate(rt: SimRuntime, steps: number) {
  const { set } = rt
  const { pos, vel } = set
  const n = set.n
  const half = DT * 0.5
  for (let s = 0; s < steps; s += 1) {
    const c = centersAt(rt.track, rt.t + half)
    const { x1, y1, z1, x2, y2, z2 } = c
    for (let i = 0; i < n; i += 1) {
      const a = i * 3
      // drift → kick → drift（位置 Verlet，每步只算一次力）
      let px = pos[a] + vel[a] * half
      let py = pos[a + 1] + vel[a + 1] * half
      let pz = pos[a + 2] + vel[a + 2] * half

      let dx = x1 - px
      let dy = y1 - py
      let dz = z1 - pz
      let r2 = dx * dx + dy * dy + dz * dz + CORE_SOFT2
      let inv = M_MW / (r2 * Math.sqrt(r2))
      let ax = dx * inv
      let ay = dy * inv
      let az = dz * inv

      dx = x2 - px
      dy = y2 - py
      dz = z2 - pz
      r2 = dx * dx + dy * dy + dz * dz + CORE_SOFT2
      inv = M_M31 / (r2 * Math.sqrt(r2))
      ax += dx * inv
      ay += dy * inv
      az += dz * inv

      const nvx = vel[a] + ax * DT
      const nvy = vel[a + 1] + ay * DT
      const nvz = vel[a + 2] + az * DT
      vel[a] = nvx
      vel[a + 1] = nvy
      vel[a + 2] = nvz
      px += nvx * half
      py += nvy * half
      pz += nvz * half
      pos[a] = px
      pos[a + 1] = py
      pos[a + 2] = pz
    }
    rt.t += DT
    rt.stepsSinceCheckpoint += 1
    if (rt.stepsSinceCheckpoint % IGNITE_EVERY === 0) igniteGas(rt)
    recordSun(rt)
    if (rt.stepsSinceCheckpoint >= CHECKPOINT_EVERY) pushCheckpoint(rt)
  }
}

/**
 * 把仿真推进 / 回退到 tTarget。每帧最多走 stepBudget 步；
 * 没走到就返回 false，下一帧继续（视觉上就是一段快进）。
 */
export function seek(rt: SimRuntime, tTarget: number, stepBudget: number): boolean {
  const target = Math.min(Math.max(tTarget, 0), T_MAX)
  const tH = rt.track.tHandoff

  if (target < tH - 1e-6) {
    applyRigid(rt, target)
    return true
  }
  if (!rt.live) seedLive(rt)
  if (rt.t > target + DT * 0.5) {
    let best: Checkpoint | null = null
    for (const cp of rt.checkpoints) {
      if (cp.t <= target + 1e-6 && (!best || cp.t > best.t)) best = cp
    }
    if (best) restoreCheckpoint(rt, best)
    else seedLive(rt)
  }
  const need = Math.floor((target - rt.t) / DT + 1e-6)
  if (need <= 0) return true
  const steps = Math.min(need, stepBudget)
  integrate(rt, steps)
  return steps >= need
}

export function rebuild(rt: SimRuntime, cfg: EncounterConfig): SimRuntime {
  rt.track = buildCenterTrack(cfg)
  const setup = MODE_SETUP[cfg.mode]
  rt.cfg = cfg
  rt.orient = [orientation(setup.inc1, setup.node1), orientation(setup.inc2, setup.node2)]
  rt.spin = [setup.spin, setup.spin]
  rt.checkpoints = []
  rt.ignited = 0
  rt.sunTrail = []
  rt.sunTrailT = []
  rt.live = false
  rt.set.ign.fill(-1)
  pickSun(rt)
  applyRigid(rt, 0)
  return rt
}

// ——————————————————————————————————————————————————————————————
// 读数
// ——————————————————————————————————————————————————————————————

export const toGyr = (t: number) => t * GYR_PER_UNIT
export const fromGyr = (gyr: number) => gyr / GYR_PER_UNIT

export function separationKpc(track: CenterTrack, t: number) {
  return centersAt(track, t).sep * KPC_PER_UNIT
}

export function relativeSpeedKmS(track: CenterTrack, t: number) {
  const u = Math.min(Math.max(t, 0) / track.dt, track.count - 1.001)
  const i = Math.floor(u)
  const a = i * 3
  return Math.hypot(track.relV[a], track.relV[a + 1], track.relV[a + 2]) * KMS_PER_VUNIT
}

/** 太阳当前离（合并后的）中心多远，kpc */
export function sunRadiusKpc(rt: SimRuntime) {
  const c = centersAt(rt.track, rt.t)
  const i = rt.set.sunIndex * 3
  const cx = c.sep < 0.6 ? (c.x1 + c.x2) * 0.5 : c.x1
  const cy = c.sep < 0.6 ? (c.y1 + c.y2) * 0.5 : c.y1
  const cz = c.sep < 0.6 ? (c.z1 + c.z2) * 0.5 : c.z1
  return Math.hypot(rt.set.pos[i] - cx, rt.set.pos[i + 1] - cy, rt.set.pos[i + 2] - cz) * KPC_PER_UNIT
}
