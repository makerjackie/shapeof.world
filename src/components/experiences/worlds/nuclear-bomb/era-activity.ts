import doe from './doe-events.json';
import { ERA_SITES } from './era-sites';
import { HISTORY_DATA, observationAt } from './history-data';

type Event = (typeof doe.events)[number];

/** Only documented DOE location labels or bounded island operating regions.
 * Offshore shots stay at their published coordinates in the point layer.
 * Uncovered locations are not assigned to the nearest site. */
export function doeSite(event: Event): string | null {
	if (event.location.startsWith('NNSS')) return 'nevada';
	if (event.location === 'Bikini Atoll') return 'bikini';
	if (event.location === 'Enewetak Atoll') return 'enewetak';
	if (event.testNumber === 1) return 'trinity';
	if (event.location === 'Island area' && event.coordinates) {
		const [lon, lat] = event.coordinates;
		if (lon >= -160 && lon <= -155 && lat >= 0 && lat <= 3) return 'kiritimati';
		if (lon >= -175 && lon <= -165 && lat >= 10 && lat <= 20) return 'johnston';
	}
	return null;
}

const records = ERA_SITES.map((site) => doe.events.filter((event) => doeSite(event) === site.id));
export function siteActivity(year: number) {
	return ERA_SITES.map((site, i) => {
		const known = site.country === 'USA' || site.id === 'kiritimati';
		const before = records[i].filter((e) => Number(e.date.slice(0, 4)) <= year);
		const annual = before.filter((e) => Number(e.date.slice(0, 4)) === year);
		return {
			...site,
			// Kiritimati also hosted UK tests: these counts explicitly cover DOE US records only.
			countCountry: known ? 'USA' : site.country,
			annual: known ? new Set(annual.map((e) => e.testNumber)).size : null,
			cumulative: known ? new Set(before.map((e) => e.testNumber)).size : null,
		};
	});
}

function sphericalMean(points: Array<{ lon: number; lat: number }>) {
	const v = points.reduce(
		(s, p) => {
			const lon = (p.lon * Math.PI) / 180,
				lat = (p.lat * Math.PI) / 180;
			return [s[0] + Math.cos(lat) * Math.cos(lon), s[1] + Math.sin(lat), s[2] + Math.cos(lat) * Math.sin(lon)];
		},
		[0, 0, 0],
	);
	return { lon: (Math.atan2(v[2], v[0]) * 180) / Math.PI, lat: (Math.atan2(v[1], Math.hypot(v[0], v[2])) * 180) / Math.PI };
}

/** Country rank is OWID. US focus is the centroid of that year's published DOE
 * coordinates (one position per distinct test); elsewhere only a site overview. */
export function activityFocus(year: number) {
	const row = observationAt(HISTORY_DATA.tests, year);
	if (!row) return null;
	const values = row[1];
	const largest = Math.max(...values.map((v) => v ?? 0));
	if (!largest) return null;
	const country = HISTORY_DATA.tests.countries[values.indexOf(largest)].code;
	if (country === 'USA') {
		const seen = new Set<number>();
		const points = doe.events.flatMap((e) => {
			if (!e.coordinates || Number(e.date.slice(0, 4)) !== year || seen.has(e.testNumber)) return [];
			seen.add(e.testNumber);
			return [{ lon: e.coordinates[0], lat: e.coordinates[1] }];
		});
		if (points.length) return { ...sphericalMean(points), country, precision: 'events' as const };
	}
	const sites = ERA_SITES.filter((s) => s.country === country && s.start <= year && s.end >= year);
	return sites.length ? { ...sphericalMean(sites), country, precision: 'sites' as const } : null;
}

/** Marker disc area is proportional to known annual counts; unknown ≠ zero. */
export function markerRadius(count: number | null) {
	return count === null || count === 0 ? 0.028 : 0.022 * Math.sqrt(count);
}
