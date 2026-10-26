import {useRef, useState} from 'react'
import {useExperienceI18n} from '~/i18n/experience'
import {createSteeringState} from './steering-model'
import {createBrakeState} from './brake-model'
import {createSuspensionState} from './suspension-model'
import {SteeringInstruments} from './SteeringInstruments'
import {BrakeInstruments} from './BrakeInstruments'
import {SuspensionInstruments} from './SuspensionInstruments'
import type {SystemId} from './parts'
import {VEHICLE_SPEC as S} from './vehicle-spec'

export const isRoadMechanism = (id: SystemId | null) => id === 'steering' || id === 'brakes' || id === 'chassis'
export function useMechanisms() {
	const steeringRef = useRef(createSteeringState())
	const brakeRef = useRef(createBrakeState(40))
	const suspensionRef = useRef(createSuspensionState())
	const [wheelAngle, setWheelAngle] = useState(360)
	const [steeringSpeed, setSteeringSpeed] = useState(20)
	const [steeringView, setSteeringView] = useState<'top' | 'perspective' | 'differential'>('top')
	const [pedalForce, setPedalForce] = useState(0)
	const [brakeSpeed, setBrakeSpeed] = useState(40)
	const [brakeRestart, setBrakeRestart] = useState(0)
	const [brakeView, setBrakeView] = useState<'overview' | 'caliper'>('caliper')
	const [suspensionSpeed, setSuspensionSpeed] = useState(30)
	const [bumpHeight, setBumpHeight] = useState<number>(S.suspension.bumpHeight)
	const [damping, setDamping] = useState<number>(S.suspension.damping)
	const [suspensionRestart, setSuspensionRestart] = useState(0)
	return {
		steeringRef,
		brakeRef,
		suspensionRef,
		wheelAngle,
		setWheelAngle,
		steeringSpeed,
		setSteeringSpeed,
		steeringView,
		setSteeringView,
		pedalForce,
		setPedalForce,
		brakeSpeed,
		setBrakeSpeed,
		brakeRestart,
		setBrakeRestart,
		brakeView,
		setBrakeView,
		suspensionSpeed,
		setSuspensionSpeed,
		bumpHeight,
		setBumpHeight,
		damping,
		setDamping,
		suspensionRestart,
		setSuspensionRestart,
	}
}
export type Mechanisms = ReturnType<typeof useMechanisms>
export function MechanismPanel({
	selected,
	model: m,
	slowdown,
	paused,
	onSlowdown,
	onPaused,
	onInteract,
}: {
	selected: SystemId | null
	model: Mechanisms
	slowdown: number
	paused: boolean
	onSlowdown: (n: number) => void
	onPaused: (v: boolean) => void
	onInteract: () => void
}) {
	const tx = useExperienceI18n()
	const change =
		<T,>(set: (v: T) => void) =>
		(value: T) => {
			onInteract()
			set(value)
		}
	const clock = (
		<div className="ct-mechanism-clock">
			<div>
				<span>{tx('画面时间')}</span>
				<strong>{slowdown === 1 ? tx('实时') : `1/${slowdown}`}</strong>
			</div>
			<div className="ct-slow-controls">
				{[1, 2, 5, 10, 40, 100, 400].map((v) => (
					<button key={v} aria-pressed={slowdown === v} onClick={() => onSlowdown(v)}>
						{v === 1 ? '1×' : `1/${v}`}
					</button>
				))}
				<button onClick={() => onPaused(!paused)} aria-label={tx(paused ? '播放' : '暂停')}>
					{tx(paused ? '播放' : '暂停')}
				</button>
			</div>
		</div>
	)
	if (selected === 'steering')
		return (
			<SteeringInstruments
				stateRef={m.steeringRef}
				wheelAngle={m.wheelAngle}
				speedKmh={m.steeringSpeed}
				onWheelAngle={change(m.setWheelAngle)}
				onSpeedKmh={change(m.setSteeringSpeed)}
				clock={clock}
			/>
		)
	if (selected === 'brakes')
		return (
			<BrakeInstruments
				stateRef={m.brakeRef}
				pedalForceN={m.pedalForce}
				speedKmh={m.brakeSpeed}
				onPedalForceN={change(m.setPedalForce)}
				onSpeedKmh={change(m.setBrakeSpeed)}
				onRestart={() => {
					onInteract()
					m.setBrakeRestart((v) => v + 1)
				}}
				clock={clock}
			/>
		)
	if (selected === 'chassis')
		return (
			<SuspensionInstruments
				stateRef={m.suspensionRef}
				speedKmh={m.suspensionSpeed}
				bumpHeight={m.bumpHeight}
				damping={m.damping}
				onSpeedKmh={change(m.setSuspensionSpeed)}
				onBumpHeight={change(m.setBumpHeight)}
				onDamping={change(m.setDamping)}
				onRestart={() => {
					onInteract()
					m.setSuspensionRestart((v) => v + 1)
				}}
				clock={clock}
			/>
		)
	return null
}
export function MechanismViews({selected, model: m, onInteract}: {selected: SystemId | null; model: Mechanisms; onInteract: () => void}) {
	const tx = useExperienceI18n()
	return (
		<div className="ct-view-switch">
			{selected === 'steering' &&
				(
					[
						['top', '俯视'],
						['perspective', '转向机构'],
						['differential', '差速器特写'],
					] as const
				).map(([view, label]) => (
					<button
						key={view}
						data-view={view}
						className={m.steeringView === view ? 'is-active' : ''}
						onClick={() => {
							onInteract()
							m.setSteeringView(view)
						}}
					>
						{tx(label)}
					</button>
				))}
			{selected === 'brakes' &&
				(
					[
						['overview', '液压全景'],
						['caliper', '前卡钳特写'],
					] as const
				).map(([view, label]) => (
					<button
						key={view}
						data-view={view}
						className={m.brakeView === view ? 'is-active' : ''}
						onClick={() => {
							onInteract()
							m.setBrakeView(view)
						}}
					>
						{tx(label)}
					</button>
				))}
		</div>
	)
}
