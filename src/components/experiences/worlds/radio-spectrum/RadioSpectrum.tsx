import './styles/RadioSpectrum.css'
import { FilmStrip } from '@phosphor-icons/react'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n/index'
import {
  BANDS,
  F_MAX,
  F_MIN,
  LANDMARKS,
  LOG_MAX,
  LOG_MIN,
  SERVICE_INK,
  SERVICE_NAMES,
  bandAt,
  buildTicks,
  formatFrequency,
  formatLength,
  ituBandAt,
  lotAt,
  nearestObject,
  wavelength,
  type SpectrumBand,
} from './radio-spectrum-data'
import {
  INK,
  MONO,
  SANS,
  clamp,
  drawChannelPanel,
  drawLotPanel,
  drawWallPanel,
  drawWavePanel,
  visibleColour,
  wrapText,
  type PanelBox,
} from './radio-spectrum-visuals'

const TAU = Math.PI * 2
const SPAN_MAX = LOG_MAX - LOG_MIN
const SPAN_MIN = 4e-4
const FRICTION = 3.4
/** 起手落在 2.45 GHz：微波炉、WiFi 和蓝牙挤在一起的那一格 */
const HOME_CENTER = Math.log10(2.45e9)
const HOME_SPAN = SPAN_MAX * 0.95

type LayerId = 'wave' | 'channel' | 'wall' | 'lot'

type Flight = {
  fromCenter: number
  toCenter: number
  fromSpan: number
  toSpan: number
  start: number
  duration: number
}

type Labels = {
  wave: string
  waveRuler: string
  channel: string
  channelNone: string
  wall: string
  wallThrough: string
  wallAround: string
  wallExtrapolated: string
  wallGeometry: string
  wallShadow: string
  wallLabel: string
  lot: string
  lotNote: string
  scope: string
}

