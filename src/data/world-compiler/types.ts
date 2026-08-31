import type { WorldState } from '../world-state'
import type { EvidenceLevel, WorldExperiencePolicy, WorldFieldNote, WorldRuntime, WorldSource } from '../worlds/types'

export type RuntimeCapability =
  | 'canvas-2d'
  | 'webgl'
  | 'three'
  | 'cesium'
  | 'maplibre'
  | 'audio'
  | 'wasm'
  | 'worker'

export type WorldLifecycle =
  | { state: 'making' }
  | { state: 'public'; publishedAt?: string }
  | { state: 'failed'; reasonCode: string }
  | { state: 'archived'; reasonCode: string; replacementId?: string }
  | { state: 'rights-blocked'; reasonCode: string }

export type LocalizedCopy = {
  zh: {
    title: string
    posterTitle: string
    posterHook: string
    question: string
    hook: string
    payoff: string
    topicLabel: string
  }
  en: {
    title: string
    posterTitle: string
    posterHook: string
    question: string
    hook: string
    payoff: string
    topicLabel: string
  }
}

export type CompileProvenance = {
  schemaVersion: 1
  sourceCommit: string
  contentRevision: string
  releaseId: string
}

export type WorldIR = CompileProvenance & {
  id: string
  adapter: 'pilot' | 'legacy'
  lifecycle: WorldLifecycle
  copy: LocalizedCopy
  taxonomy: {
    primaryCategoryId: string
    additionalCategoryIds: ReadonlyArray<string>
  }
  runtime: {
    profile: WorldRuntime
    renderer: string
    capabilities: ReadonlyArray<RuntimeCapability>
  }
  assets: {
    poster: string
    posterMobile?: string
    posterDesktop?: string
    sources: ReadonlyArray<WorldSource>
    offline: ReadonlyArray<string>
  }
  related: ReadonlyArray<string>
  fieldNotes: ReadonlyArray<WorldFieldNote>
  evidence: EvidenceLevel
  accent: string
  duration: number
  experiencePolicy?: WorldExperiencePolicy
}

export type PublicWorldCard = CompileProvenance & {
  id: string
  state: WorldState
  title: string
  titleEn: string
  poster: string
  posterMobile?: string
  posterDesktop?: string
  posterHook: string
  posterHookEn: string
  question: string
  questionEn: string
  topicLabel: string
  topicLabelEn: string
  primaryCategoryId: string
  runtime: WorldRuntime
  evidence: EvidenceLevel
  accent: string
}

export type PublicWorldDetail = PublicWorldCard & {
  hook: string
  hookEn: string
  payoff: string
  payoffEn: string
  related: ReadonlyArray<string>
  sources: ReadonlyArray<WorldSource>
  fieldNotes: ReadonlyArray<WorldFieldNote>
  renderer: string
  duration: number
  additionalCategoryIds: ReadonlyArray<string>
}

export type WorldSearchDocument = CompileProvenance & {
  text: string
  world: PublicWorldCard
}

export type OfflineWorldRecord = CompileProvenance & {
  id: string
  packId?: string
  renderer: string
  runtime: WorldRuntime
  capabilities: ReadonlyArray<RuntimeCapability>
  offlineAssets: ReadonlyArray<string>
  title: { zh: string; en: string }
  summary: { zh: string; en: string }
}
