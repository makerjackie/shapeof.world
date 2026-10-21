/**
 * One deliberately small extract from the CMS Open Data education release.
 *
 * The source CSV gives reconstructed muon four-vectors, not hit-by-hit points.
 * The renderer therefore draws momentum-direction rays from the collision
 * vertex and labels them as a projection. It does not invent detector hits.
 */
export type EvidenceProjection = 'transverse' | 'longitudinal'

export const cmsZmumuEvent = {
	run: 148029,
	event: 64829157,
	type: 'GG',
	/** Invariant mass supplied by the source CSV, in GeV/c². */
	invariantMassGeV: 91.1845527329,
	dataRelease: 'CERN Open Data record 307',
	doi: '10.7483/OPENDATA.CMS.XBN9.HFGT',
	muons: [
		{ label: 'μ−', charge: -1, E: 43.6252962876, px: 2.40846365683, py: 38.4320069418, pz: 20.5020842288, pt: 38.5419 },
		{ label: 'μ+', charge: 1, E: 48.1927439028, px: 7.14786943728, py: -43.344785552, pz: -19.81582522, pt: 43.9905 },
	] as const,
} as const

export function eventRay(muon: typeof cmsZmumuEvent.muons[number], projection: EvidenceProjection, turn: number) {
	const rotatedPx = muon.px * Math.cos(turn) - muon.py * Math.sin(turn)
	const rotatedPy = muon.px * Math.sin(turn) + muon.py * Math.cos(turn)
	const scale = 138 / Math.max(...cmsZmumuEvent.muons.map(item => Math.hypot(item.px, item.py, item.pz)))
	if (projection === 'transverse') {
		return { x: rotatedPx * scale, y: -rotatedPy * scale, magnitude: muon.pt }
	}
	return { x: rotatedPx * scale, y: -muon.pz * scale, magnitude: Math.hypot(rotatedPx, muon.pz) }
}

export function invariantMassGeV(muons: typeof cmsZmumuEvent.muons) {
	const [a, b] = muons
	const energy = a.E + b.E
	const px = a.px + b.px
	const py = a.py + b.py
	const pz = a.pz + b.pz
	return Math.sqrt(Math.max(0, energy * energy - px * px - py * py - pz * pz))
}

export function vectorMagnitude(muon: typeof cmsZmumuEvent.muons[number]) {
	return Math.hypot(muon.px, muon.py, muon.pz)
}
