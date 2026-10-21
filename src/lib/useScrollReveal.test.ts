import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useScrollReveal } from './useScrollReveal'

type IntersectionCallback = ConstructorParameters<typeof IntersectionObserver>[0]

class IntersectionObserverFake {
  static instances: IntersectionObserverFake[] = []

  readonly observed = new Set<Element>()
  readonly callback: IntersectionCallback
  readonly options?: IntersectionObserverInit

  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    IntersectionObserverFake.instances.push(this)
  }

  observe = (target: Element) => {
    this.observed.add(target)
  }

  unobserve = (target: Element) => {
    this.observed.delete(target)
  }

  disconnect = () => {
    this.observed.clear()
  }

  takeRecords = () => []

  fire(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

function Harness({
  ids,
  contentKey,
  children,
  showRoot = true,
}: {
  ids: string[]
  contentKey?: string
  children?: ReactNode
  showRoot?: boolean
}) {
  const revealRef = useScrollReveal<HTMLDivElement>('.card', { contentKey })
  if (!showRoot) return null
  return createElement(
    'div',
    { ref: revealRef, 'data-testid': 'root' },
    ...ids.map((id) => createElement('div', { className: 'card', key: id, 'data-id': id })),
    children,
  )
}

describe('useScrollReveal interface', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    IntersectionObserverFake.instances = []
    vi.stubGlobal(
      'IntersectionObserver',
      IntersectionObserverFake as unknown as typeof IntersectionObserver,
    )
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
    vi.unstubAllGlobals()
  })

  it('reveals an item once when it intersects and keeps observer policy inside the module', () => {
    act(() => root.render(createElement(Harness, { ids: ['a', 'b'] })))

    const revealRoot = container.querySelector('[data-testid="root"]')!
    const cards = Array.from(container.querySelectorAll('.card'))
    const observer = IntersectionObserverFake.instances[0]

    expect(revealRoot.classList.contains('reveal-ready')).toBe(true)
    expect(observer.options).toEqual({
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.05,
    })
    expect(observer.observed).toEqual(new Set(cards))

    act(() => observer.fire(cards[0]))

    expect(cards[0].classList.contains('is-in')).toBe(true)
    expect(observer.observed.has(cards[0])).toBe(false)
    expect(observer.observed.has(cards[1])).toBe(true)
  })

  it('shows a filtered or reordered collection immediately instead of replaying its wave', () => {
    act(() => root.render(createElement(Harness, { ids: ['a', 'b'], contentKey: 'all' })))
    const firstObserver = IntersectionObserverFake.instances[0]
    for (const card of Array.from(container.querySelectorAll('.card'))) {
      act(() => firstObserver.fire(card))
    }

    act(() => {
      root.render(createElement(Harness, { ids: ['c', 'a'], contentKey: 'filtered' }))
    })

    const cards = Array.from(container.querySelectorAll('.card'))
    expect(cards.map((card) => card.getAttribute('data-id'))).toEqual(['c', 'a'])
    expect(cards.every((card) => card.classList.contains('is-in'))).toBe(true)
  })

  it('keeps a filter change pending while an empty result temporarily removes the root', () => {
    act(() => root.render(createElement(Harness, {
      ids: ['a'],
      contentKey: 'all',
    })))
    const observer = IntersectionObserverFake.instances[0]
    act(() => observer.fire(container.querySelector('.card')!))

    act(() => root.render(createElement(Harness, {
      ids: [],
      contentKey: 'empty-filter',
      showRoot: false,
    })))
    act(() => root.render(createElement(Harness, {
      ids: ['b'],
      contentKey: 'next-filter',
    })))

    expect(container.querySelector('[data-id="b"]')?.classList.contains('is-in')).toBe(true)
  })

  it('observes items appended under the root after the initial render', async () => {
    act(() => root.render(createElement(Harness, { ids: ['a'] })))
    const revealRoot = container.querySelector('[data-testid="root"]')!
    const observer = IntersectionObserverFake.instances[0]
    const appended = document.createElement('div')
    appended.className = 'card'

    revealRoot.appendChild(appended)
    await act(async () => Promise.resolve())

    expect(observer.observed.has(appended)).toBe(true)
  })

  it('makes every item visible when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    act(() => root.render(createElement(Harness, { ids: ['c'] })))

    expect(container.querySelector('[data-id="c"]')?.classList.contains('is-in')).toBe(true)
  })
})
