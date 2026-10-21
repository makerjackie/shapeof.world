import { act, createElement, lazy } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExperienceControls } from '~/components/ExperienceShell'
import type { WorldExperience } from '~/data/worlds/types'
import { ClientExperienceRenderer } from './ExperienceRenderer.client'

const { getRenderer, trackEvent } = vi.hoisted(() => ({ getRenderer: vi.fn(), trackEvent: vi.fn() }))

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
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    trackEvent.mockClear()
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
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function renderWorld(nextWorld = world) {
    await act(async () => root.render(createElement(ClientExperienceRenderer, { world: nextWorld, controls })))
  }

  it('offers retry and a home exit when the actual world chunk stays pending for 12 seconds', async () => {
    await renderWorld()
    expect(container.textContent).toContain('experience.opening')
    act(() => vi.advanceTimersByTime(11_999))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('experience.fallback.slow')
    expect(container.querySelector('button')?.textContent).toBe('system.retry')
    expect(container.querySelector('a[href="/"]')).not.toBeNull()
    expect(container.querySelector('a[href="/feedback"]')).not.toBeNull()
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith({ event: 'experience_load_timeout', worldId: world.id })
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
    act(() => vi.advanceTimersByTime(12_000))
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    await act(async () => resolveWorld({ default: () => createElement('canvas') }))
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('gives a newly selected world its own loading period', async () => {
    await renderWorld()
    act(() => vi.advanceTimersByTime(12_000))
    await renderWorld({ ...world, id: 'other-world', renderer: 'other-world' })
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.textContent).toContain('experience.opening')
    act(() => vi.advanceTimersByTime(12_000))
    expect(trackEvent).toHaveBeenLastCalledWith({ event: 'experience_load_timeout', worldId: 'other-world' })
  })
})
