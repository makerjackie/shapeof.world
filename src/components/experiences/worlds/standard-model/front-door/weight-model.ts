/**
 * Numbers behind "Where does your weight come from?".
 *
 * Quark masses: PDG 2024 quark summary table, MS-bar scheme at 2 GeV
 * (u = 2.16 +0.49/−0.26 MeV, d = 4.70 +0.48/−0.17 MeV). Quarks are confined,
 * so these are inferred from lattice QCD and hadron data, not weighed directly.
 * Nucleon and electron masses: CODATA 2022.
 * Δ(1232) width ≈ 117 MeV, neutron mean life 878.4 s: PDG 2024.
 */

export type QuarkFlavour = 'u' | 'd'

export const quarkMassMeV: Record<QuarkFlavour, number> = { u: 2.16, d: 4.70 }
export const protonMassMeV = 938.272
export const neutronMassMeV = 939.565
export const electronMassMeV = 0.511
export const deltaMassMeV = 1232
export const deltaWidthMeV = 117
export const neutronMeanLifeS = 878.4
const hbarMeVs = 6.582e-22

/** The three valence quarks of a proton, in the order they sit in the scene. */
export const protonQuarks: QuarkFlavour[] = ['u', 'u', 'd']

export function quarkSum(quarks: readonly QuarkFlavour[]) {
	return quarks.reduce((sum, q) => sum + quarkMassMeV[q], 0)
}

/** Share of a nucleon's mass carried by its valence quarks' own masses. */
export function quarkShare(quarks: readonly QuarkFlavour[], nucleonMeV: number) {
	return quarkSum(quarks) / nucleonMeV
}

export const protonQuarkShare = quarkShare(protonQuarks, protonMassMeV)
export const neutronQuarkShare = quarkShare(['u', 'd', 'd'], neutronMassMeV)

/**
 * Quark rest mass inside a body, assuming roughly equal numbers of protons and
 * neutrons (hydrogen tips the real mix slightly towards protons, which changes
 * the answer by less than 0.1 percentage point). Electrons add about 0.03%.
 */
export function bodyQuarkKg(bodyKg: number) {
	return bodyKg * (protonQuarkShare + neutronQuarkShare) / 2
}

export const electronShareOfAtom = electronMassMeV / (protonMassMeV + electronMassMeV)

/** Mean lifetime from a resonance width, τ = ħ / Γ. */
export function lifetimeFromWidth(widthMeV: number) {
	return hbarMeVs / widthMeV
}

export type Combination = {
	id: 'proton' | 'neutron' | 'delta-plus-plus' | 'delta-minus' | 'incomplete'
	massMeV?: number
	charge: string
	name: [string, string]
	fate: [string, string]
}

/** What three u/d quarks make (ground states only; Δ⁺ and Δ⁰ are excited uud/udd). */
export function combine(quarks: readonly QuarkFlavour[]): Combination {
	if (quarks.length < 3) return { id: 'incomplete', charge: '', name: ['还差几颗', 'Needs three'], fate: ['质子和中子都由三颗夸克组成。', 'Protons and neutrons are made of three quarks.'] }
	const ups = quarks.filter(q => q === 'u').length
	if (ups === 2) return { id: 'proton', massMeV: protonMassMeV, charge: '+1', name: ['质子', 'Proton'], fate: ['稳定：从没有人观测到质子衰变。', 'Stable: no proton decay has ever been observed.'] }
	if (ups === 1) return { id: 'neutron', massMeV: neutronMassMeV, charge: '0', name: ['中子', 'Neutron'], fate: ['单独待着，平均约 ' + Math.round(neutronMeanLifeS / 60) + ' 分钟就衰变成质子；关在原子核里可以一直稳定。', 'Alone, it decays to a proton in about ' + Math.round(neutronMeanLifeS / 60) + ' minutes on average; inside a nucleus it can stay stable.'] }
	const tau = lifetimeFromWidth(deltaWidthMeV)
	const exponent = Math.floor(Math.log10(tau))
	const lifetime = `${(tau / 10 ** exponent).toFixed(1)}×10${superscript(exponent)}`
	return ups === 3
		? { id: 'delta-plus-plus', massMeV: deltaMassMeV, charge: '+2', name: ['Δ⁺⁺ 粒子', 'Δ⁺⁺ particle'], fate: ['拼得出来，但约 ' + lifetime + ' 秒就衰变成质子和 π 介子。', 'It forms, then decays to a proton and a pion in about ' + lifetime + ' s.'] }
		: { id: 'delta-minus', massMeV: deltaMassMeV, charge: '−1', name: ['Δ⁻ 粒子', 'Δ⁻ particle'], fate: ['拼得出来，但约 ' + lifetime + ' 秒就衰变成中子和 π 介子。', 'It forms, then decays to a neutron and a pion in about ' + lifetime + ' s.'] }
}

function superscript(n: number) {
	const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹'
	return (n < 0 ? '⁻' : '') + String(Math.abs(n)).split('').map(d => digits[Number(d)]).join('')
}

export const weightSources = [
	{ label: 'PDG 2024 · Quarks', url: 'https://pdg.lbl.gov/2024/tables/rpp2024-sum-quarks.pdf' },
	{ label: 'CODATA 2022', url: 'https://physics.nist.gov/cuu/Constants/' },
	{ label: 'CERN · Nucleon mass', url: 'https://home.cern/fr/other-99-5/' },
] as const

export const labSources = [
	weightSources[0],
	{ label: 'PDG 2024 · Δ(1232) listing', url: 'https://pdg.lbl.gov/2024/listings/rpp2024-list-Delta-1232.pdf' },
	{ label: 'PDG 2024 · Neutron listing', url: 'https://pdg.lbl.gov/2024/listings/rpp2024-list-n.pdf' },
] as const
