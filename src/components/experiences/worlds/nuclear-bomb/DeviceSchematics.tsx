import { ArrowLeft, ArrowRight, Pause, Play } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { useExperienceI18n } from '~/i18n/experience';

// 枪式与两级热核：只画公开百科、博物馆层面的部件和先后顺序。
// 不含尺寸、材料用量、几何形状或任何工程参数；比例只为看得懂。

export type DeviceKind = 'implosion' | 'gun' | 'staged';

type Step = { title: string; body: string };
type Device = { eyebrow: string; title: string; subtitle: string; steps: Array<Step>; note: string };

const DEVICES: Record<Exclude<DeviceKind, 'implosion'>, Device> = {
	gun: {
		eyebrow: '枪式装置 · 02 / 03',
		title: '把两块撞在一起。',
		subtitle: '「小男孩」的原理 · 结构示意',
		steps: [
			{ title: '点火', body: '尾部的普通炸药点燃，像一门炮。' },
			{ title: '飞行', body: '铀“子弹”沿炮管飞向前端。' },
			{ title: '合拢', body: '子弹套上铀靶。两块单独都不够，合在一起就超过了临界。' },
			{ title: '链式反应', body: '中子引发裂变，一代接一代，不到一微秒释放能量。' },
		],
		note: '枪式结构简单，但合拢太慢；钚会提前起反应，所以钚弹要用内爆式。',
	},
	staged: {
		eyebrow: '两级热核装置 · 03 / 03',
		title: '用一颗原子弹，点燃聚变。',
		subtitle: '泰勒–乌拉姆构型的公开原理 · 结构示意',
		steps: [
			{ title: '初级', body: '初级先爆，它本身就是一颗原子弹。' },
			{ title: 'X 射线', body: 'X 射线以光速充满外壳，比爆炸的冲击快得多。' },
			{ title: '压缩', body: '填充物被加热成等离子体，从四面压紧次级。' },
			{ title: '点火', body: '中心的火花塞开始裂变，把聚变燃料加热到极高的温度。' },
			{ title: '聚变', body: '聚变放出的能量可以远超初级，当量能到百万吨级。' },
		],
		note: '中国在 1967 年试验了第一颗氢弹。它的具体构型没有公开，这里不画。',
	},
};

const DISCLAIMER = '示意，非真实比例。只画公开百科和博物馆层面的部件与先后，不含尺寸、用量和工程细节。';

const DEVICE_LABELS: Array<{ id: DeviceKind; label: string }> = [
	{ id: 'implosion', label: '内爆式' },
	{ id: 'gun', label: '枪式' },
	{ id: 'staged', label: '两级热核' },
];

export function DeviceSwitch({ value, onChange }: { value: DeviceKind; onChange: (next: DeviceKind) => void }) {
	const tx = useExperienceI18n();
	return (
		<div className="na-device-switch" role="tablist" aria-label={tx('三种装置')} data-experience-overlay="true">
			{DEVICE_LABELS.map((device) => (
				<button
					key={device.id}
					type="button"
					role="tab"
					aria-selected={value === device.id}
					className={value === device.id ? 'is-active' : undefined}
					onClick={() => onChange(device.id)}
				>
					{tx(device.label)}
				</button>
			))}
		</div>
	);
}

function Label({ x, y, tx: textX, ty, text, align = 'start', dim }: { x: number; y: number; tx: number; ty: number; text: string; align?: 'start' | 'end'; dim?: boolean }) {
	return (
		<g className={`na-schem-label${dim ? ' is-dim' : ''}`}>
			<line x1={x} y1={y} x2={textX} y2={ty + 4} />
			<circle cx={x} cy={y} r={3} />
			<text x={textX + (align === 'start' ? 6 : -6)} y={ty} textAnchor={align}>
				{text}
			</text>
		</g>
	);
}

