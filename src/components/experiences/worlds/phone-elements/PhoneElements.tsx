import './styles/PhoneElements.css'
import { FilmStrip } from '@phosphor-icons/react'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n/index'
import {
  ATLAS_URL,
  MAX_LAYER,
  PERIODIC_CELLS,
  PERIODIC_COLUMNS,
  PERIODIC_ROWS,
  PLATES,
  approach,
  averageConcentration,
  clamp,
  formatCrust,
  formatMass,
  tableRowOffset,
  topThreeShare,
  totalMg,
  type Atlas,
  type AtlasElement,
  type PhonePartId,
} from './phone-elements-data'

const TAU = Math.PI * 2

type LayerId = 'mass' | 'supply' | 'ree' | 'recycle'

const REE = new Set(['Nd', 'Pr', 'Dy', 'Gd'])
const PRECIOUS = new Set(['Au', 'Ag', 'Pd', 'Pt', 'Cu'])

const INK = {
  glass: '168, 214, 244',
  steel: '158, 178, 196',
  board: '86, 196, 158',
  copper: '214, 142, 96',
  gold: '236, 190, 108',
  accent: '124, 196, 255',
  hot: '240, 118, 92',
  cool: '116, 208, 168',
  violet: '186, 154, 246',
  paper: '236, 240, 246',
} as const

const PART_FACE: Record<PhonePartId, { fill: string; edge: string }> = {
  glass: { fill: '128, 176, 208', edge: '198, 232, 255' },
  display: { fill: '26, 34, 46', edge: '96, 140, 178' },
  frame: { fill: '104, 120, 136', edge: '196, 214, 230' },
  board: { fill: '24, 74, 66', edge: '86, 196, 158' },
  soc: { fill: '44, 50, 62', edge: '176, 198, 224' },
  camera: { fill: '30, 34, 44', edge: '150, 176, 202' },
  speaker: { fill: '38, 40, 48', edge: '186, 194, 206' },
  motor: { fill: '46, 42, 40', edge: '206, 190, 170' },
  battery: { fill: '58, 78, 102', edge: '150, 188, 218' },
  antenna: { fill: '30, 32, 40', edge: '236, 190, 108' },
}

function rgba(channel: string, alpha: number) {
  return `rgba(${channel}, ${alpha})`
}

/**
 * 沉浸查看用 display:none，海报抓取用 opacity:0，两者都作用在外层壳上，
 * 所以必须沿祖先链一路往上查，只看元素自己会漏判。
 */
function isVisible(element: Element | null | undefined) {
  let node: Element | null = element ?? null
  if (!node) return false
  while (node) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.02) return false
    node = node.parentElement
  }
  return true
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  /** true 时不开新路径，用于用 evenodd 挖空的环形 */
  keepPath = false,
) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2)
  if (!keepPath) ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/* ------------------------------------------------------------------ layout */

type Panel = { x: number; y: number; w: number; h: number }

type Layout = {
  mobile: boolean
  phone: Panel
  table: Panel
  map: Panel
  mapShown: number
}

/** Height of the caption band that story chapters use on a phone. */
const PHONE_STORY_CAPTION_RESERVE = 272

function computeLayout(
  w: number,
  h: number,
  storyMode: boolean,
  reserve: number,
  plateShown: boolean,
  mapReveal: number,
): Layout {
  const mobile = w < 760
  const padX = mobile ? 14 : 30
  // 故事模式下读数带贴在顶部，主体要从它下面开始，否则手机会压在读数上；手机上读数落到底部，顶部整段留给章节文字
  const stageTop = storyMode ? (mobile ? PHONE_STORY_CAPTION_RESERVE : 136) : mobile ? (plateShown ? 128 : 62) : 86
  const bottomReserve = clamp(reserve, 24, h * 0.5)
  const stageBottom = Math.max(stageTop + 200, h - bottomReserve)
  const stageH = stageBottom - stageTop
  const stageW = w - padX * 2
  const reveal = clamp(mapReveal, 0, 1)

  if (mobile) {
    // 窄屏三联画重排成上下三段：手机让出高度，地图从底部长出来。
    const gap = 8
    // 窄屏把三联画竖过来：手机、周期表、地图各占一段，谁都不被压扁
    const weights = [1.15, 1.2, 0.85 * reveal]
    const total = weights[0] + weights[1] + weights[2]
    const usable = stageH - gap * 2
    const heights = weights.map((weight) => (usable * weight) / total)
    return {
      mobile,
      phone: { x: padX, y: stageTop, w: stageW, h: heights[0] },
      table: { x: padX, y: stageTop + heights[0] + gap, w: stageW, h: heights[1] },
      map: { x: padX, y: stageTop + heights[0] + heights[1] + gap * 2, w: stageW, h: heights[2] },
      mapShown: reveal,
    }
  }

  const gap = 22
  const phoneW = clamp(stageW * 0.38, 280, 540)
  const rightX = padX + phoneW + gap
  const rightW = w - padX - rightX
  const rightGap = 18
  const usable = stageH - rightGap * reveal
  const mapH = usable * 0.44 * reveal
  const tableH = usable - mapH
  return {
    mobile,
    phone: { x: padX, y: stageTop, w: phoneW, h: stageH },
    table: { x: rightX, y: stageTop, w: rightW, h: tableH },
    map: { x: rightX, y: stageTop + tableH + rightGap * reveal, w: rightW, h: mapH },
    mapShown: reveal,
  }
}

/* --------------------------------------------------------------- rendering */

type Scene = {
  explode: number
  table: number
  map: number
  spin: number
}

type CanvasLabels = {
  table: string
  map: string
}

type ViewState = {
  time: number
  atlas: Atlas
  anim: Scene
  labels: CanvasLabels
  layerId: LayerId
  activePart: PhonePartId | null
  activeElement: string | null
  litElements: Map<string, number>
  litParts: Map<PhonePartId, number>
  pick: (record: { zh: string; en: string }) => string
}

type PlateHit = { id: PhonePartId; a: number; b: number; d: number; e: number; f: number; halfU: number; halfV: number }
type CellHit = { sym: string; x: number; y: number; w: number; h: number }
type PinHit = { code: string; x: number; y: number; r: number }

type HitMap = { plates: Array<PlateHit>; cells: Array<CellHit>; pins: Array<PinHit>; phoneAnchor: { x: number; y: number } }

