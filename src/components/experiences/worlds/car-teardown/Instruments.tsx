import {useEffect, useRef, useState, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {cylinderState, cycleAngle, ignitionAdvance, strokeAt} from './model'
import {VEHICLE_SPEC as S, type CylinderNumber, type Stroke} from './vehicle-spec'
import {SYSTEMS, partCount, type SystemId} from './parts'
import type {AnchorMap} from './Scene'
import {layoutLeaders} from './label-layout'

const strokeNames: Record<Stroke, string> = {
	power: '做功',
	exhaust: '排气',
	intake: '进气',
	compression: '压缩',
}
export function EngineeringLabels({
	anchorsRef,
	visible,
	hovered,
	onHover,
	onSelect,
}: {
	anchorsRef: RefObject<AnchorMap>
	visible: boolean
	hovered: SystemId | null
	onHover: (id: SystemId | null) => void
	onSelect: (id: SystemId) => void
}) {
	const tx = useExperienceI18n()
	const host = useRef<SVGSVGElement>(null)
	const [layout, setLayout] = useState({width: 1600, height: 1000, anchors: {} as AnchorMap})
	useEffect(() => {
		if (!visible) return
		const timer = window.setInterval(() => {
			if (!host.current) return
			const rect = host.current.getBoundingClientRect()
			setLayout({width: rect.width, height: rect.height, anchors: {...anchorsRef.current}})
		}, 60)
		return () => clearInterval(timer)
	}, [anchorsRef, visible])
	const mobile = layout.width < 700
	const shown = SYSTEMS.filter((s) => !mobile || ['body', 'powertrain', 'chassis'].includes(s.id))
	const positions = new Map(
		layoutLeaders(
			shown.flatMap((s) => {
				const anchor = layout.anchors[s.id]
				return anchor ? [{id: s.id, ...anchor}] : []
			}),
			{
				top: mobile ? 235 : 230,
				bottom: layout.height - (mobile ? 255 : 205),
				gap: mobile ? 70 : 65,
			},
		).map((a) => [a.id, a]),
	)
	return (
		<svg
			ref={host}
			className={`ct-labels ${visible ? 'is-visible' : ''}`}
			aria-label={tx('系统标注')}>
			{shown.map((s) => {
				const anchor = layout.anchors[s.id]
				if (!anchor || !anchor.visible) return null
				const position = positions.get(s.id)
				const y = position?.labelY ?? anchor.y
				const left = position?.left ?? true
				const x = left ? (mobile ? 20 : 65) : layout.width - (mobile ? 116 : 212)
				const lineEnd = left ? x + (mobile ? 92 : 155) : x
				const elbow = left ? lineEnd + 24 : lineEnd - 24
				return (
					<g
						key={s.id}
						role="button"
						tabIndex={visible ? 0 : -1}
						className={hovered === s.id ? 'is-hovered' : ''}
						aria-label={`${tx(s.name)} ${partCount(s.id)} ${tx('件')}`}
						onPointerEnter={() => onHover(s.id)}
						onPointerLeave={() => onHover(null)}
						onClick={() => onSelect(s.id)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								onSelect(s.id)
							}
						}}>
						<circle cx={anchor.x} cy={anchor.y} r={2.4} fill="currentColor" />
						<path d={`M${anchor.x},${anchor.y} L${elbow},${y} H${lineEnd}`} />
						<rect
							x={x - 8}
							y={y - 25}
							width={mobile ? 116 : 185}
							height={51}
							fill="transparent"
							stroke="none"
						/>
						<circle cx={x + 8} cy={y - 9} r={9} />
						<text x={x + 8} y={y - 5} textAnchor="middle" className="ct-label-number">
							{SYSTEMS.indexOf(s) + 1}
						</text>
						<text x={x + 25} y={y - 5} className="ct-label-name">
							{tx(s.name)}
						</text>
						<text x={x + 25} y={y + 13} className="ct-label-count">
							{partCount(s.id)} {tx('件')}
						</text>
					</g>
				)
			})}
		</svg>
	)
}
export function EngineInstruments({
	angleRef,
	rpm,
	slowdown,
	paused,
	xray,
	onRpm,
	onSlowdown,
	onPaused,
	onXray,
	onScrub,
}: {
	angleRef: RefObject<number>
	rpm: number
	slowdown: number
	paused: boolean
	xray: boolean
	onRpm: (value: number) => void
	onSlowdown: (value: number) => void
	onPaused: (value: boolean) => void
	onXray: (value: boolean) => void
	onScrub: (angle: number) => void
}) {
	const tx = useExperienceI18n()
	const [angle, setAngle] = useState(angleRef.current)
	const [open, setOpen] = useState(true)
	useEffect(() => {
		const timer = window.setInterval(() => setAngle(angleRef.current), 40)
		return () => clearInterval(timer)
	}, [angleRef])
	const cylinders: CylinderNumber[] = [1, 2, 3, 4]
	return (
		<aside className={`ct-instruments ${open ? 'is-open' : ''}`} aria-label={tx('发动机仪表')}>
			<button className="ct-panel-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
				<span>
					{tx('直列四缸')} <span className="ct-muted">2.0 L · DOHC</span>
				</span>
				<span className="ct-drawer-toggle">{open ? '−' : '+'}</span>
			</button>
			<div className="ct-instrument-content">
				<div className="ct-rpm-reading">
					<div>
						<span>{tx('真实转速')}</span>
						<strong>{rpm.toLocaleString('en-US')}</strong>
						<small>{tx('转/分')}</small>
					</div>
					<div className="ct-slow-reading">
						<span>{tx('画面慢放')}</span>
						<strong>1/{slowdown}</strong>
					</div>
				</div>
				<input
					aria-label={tx('真实转速')}
					type="range"
					min={S.engine.idleRpm}
					max={S.engine.redlineRpm}
					step={50}
					value={rpm}
					onChange={(e) => onRpm(Number(e.target.value))}
				/>
				<div className="ct-scale">
					<span>800</span>
					<span>6,500</span>
				</div>
				<div className="ct-slow-controls" aria-label={tx('画面慢放')}>
					{S.engine.slowdownOptions.map((value) => (
						<button key={value} aria-pressed={slowdown === value} onClick={() => onSlowdown(value)}>
							1/{value}
						</button>
					))}
					<button aria-label={tx(paused ? '播放' : '暂停')} onClick={() => onPaused(!paused)}>
						{tx(paused ? '播放' : '暂停')}
					</button>
				</div>
				<button
					className={`ct-xray ${xray ? 'is-active' : ''}`}
					aria-pressed={xray}
					onClick={() => onXray(!xray)}>
					<span>{tx('X 光')}</span>
					<span>{tx(xray ? '开启' : '关闭')}</span>
				</button>
				<div className="ct-timing-heading">
					<span>{tx('四冲程正时')}</span>
					<span>{Math.floor(angle).toString().padStart(3, '0')}° / 720°</span>
				</div>
				<div className="ct-timing-chart">
					<svg viewBox="0 0 272 144" aria-label={tx('720 度正时图')}>
						{[0, 180, 360, 540, 720].map((tick) => (
							<g key={tick}>
								<text x={26 + (tick / 720) * 196} y={10} textAnchor="middle">
									{tick}°
								</text>
								<path d={`M${26 + (tick / 720) * 196},17v111`} className="ct-timing-grid" />
							</g>
						))}
						{cylinders.map((cyl, index) => {
							const state = cylinderState(angle, cyl, rpm)
							return (
								<g key={cyl}>
									<text x="2" y={34 + index * 28}>
										{cyl}
									</text>
									{Array.from({length: 4}, (_, k) => {
										const a = k * 180
										const stroke = strokeAt(cycleAngle(a + 1, cyl))
										return (
											<rect
												key={k}
												x={26 + (a / 720) * 196}
												y={21 + index * 28}
												width={48.5}
												height={16}
												fill={S.materials.strokes[stroke]}
												opacity={0.75}
											/>
										)
									})}
									{(['intake', 'exhaust'] as const).map((valve, vi) => {
										const timing = S.engine.timing[valve]
										return Array.from({length: 3}, (_, n) => {
											const start = timing.open + S.engine.firingOffsets[cyl] + (n - 1) * 720
											const end = timing.close + S.engine.firingOffsets[cyl] + (n - 1) * 720
											const a = Math.max(0, start),
												b = Math.min(720, end)
											return b > a ? (
												<line
													key={`${valve}-${n}`}
													x1={26 + (a / 720) * 196}
													x2={26 + (b / 720) * 196}
													y1={40 + index * 28 + vi * 3}
													y2={40 + index * 28 + vi * 3}
													stroke={S.materials.strokes[valve]}
													strokeWidth="2"
												/>
											) : null
										})
									})}
									<text x="233" y={34 + index * 28} fill={S.materials.strokes[state.stroke]}>
										{tx(strokeNames[state.stroke])}
									</text>
								</g>
							)
						})}
						<line
							x1={26 + (angle / 720) * 196}
							x2={26 + (angle / 720) * 196}
							y1="16"
							y2="130"
							stroke="#f7f3e7"
							strokeWidth="1.2"
						/>
						<path d={`M${22 + (angle / 720) * 196},14h8l-4,5z`} fill="#f7f3e7" />
					</svg>
					<input
						className="ct-angle-scrub"
						type="range"
						min="0"
						max="719.9"
						step="0.1"
						value={angle}
						aria-label={tx('曲轴角度')}
						onChange={(e) => {
							const value = Number(e.target.value)
							setAngle(value)
							onScrub(value)
						}}
					/>
				</div>
				<div className="ct-stroke-legend">
					{(['intake', 'compression', 'power', 'exhaust'] as const).map((stroke) => (
						<span key={stroke}>
							<i style={{background: S.materials.strokes[stroke]}} />
							{tx(strokeNames[stroke])}
						</span>
					))}
				</div>
				<p className="ct-panel-note">{tx('色带下细线：进气门 / 排气门开启区间。拖游标暂停。')}</p>
				<div className="ct-mechanical-readings">
					<span>
						{tx('点火顺序')}
						<b>1 — 3 — 4 — 2</b>
					</span>
					<span>
						{tx('凸轮 / 曲轴')}
						<b>1 : 2</b>
					</span>
					<span>
						{tx('点火提前')}
						<b>{ignitionAdvance(rpm).toFixed(0)}°</b>
					</span>
				</div>
				<p className="ct-panel-note">
					{tx('气门正时固定，点火提前为示意；真实发动机随工况调整。')}
				</p>
			</div>
		</aside>
	)
}
