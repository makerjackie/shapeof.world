import { describe, expect, it } from 'vitest'

import { failedWorlds } from './failed-worlds'

describe('failure museum', () => {
  it('stays empty after the 2026-10-12 removal', () => {
    expect(failedWorlds).toEqual([])
  })
})
