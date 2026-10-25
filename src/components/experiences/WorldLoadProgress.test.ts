import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorldLoadProgressProvider, useWorldLoadProgress } from './WorldLoadProgress'

vi.mock('~/i18n/index', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('mounted world asset progress', () => {
  let container: HTMLDivElement, root: Root
  const handles = new Map<string, ReturnType<typeof useWorldLoadProgress>>()
  function Asset({ name }: { name: string }) {
    const handle = useWorldLoadProgress()
    useEffect(() => { handles.set(name, handle) }, [name, handle])
    return null
  }
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    root = createRoot(container)
    handles.clear()
  })
  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  const render = (names: string[]) => act(() => root.render(createElement(WorldLoadProgressProvider, null,
    names.map((name) => createElement(Asset, { name, key: name })),
  )))

  it('aggregates independent tasks, keeps unknown totals indeterminate, and cleans up', () => {
    render(['model', 'texture'])
    act(() => {
      handles.get('model')!.report({ loaded: 100, total: 1000 })
      handles.get('texture')!.report({ loaded: 50 })
    })
    act(() => vi.advanceTimersByTime(399))
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('[data-loaded="150"]')).not.toBeNull()
    expect(container.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false)
    render(['model'])
    expect(container.querySelector('[data-loaded="100"][data-total="1000"]')).not.toBeNull()
    act(() => handles.get('model')!.report({ loaded: 1000, total: 1000 }))
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull() // Decoding is still pending.
    act(() => handles.get('model')!.finish())
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('does not flash for a quickly ready resource', () => {
    render(['model'])
    act(() => handles.get('model')!.report({ loaded: 0 }))
    act(() => vi.advanceTimersByTime(250))
    act(() => handles.get('model')!.finish())
    act(() => vi.advanceTimersByTime(500))
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })
})
