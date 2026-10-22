/**
 * 雨水雕山：一块被抬升、被雨水侵蚀的地。
 *
 * 地貌学的标准“河流功率”模型（stream power law）：
 *   ∂h/∂t = U − K · A^m · S^n + D · ∇²h
 * U 抬升速率，A 上游汇水面积（按降雨加权），S 河道坡度，K 岩石的可蚀性，
 * D 坡面蠕移的扩散系数。取 m = 0.5、n = 1（Whipple & Tucker 1999）。
 *
 * 求解按 Braun & Willett (2013) 的隐式 O(n) 方法：先给每个格点找下游，
 * 再从出海口往上游逐点解，时间步再大也不会发散。洼地用 priority-flood
 * （Barnes et al. 2014）加一个极小坡度填平，水总能流到边界的海里。
 *
 * 这里没有任何真实地形数据，地块和参数是为“看清楚”挑的，数值落在文献给出的
 * 合理范围里：见 SOURCES.md。
 */

export const GRID = 112
/** 一个格子的边长（米）。112 × 400 m ≈ 45 km，大约一座小山脉的宽度。 */
export const CELL_M = 400
/** 河流功率指数 m（n 取 1）。 */
export const AREA_EXPONENT = 0.5
/** 普通岩石的可蚀性 K（1/年，配合 m = 0.5、A 以平方米计）。 */
export const ERODIBILITY = 5e-6
/** 硬岩的可蚀性是普通岩石的几分之一。 */
export const HARD_ROCK_FACTOR = 0.12
/** 坡面扩散系数 D（平方米/年）。 */
export const DIFFUSIVITY = 0.02
/** 按住时手下最大的抬升速率（米/年），即 4 毫米/年，和台湾中央山脉同一个量级。 */
export const MAX_UPLIFT_M_PER_YR = 0.004
/** 整块地缓慢的区域抬升（米/年），0.15 毫米/年；没有它，低地会被冲到海平面。 */
export const BACKGROUND_UPLIFT_M_PER_YR = 0.00015
/** 降雨倍数的范围：0.25 像干旱区，1 是基准，3 像季风区。 */
export const RAIN_MIN = 0.25
export const RAIN_MAX = 3

export type Landscape = {
  size: number
  /** 海拔（米），边界格点固定为 0，是海。 */
  height: Float32Array
  /** 上游汇水面积（平方米，乘过降雨倍数）。 */
  area: Float32Array
  /** 每个格点的下游格点；边界格点指向自己。 */
  receiver: Int32Array
  /** 从出海口到上游的处理顺序。 */
  order: Int32Array
  /** 可蚀性倍数：1 是普通岩石，HARD_ROCK_FACTOR 是硬岩。 */
  rock: Float32Array
  /** 本步的抬升速率（米/年），由手的位置决定，每步之后清零。 */
  uplift: Float32Array
  /** 已过去的模拟时间（年）。 */
  years: number
  /** 被冲进海里的岩石总体积（立方米）。 */
  erodedM3: number
}

const NEIGHBOURS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const

/** 确定性的小起伏，让河网从“噪声”里长出来，而不是从格子方向里长出来。 */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale
  const fy = y / scale
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const tx = fx - ix
  const ty = fy - iy
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const a = hash(ix, iy, seed)
  const b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed)
  const d = hash(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

export function isBoundary(size: number, index: number): boolean {
  const x = index % size
  const y = (index / size) | 0
  return x === 0 || y === 0 || x === size - 1 || y === size - 1
}

/** 一块刚露出海面、几十米高的低地，带一点随机起伏。 */
export function createLandscape(size = GRID, seed = 7): Landscape {
  const count = size * size
  const height = new Float32Array(count)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      if (isBoundary(size, i)) continue
      const u = x / (size - 1) - 0.5
      const v = y / (size - 1) - 0.5
      const dome = Math.max(0, 1 - (u * u + v * v) * 2.4)
      const noise = valueNoise(x, y, 9, seed) * 0.65 + valueNoise(x, y, 3.5, seed + 1) * 0.35
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y)
      height[i] = Math.min(1, edge / 4) * (35 + 70 * dome + 25 * noise)
    }
  }
  const landscape: Landscape = {
    size,
    height,
    area: new Float32Array(count),
    receiver: new Int32Array(count),
    order: new Int32Array(count),
    rock: new Float32Array(count).fill(1),
    uplift: new Float32Array(count),
    years: 0,
    erodedM3: 0,
  }
  route(landscape, 1)
  return landscape
}

