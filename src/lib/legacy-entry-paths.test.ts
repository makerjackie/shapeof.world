import { describe, expect, it } from 'vitest'

import { resolveLegacyEntryHref } from './legacy-entry-paths'

describe('legacy entry paths', () => {
  it('maps old-site sections onto the current homepage', () => {
    expect(resolveLegacyEntryHref('/t')).toBe('/')
    expect(resolveLegacyEntryHref('/lab/')).toBe('/')
    expect(resolveLegacyEntryHref('/history')).toBe('/')
    expect(resolveLegacyEntryHref('/index.html')).toBe('/')
  })

  it('strips leftover /zh prefixes and leaves live /en URLs alone', () => {
    expect(resolveLegacyEntryHref('/zh')).toBe('/')
    expect(resolveLegacyEntryHref('/en/about')).toBeNull()
    expect(
      resolveLegacyEntryHref('/zh/explore/rainbow', '?utm_source=xhs&utm_campaign=rainbow-2026w33'),
    ).toBe('/rainbow?utm_source=xhs&utm_campaign=rainbow-2026w33')
  })

  it('preserves valid destinations and unknown paths under the old Chinese prefix', () => {
    expect(resolveLegacyEntryHref('/zh/category/space')).toBe('/category/space')
    expect(resolveLegacyEntryHref('/zh/bookshelf')).toBeNull()
    expect(resolveLegacyEntryHref('/zh/atlas')).toBeNull()
    expect(resolveLegacyEntryHref('/zh/does-not-exist')).toBeNull()
  })

  it('rewrites the old /w/:id world shortcut', () => {
    expect(resolveLegacyEntryHref('/w/living-earth')).toBe('/global-flight-network')
  })

  it('leaves current routes and unknown junk alone', () => {
    expect(resolveLegacyEntryHref('/')).toBeNull()
    expect(resolveLegacyEntryHref('/explore/ferrofluid')).toBeNull()
    expect(resolveLegacyEntryHref('/reset/private@example.com')).toBeNull()
  })

  it('never points at the v1 host', () => {
    expect(resolveLegacyEntryHref('/t')).not.toContain('v1.')
    expect(resolveLegacyEntryHref('/zh/lab')).not.toContain('v1.')
  })
})
