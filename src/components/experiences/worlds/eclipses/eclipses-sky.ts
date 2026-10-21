/*
 * 食 · 天空之窗（2D 画布）
 * ==========================================================================
 * 三维舞台讲「影子的几何」，这扇窗讲「站在影子里的人看见什么」。
 * 两件事同屏，因果才连得上——这也是这个世界原来最缺的一环。
 *
 * 全部按 eclipses-model 算出的真实角度绘制，不是示意图：
 * 日面角半径 0.266°、月面 0.245–0.279°，两者的差就是全食与环食的分界。
 * 天光按「照度 ∝ 未被遮的日面，亮度感觉 ≈ 照度^(1/3)」变化，
 * 所以遮到九成天还是亮的，最后一刻才骤然天黑。
 *
 * 取景分两种，都由同一套角度驱动：
 *   wide  —— 广角地表：城市天际线、路灯、地平线；日食在天上只是一枚小环。
 *   close —— 长焦特写：日冕 / 金环占满画面，像那张被放大的照片。
 * 画布里不写任何文字：所有读数与说明都在 DOM 里，由 tx() 双语。
 */

/* 确定性随机：每次渲染的日冕、星野、月海都一样 */
function seededRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 把 LROC 等距圆柱图投成从地球看见的近地面圆盘（北朝上、东在右）。
 * Three.js / NASA 约定：经度 0° 在图中央，对应球的 +X。
 */
export function projectMoonNearSide(img: CanvasImageSource, size = 640) {
  const sw = 'naturalWidth' in img && img.naturalWidth ? img.naturalWidth : (img as HTMLImageElement).width
  const sh = 'naturalHeight' in img && img.naturalHeight ? img.naturalHeight : (img as HTMLImageElement).height
  const src = document.createElement('canvas')
  src.width = sw
  src.height = sh
  const sctx = src.getContext('2d')
  if (!sctx || sw < 2 || sh < 2) return null
  sctx.drawImage(img, 0, 0)
  const srcData = sctx.getImageData(0, 0, sw, sh)
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const octx = out.getContext('2d')
  if (!octx) return null
  const dest = octx.createImageData(size, size)
  for (let j = 0; j < size; j++) {
    const py = 1 - (2 * (j + 0.5)) / size
    for (let i = 0; i < size; i++) {
      const px = (2 * (i + 0.5)) / size - 1
      const r2 = px * px + py * py
      if (r2 > 1) continue
      const x = Math.sqrt(1 - r2)
      const lon = Math.atan2(px, x)
      const lat = Math.asin(py)
      const u = (lon + Math.PI) / (2 * Math.PI)
      const v = 0.5 - lat / Math.PI
      const sx = Math.min(sw - 1, Math.max(0, (u * sw) | 0))
      const sy = Math.min(sh - 1, Math.max(0, (v * sh) | 0))
      const si = (sy * sw + sx) * 4
      const di = (j * size + i) * 4
      dest.data[di] = Math.min(255, srcData.data[si] * 1.55 + 10)
      dest.data[di + 1] = Math.min(255, srcData.data[si + 1] * 1.5 + 8)
      dest.data[di + 2] = Math.min(255, srcData.data[si + 2] * 1.4 + 6)
      dest.data[di + 3] = 255
    }
  }
  octx.putImageData(dest, 0, 0)
  return out
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth01 = (v: number) => {
  const t = clamp(v, 0, 1)
  return t * t * (3 - 2 * t)
}

function rgb(r: number, g: number, b: number, a = 1) {
  return `rgba(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))},${clamp(a, 0, 1).toFixed(3)})`
}

/* ---------------------------------------------------------------- */
/* 预生成的随机结构                                                   */
/* ---------------------------------------------------------------- */

/** 日冕冕流：每条记录角度、长度倍率、宽度、亮度 */
const CORONA_RAYS = (() => {
  const rng = seededRng(0x50134e)
  const count = 168
  const rays: Array<{ angle: number; reach: number; width: number; glow: number }> = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.05
    // 赤道方向的冕流长、两极的极羽短 —— 真实日冕的形态
    const equatorial = Math.pow(Math.abs(Math.cos(angle)), 1.6)
    const reach = 0.55 + equatorial * 1.5 + Math.pow(rng(), 2.2) * 1.35
    rays.push({ angle, reach, width: 0.012 + rng() * 0.052, glow: 0.3 + rng() * 0.7 })
  }
  return rays
})()