/** 每个图层只用一条色阶：颜色说明「哪一类」，明度说明「多少」。 */
function elementTone(element: AtlasElement, layerId: LayerId): { tone: string; weight: number } {
  if (layerId === 'ree') {
    return REE.has(element.sym)
      ? { tone: INK.violet, weight: 1 }
      : { tone: INK.steel, weight: 0.12 }
  }
  if (layerId === 'recycle') {
    return PRECIOUS.has(element.sym)
      ? { tone: INK.gold, weight: 1 }
      : { tone: INK.steel, weight: 0.12 }
  }
  if (layerId === 'supply') {
    const share = topThreeShare(element)
    if (share === null) return { tone: INK.steel, weight: 0.1 }
    const heat = clamp((share - 35) / 60, 0, 1)
    return {
      tone: heat > 0.66 ? INK.hot : heat > 0.36 ? INK.gold : INK.cool,
      weight: 0.3 + heat * 0.7,
    }
  }
  // 用量跨了七个数量级，取对数才能一眼看出层次
  const mass = totalMg(element)
  const weight = clamp((Math.log10(mass) + 1.6) / 5.8, 0.08, 1)
  return { tone: mass > 200 ? INK.copper : INK.gold, weight }
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, layout: Layout) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#080b12')
  sky.addColorStop(0.5, '#0b1019')
  sky.addColorStop(1, '#05070c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // 展台灯：一束柔光从手机上方落下来
  const cx = layout.phone.x + layout.phone.w / 2
  const cy = layout.phone.y + layout.phone.h * 0.45
  const reach = Math.max(layout.phone.w, layout.phone.h) * 0.86
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach)
  for (let step = 0; step <= 6; step += 1) {
    const t = step / 6
    glow.addColorStop(t, rgba('90, 132, 176', 0.16 * (1 - t) ** 2.1))
  }
  ctx.fillStyle = glow
  ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2)
}

