import './styles/GuideTour.css'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowCounterClockwise, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lightbulb, X } from '@phosphor-icons/react'

import { trackEvent } from '~/lib/analytics'
import { useI18n } from '~/i18n/index'
import { useExperienceI18n } from '~/i18n/experience'
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities'

export type GuideStep = {
  title: string
  body: string
  /** 进入该步时可自动执行一次非阻塞的场景演示 */
  action?: () => void
  /** 提供时在操作区显示「重播这一幕」：把本步的演示从头再演一遍 */
  replay?: () => void
  /** 返回 false 时先消费本次继续操作，用于完成当前长动画后再进入下一幕。 */
  beforeAdvance?: () => boolean
  /** 自动播放时本步停留毫秒；默认 5200 */
  durationMs?: number
}

export type GuideStagePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type GuideStageMotion = 'rise' | 'fade' | 'drift-left' | 'drift-right' | 'scale'
export type GuideStageTone = 'auto' | 'light' | 'dark'
export type GuideStageWidth = 'narrow' | 'normal' | 'wide'
export type GuideStageTreatment = 'editorial' | 'caption' | 'monumental' | 'annotation'
export type GuideStageCue = 'none' | 'up' | 'down' | 'left' | 'right'

export type GuideStageFrame = {
  position: GuideStagePosition
  mobilePosition?: GuideStagePosition
  motion?: GuideStageMotion
  tone?: GuideStageTone
  width?: GuideStageWidth
  treatment?: GuideStageTreatment
  cue?: GuideStageCue
}

export type GuideStagePlan = ReadonlyArray<GuideStagePosition | GuideStageFrame>

const DEFAULT_STAGE_POSITIONS: ReadonlyArray<GuideStagePosition> = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
  'center-right',
  'center-left',
]
const DEFAULT_STAGE_MOTIONS: ReadonlyArray<GuideStageMotion> = [
  'rise',
  'drift-left',
  'drift-right',
  'fade',
  'scale',
]

const WHEEL_GESTURE_IDLE_MS = 180
const WHEEL_GESTURE_THRESHOLD_PX = 36
const WHEEL_LINE_HEIGHT_PX = 16
const WHEEL_MIN_DELTA_PX = 0.5

function wheelDeltaInPixels(event: WheelEvent) {
  const unit = event.deltaMode === 1
    ? WHEEL_LINE_HEIGHT_PX
    : event.deltaMode === 2
      ? Math.max(window.innerHeight, 1)
      : 1
  return { x: event.deltaX * unit, y: event.deltaY * unit }
}

function stageSeed(worldId: string) {
  let value = 0
  for (const character of worldId) value = (value * 31 + character.charCodeAt(0)) >>> 0
  return value
}

function stageFrameFor(worldId: string, index: number, plan?: GuideStagePlan): Required<GuideStageFrame> {
  const seed = stageSeed(worldId)
  const planned = plan?.length ? plan[index % plan.length] : undefined
  const frame = typeof planned === 'string' ? { position: planned } : planned
  const position = frame?.position ?? DEFAULT_STAGE_POSITIONS[(seed + index) % DEFAULT_STAGE_POSITIONS.length]
  return {
    position,
    mobilePosition: frame?.mobilePosition ?? position,
    motion: frame?.motion ?? DEFAULT_STAGE_MOTIONS[(seed + index) % DEFAULT_STAGE_MOTIONS.length],
    tone: frame?.tone ?? 'auto',
    width: frame?.width ?? 'normal',
    treatment: frame?.treatment ?? 'editorial',
    cue: frame?.cue ?? 'none',
  }
}

export const GUIDE_REPLAY_EVENT = 'oneworld:guide-replay'
/** 壳层 / 世界触发：{ worldId, playing } */
export const GUIDE_AUTOPLAY_EVENT = 'oneworld:guide-autoplay'
/** GuideTour 广播当前自动播放状态：{ worldId, playing, active } */
export const GUIDE_AUTOPLAY_STATE_EVENT = 'oneworld:guide-autoplay-state'
/** Story finished (not skipped): { worldId } */
export const GUIDE_COMPLETE_EVENT = 'oneworld:guide-complete'
/** GuideTour 统一广播运行状态；用户只点「下一步」。 */

function storageKey(worldId: string) {
  return `oneworld.guide.${worldId}.v1`
}

function readSeen(worldId: string) {
  try {
    return window.localStorage.getItem(storageKey(worldId)) === 'done'
  } catch {
    return true
  }
}

/** 是否已看完/跳过过该世界的引导（用于「故事模式 vs 自由探索」互斥） */
export function hasCompletedGuide(worldId: string) {
  return readSeen(worldId)
}

