import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '~/i18n'
import { GuideTour } from './GuideTour'
import { ownsExperienceStageInput } from './experience-input'

vi.mock('~/lib/analytics', () => ({ trackEvent: vi.fn() }))

function wheel(target: Element, options: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 90, ...options })
  act(() => target.dispatchEvent(event))
  return event
}

function key(target: Element, value: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...options })
  act(() => target.dispatchEvent(event))
  return event
}

function touch(target: Element, type: 'touchstart' | 'touchend', y: number, count = 1) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', {
    value: Array.from({ length: count }, () => ({ clientX: 120, clientY: y })),
  })
  act(() => target.dispatchEvent(event))
  return event
}

describe('GuideTour input ownership', () => {
  let page: HTMLElement
  let stage: HTMLElement
  let panel: HTMLElement
  let root: Root
  let nextWorld: ReturnType<typeof vi.fn>
  let exit: ReturnType<typeof vi.fn>
  let firstAction: ReturnType<typeof vi.fn>
  let shellKeydown: (event: KeyboardEvent) => void

  const step = () => page.querySelector('.guide-tour')?.getAttribute('data-guide-step')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    window.localStorage.clear()
    page = document.createElement('main')
    page.className = 'experience-page'
    page.dataset.worldId = 'input-owner'
    page.dataset.panelOpen = 'false'
    page.innerHTML = '<section class="experience-stage" tabindex="-1"><div id="guide-mount"></div></section><aside class="experience-intro"><div class="experience-intro-copy"></div></aside>'
    document.body.appendChild(page)
    stage = page.querySelector('.experience-stage')!
    panel = page.querySelector('.experience-intro-copy')!
    root = createRoot(page.querySelector('#guide-mount')!)
    firstAction = vi.fn()
    exit = vi.fn()
    nextWorld = vi.fn()
    shellKeydown = (event) => {
      if (event.key === 'PageDown' && ownsExperienceStageInput(stage, event)) nextWorld()
    }
    window.addEventListener('keydown', shellKeydown)
    act(() => root.render(createElement(I18nProvider, {
      initialLocale: 'zh',
      children: createElement(GuideTour, {
        worldId: 'input-owner',
        defaultOpen: true,
        steps: [
          { title: 'First', body: '', action: firstAction },
          { title: 'Second', body: '' },
          { title: 'Third', body: '' },
        ],
        onExit: exit,
      }),
    })))
  })

  afterEach(() => {
    act(() => root.unmount())
    window.removeEventListener('keydown', shellKeydown)
    page.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each(['intro', 'ask', 'more', 'share'])('leaves %s panel input untouched and resumes the same story after closing', (name) => {
    panel.className = `experience-${name}`
    const receivedWheel = vi.fn()
    const receivedEscape = vi.fn()
    panel.addEventListener('wheel', receivedWheel)
    panel.addEventListener('keydown', receivedEscape)
    page.dataset.panelOpen = 'true'

    expect(wheel(panel).defaultPrevented).toBe(false)
    expect(wheel(stage).defaultPrevented).toBe(false)
    expect(key(panel, 'Escape').defaultPrevented).toBe(false)
    expect(key(stage, 'PageDown').defaultPrevented).toBe(false)
    expect(receivedWheel).toHaveBeenCalledTimes(1)
    expect(receivedEscape).toHaveBeenCalledTimes(1)
    expect(step()).toBe('1')
    expect(exit).not.toHaveBeenCalled()
    expect(nextWorld).not.toHaveBeenCalled()

    page.dataset.panelOpen = 'false'
    expect(wheel(stage).defaultPrevented).toBe(true)
    expect(step()).toBe('2')
    expect(firstAction).toHaveBeenCalledTimes(1)
  })

  it.each([
    '<input type="range">',
    '<textarea></textarea>',
    '<select><option>One</option></select>',
    '<button><span>Button</span></button>',
    '<a href="#example"><span>Link</span></a>',
    '<div contenteditable=""><span>Edit</span></div>',
    '<div contenteditable="plaintext-only">Edit</div>',
    '<div role="slider" tabindex="0">Slider</div>',
    '<details><summary>Summary</summary></details>',
  ])('preserves native and custom control input: %s', (html) => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = html
    stage.appendChild(wrapper)
    const target = wrapper.querySelector('span, summary, option') ?? wrapper.firstElementChild!
    const received = vi.fn()
    target.addEventListener('keydown', received)
    expect(key(target, 'PageDown').defaultPrevented).toBe(false)
    expect(wheel(target).defaultPrevented).toBe(false)
    expect(received).toHaveBeenCalledTimes(1)
    expect(step()).toBe('1')
    expect(nextWorld).not.toHaveBeenCalled()
  })

  it.each(['x', 'y'])('lets an independent %s scroll region keep input, including at its edge', (axis) => {
    const scroller = document.createElement('div')
    scroller.style[axis === 'x' ? 'overflowX' : 'overflowY'] = 'auto'
    Object.defineProperties(scroller, axis === 'x'
      ? { clientWidth: { value: 200 }, scrollWidth: { value: 800 } }
      : { clientHeight: { value: 200 }, scrollHeight: { value: 800 } })
    scroller.innerHTML = '<p>Scrollable content</p>'
    stage.appendChild(scroller)
    const target = scroller.firstElementChild!
    const received = vi.fn()
    scroller.addEventListener('wheel', received)
    expect(wheel(target).defaultPrevented).toBe(false)
    expect(key(target, 'PageDown').defaultPrevented).toBe(false)
    expect(received).toHaveBeenCalledTimes(1)
    expect(step()).toBe('1')
    expect(nextWorld).not.toHaveBeenCalled()
    expect(key(stage, 'PageDown').defaultPrevented).toBe(true)
    expect(step()).toBe('2')
  })

  it('keeps other worlds and shell overlays outside the guide input scope', () => {
    const otherWorld = document.createElement('main')
    otherWorld.dataset.worldId = 'other-world'
    otherWorld.innerHTML = '<div class="experience-stage"><canvas></canvas><nav class="guide-stage-nav"></nav></div>'
    page.appendChild(otherWorld)
    const overlay = document.createElement('div')
    overlay.dataset.experienceOverlay = 'true'
    stage.appendChild(overlay)
    for (const target of [otherWorld.querySelector('canvas')!, overlay, panel]) {
      expect(wheel(target).defaultPrevented).toBe(false)
      expect(key(target, 'PageDown').defaultPrevented).toBe(false)
    }
    const otherNavigation = otherWorld.querySelector('nav')!
    touch(otherNavigation, 'touchstart', 420)
    expect(touch(otherNavigation, 'touchend', 320).defaultPrevented).toBe(false)
    expect(step()).toBe('1')
    expect(nextWorld).not.toHaveBeenCalled()
  })

  it('ignores a guide whose world identity no longer matches its stage', () => {
    page.dataset.worldId = 'another-world'
    expect(wheel(stage).defaultPrevented).toBe(false)
    expect(key(stage, 'ArrowDown').defaultPrevented).toBe(false)
    expect(step()).toBe('1')
  })

  it('preserves browser zoom, modified shortcuts, and text composition', () => {
    expect(wheel(stage, { ctrlKey: true }).defaultPrevented).toBe(false)
    for (const options of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }, { repeat: true }]) {
      expect(key(stage, 'PageDown', options).defaultPrevented).toBe(false)
    }
    expect(step()).toBe('1')
    expect(nextWorld).not.toHaveBeenCalled()
  })

  it('lets an unfocused keyboard drive the only stage without stealing focus from another control', () => {
    expect(key(document.body, 'PageDown').defaultPrevented).toBe(true)
    expect(step()).toBe('2')
    panel.innerHTML = '<input>'
    panel.querySelector('input')!.focus()
    expect(key(document.body, 'PageDown').defaultPrevented).toBe(false)
    expect(step()).toBe('2')
    expect(nextWorld).not.toHaveBeenCalled()
  })

  it('cancels a guide swipe if a panel opens during the gesture and ignores multiple touches', () => {
    const navigation = page.querySelector('.guide-stage-nav')!
    touch(navigation, 'touchstart', 420)
    page.dataset.panelOpen = 'true'
    expect(touch(navigation, 'touchend', 320).defaultPrevented).toBe(false)
    page.dataset.panelOpen = 'false'
    touch(navigation, 'touchstart', 420, 2)
    expect(touch(navigation, 'touchend', 320).defaultPrevented).toBe(false)
    expect(step()).toBe('1')
    touch(navigation, 'touchstart', 420)
    expect(touch(navigation, 'touchend', 320).defaultPrevented).toBe(true)
    expect(step()).toBe('2')
  })
})
