import { CarGuide } from './CarGuide'
import { assemblyFor, assemblyParts, ASSEMBLIES } from './subassemblies'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { CarScene, type AnchorMap } from './Scene'
import { EngineeringLabels, EngineInstruments } from './Instruments'
import {
	EnginePartsList,
	EnginePartLabels,
	EnginePartCard,
	type PartAnchors,
} from './EnginePartsUI'
import { SYSTEMS, PARTS, partCount, type SystemId } from './parts'
import { suggestedSlowdown } from './model'
import { VEHICLE_SPEC as S, type Gear } from './vehicle-spec'
import { createTransmissionState } from './transmission-model'
import { TransmissionInstruments } from './TransmissionInstruments'
import { useMechanisms, MechanismPanel, MechanismViews, isRoadMechanism } from './MechanismControls'
import { teardownParts } from './teardown-registry'
import { SteelLegend } from './SteelLegend'
import './styles/car-teardown.css'
import { usePartText } from './localized-parts'

class SceneBoundary extends Component<
	{ children: ReactNode; message: string },
	{ failed: boolean }
> {
	state = { failed: false }
	static getDerivedStateFromError() {
		return { failed: true }
	}
	render() {
		return this.state.failed ? (
			<div className="ct-error">{this.props.message}</div>
		) : (
			this.props.children
		)
	}
}
export function CarTeardown({ controls, label }: { controls: ExperienceControls; label?: string }) {
	const tx = useExperienceI18n()
	const partText = usePartText()
	const [guideOpen, setGuideOpen] = useState(false)
	const [guideActive, setGuideActive] = useState(false)
	const [guideStep, setGuideStep] = useState(0)
	const guideTimers = useRef<ReturnType<typeof setTimeout>[]>([])
	const clearGuideTimers = useCallback(() => {
		guideTimers.current.forEach(clearTimeout)
		guideTimers.current = []
	}, [])
	useEffect(() => clearGuideTimers, [clearGuideTimers])
	const [captureMode, setCaptureMode] = useState(false)
	const [explode, setExplode] = useState(0)
	const [partsExplode, setPartsExplode] = useState(0)
	const [assemblyId, setAssemblyId] = useState('')
	const [hoveredPart, setHoveredPart] = useState<string | null>(null)
	const [selectedPart, setSelectedPart] = useState<string | null>(null)
	const partAnchorsRef = useRef<PartAnchors>({})
	const currentPartsExplode = useRef(0)
	currentPartsExplode.current = partsExplode
	const [selected, setSelected] = useState<SystemId | null>(null)
	const [hovered, setHovered] = useState<SystemId | null>(null)
	const [gear, setGear] = useState<Gear>('N')
	const [transmissionView, setTransmissionView] = useState<'gearbox' | 'path'>('gearbox')
	const transmissionRef = useRef(createTransmissionState())
	const mechanisms = useMechanisms()
	const [rpm, setRpm] = useState<number>(S.engine.idleRpm)
	const [slowdown, setSlowdown] = useState<number>(40)
	const [paused, setPaused] = useState(false)
	// The DOM and r3f have separate render roots. Freeze their shared clock before
	// scheduling React state, otherwise a scrub can advance one extra frame.
	const pausedRef = useRef(false)
	const [xray, setXray] = useState(false)
	const [ready, setReady] = useState(false)
	const [reducedMotion, setReducedMotion] = useState(false)
	const angleRef = useRef(25)
	const interactionRef = useRef(false)
	const anchorsRef = useRef<AnchorMap>({})
	const animationRef = useRef(0)
	const currentExplode = useRef(0)
	currentExplode.current = explode
	useEffect(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)')
		const sync = () => {
			setReducedMotion(media.matches)
			if (media.matches) {
				pausedRef.current = true
				setPaused(true)
			}
		}
		sync()
		media.addEventListener('change', sync)
		return () => {
			media.removeEventListener('change', sync)
			cancelAnimationFrame(animationRef.current)
		}
	}, [])
	const interact = useCallback(() => {
		interactionRef.current = true
		controls.registerInteraction()
	}, [controls.registerInteraction])
	const select = useCallback(
		(id: SystemId) => {
			interact()
			cancelAnimationFrame(animationRef.current)
			setExplode(1)
			setSelectedPart(null)
			setHoveredPart(null)
			setPartsExplode(0)
			setAssemblyId('')
			if (isRoadMechanism(id) && !isRoadMechanism(selected)) setSlowdown(1)
			if (!isRoadMechanism(id) && isRoadMechanism(selected) && slowdown < 10)
				setSlowdown(suggestedSlowdown(rpm))
			if (id === 'chassis') mechanisms.setSuspensionRestart((n) => n + 1)
			// Open the engine in X-ray: the running four-stroke is the frame worth seeing first.
			if (id === 'powertrain' && selected !== 'powertrain') setXray(true)
			setSelected(id)
			setHovered(null)
		},
		[interact, selected, slowdown, rpm, mechanisms.setSuspensionRestart],
	)
	const returnToSystems = useCallback(() => {
		setSelected(null)
		setHovered(null)
		setSelectedPart(null)
		setHoveredPart(null)
	}, [])
	const animate = useCallback(
		(target: number) => {
			interact()
			returnToSystems()
			cancelAnimationFrame(animationRef.current)
			if (reducedMotion) {
				setExplode(target)
				return
			}
			const from = currentExplode.current,
				start = performance.now()
			const tick = (time: number) => {
				const t = Math.min(1, (time - start) / (S.explosion.duration * 1000))
				setExplode(from + (target - from) * t)
				if (t < 1) animationRef.current = requestAnimationFrame(tick)
			}
			animationRef.current = requestAnimationFrame(tick)
		},
		[interact, reducedMotion, returnToSystems],
	)
	const animateParts = useCallback(
		(target: number) => {
			interact()
			cancelAnimationFrame(animationRef.current)
			const from = currentPartsExplode.current,
				start = performance.now()
			if (reducedMotion) {
				setPartsExplode(target)
				return
			}
			const tick = (time: number) => {
				const t = Math.min(1, (time - start) / 1600)
				setPartsExplode(from + (target - from) * t * t * (3 - 2 * t))
				if (t < 1) animationRef.current = requestAnimationFrame(tick)
			}
			animationRef.current = requestAnimationFrame(tick)
		},
		[interact, reducedMotion],
	)
	const guideAction = useRef<(index: number) => void>(() => {})
	guideAction.current = (index) => {
		clearGuideTimers()
		cancelAnimationFrame(animationRef.current)
		setGuideActive(true)
		setGuideStep(index)
		setSelectedPart(null)
		setHoveredPart(null)
		setPartsExplode(0)
		setAssemblyId('')
		pausedRef.current = false
		setPaused(false)
		setSlowdown(40)
		setRpm(1200)
		setHovered(null)
		const later = (ms: number, fn: () => void) => {
			guideTimers.current.push(setTimeout(fn, ms))
		}
		const system = (id: SystemId) => {
			setSelected(id)
			setExplode(1)
			interactionRef.current = true
		}
		if (index === 0) {
			setSelected(null)
			setExplode(0)
			interactionRef.current = false
		}
		if (index === 1) {
			setSelected(null)
			setExplode(0)
			interactionRef.current = true
			later(250, () => animate(1))
		}
		if (index === 2) {
			system('powertrain')
			setXray(true)
		}
		if (index === 3) {
			system('powertrain')
			setXray(false)
			later(500, () => animateParts(1))
		}
		if (index === 4) {
			system('drivetrain')
			setTransmissionView('gearbox')
			setGear(1)
			later(3500, () => setGear(3))
		}
		if (index === 5) {
			system('steering')
			setSlowdown(10)
			mechanisms.setWheelAngle(520)
			mechanisms.setSteeringView('top')
			later(4800, () => mechanisms.setSteeringView('differential'))
		}
		if (index === 6) {
			system('brakes')
			setSlowdown(5)
			mechanisms.setBrakeView('overview')
			mechanisms.setPedalForce(0)
			mechanisms.setBrakeRestart((n) => n + 1)
			later(1600, () => mechanisms.setPedalForce(300))
			later(5000, () => mechanisms.setBrakeView('caliper'))
		}
		if (index === 7) {
			system('chassis')
			setSlowdown(2)
			mechanisms.setSuspensionRestart((n) => n + 1)
			later(1800, () => mechanisms.setSuspensionRestart((n) => n + 1))
			later(6000, () => mechanisms.setSuspensionRestart((n) => n + 1))
		}
		if (index === 8) {
			system('body')
			later(400, () => animateParts(1))
		}
	}
	const onGuideStep = useCallback((index: number) => guideAction.current(index), [])
	const exitGuide = useCallback(() => {
		clearGuideTimers()
		cancelAnimationFrame(animationRef.current)
		setGuideOpen(false)
		setGuideActive(false)
	}, [clearGuideTimers])

	const onReady = useCallback(() => setReady(true), [])
	const selectedSystem = SYSTEMS.find((s) => s.id === selected)
	const assembly = partsExplode > 0.02 ? assemblyFor(selected, assemblyId) : undefined
	const selectedParts = assembly ? assemblyParts(assembly) : teardownParts(selected)
	useEffect(() => {
		const query = new URLSearchParams(window.location.search)
		const capture = query.get('capture') === '1'
		setAssemblyId(query.get('assembly') ?? '')
		if (query.get('tour') === '1') setGuideOpen(true)
		// The poster is the seven-system split: the most legible "layer by layer" frame at thumbnail size.
		const requested = query.get('system')
		if (capture) {
			setCaptureMode(true)
			pausedRef.current = true
			setPaused(true)
		}
		const view = query.get('view')
		if (view === 'side' || view === 'rear') interactionRef.current = true
		if (['top', 'perspective', 'differential'].includes(view ?? ''))
			mechanisms.setSteeringView(view as 'top' | 'perspective' | 'differential')
		if (view === 'caliper' || view === 'overview') mechanisms.setBrakeView(view)
		if (view === 'gearbox' || view === 'path') setTransmissionView(view)
		if (query.has('wheel'))
			mechanisms.setWheelAngle(Math.max(-540, Math.min(540, Number(query.get('wheel')) || 0)))
		if (query.has('pedal'))
			mechanisms.setPedalForce(Math.max(0, Math.min(400, Number(query.get('pedal')) || 0)))
		const requestedGear = query.get('gear')
		if (['R', 'N', '1', '2', '3', '4', '5'].includes(requestedGear ?? ''))
			setGear(
				(requestedGear === 'R' || requestedGear === 'N'
					? requestedGear
					: Number(requestedGear)) as Gear,
			)
		if (requested || capture) {
			interactionRef.current = true
			setExplode(1)
			if (SYSTEMS.some((system) => system.id === requested)) {
				setSelected(requested as SystemId)
				if (requested === 'powertrain' && query.get('xray') !== '0') setXray(true)
				const amount = Number(query.get('parts') ?? (capture ? 1 : 0))
				setPartsExplode(Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0)
				if (isRoadMechanism(requested as SystemId)) setSlowdown(10)
			}
		}
	}, [])
	return (
		<div
			className={`ct-world ${selected ? 'has-selection' : ''} ${isRoadMechanism(selected) ? 'is-mechanism' : ''} ${selected === 'powertrain' ? 'is-engine' : ''} ${partsExplode > 0.05 && selected ? 'is-parts' : ''} ${captureMode ? 'is-capture' : ''} ${guideActive ? 'is-guided' : ''}`}
			data-guide-step={guideStep + 1}
			onPointerDown={interact}
			onWheel={interact}
			role="region"
			aria-label={label}
			data-ready={ready}
			data-capture={captureMode}
			data-assembly={assembly?.id ?? ''}
			data-explode={explode.toFixed(3)}
			data-parts-explode={partsExplode.toFixed(3)}
			data-selected={selected ?? 'car'}
			data-hovered-part={hoveredPart ?? ''}
			data-selected-part={selectedPart ?? ''}
		>
			<SceneBoundary message={tx('三维画面未能启动，请重新载入或开启浏览器硬件加速。')}>
				<CarScene
					{...{
						captureMode,
						assembly,
						explode,
						selected,
						hovered,
						xray,
						rpm,
						slowdown,
						pausedRef,
						reducedMotion,
						angleRef,
						anchorsRef,
						interactionRef,
						partsExplode,
						hoveredPart,
						selectedPart,
						partAnchorsRef,
						gear,
						transmissionRef,
						transmissionView,
						mechanisms,
					}}
					onSelect={select}
					onHover={setHovered}
					onInteract={interact}
					onReady={onReady}
					onHoverPart={setHoveredPart}
					onSelectPart={(id) => {
						interact()
						setSelectedPart(id)
					}}
				/>
			</SceneBoundary>
			<CarGuide open={guideOpen} onStep={onGuideStep} onExit={exitGuide} />
			{!guideActive && !captureMode && (
				<button className="ct-guide-start" onClick={() => setGuideOpen(true)}>
					{partText({ zh: '九站导览', en: 'Take the tour' })}
					<span>↗</span>
				</button>
			)}
			<nav className="ct-breadcrumb" aria-label={tx('拆解导航')}>
				<button
					onClick={() => {
						interact()
						returnToSystems()
					}}
				>
					{tx('整车')}
				</button>
				<span>/</span>
				{selectedSystem ? (
					<>
						<button
							onClick={() => {
								interact()
								returnToSystems()
							}}
						>
							{tx(selectedSystem.name)}
						</button>
						{selected === 'powertrain' && (
							<>
								<span>/</span>
								<span>{tx('发动机')}</span>
							</>
						)}
					</>
				) : (
					<span>{tx(explode > 0.1 ? '七个系统' : '结构探索')}</span>
				)}
			</nav>
			<div className="ct-title">
				<h1>
					{tx(
						selected === 'powertrain'
							? '四个缸，轮流做功。'
							: selected === 'drivetrain'
								? '齿轮常啮合，换挡只锁一个。'
								: selected === 'steering'
									? '转一个弯，四个轮速。'
									: selected === 'brakes'
										? '一脚踏板，四轮同时夹紧。'
										: selected === 'chassis'
											? '轮子过坎，车身慢一点。'
											: '一辆车，一层一层拆开。',
					)}
				</h1>
				<p>
					{tx(
						selected === 'powertrain'
							? '曲轴每转两圈，每个缸点一次火。'
							: selected === 'drivetrain'
								? '沿琥珀色路径，看动力怎样抵达后轮。'
								: selected === 'steering'
									? '转向决定轨迹，差速器分配左右轮速。'
									: selected === 'brakes'
										? '从液压到摩擦，动能变成热。'
										: selected === 'chassis'
											? '弹簧承受冲击，阻尼让振动停下来。'
											: '前置纵置 · 后轮驱动 · 2.0 升直列四缸',
					)}
				</p>
			</div>
			<EngineeringLabels
				anchorsRef={anchorsRef}
				visible={explode > 0.78 && !selected}
				hovered={hovered}
				onHover={setHovered}
				onSelect={select}
			/>
			{!assembly && <MechanismViews selected={selected} model={mechanisms} onInteract={interact} />}
			{assembly && (
				<div className="ct-view-switch ct-assembly-switch" aria-label={tx('子总成')}>
					{ASSEMBLIES.filter((a) => a.system === selected).map((a) => (
						<button
							key={a.id}
							data-assembly={a.id}
							className={a.id === assembly.id ? 'is-active' : ''}
							onClick={() => {
								interact()
								setAssemblyId(a.id)
								setSelectedPart(null)
								setHoveredPart(null)
							}}
						>
							{partText(a.name)}
						</button>
					))}
				</div>
			)}
			{(explode > 0.7 || selected) && (
				<select
					className="ct-system-picker"
					value={selected ?? ''}
					aria-label={tx('选择系统')}
					onChange={(e) =>
						e.target.value ? select(e.target.value as SystemId) : returnToSystems()
					}
				>
					<option value="">{tx('全部系统')}</option>
					{SYSTEMS.map((s) => (
						<option key={s.id} value={s.id}>
							{tx(s.name)}
						</option>
					))}
				</select>
			)}
			{selected === 'drivetrain' && !assembly && (
				<div className="ct-view-switch">
					<button
						className={transmissionView === 'gearbox' ? 'is-active' : ''}
						onClick={() => {
							interact()
							setTransmissionView('gearbox')
						}}
					>
						{tx('齿轮特写')}
					</button>
					<button
						className={transmissionView === 'path' ? 'is-active' : ''}
						onClick={() => {
							interact()
							setTransmissionView('path')
						}}
					>
						{tx('完整传动')}
					</button>
				</div>
			)}
			{selected && (
				<>
					<EnginePartsList
						key={selected + (assembly?.id ?? '')}
						parts={selectedParts}
						title={selected === 'powertrain' ? '发动机零件' : '零件清单'}
						hovered={hoveredPart}
						selected={selectedPart}
						onHover={setHoveredPart}
						onSelect={(id) => {
							interact()
							setSelectedPart(id)
						}}
					/>
					<EnginePartLabels
						parts={selectedParts}
						selected={selectedPart}
						anchorsRef={partAnchorsRef}
						visible={partsExplode > 0.65}
						hovered={hoveredPart}
						onHover={setHoveredPart}
						onSelect={(id) => {
							interact()
							setSelectedPart(id)
						}}
					/>
				</>
			)}
			{selected && selectedPart ? (
				<EnginePartCard
					parts={selectedParts}
					id={selectedPart}
					onClose={() => setSelectedPart(null)}
				/>
			) : selected === 'powertrain' ? (
				<EngineInstruments
					{...{ angleRef, rpm, slowdown, paused, xray }}
					onRpm={(v) => {
						interact()
						setRpm(v)
						setSlowdown(suggestedSlowdown(v))
					}}
					onSlowdown={(v) => {
						interact()
						setSlowdown(v)
					}}
					onPaused={(v) => {
						interact()
						pausedRef.current = v
						setPaused(v)
					}}
					onXray={(v) => {
						interact()
						setXray(v)
					}}
					onScrub={(v) => {
						interact()
						pausedRef.current = true
						angleRef.current = v
						setPaused(true)
					}}
				/>
			) : selected === 'drivetrain' ? (
				<TransmissionInstruments
					stateRef={transmissionRef}
					gear={gear}
					onGear={(g) => {
						interact()
						setGear(g)
					}}
					rpm={rpm}
					slowdown={slowdown}
					paused={paused}
					onRpm={(v) => {
						interact()
						setRpm(v)
						setSlowdown(suggestedSlowdown(v))
					}}
					onSlowdown={(v) => {
						interact()
						setSlowdown(v)
					}}
					onPaused={(v) => {
						interact()
						pausedRef.current = v
						setPaused(v)
					}}
				/>
			) : isRoadMechanism(selected) ? (
				<MechanismPanel
					selected={selected}
					model={mechanisms}
					slowdown={slowdown}
					paused={paused}
					onInteract={interact}
					onSlowdown={setSlowdown}
					onPaused={(value) => {
						pausedRef.current = value
						setPaused(value)
					}}
				/>
			) : selectedSystem ? (
				<aside className="ct-system-detail">
					<span>{tx(selectedSystem.name)}</span>
					<strong>
						{partCount(selectedSystem.id)} <small>{tx('件')}</small>
					</strong>
					<p>
						{partText({
							zh: PARTS.find((p) => p.system === selectedSystem.id)!.function,
							en: PARTS.find((p) => p.system === selectedSystem.id)!.functionEn,
						})}
					</p>
					<button
						onClick={() => {
							interact()
							returnToSystems()
						}}
					>
						{tx('返回系统')}
					</button>
				</aside>
			) : (
				explode < 0.7 && (
					<aside className="ct-idle">
						<div>
							<span className={`ct-live-dot ${paused ? 'is-paused' : ''}`} />
							{tx('真实转速')}
						</div>
						<strong>
							{rpm.toLocaleString('en-US')}
							<small>{tx('转/分')}</small>
						</strong>
						<span>
							{tx('画面慢放')} 1/{slowdown}
						</span>
					</aside>
				)
			)}
			{selected === 'body' && partsExplode > 0.05 && <SteelLegend onSelect={setSelectedPart} />}
			<div className="ct-bottom">
				<div className="ct-orbit-hint">
					{tx('拖动旋转 · 滚动缩放')}
					<span>4.85 × 1.85 × 1.45 m</span>
				</div>
				<div className="ct-explode-control">
					<span>{tx(selected !== null ? '系统' : '整车')}</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.001"
						aria-label={tx('拆解程度')}
						value={selected !== null ? partsExplode : explode}
						onPointerDown={() => {
							interact()
							cancelAnimationFrame(animationRef.current)
							if (selected === null) returnToSystems()
						}}
						onChange={(e) => {
							interact()
							cancelAnimationFrame(animationRef.current)
							if (selected !== null) setPartsExplode(Number(e.target.value))
							else {
								returnToSystems()
								setExplode(Number(e.target.value))
							}
						}}
						onPointerUp={() => {
							if (selected !== null) {
								animateParts(currentPartsExplode.current > 0.5 ? 1 : 0)
								return
							}
							if (currentExplode.current > 0 && currentExplode.current < 1)
								animate(currentExplode.current > 0.5 ? 1 : 0)
						}}
					/>
					<span>{tx(selected !== null ? '零件' : '系统')}</span>
					<button
						data-action="explode"
						onClick={() =>
							selected !== null
								? animateParts(partsExplode > 0.5 ? 0 : 1)
								: animate(explode > 0.5 ? 0 : 1)
						}
					>
						{tx((selected !== null ? partsExplode : explode) > 0.5 ? '合上' : '拆开')}
						<span>{(selected !== null ? partsExplode : explode) > 0.5 ? '−' : '+'}</span>
					</button>
				</div>
				<div className="ct-bottom-meta">
					<span>{tx('虚构车辆 · 程序化建模')}</span>
					<span>
						{tx('七个系统')} / {PARTS.length} {tx('件')}
					</span>
				</div>
			</div>
			{!ready && <div className="ct-loading">{tx('正在搭建摄影棚…')}</div>}
		</div>
	)
}
