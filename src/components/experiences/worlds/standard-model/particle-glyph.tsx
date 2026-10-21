import type { CSSProperties } from 'react'
import type { Particle } from './particle-data'
import { familyInfo } from './particle-data'

/**
 * Specimen plates for the wall. The visual language is particle physics' own:
 * colour charge (the literal red/green/blue of QCD), cloud-chamber tracks, and
 * bodies scaled by log-mass so the three generations read at a glance.
 * All drawings are original schematics — particles have no appearance.
 */

const MASS_EV: Record<string, number> = {
	u: 2.16e6, d: 4.7e6, c: 1.27e9, s: 93.5e6, t: 172.6e9, b: 4.18e9,
	e: 0.511e6, mu: 105.66e6, tau: 1.7769e9, ve: 0.5, vmu: 0.5, vtau: 0.5,
	gamma: 0, gluon: 0, w: 80.37e9, z: 91.19e9, higgs: 125.2e9,
}

const MAX_LOG = Math.log10(172.6e9)

/** Position on the wall's shared log mass scale, 0–100. */
export function massScalePercent(id: string): number {
	const ev = MASS_EV[id] ?? 0
	if (ev <= 0) return 1.5
	return Math.max(2, Math.min(100, (Math.log10(ev) / MAX_LOG) * 100))
}

/** Log-mass body size: electron ~5, top/Higgs ~13. Massless stays small. */
function bodyRadius(id: string): number {
	const ev = MASS_EV[id] ?? 0
	if (ev <= 0) return 5.5
	return 4.5 + 4.6 * Math.log10(1 + ev / 1e6)
}

// The literal colour charges of QCD, muted for the paper room.
const CHARGE_COLORS = { red: '#c05a4b', green: '#5b8770', blue: '#4a76ad' }

