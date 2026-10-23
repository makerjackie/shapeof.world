import {useEffect, useRef, useState, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {ENGINE_PARTS} from './engine-parts'
import type {ProjectedAnchor} from './Scene'
export type PartAnchors = Record<string, ProjectedAnchor>
export function EnginePartsList({
	hovered,
	selected,
	onHover,
	onSelect,
}: {
	hovered: string | null
	selected: string | null
	onHover: (id: string | null) => void
	onSelect: (id: string) => void
}) {
	const tx = useExperienceI18n()
	const [open, setOpen] = useState(false)
	return (
		<aside className={`ct-parts-list ${open ? 'is-open' : ''}`}>
			<button className="ct-parts-heading" onClick={() => setOpen(!open)}>
				{tx('发动机零件')} <span>18 {open ? '−' : '+'}</span>
			</button>
			<div className="ct-parts-items">
				{ENGINE_PARTS.map((p, i) => (
					<button
						key={p.id}
						className={hovered === p.id || selected === p.id ? 'is-active' : ''}
						onPointerEnter={() => onHover(p.id)}
						onPointerLeave={() => onHover(null)}
						onFocus={() => onHover(p.id)}
						onBlur={() => onHover(null)}
						onClick={() => onSelect(p.id)}
						data-part={p.id}>
						<span>{String(i + 1).padStart(2, '0')}</span>
						<strong>{tx(p.name.zh)}</strong>
						<small>×{p.count}</small>
					</button>
				))}
			</div>
		</aside>
	)
}
export function EnginePartCard({id, onClose}: {id: string; onClose: () => void}) {
	const tx = useExperienceI18n(),
		part = ENGINE_PARTS.find((p) => p.id === id)!
	return (
		<aside className="ct-part-card" aria-label={tx('零件资料')}>
			<div className="ct-part-card-heading">
				<span>
					{tx('零件资料')} / {String(ENGINE_PARTS.indexOf(part) + 1).padStart(2, '0')}
				</span>
				<button aria-label={tx('关闭零件卡')} onClick={onClose}>
					×
				</button>
			</div>
			<h2>{tx(part.name.zh)}</h2>
			<p>{tx(part.description.zh)}</p>
			<dl>
				<div>
					<dt>{tx('材料')}</dt>
					<dd>{tx(part.material.zh)}</dd>
				</div>
				<div>
					<dt>{tx('数量')}</dt>
					<dd>{part.count}</dd>
				</div>
				{part.data.map((d) => (
					<div key={d.label.zh}>
						<dt>{tx(d.label.zh)}</dt>
						<dd>{d.value}</dd>
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
	anchorsRef,
	visible,
	hovered,
	onHover,
	onSelect,
}: {
	anchorsRef: RefObject<PartAnchors>
	visible: boolean
	hovered: string | null
	onHover: (id: string | null) => void
	onSelect: (id: string) => void
}) {
	const tx = useExperienceI18n(),
		host = useRef<SVGSVGElement>(null)
	const [layout, setLayout] = useState({width: 1600, height: 1000, anchors: {} as PartAnchors})
	useEffect(() => {
		if (!visible) return
		const timer = setInterval(() => {
			const r = host.current?.getBoundingClientRect()
			if (r) setLayout({width: r.width, height: r.height, anchors: {...anchorsRef.current}})
		}, 60)
		return () => clearInterval(timer)
	}, [visible, anchorsRef])
	const mobile = layout.width < 700
	return (
		<svg
			ref={host}
			className={`ct-labels ct-part-labels ${visible ? 'is-visible' : ''}`}
			aria-label={tx('零件标注')}>
			{!mobile &&
				[0, 1].flatMap((column) =>
					ENGINE_PARTS.filter((_, i) => i % 2 === column)
						.sort((a, b) => (layout.anchors[a.id]?.y ?? 0) - (layout.anchors[b.id]?.y ?? 0))
						.map((p, row) => {
							const a = layout.anchors[p.id]
							if (!a?.visible) return null
							const left = column === 0,
								x = left ? 300 : layout.width - 510,
								y = 245 + row * Math.min(53, (layout.height - 430) / 8),
								end = left ? x + 135 : x - 8
							return (
								<g
									key={p.id}
									className={hovered === p.id ? 'is-hovered' : ''}
									onPointerEnter={() => onHover(p.id)}
									onPointerLeave={() => onHover(null)}
									onClick={() => onSelect(p.id)}>
									<circle cx={a.x} cy={a.y} r={2} />
									<path d={`M${a.x},${a.y} L${end + (left ? 15 : -15)},${y} H${end}`} />
									<text x={x} y={y - 6} className="ct-part-label-text">
										{String(ENGINE_PARTS.indexOf(p) + 1).padStart(2, '0')} {tx(p.name.zh)}
									</text>
								</g>
							)
						}),
				)}
		</svg>
	)
}
