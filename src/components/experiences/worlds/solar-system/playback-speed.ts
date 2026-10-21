export type SpeedContext = 'overview' | 'near' | 'galaxy'
export function createSpeedMemory() {
	return { context: 'overview' as SpeedContext, speeds: { overview: 10, near: 0.02, galaxy: 100 } }
}
export function changePlaybackSpeed(memory: ReturnType<typeof createSpeedMemory>, current: number, next: SpeedContext) {
	memory.speeds[memory.context] = current
	memory.context = next
	return memory.speeds[next]
}
