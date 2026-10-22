/**
 * Eleven items from Chaozhou local standard DB4451/T 9—2024 (beef hotpot),
 * placed on the US primal they sit in. Primal shares are percent of carcass
 * weight, bone in, from University of Tennessee Extension PB1829 (880 lb carcass).
 */
export type Primal = 'offal' | 'chuck' | 'brisket' | 'shank' | 'ribLoin' | 'plateFlank' | 'round';

export const primals: Record<Primal, { label: string; share: number | null }> = {
	offal: { label: '第一刀就被拿走的内脏和头', share: null },
	chuck: { label: '肩颈', share: 26.8 },
	brisket: { label: '前胸', share: 3.8 },
	shank: { label: '前腿腱', share: 3.1 },
	ribLoin: { label: '肋脊和腰脊', share: 26.8 },
	plateFlank: { label: '腹部', share: 13.5 },
	round: { label: '后腿', share: 22.4 },
};

export type Cut = {
	id: string;
	label: string;
	primal: Primal;
	atlas: readonly [number, number];
	texture: string;
	timeLabel: string;
};

export const cuts: Array<Cut> = [
	{ id: 'tongue', label: '牛舌', primal: 'offal', atlas: [0, 0], texture: '细密，略爽脆', timeLabel: '标准示范 15–20 秒' },
	{ id: 'neck', label: '脖仁', primal: 'chuck', atlas: [1, 0], texture: '雪花多，香滑', timeLabel: '标准示范 10–12 秒' },
	{ id: 'chuck-flap', label: '匙仁', primal: 'chuck', atlas: [2, 0], texture: '细嫩多汁', timeLabel: '标准示范 10–12 秒' },
	{ id: 'chuck-tender', label: '匙柄', primal: 'chuck', atlas: [3, 0], texture: '中间一条筋，有嚼劲', timeLabel: '标准示范 10–12 秒' },
	{ id: 'brisket', label: '胸口朥', primal: 'brisket', atlas: [0, 1], texture: '筋脂多，脆', timeLabel: '标准示范 3–5 分钟' },
	{ id: 'front-shank', label: '三花趾', primal: 'shank', atlas: [1, 1], texture: '筋花交织，脆爽', timeLabel: '标准示范 12–15 秒' },
	{ id: 'loin', label: '吊龙', primal: 'ribLoin', atlas: [2, 1], texture: '软嫩，肥瘦相间', timeLabel: '标准示范 10–12 秒' },
	{ id: 'flank', label: '肥胼', primal: 'plateFlank', atlas: [3, 1], texture: '肥瘦层纹，脂香浓', timeLabel: '标准示范 15–20 秒' },
	{ id: 'tender', label: '嫩肉', primal: 'round', atlas: [0, 2], texture: '瘦，嫩而有嚼劲', timeLabel: '标准示范 10–12 秒' },
	{ id: 'hind-shank', label: '五花趾', primal: 'round', atlas: [1, 2], texture: '筋肉相连，弹牙', timeLabel: '标准示范 12–15 秒' },
	{ id: 'tripe', label: '牛百叶', primal: 'offal', atlas: [2, 2], texture: '叶片薄，清脆', timeLabel: '标准示范 8–10 秒' },
];

/** Industry estimate (澎湃号, 2024): a 500 kg cow yields about 0.5–1 kg of 脖仁. */
export const NECK_KG = { low: 0.5, high: 1, cowKg: 500 } as const;
