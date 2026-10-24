import { BODY_TEARDOWN_SPEC as B } from './vehicle-spec'
import { useExperienceI18n } from '~/i18n/experience'

export function SteelLegend({ onSelect }: { onSelect: (id: string) => void }) {
	const tx = useExperienceI18n()
	return (
		<aside className="ct-steel-legend" aria-label={tx('白车身钢材')}>
			<p>{tx('白车身 · 钢材强度示意')}</p>
			{[
				['body-hot-steel', B.steel.hot.color, '热成形钢', '≈ 1,500 MPa'],
				['body-high-steel', B.steel.high.color, '高强度钢', '340–800 MPa'],
				['body-mild-steel', B.steel.mild.color, '普通钢', ''],
			].map(([id, color, label, value]) => (
				<button key={id} onClick={() => onSelect(id)}>
					<i style={{ background: color }} />
					<span>{tx(label)}</span>
					<small>{value}</small>
				</button>
			))}
			<small>{tx('代表范围；颜色表示钢材类别，不表示受力。')}</small>
		</aside>
	)
}
