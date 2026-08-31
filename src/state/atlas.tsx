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
import { getEditorialDayKey } from '~/data/editorial-date'
import { safeLocalStorage, type SafeStorage } from '~/lib/storage'

export type AtlasState = {
  saved: Array<string>
  completed: Array<string>
  visited: Array<string>
  completedIssues: Array<string>
  visitedIssues: Array<string>
  visitDays: Array<string>
  issueCompletionDates: Record<string, string>
}

type AtlasContextValue = AtlasState & {
  ready: boolean
  streak: number
  saveWorld: (id: string) => void
  removeWorld: (id: string) => void
  visitWorld: (id: string) => void
  visitIssue: (id: string) => void
  completeWorld: (id: string) => void
  completeIssue: (issueId: string, worldId: string) => void
  isSaved: (id: string) => boolean
  isComplete: (id: string) => boolean
  isIssueComplete: (id: string) => boolean
}

const storageKey = 'oneworld.atlas.v2'
const legacyStorageKey = 'oneworld.atlas.v1'

const emptyState: AtlasState = {
  saved: [],
  completed: [],
  visited: [],
  completedIssues: [],
  visitedIssues: [],
  visitDays: [],
  issueCompletionDates: {},
}

const AtlasContext = createContext<AtlasContextValue | null>(null)

function freshEmptyState(): AtlasState {
  return {
    saved: [],
    completed: [],
    visited: [],
    completedIssues: [],
    visitedIssues: [],
    visitDays: [],
    issueCompletionDates: {},
  }
}

function todayKey(date = new Date()): string {
  return getEditorialDayKey(date)
}

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
      saved: stringItems(parsed.saved),
      completed: stringItems(parsed.completed),
      visited: stringItems(parsed.visited),
      completedIssues: stringItems(parsed.completedIssues),
      visitedIssues: stringItems(parsed.visitedIssues),
      visitDays: stringItems(parsed.visitDays),
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
): AtlasState {
  const next = update(current)
  storage.set(storageKey, JSON.stringify(next))
  return next
}

function calculateStreak(days: Array<string>, now = new Date()): number {
  const keys = new Set(days)
  let streak = 0
  const [year, month, day] = todayKey(now).split('-').map(Number)
  const currentDayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)

  for (let index = 0; index < 365; index += 1) {
    const key = new Date((currentDayNumber - index) * 86_400_000).toISOString().slice(0, 10)
    if (!keys.has(key)) {
      if (index === 0) continue
      break
    }
    streak += 1
  }
  return streak
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AtlasState>(emptyState)
  const stateRef = useRef<AtlasState>(emptyState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loaded = loadAtlasState()
    stateRef.current = loaded
    setState(loaded)
    setReady(true)
  }, [])

  const updateState = useCallback((update: (current: AtlasState) => AtlasState) => {
    const next = applyPersistedAtlasUpdate(stateRef.current, update)
    stateRef.current = next
    setState(next)
  }, [])

  const updateList = useCallback(
    (
      key: 'saved' | 'completed' | 'visited' | 'completedIssues' | 'visitedIssues',
      id: string,
      event?: Parameters<typeof trackEvent>[0]['event'],
      worldId?: string,
    ) => {
      updateState((current) => ({
        ...current,
        [key]: unique([...(current[key] ?? []), id]),
      }))
      if (event) trackEvent({ event, worldId: worldId ?? id, issueId: worldId ? id : undefined })
    },
    [updateState],
  )

  const value = useMemo<AtlasContextValue>(() => ({
    ...state,
    ready,
    streak: calculateStreak(state.visitDays),
    saveWorld: (id) => updateList('saved', id, 'atlas_save'),
    removeWorld: (id) =>
      updateState((current) => ({
        ...current,
        saved: current.saved.filter((item) => item !== id),
      })),
    visitWorld: (id) =>
      updateState((current) => ({
        ...current,
        visited: unique([...(current.visited ?? []), id]),
        visitDays: unique([...(current.visitDays ?? []), todayKey()]),
      })),
    visitIssue: (id) => updateList('visitedIssues', id),
    completeWorld: (id) => {
      updateState((current) => ({
        ...current,
        completed: unique([...(current.completed ?? []), id]),
        visitDays: unique([...(current.visitDays ?? []), todayKey()]),
      }))
      trackEvent({ event: 'experience_complete', worldId: id })
    },
    completeIssue: (issueId, worldId) => {
      updateState((current) => ({
        ...current,
        completed: unique([...(current.completed ?? []), worldId]),
        completedIssues: unique([...(current.completedIssues ?? []), issueId]),
        visitDays: unique([...(current.visitDays ?? []), todayKey()]),
        issueCompletionDates: current.issueCompletionDates[issueId]
          ? current.issueCompletionDates
          : { ...current.issueCompletionDates, [issueId]: new Date().toISOString() },
      }))
      trackEvent({ event: 'experience_complete', worldId, issueId })
    },
    isSaved: (id) => state.saved.includes(id),
    isComplete: (id) => state.completed.includes(id),
    isIssueComplete: (id) => (state.completedIssues ?? []).includes(id),
  }), [ready, state, updateList, updateState])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}

export function useAtlas(): AtlasContextValue {
  const context = useContext(AtlasContext)
  if (!context) throw new Error('useAtlas must be used within AtlasProvider')
  return context
}

export { calculateStreak }
