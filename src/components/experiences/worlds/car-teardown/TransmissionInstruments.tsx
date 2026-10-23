import {useEffect, useState, type RefObject} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {VEHICLE_SPEC as S, type Gear} from './vehicle-spec'
import {finalDriveRatio, gearRatio} from './model'
import type {TransmissionState} from './transmission-model'
export function TransmissionInstruments({
	stateRef,
	gear,
	onGear,
	rpm,
	slowdown,
	paused,
	onRpm,
	onSlowdown,
	onPaused,
}: {
	stateRef: RefObject<TransmissionState>
	gear: Gear
	onGear: (g: Gear) => void
	rpm: number
	slowdown: number
	paused: boolean
	onRpm: (v: number) => void
	onSlowdown: (v: number) => void
	onPaused: (v: boolean) => void
}) {
	const tx = useExperienceI18n(),
		[state, setState] = useState(stateRef.current),
		[open, setOpen] = useState(true)
	useEffect(() => {
		const timer = setInterval(() => setState({...stateRef.current}), 50)
		return () => clearInterval(timer)
	}, [stateRef])
	const ratio = gearRatio(state.gear)
	const positions: {gear: Gear; x: number; y: number}[] = [
		{gear: 'R', x: 28, y: 82},
		{gear: 1, x: 86, y: 25},
		{gear: 2, x: 86, y: 137},
		{gear: 3, x: 145, y: 25},
		{gear: 4, x: 145, y: 137},
		{gear: 5, x: 204, y: 25},
		{gear: 'N', x: 204, y: 82},
	]
	return (
		<aside
			className={`ct-instruments ct-transmission-panel ${open ? 'is-open' : ''}`}
			aria-label={tx('传动仪表')}>
			<button className="ct-panel-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
				<span>{tx('五挡手动变速箱')}</span>
				<span className="ct-drawer-toggle">{open ? '−' : '+'}</span>
			</button>
			<div className="ct-instrument-content">
				<div className="ct-gear-readout">
					<strong>{state.gear}</strong>
					<span>
						{tx(state.shiftPhase === 'steady' ? '已接合' : '换挡中')}
						<small>
							{tx('离合接合')} {Math.round(state.clutchEngagement * 100)}%
						</small>
					</span>
				</div>
				<svg className="ct-h-pattern" viewBox="0 0 232 164" aria-label={tx('选择挡位')}>
					<path d="M28 82H204 M86 25V137 M145 25V137 M204 25V82" />
					{positions.map((p) => (
						<g
							key={p.gear}
							role="button"
							tabIndex={0}
							aria-label={`${p.gear} ${tx('挡')}`}
							data-gear={p.gear}
							className={gear === p.gear ? 'is-active' : ''}
							onClick={() => onGear(p.gear)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									onGear(p.gear)
								}
							}}>
							<circle cx={p.x} cy={p.y} r={18} />
							<text x={p.x} y={p.y + 5} textAnchor="middle">
								{p.gear}
							</text>
						</g>
					))}
				</svg>
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
					type="range"
					min={S.engine.idleRpm}
					max={S.engine.redlineRpm}
					step={100}
					value={rpm}
					aria-label={tx('真实转速')}
					onChange={(e) => onRpm(Number(e.target.value))}
				/>
				<div className="ct-slow-controls">
					{[10, 40, 100, 400].map((v) => (
						<button key={v} aria-pressed={slowdown === v} onClick={() => onSlowdown(v)}>
							1/{v}
						</button>
					))}
					<button aria-label={tx(paused ? '播放' : '暂停')} onClick={() => onPaused(!paused)}>
						{tx(paused ? '播放' : '暂停')}
					</button>
				</div>
				<dl className="ct-transmission-readings">
					<div>
						<dt>{tx('挡位传动比')}</dt>
						<dd>{ratio === null ? '—' : Math.abs(ratio).toFixed(3)}</dd>
					</div>
					<div>
						<dt>{tx('总传动比')}</dt>
						<dd>{ratio === null ? '—' : Math.abs(ratio * finalDriveRatio()).toFixed(3)}</dd>
					</div>
					<div>
						<dt>{tx('输出轴转速')}</dt>
						<dd>{Math.round(state.outputRpm).toLocaleString('en-US')} rpm</dd>
					</div>
					<div>
						<dt>{tx('车轮转速')}</dt>
						<dd>{Math.round(state.wheelRpm).toLocaleString('en-US')} rpm</dd>
					</div>
					<div className="ct-speed">
						<dt>{tx('理论车速')}</dt>
						<dd>
							{Math.abs(state.speedKmh).toFixed(1)} <small>km/h</small>
						</dd>
					</div>
				</dl>
				<p className="ct-transmission-fact">
					{tx('所有齿轮一直咬在一起转，换挡只是把其中一个锁到输出轴上。')}
				</p>
				<p className="ct-mechanism-note">
					{tx('车轮悬空；车速按轮胎滚动半径计算。同步器转速匹配为运动学示意。')}
				</p>
			</div>
		</aside>
	)
}
