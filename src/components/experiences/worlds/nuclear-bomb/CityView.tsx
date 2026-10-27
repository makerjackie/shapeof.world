import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl';
import { unzipSync } from 'fflate';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { useExperienceI18n } from '~/i18n/experience';
import { useI18n } from '~/i18n';
import { CITY_PRESETS, cityEffects, HIROSHIMA } from './city-effects';
import tilesUrl from './hiroshima-mvt.zip?url';
import fireUrl from './registered-fire.png?url';
import registration from './fire-registration.json';

let archive: Promise<Record<string, Uint8Array>> | undefined;
function circle(radiusKm: number, id: string) {
	const coordinates = Array.from({ length: 181 }, (_, i) => {
		const bearing = (i / 180) * Math.PI * 2,
			d = radiusKm / 6371;
		const lat = (HIROSHIMA.latitude * Math.PI) / 180,
			lon = (HIROSHIMA.longitude * Math.PI) / 180;
		const p = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing));
		const l = lon + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(p));
		return [(l * 180) / Math.PI, (p * 180) / Math.PI];
	});
	return { type: 'Feature' as const, properties: { id }, geometry: { type: 'LineString' as const, coordinates } };
}
const n = (value: number | null) => (value === null ? '—' : value.toFixed(value < 10 ? 2 : 1));

