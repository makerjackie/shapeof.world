import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { trackEvent } from '~/lib/analytics'
import { safeLocalStorage, type SafeStorage } from '~/lib/storage'

/** Minimal on-device record of what the visitor has opened and finished. */
export type AtlasState = {
  completed: Array<string>
  visited: Array<string>
  lastVisitedWorldId?: string
  completedIssues: Array<string>
  visitedIssues: Array<string>
  issueCompletionDates: Record<string, string>
}

type AtlasContextValue = AtlasState & {
  ready: boolean
  storageAvailable: boolean
  visitWorld: (id: string) => void
  visitIssue: (id: string) => void
  completeWorld: (id: string) => void
  completeIssue: (issueId: string, worldId: string) => void
  isComplete: (id: string) => boolean
  isIssueComplete: (id: string) => boolean
}

export const atlasStorageKey = 'oneworld.atlas.v2'
const storageKey = atlasStorageKey
const legacyStorageKey = 'oneworld.atlas.v1'

const AtlasContext = createContext<AtlasContextValue | null>(null)

function freshEmptyState(): AtlasState {
  return {
    completed: [],
    visited: [],
    completedIssues: [],
    visitedIssues: [],
    issueCompletionDates: {},
  }
}

const emptyState: AtlasState = freshEmptyState()

function unique(items: Array<string>): Array<string> {
  return Array.from(new Set(items))
}

function stringItems(value: unknown): Array<string> {
  return Array.isArray(value) ? unique(value.filter((item): item is string => typeof item === 'string' && item.length <= 100)) : []
}

function completionDates(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([id, date]) => id.length <= 100 && typeof date === 'string' && Number.isFinite(Date.parse(date))))
}

function parseAtlasState(raw: string | null): AtlasState | undefined {
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Partial<AtlasState>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    return {
      completed: stringItems(parsed.completed),
      visited: stringItems(parsed.visited),
      ...(typeof parsed.lastVisitedWorldId === 'string' && /^[a-z0-9-]{1,100}$/.test(parsed.lastVisitedWorldId)
        ? { lastVisitedWorldId: parsed.lastVisitedWorldId } : {}),
      completedIssues: stringItems(parsed.completedIssues),
      visitedIssues: stringItems(parsed.visitedIssues),
      issueCompletionDates: completionDates(parsed.issueCompletionDates),
    }
  } catch {
    return
  }
}

export function loadAtlasState(storage = safeLocalStorage): AtlasState {
  try {
    const current = storage.get(storageKey)
    const legacy = storage.get(legacyStorageKey)
    return parseAtlasState(current)
      ?? parseAtlasState(legacy)
      ?? freshEmptyState()
  } catch {
    return freshEmptyState()
  }
}

export function applyPersistedAtlasUpdate(
  current: AtlasState,
  update: (state: AtlasState) => AtlasState,
  storage: SafeStorage = safeLocalStorage,
  onPersist?: (saved: boolean) => void,
): AtlasState {
  // Callers serialize this read/modify/write with a Web Lock across tabs.
  const latest = parseAtlasState(storage.get(storageKey)) ?? current
  const next = update(latest)
  const saved = storage.set(storageKey, JSON.stringify(next))
  onPersist?.(saved)
  return next
}

export async function serializeAtlasUpdate<T>(operation: () => T, locks: Pick<LockManager, 'request'> | undefined = navigator.locks): Promise<T> {
  if (!locks) throw new Error('Safe shared storage is unavailable')
  return locks.request(storageKey, { mode: 'exclusive' }, operation)
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(emptyState)
  const stateRef = useRef<AtlasState>(emptyState)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [ready, setReady] = useState(false)
  const pendingRef = useRef(Promise.resolve())

  useEffect(() => {
    const loaded = loadAtlasState()
    stateRef.current = loaded
    setState(loaded)
    setReady(true)
    const synchronize = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storageKey) return
      const next = loadAtlasState()
      stateRef.current = next
      setState(next)
    }
    window.addEventListener('storage', synchronize)
    return () => window.removeEventListener('storage', synchronize)
  }, [])

  const persistUpdate = useCallback((update: (current: AtlasState) => AtlasState, requirePersistence = false) => {
    const work = pendingRef.current.then(async () => {
      try {
        await serializeAtlasUpdate(() => {
          let persisted = false
          const next = applyPersistedAtlasUpdate(stateRef.current, update, safeLocalStorage, value => { persisted = value })
          setStorageAvailable(persisted)
          if (!persisted) throw new Error('Atlas storage unavailable')
          stateRef.current = next
          setState(next)
        })
      } catch (error) {
        setStorageAvailable(false)
        if (requirePersistence) throw error
      }
    })
    pendingRef.current = work.catch(() => undefined)
    return work
  }, [])
  const updateState = useCallback((update: (current: AtlasState) => AtlasState) => { void persistUpdate(update) }, [persistUpdate])

  const updateList = useCallback(
    (
      key: 'completed' | 'visited' | 'completedIssues' | 'visitedIssues',
      id: string,
    ) => {
      updateState((current) => ({
        ...current,
        [key]: unique([...(current[key] ?? []), id]),
      }))
    },
    [updateState],
  )

  const value = useMemo<AtlasContextValue>(() => ({
    ...state,
    ready,
    storageAvailable,
    visitWorld: (id) =>
      updateState((current) => ({
        ...current,
        visited: unique([...(current.visited ?? []), id]),
        lastVisitedWorldId: id,
      })),
    visitIssue: (id) => updateList('visitedIssues', id),
    completeWorld: (id) => {
      updateState((current) => ({
        ...current,
        completed: unique([...(current.completed ?? []), id]),
      }))
      trackEvent({ event: 'experience_complete', worldId: id })
    },
    completeIssue: (issueId, worldId) => {
      updateState((current) => ({
        ...current,
        completed: unique([...(current.completed ?? []), worldId]),
        completedIssues: unique([...(current.completedIssues ?? []), issueId]),
        issueCompletionDates: current.issueCompletionDates[issueId]
          ? current.issueCompletionDates
          : { ...current.issueCompletionDates, [issueId]: new Date().toISOString() },
      }))
      trackEvent({ event: 'experience_complete', worldId, issueId })
    },
    isComplete: (id) => state.completed.includes(id),
    isIssueComplete: (id) => (state.completedIssues ?? []).includes(id),
  }), [ready, storageAvailable, state, updateList, updateState])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}

export function useAtlas(): AtlasContextValue {
  const context = useContext(AtlasContext)
  if (!context) throw new Error('useAtlas must be used within AtlasProvider')
  return context
}
