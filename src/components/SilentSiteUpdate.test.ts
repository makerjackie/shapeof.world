import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SilentSiteUpdate } from './SilentSiteUpdate'
const route = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('@tanstack/react-router', () => ({ useLocation: ({ select }: { select: (state: unknown) => unknown }) => select(route) }))
class Worker extends EventTarget {
  state = 'installed'
  postMessage = vi.fn()
}
let root: Root, container: HTMLDivElement, reload: ReturnType<typeof vi.fn>
let service: EventTarget & { controller: Worker | null; register: ReturnType<typeof vi.fn> }
let registration: EventTarget & { waiting: Worker | null; installing: Worker | null; update: ReturnType<typeof vi.fn> }
const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('PROD', true)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  route.pathname = '/'
  reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload })
  registration = Object.assign(new EventTarget(), { waiting: null as Worker | null, installing: null as Worker | null, update: vi.fn().mockResolvedValue(undefined) })
  service = Object.assign(new EventTarget(), { controller: null as Worker | null, register: vi.fn().mockResolvedValue(registration) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount()); container.remove()
  if (original) Object.defineProperty(navigator, 'serviceWorker', original)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks()
})
const render = () => act(async () => { root.render(createElement(SilentSiteUpdate)) })
const navigate = async (pathname: string) => { route.pathname = pathname; await render() }

it('never renders any update UI', async () => {
  service.controller = new Worker(); registration.waiting = new Worker()
  await render()
  expect(container.innerHTML).toBe('')
})
it('does not reload or activate until the visitor navigates', async () => {
  service.controller = new Worker(); const waiting = registration.waiting = new Worker()
  await render()
  await act(async () => { vi.advanceTimersByTime(60_000) })
  expect(waiting.postMessage).not.toHaveBeenCalled()
  expect(reload).not.toHaveBeenCalled()
})
it('activates the waiting worker and reloads on the next navigation', async () => {
  service.controller = new Worker(); const waiting = registration.waiting = new Worker()
  await render()
  await navigate('/explore')
  expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  expect(reload).not.toHaveBeenCalled()
  await act(async () => { service.dispatchEvent(new Event('controllerchange')) })
  expect(reload).toHaveBeenCalledTimes(1)
})
it('reloads anyway when the new worker does not take control in time', async () => {
  service.controller = new Worker(); registration.waiting = new Worker()
  await render()
  await navigate('/explore')
  await act(async () => { vi.advanceTimersByTime(2000) })
  expect(reload).toHaveBeenCalledTimes(1)
})
it('reloads once, not on every later navigation', async () => {
  service.controller = new Worker(); registration.waiting = new Worker()
  await render()
  await navigate('/a'); await act(async () => { vi.advanceTimersByTime(2000) })
  await navigate('/b'); await act(async () => { vi.advanceTimersByTime(2000) })
  expect(reload).toHaveBeenCalledTimes(1)
})
it('does not treat a first installation as an update', async () => {
  const worker = new Worker(); worker.state = 'installing'; registration.installing = worker
  await render()
  await act(async () => { worker.state = 'installed'; registration.waiting = worker; worker.dispatchEvent(new Event('statechange')) })
  await act(async () => { service.controller = worker; registration.waiting = null; service.dispatchEvent(new Event('controllerchange')) })
  await navigate('/explore')
  expect(worker.postMessage).not.toHaveBeenCalled()
  expect(reload).not.toHaveBeenCalled()
})
it('reloads on navigation when another tab already activated the update', async () => {
  service.controller = new Worker()
  await render()
  await act(async () => { service.controller = new Worker(); service.dispatchEvent(new Event('controllerchange')) })
  await navigate('/explore')
  expect(reload).toHaveBeenCalledTimes(1)
})
it('detects a later update after the first worker takes control', async () => {
  await render()
  service.controller = new Worker()
  const next = new Worker(); next.state = 'installing'; registration.installing = next
  await act(async () => registration.dispatchEvent(new Event('updatefound')))
  await act(async () => { next.state = 'installed'; registration.waiting = next; next.dispatchEvent(new Event('statechange')) })
  await navigate('/explore')
  expect(next.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
})
it('unsubscribes listeners on unmount', async () => {
  const worker = registration.installing = new Worker()
  const workerRemove = vi.spyOn(worker, 'removeEventListener'), serviceRemove = vi.spyOn(service, 'removeEventListener'), registrationRemove = vi.spyOn(registration, 'removeEventListener')
  await render()
  act(() => root.render(null))
  expect(workerRemove).toHaveBeenCalledWith('statechange', expect.any(Function))
  expect(serviceRemove).toHaveBeenCalledWith('controllerchange', expect.any(Function))
  expect(registrationRemove).toHaveBeenCalledWith('updatefound', expect.any(Function))
})
