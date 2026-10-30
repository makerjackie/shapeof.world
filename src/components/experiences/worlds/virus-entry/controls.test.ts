import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { VirusEntry } from './VirusEntry'

const fixtures = vi.hoisted(() => ({ tx: (value: string) => value }))
vi.mock('~/i18n/experience', () => ({ useExperienceI18n: () => fixtures.tx }))
vi.mock('~/lib/world-playback', () => ({ isWorldPaused: () => false }))
vi.mock('~/components/experiences/GuideTour', () => ({ GuideTour: () => null, GUIDE_REPLAY_EVENT: 'guide-replay-test' }))
vi.mock('./VirusScene', () => ({ VirusScene: () => null }))

it('replays from the journey camera after a structural bookmark', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const container = document.createElement('div'); document.body.appendChild(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(createElement(VirusEntry, { controls: { registerInteraction: vi.fn() } as unknown as ExperienceControls })))
    const world = container.querySelector('.ve-world')!
    const inside = [...container.querySelectorAll('button')].find(node => node.textContent?.includes('进入细胞之后'))!
    await act(async () => inside.click())
    expect(world.getAttribute('data-view')).toBe('inside')
    expect(world.getAttribute('data-progress')).toBe('0.5000')
    const replay = [...container.querySelectorAll('button')].find(node => node.textContent === '重新看一遍')!
    await act(async () => replay.click())
    expect(world.getAttribute('data-view')).toBe('journey')
    expect(world.getAttribute('data-progress')).toBe('0.0000')
    expect(world.getAttribute('data-selected')).toBe('envelope')
    expect(world.getAttribute('data-playing')).toBe('true')
    await act(async () => inside.click())
    const slider = container.querySelector<HTMLInputElement>('.ve-progress input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider, '1')
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(world.getAttribute('data-progress')).toBe('1.0000')
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="继续过程"]')!.click())
    expect(world.getAttribute('data-view')).toBe('journey')
    expect(world.getAttribute('data-progress')).toBe('0.0000')
    expect(world.getAttribute('data-selected')).toBe('envelope')
  } finally {
    await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals()
  }
})
