/**
 * Public, macroscopic effects for a fixed historical exhibit. No height optimiser.
 * Brode and clear-air nomogram adapted from GOFAI/glasstone 0.0.1,
 * 23e1e97d35b45a6e80b8899c86c8ff256fc2217d. MIT; see vendor/glasstone-LICENSE.
 * The upstream thermal function (Soviet 1987) is retained for regression only.
 * The displayed 8 cal/cm² reference now uses the 1977 US textbook Fig.7.42.
 */
export const HIROSHIMA = { longitude: 132.4525, latitude: 34.3947, yieldKt: 16, heightKm: 0.6, version: 'RERF DS02 / RR 7-06' } as const;
export const CITY_PRESETS = [
	{ id: 'hiroshima', name: '广岛 1945', en: 'Hiroshima 1945', yieldKt: 16 },
	{ id: 'modern', name: 'W76-1', en: 'W76-1', yieldKt: 90 },
	{ id: 'megaton', name: 'B83-1', en: 'B83-1', yieldKt: 1200 },
	{ id: 'tsar', name: '沙皇炸弹', en: 'Tsar Bomba', yieldKt: 50000 },
] as const;
export type CityPreset = (typeof CITY_PRESETS)[number];
const THERMAL_X = [
	-0.80410033, -0.6968039, -0.6143937, -0.5257837, -0.4213608, -0.326058, -0.23284414, -0.14691047, -0.041914154, 0.050766293, 0.14426279,
	0.23704077, 0.33725953, 0.43328968, 0.51930285, 0.61267793, 0.7173376, 0.8061121, 0.8985058, 0.9845723, 1.0632958, 1.1452274, 1.2207355,
	1.291724, 1.364926, 1.4221793, 1.4872091, 1.5449605, 1.6022445,
];
const THERMAL_Y = [
	1.988, 3.116, 3.94, 4.938, 6.006, 7.028, 8.016, 8.987, 10.014, 11.009, 12.034, 13.025, 13.995, 15.017, 15.985, 16.95, 17.983, 18.97,
	19.991, 21.005, 21.968, 22.985, 24.034, 25.019, 26.019, 27.07, 28.1, 29.098, 30.099,
];

/** Brode 1986 pp.60–71. Compare 1977 Ch.III Fig.3.73b, not a formula from that figure. */
export function pressurePsi(yieldKt: number, groundKm: number, heightKm: number): number {
	if (![yieldKt, groundKm, heightKm].every(Number.isFinite) || yieldKt <= 0 || groundKm <= 0 || heightKm < 0)
		throw new RangeError('Invalid effects input');
	const z = heightKm / groundKm;
	const y = heightKm / 0.3048 / Math.cbrt(yieldKt);
	const x = groundKm / 0.3048 / Math.cbrt(yieldKt);
	const r = Math.hypot(x, y);
	const a = 1.22 - (3.908 * z ** 2) / (1 + 810.2 * z ** 5);
	const b =
		2.321 + (6.195 * z ** 18) / (1 + 1.113 * z ** 18) - (0.03831 * z ** 17) / (1 + 0.02415 * z ** 17) + 0.6692 / (1 + 4164 * z ** 8);
	const c = 4.153 - (1.149 * z ** 18) / (1 + 1.641 * z ** 18) - 1.1 / (1 + 2.771 * z ** 2.5);
	const d = -4.166 + (25.76 * z ** 1.75) / (1 + 1.382 * z ** 18) + (8.257 * z) / (1 + 3.219 * z);
	const e = 1 - (0.004642 * z ** 18) / (1 + 0.003886 * z ** 18);
	const f = 0.6096 + (2.879 * z ** 9.25) / (1 + 2.359 * z ** 14.5) - (17.5 * z ** 2) / (1 + 71.66 * z ** 3);
	const g = 1.83 + (5.361 * z ** 2) / (1 + 0.3139 * z ** 6);
	const h =
		(8.808 * z ** 1.5) / (1 + 154.5 * z ** 3.5) -
		(0.2905 + 64.67 * z ** 5) / (1 + 441.5 * z ** 5) -
		(1.389 * z) / (1 + 49.03 * z ** 5) +
		(1.094 * r ** 2) / ((781.2 - 123.4 * r + 37.98 * r ** 1.5 + r ** 2) * (1 + 2 * y));
	const j = (0.000629 * y ** 4) / (3.493e-9 + y ** 4) - (2.67 * y ** 2) / (1 + 1e7 * y ** 4.3);
	const k = 5.18 + (0.2803 * y ** 3.5) / (3.788e-6 + y ** 4);
	return 10.47 / r ** a + b / r ** c + (d * e) / (1 + f * r ** g) + h + j / r ** k;
}

