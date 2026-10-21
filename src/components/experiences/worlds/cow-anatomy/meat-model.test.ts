import { translateExperienceText } from '~/i18n/experience';
import { describe, it, expect } from 'vitest';
import { fiberSpan } from './meat-model';
import { cuts, systems } from './cow-data';
import { regions } from './CowMap';
describe('slicing geometry', () => {
	it('shortens parallel fibres when cut across the grain', () => {
		expect(fiberSpan(90, 1.5)).toBeCloseTo(1.5);
		expect(fiberSpan(0, 1.5)).toBeGreaterThan(fiberSpan(90, 1.5));
	});
	it('retains longer fibre segments in thicker cross-grain slices', () => {
		expect(fiberSpan(90, 3)).toBeCloseTo(2 * fiberSpan(90, 1.5));
	});
	it('keeps degenerate inputs finite', () => {
		for (const angle of [NaN, Infinity, -20, 0, 90, 120]) expect(Number.isFinite(fiberSpan(angle, NaN))).toBe(true);
	});
});
describe('atlas coverage and factual distinctions', () => {
	it('maps all eleven cuts once and never reuses an atlas cell', () => {
		expect(new Set(cuts.map((c) => c.id)).size).toBe(11);
		expect(new Set(cuts.map((c) => c.atlas.join(','))).size).toBe(11);
		expect(regions.map((r) => r.id).sort()).toEqual(cuts.map((c) => c.id).sort());
	});
	it('keeps chest fat on a minute scale and tripe distinct from muscle', () => {
		expect(cuts.find((c) => c.id === 'brisket')?.timeLabel).toContain('3–5 分钟');
		expect(cuts.find((c) => c.id === 'tripe')?.standard).toContain('不是外部肌肉');
		expect(systems.find((s) => s.id === 'digestive')?.body).toContain('四室');
	});
});

it('preserves scoped culinary names instead of substituting western cuts', () => {
	expect(translateExperienceText('en', '吊龙', { 吊龙: 'Diaolong' })).toBe('Diaolong');
	expect(translateExperienceText('en', '匙仁', { 匙仁: 'Shiren' })).toBe('Shiren');
});
