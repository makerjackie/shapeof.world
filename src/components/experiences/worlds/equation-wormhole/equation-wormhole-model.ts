/**
 * equation-wormhole 场景布局与相机（纯函数，可测试）。
 *
 * 三种动效共用一套实例参数化约定：实例只存「参数」（角度/弧长/半径等），
 * 世界坐标与文字基向量由场景管理器在 GPU（顶点着色器）与 CPU（拾取）
 * 两侧用同一组公式算出。本文件是这组公式的 CPU 侧唯一来源。
 *
 * 排布原则：公式不重叠。虫洞沿螺旋车道按公式实际宽度等距排布；
 * 星图在天球上保持最小角距；涟漪在同心环上按弧长排布。
 */

export type SceneId = 'wormhole' | 'rush' | 'rain' | 'portrait' | 'blackhole' | 'mobius'

/** 实例参数（attribute 布局与着色器一一对应） */
export type InstanceParams = {
  /** 主参数：虫洞=车道相位角 θ；星图=方位角 θ；涟漪=环上角度 θ */
  a: number
  /** 次参数：虫洞=z0；星图=仰角 φ；涟漪=半径 r */
  b: number
  /** 第三参数：虫洞=车道编号；星图=星座组号；涟漪=相位 seed */
  c: number
  /** 文字缩放（世界单位 / em） */
  size: number
  /** 公式索引（当前科目公式表内） */
  formula: number
  /** 基础亮度系数 */
  bright: number
}

export const WORMHOLE = {
  throatZ: -58,
  throatR: 5.4,
  flare: 30,
  /** 隧道总长（z 方向循环周期） */
  length: 96,
  zMin: -88,
  zMax: 8,
  twist: 0.16,
  holeZ: -58,
  holeR: 13.5,
  /** 环带间距（z）与角度错缝 */
  ringDz: 1.72,
  ringTwist: 0.34,
} as const

export const RAIN = {
  halfX: 42,
  top: 34,
  bottom: -30,
  zFar: -72,
  zNear: 6,
  drops: 520,
  ghosts: 380,
} as const


/** mulberry32 确定性随机数 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 虫洞半径剖面：Morris–Thorne 式喉管，往相机方向张开 */
export function wormholeRadius(z: number): number {
  const u = (z - WORMHOLE.throatZ) / WORMHOLE.flare
  return WORMHOLE.throatR * Math.pow(1 + u * u, 0.72)
}

/** 虫洞壁面沿 z 的斜率 dr/dz */
export function wormholeSlope(z: number): number {
  const u = (z - WORMHOLE.throatZ) / WORMHOLE.flare
  return WORMHOLE.throatR * 0.72 * Math.pow(1 + u * u, -0.28) * (2 * u) / WORMHOLE.flare
}

/** 螺旋车道方向（未归一化）：∂pos/∂z + twist·∂pos/∂θ */
function wormholeLaneDir(theta: number, z: number): [number, number, number] {
  const r = wormholeRadius(z)
  const rp = wormholeSlope(z)
  const tw = WORMHOLE.twist
  return [
    rp * Math.cos(theta) - tw * r * Math.sin(theta),
    rp * Math.sin(theta) + tw * r * Math.cos(theta),
    1,
  ]
}

/** 车道弧长 / z 比：|dpos/dz|（用于按弧长等距排布） */
export function wormholeLaneArcPerZ(z: number): number {
  const d = wormholeLaneDir(0, z)
  return Math.hypot(d[0], d[1], d[2])
}

/**
 * 虫洞实例的世界位置与文字基向量。
 * flight 为相机等效前进量；公式随 flight 向 +z 流动并循环。
 * u 为文字行方向（沿螺旋车道切线），v 在壁面内与 u 正交（Gram–Schmidt）。
 */
