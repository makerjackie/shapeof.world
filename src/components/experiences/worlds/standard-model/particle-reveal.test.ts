import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ParticleTable } from './ui/ParticleTable'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.open = false } })
  history.replaceState(null, '', '#museum')
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  act(() => root.render(createElement(ParticleTable, { en: true, onInteract: vi.fn(), collection: new Set<string>() })))
})
afterEach(() => { act(() => root.unmount());host.remove();Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers() })
function reveal() {
  const link = host.querySelector<HTMLAnchorElement>('[aria-label="Observe Electron"]')!
  link.focus()
  act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
  return link
}
it('reveals exactly the selected particle without changing the route, and restores focus on cancel', () => {
  const link = reveal()
  expect(host.querySelectorAll('dialog[open]')).toHaveLength(1)
  expect(host.querySelector('.smm-reveal-name')?.textContent).toBe('Electron')
  expect(location.hash).toBe('#museum')
  act(() => host.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })))
  expect(host.querySelector('dialog')).toBeNull()
  expect(document.activeElement).toBe(link)
  act(() => vi.advanceTimersByTime(2000))
  expect(location.hash).toBe('#museum')
})
it('continues from the revealed card to the same particle dossier', () => {
  reveal()
  act(() => host.querySelector<HTMLButtonElement>('.smm-reveal-card')!.click())
  expect(host.querySelector('dialog')).toBeNull()
  expect(location.hash).toBe('#museum/e')
})
it('dismisses a reveal when browser navigation changes the route', () => {
  reveal()
  act(() => { history.replaceState(null, '', '#museum/matter'); window.dispatchEvent(new HashChangeEvent('hashchange')) })
  expect(host.querySelector('dialog')).toBeNull()
  expect(location.hash).toBe('#museum/matter')
})

it('keeps Escape inside the reveal and returns to the atlas', () => {
  reveal()
  const outerKey = vi.fn()
  window.addEventListener('keydown', outerKey)
  act(() => host.querySelector('.smm-reveal-close')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
  expect(host.querySelector('dialog')).toBeNull()
  expect(location.hash).toBe('#museum')
  expect(outerKey).not.toHaveBeenCalled()
  window.removeEventListener('keydown', outerKey)
})

it.each([false, true])('waits for a deliberate card click after animation (reduced motion: %s)', reduced => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })))
  reveal()
  act(() => vi.advanceTimersByTime(30_000))
  expect(location.hash).toBe('#museum')
  expect(host.querySelector('dialog[open]')).not.toBeNull()
  act(() => host.querySelector<HTMLButtonElement>('.smm-reveal-card')!.click())
  expect(location.hash).toBe('#museum/e')
  expect(host.querySelector('dialog')).toBeNull()
})
