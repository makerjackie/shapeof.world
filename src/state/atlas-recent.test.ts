import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { AtlasProvider, loadAtlasState, useAtlas } from './atlas'

vi.mock('~/lib/analytics', () => ({ trackEvent: vi.fn() }))

it('persists the most recent revisit without changing unique visit counts', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, operation: () => unknown) => operation() } })
  localStorage.removeItem('oneworld.atlas.v2')
  localStorage.removeItem('oneworld.atlas.v1')
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  function Probe({ id }: { id: string }) {
    const atlas = useAtlas()
    return createElement('button', { onClick: () => atlas.visitWorld(id) }, 'Visit')
  }
  try {
    for (const id of ['equation-wormhole', 'cow-anatomy', 'equation-wormhole']) {
      await act(async () => root.render(createElement(AtlasProvider, null, createElement(Probe, { id }))))
      await act(async () => container.querySelector('button')!.click())
    }
    const persisted = loadAtlasState()
    expect(persisted.visited).toEqual(['equation-wormhole', 'cow-anatomy'])
    expect(persisted.lastVisitedWorldId).toBe('equation-wormhole')
  } finally {
    act(() => root.unmount()); container.remove(); localStorage.removeItem('oneworld.atlas.v2'); vi.unstubAllGlobals()
  }
})