export function wormholeFrame(
  theta0: number,
  z0: number,
  flight: number,
  spin: number,
): { pos: [number, number, number]; u: [number, number, number]; v: [number, number, number] } {
  const span = WORMHOLE.zMax - WORMHOLE.zMin
  const z = WORMHOLE.zMin + ((z0 + flight - WORMHOLE.zMin) % span + span) % span
  const theta = theta0 + spin + z * WORMHOLE.twist
  const r = wormholeRadius(z)
  const pos: [number, number, number] = [Math.cos(theta) * r, Math.sin(theta) * r, z]
  const dir = wormholeLaneDir(theta, z)
  const dl = Math.hypot(dir[0], dir[1], dir[2])
  const u: [number, number, number] = [dir[0] / dl, dir[1] / dl, dir[2] / dl]
  // 壁面另一切向（沿 z），与 u 做 Gram–Schmidt 得到面内正交 v
  const rp = wormholeSlope(z)
  const t2l = Math.hypot(rp, 1)
  const t2: [number, number, number] = [(rp * Math.cos(theta)) / t2l, (rp * Math.sin(theta)) / t2l, 1 / t2l]
  const dot = t2[0] * u[0] + t2[1] * u[1] + t2[2] * u[2]
  const vv: [number, number, number] = [t2[0] - dot * u[0], t2[1] - dot * u[1], t2[2] - dot * u[2]]
  const vl = Math.hypot(vv[0], vv[1], vv[2])
  const v: [number, number, number] = [vv[0] / vl, vv[1] / vl, vv[2] / vl]
  return { pos, u, v }
}

/**
 * 虫洞实例表：主车道沿螺旋线按公式宽度等距排布（不重叠），
 * 细部车道更小更暗、贴着壁面外侧补深层纹理。
 * widthsEm 为当前科目每条公式的排版宽度（em）。
 */
/**
 * 虫洞实例表：环带密铺。环贴着环（z 间距 ≈ 字高），每环公式按实际
 * 排版宽度绕满一整圈，环与环错一个固定小角度形成柔和螺旋缝。
 * ghost 层更细更暗、贴在壁面外侧，负责远景的深度纹理。
 */
