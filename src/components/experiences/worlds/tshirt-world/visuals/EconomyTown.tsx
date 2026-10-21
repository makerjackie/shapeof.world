import { useEffect, useRef, type CSSProperties } from 'react';
import type { EconomyAccount } from '../economy-model';
export type TownNode = 'farm' | 'textile' | 'factory' | 'retail' | 'people' | 'services' | 'bank' | 'owners';
type Tx = (text: string) => string;
const NODE_ENTRY: Record<TownNode, number> = { retail: 1, factory: 2, people: 3, textile: 4, farm: 4, services: 5, bank: 5, owners: 5 };
type Camera = [number, number, number, number];
const DESKTOP_CAMERAS: Camera[] = [
	[925, 210, 310, 235],
	[740, 80, 440, 390],
	[410, 105, 770, 350],
	[395, 100, 800, 560],
	[0, 0, 1200, 665],
	[0, 0, 1200, 665],
];
const MOBILE_CAMERAS: Camera[] = [
	[285, 5, 170, 145],
	[180, 25, 245, 265],
	[55, 15, 370, 405],
	[55, 15, 370, 460],
	[0, 0, 440, 655],
	[0, 0, 440, 655],
];

export function Building({
	kind = 'factory',
	color = '#7ca89d',
	open = false,
}: {
	kind?: TownNode | 'shirt';
	color?: string;
	open?: boolean;
}) {
	if (kind === 'shirt')
		return (
			<g>
				<path
					d="M-26-52-57-40-74-14-51 3-36-17-36 66 36 66 36-17 51 3 74-14 57-40 26-52Q0-29-26-52Z"
					fill="#f0e5ce"
					stroke="#c8bca4"
					strokeWidth="1.5"
				/>
				<path d="M-26-52Q0-17 26-52M-34 57H34M-53-5-68-17M53-5 68-17" fill="none" stroke="#c5b18b" strokeWidth="2" />
				<path d="M-24-14Q-30 24-25 50M23-17Q15 10 25 49" fill="none" stroke="#dfd3b9" strokeWidth="3" />
				<path d="M46-38 81-52 92-28 60-13Z" fill="#dfb781" />
				<circle cx="59" cy="-31" r="2" fill="#10232c" />
			</g>
		);
	if (kind === 'farm')
		return (
			<g>
				<path d="M-96 16 0-26 98 17 0 62Z" fill="#284d42" stroke="#44654f" />
				{[-2, -1, 0, 1, 2].map((i) => (
					<path key={i} d={`M${-65 + i * 12} ${23 + i * 5}l85-37`} stroke="#677950" strokeWidth="5" />
				))}
				{Array.from({ length: 15 }, (_, i) => (
					<g key={i} transform={`translate(${((i % 5) - 2) * 25 + (Math.floor(i / 5) - 1) * 14},${Math.floor(i / 5) * 13 - 4})`}>
						<path d="M0 16V-9M0 6-8-2M0 4 8-5" stroke="#a3a16b" fill="none" strokeWidth="2" />
						<circle cx="-8" cy="-4" r="6" fill="#d4d9bd" />
						<circle cx="5" cy="-9" r="7" fill="#ede8cc" />
						<circle cx="0" cy="-15" r="6" fill="#f4edd5" />
					</g>
				))}
			</g>
		);
	if (kind === 'people')
		return (
			<g>
				{[-1, 0, 1].map((i) => (
					<g key={i} transform={`translate(${i * 55},${Math.abs(i) * 12})`}>
						<path d="M-23-14 0-25 23-14V22L0 34-23 22Z" fill="#668f8a" />
						<path d="M0-25 23-14V22L0 34Z" fill="#385f66" />
						<path d="M-30-13 0-42 29-13 0-23Z" fill="#b89a7a" />
						<path d="M0-42 29-13 0-23Z" fill="#786e67" />
						<path d="M-14-6v12m8-15V3M7-7V5m9-2V14" stroke="#ead5a0" strokeWidth="5" />
					</g>
				))}
			</g>
		);
	if (kind === 'bank' || kind === 'owners')
		return (
			<g>
				<path d="M-68 20 0 50 68 20 0-10Z" fill="#34515c" />
				<path d="M-58-45 0-70 58-45 0-19Z" fill="#c5bba0" />
				<path d="M-58-45 0-19V31L-58 7Z" fill="#8c9c99" />
				<path d="M0-19 58-45V7L0 31Z" fill="#496872" />
				{[-43, -24, -5].map((x) => (
					<path key={x} d={`M${x} ${-34 + (x + 43) * 0.43}v44`} stroke="#d2ccb4" strokeWidth="7" />
				))}
				<path d="M-70 10 0 41 71 10M-74 18 0 50 75 18" stroke="#708889" strokeWidth="5" fill="none" />
				{kind === 'owners' && (
					<g transform="translate(45,-70)">
						<circle r="18" fill="#dfb781" />
						<path d="M-7-4H7M-6 3H6M0-11V11" stroke="#725c3f" strokeWidth="2" />
					</g>
				)}
			</g>
		);
	const height = kind === 'services' ? 80 : 60;
	return (
		<g>
			<ellipse cx="5" cy="40" rx="105" ry="31" fill="#04161e" opacity=".45" />
			<path d={`M-85 0 20 42 90 9V${-height}L-15 ${-height - 42}-85 ${-height - 9}Z`} fill={color} />
			<path d={`M20 42 90 9V${-height}L20 ${-height + 33}Z`} fill="#214855" opacity=".85" />
			<path d={`M-85 ${-height - 9} L-15 ${-height - 42} L90 ${-height} L20 ${-height + 33} Z`} fill="#9db6ad" />
			{kind !== 'retail' && kind !== 'services' && (
				<g className={open ? 'et-roof is-open' : 'et-roof'}>
					{[-1, 0, 1].map((i) => (
						<path
							key={i}
							d={`M${-80 + i * 25} ${-height - 7 + i * 10}l35-40 65 26-35 40Z`}
							fill={i === 0 ? '#b8c6b5' : '#91afa7'}
							stroke="#577c79"
							strokeWidth="1"
						/>
					))}
				</g>
			)}
			{kind === 'retail' ? (
				<g>
					<path d="M-77-54 12-18V31L-77-5Z" fill="#112f3c" />
					<path d="M-78-55 15-18 8-5-84-42Z" fill="#deb482" />
					{[0, 1, 2, 3, 4].map((i) => (
						<path key={i} d={`M${-75 + i * 18} ${-51 + i * 7}l-6 12 9 4 6-13Z`} fill="#f1dcc0" />
					))}
					<g transform="translate(-36,-3) scale(.22)">
						<Building kind="shirt" />
					</g>
					<path d="M-64-34V-6M-15-12V15" stroke="#6d8e93" strokeWidth="2" />
				</g>
			) : (
				<g>
					{Array.from({ length: kind === 'services' ? 12 : 8 }, (_, i) => {
						const x = -72 + (i % 4) * 22,
							y = -height + 20 + (i % 4) * 9 + Math.floor(i / 4) * 24;
						return <path key={i} d={`M${x} ${y}v12l12 5V${y + 5}Z`} fill={i % 3 === 0 ? '#edc98c' : '#477a80'} />;
					})}
					{kind !== 'services' && (
						<>
							<path d="M56-64V-116L71-123V-71Z" fill="#3b6870" />
							<path d="M45-69V-121L56-116V-64Z" fill="#94b3a8" />
							<path d="M45-121 60-128 71-123 56-116Z" fill="#b1c2ad" />
							<g className="et-steam" fill="#98b9b3" opacity=".16">
								<circle cx="60" cy="-143" r="10" />
								<circle cx="64" cy="-163" r="15" />
								<circle cx="78" cy="-187" r="19" />
							</g>
						</>
					)}
				</g>
			)}
			<path d="M-85 0 20 42 90 9" fill="none" stroke="#a3b5a4" opacity=".4" />
		</g>
	);
}

