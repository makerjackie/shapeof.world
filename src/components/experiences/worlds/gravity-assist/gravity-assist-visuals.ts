/**
 * 引力弹弓 · 电影级视觉辅助（纯 Canvas 2D，无新依赖）
 *
 * - 多层视差星场（近亮远暗 + 极淡星云），离屏瓦片懒加载，可无缝环绕
 * - 程序化木星：域扭曲正弦色带 + 大红斑漩涡 + 边缘暗角/受光侧渐变 + 微光晕与细环
 * - limbWarp：近行星径向放大（电影式夸张），单调、保角度，只作用于渲染坐标，
 *   物理积分仍在原始世界坐标中进行
 */

type Ctx = CanvasRenderingContext2D

// —— 小工具 ——

/** 确定性伪随机（种子固定，纹理帧间稳定） */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * 近行星径向放大：物理表面 r=rPhys → 可见盘缘 rW，远处渐近恒等。
 * 单调、保方向角，轨迹的偏转结构不变；近表面处 d(渲染)/d(物理) = rPhys/rW ≈ 0.83，
 * 渲染出的「离表面多远」与物理距离几乎 1:1，不再把贴面飞掠压缩成擦边。
 */
export function limbWarp(r: number, rW: number, rPhys: number): number {
  return Math.sqrt(Math.max(r * r + rW * rW - rPhys * rPhys, 1e-9))
}

// —— 多层视差星场 ——

export interface StarLayers {
  size: number
  far: HTMLCanvasElement
  mid: HTMLCanvasElement
  near: HTMLCanvasElement
}

