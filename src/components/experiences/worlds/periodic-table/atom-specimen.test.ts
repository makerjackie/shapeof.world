import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paintProbabilityCloud } from './probability-canvas'
import { AtomSpecimen } from './atom-specimen'

vi.mock('~/i18n/experience', () => ({ useExperienceI18n: () => (text: string) => text }))
vi.mock('./probability-canvas', () => ({ paintProbabilityCloud: vi.fn() }))
const shells = [1]
let host: HTMLDivElement, root: Root
const render = (massNumber = 1, reduced = false, activeShell: number | null = null) => act(() => root.render(createElement(AtomSpecimen, {
 shells, symbol: 'H', atomicNumber: 1, massNumber, reduced, activeShell, onInteract: () => {},
})))
const advance = () => act(() => vi.advanceTimersByTime(1600))
const electronPosition = () => {
 const electron = host.querySelector('.pm-electron')!
 return [electron.getAttribute('cx'), electron.getAttribute('cy')]
}
const click = (text: string) => act(() => {
 const button = [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text))!
 button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})

beforeEach(() => {
 localStorage.clear(); vi.mocked(paintProbabilityCloud).mockClear()
 vi.useFakeTimers()
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
 vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
 vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
 host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => {
 act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('atom animation continuity', () => {
 it('keeps the paused electron phase and proton node across rapid isotope changes', () => {
  render(); advance(); click('暂停运动'); advance()
  const position = electronPosition(), proton = host.querySelector('[data-nucleon="proton-0"]')
  render(3); advance()
  expect(host.querySelectorAll('.pm-nucleon')).toHaveLength(3)
  expect(host.querySelector('[data-nucleon="proton-0"]')).toBe(proton)
  expect(electronPosition()).toEqual(position)
  render(1); render(3); render(1); advance()
  expect(host.querySelectorAll('.pm-nucleon')).toHaveLength(1)
  expect(electronPosition()).toEqual(position)
  click('继续运动'); advance()
  expect(electronPosition()).not.toEqual(position)
 })

 it('stops automatic motion for reduced motion while still updating isotope counts', () => {
  render(1, true); advance()
  const position = electronPosition()
  advance(); expect(electronPosition()).toEqual(position)
  render(3, true); advance()
  expect(host.querySelectorAll('.pm-nucleon')).toHaveLength(3)
  expect(electronPosition()).toEqual(position)
  expect(vi.getTimerCount()).toBe(0)
 })

 it('cancels its pending animation frame on unmount', () => {
  render(); advance()
  expect(vi.getTimerCount()).toBeGreaterThan(0)
  act(() => root.render(null))
  expect(vi.getTimerCount()).toBe(0)
 })

 it('stops drawing offscreen and resumes the same particle nodes on return', () => {
  let notify!: IntersectionObserverCallback
  const disconnect = vi.fn()
  vi.stubGlobal('IntersectionObserver', class {
   constructor(callback: IntersectionObserverCallback) { notify = callback }
   observe() {}
   disconnect = disconnect
  })
  render(); advance()
  const proton = host.querySelector('[data-nucleon="proton-0"]'), position = electronPosition()
  act(() => notify([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver))
  advance()
  expect(vi.getTimerCount()).toBe(0)
  expect(electronPosition()).toEqual(position)
  act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver))
  advance()
  expect(electronPosition()).not.toEqual(position)
  expect(host.querySelector('[data-nucleon="proton-0"]')).toBe(proton)
  act(() => root.render(null))
  expect(disconnect).toHaveBeenCalledOnce()
 })
})


describe('atom view continuity', () => {
 it('preserves the paused atom pose and electron phase when switching views', () => {
  render(); advance(); click('暂停运动'); advance()
  const before = electronPosition(), proton = host.querySelector('[data-nucleon="proton-0"]')
  click('电子云'); advance()
  expect(host.querySelector('.pm-atom-studio')?.getAttribute('data-mode')).toBe('cloud')
  expect(vi.getTimerCount()).toBe(0)
  click('结构示意'); advance()
  expect(electronPosition()).toEqual(before)
  expect(host.querySelector('[data-nucleon="proton-0"]')).toBe(proton)
 })
 it('keeps probability samples stationary across isotope changes, camera movement and resize', () => {
  render(1, true); click('电子云'); advance()
  const draw = vi.mocked(paintProbabilityCloud), cloud = draw.mock.lastCall![1]
  render(3, true); advance()
  act(() => host.querySelector('.pm-atom-touch')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  advance(); click('放大观察'); advance()
  expect(draw.mock.lastCall![1]).toBe(cloud)
  expect(draw.mock.lastCall![2].y).toBe(20)
  expect(vi.getTimerCount()).toBe(0)
  expect(localStorage.getItem('oneworld:periodic-table:atom-view')).toBe('cloud')
 })
 it('zooms into the nucleus and restores the atom when the electron is selected', () => {
  render(3, true); advance()
  const proton = host.querySelector('[data-nucleon="proton-0"]')!, radius = Number(proton.getAttribute('r'))
  click('质子'); advance()
  expect(Number(proton.getAttribute('r'))).toBeCloseTo(radius * 3.35, 2)
  expect(host.querySelector<SVGPathElement>('.pm-orbit')!.style.opacity).toBe('0')
  act(() => host.querySelector<HTMLButtonElement>('.pm-atom-ledger [data-kind="electron"]')!.click()); advance()
  expect(Number(proton.getAttribute('r'))).toBeCloseTo(radius, 2)
  expect(host.querySelector<SVGPathElement>('.pm-orbit')!.style.opacity).toBe('1')
 })
})


it('lets the external shell selector leave a nucleus close-up and stop for counting', () => {
 render(3, true); advance(); click('质子'); advance()
 render(3, true, 0); advance()
 expect(host.querySelector('.pm-atom-studio')?.getAttribute('data-focus')).toBe('all')
 expect(host.querySelector<SVGPathElement>('.pm-orbit')!.style.opacity).toBe('1')
 expect(vi.getTimerCount()).toBe(0)
})

it('zooms the cloud beyond the old 140% limit with wheel and buttons without resampling',()=>{
 render(1,true);click('电子云');advance()
 const draw=vi.mocked(paintProbabilityCloud),samples=draw.mock.lastCall![1]
 const surface=host.querySelector('.pm-atom-touch')!
 act(()=>surface.dispatchEvent(new WheelEvent('wheel',{deltaY:-600,bubbles:true,cancelable:true})));advance()
 expect(Number(host.querySelector('.pm-atom-studio')!.getAttribute('data-zoom'))).toBeGreaterThan(140)
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="放大原子"]')!.click());advance()
 expect(draw.mock.lastCall![1]).toBe(samples)
 for(let i=0;i<10;i++)act(()=>host.querySelector<HTMLButtonElement>('[aria-label="放大原子"]')!.click())
 expect(host.querySelector('.pm-atom-studio')!.getAttribute('data-zoom')).toBe('320')
 click('复位');advance();expect(host.querySelector('.pm-atom-studio')!.getAttribute('data-zoom')).toBe('100')
 expect(draw.mock.lastCall![1]).toBe(samples)
})
