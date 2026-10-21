import { safeLocalStorage, type SafeStorage } from './storage'

export const analyticsPreferenceKey = 'oneworld.analytics.disabled'
export function createAnalyticsPreference(storage: SafeStorage = safeLocalStorage) {
  let sessionChoice: boolean | undefined
  return {
    disabled: () => sessionChoice ?? storage.get(analyticsPreferenceKey) === '1',
    setDisabled(value: boolean) {
      // Honour the choice immediately even when private browsing/quota blocks storage.
      const saved = storage.set(analyticsPreferenceKey, value ? '1' : '0')
      sessionChoice = saved ? undefined : value
      return saved
    },
  }
}
export const analyticsPreference = createAnalyticsPreference()