function smootherstep(t: number) {
  const x = clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function approach(current: number, target: number, dt: number, tau: number) {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

/**
 * 沉浸查看用 display:none，海报抓取用 opacity:0，两者都作用在外层壳上，
 * 所以判断可见性必须沿祖先链一路往上查。
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

type Layout = {
  mobile: boolean
  width: number
  height: number
  padX: number
  innerW: number
  stageTop: number
  stageBottom: number
  signTop: number
  signSize: number
  blocksTop: number
  /** 楼最高只到这里，上面那条带子留给门牌 */
  skyTop: number
  railY: number
  roadBottom: number
  panelTop: number
  /** 路面透视线收敛到的那一点，就在调谐光柱脚下 */
  vanishX: number
}

/** Height of the caption band that story chapters use on a phone. */
const PHONE_STORY_CAPTION_RESERVE = 272

function computeLayout(width: number, height: number, storyMode: boolean, reserve: number, topReserve: number): Layout {
  const mobile = width < 720
  const padX = mobile ? 14 : 34
  const innerW = Math.max(40, width - padX * 2)
  const rawTop = Math.max(storyMode ? (mobile ? 58 : 74) : mobile ? 60 : 84, topReserve)
  const bottomReserve = clamp(reserve, 24, height * 0.54)
  const rawBottom = Math.max(rawTop + 190, height - bottomReserve)
  /*
   * 沉浸查看和海报抓取会把底区整个藏掉，舞台一下子高出一大截。
   * 这时候不该把街拉长成一排细柱，而是保持比例、整体居中——留白本身也是构图。
   */
  const maxStageH = mobile ? 640 : 800
  const overflow = Math.max(0, rawBottom - rawTop - maxStageH)
  const stageTop = rawTop + overflow * 0.46
  const stageBottom = rawBottom - overflow * 0.54
  const stageH = stageBottom - stageTop
  // 故事模式下读数带已经贴在顶上，路牌就不再重复一次大号数字
  const signSize = storyMode ? 0 : Math.min(mobile ? 23 : 36, stageH * 0.085)
  const signTop = stageTop + 2
  // 先给下方面板留够高度，再由下往上排路面和导轨——否则面板一挤，剖面就没法看了
  const panelH = clamp(stageH * 0.36, mobile ? 118 : 150, mobile ? 205 : 250)
  const panelTop = stageBottom - panelH
  const roadBottom = panelTop - (mobile ? 10 : 16)
  const railY = roadBottom - clamp(stageH * 0.12, 30, mobile ? 50 : 70)
  const blocksTop = Math.max(stageTop + (mobile ? 18 : 14), signTop + signSize + (mobile ? 12 : 20))
  return {
    mobile,
    width,
    height,
    padX,
    innerW,
    stageTop,
    stageBottom,
    signTop,
    signSize,
    blocksTop,
    skyTop: blocksTop + (mobile ? 30 : 54),
    railY,
    roadBottom,
    panelTop,
    vanishX: padX + innerW / 2,
  }
}

type View = { center: number; span: number }

type BlockPlacement = { x0: number; x1: number; top: number; band: SpectrumBand; focus: number; glow: number }

export function RadioSpectrum({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const zh = locale === 'zh'
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('radio-spectrum')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLElement>(null)

  const [layer, setLayer] = useState<LayerId>('wave')
  const [cruising, setCruising] = useState(false)
  const [toolTab, setToolTab] = useState<'bands' | 'layers'>('bands')
  /** 只为驱动读数重绘；真正的视图状态活在 viewRef 里，逐帧更新 */
  const [tuned, setTuned] = useState({ center: HOME_CENTER, span: HOME_SPAN })

  const viewRef = useRef<View>({ center: HOME_CENTER, span: HOME_SPAN })
  const velocityRef = useRef({ center: 0, span: 0 })
  const flightRef = useRef<Flight | null>(null)
  const queueRef = useRef<Array<Omit<Flight, 'start'>>>([])
  const revealRef = useRef(storyMode ? 0 : 1)
  const revealTargetRef = useRef(1)
  const layerRef = useRef<LayerId>('wave')
  layerRef.current = layer
  const layerFadeRef = useRef(1)
  const storyRef = useRef(storyMode)
  storyRef.current = storyMode
  const localeRef = useRef(zh)
  localeRef.current = zh
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const dragRef = useRef<{ x: number; lastLog: number; time: number } | null>(null)
  const pinchRef = useRef<{ distance: number; centerX: number } | null>(null)
  const timersRef = useRef<Array<number>>([])
  const reserveRef = useRef(190)
  const topReserveRef = useRef(0)
  const backdropRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null)
  const ticksRef = useRef<{ left: number; right: number; ticks: ReturnType<typeof buildTicks>['ticks']; unit: string } | null>(null)
  const cruisingRef = useRef(false)
  cruisingRef.current = cruising

  const labels: Labels = {
    wave: tx('波长实感 · 一个波长真的有多长'),
    waveRuler: tx('画面宽度'),
    channel: tx('这块地皮内部怎么分'),
    channelNone: tx('这一段没有细分到普通人能对上号的信道'),
    wall: tx('穿墙与绕射 · ITU-R P.2040 / P.526 模型'),
    wallThrough: tx('穿墙损耗'),
    wallAround: tx('绕过墙角'),
    wallExtrapolated: tx('虚线为建议书适用范围之外的外推'),
    wallGeometry: tx('墙角高 3 m · 前 30 m · 后 20 m'),
    wallShadow: tx('墙角后的阴影区'),
    wallLabel: tx('20 cm 混凝土'),
    lot: tx('频谱地产 · 公开拍卖成交额'),
    lotNote: tx('按公告当年货币，未做通胀调整'),
    scope: tx('以 ITU 全球划分为准，各国与三个区不同'),
  }
  const labelsRef = useRef(labels)
  labelsRef.current = labels

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }

  function after(ms: number, run: () => void) {
    timersRef.current.push(window.setTimeout(run, ms))
  }

  useEffect(() => () => clearTimers(), [])

  function clampView(view: View) {
    const span = clamp(view.span, SPAN_MIN, SPAN_MAX)
    const half = span / 2
    const center = clamp(view.center, LOG_MIN + half, LOG_MAX - half)
    return { center, span }
  }

  function flyTo(center: number, span: number, duration = 900) {
    const view = viewRef.current
    flightRef.current = {
      fromCenter: view.center,
      toCenter: center,
      fromSpan: Math.log10(view.span),
      toSpan: Math.log10(clamp(span, SPAN_MIN, SPAN_MAX)),
      start: performance.now(),
      duration,
    }
    velocityRef.current = { center: 0, span: 0 }
  }

  function queueFlight(center: number, span: number, duration: number) {
    const view = viewRef.current
    const previous = queueRef.current[queueRef.current.length - 1]
    const fromCenter = previous ? previous.toCenter : flightRef.current?.toCenter ?? view.center
    const fromSpan = previous ? previous.toSpan : flightRef.current?.toSpan ?? Math.log10(view.span)
    queueRef.current.push({
      fromCenter,
      toCenter: center,
      fromSpan,
      toSpan: Math.log10(clamp(span, SPAN_MIN, SPAN_MAX)),
      duration,
    })
  }

  function stopFlight() {
    flightRef.current = null
    queueRef.current = []
    if (cruisingRef.current) setCruising(false)
  }

  /** 从长波一路飞到可见光；沿途在几个地标上收窄一下，才有「街」的感觉 */
  function startCruise() {
    stopFlight()
    setCruising(true)
    const stops: Array<[number, number, number]> = [
      [Math.log10(6e5), 1.2, 1_500],
      [Math.log10(9.7e7), 0.9, 2_600],
      [Math.log10(1.5754e9), 0.5, 2_600],
      [Math.log10(2.45e9), 0.22, 2_000],
      [Math.log10(2.7e10), 1.0, 2_600],
      [Math.log10(2.9e13), 1.6, 2_600],
      [Math.log10(5.6e14), 0.55, 2_800],
    ]
    flyTo(stops[0][0], stops[0][1], stops[0][2])
    for (let i = 1; i < stops.length; i += 1) queueFlight(stops[i][0], stops[i][1], stops[i][2])
  }

  function frameBand(band: SpectrumBand, pad = 2.4) {
    const logLow = Math.log10(band.f0)
    const logHigh = Math.log10(band.f1)
    return {
      center: (logLow + logHigh) / 2,
      span: clamp((logHigh - logLow) * pad, SPAN_MIN, SPAN_MAX),
    }
  }

  function jumpTo(bandId: string, duration = 1_000) {
    const band = BANDS.find((item) => item.id === bandId)
    if (!band) return
    const framed = frameBand(band)
    stopFlight()
    flyTo(framed.center, framed.span, duration)
  }

  function jumpToFrequency(frequency: number, span: number, duration = 1_000) {
    stopFlight()
    flyTo(Math.log10(frequency), span, duration)
  }

  /**
   * 底区（字幕轨 / freebar）和读数带的高度都随内容与屏宽变，量出来最稳。
   * 沉浸查看或海报抓取把底区藏起来时，那块空间必须还给主体。
   */
  function measureDock() {
    const root = rootRef.current
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const dockElement = root.querySelector('.experience-freebar-main') ?? root.querySelector('.guide-card')
    const dockRect = dockElement?.getBoundingClientRect()
    const dockShown = Boolean(dockRect) && dockRect!.height > 4 && isVisible(dockElement)
    // Phone story chapters: the caption owns the top band and the readout sits above the slim story bar.
    const phoneStory = storyRef.current && rootRect.width < 720
    const dockHeight = phoneStory ? 72 : dockShown ? Math.max(0, rootRect.bottom - dockRect!.top) + 12 : 22
    root.style.setProperty('--spec-dock', `${Math.round(dockHeight)}px`)
    const readout = readoutRef.current
    const readoutShown = Boolean(readout) && readout!.offsetHeight > 0 && isVisible(readout)
    // 故事模式把读数带挪到了顶上，它占的是天空而不是底区
    const readoutAtTop = readoutShown && storyRef.current && !phoneStory
    reserveRef.current = dockHeight + (readoutShown && !readoutAtTop ? readout!.offsetHeight + 14 : 0)

    const plate = root.querySelector('.spec-plate')
    const topElement = readoutAtTop ? readout : isVisible(plate) ? plate : null
    const topRect = topElement?.getBoundingClientRect()
    topReserveRef.current = phoneStory
      ? PHONE_STORY_CAPTION_RESERVE
      : topRect && topRect.height > 4 ? topRect.bottom - rootRect.top + 12 : 0
  }

  /* ── 主循环 ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId = 0
    let previous = performance.now()
    let clock = 0
    let frames = 0
    let syncClock = 0

    const frame = (now: number) => {
      frameId = window.requestAnimationFrame(frame)
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1_000))
      previous = now
      clock += dt

      try {
        const view = viewRef.current
        const velocity = velocityRef.current

        // 飞行：故事分镜与巡航都走这条队列
        const flight = flightRef.current
        if (flight) {
          const progress = Math.min(1, (now - flight.start) / flight.duration)
          const eased = smootherstep(progress)
          view.center = flight.fromCenter + (flight.toCenter - flight.fromCenter) * eased
          view.span = 10 ** (flight.fromSpan + (flight.toSpan - flight.fromSpan) * eased)
          if (progress >= 1) {
            const next = queueRef.current.shift()
            flightRef.current = next ? { ...next, start: now } : null
            if (!next && cruisingRef.current) setCruising(false)
          }
        } else if (!dragRef.current) {
          // 惯性：松手之后还在街上滑一段
          view.center += velocity.center * dt
          view.span *= Math.exp(velocity.span * dt)
          const decay = Math.exp(-FRICTION * dt)
          velocity.center *= decay
          velocity.span *= decay
          if (Math.abs(velocity.center) < 1e-4) velocity.center = 0
          if (Math.abs(velocity.span) < 1e-4) velocity.span = 0
        }

        const clamped = clampView(view)
        if (clamped.center !== view.center) velocity.center = 0
        if (clamped.span !== view.span) velocity.span = 0
        view.center = clamped.center
        view.span = clamped.span

        revealRef.current = approach(revealRef.current, revealTargetRef.current, dt, 0.42)
        layerFadeRef.current = Math.min(1, layerFadeRef.current + dt * 2.6)

        // 读数带只需要每几帧同步一次，省掉大量 React 重渲染
        syncClock += dt
        if (syncClock > 0.09) {
          syncClock = 0
          setTuned((current) =>
            Math.abs(current.center - view.center) > 1e-4 || Math.abs(current.span - view.span) > 1e-5
              ? { center: view.center, span: view.span }
              : current,
          )
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        if (frames % 5 === 1) measureDock()
        frames += 1

        const layout = computeLayout(width, height, storyRef.current, reserveRef.current, topReserveRef.current)
        render(ctx, layout, view, clock)
      } catch (error) {
        window.cancelAnimationFrame(frameId)
        console.error('[radio-spectrum] render stopped', error)
      }
    }

    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
    // 渲染读取的都是 ref，循环只需要建立一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 绘制 ───────────────────────────────────────────────── */
  function render(ctx: CanvasRenderingContext2D, layout: Layout, view: View, clock: number) {
    const { width, padX, innerW } = layout
    const left = view.center - view.span / 2
    const xOfLog = (logF: number) => padX + ((logF - left) / view.span) * innerW
    const xOf = (frequency: number) => xOfLog(Math.log10(frequency))
    const fLeft = 10 ** left
    const fRight = 10 ** (left + view.span)
    const cursorX = padX + innerW / 2
    const cursorF = 10 ** view.center
    const reveal = revealRef.current
    const speed = Math.abs(velocityRef.current.center) + (flightRef.current ? 1.5 : 0)

    drawBackdrop(ctx, layout, clock)
    drawRoad(ctx, layout, xOf, fLeft, fRight, cursorX, speed, clock)
    const placements = drawStreet(ctx, layout, xOfLog, cursorX, reveal, speed, clock)
    drawLandmarks(ctx, layout, view, xOf, reveal, clock)
    drawBeam(ctx, layout, cursorX, clock)
    drawHaze(ctx, layout)
    drawStreetLabels(ctx, layout, placements, speed)
    drawSign(ctx, layout, cursorX, cursorF)
    drawPanel(ctx, layout, xOf, fLeft, fRight, cursorF, clock)
    void width
  }

  /**
   * 天空、地平辉光和路面底色只随尺寸变，逐帧重铺几百万像素的渐变太贵。
   * 烘一张离屏底图，每帧一次 drawImage 贴上去即可。
   */
  function paintBackdrop(target: CanvasRenderingContext2D, layout: Layout) {
    const { width, height, railY, stageTop, roadBottom, vanishX } = layout
    const sky = target.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, '#04060b')
    sky.addColorStop(0.34, '#070a12')
    sky.addColorStop(0.72, '#0a0e17')
    sky.addColorStop(1, '#04050a')
    target.fillStyle = sky
    target.fillRect(0, 0, width, height)

    const reach = Math.max(110, (railY - stageTop) * 0.9)
    const vertical = target.createLinearGradient(0, railY - reach, 0, railY + reach * 0.55)
    vertical.addColorStop(0, 'rgba(255, 172, 100, 0)')
    vertical.addColorStop(0.72, 'rgba(255, 178, 104, 0.06)')
    vertical.addColorStop(0.86, 'rgba(255, 190, 116, 0.13)')
    vertical.addColorStop(1, 'rgba(255, 172, 100, 0)')
    target.fillStyle = vertical
    target.fillRect(0, railY - reach, width, reach * 1.55)

    const middle = target.createLinearGradient(vanishX - reach * 1.6, 0, vanishX + reach * 1.6, 0)
    middle.addColorStop(0, 'rgba(255, 186, 112, 0)')
    middle.addColorStop(0.5, 'rgba(255, 186, 112, 0.07)')
    middle.addColorStop(1, 'rgba(255, 186, 112, 0)')
    target.fillStyle = middle
    target.fillRect(vanishX - reach * 1.6, railY - reach * 0.7, reach * 3.2, reach * 1.2)

    const depth = roadBottom - railY
    const surface = target.createLinearGradient(0, railY, 0, roadBottom + depth * 0.5)
    surface.addColorStop(0, 'rgba(44, 56, 78, 0.55)')
    surface.addColorStop(0.45, 'rgba(20, 26, 38, 0.42)')
    surface.addColorStop(1, 'rgba(6, 8, 13, 0)')
    target.fillStyle = surface
    target.fillRect(0, railY, width, depth * 1.5)
  }

  function drawBackdrop(ctx: CanvasRenderingContext2D, layout: Layout, clock: number) {
    const { width, height, railY, stageTop } = layout
    const key = `${Math.round(width)}x${Math.round(height)}:${Math.round(railY)}:${Math.round(layout.roadBottom)}:${Math.round(layout.vanishX)}:${Math.round(stageTop)}`
    let cached = backdropRef.current
    if (!cached || cached.key !== key) {
      const offscreen = cached?.canvas ?? document.createElement('canvas')
      offscreen.width = Math.max(1, Math.round(width))
      offscreen.height = Math.max(1, Math.round(height))
      const offscreenCtx = offscreen.getContext('2d')
      if (!offscreenCtx) return
      offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
      paintBackdrop(offscreenCtx, layout)
      cached = { key, canvas: offscreen }
      backdropRef.current = cached
    }
    ctx.drawImage(cached.canvas, 0, 0, width, height)

    // 极缓的高空气流，静止时画面也在呼吸
    for (let i = 0; i < 4; i += 1) {
      const y = stageTop + 18 + i * 30 + ((clock * (4 + i * 2)) % 34)
      ctx.strokeStyle = `rgba(190, 214, 255, ${0.02 + i * 0.003})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  /** 路面：向屏幕中央收敛的透视线，把这条标尺变成一条真的能飞进去的街 */
  function drawRoad(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    xOf: (frequency: number) => number,
    fLeft: number,
    fRight: number,
    cursorX: number,
    speed: number,
    clock: number,
  ) {
    const { railY, roadBottom, width, padX, mobile, vanishX } = layout
    const depth = roadBottom - railY

    const cache = ticksRef.current
    if (!cache || Math.abs(cache.left / fLeft - 1) > 1e-4 || Math.abs(cache.right / fRight - 1) > 1e-4) {
      ticksRef.current = { left: fLeft, right: fRight, ...buildTicks(fLeft, fRight) }
    }
    const { ticks, unit } = ticksRef.current!
    // 刻度多到并不成透视的时候，细线就别画了，省下几百次描边
    const minorLines = ticks.length <= 60

    // 每个刻度向消失点抛一条路面线；近处宽、远处并拢，透视就出来了
    ctx.save()
    ctx.lineWidth = 1
    for (const tick of ticks) {
      if (!tick.major && !minorLines) continue
      const x = xOf(tick.f)
      if (x < -60 || x > width + 60) continue
      const spread = (x - vanishX) * 1.9
      const nearX = vanishX + spread
      const alpha = tick.major ? 0.34 : 0.12
      if (tick.major) {
        const line = ctx.createLinearGradient(x, railY, nearX, roadBottom)
        line.addColorStop(0, `rgba(196, 214, 246, ${alpha * 0.22})`)
        line.addColorStop(1, `rgba(196, 214, 246, ${alpha})`)
        ctx.strokeStyle = line
      } else {
        ctx.strokeStyle = `rgba(196, 214, 246, ${alpha * 0.6})`
      }
      ctx.beginPath()
      ctx.moveTo(x, railY)
      ctx.lineTo(nearX, roadBottom)
      ctx.stroke()
    }

    // 路面上的横向节拍：越靠近观众越疏，飞行时向下涌
    const rows = 6
    const drift = speed > 0.02 ? (clock * 0.55) % 1 : 0
    for (let i = 0; i < rows; i += 1) {
      const t = ((i + drift) / rows) ** 2.1
      const y = railY + depth * t
      if (y > roadBottom) continue
      ctx.strokeStyle = `rgba(196, 214, 246, ${0.05 + t * 0.08})`
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()

    // 导轨本身：中间亮、两端沉进雾里
    const rail = ctx.createLinearGradient(0, 0, width, 0)
    rail.addColorStop(0, 'rgba(255, 214, 160, 0.04)')
    rail.addColorStop(clamp(cursorX / width, 0.02, 0.98), 'rgba(255, 232, 186, 0.62)')
    rail.addColorStop(1, 'rgba(255, 214, 160, 0.04)')
    ctx.fillStyle = rail
    ctx.fillRect(0, railY - 0.6, width, 1.3)

    // 掠过速度：贴着路面拖出流光
    if (speed > 0.3) {
      const streaks = Math.min(22, Math.round(speed * 11))
      const direction = Math.sign(
        velocityRef.current.center || (flightRef.current ? flightRef.current.toCenter - flightRef.current.fromCenter : 1),
      ) || 1
      ctx.save()
      for (let i = 0; i < streaks; i += 1) {
        const t = (clock * 1.5 + i / streaks) % 1
        const x = padX + t * (width - padX * 2)
        const length = clamp(speed * 70, 16, 210) * (0.5 + ((i * 37) % 11) / 11)
        const y = railY + 3 + ((i * 53) % 7)
        const gradient = ctx.createLinearGradient(x, y, x - direction * length, y)
        gradient.addColorStop(0, `rgba(255, 226, 176, ${clamp(speed * 0.14, 0, 0.28)})`)
        gradient.addColorStop(1, 'rgba(255, 226, 176, 0)')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - direction * length, y)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 刻度：路缘石上的号码
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const tick of ticks) {
      const x = xOf(tick.f)
      if (x < padX - 34 || x > width - padX + 34) continue
      ctx.strokeStyle = tick.major ? 'rgba(226, 220, 208, 0.4)' : 'rgba(226, 220, 208, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 0.5, railY + 1)
      ctx.lineTo(x + 0.5, railY + (tick.major ? 7 : 3))
      ctx.stroke()
      if (tick.label) {
        ctx.font = `500 ${mobile ? 9 : 10}px ${MONO}`
        ctx.fillStyle = 'rgba(226, 220, 208, 0.46)'
        ctx.fillText(tick.label, x, railY + 10)
      }
    }
    if (unit) {
      ctx.textAlign = 'right'
      ctx.font = `500 ${mobile ? 9 : 10}px ${MONO}`
      ctx.fillStyle = 'rgba(226, 220, 208, 0.32)'
      ctx.fillText(unit, width - padX, railY + 10)
    }
    ctx.restore()
  }

  /** 街区：每一段真实划分都是一栋楼；远处沉进雾里，走近才亮起来 */
  function drawStreet(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    xOfLog: (logF: number) => number,
    cursorX: number,
    reveal: number,
    speed: number,
    clock: number,
  ): Array<BlockPlacement> {
    const { railY, skyTop, mobile, padX, width, innerW } = layout
    // 天际线再高也有个头：楼一旦拉过三百像素，看着就又变回柱状图了
    const fullHeight = clamp(railY - skyTop, 80, mobile ? 220 : 300)
    const placements: Array<BlockPlacement> = []
    const sharpScale = innerW * 0.3
    const depthScale = innerW * 0.62
    const blur = clamp(speed * 9, 0, 16)

    for (const band of BANDS) {
      const x0 = xOfLog(Math.log10(band.f0))
      const x1 = xOfLog(Math.log10(band.f1))
      if (x1 < -90 || x0 > width + 90) continue
      const widthPx = x1 - x0
      const distance = cursorX < x0 ? x0 - cursorX : cursorX > x1 ? cursorX - x1 : 0
      const focus = Math.exp(-((distance / sharpScale) ** 2))
      const near = clamp(1 - distance / depthScale, 0, 1)
      const haze = (1 - near) ** 0.75
      const rankWeight = band.rank / 2
      const position = (Math.log10((band.f0 + band.f1) / 2) - LOG_MIN) / (LOG_MAX - LOG_MIN)
      const gate = clamp((reveal - position * 0.9) / 0.14, 0, 1)
      if (gate <= 0.002) continue

      // 天际线的高低差：楼层数由 id 固定推出来，只是布景，主导的仍然是「走多近」
      const storeys = 0.86 + ((band.id.charCodeAt(0) * 7 + band.id.length * 13) % 9) / 32
      const prominence = clamp(
        (0.14 + 0.24 * rankWeight) * (0.3 + 0.7 * near ** 1.25) * storeys + 0.46 * focus * storeys,
        0,
        widthPx > innerW * 0.7 ? 0.76 : 1,
      ) * gate
      const blockHeight = Math.max(1.5, fullHeight * prominence)
      const top = railY - blockHeight
      const ink = SERVICE_INK[band.service]
      const spectral = band.service === 'visible'
      const clipLeft = Math.max(x0, -24)
      const clipRight = Math.min(x1, width + 24)
      const body = clipRight - clipLeft
      if (body <= 0.4 || blockHeight < 2) continue

      // 远处的楼被夜雾洗成蓝灰，只有走近的才显出自己的颜色——街不是一张彩色图例
      const tint = (light: number, alpha: number) => (spectral
        ? `rgba(${208 + 32 * near}, ${214 + 26 * near}, 232, ${alpha})`
        : `hsla(${ink.hue + (218 - ink.hue) * haze * 0.9}, ${ink.sat * (1 - haze) ** 1.5 + 5}%, ${light - haze * 12}%, ${alpha})`)

      ctx.save()

      // 楼体
      if (spectral) {
        const gradient = ctx.createLinearGradient(x0, 0, x1, 0)
        for (let i = 0; i <= 10; i += 1) {
          const t = i / 10
          const f = 10 ** (Math.log10(band.f0) + t * Math.log10(band.f1 / band.f0))
          gradient.addColorStop(t, visibleColour(wavelength(f) * 1e9, (0.2 + 0.46 * near) * gate))
        }
        ctx.fillStyle = gradient
        ctx.fillRect(clipLeft, top, body, blockHeight)
      } else if (near > 0.12 && blockHeight > 8) {
        const fill = ctx.createLinearGradient(0, top, 0, railY)
        fill.addColorStop(0, tint(ink.light, (0.055 + 0.34 * near ** 1.4) * gate))
        fill.addColorStop(0.75, tint(ink.light - 6, (0.03 + 0.1 * near) * gate))
        fill.addColorStop(1, tint(ink.light - 10, 0.012 * gate))
        ctx.fillStyle = fill
        ctx.fillRect(clipLeft, top, body, blockHeight)
      } else {
        ctx.fillStyle = tint(ink.light - 4, (0.03 + 0.14 * near) * gate)
        ctx.fillRect(clipLeft, top, body, blockHeight)
      }

      // 高速掠过时留下一点横向拖影
      if (blur > 1 && near > 0.3) {
        ctx.globalAlpha = 0.22
        ctx.fillRect(clipLeft - blur, top, body, blockHeight)
        ctx.fillRect(clipLeft + blur, top, body, blockHeight)
        ctx.globalAlpha = 1
      }

      // 屋脊：这条亮线就是街的天际线；再压一条厚度带，楼体才有体积。
      // 每栋楼有自己的相位，慢慢明暗一次——静止时画面也还在呼吸。
      const shimmer = 0.86 + 0.14 * Math.sin(clock * 0.85 + band.f0 % 7)
      const roofAlpha = (0.2 + 0.72 * near) * gate * shimmer
      ctx.fillStyle = spectral
        ? `rgba(255, 255, 255, ${roofAlpha})`
        : `hsla(${ink.hue + (218 - ink.hue) * haze * 0.7}, ${Math.min(96, ink.sat * (1 - haze) ** 1.2 + 12)}%, ${Math.min(92, ink.light + 20)}%, ${roofAlpha})`
      ctx.fillRect(clipLeft, top - 1.5, body, 1.7)
      if (body > 5 && blockHeight > 12) {
        ctx.fillStyle = tint(ink.light + 6, 0.1 * gate * near)
        ctx.fillRect(clipLeft, top, body, Math.min(5, blockHeight * 0.16))
      }

      // 立边：朝向街心的一侧亮，背面暗
      if (widthPx > 2.4) {
        for (const [edgeX, lit] of [[x0, x0 > cursorX], [x1, x1 < cursorX]] as const) {
          if (edgeX < -8 || edgeX > width + 8) continue
          ctx.strokeStyle = tint(ink.light + (lit ? 14 : -12), (lit ? 0.16 + 0.4 * near : 0.06 + 0.14 * near) * gate)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(edgeX + 0.5, top)
          ctx.lineTo(edgeX + 0.5, railY)
          ctx.stroke()
        }
      }

      // 窗格：真实的信道结构，缩放到位才浮出来
      if (band.channels && widthPx > 80 && near > 0.24) {
        const detail = clamp((widthPx - 80) / 200, 0, 1) * near
        ctx.strokeStyle = tint(ink.light + 12, 0.14 + 0.4 * detail)
        ctx.lineWidth = 1
        if (band.channels.kind === 'grid') {
          const { f0, f1, spacing } = band.channels
          const count = Math.min(360, Math.floor((f1 - f0) / spacing) + 1)
          const stride = Math.max(1, Math.ceil((count * 2.4) / Math.max(40, widthPx)))
          for (let i = 0; i < count; i += stride) {
            const px = xOfLog(Math.log10(f0 + i * spacing))
            if (px < clipLeft - 2 || px > clipRight + 2) continue
            ctx.beginPath()
            ctx.moveTo(px + 0.5, railY)
            ctx.lineTo(px + 0.5, top + blockHeight * 0.14)
            ctx.stroke()
          }
        } else {
          for (const item of band.channels.items) {
            const half = (item.width ?? band.f0 * 0.001) / 2
            const leftEdge = Math.max(clipLeft, xOfLog(Math.log10(Math.max(F_MIN, item.f - half))))
            const rightEdge = Math.min(clipRight, xOfLog(Math.log10(item.f + half)))
            if (rightEdge < clipLeft || leftEdge > clipRight) continue
            ctx.fillStyle = tint(ink.light + 14, 0.08 + 0.3 * detail)
            ctx.fillRect(leftEdge, top, Math.max(1.4, rightEdge - leftEdge), blockHeight)
            ctx.beginPath()
            ctx.moveTo(leftEdge + 0.5, top)
            ctx.lineTo(leftEdge + 0.5, railY)
            ctx.moveTo(rightEdge - 0.5, top)
            ctx.lineTo(rightEdge - 0.5, railY)
            ctx.stroke()
          }
        }
      }

      // 缩到只剩一栋楼时，用楼层线给它一张立面，而不是留一块纯色板
      if (widthPx > innerW * 0.7 && blockHeight > 40) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(Math.max(clipLeft, 0), top, Math.min(clipRight, width) - Math.max(clipLeft, 0), blockHeight)
        ctx.clip()
        ctx.strokeStyle = tint(ink.light + 10, 0.07)
        ctx.lineWidth = 1
        for (let y = top + 16; y < railY - 4; y += 18) {
          ctx.beginPath()
          ctx.moveTo(clipLeft, y + 0.5)
          ctx.lineTo(clipRight, y + 0.5)
          ctx.stroke()
        }
        ctx.restore()
      }

      // 湿路面上的倒影
      const mirrorHeight = Math.min(blockHeight * 0.34, (mobile ? 26 : 40) * (0.4 + 0.6 * near))
      if (mirrorHeight > 3 && near > 0.1) {
        const mirror = ctx.createLinearGradient(0, railY, 0, railY + mirrorHeight)
        mirror.addColorStop(0, tint(ink.light, (0.05 + 0.16 * near) * gate))
        mirror.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = mirror
        ctx.fillRect(clipLeft, railY + 1, body, mirrorHeight)
      }

      ctx.restore()
      placements.push({ x0, x1, top, band, focus, glow: gate * near })
    }

    void padX
    return placements
  }

  /** 左右两端的夜雾：这条街没有尽头，只是沉进雾里 */
  function drawHaze(ctx: CanvasRenderingContext2D, layout: Layout) {
    const { width, stageTop, roadBottom, padX } = layout
    const band = Math.max(90, padX * 4.4)
    const top = stageTop - 10
    const height = roadBottom - top + 26
    for (const [x0, x1] of [[0, band], [width, width - band]] as const) {
      const fog = ctx.createLinearGradient(x0, 0, x1, 0)
      fog.addColorStop(0, 'rgba(5, 7, 13, 0.94)')
      fog.addColorStop(0.55, 'rgba(5, 7, 13, 0.42)')
      fog.addColorStop(1, 'rgba(5, 7, 13, 0)')
      ctx.fillStyle = fog
      ctx.fillRect(Math.min(x0, x1), top, band, height)
    }
  }

  /** 门牌：只给最近的几栋点灯，其余留作剪影 */
  function drawStreetLabels(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    placements: Array<BlockPlacement>,
    speed: number,
  ) {
    const { mobile, width, padX, skyTop } = layout
    // 牌子挂在天际线上方一条固定的带子上：楼再高也压不到，两行之间也不会错位撞车
    // 手机屏窄，只留一行，宁可少写几个名字也不叠字
    const rows: Array<Array<[number, number]>> = mobile ? [[]] : [[], []]
    const ordered = [...placements].sort((a, b) => (b.focus + b.band.rank * 0.22) - (a.focus + a.band.rank * 0.22))
    const nameSize = mobile ? 11 : 13
    const budget = speed > 1.5 ? (mobile ? 2 : 3) : mobile ? 3 : 5
    let placed = 0

    ctx.save()
    ctx.textBaseline = 'bottom'
    for (const item of ordered) {
      if (placed >= budget) break
      const strength = item.focus * 0.86 + item.band.rank * 0.08
      if (strength < 0.26) continue
      const name = localeRef.current ? item.band.nameZh : item.band.nameEn
      ctx.font = `600 ${nameSize}px ${SANS}`
      const textWidth = ctx.measureText(name).width
      const anchorX = (Math.max(item.x0, padX) + Math.min(item.x1, width - padX)) / 2
      const centerX = clamp(anchorX, padX + textWidth / 2 + 6, width - padX - textWidth / 2 - 6)
      if (!Number.isFinite(centerX)) continue
      const box: [number, number] = [centerX - textWidth / 2 - 12, centerX + textWidth / 2 + 12]
      const rowIndex = rows.findIndex((row) => row.every(([a, b]) => box[1] < a || box[0] > b))
      if (rowIndex < 0) continue
      rows[rowIndex].push(box)
      placed += 1

      const y = skyTop - 9 - rowIndex * (nameSize + 14)
      const ink = SERVICE_INK[item.band.service]
      const alpha = clamp(0.42 + strength * 0.62, 0, 1) * clamp(item.glow * 1.6, 0, 1)
      const colour = item.band.service === 'visible'
        ? `rgba(248, 246, 250, ${alpha})`
        : `hsla(${ink.hue}, ${Math.min(88, ink.sat + 6)}%, ${Math.min(92, ink.light + 22)}%, ${alpha})`

      // 引线：把牌子挂回它自己的屋顶，读者不会认错是哪一段
      if (item.top - y > 6) {
        ctx.strokeStyle = colour
        ctx.globalAlpha = 0.34
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(anchorX, y + 3)
        ctx.lineTo(anchorX, item.top - 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.textAlign = 'center'
      ctx.lineWidth = 3.5
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(3, 5, 9, 0.85)'
      ctx.strokeText(name, centerX, y)
      ctx.fillStyle = colour
      ctx.fillText(name, centerX, y)

      if (rowIndex === 0 && item.focus > 0.75 && !mobile) {
        const low = formatFrequency(item.band.f0, item.band.f0 >= 1e9 ? 2 : 1)
        const high = formatFrequency(item.band.f1, item.band.f1 >= 1e9 ? 2 : 1)
        ctx.font = `500 9.5px ${MONO}`
        ctx.fillStyle = `rgba(226, 220, 208, ${0.34 * item.focus})`
        ctx.fillText(`${low.value} ${low.unit} – ${high.value} ${high.unit}`, centerX, y - nameSize - 3)
      }
    }
    ctx.restore()
  }

  /** 门牌号：单一频点，缩放到位才浮出来 */
  function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    view: View,
    xOf: (frequency: number) => number,
    reveal: number,
    clock: number,
  ) {
    if (view.span > 3.2) return
    const landmarkPulse = 0.5 + 0.5 * Math.sin(clock * 1.6)
    const { railY, blocksTop, width, padX, mobile } = layout
    const strength = clamp((3.2 - view.span) / 1.4, 0, 1) * reveal
    ctx.save()
    ctx.globalAlpha = strength
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = `500 ${mobile ? 8.5 : 9.5}px ${MONO}`
    for (const landmark of LANDMARKS) {
      const x = xOf(landmark.f)
      if (x < padX + 14 || x > width - padX - 14) continue
      const top = blocksTop + (railY - blocksTop) * 0.16
      ctx.strokeStyle = 'rgba(255, 236, 200, 0.3)'
      ctx.setLineDash([2, 3])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 0.5, railY)
      ctx.lineTo(x + 0.5, top)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255, 236, 200, 0.85)'
      ctx.beginPath()
      ctx.arc(x, top, 2.2 + landmarkPulse, 0, TAU)
      ctx.fill()
      const landmarkName = localeRef.current ? landmark.nameZh : landmark.nameEn
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(3, 5, 9, 0.85)'
      ctx.strokeText(landmarkName, x, top - 6)
      ctx.fillStyle = 'rgba(255, 236, 200, 0.78)'
      ctx.fillText(landmarkName, x, top - 6)
    }
    ctx.restore()
  }

  /** 调谐光柱：屏幕正中那道光就是你此刻调到的频率 */
  function drawBeam(ctx: CanvasRenderingContext2D, layout: Layout, cursorX: number, clock: number) {
    const { blocksTop, railY, roadBottom, mobile } = layout
    const halo = mobile ? 30 : 46
    const glow = ctx.createLinearGradient(cursorX - halo, 0, cursorX + halo, 0)
    glow.addColorStop(0, `rgba(${INK.beam}, 0)`)
    glow.addColorStop(0.5, `rgba(${INK.beam}, 0.1)`)
    glow.addColorStop(1, `rgba(${INK.beam}, 0)`)
    ctx.fillStyle = glow
    ctx.fillRect(cursorX - halo, blocksTop - 18, halo * 2, roadBottom - blocksTop + 18)

    const beam = ctx.createLinearGradient(0, blocksTop - 16, 0, roadBottom)
    beam.addColorStop(0, `rgba(${INK.beam}, 0.12)`)
    beam.addColorStop(0.62, `rgba(${INK.beam}, 0.66)`)
    beam.addColorStop(1, `rgba(${INK.beam}, 0.06)`)
    ctx.strokeStyle = beam
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cursorX + 0.5, blocksTop - 16)
    ctx.lineTo(cursorX + 0.5, roadBottom)
    ctx.stroke()

    const pulse = 0.7 + 0.3 * Math.sin(clock * 2.4)
    ctx.save()
    ctx.translate(cursorX, railY)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = `rgba(${INK.beam}, ${0.72 * pulse + 0.24})`
    ctx.fillRect(-3.2, -3.2, 6.4, 6.4)
    ctx.restore()
  }

  /** 路牌：你现在停在哪个频率、属于哪个 ITU 频段 */
  function drawSign(ctx: CanvasRenderingContext2D, layout: Layout, cursorX: number, cursorF: number) {
    const { signTop, signSize, mobile, width, padX } = layout
    if (signSize < 8) return
    const reading = formatFrequency(cursorF)
    const itu = ituBandAt(cursorF)
    const band = bandAt(cursorF)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `300 ${signSize}px ${MONO}`
    const numberWidth = ctx.measureText(`${reading.value} ${reading.unit}`).width
    const x = clamp(cursorX, padX + numberWidth / 2 + 4, width - padX - numberWidth / 2 - 4)
    ctx.shadowColor = 'rgba(3, 5, 9, 0.95)'
    ctx.shadowBlur = 18
    ctx.fillStyle = 'rgba(255, 242, 218, 0.95)'
    ctx.fillText(`${reading.value} ${reading.unit}`, x, signTop)
    ctx.shadowBlur = 0

    ctx.font = `500 ${mobile ? 8.5 : 9.5}px ${SANS}`
    ctx.fillStyle = 'rgba(226, 220, 208, 0.44)'
    const service = band ? (localeRef.current ? SERVICE_NAMES[band.service].zh : SERVICE_NAMES[band.service].en) : ''
    const ituName = localeRef.current ? itu.zh : itu.en
    ctx.fillText(`${itu.code} · ${ituName}${service ? ` · ${service}` : ''}`, x, signTop + signSize + 1)
    ctx.restore()
  }

  function drawPanel(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    xOf: (frequency: number) => number,
    fLeft: number,
    fRight: number,
    cursorF: number,
    clock: number,
  ) {
    const { padX, width, panelTop, stageBottom, mobile } = layout
    const box: PanelBox = { x0: padX, x1: width - padX, top: panelTop, bottom: stageBottom, mobile }
    if (box.bottom - box.top < 46) return
    const fade = layerFadeRef.current
    const current = labelsRef.current

    if (layerRef.current === 'wave') {
      drawWavePanel(ctx, box, cursorF, clock, fade, {
        title: current.wave,
        ruler: current.waveRuler,
        object: localeRef.current ? nearestObject(wavelength(cursorF)).nameZh : nearestObject(wavelength(cursorF)).nameEn,
      })
      return
    }

    if (layerRef.current === 'wall') {
      drawWallPanel(ctx, box, cursorF, xOf, fLeft, fRight, clock, fade, {
        title: current.wall,
        through: current.wallThrough,
        around: current.wallAround,
        extrapolated: current.wallExtrapolated,
        geometry: current.wallGeometry,
        shadow: current.wallShadow,
        wall: current.wallLabel,
      })
      return
    }

    if (layerRef.current === 'lot') {
      const { lot, inside } = lotAt(cursorF)
      const low = formatFrequency(lot.f0, lot.f0 >= 1e9 ? 2 : 0)
      const high = formatFrequency(lot.f1, lot.f1 >= 1e9 ? 2 : 0)
      const headline = `${lot.year} · ${localeRef.current ? lot.amountZh : lot.amountEn}`
      const detail = `${localeRef.current ? lot.placeZh : lot.placeEn} · ${localeRef.current ? lot.nameZh : lot.nameEn} · ${low.value} ${low.unit} – ${high.value} ${high.unit}`
      drawLotPanel(ctx, box, xOf, inside ? lot : null, [headline, detail], fade, {
        title: current.lot,
        note: current.lotNote,
      })
      return
    }

    const band = bandAt(cursorF)
    const edges: Array<{ f0: number; f1: number; tag?: string }> = []
    if (band?.channels?.kind === 'grid') {
      const { f0, f1, spacing, width: channelWidth } = band.channels
      const count = Math.min(240, Math.floor((f1 - f0) / spacing) + 1)
      const stride = Math.max(1, Math.ceil(count / 60))
      for (let i = 0; i < count; i += stride) {
        const centre = f0 + i * spacing
        const half = (channelWidth ?? spacing) / 2
        edges.push({ f0: centre - half, f1: centre + half })
      }
    } else if (band?.channels?.kind === 'list') {
      for (const item of band.channels.items) {
        const half = (item.width ?? (band.f1 - band.f0) * 0.01) / 2
        edges.push({
          f0: item.f - half,
          f1: item.f + half,
          tag: localeRef.current ? item.tagZh : item.tagEn,
        })
      }
    }

    const headline = band ? (localeRef.current ? band.useZh : band.useEn) : ''
    const bodyText = band
      ? [
          (localeRef.current ? band.channelZh : band.channelEn) ?? '',
          (localeRef.current ? band.regionZh : band.regionEn) ?? '',
        ]
      : []
    ctx.font = `400 ${mobile ? 10.5 : 12}px ${SANS}`
    const lines = bodyText
      .filter(Boolean)
      .flatMap((text) => wrapText(ctx, text, box.x1 - box.x0, mobile ? 2 : 3))
    drawChannelPanel(
      ctx,
      box,
      edges,
      band ? [band.f0, band.f1] : [fLeft, fRight],
      cursorF,
      headline,
      lines,
      fade,
      { title: current.channel, none: current.channelNone },
    )
  }

  /* ── 手势 ───────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      controls.registerInteraction()
      stopFlight()
      const rect = canvas.getBoundingClientRect()
      const view = viewRef.current
      const layout = computeLayout(rect.width, rect.height, storyRef.current, reserveRef.current, topReserveRef.current)
      const px = event.clientX - rect.left
      const ratio = clamp((px - layout.padX) / layout.innerW, 0, 1)
      const anchor = view.center - view.span / 2 + ratio * view.span
      const factor = Math.exp(clamp(event.deltaY, -140, 140) * 0.0022)
      const span = clamp(view.span * factor, SPAN_MIN, SPAN_MAX)
      view.span = span
      view.center = anchor - (ratio - 0.5) * span
      velocityRef.current.center = 0
      velocityRef.current.span = 0
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointerLog(clientX: number) {
    const canvas = canvasRef.current
    if (!canvas) return viewRef.current.center
    const rect = canvas.getBoundingClientRect()
    const layout = computeLayout(rect.width, rect.height, storyRef.current, reserveRef.current, topReserveRef.current)
    const ratio = ((clientX - rect.left) - layout.padX) / layout.innerW
    const view = viewRef.current
    return view.center - view.span / 2 + ratio * view.span
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    controls.registerInteraction()
    stopFlight()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 1) {
      dragRef.current = { x: event.clientX, lastLog: pointerLog(event.clientX), time: performance.now() }
      velocityRef.current = { center: 0, span: 0 }
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = { distance: Math.abs(a.x - b.x) || 1, centerX: (a.x + b.x) / 2 }
      dragRef.current = null
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const layout = computeLayout(rect.width, rect.height, storyRef.current, reserveRef.current, topReserveRef.current)
    const view = viewRef.current

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const distance = Math.abs(a.x - b.x) || 1
      const centerX = (a.x + b.x) / 2
      const ratio = clamp((pinchRef.current.centerX - rect.left - layout.padX) / layout.innerW, 0, 1)
      const anchor = view.center - view.span / 2 + ratio * view.span
      const span = clamp(view.span * (pinchRef.current.distance / distance), SPAN_MIN, SPAN_MAX)
      view.span = span
      view.center = anchor - (ratio - 0.5) * span - ((centerX - pinchRef.current.centerX) / layout.innerW) * span
      pinchRef.current = { distance, centerX }
      return
    }

    const drag = dragRef.current
    if (!drag) return
    const now = performance.now()
    const delta = ((event.clientX - drag.x) / layout.innerW) * view.span
    view.center = clamp(view.center - delta, LOG_MIN - 1, LOG_MAX + 1)
    const elapsed = Math.max(0.008, (now - drag.time) / 1_000)
    velocityRef.current.center = -delta / elapsed
    dragRef.current = { x: event.clientX, lastLog: drag.lastLog, time: now }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) dragRef.current = null
    else if (pointersRef.current.size === 1) {
      const [only] = [...pointersRef.current.values()]
      dragRef.current = { x: only.x, lastLog: pointerLog(only.x), time: performance.now() }
    }
  }

  /* ── 故事 ───────────────────────────────────────────────── */
  function runScene(build: () => void) {
    clearTimers()
    stopFlight()
    build()
  }

  function returnToFree() {
    clearTimers()
    stopFlight()
    revealTargetRef.current = 1
    revealRef.current = 1
  }

  const guideSteps: Array<GuideStep> = [
    {
      title: '此刻有几十种电波穿过你',
      body: '广播、手机、WiFi、GPS、遥控器同时穿过你的身体，却互不覆盖——因为每一种都被分到了频谱上一小段固定的地址。',
      durationMs: 7_200,
      action: () => runScene(() => {
        setLayer('wave')
        layerFadeRef.current = 0
        revealRef.current = 0
        revealTargetRef.current = 0
        viewRef.current = { center: HOME_CENTER, span: HOME_SPAN }
        after(260, () => { revealTargetRef.current = 1 })
      }),
    },
    {
      title: '频率越高，波长越短',
      body: '波长 = 光速 ÷ 频率。频率翻十倍，波长就短十倍。看下面这条真波：从比一栋楼还长，一路缩到比米粒还小。',
      durationMs: 12_000,
      action: () => runScene(() => {
        setLayer('wave')
        layerFadeRef.current = 0
        revealTargetRef.current = 1
        revealRef.current = 1
        flyTo(Math.log10(4e5), 1.1, 900)
        after(1_000, () => {
          queueFlight(Math.log10(9.7e7), 1.0, 3_200)
          queueFlight(Math.log10(2.45e9), 0.9, 3_000)
          queueFlight(Math.log10(3e13), 1.4, 3_200)
        })
      }),
    },
    {
      title: 'WiFi 的两条路',
      body: '2.4 GHz 波长 12 cm，绕得过墙角、穿墙损耗小；5 GHz 波长 6 cm，路更直、衰减更快，但地皮更宽，所以更快。',
      durationMs: 11_000,
      action: () => runScene(() => {
        setLayer('wall')
        layerFadeRef.current = 0
        revealTargetRef.current = 1
        revealRef.current = 1
        flyTo(Math.log10(2.442e9), 0.06, 1_100)
        after(4_600, () => flyTo(Math.log10(5.5e9), 0.09, 2_600))
      }),
    },
    {
      title: '这条街是被卖掉的',
      body: '频谱是有限的地产，各国用拍卖分配。2021 年美国把 3.7–3.98 GHz 拍给运营商，成交 811.7 亿美元——买的只是一段空气。',
      durationMs: 10_000,
      action: () => runScene(() => {
        setLayer('lot')
        layerFadeRef.current = 0
        revealTargetRef.current = 1
        revealRef.current = 1
        flyTo(Math.log10(3.84e9), 0.55, 1_400)
        after(4_200, () => flyTo(Math.log10(3.84e9), 4.6, 3_000))
      }),
    },
    {
      title: '一直飞到可见光',
      body: '继续往高处飞：毫米波、太赫兹、红外……标尺尽头这不到一个数量级的一小段，就是你眼睛唯一看得见的颜色。',
      durationMs: 12_000,
      action: () => runScene(() => {
        setLayer('wave')
        layerFadeRef.current = 0
        revealTargetRef.current = 1
        revealRef.current = 1
        flyTo(Math.log10(1e11), 2.2, 1_200)
        after(1_300, () => {
          queueFlight(Math.log10(3e13), 1.6, 2_800)
          queueFlight(Math.log10(5.6e14), 0.5, 3_400)
        })
      }),
    },
  ]

  /* ── 读数 ───────────────────────────────────────────────── */
  const cursorF = 10 ** tuned.center
  const lambda = wavelength(cursorF)
  const frequencyReading = formatFrequency(cursorF)
  const lengthReading = formatLength(lambda)
  const itu = ituBandAt(cursorF)
  const band = bandAt(cursorF)
  const object = nearestObject(lambda)
  const magnification = SPAN_MAX / tuned.span
  const zoomFactor = magnification >= 1_000
    ? `${Math.round(magnification / 1_000)}k`
    : magnification >= 100
      ? String(Math.round(magnification))
      : magnification.toFixed(1)
  const zoomValue = clamp(
    (Math.log10(SPAN_MAX) - Math.log10(tuned.span)) / (Math.log10(SPAN_MAX) - Math.log10(SPAN_MIN)),
    0,
    1,
  )

  const jumpChips: Array<{ id: string; label: string; run: () => void }> = [
    { id: 'am', label: tx('中波 AM'), run: () => jumpTo('am') },
    { id: 'fm', label: tx('调频 FM'), run: () => jumpTo('fm') },
    { id: 'dtv', label: tx('电视'), run: () => jumpTo('dtv') },
    { id: 'gnss', label: 'GPS L1', run: () => jumpToFrequency(1575.42e6, 0.02) },
    { id: 'wifi24', label: 'WiFi 2.4G', run: () => jumpToFrequency(2.442e9, 0.06) },
    { id: 'oven', label: tx('微波炉'), run: () => jumpToFrequency(2.45e9, 0.02) },
    { id: 'wifi5', label: 'WiFi 5G', run: () => jumpTo('wifi5') },
    { id: 'mmwave', label: tx('5G 毫米波'), run: () => jumpTo('mmwave') },
    { id: 'thermal', label: tx('热成像'), run: () => jumpTo('thermal-ir') },
    { id: 'visible', label: tx('可见光'), run: () => jumpTo('visible') },
  ]

  const layerChips: Array<{ id: LayerId; label: string }> = [
    { id: 'wave', label: tx('波长实感') },
    { id: 'channel', label: tx('用途与信道') },
    { id: 'wall', label: tx('穿墙能力') },
    { id: 'lot', label: tx('频谱地产') },
  ]

  return (
    <div ref={rootRef} className={`oss-experience spec-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="spec-canvas"
        aria-label={tx('从长波到可见光的电磁频谱标尺')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {!storyMode && (
        <header className="spec-plate" data-experience-overlay="true">
          <span>{tx('电磁频谱')}</span>
          <h1>{tx('电波都住在哪一段？')}</h1>
        </header>
      )}

      <aside ref={readoutRef} className="spec-readout" data-experience-overlay="true">
        <div className="spec-readout-row is-key">
          <small>{tx('频率')}</small>
          <b>{frequencyReading.value} {frequencyReading.unit}</b>
        </div>
        <div className="spec-readout-row is-key">
          <small>{tx('波长')}</small>
          <b>{lengthReading.value} {lengthReading.unit}</b>
        </div>
        <div className="spec-readout-row">
          <small>{tx('ITU 频段')}</small>
          <b>{itu.code}<i>{zh ? itu.zh : itu.en}</i></b>
        </div>
        <div className="spec-readout-row is-wide">
          <small>{tx('典型用途')}</small>
          <b>{band ? (zh ? band.useZh : band.useEn) : '—'}</b>
        </div>
        <div className="spec-readout-row is-wide">
          <small>{tx('一个波长约等于')}</small>
          <b>{zh ? object.nameZh : object.nameEn}</b>
        </div>
        <p>
          <span>{labels.scope}</span>
        </p>
      </aside>

      {!storyMode && (
        <Freebar
          className="spec-freebar"
          mainClassName="spec-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <div className="spec-tray">
              <div className="spec-tray-head">
                <FreebarTabs
                  activeId={toolTab}
                  ariaLabel={tx('次级工具')}
                  className="spec-tool-tabs"
                  onChange={setToolTab}
                  tabs={[
                    { id: 'bands', label: tx('频段') },
                    { id: 'layers', label: tx('图层') },
                  ]}
                />
                <div className="spec-tray-tools">
                  <button
                    type="button"
                    className="experience-freebar-story"
                    onClick={() => {
                      controls.registerInteraction()
                      enterStory()
                      replayGuide('radio-spectrum')
                    }}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>
              {toolTab === 'bands' ? (
                <div className="spec-chip-rail spec-freebar-chips experience-freebar-chips" role="group" aria-label={tx('跳到某个频段')}>
                  {jumpChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`spec-chip${band?.id === chip.id ? ' is-on' : ''}`}
                      onClick={() => {
                        controls.registerInteraction()
                        chip.run()
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="spec-chip-rail spec-freebar-layers experience-freebar-chips" role="group" aria-label={tx('图层')}>
                  <button
                    type="button"
                    className={`spec-chip spec-cruise${cruising ? ' is-on' : ''}`}
                    onClick={() => {
                      controls.registerInteraction()
                      if (cruising) stopFlight()
                      else startCruise()
                    }}
                  >
                    {cruising ? tx('停止巡航') : tx('巡航')}
                  </button>
                  {layerChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`spec-chip is-layer${layer === chip.id ? ' is-on' : ''}`}
                      onClick={() => {
                        controls.registerInteraction()
                        setLayer(chip.id)
                        layerFadeRef.current = 0
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        >
          <div className="experience-freebar-field spec-freq">
            <span>{tx('频率')}</span>
            <input
              type="range"
              min={LOG_MIN}
              max={LOG_MAX}
              step={0.001}
              value={tuned.center.toFixed(3)}
              style={{ '--fill': `${((tuned.center - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100}%` } as CSSProperties}
              onChange={(event) => {
                controls.registerInteraction()
                stopFlight()
                viewRef.current.center = Number(event.target.value)
                velocityRef.current = { center: 0, span: 0 }
              }}
              aria-label={tx('调到哪个频率')}
            />
            <strong>{frequencyReading.value} {frequencyReading.unit}</strong>
          </div>
          <div className="experience-freebar-field spec-zoom">
            <span>{tx('缩放')}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={zoomValue.toFixed(3)}
              style={{ '--fill': `${zoomValue * 100}%` } as CSSProperties}
              onChange={(event) => {
                controls.registerInteraction()
                stopFlight()
                const t = Number(event.target.value)
                viewRef.current.span = 10 ** (Math.log10(SPAN_MAX) + t * (Math.log10(SPAN_MIN) - Math.log10(SPAN_MAX)))
                velocityRef.current = { center: 0, span: 0 }
              }}
              aria-label={tx('放大或拉远这条标尺')}
            />
            <strong>×{zoomFactor}</strong>
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="radio-spectrum"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental', cue: 'right' },
          { position: 'bottom-left', mobilePosition: 'top-left', tone: 'light', treatment: 'caption' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'top-left', width: 'wide', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', width: 'normal', treatment: 'monumental', cue: 'right' },
        ]}
        showReplayChip={false}
        onExit={() => {
          returnToFree()
          enterFree()
        }}
      />
      {!storyMode && (
        <GhostHint worldId="radio-spectrum" gesture={{ type: 'scrub', target: '.spec-freq input', label: '拖动频率' }} />
      )}
    </div>
  )
}