function GunFigure({ step }: { step: number }) {
	const tx = useExperienceI18n();
	// 子弹在炮管里的位置：0 = 尾部，1 = 套上铀靶。
	const travel = step <= 0 ? 0 : step === 1 ? 0.55 : 1;
	const projectileX = 214 + travel * 478;
	return (
		<svg className="na-schem-figure" viewBox="0 0 1000 380" role="img" aria-label={tx('枪式装置示意图')}>
			<defs>
				<radialGradient id="na-glow-gun">
					<stop offset="0" stopColor="#fff6e6" />
					<stop offset="0.45" stopColor="#ffa070" stopOpacity="0.8" />
					<stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
				</radialGradient>
			</defs>
			{/* 尾翼与弹壳 */}
			<path className="na-schem-casing" d="M118 118 H820 Q900 118 900 190 Q900 262 820 262 H118 Z" />
			<path className="na-schem-fin" d="M118 118 L58 86 L58 294 L118 262 Z" />
			{/* 尾部炸药 */}
			<rect className={`na-schem-charge${step === 0 ? ' is-firing' : ''}`} x="136" y="150" width="70" height="80" rx="6" />
			{/* 炮管 */}
			<rect className="na-schem-barrel" x="206" y="168" width="520" height="44" />
			{/* 铀靶，外面包着反射层 */}
			<rect className="na-schem-tamper" x="700" y="138" width="150" height="104" rx="10" />
			<rect className="na-schem-fissile" x="728" y="178" width="96" height="24" rx="3" />
			{/* 铀“子弹”：空心的一摞环 */}
			<g className="na-schem-projectile" style={{ transform: `translateX(${projectileX - 214}px)` }}>
				<rect className="na-schem-fissile" x="214" y="160" width="96" height="14" rx="3" />
				<rect className="na-schem-fissile" x="214" y="206" width="96" height="14" rx="3" />
			</g>
			{step >= 3 && <circle className="na-schem-glow" cx="776" cy="190" r="150" fill="url(#na-glow-gun)" />}
			{step === 1 && (
				<g className="na-schem-arrows">
					<path d="M380 136 H560" markerEnd="url(#na-arrow)" />
				</g>
			)}
			<defs>
				<marker id="na-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0 0 L10 5 L0 10 z" className="na-schem-arrowhead" />
				</marker>
			</defs>
			<Label x={170} y={232} tx={150} ty={318} text={tx('尾部炸药')} dim={step > 0} />
			<Label x={460} y={212} tx={430} ty={318} text={tx('炮管')} dim={step > 1} />
			{step < 2 && <Label x={projectileX + 48} y={160} tx={projectileX + 20} ty={72} text={tx('铀“子弹”')} />}
			<Label x={776} y={178} tx={790} ty={72} text={tx('铀靶')} />
			<Label x={846} y={238} tx={880} ty={318} text={tx('反射层与弹壳')} align="end" dim={step > 2} />
		</svg>
	);
}

function StagedFigure({ step }: { step: number }) {
	const tx = useExperienceI18n();
	const compressed = step >= 2;
	const squeeze = compressed ? 0.72 : 1;
	return (
		<svg className="na-schem-figure" viewBox="0 0 1000 400" role="img" aria-label={tx('两级热核装置示意图')}>
			<defs>
				<pattern id="na-foam" width="10" height="10" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="1" className="na-schem-foam-dot" />
					<circle cx="7" cy="7" r="1" className="na-schem-foam-dot" />
				</pattern>
				<radialGradient id="na-glow-primary">
					<stop offset="0" stopColor="#fff6e6" />
					<stop offset="0.5" stopColor="#ffa070" stopOpacity="0.75" />
					<stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
				</radialGradient>
				<radialGradient id="na-glow-secondary">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.4" stopColor="#ffd98a" stopOpacity="0.85" />
					<stop offset="1" stopColor="#ff6a3d" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="na-xray" x1="0" x2="1">
					<stop offset="0" stopColor="#9fd2f5" stopOpacity="0.36" />
					<stop offset="1" stopColor="#9fd2f5" stopOpacity="0.08" />
				</linearGradient>
				<marker id="na-arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M0 0 L10 5 L0 10 z" className="na-schem-arrowhead" />
				</marker>
			</defs>
			{/* 辐射外壳和填充泡沫 */}
			<rect className="na-schem-case" x="110" y="60" width="790" height="280" rx="120" />
			<rect className="na-schem-foam" x="126" y="76" width="758" height="248" rx="106" fill="url(#na-foam)" />
			{step >= 1 && <rect className="na-schem-xray" x="126" y="76" width="758" height="248" rx="106" fill="url(#na-xray)" />}
			{/* 初级：一颗小的裂变弹 */}
			<g className="na-schem-primary">
				<circle className="na-schem-shell" cx="270" cy="200" r="82" />
				<circle className="na-schem-explosive" cx="270" cy="200" r="64" />
				<circle className="na-schem-fissile" cx="270" cy="200" r="30" />
				{step >= 0 && <circle className="na-schem-glow" cx="270" cy="200" r={step === 0 ? 120 : 70} fill="url(#na-glow-primary)" />}
			</g>
			{/* 次级：推进层、聚变燃料、中心的火花塞 */}
			<g className="na-schem-secondary" style={{ transform: `scale(1, ${squeeze})`, transformOrigin: '660px 200px' }}>
				<rect className="na-schem-pusher" x="490" y="122" width="340" height="156" rx="72" />
				<rect className="na-schem-fuel" x="510" y="140" width="300" height="120" rx="56" />
				<rect className={`na-schem-fissile${step >= 3 ? ' is-hot' : ''}`} x="540" y="192" width="240" height="16" rx="8" />
			</g>
			{step === 1 && (
				<g className="na-schem-arrows">
					<path d="M360 96 H760" markerEnd="url(#na-arrow-in)" />
					<path d="M360 304 H760" markerEnd="url(#na-arrow-in)" />
				</g>
			)}
			{step === 2 && (
				<g className="na-schem-arrows">
					<path d="M660 82 V126" markerEnd="url(#na-arrow-in)" />
					<path d="M660 318 V274" markerEnd="url(#na-arrow-in)" />
					<path d="M870 200 H836" markerEnd="url(#na-arrow-in)" />
				</g>
			)}
			{step >= 4 && <circle className="na-schem-glow" cx="660" cy="200" r="230" fill="url(#na-glow-secondary)" />}
			<Label x={270} y={118} tx={230} ty={30} text={tx('初级：一颗裂变弹')} />
			<Label x={600} y={140} tx={600} ty={30} text={tx('次级：聚变燃料')} />
			<Label x={760} y={200} tx={880} ty={384} text={tx('火花塞：可裂变的芯')} align="end" />
			<Label x={150} y={300} tx={140} ty={384} text={tx('辐射外壳')} />
			<Label x={420} y={300} tx={380} ty={384} text={tx('填充泡沫')} dim={step >= 2} />
		</svg>
	);
}

