import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGuideCanvasExit } from './useGuideCanvasExit'

function Harness(props: Parameters<typeof useGuideCanvasExit>[0]) {
  useGuideCanvasExit(props)
  return null
}

function pointerDown(target: Element, button = 0, isPrimary = true) {
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button })
  Object.defineProperty(event, 'isPrimary', { value: isPrimary })
  target.dispatchEvent(event)
  return event
}

describe('useGuideCanvasExit', () => {
  let container: HTMLDivElement
  let root: Root
  const onExit = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    onExit.mockClear()
    document.body.innerHTML = `
      <main data-world-id="current"><div class="experience-stage">
        <canvas id="canvas"></canvas><svg><circle id="shape" /></svg>
        <div data-experience-overlay="true"><canvas id="overlay" /></div>
        <button><svg id="button-icon" /></button>
        <nav><svg id="navigation" /></nav>
        <div id="background"></div>
      </div></main>
      <main data-world-id="other"><div class="experience-stage"><canvas id="other" /></div></main>
      <canvas id="outside"></canvas>`
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(createElement(Harness, { worldId: 'current', active: true, onExit })))
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('exits on canvas and SVG interaction while preserving the original canvas event', () => {
    const canvas = document.querySelector('#canvas')!
    const handleCanvas = vi.fn((event: Event) => event.stopPropagation())
    canvas.addEventListener('pointerdown', handleCanvas)
    const event = pointerDown(canvas)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(handleCanvas).toHaveBeenCalledWith(event)
    expect(event.defaultPrevented).toBe(false)
    pointerDown(document.querySelector('#shape')!)
    expect(onExit).toHaveBeenCalledTimes(2)
  })

  it('ignores overlays, navigation, background, and other world surfaces', () => {
    for (const id of ['overlay', 'button-icon', 'navigation', 'background', 'other', 'outside']) {
      pointerDown(document.getElementById(id)!)
    }
    expect(onExit).not.toHaveBeenCalled()
  })

  it('ignores secondary buttons and additional touches', () => {
    pointerDown(document.querySelector('#canvas')!, 2)
    pointerDown(document.querySelector('#canvas')!, 0, false)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('does not interrupt the guide behind a shell panel or an inert stage', () => {
    const canvas = document.querySelector('#canvas')!
    const world = canvas.closest('[data-world-id]')!
    world.setAttribute('data-panel-open', 'true')
    pointerDown(canvas)
    world.removeAttribute('data-panel-open')
    canvas.closest('.experience-stage')!.setAttribute('inert', '')
    pointerDown(canvas)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('removes the listener when the guide becomes inactive', () => {
    act(() => root.render(createElement(Harness, { worldId: 'current', active: false, onExit })))
    pointerDown(document.querySelector('#canvas')!)
    expect(onExit).not.toHaveBeenCalled()
  })
})
