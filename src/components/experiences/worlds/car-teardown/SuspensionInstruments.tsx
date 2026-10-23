import {useEffect, useState, type ReactNode, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {SUSPENSION_GEOMETRY as G} from './vehicle-spec'
import {rearAxleDelay, type SuspensionSample, type SuspensionState} from './suspension-model'

export const SUSPENSION_EN: Record<string, string> = {
	悬架仪表: 'Suspension instruments',
	悬架过坎: 'Suspension over a bump',
	回弹结束: 'Oscillation settled',
	前轮即将过坎: 'Front wheels approaching the bump',
	后轮正在过坎: 'Rear wheels crossing the bump',
	前轮正在过坎: 'Front wheels crossing the bump',
	'弹簧回弹，减振器耗散能量': 'Springs rebound; dampers dissipate energy',
	真实车速: 'Real vehicle speed',
	路坎高度: 'Bump height',
	减振阻尼: 'Damper coefficient',
	软: 'Soft',
	标准: 'Standard',
	硬: 'Firm',
	再过一次: 'Cross again',
	前轴示波器: 'Front axle traces',
	相对静态车高: 'From static ride height',
	'前轮路面、轮心与车身位移随时间变化': 'Front road, wheel centre and body displacement over time',
	物理时间: 'Physical time',
	路面: 'Road',
	轮心: 'Wheel centre',
	车身: 'Body',
	前悬压缩量: 'Front compression',
	后悬压缩量: 'Rear compression',
	后轮延迟: 'Rear-wheel delay',
	车身俯仰: 'Body pitch',
	'弹簧吸收冲击，减振器把弹簧的来回晃动耗掉。':
		'The spring absorbs the impact; the damper dissipates its back-and-forth motion.',
	'两自由度四分之一车，线性弹簧和阻尼；连杆姿态为示意，不计算侧倾和轮胎离地。':
		'Two-degree-of-freedom quarter-car model with a linear spring and damper. Link positions are illustrative; roll and tyre lift-off are not modelled.',
}

export function SuspensionInstruments({
	stateRef,
	speedKmh,
	bumpHeight,
	damping,
	onSpeedKmh,
	onBumpHeight,
	onDamping,
	onRestart,
	clock,
}: {
	stateRef: RefObject<SuspensionState>
	speedKmh: number
	bumpHeight: number
	damping: number
	onSpeedKmh: (value: number) => void
	onBumpHeight: (value: number) => void
	onDamping: (value: number) => void
	onRestart: () => void
	clock: ReactNode
}) {
	const tx = useExperienceI18n()
	const [state, setState] = useState(() => ({
		...stateRef.current,
		front: {...stateRef.current.front},
		rear: {...stateRef.current.rear},
		history: [...stateRef.current.history],
	}))
	const [open, setOpen] = useState(true)
	useEffect(() => {
		const timer = setInterval(
			() =>
				setState({
					...stateRef.current,
					front: {...stateRef.current.front},
					rear: {...stateRef.current.rear},
					history: [...stateRef.current.history],
				}),
			50,
		)
		return () => clearInterval(timer)
	}, [stateRef])
	const duration = Math.max(4, Math.ceil(state.time / 2) * 2)
	const maximum = Math.ceil(Math.max(0.08, bumpHeight * 1.7) / 0.02) * 0.02,
		minimum = -maximum / 2
	const plot = {left: 38, right: 300, top: 16, bottom: 140}
	const x = (time: number) => plot.left + (time / duration) * (plot.right - plot.left)
	const y = (height: number) =>
		plot.bottom - ((height - minimum) / (maximum - minimum)) * (plot.bottom - plot.top)
	const path = (key: 'road' | 'wheel' | 'body') =>
		state.history
			.map(
				(p: SuspensionSample, i) =>
					`${i ? 'L' : 'M'}${x(p.time).toFixed(2)},${y(p[key]).toFixed(2)}`,
			)
			.join(' ')
	const traces = [
		{key: 'road' as const, label: '路面', color: G.roadTrace},
		{key: 'wheel' as const, label: '轮心', color: G.wheelTrace},
		{key: 'body' as const, label: '车身', color: G.bodyTrace},
	]
	const status = !state.active
		? '回弹结束'
		: state.time < G.firstContactTime
			? '前轮即将过坎'
			: state.rear.road > 0
				? '后轮正在过坎'
				: state.front.road > 0
					? '前轮正在过坎'
					: '弹簧回弹，减振器耗散能量'
	return (
		<aside
			className={`ct-instruments ct-suspension-panel ${open ? 'is-open' : ''}`}
			aria-label={tx('悬架仪表')}>
			<button className="ct-panel-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
				<span>{tx('悬架过坎')}</span>
				<span className="ct-drawer-toggle">{open ? '−' : '+'}</span>
			</button>
			<div className="ct-instrument-content">
				<div className="ct-mechanism-status">
					<span>{tx(status)}</span>
					<strong>{state.time.toFixed(2)} s</strong>
				</div>
				{clock}
				<label className="ct-control-label">
					<span>{tx('真实车速')}</span>
					<output>{speedKmh} km/h</output>
					<input
						type="range"
						min={G.speedRange[0]}
						max={G.speedRange[1]}
						step={1}
						value={speedKmh}
						aria-label={tx('真实车速')}
						onChange={(e) => onSpeedKmh(Number(e.target.value))}
					/>
				</label>
				<label className="ct-control-label">
					<span>{tx('路坎高度')}</span>
					<output>{Math.round(bumpHeight * 100)} cm</output>
					<input
						type="range"
						min={G.bumpRange[0]}
						max={G.bumpRange[1]}
						step={0.01}
						value={bumpHeight}
						aria-label={tx('路坎高度')}
						onChange={(e) => onBumpHeight(Number(e.target.value))}
					/>
				</label>
				<div className="ct-control-label">
					<span>{tx('减振阻尼')}</span>
					<output>{damping.toLocaleString('en-US')} N·s/m</output>
				</div>
				<div
					className="ct-slow-controls ct-damping-controls"
					role="group"
					aria-label={tx('减振阻尼')}>
					{G.dampingPresets.map((value, i) => (
						<button
							key={value}
							data-damping={value}
							aria-pressed={damping === value}
							onClick={() => onDamping(value)}>
							{tx(['软', '标准', '硬'][i])}
						</button>
					))}
				</div>
				<button className="ct-mechanism-action" data-action="bump" onClick={onRestart}>
					{tx('再过一次')}
				</button>
				<div className="ct-suspension-scope">
					<div className="ct-scope-heading">
						<span>{tx('前轴示波器')}</span>
						<span>{tx('相对静态车高')} · mm</span>
					</div>
					<svg
						viewBox="0 0 310 172"
						role="img"
						aria-label={tx('前轮路面、轮心与车身位移随时间变化')}>
						{[minimum, 0, maximum / 2, maximum].map((height) => (
							<g key={height}>
								<line
									x1={plot.left}
									x2={plot.right}
									y1={y(height)}
									y2={y(height)}
									stroke="#65717b"
									strokeOpacity={height === 0 ? 0.65 : 0.25}
								/>
								<text
									x={plot.left - 6}
									y={y(height) + 3}
									textAnchor="end"
									fill="#8c99a5"
									fontSize={9}>
									{Math.round(height * 1000)}
								</text>
							</g>
						))}
						{[0, duration / 2, duration].map((time) => (
							<g key={time}>
								<line
									x1={x(time)}
									x2={x(time)}
									y1={plot.top}
									y2={plot.bottom}
									stroke="#65717b"
									strokeOpacity={0.2}
								/>
								<text x={x(time)} y={154} textAnchor="middle" fill="#8c99a5" fontSize={9}>
									{time.toFixed(0)}
								</text>
							</g>
						))}
						{traces.map((trace) => (
							<path
								key={trace.key}
								d={path(trace.key)}
								fill="none"
								stroke={trace.color}
								strokeWidth={1.6}
								strokeLinejoin="round"
							/>
						))}
						<line
							x1={x(state.time)}
							x2={x(state.time)}
							y1={plot.top}
							y2={plot.bottom}
							stroke="#cad6df"
							strokeOpacity={0.65}
							strokeDasharray="3 3"
						/>
						<text
							x={(plot.left + plot.right) / 2}
							y={168}
							textAnchor="middle"
							fill="#8c99a5"
							fontSize={9}>
							{tx('物理时间')} / s
						</text>
					</svg>
					<div className="ct-trace-legend">
						{traces.map((trace) => (
							<span key={trace.key}>
								<i style={{background: trace.color}} />
								{tx(trace.label)}
							</span>
						))}
					</div>
				</div>
				<dl className="ct-transmission-readings">
					<div>
						<dt>{tx('前悬压缩量')}</dt>
						<dd>{((state.front.wheel - state.front.body) * 1000).toFixed(1)} mm</dd>
					</div>
					<div>
						<dt>{tx('后悬压缩量')}</dt>
						<dd>{((state.rear.wheel - state.rear.body) * 1000).toFixed(1)} mm</dd>
					</div>
					<div>
						<dt>{tx('后轮延迟')}</dt>
						<dd>{rearAxleDelay(speedKmh).toFixed(3)} s</dd>
					</div>
					<div>
						<dt>{tx('车身俯仰')}</dt>
						<dd>{((state.pitch * 180) / Math.PI).toFixed(2)}°</dd>
					</div>
				</dl>
				<p className="ct-transmission-fact">{tx('弹簧吸收冲击，减振器把弹簧的来回晃动耗掉。')}</p>
				<p className="ct-mechanism-note">
					{tx('两自由度四分之一车，线性弹簧和阻尼；连杆姿态为示意，不计算侧倾和轮胎离地。')}
				</p>
			</div>
		</aside>
	)
}
