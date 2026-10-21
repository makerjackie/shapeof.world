import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useExploration } from './exploration'

vi.mock('~/data/home-recommended', () => ({ recommendedWorldIds: ['approved-a', 'approved-b', 'removed'] }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('keeps featured continuation inside public approved works, including when switching scope', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(['approved-a', 'approved-b', 'other-public']))))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  function Probe({ scope, visited = [] }: { scope: 'all' | 'featured'; visited?: string[] }) {
    const exploration = useExploration(true, visited, 'approved-a', scope)
    return createElement('div', { 'data-ids': exploration.ids.join(','), 'data-complete': String(exploration.complete) }, exploration.nextId)
  }
  try {
    await act(async () => { root.render(createElement(Probe, { scope: 'all' })) })
    expect(container.firstElementChild?.getAttribute('data-ids')).toContain('other-public')
    act(() => root.render(createElement(Probe, { scope: 'featured' })))
    expect(container.firstElementChild?.getAttribute('data-ids')).toBe('approved-a,approved-b')
    expect(container.textContent).toBe('approved-b')
    act(() => root.render(createElement(Probe, { scope: 'featured', visited: ['approved-a', 'approved-b'] })))
    expect(container.firstElementChild?.getAttribute('data-complete')).toBe('true')
    expect(container.textContent).toBe('approved-b')
  } finally { act(() => root.unmount()); container.remove() }
})
