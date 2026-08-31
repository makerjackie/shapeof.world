import type { AiModelId } from '../ai-models'
import type { CategoryId } from '../content-graph/types'

/** Renderer ids retained for catalog records that are archived. */
export type ArchivedWorldRenderer = never

/** Renderer ids are discovered from files; registry/catalog integrity tests enforce the runtime contract. */
export type WorldRenderer = string

export type EvidenceLevel = 'live' | 'verified' | 'compiled' | 'modeled'

export type WorldRuntime = 'diagram-2d' | 'particle-2d' | 'scene-3d' | 'globe-3d' | 'molecule-3d' | 'volume-3d'

export type WorldDifficulty = 'intro' | 'standard' | 'advanced'

export type WorldLane = 'live' | 'structure' | 'flow' | 'time'

export type WorldPublication = 'public' | 'making'

export type WorldAudioPolicy = 'world-owned'

/** How a World starts. These are operational, not a closed creative taxonomy. */
export type WorldEntryMode = 'guided' | 'direct' | 'autoplay'

/** How much shared chrome the shell should show by default. */
export type WorldShellMode = 'standard' | 'minimal' | 'cinematic'

/**
 * Optional Guide presentation when `entryMode` is `guided`.
 * Combinations of these fields are examples, not a type list.
 */
export type WorldGuideStyle = 'story' | 'highlights' | 'demo'

export type WorldExperiencePolicy = {
  entryMode: WorldEntryMode
  shellMode: WorldShellMode
  guideStyle?: WorldGuideStyle
}

export type WorldSource = {
  label: string
  labelEn: string
  url: string
  /** One line on how this source is used in the world. Shown in the ⓘ drawer. */
  note?: string
  noteEn?: string
}

export type WorldFieldNote = {
  label: string
  labelEn: string
  body: string
  bodyEn: string
}

export type WorldProvenance =
  | {
      origin: 'ai-prototype'
      initialModel: AiModelId
    }
  | {
      origin: 'multi-model'
      initialModel?: AiModelId
    }
  | {
      origin: 'open-source-adaptation'
      sourceProject: string
      sourceUrl: string
      /** Model that built the Shape of the World adaptation, without replacing upstream authorship. */
      adaptationModel?: AiModelId
    }
  | {
      origin: 'human-led'
    }

export type WorldLocalizedCopy = {
  title: string
  posterTitle: string
  posterHook: string
  posterSource: string
  question: string
  hook: string
  payoff: string
  topicLabel: string
}

export type WorldExperience = {
  id: string
  /**
   * Display ordinal assigned at runtime. Catalogue sources may omit it;
   * do not allocate a global serial number when adding a world.
   */
  index?: string
  title: string
  poster: string
  posterMobile?: string
  posterDesktop?: string
  posterTitle: string
  posterHook: string
  posterSource: string
  posterPosition?: string
  question: string
  hook: string
  payoff: string
  topicLabel: string
  /** Omitted publication status defaults to making; public release must be explicit. */
  publication?: WorldPublication
  /** Omitted audio policy uses the shared default bed. */
  audioPolicy?: WorldAudioPolicy
  translations: {
    en: WorldLocalizedCopy
  }
  /** Primary Category supplies the stable breadcrumb and root browse location. */
  primaryCategoryId: CategoryId
  /** Optional additional browse locations; order has no editorial meaning. */
  additionalCategoryIds?: ReadonlyArray<CategoryId>
  runtime: WorldRuntime
  difficulty: WorldDifficulty
  lane: WorldLane
  renderer: WorldRenderer
  duration: number
  evidence: EvidenceLevel
  accent: string
  related: Array<string>
  sources: Array<WorldSource>
  /**
   * Optional longer reading for the ⓘ drawer. Hook stays short; payoff stays
   * the takeaway. Each note is one labelled paragraph.
   */
  fieldNotes?: ReadonlyArray<WorldFieldNote>
  /**
   * Runtime behaviour for entry and chrome. Does not classify the work as
   * a story, atlas, game, film, or any other closed creative type.
   */
  experiencePolicy: WorldExperiencePolicy
  /** Optional origin record when the world has a documented source. */
  provenance?: WorldProvenance
  presentation: 'full-bleed'
  /** @deprecated Legacy shell coachmarks were removed. New worlds should omit this. */
  onboardingVersion?: number
  transferBudgetMb: number
  fallback: 'poster' | 'text'
  /** @deprecated GuideTour is discovered from the renderer and no longer needs catalogue metadata. */
  hasEmbeddedGuide?: boolean
}

export function getWorldPublication(world: Pick<WorldExperience, 'publication'>): WorldPublication {
  return world.publication ?? 'making'
}

export function isPublicWorld(world: Pick<WorldExperience, 'publication'>): boolean {
  return getWorldPublication(world) === 'public'
}
