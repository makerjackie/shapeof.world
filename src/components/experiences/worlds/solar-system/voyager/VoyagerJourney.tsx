import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Pause, Play, ArrowCounterClockwise, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldAudioMuted, isWorldPaused } from '~/lib/world-playback'
import { AU_KM } from '../scale-model'
import { bodyPosition, craftPosition, validateEphemeris, YEAR, type Ephemeris } from './ephemeris'
import { makeJourney, sampleJourney, chapterStart } from './journey'
import { VoyagerScene, type CameraMode } from './VoyagerScene'
import { VoyagerScore } from './score'
import { PHOTOS, type VoyagerPhoto } from './photos'
import '../styles/VoyagerJourney.css'
const DATA_URLS = { 1: '/assets/solar-system/voyager/voyager-1.json', 2: '/assets/solar-system/voyager/voyager-2.json' } as const

function PhotoDialog({ photo, onClose }: { photo: VoyagerPhoto; onClose: () => void }) {
	const tx = useExperienceI18n(),
		ref = useRef<HTMLDialogElement>(null)
	useEffect(() => {
		ref.current?.showModal()
		return () => ref.current?.close()
	}, [])
	return (
		<dialog ref={ref} className="vg-photo-dialog" onCancel={onClose} onClose={onClose} aria-label={tx(photo.title)}>
			<button type="button" autoFocus className="vg-photo-close" aria-label={tx('关闭照片')} onClick={onClose}>
				<X />
			</button>
			<img src={`/assets/solar-system/voyager/${photo.file}`} alt={tx(photo.title)} />
			<div>
				<h2>{tx(photo.title)}</h2>
				<time>{photo.date}</time>
				<p>{tx(photo.caption)}</p>
				<a href={photo.source} target="_blank" rel="noreferrer">
					{tx('查看原始资料')}
				</a>
				<small>{photo.credit}</small>
			</div>
		</dialog>
	)
}
function Flight({ data, controls }: { data: Ephemeris; controls: ExperienceControls }) {
	const tx = useExperienceI18n(),
		journey = useMemo(() => makeJourney(data), [data]),
		elapsed = useRef(0)
	const [position, setPosition] = useState(0),
		[playing, setPlaying] = useState(false)
	const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
	const [cameraMode, setCameraMode] = useState<CameraMode>('cinema'),
		[fov, setFov] = useState(60)
	const [music, setMusic] = useState(false),
		[audioError, setAudioError] = useState(false),
		[photoOpen, setPhotoOpen] = useState(false)
	const [speed, setSpeed] = useState(1)
	const [toolsOpen, setToolsOpen] = useState(() => window.innerWidth > 720)
	const score = useRef<VoyagerScore | null>(null)
	const photoButtonRef = useRef<HTMLButtonElement>(null)
	useEffect(() => {
		if (!photoOpen) photoButtonRef.current?.focus()
	}, [photoOpen])
	const flightRef = useRef<HTMLDivElement>(null),
		playerRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const player = playerRef.current
		if (!player) return
		const update = () =>
			flightRef.current?.style.setProperty('--experience-freebar-height', `${player.getBoundingClientRect().height + 22}px`)
		const observer = new ResizeObserver(update)
		observer.observe(player)
		update()
		return () => observer.disconnect()
	}, [])
	const sample = sampleJourney(journey, position),
		chapter = sample.chapter
	const photo = chapter.photo ? PHOTOS[chapter.photo] : null
	useRegisterExperienceCapabilities('solar-system-voyager', { hasWorldAudio: true, hasFreeControls: true, supportsImmersive: true })
	useEffect(() => {
		controls.completeOnboarding()
		score.current = new VoyagerScore()
		return () => score.current?.dispose()
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
		let frame = 0,
			previous = performance.now(),
			lastUi = 0
		const tick = (now: number) => {
			const active = playing && !document.hidden && !isWorldPaused()
			if (active) elapsed.current = Math.min(journey.duration, elapsed.current + Math.min((now - previous) / 1000, 0.06) * speed)
			previous = now
			const s = sampleJourney(journey, elapsed.current)
			score.current?.update(elapsed.current, s.index, active && music && !isWorldAudioMuted(), !!s.chapter.future)
			if (now - lastUi > 80) {
				setPosition(elapsed.current)
				lastUi = now
			}
			if (elapsed.current >= journey.duration && playing) setPlaying(false)
			frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => {
			cancelAnimationFrame(frame)
			score.current?.stop()
		}
	}, [journey, playing, music, speed])
	const seek = useCallback(
		(p: number) => {
			elapsed.current = Math.max(0, Math.min(journey.duration, p))
			setPosition(elapsed.current)
			score.current?.stop()
			controls.registerInteraction()
		},
		[journey, controls],
	)
	const craft = craftPosition(data, sample.time),
		sunDistance = Math.hypot(...craft) / AU_KM
	const earth = bodyPosition(data, 'earth', Math.min(data.end, sample.time))
	const delay = Math.hypot(...craft.map((v, i) => v - earth[i])) / 299792.458 / 3600
	const target = sample.chapter.target
	const close = !['overview', 'future'].includes(target)
	const center = close ? bodyPosition(data, target, sample.time) : null
	const distance = center ? Math.hypot(...craft.map((v, i) => v - center[i])) : null
	const calendar = chapter.future
		? `+${Math.round((sample.time - data.end) / YEAR).toLocaleString('en-US')} ${tx('年')}`
		: new Date(sample.time * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
	const toggleMusic = async () => {
		controls.registerInteraction()
		if (music) {
			setMusic(false)
			score.current?.stop()
			return
		}
		try {
			await score.current?.enable()
			setMusic(true)
			setAudioError(false)
		} catch {
			setAudioError(true)
		}
	}
	return (
		<div ref={flightRef} className="vg-flight" data-voyager={data.mission}>
			<Canvas
				camera={{ position: [0, 0.003, 0.004], fov: 46, near: 1e-10, far: 10000 }}
				dpr={[1, 1.75]}
				gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
			>
				<VoyagerScene
					data={data}
					journey={journey}
					elapsed={elapsed}
					cameraMode={cameraMode}
					fov={fov}
					reducedMotion={reducedMotion}
					onFree={() => {
						setCameraMode('free')
						controls.registerInteraction()
					}}
				/>
			</Canvas>
			<header className="vg-story" data-experience-overlay="true">
				<span className="vg-kicker">
					{tx(data.mission === 1 ? '旅行者 1 号' : '旅行者 2 号')}{' '}
					<b>
						{String(sample.index + 1).padStart(2, '0')} / {journey.chapters.length}
					</b>
				</span>
				<h2>{tx(chapter.title)}</h2>
				<p>{tx(chapter.text)}</p>
				<details key={chapter.id}>
					<summary>{tx('这一刻的故事与边界')}</summary>
					<p>{tx(chapter.detail)}</p>
					<p>{tx('NASA 档案轨道插值，未来简化外推。标记、光照与星空为示意；球面不复原历史相机画面。')}</p>
				</details>
			</header>
			<aside className="vg-readout" data-experience-overlay="true">
				<time>{calendar}</time>
				<strong>
					{sunDistance.toLocaleString('en-US', { maximumFractionDigits: 2 })} <small>AU</small>
				</strong>
				<span>{tx('距太阳')}</span>
				{!chapter.future && (
					<small>
						{tx('单程光时约')} {delay.toFixed(2)} h
					</small>
				)}
				{distance !== null && (
					<small>
						{tx('距目标中心')} {Math.round(distance).toLocaleString('en-US')} km
					</small>
				)}
				<em>{tx(chapter.future ? '未来外推 · 非精确预报' : '真实尺寸与距离 · 历史重建')}</em>
			</aside>
			{photo && (
				<button
					type="button"
					ref={photoButtonRef}
					className="vg-photo-card"
					data-experience-overlay="true"
					onClick={() => {
						setPlaying(false)
						setPhotoOpen(true)
						controls.registerInteraction()
					}}
				>
					<img src={`/assets/solar-system/voyager/${photo.file}`} alt="" loading="lazy" />
					<span>
						<small>
							{tx('历史影像')} · {photo.date.slice(0, 10)}
						</small>
						<strong>{tx(photo.title)}</strong>
						<em>{tx('打开照片')}</em>
					</span>
				</button>
			)}
			<div className="vg-bottom" data-experience-overlay="true">
				<p className="vg-view-note">
					{tx(
						cameraMode === 'ship'
							? '飞船外形与姿态为示意 · 尺寸约按实物'
							: cameraMode === 'observer'
								? '飞船位置观察 · 非历史相机指向'
								: close
									? '行星相对航迹 · 圆点为定位标记'
									: '日心航迹 · 圆点为定位标记',
					)}
					{chapter.future && ` · ${tx('奥尔特云参考范围：2,000–100,000 AU')}`}
				</p>
				<nav className="vg-chapters" aria-label={tx('航程章节')}>
					{journey.chapters.map((c, i) => (
						<button
							type="button"
							key={c.id}
							aria-current={i === sample.index ? 'step' : undefined}
							onClick={() => {
								seek(chapterStart(journey, i) + 0.001)
								setCameraMode('cinema')
							}}
						>
							<i />
							{tx(c.title)}
						</button>
					))}
				</nav>
			</div>
			<div ref={playerRef} className="vg-player" role="group" aria-label={tx('航程播放')} data-experience-overlay="true">
				{toolsOpen && (
					<div className="vg-camera-controls">
						{(['cinema', 'observer', 'ship', 'free'] as CameraMode[]).map((mode) => (
							<button
								type="button"
								key={mode}
								aria-pressed={cameraMode === mode}
								onClick={() => {
									setCameraMode(mode)
									controls.registerInteraction()
								}}
							>
								{tx(mode === 'cinema' ? '叙事镜头' : mode === 'observer' ? '飞船视角' : mode === 'ship' ? '看看飞船' : '自由观察')}
							</button>
						))}
						{cameraMode === 'observer' && (
							<label>
								{tx('视场')}
								<input type="range" min={15} max={120} value={fov} onChange={(e) => setFov(+e.target.value)} aria-label={tx('视场')} />
								{fov}°
							</label>
						)}
						<button type="button" aria-pressed={music} onClick={() => void toggleMusic()}>
							{music ? <SpeakerHigh /> : <SpeakerSlash />}
							{tx(music ? '配乐已开' : '开启配乐')}
						</button>
						<label>
							{tx('播放速度')}
							<select value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label={tx('播放速度')}>
								<option value={0.5}>0.5×</option>
								<option value={1}>1×</option>
								<option value={2}>2×</option>
							</select>
						</label>
						<button
							type="button"
							onClick={() => {
								seek(0)
								setCameraMode('cinema')
								setPlaying(false)
							}}
							aria-label={tx('重播航程')}
						>
							<ArrowCounterClockwise />
						</button>
					</div>
				)}
				<div className="vg-player-main">
					<button
						type="button"
						className="vg-play"
						aria-label={tx(playing ? '暂停航程' : '播放航程')}
						onClick={() => {
							if (position >= journey.duration) seek(0)
							setPlaying(!playing)
							controls.registerInteraction()
						}}
					>
						{playing ? <Pause weight="fill" /> : <Play weight="fill" />}
					</button>
					<input
						className="vg-scrubber"
						type="range"
						min={0}
						max={journey.duration}
						step={0.05}
						value={position}
						aria-label={tx('航程进度')}
						aria-valuetext={tx(chapter.title)}
						onChange={(e) => seek(+e.target.value)}
					/>
					<span className="vg-runtime">
						{Math.floor(position / 60)}:{String(Math.floor(position % 60)).padStart(2, '0')} / {Math.floor(journey.duration / 60)}:
						{String(journey.duration % 60).padStart(2, '0')}
					</span>
					<button type="button" className="vg-tools-toggle" aria-expanded={toolsOpen} onClick={() => setToolsOpen(!toolsOpen)}>
						{tx(toolsOpen ? '收起选项' : '镜头与声音')}
					</button>
				</div>
			</div>
			{audioError && (
				<p className="vg-audio-error" role="status">
					{tx('配乐暂时无法启动，请再试一次。')}
				</p>
			)}
			{photoOpen && photo && <PhotoDialog photo={photo} onClose={() => setPhotoOpen(false)} />}
		</div>
	)
}
export default function VoyagerJourney({ mission, controls }: { mission: 1 | 2; controls: ExperienceControls }) {
	const tx = useExperienceI18n(),
		[data, setData] = useState<Ephemeris | null>(null),
		[error, setError] = useState(false),
		[attempt, setAttempt] = useState(0)
	useEffect(() => {
		const controller = new AbortController()
		setData(null)
		setError(false)
		fetch(DATA_URLS[mission], { signal: controller.signal })
			.then((r) => {
				if (!r.ok) throw new Error('Ephemeris unavailable')
				return r.json()
			})
			.then((d) => {
				if (!controller.signal.aborted) setData(validateEphemeris(d, mission))
			})
			.catch(() => {
				if (!controller.signal.aborted) setError(true)
			})
		return () => controller.abort()
	}, [mission, attempt])
	if (!data)
		return (
			<div className="vg-loading" role="status">
				<strong>{tx(error ? '航程数据暂时无法载入' : '正在准备航程')}</strong>
				<p>{tx(error ? '请重试，或返回自由探索。' : '载入随项目保存的轨道与历史资料。')}</p>
				{error && (
					<button type="button" onClick={() => setAttempt((n) => n + 1)}>
						{tx('重试')}
					</button>
				)}
			</div>
		)
	return <Flight key={mission} data={data} controls={controls} />
}
