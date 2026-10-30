import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { LlmInside } from './LlmInside'

const fixtures = vi.hoisted(() => ({ tx: (value: string) => value, progress: { report: vi.fn(), finish: vi.fn() } }))
vi.mock('~/i18n/experience', () => ({ useExperienceI18n: () => fixtures.tx }))
vi.mock('~/components/experiences/WorldLoadProgress', () => ({ useWorldLoadProgress: () => fixtures.progress }))
vi.mock('~/lib/world-playback', () => ({ isWorldPaused: () => false, subscribeWorldPlayback: () => () => {} }))
vi.mock('./load-model', () => ({ loadModel: () => new Promise(() => {}) }))
vi.mock('./Scene', () => ({ LlmScene: () => null }))
vi.mock('~/components/experiences/GuideTour', async () => {
  const { useEffect } = await import('react')
  return { GuideTour: ({ defaultOpen, steps }: { defaultOpen: boolean; steps: { action: () => void }[] }) => {
    useEffect(() => { if (defaultOpen) steps[0].action() }, [defaultOpen])
    return null
  } }
})

let root: Root, container: HTMLDivElement
function viewport(width: number) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') && width <= 700, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
}
async function render() {
  await act(async () => root.render(createElement(LlmInside, { controls: { registerInteraction: vi.fn(), finish: vi.fn() } as unknown as ExperienceControls })))
}
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(node => node.textContent === text)!
  expect(button).toBeTruthy()
  await act(async () => button.click())
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container) })
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })

describe('GPT instruments on a narrow screen', () => {
  it('starts collapsed on a phone, expands on request, and restores scene room for a tour', async () => {
    viewport(320); await render()
    const world = container.querySelector('.li-world')!, toggle = container.querySelector('.li-panel-toggle')!
    expect(world.getAttribute('data-panel-open')).toBe('false')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe(container.querySelector('.li-panel-inner')!.id)
    await act(async () => (toggle as HTMLButtonElement).click())
    expect(world.getAttribute('data-panel-open')).toBe('true')
    await click('导览')
    expect(world.getAttribute('data-panel-open')).toBe('false')
    expect(container.querySelector('.li-label-toggle')).toBeTruthy()
  })
  it('retains the complete desktop instruments', async () => {
    viewport(1280); await render()
    expect(container.querySelector('.li-world')!.getAttribute('data-panel-open')).toBe('true')
    await click('导览')
    expect(container.querySelector('.li-world')!.getAttribute('data-panel-open')).toBe('true')
  })
})
