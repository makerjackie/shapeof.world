import { describe, expect, it } from 'vitest';
import { translateExperienceText } from '~/i18n/experience';
import { cowCells } from './cow-cells';
import { NECK_KG, cuts, primals } from './cow-data';
import { regions } from './CowMap';
import { LIVE_KG, assignFates, guessIsRight, servings, yieldKg, yieldShares } from './yield-model';

describe('from cow to meat', () => {
	it('follows the PB1829 worked example: about 63% carcass and 41% meat', () => {
		const share = yieldShares();
		expect(1 - share.offal).toBeCloseTo(0.629, 3);
		expect(share.meat).toBeCloseTo(0.407, 3);
	});
	it('splits 600 kg into whole kilograms that add back up', () => {
		const kg = yieldKg();
		expect(kg).toEqual({ offal: 223, trim: 133, meat: 244 });
		expect(kg.offal + kg.trim + kg.meat).toBe(LIVE_KG);
	});
	it('only "less than half" is the right guess', () => {
		expect(guessIsRight('less')).toBe(true);
		expect(guessIsRight('half')).toBe(false);
		expect(guessIsRight('most')).toBe(false);
	});
	it('turns 0.5–1 kg of neck into 4–10 dunks at 100–125 g', () => {
		expect(servings(0.5, 1)).toEqual({ low: 4, high: 10 });
	});
	it('scales the 500 kg neck estimate to the 600 kg cow on screen', () => {
		expect(NECK_KG).toEqual({ low: 0.6, high: 1.2, cowKg: LIVE_KG });
		expect(servings(NECK_KG.low, NECK_KG.high)).toEqual({ low: 4, high: 12 });
	});
});

describe('the block cow', () => {
	it('is made of exactly one block per kilogram', () => {
		expect(cowCells).toHaveLength(LIVE_KG);
	});
	it('sends each block to the pile its weight says', () => {
		const fates = assignFates(cowCells);
		const count = (fate: string) => fates.filter((f) => f === fate).length;
		expect({ offal: count('offal'), trim: count('trim'), meat: count('meat') }).toEqual(yieldKg());
	});
	it('takes the head and hooves in the first cut', () => {
		const fates = assignFates(cowCells);
		cowCells.forEach((c, i) => {
			if (c.x < 205 || c.y > 365) expect(fates[i]).toBe('offal');
		});
	});
});

describe('Chaoshan cuts', () => {
	it('places all eleven cuts once on the map', () => {
		expect(new Set(cuts.map((c) => c.atlas.join(','))).size).toBe(11);
		expect(regions.map((r) => r.id).sort()).toEqual(cuts.map((c) => c.id).sort());
	});
	it('counts tongue and tripe with the first cut, not with meat', () => {
		expect(cuts.filter((c) => c.primal === 'offal').map((c) => c.id)).toEqual(['tongue', 'tripe']);
		expect(primals.offal.share).toBeNull();
	});
	it('keeps scoped culinary names instead of western cuts', () => {
		expect(translateExperienceText('en', '吊龙', { 吊龙: 'Diaolong' })).toBe('Diaolong');
	});
});
