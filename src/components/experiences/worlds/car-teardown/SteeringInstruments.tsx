import {useEffect, useState, type ReactNode, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {STEERING_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import {STEERING_WHEELS, type SteeringState} from './steering-model'

export const STEERING_EN: Record<string, string> = {
	齿圈: 'Ring gear',
	半轴齿轮: 'Side gear',
	行星齿轮: 'Planet gear',
	齿: 'teeth',
	转向仪表: 'Steering instruments',
	'四个轮子，四条轨迹。': 'Four wheels. Four paths.',
	方向盘角: 'Steering wheel angle',
	方向盘角度: 'Steering wheel angle',
	行驶速度: 'Road speed',
	回正方向盘: 'Centre steering',
	齿条位移: 'Rack travel',
	内轮转角: 'Inner wheel angle',
	外轮转角: 'Outer wheel angle',
	后轴中心半径: 'Rear-centre radius',
	转弯直径: 'Turning diameter',
	前左轮: 'Front left',
	前右轮: 'Front right',
	后左轮: 'Rear left',
	后右轮: 'Rear right',
	四轮真实转速: 'Actual wheel speeds',
	差速器壳转速: 'Carrier speed',
	行星齿轮自转: 'Planet spin',
	转弯中心: 'Turn centre',
	直行: 'Straight',
	外前轮轨迹直径: 'Outside front-wheel path diameter',
	'转弯时外侧轮要多走一段路，差速器让左右轮可以转得不一样快。':
		'The outside wheel travels farther in a turn. The differential lets the two wheels rotate at different speeds.',
	'理想阿克曼，不计轮胎侧偏。车速取后轴中心；画面保持车身原地，轮速按各自轨迹计算。':
		'Ideal Ackermann, with no tyre slip angle. Road speed is measured at the rear-axle centre; the car stays in place while each wheel follows its own path speed.',
	'两对等角万向节消除转速波动。桥内为直齿锥齿轮示意，未模拟真实准双曲面齿面。':
		'The equal-angle universal-joint pair cancels speed fluctuation. The axle uses illustrative straight bevel teeth, not production hypoid surfaces.',
	'齿圈 = 左右后轮平均；行星自转 = 轮速差 ÷ 2 × 16/10。':
		'Ring speed = rear-wheel average. Planet spin = half the speed difference × 16/10.',
}
const NAMES = ['前左轮', '前右轮', '后左轮', '后右轮']
const degrees = (radians: number) => (radians * 180) / Math.PI
const finite = (n: number, precision = 2) => (Number.isFinite(n) ? n.toFixed(precision) : '∞')
export function SteeringInstruments({
	stateRef,
	wheelAngle,
	speedKmh,
	onWheelAngle,
	onSpeedKmh,
	clock,
}: {
	stateRef: RefObject<SteeringState>
	wheelAngle: number
	speedKmh: number
	onWheelAngle: (angle: number) => void
	onSpeedKmh: (speed: number) => void
	clock: ReactNode
}) {
	const tx = useExperienceI18n(),
		[state, setState] = useState(stateRef.current),
		[open, setOpen] = useState(true)
	useEffect(() => {
		const timer = setInterval(() => setState(stateRef.current), 50)
		return () => clearInterval(timer)
	}, [stateRef])
	return (
		<aside
			className={`ct-instruments ct-steering-panel ${open ? 'is-open' : ''}`}
			aria-label={tx('转向仪表')}>
			<button className="ct-panel-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
				<span>{tx('四个轮子，四条轨迹。')}</span>
				<span className="ct-drawer-toggle">{open ? '−' : '+'}</span>
			</button>
			<div className="ct-instrument-content">
				<p className="ct-transmission-fact">
					{tx('转弯时外侧轮要多走一段路，差速器让左右轮可以转得不一样快。')}
				</p>
				<div className="ct-mechanism-status">
					<span>{tx('转弯直径')}</span>
					<strong>
						{finite(state.turningDiameter, 1)} <small>m</small>
					</strong>
				</div>
				<label className="ct-brake-control">
					<span>
						{tx('方向盘角')}{' '}
						<b>
							{wheelAngle > 0 ? '+' : ''}
							{wheelAngle}°
						</b>
					</span>
					<input
						type="range"
						min={-S.steering.maxSteeringWheelAngle}
						max={S.steering.maxSteeringWheelAngle}
						step={5}
						value={wheelAngle}
						aria-label={tx('方向盘角度')}
						onChange={(e) => onWheelAngle(Number(e.target.value))}
					/>
				</label>
				<button className="ct-mechanism-action" onClick={() => onWheelAngle(0)}>
					{tx('回正方向盘')}
				</button>
				<label className="ct-brake-control">
					<span>
						{tx('行驶速度')} <b>{speedKmh} km/h</b>
					</span>
					<input
						type="range"
						min={0}
						max={G.maxSpeedKmh}
						step={1}
						value={speedKmh}
						aria-label={tx('行驶速度')}
						onChange={(e) => onSpeedKmh(Number(e.target.value))}
					/>
				</label>
				<dl className="ct-brake-readings">
					<div>
						<dt>{tx('齿条位移')}</dt>
						<dd>
							{(state.rackTravel * 1000).toFixed(1)} <small>mm</small>
						</dd>
					</div>
					<div>
						<dt>{tx('后轴中心半径')}</dt>
						<dd>
							{finite(state.radius)} <small>m</small>
						</dd>
					</div>
					<div>
						<dt>{tx('内轮转角')}</dt>
						<dd>{degrees(state.innerAngle).toFixed(1)}°</dd>
					</div>
					<div>
						<dt>{tx('外轮转角')}</dt>
						<dd>{degrees(state.outerAngle).toFixed(1)}°</dd>
					</div>
				</dl>
				<div className="ct-mechanism-status">
					<span>{tx('四轮真实转速')}</span>
					<span>rpm</span>
				</div>
				<dl className="ct-brake-readings ct-steering-wheels">
					{STEERING_WHEELS.map((id, i) => (
						<div key={id}>
							<dt>{tx(NAMES[i])}</dt>
							<dd>{state.wheelRpm[id].toFixed(1)}</dd>
						</div>
					))}
				</dl>
				<dl className="ct-brake-readings">
					<div>
						<dt>{tx('差速器壳转速')}</dt>
						<dd>
							{state.carrierRpm.toFixed(1)} <small>rpm</small>
						</dd>
					</div>
					<div>
						<dt>{tx('行星齿轮自转')}</dt>
						<dd>
							{state.planetSpinRpm.toFixed(1)} <small>rpm</small>
						</dd>
					</div>
				</dl>
				{clock}

				<p className="ct-mechanism-note">
					{tx('齿圈 = 左右后轮平均；行星自转 = 轮速差 ÷ 2 × 16/10。')}
				</p>
				<p className="ct-mechanism-note">
					{tx('理想阿克曼，不计轮胎侧偏。车速取后轴中心；画面保持车身原地，轮速按各自轨迹计算。')}
				</p>
				<p className="ct-mechanism-note">
					{tx('两对等角万向节消除转速波动。桥内为直齿锥齿轮示意，未模拟真实准双曲面齿面。')}
				</p>
			</div>
		</aside>
	)
}
