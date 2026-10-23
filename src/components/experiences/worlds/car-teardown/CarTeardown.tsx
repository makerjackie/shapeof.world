import {Component, useCallback, useEffect, useRef, useState, type ReactNode} from 'react'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {useExperienceI18n} from '~/i18n/experience'
import {CarScene, type AnchorMap} from './Scene'
import {EngineeringLabels, EngineInstruments} from './Instruments'
import {EnginePartsList, EnginePartLabels, EnginePartCard, type PartAnchors} from './EnginePartsUI'
import {SYSTEMS, PARTS, partCount, type SystemId} from './parts'
import {suggestedSlowdown} from './model'
import {VEHICLE_SPEC as S, type Gear} from './vehicle-spec'
import {createTransmissionState} from './transmission-model'
import {TransmissionInstruments} from './TransmissionInstruments'
import './car-teardown.css'

class SceneBoundary extends Component<{children: ReactNode; message: string}, {failed: boolean}> {
	state = {failed: false}
	static getDerivedStateFromError() {
		return {failed: true}
	}
	render() {
		return this.state.failed ? (
			<div className="ct-error">{this.props.message}</div>
		) : (
			this.props.children
		)
	}
}
export function CarTeardown({controls}: {controls: ExperienceControls}) {
	const tx = useExperienceI18n()
	const [explode, setExplode] = useState(0)
	const [partsExplode, setPartsExplode] = useState(0)
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
			setSelected(id)
			setHovered(null)
		},
		[interact],
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
	const onReady = useCallback(() => setReady(true), [])
	const selectedSystem = SYSTEMS.find((s) => s.id === selected)
	return (
		<div
			className={`ct-world ${selected ? 'has-selection' : ''} ${selected === 'powertrain' ? 'is-engine' : ''} ${partsExplode > 0.05 && selected === 'powertrain' ? 'is-parts' : ''}`}
			onPointerDown={interact}
			onWheel={interact}
			data-ready={ready}
			data-explode={explode.toFixed(3)}
			data-parts-explode={partsExplode.toFixed(3)}
			data-selected={selected ?? 'car'}>
			<SceneBoundary message={tx('三维画面未能启动，请重新载入或开启浏览器硬件加速。')}>
				<CarScene
					{...{
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
			<nav className="ct-breadcrumb" aria-label={tx('拆解导航')}>
				<button
					onClick={() => {
						interact()
						returnToSystems()
					}}>
					{tx('整车')}
				</button>
				<span>/</span>
				{selectedSystem ? (
					<>
						<button
							onClick={() => {
								interact()
								returnToSystems()
							}}>
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
								: '一辆车，一层一层拆开。',
					)}
				</h1>
				<p>
					{tx(
						selected === 'powertrain'
							? '曲轴每转两圈，每个缸点一次火。'
							: selected === 'drivetrain'
								? '沿琥珀色路径，看动力怎样抵达后轮。'
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
			{(explode > 0.7 || selected) && (
				<select
					className="ct-system-picker"
					value={selected ?? ''}
					aria-label={tx('选择系统')}
					onChange={(e) =>
						e.target.value ? select(e.target.value as SystemId) : returnToSystems()
					}>
					<option value="">{tx('全部系统')}</option>
					{SYSTEMS.map((s) => (
						<option key={s.id} value={s.id}>
							{tx(s.name)}
						</option>
					))}
				</select>
			)}
			{selected === 'drivetrain' && (
				<div className="ct-view-switch">
					<button
						className={transmissionView === 'gearbox' ? 'is-active' : ''}
						onClick={() => {
							interact()
							setTransmissionView('gearbox')
						}}>
						{tx('齿轮特写')}
					</button>
					<button
						className={transmissionView === 'path' ? 'is-active' : ''}
						onClick={() => {
							interact()
							setTransmissionView('path')
						}}>
						{tx('完整传动')}
					</button>
				</div>
			)}
			{selected === 'powertrain' && (
				<>
					<EnginePartsList
						hovered={hoveredPart}
						selected={selectedPart}
						onHover={setHoveredPart}
						onSelect={(id) => {
							interact()
							setSelectedPart(id)
						}}
					/>
					<EnginePartLabels
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
			{selected === 'powertrain' && selectedPart ? (
				<EnginePartCard id={selectedPart} onClose={() => setSelectedPart(null)} />
			) : selected === 'powertrain' ? (
				<EngineInstruments
					{...{angleRef, rpm, slowdown, paused, xray}}
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
			) : selectedSystem ? (
				<aside className="ct-system-detail">
					<span>{tx(selectedSystem.name)}</span>
					<strong>
						{partCount(selectedSystem.id)} <small>{tx('件')}</small>
					</strong>
					<p>{tx(PARTS.find((p) => p.system === selectedSystem.id)!.function)}</p>
					<button
						onClick={() => {
							interact()
							returnToSystems()
						}}>
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
			<div className="ct-bottom">
				<div className="ct-orbit-hint">
					{tx('拖动旋转 · 滚动缩放')}
					<span>4.85 × 1.85 × 1.45 m</span>
				</div>
				<div className="ct-explode-control">
					<span>{tx(selected === 'powertrain' ? '系统' : '整车')}</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.001"
						aria-label={tx('拆解程度')}
						value={selected === 'powertrain' ? partsExplode : explode}
						onPointerDown={() => {
							interact()
							cancelAnimationFrame(animationRef.current)
							if (selected !== 'powertrain') returnToSystems()
						}}
						onChange={(e) => {
							interact()
							cancelAnimationFrame(animationRef.current)
							if (selected === 'powertrain') setPartsExplode(Number(e.target.value))
							else {
								returnToSystems()
								setExplode(Number(e.target.value))
							}
						}}
						onPointerUp={() => {
							if (selected === 'powertrain') {
								animateParts(currentPartsExplode.current > 0.5 ? 1 : 0)
								return
							}
							if (currentExplode.current > 0 && currentExplode.current < 1)
								animate(currentExplode.current > 0.5 ? 1 : 0)
						}}
					/>
					<span>{tx(selected === 'powertrain' ? '零件' : '系统')}</span>
					<button
						data-action="explode"
						onClick={() =>
							selected === 'powertrain'
								? animateParts(partsExplode > 0.5 ? 0 : 1)
								: animate(explode > 0.5 ? 0 : 1)
						}>
						{tx((selected === 'powertrain' ? partsExplode : explode) > 0.5 ? '合上' : '拆开')}
						<span>{(selected === 'powertrain' ? partsExplode : explode) > 0.5 ? '−' : '+'}</span>
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
