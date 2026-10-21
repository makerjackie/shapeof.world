import { Component, Suspense, lazy, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { useExperienceI18n } from '~/i18n/experience';
import { ClientOnly } from '~/components/ClientOnly';
import { cuts, systems, type SystemId } from './cow-data';
import { CowMap, shortNames } from './CowMap';
import { MeatSlice } from './MeatSlice';
import { fiberSpan } from './meat-model';
import './styles/CowAnatomy.css';
const AnatomyScene = lazy(() => import('./private/AnatomyScene'));
class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
const modes = [
	['cuts', '部位图鉴'],
	['anatomy', '身体里面'],
	['slice', '切一片看看'],
] as const;
type Mode = (typeof modes)[number][0];
const tissueNotes = [
	['肌纤维', '肌肉由肌纤维组成。逆纹切能缩短肉片中的纤维。'],
	['结缔组织', '筋膜与肌腱提供支撑和传力。它们影响嚼感，但短时间涮烫并不会让胶原大量化成明胶。'],
	['脂肪', '脂肪带来脂香和润滑感。雪花多并不保证一块肉一定更嫩。'],
] as const;
export function CowAnatomy({ controls, worldId = 'cow-anatomy' }: { controls: ExperienceControls; worldId?: string }) {
	const tx = useExperienceI18n();
	const [mode, setMode] = useState<Mode>('cuts');
	const [cutId, setCutId] = useState('chuck-tender');
	const [system, setSystem] = useState<SystemId>('skeletal');
	const [opacity, setOpacity] = useState(0.08);
	const [reset, setReset] = useState(0);
	const knifeStart = useRef<number | null>(null);
	const [knife, setKnife] = useState(0);
	const [angle, setAngle] = useState(90);
	const [thickness, setThickness] = useState(1.5);
	const [slices, setSlices] = useState(1);
	const [heat, setHeat] = useState(0);
	const [tissue, setTissue] = useState(0);
	const cut = cuts.find((c) => c.id === cutId)!;
	const activeSystem = systems.find((s) => s.id === system)!;
	const interact = controls.registerInteraction;
	function chooseCut(id: string) {
		interact();
		setCutId(id);
		setSlices(1);
		setHeat(0);
	}
	function slice() {
		interact();
		setSlices((s) => (s >= 5 ? 1 : s + 1));
	}
	function chooseMode(m: Mode) {
		interact();
		setMode(m);
	}
	const span = fiberSpan(angle, thickness);
	const muscle = cut.id !== 'tripe' && cut.id !== 'brisket';
	return (
		<div className={`ca-world ca-mode-${mode}`} data-world={worldId}>
			<div className="ca-paper-grain" aria-hidden="true" />
			<header className="ca-heading" data-experience-overlay="true">
				<div>
					<span className="ca-eyebrow">{tx('潮汕牛肉图鉴')}</span>
					<h1>
						{tx('牛的里里外外')}
						<i aria-hidden="true" />
					</h1>
				</div>
				<p>{tx('部位、肉质与身体结构')}</p>
			</header>
			<nav className="ca-mode-nav" aria-label={tx('探索方式')} data-experience-overlay="true">
				{modes.map(([m, label], i) => (
					<button key={m} aria-pressed={mode === m} onClick={() => chooseMode(m)}>
						<span>0{i + 1}</span>
						{tx(label)}
					</button>
				))}
			</nav>
			<div className="ca-stage">
				<section className="ca-body-stage" aria-label={tx(mode === 'anatomy' ? '牛身体系统' : '牛肉部位探索')}>
					<div className="ca-stage-caption" data-experience-overlay="true">
						<span>{tx(mode === 'anatomy' ? '牛的解剖' : '部位分布')}</span>
						<span>{tx(mode === 'anatomy' ? '拖动旋转 · 滚动缩放' : '点击部位查看肉质')}</span>
					</div>
					{mode === 'anatomy' ? (
						<>
							<div className="ca-anatomy-canvas">
								<ModelBoundary
									key={reset}
									fallback={
										<div className="ca-model-fallback">
											<p>{tx('解剖模型暂时无法显示。部位图鉴仍可使用。')}</p>
											<button onClick={() => setReset((r) => r + 1)}>{tx('重新加载')}</button>
										</div>
									}
								>
									<ClientOnly fallback={<p>{tx('正在打开解剖模型…')}</p>}>
										<Suspense fallback={<p>{tx('正在打开解剖模型…')}</p>}>
											<AnatomyScene system={system} opacity={opacity} reset={reset} onInteract={interact} />
										</Suspense>
									</ClientOnly>
								</ModelBoundary>
							</div>
							<div className="ca-model-actions" data-experience-overlay="true">
								{system !== 'surface' && (
									<label>
										{tx('牛体轮廓')}
										<input
											aria-label={tx('牛体轮廓')}
											type="range"
											min="0"
											max=".4"
											step=".02"
											value={opacity}
											onChange={(e) => {
												interact();
												setOpacity(+e.target.value);
											}}
										/>
									</label>
								)}
								<button
									onClick={() => {
										interact();
										setReset((r) => r + 1);
									}}
								>
									{tx('复位视角')}
								</button>
							</div>
						</>
					) : (
						<CowMap selected={cut.id} onSelect={chooseCut} />
					)}
					<div
						className="ca-selection"
						role="group"
						aria-label={tx(mode === 'anatomy' ? '牛身体系统' : '十一种潮州牛肉火锅部位')}
						data-experience-overlay="true"
					>
						{mode === 'anatomy'
							? systems.map((s) => (
									<button
										key={s.id}
										aria-pressed={system === s.id}
										onClick={() => {
											interact();
											setSystem(s.id);
										}}
									>
										{tx(s.label)}
									</button>
								))
							: cuts.map((c, i) => (
									<button key={c.id} aria-pressed={cut.id === c.id} onClick={() => chooseCut(c.id)}>
										<small>{String(i + 1).padStart(2, '0')}</small>
										{tx(shortNames[c.id])}
									</button>
								))}
					</div>
				</section>
				<section className="ca-detail" aria-label={tx(mode === 'anatomy' ? '系统详情' : '肉质与切片')}>
					{mode !== 'anatomy' && (
						<div className="ca-detail-top" data-experience-overlay="true">
							<span>{tx('潮汕鲜切')}</span>
							<span>{`${String(cuts.indexOf(cut) + 1).padStart(2, '0')} / 11`}</span>
						</div>
					)}
					{mode === 'anatomy' ? (
						<>
							<div className="ca-detail-copy" data-experience-overlay="true">
								<h2>{tx(activeSystem.title)}</h2>
								<p>{tx(activeSystem.body)}</p>
								{system === 'digestive' && (
									<div className="ca-stomachs">
										{['瘤胃 · 发酵', '网胃 · 协同反刍', '瓣胃 · 吸收水分', '皱胃 · 酸与酶消化'].map((t) => (
											<span key={t}>{tx(t)}</span>
										))}
									</div>
								)}
								<small>{tx('模型为示意，不同个体的形态会有差异。')}</small>
							</div>
						</>
					) : (
						<>
							<div className="ca-platter" key={cut.id}>
								{mode === 'cuts' ? (
									<div
										className="ca-photo-plate"
										role="img"
										aria-label={tx(cut.label)}
										style={{ '--plate-x': `${(cut.atlas[0] / 3) * 100}%`, '--plate-y': `${(cut.atlas[1] / 2) * 100}%` } as CSSProperties}
									/>
								) : (
									<MeatSlice cut={cut} heat={heat} angle={angle} thickness={thickness} slices={slices} />
								)}
								{mode === 'slice' && (
									<button
										className="ca-knife"
										aria-label={tx('向下拖刀，切下一片')}
										style={{ '--knife-travel': `${knife * 130}px` } as CSSProperties}
										onPointerDown={(e) => {
											knifeStart.current = e.clientY;
											e.currentTarget.setPointerCapture(e.pointerId);
										}}
										onPointerMove={(e) => {
											if (knifeStart.current !== null) setKnife(Math.max(0, Math.min(1, (e.clientY - knifeStart.current) / 100)));
										}}
										onPointerUp={(e) => {
											if (knifeStart.current !== null && e.clientY - knifeStart.current > 45) slice();
											knifeStart.current = null;
											setKnife(0);
										}}
										onPointerCancel={() => {
											knifeStart.current = null;
											setKnife(0);
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												slice();
											}
										}}
									>
										<i />
										<span>{tx('向下拖刀')}</span>
									</button>
								)}
								<span className="ca-platter-seal" aria-hidden="true">
									{tx('鲜切')}
								</span>
							</div>
							<div className="ca-detail-copy" data-experience-overlay="true">
								<span className="ca-kicker">{tx(cut.standard)}</span>
								<h2>
									{tx(shortNames[cut.id])}
									<span>{tx(cut.texture)}</span>
								</h2>
								<p>{tx(cut.body)}</p>
								{mode === 'cuts' ? (
									<button className="ca-text-action" onClick={() => chooseMode('slice')}>
										{tx('切开看看里面')} <span>↗</span>
									</button>
								) : (
									<>
										<div className="ca-slice-controls">
											<div className="ca-angle-switch" role="group" aria-label={tx('切向')}>
												<button
													disabled={!muscle}
													aria-pressed={angle === 90}
													onClick={() => {
														interact();
														setAngle(90);
														setSlices(1);
													}}
												>
													{tx('逆纹切')}
												</button>
												<button
													disabled={!muscle}
													aria-pressed={angle === 0}
													onClick={() => {
														interact();
														setAngle(0);
														setSlices(1);
													}}
												>
													{tx('顺纹切')}
												</button>
											</div>
											<label>
												{tx('厚度')} <b>{thickness.toFixed(1)} mm</b>
												<input
													type="range"
													aria-label={tx('厚度')}
													min=".5"
													max="5"
													step=".5"
													value={thickness}
													onChange={(e) => {
														interact();
														setThickness(+e.target.value);
														setSlices(1);
													}}
												/>
											</label>
											<button className="ca-cut-action" onClick={slice}>
												{tx(slices >= 5 ? '重新摆盘' : '切一片')} <span>＋</span>
											</button>
										</div>
									</>
								)}
							</div>
						</>
					)}
				</section>
			</div>
			<section className="ca-learning" data-experience-overlay="true" aria-label={tx('结构与口感')}>
				{mode === 'slice' ? (
					<>
						<div className="ca-fiber-experiment">
							<div className={`ca-fiber-window ${!muscle ? 'ca-nonmuscle' : ''}`} aria-hidden="true">
								{Array.from({ length: 12 }, (_, i) => (
									<i key={i} style={{ width: `${Math.min(92, span * 3)}%`, top: `${9 + i * 7}%`, left: `${4 + (i % 3) * 2}%` }} />
								))}
							</div>
							<div>
								<span className="ca-kicker">{tx(muscle ? '放大看肌纤维' : '组织结构')}</span>
								<h3>
									{tx(
										!muscle
											? cut.id === 'tripe'
												? '百叶是胃的叶片'
												: '胸口朥是筋脂组织'
											: angle === 90
												? '横着切，纤维更短'
												: '顺着切，留下长纤维',
									)}
								</h3>
								<p>{tx(muscle ? '逆纹切和薄切都会缩短肉片中的肌纤维。' : '这个部位的组织不呈平行肌纤维排列，不能用顺纹、逆纹来比较。')}</p>
							</div>
						</div>
						<div className="ca-heat">
							<div className="ca-heat-tabs" role="group" aria-label={tx('受热变化')}>
								{['未加热', '受热收缩', '继续久煮'].map((label, i) => (
									<button
										key={label}
										aria-pressed={heat === i}
										onClick={() => {
											interact();
											setHeat(i);
										}}
									>
										{tx(label)}
									</button>
								))}
							</div>
							<p>
								{tx(
									heat === 2
										? cut.overcook
										: heat === 1
											? muscle
												? '肌肉受热会收缩、失水。图中颜色不代表实际熟度。'
												: '不同组织受热后的变化不同。图示不用于判断熟度。'
											: '筋花、脂肪与肌纤维的放大示意。',
								)}
							</p>
						</div>
					</>
				) : mode === 'cuts' ? (
					<>
						<div className="ca-tissue">
							<div className="ca-tissue-tabs" role="group" aria-label={tx('肉里有什么')}>
								{tissueNotes.map(([title], i) => (
									<button
										key={title}
										aria-pressed={tissue === i}
										onClick={() => {
											interact();
											setTissue(i);
										}}
									>
										<i className={`ca-tissue-icon ca-tissue-${i}`} />
										{tx(title)}
									</button>
								))}
							</div>
							<p aria-live="polite">{tx(tissueNotes[tissue][1])}</p>
						</div>
						<div className="ca-cooking">
							<span className="ca-kicker">{tx('地方烹饪标准参考')}</span>
							<strong>{tx(cut.timeLabel)}</strong>
							<p>{tx(cut.boundary)}</p>
						</div>
					</>
				) : (
					<button className="ca-text-action" onClick={() => chooseMode('cuts')}>
						{tx('查看牛肉部位')} ↗
					</button>
				)}
			</section>
			<footer className="ca-footnote" data-experience-overlay="true">
				<span>{tx('图形与组织纹理为示意；餐饮名称不与单一肌肉严格对应。')}</span>
				<span>{tx('口感时间不是安全倒计时，实际食用须充分熟透。')}</span>
			</footer>
		</div>
	);
}
