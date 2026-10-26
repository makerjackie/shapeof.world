import { describe, expect, it } from 'vitest';
import {
	CITY_PRESETS,
	cityEffects,
	fireballKm,
	pressurePsi,
	radiantExposureCalCm2,
	thermalCalCm2,
	textbookThermalSlantKm,
} from './city-effects';
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
	it('checks the displayed thermal model against the held-out 1977 §7.43 worked example under matching conditions', () => {
		// Fig.7.42: 8 cal/cm², cloudless, visibility 12 mi, H <=15,000 ft.
		const miles = textbookThermalSlantKm(1000)! / 1.609344;
		expect(Math.abs(miles / 7 - 1)).toBeLessThan(0.05);
		expect(miles).toBeCloseTo(7.07460246, 5);
		// Two additional manual readings, not interpolation knots; coarse graph tolerance.
		expect(Math.abs(textbookThermalSlantKm(20)! / 1.609344 / 1.5 - 1)).toBeLessThan(0.05);
		expect(Math.abs(textbookThermalSlantKm(50)! / 1.609344 / 2.2 - 1)).toBeLessThan(0.05);
	});
	it('projects book slant distance onto the map and rejects outside the book domain', () => {
		const hiroshima = cityEffects(CITY_PRESETS[0]);
		expect(Math.hypot(hiroshima.thermalKm!, hiroshima.heightKm)).toBeCloseTo(textbookThermalSlantKm(16)!, 10);
		expect(textbookThermalSlantKm(0.9)).toBeNull();
		expect(textbookThermalSlantKm(50000)).toBeNull();
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
