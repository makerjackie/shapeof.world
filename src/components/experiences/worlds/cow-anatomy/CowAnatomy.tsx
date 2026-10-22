import { useEffect, useState, type CSSProperties } from 'react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { BeatResult, BeatSteps, Conclusion, DoHint, GuessCard, useFiveBeats } from '~/components/experiences/five-beat';
import { useI18n } from '~/i18n/index';
import { useExperienceI18n } from '~/i18n/experience';
import { ClientOnly } from '~/components/ClientOnly';
import { copy } from './copy';
import { NECK_KG, cuts, primals } from './cow-data';
import { CowMap } from './CowMap';
import { CowScene } from './CowScene';
import { guesses, guessIsRight, servings, type Guess } from './yield-model';
import './styles/CowAnatomy.css';

export function CowAnatomy({ controls, worldId = 'cow-anatomy' }: { controls: ExperienceControls; worldId?: string }) {
	const tx = useExperienceI18n();
	const { locale } = useI18n();
	const l = locale === 'en' ? 'en' : 'zh';
	const { beat, guess, goto, choose, restart: replay } = useFiveBeats<Guess>(controls);
	const [stage, setStage] = useState(0);
	const lab = beat === 'lab';
	const [cutId, setCutId] = useState('neck');
	const interact = controls.registerInteraction;
	const cut = cuts.find((c) => c.id === cutId)!;
	const primal = primals[cut.primal];
	const neckDunks = servings(NECK_KG.low, NECK_KG.high);

	function cutOnce() {
		setStage((s) => Math.min(2, s + 1));
	}
	useEffect(() => {
		if (stage !== 2 || beat !== 'do') return;
		const timer = window.setTimeout(() => goto('see'), 1100);
		return () => window.clearTimeout(timer);
	}, [stage, beat, goto]);
	function restart() {
		interact();
		setStage(0);
		replay();
	}

	return (
		<div className={`ca-world ${lab ? 'ca-lab' : ''}`} data-world={worldId}>
			<header className="ca-question" data-experience-overlay="true">
				<BeatSteps beat={beat} labLabel={tx('实验室')} />
				<h1>{tx(lab ? '最贵的脖仁，一头牛有多少？' : '一头牛，能变成多少肉？')}</h1>
			</header>

			<div className="ca-stage">
				{lab ? (
					<CowMap
						selected={cut.id}
						onSelect={(id) => {
							interact();
							setCutId(id);
						}}
					/>
				) : (
					<ClientOnly fallback={null}>
						<CowScene stage={stage} knifeActive={beat === 'do' && stage < 2} showMeat={stage === 2} onCut={cutOnce} onInteract={interact} />
					</ClientOnly>
				)}
			</div>

			<section className="ca-card" aria-live="polite">
				{lab ? (
					<div className="ca-cut">
						<div
							className="ca-plate"
							role="img"
							aria-label={tx(cut.label)}
							style={{ '--plate-x': `${(cut.atlas[0] / 3) * 100}%`, '--plate-y': `${(cut.atlas[1] / 2) * 100}%` } as CSSProperties}
						/>
						<div className="ca-cut-copy">
							<h2>
								{tx(cut.label)} <small>{tx(cut.texture)}</small>
							</h2>
							{cut.id === 'neck' && (
								<p className="ca-big-line">{copy.neckAmount(l, NECK_KG.low, NECK_KG.high, NECK_KG.cowKg, neckDunks.low, neckDunks.high)}</p>
							)}
							<p>
								{primal.share === null
									? tx('它不算「肉」：第一刀就和皮、头、内脏一起被拿走了。')
									: copy.primalShare(l, tx(primal.label), primal.share)}
							</p>
							<p className="ca-src">
								{tx(cut.timeLabel)} · {tx('潮州地方标准 DB4451/T 9—2024。口感秒数不是安全线，吃之前要熟透。')}
							</p>
							{cut.id === 'neck' && <p className="ca-src">{tx('脖仁产量是行业说法（澎湃号，2024），不是统计数据。')}</p>}
							<p className="ca-src">{tx('点牛身上的其他部位看看。')}</p>
						</div>
						<button className="ca-ghost" onClick={restart}>
							{tx('再切一头牛')}
						</button>
					</div>
				) : beat === 'guess' ? (
					<GuessCard
						question={tx('先猜：一头牛，最后有多少能变成肉？')}
						options={guesses.map((g) => ({ id: g.id, label: tx(g.label) }))}
						onChoose={choose}
						skip={tx('不猜，直接切')}
					/>
				) : beat === 'do' ? (
					<>
						{stage === 1 && <p>{copy.firstCut(l)}</p>}
						{stage === 2 ? (
							<p>{copy.secondCut(l)}</p>
						) : (
							<DoHint
								hint={tx(stage === 0 ? '在牛身上向右拖刀，切第一刀。' : '再向右拖一刀：剔骨、去肥油。')}
								fallback={{
									label: tx('拖不动？点这里切一刀'),
									onClick: () => {
										interact();
										cutOnce();
									},
								}}
							/>
						)}
					</>
				) : beat === 'see' ? (
					<BeatResult
						verdict={guess && copy.verdict(l, guess)}
						right={guess !== null && guessIsRight(guess)}
						next={{ label: `${tx('原来如此')} →`, onClick: () => goto('know') }}
					>
						<p className="ca-big-line">{copy.result(l)}</p>
						<p>{copy.feel(l)}</p>
						<p className="ca-src">{tx('剩下的红块就是肉。左下是第一刀拿走的，右下是第二刀拿走的。')}</p>
					</BeatResult>
				) : (
					<Conclusion
						sentence={tx('一头牛，不到一半能变成肉。')}
						source={tx('其余是皮、头、蹄、血、内脏、骨头和肥油。按田纳西大学推广处 PB1829 的例子：1400 磅的牛，880 磅胴体，约 570 磅肉。')}
						next={{
							question: tx('最贵的脖仁，一头牛有多少？'),
							onClick: () => {
								interact();
								goto('lab');
							},
						}}
					>
						<button className="ca-ghost" onClick={restart}>
							{tx('再切一次')}
						</button>
					</Conclusion>
				)}
			</section>
		</div>
	);
}
