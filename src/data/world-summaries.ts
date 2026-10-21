import summaries from './generated/world-summaries.json'
import type { WorldExperience, WorldLocalizedCopy } from './worlds/types'

export type WorldSummary = Pick<
  WorldExperience,
  | 'id'
  | 'index'
  | 'poster'
  | 'posterMobile'
  | 'posterDesktop'
  | 'title'
  | 'posterTitle'
  | 'posterHook'
  | 'posterPosition'
  | 'question'
  | 'topicLabel'
  | 'primaryCategoryId'
  | 'additionalCategoryIds'
  | 'renderer'
  | 'runtime'
  | 'difficulty'
  | 'duration'
  | 'evidence'
  | 'accent'
> & {
  translations: {
    en: Pick<WorldLocalizedCopy, 'title' | 'posterTitle' | 'posterHook' | 'question' | 'topicLabel'>
  }
}

export const worldSummaries = summaries as Array<WorldSummary>
export const indexedWorldSummaries = worldSummaries

const summaryById = new Map(worldSummaries.map((world) => [world.id, world]))

export function getPublicWorldSummary(id: string): WorldSummary | undefined {
  return summaryById.get(id)
}
