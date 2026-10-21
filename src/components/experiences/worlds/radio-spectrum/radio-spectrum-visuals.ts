/**
 * 电磁频谱地图 · 绘制件
 * 这里只画图，不产生任何文案：所有可见文字都由组件用 tx() 译好后传进来。
 */

import {
  DIFFRACTION_GEOMETRY,
  LOTS,
  WALL_MATERIALS,
  diffractionLossDb,
  formatLength,
  nearestObject,
  visibleColour,
  wallLossDb,
  wavelength,
  type ScaleObject,
  type ScaleObjectShape,
  type SpectrumLot,
} from './radio-spectrum-data'

const TAU = Math.PI * 2

export const INK = {
  paper: 'rgba(238, 233, 224, 0.9)',
  soft: 'rgba(232, 226, 214, 0.5)',
  faint: 'rgba(226, 220, 208, 0.24)',
  hair: 'rgba(226, 220, 208, 0.12)',
  beam: '255, 233, 186',
  wave: '255, 206, 122',
} as const

export const MONO = 'ui-monospace, "SF Mono", "Roboto Mono", monospace'
export const SANS = "'Manrope', 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif"

export function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value))
}

/** 参照物的真实长宽比（米）。物体一律按同一比例尺画在同一条地面上。 */
const SHAPE_ASPECT: Record<ScaleObjectShape, { w: number; h: number }> = {
  mountain: { w: 2.4, h: 1 },
  tower: { w: 0.34, h: 1 },
  building: { w: 0.62, h: 1 },
  bus: { w: 1, h: 0.26 },
  person: { w: 0.28, h: 1 },
  hand: { w: 0.55, h: 1 },
  coin: { w: 1, h: 1 },
  rice: { w: 1, h: 0.36 },
  hair: { w: 26, h: 1 },
  cell: { w: 1, h: 0.34 },
  virus: { w: 1, h: 1 },
}

