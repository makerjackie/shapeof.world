import { describe, expect, it } from 'vitest'

import { resolveWorldState } from './world-state'

describe('world lifecycle state', () => {
  it('keeps discovery, curation and rights states distinct', () => {
    expect(resolveWorldState({ id: 'seasons', publication: 'public' })).toBe('public')
    expect(resolveWorldState({ id: 'private-draft', publication: 'making' })).toBe('making')
  })
})
