import './styles/NuclearBomb.css';
import './styles/NuclearAge.css';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import type { ExperienceControls } from '~/components/ExperienceShell';
import { FreebarTabs } from '~/components/experiences/Freebar';
import { GuideTour, type GuideStep } from '~/components/experiences/GuideTour';
import { useExperienceI18n } from '~/i18n/experience';
import { CityView } from './CityView';
import { DeviceSchematic, DeviceSwitch, type DeviceKind } from './DeviceSchematics';
const CutawayView = lazy(() => import('./InstantView').then((m) => ({ default: m.CutawayView })));
const EraView = lazy(() => import('./EraView').then((m) => ({ default: m.EraView })));
type ExhibitView = 'cutaway' | 'scale' | 'history';

export function NuclearBomb({ controls }: { controls: ExperienceControls }) {
	const tx = useExperienceI18n();
	const [view, setView] = useState<ExhibitView>('scale');
	const [visited, setVisited] = useState<Set<ExhibitView>>(() => new Set(['scale']));
	const [guided, setGuided] = useState(false);
	const [device, setDevice] = useState<DeviceKind>('implosion');
	const changeView = useCallback(
		(next: ExhibitView) => {
			controls.registerInteraction();
			setVisited((current) => new Set([...current, next]));
			setView(next);
		},
		[controls],
	);
	const guideSteps = useMemo<Array<GuideStep>>(
		() => [
			{
				title: '一座城市，两类证据。',
				body: '斜线来自火灾调查。模型线是理想条件下的范围。它们回答不同的问题。',
				durationMs: 11000,
				action: () => changeView('scale'),
			},
			{
				title: '回到一瞬。',
				body: '浅色展品保留已有的示意。拖动旋转，或查看链式反应。',
				durationMs: 10000,
				action: () => changeView('cutaway'),
			},
			{
				title: '把一瞬，放回历史。',
				body: '点“试验最多的一年”，再看“库存峰值”。同一根游标贯穿两种记录。',
				durationMs: 12000,
				action: () => changeView('history'),
			},
		],
		[changeView],
	);
	return (
		<div className="nb-experience na-experience" data-exhibit-view={view}>
			<div className="na-header-shade" aria-hidden="true" />
			{visited.has('scale') && (
				<div className={`nb-view-layer${view === 'scale' ? ' is-active' : ''}`} aria-hidden={view !== 'scale'} inert={view !== 'scale'}>
					<CityView controls={controls} active={view === 'scale'} />
				</div>
			)}
			{visited.has('cutaway') && (
				<div
					className={`nb-view-layer${view === 'cutaway' ? ' is-active' : ''}`}
					aria-hidden={view !== 'cutaway'}
					inert={view !== 'cutaway'}
				>
					<Suspense fallback={null}>
						<CutawayView controls={controls} active={view === 'cutaway' && device === 'implosion'} guided={false} guidePosition={null} />
					</Suspense>
					{device === 'implosion' ? (
						<button className="na-return-city" onClick={() => changeView('scale')}>
							{tx('这样一次释放，落在一座城市上是什么样子。')}
						</button>
					) : (
						<DeviceSchematic kind={device} active={view === 'cutaway'} onReturnCity={() => changeView('scale')} />
					)}
					<DeviceSwitch
						value={device}
						onChange={(next) => {
							controls.registerInteraction();
							setDevice(next);
						}}
					/>
				</div>
			)}
			{visited.has('history') && (
				<div
					className={`nb-view-layer${view === 'history' ? ' is-active' : ''}`}
					aria-hidden={view !== 'history'}
					inert={view !== 'history'}
				>
					<Suspense fallback={null}>
						<EraView controls={controls} active={view === 'history'} />
					</Suspense>
				</div>
			)}
			<nav className="nb-view-navigation na-navigation" data-experience-overlay="true">
				<FreebarTabs
					activeId={view}
					onChange={changeView}
					ariaLabel={tx('展览视图')}
					tabs={[
						{ id: 'scale', label: tx('一座城市') },
						{ id: 'cutaway', label: tx('一瞬') },
						{ id: 'history', label: tx('一个时代') },
					]}
				/>
			</nav>
			{!guided && (
				<button
					className="nb-guide-entry na-guide"
					type="button"
					data-experience-overlay="true"
					onClick={() => {
						controls.registerInteraction();
						setGuided(true);
					}}
				>
					{tx('三步导览')}
				</button>
			)}
			<GuideTour
				worldId="nuclear-bomb"
				steps={guideSteps}
				defaultOpen={guided}
				placement="stage"
				showReplayChip={false}
				kicker={tx('导览')}
				replayLabel={tx('三步导览')}
				exitLabel={tx('退出导览')}
				onExit={() => setGuided(false)}
				stagePlan={[
					{ position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', width: 'normal', treatment: 'annotation' },
				]}
			/>
		</div>
	);
}