export function ParticleGlyph({ particle, animate = false, size, tall = false }: { particle: Particle; animate?: boolean; size?: number; tall?: boolean }) {
	const color = familyInfo[particle.family].color
	const kind = glyphKind(particle)
	const r = bodyRadius(particle.id)
	if (kind === 'higgs' && tall) {
		return <svg
			className={`sm-glyph is-tall${animate ? ' is-animated' : ''}`}
			width={size} height={size} viewBox="0 0 100 260"
			style={{ '--glyph-color': color, '--body-r': r } as CSSProperties}
			role="img" aria-label={particle.name}
			data-glyph="higgs-tall"
		>
			<circle className="sm-glyph-halo" cx="50" cy="130" r="58" fill="none" stroke="var(--glyph-color)" strokeOpacity=".38" strokeWidth="1.2" strokeDasharray="3 6" />
			<circle className="sm-glyph-halo sm-glyph-halo-2" cx="50" cy="130" r="82" fill="none" stroke="var(--glyph-color)" strokeOpacity=".16" strokeWidth="1" strokeDasharray="2 9" />
			<circle className="sm-glyph-orb" cx="50" cy="130" r={r * 1.5} fill="var(--glyph-color)" />
			<circle cx={50 - r * .45} cy={130 - r * .5} r={Math.min(4.5, r * .3)} fill="#fff" fillOpacity=".92" />
			{[0, 60, 120, 180, 240, 300].map(a => <circle key={a} className="sm-glyph-orb" cx={50 + 34 * Math.cos(a * Math.PI / 180)} cy={130 + 34 * Math.sin(a * Math.PI / 180)} r="3.4" fill="var(--glyph-color)" fillOpacity=".5" />)}
			<path className="sm-glyph-tail" d="M50 14 C 46 34, 54 50, 50 66" fill="none" stroke="var(--glyph-color)" strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="2 6" strokeLinecap="round" />
			<path className="sm-glyph-tail" d="M50 246 C 54 226, 46 210, 50 194" fill="none" stroke="var(--glyph-color)" strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="2 6" strokeLinecap="round" />
		</svg>
	}
	return <svg
		className={`sm-glyph${animate ? ' is-animated' : ''}`}
		width={size} height={size} viewBox="0 0 140 100"
		style={{ '--glyph-color': color, '--body-r': r } as CSSProperties}
		role="img" aria-label={particle.name}
		data-glyph={kind}
	>
		{kind === 'quark' && <g>
			<path className="sm-glyph-strings" d="M70 34 L42 66 L98 66 Z" fill="none" stroke="var(--glyph-color)" strokeOpacity=".42" strokeWidth="1.5" strokeLinecap="round" />
			<circle className="sm-glyph-orb" cx="70" cy="34" r={r * 1.12} fill={CHARGE_COLORS.red} />
			<circle className="sm-glyph-orb" cx="42" cy="66" r={r * 0.92} fill={CHARGE_COLORS.green} />
			<circle className="sm-glyph-orb" cx="98" cy="66" r={r * 0.92} fill={CHARGE_COLORS.blue} />
			<circle cx="67" cy="30" r={Math.min(3, r * .26)} fill="#fff" fillOpacity=".85" />
		</g>}
		{kind === 'lepton' && <g>
			<circle className="sm-glyph-halo" cx="70" cy="50" r={r + 13} fill="none" stroke="var(--glyph-color)" strokeOpacity=".34" strokeWidth="1.3" strokeDasharray="2 6" strokeLinecap="round" />
			<circle className="sm-glyph-halo sm-glyph-halo-2" cx="70" cy="50" r={r + 24} fill="none" stroke="var(--glyph-color)" strokeOpacity=".16" strokeWidth="1.1" strokeDasharray="2 9" strokeLinecap="round" />
			<circle className="sm-glyph-orb" cx="70" cy="50" r={r} fill="var(--glyph-color)" fillOpacity=".9" />
			<circle cx={70 - r * .35} cy={50 - r * .4} r={Math.min(3, r * .26)} fill="#fff" fillOpacity=".9" />
		</g>}
		{kind === 'neutrino' && <g>
			<path className="sm-glyph-tail" d="M12 74 C 44 74 48 38 84 34 S 122 40 130 34" fill="none" stroke="var(--glyph-color)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="1.5 7" strokeLinecap="round" />
			<circle className="sm-glyph-orb" cx="84" cy="34" r={r * .8} fill="var(--glyph-color)" fillOpacity=".62" />
			<circle cx="82" cy="32" r="1.6" fill="#fff" fillOpacity=".85" />
		</g>}
		{kind === 'photon' && <g>
			<path className="sm-glyph-wave" d="M8 50 C 20 26, 32 26, 44 50 S 68 74, 80 50 S 104 26, 116 50 S 132 66, 136 52" fill="none" stroke="var(--glyph-color)" strokeWidth="2.6" strokeLinecap="round" />
			<circle className="sm-glyph-orb sm-glyph-packet" cx="136" cy="52" r="4.2" fill="var(--glyph-color)" />
		</g>}
		{kind === 'gluon' && <g>
			<circle className="sm-glyph-orb" cx="30" cy="54" r={r * .9} fill={CHARGE_COLORS.red} />
			<circle className="sm-glyph-orb" cx="110" cy="46" r={r * .9} fill={CHARGE_COLORS.blue} />
			<path className="sm-glyph-coil" d="M40 52 C 50 38, 58 38, 64 50 S 78 64, 88 48 S 100 36, 100 44" fill="none" stroke="var(--glyph-color)" strokeWidth="2.2" strokeLinecap="round" />
		</g>}
		{kind === 'w' && <g>
			<path className="sm-glyph-wave" d="M16 56 C 30 30, 44 30, 56 56 S 80 82, 92 50 S 112 30, 124 46" fill="none" stroke="var(--glyph-color)" strokeWidth="2.6" strokeLinecap="round" />
			<circle className="sm-glyph-orb" cx="124" cy="46" r={r * .62} fill="var(--glyph-color)" />
			<path className="sm-glyph-mark" d="M28 22 h7 m-3.5 -3.5 v7" stroke="var(--glyph-color)" strokeWidth="1.6" strokeLinecap="round" opacity=".65" />
		</g>}
		{kind === 'z' && <g>
			<path className="sm-glyph-wave" d="M18 32 L58 32 L40 68 L108 68" fill="none" stroke="var(--glyph-color)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
			<circle className="sm-glyph-orb" cx="108" cy="68" r={r * .62} fill="var(--glyph-color)" />
		</g>}
		{kind === 'higgs' && <g>
			<circle className="sm-glyph-halo" cx="70" cy="50" r="30" fill="none" stroke="var(--glyph-color)" strokeOpacity=".4" strokeWidth="1.2" strokeDasharray="3 5" />
			<circle className="sm-glyph-halo sm-glyph-halo-2" cx="70" cy="50" r="42" fill="none" stroke="var(--glyph-color)" strokeOpacity=".18" strokeWidth="1" strokeDasharray="2 7" />
			{[0, 60, 120, 180, 240, 300].map(a => <circle key={a} className="sm-glyph-orb" cx={70 + 19 * Math.cos(a * Math.PI / 180)} cy={50 + 19 * Math.sin(a * Math.PI / 180)} r="3.6" fill="var(--glyph-color)" fillOpacity=".5" />)}
			<circle className="sm-glyph-orb" cx="70" cy="50" r={r * 1.05} fill="var(--glyph-color)" />
			<circle cx="66.5" cy="46.5" r={Math.min(3.4, r * .28)} fill="#fff" fillOpacity=".92" />
		</g>}
	</svg>
}

function glyphKind(particle: Particle): string {
	if (particle.family === 'quark') return 'quark'
	if (particle.family === 'scalar') return 'higgs'
	if (particle.family === 'gauge') {
		if (particle.id === 'gamma') return 'photon'
		if (particle.id === 'gluon') return 'gluon'
		if (particle.id === 'w') return 'w'
		return 'z'
	}
	return particle.role === '中微子' ? 'neutrino' : 'lepton'
}
