import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { geoContains } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { unzipSync } from 'fflate';
import registration from './fire-registration.json';
import doe from './doe-events.json';
import { ERA_SITES } from './era-sites';

describe('historical geography and evidence precision', () => {
	it('keeps the production archive below 2 MB and discloses its source and LOD', () => {
		const bytes = readFileSync('src/components/experiences/worlds/nuclear-bomb/hiroshima-mvt.zip');
		expect(bytes.length).toBeLessThan(2_000_000);
		const files = unzipSync(bytes),
			m = JSON.parse(new TextDecoder().decode(files['manifest.json']));
		expect(m.source).toBe('Geofabrik chugoku-261025.osm.pbf');
		expect(m.license).toBe('ODbL-1.0');
		expect(m.maxzoom).toBe(13);
	});
	it('records at least eight real bridge correspondences and measured residuals', () => {
		expect(registration.controls.length).toBeGreaterThanOrEqual(8);
		expect(registration.controls.every((c) => c.name.includes('Bridge'))).toBe(true);
		const rmse = Math.sqrt(registration.controls.reduce((s, c) => s + c.residualGroundM ** 2, 0) / registration.controls.length);
		expect(rmse).toBeCloseTo(registration.rmseGroundM, 8);
		expect(registration.leaveOneOutRmseGroundM).toBeGreaterThan(registration.rmseGroundM);
	});
	it('extracts the complete DOE list while preserving the test/detonation distinction', () => {
		expect(doe.events).toHaveLength(1149);
		expect(new Set(doe.events.map((e) => e.testNumber)).size).toBe(1054);
		expect(doe.events.filter((e) => e.coordinates === null)).toHaveLength(1);
		expect(doe.events.filter((e) => e.coordinates).every((e) => e.coordinates![0] !== 0 && e.coordinates![1] !== 0)).toBe(true);
		expect(doe.events.some((e) => e.name === 'Trinity' && e.date === '1945-07-16')).toBe(true);
		expect(doe.events.some((e) => e.name.includes('Hiroshima'))).toBe(false);
	});
	it('uses official China POV geometry for all three requested sample locations', () => {
		const geo = JSON.parse(readFileSync('src/components/experiences/worlds/nuclear-bomb/earth-china.geojson', 'utf8')) as FeatureCollection;
		const china = geo.features.find((f) => f.properties?.ADM0_A3 === 'CHN')!;
		for (const point of [
			[121.5654, 25.033],
			[91.8594, 27.5861],
			[93.6053, 27.0844],
		])
			expect(geoContains(china, point as [number, number])).toBe(true);
	});
	it('keeps non-US site centres rounded instead of jittering national counts', () => {
		expect(
			ERA_SITES.filter((s) => s.country !== 'USA').every(
				(s) => Math.abs(s.lon * 10 - Math.round(s.lon * 10)) < 1e-9 && Math.abs(s.lat * 10 - Math.round(s.lat * 10)) < 1e-9,
			),
		).toBe(true);
	});
});