/** 三条特别长的大冕流，给日冕一个可读的骨架 */
const CORONA_STREAMERS = [
  { angle: 0.12, reach: 3.4, spread: 0.26 },
  { angle: Math.PI - 0.24, reach: 3.0, spread: 0.3 },
  { angle: Math.PI * 1.42, reach: 2.1, spread: 0.19 },
]

/** 星野：单位圆内的极坐标点 */
const STARS = (() => {
  const rng = seededRng(20260726)
  return Array.from({ length: 220 }, () => ({
    x: rng(),
    y: rng(),
    r: 0.35 + Math.pow(rng(), 3) * 1.5,
    a: 0.25 + rng() * 0.75,
    warm: rng(),
  }))
})()

/** 月海：月面上的暗色斑块 */
const MARIA = (() => {
  const rng = seededRng(19690720)
  return Array.from({ length: 11 }, () => {
    const a = rng() * Math.PI * 2
    const d = Math.pow(rng(), 0.65) * 0.78
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.13 + rng() * 0.26, a: 0.1 + rng() * 0.17 }
  })
})()

/** 环形山：小一些的亮/暗点 */
const CRATERS = (() => {
  const rng = seededRng(0xc7a7e)
  return Array.from({ length: 64 }, () => {
    const a = rng() * Math.PI * 2
    const d = Math.pow(rng(), 0.5) * 0.94
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.012 + Math.pow(rng(), 2) * 0.075, a: 0.1 + rng() * 0.3 }
  })
})()

/** 广角地表用的城市天际线：楼高、窗、路灯都是固定的，只随天光改亮度 */
const CITY = (() => {
  const rng = seededRng(0xc17e5c)
  const buildings: Array<{ x: number; w: number; h: number; windows: number }> = []
  let x = -0.04
  while (x < 1.08) {
    const w = 0.018 + rng() * 0.055
    buildings.push({
      x,
      w,
      h: 0.07 + rng() * 0.2 + (rng() > 0.88 ? 0.16 : 0),
      windows: 4 + Math.floor(rng() * 7),
    })
    x += w + 0.003 + rng() * 0.012
  }
  const lamps = Array.from({ length: 18 }, () => ({
    x: rng() * 0.96 + 0.02,
    h: 0.028 + rng() * 0.018,
  }))
  const hills = Array.from({ length: 5 }, () => ({
    x: rng(),
    w: 0.18 + rng() * 0.34,
    h: 0.04 + rng() * 0.07,
  }))
  return { buildings, lamps, hills }
})()

/* ---------------------------------------------------------------- */
/* 输入                                                             */
/* ---------------------------------------------------------------- */

export type SkyFraming = 'wide' | 'close'

export type SkyView = {
  /** 这一刻该抬头看谁 */
  mode: 'solar' | 'lunar'
  /** wide = 城市广角；close = 日面/月面长焦 */
  framing: SkyFraming
  /** 小窗保留虚线标注；放大成照片时关掉 */
  annotations: boolean

  /* 日食：角度制（弧度） */
  sunAng: number
  moonAng: number
  separation: number
  posAngle: number
  obscuration: number
  totality: number
  annularity: number
  daylight: number

  /* 月食：线性尺度（R⊕，月球所在处的截面） */
  moonR: number
  umbraR: number
  penumbraR: number
  shadowOffset: number
  lunarPosAngle: number
  umbralCoverage: number

  /** 月相 0–1（窗口在没有食的时候当月相窗用） */
  illumination: number
  /** 天空上太阳相对月心的方位角 —— 明暗界线的亮侧朝这个方向 */
  sunPosAngle: number

  time: number
  reducedMotion: boolean

  /** 近地面正射月盘（LROC）；未就绪时退回程序月海 */
  moonDisk?: CanvasImageSource | null
  /** 广角地表照片（只取地平线以下的楼群，天空仍由几何绘制） */
  groundPlate?: CanvasImageSource | null
}

/* ---------------------------------------------------------------- */
/* 主入口                                                           */
/* ---------------------------------------------------------------- */

