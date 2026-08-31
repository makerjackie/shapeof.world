import './styles/GhostHint.css'

import { useEffect, useRef, useState } from 'react'
import { CursorClick } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'

export type GhostGesture =
  | { type: 'drag'; target: string; dx?: number; dy?: number; label: string }
  | { type: 'scrub'; target: string; label: string }
  | { type: 'tap'; target: string; label: string }

function storageKey(worldId: string) {
  return `oneworld.ghost.${worldId}.v1`
}

function readSeen(worldId: string) {
  try {
    return window.localStorage.getItem(storageKey(worldId)) === 'done'
  } catch {
    return true
  }
}

function writeSeen(worldId: string) {
  try {
    window.localStorage.setItem(storageKey(worldId), 'done')
  } catch {
    /* ignore */
  }
}

/** 通过原生 setter + input 事件驱动 React 受控滑块（幽灵拨动） */
function nudgeRangeInput(input: HTMLInputElement, ratio: number) {
  const min = Number(input.min || 0)
  const max = Number(input.max || 100)
  const current = Number(input.value)
  const span = max - min
  let next = current + span * ratio
  if (next > max) next = current - span * ratio
  if (next < min) next = current + span * ratio
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, String(next))
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

type Point = { x: number; y: number }

/**
 * 幽灵手势提示：一个半透明光标飘进来，亲自做一遍本世界的核心手势
 * （拖拽 / 拨滑块 / 点按钮），循环两轮后淡出；用户一旦亲自操作立即永久消失。
 */
export function GhostHint({ worldId, gesture, delay = 1400 }: { worldId: string; gesture: GhostGesture; delay?: number }) {
  const tx = useExperienceI18n()
  const [pos, setPos] = useState<Point | null>(null)
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'press' | 'move' | 'leave' | 'done'>('hidden')
  const [labelVisible, setLabelVisible] = useState(false)
  /** 底部 freebar 目标：文案放光标上方，避免贴底出屏 */
  const [labelSide, setLabelSide] = useState<'below' | 'above'>('below')
  const timers = useRef<Array<number>>([])
  const loops = useRef(0)

  const clampPoint = (point: Point): Point => {
    const pad = 28
    const vw = window.innerWidth
    const vh = window.innerHeight
    return {
      x: Math.min(vw - pad, Math.max(pad, point.x)),
      y: Math.min(vh - pad, Math.max(pad, point.y)),
    }
  }

  useEffect(() => {
    if (readSeen(worldId)) return

    // 深链/海报模式：?ghost=0 时完全不演示（避免 scrub 手势改动深链指定的状态）
    if (new URLSearchParams(window.location.search).get('ghost') === '0') return
    let cancelled = false
    let targetAttempts = 0
    loops.current = 0

    const clearGhostState = () => {
      if (document.documentElement.getAttribute('data-oneworld-ghost-active') === worldId) {
        document.documentElement.removeAttribute('data-oneworld-ghost-active')
      }
    }

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.current.push(id)
    }

    let dismissFromUser: () => void
    const removeDismissListeners = () => {
      window.removeEventListener('pointerdown', dismissFromUser, true)
      window.removeEventListener('keydown', dismissFromUser, true)
      window.removeEventListener('wheel', dismissFromUser, true)
    }

    const dismiss = (remember = true) => {
      if (cancelled) return
      cancelled = true
      timers.current.forEach((id) => window.clearTimeout(id))
      clearGhostState()
      setPhase('done')
      if (remember) writeSeen(worldId)
      removeDismissListeners()
    }

    dismissFromUser = () => dismiss(true)
    window.addEventListener('pointerdown', dismissFromUser, true)
    window.addEventListener('keydown', dismissFromUser, true)
    window.addEventListener('wheel', dismissFromUser, true)

    const playOnce = () => {
      if (cancelled) return
      const el = document.querySelector(gesture.target)
      const rect = el?.getBoundingClientRect()
      if (!el || !rect || rect.width <= 0 || rect.height <= 0) {
        targetAttempts += 1
        if (targetAttempts < 24) later(playOnce, 250)
        else dismiss(false)
        return
      }
      targetAttempts = 0
      document.documentElement.setAttribute('data-oneworld-ghost-active', worldId)
      const start = clampPoint({ x: rect.left + rect.width * 0.5, y: rect.top + rect.height / 2 })
      // 目标贴底（freebar 滑块）时文案放上方；入场也从侧上方来，避免先冲出底边
      const nearBottom = rect.bottom > window.innerHeight - 140
      setLabelSide(nearBottom ? 'above' : 'below')
      const entry = clampPoint(
        nearBottom
          ? { x: start.x + 90, y: start.y - 70 }
          : { x: start.x + 130, y: start.y + 110 },
      )

      setPos(entry)
      setPhase('enter')
      setLabelVisible(false)
      later(() => setPos(start), 60)
      later(() => {
        setPhase('press')
        setLabelVisible(true)
        if (gesture.type === 'tap') {
          // 涟漪通过 CSS 动画呈现，无需真实点击
        }
      }, 760)
      later(() => {
        setPhase('move')
        if (gesture.type === 'drag') {
          setPos(clampPoint({
            x: start.x + (gesture.dx ?? 130),
            y: start.y + (gesture.dy ?? (nearBottom ? -40 : -46)),
          }))
        } else if (gesture.type === 'scrub') {
          const input = el as HTMLInputElement
          nudgeRangeInput(input, 0.14)
          setPos(clampPoint({ x: start.x + Math.min(rect.width * 0.14, 48), y: start.y }))
          later(() => {
            nudgeRangeInput(input, -0.22)
            setPos(clampPoint({ x: start.x - Math.min(rect.width * 0.08, 36), y: start.y }))
          }, 520)
          later(() => {
            nudgeRangeInput(input, 0.08)
            setPos(start)
          }, 1040)
        }
      }, 1050)
      later(() => {
        setPhase('leave')
        setLabelVisible(false)
      }, 2300)
      later(() => {
        loops.current += 1
        if (loops.current >= 2) dismiss(true)
        else playOnce()
      }, 2900)
    }

    const startId = window.setTimeout(playOnce, delay)
    timers.current.push(startId)

    return () => {
      cancelled = true
      timers.current.forEach((id) => window.clearTimeout(id))
      clearGhostState()
      window.removeEventListener('pointerdown', dismissFromUser, true)
      window.removeEventListener('keydown', dismissFromUser, true)
      window.removeEventListener('wheel', dismissFromUser, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId])

  if (phase === 'hidden' || phase === 'done' || !pos) return null

  return (
    <div
      className={`ghost-hint is-${phase} is-${gesture.type} is-label-${labelSide}`}
      data-experience-overlay="true"
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
    >
      <span className="ghost-cursor">
        <CursorClick weight="fill" />
      </span>
      {gesture.type === 'tap' && phase === 'press' && <span className="ghost-ripple" />}
      {labelVisible && <span className="ghost-label">{tx(gesture.label)}</span>}
    </div>
  )
}