/** 最小堆：按海拔弹出格点，供 priority-flood 使用。 */
class HeightHeap {
  private items: Int32Array
  private keys: Float32Array
  length = 0

  constructor(capacity: number) {
    this.items = new Int32Array(capacity)
    this.keys = new Float32Array(capacity)
  }

  push(item: number, key: number) {
    let i = this.length
    this.length += 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keys[parent] <= key) break
      this.items[i] = this.items[parent]
      this.keys[i] = this.keys[parent]
      i = parent
    }
    this.items[i] = item
    this.keys[i] = key
  }

  pop(): number {
    const top = this.items[0]
    this.length -= 1
    const item = this.items[this.length]
    const key = this.keys[this.length]
    let i = 0
    for (;;) {
      let child = 2 * i + 1
      if (child >= this.length) break
      if (child + 1 < this.length && this.keys[child + 1] < this.keys[child]) child += 1
      if (this.keys[child] >= key) break
      this.items[i] = this.items[child]
      this.keys[i] = this.keys[child]
      i = child
    }
    this.items[i] = item
    this.keys[i] = key
    return top
  }
}

const heaps = new Map<number, HeightHeap>()
const visitedBuffers = new Map<number, Uint8Array>()

/**
 * 找下游、排顺序、算汇水面积。
 *
 * priority-flood 从海岸往里“涨水”：每次弹出最低的格点，把还没访问的邻居
 * 抬到至少比它高一点点（填平洼地），再压进堆。弹出的顺序天然是从下游到上游，
 * 每个格点的下游取已处理邻居里坡度最陡的那个。
 */
export function route(landscape: Landscape, rain: number) {
  const { size, height, receiver, order, area } = landscape
  const count = size * size
  let heap = heaps.get(count)
  if (!heap) {
    heap = new HeightHeap(count)
    heaps.set(count, heap)
  }
  let visited = visitedBuffers.get(count)
  if (!visited) {
    visited = new Uint8Array(count)
    visitedBuffers.set(count, visited)
  }
  visited.fill(0)
  heap.length = 0

  for (let i = 0; i < count; i += 1) {
    if (!isBoundary(size, i)) continue
    height[i] = 0
    receiver[i] = i
    visited[i] = 1
    heap.push(i, 0)
  }

  const epsilon = 1e-3
  let cursor = 0
  while (heap.length > 0) {
    const i = heap.pop()
    order[cursor] = i
    cursor += 1
    const x = i % size
    const y = (i / size) | 0
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      const j = ny * size + nx
      if (visited[j]) continue
      visited[j] = 1
      if (height[j] <= height[i]) height[j] = height[i] + epsilon
      heap.push(j, height[j])
    }
  }

  // 下游：在比自己低的邻居里取最陡的（priority-flood 保证至少有一个）。
  for (let k = 0; k < count; k += 1) {
    const i = order[k]
    if (isBoundary(size, i)) continue
    const x = i % size
    const y = (i / size) | 0
    let best = -1
    let bestSlope = 0
    for (const [dx, dy] of NEIGHBOURS) {
      const j = (y + dy) * size + (x + dx)
      const slope = (height[i] - height[j]) / (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1)
      if (slope > bestSlope) {
        bestSlope = slope
        best = j
      }
    }
    receiver[i] = best >= 0 ? best : i
  }

  // 汇水面积：从上游往下游累加，每个格子贡献自己的面积乘以降雨倍数。
  const cell = CELL_M * CELL_M * rain
  area.fill(cell)
  for (let k = count - 1; k >= 0; k -= 1) {
    const i = order[k]
    const r = receiver[i]
    if (r !== i) area[r] += area[i]
  }
}

/** 在格点 (cx, cy) 附近按下手：一个高斯形的抬升区。 */
export function pressUplift(landscape: Landscape, cx: number, cy: number, radiusCells: number, strength = 1) {
  const { size, uplift } = landscape
  const reach = Math.ceil(radiusCells * 2.2)
  const rate = MAX_UPLIFT_M_PER_YR * Math.max(0, Math.min(1, strength))
  for (let y = Math.max(1, Math.floor(cy - reach)); y <= Math.min(size - 2, Math.ceil(cy + reach)); y += 1) {
    for (let x = Math.max(1, Math.floor(cx - reach)); x <= Math.min(size - 2, Math.ceil(cx + reach)); x += 1) {
      const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (radiusCells * radiusCells)
      const u = rate * Math.exp(-d2)
      const i = y * size + x
      if (u > uplift[i]) uplift[i] = u
    }
  }
}

