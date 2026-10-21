import { describe, expect, it, vi } from 'vitest'

import {
  createAnalyticsIdentity,
  createSafeStorage,
  type StorageArea,
} from './storage'

function memoryStorage(): StorageArea {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const ids = {
  anon: 'ow_anon_00000000-0000-4000-8000-000000000001',
  session: 'ow_session_00000000-0000-4000-8000-000000000002',
} as const

describe('safe analytics identity storage', () => {
  it('keeps the anonymous and session identities stable in their respective stores', () => {
    const localArea = memoryStorage()
    const sessionArea = memoryStorage()
    const local = createSafeStorage(() => localArea)
    const session = createSafeStorage(() => sessionArea)
    const createId = vi.fn((prefix: 'anon' | 'session') => ids[prefix])
    const identity = createAnalyticsIdentity({ local, session, createId })

    expect(identity.getAnonymousId()).toBe(ids.anon)
    expect(identity.getAnonymousId()).toBe(ids.anon)
    expect(identity.getSessionId()).toBe(ids.session)
    expect(identity.getSessionId()).toBe(ids.session)
    expect(createId).toHaveBeenCalledTimes(2)

    const restored = createAnalyticsIdentity({
      local,
      session,
      createId: () => 'ow_anon_00000000-0000-4000-8000-000000000099',
    })
    expect(restored.getAnonymousId()).toBe(ids.anon)
    expect(restored.getSessionId()).toBe(ids.session)
  })

  it('remains stable in memory when browser storage access is rejected', () => {
    const rejected = createSafeStorage(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })
    const identity = createAnalyticsIdentity({
      local: rejected,
      session: rejected,
      createId: (prefix) => ids[prefix],
    })

    expect(rejected.get('missing')).toBeNull()
    expect(rejected.set('key', 'value')).toBe(false)
    expect(rejected.remove('key')).toBe(false)
    expect(identity.getAnonymousId()).toBe(ids.anon)
    expect(identity.getAnonymousId()).toBe(ids.anon)
    expect(identity.getSessionId()).toBe(ids.session)
    expect(identity.getSessionId()).toBe(ids.session)
  })
})
