import '~/components/experiences/styles/OrbitalExperiences.css'
import './styles/SolarSystem.css'
import './styles/VoyagerJourney.css'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Html, OrthographicCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ArrowCounterClockwise, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { isWorldPaused } from '~/lib/world-playback'
import { useExperienceI18n } from '~/i18n/experience'
import { MINOR_BODIES, MinorBodies, OuterRegions } from './minor-bodies'
import { PLANETS, MOONS } from './solar-data'
import { orbitalPeriodDays } from './orbital-model'
import { solarDayHours, SUN_RADIUS_KM, type ScaleMode } from './scale-model'
import { Sun, PlanetNode, OrbitLine, StarField, AsteroidBelt, KuiperBelt } from './solar-bodies'
import { SolarCamera, type GalacticView, type ViewPreset } from './solar-camera'
import { GalacticTrails } from './private/galactic-trails'
import { GalacticSky } from './private/galactic-sky'
import { createSpeedMemory, changePlaybackSpeed, type SpeedContext } from './playback-speed'
import { TextureNotice } from './private/texture-notice'
import { SizeComparison } from './private/size-comparison'
import { GalacticDrift } from './private/galactic-drift'

function Scene({
	cameraRevision,
	days,
	mode,
	selected,
	parent,
	view,
	galacticView,
	labels,
	orbits,
	belts,
	reducedMotion,
	onSelect,
	onControl,
}: {
	cameraRevision: number
	days: React.MutableRefObject<number>
	mode: ScaleMode
	selected: string | null
	parent: string | null
	view: ViewPreset
	galacticView: GalacticView
	labels: boolean
	orbits: boolean
	belts: boolean
	reducedMotion: boolean
	onSelect: (id: string) => void
	onControl: () => void
}) {
	const tx = useExperienceI18n()
	const bodies = useRef(new Map<string, THREE.Object3D>())
	const registerBody = useCallback((id: string, body: THREE.Object3D | null) => {
		if (body) bodies.current.set(id, body)
		else bodies.current.delete(id)
	}, [])
	const [settled, setSettled] = useState(false)
	useEffect(() => setSettled(false), [cameraRevision, mode])
	const onSettled = useCallback(() => setSettled(true), [])
	const galaxy = view === 'galaxy'
	const nearView = view === 'surface' || view === 'system'
	const orthographic = mode === 'illustrated' && !nearView && !galaxy && view !== 'outer'
	const minor = MINOR_BODIES.some((b) => b.id === selected)
	const blend = useRef(0)
	useFrame((_, delta) => {
		blend.current = reducedMotion ? Number(galaxy) : THREE.MathUtils.damp(blend.current, Number(galaxy), 3, delta)
	})
	return (
		<>
			{orthographic && <OrthographicCamera makeDefault manual position={[0, 500, 1000]} near={0.01} far={60000} />}
			<color attach="background" args={['#03070e']} />
			<ambientLight intensity={0.12} color="#a4bad4" />
			<GalacticSky blendRef={blend} />
			<StarField followCamera />
			<Sun hidden={minor || ((mode === 'physical' || settled) && !!parent && parent !== 'sun')} mode={mode} registerBody={registerBody} />
			{mode === 'illustrated' && (
				<group visible={galaxy}>
					<GalacticTrails simDaysRef={days} blendRef={blend} />
					<GalacticDrift simDaysRef={days} blendRef={blend} />
				</group>
			)}
			{labels && !parent && !minor && (
				<Html center zIndexRange={[7, 1]}>
					<button className="ss-body-label" data-experience-overlay="true" onClick={() => onSelect('sun')}>
						<i />
						{tx('太阳')}
					</button>
				</Html>
			)}
			{PLANETS.filter((planet) => !minor && (mode === 'illustrated' || !parent || planet.id === parent)).map((planet) => (
				<group key={planet.id}>
					{orbits && !galaxy && (
						<OrbitLine elements={planet.elements} color={planet.color} highlighted={selected === planet.id} mode={mode} />
					)}
					<group visible={!settled || !parent || planet.id === parent}>
						<PlanetNode
							data={planet}
							mode={mode}
							simDaysRef={days}
							selected={selected === planet.id}
							labels={
								labels &&
								!galaxy &&
								view !== 'outer' &&
								!(mode === 'physical' && !parent && view !== 'inner' && planet.elements.a < 2) &&
								(!parent || (parent === planet.id && view === 'system'))
							}
							showMoons={parent === planet.id}
							moonLabels={labels && parent === planet.id}
							showOrbits={orbits && view === 'system'}
							onSelect={onSelect}
							registerBody={registerBody}
						/>
					</group>
				</group>
			))}
			<AsteroidBelt mode={mode} simDaysRef={days} visible={belts && !parent && !galaxy} />
			<KuiperBelt mode={mode} simDaysRef={days} visible={belts && !parent && !galaxy} />
			{(belts || minor) && !parent && !galaxy && (
				<MinorBodies
					days={days}
					mode={mode}
					selected={minor ? selected : null}
					labels={labels && view !== 'outer'}
					orbits={orbits && !minor}
					onSelect={onSelect}
					registerBody={registerBody}
				/>
			)}
			{view === 'outer' && <OuterRegions />}
			<SolarCamera
				revision={cameraRevision}
				focusedId={nearView ? selected : null}
				locateId={orthographic ? selected : null}
				bodies={bodies}
				view={view}
				galacticView={galacticView}
				mode={mode}
				onControl={onControl}
				onSettled={onSettled}
				reducedMotion={reducedMotion}
			/>
		</>
	)
}

