export type ExperienceCapabilities = {
  hasGuide: boolean
  canReplayGuide: boolean
  hasFreeControls: boolean
  hasWorldAudio: boolean
  supportsImmersive: boolean
}

export const emptyExperienceCapabilities: ExperienceCapabilities = {
  hasGuide: false,
  canReplayGuide: false,
  hasFreeControls: false,
  hasWorldAudio: false,
  supportsImmersive: false,
}

export type ExperienceCapabilityPatch = Partial<ExperienceCapabilities>

export function mergeExperienceCapabilities(
  patches: ReadonlyArray<ExperienceCapabilityPatch>,
): ExperienceCapabilities {
  return patches.reduce<ExperienceCapabilities>(
    (current, patch) => ({
      hasGuide: current.hasGuide || Boolean(patch.hasGuide),
      canReplayGuide: current.canReplayGuide || Boolean(patch.canReplayGuide),
      hasFreeControls: current.hasFreeControls || Boolean(patch.hasFreeControls),
      hasWorldAudio: current.hasWorldAudio || Boolean(patch.hasWorldAudio),
      supportsImmersive: current.supportsImmersive || Boolean(patch.supportsImmersive),
    }),
    emptyExperienceCapabilities,
  )
}

export function showGuidePlayback(capabilities: Pick<ExperienceCapabilities, 'hasGuide'>): boolean {
  return capabilities.hasGuide
}

export function showFreeControlsEntry(
  capabilities: Pick<ExperienceCapabilities, 'hasFreeControls'>,
): boolean {
  return capabilities.hasFreeControls
}
