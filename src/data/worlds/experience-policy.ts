import type {
  WorldEntryMode,
  WorldExperience,
  WorldExperiencePolicy,
  WorldGuideStyle,
  WorldShellMode,
} from './types'

const ENTRY_MODES: ReadonlySet<WorldEntryMode> = new Set(['guided', 'direct', 'autoplay'])
const SHELL_MODES: ReadonlySet<WorldShellMode> = new Set(['standard', 'minimal', 'cinematic'])
const GUIDE_STYLES: ReadonlySet<WorldGuideStyle> = new Set(['story', 'highlights', 'demo'])

export function isWorldExperiencePolicy(value: unknown): value is WorldExperiencePolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (!ENTRY_MODES.has(record.entryMode as WorldEntryMode)) return false
  if (!SHELL_MODES.has(record.shellMode as WorldShellMode)) return false
  if (record.guideStyle !== undefined && !GUIDE_STYLES.has(record.guideStyle as WorldGuideStyle)) {
    return false
  }
  return true
}

export function getWorldExperiencePolicy(
  world: Pick<WorldExperience, 'experiencePolicy'>,
): WorldExperiencePolicy {
  if (!isWorldExperiencePolicy(world.experiencePolicy)) {
    throw new Error('World is missing a valid experiencePolicy')
  }
  return world.experiencePolicy
}

/** Example combinations for authors. Not an enum of allowed works. */
export const exampleExperiencePolicies = {
  causalNarrative: {
    entryMode: 'guided',
    guideStyle: 'story',
    shellMode: 'standard',
  },
  highlightDemo: {
    entryMode: 'guided',
    guideStyle: 'highlights',
    shellMode: 'minimal',
  },
  directExplore: {
    entryMode: 'direct',
    shellMode: 'standard',
  },
  cinematicObserve: {
    entryMode: 'autoplay',
    shellMode: 'cinematic',
  },
} as const satisfies Record<string, WorldExperiencePolicy>
