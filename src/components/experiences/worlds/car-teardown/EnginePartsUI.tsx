import { useEffect, useRef, useState, type RefObject } from 'react'
import { usePartText } from './localized-parts'
import { useExperienceI18n } from '~/i18n/experience'
import { ENGINE_PARTS } from './engine-parts'
import type { ProjectedAnchor } from './Scene'
import { layoutLeaders } from './label-layout'
import type { TeardownDefinition } from './teardown-types'
export type PartAnchors = Record<string, ProjectedAnchor>
export function EnginePartsList({
	parts = ENGINE_PARTS,
	title = '发动机零件',
	hovered,
	selected,
	onHover,
	onSelect,
}: {
	parts?: readonly TeardownDefinition[]
	title?: string
	hovered: string | null
	selected: string | null
	onHover: (id: string | null) => void
	onSelect: (id: string) => void
}) {
	const partText = usePartText()
	const tx = useExperienceI18n()
	const [open, setOpen] = useState(false)
	return (
		<aside className={`ct-parts-list ${open ? 'is-open' : ''}`}>
			<button className="ct-parts-heading" onClick={() => setOpen(!open)}>
				{tx(title)}{' '}
				<span>
					{parts.length} {open ? '−' : '+'}
				</span>
			</button>
			<div className="ct-parts-items">
				{parts.map((p, i) => (
					<button
						key={p.id}
						className={hovered === p.id || selected === p.id ? 'is-active' : ''}
						onPointerEnter={() => onHover(p.id)}
						onPointerLeave={() => onHover(null)}
						onFocus={() => onHover(p.id)}
						onBlur={() => onHover(null)}
						onClick={() => onSelect(p.id)}
						data-part={p.id}
					>
						<span>{String(i + 1).padStart(2, '0')}</span>
						<strong>{partText(p.name)}</strong>
						<small>×{p.count}</small>
					</button>
				))}
			</div>
		</aside>
	)
}
export function EnginePartCard({
	id,
	parts = ENGINE_PARTS,
	onClose,
}: {
	id: string
	parts?: readonly TeardownDefinition[]
	onClose: () => void
}) {
	const partText = usePartText()
	const tx = useExperienceI18n(),
		part = parts.find((p) => p.id === id)
	if (!part) return null
	return (
		<aside className="ct-part-card" aria-label={tx('零件资料')}>
			<div className="ct-part-card-heading">
				<span>
					{tx('零件资料')} / {String(parts.indexOf(part) + 1).padStart(2, '0')}
				</span>
				<button aria-label={tx('关闭零件卡')} onClick={onClose}>
					×
				</button>
			</div>
			<h2>{partText(part.name)}</h2>
			<p>{partText(part.description)}</p>
			<dl>
				<div>
					<dt>{tx('材料')}</dt>
					<dd>{partText(part.material)}</dd>
				</div>
				<div>
					<dt>{tx('数量')}</dt>
					<dd>{part.count}</dd>
				</div>
				{part.data.map((d) => (
					<div key={d.label.zh}>
						<dt>{partText(d.label)}</dt>
						<dd>{typeof d.value === 'string' ? d.value : partText(d.value)}</dd>
					</div>
				))}
			</dl>
			<button className="ct-back-instruments" onClick={onClose}>
				{tx('返回运转仪表')} ↗
			</button>
		</aside>
	)
}
export function EnginePartLabels({
	parts = ENGINE_PARTS,
	selected,
	anchorsRef,
	visible,
	hovered,
	onHover,
	onSelect,
}: {
	parts?: readonly TeardownDefinition[]
	selected?: string | null
	anchorsRef: RefObject<PartAnchors>
	visible: boolean
	hovered: string | null
	onHover: (id: string | null) => void
	onSelect: (id: string) => void
}) {
	const partText = usePartText()
	const tx = useExperienceI18n(),
		host = useRef<SVGSVGElement>(null)
	const [layout, setLayout] = useState({ width: 1600, height: 1000, anchors: {} as PartAnchors })
	useEffect(() => {
		if (!visible) return
		const timer = setInterval(() => {
			const r = host.current?.getBoundingClientRect()
			if (r) setLayout({ width: r.width, height: r.height, anchors: { ...anchorsRef.current } })
		}, 60)
		return () => clearInterval(timer)
	}, [visible, anchorsRef])
	const mobile = layout.width < 700
	return (
		<svg
			ref={host}
			className={`ct-labels ct-part-labels ${visible ? 'is-visible' : ''}`}
			aria-label={tx('零件标注')}
		>
			{layoutLeaders(
				(mobile
					? parts
							.filter((p) => p.id === hovered || p.id === selected)
							.concat(parts.filter((p) => p.id !== hovered && p.id !== selected).slice(0, 2))
					: parts
				).flatMap((p) => {
					const anchor = layout.anchors[p.id]
					return anchor ? [{ id: p.id, ...anchor }] : []
				}),
				{
					top: mobile ? 245 : 225,
					bottom: layout.height - (mobile ? 270 : 190),
					gap: mobile ? 32 : 38,
				},
			).map((a) => {
				const p = parts.find((p) => p.id === a.id)!
				const x = mobile ? (a.left ? 18 : layout.width - 125) : a.left ? 260 : layout.width - 470
				const end = a.left ? x + (mobile ? 95 : 135) : x - 8
				return (
					<g
						key={p.id}
						className={hovered === p.id ? 'is-hovered' : ''}
						onPointerEnter={() => onHover(p.id)}
						onPointerLeave={() => onHover(null)}
						onClick={() => onSelect(p.id)}
					>
						<circle cx={a.x} cy={a.y} r={2} />
						<path d={`M${a.x},${a.y} L${end + (a.left ? 15 : -15)},${a.labelY} H${end}`} />
						<foreignObject x={x} y={a.labelY - 32} width={mobile ? 100 : 135} height={30}>
							<div className="ct-part-label-text">
								{String(parts.indexOf(p) + 1).padStart(2, '0')} {partText(p.name)}
							</div>
						</foreignObject>
					</g>
				)
			})}
		</svg>
	)
}
