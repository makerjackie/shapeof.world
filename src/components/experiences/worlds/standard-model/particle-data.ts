// Standard Model factual dataset, cross-checked against PDG and CERN public pages.
// Masses are displayed in natural units for each particle; see catalog sources.

export type ParticleId =
	| 'u' | 'd' | 'c' | 's' | 't' | 'b'
	| 'e' | 'mu' | 'tau' | 've' | 'vmu' | 'vtau'
	| 'gamma' | 'gluon' | 'w' | 'z' | 'higgs'

export type ParticleFamily = 'quark' | 'lepton' | 'gauge' | 'scalar'

export type SceneKind =
	| 'proton'        // u d — three-quark dance inside a proton, pull interaction
	| 'meson'         // c s b — quark–antiquark pair, pull interaction
	| 'top-decay'     // t — appears and decays before it can bind
	| 'atom'          // e — electron cloud in hydrogen
	| 'cosmic'        // mu — cosmic-ray muon reaching the ground
	| 'tau-shower'    // tau — the shortest-lived lepton
	| 'oscillation'   // ve vmu vtau — flavour morphing in flight
	| 'photon-wave'   // gamma — light as the electromagnetic messenger
	| 'flux-tube'     // gluon — colour exchange between quarks
	| 'beta-decay'    // w — neutron beta decay through a virtual W
	| 'z-exchange'    // z — the neutral current
	| 'higgs-field'   // higgs — mass from a crowded field

export interface Particle {
	id: ParticleId
	symbol: string
	name: string
	nameEn: string
	family: ParticleFamily
	/** 1–3 for matter particles, 0 for bosons. */
	generation: 1 | 2 | 3 | 0
	role: string
	roleEn: string
	massLabel: string
	massLabelEn: string
	charge: string
	spin: string
	/** Year of experimental discovery (or of the quark-model confirmation for u d s). */
	year: number
	scene: SceneKind
	/** Entertainment rating only — not rarity or scientific value. */
	rating: number
	col: number
	row: number
	rowSpan?: number
}

export const familyInfo: Record<ParticleFamily, { label: string; labelEn: string; color: string }> = {
	quark: { label: '夸克', labelEn: 'Quarks', color: '#b0703c' },
	lepton: { label: '轻子', labelEn: 'Leptons', color: '#4e8970' },
	gauge: { label: '规范玻色子', labelEn: 'Gauge bosons', color: '#4a81b0' },
	scalar: { label: '标量玻色子', labelEn: 'Scalar boson', color: '#ad8439' },
}

