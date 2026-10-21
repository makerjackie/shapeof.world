import { useEffect } from 'react';
import { useExperienceI18n } from '~/i18n/experience';
import type { ReplayStatus } from '../neural-replay';
export function CircuitPanel({
	state,
	paused,
	onPause,
	onSeek,
}: {
	state: ReplayStatus;
	paused: boolean;
	onPause: () => void;
	onSeek: (time: number) => void;
}) {
	const tx = useExperienceI18n();
	return (
		<div className="fly-circuit fly-replay-panel" data-experience-overlay="true">
			<div className="fly-replay-heading">
				<span>{tx('神经 → 下行输出 → 身体')}</span>
				<small>{tx('计算回放')} · ¼×</small>
			</div>
			<div className="fly-circuit-steps">
				{[
					[tx('左侧下行'), state.channels[state.mode === 'walk' ? 0 : 2]],
					[tx('右侧下行'), state.channels[state.mode === 'walk' ? 1 : 3]],
					[tx('身体速度'), state.speed],
				].map(([label, value], i) => (
					<div key={i} className={`fly-circuit-step step-${i}`}>
						<span>{label}</span>
						<meter min={0} max={i === 2 ? 8 : 200} value={Number(value)} aria-label={String(label)} />
						<small>
							{Number(value).toFixed(1)} {i === 2 ? 'mm/s' : 'Hz'}
						</small>
					</div>
				))}
			</div>
			<div className="fly-replay-transport">
				<button onClick={onPause}>{tx(state.time >= state.duration ? '重播动作' : paused ? '继续回放' : '暂停回放')}</button>
				<input
					type="range"
					min={0}
					max={state.duration}
					step={0.01}
					value={state.time}
					aria-label={tx('神经与身体同步回放进度')}
					onChange={(e) => onSeek(Number(e.target.value))}
				/>
				<time>{state.time.toFixed(2)} s</time>
			</div>
		</div>
	);
}
export function CircuitExplanation({ close }: { close: () => void }) {
	const tx = useExperienceI18n();
	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				close();
			}
		};
		document.addEventListener('keydown', key);
		return () => document.removeEventListener('keydown', key);
	}, [close]);
	return (
		<section
			className="fly-explanation"
			role="dialog"
			aria-modal="false"
			aria-labelledby="fly-explain-title"
			data-experience-overlay="true"
		>
			<button className="fly-explain-close" onClick={close} autoFocus>
				{tx('关闭')}
			</button>
			<span className="fly-journey-kicker">INPUT → SPIKES → READOUT → BODY</span>
			<h2 id="fly-explain-title">{tx('神经怎样驱动身体？')}</h2>
			<div className="fly-explain-grid">
				<article>
					<b>01 · {tx('刺激什么')}</b>
					<p>
						{tx(
							'向前走刺激两侧 LC9 视觉细胞；转向刺激同侧 LC9 和 DNa02 下行细胞。输入在 0.20 秒开始，随后衰减。这些是人工设定的刺激，不是果蝇看见了真实画面。',
						)}
					</p>
				</article>
				<article>
					<b>02 · {tx('脑里算什么')}</b>
					<p>
						{tx(
							'MaleCNS 提供实测连接。开源 LIF 模型在 166,700 个神经元、25,582,938 条连接上计算积累、衰减与放电。亮点对应这次计算中真正触发的细胞，余辉只为便于观察。',
						)}
					</p>
				</article>
				<article>
					<b>03 · {tx('身体怎样响应')}</b>
					<p>
						{tx(
							'下行细胞的放电率经过平滑和人工设定的解码器，变成前进速度、转向与步态。六条腿用上游逆运动学求解。网页将神经记录与身体姿态锁在同一时间轴，四分之一速度播放。',
						)}
					</p>
				</article>
				<article>
					<b>04 · {tx('这里训练了什么')}</b>
					<p>
						{tx(
							'这一版没有重新训练神经网络。连接权重来自扫描数据，模型参数与动作解码器来自 Neural Canvas；本站用它们离线计算三段记录。不是动物实测活动，也没有身体接触、肌肉或感觉反馈的完整闭环。',
						)}
					</p>
				</article>
			</div>
			<p className="fly-explain-note">
				{tx(
					'网上的魔方、乒乓球与驾驶案例可能另加任务训练、运动解码器和环境反馈，不能把它们都叫作同一种全脑模拟。这里先呈现来源可核验的神经到身体链路。',
				)}
			</p>
			<p className="fly-explain-note">
				{tx(
					'开场是以身体模型为参考的 AI 渲染；雌性身体与雄性神经图谱来自不同标本；开壳和空间对齐属于展示示意。下行读数分别汇总行走与转向通道，不能理解为全部神经活动。',
				)}
			</p>
			<div className="fly-explain-sources">
				<a href="https://huggingface.co/spaces/Xenova/fruit-fly-simulation" target="_blank" rel="noreferrer">
					Neural Canvas · MIT
				</a>
				<a href="https://male-cns.janelia.org/" target="_blank" rel="noreferrer">
					MaleCNS · CC BY 4.0
				</a>
				<a href="https://www.nature.com/articles/s41586-024-07763-9" target="_blank" rel="noreferrer">
					LIF · Nature
				</a>
				<a href="/assets/worlds/flybody/replay/SOURCES.md" target="_blank" rel="noreferrer">
					{tx('计算参数与来源')}
				</a>
			</div>
		</section>
	);
}
