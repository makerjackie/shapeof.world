import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { SynthesisStudy } from './synthesis-study'
import { synthesisReactions } from './synthesis-data'

vi.mock('~/i18n/experience', () => ({ useExperienceI18n: () => (text: string) => text }))

it('preserves the running drawing on parent updates and restarts only on replay', () => {
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
 const host = document.createElement('div'), root = createRoot(host)
 const render = (reduced = false) => act(() => root.render(createElement(SynthesisStudy, {
  reaction: synthesisReactions.Og, reduced, onInteract: () => {},
 })))
 try {
  render()
  const first = host.querySelector('svg')
  expect(first?.querySelector('style')).not.toBeNull()
  render()
  expect(host.querySelector('svg')).toBe(first)
  act(() => host.querySelector('button')!.click())
  expect(host.querySelector('svg')).not.toBe(first)
  render(true)
  expect(host.querySelector('svg')).not.toBeNull()
  expect(host.querySelector('style')).toBeNull()
  expect(host.querySelectorAll('.pm-fusion-product circle').length).toBe(294)
 } finally { act(() => root.unmount()); vi.unstubAllGlobals() }
})
