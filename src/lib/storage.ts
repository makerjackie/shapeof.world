export type StorageArea = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type SafeStorage = {
  get: (key: string) => string | null
  set: (key: string, value: string) => boolean
  remove: (key: string) => boolean
}

type AnalyticsIdentityOptions = {
  local?: SafeStorage
  session?: SafeStorage
  createId?: (prefix: 'anon' | 'session') => string
}

const anonymousIdKey = 'oneworld.analytics.anonymous.v1'
const sessionIdKey = 'oneworld.analytics.session.v1'
const anonymousIdPattern = /^ow_anon_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sessionIdPattern = /^ow_session_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createSafeStorage(resolveStorage: () => StorageArea | undefined): SafeStorage {
  return {
    get(key) {
      try {
        return resolveStorage()?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    set(key, value) {
      try {
        const storage = resolveStorage()
        if (!storage) return false
        storage.setItem(key, value)
        return true
      } catch {
        return false
      }
    },
    remove(key) {
      try {
        const storage = resolveStorage()
        if (!storage) return false
        storage.removeItem(key)
        return true
      } catch {
        return false
      }
    },
  }
}

export const safeLocalStorage = createSafeStorage(() => {
  if (typeof window === 'undefined') return
  return window.localStorage
})

export const safeSessionStorage = createSafeStorage(() => {
  if (typeof window === 'undefined') return
  return window.sessionStorage
})

function createSecureId(prefix: 'anon' | 'session'): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure random identifiers are unavailable')
  }
  return `ow_${prefix}_${globalThis.crypto.randomUUID()}`
}

function isValidId(value: string | null, prefix: 'anon' | 'session'): value is string {
  return prefix === 'anon'
    ? anonymousIdPattern.test(value ?? '')
    : sessionIdPattern.test(value ?? '')
}

/**
 * Creates a privacy-preserving identity pair. The anonymous id survives browser
 * restarts; the session id lasts only for the current tab session. If storage is
 * blocked, each id remains stable in this provider's in-memory fallback.
 */
export function createAnalyticsIdentity(options: AnalyticsIdentityOptions = {}) {
  const local = options.local ?? safeLocalStorage
  const session = options.session ?? safeSessionStorage
  const createId = options.createId ?? createSecureId
  let memoryAnonymousId: string | undefined
  let memorySessionId: string | undefined

  function getOrCreate(
    storage: SafeStorage,
    key: string,
    prefix: 'anon' | 'session',
    memoryValue: string | undefined,
  ): string {
    if (memoryValue && isValidId(memoryValue, prefix)) return memoryValue

    const stored = storage.get(key)
    if (isValidId(stored, prefix)) return stored

    const created = createId(prefix)
    if (!isValidId(created, prefix)) {
      throw new Error(`Invalid ${prefix} identifier`)
    }
    storage.set(key, created)
    return created
  }

  return {
    getAnonymousId() {
      memoryAnonymousId = getOrCreate(local, anonymousIdKey, 'anon', memoryAnonymousId)
      return memoryAnonymousId
    },
    getSessionId() {
      memorySessionId = getOrCreate(session, sessionIdKey, 'session', memorySessionId)
      return memorySessionId
    },
  }
}

const analyticsIdentity = createAnalyticsIdentity()

export function getAnonymousId(): string {
  return analyticsIdentity.getAnonymousId()
}

export function getSessionId(): string {
  return analyticsIdentity.getSessionId()
}
