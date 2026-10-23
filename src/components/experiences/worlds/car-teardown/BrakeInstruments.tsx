import {useEffect, useRef, useState, type ReactNode, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {BRAKE_GEOMETRY as B} from './vehicle-spec'
import {caliperTravel, type BrakeState} from './brake-model'

/** Root merges these with the world's English override before generation. */
export const BRAKE_EN: Record<string, string> = {
	制动仪表: 'Brake instruments',
	'一脚下去，两片夹紧。': 'One pedal. Both pads clamp.',
	踏板力: 'Pedal force',
	按住制动: 'Hold to brake',
	松开踏板: 'Release pedal',
	初始车速: 'Initial speed',
	重新滚动: 'Restart wheels',
	当前车速: 'Current speed',
	管路压力: 'Line pressure',
	前轮夹紧力: 'Front clamp force',
	后轮夹紧力: 'Rear clamp force',
	每个卡钳: 'Per caliper',
	前盘力矩: 'Front disc torque',
	后盘力矩: 'Rear disc torque',
	减速度: 'Deceleration',
	'ABS 介入': 'ABS active',
	轮胎附着以内: 'Below tyre adhesion limit',
	车轮已停: 'Wheels stopped',
	内侧活塞推出: 'Inner piston extends',
	卡钳体反向滑动: 'Caliper body slides back',
	'浮动卡钳只有内侧一个活塞，外侧那片是整个卡钳滑过来夹住的。':
		'A floating caliper has one piston on the inside. The whole caliper slides to pull the outer pad against the disc.',
	间隙放大示意: 'Exaggerated clearance',
	'活塞 · 内片': 'Piston · inner pad',
	导向销: 'Guide pin',
	外侧刹车片: 'Outer brake pad',
	总泵: 'Master cylinder',
	管路: 'Brake lines',
	卡钳: 'Calipers',
	'踏板 × 3.5 × 助力 4 ÷ 总泵面积 = 压力': 'Pedal × 3.5 × boost 4 ÷ master area = pressure',
	'夹紧力 = 压力 × 活塞面积；每盘力矩 = 2 × 0.40 × 夹紧力 × 有效半径。':
		'Clamp force = pressure × piston area. Disc torque = 2 × 0.40 × clamp force × effective radius.',
	'间隙与滑动量放大 20 倍。管路高亮用 0.3 秒解释动作先后，不表示液压传播速度。':
		'Gaps and sliding travel are enlarged 20×. The 0.3-second line highlight illustrates sequence, not hydraulic propagation speed.',
	'固定摩擦系数与四轮同压制动；减速度以 1.0 g 附着上限封顶，ABS 为限幅示意。':
		'Fixed friction and equal line pressure at all four wheels. Deceleration is capped at 1.0 g; ABS is illustrated by this adhesion limit.',
}

export function BrakeInstruments({
	stateRef,
	pedalForceN,
	speedKmh,
	onPedalForceN,
	onSpeedKmh,
	onRestart,
	clock,
}: {
	stateRef: RefObject<BrakeState>
	pedalForceN: number
	speedKmh: number
	onPedalForceN: (value: number) => void
	onSpeedKmh: (value: number) => void
	onRestart: () => void
	clock: ReactNode
}) {
	const tx = useExperienceI18n(),
		[state, setState] = useState(stateRef.current),
		[open, setOpen] = useState(true)
	const held = useRef(false),
		releaseRef = useRef(onPedalForceN)
	releaseRef.current = onPedalForceN
	useEffect(() => {
		const timer = setInterval(() => setState({...stateRef.current}), 50)
		return () => clearInterval(timer)
	}, [stateRef])
	useEffect(() => {
		const release = () => {
			if (held.current) {
				held.current = false
				releaseRef.current(0)
			}
		}
		window.addEventListener('pointerup', release)
		window.addEventListener('pointercancel', release)
		window.addEventListener('blur', release)
		return () => {
			release()
			window.removeEventListener('pointerup', release)
			window.removeEventListener('pointercancel', release)
			window.removeEventListener('blur', release)
		}
	}, [])
	const travel = caliperTravel(state),
		engaged = travel.engagement
	return (
		<aside
			className={`ct-instruments ct-brake-panel ${open ? 'is-open' : ''}`}
			aria-label={tx('制动仪表')}>
			<button className="ct-panel-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
				<span>{tx('一脚下去，两片夹紧。')}</span>
				<span className="ct-drawer-toggle">{open ? '−' : '+'}</span>
			</button>
			<div className="ct-instrument-content">
				<div className="ct-brake-pressure">
					<span>{tx('管路压力')}</span>
					<strong>
						{state.pressureBar.toFixed(1)} <small>bar</small>
					</strong>
				</div>
				<label className="ct-brake-control">
					<span>
						{tx('踏板力')} <b>{pedalForceN} N</b>
					</span>
					<input
						type="range"
						min={0}
						max={B.maxPedalForceN}
						step={5}
						value={pedalForceN}
						aria-label={tx('踏板力')}
						onChange={(e) => onPedalForceN(Number(e.target.value))}
					/>
				</label>
				<button
					className="ct-brake-hold"
					aria-pressed={pedalForceN > 0}
					style={{touchAction: 'none'}}
					onPointerDown={(e) => {
						e.preventDefault()
						e.currentTarget.setPointerCapture(e.pointerId)
						held.current = true
						onPedalForceN(B.holdPedalForceN)
					}}
					onPointerUp={() => {
						held.current = false
						onPedalForceN(0)
					}}
					onPointerCancel={() => {
						held.current = false
						onPedalForceN(0)
					}}
					onLostPointerCapture={() => {
						if (held.current) {
							held.current = false
							onPedalForceN(0)
						}
					}}
					onKeyDown={(e) => {
						if (e.key === ' ' || e.key === 'Enter') {
							e.preventDefault()
							held.current = true
							onPedalForceN(B.holdPedalForceN)
						}
					}}
					onKeyUp={(e) => {
						if (e.key === ' ' || e.key === 'Enter') {
							held.current = false
							onPedalForceN(0)
						}
					}}
					onBlur={() => {
						if (held.current) {
							held.current = false
							onPedalForceN(0)
						}
					}}>
					{tx(held.current ? '松开踏板' : '按住制动')}
				</button>
				<label className="ct-brake-control">
					<span>
						{tx('初始车速')} <b>{speedKmh} km/h</b>
					</span>
					<input
						type="range"
						min={0}
						max={B.maximumSpeedKmh}
						step={5}
						value={speedKmh}
						aria-label={tx('初始车速')}
						onChange={(e) => onSpeedKmh(Number(e.target.value))}
					/>
				</label>
				<button className="ct-brake-restart" onClick={onRestart}>
					{tx('重新滚动')} ↻
				</button>
				<p className="ct-transmission-fact">
					{tx('浮动卡钳只有内侧一个活塞，外侧那片是整个卡钳滑过来夹住的。')}
				</p>
				<div className="ct-brake-sequence">
					{['总泵', '管路', '卡钳'].map((label, i) => (
						<span
							key={label}
							className={state.pressureFrontProgress > [0, 0.3, 0.75][i] ? 'is-active' : ''}>
							{tx(label)}
							{i < 2 ? ' →' : ''}
						</span>
					))}
				</div>
				<svg
					className="ct-brake-caliper-diagram"
					viewBox="0 0 260 84"
					aria-label={tx('卡钳体反向滑动')}>
					<rect x="123" y="12" width="14" height="54" fill="#737b82" />
					<g transform={`translate(${engaged * 4},0)`}>
						<rect x="99" y="16" width="20" height="46" fill="#424a50" />
						<path d="M69 39h22m-6-5 6 5-6 5" fill="none" stroke="#e4af70" />
					</g>
					<g transform={`translate(${-engaged * 4},0)`}>
						<path d="M78 16V7H166V65H141" fill="none" stroke="#a8bdcd" strokeWidth="4" />
						<rect x="141" y="16" width="20" height="46" fill="#424a50" />
						<path d="M198 39h-22m6-5-6 5 6 5" fill="none" stroke="#e4af70" />
					</g>
					<text x="8" y="80" fill="#aebbc6" fontSize="9">
						{tx('内侧活塞推出')}
					</text>
					<text x="252" y="80" fill="#aebbc6" fontSize="9" textAnchor="end">
						{tx('卡钳体反向滑动')}
					</text>
				</svg>
				<p className="ct-mechanism-note">
					<strong>{tx('间隙放大示意')} · 20×</strong>
				</p>
				<dl className="ct-brake-readings">
					<div>
						<dt>{tx('当前车速')}</dt>
						<dd>
							{state.speedKmh.toFixed(1)} <small>km/h</small>
						</dd>
					</div>
					<div>
						<dt>{tx('前轮夹紧力')}</dt>
						<dd>
							{(state.frontClampN / 1000).toFixed(1)} <small>kN</small>
						</dd>
					</div>
					<div>
						<dt>{tx('后轮夹紧力')}</dt>
						<dd>
							{(state.rearClampN / 1000).toFixed(1)} <small>kN</small>
						</dd>
					</div>
					<div>
						<dt>{tx('前盘力矩')}</dt>
						<dd>
							{Math.round(state.frontTorqueNm)} <small>N·m</small>
						</dd>
					</div>
					<div>
						<dt>{tx('后盘力矩')}</dt>
						<dd>
							{Math.round(state.rearTorqueNm)} <small>N·m</small>
						</dd>
					</div>
					<div>
						<dt>{tx('减速度')}</dt>
						<dd>
							{(state.decelerationMps2 / B.gravity).toFixed(2)} <small>g</small>
						</dd>
					</div>
				</dl>
				<p className={`ct-brake-abs ${state.absActive ? 'is-active' : ''}`}>
					{tx(state.speedMps === 0 ? '车轮已停' : state.absActive ? 'ABS 介入' : '轮胎附着以内')}
				</p>
				{clock}
				<p className="ct-mechanism-note">{tx('踏板 × 3.5 × 助力 4 ÷ 总泵面积 = 压力')}</p>
				<p className="ct-mechanism-note">
					{tx('夹紧力 = 压力 × 活塞面积；每盘力矩 = 2 × 0.40 × 夹紧力 × 有效半径。')}
				</p>
				<p className="ct-mechanism-note">
					{tx('间隙与滑动量放大 20 倍。管路高亮用 0.3 秒解释动作先后，不表示液压传播速度。')}
				</p>
				<p className="ct-mechanism-note">
					{tx('固定摩擦系数与四轮同压制动；减速度以 1.0 g 附着上限封顶，ABS 为限幅示意。')}
				</p>
			</div>
		</aside>
	)
}
