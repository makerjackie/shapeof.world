import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Play, Pause, X, CaretDown } from '@phosphor-icons/react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { useExperienceI18n } from '~/i18n/experience';
import { useI18n } from '~/i18n';
import { useWorldReducedMotion } from '~/lib/world-motion';
import { GhostHint } from '~/components/experiences/GhostHint';
import { GuideTour, type GuideStagePlan } from '~/components/experiences/GuideTour';
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode';
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities';
import {
	BATCH,
	DEFAULT_ECONOMY,
	ROLES,
	buildingFunding,
	cashAtDay,
	economyAccount,
	type EconomyParams,
	type RoleId,
} from './economy-model';
import { Building, EconomyTown, MoneyRibbon, PersonGlyph, type TownNode } from './visuals/EconomyTown';
import './styles/TShirtWorld.css';

type View = 'network' | 'factory' | 'cash' | 'profit';
const VIEWS = [
	{ id: 'network', label: '钱的流向' },
	{ id: 'factory', label: '打开工厂' },
	{ id: 'cash', label: '订单与垫资' },
	{ id: 'profit', label: '利润与建楼' },
] as const;
const percent = (n: number) => `${Math.round(n * 100)}%`;
const OPENING = [
	{ title: '先看一件 T 恤。', body: '一张价签，背后是多少人的收入？' },
	{ title: '你付款，商店有了收入。', body: '跟着这笔钱，走到柜台后面。' },
	{ title: '商店的钱，流进工厂。', body: '一部分收入用来采购成衣，成为制衣厂的收入。' },
	{ title: '工厂里，是一个个领工资的人。', body: '其中一部分，成了工人、技术员与高管的工资。' },
	{ title: '再往前，还有面料和棉花。', body: '制衣厂买面料，纺织厂买棉花。一笔成本，是另一家的收入。' },
	{ title: '一件衣服，连起一座小镇。', body: '工资进入家庭，借款连接银行，利润留存或分红。点开建筑，继续追。' },
] as const;
const OPENING_PLAN: GuideStagePlan = OPENING.map(() => ({
	position: 'top-left',
	mobilePosition: 'top-left',
	motion: 'fade',
	tone: 'light',
	treatment: 'caption',
	width: 'wide',
}));

