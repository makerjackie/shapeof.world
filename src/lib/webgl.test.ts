import { afterEach, describe, expect, it, vi } from 'vitest'

import { detectWebglSupport, resetWebglSupportCache, runtimeNeedsWebgl } from './webgl'

afterEach(() => {
  resetWebglSupportCache()
  vi.restoreAllMocks()
})

describe('runtimeNeedsWebgl', () => {
  it('flags every 3D runtime', () => {
    for (const runtime of ['scene-3d', 'globe-3d', 'molecule-3d', 'volume-3d']) {
      expect(runtimeNeedsWebgl(runtime), runtime).toBe(true)
    }
  })

  it('leaves 2D runtimes alone so Canvas2D worlds never hit the fallback', () => {
    for (const runtime of ['diagram-2d', 'particle-2d']) {
      expect(runtimeNeedsWebgl(runtime), runtime).toBe(false)
    }
  })
})

describe('detectWebglSupport', () => {
  it('reports unavailable when no context can be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(detectWebglSupport()).toBe('unavailable')
  })

  it('reports unavailable when the context comes back already lost', () => {
    // DOM typings union WebGL with WebGPU; the probe only needs these three methods.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getParameter: () => 0,
      isContextLost: () => true,
      getExtension: () => null,
    } as never)
    expect(detectWebglSupport()).toBe('unavailable')
  })

  it('reports available for a usable context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getParameter: () => 0,
      isContextLost: () => false,
      getExtension: () => null,
    } as never)
    expect(detectWebglSupport()).toBe('available')
  })

  it('treats a throwing getContext as unavailable rather than crashing the world', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked by policy')
    })
    expect(detectWebglSupport()).toBe('unavailable')
  })

  it('caches the result so the probe runs once per session', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    detectWebglSupport()
    detectWebglSupport()
    detectWebglSupport()
    // First probe tries webgl2 → webgl → experimental-webgl (3 calls); later probes hit the cache.
    expect(getContext).toHaveBeenCalledTimes(3)
  })
})
