/**
 * From a live steer to meat, scaled from one published worked example:
 * University of Tennessee Extension PB1829, as reprinted by UNL BeefWatch (2020):
 * a 1,400 lb steer gives an 880 lb carcass and about 570 lb of trimmed meat
 * (a mix of boneless and bone-in steaks and roasts).
 */
export const SOURCE_LIVE_LB = 1400;
export const SOURCE_CARCASS_LB = 880;
export const SOURCE_MEAT_LB = 570;

/** The cow on screen. */
export const LIVE_KG = 600;
/** The "you" standing beside it, a round adult weight used only for comparison. */
export const PERSON_KG = 60;

export type Fate = 'offal' | 'trim' | 'meat';

/** Share of live weight that ends in each pile. */
export function yieldShares() {
	const carcass = SOURCE_CARCASS_LB / SOURCE_LIVE_LB;
	const meat = SOURCE_MEAT_LB / SOURCE_LIVE_LB;
	return { offal: 1 - carcass, trim: carcass - meat, meat };
}

/** Whole-kilogram piles that always add back up to the live weight. */
export function yieldKg(live = LIVE_KG) {
	const share = yieldShares();
	const offal = Math.round(live * share.offal);
	const meat = Math.round(live * share.meat);
	return { offal, trim: live - offal - meat, meat };
}

export type Guess = 'most' | 'half' | 'less';
export const guesses: ReadonlyArray<{ id: Guess; label: string }> = [
	{ id: 'most', label: '八成以上' },
	{ id: 'half', label: '六成左右' },
	{ id: 'less', label: '不到一半' },
];

export function guessIsRight(guess: Guess, meatShare = yieldShares().meat) {
	if (guess === 'most') return meatShare >= 0.75;
	if (guess === 'half') return meatShare >= 0.5 && meatShare < 0.75;
	return meatShare < 0.5;
}

/** Hotpot servings, using the Chaozhou standard's 100–125 g per dunk. */
export function servings(kgLow: number, kgHigh: number) {
	return { low: Math.floor((kgLow * 1000) / 125), high: Math.floor((kgHigh * 1000) / 100) };
}

export function seeded(index: number, seed: number) {
	const n = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
	return n - Math.floor(n);
}

export type Cell = { x: number; y: number };

/**
 * Decide which block of the cow leaves in which cut. Head, feet, tail and the
 * belly (where the organs sit) go first; bone and fat are taken from the spine
 * and scattered through the body; what is left is meat.
 */
export function assignFates(cells: ReadonlyArray<Cell>, live = LIVE_KG): Array<Fate> {
	const kg = yieldKg(live);
	const total = cells.length;
	const offalCount = Math.round((total * kg.offal) / live);
	const trimCount = Math.round((total * kg.trim) / live);
	const fates: Array<Fate> = cells.map(() => 'meat');
	const offalScore = (c: Cell, i: number) => {
		if (c.x < 205 || c.x > 745 || c.y > 365) return 10 + seeded(i, 1);
		const dx = (c.x - 470) / 150;
		const dy = (c.y - 285) / 70;
		return 4 - Math.hypot(dx, dy) + seeded(i, 2) * 0.4;
	};
	const order = cells.map((c, i) => i).sort((a, b) => offalScore(cells[b], b) - offalScore(cells[a], a));
	order.slice(0, offalCount).forEach((i) => (fates[i] = 'offal'));
	const trimScore = (c: Cell, i: number) => (c.y < 165 ? 0.6 : 0) + seeded(i, 3);
	const rest = order.slice(offalCount).sort((a, b) => trimScore(cells[b], b) - trimScore(cells[a], a));
	rest.slice(0, trimCount).forEach((i) => (fates[i] = 'trim'));
	return fates;
}
