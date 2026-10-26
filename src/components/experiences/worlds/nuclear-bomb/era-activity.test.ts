import { describe, expect, it } from 'vitest';
import doe from './doe-events.json';
import { activityFocus, doeSite, markerRadius, siteActivity } from './era-activity';

describe('documented site activity, no national-total allocation', () => {
	it('separates 1962 Nevada and Pacific operating regions without double counting', () => {
		const sites = siteActivity(1962);
		const current = doe.events.filter((e) => e.date.startsWith('1962'));
		expect(current).toHaveLength(98);
		expect(sites.find((s) => s.id === 'nevada')?.annual).toBe(62);
		expect(sites.find((s) => s.id === 'kiritimati')?.annual).toBe(24);
		expect(sites.find((s) => s.id === 'johnston')?.annual).toBe(10);
		expect(current.filter((e) => doeSite(e) === null)).toHaveLength(2); // Frigate Bird, Swordfish: real coordinates only.
	});
	it('counts tests once even when a test contains simultaneous detonations', () => {
		const at1992 = siteActivity(1992).find((s) => s.id === 'nevada')!;
		const records = doe.events.filter((e) => e.location.startsWith('NNSS'));
		expect(at1992.cumulative).toBe(new Set(records.map((e) => e.testNumber)).size);
		expect(at1992.cumulative!).toBeLessThan(records.length);
		expect(siteActivity(1950).find((s) => s.id === 'nevada')?.cumulative).toBe(0);
	});
	it('keeps missing foreign site counts unknown and UK Kiritimati separate', () => {
		expect(siteActivity(1962).find((s) => s.id === 'novaya')?.annual).toBeNull();
		expect(siteActivity(1962).find((s) => s.id === 'novaya')?.cumulative).toBeNull();
		expect(siteActivity(1958).find((s) => s.id === 'kiritimati')?.cumulative).toBe(0);
	});
	it('faces the 1962 US test region, including the Pacific, rather than Asia', () => {
		const focus = activityFocus(1962)!;
		expect(focus.country).toBe('USA');
		expect(focus.lon).toBeGreaterThan(-150);
		expect(focus.lon).toBeLessThan(-120);
		expect(focus.lat).toBeGreaterThan(20);
		expect(activityFocus(2026)).toBeNull();
	});
	it('uses disc area for known counts and a small unknown marker', () => {
		expect(markerRadius(40) ** 2 / markerRadius(10) ** 2).toBeCloseTo(4);
		expect(markerRadius(null)).toBeLessThan(markerRadius(10));
	});
});