/** GOFAI clear-air curve 1, IVC=9; 1987 Iadernoe oruzhie pp.49–50. cal/cm². */
export function thermalCalCm2(yieldKt: number, slantKm: number): number {
	if (!Number.isFinite(yieldKt) || yieldKt <= 0 || !Number.isFinite(slantKm) || slantKm <= 0) throw new RangeError('Invalid thermal input');
	const logRange = Math.log10(slantKm);
	if (logRange < THERMAL_X[0] || logRange > THERMAL_X.at(-1)!) throw new RangeError('Outside thermal nomogram: 0.157–40.016 km');
	let i = 0;
	while (i < THERMAL_X.length - 2 && logRange > THERMAL_X[i + 1]) i++;
	const ordinate = THERMAL_Y[i] + ((THERMAL_Y[i + 1] - THERMAL_Y[i]) * (logRange - THERMAL_X[i])) / (THERMAL_X[i + 1] - THERMAL_X[i]);
	return 10 ** ((ordinate - 12.83 - 5.15 * Math.log10(yieldKt)) / -4.93);
}

/** 1977 Ch.II §2.127: Rmax≈200 W^0.4 feet. Airborne radius, not a ground burn area. */
export function fireballKm(yieldKt: number): number {
	return 0.06096 * yieldKt ** 0.4;
}

/** 1977 Ch.VII Eq.7.96.1, expressed in SI, for independent textbook checks. */
export function radiantExposureCalCm2(yieldKt: number, slantKm: number, partition: number, transmittance: number): number {
	return (yieldKt * 4.184e12 * partition * transmittance) / (4 * Math.PI * (slantKm * 1000) ** 2) / 41840;
}

/** 1977 Ch.VII Fig.7.42, p.291: manually read 8 cal/cm² curve, miles.
 * Cloudless, 12-mile visibility, airburst <=15,000 ft (§§7.42,7.99).
 * Coarse log-log interpolation, ~5% graphical reading tolerance. Only this
 * exhibit's fixed exposure reference; not a general inverse effects API.
 * The printed §7.43 1 Mt / ~7 mi example is held out of these knots.
 */
const BOOK_THERMAL_8 = [
	[1, 0.35],
	[10, 1.1],
	[100, 3],
	[500, 5.5],
	[2000, 9.1],
	[10000, 15],
] as const;
export function textbookThermalSlantKm(yieldKt: number): number | null {
	if (!Number.isFinite(yieldKt) || yieldKt < 1 || yieldKt > 10000) return null;
	const index = BOOK_THERMAL_8.findIndex(([w]) => w >= yieldKt);
	if (index === 0) return BOOK_THERMAL_8[0][1] * 1.609344;
	const [w0, r0] = BOOK_THERMAL_8[index - 1],
		[w1, r1] = BOOK_THERMAL_8[index];
	return r0 * (r1 / r0) ** (Math.log(yieldKt / w0) / Math.log(w1 / w0)) * 1.609344;
}

// Sample outward along a fixed scenario, interpolate the first threshold crossing.
// This is contour construction only; no adjustable location, target or burst-height search.
function contour(sample: (r: number) => number, threshold: number, min: number, max: number) {
	let last = min,
		previous = sample(min);
	for (let i = 1; i <= 4096; i++) {
		const r = min * (max / min) ** (i / 4096);
		const value = sample(r);
		if (value <= threshold && previous > threshold) return last + ((r - last) * (previous - threshold)) / (previous - value);
		last = r;
		previous = value;
	}
	return null;
}

export function cityEffects(preset: CityPreset) {
	const heightKm = HIROSHIMA.heightKm * Math.cbrt(preset.yieldKt / HIROSHIMA.yieldKt);
	const pressure = (r: number) => pressurePsi(preset.yieldKt, r, heightKm);
	const thermalSlant = heightKm <= 4.572 ? textbookThermalSlantKm(preset.yieldKt) : null;
	const thermal = thermalSlant !== null && thermalSlant > heightKm ? Math.sqrt(thermalSlant ** 2 - heightKm ** 2) : null;
	return {
		heightKm,
		fireballKm: fireballKm(preset.yieldKt),
		blast20Km: contour(pressure, 20, 0.05, 150),
		blast5Km: contour(pressure, 5, 0.05, 150),
		blast1Km: contour(pressure, 1, 0.05, 150),
		thermalKm: thermal,
	};
}
