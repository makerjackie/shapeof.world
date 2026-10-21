import type { WorldSummary } from '~/data/world-summaries'
import { requestDeadline } from './request-deadline'

export function isWorldSummary(value: unknown): value is WorldSummary {
  if (!value || typeof value !== 'object') return false
  const world = value as WorldSummary
  const copyFields = ['title', 'posterTitle', 'posterHook', 'question', 'topicLabel'] as const
  return typeof world.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(world.id)
    && typeof world.poster === 'string' && typeof world.primaryCategoryId === 'string'
    && Boolean(world.translations?.en)
    && copyFields.every((key) => typeof world[key] === 'string' && typeof world.translations.en[key] === 'string')
    && (world.additionalCategoryIds === undefined || (Array.isArray(world.additionalCategoryIds) && world.additionalCategoryIds.every(id => typeof id === 'string')))
}

export async function fetchWorldJson<T>(path: string, validate: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> {
  const deadline = requestDeadline(15_000, signal)
  try {
    const response = await fetch(path, { headers: { accept: 'application/json' }, signal: deadline.signal })
    if (!response.ok) throw new Error(`World data unavailable: ${response.status}`)
    const value: unknown = await response.json()
    if (!validate(value)) throw new Error('Invalid world data')
    return value
  } finally { deadline.dispose() }
}
