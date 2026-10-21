import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isSiteSearchShortcut } from '~/lib/site-search-shortcut'

const source = readFileSync(resolve(import.meta.dirname, 'SiteSearch.tsx'), 'utf8')

describe('site search policy', () => {
  it('opens from the requested Ctrl K shortcut and the conventional macOS shortcut', () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      isComposing: false,
      key: 'k',
      metaKey: false,
      shiftKey: false,
    }
    expect(isSiteSearchShortcut(event)).toBe(true)
    expect(isSiteSearchShortcut({ ...event, ctrlKey: false, metaKey: true, key: 'K' })).toBe(true)
    expect(isSiteSearchShortcut({ ...event, isComposing: true })).toBe(false)
    expect(isSiteSearchShortcut({ ...event, key: 'j' })).toBe(false)
  })

  it('loads the existing public search index only through the shared artifact path', () => {
    expect(source).toContain('useWorldSearchIndex(locale, open)')
    expect(source).toContain('worldMatchesSearch(document.world, normalizedQuery)')
    expect(source).not.toContain('worldSummaries as worlds')
  })

  it('uses a modal dialog with focus entry, focus return, and Escape handled natively', () => {
    expect(source).toContain('dialog.showModal()')
    expect(source).toContain('inputRef.current?.focus()')
    expect(source).toContain('previousFocusRef.current')
    expect(source).toContain('onClose={restorePreviousFocus}')
    expect(source).toContain("event.key !== 'Escape'")
  })

  it('routes full searches back to the complete home catalogue', () => {
    expect(source).toContain("hash: 'home-worlds'")
    expect(source).toContain('q: normalized')
    expect(source).toContain("event.key !== 'Enter' || event.nativeEvent.isComposing")
  })
})
