import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ExperienceI18nProvider } from '~/i18n/experience'
import { I18nProvider } from '~/i18n/index'

import { Freebar } from './Freebar'

/** jsdom has no layout/observer delivery loop: explicitly control both phases. */
describe('Freebar resize publication', () => {
  let container: HTMLDivElement
  let root: Root | undefined
  let primary: HTMLElement
  let main: HTMLElement
  let bar: HTMLElement
  let primaryHeight: number
  let mainHeight: number
  let nextFrame: number
  const frames = new Map<number, FrameRequestCallback>()
  const resizeObservers: Array<{
    target?: Element
    notify: () => void
    disconnect: ReturnType<typeof vi.fn>
  }> = []
  const mutationObservers: Array<{
    target?: Node
    notify: () => void
    disconnect: ReturnType<typeof vi.fn>
  }> = []

  function flushFrame() {
    const pending = [...frames.values()]
    frames.clear()
    act(() => pending.forEach(callback => callback(16)))
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers()
    frames.clear()
    resizeObservers.length = 0
    mutationObservers.length = 0
    nextFrame = 1
    primaryHeight = 48
    mainHeight = 80
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame++
      frames.set(id, callback)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
    vi.stubGlobal('ResizeObserver', class {
      target?: Element
      disconnect = vi.fn()
      constructor(private callback: ResizeObserverCallback) { resizeObservers.push(this) }
      observe(target: Element) { this.target = target }
      notify = () => this.callback([], this as unknown as ResizeObserver)
    })
    vi.stubGlobal('MutationObserver', class {
      target?: Node
      disconnect = vi.fn()
      constructor(private callback: MutationCallback) { mutationObservers.push(this) }
      observe(target: Node) { this.target = target }
      notify = () => this.callback([], this as unknown as MutationObserver)
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = this.classList.contains('experience-freebar-primary') ? primaryHeight
        : this.classList.contains('experience-freebar-main') ? mainHeight : 0
      return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: height, width: 300, height, toJSON() {} }
    })
    container = document.createElement('div')
    container.className = 'experience-stage'
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root!.render(createElement(I18nProvider, {
      initialLocale: 'en',
      children: createElement(ExperienceI18nProvider, {
        dictionary: {},
        children: createElement(Freebar, {
          ariaLabel: 'Resize test controls',
          children: createElement('button', null, 'Play'),
        }),
      }),
    })))
    primary = container.querySelector('.experience-freebar-primary')!
    main = container.querySelector('.experience-freebar-main')!
    bar = container.querySelector('.experience-freebar')!
    // Finish the independent initial/state-boundary height publication first.
    flushFrame()
    act(() => vi.advanceTimersByTime(400))
  })

  afterEach(() => {
    if (root) act(() => root!.unmount())
    root = undefined
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it.each(['primary', 'main'] as const)(
    'defers %s observer writes and coalesces notifications using the latest layout',
    (part) => {
      const target = part === 'primary' ? primary : main
      const destination = part === 'primary' ? bar : container
      const property = part === 'primary' ? '--experience-freebar-primary-height' : '--experience-freebar-height'
      const observer = resizeObservers.find(candidate => candidate.target === target)!
      expect(observer).toBeDefined()
      const write = vi.spyOn(destination.style, 'setProperty')
      const previous = destination.style.getPropertyValue(property)
      primaryHeight = 64
      mainHeight = 128
      act(() => {
        observer.notify()
        observer.notify()
        observer.notify()
      })
      expect(write).not.toHaveBeenCalled()
      expect(destination.style.getPropertyValue(property)).toBe(previous)
      expect(frames.size).toBe(1)
      // The queued frame must measure current layout, not a stale notification.
      primaryHeight = 72.2
      mainHeight = 144.2
      flushFrame()
      expect(write).toHaveBeenCalledTimes(1)
      expect(write).toHaveBeenLastCalledWith(property, part === 'primary' ? '73px' : '144px')
      expect(frames.size).toBe(0)
      primaryHeight = 88
      mainHeight = 160
      act(() => observer.notify())
      expect(frames.size).toBe(1)
      flushFrame()
      expect(write).toHaveBeenCalledTimes(2)
      expect(write).toHaveBeenLastCalledWith(property, part === 'primary' ? '88px' : '160px')
    },
  )

  it('coalesces primary mutation and resize notifications without writing in either callback', () => {
    const resize = resizeObservers.find(candidate => candidate.target === primary)!
    const mutation = mutationObservers.find(candidate => candidate.target === primary)!
    expect(mutation).toBeDefined()
    const write = vi.spyOn(bar.style, 'setProperty')
    primaryHeight = 96
    act(() => {
      mutation.notify()
      resize.notify()
      mutation.notify()
    })
    expect(write).not.toHaveBeenCalled()
    expect(frames.size).toBe(1)
    flushFrame()
    expect(write).toHaveBeenCalledExactlyOnceWith('--experience-freebar-primary-height', '96px')
  })

  it('disconnects observers and cancels queued publications when unmounted', () => {
    primaryHeight = 96
    mainHeight = 180
    act(() => {
      resizeObservers.forEach(observer => observer.notify())
      mutationObservers.forEach(observer => observer.notify())
    })
    expect(frames.size).toBe(2)
    const pendingIds = [...frames.keys()]
    const primaryWrite = vi.spyOn(bar.style, 'setProperty')
    const stageWrite = vi.spyOn(container.style, 'setProperty')
    act(() => root!.unmount())
    root = undefined
    for (const id of pendingIds) expect(cancelAnimationFrame).toHaveBeenCalledWith(id)
    for (const observer of [...resizeObservers, ...mutationObservers]) {
      expect(observer.disconnect).toHaveBeenCalledTimes(1)
    }
    expect(frames.size).toBe(0)
    flushFrame()
    act(() => vi.advanceTimersByTime(400))
    expect(primaryWrite).not.toHaveBeenCalled()
    expect(stageWrite).not.toHaveBeenCalled()
    expect(bar.style.getPropertyValue('--experience-freebar-primary-height')).toBe('')
    expect(container.style.getPropertyValue('--experience-freebar-height')).toBe('')
  })
})