export const particles: Particle[] = [
	{ id: 'u', symbol: 'u', name: '上夸克', nameEn: 'Up quark', family: 'quark', generation: 1, role: '上型夸克', roleEn: 'Up-type quark', massLabel: '≈ 2.16 MeV', massLabelEn: '≈ 2.16 MeV', charge: '+2/3', spin: '1/2', year: 1968, scene: 'proton', rating: 4, col: 2, row: 1 },
	{ id: 'd', symbol: 'd', name: '下夸克', nameEn: 'Down quark', family: 'quark', generation: 1, role: '下型夸克', roleEn: 'Down-type quark', massLabel: '≈ 4.70 MeV', massLabelEn: '≈ 4.70 MeV', charge: '−1/3', spin: '1/2', year: 1968, scene: 'proton', rating: 4, col: 2, row: 2 },
	{ id: 'c', symbol: 'c', name: '粲夸克', nameEn: 'Charm quark', family: 'quark', generation: 2, role: '上型夸克', roleEn: 'Up-type quark', massLabel: '≈ 1.27 GeV', massLabelEn: '≈ 1.27 GeV', charge: '+2/3', spin: '1/2', year: 1974, scene: 'meson', rating: 3, col: 3, row: 1 },
	{ id: 's', symbol: 's', name: '奇夸克', nameEn: 'Strange quark', family: 'quark', generation: 2, role: '下型夸克', roleEn: 'Down-type quark', massLabel: '≈ 93.5 MeV', massLabelEn: '≈ 93.5 MeV', charge: '−1/3', spin: '1/2', year: 1968, scene: 'meson', rating: 2, col: 3, row: 2 },
	{ id: 't', symbol: 't', name: '顶夸克', nameEn: 'Top quark', family: 'quark', generation: 3, role: '上型夸克', roleEn: 'Up-type quark', massLabel: '≈ 172.6 GeV', massLabelEn: '≈ 172.6 GeV', charge: '+2/3', spin: '1/2', year: 1995, scene: 'top-decay', rating: 5, col: 4, row: 1 },
	{ id: 'b', symbol: 'b', name: '底夸克', nameEn: 'Bottom quark', family: 'quark', generation: 3, role: '下型夸克', roleEn: 'Down-type quark', massLabel: '≈ 4.18 GeV', massLabelEn: '≈ 4.18 GeV', charge: '−1/3', spin: '1/2', year: 1977, scene: 'meson', rating: 3, col: 4, row: 2 },
	{ id: 'e', symbol: 'e', name: '电子', nameEn: 'Electron', family: 'lepton', generation: 1, role: '带电轻子', roleEn: 'Charged lepton', massLabel: '0.511 MeV', massLabelEn: '0.511 MeV', charge: '−1', spin: '1/2', year: 1897, scene: 'atom', rating: 5, col: 2, row: 3 },
	{ id: 'mu', symbol: 'μ', name: 'μ 子', nameEn: 'Muon', family: 'lepton', generation: 2, role: '带电轻子', roleEn: 'Charged lepton', massLabel: '105.66 MeV', massLabelEn: '105.66 MeV', charge: '−1', spin: '1/2', year: 1936, scene: 'cosmic', rating: 3, col: 3, row: 3 },
	{ id: 'tau', symbol: 'τ', name: 'τ 子', nameEn: 'Tau', family: 'lepton', generation: 3, role: '带电轻子', roleEn: 'Charged lepton', massLabel: '1776.9 MeV', massLabelEn: '1776.9 MeV', charge: '−1', spin: '1/2', year: 1975, scene: 'tau-shower', rating: 4, col: 4, row: 3 },
	{ id: 've', symbol: 'νe', name: '电子中微子', nameEn: 'Electron neutrino', family: 'lepton', generation: 1, role: '中微子', roleEn: 'Neutrino', massLabel: '味态，非单一质量', massLabelEn: 'Flavour state; no single mass', charge: '0', spin: '1/2', year: 1956, scene: 'oscillation', rating: 3, col: 2, row: 4 },
	{ id: 'vmu', symbol: 'νμ', name: 'μ 中微子', nameEn: 'Muon neutrino', family: 'lepton', generation: 2, role: '中微子', roleEn: 'Neutrino', massLabel: '味态，非单一质量', massLabelEn: 'Flavour state; no single mass', charge: '0', spin: '1/2', year: 1962, scene: 'oscillation', rating: 2, col: 3, row: 4 },
	{ id: 'vtau', symbol: 'ντ', name: 'τ 中微子', nameEn: 'Tau neutrino', family: 'lepton', generation: 3, role: '中微子', roleEn: 'Neutrino', massLabel: '味态，非单一质量', massLabelEn: 'Flavour state; no single mass', charge: '0', spin: '1/2', year: 2000, scene: 'oscillation', rating: 2, col: 4, row: 4 },
	{ id: 'gamma', symbol: 'γ', name: '光子', nameEn: 'Photon', family: 'gauge', generation: 0, role: '电磁力的载体', roleEn: 'Carrier of electromagnetism', massLabel: '0', massLabelEn: '0', charge: '0', spin: '1', year: 1923, scene: 'photon-wave', rating: 5, col: 5, row: 1 },
	{ id: 'gluon', symbol: 'g', name: '胶子', nameEn: 'Gluon', family: 'gauge', generation: 0, role: '强力的载体', roleEn: 'Carrier of the strong force', massLabel: '0', massLabelEn: '0', charge: '0', spin: '1', year: 1979, scene: 'flux-tube', rating: 3, col: 5, row: 2 },
	{ id: 'w', symbol: 'W', name: 'W 玻色子', nameEn: 'W boson', family: 'gauge', generation: 0, role: '弱力的载体（带电）', roleEn: 'Charged weak carrier', massLabel: '≈ 80.4 GeV', massLabelEn: '≈ 80.4 GeV', charge: '±1', spin: '1', year: 1983, scene: 'beta-decay', rating: 4, col: 5, row: 3 },
	{ id: 'z', symbol: 'Z', name: 'Z 玻色子', nameEn: 'Z boson', family: 'gauge', generation: 0, role: '弱力的载体（中性）', roleEn: 'Neutral weak carrier', massLabel: '≈ 91.19 GeV', massLabelEn: '≈ 91.19 GeV', charge: '0', spin: '1', year: 1983, scene: 'z-exchange', rating: 4, col: 5, row: 4 },
	{ id: 'higgs', symbol: 'H', name: '希格斯玻色子', nameEn: 'Higgs boson', family: 'scalar', generation: 0, role: '希格斯场的激发', roleEn: 'Excitation of the Higgs field', massLabel: '≈ 125.2 GeV', massLabelEn: '≈ 125.2 GeV', charge: '0', spin: '0', year: 2012, scene: 'higgs-field', rating: 5, col: 6, row: 1, rowSpan: 4 },
]

