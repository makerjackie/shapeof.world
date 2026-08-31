import manifest from './generated/world-artifact-manifest.json'
import type { OfflineWorldRecord, PublicWorldCard, PublicWorldDetail, WorldSearchDocument as CompiledWorldSearchDocument } from './world-compiler/types'
import type { WorldState } from './world-state'
import type { WorldSummary } from './world-summaries'
import type { EvidenceLevel, WorldExperience, WorldSource } from './worlds/types'

export type WorldArtifactManifestCategory = {
  id: string
  count: number
  pageCount: number
}

export type WorldArtifactManifest = {
  schemaVersion: 1
  pageSize: number
  bucketCount: number
  total: number
  pageCount: number
  categories: ReadonlyArray<WorldArtifactManifestCategory>
  fallbackWorlds: ReadonlyArray<WorldSummary>
}

export type WorldCatalogSort = 'recommended' | 'newest' | 'catalogue'

export type WorldArtifact = {
  schemaVersion: 1
  state: WorldState
  world: WorldExperience
  card?: PublicWorldCard
  detail?: PublicWorldDetail
  search?: CompiledWorldSearchDocument
  offline?: OfflineWorldRecord
  sourceCommit?: string
  contentRevision?: string
  releaseId?: string
  navigation?: {
    previousWorldId?: string
    nextWorldId?: string
    randomWorldIds: ReadonlyArray<string>
  }
}

export const worldArtifactManifest = manifest as WorldArtifactManifest

function hashWorldId(worldId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < worldId.length; index += 1) {
    hash ^= worldId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function worldArtifactBucketPath(worldId: string): string {
  const bucket = hashWorldId(worldId) % worldArtifactManifest.bucketCount
  return `/generated/world-artifacts/details/${bucket.toString(16).padStart(2, '0')}.json`
}

export function worldCatalogPagePath(
  page: number,
  categoryId?: string,
  sort: WorldCatalogSort = 'catalogue',
): string {
  const pageFile = `${String(page).padStart(4, '0')}.json`
  return categoryId
    ? `/generated/world-artifacts/pages/categories/${encodeURIComponent(categoryId)}/${sort}/${pageFile}`
    : `/generated/world-artifacts/pages/${sort}/${pageFile}`
}

export function worldSearchIndexPath(locale: 'zh' | 'en'): string {
  return `/generated/world-artifacts/search/${locale}.json`
}

export type WorldSummaryPage = ReadonlyArray<WorldSummary>

export type WorldSearchDocument = {
  text: string
  world: WorldSummary
}

export type HomeBootstrapArtifact = {
  worlds: ReadonlyArray<WorldSummary>
  initialPageIds: ReadonlyArray<string>
  freshWorldIds: ReadonlyArray<string>
}

export type CuratedWorldArtifacts = {
  about: ReadonlyArray<WorldSummary>
  bookshelf: ReadonlyArray<WorldSummary>
}

export type ModelWorldCollection = {
  modelId: string
  count: number
  preview: ReadonlyArray<WorldSummary>
}

export type WorldSourcesArtifact = {
  worldCounts: Record<EvidenceLevel, number>
  worlds: ReadonlyArray<{
    id: string
    title: string
    titleEn: string
    topicLabel: string
    topicLabelEn: string
    evidence: EvidenceLevel
    accent: string
    sources: ReadonlyArray<WorldSource>
  }>
}

export type MakingWorldArtifact = Pick<
  WorldExperience,
  'id' | 'title' | 'poster' | 'posterMobile' | 'primaryCategoryId'
> & {
  translations: { en: Pick<WorldExperience['translations']['en'], 'title'> }
}
