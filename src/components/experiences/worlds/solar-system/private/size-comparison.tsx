import { useExperienceI18n } from '~/i18n/experience'
import { PLANETS, MOONS } from '../solar-data'
import { SUN_RADIUS_KM } from '../scale-model'

/** Common pixel scale within each pair, independent of the scene's close-up camera. */
export function SizeComparison({ selectedId }: { selectedId: string }) {
	const tx = useExperienceI18n()
	const moon = MOONS.find((m) => m.id === selectedId)
	const body = moon ?? PLANETS.find((p) => p.id === selectedId)
	if (!body && selectedId !== 'sun') return null
	const jupiter = PLANETS.find((p) => p.id === 'jupiter')!
	const reference = moon
		? PLANETS.find((p) => p.id === moon.parentId)!
		: body && body.radiusKm < 10000
			? jupiter
			: { name: '太阳', radiusKm: SUN_RADIUS_KM, color: '#ffcf6b' }
	const compared = body ?? jupiter
	const ratio = compared.radiusKm / reference.radiusKm
	return (
		<div className="ss-size-comparison">
			<small>{tx('本组同比例 · 各组独立缩放')}</small>
			<svg viewBox="0 0 280 86" role="img" aria-label={`${tx('大小同比例')} · ${tx(reference.name)} / ${tx(compared.name)}`}>
				<circle cx="44" cy="38" r="32" fill={reference.color} opacity="0.85" />
				<circle cx="152" cy="38" r={32 * ratio} fill={compared.color} />
				<path d="M 88 38 H 112" stroke="#8292a8" strokeWidth="0.5" />
				<text x="44" y="83" textAnchor="middle">
					{tx(reference.name)}
				</text>
				<text x="152" y="83" textAnchor="middle">
					{tx(compared.name)}
				</text>
				<text x="206" y="35">
					{tx('直径比')}
				</text>
				<text x="206" y="55">
					{(1 / ratio).toFixed(1)} : 1
				</text>
			</svg>
		</div>
	)
}