export function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number, v: SkyView) {
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  if (v.mode === 'solar') paintSolarSky(ctx, w, h, v)
  else paintLunarSky(ctx, w, h, v)
  ctx.restore()
}

/* ---------------------------------------------------------------- */
/* 日食：白天的天空                                                   */
/* ---------------------------------------------------------------- */

function paintSolarSky(ctx: CanvasRenderingContext2D, w: number, h: number, v: SkyView) {
  const S = Math.min(w, h)
  const day = clamp(v.daylight, 0, 1)
  const wide = v.framing === 'wide'
  // 长焦按日面曝光：天空被压成石板灰，金环才站得住，也更接近真实照片
  const skyDay = wide ? day : clamp(day * 0.22 + (1 - Math.max(v.totality, v.annularity, v.obscuration * 0.75)) * 0.28, 0, 0.55)
  const horizonY = wide ? h * (v.groundPlate ? 0.66 : 0.68) : h * 0.9

  /* —— 天穹：白昼蓝 → 食甚时的石板灰蓝（广角照片里那种白天的黄昏） —— */
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
  sky.addColorStop(0, rgb(mix(18, 44, skyDay), mix(24, 104, skyDay), mix(38, 178, skyDay)))
  sky.addColorStop(0.55, rgb(mix(32, 96, skyDay), mix(38, 150, skyDay), mix(52, 208, skyDay)))
  sky.addColorStop(1, rgb(mix(48, 168, skyDay), mix(52, 198, skyDay), mix(64, 226, skyDay)))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, horizonY)

  /* —— 星星：天光掉到一定程度才浮现（真实观测里要接近全食才看得见）—— */
  const starF = smooth01((0.42 - day) / 0.4)
  if (starF > 0.01) {
    ctx.globalCompositeOperation = 'lighter'
    for (const s of STARS) {
      const x = s.x * w
      const y = s.y * horizonY
      const flick = v.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(v.time * 2.1 + s.x * 40 + s.y * 25)
      const warm = s.warm > 0.86
      ctx.fillStyle = rgb(warm ? 255 : 226, warm ? 232 : 236, warm ? 206 : 255, s.a * starF * flick)
      ctx.beginPath()
      ctx.arc(x, y, s.r * (S / 260), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /* —— 地平线上的 360° 晚霞：食甚时四面八方都像日落 —— */
  const sunsetF = Math.max(v.totality, v.annularity * 0.55, smooth01((v.obscuration - 0.7) / 0.3) * 0.45)
  if (sunsetF > 0.01) {
    const band = ctx.createLinearGradient(0, horizonY - S * 0.34, 0, horizonY)
    band.addColorStop(0, rgb(255, 120, 60, 0))
    band.addColorStop(0.55, rgb(255, 132, 62, 0.16 * sunsetF))
    band.addColorStop(1, rgb(255, 176, 96, 0.5 * sunsetF))
    ctx.fillStyle = band
    ctx.fillRect(0, horizonY - S * 0.34, w, S * 0.34)
  }

  /* —— 日月：按真实角半径换算成像素 ——
     广角：日面只占天空一小枚，像站在屋顶上抬头。
     长焦：食正在发生时日面占住画面；角距很大时自动拉远，
     好让「月亮从太阳上方 5° 空过」真的能被看见。 */
  const framed = wide
    ? v.sunAng / 0.07
    : Math.max(v.sunAng * 3.4, Math.min(v.separation + v.moonAng * 3, v.sunAng * 26))
  const k = (S * (wide ? 0.5 : 0.4)) / framed
  const sunR = v.sunAng * k
  const moonR = v.moonAng * k
  const sep = v.separation * k
  const cx = w * 0.5
  const cy = wide ? horizonY * 0.42 : horizonY * 0.46
  const mx = cx + Math.cos(v.posAngle) * sep
  const my = cy - Math.sin(v.posAngle) * sep

  const hidden = Math.max(v.totality, 0)
  const exposed = 1 - hidden

  /* 外层光晕：随遮掩变弱，全食时彻底消失 */
  const glowF = clamp(1 - v.obscuration * 0.55, 0, 1) * exposed
  if (glowF > 0.01) {
    const glow = ctx.createRadialGradient(cx, cy, sunR * 0.6, cx, cy, sunR * 7)
    glow.addColorStop(0, rgb(255, 246, 214, 0.5 * glowF))
    glow.addColorStop(0.16, rgb(255, 226, 158, 0.2 * glowF))
    glow.addColorStop(0.45, rgb(255, 190, 110, 0.06 * glowF))
    glow.addColorStop(1, rgb(255, 170, 90, 0))
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, sunR * 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  /* 日面：临边昏暗 */
  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR)
  disc.addColorStop(0, rgb(255, 253, 246))
  disc.addColorStop(0.72, rgb(255, 243, 214))
  disc.addColorStop(0.93, rgb(255, 216, 150))
  disc.addColorStop(1, rgb(255, 186, 110))
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2)
  ctx.fill()

  /* 日冕：只在全食时浮现，画在月面之下、日面之上 */
  if (v.totality > 0.01) paintCorona(ctx, cx, cy, sunR, moonR, v)

  /* 月面剪影：压在日面上，就是「被咬掉一口」的那口 */
  const earthshine = 0.04 + v.totality * 0.05
  ctx.fillStyle = rgb(12, 12, 18, 1)
  ctx.beginPath()
  ctx.arc(mx, my, moonR, 0, Math.PI * 2)
  ctx.fill()
  const shine = ctx.createRadialGradient(mx, my, 0, mx, my, moonR)
  shine.addColorStop(0, rgb(70, 74, 96, earthshine * 6))
  shine.addColorStop(1, rgb(40, 44, 60, earthshine * 2))
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.arc(mx, my, moonR, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  /* 环食的金环边缘再补一道锐利高光 */
  if (v.annularity > 0.02) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = rgb(255, 236, 186, 0.55 * v.annularity)
    ctx.lineWidth = Math.max(1, sunR * 0.05)
    ctx.beginPath()
    ctx.arc(cx, cy, sunR * 0.985, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }

  paintContactSparks(ctx, cx, cy, sunR, mx, my, moonR, v)

  if (v.annotations) {
    ctx.setLineDash([sunR * 0.13, sunR * 0.13])
    ctx.strokeStyle = rgb(255, 236, 200, 0.3 + 0.35 * v.totality)
    ctx.lineWidth = Math.max(1, S * 0.004)
    ctx.beginPath()
    ctx.arc(cx, cy, sunR, 0, Math.PI * 2)
    ctx.stroke()
    if (v.separation > v.sunAng + v.moonAng * 1.2) {
      ctx.strokeStyle = rgb(206, 216, 240, 0.34)
      ctx.lineWidth = Math.max(1, S * 0.0035)
      ctx.beginPath()
      ctx.arc(mx, my, Math.max(moonR, S * 0.012), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  /* 广角才画城市：有地表照片时只取地平线以下的楼群，天空仍由几何绘制 */
  if (wide) paintHorizon(ctx, w, h, horizonY, day, sunsetF, v)
  else {
    const ground = ctx.createLinearGradient(0, horizonY, 0, h)
    ground.addColorStop(0, rgb(mix(14, 62, day), mix(16, 66, day), mix(22, 72, day)))
    ground.addColorStop(1, rgb(mix(5, 22, day), mix(6, 24, day), mix(9, 28, day)))
    ctx.fillStyle = ground
    ctx.fillRect(0, horizonY, w, h - horizonY)
  }
}

function paintHorizonPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  img: CanvasImageSource,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, horizonY, w, h - horizonY)
  ctx.clip()
  ctx.drawImage(img, 0, 0, w, h)
  ctx.restore()
}

function paintHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  day: number,
  sunsetF: number,
  v: SkyView,
) {
  if (v.groundPlate) {
    paintHorizonPlate(ctx, w, h, horizonY, v.groundPlate)
    if (v.mode === 'solar' && day < 0.92) {
      ctx.fillStyle = rgb(8, 10, 22, (1 - day) * 0.58)
      ctx.fillRect(0, horizonY - 4, w, h - horizonY + 4)
    }
    return
  }
  paintCity(ctx, w, h, horizonY, day, sunsetF, v)
}

function paintCity(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  day: number,
  sunsetF: number,
  v: SkyView,
) {
  const groundH = h - horizonY
  const dusk = 1 - day
  const lampF = clamp(dusk * 1.15 + v.totality * 0.35 + v.annularity * 0.2, 0, 1)

  const ground = ctx.createLinearGradient(0, horizonY, 0, h)
  ground.addColorStop(0, rgb(mix(18, 58, day), mix(20, 62, day), mix(26, 68, day)))
  ground.addColorStop(1, rgb(mix(6, 18, day), mix(7, 20, day), mix(10, 24, day)))
  ctx.fillStyle = ground
  ctx.fillRect(0, horizonY, w, groundH)

  /* 远山剪影 */
  ctx.fillStyle = rgb(mix(10, 36, day), mix(12, 40, day), mix(18, 46, day), 0.95)
  ctx.beginPath()
  ctx.moveTo(0, horizonY)
  for (const hill of CITY.hills) {
    ctx.ellipse(hill.x * w, horizonY, hill.w * w, hill.h * groundH * 2.4, 0, Math.PI, 0, true)
  }
  ctx.lineTo(w, horizonY)
  ctx.closePath()
  ctx.fill()

  /* 楼群 */
  for (const b of CITY.buildings) {
    const bx = b.x * w
    const bw = Math.max(3, b.w * w)
    const bh = b.h * h
    const by = horizonY - bh * 0.72
    ctx.fillStyle = rgb(mix(8, 28, day), mix(10, 32, day), mix(14, 38, day))
    ctx.fillRect(bx, by, bw, horizonY - by + 1)

    const windowF = clamp(lampF * 0.9 + dusk * 0.35, 0, 1)
    if (windowF < 0.04 || bw < 4) continue
    const cols = Math.max(2, Math.floor(b.windows * 0.45))
    const rows = Math.max(3, Math.floor(bh / 9))
    const padX = bw * 0.18
    const padY = bh * 0.12
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const on = ((row * 13 + col * 7 + Math.floor(b.x * 80)) % 5) !== 0
        if (!on) continue
        const wx = bx + padX + (col / Math.max(1, cols - 1)) * (bw - padX * 2)
        const wy = by + padY + (row / Math.max(1, rows - 1)) * (bh * 0.72 - padY)
        ctx.fillStyle = rgb(255, 196, 110, 0.22 + 0.55 * windowF)
        ctx.fillRect(wx, wy, Math.max(1.2, bw * 0.08), Math.max(1.4, bh * 0.035))
      }
    }
  }

  /* 路灯：天一暗就成了画面里最暖的东西 */
  if (lampF > 0.04) {
    ctx.globalCompositeOperation = 'lighter'
    for (const lamp of CITY.lamps) {
      const lx = lamp.x * w
      const ly = horizonY - lamp.h * h * 0.15
      const pulse = v.reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(v.time * 1.3 + lamp.x * 20)
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 18 * lampF)
      g.addColorStop(0, rgb(255, 214, 140, 0.7 * lampF * pulse))
      g.addColorStop(0.35, rgb(255, 170, 80, 0.22 * lampF))
      g.addColorStop(1, rgb(255, 140, 60, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(lx, ly, 18 * lampF, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgb(255, 220, 160, 0.85 * lampF)
      ctx.fillRect(lx - 0.7, ly, 1.4, horizonY - ly + 2)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  if (sunsetF > 0.08) {
    const wash = ctx.createLinearGradient(0, horizonY - 8, 0, horizonY + groundH * 0.35)
    wash.addColorStop(0, rgb(255, 150, 80, 0.1 * sunsetF))
    wash.addColorStop(1, rgb(255, 120, 60, 0))
    ctx.fillStyle = wash
    ctx.fillRect(0, horizonY - 8, w, groundH * 0.4)
  }
}

/** 日冕：赤道冕流 + 极羽 + 内冕环，加法混色 */
function paintCorona(ctx: CanvasRenderingContext2D, cx: number, cy: number, sunR: number, moonR: number, v: SkyView) {
  const f = v.totality
  const base = Math.max(sunR, moonR)
  const pulse = v.reducedMotion ? 1 : 0.94 + 0.06 * Math.sin(v.time * 0.7)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(cx, cy)

  /* 内冕：贴着月缘的一圈明亮光环 */
  const inner = ctx.createRadialGradient(0, 0, base * 0.98, 0, 0, base * 2.1)
  inner.addColorStop(0, rgb(255, 252, 240, 0.62 * f))
  inner.addColorStop(0.25, rgb(226, 236, 255, 0.26 * f))
  inner.addColorStop(1, rgb(180, 206, 255, 0))
  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.arc(0, 0, base * 2.1, 0, Math.PI * 2)
  ctx.fill()

  /* 三条大冕流：宽而长的扇形 */
  for (const s of CORONA_STREAMERS) {
    const reach = base * s.reach * pulse
    const g = ctx.createRadialGradient(0, 0, base, 0, 0, reach)
    g.addColorStop(0, rgb(240, 246, 255, 0.2 * f))
    g.addColorStop(0.4, rgb(206, 224, 255, 0.075 * f))
    g.addColorStop(1, rgb(170, 200, 255, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, reach, s.angle - s.spread, s.angle + s.spread)
    ctx.closePath()
    ctx.fill()
  }

  /* 细冕流：一根根从月缘拉出去的丝 */
  ctx.lineCap = 'round'
  for (const ray of CORONA_RAYS) {
    const reach = base * ray.reach * pulse
    const x0 = Math.cos(ray.angle) * base * 0.99
    const y0 = Math.sin(ray.angle) * base * 0.99
    const x1 = Math.cos(ray.angle) * reach
    const y1 = Math.sin(ray.angle) * reach
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, rgb(255, 251, 238, 0.34 * f * ray.glow))
    g.addColorStop(0.35, rgb(216, 230, 255, 0.13 * f * ray.glow))
    g.addColorStop(1, rgb(176, 202, 255, 0))
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.6, base * ray.width)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
}

/** 钻石环与贝利珠：最后一线阳光从月球边缘的山谷里漏出来 */
function paintContactSparks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sunR: number,
  mx: number,
  my: number,
  moonR: number,
  v: SkyView,
) {
  if (v.moonAng < v.sunAng) return // 环食没有钻石环
  const contact = moonR - sunR // 第二次接触时的圆心距（像素）
  const d = Math.hypot(mx - cx, my - cy)
  // 只在接触前后极窄的一段出现
  const near = 1 - smooth01(Math.abs(d - contact) / Math.max(sunR * 0.42, 1))
  if (near < 0.02 || v.obscuration < 0.82) return
  const strength = near * smooth01((v.obscuration - 0.82) / 0.16)
  if (strength < 0.02) return

  // 最后一线阳光的方向：从月心指向日心的反向
  const ang = Math.atan2(cy - my, cx - mx)
  const px = mx + Math.cos(ang) * moonR
  const py = my + Math.sin(ang) * moonR
  const flick = v.reducedMotion ? 1 : 0.78 + 0.22 * Math.sin(v.time * 13)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  /* 贝利珠：沿月缘散开的几颗亮点 */
  const beads = 7
  for (let i = 0; i < beads; i++) {
    const spread = (i / (beads - 1) - 0.5) * 0.72
    const a = ang + spread
    const bx = mx + Math.cos(a) * moonR
    const by = my + Math.sin(a) * moonR
    const fall = 1 - Math.abs(spread) / 0.4
    if (fall <= 0) continue
    const r = sunR * (0.05 + 0.05 * fall)
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r * 3)
    g.addColorStop(0, rgb(255, 252, 240, 0.95 * strength * fall * flick))
    g.addColorStop(0.3, rgb(255, 234, 190, 0.4 * strength * fall))
    g.addColorStop(1, rgb(255, 210, 150, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(bx, by, r * 3, 0, Math.PI * 2)
    ctx.fill()
  }

  /* 钻石：一颗亮核 + 水平眩光 */
  const core = ctx.createRadialGradient(px, py, 0, px, py, sunR * 1.5)
  core.addColorStop(0, rgb(255, 255, 252, strength * flick))
  core.addColorStop(0.18, rgb(255, 244, 214, 0.6 * strength))
  core.addColorStop(1, rgb(255, 214, 160, 0))
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(px, py, sunR * 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(px, py)
  ctx.scale(1, 0.05)
  const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, sunR * 6)
  streak.addColorStop(0, rgb(255, 252, 240, 0.8 * strength * flick))
  streak.addColorStop(0.5, rgb(255, 230, 180, 0.22 * strength))
  streak.addColorStop(1, rgb(255, 210, 150, 0))
  ctx.fillStyle = streak
  ctx.beginPath()
  ctx.arc(0, 0, sunR * 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
}

/* ---------------------------------------------------------------- */
/* 月食：夜里的天空                                                   */
/* ---------------------------------------------------------------- */

function paintLunarSky(ctx: CanvasRenderingContext2D, w: number, h: number, v: SkyView) {
  const S = Math.min(w, h)
  const wide = v.framing === 'wide'
  const horizonY = wide ? h * (v.groundPlate ? 0.66 : 0.7) : h

  /* 夜空 */
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
  sky.addColorStop(0, rgb(6, 8, 20))
  sky.addColorStop(0.7, rgb(9, 12, 28))
  sky.addColorStop(1, rgb(14, 16, 32))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  /* 星野：月全食时月光让位，星星更亮 */
  const starF = 0.45 + 0.55 * v.umbralCoverage
  ctx.globalCompositeOperation = 'lighter'
  for (const s of STARS) {
    const y = s.y * (wide ? horizonY : h)
    if (wide && y > horizonY - 4) continue
    const flick = v.reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(v.time * 1.9 + s.x * 37 + s.y * 21)
    const warm = s.warm > 0.86
    ctx.fillStyle = rgb(warm ? 255 : 224, warm ? 230 : 234, warm ? 204 : 255, s.a * starF * flick)
    ctx.beginPath()
    ctx.arc(s.x * w, y, s.r * (S / 260), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  /* 月面：广角挂在城市上空，长焦让血月占满画面 */
  const moonR = S * (wide ? 0.11 : 0.32)
  const k = moonR / Math.max(v.moonR, 1e-6)
  const cx = w * 0.5
  const cy = wide ? horizonY * 0.4 : h * 0.46

  // 月光散射的柔和光环（进本影后消失）
  const halo = 1 - v.umbralCoverage
  if (halo > 0.02) {
    const g = ctx.createRadialGradient(cx, cy, moonR, cx, cy, moonR * 4.2)
    g.addColorStop(0, rgb(198, 208, 236, 0.16 * halo))
    g.addColorStop(0.4, rgb(170, 184, 220, 0.05 * halo))
    g.addColorStop(1, rgb(150, 168, 210, 0))
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, moonR * 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  /* 地影的虚线轮廓：地球的影子比月球宽得多，
     所以月全食能持续一个多小时，而日全食只有几分钟 */
  const sx = cx + Math.cos(v.lunarPosAngle) * v.shadowOffset * k
  const sy = cy - Math.sin(v.lunarPosAngle) * v.shadowOffset * k
  const umbraPx = v.umbraR * k
  const penumbraPx = v.penumbraR * k
  if (v.annotations && umbraPx > 0 && umbraPx < S * 6) {
    ctx.setLineDash([S * 0.02, S * 0.022])
    ctx.strokeStyle = rgb(190, 150, 130, 0.24)
    ctx.lineWidth = Math.max(1, S * 0.0045)
    ctx.beginPath()
    ctx.arc(sx, sy, umbraPx, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = rgb(150, 160, 190, 0.13)
    ctx.beginPath()
    ctx.arc(sx, sy, penumbraPx, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  /* 月盘本体 */
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, moonR, 0, Math.PI * 2)
  ctx.clip()

  if (v.moonDisk) {
    ctx.drawImage(v.moonDisk, cx - moonR, cy - moonR, moonR * 2, moonR * 2)
  } else {
    const body = ctx.createRadialGradient(cx - moonR * 0.25, cy - moonR * 0.25, moonR * 0.1, cx, cy, moonR * 1.08)
    body.addColorStop(0, rgb(236, 234, 226))
    body.addColorStop(0.68, rgb(206, 204, 197))
    body.addColorStop(1, rgb(158, 156, 150))
    ctx.fillStyle = body
    ctx.fillRect(cx - moonR, cy - moonR, moonR * 2, moonR * 2)

    for (const m of MARIA) {
      const g = ctx.createRadialGradient(cx + m.x * moonR, cy + m.y * moonR, 0, cx + m.x * moonR, cy + m.y * moonR, m.r * moonR)
      g.addColorStop(0, rgb(112, 112, 112, m.a))
      g.addColorStop(1, rgb(112, 112, 112, 0))
      ctx.fillStyle = g
      ctx.fillRect(cx - moonR, cy - moonR, moonR * 2, moonR * 2)
    }
    for (const c of CRATERS) {
      ctx.fillStyle = rgb(86, 84, 80, c.a * 0.55)
      ctx.beginPath()
      ctx.arc(cx + c.x * moonR, cy + c.y * moonR, c.r * moonR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = rgb(244, 242, 236, c.a * 0.4)
      ctx.lineWidth = Math.max(0.5, c.r * moonR * 0.34)
      ctx.beginPath()
      ctx.arc(cx + c.x * moonR, cy + c.y * moonR, c.r * moonR * 0.9, Math.PI * 0.7, Math.PI * 1.8)
      ctx.stroke()
    }
  }

  /* 月相明暗界线：没有食的时候这扇窗就是一扇月相窗。
     明暗界线是一条半椭圆，短半轴 = |1−2f|·R；f<0.5 时它凸向亮侧，f>0.5 时凸向暗侧。
     亮侧方向直接取太阳在这一帧的真实方位角，不靠约定。 */
  if (v.illumination < 0.985) {
    const f = clamp(v.illumination, 0, 1)
    const a = Math.abs(1 - 2 * f) * moonR
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-v.sunPosAngle) // 转成「亮侧在右」
    ctx.fillStyle = rgb(7, 8, 16, 0.95)
    ctx.beginPath()
    ctx.arc(0, 0, moonR, Math.PI / 2, -Math.PI / 2, false) // 暗侧半圆：下 → 左 → 上
    ctx.ellipse(0, 0, a, moonR, 0, -Math.PI / 2, Math.PI / 2, f > 0.5) // 界线：上 → 下
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /* 地影落在月面上：半影只是压暗，本影把月面染成暗红铜色。
     有真实 LROC 月盘时乘数留浅，月海才压得出来。 */
  if (umbraPx > 0) {
    ctx.globalCompositeOperation = 'multiply'
    const pen = ctx.createRadialGradient(sx, sy, umbraPx, sx, sy, Math.max(penumbraPx, umbraPx * 1.01))
    pen.addColorStop(0, v.moonDisk ? rgb(210, 210, 220) : rgb(96, 96, 108))
    pen.addColorStop(0.45, v.moonDisk ? rgb(236, 236, 242) : rgb(170, 172, 184))
    pen.addColorStop(1, rgb(255, 255, 255))
    ctx.fillStyle = pen
    ctx.fillRect(cx - moonR, cy - moonR, moonR * 2, moonR * 2)

    const umb = ctx.createRadialGradient(sx, sy, 0, sx, sy, umbraPx)
    if (v.moonDisk) {
      umb.addColorStop(0, rgb(210, 128, 92))
      umb.addColorStop(0.62, rgb(230, 158, 118))
      umb.addColorStop(1, rgb(255, 214, 190))
    } else {
      umb.addColorStop(0, rgb(96, 26, 16))
      umb.addColorStop(0.55, rgb(132, 40, 22))
      umb.addColorStop(0.86, rgb(186, 74, 40))
      umb.addColorStop(0.97, rgb(150, 108, 96))
      umb.addColorStop(1, rgb(96, 96, 108))
    }
    ctx.fillStyle = umb
    ctx.beginPath()
    ctx.arc(sx, sy, umbraPx, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    if (v.umbralCoverage > 0.05) {
      ctx.globalCompositeOperation = 'lighter'
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, umbraPx)
      glow.addColorStop(0, rgb(120, 30, 14, 0.22 * v.umbralCoverage))
      glow.addColorStop(0.8, rgb(150, 52, 24, 0.1 * v.umbralCoverage))
      glow.addColorStop(1, rgb(160, 60, 30, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(sx, sy, umbraPx, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  ctx.restore()

  /* 月缘 */
  ctx.strokeStyle = rgb(255, 250, 240, 0.1)
  ctx.lineWidth = Math.max(1, S * 0.003)
  ctx.beginPath()
  ctx.arc(cx, cy, moonR, 0, Math.PI * 2)
  ctx.stroke()

  if (wide) paintHorizon(ctx, w, h, horizonY, 0.02, 0.12 + v.umbralCoverage * 0.2, v)
}