/**
 * 把参照物画在 (x, groundY) 上，size 是它的特征尺寸对应的像素数。
 * 全是细线剪影，不用贴图也不用 emoji。
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ScaleObjectShape,
  x: number,
  groundY: number,
  size: number,
  alpha: number,
) {
  const aspect = SHAPE_ASPECT[shape]
  const h = size * aspect.h
  const w = size * aspect.w
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = 'rgba(226, 220, 208, 0.62)'
  ctx.fillStyle = 'rgba(226, 220, 208, 0.13)'
  ctx.lineWidth = 1.15
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.translate(x, groundY)

  switch (shape) {
    case 'mountain': {
      ctx.beginPath()
      ctx.moveTo(-w / 2, 0)
      ctx.lineTo(-w * 0.17, -h * 0.72)
      ctx.lineTo(-w * 0.05, -h * 0.58)
      ctx.lineTo(0, -h)
      ctx.lineTo(w * 0.14, -h * 0.62)
      ctx.lineTo(w * 0.26, -h * 0.74)
      ctx.lineTo(w / 2, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-w * 0.09, -h * 0.78)
      ctx.lineTo(0, -h)
      ctx.lineTo(w * 0.08, -h * 0.79)
      ctx.stroke()
      break
    }
    case 'tower': {
      ctx.beginPath()
      ctx.moveTo(-w / 2, 0)
      ctx.quadraticCurveTo(-w * 0.13, -h * 0.5, -w * 0.05, -h * 0.9)
      ctx.lineTo(0, -h)
      ctx.lineTo(w * 0.05, -h * 0.9)
      ctx.quadraticCurveTo(w * 0.13, -h * 0.5, w / 2, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      for (let i = 1; i <= 3; i += 1) {
        const t = i / 4
        const half = (w / 2) * (1 - t) ** 1.7 + w * 0.05
        ctx.beginPath()
        ctx.moveTo(-half, -h * t)
        ctx.lineTo(half, -h * t)
        ctx.stroke()
      }
      break
    }
    case 'building': {
      ctx.beginPath()
      ctx.rect(-w / 2, -h, w, h)
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.55
      const columns = 3
      const rows = Math.max(3, Math.round(h / (size * 0.1)))
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < columns; c += 1) {
          if ((r * 7 + c * 3) % 5 === 0) continue
          const cellW = w / (columns * 2 + 1)
          const cellH = h / (rows * 2 + 1)
          ctx.fillRect(-w / 2 + cellW * (1 + c * 2), -h + cellH * (1 + r * 2), cellW, cellH)
        }
      }
      break
    }
    case 'bus': {
      const body = h
      ctx.beginPath()
      ctx.moveTo(-w / 2, -body * 0.18)
      ctx.lineTo(-w / 2, -body * 0.92)
      ctx.quadraticCurveTo(-w / 2, -body, -w * 0.44, -body)
      ctx.lineTo(w * 0.44, -body)
      ctx.quadraticCurveTo(w / 2, -body, w / 2, -body * 0.92)
      ctx.lineTo(w / 2, -body * 0.18)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-w * 0.44, -body * 0.62)
      ctx.lineTo(w * 0.44, -body * 0.62)
      ctx.stroke()
      for (const cx of [-w * 0.29, w * 0.29]) {
        ctx.beginPath()
        ctx.arc(cx, -body * 0.16, body * 0.19, 0, TAU)
        ctx.stroke()
      }
      break
    }
    case 'person': {
      ctx.beginPath()
      ctx.arc(0, -h * 0.88, h * 0.12, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -h * 0.76)
      ctx.lineTo(0, -h * 0.38)
      ctx.moveTo(0, -h * 0.68)
      ctx.lineTo(-w * 0.5, -h * 0.44)
      ctx.moveTo(0, -h * 0.68)
      ctx.lineTo(w * 0.5, -h * 0.44)
      ctx.moveTo(0, -h * 0.38)
      ctx.lineTo(-w * 0.36, 0)
      ctx.moveTo(0, -h * 0.38)
      ctx.lineTo(w * 0.36, 0)
      ctx.stroke()
      break
    }
    case 'hand': {
      ctx.beginPath()
      ctx.moveTo(-w * 0.42, 0)
      ctx.quadraticCurveTo(-w * 0.52, -h * 0.4, -w * 0.4, -h * 0.56)
      ctx.lineTo(-w * 0.46, -h * 0.86)
      ctx.quadraticCurveTo(-w * 0.3, -h * 0.94, -w * 0.22, -h * 0.7)
      ctx.lineTo(-w * 0.16, -h * 0.98)
      ctx.quadraticCurveTo(0, -h * 1.04, w * 0.04, -h * 0.74)
      ctx.lineTo(w * 0.16, -h)
      ctx.quadraticCurveTo(w * 0.32, -h * 0.98, w * 0.3, -h * 0.66)
      ctx.lineTo(w * 0.44, -h * 0.82)
      ctx.quadraticCurveTo(w * 0.56, -h * 0.68, w * 0.42, -h * 0.4)
      ctx.quadraticCurveTo(w * 0.34, 0, 0, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'coin': {
      ctx.beginPath()
      ctx.arc(0, -h / 2, h / 2, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -h / 2, h * 0.34, 0, TAU)
      ctx.stroke()
      break
    }
    case 'rice': {
      ctx.beginPath()
      ctx.ellipse(0, -h / 2, w / 2, h / 2, -0.25, 0, TAU)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'hair': {
      ctx.beginPath()
      for (let i = 0; i <= 40; i += 1) {
        const t = i / 40
        const px = -w / 2 + w * t
        const py = -h / 2 + Math.sin(t * 5.4) * h * 1.6
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.lineWidth = Math.max(1, h)
      ctx.stroke()
      break
    }
    case 'cell': {
      const radius = h / 2
      ctx.beginPath()
      ctx.moveTo(-w / 2 + radius, -h)
      ctx.lineTo(w / 2 - radius, -h)
      ctx.arc(w / 2 - radius, -radius, radius, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(-w / 2 + radius, 0)
      ctx.arc(-w / 2 + radius, -radius, radius, Math.PI / 2, -Math.PI / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i <= 24; i += 1) {
        const t = i / 24
        const px = w / 2 + w * 0.5 * t
        const py = -radius + Math.sin(t * 9) * radius * 0.8
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      break
    }
    case 'virus': {
      const radius = h / 2
      ctx.beginPath()
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * TAU
        const px = Math.cos(angle) * radius
        const py = -radius + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * TAU + 0.39
        ctx.beginPath()
        ctx.moveTo(Math.cos(angle) * radius, -radius + Math.sin(angle) * radius)
        ctx.lineTo(Math.cos(angle) * radius * 1.35, -radius + Math.sin(angle) * radius * 1.35)
        ctx.stroke()
      }
      break
    }
  }
  ctx.restore()
}

export type PanelBox = {
  x0: number
  x1: number
  top: number
  bottom: number
  mobile: boolean
}

function panelTitle(ctx: CanvasRenderingContext2D, box: PanelBox, text: string, right?: string) {
  ctx.save()
  ctx.font = `500 ${box.mobile ? 9 : 10}px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = INK.faint
  ctx.fillText(text, box.x0, box.top)
  if (right) {
    ctx.textAlign = 'right'
    ctx.fillText(right, box.x1, box.top)
  }
  ctx.restore()
}

export type WaveLabels = {
  title: string
  ruler: string
  object: string
}

/**
 * 波长实感：面板的物理宽度自动换档，让十来个真实波长恰好铺满，
 * 参照物按同一比例尺站在同一条地面上。
 */