type Flow = {
	id: string;
	path: string;
	value: number;
	label: string;
	x: number;
	y: number;
	to: TownNode;
	from: TownNode | 'customer';
	color?: string;
};
export function EconomyTown({
	account: a,
	tx,
	money,
	active,
	onSelect,
	goods,
	paused,
	reduced,
	compact,
	openingStep = null,
}: {
	account: EconomyAccount;
	tx: Tx;
	money: (amount: number) => string;
	active: TownNode | null;
	onSelect: (node: TownNode) => void;
	goods: boolean;
	paused: boolean;
	reduced: boolean;
	compact: boolean;
	/** Null reveals the whole town; steps expand the same scene from the shirt. */
	openingStep?: number | null;
}) {
	const svg = useRef<SVGSVGElement>(null);
	const story = openingStep !== null;
	const target = (compact ? MOBILE_CAMERAS : DESKTOP_CAMERAS)[openingStep ?? 5];
	const initialCamera = useRef(target.join(' '));
	const camera = useRef<Camera>([...target]);
	const previousCompact = useRef(compact);
	useEffect(() => {
		const el = svg.current;
		if (!el) return;
		const destination = (compact ? MOBILE_CAMERAS : DESKTOP_CAMERAS)[openingStep ?? 5];
		const origin = [...camera.current];
		const instant = reduced || previousCompact.current !== compact;
		previousCompact.current = compact;
		let frame = 0;
		const started = performance.now();
		el.dataset.cameraSettled = 'false';
		const move = (now: number) => {
			const t = instant ? 1 : Math.min(1, (now - started) / 1250);
			const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			camera.current = destination.map((v, i) => origin[i] + (v - origin[i]) * eased) as Camera;
			el.setAttribute('viewBox', camera.current.join(' '));
			if (t < 1) frame = requestAnimationFrame(move);
			else el.dataset.cameraSettled = 'true';
		};
		frame = requestAnimationFrame(move);
		return () => cancelAnimationFrame(frame);
	}, [compact, openingStep, reduced]);
	const nodeVisible = (id: TownNode | 'customer') => !story || id === 'customer' || NODE_ENTRY[id] <= openingStep;
	const revealed = (show: boolean): CSSProperties => ({ opacity: show ? 1 : 0, pointerEvents: show ? undefined : 'none' });
	useEffect(() => {
		if (paused || reduced) svg.current?.pauseAnimations();
		else svg.current?.unpauseAnimations();
	}, [paused, reduced]);
	const flows: Flow[] = [
		{
			id: 'sale',
			path: 'M1060 290C1080 150 1020 139 920 186',
			value: a.averageRetail,
			label: '买衣服',
			x: 1060,
			y: 160,
			from: 'customer',
			to: 'retail',
		},
		{
			id: 'purchase',
			path: 'M797 254C734 305 702 347 628 332',
			value: a.factoryPrice,
			label: '采购成衣',
			x: 716,
			y: 280,
			from: 'retail',
			to: 'factory',
		},
		{ id: 'fabric', path: 'M481 306C404 304 392 269 357 244', value: 18, label: '买面料', x: 415, y: 290, from: 'factory', to: 'textile' },
		{ id: 'cotton', path: 'M237 245C204 250 167 265 137 310', value: 6, label: '买棉花', x: 191, y: 258, from: 'textile', to: 'farm' },
		{
			id: 'factory-pay',
			path: 'M600 365C638 422 683 426 679 499',
			value: a.payroll / 100000,
			label: '发工资',
			x: 627,
			y: 429,
			from: 'factory',
			to: 'people',
			color: '#91cfb2',
		},
		{
			id: 'textile-pay',
			path: 'M328 265C345 440 435 488 590 532',
			value: a.textile.payroll / 100000,
			label: '纺织厂工资',
			x: 444,
			y: 466,
			from: 'textile',
			to: 'people',
			color: '#91cfb2',
		},
		{
			id: 'retail-pay',
			path: 'M838 275C840 397 815 457 713 515',
			value: 10,
			label: '零售工资',
			x: 814,
			y: 406,
			from: 'retail',
			to: 'people',
			color: '#91cfb2',
		},
		{
			id: 'services',
			path: 'M916 259C986 327 1027 361 1017 478',
			value: 38,
			label: '渠道、广告、物流',
			x: 957,
			y: 373,
			from: 'retail',
			to: 'services',
		},
		{
			id: 'overhead',
			path: 'M617 365C775 380 863 473 968 525',
			value: (a.benefits + a.overhead) / 100000,
			label: '福利与运营',
			x: 829,
			y: 460,
			from: 'factory',
			to: 'services',
		},
		{
			id: 'interest',
			path: 'M493 353C437 408 374 455 304 478',
			value: a.interest / 100000,
			label: '利息',
			x: 370,
			y: 418,
			from: 'factory',
			to: 'bank',
			color: '#c893ae',
		},
		{
			id: 'dividend',
			path: 'M569 247C611 177 604 133 568 111',
			value: a.dividend / 100000,
			label: '股东分红',
			x: 628,
			y: 163,
			from: 'factory',
			to: 'owners',
			color: '#c893ae',
		},
	];
	if (compact) {
		const layout: Record<string, [string, number, number]> = {
			sale: ['M364 99C362 139 337 169 281 170', 340, 148],
			purchase: ['M239 219C232 267 198 277 166 300', 210, 279],
			fabric: ['M163 348C182 398 252 401 271 452', 226, 399],
			cotton: ['M247 488C208 507 166 500 125 516', 185, 523],
			'factory-pay': ['M185 330C245 320 290 315 333 342', 265, 314],
			'textile-pay': ['M319 456C351 439 371 409 363 369', 375, 420],
			'retail-pay': ['M284 212C332 252 375 274 361 333', 370, 267],
			services: ['M300 201C431 238 428 492 371 562', 404, 482],
			overhead: ['M184 354C277 409 307 489 345 549', 289, 426],
			interest: ['M112 331C69 321 44 289 56 252', 48, 342],
			dividend: ['M141 290C110 211 71 162 72 114', 127, 190],
		};
		for (const f of flows) {
			const [path, x, y] = layout[f.id];
			f.path = path;
			f.x = x;
			f.y = y;
		}
	}
	const nodes: Array<{ id: TownNode; x: number; y: number; label: string; detail: string }> = [
		{ id: 'farm', x: 96, y: 330, label: '棉农与轧花', detail: money(6) },
		{ id: 'textile', x: 290, y: 225, label: '纺织厂', detail: money(18) },
		{ id: 'factory', x: 558, y: 324, label: '制衣厂', detail: money(a.factoryPrice) },
		{ id: 'retail', x: 867, y: 224, label: '品牌与商店', detail: money(a.averageRetail) },
		{ id: 'people', x: 661, y: 540, label: '员工与家庭', detail: tx('工资继续进入生活') },
		{ id: 'services', x: 1008, y: 538, label: '更多服务业', detail: tx('渠道 · 广告 · 物流') },
		{ id: 'bank', x: 263, y: 522, label: '银行', detail: tx('借款与还款') },
		{ id: 'owners', x: 528, y: 97, label: '股东', detail: tx('分红与再投资') },
	];
	if (compact) {
		const positions: Record<TownNode, [number, number]> = {
			farm: [89, 535],
			textile: [283, 472],
			factory: [141, 326],
			retail: [260, 193],
			people: [350, 354],
			services: [360, 571],
			bank: [54, 237],
			owners: [68, 93],
		};
		for (const n of nodes) [n.x, n.y] = positions[n.id];
	}
	const goodsFlows = compact
		? [
				{ d: 'M123 519C169 495 213 504 252 489', label: '皮棉', x: 183, y: 515 },
				{ d: 'M271 452C252 401 182 398 163 348', label: '针织面料', x: 219, y: 397 },
				{ d: 'M166 300C198 277 232 267 239 219', label: '成衣', x: 232, y: 256 },
				{ d: 'M281 170C337 169 362 139 364 99', label: '一件 T 恤', x: 340, y: 148 },
			]
		: [
				{ d: 'M144 310C193 245 207 259 244 244', label: '皮棉', x: 197, y: 275 },
				{ d: 'M350 246C400 292 424 311 494 316', label: '针织面料', x: 415, y: 280 },
				{ d: 'M626 329C704 347 747 276 798 254', label: '成衣', x: 716, y: 281 },
				{ d: 'M929 221C985 206 1062 213 1078 276', label: '一件 T 恤', x: 1056, y: 201 },
			];
	return (
		<svg ref={svg} className="et-town" viewBox={initialCamera.current} aria-label={tx('一件 T 恤的经济流动地图')}>
			<defs>
				<pattern id="et-grid" width="90" height="45" patternUnits="userSpaceOnUse">
					<path d="M0 22.5 45 0 90 22.5 45 45Z" fill="none" stroke="#b3d1cd" strokeOpacity=".04" />
				</pattern>
				<radialGradient id="et-ground">
					<stop stopColor="#2d5358" stopOpacity=".32" />
					<stop offset="1" stopColor="#132731" stopOpacity="0" />
				</radialGradient>
				<marker id="et-arrow" viewBox="0 0 7 7" refX="6" refY="3.5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M0 0 7 3.5 0 7Z" fill="context-stroke" />
				</marker>
			</defs>
			<g className="et-reveal" style={revealed(!story || openingStep >= 4)} aria-hidden="true">
				<ellipse cx="610" cy="364" rx="615" ry="300" fill="url(#et-ground)" />
				<rect width="1200" height="665" fill="url(#et-grid)" />
				<g className="et-roads" fill="none" stroke="#618089" strokeWidth="1" opacity=".18">
					<path d="M70 391 585 623 1120 364M150 362 675 120M253 156 1064 501M85 501 889 90" />
				</g>
			</g>
			{!goods &&
				flows
					.filter((f) => f.value > 0)
					.map((f) => (
						<g
							key={f.id}
							className={`et-flow et-reveal${active && f.from !== active && f.to !== active ? ' is-muted' : ''}`}
							style={revealed(nodeVisible(f.from) && nodeVisible(f.to) && (!story || f.id !== 'retail-pay' || openingStep >= 5))}
							aria-hidden={!nodeVisible(f.from) || !nodeVisible(f.to) || (story && f.id === 'retail-pay' && openingStep < 5)}
						>
							<path d={f.path} fill="none" stroke={f.color ?? '#dfb781'} strokeWidth={Math.max(1.4, f.value * 0.28)} opacity=".16" />
							<path d={f.path} fill="none" stroke={f.color ?? '#dfb781'} strokeWidth=".8" opacity=".7" markerEnd="url(#et-arrow)" />
							{f.value > 0 &&
								[0, 1, 2].map((i) => (
									<circle key={i} r="2.3" fill={f.color ?? '#f1d2a0'}>
										<animateMotion dur="6s" begin={`${-i * 2}s`} repeatCount="indefinite" path={f.path} />
									</circle>
								))}
							{(!compact ||
								['sale', 'purchase', 'fabric', 'cotton', 'factory-pay', 'interest', 'dividend'].includes(f.id) ||
								active === f.from ||
								active === f.to) && (
								<g transform={`translate(${f.x},${f.y})`} className="et-flow-label">
									<text y="-5">{tx(f.label)}</text>
									<text y="13" className="et-flow-value">
										{money(f.value)}
									</text>
								</g>
							)}
						</g>
					))}
			{goods &&
				goodsFlows.map((f, i) => (
					<g key={f.label}>
						<path d={f.d} fill="none" stroke="#91cfb2" strokeWidth="8" opacity=".13" />
						<path d={f.d} fill="none" stroke="#91cfb2" strokeWidth="1.5" markerEnd="url(#et-arrow)" />
						{[0, 1, 2].map((j) => (
							<rect key={j} x="-4" y="-3" width="8" height="6" rx="1" fill="#b1dac7">
								<animateMotion dur="5s" begin={`${-j * 1.7 - i}s`} repeatCount="indefinite" path={f.d} />
							</rect>
						))}
						<text x={f.x} y={f.y} textAnchor="middle" className="et-goods-label">
							{tx(f.label)}
						</text>
					</g>
				))}
			{nodes.map((n) => (
				<g
					key={n.id}
					data-town-node={n.id}
					className={`et-node et-reveal${active === n.id ? ' is-selected' : ''}`}
					style={revealed(nodeVisible(n.id))}
					aria-hidden={!nodeVisible(n.id)}
					transform={`translate(${n.x},${n.y})`}
					role="button"
					tabIndex={nodeVisible(n.id) ? 0 : -1}
					aria-label={`${tx('打开')}${tx(n.label)}`}
					onClick={() => onSelect(n.id)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSelect(n.id);
						}
					}}
				>
					<g transform={compact ? 'scale(.51)' : undefined}>
						<ellipse className="et-node-ring" cx="0" cy="27" rx="103" ry="42" />
						<Building
							kind={n.id}
							open={story && openingStep === 3 && n.id === 'factory'}
							color={n.id === 'retail' ? '#a89b80' : n.id === 'textile' ? '#6b9da2' : '#77a897'}
						/>
					</g>
					<rect
						x={compact ? -55 : -100}
						y={compact ? -84 : -165}
						width={compact ? 110 : 200}
						height={compact ? 130 : 253}
						fill="transparent"
					/>
					<text className="et-node-title" y={compact ? 49 : 78}>
						{tx(n.label)}
						{!story && <tspan className="et-node-plus"> +</tspan>}
					</text>
					<text className="et-node-detail" y={compact ? 65 : 97}>
						{n.detail}
					</text>
				</g>
			))}
			<g transform={compact ? 'translate(365,71) scale(.48)' : 'translate(1080,330) scale(.74)'} data-town-shirt="true">
				<ellipse className="et-shirt-shadow" cx="5" cy="85" rx="61" ry="9" fill="#04141b" opacity=".45" />
				<Building kind="shirt" />
			</g>
			<text x={compact ? 365 : 1080} y={compact ? 119 : 407} className="et-node-title">
				{story && openingStep === 0 ? money(a.averageRetail) : tx('消费者')}
			</text>
		</svg>
	);
}

export function PersonGlyph({ color = '#91cfb2', x = 0, y = 0, scale = 1 }: { color?: string; x?: number; y?: number; scale?: number }) {
	return (
		<g transform={`translate(${x},${y}) scale(${scale})`} fill={color}>
			<circle cy="-8" r="3" />
			<path d="M-4-3Q0-6 4-3L5 6H2V13H-2V6H-5Z" />
		</g>
	);
}

export function MoneyRibbon({ width, color, negative = false }: { width: number; color: string; negative?: boolean }) {
	return (
		<span
			className={`et-money-ribbon${negative ? ' is-negative' : ''}`}
			style={{ width: `${width <= 0 ? 0 : Math.max(0.5, Math.min(100, width))}%`, '--ribbon-color': color } as CSSProperties}
		>
			<i />
			<i />
			<i />
		</span>
	);
}