export function buildWormholeInstances(widthsEm: Array<number>, seed = 7): Array<InstanceParams> {
  const rng = mulberry32(seed)
  const out: Array<InstanceParams> = []
  const n = widthsEm.length
  const lay = (sizeBase: number, brightBase: number, cBase: number, phase0: number, fi0: number, scaleR: number) => {
    let fi = fi0
    let ring = 0
    let z = WORMHOLE.zMin
    while (z < WORMHOLE.zMax) {
      const r = wormholeRadius(z) * scaleR
      const phase = phase0 + ring * WORMHOLE.ringTwist
      // 肋纹：整环尺寸起伏，飞过时有节奏地标
      const rib = 1 + 0.3 * Math.sin(ring * 0.55)
      // 先按自然宽度收集一环，再整体收缩到恰好铺满 2π（喉部公式因此更小）
      const items: Array<{ f: number; size: number }> = []
      let totalArc = 0
      for (let k = 0; k < 200; k += 1) {
        const f = fi % n
        const size = sizeBase * rib * (0.9 + rng() * 0.2)
        items.push({ f, size })
        totalArc += (widthsEm[f] * size * 1.12) / r
        fi += 1 + (rng() < 0.16 ? 1 : 0)
        if (totalArc > Math.PI * 2 * 1.08) break
      }
      const fit = Math.min(1, (Math.PI * 2) / totalArc)
      let theta = phase
      for (const { f, size } of items) {
        const dTheta = (widthsEm[f] * size * fit * 1.12) / r
        out.push({
          a: theta + dTheta / 2,
          b: z,
          c: cBase,
          size: size * fit,
          formula: f,
          bright: brightBase * (0.85 + rng() * 0.3),
        })
        theta += dTheta
      }
      ring += 1
      z += WORMHOLE.ringDz * (1 + 0.24 * Math.sin(ring * 0.9 + 1))
    }
    return fi
  }
  let fi = lay(0.95, 0.6, 0, 0, 3, 1)
  lay(0.42, 0.26, 1000, 0.9, fi + 5, 1.035)
  // 超大英雄字：近中景各几条
  for (let k = 0; k < 10; k += 1) {
    out.push({
      a: rng() * Math.PI * 2,
      b: WORMHOLE.zMin + 14 + rng() * (WORMHOLE.zMax - WORMHOLE.zMin - 18),
      c: 500 + k,
      size: 1.35 + rng() * 0.5,
      formula: Math.floor(rng() * widthsEm.length),
      bright: 0.85 + rng() * 0.15,
    })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 雨：垂直落下的公式雨，近快远慢，风一吹整片斜                       */
/* ------------------------------------------------------------------ */

/** 每滴雨的下落速度（由位置散列决定，确定性） */
export function rainSpeed(x: number, z: number): number {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return 3.6 + (h - Math.floor(h)) * 4.6
}

/** 风：缓慢摇摆的阵风强度与斜率 */
export function rainGust(time: number): number {
  return 0.5 + 0.5 * Math.sin(time * 0.13) * Math.sin(time * 0.071 + 1.7)
}

/** 雨实例帧：y 随时间下落循环，x 随阵风摆 */
export function rainFrame(
  x0: number,
  y0: number,
  z: number,
  seed: number,
  time: number,
): { pos: [number, number, number] } {
  const span = RAIN.top - RAIN.bottom
  const speed = rainSpeed(x0, z)
  const y = RAIN.bottom + ((y0 - time * speed - RAIN.bottom) % span + span) % span
  const gust = rainGust(time)
  const x = x0 + Math.sin(time * 0.3 + seed * 6.283) * (0.5 + gust * 1.6) + gust * (y - 2) * 0.16
  return { pos: [x, y, z] }
}

/** 雨实例表：近层大字 + 远层碎雨 */
export function buildRainInstances(formulaCount: number, seed = 97): Array<InstanceParams> {
  const rng = mulberry32(seed)
  const out: Array<InstanceParams> = []
  let fi = 0
  for (let i = 0; i < RAIN.drops; i += 1) {
    const x = (rng() * 2 - 1) * RAIN.halfX
    const z = RAIN.zFar * 0.45 + rng() * (RAIN.zNear - RAIN.zFar * 0.45)
    out.push({
      a: x,
      b: RAIN.bottom + rng() * (RAIN.top - RAIN.bottom),
      c: z,
      size: 0.68 + rng() * 0.55 + (rng() < 0.05 ? 0.6 : 0),
      formula: fi % formulaCount,
      bright: 0.62 + rng() * 0.45 + (rng() < 0.05 ? 0.5 : 0),
    })
    fi += 1
  }
  for (let i = 0; i < RAIN.ghosts; i += 1) {
    const x = (rng() * 2 - 1) * RAIN.halfX * 1.25
    const z = RAIN.zFar + rng() * (RAIN.zFar * 0.55 - RAIN.zFar)
    out.push({
      a: x,
      b: RAIN.bottom + rng() * (RAIN.top - RAIN.bottom),
      c: z,
      size: 0.34 + rng() * 0.26,
      formula: fi % formulaCount,
      bright: 0.28 + rng() * 0.3,
    })
    fi += 1
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 画像：公式拼人物肖像（与科目联动，换科目换脸）                      */
/* ------------------------------------------------------------------ */

export type PortraitPoint = readonly [number, number, number]

/** Uniform line height leaves room for readable formulas; the fragment mask supplies facial tones. */
export function buildPortraitTiles(dimensions: ReadonlyArray<{ wEm: number; hEm: number }>): InstanceParams[] {
  const out: InstanceParams[] = []
  if (!dimensions.length) return out
  const rng = mulberry32(919)
  for (let row = 0; row < 90; row++) {
    let x = -10 + rng() * 0.2
    while (x < 9.8) {
      const formula = Math.floor(rng() * dimensions.length)
      const rect = dimensions[formula]
      const size = 0.245 / rect.hEm
      const width = rect.wEm * size
      if (x + width > 10) break
      out.push({ a: x + width / 2, b: 12.35 - row * 0.277, c: rng(), size, formula, bright: 1 })
      x += width + 0.045
    }
  }
  return out
}

/** 画像帧：assemble 0→1 时公式从四周飞拢拼脸；拼好后轻微呼吸 */
export function portraitFrame(
  x: number,
  y: number,
  _phase: number,
  assemble: number,
  _time: number,
): { pos: [number, number, number] } {
  const ease = 1 - Math.pow(1 - Math.min(1, assemble), 3)
  const z = 0
  const tx = x
  const ty = y
  const l = Math.max(0.6, Math.hypot(tx, ty))
  const sx = tx * 3.4 + (tx / l) * 26
  const sy = ty * 3.4 + (ty / l) * 26
  return { pos: [sx + (tx - sx) * ease, sy + (ty - sy) * ease, z * ease + (1 - ease) * -34] }
}

/* ------------------------------------------------------------------ */
/* 场景几何                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* 穿越：公式当自由体迎面扑来                                           */
/* ------------------------------------------------------------------ */

export const RUSH = {
  corridor: 26,
  zFar: -125,
  zNear: 9,
  mains: 300,
} as const

/** 穿越实例帧：公式沿 +z 朝镜头飞来，z 循环 */
export function rushFrame(
  x0: number,
  y0: number,
  z0: number,
  _seed: number,
  flight: number,
  time = flight / 15.64,
): { pos: [number, number, number]; drift: number } {
  const span = RUSH.zNear - RUSH.zFar
  const z = RUSH.zFar + ((z0 + flight - RUSH.zFar) % span + span) % span
  const drift = Math.sin(time * 0.5 + z0 * 0.13) * 0.7
  return { pos: [x0 + drift, y0 + Math.cos(time * 0.4 + z0 * 0.1) * 0.5, z], drift }
}

/** 穿越实例表：c<1000 主体，c>=1000 为拖尾副本 */
export function buildRushInstances(formulaCount: number, seed = 61): Array<InstanceParams> {
  const rng = mulberry32(seed)
  const out: Array<InstanceParams> = []
  let fi = 0
  for (let i = 0; i < RUSH.mains; i += 1) {
    const ang = rng() * Math.PI * 2
    const rr = 2.5 + Math.pow(rng(), 0.72) * RUSH.corridor
    const x = Math.cos(ang) * rr
    const y = Math.sin(ang) * rr * 0.72
    const z = RUSH.zFar + rng() * (RUSH.zNear - RUSH.zFar)
    const size = 0.62 + rng() * 0.7 + (rng() < 0.06 ? 0.8 : 0)
    const bright = 0.55 + rng() * 0.5 + (rng() < 0.06 ? 0.5 : 0)
    out.push({ a: x, b: y, c: z, size, formula: fi % formulaCount, bright })
    fi += 1 + (rng() < 0.2 ? 1 : 0)
  }
  // 拖尾副本：同一位置、略小更暗，着色器里沿来向回拉
  const main = [...out]
  for (const p of main) {
    out.push({ ...p, size: -p.size * 0.96, bright: p.bright * 0.28 })
  }
  return out
}

export const buildInstances = (scene: SceneId, widthsEm: Array<number>): Array<InstanceParams> => {
  if (scene === 'wormhole') return buildWormholeInstances(widthsEm)
  if (scene === 'rush') return buildRushInstances(widthsEm.length)
  if (scene === 'rain') return buildRainInstances(widthsEm.length)
  return []
}

/** 相机预置：free 默认 + GuideTour 分镜共用 */
export type CameraPreset = {
  /** 虫洞：贴壁程度 0..1（越大越靠近公式墙） */
  hug?: number
  /** 时间流速倍率 */
  speed?: number
  /** 视场角 */
  fov?: number
  /** 额外横向漂移幅度 */
  sway?: number
}

export const SCENE_DEFAULT_PRESET: Record<SceneId, CameraPreset> = {
  wormhole: { hug: 0.32, speed: 1, fov: 74, sway: 1 },
  rush: { hug: 0, speed: 1, fov: 78, sway: 1 },
  rain: { hug: 0, speed: 1, fov: 62, sway: 1 },
  portrait: { hug: 0, speed: 1, fov: 42, sway: 1 },
  blackhole: { speed: 1, fov: 48, sway: 0 },
  mobius: { speed: 1, fov: 48, sway: 0 },
}
