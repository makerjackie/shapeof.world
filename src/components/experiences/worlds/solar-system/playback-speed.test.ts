import { expect, it } from 'vitest'
import { createSpeedMemory, changePlaybackSpeed } from './playback-speed'

it('restores the user overview speed after close-ups and preserves an adjusted close-up speed', () => {
	const memory = createSpeedMemory()
	expect(changePlaybackSpeed(memory, 100, 'overview')).toBe(100)
	expect(changePlaybackSpeed(memory, 100, 'near')).toBe(0.02)
	expect(changePlaybackSpeed(memory, 0.1, 'overview')).toBe(100)
	expect(changePlaybackSpeed(memory, 100, 'near')).toBe(0.1)
	expect(changePlaybackSpeed(memory, 0.1, 'galaxy')).toBe(100)
	expect(changePlaybackSpeed(memory, 365.25, 'overview')).toBe(100)
	expect(changePlaybackSpeed(memory, 100, 'galaxy')).toBe(365.25)
	expect(createSpeedMemory().speeds.overview).toBe(10)
})
