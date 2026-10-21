import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, Pause, Play } from '@phosphor-icons/react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { useExperienceI18n } from '~/i18n/experience';
import { Freebar } from '~/components/experiences/Freebar';
import { GhostHint } from '~/components/experiences/GhostHint';
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode';
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities';
import { isWorldPaused, subscribeWorldPlayback } from '~/lib/world-playback';
import { createNeuralScene, type NeuralState } from './neural-scene';
import { traceConnections, type NeuralData } from './neural-network';
import { JOURNEY_SECONDS, JOURNEY_ANCHORS, journeyAt, smooth, type JourneyPlayback } from './fly-journey';
import './styles/NeuralAtlas.css';
import { CircuitPanel, CircuitExplanation } from './private/circuit-panel';
import { emptyReplay } from './neural-replay';

export function Flybody({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n();
	const { storyMode, enterFree, enterStory } = useStoryFreeMode('flybody-journey');
	const film = useRef<JourneyPlayback>({
		seconds: storyMode ? 0 : JOURNEY_SECONDS,
		playing: storyMode,
		story: storyMode,
		autoRotate: true,
		reset: 0,
	});
	film.current.story = storyMode;
	const [circuit, setCircuit] = useState(() => emptyReplay());
	const [explaining, setExplaining] = useState(false);
	const [atlas, setAtlas] = useState(false);
	film.current.atlas = atlas;
	const [seconds, setSeconds] = useState(film.current.seconds);
	const [playing, setPlaying] = useState(film.current.playing);
	const [rotating, setRotating] = useState(true);
	const [data, setData] = useState<NeuralData>();
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
	const statusRef = useRef(status);
	statusRef.current = status;
	const [retry, setRetry] = useState(0);
	const [state, setState] = useState<NeuralState>({ selected: 0, blocked: -1, trace: 0, filter: -1, reset: 0 });
	const host = useRef<HTMLDivElement>(null),
		live = useRef(state),
		interaction = useRef(controls.registerInteraction);
	live.current = state;
	interaction.current = controls.registerInteraction;
	const motion = useRef(false);
	const travel = useRef<{ from: number; to: number; elapsed: number; duration: number; resume?: boolean } | null>(null);
	useRegisterExperienceCapabilities('flybody', { supportsImmersive: true, hasFreeControls: true });
	const updatePlayback = (value: boolean) => {
		film.current.playing = value;
		setPlaying(value);
	};
	const free = () => {
		enterFree();
		film.current.story = false;
		updatePlayback(false);
		try {
			localStorage.setItem('oneworld.guide.flybody-journey.v1', 'done');
		} catch {
			/* optional persistence */
		}
	};
	const sceneInteraction = useRef(() => {});
	sceneInteraction.current = () => {
		controls.registerInteraction();
		travel.current = null;
		film.current.autoRotate = false;
		setRotating(false);
		free();
	};
	useEffect(() => {
		if (!host.current) return;
		setStatus('loading');
		return createNeuralScene(
			host.current,
			() => live.current,
			(index) => setState((s) => ({ ...s, selected: index, blocked: -1, trace: s.trace + 1 })),
			(loaded) => {
				setData(loaded);
				setState((s) => ({ ...s, selected: loaded.meta.presets[0] ?? 0, blocked: -1 }));
				setStatus('ready');
			},
			(error) => {
				console.error('flybody journey', error);
				setStatus('error');
			},
			() => sceneInteraction.current(),
			setCircuit,
			() => film.current,
		);
	}, [retry]);
	useEffect(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			motion.current = media.matches;
			if (media.matches) {
				updatePlayback(false);
				film.current.autoRotate = false;
				setRotating(false);
				setState((s) => ({ ...s, interrupted: true }));
				travel.current = null;
			}
		};
		sync();
		media.addEventListener('change', sync);
		let frame = 0,
			last = performance.now(),
			lastUi = 0;
		const rebase = () => {
			last = performance.now();
		};
		const unsubscribe = subscribeWorldPlayback({ onResume: rebase });
		document.addEventListener('visibilitychange', rebase);
		const tick = (now: number) => {
			const dt = Math.min((now - last) / 1000, 1);
			last = now;
			if (!document.hidden && !isWorldPaused() && statusRef.current === 'ready') {
				const s = film.current;
				if (travel.current) {
					const t = travel.current;
					t.elapsed += dt;
					s.seconds = t.from + (t.to - t.from) * smooth(0, t.duration, t.elapsed);
					if (t.elapsed >= t.duration) {
						s.seconds = t.to;
						travel.current = null;
						if (t.resume) {
							s.playing = true;
							setPlaying(true);
						}
					}
				} else if (s.playing) {
					s.seconds = Math.min(JOURNEY_SECONDS, s.seconds + dt);
					if (s.seconds >= JOURNEY_SECONDS) {
						s.playing = false;
						setPlaying(false);
						enterFree();
						s.story = false;
						try {
							localStorage.setItem('oneworld.guide.flybody-journey.v1', 'done');
						} catch {
							/* optional */
						}
					}
				}
				if (now - lastUi > 60) {
					setSeconds(s.seconds);
					lastUi = now;
				}
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			unsubscribe();
			document.removeEventListener('visibilitychange', rebase);
			media.removeEventListener('change', sync);
		};
	}, [enterFree]);
	const seek = (to: number, animated = false) => {
		controls.registerInteraction();
		updatePlayback(false);
		film.current.reset++;
		if (animated && !motion.current)
			travel.current = {
				from: film.current.seconds,
				to,
				elapsed: 0,
				duration: Math.min(1.8, 0.65 + Math.abs(to - film.current.seconds) * 0.05),
			};
		else {
			travel.current = null;
			film.current.seconds = to;
			setSeconds(to);
		}
	};
	const replay = () => {
		setAtlas(false);
		controls.registerInteraction();
		enterStory();
		film.current.story = true;
		film.current.autoRotate = !motion.current;
		setRotating(!motion.current);
		setState((s) => ({
			...s,
			selected: data?.meta.presets[0] ?? 0,
			filter: -1,
			blocked: -1,
			actionMode: 'walk',
			stimulus: 0,
			interrupted: false,
			reset: s.reset + 1,
		}));
		seek(0, true);
		if (travel.current) travel.current.resume = !motion.current;
		else updatePlayback(!motion.current);
	};
	const toggle = () => {
		controls.registerInteraction();
		travel.current = null;
		if (film.current.seconds >= JOURNEY_SECONDS) {
			film.current.seconds = 0;
			enterStory();
			film.current.story = true;
			film.current.reset++;
		}
		updatePlayback(!film.current.playing);
	};
	const change = (patch: Partial<NeuralState>) => {
		controls.registerInteraction();
		setState((s) => ({ ...s, ...patch }));
	};
	const pose = journeyAt(seconds),
		neural = seconds >= 16;
	const baseline = data ? traceConnections(data, state.selected) : [];
	const reached = data ? new Set(traceConnections(data, state.selected, 3, state.blocked).map((e) => e.to)).size : 0;
	const name = data?.meta.types[data.types[state.selected]] || tx('未命名细胞');
	const next = () => {
		if (!data) return;
		const p = data.meta.presets;
		change({ selected: p[(p.indexOf(state.selected) + 1) % p.length], blocked: -1, trace: state.trace + 1 });
	};
	const copy = [
		[tx('一只果蝇，近在眼前。'), tx('从完整身体出发，看看感觉怎样变成动作。')],
		[tx('身体，沿连接处展开。'), tx('头、胸、腹分开，镜头沿身体靠近头部。')],
		[tx('打开头部，脑留在原位。'), tx('外壳向两侧展开，细胞图谱在复眼之间显现。')],
		[tx('外壳退场，只留下连接。'), tx('身体与外壳完全消失。眼前只留下真实细胞组成的脑网络。')],
		[tx('脑在活动，身体开始迈步。'), tx('刺激进入神经网络，下行输出驱动六条腿。脑与身体播放同一段计算记录。')],
	];
	const chapters = [tx('完整身体'), tx('展开结构'), tx('打开头部'), tx('只看神经网络'), tx('刺激与动作')];

	const timeline = (
		<input
			type="range"
			min="0"
			max={JOURNEY_SECONDS}
			step="0.05"
			value={seconds}
			aria-label={tx('果蝇故事进度')}
			aria-valuetext={`${chapters[pose.chapter]} · ${Math.round(seconds)} / ${JOURNEY_SECONDS}`}
			style={{ '--fill': `${(seconds / JOURNEY_SECONDS) * 100}%` } as CSSProperties}
			onChange={(e) => seek(Number(e.target.value))}
		/>
	);
	return (
		<div className={`fly-neural fly-journey ${storyMode ? 'is-story' : 'is-free'}`} data-phase={pose.chapter} data-playing={playing}>
			<div ref={host} className="fly-neural-stage" role="img" aria-label={tx('果蝇三维旅程：身体、展开结构与神经网络，拖动旋转')} />
			<figure
				className="fly-real-photo"
				style={{ opacity: pose.photoOpacity, visibility: pose.photoOpacity === 0 ? 'hidden' : 'visible' }}
				aria-hidden={pose.photoOpacity === 0}
			>
				<img src="/assets/worlds/flybody/fly-render-404267a77b19.webp" alt={tx('以三维模型为参考的果蝇 AI 写实渲染')} />
				<figcaption data-experience-overlay="true">{tx('AI 写实渲染 · 与身体模型同一视角')}</figcaption>
			</figure>
			<article className="fly-journey-copy" data-experience-overlay="true">
				<span className="fly-journey-kicker">{seconds >= 12 ? 'MALE CNS · 1.0' : 'DROSOPHILA MELANOGASTER'}</span>
				<div key={storyMode ? pose.chapter : 'free'} className="fly-journey-words">
					<h1>
						{(storyMode ? copy[pose.chapter][0] : tx('果蝇的脑内世界')).split('，').map((line, i) => (
							<span key={i}>{line}</span>
						))}
					</h1>
					<p>
						{storyMode
							? copy[pose.chapter][1]
							: tx(
									neural
										? atlas
											? '点亮一个细胞，看看它连向哪里。'
											: '选择一种刺激，同时观察神经放电与身体响应。'
										: seconds >= 12
											? '只留下脑网络，继续进入动作实验。'
											: '展开身体，再走进它的头部。',
								)}
					</p>
				</div>
				<small>
					{tx(
						seconds >= 12
							? '实测连接 · 模型计算回放 · ¼ 速度'
							: seconds >= 10
								? '不同标本 · 位置匹配为展示示意'
								: '写实渲染 → 身体结构 · 展开为示意',
					)}
				</small>
			</article>
			{status !== 'ready' && (
				<div className="fly-neural-status" role="status" data-experience-overlay="true">
					<p>{tx(status === 'loading' ? '正在打开果蝇与神经图谱…' : '模型未能打开，请重试。')}</p>
					{status === 'error' && <button onClick={() => setRetry((n) => n + 1)}>{tx('重试')}</button>}
				</div>
			)}
			{status === 'ready' && (
				<>
					{storyMode && pose.chapter === 4 && (
						<CircuitPanel
							state={circuit}
							paused={state.interrupted ?? false}
							onPause={() =>
								circuit.time >= circuit.duration
									? change({ stimulus: (state.stimulus ?? 0) + 1, interrupted: false })
									: change({ interrupted: !state.interrupted })
							}
							onSeek={(value) => change({ replaySeek: value, seekVersion: (state.seekVersion ?? 0) + 1, interrupted: true })}
						/>
					)}
					{storyMode ? (
						<nav className="fly-film" aria-label={tx('果蝇故事')} data-experience-overlay="true">
							<div className="fly-film-chapters">
								{chapters.map((label, i) => (
									<button key={i} aria-current={pose.chapter === i ? 'step' : undefined} onClick={() => seek(JOURNEY_ANCHORS[i], true)}>
										{label}
									</button>
								))}
							</div>
							<div className="fly-film-transport">
								<button onClick={toggle} aria-label={tx(playing ? '暂停' : '播放')}>
									{playing ? <Pause weight="fill" /> : <Play weight="fill" />}
								</button>
								{timeline}
								<button aria-label={tx('重播故事')} onClick={replay}>
									<ArrowCounterClockwise />
								</button>
								<button
									className="fly-film-explore"
									onClick={() => {
										controls.registerInteraction();
										free();
									}}
								>
									{tx('自由探索')}
								</button>
							</div>
						</nav>
					) : (
						<>
							{neural && !atlas && (
								<CircuitPanel
									state={circuit}
									paused={state.interrupted ?? false}
									onPause={() =>
										circuit.time >= circuit.duration
											? change({ stimulus: (state.stimulus ?? 0) + 1, interrupted: false })
											: change({ interrupted: !state.interrupted })
									}
									onSeek={(value) => change({ replaySeek: value, seekVersion: (state.seekVersion ?? 0) + 1, interrupted: true })}
								/>
							)}
							{neural && atlas && (
								<div className="fly-neural-selection" data-experience-overlay="true" data-freebar-clearance="true">
									<span className="fly-neural-id">
										{name} <small>#{data?.ids[state.selected]}</small>
									</span>
									<p>
										{tx('三步连接内')} <strong>{reached}</strong> {tx('个可达细胞')}
										{state.blocked >= 0 && <em> · {tx('一处分支已断开')}</em>}
									</p>
									<small>{tx('每个细胞最多显示三条最强输出连接')}</small>
								</div>
							)}
							<Freebar
								ariaLabel={tx('果蝇探索')}
								primaryControlBudget={3}
								secondaryDefault="closed"
								secondary={
									<>
										<label className="fly-journey-slider">
											<span>{tx('身体到脑')}</span>
											{timeline}
										</label>
										{neural && atlas && (
											<div className="fly-neural-filters">
												{([-1, 0, 2, 3] as const).map((v, i) => (
													<button key={v} aria-pressed={state.filter === v} onClick={() => change({ filter: v })}>
														{tx(['全网', '视觉区域', '神经索', '下行细胞'][i])}
													</button>
												))}
											</div>
										)}
										{
											<button
												className="fly-neural-action"
												onClick={() => {
													setExplaining(true);
													controls.registerInteraction();
												}}
											>
												{tx('神经怎样驱动身体？')}
											</button>
										}
										<button
											className="fly-neural-action"
											onClick={() => {
												setAtlas(!atlas);
												seek(JOURNEY_SECONDS, true);
											}}
										>
											{tx(atlas ? '回到动作实验' : '查看真实连接全图')}
										</button>
										<button
											className="fly-neural-action"
											onClick={() => {
												setAtlas(false);
												seek(neural ? 0 : JOURNEY_SECONDS, true);
											}}
										>
											{tx(neural ? '回到身体' : '进入神经网络')}
										</button>
										<button className="fly-neural-action" onClick={replay}>
											{tx('重播故事')}
										</button>
										<button
											className="fly-neural-action"
											aria-pressed={rotating}
											disabled={motion.current}
											onClick={() => {
												controls.registerInteraction();
												film.current.autoRotate = !rotating;
												film.current.reset++;
												setRotating(!rotating);
											}}
										>
											{tx('缓慢旋转')}
										</button>
									</>
								}
							>
								{neural && !atlas ? (
									<>
										<button
											id="fly-circuit-stimulate"
											className="fly-neural-action"
											onClick={() => change({ actionMode: 'walk', stimulus: (state.stimulus ?? 0) + 1, interrupted: false })}
										>
											{tx('向前走')}
										</button>
										<button
											className="fly-neural-action"
											aria-pressed={circuit.mode === 'left'}
											onClick={() => change({ actionMode: 'left', stimulus: (state.stimulus ?? 0) + 1, interrupted: false })}
										>
											{tx('向左转')}
										</button>
										<button
											className="fly-neural-action"
											onClick={() => change({ actionMode: 'right', stimulus: (state.stimulus ?? 0) + 1, interrupted: false })}
										>
											{tx('向右转')}
										</button>
									</>
								) : neural ? (
									<>
										<button id="fly-neural-trace" className="fly-neural-action" onClick={() => change({ trace: state.trace + 1 })}>
											{tx('沿连接追踪')}
										</button>
										<button className="fly-neural-action" onClick={next}>
											{tx('换个细胞')}
										</button>
										<button
											className="fly-neural-action"
											disabled={!baseline.length}
											aria-pressed={state.blocked >= 0}
											onClick={() => change({ blocked: state.blocked < 0 ? (baseline[0]?.to ?? -1) : -1, trace: state.trace + 1 })}
										>
											{tx(state.blocked >= 0 ? '恢复分支' : '断开分支')}
										</button>
									</>
								) : (
									<>
										<button className="fly-neural-action" onClick={() => seek(0, true)}>
											{tx('完整果蝇')}
										</button>
										<button className="fly-neural-action" onClick={() => seek(7, true)}>
											{tx('展开身体')}
										</button>
										<button className="fly-neural-action" onClick={() => seek(JOURNEY_SECONDS, true)}>
											{tx(seconds >= 12 ? '接入动作装置' : '进入脑内')}
										</button>
									</>
								)}
							</Freebar>
							<GhostHint
								worldId="flybody-journey"
								gesture={
									neural
										? {
												type: 'tap',
												target: atlas ? '#fly-neural-trace' : '#fly-circuit-stimulate',
												label: tx(atlas ? '沿着真实连接走三步' : '选择刺激，观察脑与身体'),
											}
										: { type: 'drag', target: '.fly-neural-stage', label: tx('拖动，看看身体的另一面') }
								}
							/>
						</>
					)}
				</>
			)}
			{explaining && <CircuitExplanation close={() => setExplaining(false)} />}
		</div>
	);
}
