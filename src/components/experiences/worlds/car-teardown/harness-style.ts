/** Thin harness tubes vanish on the dark stage when painted as dark metal. They use light,
 * low-metal insulation with a faint self-glow so the wires read once the car is opened. */
export const HARNESS = {
	trunk: '#8f9ba7',
	branch: '#a3adb7',
	feed: '#eaa95e',
	signal: '#b4c0cb',
	clip: '#c9c3b8',
	glow: 0.32,
	metalness: 0.08,
	roughness: 0.45,
} as const

export function harnessMaterial(color: string) {
	return {
		color,
		emissive: color,
		emissiveIntensity: HARNESS.glow,
		metalness: HARNESS.metalness,
		roughness: HARNESS.roughness,
	}
}
