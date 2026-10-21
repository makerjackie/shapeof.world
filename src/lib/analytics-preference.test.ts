import { describe, expect, it } from 'vitest'
import { createAnalyticsPreference } from './analytics-preference'

describe('analytics opt-out', () => {
  it('honours opting out for this page session even when storage is blocked', () => {
    const preference = createAnalyticsPreference({ get: () => null, set: () => false, remove: () => false })
    expect(preference.setDisabled(true)).toBe(false)
    expect(preference.disabled()).toBe(true)
    preference.setDisabled(false)
    expect(preference.disabled()).toBe(false)
  })
  it('loads an existing choice and persists changes when available', () => {
    let stored = '1'
    const preference = createAnalyticsPreference({ get: () => stored, set: (_key, value) => { stored = value; return true }, remove: () => true })
    expect(preference.disabled()).toBe(true)
    expect(preference.setDisabled(false)).toBe(true)
    expect(stored).toBe('0')
  })
})
