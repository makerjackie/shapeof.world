import { describe, expect, it, vi } from 'vitest'
import { chunkReloadKey, isChunkLoadError, reloadAfterChunkFailure } from './chunk-load-recovery'

describe('chunk load recovery', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/world-old.js',
    'error loading dynamically imported module: /assets/world-old.js',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
    'Loading CSS chunk 12 failed.',
    'Unable to preload CSS for /assets/world-old.css',
  ])('recognizes browser import failures: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true)
  })

  it('does not reload for unrelated render or network errors', () => {
    expect(isChunkLoadError(new Error('WebGL context lost'))).toBe(false)
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })

  it('keeps the once-only guard across page reloads', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } as Storage
    const reload = vi.fn()
    expect(reloadAfterChunkFailure({ sessionStorage: storage, location: { reload } as unknown as Location })).toBe(true)
    expect(values.get(chunkReloadKey)).toBe('1')
    const nextPageReload = vi.fn()
    expect(reloadAfterChunkFailure({ sessionStorage: storage, location: { reload: nextPageReload } as unknown as Location })).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(nextPageReload).not.toHaveBeenCalled()
  })

  it('does not reload when the guard cannot be persisted', () => {
    const reload = vi.fn()
    const target = { sessionStorage: { getItem: () => null, setItem: () => { throw new Error('denied') } } as unknown as Storage, location: { reload } as unknown as Location }
    expect(reloadAfterChunkFailure(target)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
