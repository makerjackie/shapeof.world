import { describe, expect, it } from 'vitest'

import { legacyArchiveUrl } from './legacy-site'

describe('legacyArchiveUrl', () => {
  it('points a removed world to the same world in the archive', () => {
    expect(legacyArchiveUrl('/explore/heart-beat')).toBe('https://v2.shapeof.world/explore/heart-beat')
    expect(legacyArchiveUrl('/heart-beat')).toBe('https://v2.shapeof.world/explore/heart-beat')
    expect(legacyArchiveUrl('/en/explore/heart-beat/')).toBe('https://v2.shapeof.world/en/explore/heart-beat')
    expect(legacyArchiveUrl('/en/heart-beat')).toBe('https://v2.shapeof.world/en/explore/heart-beat')
  })

  it('ignores paths that never named a world there', () => {
    expect(legacyArchiveUrl('/no-such-world')).toBeNull()
    expect(legacyArchiveUrl('/explore/heart-beat/extra')).toBeNull()
    expect(legacyArchiveUrl('/category/physics')).toBeNull()
  })
})
