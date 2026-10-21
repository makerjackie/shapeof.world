import type { WorldArtifact } from '~/data/world-artifacts'
import type { WorldSummary } from '~/data/world-summaries'

/** A local card projection for an explicitly requested experiment, never a public index. */
export function experimentalPathSummary(artifact: WorldArtifact | undefined): WorldSummary | undefined {
  if (!artifact || !['public', 'making'].includes(artifact.state)) return undefined
  const w = artifact.world
  return {
    id: w.id, index: w.index, poster: w.poster, posterMobile: w.posterMobile,
    posterDesktop: w.posterDesktop, title: w.title, posterTitle: w.posterTitle,
    posterHook: w.posterHook, posterPosition: w.posterPosition, question: w.question,
    topicLabel: w.topicLabel, primaryCategoryId: w.primaryCategoryId,
    additionalCategoryIds: w.additionalCategoryIds, renderer: w.renderer,
    runtime: w.runtime, difficulty: w.difficulty, duration: w.duration,
    evidence: w.evidence, accent: w.accent,
    translations: { en: {
      title: w.translations.en.title, posterTitle: w.translations.en.posterTitle,
      posterHook: w.translations.en.posterHook, question: w.translations.en.question,
      topicLabel: w.translations.en.topicLabel,
    } },
  }
}
