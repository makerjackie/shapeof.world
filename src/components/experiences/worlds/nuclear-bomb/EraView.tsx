import { useEffect, useMemo, useState } from 'react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { useExperienceI18n } from '~/i18n/experience';
import { useI18n } from '~/i18n';
import { annualTotal, HISTORY_DATA, observationAt, STOCKPILE_PEAK, TEST_PEAK } from './history-data';
import { COUNTRY_COLORS, COUNTRY_NAMES, ERA_SITES } from './era-sites';
import { EraGlobe } from './EraGlobe';
import { HISTORY_EVENTS } from './history';
import doe from './doe-events.json';
import eventsUrl from './doe-events.json?url';

const start = 1945,
	end = 2026,
	left = 45,
	width = 1040,
	bottom = 126,
	plot = 980;
const x = (y: number) => left + ((y - start) / (end - start)) * plot;
const stockMax = 70000;
const areas = HISTORY_DATA.stockpiles.countries.map((_, i) => {
	const top = HISTORY_DATA.stockpiles.rows.map(
		([y, v]) => `${x(y)},${bottom - (v.slice(0, i + 1).reduce<number>((s, a) => s + (a ?? 0), 0) / stockMax) * 110}`,
	);
	const base = [...HISTORY_DATA.stockpiles.rows]
		.reverse()
		.map(([y, v]) => `${x(y)},${bottom - (v.slice(0, i).reduce<number>((s, a) => s + (a ?? 0), 0) / stockMax) * 110}`);
	return `M${top.join(' L')} L${base.join(' L')} Z`;
});
const f = (v: number | null) => (v === null ? '—' : v.toLocaleString('en-US'));