/** 在格点附近画一块硬岩（例如石英岩、花岗岩）。 */
export function paintHardRock(landscape: Landscape, cx: number, cy: number, radiusCells: number) {
  const { size, rock } = landscape
  const reach = Math.ceil(radiusCells)
  for (let y = Math.max(1, Math.floor(cy - reach)); y <= Math.min(size - 2, Math.ceil(cy + reach)); y += 1) {
    for (let x = Math.max(1, Math.floor(cx - reach)); x <= Math.min(size - 2, Math.ceil(cx + reach)); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radiusCells * radiusCells) rock[y * size + x] = HARD_ROCK_FACTOR
    }
  }
}

/**
 * 前进一步：抬升、河流下切（隐式）、坡面扩散。
 * 返回这一步里被冲进海的体积（立方米）。
 */
export function step(landscape: Landscape, dtYears: number, rain = 1): number {
  const { size, height, uplift, receiver, order, area, rock } = landscape
  const count = size * size

  let before = 0
  for (let i = 0; i < count; i += 1) {
    if (isBoundary(size, i)) continue
    height[i] += (uplift[i] + BACKGROUND_UPLIFT_M_PER_YR) * dtYears
    before += height[i]
  }
  uplift.fill(0)

  route(landscape, rain)

  // Braun & Willett (2013)，n = 1：h_i ← (h_i + F·h_r) / (1 + F)，F = K·dt·A^m / L。
  for (let k = 0; k < count; k += 1) {
    const i = order[k]
    const r = receiver[i]
    if (r === i) continue
    const dx = Math.abs((i % size) - (r % size))
    const dy = Math.abs(((i / size) | 0) - ((r / size) | 0))
    const length = CELL_M * (dx + dy === 2 ? Math.SQRT2 : 1)
    const f = (ERODIBILITY * rock[i] * dtYears * Math.pow(area[i], AREA_EXPONENT)) / length
    height[i] = (height[i] + f * height[r]) / (1 + f)
  }

  // 坡面蠕移：显式扩散，系数很小，只是把尖锐的格子棱角磨圆一点。
  const kappa = (DIFFUSIVITY * dtYears) / (CELL_M * CELL_M)
  if (kappa > 0) {
    const copy = height.slice()
    const k = Math.min(kappa, 0.2)
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const i = y * size + x
        height[i] = copy[i] + k * (copy[i - 1] + copy[i + 1] + copy[i - size] + copy[i + size] - 4 * copy[i])
      }
    }
  }

  let after = 0
  for (let i = 0; i < count; i += 1) {
    if (isBoundary(size, i)) continue
    if (height[i] < 0) height[i] = 0
    after += height[i]
  }

  // 抬升量已经算进 before，所以差值就是被冲走的部分。
  const eroded = Math.max(0, (before - after) * CELL_M * CELL_M)
  landscape.years += dtYears
  landscape.erodedM3 += eroded
  return eroded
}

export function maxHeight(landscape: Landscape): number {
  let max = 0
  for (let i = 0; i < landscape.height.length; i += 1) if (landscape.height[i] > max) max = landscape.height[i]
  return max
}

/** 汇水面积超过这个值（平方米）就画成河。 */
export const RIVER_AREA_M2 = 6e6

/** 有多少个格点已经是河道：用来判断“河网长出来了”。 */
export function riverCellCount(landscape: Landscape): number {
  let rivers = 0
  for (let i = 0; i < landscape.area.length; i += 1) {
    if (!isBoundary(landscape.size, i) && landscape.area[i] >= RIVER_AREA_M2 && landscape.height[i] > 1) rivers += 1
  }
  return rivers
}

/** 汇入海里的河口数（面积超过阈值、下游是海的格点）。 */
export function riverMouths(landscape: Landscape): number {
  const { size, receiver, area } = landscape
  let mouths = 0
  for (let i = 0; i < area.length; i += 1) {
    if (isBoundary(size, i)) continue
    if (isBoundary(size, receiver[i]) && area[i] >= RIVER_AREA_M2) mouths += 1
  }
  return mouths
}
