import './styles/MoonPixel.css'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowCounterClockwise, ArrowRight, Sparkle, X } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import {
  AU_KM,
  BETELGEUSE_INTERIOR_STOP_X,
  BODIES,
  CAPTIONS,
  GALLERY,
  GALLERY_CAPTIONS,
  GALLERY_MAX_SCROLL_PX,
  KM_PER_PX,
  MAX_SCROLL_PX,
  MOON,
  SUN,
  SUN_X,
  bodyX,
  formatAu,
  formatKm,
  formatPx,
  kmToPx,
  type GalleryPlaced,
  type PixelBody,
} from '~/components/experiences/worlds/moon-pixel/moon-pixel-data'
import { useExperienceI18n } from '~/i18n/experience'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const EARTH_X = bodyX(149_600_000)
const MOON_X = EARTH_X + kmToPx(MOON.distanceKm)

type Mode = 'journey' | 'gallery'

type CardTarget =
  | { kind: 'sun' }
  | { kind: 'moon' }
  | { kind: 'body'; body: PixelBody }
  | { kind: 'famous'; body: GalleryPlaced }

type Stop = { id: string; name: string; x: number }

/** 旅程段停靠点（世界坐标；太阳在 0） */
const JOURNEY_STOPS: Array<Stop> = [
  { id: 'sun', name: SUN.name, x: 0 },
  ...BODIES.map((body) => ({ id: body.id, name: body.name, x: bodyX(body.distanceKm) })),
]

/** 参宿四右缘之前的「内部」停靠点 */
const INTERIOR_STOP: Stop = { id: 'betelgeuse-interior', name: '参宿四内部', x: BETELGEUSE_INTERIOR_STOP_X }

function journeyScroll(x: number, vw: number): number {
  return clamp(x - vw / 2, 0, MAX_SCROLL_PX)
}

/** 大天体停在左缘看弧线，小天体居中 */
function galleryScroll(body: GalleryPlaced, vw: number): number {
  if (body.widthPx > vw * 0.85) return clamp(body.x - body.radiusPx - vw * 0.42, 0, GALLERY_MAX_SCROLL_PX)
  return clamp(body.x - vw / 2, 0, GALLERY_MAX_SCROLL_PX)
}

type MapTick = { id: string; name: string; mode: Mode; frac: number; x: number }

const SOLAR_TICKS: Array<MapTick> = [
  { id: 'sun', name: SUN.name, mode: 'journey', frac: 0.004, x: 0 },
  ...BODIES.map((body) => ({
    id: body.id,
    name: body.name,
    mode: 'journey' as const,
    frac: bodyX(body.distanceKm) / MAX_SCROLL_PX,
    x: bodyX(body.distanceKm),
  })),
  { id: 'end', name: '终点', mode: 'journey', frac: 1, x: MAX_SCROLL_PX },
]

const galleryTick = (id: string, index: number, count: number): MapTick => {
  const body = GALLERY.find((item) => item.id === id)!
  return { id: body.id, name: body.name, mode: 'gallery', frac: (index + 0.5) / count, x: body.x }
}

const STAR_TICK_IDS = ['proxima', 'sun', 'sirius', 'arcturus', 'betelgeuse']
const EXTREME_TICK_IDS = ['neutron-star', 'sgra']
const STAR_TICKS: Array<MapTick> = STAR_TICK_IDS.map((id, index) => galleryTick(id, index, STAR_TICK_IDS.length))
const EXTREME_TICKS: Array<MapTick> = EXTREME_TICK_IDS.map((id, index) => galleryTick(id, index, EXTREME_TICK_IDS.length))

const MAP_GROUPS: Array<{ id: string; name: string; weight: number; modes: Array<Mode>; ticks: Array<MapTick> }> = [
  { id: 'solar', name: '太阳系', weight: 11, modes: ['journey'], ticks: SOLAR_TICKS },
  { id: 'stars', name: '著名恒星', weight: 5.5, modes: ['gallery'], ticks: STAR_TICKS },
  { id: 'extreme', name: '极端天体', weight: 2.5, modes: ['gallery'], ticks: EXTREME_TICKS },
]

