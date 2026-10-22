import { LIVE_KG, PERSON_KG, guessIsRight, yieldKg, yieldShares, type Guess } from './yield-model';

type Locale = 'zh' | 'en';
const kg = yieldKg();
const meatPercent = Math.round(yieldShares().meat * 100);
const people = Math.round(kg.meat / PERSON_KG);

const guessEn: Record<Guess, string> = { most: 'more than 80%', half: 'about half', less: 'less than half' };
const guessZh: Record<Guess, string> = { most: '八成以上', half: '一半左右', less: '不到一半' };

/** Sentences that carry numbers. Static labels go through tx(). */
export const copy = {
	firstCut: (l: Locale) =>
		l === 'zh'
			? `第一刀：皮、头、蹄、血和内脏，${kg.offal} kg。`
			: `Cut one: hide, head, feet, blood and organs, ${kg.offal} kg.`,
	secondCut: (l: Locale) =>
		l === 'zh'
			? `第二刀：骨头、肥油、修下的边角和风干掉的水，${kg.trim} kg。`
			: `Cut two: bone, fat, trimmings and water lost while it chills, ${kg.trim} kg.`,
	verdict: (l: Locale, guess: Guess | null) => {
		if (!guess) return '';
		const right = guessIsRight(guess);
		if (l === 'zh') return right ? `你猜「${guessZh[guess]}」，猜对了。` : `你猜「${guessZh[guess]}」，其实没有那么多。`;
		return right ? `You guessed ${guessEn[guess]}. Right.` : `You guessed ${guessEn[guess]}. It is less than that.`;
	},
	result: (l: Locale) =>
		l === 'zh'
			? `${LIVE_KG} kg 的牛，最后只切出约 ${kg.meat} kg 肉，约 ${meatPercent}%。`
			: `A ${LIVE_KG} kg cow ends up as about ${kg.meat} kg of meat, about ${meatPercent}%.`,
	feel: (l: Locale) =>
		l === 'zh'
			? `${kg.meat} kg 肉，差不多是 ${people} 个你（按一个人 ${PERSON_KG} kg 算）。`
			: `${kg.meat} kg of meat weighs about as much as ${people} of you (at ${PERSON_KG} kg each).`,
	pile: (l: Locale, which: 'offal' | 'trim' | 'meat') => {
		const zh = { offal: '皮、头、蹄、血、内脏', trim: '骨头、肥油、水', meat: '肉' }[which];
		const en = { offal: 'Hide, head, guts', trim: 'Bone, fat, water', meat: 'Meat' }[which];
		return `${l === 'zh' ? zh : en} · ${kg[which]} kg`;
	},
	cowLabel: (l: Locale) => (l === 'zh' ? `一头牛 · ${LIVE_KG} kg` : `One cow · ${LIVE_KG} kg`),
	youLabel: (l: Locale) => (l === 'zh' ? `你 · ${PERSON_KG} kg` : `You · ${PERSON_KG} kg`),
	primalShare: (l: Locale, label: string, share: number) =>
		l === 'zh'
			? `长在${label}这一大块里；整块${label}占整片牛（带骨）的 ${share}%。`
			: `It sits in the ${label}; the whole ${label} is ${share}% of the carcass (bone in).`,
	neckAmount: (l: Locale, low: number, high: number, cowKg: number, dunksLow: number, dunksHigh: number) =>
		l === 'zh'
			? `一头 ${cowKg} kg 的牛，脖仁只有约 ${low}–${high} kg，够涮 ${dunksLow}–${dunksHigh} 次。`
			: `A ${cowKg} kg cow has only about ${low}–${high} kg of neck, enough for ${dunksLow}–${dunksHigh} dunks.`,
};