export function drawWavePanel(
  ctx: CanvasRenderingContext2D,
  box: PanelBox,
  frequency: number,
  time: number,
  reveal: number,
  labels: WaveLabels,
) {
  const width = box.x1 - box.x0
  const height = box.bottom - box.top
  if (width < 60 || height < 50) return
  const lambda = wavelength(frequency)

  // 面板宽度取 1/2/5 × 10^k 米，让十来个真实波长恰好铺满，参照物也才放得下
  const target = lambda * 13
  const exponent = Math.floor(Math.log10(target))
  const base = 10 ** exponent
  const normalised = target / base
  const spanMetres = (normalised > 5 ? 10 : normalised > 2 ? 5 : normalised > 1 ? 2 : 1) * base
  const pxPerMetre = width / spanMetres

  const groundY = box.bottom - (box.mobile ? 24 : 28)
  const waveY = box.top + height * (box.mobile ? 0.36 : 0.4)
  const amp = Math.min(height * 0.17, box.mobile ? 19 : 28)

  panelTitle(ctx, box, labels.title)

  ctx.save()
  ctx.globalAlpha = reveal
  // 参照物按真实比例画，可能比面板还高——剪掉超出的部分，绝不让它爬到街上去
  ctx.beginPath()
  ctx.rect(box.x0 - 6, box.top + 10, width + 12, box.bottom - box.top - 10)
  ctx.clip()

  // 地面
  ctx.strokeStyle = INK.hair
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(box.x0, groundY)
  ctx.lineTo(box.x1, groundY)
  ctx.stroke()

  // 真波：空间周期就是当前波长，随时间向右流
  const phase = time * 1.1
  const step = Math.max(1, Math.floor(width / 420))
  ctx.beginPath()
  for (let px = 0; px <= width; px += step) {
    const metres = px / pxPerMetre
    const y = waveY - Math.sin((metres / lambda) * TAU - phase) * amp
    if (px === 0) ctx.moveTo(box.x0 + px, y)
    else ctx.lineTo(box.x0 + px, y)
  }
  const fade = ctx.createLinearGradient(box.x0, 0, box.x1, 0)
  fade.addColorStop(0, `rgba(${INK.wave}, 0.05)`)
  fade.addColorStop(0.16, `rgba(${INK.wave}, 0.85)`)
  fade.addColorStop(0.84, `rgba(${INK.wave}, 0.85)`)
  fade.addColorStop(1, `rgba(${INK.wave}, 0.05)`)
  ctx.strokeStyle = `rgba(${INK.wave}, 0.14)`
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.strokeStyle = fade
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 一个波长的量尺
  const waveWidth = lambda * pxPerMetre
  if (waveWidth > 12 && waveWidth < width * 1.4) {
    const startMetres = ((phase / TAU) * lambda) % lambda
    const x0 = box.x0 + startMetres * pxPerMetre
    const x1 = x0 + waveWidth
    const barY = waveY + amp + (box.mobile ? 13 : 17)
    ctx.strokeStyle = `rgba(${INK.beam}, 0.62)`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, barY - 4)
    ctx.lineTo(x0, barY + 4)
    ctx.moveTo(x0, barY)
    ctx.lineTo(x1, barY)
    ctx.moveTo(x1, barY - 4)
    ctx.lineTo(x1, barY + 4)
    ctx.stroke()
    const reading = formatLength(lambda)
    ctx.font = `600 ${box.mobile ? 10 : 11.5}px ${MONO}`
    ctx.fillStyle = `rgba(${INK.beam}, 0.95)`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`λ = ${reading.value} ${reading.unit}`, clamp((x0 + x1) / 2, box.x0 + 42, box.x1 - 42), barY - 6)
  }

  // 参照物：按同一比例尺站在同一条地面上，旁边写清它到底是什么
  const object: ScaleObject = nearestObject(lambda)
  const objectPx = object.metres * pxPerMetre
  if (objectPx > 4) {
    const anchorX = box.x0 + width * (box.mobile ? 0.5 : 0.6)
    // 接地阴影：没有它，剪影会像贴在空中
    const shadow = ctx.createRadialGradient(anchorX, groundY, 0, anchorX, groundY, Math.max(14, objectPx * 0.7))
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = shadow
    ctx.fillRect(anchorX - objectPx, groundY - 8, objectPx * 2, 20)
    drawShape(ctx, object.shape, anchorX, groundY, objectPx, reveal * 0.92)
    ctx.font = `500 ${box.mobile ? 9.5 : 10.5}px ${SANS}`
    ctx.fillStyle = INK.soft
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(labels.object, clamp(anchorX, box.x0 + 60, box.x1 - 60), groundY + 5)
  }

  // 比例尺
  ctx.font = `500 ${box.mobile ? 9 : 10}px ${MONO}`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = INK.faint
  const scaleReading = formatLength(spanMetres, 0)
  ctx.fillText(`${labels.ruler} ${scaleReading.value} ${scaleReading.unit}`, box.x1, groundY - 3)
  ctx.restore()
}