export function DeviceSchematic({ kind, active, onReturnCity }: { kind: Exclude<DeviceKind, 'implosion'>; active: boolean; onReturnCity: () => void }) {
	const tx = useExperienceI18n();
	const device = DEVICES[kind];
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(true);
	const last = device.steps.length - 1;

	useEffect(() => {
		setStep(0);
		setPlaying(true);
	}, [kind]);

	useEffect(() => {
		if (!active || !playing) return;
		if (step >= last) {
			setPlaying(false);
			return;
		}
		const timer = window.setTimeout(() => setStep((current) => Math.min(current + 1, last)), 2600);
		return () => window.clearTimeout(timer);
	}, [active, playing, step, last]);

	const go = (next: number) => {
		setPlaying(false);
		setStep(Math.max(0, Math.min(last, next)));
	};

	return (
		<section className="na-schematic" data-device={kind} aria-live="polite">
			<header className="na-schem-heading">
				<p>{tx(device.eyebrow)}</p>
				<h1>{tx(device.title)}</h1>
				<span>{tx(device.subtitle)}</span>
			</header>
			<div className="na-schem-stage">{kind === 'gun' ? <GunFigure step={step} /> : <StagedFigure step={step} />}</div>
			<div className="na-schem-panel">
				<ol className="na-schem-steps">
					{device.steps.map((item, index) => (
						<li key={item.title} className={index === step ? 'is-current' : index < step ? 'is-done' : undefined}>
							<button type="button" onClick={() => go(index)}>
								<span className="na-schem-index">{index + 1}</span>
								<strong>{tx(item.title)}</strong>
								<span>{tx(item.body)}</span>
							</button>
						</li>
					))}
				</ol>
				{/* Phones: the list collapses to a row of numbers and the current step reads here instead. */}
				<div className="na-schem-current" aria-hidden="true">
					<strong>{tx(device.steps[step].title)}</strong>
					<span>{tx(device.steps[step].body)}</span>
				</div>
				<div className="na-schem-controls">
					<button type="button" onClick={() => go(step - 1)} disabled={step === 0} aria-label={tx('上一步')}>
						<ArrowLeft size={16} />
					</button>
					<button
						type="button"
						onClick={() => {
							if (step >= last) setStep(0);
							setPlaying((value) => !value || step >= last);
						}}
						aria-label={tx(playing ? '暂停' : '播放')}
					>
						{playing ? <Pause size={16} /> : <Play size={16} />}
					</button>
					<button type="button" onClick={() => go(step + 1)} disabled={step === last} aria-label={tx('下一步')}>
						<ArrowRight size={16} />
					</button>
				</div>
				<p className="na-schem-note">{tx(device.note)}</p>
				<p className="na-schem-disclaimer">{tx(DISCLAIMER)}</p>
				<button type="button" className="na-schem-return" onClick={onReturnCity}>
					{tx('这样一次释放，落在一座城市上是什么样子。')}
				</button>
			</div>
		</section>
	);
}