export const particleIds = particles.map(p => p.id)

export function particleBySymbol(symbol: string): Particle | undefined {
	return particles.find(p => p.symbol === symbol)
}

export function particleIndex(id: ParticleId): number {
	return particles.findIndex(p => p.id === id)
}

export function neighbours(id: ParticleId): [Particle, Particle] {
	const i = particleIndex(id)
	return [particles[(i + particles.length - 1) % particles.length], particles[(i + 1) % particles.length]]
}

/** Deliberate picks, not a hash: the particles of everyday matter headline the shelf. */
export function cardRating(id: ParticleId): number {
	return particles.find(p => p.id === id)?.rating ?? 1
}

/** Collectible quests; entertainment framing, real groupings. */
export const cardQuests: Array<{ id: string; glyph: string; name: string; nameEn: string; description: string; descriptionEn: string; symbols: ParticleId[] }> = [
	{
		id: 'daily',
		glyph: '☉',
		name: '第一代粒子',
		nameEn: 'First-generation particles',
		description: '上、下夸克和电子参与构成原子；电子中微子也属于第一代。',
		descriptionEn: 'Up and down quarks and electrons are constituents of atoms; the electron neutrino is also in the first generation.',
		symbols: ['u', 'd', 'e', 've'],
	},
	{
		id: 'carriers',
		glyph: '✳',
		name: '力的传令官',
		nameEn: 'Force carriers',
		description: '三种相互作用的载体，以及希格斯场的激发。',
		descriptionEn: 'Carriers of three interactions, plus the excitation of the Higgs field.',
		symbols: ['gamma', 'gluon', 'w', 'z', 'higgs'],
	},
	{
		id: 'heavy',
		glyph: '✦',
		name: '第二代与第三代',
		nameEn: 'Second and third generations',
		description: '带电轻子与夸克的更重对应物，以及另两种中微子。',
		descriptionEn: 'Heavier charged leptons and quarks, plus two other neutrino flavours.',
		symbols: ['c', 's', 't', 'b', 'mu', 'tau', 'vmu', 'vtau'],
	},
]

/** The three generations of matter, used by the intro strip. */
export const generationLabels = [
	{ label: '第一代', labelEn: 'Generation I', note: '构成日常物质', noteEn: 'Makes up everyday matter' },
	{ label: '第二代', labelEn: 'Generation II', note: '更重的翻版', noteEn: 'Heavier copies' },
	{ label: '第三代', labelEn: 'Generation III', note: '第三组费米子', noteEn: 'Third group of fermions' },
] as const