export type WallLabels = {
  title: string
  through: string
  around: string
  extrapolated: string
  geometry: string
  shadow: string
  wall: string
}

/**
 * 穿墙与绕射。上半是与主标尺共用横轴的损耗曲线（ITU-R P.2040 / P.526），
 * 下半是一条走廊：一列波按真实波长走过来，撞上墙分成两支——一支硬穿过去，
 * 一支从墙顶翻过去，两支的振幅与亮度都乘上各自模型算出来的透射系数。
 */
export function drawWallPanel(
  ctx: CanvasRenderingContext2D,
  box: PanelBox,
  frequency: number,
  xOf: (frequencyValue: number) => number,
  left: number,
  right: number,
  time: number,
  reveal: number,
  labels: WallLabels,
) {
  const width = box.x1 - box.x0
  const height = box.bottom - box.top
  if (width < 60 || height < 60) return
  const material = WALL_MATERIALS[0]
  const curveTop = box.top + (box.mobile ? 13 : 16)
  const curveH = height * (box.mobile ? 0.3 : 0.32)
  const curveBottom = curveTop + curveH
  const maxDb = 60
  const yOf = (db: number) => curveBottom - clamp(db / maxDb, 0, 1) * curveH

  panelTitle(ctx, box, labels.title, box.mobile ? undefined : labels.geometry)

  ctx.save()
  ctx.globalAlpha = reveal

  ctx.strokeStyle = INK.hair
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(box.x0, curveBottom)
  ctx.lineTo(box.x1, curveBottom)
  ctx.stroke()
  ctx.font = `500 ${box.mobile ? 8.5 : 9}px ${MONO}`
  ctx.fillStyle = INK.faint
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('0 dB', box.x0, curveBottom + 2)
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${maxDb} dB`, box.x0, curveTop + 9)

  const samples = Math.min(240, Math.max(60, Math.floor(width / 3)))
  const logLeft = Math.log10(left)
  const logRight = Math.log10(right)

  /** 建议书适用范围之内画实线，之外画虚线——示意与实测必须分得清 */
  const drawCurve = (
    loss: (frequencyValue: number) => number,
    colour: string,
    validFrom: number,
    validTo: number,
  ) => {
    let dashed: boolean | null = null
    const flush = () => {
      if (dashed === null) return
      ctx.strokeStyle = colour
      ctx.lineWidth = dashed ? 1 : 1.7
      ctx.setLineDash(dashed ? [3, 3] : [])
      ctx.stroke()
      ctx.setLineDash([])
    }
    for (let i = 0; i <= samples; i += 1) {
      const f = 10 ** (logLeft + ((logRight - logLeft) * i) / samples)
      const outside = f < validFrom || f > validTo
      const x = xOf(f)
      const y = yOf(loss(f))
      if (dashed === null) {
        dashed = outside
        ctx.beginPath()
        ctx.moveTo(x, y)
        continue
      }
      if (outside !== dashed) {
        ctx.lineTo(x, y)
        flush()
        dashed = outside
        ctx.beginPath()
        ctx.moveTo(x, y)
        continue
      }
      ctx.lineTo(x, y)
    }
    flush()
  }

  drawCurve((f) => diffractionLossDb(f), 'rgba(120, 210, 255, 0.8)', 3e7, 1e12)
  drawCurve(
    (f) => wallLossDb(f, material),
    'rgba(255, 168, 108, 0.9)',
    material.validGHz[0] * 1e9,
    material.validGHz[1] * 1e9,
  )

  ctx.font = `500 ${box.mobile ? 9 : 9.5}px ${SANS}`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255, 168, 108, 0.92)'
  ctx.fillText(labels.through, box.x1, curveTop + 1)
  ctx.fillStyle = 'rgba(120, 210, 255, 0.85)'
  ctx.fillText(labels.around, box.x1, curveTop + (box.mobile ? 12 : 14))
  ctx.fillStyle = INK.faint
  ctx.fillText(labels.extrapolated, box.x1, curveTop + (box.mobile ? 23 : 27))

  const throughDb = wallLossDb(frequency, material)
  const aroundDb = diffractionLossDb(frequency)
  if (frequency >= left && frequency <= right) {
    const cx = xOf(frequency)
    ctx.strokeStyle = 'rgba(255, 233, 186, 0.24)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, curveTop)
    ctx.lineTo(cx, curveBottom)
    ctx.stroke()
    for (const [loss, colour] of [
      [throughDb, 'rgba(255, 168, 108, 1)'],
      [aroundDb, 'rgba(120, 210, 255, 1)'],
    ] as const) {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(cx, yOf(loss), 3.2, 0, TAU)
      ctx.fill()
    }
  }

  /* 走廊 */
  const sceneTop = curveBottom + (box.mobile ? 14 : 20)
  const sceneBottom = box.bottom - (box.mobile ? 12 : 14)
  const sceneH = sceneBottom - sceneTop
  if (sceneH < 34) {
    ctx.restore()
    return
  }

  const lambda = wavelength(frequency)
  // 走廊按真实米数铺开，波的疏密就是真实波长；太密时并成一条亮带，不假装能画出每个波峰
  const sceneMetres = clamp(lambda * 26, 0.6, 24)
  const pxPerMetre = width / sceneMetres
  const wallX = box.x0 + width * 0.45
  const wallW = clamp(material.thickness * pxPerMetre, 6, width * 0.06)
  const sourceX = box.x0 + width * 0.04
  const groundY = sceneBottom
  const edgeY = sceneTop + sceneH * 0.1
  const axisY = sceneTop + sceneH * 0.72
  const amp = Math.min(sceneH * 0.19, 24)
  const throughGain = clamp(10 ** (-throughDb / 20), 0.006, 1)
  const aroundGain = clamp(10 ** (-aroundDb / 20), 0.006, 1)
  const phase = time * 2.4
  const step = Math.max(1, Math.floor(width / 460))
  const cycles = (px: number) => (px / pxPerMetre / lambda) * TAU

  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x0, sceneTop - 2, width, sceneH + 4)
  ctx.clip()

  ctx.strokeStyle = INK.hair
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(box.x0, groundY)
  ctx.lineTo(box.x1, groundY)
  ctx.stroke()

  const strokePath = (
    from: number,
    to: number,
    yAt: (px: number) => number,
    gain: number,
    glowColour: string,
    lineColour: string,
    scale: number,
  ) => {
    if (to - from < 2) return
    ctx.beginPath()
    for (let px = from; px <= to; px += step) {
      const y = yAt(px) - Math.sin(cycles(px) - phase) * amp * scale * gain
      if (px === from) ctx.moveTo(box.x0 + px, y)
      else ctx.lineTo(box.x0 + px, y)
    }
    ctx.globalAlpha = reveal * clamp(0.2 + gain * 0.8, 0.16, 1)
    ctx.strokeStyle = glowColour
    ctx.lineWidth = 4.5
    ctx.stroke()
    ctx.strokeStyle = lineColour
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.globalAlpha = reveal
  }

  const wallLeft = wallX - box.x0
  const wallRight = wallLeft + wallW
  const flat = () => axisY
  // 翻墙的那条：墙前抬起、越过墙顶、再落回墙后的阴影区
  const liftStart = Math.max(2, wallLeft - width * 0.18)
  const liftEnd = width * 0.9
  const arcY = (px: number) => {
    if (px <= liftStart) return axisY
    const t = clamp((px - liftStart) / (liftEnd - liftStart), 0, 1)
    return axisY - Math.sin(Math.PI * t) ** 0.75 * (axisY - edgeY + 8)
  }

  strokePath(0, wallLeft, flat, 1, `rgba(${INK.beam}, 0.2)`, `rgba(${INK.beam}, 0.92)`, 1)
  strokePath(wallRight, width, flat, throughGain, 'rgba(255, 168, 108, 0.2)', 'rgba(255, 178, 118, 0.95)', 1)
  strokePath(liftStart, wallLeft, arcY, 1, 'rgba(120, 210, 255, 0.2)', 'rgba(140, 216, 255, 0.9)', 0.7)
  strokePath(wallLeft, width, arcY, aroundGain, 'rgba(120, 210, 255, 0.2)', 'rgba(140, 216, 255, 0.9)', 0.7)

  // 墙
  const wallFill = ctx.createLinearGradient(0, edgeY, 0, groundY)
  wallFill.addColorStop(0, 'rgba(70, 78, 96, 0.96)')
  wallFill.addColorStop(1, 'rgba(24, 28, 38, 0.96)')
  ctx.fillStyle = wallFill
  ctx.fillRect(wallX, edgeY, wallW, groundY - edgeY)
  ctx.strokeStyle = 'rgba(226, 220, 208, 0.3)'
  ctx.lineWidth = 1
  for (let y = edgeY + 8; y < groundY - 2; y += 9) {
    ctx.beginPath()
    ctx.moveTo(wallX + 1, y + 0.5)
    ctx.lineTo(wallX + wallW - 1, y + 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(226, 220, 208, 0.5)'
  ctx.strokeRect(wallX + 0.5, edgeY + 0.5, wallW - 1, groundY - edgeY)

  // 墙后的阴影区
  const shade = ctx.createLinearGradient(wallX + wallW, 0, box.x1, 0)
  shade.addColorStop(0, 'rgba(6, 10, 18, 0.42)')
  shade.addColorStop(1, 'rgba(6, 10, 18, 0)')
  ctx.fillStyle = shade
  ctx.fillRect(wallX + wallW, edgeY, box.x1 - wallX - wallW, groundY - edgeY)

  // 源
  ctx.fillStyle = `rgba(${INK.beam}, 0.95)`
  ctx.beginPath()
  ctx.arc(sourceX, axisY, 3.4, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.font = `500 ${box.mobile ? 8.5 : 9.5}px ${SANS}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = INK.faint
  ctx.textAlign = 'right'
  ctx.fillText(labels.wall, wallX - 7, edgeY + 1)
  ctx.textAlign = 'right'
  ctx.fillText(labels.shadow, box.x1, groundY - (box.mobile ? 13 : 15))

  // 两个读数贴着各自那条路，谁掉了多少一眼看得出来
  ctx.font = `600 ${box.mobile ? 10 : 11.5}px ${MONO}`
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255, 178, 118, 0.95)'
  ctx.fillText(`−${throughDb.toFixed(0)} dB`, wallX + wallW + 7, axisY + (box.mobile ? 4 : 6))
  ctx.fillStyle = 'rgba(140, 216, 255, 0.92)'
  ctx.fillText(`−${aroundDb.toFixed(0)} dB`, wallX + wallW + 7, edgeY + (box.mobile ? 12 : 16))

  ctx.restore()
}

