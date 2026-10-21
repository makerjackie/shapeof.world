import { useEffect, useState } from 'react'
import { worldArtifactBucketPath, type WorldArtifact } from '~/data/world-artifacts'
import type { WorldSummary } from '~/data/world-summaries'

/** Load only the last public world when it is outside the small home bootstrap. */
export function useResumeWorld(id: string | undefined, publicIds: readonly string[] | undefined,
  worldById: ReadonlyMap<string, WorldSummary>): WorldSummary | undefined {
  const [loaded, setLoaded] = useState<WorldSummary>()
  const eligible = Boolean(id && publicIds?.includes(id))
  const cached = id ? worldById.get(id) : undefined
  useEffect(() => {
    if (!id || !eligible || cached) return
    const controller = new AbortController()
    void fetch(worldArtifactBucketPath(id), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const bucket: Record<string, WorldArtifact> = await response.json()
        if (!controller.signal.aborted && bucket[id]?.state === 'public') setLoaded(bucket[id].world)
      }).catch(() => { /* A failed resume preview must not block discovery. */ })
    return () => controller.abort()
  }, [id, eligible, cached])
  return eligible ? cached ?? (loaded?.id === id ? loaded : undefined) : undefined
}