export function EraView({ controls, active = true }: { controls: ExperienceControls; active?: boolean }) {
	const tx = useExperienceI18n(),
		{ locale } = useI18n(),
		lang = locale === 'en' ? 1 : 0;
	const [year, setYear] = useState(1945),
		[playing, setPlaying] = useState(false),
		[site, setSite] = useState('nevada'),
		[showSites, setShowSites] = useState(false);
	const tests = observationAt(HISTORY_DATA.tests, year),
		stocks = observationAt(HISTORY_DATA.stockpiles, year);
	const ranked = useMemo(
		() =>
			HISTORY_DATA.tests.countries
				.map((c, i) => ({ ...c, value: tests?.[1][i] ?? null }))
				.sort((a, b) => (b.value ?? -1) - (a.value ?? -1)),
		[tests],
	);
	const selected = ERA_SITES.find((s) => s.id === site)!;
	const usEvents = useMemo(
		() => doe.events.filter((e) => Number(e.date.slice(0, 4)) === year).sort((a, b) => a.date.localeCompare(b.date)),
		[year],
	);
	const milestones = HISTORY_EVENTS.filter((e) => Number(e.date.slice(0, 4)) === year);
	useEffect(() => {
		if (!active || !playing) return;
		const timer = window.setInterval(
			() =>
				setYear((y) => {
					if (y >= end) {
						setPlaying(false);
						return end;
					}
					return y + 1;
				}),
			500,
		);
		return () => clearInterval(timer);
	}, [active, playing]);
	const chooseYear = (y: number) => {
		setYear(y);
		setPlaying(false);
		controls.registerInteraction();
	};
	return (
		<section className="na-era" data-era-year={year}>
			<EraGlobe
				year={year}
				active={active}
				onSite={(id) => {
					setSite(id);
					setShowSites(true);
					controls.registerInteraction();
				}}
				onInteract={controls.registerInteraction}
			/>
			<header className="na-heading">
				<p>1945 — 2026</p>
				<h1>{tx('一瞬，累积成一个时代。')}</h1>
				<span>{tx('拖动地球。沿同一根年份轴，看试验与库存。')}</span>
			</header>
			<aside className="na-era-reading" aria-live="polite">
				<strong className="na-era-year">{year}</strong>
				<div className="na-era-totals">
					<span>
						{tx('当年核试验')}
						<b>
							{f(annualTotal(tests))}
							<small>{tx('次')}</small>
						</b>
					</span>
					<span>
						{tx('全球核弹头库存')}
						<b>
							{f(annualTotal(stocks))}
							<small>{tx('枚')}</small>
						</b>
					</span>
				</div>
				<div className="na-test-countries">
					{ranked
						.filter((c) => (c.value ?? 0) > 0)
						.slice(0, 5)
						.map((c) => (
							<div key={c.code}>
								<span>{COUNTRY_NAMES[c.code][lang]}</span>
								<i
									style={{
										width: `${Math.max(2, ((c.value ?? 0) / Math.max(1, ranked[0].value ?? 1)) * 100)}%`,
										background: COUNTRY_COLORS[c.code],
									}}
								/>
								<b>{c.value}</b>
							</div>
						))}
				</div>
				<div className="na-peak-buttons">
					<button onClick={() => chooseYear(TEST_PEAK.year)}>
						{tx('试验最多的一年')}
						<b>
							{TEST_PEAK.year} · {TEST_PEAK.total}
						</b>
					</button>
					<button onClick={() => chooseYear(STOCKPILE_PEAK.year)}>
						{tx('库存峰值')}
						<b>
							{STOCKPILE_PEAK.year} · {f(STOCKPILE_PEAK.total)}
						</b>
					</button>
				</div>
				<button className="na-sites-entry" onClick={() => setShowSites(!showSites)} aria-expanded={showSites}>
					{tx('试验场与逐次记录')}
				</button>
				<small className="na-data-scope">{tx('地球：美国逐次坐标，其他国家试验场级。点不代表次数。')}</small>
			</aside>
			<div className="na-era-bottom">
				<div className="na-year-control">
					<button
						onClick={() => {
							setPlaying(!playing);
							controls.registerInteraction();
						}}
						aria-label={tx(playing ? '暂停历史' : '播放历史')}
					>
						{tx(playing ? '暂停' : '播放')}
					</button>
					<label>
						<span>
							{tx('年份')} <b>{year}</b>
						</span>
						<input
							type="range"
							min={start}
							max={end}
							step="1"
							value={year}
							onChange={(e) => chooseYear(Number(e.target.value))}
							aria-label={tx('历史年份')}
						/>
					</label>
					<span>{tx('一个游标，两条记录')}</span>
				</div>
				<svg
					className="na-era-charts"
					viewBox={`0 0 ${width} 225`}
					role="img"
					aria-label={tx('全球核弹头库存和年度核试验次数，共用年份游标')}
					onPointerDown={(e) => {
						const r = e.currentTarget.getBoundingClientRect();
						chooseYear(
							Math.max(
								start,
								Math.min(end, Math.round(start + ((((e.clientX - r.left) / r.width) * width - left) / plot) * (end - start))),
							),
						);
					}}
				>
					{[0, 35000, 70000].map((v) => (
						<g key={v}>
							<line
								x1={left}
								x2="1025"
								y1={bottom - (v / stockMax) * 110}
								y2={bottom - (v / stockMax) * 110}
								stroke="#c8d3d9"
								strokeWidth=".6"
							/>
							<text x="36" y={bottom - (v / stockMax) * 110 + 3} textAnchor="end">
								{v ? v / 1000 + 'k' : '0'}
							</text>
						</g>
					))}
					{areas.map((d, i) => (
						<path key={i} d={d} fill={COUNTRY_COLORS[HISTORY_DATA.stockpiles.countries[i].code]} opacity=".86" />
					))}
					<text x={x(STOCKPILE_PEAK.year) + 8} y="14">
						{STOCKPILE_PEAK.year} · {f(STOCKPILE_PEAK.total)}
					</text>
					{HISTORY_DATA.tests.rows.map((r) => (
						<g key={r[0]}>
							{r[1].map((v, i) => {
								const lower = r[1].slice(0, i).reduce<number>((s, a) => s + (a ?? 0), 0);
								return (
									<rect
										key={i}
										x={x(r[0]) - 4}
										y={199 - ((lower + (v ?? 0)) / 200) * 58}
										width="8"
										height={((v ?? 0) / 200) * 58}
										fill={COUNTRY_COLORS[HISTORY_DATA.tests.countries[i].code]}
									/>
								);
							})}
						</g>
					))}
					<text x="36" y="146" textAnchor="end">
						200
					</text>
					<text x="36" y="199" textAnchor="end">
						0
					</text>
					{[1945, 1962, 1986, 2000, 2026].map((y) => (
						<text key={y} x={x(y)} y="216" textAnchor={y === 1945 ? 'start' : y === 2026 ? 'end' : 'middle'}>
							{y}
						</text>
					))}
					<line x1={x(year)} x2={x(year)} y1="8" y2="203" stroke="#783440" strokeWidth="1.5" />
				</svg>
				<div className="na-chart-caption">
					<span>{tx('上：库存（枚） · 下：试验（次）')}</span>
					<a href="https://ourworldindata.org/grapher/number-of-nuclear-weapons-tests" target="_blank" rel="noreferrer">
						OWID / FAS / ACA · CC BY 4.0
					</a>
					<span>{tx('库存不含退役待拆弹头。试验数据截至 2024 年，之后留空。')}</span>
				</div>
			</div>
			{showSites && (
				<aside className="na-evidence na-site-panel">
					<button className="na-close" aria-label={tx('关闭')} onClick={() => setShowSites(false)}>
						×
					</button>
					<h2>{tx('试验场与逐次记录')}</h2>
					<label>
						{tx('试验场')}
						<select value={site} onChange={(e) => setSite(e.target.value)}>
							{ERA_SITES.map((s) => (
								<option key={s.id} value={s.id}>
									{locale === 'en' ? s.en : s.zh}
								</option>
							))}
						</select>
					</label>
					<p>
						{COUNTRY_NAMES[selected.country][lang]} · {selected.start}–{selected.end}
						<br />
						{tx('试验场级，中心坐标约到 0.1°。使用区间不表示每年都有试验。')}
					</p>
					<p>{tx('其他国家暂为场址名录，没有把国家年度总数分配到这些地点；名录也未覆盖所有场址。')}</p>
					<a href={selected.source} target="_blank" rel="noreferrer">
						{tx('场址来源')}
					</a>
					{milestones.map((e) => (
						<p key={e.id}>
							<a href={e.sourceUrl} target="_blank" rel="noreferrer">
								{e.date} · {lang ? e.title.en : e.title.zh}
							</a>
							<br />
							{lang ? e.description.en : e.description.zh}
						</p>
					))}
					<h3>{tx('美国当年逐次记录（全部场址）')}</h3>
					<p>{tx('美国：DOE/NV-209 Rev.16，1,054 次试验、1,149 次爆炸。一次试验可有多次同时爆炸；与年度统计口径有区别。')}</p>
					<p>
						{year} · {usEvents.length} {tx('条美国爆炸记录')}
					</p>
					<ol className="na-event-list">
						{usEvents.map((e) => (
							<li key={e.id}>
								<time>{e.date}</time> <b>{e.name}</b>
								<small>
									{e.coordinates ? `${e.coordinates[1].toFixed(4)}, ${e.coordinates[0].toFixed(4)}` : tx('缺坐标，未绘点')} · PDF p.
									{e.sourcePage}
								</small>
							</li>
						))}
					</ol>
					<a href={eventsUrl} download>
						{tx('下载逐次清单（JSON）')}
					</a>{' '}
					·{' '}
					<a href={doe.source} target="_blank" rel="noreferrer">
						DOE/NV-209 Rev.16
					</a>
					<p>{tx('中国 596：1964 年。首次氢弹试验：1967 年。这里只记录历史，不展示内部构型。')}</p>
					<a href="https://www.naturalearthdata.com/blog/admin-0-countries-point-of-views/" target="_blank" rel="noreferrer">
						Natural Earth · China POV 5.1.1
					</a>
				</aside>
			)}
		</section>
	);
}