function drawPanelCaption(
  ctx: CanvasRenderingContext2D,
  panel: Panel,
  text: string,
  mobile: boolean,
  alpha: number,
) {
  if (alpha <= 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = `500 ${mobile ? 9 : 10}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(text, panel.x + 2, panel.y)
  ctx.restore()
}

function drawPhone(ctx: CanvasRenderingContext2D, panel: Panel, view: ViewState, hits: HitMap, mobile: boolean) {
  const { anim } = view
  const open = anim.explode
  // 拆开时整摞板往下铺开，视野随之后退；合体时它是一件被单独打光的展品
  const named = !mobile && panel.w > 300
  const stageW = panel.w * (named ? 0.74 : 0.92)

  const yaw = 0.2 + Math.sin(view.time * 0.24) * 0.13 * anim.spin
  const pitch = 0.4
  const ca = Math.cos(yaw)
  const sa = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)

  // 展台越高，层与层之间拉得越开，让这摞板真的占满自己的展台，
  // 而不是无论多大的屏幕都缩成中间一小坨。
  const aspect = panel.h / Math.max(1, stageW)
  const spreadUnit = clamp(0.19 * aspect, 0.28, 0.92)
  // 合体时几乎贴死，才像一件完整的东西；拆开才让层与层之间长出空气
  const gapUnit = 0.012 + open * spreadUnit
  const widthUnits = 0.96 * ca + MAX_LAYER * gapUnit * sa
  const heightUnits = 2 * cp + MAX_LAYER * gapUnit * ca * sp
  const scale = Math.min(stageW / widthUnits, panel.h / heightUnits)
  if (scale < 16) return
  const cx = panel.x + panel.w * (named ? 0.4 : 0.5)
  const cy = panel.y + panel.h * 0.5

  const spread = gapUnit * scale
  const centreLayer = MAX_LAYER / 2

  const sorted = [...PLATES].sort((left, right) => left.layer - right.layer)
  hits.plates.length = 0
  hits.phoneAnchor.x = cx
  hits.phoneAnchor.y = cy
  const callouts: Array<{ text: string; edgeX: number; edgeY: number; y: number; alpha: number; active: boolean }> = []

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  // 展台接触阴影：一块被单独打光的展品，脚下要有东西
  const shadowY = cy + scale * (1.06 + 0.72 * open)
  const shadowW = scale * (0.9 + 0.5 * open)
  const contact = ctx.createRadialGradient(cx, shadowY, 0, cx, shadowY, shadowW)
  contact.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
  contact.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = contact
  ctx.save()
  ctx.translate(cx, shadowY)
  ctx.scale(1, 0.22)
  ctx.beginPath()
  ctx.arc(0, 0, shadowW, 0, TAU)
  ctx.fill()
  ctx.restore()

  for (const plate of sorted) {
    const depth = (plate.layer - centreLayer) * spread
    // 仿射投影：先绕竖直轴偏航，再俯仰。c = 0，所以竖直线仍然竖直。
    const a = ca * scale
    const b = sa * sp * scale
    const d = cp * scale
    const e = cx + plate.u * a + depth * sa
    const f = cy + plate.v * d + plate.u * b + depth * ca * sp

    const focus = view.activePart === null ? 1 : view.activePart === plate.id ? 1 : 0.22
    const lit = view.litParts.get(plate.id) ?? 0
    const face = PART_FACE[plate.id]
    const alpha = (plate.kind === 'plate' ? 0.9 : 0.96) * focus

    ctx.save()
    ctx.transform(a, b, 0, d, e, f)

    // 板厚：同一块圆角矩形先画一层暗的，再画正面，缝隙读作厚度
    const thickness = plate.kind === 'plate' ? 0.035 : 0.06
    ctx.save()
    ctx.translate(-thickness * sa * 0.9, -thickness * ca * sp * 0.9)
    ctx.fillStyle = rgba('4, 6, 10', 0.62 * focus)
    roundRectPath(ctx, -plate.halfU, -plate.halfV, plate.halfU * 2, plate.halfV * 2, plate.radius)
    ctx.fill()
    ctx.restore()

    const glassy = plate.id === 'glass'
    const gradient = ctx.createLinearGradient(-plate.halfU, -plate.halfV, plate.halfU, plate.halfV)
    gradient.addColorStop(0, rgba(face.fill, alpha * (glassy ? 0.3 : 0.96)))
    gradient.addColorStop(0.5, rgba(face.fill, alpha * (glassy ? 0.12 : 0.7)))
    gradient.addColorStop(1, rgba(face.fill, alpha * (glassy ? 0.26 : 0.92)))
    ctx.fillStyle = gradient
    if (plate.id === 'frame') {
      // 中框是一圈金属，不是一块板：挖空中间，它才不会和屏幕、盖板糊成三张一样的薄片
      const inset = 0.055
      roundRectPath(ctx, -plate.halfU, -plate.halfV, plate.halfU * 2, plate.halfV * 2, plate.radius)
      roundRectPath(
        ctx,
        -plate.halfU + inset,
        -plate.halfV + inset,
        (plate.halfU - inset) * 2,
        (plate.halfV - inset) * 2,
        Math.max(0.01, plate.radius - inset),
        true,
      )
      ctx.fill('evenodd')
    } else {
      roundRectPath(ctx, -plate.halfU, -plate.halfV, plate.halfU * 2, plate.halfV * 2, plate.radius)
      ctx.fill()
    }

    drawPartDetail(ctx, plate.id, plate.halfU, plate.halfV, view, focus)

    // 主光在左上：每块板的上缘留一道细高光，板才有厚度和材质
    ctx.strokeStyle = rgba('255, 255, 255', 0.34 * focus)
    ctx.lineWidth = 1.1 / scale
    ctx.beginPath()
    ctx.moveTo(-plate.halfU + plate.radius, -plate.halfV + 0.6 / scale)
    ctx.lineTo(plate.halfU - plate.radius, -plate.halfV + 0.6 / scale)
    ctx.stroke()

    ctx.lineWidth = (plate.id === view.activePart ? 2.4 : 1) / scale
    ctx.strokeStyle = rgba(
      plate.id === view.activePart ? INK.accent : face.edge,
      (plate.id === view.activePart ? 0.95 : 0.42) * focus + lit * 0.3,
    )
    roundRectPath(ctx, -plate.halfU, -plate.halfV, plate.halfU * 2, plate.halfV * 2, plate.radius)
    ctx.stroke()
    ctx.restore()

    hits.plates.push({ id: plate.id, a, b, d, e, f, halfU: plate.halfU, halfV: plate.halfV })

    // 拆开以后才给每层挂标签，合体时保持干净；窄屏只标当前选中的那层
    const labelled = named || view.activePart === plate.id
    if (open > 0.35 && labelled) {
      const labelAlpha = clamp((open - 0.35) / 0.35, 0, 1)
        * (view.activePart === null || view.activePart === plate.id ? 1 : 0.24)
      const part = view.atlas.parts.find((entry) => entry.id === plate.id)
      if (part && labelAlpha > 0.03) {
        const edgeY = f + plate.halfU * b
        callouts.push({
          text: view.pick(part),
          edgeX: e + plate.halfU * a,
          edgeY,
          y: edgeY,
          alpha: labelAlpha,
          active: plate.id === view.activePart,
        })
      }
    }
  }

  // 引线收到同一根竖轴上，再把撞在一起的名字推开，读起来才像一张技术图
  if (callouts.length > 0) {
    const columnX = named ? panel.x + panel.w * 0.78 : panel.x + panel.w * 0.66
    const gap = mobile ? 13 : 15
    callouts.sort((left, right) => left.y - right.y)
    for (let i = 1; i < callouts.length; i += 1) {
      callouts[i].y = Math.max(callouts[i].y, callouts[i - 1].y + gap)
    }
    const overflow = callouts[callouts.length - 1].y - (panel.y + panel.h - 6)
    if (overflow > 0) for (const callout of callouts) callout.y -= overflow
    ctx.font = `500 ${mobile ? 9.5 : 11}px system-ui, sans-serif`
    for (const callout of callouts) {
      ctx.globalAlpha = callout.alpha
      ctx.strokeStyle = rgba(callout.active ? INK.accent : INK.paper, callout.active ? 0.5 : 0.15)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(callout.edgeX + 3, callout.edgeY)
      ctx.lineTo(columnX - 16, callout.y)
      ctx.lineTo(columnX - 7, callout.y)
      ctx.stroke()
      ctx.fillStyle = rgba(callout.active ? INK.accent : INK.paper, callout.active ? 0.98 : 0.56)
      ctx.beginPath()
      ctx.arc(columnX - 7, callout.y, callout.active ? 2.2 : 1.4, 0, TAU)
      ctx.fill()
      ctx.fillText(callout.text, columnX, callout.y)
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** 每一层的内部纹样：全部程序化画出来，不使用任何真实产品的外观。 */
function drawPartDetail(
  ctx: CanvasRenderingContext2D,
  id: PhonePartId,
  halfU: number,
  halfV: number,
  view: ViewState,
  focus: number,
) {
  const time = view.time
  ctx.save()
  // 裁剪在 Canvas 里很贵，十层每帧各裁一次直接吃掉帧率。
  // 只有真的会溢出板外的两层（玻璃扫光、中框环）才裁，其余靠几何自己收在板内。
  if (id === 'frame') {
    roundRectPath(ctx, -halfU, -halfV, halfU * 2, halfV * 2, 0.1)
    roundRectPath(ctx, -halfU + 0.055, -halfV + 0.055, (halfU - 0.055) * 2, (halfV - 0.055) * 2, 0.05, true)
    ctx.clip('evenodd')
  } else if (id === 'glass') {
    roundRectPath(ctx, -halfU, -halfV, halfU * 2, halfV * 2, 0.06)
    ctx.clip()
  }

  if (id === 'glass') {
    const sweep = ((time * 0.16) % 1.6) - 0.8
    const shine = ctx.createLinearGradient(sweep - 0.5, -halfV, sweep + 0.5, halfV)
    shine.addColorStop(0, rgba('255, 255, 255', 0))
    shine.addColorStop(0.5, rgba('255, 255, 255', 0.2 * focus))
    shine.addColorStop(1, rgba('255, 255, 255', 0))
    ctx.fillStyle = shine
    ctx.fillRect(-halfU, -halfV, halfU * 2, halfV * 2)
  }

  if (id === 'display') {
    const glow = ctx.createRadialGradient(0, -0.1, 0, 0, 0, halfV * 1.2)
    glow.addColorStop(0, rgba(INK.accent, 0.28 * focus))
    glow.addColorStop(1, rgba(INK.accent, 0))
    ctx.fillStyle = glow
    ctx.fillRect(-halfU, -halfV, halfU * 2, halfV * 2)
    ctx.strokeStyle = rgba(INK.accent, 0.08 * focus)
    ctx.lineWidth = 0.006
    ctx.beginPath()
    for (let i = -8; i <= 8; i += 1) {
      ctx.moveTo((i / 8) * halfU, -halfV * 0.98)
      ctx.lineTo((i / 8) * halfU, halfV * 0.98)
    }
    ctx.stroke()
  }

  if (id === 'board') {
    ctx.strokeStyle = rgba(INK.gold, 0.42 * focus)
    ctx.lineWidth = 0.012
    ctx.beginPath()
    for (let i = 0; i < 13; i += 1) {
      const y = -halfV + ((i + 0.6) / 13) * halfV * 2
      ctx.moveTo(-halfU + 0.04, y)
      ctx.lineTo(-halfU + 0.04 + (0.28 + (((i * 37) % 11) / 11) * 1.24) * halfU, y)
    }
    ctx.stroke()
    ctx.fillStyle = rgba('12, 20, 24', 0.9 * focus)
    for (let i = 0; i < 6; i += 1) {
      const x = -halfU * 0.7 + (i % 3) * halfU * 0.48
      const y = -halfV * 0.5 + Math.floor(i / 3) * halfV * 0.72
      roundRectPath(ctx, x, y, halfU * 0.34, halfV * 0.26, 0.015)
      ctx.fill()
    }
  }

  if (id === 'soc') {
    const die = ctx.createLinearGradient(-halfU, -halfV, halfU, halfV)
    die.addColorStop(0, rgba('132, 152, 184', 0.7 * focus))
    die.addColorStop(0.55, rgba('58, 72, 96', 0.8 * focus))
    die.addColorStop(1, rgba('160, 186, 214', 0.6 * focus))
    ctx.fillStyle = die
    ctx.fillRect(-halfU * 0.72, -halfV * 0.72, halfU * 1.44, halfV * 1.44)
    ctx.strokeStyle = rgba(INK.gold, 0.5 * focus)
    ctx.lineWidth = 0.008
    for (let i = 0; i < 12; i += 1) {
      const t = -halfU + ((i + 0.5) / 12) * halfU * 2
      ctx.beginPath()
      ctx.moveTo(t, -halfV)
      ctx.lineTo(t, -halfV * 0.74)
      ctx.moveTo(t, halfV * 0.74)
      ctx.lineTo(t, halfV)
      ctx.stroke()
    }
  }

  if (id === 'camera') {
    for (const [ox, r] of [[-halfU * 0.45, halfV * 0.62], [halfU * 0.45, halfV * 0.5]] as Array<[number, number]>) {
      const lens = ctx.createRadialGradient(ox, 0, 0, ox, 0, r)
      lens.addColorStop(0, rgba('180, 214, 240', 0.5 * focus))
      lens.addColorStop(0.55, rgba('16, 24, 34', 0.95 * focus))
      lens.addColorStop(1, rgba('120, 148, 176', 0.7 * focus))
      ctx.fillStyle = lens
      ctx.beginPath()
      ctx.arc(ox, 0, r, 0, TAU)
      ctx.fill()
    }
  }

  if (id === 'speaker') {
    ctx.strokeStyle = rgba('196, 204, 216', 0.55 * focus)
    ctx.lineWidth = 0.012
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath()
      ctx.ellipse(0, 0, halfU * (i / 3.4), halfV * (i / 3.4), 0, 0, TAU)
      ctx.stroke()
    }
    ctx.fillStyle = rgba(INK.violet, 0.34 * focus)
    ctx.beginPath()
    ctx.ellipse(0, 0, halfU * 0.2, halfV * 0.4, 0, 0, TAU)
    ctx.fill()
  }

  if (id === 'motor') {
    ctx.fillStyle = rgba('212, 196, 172', 0.55 * focus)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    const phase = time * 2.2
    ctx.arc(0, 0, halfU * 0.86, phase, phase + Math.PI * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba('220, 226, 236', 0.4 * focus)
    ctx.lineWidth = 0.014
    ctx.beginPath()
    ctx.arc(0, 0, halfU * 0.5, 0, TAU)
    ctx.stroke()
  }

  if (id === 'battery') {
    ctx.strokeStyle = rgba('12, 20, 32', 0.4 * focus)
    ctx.lineWidth = 0.012
    ctx.beginPath()
    for (let i = 1; i < 5; i += 1) {
      const y = -halfV + (i / 5) * halfV * 2
      ctx.moveTo(-halfU * 0.94, y)
      ctx.lineTo(halfU * 0.94, y)
    }
    ctx.stroke()
    ctx.fillStyle = rgba('214, 232, 248', 0.5 * focus)
    ctx.fillRect(halfU * 0.5, -halfV * 0.14, halfU * 0.42, halfV * 0.28)
  }

  if (id === 'antenna') {
    ctx.strokeStyle = rgba(INK.gold, 0.5 * focus)
    ctx.lineWidth = 0.016
    roundRectPath(ctx, -halfU * 0.88, -halfV * 0.9, halfU * 1.76, halfV * 1.8, 0.09)
    ctx.stroke()
    ctx.fillStyle = rgba(INK.gold, 0.56 * focus)
    for (let i = 0; i < 9; i += 1) {
      ctx.fillRect(-halfU * 0.4 + i * (halfU * 0.1), halfV * 0.66, halfU * 0.05, halfV * 0.11)
    }
  }

  if (id === 'frame') {
    // 抛光边缘的高光带，加上几道天线断缝
    const sheen = ctx.createLinearGradient(-halfU, 0, halfU, 0)
    sheen.addColorStop(0, rgba('236, 246, 255', 0.36 * focus))
    sheen.addColorStop(0.42, rgba('236, 246, 255', 0.04 * focus))
    sheen.addColorStop(1, rgba('236, 246, 255', 0.3 * focus))
    ctx.fillStyle = sheen
    ctx.fillRect(-halfU, -halfV, halfU * 2, halfV * 2)
    ctx.strokeStyle = rgba('8, 12, 18', 0.7 * focus)
    ctx.lineWidth = 0.014
    for (const v of [-0.62, 0.62]) {
      ctx.beginPath()
      ctx.moveTo(-halfU, halfV * v)
      ctx.lineTo(halfU, halfV * v)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawTable(ctx: CanvasRenderingContext2D, panel: Panel, view: ViewState, hits: HitMap, mobile: boolean) {
  if (panel.h < 40 || panel.w < 60) return
  const capH = mobile ? 13 : 17
  const height = panel.h - capH
  const cellW = Math.min(panel.w / (PERIODIC_COLUMNS + 0.4), height / (PERIODIC_ROWS + 0.4))
  const gridW = cellW * PERIODIC_COLUMNS
  const originX = panel.x + (panel.w - gridW) / 2
  // 表在自己那块面板里上下居中，别顶在天花板上留一大片空
  const originY = panel.y + capH + Math.max(0, (height - cellW * PERIODIC_ROWS) / 2)
  const pad = Math.max(0.7, cellW * 0.1)
  const byZ = new Map<number, AtlasElement>()
  for (const element of view.atlas.elements) byZ.set(element.z, element)

  hits.cells.length = 0
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const cell of PERIODIC_CELLS) {
    const x = originX + (cell.col - 1) * cellW
    const y = originY + tableRowOffset(cell.row) * cellW
    const size = cellW - pad
    const element = byZ.get(cell.z)
    if (!element) {
      // 手机里没有的元素：留一个几乎看不见的位子，周期表的轮廓仍在
      ctx.fillStyle = 'rgba(255, 255, 255, 0.028)'
      ctx.fillRect(x, y, size, size)
      continue
    }

    const lit = view.litElements.get(element.sym) ?? 0
    const selected = view.activeElement === element.sym
    const { tone, weight } = elementTone(element, view.layerId)
    const strength = lit * weight
    ctx.fillStyle = rgba(tone, 0.05 + strength * 0.78)
    ctx.fillRect(x, y, size, size)
    if (lit > 0.04) {
      ctx.strokeStyle = rgba(tone, 0.16 + lit * 0.42)
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
    }
    if (selected) {
      ctx.save()
      ctx.shadowColor = rgba(tone, 0.9)
      ctx.shadowBlur = 14
      ctx.strokeStyle = rgba(INK.paper, 0.96)
      ctx.lineWidth = 1.8
      ctx.strokeRect(x - 1.4, y - 1.4, size + 2.8, size + 2.8)
      ctx.restore()
    }
    if (size > 8.5) {
      ctx.font = `600 ${clamp(size * 0.56, 6, 13)}px ui-monospace, "SF Mono", monospace`
      const dark = strength > 0.42
      ctx.fillStyle = rgba(dark ? '10, 13, 19' : INK.paper, dark ? 0.9 : 0.28 + lit * 0.52)
      ctx.fillText(element.sym, x + size / 2, y + size / 2 + 0.5)
    }
    hits.cells.push({ sym: element.sym, x, y, w: size, h: size })
  }
  ctx.restore()
  drawPanelCaption(ctx, panel, view.labels.table, mobile, clamp(view.anim.table * 1.4, 0, 1))
}

function projectMap(panel: Panel, lon: number, lat: number) {
  const latTop = 78
  const latBottom = -56
  return {
    x: panel.x + ((lon + 180) / 360) * panel.w,
    y: panel.y + ((latTop - lat) / (latTop - latBottom)) * panel.h,
  }
}

/**
 * 底图只随面板尺寸变，每帧重描 228 个环纯属浪费。
 * 缓存成一张离屏位图，尺寸变了才重画。
 */
let landStrip: HTMLCanvasElement | null = null
let landKey = ''

function getLandStrip(panel: Panel, atlas: Atlas, dpr: number) {
  const key = `${Math.round(panel.w)}x${Math.round(panel.h)}@${dpr}`
  if (landStrip && landKey === key) return landStrip
  const strip = document.createElement('canvas')
  strip.width = Math.max(1, Math.round(panel.w * dpr))
  strip.height = Math.max(1, Math.round(panel.h * dpr))
  const stripCtx = strip.getContext('2d')!
  stripCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const local: Panel = { x: 0, y: 0, w: panel.w, h: panel.h }
  stripCtx.fillStyle = rgba('22, 40, 58', 0.62)
  stripCtx.strokeStyle = rgba('120, 156, 188', 0.36)
  stripCtx.lineWidth = 0.7
  for (const ring of atlas.land) {
    stripCtx.beginPath()
    for (let i = 0; i < ring.length; i += 2) {
      const point = projectMap(local, ring[i], ring[i + 1])
      if (i === 0) stripCtx.moveTo(point.x, point.y)
      else stripCtx.lineTo(point.x, point.y)
    }
    stripCtx.closePath()
    stripCtx.fill()
    stripCtx.stroke()
  }
  landStrip = strip
  landKey = key
  return strip
}

function drawMap(ctx: CanvasRenderingContext2D, panel: Panel, view: ViewState, hits: HitMap, mobile: boolean, dpr: number) {
  const reveal = view.anim.map
  if (reveal <= 0.02 || panel.h < 24) return
  ctx.save()
  ctx.globalAlpha = clamp(reveal * 1.2, 0, 1)
  ctx.beginPath()
  ctx.rect(panel.x, panel.y, panel.w, panel.h)
  ctx.clip()

  const strip = getLandStrip(panel, view.atlas, dpr)
  ctx.drawImage(strip, 0, 0, strip.width, strip.height, panel.x, panel.y, panel.w, panel.h)

  const focus = view.activeElement
    ? view.atlas.elements.filter((element) => element.sym === view.activeElement)
    : view.atlas.elements.filter((element) => (
      view.activePart === null ? true : element.parts.includes(view.activePart)
    ))

  const shares = new Map<string, number>()
  for (const element of focus) {
    for (const [code, share] of element.top ?? []) {
      shares.set(code, Math.max(shares.get(code) ?? 0, share))
    }
  }

  hits.pins.length = 0
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const sorted = [...shares.entries()].sort((left, right) => left[1] - right[1])
  for (const [code, share] of sorted) {
    const country = view.atlas.countries[code]
    if (!country) continue
    const point = projectMap(panel, country.lon, country.lat)
    const radius = (mobile ? 3.4 : 4.4) + Math.sqrt(share) * (mobile ? 1.5 : 2.1)
    const pulse = 0.72 + 0.28 * Math.sin(view.time * 1.7 + code.charCodeAt(0))
    const heat = clamp((share - 20) / 70, 0, 1)
    const tone = heat > 0.6 ? INK.hot : heat > 0.28 ? INK.gold : INK.cool

    const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 3.2)
    halo.addColorStop(0, rgba(tone, 0.42 * pulse))
    halo.addColorStop(1, rgba(tone, 0))
    ctx.fillStyle = halo
    ctx.fillRect(point.x - radius * 3.2, point.y - radius * 3.2, radius * 6.4, radius * 6.4)

    ctx.fillStyle = rgba(tone, 0.92)
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius * 0.42, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = rgba(tone, 0.6)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, TAU)
    ctx.stroke()

    if (share >= 12 && panel.h > 90) {
      ctx.font = `600 ${mobile ? 8.5 : 10}px system-ui, sans-serif`
      ctx.fillStyle = rgba(INK.paper, 0.82)
      ctx.fillText(`${view.pick(country)} ${share}%`, point.x, point.y - radius - 3)
    }
    hits.pins.push({ code, x: point.x, y: point.y, r: Math.max(12, radius * 1.6) })
  }

  ctx.restore()
  drawPanelCaption(ctx, panel, view.labels.map, mobile, clamp((reveal - 0.3) / 0.4, 0, 1))
}

/** 弧线：从产地飞向左边那台手机，说明这些金属最后都汇进同一件东西。 */
function drawArcs(ctx: CanvasRenderingContext2D, panel: Panel, view: ViewState, hits: HitMap, mobile: boolean) {
  const reveal = view.anim.map
  if (reveal <= 0.15 || hits.pins.length === 0) return
  const target = hits.phoneAnchor
  ctx.save()
  ctx.globalAlpha = clamp((reveal - 0.15) / 0.4, 0, 1)
  ctx.lineCap = 'round'

  for (const pin of hits.pins) {
    const midX = (pin.x + target.x) / 2
    const midY = (pin.y + target.y) / 2 - Math.abs(pin.x - target.x) * (mobile ? 0.12 : 0.24) - 30
    const gradient = ctx.createLinearGradient(pin.x, pin.y, target.x, target.y)
    gradient.addColorStop(0, rgba(INK.gold, 0.42))
    gradient.addColorStop(1, rgba(INK.accent, 0.05))
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pin.x, pin.y)
    ctx.quadraticCurveTo(midX, midY, target.x, target.y)
    ctx.stroke()

    const t = ((view.time * 0.34 + pin.x * 0.004) % 1)
    const inv = 1 - t
    const px = inv * inv * pin.x + 2 * inv * t * midX + t * t * target.x
    const py = inv * inv * pin.y + 2 * inv * t * midY + t * t * target.y
    ctx.fillStyle = rgba(INK.gold, 0.9 * (1 - t * 0.6))
    ctx.beginPath()
    ctx.arc(px, py, 2.1, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/* -------------------------------------------------------------- component */

export function PhoneElements({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('phone-elements')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLElement>(null)

  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [failed, setFailed] = useState(false)
  const [activePart, setActivePart] = useState<PhonePartId | null>(null)
  const [activeElement, setActiveElement] = useState<string | null>(null)
  const [layerId, setLayerId] = useState<LayerId>('mass')

  const freeScene: Scene = { explode: 1, table: 1, map: 1, spin: 1 }
  const sceneRef = useRef<Scene>(storyMode ? { explode: 0, table: 0, map: 0, spin: 1 } : { ...freeScene })
  // 回访用户直接进自由探索，但仍从合体状态起手：前两秒它会自己拆开、点亮、浮出地图
  const animRef = useRef<Scene>({ explode: 0, table: 0, map: 0, spin: 1 })
  const litElementsRef = useRef(new Map<string, number>())
  const litPartsRef = useRef(new Map<PhonePartId, number>())
  const hitsRef = useRef<HitMap>({ plates: [], cells: [], pins: [], phoneAnchor: { x: 0, y: 0 } })
  const timersRef = useRef<Array<number>>([])
  const reserveRef = useRef(190)
  const plateRef = useRef(true)
  const storyRef = useRef(storyMode)
  storyRef.current = storyMode

  const stateRef = useRef({ activePart, activeElement, layerId })
  stateRef.current = { activePart, activeElement, layerId }

  useEffect(() => {
    const controller = new AbortController()
    fetch(ATLAS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`atlas ${response.status}`)
        return response.json() as Promise<Atlas>
      })
      .then(setAtlas)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error('[phone-elements] atlas failed', error)
        setFailed(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => () => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }, [])

  const pick = useMemo(() => (
    (record: { zh: string; en: string }) => (locale === 'zh' ? record.zh : record.en)
  ), [locale])

  const labels: CanvasLabels = {
    table: tx('元素周期表'),
    map: tx('全球主要产地'),
  }
  const labelsRef = useRef(labels)
  labelsRef.current = labels
  const pickRef = useRef(pick)
  pickRef.current = pick
  const atlasRef = useRef<Atlas | null>(atlas)
  atlasRef.current = atlas

  /* ---------------------------------------------------------- derivations */

  const elementsById = useMemo(() => {
    const map = new Map<string, AtlasElement>()
    for (const element of atlas?.elements ?? []) map.set(element.sym, element)
    return map
  }, [atlas])

  const partElements = useMemo(() => {
    if (!atlas) return []
    return activePart === null
      ? atlas.elements
      : atlas.elements.filter((element) => element.parts.includes(activePart))
  }, [atlas, activePart])

  const selected = activeElement ? elementsById.get(activeElement) ?? null : null
  const concentration = useMemo(() => (
    selected ? topThreeShare(selected) : averageConcentration(partElements)
  ), [selected, partElements])

  /* --------------------------------------------------------------- scenes */

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }

  function after(ms: number, run: () => void) {
    timersRef.current.push(window.setTimeout(run, ms))
  }

  function setScene(next: Partial<Scene>) {
    sceneRef.current = { ...sceneRef.current, ...next }
  }

  function runScene(build: () => void) {
    clearTimers()
    build()
  }

  function choosePart(next: PhonePartId | null) {
    setActivePart(next)
    setActiveElement(null)
  }

  /* ---------------------------------------------------------- measurement */

  function measureDock() {
    const root = rootRef.current
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const dockElement = root.querySelector('.experience-freebar-main') ?? root.querySelector('.guide-card')
    const dockRect = dockElement?.getBoundingClientRect()
    const dockShown = Boolean(dockRect) && dockRect!.height > 4 && isVisible(dockElement)
    // Phone story chapters: the caption owns the top band and the readout sits above the slim story bar.
    const phoneStory = storyRef.current && rootRect.width < 760
    const dockHeight = phoneStory ? 72 : dockShown ? Math.max(0, rootRect.bottom - dockRect!.top) + 12 : 22
    root.style.setProperty('--elem-dock', `${Math.round(dockHeight)}px`)
    const readout = readoutRef.current
    const readoutHeight = (!storyRef.current || phoneStory) && readout && readout.offsetHeight > 0 && isVisible(readout)
      ? readout.offsetHeight + 14
      : 0
    reserveRef.current = dockHeight + readoutHeight
    plateRef.current = !storyRef.current && isVisible(root.querySelector('.elem-plate'))
  }

  /* ----------------------------------------------------------- frame loop */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId = 0
    let previous = performance.now()
    let time = 0
    let frames = 0
    let cascade = 0
    let cascadeKey = ''

    const frame = (now: number) => {
      frameId = window.requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1_000))
      previous = now
      time += dt

      try {
        const anim = animRef.current
        const scene = sceneRef.current
        anim.explode = approach(anim.explode, scene.explode, dt, 0.62)
        anim.table = approach(anim.table, scene.table, dt, 0.34)
        anim.map = approach(anim.map, scene.map, dt, 0.46)
        anim.spin = approach(anim.spin, scene.spin, dt, 0.5)

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        if (frames % 12 === 1) measureDock()
        frames += 1
        const layout = computeLayout(width, height, storyRef.current, reserveRef.current, plateRef.current, anim.map)
        drawBackdrop(ctx, width, height, layout)

        const data = atlasRef.current
        if (!data) return

        // 逐个点亮：按用量排序错开延时，让「数出来」这件事有先后节奏
        const live = stateRef.current
        const focusList = live.activePart === null
          ? data.elements
          : data.elements.filter((element) => element.parts.includes(live.activePart!))
        const focusSet = new Set(focusList.map((element) => element.sym))
        // 每次换部件都重跑一遍点亮节奏，而不是整块瞬间切色
        const focusKey = live.activePart ?? '*'
        if (focusKey !== cascadeKey) {
          cascadeKey = focusKey
          cascade = 0
        }
        cascade = Math.min(1, cascade + dt / (focusList.length > 24 ? 1.5 : 0.75))
        const gate = Math.min(anim.table, cascade)
        const stagger = 0.92 / Math.max(1, focusList.length - 1)
        focusList.forEach((element, index) => {
          const ready = gate > index * stagger
          const current = litElementsRef.current.get(element.sym) ?? 0
          const target = ready ? (live.activeElement === null || live.activeElement === element.sym ? 1 : 0.5) : 0
          litElementsRef.current.set(element.sym, approach(current, target, dt, 0.16))
        })
        for (const element of data.elements) {
          if (focusSet.has(element.sym)) continue
          const current = litElementsRef.current.get(element.sym) ?? 0
          litElementsRef.current.set(element.sym, approach(current, 0, dt, 0.2))
        }

        const highlightParts = new Set<PhonePartId>(
          live.activeElement ? elementsById.get(live.activeElement)?.parts ?? [] : [],
        )
        for (const part of data.parts) {
          const current = litPartsRef.current.get(part.id) ?? 0
          litPartsRef.current.set(part.id, approach(current, highlightParts.has(part.id) ? 1 : 0, dt, 0.2))
        }

        const view: ViewState = {
          time,
          atlas: data,
          anim,
          labels: labelsRef.current,
          layerId: live.layerId,
          activePart: live.activePart,
          activeElement: live.activeElement,
          litElements: litElementsRef.current,
          litParts: litPartsRef.current,
          pick: pickRef.current,
        }

        drawMap(ctx, layout.map, view, hitsRef.current, layout.mobile, dpr)
        drawArcs(ctx, layout.map, view, hitsRef.current, layout.mobile)
        drawTable(ctx, layout.table, view, hitsRef.current, layout.mobile)
        drawPhone(ctx, layout.phone, view, hitsRef.current, layout.mobile)
      } catch (error) {
        window.cancelAnimationFrame(frameId)
        console.error('[phone-elements] render stopped', error)
      }
    }

    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [elementsById])

  /* ------------------------------------------------------------- pointing */

  function handleCanvasPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !atlas) return
    const rect = canvas.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const hits = hitsRef.current

    for (const pin of hits.pins) {
      if (Math.hypot(px - pin.x, py - pin.y) <= pin.r) {
        controls.registerInteraction()
        return
      }
    }
    for (const cell of hits.cells) {
      if (px >= cell.x && px <= cell.x + cell.w && py >= cell.y && py <= cell.y + cell.h) {
        controls.registerInteraction()
        setActiveElement((current) => (current === cell.sym ? null : cell.sym))
        return
      }
    }
    // 板块从最前面一层往回查，视觉上压在上面的先被点中
    for (let i = hits.plates.length - 1; i >= 0; i -= 1) {
      const plate = hits.plates[i]
      const u = (px - plate.e) / plate.a
      const v = (py - plate.f - plate.b * u) / plate.d
      if (Math.abs(u) <= plate.halfU && Math.abs(v) <= plate.halfV) {
        controls.registerInteraction()
        choosePart(stateRef.current.activePart === plate.id ? null : plate.id)
        return
      }
    }
    controls.registerInteraction()
    setActiveElement(null)
    setActivePart(null)
  }

  /* ----------------------------------------------------------- story steps */

  const guideSteps: Array<GuideStep> = [
    {
      title: '它看着只是玻璃和金属',
      body: '一块玻璃，一圈金属，一块会亮的屏。掂在手里，它像一件完整、干净、说不清里面有什么的东西。',
      durationMs: 5_600,
      action: () => runScene(() => {
        setActivePart(null)
        setActiveElement(null)
        setLayerId('mass')
        setScene({ explode: 0, table: 0, map: 0, spin: 1 })
      }),
    },
    {
      title: '拆开看',
      body: '在拆解台上它散成十层：盖板、屏幕、中框、主板、芯片、摄像头、扬声器、马达、电池、天线。',
      durationMs: 6_200,
      action: () => runScene(() => {
        setActivePart(null)
        setActiveElement(null)
        setScene({ explode: 0, table: 0, map: 0, spin: 1 })
        after(320, () => setScene({ explode: 1 }))
      }),
    },
    {
      title: '五十三种金属',
      body: '把每一层溶解、送进质谱仪，数出 53 种金属。铁最多，有 16 克；金只有 16.8 毫克。',
      durationMs: 8_200,
      action: () => runScene(() => {
        setActivePart(null)
        setActiveElement(null)
        setScene({ explode: 1, table: 0, map: 0, spin: 0.4 })
        after(260, () => setScene({ table: 1 }))
      }),
    },
    {
      title: '它们从哪里来',
      body: '钴有 76% 来自一个国家，镓有 98% 来自另一个。产地地图一亮，你就看见了供应链风险的实体。',
      durationMs: 9_600,
      action: () => runScene(() => {
        setActivePart(null)
        setLayerId('supply')
        setActiveElement('Co')
        setScene({ explode: 1, table: 1, map: 0, spin: 0.25 })
        after(240, () => setScene({ map: 1 }))
        after(4_600, () => setActiveElement('Ga'))
      }),
    },
    {
      title: '你来拆',
      body: '点任意一层，看它用到哪些元素；点一个元素，看它从世界哪些角落被挖出来，再汇回你手上。',
      durationMs: 7_200,
      action: () => runScene(() => {
        setLayerId('mass')
        setActiveElement(null)
        setActivePart(null)
        setScene({ ...freeScene })
      }),
    },
  ]

  /* --------------------------------------------------------------- readout */

  const totalMass = useMemo(() => (
    partElements.reduce((sum, element) => sum + totalMg(element), 0)
  ), [partElements])

  const activePartRecord = atlas?.parts.find((part) => part.id === activePart) ?? null
  const producerLine = selected?.top?.length
    ? selected.top
      .map(([code, share]) => {
        const country = atlas?.countries[code]
        return country ? `${pick(country)} ${share}%` : null
      })
      .filter((entry): entry is string => entry !== null)
      .join(' · ')
    : null

  const layerChips: Array<{ id: LayerId; label: string }> = [
    { id: 'mass', label: tx('元素用量') },
    { id: 'supply', label: tx('供应集中度') },
    { id: 'ree', label: tx('稀土') },
    { id: 'recycle', label: tx('可回收性') },
  ]

  const layerNote: Record<LayerId, string> = {
    mass: tx('格子越亮，这种元素在机内越多'),
    supply: tx('越红，前三个产地合起来占得越多'),
    ree: tx('四种稀土全在磁体里：扬声器、摄像头、马达'),
    recycle: tx('一整台手机里的金，比富金矿石浓 34 倍；只算主板，是 234 倍'),
  }

  return (
    <div ref={rootRef} className={`oss-experience elem-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="elem-canvas"
        onPointerDown={handleCanvasPointer}
        aria-label={tx('手机部件、元素周期表与全球产地地图')}
      />

      {!storyMode && (
        <header className="elem-plate" data-experience-overlay="true">
          <span>{tx('材料与供应链')}</span>
          <h1>{tx('一部手机，拆开是半张世界地图')}</h1>
        </header>
      )}

      <aside ref={readoutRef} className="elem-readout" data-experience-overlay="true">
        {failed && <div className="elem-readout-row"><b>{tx('数据没能载入')}</b></div>}
        {!failed && !atlas && <div className="elem-readout-row"><b>{tx('正在取出这台手机的成分表……')}</b></div>}
        {atlas && (
          <>
            <div className="elem-readout-row is-key">
              <small>{tx('当前部件')}</small>
              <b>{activePartRecord ? pick(activePartRecord) : tx('整机')}</b>
            </div>
            <div className="elem-readout-row">
              <small>{tx('涉及元素')}</small>
              <b>{partElements.length}<i>/ {atlas.elements.length}</i></b>
            </div>
            <div className="elem-readout-row">
              <small>{tx('这些元素合计')}</small>
              <b>{formatMass(totalMass)}</b>
            </div>
            {selected && (
              <div className="elem-readout-row is-key">
                <small>{selected.sym} · {pick(selected)}</small>
                <b>
                  {formatMass(totalMg(selected))}
                  {selected.batteryMg !== undefined && <i>{tx('含电池推算值')}</i>}
                  {selected.crust !== undefined && <i>{tx('地壳')} {formatCrust(selected.crust)}</i>}
                </b>
              </div>
            )}
            {selected && producerLine && (
              <div className="elem-readout-row is-wide">
                <small>{tx('主要产出国')}</small>
                <b>{producerLine}</b>
              </div>
            )}
            {concentration !== null && (
              <div className="elem-readout-row is-key">
                <small>{selected ? tx('前三国合计') : tx('平均供应集中度')}</small>
                <b>{concentration.toFixed(0)}%</b>
              </div>
            )}
            <p>
              <span>{layerNote[layerId]}</span>
              {selected?.roleZh && selected.roleEn && <span>{pick({ zh: selected.roleZh, en: selected.roleEn })}</span>}
              <span>{tx('实验室从整机测出')} {atlas.meta.measuredMetals} {tx('种金属')}</span>
              <span>{tx('这里画出用量与产地可查的')} {atlas.elements.length}</span>
            </p>
          </>
        )}
      </aside>

      {!storyMode && atlas && (
        <Freebar
          className="elem-freebar"
          mainClassName="elem-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={1}
          secondaryDefault="closed"
          secondary={(
            <div className="elem-tray">
              <div className="elem-chip-rail elem-freebar-layers experience-freebar-chips" role="group" aria-label={tx('图层')}>
                {layerChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`elem-chip is-layer${layerId === chip.id ? ' is-on' : ''}`}
                    onClick={() => {
                      controls.registerInteraction()
                      setLayerId(chip.id)
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('phone-elements')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="elem-chip-rail elem-freebar-chips experience-freebar-rail" role="group" aria-label={tx('手机部件')}>
            <button
              type="button"
              className={`elem-chip${activePart === null ? ' is-on' : ''}`}
              onClick={() => {
                controls.registerInteraction()
                choosePart(null)
              }}
            >
              {tx('整机')}
            </button>
            {atlas.parts.map((part) => (
              <button
                key={part.id}
                type="button"
                className={`elem-chip elem-part${activePart === part.id ? ' is-on' : ''}`}
                onClick={() => {
                  controls.registerInteraction()
                  choosePart(activePart === part.id ? null : part.id)
                }}
              >
                {pick(part)}
              </button>
            ))}
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="phone-elements"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'monumental' },
          { position: 'top-right', mobilePosition: 'top-left', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'editorial', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', width: 'wide', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'top-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'annotation' },
          { position: 'top-center', mobilePosition: 'top-center', motion: 'scale', tone: 'light', width: 'normal', treatment: 'editorial' },
        ]}
        showReplayChip={false}
        onExit={() => {
          clearTimers()
          sceneRef.current = { ...freeScene }
          enterFree()
        }}
      />
      {!storyMode && (
        <GhostHint worldId="phone-elements" gesture={{ type: 'tap', target: '.elem-part', label: '点开一个部件' }} />
      )}
    </div>
  )
}