export function createStarLayers(size = 512, seed = 20260718): StarLayers {
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    return c
  }
  const far = mk()
  const mid = mk()
  const near = mk()
  const rnd = mulberry32(seed)

  // 极淡星云（只放远层；3×3 平铺绘制保证瓦片无缝环绕）
  const fctx = far.getContext('2d')!
  const nebulae: Array<[number, number, number, string]> = [
    [0.24, 0.3, 0.42, 'rgba(96,74,168,0.055)'],
    [0.72, 0.62, 0.5, 'rgba(56,108,138,0.05)'],
    [0.55, 0.16, 0.34, 'rgba(150,112,72,0.042)'],
  ]
  for (const [fx, fy, fr, color] of nebulae) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cx = (fx + ox) * size
        const cy = (fy + oy) * size
        const r = fr * size
        const g = fctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        fctx.fillStyle = g
        fctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      }
    }
  }

  // 撒星：边缘处环绕补绘，避免裁切硬边
  const sprinkle = (
    ctx: Ctx,
    count: number,
    rMin: number,
    rMax: number,
    aMin: number,
    aMax: number,
    glints: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const x = rnd() * size
      const y = rnd() * size
      const r = rMin + rnd() * (rMax - rMin)
      const a = aMin + rnd() * (aMax - aMin)
      const warm = rnd()
      const color =
        warm < 0.18 ? `rgba(255,231,196,${a})` : warm < 0.36 ? `rgba(207,228,255,${a})` : `rgba(255,255,255,${a})`
      ctx.fillStyle = color
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const sx = x + ox * size
          const sy = y + oy * size
          if (sx < -r || sx > size + r || sy < -r || sy > size + r) continue
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (i < glints) {
        // 亮星十字光芒
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.35})`
        ctx.lineWidth = 0.7
        const L = r * 5
        ctx.beginPath()
        ctx.moveTo(x - L, y)
        ctx.lineTo(x + L, y)
        ctx.moveTo(x, y - L)
        ctx.lineTo(x, y + L)
        ctx.stroke()
      }
    }
  }
  sprinkle(fctx, 250, 0.3, 0.9, 0.18, 0.5, 0)
  sprinkle(mid.getContext('2d')!, 120, 0.5, 1.2, 0.3, 0.7, 0)
  sprinkle(near.getContext('2d')!, 42, 0.9, 1.8, 0.55, 0.95, 9)
  return { size, far, mid, near }
}

/**
 * 平铺绘制三层星场。parX/parY 为相机视差偏移（px），drift=false 时静止（reduced-motion）。
 */
export function drawStarfield(
  ctx: Ctx,
  layers: StarLayers,
  w: number,
  h: number,
  t: number,
  parX: number,
  parY: number,
  drift: boolean,
): void {
  const draw = (img: HTMLCanvasElement, f: number, vx: number, vy: number) => {
    const size = layers.size
    let ox = (parX * f + (drift ? t * vx : 0)) % size
    let oy = (parY * f + (drift ? t * vy : 0)) % size
    if (ox > 0) ox -= size
    if (oy > 0) oy -= size
    for (let x = ox; x < w; x += size) {
      for (let y = oy; y < h; y += size) {
        ctx.drawImage(img, x, y)
      }
    }
  }
  draw(layers.far, 0.015, 0.6, 0.15)
  draw(layers.mid, 0.04, 1.1, 0.28)
  draw(layers.near, 0.09, 1.9, 0.45)
}

// —— 程序化木星 ——

export interface JupiterTex {
  canvas: HTMLCanvasElement
  size: number
}

const JUP_PALETTE: Array<[number, string]> = [
  [0.0, '#ecdfc4'],
  [0.16, '#c99f6b'],
  [0.3, '#f2e8d4'],
  [0.44, '#b07848'],
  [0.58, '#e7d4ae'],
  [0.72, '#a06c3e'],
  [0.86, '#dcc398'],
  [1.0, '#efe4ca'],
]

const JUP_PALETTE_RGB: Array<[number, number, number, number]> = JUP_PALETTE.map(([u, hex]) => [
  u,
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
])

function paletteAt(u: number): [number, number, number] {
  u = clamp01(u)
  for (let i = 1; i < JUP_PALETTE_RGB.length; i++) {
    if (u <= JUP_PALETTE_RGB[i][0]) {
      const [u0, r0, g0, b0] = JUP_PALETTE_RGB[i - 1]
      const [u1, r1, g1, b1] = JUP_PALETTE_RGB[i]
      const t = smoothstep(0, 1, (u - u0) / (u1 - u0))
      return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t]
    }
  }
  const last = JUP_PALETTE_RGB[JUP_PALETTE_RGB.length - 1]
  return [last[1], last[2], last[3]]
}

/** 生成木星盘面纹理（离屏，懒加载一次；含色带、大红斑、受光/暗角、亮缘） */
export function createJupiter(seed = 7): JupiterTex {
  const N = 448
  const canvas = document.createElement('canvas')
  canvas.width = N
  canvas.height = N
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(N, N)
  const data = img.data
  const rnd = mulberry32(seed)

  // 受光方向：左上
  const lx = -0.52
  const ly = -0.62
  const lz = Math.sqrt(Math.max(0.05, 1 - lx * lx - ly * ly))

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = (y * N + x) * 4
      const nx = ((x + 0.5) / N) * 2 - 1
      const ny = ((y + 0.5) / N) * 2 - 1
      const rr2 = nx * nx + ny * ny
      if (rr2 > 1) {
        data[idx + 3] = 0
        continue
      }
      const rr = Math.sqrt(rr2)
      const nz = Math.sqrt(Math.max(0, 1 - rr2))

      // 水平条纹带：域扭曲正弦
      const v =
        ny * 1.3 +
        0.1 * Math.sin(nx * 2.9 + ny * 1.3) +
        0.055 * Math.sin(nx * 6.3 - ny * 3.1 + 1.7) +
        0.03 * Math.sin(nx * 11.2 + ny * 5.2 + 0.4)
      const u = v * 0.5 + 0.5 + 0.035 * Math.sin(v * 9.0 + nx * 2.0)
      let [r, g, b] = paletteAt(u)

      // 大红斑（南半球 = 画布下方）：椭圆噪声漩涡
      const sx = (nx - 0.3) / 0.27
      const sy = (ny - 0.335) / 0.155
      const sd = sx * sx + sy * sy
      if (sd < 1.3) {
        const ang = Math.atan2(sy, sx)
        const swirl = 0.5 + 0.5 * Math.sin(ang * 2 + (1 - Math.min(sd, 1)) * 5.5)
        const coreT = smoothstep(0.9, 0.2, sd) * (0.65 + 0.35 * swirl)
        const spotR = 182 + (143 - 182) * coreT
        const spotG = 84 + (58 - 84) * coreT
        const spotB = 58 + (38 - 58) * coreT
        // 外圈乳白环
        const ring = Math.exp(-(((sd - 0.86) * 4.4) ** 2)) * 0.55
        const strength = smoothstep(1.15, 0.9, sd) * 0.9
        r += (spotR + (232 - spotR) * ring - r) * strength
        g += (spotG + (205 - spotG) * ring - g) * strength
        b += (spotB + (160 - spotB) * ring - b) * strength
      }

      // 受光侧渐变 + 边缘暗角
      const diff = Math.max(0, nx * lx + ny * ly + nz * lz)
      const shade = 0.26 + 0.92 * Math.pow(diff, 0.9)
      const limb = 0.52 + 0.48 * Math.pow(nz, 0.55)
      const bright = shade * limb
      // 受光侧大气亮缘
      const rim = smoothstep(0.88, 0.995, rr) * Math.min(1, diff * 1.6) * 0.55
      const grain = (rnd() - 0.5) * 7
      r = r * bright + 230 * rim + grain
      g = g * bright + 203 * rim + grain
      b = b * bright + 152 * rim + grain

      data[idx] = Math.max(0, Math.min(255, r))
      data[idx + 1] = Math.max(0, Math.min(255, g))
      data[idx + 2] = Math.max(0, Math.min(255, b))
      data[idx + 3] = 255 * smoothstep(1.0, 0.982, rr)
    }
  }
  ctx.putImageData(img, 0, 0)
  return { canvas, size: N }
}

/** 绘制木星：微光晕（加法）→ 极淡细环 → 盘面 → 掠过光影响应 */
export function drawJupiter(
  ctx: Ctx,
  tex: JupiterTex,
  x: number,
  y: number,
  R: number,
  opts: { halo?: boolean; ring?: boolean; limbGlow?: { angle: number; strength: number } } = {},
): void {
  const { halo = true, ring = true, limbGlow } = opts

  if (halo) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, y, R * 0.85, x, y, R * 2.9)
    g.addColorStop(0, 'rgba(233,197,133,0.20)')
    g.addColorStop(0.42, 'rgba(210,170,115,0.07)')
    g.addColorStop(1, 'rgba(210,170,115,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 2.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (ring) {
    // 木星式极淡细环
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-0.24)
    ctx.scale(1, 0.3)
    ctx.strokeStyle = 'rgba(216,198,160,0.10)'
    ctx.lineWidth = R * 0.045
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.52, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(216,198,160,0.05)'
    ctx.lineWidth = R * 0.1
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.78, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.drawImage(tex.canvas, x - R, y - R, R * 2, R * 2)

  // 掠过瞬间的光影响应（行星盘内暖光散射 + 盘外微辉）
  if (limbGlow && limbGlow.strength > 0.003) {
    const gx = x + Math.cos(limbGlow.angle) * R
    const gy = y + Math.sin(limbGlow.angle) * R
    const a = Math.min(0.5, limbGlow.strength * 0.5)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.clip()
    const g2 = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 1.15)
    g2.addColorStop(0, `rgba(255,222,164,${a})`)
    g2.addColorStop(0.5, `rgba(255,200,140,${a * 0.35})`)
    g2.addColorStop(1, 'rgba(255,200,140,0)')
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.arc(gx, gy, R * 1.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g3 = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.5)
    g3.addColorStop(0, `rgba(255,230,180,${a * 0.8})`)
    g3.addColorStop(1, 'rgba(255,230,180,0)')
    ctx.fillStyle = g3
    ctx.beginPath()
    ctx.arc(gx, gy, R * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// —— 发光轨迹与飞船 ——

/** 加法感发光轨迹：宽低透明辉光 + 窄亮芯 */
export function strokeGlowTrail(
  ctx: Ctx,
  pts: Array<[number, number]>,
  color: string,
  opts: { core?: number; glow?: number; coreAlpha?: number; glowAlpha?: number } = {},
): void {
  if (pts.length < 2) return
  const { core = 1.7, glow = 6, coreAlpha = 0.9, glowAlpha = 0.16 } = opts
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  path()
  ctx.strokeStyle = hexAlpha(color, glowAlpha)
  ctx.lineWidth = glow
  ctx.stroke()
  path()
  ctx.strokeStyle = hexAlpha(color, coreAlpha)
  ctx.lineWidth = core
  ctx.stroke()
  ctx.restore()
}

/** 发光小艇：菱形船体沿速度方向 + 尾部引擎辉光（vx/vy 为屏幕坐标方向） */
export function drawShip(
  ctx: Ctx,
  x: number,
  y: number,
  vx: number,
  vy: number,
  tint = '#4dd0e1',
  alpha = 1,
): void {
  const vm = Math.hypot(vx, vy) || 1
  const ux = vx / vm
  const uy = vy / vm
  const px = -uy
  const py = ux
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'lighter'
  const ex = x - ux * 6
  const ey = y - uy * 6
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 9)
  eg.addColorStop(0, hexAlpha(tint, 0.55))
  eg.addColorStop(1, hexAlpha(tint, 0))
  ctx.fillStyle = eg
  ctx.beginPath()
  ctx.arc(ex, ey, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowColor = tint
  ctx.shadowBlur = 8
  ctx.fillStyle = '#f6f3ea'
  ctx.beginPath()
  ctx.moveTo(x + ux * 7, y + uy * 7)
  ctx.lineTo(x - ux * 2 + px * 3.1, y - uy * 2 + py * 3.1)
  ctx.lineTo(x - ux * 5, y - uy * 5)
  ctx.lineTo(x - ux * 2 - px * 3.1, y - uy * 2 - py * 3.1)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

