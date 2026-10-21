import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '~/i18n/index'
import { ExperienceI18nProvider } from '~/i18n/experience'
import {
  GuideTour,
  setGuideAutoplay,
  type GuideStep,
} from './GuideTour'

vi.mock('~/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

function guideElement({
  action,
  onExit = () => undefined,
}: {
  action: () => void
  onExit?: () => void
}) {
  const steps: Array<GuideStep> = [
    {
      title: '第一步',
      body: '第一步内容',
      action,
      durationMs: 2_400,
    },
    {
      title: '第二步',
      body: '第二步内容',
      durationMs: 2_400,
    },
  ]

  return createElement(I18nProvider, {
    initialLocale: 'zh',
    children: createElement(GuideTour, {
      worldId: 'guide-regression',
      steps,
      defaultOpen: true,
      onExit,
    }),
  })
}

function dispatchTouch(target: EventTarget, type: 'touchstart' | 'touchend', x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', {
    value: [{ clientX: x, clientY: y }],
  })
  target.dispatchEvent(event)
  return event
}

function dispatchWheel(
  target: EventTarget,
  init: Pick<WheelEventInit, 'deltaX' | 'deltaY' | 'deltaMode'>,
) {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

describe('GuideTour autoplay', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 16)
    window.cancelAnimationFrame = (id) => window.clearTimeout(id)
    container = document.createElement('div')
    container.className = 'experience-stage'
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it.each(['zh', 'en'] as const)('jumps and revisits scenes with native labelled buttons in %s', (locale) => {
    const actions = [vi.fn(), vi.fn(), vi.fn()]
    const steps = actions.map((action, i) => ({ title: `Scene ${i + 1}`, body: '', action }))
    act(() => root.render(createElement(I18nProvider, {
      initialLocale: locale,
      children: createElement(GuideTour, { worldId: 'jump-test', steps, defaultOpen: true }),
    })))
    const dots = container.querySelectorAll<HTMLButtonElement>('.guide-stage-dot')
    expect(dots[2].getAttribute('aria-label')).toBe(locale === 'en' ? 'Scene 3' : '第 3 幕')
    expect(dots[2].hasAttribute('role')).toBe(false)
    act(() => dots[2].click())
    expect(actions.map(action => action.mock.calls.length)).toEqual([1, 0, 1])
    expect(dots[2].getAttribute('aria-current')).toBe('step')
    act(() => vi.advanceTimersByTime(10_000))
    expect(container.querySelector('.guide-tour')).not.toBeNull()
    act(() => dots[0].click())
    expect(actions.map(action => action.mock.calls.length)).toEqual([2, 0, 1])
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('Scene 1')
  })

  it.each([
    ['zh', '重播这一幕'],
    ['en', 'Replay this step'],
  ] as const)('stage replay button reruns only the current scene (%s)', (locale, label) => {
    const enter = vi.fn()
    const rerun = vi.fn()
    const leave = vi.fn()
    const dictionary = { '重播这一幕': 'Replay this step' }
    const steps: Array<GuideStep> = [
      { title: 'Opening', body: '', action: enter, replay: rerun, durationMs: 2_400 },
      { title: 'Closing', body: '' },
    ]
    act(() => root.render(createElement(I18nProvider, {
      initialLocale: locale,
      children: createElement(ExperienceI18nProvider, {
        dictionary,
        children: createElement(GuideTour, {
          worldId: 'stage-replay-test',
          steps,
          defaultOpen: true,
          onExit: leave,
        }),
      }),
    })))

    const replayButton = container.querySelector<HTMLButtonElement>('button.guide-stage-replay')
    expect(replayButton?.getAttribute('aria-label')).toBe(label)
    expect(replayButton?.getAttribute('title')).toBe(label)

    act(() => replayButton?.click())
    // Replaying pauses autoplay, so waiting must neither advance nor exit.
    act(() => vi.advanceTimersByTime(10_000))

    expect(rerun).toHaveBeenCalledOnce()
    expect(enter).toHaveBeenCalledOnce()
    expect(leave).not.toHaveBeenCalled()
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('Opening')
  })

  it('shows no replay button for scenes without a replay callback', () => {
    act(() => root.render(createElement(I18nProvider, {
      initialLocale: 'zh',
      children: createElement(GuideTour, {
        worldId: 'stage-no-replay-test',
        steps: [{ title: 'Only scene', body: '' }],
        defaultOpen: true,
      }),
    })))
    expect(container.querySelector('.guide-stage-replay')).toBeNull()
  })

  it('exits the guide on its world canvas while leaving the interaction available', () => {
    const onExit = vi.fn()
    container.dataset.worldId = 'guide-regression'
    act(() => root.render(createElement('div', { className: 'experience-stage' },
      createElement('canvas'), guideElement({ action: vi.fn(), onExit }),
    )))
    const canvas = container.querySelector('canvas')!
    const handleCanvas = vi.fn()
    canvas.addEventListener('pointerdown', handleCanvas)
    act(() => canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(handleCanvas).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.guide-tour')).toBeNull()
  })

  it('keeps the autoplay deadline across parent rerenders with fresh step and callback identities', () => {
    const action = vi.fn()

    act(() => {
      root.render(guideElement({ action }))
    })
    act(() => {
      setGuideAutoplay('guide-regression', true)
    })

    for (let elapsed = 0; elapsed < 3_000; elapsed += 250) {
      act(() => {
        root.render(guideElement({ action, onExit: () => undefined }))
        vi.advanceTimersByTime(250)
      })
    }

    expect(container.querySelector('.guide-step-badge')?.textContent).toContain('2 / 2')
  })

  it('does not rerun the current step action when autoplay is played or paused', () => {
    const action = vi.fn()

    act(() => {
      root.render(guideElement({ action }))
    })
    expect(action).toHaveBeenCalledTimes(1)

    act(() => setGuideAutoplay('guide-regression', true))
    act(() => setGuideAutoplay('guide-regression', false))
    act(() => setGuideAutoplay('guide-regression', true))

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('moves stage story copy out of the bottom control rail', () => {
    const action = vi.fn()
    const steps: Array<GuideStep> = [
      { title: '舞台标题', body: '舞台正文', action },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('舞台标题')
    expect(container.querySelector('.guide-stage-body')?.textContent).toBe('舞台正文')
    expect(container.querySelector('.guide-step-content')).toBeNull()
    expect(container.querySelector('.guide-stage-continue')?.textContent).toContain('进入自由探索')
    expect(container.querySelector('.guide-btn-next')).toBeNull()
  })

  it('uses a scene-aware stage frame by default and honors a per-step stage plan', () => {
    const steps: Array<GuideStep> = [
      { title: '左侧注解', body: '避开右侧主体' },
      { title: '右下结论', body: '跟随现象落下' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-plan-regression',
          steps,
          defaultOpen: true,
          stagePlan: [
            {
              position: 'center-left',
              mobilePosition: 'top-left',
              motion: 'drift-right',
              tone: 'dark',
              width: 'narrow',
              treatment: 'annotation',
              cue: 'right',
            },
            {
              position: 'bottom-right',
              mobilePosition: 'bottom-center',
              motion: 'scale',
              tone: 'light',
              width: 'wide',
              treatment: 'monumental',
              cue: 'down',
            },
          ],
        }),
      }))
    })

    const firstFrame = container.querySelector('.guide-stage-copy')
    expect(container.querySelector('.guide-tour')?.getAttribute('data-guide-placement')).toBe('stage')
    expect(container.querySelector('.guide-tour')?.getAttribute('data-guide-stage-plan')).toBe('authored')
    expect(firstFrame?.getAttribute('data-stage-position')).toBe('center-left')
    expect(firstFrame?.getAttribute('data-stage-mobile-position')).toBe('top-left')
    expect(firstFrame?.getAttribute('data-stage-motion')).toBe('drift-right')
    expect(firstFrame?.getAttribute('data-stage-tone')).toBe('dark')
    expect(firstFrame?.getAttribute('data-stage-width')).toBe('narrow')
    expect(firstFrame?.getAttribute('data-stage-treatment')).toBe('annotation')
    expect(firstFrame?.querySelector('.guide-stage-cue')?.getAttribute('data-direction')).toBe('right')

    act(() => dispatchWheel(container, { deltaY: 90 }))
    const secondFrame = container.querySelector('.guide-stage-copy')
    expect(secondFrame?.getAttribute('data-stage-position')).toBe('bottom-right')
    expect(secondFrame?.getAttribute('data-stage-mobile-position')).toBe('bottom-center')
    expect(secondFrame?.getAttribute('data-stage-treatment')).toBe('monumental')
  })

  it('moves a stage story forward and backward with vertical wheel gestures', () => {
    const steps: Array<GuideStep> = [
      { title: '第一幕', body: '第一幕内容' },
      { title: '第二幕', body: '第二幕内容' },
      { title: '第三幕', body: '第三幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-wheel-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    act(() => dispatchWheel(container, { deltaY: 90 }))
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第二幕')
    act(() => dispatchWheel(container, { deltaY: 90 }))
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第二幕')

    act(() => vi.advanceTimersByTime(700))
    act(() => dispatchWheel(container, { deltaY: -90 }))
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第一幕')
  })

  it('owns wheel input before a canvas camera controller can consume it', () => {
    const steps: Array<GuideStep> = [
      { title: '第一幕', body: '第一幕内容' },
      { title: '第二幕', body: '第二幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-canvas-wheel-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    const canvas = document.createElement('canvas')
    const cameraWheel = vi.fn()
    canvas.addEventListener('wheel', cameraWheel, { passive: false })
    container.appendChild(canvas)

    let wheelEvent: WheelEvent | undefined
    act(() => {
      wheelEvent = dispatchWheel(canvas, { deltaX: 0, deltaY: 90, deltaMode: 0 })
    })

    expect(cameraWheel).not.toHaveBeenCalled()
    expect(wheelEvent?.defaultPrevented).toBe(true)
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第二幕')

    act(() => {
      vi.advanceTimersByTime(220)
      dispatchWheel(canvas, { deltaX: 0, deltaY: 90, deltaMode: 0 })
    })
    expect(container.querySelector('.guide-tour')).toBeNull()

    let freeWheelEvent: WheelEvent | undefined
    act(() => {
      freeWheelEvent = dispatchWheel(canvas, { deltaX: 0, deltaY: 12, deltaMode: 0 })
    })
    expect(cameraWheel).toHaveBeenCalledTimes(1)
    expect(freeWheelEvent?.defaultPrevented).toBe(false)
    canvas.remove()
  })

  it('accumulates trackpad deltas and consumes inertia as one scene change', () => {
    const steps: Array<GuideStep> = [
      { title: '第一幕', body: '第一幕内容' },
      { title: '第二幕', body: '第二幕内容' },
      { title: '第三幕', body: '第三幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-trackpad-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    act(() => {
      for (const deltaY of [3.5, 5.25, 7.5, 9.25, 12]) {
        dispatchWheel(container, { deltaX: 0.4, deltaY, deltaMode: 0 })
        vi.advanceTimersByTime(16)
      }
      for (const deltaY of [8, 6, 4, 2, 1, 0.5]) {
        dispatchWheel(container, { deltaX: 0.2, deltaY, deltaMode: 0 })
        vi.advanceTimersByTime(16)
      }
      for (const deltaY of [-8, -10, -12, -9]) {
        dispatchWheel(container, { deltaX: 0.2, deltaY, deltaMode: 0 })
        vi.advanceTimersByTime(16)
      }
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第二幕')

    act(() => {
      vi.advanceTimersByTime(220)
      for (const deltaY of [6, 8, 10, 12]) {
        dispatchWheel(container, { deltaX: 0.5, deltaY, deltaMode: 0 })
        vi.advanceTimersByTime(16)
      }
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第三幕')
  })

  it('normalizes line-mode wheels and ignores horizontal trackpad gestures', () => {
    const steps: Array<GuideStep> = [
      { title: '第一幕', body: '第一幕内容' },
      { title: '第二幕', body: '第二幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-wheel-mode-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    act(() => {
      dispatchWheel(container, { deltaX: 40, deltaY: 12, deltaMode: 0 })
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第一幕')

    act(() => {
      dispatchWheel(container, { deltaX: 0, deltaY: 3, deltaMode: 1 })
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('第二幕')
  })

  it('keeps canvas swipes for the world and only changes scenes from the bottom guide rail', () => {
    const steps: Array<GuideStep> = [
      { title: '触摸第一幕', body: '第一幕内容' },
      { title: '触摸第二幕', body: '第二幕内容' },
      { title: '触摸第三幕', body: '第三幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-touch-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    const canvas = document.createElement('canvas')
    container.appendChild(canvas)
    act(() => {
      dispatchTouch(canvas, 'touchstart', 120, 420)
      dispatchTouch(canvas, 'touchend', 120, 320)
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('触摸第一幕')

    const rail = container.querySelector('.guide-stage-dots') as HTMLElement
    let railTouchEnd: Event | undefined
    act(() => {
      dispatchTouch(rail, 'touchstart', 120, 420)
      railTouchEnd = dispatchTouch(rail, 'touchend', 120, 320)
    })
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('触摸第二幕')
    expect(railTouchEnd?.defaultPrevented).toBe(true)
    expect(container.querySelector('.guide-stage-continue-desktop')?.textContent).toBe('下一幕')
    expect(container.querySelector('.guide-stage-continue-mobile')?.textContent).toBe('下一幕')
    canvas.remove()
  })

  it('supports arrow-key story navigation when focus is on the stage', () => {
    const steps: Array<GuideStep> = [
      { title: '键盘第一幕', body: '第一幕内容' },
      { title: '键盘第二幕', body: '第二幕内容' },
    ]

    act(() => {
      root.render(createElement(I18nProvider, {
        initialLocale: 'zh',
        children: createElement(GuideTour, {
          worldId: 'guide-stage-keyboard-regression',
          steps,
          defaultOpen: true,
          placement: 'stage',
        }),
      }))
    })

    act(() => container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('键盘第二幕')
    act(() => container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })))
    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('键盘第一幕')
  })

  it('opens when a free-first world changes defaultOpen after mounting', () => {
    const steps: Array<GuideStep> = [{ title: '延迟打开', body: '故事内容' }]
    const renderGuide = (defaultOpen: boolean) => createElement(I18nProvider, {
      initialLocale: 'zh',
      children: createElement(GuideTour, {
        worldId: 'guide-late-open-regression',
        steps,
        defaultOpen,
      }),
    })

    act(() => root.render(renderGuide(false)))
    expect(container.querySelector('.guide-tour')).toBeNull()
    act(() => root.render(renderGuide(true)))

    expect(container.querySelector('.guide-stage-title')?.textContent).toBe('延迟打开')
  })

  it('closes when storyMode turns defaultOpen off while the tour is still active', () => {
    const steps: Array<GuideStep> = [{ title: '还没讲完', body: '故事内容' }]
    const renderGuide = (defaultOpen: boolean) => createElement(I18nProvider, {
      initialLocale: 'zh',
      children: createElement(GuideTour, {
        worldId: 'guide-story-free-mutex',
        steps,
        defaultOpen,
      }),
    })

    act(() => root.render(renderGuide(true)))
    expect(container.querySelector('.guide-tour')).not.toBeNull()
    act(() => root.render(renderGuide(false)))
    expect(container.querySelector('.guide-tour')).toBeNull()
  })
})
