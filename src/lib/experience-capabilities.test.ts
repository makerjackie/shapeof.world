import { describe, expect, it } from 'vitest'

import {
  emptyExperienceCapabilities,
  mergeExperienceCapabilities,
  showFreeControlsEntry,
  showGuidePlayback,
} from './experience-capabilities'

describe('runtime experience capabilities', () => {
  it('starts with nothing mounted', () => {
    expect(mergeExperienceCapabilities([])).toEqual(emptyExperienceCapabilities)
    expect(showGuidePlayback(emptyExperienceCapabilities)).toBe(false)
    expect(showFreeControlsEntry(emptyExperienceCapabilities)).toBe(false)
  })

  it('follows mount and unmount instead of catalog guesses', () => {
    const withGuide = mergeExperienceCapabilities([{ hasGuide: true, canReplayGuide: true }])
    expect(showGuidePlayback(withGuide)).toBe(true)
    expect(showFreeControlsEntry(withGuide)).toBe(false)

    const withFreebar = mergeExperienceCapabilities([{ hasFreeControls: true }])
    expect(showGuidePlayback(withFreebar)).toBe(false)
    expect(showFreeControlsEntry(withFreebar)).toBe(true)

    const both = mergeExperienceCapabilities([
      { hasGuide: true, canReplayGuide: true },
      { hasFreeControls: true },
    ])
    expect(showGuidePlayback(both)).toBe(true)
    expect(showFreeControlsEntry(both)).toBe(true)
  })
})
