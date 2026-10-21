import { useCallback, useEffect, useMemo, useState } from 'react'
import { recommendedWorldIds } from '~/data/home-recommended'

let explorationRequest: Promise<ReadonlyArray<string>> | undefined

export function loadExplorationIds(): Promise<ReadonlyArray<string>> {
  if (!explorationRequest) {
    explorationRequest = fetch('/generated/world-artifacts/exploration.json', {
      headers: { accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Exploration request failed: ${response.status}`)
      const ids: unknown = await response.json()
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && id.length > 0)) {
        throw new Error('Invalid exploration index')
      }
      return [...new Set(ids)] as ReadonlyArray<string>
    }).catch((error: unknown) => {
      explorationRequest = undefined
      throw error
    })
  }
  return explorationRequest
}

export function selectUnvisitedId(
  ids: ReadonlyArray<string>,
  visited: ReadonlyArray<string>,
  currentId?: string,
): string | undefined {
  const seen = new Set(visited)
  const remaining = ids.filter((id) => id !== currentId && !seen.has(id))
  const candidates = remaining.length > 0 ? remaining : ids.filter((id) => id !== currentId)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function useExploration(enabled: boolean, visited: ReadonlyArray<string>, currentId: string, scope: 'all' | 'featured' = 'all') {
  const [publicIds, setPublicIds] = useState<ReadonlyArray<string>>([])
  const ids = useMemo(() => scope === 'featured'
    ? recommendedWorldIds.filter((id) => publicIds.includes(id)) : publicIds, [scope, publicIds])
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let active = true
    setError(false)
    void loadExplorationIds().then((result) => {
      if (active) {
        setPublicIds(result)
        setReady(true)
      }
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [enabled, attempt])
  const nextId = useMemo(() => selectUnvisitedId(ids, visited, currentId), [ids, visited, currentId])
  const complete = ids.length > 0 && ids.every((id) => id === currentId || visited.includes(id))
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { ids, nextId, complete, error, ready, retry }
}
