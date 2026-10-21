import { describe, expect, it } from 'vitest';
import { journeyAt, JOURNEY_SECONDS } from './fly-journey';

describe('continuous body-to-brain journey', () => {
	it('opens before turning, then removes every body surface', () => {
		for (let t = 0; t <= JOURNEY_SECONDS; t += 0.05) {
			const p = journeyAt(t);
			expect(p.photoOpacity + p.bodyOpacity + p.brainOpacity).toBeGreaterThan(0.9);
			if (t >= 12) expect(p.bodyOpacity).toBe(0);
			expect(p.cord).toBe(0);
			if (p.turn > 0) expect(p.open).toBe(1);
			expect(p.atlas).toBeLessThanOrEqual(p.brainOpacity);
		}
	});
	it('stays continuous across chapter boundaries and bounds seeking', () => {
		for (const t of [4, 8, 9, 12, 13, 16, 17]) {
			const a = journeyAt(t - 0.001),
				b = journeyAt(t + 0.001);
			for (const key of [
				'spread',
				'headFocus',
				'bodyOpacity',
				'brainOpacity',
				'atlas',
				'cord',
				'open',
				'turn',
				'isolate',
				'action',
			] as const)
				expect(Math.abs(a[key] - b[key])).toBeLessThan(0.002);
		}
		expect(journeyAt(-100)).toEqual(journeyAt(0));
		expect(journeyAt(Number.NaN)).toEqual(journeyAt(0));
		expect(journeyAt(100)).toEqual(journeyAt(JOURNEY_SECONDS));
	});
});