const FAMOUS_EYEBROW: Record<GalleryPlaced['group'], string> = {
  anchor: '参照天体 · 大小对比',
  star: '著名恒星 · 大小对比',
  extreme: '极端天体 · 大小对比',
}

/**
 * 如果月球只有一个像素：横向滚动的真实比例太阳系 + 著名天体大小对比带。
 * 全部位移只写 transform（translate3d），字幕/名牌可见性在 rAF 里按区间切换。
 * 一次明确的滚轮 / 甩动手势吸附到下一个天体，慢速滚动仍可 1:1 细读字幕；
 * 滚动过半算互动，滚到旅程末尾触发 finish。
 */
export function MoonPixel({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLElement>(null)
  const kmRef = useRef<HTMLSpanElement>(null)
  const auRef = useRef<HTMLSpanElement>(null)
  const captionNodes = useRef<Array<HTMLElement | null>>([])
  const tagNodes = useRef<Array<HTMLElement | null>>([])

  const target = useRef(0)
  const current = useRef(0)
  const suppressClick = useRef(false)
  const dirty = useRef(true)
  const flags = useRef({ interacted: false, finished: false })
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  const [mode, setMode] = useState<Mode>('journey')
  const modeRef = useRef<Mode>('journey')
  const [card, setCard] = useState<CardTarget | null>(null)
  const [endOpen, setEndOpen] = useState(false)
  const endOpenRef = useRef(false)
  const [galleryEndOpen, setGalleryEndOpen] = useState(false)
  const galleryEndOpenRef = useRef(false)
  const [nearestId, setNearestId] = useState<string>('sun')
  const [nextStopName, setNextStopName] = useState<string>('水星')

  // 挂载即完成引导（规范），滚动过半再记一次互动（幂等）
  useEffect(() => {
    controls.completeOnboarding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxFor = (value: Mode) => (value === 'journey' ? MAX_SCROLL_PX : GALLERY_MAX_SCROLL_PX)

  function goTo(x: number, instant = false) {
    target.current = clamp(x, 0, maxFor(modeRef.current))
    if (instant) {
      current.current = target.current
      dirty.current = true
    }
  }

  /** 当前模式的停靠点（含终点哨兵） */
  function stopsNow(vw: number): Array<Stop & { scroll: number }> {
    if (modeRef.current === 'journey') {
      return JOURNEY_STOPS.map((stop) => ({ ...stop, scroll: journeyScroll(stop.x, vw) }))
    }
    return [
      ...GALLERY.map((body) => ({ id: body.id, name: body.name, x: body.x, scroll: galleryScroll(body, vw) })),
      { ...INTERIOR_STOP, scroll: clamp(INTERIOR_STOP.x - vw / 2, 0, GALLERY_MAX_SCROLL_PX) },
    ]
  }

  /** 吸附到下一个 / 上一个天体；手动慢滚随时接管 */
  function step(direction: 1 | -1) {
    const vw = stageRef.current?.clientWidth ?? window.innerWidth
    const stops = stopsNow(vw)
    if (direction > 0) {
      for (const stop of stops) {
        if (stop.scroll > target.current + 40) {
          goTo(stop.scroll)
          return
        }
      }
      goTo(maxFor(modeRef.current))
    } else {
      for (let index = stops.length - 1; index >= 0; index -= 1) {
        if (stops[index].scroll < target.current - 40) {
          goTo(stops[index].scroll)
          return
        }
      }
      goTo(0)
    }
  }

  /** 切换旅程 / 大小对比两段；跳段是瞬移 + 淡入，不做无意义的跨条飞行 */
  function switchMode(next: Mode, scroll = 0) {
    if (modeRef.current === next) {
      goTo(scroll)
      return
    }
    modeRef.current = next
    setMode(next)
    endOpenRef.current = false
    setEndOpen(false)
    galleryEndOpenRef.current = false
    setGalleryEndOpen(false)
    setCard(null)
    target.current = clamp(scroll, 0, maxFor(next))
    current.current = target.current
    dirty.current = true
    const stage = stageRef.current
    if (stage) {
      stage.classList.add('is-switching')
      window.setTimeout(() => stage.classList.remove('is-switching'), 320)
    }
  }

  function jumpToTick(tick: MapTick) {
    const vw = stageRef.current?.clientWidth ?? window.innerWidth
    if (tick.mode === 'journey') {
      const scroll = tick.id === 'end' ? MAX_SCROLL_PX : journeyScroll(tick.x, vw)
      switchMode('journey', scroll)
      return
    }
    const body = GALLERY.find((item) => item.id === tick.id)
    if (!body) return
    switchMode('gallery', galleryScroll(body, vw))
  }

  function openCard(next: CardTarget) {
    if (suppressClick.current) return
    setCard(next)
  }

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    if (!stage || !track) return

    let vw = stage.clientWidth || window.innerWidth
    let lastKmText = ''
    let lastAuText = ''
    let lastNearest = ''
    let lastNextStop = ''
    const captionVisible: Array<boolean> = []
    const tagVisible: Array<boolean> = []

    let lastInputAt = 0

    function measure() {
      vw = stage!.clientWidth || window.innerWidth
      target.current = clamp(target.current, 0, maxFor(modeRef.current))
      dirty.current = true
    }

    /** 滚轮：慢滚 1:1 细读，一次明确的手势（或持续快滚）吸附一个天体 */
    let wheelAcc = 0
    let wheelLastAt = 0
    let wheelLockUntil = 0

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const now = performance.now()
      if (now - wheelLastAt > 240) wheelAcc = 0
      wheelLastAt = now
      lastInputAt = now
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      wheelAcc += delta
      const flying = Math.abs(target.current - current.current) > 80
      if (!flying) {
        target.current = clamp(target.current + delta, 0, maxFor(modeRef.current))
      }
      if (now >= wheelLockUntil && (Math.abs(delta) >= 60 || Math.abs(wheelAcc) >= 400)) {
        step(delta > 0 ? 1 : -1)
        wheelAcc = 0
        wheelLockUntil = now + 380
      }
    }

    let dragId: number | null = null
    let lastX = 0
    let lastY = 0
    let moved = 0
    let dragMultiplier = 1
    let flickThreshold = 0.7
    let trail: Array<{ at: number; x: number }> = []

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      dragId = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      moved = 0
      dragMultiplier = event.pointerType === 'touch' ? 4 : 1
      flickThreshold = event.pointerType === 'touch' ? 0.5 : 0.7
      trail = [{ at: performance.now(), x: event.clientX }]
      lastInputAt = performance.now()
    }

    function onPointerMove(event: PointerEvent) {
      if (dragId !== event.pointerId) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy
      target.current = clamp(target.current - delta * dragMultiplier, 0, maxFor(modeRef.current))
      const now = performance.now()
      lastInputAt = now
      trail.push({ at: now, x: event.clientX })
      if (trail.length > 12) trail.shift()
    }

    function onPointerEnd(event: PointerEvent) {
      if (dragId !== event.pointerId) return
      dragId = null
      lastInputAt = performance.now()
      if (moved > 8) {
        suppressClick.current = true
        window.setTimeout(() => {
          suppressClick.current = false
        }, 80)
      }
      // 甩手：按最近 120ms 的速度吸附到前方天体
      const now = performance.now()
      const from = trail.find((sample) => now - sample.at <= 120)
      if (from && moved > 24) {
        const velocity = (event.clientX - from.x) / Math.max(1, now - from.at)
        if (Math.abs(velocity) >= flickThreshold) {
          step(velocity < 0 ? 1 : -1)
        }
      }
      trail = []
    }

    function apply(x: number) {
      const mode = modeRef.current
      const max = maxFor(mode)
      track!.style.transform = `translate3d(${-x}px, 0, 0)`
      const progress = x / max
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`
      if (cursorRef.current) cursorRef.current.style.left = `${progress * 100}%`

      const center = x + vw / 2

      let kmText: string
      let auText: string
      let nearest: string
      if (mode === 'journey') {
        const km = Math.max(0, (center - SUN_X) * KM_PER_PX)
        kmText = tx(formatKm(km))
        auText = formatAu(km)
        nearest = 'sun'
        let nearestDistance = Math.abs(SUN_X - center)
        for (const body of BODIES) {
          const distance = Math.abs(bodyX(body.distanceKm) - center)
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearest = body.id
          }
        }
      } else {
        let nearestBody = GALLERY[0]
        let nearestDistance = Number.POSITIVE_INFINITY
        for (const body of GALLERY) {
          // 用「到圆盘的距离」而不是到圆心的距离：巨星停在左缘看弧线时，
          // 视线中心已经在它的盘面里，最近天体必须是它自己
          const distance = Math.max(0, Math.abs(body.x - center) - body.radiusPx)
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestBody = body
          }
        }
        nearest = nearestBody.id
        kmText = tx(nearestBody.name)
        auText = `${tx(formatKm(nearestBody.diameterKm))} · ${tx(formatPx(nearestBody.widthPx))}`
      }
      if (kmText !== lastKmText && kmRef.current) {
        kmRef.current.textContent = kmText
        lastKmText = kmText
      }
      if (auText !== lastAuText && auRef.current) {
        auRef.current.textContent = auText
        lastAuText = auText
      }

              for (let index = 0; index < captionNodes.current.length; index += 1) {
          const el = captionNodes.current[index]
          if (!el) continue
          const visible = Math.abs(Number(el.dataset.x || 0) - center) < vw * 0.42
          if (visible !== captionVisible[index]) {
            captionVisible[index] = visible
            el.classList.toggle('is-visible', visible)
          }
        }
        for (let index = 0; index < tagNodes.current.length; index += 1) {
          const el = tagNodes.current[index]
          if (!el) continue
          const px = Number(el.dataset.x || 0)
          const visible = Math.abs(px - center) < vw * 0.62
          if (visible !== tagVisible[index]) {
            tagVisible[index] = visible
            el.classList.toggle('is-near', visible)
          }
        }


      if (nearest !== lastNearest) {
        lastNearest = nearest
        setNearestId(nearest)
      }
      const stops = stopsNow(vw)
      const upcoming = stops.find((stop) => stop.scroll > x + 40)
      const nextName = upcoming ? upcoming.name : '终点'
      if (nextName !== lastNextStop) {
        lastNextStop = nextName
        setNextStopName(nextName)
      }

      if (progress >= 0.5 && !flags.current.interacted) {
        flags.current.interacted = true
        controlsRef.current.registerInteraction()
      }
      if (mode === 'journey') {
        if (progress >= 0.994 && !endOpenRef.current) {
          endOpenRef.current = true
          setEndOpen(true)
          if (!flags.current.finished) {
            flags.current.finished = true
            controlsRef.current.finish()
          }
        } else if (progress < 0.982 && endOpenRef.current) {
          endOpenRef.current = false
          setEndOpen(false)
        }
      } else if (progress >= 0.995 && !galleryEndOpenRef.current) {
        galleryEndOpenRef.current = true
        setGalleryEndOpen(true)
      } else if (progress < 0.985 && galleryEndOpenRef.current) {
        galleryEndOpenRef.current = false
        setGalleryEndOpen(false)
      }
    }

    let raf = 0
    let last = performance.now()
    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // 静止 900ms 后轻轻吸附到附近停靠点
      if (dragId === null && now - lastInputAt > 900) {
        const stops = stopsNow(vw)
        let best: number | null = null
        let bestDistance = vw * 0.2
        for (const stop of stops) {
          const distance = Math.abs(stop.scroll - target.current)
          if (distance < bestDistance) {
            bestDistance = distance
            best = stop.scroll
          }
        }
        if (best !== null && bestDistance > 0.5) {
          target.current += (best - target.current) * Math.min(1, dt * 4)
        }
      }
      const diff = target.current - current.current
      if (Math.abs(diff) > 0.08) {
        let stepPx = diff * Math.min(1, dt * 7.2)
        // 飞行速度随航程自适应：短跳干脆，长跳也是约 2 秒多的平滑飞行
        const cap = clamp(Math.abs(diff) / 2.2, 18_000, 260_000) * dt
        stepPx = clamp(stepPx, -cap, cap)
        current.current += stepPx
        apply(current.current)
      } else if (current.current !== target.current) {
        current.current = target.current
        apply(current.current)
      } else if (dirty.current) {
        dirty.current = false
        apply(current.current)
      }
      raf = window.requestAnimationFrame(tick)
    }

    measure()
    apply(0)
    window.addEventListener('resize', measure)
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [false, tx])

  // Esc 关闭行星卡片
  useEffect(() => {
    if (!card) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setCard(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card])

  function onStageKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      goTo(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      goTo(maxFor(modeRef.current))
    }
  }

  let tagIndex = -1
  const nextTagRef = (el: HTMLElement | null) => {
    tagIndex += 1
    tagNodes.current[tagIndex] = el
  }

  let captionIndex = -1
  const nextCaptionRef = (el: HTMLParagraphElement | null) => {
    captionIndex += 1
    captionNodes.current[captionIndex] = el
  }

  const sunPx = kmToPx(SUN.diameterKm)
  const journey = mode === 'journey'

  return (
    <div
      ref={stageRef}
      className={`pixel-stage${false ? ' is-reduced' : ''}${journey ? ' is-journey' : ' is-gallery'}`}
      tabIndex={0}
      role="region"
      aria-label={journey
        ? tx("真实比例太阳系：月球直径等于 1 像素。向右滚动，从太阳走到海王星。")
        : tx("同一把尺子上的著名天体对比：从中子星到参宿四。向右滚动。")}
      onKeyDown={onStageKeyDown}
    >
      <div ref={trackRef} className="pixel-track" aria-hidden="true">
        <div className="pixel-journey">
          {/* 太阳：开场占据左屏的 400px 圆盘 */}
          <div className="pixel-sun-glow" style={{ left: SUN_X, width: sunPx * 3.4, height: sunPx * 3.4 }} />
          <button
            type="button"
            className="pixel-sun"
            style={{ left: SUN_X, width: sunPx, height: sunPx }}
            onClick={() => openCard({ kind: 'sun' })}
            tabIndex={-1}
          >
            <span className="sr-only">{tx("太阳")}</span>
          </button>
          <span ref={nextTagRef} data-x={SUN_X} className="pixel-tag pixel-tag--sun" style={{ left: SUN_X }}>
            <b>{tx("太阳")}</b>
            <small>{tx(SUN.tagline)}</small>
          </span>

          {/* 行星：严格按直径渲染的小点 */}
          {BODIES.map((body) => {
            const x = bodyX(body.distanceKm)
            const diameter = Math.max(1, kmToPx(body.diameterKm))
            return (
              <span key={body.id} className="pixel-body" style={{ left: x }}>
                {body.ring && <i className="pixel-ring" style={{ width: kmToPx(273_560) }} />}
                <button
                  type="button"
                  className="pixel-dot"
                  style={{ width: diameter, height: diameter, background: body.color, boxShadow: `0 0 ${Math.max(6, diameter * 1.6)}px ${body.color}` }}
                  onClick={() => openCard({ kind: 'body', body })}
                  tabIndex={-1}
                >
                  <span className="sr-only">{tx(body.name)}</span>
                </button>
                <span ref={nextTagRef} data-x={x} className="pixel-tag">
                  <b>{tx(body.name)}</b>
                  <small>{tx(body.tagline)}</small>
                </span>
              </span>
            )
          })}

          {/* 月球：地球右侧 110.6 px 的 1 像素 */}
          <span className="pixel-body pixel-body--moon" style={{ left: MOON_X }}>
            <button
              type="button"
              className="pixel-dot"
              style={{ width: 1, height: 1, background: MOON.color, boxShadow: `0 0 7px ${MOON.color}` }}
              onClick={() => openCard({ kind: 'moon' })}
              tabIndex={-1}
            >
              <span className="sr-only">{tx("月球")}</span>
            </button>
            <span ref={nextTagRef} data-x={MOON_X} className="pixel-tag">
              <b>{tx(MOON.name)}</b>
              <small>{tx(MOON.tagline)}</small>
            </span>
          </span>

          {/* 沿途字幕 */}
          {CAPTIONS.map((caption) => (
            <p
              key={caption.x}
              ref={nextCaptionRef}
              data-x={SUN_X + caption.x}
              className={`pixel-caption${caption.beat ? ' pixel-caption--beat' : ''}`}
              style={{ left: SUN_X + caption.x, top: `${caption.y}%` }}
            >
              {tx(caption.text)}
            </p>
          ))}
        </div>

        <div className="pixel-gallery">
          {/* 著名天体：同一把尺子上的真实直径 */}
          {GALLERY.map((body) => {
            const diameter = Math.max(1, body.widthPx)
            const limbTag = body.widthPx > 1200
            return (
              <span
                key={body.id}
                className={`pixel-body pixel-gbody pixel-gbody--${body.visual}`}
                style={{ left: body.x, '--g': body.color } as CSSProperties}
              >
                <button
                  type="button"
                  className="pixel-dot"
                  style={{ width: diameter, height: diameter }}
                  onClick={() => openCard({ kind: 'famous', body })}
                  tabIndex={-1}
                >
                  <span className="sr-only">{tx(body.name)}</span>
                </button>
                {body.visual === 'neutron' && <i className="pixel-neutron-ring" aria-hidden="true" />}
                <span
                  ref={nextTagRef}
                  data-x={limbTag ? body.x - body.radiusPx + 120 : body.x}
                  className={`pixel-tag${limbTag ? ' pixel-tag--limb' : ''}`}
                  style={{ left: limbTag ? -body.radiusPx + 120 : 0 }}
                >
                  <b>{tx(body.name)}</b>
                  <small>{tx(body.tagline)}</small>
                </span>
              </span>
            )
          })}

          {GALLERY_CAPTIONS.map((caption) => (
            <p
              key={caption.x}
              ref={nextCaptionRef}
              data-x={caption.x}
              className={`pixel-caption${caption.beat ? ' pixel-caption--beat' : ''}`}
              style={{ left: caption.x, top: `${caption.y}%` }}
            >
              {tx(caption.text)}
            </p>
          ))}
        </div>
      </div>

      {/* 顶部进度 hairline */}
      <div className="pixel-progress" aria-hidden="true">
        <i ref={fillRef} />
      </div>

      {/* 距离 / 天体读数 */}
      <div className="pixel-hud" data-freebar-clearance="true">
        <span className="pixel-hud-block">
          <small>{journey ? tx("距太阳") : tx("当前天体")}</small>
          <span ref={kmRef} className="pixel-hud-km">{tx("0 公里")}</span>
        </span>
        <span className="pixel-hud-block pixel-hud-block--right">
          <small>{journey ? tx("天文单位") : tx("直径")}</small>
          <span ref={auRef} className="pixel-hud-au">0.000 AU</span>
        </span>
      </div>

      <div className="pixel-scale-legend" aria-hidden="true">
        {journey
          ? <>{tx("1 像素 = 3,474.8 公里（月球直径）")}<span className="pixel-scale-legend-full"> {tx("· 全程 44.95 亿公里")}</span></>
          : tx("同一把尺子：1 像素 = 3,474.8 公里 · 只比大小，不比距离")}
      </div>

      {/* 全景总览：三段分组，点了直接跳 */}
      <div className="pixel-map" data-experience-overlay="true">
        {MAP_GROUPS.map((group) => {
          const live = group.modes.includes(mode)
          return (
            <div
              key={group.id}
              className={`pixel-map-group${live ? ' is-live' : ''}`}
              style={{ flexGrow: group.weight }}
            >
              <span className="pixel-map-name">{tx(group.name)}</span>
              <div className="pixel-map-rail" aria-hidden="true">
                {group.id === 'solar' && <i ref={cursorRef} className="pixel-map-cursor" />}
                {group.ticks.map((tick) => (
                  <i
                    key={tick.id}
                    className={`pixel-map-dot${live && nearestId === tick.id ? ' is-active' : ''}`}
                    style={{ left: `${tick.frac * 100}%` }}
                  />
                ))}
              </div>
              <div className="pixel-map-labels" role="group" aria-label={tx(group.name)}>
                {group.ticks.map((tick) => (
                  <button
                    key={tick.id}
                    type="button"
                    className={live && nearestId === tick.id ? 'is-active' : undefined}
                    aria-label={tx(`跳转到${tick.name}`)}
                    aria-current={live && nearestId === tick.id ? 'true' : undefined}
                    title={tx(tick.name)}
                    onClick={() => jumpToTick(tick)}
                  >
                    <span>{tx(tick.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Freebar
        className="pixel-freebar"
        ariaLabel={journey ? tx("太阳系旅程导航") : tx("著名天体大小对比导航")}
        primaryControlBudget={1}
        mobileDensity="comfortable"
      >
        <button type="button" className="pixel-cruise is-accent" onClick={() => step(1)}>
          <span>{tx("下一站：")}{tx(nextStopName)}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </Freebar>

      {journey && (
        <GhostHint worldId="moon-pixel" gesture={{ type: 'drag', target: '.pixel-stage', dx: -160, dy: 0, label: '滚一下，直达下一个天体' }} />
      )}

      {/* 天体数据卡片 */}
      {card && (
        <div className="pixel-card-scrim" onClick={() => setCard(null)}>
          <aside
            className="pixel-card"
            role="dialog"
            aria-modal="false"
            aria-label={tx("天体数据")}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="pixel-card-close" onClick={() => setCard(null)} aria-label={tx("关闭")}>
              <X aria-hidden="true" />
            </button>
            {card.kind === 'sun' && (
              <>
                <small className="pixel-card-eyebrow">{tx("恒星 · 旅程起点")}</small>
                <h3>{tx("太阳")}</h3>
                <dl>
                  <div><dt>{tx("直径")}</dt><dd>{tx("1,392,700 公里 ≈ 400.8 像素")}</dd></div>
                  <div><dt>{tx("距日")}</dt><dd>{tx("0 公里 — 你正站在这把尺子的原点上")}</dd></div>
                </dl>
                <p>{tx(SUN.fact)}</p>
              </>
            )}
            {card.kind === 'moon' && (
              <>
                <small className="pixel-card-eyebrow">{tx("卫星 · 比例基准")}</small>
                <h3>{tx("月球")}</h3>
                <dl>
                  <div><dt>{tx("直径")}</dt><dd>{tx("3,474.8 公里 = 1 像素")}</dd></div>
                  <div><dt>{tx("距地球")}</dt><dd>{tx("384,400 公里 ≈ 110.6 像素")}</dd></div>
                </dl>
                <p>{tx(MOON.fact)}</p>
              </>
            )}
            {card.kind === 'body' && (
              <>
                <small className="pixel-card-eyebrow">{tx("行星 · 距太阳")}{tx(formatAu(card.body.distanceKm))}</small>
                <h3>{tx(card.body.name)}</h3>
                <dl>
                  <div><dt>{tx("直径")}</dt><dd>{tx(card.body.diameterKm.toLocaleString('zh-CN'))} {tx("公里 ≈")}{tx(kmToPx(card.body.diameterKm).toFixed(1))} {tx("像素")}</dd></div>
                  <div><dt>{tx("距日")}</dt><dd>{tx(formatKm(card.body.distanceKm))} · {tx((card.body.distanceKm / AU_KM).toFixed(3))} AU</dd></div>
                </dl>
                <p>{tx(card.body.fact)}</p>
              </>
            )}
            {card.kind === 'famous' && (
              <>
                <small className="pixel-card-eyebrow">{tx(FAMOUS_EYEBROW[card.body.group])}</small>
                <h3>{tx(card.body.name)}</h3>
                <dl>
                  <div><dt>{tx("直径")}</dt><dd>{tx(formatKm(card.body.diameterKm))} ≈ {tx(formatPx(card.body.widthPx))}</dd></div>
                  <div><dt>{tx("对比")}</dt><dd>{tx(card.body.compare)}</dd></div>
                </dl>
                <p>{tx(card.body.fact)}</p>
              </>
            )}
          </aside>
        </div>
      )}

      {/* 旅程结尾点题 */}
      <div className={`pixel-end${endOpen ? ' is-open' : ''}`} aria-hidden={!endOpen}>
        <div className="pixel-end-copy">
          <small>{tx("旅程终点 · 4,495,060,000 公里 · 30.07 AU")}</small>
          <h2>{tx("最近的一颗恒星，还在 3,060 公里之外。")}</h2>
          <p>
            {tx("比邻星距太阳 4.25 光年。在这把尺子上，那是 116 亿像素—— 把屏幕一块接一块拼起来，要拼出大约 3,060 公里。")}</p>
          <p className="pixel-end-payoff">{tx("按真实比例观察时，太阳系的大部分空间是空旷的。")}</p>
          <div className="pixel-end-actions">
            <button type="button" className="is-accent" onClick={() => switchMode('gallery')} tabIndex={endOpen ? 0 : -1}>
              <Sparkle aria-hidden="true" /> {tx("接着看：著名天体有多大")}</button>
            <button type="button" onClick={() => goTo(0, true)} tabIndex={endOpen ? 0 : -1}>
              <ArrowCounterClockwise aria-hidden="true" /> {tx("回到太阳")}</button>
          </div>
        </div>
      </div>

      {/* 大小对比结尾点题 */}
      <div className={`pixel-end pixel-end--gallery${galleryEndOpen ? ' is-open' : ''}`} aria-hidden={!galleryEndOpen}>
        <div className="pixel-end-copy">
          <small>{tx("对比终点 · 参宿四直径 10.63 亿公里 = 305,925 像素")}</small>
          <h2>{tx("从 0.006 像素，到 305,925 像素。")}</h2>
          <p>
            {tx("中子星和月球共用城市的尺度，参宿四却把火星轨道都装了进去——宇宙名人的个头，能差 5,000 万倍。")}</p>
          <div className="pixel-end-actions">
            <button type="button" className="is-accent" onClick={() => switchMode('journey', 0)} tabIndex={galleryEndOpen ? 0 : -1}>
              <ArrowCounterClockwise aria-hidden="true" /> {tx("回到太阳系之旅")}</button>
            <button type="button" onClick={() => goTo(0)} tabIndex={galleryEndOpen ? 0 : -1}>
              {tx("再看一遍")}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
