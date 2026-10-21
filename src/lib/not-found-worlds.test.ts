import { describe, expect, it } from 'vitest'

import { recommendedWorldIds } from '~/data/home-recommended'
import { selectHomeFeaturedIds } from '~/lib/home-featured'
import { selectNotFoundWorldIds } from '~/lib/not-found-worlds'

const available = [...recommendedWorldIds]

describe('404 world suggestions', () => {
  it('offers the weekly home selection for an unknown page', () => {
    expect(selectNotFoundWorldIds(available, '/no-such-page', 3)).toEqual(selectHomeFeaturedIds({ availableIds: available, week: 3 }))
  })

  it('puts a clearly named selected world first for a mistyped world URL', () => {
    for (const path of ['/explore/periodic', '/explore/periodic-tabl', '/en/explore/periodic-tabel']) {
      const ids = selectNotFoundWorldIds(available, path, 3)
      expect(ids[0]).toBe('periodic-table')
      expect(ids).toHaveLength(6)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('does not guess from short or unrelated slugs', () => {
    expect(selectNotFoundWorldIds(available, '/explore/zzzzzz', 3)).toEqual(selectHomeFeaturedIds({ availableIds: available, week: 3 }))
    expect(selectNotFoundWorldIds(available, '/explore/pe', 3)).toEqual(selectHomeFeaturedIds({ availableIds: available, week: 3 }))
  })
})