function SimulationTime({ days, playing }: { days: React.MutableRefObject<number>; playing: boolean }) {
	const tx = useExperienceI18n()
	const [time, setTime] = useState(0)
	useEffect(() => {
		const timer = window.setInterval(() => setTime(days.current), 250)
		return () => clearInterval(timer)
	}, [days])
	return (
		<span className="ss-time">
			{tx(playing ? '模拟时间' : '已暂停')} · {time.toFixed(1)} {tx('天')} <small>{tx('自 J2000 起 · 非实时星历')}</small>
		</span>
	)
}

function SolarExplorer({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n()
	const days = useRef(0)
	const [cameraRevision, setCameraRevision] = useState(0)
	const [mode, setMode] = useState<ScaleMode>('illustrated')
	const [selected, setSelected] = useState<string | null>(null)
	const [view, setView] = useState<ViewPreset>('overview')
	const [galacticView, setGalacticView] = useState<GalacticView>('oblique')
	const [speed, setSpeed] = useState(10)
	const speedMemory = useRef(createSpeedMemory())
	const [detailsExpanded, setDetailsExpanded] = useState(false)
	const changeSpeedContext = (next: SpeedContext) => {
		setSpeed(changePlaybackSpeed(speedMemory.current, speed, next))
	}

	const [reverse, setReverse] = useState(false)
	const [reducedMotion, setReducedMotion] = useState(
		() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
	)
	const [playing, setPlaying] = useState(!reducedMotion)
	const [labels, setLabels] = useState(true)
	const [orbits, setOrbits] = useState(true)
	const [belts, setBelts] = useState(false)
	const moon = MOONS.find((m) => m.id === selected)
	const planet = PLANETS.find((p) => p.id === (moon?.parentId ?? selected))
	const minor = MINOR_BODIES.find((b) => b.id === selected)
	const bodyName = minor?.name ?? moon?.name ?? planet?.name ?? (selected === 'sun' ? '太阳' : '太阳系模拟')
	const interact = useCallback(() => controls.registerInteraction(), [controls])
	useEffect(() => {
		controls.completeOnboarding()
	}, [controls])
	useEffect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)')
		const change = () => {
			setReducedMotion(query.matches)
			if (query.matches) setPlaying(false)
		}
		query.addEventListener('change', change)
		return () => query.removeEventListener('change', change)
	}, [])
	useEffect(() => {
		if (!playing) return
		let raf = 0,
			previous = performance.now()
		const tick = (now: number) => {
			const elapsed = Math.min((now - previous) / 1000, 0.05)
			previous = now
			if (!document.hidden && !isWorldPaused()) days.current += elapsed * speed * (reverse ? -1 : 1)
			raf = requestAnimationFrame(tick)
		}
		raf = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf)
	}, [playing, speed, reverse])
	const select = (id: string) => {
		const locating = mode === 'illustrated' && (PLANETS.some((p) => p.id === id) || id === 'sun')
		setCameraRevision((n) => n + 1)
		setSelected(id)
		setDetailsExpanded(false)
		setView(locating ? 'overview' : 'surface')
		changeSpeedContext(locating ? 'overview' : 'near')
		interact()
	}

	const approach = () => {
		changeSpeedContext('near')
		setView('surface')
		setCameraRevision((n) => n + 1)
		interact()
	}
	const overview = (next: ViewPreset = 'overview') => {
		setCameraRevision((n) => n + 1)
		setSelected(null)
		setView(next)
		changeSpeedContext(next === 'galaxy' ? 'galaxy' : 'overview')
		interact()
	}
	const switchMode = (next: ScaleMode) => {
		setMode(next)
		if (view === 'galaxy') {
			setView('overview')
			changeSpeedContext('overview')
		} else if (next === 'physical' && selected) {
			setView('surface')
			changeSpeedContext('near')
		}
		interact()
	}
	const system = () => {
		if (!planet) return
		setCameraRevision((n) => n + 1)
		setSelected(planet.id)
		setView('system')
		changeSpeedContext('near')
		interact()
	}
	const reset = () => {
		setCameraRevision((n) => n + 1)
		days.current = 0
		setMode('illustrated')
		setSelected(null)
		setView('overview')
		setGalacticView('oblique')
		speedMemory.current = createSpeedMemory()
		setDetailsExpanded(false)
		setSpeed(10)
		setReverse(false)
		setPlaying(!reducedMotion)
		setLabels(true)
		setOrbits(true)
		setBelts(false)
		interact()
	}
	const tools = (
		<div className="ss-tools-strip">
			<label className="ss-speed-label">
				{tx('时间流速')}
				<select
					aria-label={tx('时间流速')}
					value={speed}
					onChange={(e) => {
						setSpeed(Number(e.target.value))
						interact()
					}}
				>
					<option value={1 / 86400}>{tx('实时速度')}</option>
					<option value={0.02}>{tx('约 30 分钟 / 秒')}</option>
					<option value={0.1}>{tx('2.4 小时 / 秒')}</option>
					<option value={1}>{tx('1 天 / 秒')}</option>
					<option value={10}>{tx('10 天 / 秒')}</option>
					<option value={100}>{tx('100 天 / 秒')}</option>
					<option value={365.25}>{tx('1 年 / 秒')}</option>
				</select>
			</label>
			<button type="button" onClick={() => overview('inner')} aria-pressed={view === 'inner'}>
				{tx('内太阳系')}
			</button>
			<button
				type="button"
				onClick={() => {
					setMode('physical')
					overview('outer')
				}}
				aria-pressed={view === 'outer'}
			>
				{tx('奥尔特云')}
			</button>
			<label className="ss-speed-label">
				{tx('彗星与矮行星')}
				<select
					aria-label={tx('彗星与矮行星')}
					value={minor?.id ?? ''}
					onChange={(e) => {
						if (e.target.value) {
							setBelts(true)
							select(e.target.value)
						}
					}}
				>
					<option value="">{tx('选择天体')}</option>
					{MINOR_BODIES.map((body) => (
						<option key={body.id} value={body.id}>
							{tx(body.name)}
						</option>
					))}
				</select>
			</label>
			<button type="button" onClick={() => overview('side')} aria-pressed={view === 'side'}>
				{tx('侧面')}
			</button>
			<button
				type="button"
				aria-pressed={labels}
				onClick={() => {
					setLabels(!labels)
					interact()
				}}
			>
				{tx('标记')}
			</button>
			<button
				type="button"
				aria-pressed={orbits}
				onClick={() => {
					setOrbits(!orbits)
					interact()
				}}
			>
				{tx('轨道')}
			</button>
			<button
				type="button"
				aria-pressed={belts}
				onClick={() => {
					setBelts(!belts)
					interact()
				}}
			>
				{tx('小天体带')}
			</button>
			<button
				type="button"
				aria-pressed={reverse}
				onClick={() => {
					setReverse(!reverse)
					interact()
				}}
			>
				{tx('倒放')}
			</button>
			{mode === 'illustrated' && (
				<button type="button" aria-pressed={view === 'galaxy'} onClick={() => overview(view === 'galaxy' ? 'overview' : 'galaxy')}>
					{tx('银河航行')}
				</button>
			)}
			{view === 'galaxy' && (
				<label className="ss-speed-label">
					{tx('观察视角')}
					<select
						aria-label={tx('观察视角')}
						value={galacticView}
						onChange={(e) => {
							setGalacticView(e.target.value as GalacticView)
							interact()
						}}
					>
						<option value="oblique">{tx('斜侧跟随')}</option>
						<option value="top">{tx('轨道俯视')}</option>
						<option value="forward">{tx('迎向航程')}</option>
					</select>
				</label>
			)}
			<button type="button" className="experience-freebar-reset" aria-label={tx('重置')} onClick={reset}>
				<ArrowCounterClockwise />
				<span>{tx('重置')}</span>
			</button>
		</div>
	)
	return (
		<div className="oss-experience solar-system-experience is-free" data-scale-mode={mode}>
			<Canvas
				camera={{ position: [0, 600, 1100], fov: 46, near: 0.01, far: 60000 }}
				dpr={[1, 1.75]}
				gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
			>
				<Scene
					cameraRevision={cameraRevision}
					days={days}
					mode={mode}
					selected={selected}
					parent={view === 'surface' || view === 'system' ? (planet?.id ?? (selected === 'sun' ? 'sun' : null)) : null}
					view={view}
					galacticView={galacticView}
					labels={labels}
					orbits={orbits}
					belts={belts}
					reducedMotion={reducedMotion}
					onSelect={select}
					onControl={interact}
				/>
			</Canvas>
			<header className="ss-frame-caption" data-experience-overlay="true">
				<span>
					{tx(mode === 'physical' ? '真实比例' : '科普展示')} ·{' '}
					{tx(view === 'system' ? '卫星系统' : view === 'galaxy' ? '银河运动示意' : view === 'surface' ? '近景 · 独立缩放' : '太阳系')}
				</span>
				<strong>{tx(bodyName)}</strong>
				<small>{tx(mode === 'physical' ? '大小与距离使用同一比例 · 定位标记不代表大小' : '大小同比例 · 距离已压缩')}</small>
				<SimulationTime days={days} playing={playing} />
			</header>
			<nav className="ss-planet-rail" aria-label={tx('天体')} data-experience-overlay="true">
				<button type="button" aria-pressed={!selected && view === 'overview'} onClick={() => overview()}>
					{tx('全景')}
				</button>
				<button type="button" aria-pressed={selected === 'sun'} onClick={() => select('sun')}>
					<i style={{ background: '#ffcf6b' }} />
					{tx('太阳')}
				</button>
				{PLANETS.map((p) => (
					<button type="button" key={p.id} aria-pressed={planet?.id === p.id} onClick={() => select(p.id)}>
						<i style={{ background: p.color }} />
						{tx(p.name)}
					</button>
				))}
			</nav>
			{selected && (
				<section className="ss-details" data-freebar-clearance="true" data-experience-overlay="true" aria-label={tx('天体资料')}>
					<TextureNotice id={selected} onRetry={interact} />
					<div className="ss-compact-details">
						<span>
							{tx(bodyName)} · {tx('平均直径')}{' '}
							{((minor?.radiusKm ?? moon?.radiusKm ?? planet?.radiusKm ?? SUN_RADIUS_KM) * 2).toLocaleString('en-US', {
								maximumFractionDigits: 1,
							})}{' '}
							km
						</span>
						<button
							type="button"
							aria-expanded={detailsExpanded}
							aria-controls="ss-detail-body"
							onClick={() => {
								setDetailsExpanded(!detailsExpanded)
								interact()
							}}
						>
							{tx(detailsExpanded ? '收起资料' : '天体资料')}
						</button>
					</div>
					<div className="ss-detail-actions">
						{view !== 'surface' && (
							<button type="button" onClick={approach}>
								{tx('近看')}
							</button>
						)}
						{moon && (
							<button type="button" onClick={() => select(moon.parentId)}>
								{tx('返回行星')}
							</button>
						)}
						{planet && planet.moons.length > 0 && (
							<button type="button" aria-pressed={view === 'system'} onClick={system}>
								{tx('查看卫星系统')}
							</button>
						)}
						{view === 'system' && planet && (
							<button type="button" onClick={approach}>
								{tx('靠近行星')}
							</button>
						)}
						<button type="button" onClick={() => overview()}>
							{tx('返回全景')}
						</button>
					</div>
					<div id="ss-detail-body" className="ss-detail-body" data-expanded={detailsExpanded}>
						<SizeComparison selectedId={selected} />
						<dl>
							<div>
								<dt>{tx('平均直径')}</dt>
								<dd>
									{((minor?.radiusKm ?? moon?.radiusKm ?? planet?.radiusKm ?? SUN_RADIUS_KM) * 2).toLocaleString('en-US', {
										maximumFractionDigits: 1,
									})}{' '}
									km
								</dd>
							</div>
							{(moon || planet) && (
								<>
									<div>
										<dt>{tx(moon ? '轨道半长轴' : '日心轨道半长轴')}</dt>
										<dd>{moon ? `${moon.aKm.toLocaleString('en-US')} km` : `${planet!.elements.a.toFixed(3)} AU`}</dd>
									</div>
									<div>
										<dt>{tx('公转周期')}</dt>
										<dd>
											{(moon?.periodDays ?? orbitalPeriodDays(planet!.elements)).toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
											{tx('天')}
										</dd>
									</div>
								</>
							)}
						</dl>
						{minor && (
							<>
								<p>
									{tx(minor.kind === 'comet' ? '彗核为近似球形；彗尾仅示意背离太阳的方向。' : '采用等效球形与近似尺寸；表面颜色为示意。')}
								</p>
								<p>
									{tx('轨道半长轴')} {minor.elements.a.toFixed(2)} AU · {tx('轨道倾角')} {minor.elements.i.toFixed(1)}°
								</p>
								<p>{tx('采用各来源历元的二体近似，省略摄动和喷气。')}</p>
								{minor.kind === 'comet' && (
									<button
										type="button"
										className="ss-perihelion"
										onClick={() => {
											days.current = minor.perihelionDays
											setCameraRevision((n) => n + 1)
											setPlaying(false)
											interact()
										}}
									>
										{tx('查看近日点')}
									</button>
								)}
							</>
						)}
						{planet && !moon && (
							<details>
								<summary>{tx('行星资料与模型边界')}</summary>
								<p>{tx(planet.description)}</p>
								<p>
									{tx('自转周期')} {Math.abs(planet.rotationHours).toLocaleString('en-US')} {tx('小时')} · {tx('轴倾角')} {planet.obliquity}
									°
								</p>
								{planet.type === '岩石行星' && (
									<p>
										{tx('太阳日')} {solarDayHours(planet.rotationHours, orbitalPeriodDays(planet.elements)).toFixed(1)} {tx('小时')}
									</p>
								)}
								<p>{tx('固定 J2000 根数；地球近似为地月质心。省略摄动、食、岁差与极轴方位。')}</p>
							</details>
						)}
						{planet && (
							<>
								<div className="ss-moon-rail" aria-label={tx('主要卫星')}>
									{planet.moons.map((m) => (
										<button type="button" key={m.id} aria-pressed={selected === m.id} onClick={() => select(m.id)}>
											{tx(m.name)}
										</button>
									))}
								</div>
								<small>{tx(planet.moons.length ? '展示部分主要卫星 · 轨道朝向与相位为示意' : '这颗行星没有天然卫星')}</small>
								{moon && <small>{tx('卫星采用球形近似；除月球外，表面颜色为示意。')}</small>}
								{moon?.id === 'triton' && <p>{tx('海卫一的公转方向与海王星自转相反。')}</p>}
							</>
						)}
						{selected === 'sun' && <p>{tx('太阳固定于原点；光球、黑子与辉光为示意，非实时影像。')}</p>}
					</div>
				</section>
			)}
			{!selected && (
				<p className="ss-scale-note" data-experience-overlay="true">
					{tx(
						view === 'outer'
							? '奥尔特云尚未直接观测，点云为推测示意；日球层顶并非固定球面。'
							: view === 'galaxy'
								? '局部直线平移示意 · 三种显示尺度独立，不是银河轨道'
								: mode === 'physical'
									? '真实尺度下，行星可能小于一个像素。选择名称即可靠近。'
									: '选一颗行星，靠近表面，再展开它的卫星系统。',
					)}
					{belts && <small>{tx('小天体带为分布示意，点的大小与密度不代表实物。')}</small>}
				</p>
			)}
			<Freebar
				className="ss-freebar"
				mainClassName="ss-freebar-main"
				ariaLabel={tx('时间与比例')}
				primaryControlBudget={3}
				secondaryDefault="auto"
				mobileDensity="comfortable"
				secondary={tools}
			>
				<button
					type="button"
					className="experience-freebar-play"
					data-playing={playing}
					aria-label={tx(playing ? '暂停' : '播放')}
					onClick={() => {
						setPlaying(!playing)
						interact()
					}}
				>
					{playing ? <Pause weight="fill" /> : <Play weight="fill" />}
				</button>
				<div className="experience-freebar-seg ss-mode-switch" role="group" aria-label={tx('显示比例')}>
					<button
						type="button"
						aria-pressed={mode === 'illustrated'}
						className={mode === 'illustrated' ? 'is-active' : ''}
						onClick={() => switchMode('illustrated')}
					>
						{tx('科普展示')}
					</button>
					<button
						type="button"
						aria-pressed={mode === 'physical'}
						className={mode === 'physical' ? 'is-active' : ''}
						onClick={() => switchMode('physical')}
					>
						{tx('真实比例')}
					</button>
				</div>
			</Freebar>
			<GhostHint
				worldId="solar-system-scale-v3"
				gesture={{ type: 'tap', target: '.ss-mode-switch', label: tx('切换比例，看看行星之间有多远') }}
			/>
		</div>
	)
}

const VoyagerJourney = lazy(() => import('./voyager/VoyagerJourney'))
export function SolarSystem({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n()
	const [journey, setJourney] = useState<0 | 1 | 2>(0)
	return (
		<div className="oss-experience solar-system-experience is-free">
			{journey === 0 ? (
				<SolarExplorer controls={controls} />
			) : (
				<Suspense fallback={<div className="vg-loading">{tx('正在准备航程')}</div>}>
					<VoyagerJourney key={journey} mission={journey} controls={controls} />
				</Suspense>
			)}
			<nav className="ss-journey-switch" aria-label={tx('探索方式')} data-experience-overlay="true">
				{([0, 1, 2] as const).map((value) => (
					<button
						type="button"
						key={value}
						aria-pressed={journey === value}
						onClick={() => {
							setJourney(value)
							controls.registerInteraction()
						}}
					>
						{tx(value === 0 ? '自由探索' : value === 1 ? '旅行者 1 号' : '旅行者 2 号')}
					</button>
				))}
			</nav>
		</div>
	)
}