export type LotLabels = {
  title: string
  note: string
}

/** 频谱地产：把公开拍卖成交额画成落在对应频段上的地价柱 */
export function drawLotPanel(
  ctx: CanvasRenderingContext2D,
  box: PanelBox,
  xOf: (frequencyValue: number) => number,
  focus: SpectrumLot | null,
  focusText: Array<string>,
  reveal: number,
  labels: LotLabels,
) {
  const width = box.x1 - box.x0
  const height = box.bottom - box.top
  if (width < 60 || height < 50) return
  const baseline = box.top + height * (box.mobile ? 0.56 : 0.6)
  const maxHeight = baseline - box.top - (box.mobile ? 16 : 22)

  panelTitle(ctx, box, labels.title, box.mobile ? undefined : labels.note)

  ctx.save()
  ctx.globalAlpha = reveal
  ctx.strokeStyle = INK.hair
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(box.x0, baseline)
  ctx.lineTo(box.x1, baseline)
  ctx.stroke()

  // 柱高按成交额的数量级，10 亿美元起步、1000 亿封顶——比的是「贵到什么级别」
  const heightOf = (usd: number) => maxHeight * clamp((Math.log10(usd) - 8.8) / 2.2, 0.12, 1)
  for (const lot of LOTS) {
    const left = xOf(lot.f0)
    const right = xOf(lot.f1)
    if (right < box.x0 - 30 || left > box.x1 + 30) continue
    const w = Math.max(2, right - left)
    const h = heightOf(lot.usd)
    const active = focus?.id === lot.id
    const gradient = ctx.createLinearGradient(0, baseline - h, 0, baseline)
    gradient.addColorStop(0, `rgba(255, 206, 122, ${active ? 0.55 : 0.24})`)
    gradient.addColorStop(1, 'rgba(255, 206, 122, 0.02)')
    ctx.fillStyle = gradient
    ctx.fillRect(left, baseline - h, w, h)
    ctx.fillStyle = `rgba(255, 216, 150, ${active ? 1 : 0.55})`
    ctx.fillRect(left, baseline - h - 1.4, w, 1.4)
    if (w > 24 || active) {
      ctx.font = `600 ${box.mobile ? 9 : 10}px ${MONO}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = `rgba(255, 226, 172, ${active ? 0.98 : 0.5})`
      ctx.fillText(String(lot.year), left + w / 2, baseline - h - 5)
    }
  }

  if (focus) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    let y = baseline + (box.mobile ? 6 : 8)
    ctx.font = `600 ${box.mobile ? 12 : 14}px ${MONO}`
    ctx.fillStyle = 'rgba(255, 226, 172, 0.96)'
    ctx.fillText(focusText[0] ?? '', box.x0, y)
    y += box.mobile ? 15 : 18
    ctx.font = `500 ${box.mobile ? 9.5 : 10.5}px ${SANS}`
    ctx.fillStyle = INK.soft
    ctx.fillText(focusText[1] ?? '', box.x0, y)
  }
  ctx.restore()
}

export type ChannelLabels = {
  title: string
  none: string
}

/** 用途与信道：把当前街区内部的划分单独放大成一条地籍图 */
export function drawChannelPanel(
  ctx: CanvasRenderingContext2D,
  box: PanelBox,
  edges: Array<{ f0: number; f1: number; tag?: string }>,
  bandRange: [number, number],
  frequency: number,
  headline: string,
  body: Array<string>,
  reveal: number,
  labels: ChannelLabels,
) {
  const width = box.x1 - box.x0
  const height = box.bottom - box.top
  if (width < 60 || height < 50) return
  const stripTop = box.top + (box.mobile ? 15 : 19)
  const stripH = box.mobile ? 26 : 34
  const logFrom = Math.log10(bandRange[0])
  const logTo = Math.log10(bandRange[1])
  const toX = (f: number) => box.x0 + ((Math.log10(f) - logFrom) / (logTo - logFrom)) * width

  panelTitle(ctx, box, labels.title)

  ctx.save()
  ctx.globalAlpha = reveal

  ctx.strokeStyle = INK.hair
  ctx.lineWidth = 1
  ctx.strokeRect(box.x0 + 0.5, stripTop + 0.5, width - 1, stripH)

  if (edges.length === 0) {
    ctx.font = `500 ${box.mobile ? 10 : 11}px ${SANS}`
    ctx.fillStyle = INK.faint
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(labels.none, box.x0 + 8, stripTop + stripH / 2)
  }

  for (const edge of edges) {
    const left = toX(edge.f0)
    const right = toX(edge.f1)
    const w = Math.max(1, right - left)
    const active = frequency >= edge.f0 && frequency <= edge.f1
    ctx.fillStyle = active ? 'rgba(255, 214, 150, 0.34)' : 'rgba(226, 220, 208, 0.09)'
    ctx.fillRect(left, stripTop + 1, w, stripH - 2)
    ctx.strokeStyle = active ? 'rgba(255, 226, 172, 0.9)' : 'rgba(226, 220, 208, 0.24)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left + 0.5, stripTop + 1)
    ctx.lineTo(left + 0.5, stripTop + stripH - 1)
    ctx.stroke()
    if (edge.tag && w > 34) {
      ctx.font = `600 ${box.mobile ? 8.5 : 9.5}px ${MONO}`
      ctx.fillStyle = active ? 'rgba(255, 232, 190, 0.98)' : INK.faint
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(edge.tag, left + w / 2, stripTop + stripH / 2)
    }
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let y = stripTop + stripH + (box.mobile ? 8 : 12)
  ctx.font = `600 ${box.mobile ? 12 : 14.5}px ${SANS}`
  ctx.fillStyle = 'rgba(255, 232, 190, 0.95)'
  ctx.fillText(headline, box.x0, y)
  y += box.mobile ? 16 : 20
  ctx.font = `400 ${box.mobile ? 10.5 : 12}px ${SANS}`
  ctx.fillStyle = INK.soft
  for (const line of body) {
    if (y > box.bottom - 6) break
    ctx.fillText(line, box.x0, y)
    y += box.mobile ? 14 : 16
  }
  ctx.restore()
}

/** 把一段文字按像素宽度折行 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: Array<string> = []
  let current = ''
  const isWide = /[㐀-鿿　-〿＀-￯]/u
  const words = text.split(/(\s+)/u)
  const push = (chunk: string) => {
    const next = current + chunk
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current.trimEnd())
      current = chunk.trimStart()
    } else {
      current = next
    }
  }
  for (const word of words) {
    if (isWide.test(word)) {
      for (const character of word) push(character)
    } else {
      push(word)
    }
    if (lines.length >= maxLines) break
  }
  if (current && lines.length < maxLines) lines.push(current.trimEnd())
  return lines.slice(0, maxLines)
}

export { visibleColour }
