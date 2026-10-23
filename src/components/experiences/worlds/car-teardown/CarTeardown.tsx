import {Component, useCallback, useEffect, useRef, useState, type ReactNode} from 'react'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {useExperienceI18n} from '~/i18n/experience'
import {CarScene, type AnchorMap} from './Scene'
import {EngineeringLabels, EngineInstruments} from './Instruments'
import {SYSTEMS, PARTS, partCount, type SystemId} from './parts'
import {suggestedSlowdown} from './model'
import {VEHICLE_SPEC as S} from './vehicle-spec'
import './car-teardown.css'

class SceneBoundary extends Component<{children: ReactNode; message: string}, {failed: boolean}> {
	state = {failed: false}
	static getDerivedStateFromError() {
		return {failed: true}
	}
	render() {
		return this.state.failed ? <div className="ct-error">{this.props.message}</div> : this.props.children
	}
}
export function CarTeardown({controls}: {controls: ExperienceControls}) {
	const tx = useExperienceI18n()
	const [explode, setExplode] = useState(0)
	const [selected, setSelected] = useState<SystemId | null>(null)
	const [hovered, setHovered] = useState<SystemId | null>(null)
	const [rpm, setRpm] = useState<number>(S.engine.idleRpm)
	const [slowdown, setSlowdown] = useState<number>(40)
	const [paused, setPaused] = useState(false)
	const [xray, setXray] = useState(false)
	const [ready, setReady] = useState(false)
	const [reducedMotion, setReducedMotion] = useState(false)
	const angleRef = useRef(25)
	const anchorsRef = useRef<AnchorMap>({})
	const animationRef = useRef(0)
	const currentExplode = useRef(0)
	currentExplode.current = explode
	useEffect(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)')
		const sync = () => {
			setReducedMotion(media.matches)
			if (media.matches) setPaused(true)
		}
		sync()
		media.addEventListener('change', sync)
		return () => {
			media.removeEventListener('change', sync)
			cancelAnimationFrame(animationRef.current)
		}
	}, [])
	const interact = useCallback(() => controls.registerInteraction(), [controls.registerInteraction])
	const select = useCallback(
		(id: SystemId) => {
			interact()
			cancelAnimationFrame(animationRef.current)
			setExplode(1)
			setSelected(id)
			setHovered(null)
		},
		[interact],
	)
	const animate = useCallback(
		(target: number) => {
			interact()
			setSelected(null)
			setHovered(null)
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
		[interact, reducedMotion],
	)
	const onReady = useCallback(() => setReady(true), [])
	const selectedSystem = SYSTEMS.find((s) => s.id === selected)
	return (
		<div
			className={`ct-world ${selected ? 'has-selection' : ''} ${selected === 'powertrain' ? 'is-engine' : ''}`}
			data-ready={ready}
			data-explode={explode.toFixed(3)}
			data-selected={selected ?? 'car'}>
			<SceneBoundary message={tx('三维画面未能启动，请重新载入或开启浏览器硬件加速。')}>
				<CarScene
					{...{explode, selected, hovered, xray, rpm, slowdown, paused, reducedMotion, angleRef, anchorsRef}}
					onSelect={select}
					onHover={setHovered}
					onInteract={interact}
					onReady={onReady}
				/>
			</SceneBoundary>
			<nav className="ct-breadcrumb" aria-label={tx('拆解导航')}>
				<button
					onClick={() => {
						interact()
						setSelected(null)
						setHovered(null)
					}}>
					{tx('整车')}
				</button>
				<span>/</span>
				{selectedSystem ? (
					<>
						<button
							onClick={() => {
								interact()
								setSelected(null)
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
				<h1>{tx(selected === 'powertrain' ? '四个缸，轮流做功。' : '一辆车，一层一层拆开。')}</h1>
				<p>
					{tx(
						selected === 'powertrain'
							? '曲轴每转两圈，每个缸点一次火。'
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
					onChange={(e) => (e.target.value ? select(e.target.value as SystemId) : setSelected(null))}>
					<option value="">{tx('全部系统')}</option>
					{SYSTEMS.map((s) => (
						<option key={s.id} value={s.id}>
							{tx(s.name)}
						</option>
					))}
				</select>
			)}
			{selected === 'powertrain' ? (
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
						setPaused(v)
					}}
					onXray={(v) => {
						interact()
						setXray(v)
					}}
					onScrub={(v) => {
						interact()
						angleRef.current = v
						setPaused(true)
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
							setSelected(null)
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
					<span>{tx('整车')}</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.001"
						aria-label={tx('拆解程度')}
						value={explode}
						onPointerDown={() => {
							interact()
							cancelAnimationFrame(animationRef.current)
							setSelected(null)
						}}
						onChange={(e) => {
							interact()
							cancelAnimationFrame(animationRef.current)
							setSelected(null)
							setExplode(Number(e.target.value))
						}}
						onPointerUp={() => {
							if (currentExplode.current > 0 && currentExplode.current < 1)
								animate(currentExplode.current > 0.5 ? 1 : 0)
						}}
					/>
					<span>{tx('系统')}</span>
					<button data-action="explode" onClick={() => animate(explode > 0.5 ? 0 : 1)}>
						{tx(explode > 0.5 ? '合上' : '拆开')}
						<span>{explode > 0.5 ? '−' : '+'}</span>
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
