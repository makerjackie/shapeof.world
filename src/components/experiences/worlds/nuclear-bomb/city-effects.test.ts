import { describe, expect, it } from 'vitest';
import { CITY_PRESETS, cityEffects, fireballKm, pressurePsi, radiantExposureCalCm2, thermalCalCm2 } from './city-effects';
import reference from './data/effects-reference.json';

describe('limited public effects, fixed scenarios', () => {
	it.each(reference.pressure)('matches independent upstream Brode output: $yieldKt kt / $rangeKm km', (c) => {
		expect(pressurePsi(c.yieldKt, c.rangeKm, c.heightKm)).toBeCloseTo(c.pressurePsi, 10);
	});
	it.each(reference.thermal)('matches independent upstream clear-air output: $yieldKt kt / $slantKm km', (c) => {
		expect(thermalCalCm2(c.yieldKt, c.slantKm)).toBeCloseTo(c.calCm2, 10);
	});
	it('compares with 1977 p112, Fig.3.73b worked example (50 psi; chart reading tolerance 15%)', () => {
		// The book scales 100 kt / 2320 ft / 1860 ft to 1 kt / 500 ft / 400 ft.
		expect(Math.abs(pressurePsi(1, 400 * 0.0003048, 500 * 0.0003048) / 50 - 1)).toBeLessThan(0.15);
	});
	it('uses the 1977 Ch.II §2.127 fireball law (200 W^0.4 feet)', () => {
		expect(fireballKm(1)).toBeCloseTo(0.06096, 10);
		expect(fireballKm(16)).toBeCloseTo(0.184794, 5);
	});
	it('retains 1977 Ch.VII Eq.7.96.1 energy and area units for independent checks', () => {
		expect(radiantExposureCalCm2(1, 1, 1, 1)).toBeCloseTo(100 / (4 * Math.PI), 10);
		expect(radiantExposureCalCm2(1000, 10, 0.35, 0.7)).toBeCloseTo(19.49648052875718, 10);
	});
	it('preserves the DS02 scenario and reports radius versus area separately', () => {
		const base = cityEffects(CITY_PRESETS[0]),
			mt = cityEffects(CITY_PRESETS[2]);
		expect(base.heightKm).toBe(0.6);
		expect(mt.blast5Km! / base.blast5Km!).toBeCloseTo(Math.cbrt(1200 / 16), 4);
		expect((mt.blast5Km! / base.blast5Km!) ** 2).toBeCloseTo((1200 / 16) ** (2 / 3), 3);
	});
	it('does not extrapolate the thermal graph for the 50 Mt preset', () => {
		expect(cityEffects(CITY_PRESETS[3]).thermalKm).toBeNull();
		expect(() => thermalCalCm2(16, 0.01)).toThrow(RangeError);
		expect(() => thermalCalCm2(16, 41)).toThrow(RangeError);
	});
	it('rejects invalid physical inputs', () => {
		expect(() => pressurePsi(16, 0, 0.6)).toThrow(RangeError);
		expect(() => pressurePsi(NaN, 1, 0.6)).toThrow(RangeError);
		expect(() => thermalCalCm2(16, 0)).toThrow(RangeError);
		expect(() => thermalCalCm2(16, -1)).toThrow(RangeError);
	});
});
