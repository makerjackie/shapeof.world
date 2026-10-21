/** Editorial time and illustrative specimen alignment, never biological time. */
export const JOURNEY_SECONDS = 20;
export const JOURNEY_ANCHORS = [0, 7, 10.5, 14, 20] as const;
export const smooth = (a: number, b: number, value: number) => {
	const t = Math.min(1, Math.max(0, (value - a) / (b - a)));
	return t * t * t * (t * (t * 6 - 15) + 10);
};
export function journeyAt(seconds: number) {
	const t = Number.isFinite(seconds) ? Math.min(JOURNEY_SECONDS, Math.max(0, seconds)) : 0;
	return {
		seconds: t,
		chapter: t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : t < 16 ? 3 : 4,
		spread: smooth(3.6, 7, t),
		structure: smooth(3.3, 5.5, t),
		headFocus: smooth(6, 10, t),
		open: smooth(8, 10.5, t),
		turn: smooth(10.5, 12, t),
		photoOpacity: 1 - smooth(1.4, 3.3, t),
		// An opaque model beneath the fading illustration avoids a dark midpoint.
		bodyOpacity: smooth(0.8, 1.4, t) * (1 - smooth(10.8, 12, t)),
		isolate: smooth(10.8, 12, t),
		action: smooth(16, 18, t),
		brainOpacity: smooth(9, 10.5, t),
		atlas: 0,
		cord: 0,
	};
}
export type JourneyPlayback = { seconds: number; playing: boolean; story: boolean; autoRotate: boolean; reset: number; atlas?: boolean };