export function CityView({ controls, active = true }: { controls: ExperienceControls; active?: boolean }) {
	const tx = useExperienceI18n(),
		{ locale } = useI18n();
	const host = useRef<HTMLDivElement>(null),
		mapRef = useRef<LibreMap | null>(null);
	const [ready, setReady] = useState(false),
		[error, setError] = useState(false);
	const [presetId, setPresetId] = useState<string>('hiroshima');
	const [history, setHistory] = useState(true),
		[model, setModel] = useState(true),
		[details, setDetails] = useState(false);
	const [raster, setRaster] = useState(false);
	const [sameScale, setSameScale] = useState(false);
	const preset = CITY_PRESETS.find((p) => p.id === presetId)!;
	const effects = useMemo(() => cityEffects(preset), [preset]);
	const base = useMemo(() => cityEffects(CITY_PRESETS[0]), []);
	const ratio = effects.blast5Km! / base.blast5Km!;
	const featureData = useMemo(
		() => ({
			type: 'FeatureCollection' as const,
			features: [
				circle(effects.fireballKm, 'fireball'),
				...(['blast20Km', 'blast5Km', 'blast1Km', 'thermalKm'] as const).flatMap((k) =>
					effects[k] === null ? [] : [circle(effects[k]!, k)],
				),
			],
		}),
		[effects],
	);

	useEffect(() => {
		setReady(false);
		let disposed = false;
		let instance: LibreMap | null = null;
		const markers: Array<{ remove: () => void }> = [];
		void import('maplibre-gl')
			.then(async (lib) => {
				archive ??= fetch(tilesUrl)
					.then((r) => {
						if (!r.ok) throw Error('map archive');
						return r.arrayBuffer();
					})
					.then((b) => unzipSync(new Uint8Array(b)));
				lib.addProtocol('hiroshima', async ({ url }) => {
					const key = url.replace('hiroshima://', '');
					const data = (await archive!)[key];
					return { data: data ? data.slice().buffer : new ArrayBuffer(0) };
				});
				await archive;
				if (disposed || !host.current) return;
				const mobile = host.current.clientWidth < 720;
				instance = new lib.Map({
					container: host.current,
					center: [HIROSHIMA.longitude, HIROSHIMA.latitude],
					zoom: mobile ? 12 : 12.7,
					minZoom: 8,
					maxZoom: 16,
					maxBounds: [
						[131.65, 33.8],
						[133.25, 35],
					],
					attributionControl: false,
					pitchWithRotate: false,
					dragRotate: false,
					style: {
						version: 8,
						sources: { hiroshima: { type: 'vector', tiles: ['hiroshima://{z}/{x}/{y}'], minzoom: 8, maxzoom: 13 } },
						// Dark basemap: near-black land, deep-blue water, thin light-grey roads, all drawn from our own OSM vector tiles.
						layers: [
							{ id: 'paper', type: 'background', paint: { 'background-color': '#0b0e11' } },
							{ id: 'park', type: 'fill', source: 'hiroshima', 'source-layer': 'park', paint: { 'fill-color': '#0f1513' } },
							{ id: 'water', type: 'fill', source: 'hiroshima', 'source-layer': 'water', paint: { 'fill-color': '#0e2131' } },
							{
								id: 'waterway',
								type: 'line',
								source: 'hiroshima',
								'source-layer': 'waterway',
								paint: { 'line-color': '#0e2131', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 12] },
							},
							{
								id: 'buildings',
								type: 'fill',
								source: 'hiroshima',
								'source-layer': 'building',
								paint: { 'fill-color': '#13181d', 'fill-opacity': 0.9 },
							},
							{
								id: 'roads',
								type: 'line',
								source: 'hiroshima',
								'source-layer': 'road',
								paint: {
									'line-color': '#b8bcc0',
									'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.16, 13, 0.24, 16, 0.32],
									'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.8, 16, 2],
								},
							},
						],
					},
				});
				instance.setPadding(mobile ? { top: 180, bottom: 390, left: 15, right: 15 } : { top: 160, bottom: 150, left: 80, right: 365 });
				mapRef.current = instance;
				instance.addControl(new lib.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
				instance.on('dragstart', controls.registerInteraction);
				instance.on('zoomstart', controls.registerInteraction);
				instance.on('load', () => {
					if (disposed || !instance) return;
					instance.addSource('fire', {
						type: 'image',
						url: fireUrl,
						coordinates: registration.corners as [[number, number], [number, number], [number, number], [number, number]],
					});
					instance.addLayer({
						id: 'fire',
						type: 'raster',
						source: 'fire',
						paint: {
							'raster-opacity': 0,
							'raster-opacity-transition': { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1800 },
							'raster-fade-duration': 0,
						},
					});
					instance.addSource('effects', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
					// Brightened for the dark map: overpressure in blue (stronger = lighter), thermal in amber, fireball in orange-red.
					for (const [id, color, dash] of [
						['blast1Km', '#7d93a4', [2, 3]],
						['blast5Km', '#7fbde6', [1, 0]],
						['blast20Km', '#d6ecfb', [1, 0]],
						['thermalKm', '#f2b84b', [6, 3]],
						['fireball', '#ff8a5c', [1, 2]],
					] as const) {
						instance.addLayer({
							id,
							type: 'line',
							source: 'effects',
							filter: ['==', ['get', 'id'], id],
							paint: { 'line-color': color, 'line-width': id === 'blast5Km' ? 2.8 : 1.6, 'line-dasharray': [...dash] },
						});
					}
					const landmarks = [
						[132.4525, 34.3947, '爆心地', 'Hypocentre'],
						[132.4509, 34.3956, '相生桥', 'Aioi Bridge'],
						[132.4596, 34.4027, '广岛城', 'Hiroshima Castle'],
						[132.4758, 34.3975, '广岛站', 'Hiroshima Station'],
						[132.455, 34.375, '元安川', 'Motoyasu River'],
						[132.464, 34.414, '太田川', 'Ōta River'],
					] as const;
					for (const [lng, lat, zh, en] of landmarks) {
						const el = document.createElement('span');
						el.className = 'na-map-label';
						el.textContent = locale === 'en' ? en : zh;
						if (zh === '爆心地') el.classList.add('is-hypocentre');
						markers.push(new lib.Marker({ element: el, anchor: 'left' }).setLngLat([lng, lat]).addTo(instance));
					}
					setReady(true);
				});
			})
			.catch(() => {
				if (!disposed) setError(true);
			});
		return () => {
			disposed = true;
			markers.forEach((m) => m.remove());
			instance?.remove();
			mapRef.current = null;
		};
	}, [controls.registerInteraction, locale]);
	useEffect(() => {
		const map = mapRef.current;
		if (!ready || !map) return;
		(map.getSource('effects') as GeoJSONSource).setData(featureData);
		map.setPaintProperty('fire', 'raster-opacity', history ? 0.82 : 0);
		for (const id of ['blast1Km', 'blast5Km', 'blast20Km', 'thermalKm', 'fireball'])
			map.setLayoutProperty(id, 'visibility', model ? 'visible' : 'none');
	}, [ready, featureData, history, model]);
	useEffect(() => {
		if (active) {
			const t = window.setTimeout(() => mapRef.current?.resize(), 80);
			return () => clearTimeout(t);
		}
	}, [active]);
	const choose = (id: string, keepScale = sameScale) => {
		controls.registerInteraction();
		setPresetId(id);
		if (keepScale) return;
		const p = CITY_PRESETS.find((p) => p.id === id)!,
			e = cityEffects(p);
		const radius = Math.max(e.blast5Km! * 1.6, e.thermalKm ?? 0, 3);
		const map = mapRef.current;
		if (map)
			map.fitBounds(
				[
					[HIROSHIMA.longitude - radius / 0.0912 / 1000, HIROSHIMA.latitude - radius / 111],
					[HIROSHIMA.longitude + radius / 0.0912 / 1000, HIROSHIMA.latitude + radius / 111],
				],
				{
					padding:
						window.innerWidth < 720 ? { top: 200, bottom: 265, left: 24, right: 24 } : { top: 180, bottom: 150, left: 100, right: 390 },
					duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
					maxZoom: 13.2,
				},
			);
	};
	const compareScale = () => {
		controls.registerInteraction();
		setSameScale((value) => !value);
		// A shared, fixed field of view makes the four presets directly comparable.
		if (!sameScale)
			mapRef.current?.fitBounds(
				[
					[132.05, 34.08],
					[132.85, 34.71],
				],
				{
					padding:
						window.innerWidth < 720 ? { top: 190, bottom: 410, left: 20, right: 20 } : { top: 150, bottom: 165, left: 60, right: 355 },
					duration: 0,
				},
			);
		else choose(presetId, false);
	};
	return (
		<section className="na-city" data-city-preset={presetId}>
			<div className="na-map" ref={host} aria-label={tx('广岛历史与模型地图')} />
			<header className="na-heading">
				<p>Hiroshima · 6 August 1945</p>
				<h1>{tx('广岛，8时15分。')}</h1>
				<span>{tx('河道还在。街区已经改变。')}</span>
			</header>
			<aside className="na-city-reading" aria-live="polite">
				<div className="na-record-title">
					<i className="na-hatch" />
					<b>{tx('1945 火灾区')}</b>
					<span>USSBS</span>
				</div>
				<strong className="na-fire-distance">{tx('约 2 km，北端接近 3 km')}</strong>
				<p>{tx('斜线是调查记录，边界不规则。虚线是热辐射模型，不等于城市起火范围。')}</p>
				<div className="na-range">
					<i />
					<span>
						{tx('严重破坏参考')}
						<small>5 psi · 34.5 kPa</small>
					</span>
					<b>
						{n(effects.blast5Km)}
						<small> km</small>
					</b>
				</div>
				<div className="na-range na-thermal">
					<i />
					<span>
						{tx('热辐射')}
						<small>8 cal/cm² · {tx('模型')}</small>
					</span>
					<b>
						{n(effects.thermalKm)}
						<small> km</small>
					</b>
				</div>
				<p className="na-model-status">
					{tx(effects.thermalKm === null ? '热辐射超出图表范围，未外推。' : '热辐射模型：1977 图 7.42，能见度 12 英里。')}
				</p>
				{presetId !== 'hiroshima' && (
					<p className="na-ratio">
						{tx('相对广岛：半径')} <b>{ratio.toFixed(2)}×</b> · {tx('面积')} <b>{(ratio ** 2).toFixed(1)}×</b>
					</p>
				)}
				<div className="na-layer-buttons">
					<button
						aria-pressed={history}
						onClick={() => {
							setHistory(!history);
							controls.registerInteraction();
						}}
					>
						{tx('火灾史料')} {history ? '✓' : '−'}
					</button>
					<button
						aria-pressed={model}
						onClick={() => {
							setModel(!model);
							controls.registerInteraction();
						}}
					>
						{tx('模型线')} {model ? '✓' : '−'}
					</button>
					<button onClick={() => setDetails(!details)} aria-expanded={details}>
						{tx('证据与边界')}
					</button>
					<button className="na-compare-scale" aria-pressed={sameScale} onClick={compareScale}>
						{tx('同尺度对比')}
					</button>
				</div>
			</aside>
			<div className="na-city-bottom">
				<div className="na-presets" aria-label={tx('四个当量预设')}>
					{CITY_PRESETS.map((p) => (
						<button key={p.id} aria-pressed={p.id === presetId} onClick={() => choose(p.id)}>
							<span>{locale === 'en' ? p.en : p.name}</span>
							<b>{p.yieldKt >= 1000 ? `${p.yieldKt / 1000} Mt` : `${p.yieldKt} kt`}</b>
						</button>
					))}
				</div>
				<p>
					{tx('底图：今日广岛。历史情景：RERF DS02，16 kt / 600 m。')} {presetId !== 'hiroshima' && tx('其余情景按历史高度作相似缩放。')}
				</p>
			</div>
			<div className="na-attribution">
				<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
					© OpenStreetMap contributors
				</a>{' '}
				·{' '}
				<a href={tilesUrl} download>
					ODbL · {tx('地图数据')}
				</a>
			</div>
			{error && (
				<p className="na-map-status" role="alert">
					{tx('地图未能载入。请刷新重试。')}
				</p>
			)}
			{!ready && !error && <p className="na-map-status">{tx('正在展开广岛地图…')}</p>}
			{details && (
				<aside className="na-evidence">
					<button className="na-close" onClick={() => setDetails(false)} aria-label={tx('关闭')}>
						×
					</button>
					<h2>{tx('一张地图，两类证据')}</h2>
					<p>{tx('火灾斜线：USSBS 1946 年调查图，9 个桥梁控制点作仿射配准。边缘有旧测绘、纸张与扫描误差。')}</p>
					<p>
						RMSE {registration.rmseGroundM.toFixed(1)} m · {registration.controls.length} {tx('个控制点')}
						<br />
						{tx('留一检验')} {registration.leaveOneOutRmseGroundM.toFixed(1)} m
					</p>
					<p>{tx('这是控制点拟合误差，不是火灾边界的测量精度。尚待独立地图审查。')}</p>
					<a href="https://www.atomicarchive.com/resources/documents/bombing-survey/map_hiroshima.html" target="_blank" rel="noreferrer">
						USSBS · {tx('查看原图')}
					</a>
					<p>
						{tx('模型线：平坦地表、标准大气。没有逐栋建筑、地形遮挡或火灾传播。热辐射阈值表示单位面积接收的能量，不是着火或伤亡边界。')}
					</p>
					<dl>
						<div>
							<dt>{tx('空中火球最大半径')}</dt>
							<dd>{n(effects.fireballKm)} km</dd>
						</div>
						<div>
							<dt>20 psi</dt>
							<dd>{n(effects.blast20Km)} km</dd>
						</div>
						<div>
							<dt>1 psi</dt>
							<dd>{n(effects.blast1Km)} km</dd>
						</div>
						<div>
							<dt>{tx('情景高度')}</dt>
							<dd>{n(effects.heightKm)} km</dd>
						</div>
					</dl>
					<p>{tx('超压：Brode 1986，经 glasstone 移植。热辐射：1977 图 7.42 的 8 cal/cm² 曲线，读图插值。超出图表范围显示破折号。')}</p>
					<p>
						{tx(
							'同条件校核：1 Mt、无云、能见度 12 英里。书中斜距约 7 英里，模型 7.07 英里，相差约 +1.1%。读图精度约 5%，不是实测火灾边界。',
						)}
					</p>
					<a href="https://fas.org/wp-content/uploads/2025/01/United-States-nuclear-weapons-2025.pdf" target="_blank" rel="noreferrer">
						W76-1 · FAS 2025
					</a>
					<a href="https://ucs-documents.s3.amazonaws.com/nuclear-weapons/b83-fact-sheet.pdf" target="_blank" rel="noreferrer">
						B83 · UCS
					</a>
					<h3>{tx('黑雨、沉降、中子活化')}</h3>
					<p>
						{tx(
							'黑雨是历史降雨现象，雨中混有烟尘等物质。放射性沉降是放射性物质落回地表，可随降雨发生；中子活化是地表材料受中子照射后产生放射性。三者不是同一条边界。空爆也有残余放射性。',
						)}
					</p>
					<a href="https://www.rerf.or.jp/en/faq/" target="_blank" rel="noreferrer">
						RERF · {tx('残余辐射资料')}
					</a>
					<p>{tx('底图按城市概览简化，最高源瓦片级别 13；没有复原 1945 年的建筑。')}</p>
					<button onClick={() => setRaster(!raster)} aria-expanded={raster}>
						{tx('查看配准火灾层')}
					</button>
					{raster && <img src={fireUrl} alt={tx('从 USSBS 红色火灾区提取的斜线层')} />}
				</aside>
			)}
		</section>
	);
}
