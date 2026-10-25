import { act, createElement, lazy } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExperienceControls } from '~/components/ExperienceShell'
import type { WorldExperience } from '~/data/worlds/types'
import { getWorldDownload } from '~/lib/world-download'
import { ExperienceRenderer } from './ExperienceRenderer'
import { ClientExperienceRenderer } from './ExperienceRenderer.client'

const { getRenderer, trackEvent } = vi.hoisted(() => ({ getRenderer: vi.fn(), trackEvent: vi.fn() }))

vi.mock('@tanstack/react-start', () => ({ createClientOnlyFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-start/client-only', () => ({}))
vi.mock('~/worlds/experience-registry', () => ({ getExperienceRenderer: getRenderer }))
vi.mock('~/lib/analytics', () => ({ trackEvent }))
vi.mock('~/data/world-artifacts', () => ({ worldArtifactManifest: { fallbackWorlds: [] } }))
vi.mock('~/i18n/index', () => ({
  useI18n: () => ({ locale: 'en', t: (key: string) => key, worldText: (world: WorldExperience) => world.id }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: string; to: string }) => createElement('a', { href: to }, children),
}))

describe('world renderer loading', () => {
  let container: HTMLDivElement
  let root: Root
  let resolveWorld: (module: { default: () => ReturnType<typeof createElement> }) => void
  const world = { id: 'slow-world', renderer: 'slow-world', poster: '/poster.webp', fallback: 'poster' } as WorldExperience
  const controls = {} as ExperienceControls

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    trackEvent.mockClear()
    getWorldDownload(world.renderer).meter.lastActivity = performance.now()
    getWorldDownload(world.renderer).meter.setManifest({ files: [['/pending-world.js']] })
    const pendingWorld = lazy(() => new Promise<{ default: () => ReturnType<typeof createElement> }>((resolve) => {
      resolveWorld = resolve
    }))
    getRenderer.mockReturnValue(pendingWorld)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function renderWorld(nextWorld = world) {
    getWorldDownload(nextWorld.renderer).meter.setManifest({ files: [['/pending-world.js']] })
    await act(async () => root.render(createElement(ClientExperienceRenderer, { world: nextWorld, controls })))
  }

  it('offers retry and a home exit when the actual world chunk stays pending for 20 seconds', async () => {
    await renderWorld()
    expect(container.textContent).toContain('experience.opening')
    act(() => vi.advanceTimersByTime(19_999))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('experience.fallback.stalled')
    expect(container.querySelector('button')?.textContent).toBe('system.retry')
    expect(container.querySelector('a[href="/"]')).not.toBeNull()
    expect(container.querySelector('a[href="/feedback"]')).not.toBeNull()
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith({ event: 'experience_load_timeout', worldId: world.id, value: 'stalled' })
  })

  it('clears the timer once a world loads normally', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(5_000))
    await act(async () => resolveWorld({ default: () => createElement('canvas', { 'aria-label': 'Ready world' }) }))
    expect(container.querySelector('canvas')).not.toBeNull()
    act(() => vi.advanceTimersByTime(20_000))
    expect(trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'experience_load_timeout' }))
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'experience_renderer_ready', worldId: world.id }))
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('lets the world replace its timeout message when the pending download eventually finishes', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(20_000))
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    await act(async () => resolveWorld({ default: () => createElement('canvas') }))
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('gives a newly selected world its own loading period', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(20_000))
    await renderWorld({ ...world, id: 'other-world', renderer: 'other-world' })
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.textContent).toContain('experience.opening')
    act(() => vi.advanceTimersByTime(20_000))
    expect(trackEvent).toHaveBeenLastCalledWith({ event: 'experience_load_timeout', worldId: 'other-world', value: 'stalled' })
  })
  it('does not show a progress bar for an opening shorter than 400 ms', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(399))
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
    await act(async () => resolveWorld({ default: () => createElement('canvas') }))
    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('uses an indeterminate bar when the denominator is unavailable', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(400))
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.hasAttribute('aria-valuenow')).toBe(false)
    expect(container.querySelector('[data-loaded="0"]')).not.toBeNull()
  })

  it('keeps a slow download open past 12 and 20 seconds while bytes arrive', async () => {
    await renderWorld()
    for (let i = 0; i < 5; i++) {
      act(() => vi.advanceTimersByTime(10_000))
      getWorldDownload(world.renderer).meter.activity(16384, performance.now())
      expect(container.querySelector('[role="alert"]')).toBeNull()
    }
    act(() => vi.advanceTimersByTime(19_999))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(trackEvent).toHaveBeenCalledWith({ event: 'experience_load_timeout', worldId: world.id, value: 'stalled' })
  })

  it('reports a rejected world import as error immediately', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getRenderer.mockReturnValue(lazy(() => Promise.reject(new Error('World chunk download failed (404)'))))
    await renderWorld()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(trackEvent).toHaveBeenCalledWith({ event: 'experience_error', worldId: world.id, value: 'error' })
    expect(trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'experience_load_timeout' }))
  })

  it('renders the outer client-only boundary and resolves the world', async () => {
    await act(async () => root.render(createElement(ExperienceRenderer, { world, controls })))
    await act(async () => vi.advanceTimersByTimeAsync(100))
    await act(async () => resolveWorld({ default: () => createElement('canvas') }))
    expect(container.querySelector('canvas')).not.toBeNull()
  })

})