function writeSeen(worldId: string) {
  try {
    window.localStorage.setItem(storageKey(worldId), 'done')
  } catch {
    /* ignore */
  }
}

function emitAutoplayState(worldId: string, playing: boolean, active: boolean) {
  window.dispatchEvent(
    new CustomEvent(GUIDE_AUTOPLAY_STATE_EVENT, {
      detail: { worldId, playing, active },
    }),
  )
}

/** 触发某个世界重播引导（由各模块的「玩法引导」按钮调用） */
export function replayGuide(worldId: string) {
  window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT, { detail: { worldId } }))
}

/** 沉浸演示：开始 / 暂停自动逐步播放引导 */
export function setGuideAutoplay(worldId: string, playing: boolean) {
  window.dispatchEvent(new CustomEvent(GUIDE_AUTOPLAY_EVENT, { detail: { worldId, playing } }))
}

export function GuideTour({
  worldId,
  steps,
  replayLabel = '重播故事',
  defaultOpen = false,
  /** stage 把旁白放进舞台安全区；center / corner 仅供尚未迁移的特殊壳层。 */
  placement = 'stage',
  stagePlan,
  /**
   * 关闭后是否显示右上角「重播故事」chip。
   * 现行标准默认 false：重播只放 freebar 弱文字链，禁止第二颗 chip。
   */
  showReplayChip = false,
  /** 兼容尚未迁移的卡片导览；舞台导览始终保留共享退出入口。 */
  showCloseButton = true,
  /** 允许旧世界把章节正文交给自己的舞台层，底部仍使用共享进度与继续入口。 */
  showCard = true,
  kicker,
  exitLabel,
  onExit,
}: {
  worldId: string
  steps: Array<GuideStep>
  replayLabel?: string
  /** 叙事型世界首屏直接展开第一章；它是字幕轨，不是遮挡画面的弹窗。 */
  defaultOpen?: boolean
  placement?: 'center' | 'corner' | 'stage'
  /** 每一步可独立选择位置、动效、明暗、宽度、文字层级与方向提示。 */
  stagePlan?: GuideStagePlan
  showReplayChip?: boolean
  showCloseButton?: boolean
  showCard?: boolean
  /** 已翻译的舞台 kicker。默认「故事」；高光/演示型世界可传「高光」。 */
  kicker?: string
  /** 已翻译的退出控件名称。默认「退出故事」。 */
  exitLabel?: string
  onExit?: () => void
}) {
  const { t } = useI18n()
  const tx = useExperienceI18n()
  useRegisterExperienceCapabilities(`guide:${worldId}`, { hasGuide: true, canReplayGuide: true })
  const kickerText = kicker ?? tx('故事')
  const exitText = exitLabel ?? tx('退出故事')
  const [active, setActive] = useState(defaultOpen)
  const [index, setIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(false)
  const [nudging, setNudging] = useState(false)
  const advanceTimer = useRef(0)
  const gestureDelta = useRef(0)
  const gestureDirection = useRef<1 | -1 | 0>(0)
  const gestureConsumed = useRef(false)
  const gestureLastEventAt = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const indexRef = useRef(0)
  const previousDefaultOpenRef = useRef(defaultOpen)
  indexRef.current = index

  const start = useCallback(
    (asAutoplay = false) => {
      setIndex(0)
      setActive(true)
      setNudging(false)
      setAutoplay(asAutoplay)
      trackEvent({ event: 'guide_shown', worldId, value: asAutoplay ? 'autoplay' : 'manual' })
      emitAutoplayState(worldId, asAutoplay, true)
    },
    [worldId],
  )

  // 自由优先世界从 Freebar 进入故事时，GuideTour 本身一直挂载着；响应
  // defaultOpen 的 false → true，避免 enterStory 与 replayGuide 之间出现事件竞态。
  // defaultOpen 的 true → false 必须把 tour 收起，否则 enterFree() 会露出
  // Freebar，而 .guide-tour 仍在舞台上。
  useEffect(() => {
    if (defaultOpen && !previousDefaultOpenRef.current) start(false)
    if (!defaultOpen && previousDefaultOpenRef.current) {
      setActive(false)
      setAutoplay(false)
      writeSeen(worldId)
      emitAutoplayState(worldId, false, false)
    }
    previousDefaultOpenRef.current = defaultOpen
  }, [defaultOpen, start, worldId])

  const pauseAutoplay = useCallback(() => {
    setAutoplay(false)
    emitAutoplayState(worldId, false, active)
  }, [worldId, active])

  // 非叙事型世界仍可保持收起；未看过且空闲过久时，重播 chip 才轻微呼吸。
  useEffect(() => {
    if (active) return
    if (readSeen(worldId)) return
    let timer = window.setTimeout(function nudge() {
      setNudging(true)
    }, 20_000)
    const reset = () => {
      setNudging(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setNudging(true), 20_000)
    }
    window.addEventListener('pointerdown', reset, true)
    window.addEventListener('keydown', reset, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', reset, true)
      window.removeEventListener('keydown', reset, true)
    }
  }, [active, worldId])

  // 重播（手动从第一步开始，不强制自动播放）
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId?: string }>).detail
      if (detail?.worldId === worldId) start(false)
    }
    window.addEventListener(GUIDE_REPLAY_EVENT, handler)
    return () => window.removeEventListener(GUIDE_REPLAY_EVENT, handler)
  }, [worldId, start])

  // 沉浸壳层：播放 / 暂停自动导览
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ worldId?: string; playing?: boolean }>).detail
      if (detail?.worldId !== worldId) return
      if (detail.playing) {
        if (!active) start(true)
        else {
          setAutoplay(true)
          emitAutoplayState(worldId, true, true)
        }
      } else {
        pauseAutoplay()
      }
    }
    window.addEventListener(GUIDE_AUTOPLAY_EVENT, handler)
    return () => window.removeEventListener(GUIDE_AUTOPLAY_EVENT, handler)
  }, [worldId, active, start, pauseAutoplay])

  // 挂载 / 卸载时同步状态，便于壳层按钮初始化
  useEffect(() => {
    emitAutoplayState(worldId, false, active)
    return () => emitAutoplayState(worldId, false, false)
  }, [worldId])

  useEffect(() => {
    emitAutoplayState(worldId, autoplay, active)
  }, [worldId, autoplay, active])

  const step = active ? steps[index] : undefined

  const finish = useCallback(
    (completed: boolean) => {
      setActive(false)
      setAutoplay(false)
      writeSeen(worldId)
      trackEvent({
        event: completed ? 'guide_complete' : 'guide_skip',
        worldId,
        value: `step_${index + 1}_of_${steps.length}`,
      })
      if (completed) {
        window.dispatchEvent(new CustomEvent(GUIDE_COMPLETE_EVENT, { detail: { worldId } }))
      }
      emitAutoplayState(worldId, false, false)
      onExit?.()
    },
    [worldId, index, steps.length, onExit],
  )
  const finishRef = useRef(finish)
  finishRef.current = finish

  const next = useCallback(() => {
    if (index + 1 >= steps.length) finish(true)
    else setIndex((i) => i + 1)
  }, [index, steps.length, finish])

  const goPrev = useCallback(() => {
    pauseAutoplay()
    setIndex((i) => Math.max(0, i - 1))
  }, [pauseAutoplay])

  const goNextManual = useCallback(() => {
    pauseAutoplay()
    if (step?.beforeAdvance?.() === false) return
    next()
  }, [pauseAutoplay, step, next])

  // 舞台故事像一页可滚动的长叙事：滚轮 / 触控板向下进入后续章节，向上回看。
  // capture 阶段先于 Canvas / OrbitControls 接管 wheel；否则主题镜头会在
  // GuideTour 的冒泡监听执行前先缩放。一次连续手势只允许切换一幕，停顿后重置，
  // 既能累计触控板的小增量，也不会被同一段惯性滚动连续跳过多幕。
  useEffect(() => {
    if (!active || placement !== 'stage') return

    const moveByGesture = (direction: 1 | -1) => {
      if (direction > 0) goNextManual()
      else if (indexRef.current > 0) goPrev()
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (autoplay) return

      const delta = wheelDeltaInPixels(event)
      const absoluteX = Math.abs(delta.x)
      const absoluteY = Math.abs(delta.y)
      if (absoluteY < WHEEL_MIN_DELTA_PX || absoluteX > absoluteY) return

      const now = Date.now()
      if (now - gestureLastEventAt.current > WHEEL_GESTURE_IDLE_MS) {
        gestureDelta.current = 0
        gestureDirection.current = 0
        gestureConsumed.current = false
      }
      gestureLastEventAt.current = now

      if (gestureConsumed.current) return

      const direction = delta.y > 0 ? 1 : -1
      if (gestureDirection.current !== 0 && gestureDirection.current !== direction) {
        gestureDelta.current = 0
      }
      gestureDirection.current = direction

      gestureDelta.current += delta.y
      if (Math.abs(gestureDelta.current) < WHEEL_GESTURE_THRESHOLD_PX) return

      gestureConsumed.current = true
      gestureDelta.current = 0
      moveByGesture(direction)
    }
    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.guide-stage-nav')) {
        touchStart.current = null
        return
      }
      const touch = event.touches[0]
      if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
    }
    const handleTouchEnd = (event: TouchEvent) => {
      const startPoint = touchStart.current
      const touch = event.changedTouches[0]
      touchStart.current = null
      if (!startPoint || !touch) return
      const deltaX = startPoint.x - touch.clientX
      const deltaY = startPoint.y - touch.clientY
      if (Math.abs(deltaY) < 54 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return
      event.preventDefault()
      moveByGesture(deltaY > 0 ? 1 : -1)
    }
    const handleTouchCancel = () => {
      touchStart.current = null
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, button, [contenteditable="true"]')) return
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        // 故事进行中必须截停事件：体验是 lazy 挂载，keydown 监听注册晚于壳层，
        // 冒泡阶段壳层会先看到未 preventDefault 的 PageDown 而跳去下一世界。
        event.stopPropagation()
        goNextManual()
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        event.stopPropagation()
        if (indexRef.current > 0) goPrev()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        finish(false)
      }
    }

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    // capture 阶段监听：保证先于此后再注册的壳层 bubble 监听器执行
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('wheel', handleWheel, true)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [active, autoplay, placement, finish, goNextManual, goPrev])

  // 自动播放：按步长计时前进；所有故事步骤一律可直接前进。
  const stepDurationMs = step?.durationMs
  useEffect(() => {
    if (!active || !autoplay || index >= steps.length) return
    const ms = Math.max(2_400, stepDurationMs ?? 5_200)
    const timer = window.setTimeout(() => {
      if (indexRef.current + 1 >= steps.length) finishRef.current(true)
      else setIndex((i) => i + 1)
    }, ms)
    return () => window.clearTimeout(timer)
  }, [active, autoplay, index, stepDurationMs, steps.length])

  // 进入新一步：执行自动动作。字幕轨始终底中，不绑定舞台控件。
  useEffect(() => {
    if (!active || !step) return
    let actionFrame = 0
    let settleFrame = 0
    const clearActionState = () => {
      if (document.documentElement.getAttribute('data-oneworld-guide-action-active') === worldId) {
        document.documentElement.removeAttribute('data-oneworld-guide-action-active')
      }
    }
    if (step.action) {
      document.documentElement.setAttribute('data-oneworld-guide-action-active', worldId)
      try {
        step.action()
      } finally {
        actionFrame = window.requestAnimationFrame(() => {
          settleFrame = window.requestAnimationFrame(clearActionState)
        })
      }
    } else {
      clearActionState()
    }
    return () => {
      window.cancelAnimationFrame(actionFrame)
      window.cancelAnimationFrame(settleFrame)
      clearActionState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index])

  if (!active || !step) {
    if (!showReplayChip) return null
    return (
      <button
        type="button"
        className={nudging ? 'guide-replay is-nudging' : 'guide-replay'}
        data-experience-overlay="true"
        onClick={() => start(false)}
        aria-label={tx(replayLabel)}
      >
        <Lightbulb weight="fill" />
        {tx(replayLabel)}
      </button>
    )
  }

  const isLast = index + 1 >= steps.length
  const isStagePlacement = placement === 'stage'
  const stageFrame = stageFrameFor(worldId, index, stagePlan)
  const previousLabel = tx('上一步')
  const nextLabel = tx(isLast ? '完成' : '下一步')
  const stageContinueLabel = tx(isLast ? '进入自由探索' : '向下滚动继续')
  const mobileStageContinueLabel = isLast ? tx('进入自由探索') : t('experience.guide.nextScene')
  const cardClass = [
    'guide-card',
    placement === 'corner' ? 'is-corner' : '',
    placement === 'stage' ? 'is-stage' : '',
    autoplay ? 'is-cinema' : '',
  ].filter(Boolean).join(' ')

  return (
    <aside
      className={[
        'guide-tour',
        autoplay ? 'is-autoplay' : '',
        placement === 'corner' ? 'is-corner' : '',
        placement === 'stage' ? 'is-stage' : '',
      ].filter(Boolean).join(' ')}
      data-experience-overlay="true"
      data-guide-autoplay={autoplay ? 'true' : 'false'}
      data-guide-placement={placement}
      data-guide-stage-plan={stagePlan?.length ? 'authored' : 'adaptive'}
      data-guide-world={worldId}
      data-guide-step={index + 1}
      data-guide-total={steps.length}
      role="region"
      aria-label={tx('玩法引导')}
    >
      {placement === 'stage' && showCard && (
        <div
          className="guide-stage-copy"
          key={index}
          data-stage-position={stageFrame.position}
          data-stage-mobile-position={stageFrame.mobilePosition}
          data-stage-motion={stageFrame.motion}
          data-stage-tone={stageFrame.tone}
          data-stage-width={stageFrame.width}
          data-stage-treatment={stageFrame.treatment}
          aria-live="polite"
        >
          <span className="guide-stage-kicker">{kickerText} · {tx(index + 1)} / {tx(steps.length)}</span>
          <strong className="guide-stage-title">{tx(step.title)}</strong>
          <p className="guide-stage-body">{tx(step.body)}</p>
          {stageFrame.cue !== 'none' && (
            <span className="guide-stage-cue" data-direction={stageFrame.cue} aria-hidden="true">
              {stageFrame.cue === 'up' && <ArrowUp weight="bold" />}
              {stageFrame.cue === 'down' && <ArrowDown weight="bold" />}
              {stageFrame.cue === 'left' && <ArrowLeft weight="bold" />}
              {stageFrame.cue === 'right' && <ArrowRight weight="bold" />}
            </span>
          )}
        </div>
      )}
      {isStagePlacement && !autoplay ? (
        <nav
          className="guide-stage-nav"
          style={{ '--guide-progress': `${((index + 1) / steps.length) * 100}%` } as CSSProperties}
          aria-label={tx(`导览进度 ${index + 1} / ${steps.length}`)}
        >
          <span className="guide-stage-position" aria-hidden="true">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span className="guide-stage-progress"><i /></span>
            <span>{String(steps.length).padStart(2, '0')}</span>
          </span>
          <button type="button" className="guide-stage-continue" onClick={goNextManual}>
            <span className="guide-stage-continue-desktop">{stageContinueLabel}</span>
            <span className="guide-stage-continue-mobile">{mobileStageContinueLabel}</span>
            <span className="guide-stage-scroll-mark" aria-hidden="true">
              <ArrowDown className="guide-stage-continue-desktop" weight="bold" />
              <ArrowRight className="guide-stage-continue-mobile" weight="bold" />
            </span>
          </button>
          <button
            type="button"
            className="guide-stage-exit"
            onClick={() => finish(false)}
            aria-label={exitText}
            title={exitText}
          >
            <X weight="bold" aria-hidden="true" />
          </button>
        </nav>
      ) : (
        <div
          className={cardClass}
          style={{ '--guide-progress': `${((index + 1) / steps.length) * 100}%` } as CSSProperties}
        >
          <div className="guide-card-head">
            <span className="guide-step-badge">{tx(index + 1)} / {tx(steps.length)}</span>
            <span className="guide-progress" aria-hidden="true"><i /></span>
            {!autoplay && showCloseButton && (
              <button type="button" className="guide-close" onClick={() => finish(false)} aria-label={tx('跳过引导')}>
                <X weight="bold" />
              </button>
            )}
          </div>
          {placement !== 'stage' && (
            <div className="guide-step-content" key={index}>
              <strong className="guide-title">{tx(step.title)}</strong>
              <p className="guide-body">{tx(step.body)}</p>
            </div>
          )}
          {!autoplay && (
            <div className="guide-actions">
              {/*
                槽位固定：上一步始终占左位（首步 disabled），下一步/完成始终在中间主位。
                避免从第 1 步点到第 2 步时，「下一步」的位置被插入的「上一步」挤走，
                导致同坐标再点变成上一步。
              */}
              <button
                type="button"
                className="guide-btn guide-btn-prev"
                onClick={goPrev}
                disabled={index <= 0}
                aria-disabled={index <= 0}
              >
                <ArrowLeft aria-hidden="true" /> {previousLabel}
              </button>
              <button
                type="button"
                className="guide-btn is-primary guide-btn-next"
                onClick={goNextManual}
              >
                {nextLabel} <ArrowRight aria-hidden="true" />
              </button>
              {step.replay && (
                <button
                  type="button"
                  className="guide-btn-replay-step"
                  onClick={() => {
                    pauseAutoplay()
                    step.replay?.()
                  }}
                  aria-label={tx('重播这一幕')}
                  title={tx('重播这一幕')}
                >
                  <ArrowCounterClockwise weight="bold" />
                </button>
              )}
              <button type="button" className="guide-skip" onClick={() => finish(false)}>
                {tx('跳过引导')}
              </button>
            </div>
          )}
          {autoplay && (
            <p className="guide-cinema-hint">{tx('自动播放中 · 可随时暂停')}</p>
          )}
        </div>
      )}
    </aside>
  )
}
