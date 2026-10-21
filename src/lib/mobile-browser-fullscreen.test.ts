// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  canRequestMobileBrowserFullscreen,
  exitMobileBrowserFullscreen,
  requestMobileBrowserFullscreen,
} from './mobile-browser-fullscreen'

const originalMatchMedia = window.matchMedia

function mockMatchMedia({ mobile = true, standalone = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('display-mode') ? standalone : mobile,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function defineDocumentProperty(name: 'fullscreenElement' | 'fullscreenEnabled', value: unknown) {
  Object.defineProperty(document, name, {
    configurable: true,
    value,
  })
}

function defineRootRequest(value: (() => Promise<void>) | undefined) {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value,
  })
}

describe('mobile browser fullscreen', () => {
  beforeEach(() => {
    mockMatchMedia()
    defineDocumentProperty('fullscreenElement', null)
    defineDocumentProperty('fullscreenEnabled', true)
    defineRootRequest(vi.fn().mockResolvedValue(undefined))
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document, 'exitFullscreen')
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
    vi.restoreAllMocks()
  })

  it('only offers browser fullscreen on touch-first, non-standalone devices', () => {
    expect(canRequestMobileBrowserFullscreen()).toBe(true)

    mockMatchMedia({ mobile: false })
    expect(canRequestMobileBrowserFullscreen()).toBe(false)

    mockMatchMedia({ standalone: true })
    expect(canRequestMobileBrowserFullscreen()).toBe(false)
  })

  it('requests hidden navigation UI and succeeds without changing the fallback contract', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    defineRootRequest(requestFullscreen)

    await expect(requestMobileBrowserFullscreen()).resolves.toBe(true)
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' })
  })

  it('treats browser rejection as a normal progressive-enhancement fallback', async () => {
    defineRootRequest(vi.fn().mockRejectedValue(new Error('denied')))

    await expect(requestMobileBrowserFullscreen()).resolves.toBe(false)
  })

  it('exits only when the document root is the active fullscreen element', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })

    await expect(exitMobileBrowserFullscreen()).resolves.toBe(false)
    expect(exitFullscreen).not.toHaveBeenCalled()

    defineDocumentProperty('fullscreenElement', document.documentElement)
    await expect(exitMobileBrowserFullscreen()).resolves.toBe(true)
    expect(exitFullscreen).toHaveBeenCalledOnce()
  })
})