export function TShirtWorld({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n(),
		{ locale } = useI18n(),
		reduced = useWorldReducedMotion();
	useRegisterExperienceCapabilities('tshirt-world', { supportsImmersive: true });
	const root = useRef<HTMLDivElement>(null);
	const { storyMode, enterFree, enterStory } = useStoryFreeMode('tshirt-world');
	const [openingStep, setOpeningStep] = useState(0);
	const [view, setView] = useState<View>('network');
	const [plant, setPlant] = useState<'factory' | 'textile'>('factory');
	const [params, setParams] = useState<EconomyParams>(DEFAULT_ECONOMY);
	const [batch, setBatch] = useState(false);
	const [goods, setGoods] = useState(false);
	const [paused, setPaused] = useState(false);
	const [compact, setCompact] = useState(false);
	const [active, setActive] = useState<TownNode | null>(null);
	const [salaryMode, setSalaryMode] = useState<'person' | 'total'>('person');
	const [factoryTab, setFactoryTab] = useState<'wages' | 'costs'>('wages');
	const [role, setRole] = useState<RoleId>('workers');
	const [day, setDay] = useState(0);
	const [clockPlaying, setClockPlaying] = useState(false);
	const [loanShare, setLoanShare] = useState(0.7);
	const [notes, setNotes] = useState(false);
	const a = useMemo(() => economyAccount(params), [params]);
	const openingAccount = useMemo(() => economyAccount(DEFAULT_ECONOMY), []);
	const cash = cashAtDay(a, day),
		building = buildingFunding(a, loanShare);
	const isTextile = plant === 'textile';
	const selectedPlant = isTextile ? a.textile : a;
	const selectedRole = ROLES.find((r) => r.id === role)!;
	const currency = (value: number, digits = 0) =>
		new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
			style: 'currency',
			currency: 'CNY',
			currencyDisplay: 'narrowSymbol',
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		}).format(value);
	const shortMoney = (value: number) =>
		locale === 'zh' && Math.abs(value) >= 10000
			? `${value < 0 ? '−' : ''}¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(Math.abs(value) / 10000)}${tx('万')}`
			: locale === 'en' && Math.abs(value) >= 100000
				? `${value < 0 ? '−' : ''}¥${(Math.abs(value) / 1000000).toFixed(2)}m`
				: currency(value, Math.abs(value) < 100 ? 2 : 0);
	const amount = (value: number) => (batch ? shortMoney(value) : currency(value / BATCH, 2));
	const flowMoney = (unit: number) => (batch ? shortMoney(unit * BATCH) : currency(unit, unit < 10 ? 2 : 0));
	const interact = () => controls.registerInteraction();
	const openingSteps = useMemo(
		() =>
			OPENING.map((step, index) => ({
				...step,
				durationMs: index === 0 ? 4800 : 6400,
				action: () => {
					enterStory();
					setOpeningStep(index);
					setView('network');
					setActive(null);
					setGoods(false);
					setClockPlaying(false);
				},
			})),
		[enterStory],
	);
	useEffect(() => {
		if (new URLSearchParams(window.location.search).get('capture') === '1') enterFree();
	}, [enterFree]);
	const change = (key: keyof EconomyParams, value: number) => {
		setParams((p) => ({ ...p, [key]: value }));
		interact();
	};
	const navigate = (next: View) => {
		setView(next);
		setActive(null);
		setClockPlaying(false);
		interact();
	};
	const node = (id: TownNode) => {
		enterFree();
		interact();
		if (id === 'factory' || id === 'textile') {
			setPlant(id);
			setView('factory');
			setFactoryTab('wages');
			setActive(id);
		} else if (id === 'bank') {
			setView('cash');
			setActive(id);
		} else if (id === 'owners') {
			setView('profit');
			setActive(id);
		} else if (id === 'people') {
			setPlant('factory');
			setView('factory');
			setFactoryTab('wages');
			setActive(id);
		} else setActive((current) => (current === id ? null : id));
	};
	const reset = () => {
		setParams({ ...DEFAULT_ECONOMY, salaries: { ...DEFAULT_ECONOMY.salaries } });
		setDay(0);
		setClockPlaying(false);
		setLoanShare(0.7);
		interact();
	};
	useEffect(() => {
		const el = root.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 740));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (!clockPlaying) return;
		let frame = 0,
			last = 0;
		const tick = (now: number) => {
			if (last && !document.hidden) setDay((d) => Math.min(120, d + Math.min(0.1, (now - last) / 1000) * 7));
			last = now;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [clockPlaying]);
	useEffect(() => {
		if (day >= 120) setClockPlaying(false);
	}, [day]);
	const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, display: string) => (
		<label className="et-slider">
			<span>
				{tx(label)}
				<output>{display}</output>
			</span>
			<input
				aria-label={tx(label)}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
		</label>
	);
	const closeLabel = tx('返回全链条');
	const costs = isTextile ? a.textile.costs : a.costs;
	const rows = selectedPlant.roles;
	const maxWage = Math.max(...rows.map((r) => (salaryMode === 'person' ? r.pay : r.total)));

	return (
		<div
			ref={root}
			lang={locale === 'zh' ? 'zh-CN' : 'en'}
			className={`tshirt-economy et-view-${view}${paused || reduced ? ' et-paused' : ''}${storyMode ? ' et-story' : ''}`}
			data-view={view}
			data-opening-step={storyMode ? openingStep : 'free'}
			onKeyDown={(e) => {
				if (e.key === 'Escape') {
					if (notes) setNotes(false);
					else if (view !== 'network') navigate('network');
					else setActive(null);
				}
			}}
		>
			<div className="et-ambient" aria-hidden="true" />
			{!storyMode && view === 'network' && !reduced && (
				<GhostHint worldId="tshirt-world" gesture={{ type: 'tap', target: '[data-town-node="factory"]', label: '点开工厂，看钱怎么分' }} />
			)}
			{!storyMode && (
				<header className="et-heading" data-experience-overlay="true">
					<div>
						<p>{tx('一件 T 恤里的经济')}</p>
						<h1>
							{tx(
								view === 'network'
									? '买件 T 恤，钱去哪了？'
									: view === 'factory'
										? '同一家工厂，不同的收入。'
										: view === 'cash'
											? !cash.produced
												? '先买面料，再等货款。'
												: cash.settled
													? '货款到账，还剩多少？'
													: '衣服已交，钱还在路上。'
											: '留下的钱，变成什么？',
							)}
						</h1>
					</div>
					<div className="et-top-actions">
						<button
							className="et-assumptions"
							onClick={() => {
								setNotes(true);
								interact();
							}}
						>
							{tx('示意账本')}
							<CaretDown size={12} />
						</button>
						{(view === 'network' || view === 'factory') && (
							<div className="et-scale" aria-label={tx('金额尺度')}>
								<button
									aria-pressed={!batch}
									onClick={() => {
										setBatch(false);
										interact();
									}}
								>
									{tx('每件')}
								</button>
								<button
									aria-pressed={batch}
									onClick={() => {
										setBatch(true);
										interact();
									}}
								>
									{tx('整批 10 万件')}
								</button>
							</div>
						)}
					</div>
				</header>
			)}

			<div inert={view !== 'network'} className={`et-map-layer${view !== 'network' ? ' is-background' : ''}`}>
				<EconomyTown
					account={storyMode ? openingAccount : a}
					tx={tx}
					money={storyMode ? (unit) => currency(unit, unit < 10 ? 2 : 0) : flowMoney}
					active={active}
					onSelect={node}
					goods={goods}
					paused={paused}
					reduced={reduced}
					compact={compact}
					openingStep={storyMode ? openingStep : null}
				/>
			</div>

			{!storyMode && view === 'network' && (
				<>
					<div className="et-legend" data-experience-overlay="true">
						<button
							aria-pressed={!goods}
							onClick={() => {
								setGoods(false);
								interact();
							}}
						>
							<i className="et-dot gold" />
							{tx('钱往回走')}
						</button>
						<button
							aria-pressed={goods}
							onClick={() => {
								setGoods(true);
								interact();
							}}
						>
							<i className="et-dot mint" />
							{tx('货往前走')}
						</button>
						<button
							className="et-pause"
							aria-label={tx(paused ? '播放流动' : '暂停流动')}
							onClick={() => {
								setPaused(!paused);
								interact();
							}}
						>
							{paused ? <Play size={13} /> : <Pause size={13} />}
						</button>
					</div>
					{active && (
						<aside className="et-node-account" data-experience-overlay="true">
							<button className="et-close" aria-label={tx('关闭账本')} onClick={() => setActive(null)}>
								<X size={16} />
							</button>
							<p>{tx(active === 'retail' ? '品牌与商店' : active === 'farm' ? '棉农与轧花' : '更多服务业')}</p>
							{active === 'retail' ? (
								<>
									<strong>{amount(a.retailRevenue)}</strong>
									<span>{tx('销售收入')}</span>
									<div className="et-mini-ledger">
										{Object.entries(a.retailCosts).map(([key, value]) => (
											<div key={key}>
												<span>
													{tx(
														(
															{
																procurement: '采购成衣',
																wages: '税前工资',
																channels: '渠道与房租',
																marketing: '广告营销',
																logistics: '物流',
															} as Record<string, string>
														)[key],
													)}
												</span>
												<b>{amount(value)}</b>
											</div>
										))}
										<div className={a.retailResidual < 0 ? 'negative' : 'positive'}>
											<span>{tx('零售经营结余')}</span>
											<b>{amount(a.retailResidual)}</b>
										</div>
									</div>
									{slider(
										'正价售罄率',
										params.fullPriceShare,
										0,
										1,
										0.05,
										(v) => change('fullPriceShare', v),
										percent(params.fullPriceShare),
									)}
									<small>{tx('余货均按 40 元清仓；零售结余未扣税费与折旧。')}</small>
								</>
							) : active === 'farm' ? (
								<>
									<strong>{amount(600000)}</strong>
									<span>{tx('皮棉销售收入')}</span>
									<div className="et-mini-ledger">
										<div>
											<span>{tx('种植、土地与轧花')}</span>
											<b>{amount(350000)}</b>
										</div>
										<div>
											<span>{tx('劳动报酬')}</span>
											<b>{amount(150000)}</b>
										</div>
										<div>
											<span>{tx('经营结余')}</span>
											<b>{amount(100000)}</b>
										</div>
									</div>
									<small>{tx('合并种植与轧花，未扣税费及折旧。')}</small>
								</>
							) : (
								<>
									<strong>{amount(3800000 + a.benefits + a.overhead)}</strong>
									<span>{tx('图中已展开的收入')}</span>
									<small>{tx('服务商还会支付自己的工资和供应商。这张图没有把它们再拆一遍。')}</small>
								</>
							)}
						</aside>
					)}
					<div className="et-map-control" data-experience-overlay="true">
						{slider('T 恤正价', params.retailPrice, 60, 180, 5, (v) => change('retailPrice', v), currency(params.retailPrice))}
						<button className="et-enter-factory" onClick={() => node('factory')}>
							{tx('进工厂看工资')}
							<ArrowRight size={17} />
						</button>
					</div>
				</>
			)}

			{view === 'factory' && (
				<section className="et-detail et-factory-detail" aria-label={tx('工厂账本')}>
					<div className="et-plant-stage">
						<div className="et-plant-select" data-experience-overlay="true">
							<button
								aria-pressed={!isTextile}
								onClick={() => {
									setPlant('factory');
									interact();
								}}
							>
								{tx('制衣厂')}
							</button>
							<button
								aria-pressed={isTextile}
								onClick={() => {
									setPlant('textile');
									interact();
								}}
							>
								{tx('纺织厂')}
							</button>
						</div>
						<svg className="et-open-factory" viewBox="0 0 440 330" aria-label={tx('工厂与它的员工')}>
							<g transform="translate(205,175) scale(1.2)">
								<Building kind={plant} open color="#719e91" />
							</g>
							{rows.map((group, g) =>
								Array.from({ length: group.count }, (_, i) => (
									<PersonGlyph
										key={`${group.id}-${i}`}
										color={group.color}
										x={40 + ((i + rows.slice(0, g).reduce((n, r) => n + r.count, 0)) % 20) * 18}
										y={245 + Math.floor((i + rows.slice(0, g).reduce((n, r) => n + r.count, 0)) / 20) * 14}
										scale={0.38}
									/>
								)),
							)}
						</svg>
						<div className="et-plant-total">
							<div>
								<strong>
									{rows.reduce((s, r) => s + r.count, 0)}
									<small>{tx('人')}</small>
								</strong>
								<span>{tx('一个生产月')}</span>
							</div>
							<div>
								<strong>{shortMoney(selectedPlant.payroll)}</strong>
								<span>{tx('税前工资总额')}</span>
							</div>
						</div>
						<div className="et-cost-strip" aria-label={tx('收入分解')}>
							{costs
								.filter((c) => c.amount > 0)
								.map((c) => (
									<i key={c.id} style={{ flex: c.amount, background: c.color }} title={`${tx(c.label)} ${amount(c.amount)}`} />
								))}
						</div>
						<div className="et-plant-profit">
							<span>{tx('每件净利润')}</span>
							<b className={selectedPlant.netProfit < 0 ? 'negative' : ''}>{currency(selectedPlant.netProfit / BATCH, 2)}</b>
							<span>{tx('买方支付')}</span>
							<b>{currency(selectedPlant.revenue / BATCH, 2)}</b>
						</div>
						{!isTextile && (
							<div className="et-factory-price" data-experience-overlay="true">
								{slider('成衣出厂价', params.factoryPrice, 24, 40, 1, (v) => change('factoryPrice', v), currency(params.factoryPrice))}
							</div>
						)}
						<button
							className="et-link"
							data-experience-overlay="true"
							onClick={() => {
								interact();
								setFactoryTab(factoryTab === 'wages' ? 'costs' : 'wages');
							}}
						>
							{tx(factoryTab === 'wages' ? '展开全部成本' : '回到工资分配')}
							<ArrowRight size={15} />
						</button>
					</div>
					<div className="et-plant-ledger">
						<div className="et-panel-title">
							<h2>{tx(factoryTab === 'wages' ? '工资发给谁？' : '收入怎样变成利润？')}</h2>
							{factoryTab === 'wages' && (
								<div className="et-scale" data-experience-overlay="true">
									<button
										aria-pressed={salaryMode === 'person'}
										onClick={() => {
											setSalaryMode('person');
											interact();
										}}
									>
										{tx('按人均')}
									</button>
									<button
										aria-pressed={salaryMode === 'total'}
										onClick={() => {
											setSalaryMode('total');
											interact();
										}}
									>
										{tx('按总额')}
									</button>
								</div>
							)}
						</div>
						{factoryTab === 'wages' ? (
							<>
								<p className="et-chart-unit">{tx(salaryMode === 'person' ? '条长 = 一个人的税前月薪' : '条长 = 这一组人的工资总额')}</p>
								<div className="et-wage-rows">
									{rows.map((r) => (
										<button
											key={r.id}
											className={`et-wage-row${(!isTextile && role === r.id) || (isTextile && r.id === 'textile-workers') ? ' is-active' : ''}`}
											onClick={() => {
												if (!isTextile) setRole(r.id as RoleId);
												interact();
											}}
										>
											<div className="et-wage-label">
												<span>
													<i style={{ background: r.color }} />
													{tx(r.label)}
													<small>
														{r.count} {tx(r.count === 1 ? '位' : '人')}
													</small>
												</span>
												<strong>{currency(salaryMode === 'person' ? r.pay : r.total)}</strong>
											</div>
											<div className="et-wage-track">
												<MoneyRibbon width={((salaryMode === 'person' ? r.pay : r.total) / maxWage) * 100} color={r.color} />
											</div>
											<span className="et-wage-math">
												{r.count} × {currency(r.pay)} = {currency(r.total)}
											</span>
										</button>
									))}
								</div>
								<div className="et-wage-adjust" data-experience-overlay="true">
									{isTextile
										? slider(
												'纺织工人税前月薪',
												params.textileWorkerPay,
												3000,
												8000,
												500,
												(v) => change('textileWorkerPay', v),
												currency(params.textileWorkerPay),
											)
										: slider(
												tx(selectedRole.label) + ' · ' + tx('税前月薪'),
												params.salaries[role],
												selectedRole.min,
												selectedRole.max,
												selectedRole.step,
												(v) => {
													setParams((p) => ({ ...p, salaries: { ...p.salaries, [role]: v } }));
													interact();
												},
												currency(params.salaries[role]),
											)}
								</div>
								<div className="et-inline-fact">
									<span>{tx('另付雇主福利')}</span>
									<b>{shortMoney(selectedPlant.benefits)}</b>
									<small>{tx('假设为工资的 20%，不等于员工到手收入。')}</small>
								</div>
							</>
						) : (
							<div className="et-cost-waterfall">
								{costs.map((c) => (
									<div key={c.id} className="et-cost-row">
										<span>
											<i style={{ background: c.color }} />
											{tx(c.label)}
										</span>
										<div>
											<MoneyRibbon width={(Math.abs(c.amount) / selectedPlant.revenue) * 100} color={c.color} negative={c.amount < 0} />
										</div>
										<b className={c.amount < 0 ? 'negative' : ''}>{amount(c.amount)}</b>
									</div>
								))}
								<p>{tx('折旧减少利润，但本次没有再付出这笔现金。')}</p>
							</div>
						)}
					</div>
				</section>
			)}

			{view === 'cash' && (
				<section className="et-detail et-cash-detail" aria-label={tx('订单收付款')}>
					<div className="et-order-heading">
						<div>
							<span>{tx('一批 10 万件')}</span>
							<strong>{shortMoney(a.revenue)}</strong>
							<span>{tx('合同额')}</span>
						</div>
						<i />
						<div>
							<span>{tx('整单净利润')}</span>
							<strong className={a.netProfit < 0 ? 'negative' : 'positive'}>{shortMoney(a.netProfit)}</strong>
						</div>
					</div>
					<p className="et-cash-scale">{tx('水位共用刻度：满格为合同额')}</p>
					<div className="et-cash-scene">
						<div className="et-cash-node et-buyer">
							<svg viewBox="-110 -140 220 230">
								<Building kind="retail" />
							</svg>
							<h3>{tx('品牌买方')}</h3>
							<div className="et-cash-figure">
								<span>{tx(cash.produced ? '应收货款' : '约定尾款')}</span>
								<strong>{shortMoney(cash.produced ? cash.receivable : cash.futureBalance)}</strong>
							</div>
							<div className="et-tank">
								<i style={{ height: `${((cash.produced ? cash.receivable : cash.futureBalance) / a.revenue) * 100}%` }} />
							</div>
						</div>
						<div className={`et-cash-route${cash.settled ? ' is-arrived' : ''}`}>
							<span>{tx(cash.settled ? '尾款已到账' : '等待尾款')}</span>
							<div>
								<i />
								<i />
								<i />
							</div>
							<small>
								{a.paymentDay} {tx('天')}
							</small>
						</div>
						<div className="et-cash-node et-cash-factory">
							<svg viewBox="-110 -150 220 240">
								<Building kind="factory" />
							</svg>
							<h3>{tx('制衣厂')}</h3>
							<div className="et-cash-figure">
								<span>{tx('账户现金')}</span>
								<strong>{shortMoney(cash.cash)}</strong>
							</div>
							<div className="et-tank">
								<i style={{ height: `${Math.min(100, (cash.cash / a.revenue) * 100)}%` }} />
							</div>
						</div>
						<div className={`et-cash-route et-bank-route${cash.bankDebt > 0 ? ' is-borrowing' : ''}`}>
							<span>{tx(cash.bankDebt > 0 ? '银行先垫付' : '借款已结清')}</span>
							<div>
								<i />
								<i />
								<i />
							</div>
						</div>
						<div className="et-cash-node et-bank">
							<svg viewBox="-110 -140 220 230">
								<Building kind="bank" />
							</svg>
							<h3>{tx('银行')}</h3>
							<div className="et-cash-figure">
								<span>{tx('工厂尚欠借款')}</span>
								<strong className={cash.bankDebt > 0 ? 'negative' : ''}>{shortMoney(cash.bankDebt)}</strong>
							</div>
							<div className="et-tank debt">
								<i style={{ height: `${Math.min(100, (cash.bankDebt / a.revenue) * 100)}%` }} />
							</div>
						</div>
					</div>
					<div className="et-payment-events">
						<div className={day >= 0 ? 'is-paid' : ''}>
							<b>{tx('面料已付')}</b>
							<span>{shortMoney(a.material)}</span>
						</div>
						<div className={cash.produced ? 'is-paid' : ''}>
							<b>{tx(cash.produced ? '工资与运营已付' : '工资与运营待付')}</b>
							<span>{shortMoney(a.payroll + a.benefits + a.overhead)}</span>
						</div>
						<div className={cash.settled ? 'is-paid' : ''}>
							<b>{tx('整单融资成本')}</b>
							<span>{shortMoney(a.interest)}</span>
						</div>
					</div>
					<div className="et-order-controls" data-experience-overlay="true">
						<div className="et-day-control">
							<button
								aria-label={tx(clockPlaying ? '暂停收付款' : '播放收付款')}
								onClick={() => {
									if (day >= 120) setDay(0);
									setClockPlaying(!clockPlaying);
									interact();
								}}
							>
								{clockPlaying ? <Pause size={18} /> : <Play size={18} />}
							</button>
							{slider(
								'订单日期',
								day,
								0,
								120,
								1,
								(v) => {
									setClockPlaying(false);
									setDay(v);
									interact();
								},
								`${Math.floor(day)} ${tx('天')}`,
							)}
						</div>
						<div className="et-event-buttons">
							{[
								{ d: 0, label: '收定金、买面料' },
								{ d: 30, label: '交货、发工资' },
								{ d: a.paymentDay, label: '收尾款、结算' },
							].map((event, i) => (
								<button
									key={i}
									onClick={() => {
										setDay(event.d);
										setClockPlaying(false);
										interact();
									}}
								>
									{event.d} d · {tx(event.label)}
								</button>
							))}
						</div>
						<div className="et-terms">
							{slider('买方定金', params.depositShare, 0, 0.8, 0.05, (v) => change('depositShare', v), percent(params.depositShare))}
							{slider('尾款到账日', params.paymentDay, 30, 120, 5, (v) => change('paymentDay', v), `${params.paymentDay} ${tx('天')}`)}
						</div>
					</div>
				</section>
			)}

			{view === 'profit' && (
				<section className="et-detail et-profit-detail" aria-label={tx('利润分配与工厂资产')}>
					<div className="et-profit-split">
						<div className="et-profit-origin">
							<svg viewBox="-110 -150 220 240">
								<Building kind="factory" />
							</svg>
							<span>{tx('制衣厂整单净利润')}</span>
							<strong className={a.netProfit < 0 ? 'negative' : ''}>{shortMoney(a.netProfit)}</strong>
						</div>
						<svg className="et-split-routes" viewBox="0 0 480 90" aria-hidden="true">
							<path
								d="M240 0C240 50 90 25 90 90"
								fill="none"
								stroke="#c893ae"
								opacity={a.dividend > 0 ? 1 : 0}
								strokeWidth={2 + Math.max(0, params.payoutShare) * 16}
							/>
							<path
								d="M240 0C240 50 390 25 390 90"
								fill="none"
								stroke="#91cfb2"
								opacity={a.retainedProfit > 0 ? 1 : 0}
								strokeWidth={2 + (1 - params.payoutShare) * 16}
							/>
						</svg>
						<div className="et-profit-destinations">
							<div>
								<span>{tx('分给股东')}</span>
								<strong>{shortMoney(a.dividend)}</strong>
								<div className="et-profit-flow">
									<MoneyRibbon width={a.dividend > 0 ? params.payoutShare * 100 : 0} color="#c893ae" />
								</div>
							</div>
							<div>
								<span>{tx('留在公司')}</span>
								<strong className={a.retainedProfit < 0 ? 'negative' : undefined}>{shortMoney(a.retainedProfit)}</strong>
								<div className="et-profit-flow">
									<MoneyRibbon width={a.retainedProfit > 0 ? (1 - params.payoutShare) * 100 : 0} color="#91cfb2" />
								</div>
							</div>
						</div>
						<div data-experience-overlay="true">
							{slider('利润拿出多少分红', params.payoutShare, 0, 1, 0.05, (v) => change('payoutShare', v), percent(params.payoutShare))}
						</div>
						<div className="et-owner-pay">
							<h3>{tx('老板的两种收入')}</h3>
							<div>
								<span>{tx('总经理工资')}</span>
								<b>{currency(a.ownerSalary)}</b>
							</div>
							<div>
								<span>{tx('80% 股权对应的分红')}</span>
								<b>{currency(a.ownerDividend)}</b>
							</div>
							<small>{tx('工资已计入公司成本；分红来自税后利润。个人税费未计。')}</small>
						</div>
					</div>
					<div className="et-building-fund">
						<svg viewBox="-130 -170 260 285">
							<Building kind="services" color="#719e91" />
							<path d="M-110 55H115M-108 45V65M115 45V65" stroke="#829e93" fill="none" strokeWidth="1" />
						</svg>
						<h2>{tx('一栋 500 万元的厂房')}</h2>
						<div className="et-building-bar">
							<i style={{ flex: 1 - loanShare, background: '#91cfb2' }} />
							<i style={{ flex: loanShare, background: '#c893ae' }} />
						</div>
						<div className="et-building-sources">
							<div>
								<span>{tx('企业自有资金')}</span>
								<strong>{shortMoney(building.equity)}</strong>
							</div>
							<div>
								<span>{tx('长期借款')}</span>
								<strong>{shortMoney(building.loan)}</strong>
							</div>
						</div>
						<div data-experience-overlay="true">
							{slider(
								'建楼贷款比例',
								loanShare,
								0,
								0.8,
								0.05,
								(v) => {
									setLoanShare(v);
									interact();
								},
								percent(loanShare),
							)}
						</div>
						<div className="et-building-time">
							<span>{tx('本单留下现金')}</span>
							<strong>{shortMoney(a.cashAfterSettlement)}</strong>
							<p>
								{building.batches === null ? (
									tx('当前订单无法积累建楼资金。')
								) : (
									<>
										<b>{building.batches}</b> {tx('批相同订单，凑足自有资金')}
									</>
								)}
							</p>
						</div>
						<small>{tx('楼属于公司资产，贷款属于负债。这里只做简单累计，不预测融资审批或扩产收益。')}</small>
					</div>
				</section>
			)}

			{!storyMode && (
				<footer className="et-navigation" data-experience-overlay="true">
					<div className="et-view-tabs">
						{VIEWS.map((v) => (
							<button key={v.id} aria-pressed={view === v.id} onClick={() => navigate(v.id)}>
								<span>{tx(v.label)}</span>
							</button>
						))}
					</div>
					<button
						className="et-story-replay"
						aria-label={tx('从一件 T 恤开始')}
						title={tx('从一件 T 恤开始')}
						onClick={() => {
							setOpeningStep(0);
							setView('network');
							setNotes(false);
							enterStory();
							interact();
						}}
					>
						<Play size={14} /> <span>{tx('故事')}</span>
					</button>
					<button className="et-reset" aria-label={tx('重置账本')} onClick={reset}>
						<ArrowCounterClockwise size={17} />
					</button>
					{view !== 'network' && (
						<button className="et-back-map" aria-label={closeLabel} onClick={() => navigate('network')}>
							<ArrowLeft size={17} />
						</button>
					)}
				</footer>
			)}
			<GuideTour
				placement="stage"
				worldId="tshirt-world"
				steps={openingSteps}
				defaultOpen={storyMode}
				stagePlan={OPENING_PLAN}
				kicker={tx('一件 T 恤里的经济 · 教学假设')}
				exitLabel={tx('直接看小镇')}
				onExit={enterFree}
			/>
			{notes && (
				<aside className="et-notes" aria-label={tx('情景假设与口径')} data-experience-overlay="true">
					<button className="et-close" aria-label={tx('关闭假设')} onClick={() => setNotes(false)}>
						<X size={20} />
					</button>
					<h2>{tx('这是一家示意工厂。')}</h2>
					<p>{tx('所有人数、工资、价格和税率均为教学假设，不代表真实企业或行业平均。')}</p>
					<dl>
						<dt>{tx('生产规模')}</dt>
						<dd>{tx('一个生产月对应 10 万件，不叠加后续订单；比较人均工资时始终使用月薪。')}</dd>
						<dt>{tx('工厂利润')}</dt>
						<dd>{tx('收入扣面料、工资、雇主福利、运营、折旧、利息和所得税。福利假设为工资 20%，所得税假设为正利润 25%。')}</dd>
						<dt>{tx('现金与融资')}</dt>
						<dd>{tx('按日净额结算，银行补齐缺口，年息假设 8%；尾款到达后支付利息、税款和分红。未模拟授信限制。')}</dd>
						<dt>{tx('股权与建楼')}</dt>
						<dd>{tx('老板兼任总经理，假设持股 80%。留存现金等于留存利润加回折旧；建楼另分自有资金和借款。')}</dd>
						<dt>{tx('省略的部分')}</dt>
						<dd>{tx('不含增值税、个人所得税、税收优惠、退货、坏账、股票薪酬及工资变化后的需求或生产率反应。')}</dd>
						<dt>{tx('图的读法')}</dt>
						<dd>{tx('金色流带为款项，绿色为工资，粉色为资本收入；线宽对应每件金额，小额流保留最小可见宽度。物料层不表达货币数量。')}</dd>
					</dl>
					<p>{tx('资料依据：SEC 财报指南、BLS 薪酬成本定义、ILO 采购研究；完整链接见顶栏资料。')}</p>
				</aside>
			)}
		</div>
	);
}
