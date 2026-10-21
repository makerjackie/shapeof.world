import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScopedRuntime } from './runtime'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren() })

function fixture() {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  const root = host.attachShadow({ mode: 'open' })
  const body = document.createElement('div')
  body.innerHTML = '<button id="private-button">Test</button>'
  root.append(body)
  return { root, ...createScopedRuntime(root, body, value => value) }
}

describe('scoped renderer lifecycle', () => {
  it('isolates DOM queries, exports and chapter navigation from the site', () => {
    const { environment: env, dispose } = fixture()
    const url = window.location.href, state = window.history.state
    expect(env.document.getElementById('private-button')).toBeTruthy()
    expect(document.getElementById('private-button')).toBeNull()
    env.window.TEST_EXPORT = { ready: true }
    expect(Reflect.get(window, 'TEST_EXPORT')).toBeUndefined()
    env.history.replaceState(null, '', '#river')
    expect(env.location.hash).toBe('#river')
    expect(window.location.href).toBe(url)
    expect(window.history.state).toBe(state)
    dispose()
  })
  it('removes listeners, animation callbacks and timers before a second entry', () => {
    vi.useFakeTimers()
    const { environment: env, dispose, root } = fixture()
    const callback = vi.fn()
    ;(env.window.addEventListener as typeof window.addEventListener)('resize', callback)
    env.document.addEventListener('click', callback)
    env.setTimeout(callback, 40)
    env.setInterval(callback, 40)
    env.requestAnimationFrame(callback)
    dispose(); dispose()
    window.dispatchEvent(new Event('resize'))
    root.dispatchEvent(new Event('click'))
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
    expect(root.childNodes).toHaveLength(0)
    const second = fixture()
    expect(second.environment.document.getElementById('private-button')).toBeTruthy()
    second.dispose()
  })
})
